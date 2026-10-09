import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls, sendOTP } = vi.hoisted(() => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
  calls: [],
  sendOTP: vi.fn(),
}));

vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));
vi.mock("../config/smtp.js", () => ({ sendOTP }));

const { login, verifyOtp } = await import("../services/auth.service.js");
const { loginSchema, signupSchema } = await import("../schemas/auth.schema.js");
const addressService = await import("../services/address.service.js");
const { deleteAccount } = await import("../services/profile.service.js");
const { addressSchema, deleteAccountSchema } = await import("../schemas/common.schema.js");

function resetSupabaseMock(responseQueues) {
  calls.length = 0;
  const fresh = createSupabaseMock(responseQueues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
  // Rate-limit gate always open.
  supabaseAdmin.rpc.mockImplementation((fn) =>
    Promise.resolve(fn === "check_rate_limit_gate" ? { data: [{ blocked: false }], error: null } : { data: null, error: null }));
}

const USER = { id: "u1", email: "a@b.com", name: "Alex", role: "customer", is_verified: true, type: "Email" };

beforeEach(() => {
  vi.clearAllMocks();
  sendOTP.mockResolvedValue({ messageId: "mock" });
});

describe("passwordless email sign-in", () => {
  it("schemas no longer take a password", () => {
    expect(loginSchema.parse({ email: "A@B.com", password: "ignored" })).toEqual({ email: "a@b.com" });
    expect(signupSchema.parse({ name: "Alex", email: "a@b.com" })).toMatchObject({ name: "Alex", email: "a@b.com" });
  });

  it("emails a login code to a registered account without needing a password", async () => {
    resetSupabaseMock({ users: [{ data: USER, error: null }] });

    const result = await login({ email: "a@b.com" }, "49.36.1.2");

    expect(result).toEqual({ success: true, requiresOtp: true, message: "OTP sent" });
    expect(result.token).toBeUndefined();
    const insert = calls.find((c) => c.table === "otps" && c.method === "insert");
    expect(insert.payload).toMatchObject({ email: "a@b.com", type: "Login-OTP" });
    expect(sendOTP).toHaveBeenCalledWith("a@b.com", insert.payload.otp, "login", expect.any(String));
  });

  it("counts every code request toward the rate limit", async () => {
    resetSupabaseMock({ users: [{ data: USER, error: null }] });
    await login({ email: "a@b.com" }, "49.36.1.2");
    const recorded = supabaseAdmin.rpc.mock.calls.filter(([fn]) => fn === "record_rate_attempt").map(([, a]) => a.p_key);
    expect(recorded).toEqual(["login:a@b.com", "ip:login:49.36.1.2"]);
  });

  it("refuses unknown emails without sending anything", async () => {
    resetSupabaseMock({ users: [{ data: null, error: { code: "PGRST116" } }] });
    await expect(login({ email: "nobody@b.com" })).rejects.toMatchObject({ statusCode: 401 });
    expect(sendOTP).not.toHaveBeenCalled();
  });

  it("a correct code signs in and marks the account verified", async () => {
    resetSupabaseMock({
      otps: [{ data: { id: "o1", otp: 482913, attempts: 0 }, error: null }],
      users: [{ data: USER, error: null }, { data: null, error: null }],
    });

    const result = await verifyOtp({ email: "a@b.com", otp: "482913", type: "login" });

    expect(result.token).toBeTruthy();
    expect(result.user).toMatchObject({ id: "u1", email: "a@b.com" });
    const update = calls.find((c) => c.table === "users" && c.method === "update");
    expect(update.payload).toMatchObject({ is_verified: true });
  });

  it("a wrong code counts an attempt and does not sign in", async () => {
    resetSupabaseMock({ otps: [{ data: { id: "o1", otp: 482913, attempts: 1 }, error: null }] });
    await expect(verifyOtp({ email: "a@b.com", otp: "000000", type: "login" })).rejects.toMatchObject({ statusCode: 400 });
    expect(calls.find((c) => c.table === "otps" && c.method === "update").payload).toEqual({ attempts: 2 });
  });
});

describe("saved addresses", () => {
  const ADDR = { name: "Alex", phone: "9876543210", address: "12 MG Road", city: "Chennai", district: "Chennai", state: "Tamil Nadu", pincode: "600001" };

  it("validates Indian phone numbers and 6-digit PIN codes", () => {
    expect(() => addressSchema.parse(ADDR)).not.toThrow();
    expect(() => addressSchema.parse({ ...ADDR, pincode: "6000" })).toThrow();
    expect(() => addressSchema.parse({ ...ADDR, phone: "12345" })).toThrow();
  });

  it("makes the first saved address the default", async () => {
    resetSupabaseMock({ addresses: [{ data: [], error: null }, { data: null, error: null }, { data: { id: "a1" }, error: null }] });
    await addressService.createAddress("u1", ADDR);
    const insert = calls.find((c) => c.table === "addresses" && c.method === "insert");
    expect(insert.payload).toMatchObject({ user_id: "u1", is_default: true, pincode: "600001" });
  });

  it("caps each customer at 10 addresses", async () => {
    resetSupabaseMock({ addresses: [{ data: Array.from({ length: 10 }, (_, i) => ({ id: `a${i}` })), error: null }] });
    await expect(addressService.createAddress("u1", ADDR)).rejects.toMatchObject({ statusCode: 400 });
    expect(calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("returns 404 when changing or removing someone else's address", async () => {
    resetSupabaseMock({ addresses: [{ data: { id: "a9", user_id: "someone-else", is_default: false }, error: null }] });
    await expect(addressService.updateAddress("u1", "a9", ADDR)).rejects.toMatchObject({ statusCode: 404 });

    resetSupabaseMock({ addresses: [{ data: { id: "a9", user_id: "someone-else", is_default: false }, error: null }] });
    await expect(addressService.deleteAddress("u1", "a9")).rejects.toMatchObject({ statusCode: 404 });
    expect(calls.some((c) => c.method === "update" || c.method === "delete")).toBe(false);
  });

  it("moves the default to another address when the default is removed", async () => {
    resetSupabaseMock({
      addresses: [
        { data: { id: "a1", user_id: "u1", is_default: true }, error: null }, // ownership
        { data: null, error: null }, // delete
        { data: [{ id: "a2" }], error: null }, // remaining
        { data: null, error: null }, // set default
      ],
    });
    await addressService.deleteAddress("u1", "a1");
    expect(calls.filter((c) => c.table === "addresses").map((c) => c.method)).toEqual(["delete", "update"]);
    expect(calls.find((c) => c.method === "update").payload).toEqual({ is_default: true });
  });
});

describe("delete account", () => {
  it("requires typing DELETE", () => {
    expect(() => deleteAccountSchema.parse({ confirm: "DELETE" })).not.toThrow();
    expect(() => deleteAccountSchema.parse({ confirm: "delete" })).toThrow();
    expect(() => deleteAccountSchema.parse({})).toThrow();
  });

  it("removes the customer's codes and account", async () => {
    resetSupabaseMock({ users: [{ data: { id: "u1", email: "a@b.com", role: "customer" }, error: null }, { data: null, error: null }] });
    await expect(deleteAccount("u1")).resolves.toEqual({ success: true });
    expect(calls.map((c) => `${c.table}.${c.method}`)).toEqual(["otps.delete", "users.delete"]);
  });

  it("refuses to delete an admin account", async () => {
    resetSupabaseMock({ users: [{ data: { id: "u1", email: "a@b.com", role: "admin" }, error: null }] });
    await expect(deleteAccount("u1")).rejects.toMatchObject({ statusCode: 403 });
    expect(calls.some((c) => c.method === "delete")).toBe(false);
  });

  it("reports a conflict instead of a crash when other rows still reference the user", async () => {
    resetSupabaseMock({ users: [{ data: { id: "u1", email: "a@b.com", role: "customer" }, error: null }, { data: null, error: { code: "23503" } }] });
    await expect(deleteAccount("u1")).rejects.toMatchObject({ statusCode: 409 });
  });
});
