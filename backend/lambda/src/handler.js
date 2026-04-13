import { loadBackendEnv } from "./config/env.js";
import { ApiError, jsonResponse, logError, logInfo, logWarn, sanitizeForLog } from "./utils/http.js";
import { handleAuthRoutes } from "./routes/auth.routes.js";
import { handleProductRoutes } from "./routes/product.routes.js";
import { handleCartRoutes } from "./routes/cart.routes.js";
import { handleWishlistRoutes } from "./routes/wishlist.routes.js";
import { handleProfileRoutes } from "./routes/profile.routes.js";
import { handleContactRoutes } from "./routes/contact.routes.js";
import { handleSesRoutes } from "./routes/ses.routes.js";
import { handleAdminRoutes } from "./routes/admin.routes.js";

loadBackendEnv();

// ─── Request parsing helpers ───────────────────────────────────────────────────

function getPath(event) {
  return event.rawPath || event.path || "/";
}

function getMethod(event) {
  return event.requestContext?.http?.method || event.httpMethod || "GET";
}

function getQuery(event) {
  if (event.queryStringParameters) return event.queryStringParameters;
  const params = new URLSearchParams(event.rawQueryString || "");
  const query = {};
  for (const [key, value] of params.entries()) query[key] = value;
  return query;
}

function parseBody(event) {
  if (!event.body) return {};
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return rawBody ? JSON.parse(rawBody) : {};
}

function normalizeRoute(pathname) {
  return pathname.replace(/\/$/, "") || "/";
}

function getRequestId(event) {
  return event.requestContext?.requestId || event.headers?.["x-request-id"] || `req-${Date.now()}`;
}

function getRequestContext(event, method, route, query, body, requestId) {
  return {
    requestId, method, route, query, body,
    sourceIp: event.requestContext?.http?.sourceIp,
    userAgent: event.headers?.["user-agent"] || event.headers?.["User-Agent"],
  };
}

// ─── Route handlers in priority order ─────────────────────────────────────────
// Each handler returns a response object or null (no match).
// Errors propagate up and are caught by the top-level try/catch.

const ROUTE_HANDLERS = [
  handleAuthRoutes,
  handleProductRoutes,
  handleCartRoutes,
  handleWishlistRoutes,
  handleProfileRoutes,
  handleContactRoutes,
  handleSesRoutes,
  handleAdminRoutes,
];

async function dispatch(method, route, body, query, requestId, event) {
  logInfo("Dispatching request", { requestId, method, route, hasBody: Object.keys(body || {}).length > 0, query });

  // Health check
  if (method === "GET" && route === "/") {
    return jsonResponse(200, { message: "VelvetWolf backend lambda is running", mode: "lambda" }, {}, event);
  }

  for (const routeHandler of ROUTE_HANDLERS) {
    const result = await routeHandler(method, route, body, query, event);
    if (result !== null && result !== undefined) return result;
  }

  logWarn("No backend route matched request", { requestId, method, route, query });
  return jsonResponse(404, { error: "Route not found" }, {}, event);
}

// ─── Lambda entry point ────────────────────────────────────────────────────────

export async function handler(event) {
  const method = getMethod(event);
  const route = normalizeRoute(getPath(event));
  const requestId = getRequestId(event);

  if (method === "OPTIONS") {
    logInfo("Handled CORS preflight", { requestId, route });
    return jsonResponse(200, {}, {}, event);
  }

  try {
    const body = ["POST", "PUT", "PATCH"].includes(method) ? parseBody(event) : {};
    const query = getQuery(event);

    logInfo("Incoming request", getRequestContext(event, method, route, query, body, requestId));

    const response = await dispatch(method, route, body, query, requestId, event);

    logInfo("Request completed", {
      requestId, method, route,
      statusCode: response.statusCode,
      responseHeaders: sanitizeForLog(response.headers || {}),
    });

    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      logWarn("Invalid JSON body received", { requestId, method, route, error });
      return jsonResponse(400, { error: "Invalid JSON body" }, {}, event);
    }

    if (error instanceof ApiError) {
      logWarn("Request failed with ApiError", { requestId, method, route, statusCode: error.statusCode, error });
      return jsonResponse(error.statusCode, { error: error.message }, {}, event);
    }

    logError("Unhandled request error", { requestId, method, route, error });
    return jsonResponse(500, { error: "Internal server error" }, {}, event);
  }
}
