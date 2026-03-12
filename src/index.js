// ─────────────────────────────────────────────
// VelvetWolf — Central Barrel Export
// Drop this in your project root and import
// anything from one place:
//
//   import { MosaicCarousel, FAQPage, Navbar } from "./velvetwolf";
// ─────────────────────────────────────────────

// ── Layout Components ──
export { default as Navbar       } from "./velvetwolf/components/Navbar";
export { default as Footer       } from "./velvetwolf/components/Footer";

// ── Carousel Components ──
export { default as MosaicCarousel } from "./velvetwolf/components/MosaicCarousel";
export { default as CategoryTile   } from "./velvetwolf/components/CategoryTile";

// ── SVG Logos ──
export { LogoFitness, LogoMusic, LogoFood, LogoTravel, LogoPhotography, LOGO_MAP } from "./velvetwolf/components/CategoryLogos";

// ── Policy / Info Pages ──
export { default as PrivacyPolicy  } from "./velvetwolf/pages/PrivacyPolicy";
export { default as TermsPage      } from "./velvetwolf/pages/TermsPage";
export { default as ShoppingPolicy } from "./velvetwolf/pages/ShoppingPolicy";
export { default as SizeGuide      } from "./velvetwolf/pages/SizeGuide";
export { default as TrackOrder     } from "./velvetwolf/pages/TrackOrder";
export { default as ReturnsPage    } from "./velvetwolf/pages/ReturnsPage";
export { default as FAQPage        } from "./velvetwolf/pages/FAQPage";
export { default as ContactPage    } from "./velvetwolf/pages/ContactPage";

// ── Shared Style Helpers ──
export { S, PageHeader, Sec, Ul, DataTable } from "./velvetwolf/styles/shared";

// ── Constants ──
export { THEME, CATEGORIES, NAV_LINKS, POLICY_PAGES } from "./velvetwolf/utils/constants";
