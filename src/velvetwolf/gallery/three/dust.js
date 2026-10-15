// Lite gold stars: a sparse field of small four-point sparkles drifting through the hall. They glow
// brightest in the light around the exhibit in focus, twinkle slowly, and are kept out of the space
// around and in front of each tee so they never sit on the product.
import * as THREE from 'three';
import { rng } from './util.js';

export function createGoldDust(scene, { bays, count = 1400, reduced = false, pixelRatio = 1 } = {}) {
  const r = rng(2027);
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const speed = new Float32Array(count);

  // a tee occupies roughly |x - bayX| < 1.0 around z = 0; keep its silhouette and the air in front clear
  const blocked = (x, z) => bays.some((bx) => Math.abs(x - bx) < 1.25 && z > -0.85);

  let n = 0;
  while (n < count) {
    const clustered = r() < 0.65;
    const bx = bays[Math.floor(r() * bays.length)];
    const x = clustered ? bx + (r() - 0.5) * 7 : -8 + r() * 90;
    const z = clustered ? -5.4 + r() * 8 : -5.6 + r() * 9;
    if (blocked(x, z)) continue;
    pos[n * 3] = x;
    pos[n * 3 + 1] = 0.3 + r() * 6;
    pos[n * 3 + 2] = z;
    phase[n] = r();
    // mostly tiny stars, about one in eight a little larger
    size[n] = r() < 0.12 ? 1.6 + r() * 1.2 : 0.6 + r() * 0.7;
    speed[n] = 0.6 + r() * 0.8;
    n++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMotion: { value: reduced ? 0 : 1 },
      uFocus: { value: new THREE.Vector3() },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new THREE.Color('#F0D9A2') }, // pale champagne gold
      uStrength: { value: 3.4 },
      // payment pages: a share of the stars gathers into a halo around the tee (paid), circles it
      // (waiting on the bank) or sinks and dims (failed)
      uCenter: { value: new THREE.Vector3() },
      uGather: { value: 0 },
      uOrbit: { value: 0 },
      uFall: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase; attribute float aSize; attribute float aSpeed;
      uniform float uTime, uMotion, uPixelRatio, uGather, uOrbit, uFall;
      uniform vec3 uFocus, uCenter;
      varying float vAlpha; varying float vTwinkle;
      void main() {
        vec3 p = position;
        float t = uTime * uMotion;
        p.x += sin(t * 0.11 * aSpeed + aPhase * 6.283) * 0.14;
        p.z += cos(t * 0.09 * aSpeed + aPhase * 4.1) * 0.14;
        p.y = mod(p.y - 0.3 - t * 0.02 * aSpeed, 6.0) + 0.3;   // a very slow fall, wrapping to the top
        // halo: about 6 in 10 stars from the surrounding hall fly to an ellipse around the tee, and grow
        float near = 1.0 - smoothstep(9.0, 16.0, distance(position.xz, uCenter.xz));
        float g = uGather * step(aPhase, 0.62) * near;
        float arrive = clamp(g * 1.5 - fract(aPhase * 5.3) * 0.5, 0.0, 1.0);
        arrive = arrive * arrive * (3.0 - 2.0 * arrive);
        float ang = aPhase * 6.2831 * 7.0 + t * (0.05 + 0.35 * uOrbit) * aSpeed;
        float rad = 1.2 + 0.36 * fract(aPhase * 13.7);
        vec3 ring = uCenter + vec3(cos(ang) * rad, sin(ang) * rad * 1.18, 0.35 + 0.3 * fract(aPhase * 7.1));
        p = mix(p, ring, arrive);
        // failed: the stars sink and fade
        p.y -= uFall * (0.6 + aSpeed) * 1.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // stars show everywhere, a little brighter in the light around the exhibit in focus
        float d = distance(p.xz, uFocus.xz);
        float lit = 0.4 + 0.6 * (1.0 - smoothstep(1.0, 4.5, d));
        // slow twinkle: each star swells and fades on its own rhythm
        float tw = 0.5 + 0.5 * sin(uTime * 0.9 * aSpeed + aPhase * 31.0);
        vTwinkle = mix(0.6, tw * tw, uMotion);
        lit = mix(lit, 1.7, arrive);
        vAlpha = lit * (0.35 + 0.65 * vTwinkle) * smoothstep(0.3, 1.0, p.y) * (1.0 - smoothstep(5.3, 6.3, p.y)) * (1.0 - 0.75 * uFall);
        gl_PointSize = aSize * mix(1.0, 1.9, arrive) * uPixelRatio * (46.0 / max(0.5, -mv.z));
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength;
      varying float vAlpha; varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r2 = dot(c, c);
        float core = exp(-r2 * 90.0);
        // four thin rays that lengthen as the star brightens
        float len = 0.18 + 0.32 * vTwinkle;
        float rx = exp(-abs(c.y) * 55.0) * (1.0 - smoothstep(0.0, len, abs(c.x)));
        float ry = exp(-abs(c.x) * 55.0) * (1.0 - smoothstep(0.0, len, abs(c.y)));
        float a = (core + (rx + ry) * 0.55) * vAlpha * uStrength;
        if (a < 0.004) discard;
        // white-hot centre, gold rays
        vec3 col = mix(uColor, vec3(1.0), core * 0.35);
        gl_FragColor = vec4(col * a, a);
        #include <colorspace_fragment>
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  scene.add(points);

  // eased towards the goal each frame; reduced motion jumps straight there
  const goal = { gather: 0, orbit: 0, fall: 0 };
  const U = mat.uniforms;
  return {
    points,
    update(t, focus, dt = 0.016) {
      U.uTime.value = t;
      U.uFocus.value.copy(focus);
      const k = reduced ? 1 : 1 - Math.exp(-dt * 1.6);
      U.uGather.value += (goal.gather - U.uGather.value) * k;
      U.uOrbit.value += (goal.orbit - U.uOrbit.value) * k;
      U.uFall.value += (goal.fall - U.uFall.value) * k;
    },
    // mode: 'idle' | 'gather' | 'orbit' | 'fall'
    setMode(mode, center) {
      if (center) U.uCenter.value.copy(center);
      goal.gather = mode === 'gather' ? 1 : mode === 'orbit' ? 0.75 : 0;
      goal.orbit = mode === 'orbit' ? 1 : mode === 'gather' ? 0.12 : 0;
      goal.fall = mode === 'fall' ? 1 : 0;
    },
    setPixelRatio(v) { mat.uniforms.uPixelRatio.value = v; },
  };
}
