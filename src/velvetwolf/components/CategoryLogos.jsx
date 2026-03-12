// ─────────────────────────────────────────────
// VelvetWolf — Category SVG Logos
// Each logo accepts { size, color } props.
// Used by CategoryCarousel and MosaicCarousel.
// ─────────────────────────────────────────────

export const LogoFitness = ({ size = 52, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="4"  y="28" width="10" height="8" rx="3" fill={color}/>
    <rect x="50" y="28" width="10" height="8" rx="3" fill={color}/>
    <rect x="10" y="20" width="6"  height="24" rx="3" fill={color}/>
    <rect x="48" y="20" width="6"  height="24" rx="3" fill={color}/>
    <rect x="16" y="14" width="5"  height="36" rx="2.5" fill={color}/>
    <rect x="43" y="14" width="5"  height="36" rx="2.5" fill={color}/>
    <rect x="21" y="28" width="22" height="8" rx="2" fill={color} opacity="0.2"/>
    <circle cx="32" cy="32" r="5" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const LogoMusic = ({ size = 52, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <path d="M24 48V20l24-6v28" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="18" cy="48" r="6" stroke={color} strokeWidth="2.5" fill="none"/>
    <circle cx="42" cy="42" r="6" stroke={color} strokeWidth="2.5" fill="none"/>
    <path d="M24 28l24-6" stroke={color} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.3"/>
  </svg>
);

export const LogoFood = ({ size = 52, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <path d="M20 10v16c0 4 4 8 8 8s8-4 8-8V10" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="24" y1="10" x2="24" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    <line x1="32" y1="10" x2="32" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    <path d="M28 34v20" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M44 10c0 0 4 6 4 14s-4 10-4 10v20" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const LogoTravel = ({ size = 52, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="20" stroke={color} strokeWidth="2.5" fill="none"/>
    <ellipse cx="32" cy="32" rx="9" ry="20" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4"/>
    <line x1="12" y1="32" x2="52" y2="32" stroke={color} strokeWidth="1.5" opacity="0.4"/>
    <line x1="15" y1="22" x2="49" y2="22" stroke={color} strokeWidth="1" opacity="0.2"/>
    <line x1="15" y1="42" x2="49" y2="42" stroke={color} strokeWidth="1" opacity="0.2"/>
  </svg>
);

export const LogoPhotography = ({ size = 52, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="6" y="18" width="52" height="36" rx="5" stroke={color} strokeWidth="2.5" fill="none"/>
    <circle cx="32" cy="36" r="10" stroke={color} strokeWidth="2.5" fill="none"/>
    <circle cx="32" cy="36" r="4" fill={color} opacity="0.55"/>
    <path d="M22 18l4-8h12l4 8" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <circle cx="50" cy="27" r="2.5" fill={color} opacity="0.65"/>
  </svg>
);

// Map: category id → logo component
export const LOGO_MAP = {
  fitness:     LogoFitness,
  music:       LogoMusic,
  food:        LogoFood,
  travel:      LogoTravel,
  photography: LogoPhotography,
};
export default LOGO_MAP;
