// Hardening from the October 2026 security review.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin: { rpc, from } }));

const searchAiProducts = vi.fn();
const chatAssistantDialog = vi.fn();
vi.mock("../services/ai.service.js", () => ({ searchAiProducts, chatAssistantDialog, getPersonalizedRecommendations: vi.fn(), getSmartBundles: vi.fn(), recommendSize: vi.fn() }));

const { validate, assertReasonableInput, MAX_ARRAY_ITEMS } = await import("../middleware/validate.js");
const { search, chatAssistant } = await import("../controllers/ai.controller.js");

const event = { headers: {}, requestContext: { identity: { sourceIp: "49.36.1.2" } } };
const RAW = { id: "p1", name: "Quiet Tee", slug: "quiet", price: 599, cost_price: 180, image: "Black::https://x/a.jpg", images: [], is_active: true };

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockImplementation((fn) => Promise.resolve(["check_rate_limit_gate", "hit_rate_limit"].includes(fn) ? { data: [{ blocked: false }], error: null } : { data: null, error: null }));
});

describe("oversized input", () => {
  it("refuses a huge array before Zod parses it", () => {
    const schema = z.object({ sizes: z.array(z.string()) });
    expect(() => validate(schema)({ sizes: Array(MAX_ARRAY_ITEMS + 1).fill(1) })).toThrow(/Too many items/);
    expect(validate(schema)({ sizes: ["S", "M"] })).toEqual({ sizes: ["S", "M"] });
  });

  it("refuses deep nesting", () => {
    let deep = {};
    for (let i = 0; i < 20; i++) deep = { a: deep };
    expect(() => assertReasonableInput(deep)).toThrow(/nested/);
  });
});

describe("stylist endpoints", () => {
  it("are throttled per visitor", async () => {
    searchAiProducts.mockResolvedValue([]);
    await search({ query: "black tee" }, event);
    expect(rpc).toHaveBeenCalledWith("hit_rate_limit", expect.objectContaining({ p_key: "ai:49.36.1.2" }));
    rpc.mockImplementation((fn) => Promise.resolve(["check_rate_limit_gate", "hit_rate_limit"].includes(fn) ? { data: [{ blocked: true, retry_after_seconds: 300 }], error: null } : { data: null, error: null }));
    await expect(search({ query: "black tee" }, event)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("never send internal product columns such as cost price", async () => {
    searchAiProducts.mockResolvedValue([RAW]);
    const res = await search({ query: "black tee" }, event);
    const product = JSON.parse(res.body).products[0];
    expect(product).toMatchObject({ id: "p1", name: "Quiet Tee", price: 599 });
    expect(product).not.toHaveProperty("cost_price");
  });

  it("pass on only the recent turns, as bounded plain text", async () => {
    chatAssistantDialog.mockResolvedValue({ message: "hi", products: [RAW] });
    const messages = Array.from({ length: 30 }, (_, i) => ({ role: "user", content: `${i} ${"x".repeat(5000)}`, extra: "drop me" }));
    const res = await chatAssistant({ messages }, event);
    const sent = chatAssistantDialog.mock.calls[0][0];
    expect(sent).toHaveLength(20);
    expect(sent.every((m) => m.content.length <= 300 && !("extra" in m))).toBe(true);
    expect(JSON.parse(res.body).products[0]).not.toHaveProperty("cost_price");
  });
});
