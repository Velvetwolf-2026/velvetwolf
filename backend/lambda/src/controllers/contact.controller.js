import * as contactService from "../services/contact.service.js";
import { contactSchema, bulkOrderSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse, getClientIp } from "../utils/http.js";
import { assertNotRateLimited, recordRateLimitedAttempt } from "../utils/rateLimit.js";

// Each submission sends an email, so cap them per visitor IP to stop
// scripted floods of the inbox and the SMTP quota.
const FORM_RATE_LIMIT = { max: 5, windowSecs: 60 * 60, blockSecs: 60 * 60 };

async function limitSubmissions(kind, event) {
  const rateKey = `${kind}:${getClientIp(event) || "unknown"}`;
  await assertNotRateLimited(rateKey, FORM_RATE_LIMIT);
  await recordRateLimitedAttempt(rateKey);
}

export async function sendMessage(body, event) {
  const data = validate(contactSchema)(body);
  await limitSubmissions("contact", event);
  const result = await contactService.sendContactMessage(data);
  return jsonResponse(200, result, {}, event);
}

export async function sendBulkOrder(body, event) {
  const data = validate(bulkOrderSchema)(body);
  await limitSubmissions("bulk", event);
  const result = await contactService.sendBulkOrderMessage(data);
  return jsonResponse(200, result, {}, event);
}
