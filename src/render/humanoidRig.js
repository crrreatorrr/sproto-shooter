// Procedural animation for humanoid boss rigs shipped without clips (Blue Monster: Mixamo skeleton; Sproto
// Beast: Tripo skeleton). Every frame the skeleton resets to its bind pose (arms down), then layers a smooth
// walk/run cycle and a pose per boss action. Melee has variants: an overhead 'smash', a straight 'punch' and a
// front 'kick', each with anticipation, a fast strike and a follow-through.
// Smoothness: every pose channel is a critically damped spring (no snapping), and walk speed/stride ease in
// and out, so starting, stopping and switching actions never pop.
// Rotations are applied in world space around the character's own axes (character faces local +Z, its left
// is local +X), so they don't depend on each bone's local axis convention:
//   about SIDE: +angle tips a "down" limb backwards and an "up" spine forwards; -angle swings a limb forwards/up
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
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
/** Out-back curve: overshoots a little, then settles (follow-through). */
const outBack = (t) => { t = clamp01(t); const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

// Mixamo and Tripo names for the same joints
const ALIASES = {
  hips: ['Hips', 'Hip', 'Pelvis'], spine: ['Spine', 'Waist'], chest: ['Spine1', 'Spine01'], upper: ['Spine2', 'Spine02'],
  neck: ['Neck', 'NeckTwist01'], head: ['Head'],
  rArm: ['RightArm', 'R_Upperarm'], rFore: ['RightForeArm', 'R_Forearm'], lArm: ['LeftArm', 'L_Upperarm'], lFore: ['LeftForeArm', 'L_Forearm'],
  rLeg: ['RightUpLeg', 'R_Thigh'], rKnee: ['RightLeg', 'R_Calf'], lLeg: ['LeftUpLeg', 'L_Thigh'], lKnee: ['LeftLeg', 'L_Calf'],
};

const ZERO = { rArm: 0, rFore: 0, lArm: 0, lFore: 0, rOut: 0, lOut: 0, rLeg: 0, rKnee: 0, lLeg: 0, lKnee: 0, lean: 0, twist: 0, head: 0 };

/** Target pose (radians) for a boss action at time t. */
function actionPose(action, t, melee, variant) {
  const P = { ...ZERO };
  switch (action) {
    case 'melee': {
      const w = melee.windup, k = t < w ? smooth(t / w) : 0, s = t >= w ? outBack((t - w) / 0.2) : 0; // windup, strike
      const rec = smooth((t - w - 0.25) / Math.max(0.1, melee.recover - 0.25)); // ease back to neutral
      const mix = (a, b) => (t < w ? a * k : a + (b - a) * s) * (1 - rec);
      if (variant === 'kick') {
        // chamber the right knee, then snap the leg out in front; lean back for balance, arms out
        P.rLeg = mix(-1.2, -1.75); P.rKnee = mix(1.6, 0.15); P.lKnee = mix(0.25, 0.15);
        P.lean = mix(-0.12, -0.3); P.rOut = mix(-0.4, -0.6); P.lOut = mix(0.4, 0.6); P.lArm = mix(-0.3, 0.3);
      } else if (variant === 'punch') {
        // cock the right fist back by the shoulder, then drive it straight out with a torso turn and a step
        P.rArm = mix(0.6, -1.55); P.rFore = mix(-1.9, -0.05); P.twist = mix(0.5, -0.55); P.lean = mix(-0.08, 0.32);
        P.lArm = mix(-0.7, -0.2); P.lFore = mix(-1.5, -1.1); P.lLeg = mix(0, -0.35); P.rLeg = mix(0, 0.2);
      } else {
        // overhead smash: right arm raised high, hammered down in front with a lean into it
        P.rArm = mix(-2.8, -0.9); P.rFore = mix(-0.9, -0.1); P.lean = mix(-0.15, 0.4); P.twist = mix(0.35, -0.4); P.lArm = mix(-0.4, 0.2);
      }
      break;
    }
    case 'charge': if (t < 0.8) { const k = smooth(t / 0.5); P.lean = -0.2 * k; P.rArm = 0.4 * k; P.lArm = 0.4 * k; P.rFore = -1 * k; P.lFore = -1 * k; } else { P.lean = 0.5; P.rArm = 0.7; P.lArm = 0.7; P.rFore = -0.6; P.lFore = -0.6; } break;
    case 'volley': case 'missiles': { const k = smooth(t / 0.45); P.rArm = -1.5 * k; P.lArm = -1.5 * k; P.rFore = -0.2 * k; P.lFore = -0.2 * k; P.lean = -0.1 * k; break; }
    case 'slam': P.rArm = -2.9; P.lArm = -2.9; P.lean = t > 0.4 ? 0.35 : -0.15; P.rKnee = 0.6; P.lKnee = 0.6; break;
    case 'summon': case 'intro': case 'transition': P.rOut = -1.3; P.lOut = 1.3; P.rFore = -0.8; P.lFore = -0.8; P.head = -0.25; P.lean = -0.1; break;
    case 'stunned': P.rOut = -0.5; P.lOut = 0.5; P.head = 0.35 + Math.sin(t * 6) * 0.1; P.lean = 0.25; P.rKnee = 0.4; P.lKnee = 0.4; break;
    default: break;
  }
  return P;
}

export function createHumanoidRig(ch, def) {
  const all = {};
  ch.root.traverse((o) => { if (o.isBone) all[o.name.replace(/^mixamorig:?/, '')] = o; });
  const B = Object.fromEntries(Object.entries(ALIASES).map(([k, names]) => [k, names.map((n) => all[n]).find(Boolean)]));
  const bind = new Map(Object.values(all).map((x) => [x, x.quaternion.clone()]));
  const melee = def.melee || { windup: 0.5, recover: 0.5 };
  let time = 0, phase = 0;
  const pos = { ...ZERO }, vel = { ...ZERO };
  let gait = 0, gaitV = 0; // 0 = standing, 1 = full run (spring too)
  return {
    ok: !!(B.hips && B.rArm && B.lArm),
    /** s = { speed, action, actionT, variant } from the boss sim state */
    update(dt, s) {
      dt = Math.min(dt, 0.05);
      time += dt;
      for (const [x, q] of bind) x.quaternion.copy(q);
      ch.root.updateMatrixWorld(true);
      ch.root.getWorldQuaternion(_rootQ);
      SIDE.set(1, 0, 0).applyQuaternion(_rootQ);
      FWD.set(0, 0, 1).applyQuaternion(_rootQ);
      // springs toward the action pose; the melee strike runs stiffer so the hit still reads as fast
      const tgt = actionPose(s.action, s.actionT, melee, s.variant);
      const w = s.action === 'melee' ? 26 : 13; // spring frequency
      for (const k in pos) { vel[k] += (w * w * (tgt[k] - pos[k]) - 2 * w * vel[k]) * dt; pos[k] += vel[k] * dt; }
      // gait: eases between standing and running with the boss's ground speed (no pop on start/stop)
      const wantGait = s.action === 'melee' ? 0 : Math.min(1, Math.max(0, (s.speed - 0.4) / 6));
      gaitV += (64 * (wantGait - gait) - 16 * gaitV) * dt; gait += gaitV * dt;
      phase += dt * (1.6 + 5.2 * gait);
      const g = Math.max(0, gait), sw = Math.sin(phase) * (0.55 * g), lift = (x) => Math.max(0, x) * 1.3 * g;
      // legs: thigh swing, knee bend on the forward (lifting) swing, plus action pose
      rotWorld(B.lLeg, SIDE, -sw + pos.lLeg); rotWorld(B.rLeg, SIDE, sw + pos.rLeg);
      rotWorld(B.lKnee, SIDE, lift(Math.sin(phase + 0.6)) * 0.9 + pos.lKnee);
      rotWorld(B.rKnee, SIDE, lift(Math.sin(phase + Math.PI + 0.6)) * 0.9 + pos.rKnee);
      // torso: breathing, run lean and bounce, hip sway, action lean/twist
      const breathe = Math.sin(time * 2.0) * 0.025;
      rotWorld(B.hips, UP, Math.sin(phase) * 0.12 * g);
      rotWorld(B.spine, SIDE, pos.lean * 0.5 + breathe + 0.18 * g + Math.abs(Math.cos(phase)) * 0.04 * g);
      rotWorld(B.chest, SIDE, pos.lean * 0.5);
      rotWorld(B.chest, UP, pos.twist - Math.sin(phase) * 0.16 * g);
      rotWorld(B.neck, SIDE, pos.head + Math.sin(time * 1.5) * 0.035 - 0.12 * g);
      // arms: action pose + run counter-swing (elbows bend when running) + idle sway
      const armSwing = sw * 1.1, idle = Math.sin(time * 2.0) * 0.035 * (1 - g);
      rotWorld(B.rArm, FWD, pos.rOut - 0.08 * g); rotWorld(B.lArm, FWD, pos.lOut + 0.08 * g);
      rotWorld(B.rArm, SIDE, pos.rArm - armSwing + idle);
      rotWorld(B.lArm, SIDE, pos.lArm + armSwing + idle);
      rotWorld(B.rFore, SIDE, pos.rFore - 0.15 - 0.9 * g);
      rotWorld(B.lFore, SIDE, pos.lFore - 0.15 - 0.9 * g);
    },
  };
}
