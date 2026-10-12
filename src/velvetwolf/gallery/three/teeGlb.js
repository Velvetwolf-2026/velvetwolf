// Loads the production tee (uploaded GLB, processed by teeasset/process.mjs). The asset step already
// normalised it to scene units, stripped the baked AO and added two decal meshes
// (decal_front / decal_back) that hug the outer shell for prints.
// Served from public/ (not bundled into the JS) so the browser caches it across visits.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const TEE_URL = '/gallery/tee-web.glb';

export const TEE_CREDIT = {
  title: 'Oversized t-shirt',
  author: 'kylelhb',
  url: 'https://sketchfab.com/3d-models/oversized-t-shirt-3b6e78d6a1a74370a6e5af6f312d38f7',
  license: 'CC BY 4.0',
  licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
};

export async function loadTeeKit() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const res = await fetch(TEE_URL);
  if (!res.ok) throw new Error(`tee GLB request failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const gltf = await loader.parseAsync(buf, '');
  gltf.scene.updateMatrixWorld(true);
  // two tiers in one file: the full hero mesh (~64k tris) and a light copy (~15k) for phones,
  // small exhibits and shop cards. They share the material and the normal map.
  const hero = { body: [], decals: {} }, light = { body: [], decals: {} };
  let material = null;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const entry = { geometry: o.geometry, matrix: o.matrixWorld.clone() };
    const tier = o.name.startsWith('lod_') ? light : hero;
    const name = o.name.replace(/^lod_/, '');
    if (name.startsWith('decal_front')) tier.decals.front = entry;
    else if (name.startsWith('decal_back')) tier.decals.back = entry;
    else { tier.body.push(entry); material = material || o.material; }
  });
  const complete = (t) => t.body.length && t.decals.front && t.decals.back;
  if (!complete(hero)) throw new Error('tee GLB is missing parts');
  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
  blank.needsUpdate = true;
  const kit = { type: 'glb', ...hero, material, blank };
  kit.light = complete(light) ? { ...kit, ...light, tier: 'light' } : kit;
  return kit;
}
