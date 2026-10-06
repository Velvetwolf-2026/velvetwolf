// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { proxyToApi, getClientIpFromRequest, getUpstreamBaseUrl } from "../routes/api-proxy.js";

const UPSTREAM = "https://abc123.execute-api.us-east-1.amazonaws.com/dev";

function upstreamResponse({ status = 200, body = "{}", headers = {}, cookies = [] } = {}) {
  const h = new Headers(headers);
  for (const c of cookies) h.append("set-cookie", c);
  return new Response(body, { status, headers: h });
}

describe("api-proxy", () => {
  let fetchMock;

  beforeEach(() => {
    process.env.API_UPSTREAM_URL = UPSTREAM;
    process.env.PROXY_SHARED_SECRET = "s3cret";
    fetchMock = vi.fn().mockResolvedValue(upstreamResponse());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.API_UPSTREAM_URL;
    delete process.env.PROXY_SHARED_SECRET;
  });

  it("forwards path and query to the upstream stage URL", async () => {
    await proxyToApi(new Request("https://www.velvetwolf.in/api/products?collection=anime&q=a%20b"));

    expect(fetchMock.mock.calls[0][0]).toBe(`${UPSTREAM}/products?collection=anime&q=a%20b`);
  });

  it("forwards auth-related headers plus the secret and real client IP, and drops everything else", async () => {
    await proxyToApi(new Request("https://www.velvetwolf.in/api/cart", {
      headers: {
        authorization: "Bearer t",
        cookie: "token=abc; csrf_token=xyz",
        "x-csrf-token": "xyz",
        "x-forwarded-for": "6.6.6.6, 49.36.1.2",
        host: "www.velvetwolf.in",
        "x-vw-client-ip": "1.1.1.1", // client trying to spoof the trusted header
      },
    }));

    const sent = fetchMock.mock.calls[0][1].headers;
    expect(sent.get("authorization")).toBe("Bearer t");
    expect(sent.get("cookie")).toBe("token=abc; csrf_token=xyz");
    expect(sent.get("x-csrf-token")).toBe("xyz");
    expect(sent.get("x-vw-proxy-secret")).toBe("s3cret");
    expect(sent.get("x-vw-client-ip")).toBe("49.36.1.2");
    expect(sent.get("host")).toBeNull();
    expect(sent.get("x-forwarded-for")).toBeNull();
  });

  it("forwards the request body and method for writes", async () => {
    await proxyToApi(new Request("https://www.velvetwolf.in/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    }));

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(new TextDecoder().decode(init.body)).toBe('{"email":"a@b.com"}');
  });

  it("passes every Set-Cookie back to the browser as separate headers", async () => {
    fetchMock.mockResolvedValueOnce(upstreamResponse({
      headers: { "content-type": "application/json" },
      cookies: ["token=abc; HttpOnly; Path=/; SameSite=Lax", "csrf_token=xyz; Path=/; SameSite=Lax"],
    }));

    const res = await proxyToApi(new Request("https://www.velvetwolf.in/api/auth/login", { method: "POST", body: "{}" }));

    expect(res.headers.getSetCookie()).toEqual([
      "token=abc; HttpOnly; Path=/; SameSite=Lax",
      "csrf_token=xyz; Path=/; SameSite=Lax",
    ]);
  });

  it("returns redirects to the browser instead of following them", async () => {
    fetchMock.mockResolvedValueOnce(upstreamResponse({ status: 302, body: null, headers: { location: "https://accounts.google.com/o/oauth2/auth?x=1" } }));

    const res = await proxyToApi(new Request("https://www.velvetwolf.in/api/auth/google?mode=login"));

    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/auth?x=1");
  });

  it("preserves upstream error statuses and bodies", async () => {
    fetchMock.mockResolvedValueOnce(upstreamResponse({ status: 401, body: '{"error":"nope"}', headers: { "content-type": "application/json" } }));

    const res = await proxyToApi(new Request("https://www.velvetwolf.in/api/profile"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "nope" });
  });

  it("returns 502 when the backend is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await proxyToApi(new Request("https://www.velvetwolf.in/api/products"));

    expect(res.status).toBe(502);
  });

  it("does not send a secret header when none is configured", async () => {
    delete process.env.PROXY_SHARED_SECRET;

    await proxyToApi(new Request("https://www.velvetwolf.in/api/products"));

    expect(fetchMock.mock.calls[0][1].headers.get("x-vw-proxy-secret")).toBeNull();
  });

  it("refuses a relative upstream, which would proxy to itself", () => {
    process.env.API_UPSTREAM_URL = "/api";
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    expect(getUpstreamBaseUrl()).toBe("");
    vi.unstubAllEnvs();
  });

  it("uses the right-most X-Forwarded-For entry (appended by the load balancer) as the client IP", () => {
    const req = new Request("https://x/api", { headers: { "x-forwarded-for": "forged, 10.0.0.1, 49.36.1.2" } });
    expect(getClientIpFromRequest(req)).toBe("49.36.1.2");
    expect(getClientIpFromRequest(new Request("https://x/api"))).toBe("");
  });
});
