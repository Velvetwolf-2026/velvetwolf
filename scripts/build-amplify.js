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

  // 2. Copy static client assets to .amplify-hosting/static
  const clientBuildDir = path.join(rootDir, 'build', 'client');
  if (fs.existsSync(clientBuildDir)) {
    fs.cpSync(clientBuildDir, staticDir, { recursive: true });
    console.log('✓ Copied build/client to .amplify-hosting/static');
  } else {
    console.error('Error: build/client directory does not exist. Run react-router build first.');
    process.exit(1);
  }

  // 3. Create temporary entry file for bundling the compute server
  const serverBuildFile = path.join(rootDir, 'build', 'server', 'index.js');
  if (!fs.existsSync(serverBuildFile)) {
    console.error('Error: build/server/index.js does not exist.');
    process.exit(1);
  }

  const tmpEntryFile = path.join(rootDir, 'build', 'server', 'amplify-server-entry.js');
  const serverEntryContent = `import http from 'node:http';
import { createRequestHandler } from "react-router";
import * as build from "./index.js";

const handler = createRequestHandler(build);
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(port, () => {
  console.log("Amplify SSR server running on port " + port);
});
`;
  fs.writeFileSync(tmpEntryFile, serverEntryContent);

  // 4. Bundle compute server entrypoint using esbuild into .amplify-hosting/compute/default/index.js
  console.log('Bundling SSR compute server with esbuild...');
  await esbuild({
    entryPoints: [tmpEntryFile],
    outfile: path.join(computeDir, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    banner: {
      js: 'import { createRequire as __esbuild_createRequire } from "module"; const require = __esbuild_createRequire(import.meta.url);',
    },
    external: ['fsevents', 'sharp', 'bcrypt', 'pg'],
    minify: false,
    sourcemap: false,
  });

  // Clean temp file
  if (fs.existsSync(tmpEntryFile)) {
    fs.unlinkSync(tmpEntryFile);
  }

  console.log('✓ Bundled SSR server to .amplify-hosting/compute/default/index.js');

  // 5. Create deploy-manifest.json for AWS Amplify SSR
  const manifest = {
    version: 1,
    framework: {
      name: "react-router",
      version: "8.2.0"
    },
    routes: [
      {
        path: "/assets/*",
        target: {
          kind: "Static"
        }
      },
      {
        path: "/favicon.ico",
        target: {
          kind: "Static"
        }
      },
      {
        path: "/logo.png",
        target: {
          kind: "Static"
        }
      },
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
