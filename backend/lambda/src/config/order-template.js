export function buildOrderEmail({ order, items, address }) {
  const isCod = order.payment_method === "cod";
  const paymentText = isCod ? "Cash on Delivery" : "Online Verified Payment";
  
  // Format dates beautifully
  const orderDateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

  // Calculate estimated delivery: Order date + 5-7 days
  const estDeliveryStr = order.estimated_delivery_date
    ? new Date(order.estimated_delivery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : (order.created_at
        ? new Date(new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));

  // Generate dynamic user-friendly order number: VW-YYYYMMDD-XXXXX
  const orderNumberStr = order.order_number 
    || `VW-${new Date(order.created_at || Date.now()).toISOString().slice(0, 10).replace(/-/g, "")}-${order.id.slice(0, 5).toUpperCase()}`;

  const businessGSTIN = "27AAACW8382G1Z2"; // VelvetWolf luxury streetwear registered GSTIN

  // Mask email for security/privacy (e.g. vimal******@gmail.com)
  const maskEmail = (emailStr) => {
    if (!emailStr) return "";
    const parts = emailStr.split("@");
    if (parts.length !== 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 3)}${"*".repeat(Math.max(3, name.length - 3))}@${domain}`;
  };

  const maskedEmailStr = maskEmail(address.email);

  // Helper to extract image thumbnail from order item products relation
  const getItemImage = (item) => {
    let imgUrl = null;
    if (item.products) {
      if (item.products.image) {
        imgUrl = item.products.image;
      } else if (Array.isArray(item.products.images) && item.products.images.length > 0) {
        imgUrl = item.products.images[0];
      }
    }
    
    if (typeof imgUrl === "string") {
      if (imgUrl.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(imgUrl);
          if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
        } catch (e) {}
      }
      if (imgUrl.includes("::")) {
        imgUrl = imgUrl.split("::")[1];
      }
      return imgUrl;
    }
    return "https://npxjtjteydkacbcdbvss.supabase.co/storage/v1/object/public/product-images/Logo/vw-logo.png";
  };

  // Build items HTML list with product thumbnail
  const itemsListHtml = items.map(item => {
    const imageUrl = getItemImage(item);
    const size = escapeHtml(item.size || "Default");
    const color = escapeHtml(item.color || "Default");
    
    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #2A2A2A; width: 68px; vertical-align: middle;">
          <img src="${imageUrl}" alt="${escapeHtml(item.product_name)}" style="width: 58px; height: 58px; object-fit: cover; border-radius: 2px; border: 1px solid #2A2A2A; background-color: #1A1A1A;" />
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #2A2A2A; vertical-align: middle; text-align: left;">
          <div style="font-family: 'Manrope', system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 600; color: #FAF9F6; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">${escapeHtml(item.product_name)}</div>
          <div style="font-family: 'Manrope', system-ui, -apple-system, sans-serif; font-size: 10px; color: #A8A49C; margin-top: 4px; letter-spacing: 0.5px;">
            SIZE: <span style="color: #FAF9F6; font-weight: 500;">${size}</span> &nbsp;|&nbsp; 
            COLOR: <span style="color: #FAF9F6; font-weight: 500;">${color}</span>
          </div>
        </td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #2A2A2A; vertical-align: middle; font-family: 'Space Mono', monospace; font-size: 12px; color: #FAF9F6; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 16px 8px; border-bottom: 1px solid #2A2A2A; vertical-align: middle; font-family: 'Space Mono', monospace; font-size: 12px; color: #FAF9F6; text-align: right; white-space: nowrap;">
          ₹${Number(item.unit_price).toLocaleString('en-IN')}
        </td>
        <td style="padding: 16px 0; border-bottom: 1px solid #2A2A2A; vertical-align: middle; font-family: 'Space Mono', monospace; font-size: 12px; color: #C9A24D; font-weight: bold; text-align: right; white-space: nowrap;">
          ₹${Number(item.total_price).toLocaleString('en-IN')}
        </td>
      </tr>
    `;
  }).join("");

  // Plain Text Version formatting
  const itemsListText = items.map(item => 
    `- ${item.product_name} (Size: ${item.size || "Default"}, Color: ${item.color || "Default"}) x ${item.quantity}: ₹${Number(item.total_price).toLocaleString('en-IN')}`
  ).join("\n");

  const addressText = `${address.name}\nPhone: ${address.phone}\nEmail: ${maskedEmailStr}\n${address.address}\n${address.city}, ${address.state} - ${address.pincode}\n${address.country || "India"}`;

  const subject = `Order Confirmed - VelvetWolf [${orderNumberStr}]`;

  // Dynamic tracking variables
  const isShipped = !!order.awb_number;
  const trackingUrl = order.awb_number 
    ? `https://www.velvetwolf.in/track?awb=${order.awb_number}` 
    : "#";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600&family=Manrope:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
    
    /* Responsive overrides */
    @media only screen and (max-width: 600px) {
      .vw-container {
        width: 100% !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      .vw-details-col {
        display: block !important;
        width: 100% !important;
        padding-right: 0 !important;
        padding-bottom: 24px !important;
      }
      .vw-address-col {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
      }
      .vw-btn-stack {
        display: block !important;
      }
      .vw-btn-stack a, .vw-btn-stack span {
        display: block !important;
        margin: 8px 0 !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; color: #FAF9F6; -webkit-font-smoothing: antialiased; font-family: 'Manrope', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0D0D0D; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="vw-container" style="background-color: #131313; border: 1px solid #2A2A2A; width: 600px; max-width: 600px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px; border-bottom: 1px solid #2A2A2A;">
              <div style="font-family: 'Unbounded', system-ui, sans-serif; font-size: 20px; font-weight: 600; letter-spacing: 6px; color: #FAF9F6; text-transform: uppercase; line-height: 1.1;">VELVETWOLF</div>
              <div style="font-family: 'Manrope', system-ui, sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 4px; color: #C9A24D; text-transform: uppercase; margin-top: 6px; line-height: 1;">Luxury Streetwear</div>
              <div style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 5px; color: #A8A49C; text-transform: uppercase; margin-top: 24px; line-height: 1;">ORDER CONFIRMATION</div>
            </td>
          </tr>

          <!-- HERO SECTION -->
          <tr>
            <td style="padding: 40px 32px 32px; text-align: left;">
              <h2 style="margin: 0 0 16px; font-family: 'Unbounded', system-ui, sans-serif; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.2; color: #FAF9F6;">
                THANK YOU FOR <span style="color: #C9A24D;">YOUR ORDER</span>
              </h2>
              <p style="font-family: 'Manrope', system-ui, sans-serif; font-size: 14px; line-height: 1.7; color: #A8A49C; margin: 0 0 16px;">
                Hi ${escapeHtml(address.name.split(" ")[0])},
              </p>
              <p style="font-family: 'Manrope', system-ui, sans-serif; font-size: 14px; line-height: 1.7; color: #A8A49C; margin: 0 0 16px;">
                Your order has been successfully confirmed and payment has been received.
              </p>
              <p style="font-family: 'Manrope', system-ui, sans-serif; font-size: 14px; line-height: 1.7; color: #A8A49C; margin: 0;">
                Every VelvetWolf piece is individually inspected and packed before dispatch to ensure premium quality.
              </p>
            </td>
          </tr>

          <!-- TIMELINE PROGRESS BAR -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1A1A1A; border: 1px solid #2A2A2A; padding: 24px;">
                <tr>
                  <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 12px; font-weight: 600; color: #C9A24D; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 18px;">
                    ORDER TIMELINE
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <!-- Step 1: Confirmed -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 14px; height: 14px; border-radius: 50%; background-color: #C9A24D;">
                            <tr><td align="center" style="font-size: 9px; color: #0D0D0D; font-weight: bold; line-height: 14px;">✓</td></tr>
                          </table>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: #FAF9F6; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Order Confirmed
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #C9A24D; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 2: Payment -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 14px; height: 14px; border-radius: 50%; background-color: #C9A24D;">
                            <tr><td align="center" style="font-size: 9px; color: #0D0D0D; font-weight: bold; line-height: 14px;">✓</td></tr>
                          </table>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: #FAF9F6; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Payment Received
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #2A2A2A; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 3: Quality Check -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <div style="width: 10px; height: 10px; border-radius: 50%; border: 2px solid #6B6862; background-color: transparent; margin: 0 auto;"></div>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #A8A49C; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Printing & Quality Check
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #2A2A2A; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 4: Packed -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <div style="width: 10px; height: 10px; border-radius: 50%; border: 2px solid #6B6862; background-color: transparent; margin: 0 auto;"></div>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #A8A49C; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Packed
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #2A2A2A; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 5: Ready for Pickup -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <div style="width: 10px; height: 10px; border-radius: 50%; border: 2px solid #6B6862; background-color: transparent; margin: 0 auto;"></div>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #A8A49C; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Ready for Pickup
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #2A2A2A; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 6: Shipped -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <div style="width: 10px; height: 10px; border-radius: 50%; border: 2px solid #6B6862; background-color: transparent; margin: 0 auto;"></div>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #A8A49C; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Shipped
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #2A2A2A; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 7: In Transit -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <div style="width: 10px; height: 10px; border-radius: 50%; border: 2px solid #6B6862; background-color: transparent; margin: 0 auto;"></div>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #A8A49C; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          In Transit
                        </td>
                      </tr>
                      <tr>
                        <td style="border-left: 2px solid #2A2A2A; height: 16px; margin-left: 9px;"></td>
                        <td></td>
                      </tr>

                      <!-- Step 8: Delivered -->
                      <tr>
                        <td valign="middle" style="width: 20px; text-align: center;">
                          <div style="width: 10px; height: 10px; border-radius: 50%; border: 2px solid #6B6862; background-color: transparent; margin: 0 auto;"></div>
                        </td>
                        <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 500; color: #A8A49C; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px;">
                          Delivered
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DETAILS GRID -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #2A2A2A; border-bottom: 1px solid #2A2A2A; padding: 24px 0;">
                <tr>
                  <!-- Left: Order Info -->
                  <td width="50%" valign="top" class="vw-details-col" style="padding-right: 16px;">
                    <h3 style="margin: 0 0 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #C9A24D; letter-spacing: 2px; text-transform: uppercase;">ORDER DETAILS</h3>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; line-height: 1.6; color: #FAF9F6;">
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Order Number:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: bold; color: #FAF9F6;">${orderNumberStr}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Order Date:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-family: 'Space Mono', monospace; font-size: 12px;">${orderDateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Payment Method:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-weight: 500;">${paymentText}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Payment Status:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; color: #C9A24D; font-weight: bold;">Paid</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Estimated Delivery:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-weight: 500;">${estDeliveryStr}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Delivery Method:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-weight: 500;">${isCod ? "Standard Shipping" : "Express Shipping"}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 6px; color: #A8A49C; font-size: 12px;">Tracking Information:</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #FAF9F6; font-style: italic;">
                          ${isShipped 
                            ? `AWB: ${order.awb_number} (${order.courier_name || "Shiprocket"})`
                            : "Tracking details will be shared once your order is dispatched."}
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Right: Address Info -->
                  <td width="50%" valign="top" class="vw-address-col" style="padding-left: 16px; border-left: 1px solid #2A2A2A;">
                    <h3 style="margin: 0 0 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #C9A24D; letter-spacing: 2px; text-transform: uppercase;">DELIVERY ADDRESS</h3>
                    <div style="font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; line-height: 1.7; color: #FAF9F6;">
                      <div style="font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${escapeHtml(address.name)}</div>
                      <div style="margin-bottom: 4px; color: #A8A49C;"><span style="font-size: 11px; letter-spacing: 0.5px;">TEL:</span> ${escapeHtml(address.phone)}</div>
                      <div style="margin-bottom: 12px; color: #A8A49C;"><span style="font-size: 11px; letter-spacing: 0.5px;">EMAIL:</span> ${escapeHtml(maskedEmailStr)}</div>
                      <div style="color: #FAF9F6; margin-top: 8px; line-height: 1.5;">
                        ${escapeHtml(address.address)}<br />
                        ${escapeHtml(address.city)}, ${escapeHtml(address.state)}<br />
                        <span style="font-family: 'Space Mono', monospace; font-weight: bold; font-size: 12px; color: #FAF9F6;">${escapeHtml(address.pincode)}</span><br />
                        <span style="text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #A8A49C;">${escapeHtml(address.country || "India")}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ITEMS TABLE -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h3 style="margin: 0 0 16px; font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #C9A24D; letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid #2A2A2A; padding-bottom: 8px;">ORDERED ITEMS</h3>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <thead>
                  <tr style="border-bottom: 1px solid #2A2A2A;">
                    <th style="padding-bottom: 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #A8A49C; text-align: left; text-transform: uppercase;">Product</th>
                    <th style="padding-bottom: 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #A8A49C; text-align: left; text-transform: uppercase; padding-left: 12px;">Details</th>
                    <th style="padding-bottom: 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #A8A49C; text-align: center; text-transform: uppercase;">Qty</th>
                    <th style="padding-bottom: 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #A8A49C; text-align: right; text-transform: uppercase;">Price</th>
                    <th style="padding-bottom: 12px; font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #A8A49C; text-align: right; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- PRICING SUMMARY -->
          <tr>
            <td style="padding: 0 32px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" align="right">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: 'Space Mono', monospace; font-size: 12px; line-height: 2; color: #A8A49C;">
                      <tr>
                        <td align="left" style="padding-bottom: 4px;">Subtotal</td>
                        <td align="right" style="padding-bottom: 4px; color: #FAF9F6;">₹${Number(order.subtotal).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td align="left" style="padding-bottom: 4px;">Shipping</td>
                        <td align="right" style="padding-bottom: 4px; color: #FAF9F6;">${Number(order.shipping_amount) === 0 ? "FREE" : `₹${Number(order.shipping_amount).toLocaleString('en-IN')}`}</td>
                      </tr>
                      <tr>
                        <td align="left" style="padding-bottom: 4px;">GST (18%)</td>
                        <td align="right" style="padding-bottom: 4px; color: #FAF9F6;">₹${Number(order.tax_amount).toLocaleString('en-IN')}</td>
                      </tr>
                      ${order.discount_amount && Number(order.discount_amount) > 0 ? `
                      <tr>
                        <td align="left" style="padding-bottom: 4px; color: #E57373;">Discount Applied</td>
                        <td align="right" style="padding-bottom: 4px; color: #E57373;">-₹${Number(order.discount_amount).toLocaleString('en-IN')}</td>
                      </tr>
                      ` : ""}
                      <tr style="border-top: 1px solid #C9A24D;">
                        <td align="left" style="padding-top: 12px; font-family: 'Unbounded', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #C9A24D; text-transform: uppercase;">GRAND TOTAL</td>
                        <td align="right" style="padding-top: 12px; font-family: 'Unbounded', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #C9A24D; white-space: nowrap;">₹${Number(order.total_amount).toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WHAT HAPPENS NEXT -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1A1A1A; border: 1px solid #2A2A2A; padding: 24px;">
                <tr>
                  <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 12px; font-weight: 600; color: #C9A24D; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 12px;">
                    WHAT HAPPENS NEXT?
                  </td>
                </tr>
                <tr>
                  <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; line-height: 1.6; color: #A8A49C;">
                    <ol style="margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 8px;">Our team begins production and quality inspection of your premium pieces.</li>
                      <li style="margin-bottom: 8px;">Your order will be packaged meticulously in our custom premium luxury boxes.</li>
                      <li style="margin-bottom: 8px;">Shipping details and tracking information will be sent directly via email once dispatched.</li>
                      <li style="margin-bottom: 0;">Delivery status updates will be messaged to you automatically until arrival.</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ACTION BUTTONS / SUPPORT -->
          <tr>
            <td align="center" style="padding: 0 32px 32px;">
              <div class="vw-btn-stack" style="margin-bottom: 24px;">
                <!-- View Order Button -->
                <a href="https://www.velvetwolf.in/account" target="_blank" style="display: inline-block; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-decoration: none; text-transform: uppercase; background-color: #FAF9F6; color: #0D0D0D; padding: 12px 24px; border: 1px solid #FAF9F6; border-radius: 2px; margin: 0 6px;">VIEW ORDER</a>
                
                <!-- Track Order Button -->
                ${isShipped ? `
                  <a href="${trackingUrl}" target="_blank" style="display: inline-block; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-decoration: none; text-transform: uppercase; background-color: #C9A24D; color: #0D0D0D; padding: 12px 24px; border: 1px solid #C9A24D; border-radius: 2px; margin: 0 6px;">TRACK ORDER</a>
                ` : `
                  <span style="display: inline-block; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-decoration: none; text-transform: uppercase; background-color: #2A2A2A; color: #6B6862; padding: 12px 24px; border: 1px solid #2A2A2A; border-radius: 2px; cursor: not-allowed; margin: 0 6px;" title="Disabled until order dispatches">TRACK ORDER</span>
                `}
                
                <!-- Contact Support Button -->
                <a href="mailto:support@velvetwolf.in?subject=Order%20Help%20-${orderNumberStr}" style="display: inline-block; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-decoration: none; text-transform: uppercase; background-color: transparent; color: #FAF9F6; padding: 12px 24px; border: 1px solid #2A2A2A; border-radius: 2px; margin: 0 6px;">CONTACT SUPPORT</a>
              </div>
              
              ${!isShipped ? `
                <div style="font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; color: #6B6862; font-style: italic; margin-top: -16px; margin-bottom: 24px;">*Track Order button will activate once package is shipped.</div>
              ` : ""}

              <!-- Need Help Section -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #2A2A2A; padding-top: 24px; text-align: center;">
                <tr>
                  <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 13px; color: #FAF9F6;">
                    <div style="font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #C9A24D; margin-bottom: 4px;">NEED HELP?</div>
                    <a href="mailto:support@velvetwolf.in" style="color: #FAF9F6; text-decoration: none; font-weight: bold;">support@velvetwolf.in</a>
                    <div style="font-size: 11px; color: #A8A49C; margin-top: 4px;">
                      Business Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- RETURN & EXCHANGE INFO -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #2A2A2A; padding-top: 24px;">
                <tr>
                  <td style="font-family: 'Manrope', system-ui, sans-serif; font-size: 12px; line-height: 1.6; color: #A8A49C; text-align: left;">
                    <div style="font-weight: 600; color: #FAF9F6; margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase;">RETURN & EXCHANGE POLICY</div>
                    <ul style="margin: 0; padding-left: 16px;">
                      <li style="margin-bottom: 4px;">Size exchanges are available within 7 days of delivery.</li>
                      <li style="margin-bottom: 4px;">Returns and exchanges are subject to our terms and conditions.</li>
                      <li style="margin-bottom: 6px;">Customized, made-to-order, and limited-edition items may not be eligible for returns.</li>
                    </ul>
                    <a href="https://www.velvetwolf.in/returns" target="_blank" style="color: #C9A24D; text-decoration: underline; font-weight: 500;">Review our full Return & Exchange Policy</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GST TAX COMPLIANCE -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #2A2A2A; padding-top: 24px; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; line-height: 1.6; color: #A8A49C; text-align: left;">
                <tr>
                  <td>
                    <div style="font-weight: 600; color: #FAF9F6; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">GST COMPLIANCE DETAILS</div>
                    <div><span style="color: #6B6862;">GSTIN:</span> ${businessGSTIN}</div>
                    <div><span style="color: #6B6862;">Tax Invoice:</span> A formal tax invoice will be generated and emailed as a PDF once your order is dispatched.</div>
                    <div style="font-style: italic; color: #6B6862; margin-top: 4px;">If you require a specific corporate GST invoice, please reach out to support before dispatch.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LEGAL FOOTER DISCLAIMER -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #2A2A2A; padding-top: 24px; font-family: 'Manrope', system-ui, sans-serif; font-size: 10px; line-height: 1.5; color: #6B6862; text-align: left;">
                <tr>
                  <td>
                    By placing this order, you represent that you agree to the VelvetWolf 
                    <a href="https://www.velvetwolf.in/terms" target="_blank" style="color: #A8A49C; text-decoration: underline;">Terms & Conditions</a>, 
                    <a href="https://www.velvetwolf.in/privacy" target="_blank" style="color: #A8A49C; text-decoration: underline;">Privacy Policy</a>, 
                    <a href="https://www.velvetwolf.in/shipping" target="_blank" style="color: #A8A49C; text-decoration: underline;">Shipping Policy</a>, 
                    <a href="https://www.velvetwolf.in/refund" target="_blank" style="color: #A8A49C; text-decoration: underline;">Refund Policy</a>, and 
                    <a href="https://www.velvetwolf.in/returns" target="_blank" style="color: #A8A49C; text-decoration: underline;">Return Policy</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BRAND STATEMENT -->
          <tr>
            <td align="center" style="padding: 0 32px 32px; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; line-height: 1.6; color: #A8A49C; border-top: 1px solid #2A2A2A; padding-top: 24px;">
              <div style="font-weight: 500; font-style: italic; color: #FAF9F6; margin-bottom: 4px;">"Every VelvetWolf product undergoes a final quality inspection before dispatch."</div>
              <div>Thank you for supporting independent premium streetwear.</div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color: #0D0D0D; padding: 32px; border-top: 1px solid #2A2A2A; font-family: 'Manrope', system-ui, sans-serif; font-size: 11px; line-height: 1.8; color: #6B6862;">
              <div style="font-family: 'Unbounded', system-ui, sans-serif; font-weight: 600; color: #FAF9F6; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">VELVETWOLF</div>
              <div style="font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #C9A24D; margin-top: 2px; margin-bottom: 12px;">Luxury Streetwear</div>
              
              <div>GSTIN: ${businessGSTIN}</div>
              <div>Support: <a href="mailto:support@velvetwolf.in" style="color: #6B6862; text-decoration: none;">support@velvetwolf.in</a></div>
              <div>Website: <a href="https://www.velvetwolf.in" style="color: #6B6862; text-decoration: none;">www.velvetwolf.in</a></div>
              
              <div style="margin: 16px 0 12px;">
                <a href="https://www.instagram.com/velvetwolf.in" style="color: #FAF9F6; text-decoration: none; display: inline-block; margin: 0 8px; font-weight: bold; letter-spacing: 0.5px;">INSTAGRAM</a>
                <span style="color: #2A2A2A;">|</span>
                <a href="https://wa.me/919999999999" style="color: #FAF9F6; text-decoration: none; display: inline-block; margin: 0 8px; font-weight: bold; letter-spacing: 0.5px;">WHATSAPP</a>
              </div>
              
              <div style="font-size: 9px; color: #6B6862; margin-top: 8px;">
                &copy; 2026 VELVETWOLF. All Rights Reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
VELVETWOLF
Luxury Streetwear

ORDER CONFIRMATION

THANK YOU FOR YOUR ORDER

Hi ${address.name.split(" ")[0]},

Your order has been successfully confirmed and payment has been received.

Every VelvetWolf piece is individually inspected and packed before dispatch to ensure premium quality.

--------------------------------------------------
ORDER SUMMARY
--------------------------------------------------
Order Number: ${orderNumberStr}
Order Date: ${orderDateStr}
Payment Method: ${paymentText}
Payment Status: Paid
Estimated Delivery: ${estDeliveryStr}
Delivery Method: ${isCod ? "Standard Shipping" : "Express Shipping"}
Tracking: ${isShipped ? `AWB: ${order.awb_number} (${order.courier_name})` : "Tracking details will be shared once your order is dispatched."}

--------------------------------------------------
DELIVERY ADDRESS
--------------------------------------------------
${addressText}

--------------------------------------------------
ORDERED ITEMS
--------------------------------------------------
${itemsListText}

Subtotal: ₹${Number(order.subtotal).toLocaleString('en-IN')}
Shipping: ${Number(order.shipping_amount) === 0 ? "FREE" : `₹${Number(order.shipping_amount).toLocaleString('en-IN')}`}
GST (18%): ₹${Number(order.tax_amount).toLocaleString('en-IN')}
${order.discount_amount && Number(order.discount_amount) > 0 ? `Discount Applied: -₹${Number(order.discount_amount).toLocaleString('en-IN')}\n` : ""}
GRAND TOTAL: ₹${Number(order.total_amount).toLocaleString('en-IN')}

--------------------------------------------------
WHAT HAPPENS NEXT?
--------------------------------------------------
1. Our team begins production and quality inspection.
2. Your order will be packed using premium packaging.
3. Shipping details and tracking information will be emailed once dispatched.
4. Delivery updates will be sent automatically.

--------------------------------------------------
SUPPORT & RETURNS
--------------------------------------------------
Need Help? Email: support@velvetwolf.in
Business Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST

Return Policy: Size exchanges are available within 7 days of delivery. Returns and exchanges are subject to our Return Policy. Customized, made-to-order, and limited-edition items may not be eligible for returns.

GSTIN: ${businessGSTIN}
A GST tax invoice will be generated and shared once your order is dispatched.

By placing this order, you agree to our Terms & Conditions, Privacy Policy, Shipping Policy, Refund Policy, and Return Policy.

Every VelvetWolf product undergoes a final quality inspection before dispatch. Thank you for supporting independent premium streetwear.

VELVETWOLF
Luxury Streetwear
support@velvetwolf.in
www.velvetwolf.in
`;

  return { subject, html, text };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
