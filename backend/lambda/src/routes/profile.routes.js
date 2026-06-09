import * as profileController from "../controllers/profile.controller.js";

export async function handleProfileRoutes(method, route, body, query, event) {
  if (method === "GET" && route.endsWith("/profile"))
    return profileController.getProfile(query, event);

  if (method === "POST" && route.endsWith("/profile/update"))
    return profileController.updateProfile(body, event);

  if (method === "POST" && route.endsWith("/profile/email/send-otp"))
    return profileController.sendEmailOtp(body, event);

  if (method === "POST" && route.endsWith("/profile/email/verify-otp"))
    return profileController.verifyEmailOtp(body, event);

  return null;
}
