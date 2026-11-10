// Free-arena view. Reuses the player model and the city floor. No new art.
// SHOOTER-S3: the local player is drawn from the client's prediction, and its shots get a
// cosmetic muzzle flash, tracer and camera recoil at once (fx.shots). Damage is never drawn here.
import * as THREE from 'three';
import { TUNING } from '../../data/tuning.js';
import { dirFromYawPitch } from '../../core/math.js';
import { ARENA_SOLIDS, ARENA_WALL_H } from '../../sim/pvp/arena.js';
import { chaseCamera } from './aim.js';

export { chaseCamera };

const SEAT_COLOR = [0xff5ec4, 0x4fd1c5];

function asset(path) {
  const base = import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
  return `${base}assets/${path}`;
}

let playerPromise = null;

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

function loadPlayer() {
  if (!playerPromise) {
    playerPromise = (async () => {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(asset('models/characters/sproto_player.' + 'glb'));
      gltf.scene.traverse((obj) => { obj.frustumCulled = false; });
      return gltf.scene;
    })();
  }
  return playerPromise;
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

  function drawShots(shots, now) {
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
      const muzzle = { x: eye.x + dir.x * MUZZLE_AHEAD, y: eye.y + dir.y * MUZZLE_AHEAD, z: eye.z + dir.z * MUZZLE_AHEAD };
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

  const ready = loadPlayer().then((source) => {
    for (const body of bodies) {
      const model = source.clone(true);
      model.position.set(0, 0, 0);
      model.scale.setScalar(1);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const height = box.getSize(new THREE.Vector3()).y || 1;
      model.scale.setScalar(1.8 / height);
      model.updateMatrixWorld(true);
      model.position.y -= new THREE.Box3().setFromObject(model).min.y;
      body.group.add(model);
      body.capsule.visible = false;
    }
  }).catch(() => {});

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
    for (let i = 0; i < 2; i++) {
      const p = players && players[i];
      const body = bodies[i].group;
      if (!p) { body.visible = false; ropes[i].visible = false; continue; }
      body.visible = !!p.alive || p.hp > 0;
      body.position.set(p.x, p.y, p.z);
      body.rotation.y = p.yaw;
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
    if (look && players && players[seat]) bodies[seat].group.rotation.y = look.yaw;
    const kick = fx ? recoilAt(fx.shots, fx.now) : 0;
    const cam = look ? chaseCamera(me, look.yaw, look.pitch + kick) : chaseCamera(me, me.yaw, me.pitch || 0);
    drawShots(fx && fx.shots, fx ? fx.now : 0);
    camera.position.set(cam.position.x, cam.position.y, cam.position.z);
    camera.lookAt(cam.target.x, cam.target.y, cam.target.z);
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    floor.geometry.dispose();
    ring.geometry.dispose();
    flash.geometry.dispose();
    for (const line of tracers) line.geometry.dispose();
  }

  return { render, dispose, ready };
}
