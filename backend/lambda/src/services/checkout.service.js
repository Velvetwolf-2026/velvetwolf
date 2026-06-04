import { supabaseAdmin } from "../config/supabase.js";
import { createPaymentOrder, verifyPayment } from "./cashfree.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

function logContext(context = {}) {
  return { service: "checkout", ...context };
}

export async function initiateCheckout({ user_id, cart, address, total_amount, subtotal, shipping_amount, tax_amount, payment_method }) {
  if (!cart || cart.length === 0) throw new ApiError(400, "Cart is empty");
  
  // Create an order in Supabase
  const orderId = "VW_ORD_" + Date.now() + Math.floor(Math.random() * 1000);

  const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    user_id: user_id || null, // null for guests
    total_amount: Number(total_amount),
    subtotal: Number(subtotal),
    shipping_amount: Number(shipping_amount),
    tax_amount: Number(tax_amount),
    payment_method: payment_method,
    shipping_address: address,
    status: payment_method === "cod" ? "confirmed" : "pending"
  }).select().single();

  if (orderError) {
    logError("Failed to create order", logContext({ error: orderError }));
    throw new ApiError(500, "Failed to create order in database");
  }

  // Insert order items
  const orderItems = cart.map(item => ({
    order_id: orderId,
    product_id: item.id,
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
    return { success: true, orderId, method: "cod" };
  }

  // Otherwise, initiate Cashfree payment
  // Note: user_id could be null for guests, we use a fallback
  const customerId = user_id || `GUEST_${Date.now()}`;
  
  try {
    const cashfreeRes = await createPaymentOrder({
      orderId: orderId,
      amount: Number(total_amount),
      customerId: customerId,
      customerPhone: address.phone || "9999999999",
      customerEmail: address.email || "guest@velvetwolf.in",
      customerName: address.name || "Guest User"
    });

    return { 
      success: true, 
      orderId, 
      paymentSessionId: cashfreeRes.payment_session_id,
      method: payment_method
    };
  } catch (error) {
    // Let the order sit at pending
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
      const { data, error } = await supabaseAdmin.from("orders")
        .update({ status: "confirmed" })
        .eq("id", orderId)
        .select().single();
        
      if (error) throw new ApiError(500, "Failed to update order status");
      return { success: true, status: "SUCCESS", order: data };
    }

    return { success: true, status: "PENDING_OR_FAILED", details: payments };
  } catch (error) {
    logError("Cashfree verification failed", logContext({ orderId, error }));
    throw new ApiError(500, "Failed to verify payment");
  }
}
