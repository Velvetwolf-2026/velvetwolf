import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const amplifyDir = path.join(rootDir, '.amplify-hosting');
const computeDir = path.join(amplifyDir, 'compute', 'default');
const staticDir = path.join(amplifyDir, 'static');

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
  console.error('Error: build/client directory does not exist. Run npm run build first.');
  process.exit(1);
}

// 3. Copy server build files to .amplify-hosting/compute/default
const serverBuildDir = path.join(rootDir, 'build', 'server');
if (fs.existsSync(serverBuildDir)) {
  fs.cpSync(serverBuildDir, computeDir, { recursive: true });
  // Rename server build index.js to server-build.js so index.js can be the compute entrypoint
  const originalIndex = path.join(computeDir, 'index.js');
  const serverBuildFile = path.join(computeDir, 'server-build.js');
  if (fs.existsSync(originalIndex)) {
    fs.renameSync(originalIndex, serverBuildFile);
  }
  console.log('✓ Copied and prepared build/server in .amplify-hosting/compute/default');
} else {
  console.error('Error: build/server directory does not exist.');
  process.exit(1);
}

// 4. Create index.js (the Amplify Compute entrypoint)
const computeEntryContent = `import http from 'node:http';
import { createRequestHandler } from "@react-router/serve";
import * as build from "./server-build.js";

const handler = createRequestHandler(build);
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(port, () => {
  console.log(\`Amplify SSR server listening on port \${port}\`);
});
`;

fs.writeFileSync(path.join(computeDir, 'index.js'), computeEntryContent);

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
