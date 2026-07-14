import { useContext, useState } from "react";
import { AppContext } from "../pages/AppContext";
import { getSupabaseLogoUrl } from "../utils/supabase";

export default function Footer() {
  const { setPage, openShop, showToast } = useContext(AppContext);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState(""); // "success" | "error"

  const handleSubscribe = () => {
    const trimmed = newsletterEmail.trim();
    if (!trimmed) {
      setFeedback("Please enter your email address.");
      setFeedbackType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setFeedback("Please enter a valid email address.");
      setFeedbackType("error");
      return;
    }

    // Success
    setFeedback("Welcome to the pack! Check your inbox soon.");
    setFeedbackType("success");
    setNewsletterEmail("");
    if (showToast) {
      showToast("Subscription successful! Welcome to the pack ◆");
    }
  };

  const handleEmailChange = (e) => {
    setNewsletterEmail(e.target.value);
    if (feedback) setFeedback("");
  };

  const socialLinkStyle = {
    fontFamily: "'Roboto', sans-serif",
    fontSize: 20,
    color: "var(--silver)",
    cursor: "pointer",
    letterSpacing: 1,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <footer className="vw-footer" style={{ background: "var(--graphite)", borderTop: "1px solid var(--smoke)", padding: "56px 40px 28px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
          <div className="footer-brand-col">
            <div className="vw-footer-brand-title" style={{ fontFamily: "'Roboto', sans-serif", fontSize: 28, letterSpacing: 6, marginBottom: 4 }}>
              VELVETWOLF
            </div>
            <div
              className="vw-footer-subtitle"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 9,
                letterSpacing: 3.2,
                color: "var(--gold)",
                marginBottom: 10,
              }}
            >
              LUXURY STREETWEAR · EST. 2025
            </div>
            <p
              className="vw-footer-copy"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 17,
                color: "var(--silver)",
                lineHeight: 1.8,
                fontStyle: "italic",
                maxWidth: 340,
              }}
            >
              Born in Chennai. Worn worldwide. VelvetWolf exists for the silent predators — those who lead with
              presence, not noise.
            </p>

            <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
              <a
                href="https://www.instagram.com/velvetwolfofficial?igsh=MWJ3Ym94OXgwcHZ4ag=="
                target="_blank"
                rel="noopener noreferrer"
                style={socialLinkStyle}
                className="vw-footer-social-link"
              >
                <img src={getSupabaseLogoUrl("/instagram.png")} alt="Instagram" style={{ width: 20, height: 20, objectFit: "contain" }} /> Instagram
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61577839378533"
                target="_blank"
                rel="noopener noreferrer"
                style={socialLinkStyle}
                className="vw-footer-social-link"
              >
                <img src={getSupabaseLogoUrl("/facebook.png")} alt="Facebook" style={{ width: 20, height: 20, objectFit: "contain" }} /> Facebook
              </a>
              <a
                href="https://twitter.com/velvetwolf_in"
                target="_blank"
                rel="noopener noreferrer"
                style={socialLinkStyle}
                className="vw-footer-social-link"
              >
                <img src={getSupabaseLogoUrl("/x.png")} alt="X" style={{ width: 20, height: 20, objectFit: "contain" }} /> X
              </a>
            </div>
          </div>

          {/* Shop column */}
          <div>
            <div
              className="vw-footer-heading"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                letterSpacing: 3,
                color: "var(--gold)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              SHOP
            </div>
            {[
              ["All Products", "shop"],
              ["Custom Design", "custom"],
              ["Bulk Orders", "bulk"],
              ["Collections", "collection"],
            ].map(([label, pg]) => (
              <div
                key={label}
                onClick={() => (pg === "shop" ? openShop() : setPage(pg))}
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 15,
                  color: "var(--silver)",
                  cursor: "pointer",
                  padding: "8px 0",
                  marginBottom: 2,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "var(--ivory)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--silver)")}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Support column */}
          <div>
            <div
              className="vw-footer-heading"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: 3,
                color: "var(--gold)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              SUPPORT
            </div>
            {[
              ["Size Guide", "sizeguide"],
              ["Track Order", "trackorder"],
              ["Returns & Exchange", "returnspage"],
              ["FAQ", "faq"],
              ["Contact Us", "contactus"],
            ].map(([l, pg]) => (
              <div
                key={l}
                onClick={() => setPage(pg)}
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 15,
                  color: "var(--silver)",
                  cursor: "pointer",
                  padding: "8px 0",
                  marginBottom: 2,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "var(--ivory)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--silver)")}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Newsletter column */}
          <div>
            <div
              className="vw-footer-heading"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                letterSpacing: 3,
                color: "var(--gold)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              NEWSLETTER
            </div>
            <p
              className="vw-footer-copy"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 17,
                color: "var(--silver)",
                marginBottom: 10,
                lineHeight: 1.6,
              }}
            >
              New drops, exclusive offers — for wolves only.
            </p>
            <input
              className="input-dark"
              placeholder="YOUR EMAIL"
              style={{ marginBottom: 10 }}
              value={newsletterEmail}
              onChange={handleEmailChange}
            />
            {feedback && (
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 1,
                marginBottom: 10,
                color: feedbackType === "success" ? "var(--gold)" : "var(--wolf-red)"
              }}>
                {feedbackType === "success" ? "✓" : "✕"} {feedback.toUpperCase()}
              </div>
            )}
            <button
              className="btn-gold"
              style={{ width: "100%", padding: "10px" }}
              onClick={handleSubscribe}
            >
              JOIN THE PACK
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="footer-bottom"
          style={{
            borderTop: "1px solid var(--smoke)",
            paddingTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1 }}>
            © 2025 VelvetWolf. All rights reserved. Made with ♥ in Chennai, India.
          </div>

          <div className="footer-links" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              ["Privacy Policy", "privacypolicy"],
              ["Terms", "termspage"],
              ["Contact", "contactus"],
              ["Shipping", "shoppingpolicy"],
              ["Returns", "returnspage"],
            ].map(([l, pg]) => (
              <span
                key={l}
                onClick={() => setPage(pg)}
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 12,
                  color: "var(--silver)",
                  cursor: "pointer",
                  letterSpacing: 1,
                  display: "inline-block",
                  padding: "10px 0",
                }}
              >
                {l}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["🔒", "💳", "📱"].map((i) => (
              <span key={i} style={{ fontSize: 18 }}>
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
