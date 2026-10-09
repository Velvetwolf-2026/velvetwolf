// Gallery data. Real products come from the API; this file only holds the five
// colorways and the "house" designs the 3D engine uses to dress its decorative
// exhibits (hero, colorway room, cloth close-up). None of the
// house pieces are sold as products.

// The five dyes every VelvetWolf tee comes in. `site` is the colour name the
// products API uses (product.colors / "Colour::url" image keys).
export const COLORWAYS = {
  noir:    { id: 'noir',    name: 'Noir',    site: 'Black',         hex: '#141416', ink: '#E8E4DA' },
  bone:    { id: 'bone',    name: 'Bone',    site: 'White',         hex: '#E8E4DA', ink: '#141416' },
  sand:    { id: 'sand',    name: 'Sand',    site: 'Beige/Sand',    hex: '#C9B99B', ink: '#141416' },
  forest:  { id: 'forest',  name: 'Forest',  site: 'Forest Green',  hex: '#2E4636', ink: '#E8E4DA' },
  crimson: { id: 'crimson', name: 'Crimson', site: 'Crimson Ember', hex: '#7E2230', ink: '#E8E4DA' },
};
export const COLOR_ORDER = ['noir', 'bone', 'sand', 'forest', 'crimson'];

// House designs (print artwork lives in three/prints.js).
const HOUSE_PIECES = [
  { id: 'nocturne', color: 'noir', front: 'wordmarkSmall', back: 'nocturne' },
  { id: 'essential', color: 'noir', front: null, back: null },
  { id: 'silence', color: 'noir', front: 'wordmark', back: null },
  { id: 'horizon', color: 'sand', front: 'horizon', back: null },
  { id: 'monogram', color: 'forest', front: 'monogram', back: null },
];

export const SIZES = [
  { id: 'S',   chest: 108, length: 70, sleeve: 22 },
  { id: 'M',   chest: 114, length: 72, sleeve: 23 },
  { id: 'L',   chest: 120, length: 74, sleeve: 24 },
  { id: 'XL',  chest: 126, length: 76, sleeve: 25 },
  { id: 'XXL', chest: 132, length: 78, sleeve: 26 },
];

export const STUDIO_PRICE = 2290;
export const STUDIO_BOTH_SIDES = 300;

export const productById = (id) => HOUSE_PIECES.find((p) => p.id === id);
