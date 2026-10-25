import * as shiprocketService from "../services/shiprocket.service.js";
import { ApiError, jsonResponse, logError, TRY_AGAIN } from "../utils/http.js";

// Our own errors (order not found, bad PIN code) are written for people; anything
// else is logged and answered with a plain sentence.
function failure(err, event) {
  if (err instanceof ApiError) return jsonResponse(err.statusCode, { error: err.message }, {}, event);
  logError("Shipping request failed", { service: "shipping", error: err });
  return jsonResponse(500, { error: TRY_AGAIN }, {}, event);
}

export async function trackShipment(orderId, event, query = {}) {
  if (!orderId) {
    return jsonResponse(400, { error: "Order ID is required" }, {}, event);
  }
  
  try {
    const result = await shiprocketService.getShipmentTracking(decodeURIComponent(orderId).trim(), query?.email || "");
    return jsonResponse(200, result, {}, event);
  } catch (err) {
    return failure(err, event);
  }
}

export async function checkServiceability(query, event) {
  const pincode = query?.pincode;
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return jsonResponse(400, { error: "A valid 6-digit pincode is required" }, {}, event);
  }

  try {
    const result = await shiprocketService.checkServiceability(pincode);
    return jsonResponse(200, result, {}, event);
  } catch (err) {
    return failure(err, event);
  }
}
