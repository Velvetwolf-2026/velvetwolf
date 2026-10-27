import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loadBackendEnv, isLocalDevelopment } from "../config/env.js";
import { normalizeOtpKind } from "../config/otp-template.js";
import { sendOTP } from "../config/smtp.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, dbFailure, jsonResponse, logError, logInfo, logWarn, TRY_AGAIN } from "../utils/http.js";
import { findUserByVerifiedPhone, mobileEmail } from "./phone.service.js";
import { claimOtpTry, MAX_OTP_ATTEMPTS } from "./otp-attempts.js";
import { assertNotRateLimited, hitRateLimit, recordRateLimitedAttempt } from "../utils/rateLimit.js";

loadBackendEnv();

const OTP_EXPIRES_MIN = 10;
const RESEND_MAX = 3;
const RESEND_WINDOW_SECS = 3600;
const RATE_LIMIT_BLOCK_SECS = 1800;

// Coarser per-IP caps layered on top of the per-identifier ones above — these
// catch an attacker rotating through many different emails/phones from one
// source, which a purely per-identifier limit never trips.
const IP_LOGIN_MAX = 30;
const IP_LOGIN_WINDOW_SECS = 900;
const IP_SIGNUP_MAX = 15;
const IP_OTP_MAX = 15;
const IP_WINDOW_SECS = 3600;
// Wrong codes entered from one IP (right ones don't count, so customers
// sharing a mobile network's IP aren't locked out by each other's sign-ins).
const IP_VERIFY_MAX = 30;

function getLinkSecret() { return `${process.env.JWT_SECRET}:link`; }

function createOtpLinkToken(email, otp, type) {
  return jwt.sign({ email, otp, type, purpose: "otp_link" }, getLinkSecret(), { expiresIn: `${OTP_EXPIRES_MIN}m` });
}


function buildVerifyUrl(email, otp, type) {
  const backendUrl = (process.env.BACKEND_PUBLIC_URL || "http://localhost:5000").replace(/\/$/, "");
  const token = createOtpLinkToken(email, otp, type);
  return `${backendUrl}/auth/verify-otp-link?t=${encodeURIComponent(token)}`;
}

function normalizeEmail(email) { return String(email || "").toLowerCase().trim(); }
function getFrontendUrl() { return process.env.FRONTEND_URL || "http://localhost:5173"; }
function getBackendPublicUrl() { return process.env.BACKEND_PUBLIC_URL || "http://localhost:5000"; }
function getGoogleCallbackUrl() { return process.env.GOOGLE_CALLBACK_URL || `${getBackendPublicUrl().replace(/\/$/, "")}/auth/google/callback`; }
function authLogContext(context = {}) { return { service: "auth", ...context }; }

export function createJwt(user) {
  if (!process.env.JWT_SECRET) {
    logError("JWT secret missing while creating token", authLogContext({ userId: user?.id }));
    throw new ApiError(500, TRY_AGAIN);
  }
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || "customer" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function getAuthCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`;
}

export function getLogoutCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function getCsrfCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  // Non-HttpOnly so client-side JavaScript can read it
  return `csrf_token=${token}; Path=/; SameSite=Lax; Max-Age=604800${secure}`;
}

export function getLogoutCsrfCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `csrf_token=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Set-Cookie values that establish a browser session: the HttpOnly JWT plus a
// fresh JS-readable CSRF token for the double-submit check in requireAuth.
export function getSessionCookieHeaders(token) {
  return [getAuthCookieHeader(token), getCsrfCookieHeader(generateCsrfToken())];
}

// JSON response for an endpoint that may sign the user in. The JWT goes only
// into the HttpOnly cookie — never the response body, where page scripts
// (including injected ones) could read it. `authenticated: true` tells the
// frontend a session was created.
export function buildSessionResponse(result, event) {
  if (!result?.token) return jsonResponse(200, result, {}, event);
  const { token, ...body } = result;
  return jsonResponse(200, { ...body, authenticated: true }, { "Set-Cookie": getSessionCookieHeaders(token) }, event);
}


// Sign-in limits fail closed: if the rate-limit store errors, the request is
// refused rather than let through unlimited.
const AUTH_LIMIT_OPTIONS = { failOpen: false, verb: "requests" };

// Counts this request and refuses it past the limit, in one step.
function hitLimit(key, max = RESEND_MAX, windowSecs = RESEND_WINDOW_SECS) {
  return hitRateLimit(key, { max, windowSecs, blockSecs: RATE_LIMIT_BLOCK_SECS }, AUTH_LIMIT_OPTIONS);
}

// For limits that count only failures (wrong codes): check first, record a failure later.
function checkRateLimit(key, max, windowSecs) {
  return assertNotRateLimited(key, { max, windowSecs, blockSecs: RATE_LIMIT_BLOCK_SECS }, AUTH_LIMIT_OPTIONS);
}

function recordRateAttempt(key) {
  return recordRateLimitedAttempt(key, AUTH_LIMIT_OPTIONS);
}

function createOtpMetadata(type) {
  const otp = crypto.randomInt(100000, 1000000);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000).toISOString();
  return { otp, expiresAt, type };
}

