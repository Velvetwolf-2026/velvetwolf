import * as authService from "../services/auth.service.js";
import {
  signupSchema, loginSchema, verifyOtpSchema,
  resendOtpSchema,
  firebaseLoginSchema,
} from "../schemas/auth.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse, redirectResponse, ApiError, getClientIp, getCookie, logError } from "../utils/http.js";
import { auditLog } from "../utils/audit.js";
import { requireAuth, getSessionToken } from "../middleware/auth.js";
import { endSession } from "../services/session.service.js";
import { getProfileById } from "../services/profile.service.js";
import { verifyRecaptcha } from "../services/recaptcha.service.js";
import { assertNotRateLimited, recordRateLimitedAttempt } from "../utils/rateLimit.js";

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
  const result = await authService.verifyOtp(data, getClientIp(event));
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

export function googleRedirect(query, event) {
  const nonce = authService.generateCsrfToken();
  const location = authService.getGoogleAuthRedirect({ mode: query.mode, nonce });
  return redirectResponse(location, 302, { "Set-Cookie": authService.getOAuthStateCookieHeader(nonce) }, event);
}

export async function googleCallback(query, event) {
  try {
    const result = await authService.googleCallback({
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
      stateNonce: getCookie(event, authService.OAUTH_STATE_COOKIE),
    });
    const cookies = [authService.getClearOAuthStateCookieHeader(), ...(result.token ? authService.getSessionCookieHeaders(result.token) : [])];
    return redirectResponse(result.redirect, 302, { "Set-Cookie": cookies }, event);
  } catch (err) {
    // Only our own messages reach the page; anything unexpected (a network
    // failure talking to Google) is logged and shown as a plain sentence.
    if (!(err instanceof ApiError)) logError("Google callback failed unexpectedly", { service: "auth", error: err });
    const message = err instanceof ApiError ? err.message : "Google sign-in could not be completed.";
    const mode = (query.state && String(query.state).includes("signup")) ? "signup" : "login";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl.replace(/\/$/, "")}?provider=google&mode=${mode}&auth_error=${encodeURIComponent(message)}`;
    return redirectResponse(redirectUrl, 302, { "Set-Cookie": authService.getClearOAuthStateCookieHeader() }, event);
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
  // Every lookup counts: 30 per IP per 15 minutes is plenty for real
  // sign-ins and stops scripted checks of which emails have accounts.
  const rateKey = `discover:${getClientIp(event) || "unknown"}`;
  await assertNotRateLimited(rateKey, { max: 30, windowSecs: 15 * 60, blockSecs: 15 * 60 });
  await recordRateLimitedAttempt(rateKey);

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
  // End the session on the server as well, so the token stops working even
  // where a copy of it survives.
  const token = getSessionToken(event);
  if (token) await endSession(token);
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
    const session = await requireAuth(event);
    // The token only carries id, email, name and role; the page also needs the
    // saved name and mobile number (Settings shows them after a reload).
    let user = session;
    try {
      const profile = await getProfileById(session.id);
      if (profile) {
        user = {
          ...session,
          email: profile.email || session.email,
          name: profile.name || session.name,
          full_name: profile.full_name || null,
          phone: profile.phone || null,
        };
      }
    } catch {
      // the profile is extra; the session itself is valid
    }
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

