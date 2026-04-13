import * as authService from "../services/auth.service.js";
import {
  signupSchema, loginSchema, verifyOtpSchema,
  resendOtpSchema, forgotPasswordSchema, resetPasswordSchema,
} from "../schemas/auth.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse, redirectResponse } from "../utils/http.js";
import { auditLog } from "../utils/audit.js";

export async function signup(body, event) {
  const data = validate(signupSchema)(body);
  const result = await authService.signup(data);
  await auditLog({ action: "user.signup", resource: "users", meta: { email: data.email } });
  return jsonResponse(200, result, {}, event);
}

export async function login(body, event) {
  const data = validate(loginSchema)(body);
  const result = await authService.login(data);
  return jsonResponse(200, result, {}, event);
}

export async function verifyOtp(body, event) {
  const data = validate(verifyOtpSchema)(body);
  const result = await authService.verifyOtp(data);
  if (result.token) {
    await auditLog({ action: "user.login", resource: "users", meta: { email: data.email, type: data.type } });
  }
  return jsonResponse(200, result, {}, event);
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
  const location = await authService.googleCallback({
    code: query.code,
    state: query.state,
    error: query.error,
    errorDescription: query.error_description,
  });
  return redirectResponse(location, 302, {}, event);
}

export async function verifyOtpLink(query, event) {
  const result = await authService.verifyOtpLink(query.t);
  return redirectResponse(result.redirect, 302, {}, event);
}
