// The payment page's exhibit: the tees that were just ordered, as photo cards on the product
// stage where the plain tee used to float. One tee stands alone; several fan out like a hand of
// cards: the one in front is full size with a gold edge, the others step back, smaller and faded,
// and the hand turns every few seconds (or to the tee the customer points at in the list).
// With motion off (reduced motion, low-end phones) the hand holds still on the first tee.
import * as THREE from 'three';
import { damp, clamp, lerp } from './util.js';
import { makeCanvas } from './textures.js';

const BONE = new THREE.Color('#E8E4DA');
const GOLD = new THREE.Color('#F0D9A2');
const CARD_W = 1.44, CARD_H = 1.8, RADIUS = 0.07, EDGE = 0.012;
const TURN_S = 3.4; // seconds each tee stays in front
const TEX_W = 576, TEX_H = 720;

// rounded rectangle, centred, as a THREE.Shape (or a hole path)
function roundRect(w, h, r, shape = new THREE.Shape()) {
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// where a card sits for a given offset from the front (0 = in front, ±1 beside it, ±2 further)
export function cardPose(rel, count) {
  const a = Math.abs(rel), s = Math.sign(rel);
  const x = s * (a <= 1 ? 1.34 * a : 1.34 + (a - 1) * 0.96);
  const scale = a <= 1 ? 1 - 0.3 * a : Math.max(0.4, 0.7 - 0.2 * (a - 1));
  // a hand of three or more wraps round: the card about to come round from the far side is hidden
  const edge = count >= 3 ? clamp((count / 2 - a) / 0.5, 0, 1) : 1;
  const opacity = (a <= 1 ? 1 - 0.55 * a : Math.max(0, 0.45 - 0.25 * (a - 1))) * edge;
  return { x, y: 0, z: -0.45 * Math.min(a, 2), rotY: -s * 0.16 * Math.min(a, 1), scale, opacity, front: Math.max(0, 1 - a) };
}

export function createOrderCards(scene, { x = 60, y = 1.62, aniso = 8, onChange = () => {} } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, 0);
  group.visible = false;
  scene.add(group);

  const photoGeo = new THREE.ShapeGeometry(roundRect(CARD_W, CARD_H, RADIUS), 6);
  // the shape's UVs follow its coordinates; map them onto 0..1 across the card
  {
    const uv = photoGeo.attributes.uv, p = photoGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / CARD_W + 0.5, p.getY(i) / CARD_H + 0.5);
  }
  const ring = roundRect(CARD_W + EDGE * 2, CARD_H + EDGE * 2, RADIUS + EDGE);
  ring.holes.push(roundRect(CARD_W, CARD_H, RADIUS, new THREE.Path()));
  const edgeGeo = new THREE.ShapeGeometry(ring, 6);

  let cards = [];
  let pos = 0, goal = 0, timer = 0, focused = null;

  // a card's face: the photo cover-cropped onto dark card stock
  function face(src, name) {
    const c = makeCanvas(TEX_W, TEX_H);
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    const plain = () => {
      if (!ctx) return;
      ctx.fillStyle = '#161618';
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.fillStyle = 'rgba(232, 228, 218, 0.7)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 34px Manrope, sans-serif';
      ctx.fillText(String(name || 'VelvetWolf').slice(0, 26), TEX_W / 2, TEX_H / 2);
      tex.needsUpdate = true;
    };
    plain();
    if (src && ctx && typeof Image !== 'undefined') {
      const img = new Image();
      // the photo has to come back with CORS headers or WebGL can't use it; if it doesn't, the
      // card keeps its plain face with the tee's name
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        const k = Math.max(TEX_W / img.naturalWidth, TEX_H / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        ctx.fillStyle = '#161618';
        ctx.fillRect(0, 0, TEX_W, TEX_H);
        ctx.drawImage(img, (TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
        tex.needsUpdate = true;
        onChange();
      };
      img.src = src;
    }
    return tex;
  }

  function clear() {
    for (const c of cards) {
      group.remove(c.group);
      c.photo.material.map?.dispose();
      c.photo.material.dispose();
      c.edge.material.dispose();
    }
    cards = [];
    group.visible = false;
  }

  return {
    group,
    // items: [{ src, name }], one card per order line
    set(items = []) {
      clear();
      cards = items.slice(0, 7).map((it, i) => {
        const g = new THREE.Group();
        const photo = new THREE.Mesh(photoGeo, new THREE.MeshBasicMaterial({ map: face(it.src, it.name), transparent: true, depthWrite: false, toneMapped: false }));
        const edge = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: BONE.clone(), transparent: true, depthWrite: false, toneMapped: false }));
        edge.position.z = -0.001;
        photo.userData.role = `card:${i}`;
        g.add(edge, photo);
        group.add(g);
        return { group: g, photo, edge };
      });
      pos = goal = 0; timer = 0; focused = null;
      group.visible = cards.length > 0;
      this.update(0, 0, false);
      onChange();
    },
    clear,
    get count() { return cards.length; },
    // the customer points at a tee in the list: bring it to the front and hold it there
    focus(i) {
      if (i == null || !cards.length) { focused = null; timer = 0; return; }
      const n = cards.length;
      focused = ((i % n) + n) % n;
      // turn the short way round
      let d = focused - (((goal % n) + n) % n);
      if (n >= 3) d = ((d + n / 2) % n + n) % n - n / 2;
      goal += Math.round(d);
      onChange();
    },
    // which card is in front now
    get front() { const n = cards.length; return n ? ((Math.round(pos) % n) + n) % n : -1; },
    update(t, dt, motion) {
      const n = cards.length;
      if (!n) return;
      if (n > 1 && motion && focused == null) {
        timer += dt;
        if (timer > TURN_S) { timer = 0; goal += n === 2 ? (Math.round(goal) % 2 === 0 ? 1 : -1) : 1; }
      }
      pos = motion ? damp(pos, goal, 3.2, dt) : goal;
      cards.forEach((c, i) => {
        let rel = i - pos;
        if (n >= 3) rel = ((rel + n / 2) % n + n) % n - n / 2;
        const p = cardPose(rel, n);
        const bob = motion ? Math.sin(t * 0.8) * 0.02 * p.front : 0;
        c.group.position.set(p.x, p.y + bob, p.z);
        c.group.rotation.y = p.rotY;
        c.group.scale.setScalar(p.scale);
        c.group.visible = p.opacity > 0.01;
        c.photo.material.opacity = p.opacity;
        // the cards behind are dimmed as well as faded, so the one in front reads first
        c.photo.material.color.setScalar(lerp(0.42, 1, p.front));
        c.edge.material.opacity = lerp(0.35, 0.95, p.front) * p.opacity;
        c.edge.material.color.copy(BONE).lerp(GOLD, p.front);
        // the card in front draws last
        c.group.renderOrder = c.photo.renderOrder = c.edge.renderOrder = Math.round(10 - Math.abs(rel) * 2);
      });
    },
  };
}
