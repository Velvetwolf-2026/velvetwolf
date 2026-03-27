import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { loadBackendEnv } from "./config/env.js";
import { sendOTP } from "./config/ses.js";
import { supabaseAdmin } from "./config/supabase.js";
import { ApiError, logError, logInfo, logWarn } from "./http.js";

loadBackendEnv();

const OTP_EXPIRES_MIN = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_MAX = 3;
const RESEND_WINDOW_SECS = 3600;

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function getBackendPublicUrl() {
  return process.env.BACKEND_PUBLIC_URL || "http://localhost:5000";
}

function getGoogleCallbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || `${getBackendPublicUrl().replace(/\/$/, "")}/auth/google/callback`;
}

function authLogContext(context = {}) {
  return { service: "auth", ...context };
}

function createJwt(user) {
  if (!process.env.JWT_SECRET) {
    logError("JWT secret missing while creating token", authLogContext({ userId: user?.id, email: user?.email }));
    throw new ApiError(500, "JWT_SECRET is missing in backend environment.");
  }

  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function checkRateLimit(key, max = RESEND_MAX, windowSecs = RESEND_WINDOW_SECS) {
  logInfo("Checking rate limit", authLogContext({ key, max, windowSecs }));

  const { data: rateLimitRecord, error } = await supabaseAdmin
    .from("rate_limits")
    .select("*")
    .eq("key", key)
    .single();

  if (error && error.code !== "PGRST116") {
    logError("Rate limit lookup failed", authLogContext({ key, error }));
    throw new ApiError(400, error.message);
  }

  if (rateLimitRecord?.blocked_until && new Date(rateLimitRecord.blocked_until) > new Date()) {
    const mins = Math.ceil((new Date(rateLimitRecord.blocked_until) - Date.now()) / 60000);
    logWarn("Rate limit currently blocked", authLogContext({ key, blockedUntil: rateLimitRecord.blocked_until, mins }));
    throw new ApiError(429, `Too many requests. Try again in ${mins} min.`);
  }

  const windowStart = new Date(Date.now() - windowSecs * 1000);
  if (rateLimitRecord && new Date(rateLimitRecord.first_at) < windowStart) {
    logInfo("Rate limit window expired", authLogContext({ key, previousFirstAt: rateLimitRecord.first_at }));
    return;
  }

  if (rateLimitRecord && rateLimitRecord.attempts >= max) {
    const blockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("rate_limits")
      .update({ blocked_until: blockedUntil })
      .eq("key", key);

    logWarn("Rate limit threshold reached", authLogContext({ key, attempts: rateLimitRecord.attempts, max, blockedUntil }));
    throw new ApiError(429, "Rate limited. Try again later.");
  }
}

async function recordRateAttempt(key) {
  logInfo("Recording rate limit attempt", authLogContext({ key }));

  const { error } = await supabaseAdmin.rpc("increment_rate_limit", { p_key: key });
  if (error) {
    logError("Failed to record rate limit attempt", authLogContext({ key, error }));
    throw new ApiError(400, error.message);
  }
}

function createOtpMetadata(type) {
  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000).toISOString();
  return { otp, expiresAt, type };
}

function decodeState(stateRaw) {
  if (!stateRaw) {
    return {};
  }

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
  return Buffer.from(
    JSON.stringify({ mode: safeMode, ts: Date.now() }),
    "utf8"
  ).toString("base64url");
}

async function exchangeGoogleCodeForTokens(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logError("Google OAuth credentials missing", authLogContext({ hasClientId: Boolean(clientId), hasClientSecret: Boolean(clientSecret) }));
    throw new ApiError(500, "Google OAuth credentials are missing.");
  }

  logInfo("Exchanging Google authorization code", authLogContext({ hasCode: Boolean(code), callbackUrl: getGoogleCallbackUrl() }));

  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleCallbackUrl(),
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    logError("Google token exchange failed", authLogContext({ status: tokenRes.status, tokenData }));
    throw new ApiError(401, tokenData.error_description || tokenData.error || "Google token exchange failed.");
  }

  logInfo("Google token exchange succeeded", authLogContext({ status: tokenRes.status, hasAccessToken: Boolean(tokenData.access_token) }));
  return tokenData;
}

