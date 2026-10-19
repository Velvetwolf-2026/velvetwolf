// "Back of house": the wing of the hall behind the help pages. Each page has one object under the
// white light, built from simple shapes (no models) after the concept panels in
// docs/design/back-of-house/, and each reacts to what you do on the page:
//
//   contact  the desk lamp       a gimbal lamp on a plinth, lit with floor ripples while support
//                                is open, an ember with still rings when closed; a sent message
//                                rises from it as a point of light
//   faq      the card catalogue  a tall bank of drawers; a topic slides its drawer out and fans its
//                                cards, a search lifts only the matching cards
//   track    the route           a light strip and seven slab plinths running to a doorway in the
//                                back wall; a parcel loops until an order is looked up, then stops
//                                at its real stage; the door glows only when delivered
//   shipping the dispatch runway a floor ruler in business days; Express pulls past Standard
//   returns  the loop            a dark ring with five markers; the box moves to the step, and
//                                outside the window the ring shows a calm gap
//   privacy  the vitrine         a glass case on a dark plinth, one object per kind of data we
//                                keep; pointing at a row lights its object
//   terms    the stack           a pile on a plinth; printed sheets drift down onto it as you read
//
// Palette only: concrete, paper, dark metal, glass, white light, gold as an accent (parcels use the
// Sand colourway). update(t, dt, motion): with motion off (reduced motion, low-end phones)
// everything jumps to its final state and the loops hold still.
import * as THREE from 'three';
import { damp, clamp, lerp } from './util.js';
import { radialTexture, exhibitTag, dayRuler, printedSheetTexture, plinthLine } from './textures.js';

export const BACKSTAGE_X = { contact: 102, faq: 116, track: 132, shipping: 152, returns: 170, privacy: 186, terms: 200 };

const BONE = '#E8E4DA';
const GOLD = '#F0D9A2';
const SAND = '#C9B99B';
const LIGHT = '#FFF8EC'; // white light, a touch warm, as in the hall
const role = (o, r) => { o.userData.role = r; return o; };

