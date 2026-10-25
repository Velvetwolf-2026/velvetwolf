import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo, logWarn } from "../utils/http.js";

// Postgres "undefined_column": the sessions_valid_after migration hasn't run.
const UNDEFINED_COLUMN = "42703";
// Postgres "undefined_table" / PostgREST "table not in the schema cache": the
// ended_sessions migration hasn't run.
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

// Sessions are signed tokens, so signing out used to only delete the cookie: a
// copy of the token (another tab, a stolen cookie) kept working for up to 7
// days. Signing out now records the token (as a hash, never the token itself)
// in ended_sessions, and requireAuth refuses recorded tokens. Only that
// session ends; the customer stays signed in on their other devices.
const sessionKey = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

/**
 * Ends one session. Never throws: signing out must always clear the browser,
 * whatever the database says (e.g. before the migration runs).
 */
export async function endSession(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return false; // expired or not ours: nothing left to end
  }

  const { error } = await supabaseAdmin.from("ended_sessions").insert({
    token_hash: sessionKey(token),
    user_id: payload.id || null,
    expires_at: new Date((payload.exp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  });
  // 23505: this session was already ended (signing out twice)
  if (error && error.code !== "23505") {
    if (MISSING_TABLE.has(error.code)) logWarn("Sign-out could not end the session: ended_sessions table missing (run the migration in schema.sql)", { service: "session" });
    else logError("Failed to end session", { service: "session", userId: payload.id, error });
    return false;
  }

  // Tokens past their expiry are refused anyway, so their rows can go.
  await supabaseAdmin.from("ended_sessions").delete().lt("expires_at", new Date().toISOString());
  logInfo("Session ended", { service: "session", userId: payload.id });
  return true;
}

/** True when this session was signed out. */
export async function isSessionEnded(token) {
  const { data, error } = await supabaseAdmin
    .from("ended_sessions")
    .select("token_hash")
    .eq("token_hash", sessionKey(token))
    .maybeSingle();
  if (error && MISSING_TABLE.has(error.code)) return false;
  if (error) {
    logError("Ended-session lookup failed", { service: "session", error });
    // 503, not 401: a DB blip must not make the frontend sign the user out.
    throw new ApiError(503, "Unable to verify your session right now. Please try again.");
  }
  return Boolean(data);
}

/**
 * Ends every existing session for a user: requireAuth rejects tokens issued
 * before users.sessions_valid_after. Call it BEFORE signing a replacement
 * token (e.g. after an email change) so the new token stays valid.
 *
 * Never throws: revocation is a hardening step and must not make the
 * password reset / email change itself fail (e.g. before the migration runs).
 *
 * @param {{ id?: string, email?: string }} match - which user (by id or email)
 */
export async function revokeUserSessions(match) {
  const [column, value] = match.id ? ["id", match.id] : ["email", match.email];
  const { error } = await supabaseAdmin
    .from("users")
    .update({ sessions_valid_after: new Date().toISOString() })
    .eq(column, value);

  if (error?.code === UNDEFINED_COLUMN) {
    logWarn("Session revocation skipped: users.sessions_valid_after column missing (run the migration in schema.sql)", { service: "session" });
    return false;
  }
  if (error) {
    logError("Session revocation failed", { service: "session", by: column, error });
    return false;
  }
  logInfo("Revoked existing sessions", { service: "session", by: column });
  return true;
}
