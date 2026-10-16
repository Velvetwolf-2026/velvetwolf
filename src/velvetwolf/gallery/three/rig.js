// Camera rig. Every view is a "station": a target, a viewing direction, the size of what must
// fit, and the part of the screen it should occupy. The rig springs between stations, so a route
// change is a walk through the gallery rather than a page load.
import * as THREE from 'three';
import { Spring, lerp, smoothstep } from './util.js';

// Layout tiers. Keep these in step with the media queries in app.css.
//  stacked: phones, and tablets held upright. The 3D stage sits above the content.
//  side:    landscape tablets, laptops, desktops. Content sits beside the stage.
export const MOBILE_BREAK = 820;   // below this width, always stacked
export const PORTRAIT_MAX = 1200;  // upright screens narrower than this stack too (iPad portrait)
export const TABLET_MIN = 600;     // stacked screens this wide get the tablet framing
export function layoutOf(W, H) {
  const portrait = H >= W;
  // phones on their side (short landscape) use the side layout, compacted in CSS
  const stacked = (W < MOBILE_BREAK && (H >= 500 || portrait)) || (portrait && W < PORTRAIT_MAX);
  return {
    stacked,
    tablet: stacked && W >= TABLET_MIN,
    panelW: W < 1280 ? 380 : 460, // vitrine panel width in the side layout (--panel-w in app.css)
  };
}

