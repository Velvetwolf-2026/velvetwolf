import { supabaseAdmin } from "../config/supabase.js";
import { logError, logInfo, logWarn } from "../utils/http.js";

// Postgres "undefined_column": the sessions_valid_after migration hasn't run.
const UNDEFINED_COLUMN = "42703";

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
