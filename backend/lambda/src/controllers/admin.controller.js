import * as adminService from "../services/admin.service.js";
import {
  getOrdersSchema, updateOrderStatusSchema,
  getProductsSchema, createProductSchema, updateProductSchema,
  getCustomersSchema,
} from "../schemas/admin.schema.js";
import { validate } from "../middleware/validate.js";
import { jsonResponse } from "../utils/http.js";
import { auditLog } from "../utils/audit.js";

export async function getDashboard(admin, event) {
  const result = await adminService.getAdminDashboardStats();
  return jsonResponse(200, result, {}, event);
}

export async function getOrders(admin, query, event) {
  const params = validate(getOrdersSchema)(query);
  const result = await adminService.getAdminOrders(params);
  return jsonResponse(200, result, {}, event);
}

export async function updateOrderStatus(orderId, admin, body, event) {
  const { status } = validate(updateOrderStatusSchema)(body);
  const result = await adminService.updateAdminOrderStatus(orderId, status, admin.id);
  await auditLog({
    action: "order.status_update", adminId: admin.id,
    resource: "orders", resourceId: orderId, meta: { status },
  });
  return jsonResponse(200, result, {}, event);
}

export async function getProducts(admin, query, event) {
  const params = validate(getProductsSchema)(query);
  const result = await adminService.getAdminProducts(params);
  return jsonResponse(200, result, {}, event);
}

export async function createProduct(admin, body, event) {
  const data = validate(createProductSchema)(body);
  const result = await adminService.createAdminProduct(data, admin.id);
  await auditLog({
    action: "product.create", adminId: admin.id,
    resource: "products", resourceId: result.product?.id, meta: { name: data.name },
  });
  return jsonResponse(201, result, {}, event);
}

export async function updateProduct(productId, admin, body, event) {
  const data = validate(updateProductSchema)(body);
  const result = await adminService.updateAdminProduct(productId, data, admin.id);
  await auditLog({
    action: "product.update", adminId: admin.id,
    resource: "products", resourceId: productId,
  });
  return jsonResponse(200, result, {}, event);
}

export async function deleteProduct(productId, admin, event) {
  const result = await adminService.deleteAdminProduct(productId, admin.id);
  await auditLog({
    action: "product.delete", adminId: admin.id,
    resource: "products", resourceId: productId,
  });
  return jsonResponse(200, result, {}, event);
}

export async function getCustomers(admin, query, event) {
  const params = validate(getCustomersSchema)(query);
  const result = await adminService.getAdminCustomers(params);
  return jsonResponse(200, result, {}, event);
}

export async function getAnalytics(admin, event) {
  const result = await adminService.getAdminAnalytics();
  return jsonResponse(200, result, {}, event);
}
