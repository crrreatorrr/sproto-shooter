import * as THREE from 'three';
import { aim } from './handFrame.js';

/** Sample the sleeve near the rail in the forearm bone's local space. */
export function forearmSurface(model, { lower, hand }) {
  model.updateWorldMatrix(true, false);
  // SkinnedMesh refreshes the attached bind inverse in updateMatrixWorld.
  model.updateMatrixWorld(true);
  const inverse = lower.matrixWorld.clone().invert();
  const axis = hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
  const length = axis.length();
  axis.normalize();
  const samples = [];
  const point = new THREE.Vector3();
  model.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    const joint = mesh.skeleton.bones.indexOf(lower);
    if (joint < 0) return;
    const { skinIndex, skinWeight, position } = mesh.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) {
        if (skinIndex.getComponent(i, j) === joint) weight += skinWeight.getComponent(i, j);
      }
      if (weight < 0.55) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      const along = point.dot(axis);
      if (along > length * 0.25 && along < length * 0.73) {
        samples.push(point.clone().addScaledVector(axis, -along));
      }
    }
  });
  return samples;
}

export function leftGrapplerArm(model) {
  const arm = {};
  model.traverse((joint) => {
    if (!joint.isBone) return;
    const name = joint.name.replace(/^mixamorig:?/, '');
    if (name === 'LeftArm') arm.upper = joint;
    if (name === 'LeftForeArm') arm.lower = joint;
    if (name === 'LeftHand') arm.hand = joint;
    if (name === 'LeftHandMiddle1') arm.middle1 = joint;
  });
  if (!arm.upper || !arm.lower || !arm.hand) return null;
  arm.surface = forearmSurface(model, arm);
  return arm;
}

/** Blend from the posed support hand into a nearly straight, outward reach. */
export function createGrappleArmPose(mount, firstPerson) {
  const shoulder = new THREE.Vector3(), elbow = new THREE.Vector3(), wrist = new THREE.Vector3();
  const line = new THREE.Vector3(), pole = new THREE.Vector3(), side = new THREE.Vector3();
  const elbowTarget = new THREE.Vector3(), wristTarget = new THREE.Vector3(), fingers = new THREE.Vector3();
  const mountQ = new THREE.Quaternion();
  const baseUpper = new THREE.Quaternion(), baseLower = new THREE.Quaternion(), baseHand = new THREE.Quaternion();
  let posed = null;
  return {
    restore() {
      if (!posed) return;
      posed.upper.quaternion.copy(baseUpper);
      posed.lower.quaternion.copy(baseLower);
      posed.hand.quaternion.copy(baseHand);
      posed = null;
    },
    apply(arm, target, weight) {
      const { upper, lower, hand, middle1 } = arm;
      upper.getWorldPosition(shoulder);
      lower.getWorldPosition(elbow);
      hand.getWorldPosition(wrist);
      const a = shoulder.distanceTo(elbow), b = elbow.distanceTo(wrist);
      const reach = a + b;
      if (a < 0.01 || b < 0.01) return;
      mount.getWorldQuaternion(mountQ);
      side.set(firstPerson ? -1 : 1, 0, 0).applyQuaternion(mountQ);
      // Keep the fist on the launcher side of the weapon as it extends toward the anchor.
      line.copy(target).sub(shoulder).normalize().addScaledVector(side, 0.25).normalize();
      wristTarget.copy(wrist).lerp(line.multiplyScalar(reach * 0.985).add(shoulder), weight);
      line.subVectors(wristTarget, shoulder);
      const distance = THREE.MathUtils.clamp(line.length(), Math.abs(a - b) + 0.001, reach - 0.001);
      line.normalize();
      wristTarget.copy(shoulder).addScaledVector(line, distance);
      pole.subVectors(elbow, shoulder).normalize().addScaledVector(side, weight * 0.45);
      pole.addScaledVector(line, -pole.dot(line)).normalize();
      const along = (a * a - b * b + distance * distance) / (2 * distance);
      elbowTarget.copy(shoulder).addScaledVector(line, along)
        .addScaledVector(pole, Math.sqrt(Math.max(0, a * a - along * along)));

      baseUpper.copy(upper.quaternion);
      baseLower.copy(lower.quaternion);
      baseHand.copy(hand.quaternion);
      posed = arm;
      aim(upper, elbow, elbowTarget);
      aim(lower, hand.getWorldPosition(wrist), wristTarget);
      if (middle1) {
        middle1.getWorldPosition(fingers);
        line.subVectors(wristTarget, elbowTarget).normalize();
        wristTarget.addScaledVector(line, fingers.distanceTo(wristTarget));
        aim(hand, fingers, wrist.copy(fingers).lerp(wristTarget, weight));
      }
    },
  };
}
