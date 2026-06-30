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

  if (method === "GET" && route === "/admin/coupons")
    return adminController.getCoupons(admin, event);

  if (method === "POST" && route === "/admin/coupons")
    return adminController.createCoupon(admin, body, event);

  const couponMatch = route.match(/^\/admin\/coupons\/([^/]+)$/);
  if (method === "PUT" && couponMatch)
    return adminController.updateCoupon(couponMatch[1], admin, body, event);

  if (method === "DELETE" && couponMatch)
    return adminController.deleteCoupon(couponMatch[1], admin, event);

  if (method === "GET" && route === "/admin/categories")
    return adminController.getCategories(admin, event);

  if (method === "POST" && route === "/admin/categories")
    return adminController.createCategory(admin, body, event);

  const categoryMatch = route.match(/^\/admin\/categories\/([^/]+)$/);
  if (method === "DELETE" && categoryMatch)
    return adminController.deleteCategory(categoryMatch[1], admin, event);

  const orderShiprocketMatch = route.match(/^\/admin\/orders\/([^/]+)\/shiprocket$/);
  if (method === "PATCH" && orderShiprocketMatch)
    return adminController.updateOrderShiprocket(orderShiprocketMatch[1], admin, body, event);

  const productInventoryMatch = route.match(/^\/admin\/products\/([^/]+)\/inventory$/);
  if (method === "PATCH" && productInventoryMatch)
    return adminController.updateProductInventory(productInventoryMatch[1], admin, body, event);

  // /admin/* route matched prefix but no sub-route found
  return null;
}
