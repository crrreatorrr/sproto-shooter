import * as THREE from 'three';
import { aim, rotateWorld } from '../viewmodel/handFrame.js';

const vector = () => new THREE.Vector3();
const quat = () => new THREE.Quaternion();

/** Build a seated, one-leg-forward slide from the avatar's own limb lengths. */
export function createSlidePose(model) {
  const bones = {};
  model.traverse((node) => {
    if (node.isBone) bones[node.name.replace(/^mixamorig:?/, '')] = node;
  });
  const { Hips: hips, Spine1: spine, Head: head } = bones;
  const legs = ['Left', 'Right'].map((side) => ['UpLeg', 'Leg', 'Foot'].map((part) => bones[side + part]));
  if (!hips || !spine || !head || legs.flat().some((bone) => !bone)) return null;

  const joints = [hips, spine, head, ...legs.flat()].map((bone) => ({
    bone, base: bone.quaternion.clone(), pose: quat(),
  }));
  const hipBase = hips.position.clone();
  const modelQ = model.getWorldQuaternion(quat());
  const right = vector().set(1, 0, 0).applyQuaternion(modelQ);
  const up = vector().set(0, 1, 0).applyQuaternion(modelQ);
  const forward = vector().set(0, 0, 1).applyQuaternion(modelQ);
  const ankle = legs.map(([, , foot]) => foot.getWorldPosition(vector()));
  const footQ = legs.map(([, , foot]) => foot.getWorldQuaternion(quat()));
  const span = legs[0][0].getWorldPosition(vector()).distanceTo(ankle[0]);

  hips.position.copy(hips.parent.worldToLocal(hips.getWorldPosition(vector())
    .addScaledVector(up, -0.55 * span).addScaledVector(forward, -0.11 * span)));
  hips.updateMatrixWorld(true);
  rotateWorld(hips, quat().setFromAxisAngle(forward, -0.10));
  rotateWorld(spine, quat().setFromAxisAngle(right, -0.33));
  rotateWorld(head, quat().setFromAxisAngle(right, 0.27));

  for (const [i, [thigh, shin, foot]] of legs.entries()) {
    const lead = i === 0;
    const start = thigh.getWorldPosition(vector());
    const knee = shin.getWorldPosition(vector());
    const end = foot.getWorldPosition(vector());
    const a = start.distanceTo(knee), b = knee.distanceTo(end);
    const target = ankle[i].clone()
      .addScaledVector(forward, span * (lead ? 0.73 : -0.19))
      .addScaledVector(right, span * (lead ? 0.03 : -0.26))
      .addScaledVector(up, span * (lead ? 0.015 : 0.10));
    const direction = target.sub(start);
    const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(a - b) + 0.001, a + b - 0.001);
    direction.normalize();
    const along = (a * a - b * b + distance * distance) / (2 * distance);
    const pole = forward.clone().addScaledVector(right, lead ? 0.24 : -0.82);
    pole.addScaledVector(direction, -pole.dot(direction)).normalize();
    knee.copy(start).addScaledVector(direction, along)
      .addScaledVector(pole, Math.sqrt(Math.max(0, a * a - along * along)));
    aim(thigh, shin.getWorldPosition(vector()), knee);
    aim(shin, foot.getWorldPosition(vector()), end.copy(start).addScaledVector(direction, distance));
    foot.quaternion.copy(foot.parent.getWorldQuaternion(quat()).invert()
      .multiply(footQ[i].premultiply(quat().setFromAxisAngle(right, lead ? -0.23 : 0.35))));
  }

  const hipPose = hips.position.clone();
  hips.position.copy(hipBase);
  for (const joint of joints) {
    joint.pose.copy(joint.bone.quaternion);
    joint.bone.quaternion.copy(joint.base);
  }
  model.updateMatrixWorld(true);

  // Save the mixer pose so the overlay never feeds back into locomotion on the next frame.
  let applied = false;
  return {
    restore() {
      if (!applied) return;
      hips.position.copy(hipBase);
      for (const { bone, base } of joints) bone.quaternion.copy(base);
      applied = false;
    },
    apply(weight) {
      if (weight <= 0.001) return;
      hipBase.copy(hips.position);
      hips.position.lerp(hipPose, weight);
      for (const { bone, base, pose } of joints) {
        base.copy(bone.quaternion);
        bone.quaternion.slerp(pose, weight);
      }
      applied = true;
    },
  };
}
