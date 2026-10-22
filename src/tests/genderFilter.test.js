import { describe, it, expect } from "vitest";
import { genderOf, parseGender, matchesGender } from "../velvetwolf/gallery/genderFilter";

const men = { gender: "Men" };
const women = { gender: "Women" };
const unisex = { gender: "Unisex" };
const legacyWomen = { style: "Women's Fit" }; // before products.gender existed
const unknown = {}; // older API, offline fallback list

describe("shop by gender", () => {
  it("reads gender from the product, the older style label, or defaults to unisex", () => {
    expect(genderOf(men)).toBe("men");
    expect(genderOf(legacyWomen)).toBe("women");
    expect(genderOf(unknown)).toBe("unisex");
  });

  it("only accepts men or women from the address; anything else is all", () => {
    expect(parseGender("MEN")).toBe("men");
    expect(parseGender("women")).toBe("women");
    for (const v of [null, "", "kids", "all"]) expect(parseGender(v)).toBe("all");
  });

  it("shows unisex tees under men and women, but never the other gender's", () => {
    expect([men, women, unisex, unknown].filter((p) => matchesGender(p, "men"))).toEqual([men, unisex, unknown]);
    expect([men, women, unisex, legacyWomen].filter((p) => matchesGender(p, "women"))).toEqual([women, unisex, legacyWomen]);
    expect([men, women, unisex].filter((p) => matchesGender(p, "all"))).toHaveLength(3);
  });
});
