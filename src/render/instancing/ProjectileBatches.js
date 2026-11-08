import * as THREE from 'three';
import { RESOURCES } from '../../data/drops.js';
import { PRIORITY, assetStatus, enqueue, peekAsset, retainAsset } from '../assets.js';

export function mountProjectiles(env) {
  const { E, G, scene } = env;
  async function loadProjectileModel(d) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
      const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}assets/${d.model}`);
      let mesh = null;
      g.scene.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
      if (!mesh) return null;
      // compressed models store quantized (KHR_mesh_quantization) attributes that only decode through the node
      // transform: dequantize to floats first, or baking the transform in clamps everything to ±1 (a box)
      g.scene.updateMatrixWorld(true);
      const geo = mesh.geometry.clone();
      for (const name of Object.keys(geo.attributes)) {
        const a = geo.attributes[name];
        if (a.array instanceof Float32Array && !a.normalized) continue;
        const f = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j); // denormalizes
        geo.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
      }
      geo.applyMatrix4(mesh.matrixWorld);
      geo.computeBoundingBox();
      const c = geo.boundingBox.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -c.y, -c.z);
      geo.rotateY(d.noseYaw || 0);
      geo.computeBoundingBox();
      const sz = geo.boundingBox.getSize(new THREE.Vector3());
      const k = d.len / Math.max(1e-4, sz.z);
      geo.scale(k, k, k);
      let material = mesh.material;
      if (d.glow && material.emissive) { material = material.clone(); material.emissive.set(d.glow); material.emissiveIntensity = 0.7; } // readable against the sky
      return { geometry: geo, material };
    } catch (err) { console.warn('[projectiles] model failed', d.model, err.message); return null; }
  }

  // ---------- instanced projectiles ----------
  const PROJ_KINDS = {
    orb: { color: 0xc77dff, scale: 0.35, cap: 500 }, taxBolt: { color: 0xff3bd4, scale: 0.4, cap: 32 },
    spit: { color: 0x9be33b, scale: 0.3, cap: 64 }, gooBolt: { color: 0x7fff4a, scale: 0.28, cap: 64 },
    rocket: { color: 0xff6a3d, scale: 0.22, cap: 32 }, duckBullet: { color: 0xffe14a, scale: 0.2, cap: 128 },
    megaBullet: { color: 0xffffff, scale: 0.6, cap: 16 }, yeetGun: { color: 0xaaaaaa, scale: 0.35, cap: 16 },
    bigBullet: { color: 0xffa21f, scale: 0.26, cap: 32 }, // Big Bullets round: fat, stretched along its flight
    // Duck Gun rubber bullet: the modelled round, medium sized, tumbling as it flies
    rubberBullet: { color: 0xffd23a, scale: 0.3, cap: 64, model: 'models/projectiles/rubber_bullet.glb', len: 0.42, noseYaw: 0 },
    bullet: { color: 0xffc93c, scale: 0.22, cap: 600 },
    flame: { color: 0xff7a1a, scale: 0.4, cap: 300 }, fireball: { color: 0xff4a1a, scale: 0.6, cap: 16 },
    pellet: { color: 0xff5ec4, scale: 0.12, cap: 300 },
    // boss projectiles drawn with 3D models (`model`, fitted to `len` metres, nose along +Z); a sphere until loaded
    monsterBullet: { color: 0x4a5a2a, scale: 0.35, cap: 200, model: 'models/projectiles/monster_bullet.glb', len: 0.9, noseYaw: -Math.PI / 2 },
    missile: { color: 0xff8a1a, scale: 0.4, cap: 64, model: 'models/projectiles/missile.glb', len: 1.3, noseYaw: -Math.PI / 2, glow: 0xff6a10 },
    // Car Part Monster's tyres (tumble end over end, glowing hot) and the Mole Monster's drill heads (spin nose-first)
    tyre: { color: 0x222222, scale: 0.6, cap: 48, model: 'models/projectiles/tyre.glb', len: 1.5, noseYaw: 0, glow: 0x5a1c04 }, // dark rubber, ember glow
    drill: { color: 0x9a7a5a, scale: 0.4, cap: 96, model: 'models/projectiles/drill_head.glb', len: 1.1, noseYaw: Math.PI / 2 },
    // robot lasers: stretched bolts along their flight
    laser: { color: 0xff2a2a, scale: 0.13, cap: 300 }, bigLaser: { color: 0x6ff6ff, scale: 0.42, cap: 32 },
  };
  const inst = {};
  const dummy = new THREE.Object3D();
  for (const [k, d] of Object.entries(PROJ_KINDS)) {
    const im = new THREE.InstancedMesh(k === 'yeetGun' ? G.box : G.sphereLo, E(d.color), d.cap);
    im.frustumCulled = false; im.count = 0;
    scene.add(im);
    inst[k] = { im, n: 0, d, modeled: false };
  }
  function ensureProjectileModel(I) {
    const d = I.d;
    if (!d.model || I.modeled) return;
    const found = peekAsset(d.model);
    if (found && found.geometry) {
      retainAsset(d.model);
      I.im.geometry = found.geometry;
      I.im.material = found.material;
      I.modeled = true;
      return;
    }
    if (assetStatus(d.model) === 'loading' || assetStatus(d.model) === 'error') return;
    enqueue(d.model, () => loadProjectileModel(d), PRIORITY.LATER);
  }

  // pickups instanced
  const PK = {};
  const pickupKinds = ['health', 'bigHealth', 'mana', 'ammo', 'resource', 'tickets'];
  for (const k of pickupKinds) {
    const geo = k === 'ammo' || k === 'resource' ? G.box : k === 'tickets' ? G.cyl : G.sphereLo;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 256);
    im.frustumCulled = false; im.count = 0;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    scene.add(im);
    PK[k] = { im, n: 0 };
  }
  const RES_COL = Object.fromEntries(RESOURCES.map((r) => [r.id, new THREE.Color(r.color)]));
  const AMMO_COL = { bullets: new THREE.Color(0xffd166), shells: new THREE.Color(0xff6a3d), sniper: new THREE.Color(0x4fe3ff), rockets: new THREE.Color(0xb07cff) };
  const PK_COL = { health: new THREE.Color(0xff4d6d), bigHealth: new THREE.Color(0xff2255), mana: new THREE.Color(0x6aa8ff), tickets: new THREE.Color(0xffd700) };
  Object.assign(env, { loadProjectileModel, PROJ_KINDS, inst, dummy, ensureProjectileModel, PK, pickupKinds, RES_COL, AMMO_COL, PK_COL });
}
