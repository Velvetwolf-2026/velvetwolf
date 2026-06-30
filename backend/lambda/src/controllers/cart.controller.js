import * as cartService from "../services/cart.service.js";
import { cartAddSchema, cartUpdateSchema, cartRemoveSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { ApiError, jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";

export async function getCart(query, event) {
  const user = requireAuth(event);
  const items = await cartService.getCartByUserId(user.id);
  return jsonResponse(200, { items }, {}, event);
}

export async function addItem(body, event) {
  const user = requireAuth(event);
  body.userId = user.id; // Enforce user ID from JWT
  const data = validate(cartAddSchema)(body);
  const result = await cartService.addCartItemByUserId(data.userId, data.productId, data.quantity, data.size, data.color);
  return jsonResponse(200, result, {}, event);
}

export async function updateItem(body, event) {
  const user = requireAuth(event);
  const data = validate(cartUpdateSchema)(body);
  const result = await cartService.updateCartItemQuantity(user.id, data.cartItemId, data.quantity);
  return jsonResponse(200, result, {}, event);
}

export async function removeItem(body, event) {
  const user = requireAuth(event);
  const data = validate(cartRemoveSchema)(body);
  const result = await cartService.removeCartItemById(user.id, data.cartItemId);
  return jsonResponse(200, result, {}, event);
}
