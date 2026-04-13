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
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    logWarn("Request missing Authorization header", {
      service: "auth-middleware",
      route: event.rawPath || event.path,
    });
    throw new ApiError(401, "Authentication required.");
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
