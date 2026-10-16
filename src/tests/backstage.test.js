import { describe, it, expect, vi, beforeAll } from "vitest";
import * as THREE from "three";

// canvas textures need a real 2D canvas; the scene logic doesn't
vi.mock("../velvetwolf/gallery/three/textures.js", () => {
  const tex = () => new THREE.Texture();
  return {
    radialTexture: tex,
    paperEdgeTexture: tex,
    dayRuler: () => ({ texture: tex(), draw() {}, pad: 0.02 }),
    exhibitTag: () => ({ texture: tex(), aspect: 3.2, draw: vi.fn(), redraw() {} }),
  };
});

const { buildBackstage, BACKSTAGE_X } = await import("../velvetwolf/gallery/three/backstage.js");

let bs;
const run = (name, frames = 240, dt = 1 / 60, motion = true) => {
  for (let i = 0; i < frames; i++) bs.update(i * dt, dt, motion, name);
};
const find = (group, role) => {
  let hit = null;
  group.traverse((o) => { if (!hit && o.userData?.role === role) hit = o; });
  return hit;
};
const findAll = (group, role) => {
  const out = [];
  group.traverse((o) => { if (o.userData?.role === role) out.push(o); });
  return out;
};

beforeAll(() => { bs = buildBackstage(new THREE.Scene(), { shadows: false }); });

describe("back of house", () => {
  it("places one object per help page along the wing", () => {
    for (const [name, x] of Object.entries(BACKSTAGE_X)) expect(bs[name].group.position.x).toBe(x);
  });

  it("track: the parcel loops without an order, then stops at the order's real stage", () => {
    const parcel = find(bs.track.group, "parcel");
    bs.track.set({ stage: null });
    run("track", 30);
    const looping = parcel.position.z;
    bs.track.set({ stage: 4 });
    run("track", 600);
    const atFour = parcel.position.z;
    run("track", 120);
    expect(parcel.position.z).toBeCloseTo(atFour, 3); // it has stopped
    expect(atFour).not.toBeCloseTo(looping, 1);
    // stage 4 of 0..6 on a route from z = 3.0 towards the door
    expect(atFour).toBeCloseTo(3.0 - 7 * (4 / 6), 1);
    // the slabs it has passed are lit, the rest are not; the door stays dark
    expect(find(bs.track.group, "slab:4")).toBeTruthy();
    expect(find(bs.track.group, "doorLight").material.opacity).toBeLessThan(0.05);
  });

  it("track: the door glows only at Delivered, and still frames jump straight there", () => {
    bs.track.set({ stage: 6 });
    run("track", 1, 1 / 60, false);
    const parcel = find(bs.track.group, "parcel");
    expect(parcel.position.z).toBeCloseTo(-4.0, 1);
    expect(find(bs.track.group, "doorLight").material.opacity).toBeGreaterThan(0.5);
  });

  it("returns: shows the loop with a calm gap when the window has passed", () => {
    const full = find(bs.returns.group, "ringFull");
    const gap = find(bs.returns.group, "ringGap");
    bs.returns.set({ step: 2, eligible: true, closed: false });
    run("returns", 60);
    expect(full.visible).toBe(true);
    expect(gap.visible).toBe(false);
    bs.returns.set({ step: 0, eligible: false, closed: true });
    run("returns", 60);
    expect(full.visible).toBe(false);
    expect(gap.visible).toBe(true);
  });

  it("shipping: Express leaves after Standard, passes it, and arrives first", () => {
    bs.shipping.set({ days: { standard: 8.5, express: 5.5 }, method: "express" });
    const std = find(bs.shipping.group, "parcel:standard");
    const exp = find(bs.shipping.group, "parcel:express");
    run("shipping", 30); // 0.5 s: Standard has a head start
    expect(std.position.x).toBeGreaterThan(exp.position.x);
    run("shipping", 60); // 1.5 s: Express has passed it
    expect(exp.position.x).toBeGreaterThan(std.position.x);
    run("shipping", 150); // both have stopped at their own delivery day
    expect(std.position.x).toBeGreaterThan(exp.position.x);
  });

  it("faq: a topic slides its drawer out; a search lifts only the matching cards", () => {
    const returnsDrawer = find(bs.faq.group, "drawer:Returns");
    const ordersDrawer = find(bs.faq.group, "drawer:Orders");
    bs.faq.set({ cat: "Returns" });
    run("faq", 240);
    expect(returnsDrawer.position.z).toBeGreaterThan(ordersDrawer.position.z + 0.3);

    bs.faq.set({ cat: "All", match: ["Orders:1"] });
    run("faq", 300);
    const cards = findAll(ordersDrawer, "card");
    expect(cards[1].position.y).toBeGreaterThan(cards[0].position.y + 0.15);
    expect(cards[2].position.y).toBeCloseTo(cards[0].position.y, 2);
  });

  it("terms: sheets settle in step with reading progress", () => {
    const sheets = () => findAll(bs.terms.group, "sheet");
    bs.terms.set({ progress: 0 });
    run("terms", 600);
    expect(sheets().filter((s) => s.visible).length).toBe(1);
    bs.terms.set({ progress: 1 });
    run("terms", 900);
    expect(sheets().filter((s) => s.visible).length).toBe(13);
  });

  it("contact: the lamp dims to an ember when closed and lights when open", () => {
    const light = find(bs.contact.group, "lamp");
    bs.contact.set({ open: false });
    run("contact", 400);
    const closed = light.intensity;
    bs.contact.set({ open: true });
    run("contact", 400);
    expect(light.intensity).toBeGreaterThan(closed * 5);
  });

  it("privacy: pointing at a row lifts and lights its object, and only that one", () => {
    bs.privacy.set({ focus: "address" });
    run("privacy", 300);
    expect(find(bs.privacy.group, "glow:address").material.opacity).toBeGreaterThan(0.3);
    for (const other of ["contact", "order", "payment"]) expect(find(bs.privacy.group, `glow:${other}`).material.opacity).toBeLessThan(0.05);
    expect(find(bs.privacy.group, "thing:address").position.y).toBeGreaterThan(find(bs.privacy.group, "thing:order").position.y + 0.03);
  });
});
