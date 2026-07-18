import React from "react";

const iconMapping = {
  wolf: { name: "wolf", style: "dusk" },
  cart: { name: "shopping-bag", style: "dusk" },
  heart: { name: "like", style: "dusk" },
  heartFill: { name: "like", style: "dusk" },
  user: { name: "user-male-circle", style: "dusk" },
  search: { name: "search", style: "dusk" },
  menu: { name: "menu", style: "dusk" },
  x: { name: "multiply", style: "dusk" },
  plus: { name: "plus", style: "dusk" },
  minus: { name: "minus", style: "dusk" },
  trash: { name: "trash", style: "dusk" },
  star: { name: "star", style: "dusk" },
  arrowRight: { name: "forward", style: "dusk" },
  eye: { name: "visible", style: "dusk" },
  package: { name: "box", style: "dusk" },
  chart: { name: "bar-chart", style: "dusk" },
  users: { name: "conference-call", style: "dusk" },
  settings: { name: "settings", style: "dusk" },
  logout: { name: "exit", style: "dusk" },
  check: { name: "checkmark", style: "dusk" },
  upload: { name: "upload", style: "dusk" },
  filter: { name: "filter", style: "dusk" },
  edit: { name: "edit", style: "dusk" },
  shield: { name: "shield", style: "dusk" },
  tag: { name: "price-tag", style: "dusk" },
  archive: { name: "archive", style: "dusk" },
  chevronDown: { name: "chevron-down", style: "dusk" },
  chevronUp: { name: "chevron-up", style: "dusk" },
  lock: { name: "lock", style: "dusk" },
  shop: { name: "shop", style: "dusk" },
  tshirt: { name: "t-shirt", style: "dusk" },
  factory: { name: "factory", style: "dusk" },
  truck: { name: "truck", style: "dusk" },
  undo: { name: "undo", style: "dusk" },
  
  // Collection specific icons
  cpu: { name: "cpu", style: "dusk" },
  sparkles: { name: "sparkles", style: "dusk" },
  gamecontroller: { name: "game-controller", style: "dusk" },
  dumbbell: { name: "dumbbell", style: "dusk" },
  brain: { name: "brain", style: "dusk" },
  diamond: { name: "diamond", style: "dusk" },
  fire: { name: "fire", style: "dusk" },
  rocket: { name: "rocket", style: "dusk" },
  car: { name: "car", style: "dusk" },
  trophy: { name: "trophy", style: "dusk" },
  layers: { name: "layers", style: "dusk" },
  trendingUp: { name: "trending-up", style: "dusk" },
  rupee: { name: "indian-rupee", style: "dusk" },
};

function resolveColorHex(color) {
  if (!color) return "ffffff";
  const clean = color.trim().toLowerCase();
  if (clean === "currentcolor") return "ffffff";
  if (clean.includes("var(--gold)") || clean === "gold" || clean === "#c9a84c") return "c9a84c";
  if (clean.includes("var(--ivory)") || clean === "ivory" || clean === "#f5f5f7") return "f5f5f7";
  if (clean.includes("var(--graphite)") || clean === "graphite" || clean === "#1c1c1e") return "1c1c1e";
  if (clean.includes("var(--silver)") || clean === "silver" || clean === "#a6a6a8") return "a6a6a8";
  if (clean.includes("var(--smoke)") || clean === "smoke" || clean === "#333333") return "333333";
  if (clean.includes("var(--wolf-red)") || clean === "wolf-red" || clean === "#c0392b") return "c0392b";
  if (clean.includes("var(--ash)") || clean === "ash" || clean === "#888888") return "888888";
  if (clean.startsWith("#")) return clean.replace("#", "");
  return "ffffff"; // default fallback
}

export default function Icon({ name, size = 18, color = "currentColor" }) {
  const iconConfig = iconMapping[name] || { name: "box", style: "ios" };
  const colorHex = resolveColorHex(color);
  
  // Dynamic URL using Icons8 OMG-IMG CDN
  // Use size * 2 for high-density Retina screen crispness
  const displaySize = size * 2;
  const src = `https://img.icons8.com/${iconConfig.style}/${displaySize}/${colorHex}/${iconConfig.name}.png`;

  return (
    <img 
      src={src} 
      alt={name} 
      width={size} 
      height={size} 
      style={{ 
        display: "inline-block", 
        verticalAlign: "middle",
        objectFit: "contain"
      }} 
    />
  );
}
