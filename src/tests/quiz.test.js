import { describe, it, expect } from "vitest";
import { buildRounds, scorePicks, ROUNDS, PER_ROUND } from "../velvetwolf/account/quiz";

const COLORS = ["Black", "White", "Beige/Sand", "Forest Green", "Crimson Ember"];
const COLLS = ["silent-luxury", "founder", "mind-mayhem", "anime", "ai-tech", "beast-mode", "savage-quotes", "xp-mode"];
const products = COLLS.flatMap((c, ci) => Array.from({ length: 4 }, (_, i) => ({
  id: `${c}-${i}`, name: `${c} ${i}`, collection: c, isActive: true,
  images: COLORS.map((col, k) => `${col}::https://cdn.example/${c}-${i}-${k}.jpg`).slice(0, 2 + ((ci + i) % 4)),
})));

describe("style quiz", () => {
  it("builds five photo rounds from the real catalogue", () => {
    const rounds = buildRounds(products);
    expect(rounds).toHaveLength(ROUNDS.length);
    for (const r of rounds) {
      expect(r.options).toHaveLength(PER_ROUND);
      // four different collections, each a real colour-tagged photo
      expect(new Set(r.options.map((o) => o.collection)).size).toBe(PER_ROUND);
      for (const o of r.options) expect(o.src).toMatch(/^https:\/\/cdn\.example\//);
    }
  });

  it("never shows the same tee twice", () => {
    const ids = buildRounds(products).flatMap((r) => r.options.map((o) => o.product.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is stable for a given seed", () => {
    expect(buildRounds(products, 3).map((r) => r.options.map((o) => o.id))).toEqual(buildRounds(products, 3).map((r) => r.options.map((o) => o.id)));
  });

  it("skips products without colour-tagged photos and unknown collections", () => {
    const rounds = buildRounds([{ id: "x", collection: "anime", images: ["https://no-colour.jpg"] }, { id: "y", collection: "mystery", images: ["Black::https://a.jpg"] }]);
    expect(rounds).toEqual([]);
  });

  it("scores picks into a Wolf Type, with the collection to shop", () => {
    const pick = (collection, color) => ({ collection, color });
    expect(scorePicks([pick("beast-mode", "Crimson Ember"), pick("beast-mode", "Black"), pick("founder", "Crimson Ember")]).personalityType).toBe("ALPHA");
    expect(scorePicks([pick("silent-luxury", "Beige/Sand"), pick("founder", "White")]).personalityType).toBe("BUILDER");
    expect(scorePicks([pick("anime", "White"), pick("ai-tech", "White"), pick("anime", "Black")])).toMatchObject({ personalityType: "CREATOR", collection: "anime" });
    const s = scorePicks([pick("mind-mayhem", "Black")]);
    expect(s.personalityType).toBe("SHADOW");
    expect(Object.values(s.quizScore).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(99);
  });
});
