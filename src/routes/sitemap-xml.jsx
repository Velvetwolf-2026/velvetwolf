// /sitemap.xml: every page search engines should index, at the live (www)
// address. Account, cart and checkout pages are left out (they're noindex).
import { loadProductsFromAPI } from "../velvetwolf/utils/products";
import { COLLECTIONS } from "../velvetwolf/utils/collectionsData";
import { SITE_URL } from "../velvetwolf/utils/seo";

const STATIC_PATHS = [
  ["/", "daily", "1.0"],
  ["/shop", "daily", "0.9"],
  ["/custom", "weekly", "0.8"],
  ["/bulk", "monthly", "0.6"],
  ["/quiz", "monthly", "0.5"],
  ["/size-guide", "monthly", "0.6"],
  ["/faq", "monthly", "0.6"],
  ["/contact", "monthly", "0.5"],
  ["/track-order", "monthly", "0.4"],
  ["/shipping-policy", "monthly", "0.5"],
  ["/returns", "monthly", "0.5"],
  ["/privacy-policy", "yearly", "0.3"],
  ["/terms", "yearly", "0.3"],
];

// The server starts with each deploy, so this is when the pages last changed.
const DEPLOYED = new Date().toISOString().slice(0, 10);

const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function urlEntry(path, changefreq = "weekly", priority = "0.6") {
  return `  <url>\n    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>\n    <lastmod>${DEPLOYED}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function loader() {
  let products = [];
  try {
    products = await loadProductsFromAPI();
  } catch {
    products = [];
  }
  const live = products.filter((p) => p && p.slug && p.isActive !== false);
  const usedCollections = new Set(live.map((p) => p.collection).filter(Boolean));

  const entries = [
    ...STATIC_PATHS.map(([path, freq, prio]) => urlEntry(path, freq, prio)),
    ...COLLECTIONS.filter((c) => usedCollections.has(c.id)).map((c) => urlEntry(`/shop/${c.id}`, "weekly", "0.7")),
    ...live.map((p) => urlEntry(`/product/${p.slug}`, "weekly", "0.8")),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
