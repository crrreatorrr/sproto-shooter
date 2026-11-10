// Loads Sproto Duel assets (meshopt-compressed GLBs, stage textures) and builds normalized, animated instances.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CHARACTER_MODELS, rotationForModelPath, stageAssets } from '../data/stages.js';
import { createLoadControl } from './loadControl.js';
import { instantiateCharacter as buildCharacter } from './assets/characterInstance.js';

const BASE = `${import.meta.env.BASE_URL}assets/`;
const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader();

// ---- download queue: 'now' (needed this level) before 'later' (prefetch); a few at a time ----
const NOW = 0, LATER = 1;
const MAX_PARALLEL = 4;
// Two stages plus the viewmodel fit under this. Anything outside the demand set is dropped.
const RESIDENT_CAP = 96 * 1024 * 1024;
const control = createLoadControl({ maxParallel: MAX_PARALLEL, capBytes: RESIDENT_CAP, now: NOW, later: LATER });
const starters = new Map();

const requested = new Set();
function schedule(path, start, prio) {
  requested.add(path);
  starters.set(path, start);
  return control.schedule(path, start, prio);
}
function promote(path) { control.promote(path); }
/** Downloads waiting or in flight (for the HUD's loading hint). */
export const pendingDownloads = () => control.pendingDownloads();
export const requestedPaths = () => [...requested];
let version = 0;
const listeners = [];

export const assetsVersion = () => version;
export const onAssetsChanged = (fn) => listeners.push(fn);
const bump = () => { version++; listeners.forEach((f) => f(version)); };

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];

function estimateDecoded(root) {
  let n = 0;
  const seen = new Set();
  if (!root || !root.traverse) return n;
  root.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) {
      seen.add(o.geometry);
      for (const attr of Object.values(o.geometry.attributes)) n += attr.array?.byteLength || 0;
      if (o.geometry.index) n += o.geometry.index.array?.byteLength || 0;
    }
    for (const m of o.material ? [].concat(o.material) : []) {
      for (const key of TEX_KEYS) {
        const tex = m[key];
        if (!tex || seen.has(tex)) continue;
        seen.add(tex);
        const img = tex.image;
        const w = img?.width || img?.videoWidth || 0;
        const h = img?.height || img?.videoHeight || 0;
        n += w * h * 4;
      }
    }
  });
  return n;
}

function disposeTemplate(t) {
  if (!t) return;
  if (t.isTexture) { t.dispose(); return; }
  const root = t.root || t.scene;
  if (!root || !root.traverse) return;
  const geos = new Set();
  const mats = new Set();
  const texs = new Set();
  root.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    for (const m of o.material ? [].concat(o.material) : []) {
      mats.add(m);
      for (const key of TEX_KEYS) if (m[key]) texs.add(m[key]);
    }
  });
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  for (const tex of texs) tex.dispose();
}

function applyEvictions(disposed) {
  if (!disposed.length) return;
  for (const item of disposed) disposeTemplate(item.result);
  bump();
}

async function fetchBuf(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  const buf = await res.arrayBuffer();
  control.noteBytes(buf.byteLength);
  return buf;
}

function parseGltf(buf) {
  return new Promise((resolve, reject) => {
    gltf.parse(buf, BASE, resolve, (err) => reject(err instanceof Error ? err : new Error('decode failed')));
  });
}

// Boss clips are authored in place in Blender (art/blender/boss_animations.blend): their small hip sway and
// recoil are part of the motion (feet are planted against it), so they must not be pinned.
const IN_PLACE_CLIPS = /\/(dragon|monster|sproto_monster)\.glb$/;

/** Root motion pinned in place (port of sproto-duel src/assets/rig.ts pinRootMotion) so clips run on the spot. */
function pinRootMotion(template, clips) {
  let hips = null;
  template.traverse((o) => { if (!hips && o.isBone && !(o.parent && o.parent.isBone)) hips = o; });
  const parent = hips && hips.parent;
  if (!hips || !parent) return;
  const trackName = `${hips.name}.position`;
  // Horizontal hips motion is held at the rest position; vertical bob is kept. 'defeat' may travel.
  for (const clip of clips) {
    const track = clip.tracks.find((t) => t.name === trackName);
    if (!track || track.getValueSize() !== 3) continue;
    const v = track.values;
    if (clip.name.toLowerCase() === 'defeat') continue;
    for (let i = 0; i < v.length; i += 3) {
      v[i] = hips.position.x;
      v[i + 2] = hips.position.z;
    }
  }
}

