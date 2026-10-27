// The low-risk findings from the October 2026 code review: one-step request
// limits, bulk-order emails, recommendations from the session, Studio SVG
// links, courier tracking numbers and products taken off sale.
import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { db, calls, sendEmail, getPersonalizedRecommendations } = vi.hoisted(() => ({
  db: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } },
  calls: [],
  sendEmail: vi.fn(),
  getPersonalizedRecommendations: vi.fn(),
}));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin: db }));
vi.mock("../config/smtp.js", () => ({ sendEmail, sendOTP: vi.fn() }));
vi.mock("../services/ai.service.js", () => ({
  getPersonalizedRecommendations, searchAiProducts: vi.fn(), chatAssistantDialog: vi.fn(), getSmartBundles: vi.fn(), recommendSize: vi.fn(),
}));

const { hitRateLimit } = await import("../utils/rateLimit.js");
const { sendBulkOrder } = await import("../controllers/contact.controller.js");
const { getRecommendations } = await import("../controllers/ai.controller.js");
const { signDesignFiles } = await import("../services/studio.service.js");
const { updateAdminOrderShiprocket } = await import("../services/admin.service.js");
const { initiateCheckout } = await import("../services/checkout.service.js");

const IP_EVENT = { headers: {}, requestContext: { identity: { sourceIp: "49.36.1.2" } } };

function useDb(queues = {}) {
  calls.length = 0;
  const fresh = createSupabaseMock(queues, calls);
  db.from.mockImplementation(fresh.supabaseAdmin.from);
}

