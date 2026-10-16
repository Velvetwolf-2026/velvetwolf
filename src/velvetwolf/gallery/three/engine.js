// One renderer, one fixed canvas behind the page. Owns the loop, quality scaling and the
// public API the UI talks to. Framework-free on purpose so it can sit under React later.
import * as THREE from 'three';
import { buildKit } from './garment.js';
import { knitTexture } from './textures.js';
import { createPrintLibrary, DESIGNS } from './prints.js';
import { buildWorld, TEE_Y } from './world.js';
import { Rig, resolve, lerpPose, dwellEase, layoutOf, STATIONS } from './rig.js';
import { buildBackstage, BACKSTAGE_X } from './backstage.js';
import { createStages } from './stages.js';
import { createGoldDust } from './dust.js';
import { damp, nearestAngle } from './util.js';
import { COLORWAYS, productById } from '../data.js';

const HOME_ORDER = ['hero', 'drop', 'color', 'craft', 'teaser'];

export function createEngine(canvas, { reducedMotion = false, kit: glbKit = null } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  // ---- device tier ----
  //  low:  phones, and anything with <=4 cores or <=3 GB memory
  //  mid:  touch tablets (big screens, mobile GPUs)
  //  high: laptops and desktops
  const touch = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  const autoTier = (touch && shortSide < 600) || cores <= 4 || memory <= 3 ? 'low' : touch ? 'mid' : 'high';
  // ?tier=low|mid|high forces a tier, for checking the phone path on a laptop and vice versa
  const forced = new URLSearchParams(location.search).get('tier');
  const tier = ['low', 'mid', 'high'].includes(forced) ? forced : autoTier;
  const lowPower = tier !== 'high';
  const stacked = () => layoutOf(innerWidth, innerHeight).stacked;
  // cap both the pixel ratio and the total pixels drawn: a 12.9" tablet at DPR 2 is 5.6M pixels
  const dprCap = tier === 'high' ? 1.75 : 1.5;
  const pixelBudget = tier === 'high' ? 3.8e6 : tier === 'mid' ? 2.6e6 : 1.6e6;
  const fitDpr = (w, h) => Math.max(1, Math.min(devicePixelRatio || 1, dprCap, Math.sqrt(pixelBudget / (w * h))));
  let dprDrop = 0; // how far the adaptive loop has stepped the ratio down
  let dpr = fitDpr(innerWidth, innerHeight);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Khronos PBR Neutral: built for product colour accuracy, keeps base colours close to their hex.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = tier !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false; // counted per frame across all passes (see debug())

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 90);
  // production GLB when it loaded; the procedural tee is the fallback
  const kit = glbKit || buildKit({ step: lowPower ? 0.034 : 0.027, knit: knitTexture(aniso) });
  const prints = createPrintLibrary(aniso);
  if (!kit.light) kit.light = kit;
  const world = buildWorld(scene, kit, prints, { shadows: tier !== 'low', beams: true, lite: lowPower });
  const rig = new Rig(camera);
  const stages = createStages(renderer, kit, prints);
  const B = world.bays;
  // lite gold stars drifting through the hall, kept clear of the tees
  const dust = createGoldDust(scene, {
    bays: [B.hero, ...B.drop, B.color, B.craft, B.teaser, B.pdp, B.studio, ...B.fitLineup, ...Object.values(BACKSTAGE_X).map((x) => ({ x }))].map((b) => b.x),
    count: tier === 'low' ? 600 : tier === 'mid' ? 900 : 1400,
    reduced: reducedMotion,
    pixelRatio: dpr,
  });


  // ---- dress the permanent exhibits ----
  function dress(garment, productId, colorId, immediate = true) {
    const p = productById(productId);
    const cw = COLORWAYS[colorId || p.color];
    garment.setColor(cw.hex, immediate);
    garment.setInk(cw.ink, immediate);
    const frontD = DESIGNS[p?.front];
    const backD = DESIGNS[p?.back];
    garment.setPrint('front', prints.get(p?.front), { fullColor: Boolean(frontD?.fullColor) });
    garment.setPrint('back', prints.get(p?.back), { fullColor: Boolean(backD?.fullColor) });
  }
  dress(B.hero.garment, 'nocturne', 'bone');
  dress(B.color.garment, 'essential', 'noir');
  dress(B.craft.garment, 'silence', 'bone');
  B.fitLineup.forEach((b) => dress(b.garment, 'essential', 'bone'));
  // size guide: the chosen size steps forward into the light; the rest wait behind
  let fitSel = 1;
  const FIT_FRONT = 0.1, FIT_BACK = -0.5; // off the rail and forward, into the light
  // back of house: one object per help page
  const backstage = buildBackstage(scene, { shadows: tier !== 'low' });
  let helpPage = null; // which back-of-house object is on screen
  // Quiet Hours: framed photographs hang where the drop tees used to float.
  // The page supplies them (the newest products) through setDropPhotos().
  const hungPhotos = [];

  // ---- state ----
  let W = 1, H = 1, Hs = 1;
  let view = 'home';
  let station = 'hero';
  let homeS = 0;
  const pointer = [0, 0], pointerSmooth = [0, 0];
  const spin = {
    pdp: { rot: 0, goal: 0, vel: 0, dragging: false },
    studio: { rot: 0, goal: 0, vel: 0, dragging: false },
  };
  let colorT = 0;
  let dim = 1;
  let occluded = false; // set while an opaque panel covers the whole stage (stacked product page)
  let colorList = ['noir', 'bone', 'sand', 'forest', 'crimson'];

  // The canvas is sized to the *large* viewport (toolbars hidden). Mobile browsers fire resize
  // while their toolbars slide in and out during scroll; resizing the drawing buffer each time
  // stutters, so only a width change or a real height change (rotation, split view) resizes it.
  const probe = (h) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:0;top:0;width:1px;height:${h};visibility:hidden;pointer-events:none`;
    d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
    return d;
  };
  const pSmall = probe('100svh'), pLarge = probe('100lvh');
  function resize() {
    const w = innerWidth;
    const lv = Math.max(pLarge.offsetHeight || 0, innerHeight);
    Hs = Math.min(pSmall.offsetHeight || innerHeight, innerHeight);
    const changed = w !== W || Math.abs(lv - H) > 1;
    if (changed) {
      W = w; H = lv;
      dpr = Math.max(1, fitDpr(W, H) - dprDrop);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      dust.setPixelRatio(dpr);
    }
    camera.aspect = W / H;
    camera.fov = stacked() ? 38 : 32;
    camera.updateProjectionMatrix();
    applyGoal(changed); // snap only when the frame really changed, never mid-scroll
    if (changed) wake?.();
  }
  // rotation: some browsers report the new size a beat late
  let settleTimer = 0;
  function onResize() {
    resize();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(resize, 320);
  }

  function homePose() {
    const i = Math.min(HOME_ORDER.length - 1, Math.floor(homeS));
    const f = homeS - i;
    const a = resolve(HOME_ORDER[i], W, H, camera.fov, Hs);
    if (i >= HOME_ORDER.length - 1 || f <= 0) return a;
    const b = resolve(HOME_ORDER[i + 1], W, H, camera.fov, Hs);
    return lerpPose(a, b, dwellEase(f));
  }

  function applyGoal(snap = false) {
    const pose = view === 'home' ? homePose() : resolve(station, W, H, camera.fov, Hs);
    if (snap || !rig.goal) rig.jump(pose); else rig.setGoal(pose);
  }

  // mouse parallax only: on touch screens pointermove fires while scrolling, which would jolt the camera
  function onPointerMove(e) {
    if (e.pointerType !== 'mouse') return;
    pointer[0] = (e.clientX / innerWidth) * 2 - 1;
    pointer[1] = -((e.clientY / innerHeight) * 2 - 1);
  }
  addEventListener('pointermove', onPointerMove, { passive: true });

  // ---- loop ----
  let last = performance.now(), running = true, frames = 0, slow = 0, ready = false, readyCb = null;
  // still mode counts *rendered* frames, not clock time, so a tab that was in the background (no
  // animation frames) still gets its settled frame when it comes back
  let wakeFrames = 180;
  let placed = false;
  const wake = (ms = 2600) => { wakeFrames = Math.max(wakeFrames, Math.round(ms / 16)); };
  const clock0 = performance.now();

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - clock0) / 1000;
    renderer.info.reset();

    // adaptive resolution: drop DPR if frames are consistently slow
    frames++;
    if (dt > 0.03) slow++;
    if (frames >= 90) {
      if (slow > 45 && dpr > 1) { dprDrop += 0.25; dpr = Math.max(1, fitDpr(W, H) - dprDrop); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); dust.setPixelRatio(dpr); }
      frames = 0; slow = 0;
    }

    // low-end phones on task pages: draw until the camera and scene settle, then hold that frame
    const still = tier === 'low' && (view === 'info' || view === 'size' || view === 'payment');
    if (still && wakeFrames <= 0) { last = now; return; }
    if (still) wakeFrames--;

    if (view === 'home') rig.setGoal(homePose());
    pointerSmooth[0] = damp(pointerSmooth[0], reducedMotion ? 0 : pointer[0], 2.5, dt);
    pointerSmooth[1] = damp(pointerSmooth[1], reducedMotion ? 0 : pointer[1], 2.5, dt);
    rig.parallax = view === 'home' ? pointerSmooth : [0, 0];
    const smooth = reducedMotion ? 0 : view === 'home' ? 0.38 : 0.85;
    rig.update(dt, smooth, W, H);
    world.aimLights(rig.focus, rig.spot);
    dust.update(t, rig.focus, dt);
    // keep the fog relative to how far back the camera stands (narrow phones frame from further away)
    const camDist = camera.position.distanceTo(rig.focus);
    scene.fog.near = Math.max(10, camDist * 0.85);
    scene.fog.far = scene.fog.near + 20;

    // exhibits
    const breathe = (g, ph) => { g.pivot.position.y = reducedMotion ? 0 : Math.sin(t * 0.7 + ph) * 0.025; };
    if (!reducedMotion) B.hero.garment.pivot.rotation.y = 0.5 + t * 0.16;
    if (!reducedMotion) B.color.garment.pivot.rotation.y = -0.35 + Math.sin(t * 0.3) * 0.35;
    if (!reducedMotion) B.teaser.garment.pivot.rotation.y = 0.2 + Math.sin(t * 0.35) * 0.32;
    breathe(B.hero.garment, 0.4); breathe(B.color.garment, 1.1); breathe(B.teaser.garment, 2.3);
    // (drop bays are framed photographs now; they don't float)

    // colorway scroll: blend through the five dyes
    const n = colorList.length;
    const ci = Math.min(n - 1, Math.max(0, colorT * (n - 1)));
    const ia = Math.floor(ci), f = ci - ia;
    const ca = COLORWAYS[colorList[ia]], cb = COLORWAYS[colorList[Math.min(n - 1, ia + 1)]];
    const mix = f < 0.35 ? 0 : f > 0.65 ? 1 : (f - 0.35) / 0.3;
    B.color.garment.setColor(mix < 0.5 ? ca.hex : cb.hex);

    for (const key of ['pdp', 'studio']) {
      const s = spin[key];
      if (!s.dragging) {
        if (Math.abs(s.vel) > 0.0001) { s.goal += s.vel * dt; s.vel *= Math.exp(-3.2 * dt); }
        s.rot = reducedMotion ? s.goal : damp(s.rot, s.goal, 6, dt);
      }
      B[key].garment.pivot.rotation.y = s.rot;
    }

    B.fitLineup.forEach((b, i) => {
      const goal = i === fitSel ? FIT_FRONT : FIT_BACK;
      b.group.position.z = reducedMotion || still ? goal : damp(b.group.position.z, goal, 4, dt);
    });
    if (view === 'size') {
      // the key light follows the chosen tee forward
      const sel = B.fitLineup[fitSel];
      world.aimLights(new THREE.Vector3(sel.x, TEE_Y, sel.group.position.z), rig.spot);
    }
    backstage.update(t, dt, !(reducedMotion || still), helpPage);

    for (const g of world.garments()) g.update(dt);

    stages.renderCopies(dt, t, W, H, reducedMotion);
    renderer.setViewport(0, 0, W, H);
    // in the shop the hall recedes as the grid scrolls over it; in auth it softens; behind the
    // help pages it is a dim backdrop
    const dimGoal = view === 'shop' ? 1 - 0.6 * Math.min(1, scrollY / (H * 0.7)) : view === 'auth' ? 0.7 : view === 'info' ? 1.25 : 1;
    dim = reducedMotion ? dimGoal : damp(dim, dimGoal, 6, dt);
    renderer.toneMappingExposure = dim;
    if (!occluded) renderer.render(scene, camera);
    renderer.toneMappingExposure = 1;
    stages.render(dt, t, W, H, reducedMotion);

    if (!ready) { ready = true; readyCb && readyCb(); }
  }

  resize();
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  requestAnimationFrame(frame);

  // for React: call from the effect cleanup (StrictMode mounts twice in dev)
  function dispose() {
    running = false;
    clearTimeout(settleTimer);
    removeEventListener('resize', onResize);
    removeEventListener('orientationchange', onResize);
    removeEventListener('pointermove', onPointerMove);
    pSmall.remove(); pLarge.remove();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { mm.map?.dispose?.(); mm.dispose?.(); });
    });
    renderer.dispose();
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.documentElement.classList.remove('gl-ready'); });

  const project = (() => {
    const v = new THREE.Vector3();
    return (x, y, z) => {
      v.set(x, y, z).project(camera);
      return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z];
    };
  })();

  return {
    onReady(cb) { if (ready) cb(); else readyCb = cb; },
    wake,
    dispose,
    setView(name, st) {
      view = name; station = st || name;
      helpPage = name === 'info' ? String(station).replace(/Read$/, '') : null;
      // the first page after the hall loads starts in place; later page changes walk
      wake(); applyGoal(!placed); placed = true;
    },
    setStation(st) { station = st; if (view === 'info') helpPage = String(st).replace(/Read$/, ''); wake(); applyGoal(); },
    // long documents (privacy, terms): while reading, frame the object in a window of the page
    // (fractions of the viewport), e.g. under the table of contents
    setReadArea(page, rect) {
      const base = STATIONS[page];
      if (!base || !rect) return;
      STATIONS[`${page}Read`] = { ...base, area: { desk: rect, mob: base.area.mob, tab: base.area.tab } };
    },
    setOccluded(v) { occluded = !!v; },
    setHomeProgress(s, ct) { homeS = s; colorT = ct; },
    setColorList(list) { colorList = list; },
    dropAnchors() { return B.drop.map((b) => project(b.x, b.anchorY ?? 0.42, b.anchorZ ?? 0.6)); },
    // Hang up to three photographs (URLs) in the Quiet Hours frames, left to right.
    // Re-hanging the same list is a no-op, so pages can call this on every render.
    setDropPhotos(urls) {
      B.drop.forEach((b, i) => {
        const src = urls[i] || null;
        if (!src || hungPhotos[i] === src) return;
        hungPhotos[i] = src;
        b.setPhoto(src, aniso);
      });
    },
    stages,
    prints,
    dressPdp(productOrId, colorId = 'noir', immediate = true) {
      let p = typeof productOrId === 'object' && productOrId !== null ? productOrId : productById(productOrId);
      if (!p) {
        p = { name: String(productOrId || 'Velvetwolf'), color: colorId || 'noir' };
      }
      const colorKey = colorId || p.color || 'noir';
      const cw = COLORWAYS[colorKey] || Object.values(COLORWAYS).find((c) => c.site?.toLowerCase() === colorKey?.toLowerCase()) || COLORWAYS.noir;
      B.pdp.garment.setColor(cw.hex, immediate);
      B.pdp.garment.setInk(cw.ink, immediate);
      if (p.front) B.pdp.garment.setPrint('front', prints.get(p.front));
      else B.pdp.garment.setPrint('front', null);
      if (p.back) B.pdp.garment.setPrint('back', prints.get(p.back));
      else B.pdp.garment.setPrint('back', null);
      if (p.name) world.setPdpWall(p.name);
    },
    // payment pages: 'idle' | 'gather' (paid) | 'orbit' (waiting) | 'fall' (failed)
    setStars(mode) { dust.setMode(mode, new THREE.Vector3(B.pdp.x, TEE_Y, 0)); },
    // the ordered tee on the product stage behind the payment card: a plain tee in the
    // order's colour (site colour name or colourway id), the wall says VELVETWOLF
    dressPayment(color = 'noir', wall = 'VELVETWOLF') {
      const cw = COLORWAYS[color] || Object.values(COLORWAYS).find((c) => c.site.toLowerCase() === String(color).toLowerCase()) || COLORWAYS.noir;
      B.pdp.garment.setColor(cw.hex, true);
      B.pdp.garment.setInk(cw.ink, true);
      B.pdp.garment.setPrint('front', null);
      B.pdp.garment.setPrint('back', null);
      world.setPdpWall(wall);
      spin.pdp.goal = spin.pdp.rot = 0;
    },
    // size guide: screen positions of points given in the fit tee's own units
    fitProject(points) {
      const b = B.fitLineup[fitSel], s = b.scale, z0 = b.group.position.z;
      return points.map(([x, y, z]) => project(b.x + x * s, TEE_Y + y * s, z0 + z * s));
    },
    // size guide: index 0..4 (S..XXL) steps forward; the camera walks along the line-up to it
    // size guide: where each size's letter sits on screen (just above the rail)
    fitLabels() {
      return B.fitLineup.map((b) => project(b.x, TEE_Y + 1.48, b.group.position.z));
    },
    setFitSelected(i) {
      fitSel = Math.max(0, Math.min(B.fitLineup.length - 1, i));
      const x = B.fitLineup[fitSel].x;
      STATIONS.sizeGuide.target[0] = x;
      STATIONS.sizeGuide.focus[0] = x;
      wake(); if (view === 'size') applyGoal();
    },
    // help pages: each back-of-house object's controls (contact.set({open}), track.set({stage})…)
    help: Object.fromEntries(Object.entries(backstage).filter(([, v]) => v && typeof v === 'object' && v.group).map(([k, v]) => [k, {
      set: (state) => { v.set(state); wake(); },
      ...(v.send ? { send: () => { v.send(); wake(3200); } } : {}),
    }])),
    dressTeaser(texture, colorId = 'noir') {
      const cw = COLORWAYS[colorId];
      B.teaser.garment.setColor(cw.hex, true);
      B.teaser.garment.setInk(cw.ink, true);
      B.teaser.garment.setPrint('front', texture);
    },
    studio: B.studio.garment,
    face(key, side) { const s = spin[key]; s.vel = 0; s.goal = nearestAngle(s.rot, side === 'back' ? Math.PI : 0); },
    dragStart(key) { const s = spin[key]; s.dragging = true; s.vel = 0; },
    dragMove(key, dx, dt) { const s = spin[key]; const d = dx * 0.0085; s.rot += d; s.goal = s.rot; s.vel = dt > 0 ? d / dt : 0; },
    dragEnd(key) { const s = spin[key]; s.dragging = false; s.vel = Math.max(-6, Math.min(6, s.vel)); },
    redrawText() { prints.redrawAll(); world.redrawLettering(); backstage.redrawText(); },
    get mobile() { return stacked(); },
    tier,
    debug() { return { stars: +dust.points.material.uniforms.uGather.value.toFixed(3), fall: +dust.points.material.uniforms.uFall.value.toFixed(3), tier, dpr, W, H, Hs, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, view, station, homeS, colorT, cam: camera.position.toArray().map((v) => +v.toFixed(2)), goal: rig.goal }; },
    settle() {
      applyGoal(true);
      for (const k of ['pdp', 'studio']) spin[k].rot = spin[k].goal;
      for (const g of world.garments()) { g.fabric.color.copy(g.targetColor); g.syncInside(); }
    },
    TEE_Y,
  };
}
