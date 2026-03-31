export default function Footer({ onNavigate }) {
  const navigate = (page) => {
    if (typeof onNavigate === "function") {
      onNavigate(page);
    }
  };

  return (
    <footer style={{ background: "var(--graphite)", borderTop: "1px solid var(--smoke)", padding: "80px 40px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, marginBottom: 60 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 6, marginBottom: 4 }}>VELVETWOLF</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 4, color: "var(--gold)", marginBottom: 20 }}>LUXURY STREETWEAR | EST. 2025</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", lineHeight: 1.8, fontStyle: "italic" }}>
              Born in Chennai. Worn worldwide. VelvetWolf exists for the silent predators - those who lead with presence, not noise.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
              {["📸 Instagram", "𝕏 Twitter", "▶ YouTube"].map((social) => (
                <span key={social} style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--silver)", cursor: "pointer", letterSpacing: 1 }}>
                  {social}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20 }}>SHOP</div>
            {[["All Products", "shop"], ["Custom Design", "custom"], ["Bulk Orders", "bulk"], ["Collections", "collection"]].map(([label, page]) => (
              <div
                key={label}
                onClick={() => navigate(page)}
                style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", cursor: "pointer", marginBottom: 10 }}
              >
                {label}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20 }}>SUPPORT</div>
            {[["Size Guide", "sizeguide"], ["Track Order", "trackorder"], ["Returns & Exchange", "returnspage"], ["FAQ", "faq"], ["Contact Us", "contactus"]].map(([label, page]) => (
              <div
                key={label}
                onClick={() => navigate(page)}
                style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", cursor: "pointer", marginBottom: 10 }}
              >
                {label}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, letterSpacing: 3, color: "var(--gold)", marginBottom: 20 }}>NEWSLETTER</div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--silver)", marginBottom: 16, lineHeight: 1.6 }}>
              New drops, exclusive offers - for wolves only.
            </p>
            <input className="input-dark" placeholder="YOUR EMAIL" style={{ marginBottom: 10 }} />
            <button className="btn-gold" style={{ width: "100%", padding: "10px" }}>JOIN THE PACK</button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--smoke)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 1 }}>(c) 2025 VelvetWolf. All rights reserved. Made with love in Chennai, India.</div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Privacy Policy", "privacypolicy"], ["Terms", "termspage"], ["Shipping Policy", "shoppingpolicy"]].map(([label, page]) => (
              <span
                key={label}
                onClick={() => navigate(page)}
                style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", cursor: "pointer", letterSpacing: 1 }}
              >
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["🔒", "💳", "📱"].map(i => <span key={i} style={{ fontSize: 18 }}>{i}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
