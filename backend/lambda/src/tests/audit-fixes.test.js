import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared Supabase mock: rate-limit RPCs + a configurable users lookup.
const rpc = vi.fn();
const usersResult = { current: { data: null, error: null } };
vi.mock("../config/supabase.js", () => {
  const builder = {
    select: () => builder, eq: () => builder, maybeSingle: () => builder,
    then: (resolve) => Promise.resolve(usersResult.current).then(resolve),
  };
  return { supabaseAdmin: { from: () => builder, rpc } };
});

const sendContactMessage = vi.fn().mockResolvedValue({ success: true });
vi.mock("../services/contact.service.js", () => ({ sendContactMessage, sendBulkOrderMessage: vi.fn() }));

const { sanitizeFilterValue } = await import("../utils/postgrest.js");
const { discover } = await import("../controllers/auth.controller.js");
const { sendMessage } = await import("../controllers/contact.controller.js");

const event = { headers: {}, requestContext: { identity: { sourceIp: "49.36.1.2" } } };
const allow = (fn) => Promise.resolve(fn === "check_rate_limit_gate" ? { data: [{ blocked: false }], error: null } : { data: null, error: null });
const block = (fn) => Promise.resolve(fn === "check_rate_limit_gate" ? { data: [{ blocked: true, retry_after_seconds: 900 }], error: null } : { data: null, error: null });

describe("sanitizeFilterValue (PostgREST filter injection)", () => {
  it("removes the characters that would add or close filter conditions", () => {
    expect(sanitizeFilterValue("tee%,cost_price.gt.500")).not.toContain(",");
    expect(sanitizeFilterValue('x),and(status.eq.draft')).not.toMatch(/[(),]/);
    expect(sanitizeFilterValue('a"b\\c')).toBe("a b c");
  });

  it("leaves normal searches and colors intact", () => {
    expect(sanitizeFilterValue("Oversized Wolf Tee")).toBe("Oversized Wolf Tee");
    expect(sanitizeFilterValue("#0a0a0a")).toBe("#0a0a0a");
  });

  it("caps the length", () => {
    expect(sanitizeFilterValue("a".repeat(500))).toHaveLength(100);
  });
});

describe("POST /auth/discover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockImplementation(allow);
  });

  it("returns only whether the account exists — not the person's name or type", async () => {
    usersResult.current = { data: { id: "u1", email: "a@b.com", name: "Asha Rao", type: "Google" }, error: null };
    const res = await discover({ email: "a@b.com" }, event);
    expect(JSON.parse(res.body)).toEqual({ exists: true });
  });

  it("is rate-limited per IP", async () => {
    rpc.mockImplementation(block);
    await expect(discover({ email: "a@b.com" }, event)).rejects.toMatchObject({ statusCode: 429 });
  });
});

describe("POST /contact/send", () => {
  beforeEach(() => vi.clearAllMocks());

  const valid = { name: "Asha", email: "asha@example.com", subject: "Sizing", message: "Do you have XXL in stock please?" };

  it("sends and counts the submission", async () => {
    rpc.mockImplementation(allow);
    const res = await sendMessage(valid, event);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith("record_rate_attempt", { p_key: "contact:49.36.1.2" });
  });

  it("blocks with 429 after the hourly limit, without sending", async () => {
    rpc.mockImplementation(block);
    await expect(sendMessage(valid, event)).rejects.toMatchObject({ statusCode: 429 });
    expect(sendContactMessage).not.toHaveBeenCalled();
  });
});
