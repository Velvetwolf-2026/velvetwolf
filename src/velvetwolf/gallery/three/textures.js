import * as THREE from 'three';
import { rng } from './util.js';

export function makeCanvas(w, h) {
  if (typeof document === 'undefined') {
    return { width: w, height: h, getContext: () => null };
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Tileable value noise (grayscale) for stone, concrete and fibre variation.
function valueNoise(size, cells, octaves, seed) {
  const out = new Float32Array(size * size);
  const r = rng(seed);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * n, y0 = Math.floor(gy), fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * n, x0 = Math.floor(gx), fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const a = grid[(y0 % n) * n + (x0 % n)], b = grid[(y0 % n) * n + ((x0 + 1) % n)];
        const c = grid[((y0 + 1) % n) * n + (x0 % n)], d = grid[((y0 + 1) % n) * n + ((x0 + 1) % n)];
        out[y * size + x] += amp * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
      }
    }
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function grayTexture(size, data, lo, hi, repeat) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < data.length; i++) {
    const v = Math.round((lo + (hi - lo) * data[i]) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function stoneTexture() {
  return grayTexture(256, valueNoise(256, 4, 5, 11), 0.15, 1, [1, 1]);
}

export function concreteTexture() {
  return grayTexture(256, valueNoise(256, 8, 4, 23), 0.55, 0.95, [36, 8]);
}

// Single-jersey knit: columns of V-shaped loops plus slub noise.
export function knitTexture(maxAniso = 8) {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(0, 0, size, size);
  const col = 8, row = 6;
  for (let y = -row; y < size + row; y += row) {
    for (let x = 0; x < size; x += col) {
      const g = ctx.createLinearGradient(x, 0, x + col, 0);
      g.addColorStop(0, '#5a5a5a');
      g.addColorStop(0.5, '#c8c8c8');
      g.addColorStop(1, '#5a5a5a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x + col * 0.3, y + row * 0.5, col * 0.24, row * 0.62, -0.45, 0, Math.PI * 2);
      ctx.ellipse(x + col * 0.7, y + row * 0.5, col * 0.24, row * 0.62, 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const noise = valueNoise(size, 16, 3, 7);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < noise.length; i++) {
    const k = (noise[i] - 0.5) * 18;
    img.data[i * 4] = Math.max(0, Math.min(255, img.data[i * 4] + k));
    img.data[i * 4 + 1] = img.data[i * 4 + 2] = img.data[i * 4];
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 19);
  t.anisotropy = maxAniso;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function radialTexture(stops, size = 256) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Wall lettering, redrawn when the text changes (e.g. product name in the viewing room).
export function wallLettering(width = 2048, height = 512) {
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  let last = '';
  function draw(text, weight = 200) {
    last = text;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 300;
    ctx.font = `${weight} ${size}px Unbounded, sans-serif`;
    const w = trackedWidth(ctx, text, 0.12 * size);
    if (w > width * 0.94) size *= (width * 0.94) / w;
    ctx.font = `${weight} ${size}px Unbounded, sans-serif`;
    drawTracked(ctx, text, width / 2, height / 2, 0.12 * size);
    tex.needsUpdate = true;
  }
  return { canvas: c, texture: tex, draw, redraw: () => draw(last) };
}

export function trackedWidth(ctx, text, tracking) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - tracking;
}

// Draws text with manual letter-spacing, centred on (cx, cy).
export function drawTracked(ctx, text, cx, cy, tracking) {
  const total = trackedWidth(ctx, text, tracking);
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  let x = cx - total / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, cy);
    x += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = align;
}

// ---- back of house (help pages) ----

// A small exhibit tag: dark plate, Bone lettering, a gold rule when it's the active one. Redraws
// when the text or state changes; returns the plate's aspect so the sprite keeps its proportions.
export function exhibitTag(text, { width = 512, height = 160 } = {}) {
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let state = null;
  function draw(label = text, active = false) {
    state = [label, active];
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(20, 20, 22, 0.86)';
    ctx.fillRect(0, 18, width, height - 52);
    ctx.strokeStyle = active ? '#F0D9A2' : 'rgba(232, 228, 218, 0.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 19.5, width - 3, height - 55);
    // the little pointer under the plate
    ctx.beginPath();
    ctx.moveTo(width / 2 - 14, height - 34); ctx.lineTo(width / 2, height - 14); ctx.lineTo(width / 2 + 14, height - 34);
    ctx.fillStyle = 'rgba(20, 20, 22, 0.86)'; ctx.fill();
    ctx.fillStyle = active ? '#F0D9A2' : '#E8E4DA';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 52px Manrope, sans-serif';
    ctx.fillText(label, width / 2, 19 + (height - 52) / 2);
    tex.needsUpdate = true;
  }
  draw();
  return { texture: tex, aspect: width / height, draw, redraw: () => state && draw(...state) };
}

// A floor ruler in business days: ticks, numerals and a gold centre line, on a clear ground.
export function dayRuler(days = 14, { width = 2048, height = 256 } = {}) {
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const pad = 40, span = width - pad * 2;
    ctx.fillStyle = '#C9A84C';
    ctx.fillRect(pad, height * 0.18 - 3, span, 6);
    ctx.fillStyle = 'rgba(232, 228, 218, 0.62)';
    for (let i = 0; i <= days * 4; i++) {
      const x = pad + (span * i) / (days * 4);
      const major = i % 4 === 0;
      ctx.fillRect(x - (major ? 2 : 1), height * 0.18 + 6, major ? 4 : 2, major ? 56 : 30);
    }
    ctx.fillStyle = 'rgba(232, 228, 218, 0.75)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '300 92px Unbounded, sans-serif';
    for (let d = 0; d <= days; d++) ctx.fillText(String(d), pad + (span * d) / days, height * 0.72);
    tex.needsUpdate = true;
  }
  draw();
  return { texture: tex, draw, pad: 40 / width };
}

// The side of a ream of paper: fine sheet lines.
export function paperEdgeTexture() {
  const c = makeCanvas(64, 256);
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#E8E4DA';
    ctx.fillRect(0, 0, 64, 256);
    const r = rng(11);
    for (let y = 0; y < 256; y += 2 + Math.floor(r() * 2)) {
      ctx.fillStyle = `rgba(20, 20, 22, ${0.06 + r() * 0.12})`;
      ctx.fillRect(0, y, 64, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
