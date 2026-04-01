import { apiUrl } from './api';

export async function loadCartFromDB(userId) {
  const response = await fetch(
    `${apiUrl('/cart')}?userId=${encodeURIComponent(userId)}`
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load cart.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

export async function addCartItemDB(userId, product, qty = 1) {
  const response = await fetch(apiUrl('/cart/add'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      productId: product?.id,
      quantity: qty,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to add cart item.');
  }
}

export async function updateCartQtyDB(cartItemId, qty) {
  const response = await fetch(apiUrl('/cart/update'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartItemId,
      quantity: qty,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to update cart item.');
  }
}

export async function removeCartItemDB(cartItemId) {
  const response = await fetch(apiUrl('/cart/remove'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItemId }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to remove cart item.');
  }
}

export async function mergeGuestCart(userId) {
  const guestCart = JSON.parse(localStorage.getItem('vw_guest_cart') || '[]');

  for (const item of guestCart) {
    await addCartItemDB(userId, item, item.qty);
  }

  localStorage.removeItem('vw_guest_cart');
}
