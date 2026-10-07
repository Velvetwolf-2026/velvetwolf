import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls } = vi.hoisted(() => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() }, calls: [] }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));

const { requireAuth, requireAdmin, getOptionalAuth } = await import("../middleware/auth.js");
const { revokeUserSessions } = await import("../services/session.service.js");

function useDb(responseQueues) {
  calls.length = 0;
  const fresh = createSupabaseMock(responseQueues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
}

const nowSecs = () => Math.floor(Date.now() / 1000);

function eventFor({ role = "customer", iat = nowSecs() } = {}) {
  const token = jwt.sign({ id: "u1", email: "a@b.com", role, iat }, process.env.JWT_SECRET);
  return { requestContext: { http: { method: "GET" } }, headers: { authorization: `Bearer ${token}` } };
}

describe("requireAuth — session revocation and current role", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a valid token and returns the user's CURRENT role from the DB", async () => {
    useDb({ users: [{ data: { id: "u1", role: "customer", sessions_valid_after: null }, error: null }] });
    const user = await requireAuth(eventFor({ role: "admin" })); // token still says admin
    expect(user).toMatchObject({ id: "u1", role: "customer" });
  });

  it("rejects a token issued before the user's sessions were revoked", async () => {
    const revokedAt = new Date().toISOString();
    useDb({ users: [{ data: { id: "u1", role: "customer", sessions_valid_after: revokedAt }, error: null }] });
    await expect(requireAuth(eventFor({ iat: nowSecs() - 3600 }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it("accepts a token issued in the same second as the revocation (the replacement session)", async () => {
    const revokedAt = new Date(nowSecs() * 1000 + 500).toISOString();
    useDb({ users: [{ data: { id: "u1", role: "customer", sessions_valid_after: revokedAt }, error: null }] });
    await expect(requireAuth(eventFor({ iat: nowSecs() }))).resolves.toMatchObject({ id: "u1" });
  });

  it("rejects a token for a user that no longer exists", async () => {
    useDb({ users: [{ data: null, error: null }] });
    await expect(requireAuth(eventFor())).rejects.toMatchObject({ statusCode: 401 });
  });

  it("still works before the migration adds sessions_valid_after", async () => {
    useDb({
      users: [
        { data: null, error: { code: "42703", message: "column users.sessions_valid_after does not exist" } },
        { data: { id: "u1", role: "customer" }, error: null },
      ],
    });
    await expect(requireAuth(eventFor())).resolves.toMatchObject({ id: "u1", role: "customer" });
  });

  it("returns 503 (not 401) when the DB lookup fails, so users aren't signed out by a blip", async () => {
    useDb({ users: [{ data: null, error: { code: "08006", message: "connection failure" } }] });
    await expect(requireAuth(eventFor())).rejects.toMatchObject({ statusCode: 503 });
  });

  it("requireAdmin denies a demoted admin whose token still says admin", async () => {
    useDb({ users: [{ data: { id: "u1", role: "customer", sessions_valid_after: null }, error: null }] });
    await expect(requireAdmin(eventFor({ role: "admin" }))).rejects.toMatchObject({ statusCode: 403 });
  });

  it("getOptionalAuth treats a revoked session as a guest", async () => {
    useDb({ users: [{ data: { id: "u1", role: "customer", sessions_valid_after: new Date().toISOString() }, error: null }] });
    await expect(getOptionalAuth(eventFor({ iat: nowSecs() - 3600 }))).resolves.toBeNull();
  });
});

describe("revokeUserSessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stamps sessions_valid_after for the user", async () => {
    useDb({ users: [{ data: null, error: null }] });
    await expect(revokeUserSessions({ email: "a@b.com" })).resolves.toBe(true);
    const update = calls.find((c) => c.table === "users" && c.method === "update");
    expect(Date.parse(update.payload.sessions_valid_after)).toBeGreaterThan(Date.now() - 5000);
  });

  it("never throws, so a password reset still succeeds before the migration runs", async () => {
    useDb({ users: [{ data: null, error: { code: "42703", message: "column does not exist" } }] });
    await expect(revokeUserSessions({ id: "u1" })).resolves.toBe(false);
  });
});
