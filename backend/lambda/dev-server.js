import http from "http";
import { handler } from "./index.js";

const PORT = process.env.PORT || 5000;

function buildLambdaEvent(req, body, rawQueryString) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const queryParams = {};
  for (const [k, v] of url.searchParams.entries()) {
    queryParams[k] = v;
  }

  return {
    rawPath: url.pathname,
    rawQueryString,
    queryStringParameters: queryParams,
    httpMethod: req.method,
    requestContext: {
      http: {
        method: req.method,
        sourceIp: req.socket?.remoteAddress || "127.0.0.1",
      },
      requestId: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v])
    ),
    body: body || null,
    isBase64Encoded: false,
  };
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const rawQueryString = url.search ? url.search.slice(1) : "";

  const event = buildLambdaEvent(req, rawBody || null, rawQueryString);

  try {
    const result = await handler(event);

    res.writeHead(result.statusCode || 200, result.headers || {});
    res.end(result.body || "");
  } catch (err) {
    console.error("[dev-server] Unhandled error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-server] Backend running at http://localhost:${PORT}`);
});