// area: the part of the screen the subject should fill, as [x0, y0, x1, y1] fractions of the
// visible viewport. desk = side layout, mob = stacked phone, tab = stacked tablet.
const area = (desk, mob, tab = mob) => ({ desk, mob, tab });
export const STATIONS = {
  hero:      { target: [0, 1.42, 0],     dir: [0.34, 0.1, 1],   frame: [2.5, 3.0], focus: [0, 1.62, 0],   spot: 0.42, area: area([0.46, 0.1, 0.98, 0.96], [0.02, 0.07, 0.98, 0.52], [0.1, 0.08, 0.9, 0.66]) },
  // three framed photos; on phones and tablets the side frames run off the edges and peek in
  drop:      { target: [12, 1.62, 0],    dir: [0, 0.1, 1],      frame: [9.4, 3.1], frameMob: [4.6, 3.1], frameTab: [7.2, 3.1], focus: [12, 1.6, 0],   spot: 0.66, area: area([0.04, 0.22, 0.96, 0.8], [0.0, 0.34, 1.0, 0.7], [0.02, 0.3, 0.98, 0.72]) },
  color:     { target: [26, 1.45, 0],    dir: [-0.3, 0.07, 1],  frame: [2.5, 2.8], focus: [26, 1.62, 0],  spot: 0.42, area: area([0.48, 0.08, 0.98, 0.96], [0.02, 0.06, 0.98, 0.5], [0.1, 0.07, 0.9, 0.6]) },
  craft:     { target: [36.05, 1.95, 0.3], dir: [0.22, 0.12, 1], frame: [1.7, 1.7], focus: [36, 1.8, 0], spot: 0.42, area: area([0.5, 0.06, 1.0, 0.96], [0.0, 0.06, 1.0, 0.5], [0.06, 0.06, 0.94, 0.6]) },
  teaser:    { target: [46, 1.45, 0],    dir: [0.16, 0.07, 1],  frame: [2.5, 2.9], focus: [46, 1.62, 0],  spot: 0.42, area: area([0.48, 0.08, 0.98, 0.96], [0.02, 0.06, 0.98, 0.5], [0.1, 0.07, 0.9, 0.58]) },
  shop:      { target: [12, 1.1, 0],     dir: [-0.62, 0.5, 1],  frame: [15, 5.5],  focus: [12, 1.5, 0],   spot: 0.7,  area: area([0, 0.06, 1, 0.6], [0, 0.04, 1, 0.42]) },
  pdp:       { target: [60, 1.5, 0],     dir: [0.0, 0.1, 1],    frame: [2.5, 2.9], focus: [60, 1.62, 0],  spot: 0.42, area: area('panel', [0.0, 0.08, 1.0, 0.56], [0.1, 0.07, 0.9, 0.6]) },
  pdpDetail: { target: [60, 2.05, 0.38], dir: [0.28, 0.08, 1],  frame: [0.8, 0.8], focus: [60, 1.8, 0],   spot: 0.42, area: area('panel', [0.0, 0.06, 1.0, 0.56], [0.0, 0.06, 1.0, 0.6]) },
  // sign in: the hero tee turns on the left while the form sits on the right (small, above it when stacked)
  auth:      { target: [0, 1.42, 0],     dir: [-0.2, 0.1, 1],   frame: [2.5, 3.0], focus: [0, 1.62, 0],   spot: 0.42, area: area([0.04, 0.12, 0.5, 0.94], [0.28, 0.075, 0.72, 0.3], [0.32, 0.07, 0.68, 0.3]) },
  // stacked Studio pins the preview to the top of the screen while the tools scroll under it
  studio:    { target: [72, 1.5, 0],     dir: [0.0, 0.1, 1],    frame: [2.5, 2.9], focus: [72, 1.62, 0],  spot: 0.42, area: area('panel', [0.04, 0.075, 0.96, 0.43], [0.1, 0.07, 0.9, 0.48]) },
  // payment status: the ordered tee on the product stage, the status card beside it
  payment:   { target: [60, 1.5, 0],     dir: [0.18, 0.1, 1],   frame: [3.6, 3.6], focus: [60, 1.62, 0],  spot: 0.48, area: area([0.04, 0.1, 0.52, 0.94], [0.2, 0.075, 0.8, 0.34], [0.28, 0.07, 0.72, 0.36]) },
  // several tees ordered: the cards fan out, so the frame is wider
  paymentMany: { target: [60, 1.55, 0],  dir: [0.1, 0.08, 1],   frame: [4.3, 2.7], focus: [60, 1.62, 0],  spot: 0.7,  area: area([0.02, 0.1, 0.56, 0.94], [0.0, 0.075, 1.0, 0.34], [0.1, 0.07, 0.9, 0.36]) },
  // size guide: the line-up of sizes; the camera centres on the chosen tee (the engine moves
  // target/focus x) and frames its neighbours either side for comparison
  sizeGuide: { target: [84, 1.95, 0.0],  dir: [0.0, 0.06, 1],   frame: [5.4, 3.35], focus: [84, 1.62, 0.1], spot: 0.42, area: 'panel', areaStack: true },
  // back of house: one object per help page, framed beside the page header (above it when stacked)
  contact:   { target: [102, 0.95, 0.1], dir: [0.3, 0.34, 1],  frame: [2.7, 2.1],  focus: [102, 1.2, 0],   spot: 0.5,  area: area([0.5, 0.1, 0.98, 0.66], [0.06, 0.07, 0.94, 0.36], [0.16, 0.06, 0.84, 0.4]) },
  faq:       { target: [116, 0.95, 0.3], dir: [-0.45, 0.14, 1], frame: [1.9, 2.15], focus: [116, 1.2, 0.3], spot: 0.5,  area: area([0.5, 0.1, 0.98, 0.66], [0.06, 0.07, 0.94, 0.36], [0.16, 0.06, 0.84, 0.4]) },
  track:     { target: [131.9, 1.0, -1.4], dir: [0.6, 0.34, 1], frame: [5.2, 4.0], focus: [132, 0.4, -0.8], spot: 1.0, area: area([0.46, 0.1, 0.99, 0.66], [0.0, 0.07, 1.0, 0.36], [0.04, 0.06, 0.96, 0.4]) },
  shipping:  { target: [152.1, 0.3, 0], dir: [-0.22, 0.75, 1], frame: [10.2, 2.6], focus: [152, 0.3, 0],   spot: 1.0, area: area([0.46, 0.1, 0.99, 0.66], [0.0, 0.07, 1.0, 0.36], [0.04, 0.06, 0.96, 0.4]) },
  returns:   { target: [170, 0.15, 0.1], dir: [0.0, 0.8, 1],    frame: [4.0, 3.0],  focus: [170, 0.2, 0],   spot: 0.8, area: area([0.5, 0.1, 0.98, 0.66], [0.06, 0.07, 0.94, 0.36], [0.16, 0.06, 0.84, 0.4]) },
  privacy:   { target: [186, 1.2, 0],    dir: [0.3, 0.16, 1],   frame: [1.85, 1.3], focus: [186, 1.25, 0],   spot: 0.48, area: area([0.5, 0.1, 0.98, 0.66], [0.06, 0.07, 0.94, 0.36], [0.16, 0.06, 0.84, 0.4]) },
  terms:     { target: [200, 1.72, 0],   dir: [-0.22, 0.16, 1], frame: [1.25, 2.45],  focus: [200, 1.25, 0],   spot: 0.48, area: area([0.5, 0.1, 0.98, 0.66], [0.06, 0.07, 0.94, 0.36], [0.16, 0.06, 0.84, 0.4]) },
  // help pages: the hall as a dim backdrop behind the page header
  route:     { target: [26, 1.7, -0.5],  dir: [-0.85, 0.16, 0.5], frame: [5, 3.4], focus: [26, 1.62, 0], spot: 0.6,  area: area([0.42, 0.06, 1.0, 0.62], [0.0, 0.04, 1.0, 0.4]) },
  frames:    { target: [12, 1.7, 0],     dir: [0.42, 0.1, 1],   frame: [10, 3.6], focus: [12, 1.6, 0],  spot: 0.66, area: area([0.42, 0.06, 1.0, 0.62], [0.0, 0.04, 1.0, 0.4]) },
  quiet:     { target: [36, 1.8, 0],     dir: [0.3, 0.08, 1],   frame: [5, 3.4],  focus: [36, 1.8, 0],  spot: 0.42, area: area([0.46, 0.06, 1.0, 0.62], [0.0, 0.04, 1.0, 0.4]) },
};

