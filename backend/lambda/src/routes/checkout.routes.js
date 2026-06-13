import * as checkoutController from "../controllers/checkout.controller.js";

export async function handleCheckoutRoutes(method, route, body, query, event) {
  if (method === "POST" && route === "/checkout/create")
    return checkoutController.createSession(body, event);

  if (method === "POST" && route === "/checkout/verify")
    return checkoutController.verifySession(body, event);

  if (method === "POST" && route === "/checkout/coupon/validate")
    return checkoutController.validateCoupon(body, event);

  return null;
}
