import * as contactController from "../controllers/contact.controller.js";

export async function handleContactRoutes(method, route, body, query, event) {
  if (method === "POST" && route === "/contact/send")
    return contactController.sendMessage(body, event);

  if (method === "POST" && route === "/bulk/send")
    return contactController.sendBulkOrder(body, event);

  return null;
}
