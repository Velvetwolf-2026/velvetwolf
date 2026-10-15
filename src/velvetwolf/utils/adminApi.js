import { apiUrl } from './api';

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

function getAdminHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

async function adminFetch(method, path, body) {
  const res = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
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
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("vw-unauthorized"));
    }
    const fallback = res.status === 413
      ? "That's too much to send in one go. Try fewer or smaller photos."
      : data?.message || `Request failed (${res.status})`;
    const err = new Error(data?.error || fallback);
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

// New photos go straight to storage with one-time links (POST /admin/products/photo-upload), so
// the product request carries only their URLs. If the backend doesn't have that endpoint yet,
// the photos are sent inline as before.
function base64ToBlob(base64, type) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function uploadNewPhotos(newImages = []) {
  const urls = [];
  for (let i = 0; i < newImages.length; i++) {
    const img = newImages[i];
    const type = ['image/jpeg', 'image/png', 'image/webp'].includes(img.contentType) ? img.contentType : 'image/jpeg';
    let link;
    try {
      link = await adminFetch('POST', '/admin/products/photo-upload', { contentType: type });
    } catch (err) {
      if (err.status === 404 && i === 0) return null; // older backend: send inline
      throw err;
    }
    const put = await fetch(link.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': type, 'x-upsert': 'false' },
      body: base64ToBlob(img.base64, type),
    });
    if (!put.ok) throw new Error(`Photo ${i + 1} of ${newImages.length} didn't upload. Check your connection and try again.`);
    urls.push(img.color ? `${img.color}::${link.publicUrl}` : link.publicUrl);
  }
  return urls;
}

async function withUploadedPhotos(data) {
  const pending = (data.newImages || []).filter((img) => img?.base64);
  if (!pending.length) return data;
  const urls = await uploadNewPhotos(pending);
  if (!urls) return data;
  return { ...data, images: [...(Array.isArray(data.images) ? data.images : []), ...urls], newImages: [] };
}

export async function createProduct(data) {
  return adminFetch('POST', '/admin/products', await withUploadedPhotos(data));
}

export async function updateProduct(productId, data) {
  return adminFetch('PUT', `/admin/products/${productId}`, await withUploadedPhotos(data));
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

// ─── COUPONS ──────────────────────────────────────────────────────────────────

export async function fetchAdminCoupons() {
  return adminFetch('GET', '/admin/coupons');
}

export async function createAdminCoupon(data) {
  return adminFetch('POST', '/admin/coupons', data);
}

export async function updateAdminCoupon(couponId, data) {
  return adminFetch('PUT', `/admin/coupons/${couponId}`, data);
}

export async function deleteAdminCoupon(couponId) {
  return adminFetch('DELETE', `/admin/coupons/${couponId}`);
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function fetchAdminCategories() {
  return adminFetch('GET', '/admin/categories');
}

export async function createAdminCategory(data) {
  return adminFetch('POST', '/admin/categories', data);
}

export async function deleteAdminCategory(categoryId) {
  return adminFetch('DELETE', `/admin/categories/${categoryId}`);
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────

export async function updateProductInventory(productId, data) {
  return adminFetch('PATCH', `/admin/products/${productId}/inventory`, data);
}
