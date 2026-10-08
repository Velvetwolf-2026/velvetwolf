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
    },
    vertexShader: /* glsl */ `
      attribute float aPhase; attribute float aSize; attribute float aSpeed;
      uniform float uTime, uMotion, uPixelRatio;
      uniform vec3 uFocus;
      varying float vAlpha; varying float vTwinkle;
      void main() {
        vec3 p = position;
        float t = uTime * uMotion;
        p.x += sin(t * 0.11 * aSpeed + aPhase * 6.283) * 0.14;
        p.z += cos(t * 0.09 * aSpeed + aPhase * 4.1) * 0.14;
        p.y = mod(p.y - 0.3 - t * 0.02 * aSpeed, 6.0) + 0.3;   // a very slow fall, wrapping to the top
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // stars show everywhere, a little brighter in the light around the exhibit in focus
        float d = distance(p.xz, uFocus.xz);
        float lit = 0.4 + 0.6 * (1.0 - smoothstep(1.0, 4.5, d));
        // slow twinkle: each star swells and fades on its own rhythm
        float tw = 0.5 + 0.5 * sin(uTime * 0.9 * aSpeed + aPhase * 31.0);
        vTwinkle = mix(0.6, tw * tw, uMotion);
        vAlpha = lit * (0.35 + 0.65 * vTwinkle) * smoothstep(0.3, 1.0, p.y) * (1.0 - smoothstep(5.3, 6.3, p.y));
        gl_PointSize = aSize * uPixelRatio * (46.0 / max(0.5, -mv.z));
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

  return {
    points,
    update(t, focus) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uFocus.value.copy(focus);
    },
    setPixelRatio(v) { mat.uniforms.uPixelRatio.value = v; },
  };
}
