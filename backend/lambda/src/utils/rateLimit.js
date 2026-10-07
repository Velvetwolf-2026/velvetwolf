import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logWarn } from "./http.js";

/**
 * Rate limiting on the existing check_rate_limit_gate / record_rate_attempt
 * SQL functions (see schema.sql), for non-auth endpoints.
 *
 * Fails OPEN: if the rate-limit store itself errors, the request is allowed,
 * so an outage there can't take down the feature being protected.
 */
export async function assertNotRateLimited(key, { max, windowSecs, blockSecs }) {
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit_gate", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSecs,
    p_block_seconds: blockSecs,
  });
  if (error) {
    logError("Rate limit check failed; allowing request", { service: "rate-limit", key, error });
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.blocked) {
    const mins = Math.max(1, Math.ceil((row.retry_after_seconds || 60) / 60));
    logWarn("Rate limit blocked request", { service: "rate-limit", key, retryAfterSeconds: row.retry_after_seconds });
    throw new ApiError(429, `Too many attempts. Try again in ${mins} min.`);
  }
}

export async function recordRateLimitedAttempt(key) {
  const { error } = await supabaseAdmin.rpc("record_rate_attempt", { p_key: key });
  if (error) logError("Failed to record rate-limited attempt", { service: "rate-limit", key, error });
}
