import { apiUrl } from './api';

export async function getUserOrders() {
  const response = await fetch(apiUrl('/profile/orders'), {
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load user orders.');
  }

  return Array.isArray(payload.orders) ? payload.orders : [];
}