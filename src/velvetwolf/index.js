// ─────────────────────────────────────────────
// VelvetWolf — Central Barrel Export
// Drop this in your project root and import
// anything from one place:
//
//   import { MosaicCarousel, FAQPage, Navbar } from "./velvetwolf";
// ─────────────────────────────────────────────

// ── Layout Components ──
export { default as Navbar       } from "./components/Navbar";
export { default as Footer       } from "./components/Footer";

// ── Carousel Components ──
export { default as MosaicCarousel } from "./components/MosaicCarousel";
export { default as CategoryTile   } from "./components/CategoryTile";

// ── SVG Logos ──
export { LogoFitness, LogoMusic, LogoFood, LogoTravel, LogoPhotography, LOGO_MAP } from "./components/CategoryLogos";

// ── Policy / Info Pages ──
export { default as PrivacyPolicy  } from "./pages/PrivacyPolicy";
export { default as TermsPage      } from "./pages/TermsPage";
export { default as ShoppingPolicy } from "./pages/ShoppingPolicy";
export { default as SizeGuide      } from "./pages/SizeGuide";
export { default as TrackOrder     } from "./pages/TrackOrder";
export { default as ReturnsPage    } from "./pages/ReturnsPage";
export { default as FAQPage        } from "./pages/FAQPage";
export { default as ContactPage    } from "./pages/ContactPage";

// ── Shared Style Helpers ──
export { S, PageHeader, Sec, Ul, DataTable } from "./styles/shared";

// ── Constants ──
export { THEME, CATEGORIES, NAV_LINKS, POLICY_PAGES } from "./utils/constants";
