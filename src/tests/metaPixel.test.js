import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCookie, getMetaTrackingData } from "../velvetwolf/utils/metaPixel.js";

describe("Meta Pixel Client Helpers", () => {
  const originalCookie = document.cookie;
  const originalLocation = window.location;

  beforeEach(() => {
    // Clear cookies
    document.cookie = "_fbp=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "_fbc=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });

  afterEach(() => {
    document.cookie = originalCookie;
  });

  describe("getCookie", () => {
    it("returns null when cookie does not exist", () => {
      expect(getCookie("nonexistent_cookie")).toBeNull();
    });

    it("extracts and decodes the target cookie", () => {
      document.cookie = "_fbp=fb.1.1680000000000.123456789; path=/";
      expect(getCookie("_fbp")).toBe("fb.1.1680000000000.123456789");
    });
  });

  describe("getMetaTrackingData", () => {
    it("extracts _fbp and _fbc cookies when present", () => {
      document.cookie = "_fbp=fb.1.1680000000000.123456789; path=/";
      document.cookie = "_fbc=fb.1.1680000000000.IwAR123; path=/";

      const tracking = getMetaTrackingData();
      expect(tracking.fbp).toBe("fb.1.1680000000000.123456789");
      expect(tracking.fbc).toBe("fb.1.1680000000000.IwAR123");
    });

    it("generates _fbc from fbclid URL query parameter when _fbc cookie is not present", () => {
      delete window.location;
      window.location = new URL("https://velvetwolf.in/product/wolf-tee?fbclid=IwAR3xyz123");

      const tracking = getMetaTrackingData();
      expect(tracking.fbc).toMatch(/^fb\.1\.\d+\.IwAR3xyz123$/);

      window.location = originalLocation;
    });
  });
});
