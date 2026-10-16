// Shared by GalleryProvider and the pages/layout that use it (kept out of the
// component file so React fast refresh keeps working there).
import { createContext, useContext } from "react";

// Help pages: each has an object in the hall's back-of-house wing (three/backstage.js).
export const HELP_PATHS = ["/contact", "/faq", "/track-order", "/shipping-policy", "/returns", "/privacy-policy", "/terms"];
export const isHelpPath = (pathname = "") => HELP_PATHS.includes(pathname);

// Routes drawn over the 3D gallery hall. Product pages show the product's
// own photos instead (no 3D).
export const isGalleryPath = (pathname = "") =>
  pathname === "/" ||
  pathname === "/shop" ||
  pathname.startsWith("/shop/") ||
  pathname === "/custom" ||
  pathname === "/size-guide" || pathname === "/payment-status" ||
  isHelpPath(pathname) ||
  pathname === "/login" ||
  pathname === "/signup" ||
  pathname === "/account" ||
  pathname.startsWith("/saved/");

// { engine, status }: status is off | loading | ready | none (no WebGL)
export const GalleryContext = createContext({ engine: null, status: "off" });
export const useGallery = () => useContext(GalleryContext);
