import * as profileController from "../controllers/profile.controller.js";

export async function handleProfileRoutes(method, route, body, query, event) {
  if (method === "GET" && route === "/profile")
    return profileController.getProfile(query, event);

  if (method === "GET" && route === "/profile/orders")
    return profileController.getUserOrders(query, event);

  if (method === "POST" && route === "/profile/update")
    return profileController.updateProfile(body, event);

  if (method === "POST" && route === "/profile/email/send-otp")
    return profileController.sendEmailOtp(body, event);

  if (method === "POST" && route === "/profile/email/verify-otp")
    return profileController.verifyEmailOtp(body, event);

  if (method === "POST" && route === "/user/style-profile")
    return profileController.saveStyleProfile(body, event);

  if (method === "GET" && route === "/user/style-profile")
    return profileController.getStyleProfile(query, event);

  if (method === "DELETE" && route === "/user/style-profile")
    return profileController.clearStyleProfile(body, event);

  return null;
}
