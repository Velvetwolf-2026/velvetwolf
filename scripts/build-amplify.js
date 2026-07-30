import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build as esbuild } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const amplifyDir = path.join(rootDir, '.amplify-hosting');
const computeDir = path.join(amplifyDir, 'compute', 'default');
const staticDir = path.join(amplifyDir, 'static');

async function buildAmplify() {
  // 1. Clean & create directory structure
  if (fs.existsSync(amplifyDir)) {
    fs.rmSync(amplifyDir, { recursive: true, force: true });
  }
  fs.mkdirSync(computeDir, { recursive: true });
  fs.mkdirSync(staticDir, { recursive: true });

  // Create package.json in compute directory so AWS Lambda treats index.js as ES Module
  fs.writeFileSync(
    path.join(computeDir, 'package.json'),
    JSON.stringify({ type: "module" }, null, 2)
  );

  // 2. Copy static client assets to .amplify-hosting/static
  const clientBuildDir = path.join(rootDir, 'build', 'client');
  if (fs.existsSync(clientBuildDir)) {
    fs.cpSync(clientBuildDir, staticDir, { recursive: true });
    console.log('✓ Copied build/client to .amplify-hosting/static');
  } else {
    console.error('Error: build/client directory does not exist. Run react-router build first.');
    process.exit(1);
  }

  // 3. Create temporary entry file for bundling the compute server for AWS Lambda
  const serverBuildFile = path.join(rootDir, 'build', 'server', 'index.js');
  if (!fs.existsSync(serverBuildFile)) {
    console.error('Error: build/server/index.js does not exist.');
    process.exit(1);
  }

  const tmpEntryFile = path.join(rootDir, 'build', 'server', 'amplify-server-entry.js');
  const serverEntryContent = `import { createRequestHandler } from "react-router";
import * as build from "./index.js";

const handleRequest = createRequestHandler(build);

function getHeaderValue(headersObj, keyName) {
  if (!headersObj) return null;
  const val = headersObj[keyName] || headersObj[keyName.toLowerCase()] || headersObj[keyName.toUpperCase()];
  if (!val) return null;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    if (typeof val[0] === "string") return val[0];
    if (val[0] && typeof val[0] === "object" && val[0].value) return val[0].value;
  }
  return String(val);
}

export async function handler(event, context) {
  try {
    let rawPath = event.rawPath || event.path || "/";
    if (!rawPath && event.Records?.[0]?.cf?.request?.uri) {
      rawPath = event.Records[0].cf.request.uri;
    }

    let rawQueryString = event.rawQueryString || "";
    if (!rawQueryString && event.queryStringParameters) {
      rawQueryString = new URLSearchParams(event.queryStringParameters).toString();
    }

    const host = getHeaderValue(event.headers, "x-forwarded-host") ||
                 getHeaderValue(event.headers, "host") ||
                 "velvetwolf.in";

    const cleanPath = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
    const urlString = \`https://\${host}\${cleanPath}\${rawQueryString ? "?" + rawQueryString : ""}\`;
    const url = new URL(urlString);

    const method = event.requestContext?.http?.method || event.httpMethod || "GET";

    const requestHeaders = new Headers();
    if (event.headers) {
      for (const [key, val] of Object.entries(event.headers)) {
        if (val === undefined || val === null) continue;
        let strVal = "";
        if (typeof val === "string") {
          strVal = val;
        } else if (Array.isArray(val)) {
          strVal = val.map(v => (typeof v === "object" && v?.value) ? v.value : String(v)).join(", ");
        } else if (typeof val === "object" && val.value) {
          strVal = val.value;
        } else {
          strVal = String(val);
        }
        if (strVal && strVal !== "[object Object]") {
          try {
            requestHeaders.set(key.toLowerCase(), strVal);
          } catch (e) {
            // ignore header formatting errors
          }
        }
      }
    }

    let body = undefined;
    if (event.body) {
      body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event.body;
    }

    const request = new Request(url.href, {
      method,
      headers: requestHeaders,
      body: ["GET", "HEAD"].includes(method) ? undefined : body,
    });

    const response = await handleRequest(request);

    const responseHeaders = {};
    const cookies = [];

    response.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (["transfer-encoding", "connection", "keep-alive", "content-encoding", "content-length"].includes(lowerKey)) {
        return;
      }
      if (lowerKey === "set-cookie") {
        cookies.push(val);
      } else {
        responseHeaders[key] = val;
      }
    });

    const responseBody = await response.text();

    const resultPayload = {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      isBase64Encoded: false,
    };

    if (cookies.length > 0) {
      resultPayload.cookies = cookies;
    }

    return resultPayload;
  } catch (error) {
    console.error("AWS Amplify SSR Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html" },
      body: "<h1>500 - Internal Server Error</h1><pre>" + (error.stack || error.message || error) + "</pre>",
      isBase64Encoded: false,
    };
  }
}
export default handler;
`;
  fs.writeFileSync(tmpEntryFile, serverEntryContent);

  // 4. Bundle compute server entrypoint using esbuild into .amplify-hosting/compute/default/index.js
  console.log('Bundling SSR compute server with esbuild...');
  // Cinematic3DHero (and the ~734kB of three.js it pulls in) is only reached
  // through a client-only lazy() boundary — see ClientOnly3DHero.jsx — and is
  // never evaluated during SSR. Without code splitting, esbuild collapses that
  // dynamic import() into the same file as everything else, which forces
  // Node's ESM loader to eagerly resolve every top-level static import in the
  // bundle (including three's) up front — costing ~9.8s of pure V8 parse time
  // per cold start, or crashing outright if three is marked external instead.
  // splitting:true keeps it as a real separate chunk that's only loaded if the
  // dynamic import() actually fires, which it never does server-side.
  await esbuild({
    entryPoints: [tmpEntryFile],
    outdir: computeDir,
    entryNames: 'index',
    splitting: true,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    banner: {
      js: 'import { createRequire as __esbuild_createRequire } from "module"; const require = __esbuild_createRequire(import.meta.url);',
    },
    external: ['fsevents', 'sharp', 'bcrypt', 'pg'],
    ignoreAnnotations: true,
    minify: false,
    sourcemap: false,
  });

  // Clean temp file
  if (fs.existsSync(tmpEntryFile)) {
    fs.unlinkSync(tmpEntryFile);
  }

  console.log('✓ Bundled SSR server to .amplify-hosting/compute/default/index.js');

  // 5. Create deploy-manifest.json for AWS Amplify SSR
  // Route every top-level file actually present in build/client statically,
  // instead of a hardcoded list — otherwise assets like sw.js or manifest.json
  // silently fall through to the (much slower, crashable) Compute route.
  // Amplify's manifest schema only allows a fixed character set in route
  // paths, so filenames with spaces/parens etc. are skipped rather than
  // breaking deploy-manifest validation for the whole deploy.
  const VALID_ROUTE_PATH = /^[A-Za-z0-9_\-.*$/~"'@:+\\]+$/;
  const staticRoutes = [];
  for (const entry of fs.readdirSync(staticDir, { withFileTypes: true })) {
    const routePath = entry.isDirectory() ? `/${entry.name}/*` : `/${entry.name}`;
    if (!VALID_ROUTE_PATH.test(routePath)) {
      console.warn(`⚠ Skipping static route for "${entry.name}" — filename has characters not allowed in deploy-manifest.json route paths.`);
      continue;
    }
    staticRoutes.push({
      path: routePath,
      target: {
        kind: "Static"
      }
    });
  }

  const manifest = {
    version: 1,
    framework: {
      name: "react-router",
      version: "8.2.0"
    },
    routes: [
      ...staticRoutes,
      {
        path: "/*",
        target: {
          kind: "Compute",
          src: "default"
        }
      }
    ],
    computeResources: [
      {
        name: "default",
        entrypoint: "index.js",
        runtime: "nodejs20.x"
      }
    ]
  };

  fs.writeFileSync(
    path.join(amplifyDir, 'deploy-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('✓ Created .amplify-hosting/deploy-manifest.json');
  console.log('✓ Amplify SSR bundle successfully created in .amplify-hosting!');
}

buildAmplify().catch((err) => {
  console.error(err);
  process.exit(1);
});
