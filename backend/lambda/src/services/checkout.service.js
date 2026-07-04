import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { createPaymentOrder, verifyPayment } from "./cashfree.js";
import { ApiError, logError } from "../utils/http.js";
import { sendEmail } from "../config/smtp.js";
import { buildOrderEmail } from "../config/order-template.js";
import { createShiprocketOrder } from "./shiprocket.service.js";

function logContext(context = {}) {
  return { service: "checkout", ...context };
}

// Helper to check if a string is a valid UUID
const isValidUuid = (uuid) => {
  return typeof uuid === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

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
    return null;
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

  // 2. Fetch order items
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("*")
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
}

export async function initiateCheckout({ user_id, cart, address, total_amount, subtotal, shipping_amount, tax_amount, payment_method, couponCode }) {
  if (!cart || cart.length === 0) throw new ApiError(400, "Cart is empty");
  
  // 1. Validate stock for all items
  for (const item of cart) {
    const variant = await getVariantForItem(item.id, item.size, item.color);
    if (!variant) {
      throw new ApiError(400, `Selected variant for item ${item.name} is not available.`);
    }
    if (variant.stock_qty < item.qty) {
      throw new ApiError(400, `Insufficient stock for item ${item.name}. Only ${variant.stock_qty} left.`);
    }
  }

  // 2. Validate coupon if present
  let discountAmount = 0;
  if (couponCode) {
    try {
      const coupon = await validateCoupon(couponCode, subtotal);
      if (coupon.discount_type === "percentage") {
        discountAmount = Math.round((Number(subtotal) * Number(coupon.discount_value)) / 100);
      } else if (coupon.discount_type === "fixed") {
        discountAmount = Number(coupon.discount_value);
      }
      // Cap discount amount at subtotal
      discountAmount = Math.min(discountAmount, Number(subtotal));
    } catch (err) {
      throw new ApiError(400, err.message || "Invalid coupon code");
    }
  }
  
  // Create an order in Supabase
  const orderId = crypto.randomUUID();

  // Validate user_id as a UUID, otherwise fallback to null (for guest checkout)
  const orderUserId = isValidUuid(user_id) ? user_id : null;

  const { error: orderError } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    user_id: orderUserId,
    total_amount: Number(total_amount),
    subtotal: Number(subtotal),
    shipping_amount: Number(shipping_amount),
    tax_amount: Number(tax_amount),
    payment_method: payment_method,
    shipping_address: address,
    status: payment_method === "cod" ? "confirmed" : "pending",
    coupon_code: couponCode || null,
    discount_amount: Number(discountAmount)
  });

  if (orderError) {
    logError("Failed to create order", logContext({ error: orderError }));
    throw new ApiError(500, "Failed to create order in database");
  }

  // Insert order items
  const orderItems = cart.map(item => ({
    order_id: orderId,
    product_id: isValidUuid(item.id) ? item.id : null,
    product_name: item.name,
    size: item.size,
    color: item.color,
    quantity: item.qty,
    unit_price: Number(item.price),
    total_price: Number(item.price) * Number(item.qty)
  }));

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
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
      amount: Number(total_amount),
      customerId: customerId,
      customerPhone: phone,
      customerEmail: email,
      customerName: name
    });

    return { 
      success: true, 
      orderId, 
      paymentSessionId: cashfreeRes.payment_session_id,
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
      // Get current order status
      const { data: currentOrder, error: statusError } = await supabaseAdmin
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .maybeSingle();

      if (statusError) throw new ApiError(500, "Failed to check order status");
      
      if (currentOrder && currentOrder.status !== "confirmed") {
        const { data, error } = await supabaseAdmin.from("orders")
          .update({ status: "confirmed" })
          .eq("id", orderId)
          .select().single();
          
        if (error) throw new ApiError(500, "Failed to update order status");

        // Decrement stock & send confirmation email
        await confirmOrder(orderId);
        return { success: true, status: "SUCCESS", order: data };
      } else {
        // Already confirmed
        return { success: true, status: "SUCCESS", order: currentOrder };
      }
    }

    return { success: true, status: "PENDING_OR_FAILED", details: payments };
  } catch (error) {
    logError("Cashfree verification failed", logContext({ orderId, error }));
    throw new ApiError(500, "Failed to verify payment");
  }
}
