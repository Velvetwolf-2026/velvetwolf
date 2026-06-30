import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo, logWarn } from "../utils/http.js";
import { sendOTP } from "../config/smtp.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

function profileLogContext(context = {}) {
  return { service: "profile", ...context };
}

export async function getProfileById(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  logInfo("Fetching profile by id", profileLogContext({ userId: normalizedUserId }));

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email, name, role, last_login")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (userError) {
    logError("Profile lookup failed", profileLogContext({ userId: normalizedUserId, error: userError }));
    throw new ApiError(400, userError.message || "Failed to load profile.");
  }

  if (!user) return null;

  // Fetch optional profile columns (phone, gender, date_of_birth, etc.)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, phone, gender, date_of_birth")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    logWarn("Profiles lookup failed", profileLogContext({ userId: normalizedUserId, error: profileError }));
  }

  return {
    ...user,
    ...(profile || {}),
  };
}

export async function updateProfile(userId, updates) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  logInfo("Updating profile", profileLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id:            normalizedUserId,
      full_name:     updates.fullName,
      phone:         updates.phone,
      gender:        updates.gender,
      date_of_birth: updates.dob,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    logError("Profile update failed", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(400, error.message || "Failed to update profile.");
  }

  return data;
}

export async function sendEmailUpdateOtp({ userId, newEmail }) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  const normalizedEmail = String(newEmail || "").toLowerCase().trim();
  if (!normalizedEmail) throw new ApiError(400, "New email is required.");
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new ApiError(400, "Invalid email address format.");
  }

  logInfo("Initiating email update OTP request", profileLogContext({ userId: normalizedUserId, newEmail: normalizedEmail }));

  // Check if current user exists and what their current email is
  const { data: currentUser, error: currentUserError } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", normalizedUserId)
    .single();

  if (currentUserError || !currentUser) {
    throw new ApiError(404, "User not found.");
  }

  if (currentUser.email === normalizedEmail) {
    throw new ApiError(400, "New email must be different from your current email.");
  }

  // Check if email is already in use by another user
  const { data: existingUser, error: searchError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (searchError) {
    logError("Search email usage failed", profileLogContext({ email: normalizedEmail, error: searchError }));
    throw new ApiError(400, "Failed to verify email availability.");
  }

  if (existingUser) {
    throw new ApiError(409, "This email is already linked to another account.");
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
  const type = "Change-Email-OTP";

  // Clean up any existing OTPs of this type for the same email
  await supabaseAdmin.from("otps").delete().eq("email", normalizedEmail).eq("type", type);

  // Insert new OTP
  const { error: insertError } = await supabaseAdmin
    .from("otps")
    .insert({
      email: normalizedEmail,
      otp,
      expires_at: expiresAt,
      type
    });

  if (insertError) {
    logError("Failed to save email update OTP", profileLogContext({ userId: normalizedUserId, email: normalizedEmail, error: insertError }));
    throw new ApiError(500, "Failed to initiate email verification.");
  }

  // Send OTP email
  await sendOTP(normalizedEmail, otp, "change_email");

  logInfo("Email update OTP sent successfully", profileLogContext({ userId: normalizedUserId, email: normalizedEmail }));

  return { message: "OTP sent to new email address." };
}

export async function verifyEmailUpdateOtp({ userId, newEmail, otp }) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  const normalizedEmail = String(newEmail || "").toLowerCase().trim();
  const otpNumber = Number.parseInt(otp, 10);
  const type = "Change-Email-OTP";

  if (!normalizedEmail || !otp) {
    throw new ApiError(400, "Email and OTP code are required.");
  }

  logInfo("Verifying email update OTP", profileLogContext({ userId: normalizedUserId, newEmail: normalizedEmail }));

  // Check if it's bypass OTP in local dev environment
  const isLocal = (process.env.FRONTEND_URL || "").includes("localhost") || 
                  (process.env.BACKEND_PUBLIC_URL || "").includes("localhost") || 
                  process.env.PORT === "5000";
  const isBypassOtp = otp === "123456" && isLocal;

  if (!isBypassOtp) {
    // Lookup OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("otps")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("type", type)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (otpError || !otpRecord || otpRecord.attempts >= 5) {
      throw new ApiError(400, "Verification code is invalid or expired.");
    }

    if (Number(otpRecord.otp) !== otpNumber) {
      await supabaseAdmin
        .from("otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);
      throw new ApiError(400, "Invalid verification code.");
    }

    // Delete verified OTP
    await supabaseAdmin.from("otps").delete().eq("id", otpRecord.id);
  }

  // Double check email availability to prevent race conditions
  const { data: existingUser, error: searchError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (searchError) {
    throw new ApiError(400, "Failed to verify email availability.");
  }
  if (existingUser && existingUser.id !== normalizedUserId) {
    throw new ApiError(409, "This email is already linked to another account.");
  }

  // Update the user's email and set is_verified to true
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("users")
    .update({ email: normalizedEmail, is_verified: true })
    .eq("id", normalizedUserId)
    .select("id, email, name, role")
    .single();

  if (updateError) {
    logError("Failed to update user email", profileLogContext({ userId: normalizedUserId, email: normalizedEmail, error: updateError }));
    throw new ApiError(500, "Failed to update email address.");
  }

  // Fetch profiles table columns as well (just like getProfileById)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, phone, gender, date_of_birth")
    .eq("id", normalizedUserId)
    .maybeSingle();

  logInfo("User email updated successfully", profileLogContext({ userId: normalizedUserId, newEmail: normalizedEmail }));

  if (!process.env.JWT_SECRET) {
    logError("JWT secret missing while creating token", profileLogContext({ userId: normalizedUserId }));
    throw new ApiError(500, "JWT_SECRET is missing in backend environment.");
  }

  const token = jwt.sign(
    {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role || "customer"
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      ...updatedUser,
      ...(profile || {}),
    }
  };
}

// ─── STYLE PROFILE PERSONALIZATION ──────────────────────────────────────────────

export async function getStyleProfile(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "User ID is required.");

  logInfo("Fetching style profile", profileLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("user_style_profiles")
    .select("personality_type, quiz_score, created_at, updated_at")
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (error) {
    logError("Failed to fetch style profile", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(500, "Failed to load style profile.");
  }

  return data;
}

export async function saveStyleProfile(userId, { personalityType, quizScore }) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "User ID is required.");
  if (!personalityType) throw new ApiError(400, "Personality type is required.");
  if (!quizScore) throw new ApiError(400, "Quiz score is required.");

  logInfo("Saving style profile", profileLogContext({ userId: normalizedUserId, personalityType }));

  // Upsert into user_style_profiles
  const { data, error } = await supabaseAdmin
    .from("user_style_profiles")
    .upsert({
      user_id: normalizedUserId,
      personality_type: personalityType,
      quiz_score: quizScore,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    logError("Failed to save style profile", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(500, `Failed to save style profile: ${error.message}`);
  }

  // Update primary users table
  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({ personality_type: personalityType })
    .eq("id", normalizedUserId);

  if (userError) {
    logError("Failed to update user personality type", profileLogContext({ userId: normalizedUserId, error: userError }));
  }

  return data;
}

export async function clearStyleProfile(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "User ID is required.");

  logInfo("Clearing style profile", profileLogContext({ userId: normalizedUserId }));

  const { error: deleteError } = await supabaseAdmin
    .from("user_style_profiles")
    .delete()
    .eq("user_id", normalizedUserId);

  if (deleteError) {
    logError("Failed to delete style profile", profileLogContext({ userId: normalizedUserId, error: deleteError }));
    throw new ApiError(500, "Failed to clear style profile.");
  }

  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({ personality_type: null })
    .eq("id", normalizedUserId);

  if (userError) {
    logError("Failed to clear user personality type", profileLogContext({ userId: normalizedUserId, error: userError }));
  }

  return { success: true };
}

export async function getUserOrders(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "User ID is required.");

  logInfo("Fetching user orders from DB", profileLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", normalizedUserId)
    .order("created_at", { ascending: false });

  if (error) {
    logError("Failed to fetch user orders", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(500, "Failed to load order history.");
  }

  return data || [];
}

