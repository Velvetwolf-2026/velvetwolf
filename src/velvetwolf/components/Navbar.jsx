import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../pages/AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { useLanguage } from "../pages/LanguageContext";
import Icon from "./Icon";

/* ─── Inline styles that need keyframes ─────────────────────────────────────── */
const GLOBAL_STYLE = `
  @keyframes vw-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes vw-glow-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(201,168,76,0.35); }
    50%       { box-shadow: 0 0 20px rgba(201,168,76,0.7), 0 0 40px rgba(201,168,76,0.3); }
  }
  @keyframes vw-badge-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.65; }
  }
  @keyframes vw-drawer-slide {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes vw-gradient-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .vw-nav-link {
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Roboto', sans-serif;
    font-size: 13px;
    letter-spacing: 3px;
    font-weight: 500;
    padding: 4px 0 6px;
    color: var(--ash);
    transition: color 0.25s ease;
  }
  .vw-nav-link::after {
    content: '';
    position: absolute;
    bottom: 0; left: 50%;
    width: 0; height: 1.5px;
    background: var(--gold);
    transition: width 0.3s ease, left 0.3s ease;
  }
  .vw-nav-link:hover { color: var(--ivory); }
  .vw-nav-link:hover::after { width: 100%; left: 0; }
  .vw-nav-link.active { color: var(--gold); }
  .vw-nav-link.active::after { width: 100%; left: 0; }

  .vw-bulk-btn {
    position: relative;
    background: none;
    border: 1px solid var(--gold);
    cursor: pointer;
    font-family: 'Roboto', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    font-weight: 600;
    padding: 7px 14px;
    color: var(--gold);
    transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
    white-space: nowrap;
  }
  .vw-bulk-btn:hover {
    background: var(--gold);
    color: var(--obsidian);
    box-shadow: 0 0 18px rgba(201,168,76,0.5);
  }
  .vw-bulk-btn.active {
    background: var(--gold);
    color: var(--obsidian);
  }

  .vw-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ash);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 50%;
    transition: color 0.2s ease, background 0.2s ease;
    position: relative;
  }
  .vw-icon-btn:hover { color: var(--gold); background: rgba(201,168,76,0.08); }

  .vw-lang-pill {
    display: flex;
    border: 1px solid rgba(201,168,76,0.3);
    border-radius: 2px;
    overflow: hidden;
  }
  .vw-lang-pill button {
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1px;
    padding: 5px 8px;
    color: var(--ash);
    transition: background 0.2s ease, color 0.2s ease;
  }
  .vw-lang-pill button.active {
    background: var(--gold);
    color: var(--obsidian);
  }
  .vw-lang-pill button:not(.active):hover {
    background: rgba(201,168,76,0.1);
    color: var(--gold);
  }

  .vw-user-pill {
    background: none;
    border: 1px solid rgba(201,168,76,0.3);
    color: var(--gold);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 2px;
    padding: 6px 12px;
    border-radius: 2px;
    transition: border-color 0.2s ease, background 0.2s ease;
    white-space: nowrap;
  }
  .vw-user-pill:hover { border-color: var(--gold); background: rgba(201,168,76,0.08); }

  .vw-signout-btn {
    background: none;
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--ash);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 2px;
    padding: 6px 12px;
    border-radius: 2px;
    transition: border-color 0.2s, color 0.2s;
  }
  .vw-signout-btn:hover { border-color: rgba(255,80,80,0.4); color: #ff8080; }

  .vw-mobile-link {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(201,168,76,0.18);
    border-radius: 3px;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 22px;
    letter-spacing: 4px;
    color: var(--ivory);
    padding: 16px 20px;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
  }
  .vw-mobile-link:hover {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(201,168,76,0.05);
  }
  .vw-mobile-link.active {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(201,168,76,0.07);
  }
  .vw-mobile-link .vw-link-arrow {
    font-size: 18px;
    opacity: 0.5;
    transition: opacity 0.2s, transform 0.2s;
  }
  .vw-mobile-link:hover .vw-link-arrow,
  .vw-mobile-link.active .vw-link-arrow {
    opacity: 1;
    transform: translateX(4px);
  }
  .vw-mobile-bulk {
    background: var(--gold) !important;
    border-color: var(--gold) !important;
    color: var(--obsidian) !important;
    font-weight: 700;
    letter-spacing: 5px !important;
    box-shadow: 0 4px 24px rgba(201,168,76,0.25);
    transition: box-shadow 0.25s ease, background 0.25s ease !important;
  }
  .vw-mobile-bulk:hover {
    background: var(--gold-light, #f0d080) !important;
    box-shadow: 0 4px 32px rgba(201,168,76,0.5) !important;
    border-color: var(--gold-light, #f0d080) !important;
    color: var(--obsidian) !important;
  }
  .vw-mobile-bulk .vw-link-arrow { opacity: 0.7 !important; color: var(--obsidian) !important; }
`;

export default function Navbar({ activePage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
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
      {/* Inject keyframe CSS once */}
      <style>{GLOBAL_STYLE}</style>

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

          {/* ── Desktop nav links ─────────────────────────────────────────── */}
          {!isMobileOrTablet && (
            <div className="nav-links" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {regularLinks.map(([label, pg]) => (
                <button
                  key={pg}
                  onClick={() => goToPage(pg)}
                  className={`vw-bulk-btn${activePage === pg ? " active" : ""}`}
                >
                  {t(label)}
                </button>
              ))}

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

            {/* Search */}
            {searchOpen ? (
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

                {/* User greeting / login */}
                {greetingName ? (
                  <button className="vw-user-pill" onClick={() => setPage("account")}>
                    {greetWord}, {greetingName}
                  </button>
                ) : (
                  <button className="vw-icon-btn" onClick={() => setPage("login")} title="Login">
                    <Icon name="user" size={21} />
                  </button>
                )}

                {/* Sign out */}
                {user && (
                  <button className="vw-signout-btn" onClick={signOutUser}>
                    {t("logout")}
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
                className={`vw-mobile-link vw-mobile-bulk${activePage === pg ? " active" : ""}`}
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