async function fetchGoogleProfile(accessToken) {
  logInfo("Fetching Google profile", authLogContext({ hasAccessToken: Boolean(accessToken) }));

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.email) {
    logError("Google profile fetch failed", authLogContext({ status: profileRes.status, profile }));
    throw new ApiError(401, "Unable to fetch Google user profile.");
  }

  logInfo("Google profile fetched", authLogContext({ email: profile.email, googleSubject: profile.sub }));
  return profile;
}

async function upsertGoogleUser(profile) {
  const email = normalizeEmail(profile.email);
  const fallbackName = email.split("@")[0] || "User";
  const name = String(profile.name || fallbackName).trim();

  logInfo("Upserting Google user", authLogContext({ email, name }));

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from("users")
    .select("id, email, name")
    .eq("email", email)
    .single();

  if (existingUserError && existingUserError.code !== "PGRST116") {
    logError("Google user lookup failed", authLogContext({ email, error: existingUserError }));
    throw new ApiError(400, existingUserError.message);
  }

  if (existingUser) {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ name, last_login: new Date().toISOString() })
      .eq("id", existingUser.id);

    if (updateError) {
      logError("Google user update failed", authLogContext({ userId: existingUser.id, email, error: updateError }));
      throw new ApiError(400, updateError.message);
    }

    logInfo("Updated existing Google user", authLogContext({ userId: existingUser.id, email }));
    return {
      id: existingUser.id,
      email: existingUser.email,
      name,
    };
  }

  const googlePasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);

  const { data: insertedRows, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({
      name,
      email,
      password_hash: googlePasswordHash,
      type: "Google",
      last_login: new Date().toISOString(),
    })
    .select("id, email, name")
    .limit(1);

  if (insertError) {
    logError("Google user insert failed", authLogContext({ email, error: insertError }));
    throw new ApiError(400, insertError.message);
  }

  const insertedUser = insertedRows?.[0];
  if (!insertedUser) {
    logError("Google user insert returned no row", authLogContext({ email }));
    throw new ApiError(500, "Google user creation failed.");
  }

  logInfo("Created Google user", authLogContext({ userId: insertedUser.id, email }));
  return insertedUser;
}

export function getGoogleAuthRedirect({ mode } = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    logError("GOOGLE_CLIENT_ID missing when building Google auth redirect", authLogContext({ mode }));
    throw new ApiError(500, "GOOGLE_CLIENT_ID is missing in backend environment.");
  }

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: createState(mode),
  });

  logInfo("Generated Google auth redirect", authLogContext({ mode: mode || "login", callbackUrl: getGoogleCallbackUrl() }));
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function googleCallback({ code, state }) {
  const stateData = decodeState(state);
  const mode = stateData.mode === "signup" ? "signup" : "login";

  logInfo("Processing Google callback", authLogContext({ mode, hasCode: Boolean(code), hasState: Boolean(state) }));

  try {
    if (!code) {
      logWarn("Google callback missing authorization code", authLogContext({ mode }));
      throw new ApiError(400, "Missing Google authorization code.");
    }

    const tokenData = await exchangeGoogleCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokenData.access_token);
    const user = await upsertGoogleUser(profile);
    const token = createJwt(user);

    const redirectQuery = new URLSearchParams({
      token,
      provider: "google",
      mode,
    });

    logInfo("Google callback completed", authLogContext({ mode, userId: user.id, email: user.email }));
    return `${getFrontendUrl().replace(/\/$/, "")}?${redirectQuery.toString()}`;
  } catch (error) {
    logError("Google callback failed", authLogContext({ mode, hasCode: Boolean(code), error }));
    throw error;
  }
}

