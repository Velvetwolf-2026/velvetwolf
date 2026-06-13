export function buildOrderEmail({ order, items, address }) {
  const isCod = order.payment_method === "cod";
  const paymentText = isCod ? "Cash on Delivery" : "Online Verified Payment";

  const itemsListHtml = items.map(item => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:14px; color:#ffffff;">
        <div style="font-weight:bold;">${escapeHtml(item.product_name)}</div>
        <div style="font-size:11px; color:#a0a0a0;">Size: ${escapeHtml(item.size || "Default")} | Color: ${escapeHtml(item.color || "Default")}</div>
      </td>
      <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:14px; color:#ffffff; text-align:center;">
        ${item.quantity}
      </td>
      <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:14px; color:#ffffff; text-align:right;">
        ₹${Number(item.unit_price).toLocaleString()}
      </td>
      <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:14px; color:#d7b85a; text-align:right; font-weight:bold;">
        ₹${Number(item.total_price).toLocaleString()}
      </td>
    </tr>
  `).join("");

  const itemsListText = items.map(item => 
    `- ${item.product_name} (Size: ${item.size || "Default"}, Color: ${item.color || "Default"}) x ${item.quantity}: ₹${Number(item.total_price).toLocaleString()}`
  ).join("\n");

  const addressHtml = `
    <div style="font-size:14px; line-height:1.6; color:#cfcfcf;">
      <strong>${escapeHtml(address.name)}</strong><br />
      Phone: ${escapeHtml(address.phone)}<br />
      Email: ${escapeHtml(address.email)}<br />
      Address: ${escapeHtml(address.address)}, ${escapeHtml(address.city)}, ${escapeHtml(address.state)} - ${escapeHtml(address.pincode)}
    </div>
  `;

  const addressText = `${address.name}\nPhone: ${address.phone}\nEmail: ${address.email}\n${address.address}, ${address.city}, ${address.state} - ${address.pincode}`;

  const subject = `Order Confirmed - VelvetWolf [${order.id.slice(0, 8).toUpperCase()}]`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#050505;background-image:radial-gradient(circle at top left, rgba(215,184,90,0.08), transparent 25%), linear-gradient(135deg, #050505 0%, #0b0b14 55%, #050505 100%);color:#ffffff;">
  <div style="width:100%;padding:30px 16px;">
    <div style="max-width:640px;margin:0 auto;background:#0a0a0f;border:1px solid rgba(215,184,90,0.18);box-shadow:0 0 30px rgba(0,0,0,0.35);">
      
      <!-- Logo Header -->
      <div style="padding:28px 32px 18px;border-bottom:1px solid rgba(215,184,90,0.12);">
        <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:6px;color:#f4f4f4;text-transform:uppercase;">VELVETWOLF</h1>
        <div style="margin-top:6px;font-size:11px;letter-spacing:4px;color:#d7b85a;text-transform:uppercase;">Luxury Streetwear</div>
        <div style="margin-top:18px;font-size:12px;letter-spacing:5px;color:#d7b85a;text-transform:uppercase;">ORDER CONFIRMATION</div>
      </div>

      <!-- Main Body -->
      <div style="padding:40px 32px 36px;">
        <h2 style="margin:0 0 14px;font-size:30px;line-height:1.1;font-weight:800;text-transform:uppercase;color:#ffffff;">
          THANK YOU FOR <span style="color:#d7b85a;">YOUR ORDER</span>
        </h2>
        <p style="font-size:15px;line-height:1.8;color:#cfcfcf;margin:0 0 18px;">
          Hi ${escapeHtml(address.name.split(" ")[0])}, your order has been received and is now being processed. Below are the details of your purchase:
        </p>

        <!-- Order Summary Box -->
        <div style="margin:20px 0; padding:16px; border:1px solid rgba(215,184,90,0.18); background:rgba(255,255,255,0.01);">
          <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#d7b85a; margin-bottom:8px;">Order Reference</div>
          <div style="font-size:16px; font-weight:bold; color:#ffffff; font-family:monospace;">${order.id.toUpperCase()}</div>
          <div style="margin-top:10px; font-size:12px; color:#cfcfcf;">Payment Method: <strong>${paymentText}</strong></div>
        </div>

        <!-- Shipping details -->
        <h3 style="font-size:16px; letter-spacing:2px; text-transform:uppercase; color:#d7b85a; border-bottom:1px solid rgba(215,184,90,0.12); padding-bottom:8px; margin-top:30px; margin-bottom:12px;">Delivery Address</h3>
        ${addressHtml}

        <!-- Items Table -->
        <h3 style="font-size:16px; letter-spacing:2px; text-transform:uppercase; color:#d7b85a; border-bottom:1px solid rgba(215,184,90,0.12); padding-bottom:8px; margin-top:30px; margin-bottom:12px;">Items Ordered</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          <thead>
            <tr style="border-bottom:1px solid rgba(215,184,90,0.2);">
              <th style="padding:10px 0; text-align:left; font-size:11px; letter-spacing:1px; color:#d7b85a; text-transform:uppercase;">Item</th>
              <th style="padding:10px 0; text-align:center; font-size:11px; letter-spacing:1px; color:#d7b85a; text-transform:uppercase;">Qty</th>
              <th style="padding:10px 0; text-align:right; font-size:11px; letter-spacing:1px; color:#d7b85a; text-transform:uppercase;">Price</th>
              <th style="padding:10px 0; text-align:right; font-size:11px; letter-spacing:1px; color:#d7b85a; text-transform:uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="width:100%; max-width:280px; margin-left:auto; font-family:monospace; font-size:13px; line-height:1.8; color:#cfcfcf;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Subtotal:</span>
            <span>₹${Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Shipping:</span>
            <span>${Number(order.shipping_amount) === 0 ? "FREE" : `₹${Number(order.shipping_amount).toLocaleString()}`}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>GST (18%):</span>
            <span>₹${Number(order.tax_amount).toLocaleString()}</span>
          </div>
          ${order.discount_amount && Number(order.discount_amount) > 0 ? `
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#ff6b6b;">
            <span>Discount:</span>
            <span>-₹${Number(order.discount_amount).toLocaleString()}</span>
          </div>
          ` : ""}
          <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:bold; color:#d7b85a; border-top:1px solid #d7b85a; margin-top:8px; padding-top:8px;">
            <span>TOTAL:</span>
            <span>₹${Number(order.total_amount).toLocaleString()}</span>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div style="padding:22px 32px 30px;border-top:1px solid rgba(215,184,90,0.12);font-size:12px;line-height:1.8;color:#888888;">
        This is an automated receipt for your purchase. If you have any questions, please contact us at info@velvetwolf.in.<br />
        &copy; 2026 VELVETWOLF. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `
VELVETWOLF
Order Confirmation

Hi ${address.name.split(" ")[0]}, thank you for your order.

Order Reference: ${order.id.toUpperCase()}
Payment Method: ${paymentText}

Delivery Address:
${addressText}

Items Ordered:
${itemsListText}

Subtotal: ₹${Number(order.subtotal).toLocaleString()}
Shipping: ${Number(order.shipping_amount) === 0 ? "FREE" : `₹${Number(order.shipping_amount).toLocaleString()}`}
GST (18%): ₹${Number(order.tax_amount).toLocaleString()}
${order.discount_amount && Number(order.discount_amount) > 0 ? `Discount: -₹${Number(order.discount_amount).toLocaleString()}\n` : ""}
TOTAL: ₹${Number(order.total_amount).toLocaleString()}

---
This is an automated email. Please do not reply.
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
