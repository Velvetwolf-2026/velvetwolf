import * as authService from "../services/auth.service.js";
import {
  signupSchema, loginSchema, verifyOtpSchema,
  resendOtpSchema, forgotPasswordSchema, resetPasswordSchema,
  firebaseLoginSchema,
} from "../schemas/auth.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse, redirectResponse } from "../utils/http.js";
import { auditLog } from "../utils/audit.js";
import { requireAuth } from "../middleware/auth.js";

export async function signup(body, event) {
  const data = validate(signupSchema)(body);
  const result = await authService.signup(data);
  await auditLog({ action: "user.signup", resource: "users", meta: { email: data.email } });
  return jsonResponse(200, result, {}, event);
}

export async function login(body, event) {
  const data = validate(loginSchema)(body);
  const result = await authService.login(data);
  const headers = {};
  if (result.token) {
    headers["Set-Cookie"] = authService.getAuthCookieHeader(result.token);
    delete result.token;
  }
  return jsonResponse(200, result, headers, event);
}

export async function verifyOtp(body, event) {
  const data = validate(verifyOtpSchema)(body);
  const result = await authService.verifyOtp(data);
  const headers = {};
  if (result.token) {
    await auditLog({ action: "user.login", resource: "users", meta: { email: data.email, type: data.type } });
    headers["Set-Cookie"] = authService.getAuthCookieHeader(result.token);
    delete result.token;
  }
  return jsonResponse(200, result, headers, event);
}

export async function resendOtp(body, event) {
  const data = validate(resendOtpSchema)(body);
  const result = await authService.resendOtp(data);
  return jsonResponse(200, result, {}, event);
}

export async function forgotPassword(body, event) {
  const data = validate(forgotPasswordSchema)(body);
  const result = await authService.forgotPassword(data);
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
  const result = await authService.googleCallback({
    code: query.code,
    state: query.state,
    error: query.error,
    errorDescription: query.error_description,
  });
  const headers = {};
  if (result.token) {
    headers["Set-Cookie"] = authService.getAuthCookieHeader(result.token);
  }
  return redirectResponse(result.redirect, 302, headers, event);
}

export async function verifyOtpLink(query, event) {
  const result = await authService.verifyOtpLink(query.t);
  const headers = {};
  if (result.token) {
    headers["Set-Cookie"] = authService.getAuthCookieHeader(result.token);
  }
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
  const result = await authService.firebaseLogin(data);
  const headers = {};
  if (result.token) {
    headers["Set-Cookie"] = authService.getAuthCookieHeader(result.token);
    delete result.token;
  }
  await auditLog({ action: "user.login", resource: "users", meta: { phone: data.phone, type: "Mobile" } });
  return jsonResponse(200, result, headers, event);
}

export async function logout(body, event) {
  const headers = {
    "Set-Cookie": authService.getLogoutCookieHeader(),
  };
  return jsonResponse(200, { success: true, message: "Logged out successfully." }, headers, event);
}

export async function getSession(body, event) {
  try {
    const user = requireAuth(event);
    return jsonResponse(200, { authenticated: true, user }, {}, event);
  } catch (err) {
    return jsonResponse(200, { authenticated: false, user: null }, {}, event);
  }
}

