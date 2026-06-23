import { describe, it, expect } from "vitest";
import { normalizeOtpKind, buildOtpEmail } from "../../backend/lambda/src/config/otp-template.js";

describe("OTP Email Template Tests", () => {
  describe("normalizeOtpKind", () => {
    it("should normalize sign-up variants to signup", () => {
      expect(normalizeOtpKind("signup")).toBe("signup");
      expect(normalizeOtpKind("SIGN-UP")).toBe("signup");
      expect(normalizeOtpKind("register")).toBe("signup");
    });

    it("should normalize forgot-password variants to forgot", () => {
      expect(normalizeOtpKind("forgot")).toBe("forgot");
      expect(normalizeOtpKind("forgot-password")).toBe("forgot");
      expect(normalizeOtpKind("recovery")).toBe("forgot");
      expect(normalizeOtpKind("RESET")).toBe("forgot");
    });

    it("should normalize change-email variants to change_email", () => {
      expect(normalizeOtpKind("change-email")).toBe("change_email");
      expect(normalizeOtpKind("change_email")).toBe("change_email");
    });

    it("should fallback to login for invalid kinds", () => {
      expect(normalizeOtpKind("")).toBe("login");
      expect(normalizeOtpKind(null)).toBe("login");
      expect(normalizeOtpKind("unknown")).toBe("login");
    });
  });

  describe("buildOtpEmail", () => {
    it("should correctly format login email contents", () => {
      const email = buildOtpEmail({ otp: "123456", kind: "login" });
      
      expect(email.subject).toBe("VelvetWolf Login OTP");
      expect(email.text).toContain("Your One-Time Password: 123456");
      expect(email.html).toContain("123456");
      expect(email.html).toContain("LOGIN");
      expect(email.html).toContain("OTP");
    });

    it("should escape special HTML characters in templates", () => {
      const dangerousOtp = "<123>&'\"";
      const email = buildOtpEmail({ otp: dangerousOtp, kind: "login" });
      
      expect(email.html).not.toContain(dangerousOtp);
      expect(email.html).toContain("&lt;123&gt;&amp;&#39;&quot;");
    });

    it("should embed verifyUrl if provided", () => {
      const verifyUrl = "http://localhost:5173/verify?token=abc";
      const email = buildOtpEmail({ otp: "987654", kind: "signup", verifyUrl });

      expect(email.html).toContain(`href="${verifyUrl}"`);
    });
  });
});
