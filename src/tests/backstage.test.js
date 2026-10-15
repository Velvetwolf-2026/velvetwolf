import { describe, it, expect, vi, beforeAll } from "vitest";
import * as THREE from "three";

// canvas textures need a real 2D canvas; the scene logic doesn't
vi.mock("../velvetwolf/gallery/three/textures.js", () => ({ radialTexture: () => new THREE.Texture() }));

const { buildBackstage, BACKSTAGE_X } = await import("../velvetwolf/gallery/three/backstage.js");

let bs;
const run = (name, frames = 240, dt = 1 / 60, motion = true) => {
  for (let i = 0; i < frames; i++) bs.update(i * dt, dt, motion, name);
};
const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());

beforeAll(() => { bs = buildBackstage(new THREE.Scene(), { shadows: false }); });

describe("back of house", () => {
  it("places one object per help page along the wing", () => {
    for (const [name, x] of Object.entries(BACKSTAGE_X)) expect(bs[name].group.position.x).toBe(x);
  });

  it("track: the parcel loops without an order, then stops at the order's real stage", () => {
    bs.track.set({ stage: null });
    run("track", 30);
    const parcel = bs.track.group.children.at(-1);
    const looping = worldPos(parcel).x;
    bs.track.set({ stage: 4 });
    run("track", 600);
    const atFour = worldPos(parcel).x;
    run("track", 120);
    expect(worldPos(parcel).x).toBeCloseTo(atFour, 3); // it has stopped
    expect(atFour).not.toBeCloseTo(looping, 1);
    // stage 4 of 0..6 along a route from -4.6 to +4.6
    expect(atFour - BACKSTAGE_X.track).toBeCloseTo(-4.6 + 9.2 * (4 / 6), 0);
  });

  it("track: still frames (low-end phones) jump straight to the final state", () => {
    bs.track.set({ stage: 6 });
    run("track", 1, 1 / 60, false);
    const parcel = bs.track.group.children.at(-1);
    expect(worldPos(parcel).x - BACKSTAGE_X.track).toBeCloseTo(4.6, 1);
  });

  it("returns: shows the loop closed into a gap when the window has passed", () => {
    const ringFull = bs.returns.group.children.find((c) => c.geometry?.parameters?.arc === Math.PI * 2);
    const ringGap = bs.returns.group.children.find((c) => c.geometry?.parameters?.arc && c.geometry.parameters.arc < Math.PI * 2);
    bs.returns.set({ step: 2, eligible: true, closed: false });
    run("returns", 60);
    expect(ringFull.visible).toBe(true);
    expect(ringGap.visible).toBe(false);
    bs.returns.set({ step: 0, eligible: false, closed: true });
    run("returns", 60);
    expect(ringFull.visible).toBe(false);
    expect(ringGap.visible).toBe(true);
  });

  it("shipping: both parcels leave together and Express pulls ahead", () => {
    bs.shipping.set({ days: { standard: 8, express: 5.5 }, method: "express" });
    run("shipping", 90); // 1.5 s = 3 business days
    const parcels = bs.shipping.group.children.filter((c) => c.userData?.box);
    const [std, exp] = parcels.sort((a, b) => a.position.z - b.position.z);
    expect(exp.position.x).toBeGreaterThan(std.position.x);
  });

  it("faq: a topic slides its drawer out; a search lifts only the matching cards", () => {
    bs.faq.set({ cat: "Returns" });
    run("faq", 240);
    const cab = bs.faq.group.children.find((c) => c.type === "Group");
    const drawers = cab.children.filter((c) => c.type === "Group");
    const returnsDrawer = drawers[4]; // Orders, Shipping, Products, Custom, Returns, Account
    const ordersDrawer = drawers[0];
    expect(returnsDrawer.position.z).toBeGreaterThan(ordersDrawer.position.z + 0.3);

    bs.faq.set({ cat: "All", match: ["Orders:1"] });
    run("faq", 300);
    const cards = ordersDrawer.children.filter((c) => c.geometry?.parameters?.height === 0.34);
    expect(cards[1].position.y).toBeGreaterThan(cards[0].position.y + 0.3);
  });

  it("terms: sheets settle in step with reading progress", () => {
    const sheets = () => bs.terms.group.children.filter((c) => c.geometry?.parameters?.depth === 0.86);
    bs.terms.set({ progress: 0 });
    run("terms", 600);
    expect(sheets().filter((s) => s.visible).length).toBe(1);
    bs.terms.set({ progress: 1 });
    run("terms", 900);
    expect(sheets().filter((s) => s.visible).length).toBe(13);
  });

  it("contact: the lamp dims to an ember when closed and lights when open", () => {
    const light = bs.contact.group.children.find((c) => c.isPointLight);
    bs.contact.set({ open: false });
    run("contact", 400);
    const closed = light.intensity;
    bs.contact.set({ open: true });
    run("contact", 400);
    expect(light.intensity).toBeGreaterThan(closed * 5);
  });

  it("privacy: pointing at a row lifts its object, and only that one", () => {
    bs.privacy.set({ focus: "address" });
    run("privacy", 300);
    const sprites = bs.privacy.group.children.filter((c) => c.isSprite);
    const lit = sprites.filter((s) => s.material.opacity > 0.3);
    expect(lit).toHaveLength(1);
  });
});
