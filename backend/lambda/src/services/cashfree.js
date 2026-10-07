import crypto from "crypto";
import { Cashfree, CFEnvironment } from "cashfree-pg";

let cashfreeInstance = null;

/**
 * Verifies a Cashfree payment webhook (API version 2023-08-01):
 * signature = base64(HMAC-SHA256(timestamp + rawBody, client secret)).
 * rawBody must be the exact bytes received — re-serialised JSON won't match.
 */
export function verifyWebhookSignature(rawBody, signature, timestamp) {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret || !rawBody || !signature || !timestamp) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("base64");
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Where Cashfree sends this order's payment webhook. Requires an https
// BACKEND_PUBLIC_URL (e.g. https://www.velvetwolf.in/api); otherwise no
// notify_url is sent and orders are confirmed only via the return page.
function getWebhookNotifyUrl() {
  const base = String(process.env.BACKEND_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  return base.startsWith("https://") ? `${base}/checkout/webhook` : null;
}

// Mode for the browser Checkout SDK. It must match the environment the
// payment session was created in, so the frontend takes it from the
// /checkout/create response instead of hard-coding it.
export function getCashfreeCheckoutMode() {
  return process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" ? "production" : "sandbox";
}

function getCashfree() {
  if (!cashfreeInstance) {
    // Switch between SANDBOX and PRODUCTION based on CASHFREE_ENVIRONMENT
    const environment =
      process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX;

    cashfreeInstance = new Cashfree(
      environment,
      process.env.CASHFREE_APP_ID,
      process.env.CASHFREE_SECRET_KEY,
      undefined, // XPartnerKey
      undefined, // XClientSignature
      undefined, // XPartnerMerchantId
      false      // XEnableErrorAnalytics - disabled to prevent Zone Allocation / Sentry OOM crashes
    );

    // Explicitly set the API version to ensure consistency with existing usage
    cashfreeInstance.XApiVersion = "2023-08-01";
  }
  return cashfreeInstance;
}

/**
 * Create a new payment order using Cashfree PG
 * @param {Object} orderData 
 * @param {string} orderData.orderId - Unique order ID
 * @param {number} orderData.amount - Payment amount
 * @param {string} orderData.customerId - Unique customer ID
 * @param {string} orderData.customerPhone - Customer phone number
 * @param {string} orderData.customerEmail - Customer email address
 * @param {string} orderData.customerName - Customer name
 * @param {string} [orderData.currency="INR"] - Currency (defaults to INR)
 * @returns {Promise<Object>} Cashfree order response
 */
export const createPaymentOrder = async (orderData) => {
  try {
    const request = {
      order_amount: orderData.amount,
      order_currency: orderData.currency || "INR",
      order_id: orderData.orderId,
      customer_details: {
        customer_id: orderData.customerId,
        customer_phone: orderData.customerPhone,
        customer_email: orderData.customerEmail,
        customer_name: orderData.customerName,
      },
      order_meta: {
        // Adjust this return URL based on your frontend route
        return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/?order_id={order_id}`,
      },
    };
    // Server-to-server confirmation, so a paid order is confirmed even if the
    // customer closes the tab before returning to the site.
    const notifyUrl = getWebhookNotifyUrl();
    if (notifyUrl) request.order_meta.notify_url = notifyUrl;

    const cashfree = getCashfree();
    // PGCreateOrder is an instance method in v5 SDK
    const response = await cashfree.PGCreateOrder(request);
    return response.data;
  } catch (error) {
    console.error("Cashfree Create Order Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Payment initiation failed");
  }
};

/**
 * Verify payment status for a specific order
 * @param {string} orderId - The ID of the order to verify
 * @returns {Promise<Object[]>} Array of payment records for the order
 */
export const verifyPayment = async (orderId) => {
  try {
    const cashfree = getCashfree();
    // PGOrderFetchPayments is an instance method in v5 SDK
    const response = await cashfree.PGOrderFetchPayments(orderId);
    return response.data; // This returns a list of payments for the order
  } catch (error) {
    console.error("Cashfree Verify Order Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Payment verification failed");
  }
};


