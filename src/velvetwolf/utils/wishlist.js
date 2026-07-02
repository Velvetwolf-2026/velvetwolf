import { apiUrl } from './api';

export async function loadWishlistFromDB(userId) {
  const token = localStorage.getItem('token');
  const url = userId 
    ? `${apiUrl('/wishlist')}?userId=${encodeURIComponent(userId)}`
    : `${apiUrl('/wishlist')}`;
  const response = await fetch(
    url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load wishlist.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

export async function toggleWishlistDB(userId, product) {
  const token = localStorage.getItem('token');
  const response = await fetch(apiUrl('/wishlist/toggle'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      userId,
      productId: product?.id,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to update wishlist.');
  }

  return Boolean(payload.added);
}
