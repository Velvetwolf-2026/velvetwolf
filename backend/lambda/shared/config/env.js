import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

let loaded = false;

export function loadBackendEnv() {
  if (loaded) {
    return;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(currentDir, "../../../../");
  const candidates = [
    path.join(rootDir, "backend", "lambda",".env.local"),
    path.join(rootDir, ".env"),
    path.join(rootDir, "backend", "lambda", ".env"),
  ];

  for (const envPath of candidates) {
    dotenv.config({ path: envPath, override: false });
  }

  loaded = true;
}

