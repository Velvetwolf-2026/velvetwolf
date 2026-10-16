// The gallery hall: floor, wall, tees floating in pools of light, framed photographs in the Quiet
// Hours room, and one white key + rim pair that
// follows whatever the camera is looking at. No HDRI and no coloured light, so colorways stay true.
import * as THREE from 'three';
import { Garment } from './garment.js';
import { concreteTexture, radialTexture, wallLettering } from './textures.js';

export const HALL_COLOR = '#0A0A0B';
export const TEE_Y = 1.62; // garment centre height (tees float, no stand)

function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0.03 } },
    vertexShader: /* glsl */ `
      varying float vH; varying vec3 vN; varying vec3 vV;
      void main() {
        vH = position.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vH; varying vec3 vN; varying vec3 vV;
      void main() {
        float facing = pow(abs(dot(vN, vV)), 2.2);
        float h = clamp(vH / 7.0 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(vec3(1.0), uOpacity * facing * mix(0.25, 1.0, h));
      }`,
  });
}

// lite: on phones and low-power tablets the exhibits you only look at use the light mesh tier;
// the close-up pieces (cloth, product, studio) keep the full mesh.
export function buildWorld(scene, kit, prints, { shadows = true, beams = true, lite = false } = {}) {
  const lightKit = kit.light || kit;
  scene.background = new THREE.Color(HALL_COLOR);
  scene.fog = new THREE.Fog(HALL_COLOR, 10, 30);

  // floor: dark polished concrete
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 60),
    new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.92, metalness: 0, roughnessMap: concreteTexture() })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(86, 0, 0);
  floor.receiveShadow = shadows;
  scene.add(floor);

  // back wall
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 16),
    new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.96 })
  );
  wall.position.set(86, 8, -6);
  scene.add(wall);

  const poolTex = radialTexture([[0, 'rgba(255,255,255,0.55)'], [0.45, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
  const contactTex = radialTexture([[0, 'rgba(0,0,0,0.85)'], [0.5, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
  const poolGeo = new THREE.PlaneGeometry(4.2, 4.2);
  const beamGeo = new THREE.CylinderGeometry(0.35, 1.5, 7, 32, 1, true);

  function addBay(x, z, { color = '#141416', ink = '#E8E4DA', rotation = 0, beam = beams, light = lite } = {}) {
    const bay = new THREE.Group();
    bay.position.set(x, 0, z);
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, opacity: 0.16, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.004;
    // soft shadow on the floor under the floating tee
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.5 }));
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.006;
    bay.add(pool, contact);
    if (beam) {
      const b = new THREE.Mesh(beamGeo, beamMaterial());
      b.position.y = 3.5 + 0.2;
      b.renderOrder = 3;
      bay.add(b);
    }
    const garment = new Garment(light ? lightKit : kit, { color, ink, castShadow: shadows });
    garment.group.position.y = TEE_Y;
    garment.pivot.rotation.y = rotation;
    bay.add(garment.group);
    scene.add(bay);
    return { x, z, group: bay, garment, pool };
  }

  // A framed photograph hung where a tee would float: thin black frame, bone mat, the print.
  // The print is shown as a lightbox: unlit and outside tone mapping, so its colours stay exactly
  // as photographed while the frame and mat take the gallery light.
  const FRAME = { w: 1.76, h: 2.2, mat: 0.1, edge: 0.045, depth: 0.05, y: 1.66 };
  const frameGeo = new THREE.BoxGeometry(FRAME.w + 2 * (FRAME.mat + FRAME.edge), FRAME.h + 2 * (FRAME.mat + FRAME.edge), FRAME.depth);
  const matGeo = new THREE.PlaneGeometry(FRAME.w + 2 * FRAME.mat, FRAME.h + 2 * FRAME.mat);
  const photoGeo = new THREE.PlaneGeometry(FRAME.w, FRAME.h);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#121214', roughness: 0.5, metalness: 0.25 });
  const matMat = new THREE.MeshStandardMaterial({ color: '#d6d1c5', roughness: 0.95 });
  function addFrame(x, z, { rotation = 0 } = {}) {
    const bay = new THREE.Group();
    bay.position.set(x, 0, z);
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, opacity: 0.12, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.004;
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.4 }));
    contact.rotation.x = -Math.PI / 2;
    contact.rotation.z = -rotation;
    contact.position.y = 0.006;
    bay.add(pool, contact);
    const g = new THREE.Group();
    g.position.y = FRAME.y;
    g.rotation.y = rotation;
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.castShadow = shadows;
    const mat = new THREE.Mesh(matGeo, matMat);
    mat.position.z = FRAME.depth / 2 + 0.001;
    const photoMat = new THREE.MeshBasicMaterial({ color: '#ececec', toneMapped: false, visible: false });
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.z = FRAME.depth / 2 + 0.002;
    g.add(frame, mat, photo);
    bay.add(g);
    scene.add(bay);
    return {
      x, z, group: bay, frame: g, pool,
      anchorY: 0.24, anchorZ: 0.3, // where the placard pins, just under the frame
      setPhoto(src, aniso = 8) {
        new THREE.TextureLoader().load(src, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = aniso;
          photoMat.map = t;
          photoMat.visible = true;
          photoMat.needsUpdate = true;
        });
      },
    };
  }

  // wall lettering
  const letters = [];
  function addLettering(x, text, { y = 4.6, w = 13, opacity = 0.07 } = {}) {
    const l = wallLettering();
    l.draw(text);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: l.texture, transparent: true, opacity, depthWrite: false })
    );
    m.position.set(x, y, -5.95);
    scene.add(m);
    letters.push(l);
    return l;
  }

  // size guide: every size side by side at true relative scale (plain Bone tees, straight on);
  // the engine moves the chosen one forward into the light
  const FIT_SCALES = [0.965, 1, 1.035, 1.07, 1.105]; // S, M, L, XL, XXL
  const RAIL_Y = TEE_Y + 1.3;
  const railMat = new THREE.MeshStandardMaterial({ color: '#6a6a66', roughness: 0.32, metalness: 0.55 });
  const fitLineup = FIT_SCALES.map((scale, i) => {
    const b = addBay(84 + (i - 2) * 1.62, -0.5, { rotation: 0, beam: false, light: lite && i !== 1, color: '#E8E4DA', ink: '#141416' });
    b.garment.group.scale.setScalar(scale);
    b.scale = scale;
    // a wire hanger from the shoulders up to the rail (it moves with the tee)
    const top = TEE_Y + 0.978 * scale, half = 0.36 * scale;
    const wire = (len) => new THREE.CylinderGeometry(0.006, 0.006, len, 6);
    const arm = Math.hypot(half, 0.12);
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(wire(arm), railMat);
      m.position.set((sx * half) / 2, top + 0.06, 0.02);
      m.rotation.z = sx * (Math.PI / 2 - Math.atan2(0.12, half));
      b.group.add(m);
    }
    const bar = new THREE.Mesh(wire(half * 2), railMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, top, 0.02);
    const stem = new THREE.Mesh(wire(RAIL_Y - top - 0.18), railMat); stem.position.set(0, (RAIL_Y + top + 0.12) / 2 - 0.03, 0.02);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 24, Math.PI * 1.3), railMat);
    hook.position.set(0, RAIL_Y - 0.03, 0.02); hook.rotation.z = -0.2;
    b.group.add(bar, stem, hook);
    return b;
  });
  // the clothes rail: a dark pipe on two posts with T-feet
  {
    const RX = 4.3, RZ = -0.5;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, RX * 2, 16), railMat);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(84, RAIL_Y, RZ);
    scene.add(pipe);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, RAIL_Y, 16), railMat);
      post.position.set(84 + sx * RX, RAIL_Y / 2, RZ); post.castShadow = shadows;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 16), railMat);
      foot.rotation.x = Math.PI / 2; foot.position.set(84 + sx * RX, 0.03, RZ); foot.castShadow = shadows;
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), railMat);
      elbow.position.set(84 + sx * RX, RAIL_Y, RZ);
      scene.add(post, foot, elbow);
    }
  }

  // ---- bays ----
  const bays = {
    hero: addBay(0, 0, { rotation: 0.5, color: '#E8E4DA', ink: '#141416' }),
    drop: [addFrame(9, 0, { rotation: 0.2 }), addFrame(12, 0), addFrame(15, 0, { rotation: -0.2 })],
    color: addBay(26, 0, { rotation: -0.35, color: '#141416' }),
    craft: addBay(36, 0, { rotation: -0.28, color: '#E8E4DA', ink: '#141416', light: false }),
    teaser: addBay(46, 0, { rotation: 0.2 }),
    pdp: addBay(60, 0, { rotation: 0, beam: false, light: false }),
    studio: addBay(72, 0, { rotation: 0, beam: false, light: false }),
    fit: fitLineup[1],
    fitLineup,
  };
  const wallDrop = addLettering(12, 'QUIET HOURS', { y: 3.85, w: 11, opacity: 0.07 });
  const wallPdp = addLettering(60, 'NOCTURNE', { y: 3.55, w: 8.4, opacity: 0.055 });
  const wallStudio = addLettering(72, 'STUDIO', { y: 3.55, w: 8.4, opacity: 0.055 });
  const wallFit = addLettering(84, 'FIT', { y: 3.55, w: 8.4, opacity: 0.05 });
  const wallBack = addLettering(150, 'BACK OF HOUSE', { y: 4.2, w: 16, opacity: 0.045 });
  const wallDen = addLettering(225, 'THE DEN', { y: 4.3, w: 11, opacity: 0.05 });

  // ---- light ----
  scene.add(new THREE.HemisphereLight('#ffffff', '#0b0b0c', 0.32));
  const key = new THREE.SpotLight('#ffffff', 95, 0, 0.42, 0.75, 2);
  key.castShadow = shadows;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 16;
  const rim = new THREE.SpotLight('#ffffff', 80, 0, 0.5, 0.8, 2);
  const fill = new THREE.DirectionalLight('#ffffff', 0.35);
  scene.add(key, key.target, rim, rim.target, fill, fill.target);

  const focus = new THREE.Vector3(0, TEE_Y, 0);
  let spot = 0.42;
  function aimLights(f, angle) {
    focus.copy(f);
    spot = angle;
    key.position.set(f.x + 1.7, 6.6, f.z + 3.6);
    key.target.position.copy(f).setY(f.y - 0.6);
    key.angle = angle;
    key.intensity = 95 * (0.42 / angle) ** 0.6;
    rim.position.set(f.x - 1.8, 4.4, f.z - 3.6);
    rim.target.position.copy(f);
    fill.position.set(f.x - 4, 2.2, f.z + 6);
    fill.target.position.copy(f);
  }
  aimLights(focus, spot);

  return {
    bays,
    lights: { key, rim, fill },
    aimLights,
    setPdpWall: (t) => wallPdp.draw(t.toUpperCase()),
    redrawLettering: () => { wallDrop.redraw(); wallPdp.redraw(); wallStudio.redraw(); wallFit.redraw(); wallBack.redraw(); wallDen.redraw(); },
    garments: () => [bays.hero, bays.color, bays.craft, bays.teaser, bays.pdp, bays.studio, ...fitLineup].map((b) => b.garment),
  };
}
