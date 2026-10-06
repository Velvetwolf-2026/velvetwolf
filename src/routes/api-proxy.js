// Same-origin proxy: /api/* on this server -> the Lambda backend on API Gateway.
//
// Serving the API from the site's own origin makes the auth cookies first-party
// (execute-api.amazonaws.com is a different site, so the browser never sends
// SameSite=Lax cookies to it from fetch()). Runs only on the server.

// Must match PROXY_SECRET_HEADER / PROXY_CLIENT_IP_HEADER in
// backend/lambda/src/utils/http.js.
const PROXY_SECRET_HEADER = "x-vw-proxy-secret";
const PROXY_CLIENT_IP_HEADER = "x-vw-client-ip";

const UPSTREAM_TIMEOUT_MS = 30000; // API Gateway/Lambda timeout is 30s

// Only what the backend actually reads is forwarded; hop-by-hop and
// encoding headers are deliberately dropped.
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
  "x-csrf-token",
  "x-request-id",
];

// fetch() has already decompressed the body, so content-encoding/length from
// upstream must not be passed through. CORS headers are irrelevant same-origin.
const FORWARD_RESPONSE_HEADERS = [
  "cache-control",
  "content-disposition",
  "content-type",
  "location",
  "retry-after",
];

export function getUpstreamBaseUrl() {
  const candidate = process.env.API_UPSTREAM_URL || import.meta.env.VITE_API_BASE_URL || "";
  // Must be absolute — a relative value (e.g. "/api") would proxy to itself.
  return /^https?:\/\//i.test(candidate) ? candidate.replace(/\/+$/, "") : "";
}

// Lightsail's load balancer appends the connecting client's IP to
// X-Forwarded-For, so the right-most entry is the one we can trust; anything
// to its left was supplied by the client and may be forged.
export function getClientIpFromRequest(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function proxyToApi(request) {
  const upstreamBase = getUpstreamBaseUrl();
  if (!upstreamBase) {
    return jsonError(503, "API proxy is not configured.");
  }

  const incomingUrl = new URL(request.url);
  const upstreamPath = incomingUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const targetUrl = `${upstreamBase}${upstreamPath}${incomingUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const clientIp = getClientIpFromRequest(request);
  if (clientIp) headers.set(PROXY_CLIENT_IP_HEADER, clientIp);
  if (process.env.PROXY_SHARED_SECRET) headers.set(PROXY_SECRET_HEADER, process.env.PROXY_SHARED_SECRET);

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      // Pass redirects (e.g. /auth/google -> Google) back to the browser
      // instead of following them on the server.
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "API proxy upstream request failed", path: upstreamPath, error: error?.message }));
    return jsonError(502, "Backend is unavailable. Please try again.");
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // Multiple cookies must stay separate headers — get("set-cookie") would
  // comma-join them into one unusable value.
  for (const cookie of upstream.headers.getSetCookie?.() || []) {
    responseHeaders.append("set-cookie", cookie);
  }

  const body = method === "HEAD" || [204, 304].includes(upstream.status) ? null : await upstream.arrayBuffer();
  return new Response(body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
}

export function loader({ request }) {
  return proxyToApi(request);
}

export function action({ request }) {
  return proxyToApi(request);
}
