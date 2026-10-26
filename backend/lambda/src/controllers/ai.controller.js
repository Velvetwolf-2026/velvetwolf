import * as aiService from "../services/ai.service.js";
import { jsonResponse, getClientIp } from "../utils/http.js";
import { assertNotRateLimited, recordRateLimitedAttempt } from "../utils/rateLimit.js";
import { assertReasonableInput } from "../middleware/validate.js";
import { toPublicProduct } from "../services/product.service.js";

// The stylist is public and every call reads the whole catalogue, so it is throttled
// per visitor, and its input is bounded.
const AI_RATE_LIMIT = { max: 40, windowSecs: 10 * 60, blockSecs: 10 * 60 };
const MAX_TEXT = 300;
const MAX_MESSAGES = 20;

async function throttle(event) {
  const key = `ai:${getClientIp(event) || "unknown"}`;
  await assertNotRateLimited(key, AI_RATE_LIMIT);
  await recordRateLimitedAttempt(key);
}

const clip = (v) => String(v ?? "").slice(0, MAX_TEXT);
// raw product rows carry internal columns (cost price, flags); send the shop's public shape
const publicList = (rows) => (Array.isArray(rows) ? rows : []).map((r) => (r && r.price !== undefined ? toPublicProduct(r) : r));

export async function search(body, event) {
  const query = clip(body?.query).trim();
  if (!query) {
    return jsonResponse(400, { error: "Query parameter is required" }, {}, event);
  }
  await throttle(event);
  const products = await aiService.searchAiProducts(query);
  return jsonResponse(200, { products: publicList(products) }, {}, event);
}

export async function recommendSize(body, event) {
  const { height, weight, age, preferredFit } = body;
  if (!height || !weight) {
    return jsonResponse(400, { error: "Height and Weight are required parameters" }, {}, event);
  }
  const recommendedSize = aiService.recommendSize({ height, weight, age, preferredFit });
  return jsonResponse(200, { recommendedSize }, {}, event);
}

export async function getRecommendations(body, event) {
  assertReasonableInput(body);
  const { history, wishlist, cart, userId } = body || {};
  await throttle(event);
  const recommendations = await aiService.getPersonalizedRecommendations({
    history: history || [],
    wishlist: wishlist || [],
    cart: cart || [],
    userId
  });
  return jsonResponse(200, { recommendations: publicList(recommendations) }, {}, event);
}

export async function getBundles(query, event) {
  const { productId } = query;
  if (!productId) {
    return jsonResponse(400, { error: "Product ID is required" }, {}, event);
  }
  await throttle(event);
  const bundles = await aiService.getSmartBundles(clip(productId));
  return jsonResponse(200, { bundles: Array.isArray(bundles) ? bundles.map((b) => (b && Array.isArray(b.products) ? { ...b, products: publicList(b.products) } : b)) : bundles }, {}, event);
}

export async function chatAssistant(body, event) {
  const { messages } = body || {};
  if (!messages || !Array.isArray(messages)) {
    return jsonResponse(400, { error: "Messages array is required" }, {}, event);
  }
  await throttle(event);
  // only the recent turns, each as plain text of a bounded length
  const recent = messages.slice(-MAX_MESSAGES).map((m) => ({ role: m?.role === "user" ? "user" : "assistant", content: clip(m?.content) }));
  const chatResponse = await aiService.chatAssistantDialog(recent);
  return jsonResponse(200, { ...chatResponse, products: publicList(chatResponse?.products) }, {}, event);
}
