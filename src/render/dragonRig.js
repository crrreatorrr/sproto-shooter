// Procedural animation for the Jade Dragon (Tripo quadruped rig shipped without animation clips).
// Every frame the rig resets to its bind pose, then layers: tail wave, spine sway, neck/head bob or breath
// pose, and a diagonal walk cycle on the four limbs while it moves. Rotations are applied in world space
// around the dragon's own up and side axes, so they don't depend on each bone's local axis convention.
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _up = new THREE.Vector3(), _side = new THREE.Vector3(), _rootQ = new THREE.Quaternion();

function rotWorld(bone, axis, angle) {
  if (!bone || !angle) return;
  _q.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(_wq).premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}

export function createDragonRig(ch) {
  const bones = {};
  ch.root.traverse((o) => { if (o.isBone) bones[o.name.replace(/^tripo/, '')] = o; });
  const chain = (prefix, n) => Array.from({ length: n }, (_, i) => bones[`${prefix}${i}`]).filter(Boolean);
  const tail = chain('Tail_', 5);
  const spine = chain('Spine_', 4);
  const neck = chain('Head_', 4); // Head_0..3 form the neck; Head_4+ the skull/jaw
  const limbs = [
    { bones: chain('0_Left_Limb_', 3), phase: 0 },
    { bones: chain('1_Right_Limb_', 3), phase: 0 },
    { bones: chain('0_Right_Limb_', 3), phase: Math.PI },
    { bones: chain('1_Left_Limb_', 3), phase: Math.PI },
  ];
  const all = Object.values(bones);
  const bind = new Map(all.map((b) => [b, b.quaternion.clone()]));
  let time = 0, walk = 0, breathPose = 0;

  return {
    ok: tail.length > 0 || spine.length > 0,
    /** s = { moving, action, actionT } from the boss sim state */
    update(dt, s) {
      time += dt;
      for (const [b, q] of bind) b.quaternion.copy(q);
      ch.root.updateMatrixWorld(true);
      ch.root.getWorldQuaternion(_rootQ);
      _up.set(0, 1, 0);
      _side.set(1, 0, 0).applyQuaternion(_rootQ);

      // tail: travelling wave, bigger while moving
      const amp = s.moving ? 0.22 : 0.14;
      tail.forEach((b, i) => rotWorld(b, _up, Math.sin(time * 3 - i * 0.8) * amp));
      spine.forEach((b, i) => rotWorld(b, _up, Math.sin(time * 2 - i * 0.6) * 0.04));

      // neck/head: idle bob; breath telegraph rears back, breath lunges forward and down
      const target = s.action === 'breath' ? (s.actionT < 0.7 ? -1 : 1) : s.action === 'fireballs' ? 0.6 : 0;
      breathPose += (target - breathPose) * Math.min(1, dt * 6);
      neck.forEach((b, i) => rotWorld(b, _side, (Math.sin(time * 1.6 - i * 0.5) * 0.05) + breathPose * 0.12));

      // legs: diagonal pairs swing while moving
      walk += dt * (s.moving ? 7 : 0);
      const stride = s.moving ? 0.35 : 0;
      for (const l of limbs) {
        if (!l.bones.length) continue;
        const sw = Math.sin(walk + l.phase) * stride;
        rotWorld(l.bones[0], _side, sw);
        if (l.bones[1]) rotWorld(l.bones[1], _side, Math.max(0, -sw) * 0.8);
      }
    },
  };
}
