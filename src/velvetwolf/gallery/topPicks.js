// The home page's "Top 5 designs": which tees, in what order, and what the 3D tee wears.

export const TOP_COUNT = 5;
// shown on the tee while a product has no print artwork yet (admin panel → Print artwork)
const FALLBACK_MARKS = ["wordmark", "monogram", "horizon", "contour", "wordmarkSmall"];

// The admin's picks first (Top 5 position 1-5), then the newest tees that aren't already on
// the wall in Quiet Hours (`skip`), then any newest tee, until there are five.
export function pickTopDesigns(products, skip = []) {
  const live = (Array.isArray(products) ? products : []).filter((p) => p && p.isActive !== false);
  const skipIds = new Set(skip.map((p) => p?.id));
  const ranked = live
    .filter((p) => Number(p.topRank) >= 1 && Number(p.topRank) <= TOP_COUNT)
    .sort((a, b) => Number(a.topRank) - Number(b.topRank));
  const out = [...ranked];
  const taken = new Set(out.map((p) => p.id));
  for (const pool of [live.filter((p) => !skipIds.has(p.id)), live]) {
    for (const p of pool) {
      if (out.length >= TOP_COUNT) break;
      if (!taken.has(p.id)) { out.push(p); taken.add(p.id); }
    }
  }
  return out.slice(0, TOP_COUNT);
}

export const fallbackMark = (i) => FALLBACK_MARKS[i % FALLBACK_MARKS.length];

// Which design is active, and how far its branch has lit, from the room's scroll progress
// (0..1 across the five designs).
export function stepOf(progress, count = TOP_COUNT) {
  const x = Math.min(Math.max(progress, 0), 1) * count;
  const active = Math.min(count - 1, Math.floor(x));
  // the active branch draws in over the first 40% of its step, then stays lit
  const draw = Math.min(1, Math.max(0, (x - active) / 0.4));
  return { active, draw: x >= count ? 1 : draw };
}

// The scroll progress that centres design i in the room (used when it's clicked).
export const progressFor = (i, count = TOP_COUNT) => (i + 0.5) / count;
