// ─────────────────────────────────────────────
// VelvetWolf — Terms & Agreements Page
// Route: /terms
// ─────────────────────────────────────────────
import { S, PageHeader, Sec, Ul } from "../styles/shared";

export default function TermsPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <PageHeader eyebrow="LEGAL" title="TERMS & AGREEMENTS" sub="Last updated: March 2025  ·  Please read carefully before using our services" />
        <p style={S.p}>By accessing velvetwolf.in or placing an order, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>

        <Sec title="1. ACCEPTANCE OF TERMS">
          <p style={S.p}>These Terms constitute a legally binding agreement between you and VelvetWolf (registered in India). You must be at least 18 years old, or have parental consent, to place an order.</p>
        </Sec>

        <Sec title="2. PRODUCTS & AVAILABILITY">
          <Ul items={["All products are subject to availability. We reserve the right to discontinue any product at any time.","Product colours may vary slightly from images due to screen calibration.","Limited Edition drops are non-refundable once sold — final sale.","We reserve the right to limit quantities per customer.","Custom and personalised orders cannot be cancelled once production begins."]} />
        </Sec>

        <Sec title="3. PRICING & PAYMENT">
          <Ul items={["All prices are in Indian Rupees (₹) inclusive of GST unless stated otherwise.","Prices are subject to change without notice. Orders are charged at checkout price.","We accept UPI, credit/debit cards, net banking, and EMI via Razorpay.","In case of pricing errors, we may cancel orders and issue a full refund.","COD available at select pin codes with an additional ₹50 handling fee."]} />
        </Sec>

        <Sec title="4. ORDER CONFIRMATION">
          <p style={S.p}>A confirmation email does not guarantee availability or price. A binding contract is formed only when we send a dispatch confirmation. We may cancel any order at our discretion and will issue a full refund.</p>
        </Sec>

        <Sec title="5. INTELLECTUAL PROPERTY">
          <Ul items={["All content on velvetwolf.in is owned by VelvetWolf and protected under Indian copyright law.","You may not reproduce, distribute, or use our content without written permission.","User-submitted custom designs: by uploading, you confirm you own the rights and grant us a limited licence to reproduce them on ordered items only.","VelvetWolf is not liable for copyright infringement from user-submitted designs."]} />
        </Sec>

        <Sec title="6. PROHIBITED CONDUCT">
          <p style={S.p}>You agree not to:</p>
          <Ul items={["Submit designs containing hate speech, obscene content, or infringing materials","Hack, scrape, or disrupt our website","Place fraudulent orders or use stolen payment credentials","Resell VelvetWolf products without prior written authorisation","Misrepresent your identity or affiliation with VelvetWolf"]} />
        </Sec>

        <Sec title="7. LIMITATION OF LIABILITY">
          <p style={S.p}>VelvetWolf's total liability for any claim shall not exceed the amount paid for the specific order giving rise to the claim. We are not liable for indirect, incidental, or consequential damages.</p>
        </Sec>

        <Sec title="8. GOVERNING LAW">
          <p style={S.p}>These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of courts in Chennai, Tamil Nadu.</p>
        </Sec>
      </div>
    </div>
  );
}
