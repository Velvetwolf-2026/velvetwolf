import { supabaseAdmin } from "./config/supabase.js";
import { ApiError, logError, logInfo } from "./http.js";

function profileLogContext(context = {}) {
  return { service: "profile", ...context };
}

export async function getProfileById(userId) {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new ApiError(400, "Profile id is required.");
  }

  logInfo("Fetching profile by id", profileLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (error) {
    logError("Profile lookup failed", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(400, error.message || "Failed to load profile.");
  }

  return data || null;
}
