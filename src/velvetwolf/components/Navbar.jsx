import { useState, useEffect, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../pages/AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { useLanguage } from "../pages/LanguageContext";
import Icon from "./Icon";
import { COLLECTIONS } from "../utils/collectionsData";
import { getSupabaseLogoUrl } from "../utils/supabase";

/* ─── Inline styles that need keyframes ─────────────────────────────────────── */
export default function Navbar({ activePage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [categoriesHovered, setCategoriesHovered] = useState(false);
  const [accountHovered, setAccountHovered] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const { setPage, setCartOpen, setWishlistOpen, user, cartCount, wishlist, signOutUser, openShop, searchQuery, setSearchQuery, products } =
    useContext(AppContext);
  const { language, setLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isMobileOrTablet, isMobile } = useBreakpoint();

  // Load recently viewed for visual search suggestions
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("vw_recently_viewed") || "[]");
      if (stored.length > 0 && Array.isArray(products)) {
        const matched = products.filter(p => stored.includes(p.slug) || stored.includes(p.id));
        setRecentlyViewed(matched.slice(0, 3));
      }
    } catch (e) {
      console.warn("Failed to load recently viewed inside Navbar", e);
    }
  }, [products, searchFocused]);

  const mobileSearchRef = useRef(null);

  useEffect(() => {
    if (searchOpen && mobileSearchRef.current) {
      setTimeout(() => mobileSearchRef.current.focus(), 150);
    }
  }, [searchOpen]);

  const trendingSearches = ["CARGO", "OVERSIZED TEE", "HOODIE", "JACKET", "SWEATER"];
  const categoryShortcuts = [
    { label: "TEE", categoryId: "tees" },
    { label: "CARGO", categoryId: "cargos" },
    { label: "HOODIE", categoryId: "hoodies" },
    { label: "JACKET", categoryId: "jackets" },
  ];

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (location.pathname !== "/shop" && !location.pathname.startsWith("/shop/")) navigate("/shop");
  };

  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "";
  const greetingName = displayName ? displayName.split(" ")[0] : "";

  // Non-bulk nav links
  const regularLinks = [
    ["shop", "shop"],
    ["collections", "collection"],
    ["customDesign", "custom"],
    ["styleQuiz", "quiz"],
  ];

  const goToPage = (pg) => {
    setMobileOpen(false);
    pg === "shop" ? openShop() : setPage(pg);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isMobileOrTablet) setMobileOpen(false);
  }, [isMobileOrTablet]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const greetWord = language === "hi" ? "नमस्ते" : language === "ta" ? "வணக்கம்" : "Hi";

  return (
    <>
      <nav
        className="nav-pad"
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 800,
          background: scrolled || mobileOpen
            ? "rgba(8,8,8,0.96)"
            : "linear-gradient(180deg,rgba(0,0,0,0.72) 0%,transparent 100%)",
          backdropFilter: scrolled || mobileOpen ? "blur(24px) saturate(1.4)" : "none",
          transition: "background 0.45s ease, backdrop-filter 0.45s ease",
          padding: "0 40px",
        }}
      >
        {/* Gold gradient accent bar at very top */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, var(--gold) 40%, #f0d080 60%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "vw-gradient-shift 4s ease infinite",
          opacity: scrolled ? 1 : 0,
          transition: "opacity 0.4s ease",
        }} />

        <div
          className="nav-height"
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 70,
          }}
        >
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <div
            onClick={() => { setPage("home"); setMobileOpen(false); }}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}
          >
            <div
              style={{
                width: 38, height: 38,
                background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "vw-glow-pulse 3s ease-in-out infinite",
                flexShrink: 0,
              }}
            >
              <img src={getSupabaseLogoUrl("/vw-logo.png")} alt="VelvetWolf" style={{ width: 30, height: 30, objectFit: "contain" }} />
            </div>
            <div>
              <div
                className="nav-logo-text"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  letterSpacing: 7,
                  lineHeight: 1,
                  background: "linear-gradient(90deg, var(--ivory) 0%, var(--gold-light) 50%, var(--ivory) 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "vw-shimmer 5s linear infinite",
                }}
              >
                VELVETWOLF
              </div>
              <div
                className="nav-logo-sub"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: 4,
                  color: "var(--gold)",
                  opacity: 0.75,
                  marginTop: 2,
                }}
              >
                {t("heroTitle")}
              </div>
            </div>
          </div>

          {/* ── Center-aligned Search Bar (Desktop Only) ─────────────────── */}
          {!isMobileOrTablet && (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", maxWidth: 400, margin: "0 28px", position: "relative" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t("searchPlaceholder") || "SEARCH THE WILD..."}
                  style={{
                    width: "100%",
                    padding: "10px 16px 10px 38px",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--smoke)",
                    borderRadius: 2,
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "var(--ivory)",
                    outline: "none",
                    letterSpacing: 1.5,
                    transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                  onFocus={(e) => {
                    setSearchFocused(true);
                    e.target.style.borderColor = "var(--gold)";
                    e.target.style.background = "rgba(0,0,0,0.7)";
                    e.target.style.boxShadow = "0 0 16px rgba(201,168,76,0.15)";
                  }}
                  onBlur={(e) => {
                    setTimeout(() => setSearchFocused(false), 250);
                    e.target.style.borderColor = "var(--smoke)";
                    e.target.style.background = "rgba(255, 255, 255, 0.03)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ash)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                  <Icon name="search" size={14} />
                </span>

                {/* Desktop Search Focus — visual search panel */}
                {searchFocused && (
                  <div className="vw-search-panel" style={{ minWidth: 420 }}>
                    {/* Quick Category Shortcuts */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", letterSpacing: 2, marginBottom: 10 }}>QUICK SHORTCUTS</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {categoryShortcuts.map(cat => (
                          <button
                            key={cat.label}
                            onClick={() => {
                              setSearchQuery(cat.label);
                              if (location.pathname !== "/shop") navigate("/shop");
                            }}
                            style={{
                              background: "rgba(201,168,76,0.06)",
                              border: "1px solid rgba(201,168,76,0.2)",
                              color: "var(--gold)",
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              padding: "5px 12px",
                              cursor: "pointer",
                              letterSpacing: 1,
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--obsidian)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.06)"; e.currentTarget.style.color = "var(--gold)"; }}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trending searches */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", letterSpacing: 2, marginBottom: 10 }}>TRENDING SEARCHES</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {trendingSearches.map(term => (
                          <button
                            key={term}
                            onClick={() => {
                              setSearchQuery(term);
                              if (location.pathname !== "/shop") navigate("/shop");
                            }}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid var(--smoke)",
                              color: "var(--ash)",
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              padding: "4px 10px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.color = "var(--ash)"; }}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Recent Browsing Tiles */}
                    {recentlyViewed.length > 0 && (
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", letterSpacing: 2, marginBottom: 10 }}>RECENTLY VIEWED</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                          {recentlyViewed.map(p => (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/product/${p.slug || p.id}`)}
                              style={{
                                cursor: "pointer",
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid var(--smoke)",
                                padding: 8,
                                transition: "all 0.2s ease",
                                textAlign: "center"
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.transform = "translateY(0)"; }}
                            >
                              <img
                                src={p.image || "https://npxjtjteydkacbcdbvss.supabase.co/storage/v1/object/public/product-images/Logo/vw-logo.png"}
                                alt={p.name}
                                style={{ width: "100%", height: 80, objectFit: "cover", marginBottom: 6, border: "1px solid var(--smoke)" }}
                              />
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ivory)", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", marginTop: 2 }}>₹{p.price.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Desktop nav links ─────────────────────────────────────────── */}
          {!isMobileOrTablet && (
            <div className="nav-links" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {/* Shop */}
              <button onClick={() => goToPage("shop")} className={`vw-bulk-btn${activePage === "shop" ? " active" : ""}`}>
                {t("shop")}
              </button>

              {/* Hover Categories — Full-Width Luxury Mega Menu */}
              <div
                onMouseEnter={() => setCategoriesHovered(true)}
                onMouseLeave={() => setCategoriesHovered(false)}
                style={{ position: "relative" }}
              >
                <button className={`vw-bulk-btn${activePage === "collection" ? " active" : ""}`}>
                  CATEGORIES <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>▼</span>
                </button>
                {categoriesHovered && (
                  <div className="vw-mega-menu">
                    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                      {/* Season Campaign Banner */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, paddingBottom: 20, borderBottom: "1px solid var(--smoke)" }}>
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 4 }}>NOW EXPLORING</div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, color: "var(--ivory)" }}>THE RAW COLLECTION — SS26</div>
                        </div>
                        <button
                          className="btn-outline"
                          style={{ padding: "8px 20px", fontSize: 9, letterSpacing: 2 }}
                          onClick={() => { openShop(); setCategoriesHovered(false); }}
                        >
                          SHOP ALL DROPS
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr", gap: 50 }}>
                        {/* Column 1: Collection Index */}
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 20, textAlign: "left" }}>THE BLUEPRINT INDEX</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {COLLECTIONS.slice(0, 8).map((col, idx) => (
                              <div
                                key={col.id}
                                onClick={() => {
                                  openShop(col.id);
                                  setCategoriesHovered(false);
                                }}
                                style={{
                                  padding: "10px 0",
                                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  color: "var(--ivory)"
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.paddingLeft = "10px";
                                  e.currentTarget.style.color = "var(--gold)";
                                  e.currentTarget.style.borderBottomColor = "rgba(201,168,76,0.15)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.paddingLeft = "0";
                                  e.currentTarget.style.color = "var(--ivory)";
                                  e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.03)";
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", opacity: 0.4, width: 16 }}>{String(idx + 1).padStart(2, '0')}</span>
                                  <span style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{col.name}</span>
                                </span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--silver)", opacity: 0.6 }}>EXPLORE →</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 2: Visual Storytelling Editorial */}
                        <div style={{ borderLeft: "1px solid var(--smoke)", borderRight: "1px solid var(--smoke)", padding: "0 40px" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 20, textAlign: "left" }}>EDITORIAL FOCUS</div>
                          <div style={{ position: "relative", overflow: "hidden", height: 220, background: "rgba(255,255,255,0.01)", border: "1px solid var(--smoke)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 28, textAlign: "left" }}>
                            <div style={{ zIndex: 2 }}>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold)", letterSpacing: 3, marginBottom: 6 }}>THE TIRUPUR WEAVE</div>
                              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ivory)", letterSpacing: 1, margin: "0 0 10px 0" }}>HEAVYWEIGHT LUXURY</h4>
                              <p style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "var(--silver)", lineHeight: 1.7, margin: 0, maxWidth: 340 }}>
                                Every piece crafted from premium 220 GSM combed cotton. Cut, stitched, and hand-finished in Tirupur, India. The weight speaks for itself.
                              </p>
                            </div>
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.4) 60%, rgba(10,10,10,0.2) 100%)", zIndex: 1 }} />
                          </div>
                          {/* Featured Badge */}
                          <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
                            <div style={{ flex: 1, padding: "12px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--gold)", letterSpacing: 2, marginBottom: 2 }}>FABRIC</div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ivory)" }}>220 GSM Cotton</div>
                            </div>
                            <div style={{ flex: 1, padding: "12px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--gold)", letterSpacing: 2, marginBottom: 2 }}>ORIGIN</div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ivory)" }}>Tirupur, India</div>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Personalization Links */}
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 20, textAlign: "left" }}>PERSONALIZATION</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {[
                              { title: "✦ FIT DNA QUIZ", desc: "Discover your street personality archetype & perfect fit.", page: "quiz", accent: true },
                              { title: "✦ AI STYLE ADVISOR", desc: "Get dynamic recommendations tailored to your style DNA.", page: "shop", accent: false },
                              { title: "✦ CUSTOM DESIGN LAB", desc: "Co-create your own custom graphic pieces with our tools.", page: "custom", accent: false }
                            ].map(item => (
                              <div
                                key={item.title}
                                onClick={() => {
                                  goToPage(item.page);
                                  setCategoriesHovered(false);
                                }}
                                style={{
                                  padding: 16,
                                  background: item.accent ? "rgba(201,168,76,0.05)" : "rgba(255,255,255,0.02)",
                                  border: `1px solid ${item.accent ? 'rgba(201,168,76,0.2)' : 'var(--smoke)'}`,
                                  cursor: "pointer",
                                  transition: "all 0.25s ease",
                                  textAlign: "left"
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = "var(--gold)";
                                  e.currentTarget.style.background = "rgba(201,168,76,0.06)";
                                  e.currentTarget.style.transform = "translateX(4px)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = item.accent ? 'rgba(201,168,76,0.2)' : 'var(--smoke)';
                                  e.currentTarget.style.background = item.accent ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.02)';
                                  e.currentTarget.style.transform = "translateX(0)";
                                }}
                              >
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--gold)", letterSpacing: 1, marginBottom: 6 }}>{item.title}</div>
                                <div style={{ fontFamily: "var(--font-serif)", fontSize: 11, color: "var(--silver)", lineHeight: 1.5 }}>{item.desc}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Design */}
              <button onClick={() => goToPage("custom")} className={`vw-bulk-btn${activePage === "custom" ? " active" : ""}`}>
                {t("customDesign")}
              </button>

              {/* BULK ORDER — special CTA button */}
              <button
                onClick={() => goToPage("bulk")}
                className={`vw-bulk-btn${activePage === "bulk" ? " active" : ""}`}
              >
                {t("bulkOrder")}
                {/* Live dot */}
                <span style={{
                  position: "absolute",
                  top: -5, right: -5,
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  animation: "vw-badge-pulse 2s ease-in-out infinite",
                  border: "1px solid var(--obsidian)",
                }} />
              </button>

              {user?.isAdmin && (
                <button
                  onClick={() => setPage("admin")}
                  style={{
                    background: "none",
                    border: "1px solid var(--gold)",
                    color: "var(--gold)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: 2,
                    padding: "4px 12px",
                  }}
                >
                  ADMIN
                </button>
              )}
            </div>
          )}

          {/* ── Right side ───────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: isMobile ? 8 : 14, alignItems: "center" }}>

            {/* Mobile Search Input */}
            {isMobileOrTablet && (
              searchOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={t("searchPlaceholder")}
                    autoFocus
                    style={{
                      width: isMobile ? 110 : 160,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      border: "1px solid var(--gold)",
                      borderRadius: 2,
                      background: "rgba(0,0,0,0.7)",
                      color: "var(--ivory)",
                      outline: "none",
                      letterSpacing: 1,
                    }}
                  />
                  <button
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    className="vw-icon-btn"
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
              ) : (
                <button className="vw-icon-btn" onClick={() => setSearchOpen(true)} title="Search">
                  <Icon name="search" size={isMobile ? 19 : 21} />
                </button>
              )
            )}

            {/* Wishlist */}
            <button
              className="vw-icon-btn"
              onClick={() => { user ? setWishlistOpen(true) : setPage("login"); setMobileOpen(false); }}
              title="Wishlist"
            >
              <Icon name="heart" size={isMobile ? 19 : 21} />
              {wishlist.length > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 0,
                  background: "var(--wolf-red)", color: "#fff",
                  borderRadius: "50%", width: 14, height: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: "bold",
                }}>
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              className="vw-icon-btn"
              onClick={() => { setCartOpen(true); setMobileOpen(false); }}
              title="Cart"
            >
              <Icon name="cart" size={isMobile ? 19 : 21} />
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 0,
                  background: "var(--gold)", color: "var(--obsidian)",
                  borderRadius: "50%", width: 15, height: 15,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: "bold",
                }}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Desktop-only controls */}
            {!isMobileOrTablet && (
              <>
                {/* Language pill toggle */}
                <div className="vw-lang-pill">
                  {["en", "hi", "ta"].map(l => (
                    <button
                      key={l}
                      className={language === l ? "active" : ""}
                      onClick={() => setLanguage(l)}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* User greeting / dropdown menu */}
                {greetingName ? (
                  <div
                    onMouseEnter={() => setAccountHovered(true)}
                    onMouseLeave={() => setAccountHovered(false)}
                    style={{ position: "relative" }}
                  >
                    <button className="vw-user-pill" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {greetWord}, {greetingName} <span style={{ fontSize: 8 }}>▼</span>
                    </button>

                    {accountHovered && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          width: 180,
                          background: "rgba(10, 10, 10, 0.98)",
                          backdropFilter: "blur(20px)",
                          border: "1px solid var(--gold)",
                          borderRadius: 2,
                          padding: "8px 0",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.8)",
                          zIndex: 999,
                          display: "flex",
                          flexDirection: "column",
                          animation: "vw-drawer-slide 0.15s ease"
                        }}
                      >
                        {[
                          ["Profile", "account", "user"],
                          ["My Orders", "account", "package"],
                          ["Sign Out", "logout", "logout"]
                        ].map(([label, action, iconName]) => (
                          <button
                            key={label}
                            onClick={() => {
                              setAccountHovered(false);
                              if (action === "logout") {
                                signOutUser();
                              } else {
                                setPage(action);
                              }
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: "10px 16px",
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: label === "Sign Out" ? "#ff8080" : "var(--ash)",
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              width: "100%",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = label === "Sign Out" ? "rgba(255,80,80,0.08)" : "rgba(201,168,76,0.08)";
                              e.currentTarget.style.color = label === "Sign Out" ? "#ff8080" : "var(--gold)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = label === "Sign Out" ? "#ff8080" : "var(--ash)";
                            }}
                          >
                            <Icon name={iconName} size={14} />
                            {label.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="vw-icon-btn" onClick={() => setPage("login")} title="Login">
                    <Icon name="user" size={21} />
                  </button>
                )}
              </>
            )}

            {/* Hamburger — mobile/tablet */}
            {isMobileOrTablet && (
              <button
                className="vw-icon-btn"
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Toggle menu"
              >
                <Icon name={mobileOpen ? "x" : "menu"} size={24} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      {isMobileOrTablet && mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: 70, left: 0, right: 0, bottom: 0,
            zIndex: 799,
            background: "rgba(6,6,6,0.98)",
            backdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
            padding: "28px 24px",
            overflowY: "auto",
            animation: "vw-drawer-slide 0.25s ease",
          }}
        >
          {/* Mobile search */}
          <div style={{ marginBottom: 24, display: "flex", gap: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t("searchPlaceholder")}
              style={{
                flex: 1, padding: "11px 14px", fontSize: 13,
                fontFamily: "var(--font-mono)", letterSpacing: 1,
                border: "1px solid var(--smoke)",
                background: "rgba(20,20,20,0.8)",
                color: "var(--ivory)", outline: "none", borderRadius: 2,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "var(--smoke)", border: "none", color: "var(--ash)", padding: "0 14px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, borderRadius: 2 }}
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {regularLinks.map(([label, pg]) => (
              <button
                key={pg}
                onClick={() => goToPage(pg)}
                className={`vw-mobile-link${activePage === pg ? " active" : ""}`}
              >
                <span>{t(label)}</span>
                <span className="vw-link-arrow">›</span>
              </button>
            ))}

            {/* Bulk order CTA — filled gold card */}
            <button
              onClick={() => goToPage("bulk")}
              className={`vw-mobile-link vw-mobile-bulk${activePage === "bulk" ? " active" : ""}`}
            >
              <span>✦ &nbsp;{t("bulkOrder")}</span>
              <span className="vw-link-arrow">›</span>
            </button>

            {user?.isAdmin && (
              <button
                className="vw-mobile-link"
                style={{ borderColor: "rgba(201,168,76,0.5)", color: "var(--gold)" }}
                onClick={() => { setPage("admin"); setMobileOpen(false); }}
              >
                <span>ADMIN PANEL</span>
                <span className="vw-link-arrow">›</span>
              </button>
            )}
          </div>

          {/* User & language section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {greetingName && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, color: "var(--gold)", marginBottom: 4 }}>
                {greetWord.toUpperCase()}, {greetingName.toUpperCase()}
              </div>
            )}

            {/* Language selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--ash)", flexShrink: 0 }}>LANGUAGE:</span>
              <div className="vw-lang-pill" style={{ flex: 1 }}>
                {[["en", "ENGLISH"], ["hi", "हिंदी"], ["ta", "தமிழ்"]].map(([code, label]) => (
                  <button
                    key={code}
                    className={language === code ? "active" : ""}
                    onClick={() => setLanguage(code)}
                    style={{ flex: 1, padding: "8px 4px", fontSize: 10 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { user ? setPage("account") : setPage("login"); setMobileOpen(false); }}
              className="btn-outline"
              style={{ width: "100%", textAlign: "center" }}
            >
              {user ? t("account") : t("login")}
            </button>

            {user && (
              <button
                onClick={() => { signOutUser(); setMobileOpen(false); }}
                className="btn-ghost"
                style={{ width: "100%", textAlign: "center" }}
              >
                {t("logout")}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation Bar */}
      {isMobileOrTablet && (
        <div className="vw-mobile-bottom-nav">
          <button
            className={`vw-mobile-bottom-nav-tab ${location.pathname === "/shop" && !searchOpen ? "active" : ""}`}
            onClick={() => {
              setSearchOpen(false);
              openShop();
            }}
          >
            <Icon name="shop" size={20} color={location.pathname === "/shop" && !searchOpen ? "var(--gold)" : "var(--silver)"} />
            <span style={{ marginTop: 4 }}>SHOP</span>
          </button>

          <button
            className={`vw-mobile-bottom-nav-tab ${searchOpen ? "active" : ""}`}
            onClick={() => {
              setSearchOpen(true);
            }}
          >
            <Icon name="search" size={20} color={searchOpen ? "var(--gold)" : "var(--silver)"} />
            <span style={{ marginTop: 4 }}>SEARCH</span>
          </button>

          <button
            className="vw-mobile-bottom-nav-tab"
            onClick={() => {
              setSearchOpen(false);
              if (user) {
                setWishlistOpen(true);
              } else {
                setPage("login");
              }
            }}
          >
            <Icon name="heart" size={20} color="var(--silver)" />
            {wishlist.length > 0 && (
              <span className="vw-mobile-bottom-nav-tab-badge wishlist-badge">{wishlist.length}</span>
            )}
            <span style={{ marginTop: 4 }}>WISHLIST</span>
          </button>

          <button
            className="vw-mobile-bottom-nav-tab"
            onClick={() => {
              setSearchOpen(false);
              setCartOpen(true);
            }}
          >
            <Icon name="cart" size={20} color="var(--silver)" />
            {cartCount > 0 && (
              <span className="vw-mobile-bottom-nav-tab-badge">{cartCount}</span>
            )}
            <span style={{ marginTop: 4 }}>CART</span>
          </button>

          <button
            className={`vw-mobile-bottom-nav-tab ${activePage === "account" ? "active" : ""}`}
            onClick={() => {
              setSearchOpen(false);
              if (user) {
                setPage("account");
              } else {
                setPage("login");
              }
            }}
          >
            <Icon name="user" size={20} color={activePage === "account" ? "var(--gold)" : "var(--silver)"} />
            <span style={{ marginTop: 4 }}>ACCOUNT</span>
          </button>
        </div>
      )}

      {/* ── Full-Screen Mobile Search Overlay ──────────────────────── */}
      {searchOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(10, 10, 10, 0.98)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
            animation: "vw-drawer-slide 0.25s ease-out",
            padding: "24px 20px"
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 30 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t("searchPlaceholder") || "SEARCH THE CATALOG..."}
                style={{
                  width: "100%",
                  padding: "14px 40px 14px 16px",
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: 1,
                  border: "1px solid var(--smoke)",
                  background: "rgba(20, 20, 20, 0.9)",
                  color: "var(--ivory)",
                  outline: "none",
                  borderRadius: 2,
                  boxSizing: "border-box"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--silver)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    cursor: "pointer",
                    padding: 4
                  }}
                >
                  <Icon name="x" size={12} color="var(--silver)" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setSearchOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--gold)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                cursor: "pointer",
                padding: "8px 4px",
                letterSpacing: 1
              }}
            >
              CLOSE
            </button>
          </div>

          {/* Quick links & Trending */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ marginBottom: 36 }}>
              <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 2, marginBottom: 16 }}>TRENDING TERMS</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {trendingSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchQuery(term);
                      if (location.pathname !== "/shop") navigate("/shop");
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--smoke)",
                      color: "var(--silver)",
                      padding: "8px 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      cursor: "pointer",
                      borderRadius: 2,
                      letterSpacing: 1
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", letterSpacing: 2, marginBottom: 16 }}>SHOP BY CATEGORY</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {categoryShortcuts.map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => {
                      // Navigate to shop and select this category
                      setSearchOpen(false);
                      setSearchQuery(""); // clear search text
                      navigate("/shop");
                      // We can dispatch or set location state, but standard shop category link works
                      setTimeout(() => {
                        // find category trigger or set via context if available
                        const el = document.getElementById(`cat-${cat.categoryId}`);
                        if (el) el.click();
                      }, 100);
                    }}
                    style={{
                      background: "var(--graphite)",
                      border: "1px solid var(--smoke)",
                      color: "var(--ivory)",
                      padding: "16px",
                      textAlign: "left",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      cursor: "pointer",
                      borderRadius: 2,
                      letterSpacing: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span>{cat.label}</span>
                    <span style={{ color: "var(--gold)" }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PWA Install Banner */}
      {/* {deferredPrompt && !hidePrompt && (
        <div style={{
          position: "fixed",
          bottom: isMobileOrTablet ? 76 : 24, // sits right above bottom nav on mobile
          right: isMobileOrTablet ? 0 : 24,
          left: isMobileOrTablet ? 0 : "auto",
          width: isMobileOrTablet ? "100%" : 350,
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--gold)",
          padding: "16px 20px",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          animation: "vw-drawer-slide 0.3s ease",
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "var(--gold)", color: "var(--obsidian)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontSize: 16 }}>
              🐺
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ivory)", fontWeight: "bold" }}>VELVETWOLF APP</div>
              <div style={{ fontSize: 10, color: "var(--silver)" }}>Install for a faster, offline-ready experience.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-gold" onClick={triggerPwaInstall} style={{ flex: 1, padding: "8px 0", fontSize: 9 }}>INSTALL</button>
            <button className="btn-ghost" onClick={() => setHidePrompt(true)} style={{ flex: 1, padding: "8px 0", fontSize: 9 }}>MAYBE LATER</button>
          </div>
        </div>
      )} */}
    </>
  );
}
