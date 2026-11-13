// Cartoon kit models (art/blender/scripts/build_cartoon_kit.py). Vertex colours, no textures.
// A static kit model is one merged geometry. An effect keeps its scene and clip.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadPackedGltf } from '../loadPackedGltf.js';
import { PRIORITY, assetStatus, ensureStatic, enqueue, instantiateStatic, peekAsset, retainAsset } from '../assets.js';
import { PROPS } from './kitPropPaths.js';

const PICKUPS = {
  ammo_box: 'models/pickups/ammo_box.glb.gz',
  gem: 'models/pickups/gem.glb.gz',
  heart: 'models/pickups/heart.glb.gz',
  potion: 'models/pickups/potion.glb.gz',
  ticket: 'models/pickups/ticket.glb.gz',
};
const FX = {
  explosion: 'models/fx/explosion.glb.gz',
  poof: 'models/fx/poof.glb.gz',
};
export const KIT = {
  prop: (name) => PROPS[name],
  pickup: (name) => PICKUPS[name],
  fx: (name) => FX[name],
  bomb: 'models/projectiles/bomb.glb.gz',
};
let version = 0;
/** Goes up when a kit model finishes loading. Views that fell back to primitives rebuild on it. */
export const kitVersion = () => version;

async function parse(path) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  return loadPackedGltf(new GLTFLoader(), path);
}

async function loadGeometry(path) {
  const g = await parse(path);
  g.scene.updateMatrixWorld(true);
  const parts = [];
  let hasAuthoredGlow = false;
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') geo.deleteAttribute(name);
    const source = o.material.emissive;
    const power = source ? Math.max(source.r, source.g, source.b) * o.material.emissiveIntensity : 0;
    const glow = Math.round(Math.min(2, power) * 127.5);
    if (glow) hasAuthoredGlow = true;
    const mask = new Uint8Array(geo.attributes.position.count).fill(glow);
    geo.setAttribute('kitGlow', new THREE.Uint8BufferAttribute(mask, 1, true));
    geo.applyMatrix4(o.matrixWorld);
    parts.push(geo);
  });
  if (!parts.length) return null;
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  version++;
  const name = path.split('/').at(-1).split('.')[0];
  const motion = g.animations.length ? { scene: g.scene, clip: combinedClip(g, name) } : null;
  return { geometry, size, center, minY: geometry.boundingBox.min.y, name, motion, hasAuthoredGlow };
}

function combinedClip(g, name) {
  // Exported Blender tracks share a timeline.
  return new THREE.AnimationClip(name, -1, g.animations.flatMap((a) => a.tracks));
}

async function loadScene(path) {
  const g = await parse(path);
  if (!g.animations.length) return null;
  version++;
  return { scene: g.scene, clip: combinedClip(g, 'fx') };
}

function ensure(path, start, prio) {
  const found = peekAsset(path);
  if (found) return found;
  const status = assetStatus(path);
  if (status !== 'loading' && status !== 'error') enqueue(path, start, prio).then(() => retainAsset(path), () => {});
  return null;
}

/** `{ geometry, size, center, minY }` once loaded, else null (and the load starts). */
export function kitGeometry(path, prio = PRIORITY.NOW) {
  return ensure(path, () => loadGeometry(path), prio);
}

/** `{ scene, clip }` once loaded, else null (and the load starts). */
export function kitScene(path, prio = PRIORITY.LATER) {
  return ensure(path, () => loadScene(path), prio);
}

// Sproto Duel's textured props, copied from that repo (read-only there). Literal paths, as above.
export const DUEL = {
  food_truck: 'models/obstacles/food_truck.glb',
  parked_car: 'models/obstacles/parked_car.glb',
  dumpster: 'models/obstacles/dumpster.glb',
  market_stall: 'models/obstacles/market_stall.glb',
  rug_pile: 'models/obstacles/rug_pile.glb',
  rock_outcrop: 'models/obstacles/rock_outcrop.glb',
  desert_pillar: 'models/stages/desert/pillar.glb',
  desert_prop: 'models/stages/desert/prop.glb',
  grove_pillar: 'models/stages/grove/pillar.glb',
  grove_prop: 'models/stages/grove/prop.glb',
  office_pillar: 'models/stages/office/pillar.glb',
  office_prop: 'models/stages/office/prop.glb',
  city_pillar: 'models/stages/city/pillar.glb',
  city_prop: 'models/stages/city/prop.glb',
  glacier_pillar: 'models/stages/glacier/pillar.glb',
  glacier_prop: 'models/stages/glacier/prop.glb',
  void_pillar: 'models/stages/void/pillar.glb',
  void_prop: 'models/stages/void/prop.glb',
  volcano_pillar: 'models/stages/volcano/pillar.glb',
  volcano_prop: 'models/stages/volcano/prop.glb',
};

const waiting = new Set();

/**
 * A fresh instance of a Sproto Duel prop at its authored size, base on y 0, or null while it loads.
 * `userData.releaseAsset()` must be called when the instance is dropped.
 */
export function duelInstance(name, prio = PRIORITY.NOW) {
  const path = DUEL[name];
  if (!path) return null;
  const t = peekAsset(path);
  if (t && t.root) return instantiateStatic(path, t.height);
  // The stage loader may already be fetching this file. Wait on the same download, once, and redraw then.
  if (assetStatus(path) !== 'error' && !waiting.has(path)) {
    waiting.add(path);
    ensureStatic(path, prio).then(() => { waiting.delete(path); version++; }, () => { waiting.delete(path); });
  }
  return null;
}

let lit = null;
/** Shared lit material. Front faces only: the baked outline hull depends on it. */
export function kitMaterial() {
  if (lit) return lit;
  lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  lit.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute float kitGlow;
      varying float vKitGlow;
    `).replace('#include <begin_vertex>', `#include <begin_vertex>
      vKitGlow = kitGlow;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying float vKitGlow;
    `).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
        totalEmissiveRadiance += vColor.rgb * vKitGlow * 2.;
      #endif
    `);
  };
  return lit;
}
