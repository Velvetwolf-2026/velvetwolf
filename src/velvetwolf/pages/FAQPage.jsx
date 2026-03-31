// ─────────────────────────────────────────────
// VelvetWolf — FAQ Page
// Route: /faq
// ─────────────────────────────────────────────
import { useState } from "react";
import { S, PageHeader, Sec } from "../styles/shared";
import { THEME } from "../utils/constants";
const { gold, surface, border, muted, text } = THEME;

const FAQS = [
  { cat:"ORDERS",    q:"How do I place an order?",              a:"Browse collections, select size and colour, add to cart, and checkout. You'll receive a confirmation email within 15 minutes of payment." },
  { cat:"ORDERS",    q:"Can I modify or cancel my order?",      a:"Orders can be modified or cancelled within 1 hour by emailing orders@velvetwolf.in. After that, the order enters production and cannot be changed." },
  { cat:"ORDERS",    q:"Is COD available?",                     a:"Yes! Cash on Delivery is available for orders up to ₹5,000 at select pin codes. A ₹50 handling fee applies." },
  { cat:"SHIPPING",  q:"When will my order ship?",              a:"We dispatch all orders within 2–3 business days of payment. You'll receive a tracking link via email and SMS once dispatched." },
  { cat:"SHIPPING",  q:"Do you ship internationally?",          a:"International shipping is not available currently. Join our newsletter to be notified when it goes live." },
  { cat:"SHIPPING",  q:"My order hasn't updated in 48 hours.",  a:"Contact us at support@velvetwolf.in with your order ID. We'll investigate and respond within 4 hours." },
  { cat:"PRODUCTS",  q:"Will sold-out items restock?",          a:"Popular items are restocked periodically. Join the waitlist on the product page or follow our Instagram for announcements. Limited Edition drops typically do not restock." },
  { cat:"PRODUCTS",  q:"How do I care for my VelvetWolf tee?",  a:"Machine wash cold, turn inside out, avoid bleach, and air dry for best longevity. Iron on medium heat, never directly on prints." },
  { cat:"PRODUCTS",  q:"Are your fabrics sustainable?",         a:"We use 100% combed cotton and GOTS-certified organic cotton on select lines. Our Bamboo Blend series uses sustainably sourced bamboo-cotton fabric." },
  { cat:"CUSTOM",    q:"How does the custom design service work?", a:"Upload your design on our Custom Design page, choose fabric and base colour, enter quantity, and get an instant price estimate. We'll print and ship within 7–10 business days." },
  { cat:"CUSTOM",    q:"What file formats are accepted?",        a:"We accept PNG, PDF, AI, and PSD files. Minimum resolution 300 DPI. For best results, send vector files. We'll send a digital proof before production." },
  { cat:"RETURNS",   q:"What is your return policy?",           a:"We accept returns within 7 days of delivery for unworn, unwashed items with tags intact. Custom orders and Limited Edition drops are non-returnable." },
  { cat:"RETURNS",   q:"How long does a refund take?",          a:"Refunds are processed within 48 hours of receiving the item. Bank processing adds 3–5 days. Choose Store Credit for an instant refund." },
  { cat:"ACCOUNT",   q:"Do I need an account to order?",        a:"No — you can checkout as a guest. However, an account lets you track orders, save addresses, and access exclusive member offers." },
  { cat:"ACCOUNT",   q:"How do I reset my password?",           a:"Click 'Forgot Password' on the login page. You'll receive a reset link within 5 minutes. Check spam if you don't see it." },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div style={{ border:`1px solid ${isOpen ? gold+"55" : border}`, marginBottom:8, transition:"border-color 0.3s" }}>
      <button
        onClick={onToggle}
        style={{ all:"unset", width:"100%", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", boxSizing:"border-box" }}
      >
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:1, color:isOpen?gold:text }}>{faq.q}</span>
        <span style={{ color:gold, fontSize:20, transform:isOpen?"rotate(45deg)":"rotate(0)", transition:"transform 0.3s", flexShrink:0, marginLeft:16 }}>+</span>
      </button>
      {isOpen && (
        <div style={{ padding:"0 20px 18px", borderTop:`1px solid ${border}` }}>
          <p style={{ ...S.p, marginBottom:0, marginTop:14 }}>{faq.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [open, setOpen] = useState(null);
  const categories = [...new Set(FAQS.map(f => f.cat))];

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <PageHeader eyebrow="HELP" title="FREQUENTLY ASKED QUESTIONS" sub="Quick answers to the most common questions" />

        {categories.map(cat => (
          <div key={cat} style={{ marginBottom:36 }}>
            <h2 style={S.h2}>{cat}</h2>
            {FAQS.filter(f => f.cat === cat).map((faq, i) => {
              const key = `${cat}-${i}`;
              return (
                <FAQItem
                  key={key}
                  faq={faq}
                  isOpen={open === key}
                  onToggle={() => setOpen(open === key ? null : key)}
                />
              );
            })}
          </div>
        ))}

        {/* Still need help */}
        <div style={{ background:surface, border:`1px solid ${border}`, padding:"28px", textAlign:"center", marginTop:20 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:4, color:gold, marginBottom:8 }}>STILL HAVE QUESTIONS?</div>
          <p style={{ ...S.p, marginBottom:20 }}>Our support team is available 10AM–7PM IST, Monday to Saturday.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {[{ label:"EMAIL SUPPORT", val:"support@velvetwolf.in" },{ label:"WHATSAPP", val:"+91 98765 43210" }].map((c,i) => (
              <div key={i} style={{ border:`1px solid ${gold}55`, padding:"10px 20px", textAlign:"left" }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:3, color:muted, marginBottom:2 }}>{c.label}</div>
                <div style={{ fontSize:13, color:gold }}>{c.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
