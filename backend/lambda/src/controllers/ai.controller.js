import * as aiService from "../services/ai.service.js";
import { jsonResponse } from "../utils/http.js";

export async function search(body, event) {
  const { query } = body;
  if (!query) {
    return jsonResponse(400, { error: "Query parameter is required" }, {}, event);
  }
  const products = await aiService.searchAiProducts(query);
  return jsonResponse(200, { products }, {}, event);
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
  const { history, wishlist, cart, userId } = body;
  const recommendations = await aiService.getPersonalizedRecommendations({
    history: history || [],
    wishlist: wishlist || [],
    cart: cart || [],
    userId
  });
  return jsonResponse(200, { recommendations }, {}, event);
}

export async function getBundles(query, event) {
  const { productId } = query;
  if (!productId) {
    return jsonResponse(400, { error: "Product ID is required" }, {}, event);
  }
  const bundles = await aiService.getSmartBundles(productId);
  return jsonResponse(200, { bundles }, {}, event);
}

export async function chatAssistant(body, event) {
  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return jsonResponse(400, { error: "Messages array is required" }, {}, event);
  }
  const chatResponse = await aiService.chatAssistantDialog(messages);
  return jsonResponse(200, chatResponse, {}, event);
}
