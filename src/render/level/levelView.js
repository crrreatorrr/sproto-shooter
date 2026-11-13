// Campaign geometry for the current section. One merged mesh per material.
import * as THREE from 'three';
import { getLevelRuntime } from '../../sim/level/runtime.js';
import { solidTerrain } from '../../sim/campaign/terrain.js';
import { DRESSING, HIDE_WHEN_GOT, MECHANISM_MODEL, STAGE_DRESSING } from './dressing.js';
import { FROST_COLORS, frostspirePlacements } from './frostspireDressing.js';
import { bazaarPaving, bazaarPlacements } from './bazaarDressing.js';
import { calderaPlacements } from './calderaDressing.js';
import { landingPlacements } from './landingDressing.js';
import { moonlitPlacements } from './moonlitDressing.js';
import { officePlacements } from './officeDressing.js';
import { underworksPlacements } from './underworksDressing.js';
import { updateUnderworksMagma } from './underworksMagma.js';
import { skylinePlacements } from './skylineDressing.js';
import { syncFrostSearchlight } from './frostspireLights.js';
import { voidPlacements } from './voidDressing.js';
import { voidMaterial } from './voidMaterial.js';
import { groveGeometry, grovePlacements } from './groveDressing.js';
import { groveMaterial } from './groveMaterials.js';
import { createCampaignFixtureLights } from './campaignFixtureLights.js';
import { createCampaignSurfaceMaterials } from './campaignSurfaceMaterials.js';
import { buildSectionMeshes, LEVEL_COLOR, levelMaterial, terrainMesh } from './levelGeometry.js';
import { decorMeshes } from './levelDecorMeshes.js';
import { createKitObject, updateKitMotion } from './kitMotion.js';
import { DT } from '../../sim/simulate.js';
import { KIT, duelInstance, kitGeometry, kitMaterial, kitVersion } from './kitModels.js';

export { buildLookGroup, buildSectionMeshes, LEVEL_COLOR, levelMaterial } from './levelGeometry.js';

const CAMPAIGN_KITS = { L03: grovePlacements, L04: voidPlacements, L05: frostspirePlacements, L06: skylinePlacements, L07: underworksPlacements, L08: officePlacements, L09: moonlitPlacements, L10: calderaPlacements };
const groveLevelMaterial = (name, cache) => groveMaterial(name, cache, levelMaterial);

function aabbBox(s) {
  return {
    kind: 'box',
    mat: 'neon',
    at: [(s.min[0] + s.max[0]) / 2, (s.min[1] + s.max[1]) / 2, (s.min[2] + s.max[2]) / 2],
    size: [s.max[0] - s.min[0], s.max[1] - s.min[1], s.max[2] - s.min[2]],
  };
}

/** World box of a level primitive: `{ min, max }` as Vector3. */
function primBounds(g) {
  if (g.kind === 'cylinder' || g.kind === 'cone') {
    return { min: new THREE.Vector3(g.at[0] - g.r, g.at[1], g.at[2] - g.r), max: new THREE.Vector3(g.at[0] + g.r, g.at[1] + g.h, g.at[2] + g.r) };
  }
  const h = new THREE.Vector3(g.size[0] / 2, g.size[1] / 2, g.size[2] / 2);
  const c = new THREE.Vector3(g.at[0], g.at[1], g.at[2]);
  return { min: c.clone().sub(h), max: c.clone().add(h) };
}

/** A kit model stretched to fill a box, or null while the model is still loading. */
function fitKit(model, yaw, min, max, keepHeight, surfaceFor) {
  const kit = kitGeometry(KIT.prop(model));
  if (!kit) return null;
  const target = max.clone().sub(min);
  // No yaw given: lay the model's long side along the box's long side.
  if (yaw == null) yaw = (kit.size.x > kit.size.z * 1.05) !== (target.x > target.z * 1.05) && Math.abs(target.x - target.z) > 0.05 ? 90 : 0;
  const quarter = Math.round(yaw / 90) % 2 !== 0;
  const scale = new THREE.Vector3(
    (quarter ? target.z : target.x) / kit.size.x,
    target.y / kit.size.y,
    (quarter ? target.x : target.z) / kit.size.z,
  );
  if (keepHeight) {
    // Fill the footprint and stand on the box's base at the model's own proportions (a well keeps its roof).
    scale.y = Math.min(scale.x, scale.z);
    max = max.clone();
    max.y = min.y + kit.size.y * scale.y;
  }
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (yaw || 0) * Math.PI / 180);
  const mesh = createKitObject(kit, surfaceFor(kitMaterial(), model), Math.abs(min.x * .19 + min.z * .17));
  mesh.matrixAutoUpdate = false;
  mesh.matrix.compose(min.clone().add(max).multiplyScalar(0.5), q, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-kit.center.x, -kit.center.y, -kit.center.z));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.kit = true;
  return mesh;
}

