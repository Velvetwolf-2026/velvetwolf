import * as checkoutService from "../services/checkout.service.js";
import { jsonResponse, getClientIp } from "../utils/http.js";
import { getOptionalAuth } from "../middleware/auth.js";

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

export async function validateCoupon(body, event) {
  const { code, subtotal } = body;
  if (!code) {
    return jsonResponse(400, { error: "Coupon code is required" }, {}, event);
  }

  const result = await checkoutService.validateCouponEndpoint(code, subtotal);
  return jsonResponse(200, result, {}, event);
}
