import { supabaseAdmin } from "../config/supabase.js";
import { revokeUserSessions } from "./session.service.js";
import { isLocalDevelopment } from "../config/env.js";
import { ApiError, logError, logInfo, logWarn } from "../utils/http.js";
import { sendOTP } from "../config/smtp.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { isValidEmail, isValidMobile, cleanMobile, isValidName, cleanName, MOBILE_ERROR, NAME_ERROR, EMAIL_ERROR } from "../utils/validators.js";
import { findUserByVerifiedPhone, isMobileEmail, mobileOfEmail, mobileEmail, UNDEFINED_COLUMN } from "./phone.service.js";
import { verifyFirebaseIdToken, createJwt } from "./auth.service.js";

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

// Name, gender and date of birth save directly. The mobile number is part of
// how an account signs in (and how a phone sign-in finds the account), so a
// new number has to be confirmed with an SMS code first (verifyPhoneChange);
// here it can only be kept, removed, or set to the number the account already
// signs in with.
export async function updateProfile(userId, updates) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  logInfo("Updating profile", profileLogContext({ userId: normalizedUserId }));

  const fullName = updates.fullName === undefined ? undefined : cleanName(updates.fullName);
  if (fullName !== undefined && !isValidName(fullName)) throw new ApiError(400, NAME_ERROR);

  const row = {
    id:            normalizedUserId,
    full_name:     fullName,
    gender:        updates.gender,
    date_of_birth: updates.dob,
    updated_at:    new Date().toISOString(),
  };

  if (updates.phone !== undefined && updates.phone !== null) {
    const phone = cleanMobile(updates.phone);
    const [{ data: current }, { data: account }] = await Promise.all([
      supabaseAdmin.from("profiles").select("phone").eq("id", normalizedUserId).maybeSingle(),
      supabaseAdmin.from("users").select("email").eq("id", normalizedUserId).maybeSingle(),
    ]);
    const ownMobile = mobileOfEmail(account?.email);
    if (!phone) {
      if (ownMobile) throw new ApiError(400, "This number is how you sign in, so it can't be removed. Change it to a new number instead.");
      row.phone = null;
      row.phone_verified_at = null;
    } else if (!isValidMobile(phone)) {
      throw new ApiError(400, MOBILE_ERROR);
    } else if (phone === ownMobile) {
      row.phone = phone;
      row.phone_verified_at = new Date().toISOString();
    } else if (phone !== (current?.phone || "")) {
      throw new ApiError(400, "Confirm the new number with the code we text to it.");
    }
  }

  let { data, error } = await supabaseAdmin.from("profiles").upsert(row, { onConflict: "id" }).select().single();
  if (error?.code === UNDEFINED_COLUMN && "phone_verified_at" in row) {
    // before the VERIFIED MOBILE NUMBERS migration
    const { phone_verified_at: _skip, ...rest } = row;
    ({ data, error } = await supabaseAdmin.from("profiles").upsert(rest, { onConflict: "id" }).select().single());
  }

  if (error) {
    logError("Profile update failed", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(400, error.message || "Failed to update profile.");
  }

  if (fullName) {
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({ name: fullName })
      .eq("id", normalizedUserId);

    if (userError) {
      logWarn("Users table name update failed", profileLogContext({ userId: normalizedUserId, error: userError }));
    }
  }

  return data;
}

// A new mobile number, proved by a Firebase SMS code (the ID token carries the
// number Firebase checked). It becomes the account's confirmed number, so
// signing in with it opens this account. On a mobile-only account the number
// is also the sign-in itself: the old number stops working and every other
// session ends.
export async function verifyPhoneChange(userId, idToken) {
  if (!idToken) throw new ApiError(400, "The code check didn't come through. Send a new code.");
  const payload = await verifyFirebaseIdToken(idToken);
  const mobile = cleanMobile(payload.phone_number || "").slice(-10);
  if (!payload.phone_number || !isValidMobile(mobile)) throw new ApiError(400, MOBILE_ERROR);

  const { data: account, error: accountError } = await supabaseAdmin
    .from("users").select("id, email, name, role").eq("id", userId).maybeSingle();
  if (accountError || !account) throw new ApiError(404, "Account not found.");

  const [{ data: mobileAccount }, linked] = await Promise.all([
    supabaseAdmin.from("users").select("id").eq("email", mobileEmail(mobile)).neq("id", userId).maybeSingle(),
    findUserByVerifiedPhone(mobile, { excludeId: userId }),
  ]);
  if (mobileAccount || linked) {
    throw new ApiError(409, "This number is already linked to another VelvetWolf account. Use a different number, or sign in with this one.");
  }

  const now = new Date().toISOString();
  const { error: saveError } = await supabaseAdmin.from("profiles")
    .upsert({ id: userId, phone: mobile, phone_verified_at: now, updated_at: now }, { onConflict: "id" });
  if (saveError) {
    logError("Phone change save failed", profileLogContext({ userId, error: saveError }));
    if (saveError.code === UNDEFINED_COLUMN) throw new ApiError(503, "Changing your number isn't available yet. Try again later.");
    if (saveError.code === "23505") throw new ApiError(409, "This number is already linked to another VelvetWolf account.");
    throw new ApiError(500, "Couldn't save your number. Try again.");
  }

  let user = account;
  let token = null;
  if (isMobileEmail(account.email) && account.email !== mobileEmail(mobile)) {
    const { data: updated, error: emailError } = await supabaseAdmin.from("users")
      .update({ email: mobileEmail(mobile) }).eq("id", userId).select("id, email, name, role").single();
    if (emailError) {
      logError("Mobile sign-in change failed", profileLogContext({ userId, error: emailError }));
      throw new ApiError(500, "Couldn't move your sign-in to the new number. Try again.");
    }
    await supabaseAdmin.from("otps").delete().eq("email", account.email);
    await revokeUserSessions({ id: userId });
    user = updated;
    token = createJwt(updated);
  }

  logInfo("Mobile number confirmed", profileLogContext({ userId, signInChanged: Boolean(token) }));
  const profile = await getProfileById(userId);
  return { ...(token ? { token } : {}), user: { ...user, ...(profile || {}) } };
}

