const DEFAULT_API_BASE_URL = "http://localhost:5000";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL) || DEFAULT_API_BASE_URL;

export function apiUrl(pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function googleAuthUrl(mode = "login") {
  const safeMode = mode === "signup" ? "signup" : "login";
  return `${apiUrl("/auth/google")}?mode=${encodeURIComponent(safeMode)}`;
}
