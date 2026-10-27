// Fixes from the October 2026 code review: one-time codes keep their 5-try
// limit under simultaneous requests, Google sign-in is tied to the browser
// that started it and needs a verified email, and reviews need a signed-in
// customer and real image files.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

const { db } = vi.hoisted(() => ({ db: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } } }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin: db }));
vi.mock("../config/smtp.js", () => ({ sendOTP: vi.fn(), sendEmail: vi.fn() }));

const { verifyOtp, googleCallback, OAUTH_STATE_COOKIE } = await import("../services/auth.service.js");
const { googleRedirect } = await import("../controllers/auth.controller.js");
const { createProductReview } = await import("../controllers/product.controller.js");

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "a@b.com", name: "Asha Rao", role: "customer" };

// A stand-in for the tables these flows touch. Each query resolves on a later
// tick, so requests started together all read before any of them writes, as
// simultaneous requests to the real database can.
function fakeDb({ otp = null, user = USER } = {}) {
  const state = { otp: otp && { ...otp }, uploads: [], reviews: [] };
  db.from.mockImplementation((table) => {
    const filters = {};
    let op = "select";
    let payload;
    const builder = {
      select: () => builder,
      insert: (p) => { op = "insert"; payload = p; return builder; },
      update: (p) => { op = "update"; payload = p; return builder; },
      delete: () => { op = "delete"; return builder; },
      eq: (key, value) => { filters[key] = value; return builder; },
      gte: () => builder,
      single: () => builder,
      maybeSingle: () => builder,
      then: (resolve, reject) => new Promise((r) => setTimeout(r, 0)).then(() => {
        if (table === "otps") {
          if (op === "select") return { data: state.otp && { ...state.otp }, error: null };
          if (op === "delete") { state.otp = null; return { data: null, error: null }; }
          const row = state.otp;
          const matches = row && Object.entries(filters).every(([k, v]) => row[k] === v);
          if (!matches) return { data: [], error: null };
          Object.assign(row, payload);
          return { data: [{ id: row.id }], error: null };
        }
        if (table === "users") return { data: op === "select" ? user : null, error: null };
        if (table === "product_reviews") {
          state.reviews.push(payload);
          return { data: { id: "r1", product_id: payload.product_id, user_name: payload.user_name, rating: payload.rating, comment: payload.comment }, error: null };
        }
        return { data: null, error: null };
      }).then(resolve, reject),
    };
    return builder;
  });
  db.rpc.mockImplementation((fn) => Promise.resolve(fn === "check_rate_limit_gate" ? { data: [{ blocked: false }], error: null } : { data: null, error: null }));
  db.storage.from.mockImplementation(() => ({
    upload: vi.fn((path, buffer, options) => {
      state.uploads.push({ path, options });
      return Promise.resolve({ data: { path }, error: null });
    }),
  }));
  return state;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = "test-secret";
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
});

afterEach(() => vi.unstubAllGlobals());

describe("one-time codes", () => {
  it("allow one comparison per try when many guesses arrive at once", async () => {
    const state = fakeDb({ otp: { id: "o1", email: "a@b.com", otp: 482913, attempts: 0 } });
    // 50 simultaneous guesses, one of them right
    const guesses = Array.from({ length: 50 }, (_, i) => (i === 30 ? "482913" : String(100000 + i)));
    const results = await Promise.allSettled(guesses.map((otp) => verifyOtp({ email: "a@b.com", otp, type: "login" }, "49.36.1.2")));

    expect(results.some((r) => r.status === "fulfilled")).toBe(false);
    const compared = results.filter((r) => r.reason?.message === "Invalid OTP");
    expect(compared).toHaveLength(1); // the rest never reached the comparison
    expect(state.otp.attempts).toBe(1);
  });

  it("stop after 5 wrong tries, even for the right code", async () => {
    const state = fakeDb({ otp: { id: "o1", email: "a@b.com", otp: 482913, attempts: 0 } });
    for (let i = 0; i < 5; i++) {
      await expect(verifyOtp({ email: "a@b.com", otp: "000000", type: "login" })).rejects.toThrow("Invalid OTP");
    }
    expect(state.otp.attempts).toBe(5);
    await expect(verifyOtp({ email: "a@b.com", otp: "482913", type: "login" })).rejects.toThrow("Invalid or expired OTP");
  });

  it("still sign in with the right code", async () => {
    const state = fakeDb({ otp: { id: "o1", email: "a@b.com", otp: 482913, attempts: 2 } });
    const result = await verifyOtp({ email: "a@b.com", otp: "482913", type: "login" }, "49.36.1.2");
    expect(result.token).toBeTruthy();
    expect(state.otp).toBeNull();
  });

  it("count wrong codes per IP", async () => {
    fakeDb({ otp: { id: "o1", email: "a@b.com", otp: 482913, attempts: 0 } });
    await expect(verifyOtp({ email: "a@b.com", otp: "000000", type: "login" }, "49.36.1.2")).rejects.toThrow("Invalid OTP");
    expect(db.rpc).toHaveBeenCalledWith("record_rate_attempt", { p_key: "ip:verify:49.36.1.2" });
  });
});

