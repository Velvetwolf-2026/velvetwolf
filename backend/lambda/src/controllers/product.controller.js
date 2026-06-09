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

