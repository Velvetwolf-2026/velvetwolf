import * as bounceService from "../services/bounce.service.js";
import { jsonResponse } from "../utils/http.js";

// SNS delivers bounce/complaint notifications here.
// This route is intentionally unauthenticated — SNS does not send credentials.
export async function handleSnsNotification(rawBody, event) {
  const result = await bounceService.handleSnsNotification(rawBody);
  return jsonResponse(200, result, {}, event);
}
