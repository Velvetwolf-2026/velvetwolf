import * as cartService from "../services/cart.service.js";
import { cartAddSchema, cartUpdateSchema, cartRemoveSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { ApiError, jsonResponse } from "../utils/http.js";

export async function getCart(query, event) {
  if (!query.userId) throw new ApiError(400, "userId is required.");
  const items = await cartService.getCartByUserId(query.userId);
  return jsonResponse(200, { items }, {}, event);
}

export async function addItem(body, event) {
  const data = validate(cartAddSchema)(body);
  const result = await cartService.addCartItemByUserId(data.userId, data.productId, data.quantity);
  return jsonResponse(200, result, {}, event);
}

export async function updateItem(body, event) {
  const data = validate(cartUpdateSchema)(body);
  const result = await cartService.updateCartItemQuantity(data.cartItemId, data.quantity);
  return jsonResponse(200, result, {}, event);
}

export async function removeItem(body, event) {
  const data = validate(cartRemoveSchema)(body);
  const result = await cartService.removeCartItemById(data.cartItemId);
  return jsonResponse(200, result, {}, event);
}
