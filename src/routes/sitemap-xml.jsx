import { loadProductsFromAPI } from "../velvetwolf/utils/products";

const SITE_URL = "https://velvetwolf.in";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/collections",
  "/quiz",
  "/custom",
  "/bulk",
  "/contact",
  "/faq",
  "/privacy-policy",
  "/terms",
  "/shipping-policy",
  "/returns",
  "/size-guide",
  "/track-order",
];

function urlEntry(path, { changefreq = "weekly", priority = "0.6" } = {}) {
  return `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function loader() {
  let products = [];
  try {
    products = await loadProductsFromAPI();
  } catch {
    products = [];
  }

  const entries = [
    urlEntry("/", { changefreq: "daily", priority: "1.0" }),
    ...STATIC_PATHS.filter((p) => p !== "/").map((p) => urlEntry(p)),
    ...products
      .filter((p) => p.slug)
      .map((p) => urlEntry(`/product/${p.slug}`, { changefreq: "weekly", priority: "0.8" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
