import { apiUrl } from './api';
import { INITIAL_COLLECTION_PRODUCTS } from './collectionsData';

export async function loadProductsFromAPI({ collection, search } = {}) {
  try {
    const params = new URLSearchParams();
    if (collection) params.set('collection', collection);
    if (search) params.set('search', search);

    const url = params.toString()
      ? `${apiUrl('/products')}?${params.toString()}`
      : apiUrl('/products');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      credentials: 'include',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(payload.products) || payload.products.length === 0) {
      return filterProducts(INITIAL_COLLECTION_PRODUCTS, { collection, search });
    }

    return payload.products;
  } catch (err) {
    console.warn('[loadProductsFromAPI] Fallback to initial products:', err.message);
    return filterProducts(INITIAL_COLLECTION_PRODUCTS, { collection, search });
  }
}

function filterProducts(list, { collection, search } = {}) {
  let result = [...list];
  if (collection) {
    result = result.filter(p => p.collection === collection);
  }
  if (search) {
    const term = search.toLowerCase();
    result = result.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.collection?.toLowerCase().includes(term)
    );
  }
  return result;
}
