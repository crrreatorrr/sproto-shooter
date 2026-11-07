// Procedural animation for a humanoid boss rig (Mixamo skeleton) shipped without clips: the Blue Monster.
// Every frame the skeleton resets to its bind pose (arms already down), then layers breathing, a walk cycle,
// and a pose per boss action: an overhead arm smash for melee, a forward lean on charges, arms up to fire,
// arms raised for the slam, arms spread to summon, a wobble when stunned. Rotations are applied in world
// space around the character's own side / forward axes, so they don't depend on bone-local conventions.
// Sign guide (character faces its local +Z, its left is local +X):
//   about SIDE: +angle tips a "down" limb backwards and an "up" spine forwards; -angle swings an arm forwards/up
//   about FWD:  +angle swings the left arm out sideways; -angle swings the right arm out
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _rootQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0), SIDE = new THREE.Vector3(), FWD = new THREE.Vector3();

function rotWorld(bone, axis, angle) {
  if (!bone || !angle) return;
  _q.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(_wq).premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));

/** Target pose (radians) for a boss action at time t. melee = { windup, recover }. */
function actionPose(action, t, melee) {
  const P = { rArm: 0, rFore: 0, lArm: 0, lFore: 0, rOut: 0, lOut: 0, lean: 0, twist: 0, head: 0 };
  switch (action) {
    case 'melee': {
      // raise the right arm overhead, then hammer it down in front; torso twists and leans into the hit
      const w = melee.windup;
      if (t < w) { const k = ease(clamp01(t / w)); P.rArm = -2.8 * k; P.rFore = -0.9 * k; P.lean = -0.15 * k; P.twist = 0.35 * k; P.lArm = -0.4 * k; }
      else { const k = ease(clamp01((t - w) / 0.16)); P.rArm = -2.8 + 1.9 * k; P.rFore = -0.9 + 0.8 * k; P.lean = -0.15 + 0.5 * k; P.twist = 0.35 - 0.75 * k; P.lArm = -0.4 + 0.6 * k; }
      break;
    }
    case 'charge': if (t < 0.8) { P.lean = -0.2; P.rArm = 0.5; P.lArm = 0.5; P.rFore = -1; P.lFore = -1; } else { P.lean = 0.45; P.rArm = 0.7; P.lArm = 0.7; } break;
    case 'volley': case 'missiles': P.rArm = -1.5; P.lArm = -1.5; P.rFore = -0.2; P.lFore = -0.2; P.lean = -0.1; break;
    case 'slam': P.rArm = -2.9; P.lArm = -2.9; P.lean = t > 0.4 ? 0.35 : -0.15; break;
    case 'summon': case 'intro': case 'transition': P.rOut = -1.3; P.lOut = 1.3; P.rFore = -0.8; P.lFore = -0.8; P.head = -0.25; P.lean = -0.1; break;
    case 'stunned': P.rOut = -0.5; P.lOut = 0.5; P.head = 0.3; P.lean = 0.25; break;
    default: break;
  }
  return P;
}

export function createHumanoidRig(ch, def) {
  const b = {};
  ch.root.traverse((o) => { if (o.isBone) b[o.name.replace(/^mixamorig:?/, '')] = o; });
  const bind = new Map(Object.values(b).map((x) => [x, x.quaternion.clone()]));
  const melee = def.melee || { windup: 0.5, recover: 0.5 };
  let time = 0, walk = 0;
  const cur = actionPose(null, 0, melee);
  return {
    ok: !!(b.Hips && b.RightArm && b.LeftArm),
    /** s = { speed, action, actionT } from the boss sim state */
    update(dt, s) {
      time += dt;
      for (const [x, q] of bind) x.quaternion.copy(q);
      ch.root.updateMatrixWorld(true);
      ch.root.getWorldQuaternion(_rootQ);
      SIDE.set(1, 0, 0).applyQuaternion(_rootQ);
      FWD.set(0, 0, 1).applyQuaternion(_rootQ);
      // blend toward the action pose (the melee strike snaps faster so the hit reads)
      const tgt = actionPose(s.action, s.actionT, melee);
      const k = Math.min(1, dt * (s.action === 'melee' ? 30 : 8));
      for (const key in cur) cur[key] += (tgt[key] - cur[key]) * k;
      // walk cycle while moving: legs swing, knees bend, arms counter-swing
      const moving = s.speed > 0.6;
      walk += dt * (moving ? 2 + s.speed * 0.9 : 0);
      const stride = moving ? Math.min(0.6, 0.25 + s.speed * 0.04) : 0;
      const sw = Math.sin(walk) * stride;
      rotWorld(b.LeftUpLeg, SIDE, sw); rotWorld(b.RightUpLeg, SIDE, -sw);
      rotWorld(b.LeftLeg, SIDE, Math.max(0, sw) * 1.1); rotWorld(b.RightLeg, SIDE, Math.max(0, -sw) * 1.1);
      // torso: breathing, lean, twist
      const breathe = Math.sin(time * 2.2) * 0.03;
      rotWorld(b.Spine, SIDE, cur.lean * 0.5 + breathe);
      rotWorld(b.Spine1, SIDE, cur.lean * 0.5);
      rotWorld(b.Spine1, UP, cur.twist + Math.sin(walk) * stride * 0.15);
      rotWorld(b.Neck, SIDE, cur.head + Math.sin(time * 1.6) * 0.04);
      // arms: action pose + walk counter-swing + idle sway
      const armSwing = -sw * 0.8, idle = Math.sin(time * 2.2) * 0.04;
      rotWorld(b.RightArm, FWD, cur.rOut); rotWorld(b.LeftArm, FWD, cur.lOut);
      rotWorld(b.RightArm, SIDE, cur.rArm + armSwing + idle);
      rotWorld(b.LeftArm, SIDE, cur.lArm - armSwing + idle);
      rotWorld(b.RightForeArm, SIDE, cur.rFore - 0.15);
      rotWorld(b.LeftForeArm, SIDE, cur.lFore - 0.15);
      // a little shake on the strike
      if (s.action === 'melee') rotWorld(b.Head, SIDE, 0.15 * pulse(s.actionT, melee.windup + 0.12, 0.08));
    },
  };
}
