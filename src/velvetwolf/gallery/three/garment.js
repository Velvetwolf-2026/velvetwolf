// Procedural oversized tee. Stand-in for the production GLB: same role, same API surface
// (setColor / setInk / setPrint), so swapping in the optimised GLB only touches buildKit().
import * as THREE from 'three';
import { clamp, smoothstep } from './util.js';

// ---------- silhouette ----------
function quad(p0, c, p1, n = 14) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
  }
  return out;
}

function rightHalf() {
  const R = [];
  let p = [0, 0.9];
  R.push(p);
  const Q = (c, e, n) => { R.push(...quad(p, c, e, n)); p = e; };
  const L = (e) => { R.push(e); p = e; };
  Q([0.17, 0.9], [0.26, 0.955], 16);      // back neckline
  L([0.8, 0.865]);                          // shoulder slope
  Q([0.865, 0.855], [0.9, 0.81], 8);       // dropped shoulder point
  L([1.31, 0.43]);                          // sleeve top
  Q([1.355, 0.385], [1.32, 0.35], 8);      // sleeve corner
  L([1.0, 0.06]);                           // sleeve opening
  Q([0.965, 0.03], [0.935, 0.065], 6);     // inner sleeve corner
  L([0.8, 0.21]);                           // underarm into armpit
  L([0.81, -0.95]);                         // side seam
  Q([0.815, -0.996], [0.76, -0.996], 8);   // hem corner
  Q([0.4, -1.006], [0, -1.0], 16);         // hem
  return R;
}