function loadModel(path, prio = NOW) {
  if (control.status(path) !== 'idle' && control.status(path) !== 'error') {
    if (prio === NOW) promote(path);
    return control.schedule(path, starters.get(path), prio);
  }
  if (control.status(path) === 'error') return control.schedule(path, starters.get(path), prio);
  return schedule(path, async () => {
    const g = await parseGltf(await fetchBuf(path));
    if (!g || !g.scene) throw new Error('load failed');
    const root = g.scene;
    root.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) { o.frustumCulled = false; if (o.material) o.material.side = THREE.DoubleSide; } });
    if (!IN_PLACE_CLIPS.test(path)) pinRootMotion(root, g.animations);
    const holder = new THREE.Group();
    // The legacy enemy meshes' bind poses and locomotion both face +Z (verified on their rigs).
    // Other callers of the asset rotation table still use the original model conventions.
    const forward = /\/(midget|obama|sahil|tinubu)_stage[1-3]\.glb$/.test(path) ? 0 : rotationForModelPath(path);
    root.rotation.y = THREE.MathUtils.degToRad(forward);
    holder.add(root);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder, true);
    const t = { root: holder, clips: g.animations, height: Math.max(0.01, box.max.y - box.min.y), minY: box.min.y, skinned: true };
    control.setDecoded(path, estimateDecoded(holder));
    bump();
    return t;
  }, prio);
}

function loadStatic(path, prio = NOW) {
  if (control.status(path) === 'loading' || control.status(path) === 'ready') {
    if (prio === NOW) promote(path);
    return control.schedule(path, starters.get(path), prio);
  }
  if (control.status(path) === 'error') return control.schedule(path, starters.get(path), prio);
  return schedule(path, async () => {
    const g = await parseGltf(await fetchBuf(path));
    if (!g || !g.scene) throw new Error('load failed');
    const holder = new THREE.Group();
    g.scene.rotation.y = THREE.MathUtils.degToRad(-90);
    g.scene.traverse((o) => { if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });
    holder.add(g.scene);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const t = { root: holder, height: Math.max(0.01, box.max.y - box.min.y), minY: box.min.y, skinned: false };
    control.setDecoded(path, estimateDecoded(holder));
    bump();
    return t;
  }, prio);
}

export function loadTexture(path, { color = true, repeat = null, prio = NOW } = {}) {
  if (control.status(path) === 'loading' || control.status(path) === 'ready') {
    if (prio === NOW) promote(path);
    return control.schedule(path, starters.get(path), prio);
  }
  if (control.status(path) === 'error') return control.schedule(path, starters.get(path), prio);
  return schedule(path, async () => {
    const buf = await fetchBuf(path);
    const url = URL.createObjectURL(new Blob([buf]));
    try {
      const t = await texLoader.loadAsync(url);
      if (!t || !t.isTexture) throw new Error('load failed');
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
      t.anisotropy = 4;
      const w = t.image?.width || 0;
      const h = t.image?.height || 0;
      control.setDecoded(path, w * h * 4);
      bump();
      return t;
    } finally {
      URL.revokeObjectURL(url);
    }
  }, prio);
}

/**
 * Gun models by gun type. `yaw` turns the source model so its muzzle points down -Z (camera forward);
 * `muzzleY` is the barrel's height as a fraction of the model's height (0 = bottom, 1 = top).
 */
export const GUN_MODELS = {
  mg: { path: 'models/guns/toy_mg.glb', yaw: 90, muzzleY: 0.6 },
  shotgun: { path: 'models/guns/toy_shotgun.glb', yaw: -90, muzzleY: 0.85 },
  sniper: { path: 'models/guns/toy_sniper.glb', yaw: 90, muzzleY: 0.68 },
  bazooka: { path: 'models/guns/toy_bazooka.glb', yaw: 0, muzzleY: 0.47 },
  raygun: { path: 'models/guns/toy_raygun.glb', yaw: 90, muzzleY: 0.64 }, // muzzle: centre of the emitter dish
  bigbullets: { path: 'models/guns/toy_bigbullets.glb', yaw: 90, muzzleY: 0.59 }, // muzzle: centre of the flared bell
  duckgun: { path: 'models/guns/toy_duckgun.glb', yaw: 90, muzzleY: 0.62 }, // muzzle: the duck's beak
};

function loadGun(type, prio = NOW) {
  const def = GUN_MODELS[type];
  const path = def.path;
  if (control.status(path) === 'loading' || control.status(path) === 'ready') {
    if (prio === NOW) promote(path);
    return control.schedule(path, starters.get(path), prio);
  }
  if (control.status(path) === 'error') return control.schedule(path, starters.get(path), prio);
  return schedule(path, async () => {
    const g = await parseGltf(await fetchBuf(path));
    if (!g || !g.scene) throw new Error('load failed');
    g.scene.rotation.y = THREE.MathUtils.degToRad(def.yaw);
    g.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    const holder = new THREE.Group();
    holder.add(g.scene);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const center = box.getCenter(new THREE.Vector3());
    g.scene.position.sub(center); // origin at the model's center
    const size = box.getSize(new THREE.Vector3());
    const t = { root: holder, length: Math.max(0.01, size.z), size, muzzleY: def.muzzleY, skinned: false };
    control.setDecoded(path, estimateDecoded(holder));
    bump();
    return t;
  }, prio);
}

