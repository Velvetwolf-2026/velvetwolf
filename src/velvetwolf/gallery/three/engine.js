// One renderer, one fixed canvas behind the page. Owns the loop, quality scaling and the
// public API the UI talks to. Framework-free on purpose so it can sit under React later.
import * as THREE from 'three';
import { buildKit } from './garment.js';
import { knitTexture } from './textures.js';
import { createPrintLibrary } from './prints.js';
import { buildWorld, TEE_Y } from './world.js';
import { Rig, resolve, lerpPose, dwellEase, layoutOf } from './rig.js';
import { createStages } from './stages.js';
import { createGoldDust } from './dust.js';
import { damp, nearestAngle } from './util.js';
import { COLORWAYS, DROP_TRIO, productById } from '../data.js';

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
    bays: [B.hero, ...B.drop, B.color, B.craft, B.teaser, B.pdp, B.studio].map((b) => b.x),
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
    garment.setPrint('front', prints.get(p.front));
    garment.setPrint('back', prints.get(p.back));
  }
  dress(B.hero.garment, 'nocturne', 'noir');
  DROP_TRIO.forEach((d, i) => dress(B.drop[i].garment, d.id, d.color));
  dress(B.color.garment, 'essential', 'noir');
  dress(B.craft.garment, 'silence', 'bone');
  // On the home page the drop bays hold real product photos (positioned from
  // dropFrames()), so the house tees there only appear as the shop backdrop.
  const setDropTees = (visible) => B.drop.forEach((b) => { b.garment.group.visible = visible; });
  setDropTees(false);

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

    if (view === 'home') rig.setGoal(homePose());
    pointerSmooth[0] = damp(pointerSmooth[0], reducedMotion ? 0 : pointer[0], 2.5, dt);
    pointerSmooth[1] = damp(pointerSmooth[1], reducedMotion ? 0 : pointer[1], 2.5, dt);
    rig.parallax = view === 'home' ? pointerSmooth : [0, 0];
    const smooth = reducedMotion ? 0 : view === 'home' ? 0.38 : 0.85;
    rig.update(dt, smooth, W, H);
    world.aimLights(rig.focus, rig.spot);
    dust.update(t, rig.focus);
    // keep the fog relative to how far back the camera stands (narrow phones frame from further away)
    const camDist = camera.position.distanceTo(rig.focus);
    scene.fog.near = Math.max(10, camDist * 0.85);
    scene.fog.far = scene.fog.near + 20;

    // exhibits
    const breathe = (g, ph) => { g.pivot.position.y = reducedMotion ? 0 : Math.sin(t * 0.7 + ph) * 0.025; };
    if (!reducedMotion) B.hero.garment.pivot.rotation.y = 0.5 + t * 0.16;
    B.drop.forEach((b, i) => breathe(b.garment, i));
    if (!reducedMotion) B.color.garment.pivot.rotation.y = -0.35 + Math.sin(t * 0.3) * 0.35;
    if (!reducedMotion) B.teaser.garment.pivot.rotation.y = 0.2 + Math.sin(t * 0.35) * 0.32;
    breathe(B.hero.garment, 0.4); breathe(B.color.garment, 1.1); breathe(B.teaser.garment, 2.3);

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

    for (const g of world.garments()) g.update(dt);

    stages.renderCopies(dt, t, W, H, reducedMotion);
    renderer.setViewport(0, 0, W, H);
    // in the shop the hall recedes as the grid scrolls over it
    const dimGoal = view === 'shop' ? 1 - 0.6 * Math.min(1, scrollY / (H * 0.7)) : 1;
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
    dispose,
    setView(name, st) { view = name; station = st || name; setDropTees(name === 'shop'); applyGoal(); },
    setStation(st) { station = st; applyGoal(); },
    setOccluded(v) { occluded = !!v; },
    setHomeProgress(s, ct) { homeS = s; colorT = ct; },
    setColorList(list) { colorList = list; },
    dropAnchors() { return B.drop.map((b) => project(b.x, 0.42, 0.6)); },
    // Screen-space frame of each drop bay's exhibit (where a tee would float):
    // [centreX, top, bottom] in CSS pixels, for pinning product photos into the pools.
    dropFrames() {
      return B.drop.map((b) => {
        const top = project(b.x, TEE_Y + 0.98, 0);
        const bottom = project(b.x, TEE_Y - 0.98, 0);
        return [top[0], top[1], bottom[1]];
      });
    },
    stages,
    prints,
    dressPdp(productId, colorId, immediate) {
      dress(B.pdp.garment, productId, colorId, immediate);
      world.setPdpWall(productById(productId).name);
    },
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
    redrawText() { prints.redrawAll(); world.redrawLettering(); },
    get mobile() { return stacked(); },
    tier,
    debug() { return { tier, dpr, W, H, Hs, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, view, station, homeS, colorT, cam: camera.position.toArray().map((v) => +v.toFixed(2)), goal: rig.goal }; },
    settle() {
      applyGoal(true);
      for (const k of ['pdp', 'studio']) spin[k].rot = spin[k].goal;
      for (const g of world.garments()) { g.fabric.color.copy(g.targetColor); g.syncInside(); }
    },
    TEE_Y,
  };
}