export function buildBackstage(scene, { shadows = true } = {}) {
  // ---- materials (no environment map in the hall, so metals stay low-metalness to hold light) ----
  const concrete = new THREE.MeshStandardMaterial({ color: '#2e2e2e', roughness: 0.93 });
  const metal = new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.36, metalness: 0.35 });
  const metalDark = new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.42, metalness: 0.3 });
  const paper = new THREE.MeshStandardMaterial({ color: BONE, roughness: 0.9, side: THREE.DoubleSide });
  const kraft = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.82 });
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.6, emissive: GOLD, emissiveIntensity: 0.15 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide });
  const lineMat = (opacity = 0.35, color = BONE) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const lightMat = (opacity = 1) => new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const glowTex = radialTexture([[0, 'rgba(255,248,236,1)'], [0.25, 'rgba(255,248,236,0.45)'], [1, 'rgba(255,248,236,0)']]);
  const poolTex = radialTexture([[0, 'rgba(255,255,255,0.5)'], [0.5, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0)']]);

  const mesh = (geo, mat, { cast = true, receive = false } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadows && cast;
    m.receiveShadow = shadows && receive;
    return m;
  };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const glow = (size, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: LIGHT, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    s.scale.set(size, size, 1);
    return s;
  };
  const pool = (w, d = w, opacity = 0.14) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.004;
    return m;
  };
  const tag = (text, h = 0.16) => {
    const t = exhibitTag(text);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.texture, transparent: true, depthWrite: false }));
    s.scale.set(h * t.aspect, h, 1);
    s.userData.tag = t;
    return s;
  };
  const station = (name) => {
    const g = new THREE.Group();
    g.position.set(BACKSTAGE_X[name], 0, 0);
    scene.add(g);
    return g;
  };
  // a kraft parcel with a paper tape band and a small label
  const parcelGeo = new THREE.BoxGeometry(0.34, 0.22, 0.26);
  const tapeGeo = new THREE.BoxGeometry(0.345, 0.006, 0.07);
  const labelGeo = new THREE.BoxGeometry(0.1, 0.004, 0.06);
  const makeParcel = (scale = 1) => {
    const p = new THREE.Group();
    const box = mesh(parcelGeo, kraft.clone());
    box.position.y = 0.11;
    const tape = mesh(tapeGeo, paper, { cast: false }); tape.position.y = 0.221;
    const label = mesh(labelGeo, paper, { cast: false }); label.position.set(-0.09, 0.222, 0.07);
    p.add(box, tape, label);
    p.scale.setScalar(scale);
    p.userData.box = box;
    return role(p, 'parcel');
  };
  // a steel I-beam column, as in the panels
  const columnParts = (h) => {
    const g = new THREE.Group();
    const flange = new THREE.BoxGeometry(0.3, h, 0.03);
    const a = mesh(flange, metalDark); a.position.set(0, h / 2, -0.13);
    const b = mesh(flange, metalDark); b.position.set(0, h / 2, 0.13);
    const web = mesh(new THREE.BoxGeometry(0.03, h, 0.26), metalDark); web.position.y = h / 2;
    const plate = mesh(new THREE.BoxGeometry(0.5, 0.03, 0.5), metalDark, { receive: true }); plate.position.y = 0.015;
    g.add(a, b, web, plate);
    return g;
  };
  // the wing's columns, along the back
  for (let x = 96; x <= 208; x += 8) {
    const c = columnParts(6.2);
    c.position.set(x, 0, -4.6);
    scene.add(c);
  }

  // =====================================================================================
  // Contact: the desk lamp (a gimbal around the bulb)
  // =====================================================================================
  const contact = (() => {
    const g = station('contact');
    g.add(pool(3.6, 3.6, 0.1));
    const plinth = mesh(new THREE.BoxGeometry(0.9, 0.62, 0.9), concrete, { receive: true });
    plinth.position.y = 0.31;
    const dish = at(mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.04, 48), metal), 0, 0.64, 0);
    const pillar = at(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 32), metal), 0, 0.79, 0);
    const cap = at(mesh(new THREE.SphereGeometry(0.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal), 0, 0.92, 0);
    const C = 1.29; // gimbal centre
    const outer = at(mesh(new THREE.TorusGeometry(0.37, 0.014, 10, 120), metal), 0, C, 0);
    const inner = at(mesh(new THREE.TorusGeometry(0.29, 0.011, 10, 120), metal), 0, C, 0);
    const band = at(mesh(new THREE.TorusGeometry(0.2, 0.016, 10, 120), metal), 0, C, 0);
    band.rotation.x = Math.PI / 2 - 0.25;
    const bulbMat = new THREE.MeshBasicMaterial({ color: LIGHT, toneMapped: false });
    const bulb = role(new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 16), bulbMat), 'bulb');
    bulb.scale.set(1, 1.15, 1); bulb.position.set(0, C + 0.01, 0);
    const neck = at(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.07, 24), metal), 0, C - 0.1, 0);
    const halo = glow(1.2, 0.8); halo.position.set(0, C, 0);
    const lamp = role(new THREE.PointLight(LIGHT, 0, 5, 2), 'lamp'); lamp.position.set(0, C, 0);
    // the cable, off the back of the plinth and away across the floor
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.64, -0.15), new THREE.Vector3(0, 0.625, -0.45), new THREE.Vector3(-0.1, 0.6, -0.46),
      new THREE.Vector3(-0.2, 0.05, -0.47), new THREE.Vector3(-0.6, 0.006, -0.7), new THREE.Vector3(-2.4, 0.006, -0.9),
    ]), 64, 0.006, 6, false), metalDark);
    // floor ripples, spreading while someone is there to answer
    const ripples = [0, 1, 2, 3, 4].map(() => {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 128), lineMat(0));
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.006;
      g.add(r);
      return r;
    });
    const spark = role(glow(0.35, 0), 'spark');
    g.add(plinth, dish, pillar, cap, outer, inner, band, bulb, neck, halo, lamp, cable, spark);

    const ember = new THREE.Color('#7a5a2c'), lit = new THREE.Color(LIGHT);
    let open = 1, openGoal = 1, spin = 0, sendT = -1;
    return {
      group: g,
      set({ open: o }) { openGoal = o ? 1 : 0; },
      send() { sendT = 0; },
      update(t, dt, motion) {
        open = motion ? damp(open, openGoal, 2, dt) : openGoal;
        bulbMat.color.copy(ember).lerp(lit, open);
        halo.material.opacity = 0.2 + 0.65 * open;
        halo.scale.setScalar(0.55 + 0.65 * open);
        lamp.intensity = 0.3 + 6 * open;
        // the gimbal turns only while open
        if (motion) spin += dt * 0.35 * open;
        inner.rotation.set(0, spin, 0.35);
        band.rotation.set(Math.PI / 2 - 0.25, 0, spin * 0.7);
        ripples.forEach((r, i) => {
          const k = motion ? ((t / 4 + i / 5) % 1) : 0.4 + i * 0.12;
          r.scale.setScalar(0.75 + k * 2.6);
          r.material.opacity = open * (motion ? (1 - k) * 0.32 : 0.12);
        });
        if (sendT >= 0) {
          sendT += motion ? dt : 10;
          const k = clamp(sendT / 2.6, 0, 1);
          spark.position.set(0.1 * Math.sin(k * 6), C + k * 4.2, 0);
          spark.material.opacity = k < 0.1 ? k * 10 : 1 - k;
          if (k >= 1) { sendT = -1; spark.material.opacity = 0; }
        }
      },
    };
  })();

  // =====================================================================================
  // FAQ: the card catalogue (three columns of seven small drawers)
  // =====================================================================================
  const faq = (() => {
    const g = station('faq');
    g.add(pool(3.4, 3.4, 0.1));
    const CATS = ['Orders', 'Shipping', 'Products', 'Custom', 'Returns', 'Account'];
    const COUNTS = { Orders: 3, Shipping: 3, Products: 3, Custom: 2, Returns: 2, Account: 2 };
    const COLS = 3, ROWS = 7, W = 1.16, H = 1.78, D = 0.72;
    const cab = new THREE.Group();
    const body = mesh(new THREE.BoxGeometry(W, H, D), metalDark, { receive: true });
    body.position.y = H / 2;
    const top = mesh(new THREE.BoxGeometry(W + 0.03, 0.03, D + 0.03), metal);
    top.position.y = H + 0.015;
    cab.add(body, top);
    const fw = 0.34, fh = 0.22;
    const frontGeo = new THREE.BoxGeometry(fw, fh, 0.03);
    const holderGeo = new THREE.BoxGeometry(0.11, 0.055, 0.008);
    const slipGeo = new THREE.BoxGeometry(0.09, 0.04, 0.004);
    const pullGeo = new THREE.TorusGeometry(0.028, 0.006, 8, 24, Math.PI);
    const trayBase = new THREE.BoxGeometry(fw - 0.03, 0.01, 0.62);
    const traySide = new THREE.BoxGeometry(0.01, fh - 0.05, 0.62);
    const cardGeo = new THREE.BoxGeometry(fw - 0.06, fh - 0.07, 0.004);
    // the six topics sit at eye level (rows 1 and 2 from the top)
    const slot = (i) => ({ col: i % 3, row: 1 + Math.floor(i / 3) });
    const drawers = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const d = new THREE.Group();
        const y = H - 0.1 - fh / 2 - row * (fh + 0.024);
        const x = (col - 1) * (fw + 0.02);
        d.position.set(x, y, D / 2);
        const front = mesh(frontGeo, metal);
        front.position.z = 0.015;
        const holder = mesh(holderGeo, metal); holder.position.set(0, 0.05, 0.034);
        const slip = mesh(slipGeo, paper, { cast: false }); slip.position.set(0, 0.05, 0.039);
        const pull = mesh(pullGeo, metal); pull.position.set(0, -0.045, 0.035); pull.rotation.x = Math.PI / 2; pull.rotation.z = Math.PI;
        d.add(front, holder, slip, pull);
        const catIndex = CATS.findIndex((_, i) => slot(i).col === col && slot(i).row === row);
        const entry = { d, out: 0, cat: catIndex >= 0 ? CATS[catIndex] : null, cards: [] };
        if (entry.cat) {
          role(d, `drawer:${entry.cat}`);
          // the tray behind the front, packed with index cards; the first few are this topic's questions
          const tray = new THREE.Group();
          tray.position.z = -0.31;
          const base = mesh(trayBase, metalDark); base.position.y = -fh / 2 + 0.02;
          const sideL = mesh(traySide, metalDark); sideL.position.x = -(fw - 0.03) / 2;
          const sideR = mesh(traySide, metalDark); sideR.position.x = (fw - 0.03) / 2;
          tray.add(base, sideL, sideR);
          for (let j = 0; j < 14; j++) {
            const c = role(mesh(cardGeo, paper), 'card');
            c.userData = { ...c.userData, j, base: new THREE.Vector3(0, -0.01, 0.24 - j * 0.035) };
            c.position.copy(c.userData.base);
            c.rotation.x = -0.18;
            tray.add(c);
            if (j < COUNTS[entry.cat]) entry.cards.push(c);
          }
          d.add(tray);
          const light = glow(0.5, 0); light.position.set(0, 0.12, 0.02); d.add(light);
          entry.light = light;
        }
        cab.add(d);
        drawers.push(entry);
      }
    }
    g.add(cab);
    let chosen = null, lifted = new Set();
    return {
      group: g,
      // cat: the chosen topic (or null for All); match: ["Orders:0", ...] cards hit by a search
      set({ cat = null, match = null } = {}) {
        chosen = cat && cat !== 'All' ? cat : null;
        lifted = new Set(match || []);
      },
      update(t, dt, motion) {
        const k = (a, b, rate = 6) => (motion ? damp(a, b, rate, dt) : b);
        for (const dr of drawers) {
          if (!dr.cat) continue;
          const hits = dr.cards.filter((c) => lifted.has(`${dr.cat}:${c.userData.j}`)).length;
          const goal = dr.cat === chosen ? 0.46 : hits ? 0.24 : 0;
          dr.out = k(dr.out, goal, 5);
          dr.d.position.z = D / 2 + dr.out;
          dr.light.material.opacity = (dr.out / 0.46) * 0.55;
          const n = dr.cards.length;
          dr.cards.forEach((c, j) => {
            const isLift = lifted.has(`${dr.cat}:${j}`);
            const fan = dr.cat === chosen && !lifted.size;
            c.position.y = k(c.position.y, isLift ? 0.24 : fan ? 0.08 + j * 0.035 : c.userData.base.y);
            c.position.z = k(c.position.z, c.userData.base.z + (fan ? 0.04 * j : 0));
            c.rotation.x = k(c.rotation.x, isLift ? 0.05 : fan ? -0.18 + 0.32 : -0.18);
            c.rotation.z = k(c.rotation.z, fan ? (j - (n - 1) / 2) * 0.22 : 0);
          });
        }
      },
    };
  })();

  // =====================================================================================
  // Track order: the route, away from you to a doorway in the back wall
  // =====================================================================================
  const track = (() => {
    const g = station('track');
    const N = 7, zNear = 3.0, zFar = -4.0;
    const zOf = (i) => lerp(zNear, zFar, i / (N - 1));
    const xOf = (i) => Math.sin(i * 0.9) * 0.18;
    g.add(at(pool(5, 11, 0.1), 0, 0.004, -0.6));
    // the light strip: a dim full length, and a lit part up to the order's stage
    const stripLen = zNear + 5.9 + 0.6; // from just in front of the first slab to the door
    const stripGeo = new THREE.PlaneGeometry(0.075, 1);
    const haloGeo = new THREE.PlaneGeometry(0.42, 1);
    const base = new THREE.Mesh(stripGeo, lineMat(0.22));
    base.rotation.x = -Math.PI / 2;
    base.scale.y = stripLen; base.position.set(0, 0.005, zNear + 0.6 - stripLen / 2);
    const done = role(new THREE.Mesh(stripGeo, lightMat(0.95)), 'routeDone');
    done.rotation.x = -Math.PI / 2;
    done.position.y = 0.006;
    // a soft spill of light either side of the lit strip
    const spill = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,248,236,0.55)'], [1, 'rgba(255,248,236,0)']]), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    spill.rotation.x = -Math.PI / 2;
    spill.position.y = 0.005;
    g.add(base, done, spill);
    // seven slab plinths, each glowing from underneath once the order has passed it
    const slabGeo = new THREE.BoxGeometry(0.56, 0.12, 0.42);
    const slabMat = new THREE.MeshStandardMaterial({ color: '#4a4a48', roughness: 0.9 }); // pale concrete, as in the panel
    const underGeo = new THREE.PlaneGeometry(0.66, 0.52);
    const slabs = Array.from({ length: N }, (_, i) => {
      const s = mesh(slabGeo, slabMat, { receive: true });
      s.position.set(xOf(i), 0.075, zOf(i));
      const under = new THREE.Mesh(underGeo, new THREE.MeshBasicMaterial({ map: poolTex, color: LIGHT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      under.rotation.x = -Math.PI / 2; under.position.set(xOf(i), 0.004, zOf(i));
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.565, 0.012, 0.425), lightMat(0));
      edge.position.set(xOf(i), 0.02, zOf(i));
      role(s, `slab:${i}`);
      g.add(s, under, edge);
      return { s, under, edge, lit: 0 };
    });
    // the doorway, set in the back wall; it glows only at Delivered
    const door = new THREE.Group();
    door.position.set(0, 0, -5.9);
    const frameMat = new THREE.MeshStandardMaterial({ color: BONE, roughness: 0.8 });
    const jamb = new THREE.BoxGeometry(0.12, 2.4, 0.12);
    door.add(at(mesh(jamb, frameMat), -0.62, 1.2, 0), at(mesh(jamb, frameMat), 0.62, 1.2, 0), at(mesh(new THREE.BoxGeometry(1.36, 0.12, 0.12), frameMat), 0, 2.46, 0));
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.4), new THREE.MeshBasicMaterial({ color: '#070708' }));
    opening.position.set(0, 1.2, -0.02);
    const doorLight = role(new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.4), lightMat(0)), 'doorLight');
    doorLight.position.set(0, 1.2, -0.01);
    door.add(opening, doorLight);
    g.add(door);
    const parcel = makeParcel(1.05);
    g.add(parcel);

    let stage = null, along = 0, drawn = 0;
    const pathPos = (u) => {
      const f = clamp(u, 0, 1) * (N - 1), i = Math.floor(f), k = f - i;
      const j = Math.min(N - 1, i + 1);
      return [lerp(xOf(i), xOf(j), k), lerp(zOf(i), zOf(j), k), k];
    };
    return {
      group: g,
      // stage: null (no order: loop), -1 (cancelled), 0..6
      set({ stage: s = null } = {}) { stage = s; },
      update(t, dt, motion) {
        if (stage === null) along = motion ? (t / 10) % 1 : 0.5;
        else {
          const goal = stage < 0 ? 0 : stage / (N - 1);
          along = motion ? damp(along, goal, 1.8, dt) : goal;
        }
        const [x, z, k] = pathPos(along);
        // between slabs the parcel rides the strip; on a slab it sits on top
        const onSlab = 1 - clamp(Math.min(k, 1 - k) * 5, 0, 1);
        parcel.position.set(x, onSlab * 0.135 + (stage === null && motion ? Math.abs(Math.sin(t * 2.6)) * 0.03 : 0), z);
        const litTo = stage === null || stage < 0 ? -1 : stage;
        slabs.forEach((sl, i) => {
          sl.lit = motion ? damp(sl.lit, i <= litTo ? 1 : 0, 4, dt) : (i <= litTo ? 1 : 0);
          sl.under.material.opacity = sl.lit * 0.5;
          sl.edge.material.opacity = sl.lit * 0.85;
        });
        const goalLen = litTo < 0 ? 0 : (zNear + 0.6) - zOf(litTo);
        drawn = motion ? damp(drawn, goalLen, 2, dt) : goalLen;
        done.visible = spill.visible = drawn > 0.01;
        done.scale.y = spill.scale.y = Math.max(0.001, drawn);
        done.position.z = spill.position.z = zNear + 0.6 - drawn / 2;
        const open = stage === 6 ? 0.6 : 0;
        doorLight.material.opacity = motion ? damp(doorLight.material.opacity, open, 2, dt) : open;
      },
    };
  })();

  // =====================================================================================
  // Shipping: the dispatch runway (a floor ruler in business days)
  // =====================================================================================
  const shipping = (() => {
    const g = station('shipping');
    const DAYS = 14, L = 10;
    g.add(pool(12, 4, 0.12));
    const ruler = dayRuler(DAYS);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(L / (1 - 2 * ruler.pad), 1.25), new THREE.MeshBasicMaterial({ map: ruler.texture, transparent: true, depthWrite: false }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.006, 0.35);
    g.add(strip);
    const xAt = (d) => -L / 2 + (L * clamp(d, 0, DAYS)) / DAYS;
    // the two parcels ride either side of the gold line
    const lanes = [{ id: 'standard', text: 'Standard', z: -0.36 }, { id: 'express', text: 'Express', z: 0.2 }].map((lane) => {
      const parcel = role(makeParcel(1.5), `parcel:${lane.id}`);
      const label = tag(lane.text, 0.26);
      g.add(parcel, label);
      return { ...lane, parcel, label, days: 8, pos: 0 };
    });
    let selected = null, tau = 0, hold = 0, sig = '';
    return {
      group: g,
      // days: { standard, express } arrival in business days (mid of each window); method: chosen
      set({ days = {}, method = 'standard' } = {}) {
        lanes.forEach((ln) => { if (days[ln.id]) ln.days = days[ln.id]; });
        const next = `${lanes[0].days}|${lanes[1].days}`;
        if (next !== sig) { sig = next; tau = 0; hold = 0; }
        if (method !== selected) { selected = method; lanes.forEach((ln) => ln.label.userData.tag.draw(ln.text, ln.id === selected)); }
      },
      update(t, dt, motion) {
        // Standard leaves first; Express leaves a beat later, moves faster and passes it, then
        // each parcel stops at its own delivery day
        if (motion) {
          if (lanes.some((l) => l.pos < l.days)) tau += dt; else { hold += dt; if (hold > 2.2) { tau = 0; hold = 0; } }
        } else tau = 1e3;
        lanes.forEach((ln) => {
          const speed = ln.id === 'express' ? 3.2 : 1.6; // business days per second
          const start = ln.id === 'express' ? 0.7 : 0;
          ln.pos = Math.min(ln.days, Math.max(0, tau - start) * speed);
          const x = xAt(ln.pos);
          ln.parcel.position.set(x, 0, ln.z);
          ln.label.position.set(x, 0.72, ln.z);
          const on = ln.id === selected;
          ln.parcel.userData.box.material.color.set(on ? SAND : '#8e8473');
        });
      },
    };
  })();
  shipping.set({ days: { standard: 8.5, express: 5.5 }, method: 'standard' });
  // tags drawn before the web fonts land are redrawn by the engine (redrawText)

  // =====================================================================================
  // Returns: the loop
  // =====================================================================================
  const returns = (() => {
    const g = station('returns');
    g.add(pool(5, 5, 0.12));
    const R = 1.52, N = 5, GAP = 0.85;
    const STEP_LABELS = ['Ask', 'Approval', 'Send back', 'Inspection', 'Refund'];
    const angleOf = (i) => Math.PI / 2 + (i / N) * Math.PI * 2;
    const gapAngle = angleOf(N - 0.5); // between "refund" and "ask"
    // laid flat, a ring's local angle θ is world angle -θ: start the arc so the gap is centred
    const gapStart = -(gapAngle + Math.PI * 2 - GAP / 2);
    const flat = (m) => { m.rotation.x = -Math.PI / 2; return m; };
    const bandFull = role(flat(mesh(new THREE.RingGeometry(R - 0.1, R + 0.1, 160), metalDark, { cast: false, receive: true })), 'ringFull');
    const grooveFull = flat(new THREE.Mesh(new THREE.RingGeometry(R - 0.012, R + 0.012, 160), lineMat(0.55, GOLD)));
    const bandGap = role(flat(mesh(new THREE.RingGeometry(R - 0.1, R + 0.1, 160, 1, gapStart, Math.PI * 2 - GAP), metalDark, { cast: false, receive: true })), 'ringGap');
    const grooveGap = flat(new THREE.Mesh(new THREE.RingGeometry(R - 0.012, R + 0.012, 160, 1, gapStart, Math.PI * 2 - GAP), lineMat(0.3)));
    [bandFull, bandGap].forEach((m) => { m.position.y = 0.006; });
    [grooveFull, grooveGap].forEach((m) => { m.position.y = 0.008; });
    g.add(bandFull, grooveFull, bandGap, grooveGap);
    const discGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 40);
    const rimGeo = new THREE.TorusGeometry(0.1, 0.008, 8, 40);
    const marks = Array.from({ length: N }, (_, i) => {
      const a = angleOf(i);
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const disc = mesh(discGeo, new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.5, emissive: GOLD, emissiveIntensity: 0 }));
      disc.position.set(x, 0.02, z);
      const rim = mesh(rimGeo, gold, { cast: false });
      rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.036, z);
      const label = tag(STEP_LABELS[i], 0.15);
      label.position.set(x, 0.36, z);
      g.add(disc, rim, label);
      return { disc, label };
    });
    const box = makeParcel(1.15);
    g.add(box);
    let step = 0, eligible = true, closed = false, ang = angleOf(0), outward = 0, drawnStep = -1;
    return {
      group: g,
      // step 0..4; eligible: the checker said yes; closed: the return window has passed
      set({ step: s = 0, eligible: e = true, closed: c = false } = {}) { step = s; eligible = e; closed = c; },
      update(t, dt, motion) {
        const off = closed || !eligible;
        const goalAng = off ? gapAngle : angleOf(step);
        // between steps the box travels forward round the loop; to the gap it takes the short way
        let d = goalAng - ang;
        if (off) d = Math.atan2(Math.sin(d), Math.cos(d));
        else while (d < -1e-3) d += Math.PI * 2;
        ang = motion ? ang + d * (1 - Math.exp(-2.4 * dt)) : ang + d;
        outward = motion ? damp(outward, off ? 1 : 0, 3, dt) : (off ? 1 : 0);
        const r = R + outward * 0.42;
        box.position.set(Math.cos(ang) * r, 0.01, Math.sin(ang) * r);
        box.rotation.y = -ang;
        bandFull.visible = grooveFull.visible = !closed;
        bandGap.visible = grooveGap.visible = closed;
        const active = off ? -1 : step;
        marks.forEach((m, i) => { m.disc.material.emissiveIntensity = i === active ? 0.9 : 0; });
        if (active !== drawnStep) { drawnStep = active; marks.forEach((m, i) => m.label.userData.tag.draw(STEP_LABELS[i], i === active)); }
        box.userData.box.material.color.set(off ? '#8e8473' : SAND);
      },
    };
  })();

  // =====================================================================================
  // Privacy: the vitrine (a glass case on a dark plinth, one object per kind of data)
  // =====================================================================================
  const privacy = (() => {
    const g = station('privacy');
    g.add(pool(3.6, 3, 0.12));
    const W = 1.5, D = 0.72, TOP = 0.98, CH = 0.6;
    const plinthMat = new THREE.MeshStandardMaterial({ color: '#232323', roughness: 0.55, metalness: 0.25 });
    g.add(at(mesh(new THREE.BoxGeometry(W + 0.12, TOP, D + 0.12), plinthMat, { receive: true }), 0, TOP / 2, 0));
    // one quiet line set into the plinth's face
    const line = plinthLine('“this is everything we hold, on display.”');
    const lineW = 1.0;
    const quote = new THREE.Mesh(new THREE.PlaneGeometry(lineW, lineW / line.aspect), new THREE.MeshBasicMaterial({ map: line.texture, transparent: true, opacity: 0.5, depthWrite: false }));
    quote.position.set(0, TOP - 0.2, (D + 0.12) / 2 + 0.002);
    quote.userData.tag = line;
    g.add(quote);
    // a dark, glossy floor inside the case
    g.add(at(mesh(new THREE.BoxGeometry(W - 0.01, 0.004, D - 0.01), new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: 0.28, metalness: 0.45 }), { receive: true }), 0, TOP + 0.002, 0));
    // the glass, with its edges catching the light
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(W, CH, D), glass), 0, TOP + CH / 2, 0));
    const edgeMat = new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false });
    const t = 0.007;
    const eX = new THREE.BoxGeometry(W, t, t), eY = new THREE.BoxGeometry(t, CH, t), eZ = new THREE.BoxGeometry(t, t, D);
    for (const y of [TOP + t / 2, TOP + CH]) for (const sz of [-1, 1]) g.add(at(new THREE.Mesh(eX, edgeMat), 0, y, sz * D / 2));
    for (const y of [TOP + t / 2, TOP + CH]) for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(eZ, edgeMat), sx * W / 2, y, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(new THREE.Mesh(eY, edgeMat), sx * W / 2, TOP + CH / 2, sz * D / 2));

    // round black pedestals
    const pedMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.35, metalness: 0.3 });
    const pedGeo = new THREE.CylinderGeometry(0.15, 0.156, 0.045, 48);
    const capGeo = new THREE.CylinderGeometry(0.136, 0.14, 0.012, 48);
    const PED = 0.061;
    const lamp = role(new THREE.PointLight(LIGHT, 0, 1.4, 2), 'vitrineLight');
    g.add(lamp);
    const things = {};
    const place = (id, obj, x) => {
      g.add(at(mesh(pedGeo, pedMat, { receive: true }), x, TOP + 0.0265, 0));
      g.add(at(mesh(capGeo, metal, { receive: true }), x, TOP + 0.055, 0));
      // each object gets its own materials so it can light on its own
      const mats = [];
      obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); mats.push(o.material); } });
      const holder = new THREE.Group();
      holder.position.set(x, TOP + PED, 0);
      holder.userData.y = TOP + PED;
      obj.scale.multiplyScalar(1.2);
      holder.add(obj);
      const halo = glow(0.55, 0); halo.position.set(x, TOP + PED + 0.1, 0.02);
      // a soft shaft of light from above, as in the panel
      const beam = glow(1, 0); beam.scale.set(0.3, 1.0, 1); beam.position.set(x, TOP + CH * 0.62, -0.02);
      role(holder, `thing:${id}`);
      role(halo, `glow:${id}`);
      g.add(holder, halo, beam);
      things[id] = { holder, halo, beam, mats, x, lit: 0 };
    };
    const standUp = (o) => { o.rotation.x = -0.2; return o; };
    const crease = new THREE.MeshStandardMaterial({ color: '#b3ad9f', roughness: 0.9 });
    // email: an envelope standing on its edge, the flap drawn as a V
    const env = new THREE.Group();
    env.add(at(mesh(new THREE.BoxGeometry(0.24, 0.16, 0.014), paper), 0, 0.08, 0));
    for (const s of [-1, 1]) {
      const c = at(mesh(new THREE.BoxGeometry(0.142, 0.005, 0.002), crease, { cast: false }), s * 0.058, 0.122, 0.008);
      c.rotation.z = s * -0.62;
      env.add(c);
    }
    standUp(env); env.rotation.y = 0.18;
    place('contact', env, -0.54);
    // address: a small house with a chimney
    const house = new THREE.Group();
    house.add(at(mesh(new THREE.BoxGeometry(0.16, 0.12, 0.15), paper), 0, 0.06, 0));
    // the gable faces front: a triangle extruded front to back
    const gable = new THREE.Shape([new THREE.Vector2(-0.095, 0), new THREE.Vector2(0.095, 0), new THREE.Vector2(0, 0.085)]);
    const roofGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.17, bevelEnabled: false });
    roofGeo.translate(0, 0, -0.085);
    const roof = at(mesh(roofGeo, paper), 0, 0.12, 0);
    const chimney = at(mesh(new THREE.BoxGeometry(0.026, 0.06, 0.026), paper), 0.05, 0.17, -0.04);
    const door = at(mesh(new THREE.BoxGeometry(0.036, 0.06, 0.004), metalDark), 0, 0.03, 0.076);
    house.add(roof, chimney, door);
    house.rotation.y = -0.35;
    place('address', house, -0.18);
    // orders: a parcel
    const box = makeParcel(0.62); box.rotation.y = 0.12;
    place('order', box, 0.18);
    // payment reference: a card with a gold chip
    const card = new THREE.Group();
    card.add(at(mesh(new THREE.BoxGeometry(0.22, 0.14, 0.01), paper), 0, 0.07, 0));
    card.add(at(mesh(new THREE.BoxGeometry(0.036, 0.028, 0.004), gold, { cast: false }), -0.058, 0.08, 0.006));
    for (const k of [0, 1]) card.add(at(mesh(new THREE.BoxGeometry(0.11 - k * 0.04, 0.006, 0.002), crease, { cast: false }), -0.02 - k * 0.02, 0.035 - k * 0.014, 0.006));
    standUp(card); card.rotation.y = -0.18;
    place('payment', card, 0.54);

    let focus = null, intro = 0;
    return {
      group: g,
      set({ focus: f = null } = {}) { focus = f; },
      update(t, dt, motion) {
        // after a short intro the case holds still; it only moves when a row is pointed at
        intro = motion ? Math.min(1, intro + dt / 1.6) : 1;
        let best = null;
        for (const [id, th] of Object.entries(things)) {
          const on = focus === id ? 1 : 0;
          th.lit = motion ? damp(th.lit, on, 6, dt) : on;
          th.holder.position.y = th.holder.userData.y + (1 - intro) * -0.05 + th.lit * 0.05;
          th.halo.material.opacity = th.lit * 0.6;
          th.beam.material.opacity = th.lit * 0.22;
          for (const m of th.mats) if (m.emissive) { m.emissive.set(LIGHT); m.emissiveIntensity = th.lit * 0.85; }
          if (!best || th.lit > best.lit) best = th;
        }
        lamp.position.set(best.x, TOP + PED + 0.16, 0.12);
        lamp.intensity = best.lit * 1.6;
      },
    };
  })();

  // =====================================================================================
  // Terms: the stack (printed sheets drift down onto a pile on a plinth as you read)
  // =====================================================================================
  const terms = (() => {
    const g = station('terms');
    g.add(pool(3.4, 3.4, 0.12));
    const PH = 1.0, PW = 0.95;
    g.add(at(mesh(new THREE.BoxGeometry(PW, PH, PW), concrete, { receive: true }), 0, PH / 2, 0));
    // the pile already there: loose sheets, each a little out of true, so the edges show
    const SW = 0.6, SD = 0.8, STEP = 0.0085, BASE = 28;
    const pileGeo = new THREE.BoxGeometry(SW, STEP * 0.8, SD);
    for (let i = 0; i < BASE; i++) {
      const s = mesh(pileGeo, paper, { receive: true });
      s.position.set(Math.sin(i * 7.3) * 0.014, PH + STEP * (i + 0.5), Math.cos(i * 5.1) * 0.014);
      s.rotation.y = Math.sin(i * 3.1) * 0.045;
      g.add(s);
    }
    const PILE = PH + STEP * BASE;
    // the sheets still to come down: printed pages, curled a little
    const sheetGeo = new THREE.PlaneGeometry(SW, SD, 12, 1);
    const pos = sheetGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / SW + 0.5) * Math.PI) * 0.05);
    sheetGeo.computeVertexNormals();
    const printed = [5, 9, 14].map((seed) => new THREE.MeshStandardMaterial({ map: printedSheetTexture(seed), roughness: 0.9, side: THREE.DoubleSide }));
    const N = 14;
    // where sheet i rests on the pile, and where it hangs in the column (j-th from the bottom) while unread
    const restOf = (i) => ({ x: Math.sin(i * 4.3) * 0.016, y: PILE + STEP * (i + 0.5), z: Math.cos(i * 6.7) * 0.016, rx: -Math.PI / 2, ry: Math.sin(i * 2.9) * 0.06, rz: 0, curl: 0.1 });
    const airOf = (i, j) => ({
      x: 0.03 + j * 0.022 + Math.sin(i * 2.1) * 0.07, y: PILE + 0.2 + j * 0.22 + j * j * 0.006, z: Math.cos(i * 1.7) * 0.06,
      rx: -Math.PI / 2 + Math.sin(i * 1.3 + 0.4) * 0.5, ry: Math.cos(i * 2.3) * 0.32, rz: Math.sin(i * 0.9) * 0.9, curl: 1,
    });
    const sheets = Array.from({ length: N }, (_, i) => {
      const s = role(mesh(sheetGeo, printed[i % printed.length]), 'sheet');
      const a = airOf(i, i);
      s.position.set(a.x, a.y + 1.4, a.z); // the intro: they drift in from above
      s.rotation.set(a.rx, a.ry, a.rz);
      s.userData.phase = i * 1.7;
      g.add(s);
      return s;
    });
    let settled = 0;
    return {
      group: g,
      // progress 0..1 through the document: that share of the sheets has come down onto the pile
      set({ progress = 0 } = {}) { settled = Math.round(clamp(progress, 0, 1) * N); },
      update(t, dt, motion) {
        const k = (v, to) => (motion ? damp(v, to, 2.4, dt) : to);
        sheets.forEach((s, i) => {
          const goal = i < settled ? restOf(i) : airOf(i, i - settled);
          s.position.set(k(s.position.x, goal.x), k(s.position.y, goal.y), k(s.position.z, goal.z));
          // a sheet on its way flutters a little; once it arrives it holds still
          const away = motion ? Math.min(1, Math.abs(s.position.y - goal.y) * 2.5) : 0;
          const flutter = Math.sin(t * 2.6 + s.userData.phase) * away;
          s.rotation.set(k(s.rotation.x, goal.rx) + flutter * 0.014, k(s.rotation.y, goal.ry), k(s.rotation.z, goal.rz) + flutter * 0.007);
          s.scale.z = k(s.scale.z, goal.curl);
        });
      },
    };
  })();

  const all = { contact, faq, track, shipping, returns, privacy, terms };
  const tags = [];
  scene.traverse((o) => { if (o.userData?.tag) tags.push(o.userData.tag); });
  return {
    ...all,
    // canvas lettering needs the web fonts; redraw once they land
    redrawText() { for (const t of tags) t.redraw(); },
    update(t, dt, motion, view) {
      // only the visible object needs its animation work
      for (const [name, obj] of Object.entries(all)) if (view === name) obj.update(t, dt, motion);
    },
  };
}
