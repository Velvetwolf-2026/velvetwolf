import crypto from "node:crypto";

const sha = (v) =>
  v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined;

/**
 * Dispatches a server-side Purchase event to Meta Graph Conversions API (CAPI).
 * Deduplicates with the browser Pixel Purchase event via matching event_id.
 *
 * @param {Object} order
 * @param {string} order.id - Unique order ID (matches browser eventID)
 * @param {number} [order.paidAt] - Timestamp in ms when payment was confirmed
 * @param {string} [order.email] - Customer email
 * @param {string} [order.phone] - Customer phone number
 * @param {number} order.total - Total order value in INR
 * @param {string[]} [order.skus] - List of product IDs or SKUs
 * @param {Object} [order.meta] - Metadata containing client IP, user agent, _fbp, _fbc cookies
 */
export async function sendPurchaseToMeta(order) {
  const pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  const capiToken = process.env.META_CAPI_TOKEN;
  const graphVersion = process.env.META_GRAPH_VERSION || "v20.0";
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !capiToken) {
    console.log("[Meta CAPI] Skipping Purchase event: META_PIXEL_ID or META_CAPI_TOKEN not configured.");
    return;
  }

  // Normalize phone for Meta CAPI (format: country code + digits, e.g. 91XXXXXXXXXX)
  let rawPhone = String(order.phone || "").replace(/\D/g, "");
  if (rawPhone.length === 10) {
    rawPhone = `91${rawPhone}`;
  }

  const emailHash = order.email ? sha(order.email) : undefined;
  const phoneHash = rawPhone ? sha(rawPhone) : undefined;

  const userData = {
    ...(emailHash ? { em: [emailHash] } : {}),
    ...(phoneHash ? { ph: [phoneHash] } : {}),
    ...(order.meta?.ip ? { client_ip_address: order.meta.ip } : {}),
    ...(order.meta?.ua ? { client_user_agent: order.meta.ua } : {}),
    ...(order.meta?.fbp ? { fbp: order.meta.fbp } : {}),
    ...(order.meta?.fbc ? { fbc: order.meta.fbc } : {}),
  };

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor((order.paidAt || Date.now()) / 1000),
        event_id: String(order.id),
        action_source: "website",
        event_source_url: `https://velvetwolf.in/payment-status?order_id=${order.id}`,
        user_data: userData,
        custom_data: {
          currency: "INR",
          value: Number(order.total),
          content_ids: (order.skus || []).map(String),
          content_type: "product",
        },
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const url = `https://graph.facebook.com/${graphVersion}/${pixelId}/events?access_token=${capiToken}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const responseBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[Meta CAPI Error]", res.status, responseBody);
    } else {
      console.log(`[Meta CAPI] Purchase event sent for order ${order.id}. Events received: ${responseBody.events_received}`);
    }
  } catch (err) {
    console.error("[Meta CAPI Exception]", err.message);
  }
}
