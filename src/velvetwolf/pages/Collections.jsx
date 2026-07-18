import { useContext } from "react";
import { AppContext } from "./AppContext";
import { BROWSE_COLLECTIONS } from "../utils/collectionsData";
import Icon from "../components/Icon";

export function meta() {
  const title = "All Collections — VelvetWolf";
  const description = "Every drop tells a story. Browse every VelvetWolf collection in one place.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
}

// ARROW ICON
function ArrowIcon({ color = "currentColor", size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// MAIN PAGE
export default function CollectionsPage() {
  const { openShop } = useContext(AppContext);

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div className="page-hero-pad" style={{ background: "var(--graphite)", padding: "80px 40px 60px", textAlign: "center", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>EXPLORE THE UNIVERSE</div>
        <h1 className="page-hero-title" style={{ fontFamily: "var(--font-display)", fontSize: 80, letterSpacing: 4 }}>ALL COLLECTIONS</h1>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 18, color: "var(--silver)", fontStyle: "italic", marginTop: 16 }}>Every drop tells a story. Find yours.</p>
      </div>

      <div className="page-content-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "60px 40px" }}>
        <div
          className="collections-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {BROWSE_COLLECTIONS.map((col) => (
            <div
              key={col.id}
              onClick={() => openShop(col.id)}
              style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: "48px 32px", cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = col.color;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.querySelector(".col-bg").style.opacity = 1;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--smoke)";
                e.currentTarget.style.transform = "";
                e.currentTarget.querySelector(".col-bg").style.opacity = 0;
              }}
            >
              <div className="col-bg" style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 50%, ${col.color}11, transparent 70%)`, opacity: 0, transition: "opacity 0.4s" }} />
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
                <Icon name={col.icon} size={48} color={col.color} />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>{col.name.toUpperCase()}</h2>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, color: col.color, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 2 }}>
                EXPLORE <ArrowIcon size={12} color={col.color} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
