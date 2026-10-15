// "Back of house": the wing of the hall behind the help pages. Each page has one object under the
// white light, built from simple shapes (no models), and each reacts to what you do on the page:
//
//   contact  the desk lamp       lit with floor ripples while support is open, an ember when
//                                closed; a point of light rises when a message is sent
//   faq      the card catalogue  a topic slides its drawer out and fans its cards; a search lifts
//                                the matching cards and leaves the rest
//   track    the route           a parcel loops until an order is looked up, then stops at its
//                                real stage; plinths behind it light up; the door glows only when
//                                delivered
//   shipping the dispatch runway parcels glide along a floor ruler in business days; Express
//                                pulls ahead of Standard
//   returns  the loop            a box moves to the matching step; outside the window the loop
//                                shows a calm gap, not an alarm
//   privacy  the vitrine         one glass case holding one object per kind of data we keep;
//                                hovering a row lights its object
//   terms    the stack           sheets drift down and settle into a stack as you read
//
// Palette only: concrete, paper, dark metal, glass, white light, gold as an accent.
// update(t, dt, motion): with motion off (reduced motion, low-end phones) everything jumps to its
// final state and the loops hold still.
import * as THREE from 'three';
import { damp, clamp, lerp } from './util.js';
import { radialTexture } from './textures.js';

export const BACKSTAGE_X = { contact: 102, faq: 116, track: 132, shipping: 152, returns: 170, privacy: 186, terms: 200 };

const BONE = '#E8E4DA';
const GOLD = '#F0D9A2';
const LIGHT = '#FFF8EC'; // white light, a touch warm, as in the hall

