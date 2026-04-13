import * as authController from "../controllers/auth.controller.js";

export async function handleAuthRoutes(method, route, body, query, event) {
  if (method === "POST" && route === "/auth/signup")
    return authController.signup(body, event);

  if (method === "POST" && route === "/auth/login")
    return authController.login(body, event);

  if (method === "POST" && route === "/auth/verify-otp")
    return authController.verifyOtp(body, event);

  if (method === "POST" && route === "/auth/resend-otp")
    return authController.resendOtp(body, event);

  if (method === "POST" && route === "/auth/forgot-password")
    return authController.forgotPassword(body, event);

  if (method === "POST" && route === "/auth/reset-password")
    return authController.resetPassword(body, event);

  if (method === "GET" && route.endsWith("/auth/google"))
    return authController.googleRedirect(query, event);

  if (method === "GET" && route.endsWith("/auth/google/callback"))
    return authController.googleCallback(query, event);

  if (method === "GET" && route.endsWith("/auth/verify-otp-link"))
    return authController.verifyOtpLink(query, event);

  return null;
}
