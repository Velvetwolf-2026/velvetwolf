// ─────────────────────────────────────────────
// VelvetWolf — Shopping Policy Page
// Route: /shopping-policy
// ─────────────────────────────────────────────
import { S, PageHeader, Sec, Ul, DataTable } from "../styles/shared";
import { THEME } from "../utils/constants";
const { gold, surface, border, muted } = THEME;

const QUICK_CARDS = [
  { icon: "📦", title: "FREE SHIPPING",  desc: "On all orders above ₹1,999 across India" },
  { icon: "⚡", title: "FAST DISPATCH",  desc: "Orders dispatched within 2–3 business days" },
  { icon: "🔒", title: "SECURE PAYMENT", desc: "256-bit SSL encryption via Razorpay" },
  { icon: "↩", title: "EASY RETURNS",   desc: "7-day return window on eligible items" },
];

export default function ShoppingPolicy() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <PageHeader eyebrow="POLICIES" title="SHOPPING POLICY" sub="Everything you need to know about shopping with VelvetWolf" />

        {/* Quick cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:48 }}>
          {QUICK_CARDS.map((c, i) => (
            <div key={i} style={{ background:surface, border:`1px solid ${border}`, padding:"20px 22px", borderLeft:`3px solid ${gold}` }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{c.icon}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:3, color:gold, marginBottom:4 }}>{c.title}</div>
              <div style={{ fontSize:13, color:muted }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <Sec title="PLACING AN ORDER">
          <Ul items={["Browse and add items to your cart. Size charts are on each product page.","Enter your delivery address accurately — we are not responsible for failed delivery due to incorrect addresses.","Choose payment: UPI, card, net banking, EMI, or COD.","Order confirmation email within 15 minutes of successful payment.","Orders can be modified within 1 hour by emailing orders@velvetwolf.in"]} />
        </Sec>

        <Sec title="SHIPPING & DELIVERY">
          <DataTable
            headers={["Shipping Type", "Estimated Time", "Cost"]}
            rows={[
              ["Standard (Orders < ₹1,999)", "5–7 business days", "₹79"],
              ["Standard (Orders ≥ ₹1,999)", "5–7 business days", "FREE"],
              ["Express Delivery",            "2–3 business days", "₹149"],
              ["Same-Day (Chennai only)",     "Within 8 hours",    "₹199"],
              ["COD Orders",                  "5–7 business days", "₹79 + ₹50 COD fee"],
            ]}
          />
          <Ul items={["We ship Pan-India including J&K and North-East (add 2–3 extra days).","International shipping not available at this time.","Tracking link sent via email and SMS once dispatched."]} />
        </Sec>

        <Sec title="PAYMENT OPTIONS">
          <Ul items={["UPI (Google Pay, PhonePe, Paytm, BHIM)","Credit & Debit Cards (Visa, Mastercard, RuPay, Amex)","Net Banking (all major Indian banks)","EMI — 0% EMI on orders above ₹2,999 on select cards","Cash on Delivery (COD) — available on orders up to ₹5,000","VelvetWolf Gift Cards"]} />
        </Sec>

        <Sec title="GST & INVOICING">
          <p style={S.p}>All prices are inclusive of applicable GST. A GST-compliant invoice will be emailed after dispatch. For a GSTIN invoice, enter it during checkout or email us within 48 hours of order placement.</p>
        </Sec>

        <Sec title="BULK & CORPORATE ORDERS">
          <p style={S.p}>For orders of 10+ pieces, contact <span style={{color:gold}}>bulk@velvetwolf.in</span> or use the Bulk Orders page for a quote within 24 hours.</p>
        </Sec>

        <Sec title="PROMOTIONS & DISCOUNT CODES">
          <Ul items={["Only one discount code can be applied per order.","Codes cannot be applied retroactively.","Codes are non-transferable and have no cash value.","VelvetWolf reserves the right to cancel fraudulently discounted orders.","Sale items are final sale unless stated otherwise."]} />
        </Sec>
      </div>
    </div>
  );
}
