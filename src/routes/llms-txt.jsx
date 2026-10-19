// /llms.txt (llmstxt.org): a short, plain-text guide to VelvetWolf for AI
// assistants, built from the same facts the site shows (help/content.js and
// the live catalogue), so it never says anything the pages don't.
import { loadProductsFromAPI } from "../velvetwolf/utils/products";
import { COLLECTIONS } from "../velvetwolf/utils/collectionsData";
import { BUSINESS, SHIPPING, RETURNS, FAQ } from "../velvetwolf/gallery/help/content";
import { SITE_URL } from "../velvetwolf/utils/seo";
import { STUDIO_PRICE, STUDIO_BOTH_SIDES } from "../velvetwolf/gallery/data";

const text = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export async function loader() {
  let products = [];
  try {
    products = (await loadProductsFromAPI()).filter((p) => p && p.slug && p.isActive !== false);
  } catch {
    products = [];
  }
  const prices = products.map((p) => Number(p.price)).filter((n) => n > 0);
  const [standard, express] = SHIPPING.methods;
  const used = new Set(products.map((p) => p.collection));

  const body = `# VelvetWolf

> VelvetWolf is an Indian clothing brand that makes heavyweight oversized tees: combed cotton jersey at 220 to 240 GSM, knitted, cut and sewn in Tirupur, Tamil Nadu, in sizes S to XXL. It sells online across India at ${SITE_URL}, and customers can design their own tee in the VelvetWolf Studio.

## Key facts
- Products: oversized graphic tees${prices.length ? `, ${rupees(Math.min(...prices))} to ${rupees(Math.max(...prices))}` : ""}; custom Studio tees ${rupees(STUDIO_PRICE)} (${rupees(STUDIO_PRICE + STUDIO_BOTH_SIDES)} printed on both sides), made to order.
- Delivery: India only. Dispatched in ${SHIPPING.dispatch[0]} to ${SHIPPING.dispatch[1]} business days. Standard delivery is free (${standard.days[0]} to ${standard.days[1]} working days); Express costs ${rupees(express.price)} (${express.days[0]} to ${express.days[1]} working days).
- Payment: prepaid only, by UPI, card, netbanking or wallet through Cashfree. No cash on delivery.
- Returns: ${RETURNS.windowDays} days from delivery for unworn tees with tags; free size exchanges while in stock; damaged or faulty items always taken back with a free pickup.
- Bulk and corporate orders: from 5 pieces, quote within 24 hours (${BUSINESS.emails.bulk}).
- Customer service: ${BUSINESS.emails.info}, ${BUSINESS.phone.label}, ${BUSINESS.hours.label}
- Based in ${BUSINESS.city}, India.

## Shop
- [All tees](${SITE_URL}/shop): every tee, in five colours
${COLLECTIONS.filter((c) => used.has(c.id)).map((c) => `- [${c.name}](${SITE_URL}/shop/${c.id})`).join("\n")}
- [Studio](${SITE_URL}/custom): design your own tee with text, your artwork or a VelvetWolf mark
- [Bulk and corporate orders](${SITE_URL}/bulk)

## Help
- [Size guide](${SITE_URL}/size-guide): flat measurements in cm for every size
- [Shipping policy](${SITE_URL}/shipping-policy)
- [Returns and exchanges](${SITE_URL}/returns)
- [FAQ](${SITE_URL}/faq)
- [Track an order](${SITE_URL}/track-order)
- [Contact](${SITE_URL}/contact)
- [Privacy policy](${SITE_URL}/privacy-policy)
- [Terms](${SITE_URL}/terms)

## Questions customers ask
${FAQ.map((f) => `### ${text(f.q)}\n${text(f.a)}`).join("\n\n")}
${products.length ? `\n## Tees in the shop now\n${products.slice(0, 80).map((p) => `- [${p.name}](${SITE_URL}/product/${p.slug}): ${rupees(p.price)}`).join("\n")}\n` : ""}`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
