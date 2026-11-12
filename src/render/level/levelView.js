// Campaign geometry for the current section. One merged mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getLevelRuntime } from '../../sim/level/runtime.js';
import { solidTerrain, terrainGrid } from '../../sim/campaign/terrain.js';
import { DRESSING, HIDE_WHEN_GOT, MECHANISM_MODEL, STAGE_DRESSING } from './dressing.js';
import { groveGeometry, grovePlacements } from './groveDressing.js';
import { groveMaterial, grovePaneMaterial } from './groveMaterials.js';
import { KIT, duelInstance, kitGeometry, kitMaterial, kitVersion } from './kitModels.js';

export const LEVEL_COLOR = {
  stone: 0x6e675f, sand: 0xc6a56e, dirt: 0x6d4b2c, hedge: 0x3f7a34, metal: 0x5c6772,
  ice: 0xd5e4ef, rock: 0x4e3c34, crate: 0x8d5e34, pillar: 0x9a9188, trim: 0xff5ec4,
  concrete: 0x9a9590, wood: 0x8a5a32, glass: 0xb7e0ea, neon: 0x39ffb0, gold: 0xe6c15a,
  toxic: 0x7cff4a, grass: 0x4f8f3a, snow: 0xf4f7fb, water: 0x3a7ca5, lava: 0xff5a1f,
  candleUp: 0x3dff7a, candleDown: 0xff3b3b, forceField: 0x9fd6ff,
};

const EMISSIVE = new Set(['neon', 'toxic', 'lava', 'gold', 'candleUp', 'candleDown']);

export function levelMaterial(name, cache, tint = null) {
  if (cache.has(name)) return cache.get(name);
  const color = tint ?? (LEVEL_COLOR[name] || LEVEL_COLOR.stone);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: name === 'metal' || name === 'gold' ? 0.35 : 0.86,
    metalness: name === 'metal' || name === 'gold' ? 0.45 : 0.02,
    emissive: EMISSIVE.has(name) ? color : 0x000000,
    emissiveIntensity: EMISSIVE.has(name) ? 0.35 : 0,
    transparent: name === 'glass' || name === 'forceField',
    opacity: name === 'forceField' ? 0.28 : name === 'glass' ? 0.4 : 1,
  });
  cache.set(name, mat);
  return mat;
}

const groveLevelMaterial = (name, cache) => groveMaterial(name, cache, levelMaterial);

function primitiveGeometry(g) {
  if (!g || g.kind === 'terrain' || !g.at) return null;
  let geo = null;
  let y = g.at[1];
  if (g.kind === 'box' || g.kind === 'ramp') geo = new THREE.BoxGeometry(g.size[0], g.size[1], g.size[2]);
  else if (g.kind === 'cylinder') { geo = new THREE.CylinderGeometry(g.r, g.r, g.h, 8); y += g.h / 2; }
  else if (g.kind === 'sphere') geo = new THREE.SphereGeometry(g.r, 10, 8);
  else if (g.kind === 'cone') { geo = new THREE.ConeGeometry(g.r, g.h, 8); y += g.h / 2; }
  else if (g.kind === 'disc') geo = new THREE.CircleGeometry(g.r, 12);
  if (!geo) return null;
  const q = new THREE.Quaternion();
  if (g.kind === 'disc') q.setFromEuler(new THREE.Euler(-Math.PI / 2, (g.yaw || 0) * Math.PI / 180, 0));
  else if (g.yaw) q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), g.yaw * Math.PI / 180);
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(g.at[0], y, g.at[2]), q, new THREE.Vector3(1, 1, 1)));
  return geo;
}

