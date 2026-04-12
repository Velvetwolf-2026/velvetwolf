import { apiUrl } from './api';

export async function loadProductsFromAPI({ collection, search } = {}) {
  const params = new URLSearchParams();
  if (collection) params.set('collection', collection);
  if (search) params.set('search', search);

  const url = params.toString()
    ? `${apiUrl('/products')}?${params.toString()}`
    : apiUrl('/products');

  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load products.');
  }

  return Array.isArray(payload.products) ? payload.products : [];
}