/** A Sproto Duel prop stretched to fill a box, or null while it is still loading. */
function fitDuel(name, yaw, min, max) {
  const inst = duelInstance(name);
  if (!inst) return null;
  const box = new THREE.Box3().setFromObject(inst);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const target = max.clone().sub(min);
  // No yaw given: lay the prop's long side along the box's long side, so it is stretched as little as possible.
  if (yaw == null) yaw = (size.x > size.z) !== (target.x > target.z) ? 90 : 0;
  const quarter = Math.round(yaw / 90) % 2 !== 0;
  const scale = new THREE.Vector3(
    (quarter ? target.z : target.x) / size.x,
    target.y / size.y,
    (quarter ? target.x : target.z) / size.z,
  );
  const holder = new THREE.Group();
  inst.position.sub(center);
  holder.add(inst);
  holder.scale.copy(scale);
  holder.rotation.y = (yaw || 0) * Math.PI / 180;
  holder.position.copy(min).add(max).multiplyScalar(0.5);
  holder.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  holder.userData.kit = true;
  holder.userData.release = inst.userData.releaseAsset;
  return holder;
}

/** Sproto Duel props placed as scenery: `{ duel, at, yaw, height }`. Those still loading are left out. */
function duelDecor(list, origin) {
  const out = [];
  for (const d of list || []) {
    if (!d.duel) continue;
    const inst = duelInstance(d.duel);
    if (!inst) continue;
    const box = new THREE.Box3().setFromObject(inst);
    const k = d.height ? d.height / Math.max(0.01, box.max.y - box.min.y) : 1;
    inst.scale.setScalar(k);
    inst.rotation.y = (d.yaw || 0) * Math.PI / 180;
    inst.position.set(d.at[0] + origin[0], d.at[1] + (origin[1] || 0), d.at[2] + origin[2]);
    inst.userData.kit = true;
    inst.userData.release = inst.userData.releaseAsset;
    out.push(inst);
  }
  return out;
}

/** World box of everything a section is built from, leaving out its ground slabs. */
function sectionBounds(sec) {
  const box = new THREE.Box3();
  for (const g of sec.geometry || []) {
    if (!g.at || g.kind === 'disc' || /ground|span|floor/.test(g.id || '')) continue;
    if (g.kind === 'terrain' || !(g.size || g.r)) continue;
    const b = primBounds(g.kind === 'sphere' ? { ...g, kind: 'box', size: [g.r * 2, g.r * 2, g.r * 2] } : g);
    // One odd primitive must not poison the whole box with NaN.
    if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) continue;
    box.expandByPoint(b.min).expandByPoint(b.max);
  }
  return box;
}

/**
 * Far scenery in a loop round a section: `{ ring: [models], distance, every }`. Positions are fixed by
 * the section's own bounds, so a level without a hand-placed backdrop still has a horizon.
 */
function backdropDecor(spec, sec) {
  const box = sectionBounds(sec);
  if (box.isEmpty() || !spec) return [];
  const d = spec.distance || 60;
  const x0 = box.min.x - d, x1 = box.max.x + d, z0 = box.min.z - d, z1 = box.max.z + d;
  const w = x1 - x0, h = z1 - z0;
  const out = [];
  const n = Math.max(8, Math.round((2 * (w + h)) / (spec.every || 55)));
  for (let i = 0; i < n; i++) {
    let t = (i / n) * 2 * (w + h);
    let x, z;
    if (t < w) { x = x0 + t; z = z0; } else if ((t -= w) < h) { x = x1; z = z0 + t; } else if ((t -= h) < w) { x = x1 - t; z = z1; } else { x = x0; z = z1 - (t - w); }
    const push = ((i * 37) % 5) * 9; // stagger depth so it is not one wall
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const len = Math.hypot(x - cx, z - cz) || 1;
    const name = spec.ring[i % spec.ring.length];
    const at = [x + ((x - cx) / len) * push, spec.y ?? -1.5, z + ((z - cz) / len) * push];
    const grow = 1 + ((i * 13) % 4) * 0.22;
    // `duel: true` rings are Sproto Duel props, sized by height. Kit rings are instanced and sized by scale.
    out.push(spec.duel ? { duel: name, at, yaw: (i * 67) % 360, height: (spec.height || 16) * grow } : { model: name, at, yaw: (i * 67) % 360, scale: grow });
  }
  return out;
}

