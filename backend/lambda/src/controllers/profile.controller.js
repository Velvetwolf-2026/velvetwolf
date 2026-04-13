import * as profileService from "../services/profile.service.js";
import { ApiError, jsonResponse } from "../utils/http.js";

export async function getProfile(query, event) {
  if (!query.id) throw new ApiError(400, "id is required.");
  const profile = await profileService.getProfileById(query.id);
  return jsonResponse(200, { profile }, {}, event);
}
