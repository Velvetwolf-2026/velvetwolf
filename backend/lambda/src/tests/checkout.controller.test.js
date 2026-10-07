import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

const initiateCheckout = vi.fn().mockResolvedValue({ success: true, orderId: "order-1" });
vi.mock("../services/checkout.service.js", () => ({ initiateCheckout }));

// requireAuth looks the user up to check revocation and the current role.
vi.mock("../config/supabase.js", async () => {
  const { createSupabaseMock } = await import("./testUtils/supabaseMock.js");
  const user = { data: { id: "22222222-2222-2222-2222-222222222222", role: "customer", sessions_valid_after: null }, error: null };
  return createSupabaseMock({ users: Array(20).fill(user) });
});

const { createSession } = await import("../controllers/checkout.controller.js");
const { getCorsHeaders } = await import("../utils/http.js");

const USER_ID = "22222222-2222-2222-2222-222222222222";
const ATTACKER_TARGET_ID = "33333333-3333-3333-3333-333333333333";

function eventWithToken(token) {
  return {
    requestContext: { http: { method: "POST" } },
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

describe("checkout.controller createSession — order ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("takes the order owner from the verified token, ignoring user_id in the body", async () => {
    const token = jwt.sign({ id: USER_ID, email: "a@b.com", role: "customer" }, process.env.JWT_SECRET);

    await createSession({ cart: [], user_id: ATTACKER_TARGET_ID }, eventWithToken(token));

    expect(initiateCheckout).toHaveBeenCalledWith(expect.objectContaining({ user_id: USER_ID }));
  });

  it("treats a request without a token as a guest order even if the body names a user", async () => {
    await createSession({ cart: [], user_id: ATTACKER_TARGET_ID }, eventWithToken(null));

    expect(initiateCheckout).toHaveBeenCalledWith(expect.objectContaining({ user_id: null }));
  });

  it("treats an invalid token as a guest order instead of failing checkout", async () => {
    await createSession({ cart: [], user_id: ATTACKER_TARGET_ID }, eventWithToken("not-a-real-token"));

    expect(initiateCheckout).toHaveBeenCalledWith(expect.objectContaining({ user_id: null }));
  });
});

describe("getCorsHeaders — localhost origins", () => {
  const original = { fn: process.env.AWS_LAMBDA_FUNCTION_NAME, env: process.env.NODE_ENV, fe: process.env.FRONTEND_URL };

  beforeEach(() => {
    process.env.FRONTEND_URL = "https://www.velvetwolf.in";
    delete process.env.PROD_FRONTEND_URL;
    delete process.env.PROD_FRONTEND_URL_WWW;
  });

  afterEach(() => {
    for (const [key, value] of [["AWS_LAMBDA_FUNCTION_NAME", original.fn], ["NODE_ENV", original.env], ["FRONTEND_URL", original.fe]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const corsFor = (origin) => getCorsHeaders({ headers: { origin } });

  it("does not trust localhost origins on the deployed Lambda", () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = "velvetwolf-backend";
    process.env.NODE_ENV = "production";

    const headers = corsFor("http://localhost:5173");
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("http://localhost:5173");
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });

  it("still trusts the configured production origin on the deployed Lambda", () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = "velvetwolf-backend";

    const headers = corsFor("https://www.velvetwolf.in");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://www.velvetwolf.in");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("trusts localhost origins on the local dev server", () => {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;

    const headers = corsFor("http://localhost:5173");
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
  });
});
