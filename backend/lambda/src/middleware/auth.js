import jwt from "jsonwebtoken";
import { loadBackendEnv } from "../config/env.js";
import { ApiError, logWarn } from "../utils/http.js";

loadBackendEnv();

/**
 * Extracts and verifies the JWT from the Authorization: Bearer <token> header.
 * Returns the decoded payload { id, email, name, role }.
 * Throws ApiError(401) if the token is missing or invalid.
 */
export function requireAuth(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
  let token = "";

  if (cookieHeader) {
    const match = cookieHeader.split(";").find((c) => c.trim().startsWith("token="));
    if (match) {
      token = match.split("=")[1]?.trim();
    }
  }

  if (!token) {
    const authHeader =
      event.headers?.authorization ||
      event.headers?.Authorization ||
      "";
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  }


  if (!token) {
    logWarn("Request missing Authorization header", {
      service: "auth-middleware",
      route: event.rawPath || event.path,
    });
    throw new ApiError(401, "Authentication required.");
  }

  // Determine if authentication was performed via HttpOnly cookie
  const usedCookie = !!cookieHeader && cookieHeader.split(";").some((c) => c.trim().startsWith("token="));

  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  if (usedCookie && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfHeaderToken = event.headers?.["x-csrf-token"] || event.headers?.["X-CSRF-Token"] || "";
    let csrfCookieToken = "";
    if (cookieHeader) {
      const match = cookieHeader.split(";").find((c) => c.trim().startsWith("csrf_token="));
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
 * Same as requireAuth but additionally asserts role === "admin".
 * Throws ApiError(403) if the user is authenticated but not an admin.
 */
export function requireAdmin(event) {
  const payload = requireAuth(event);

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
