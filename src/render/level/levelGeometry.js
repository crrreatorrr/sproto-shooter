// Build merged meshes for campaign solids and the primitive enemy stand-ins.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainGrid } from '../../sim/campaign/terrain.js';

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

const useBase = (base) => base;

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
export function buildSectionMeshes(geometry, materials, materialFor = levelMaterial, surfaceFor = useBase) {
  const buckets = new Map();
  for (const g of geometry || []) {
    const geo = primitiveGeometry(g);
    if (!geo) continue;
    const material = surfaceFor(materialFor(g.mat || 'stone', materials), g);
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

export function terrainMesh(field, materials, materialFor = levelMaterial, surfaceFor = useBase) {
  const grid = terrainGrid(field);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
  geo.setIndex(grid.indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, surfaceFor(materialFor(field.mat || 'rock', materials), field));
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
