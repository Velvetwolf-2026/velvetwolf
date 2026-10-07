import * as checkoutService from "../services/checkout.service.js";
import { jsonResponse, getClientIp, logInfo, logWarn } from "../utils/http.js";
import { verifyWebhookSignature } from "../services/cashfree.js";
import { getOptionalAuth } from "../middleware/auth.js";
import { assertNotRateLimited, recordRateLimitedAttempt } from "../utils/rateLimit.js";

export async function createSession(body, event) {
  // Can be called by guest or logged in user. The order owner comes from the
  // verified session token only — never from the request body, otherwise
  // anyone could attach an order to another customer's account.
  const { cart, address, total_amount, subtotal, payment_method, couponCode, meta } = body;
  const authUser = await getOptionalAuth(event);

  // Meta CAPI matching data. The IP comes from getClientIp (API Gateway's
  // source IP, or the visitor IP forwarded by the trusted /api proxy) — a raw
  // X-Forwarded-For header is client-controlled and, behind the proxy, would
  // be the proxy's own address.
  const headers = event?.headers || {};
  const ip = getClientIp(event) || null;
  const ua = headers["user-agent"] || headers["User-Agent"] || null;

  const result = await checkoutService.initiateCheckout({
    user_id: authUser?.id || null,
    cart,
    address,
    total_amount,
    subtotal,
    payment_method,
    couponCode,
    meta: {
      ...(meta || {}),
      ip,
      ua,
    },
  });

  return jsonResponse(200, result, {}, event);
}

export async function verifySession(body, event) {
  const { orderId } = body;
  if (!orderId) {
    return jsonResponse(400, { error: "Order ID is required" }, {}, event);
  }

  const result = await checkoutService.verifyCheckout(orderId);
  return jsonResponse(200, result, {}, event);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getHeaderValue(event, name) {
  const headers = event?.headers || {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? String(headers[key] || "") : "";
}

/**
 * Cashfree payment webhook (order_meta.notify_url). Only signed requests are
 * accepted, and even then the payload isn't trusted: verifyCheckout asks
 * Cashfree's API for the real payment status and does the atomic
 * pending -> confirmed transition, so duplicates and replays are harmless.
 */
export async function paymentWebhook(event) {
  // The signature covers the exact bytes Cashfree sent, not the parsed body.
  const rawBody = event?.body
    ? (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body)
    : "";
  const signature = getHeaderValue(event, "x-webhook-signature");
  const timestamp = getHeaderValue(event, "x-webhook-timestamp");

  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    logWarn("Rejected Cashfree webhook with invalid signature", { service: "checkout-webhook", hasSignature: Boolean(signature) });
    return jsonResponse(401, { error: "Invalid signature" }, {}, event);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" }, {}, event);
  }

  const orderId = payload?.data?.order?.order_id;
  // Test webhooks from the dashboard and events for other orders carry no
  // (valid) order id: acknowledge so Cashfree doesn't keep retrying.
  if (!orderId || !UUID_RE.test(orderId)) {
    logInfo("Cashfree webhook acknowledged without an order to confirm", { service: "checkout-webhook", type: payload?.type });
    return jsonResponse(200, { received: true }, {}, event);
  }

  // Errors propagate as 5xx, so Cashfree retries later.
  const result = await checkoutService.verifyCheckout(orderId);
  logInfo("Cashfree webhook processed", { service: "checkout-webhook", type: payload?.type, orderId, status: result.status });
  return jsonResponse(200, { received: true }, {}, event);
}

export async function validateCoupon(body, event) {
  const { code, subtotal } = body;
  if (!code) {
    return jsonResponse(400, { error: "Coupon code is required" }, {}, event);
  }

  // Limit guessing of coupon codes per visitor IP. Only failed attempts
  // count, so customers applying a valid code are never limited.
  const rateKey = `coupon:${getClientIp(event) || "unknown"}`;
  await assertNotRateLimited(rateKey, COUPON_RATE_LIMIT);

  try {
    const result = await checkoutService.validateCouponEndpoint(code, subtotal);
    return jsonResponse(200, result, {}, event);
  } catch (error) {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      await recordRateLimitedAttempt(rateKey);
    }
    throw error;
  }
}

// 20 failed coupon attempts per 15 minutes, then a 15-minute block.
const COUPON_RATE_LIMIT = { max: 20, windowSecs: 15 * 60, blockSecs: 15 * 60 };
