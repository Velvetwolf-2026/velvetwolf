import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, dbFailure, logError, logWarn } from "./http.js";

/**
 * Rate limiting on the check_rate_limit_gate / record_rate_attempt /
 * hit_rate_limit SQL functions (see schema.sql).
 *
 * Fails OPEN by default: if the rate-limit store itself errors, the request is
 * allowed, so an outage there can't take down the feature being protected.
 */

// Postgres/PostgREST "function does not exist": the hit_rate_limit migration hasn't run.
const MISSING_FUNCTION = new Set(["PGRST202", "42883"]);

function tooMany(row, verb) {
  const mins = Math.max(1, Math.ceil((row.retry_after_seconds || 60) / 60));
  return new ApiError(429, `Too many ${verb}. Try again in ${mins} min.`);
}

function storeFailed(key, error, failOpen) {
  logError(failOpen ? "Rate limit check failed; allowing request" : "Rate limit check failed", { service: "rate-limit", key, error });
  if (!failOpen) throw dbFailure(400, error);
}

export async function assertNotRateLimited(key, { max, windowSecs, blockSecs }, { failOpen = true, verb = "attempts" } = {}) {
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit_gate", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSecs,
    p_block_seconds: blockSecs,
  });
  if (error) return storeFailed(key, error, failOpen);

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.blocked) {
    logWarn("Rate limit blocked request", { service: "rate-limit", key, retryAfterSeconds: row.retry_after_seconds });
    throw tooMany(row, verb);
  }
}

export async function recordRateLimitedAttempt(key, { failOpen = true } = {}) {
  const { error } = await supabaseAdmin.rpc("record_rate_attempt", { p_key: key });
  if (error) {
    logError("Failed to record rate-limited attempt", { service: "rate-limit", key, error });
    if (!failOpen) throw dbFailure(400, error);
  }
}

/**
 * Counts this request and refuses it once the limit is reached, in one
 * database call. A separate check and record let requests sent at the same
 * moment all pass the check before any of them was counted. Before the
 * hit_rate_limit migration runs, it falls back to the check and record.
 *
 * verb: the wording of the refusal ("Too many attempts. Try again in 5 min.").
 */
export async function hitRateLimit(key, limit, { failOpen = true, verb = "attempts" } = {}) {
  const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
    p_key: key,
    p_max: limit.max,
    p_window_seconds: limit.windowSecs,
    p_block_seconds: limit.blockSecs,
  });
  if (error && MISSING_FUNCTION.has(error.code)) {
    await assertNotRateLimited(key, limit, { failOpen, verb });
    await recordRateLimitedAttempt(key, { failOpen });
    return;
  }
  if (error) return storeFailed(key, error, failOpen);

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.blocked) {
    logWarn("Rate limit blocked request", { service: "rate-limit", key, retryAfterSeconds: row.retry_after_seconds });
    throw tooMany(row, verb);
  }
}
