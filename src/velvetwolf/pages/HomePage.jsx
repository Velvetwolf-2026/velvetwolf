import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import FeaturedCoverflow from "../components/FeaturedCoverflow";
import MosaicCarousel from "../components/MosaicCarousel";
import Icon from "../components/Icon";
import Cinematic3DHero from "../components/Cinematic3DHero";
import ProductCard from "../components/ProductCard";
import { COLLECTIONS } from "../utils/collectionsData";
import { useBreakpoint } from "../utils/breakpoints";

export default function HomePage() {
  const { products, openShop, user, showToast } = useContext(AppContext);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isMobileOrTablet } = useBreakpoint();

  const guestProfileRaw = localStorage.getItem("vw_guest_style_profile");
  const guestProfile = guestProfileRaw ? JSON.parse(guestProfileRaw) : null;
  const activePersonality = user?.personality_type || guestProfile?.personalityType;

  const lastViewedCategory = localStorage.getItem("vw_last_viewed_category") || "";

  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const [comingSoonNotifySuccess, setComingSoonNotifySuccess] = useState({});

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("vw_recently_viewed") || "[]");
    if (stored.length > 0) {
      const matched = products.filter(p => stored.includes(p.slug) || stored.includes(p.id));
      setRecentlyViewedProducts(matched.slice(0, 4));
    }
  }, [products]);

  const getPersonalizedProducts = (type) => {
    if (!type) return [];
    const pType = type.toUpperCase();
    let targetCollections = [];
    if (pType === "BUILDER") {
      targetCollections = ["ai-tech", "founder", "silent-luxury"];
    } else if (pType === "ALPHA") {
      targetCollections = ["beast-mode", "savage-quotes"];
    } else if (pType === "SHADOW") {
      targetCollections = ["silent-luxury"];
    } else if (pType === "CREATOR") {
      targetCollections = ["anime", "ai-tech"];
    } else if (pType === "REBEL") {
      targetCollections = ["savage-quotes", "anime"];
    }
    return products.filter(p => targetCollections.includes((p.collection || "").toLowerCase())).slice(0, 4);
  };
  const personalizedProducts = getPersonalizedProducts(activePersonality);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  const continueShoppingProducts = lastViewedCategory
    ? products.filter(p => p.category === lastViewedCategory).slice(0, 4)
    : [];

  const newDrops = products.filter(p => p.tag === "NEW" || p.is_new).length > 0
    ? products.filter(p => p.tag === "NEW" || p.is_new).slice(0, 4)
    : products.slice(-4);

  const renderProductShelf = (items) => {
    if (isMobileOrTablet) {
      return (
        <div 
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            padding: "8px 4px 20px",
            margin: "0 -20px",
            paddingLeft: 20,
            paddingRight: 20,
            scrollbarWidth: "none"
          }}
          className="vw-mobile-swipe-shelf"
        >
          {items.map(p => (
            <div key={p.id} style={{ flex: "0 0 240px", scrollSnapAlign: "start" }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
        {items.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    );
  };

  const featured = products.slice(0, 7);

  // Grouped products for Dynamic Sections
  const trendingToday = products
    .filter(p => p.tag === "BESTSELLER" || p.tag === "TRENDING" || p.is_best_seller || p.rating >= 4.8)
    .slice(0, 4);

  const aiPicks = personalizedProducts.length > 0 
    ? personalizedProducts 
    : products.filter(p => p.tag === "MOST LOVED" || p.collection === "silent-luxury").slice(0, 4);

  const similarToStyle = activePersonality
    ? products.filter(p => {
        const isTee = p.category === "tshirt" || p.name.toLowerCase().includes("tee") || p.name.toLowerCase().includes("tshirt");
        if (!isTee) return false;

        const pType = activePersonality.toUpperCase();
        if (pType === "BUILDER") return ["ai-tech", "founder", "silent-luxury"].includes(p.collection);
        if (pType === "ALPHA") return ["beast-mode", "savage-quotes"].includes(p.collection);
        if (pType === "SHADOW") return ["silent-luxury"].includes(p.collection);
        if (pType === "CREATOR") return ["anime", "ai-tech"].includes(p.collection);
        return false;
      }).slice(0, 4)
    : [];

  const teesList = products.filter(p => p.category === "tshirt" || p.name.toLowerCase().includes("tee") || p.name.toLowerCase().includes("tshirt"));
  const cargoList = products.filter(p => p.category === "cargo" || p.name.toLowerCase().includes("cargo") || p.name.toLowerCase().includes("pant"));
  const capList = products.filter(p => p.category === "cap" || p.name.toLowerCase().includes("cap") || p.name.toLowerCase().includes("hat"));
  
  const completeTheLook = [];
  if (teesList.length > 0) completeTheLook.push(teesList[0]);
  if (cargoList.length > 0) completeTheLook.push(cargoList[0]);
  if (capList.length > 0) completeTheLook.push(capList[0]);
  if (teesList.length > 1) completeTheLook.push(teesList[1]);

  const limitedDrops = products
    .filter(p => p.tag === "LIMITED" || p.tag === "HOT" || p.isLimited || (p.stock && p.stock <= 20))
    .slice(0, 4);

  const comingSoonItems = [
    {
      id: "cs-1",
      name: "Cyberpunk Tech Hoodie",
      collection: "anime",
      price: 2499,
      description: "Dropping soon. 420 GSM Ultra-heavy cotton fleece, neon decals, cybernetic style.",
      releaseDate: "OCT 12",
      image: "/mockup_silent.png"
    },
    {
      id: "cs-2",
      name: "Tactical Alpha Utility Cargo",
      collection: "beast-mode",
      price: 2999,
      description: "Dropping soon. High-grade tactical canvas, utility snap pockets, relaxed taper fit.",
      releaseDate: "OCT 28",
      image: "/mockup_beast.png"
    }
  ];

  const handleComingSoonNotify = (itemId, email) => {
    if (!email || !email.includes("@")) {
      showToast("Please enter a valid email.", "error");
      return;
    }
    setComingSoonNotifySuccess(prev => ({ ...prev, [itemId]: true }));
    showToast("You've subscribed for early launch notification! ✦");
  };

  const reviews = [
    { name: "Aarav S.", rating: 5, comment: "The weight of the 220 GSM Egyptian cotton is insane. It fits perfectly oversized without looking baggy.", date: "14 June 2026" },
    { name: "Meera K.", rating: 5, comment: "I ordered the Silent Luxury Tee. The stitch detail is top notch, no logos, just pure comfort. Highly recommended.", date: "09 June 2026" },
    { name: "Rohit D.", rating: 5, comment: "Mind Palace Tee looks absolutely beautiful in person. The graphic print is premium quality.", date: "01 June 2026" }
  ];

  const instagramPosts = [
    { img: "/mockup_silent.png", tag: "@velvetwolf.in", hash: "#SilentLuxury" },
    { img: "/mockup_founder.png", tag: "@velvetwolf.in", hash: "#FounderEnergy" },
    { img: "/mockup_beast.png", tag: "@velvetwolf.in", hash: "#GrindMode" },
    { img: "/mockup_silent.png", tag: "@velvetwolf.in", hash: "#OversizedCanvas" },
    { img: "/mockup_founder.png", tag: "@velvetwolf.in", hash: "#BuildInSilence" },
    { img: "/mockup_beast.png", tag: "@velvetwolf.in", hash: "#StreetCulture" }
  ];

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    setNewsletterError("");
    if (!newsletterEmail.trim()) {
      setNewsletterError("Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail.trim())) {
      setNewsletterError("Please enter a valid email address.");
      return;
    }

    setNewsletterSuccess(true);
    setNewsletterEmail("");
  };

  return (
    <div style={{ background: "var(--obsidian)", color: "var(--ivory)", overflowX: "hidden" }}>
      
      {/* CINEMATIC 3D HERO SHOWCASE */}
      <Cinematic3DHero />

      {/* MARQUEE */}
      <div style={{ background: "var(--gold)", padding: "12px 0", overflow: "hidden" }}>
        <div className="marquee-container">
          <div className="marquee-inner" style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 4, color: "var(--obsidian)" }}>
            {Array(3).fill("\u2726  VELVET WOLF   \u2726   LUXURY STREETWEAR   \u2726   PREMIUM 220 GSM COTTON   \u2726   MADE IN INDIA   \u2726   FREE SHIPPING ABOVE \u20b91999   \u2726   30 DAY EASY RETURNS ").join("")}
          </div>
        </div>
      </div>

      {/* EDITORIAL BRAND PHILOSOPHY & STORYTELLING */}
      <section style={{ padding: isMobileOrTablet ? "60px 20px" : "120px 40px", background: "var(--obsidian)", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          {/* Section Header */}
          <div style={{ textAlign: "center", marginBottom: isMobileOrTablet ? 40 : 72 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 5, color: "var(--gold)", marginBottom: 14 }}>THE ARCHITECTURE OF STREETWEAR</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: isMobileOrTablet ? 32 : 52, letterSpacing: 3, margin: "0 0 16px 0", lineHeight: 1.1 }}>
              IMPECCABLE DRAPE.<br />
              ZERO LOUD BRANDING.
            </h2>
            <div style={{ width: 60, height: 2, background: "var(--gold)", margin: "20px auto 0" }} />
          </div>

          {/* Three Storytelling Pillars */}
          <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr 1fr", gap: isMobileOrTablet ? 24 : 32 }}>
            {/* Pillar 1: The Craftsmanship */}
            <div style={{
              background: "var(--graphite)",
              border: "1px solid var(--smoke)",
              padding: isMobileOrTablet ? 30 : 44,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.35s ease"
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(transparent, var(--gold), transparent)" }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", letterSpacing: 4, marginBottom: 16 }}>01 — THE CRAFTSMANSHIP</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: isMobileOrTablet ? 24 : 28, letterSpacing: 1, margin: "0 0 20px 0", lineHeight: 1.2, textTransform: "uppercase" }}>
                  ENGINEERED<br />
                  <span style={{ color: "var(--gold)" }}>IN SILENCE.</span>
                </h3>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--silver)", lineHeight: 1.8, margin: 0 }}>
                  We reject flashiness. VelvetWolf is rooted in the philosophy of quiet luxury. We believe premium streetwear should be defined by the weight of the fabric, the precision of the stitching, and the drape of the silhouette — not by loud logos.
                </p>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 1, borderTop: "1px solid var(--smoke)", paddingTop: 16, marginTop: 28 }}>
                220 GSM · COMBED COTTON · REACTIVE DYE
              </div>
            </div>

            {/* Pillar 2: The Tirupur Weave */}
            <div style={{
              background: "var(--graphite)",
              border: "1px solid var(--smoke)",
              padding: isMobileOrTablet ? 30 : 44,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.35s ease"
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(transparent, var(--gold), transparent)" }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", letterSpacing: 4, marginBottom: 16 }}>02 — THE TIRUPUR WEAVE</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: isMobileOrTablet ? 24 : 28, letterSpacing: 1, margin: "0 0 20px 0", lineHeight: 1.2, textTransform: "uppercase" }}>
                  MADE IN<br />
                  <span style={{ color: "var(--gold)" }}>TIRUPUR, INDIA.</span>
                </h3>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--silver)", lineHeight: 1.8, margin: 0 }}>
                  Every garment is sourced, spun, dyed, and tailored under strict quality checks in Tirupur, India — the knitting capital of the world. We work directly with master craftspeople to ensure no detail is overlooked.
                </p>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 1, borderTop: "1px solid var(--smoke)", paddingTop: 16, marginTop: 28 }}>
                HAND-FINISHED · QUALITY CHECKED · DIRECT SOURCED
              </div>
            </div>

            {/* Pillar 3: The Fit Blueprint */}
            <div style={{
              background: "var(--graphite)",
              border: "1px solid var(--smoke)",
              padding: isMobileOrTablet ? 30 : 44,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.35s ease"
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--smoke)"}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(transparent, var(--gold), transparent)" }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", letterSpacing: 4, marginBottom: 16 }}>03 — THE FIT BLUEPRINT</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: isMobileOrTablet ? 24 : 28, letterSpacing: 1, margin: "0 0 20px 0", lineHeight: 1.2, textTransform: "uppercase" }}>
                  DROPPED SHOULDER<br />
                  <span style={{ color: "var(--gold)" }}>OVERSIZED.</span>
                </h3>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--silver)", lineHeight: 1.8, margin: 0 }}>
                  Our custom dropped-shoulder oversized silhouette maintains its structural integrity wear after wear, wash after wash. Engineered with a posture-conscious cut that flatters without clinging.
                </p>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", letterSpacing: 1, borderTop: "1px solid var(--smoke)", paddingTop: 16, marginTop: 28 }}>
                DROPPED SHOULDER · BOXY CUT · ANTI-CLING FIT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COLLECTIONS */}
      <section style={{ padding: "80px 40px", background: "var(--graphite)", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>THE DROP SELECTION</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, letterSpacing: 2 }}>FEATURED COLLECTIONS</h2>
            <div style={{ width: 60, height: 2, background: "var(--gold)", margin: "16px auto 0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {COLLECTIONS.slice(0, 4).map(col => {
              const IconComponent = col.icon;
              return (
                <div 
                  key={col.id} 
                  onClick={() => openShop(col.id)} 
                  style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 40, cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ position: "absolute", right: -20, bottom: -20, opacity: 0.04, color: "var(--gold)", transform: "scale(5)" }}>
                    {IconComponent && <IconComponent />}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--gold)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    {IconComponent && <span><IconComponent style={{ fontSize: 18 }} /></span>}
                    DROP COLLECTION
                  </div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1, marginBottom: 12 }}>{col.name.toUpperCase()}</h3>
                  <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: "var(--silver)", lineHeight: 1.6 }}>Discover custom details, heavy weaves, and standard streetwear fits.</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: "80px 40px", background: "var(--obsidian)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div className="featured-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>HANDPICKED FOR YOU</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>FEATURED PRODUCTS</h2>
            </div>
            <button className="btn-outline" onClick={() => openShop()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              DISCOVER NOW <Icon name="arrowRight" size={12} />
            </button>
          </div>
          <FeaturedCoverflow products={featured} />
        </div>
      </section>

      {/* Dynamic Products Display Layout */}
      {(() => {
        const sectionMap = {
          personalized: activePersonality && personalizedProducts.length > 0 && (
            <section key="personalized" style={{ padding: "60px 20px", background: "linear-gradient(180deg, var(--onyx), var(--obsidian))", borderTop: "1px solid var(--smoke)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>
                      TAILORED FOR YOU: THE {activePersonality.toUpperCase()} 🐺
                    </div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>
                      RECOMMENDED FOR YOU
                    </h2>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn-ghost" onClick={() => navigate("/quiz")} style={{ fontSize: 10, letterSpacing: 2 }}>RETAKE QUIZ</button>
                  </div>
                </div>
                {renderProductShelf(personalizedProducts)}
              </div>
            </section>
          ),
          continueShopping: continueShoppingProducts.length > 0 && (
            <section key="continue" style={{ padding: "60px 20px", background: "var(--obsidian)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>BACK TO YOUR INTERESTS</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>CONTINUE SHOPPING</h2>
                  </div>
                </div>
                {renderProductShelf(continueShoppingProducts)}
              </div>
            </section>
          ),
          trending: trendingToday.length > 0 && (
            <section key="trending" style={{ padding: "60px 20px", background: "var(--graphite)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>REAL-TIME PACK HEAT</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>TRENDING NOW</h2>
                  </div>
                  <button className="btn-outline" onClick={() => openShop()} style={{ fontSize: 10, padding: "8px 16px" }}>DISCOVER ALL</button>
                </div>
                {renderProductShelf(trendingToday)}
              </div>
            </section>
          ),
          aiPicks: aiPicks.length > 0 && (
            <section key="aipicks" style={{ padding: "60px 20px", background: "var(--obsidian)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>✦ AI GENERATED LOOKS</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>RECOMMENDED FOR YOU</h2>
                  </div>
                </div>
                {renderProductShelf(aiPicks)}
              </div>
            </section>
          ),
          recentlyViewed: recentlyViewedProducts.length > 0 && (
            <section key="recently" style={{ padding: "60px 20px", background: "var(--graphite)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>CONTINUE BROWSING</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>RECENTLY VIEWED</h2>
                  </div>
                </div>
                {renderProductShelf(recentlyViewedProducts)}
              </div>
            </section>
          ),
          similarToInterests: similarToStyle.length > 0 && (
            <section key="similar" style={{ padding: "60px 20px", background: "var(--obsidian)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>STYLE DNA MATCH</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>SIMILAR TO YOUR INTERESTS</h2>
                  </div>
                </div>
                {renderProductShelf(similarToStyle)}
              </div>
            </section>
          ),
          newDrops: newDrops.length > 0 && (
            <section key="newdrops" style={{ padding: "60px 20px", background: "var(--graphite)", borderBottom: "1px solid var(--smoke)" }}>
              <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 4, color: "var(--gold)", marginBottom: 8 }}>JUST RELEASED</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, margin: 0 }}>NEW DROPS</h2>
                  </div>
                  <button className="btn-outline" onClick={() => openShop()} style={{ fontSize: 10, padding: "8px 16px" }}>SHOP ALL</button>
                </div>
                {renderProductShelf(newDrops)}
              </div>
            </section>
          )
        };

        let sectionOrder = [];
        if (activePersonality) {
          sectionOrder = ["personalized", "continueShopping", "recentlyViewed", "similarToInterests", "trending", "newDrops"];
        } else {
          sectionOrder = ["continueShopping", "trending", "recentlyViewed", "aiPicks", "newDrops"];
        }

        return sectionOrder.map(key => sectionMap[key]);
      })()}

      {/* 6. LIMITED DROPS */}
      {limitedDrops.length > 0 && (
        <section style={{ padding: "80px 40px", background: "var(--obsidian)", borderTop: "1px solid var(--smoke)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>SCARCE EDITIONS · HEAVYWEIGHTS</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 2 }}>LIMITED DROPS</h2>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {limitedDrops.map(p => {
                const pct = Math.max(10, Math.min(90, (p.stock || 12) * 2.2));
                return (
                  <div key={p.id} style={{ display: "flex", flexDirection: "column" }}>
                    <ProductCard product={p} />
                    <div style={{ padding: "16px", background: "var(--onyx)", borderLeft: "1px solid var(--smoke)", borderRight: "1px solid var(--smoke)", borderBottom: "1px solid var(--smoke)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--gold)", marginBottom: 6 }}>
                        <span>STOCK STATUS</span>
                        <span>{p.stock || 12} PCS LEFT</span>
                      </div>
                      <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #c0392b, var(--gold))" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. COMING SOON */}
      <section style={{ padding: "80px 40px", background: "var(--graphite)", borderTop: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>FUTURE DROPS</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 2 }}>COMING SOON</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 32 }}>
            {comingSoonItems.map(item => (
              <div 
                key={item.id} 
                style={{ 
                  background: "var(--onyx)", 
                  border: "1px solid var(--smoke)", 
                  padding: 32, 
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16
                }}
              >
                <div style={{ position: "absolute", top: 20, right: 20, background: "var(--gold)", color: "var(--obsidian)", fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 8px", letterSpacing: 1 }}>
                  LAUNCHING {item.releaseDate}
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ 
                    width: 100, 
                    height: 100, 
                    background: "rgba(255,255,255,0.02)", 
                    border: "1px dashed var(--smoke)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    position: "relative"
                  }}>
                    <Icon name="lock" size={24} color="var(--gold)" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, margin: "0 0 4px 0" }}>{item.name}</h3>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)" }}>EST. PRICE: ₹{item.price}</div>
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--silver)", lineHeight: 1.6, margin: 0 }}>
                  {item.description}
                </p>
                {comingSoonNotifySuccess[item.id] ? (
                  <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    ✓ Subscribed for early drops access.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <input 
                      type="email" 
                      placeholder="ENTER EMAIL"
                      id={`email-${item.id}`}
                      style={{ 
                        flex: 1, 
                        background: "#0a0a0a", 
                        border: "1px solid var(--smoke)", 
                        color: "var(--ivory)", 
                        padding: "8px 12px", 
                        fontFamily: "var(--font-mono)", 
                        fontSize: 11,
                        outline: "none"
                      }}
                    />
                    <button 
                      className="btn-gold" 
                      style={{ padding: "8px 16px", fontSize: 10 }}
                      onClick={() => {
                        const emailInput = document.getElementById(`email-${item.id}`);
                        handleComingSoonNotify(item.id, emailInput?.value);
                      }}
                    >
                      NOTIFY ME
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS */}
      <section style={{ padding: "100px 40px", background: "var(--obsidian)", borderTop: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>TESTIMONIALS</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, letterSpacing: 2 }}>WOLF PACK VERDICTS</h2>
            <div style={{ width: 60, height: 2, background: "var(--gold)", margin: "16px auto 0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
            {reviews.map((rev, idx) => (
              <div key={idx} style={{ background: "var(--onyx)", border: "1px solid var(--smoke)", padding: 36, position: "relative" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map(s => <Icon key={s} name="star" size={14} color="#c9a84c" />)}
                </div>
                <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 16, color: "var(--silver)", lineHeight: 1.7, marginBottom: 24 }}>"{rev.comment}"</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", letterSpacing: 1 }}>{rev.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ash)" }}>{rev.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSTAGRAM-STYLE GALLERY */}
      <section style={{ padding: "80px 40px", background: "var(--graphite)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>STYLE BOOK</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, letterSpacing: 2 }}>SHARE YOUR CANVAS</h2>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: "var(--silver)", marginTop: 12 }}>
              Tag us <a href="https://www.instagram.com/velvetwolfofficial?igsh=MWJ3Ym94OXgwcHZ4ag==" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: "bold" }}>@velvetwolf.in</a> on Instagram to get featured.
            </p>
          </div>
          {/* Instagram Post Grid Hidden as requested
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {instagramPosts.map((post, idx) => (
              <div 
                key={idx} 
                style={{ 
                  aspectRatio: "1", 
                  background: `linear-gradient(135deg, rgba(201,168,76,0.1), rgba(0,0,0,0.8))`, 
                  border: "1px solid var(--smoke)",
                  position: "relative", 
                  overflow: "hidden", 
                  cursor: "pointer" 
                }}
                onMouseEnter={e => { e.currentTarget.children[0].style.opacity = 0.8; e.currentTarget.children[1].style.transform = "translateY(0)"; }}
                onMouseLeave={e => { e.currentTarget.children[0].style.opacity = 0.2; e.currentTarget.children[1].style.transform = "translateY(100%)"; }}
              >
                <div 
                  style={{ 
                    position: "absolute", 
                    inset: 0, 
                    background: "rgba(0,0,0,0.5)", 
                    opacity: 0.2, 
                    transition: "opacity 0.3s ease" 
                  }} 
                />
                <div 
                  style={{ 
                    position: "absolute", 
                    bottom: 0, left: 0, right: 0, 
                    background: "rgba(10,10,10,0.9)", 
                    padding: 16, 
                    transform: "translateY(100%)", 
                    transition: "transform 0.3s ease",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    textAlign: "center"
                  }}
                >
                  <div style={{ color: "var(--gold)", fontWeight: "bold" }}>{post.tag}</div>
                  <div style={{ color: "var(--ash)", fontSize: 10, marginTop: 4 }}>{post.hash}</div>
                </div>
              </div>
            ))}
          </div>
          */}
        </div>
      </section>

      {/* NEWSLETTER SIGNUP */}
      <section style={{ background: "var(--graphite)", padding: "100px 40px", borderTop: "1px solid var(--smoke)", borderBottom: "1px solid var(--smoke)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 8, color: "var(--gold)", marginBottom: 20 }}>JOIN THE PACK</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 52, letterSpacing: 2, marginBottom: 16 }}>EXCLUSIVE DROPS</h2>
          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 15, color: "var(--silver)", lineHeight: 1.7, marginBottom: 36 }}>
            Subscribe to receive priority access to limited volume drops, restocks, and exclusive styling recommendations. No spam. Only noise-free utility.
          </p>
          
          {newsletterSuccess ? (
            <div style={{ background: "rgba(201,168,76,0.1)", border: "1px solid var(--gold)", padding: "20px 24px", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: 1 }}>
              ✓ WELCOME TO THE PACK. CHECK YOUR INBOX SOON.
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <input 
                type="email" 
                placeholder="YOUR EMAIL ADDRESS" 
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                style={{
                  flex: "1 1 300px",
                  background: "#0a0a0a",
                  border: "1px solid var(--smoke)",
                  color: "var(--ivory)",
                  padding: "16px 24px",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                  letterSpacing: 1
                }}
                onFocus={e => e.target.style.borderColor = "var(--gold)"}
                onBlur={e => e.target.style.borderColor = "var(--smoke)"}
              />
              <button type="submit" className="btn-gold" style={{ padding: "16px 36px", letterSpacing: 2 }}>
                SUBSCRIBE
              </button>
            </form>
          )}
          {newsletterError && (
            <div style={{ color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 12, letterSpacing: 1 }}>
              ✕ {newsletterError}
            </div>
          )}
        </div>
      </section>

      {/* WHY VELVETWOLF */}
      <section className="promise-section" style={{ padding: "100px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 16 }}>OUR PROMISE</div>
          <h2 className="promise-h2" style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: 3 }}>WHY VELVETWOLF</h2>
          <div className="divider" />
        </div>
        <div className="promise-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40 }}>
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

