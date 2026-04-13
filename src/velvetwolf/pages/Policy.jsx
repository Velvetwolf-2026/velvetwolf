// ─────────────────────────────────────────────
// VelvetWolf — PrivacyPolicy Page
// Route: /privacy
// ─────────────────────────────────────────────
import { S, PageHeader, Sec, Ul } from "../styles/shared";
import { THEME } from "../utils/constants";
const { gold } = THEME;

export default function PrivacyPolicy() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <PageHeader eyebrow="LEGAL" title="PRIVACY POLICY" sub="Last updated: March 2026  ·  Effective immediately" />
        <p style={S.p}>VelvetWolf is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit velvetwolf.in or make a purchase.</p>

        <Sec title="1. INFORMATION WE COLLECT">
          <h3 style={S.h3}>Personal Information You Provide</h3>
          <Ul items={["Full name and contact details (email, phone number)","Shipping and billing address","Payment information (processed securely via Razorpay — we never store card details)","Account credentials (if you create an account)","Communications you send us (emails, chat messages, reviews)"]} />
          <h3 style={S.h3}>Automatically Collected Information</h3>
          <Ul items={["IP address, browser type, and device information","Pages visited, time on site, and referral URLs","Cookies and similar tracking technologies","Order history and browsing behaviour on our site"]} />
        </Sec>

        <Sec title="2. HOW WE USE YOUR INFORMATION">
          <Ul items={["To process and fulfil your orders and send order confirmations","To communicate about shipping, delivery, and order updates","To respond to customer service inquiries","To personalise your shopping experience","To send marketing emails and SMS (only if you opt in)","To prevent fraud and maintain site security","To comply with Indian law (IT Act 2000, GST regulations)"]} />
        </Sec>

        <Sec title="3. SHARING YOUR INFORMATION">
          <p style={S.p}>We do not sell your personal data. We may share information with:</p>
          <Ul items={["Shipping partners (Shiprocket, Delhivery, Blue Dart) for order delivery","Payment processors (Razorpay) for transaction processing","Analytics providers (Google Analytics) in anonymised form","Legal authorities if required by law or court order"]} />
        </Sec>

        <Sec title="4. COOKIES">
          <p style={S.p}>We use cookies to enhance your browsing experience. Types we use:</p>
          <Ul items={["Essential cookies — required for cart and checkout to function","Analytics cookies — help us understand how you use our site","Marketing cookies — used to show relevant ads (only with consent)"]} />
        </Sec>

        <Sec title="5. YOUR RIGHTS">
          <Ul items={["Access: Request a copy of the personal data we hold about you","Correction: Ask us to update inaccurate information","Deletion: Request erasure of your data (subject to legal obligations)","Opt-out: Unsubscribe from marketing at any time","Portability: Receive your data in a machine-readable format"]} />
          <p style={S.p}>To exercise these rights, email: <span style={{ color: gold }}>privacy@velvetwolf.in</span></p>
        </Sec>

        <Sec title="6. SECURITY">
          <p style={S.p}>We use SSL encryption, PCI-DSS compliant payment processing via Razorpay, and regular security audits. No transmission over the internet is 100% secure.</p>
        </Sec>

        <Sec title="7. CONTACT">
          <p style={S.p}>Privacy enquiries: <span style={{ color: gold }}>privacy@velvetwolf.in</span><br/>VelvetWolf, Chennai, Tamil Nadu, India</p>
        </Sec>
      </div>
    </div>
  );
}
