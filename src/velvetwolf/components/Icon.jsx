import React from "react";

const iconMapping = {
  wolf: { name: "wolf", style: "ios-filled" },
  cart: { name: "shopping-bag", style: "ios" },
  heart: { name: "like", style: "ios" },
  heartFill: { name: "like", style: "ios-filled" },
  user: { name: "user-male-circle", style: "ios" },
  search: { name: "search", style: "ios" },
  menu: { name: "menu", style: "ios" },
  x: { name: "multiply", style: "ios" },
  plus: { name: "plus", style: "ios" },
  minus: { name: "minus", style: "ios" },
  trash: { name: "trash", style: "ios" },
  star: { name: "star", style: "ios-filled" },
  arrowRight: { name: "arrow-right", style: "ios" },
  eye: { name: "visible", style: "ios" },
  package: { name: "box", style: "ios" },
  chart: { name: "bar-chart", style: "ios" },
  users: { name: "group", style: "ios" },
  settings: { name: "settings", style: "ios" },
  logout: { name: "logout-round", style: "ios" },
  check: { name: "checkmark", style: "ios" },
  upload: { name: "upload", style: "ios" },
  filter: { name: "filter", style: "ios" },
  edit: { name: "edit", style: "ios" },
  shield: { name: "shield", style: "ios" },
  tag: { name: "price-tag", style: "ios" },
  archive: { name: "archive", style: "ios" },
  chevronDown: { name: "chevron-down", style: "ios" },
  chevronUp: { name: "chevron-up", style: "ios" },
  lock: { name: "lock", style: "ios" },
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
