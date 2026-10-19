import { apiUrl } from './api';

export async function loadCartFromDB(userId) {
  const url = userId 
    ? `${apiUrl('/cart')}?userId=${encodeURIComponent(userId)}`
    : `${apiUrl('/cart')}`;
  const response = await fetch(
    url, {
      credentials: 'include',
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
  const response = await fetch(apiUrl('/cart/add'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(apiUrl('/cart/update'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(apiUrl('/cart/remove'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cartItemId }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to remove cart item.');
  }
}

// Items this browser holds instead of the account's saved cart: Studio tees
// (no product row) and anything the server couldn't take. A guest's live in
// vw_guest_cart; a signed-in customer's under their own key, so they never
// show to the next person on the same browser.
export const localCartKey = (userId) => (userId ? `vw_local_cart_${userId}` : 'vw_guest_cart');

export function readLocalCart(userId) {
  try {
    const items = JSON.parse(localStorage.getItem(localCartKey(userId)) || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(userId, items) {
  try {
    if (items.length) localStorage.setItem(localCartKey(userId), JSON.stringify(items));
    else localStorage.removeItem(localCartKey(userId));
  } catch { /* storage unavailable */ }
}

// After an account is deleted: nothing of it stays in this browser, so a new
// account (even with the same email) starts with an empty cart.
export function forgetAccountData(userId) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const key of keys) {
      if (!key) continue;
      if (key === 'user' || key === 'vw_guest_cart' || key === 'vw_guest_style_profile' || key === 'vw_user_preferences'
        || key.startsWith('vw_wishlist_') || (userId && (key === `vw_cart_${userId}` || key === localCartKey(userId)))) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* storage unavailable */ }
  try {
    for (const key of ['vw_last_checkout_cart', 'vw_last_checkout_total', 'vw_last_checkout_email', 'vw_last_checkout_name', 'vw_checkout_key']) sessionStorage.removeItem(key);
  } catch { /* storage unavailable */ }
}

// Signing in: the guest's catalogue tees go into the account's saved cart, and
// their Studio tees move to the account's own local cart.
export async function mergeGuestCart(userId) {
  const guestCart = readLocalCart(null);
  if (!guestCart || guestCart.length === 0) return;

  try {
    const catalogue = guestCart.filter((i) => !i.isCustom);
    const custom = guestCart.filter((i) => i.isCustom);
    let ok = true;
    if (catalogue.length) {
      const response = await fetch(apiUrl('/cart/merge'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, items: catalogue }),
      });
      ok = response.ok;
    }

    if (ok) {
      if (custom.length) writeLocalCart(userId, [...readLocalCart(userId), ...custom]);
      localStorage.removeItem('vw_guest_cart');
    }
  } catch (err) {
    console.error('[mergeGuestCart]', err.message);
  }
}
