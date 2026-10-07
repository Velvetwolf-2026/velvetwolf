import * as authService from "../services/auth.service.js";
import {
  signupSchema, loginSchema, verifyOtpSchema,
  resendOtpSchema, forgotPasswordSchema, resetPasswordSchema,
  firebaseLoginSchema,
} from "../schemas/auth.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse, redirectResponse, ApiError, getClientIp } from "../utils/http.js";
import { auditLog } from "../utils/audit.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyRecaptcha } from "../services/recaptcha.service.js";

export async function signup(body, event) {
  const data = validate(signupSchema)(body);
  
  const isHuman = await verifyRecaptcha(data.recaptchaToken);
  if (!isHuman) {
    throw new ApiError(400, "reCAPTCHA verification failed. Please try again.");
  }

  const result = await authService.signup(data, getClientIp(event));
  await auditLog({ action: "user.signup", resource: "users", meta: { email: data.email } });
  return jsonResponse(200, result, {}, event);
}

export async function login(body, event) {
  const data = validate(loginSchema)(body);

  const isHuman = await verifyRecaptcha(data.recaptchaToken);
  if (!isHuman) {
    throw new ApiError(400, "reCAPTCHA verification failed. Please try again.");
  }

  const result = await authService.login(data, getClientIp(event));
  return authService.buildSessionResponse(result, event);
}

export async function verifyOtp(body, event) {
  const data = validate(verifyOtpSchema)(body);
  const result = await authService.verifyOtp(data);
  if (result.token) {
    await auditLog({ action: "user.login", resource: "users", meta: { email: data.email, type: data.type } });
  }
  return authService.buildSessionResponse(result, event);
}

export async function resendOtp(body, event) {
  const data = validate(resendOtpSchema)(body);
  const result = await authService.resendOtp(data, getClientIp(event));
  return jsonResponse(200, result, {}, event);
}

export async function forgotPassword(body, event) {
  const data = validate(forgotPasswordSchema)(body);
  const result = await authService.forgotPassword(data, getClientIp(event));
  return jsonResponse(200, result, {}, event);
}

export async function resetPassword(body, event) {
  const data = validate(resetPasswordSchema)(body);
  const result = await authService.resetPassword(data);
  return jsonResponse(200, result, {}, event);
}

export function googleRedirect(query, event) {
  const location = authService.getGoogleAuthRedirect({ mode: query.mode });
  return redirectResponse(location, 302, {}, event);
}

export async function googleCallback(query, event) {
  try {
    const result = await authService.googleCallback({
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
    });
    const headers = result.token ? { "Set-Cookie": authService.getSessionCookieHeaders(result.token) } : {};
    return redirectResponse(result.redirect, 302, headers, event);
  } catch (err) {
    const mode = (query.state && String(query.state).includes("signup")) ? "signup" : "login";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl.replace(/\/$/, "")}?provider=google&mode=${mode}&auth_error=${encodeURIComponent(err.message)}`;
    return redirectResponse(redirectUrl, 302, {}, event);
  }
}

export async function verifyOtpLink(query, event) {
  const result = await authService.verifyOtpLink(query.t);
  const headers = result.token ? { "Set-Cookie": authService.getSessionCookieHeaders(result.token) } : {};
  return redirectResponse(result.redirect, 302, headers, event);
}

export async function discover(body, event) {
  const { email } = body;
  if (!email) {
    return jsonResponse(400, { error: "Email/identifier is required" }, {}, event);
  }
  const result = await authService.discoverUser({ email });
  return jsonResponse(200, result, {}, event);
}

export async function firebaseLogin(body, event) {
  const data = validate(firebaseLoginSchema)(body);
  const result = await authService.firebaseLogin(data, getClientIp(event));
  await auditLog({ action: "user.login", resource: "users", meta: { phone: data.phone, type: "Mobile" } });
  return authService.buildSessionResponse(result, event);
}

export async function logout(body, event) {
  const headers = {
    "Set-Cookie": [
      authService.getLogoutCookieHeader(),
      authService.getLogoutCsrfCookieHeader()
    ],
  };
  return jsonResponse(200, { success: true, message: "Logged out successfully." }, headers, event);
}

export async function getSession(body, event) {
  try {
    const user = await requireAuth(event);
    // Refresh the CSRF cookie; the JWT itself is never echoed back (it stays
    // in the HttpOnly cookie).
    const headers = {
      "Set-Cookie": authService.getCsrfCookieHeader(authService.generateCsrfToken())
    };
    return jsonResponse(200, { authenticated: true, user }, headers, event);
  } catch {
    return jsonResponse(200, { authenticated: false, user: null }, {}, event);
  }
}