// rpc answers by function name; hit_rate_limit blocks the keys in `blocked`
function useRpc({ blocked = [], hitError = null } = {}) {
  db.rpc.mockImplementation((fn, args) => {
    if (fn === "hit_rate_limit") {
      if (hitError) return Promise.resolve({ data: null, error: hitError });
      return Promise.resolve({ data: [{ blocked: blocked.includes(args.p_key), retry_after_seconds: 600 }], error: null });
    }
    if (fn === "check_rate_limit_gate") return Promise.resolve({ data: [{ blocked: false }], error: null });
    return Promise.resolve({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useDb();
  useRpc();
  sendEmail.mockResolvedValue({ messageId: "m" });
});

describe("request limits", () => {
  const LIMIT = { max: 5, windowSecs: 60, blockSecs: 60 };

  it("count and check in one call", async () => {
    await hitRateLimit("contact:1.2.3.4", LIMIT);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith("hit_rate_limit", { p_key: "contact:1.2.3.4", p_max: 5, p_window_seconds: 60, p_block_seconds: 60 });
  });

  it("refuse past the limit, in the caller's wording", async () => {
    useRpc({ blocked: ["k"] });
    await expect(hitRateLimit("k", LIMIT)).rejects.toMatchObject({ statusCode: 429, message: "Too many attempts. Try again in 10 min." });
    await expect(hitRateLimit("k", LIMIT, { verb: "requests" })).rejects.toThrow("Too many requests. Try again in 10 min.");
  });

  it("fall back to the separate check and record before the migration runs", async () => {
    useRpc({ hitError: { code: "PGRST202", message: "Could not find the function public.hit_rate_limit" } });
    await hitRateLimit("k", LIMIT);
    expect(db.rpc.mock.calls.map(([fn]) => fn)).toEqual(["hit_rate_limit", "check_rate_limit_gate", "record_rate_attempt"]);
  });

  it("let requests through when the store fails, unless told to fail closed", async () => {
    useRpc({ hitError: { code: "08006", message: "connection failure" } });
    await expect(hitRateLimit("k", LIMIT)).resolves.toBeUndefined();
    await expect(hitRateLimit("k", LIMIT, { failOpen: false })).rejects.toMatchObject({ message: "Something went wrong on our side. Please try again." });
  });
});

describe("bulk-order emails", () => {
  const BULK = { type: "corporate", org: "Click <a href='http://bad.example'>here</a>", contact: "Ravi Kumar", email: "someone@example.com", qty: 50, message: "Visit bad.example for a prize!!" };

  it("send the request to the team, with replies going to the customer", async () => {
    const res = await sendBulkOrder(BULK, IP_EVENT);
    expect(res.statusCode).toBe(200);
    const team = sendEmail.mock.calls[0][0];
    expect(team).toMatchObject({ to: "info@velvetwolf.in", replyTo: "someone@example.com" });
    expect(team.text).toContain("Visit bad.example for a prize!!");
    expect(team.cc).toBeUndefined();
  });

  it("send the typed-in address a confirmation with none of the sender's text", async () => {
    await sendBulkOrder(BULK, IP_EVENT);
    const confirmation = sendEmail.mock.calls[1][0];
    expect(confirmation.to).toBe("someone@example.com");
    for (const part of [confirmation.subject, confirmation.html, confirmation.text]) {
      expect(part).not.toContain("bad.example");
      expect(part).not.toContain("Ravi");
    }
    expect(confirmation.attachments).toBeUndefined();
  });

  it("stop confirming to an address after 3 a day, but still pass the request on", async () => {
    useRpc({ blocked: ["bulk-confirm:someone@example.com"] });
    const res = await sendBulkOrder(BULK, IP_EVENT);
    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe("info@velvetwolf.in");
  });

  it("still succeed when only the confirmation fails", async () => {
    sendEmail.mockResolvedValueOnce({ messageId: "team" }).mockRejectedValueOnce(new Error("mailbox unavailable"));
    expect((await sendBulkOrder(BULK, IP_EVENT)).statusCode).toBe(200);
  });
});

describe("AI recommendations", () => {
  it("never use an account named in the request", async () => {
    getPersonalizedRecommendations.mockResolvedValue([]);
    await getRecommendations({ userId: "someone-elses-id", history: [] }, IP_EVENT);
    expect(getPersonalizedRecommendations).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });

  it("use the signed-in customer's own", async () => {
    getPersonalizedRecommendations.mockResolvedValue([]);
    useDb({ users: [{ data: { id: "u1", role: "customer", sessions_valid_after: null }, error: null }] });
    const token = jwt.sign({ id: "u1", email: "a@b.com" }, process.env.JWT_SECRET);
    await getRecommendations({ userId: "someone-elses-id" }, { ...IP_EVENT, headers: { authorization: `Bearer ${token}` } });
    expect(getPersonalizedRecommendations).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
  });
});

describe("Studio file links", () => {
  it("make SVGs download instead of opening; images open as before", async () => {
    const createSignedUrls = vi.fn((paths, expiresIn, options) =>
      Promise.resolve({ data: paths.map((path) => ({ path, signedUrl: `https://s/${path}${options?.download ? "?download=" : ""}` })), error: null }));
    db.storage.from.mockReturnValue({ createSignedUrls });

    const out = await signDesignFiles({ sides: { front: { artwork: "uploads/a.svg", proof: "proofs/a.png" } } });

    expect(createSignedUrls).toHaveBeenCalledWith(["proofs/a.png"], expect.any(Number), undefined);
    expect(createSignedUrls).toHaveBeenCalledWith(["uploads/a.svg"], expect.any(Number), { download: true });
    expect(out.front).toEqual({ artworkUrl: "https://s/uploads/a.svg?download=", proofUrl: "https://s/proofs/a.png" });
  });
});

describe("courier tracking numbers", () => {
  it("allow only letters, numbers and dashes", async () => {
    for (const awb of ["123/../../orders", "AWB 123", "x?token=1", "a".repeat(41)]) {
      await expect(updateAdminOrderShiprocket("o1", { awb_number: awb })).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });

  it("save a normal one, trimmed", async () => {
    useDb({ orders: [{ data: { id: "o1" }, error: null }] });
    await updateAdminOrderShiprocket("o1", { awb_number: " 1234567890-IN ", courier_name: "Delhivery", shipping_status: 5 });
    expect(calls.find((c) => c.method === "update").payload).toEqual({ awb_number: "1234567890-IN", courier_name: "Delhivery", shipping_status: null });
  });
});

describe("products taken off sale", () => {
  const ADDRESS = { name: "Asha Rao", phone: "9876501234", email: "a@b.com", address: "12 Main Street", city: "Chennai", state: "Tamil Nadu", pincode: "600001" };
  const TEE = { id: "22222222-2222-4222-8222-222222222222", name: "Quiet Tee", qty: 1, size: "M", color: "Black" };

  it("can't be bought, even from an old cart", async () => {
    useDb({
      product_variants: [{ data: [{ id: "v1", stock_qty: 10, size: "M", color: "Black" }], error: null }],
      products: [{ data: { price: 999, is_active: false }, error: null }],
    });
    await expect(initiateCheckout({ cart: [TEE], address: ADDRESS, payment_method: "upi" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Item Quiet Tee is no longer available. Please remove it from your cart." });
    expect(calls.some((c) => c.table === "orders" && c.method === "insert")).toBe(false);
  });
});
