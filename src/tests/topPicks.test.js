import { describe, it, expect } from "vitest";
import { pickTopDesigns, stepOf, progressFor, fallbackMark, branchPath, showsPhoto } from "../velvetwolf/gallery/topPicks";

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

  it("shows the product photo unless the 3D tee can wear the artwork", () => {
    expect(showsPhoto(p("a"), "photo.jpg", true)).toBe(true);
    expect(showsPhoto(p("a", { printImage: "print.png" }), "photo.jpg", true)).toBe(false);
    expect(showsPhoto(p("a", { printImage: "print.png" }), "photo.jpg", false)).toBe(true);
    expect(showsPhoto(p("a"), null, true)).toBe(false);
  });

  it("draws a branch as a straight run, a 45° turn, then a straight run into the card", () => {
    expect(branchPath(0, 100, 500, 40)).toBe("M0.0,100.0 H80.0 L140.0,40.0 H500.0");
    expect(branchPath(0, 100, 500, 160)).toBe("M0.0,100.0 H80.0 L140.0,160.0 H500.0");
  });

  it("steepens the turn for a far card, keeping the run into it", () => {
    expect(branchPath(0, 0, 200, 400)).toBe("M0.0,0.0 H32.0 L176.0,400.0 H200.0");
  });

  it("draws a level branch straight across", () => {
    expect(branchPath(0, 100, 500, 100)).toBe("M0.0,100.0 H80.0 L80.0,100.0 H500.0");
  });
});
