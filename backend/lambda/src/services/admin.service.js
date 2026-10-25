import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { signDesignFiles } from "./studio.service.js";
import { notifyRestock } from "./account.service.js";
import { ApiError, adminDbFailure, logError, logInfo, logWarn } from "../utils/http.js";
import { sanitizeFilterValue } from "../utils/postgrest.js";

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

  if (ordersResult.error) { logError("Dashboard orders query failed", adminLogContext({ error: ordersResult.error })); throw adminDbFailure(500, ordersResult.error, "Couldn't load the dashboard."); }
  if (customersResult.error) { logError("Dashboard customers query failed", adminLogContext({ error: customersResult.error })); throw adminDbFailure(500, customersResult.error, "Couldn't load the dashboard."); }
  if (productsResult.error) { logError("Dashboard products query failed", adminLogContext({ error: productsResult.error })); throw adminDbFailure(500, productsResult.error, "Couldn't load the dashboard."); }

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
      "id, user_id, total_amount, subtotal, shipping_amount, tax_amount, payment_method, shipping_address, status, created_at, dispatched_at, delivered_at, meta, order_items(id, product_name, size, color, quantity, unit_price, total_price)",
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

  const orders = await Promise.all((data || []).map(async ({ meta, ...o }) => ({
    ...o,
    customerName: userMap[o.user_id]?.name || o.shipping_address?.name || "—",
    customerEmail: userMap[o.user_id]?.email || "—",
    total_amount: Number(o.total_amount || 0),
    delivery: meta?.delivery || "standard",
    // Studio tees: the design and day-long links to its proof and artwork files.
    customDesigns: await Promise.all((meta?.custom_designs || []).map(async (d) => ({
      ...d,
      files: await signDesignFiles(d.design),
    }))),
  })));

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

  let query = supabaseAdmin.from("products").select("*, product_variants(*)", { count: "exact" })
    .order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  if (collection) query = query.eq("collection", collection);
  if (search) { const term = sanitizeFilterValue(search); query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,tag.ilike.%${term}%`); }

  const { data, error, count } = await query;
  if (error) { logError("Admin products query failed", adminLogContext({ error })); throw new ApiError(500, "Failed to load products."); }

  return { products: data || [], total: count || 0, page, limit };
}

// ---- product photos ----
// Storage keys are chosen here, never taken from the uploaded file's name: names from people's
// computers can contain characters storage refuses ("#", "%", accents, invisible spaces), and
// that refusal used to surface as a bare 500 when adding a product.
const PRODUCT_BUCKET = "product-images";
const PHOTO_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const photoKey = (contentType) => `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${PHOTO_EXT[contentType] || "jpg"}`;

// One-time upload link: the admin page sends each photo straight to storage, so a product with
// many photos never hits the API's 6 MB request limit or the 30-second timeout.
export async function createProductPhotoUploadUrl({ contentType } = {}) {
  if (!PHOTO_EXT[contentType]) throw new ApiError(400, "Use a JPG, PNG or WebP photo.");
  const path = photoKey(contentType);
  const { data, error } = await supabaseAdmin.storage.from(PRODUCT_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    logError("Could not create product photo upload URL", adminLogContext({ path, error }));
    throw adminDbFailure(502, error, "Couldn't prepare the photo upload.");
  }
  const { data: pub } = supabaseAdmin.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return { path, uploadUrl: data.signedUrl, publicUrl: pub.publicUrl };
}

// Older admin pages still send photos inline as base64; store them under a safe key too.
async function uploadInlinePhoto(file) {
  if (!file?.base64) return null;
  const key = photoKey(file.contentType);
  const { error } = await supabaseAdmin.storage.from(PRODUCT_BUCKET).upload(key, Buffer.from(file.base64, "base64"), {
    contentType: file.contentType || "image/jpeg",
    upsert: false,
  });
  if (error) {
    logError("Failed to upload product image", adminLogContext({ originalName: file.fileName, key, error }));
    throw adminDbFailure(502, error, "Couldn't save a product photo.");
  }
  const { data } = supabaseAdmin.storage.from(PRODUCT_BUCKET).getPublicUrl(key);
  return file.color ? `${file.color}::${data.publicUrl}` : data.publicUrl;
}

// Gender <-> the older style labels, so both columns always agree.
const STYLE_OF_GENDER = { Unisex: "Unisex", Men: "Men's Fit", Women: "Women's Fit" };
const GENDER_OF_STYLE = { "Unisex": "Unisex", "Men's Fit": "Men", "Women's Fit": "Women" };

// Optional columns that come from migrations in schema.sql. If one hasn't been run, save the
// product without that field rather than failing the upload.
const OPTIONAL_COLUMNS = {
  gender: "SMART FILTERS",
  print_image: "TOP 5 DESIGNS",
  top_rank: "TOP 5 DESIGNS",
};
const isMissingColumn = (error, column) =>
  ["42703", "PGRST204"].includes(error?.code) && String(error?.message || "").includes(column);

async function writeProduct(run, row) {
  let current = row;
  let result = await run(current);
  for (let tries = 0; result.error && tries < Object.keys(OPTIONAL_COLUMNS).length; tries++) {
    const column = Object.keys(OPTIONAL_COLUMNS).find((c) => c in current && isMissingColumn(result.error, c));
    if (!column) break;
    logWarn(`products.${column} missing: saving without it (run the ${OPTIONAL_COLUMNS[column]} migration in schema.sql)`, adminLogContext());
    const { [column]: _skip, ...rest } = current;
    current = rest;
    result = await run(current);
  }
  return result;
}

// A Top 5 position belongs to one product: giving it to this one frees it elsewhere.
async function freeTopRank(rank, productId) {
  if (!rank) return;
  const { error } = await supabaseAdmin.from("products").update({ top_rank: null }).eq("top_rank", rank).neq("id", productId);
  if (error && !isMissingColumn(error, "top_rank")) logWarn("Couldn't free the Top 5 position", adminLogContext({ rank, productId, error }));
}

export async function createAdminProduct(productData, adminId) {
  const { name, collection, price, original_price, description, tag, sizes, colors, stock, image, images = [], newImages = [], style, fit } = productData;
  const gender = productData.gender || GENDER_OF_STYLE[style] || "Unisex";

  logInfo("Creating product", adminLogContext({ name, collection, adminId }));

  let finalImageUrl = image?.trim() || null;
  const finalImagesArray = [...images];

  // Upload all new images in parallel
  if (Array.isArray(newImages) && newImages.length > 0) {
    const uploadPromises = newImages.map(uploadInlinePhoto);

    const uploadedUrls = await Promise.all(uploadPromises);
    for (const url of uploadedUrls) {
      if (url) finalImagesArray.push(url);
    }
  }

  // If no primary image but we uploaded images, use the first one as primary
  if (!finalImageUrl && finalImagesArray.length > 0) {
    finalImageUrl = finalImagesArray[0];
  }


  const sku = `VW-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

  const { data, error } = await writeProduct((row) => supabaseAdmin.from("products").insert(row).select().single(), {
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
    gender,
    style: STYLE_OF_GENDER[gender],
    fit: fit || "Oversized",
    ...(productData.top_rank !== undefined ? { top_rank: productData.top_rank } : {}),
    ...(productData.print_image !== undefined ? { print_image: productData.print_image } : {}),
  });

  if (error) { logError("Product create failed", adminLogContext({ name, adminId, error })); throw adminDbFailure(500, error, "Couldn't save the product."); }
  if (data?.id && productData.top_rank) await freeTopRank(productData.top_rank, data.id);

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

  const allowed = ["name", "collection", "price", "original_price", "description", "tag", "sizes", "colors", "stock", "image", "images", "style", "fit", "gender", "top_rank", "print_image"];
  const updates = {};
  for (const key of allowed) {
    if (productData[key] !== undefined) updates[key] = productData[key];
  }
  // keep gender and the older style label in step
  if (updates.gender) updates.style = STYLE_OF_GENDER[updates.gender];
  else if (updates.style && GENDER_OF_STYLE[updates.style]) updates.gender = GENDER_OF_STYLE[updates.style];

  // Ensure images is an array if we are updating it
  if (updates.images && !Array.isArray(updates.images)) {
    updates.images = [];
  }

  const newImages = productData.newImages;
  if (Array.isArray(newImages) && newImages.length > 0) {
    if (!updates.images) updates.images = [];
    
    const uploadPromises = newImages.map(uploadInlinePhoto);

    const uploadedUrls = await Promise.all(uploadPromises);
    for (const url of uploadedUrls) {
      if (url) updates.images.push(url);
    }
  }

  // If no primary image but we have images array, use first as primary
  if (!updates.image && updates.images && updates.images.length > 0) {
    updates.image = updates.images[0];
  }

  if (Object.keys(updates).length === 0) throw new ApiError(400, "No valid fields to update.");

  if (updates.top_rank) await freeTopRank(updates.top_rank, productId);
  const { data, error } = await writeProduct((row) => supabaseAdmin.from("products").update(row).eq("id", productId).select().single(), updates);
  if (error) { logError("Product update failed", adminLogContext({ productId, adminId, error })); throw adminDbFailure(500, error, "Couldn't update the product."); }
  if (!data) throw new ApiError(404, "Product not found.");

  return { success: true, product: data };
}

