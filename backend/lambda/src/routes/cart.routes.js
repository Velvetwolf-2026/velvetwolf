import * as cartController from "../controllers/cart.controller.js";

export async function handleCartRoutes(method, route, body, query, event) {
  if (method === "GET" && route === "/cart")
    return cartController.getCart(query, event);

  if (method === "POST" && route === "/cart/add")
    return cartController.addItem(body, event);

  if (method === "POST" && route === "/cart/update")
    return cartController.updateItem(body, event);

  if (method === "POST" && route === "/cart/remove")
    return cartController.removeItem(body, event);

  if (method === "POST" && route === "/cart/merge")
    return cartController.mergeCart(body, event);

  return null;
}