export function ensureGunModel(type, prio = NOW) {
  return GUN_MODELS[type] ? loadGun(type, prio) : Promise.resolve(null);
}

/**
 * Run an external starter on the same 4-wide queue (first-person arms, projectile meshes).
 * Failures stay errors. They are not cached as ready.
 */
export function enqueue(path, start, prio = NOW) {
  if (control.status(path) === 'loading' || control.status(path) === 'ready' || control.status(path) === 'error') {
    if (prio === NOW && control.status(path) !== 'ready') promote(path);
    return control.schedule(path, starters.get(path) || start, prio);
  }
  return schedule(path, async () => {
    const result = await start();
    if (result == null) throw new Error('load failed');
    const root = result.root || result.scene;
    if (root) control.setDecoded(path, estimateDecoded(root));
    bump();
    return result;
  }, prio);
}

export function assetStatus(path) { return control.status(path); }
export function peekAsset(path) { return control.result(path); }
export function retainAsset(path) { control.retain(path); }
export function releaseAsset(path) { control.release(path); }

export function loadReport() { return control.report(); }

/** Drop error jobs and run their starters again. Does not mark them ready. */
export function retryFailed() {
  const paths = control.retryPaths();
  const jobs = [];
  for (const path of paths) {
    const start = starters.get(path);
    if (start) jobs.push(control.schedule(path, start, NOW));
  }
  if (paths.length) bump();
  return Promise.all(jobs);
}

/**
 * Keep the current stage and its prefetch. Evict everything else that no live
 * instance still references, then anything unpinned past the resident cap.
 */
export function setAssetDemand(nowPaths, laterPaths) {
  applyEvictions(control.setDemand(nowPaths, laterPaths));
}

/**
 * A gun model instance scaled so its barrel axis is `length` long, centered on the origin, muzzle toward -Z.
 * Returns { root, muzzle: Vector3 (local), size: Vector3 (scaled) } or null if not loaded / no model.
 */
export function instantiateGun(type, length) {
  const def = GUN_MODELS[type];
  const t = def && control.result(def.path);
  if (!t) return null;
  control.retain(def.path);
  const inner = t.root.clone(true);
  const s = length / t.length;
  inner.scale.setScalar(s);
  const root = new THREE.Group();
  root.add(inner);
  let released = false;
  root.userData.releaseAsset = () => {
    if (released) return;
    released = true;
    control.release(def.path);
  };
  const size = t.size.clone().multiplyScalar(s);
  const muzzle = new THREE.Vector3(0, -size.y / 2 + size.y * t.muzzleY, -size.z / 2);
  return { root, muzzle, size };
}

export const peekTexture = (path) => {
  const t = control.result(path);
  return t && t.isTexture ? t : null;
};
export const peekModel = (path) => {
  const t = control.result(path);
  return t && t.root ? t : null;
};

export const PRIORITY = { NOW, LATER };

/** Request one stage's sky, floor, stone and decor. Sky and floor go first: they fill the screen. */
export function ensureStage(id, prio = NOW) {
  const a = stageAssets(id);
  return Promise.all([loadTexture(a.sky, { prio }), loadTexture(a.floor, { prio }), loadTexture(a.stone, { prio }), loadStatic(a.pillar, prio), loadStatic(a.prop, prio)]);
}
export function stageReady(id) {
  const a = stageAssets(id);
  return [a.sky, a.floor, a.stone, a.pillar, a.prop].every((p) => control.isReady(p));
}
export function stagePaths(id) {
  const a = stageAssets(id);
  return [a.sky, a.floor, a.stone, a.pillar, a.prop];
}

/** Request one character model (model id + Sproto Duel stage 1..3). */
export function ensureCharacter(model, stage, prio = NOW) {
  const path = CHARACTER_MODELS[model] && CHARACTER_MODELS[model][stage - 1];
  return path ? loadModel(path, prio) : Promise.resolve(null);
}
export function characterPath(model, stage) {
  return (CHARACTER_MODELS[model] && CHARACTER_MODELS[model][stage - 1]) || null;
}
export function characterReady(model, stage) {
  const path = characterPath(model, stage);
  return !path || control.isReady(path);
}

/** A static prop instance fitted to `fitHeight`, standing on y=0. */
export function instantiateStatic(path, fitHeight) {
  const t = control.result(path);
  if (!t || !t.root) return null;
  control.retain(path);
  const inner = t.root.clone(true);
  const s = fitHeight / t.height;
  inner.scale.setScalar(s);
  inner.position.y = -t.minY * s;
  const g = new THREE.Group();
  g.add(inner);
  let released = false;
  g.userData.releaseAsset = () => {
    if (released) return;
    released = true;
    control.release(path);
  };
  return g;
}

export function instantiateCharacter(model, stage, fitHeight) {
  return buildCharacter(model, stage, fitHeight, control);
}
