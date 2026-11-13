// Cartoon kit models (art/blender/scripts/build_cartoon_kit.py). Vertex colours, no textures.
// A static kit model is one merged geometry. An effect keeps its scene and clip.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadPackedGltf } from '../loadPackedGltf.js';
import { PRIORITY, assetStatus, ensureStatic, enqueue, instantiateStatic, peekAsset, retainAsset } from '../assets.js';
// Literal paths: scripts/asset-report.mjs finds references by reading them.
const PROPS = {
  barrel_fire: 'models/props/barrel_fire.glb.gz',
  barrel_shock: 'models/props/barrel_shock.glb.gz',
  barricade: 'models/props/barricade.glb.gz',
  bazaar2_archway: 'models/props/bazaar2_archway.glb.gz',
  bazaar2_beacon: 'models/props/bazaar2_beacon.glb.gz',
  bazaar2_brazier: 'models/props/bazaar2_brazier.glb.gz',
  bazaar2_canopy: 'models/props/bazaar2_canopy.glb.gz',
  bazaar2_city: 'models/props/bazaar2_city.glb.gz',
  bazaar2_lantern: 'models/props/bazaar2_lantern.glb.gz',
  bazaar2_ridge: 'models/props/bazaar2_ridge.glb.gz',
  bazaar2_ring_inlay: 'models/props/bazaar2_ring_inlay.glb.gz',
  bazaar2_rug: 'models/props/bazaar2_rug.glb.gz',
  bazaar2_shop: 'models/props/bazaar2_shop.glb.gz',
  bazaar2_support: 'models/props/bazaar2_support.glb.gz',
  bazaar2_tower: 'models/props/bazaar2_tower.glb.gz',
  bazaar2_wall_panel: 'models/props/bazaar2_wall_panel.glb.gz',
  bazaar_tent: 'models/props/bazaar_tent.glb.gz',
  bazaar_wall: 'models/props/bazaar_wall.glb.gz',
  bench: 'models/props/bench.glb.gz',
  billboard: 'models/props/billboard.glb.gz',
  building_a: 'models/props/building_a.glb.gz',
  building_b: 'models/props/building_b.glb.gz',
  building_c: 'models/props/building_c.glb.gz',
  campaign_shrine: 'models/props/campaign_shrine.glb.gz',
  cart: 'models/props/cart.glb.gz',
  chest: 'models/props/chest.glb.gz',
  clay_pots: 'models/props/clay_pots.glb.gz',
  crosswalk: 'models/props/crosswalk.glb.gz',
  drying_rack: 'models/props/drying_rack.glb.gz',
  dune: 'models/props/dune.glb.gz',
  dye_vat_gold: 'models/props/dye_vat_gold.glb.gz',
  dye_vat_red: 'models/props/dye_vat_red.glb.gz',
  dye_vat_teal: 'models/props/dye_vat_teal.glb.gz',
  far_bazaar: 'models/props/far_bazaar.glb.gz',
  fountain: 'models/props/fountain.glb.gz',
  frost_alarm: 'models/props/frost_alarm.glb.gz',
  frost_beacon: 'models/props/frost_beacon.glb.gz',
  frost_boulder: 'models/props/frost_boulder.glb.gz',
  frost_charge_ring: 'models/props/frost_charge_ring.glb.gz',
  frost_column: 'models/props/frost_column.glb.gz',
  frost_console: 'models/props/frost_console.glb.gz',
  frost_cover: 'models/props/frost_cover.glb.gz',
  frost_crate: 'models/props/frost_crate.glb.gz',
  frost_debris: 'models/props/frost_debris.glb.gz',
  frost_deck: 'models/props/frost_deck.glb.gz',
  frost_drift: 'models/props/frost_drift.glb.gz',
  frost_drill: 'models/props/frost_drill.glb.gz',
  frost_floodlight: 'models/props/frost_floodlight.glb.gz',
  frost_gate: 'models/props/frost_gate.glb.gz',
  frost_generator: 'models/props/frost_generator.glb.gz',
  frost_glacier: 'models/props/frost_glacier.glb.gz',
  frost_ice_floor: 'models/props/frost_ice_floor.glb.gz',
  frost_pad: 'models/props/frost_pad.glb.gz',
  frost_panel: 'models/props/frost_panel.glb.gz',
  frost_pine: 'models/props/frost_pine.glb.gz',
  frost_pod: 'models/props/frost_pod.glb.gz',
  frost_rail: 'models/props/frost_rail.glb.gz',
  frost_relay_outpost: 'models/props/frost_relay_outpost.glb.gz',
  frost_ridge: 'models/props/frost_ridge.glb.gz',
  frost_portal_trim: 'models/props/frost_portal_trim.glb.gz',
  frost_roof: 'models/props/frost_roof.glb.gz',
  frost_safe: 'models/props/frost_safe.glb.gz',
  frost_searchlight: 'models/props/frost_searchlight.glb.gz',
  frost_shelf: 'models/props/frost_shelf.glb.gz',
  frost_snowcat: 'models/props/frost_snowcat.glb.gz',
  frost_spire: 'models/props/frost_spire.glb.gz',
  frost_tank: 'models/props/frost_tank.glb.gz',
  frost_tent: 'models/props/frost_tent.glb.gz',
  frost_wall: 'models/props/frost_wall.glb.gz',
  grove_arch: 'models/props/grove_arch.glb.gz',
  grove_barn_roof: 'models/props/grove_barn_roof.glb.gz',
  grove_beanstalk: 'models/props/grove_beanstalk.glb.gz',
  grove_bloom: 'models/props/grove_bloom.glb.gz',
  grove_boulder: 'models/props/grove_boulder.glb.gz',
  grove_bridge: 'models/props/grove_bridge.glb.gz',
  grove_cabbage: 'models/props/grove_cabbage.glb.gz',
  grove_crate: 'models/props/grove_crate.glb.gz',
  grove_crops: 'models/props/grove_crops.glb.gz',
  grove_gazebo: 'models/props/grove_gazebo.glb.gz',
  grove_greenhouse_frame: 'models/props/grove_greenhouse_frame.glb.gz',
  grove_greenhouse_glass: 'models/props/grove_greenhouse_glass.glb.gz',
  grove_greenhouse_roof: 'models/props/grove_greenhouse_roof.glb.gz',
  grove_hay: 'models/props/grove_hay.glb.gz',
  grove_hedge: 'models/props/grove_hedge.glb.gz',
  grove_lantern: 'models/props/grove_lantern.glb.gz',
  grove_leaf_step: 'models/props/grove_leaf_step.glb.gz',
  grove_nest: 'models/props/grove_nest.glb.gz',
  grove_patch: 'models/props/grove_patch.glb.gz',
  grove_orchard_rise: 'models/props/grove_orchard_rise.glb.gz',
  grove_orchard_barn: 'models/props/grove_orchard_barn.glb.gz',
  grove_orchard_windmill: 'models/props/grove_orchard_windmill.glb.gz',
  grove_pines: 'models/props/grove_pines.glb.gz',
  grove_planter: 'models/props/grove_planter.glb.gz',
  grove_pod: 'models/props/grove_pod.glb.gz',
  grove_pumpkin: 'models/props/grove_pumpkin.glb.gz',
  grove_reeds: 'models/props/grove_reeds.glb.gz',
  grove_root_wall: 'models/props/grove_root_wall.glb.gz',
  grove_scarecrow: 'models/props/grove_scarecrow.glb.gz',
  grove_shed: 'models/props/grove_shed.glb.gz',
  grove_silo: 'models/props/grove_silo.glb.gz',
  grove_stockade: 'models/props/grove_stockade.glb.gz',
  grove_stones: 'models/props/grove_stones.glb.gz',
  grove_timber_ramp: 'models/props/grove_timber_ramp.glb.gz',
  grove_topiary: 'models/props/grove_topiary.glb.gz',
  grove_totem: 'models/props/grove_totem.glb.gz',
  grove_tower: 'models/props/grove_tower.glb.gz',
  grove_tractor: 'models/props/grove_tractor.glb.gz',
  grove_tree: 'models/props/grove_tree.glb.gz',
  grove_truck: 'models/props/grove_truck.glb.gz',
  grove_wide_root_arch: 'models/props/grove_wide_root_arch.glb.gz',
  grove_water_tower: 'models/props/grove_water_tower.glb.gz',
  guard_rail: 'models/props/guard_rail.glb.gz',
  hill_sign: 'models/props/hill_sign.glb.gz',
  hydrant: 'models/props/hydrant.glb.gz',
  kiosk: 'models/props/kiosk.glb.gz',
  lantern_post: 'models/props/lantern_post.glb.gz',
  low_wall: 'models/props/low_wall.glb.gz',
  machine: 'models/props/machine.glb.gz',
  mesa_a: 'models/props/mesa_a.glb.gz',
  mesa_b: 'models/props/mesa_b.glb.gz',
  moonlit_apron: 'models/props/moonlit_apron.glb.gz',
  moonlit_camp: 'models/props/moonlit_camp.glb.gz',
  moonlit_column: 'models/props/moonlit_column.glb.gz',
  moonlit_crypt_wall: 'models/props/moonlit_crypt_wall.glb.gz',
  moonlit_fragment: 'models/props/moonlit_fragment.glb.gz',
  moonlit_gate: 'models/props/moonlit_gate.glb.gz',
  moonlit_lantern: 'models/props/moonlit_lantern.glb.gz',
  moonlit_medallion: 'models/props/moonlit_medallion.glb.gz',
  moonlit_obelisk: 'models/props/moonlit_obelisk.glb.gz',
  moonlit_portal_frame: 'models/props/moonlit_portal_frame.glb.gz',
  moonlit_portal_light: 'models/props/moonlit_portal_light.glb.gz',
  moonlit_ridge: 'models/props/moonlit_ridge.glb.gz',
  moonlit_ruin_arch: 'models/props/moonlit_ruin_arch.glb.gz',
  moonlit_sconce: 'models/props/moonlit_sconce.glb.gz',
  moonlit_tomb: 'models/props/moonlit_tomb.glb.gz',
  moonlit_vault: 'models/props/moonlit_vault.glb.gz',
  moonlit_viaduct: 'models/props/moonlit_viaduct.glb.gz',
  moonlit_wall: 'models/props/moonlit_wall.glb.gz',
  office_clock: 'models/props/office_clock.glb.gz',
  office_conduit: 'models/props/office_conduit.glb.gz',
  office_cubicle: 'models/props/office_cubicle.glb.gz',
  office_dish: 'models/props/office_dish.glb.gz',
  office_elevator: 'models/props/office_elevator.glb.gz',
  office_facade: 'models/props/office_facade.glb.gz',
  office_fan: 'models/props/office_fan.glb.gz',
  office_laser: 'models/props/office_laser.glb.gz',
  office_pad: 'models/props/office_pad.glb.gz',
  office_parapet: 'models/props/office_parapet.glb.gz',
  office_pilaster: 'models/props/office_pilaster.glb.gz',
  office_planter: 'models/props/office_planter.glb.gz',
  office_portal: 'models/props/office_portal.glb.gz',
  office_reception: 'models/props/office_reception.glb.gz',
  office_server: 'models/props/office_server.glb.gz',
  office_skirt: 'models/props/office_skirt.glb.gz',
  office_soffit: 'models/props/office_soffit.glb.gz',
  office_tower: 'models/props/office_tower.glb.gz',
  office_wall: 'models/props/office_wall.glb.gz',
  onion_dome: 'models/props/onion_dome.glb.gz',
  palm_tree: 'models/props/palm_tree.glb.gz',
  planter: 'models/props/planter.glb.gz',
  road_dash: 'models/props/road_dash.glb.gz',
  sandstone_house: 'models/props/sandstone_house.glb.gz',
  secret: 'models/props/secret.glb.gz',
  shrine: 'models/props/shrine.glb.gz',
  sidewalk: 'models/props/sidewalk.glb.gz',
  skyline_a: 'models/props/skyline_a.glb.gz',
  skyline_b: 'models/props/skyline_b.glb.gz',
  skyline_barrier: 'models/props/skyline_barrier.glb.gz',
  skyline_c: 'models/props/skyline_c.glb.gz',
  skyline_canopy: 'models/props/skyline_canopy.glb.gz',
  skyline_cladding: 'models/props/skyline_cladding.glb.gz',
  skyline_crane: 'models/props/skyline_crane.glb.gz',
  skyline_depot: 'models/props/skyline_depot.glb.gz',
  skyline_fan: 'models/props/skyline_fan.glb.gz',
  skyline_lamp: 'models/props/skyline_lamp.glb.gz',
  skyline_masonry: 'models/props/skyline_masonry.glb.gz',
  skyline_midrise: 'models/props/skyline_midrise.glb.gz',
  skyline_shop: 'models/props/skyline_shop.glb.gz',
  skyline_skybridge: 'models/props/skyline_skybridge.glb.gz',
  skyline_slab: 'models/props/skyline_slab.glb.gz',
  skyline_spire: 'models/props/skyline_spire.glb.gz',
  skyline_tower: 'models/props/skyline_tower.glb.gz',
  skyline_trailer: 'models/props/skyline_trailer.glb.gz',
  slide_truck: 'models/props/slide_truck.glb.gz',
  street_lamp: 'models/props/street_lamp.glb.gz',
  switch: 'models/props/switch.glb.gz',
  toll_booth: 'models/props/toll_booth.glb.gz',
  traffic_cone: 'models/props/traffic_cone.glb.gz',
  underworks_basalt_cluster: 'models/props/underworks_basalt_cluster.glb.gz',
  underworks_basalt_wall: 'models/props/underworks_basalt_wall.glb.gz',
  underworks_cart: 'models/props/underworks_cart.glb.gz',
  underworks_chimney: 'models/props/underworks_chimney.glb.gz',
  underworks_furnace: 'models/props/underworks_furnace.glb.gz',
  underworks_gantry: 'models/props/underworks_gantry.glb.gz',
  underworks_hoist: 'models/props/underworks_hoist.glb.gz',
  underworks_lavafall: 'models/props/underworks_lavafall.glb.gz',
  underworks_magma: 'models/props/underworks_magma.glb.gz',
  underworks_pipe: 'models/props/underworks_pipe.glb.gz',
  underworks_press: 'models/props/underworks_press.glb.gz',
  underworks_reactor: 'models/props/underworks_reactor.glb.gz',
  underworks_roof: 'models/props/underworks_roof.glb.gz',
  underworks_steel_wall: 'models/props/underworks_steel_wall.glb.gz',
  underworks_track: 'models/props/underworks_track.glb.gz',
  underworks_tunnel: 'models/props/underworks_tunnel.glb.gz',
  void_apron: 'models/props/void_apron.glb.gz',
  void_asteroid: 'models/props/void_asteroid.glb.gz',
  void_beacon: 'models/props/void_beacon.glb.gz',
  void_bridge: 'models/props/void_bridge.glb.gz',
  void_bulkhead: 'models/props/void_bulkhead.glb.gz',
  void_candle_down: 'models/props/void_candle_down.glb.gz',
  void_candle_up: 'models/props/void_candle_up.glb.gz',
  void_cargo: 'models/props/void_cargo.glb.gz',
  void_crystal: 'models/props/void_crystal.glb.gz',
  void_debris_belt: 'models/props/void_debris_belt.glb.gz',
  void_gate_frame: 'models/props/void_gate_frame.glb.gz',
  void_orbital_mast: 'models/props/void_orbital_mast.glb.gz',
  void_deck: 'models/props/void_deck.glb.gz',
  void_fuel: 'models/props/void_fuel.glb.gz',
  void_gantry: 'models/props/void_gantry.glb.gz',
  void_halo: 'models/props/void_halo.glb.gz',
  void_jetpack: 'models/props/void_jetpack.glb.gz',
  void_landing: 'models/props/void_landing.glb.gz',
  void_ledger: 'models/props/void_ledger.glb.gz',
  void_pylon: 'models/props/void_pylon.glb.gz',
  void_rail: 'models/props/void_rail.glb.gz',
  void_relay: 'models/props/void_relay.glb.gz',
  void_rockfall: 'models/props/void_rockfall.glb.gz',
  void_server: 'models/props/void_server.glb.gz',
  void_shelter: 'models/props/void_shelter.glb.gz',
  void_shield: 'models/props/void_shield.glb.gz',
  void_sign: 'models/props/void_sign.glb.gz',
  void_supply: 'models/props/void_supply.glb.gz',
  void_terminal: 'models/props/void_terminal.glb.gz',
  void_ticker: 'models/props/void_ticker.glb.gz',
  void_vault: 'models/props/void_vault.glb.gz',
  void_vent: 'models/props/void_vent.glb.gz',
  void_vortex: 'models/props/void_vortex.glb.gz',
  water_tank: 'models/props/water_tank.glb.gz',
  weapon_rack: 'models/props/weapon_rack.glb.gz',
  well: 'models/props/well.glb.gz',
};
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
