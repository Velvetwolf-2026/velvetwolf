// Shared by GalleryProvider and the pages/layout that use it (kept out of the
// component file so React fast refresh keeps working there).
import { createContext, useContext } from "react";

// Routes drawn over the 3D gallery hall.
export const isGalleryPath = (pathname = "") =>
  pathname === "/" || pathname === "/shop" || pathname.startsWith("/shop/");

// { engine, status }: status is off | loading | ready | none (no WebGL)
export const GalleryContext = createContext({ engine: null, status: "off" });
export const useGallery = () => useContext(GalleryContext);
