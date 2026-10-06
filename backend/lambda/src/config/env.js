import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

let loaded = false;

export function loadBackendEnv() {
  if (loaded) return;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Depth: src/config/ → src/ → lambda/ → backend/ → root
  const rootDir = path.resolve(currentDir, "../../../../");
  const candidates = [
    path.join(rootDir, "backend", "lambda", ".env.local"),
    path.join(rootDir, ".env"),
    path.join(rootDir, "backend", "lambda", ".env"),
  ];

  for (const envPath of candidates) {
    dotenv.config({ path: envPath, override: false });
  }

  loaded = true;
}

/**
 * True only for the local dev server. Gates dev conveniences (the 123456 OTP
 * bypass, printing OTPs when SMTP fails) so they can never switch on in the
 * deployed Lambda — AWS always sets AWS_LAMBDA_FUNCTION_NAME there, whatever
 * FRONTEND_URL / PORT / NODE_ENV happen to be configured as.
 */
export function isLocalDevelopment() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  return (
    process.env.NODE_ENV === "development" ||
    (process.env.FRONTEND_URL || "").includes("localhost") ||
    (process.env.BACKEND_PUBLIC_URL || "").includes("localhost") ||
    process.env.PORT === "5000"
  );
}
