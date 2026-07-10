import * as productController from "../controllers/product.controller.js";

export async function handleProductRoutes(method, route, body, query, event) {
  if (method === "GET" && route === "/products")
    return productController.getProducts(query, event);

  const productReviewsMatch = route.match(/^\/products\/([^/]+)\/reviews$/);
  if (productReviewsMatch) {
    const productId = productReviewsMatch[1];
    if (method === "GET") {
      return productController.getProductReviews(productId, event);
    }
    if (method === "POST") {
      return productController.createProductReview(productId, body, event);
    }
  }

  if (method === "GET" && route.startsWith("/products/")) {
    const slug = route.substring("/products/".length);
    return productController.getProductBySlug(slug, event);
  }

  return null;
}

