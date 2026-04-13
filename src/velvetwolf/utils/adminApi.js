import { apiUrl } from './api';

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

function getAdminHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function adminFetch(method, path, body) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: getAdminHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function fetchAdminDashboard() {
  return adminFetch('GET', '/admin/dashboard');
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export async function fetchAdminOrders({ status, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  return adminFetch('GET', `/admin/orders?${params}`);
}

export async function updateOrderStatus(orderId, status) {
  return adminFetch('PATCH', `/admin/orders/${orderId}/status`, { status });
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function fetchAdminProducts({ collection, search, page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (collection) params.set('collection', collection);
  if (search) params.set('search', search);
  return adminFetch('GET', `/admin/products?${params}`);
}

export async function createProduct(data) {
  return adminFetch('POST', '/admin/products', data);
}

export async function updateProduct(productId, data) {
  return adminFetch('PUT', `/admin/products/${productId}`, data);
}

export async function deleteProduct(productId) {
  return adminFetch('DELETE', `/admin/products/${productId}`);
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export async function fetchAdminCustomers({ search, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  return adminFetch('GET', `/admin/customers?${params}`);
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function fetchAdminAnalytics() {
  return adminFetch('GET', '/admin/analytics');
}
