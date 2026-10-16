import * as wishlistController from "../controllers/wishlist.controller.js";
import * as accountController from "../controllers/account.controller.js";

export async function handleWishlistRoutes(method, route, body, query, event) {
  if (method === "GET" && route === "/wishlist")
    return wishlistController.getWishlist(query, event);

  if (method === "POST" && route === "/wishlist/toggle")
    return wishlistController.toggleItem(body, event);

  // stock per size for the saved tees (?ids=a,b,c)
  if (method === "GET" && route === "/wishlist/stock")
    return accountController.getSavedStock(query, event);

  // a shareable link to the saved list (the owner turns it on or off)
  if (method === "GET" && route === "/wishlist/share")
    return accountController.getShare(query, event);
  if (method === "POST" && route === "/wishlist/share")
    return accountController.setShare(body, event);

  // public: the list behind a share link
  const sharedMatch = route.match(/^\/wishlist\/shared\/([A-Za-z0-9_-]{16,64})$/);
  if (sharedMatch && method === "GET")
    return accountController.getSharedWishlist(sharedMatch[1], event);

  return null;
}
