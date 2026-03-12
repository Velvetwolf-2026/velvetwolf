// ─────────────────────────────────────────────
// VelvetWolf — <Footer />
//
// Props:
//   onNavigate (fn) — called with page id on link click
//
// Usage:
//   <Footer onNavigate={setCurrentPage} />
// ─────────────────────────────────────────────
import { THEME, POLICY_PAGES } from "../utils/constants";

const { gold, muted, border } = THEME;

const FOOTER_COLS = [
  {
    title: "SHOP",
    links: [
      { label: "All Collections",  id: "collections" },
      { label: "New Arrivals",     id: "shop"         },
      { label: "Limited Edition",  id: "shop"         },
      { label: "Under ₹999",       id: "shop"         },
      { label: "Custom Design",    id: "custom"       },
      { label: "Bulk Orders",      id: "bulk"         },
    ],
  },
  {
    title: "SUPPORT",
    links: [
      { label: "Track Order",       id: "track"    },
      { label: "Returns & Exchange",id: "returns"  },
      { label: "Size Guide",        id: "sizeguide"},
      { label: "FAQ",               id: "faq"      },
      { label: "Contact Us",        id: "contact"  },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy",   id: "privacy"  },
      { label: "Terms & Conditions",id:"terms"    },
      { label: "Shopping Policy",  id: "shopping" },
    ],
  },
];

export default function Footer({ onNavigate }) {
  return (
    <footer style={{ background: "#060606", borderTop: `1px solid ${border}` }}>

      {/* Top section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 32px 40px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }}>

        {/* Brand column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32,
              background: `linear-gradient(135deg,${gold},#e8c97a)`,
              clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 12, color: "#0a0a0a" }}>VW</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: 5, color: "#f5f0e8", lineHeight: 1 }}>VELVETWOLF</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, letterSpacing: 3, color: gold, opacity: 0.7 }}>LUXURY STREETWEAR</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: muted, lineHeight: 1.7, maxWidth: 260, marginBottom: 20 }}>
            Premium graphic tees for the bold, the curious, and the culture-driven. Made in India.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {["INSTAGRAM","TWITTER","PINTEREST"].map(s => (
              <div key={s} style={{
                fontFamily: "'Space Mono',monospace", fontSize: 6, letterSpacing: 2,
                padding: "5px 10px", border: `1px solid ${border}`,
                color: muted, cursor: "pointer", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = gold; e.currentTarget.style.color = gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}
              >{s}</div>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {FOOTER_COLS.map(col => (
          <div key={col.title}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 4, color: gold, marginBottom: 16 }}>{col.title}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {col.links.map(link => (
                <li key={link.label} style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => onNavigate(link.id)}
                    style={{
                      all: "unset", cursor: "pointer",
                      fontSize: 13, color: muted,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                    onMouseLeave={e => e.currentTarget.style.color = muted}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid ${border}`, padding: "16px 32px", maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: muted }}>
          © 2025 VELVETWOLF. ALL RIGHTS RESERVED.
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 2, color: muted }}>
          GST: 33AAAAA0000A1Z5 · MADE WITH ♥ IN CHENNAI
        </div>
      </div>
    </footer>
  );
}
