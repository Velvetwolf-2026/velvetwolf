import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";

// the cards' faces are canvases; the hand's layout and turning don't need one
vi.mock("../velvetwolf/gallery/three/textures.js", () => ({
  makeCanvas: (w, h) => ({ width: w, height: h, getContext: () => null }),
}));

const { createOrderCards, cardPose } = await import("../velvetwolf/gallery/three/orderCards.js");

const cardsOf = (oc) => oc.group.children;
const run = (oc, seconds, motion = true) => {
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) oc.update(i * dt, dt, motion);
};

describe("payment order cards", () => {
  it("a single tee stands alone, full size, and never turns", () => {
    const oc = createOrderCards(new THREE.Scene());
    oc.set([{ src: "", name: "Unknown Roads" }]);
    run(oc, 8);
    const [c] = cardsOf(oc);
    expect(oc.group.visible).toBe(true);
    expect(c.position.x).toBeCloseTo(0, 5);
    expect(c.scale.x).toBeCloseTo(1, 5);
    expect(oc.front).toBe(0);
  });

  it("several tees fan out: the front card is largest, the others step back faded", () => {
    const oc = createOrderCards(new THREE.Scene());
    oc.set([{ name: "A" }, { name: "B" }, { name: "C" }]);
    const [a, b, c] = cardsOf(oc);
    expect(a.scale.x).toBeGreaterThan(b.scale.x);
    expect(a.position.z).toBeGreaterThan(b.position.z);
    expect(b.position.x).toBeGreaterThan(0);
    expect(c.position.x).toBeLessThan(0); // the hand wraps: the third card waits on the left
    const op = (g) => g.children.find((m) => m.userData.role?.startsWith("card:")).material.opacity;
    expect(op(a)).toBeCloseTo(1, 5);
    expect(op(b)).toBeLessThan(0.5);
  });

  it("the hand turns on its own, and pointing at a tee brings it forward and holds it", () => {
    const oc = createOrderCards(new THREE.Scene());
    oc.set([{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }]);
    run(oc, 5);
    expect(oc.front).toBe(1);
    oc.focus(3);
    run(oc, 12);
    expect(oc.front).toBe(3);
    oc.focus(null);
    run(oc, 5);
    expect(oc.front).toBe(0); // turned on again, round to the next one
  });

  it("holds still with motion off", () => {
    const oc = createOrderCards(new THREE.Scene());
    oc.set([{ name: "A" }, { name: "B" }]);
    run(oc, 10, false);
    expect(oc.front).toBe(0);
  });

  it("clears off the stage", () => {
    const oc = createOrderCards(new THREE.Scene());
    oc.set([{ name: "A" }, { name: "B" }]);
    oc.clear();
    expect(oc.count).toBe(0);
    expect(oc.group.visible).toBe(false);
  });

  it("poses are symmetric and fade towards the far side", () => {
    const l = cardPose(-1, 5), r = cardPose(1, 5);
    expect(l.x).toBeCloseTo(-r.x, 6);
    expect(cardPose(2, 5).opacity).toBeLessThan(r.opacity);
    expect(cardPose(2.5, 5).opacity).toBeCloseTo(0, 6);
  });
});
