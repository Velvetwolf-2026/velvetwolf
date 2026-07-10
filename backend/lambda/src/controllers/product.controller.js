import * as productService from "../services/product.service.js";
import { jsonResponse } from "../utils/http.js";

export async function getProducts(query, event) {
  const products = await productService.getProducts({
    collection: query.collection,
    search: query.search,
  });
  return jsonResponse(200, { products }, {}, event);
}

export async function getProductBySlug(slug, event) {
  const product = await productService.getProductBySlug(slug);
  return jsonResponse(200, { product }, {}, event);
}

export async function getProductReviews(productId, event) {
  if (!productId) {
    return jsonResponse(400, { error: "Product ID is required." }, {}, event);
  }
  const reviews = await productService.getProductReviews(productId);
  return jsonResponse(200, { reviews }, {}, event);
}

export async function createProductReview(productId, body, event) {
  if (!productId) {
    return jsonResponse(400, { error: "Product ID is required." }, {}, event);
  }
  const { name, rating, comment, images } = body || {};
  if (!name) {
    return jsonResponse(400, { error: "Name is required." }, {}, event);
  }
  const review = await productService.createProductReview(productId, { name, rating: Number(rating), comment, images });
  return jsonResponse(201, { review }, {}, event);
}

