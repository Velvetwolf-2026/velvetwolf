import { apiUrl } from './api';

export async function loadCartFromDB(userId) {
  const token = localStorage.getItem('token');
  const url = userId 
    ? `${apiUrl('/cart')}?userId=${encodeURIComponent(userId)}`
    : `${apiUrl('/cart')}`;
  const response = await fetch(
    url, {
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vw-unauthorized'));
    }
    throw new Error(payload.error || 'Invalid or expired token. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load cart.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

export async function addCartItemDB(userId, product, qty = 1, size = null, color = null) {
  const token = localStorage.getItem('token');
  const response = await fetch(apiUrl('/cart/add'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      userId,
      productId: product?.id,
      quantity: qty,
      size,
      color,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to add cart item.');
  }
}

export async function updateCartQtyDB(cartItemId, qty) {
  const token = localStorage.getItem('token');
  const response = await fetch(apiUrl('/cart/update'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
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
  const token = localStorage.getItem('token');
  const response = await fetch(apiUrl('/cart/remove'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ cartItemId }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to remove cart item.');
  }
}

export async function mergeGuestCart(userId) {
  const guestCart = JSON.parse(localStorage.getItem('vw_guest_cart') || '[]');
  if (!guestCart || guestCart.length === 0) return;

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(apiUrl('/cart/merge'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        userId,
        items: guestCart
      }),
    });

    if (response.ok) {
      localStorage.removeItem('vw_guest_cart');
    }
  } catch (err) {
    console.error('[mergeGuestCart]', err.message);
  }
}
