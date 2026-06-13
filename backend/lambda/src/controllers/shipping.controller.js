import * as shiprocketService from "../services/shiprocket.service.js";
import { jsonResponse } from "../utils/http.js";

export async function trackShipment(orderId, event) {
  if (!orderId) {
    return jsonResponse(400, { error: "Order ID is required" }, {}, event);
  }
  
  try {
    const result = await shiprocketService.getShipmentTracking(orderId);
    return jsonResponse(200, result, {}, event);
  } catch (err) {
    return jsonResponse(err.statusCode || 500, { error: err.message || "Internal server error" }, {}, event);
  }
}
