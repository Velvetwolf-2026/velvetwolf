import { signup, login, verifyOtp, resetPassword } from "./src/services/auth.service.js";
import { supabaseAdmin } from "./src/config/supabase.js";

async function test() {
  const email = "test_reset_flow_" + Math.random().toString(36).substring(7) + "@example.com";
  const password = "OriginalPassword123!";
  const newPassword = "NewPassword123!";

  console.log("1. Signing up user:", email);
  await signup({ name: "Test User", email, password });

  // Fetch the OTP from DB
  const { data: otpRec } = await supabaseAdmin.from("otps").select("otp").eq("email", email).single();
  const otp = otpRec.otp;
  console.log("2. Retrieved OTP from DB:", otp);

  // Verify OTP to active user
  console.log("3. Verifying signup OTP...");
  await verifyOtp({ email, otp, type: "signup" });

  // Try normal login
  console.log("4. Attempting login with original password...");
  const loginRes1 = await login({ email, password });
  console.log("Login 1 Success:", !!loginRes1.token);

  // Trigger forgot password
  console.log("5. Triggering forgot password...");
  // Wait, forgotPassword returns OTP
  await fetchForgotPasswordOtp(email);
  const { data: otpRec3 } = await supabaseAdmin.from("otps").select("otp").eq("email", email).single();
  const resetOtp = otpRec3.otp;
  console.log("Retrieved Reset OTP:", resetOtp);

  // Verify Reset OTP
  console.log("6. Verifying Reset OTP...");
  const verifyResetRes = await verifyOtp({ email, otp: resetOtp, type: "forgot" });
  const resetToken = verifyResetRes.resetToken;
  console.log("Reset Token generated:", !!resetToken);

  // Reset password
  console.log("7. Resetting password...");
  const resetRes = await resetPassword({ resetToken, newPassword });
  console.log("Reset password response:", resetRes);

  // Attempt login with new password
  console.log("8. Attempting login with new password...");
  try {
    const loginRes2 = await login({ email, password: newPassword });
    console.log("Login with new password Success:", !!loginRes2.token);
  } catch (err) {
    console.error("Login with new password Failed:", err.message);
  }
}

async function fetchForgotPasswordOtp(email) {
  // Simulating service call
  await supabaseAdmin.from("users").select("id").eq("email", email).single();
  const otp = 999999;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabaseAdmin.from("otps").delete().eq("email", email);
  await supabaseAdmin.from("otps").insert({ email, otp, expires_at: expiresAt, type: "Forget password-OTP" });
}

test().catch(console.error);
