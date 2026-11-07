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
  const spine = chain('Spine_', 4);
  const neck = chain('Head_', 4); // Head_0..3 form the neck; Head_4+ the skull/jaw
  const front = [{ bones: chain('0_Left_Limb_', 3), phase: 0 }, { bones: chain('0_Right_Limb_', 3), phase: Math.PI }];
  const hind = [{ bones: chain('1_Right_Limb_', 3), phase: 0 }, { bones: chain('1_Left_Limb_', 3), phase: Math.PI }];
  const all = Object.values(bones);
  const bind = new Map(all.map((b) => [b, b.quaternion.clone()]));
  let time = 0, walk = 0;
  const S = () => ({ x: 0, v: 0 });
  const gait = S(), fly = S(), breath = S(), bank = S(), prevYaw = { y: null };

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
      const roll = spring(bank, Math.max(-0.35, Math.min(0.35, -dyaw * 0.25)) * flying, 5, dt);
      if (roll) rotWorld(spine[0], _fwd, roll);

      // tail: travelling wave; bigger and slower in flight (it steers), quicker while walking
      const tAmp = 0.12 + 0.1 * g + 0.16 * flying, tSpd = 2.6 + 1.0 * g - 0.8 * flying;
      tail.forEach((b, i) => {
        rotWorld(b, _up, Math.sin(time * tSpd - i * 0.75) * tAmp);
        rotWorld(b, _side, Math.sin(time * 2.2 - i * 0.6) * 0.1 * flying); // vertical undulation in flight
      });
      // spine: sway on the ground, a swimming undulation in the air
      spine.forEach((b, i) => {
        rotWorld(b, _up, Math.sin(time * 2 - i * 0.6) * (0.035 + 0.02 * g));
        rotWorld(b, _side, Math.sin(time * 2.2 - i * 0.7) * 0.07 * flying);
      });

      // neck/head: idle bob; breath telegraph rears back, breath lunges forward; flying keeps the head forward
      const want = s.action === 'breath' ? (s.actionT < 0.7 ? -1 : 1) : s.action === 'fireballs' ? 0.6 : s.action === 'fly' ? 0.35 : 0;
      const bp = spring(breath, want, 7, dt);
      neck.forEach((b, i) => rotWorld(b, _side, Math.sin(time * 1.6 - i * 0.5) * 0.05 + bp * 0.12));

      // legs: diagonal walk while stalking; tucked (front folded back, hind trailing) while flying
      walk += dt * (2 + 5 * g);
      for (const l of [...front, ...hind]) {
        if (!l.bones.length) continue;
        const isFront = front.includes(l);
        const sw = Math.sin(walk + l.phase) * 0.35 * g;
        const tuck = flying * (isFront ? 0.9 : 1.1); // fold back
        rotWorld(l.bones[0], _side, sw + tuck);
        if (l.bones[1]) rotWorld(l.bones[1], _side, Math.max(0, -sw) * 0.8 + flying * (isFront ? -1.2 : 0.5));
        if (l.bones[2]) rotWorld(l.bones[2], _side, flying * 0.5 + Math.sin(time * 2.2 + l.phase) * 0.08 * flying);
      }
    },
  };
}
