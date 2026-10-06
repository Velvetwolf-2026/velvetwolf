const DEFAULT_API_BASE_URL = "http://localhost:5000";

// Path of the same-origin proxy (src/routes/api-proxy.js).
export const API_PROXY_PATH = "/api";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

// Direct backend URL (API Gateway). Used by server-side code (SSR loaders),
// which has no cookies to protect and can't fetch a relative URL.
const DIRECT_API_BASE_URL =
  trimTrailingSlash(globalThis.process?.env?.API_UPSTREAM_URL) ||
  trimTrailingSlash(import.meta.env.VITE_API_BASE_URL) ||
  DEFAULT_API_BASE_URL;

// Rollback switch: build with VITE_API_DIRECT=true to make the browser call
// API Gateway directly again (the pre-proxy behaviour).
const USE_DIRECT_API = import.meta.env.VITE_API_DIRECT === "true";

// In the browser, go through the same-origin proxy so auth cookies are
// first-party; on the server, call the backend directly.
export const API_BASE_URL =
  typeof window !== "undefined" && !USE_DIRECT_API ? API_PROXY_PATH : DIRECT_API_BASE_URL;

export function apiUrl(pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// True for requests to our own backend (proxy path or direct URL) — used by
// the global fetch interceptor. Must not match third-party URLs that merely
// contain "/api" (e.g. https://api.postalpincode.in/...).
export function isBackendUrl(url) {
  const value = String(url || "");
  if (value.startsWith("/")) return true; // same-origin, including /api/*
  return value === DIRECT_API_BASE_URL || value.startsWith(`${DIRECT_API_BASE_URL}/`) || value.startsWith(`${DIRECT_API_BASE_URL}?`);
}

export function googleAuthUrl(mode = "login") {
  const safeMode = mode === "signup" ? "signup" : "login";
  return `${apiUrl("/auth/google")}?mode=${encodeURIComponent(safeMode)}`;
}
