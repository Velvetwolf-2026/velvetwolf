import crypto from "crypto";
import { loadBackendEnv } from "../config/env.js";

// Headers set by the frontend's /api/* proxy (src/routes/api-proxy.js). Behind
// the proxy every request reaches API Gateway from the proxy's own IP, so the
// real visitor IP travels in CLIENT_IP_HEADER — trusted only when the shared
// secret matches, otherwise anyone could spoof it to dodge rate limits.
export const PROXY_SECRET_HEADER = "x-vw-proxy-secret";
export const PROXY_CLIENT_IP_HEADER = "x-vw-client-ip";

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

const SENSITIVE_KEYS = new Set([
  "authorization", "password", "password_hash", "token",
  "access_token", "refresh_token", "id_token", "otp", "secret", "client_secret",
  PROXY_SECRET_HEADER,
]);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

loadBackendEnv();

export function maskEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const [localPart = "", domain = ""] = normalized.split("@");
  if (!localPart || !domain) return normalized;
  if (localPart.length <= 2) return `${localPart[0] || "*"}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function serializeError(error) {
  if (!error) return null;
  return { name: error.name, message: error.message, stack: error.stack, statusCode: error.statusCode, code: error.code };
}

export function sanitizeForLog(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return "[max-depth]";
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}...[truncated]` : value;
  if (!isPlainObject(value)) return value;

  const sanitized = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const loweredKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(loweredKey)) { sanitized[key] = "[redacted]"; continue; }
    if (loweredKey === "email") { sanitized[key] = maskEmail(nestedValue); continue; }
    sanitized[key] = sanitizeForLog(nestedValue, depth + 1);
  }
  return sanitized;
}

function writeLog(level, message, context = {}) {
  const payload = { ts: new Date().toISOString(), level, message, ...sanitizeForLog(context) };
  const line = JSON.stringify(payload);
  if (level === "error") { console.error(line); return; }
  if (level === "warn") { console.warn(line); return; }
  console.info(line);
}

export function logInfo(message, context = {}) { writeLog("info", message, context); }
export function logWarn(message, context = {}) { writeLog("warn", message, context); }
export function logError(message, context = {}) { writeLog("error", message, context); }

// API Gateway reads cookies from a different response field depending on the
// payload format: HTTP API v2 events ("version": "2.0") only honour the
// top-level `cookies` array and silently drop `multiValueHeaders`, while REST
// API (v1) events only honour `multiValueHeaders`. Use the one this request's
// format expects so Set-Cookie actually reaches the browser.
function attachCookies(response, cookies, event) {
  if (cookies.length === 0) return response;
  if (event?.version === "2.0") {
    response.cookies = cookies;
  } else {
    response.multiValueHeaders = { "Set-Cookie": cookies };
  }
  return response;
}

export function jsonResponse(statusCode, payload, extraHeaders = {}, event) {
  const { "Set-Cookie": setCookie, ...headers } = extraHeaders;
  const cookies = [];
  if (setCookie) {
    if (Array.isArray(setCookie)) cookies.push(...setCookie);
    else cookies.push(setCookie);
  }

  const response = {
    statusCode,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(event), ...headers },
    body: JSON.stringify(payload),
  };

  return attachCookies(response, cookies, event);
}

export function redirectResponse(location, statusCode = 302, extraHeaders = {}, event) {
  const { "Set-Cookie": setCookie, ...headers } = extraHeaders;
  const cookies = [];
  if (setCookie) {
    if (Array.isArray(setCookie)) cookies.push(...setCookie);
    else cookies.push(setCookie);
  }

  const response = {
    statusCode,
    headers: { Location: location, ...getCorsHeaders(event), ...headers },
    body: "",
  };

  return attachCookies(response, cookies, event);
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? String(headers[key] || "") : "";
}

function getTrustedProxyClientIp(event) {
  const expected = process.env.PROXY_SHARED_SECRET || "";
  const provided = getHeader(event, PROXY_SECRET_HEADER);
  if (!expected || !provided) return "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "";

  return getHeader(event, PROXY_CLIENT_IP_HEADER).trim();
}

export function getClientIp(event) {
  const proxiedIp = getTrustedProxyClientIp(event);
  if (proxiedIp) return proxiedIp;

  // The source IP comes from API Gateway's own view of the TCP connection, so
  // it can't be spoofed by a client the way an X-Forwarded-For header can —
  // prefer it, and only fall back to XFF for the local dev server, which has
  // no API Gateway in front of it. HTTP APIs (payload v2) put it in
  // requestContext.http.sourceIp; REST APIs (v1, what production uses) in
  // requestContext.identity.sourceIp.
  const sourceIp = event?.requestContext?.http?.sourceIp || event?.requestContext?.identity?.sourceIp;
  if (sourceIp) return sourceIp;
  const forwardedFor = event?.headers?.["x-forwarded-for"] || event?.headers?.["X-Forwarded-For"];
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "";
}

export const getCorsHeaders = (event) => {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin || "";

  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.PROD_FRONTEND_URL_WWW,
    process.env.PROD_FRONTEND_URL,
  ]
    .filter(Boolean)
    .flatMap((o) => o.split(","))
    .map((o) => o.trim())
    .filter(Boolean);

  // Localhost origins are trusted (with credentials) only for local development
  // — never on the deployed Lambda, where AWS always sets AWS_LAMBDA_FUNCTION_NAME.
  const isLocalBackend = !process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "development";
  const isLocalhostOrigin = requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("http://127.0.0.1:");

  // The browser reaches the API same-origin through the /api proxy, so CORS is
  // only for explicitly configured origins (and localhost in local dev). Any
  // other origin gets no Access-Control-Allow-Origin at all, so other sites
  // can't read responses — with or without credentials.
  const isAllowedOrigin =
    Boolean(requestOrigin) &&
    (configuredOrigins.includes(requestOrigin) || (isLocalBackend && isLocalhostOrigin));

  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    Vary: "Origin",
  };

  if (isAllowedOrigin) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
};