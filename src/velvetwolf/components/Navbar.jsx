import { useState, useEffect, useContext } from "react";
import { AppContext } from "../pages/AppContext";

function Icon({ name, size = 18, color = "currentColor" }) {
  const icons = {
    heart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    cart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  };

  return icons[name] || null;
}

export default function Navbar({ activePage }) {
  const { setPage, setCartOpen, setWishlistOpen, user, cartCount, wishlist, signOutUser } = useContext(AppContext);
  const [scrolled, setScrolled] = useState(false);
  const displayName = user?.full_name || user?.name || user?.email?.split("@")[0] || "";
  const greetingName = displayName ? displayName.split(" ")[0] : "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 800,
        background: scrolled ? "rgba(10,10,10,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(201,168,76,0.2)" : "none",
        transition: "all 0.4s ease",
        padding: "0 40px",
      }}
    >
      <div
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
          onClick={() => setPage("home")}
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
            }}
          >
            <img src="/vw-logo.png" alt="VelvetWolf logo" style={{ width: 30, height: 30, objectFit: "contain" }} />

          </div>

          <div>
            <div
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

        {/* Nav links */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {[["SHOP", "shop"], ["COLLECTIONS", "collection"], ["CUSTOM", "custom"], ["BULK", "bulk"]].map(
            ([label, pg]) => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 18,
                  letterSpacing: 3,
                  fontWeight: 500,
                  padding: "4px 0",
                  position: "relative",

                  // 👇 main logic
                  color: activePage === pg ? "var(--gold)" : "var(--ash)",

                  transition: "color 0.3s, transform 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "scale(1)";
                }}
              >
                {label}
              </button>
            )
          )}

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

        {/* Icons */}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <button
            onClick={() => (user ? setWishlistOpen(true) : setPage("login"))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}
          >
            <Icon name="heart" size={22} />
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

          <button
            onClick={() => setCartOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ash)", position: "relative" }}
          >
            <Icon name="cart" size={22} />
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

          {greetingName && (
            <button
              onClick={() => setPage("account")}
              style={{
                background: "none",
                border: "1px solid rgba(201,168,76,0.35)",
                color: "var(--gold)",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
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
                fontSize: 10,
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
        </div>
      </div>
    </nav>
  );
}
