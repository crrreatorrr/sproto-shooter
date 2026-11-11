// Cartoon kit models (art/blender/scripts/build_cartoon_kit.py). Vertex colours, no textures.
// A static kit model is one merged geometry. An effect keeps its scene and clip.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PRIORITY, assetStatus, ensureStatic, enqueue, instantiateStatic, peekAsset, retainAsset } from '../assets.js';

// Literal paths: scripts/asset-report.mjs finds references by reading them.
const PROPS = {
  barrel_fire: 'models/props/barrel_fire.glb',
  barrel_shock: 'models/props/barrel_shock.glb',
  barricade: 'models/props/barricade.glb',
  bazaar_tent: 'models/props/bazaar_tent.glb',
  bazaar_wall: 'models/props/bazaar_wall.glb',
  bench: 'models/props/bench.glb',
  billboard: 'models/props/billboard.glb',
  building_a: 'models/props/building_a.glb',
  building_b: 'models/props/building_b.glb',
  building_c: 'models/props/building_c.glb',
  cart: 'models/props/cart.glb',
  chest: 'models/props/chest.glb',
  clay_pots: 'models/props/clay_pots.glb',
  crosswalk: 'models/props/crosswalk.glb',
  drying_rack: 'models/props/drying_rack.glb',
  dune: 'models/props/dune.glb',
  dye_vat_gold: 'models/props/dye_vat_gold.glb',
  dye_vat_red: 'models/props/dye_vat_red.glb',
  dye_vat_teal: 'models/props/dye_vat_teal.glb',
  far_bazaar: 'models/props/far_bazaar.glb',
  fountain: 'models/props/fountain.glb',
  guard_rail: 'models/props/guard_rail.glb',
  hill_sign: 'models/props/hill_sign.glb',
  hydrant: 'models/props/hydrant.glb',
  kiosk: 'models/props/kiosk.glb',
  lantern_post: 'models/props/lantern_post.glb',
  low_wall: 'models/props/low_wall.glb',
  machine: 'models/props/machine.glb',
  mesa_a: 'models/props/mesa_a.glb',
  mesa_b: 'models/props/mesa_b.glb',
  onion_dome: 'models/props/onion_dome.glb',
  palm_tree: 'models/props/palm_tree.glb',
  planter: 'models/props/planter.glb',
  road_dash: 'models/props/road_dash.glb',
  sandstone_house: 'models/props/sandstone_house.glb',
  secret: 'models/props/secret.glb',
  shrine: 'models/props/shrine.glb',
  sidewalk: 'models/props/sidewalk.glb',
  skyline_a: 'models/props/skyline_a.glb',
  skyline_b: 'models/props/skyline_b.glb',
  skyline_c: 'models/props/skyline_c.glb',
  slide_truck: 'models/props/slide_truck.glb',
  street_lamp: 'models/props/street_lamp.glb',
  switch: 'models/props/switch.glb',
  toll_booth: 'models/props/toll_booth.glb',
  traffic_cone: 'models/props/traffic_cone.glb',
  water_tank: 'models/props/water_tank.glb',
  weapon_rack: 'models/props/weapon_rack.glb',
  well: 'models/props/well.glb',
};
const PICKUPS = {
  ammo_box: 'models/pickups/ammo_box.glb',
  gem: 'models/pickups/gem.glb',
  heart: 'models/pickups/heart.glb',
  potion: 'models/pickups/potion.glb',
  ticket: 'models/pickups/ticket.glb',
};
const FX = {
  explosion: 'models/fx/explosion.glb',
  poof: 'models/fx/poof.glb',
};
export const KIT = {
  prop: (name) => PROPS[name],
  pickup: (name) => PICKUPS[name],
  fx: (name) => FX[name],
  bomb: 'models/projectiles/bomb.glb',
};

let version = 0;
/** Goes up when a kit model finishes loading. Views that fell back to primitives rebuild on it. */
export const kitVersion = () => version;

async function parse(path) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  return new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/${path}`);
}

async function loadGeometry(path) {
  const g = await parse(path);
  g.scene.updateMatrixWorld(true);
  const parts = [];
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') geo.deleteAttribute(name);
    geo.applyMatrix4(o.matrixWorld);
    parts.push(geo);
  });
  if (!parts.length) return null;
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  version++;
  return { geometry, size, center, minY: geometry.boundingBox.min.y };
}

async function loadScene(path) {
  const g = await parse(path);
  if (!g.animations.length) return null;
  version++;
  // Blender writes one clip per object. They share a timeline, so they play as one.
  const clip = new THREE.AnimationClip('fx', -1, g.animations.flatMap((a) => a.tracks));
  return { scene: g.scene, clip };
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
  if (!lit) lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  return lit;
}