const _v = new THREE.Vector3();

// Resolve a station for the current viewport into a concrete pose.
// W x H is the canvas (sized to the large viewport so mobile toolbars never resize it);
// Hs is the visible height with the toolbars shown, which is what the layout is built on.
export function resolve(name, W, H, fovDeg, Hs = H) {
  const s = STATIONS[name];
  const L = layoutOf(W, Hs);
  let a = s.area === 'panel' && s.areaStack
    ? (L.stacked ? (L.tablet ? [0.08, 0.07, 0.92, 0.56] : [0.0, 0.07, 1.0, 0.52]) : 'panel')
    : !L.stacked ? s.area.desk : L.tablet ? s.area.tab : s.area.mob;
  if (a === 'panel') a = [0.02, 0.1, Math.max(0.3, (W - L.panelW) / W) - 0.02, 0.96];
  const fr = (L.stacked && (L.tablet ? s.frameTab : s.frameMob)) || s.frame;
  const k = Hs / H;
  const [x0, , x1] = a;
  const y0 = a[1] * k, y1 = a[3] * k;
  const tan = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const aspect = W / H;
  const dist = Math.max(
    fr[1] / 2 / (tan * (y1 - y0)),
    fr[0] / 2 / (tan * aspect * (x1 - x0))
  ) * 1.06;
  _v.set(...s.dir).normalize();
  return {
    target: [...s.target],
    dir: [_v.x, _v.y, _v.z],
    dist,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    focus: [...s.focus],
    spot: s.spot,
  };
}

export function lerpPose(a, b, t) {
  const L = (p, q) => p.map((v, i) => lerp(v, q[i], t));
  return {
    target: L(a.target, b.target), dir: L(a.dir, b.dir), dist: lerp(a.dist, b.dist, t),
    cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), focus: L(a.focus, b.focus), spot: lerp(a.spot, b.spot, t),
  };
}

// Hold on each station for most of its scroll segment, travel in the middle.
export const dwellEase = (t) => smoothstep(0.08, 0.92, t);

export class Rig {
  constructor(camera) {
    this.camera = camera;
    this.keys = ['tx', 'ty', 'tz', 'dx', 'dy', 'dz', 'dist', 'cx', 'cy', 'fx', 'fy', 'fz', 'spot'];
    this.s = Object.fromEntries(this.keys.map((k) => [k, new Spring(0)]));
    this.goal = null;
    this.parallax = [0, 0];
    this.focus = new THREE.Vector3();
  }
  flat(p) {
    return { tx: p.target[0], ty: p.target[1], tz: p.target[2], dx: p.dir[0], dy: p.dir[1], dz: p.dir[2], dist: p.dist, cx: p.cx, cy: p.cy, fx: p.focus[0], fy: p.focus[1], fz: p.focus[2], spot: p.spot };
  }
  jump(p) { this.goal = this.flat(p); for (const k of this.keys) this.s[k].set(this.goal[k]); }
  setGoal(p) { this.goal = this.flat(p); }
  update(dt, smoothTime, W, H) {
    if (!this.goal) return;
    const v = {};
    for (const k of this.keys) v[k] = this.s[k].step(this.goal[k], smoothTime, dt);
    const dir = _v.set(v.dx, v.dy, v.dz).normalize();
    const tx = v.tx + this.parallax[0] * 0.14, ty = v.ty + this.parallax[1] * 0.08;
    this.camera.position.set(tx + dir.x * v.dist, ty + dir.y * v.dist, v.tz + dir.z * v.dist);
    this.camera.lookAt(tx, ty, v.tz);
    this.camera.setViewOffset(W, H, (0.5 - v.cx) * W, (0.5 - v.cy) * H, W, H);
    this.focus.set(v.fx, v.fy, v.fz);
    this.spot = v.spot;
  }
}