export function buildBackstage(scene, { shadows = true } = {}) {
  // ---- materials ----
  // (no environment map in the hall, so metals stay low-metalness to hold the white light)
  const concrete = new THREE.MeshStandardMaterial({ color: '#2c2c2c', roughness: 0.93 });
  const metal = new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.36, metalness: 0.35 });
  const metalDark = new THREE.MeshStandardMaterial({ color: '#242424', roughness: 0.42, metalness: 0.3 });
  const paper = new THREE.MeshStandardMaterial({ color: BONE, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.8, emissive: GOLD, emissiveIntensity: 0.12 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: BONE, transparent: true, opacity: 0.28 });
  const lineMat = (opacity = 0.35, color = BONE) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const glowTex = radialTexture([[0, 'rgba(255,248,236,1)'], [0.25, 'rgba(255,248,236,0.45)'], [1, 'rgba(255,248,236,0)']]);
  const poolTex = radialTexture([[0, 'rgba(255,255,255,0.5)'], [0.5, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0)']]);

  const mesh = (geo, mat, { cast = true, receive = false } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadows && cast;
    m.receiveShadow = shadows && receive;
    return m;
  };
  const glow = (size, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: LIGHT, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    s.scale.set(size, size, 1);
    return s;
  };
  const pool = (w, opacity = 0.14) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.004;
    return m;
  };
  const station = (name) => {
    const g = new THREE.Group();
    g.position.set(BACKSTAGE_X[name], 0, 0);
    scene.add(g);
    return g;
  };
  const parcelGeo = new THREE.BoxGeometry(0.3, 0.22, 0.24);
  const tapeGeo = new THREE.BoxGeometry(0.305, 0.03, 0.245);
  const makeParcel = (scale = 1) => {
    const p = new THREE.Group();
    const box = mesh(parcelGeo, paper.clone());
    const tape = mesh(tapeGeo, gold, { cast: false });
    tape.position.y = 0.02;
    p.add(box, tape);
    p.scale.setScalar(scale);
    p.userData.box = box;
    return p;
  };

  // =====================================================================================
  // Contact: the desk lamp
  // =====================================================================================
  const contact = (() => {
    const g = station('contact');
    g.add(pool(3.4, 0.12));
    const plinth = mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), concrete, { receive: true });
    plinth.position.y = 0.45;
    const base = mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 40), metal);
    base.position.y = 0.925;
    const stem = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 16), metal);
    stem.position.y = 1.34;
    const bulbMat = new THREE.MeshBasicMaterial({ color: LIGHT, toneMapped: false });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 16), bulbMat);
    bulb.position.y = 1.82;
    const halo = glow(1.1, 0.8);
    halo.position.copy(bulb.position);
    const ringA = mesh(new THREE.TorusGeometry(0.28, 0.008, 8, 96), metal);
    const ringB = mesh(new THREE.TorusGeometry(0.34, 0.008, 8, 96), metal);
    const rings = new THREE.Group();
    rings.position.y = 1.82;
    rings.add(ringA, ringB);
    ringB.rotation.x = Math.PI / 2;
    const lamp = new THREE.PointLight(LIGHT, 0, 4.5, 2);
    lamp.position.y = 1.82;
    // floor ripples, spreading while someone is there to answer
    const ripples = [0, 1, 2].map(() => {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.955, 1, 96), lineMat(0));
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.006;
      g.add(r);
      return r;
    });
    // the sent message: a point of light that rises out of frame
    const spark = glow(0.35, 0);
    g.add(plinth, base, stem, bulb, halo, rings, lamp, spark);

    const ember = new THREE.Color('#7a5a2c'), lit = new THREE.Color(LIGHT);
    let open = 1, openGoal = 1, ringSpin = 0, sendT = -1;
    return {
      group: g,
      set({ open: o }) { openGoal = o ? 1 : 0; },
      send() { sendT = 0; },
      update(t, dt, motion) {
        open = motion ? damp(open, openGoal, 2, dt) : openGoal;
        bulbMat.color.copy(ember).lerp(lit, open);
        halo.material.opacity = 0.25 + 0.6 * open;
        halo.scale.setScalar(0.6 + 0.5 * open);
        lamp.intensity = 0.4 + 5.6 * open;
        // the rings turn only while open
        if (motion) ringSpin += dt * 0.35 * open;
        ringA.rotation.set(Math.PI / 2 + ringSpin * 0.6, ringSpin, 0);
        rings.rotation.y = ringSpin * 0.5;
        ripples.forEach((r, i) => {
          const k = motion ? ((t / 3.2 + i / 3) % 1) : 0.5;
          r.scale.setScalar(0.5 + k * 2.4);
          r.material.opacity = open * (motion ? (1 - k) * 0.4 : 0.16);
        });
        if (sendT >= 0) {
          sendT += motion ? dt : 10;
          const k = clamp(sendT / 2.6, 0, 1);
          spark.position.set(0.1 * Math.sin(k * 6), 1.82 + k * 4.2, 0);
          spark.material.opacity = k < 0.1 ? k * 10 : 1 - k;
          if (k >= 1) { sendT = -1; spark.material.opacity = 0; }
        }
      },
    };
  })();

  // =====================================================================================
  // FAQ: the card catalogue
  // =====================================================================================
  const faq = (() => {
    const g = station('faq');
    g.add(pool(3.2, 0.12));
    const CATS = ['Orders', 'Shipping', 'Products', 'Custom', 'Returns', 'Account'];
    const COUNTS = { Orders: 3, Shipping: 3, Products: 3, Custom: 2, Returns: 2, Account: 2 };
    const cab = new THREE.Group();
    cab.position.y = 0.18;
    const body = mesh(new THREE.BoxGeometry(1.46, 2.1, 0.72), metalDark, { receive: true });
    body.position.y = 1.05;
    const top = mesh(new THREE.BoxGeometry(1.52, 0.04, 0.78), metal);
    top.position.y = 2.12;
    const legGeo = new THREE.BoxGeometry(0.06, 0.18, 0.06);
    [[-0.68, -0.32], [0.68, -0.32], [-0.68, 0.32], [0.68, 0.32]].forEach(([x, z]) => {
      const l = mesh(legGeo, metal);
      l.position.set(x, -0.09, z);
      cab.add(l);
    });
    cab.add(body, top);
    const drawerGeo = new THREE.BoxGeometry(0.64, 0.5, 0.66);
    const handleGeo = new THREE.BoxGeometry(0.18, 0.025, 0.03);
    const labelGeo = new THREE.BoxGeometry(0.16, 0.07, 0.008);
    const cardGeo = new THREE.BoxGeometry(0.5, 0.34, 0.006);
    const drawers = CATS.map((cat, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const d = new THREE.Group();
      d.position.set(col ? 0.35 : -0.35, 1.72 - row * 0.62, 0.04);
      const box = mesh(drawerGeo, metal);
      const handle = mesh(handleGeo, metal);
      handle.position.set(0, -0.12, 0.345);
      const label = mesh(labelGeo, gold, { cast: false });
      label.position.set(0, 0.1, 0.335);
      d.add(box, handle, label);
      const cards = Array.from({ length: COUNTS[cat] }, (_, j) => {
        const c = mesh(cardGeo, paper);
        c.rotation.x = -Math.PI / 2 + 0.0001;
        c.userData = { j, base: new THREE.Vector3(0, 0.12, -0.18 + j * 0.12) };
        c.position.copy(c.userData.base);
        c.rotation.set(-0.12, 0, 0);
        d.add(c);
        return c;
      });
      cab.add(d);
      return { cat, d, cards, out: 0, outGoal: 0 };
    });
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
          const hits = dr.cards.filter((c) => lifted.has(`${dr.cat}:${c.userData.j}`)).length;
          dr.outGoal = dr.cat === chosen ? 0.5 : hits ? 0.24 : 0;
          dr.out = k(dr.out, dr.outGoal);
          dr.d.position.z = 0.04 + dr.out;
          dr.cards.forEach((c, j) => {
            const isLift = lifted.has(`${dr.cat}:${j}`);
            const fan = dr.cat === chosen && !lifted.size;
            const n = dr.cards.length;
            const goalY = isLift ? 0.62 + j * 0.05 : fan ? 0.3 + j * 0.06 : c.userData.base.y;
            const goalRot = isLift ? -0.05 : fan ? -0.12 - (j - (n - 1) / 2) * -0.08 : -0.12;
            const goalZ = c.userData.base.z + (fan ? 0.06 * j : 0);
            const goalRz = fan ? (j - (n - 1) / 2) * 0.22 : 0;
            c.position.y = k(c.position.y, goalY);
            c.position.z = k(c.position.z, goalZ);
            c.rotation.x = k(c.rotation.x, goalRot);
            c.rotation.z = k(c.rotation.z, goalRz);
          });
        }
      },
    };
  })();

  // =====================================================================================
  // Track order: the route
  // =====================================================================================
  const track = (() => {
    const g = station('track');
    const N = 7;
    const pts = Array.from({ length: N }, (_, i) => new THREE.Vector3(-4.6 + (9.2 * i) / (N - 1), 0, Math.sin(i * 1.1) * 0.9));
    const curve = new THREE.CatmullRomCurve3(pts);
    const base = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.016, 6, false), lineMat(0.5));
    // a long pool of light along the route
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    runway.rotation.x = -Math.PI / 2; runway.position.set(0.5, 0.003, 0); g.add(runway);
    base.position.y = 0.01;
    const done = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.02, 6, false), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
    done.position.y = 0.012;
    const doneIndex = done.geometry.index.count;
    done.geometry.setDrawRange(0, 0);
    g.add(base, done);
    const plinthGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.32, 40);
    const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.012, 40);
    const plinths = pts.map((p) => {
      const pl = mesh(plinthGeo, concrete, { receive: true });
      pl.position.set(p.x, 0.16, p.z);
      const capMat = new THREE.MeshStandardMaterial({ color: '#4a4a4f', roughness: 0.6, emissive: GOLD, emissiveIntensity: 0 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(p.x, 0.326, p.z);
      g.add(pl, cap);
      return { cap, lit: 0 };
    });
    // the doorway at the end: it glows only at Delivered
    const end = pts[N - 1].clone().add(new THREE.Vector3(1.0, 0, 0));
    const door = new THREE.Group();
    door.position.copy(end);
    door.rotation.y = -Math.PI / 2 + 0.25;
    const postGeo = new THREE.BoxGeometry(0.08, 2.2, 0.08);
    const pL = mesh(postGeo, metal); pL.position.set(-0.5, 1.1, 0);
    const pR = mesh(postGeo, metal); pR.position.set(0.5, 1.1, 0);
    const lintel = mesh(new THREE.BoxGeometry(1.08, 0.08, 0.08), metal); lintel.position.y = 2.2;
    const doorLightMat = new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: 0.02, toneMapped: false, side: THREE.DoubleSide, depthWrite: false });
    const doorLight = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 2.12), doorLightMat);
    doorLight.position.y = 1.08;
    door.add(pL, pR, lintel, doorLight);
    g.add(door);
    const parcel = makeParcel(1);
    g.add(parcel);

    let stage = null, along = 0, drawn = 0;
    const atStage = (i) => i / (N - 1);
    return {
      group: g,
      // stage: null (no order: loop), -1 (cancelled), 0..6
      set({ stage: s = null } = {}) { stage = s; },
      update(t, dt, motion) {
        let goal;
        if (stage === null) {
          goal = motion ? (t / 9) % 1 : 0.5;
          along = goal;
        } else {
          goal = stage < 0 ? 0 : atStage(stage);
          along = motion ? damp(along, goal, 1.8, dt) : goal;
        }
        const p = curve.getPointAt(clamp(along, 0, 1));
        // between plinths the parcel rides the line; on a plinth it sits on top
        const nearest = Math.round(along * (N - 1));
        const onPlinth = 1 - clamp(Math.abs(along * (N - 1) - nearest) * 4, 0, 1);
        parcel.position.set(p.x, 0.13 + onPlinth * 0.32 + (stage === null && motion ? Math.abs(Math.sin(t * 2.4)) * 0.04 : 0), p.z);
        const tan = curve.getTangentAt(clamp(along, 0, 1));
        parcel.rotation.y = Math.atan2(-tan.z, tan.x);
        const litTo = stage === null || stage < 0 ? -1 : stage;
        plinths.forEach((pl, i) => {
          pl.lit = motion ? damp(pl.lit, i <= litTo ? 1 : 0, 4, dt) : (i <= litTo ? 1 : 0);
          pl.cap.material.emissiveIntensity = pl.lit * 0.9;
        });
        drawn = motion ? damp(drawn, litTo < 0 ? 0 : atStage(litTo), 2, dt) : (litTo < 0 ? 0 : atStage(litTo));
        done.geometry.setDrawRange(0, Math.floor(doneIndex * drawn / 3) * 3);
        const open = stage === 6 ? 1 : 0;
        doorLightMat.opacity = motion ? damp(doorLightMat.opacity, 0.02 + open * 0.55, 2, dt) : 0.02 + open * 0.55;
      },
    };
  })();

  // =====================================================================================
  // Shipping: the dispatch runway
  // =====================================================================================
  const shipping = (() => {
    const g = station('shipping');
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    lane.rotation.x = -Math.PI / 2; lane.position.y = 0.003; g.add(lane);
    const L = 9; // runway length
    const x0 = -L / 2;
    const lanes = [{ id: 'standard', z: -0.42 }, { id: 'express', z: 0.42 }].map((lane) => {
      const strip = mesh(new THREE.BoxGeometry(L, 0.012, 0.3), metalDark, { cast: false, receive: true });
      strip.position.set(0, 0.006, lane.z);
      const ticks = new THREE.Group();
      const post = mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), metal);
      post.position.set(L / 2 + 0.2, 0.45, lane.z);
      const parcel = makeParcel(0.9);
      g.add(strip, ticks, post, parcel);
      return { ...lane, ticks, parcel, days: 8, p: 0 };
    });
    const tickGeo = new THREE.BoxGeometry(0.012, 0.016, 0.26);
    const tickGeoMajor = new THREE.BoxGeometry(0.016, 0.02, 0.34);
    const tickMat = lineMat(0.5);
    let selected = 'standard', tau = 0, hold = 0, sig = '';
    const drawTicks = (lane) => {
      lane.ticks.clear();
      const n = Math.max(1, Math.round(lane.days));
      for (let d = 0; d <= n; d++) {
        const m = new THREE.Mesh(d % 7 === 0 ? tickGeoMajor : tickGeo, tickMat);
        m.position.set(x0 + (L * d) / n, 0.015, lane.z);
        lane.ticks.add(m);
      }
    };
    return {
      group: g,
      // days: { standard, express } arrival in business days (mid of the window); selected method
      set({ days = {}, method = 'standard' } = {}) {
        selected = method;
        const next = `${days.standard}|${days.express}`;
        lanes.forEach((ln) => { if (days[ln.id]) ln.days = days[ln.id]; });
        if (next !== sig) { sig = next; lanes.forEach(drawTicks); tau = 0; hold = 0; }
      },
      update(t, dt, motion) {
        // one business day = 0.5 s; both leave together, Express pulls ahead and arrives first
        if (motion) {
          const longest = Math.max(...lanes.map((l) => l.days));
          if (tau < longest) tau += dt * 2; else { hold += dt; if (hold > 1.8) { tau = 0; hold = 0; } }
        } else tau = 1e3;
        lanes.forEach((ln) => {
          ln.p = clamp(tau / ln.days, 0, 1);
          ln.parcel.position.set(x0 + ln.p * L, 0.11, ln.z);
          const on = ln.id === selected;
          ln.parcel.userData.box.material.color.set(on ? BONE : '#6f6c66');
        });
      },
    };
  })();

  // =====================================================================================
  // Returns: the loop
  // =====================================================================================
  const returns = (() => {
    const g = station('returns');
    g.add(pool(4.6, 0.1));
    const R = 1.5, N = 5, GAP = 0.9;
    const ringFull = new THREE.Mesh(new THREE.TorusGeometry(R, 0.016, 8, 160), lineMat(0.5, GOLD));
    // with a gap between "refund" and "ask": the window has closed, calmly
    const ringGap = new THREE.Mesh(new THREE.TorusGeometry(R, 0.016, 8, 160, Math.PI * 2 - GAP), lineMat(0.32));
    [ringFull, ringGap].forEach((r) => { r.rotation.x = -Math.PI / 2; r.position.y = 0.012; g.add(r); });
    // markers clockwise from the front: ask, approval, send it back, inspection, refund
    const angleOf = (i) => Math.PI / 2 + (i / N) * Math.PI * 2;
    // the gap sits between "refund" and "ask" (the torus arc runs from its local angle 0; laid flat,
    // local angle θ is world angle -θ, so rotating by φ puts the gap at world angles -φ … GAP-φ)
    const gapAngle = angleOf(N - 0.5);
    ringGap.rotation.z = GAP / 2 - gapAngle;
    const markGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.14, 32);
    const marks = Array.from({ length: N }, (_, i) => {
      const a = angleOf(i);
      const m = mesh(markGeo, new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 0.6, emissive: GOLD, emissiveIntensity: 0 }));
      m.position.set(Math.cos(a) * R, 0.07, Math.sin(a) * R);
      g.add(m);
      return m;
    });
    const box = makeParcel(1.1);
    g.add(box);
    let step = 0, eligible = true, closed = false, ang = angleOf(0), outward = 0;
    return {
      group: g,
      // step 0..4; eligible: the checker said yes; closed: the return window has passed
      set({ step: s = 0, eligible: e = true, closed: c = false } = {}) { step = s; eligible = e; closed = c; },
      update(t, dt, motion) {
        // not returnable: the box waits calmly just outside the loop, at the gap
        const goalAng = closed || !eligible ? gapAngle : angleOf(step);
        // between steps the box travels forward round the loop; to the gap it takes the short way
        let d = goalAng - ang;
        if (closed || !eligible) d = Math.atan2(Math.sin(d), Math.cos(d));
        else while (d < -1e-3) d += Math.PI * 2;
        ang = motion ? ang + d * (1 - Math.exp(-2.4 * dt)) : goalAng;
        const off = closed || !eligible ? 1 : 0;
        outward = motion ? damp(outward, off, 3, dt) : off;
        const r = R + outward * 0.42;
        box.position.set(Math.cos(ang) * r, 0.13, Math.sin(ang) * r);
        box.rotation.y = -ang;
        ringFull.visible = !closed;
        ringGap.visible = closed;
        marks.forEach((m, i) => { m.material.emissiveIntensity = !off && i === step ? 0.8 : 0; });
        box.userData.box.material.color.set(off ? '#8a867e' : BONE);
      },
    };
  })();

  // =====================================================================================
  // Privacy: the vitrine
  // =====================================================================================
  const privacy = (() => {
    const g = station('privacy');
    g.add(pool(3.4, 0.12));
    const plinth = mesh(new THREE.BoxGeometry(1.7, 0.95, 0.8), concrete, { receive: true });
    plinth.position.y = 0.475;
    const caseGeo = new THREE.BoxGeometry(1.62, 0.8, 0.72);
    const glassCase = new THREE.Mesh(caseGeo, glass);
    glassCase.position.y = 0.95 + 0.4;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(caseGeo), edgeMat);
    edges.position.copy(glassCase.position);
    g.add(plinth, glassCase, edges);
    const riserGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 32);
    const things = {};
    const place = (id, obj, x) => {
      const r = mesh(riserGeo, metalDark);
      r.position.set(x, 0.97, 0);
      obj.position.set(x, 1.0, 0);
      obj.userData.y = 1.0;
      g.add(r, obj);
      things[id] = { obj, lit: 0, glow: (() => { const s = glow(0.6, 0); s.position.set(x, 1.15, 0); g.add(s); return s; })() };
    };
    // email: an envelope
    const env = new THREE.Group();
    const envBody = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.012), paper);
    const flap = mesh(new THREE.CylinderGeometry(0.0001, 0.2, 0.012, 3), paper);
    flap.rotation.set(Math.PI / 2, 0, Math.PI); flap.scale.set(1.05, 1, 0.42); flap.position.set(0, 0.03, 0.008);
    env.add(envBody, flap);
    env.rotation.x = -0.25;
    env.position.y = 0.1;
    const envWrap = new THREE.Group(); envWrap.add(env); envWrap.children[0].position.y = 0.11;
    place('contact', envWrap, -0.57);
    // address: a small house
    const house = new THREE.Group();
    const hb = mesh(new THREE.BoxGeometry(0.16, 0.13, 0.14), metal); hb.position.y = 0.065;
    const roof = mesh(new THREE.ConeGeometry(0.14, 0.1, 4), metal); roof.position.y = 0.18; roof.rotation.y = Math.PI / 4;
    house.add(hb, roof);
    place('address', house, -0.19);
    // orders: a parcel
    const order = makeParcel(0.6); order.children.forEach((c) => { c.position.y += 0.066; });
    place('order', order, 0.19);
    // payment reference: a slim card with a gold chip
    const card = new THREE.Group();
    const cb = mesh(new THREE.BoxGeometry(0.28, 0.18, 0.008), metal);
    const chip = mesh(new THREE.BoxGeometry(0.05, 0.04, 0.004), gold, { cast: false }); chip.position.set(-0.07, 0.02, 0.006);
    card.add(cb, chip); card.rotation.x = -0.3;
    const cardWrap = new THREE.Group(); cardWrap.add(card); card.position.y = 0.1;
    place('payment', cardWrap, 0.57);
    let focus = null, intro = 0;
    return {
      group: g,
      set({ focus: f = null } = {}) { focus = f; },
      update(t, dt, motion) {
        intro = motion ? Math.min(1, intro + dt / 1.6) : 1;
        for (const [id, th] of Object.entries(things)) {
          const on = focus === id ? 1 : 0;
          th.lit = motion ? damp(th.lit, on, 6, dt) : on;
          const rise = (1 - intro) * -0.08;
          th.obj.position.y = th.obj.userData.y + rise + th.lit * 0.06;
          th.glow.material.opacity = th.lit * 0.55;
        }
      },
    };
  })();

  // =====================================================================================
  // Terms: the stack
  // =====================================================================================
  const terms = (() => {
    const g = station('terms');
    g.add(pool(3.2, 0.12));
    const plinth = mesh(new THREE.BoxGeometry(1.3, 0.95, 1.0), concrete, { receive: true });
    plinth.position.y = 0.475;
    g.add(plinth);
    const N = 13;
    const sheetGeo = new THREE.BoxGeometry(0.62, 0.006, 0.86);
    const sheets = Array.from({ length: N }, (_, i) => {
      const s = mesh(sheetGeo, paper);
      const rest = new THREE.Vector3((Math.random() - 0.5) * 0.03, 0.953 + i * 0.008, (Math.random() - 0.5) * 0.03);
      const restRot = (Math.random() - 0.5) * 0.06;
      s.userData = { rest, restRot, k: 0, phase: Math.random() * 6 };
      s.position.set(rest.x, 4.6, rest.z);
      s.visible = false;
      g.add(s);
      return s;
    });
    let goal = 1;
    return {
      group: g,
      // progress 0..1 through the document: that share of sheets has settled
      set({ progress = 0 } = {}) { goal = Math.max(1, Math.round(clamp(progress, 0, 1) * N)); },
      update(t, dt, motion) {
        sheets.forEach((s, i) => {
          const u = s.userData;
          const target = i < goal ? 1 : 0;
          // sheets drift down (and back up out of frame when you scroll back), then hold still
          u.k = motion ? damp(u.k, target, 1.6, dt) : target;
          s.visible = u.k > 0.002;
          const fall = 1 - u.k;
          s.position.set(u.rest.x + Math.sin(u.phase + fall * 5) * fall * 0.5, lerp(u.rest.y, 4.6, fall * fall), u.rest.z + Math.cos(u.phase + fall * 4) * fall * 0.3);
          s.rotation.set(Math.sin(u.phase + fall * 3) * fall * 0.6, u.restRot + fall * 1.2, Math.cos(u.phase + fall * 4) * fall * 0.5);
        });
      },
    };
  })();

  const all = { contact, faq, track, shipping, returns, privacy, terms };
  return {
    ...all,
    update(t, dt, motion, view) {
      // only the visible object needs its animation work
      for (const [name, obj] of Object.entries(all)) if (view === name) obj.update(t, dt, motion);
    },
  };
}
