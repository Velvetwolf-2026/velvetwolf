// Shop by gender: ALL · MEN · WOMEN (GenderToggle, ShopPage). A product's
// gender comes from the admin panel (products.gender, mirrored to style).
// Unisex tees fit everyone, so they show under MEN and under WOMEN too; a
// product without the field (older API, offline fallback list) counts as Unisex.

export const GENDER_CHOICES = [
  ["all", "All"],
  ["men", "Men"],
  ["women", "Women"],
];

const FROM_STYLE = { "Men's Fit": "Men", "Women's Fit": "Women" };

export function genderOf(product) {
  const g = String(product?.gender || FROM_STYLE[product?.style] || "Unisex").toLowerCase();
  return g === "men" || g === "women" ? g : "unisex";
}

// "men" | "women" from a URL value; anything else means all
export function parseGender(value) {
  const v = String(value || "").toLowerCase();
  return v === "men" || v === "women" ? v : "all";
}

export function matchesGender(product, choice) {
  if (choice !== "men" && choice !== "women") return true;
  const g = genderOf(product);
  return g === "unisex" || g === choice;
}
