import * as sesController from "../controllers/ses.controller.js";

export async function handleSesRoutes(method, route, body, query, event) {
  // SNS delivers bounce/complaint notifications here.
  // Must be reachable without auth — SNS does not send credentials.
  if (method === "POST" && route.endsWith("/ses/notification")) {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : (event.body || "");
    return sesController.handleSnsNotification(rawBody, event);
  }

  return null;
}
