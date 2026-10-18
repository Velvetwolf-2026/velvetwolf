import * as profileService from "../services/profile.service.js";
import { ApiError, jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";
import * as authService from "../services/auth.service.js";
import * as addressService from "../services/address.service.js";
import { addressSchema, deleteAccountSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { auditLog } from "../utils/audit.js";

export async function getProfile(query, event) {
  const user = await requireAuth(event);
  if (!query.id) throw new ApiError(400, "id is required.");
  if (query.id !== user.id) {
    throw new ApiError(403, "Access denied. Cannot view another user's profile.");
  }
  const profile = await profileService.getProfileById(user.id);
  return jsonResponse(200, { profile }, {}, event);
}

export async function updateProfile(body, event) {
  const user = await requireAuth(event);
  const { id, fullName, phone, gender, dob } = body;
  if (!id) throw new ApiError(400, "id is required.");
  if (id !== user.id) {
    throw new ApiError(403, "Access denied. Cannot update another user's profile.");
  }

  const profile = await profileService.updateProfile(user.id, { fullName, phone, gender, dob });
  return jsonResponse(200, { profile }, {}, event);
}

// A new mobile number, confirmed with a Firebase SMS code (body: { token }).
// A mobile-only account's sign-in moves to the new number, so a new session
// cookie is issued then.
export async function verifyPhone(body, event) {
  const user = await requireAuth(event);
  const result = await profileService.verifyPhoneChange(user.id, body?.token);
  return authService.buildSessionResponse(result, event);
}

export async function sendEmailOtp(body, event) {
  const user = await requireAuth(event);
  const { newEmail } = body;
  if (!newEmail) throw new ApiError(400, "New email is required.");

  const result = await profileService.sendEmailUpdateOtp({ userId: user.id, newEmail });
  return jsonResponse(200, result, {}, event);
}

export async function verifyEmailOtp(body, event) {
  const user = await requireAuth(event);
  const { newEmail, otp } = body;
  if (!newEmail) throw new ApiError(400, "New email is required.");
  if (!otp) throw new ApiError(400, "OTP is required.");

  const result = await profileService.verifyEmailUpdateOtp({ userId: user.id, newEmail, otp });
  // Email is part of the JWT, so a new session cookie is issued.
  return authService.buildSessionResponse(result, event);
}

export async function getStyleProfile(query, event) {
  const user = await requireAuth(event);
  const profile = await profileService.getStyleProfile(user.id);
  return jsonResponse(200, { profile }, {}, event);
}

export async function saveStyleProfile(body, event) {
  const user = await requireAuth(event);
  const { personalityType, quizScore } = body;
  if (!personalityType) throw new ApiError(400, "personalityType is required.");
  if (!quizScore) throw new ApiError(400, "quizScore is required.");

  const profile = await profileService.saveStyleProfile(user.id, { personalityType, quizScore });
  return jsonResponse(200, { profile }, {}, event);
}

export async function clearStyleProfile(body, event) {
  const user = await requireAuth(event);
  const result = await profileService.clearStyleProfile(user.id);
  return jsonResponse(200, result, {}, event);
}

export async function getUserOrders(query, event) {
  const user = await requireAuth(event);
  const orders = await profileService.getUserOrders(user.id);
  return jsonResponse(200, { orders }, {}, event);
}

// ---- saved addresses ----
export async function listAddresses(query, event) {
  const user = await requireAuth(event);
  const addresses = await addressService.listAddresses(user.id);
  return jsonResponse(200, { addresses }, {}, event);
}

export async function createAddress(body, event) {
  const user = await requireAuth(event);
  const data = validate(addressSchema)(body);
  const address = await addressService.createAddress(user.id, data);
  return jsonResponse(201, { address }, {}, event);
}

export async function updateAddress(addressId, body, event) {
  const user = await requireAuth(event);
  const data = validate(addressSchema)(body);
  const address = await addressService.updateAddress(user.id, addressId, data);
  return jsonResponse(200, { address }, {}, event);
}

export async function deleteAddress(addressId, event) {
  const user = await requireAuth(event);
  const result = await addressService.deleteAddress(user.id, addressId);
  return jsonResponse(200, result, {}, event);
}

// ---- delete account ----
export async function deleteAccount(body, event) {
  const user = await requireAuth(event);
  validate(deleteAccountSchema)(body);
  await profileService.deleteAccount(user.id);
  await auditLog({ action: "user.delete", userId: user.id, resource: "users", resourceId: user.id });
  // Sign this browser out (the account no longer exists, so any other
  // session's token is rejected by requireAuth's user lookup).
  const headers = { "Set-Cookie": [authService.getLogoutCookieHeader(), authService.getLogoutCsrfCookieHeader()] };
  return jsonResponse(200, { success: true }, headers, event);
}
