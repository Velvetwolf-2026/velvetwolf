import React, { useEffect, useRef, useContext } from "react";
import * as THREE from "three";
import { AppContext } from "../pages/AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

export default function Cinematic3DHero() {
  const { openShop } = useContext(AppContext);
  const { isMobileOrTablet } = useBreakpoint();

  const containerRef = useRef(null);
  const canvas3dRef = useRef(null);

  // Static T-shirt color: Desert Sand
  const activeColor = { name: "Beige", hex: "#D9C5B2", label: "Desert Sand" };
  const activeColorRef = useRef(activeColor);

  // Mouse tracking for parallax and interactive drag rotation
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const userRotationRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaY = (e.clientY - dragStartRef.current.y) * 0.008;
    userRotationRef.current.targetX += deltaY;
    userRotationRef.current.targetX = Math.max(-0.6, Math.min(0.6, userRotationRef.current.targetX));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = () => { };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseRef.current.targetX = (e.clientX / innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ----------------------------------------------------
  // 1. THREE.JS 3D CANVAS SETUP
  // ----------------------------------------------------
  useEffect(() => {
    if (!canvas3dRef.current) return;

    const width = canvas3dRef.current.clientWidth;
    const height = canvas3dRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0d0d, 0.08);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 7.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas3dRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // PMREM environment generator
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;

    // Lights - Ambient for soft, uniform shadow fill (fashion photography base)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // 1. Soft Key Spotlight from Front Right
    const goldSpot = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI / 4, 0.5, 1);
    goldSpot.position.set(4, 6, 4);
    goldSpot.castShadow = true;
    goldSpot.shadow.mapSize.width = 2048;
    goldSpot.shadow.mapSize.height = 2048;
    goldSpot.shadow.bias = -0.0005;
    scene.add(goldSpot);

    // 2. Cinematic Rim Lights (Reduced by 80% to remove excessive gaming-style glow)
    const goldRimLeft = new THREE.DirectionalLight(0xffffff, 0.2);
    goldRimLeft.position.set(-3, 2, -4);
    scene.add(goldRimLeft);

    const silverRimRight = new THREE.DirectionalLight(0xffffff, 0.2);
    silverRimRight.position.set(3, 2, -4);
    scene.add(silverRimRight);

    // 4. Soft Front Fill Light
    const frontFill = new THREE.DirectionalLight(0xffffff, 0.4);
    frontFill.position.set(-2, 1, 4);
    scene.add(frontFill);

    // 5. Crisp White Top Key Light
    const whiteKey = new THREE.SpotLight(0xffffff, 0.8, 20, Math.PI / 6, 0.5, 1);
    whiteKey.position.set(0, 8, 2);
    scene.add(whiteKey);


    // ----------------------------------------------------
    // Create Real-time 3D T-Shirt with projection shader
    // ----------------------------------------------------
    const blankTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    blankTex.needsUpdate = true;

    const printUniforms = {
      uInvGroup: { value: new THREE.Matrix4() },
      uFrontEnabled: { value: 0 }, uFrontTex: { value: blankTex },
      uFrontCenter: { value: new THREE.Vector2(0, 0.24) }, uFrontHalf: { value: new THREE.Vector2(0.36, 0.36) }, uFrontRot: { value: 0 },
      uBackEnabled: { value: 0 }, uBackTex: { value: blankTex },
      uBackCenter: { value: new THREE.Vector2(0, 0.3) }, uBackHalf: { value: new THREE.Vector2(0.36, 0.36) }, uBackRot: { value: 0 },
    };

    const decl = `#include <common>
varying vec3 vPrintWPos;
varying vec3 vPrintWNrm;
uniform mat4 uInvGroup;
uniform float uFrontEnabled; uniform sampler2D uFrontTex; uniform vec2 uFrontCenter; uniform vec2 uFrontHalf; uniform float uFrontRot;
uniform float uBackEnabled; uniform sampler2D uBackTex; uniform vec2 uBackCenter; uniform vec2 uBackHalf; uniform float uBackRot;`;

    const applyPrint = `#include <map_fragment>
{
  vec3 gp = (uInvGroup * vec4(vPrintWPos, 1.0)).xyz;
  vec3 gn = normalize(mat3(uInvGroup) * vPrintWNrm);
  vec3 fabricTex = diffuseColor.rgb / max(diffuse, vec3(1e-3));
  float weave = clamp(dot(fabricTex, vec3(0.333)), 0.0, 1.5);
  if (uFrontEnabled > 0.5) {
    vec2 p = gp.xy - uFrontCenter;
    float c = cos(uFrontRot), s = sin(uFrontRot);
    vec2 uv = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) / uFrontHalf * 0.5 + 0.5;
    uv.x = 1.0 - uv.x;
    float facing = smoothstep(0.08, 0.6, gn.z);
    if (gl_FrontFacing && uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0 && facing > 0.001) {
      vec4 tc = texture2D(uFrontTex, vec2(uv.x, 1.0 - uv.y));
      tc.rgb = pow(tc.rgb, vec3(2.2));
      vec2 fw = fwidth(uv) + 1e-4;
      float feather = smoothstep(0.0, fw.x * 2.5, uv.x) * smoothstep(1.0, 1.0 - fw.x * 2.5, uv.x)
                    * smoothstep(0.0, fw.y * 2.5, uv.y) * smoothstep(1.0, 1.0 - fw.y * 2.5, uv.y);
      tc.rgb *= mix(1.0, weave, 0.85);
      float ink = min(tc.a, 0.965) * facing * feather;
      diffuseColor.rgb = mix(diffuseColor.rgb, tc.rgb, ink);
    }
  }
  if (uBackEnabled > 0.5) {
    vec2 p = gp.xy - uBackCenter;
    float c = cos(uBackRot), s = sin(uBackRot);
    vec2 uv = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) / uBackHalf * 0.5 + 0.5;
    float facing = smoothstep(0.08, 0.6, -gn.z);
    if (gl_FrontFacing && uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0 && facing > 0.001) {
      vec4 tc = texture2D(uBackTex, vec2(uv.x, 1.0 - uv.y));
      tc.rgb = pow(tc.rgb, vec3(2.2));
      vec2 fw = fwidth(uv) + 1e-4;
      float feather = smoothstep(0.0, fw.x * 2.5, uv.x) * smoothstep(1.0, 1.0 - fw.x * 2.5, uv.x)
                    * smoothstep(0.0, fw.y * 2.5, uv.y) * smoothstep(1.0, 1.0 - fw.y * 2.5, uv.y);
      tc.rgb *= mix(1.0, weave, 0.85);
      float ink = min(tc.a, 0.965) * facing * feather;
      diffuseColor.rgb = mix(diffuseColor.rgb, tc.rgb, ink);
    }
  }
}`;

    function texFromURL(url) {
      return new Promise((res, rej) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => {
          const t = new THREE.Texture(im);
          t.colorSpace = THREE.NoColorSpace;
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          t.anisotropy = renderer.capabilities.getMaxAnisotropy();
          t.needsUpdate = true;
          res({ tex: t, aspect: im.naturalWidth / im.naturalHeight });
        };
        im.onerror = () => rej(new Error('img'));
        im.src = url;
      });
    }

    async function applySlot(slot, S) {
      if (!S || !S.src) return;
      const pre = slot === 'front' ? 'uFront' : 'uBack';
      try {
        const { tex, aspect } = await texFromURL(S.src);
        printUniforms[pre + 'Tex'].value = tex;
        const base = 0.36 * (S.scale || 1);
        let hw, hh;
        if (aspect >= 1) { hw = base; hh = base / aspect; } else { hh = base; hw = base * aspect; }
        printUniforms[pre + 'Half'].value.set(hw, hh);
        printUniforms[pre + 'Center'].value.set(S.x || 0, S.y || 0);
        printUniforms[pre + 'Rot'].value = ((S.rot || 0) * Math.PI) / 180;
        printUniforms[pre + 'Enabled'].value = 1;
      } catch (err) {
        console.error("Failed to load design texture", err);
      }
    }


    // Group for the 3D model (shirtGroup) so it can float and rotate
    const shirtGroup = new THREE.Group();
    shirtGroup.position.set(0, 0.4, 0);
    sceneGroup.add(shirtGroup);

    const shirtMaterials = [];

    const loader = new GLTFLoader();
    MeshoptDecoder.ready.then(() => {
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load('/oversized_tee_hero.glb', (gltf) => {
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Scale (increased by 25% more) and center the model
        const k = (2.0 * 2.44375) / size.y;
        model.scale.multiplyScalar(k);
        model.position.copy(c).multiplyScalar(-k);
        model.updateMatrixWorld(true);

        model.traverse((o) => {
          if (o.isMesh && o.geometry) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(mat => {
              if (mat && !shirtMaterials.includes(mat)) {
                shirtMaterials.push(mat);
              }
            });
          }
        });

        shirtMaterials.forEach((mat) => {
          mat.map = null; // Remove pre-baked diffuse texture map so color matches selection exactly
          mat.metalness = 0.0; // Matte fabric, non-metallic
          mat.roughness = 1.0; // Complete matte finish
          mat.envMapIntensity = 0.0; // Remove env reflection
          mat.clearcoat = 0.0; // Disable clearcoat gloss
          mat.specularIntensity = 0.0; // Disable specular reflections
          if (mat.specularColor) mat.specularColor.setRGB(0, 0, 0);
          mat.color = new THREE.Color(activeColorRef.current.hex);
          mat.side = THREE.DoubleSide;
          const aniso = renderer.capabilities.getMaxAnisotropy();
          ['normalMap', 'roughnessMap'].forEach((kk) => {
            if (mat[kk]) {
              mat[kk].anisotropy = aniso;
              mat[kk].needsUpdate = true;
            }
          });
          if (mat.normalMap) {
            mat.normalScale.set(1.2, 1.2); // Clean, sharp, realistic cotton texture weave
          }
          mat.aoMap = null;
          mat.sheen = 0.0; // No shiny sheen
          if ('roughness' in mat) mat.roughness = 1.0;

          mat.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, printUniforms);
            shader.vertexShader = shader.vertexShader
              .replace('#include <common>', '#include <common>\nvarying vec3 vPrintWPos;\nvarying vec3 vPrintWNrm;')
              .replace('#include <project_vertex>', '#include <project_vertex>\nvPrintWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPrintWNrm = mat3(modelMatrix) * objectNormal;');
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <common>', decl)
              .replace('#include <map_fragment>', applyPrint);
          };
          mat.needsUpdate = true;
        });

        shirtGroup.add(model);
        model.updateMatrixWorld(true);

        // Read design configuration from localStorage store settings
        let frontSrc = '/tee_back_print.jpg';
        let backSrc = '';
        const saved = localStorage.getItem("vw_store_settings");
        if (saved) {
          try {
            const settings = JSON.parse(saved);
            if (settings.heroFrontDesign) frontSrc = settings.heroFrontDesign;
            if (settings.heroBackDesign !== undefined) backSrc = settings.heroBackDesign;
          } catch {
            // ignore
          }
        }

        if (frontSrc) {
          applySlot('front', {
            src: frontSrc,
            x: 0.0,
            y: 0.0,
            scale: 5,
            rot: 180
          });
        }
        if (backSrc) {
          applySlot('back', {
            src: backSrc,
            x: -0.01,
            y: -0.1,
            scale: 3.2,
            rot: 180
          });
        }
      });
    });


    let animationFrameId;
    const startTime = performance.now() * 0.001;

    const targetColor = new THREE.Color(activeColorRef.current.hex);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() * 0.001) - startTime;

      // Smooth color transitions (lerping)
      if (shirtMaterials.length > 0) {
        targetColor.set(activeColorRef.current.hex);
        shirtMaterials.forEach((mat) => {
          mat.color.lerp(targetColor, 0.06);
        });
      }

      // Update inverse group matrix uniform for print shader projection
      shirtGroup.updateMatrixWorld(true);
      printUniforms.uInvGroup.value.copy(shirtGroup.matrixWorld).invert();

      // Interpolate interactive drag/scroll rotation smoothly
      userRotationRef.current.y += (userRotationRef.current.targetY - userRotationRef.current.y) * 0.08;
      userRotationRef.current.x += (userRotationRef.current.targetX - userRotationRef.current.x) * 0.08;

      // Ease-in progress (1.5s cubic ease-in entrance)
      const progress = Math.min(1, elapsedTime / 1.5);
      const easeInFactor = progress * progress * progress;

      // Apply ease-in scale to shirtGroup
      const scaleEase = 0.7 + 0.3 * easeInFactor;
      shirtGroup.scale.set(scaleEase, scaleEase, scaleEase);

      // 1. Weightless Space Floating Motion (3D Translation with ease-in)
      shirtGroup.position.y = (0.35 + Math.sin(elapsedTime * 0.8) * 0.09) * (0.5 + 0.5 * easeInFactor);
      shirtGroup.position.x = Math.sin(elapsedTime * 0.4) * 0.04;
      shirtGroup.position.z = Math.cos(elapsedTime * 0.3) * 0.03;

      // 2. Faster 3D Model Rotation with Ease-in Startup
      const rotSpeed = 0.52 * (0.4 + 0.6 * easeInFactor);
      shirtGroup.rotation.y = (elapsedTime * rotSpeed) + userRotationRef.current.y;
      shirtGroup.rotation.x = (Math.sin(elapsedTime * 0.7) * 0.06) + userRotationRef.current.x;
      shirtGroup.rotation.z = Math.cos(elapsedTime * 0.5) * 0.04;

      // 3. Mouse Parallax interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Y-axis mouse rotation blocked; X-axis rotation enabled
      sceneGroup.rotation.y = 0;
      sceneGroup.rotation.x = -mouseRef.current.y * 0.35;

      renderer.render(scene, camera);
    };

    animate();

    // ----------------------------------------------------
    // Window Resize Handling
    // ----------------------------------------------------
    const handleResize = () => {
      if (!canvas3dRef.current) return;
      const w = canvas3dRef.current.parentElement.clientWidth;
      const h = canvas3dRef.current.parentElement.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      shirtMaterials.forEach(mat => mat.dispose());
      blankTex.dispose();
    };
  }, []);



  return (
    <section
      style={{
        background: "rgba(13, 13, 13, 0.6)",
        color: "#FAF9F6",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid #2A2A2A"
      }}
    >
      {/* Background Spotlight Glows */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(201, 162, 77, 0.06) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
          zIndex: 1
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-5%",
          left: "5%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(201, 162, 77, 0.04) 0%, rgba(0,0,0,0) 75%)",
          pointerEvents: "none",
          zIndex: 1
        }}
      />
      {/* Desktop Grid Lines Background */}
      {!isMobileOrTablet && <div className="vw-hero-grid-bg" />}
      <div
        style={{
          position: "absolute",
          bottom: "-5%",
          left: "5%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(201, 162, 77, 0.03) 0%, rgba(0,0,0,0) 75%)",
          pointerEvents: "none",
          zIndex: 1
        }}
      />

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: isMobileOrTablet ? "100px 20px 60px" : "120px 40px 70px 40px",
          width: "100%",
          zIndex: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: isMobileOrTablet ? "40px" : "24px"
        }}
      >
        {/* LEFT COLUMN: HERO CONTENT */}
        <div style={{ flex: isMobileOrTablet ? "1 1 500px" : "1 1 440px", zIndex: 3 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: 10,
              color: "#C9A24D",
              marginBottom: 20,
              textTransform: "uppercase"
            }}
          >
            VELVETWOLF
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: isMobileOrTablet ? "clamp(40px, 8vw, 64px)" : "clamp(56px, 5.5vw, 96px)",
              lineHeight: 1.0,
              letterSpacing: isMobileOrTablet ? -1 : 2,
              marginBottom: 28,
              textTransform: "uppercase"
            }}
          >
            CRAFTED FOR<br />
            <span style={{ color: "#C9A24D" }}>THE BOLD</span>
          </h1>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--silver)",
              maxWidth: 480,
              marginBottom: 40
            }}
          >
            Premium oversized streetwear designed for creators, founders, dreamers, and modern rebels. Built to make statements in silence.
          </p>

          {/* Primary & Secondary Call to Actions */}
          <div style={{ display: "flex", gap: 16, marginBottom: 50 }}>
            <button
              className="btn-gold"
              onClick={() => openShop()}
              style={{
                padding: "16px 36px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 2,
                boxShadow: "0 4px 20px rgba(201,162,77,0.15)"
              }}
            >
              SHOP COLLECTION
            </button>
            <button
              className="btn-outline"
              onClick={() => openShop("custom")}
              style={{
                padding: "16px 36px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: 2,
                border: "1px solid #2A2A2A",
                color: "#FAF9F6",
                background: "transparent"
              }}
            >
              EXPLORE DESIGNS
            </button>
          </div>

          {/* Luxury Trust Indicators */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px 24px",
              borderTop: "1px solid #2A2A2A",
              paddingTop: 32,
              maxWidth: 480
            }}
          >
            {[
              "PREMIUM COTTON",
              "OVERSIZED FIT",
              "MADE FOR EVERYDAY WEAR",
              "SECURE CHECKOUT"
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#C9A24D", fontSize: 14 }}>✦</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "var(--ash)"
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE 3D MODEL SHOWCASE */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          style={{
            flex: isMobileOrTablet ? "1 1 500px" : "1 1 540px",
            height: isMobileOrTablet ? "500px" : "640px",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "grab",
            touchAction: "none"
          }}
        >
          {isMobileOrTablet ? (
            <img
              src="/mockup_founder.webp"
              alt="VelvetWolf tee"
              loading="eager"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2,
                borderRadius: 12
              }}
            />
          ) : (
            <canvas
              ref={canvas3dRef}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2
              }}
            />
          )}


        </div>
      </div>
      {/* Scroll indicator (Desktop only) */}
      {!isMobileOrTablet && (
        <div style={{
          position: "absolute",
          bottom: 34,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          opacity: 0.6,
          zIndex: 10
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 3, color: "var(--silver)" }}>SCROLL TO DISCOVER</span>
          <div style={{
            width: 22,
            height: 36,
            border: "1.5px solid rgba(201,168,76,0.3)",
            borderRadius: 11,
            position: "relative"
          }}>
            <div style={{
              width: 2,
              height: 8,
              background: "var(--gold)",
              position: "absolute",
              top: 7,
              left: "50%",
              transform: "translateX(-50%)",
              borderRadius: 1,
              animation: "vw-scroll-down 2s infinite"
            }} />
          </div>
        </div>
      )}
    </section>
  );
}
