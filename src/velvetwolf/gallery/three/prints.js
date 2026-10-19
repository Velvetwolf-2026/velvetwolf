// Print artwork, drawn in white on transparent canvases. The decal material tints it with
// the ink colour, so one texture serves every colorway.
import * as THREE from 'three';
import { PRINT_AREAS } from './garment.js';
import { makeCanvas, trackedWidth, drawTracked } from './textures.js';

const DISPLAY = 'Unbounded, "Arial Black", sans-serif';
const BODY = 'Manrope, "Helvetica Neue", Arial, sans-serif';

export function areaCanvas(side) {
  const a = PRINT_AREAS[side];
  return makeCanvas(Math.round((a.x1 - a.x0) * a.px), Math.round((a.y1 - a.y0) * a.px));
}

// garment units -> canvas pixels
function U(side) {
  const a = PRINT_AREAS[side];
  return {
    x: (x) => (x - a.x0) * a.px,
    y: (y) => (a.y1 - y) * a.px,
    s: (s) => s * a.px,
  };
}

function fitText(ctx, text, weight, family, width, trackingEm) {
  let size = 100;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = trackedWidth(ctx, text, trackingEm * size);
  size = (size * width) / w;
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function line(ctx, text, weight, family, cx, cy, width, trackingEm = 0.2) {
  const size = fitText(ctx, text, weight, family, width, trackingEm);
  ctx.textBaseline = 'middle';
  drawTracked(ctx, text, cx, cy, trackingEm * size);
  return size;
}

export const DESIGNS = {
  wordmark: { side: 'front', label: 'Wordmark', draw(ctx, u) {
    line(ctx, 'VELVETWOLF', 500, DISPLAY, u.x(0), u.y(0.5), u.s(0.36), 0.24);
  } },
  wordmarkSmall: { side: 'front', label: 'Small wordmark', draw(ctx, u) {
    line(ctx, 'VELVETWOLF', 500, DISPLAY, u.x(0), u.y(0.55), u.s(0.2), 0.26);
  } },
  monogram: { side: 'front', label: 'Monogram', draw(ctx, u) {
    const cx = u.x(0), cy = u.y(0.47), r = u.s(0.105);
    ctx.lineWidth = u.s(0.0045);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    line(ctx, 'VW', 400, DISPLAY, cx + u.s(0.004), cy + u.s(0.003), r * 1.04, 0.04);
    line(ctx, 'VELVETWOLF', 600, BODY, cx, cy + r + u.s(0.04), u.s(0.12), 0.32);
  } },
  horizon: { side: 'front', label: 'Horizon', draw(ctx, u) {
    const y = u.y(0.42);
    ctx.lineWidth = u.s(0.004);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(u.x(-0.19), y); ctx.lineTo(u.x(0.19), y); ctx.stroke();
    ctx.beginPath(); ctx.arc(u.x(0), y - u.s(0.006), u.s(0.07), Math.PI, 0); ctx.stroke();
    line(ctx, 'HORIZON  ·  VELVETWOLF', 600, BODY, u.x(0), y + u.s(0.045), u.s(0.2), 0.3);
  } },
  contour: { side: 'front', label: 'Contour', draw(ctx, u) {
    const cx = u.x(0.02), cy = u.y(0.43);
    ctx.lineWidth = u.s(0.0032);
    for (let k = 0; k < 10; k++) {
      const r0 = u.s(0.022 + k * 0.024);
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const r = r0 * (1 + 0.1 * Math.sin(3 * a + k * 0.55) + 0.05 * Math.sin(5 * a - k * 0.8) + 0.03 * Math.cos(2 * a + k));
        const px = cx + Math.cos(a) * r * 1.12, py = cy + Math.sin(a) * r * 0.86;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
  } },
  nocturne: {
    side: 'back',
    label: 'Spider-Man',
    fullColor: true,
    draw(ctx, u, onUpdate) {
      const img = getSp1Img(onUpdate);
      if (img && img.complete && img.naturalWidth > 0) {
        const cx = u.x(0);
        const cy = u.y(0.16);
        const h = u.s(0.96);
        const aspect = img.naturalWidth / img.naturalHeight;
        const w = h * aspect;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      }
    },
  },
  statement: { side: 'back', label: 'Statement', draw(ctx, u) {
    const size = fitText(ctx, 'STATEMENTS', 300, DISPLAY, u.s(0.62), 0.12);
    ctx.textBaseline = 'middle';
    drawTracked(ctx, 'STATEMENTS', u.x(0), u.y(0.56), 0.12 * size);
    drawTracked(ctx, 'IN SILENCE', u.x(0), u.y(0.56) + size * 1.12, 0.12 * size);
  } },
  note: { side: 'front', label: 'Note', draw(ctx, u) {
    line(ctx, 'NOTE', 400, DISPLAY, u.x(0), u.y(0.54), u.s(0.12), 0.3);
    ctx.fillRect(u.x(-0.05), u.y(0.505), u.s(0.1), u.s(0.003));
    line(ctx, 'DROP 02', 600, BODY, u.x(0), u.y(0.475), u.s(0.07), 0.34);
  } },
};

let sp1Img = null;
function getSp1Img(onLoad) {
  if (typeof Image === 'undefined') return null;
  if (!sp1Img) {
    sp1Img = new Image();
    sp1Img.crossOrigin = 'anonymous';
    // Transparent cutout (WebP with alpha, 140 KB instead of the 930 KB PNG) for a crisp print on the fabric; sp1.webp as fallback
    sp1Img.src = '/sp1_nobg.webp';
    sp1Img.onerror = () => {
      if (sp1Img.src.endsWith('/sp1_nobg.webp')) {
        sp1Img.src = '/sp1.webp';
      }
    };
  }
  if (sp1Img.complete && sp1Img.naturalWidth > 0) return sp1Img;
  if (onLoad) {
    sp1Img.addEventListener('load', onLoad, { once: true });
  }
  return sp1Img;
}

function canvasTexture(canvas, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

// Cache of product print textures, keyed by design id.
export function createPrintLibrary(aniso = 8) {
  const cache = new Map();
  function draw(id) {
    const d = DESIGNS[id];
    const entry = cache.get(id);
    const ctx = entry.canvas.getContext('2d');
    ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    d.draw(ctx, U(d.side), () => {
      ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
      ctx.fillStyle = ctx.strokeStyle = '#fff';
      d.draw(ctx, U(d.side));
      entry.texture.needsUpdate = true;
    });
    entry.texture.needsUpdate = true;
  }
  return {
    get(id) {
      if (!id || !DESIGNS[id]) return null;
      if (!cache.has(id)) {
        const canvas = areaCanvas(DESIGNS[id].side);
        cache.set(id, { canvas, texture: canvasTexture(canvas, aniso) });
        draw(id);
      }
      return cache.get(id).texture;
    },
    redrawAll() { for (const id of cache.keys()) draw(id); },
  };
}

// ---------- custom prints (Studio + home teaser) ----------
// Size M is 72 cm long and the tee is 1.955 scene units tall, so one unit is about 36.8 cm of cloth.
export const CM_PER_UNIT = 72 / 1.955;

// SVGs without width/height report 0, so fall back to a sensible raster size
export function imageSize(img) {
  return [img.naturalWidth || img.width || 1000, img.naturalHeight || img.height || 1000];
}

// How big an uploaded image is drawn on the print area, in canvas px and printed cm,
// and the resolution it would print at (pixels per inch of cloth).
export function imageFit(side, img, scale = 1) {
  const a = PRINT_AREAS[side];
  const W = Math.round((a.x1 - a.x0) * a.px);
  const [iw, ih] = imageSize(img);
  const box = 0.56 * a.px * scale;
  const r = Math.min(box / iw, box / ih, (W * 0.96) / iw);
  const w = Math.max(1, Math.round(iw * r)), h = Math.max(1, Math.round(ih * r));
  const cmW = (w / a.px) * CM_PER_UNIT, cmH = (h / a.px) * CM_PER_UNIT;
  return { w, h, cmW, cmH, dpi: iw / (cmW / 2.54) };
}
export function createCustomPrint(side, aniso = 8) {
  const canvas = areaCanvas(side);
  const texture = canvasTexture(canvas, aniso);
  return { side, canvas, texture };
}

let scratch = null;
function getScratch() {
  if (!scratch && typeof document !== 'undefined') {
    scratch = makeCanvas(8, 8);
  }
  return scratch;
}

function monoFromLuminance(img, w, h) {
  const sc = getScratch();
  if (!sc) return null;
  sc.width = w; sc.height = h;
  const ctx = sc.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const lum = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
    const a = (p[i + 3] / 255) * Math.min(1, Math.max(0, (0.92 - lum) / 0.6));
    p[i] = p[i + 1] = p[i + 2] = 255;
    p[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(data, 0, 0);
  return scratch;
}

/**
 * state: { mode: 'text'|'image'|'mark', text, font: 'display'|'body', scale, offset,
 *          image, oneInk, mark, guide }
 */
export function drawCustom(print, state) {
  const { canvas, side } = print;
  const ctx = canvas.getContext('2d');
  const u = U(side);
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  const anchorY = side === 'front' ? 0.42 : 0.4;
  const cy = u.y(anchorY + (state.offset || 0) * 0.32);
  const scale = state.scale || 1;
  let used = false;

  if (state.mode === 'text' && state.text && state.text.trim()) {
    const lines = state.text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);
    const family = state.font === 'body' ? BODY : DISPLAY;
    const weight = state.font === 'body' ? 700 : 400;
    let size = u.s(0.075) * scale;
    ctx.font = `${weight} ${size}px ${family}`;
    const tracking = state.font === 'body' ? 0.04 : 0.08;
    const widest = Math.max(...lines.map((l) => trackedWidth(ctx, l.toUpperCase(), tracking * size)));
    const maxW = W * 0.9;
    if (widest > maxW) size *= maxW / widest;
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textBaseline = 'middle';
    const lh = size * 1.18;
    const top = cy - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => drawTracked(ctx, l.toUpperCase(), W / 2, top + i * lh, tracking * size));
    used = true;
  } else if (state.mode === 'image' && state.image) {
    const img = state.image;
    const { w, h } = imageFit(side, img, scale);
    const src = state.oneInk ? monoFromLuminance(img, w, h) : img;
    ctx.drawImage(src, W / 2 - w / 2, cy - h / 2, w, h);
    used = true;
  } else if (state.mode === 'mark' && state.mark && DESIGNS[state.mark]) {
    const d = DESIGNS[state.mark];
    const tmp = areaCanvas(d.side);
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = tctx.strokeStyle = '#fff';
    d.draw(tctx, U(d.side));
    // re-centre the mark on the chosen anchor and scale it
    const bounds = alphaBounds(tctx, tmp.width, tmp.height);
    if (bounds) {
      const bw = bounds.x1 - bounds.x0, bh = bounds.y1 - bounds.y0;
      const kk = Math.min(scale * 1.2, (W * 0.92) / bw, (H * 0.92) / bh);
      ctx.drawImage(tmp, bounds.x0, bounds.y0, bw, bh, W / 2 - (bw * kk) / 2, cy - (bh * kk) / 2, bw * kk, bh * kk);
      used = true;
    }
  }

  if (state.guide) {
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.restore();
  }
  print.texture.needsUpdate = true;
  return used;
}

function alphaBounds(ctx, w, h) {
  const p = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (p[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0: Math.max(0, x0 - 4), y0: Math.max(0, y0 - 4), x1: Math.min(w, x1 + 4), y1: Math.min(h, y1 + 4) };
}