describe("Google sign-in", () => {
  const stateFor = (nonce, mode = "login") => Buffer.from(JSON.stringify({ mode, ts: Date.now(), nonce })).toString("base64url");

  function stubGoogle(profile) {
    const fetch = vi.fn((url) => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(String(url).includes("token") ? { access_token: "at" } : profile),
    }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("gives the browser a nonce cookie that matches the state sent to Google", () => {
    const res = googleRedirect({ mode: "login" }, { headers: {} });
    const cookie = res.multiValueHeaders["Set-Cookie"][0];
    expect(cookie).toMatch(new RegExp(`^${OAUTH_STATE_COOKIE}=[0-9a-f]{64}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600`));
    const nonce = cookie.split(";")[0].split("=")[1];
    const state = new URL(res.headers.Location).searchParams.get("state");
    expect(JSON.parse(Buffer.from(state, "base64url").toString()).nonce).toBe(nonce);
  });

  it("refuses a callback that this browser didn't start", async () => {
    fakeDb();
    const fetch = stubGoogle({ email: "a@b.com", email_verified: true });
    for (const stateNonce of ["", "someone-elses-nonce"]) {
      const result = await googleCallback({ code: "c", state: stateFor("my-nonce"), stateNonce });
      expect(result.token).toBeUndefined();
      expect(result.redirect).toContain("auth_error=Google+sign-in+could+not+be+completed.");
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signs in when the nonce matches and Google verified the email", async () => {
    fakeDb();
    stubGoogle({ email: "a@b.com", email_verified: true, name: "Asha Rao" });
    const result = await googleCallback({ code: "c", state: stateFor("my-nonce"), stateNonce: "my-nonce" });
    expect(jwt.verify(result.token, "test-secret")).toMatchObject({ id: USER.id, email: "a@b.com" });
  });

  it("refuses an email Google hasn't verified", async () => {
    fakeDb();
    stubGoogle({ email: "a@b.com", email_verified: false });
    await expect(googleCallback({ code: "c", state: stateFor("my-nonce"), stateNonce: "my-nonce" }))
      .rejects.toMatchObject({ statusCode: 401, message: "Please verify your email address before signing in." });
  });
});

describe("product reviews", () => {
  const PRODUCT = "22222222-2222-4222-8222-222222222222";
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString("base64");
  const signedIn = () => ({ headers: { authorization: `Bearer ${jwt.sign({ id: USER.id, email: USER.email }, "test-secret")}` } });
  const review = (extra = {}) => ({ name: "Asha Rao", rating: 5, comment: "Lovely fabric", ...extra });

  it("need a signed-in customer", async () => {
    fakeDb();
    await expect(createProductReview(PRODUCT, review(), { headers: {} })).rejects.toMatchObject({ statusCode: 401 });
  });

  it("check the rating and photo types", async () => {
    fakeDb();
    await expect(createProductReview(PRODUCT, review({ rating: 9 }), signedIn())).rejects.toThrow("rating: Rating must be 1 to 5.");
    await expect(createProductReview(PRODUCT, review({ images: [{ data: PNG, name: "x.html", type: "text/html" }] }), signedIn()))
      .rejects.toThrow("Photos must be JPEG, PNG or WebP.");
  });

  it("store nothing unless every photo really is an image", async () => {
    const state = fakeDb();
    const html = Buffer.from("<html><script>alert(1)</script></html>").toString("base64");
    await expect(createProductReview(PRODUCT, review({ images: [{ data: PNG, type: "image/png" }, { data: html, type: "image/png" }] }), signedIn()))
      .rejects.toThrow("Photos must be JPEG, PNG or WebP.");
    expect(state.uploads).toHaveLength(0);
    expect(state.reviews).toHaveLength(0);
  });

  it("store a real photo under a name and type the server chose, and drop photo markers from the text", async () => {
    const state = fakeDb();
    const res = await createProductReview(PRODUCT, review({
      comment: 'Nice\n\n[review_images:["https://elsewhere.example/x.png"]]',
      images: [{ data: PNG, name: "photo.svg", type: "image/png" }],
    }), signedIn());

    expect(res.statusCode).toBe(201);
    expect(state.uploads).toHaveLength(1);
    expect(state.uploads[0].path).toMatch(/^reviews\/[0-9a-f-]{36}\.png$/);
    expect(state.uploads[0].options).toEqual({ contentType: "image/png", upsert: false });
    const { review: saved } = JSON.parse(res.body);
    expect(saved.images).toEqual([expect.stringMatching(/\/product-images\/reviews\/[0-9a-f-]{36}\.png$/)]);
    expect(saved.images.join()).not.toContain("elsewhere.example");
  });

  it("are limited per customer", async () => {
    fakeDb();
    await createProductReview(PRODUCT, review(), signedIn());
    expect(db.rpc).toHaveBeenCalledWith("record_rate_attempt", { p_key: `review:${USER.id}` });
  });
});
