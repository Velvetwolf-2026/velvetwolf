import React, { useEffect, useRef, useState, useContext } from "react";
import * as THREE from "three";
import { AppContext } from "../pages/AppContext";
import { useLanguage } from "../pages/LanguageContext";

function processTshirtImage(img) {
  const canvas = document.createElement("canvas");
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // DFS stack-based flood fill to clear background
  const visited = new Uint8Array(width * height);
  const stack = [];

  // Add borders to seed
  for (let x = 0; x < width; x++) {
    stack.push(x, 0);
    stack.push(x, height - 1);
    visited[x] = 1;
    visited[(height - 1) * width + x] = 1;
  }
  for (let y = 0; y < height; y++) {
    stack.push(0, y);
    stack.push(width - 1, y);
    visited[y * width] = 1;
    visited[y * width + (width - 1)] = 1;
  }

  while (stack.length > 0) {
    const cy = stack.pop();
    const cx = stack.pop();

    const idx = (cy * width + cx) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Dark grey background threshold in flatai_2.png (increased to 120 to fully remove shadows/bracelet leftovers)
    if (lum < 120) {
      data[idx + 3] = 0; // set transparent

      // Neighbors
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          if (!visited[nidx]) {
            visited[nidx] = 1;
            stack.push(nx, ny);
          }
        }
      }
    }
  }

  // Find bounding box of non-transparent pixels (the shirt)
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let hasPixels = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) {
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Crop canvas to bounding box
  const croppedWidth = (maxX - minX) + 1;
  const croppedHeight = (maxY - minY) + 1;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;
  const croppedCtx = croppedCanvas.getContext("2d");

  ctx.putImageData(imgData, 0, 0);
  croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

  return croppedCanvas;
}