export async function deleteAdminProduct(productId, adminId) {
  if (!productId) throw new ApiError(400, "Product ID is required.");

  logInfo("Deleting product", adminLogContext({ productId, adminId }));

  // Set product_id to null in order_items first to avoid foreign key violation
  await supabaseAdmin
    .from("order_items")
    .update({ product_id: null })
    .eq("product_id", productId);

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

  if (search) { const term = sanitizeFilterValue(search); query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`); }

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
  if (error) throw adminDbFailure(500, error, "Couldn't load coupons.");
  return (data || []).map(d => ({
    id: d.code,
    code: d.code,
    discount_percent: d.discount_value,
    active: d.is_active,
    created_at: d.created_at
  }));
}

export async function createAdminCoupon(couponData) {
  const { code, discount_percent, active } = couponData;
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .insert({
      code: code.toUpperCase().trim(),
      discount_value: Number(discount_percent),
      discount_type: 'percentage',
      is_active: active !== false
    })
    .select()
    .single();
  if (error) throw adminDbFailure(400, error, "Couldn't create the coupon.");
  return {
    id: data.code,
    code: data.code,
    discount_percent: data.discount_value,
    active: data.is_active,
    created_at: data.created_at
  };
}

export async function updateAdminCoupon(couponId, couponData) {
  const { code, discount_percent, active } = couponData;
  const updates = {};
  if (code !== undefined) updates.code = code.toUpperCase().trim();
  if (discount_percent !== undefined) updates.discount_value = Number(discount_percent);
  if (active !== undefined) updates.is_active = active;

  const { data, error } = await supabaseAdmin
    .from("coupons")
    .update(updates)
    .eq("code", couponId)
    .select()
    .single();
  if (error) throw adminDbFailure(400, error, "Couldn't update the coupon.");
  return {
    id: data.code,
    code: data.code,
    discount_percent: data.discount_value,
    active: data.is_active,
    created_at: data.created_at
  };
}

export async function deleteAdminCoupon(couponId) {
  const { error } = await supabaseAdmin.from("coupons").delete().eq("code", couponId);
  if (error) throw adminDbFailure(400, error, "Couldn't delete the coupon.");
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
  if (error) throw adminDbFailure(400, error, "Couldn't create the collection.");
  return data;
}

export async function deleteAdminCategory(catId) {
  const { error } = await supabaseAdmin.from("collections").delete().eq("id", catId);
  if (error) throw adminDbFailure(400, error, "Couldn't delete the collection.");
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
  if (error) throw adminDbFailure(400, error, "Couldn't update the tracking details.");
  return data;
}

// ─── INVENTORY VARIANT STOCK ───────────────────────────────────────────────────

export async function updateAdminProductInventory(productId, inventoryData) {
  const { size, color, stock } = inventoryData;
  
  // Update in product_variants table using correct DB column stock_qty
  const { error: varError } = await supabaseAdmin
    .from("product_variants")
    .update({ stock_qty: Number(stock) })
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
    .select("stock_qty")
    .eq("product_id", productId);

  let totalStock = Number(stock);
  if (allVariants && allVariants.length > 0) {
    totalStock = allVariants.reduce((sum, v) => sum + Number(v.stock_qty || 0), 0);
  }

  const { data: product, error: prodError } = await supabaseAdmin
    .from("products")
    .update({ stock: totalStock })
    .eq("id", productId)
    .select("*, product_variants(*)")
    .single();

  if (prodError) throw adminDbFailure(400, prodError, "Couldn't update the stock.");
  // back in stock: email anyone waiting on this size (never fails the update)
  if (!varError && Number(stock) > 0) await notifyRestock(productId, size);
  return { success: true, product };
}

