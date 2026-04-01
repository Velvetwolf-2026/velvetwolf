import { apiUrl } from './api';

export async function loadWishlistFromDB(userId) {
  const response = await fetch(
    `${apiUrl('/wishlist')}?userId=${encodeURIComponent(userId)}`
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load wishlist.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

export async function toggleWishlistDB(userId, product) {
  const response = await fetch(apiUrl('/wishlist/toggle'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
