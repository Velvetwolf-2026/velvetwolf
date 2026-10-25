import * as contactService from "../services/contact.service.js";
import { contactSchema, bulkOrderSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse, getClientIp } from "../utils/http.js";
import { hitRateLimit } from "../utils/rateLimit.js";

// Each submission sends an email, so cap them per visitor IP to stop
// scripted floods of the inbox and the SMTP quota.
const FORM_RATE_LIMIT = { max: 5, windowSecs: 60 * 60, blockSecs: 60 * 60 };

async function limitSubmissions(kind, event) {
  const rateKey = `${kind}:${getClientIp(event) || "unknown"}`;
  await hitRateLimit(rateKey, FORM_RATE_LIMIT);
}

export async function sendMessage(body, event) {
  const data = validate(contactSchema)(body);
  await limitSubmissions("contact", event);
  const result = await contactService.sendContactMessage(data);
  return jsonResponse(200, result, {}, event);
}

// The confirmation goes to the address typed in, so one address gets at most 3
// a day, however many visitors type it.
const BULK_CONFIRM_LIMIT = { max: 3, windowSecs: 24 * 60 * 60, blockSecs: 24 * 60 * 60 };

async function mayConfirm(email) {
  try {
    await hitRateLimit(`bulk-confirm:${email}`, BULK_CONFIRM_LIMIT);
    return true;
  } catch (err) {
    if (err?.statusCode === 429) return false; // the request still reaches the team
    throw err;
  }
}

export async function sendBulkOrder(body, event) {
  const data = validate(bulkOrderSchema)(body);
  await limitSubmissions("bulk", event);
  const result = await contactService.sendBulkOrderMessage(data, { confirm: await mayConfirm(data.email) });
  return jsonResponse(200, result, {}, event);
}
