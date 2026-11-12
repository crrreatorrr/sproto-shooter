import * as THREE from 'three';
import { aim, frame, handFrame, rotateWorld, specBasis } from '../viewmodel/handFrame.js';

function stockSockets(model, { upper, lower, hand, middle, thumb }) {
  const modelQ = model.getWorldQuaternion(new THREE.Quaternion());
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(modelQ);
  const shoulder = upper.getWorldPosition(new THREE.Vector3());
  const elbow = lower.getWorldPosition(new THREE.Vector3());
  const wrist = hand.getWorldPosition(new THREE.Vector3());
  const upperLength = shoulder.distanceTo(elbow), lowerLength = elbow.distanceTo(wrist);
  const elbowTarget = new THREE.Vector3(-0.23, -0.96, -0.12).normalize()
    .applyQuaternion(modelQ).multiplyScalar(upperLength).add(shoulder);
  aim(upper, elbow, elbowTarget);
  const wristTarget = new THREE.Vector3(0.29, 0.25, 0.92).normalize()
    .applyQuaternion(modelQ).multiplyScalar(lowerLength).add(elbowTarget);
  aim(lower, hand.getWorldPosition(wrist), wristTarget);

  if (middle && thumb) {
    const actual = handFrame(hand, middle, thumb, frame());
    const desired = specBasis({ fingers: [0, -0.43, 1], thumb: [-0.25, 1, 0.14] }, frame());
    const basis = new THREE.Matrix4();
    const inverse = new THREE.Quaternion().setFromRotationMatrix(basis.makeBasis(actual.f, actual.t, actual.n)).invert();
    const wanted = new THREE.Quaternion().setFromRotationMatrix(basis.makeBasis(desired.f, desired.t, desired.n));
    rotateWorld(hand, wanted.premultiply(modelQ).multiply(inverse));
  }

  const grip = new THREE.Object3D(), tip = new THREE.Object3D();
  const center = hand.getWorldPosition(wrist).addScaledVector(forward, 0.036);
  if (middle) center.lerp(middle.getWorldPosition(new THREE.Vector3()), 0.48);
  hand.add(grip);
  grip.position.copy(hand.worldToLocal(center.clone()));
  grip.add(tip);
  tip.position.copy(grip.worldToLocal(center.addScaledVector(forward, 0.10)));
  return { grip, tip };
}

/** Lower the right arm before sampling its gun sockets so the weapon follows the hand. */
export function createArenaWeaponPose(model, body) {
  const joints = {};
  model.traverse((bone) => {
    if (!bone.isBone) return;
    const name = bone.name.replace(/^mixamorig:?/, '');
    if (name === 'RightArm') joints.upper = bone;
    if (name === 'RightForeArm') joints.lower = bone;
    if (name === 'RightHand') joints.hand = bone;
    if (name === 'RightHandMiddle1') joints.middle = bone;
    if (name === 'RightHandThumb1') joints.thumb = bone;
  });
  const { upper, lower, hand } = joints;
  if (!upper || !lower || !hand) return null;

  const grip = model.getObjectByName('weapon_grip'), tip = model.getObjectByName('weapon_aim');
  const sockets = grip && tip ? { grip, tip } : stockSockets(model, joints);
  const right = new THREE.Vector3(), bodyQ = new THREE.Quaternion(), turn = new THREE.Quaternion();
  const upperBase = new THREE.Quaternion(), handBase = new THREE.Quaternion();
  let lowered = false;
  return {
    ...sockets,
    restore() {
      if (!lowered) return;
      upper.quaternion.copy(upperBase);
      hand.quaternion.copy(handBase);
      lowered = false;
    },
    apply(weight) {
      if (weight < 0.002) return;
      upperBase.copy(upper.quaternion);
      handBase.copy(hand.quaternion);
      right.set(1, 0, 0).applyQuaternion(body.getWorldQuaternion(bodyQ));
      rotateWorld(upper, turn.setFromAxisAngle(right, weight * 0.43));
      rotateWorld(hand, turn.setFromAxisAngle(right, weight * 0.47));
      lowered = true;
    },
  };
}
