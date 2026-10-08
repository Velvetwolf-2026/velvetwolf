// Real products (from the products API) as the gallery shows them.
import { COLORWAYS, COLOR_ORDER } from "./data";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n) => inr.format(Number(n) || 0);

const stripKey = (value) => {
  const s = String(value || "").trim();
  return s.includes("::") ? s.split("::").slice(1).join("::") : s;
};

// Photo for a product, in the given colorway when one exists for it.
// Images are stored as "Colour::url" (e.g. "Black::https://...").
export function photoFor(product, colorId) {
  const site = colorId ? COLORWAYS[colorId]?.site : null;
  const images = Array.isArray(product?.images) ? product.images : [];
  if (site) {
    const match = images.find((img) => typeof img === "string" && img.startsWith(`${site}::`));
    if (match) return stripKey(match);
  }
  if (typeof product?.image === "string" && product.image.trim() && !product.image.trim().startsWith("[")) {
    return stripKey(product.image);
  }
  const first = images.find((img) => typeof img === "string" && img.trim());
  return first ? stripKey(first) : null;
}

// The colorways a product is offered in, in gallery order.
export function colorwaysOf(product) {
  const names = new Set((product?.colors || []).map((c) => String(c).toLowerCase()));
  const list = COLOR_ORDER.filter((id) => names.has(COLORWAYS[id].site.toLowerCase()));
  return list.length ? list : ["noir"];
}

export const productHref = (product) => `/product/${product.slug || product.id}`;

// The products API returns the newest first, so the latest drops are the head
// of the list.
export const newestDrops = (products, count = 3) =>
  (Array.isArray(products) ? products : []).filter((p) => p && p.isActive !== false).slice(0, count);

export const fromPrice = (products) => {
  const prices = (products || []).map((p) => Number(p.price)).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
};
