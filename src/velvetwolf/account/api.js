// Requests for the account page. Every call has a time limit, so nothing on the page can sit on
// "Loading" for ever, and a feature the backend doesn't have yet (route missing, or its database
// migration not run) comes back as { unavailable: true } so the page can leave it out quietly.
import { apiUrl } from "../utils/api";

const TIMEOUT_MS = 12000;

export class RequestError extends Error {
  constructor(message, { status = 0, unavailable = false } = {}) {
    super(message);
    this.status = status;
    this.unavailable = unavailable;
  }
}

export async function request(path, { method = "GET", body, timeout = TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(apiUrl(path), {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new RequestError(err?.name === "AbortError" ? "That took too long. Check your connection and try again." : "We couldn't reach VelvetWolf. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("vw-unauthorized"));
  if (!res.ok) {
    // 404 "Route not found": a backend from before this feature
    const unavailable = data.unavailable === true || (res.status === 404 && data.error === "Route not found");
    throw new RequestError(data.error || "Something went wrong. Please try again.", { status: res.status, unavailable });
  }
  return data;
}

// a feature that may not be switched on yet: its data, or null when it isn't
export async function optional(path, pick = (d) => d) {
  try {
    return pick(await request(path));
  } catch (err) {
    if (err.unavailable) return null;
    throw err;
  }
}
