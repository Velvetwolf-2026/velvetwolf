// analytics.js
// Lightweight utility to dispatch standard analytics events for GA4 and Meta Pixel.

export const trackEvent = (eventName, params = {}) => {
  console.log(`[ANALYTICS] Event: ${eventName}`, params);

  // GA4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  } else if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({ event: eventName, ...params });
  }

  // Meta Pixel
  if (typeof window !== "undefined" && window.fbq) {
    if (eventName === "view_item") {
      window.fbq("track", "ViewContent", {
        content_names: [params.items?.[0]?.item_name],
        content_ids: [params.items?.[0]?.item_id],
        content_type: "product",
        value: params.value,
        currency: params.currency || "INR",
      });
    } else if (eventName === "add_to_cart") {
      window.fbq("track", "AddToCart", {
        content_names: [params.items?.[0]?.item_name],
        content_ids: [params.items?.[0]?.item_id],
        content_type: "product",
        value: params.value,
        currency: params.currency || "INR",
      });
    } else if (eventName === "begin_checkout") {
      window.fbq("track", "InitiateCheckout", {
        value: params.value,
        currency: params.currency || "INR",
        num_items: params.items?.length,
      });
    } else if (eventName === "purchase") {
      window.fbq("track", "Purchase", {
        value: params.value,
        currency: params.currency || "INR",
        content_ids: params.items?.map(i => i.item_id),
        content_type: "product",
      });
    }
  }
};

export const trackViewItem = (product) => {
  trackEvent("view_item", {
    currency: "INR",
    value: Number(product.price),
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: Number(product.price),
        item_category: product.collection,
      },
    ],
  });
};

export const trackAddToCart = (product, qty = 1, size = null, color = null) => {
  trackEvent("add_to_cart", {
    currency: "INR",
    value: Number(product.price) * qty,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: Number(product.price),
        quantity: qty,
        item_category: product.collection,
        item_variant: `${size || "default"}_${color || "default"}`,
      },
    ],
  });
};

export const trackBeginCheckout = (cart, total) => {
  trackEvent("begin_checkout", {
    currency: "INR",
    value: Number(total),
    items: cart.map(item => ({
      item_id: item.id || item.product_id,
      item_name: item.name,
      price: Number(item.price),
      quantity: item.qty || item.quantity,
      item_variant: `${item.size || "default"}_${item.color || "default"}`,
    })),
  });
};

export const trackPurchase = (orderId, cart, total, method = "card") => {
  trackEvent("purchase", {
    transaction_id: orderId,
    currency: "INR",
    value: Number(total),
    payment_type: method,
    items: cart.map(item => ({
      item_id: item.id || item.product_id,
      item_name: item.name,
      price: Number(item.price),
      quantity: item.qty || item.quantity,
      item_variant: `${item.size || "default"}_${item.color || "default"}`,
    })),
  });
};
