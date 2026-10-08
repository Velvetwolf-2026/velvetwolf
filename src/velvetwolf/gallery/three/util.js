export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// Critically damped spring (Unity-style SmoothDamp) for one scalar.
export class Spring {
  constructor(v = 0) { this.v = v; this.vel = 0; }
  step(target, smoothTime, dt) {
    if (smoothTime <= 0.0001) { this.v = target; this.vel = 0; return this.v; }
    const omega = 2 / smoothTime;
    const x = omega * dt;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = this.v - target;
    const temp = (this.vel + omega * change) * dt;
    this.vel = (this.vel - omega * temp) * exp;
    this.v = target + (change + temp) * exp;
    return this.v;
  }
  set(v) { this.v = v; this.vel = 0; }
}

// Seeded random for repeatable procedural textures.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shortest-path angle target so a turn never spins the long way round.
export function nearestAngle(current, target) {
  const tau = Math.PI * 2;
  let d = (target - current) % tau;
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return current + d;
}