/** One mesh per material. Returns the meshes, not yet parented. */
export function buildSectionMeshes(geometry, materials, materialFor = levelMaterial) {
  const buckets = new Map();
  for (const g of geometry || []) {
    const geo = primitiveGeometry(g);
    if (!geo) continue;
    const material = materialFor(g.mat || 'stone', materials);
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(geo);
  }
  const meshes = [];
  for (const [material, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (geos.length > 1) for (const geo of geos) geo.dispose();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    meshes.push(mesh);
  }
  return meshes;
}

function terrainMesh(field, materials) {
  const grid = terrainGrid(field);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
  geo.setIndex(grid.indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, levelMaterial(field.mat || 'rock', materials));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Primitive placeholder for an enemy that has no model. `look` is a list of primitives. */
export function buildLookGroup(look) {
  const group = new THREE.Group();
  const cache = new Map();
  for (const part of look || []) {
    const geo = primitiveGeometry({ ...part, at: part.at || [0, 0, 0] });
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, levelMaterial(part.mat || 'stone', cache));
    group.add(mesh);
  }
  return group;
}

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
function fitKit(model, yaw, min, max, keepHeight = false) {
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
  const mesh = new THREE.Mesh(kit.geometry, kitMaterial());
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

/** Scenery for one section, one InstancedMesh per model. Models still loading are left out. */
function decorMeshes(list, origin, replaced = null) {
  const byModel = new Map();
  for (const d of list || []) {
    if (!d.model) continue;
    if (!byModel.has(d.model)) byModel.set(d.model, []);
    byModel.get(d.model).push(d);
  }
  const out = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3();
  for (const [model, items] of byModel) {
    const kit = kitGeometry(KIT.prop(model));
    if (!kit) continue;
    const material = model === 'grove_greenhouse_glass' ? grovePaneMaterial : kitMaterial();
    const im = new THREE.InstancedMesh(kit.geometry, material, items.length);
    im.name = model;
    items.forEach((d, i) => {
      q.setFromAxisAngle(up, (d.yaw || 0) * Math.PI / 180);
      if (Array.isArray(d.scale)) scale.fromArray(d.scale);
      else scale.setScalar(d.scale || 1);
      m.compose(new THREE.Vector3(
        d.at[0] + origin[0], d.at[1] + (origin[1] || 0) - kit.minY * scale.y, d.at[2] + origin[2],
      ), q, scale);
      im.setMatrixAt(i, m);
      if (replaced && d.replace) for (const id of d.replace) replaced.add(id);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.receiveShadow = true;
    im.userData.kit = true;
    out.push(im);
  }
  return out;
}

export function createLevelView() {
  const group = new THREE.Group();
  group.name = 'campaign-level';
  const mats = new Map();
  let key = '';
  let gotViews = [];
  function syncGot(lv) {
    const got = (lv && lv.got) || {};
    for (const v of gotViews) v.mesh.visible = !got[v.id];
  }
  function rebuild(state) {
    const lv = state.level;
    const doors = (lv && lv.closedDoors) || [];
    // kitVersion: a section drawn before its models arrived redraws when they do.
    const next = lv ? `${lv.id}:${lv.section}:${doors.map((d) => d.id).join(',')}:${kitVersion()}` : '';
    if (next === key) { syncGot(lv); return; }
    key = next;
    gotViews = [];
    for (let i = group.children.length - 1; i >= 0; i--) {
      const c = group.children[i];
      // Kit geometry is shared and cached. Only the per-section merges are ours to free.
      if (c.userData.kit) { if (c.isInstancedMesh) c.dispose(); if (c.userData.release) c.userData.release(); } else if (c.geometry) c.geometry.dispose();
      group.remove(c);
    }
    if (!lv) return;
    const rt = getLevelRuntime(lv.id);
    const sec = rt.sectionById[lv.section];
    if (!sec) return;
    const field = solidTerrain(sec);
    // A level with no dressing of its own still gets its stage's backdrop.
    const grove = lv.id === 'L03';
    const dress = grove ? {} : DRESSING[lv.id] || STAGE_DRESSING[lv.stage] || {};
    const prims = new Map((sec.geometry || []).map((g) => [g.id, g]));
    const replaced = new Set();
    if (grove) {
      for (const mesh of decorMeshes(grovePlacements(sec, prims), [0, 0, 0], replaced)) group.add(mesh);
    }
    for (const [id, d] of Object.entries(dress.fit || {})) {
      const g = prims.get(id);
      if (!g) continue;
      const b = primBounds(g);
      const mesh = d.duel ? fitDuel(d.duel, d.yaw, b.min, b.max) : fitKit(d.model, d.yaw, b.min, b.max);
      if (mesh) { group.add(mesh); replaced.add(id); }
    }
    // Rules dress a whole level by what a primitive is, not one id at a time. First match wins.
    for (const g of sec.geometry || []) {
      if (!g.at || !g.id || replaced.has(g.id) || g.kind === 'disc' || g.kind === 'sphere' || g.kind === 'ramp') continue;
      const rule = (dress.rules || []).find((r) => (!r.match || r.match.test(g.id)) && (!r.when || r.when(g)));
      if (!rule) continue;
      const b = primBounds(g);
      const mesh = rule.duel ? fitDuel(rule.duel, rule.yaw, b.min, b.max) : fitKit(rule.model, rule.yaw, b.min, b.max, rule.keepHeight);
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
      const mesh = fitKit(d.model, d.yaw, box.min, box.max);
      if (mesh) { group.add(mesh); for (const id of d.ids) replaced.add(id); }
    }
    for (const mesh of decorMeshes(dress.decor && dress.decor[sec.id], sec.origin || [0, 0, 0])) group.add(mesh);
    for (const obj of duelDecor(dress.decor && dress.decor[sec.id], sec.origin || [0, 0, 0])) group.add(obj);
    if (dress.ground != null && sec.navBounds) {
      // City floor under and around the route. Just below the walkable slab so the two never fight.
      const nb = sec.navBounds;
      const w = nb.max[0] - nb.min[0] + 500;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, 420).rotateX(-Math.PI / 2), levelMaterial(`ground:${dress.ground}`, mats, dress.ground));
      plane.position.set((nb.min[0] + nb.max[0]) / 2, (sec.origin ? sec.origin[1] || 0 : 0) - 0.55, (nb.min[1] + nb.max[1]) / 2);
      plane.receiveShadow = true;
      group.add(plane);
    }
    const hidden = (g) => !!(dress.hide && g.id && dress.hide.test(g.id));
    const geometry = (sec.geometry || []).filter((g) => !(field && g.tag === 'terrainStandIn') && !replaced.has(g.id) && !hidden(g));
    for (const door of doors) geometry.push(aabbBox(door));
    for (const mesh of buildSectionMeshes(grove ? geometry.map(groveGeometry) : geometry, mats, grove ? groveLevelMaterial : levelMaterial)) group.add(mesh);
    if (field) group.add(terrainMesh(field, mats));
    // The L03 Crop Fields use the flat walkable slab. Its Blender crop rows
    // and path stones sit on that surface.
    for (const g of sec.geometry || []) if (g.kind === 'terrain' && (!grove || g.id !== 'S1-T')) group.add(terrainMesh(g, mats));
    for (const m of sec.mechanisms || []) {
      if (grove && m.kind === 'manaBloom' && replaced.has(m.id.replace(/-use$/, '-flower'))) continue;
      addMarker(m);
    }
    for (const w of sec.weapons || []) addMarker({ ...w, kind: 'rack' });
    syncGot(lv);
  }
  /** The mechanism's model, centred on its point. Null while loading or when it has none. */
  function kitMarker(m, at) {
    const pick = MECHANISM_MODEL[m.kind];
    const kit = m.kind === 'ammo' ? kitGeometry(KIT.pickup('ammo_box')) : pick ? kitGeometry(KIT.prop(pick(m))) : null;
    if (!kit) return null;
    const mesh = new THREE.Mesh(kit.geometry, kitMaterial());
    const k = m.kind === 'ammo' ? 0.42 : 1;
    mesh.scale.setScalar(k);
    mesh.position.set(at[0] - kit.center.x * k, (at[1] || 0.6) - kit.center.y * k, at[2] - kit.center.z * k);
    mesh.castShadow = true;
    mesh.userData.kit = true;
    return mesh;
  }
  function addMarker(m) {
    const at = m.at || m.from;
    if (!at) return;
    const model = kitMarker(m, at);
    if (model) {
      group.add(model);
      if (HIDE_WHEN_GOT.has(m.kind) && m.id) gotViews.push({ id: m.id, mesh: model });
      return;
    }
    const color = m.kind === 'secret' ? 0xffd166 : m.kind === 'rack' ? 0x7fd34e : m.kind === 'hazard' ? 0xff5a1a : LEVEL_COLOR.trim;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 }));
    mesh.position.set(at[0], at[1] || 0.6, at[2]);
    group.add(mesh);
  }
  return { group, sync: rebuild };
}
