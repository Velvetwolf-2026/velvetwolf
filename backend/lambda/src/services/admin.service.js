import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, logError, logInfo, logWarn } from "../utils/http.js";

const VALID_ORDER_STATUSES = [
  "pending", "confirmed", "processing", "in_production",
  "dispatched", "delivered", "cancelled",
];

function adminLogContext(context = {}) {
  return { service: "admin", ...context };
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getAdminDashboardStats() {
  logInfo("Fetching admin dashboard stats", adminLogContext());

  const [ordersResult, customersResult, productsResult] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id, total_amount, status, created_at, shipping_address, order_items(product_name, quantity, unit_price)")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("users").select("id", { count: "exact" }).eq("role", "customer").eq("is_verified", true),
    supabaseAdmin.from("products").select("id, stock", { count: "exact" }),
  ]);

  if (ordersResult.error) { logError("Dashboard orders query failed", adminLogContext({ error: ordersResult.error })); throw new ApiError(500, "Failed to load dashboard data."); }
  if (customersResult.error) { logError("Dashboard customers query failed", adminLogContext({ error: customersResult.error })); throw new ApiError(500, "Failed to load dashboard data."); }
  if (productsResult.error) { logError("Dashboard products query failed", adminLogContext({ error: productsResult.error })); throw new ApiError(500, "Failed to load dashboard data."); }

  const orders = ordersResult.data || [];
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const processingOrders = orders.filter((o) =>
    ["confirmed", "processing", "in_production"].includes((o.status || "").toLowerCase())
  ).length;

  const products = productsResult.data || [];
  const lowStockCount = products.filter((p) => Number(p.stock ?? 0) < 10).length;

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    customerName: o.shipping_address?.name || "—",
    total: Number(o.total_amount || 0),
    status: o.status || "pending",
    createdAt: o.created_at,
    itemCount: (o.order_items || []).reduce((s, i) => s + Number(i.quantity || 0), 0),
  }));

  return {
    totalRevenue, totalOrders: orders.length,
    totalCustomers: customersResult.count || 0,
    totalProducts: productsResult.count || 0,
    processingOrders, lowStockCount, recentOrders,
  };
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export async function getAdminOrders({ status, page = 1, limit = 50 } = {}) {
  logInfo("Fetching admin orders", adminLogContext({ status, page, limit }));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id, user_id, total_amount, subtotal, shipping_amount, tax_amount, payment_method, shipping_address, status, created_at, dispatched_at, delivered_at, order_items(id, product_name, size, color, quantity, unit_price, total_price)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) { logError("Admin orders query failed", adminLogContext({ error })); throw new ApiError(500, "Failed to load orders."); }

  const userIds = [...new Set((data || []).map((o) => o.user_id).filter(Boolean))];
  let userMap = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin.from("users").select("id, name, email").in("id", userIds);
    for (const u of users || []) userMap[u.id] = { name: u.name, email: u.email };
  }

  const orders = (data || []).map((o) => ({
    ...o,
    customerName: userMap[o.user_id]?.name || o.shipping_address?.name || "—",
    customerEmail: userMap[o.user_id]?.email || "—",
    total_amount: Number(o.total_amount || 0),
  }));

  return { orders, total: count || 0, page, limit };
}

