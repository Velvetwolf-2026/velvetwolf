import * as productService from "../services/product.service.js";
import { jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reviewSchema } from "../schemas/common.schema.js";
import { hitRateLimit } from "../utils/rateLimit.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 5 reviews per customer per hour, then an hour's block.
const REVIEW_RATE_LIMIT = { max: 5, windowSecs: 60 * 60, blockSecs: 60 * 60 };

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

// Reviews (and their photos, stored in the public product-images bucket) come
// from signed-in customers only, a few an hour, so the endpoint can't be used
// to flood products with fake reviews or as free file hosting.
export async function createProductReview(productId, body, event) {
  if (!productId) {
    return jsonResponse(400, { error: "Product ID is required." }, {}, event);
  }
  const user = await requireAuth(event);
  if (!UUID_RE.test(productId)) {
    return jsonResponse(404, { error: "Product not found." }, {}, event);
  }
  const data = validate(reviewSchema)(body || {});
  const rateKey = `review:${user.id}`;
  await hitRateLimit(rateKey, REVIEW_RATE_LIMIT);
  const review = await productService.createProductReview(productId, data);
  return jsonResponse(201, { review }, {}, event);
}

