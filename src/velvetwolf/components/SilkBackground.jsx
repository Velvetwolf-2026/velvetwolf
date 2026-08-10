import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  VELVETWOLF — ambient silk backdrop                                */
/*  A fixed, full-viewport WebGL cloth that drifts behind the whole    */
/*  site. Dark obsidian base with a faint gold sheen so it reads as    */
/*  quiet motion, never distraction. Reacts to scroll + pointer.       */
/*                                                                     */
/*  · pointer-events:none, aria-hidden — purely decorative            */
/*  · three.js is dynamically imported so it never enters the SSR /    */
/*    initial client bundle                                            */
/*  · honours prefers-reduced-motion (renders one static frame)        */
/*  · pauses the rAF loop while the tab is hidden                      */
/*  · the <canvas> is created imperatively per mount so React 19       */
/*    StrictMode's dev double-mount never reuses a context-lost canvas */
/* ------------------------------------------------------------------ */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uAmp;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;

  float disp(vec2 p, float t) {
    float d = 0.0;
    d += 0.60 * sin(p.x * 0.55 + t * 0.55 + p.y * 0.25);
    d += 0.35 * sin(p.y * 0.85 - t * 0.38 + p.x * 0.40);
    d += 0.22 * sin((p.x + p.y) * 1.35 + t * 0.72);
    d += 0.10 * sin(p.x * 2.6 - t * 0.9);
    return d;
  }

  void main() {
    vUv = uv;
    vec2 p = position.xy;
    float t = uTime + uScroll * 1.6;
    float z = disp(p, t) * uAmp;

    float e = 0.12;
    float zx = disp(p + vec2(e, 0.0), t) * uAmp;
    float zy = disp(p + vec2(0.0, e), t) * uAmp;
    vec3 n = normalize(vec3(-(zx - z) / e, -(zy - z) / e, 1.0));

    vNormal = normalMatrix * n;
    vec3 pos = vec3(position.xy, z);
    vPos = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(-vPos);
    vec3 lightDir = normalize(vec3(-0.55, 0.85, 0.65));
    float diff = max(dot(n, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 80.0);
    float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    vec3 base = uColor * (0.32 + 0.68 * diff);
    // Refined gold accent tint
    vec3 gold = vec3(0.79, 0.66, 0.30);

    // 10% reduced soft gold sheen, rim reflection, and ambient gold glow
    vec3 sheen = gold * spec * 0.522;
    vec3 rim = gold * fres * 0.27;
    vec3 goldAmbient = gold * (diff * 0.158 + fres * 0.122);

    vec3 col = base + sheen + rim + goldAmbient;

    // Feather the plane edges so it never shows a hard rectangle seam.
    float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x)
               * smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.80, vUv.y);
    col *= edge;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function SilkBackground() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Probe on a throwaway canvas — if WebGL is unavailable the obsidian
    // <html> background already stands in as the base colour.
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed || !hostRef.current) return;

      // Fresh canvas per mount so a StrictMode remount never inherits a
      // context-lost canvas from the previous pass.
      const canvas = document.createElement("canvas");
      canvas.className = "vw-silk-bg";
      canvas.setAttribute("aria-hidden", "true");
      host.appendChild(canvas);

      const isMobile = window.innerWidth < 700;
      const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      } catch {
        canvas.remove();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      renderer.setClearColor(0x0a0a0a, 1); // matches --obsidian

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, -1.2, 7.2);

      const geo = new THREE.PlaneGeometry(
        22, 14,
        isMobile ? 40 : 80,
        isMobile ? 30 : 60
      );
      const uniforms = {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uAmp: { value: 0.72 },
        uColor: { value: new THREE.Color("#100e09") },
      };
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
      const silk = new THREE.Mesh(geo, mat);
      silk.rotation.x = -0.92;
      silk.position.y = -2.2;
      scene.add(silk);

      const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
      let scroll = window.scrollY || 0;
      let raf = 0;
      let running = true;

      const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      const onScroll = () => { scroll = window.scrollY; };
      window.addEventListener("scroll", onScroll, { passive: true });

      const onMove = (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      let lastTime = performance.now();

      const renderFrame = () => {
        uniforms.uScroll.value = scroll * 0.0012;

        mouse.sx += (mouse.x - mouse.sx) * 0.04;
        mouse.sy += (mouse.y - mouse.sy) * 0.04;
        const p = scroll * 0.0004;
        camera.position.x = mouse.sx * 0.35;
        camera.position.y = -1.2 - p * 1.4 + mouse.sy * -0.2;
        camera.lookAt(0, -1.6 - p * 1.2, 0);

        renderer.render(scene, camera);
      };

      const tick = () => {
        if (!running) return;
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        uniforms.uTime.value += dt * 0.55;
        renderFrame();
        raf = requestAnimationFrame(tick);
      };

      const staticUpdate = () => renderFrame();

      const onVis = () => {
        if (document.hidden) {
          running = false;
          cancelAnimationFrame(raf);
        } else if (!prefersReduce && !running) {
          running = true;
          lastTime = performance.now(); // reset time to discard large hidden-tab delta
          raf = requestAnimationFrame(tick);
        }
      };
      document.addEventListener("visibilitychange", onVis);

      if (prefersReduce) {
        // Track scroll/pointer so it still feels alive, but don't animate time.
        running = false;
        renderFrame();
        window.addEventListener("scroll", staticUpdate, { passive: true });
        window.addEventListener("pointermove", staticUpdate, { passive: true });
      } else {
        raf = requestAnimationFrame(tick);
      }

      cleanup = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", staticUpdate);
        window.removeEventListener("pointermove", staticUpdate);
        document.removeEventListener("visibilitychange", onVis);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // Fixed, non-interactive host; the real <canvas> is injected on the client.
  return <div ref={hostRef} className="vw-silk-host" aria-hidden="true" />;
}
