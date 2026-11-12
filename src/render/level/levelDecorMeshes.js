import * as THREE from 'three';
import { voidMaterial } from './voidMaterial.js';
import { grovePaneMaterial } from './groveMaterials.js';
import { mountFrostSearchlight } from './frostspireLights.js';
import { createKitObject } from './kitMotion.js';
import { KIT, kitGeometry, kitMaterial } from './kitModels.js';

/** Batch static scenery by model and give each authored loop its own mixer. */
export function decorMeshes(list, origin, replaced = null) {
  const byModel = new Map();
  for (const d of list || []) {
    if (!d.model) continue;
    if (!byModel.has(d.model)) byModel.set(d.model, []);
    byModel.get(d.model).push(d);
  }
  const out = [];
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3();
  for (const [model, items] of byModel) {
    const kit = kitGeometry(KIT.prop(model));
    if (!kit) continue;
    const material = model.startsWith('void_') && !kit.hasAuthoredGlow ? voidMaterial()
      : model === 'grove_greenhouse_glass' ? grovePaneMaterial : kitMaterial();
    const batch = kit.motion ? null : new THREE.InstancedMesh(kit.geometry, material, items.length);
    items.forEach((d, i) => {
      q.setFromAxisAngle(up, (d.yaw || 0) * Math.PI / 180);
      if (Array.isArray(d.scale)) scale.fromArray(d.scale);
      else scale.setScalar(d.scale || 1);
      position.set(d.at[0] + origin[0], d.at[1] + (origin[1] || 0) - kit.minY * scale.y, d.at[2] + origin[2]);
      matrix.compose(position, q, scale);
      if (batch) batch.setMatrixAt(i, matrix);
      else {
        const object = createKitObject(kit, material, Math.abs(position.x * .21 + position.z * .17));
        object.matrix.copy(matrix);
        object.matrixAutoUpdate = false;
        object.userData.kit = true;
        if (d.searchlight) mountFrostSearchlight(object, d.searchlight, d.ground);
        out.push(object);
      }
      if (replaced && d.replace) for (const id of d.replace) replaced.add(id);
    });
    if (batch) {
      batch.name = model;
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      batch.receiveShadow = true;
      batch.userData.kit = true;
      out.push(batch);
    }
  }
  return out;
}
