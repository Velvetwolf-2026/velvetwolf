import * as cartController from "../controllers/cart.controller.js";

export async function handleCartRoutes(method, route, body, query, event) {
  if (method === "GET" && route.endsWith("/cart"))
    return cartController.getCart(query, event);

  if (method === "POST" && route.endsWith("/cart/add"))
    return cartController.addItem(body, event);

  if (method === "POST" && route.endsWith("/cart/update"))
    return cartController.updateItem(body, event);

  if (method === "POST" && route.endsWith("/cart/remove"))
    return cartController.removeItem(body, event);

  return null;
}