export async function updateAdminOrderStatus(orderId, status, adminId) {
  if (!orderId) throw new ApiError(400, "Order ID is required.");
  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}.`);
  }

  logInfo("Updating order status", adminLogContext({ orderId, status, adminId }));

  const updates = { status };
  if (status === "dispatched") updates.dispatched_at = new Date().toISOString();
  if (status === "delivered") updates.delivered_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("orders").update(updates).eq("id", orderId)
    .select("id, status, dispatched_at, delivered_at").single();

  if (error) { logError("Order status update failed", adminLogContext({ orderId, status, adminId, error })); throw new ApiError(500, "Failed to update order status."); }
  if (!data) { logWarn("Order not found for status update", adminLogContext({ orderId })); throw new ApiError(404, "Order not found."); }

  return { success: true, order: data };
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function getAdminProducts({ collection, search, page = 1, limit = 100 } = {}) {
  logInfo("Fetching admin products", adminLogContext({ collection, search, page, limit }));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("products").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  if (collection) query = query.eq("collection", collection);
  if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tag.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) { logError("Admin products query failed", adminLogContext({ error })); throw new ApiError(500, "Failed to load products."); }

  return { products: data || [], total: count || 0, page, limit };
}

export async function createAdminProduct(productData, adminId) {
  const { name, collection, price, original_price, description, tag, sizes, colors, stock, image } = productData;

  logInfo("Creating product", adminLogContext({ name, collection, adminId }));

  const { data, error } = await supabaseAdmin.from("products").insert({
    name: name.trim(),
    collection: collection.trim(),
    price: Number(price),
    original_price: original_price ? Number(original_price) : Number(price),
    description: description?.trim() || null,
    tag: tag?.trim() || null,
    sizes: Array.isArray(sizes) ? sizes : [],
    colors: Array.isArray(colors) ? colors : [],
    stock: Number(stock ?? 0),
    image: image?.trim() || null,
  }).select().single();

  if (error) { logError("Product create failed", adminLogContext({ name, adminId, error })); throw new ApiError(500, "Failed to create product."); }
  return { success: true, product: data };
}

export async function updateAdminProduct(productId, productData, adminId) {
  if (!productId) throw new ApiError(400, "Product ID is required.");

  logInfo("Updating product", adminLogContext({ productId, adminId }));

  const allowed = ["name", "collection", "price", "original_price", "description", "tag", "sizes", "colors", "stock", "image"];
  const updates = {};
  for (const key of allowed) {
    if (productData[key] !== undefined) updates[key] = productData[key];
  }
  if (Object.keys(updates).length === 0) throw new ApiError(400, "No valid fields to update.");

  const { data, error } = await supabaseAdmin.from("products").update(updates).eq("id", productId).select().single();
  if (error) { logError("Product update failed", adminLogContext({ productId, adminId, error })); throw new ApiError(500, "Failed to update product."); }
  if (!data) throw new ApiError(404, "Product not found.");

  return { success: true, product: data };
}

export async function deleteAdminProduct(productId, adminId) {
  if (!productId) throw new ApiError(400, "Product ID is required.");

  logInfo("Deleting product", adminLogContext({ productId, adminId }));

  const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
  if (error) { logError("Product delete failed", adminLogContext({ productId, adminId, error })); throw new ApiError(500, "Failed to delete product."); }

  return { success: true };
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export async function getAdminCustomers({ page = 1, limit = 50, search } = {}) {
  logInfo("Fetching admin customers", adminLogContext({ page, limit, search }));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from("users")
    .select("id, name, email, role, is_verified, last_login, created_at", { count: "exact" })
    .eq("role", "customer").order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data: users, error, count } = await query;
  if (error) { logError("Admin customers query failed", adminLogContext({ error })); throw new ApiError(500, "Failed to load customers."); }

  const userIds = (users || []).map((u) => u.id);
  let orderMap = {};
  if (userIds.length > 0) {
    const { data: orders } = await supabaseAdmin.from("orders").select("user_id, total_amount").in("user_id", userIds);
    for (const o of orders || []) {
      if (!orderMap[o.user_id]) orderMap[o.user_id] = { count: 0, total: 0 };
      orderMap[o.user_id].count += 1;
      orderMap[o.user_id].total += Number(o.total_amount || 0);
    }
  }

  const customers = (users || []).map((u) => ({
    id: u.id, name: u.name, email: u.email,
    isVerified: u.is_verified, lastLogin: u.last_login, createdAt: u.created_at,
    orderCount: orderMap[u.id]?.count || 0,
    totalSpent: orderMap[u.id]?.total || 0,
  }));

  return { customers, total: count || 0, page, limit };
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function getAdminAnalytics() {
  logInfo("Fetching admin analytics", adminLogContext());

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const [recentOrdersResult, allOrdersResult, topProductsResult] = await Promise.all([
    supabaseAdmin.from("orders").select("total_amount, status, created_at").gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true }),
    supabaseAdmin.from("orders").select("total_amount, status, created_at").gte("created_at", twelveMonthsAgo),
    supabaseAdmin.from("order_items").select("product_name, quantity, total_price"),
  ]);

  if (recentOrdersResult.error || allOrdersResult.error || topProductsResult.error) {
    logError("Analytics query failed", adminLogContext({ recentError: recentOrdersResult.error, allError: allOrdersResult.error, topError: topProductsResult.error }));
    throw new ApiError(500, "Failed to load analytics.");
  }

  const dailyMap = {};
  for (const o of recentOrdersResult.data || []) {
    const day = o.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + Number(o.total_amount || 0);
  }
  const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));

  const monthlyMap = {};
  for (const o of allOrdersResult.data || []) {
    const month = o.created_at.slice(0, 7);
    monthlyMap[month] = (monthlyMap[month] || 0) + Number(o.total_amount || 0);
  }
  const monthlyRevenue = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue })).sort((a, b) => a.month.localeCompare(b.month));

  const ordersByStatus = {};
  for (const o of allOrdersResult.data || []) {
    const s = o.status || "pending";
    ordersByStatus[s] = (ordersByStatus[s] || 0) + 1;
  }

  const productTotals = {};
  for (const item of topProductsResult.data || []) {
    const name = item.product_name || "Unknown";
    if (!productTotals[name]) productTotals[name] = { quantity: 0, revenue: 0 };
    productTotals[name].quantity += Number(item.quantity || 0);
    productTotals[name].revenue += Number(item.total_price || 0);
  }
  const topProducts = Object.entries(productTotals)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return { dailyRevenue, monthlyRevenue, ordersByStatus, topProducts };
}
