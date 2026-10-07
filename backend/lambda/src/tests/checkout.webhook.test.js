import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

const verifyCheckout = vi.fn();
vi.mock("../services/checkout.service.js", () => ({ verifyCheckout, initiateCheckout: vi.fn() }));
vi.mock("../config/supabase.js", () => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() } }));

const { paymentWebhook } = await import("../controllers/checkout.controller.js");
const { verifyWebhookSignature } = await import("../services/cashfree.js");

const SECRET = "cf-test-secret";
const ORDER_ID = "11111111-2222-3333-4444-555555555555";

// Signs exactly as Cashfree does: base64(HMAC-SHA256(timestamp + rawBody, secret))
function sign(rawBody, timestamp, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("base64");
}

function webhookEvent(payload, { signature, timestamp = "1759750000000", base64 = false, headerCase = "lower" } = {}) {
  const rawBody = JSON.stringify(payload);
  const sig = signature ?? sign(rawBody, timestamp);
  const names = headerCase === "lower"
    ? ["x-webhook-signature", "x-webhook-timestamp"]
    : ["X-Webhook-Signature", "X-Webhook-Timestamp"];
  return {
    requestContext: { http: { method: "POST" } },
    headers: { [names[0]]: sig, [names[1]]: timestamp },
    body: base64 ? Buffer.from(rawBody).toString("base64") : rawBody,
    isBase64Encoded: base64,
  };
}

const successPayload = {
  type: "PAYMENT_SUCCESS_WEBHOOK",
  data: { order: { order_id: ORDER_ID, order_amount: 1682 }, payment: { payment_status: "SUCCESS" } },
};

describe("Cashfree payment webhook", () => {
  const saved = process.env.CASHFREE_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CASHFREE_SECRET_KEY = SECRET;
    verifyCheckout.mockResolvedValue({ success: true, status: "SUCCESS", orderId: ORDER_ID });
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.CASHFREE_SECRET_KEY;
    else process.env.CASHFREE_SECRET_KEY = saved;
  });

  it("confirms the order via the Cashfree API when the signature is valid", async () => {
    const res = await paymentWebhook(webhookEvent(successPayload));
    expect(res.statusCode).toBe(200);
    expect(verifyCheckout).toHaveBeenCalledWith(ORDER_ID);
  });

  it("accepts base64-encoded bodies and differently-cased headers (REST API events)", async () => {
    const res = await paymentWebhook(webhookEvent(successPayload, { base64: true, headerCase: "title" }));
    expect(res.statusCode).toBe(200);
    expect(verifyCheckout).toHaveBeenCalledWith(ORDER_ID);
  });

  it("rejects a forged webhook (wrong secret) without touching the order", async () => {
    const forged = webhookEvent(successPayload, { signature: sign(JSON.stringify(successPayload), "1759750000000", "attacker-guess") });
    const res = await paymentWebhook(forged);
    expect(res.statusCode).toBe(401);
    expect(verifyCheckout).not.toHaveBeenCalled();
  });

  it("rejects a webhook with no signature", async () => {
    const event = webhookEvent(successPayload);
    delete event.headers["x-webhook-signature"];
    expect((await paymentWebhook(event)).statusCode).toBe(401);
    expect(verifyCheckout).not.toHaveBeenCalled();
  });

  it("rejects a body altered after signing", async () => {
    const event = webhookEvent(successPayload);
    event.body = event.body.replace("1682", "1");
    expect((await paymentWebhook(event)).statusCode).toBe(401);
  });

  it("acknowledges a signed test webhook that has no order", async () => {
    const res = await paymentWebhook(webhookEvent({ type: "WEBHOOK", data: { test_object: { test_key: "test_value" } } }));
    expect(res.statusCode).toBe(200);
    expect(verifyCheckout).not.toHaveBeenCalled();
  });

  it("lets a verification failure surface as an error so Cashfree retries", async () => {
    verifyCheckout.mockRejectedValueOnce(Object.assign(new Error("Failed to verify payment"), { statusCode: 500 }));
    await expect(paymentWebhook(webhookEvent(successPayload))).rejects.toMatchObject({ statusCode: 500 });
  });

  it("verifyWebhookSignature fails closed when the secret is not configured", () => {
    delete process.env.CASHFREE_SECRET_KEY;
    const body = JSON.stringify(successPayload);
    expect(verifyWebhookSignature(body, sign(body, "1"), "1")).toBe(false);
  });
});
