import { Cashfree, CFEnvironment } from "cashfree-pg";

// Using the environment variables from your configuration
// We switch between SANDBOX and PRODUCTION based on CASHFREE_ENVIRONMENT
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment =
  process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

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
        return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-status?order_id={order_id}`,
      },
    };

    // The API version is required, 2023-08-01 is currently supported by the SDK
    const response = await Cashfree.PGCreateOrder("2023-08-01", request);
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
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
    return response.data; // This returns a list of payments for the order
  } catch (error) {
    console.error("Cashfree Verify Order Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Payment verification failed");
  }
};
