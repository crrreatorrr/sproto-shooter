import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FP as STOCK_POSE, cleanArmWeights } from './fpPose.js';
import { frame, handFrame } from './handFrame.js';
import { PLAYER_CHARACTERS } from '../playerCharacters.js';

const STOCK_MODEL = PLAYER_CHARACTERS[0].model;
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
const V = () => new THREE.Vector3();
const _a = V();
const GENERAL_MODEL = PLAYER_CHARACTERS.find(({ id }) => id === 'pepe-general').model;
const TUX_MODEL = PLAYER_CHARACTERS.find(({ id }) => id === 'pepe-tux').model;
const PEPE_POSE = {
  weaponOffset: [0, -.02, .10],
  bodyYaw: -0.58, bodyYawAds: -0.64,
  bodyHip: [-0.035, -0.10, 0.14], bodyAds: [-0.04, -0.12, 0.17],
  reachMax: 0.97, reachShift: 0.075, protractMax: 0.65,
  palmGap: 0.059, fingerRadius: 0.038, armRadius: 0.083,
  poleRight: [0.95, -0.36, 0.14], poleLeft: [-0.81, -0.72, 0.05],
};
const GENERAL_POSE = {
  ...PEPE_POSE, bodyYaw: -0.45, bodyYawAds: -0.48,
  bodyHip: [-0.025, -0.09, 0.115], bodyAds: [-0.035, -0.11, 0.16],
  weaponOffset: [.015, -.01, .14],
  height: 2.12, protractMax: 0.82, reachShift: 0.06, palmGap: 0.064,
};
export const PEPE_MG_SUPPORT = { fingers: [0.82, 0.32, -0.46], thumb: [0.05, 0.26, -1] };
const TUX_POSE = {
  ...PEPE_POSE, palmGap: 0.067, fingerRadius: 0.042,
};

export function firstPersonPose(path) {
  if (path === STOCK_MODEL) return STOCK_POSE;
  return { ...STOCK_POSE, ...(path === GENERAL_MODEL ? GENERAL_POSE : path === TUX_MODEL ? TUX_POSE : PEPE_POSE) };
}

export function disposePlayerBody(holder) {
  holder.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.dispose();
    mesh.geometry.dispose();
    for (const material of [].concat(mesh.material)) material.dispose();
  });
  holder.removeFromParent();
}

