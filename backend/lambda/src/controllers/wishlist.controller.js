import * as wishlistService from "../services/wishlist.service.js";
import { wishlistToggleSchema } from "../schemas/common.schema.js";
import { validate } from "../middleware/validate.js";
import { ApiError, jsonResponse } from "../utils/http.js";

export async function getWishlist(query, event) {
  if (!query.userId) throw new ApiError(400, "userId is required.");
  const items = await wishlistService.getWishlistByUserId(query.userId);
  return jsonResponse(200, { items }, {}, event);
}

export async function toggleItem(body, event) {
  const data = validate(wishlistToggleSchema)(body);
  const result = await wishlistService.toggleWishlistByUserId(data.userId, data.productId);
  return jsonResponse(200, result, {}, event);
}
