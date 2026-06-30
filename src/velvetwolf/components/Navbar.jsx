import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../pages/AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { useLanguage } from "../pages/LanguageContext";
import Icon from "./Icon";
import { COLLECTIONS } from "../utils/collectionsData";

/* ─── Inline styles that need keyframes ─────────────────────────────────────── */
export default function Navbar({ activePage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoriesHovered, setCategoriesHovered] = useState(false);
  const [accountHovered, setAccountHovered] = useState(false);

  const { setPage, setCartOpen, setWishlistOpen, user, cartCount, wishlist, signOutUser, openShop, searchQuery, setSearchQuery } =
    useContext(AppContext);
  const { language, setLanguage, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isMobileOrTablet, isMobile } = useBreakpoint();

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (location.pathname !== "/shop" && !location.pathname.startsWith("/shop/")) navigate("/shop");
  };

  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "";
  const greetingName = displayName ? displayName.split(" ")[0] : "";

  // Non-bulk nav links
  const regularLinks = [
    ["shop",          "shop"],
    ["collections",   "collection"],
    ["customDesign",  "custom"],
    ["styleQuiz",     "quiz"],
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
              <img src="/vw-logo.png" alt="VelvetWolf" style={{ width: 30, height: 30, objectFit: "contain" }} />
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
            <div style={{ flex: 1, display: "flex", justifyContent: "center", maxWidth: 360, margin: "0 24px", position: "relative" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={t("searchPlaceholder") || "SEARCH THE WILD..."}
                  style={{
                    width: "100%",
                    padding: "8px 16px 8px 36px",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--smoke)",
                    borderRadius: 20,
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--ivory)",
                    outline: "none",
                    letterSpacing: 1,
                    transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--gold)";
                    e.target.style.background = "rgba(0,0,0,0.6)";
                    e.target.style.boxShadow = "0 0 10px rgba(201,168,76,0.2)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--smoke)";
                    e.target.style.background = "rgba(255, 255, 255, 0.04)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ash)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                  <Icon name="search" size={14} />
                </span>
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

              {/* Hover Categories Dropdown */}
              <div
                onMouseEnter={() => setCategoriesHovered(true)}
                onMouseLeave={() => setCategoriesHovered(false)}
                style={{ position: "relative" }}
              >
                <button className={`vw-bulk-btn${activePage === "collection" ? " active" : ""}`}>
                  CATEGORIES <span style={{ fontSize: 9 }}>▼</span>
                </button>
                {categoriesHovered && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 480,
                      background: "rgba(10, 10, 10, 0.98)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid var(--gold)",
                      borderRadius: 4,
                      padding: "20px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(201,168,76,0.15)",
                      zIndex: 999,
                      animation: "vw-drawer-slide 0.2s ease"
                    }}
                  >
                    {COLLECTIONS.slice(0, 8).map(col => (
                      <div
                        key={col.id}
                        onClick={() => {
                          openShop(col.id);
                          setCategoriesHovered(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          borderRadius: 2,
                          transition: "all 0.2s ease",
                          textAlign: "left"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(201,168,76,0.08)";
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold)", fontWeight: "bold" }}>
                          {col.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ash)", marginTop: 2 }}>
                          Premium Drop.
                        </div>
                      </div>
                    ))}
                    <div
                      onClick={() => {
                        goToPage("collections");
                        setCategoriesHovered(false);
                      }}
                      style={{
                        gridColumn: "span 2",
                        borderTop: "1px solid var(--smoke)",
                        paddingTop: 10,
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--gold)",
                        cursor: "pointer",
                        letterSpacing: 2
                      }}
                    >
                      VIEW ALL COLLECTIONS →
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
    </>
  );
}
