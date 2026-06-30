import * as profileService from "../services/profile.service.js";
import { ApiError, jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";

export async function getProfile(query, event) {
  const user = requireAuth(event);
  if (!query.id) throw new ApiError(400, "id is required.");
  if (query.id !== user.id) {
    throw new ApiError(403, "Access denied. Cannot view another user's profile.");
  }
  const profile = await profileService.getProfileById(user.id);
  return jsonResponse(200, { profile }, {}, event);
}

export async function updateProfile(body, event) {
  const user = requireAuth(event);
  const { id, fullName, phone, gender, dob } = body;
  if (!id) throw new ApiError(400, "id is required.");
  if (id !== user.id) {
    throw new ApiError(403, "Access denied. Cannot update another user's profile.");
  }

  const profile = await profileService.updateProfile(user.id, { fullName, phone, gender, dob });
  return jsonResponse(200, { profile }, {}, event);
}

export async function sendEmailOtp(body, event) {
  const user = requireAuth(event);
  const { newEmail } = body;
  if (!newEmail) throw new ApiError(400, "New email is required.");

  const result = await profileService.sendEmailUpdateOtp({ userId: user.id, newEmail });
  return jsonResponse(200, result, {}, event);
}

export async function verifyEmailOtp(body, event) {
  const user = requireAuth(event);
  const { newEmail, otp } = body;
  if (!newEmail) throw new ApiError(400, "New email is required.");
  if (!otp) throw new ApiError(400, "OTP is required.");

  const result = await profileService.verifyEmailUpdateOtp({ userId: user.id, newEmail, otp });
  return jsonResponse(200, result, {}, event);
}

export async function getStyleProfile(query, event) {
  const user = requireAuth(event);
  const profile = await profileService.getStyleProfile(user.id);
  return jsonResponse(200, { profile }, {}, event);
}

export async function saveStyleProfile(body, event) {
  const user = requireAuth(event);
  const { personalityType, quizScore } = body;
  if (!personalityType) throw new ApiError(400, "personalityType is required.");
  if (!quizScore) throw new ApiError(400, "quizScore is required.");

  const profile = await profileService.saveStyleProfile(user.id, { personalityType, quizScore });
  return jsonResponse(200, { profile }, {}, event);
}

export async function clearStyleProfile(body, event) {
  const user = requireAuth(event);
  const result = await profileService.clearStyleProfile(user.id);
  return jsonResponse(200, result, {}, event);
}

export async function getUserOrders(query, event) {
  const user = requireAuth(event);
  const orders = await profileService.getUserOrders(user.id);
  return jsonResponse(200, { orders }, {}, event);
}

