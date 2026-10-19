// The style quiz: five rounds of photos from the real catalogue, no adjectives. Each photo is a
// tee in one colourway; picking it adds its collection's lean and its colour's lean to the five
// Wolf Types. The highest total is your type.
const T = (builder = 0, shadow = 0, creator = 0, alpha = 0, rebel = 0) => ({ builder, shadow, creator, alpha, rebel });

// what each collection says about taste
export const COLLECTION_LEAN = {
  "silent-luxury": T(3, 2, 0, 0, 0),
  founder: T(3, 1, 0, 1, 0),
  "mind-mayhem": T(0, 3, 1, 0, 1),
  anime: T(0, 0, 3, 0, 1),
  "ai-tech": T(1, 0, 3, 0, 0),
  "beast-mode": T(0, 0, 0, 3, 1),
  "savage-quotes": T(0, 0, 0, 1, 3),
  "xp-mode": T(0, 0, 1, 1, 2),
};
// and each colourway (the colour of the photo shown)
export const COLOR_LEAN = {
  black: T(0, 2, 0, 1, 0),
  white: T(1, 0, 1, 0, 0),
  "beige/sand": T(2, 0, 0, 0, 0),
  "forest green": T(1, 1, 0, 0, 0),
  "crimson ember": T(0, 0, 0, 2, 1),
};

export const ROUNDS = [
  "Which one would you wear tomorrow?",
  "Pick the one you'd stop for.",
  "Which feels most like your weekend?",
  "Meeting someone new. Which one?",
  "A long day out. Which do you reach for?",
];
export const PER_ROUND = 4;

const keyOf = (s) => String(s || "").trim().toLowerCase();

// a product's colour-tagged photos: [{ color, src }]
function photosOf(p) {
  const list = Array.isArray(p?.images) ? p.images : [];
  const out = [];
  for (const img of list) {
    if (typeof img !== "string" || !img.includes("::")) continue;
    const [color, ...rest] = img.split("::");
    if (COLOR_LEAN[keyOf(color)] && rest.join("::")) out.push({ color, src: rest.join("::") });
  }
  return out;
}

// small seeded shuffle so a round shows the same photos while you're on it
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
}

// Build the rounds: each round shows PER_ROUND photos from different collections, in different
// colours, never the same tee twice in the whole quiz.
export function buildRounds(products = [], seed = 7) {
  const r = rng(seed);
  const pool = products
    .filter((p) => p && p.isActive !== false && COLLECTION_LEAN[p.collection])
    .map((p) => ({ p, photos: photosOf(p) }))
    .filter((x) => x.photos.length);
  const byCollection = new Map();
  for (const x of pool) {
    if (!byCollection.has(x.p.collection)) byCollection.set(x.p.collection, []);
    byCollection.get(x.p.collection).push(x);
  }
  for (const list of byCollection.values()) list.sort(() => r() - 0.5);
  const collections = [...byCollection.keys()];
  if (collections.length < 2) return [];
  const used = new Set();
  return ROUNDS.map((prompt, ri) => {
    const order = [...collections].sort(() => r() - 0.5);
    const options = [];
    const colorsUsed = new Set();
    for (const c of order) {
      if (options.length >= PER_ROUND) break;
      const x = byCollection.get(c).find((y) => !used.has(y.p.id));
      if (!x) continue;
      used.add(x.p.id);
      // a colour not yet shown in this round, starting somewhere different each time so every
      // colourway turns up across the quiz
      const start = (ri * PER_ROUND + options.length) % x.photos.length;
      const turned = [...x.photos.slice(start), ...x.photos.slice(0, start)];
      const photo = turned.find((ph) => !colorsUsed.has(keyOf(ph.color))) || turned[0];
      colorsUsed.add(keyOf(photo.color));
      options.push({ id: `${x.p.id}|${photo.color}`, product: x.p, color: photo.color, src: photo.src, collection: c });
    }
    return { prompt, options };
  }).filter((round) => round.options.length >= 2);
}

// picks: the chosen options. Returns { personalityType, quizScore (percentages), collection }
export function scorePicks(picks = []) {
  const sum = T();
  const collections = {};
  for (const o of picks) {
    const a = COLLECTION_LEAN[o.collection] || T();
    const b = COLOR_LEAN[keyOf(o.color)] || T();
    for (const k of Object.keys(sum)) sum[k] += a[k] + b[k];
    collections[o.collection] = (collections[o.collection] || 0) + 1;
  }
  const total = Object.values(sum).reduce((x, y) => x + y, 0) || 1;
  const quizScore = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, Math.round((v / total) * 100)]));
  // ties go to the earlier type in this order, so the same picks always give the same type
  const order = ["builder", "shadow", "creator", "alpha", "rebel"];
  const top = order.reduce((best, k) => (sum[k] > sum[best] ? k : best), order[0]);
  const collection = Object.entries(collections).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
  return { personalityType: top.toUpperCase(), quizScore, collection };
}
