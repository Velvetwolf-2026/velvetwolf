import { useContext } from "react";
import { AppContext } from "../pages/AppContext";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";

export default function Footer() {
  const { setPage, openShop } = useContext(AppContext);

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
        <div className="vw-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
          <div className="vw-footer-brand">
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
              }}
            >
              Born in Chennai. Worn worldwide. VelvetWolf exists for the silent predators — those who lead with presence, not noise.
            </p>

            <div className="vw-footer-socials" style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <a
                href="https://www.instagram.com/velvetwolfofficial?igsh=MWJ3Ym94OXgwcHZ4ag=="
                target="_blank"
                rel="noopener noreferrer"
                style={socialLinkStyle}
                className="vw-footer-social-link"
              >
                <FaInstagram /> Instagram
              </a>

              <a
                href="https://www.facebook.com/profile.php?id=61577839378533"
                target="_blank"
                rel="noopener noreferrer"
                style={socialLinkStyle}
                className="vw-footer-social-link"
              >
                <FaFacebook /> Facebook
              </a>

              <span className="vw-footer-social-link" style={socialLinkStyle}>
                <FaYoutube /> YouTube
              </span>
            </div>
          </div>

          <div>
            <div
              className="vw-footer-heading"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 20,
                letterSpacing: 3,
                color: "var(--gold)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              SHOP
            </div>
            {[["All Products", "shop"], ["Custom Design", "custom"], ["Bulk Orders", "bulk"], ["Collections", "collection"]].map(
              ([label, pg]) => (
                <div
                  className="vw-footer-nav-link"
                  key={label}
                  onClick={() => (pg === "shop" ? openShop() : setPage(pg))}
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 17,
                    color: "var(--silver)",
                    cursor: "pointer",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>

          <div>
            <div
              className="vw-footer-heading"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 20,
                letterSpacing: 3,
                color: "var(--gold)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              SUPPORT
            </div>
            {[["Size Guide", "sizeguide"], ["Track Order", "trackorder"], ["Returns & Exchange", "returnspage"], ["FAQ", "faq"], ["Contact Us", "contactus"]].map(
              ([l, pg]) => (
                <div
                  className="vw-footer-nav-link"
                  key={l}
                  onClick={() => setPage(pg)}
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 17,
                    color: "var(--silver)",
                    cursor: "pointer",
                    marginBottom: 6,
                  }}
                >
                  {l}
                </div>
              )
            )}
          </div>

          <div className="vw-footer-newsletter">
            <div
              className="vw-footer-heading"
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 20,
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
            <input className="input-dark" placeholder="YOUR EMAIL" style={{ marginBottom: 6 }} />
            <button className="btn-gold" style={{ width: "100%", padding: "10px" }}>
              JOIN THE PACK
            </button>
          </div>
        </div>

        <div
          className="vw-footer-bottom"
          style={{
            borderTop: "1px solid var(--smoke)",
            paddingTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: "var(--silver)", letterSpacing: 1 }}>
            © 2025 VelvetWolf. All rights reserved. Made with ♥ in Chennai, India.
          </div>

          <div className="vw-footer-links" style={{ display: "flex", gap: 14 }}>
            {[["Privacy Policy", "privacypolicy"], ["Terms", "termspage"], ["Shipping Policy", "shoppingpolicy"]].map(
              ([l, pg]) => (
                <span
                  className="vw-footer-legal-link"
                  key={l}
                  onClick={() => setPage(pg)}
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 12,
                    color: "var(--silver)",
                    cursor: "pointer",
                    letterSpacing: 1,
                  }}
                >
                  {l}
                </span>
              )
            )}
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