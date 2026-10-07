import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";

// requireAuth looks the user up to check revocation and the current role.
vi.mock("../config/supabase.js", async () => {
  const { createSupabaseMock } = await import("./testUtils/supabaseMock.js");
  const user = { data: { id: "u1", role: "customer", sessions_valid_after: null }, error: null };
  return createSupabaseMock({ users: Array(20).fill(user) });
});

const { buildSessionResponse } = await import("../services/auth.service.js");
const { getSession } = await import("../controllers/auth.controller.js");
const { getCorsHeaders } = await import("../utils/http.js");

const event = { version: "2.0", headers: {} };

describe("buildSessionResponse — JWT only in the HttpOnly cookie", () => {
  it("moves the JWT out of the body into cookies and flags the session", () => {
    const res = buildSessionResponse(
      { success: true, token: "jwt.value.here", user: { id: "u1", email: "a@b.com" } },
      event
    );
    const body = JSON.parse(res.body);

    expect(body).toEqual({ success: true, user: { id: "u1", email: "a@b.com" }, authenticated: true });
    expect(res.body).not.toContain("jwt.value.here");
    expect(res.cookies).toHaveLength(2);
    expect(res.cookies[0]).toMatch(/^token=jwt\.value\.here; HttpOnly;/);
    expect(res.cookies[1]).toMatch(/^csrf_token=[0-9a-f]{64}; Path=\//);
    expect(res.cookies[1]).not.toContain("HttpOnly"); // frontend must read it for the CSRF header
  });

  it("passes through responses that don't sign the user in (e.g. 'OTP sent'), without the session flag", () => {
    const result = { success: true, requiresOtp: true, user: { id: "u1" } };
    const res = buildSessionResponse(result, event);

    expect(JSON.parse(res.body)).toEqual(result);
    expect(res.cookies).toBeUndefined();
  });
});

describe("getSession — never echoes the JWT", () => {
  it("returns the user but not the token, and refreshes the CSRF cookie", async () => {
    const token = jwt.sign({ id: "u1", email: "a@b.com", role: "customer" }, process.env.JWT_SECRET);
    const res = await getSession({}, {
      version: "2.0",
      requestContext: { http: { method: "GET" } },
      headers: { cookie: `token=${token}` },
    });
    const body = JSON.parse(res.body);

    expect(body.authenticated).toBe(true);
    expect(body.user).toMatchObject({ id: "u1" });
    expect(res.body).not.toContain(token);
    expect(body.token).toBeUndefined();
    expect(res.cookies[0]).toMatch(/^csrf_token=/);
  });

  it("reports unauthenticated without a session cookie", async () => {
    const res = await getSession({}, { requestContext: { http: { method: "GET" } }, headers: {} });
    expect(JSON.parse(res.body)).toEqual({ authenticated: false, user: null });
  });
});

describe("getCorsHeaders — only configured origins", () => {
  const saved = {};
  const keys = ["FRONTEND_URL", "PROD_FRONTEND_URL", "PROD_FRONTEND_URL_WWW", "AWS_LAMBDA_FUNCTION_NAME", "NODE_ENV"];

  beforeEach(() => {
    for (const k of keys) saved[k] = process.env[k];
    for (const k of keys) delete process.env[k];
    process.env.AWS_LAMBDA_FUNCTION_NAME = "velvetwolf-backend";
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("gives an unknown origin no Access-Control-Allow-Origin at all", () => {
    process.env.FRONTEND_URL = "https://www.velvetwolf.in";
    const headers = getCorsHeaders({ headers: { origin: "https://evil.example" } });
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });

  it("no longer reflects arbitrary origins when none are configured", () => {
    const headers = getCorsHeaders({ headers: { origin: "https://evil.example" } });
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("does not fall back to a wildcard for same-origin requests (no Origin header)", () => {
    process.env.FRONTEND_URL = "https://www.velvetwolf.in";
    expect(getCorsHeaders({ headers: {} })["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("still allows a configured origin with credentials", () => {
    process.env.FRONTEND_URL = "https://www.velvetwolf.in";
    const headers = getCorsHeaders({ headers: { origin: "https://www.velvetwolf.in" } });
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://www.velvetwolf.in");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });
});
