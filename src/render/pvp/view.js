// Free-arena view. The selected skin is local and has no effect on the shared match.
// SHOOTER-S3: the local player is drawn from the client's prediction, and its shots get a
// cosmetic muzzle flash, tracer and camera recoil at once (fx.shots). Damage is never drawn here.
import * as THREE from 'three';
import { TUNING } from '../../data/tuning.js';
import { dirFromYawPitch } from '../../core/math.js';
import { ARENA_SOLIDS, ARENA_WALL_H } from '../../sim/pvp/arena.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ensureGunModel, instantiateGun, releaseAsset, retainAsset } from '../assets.js';
import { loadPlayerModel } from '../firstPerson.js';
import { PLAYER_CHARACTERS, selectedCharacter } from '../playerCharacters.js';
import { GUN_MODEL_LEN, HAND_FRAC } from '../viewmodel/gunMesh.js';
import { GUN_IDS, LOADOUT } from '../../sim/pvp/rules.js';
import { chaseCamera } from './aim.js';

export { chaseCamera };

const SEAT_COLOR = [0xff5ec4, 0x4fd1c5];

function asset(path) {
  const base = import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
  return `${base}assets/${path}`;
}

/** Cosmetic recoil kick per slot (radians of camera pitch) and how fast it settles. */
export const RECOIL = Object.freeze({ kick: [0.012, 0.05, 0.08], tauMs: 90 });
const FLASH_MS = 60;
const TRACER_MS = 90;
const TRACER_M = 60;
const MUZZLE_AHEAD = 0.7;

/** Camera pitch kick at `now` from recent predicted shots (cosmetic; never sent). */
export function recoilAt(shots, now) {
  let kick = 0;
  for (const shot of shots || []) {
    const age = now - shot.at;
    if (age < 0 || age > RECOIL.tauMs * 6) continue;
    kick += (RECOIL.kick[shot.slot] ?? RECOIL.kick[0]) * Math.exp(-age / RECOIL.tauMs);
  }
  return Math.min(0.25, kick);
}

const ARMS = /^(?:mixamorig)?(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)|^weapon_/;

function attachModel(body, source, path) {
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
  const grip = model.getObjectByName('weapon_grip');
  const aim = model.getObjectByName('weapon_aim');
  if (!grip || !aim) return;
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of source.animations) {
    const upper = ['ready', 'shoot', 'reload'].includes(clip.name);
    const tracks = clip.tracks.filter((track) => ARMS.test(track.name) === upper);
    actions[clip.name] = mixer.clipAction(new THREE.AnimationClip(clip.name, clip.duration, tracks)).play();
    actions[clip.name].weight = Number(clip.name === 'idle' || clip.name === 'ready');
  }
  const gun = new THREE.Group();
  body.group.add(gun);
  body.motion = { mixer, actions, grip, aim, gun, held: null, heldType: null };
}

function disposeModel(body) {
  if (!body.model) return;
  body.motion?.mixer.stopAllAction();
  body.motion?.held?.userData.releaseAsset();
  body.motion?.gun.removeFromParent();
  body.model.traverse((obj) => { if (obj.isSkinnedMesh) obj.skeleton.dispose(); });
  body.model.removeFromParent();
  releaseAsset(body.path);
  body.motion = body.model = null;
}

