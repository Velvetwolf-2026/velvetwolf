// /robots.txt. Search engines and AI assistants (ChatGPT, Claude, Perplexity,
// Gemini) may read the shop, products and help pages, so they can answer
// questions about VelvetWolf and link to it; private pages stay out for all.
import { SITE_URL } from "../velvetwolf/utils/seo";

const PRIVATE = ["/admin", "/account", "/checkout", "/cart", "/saved/", "/wishlist", "/payment-status", "/api/"];
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot"];

export function loader() {
  const rules = PRIVATE.map((p) => `Disallow: ${p}`).join("\n");
  const groups = [
    `User-agent: *\nAllow: /\n${rules}`,
    ...AI_CRAWLERS.map((bot) => `User-agent: ${bot}\nAllow: /\n${rules}`),
  ];
  const body = `${groups.join("\n\n")}\n\n# A plain-text summary of the shop for AI assistants\n# ${SITE_URL}/llms.txt\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