export async function signup({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  logInfo("Signup requested", authLogContext({ email: normalizedEmail, hasName: Boolean(name), hasPassword: Boolean(password) }));

  try {
    await checkRateLimit(`signup:${normalizedEmail}`);

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingUserError && existingUserError.code !== "PGRST116") {
      logError("Signup user lookup failed", authLogContext({ email: normalizedEmail, error: existingUserError }));
      throw new ApiError(400, existingUserError.message);
    }

    if (existingUser) {
      logWarn("Signup attempted for existing user", authLogContext({ email: normalizedEmail, userId: existingUser.id }));
      throw new ApiError(409, "Account with this email already exists. Please login or use a different email.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { otp, expiresAt, type } = createOtpMetadata("Signup-OTP");

    const { error: userInsertError } = await supabaseAdmin.from("users").insert({
      name: String(name || "").trim(),
      email: normalizedEmail,
      password_hash: hashedPassword,
      type: "Signup",
    });

    if (userInsertError) {
      logError("Signup user insert failed", authLogContext({ email: normalizedEmail, error: userInsertError }));
      throw new ApiError(400, userInsertError.message);
    }

    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({
      email: normalizedEmail,
      otp,
      expires_at: expiresAt,
      type,
    });

    if (otpInsertError) {
      logError("Signup OTP insert failed", authLogContext({ email: normalizedEmail, type, expiresAt, error: otpInsertError }));
      throw new ApiError(400, otpInsertError.message);
    }

    await sendOTP(normalizedEmail, otp);
    logInfo("Signup OTP sent", authLogContext({ email: normalizedEmail, type, expiresAt }));

    await recordRateAttempt(`signup:${normalizedEmail}`);

    logInfo("Signup completed", authLogContext({ email: normalizedEmail }));
    return { message: "OTP sent" };
  } catch (error) {
    logError("Signup failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  logInfo("Login requested", authLogContext({ email: normalizedEmail, hasPassword: Boolean(password) }));

  try {
    await checkRateLimit(`login:${normalizedEmail}`, 5, 900);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, password_hash, last_login")
      .eq("email", normalizedEmail)
      .single();

    if (userError && userError.code !== "PGRST116") {
      logError("Login user lookup failed", authLogContext({ email: normalizedEmail, error: userError }));
      throw new ApiError(400, userError.message);
    }

    if (!user) {
      await recordRateAttempt(`login:${normalizedEmail}`);
      logWarn("Login attempted for missing user", authLogContext({ email: normalizedEmail }));
      throw new ApiError(401, "User not registered. Please complete registration.");
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await recordRateAttempt(`login:${normalizedEmail}`);
      logWarn("Login password mismatch", authLogContext({ email: normalizedEmail, userId: user.id }));
      throw new ApiError(401, "Incorrect email or password");
    }

    const { otp, expiresAt, type } = createOtpMetadata("Login-OTP");

    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({
      email: normalizedEmail,
      otp,
      expires_at: expiresAt,
      type,
    });

    if (otpInsertError) {
      logError("Login OTP insert failed", authLogContext({ email: normalizedEmail, type, expiresAt, error: otpInsertError }));
      throw new ApiError(400, otpInsertError.message);
    }

    await sendOTP(normalizedEmail, otp);
    logInfo("Login OTP sent", authLogContext({ email: normalizedEmail, userId: user.id, expiresAt }));

    return {
      success: true,
      requiresOtp: true,
      message: "OTP sent",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    logError("Login failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function resendOtp({ email }) {
  const normalizedEmail = normalizeEmail(email);

  logInfo("Resend OTP requested", authLogContext({ email: normalizedEmail }));

  try {
    await checkRateLimit(`resend:${normalizedEmail}`);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (userError || !user) {
      logWarn("Resend OTP requested for missing user", authLogContext({ email: normalizedEmail, error: userError }));
      throw new ApiError(404, "User not registered. Please complete registration first.");
    }

    const { otp, expiresAt, type } = createOtpMetadata("Resend-OTP");

    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({
      email: normalizedEmail,
      otp,
      expires_at: expiresAt,
      type,
    });

    if (otpInsertError) {
      logError("Resend OTP insert failed", authLogContext({ email: normalizedEmail, type, expiresAt, error: otpInsertError }));
      throw new ApiError(400, otpInsertError.message);
    }

    await sendOTP(normalizedEmail, otp);
    await recordRateAttempt(`resend:${normalizedEmail}`);

    logInfo("Resend OTP completed", authLogContext({ email: normalizedEmail, userId: user.id, expiresAt }));
    return { message: "New OTP sent" };
  } catch (error) {
    logError("Resend OTP failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function forgotPassword({ email }) {
  const normalizedEmail = normalizeEmail(email);

  logInfo("Forgot password requested", authLogContext({ email: normalizedEmail }));

  try {
    await checkRateLimit(`forgot:${normalizedEmail}`);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (userError || !user) {
      logWarn("Forgot password requested for missing user", authLogContext({ email: normalizedEmail, error: userError }));
      throw new ApiError(404, "User not registered. Please complete the registration.");
    }

    const { otp, expiresAt, type } = createOtpMetadata("Forget password-OTP");

    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

    const { error: otpInsertError } = await supabaseAdmin.from("otps").insert({
      email: normalizedEmail,
      otp,
      expires_at: expiresAt,
      type,
    });

    if (otpInsertError) {
      logError("Forgot password OTP insert failed", authLogContext({ email: normalizedEmail, type, expiresAt, error: otpInsertError }));
      throw new ApiError(400, otpInsertError.message);
    }

    await sendOTP(normalizedEmail, otp);
    await recordRateAttempt(`forgot:${normalizedEmail}`);

    logInfo("Forgot password OTP sent", authLogContext({ email: normalizedEmail, userId: user.id, expiresAt }));
    return { message: "Reset OTP sent" };
  } catch (error) {
    logError("Forgot password flow failed", authLogContext({ email: normalizedEmail, error }));
    throw error;
  }
}

export async function verifyOtp({ email, otp, type }) {
  const normalizedEmail = normalizeEmail(email);
  const otpNumber = Number.parseInt(otp, 10);

  logInfo("Verify OTP requested", authLogContext({ email: normalizedEmail, type, hasOtp: Boolean(otp) }));

  try {
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("otps")
      .select("*")
      .eq("email", normalizedEmail)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (otpError || !otpRecord || otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      logWarn("OTP record missing, expired, or exhausted", authLogContext({ email: normalizedEmail, type, error: otpError, attempts: otpRecord?.attempts }));
      throw new ApiError(400, "Invalid or expired OTP");
    }

    if (otpRecord.otp !== otpNumber) {
      await supabaseAdmin
        .from("otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      logWarn("OTP mismatch", authLogContext({ email: normalizedEmail, type, otpId: otpRecord.id, attempts: otpRecord.attempts + 1 }));
      throw new ApiError(400, "Invalid OTP");
    }

    await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .eq("email", normalizedEmail)
      .single();

    if (userError || !user) {
      logError("User lookup failed after OTP verification", authLogContext({ email: normalizedEmail, type, error: userError }));
      throw new ApiError(404, "User not found");
    }

    if (String(type || "").toLowerCase() === "login") {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        logError("Failed to update last_login after OTP verification", authLogContext({ userId: user.id, email: normalizedEmail, error: updateError }));
        throw new ApiError(400, updateError.message);
      }
    }

    logInfo("OTP verified successfully", authLogContext({ userId: user.id, email: normalizedEmail, type }));

    return {
      success: true,
      token: createJwt(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    logError("Verify OTP failed", authLogContext({ email: normalizedEmail, type, error }));
    throw error;
  }
}


