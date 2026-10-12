import { useLocation, Outlet } from "react-router";
import GalleryHeader from "../gallery/GalleryHeader";
import GalleryFooter from "../gallery/GalleryFooter";
import { GalleryProvider } from "../gallery/GalleryProvider";
import { isGalleryPath } from "../gallery/galleryContext";

// Gallery fonts (Unbounded + Manrope), used by the header and footer on every
// public page and by the home/shop gallery.
export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@200;300;400;500&display=swap" },
  ];
}

// Shared layout wrapper: the gallery header and footer around public routes.
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
    // Home and shop share one persistent 3D gallery canvas.
    <GalleryProvider active={isGalleryPath(location.pathname)}>
      <GalleryHeader />
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
      <GalleryFooter />
    </GalleryProvider>
  );
}
