// ─────────────────────────────────────────────
// VelvetWolf — <Navbar />
//
// Props:
//   activePage  (string)   — current page id, highlights nav link
//   onNavigate  (fn)       — called with page id string on click
//
// Usage:
//   <Navbar activePage={currentPage} onNavigate={setCurrentPage} />
// ─────────────────────────────────────────────
import { THEME, NAV_LINKS, POLICY_PAGES } from "../utils/constants";

const { gold, goldLight, muted, border } = THEME;

export default function Navbar({
  activePage,
  onNavigate,
  showLinks = true,
  showActions = true,
}) {
  return (
    <nav style={{
      background: "rgba(9,9,9,0.97)",
      borderBottom: `1px solid ${border}`,
      position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(16px)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 32px",
        height: 58, display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>

        {/* ── Brand Logo ── */}
        <button
          onClick={() => onNavigate("home")}
          style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
        >
          <div style={{
            width: 30, height: 30,
            background: `linear-gradient(135deg,${gold},${goldLight})`,
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src="/vw-logo.png" alt="VelvetWolf logo" style={{ width: 30, height: 30, objectFit: "contain" }} />          
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, letterSpacing: 5, color: "#f5f0e8", lineHeight: 1 }}>
              VELVETWOLF
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 6, letterSpacing: 3, color: gold, opacity: 0.7 }}>
              LUXURY STREETWEAR
            </div>
          </div>
        </button>

        {/* ── Main Nav Links ── */}
        {showLinks ? (
          <div style={{ display: "flex", gap: 28 }}>
            {NAV_LINKS.map(link => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                style={{
                  all: "unset", cursor: "pointer",
                  fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: 3,
                  color: activePage === link.id ? gold : muted,
                  borderBottom: activePage === link.id ? `1px solid ${gold}` : "1px solid transparent",
                  paddingBottom: 2,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => { if (activePage !== link.id) e.currentTarget.style.color = "#f5f0e8"; }}
                onMouseLeave={e => { if (activePage !== link.id) e.currentTarget.style.color = muted; }}
              >
                {link.label}
              </button>
            ))}
          </div>
        ) : <div />}

        {/* ── Icon Actions ── */}
        {showActions ? (
        <div style={{ display: "flex", gap: 18, fontSize: 15, color: muted }}>
          {[
            { icon: "\u2661", id: "wishlist" },
            { icon: "\u229f", id: "cart"     },
            { icon: "\u2299", id: "account"  },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => onNavigate(btn.id)}
              style={{ all: "unset", cursor: "pointer", transition: "color 0.2s", fontSize: 15 }}
              onMouseEnter={e => e.currentTarget.style.color = gold}
              onMouseLeave={e => e.currentTarget.style.color = muted}
            >
              {btn.icon}
            </button>
          ))}
        </div>
        ) : <div />}
      </div>
    </nav>
  );
}

