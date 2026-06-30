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

  if (ordersResult.error) { logError("Dashboard orders query failed", adminLogContext({ error: ordersResult.error })); throw new ApiError(500, `Failed to load dashboard data: ${ordersResult.error.message}`); }
  if (customersResult.error) { logError("Dashboard customers query failed", adminLogContext({ error: customersResult.error })); throw new ApiError(500, `Failed to load dashboard data: ${customersResult.error.message}`); }
  if (productsResult.error) { logError("Dashboard products query failed", adminLogContext({ error: productsResult.error })); throw new ApiError(500, `Failed to load dashboard data: ${productsResult.error.message}`); }

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
  const { name, collection, price, original_price, description, tag, sizes, colors, stock, image, images = [], newImages = [], style, fit } = productData;

  logInfo("Creating product", adminLogContext({ name, collection, adminId }));

  let finalImageUrl = image?.trim() || null;
  const finalImagesArray = [...images];

  // Upload all new images
  if (Array.isArray(newImages) && newImages.length > 0) {
    for (const file of newImages) {
      if (!file.base64 || !file.fileName) continue;
      const buffer = Buffer.from(file.base64, "base64");
      const { error: uploadError } = await supabaseAdmin.storage.from("product-images").upload(file.fileName, buffer, {
        contentType: file.contentType || "image/jpeg",
        upsert: true
      });
      if (uploadError) {
        logError("Failed to upload product image", adminLogContext({ imageFileName: file.fileName, error: uploadError }));
        throw new ApiError(500, "Failed to upload product image.");
      }
      const { data: publicUrlData } = supabaseAdmin.storage.from("product-images").getPublicUrl(file.fileName);
      const imageUrl = file.color ? `${file.color}::${publicUrlData.publicUrl}` : publicUrlData.publicUrl;
      finalImagesArray.push(imageUrl);
    }
  }

  // If no primary image but we uploaded images, use the first one as primary
  if (!finalImageUrl && finalImagesArray.length > 0) {
    finalImageUrl = finalImagesArray[0];
  }


  const sku = `VW-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

  const { data, error } = await supabaseAdmin.from("products").insert({
    name: name.trim(),
    collection: collection.trim(),
    sku,
    slug,
    price: Number(price),
    original_price: original_price ? Number(original_price) : Number(price),
    description: description?.trim() || null,
    tag: tag?.trim() || null,
    sizes: Array.isArray(sizes) ? sizes : [],
    colors: Array.isArray(colors) ? colors : [],
    stock: Number(stock ?? 0),
    image: finalImageUrl,
    images: finalImagesArray,
    style: style || "Unisex",
    fit: fit || "Oversized",
  }).select().single();

  if (error) { logError("Product create failed", adminLogContext({ name, adminId, error })); throw new ApiError(500, "Failed to create product."); }

  // Create variants for all size/color combinations
  if (data) {
    const variantsToInsert = [];
    const sizesArr = Array.isArray(sizes) && sizes.length > 0 ? sizes : ["default"];
    const colorsArr = Array.isArray(colors) && colors.length > 0 ? colors : ["default"];
    
    for (const s of sizesArr) {
      for (const c of colorsArr) {
        variantsToInsert.push({
          product_id: data.id,
          size: s !== "default" ? s : null,
          color: c !== "default" ? c : null,
          color_hex: c !== "default" ? c : null,
          stock_qty: Math.floor(Number(stock ?? 0) / (sizesArr.length * colorsArr.length)) || 0,
          extra_price: 0
        });
      }
    }
    
    if (variantsToInsert.length > 0) {
      const { error: varError } = await supabaseAdmin.from("product_variants").insert(variantsToInsert);
      if (varError) {
        logError("Failed to create product variants", adminLogContext({ productId: data.id, error: varError }));
      }
    }
  }

  return { success: true, product: data };
}

export async function updateAdminProduct(productId, productData, adminId) {
  if (!productId) throw new ApiError(400, "Product ID is required.");

  logInfo("Updating product", adminLogContext({ productId, adminId }));

  const allowed = ["name", "collection", "price", "original_price", "description", "tag", "sizes", "colors", "stock", "image", "images", "style", "fit"];
  const updates = {};
  for (const key of allowed) {
    if (productData[key] !== undefined) updates[key] = productData[key];
  }

  // Ensure images is an array if we are updating it
  if (updates.images && !Array.isArray(updates.images)) {
    updates.images = [];
  }

  const newImages = productData.newImages;
  if (Array.isArray(newImages) && newImages.length > 0) {
    if (!updates.images) updates.images = [];
    
    for (const file of newImages) {
      if (!file.base64 || !file.fileName) continue;
      const buffer = Buffer.from(file.base64, "base64");
      const { error: uploadError } = await supabaseAdmin.storage.from("product-images").upload(file.fileName, buffer, {
        contentType: file.contentType || "image/jpeg",
        upsert: true
      });
      if (uploadError) {
        logError("Failed to upload product image", adminLogContext({ imageFileName: file.fileName, error: uploadError }));
        throw new ApiError(500, "Failed to upload product image.");
      }
      const { data: publicUrlData } = supabaseAdmin.storage.from("product-images").getPublicUrl(file.fileName);
      const imageUrl = file.color ? `${file.color}::${publicUrlData.publicUrl}` : publicUrlData.publicUrl;
      updates.images.push(imageUrl);
    }
  }

  // If no primary image but we have images array, use first as primary
  if (!updates.image && updates.images && updates.images.length > 0) {
    updates.image = updates.images[0];
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

// ─── COUPONS ──────────────────────────────────────────────────────────────────

export async function getAdminCoupons() {
  const { data, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw new ApiError(500, `Failed to load coupons: ${error.message}`);
  return data || [];
}

export async function createAdminCoupon(couponData) {
  const { code, discount_percent, active } = couponData;
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .insert({ code: code.toUpperCase().trim(), discount_percent: Number(discount_percent), active: active !== false })
    .select()
    .single();
  if (error) throw new ApiError(400, `Failed to create coupon: ${error.message}`);
  return data;
}

export async function updateAdminCoupon(couponId, couponData) {
  const { code, discount_percent, active } = couponData;
  const updates = {};
  if (code !== undefined) updates.code = code.toUpperCase().trim();
  if (discount_percent !== undefined) updates.discount_percent = Number(discount_percent);
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from("coupons")
    .update(updates)
    .eq("id", couponId)
    .select()
    .single();
  if (error) throw new ApiError(400, `Failed to update coupon: ${error.message}`);
  return data;
}

export async function deleteAdminCoupon(couponId) {
  const { error } = await supabaseAdmin.from("coupons").delete().eq("id", couponId);
  if (error) throw new ApiError(400, `Failed to delete coupon: ${error.message}`);
  return { success: true };
}

// ─── CATEGORIES / COLLECTIONS ──────────────────────────────────────────────────

export async function getAdminCategories() {
  const { data, error } = await supabaseAdmin.from("collections").select("*").order("name", { ascending: true });
  if (error) {
    return [
      { id: "ai-tech", name: "AI & Tech Humor", icon: "Memory" },
      { id: "anime", name: "Anime", icon: "AutoAwesome" },
      { id: "beast-mode", name: "Beast Mode Grind", icon: "FitnessCenter" },
      { id: "mind-mayhem", name: "Mind Over Mayhem", icon: "Psychology" },
      { id: "silent-luxury", name: "Silent Luxury", icon: "Diamond" },
      { id: "savage-quotes", name: "Savage Quotes", icon: "Whatshot" }
    ];
  }
  return data || [];
}

export async function createAdminCategory(catData) {
  const { id, name, description, icon } = catData;
  const { data, error } = await supabaseAdmin
    .from("collections")
    .insert({ id: id.trim().toLowerCase(), name: name.trim(), description: description?.trim() || null, icon: icon?.trim() || null })
    .select()
    .single();
  if (error) throw new ApiError(400, `Failed to create collection: ${error.message}`);
  return data;
}

export async function deleteAdminCategory(catId) {
  const { error } = await supabaseAdmin.from("collections").delete().eq("id", catId);
  if (error) throw new ApiError(400, `Failed to delete collection: ${error.message}`);
  return { success: true };
}

// ─── SHIPROCKET DETAILS ────────────────────────────────────────────────────────

export async function updateAdminOrderShiprocket(orderId, trackingData) {
  const { awb_number, courier_name, shipping_status } = trackingData;
  const updates = {
    awb_number: awb_number?.trim() || null,
    courier_name: courier_name?.trim() || null,
    shipping_status: shipping_status?.trim() || null
  };
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw new ApiError(400, `Failed to update tracking info: ${error.message}`);
  return data;
}

// ─── INVENTORY VARIANT STOCK ───────────────────────────────────────────────────

export async function updateAdminProductInventory(productId, inventoryData) {
  const { size, color, stock } = inventoryData;
  
  // Update in product_variants table
  const { error: varError } = await supabaseAdmin
    .from("product_variants")
    .update({ stock: Number(stock) })
    .eq("product_id", productId)
    .eq("size", size)
    .eq("color", color)
    .select();

  if (varError) {
    logError("Failed to update variant stock", { productId, size, color, error: varError });
  }

  // Recalculate total product stock
  const { data: allVariants } = await supabaseAdmin
    .from("product_variants")
    .select("stock")
    .eq("product_id", productId);

  let totalStock = Number(stock);
  if (allVariants && allVariants.length > 0) {
    totalStock = allVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
  }

  const { data: product, error: prodError } = await supabaseAdmin
    .from("products")
    .update({ stock: totalStock })
    .eq("id", productId)
    .select()
    .single();

  if (prodError) throw new ApiError(400, `Failed to update product stock: ${prodError.message}`);
  return { success: true, product };
}

