import { supabase } from './supabase';
import { logAudit } from './audit';

export async function placeOrder(userId, { cart, address, paymentMethod, cartTotal }) {
  const shipping = cartTotal >= 1999 ? 0 : 149;
  const tax      = Math.round(cartTotal * 0.18);
  const total    = cartTotal + shipping + tax;

  // Validate address
  if (!address.name || !address.phone || !address.address || !address.pincode) {
    throw new Error('Incomplete delivery address');
  }
  if (!/^\d{6}$/.test(address.pincode)) throw new Error('Invalid pincode');

  // 1. Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id:          userId,
      subtotal:         cartTotal,
      shipping_amount:  shipping,
      tax_amount:       tax,
      total_amount:     total,
      payment_method:   paymentMethod,
      shipping_address: address,
    })
    .select()
    .single();
  if (orderErr) throw orderErr;

  // 2. Insert order items
  const items = cart.map(i => ({
    order_id:     order.id,
    product_id:   i.id,
    product_name: i.name,
    size:         i.size,
    color:        i.color,
    quantity:     i.qty,
    unit_price:   i.price,
    total_price:  i.price * i.qty,
  }));
  const { error: itemsErr } = await supabase.from('order_items').insert(items);
  if (itemsErr) throw itemsErr;

  // 3. Clear DB cart
  await supabase.from('cart_items').delete().eq('user_id', userId);

  // 4. Audit log
  await logAudit(userId, 'order_placed', 'order', order.id, { total, item_count: cart.length });

  return order;
}

export async function getUserOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllOrders() {
  // Admin only — RLS ensures this
  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, phone), order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status) {
  const updates = { status };
  if (status === 'dispatched') updates.dispatched_at = new Date().toISOString();
  if (status === 'delivered')  updates.delivered_at  = new Date().toISOString();
  const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
  if (error) throw error;
}