// Campaign geometry for the current section. One merged mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getLevelRuntime } from '../../sim/level/runtime.js';

export const LEVEL_COLOR = {
  stone: 0x6e675f, sand: 0xc6a56e, dirt: 0x6d4b2c, hedge: 0x3f7a34, metal: 0x5c6772,
  ice: 0xd5e4ef, rock: 0x4e3c34, crate: 0x8d5e34, pillar: 0x9a9188, trim: 0xff5ec4,
  concrete: 0x9a9590, wood: 0x8a5a32, glass: 0xb7e0ea, neon: 0x39ffb0, gold: 0xe6c15a,
  toxic: 0x7cff4a, grass: 0x4f8f3a, snow: 0xf4f7fb, water: 0x3a7ca5, lava: 0xff5a1f,
  candleUp: 0x3dff7a, candleDown: 0xff3b3b, forceField: 0x9fd6ff,
};

const EMISSIVE = new Set(['neon', 'toxic', 'lava', 'gold', 'candleUp', 'candleDown']);

export function levelMaterial(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const color = LEVEL_COLOR[name] || LEVEL_COLOR.stone;
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

function primitiveGeometry(g) {
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
export function buildSectionMeshes(geometry, materials) {
  const buckets = new Map();
  for (const g of geometry || []) {
    const geo = primitiveGeometry(g);
    if (!geo) continue;
    const name = g.mat || 'stone';
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name).push(geo);
  }
  const meshes = [];
  for (const [name, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (geos.length > 1) for (const geo of geos) geo.dispose();
    const mesh = new THREE.Mesh(merged, levelMaterial(name, materials));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    meshes.push(mesh);
  }
  return meshes;
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

export function createLevelView() {
  const group = new THREE.Group();
  group.name = 'campaign-level';
  const mats = new Map();
  let key = '';
  function rebuild(state) {
    const lv = state.level;
    const doors = (lv && lv.closedDoors) || [];
    const next = lv ? `${lv.id}:${lv.section}:${doors.map((d) => d.id).join(',')}` : '';
    if (next === key) return;
    key = next;
    for (let i = group.children.length - 1; i >= 0; i--) {
      const c = group.children[i];
      c.geometry && c.geometry.dispose();
      group.remove(c);
    }
    if (!lv) return;
    const rt = getLevelRuntime(lv.id);
    const sec = rt.sectionById[lv.section];
    if (!sec) return;
    const geometry = (sec.geometry || []).slice();
    for (const door of doors) geometry.push(aabbBox(door));
    for (const mesh of buildSectionMeshes(geometry, mats)) group.add(mesh);
    for (const m of sec.mechanisms || []) addMarker(m);
    for (const w of sec.weapons || []) addMarker({ ...w, kind: 'rack' });
  }
  function addMarker(m) {
    const at = m.at || m.from;
    if (!at) return;
    const color = m.kind === 'secret' ? 0xffd166 : m.kind === 'rack' ? 0x7fd34e : m.kind === 'hazard' ? 0xff5a1a : LEVEL_COLOR.trim;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 }));
    mesh.position.set(at[0], at[1] || 0.6, at[2]);
    group.add(mesh);
  }
  return { group, sync: rebuild };
}
