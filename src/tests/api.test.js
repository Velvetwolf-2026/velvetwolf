import { describe, it, expect, vi, afterEach } from "vitest";

const DIRECT = "https://abc123.execute-api.us-east-1.amazonaws.com/dev";

async function loadApi(env = {}) {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", DIRECT);
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("../velvetwolf/utils/api.js");
}

describe("api base URL (browser)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("routes browser calls through the same-origin /api proxy", async () => {
    const { apiUrl, API_BASE_URL } = await loadApi();

    expect(API_BASE_URL).toBe("/api");
    expect(apiUrl("/auth/session")).toBe("/api/auth/session");
    expect(apiUrl("products")).toBe("/api/products");
  });

  it("calls API Gateway directly when the VITE_API_DIRECT rollback switch is on", async () => {
    const { apiUrl } = await loadApi({ VITE_API_DIRECT: "true" });

    expect(apiUrl("/auth/session")).toBe(`${DIRECT}/auth/session`);
  });

  it("isBackendUrl matches our backend but not third-party URLs containing '/api'", async () => {
    const { isBackendUrl } = await loadApi();

    expect(isBackendUrl("/api/cart")).toBe(true);
    expect(isBackendUrl(`${DIRECT}/cart`)).toBe(true);
    expect(isBackendUrl(DIRECT)).toBe(true);
    expect(isBackendUrl("https://api.postalpincode.in/pincode/600001")).toBe(false);
    expect(isBackendUrl(`${DIRECT}.evil.com/x`)).toBe(false);
    expect(isBackendUrl("https://sdk.cashfree.com/js/v3/cashfree.js")).toBe(false);
  });
});
