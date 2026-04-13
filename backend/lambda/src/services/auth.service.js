import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loadBackendEnv } from "../config/env.js";
import { normalizeOtpKind } from "../config/otp-template.js";
import { sendOTP } from "../config/ses.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo, logWarn } from "../utils/http.js";

loadBackendEnv();

const OTP_EXPIRES_MIN = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_MAX = 3;
const RESEND_WINDOW_SECS = 3600;

function getLinkSecret() { return `${process.env.JWT_SECRET}:link`; }
function getResetSecret() { return `${process.env.JWT_SECRET}:reset`; }

function createOtpLinkToken(email, otp, type) {
  return jwt.sign({ email, otp, type, purpose: "otp_link" }, getLinkSecret(), { expiresIn: `${OTP_EXPIRES_MIN}m` });
}

function createResetToken(email) {
  return jwt.sign({ email, purpose: "password_reset" }, getResetSecret(), { expiresIn: "15m" });
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

function createJwt(user) {
  if (!process.env.JWT_SECRET) {
    logError("JWT secret missing while creating token", authLogContext({ userId: user?.id }));
    throw new ApiError(500, "JWT_SECRET is missing in backend environment.");
  }
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || "customer" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function checkRateLimit(key, max = RESEND_MAX, windowSecs = RESEND_WINDOW_SECS) {
  logInfo("Checking rate limit", authLogContext({ key, max, windowSecs }));

  const { data: record, error } = await supabaseAdmin.from("rate_limits").select("*").eq("key", key).single();
  if (error && error.code !== "PGRST116") { logError("Rate limit lookup failed", authLogContext({ key, error })); throw new ApiError(400, error.message); }

  if (record?.blocked_until && new Date(record.blocked_until) > new Date()) {
    const mins = Math.ceil((new Date(record.blocked_until) - Date.now()) / 60000);
    logWarn("Rate limit currently blocked", authLogContext({ key, blockedUntil: record.blocked_until, mins }));
    throw new ApiError(429, `Too many requests. Try again in ${mins} min.`);
  }

  const windowStart = new Date(Date.now() - windowSecs * 1000);
  if (record && new Date(record.first_at) < windowStart) return;

  if (record && record.attempts >= max) {
    const blockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabaseAdmin.from("rate_limits").update({ blocked_until: blockedUntil }).eq("key", key);
    logWarn("Rate limit threshold reached", authLogContext({ key, attempts: record.attempts, max, blockedUntil }));
    throw new ApiError(429, "Rate limited. Try again later.");
  }
}

async function recordRateAttempt(key) {
  const { error } = await supabaseAdmin.rpc("increment_rate_limit", { p_key: key });
  if (error) { logError("Failed to record rate limit attempt", authLogContext({ key, error })); throw new ApiError(400, error.message); }
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

function createState(mode = "login") {
  const safeMode = mode === "signup" ? "signup" : "login";
  return Buffer.from(JSON.stringify({ mode: safeMode, ts: Date.now() }), "utf8").toString("base64url");
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
    throw new ApiError(500, "Google OAuth credentials are missing.");
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
    logError("Google token exchange failed", authLogContext({ status: tokenRes.status }));
    throw new ApiError(401, tokenData.error_description || tokenData.error || "Google token exchange failed.");
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
    throw new ApiError(401, "Unable to fetch Google user profile.");
  }
  return profile;
}

async function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  const name = String(profile.name || email.split("@")[0] || "User").trim();

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from("users").select("id, email, name, role").eq("email", email).single();

  if (existingUserError && existingUserError.code !== "PGRST116") throw new ApiError(400, existingUserError.message);

  if (existingUser) {
    await supabaseAdmin.from("users").update({ name, last_login: new Date().toISOString() }).eq("id", existingUser.id);
    return { id: existingUser.id, email: existingUser.email, name, role: existingUser.role || "customer" };
  }

  const googlePasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const { data: insertedRows, error: insertError } = await supabaseAdmin.from("users").insert({
    name, email, password_hash: googlePasswordHash, role: "customer",
    type: "Google", last_login: new Date().toISOString(),
  }).select("id, email, name, role").limit(1);

  if (insertError) { logError("Google user insert failed", authLogContext({ email, error: insertError })); throw new ApiError(400, insertError.message); }
  const insertedUser = insertedRows?.[0];
  if (!insertedUser) throw new ApiError(500, "Google user creation failed.");
  return insertedUser;
}

export function getGoogleAuthRedirect({ mode } = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(500, "GOOGLE_CLIENT_ID is missing in backend environment.");

  const query = new URLSearchParams({
    client_id: clientId, redirect_uri: getGoogleCallbackUrl(),
    response_type: "code", scope: "openid email profile",
    access_type: "offline", prompt: "consent", state: createState(mode),
  });

  logInfo("Generated Google auth redirect", authLogContext({ mode: mode || "login" }));
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function googleCallback({ code, state, error, errorDescription }) {
  const stateData = decodeState(state);
  const mode = stateData.mode === "signup" ? "signup" : "login";

  try {
    if (error) {
      const message = error === "access_denied" ? "Google sign-in was cancelled." : (errorDescription || "Google sign-in could not be completed.");
      return buildGoogleErrorRedirect(mode, message);
    }
    if (!code) return buildGoogleErrorRedirect(mode, "Google sign-in could not be completed.");

    const tokenData = await exchangeGoogleCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokenData.access_token);
    const user = await upsertGoogleUser(profile);
    const token = createJwt(user);

    const redirectQuery = new URLSearchParams({ token, provider: "google", mode });
    logInfo("Google callback completed", authLogContext({ mode, userId: user.id }));
    return `${getFrontendUrl().replace(/\/$/, "")}?${redirectQuery.toString()}`;
  } catch (err) {
    logError("Google callback failed", authLogContext({ mode, error: err }));
    throw err;
  }
}

export async function signup({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  let userCreated = false;

  logInfo("Signup requested", authLogContext({ email: normalizedEmail }));

  try {
    await checkRateLimit(`signup:${normalizedEmail}`);

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users").select("id, is_verified").eq("email", normalizedEmail).single();

    if (existingUserError && existingUserError.code !== "PGRST116") throw new ApiError(400, existingUserError.message);

    if (existingUser) {
      if (existingUser.is_verified) throw new ApiError(409, "Account with this email already exists. Please login or use a different email.");
      logInfo("Cleaning up unverified user before re-signup", authLogContext({ email: normalizedEmail }));
      await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
      await supabaseAdmin.from("users").delete().eq("id", existingUser.id);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { otp, expiresAt, type } = createOtpMetadata("Signup-OTP");

    const { error: userInsertError } = await supabaseAdmin.from("users").insert({
      name: String(name || "").trim(), email: normalizedEmail,
      password_hash: hashedPassword, role: "customer", type: "Signup",
    });
    if (userInsertError) throw new ApiError(400, userInsertError.message);
    userCreated = true;

    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type });
    if (otpInsertError) throw new ApiError(400, otpInsertError.message);

    await sendOTP(normalizedEmail, otp, "signup", buildVerifyUrl(normalizedEmail, otp, "signup"));
    await recordRateAttempt(`signup:${normalizedEmail}`);

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

export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  logInfo("Login requested", authLogContext({ email: normalizedEmail }));

  try {
    await checkRateLimit(`login:${normalizedEmail}`, 5, 900);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users").select("id, email, name, role, password_hash, last_login, is_verified")
      .eq("email", normalizedEmail).single();

    if (userError && userError.code !== "PGRST116") throw new ApiError(400, userError.message);
    if (!user) { await recordRateAttempt(`login:${normalizedEmail}`); throw new ApiError(401, "User not registered. Please complete registration."); }
    if (!user.is_verified) throw new ApiError(403, "Email not verified. Please complete your signup by verifying your email.");

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) { await recordRateAttempt(`login:${normalizedEmail}`); throw new ApiError(401, "Incorrect email or password"); }

    const { otp, expiresAt, type } = createOtpMetadata("Login-OTP");
    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type });
    if (otpInsertError) throw new ApiError(400, otpInsertError.message);

    await sendOTP(normalizedEmail, otp, "login", buildVerifyUrl(normalizedEmail, otp, "login"));
    logInfo("Login OTP sent", authLogContext({ email: normalizedEmail, userId: user.id }));

    return { success: true, requiresOtp: true, message: "OTP sent", user: { id: user.id, email: user.email, name: user.name, role: user.role || "customer" } };
  } catch (error) {
    logError("Login failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function resendOtp({ email, kind, type }) {
  const normalizedEmail = normalizeEmail(email);
  const otpKind = normalizeOtpKind(kind || type);

  try {
    await checkRateLimit(`resend:${normalizedEmail}`);

    const { data: user, error: userError } = await supabaseAdmin.from("users").select("id").eq("email", normalizedEmail).single();
    if (userError || !user) throw new ApiError(404, "User not registered. Please complete registration first.");

    const { otp, expiresAt, type: otpType } = createOtpMetadata(getOtpMetadataType(otpKind));
    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type: otpType });
    if (otpInsertError) throw new ApiError(400, otpInsertError.message);

    await sendOTP(normalizedEmail, otp, otpKind, buildVerifyUrl(normalizedEmail, otp, otpKind));
    await recordRateAttempt(`resend:${normalizedEmail}`);

    logInfo("Resend OTP completed", authLogContext({ email: normalizedEmail, otpKind }));
    return { message: "New OTP sent" };
  } catch (error) {
    logError("Resend OTP failed", authLogContext({ email: normalizedEmail, otpKind, error }));
    throw error;
  }
}

