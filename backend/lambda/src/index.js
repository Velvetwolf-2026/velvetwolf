import {
  forgotPassword,
  googleCallback,
  getGoogleAuthRedirect,
  login,
  resendOtp,
  signup,
  verifyOtp,
} from "../../shared/auth-service.js";
import { loadBackendEnv } from "../../shared/config/env.js";
import { ApiError, jsonResponse, redirectResponse } from "../../shared/http.js";

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

async function dispatch(method, route, body, query) {
  if (method === "GET" && route === "/") {
    return jsonResponse(200, {
      message: "VelvetWolf backend lambda is running",
      mode: "lambda",
    });
  }

  if (method === "GET" && route === "/auth/google") {
    const location = getGoogleAuthRedirect({ mode: query.mode });
    return redirectResponse(location, 302);
  }

  if (method === "GET" && route === "/auth/google/callback") {
    const location = await googleCallback({
      code: query.code,
      state: query.state,
      error: query.error,
      errorDescription: query.error_description,
    });
    return redirectResponse(location, 302);
  }

  if (method === "POST" && route === "/auth/signup") {
    return jsonResponse(200, await signup(body));
  }

  if (method === "POST" && route === "/auth/login") {
    return jsonResponse(200, await login(body));
  }

  if (method === "POST" && route === "/auth/resend-otp") {
    return jsonResponse(200, await resendOtp(body));
  }

  if (method === "POST" && route === "/auth/forgot-password") {
    return jsonResponse(200, await forgotPassword(body));
  }

  if (method === "POST" && route === "/auth/verify-otp") {
    return jsonResponse(200, await verifyOtp(body));
  }

  return jsonResponse(404, { error: "Route not found" });
}

export async function handler(event) {
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  try {
    const route = normalizeRoute(getPath(event));
    const body = ["POST", "PUT", "PATCH"].includes(method) ? parseBody(event) : {};
    const query = getQuery(event);
    return await dispatch(method, route, body, query);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    if (error instanceof ApiError) {
      return jsonResponse(error.statusCode, { error: error.message });
    }

    console.error("[lambda handler error]", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
}

