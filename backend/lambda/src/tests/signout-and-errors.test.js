// Signing out ends the session on the server, and errors read as plain
// sentences: raw database and provider text stays in the logs.
import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls } = vi.hoisted(() => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() }, calls: [] }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));

const { requireAuth } = await import("../middleware/auth.js");
const { logout, googleCallback } = await import("../controllers/auth.controller.js");
const { handler } = await import("../handler.js");
const { ApiError, dbFailure, adminDbFailure, serializeError, TRY_AGAIN } = await import("../utils/http.js");
const cartService = await import("../services/cart.service.js");

function useDb(responseQueues) {
  calls.length = 0;
  const fresh = createSupabaseMock(responseQueues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
}

const USER_ROW = { data: { id: "u1", role: "customer", sessions_valid_after: null }, error: null };
const tokenFor = () => jwt.sign({ id: "u1", email: "a@b.com", role: "customer" }, process.env.JWT_SECRET, { expiresIn: "7d" });
const cookieEvent = (token, method = "GET") => ({ requestContext: { http: { method } }, headers: { cookie: `token=${token}` } });

beforeEach(() => vi.clearAllMocks());

describe("sign-out", () => {
  it("records the session (as a hash) and clears the cookies", async () => {
    useDb({});
    const token = tokenFor();
    const res = await logout({}, { ...cookieEvent(token, "POST"), version: "2.0" });

    const insert = calls.find((c) => c.table === "ended_sessions" && c.method === "insert");
    expect(insert.payload.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(insert.payload.token_hash).not.toContain(token);
    expect(insert.payload).toMatchObject({ user_id: "u1" });
    expect(new Date(insert.payload.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(res.cookies.join(";")).toMatch(/token=;.*Expires=Thu, 01 Jan 1970/);
  });

  it("refuses a signed-out session afterwards", async () => {
    useDb({ users: [USER_ROW], ended_sessions: [{ data: { token_hash: "x" }, error: null }] });
    await expect(requireAuth(cookieEvent(tokenFor()))).rejects.toMatchObject({ statusCode: 401, message: "Your session has ended. Please sign in again." });
  });

  it("still accepts sessions that weren't signed out", async () => {
    useDb({ users: [USER_ROW], ended_sessions: [{ data: null, error: null }] });
    await expect(requireAuth(cookieEvent(tokenFor()))).resolves.toMatchObject({ id: "u1" });
  });

  it("works as before until the ended_sessions migration runs", async () => {
    const missing = { data: null, error: { code: "42P01", message: 'relation "public.ended_sessions" does not exist' } };
    useDb({ users: [USER_ROW], ended_sessions: [missing, missing] });
    await expect(requireAuth(cookieEvent(tokenFor()))).resolves.toMatchObject({ id: "u1" });
    const res = await logout({}, cookieEvent(tokenFor(), "POST"));
    expect(res.statusCode).toBe(200);
  });

  it("answers 503, not 401, when the lookup fails, so a blip doesn't sign anyone out", async () => {
    useDb({ users: [USER_ROW], ended_sessions: [{ data: null, error: { code: "08006", message: "connection failure" } }] });
    await expect(requireAuth(cookieEvent(tokenFor()))).rejects.toMatchObject({ statusCode: 503 });
  });

  it("still clears the browser for an expired or missing token", async () => {
    useDb({});
    expect((await logout({}, cookieEvent("not-a-token", "POST"))).statusCode).toBe(200);
    expect((await logout({}, { headers: {} })).statusCode).toBe(200);
    expect(calls.some((c) => c.table === "ended_sessions")).toBe(false);
  });
});

describe("readable errors", () => {
  it("never shows the database's own text", async () => {
    const raw = { code: "XX000", message: 'relation "cart_items" violates something internal' };
    useDb({ cart_items: [{ data: null, error: raw }] });
    const err = await cartService.getCartByUserId("u1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("We couldn't load your cart. Please try again.");
    expect(err.cause).toBe(raw); // kept for the logs
    expect(serializeError(err).cause).toMatchObject({ code: "XX000", message: raw.message });
  });

  it("explains common database refusals in plain words", () => {
    expect(dbFailure(400, { code: "23505", message: 'duplicate key value violates unique constraint "coupons_code_key"' }, "Couldn't create the coupon.").message)
      .toBe("Couldn't create the coupon. That name or code is already in use.");
    expect(dbFailure(400, { code: "23503" }, "Couldn't delete the collection.").message)
      .toBe("Couldn't delete the collection. Other records still depend on it.");
    expect(dbFailure(400, { code: "XX000" }).message).toBe(TRY_AGAIN);
  });

  it("tells admins when the database needs its latest update, but not customers", () => {
    const missingColumn = { code: "42703", message: 'column "fit" does not exist' };
    expect(adminDbFailure(500, missingColumn, "Couldn't save the product.").message).toContain("run the newest migration");
    expect(dbFailure(500, missingColumn, "We couldn't load your cart.").message).toBe("We couldn't load your cart. Please try again.");
  });

  it("answers unexpected failures with a plain sentence", async () => {
    supabaseAdmin.from.mockImplementation(() => { throw new Error("TypeError: cannot read properties of undefined (reading 'eq')"); });
    const res = await handler({ httpMethod: "GET", path: "/products", headers: {}, requestContext: {} });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: TRY_AGAIN });
  });

  it("doesn't echo Google's error text from the link onto the page", async () => {
    const res = await googleCallback({ error: "server_error", error_description: "Call +91 99999 99999 to restore your account" }, { headers: {} });
    const authError = new URL(res.headers.Location).searchParams.get("auth_error");
    expect(authError).toBe("Google sign-in could not be completed.");
  });
});
