import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "./AppContext";
import { useLanguage } from "./LanguageContext";
import FeaturedCoverflow from "../components/FeaturedCoverflow";
import MosaicCarousel from "../components/MosaicCarousel";
import Icon from "../components/Icon";
import CinematicParallaxReveal from "../components/CinematicParallaxReveal";
import ProductCard from "../components/ProductCard";
import { COLLECTIONS } from "../utils/collectionsData";

export default function HomePage() {
  const { products, openShop, user } = useContext(AppContext);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const guestProfileRaw = localStorage.getItem("vw_guest_style_profile");
  const guestProfile = guestProfileRaw ? JSON.parse(guestProfileRaw) : null;
  const activePersonality = user?.personality_type || guestProfile?.personalityType;

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
    }
    return products.filter(p => targetCollections.includes((p.collection || "").toLowerCase())).slice(0, 4);
  };
  const personalizedProducts = getPersonalizedProducts(activePersonality);
  const [heroIndex, setHeroIndex] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  const heroSlides = [
    { headline: "WEAR THE", accent: "SILENCE", sub: "Silent Luxury Collection - AW 2026", collection: "silent-luxury" },
    { headline: "BEAST", accent: "MODE ON", sub: "Grind. Hustle. Dominate.", collection: "beast-mode" },
    { headline: "FOUNDER'S", accent: "MINDSET", sub: "Built for builders. Worn by wolves.", collection: "founder" },
  ];

  useEffect(() => {
    const t = setInterval(() => setHeroIndex(i => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const slide = heroSlides[heroIndex];
  const featured = products.slice(0, 7);

  // Grouped products
  const newArrivals = products.filter(p => p.tag === "NEW" || p.is_new_arrival).slice(0, 4);
  const bestSellers = products.filter(p => p.tag === "BESTSELLER" || p.tag === "MOST LOVED" || p.is_best_seller).slice(0, 4);
  const hotDeals = products.filter(p => (p.originalPrice && p.originalPrice > p.price) || p.tag === "HOT" || p.tag === "LIMITED").slice(0, 4);

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
      
      {/* CINEMATIC HERO */}
      <section style={{ minHeight: "90vh", position: "relative", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: "100px", paddingBottom: "80px" }}>
        
        {/* Background video loop with fallback image */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, zIndex: 0 }}
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-streetwear-fashion-models-walking-42171-large.mp4" type="video/mp4" />
        </video>

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(9,9,9,0.7) 0%, rgba(9,9,9,0.95) 100%)", zIndex: 0 }} />
        
        {/* Geometric accents */}
        <div style={{ position: "absolute", top: "25%", right: "5%", width: 400, height: 400, border: "1px solid rgba(201,168,76,0.08)", transform: "rotate(45deg)", animation: "float 6s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "25%", left: "5%", width: 200, height: 200, border: "1px solid rgba(201,168,76,0.1)", transform: "rotate(15deg)", animation: "float 4s ease-in-out infinite reverse", pointerEvents: "none" }} />

        <div className="nav-pad" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", zIndex: 1, width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "40px" }}>
          <div key={heroIndex} style={{ animation: "fadeUp 0.8s ease", flex: "1 1 500px", zIndex: 2 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: 6, color: "var(--gold)", marginBottom: 24 }}>{"\u2726 NEW COLLECTION 2026 \u2726"}</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(56px, 9vw, 110px)", lineHeight: 0.9, letterSpacing: -2, marginBottom: 8 }}>
              <span style={{ color: "var(--ivory)", display: "block" }}>{slide.headline}</span>
              <span className="gold-text" style={{ display: "block" }}>{slide.accent}</span>
            </h1>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 20, color: "var(--silver)", fontStyle: "italic", marginTop: 24, marginBottom: 40 }}>{slide.sub}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn-gold" onClick={() => openShop(slide.collection)}>
                {t("discoverNow")}
              </button>
              <button className="btn-outline" onClick={() => openShop()}>{t("shop")}</button>
            </div>
          </div>

          <div className="hero-mockup-col" style={{ flex: "1 1 400px", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2 }}>
            <CinematicParallaxReveal activeIndex={heroIndex} />
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

      {/* PERSONALIZED COLLECTION SHELF (IF PERSONALITY SET) */}
      {activePersonality && personalizedProducts.length > 0 && (
        <section style={{ 
          padding: "80px 40px", 
          background: "linear-gradient(180deg, var(--onyx), var(--obsidian))",
          borderTop: "1px solid var(--smoke)",
          borderBottom: "1px solid var(--smoke)"
        }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44, flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>
                  TAILORED FOR YOU: THE {activePersonality.toUpperCase()} WOLF 🐺
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 44, letterSpacing: 2 }}>
                  RECOMMENDED FOR YOUR STYLE DNA
                </h2>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-ghost" onClick={() => navigate("/quiz")} style={{ fontSize: 11, letterSpacing: 2 }}>
                  RETAKE QUIZ
                </button>
                <button className="btn-outline" onClick={() => navigate(user ? "/account" : "/quiz")} style={{ fontSize: 11, letterSpacing: 2 }}>
                  MY PROFILE
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {personalizedProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* DISCOVER YOUR WOLF TYPE CTA BANNER (IF NO PERSONALITY SET) */}
      {!activePersonality && (
        <section style={{ 
          padding: "100px 40px", 
          background: "linear-gradient(135deg, var(--onyx), var(--obsidian))", 
          borderTop: "1px solid var(--smoke)",
          borderBottom: "1px solid var(--smoke)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 6, color: "var(--gold)", marginBottom: 16 }}>STYLE ANALYSIS</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 2, marginBottom: 20 }}>FIND YOUR AESTHETIC DNA</h2>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ash)", lineHeight: 1.6, marginBottom: 36, maxWidth: 600, margin: "0 auto 36px" }}>
              Uncover your true style archetype. Take our short personality test to personalize your store experience with collections and search recommendations boosted for your Wolf Type.
            </p>
            <button className="btn-gold" onClick={() => navigate("/quiz")} style={{ padding: "16px 36px", letterSpacing: 2 }}>
              DISCOVER YOUR WOLF TYPE
            </button>
          </div>
        </section>
      )}
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

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section style={{ padding: "80px 40px", background: "var(--graphite)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>FRESH FROM THE PACK</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 2 }}>NEW ARRIVALS</h2>
              </div>
              <button className="btn-outline" onClick={() => openShop()}>{t("discoverNow")} <Icon name="arrowRight" size={12} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {newArrivals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      {bestSellers.length > 0 && (
        <section style={{ padding: "80px 40px", background: "var(--obsidian)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>POPULAR CHOICES</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 2 }}>BEST SELLERS</h2>
              </div>
              <button className="btn-outline" onClick={() => openShop()}>{t("discoverNow")} <Icon name="arrowRight" size={12} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {bestSellers.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* HOT DEALS */}
      {hotDeals.length > 0 && (
        <section style={{ padding: "80px 40px", background: "var(--graphite)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 44 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 4, color: "var(--gold)", marginBottom: 12 }}>LIMITED QUANTITIES</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 48, letterSpacing: 2 }}>HOT DEALS & DEALS</h2>
              </div>
              <button className="btn-outline" onClick={() => openShop()}>{t("discoverNow")} <Icon name="arrowRight" size={12} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {hotDeals.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

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
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: "var(--silver)", marginTop: 12 }}>Tag us <span style={{ color: "var(--gold)" }}>@velvetwolf.in</span> on Instagram to get featured.</p>
          </div>
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

