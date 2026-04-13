import * as profileController from "../controllers/profile.controller.js";

export async function handleProfileRoutes(method, route, body, query, event) {
  if (method === "GET" && route.endsWith("/profile"))
    return profileController.getProfile(query, event);

  return null;
}
