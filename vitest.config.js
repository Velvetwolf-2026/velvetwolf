import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Backend tests are plain Node/ESM (no DOM) — run them without jsdom.
    environmentMatchGlobs: [["backend/**", "node"]],
    globals: true,
    setupFiles: "./src/tests/setup.js",
    singleThread: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/velvetwolf/**", "backend/lambda/src/**"],
    },
  },
});