export function createLevelView() {
  const group = new THREE.Group();
  group.name = 'campaign-level';
  const surfaces = createCampaignSurfaceMaterials();
  const fixtures = createCampaignFixtureLights();
  const mats = new Map();
  const frostMats = new Map();
  const underworksMats = new Map();
  const officeMats = new Map();
  const moonlitMats = new Map();
  const calderaMats = new Map();
  const frostMaterial = (name) => levelMaterial(name, frostMats, FROST_COLORS[name]);
  const underworksMaterial = (name) => levelMaterial(name, underworksMats,
    name === 'rock' ? 0x786577 : name === 'stone' ? 0x69566e : null);
  const officeMaterial = (name) => levelMaterial(name, officeMats,
    name === 'metal' ? 0xb9b1a2 : name === 'stone' ? 0x67778c : null);
  const moonlitMaterial = (name) => levelMaterial(name, moonlitMats,
    name === 'rock' ? 0x8996af : name === 'stone' ? 0x7781a2 : null);
  const calderaMaterial = (name) => levelMaterial(name, calderaMats,
    name === 'rock' ? 0x766274 : name === 'stone' ? 0x66566d : null);
  let key = '';
  let gotViews = [];
  function syncGot(state) {
    const got = state.level?.got || {};
    const hasJetpack = state.players?.[state.localPlayerId]?.jetpack;
    for (const v of gotViews) v.mesh.visible = !got[v.id] && !(v.skipIfOwned && hasJetpack);
  }
  function rebuild(state) {
    const lv = state.level;
    const doors = (lv && lv.closedDoors) || [];
    const frost = lv?.id === 'L05';
    const broken = frost ? lv.brokenSolids : null;
    // kitVersion: a section drawn before its models arrived redraws when they do.
    const next = lv ? `${lv.id}:${lv.section}:${doors.map((d) => d.id).join(',')}:${kitVersion()}:${broken ? Object.keys(broken).join(',') : ''}` : '';
    if (next === key) { syncGot(state); return; }
    key = next;
    gotViews = [];
    for (let i = group.children.length - 1; i >= 0; i--) {
      const c = group.children[i];
      // Kit geometry is shared and cached. Only the per-section merges are ours to free.
      if (c.userData.kit) { if (c.isInstancedMesh) c.dispose(); if (c.userData.release) c.userData.release(); } else if (c.geometry) c.geometry.dispose();
      group.remove(c);
    }
    if (!lv) { fixtures.rebuild(group); return; }
    const rt = getLevelRuntime(lv.id);
    const sec = rt.sectionById[lv.section];
    if (!sec) return;
    const field = solidTerrain(sec);
    const grove = lv.id === 'L03';
    const surfaceKit = (base, model) => surfaces.kit(base, lv.id, model);
    const moonlit = lv.id === 'L09';
    const caldera = lv.id === 'L10';
    const levelBase = grove ? groveLevelMaterial : frost ? frostMaterial
      : lv.id === 'L07' ? underworksMaterial : lv.id === 'L08' ? officeMaterial : moonlit ? moonlitMaterial : caldera ? calderaMaterial : levelMaterial;
    const surfacePrimitive = (base, g) => surfaces.primitive(base, lv.id, g);
    const voidLevel = lv.id === 'L04';
    const office = lv.id === 'L08';
    const polished = frost || ['L01', 'L02', 'L03'].includes(lv.id);
    const placements = CAMPAIGN_KITS[lv.id];
    const dress = placements ? {} : DRESSING[lv.id] || STAGE_DRESSING[lv.stage] || {};
    const visible = (sec.geometry || []).filter((g) => !broken?.[g.id]);
    const prims = new Map(visible.map((g) => [g.id, g]));
    const replaced = new Set();
    if (lv.id === 'L01') {
      for (const mesh of decorMeshes(landingPlacements(sec, prims), [0, 0, 0], replaced, surfaceKit)) group.add(mesh);
    }
    if (lv.id === 'L02') {
      for (const mesh of decorMeshes(bazaarPlacements(sec, prims), [0, 0, 0], replaced, surfaceKit)) group.add(mesh);
    }
    if (lv.id === 'L01') {
      for (const mesh of decorMeshes(landingPlacements(sec, prims), [0, 0, 0], replaced, surfaceKit)) group.add(mesh);
    }
    if (placements) for (const mesh of decorMeshes(placements(sec, prims, doors), [0, 0, 0], replaced, surfaceKit)) group.add(mesh);
    for (const [id, d] of Object.entries(dress.fit || {})) {
      const g = prims.get(id);
      if (!g) continue;
      const b = primBounds(g);
      const mesh = d.duel ? fitDuel(d.duel, d.yaw, b.min, b.max) : fitKit(d.model, d.yaw, b.min, b.max, false, surfaceKit);
      if (mesh) { group.add(mesh); replaced.add(id); }
    }
    // Rules dress a whole level by what a primitive is, not one id at a time. First match wins.
    for (const g of sec.geometry || []) {
      if (!g.at || !g.id || replaced.has(g.id) || g.kind === 'disc' || g.kind === 'sphere' || g.kind === 'ramp') continue;
      const rule = (dress.rules || []).find((r) => (!r.match || r.match.test(g.id)) && (!r.when || r.when(g)));
      if (!rule) continue;
      const b = primBounds(g);
      const mesh = rule.duel ? fitDuel(rule.duel, rule.yaw, b.min, b.max) : fitKit(rule.model, rule.yaw, b.min, b.max, rule.keepHeight, surfaceKit);
      if (mesh) { group.add(mesh); replaced.add(g.id); }
    }
    const far = backdropDecor(dress.backdrop, sec);
    for (const mesh of decorMeshes(far, [0, 0, 0])) group.add(mesh);
    for (const obj of duelDecor(far, [0, 0, 0])) group.add(obj);
    for (const d of dress.groups || []) {
      const gs = d.ids.map((id) => prims.get(id));
      if (!gs.every(Boolean)) continue;
      const box = new THREE.Box3();
      for (const g of gs) { const b = primBounds(g); box.expandByPoint(b.min).expandByPoint(b.max); }
      const mesh = fitKit(d.model, d.yaw, box.min, box.max, false, surfaceKit);
      if (mesh) { group.add(mesh); for (const id of d.ids) replaced.add(id); }
    }
    for (const mesh of decorMeshes(dress.decor && dress.decor[sec.id], sec.origin || [0, 0, 0], null, surfaceKit)) group.add(mesh);
    for (const obj of duelDecor(dress.decor && dress.decor[sec.id], sec.origin || [0, 0, 0])) group.add(obj);
    if (dress.ground != null && sec.navBounds) {
      // City floor under and around the route. Just below the walkable slab so the two never fight.
      const nb = sec.navBounds;
      const w = nb.max[0] - nb.min[0] + 500;
      const overpass = lv.id === 'L01' && sec.id === 'S5';
      const base = levelMaterial(`ground:${dress.ground}`, mats, dress.ground);
      const material = surfaces.primitive(base, lv.id, { kind: 'terrain', mat: 'concrete' });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, 420).rotateX(-Math.PI / 2), material);
      plane.position.set((nb.min[0] + nb.max[0]) / 2, (sec.origin ? sec.origin[1] || 0 : 0) - (overpass ? 13.03 : .55), (nb.min[1] + nb.max[1]) / 2);
      plane.receiveShadow = true;
      group.add(plane);
    }
    const hidden = (g) => !!(dress.hide && g.id && dress.hide.test(g.id));
    const geometry = visible.filter((g) => !(field && g.tag === 'terrainStandIn') && !replaced.has(g.id) && !hidden(g));
    for (const door of doors) if (!replaced.has(door.id)) geometry.push(aabbBox(door));
    for (const mesh of buildSectionMeshes(grove ? geometry.map(groveGeometry) : geometry, mats, levelBase, surfacePrimitive)) group.add(mesh);
    if (lv.id === 'L02') {
      const sandstone = () => levelMaterial('bazaar-paving', mats, 0xbb976f);
      for (const mesh of buildSectionMeshes(bazaarPaving(sec), mats, sandstone, surfacePrimitive)) group.add(mesh);
    }
    if (field) group.add(terrainMesh(field, mats, levelBase, surfacePrimitive));
    // The L03 Crop Fields use the flat walkable slab. Its Blender crop rows
    // and path stones sit on that surface.
    for (const g of sec.geometry || []) if (g.kind === 'terrain' && (!grove || g.id !== 'S1-T')) group.add(terrainMesh(g, mats, levelBase, surfacePrimitive));
    for (const m of sec.mechanisms || []) {
      if (grove && m.kind === 'manaBloom' && replaced.has(m.id.replace(/-use$/, '-flower'))) continue;
      if (replaced.has(`marker:${m.id}`)) continue;
      const special = caldera && m.kind === 'fuel' ? 'caldera_fuel'
        : caldera && m.kind === 'jumpPad' ? 'caldera_vent'
        : (voidLevel || moonlit) && m.kind === 'jetpack' ? 'void_jetpack'
        : polished && m.kind === 'shrine' ? 'campaign_shrine'
          : office && m.kind === 'laser' ? 'office_laser'
            : moonlit && m.kind === 'portal' ? 'moonlit_portal_light' : null;
      // These legacy markers have scenic wall-side cabins and clear routes.
      if (office && (m.kind === 'door' || m.kind === 'mover')) continue;
      addMarker(m, special);
    }
    for (const w of sec.weapons || []) addMarker({ ...w, kind: 'rack' });
    fixtures.rebuild(group, lv.id);
    syncGot(state);
  }
  /** The mechanism's model, centred on its point. Null while loading or when it has none. */
  function kitMarker(m, at, special) {
    const jetpack = special === 'void_jetpack';
    const pick = special ?? MECHANISM_MODEL[m.kind]?.(m);
    const kit = m.kind === 'ammo' ? kitGeometry(KIT.pickup('ammo_box')) : pick ? kitGeometry(KIT.prop(pick)) : null;
    if (!kit) return null;
    const material = jetpack ? voidMaterial() : kitMaterial();
    const mesh = createKitObject(kit, material, Math.abs(at[0] * .19 + at[2] * .17));
    if (jetpack) mesh.name = `void_jetpack:${m.id}`;
    const k = m.kind === 'ammo' ? 0.42 : 1;
    mesh.scale.setScalar(k);
    if (special === 'moonlit_portal_light') {
      // Its keyed mesh starts above the floor and shares the portal frame's transform.
      mesh.position.set(at[0], 0, at[2]);
      mesh.rotation.y = -Math.PI / 2;
    } else if (special === 'caldera_vent' || special === 'caldera_fuel') mesh.position.set(at[0], -kit.minY, at[2]);
    else if (special === 'office_laser') mesh.position.set(at[0], at[1] - 1.2 - kit.minY, at[2]);
    else mesh.position.set(at[0] - kit.center.x * k, (at[1] || 0.6) - (jetpack ? kit.minY : kit.center.y) * k, at[2] - kit.center.z * k);
    mesh.castShadow = true;
    mesh.userData.kit = true;
    return mesh;
  }
  function addMarker(m, special = null) {
    const jetpack = special === 'void_jetpack';
    const at = m.at || m.from;
    if (!at) return;
    const laser = special === 'office_laser';
    const portal = special === 'moonlit_portal_light';
    const vent = special === 'caldera_vent';
    const fuel = special === 'caldera_fuel';
    const model = kitMarker(m, at, special);
    if (model) {
      group.add(model);
      if (jetpack || laser || portal || fuel || (HIDE_WHEN_GOT.has(m.kind) && m.id)) {
        gotViews.push({ id: m.id, mesh: model, skipIfOwned: jetpack && m.skipIfOwned });
      }
      return;
    }
    const color = m.kind === 'secret' ? 0xffd166 : m.kind === 'rack' ? 0x7fd34e : m.kind === 'hazard' ? 0xff5a1a : laser ? 0xff5061 : portal ? 0xc09bff : vent || fuel ? 0x80ffe8 : LEVEL_COLOR.trim;
    const geometry = laser ? new THREE.RingGeometry(1.15, 1.28, 24).rotateX(-Math.PI / 2)
      : vent ? new THREE.RingGeometry(m.r * .72, m.r, 32).rotateX(-Math.PI / 2)
        : new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 }));
    mesh.position.set(at[0], laser || vent ? .024 : at[1] || .6, at[2]);
    if (jetpack || laser || portal || fuel) gotViews.push({ id: m.id, mesh, skipIfOwned: m.skipIfOwned });
    group.add(mesh);
  }
  return {
    group,
    sync(state) {
      rebuild(state);
      const seconds = state.tick * DT;
      surfaces.update(seconds);
      if (state.level?.id === 'L07' || state.level?.id === 'L10') updateUnderworksMagma(seconds);
      fixtures.sync(state.players?.[state.localPlayerId]?.pos, seconds);
      const drilling = state.level?.v2?.enc?.['S5-F2']?.hold || 0;
      for (const child of group.children) {
        updateKitMotion(child, child.name === 'frost_drill' ? drilling : seconds);
        if (child.name === 'frost_searchlight') syncFrostSearchlight(child, state.level);
      }
    },
  };
}