function resample(points, n) {
  const lens = [0];
  for (let i = 1; i <= points.length; i++) {
    const a = points[i - 1], b = points[i % points.length];
    lens.push(lens[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lens[lens.length - 1];
  const out = new Float32Array(n * 2);
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (lens[seg + 1] < d) seg++;
    const a = points[seg], b = points[(seg + 1) % points.length];
    const t = (d - lens[seg]) / (lens[seg + 1] - lens[seg] || 1);
    out[k * 2] = a[0] + (b[0] - a[0]) * t;
    out[k * 2 + 1] = a[1] + (b[1] - a[1]) * t;
  }
  return out;
}

export function teeOutline(n = 560) {
  const R = rightHalf();
  const L = R.slice(1, -1).reverse().map(([x, y]) => [-x, y]);
  return resample([...R, ...L], n);
}

export const OUTLINE = teeOutline();

function pip(x, y, P) {
  let inside = false;
  const n = P.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = P[i * 2], yi = P[i * 2 + 1], xj = P[j * 2], yj = P[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Openings (hem and sleeve ends) get a crisp edge; closed seams get a rounded one.
function openingMask(P) {
  const n = P.length / 2, m = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = P[i * 2], y = P[i * 2 + 1], ax = Math.abs(x);
    const hem = y < -0.955 && ax < 0.78;
    // sleeve opening runs from (1.32, 0.35) to (1.0, 0.06)
    const t = clamp(((ax - 1.0) * 0.32 + (y - 0.06) * 0.29) / (0.32 * 0.32 + 0.29 * 0.29), 0, 1);
    const sx = 1.0 + 0.32 * t, sy = 0.06 + 0.29 * t;
    const sleeve = ax > 0.99 && Math.hypot(ax - sx, y - sy) < 0.012 && t > 0.04 && t < 0.96;
    m[i] = hem || sleeve ? 1 : 0;
  }
  return m;
}
const OPEN = openingMask(OUTLINE);

const _closest = [0, 0];
const _split = [0, 0]; // [distance to openings, distance to closed seams]
function distToOutline(x, y, P) {
  let best = 1e9, bo = 1e9, bc = 1e9;
  const n = P.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = P[i * 2], ay = P[i * 2 + 1];
    const j = (i + 1) % n;
    const dx = P[j * 2] - ax, dy = P[j * 2 + 1] - ay;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    const qx = ax + dx * t, qy = ay + dy * t;
    const d2 = (x - qx) ** 2 + (y - qy) ** 2;
    if (d2 < best) { best = d2; _closest[0] = qx; _closest[1] = qy; }
    if (OPEN[i] && OPEN[j]) { if (d2 < bo) bo = d2; } else if (d2 < bc) bc = d2;
  }
  _split[0] = Math.sqrt(bo); _split[1] = Math.sqrt(bc);
  return Math.sqrt(best);
}

// ---------- volume ----------
// Seam plane: the whole garment wraps around a body and the sleeves sweep back.
export function seamZ(x) {
  const ax = Math.abs(x);
  return -0.11 * x * x - 0.2 * smoothstep(0.78, 1.36, ax) * (ax - 0.78);
}

// Half-thickness of the garment at (x, y), d = distance to the seam outline.
function thickness(x, y, d, side) {
  const [dOpen, dSeam] = _split;
  const T = 0.1;
  const openW = 1 - smoothstep(0.02, 0.2, dOpen);
  const De = 0.11 - 0.075 * openW;
  const e = T * Math.sqrt(Math.max(0, 1 - (1 - Math.min(d / De, 1)) ** 2));
  const ax = Math.abs(x);
  const W = 0.8 + 0.34 * smoothstep(0.15, 0.62, y);
  const ell = Math.sqrt(Math.max(0, 1 - Math.min(ax / W, 1) ** 2));
  const crisp = smoothstep(0, 0.055, dOpen);
  const taper = smoothstep(0, 0.4, dSeam) * crisp;
  const chest = side > 0 ? 1 + 0.12 * smoothstep(0.05, 0.5, y) * (1 - smoothstep(0.55, 0.85, y)) : 0.88;
  const body = 0.2 * ell * taper * chest;
  const sleeveMask = smoothstep(0.84, 1.0, ax) * smoothstep(-0.05, 0.2, y);
  const sleeve = 0.055 * sleeveMask * smoothstep(0, 0.15, dSeam) * crisp;
  const folds =
    (0.012 * Math.sin(x * 7 + Math.sin(y * 2.1 + side) * 1.8) * smoothstep(0.15, -0.95, y) +
      0.007 * Math.sin(y * 13 + x * 4 + side * 2) * sleeveMask +
      0.004 * Math.sin(x * 19 + y * 5 + side)) * taper;
  return e + body + sleeve + folds;
}

export function surfaceZ(x, y, side) {
  if (!pip(x, y, OUTLINE)) return seamZ(x);
  const d = distToOutline(x, y, OUTLINE);
  return seamZ(x) + side * thickness(x, y, d, side);
}

// ---------- geometry ----------
const BOX = { x0: -1.42, x1: 1.42, y0: -1.04, y1: 1.0 };

function uvOf(x, y) {
  return [(x - BOX.x0) / (BOX.x1 - BOX.x0), (y - BOX.y0) / (BOX.y1 - BOX.y0)];
}

export function buildBodyGeometry(step = 0.028) {
  const P = OUTLINE;
  const nx = Math.ceil((BOX.x1 - BOX.x0) / step) + 1;
  const ny = Math.ceil((BOX.y1 - BOX.y0) / step) + 1;
  const N = nx * ny;
  const inside = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) inside[j * nx + i] = pip(BOX.x0 + i * step, BOX.y0 + j * step, P) ? 1 : 0;

  const used = new Uint8Array(N);
  const cells = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
      if (inside[a] | inside[b] | inside[c] | inside[d]) {
        cells.push(a);
        used[a] = used[b] = used[c] = used[d] = 1;
      }
    }
  }

  const pos = [], uv = [];
  const fIdx = new Int32Array(N).fill(-1), bIdx = new Int32Array(N).fill(-1);
  const px = new Float32Array(N), py = new Float32Array(N);
  let count = 0;
  const push = (x, y, z) => { pos.push(x, y, z); uv.push(...uvOf(x, y)); return count++; };

  for (let k = 0; k < N; k++) {
    if (!used[k]) continue;
    let x = BOX.x0 + (k % nx) * step, y = BOX.y0 + Math.floor(k / nx) * step;
    const d = distToOutline(x, y, P);
    if (!inside[k] || d < step * 0.2) {
      x = _closest[0]; y = _closest[1];
      px[k] = x; py[k] = y;
      fIdx[k] = bIdx[k] = push(x, y, seamZ(x));
    } else {
      px[k] = x; py[k] = y;
      fIdx[k] = push(x, y, seamZ(x) + thickness(x, y, d, 1));
      bIdx[k] = push(x, y, seamZ(x) - thickness(x, y, d, -1));
    }
  }

  const index = [];
  const area = (a, b, c) => (px[b] - px[a]) * (py[c] - py[a]) - (px[c] - px[a]) * (py[b] - py[a]);
  const tri = (a, b, c) => {
    if (fIdx[a] === bIdx[a] && fIdx[b] === bIdx[b] && fIdx[c] === bIdx[c]) return; // flat seam sliver
    if (area(a, b, c) <= 1e-9) return; // collapsed or flipped by snapping
    index.push(fIdx[a], fIdx[b], fIdx[c]);
    index.push(bIdx[a], bIdx[c], bIdx[b]);
  };
  for (const a of cells) {
    const b = a + 1, c = a + nx + 1, d = a + nx;
    // pick the diagonal that keeps triangles fatter near the seam
    if (inside[a] && inside[c]) { tri(a, b, c); tri(a, c, d); }
    else { tri(a, b, d); tri(b, c, d); }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// Print areas in garment units (1 unit is roughly 37 cm on a size M).
export const PRINT_AREAS = {
  front: { x0: -0.46, x1: 0.46, y0: -0.44, y1: 0.74, px: 800 },
  back: { x0: -0.52, x1: 0.52, y0: -0.44, y1: 0.8, px: 800 },
};

export function buildDecalGeometry(side) {
  const a = PRINT_AREAS[side];
  const s = side === 'front' ? 1 : -1;
  const sx = 40, sy = 52;
  const pos = [], uv = [], index = [];
  for (let j = 0; j <= sy; j++) {
    for (let i = 0; i <= sx; i++) {
      const u = i / sx, v = j / sy;
      const x = a.x0 + (a.x1 - a.x0) * u, y = a.y0 + (a.y1 - a.y0) * v;
      pos.push(x, y, surfaceZ(x, y, s) + s * 0.0035);
      uv.push(s > 0 ? u : 1 - u, v);
    }
  }
  for (let j = 0; j < sy; j++) {
    for (let i = 0; i < sx; i++) {
      const a0 = j * (sx + 1) + i, b0 = a0 + 1, c0 = a0 + sx + 2, d0 = a0 + sx + 1;
      if (s > 0) index.push(a0, b0, c0, a0, c0, d0);
      else index.push(a0, c0, b0, a0, d0, c0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function backNeckY(x) {
  let lo = 0.75, hi = 1.0;
  for (let i = 0; i < 22; i++) {
    const m = (lo + hi) / 2;
    if (pip(x, m, OUTLINE)) lo = m; else hi = m;
  }
  return lo;
}

const NECK_HALF = 0.255;
const frontNeck = (t) => {
  const u = 1 - t;
  return [-NECK_HALF + 2 * NECK_HALF * t, u * u * 0.952 + 2 * u * t * 0.67 + t * t * 0.952];
};

export function buildNeckGeometries() {
  // front rib follows the scooped front neckline across the chest surface
  const fp = [];
  for (let i = 0; i <= 28; i++) {
    const [x, y] = frontNeck(i / 28);
    fp.push(new THREE.Vector3(x, y, surfaceZ(x, y, 1) + 0.008));
  }
  const ribFront = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 72, 0.019, 10, false);

  // back rib sits on the seam along the back neckline
  const bp = [];
  for (let i = 0; i <= 24; i++) {
    const x = -NECK_HALF + (2 * NECK_HALF * i) / 24;
    bp.push(new THREE.Vector3(x, backNeckY(x) - 0.016, seamZ(x)));
  }
  const ribBack = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 64, 0.021, 10, false);

  // the visible inside of the back, between the two necklines
  const cols = 26, rows = 7, pos = [], index = [];
  for (let i = 0; i <= cols; i++) {
    const [x, yl] = frontNeck(i / cols);
    const yu = backNeckY(x) - 0.004;
    for (let k = 0; k <= rows; k++) {
      const y = yl + (yu - yl) * (k / rows);
      // painted just above the front surface; the dark tone reads as the opening
      pos.push(x, y, surfaceZ(x, y, 1) + 0.003);
    }
  }
  for (let i = 0; i < cols; i++) {
    for (let k = 0; k < rows; k++) {
      const a = i * (rows + 1) + k, b = a + rows + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const patch = new THREE.BufferGeometry();
  patch.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  patch.setIndex(index);
  patch.computeVertexNormals();
  return { ribFront, ribBack, patch };
}

// ---------- kit + instances ----------
export function buildKit({ step = 0.028, knit } = {}) {
  return {
    body: buildBodyGeometry(step),
    decalFront: buildDecalGeometry('front'),
    decalBack: buildDecalGeometry('back'),
    ...buildNeckGeometries(),
    knit,
    blank: (() => {
      const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
      t.needsUpdate = true;
      return t;
    })(),
  };
}

const _c = new THREE.Color();

export class Garment {
  constructor(kit, { color = '#141416', ink = '#E8E4DA', castShadow = false } = {}) {
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    this.targetColor = new THREE.Color(color);
    this.targetInk = new THREE.Color(ink);

    const glb = kit.type === 'glb';
    if (glb) {
      // production mesh: keep its normal map, neutralise the sheen tint so colorways stay true
      this.fabric = kit.material.clone();
      this.fabric.color = this.targetColor.clone();
      this.fabric.roughness = 0.92;
      this.fabric.metalness = 0;
      this.fabric.sheen = 1;
      this.fabric.sheenRoughness = 0.6;
      this.fabric.sheenColor = new THREE.Color(0.3, 0.3, 0.3);
      this.fabric.side = THREE.DoubleSide;
    } else {
      this.fabric = new THREE.MeshPhysicalMaterial({
        color: this.targetColor.clone(),
        roughness: 0.93,
        metalness: 0,
        sheen: 1,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color(0.28, 0.28, 0.28),
        bumpMap: kit.knit || null,
        bumpScale: 1.0,
      });
    }
    this.inside = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });

    const place = (geometry, material, matrix) => {
      const m = new THREE.Mesh(geometry, material);
      if (matrix) { m.matrixAutoUpdate = false; m.matrix.copy(matrix); }
      return m;
    };
    if (glb) {
      for (const part of kit.body) {
        const m = place(part.geometry, this.fabric, part.matrix);
        m.castShadow = castShadow;
        this.pivot.add(m);
      }
    } else {
      const body = new THREE.Mesh(kit.body, this.fabric);
      const ribF = new THREE.Mesh(kit.ribFront, this.fabric);
      const ribB = new THREE.Mesh(kit.ribBack, this.fabric);
      const patch = new THREE.Mesh(kit.patch, this.inside);
      body.castShadow = ribF.castShadow = ribB.castShadow = castShadow;
      this.pivot.add(body, ribF, ribB, patch);
    }

    this.decals = {};
    for (const side of ['front', 'back']) {
      const mat = new THREE.MeshStandardMaterial({
        map: kit.blank,
        color: this.targetInk.clone(),
        roughness: 0.78,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
      const m = glb
        ? place(kit.decals[side].geometry, mat, kit.decals[side].matrix)
        : new THREE.Mesh(side === 'front' ? kit.decalFront : kit.decalBack, mat);
      m.visible = false;
      m.renderOrder = 2;
      this.pivot.add(m);
      this.decals[side] = m;
    }
    this.fullColor = { front: false, back: false };
    this.syncInside();
  }

  setColor(hex, immediate = false) {
    this.targetColor.set(hex);
    if (immediate) { this.fabric.color.copy(this.targetColor); this.syncInside(); }
  }

  setInk(hex, immediate = false) {
    this.targetInk.set(hex);
    if (immediate) for (const s of ['front', 'back']) if (!this.fullColor[s]) this.decals[s].material.color.copy(this.targetInk);
  }

  setPrint(side, texture, { fullColor = false } = {}) {
    const m = this.decals[side];
    this.fullColor[side] = fullColor;
    if (!texture) { m.visible = false; return; }
    m.material.map = texture;
    m.material.color.copy(fullColor ? _c.set('#ffffff') : this.targetInk);
    m.visible = true;
  }

  syncInside() {
    this.inside.color.copy(this.fabric.color).multiplyScalar(0.32);
  }

  update(dt) {
    const k = 1 - Math.exp(-7 * dt);
    this.fabric.color.lerp(this.targetColor, k);
    for (const s of ['front', 'back']) {
      if (!this.fullColor[s]) this.decals[s].material.color.lerp(this.targetInk, k);
    }
    this.syncInside();
  }
}

// SVG path of the silhouette, for poster, fallbacks and cart thumbnails.
export function outlineSvgPath() {
  const P = teeOutline(140);
  let d = '';
  for (let i = 0; i < P.length / 2; i++) {
    const x = ((P[i * 2] + 1.45) * 100).toFixed(1);
    const y = ((1.05 - P[i * 2 + 1]) * 100).toFixed(1);
    d += (i ? 'L' : 'M') + x + ' ' + y;
  }
  return d + 'Z';
}
