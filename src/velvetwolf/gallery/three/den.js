// "The Den": the account page's private room in the hall, built from simple shapes under the same
// white light and dark concrete:
//   - the tees you own hang side-on on a short rail, each in its own colour, on a wire hanger;
//     with nothing yet, bare hangers wait in the pool of light
//   - saved pieces hang as framed photographs on a free-standing wall behind
//   - your member card stands on a plinth
//   - off to one side, the fit twin: a dress form shaped from your height and chest, wearing the
//     size you're looking at (Fit & style tab)
// update(t, dt, motion): with motion off everything is placed straight away and holds still.
import * as THREE from 'three';
import { Garment } from './garment.js';
import { makeCanvas, radialTexture } from './textures.js';
import { TEE_Y } from './world.js';
import { COLORWAYS, SIZES } from '../data.js';

export const DEN_X = 224;
export const FORM_X = DEN_X + 4.8; // the fit twin, beside the room

const CM = 1 / 38.3; // the tee model is about 38 cm to a scene unit
const RAIL_Y = TEE_Y + 1.3;
const RAIL = { x0: -2.75, x1: -0.35, z: -0.55 };
const MAX_TEES = 5;
const colorOf = (name) => Object.values(COLORWAYS).find((c) => c.site.toLowerCase() === String(name || '').toLowerCase()) || COLORWAYS.noir;
const role = (o, r) => { o.userData.role = r; return o; };

// the member card's face: dark metal, the wordmark, the number in gold, the name
function cardFace() {
  const W = 1024, H = 646;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  let state = { name: '', no: null };
  function draw(next = state) {
    state = next;
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2b2b2e'); g.addColorStop(0.46, '#161618'); g.addColorStop(1, '#202023');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 3) { ctx.fillStyle = 'rgba(255,255,255,0.018)'; ctx.fillRect(x, 0, 1, H); }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(232, 228, 218, 0.72)';
    ctx.font = '600 30px Manrope, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V E L V E T W O L F', 60, 96);
    if (state.no) {
      ctx.fillStyle = '#C9A84C';
      ctx.font = '300 40px Unbounded, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`No. ${String(state.no).padStart(4, '0')}`, W - 60, 98);
    }
    ctx.fillStyle = '#E8E4DA';
    ctx.textAlign = 'left';
    let size = 66;
    ctx.font = `300 ${size}px Unbounded, sans-serif`;
    while (ctx.measureText(state.name).width > W - 120 && size > 34) { size -= 4; ctx.font = `300 ${size}px Unbounded, sans-serif`; }
    ctx.fillText(state.name, 60, H - 90);
    tex.needsUpdate = true;
  }
  draw();
  return { texture: tex, draw, redraw: () => draw(state) };
}

// a framed photograph, small: thin black frame, bone mat, the print as a lightbox
function makeFrame(aniso) {
  const FW = 0.74, FH = 0.94, MAT = 0.06, EDGE = 0.03;
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(FW + 2 * (MAT + EDGE), FH + 2 * (MAT + EDGE), 0.04), new THREE.MeshStandardMaterial({ color: '#121214', roughness: 0.5, metalness: 0.25 }));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(FW + 2 * MAT, FH + 2 * MAT), new THREE.MeshStandardMaterial({ color: '#d6d1c5', roughness: 0.95 }));
  mat.position.z = 0.021;
  const photoMat = new THREE.MeshBasicMaterial({ color: '#ececec', toneMapped: false, visible: false });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), photoMat);
  photo.position.z = 0.022;
  g.add(frame, mat, photo);
  let src = null;
  return {
    group: g,
    show(next) {
      g.visible = Boolean(next);
      if (!next || next === src) return;
      src = next;
      new THREE.TextureLoader().load(next, (t) => {
        if (src !== next) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        // cover-crop the photo into the frame's 0.79 aspect
        const a = t.image.width / t.image.height, want = FW / FH;
        if (a > want) { t.repeat.set(want / a, 1); t.offset.set((1 - want / a) / 2, 0); } else { t.repeat.set(1, a / want); t.offset.set(0, (1 - a / want) / 2); }
        photoMat.map?.dispose();
        photoMat.map = t;
        photoMat.visible = true;
        photoMat.needsUpdate = true;
      }, undefined, () => { photoMat.visible = false; });
    },
  };
}

// the dress form's outline: half-width (cm) at each drop below the shoulder line (cm)
export function formProfile({ height, chest }) {
  const w = chest / 2.75; // chest width across the front
  const sh = w * 1.04 / 2, ch = w / 2;
  // sloped shoulders: the tee's upper back sits close in, so the form stays under it
  return [
    [0, 6.5], [2, sh * 0.42], [6, sh * 0.78], [10, sh * 0.96], [0.15 * height, ch], [0.27 * height, ch * 0.86], [0.41 * height, ch * 0.97], [0.45 * height, ch * 0.9], [0.455 * height, 0],
  ];
}

