import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../pages/AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import Icon from "./Icon";

export default function Navbar({ activePage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const { setPage, setCartOpen, setWishlistOpen, user, cartCount, wishlist, signOutUser, openShop, searchQuery, setSearchQuery } =
    useContext(AppContext);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isMobileOrTablet, isMobile } = useBreakpoint();

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (location.pathname !== "/shop" && !location.pathname.startsWith("/shop/")) {
      navigate("/shop");
    }
  };

  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "";
  const greetingName = displayName ? displayName.split(" ")[0] : "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobileOrTablet) setMobileOpen(false);
  }, [isMobileOrTablet]);

  const navLinks = [
    ["SHOP", "shop"],
    ["COLLECTIONS", "collection"],
    ["CUSTOM", "custom"],
    ["BULK", "bulk"],
  ];

  const handleNavClick = (pg) => {
    pg === "shop" ? openShop() : setPage(pg);
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        className="nav-pad"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 800,
          background: scrolled || mobileOpen ? "rgba(10,10,10,0.97)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(201,168,76,0.2)" : "none",
          transition: "all 0.4s ease",
          padding: "0 40px",
        }}
      >
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
          {/* Logo */}
          <div
            onClick={() => { setPage("home"); setMobileOpen(false); }}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img src="/vw-logo.png" alt="VelvetWolf logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
            </div>

            <div>
              <div
                className="nav-logo-text"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  letterSpacing: 6,
                  color: "var(--ivory)",
                  lineHeight: 1,
                }}
              >
                VELVETWOLF
              </div>
              <div
                className="nav-logo-sub"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 4,
                  color: "var(--gold)",
                  opacity: 0.8,
                }}
              >
                LUXURY STREETWEAR
              </div>
            </div>
          </div>

          {/* Desktop nav links */}
          {!isMobileOrTablet && (
            <div className="nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
              {navLinks.map(([label, pg]) => (
                <button
                  key={pg}
                  onClick={() => handleNavClick(pg)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 18,
                    letterSpacing: 3,
                    fontWeight: 500,
                    padding: "4px 0",
                    color: activePage === pg ? "var(--gold)" : "var(--ash)",
                    transition: "color 0.3s, transform 0.3s",
                  }}
                  onMouseEnter={(e) => { e.target.style.transform = "scale(1.1)"; }}
                  onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
                >
                  {label}
                </button>
              ))}

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

          {/* Right icons */}
          <div style={{ display: "flex", gap: isMobile ? 12 : 20, alignItems: "center" }}>
            {/* Search */}
            {searchOpen ? (
              <div style={{ display: "flex", alignItems: "center", position: "relative", gap: 8 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="SEARCH..."
                  style={{
                    width: isMobile ? 100 : 150,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--gold)",
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "var(--ivory)",
                    outline: "none",
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", padding: 0 }}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)" }}
              >
                <Icon name="search" size={isMobile ? 20 : 22} />
              </button>
            )}

            {/* Wishlist */}
            <button
              onClick={() => { user ? setWishlistOpen(true) : setPage("login"); setMobileOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}
            >
              <Icon name="heart" size={isMobile ? 20 : 22} />
              {wishlist.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "var(--wolf-red)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                  }}
                >
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={() => { setCartOpen(true); setMobileOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}
            >
              <Icon name="cart" size={isMobile ? 20 : 22} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "var(--gold)",
                    color: "var(--obsidian)",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    fontWeight: "bold",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* User button — desktop only */}
            {!isMobileOrTablet && (
              <>
                {greetingName && (
                  <button
                    onClick={() => setPage("account")}
                    style={{
                      background: "none",
                      border: "1px solid rgba(201,168,76,0.35)",
                      color: "var(--gold)",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      letterSpacing: 1.5,
                      padding: "8px 12px",
                      textTransform: "none",
                    }}
                  >
                    {`Hi ${greetingName}`}
                  </button>
                )}

                {user && (
                  <button
                    onClick={signOutUser}
                    style={{
                      background: "none",
                      border: "1px solid var(--smoke)",
                      color: "var(--ash)",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      letterSpacing: 2,
                      padding: "8px 12px",
                    }}
                  >
                    SIGN OUT
                  </button>
                )}

                <button
                  onClick={() => (user ? setPage("account") : setPage("login"))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: user ? "var(--gold)" : "var(--ash)" }}
                >
                  <Icon name="user" size={22} />
                </button>
              </>
            )}

            {/* Hamburger — mobile/tablet only */}
            {isMobileOrTablet && (
              <button
                onClick={() => setMobileOpen((v) => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", padding: 4 }}
                aria-label="Toggle menu"
              >
                <Icon name={mobileOpen ? "x" : "menu"} size={24} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {isMobileOrTablet && mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 799,
            background: "rgba(10,10,10,0.98)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            padding: "32px 24px",
            overflowY: "auto",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* Mobile Search */}
          <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="SEARCH PIECES..."
              style={{
                flex: 1,
                padding: "12px 16px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                border: "1px solid var(--smoke)",
                background: "rgba(20, 20, 20, 0.8)",
                color: "var(--ivory)",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "var(--smoke)",
                  border: "none",
                  color: "var(--ash)",
                  padding: "0 16px",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12
                }}
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 40 }}>
            {navLinks.map(([label, pg]) => (
              <button
                key={pg}
                onClick={() => handleNavClick(pg)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--smoke)",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  letterSpacing: 4,
                  color: activePage === pg ? "var(--gold)" : "var(--ivory)",
                  padding: "16px 0",
                  textAlign: "left",
                  transition: "color 0.2s",
                }}
              >
                {label}
              </button>
            ))}

            {user?.isAdmin && (
              <button
                onClick={() => { setPage("admin"); setMobileOpen(false); }}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--smoke)",
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  letterSpacing: 4,
                  color: "var(--gold)",
                  padding: "16px 0",
                  textAlign: "left",
                }}
              >
                ADMIN
              </button>
            )}
          </div>

          {/* User section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {greetingName && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 2, color: "var(--gold)", marginBottom: 8 }}>
                HELLO, {greetingName.toUpperCase()}
              </div>
            )}

            <button
              onClick={() => { user ? setPage("account") : setPage("login"); setMobileOpen(false); }}
              className="btn-outline"
              style={{ width: "100%", textAlign: "center" }}
            >
              {user ? "MY ACCOUNT" : "SIGN IN"}
            </button>

            {user && (
              <button
                onClick={() => { signOutUser(); setMobileOpen(false); }}
                className="btn-ghost"
                style={{ width: "100%", textAlign: "center" }}
              >
                SIGN OUT
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
