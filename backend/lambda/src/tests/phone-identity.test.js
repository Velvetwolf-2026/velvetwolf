// One account per mobile number: a number confirmed on an account signs in to
// that account (no duplicate mobile-only account), and a new number has to be
// confirmed with an SMS code before it replaces the old one.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls } = vi.hoisted(() => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() }, calls: [] }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));
vi.mock("../config/smtp.js", () => ({ sendOTP: vi.fn() }));

const { firebaseLogin } = await import("../services/auth.service.js");
const { updateProfile, verifyPhoneChange } = await import("../services/profile.service.js");

function db(queues) {
  calls.length = 0;
  const fresh = createSupabaseMock(queues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
  supabaseAdmin.rpc.mockImplementation(fresh.supabaseAdmin.rpc);
}

const PROJECT = "velvetwolf-test";
const KID = "test-kid";
let privateKey;
let publicPem;
const phoneToken = (phone) => jwt.sign(
  { sub: "firebase-uid", phone_number: phone },
  privateKey,
  { algorithm: "RS256", keyid: KID, audience: PROJECT, issuer: `https://securetoken.google.com/${PROJECT}`, expiresIn: "1h" }
);

const EMAIL_ACCOUNT = { id: "u-email", email: "asha@example.com", name: "Asha", role: "customer", type: "Signup" };

beforeAll(() => {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKey = pair.privateKey.export({ type: "pkcs8", format: "pem" });
  publicPem = pair.publicKey.export({ type: "spki", format: "pem" });
});
beforeEach(() => {
  vi.clearAllMocks();
  process.env.VITE_FIREBASE_PROJECT_ID = PROJECT;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ [KID]: publicPem }) }));
});
afterEach(() => vi.unstubAllGlobals());

describe("phone sign-in", () => {
  it("opens the account that confirmed the number instead of creating a mobile-only one", async () => {
    db({
      users: [{ data: null, error: null }, { data: null, error: null }], // no 9840012345@mobile account; last_login update
      profiles: [{ data: [{ id: EMAIL_ACCOUNT.id, users: EMAIL_ACCOUNT }], error: null }],
    });
    const result = await firebaseLogin({ token: phoneToken("+919840012345"), phone: "+919840012345" });
    expect(result.user.id).toBe(EMAIL_ACCOUNT.id);
    expect(calls.some((c) => c.table === "users" && c.method === "insert")).toBe(false);
  });

  it("creates a mobile-only account when no account has the number, and records it as confirmed", async () => {
    db({
      users: [{ data: null, error: null }, { data: [{ id: "u-new", email: "9840012345@mobile.velvetwolf.in", name: "Mobile 9840012345", role: "customer" }], error: null }],
      profiles: [{ data: [], error: null }],
    });
    const result = await firebaseLogin({ token: phoneToken("+919840012345") });
    expect(result.user.id).toBe("u-new");
    expect(calls.find((c) => c.table === "profiles" && c.method === "upsert").payload).toMatchObject({ id: "u-new", phone: "9840012345" });
  });
});

describe("changing the mobile number", () => {
  it("won't save a new number without the SMS code", async () => {
    db({ profiles: [{ data: { phone: "9840012345" }, error: null }], users: [{ data: { email: EMAIL_ACCOUNT.email }, error: null }] });
    await expect(updateProfile(EMAIL_ACCOUNT.id, { phone: "9840099999" })).rejects.toMatchObject({ statusCode: 400 });
    expect(calls.some((c) => c.method === "upsert")).toBe(false);
  });

  it("rejects test numbers like 9999999999", async () => {
    db({ profiles: [{ data: { phone: "" }, error: null }], users: [{ data: { email: EMAIL_ACCOUNT.email }, error: null }] });
    await expect(updateProfile(EMAIL_ACCOUNT.id, { phone: "9999999999" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lets an email account remove its number, but not a mobile-only account", async () => {
    db({ profiles: [{ data: { phone: "9840012345" }, error: null }, { data: { id: EMAIL_ACCOUNT.id }, error: null }], users: [{ data: { email: EMAIL_ACCOUNT.email }, error: null }] });
    await updateProfile(EMAIL_ACCOUNT.id, { phone: "" });
    expect(calls.find((c) => c.method === "upsert").payload).toMatchObject({ phone: null, phone_verified_at: null });

    db({ profiles: [{ data: { phone: "9840012345" }, error: null }], users: [{ data: { email: "9840012345@mobile.velvetwolf.in" }, error: null }] });
    await expect(updateProfile("u-mobile", { phone: "" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("confirms a new number with the SMS code", async () => {
    db({
      users: [{ data: EMAIL_ACCOUNT, error: null }, { data: null, error: null }, { data: EMAIL_ACCOUNT, error: null }],
      profiles: [{ data: [], error: null }, { data: null, error: null }, { data: { phone: "9840099999" }, error: null }],
    });
    const result = await verifyPhoneChange(EMAIL_ACCOUNT.id, phoneToken("+919840099999"));
    expect(calls.find((c) => c.table === "profiles" && c.method === "upsert").payload).toMatchObject({ phone: "9840099999" });
    expect(result.token).toBeUndefined(); // an email account's sign-in doesn't change
  });

  it("moves a mobile-only account's sign-in to the new number and ends its other sessions", async () => {
    const mobile = { id: "u-mobile", email: "9840012345@mobile.velvetwolf.in", name: "Ravi", role: "customer" };
    db({
      users: [
        { data: mobile, error: null }, // account
        { data: null, error: null }, // no account on the new number
        { data: { ...mobile, email: "9840099999@mobile.velvetwolf.in" }, error: null }, // email moved
        { data: null, error: null }, // sessions revoked
      ],
      profiles: [{ data: [], error: null }, { data: null, error: null }],
    });
    const result = await verifyPhoneChange(mobile.id, phoneToken("+919840099999"));
    expect(calls.find((c) => c.table === "users" && c.method === "update" && c.payload.email).payload).toEqual({ email: "9840099999@mobile.velvetwolf.in" });
    expect(calls.some((c) => c.table === "users" && c.method === "update" && c.payload.sessions_valid_after)).toBe(true);
    expect(typeof result.token).toBe("string");
  });

  it("refuses a number another account already uses", async () => {
    db({
      users: [{ data: EMAIL_ACCOUNT, error: null }, { data: { id: "someone-else" }, error: null }],
      profiles: [{ data: [], error: null }],
    });
    await expect(verifyPhoneChange(EMAIL_ACCOUNT.id, phoneToken("+919840099999"))).rejects.toMatchObject({ statusCode: 409 });
    expect(calls.some((c) => c.method === "upsert")).toBe(false);
  });
});
