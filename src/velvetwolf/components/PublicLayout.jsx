import { useLocation, Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Shared layout wrapper for rendering Navbar & Footer around public routes.
export default function PublicLayout() {
  const location = useLocation();

  // Floating back button for all info/policy pages
  const showBackButton = [
    "/privacy-policy",
    "/terms",
    "/shipping-policy",
    "/returns",
    "/size-guide",
    "/track-order",
    "/faq",
    "/contact"
  ].includes(location.pathname);

  return (
    <>
      <Navbar activePage={location.pathname} />
      <Outlet />
      {showBackButton && (
        <button
          onClick={() => window.history.back()}
          style={{
            position: "fixed",
            top: 80,
            left: 24,
            zIndex: 850,
            background: "var(--graphite)",
            border: "1px solid var(--smoke)",
            color: "var(--ash)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: 2,
            padding: "8px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--smoke)"; e.currentTarget.style.color = "var(--ash)"; }}
        >
          ← BACK
        </button>
      )}
      <Footer onNavigate={() => { }} />
    </>
  );
}
