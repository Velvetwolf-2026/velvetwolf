import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "./testUtils/supabaseMock.js";

const { supabaseAdmin, calls } = vi.hoisted(() => {
  return { supabaseAdmin: { from: vi.fn(), rpc: vi.fn() }, calls: [] };
});

vi.mock("../config/supabase.js", () => ({ supabaseAdmin }));

const sendOTP = vi.fn().mockResolvedValue({ messageId: "mock" });
vi.mock("../config/smtp.js", () => ({ sendOTP }));

const { updateProfile, sendEmailUpdateOtp, verifyEmailUpdateOtp } = await import("../services/profile.service.js");

function resetSupabaseMock(responseQueues) {
  calls.length = 0;
  const fresh = createSupabaseMock(responseQueues, calls);
  supabaseAdmin.from.mockImplementation(fresh.supabaseAdmin.from);
  supabaseAdmin.rpc.mockImplementation(fresh.supabaseAdmin.rpc);
}

describe("profile.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("updates profiles table and also updates users table when fullName is provided", async () => {
      resetSupabaseMock({
        profiles: [{ data: { id: "user-123", full_name: "John Doe" }, error: null }],
        users: [{ data: { id: "user-123", name: "John Doe" }, error: null }]
      });

      const result = await updateProfile("user-123", { fullName: "John Doe", phone: "9876543210" });
      expect(result.full_name).toBe("John Doe");

      // Verify that profiles upsert and users update were both called
      const profileCall = calls.find(c => c.table === "profiles");
      const userCall = calls.find(c => c.table === "users");
      expect(profileCall.method).toBe("upsert");
      expect(userCall.method).toBe("update");
      expect(userCall.payload).toEqual({ name: "John Doe" });
    });
  });

  describe("sendEmailUpdateOtp", () => {
    it("deletes existing OTPs of the same user using like Change-Email-OTP:% and inserts with current email", async () => {
      resetSupabaseMock({
        users: [{ data: { email: "oldemail@gmail.com" }, error: null }], // currentUser lookup
        otps: [
          { data: null, error: null }, // delete check
          { data: { id: "otp-1" }, error: null } // insert check
        ]
      });

      const result = await sendEmailUpdateOtp({ userId: "user-123", newEmail: "newemail@gmail.com" });
      expect(result.message).toBe("OTP sent to new email address.");

      const deleteCall = calls.find(c => c.table === "otps" && c.method === "delete");
      const insertCall = calls.find(c => c.table === "otps" && c.method === "insert");

      expect(deleteCall).toBeDefined();
      expect(insertCall).toBeDefined();
      expect(insertCall.payload.email).toBe("oldemail@gmail.com");
      expect(insertCall.payload.type).toBe("Change-Email-OTP:newemail@gmail.com");
    });
  });

  describe("verifyEmailUpdateOtp", () => {
    it("fetches the user's current email to lookup the OTP record under that email", async () => {
      resetSupabaseMock({
        users: [
          { data: { email: "oldemail@gmail.com" }, error: null }, // currentUser lookup
          { data: null, error: null }, // searchEmailAvailability check
          { data: { id: "user-123", email: "newemail@gmail.com" }, error: null } // users update check
        ],
        otps: [
          { data: { id: "otp-id-123", email: "oldemail@gmail.com", otp: 654321, attempts: 0 }, error: null }, // lookup
          { data: null, error: null } // delete verified OTP
        ]
      });

      const result = await verifyEmailUpdateOtp({ userId: "user-123", newEmail: "newemail@gmail.com", otp: "654321" });
      expect(result.user.email).toBe("newemail@gmail.com");

      // Verify OTP delete and User update calls
      const otpDeleteCall = calls.find(c => c.table === "otps" && c.method === "delete");
      const userUpdateCall = calls.find(c => c.table === "users" && c.method === "update");

      expect(otpDeleteCall).toBeDefined();
      expect(userUpdateCall).toBeDefined();
      expect(userUpdateCall.payload).toEqual({ email: "newemail@gmail.com", is_verified: true });
    });
  });
});
