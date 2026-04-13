import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function profileLogContext(context = {}) {
  return { service: "profile", ...context };
}

export async function getProfileById(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new ApiError(400, "Profile id is required.");

  logInfo("Fetching profile by id", profileLogContext({ userId: normalizedUserId }));

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, name, role, last_login")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (error) {
    logError("Profile lookup failed", profileLogContext({ userId: normalizedUserId, error }));
    throw new ApiError(400, error.message || "Failed to load profile.");
  }

  return data || null;
}
