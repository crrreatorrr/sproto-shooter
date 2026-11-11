import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { instantiateGun, releaseAsset, retainAsset } from '../assets.js';
import { HAND_FRAC } from '../viewmodel/gunMesh.js';
import { GUN_IDS, LOADOUT } from '../../sim/pvp/rules.js';
import { createSlidePose } from './slidePose.js';
import { wrapAngle } from '../anim.js';

// World-space lengths in meters for the 1.8 m Arena character rigs.
const ARENA_GUN_LENGTH = { mg: 0.96, shotgun: 1.04, sniper: 1.18 };

const ARMS = /^(?:mixamorig)?(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)|^weapon_/;

export function attachModel(body, source, path) {
  const model = cloneSkeleton(source.scene);
  model.traverse((obj) => { if (obj.isSkinnedMesh) obj.frustumCulled = false; });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const height = box.getSize(new THREE.Vector3()).y || 1;
  model.scale.setScalar(1.8 / height);
  model.position.y = -box.min.y * model.scale.y;
  body.group.add(model);
  body.capsule.visible = false;
  body.model = model;
  body.path = path;
  retainAsset(path);
  body.slide = createSlidePose(model);
  body.slideWeight = 0;
  body.slideYaw = null;
  const grip = model.getObjectByName('weapon_grip');
  const aim = model.getObjectByName('weapon_aim');
  if (!grip || !aim) return;
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  // The original Pepe clips use 9 and 7 frames for a full stride; give each step time to read.
  const pace = { idle: 0.64, jog: 0.60, dash: 0.68 };
  for (const clip of source.animations) {
    const upper = ['ready', 'shoot', 'reload'].includes(clip.name);
    const tracks = clip.tracks.filter((track) => ARMS.test(track.name) === upper);
    actions[clip.name] = mixer.clipAction(new THREE.AnimationClip(clip.name, clip.duration, tracks)).play();
    actions[clip.name].timeScale = pace[clip.name] ?? 1;
    actions[clip.name].weight = Number(clip.name === 'idle' || clip.name === 'ready');
  }
  const gun = new THREE.Group();
  body.group.add(gun);
  body.motion = { mixer, actions, grip, aim, gun, held: null, heldType: null };
}

export function disposeModel(body) {
  if (!body.model) return;
  body.motion?.mixer.stopAllAction();
  body.motion?.held?.userData.releaseAsset();
  body.motion?.gun.removeFromParent();
  body.model.traverse((obj) => { if (obj.isSkinnedMesh) obj.skeleton.dispose(); });
  body.model.removeFromParent();
  releaseAsset(body.path);
  body.slide = body.motion = body.model = null;
}

const gripAt = new THREE.Vector3(), aimAt = new THREE.Vector3();
export function poseModel(body, player, shotAge, dt, yaw = null) {
  const motion = body.motion;
  const sliding = player.alive !== false && player.slideT > 0;
  const speed = Math.hypot(player.vx || 0, player.vz || 0);
  body.slide?.restore();
  body.slideWeight = THREE.MathUtils.damp(body.slideWeight ?? 0, Number(sliding), sliding ? 24 : 14, dt);
  if (yaw !== null) {
    const facing = yaw + (body.model ? Math.PI : 0);
    if (body.slide && sliding && speed > 0.35) {
      const travelYaw = Math.atan2(player.vx, player.vz);
      const from = body.slideYaw ?? facing;
      body.slideYaw = from + wrapAngle(travelYaw - from) * (1 - Math.exp(-24 * dt));
    } else if (body.slideYaw != null) {
      const turn = wrapAngle(facing - body.slideYaw);
      body.slideYaw = body.slideWeight < 0.02 ? null : body.slideYaw + turn * (1 - Math.exp(-14 * dt));
    }
    body.group.rotation.y = body.slideYaw ?? facing;
  }
  if (!motion) {
    body.slide?.apply(body.slideWeight);
    return;
  }
  const { actions, mixer, gun, grip, aim } = motion;
  const gait = sliding ? 'idle' : speed > 8 ? 'dash' : speed > 0.35 ? 'jog' : 'idle';
  for (const name of ['idle', 'jog', 'dash']) {
    const action = actions[name];
    if (action) action.weight = THREE.MathUtils.damp(action.weight, name === gait ? 1 : 0, 11, dt);
  }
  const slot = GUN_IDS[player.slot] ? player.slot : 0;
  const type = GUN_IDS[slot];
  if (motion.heldType !== type) {
    const inst = instantiateGun(type, ARENA_GUN_LENGTH[type]);
    if (inst) {
      motion.held?.userData.releaseAsset();
      gun.clear();
      inst.root.position.fromArray(HAND_FRAC[type].grip).multiply(inst.size).negate();
      gun.add(inst.root);
      motion.muzzle = inst.muzzle;
      motion.held = inst.root;
      motion.heldType = type;
    }
  }
  const shooting = shotAge >= 0 && shotAge < actions.shoot.getClip().duration * 1000;
  const reloading = player.reloadT > 0;
  // Keep sampling the existing pose during a cancel; fade it out instead of jumping to frame zero.
  const reload = actions.reload;
  const reloadTime = LOADOUT[slot].stats.reloadTime;
  if (reloading) reload.time = reload.getClip().duration * THREE.MathUtils.clamp(1 - player.reloadT / reloadTime, 0, 0.999);
  reload.weight = THREE.MathUtils.damp(reload.weight, Number(reloading), 16, dt);
  reload.paused = true;
  const shootingWeight = shooting && !reloading ? 1 - reload.weight : 0;
  actions.ready.weight = 1 - reload.weight - shootingWeight;
  actions.shoot.weight = shootingWeight;
  actions.shoot.time = shooting ? shotAge / 1000 : 0;
  actions.shoot.paused = true;
  mixer.update(dt);
  body.slide?.apply(body.slideWeight);
  body.group.updateMatrixWorld(true);
  body.group.worldToLocal(grip.getWorldPosition(gripAt));
  body.group.worldToLocal(aim.getWorldPosition(aimAt));
  gun.position.copy(gripAt);
  // The socket points +Z. Weapon meshes are authored with the barrel toward -Z.
  gun.lookAt(body.group.localToWorld(aimAt.negate().addScaledVector(gripAt, 2)));
}