/** Independent geometry and materials allow per-character cleanup without altering the cache or arena copies. */
export function preparePlayerBody(source, camera, root, FP, protectBody) {
  const body = cloneSkeleton(source);
  const bones = {};
  const bind = new Map();
  const torso = new THREE.Box3();
  body.traverse((obj) => {
    if (obj.isBone) bones[obj.name.replace(/^mixamorig:?/, '')] = obj;
  });
  if (!['Left', 'Right'].every((side) =>
    ['Arm', 'ForeArm', 'Hand', 'HandMiddle1', 'HandThumb1'].every((joint) => bones[side + joint]))) {
    return null;
  }
  body.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.frustumCulled = false; o.renderOrder = 2;
      o.geometry = o.geometry.clone();
      // Own materials, never clipped: cutting the body open near the camera showed the inside of the model (a
      // hollow sleeve or vest you could see the ground through). The head and neck are collapsed below instead.
      const material = (m) => m.clone();
      o.material = Array.isArray(o.material) ? o.material.map(material) : material(o.material);
      cleanArmWeights(o);
    }
  });
  // fit to height
  const box = new THREE.Box3().setFromObject(body, true);
  const k = FP.height / Math.max(0.01, box.max.y - box.min.y);
  body.scale.setScalar(k);
  const holder = new THREE.Group();
  holder.add(body);
  if (protectBody) {
    // In the holder's own space the weighted torso stays rigid as the hands and clavicles move.
    // Build the clearance volume from this avatar's chest and hips in its bind pose.
    torso.makeEmpty();
    body.updateMatrixWorld(true);
    body.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const { skinIndex, skinWeight, position } = o.geometry.attributes;
      const centreJoints = o.skeleton.bones.map((bone) => /(?:Hips|Spine[12]?)$/.test(bone.name));
      for (let i = 0; i < position.count; i++) {
        let weight = 0;
        for (let j = 0; j < 4; j++) {
          if (centreJoints[skinIndex.getComponent(i, j)]) weight += skinWeight.getComponent(i, j);
        }
        if (weight >= 0.64) torso.expandByPoint(o.getVertexPosition(i, _a).applyMatrix4(o.matrixWorld));
      }
    });

  }
  holder.rotation.y = Math.PI + FP.bodyYaw; // model faces +z; turn to face the camera's -z, plus a shooting stance
  root.add(holder);
  // hide head (we are inside it) and legs
  for (const n of ['Neck', 'Head', 'LeftUpLeg', 'RightUpLeg']) if (bones[n]) bones[n].scale.setScalar(1e-4);
  // place the head bone at FP.eye relative to the camera
  root.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const head = bones.Neck || bones.Head; // the neck bone's position is kept even though its geometry is collapsed
  const hw = head.getWorldPosition(V());
  const local = camera.worldToLocal(hw.clone());
  holder.position.set(FP.eye[0] - local.x, FP.eye[1] - local.y, FP.eye[2] - local.z);

  root.updateMatrixWorld(true);
  for (const b of Object.values(bones)) bind.set(b, b.quaternion.clone());
  const side = (s) => ({
    name: s,
    clavicle: bones[`${s}Shoulder`], upper: bones[`${s}Arm`], lower: bones[`${s}ForeArm`], hand: bones[`${s}Hand`],
    middle1: bones[`${s}HandMiddle1`], thumb1: bones[`${s}HandThumb1`],
    fingers: FINGERS.map((f) => [1, 2, 3].map((i) => bones[`${s}Hand${f}${i}`]).filter(Boolean)).filter((c) => c.length),
    thumb: [1, 2, 3].map((i) => bones[`${s}HandThumb${i}`]).filter(Boolean),
    lenA: 0, lenB: 0, palmLen: 0,
    palmSign: 1, // which side of the hand frame's normal the palm is on (mirrored between hands)
    bend: 0, // smoothed elbow swing around the shoulder-wrist axis
    frame: frame(),
    probes: [],
    away: V(),
  });
  const arms = { Right: side('Right'), Left: side('Left') };
  for (const a of Object.values(arms)) {
    a.lenA = a.upper.getWorldPosition(V()).distanceTo(a.lower.getWorldPosition(V()));
    a.lenB = a.lower.getWorldPosition(V()).distanceTo(a.hand.getWorldPosition(V()));
    a.palmLen = a.hand.getWorldPosition(V()).distanceTo(a.middle1.getWorldPosition(V()));
    // fingers in the bind pose are slightly bent toward the palm: that tells which way the palm faces
    const fr = handFrame(a.hand, a.middle1, a.thumb1, a.frame);
    const tip = a.fingers[1] ? a.fingers[1][a.fingers[1].length - 1].getWorldPosition(V()) : a.middle1.getWorldPosition(V());
    a.palmSign = tip.sub(a.middle1.getWorldPosition(V())).dot(fr.n) >= 0 ? 1 : -1;
    if (protectBody) {
      holder.traverse((mesh) => {
        if (!mesh.isSkinnedMesh) return;
        const { skinIndex, skinWeight, position } = mesh.geometry.attributes;
        const digits = mesh.skeleton.bones.map((b) => b.name.includes(`${a.name}Hand`));
        const points = [];
        for (let i = 0; i < position.count; i++) {
          let weight = 0;
          for (let j = 0; j < 4; j++) if (digits[skinIndex.getComponent(i, j)]) weight += skinWeight.getComponent(i, j);
          if (weight > 0.68) points.push(i);
        }
        // Sample the actual glove/knuckle silhouette, which is wider than the bone chain.
        const step = Math.max(1, Math.floor(points.length / 200));
        for (let i = 0; i < points.length; i += step) a.probes.push([mesh, points[i]]);
      });
    }
  }
  return { holder, bones, bind, arms, torso };
}