export default function Cinematic3DHero() {
  const { openShop } = useContext(AppContext);
  const { t } = useLanguage();

  const containerRef = useRef(null);
  const canvas3dRef = useRef(null);
  const canvasParticlesRef = useRef(null);

  // Dynamic T-shirt colors
  const colorOptions = [
    { name: "Black", hex: "#0D0D0D", label: "Obsidian Black" },
    { name: "White", hex: "#FAF9F6", label: "Alabaster White" },
    { name: "Beige", hex: "#D9C5B2", label: "Desert Sand" },
    { name: "Forest Green", hex: "#1E352F", label: "Forest Canopy" },
    { name: "Soft Red", hex: "#8B2635", label: "Crimson Ember" }
  ];

  const [activeColor, setActiveColor] = useState(colorOptions[0]);
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

    // Lights - Minimal ambient for high-contrast editorial mood
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(ambientLight);

    // 1. Premium Gold Spotlight from Top Right
    const goldSpot = new THREE.SpotLight(0xc9a24d, 15, 30, Math.PI / 5, 0.4, 0.8);
    goldSpot.position.set(6, 9, 3.5);
    goldSpot.castShadow = true;
    goldSpot.shadow.mapSize.width = 2048; // Ultra-crisp shadows
    goldSpot.shadow.mapSize.height = 2048;
    goldSpot.shadow.bias = -0.0005;
    scene.add(goldSpot);

    // 2. Powerful Left Gold Rim Light (Creates glowing edge on shirt)
    const goldRimLeft = new THREE.PointLight(0xc9a24d, 12, 12);
    goldRimLeft.position.set(-4.5, 1.5, -2);
    scene.add(goldRimLeft);

    // 3. Powerful Right Gold Rim Light (Creates glowing edge on shirt)
    const goldRimRight = new THREE.PointLight(0xc9a24d, 12, 12);
    goldRimRight.position.set(4.5, 1.5, -2);
    scene.add(goldRimRight);

    // 4. Soft Silver-Blue Front Fill (Editorial contrast fill)
    const frontFill = new THREE.DirectionalLight(0x7c94b0, 0.55);
    frontFill.position.set(-5, -2, 4.5);
    scene.add(frontFill);

    // 5. Crisp White Top Key Light (Highlights shoulder and details)
    const whiteKey = new THREE.SpotLight(0xffffff, 8, 20, Math.PI / 6, 0.5, 1);
    whiteKey.position.set(0, 8, 3);
    scene.add(whiteKey);

    // ----------------------------------------------------
    // Create Real-time T-Shirt Mesh from flatai_2.png
    // ----------------------------------------------------
    let shirtGeo = null;
    let shirtMaterial = null;
    let shirtTexture = null;
    let shirtMesh = null;

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // 1. Oversized T-Shirt (Torso & Sleeves Group)
    const shirtGroup = new THREE.Group();
    shirtGroup.position.set(0, 0.4, 0);
    sceneGroup.add(shirtGroup);

    const img = new Image();
    img.src = "/flatai_2.png";
    img.onload = () => {
      const processedCanvas = processTshirtImage(img);
      shirtTexture = new THREE.CanvasTexture(processedCanvas);
      shirtTexture.minFilter = THREE.LinearFilter;

      const aspect = processedCanvas.width / processedCanvas.height;
      const shirtWidth = 4.2; // Made the T-shirt image larger as requested
      const shirtHeight = shirtWidth / aspect;

      shirtGeo = new THREE.PlaneGeometry(shirtWidth, shirtHeight, 32, 32);

      // Bend back at the edges to give it a 3D cylindrical volume
      const pos = shirtGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = -Math.pow(x, 2) * 0.08;
        pos.setZ(i, z);
      }
      shirtGeo.computeVertexNormals();

      shirtMaterial = new THREE.MeshPhysicalMaterial({
        map: shirtTexture,
        transparent: true,
        alphaTest: 0.15,
        roughness: 0.65,
        metalness: 0.15,
        side: THREE.DoubleSide
      });

      // Shader modification to dynamically colorize fabric while keeping text dark
      shirtMaterial.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          `#include <map_fragment>`,
          `
          #ifdef USE_MAP
            vec4 texelColor = texture2D( map, vMapUv );
            float l = (texelColor.r + texelColor.g + texelColor.b) / 3.0;
            float isText = smoothstep(0.45, 0.25, l);
            vec3 fabricColor = texelColor.rgb * diffuse;
            vec3 textColor = vec3(0.05, 0.05, 0.05);
            texelColor.rgb = mix(fabricColor, textColor, isText);
            diffuseColor *= texelColor;
          #endif
          `
        );
      };

      shirtMesh = new THREE.Mesh(shirtGeo, shirtMaterial);
      shirtMesh.castShadow = true;
      shirtMesh.receiveShadow = true;
      shirtGroup.add(shirtMesh);
    };

    // 3. Obsidian Glass Wolf Sculpture (Behind T-shirt)
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 0.4, -1.8);
    sceneGroup.add(glassGroup);

    // Faceted 3D wolf head bust vertices
    const vertices = new Float32Array([
      0, 0, 1.2,          // 0: Nose tip
      0, 0.3, 0.8,        // 1: Snout top
      -0.25, 0.1, 0.8,    // 2: Snout left
      0.25, 0.1, 0.8,     // 3: Snout right
      0, 0.5, 0.3,        // 4: Snout base top
      -0.4, 0.2, 0.3,     // 5: Snout base left
      0.4, 0.2, 0.3,      // 6: Snout base right
      0, -0.2, 0.8,       // 7: Snout bottom (jaw)
      0, -0.1, 0.3,       // 8: Jaw base bottom
      0, 0.9, -0.2,       // 9: Forehead center
      -0.5, 0.9, -0.5,    // 10: Head top left
      0.5, 0.9, -0.5,     // 11: Head top right
      -0.3, 0.6, 0.1,     // 12: Left eye
      0.3, 0.6, 0.1,      // 13: Right eye
      -0.8, 0.3, -0.2,    // 14: Left cheek outer
      0.8, 0.3, -0.2,     // 15: Right cheek outer
      -0.9, 1.7, -0.8,    // 16: Left ear tip
      -0.3, 1.0, -0.6,    // 17: Left ear base inner
      -0.8, 0.9, -0.7,    // 18: Left ear base outer
      0.9, 1.7, -0.8,     // 19: Right ear tip
      0.3, 1.0, -0.6,     // 20: Right ear base inner
      0.8, 0.9, -0.7,     // 21: Right ear base outer
      0, 0.4, -0.8,       // 22: Neck top center
      -0.7, -0.8, -0.9,   // 23: Neck bottom left
      0.7, -0.8, -0.9,    // 24: Neck bottom right
      0, -0.7, -0.4,      // 25: Neck bottom center front
      0, -0.9, -1.2,      // 26: Neck bottom back
      0, -0.3, -0.2,      // 27: Snout base bottom
      -0.5, -0.4, -0.5,   // 28: Left jaw bottom
      0.5, -0.4, -0.5     // 29: Right jaw bottom
    ]);

    const indices = [
      // Snout top facet
      1, 2, 0,
      0, 3, 1,
      // Snout sides
      0, 2, 7,
      0, 7, 3,
      // Snout top ridge to base
      1, 4, 2,
      2, 4, 5,
      1, 3, 4,
      3, 6, 4,
      // Snout bottom to jaw
      7, 2, 8,
      7, 8, 3,
      2, 5, 8,
      3, 8, 6,
      // Snout base to Forehead/Eyes
      4, 9, 12,
      4, 12, 5,
      4, 13, 9,
      4, 6, 13,
      // Forehead to ears
      9, 10, 17,
      9, 17, 12,
      9, 20, 11,
      9, 13, 20,
      // Cheek to snouts
      5, 12, 14,
      6, 15, 13,
      5, 14, 28,
      6, 29, 15,
      // Eyes to cheeks
      12, 17, 14,
      13, 15, 20,
      14, 17, 18,
      15, 21, 20,
      // Left Ear facets
      17, 10, 16,
      17, 16, 18,
      18, 16, 14,
      10, 18, 16,
      // Right Ear facets
      20, 19, 11,
      20, 21, 19,
      21, 19, 15,
      11, 19, 21,
      // Head top back & neck connectors
      10, 22, 17,
      11, 20, 22,
      10, 11, 22,
      // Neck front facets
      8, 25, 28,
      8, 29, 25,
      28, 25, 23,
      29, 24, 25,
      // Neck sides
      14, 28, 23,
      15, 24, 29,
      18, 14, 23,
      21, 24, 15,
      18, 23, 26,
      21, 26, 24,
      // Neck back
      22, 26, 18,
      22, 21, 26,
      22, 10, 26,
      22, 26, 11
    ];

    let baseGeo = new THREE.BufferGeometry();
    baseGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    baseGeo.setIndex(indices);
    // Convert to non-indexed to form flat, diamond-like crystal facets
    const glassGeo = baseGeo.toNonIndexed();
    glassGeo.computeVertexNormals();
    // Scale up the sculpture slightly to stand out
    glassGeo.scale(1.15, 1.15, 1.15);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050505, // Deep obsidian black
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.65, // Semi-transparent luxury crystal look
      thickness: 1.8,
      ior: 1.65, // refractive index of heavy glass
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      specularIntensity: 1.5,
      specularColor: new THREE.Color(0xc9a24d) // soft gold edge reflections!
    });

    const obsidianEmblem = new THREE.Mesh(glassGeo, glassMaterial);
    obsidianEmblem.castShadow = true;
    obsidianEmblem.receiveShadow = true;
    glassGroup.add(obsidianEmblem);

    // 4. Frosted Glass Pedestal Platform (Beneath)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -1.4, 0);
    sceneGroup.add(pedestalGroup);

    const pedestalGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.15, 64);
    const pedestalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1c1c1c,
      roughness: 0.25,
      transmission: 0.9,
      thickness: 0.8,
      ior: 1.45,
      clearcoat: 1.0
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMaterial);
    pedestal.receiveShadow = true;
    pedestalGroup.add(pedestal);

    // Platform Rim Gold Accent ring
    const rimGeo = new THREE.TorusGeometry(2.02, 0.04, 8, 64);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9a24d,
      roughness: 0.15,
      metalness: 0.95
    });
    const rim = new THREE.Mesh(rimGeo, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    pedestalGroup.add(rim);

    // Floor Shadow plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(10, 10);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.55 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.48;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ----------------------------------------------------
    // Animation Render Loop
    // ----------------------------------------------------
    let animationFrameId;
    const startTime = performance.now() * 0.001;

    const targetColor = new THREE.Color(activeColor.hex);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() * 0.001) - startTime;

      // Smooth color transitions (lerping)
      if (shirtMaterial) {
        targetColor.set(activeColor.hex);
        shirtMaterial.color.lerp(targetColor, 0.06);
      }

      // 1. Slow floating T-shirt bounce & rotation
      shirtGroup.position.y = 0.4 + Math.sin(elapsedTime * 1.5) * 0.12;
      shirtGroup.rotation.y = Math.sin(elapsedTime * 0.4) * 0.15; // slow 360-back-and-forth

      // 2. Slow obsidian emblem float & rotation
      glassGroup.position.y = 0.4 + Math.sin(elapsedTime * 0.7) * 0.1;
      obsidianEmblem.rotation.y = elapsedTime * 0.04; // Slower, highly cinematic rotation

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
      if (shirtGeo) shirtGeo.dispose();
      glassGeo.dispose();
      pedestalGeo.dispose();
      rimGeo.dispose();
      shadowPlaneGeo.dispose();
      if (shirtMaterial) shirtMaterial.dispose();
      glassMaterial.dispose();
      pedestalMaterial.dispose();
      rimMaterial.dispose();
      shadowPlaneMat.dispose();
      if (shirtTexture) shirtTexture.dispose();
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

    // Particle class
    class Particle {
      constructor() {
        this.reset();
        this.y = Math.random() * height; // Start at random height initially
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + 10;
        this.size = Math.random() * 1.8 + 0.4;
        this.speedY = Math.random() * 0.4 + 0.15;
        this.speedX = Math.random() * 0.2 - 0.1;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.oscSpeed = Math.random() * 0.02 + 0.005;
        this.oscAngle = Math.random() * Math.PI;
      }

      update() {
        this.y -= this.speedY;
        this.oscAngle += this.oscSpeed;
        this.x += Math.sin(this.oscAngle) * 0.25 + this.speedX;

        // Fade out near the top
        if (this.y < 80) {
          this.opacity -= 0.01;
        }

        if (this.y < 0 || this.opacity <= 0) {
          this.reset();
        }
      }

      draw() {
        ctx.fillStyle = `rgba(201, 162, 77, ${this.opacity})`;
        ctx.shadowColor = "#c9a24d";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    // Initialize particles
    const particleCount = 75;
    const particles = Array.from({ length: particleCount }, () => new Particle());

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw();
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
          background: "radial-gradient(circle, rgba(201, 162, 77, 0.05) 0%, rgba(0,0,0,0) 70%)",
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
          background: "radial-gradient(circle, rgba(201, 162, 77, 0.03) 0%, rgba(0,0,0,0) 75%)",
          pointerEvents: "none",
          zIndex: 1
        }}
      />

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "100px 40px 60px 40px",
          width: "100%",
          zIndex: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "40px"
        }}
      >
        {/* LEFT COLUMN: HERO CONTENT */}
        <div style={{ flex: "1 1 500px", zIndex: 3 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              letterSpacing: 8,
              color: "#C9A24D",
              marginBottom: 16,
              textTransform: "uppercase"
            }}
          >
            VELVETWOLF
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 6vw, 90px)",
              lineHeight: 1.0,
              letterSpacing: -1,
              marginBottom: 24,
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
            flex: "1 1 500px",
            height: "600px",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
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

          {/* Dynamic Color Preview Panel (Hover overlay) */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
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
                    width: 22,
                    height: 22,
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
    </section>
  );
}
