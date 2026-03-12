// ─────────────────────────────────────────────
// VelvetWolf — Shared Design Tokens & Constants
// Import this anywhere you need brand colours or
// shared data (categories, nav links, etc.)
// ─────────────────────────────────────────────

export const THEME = {
  gold:     "#c9a84c",
  goldLight:"#e8c97a",
  bg:       "#090909",
  surface:  "#111111",
  border:   "rgba(255,255,255,0.07)",
  muted:    "rgba(255,255,255,0.38)",
  text:     "#e8e4dc",
};

export const CATEGORIES = [
  {
    id: "fitness",
    name: "Fitness",
    bg: ["#080400","#170900","#231100"],
    accent: "#ff6b2b",
    glow: "#ff4500",
    mesh: "radial-gradient(ellipse at 25% 75%, #c83400 0%, transparent 55%)",
  },
  {
    id: "music",
    name: "Music",
    bg: ["#030010","#07001e","#0e0032"],
    accent: "#a78bfa",
    glow: "#7c3aed",
    mesh: "radial-gradient(ellipse at 75% 20%, #6d28d9 0%, transparent 55%)",
  },
  {
    id: "food",
    name: "Food",
    bg: ["#090700","#170f00","#201600"],
    accent: "#f59e0b",
    glow: "#d97706",
    mesh: "radial-gradient(ellipse at 50% 85%, #b45309 0%, transparent 55%)",
  },
  {
    id: "travel",
    name: "Travel",
    bg: ["#000c1a","#001226","#001935"],
    accent: "#38bdf8",
    glow: "#0284c7",
    mesh: "radial-gradient(ellipse at 70% 30%, #0369a1 0%, transparent 55%)",
  },
  {
    id: "photography",
    name: "Photography",
    bg: ["#080808","#111111","#191919"],
    accent: "#cbd5e1",
    glow: "#94a3b8",
    mesh: "radial-gradient(ellipse at 30% 60%, #334155 0%, transparent 55%)",
  },
];

export const NAV_LINKS = [
  { id: "shop",        label: "SHOP" },
  { id: "collections", label: "COLLECTIONS" },
  { id: "custom",      label: "CUSTOM" },
  { id: "bulk",        label: "BULK" },
];

export const POLICY_PAGES = [
  { id: "privacy",   label: "Privacy Policy",         icon: "🔒" },
  { id: "terms",     label: "Terms & Agreements",     icon: "📋" },
  { id: "shopping",  label: "Shopping Policy",        icon: "🛒" },
  { id: "sizeguide", label: "Size Guide",             icon: "📏" },
  { id: "track",     label: "Track Order",            icon: "📦" },
  { id: "returns",   label: "Returns & Exchange",     icon: "↩"  },
  { id: "faq",       label: "FAQ",                    icon: "❓" },
  { id: "contact",   label: "Contact Us",             icon: "✉"  },
];
