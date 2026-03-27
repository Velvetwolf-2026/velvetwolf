import { supabase } from './supabase';

// ── Load cart from DB → return as App.jsx cart array ────
export async function loadCartFromDB(userId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, products(*)')
    .eq('user_id', userId);
  if (error) throw error;
  // Shape matches App.jsx cart items
  return data.map(item => ({
    ...item.products,
    size: item.size,
    color: item.color,
    qty: item.quantity,
    cart_item_id: item.id,
  }));
}

// ── Add item (upsert — handles duplicate size+color) ────
export async function addCartItemDB(userId, product, size, color, qty = 1) {
  const { error } = await supabase.from('cart_items').upsert({
    user_id:    userId,
    product_id: product.id,
    size, color,
    quantity:   qty,
  }, {
    onConflict: 'user_id,product_id,size,color',
    ignoreDuplicates: false,
  });
  if (error) throw error;
}

// ── Update quantity ──────────────────────────────────────
export async function updateCartQtyDB(cartItemId, qty) {
  if (qty < 1) { await removeCartItemDB(cartItemId); return; }
  const { error } = await supabase
    .from('cart_items').update({ quantity: qty }).eq('id', cartItemId);
  if (error) throw error;
}

// ── Remove item ─────────────────────────────────────────
export async function removeCartItemDB(cartItemId) {
  await supabase.from('cart_items').delete().eq('id', cartItemId);
}

// ── Merge guest cart (localStorage) → DB on login ───────
export async function mergeGuestCart(userId) {
  const guestCart = JSON.parse(localStorage.getItem('vw_guest_cart') || '[]');
  for (const item of guestCart) {
    await addCartItemDB(userId, item, item.size, item.color, item.qty);
  }
  localStorage.removeItem('vw_guest_cart');
}