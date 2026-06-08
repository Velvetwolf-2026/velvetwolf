import * as profileService from "../services/profile.service.js";
import { ApiError, jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";

export async function getProfile(query, event) {
  if (!query.id) throw new ApiError(400, "id is required.");
  const profile = await profileService.getProfileById(query.id);
  return jsonResponse(200, { profile }, {}, event);
}

export async function updateProfile(body, event) {
  const { id, fullName, phone, gender, dob } = body;
  if (!id) throw new ApiError(400, "id is required.");

  const profile = await profileService.updateProfile(id, { fullName, phone, gender, dob });
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

