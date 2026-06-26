import * as aiController from "../controllers/ai.controller.js";

export async function handleAiRoutes(method, route, body, query, event) {
  if (!route.startsWith("/ai")) return null;

  if (method === "POST" && route === "/ai/search") {
    return aiController.search(body, event);
  }

  if (method === "POST" && route === "/ai/size-recommendation") {
    return aiController.recommendSize(body, event);
  }

  if (method === "POST" && route === "/ai/recommendations") {
    return aiController.getRecommendations(body, event);
  }

  if (method === "GET" && route === "/ai/bundles") {
    return aiController.getBundles(query, event);
  }

  if (method === "POST" && route === "/ai/chat") {
    return aiController.chatAssistant(body, event);
  }

  return null;
}
