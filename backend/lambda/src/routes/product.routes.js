import * as productController from "../controllers/product.controller.js";

export async function handleProductRoutes(method, route, body, query, event) {
  if (method === "GET" && route === "/products")
    return productController.getProducts(query, event);

  if (method === "GET" && route.startsWith("/products/")) {
    const slug = route.substring("/products/".length);
    return productController.getProductBySlug(slug, event);
  }

  return null;
}

