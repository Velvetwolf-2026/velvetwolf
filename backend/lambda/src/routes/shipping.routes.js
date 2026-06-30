import * as shippingController from "../controllers/shipping.controller.js";

export async function handleShippingRoutes(method, route, body, query, event) {
  if (method === "GET" && route.startsWith("/shipping/track/")) {
    const orderId = route.substring("/shipping/track/".length);
    return shippingController.trackShipment(orderId, event);
  }

  if (method === "GET" && route === "/shipping/serviceability") {
    return shippingController.checkServiceability(query, event);
  }

  return null;
}
