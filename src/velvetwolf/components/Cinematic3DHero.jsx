import React, { useEffect, useRef, useState, useContext } from "react";
import * as THREE from "three";
import { AppContext } from "../pages/AppContext";
import { useBreakpoint } from "../utils/breakpoints";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";



// Particle class for Gold Dust Particles
class Particle {
  constructor(width, height) {
    this.reset(width, height);
    this.y = Math.random() * height; // Start at random height initially
  }

  reset(width, height) {
    this.x = Math.random() * width;
    this.y = height + 10;
    this.size = Math.random() * 1.8 + 0.4;
    this.speedY = Math.random() * 0.4 + 0.15;
    this.speedX = Math.random() * 0.2 - 0.1;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.oscSpeed = Math.random() * 0.02 + 0.005;
    this.oscAngle = Math.random() * Math.PI;
  }

  update(width, height) {
    this.y -= this.speedY;
    this.oscAngle += this.oscSpeed;
    this.x += Math.sin(this.oscAngle) * 0.25 + this.speedX;

    // Fade out near the top
    if (this.y < 80) {
      this.opacity -= 0.01;
    }

    if (this.y < 0 || this.opacity <= 0) {
      this.reset(width, height);
    }
  }

  draw(ctx) {
    ctx.fillStyle = `rgba(201, 168, 76, ${this.opacity})`;
    ctx.shadowColor = "#c9a84c";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }
}

