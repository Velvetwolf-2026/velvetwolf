import { useLocation, Outlet } from "react-router";
import GalleryHeader from "../gallery/GalleryHeader";
import GalleryFooter from "../gallery/GalleryFooter";
import { GalleryProvider } from "../gallery/GalleryProvider";
import { isGalleryPath, isHelpPath } from "../gallery/galleryContext";

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

  return (
    // Home and shop share one persistent 3D gallery canvas.
    <GalleryProvider active={isGalleryPath(location.pathname)} poster={!isHelpPath(location.pathname) && location.pathname !== "/account" && !location.pathname.startsWith("/saved/")}>
      <GalleryHeader />
      <Outlet />
      <GalleryFooter toolView={location.pathname === "/size-guide" || location.pathname === "/custom"} />
    </GalleryProvider>
  );
}