export async function sendEmailUpdateOtp({ userId, newEmail }) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  const normalizedEmail = String(newEmail || "").toLowerCase().trim();
  if (!normalizedEmail) throw new ApiError(400, "New email is required.");
  
  if (!isValidEmail(normalizedEmail)) throw new ApiError(400, EMAIL_ERROR);

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

  // Clean up any existing OTPs of this type for the same user
  await supabaseAdmin.from("otps").delete().eq("email", currentUser.email).like("type", "Change-Email-OTP:%");

  // Insert new OTP
  const { error: insertError } = await supabaseAdmin
    .from("otps")
    .insert({
      email: currentUser.email,
      otp,
      expires_at: expiresAt,
      type: `Change-Email-OTP:${normalizedEmail}`
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
  const type = `Change-Email-OTP:${normalizedEmail}`;

  if (!normalizedEmail || !otp) {
    throw new ApiError(400, "Email and OTP code are required.");
  }

  logInfo("Verifying email update OTP", profileLogContext({ userId: normalizedUserId, newEmail: normalizedEmail }));

  // Check if it's bypass OTP in local dev environment
  const isBypassOtp = otp === "123456" && isLocalDevelopment();

  // Current email: the OTP is stored under it
  const { data: currentUser, error: currentUserError } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", normalizedUserId)
    .single();

  if (currentUserError || !currentUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!isBypassOtp) {

    // Lookup OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("otps")
      .select("*")
      .eq("email", currentUser.email)
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

  // A mobile-only account linking an email keeps signing in with its number:
  // record that number as confirmed (it was proved at sign-in) so a phone
  // sign-in still finds this account once its email changes.
  const ownMobile = mobileOfEmail(currentUser.email);
  if (ownMobile) {
    const { error: phoneError } = await supabaseAdmin.from("profiles")
      .upsert({ id: normalizedUserId, phone: ownMobile, phone_verified_at: new Date().toISOString() }, { onConflict: "id" });
    if (phoneError) logWarn("Could not keep the sign-in number while linking an email", profileLogContext({ userId: normalizedUserId, code: phoneError.code }));
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

  // Sessions carry the old email: end them all, then issue this device a new
  // one (signed after the revocation, so it stays valid).
  await revokeUserSessions({ id: normalizedUserId });

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


// Deletes the account and everything tied to it: profile, cart, wishlist,
// style profile and saved addresses go with it (ON DELETE CASCADE). Past
// orders stay on record without the account link (orders.user_id is
// ON DELETE SET NULL), because invoices have to be kept.
export async function deleteAccount(userId) {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users").select("id, email, role").eq("id", userId).maybeSingle();
  if (userError) {
    logError("Account lookup failed before delete", profileLogContext({ userId, error: userError }));
    throw new ApiError(500, "Could not delete your account. Please try again.");
  }
  if (!user) throw new ApiError(404, "Account not found.");
  if (user.role === "admin") {
    throw new ApiError(403, "Admin accounts can't be deleted from here. Remove the admin role first.");
  }

  await supabaseAdmin.from("otps").delete().eq("email", user.email);

  const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (deleteError) {
    logError("Account delete failed", profileLogContext({ userId, error: deleteError }));
    // 23503: something still references the user without a cascade rule.
    throw new ApiError(deleteError.code === "23503" ? 409 : 500, "Could not delete your account. Please contact support.");
  }

  logInfo("Account deleted", profileLogContext({ userId }));
  return { success: true };
}
