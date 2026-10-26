import { describe, it, expect } from "vitest";
import { pickTopDesigns, stepOf, progressFor, fallbackMark } from "../velvetwolf/gallery/topPicks";

const p = (id, extra = {}) => ({ id, name: id, ...extra });

describe("Top 5 designs", () => {
  it("puts the admin's picks first, in their positions", () => {
    const list = [p("a"), p("b"), p("c", { topRank: 2 }), p("d", { topRank: 1 }), p("e"), p("f")];
    expect(pickTopDesigns(list).map((x) => x.id)).toEqual(["d", "c", "a", "b", "e"]);
  });

  it("fills with the newest tees not already hung in Quiet Hours", () => {
    const list = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"].map((id) => p(id));
    expect(pickTopDesigns(list, list.slice(0, 3)).map((x) => x.id)).toEqual(["n4", "n5", "n6", "n7", "n8"]);
  });

  it("uses Quiet Hours tees too when the shop is small, and skips inactive ones", () => {
    const list = [p("a"), p("b"), p("c", { isActive: false }), p("d")];
    expect(pickTopDesigns(list, [list[0]]).map((x) => x.id)).toEqual(["b", "d", "a"]);
  });

  it("maps scroll progress to the active design and how far its branch has drawn", () => {
    expect(stepOf(0)).toEqual({ active: 0, draw: 0 });
    expect(stepOf(0.1)).toEqual({ active: 0, draw: 1 });
    expect(stepOf(0.3).active).toBe(1);
    expect(stepOf(1)).toEqual({ active: 4, draw: 1 });
    expect(stepOf(progressFor(2)).active).toBe(2);
  });

  it("has a VelvetWolf mark for tees without print artwork", () => {
    expect(fallbackMark(0)).toBe("wordmark");
    expect(fallbackMark(5)).toBe("wordmark");
  });
});
