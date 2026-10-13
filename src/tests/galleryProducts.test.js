import { describe, it, expect } from "vitest";
import { photoFor, colorwaysOf, newestDrops, fromPrice, productHref, money } from "../velvetwolf/gallery/galleryProducts";
import { isGalleryPath } from "../velvetwolf/gallery/galleryContext";

// Shaped like a real product from the products API.
const tee = {
  id: "p1",
  slug: "rule-the-game-oversized-tee",
  name: "Rule The Game Oversized Tee",
  price: 599,
  colors: ["Black", "White", "Beige/Sand", "Forest Green", "Crimson Ember"],
  image: "Black::https://cdn.example/black-front.jpg",
  images: [
    "Black::https://cdn.example/black-front.jpg",
    "White::https://cdn.example/white-front.jpg",
    "Forest Green::https://cdn.example/forest-front.jpg",
  ],
};

describe("photoFor", () => {
  it("returns the photo for the requested colorway", () => {
    expect(photoFor(tee, "bone")).toBe("https://cdn.example/white-front.jpg");
    expect(photoFor(tee, "forest")).toBe("https://cdn.example/forest-front.jpg");
  });

  it("falls back to the main image when a colorway has no photo", () => {
    expect(photoFor(tee, "crimson")).toBe("https://cdn.example/black-front.jpg");
    expect(photoFor(tee, null)).toBe("https://cdn.example/black-front.jpg");
  });

  it("handles plain URLs and missing images", () => {
    expect(photoFor({ image: "https://cdn.example/plain.jpg" }, "noir")).toBe("https://cdn.example/plain.jpg");
    expect(photoFor({ images: [] }, "noir")).toBeNull();
  });
});

describe("colorwaysOf", () => {
  it("maps the API colour names onto the five colorways, in gallery order", () => {
    expect(colorwaysOf(tee)).toEqual(["noir", "bone", "sand", "forest", "crimson"]);
    expect(colorwaysOf({ colors: ["Crimson Ember", "black"] })).toEqual(["noir", "crimson"]);
  });

  it("defaults to Noir when no colour matches", () => {
    expect(colorwaysOf({ colors: ["#0a0a0a"] })).toEqual(["noir"]);
    expect(colorwaysOf({})).toEqual(["noir"]);
  });
});

describe("newestDrops / fromPrice / productHref", () => {
  const list = [
    { id: "n1", price: 799 },
    { id: "n2", price: 599, isActive: false },
    { id: "n3", price: 999 },
    { id: "n4", price: 1299 },
  ];

  it("takes the newest active products (the API returns newest first)", () => {
    expect(newestDrops(list, 3).map((p) => p.id)).toEqual(["n1", "n3", "n4"]);
    expect(newestDrops(null)).toEqual([]);
  });

  it("finds the lowest price", () => {
    expect(fromPrice(list)).toBe(599);
    expect(fromPrice([])).toBeNull();
  });

  it("links by slug, falling back to id", () => {
    expect(productHref(tee)).toBe("/product/rule-the-game-oversized-tee");
    expect(productHref({ id: "abc" })).toBe("/product/abc");
  });

  it("formats rupees", () => {
    expect(money(1299)).toBe("₹1,299");
  });
});

describe("isGalleryPath", () => {
  it("covers home, shop, studio and auth pages; product pages use photos, not 3D", () => {
    expect(isGalleryPath("/")).toBe(true);
    expect(isGalleryPath("/shop")).toBe(true);
    expect(isGalleryPath("/shop/anime")).toBe(true);
    expect(isGalleryPath("/shopping-policy")).toBe(false);
    expect(isGalleryPath("/product/x")).toBe(false);
    expect(isGalleryPath("/custom")).toBe(true);
    expect(isGalleryPath("/login")).toBe(true);
    expect(isGalleryPath("/signup")).toBe(true);
    expect(isGalleryPath("/faq")).toBe(false);
  });
});