export function buildDen(scene, kit, { shadows = true, aniso = 8, lite = false } = {}) {
  const lightKit = kit.light || kit;
  const room = new THREE.Group();
  room.position.set(DEN_X, 0, 0);
  scene.add(room);

  const concrete = new THREE.MeshStandardMaterial({ color: '#2e2e2e', roughness: 0.93 });
  const wire = new THREE.MeshStandardMaterial({ color: '#8a8a86', roughness: 0.3, metalness: 0.55 });
  const pool = (w, d, opacity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,255,255,0.5)'], [0.5, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0)']]), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.004;
    return m;
  };
  room.add(pool(8, 5, 0.14));

  // ---- the rail: a dark pipe on two posts with T-feet ----
  const pipeLen = RAIL.x1 - RAIL.x0;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, pipeLen + 0.3, 16), wire);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set((RAIL.x0 + RAIL.x1) / 2, RAIL_Y, RAIL.z);
  room.add(pipe);
  for (const x of [RAIL.x0 - 0.15, RAIL.x1 + 0.15]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, RAIL_Y, 16), wire);
    post.position.set(x, RAIL_Y / 2, RAIL.z); post.castShadow = shadows;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 16), wire);
    foot.rotation.x = Math.PI / 2; foot.position.set(x, 0.03, RAIL.z);
    room.add(post, foot);
  }

  // a wire hanger, hook on the rail, turned side-on like the tee under it
  const hangerGeo = { arm: new THREE.CylinderGeometry(0.01, 0.01, 0.72, 6), stem: new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), hook: new THREE.TorusGeometry(0.045, 0.01, 6, 20, Math.PI * 1.3) };
  function makeHanger() {
    const h = new THREE.Group();
    const half = 0.36, top = RAIL_Y - 0.19;
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(hangerGeo.arm, wire);
      m.scale.y = Math.hypot(half, 0.1) / 0.72;
      m.position.set((sx * half) / 2, top + 0.05, 0);
      m.rotation.z = sx * (Math.PI / 2 - Math.atan2(0.1, half));
      h.add(m);
    }
    const bar = new THREE.Mesh(hangerGeo.arm, wire); bar.rotation.z = Math.PI / 2; bar.position.y = top;
    const stem = new THREE.Mesh(hangerGeo.stem, wire); stem.position.y = top + 0.14;
    const hook = new THREE.Mesh(hangerGeo.hook, wire); hook.position.y = RAIL_Y - 0.01; hook.rotation.z = -0.2;
    h.add(bar, stem, hook);
    return h;
  }
  const slots = Array.from({ length: MAX_TEES }, (_, i) => {
    const x = RAIL.x0 + 0.25 + i * ((pipeLen - 0.5) / (MAX_TEES - 1));
    const holder = new THREE.Group();
    holder.position.set(x, 0, RAIL.z);
    holder.rotation.y = -1.2; // side-on, the way tees hang in a shop
    const hanger = makeHanger();
    const garment = new Garment(lightKit, { castShadow: shadows && !lite });
    garment.group.position.y = RAIL_Y - 0.19 - 0.86 + 0.05; // shoulders on the hanger
    garment.group.visible = false;
    role(garment.group, `owned:${i}`);
    holder.add(hanger, garment.group);
    room.add(holder);
    return { holder, hanger, garment, swing: 0 };
  });

  // ---- the wall behind, with the saved pieces framed on it ----
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.3, 0.12), concrete);
  wall.position.set(1.55, 1.65, -1.75);
  wall.receiveShadow = shadows;
  room.add(wall);
  const frames = [0.5, 1.55, 2.6].map((x, i) => {
    const f = makeFrame(aniso);
    f.group.position.set(x, 2.05, -1.68);
    f.group.visible = false;
    role(f.group, `saved:${i}`);
    room.add(f.group);
    return f;
  });

  // ---- the plinth and the member card ----
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.02, 0.62), concrete);
  plinth.position.set(1.55, 0.51, 0.35);
  plinth.castShadow = shadows; plinth.receiveShadow = shadows;
  const face = cardFace();
  const cardMat = new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.35, metalness: 0.45 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.354, 0.012), [cardMat, cardMat, cardMat, cardMat, new THREE.MeshBasicMaterial({ map: face.texture, toneMapped: false }), cardMat]);
  card.castShadow = shadows;
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.42, metalness: 0.3 }));
  stand.position.set(1.55, 1.03, 0.36);
  const cardPivot = new THREE.Group();
  cardPivot.position.set(1.55, 1.05, 0.38);
  card.position.y = 0.17;
  cardPivot.rotation.set(-0.32, 0.12, 0, 'YXZ'); // leaning back on its stand, turned to the room
  cardPivot.add(card);
  role(card, 'card');
  room.add(plinth, stand, cardPivot);

  // ---- the fit twin: a dress form and the tee in the size being looked at ----
  const twin = new THREE.Group();
  twin.position.set(FORM_X, 0, 0);
  scene.add(twin);
  twin.add(pool(3.4, 3.4, 0.12));
  // a charcoal form, so what shows through the neckline stays quiet and the tee carries the light
  const linen = new THREE.MeshStandardMaterial({ color: '#2d2d2c', roughness: 0.9 });
  const form = new THREE.Group();
  let torso = null;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(6.5 * CM, 7 * CM, 9 * CM, 24), linen);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(3 * CM, 3 * CM, 3 * CM, 16), new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.42, metalness: 0.3 }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * CM, 1.4 * CM, 1, 12), wire);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.04, 40), new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.42, metalness: 0.3 }));
  base.position.y = 0.02;
  role(form, 'form');
  form.add(neck, cap, pole);
  twin.add(form, base);
  const tee = new Garment(kit, { color: COLORWAYS.bone.hex, ink: COLORWAYS.bone.ink, castShadow: shadows });
  role(tee.group, 'formTee');
  twin.add(tee.group);
  const SHOULDER_Y = TEE_Y + 0.86; // where the tee's shoulder seam sits at scale 1
  const TEE_MID_Z = -0.07; // halfway between the model's front and back through the chest (measured)
  const fit = { shown: false, size: 'M', body: { height: 175, chest: 98 } };
  let fitSig = '';

  function shapeForm(body) {
    const sig = `${body.height}|${body.chest}`;
    if (sig === fitSig) return;
    fitSig = sig;
    const pts = formProfile(body).map(([d, r]) => new THREE.Vector2(Math.max(0.0001, r * CM), -d * CM)).reverse();
    torso?.geometry.dispose();
    if (torso) form.remove(torso);
    torso = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), linen);
    torso.scale.z = 0.5; // shallower than wide, and inside the tee front to back
    torso.castShadow = shadows;
    form.add(torso);
    const bottom = 0.455 * body.height * CM;
    neck.position.y = 4.5 * CM;
    cap.position.y = 10 * CM;
    // the stand runs from under the torso to the floor
    pole.scale.y = Math.max(0.1, form.position.y - bottom);
    pole.position.y = -bottom - pole.scale.y / 2;
  }

  function dressTee(sizeId) {
    const s = SIZES.find((x) => x.id === sizeId) || SIZES[1];
    const m = SIZES[1];
    // wider by the chest, longer by the length, against M (the model's own size)
    const sx = s.chest / m.chest, sy = s.length / m.length;
    tee.group.scale.set(sx, sy, sx);
    tee.group.position.set(0, SHOULDER_Y - 0.86 * sy, 0);
    // the tee model's front and back sit a little behind its centre line; stand the form there
    form.position.z = TEE_MID_Z * sx;
  }
  form.position.y = SHOULDER_Y - 3 * CM; // seated just under the tee's shoulder seam
  shapeForm(fit.body);
  dressTee(fit.size);

  let intro = 0;
  return {
    room, twin,
    // { owned: [{ color, name }], saved: [{ src }], card: { name, no } }
    set({ owned = [], saved = [], card: c = {} } = {}) {
      slots.forEach((s, i) => {
        const t = owned[i];
        s.garment.group.visible = Boolean(t);
        if (t) {
          const cw = colorOf(t.color);
          s.garment.setColor(cw.hex, true);
          s.garment.setInk(cw.ink, true);
        }
        // with nothing owned, three bare hangers wait in the light
        s.hanger.visible = Boolean(t) || (!owned.length && i % 2 === 0);
      });
      frames.forEach((f, i) => f.show(saved[i]?.src || null));
      face.draw({ name: String(c.name || '').toUpperCase(), no: c.no || null });
    },
    // the fit twin: { height, chest, size }, or null for the plain form in M
    setFit(next) {
      fit.shown = Boolean(next);
      if (next) { fit.body = { height: next.height, chest: next.chest }; fit.size = next.size; }
      shapeForm(fit.body);
      dressTee(fit.size);
    },
    redrawText() { face.redraw(); },
    update(t, dt, motion) {
      intro = motion ? Math.min(1, intro + dt / 1.4) : 1;
      // the tees settle on the rail after the walk in, then hang still
      slots.forEach((s, i) => {
        s.holder.rotation.y = -1.2 + (motion ? Math.sin(t * 0.6 + i) * 0.03 * (1 - intro) : 0);
        s.garment.update(dt);
      });
      tee.update(dt);
    },
  };
}