export async function forgotPassword({ email }) {
  const normalizedEmail = normalizeEmail(email);

  try {
    await checkRateLimit(`forgot:${normalizedEmail}`);

    const { data: user, error: userError } = await supabaseAdmin.from("users").select("id").eq("email", normalizedEmail).single();
    if (userError || !user) throw new ApiError(404, "User not registered. Please complete the registration.");

    const { otp, expiresAt, type } = createOtpMetadata("Forget password-OTP");
    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);
    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({ email: normalizedEmail, otp, expires_at: expiresAt, type });
    if (otpInsertError) throw new ApiError(400, otpInsertError.message);

    await sendOTP(normalizedEmail, otp, "forgot", buildVerifyUrl(normalizedEmail, otp, "forgot"));
    await recordRateAttempt(`forgot:${normalizedEmail}`);

    logInfo("Forgot password OTP sent", authLogContext({ email: normalizedEmail }));
    return { message: "Reset OTP sent" };
  } catch (error) {
    logError("Forgot password flow failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function verifyOtp({ email, otp, type }) {
  const normalizedEmail = normalizeEmail(email);
  const otpNumber = Number.parseInt(otp, 10);
  const normalizedType = normalizeOtpKind(type);

  try {
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("otps").select("*").eq("email", normalizedEmail)
      .gte("expires_at", new Date().toISOString()).single();

    if (otpError || !otpRecord || otpRecord.attempts >= MAX_OTP_ATTEMPTS) throw new ApiError(400, "Invalid or expired OTP");

    if (Number(otpRecord.otp) !== otpNumber) {
      await supabaseAdmin.from("otps").update({ attempts: otpRecord.attempts + 1 }).eq("id", otpRecord.id);
      throw new ApiError(400, "Invalid OTP");
    }

    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users").select("id, email, name, role").eq("email", normalizedEmail).single();
    if (userError || !user) throw new ApiError(404, "User not found");

    if (normalizedType === "signup") {
      const { error: updateError } = await supabaseAdmin.from("users").update({ is_verified: true }).eq("id", user.id);
      if (updateError) throw new ApiError(400, updateError.message);
    }

    if (normalizedType === "login") {
      await supabaseAdmin.from("users").update({ last_login: new Date().toISOString() }).eq("id", user.id);
    }

    if (normalizedType === "forgot") {
      const resetToken = createResetToken(normalizedEmail);
      return { success: true, resetToken, message: "OTP verified" };
    }

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
  } catch (err) {
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
  if (Number(otpRecord.otp) !== otpNumber) {
    await supabaseAdmin.from("otps").update({ attempts: otpRecord.attempts + 1 }).eq("id", otpRecord.id);
    throw new ApiError(400, "Invalid verification link.");
  }

  await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

  const frontendUrl = getFrontendUrl().replace(/\/$/, "");
  const normalizedType = normalizeOtpKind(type);

  if (normalizedType === "forgot") {
    const resetToken = createResetToken(normalizedEmail);
    const params = new URLSearchParams({ reset_token: resetToken });
    return { redirect: `${frontendUrl}?${params.toString()}` };
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users").select("id, email, name, role").eq("email", normalizedEmail).single();
  if (userError || !user) throw new ApiError(404, "User not found.");

  if (normalizedType === "login") {
    await supabaseAdmin.from("users").update({ last_login: new Date().toISOString() }).eq("id", user.id);
  }

  const jwtToken = createJwt(user);
  const params = new URLSearchParams({ token: jwtToken, provider: "otp_link", mode: normalizedType });
  return { redirect: `${frontendUrl}?${params.toString()}` };
}

export async function resetPassword({ resetToken, newPassword }) {
  if (!resetToken) throw new ApiError(400, "Missing reset token.");

  let payload;
  try {
    payload = jwt.verify(resetToken, getResetSecret());
  } catch (err) {
    throw new ApiError(400, "Your reset link has expired. Please request a new one.");
  }

  if (payload.purpose !== "password_reset") throw new ApiError(400, "Invalid reset token.");

  const normalizedEmail = normalizeEmail(payload.email);
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const { error } = await supabaseAdmin.from("users").update({ password_hash: hashedPassword }).eq("email", normalizedEmail);
  if (error) { logError("Password reset DB update failed", authLogContext({ email: normalizedEmail, error })); throw new ApiError(400, error.message); }

  logInfo("Password reset successful", authLogContext({ email: normalizedEmail }));
  return { success: true, message: "Password updated successfully." };
}
