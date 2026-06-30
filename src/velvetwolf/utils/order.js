import { apiUrl } from './api';

export async function getUserOrders(_userId) {
  const token = localStorage.getItem('token');
  const response = await fetch(apiUrl('/profile/orders'), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load user orders.');
  }

  return Array.isArray(payload.orders) ? payload.orders : [];
}