import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isLocalDevelopment } from "../config/env.js";

const KEYS = ["AWS_LAMBDA_FUNCTION_NAME", "NODE_ENV", "FRONTEND_URL", "BACKEND_PUBLIC_URL", "PORT"];

describe("isLocalDevelopment", () => {
  const saved = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("is true for the local dev server", () => {
    process.env.FRONTEND_URL = "http://localhost:5173";
    expect(isLocalDevelopment()).toBe(true);
  });

  it("is never true on Lambda, even with dev-looking settings", () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = "velvetwolf-backend";
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.PORT = "5000";
    expect(isLocalDevelopment()).toBe(false);
  });

  it("is false off-Lambda when nothing indicates local dev", () => {
    process.env.FRONTEND_URL = "https://www.velvetwolf.in";
    expect(isLocalDevelopment()).toBe(false);
  });
});
