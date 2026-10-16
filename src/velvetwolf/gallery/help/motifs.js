// Header drawings for the help pages (prototype ui/info.js). Each acts out what the page is for:
// a signal for contact, index cards for the FAQ, a route for tracking, a moving box for shipping,
// a loop for returns, a data map for privacy and lines being set for the terms. They are static
// markup (no user content), animated in CSS, and aria-hidden: the page text carries the meaning.
import { TRACK_STAGES, RETURNS, PRIVACY_MAP } from "./content";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const MOTIFS = {
  contact: () => `<svg class="motif motif-signal" viewBox="0 0 320 220">
      <g class="sig-arcs" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
        ${[34, 62, 90].map((r, i) => `<path class="sig-arc a${i}" d="M ${160 - r} ${110 - r * 0.15} A ${r} ${r} 0 0 1 ${160 + r} ${110 - r * 0.15}"/>
        <path class="sig-arc a${i}" d="M ${160 - r} ${110 + r * 0.15} A ${r} ${r} 0 0 0 ${160 + r} ${110 + r * 0.15}"/>`).join("")}
      </g>
      <circle class="sig-core" cx="160" cy="110" r="7"/>
      <circle class="sig-ping" cx="160" cy="110" r="7" fill="none" stroke-width="1.2"/>
    </svg>`,
  faq: () => `<svg class="motif motif-index" viewBox="0 0 320 220">
      ${["Orders", "Shipping", "Products", "Custom", "Returns", "Account"].map((c, i) => `
        <g class="idx-card c${i}" data-cat="${c}" style="--i:${i}" transform="translate(${46 + i * 38} ${58 + (i % 2) * 6}) rotate(${(i - 2.5) * 4})">
          <rect width="62" height="96" rx="2"/><line x1="10" y1="22" x2="44" y2="22"/><line x1="10" y1="32" x2="52" y2="32"/><line x1="10" y1="40" x2="36" y2="40"/>
          <text x="10" y="84">${c.toUpperCase()}</text>
        </g>`).join("")}
    </svg>`,
  "track-order": () => {
    const n = TRACK_STAGES.length, x0 = 22, x1 = 298;
    const xs = TRACK_STAGES.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
    const y = (i) => 120 + Math.sin(i * 1.1) * 26;
    const d = xs.map((x, i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y(i).toFixed(1)}`).join(" ");
    return `<svg class="motif motif-route" viewBox="0 0 320 220">
      <path class="route-base" d="${d}"/>
      <path class="route-done" d="${d}" pathLength="100"/>
      ${xs.map((x, i) => `<circle class="route-node" data-i="${i}" cx="${x.toFixed(1)}" cy="${y(i).toFixed(1)}" r="4.5"/>`).join("")}
      <text class="route-end" x="${x0}" y="${y(0) + 30}">STUDIO</text><text class="route-end" x="${x1}" y="${y(n - 1) + 30}" text-anchor="end">YOU</text>
      <g class="route-parcel" style="offset-path: path('${d}')"><circle r="9"/><path d="M -4 -1 L 0 -4 L 4 -1 L 4 4 L -4 4 Z" /></g>
    </svg>`;
  },
  "shipping-policy": () => `<svg class="motif motif-ship" viewBox="0 0 320 220">
      <line class="ship-ground" x1="20" y1="150" x2="300" y2="150"/>
      ${Array.from({ length: 15 }, (_, i) => `<line class="ship-tick" x1="${20 + i * 20}" y1="150" x2="${20 + i * 20}" y2="${i % 7 === 0 ? 162 : 156}"/>`).join("")}
      <text class="ship-day" x="20" y="178">DAY 0</text><text class="ship-day" x="160" y="178" text-anchor="middle">7</text><text class="ship-day" x="300" y="178" text-anchor="end">14</text>
      <g class="ship-box"><rect x="-16" y="-30" width="32" height="28" rx="1.5"/><line x1="-16" y1="-20" x2="16" y2="-20"/><line x1="0" y1="-30" x2="0" y2="-20"/></g>
      <path class="ship-trail" d="M 20 140 L 300 140"/>
    </svg>`,
  returns: () => {
    const cx = 160, cy = 112, r = 74, n = RETURNS.steps.length;
    const pts = RETURNS.steps.map((_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
    return `<svg class="motif motif-loop" viewBox="0 0 320 220">
      <circle class="loop-ring" cx="${cx}" cy="${cy}" r="${r}"/>
      <circle class="loop-run" cx="${cx}" cy="${cy}" r="${r}" pathLength="100"/>
      ${pts.map(([x, y], i) => `<g class="loop-stop" data-i="${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/><text x="${(x + (x > cx + 5 ? 12 : x < cx - 5 ? -12 : 0)).toFixed(1)}" y="${(y + (y < cy - 40 ? -12 : y > cy + 30 ? 20 : 4)).toFixed(1)}" text-anchor="${x > cx + 5 ? "start" : x < cx - 5 ? "end" : "middle"}">${RETURNS.steps[i].label.toUpperCase()}</text></g>`).join("")}
      <text class="loop-days" x="${cx}" y="${cy + 4}" text-anchor="middle">${RETURNS.windowDays} DAYS</text>
    </svg>`;
  },
  "privacy-policy": () => {
    const col = (list, x) => list.map((n, i) => ({ ...n, x, y: 26 + i * (168 / Math.max(1, list.length - 1)) }));
    const C = col(PRIVACY_MAP.collect, 18), U = col(PRIVACY_MAP.use, 172), S = col(PRIVACY_MAP.share, 326);
    const by = Object.fromEntries([...C, ...U, ...S].map((n) => [n.id, n]));
    const links = [...U, ...S].flatMap((t) => t.from.map((f) => [by[f], t]));
    const curve = (a, b) => `M ${a.x + 6} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x - 6} ${b.y}`;
    return `<svg class="motif motif-map" viewBox="0 0 470 220">
      ${links.map(([a, b], i) => `<path class="map-link" data-a="${a.id}" data-b="${b.id}" style="--i:${i}" d="${curve(a, b)}"/>`).join("")}
      ${[...C, ...U, ...S].map((n) => `<g class="map-node" data-id="${n.id}"><circle cx="${n.x}" cy="${n.y}" r="4"/><text x="${n.x + (n.x > 300 ? -10 : 10)}" y="${n.y + 4}" text-anchor="${n.x > 300 ? "end" : "start"}">${esc(n.label)}</text></g>`).join("")}
    </svg>`;
  },
  terms: () => `<svg class="motif motif-type" viewBox="0 0 320 220">
      ${[0.92, 0.78, 0.86, 0.6, 0.9, 0.72, 0.84, 0.5].map((w, i) => `<rect class="type-line" style="--i:${i}" x="40" y="${36 + i * 19}" width="${(240 * w).toFixed(0)}" height="${i === 0 ? 7 : 4}" rx="1"/>`).join("")}
      <rect class="type-mark" x="40" y="${36 + 8 * 19}" width="64" height="2"/>
    </svg>`,
};

// ---------- time in India ----------
export function nowIST() {
  const d = new Date();
  return new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000);
}

export function addWorkingDays(date, n) {
  const d = new Date(date);
  let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) left--; }
  return d;
}

export const fmtDay = (d) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
