import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { createPaymentOrder, verifyPayment, getCashfreeCheckoutMode } from "./cashfree.js";
import { ApiError, logError } from "../utils/http.js";
import { sendEmail } from "../config/smtp.js";
import { buildOrderEmail } from "../config/order-template.js";
import { createShiprocketOrder } from "./shiprocket.service.js";
import { sendPurchaseToMeta } from "./meta-capi.service.js";

function logContext(context = {}) {
  return { service: "checkout", ...context };
}

// Helper to check if a string is a valid UUID
const isValidUuid = (uuid) => {
  return typeof uuid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

// Pricing rules — must stay in sync with CheckoutPage.jsx (shipping/tax) and
// CustomDesignPage.jsx (custom tee pricing). The server recomputes everything
// from these so a tampered request can't change what the customer is charged.
const FREE_SHIPPING_THRESHOLD = 1999;
const SHIPPING_FEE = 149;
const TAX_RATE = 0.18;
const MAX_ITEM_QTY = 100;

const CUSTOM_TEE_BASE_PRICE = 1499;
const CUSTOM_EMBROIDERY_SURCHARGE = 250;
const CUSTOM_FABRIC_SURCHARGES = { "240gsm": 0, "240gsm-fleece": 200, "180gsm": 0, "bamboo": 400 };
const VALID_CUSTOM_TEE_PRICES = new Set(
  Object.values(CUSTOM_FABRIC_SURCHARGES).flatMap((surcharge) => [
    CUSTOM_TEE_BASE_PRICE + surcharge,
    CUSTOM_TEE_BASE_PRICE + surcharge + CUSTOM_EMBROIDERY_SURCHARGE,
  ])
);

export function calculateShipping(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calculateTax(subtotal) {
  return Math.round(subtotal * TAX_RATE);
}

const isCustomItem = (item) => item?.isCustom === true || String(item?.id || "").startsWith("custom-");

// Custom tees have no DB product row, so their price is derived from the
// chosen options rather than trusted from the client.
function getCustomItemUnitPrice(item) {
  const fabric = item?.customMeta?.fabric;
  if (fabric && Object.prototype.hasOwnProperty.call(CUSTOM_FABRIC_SURCHARGES, fabric)) {
    const embroidery = item.customMeta.isEmbroidery ? CUSTOM_EMBROIDERY_SURCHARGE : 0;
    return CUSTOM_TEE_BASE_PRICE + CUSTOM_FABRIC_SURCHARGES[fabric] + embroidery;
  }
  // Options missing (older cart entry) — accept the client price only if it is
  // one of the prices the customiser can actually produce.
  const clientPrice = Number(item?.price);
  if (VALID_CUSTOM_TEE_PRICES.has(clientPrice)) return clientPrice;
  throw new ApiError(400, "Invalid price for custom item. Please re-create your custom design.");
}

// Helper to sanitize phone numbers for Cashfree (expects 10 digits)
const sanitizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return "9999999999";
};

// Helper to validate and sanitize email
const sanitizeEmail = (email) => {
  const trimmed = String(email || "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;
  return "guest@velvetwolf.in";
};

// Get product variant by size and color
async function getVariantForItem(productId, size, color) {
  if (!productId || !isValidUuid(productId)) {
    // Return a dummy variant for custom designs to bypass database check
    return { id: crypto.randomUUID(), stock_qty: 99999, size: size || "M", color: color || "Black" };
  }
  let query = supabaseAdmin
    .from("product_variants")
    .select("id, stock_qty, size, color, color_hex")
    .eq("product_id", productId);

  if (size) {
    query = query.eq("size", size);
  }
  if (color) {
    if (color.startsWith("#")) {
      query = query.eq("color_hex", color);
    } else {
      query = query.or(`color.eq.${color},color_hex.eq.${color}`);
    }
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    // If no exact match, fallback to any variant for the product
    const { data: fallbackData } = await supabaseAdmin
      .from("product_variants")
      .select("id, stock_qty, size, color, color_hex")
      .eq("product_id", productId);

    if (fallbackData && fallbackData.length > 0) {
      return fallbackData[0];
    }
    // Return default fallback variant for catalog products missing explicit variant rows in DB
    return { id: crypto.randomUUID(), stock_qty: 999, size: size || "M", color: color || "Black" };
  }
  return data[0];
}

// Coupon validation logic
export async function validateCoupon(code, subtotal) {
  if (!code) throw new ApiError(400, "Coupon code is required");
  
  const upperCode = code.trim().toUpperCase();

  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", upperCode)
    .maybeSingle();

  if (error) {
    logError("Coupon query failed", { code: upperCode, error });
    throw new ApiError(500, "Failed to validate coupon");
  }

  if (!coupon) {
    throw new ApiError(404, "Invalid coupon code");
  }

  if (!coupon.is_active) {
    throw new ApiError(400, "Coupon is inactive");
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw new ApiError(400, "Coupon has expired");
  }

  if (Number(subtotal) < Number(coupon.min_order_amount)) {
    throw new ApiError(400, `Minimum order amount of ₹${Number(coupon.min_order_amount).toLocaleString()} is required for this coupon.`);
  }

  return coupon;
}

export async function validateCouponEndpoint(code, subtotal) {
  const coupon = await validateCoupon(code, subtotal);
  return {
    success: true,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    min_order_amount: coupon.min_order_amount,
  };
}

// Confirmation tasks: Decrement stock & Send receipt email
async function confirmOrder(orderId) {
  // 1. Fetch order details
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    logError("Failed to fetch order for confirmation", logContext({ orderId, error: orderErr }));
    return;
  }

  // 2. Fetch order items with product details for confirmation email
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("*, products(image, images)")
    .eq("order_id", orderId);

  if (itemsError || !items) {
    logError("Failed to fetch order items for confirmation", logContext({ orderId, error: itemsError }));
    return;
  }

  // 3. Decrement stock of product variants
  for (const item of items) {
    if (!item.product_id || !isValidUuid(item.product_id)) continue; // Skip custom/deleted items
    const variant = await getVariantForItem(item.product_id, item.size, item.color);
    if (variant) {
      const newStock = Math.max(0, variant.stock_qty - item.quantity);
      const { error: updateError } = await supabaseAdmin
        .from("product_variants")
        .update({ stock_qty: newStock })
        .eq("id", variant.id);

      if (updateError) {
        logError("Failed to decrement variant stock", logContext({ variantId: variant.id, orderId, error: updateError }));
      }
    }
  }

  // 4. Send email confirmation
  try {
    const emailData = buildOrderEmail({
      order,
      items,
      address: order.shipping_address,
    });

    await sendEmail({
      to: order.shipping_address.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });
    console.log(`[SMTP Order Email Sent] To: ${order.shipping_address.email} for Order: ${orderId}`);
  } catch (emailErr) {
    logError("Failed to send order confirmation email", logContext({ orderId, error: emailErr }));
  }

  // 5. Clear cart items for this user in the database
  if (order.user_id) {
    try {
      const { error: clearCartErr } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", order.user_id);

      if (clearCartErr) {
        logError("Failed to clear cart items for user", logContext({ userId: order.user_id, error: clearCartErr }));
      }
    } catch (clearErr) {
      logError("Failed to clear cart items exception", logContext({ userId: order.user_id, error: clearErr }));
    }
  }

  // 6. Forward order to Shiprocket for fulfillment
  try {
    await createShiprocketOrder(orderId);
  } catch (srErr) {
    logError("Shiprocket sync failed inside order confirmation", logContext({ orderId, error: srErr }));
  }

  // 7. Dispatch conversion event to Meta Conversions API (CAPI)
  try {
    const orderMeta = order.meta || order.shipping_address?._meta || {};
    const skus = (items || []).map((i) => i.product_id || i.product_name);
    await sendPurchaseToMeta({
      id: order.id,
      paidAt: order.created_at ? new Date(order.created_at).getTime() : Date.now(),
      email: order.shipping_address?.email,
      phone: order.shipping_address?.phone,
      total: Number(order.total_amount),
      skus,
      meta: {
        ip: orderMeta.ip,
        ua: orderMeta.ua,
        fbp: orderMeta.fbp,
        fbc: orderMeta.fbc,
      },
    });
  } catch (capiErr) {
    logError("Meta CAPI dispatch failed inside order confirmation", logContext({ orderId, error: capiErr }));
  }
}

export async function initiateCheckout({ user_id, cart, address, total_amount, subtotal, payment_method, couponCode, meta }) {
  if (!Array.isArray(cart) || cart.length === 0) throw new ApiError(400, "Cart is empty");
  if (!address || typeof address !== "object") throw new ApiError(400, "Shipping address is required");

  // 1. Validate stock and verify prices for all items directly from the database
  let verifiedSubtotal = 0;
  const verifiedOrderItems = [];

  for (const item of cart) {
    const qty = Number(item?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY) {
      throw new ApiError(400, `Invalid quantity for item ${item?.name || ""}.`.trim());
    }

    // Only real catalog products (UUID ids) and custom designs can be ordered.
    const isCatalogItem = isValidUuid(item.id);
    if (!isCatalogItem && !isCustomItem(item)) {
      throw new ApiError(400, `Item ${item?.name || ""} is no longer available. Please remove it from your cart.`);
    }

    const variant = await getVariantForItem(item.id, item.size, item.color);
    if (!variant) {
      throw new ApiError(400, `Selected variant for item ${item.name} is not available.`);
    }
    if (variant.stock_qty < qty) {
      throw new ApiError(400, `Insufficient stock for item ${item.name}. Only ${variant.stock_qty} left.`);
    }

    // Price always comes from the server: the DB for catalog products, the
    // customiser's pricing rules for custom designs. Never the client's number.
    let unitPrice;
    if (isCatalogItem) {
      const { data: dbProduct, error: productError } = await supabaseAdmin
        .from("products")
        .select("price")
        .eq("id", item.id)
        .maybeSingle();

      if (productError) {
        logError("Product price lookup failed", logContext({ productId: item.id, error: productError }));
        throw new ApiError(500, "Failed to verify product prices");
      }
      if (!dbProduct || !(Number(dbProduct.price) > 0)) {
        throw new ApiError(400, `Item ${item.name} is no longer available. Please remove it from your cart.`);
      }
      unitPrice = Number(dbProduct.price);
    } else {
      unitPrice = getCustomItemUnitPrice(item);
    }

    const itemTotalPrice = unitPrice * qty;
    verifiedSubtotal += itemTotalPrice;

    verifiedOrderItems.push({
      product_id: isValidUuid(item.id) ? item.id : null,
      product_name: item.name,
      size: item.size,
      color: item.color,
      quantity: qty,
      unit_price: unitPrice,
      total_price: itemTotalPrice,
    });
  }

  // 2. Validate coupon and calculate verified discount
  let discountAmount = 0;
  if (couponCode) {
    try {
      const coupon = await validateCoupon(couponCode, verifiedSubtotal);
      if (coupon.discount_type === "percentage") {
        discountAmount = Math.round((verifiedSubtotal * Number(coupon.discount_value)) / 100);
      } else if (coupon.discount_type === "fixed") {
        discountAmount = Number(coupon.discount_value);
      }
      discountAmount = Math.min(discountAmount, verifiedSubtotal);
    } catch (err) {
      throw new ApiError(400, err.message || "Invalid coupon code");
    }
  }

  // 3. Compute verified total amount (same formula as CheckoutPage.jsx: both
  // shipping and tax are based on the pre-discount subtotal)
  const verifiedShipping = calculateShipping(verifiedSubtotal);
  const verifiedTax = calculateTax(verifiedSubtotal);
  const verifiedTotal = Math.max(0, verifiedSubtotal - discountAmount + verifiedShipping + verifiedTax);

  if (total_amount && Math.abs(Number(total_amount) - verifiedTotal) > 1) {
    logError("Client total amount mismatch detected (price tampering attempt blocked)", logContext({ clientTotal: total_amount, verifiedTotal, clientSubtotal: subtotal, verifiedSubtotal }));
  }
  
  // Create an order in Supabase
  const orderId = crypto.randomUUID();
  const orderUserId = isValidUuid(user_id) ? user_id : null;

  const { error: orderError } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    user_id: orderUserId,
    total_amount: Number(verifiedTotal.toFixed(2)),
    subtotal: Number(verifiedSubtotal.toFixed(2)),
    shipping_amount: Number(verifiedShipping.toFixed(2)),
    tax_amount: Number(verifiedTax.toFixed(2)),
    payment_method: payment_method,
    shipping_address: { ...address, _meta: meta || {} },
    status: payment_method === "cod" ? "confirmed" : "pending",
    coupon_code: couponCode || null,
    discount_amount: Number(discountAmount.toFixed(2)),
    meta: meta || {},
  });

  if (orderError) {
    logError("Failed to create order", logContext({ error: orderError }));
    throw new ApiError(500, "Failed to create order in database");
  }

  // Insert order items
  const orderItemsWithId = verifiedOrderItems.map(item => ({
    ...item,
    order_id: orderId
  }));

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItemsWithId);
  if (itemsError) {
    logError("Failed to insert order items", logContext({ error: itemsError }));
    throw new ApiError(500, "Failed to create order items");
  }

  if (payment_method === "cod") {
    // Confirm COD order immediately (decrements stock & sends email)
    await confirmOrder(orderId);
    return { success: true, orderId, method: "cod" };
  }

  // Otherwise, initiate Cashfree payment
  let customerId = orderUserId;
  if (!customerId || !/^[a-zA-Z0-9._-]+$/.test(customerId)) {
    customerId = `GUEST_${Date.now()}`;
  }
  
  const phone = sanitizePhone(address.phone);
  const email = sanitizeEmail(address.email);
  const name = String(address.name || "Guest User").trim() || "Guest User";

  try {
    const cashfreeRes = await createPaymentOrder({
      orderId: orderId,
      amount: Number(verifiedTotal.toFixed(2)),
      customerId: customerId,
      customerPhone: phone,
      customerEmail: email,
      customerName: name
    });

    return { 
      success: true, 
      orderId, 
      paymentSessionId: cashfreeRes.payment_session_id,
      cashfreeMode: getCashfreeCheckoutMode(),
      method: payment_method
    };
  } catch (error) {
    logError("Cashfree order creation failed", logContext({ error }));
    throw new ApiError(500, "Failed to initiate payment gateway");
  }
}

export async function verifyCheckout(orderId) {
  try {
    const payments = await verifyPayment(orderId);
    
    // Check if there is a successful payment
    const isSuccess = payments.some(p => p.payment_status === "SUCCESS");

    if (isSuccess) {
      // Atomic pending -> confirmed transition: the status filter on the UPDATE
      // means only one concurrent request (page reload, double tab, retry) can
      // win it, so stock is decremented and the email sent exactly once.
      const { data: claimedRows, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", orderId)
        .eq("status", "pending")
        .select("id");

      if (updateError) throw new ApiError(500, "Failed to update order status");

      if (Array.isArray(claimedRows) && claimedRows.length > 0) {
        // Decrement stock & send confirmation email ONCE
        await confirmOrder(orderId);
      }

      // Response deliberately excludes order details (address, email, phone):
      // this endpoint is unauthenticated and only needs to report the outcome.
      return { success: true, status: "SUCCESS", orderId };
    }

    return { success: true, status: "PENDING_OR_FAILED", orderId };
  } catch (error) {
    logError("Cashfree verification failed", logContext({ orderId, error }));
    throw new ApiError(500, "Failed to verify payment");
  }
}
