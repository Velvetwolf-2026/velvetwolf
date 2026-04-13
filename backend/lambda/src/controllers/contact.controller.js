import * as contactService from "../services/contact.service.js";
import { contactSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse } from "../utils/http.js";

export async function sendMessage(body, event) {
  const data = validate(contactSchema)(body);
  const result = await contactService.sendContactMessage(data);
  return jsonResponse(200, result, {}, event);
}
