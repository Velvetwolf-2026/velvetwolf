// Shared by GalleryProvider and the pages/layout that use it (kept out of the
// component file so React fast refresh keeps working there).
import { createContext, useContext } from "react";

// Routes drawn over the 3D gallery hall. Product pages show the product's
// own photos instead (no 3D).
export const isGalleryPath = (pathname = "") =>
  pathname === "/" ||
  pathname === "/shop" ||
  pathname.startsWith("/shop/") ||
  pathname === "/custom" ||
  // size guide and payment status stand in the hall (the tee is the point there); the other help
  // pages draw their own backdrop in CSS
  pathname === "/size-guide" || pathname === "/payment-status" ||
  pathname === "/login" ||
  pathname === "/signup";

// { engine, status }: status is off | loading | ready | none (no WebGL)
export const GalleryContext = createContext({ engine: null, status: "off" });
export const useGallery = () => useContext(GalleryContext);
