// Live 3D product cards. Every [data-stage] element is a window onto one shared garment that is
// re-dressed per card. Two ways to show it:
//  - live:  the card is a transparent hole in the page and is drawn straight onto the fixed
//           canvas with a scissor rect (shop grid).
//  - copy:  for cards that sit on an opaque panel, the card is drawn first, then copied into a
//           small 2D canvas inside the card, before the main scene overwrites the frame.
import * as THREE from 'three';
import { Garment } from './garment.js';
import { radialTexture } from './textures.js';
import { damp } from './util.js';
import { COLORWAYS, productById } from '../data.js';

export function createStages(renderer, kit, prints) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  const garment = new Garment(kit.light || kit, {});
  scene.add(garment.group);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, '#1d1d20'], [0.55, '#141416'], [1, '#0f0f11']]),
      toneMapped: false,
      depthWrite: false,
    })
  );
  backdrop.position.z = -3;
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  scene.add(new THREE.HemisphereLight('#ffffff', '#111113', 0.55));
  const key = new THREE.DirectionalLight('#ffffff', 2.7);
  key.position.set(2.2, 3.2, 4.5);
  const rim = new THREE.DirectionalLight('#ffffff', 2.2);
  rim.position.set(-2.6, 2.2, -4);
  const low = new THREE.DirectionalLight('#ffffff', 0.5);
  low.position.set(-3, -1, 3);
  scene.add(key, rim, low);

  const states = new Map();
  // Touch screens have no hover. There, a card turns to its back as it scrolls through the
  // middle of the screen, so the back prints still get seen without a tap that opens the product.
  const noHover = matchMedia('(hover: none)');
  const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);

  function sync() {
    const live = new Set(document.querySelectorAll('[data-stage]'));
    for (const el of states.keys()) if (!live.has(el)) states.delete(el);
    let i = states.size;
    for (const el of live) {
      if (states.has(el)) continue;
      const s = { rot: 0.2, hover: false, phase: i++ * 1.3, copy: el.dataset.mode === 'copy', canvas: null, ctx: null };
      if (s.copy) {
        s.canvas = document.createElement('canvas');
        s.canvas.className = 'stage-copy';
        s.canvas.setAttribute('aria-hidden', 'true');
        el.prepend(s.canvas);
        s.ctx = s.canvas.getContext('2d');
      }
      const host = el.closest('[data-stage-host]') || el;
      host.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') s.hover = true; });
      host.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') s.hover = false; });
      host.addEventListener('focusin', () => (s.hover = true));
      host.addEventListener('focusout', () => (s.hover = false));
      states.set(el, s);
    }
  }

  function visibleRect(el, W, H) {
    if (!el.isConnected || el.offsetParent === null) return null;
    const r = el.getBoundingClientRect();
    let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
    const clipSel = el.dataset.clip;
    if (clipSel) {
      const c = document.querySelector(clipSel)?.getBoundingClientRect();
      if (c) { left = Math.max(left, c.left); top = Math.max(top, c.top); right = Math.min(right, c.right); bottom = Math.min(bottom, c.bottom); }
    }
    top = Math.max(top, 0); bottom = Math.min(bottom, H); left = Math.max(left, 0); right = Math.min(right, W);
    if (right - left < 2 || bottom - top < 2) return null;
    return { r, left, top, right, bottom };
  }

  function dress(el, s, r, dt, t, reduced, H) {
    const p = productById(el.dataset.product);
    if (!p) return false;
    const cw = COLORWAYS[el.dataset.color] || COLORWAYS[p.color];
    garment.setColor(cw.hex, true);
    garment.setInk(cw.ink, true);
    garment.setPrint('front', prints.get(p.front));
    garment.setPrint('back', prints.get(p.back));

    const idle = reduced ? 0.35 : 0.3 + Math.sin(t * 0.45 + s.phase) * 0.2;
    const centred = noHover.matches && Math.abs((r.top + r.bottom) / 2 - H * 0.5) < Math.max(r.height * 0.3, H * 0.12);
    const goal = s.hover || centred ? (p.back ? Math.PI : 0.95) : idle;
    s.rot = reduced ? goal : damp(s.rot, goal, 4.2, dt);
    garment.pivot.rotation.y = s.rot;
    garment.pivot.position.y = reduced ? 0 : Math.sin(t * 0.8 + s.phase) * 0.012;

    // fit the whole element, not the clipped part, so the tee never jumps while scrolling
    const aspect = r.width / r.height;
    const dist = Math.max(1.12 / tan, 1.5 / (tan * aspect)) * 1.04;
    cam.aspect = aspect;
    cam.position.set(0, 0.32, dist);
    cam.lookAt(0, -0.02, 0);
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    return true;
  }

  // Pass 1, before the main scene: draw copy-mode cards and blit them into their own canvases.
  function renderCopies(dt, t, W, H, reduced) {
    let drew = false;
    const gl = renderer.domElement;
    const pr = gl.width / W;
    for (const [el, s] of states) {
      if (!s.copy) continue;
      const v = visibleRect(el, W, H);
      if (!v) continue;
      const { r } = v;
      if (!dress(el, s, r, dt, t, reduced, H)) continue;
      const cw = Math.round(r.width * pr), ch = Math.round(r.height * pr);
      if (s.canvas.width !== cw || s.canvas.height !== ch) { s.canvas.width = cw; s.canvas.height = ch; }
      renderer.setViewport(0, 0, r.width, r.height);
      renderer.setScissor(0, 0, r.width, r.height);
      renderer.setScissorTest(true);
      renderer.render(scene, cam);
      s.ctx.clearRect(0, 0, cw, ch);
      s.ctx.drawImage(gl, 0, gl.height - ch, cw, ch, 0, 0, cw, ch);
      drew = true;
    }
    if (drew) { renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); }
  }

  // Pass 2, after the main scene: live cards drawn straight into their holes.
  function render(dt, t, W, H, reduced) {
    let drew = false;
    for (const [el, s] of states) {
      if (s.copy) continue;
      const v = visibleRect(el, W, H);
      if (!v) continue;
      const { r, left, top, right, bottom } = v;
      if (!dress(el, s, r, dt, t, reduced, H)) continue;
      renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
      renderer.setScissor(left, H - bottom, right - left, bottom - top);
      renderer.setScissorTest(true);
      renderer.render(scene, cam);
      drew = true;
    }
    if (drew) { renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); }
  }

  return { sync, render, renderCopies, count: () => states.size };
}