export default function Cinematic3DHero() {
  const { openShop } = useContext(AppContext);
  const { isMobileOrTablet } = useBreakpoint();

  const containerRef = useRef(null);
  const canvas3dRef = useRef(null);
  const canvasParticlesRef = useRef(null);

  // Dynamic T-shirt colors
  const colorOptions = [
    { name: "Black", hex: "#0D0D0D", label: "Obsidian Black" },
    { name: "White", hex: "#FAF9F6", label: "Alabaster White" },
    { name: "Beige", hex: "#D9C5B2", label: "Desert Sand" },
    { name: "Forest Green", hex: "#1E352F", label: "Forest Canopy" },
    { name: "Crimson Ember", hex: "#8B2635", label: "Crimson Ember" }
  ];

  const [activeColor, setActiveColor] = useState(() => {
    const saved = localStorage.getItem("vw_store_settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.heroColor) {
          const match = colorOptions.find(o => o.hex.toLowerCase() === settings.heroColor.toLowerCase());
          if (match) return match;
          if (settings.heroColor.startsWith("#")) {
            return { name: "Custom", hex: settings.heroColor, label: "Custom Admin Color" };
          }
        }
      } catch {
        // ignore
      }
    }
    return colorOptions[0];
  });
  const [hoveredColor, setHoveredColor] = useState(null);

  // Sync active color to ref for realtime WebGL updates without rebuilding scene
  const activeColorRef = useRef(activeColor);
  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);

  // Mouse tracking for parallax
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      // Range: -1 to 1
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

    // Create the exact premium 3D podium from the image
    const podiumGroup = new THREE.Group();
    podiumGroup.position.set(0, -1.35, 0);

    // Material for the top and bottom metallic segments
    const metallicPodiumMat = new THREE.MeshStandardMaterial({
      color: 0x121212,
      roughness: 0.22,
      metalness: 0.9,
    });

    // 1. Top metallic cylinder segment
    const topGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.14, 64);
    const topSegment = new THREE.Mesh(topGeo, metallicPodiumMat);
    topSegment.position.y = 0.11;
    topSegment.castShadow = true;
    topSegment.receiveShadow = true;
    podiumGroup.add(topSegment);

    // 2. Recessed glowing gold band segment
    const glowGeo = new THREE.CylinderGeometry(1.62, 1.62, 0.08, 64);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xc9a84c,
      emissive: 0xc9a84c,
      emissiveIntensity: 5.0,
      roughness: 0.1,
    });
    const glowBand = new THREE.Mesh(glowGeo, glowMat);
    glowBand.position.y = 0.0;
    podiumGroup.add(glowBand);

    // 3. Bottom metallic cylinder segment
    const bottomGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.14, 64);
    const bottomSegment = new THREE.Mesh(bottomGeo, metallicPodiumMat);
    bottomSegment.position.y = -0.11;
    bottomSegment.castShadow = true;
    bottomSegment.receiveShadow = true;
    podiumGroup.add(bottomSegment);

    // 4. PointLight inside the recessed band to cast gold light onto floor and T-shirt
    const podiumLight = new THREE.PointLight(0xc9a84c, 3.5, 4.5);
    podiumLight.position.set(0, 0, 0);
    podiumGroup.add(podiumLight);
    
    sceneGroup.add(podiumGroup);


    // ----------------------------------------------------
    // Create Real-time 3D T-Shirt with projection shader
    // ----------------------------------------------------
    const blankTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat); 
    blankTex.needsUpdate = true;
    
    const printUniforms = {
      uInvGroup:     { value: new THREE.Matrix4() },
      uFrontEnabled: { value: 0 }, uFrontTex: { value: blankTex },
      uFrontCenter:  { value: new THREE.Vector2(0, 0.24) }, uFrontHalf: { value: new THREE.Vector2(0.36, 0.36) }, uFrontRot: { value: 0 },
      uBackEnabled:  { value: 0 }, uBackTex: { value: blankTex },
      uBackCenter:   { value: new THREE.Vector2(0, 0.3) }, uBackHalf: { value: new THREE.Vector2(0.36, 0.36) }, uBackRot: { value: 0 },
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
      loader.load('/tee_model.glb', (gltf) => {
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Scale (increased by 70% from baseline) and center the model
        const k = (2.0 * 1.7) / size.y;
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
        let frontSrc = null;
        let backSrc = '/tee_back_print.jpg';
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
            y: 0.24,
            scale: 1.0,
            rot: 0
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

      // 1. Slow Y floating motion: 6s duration cycle, 12px height variance (0.06 amplitude)
      shirtGroup.position.y = 0.4 + Math.sin(elapsedTime * (2.0 * Math.PI / 6.0)) * 0.06;
      
      // 2. Slow breathing rotation oscillating between 15° and 25° (flipped 180° to show front) over a 25-second cycle
      const rotationCycle = (2.0 * Math.PI) / 25.0;
      shirtGroup.rotation.y = (200.0 * Math.PI / 180.0) - Math.cos(elapsedTime * rotationCycle) * (5.0 * Math.PI / 180.0);

      // 3. Mouse Parallax interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Shift entire group based on mouse
      sceneGroup.rotation.y = mouseRef.current.x * 0.35;
      sceneGroup.rotation.x = -mouseRef.current.y * 0.25;

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

  // ----------------------------------------------------
  // 2. GOLD DUST PARTICLES OVERLAY SETUP
  // ----------------------------------------------------
  useEffect(() => {
    if (!canvasParticlesRef.current) return;

    const canvas = canvasParticlesRef.current;
    const ctx = canvas.getContext("2d");

    let animationId;
    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight);

    // Initialize particles
    const particleCount = 75;
    const particles = Array.from({ length: particleCount }, () => new Particle(width, height));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update(width, height);
        p.draw(ctx);
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section
      style={{
        background: "#0D0D0D",
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
          style={{
            flex: isMobileOrTablet ? "1 1 500px" : "1 1 540px",
            height: isMobileOrTablet ? "500px" : "640px",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          {/* On mobile/tablet, skip the WebGL scene entirely — no 2.7MB glb
              fetch, no Three.js scene graph — and show a static product shot
              instead. The canvas refs stay null, so the WebGL setup effects
              below no-op via their existing `if (!ref.current) return` guards. */}
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
            <>
              {/* 3D WebGL Canvas */}
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

              {/* Golden Floating Particles overlay */}
              <canvas
                ref={canvasParticlesRef}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  pointerEvents: "none"
                }}
              />
            </>
          )}

          {/* Dynamic Color Preview Panel (Hover overlay) */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 4,
              background: "rgba(26, 26, 26, 0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid #2A2A2A",
              borderRadius: "30px",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
          >
            {colorOptions.map((opt) => {
              const isSelected = activeColor.name === opt.name;
              return (
                <button
                  key={opt.name}
                  onClick={() => setActiveColor(opt)}
                  onMouseEnter={() => setHoveredColor(opt.label)}
                  onMouseLeave={() => setHoveredColor(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: opt.hex === "#FAF9F6" ? "#fff" : opt.hex,
                    border: isSelected ? "2px solid #C9A24D" : "1px solid rgba(255,255,255,0.2)",
                    padding: 0,
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.2)" : "scale(1)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isSelected ? "0 0 10px rgba(201,162,77,0.5)" : "none"
                  }}
                  title={opt.label}
                />
              );
            })}
            
            {/* Color labels */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: 1,
                color: "#FAF9F6",
                marginLeft: 4,
                width: 110,
                textAlign: "left",
                opacity: 0.8
              }}
            >
              {hoveredColor || activeColor.label}
            </span>
          </div>
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