function getOtpMetadataType(kind) {
  if (kind === "signup") return "Signup-OTP";
  if (kind === "forgot") return "Forget password-OTP";
  return "Login-OTP";
}

function decodeState(stateRaw) {
  if (!stateRaw) return {};
  try {
    const text = Buffer.from(String(stateRaw), "base64url").toString("utf8");
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    logWarn("Failed to decode Google OAuth state", authLogContext({ error }));
    return {};
  }
}

function createState(mode = "login", nonce = "") {
  const safeMode = mode === "signup" ? "signup" : "login";
  return Buffer.from(JSON.stringify({ mode: safeMode, ts: Date.now(), nonce }), "utf8").toString("base64url");
}

// Google sign-in is tied to the browser that started it: /auth/google puts a
// random nonce in both the state sent to Google and an HttpOnly cookie, and the
// callback only signs in when they match. Without it, someone could send a
// visitor a callback link carrying their own Google code and sign the visitor
// into the sender's account (anything saved there, like an address, is the
// sender's to read).
export const OAUTH_STATE_COOKIE = "vw_oauth_state";

export function getOAuthStateCookieHeader(nonce) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${OAUTH_STATE_COOKIE}=${nonce}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${secure}`;
}

export function getClearOAuthStateCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${OAUTH_STATE_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

function nonceMatches(fromState, fromCookie) {
  if (typeof fromState !== "string" || !fromState || !fromCookie) return false;
  const a = Buffer.from(fromState);
  const b = Buffer.from(String(fromCookie));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function buildGoogleErrorRedirect(mode, message) {
  const redirectQuery = new URLSearchParams({ provider: "google", mode, auth_error: message });
  return `${getFrontendUrl().replace(/\/$/, "")}?${redirectQuery.toString()}`;
}

async function exchangeGoogleCodeForTokens(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logError("Google OAuth credentials missing", authLogContext({ hasClientId: Boolean(clientId) }));
    throw new ApiError(500, "Google sign-in isn't available right now. Please sign in with your email.");
  }

  const tokenParams = new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: getGoogleCallbackUrl(), grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    logError("Google token exchange failed", authLogContext({ status: tokenRes.status, error: tokenData.error, errorDescription: tokenData.error_description }));
    throw new ApiError(401, "Google sign-in could not be completed.");
  }
  return tokenData;
}

async function fetchGoogleProfile(accessToken) {
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.email) {
    logError("Google profile fetch failed", authLogContext({ status: profileRes.status }));
    throw new ApiError(401, "Google sign-in could not be completed.");
  }
  // Google sign-in opens the account with this email, so the email must be
  // one Google has verified (the Firebase sign-in checks the same).
  if (profile.email_verified !== true) {
    logWarn("Rejected Google sign-in with unverified email", authLogContext({ email: profile.email }));
    throw new ApiError(401, "Please verify your email address before signing in.");
  }
  return profile;
}

async function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  const name = String(profile.name || email.split("@")[0] || "User").trim();

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from("users").select("id, email, name, role, type").eq("email", email).maybeSingle();

  if (existingUserError) throw dbFailure(400, existingUserError, "We couldn't sign you in right now.");

  if (existingUser) {
    // Google has verified this email, so it signs in the existing account
    // whichever way it was created. Keep the name of an email-created account.
    const keepName = existingUser.type === "Signup" ? existingUser.name : name;
    await supabaseAdmin.from("users").update({ name: keepName, is_verified: true, last_login: new Date().toISOString() }).eq("id", existingUser.id);
    return { id: existingUser.id, email: existingUser.email, name: keepName, role: existingUser.role || "customer" };
  }

  const googlePasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const { data: insertedRows, error: insertError } = await supabaseAdmin.from("users").insert({
    name, email, password_hash: googlePasswordHash, role: "customer",
    type: "Google", last_login: new Date().toISOString(),
  }).select("id, email, name, role").limit(1);

  if (insertError) { logError("Google user insert failed", authLogContext({ email, error: insertError })); throw dbFailure(400, insertError, "We couldn't sign you in right now."); }
  const insertedUser = insertedRows?.[0];
  if (!insertedUser) throw new ApiError(500, "Google user creation failed.");
  return insertedUser;
}

export function getGoogleAuthRedirect({ mode, nonce } = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    logError("GOOGLE_CLIENT_ID missing", authLogContext());
    throw new ApiError(500, "Google sign-in isn't available right now. Please sign in with your email.");
  }

  const query = new URLSearchParams({
    client_id: clientId, redirect_uri: getGoogleCallbackUrl(),
    response_type: "code", scope: "openid email profile",
    access_type: "offline", prompt: "consent", state: createState(mode, nonce),
  });

  logInfo("Generated Google auth redirect", authLogContext({ mode: mode || "login" }));
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function googleCallback({ code, state, error, errorDescription, stateNonce }) {
  const stateData = decodeState(state);
  const mode = stateData.mode === "signup" ? "signup" : "login";

  try {
    if (error) {
      // Google's own error text arrives in the link, so anyone could write it:
      // the page shows one of these instead.
      if (errorDescription) logWarn("Google sign-in returned an error", authLogContext({ error, errorDescription: String(errorDescription).slice(0, 200) }));
      const message = error === "access_denied" ? "Google sign-in was cancelled." : "Google sign-in could not be completed.";
      return { redirect: buildGoogleErrorRedirect(mode, message) };
    }
    if (!code || !nonceMatches(stateData.nonce, stateNonce)) {
      if (code) logWarn("Google callback without this browser's sign-in nonce", authLogContext({ mode, hasCookie: Boolean(stateNonce) }));
      return { redirect: buildGoogleErrorRedirect(mode, "Google sign-in could not be completed.") };
    }

    const tokenData = await exchangeGoogleCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokenData.access_token);
    const user = await upsertGoogleUser(profile);
    const token = createJwt(user);

    logInfo("Google callback completed", authLogContext({ mode, userId: user.id }));
    return {
      token,
      redirect: `${getFrontendUrl().replace(/\/$/, "")}?provider=google&mode=${mode}`
    };
  } catch (err) {
    logError("Google callback failed", authLogContext({ mode, error: err }));
    throw err;
  }
}


export async function signup({ name, email }, ip) {
  const normalizedEmail = normalizeEmail(email);
  let userCreated = false;

  logInfo("Signup requested", authLogContext({ email: normalizedEmail }));

  try {
    await hitLimit(`signup:${normalizedEmail}`);
    if (ip) await hitLimit(`ip:signup:${ip}`, IP_SIGNUP_MAX, IP_WINDOW_SECS);

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users").select("id, is_verified").eq("email", normalizedEmail).single();

    if (existingUserError && existingUserError.code !== "PGRST116") throw dbFailure(400, existingUserError, "We couldn't create your account right now.");

    if (existingUser) {
      if (existingUser.is_verified) throw new ApiError(409, "Account with this email already exists. Please login or use a different email.");
      logInfo("Cleaning up unverified user before re-signup", authLogContext({ email: normalizedEmail }));
      await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
      await supabaseAdmin.from("users").delete().eq("id", existingUser.id);
    }

    // No passwords: the column is required, so store the hash of a random value nobody knows.
    const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 10);
    const { otp, expiresAt, type } = createOtpMetadata("Signup-OTP");

    const { error: userInsertError } = await supabaseAdmin.from("users").insert({
      name: String(name || "").trim(), email: normalizedEmail,
      password_hash: hashedPassword, role: "customer", type: "Signup",
    });
    if (userInsertError) throw dbFailure(400, userInsertError, "We couldn't create your account right now.");
    userCreated = true;

    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type });
    if (otpInsertError) throw dbFailure(400, otpInsertError, "We couldn't send your code right now.");

    await sendOTP(normalizedEmail, otp, "signup", buildVerifyUrl(normalizedEmail, otp, "signup"));

    logInfo("Signup completed", authLogContext({ email: normalizedEmail }));
    return { message: "OTP sent" };
  } catch (error) {
    if (userCreated) {
      await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
      await supabaseAdmin.from("users").delete().eq("email", normalizedEmail).eq("type", "Signup");
    }
    logError("Signup failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

// Passwordless sign-in: every login sends a one-time code to the account's
// email (10-minute expiry, 5 wrong tries lock it; see verifyOtp). The code
// proves the person controls the inbox, so it signs in accounts created with
// email, Google or a code alike, and finishes verifying unverified accounts.
// (Phone accounts normally sign in through Firebase phone OTP; this path is
// their fallback when Firebase is unavailable.)
export async function login({ email }, ip) {
  const normalizedEmail = normalizeEmail(email);
  logInfo("Login code requested", authLogContext({ email: normalizedEmail }));

  try {
    // Every code request counts toward the limit (not only failures): sending
    // emails is the cost being limited.
    await hitLimit(`login:${normalizedEmail}`, 5, 900);
    if (ip) await hitLimit(`ip:login:${ip}`, IP_LOGIN_MAX, IP_LOGIN_WINDOW_SECS);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users").select("id, email, name, role, is_verified, type")
      .eq("email", normalizedEmail).single();

    if (userError && userError.code !== "PGRST116") throw dbFailure(400, userError, "We couldn't sign you in right now.");
    if (!user) throw new ApiError(401, "User not registered. Please complete registration.");

    const { otp, expiresAt, type } = createOtpMetadata("Login-OTP");
    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type });
    if (otpInsertError) throw dbFailure(400, otpInsertError, "We couldn't send your code right now.");

    await sendOTP(normalizedEmail, otp, "login", buildVerifyUrl(normalizedEmail, otp, "login"));
    logInfo("Login code sent", authLogContext({ email: normalizedEmail, userId: user.id }));

    // No user details before the code is verified.
    return { success: true, requiresOtp: true, message: "OTP sent" };
  } catch (error) {
    logError("Login failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function resendOtp({ email, kind, type }, ip) {
  const normalizedEmail = normalizeEmail(email);
  const otpKind = normalizeOtpKind(kind || type);

  try {
    await hitLimit(`resend:${normalizedEmail}`);
    if (ip) await hitLimit(`ip:resend:${ip}`, IP_OTP_MAX, IP_WINDOW_SECS);

    const { data: user, error: userError } = await supabaseAdmin.from("users").select("id").eq("email", normalizedEmail).single();
    if (userError || !user) throw new ApiError(404, "User not registered. Please complete registration first.");

    const { otp, expiresAt, type: otpType } = createOtpMetadata(getOtpMetadataType(otpKind));
    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type: otpType });
    if (otpInsertError) throw dbFailure(400, otpInsertError, "We couldn't send your code right now.");

    await sendOTP(normalizedEmail, otp, otpKind, buildVerifyUrl(normalizedEmail, otp, otpKind));

    logInfo("Resend OTP completed", authLogContext({ email: normalizedEmail, otpKind }));
    return { message: "New OTP sent" };
  } catch (error) {
    logError("Resend OTP failed", authLogContext({ email: normalizedEmail, otpKind, error }));
    throw error;
  }
}

export async function verifyOtp({ email, otp, type }, ip) {
  const normalizedEmail = normalizeEmail(email);
  const otpNumber = Number.parseInt(otp, 10);
  const normalizedType = normalizeOtpKind(type);

  try {
    const bypassEnabled = process.env.NODE_ENV === "development" || process.env.ALLOW_OTP_BYPASS === "true";
    const isBypassOtp = otp === "123456" && bypassEnabled && isLocalDevelopment();

    let otpRecord = null;
    let otpError = null;

    if (!isBypassOtp) {
      const { data, error } = await supabaseAdmin
        .from("otps").select("*").eq("email", normalizedEmail)
        .gte("expires_at", new Date().toISOString()).single();
      otpRecord = data;
      otpError = error;

      if (ip) await checkRateLimit(`ip:verify:${ip}`, IP_VERIFY_MAX, IP_LOGIN_WINDOW_SECS);
      if (otpError || !otpRecord || otpRecord.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(400, "Invalid or expired OTP");
      if (!(await claimOtpTry(otpRecord))) throw new ApiError(400, "Invalid or expired OTP");

      if (Number(otpRecord.otp) !== otpNumber) {
        if (ip) await recordRateAttempt(`ip:verify:${ip}`);
        throw new ApiError(400, "Invalid OTP");
      }

      await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users").select("id, email, name, role").eq("email", normalizedEmail).single();
    if (userError || !user) throw new ApiError(404, "User not found");

    if (normalizedType !== "signup" && normalizedType !== "login") {
      throw new ApiError(400, "Invalid code type.");
    }

    // A correct code proves the person controls this inbox, so it verifies
    // the account whichever way it was started.
    const { error: updateError } = await supabaseAdmin.from("users")
      .update({ is_verified: true, last_login: new Date().toISOString() }).eq("id", user.id);
    if (updateError) throw dbFailure(400, updateError, "We couldn't sign you in right now.");

    return { success: true, token: createJwt(user), user: { id: user.id, email: user.email, name: user.name, role: user.role || "customer" } };
  } catch (error) {
    logError("Verify OTP failed", authLogContext({ email: normalizedEmail, type, error }));
    throw error;
  }
}

export async function verifyOtpLink(token) {
  if (!token) throw new ApiError(400, "Missing verification token.");

  let payload;
  try {
    payload = jwt.verify(token, getLinkSecret());
  } catch {
    throw new ApiError(400, "This verification link has expired or is invalid.");
  }

  if (payload.purpose !== "otp_link") throw new ApiError(400, "Invalid verification link.");

  const { email, otp, type } = payload;
  const normalizedEmail = normalizeEmail(email);
  const otpNumber = Number.parseInt(otp, 10);

  const { data: otpRecord, error: otpError } = await supabaseAdmin
    .from("otps").select("*").eq("email", normalizedEmail)
    .gte("expires_at", new Date().toISOString()).single();

  if (otpError || !otpRecord || otpRecord.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(400, "OTP has expired. Please request a new one.");
  if (!(await claimOtpTry(otpRecord))) throw new ApiError(400, "OTP has expired. Please request a new one.");
  if (Number(otpRecord.otp) !== otpNumber) throw new ApiError(400, "Invalid verification link.");

  await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

  const frontendUrl = getFrontendUrl().replace(/\/$/, "");
  const normalizedType = normalizeOtpKind(type);
  // Links from old password-reset emails just sign the person in now.
  const linkType = normalizedType === "signup" ? "signup" : "login";

  const { data: user, error: userError } = await supabaseAdmin
    .from("users").select("id, email, name, role").eq("email", normalizedEmail).single();
  if (userError || !user) throw new ApiError(404, "User not found.");

  await supabaseAdmin.from("users")
    .update({ is_verified: true, last_login: new Date().toISOString() }).eq("id", user.id);

  const jwtToken = createJwt(user);
  return { token: jwtToken, redirect: `${frontendUrl}?provider=otp_link&mode=${linkType}` };
}

export async function discoverUser({ email }) {
  const normalizedEmail = normalizeEmail(email);
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, email, name, type")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    logError("Discover user query failed", authLogContext({ email, error }));
    throw dbFailure(400, error, "We couldn't sign you in right now.");
  }

  // A mobile number confirmed on an email or Google account signs in to that
  // account (see firebaseLogin), so it exists too.
  const mobile = /^\d{10}@mobile\.velvetwolf\.in$/.test(normalizedEmail) ? normalizedEmail.slice(0, 10) : "";
  const linked = !user && mobile ? await findUserByVerifiedPhone(mobile) : null;

  // Only whether the account exists (the login page needs that to choose
  // password vs sign-up). Name/type would let anyone look up who is behind
  // an email address.
  return { exists: Boolean(user || linked) };
}

export async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
  if (!projectId) {
    logError("VITE_FIREBASE_PROJECT_ID / GOOGLE_PROJECT_ID missing", authLogContext());
    throw new ApiError(500, "Phone sign-in isn't available right now. Please try again later.");
  }

  // 1. Decode token header to get kid
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new ApiError(401, "Your sign-in has expired. Please try again.");
  }

  // 2. Fetch Firebase Auth public certificates
  let publicKeys;
  try {
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    if (!res.ok) throw new Error("Failed to load Firebase public keys.");
    publicKeys = await res.json();
  } catch (err) {
    logError("Failed to fetch Firebase public keys", authLogContext({ error: err }));
    throw new ApiError(502, "We couldn't confirm your sign-in right now. Please try again.");
  }

  const kid = decoded.header.kid;
  const cert = publicKeys[kid];
  if (!cert) {
    throw new ApiError(401, "Your sign-in has expired. Please try again.");
  }

  // 3. Verify signature, audience, and issuer
  try {
    const payload = jwt.verify(idToken, cert, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    return payload;
  } catch (err) {
    logError("Firebase ID token verification failed", authLogContext({ error: err }));
    throw new ApiError(401, "Your sign-in has expired. Please try again.");
  }
}

// A mobile-only account's number is proved by the SMS code it signs in with.
// Best effort: sign-in must not fail over it (e.g. before the migration).
async function markOwnMobileVerified(userId, mobile) {
  const { error } = await supabaseAdmin.from("profiles")
    .upsert({ id: userId, phone: mobile, phone_verified_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) logWarn("Could not mark the sign-in number verified", authLogContext({ userId, code: error.code }));
}

export async function firebaseLogin({ identifier, phone, token }, ip) {
  // Firebase already verifies the token's signature, so this endpoint can't
  // be brute-forced the way a password can, but a flat per-IP cap still guards
  // against hammering it with garbage/replayed tokens. (It used to only check
  // the count without adding to it, so the cap never filled up.)
  if (ip) await hitLimit(`ip:firebase-login:${ip}`, IP_LOGIN_MAX, IP_LOGIN_WINDOW_SECS);

  // 1. Verify the Firebase ID Token
  const payload = await verifyFirebaseIdToken(token);
  
  const isEmail = !!payload.email;
  const isPhone = !!payload.phone_number;

  let finalEmail = "";
  let name = "User";
  let type = "Firebase";
  
  if (isPhone) {
    const verifiedMobile = payload.phone_number.replace(/\D/g, "").slice(-10);
    const providedMobile = (phone || identifier || "").replace(/\D/g, "").slice(-10);
    
    if (providedMobile && verifiedMobile !== providedMobile) {
      throw new ApiError(400, "Phone number verification mismatch.");
    }
    finalEmail = mobileEmail(verifiedMobile);
    name = `Mobile ${verifiedMobile}`;
    type = "Mobile";
  } else if (isEmail) {
    // The token proves the user controls a Firebase account, not that they
    // own its email: with the public web API key anyone can create a Firebase
    // account claiming someone else's address. Only a verified email (always
    // true for Google sign-in) may sign in to the account with that email.
    if (payload.email_verified !== true) {
      logWarn("Rejected Firebase login with unverified email", authLogContext({ email: payload.email, provider: payload.firebase?.sign_in_provider }));
      throw new ApiError(401, "Please verify your email address before signing in.");
    }
    finalEmail = normalizeEmail(payload.email);
    name = payload.name || finalEmail.split("@")[0] || "User";
    type = "Google";
  } else {
    throw new ApiError(400, "We couldn't confirm your sign-in. Please try again.");
  }

  // 2. Discover or upsert the user in users table
  const { data: existingUser, error: lookupError } = await supabaseAdmin
    .from("users").select("id, email, name, role, type").eq("email", finalEmail).maybeSingle();

  if (lookupError) throw dbFailure(400, lookupError, "We couldn't sign you in right now.");

  // Accounts created with an email code sign in here too: the token proves the
  // same verified email (or phone).
  let user = existingUser;

  // A number confirmed on an email or Google account signs in to that account,
  // not a new mobile-only one.
  if (!user && isPhone) {
    user = await findUserByVerifiedPhone(finalEmail.split("@")[0]);
    if (user) logInfo("Phone sign-in linked to its account", authLogContext({ userId: user.id }));
  }

  if (!user) {
    // Sign up new user from Firebase
    const googlePasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const { data: insertedRows, error: insertError } = await supabaseAdmin.from("users").insert({
      name,
      email: finalEmail,
      password_hash: googlePasswordHash,
      role: "customer",
      type,
      last_login: new Date().toISOString(),
      is_verified: true, // Firebase verified it!
    }).select("id, email, name, role").limit(1);

    if (insertError) {
      logError("Firebase user insert failed", authLogContext({ email: finalEmail, error: insertError }));
      throw dbFailure(400, insertError, "We couldn't sign you in right now.");
    }
    user = insertedRows?.[0];
    if (!user) throw new ApiError(500, "We couldn't create your account right now. Please try again.");
    if (isPhone) await markOwnMobileVerified(user.id, finalEmail.split("@")[0]);
  } else {
    // Login existing user: update last login (and finish verifying it)
    await supabaseAdmin.from("users").update({ is_verified: true, last_login: new Date().toISOString() }).eq("id", user.id);
    if (isPhone && user.email === finalEmail) await markOwnMobileVerified(user.id, finalEmail.split("@")[0]);
  }

  // 3. Return custom JWT token
  return {
    success: true,
    token: createJwt(user),
    user: { id: user.id, email: user.email, name: user.name, role: user.role || "customer" }
  };
}
