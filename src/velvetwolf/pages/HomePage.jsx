import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "./AppContext";
import FeaturedCoverflow from "../components/FeaturedCoverflow";
import MosaicCarousel from "../components/MosaicCarousel";
import Icon from "../components/Icon";

export default function HomePage() {
  const { setPage, products, openShop } = useContext(AppContext);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroSlides = [
    { headline: "WEAR THE", accent: "SILENCE", sub: "Silent Luxury Collection - AW 2024", collection: "silent-luxury" },
    { headline: "BEAST", accent: "MODE ON", sub: "Grind. Hustle. Dominate.", collection: "beast-mode" },
    { headline: "FOUNDER'S", accent: "MINDSET", sub: "Built for builders. Worn by wolves.", collection: "founder" },
  ];

  useEffect(() => {
    const t = setInterval(() => setHeroIndex(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const slide = heroSlides[heroIndex];
  const featured = products.slice(0, 7);

  return (
    <div>
      {/* HERO */}
      <section style={{ minHeight: "85vh", position: "relative", display: "flex", alignItems: "center", overflow: "visible", paddingTop: "100px", paddingBottom: "80px" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a1a 100%)" }} />
        {/* Geometric accents */}
        <div style={{ position: "absolute", top: "25%", right: "5%", width: 400, height: 400, border: "1px solid rgba(201,168,76,0.1)", transform: "rotate(45deg)", animation: "float 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "25%", left: "50%", width: 200, height: 200, border: "1px solid rgba(201,168,76,0.15)", transform: "rotate(15deg)", animation: "float 4s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", top: "50%", right: "15%", width: 2, height: 300, background: "linear-gradient(transparent, var(--gold), transparent)" }} />

        <div className="nav-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", zIndex: 1, width: "100%" }}>
          <div key={heroIndex} style={{ animation: "fadeUp 0.8s ease" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: 6, color: "var(--gold)", marginBottom: 24 }}>{"\u2726 NEW COLLECTION 2026 \u2726"}</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(72px, 12vw, 160px)", lineHeight: 0.9, letterSpacing: -2, marginBottom: 8 }}>
              <span style={{ color: "var(--ivory)", display: "block" }}>{slide.headline}</span>
              <span className="gold-text" style={{ display: "block" }}>{slide.accent}</span>
            </h1>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, color: "var(--silver)", fontStyle: "italic", marginTop: 24, marginBottom: 40 }}>{slide.sub}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn-gold" onClick={() => openShop(slide.collection)}>
                EXPLORE COLLECTION
              </button>
              <button className="btn-outline" onClick={() => openShop()}>SHOP ALL</button>
            </div>
          </div>
          {/* Hero slide indicators */}
          <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
            {heroSlides.map((_, i) => (
              <div key={i} onClick={() => setHeroIndex(i)} style={{ width: i === heroIndex ? 32 : 8, height: 2, background: i === heroIndex ? "var(--gold)" : "var(--smoke)", cursor: "pointer", transition: "all 0.4s ease" }} />
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ background: "var(--gold)", padding: "12px 0", overflow: "hidden" }}>
        <div className="marquee-container">
          <div className="marquee-inner" style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 4, color: "var(--obsidian)" }}>
            {Array(3).fill("\u2726  VELVET WOLF   \u2726   LUXURY STREETWEAR   \u2726   PREMIUM 220 GSM COTTON   \u2726   MADE IN INDIA   \u2726   FREE SHIPPING ABOVE \u20b91999   \u2726   30 DAY EASY RETURNS ").join("")}
          </div>
        </div>
      </div>

      {/* STATS */}
      <section className="page-hero-pad" style={{ background: "var(--graphite)", padding: "60px 40px", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32, textAlign: "center" }}>
          {[["10,000+", "Happy Wolves"], ["220 GSM", "Premium Cotton"], ["48hr", "Dispatch"], ["100%", "India Made"]].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: "var(--gold)", letterSpacing: 2 }}>{num}</div>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, letterSpacing: 3, color: "var(--silver)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: "80px 40px", background: "var(--graphite)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div className="featured-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>HANDPICKED FOR YOU</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>FEATURED PIECES</h2>
            </div>
            <button className="btn-outline" onClick={() => openShop()}>VIEW ALL <Icon name="arrowRight" size={12} /></button>
          </div>
          <FeaturedCoverflow products={featured} />
        </div>
      </section>

      {/* MOSAIC CAROUSEL */}
      <MosaicCarousel
        onCategoryClick={(cat) => {
          const CATEGORY_TO_COLLECTION_MAP = {
            fitness: "beast-mode",
            music: "anime",
            food: "savage-quotes",
            travel: "ai-tech",
            photography: "silent-luxury",
          };
          const collectionId = CATEGORY_TO_COLLECTION_MAP[cat.id] || cat.id;
          openShop(collectionId);
        }}
      />

      {/* CTA BAND */}
      <section style={{ background: "linear-gradient(135deg, var(--graphite), var(--smoke))", padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", zIndex: 1, position: "relative" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 8, color: "var(--gold)", marginBottom: 24 }}>{"\u2726 DESIGN YOUR IDENTITY \u2726"}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 64, lineHeight: 0.95, letterSpacing: 2, marginBottom: 24 }}>
            UPLOAD YOUR<br /><span className="gold-text">OWN DESIGN</span>
          </h2>
          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 17, color: "var(--silver)", fontStyle: "italic", marginBottom: 40 }}>
            Your vision. Our premium canvas. Upload your artwork and we'll bring it to life on luxury-grade fabric.
          </p>
          <button className="btn-gold" onClick={() => setPage("custom")} style={{ fontSize: 12, padding: "16px 40px" }}>
            START DESIGNING
          </button>
        </div>
      </section>

      {/* WHY VELVETWOLF */}
      <section className="promise-section" style={{ padding: "100px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>OUR PROMISE</div>
          <h2 className="promise-h2" style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>WHY VELVETWOLF</h2>
          <div className="divider" />
        </div>
        <div className="promise-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            ["\u25c6", "Silent Luxury", "No logo. No noise. Just impeccable quality that speaks through fabric weight, stitch precision, and silhouette."],
            ["\u26a1", "Culture First Design", "Every drop is rooted in real youth culture, tech humor, anime, hustle, philosophy. Not trend-chasing."],
            ["\u2726", "India's Finest", "220 GSM Egyptian cotton. Hand-finished details. Made by master craftspeople in Tirupur, Tamil Nadu."],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ padding: "40px 32px", border: "1px solid var(--smoke)", position: "relative" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--gold)", marginBottom: 20 }}>{icon}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, marginBottom: 16 }}>{title}</h3>
              <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 16, color: "var(--silver)", lineHeight: 1.7 }}>{desc}</p>
              <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "linear-gradient(transparent, var(--gold), transparent)" }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
