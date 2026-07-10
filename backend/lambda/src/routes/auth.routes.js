import * as authController from "../controllers/auth.controller.js";

export async function handleAuthRoutes(method, route, body, query, event) {
  if (method === "POST" && route === "/auth/signup")
    return authController.signup(body, event);

  if (method === "POST" && route === "/auth/login")
    return authController.login(body, event);

  if (method === "POST" && route === "/auth/discover")
    return authController.discover(body, event);

  if (method === "POST" && route === "/auth/firebase-login")
    return authController.firebaseLogin(body, event);

  if (method === "POST" && route === "/auth/verify-otp")
    return authController.verifyOtp(body, event);

  if (method === "POST" && route === "/auth/resend-otp")
    return authController.resendOtp(body, event);

  if (method === "POST" && route === "/auth/forgot-password")
    return authController.forgotPassword(body, event);

  if (method === "POST" && route === "/auth/reset-password")
    return authController.resetPassword(body, event);

  if (method === "GET" && route === "/auth/google")
    return authController.googleRedirect(query, event);

  if (method === "GET" && route === "/auth/google/callback")
    return authController.googleCallback(query, event);

  if (method === "GET" && route === "/auth/verify-otp-link")
    return authController.verifyOtpLink(query, event);

  if (method === "POST" && route === "/auth/logout")
    return authController.logout(body, event);

  if (method === "GET" && route === "/auth/session")
    return authController.getSession(body, event);

  return null;
}
