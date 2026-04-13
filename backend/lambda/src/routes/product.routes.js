import * as productController from "../controllers/product.controller.js";

export async function handleProductRoutes(method, route, body, query, event) {
  if (method === "GET" && route.endsWith("/products"))
    return productController.getProducts(query, event);

  return null;
}
