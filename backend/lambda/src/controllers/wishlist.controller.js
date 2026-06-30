import * as wishlistService from "../services/wishlist.service.js";
import { wishlistToggleSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { ApiError, jsonResponse } from "../utils/http.js";
import { requireAuth } from "../middleware/auth.js";

export async function getWishlist(query, event) {
  const user = requireAuth(event);
  const items = await wishlistService.getWishlistByUserId(user.id);
  return jsonResponse(200, { items }, {}, event);
}

export async function toggleItem(body, event) {
  const user = requireAuth(event);
  body.userId = user.id; // Enforce user ID from JWT
  const data = validate(wishlistToggleSchema)(body);
  const result = await wishlistService.toggleWishlistByUserId(data.userId, data.productId);
  return jsonResponse(200, result, {}, event);
}