const gripAt = new THREE.Vector3(), aimAt = new THREE.Vector3();
function poseModel(body, player, shotAge, dt) {
  const motion = body.motion;
  if (!motion) return;
  const { actions, mixer, gun, grip, aim } = motion;
  const speed = Math.hypot(player.vx || 0, player.vz || 0);
  const gait = speed > 8 ? 'dash' : speed > 0.35 ? 'jog' : 'idle';
  for (const name of ['idle', 'jog', 'dash']) {
    const action = actions[name];
    if (action) action.weight = THREE.MathUtils.damp(action.weight, name === gait ? 1 : 0, 18, dt);
  }
  const slot = GUN_IDS[player.slot] ? player.slot : 0;
  const type = GUN_IDS[slot];
  if (motion.heldType !== type) {
    const inst = instantiateGun(type, GUN_MODEL_LEN[type] * 0.82);
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
  actions.ready.weight = Number(!shooting && !reloading);
  actions.shoot.weight = Number(shooting && !reloading);
  actions.shoot.time = shooting ? shotAge / 1000 : 0;
  actions.shoot.paused = true;
  actions.reload.weight = Number(reloading);
  const reloadTime = LOADOUT[slot].stats.reloadTime;
  actions.reload.time = reloading ? actions.reload.getClip().duration * THREE.MathUtils.clamp(1 - player.reloadT / reloadTime, 0, 0.999) : 0;
  actions.reload.paused = true;
  mixer.update(dt);
  body.group.updateMatrixWorld(true);
  body.group.worldToLocal(grip.getWorldPosition(gripAt));
  body.group.worldToLocal(aim.getWorldPosition(aimAt));
  gun.position.copy(gripAt);
  // The socket points +Z. Weapon meshes are authored with the barrel toward -Z.
  gun.lookAt(body.group.localToWorld(aimAt.negate().addScaledVector(gripAt, 2)));
}

export function createArenaView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setClearColor(0x120a22, 1);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120a22, 28, 80);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffe9c2, 0x2a1b4a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
  sun.position.set(12, 24, 8);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(45, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a2a55, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(44.2, 45, 48),
    new THREE.MeshBasicMaterial({ color: 0xff5ec4, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(TUNING.arenaRadius, TUNING.arenaRadius, ARENA_WALL_H, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5ec4, transparent: true, opacity: 0.12, side: THREE.BackSide }),
  );
  wall.position.y = ARENA_WALL_H / 2;
  scene.add(wall);
  for (const solid of ARENA_SOLIDS) {
    const sx = solid.max[0] - solid.min[0];
    const sy = solid.max[1] - solid.min[1];
    const sz = solid.max[2] - solid.min[2];
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color: 0x9a9188, roughness: 0.85 }),
    );
    pillar.position.set((solid.min[0] + solid.max[0]) / 2, sy / 2, (solid.min[2] + solid.max[2]) / 2);
    scene.add(pillar);
  }

  const loader = new THREE.TextureLoader();
  loader.load(asset('textures/stages/city/floor.' + 'jpg'), (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    floor.material.map = tex;
    floor.material.color.set(0xffffff);
    floor.material.needsUpdate = true;
  });

  const ropes = [0, 1].map(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffd166 }));
    line.visible = false;
    line.frustumCulled = false;
    scene.add(line);
    return line;
  });

  const bodies = [0, 1].map((seat) => {
    const group = new THREE.Group();
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: SEAT_COLOR[seat] }),
    );
    capsule.position.y = 1.05;
    group.add(capsule);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 16),
      new THREE.MeshBasicMaterial({ color: SEAT_COLOR[seat] }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.04;
    group.add(pad);
    scene.add(group);
    return { group, capsule };
  });

  // Predicted shots: a muzzle flash and a pool of tracer lines.
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 }),
  );
  flash.visible = false;
  scene.add(flash);
  const tracers = [];
  for (let i = 0; i < 8; i++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xfff2b0, transparent: true }));
    line.visible = false;
    line.frustumCulled = false;
    scene.add(line);
    tracers.push(line);
  }

  function drawShots(shots, now, seat) {
    flash.visible = false;
    for (const line of tracers) line.visible = false;
    if (!shots || !shots.length) return;
    let used = 0;
    for (let i = shots.length - 1; i >= 0 && used < tracers.length; i--) {
      const shot = shots[i];
      const age = now - shot.at;
      if (age < 0 || age > TRACER_MS) continue;
      const dir = dirFromYawPitch(shot.yaw, shot.pitch);
      const eye = { x: shot.x, y: shot.y + TUNING.eyeHeight, z: shot.z };
      const weapon = bodies[seat]?.motion;
      const from = weapon?.held && weapon.muzzle
        ? weapon.held.localToWorld(weapon.muzzle.clone())
        : null;
      const muzzle = from || { x: eye.x + dir.x * MUZZLE_AHEAD, y: eye.y + dir.y * MUZZLE_AHEAD, z: eye.z + dir.z * MUZZLE_AHEAD };
      let len = TRACER_M;
      if (dir.y < -1e-6) len = Math.min(len, -eye.y / dir.y);
      const line = tracers[used++];
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, muzzle.x, muzzle.y, muzzle.z);
      pos.setXYZ(1, eye.x + dir.x * len, eye.y + dir.y * len, eye.z + dir.z * len);
      pos.needsUpdate = true;
      line.material.opacity = 1 - age / TRACER_MS;
      line.visible = true;
      if (age <= FLASH_MS && !flash.visible) {
        flash.position.set(muzzle.x, muzzle.y, muzzle.z);
        flash.visible = true;
      }
    }
  }

  const selection = selectedCharacter();
  const stock = PLAYER_CHARACTERS[0];
  let disposed = false;
  let lastTime = null;
  let lastShot = -Infinity;
  let localSeat = -1;
  const ready = Promise.all([loadPlayerModel(stock.model), loadPlayerModel(selection.model).catch(() => null)]).then(([source, selected]) => {
    if (disposed) return;
    if (source?.scene) for (const body of bodies) attachModel(body, source, stock.model);
    if (selected?.scene && selection.id !== stock.id) {
      for (const type of GUN_IDS) void ensureGunModel(type).catch(() => {});
      setLocalSkin = (seat) => {
        if (seat === localSeat) return;
        if (localSeat >= 0) {
          disposeModel(bodies[localSeat]);
          if (source?.scene) attachModel(bodies[localSeat], source, stock.model);
          else bodies[localSeat].capsule.visible = true;
        }
        disposeModel(bodies[seat]);
        attachModel(bodies[seat], selected, selection.model);
        localSeat = seat;
      };
    }
  }).catch(() => {});
  let setLocalSkin = () => {};

  function resize() {
    const w = Math.max(1, canvas.clientWidth || canvas.width || 640);
    const h = Math.max(1, canvas.clientHeight || canvas.height || 360);
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /**
   * `look` is the local {yaw, pitch}; without it the camera falls back to the sampled yaw.
   * `fx` is { shots, now }: the client's predicted shots for the flash, tracers and recoil.
   */
  function render(sample, seat, look = null, fx = null) {
    resize();
    const players = sample && sample.players;
    const now = fx?.now ?? performance.now();
    const dt = lastTime === null ? 1 / 60 : THREE.MathUtils.clamp((now - lastTime) / 1000, 0, 0.05);
    lastTime = now;
    if (players && (seat === 0 || seat === 1)) setLocalSkin(seat);
    for (const shot of fx?.shots || []) lastShot = Math.max(lastShot, shot.at);
    for (let i = 0; i < 2; i++) {
      const p = players && players[i];
      const entry = bodies[i], body = entry.group;
      if (!p) { body.visible = false; ropes[i].visible = false; continue; }
      body.visible = !!p.alive || p.hp > 0;
      body.position.set(p.x, p.y, p.z);
      body.rotation.y = i === seat && look ? look.yaw : p.yaw;
      if (entry.motion) body.rotation.y += Math.PI;
      poseModel(entry, p, now - lastShot, dt);
      const rope = ropes[i];
      const hook = p.grapple;
      if (hook) {
        const pos = rope.geometry.attributes.position;
        pos.setXYZ(0, p.x, p.y + 0.9, p.z);
        pos.setXYZ(1, hook.x, hook.y, hook.z);
        pos.needsUpdate = true;
        rope.visible = true;
      } else rope.visible = false;
    }
    const me = players && players[seat] ? players[seat] : { x: 0, y: 0, z: 16, yaw: 0, pitch: 0 };
    const kick = fx ? recoilAt(fx.shots, fx.now) : 0;
    const cam = look ? chaseCamera(me, look.yaw, look.pitch + kick) : chaseCamera(me, me.yaw, me.pitch || 0);
    drawShots(fx && fx.shots, fx ? fx.now : 0, seat);
    camera.position.set(cam.position.x, cam.position.y, cam.position.z);
    camera.lookAt(cam.target.x, cam.target.y, cam.target.z);
    renderer.render(scene, camera);
  }

  function dispose() {
    disposed = true;
    for (const body of bodies) disposeModel(body);
    renderer.dispose();
    floor.geometry.dispose();
    ring.geometry.dispose();
    flash.geometry.dispose();
    for (const line of tracers) line.geometry.dispose();
  }

  return { render, dispose, ready };
}
