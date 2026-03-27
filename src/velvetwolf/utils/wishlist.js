import { supabase } from './supabase';

export async function loadWishlistFromDB(userId) {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id, products(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map(w => w.products);
}

export async function toggleWishlistDB(userId, product) {
  const { data: existing } = await supabase
    .from('wishlist_items').select('id')
    .eq('user_id', userId).eq('product_id', product.id).single();

  if (existing) {
    await supabase.from('wishlist_items').delete().eq('id', existing.id);
    return false; // removed
  } else {
    await supabase.from('wishlist_items').insert({ user_id: userId, product_id: product.id });
    return true; // added
  }
}