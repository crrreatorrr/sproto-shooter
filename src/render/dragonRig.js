// Procedural animation for the Jade Dragon (Tripo quadruped rig shipped without animation clips).
// Every frame the rig resets to its bind pose, then layers: tail wave, spine sway, neck/head bob or breath
// pose, a diagonal walk cycle while it stalks, and a flight pose while airborne (legs tucked, body undulating,
// big tail sweeps). All amounts are springs/eased blends, so walking, flying and attacking flow into each
// other without popping. Rotations are applied in world space around the dragon's own up and side axes, so
// they don't depend on each bone's local axis convention.
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _up = new THREE.Vector3(), _side = new THREE.Vector3(), _fwd = new THREE.Vector3(), _rootQ = new THREE.Quaternion();

function rotWorld(bone, axis, angle) {
  if (!bone || !angle) return;
  _q.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(_wq).premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}
/** Critically damped spring step toward target. */
function spring(st, target, w, dt) { st.v += (w * w * (target - st.x) - 2 * w * st.v) * dt; st.x += st.v * dt; return st.x; }

export function createDragonRig(ch) {
  const bones = {};
  ch.root.traverse((o) => { if (o.isBone) bones[o.name.replace(/^tripo/, '')] = o; });
  const chain = (prefix, n) => Array.from({ length: n }, (_, i) => bones[`${prefix}${i}`]).filter(Boolean);
  const tail = chain('Tail_', 5);
  const root = bones.Root;
  const spine = chain('Spine_', 4);
  const neck = chain('Head_', 4); // Head_0..3 form the neck; Head_4+ the skull/jaw
  const front = [{ bones: chain('0_Left_Limb_', 3), phase: 0 }, { bones: chain('0_Right_Limb_', 3), phase: Math.PI }];
  const hind = [{ bones: chain('1_Right_Limb_', 3), phase: 0 }, { bones: chain('1_Left_Limb_', 3), phase: Math.PI }];
  const all = Object.values(bones);
  const bind = new Map(all.map((b) => [b, b.quaternion.clone()]));
  let time = 0, walk = 0;
  const S = () => ({ x: 0, v: 0 });
  const gait = S(), fly = S(), breath = S(), bank = S(), pitch = S(), prevYaw = { y: null }, prevAlt = { y: null };
  let swim = 0;

  return {
    ok: tail.length > 0 || spine.length > 0,
    /** s = { moving, speed, action, actionT, altitude, yaw } from the boss sim state */
    update(dt, s) {
      dt = Math.min(dt, 0.05);
      time += dt;
      for (const [b, q] of bind) b.quaternion.copy(q);
      ch.root.updateMatrixWorld(true);
      ch.root.getWorldQuaternion(_rootQ);
      _up.set(0, 1, 0);
      _side.set(1, 0, 0).applyQuaternion(_rootQ);
      _fwd.set(0, 0, 1).applyQuaternion(_rootQ);

      const flying = spring(fly, (s.altitude || 0) > 0.4 ? 1 : 0, 6, dt);
      const g = spring(gait, s.moving && flying < 0.5 ? 1 : 0, 8, dt) * (1 - flying);
      // bank into turns while flying (from the change in heading)
      const dyaw = prevYaw.y === null ? 0 : Math.atan2(Math.sin(s.yaw - prevYaw.y), Math.cos(s.yaw - prevYaw.y)) / Math.max(dt, 1e-3);
      prevYaw.y = s.yaw;
      const roll = spring(bank, Math.max(-0.5, Math.min(0.5, -dyaw * 0.35)) * flying, 5, dt);
      // nose up when climbing, down when diving (from the change in altitude)
      const vy = prevAlt.y === null ? 0 : ((s.altitude || 0) - prevAlt.y) / Math.max(dt, 1e-3);
      prevAlt.y = s.altitude || 0;
      const nose = spring(pitch, Math.max(-0.45, Math.min(0.45, -vy * 0.09)) * flying, 4, dt);
      if (root) { rotWorld(root, _fwd, roll); rotWorld(root, _side, nose); } else if (roll) rotWorld(spine[0], _fwd, roll);

      // serpentine swim: in flight one travelling S-wave runs from the neck down the spine to the tail tip
      // (an eastern dragon swims through the air); on the ground just a gentle sway
      swim += dt * (2.2 + 2.6 * flying + 1.0 * g);
      const body = [...neck.slice().reverse(), ...spine, ...tail]; // head end first
      body.forEach((b, i) => {
        const ph = swim - i * 0.55;
        const lat = Math.sin(ph) * (0.03 + 0.03 * g + 0.17 * flying * (0.5 + i / body.length));
        const ver = Math.sin(ph * 0.8 + 1.2) * 0.1 * flying;
        if (neck.includes(b)) { rotWorld(b, _up, lat * 0.5); return; } // the head stays roughly on target
        rotWorld(b, _up, lat); rotWorld(b, _side, ver);
      });
      // tail: extra sweep on the ground while walking
      tail.forEach((b, i) => rotWorld(b, _up, Math.sin(time * (2.6 + g) - i * 0.75) * (0.1 + 0.1 * g) * (1 - flying)));

      // neck/head: idle bob; breath telegraph rears back, breath lunges forward; flying keeps the head forward
      const want = s.action === 'breath' ? (s.actionT < 0.7 ? -1 : 1) : s.action === 'fireballs' ? 0.6 : s.action === 'fly' ? 0.35 : 0;
      const bp = spring(breath, want, 7, dt);
      neck.forEach((b, i) => rotWorld(b, _side, Math.sin(time * 1.6 - i * 0.5) * 0.05 + bp * 0.12));

      // legs: diagonal walk while stalking; in flight folded back and paddling in time with the swim
      walk += dt * (2 + 5 * g);
      for (const l of [...front, ...hind]) {
        if (!l.bones.length) continue;
        const isFront = front.includes(l);
        const sw = Math.sin(walk + l.phase) * 0.5 * g; // bigger stride
        const paddle = Math.sin(swim * 1.0 + l.phase + (isFront ? 0 : 1.6)) * 0.45 * flying;
        const tuck = flying * (isFront ? 0.7 : 0.95); // fold back
        rotWorld(l.bones[0], _side, sw + tuck + paddle);
        if (l.bones[1]) rotWorld(l.bones[1], _side, Math.max(0, -sw) * 1.1 + flying * (isFront ? -0.9 : 0.4) - paddle * 0.6); // lift the foot on the swing
        if (l.bones[2]) rotWorld(l.bones[2], _side, flying * 0.4 + paddle * 0.4 + Math.max(0, sw) * 0.4 * g); // paw rolls off the ground
      }
      // walking: the body rolls and dips with each step
      if (root && g > 0.01) { rotWorld(root, _fwd, Math.sin(walk) * 0.06 * g); rotWorld(root, _side, Math.abs(Math.cos(walk)) * 0.03 * g); }
    },
  };
}
