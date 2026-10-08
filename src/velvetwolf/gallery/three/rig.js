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
  drop:      { target: [12, 1.3, 0],     dir: [0, 0.13, 1],     frame: [8.4, 2.9], focus: [12, 1.5, 0],   spot: 0.66, area: area([0.04, 0.22, 0.96, 0.8], [0.0, 0.34, 1.0, 0.7], [0.02, 0.3, 0.98, 0.72]) },
  color:     { target: [26, 1.45, 0],    dir: [-0.3, 0.07, 1],  frame: [2.5, 2.8], focus: [26, 1.62, 0],  spot: 0.42, area: area([0.48, 0.08, 0.98, 0.96], [0.02, 0.06, 0.98, 0.5], [0.1, 0.07, 0.9, 0.6]) },
  craft:     { target: [36.05, 1.95, 0.3], dir: [0.22, 0.12, 1], frame: [1.7, 1.7], focus: [36, 1.8, 0], spot: 0.42, area: area([0.5, 0.06, 1.0, 0.96], [0.0, 0.06, 1.0, 0.5], [0.06, 0.06, 0.94, 0.6]) },
  teaser:    { target: [46, 1.45, 0],    dir: [0.16, 0.07, 1],  frame: [2.5, 2.9], focus: [46, 1.62, 0],  spot: 0.42, area: area([0.48, 0.08, 0.98, 0.96], [0.02, 0.06, 0.98, 0.5], [0.1, 0.07, 0.9, 0.58]) },
  shop:      { target: [12, 1.1, 0],     dir: [-0.62, 0.5, 1],  frame: [15, 5.5],  focus: [12, 1.5, 0],   spot: 0.7,  area: area([0, 0.06, 1, 0.6], [0, 0.04, 1, 0.42]) },
  pdp:       { target: [60, 1.5, 0],     dir: [0.0, 0.1, 1],    frame: [2.5, 2.9], focus: [60, 1.62, 0],  spot: 0.42, area: area('panel', [0.0, 0.08, 1.0, 0.56], [0.1, 0.07, 0.9, 0.6]) },
  pdpDetail: { target: [60, 2.05, 0.38], dir: [0.28, 0.08, 1],  frame: [0.8, 0.8], focus: [60, 1.8, 0],   spot: 0.42, area: area('panel', [0.0, 0.06, 1.0, 0.56], [0.0, 0.06, 1.0, 0.6]) },
  // stacked Studio pins the preview to the top of the screen while the tools scroll under it
  studio:    { target: [72, 1.5, 0],     dir: [0.0, 0.1, 1],    frame: [2.5, 2.9], focus: [72, 1.62, 0],  spot: 0.42, area: area('panel', [0.04, 0.075, 0.96, 0.43], [0.1, 0.07, 0.9, 0.48]) },
};

const _v = new THREE.Vector3();

// Resolve a station for the current viewport into a concrete pose.
// W x H is the canvas (sized to the large viewport so mobile toolbars never resize it);
// Hs is the visible height with the toolbars shown, which is what the layout is built on.
export function resolve(name, W, H, fovDeg, Hs = H) {
  const s = STATIONS[name];
  const L = layoutOf(W, Hs);
  let a = !L.stacked ? s.area.desk : L.tablet ? s.area.tab : s.area.mob;
  if (a === 'panel') a = [0.02, 0.1, Math.max(0.3, (W - L.panelW) / W) - 0.02, 0.96];
  const k = Hs / H;
  const [x0, , x1] = a;
  const y0 = a[1] * k, y1 = a[3] * k;
  const tan = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const aspect = W / H;
  const dist = Math.max(
    s.frame[1] / 2 / (tan * (y1 - y0)),
    s.frame[0] / 2 / (tan * aspect * (x1 - x0))
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
