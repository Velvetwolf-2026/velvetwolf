import { loadBackendEnv } from "./config/env.js";

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "password_hash",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "otp",
  "secret",
  "client_secret",
]);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

loadBackendEnv();

export function maskEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const [localPart = "", domain = ""] = normalized.split("@");

  if (!localPart || !domain) {
    return normalized;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
  };
}

export function sanitizeForLog(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > 4) {
    return "[max-depth]";
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...[truncated]` : value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    const loweredKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(loweredKey)) {
      sanitized[key] = "[redacted]";
      continue;
    }

    if (loweredKey === "email") {
      sanitized[key] = maskEmail(nestedValue);
      continue;
    }

    sanitized[key] = sanitizeForLog(nestedValue, depth + 1);
  }

  return sanitized;
}

function writeLog(level, message, context = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitizeForLog(context),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logInfo(message, context = {}) {
  writeLog("info", message, context);
}

export function logWarn(message, context = {}) {
  writeLog("warn", message, context);
}

export function logError(message, context = {}) {
  writeLog("error", message, context);
}

export function jsonResponse(statusCode, payload, extraHeaders = {}, event) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(event),
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

export function redirectResponse(location, statusCode = 302, extraHeaders = {}, event) {
  return {
    statusCode,
    headers: {
      Location: location,
      ...getCorsHeaders(event),
      ...extraHeaders,
    },
    body: "",
  };
}

export const getCorsHeaders = (event) => {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin || "";
  const configuredOrigins = String(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  let selectedOrigin = "";

  if (requestOrigin) {
    selectedOrigin = configuredOrigins.includes(requestOrigin) ? requestOrigin : "";
  } else if (configuredOrigins.length === 1) {
    selectedOrigin = configuredOrigins[0];
  } else if (configuredOrigins.length === 0) {
    selectedOrigin = "*";
  }

  logInfo("Resolved CORS headers", {
    requestOrigin,
    allowedOriginsCount: configuredOrigins.length,
    selectedOrigin: selectedOrigin || "[blocked]",
  });

  return {
    "Access-Control-Allow-Origin": selectedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    Vary: "Origin",
  };
};
