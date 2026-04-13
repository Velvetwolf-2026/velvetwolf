import * as wishlistController from "../controllers/wishlist.controller.js";

export async function handleWishlistRoutes(method, route, body, query, event) {
  if (method === "GET" && route.endsWith("/wishlist"))
    return wishlistController.getWishlist(query, event);

  if (method === "POST" && route.endsWith("/wishlist/toggle"))
    return wishlistController.toggleItem(body, event);

  return null;
}
