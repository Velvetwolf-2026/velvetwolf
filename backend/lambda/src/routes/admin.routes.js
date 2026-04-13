import { requireAdmin } from "../middleware/auth.js";
import * as adminController from "../controllers/admin.controller.js";

export async function handleAdminRoutes(method, route, body, query, event) {
  // Guard: only handle /admin/* routes
  if (!route.startsWith("/admin")) return null;

  // Auth: verify JWT and assert role === "admin" — throws 401/403 if invalid
  const admin = requireAdmin(event);

  if (method === "GET" && route === "/admin/dashboard")
    return adminController.getDashboard(admin, event);

  if (method === "GET" && route === "/admin/orders")
    return adminController.getOrders(admin, query, event);

  const orderStatusMatch = route.match(/^\/admin\/orders\/([^/]+)\/status$/);
  if (method === "PATCH" && orderStatusMatch)
    return adminController.updateOrderStatus(orderStatusMatch[1], admin, body, event);

  if (method === "GET" && route === "/admin/products")
    return adminController.getProducts(admin, query, event);

  if (method === "POST" && route === "/admin/products")
    return adminController.createProduct(admin, body, event);

  const productMatch = route.match(/^\/admin\/products\/([^/]+)$/);
  if (method === "PUT" && productMatch)
    return adminController.updateProduct(productMatch[1], admin, body, event);

  if (method === "DELETE" && productMatch)
    return adminController.deleteProduct(productMatch[1], admin, event);

  if (method === "GET" && route === "/admin/customers")
    return adminController.getCustomers(admin, query, event);

  if (method === "GET" && route === "/admin/analytics")
    return adminController.getAnalytics(admin, event);

  // /admin/* route matched prefix but no sub-route found
  return null;
}
