import * as contactController from "../controllers/contact.controller.js";

export async function handleContactRoutes(method, route, body, query, event) {
  if (method === "POST" && route.endsWith("/contact/send"))
    return contactController.sendMessage(body, event);

  return null;
}
