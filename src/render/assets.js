// Loads Sproto Duel assets (meshopt-compressed GLBs, stage textures) and builds normalized, animated instances.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTER_MODELS, CHARACTER_ROTATION_Y, STAGE_IDS, stageAssets } from '../data/stages.js';

const BASE = `${import.meta.env.BASE_URL}assets/`;
const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader();

const models = new Map(); // path -> template {root, clips, height} | null
const textures = new Map(); // path -> texture | null
const jobs = new Map();
let version = 0;
const listeners = [];

export const assetsVersion = () => version;
export const onAssetsChanged = (fn) => listeners.push(fn);
const bump = () => { version++; listeners.forEach((f) => f(version)); };

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

function loadModel(path) {
  if (jobs.has(path)) return jobs.get(path);
  const job = gltf.loadAsync(BASE + path).then((g) => {
    const root = g.scene;
    root.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) { o.frustumCulled = false; if (o.material) o.material.side = THREE.DoubleSide; } });
    pinRootMotion(root, g.animations);
    // measure in bind pose with the -90° turn applied
    const holder = new THREE.Group();
    root.rotation.y = THREE.MathUtils.degToRad(CHARACTER_ROTATION_Y);
    holder.add(root);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder, true);
    const t = { root: holder, clips: g.animations, height: Math.max(0.01, box.max.y - box.min.y), minY: box.min.y, skinned: true };
    models.set(path, t);
    bump();
    return t;
  }).catch((err) => { console.warn('[assets] model failed', path, err.message); models.set(path, null); return null; });
  jobs.set(path, job);
  return job;
}

function loadStatic(path) {
  if (jobs.has(path)) return jobs.get(path);
  const job = gltf.loadAsync(BASE + path).then((g) => {
    const holder = new THREE.Group();
    g.scene.rotation.y = THREE.MathUtils.degToRad(-90);
    g.scene.traverse((o) => { if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });
    holder.add(g.scene);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const t = { root: holder, height: Math.max(0.01, box.max.y - box.min.y), minY: box.min.y, skinned: false };
    models.set(path, t);
    bump();
    return t;
  }).catch((err) => { console.warn('[assets] model failed', path, err.message); models.set(path, null); return null; });
  jobs.set(path, job);
  return job;
}

export function loadTexture(path, { color = true, repeat = null } = {}) {
  if (jobs.has(path)) return jobs.get(path);
  const job = texLoader.loadAsync(BASE + path).then((t) => {
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    t.anisotropy = 4;
    textures.set(path, t);
    bump();
    return t;
  }).catch(() => { textures.set(path, null); return null; });
  jobs.set(path, job);
  return job;
}

export const peekTexture = (path) => textures.get(path) || null;
export const peekModel = (path) => models.get(path) || null;

/** Start loading everything in the background: characters first, then stages. */
export function preloadAll() {
  for (const list of Object.values(CHARACTER_MODELS)) for (const p of list) loadModel(p);
  for (const id of STAGE_IDS) { const a = stageAssets(id); loadStatic(a.pillar); loadStatic(a.prop); }
}
export function preloadStage(id) {
  const a = stageAssets(id);
  return Promise.all([loadTexture(a.floor, { repeat: 1 }), loadTexture(a.sky), loadTexture(a.stone, { repeat: 1 }), loadStatic(a.pillar), loadStatic(a.prop)]);
}

/** A static prop instance fitted to `fitHeight`, standing on y=0. */
export function instantiateStatic(path, fitHeight) {
  const t = models.get(path);
  if (!t) return null;
  const inner = t.root.clone(true);
  const s = fitHeight / t.height;
  inner.scale.setScalar(s);
  inner.position.y = -t.minY * s;
  const g = new THREE.Group(); g.add(inner);
  return g;
}

const CLIP = { idle: 'idle', run: 'run', cast: 'cast', castBig: 'cast_big', hit: 'hit', defeat: 'defeat', stun: 'stun', jump: 'jump', victory: 'victory', strafeL: 'strafe_l', strafeR: 'strafe_r' };

/**
 * An animated character: { root, play(name, opts), update(dt), setFlash(v), fitTo(height) }.
 * Materials are cloned per instance so hit flashes don't light up every copy.
 */
export function instantiateCharacter(model, stage, fitHeight) {
  const path = CHARACTER_MODELS[model][stage - 1];
  const t = models.get(path);
  if (!t) return null;
  const inner = cloneSkinned(t.root);
  const mats = [];
  inner.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      if (o.material.emissive) mats.push(o.material);
    }
  });
  const root = new THREE.Group();
  root.add(inner);
  const fit = (h) => { const s = h / t.height; inner.scale.setScalar(s); inner.position.y = -t.minY * s; };
  fit(fitHeight);
  const mixer = new THREE.AnimationMixer(inner);
  const actions = {};
  for (const [k, name] of Object.entries(CLIP)) {
    const clip = t.clips.find((c) => c.name.toLowerCase() === name) || t.clips.find((c) => c.name.toLowerCase().includes(name));
    if (clip) actions[k] = mixer.clipAction(clip);
  }
  let current = null, flash = -1;
  return {
    root, model, stage, path,
    has: (k) => !!actions[k],
    play(k, { fade = 0.15, once = false, speed = 1, restart = false } = {}) {
      const a = actions[k] || actions.idle;
      if (!a) return;
      a.timeScale = speed;
      if (current === a && !restart) return;
      a.reset();
      a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = once;
      a.play();
      if (current && current !== a) current.crossFadeTo(a, fade, false);
      current = a;
    },
    setSpeed(s) { if (current) current.timeScale = s; },
    update(dt) { mixer.update(dt); },
    setFlash(v) {
      if (v === flash) return;
      flash = v;
      for (const m of mats) { m.emissive.setRGB(v, v, v); m.emissiveIntensity = 1; }
    },
    setTint(r, g, b) { for (const m of mats) m.emissive.setRGB(r, g, b); flash = -1; },
    fitTo: fit,
  };
}
