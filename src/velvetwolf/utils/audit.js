import { supabase } from './supabase';

export async function logAudit(userId, action, entity = null, entityId = null, metadata = {}) {
  try {
    await supabase.from('audit_logs').insert({
      user_id:    userId,
      action,
      entity,
      entity_id:  entityId ? String(entityId) : null,
      metadata,
      user_agent: navigator.userAgent.slice(0, 200),
    });
  } catch (e) {
    // Audit failures should never break the user experience
    console.warn('[Audit]', e.message);
  }
}

// Call these at the right moments:
// logAudit(user.id, 'login')                            → on sign-in
// logAudit(user.id, 'logout')                           → on sign-out
// logAudit(user.id, 'order_placed', 'order', order.id)  → on checkout
// logAudit(user.id, 'cart_add', 'product', product.id)  → on addToCart
// logAudit(user.id, 'profile_update')                   → on save settings
// logAudit(user.id, 'admin_action', 'product', id, {op})

export async function getAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}