import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getClientIp, sanitizeForLog, jsonResponse, redirectResponse } from "../utils/http.js";

describe("Set-Cookie output per API Gateway payload format", () => {
  const cookies = ["token=abc; HttpOnly; Path=/", "csrf_token=xyz; Path=/"];

  it("uses the top-level cookies array for HTTP API v2 events (multiValueHeaders is ignored there)", () => {
    const res = jsonResponse(200, {}, { "Set-Cookie": cookies }, { version: "2.0", headers: {} });
    expect(res.cookies).toEqual(cookies);
    expect(res.multiValueHeaders).toBeUndefined();
    expect(res.headers["Set-Cookie"]).toBeUndefined();
  });

  it("uses multiValueHeaders for REST API (v1) events", () => {
    const res = jsonResponse(200, {}, { "Set-Cookie": cookies }, { httpMethod: "POST", headers: {} });
    expect(res.multiValueHeaders).toEqual({ "Set-Cookie": cookies });
    expect(res.cookies).toBeUndefined();
  });

  it("applies the same rule to redirects (OTP links, Google callback)", () => {
    const v2 = redirectResponse("https://www.velvetwolf.in/", 302, { "Set-Cookie": cookies[0] }, { version: "2.0", headers: {} });
    expect(v2.cookies).toEqual([cookies[0]]);
    const v1 = redirectResponse("https://www.velvetwolf.in/", 302, { "Set-Cookie": cookies[0] }, { headers: {} });
    expect(v1.multiValueHeaders).toEqual({ "Set-Cookie": [cookies[0]] });
  });

  it("adds no cookie fields when there are no cookies", () => {
    const res = jsonResponse(200, {}, {}, { version: "2.0", headers: {} });
    expect(res.cookies).toBeUndefined();
    expect(res.multiValueHeaders).toBeUndefined();
  });
});

function event(headers = {}, sourceIp = "13.233.0.10") {
  return { headers, requestContext: { http: { sourceIp } } };
}

describe("getClientIp — trusted proxy header", () => {
  const original = process.env.PROXY_SHARED_SECRET;

  beforeEach(() => {
    process.env.PROXY_SHARED_SECRET = "s3cret";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.PROXY_SHARED_SECRET;
    else process.env.PROXY_SHARED_SECRET = original;
  });

  it("uses the forwarded visitor IP when the proxy secret matches", () => {
    expect(getClientIp(event({ "x-vw-proxy-secret": "s3cret", "x-vw-client-ip": "49.36.1.2" }))).toBe("49.36.1.2");
  });

  it("matches header names case-insensitively (REST API keeps original casing)", () => {
    expect(getClientIp(event({ "X-VW-Proxy-Secret": "s3cret", "X-VW-Client-IP": "49.36.1.2" }))).toBe("49.36.1.2");
  });

  it("ignores the forwarded IP when the secret is wrong (spoofing attempt)", () => {
    expect(getClientIp(event({ "x-vw-proxy-secret": "guess", "x-vw-client-ip": "1.1.1.1" }))).toBe("13.233.0.10");
  });

  it("ignores the forwarded IP when no secret is sent", () => {
    expect(getClientIp(event({ "x-vw-client-ip": "1.1.1.1" }))).toBe("13.233.0.10");
  });

  it("ignores the forwarded IP when the backend has no secret configured", () => {
    delete process.env.PROXY_SHARED_SECRET;
    expect(getClientIp(event({ "x-vw-proxy-secret": "", "x-vw-client-ip": "1.1.1.1" }))).toBe("13.233.0.10");
  });

  it("reads the source IP from REST API (v1) events, ignoring a spoofable X-Forwarded-For", () => {
    const restEvent = {
      headers: { "X-Forwarded-For": "1.1.1.1, 52.95.4.10" },
      requestContext: { identity: { sourceIp: "49.36.1.2" } },
    };
    expect(getClientIp(restEvent)).toBe("49.36.1.2");
  });

  it("falls back to API Gateway's source IP when the proxy sent no client IP", () => {
    expect(getClientIp(event({ "x-vw-proxy-secret": "s3cret" }))).toBe("13.233.0.10");
  });

  it("redacts the proxy secret from logs", () => {
    expect(sanitizeForLog({ "x-vw-proxy-secret": "s3cret" })).toEqual({ "x-vw-proxy-secret": "[redacted]" });
  });
});
