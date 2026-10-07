import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Rate-limit RPCs pass; every users query returns an existing Google user.
vi.mock("../config/supabase.js", () => {
  const user = { id: "u1", email: "victim@example.com", name: "Victim", role: "customer", type: "Google" };
  const builder = {};
  for (const m of ["select", "eq", "update", "insert", "upsert", "single", "maybeSingle"]) builder[m] = () => builder;
  builder.then = (resolve) => Promise.resolve({ data: user, error: null }).then(resolve);
  return {
    supabaseAdmin: {
      from: () => builder,
      rpc: (fn) => Promise.resolve(fn === "check_rate_limit_gate" ? { data: [{ blocked: false }], error: null } : { data: null, error: null }),
    },
  };
});

const { firebaseLogin } = await import("../services/auth.service.js");

const PROJECT = "velvetwolf-test";
const KID = "test-kid";
let privateKey;
let publicPem;

// A token signed exactly like Firebase's: RS256, aud = project, iss = securetoken
function firebaseToken(claims) {
  return jwt.sign(
    { sub: "firebase-uid", ...claims },
    privateKey,
    { algorithm: "RS256", keyid: KID, audience: PROJECT, issuer: `https://securetoken.google.com/${PROJECT}`, expiresIn: "1h" }
  );
}

describe("firebaseLogin — email ownership", () => {
  const savedProject = process.env.VITE_FIREBASE_PROJECT_ID;

  beforeAll(() => {
    const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKey = pair.privateKey.export({ type: "pkcs8", format: "pem" });
    publicPem = pair.publicKey.export({ type: "spki", format: "pem" });
  });

  beforeEach(() => {
    process.env.VITE_FIREBASE_PROJECT_ID = PROJECT;
    // Google's public-key endpoint, serving our test key under KID
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ [KID]: publicPem }) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedProject === undefined) delete process.env.VITE_FIREBASE_PROJECT_ID;
    else process.env.VITE_FIREBASE_PROJECT_ID = savedProject;
  });

  it("rejects a validly signed token whose email is NOT verified (account takeover attempt)", async () => {
    const token = firebaseToken({ email: "victim@example.com", email_verified: false, firebase: { sign_in_provider: "password" } });
    await expect(firebaseLogin({ token }, "49.36.1.2")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects a token with no email_verified claim at all", async () => {
    const token = firebaseToken({ email: "victim@example.com" });
    await expect(firebaseLogin({ token }, "49.36.1.2")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("signs in with a verified email (Google sign-in)", async () => {
    const token = firebaseToken({ email: "victim@example.com", email_verified: true, firebase: { sign_in_provider: "google.com" } });
    const result = await firebaseLogin({ token }, "49.36.1.2");
    expect(result.token).toBeTruthy();
  });

  it("still rejects a token signed with a different key", async () => {
    const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
    const forged = jwt.sign({ email: "victim@example.com", email_verified: true }, other,
      { algorithm: "RS256", keyid: KID, audience: PROJECT, issuer: `https://securetoken.google.com/${PROJECT}` });
    await expect(firebaseLogin({ token: forged }, "49.36.1.2")).rejects.toMatchObject({ statusCode: 401 });
  });
});
