import * as checkoutService from "../services/checkout.service.js";
import { jsonResponse } from "../utils/http.js";

export async function createSession(body, event) {
  // Can be called by guest or logged in user
  const { cart, address, total_amount, subtotal, shipping_amount, tax_amount, payment_method, user_id, couponCode } = body;
  
  const result = await checkoutService.initiateCheckout({
    user_id, cart, address, total_amount, subtotal, shipping_amount, tax_amount, payment_method, couponCode
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
