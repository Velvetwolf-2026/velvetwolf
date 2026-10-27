import { supabaseAdmin } from "../config/supabase.js";

// A one-time code allows MAX_OTP_ATTEMPTS tries. Reading the count and saving
// count + 1 afterwards let requests sent at the same moment all compare against
// the same count (and overwrite each other's increments), so the 5-try limit
// didn't hold. Now each check first claims the next try: the update only
// matches while attempts still has the value this request read, so every
// comparison uses up one try, however many arrive at once.
export const MAX_OTP_ATTEMPTS = 5;

export async function claimOtpTry(record) {
  if (!record || !(record.attempts < MAX_OTP_ATTEMPTS)) return false;
  const { data, error } = await supabaseAdmin
    .from("otps")
    .update({ attempts: record.attempts + 1 })
    .eq("id", record.id)
    .eq("attempts", record.attempts)
    .select("id");
  return !error && Array.isArray(data) && data.length > 0;
}
