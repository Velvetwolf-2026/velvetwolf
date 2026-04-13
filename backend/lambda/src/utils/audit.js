import { supabaseAdmin } from "../config/supabase.js";
import { logError } from "./http.js";

/**
 * Writes a structured entry to the audit_logs table.
 * Non-blocking — errors are logged but never thrown so they cannot disrupt
 * the primary request flow.
 *
 * @param {object} params
 * @param {string} params.action       e.g. "user.signup", "product.create", "order.status_update"
 * @param {string} [params.userId]     ID of the acting end-user (if applicable)
 * @param {string} [params.adminId]    ID of the acting admin (if applicable)
 * @param {string} params.resource     Table / domain name, e.g. "users", "products", "orders"
 * @param {string} [params.resourceId] Primary key of the affected row
 * @param {object} [params.meta]       Any extra context (status change, product name, etc.)
 */
export async function auditLog({ action, userId, adminId, resource, resourceId, meta = {} }) {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      action,
      user_id: userId || null,
      admin_id: adminId || null,
      resource,
      resource_id: resourceId ? String(resourceId) : null,
      meta,
    });

    if (error) {
      logError("Audit log DB insert failed", { action, userId, adminId, resource, resourceId, error });
    }
  } catch (err) {
    // Non-critical — log but never propagate
    logError("Audit log write threw unexpectedly", { action, userId, adminId, resource, error: err });
  }
}
