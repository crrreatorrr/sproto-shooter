import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TUNING } from '../../data/tuning.js';
import { enqueue, peekAsset, releaseAsset, retainAsset } from '../assets.js';
import { createGrappleArmPose } from '../viewmodel/grappleArm.js';

export const GRAPPLER_MODEL = 'models/gear/grappler.glb';
const JAWS = 'Grappler jaws';
const CYAN = 0x69d5e2;
const FORWARD = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const ARM_WINDUP = 0.085;
const ARM_HOLD = 0.10;
const ARM_RECOVERY = 0.19;
const BITE_TIME = 0.105;
const RETURN_TIME = 0.19;
const VM_HALF_FOV_TAN = Math.tan(TUNING.fovBase * Math.PI / 360);

/** The simulation supplies the anchor. Only the model, tether and impact follow this timeline. */
export function createGrappler(scene, mount, { camera = null, layer = 0 } = {}) {
  const armPose = createGrappleArmPose(mount, !!camera);
  const root = new THREE.Group();
  root.name = 'Grapple effects';
  root.visible = false;
  scene.add(root);
  const tether = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 1, 6),
    new THREE.MeshBasicMaterial({ color: CYAN }),
  );
  tether.name = 'Grapple tether';
  const impact = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 12),
    new THREE.MeshBasicMaterial({ color: CYAN, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
  );
  impact.name = 'Grapple latch flash';
  root.add(tether, impact);

  const elbow = new THREE.Vector3(), wrist = new THREE.Vector3();
  const side = new THREE.Vector3(), up = new THREE.Vector3(), forward = new THREE.Vector3();
  const from = new THREE.Vector3(), anchor = new THREE.Vector3(), hit = new THREE.Vector3();
  const launchFrom = new THREE.Vector3(), travel = new THREE.Vector3(), cable = new THREE.Vector3();
  const returnFrom = new THREE.Vector3();
  const mountQ = new THREE.Quaternion(), flightQ = new THREE.Quaternion(), dockQ = new THREE.Quaternion();
  const returnQ = new THREE.Quaternion(), basis = new THREE.Matrix4();
  const outward = camera ? new THREE.Vector3(-1, 0.68, 0) : new THREE.Vector3(1, 0.68, 0);
  const fallback = camera ? new THREE.Vector3(-0.36, -0.34, -0.62) : new THREE.Vector3(0.32, 1.03, 0.3);

  let launcher, socket, stowed, head, mixer, jaws;
  let casting = false, elapsed = 0, flightTime = 0, fired = false, returning = false;
  let armWeight = 0;
  let dockScale = 1, returnScale = 1, jawAtReturn = 0, jawPhase = 0;

  void enqueue(GRAPPLER_MODEL, () => new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/${GRAPPLER_MODEL}`)).catch(() => {});

  function loadModel() {
    const asset = peekAsset(GRAPPLER_MODEL);
    const launcherModel = asset?.scene.getObjectByName('Launcher');
    const clawModel = asset?.scene.getObjectByName('Claw');
    const clip = asset && THREE.AnimationClip.findByName(asset.animations, JAWS);
    if (!launcherModel?.getObjectByName('Dock') || !clawModel || !clip) return false;
    launcher = launcherModel.clone();
    socket = launcher.getObjectByName('Dock');
    head = clawModel.clone();
    stowed = head.clone();
    socket.add(stowed);
    launcher.traverse((obj) => obj.layers.set(layer));
    mount.add(launcher);
    root.add(head);
    mixer = new THREE.AnimationMixer(head);
    jaws = mixer.clipAction(clip).play();
    jaws.paused = true;
    retainAsset(GRAPPLER_MODEL);
    return true;
  }

  function poseMount(arm) {
    mount.getWorldQuaternion(mountQ);
    if (!arm) {
      launcher.visible = false;
      mount.localToWorld(from.copy(fallback));
      dockQ.copy(mountQ);
      dockScale = 1;
      return;
    }
    launcher.visible = true;
    arm.lower.getWorldPosition(elbow);
    arm.hand.getWorldPosition(wrist);
    forward.subVectors(wrist, elbow);
    dockScale = THREE.MathUtils.clamp(forward.length() / 0.28, 0.72, 1.1);
    forward.normalize();
    up.copy(outward).applyQuaternion(mountQ);
    side.crossVectors(up, forward);
    if (side.lengthSq() < 0.01) side.crossVectors(UP, forward);
    side.normalize();
    up.crossVectors(forward, side);
    dockQ.setFromRotationMatrix(basis.makeBasis(side, up, forward));
    launcher.position.copy(elbow).lerp(wrist, 0.48);
    mount.worldToLocal(launcher.position);
    launcher.quaternion.copy(mountQ.invert()).multiply(dockQ);
    launcher.scale.setScalar(dockScale);
    socket.getWorldPosition(from);
  }

  function poseJaws(phase) {
    jawPhase = phase;
    jaws.time = jaws.getClip().duration * phase;
    mixer.update(0);
  }

  function begin(hook) {
    casting = true;
    anchor.copy(hook);
    elapsed = 0;
    returning = fired = false;
  }

  function aimFlight() {
    travel.subVectors(anchor, launchFrom).normalize();
    flightQ.setFromUnitVectors(FORWARD, travel);
    // Keep the hub clear of the surface so the jaws can close over the contact point.
    hit.copy(anchor).addScaledVector(travel, -0.146);
  }

  function launch() {
    launchFrom.copy(from);
    flightTime = THREE.MathUtils.clamp(anchor.distanceTo(launchFrom) / 92, 0.078, 0.31);
    aimFlight();
    elapsed = 0;
    fired = true;
  }

  function alignDockToWorldPass() {
    if (!camera) return;
    // The sleeve uses the viewmodel FOV. Match its dock on screen in the world pass, including while aiming.
    const ratio = Math.tan(camera.fov * Math.PI / 360) / VM_HALF_FOV_TAN;
    camera.worldToLocal(from);
    from.x *= ratio;
    from.y *= ratio;
    camera.localToWorld(from);
  }

  function poseTether(end) {
    cable.subVectors(end, from);
    const length = cable.length();
    tether.visible = length > 0.012;
    if (!tether.visible) return;
    tether.position.copy(from).addScaledVector(cable, 0.5);
    tether.quaternion.setFromUnitVectors(UP, cable.multiplyScalar(1 / length));
    tether.scale.y = length;
  }

  function update(hook, dt, arm, { active = true, reset = false } = {}) {
    if (reset || !active) {
      casting = false;
      armWeight = 0;
    }
    if (!active) {
      if (launcher) launcher.visible = false;
      root.visible = false;
      return;
    }
    const usedFallback = !launcher && root.visible;
    if (!launcher && !loadModel()) {
      root.visible = !!hook;
      impact.visible = false;
      if (hook) {
        mount.localToWorld(from.copy(fallback));
        alignDockToWorldPass();
        poseTether(anchor.copy(hook));
      }
      return;
    }
    if (hook && (!casting || returning)) begin(hook);
    else elapsed += dt;
    // Prediction can refine the contact point mid-flight. Keep the launch clock running.
    if (hook && (hook.x !== anchor.x || hook.y !== anchor.y || hook.z !== anchor.z)) {
      anchor.copy(hook);
      if (fired) aimFlight();
    }
    if (!hook && !fired) casting = false;
    if (casting && !hook && !returning) {
      returning = true;
      elapsed = 0;
      returnFrom.copy(head.position);
      returnQ.copy(head.quaternion);
      returnScale = head.scale.x;
      jawAtReturn = jawPhase;
    }
    if (returning && elapsed >= RETURN_TIME) casting = false;
    if (hook && !usedFallback) {
      armWeight = fired
        ? 1 - THREE.MathUtils.smoothstep(elapsed, ARM_HOLD, ARM_HOLD + ARM_RECOVERY)
        : THREE.MathUtils.smoothstep(elapsed, 0, ARM_WINDUP);
    } else armWeight = THREE.MathUtils.damp(armWeight, 0, 22, dt);
    if (arm && armWeight > 0.002) armPose.apply(arm, anchor, armWeight);
    poseMount(arm);
    alignDockToWorldPass();

    const waiting = !fired && elapsed < ARM_WINDUP && !usedFallback;
    root.visible = casting && !waiting;
    stowed.visible = !root.visible;
    if (!root.visible) return;
    if (!fired) {
      launch();
      if (usedFallback) elapsed = flightTime + BITE_TIME + 0.17;
    }

    if (returning) {
      const t = THREE.MathUtils.smoothstep(elapsed, 0, RETURN_TIME);
      head.position.copy(returnFrom).lerp(from, t);
      head.quaternion.copy(returnQ).slerp(dockQ, t);
      head.scale.setScalar(THREE.MathUtils.lerp(returnScale, dockScale, t));
      poseJaws(jawAtReturn * (1 - t));
    } else {
      const flight = Math.min(1, elapsed / flightTime);
      const bite = THREE.MathUtils.clamp((elapsed - flightTime) / BITE_TIME, 0, 1);
      head.position.copy(launchFrom).lerp(hit, flight);
      head.position.y += Math.sin(flight * Math.PI) * 0.16;
      head.quaternion.copy(dockQ).slerp(flightQ, Math.min(1, flight * 5));
      head.scale.setScalar(THREE.MathUtils.lerp(dockScale, 1.38, Math.min(1, flight * 4)));
      // Blender's first 12 frames open the jaws, then its last six snap them shut.
      poseJaws((flight * 2 + bite) / 3);
    }

    poseTether(head.position);
    const flashAge = (elapsed - flightTime) / 0.17;
    impact.visible = !returning && flashAge >= 0 && flashAge < 1;
    if (impact.visible) {
      impact.position.copy(anchor).addScaledVector(travel, -0.04);
      impact.quaternion.copy(flightQ);
      impact.scale.setScalar(0.10 + flashAge * 0.30);
      impact.material.opacity = (1 - flashAge) * 0.68;
    }
  }

  function dispose() {
    armPose.restore();
    if (launcher) {
      launcher.removeFromParent();
      mixer.uncacheRoot(head);
      releaseAsset(GRAPPLER_MODEL);
    }
    root.removeFromParent();
    for (const mesh of [tether, impact]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }

  return { update, restoreArm: armPose.restore, dispose };
}
