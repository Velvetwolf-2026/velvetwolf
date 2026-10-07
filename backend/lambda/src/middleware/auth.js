import jwt from "jsonwebtoken";
import { loadBackendEnv } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logWarn } from "../utils/http.js";

loadBackendEnv();

// Postgres "undefined_column": the sessions_valid_after migration hasn't run.
const UNDEFINED_COLUMN = "42703";

/**
 * Checks the token against the user's current DB record:
 * - rejects tokens issued before users.sessions_valid_after (set on password
 *   reset / email change), so stolen or old sessions stop working;
 * - rejects tokens for deleted users;
 * - returns the CURRENT role, so a demoted admin loses access immediately
 *   instead of keeping the role baked into a 7-day token.
 */
async function loadSessionUser(payload, event) {
  let { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, role, sessions_valid_after")
    .eq("id", payload.id)
    .maybeSingle();

  // Before the migration runs, fall back to the columns that exist so
  // deploying this code first doesn't break sign-in.
  if (error?.code === UNDEFINED_COLUMN) {
    ({ data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("id", payload.id)
      .maybeSingle());
  }

  if (error) {
    logError("Session user lookup failed", { service: "auth-middleware", userId: payload.id, error });
    // 503, not 401: a DB blip must not make the frontend sign the user out.
    throw new ApiError(503, "Unable to verify your session right now. Please try again.");
  }
  if (!user) {
    logWarn("Token for a user that no longer exists", { service: "auth-middleware", userId: payload.id, route: event.rawPath || event.path });
    throw new ApiError(401, "Invalid or expired token. Please sign in again.");
  }

  if (user.sessions_valid_after) {
    // JWT iat is in whole seconds; compare at that granularity so a token
    // issued in the same second as the revocation (e.g. the new session after
    // an email change) is still accepted.
    const validAfterSecs = Math.floor(new Date(user.sessions_valid_after).getTime() / 1000);
    if (typeof payload.iat !== "number" || payload.iat < validAfterSecs) {
      logWarn("Revoked session token used", { service: "auth-middleware", userId: payload.id, route: event.rawPath || event.path });
      throw new ApiError(401, "Your session has ended. Please sign in again.");
    }
  }

  return { ...payload, role: user.role || "customer" };
}

/**
 * Verifies the session (cookie or Bearer token), the CSRF double-submit for
 * cookie-only state-changing requests, and that the session hasn't been
 * revoked. Returns the payload { id, email, name, role } with the user's
 * current role. Throws ApiError(401/403) when not authenticated.
 */
export async function requireAuth(event) {
  const payload = verifyRequestToken(event);
  return loadSessionUser(payload, event);
}

/**
 * Extracts and verifies the JWT from the HttpOnly session cookie or an
 * Authorization: Bearer header (signature, expiry and CSRF only — no DB).
 */
function verifyRequestToken(event) {
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
  let cookieToken = "";

  if (cookieHeader) {
    const match = cookieHeader.split(";").find((c) => c.trim().startsWith("token="));
    if (match) {
      cookieToken = match.split("=")[1]?.trim();
    }
  }

  if (!cookieToken && event.cookies && Array.isArray(event.cookies)) {
    const match = event.cookies.find((c) => c.trim().startsWith("token="));
    if (match) {
      cookieToken = match.split("=")[1]?.trim();
    }
  }

  const token = bearerToken || cookieToken;

  if (!token) {
    logWarn("Request missing Authorization header", {
      service: "auth-middleware",
      route: event.rawPath || event.path,
    });
    throw new ApiError(401, "Authentication required.");
  }

  // CSRF token verification is ONLY required when authentication relies EXCLUSIVELY on HttpOnly cookie (no Bearer token provided)
  const usedCookieOnly = !bearerToken && !!cookieToken;

  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  if (usedCookieOnly && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfHeaderToken = event.headers?.["x-csrf-token"] || event.headers?.["X-CSRF-Token"] || "";
    let csrfCookieToken = "";
    if (cookieHeader) {
      const match = cookieHeader.split(";").find((c) => c.trim().startsWith("csrf_token="));
      if (match) {
        csrfCookieToken = match.split("=")[1]?.trim();
      }
    }
    if (!csrfCookieToken && event.cookies && Array.isArray(event.cookies)) {
      const match = event.cookies.find((c) => c.trim().startsWith("csrf_token="));
      if (match) {
        csrfCookieToken = match.split("=")[1]?.trim();
      }
    }

    if (!csrfCookieToken || !csrfHeaderToken || csrfCookieToken !== csrfHeaderToken) {
      logWarn("CSRF token verification failed", {
        service: "auth-middleware",
        route: event.rawPath || event.path,
        hasCookie: !!csrfCookieToken,
        hasHeader: !!csrfHeaderToken,
      });
      throw new ApiError(403, "CSRF verification failed.");
    }
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    logWarn("Invalid or expired JWT", {
      service: "auth-middleware",
      route: event.rawPath || event.path,
      error: err.message,
    });
    throw new ApiError(401, "Invalid or expired token. Please sign in again.");
  }
}

/**
 * For routes that work for both guests and signed-in users (e.g. checkout).
 * Returns the decoded payload when a valid token is present, otherwise null —
 * never throws, so a missing/expired token simply means "guest".
 */
export async function getOptionalAuth(event) {
  try {
    return await requireAuth(event);
  } catch {
    return null;
  }
}

/**
 * Same as requireAuth but additionally asserts role === "admin" (the role
 * currently in the DB, not the one in the token).
 * Throws ApiError(403) if the user is authenticated but not an admin.
 */
export async function requireAdmin(event) {
  const payload = await requireAuth(event);

  if (payload.role !== "admin") {
    logWarn("Non-admin attempted to access admin route", {
      service: "auth-middleware",
      userId: payload.id,
      role: payload.role,
      route: event.rawPath || event.path,
    });
    throw new ApiError(403, "Admin access required.");
  }

  return payload;
}
