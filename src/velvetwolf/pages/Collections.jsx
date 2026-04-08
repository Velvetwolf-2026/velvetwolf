import { useContext } from "react";
import { AppContext } from "./AppContext";

export const COLLECTIONS = [
  { id: "ai-tech", name: "AI & Tech Humor", icon: "⚡", color: "#4fc3f7" },
  { id: "anime", name: "Anime Anarchy", icon: "🎌", color: "#f06292" },
  { id: "xp-mode", name: "XP Mode: Activated", icon: "🖥", color: "#81c784" },
  { id: "beast-mode", name: "Beast Mode Grind", icon: "🔥", color: "#ff8a65" },
  { id: "mind-mayhem", name: "Mind Over Mayhem", icon: "🧠", color: "#ce93d8" },
  { id: "silent-luxury", name: "Silent Luxury", icon: "💎", color: "#c9a84c" },
  { id: "savage-quotes", name: "Savage Quotes", icon: "💬", color: "#ef5350" },
  { id: "founder", name: "Founder Energy", icon: "🚀", color: "#ffd54f" },
  { id: "trending", name: "Trending Now", icon: "⭐", color: "#80cbc4" },
  { id: "limited", name: "Limited Edition", icon: "🏷", color: "#ffab91" },
  { id: "most-loved", name: "Most Loved", icon: "♥", color: "#f48fb1" },
  { id: "budget", name: "Under ₹999", icon: "◎", color: "#a5d6a7" },
  { id: "custom", name: "Upload Your Design", icon: "✦", color: "#b0bec5" },
  { id: "bulk", name: "Bulk Orders", icon: "📦", color: "#bcaaa4" },
  { id: "corporate", name: "Corporate Orders", icon: "🏢", color: "#90caf9" },
];

export const INITIAL_COLLECTION_PRODUCTS = [
  { id: "3f8b5e7a-9d2a-4c1b-b6a2-1a8f0d5e2c11", name: "Neural Network Tee", collection: "ai-tech", price: 1299, originalPrice: 1899, image: null, sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#1a1a2e", "#f0ede8"], rating: 4.8, reviews: 234, tag: "BESTSELLER", description: "Minimal circuit-board motif. 100% Egyptian cotton, 220 GSM.", stock: 45 },
  { id: "8a1c4d92-5f3e-4c8b-9f2a-6d7b1e0c3a44", name: "Silent Predator", collection: "silent-luxury", price: 2499, originalPrice: 3200, image: null, sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a", "#2c2c2c"], rating: 4.9, reviews: 189, tag: "LIMITED", description: "Embossed wolf crest. Supima cotton, hand-stitched details.", stock: 12 },
  { id: "c2d91a6e-3f5b-4b7a-a9e1-2d8c6f4b7e55", name: "Founder's Mindset", collection: "founder", price: 1599, originalPrice: 1999, image: null, sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#1a1a1a", "#faf9f7"], rating: 4.7, reviews: 312, tag: "NEW", description: "Bold motivational typography. Heavyweight fleece blend.", stock: 78 },
  { id: "f7e3b9a1-2c6d-4d8e-b1a9-9c3e7f2b1a66", name: "Demon Mode Activated", collection: "anime", price: 899, originalPrice: 1299, image: null, sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a", "#1a0010"], rating: 4.6, reviews: 445, tag: "TRENDING", description: "Anime-inspired demon slayer aesthetic. Oversized drop cut.", stock: 33 },
  { id: "1b6e4c8d-7f2a-4a3b-9e5c-5d7a9c2b8e77", name: "100 Days of Grind", collection: "beast-mode", price: 1199, originalPrice: 1499, image: null, sizes: ["M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#111111"], rating: 4.8, reviews: 267, tag: "HOT", description: "Motivational beast-mode print. Moisture-wicking fabric.", stock: 56 },
  { id: "9c4a7e2b-5d1f-4f6a-8b3c-2e9a1d7c9f88", name: "Error 404: Sleep", collection: "ai-tech", price: 799, originalPrice: 999, image: null, sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#0a1628", "#faf9f7"], rating: 4.5, reviews: 523, tag: "MOST LOVED", description: "Geek humor meets streetwear. Ultra-soft jersey.", stock: 120 },
  { id: "6e2b9d4f-1c7a-4e8b-b3f2-8a6c5d1e0a99", name: "Wolf Among Sheep", collection: "savage-quotes", price: 1399, originalPrice: 1799, image: null, sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a", "#2a0a0a"], rating: 4.9, reviews: 198, tag: "SIGNATURE", description: "Signature VelvetWolf statement piece. Garment-dyed.", stock: 29 },
  { id: "4d7a1c9e-8b2f-4a6d-9c3e-7f5a2b1d0caa", name: "Mind Palace Tee", collection: "mind-mayhem", price: 1699, originalPrice: 2199, image: null, sizes: ["XS", "S", "M", "L", "XL"], colors: ["#0a0a0a", "#0a0a1a", "#1a0a0a"], rating: 4.7, reviews: 143, tag: "NEW", description: "Surrealist brain artwork. Artist collaboration piece.", stock: 41 }
];

export const HOME_COLLECTION_IDS = ["trending", "beast-mode", "anime", "ai-tech", "silent-luxury"];
export const HOME_COLLECTIONS = HOME_COLLECTION_IDS
  .map((id) => COLLECTIONS.find((col) => col.id === id))
  .filter(Boolean);
export const BROWSE_COLLECTIONS = COLLECTIONS.filter((col) => !["custom", "bulk"].includes(col.id));

export function getCollectionById(id) {
  return COLLECTIONS.find((col) => col.id === id) || null;
}

function ArrowIcon({ color = "currentColor", size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function CollectionsPage() {
  const { openShop } = useContext(AppContext);

  return (
    <div style={{ paddingTop: 70, minHeight: "100vh" }}>
      <div style={{ background: "var(--graphite)", padding: "60px 40px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>EXPLORE</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 72, letterSpacing: 4 }}>ALL COLLECTIONS</h1>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 300px))", justifyContent: "center", gap: 24 }}>
          {BROWSE_COLLECTIONS.map((col) => (
            <div
              key={col.id}
              onClick={() => {
                openShop(col.id);
              }}
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
              <div style={{ fontSize: 48, marginBottom: 20, textAlign: "center" }}>{col.icon}</div>
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
