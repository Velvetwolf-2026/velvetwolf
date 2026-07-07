import { apiUrl } from './api';

export async function getUserOrders() {
  const token = localStorage.getItem('token');
  const response = await fetch(apiUrl('/profile/orders'), {
    credentials: 'include',
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