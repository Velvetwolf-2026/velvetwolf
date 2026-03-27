import http from "http";
import { handler } from "./src/handler.js";

const port = Number.parseInt(process.env.LAMBDA_PORT || process.env.PORT || "5001", 10);

function buildEvent(req, body) {
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: parsedUrl.pathname,
    rawQueryString: parsedUrl.search ? parsedUrl.search.slice(1) : "",
    headers: req.headers,
    queryStringParameters: Object.fromEntries(parsedUrl.searchParams.entries()),
    requestContext: {
      http: {
        method: req.method,
        path: parsedUrl.pathname,
      },
    },
    body,
    isBase64Encoded: false,
  };
}

const server = http.createServer(async (req, res) => {
  const chunks = [];

  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks).toString("utf8");
      const response = await handler(buildEvent(req, body));

      res.statusCode = response.statusCode || 200;

      for (const [header, value] of Object.entries(response.headers || {})) {
        res.setHeader(header, value);
      }

      res.end(response.body || "");
    } catch (error) {
      console.error("[lambda dev server error]", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Local lambda server failed" }));
    }
  });
});

server.listen(port, () => {
  console.log(`Lambda migration server listening on port ${port}`);
});
