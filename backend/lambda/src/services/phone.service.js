// Mobile numbers that belong to an account. A number counts only once the
// customer has proved it with an SMS code (profiles.phone_verified_at), either
// by signing in with it or by confirming it in Settings. Signing in with that
// number then opens the same account instead of creating a second one.
import { supabaseAdmin } from "../config/supabase.js";
import { logError, logWarn } from "../utils/http.js";

export const MOBILE_DOMAIN = "@mobile.velvetwolf.in";

// Postgres "undefined_column": the VERIFIED MOBILE NUMBERS migration hasn't run.
export const UNDEFINED_COLUMN = "42703";

export const mobileEmail = (mobile) => `${mobile}${MOBILE_DOMAIN}`;
export const isMobileEmail = (email) => String(email || "").endsWith(MOBILE_DOMAIN);
export const mobileOfEmail = (email) => (isMobileEmail(email) ? String(email).slice(0, -MOBILE_DOMAIN.length) : "");

// The account that has verified this number, if any (never an unverified number
// someone typed into their profile: that would let anyone claim a number).
export async function findUserByVerifiedPhone(mobile, { excludeId = null } = {}) {
  let query = supabaseAdmin
    .from("profiles")
    .select("id, users!inner(id, email, name, role, type)")
    .eq("phone", mobile)
    .not("phone_verified_at", "is", null)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error?.code === UNDEFINED_COLUMN) {
    logWarn("profiles.phone_verified_at missing: run the VERIFIED MOBILE NUMBERS migration in schema.sql", { service: "phone" });
    return null;
  }
  if (error) {
    logError("Verified phone lookup failed", { service: "phone", error });
    return null;
  }
  const row = (data || [])[0];
  return row?.users || null;
}
