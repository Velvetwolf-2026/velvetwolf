import {
  forgotPassword,
  googleCallback,
  getGoogleAuthRedirect,
  login,
  resendOtp,
  signup,
  verifyOtp,
} from "./shared/auth-service.js";
import { addCartItemByUserId, getCartByUserId, removeCartItemById, updateCartItemQuantity } from "./shared/cart-service.js";
import { getProducts } from "./shared/product-service.js";
import { loadBackendEnv } from "./shared/config/env.js";
import { sendContactMessage } from "./shared/contact-service.js";
import { getProfileById } from "./shared/profile-service.js";
import { getWishlistByUserId, toggleWishlistByUserId } from "./shared/wishlist-service.js";
import {
  ApiError,
  jsonResponse,
  logError,
  logInfo,
  logWarn,
  redirectResponse,
  sanitizeForLog,
} from "./shared/http.js";

loadBackendEnv();

function getPath(event) {
  return event.rawPath || event.path || "/";
}

function getMethod(event) {
  return event.requestContext?.http?.method || event.httpMethod || "GET";
}

function getQuery(event) {
  if (event.queryStringParameters) {
    return event.queryStringParameters;
  }

  const rawQuery = event.rawQueryString || "";
  const params = new URLSearchParams(rawQuery);
  const query = {};
  for (const [key, value] of params.entries()) {
    query[key] = value;
  }
  return query;
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }

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
    requestId,
    method,
    route,
    query,
    body,
    sourceIp: event.requestContext?.http?.sourceIp,
    userAgent: event.headers?.["user-agent"] || event.headers?.["User-Agent"],
  };
}

async function dispatch(method, route, body, query, requestId, event) {
  logInfo("Dispatching backend route", {
    requestId,
    method,
    route,
    hasBody: Object.keys(body || {}).length > 0,
    query,
  });

  if (method === "GET" && route === "/") {
    return jsonResponse(
      200,
      {
        message: "VelvetWolf backend lambda is running",
        mode: "lambda",
      },
      {},
      event
    );
  }

  if (method === "GET" && route.endsWith("/auth/google")) {
    const location = getGoogleAuthRedirect({ mode: query.mode });
    return redirectResponse(location, 302, {}, event);
  }

  if (method === "GET" && route.endsWith("/auth/google/callback")) {
    const location = await googleCallback({
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
    });
    return redirectResponse(location, 302, {}, event);
  }

  if (method === "GET" && route.endsWith("/products")) {
    return jsonResponse(
      200,
      { products: await getProducts({ collection: query.collection, search: query.search }) },
      {},
      event
    );
  }

  if (method === "GET" && route.endsWith("/profile")) {
    return jsonResponse(200, { profile: await getProfileById(query.id) }, {}, event);
  }

  if (method === "GET" && route.endsWith("/wishlist")) {
    return jsonResponse(200, { items: await getWishlistByUserId(query.userId) }, {}, event);
  }

  if (method === "POST" && route.endsWith("/wishlist/toggle")) {
    return jsonResponse(200, await toggleWishlistByUserId(body.userId, body.productId), {}, event);
  }

  if (method === "GET" && route.endsWith("/cart")) {
    return jsonResponse(200, { items: await getCartByUserId(query.userId) }, {}, event);
  }

  if (method === "POST" && route.endsWith("/cart/add")) {
    return jsonResponse(
      200,
      await addCartItemByUserId(body.userId, body.productId, body.quantity),
      {},
      event
    );
  }

  if (method === "POST" && route.endsWith("/cart/update")) {
    return jsonResponse(200, await updateCartItemQuantity(body.cartItemId, body.quantity), {}, event);
  }

  if (method === "POST" && route.endsWith("/cart/remove")) {
    return jsonResponse(200, await removeCartItemById(body.cartItemId), {}, event);
  }

  if (method === "POST" && route.endsWith("/auth/signup")) {
    return jsonResponse(200, await signup(body), {}, event);
  }

  if (method === "POST" && route.endsWith("/auth/login")) {
    return jsonResponse(200, await login(body), {}, event);
  }

  if (method === "POST" && route.endsWith("/auth/resend-otp")) {
    return jsonResponse(200, await resendOtp(body), {}, event);
  }

  if (method === "POST" && route.endsWith("/auth/forgot-password")) {
    return jsonResponse(200, await forgotPassword(body), {}, event);
  }

  if (method === "POST" && route.endsWith("/auth/verify-otp")) {
    return jsonResponse(200, await verifyOtp(body), {}, event);
  }

  if (method === "POST" && route.endsWith("/contact/send")) {
    return jsonResponse(200, await sendContactMessage(body), {}, event);
  }

  logWarn("No backend route matched request", { requestId, method, route, query });
  return jsonResponse(404, { error: "Route not found" }, {}, event);
}

export async function handler(event) {
  const method = getMethod(event);
  const route = normalizeRoute(getPath(event));
  const requestId = getRequestId(event);

  if (method === "OPTIONS") {
    logInfo("Handled CORS preflight request", { requestId, method, route });
    return jsonResponse(200, {}, {}, event);
  }

  try {
    const body = ["POST", "PUT", "PATCH"].includes(method) ? parseBody(event) : {};
    const query = getQuery(event);

    logInfo("Incoming backend request", getRequestContext(event, method, route, query, body, requestId));

    const response = await dispatch(method, route, body, query, requestId, event);

    logInfo("Backend request completed", {
      requestId,
      method,
      route,
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
      logWarn("Backend request failed with ApiError", {
        requestId,
        method,
        route,
        statusCode: error.statusCode,
        error,
      });
      return jsonResponse(error.statusCode, { error: error.message }, {}, event);
    }

    logError("Unhandled backend request error", {
      requestId,
      method,
      route,
      error,
    });
    return jsonResponse(500, { error: "Internal server error" }, {}, event);
  }
}




