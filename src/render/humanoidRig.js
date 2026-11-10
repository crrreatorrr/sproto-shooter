// Procedural animation for humanoid boss rigs shipped without clips (Blue Monster: Mixamo skeleton; Sproto
// Beast: Tripo skeleton). Every frame the skeleton resets to its bind pose (arms down), then layers:
//   1. a speed-matched gait (phase advances with ground speed and leg length, so feet don't slide; feet stay
//      planted longer than they swing; pelvis bobs twice per cycle; body leans with acceleration and banks
//      into turns),
//   2. a pose per boss action. Melee follows the attack envelope in anim.js (readable windup that holds, an
//      accelerating strike into contact, an impact hold, then recovery), with overlapping action down the
//      chain: hips/torso lead, then shoulder, upper arm, forearm (punch); knee chamber then snap (kick).
// Every channel runs through an exact critically damped spring (half-life based, frame-rate independent),
// stiffer during the strike so the hit stays fast.
// Rotations are applied in world space around the character's own axes (character faces local +Z, its left
// is local +X):
//   about SIDE: +angle tips a "down" limb backwards and an "up" spine forwards; -angle swings a limb forwards/up
//   about FWD:  +angle swings the left arm out sideways; -angle swings the right arm out
import * as THREE from 'three';
import { springTo, spring, attackEnvelope, gaitAdvance, legCycle, rotWorld, wrapAngle, smoothstep, groundProbe } from './anim.js';

const _rootQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0), SIDE = new THREE.Vector3(), FWD = new THREE.Vector3();

// Mixamo and Tripo names for the same joints
const ALIASES = {
  hips: ['Hips', 'Hip', 'Pelvis'], spine: ['Spine', 'Waist'], chest: ['Spine1', 'Spine01'], upper: ['Spine2', 'Spine02'],
  neck: ['Neck', 'NeckTwist01'], head: ['Head'],
  rArm: ['RightArm', 'R_Upperarm'], rFore: ['RightForeArm', 'R_Forearm'], lArm: ['LeftArm', 'L_Upperarm'], lFore: ['LeftForeArm', 'L_Forearm'],
  rLeg: ['RightUpLeg', 'R_Thigh'], rKnee: ['RightLeg', 'R_Calf'], lLeg: ['LeftUpLeg', 'L_Thigh'], lKnee: ['LeftLeg', 'L_Calf'],
  lFoot: ['LeftFoot', 'L_Foot'], rFoot: ['RightFoot', 'R_Foot'],
  lToe: ['LeftToeBase', 'L_ToeBase'], rToe: ['RightToeBase', 'R_ToeBase'],
};

const CHANNELS = ['rArm', 'rFore', 'lArm', 'lFore', 'rOut', 'lOut', 'rLeg', 'rKnee', 'lLeg', 'lKnee', 'lean', 'twist', 'head'];
const zero = () => Object.fromEntries(CHANNELS.map((k) => [k, 0]));

/** Melee pose: blend cocked → strike → neutral using the attack envelope; `lead` gives overlap per body part. */
function meleePose(variant, t, melee) {
  const P = zero();
  // overlap: the torso starts its strike a little before the arm/leg, which follows a little after
  const env = (lead) => attackEnvelope(t + lead, melee.windup, melee.recover);
  const mix = (e, cock, strike) => (cock * e.wind * (1 - e.hit) + strike * e.hit) * (1 - e.rec);
  const core = env(0.05), limb = env(0), tip = env(-0.025);
  if (variant === 'kick') {
    // chamber: right knee up and bent, weight on the left; snap: leg extends out front; arms up for balance
    P.rLeg = mix(limb, -1.25, -1.75); P.rKnee = mix(tip, 1.7, 0.1); P.lKnee = mix(core, 0.3, 0.12);
    // re-chamber: after the snap the knee folds back in before the foot comes down (not a straight swing back)
    P.rKnee += 1.5 * Math.sin(Math.PI * Math.min(1, tip.rec * 1.4)) * (tip.rec < 1 ? 1 : 0);
    P.lean = mix(core, -0.1, -0.32); P.twist = mix(core, -0.15, 0.2);
    P.rOut = mix(core, -0.35, -0.65); P.lOut = mix(core, 0.35, 0.65); P.lArm = mix(core, -0.3, 0.35); P.lFore = mix(core, -0.9, -0.6);
  } else if (variant === 'punch') {
    // cock: fist back by the shoulder, torso turned away; strike: hips/torso turn first, then shoulder, arm, fist
    P.twist = mix(core, 0.5, -0.6); P.lean = mix(core, -0.08, 0.32);
    P.rArm = mix(limb, 0.55, -1.55); P.rFore = mix(tip, -1.9, -0.05);
    P.lArm = mix(core, -0.7, -0.15); P.lFore = mix(core, -1.5, -1.0); P.lLeg = mix(core, 0, -0.35); P.rLeg = mix(core, 0, 0.22);
  } else {
    // overhead smash: arm raised high and held, then hammered down in front with the body leaning into it
    P.rArm = mix(limb, -2.8, -0.9); P.rFore = mix(tip, -0.9, -0.1); P.lean = mix(core, -0.18, 0.42); P.twist = mix(core, 0.35, -0.4);
    P.lArm = mix(core, -0.45, 0.2); P.rKnee = mix(core, 0.15, 0.35); P.lKnee = mix(core, 0.15, 0.35);
  }
  return P;
}

/** Target pose (radians) for a boss action at time t. */
function actionPose(action, t, melee, variant, data, def) {
  if (action === 'melee') return meleePose(variant, t, melee);
  const P = zero(), k = smoothstep(t / 0.45);
  switch (action) {
    case 'charge': if (t < 0.8) { const c = smoothstep(t / 0.5); P.lean = -0.2 * c; P.rArm = 0.4 * c; P.lArm = 0.4 * c; P.rFore = -1 * c; P.lFore = -1 * c; } else { P.lean = 0.5; P.rArm = 0.7; P.lArm = 0.7; P.rFore = -0.6; P.lFore = -0.6; } break;
    case 'volley': case 'missiles': {
      const windup = action === 'volley' ? 0.5 : 0.6;
      const gap = def[action]?.gap || 0.4;
      const release = t - windup - Math.max(0, (data.fired || 1) - 1) * gap;
      const recoil = t >= windup ? Math.exp(-Math.max(0, release) * 20) : 0;
      const wind = smoothstep(t / windup);
      P.rArm = -1.5 * wind + 0.29 * recoil;
      P.lArm = P.rArm;
      P.rFore = P.lFore = -0.3 * wind - 0.38 * recoil;
      P.rOut = -0.26 * wind; P.lOut = 0.26 * wind;
      P.lean = -0.13 * wind - 0.14 * recoil;
      break;
    }
    case 'slam': {
      const down = data.landed ? 1 : smoothstep((t - 0.43) / 0.22);
      const recovery = smoothstep((data.lt || 0) / 0.85);
      const weight = 1 - recovery;
      P.rArm = P.lArm = (-2.75 + 1.95 * down) * weight;
      P.rOut = -0.23 * weight; P.lOut = 0.23 * weight;
      P.lean = (-0.18 + 0.65 * down) * weight;
      P.rKnee = P.lKnee = (0.28 + 0.35 * down) * weight;
      break;
    }
    case 'summon': case 'intro': case 'transition': P.rOut = -1.3 * k; P.lOut = 1.3 * k; P.rFore = -0.8 * k; P.lFore = -0.8 * k; P.head = -0.25 * k; P.lean = -0.1 * k; break;
    case 'stunned': P.rOut = -0.5; P.lOut = 0.5; P.head = 0.35 + Math.sin(t * 6) * 0.1; P.lean = 0.25; P.rKnee = 0.4; P.lKnee = 0.4; break;
    default: break;
  }
  return P;
}

export function createHumanoidRig(ch, def) {
  const all = {};
  ch.root.traverse((o) => { if (o.isBone) all[o.name.replace(/^mixamorig:?/, '')] = o; });
  const B = Object.fromEntries(Object.entries(ALIASES).map(([k, names]) => [k, names.map((n) => all[n]).find(Boolean)]));
  const bind = Object.values(all).map((bone) => [bone, bone.quaternion.clone(), bone.position.clone()]);
  const melee = def.melee || { windup: 0.6, recover: 0.8 };
  // gait scale from the skeleton itself: measured hip-to-foot leg length (fallback: 47% of height)
  const height = def.height || 6;
  ch.root.updateMatrixWorld(true);
  const measured = B.lLeg && B.lFoot ? B.lLeg.getWorldPosition(new THREE.Vector3()).distanceTo(B.lFoot.getWorldPosition(new THREE.Vector3())) : 0;
  const legLen = measured > 0.1 ? measured : 0.47 * height, stepLen = 0.8 * legLen;
  // thigh sweep during stance must cover what the body travels while the foot is down (stepLen × duty),
  // or the planted foot skates
  const sweepFor = (duty) => Math.asin(Math.min(0.85, (stepLen * duty) / legLen));
  const pose = Object.fromEntries(CHANNELS.map((k) => [k, spring()]));
  const gait = spring(), lean = spring(), bank = spring();
  const clearance = groundProbe([B.lToe || B.lFoot, B.rToe || B.rFoot].filter(Boolean));
  const center = new THREE.Vector3(), worldScale = new THREE.Vector3();
  const tailAxis = new THREE.Vector3();
  let time = 0, phase = 0, prevSpeed = 0, prevYaw = null;
  // tail chain (Sproto Beast, rigged in Blender): never still - a travelling side-to-side wave growing toward
  // the tip, a double-time vertical wave on top, and a counter-swing against the torso's twist
  const tailBones = Array.from({ length: 16 }, (_, i) => all[`Tail_${i}`]).filter(Boolean);
  let tailPh = 0;
  return {
    ok: !!(B.hips && B.rArm && B.lArm),
    post(_weight, pitch) {
      const joint = all.Tail_2, tip = all.Tail_7;
      if (!pitch || !joint || !tip) return;
      tip.getWorldPosition(tailAxis).sub(joint.getWorldPosition(center)).cross(UP).normalize();
      rotWorld(joint, tailAxis, pitch);
    },
    /** s = { speed, action, actionT, variant, yaw } from the boss sim state */
    update(dt, s) {
      dt = Math.min(dt, 0.05);
      time += dt;
      for (const [bone, q, p] of bind) { bone.quaternion.copy(q); bone.position.copy(p); }
      ch.root.updateMatrixWorld(true);
      ch.root.getWorldQuaternion(_rootQ);
      SIDE.set(1, 0, 0).applyQuaternion(_rootQ);
      FWD.set(0, 0, 1).applyQuaternion(_rootQ);

      // action pose through critically damped springs; much stiffer during melee so the strike stays snappy
      // a combo boss picks punch/kick on its first melee tick; until then hold the current pose instead of
      // snapping toward the default smash for one frame
      // ...and while an authored clip drives the pose (clipLayer.js) the action pose holds instead of snapping
      // underneath the blend
      const pending = (s.action === 'melee' && !s.variant && melee.combo) || (s.clipDriven && s.action === 'melee');
      const tgt = pending ? Object.fromEntries(CHANNELS.map((k) => [k, pose[k].x])) : actionPose(s.action, s.actionT, melee, s.variant, s.data || {}, def);
      const hl = ['melee', 'volley', 'missiles', 'slam'].includes(s.action) ? 0.027 : 0.09;
      const P = {};
      for (const k of CHANNELS) P[k] = springTo(pose[k], tgt[k], hl, dt);

      // gait amount (0 standing .. 1 full stride), phase tied to ground speed so the feet don't slide
      const speed = s.action === 'melee' ? 0 : s.speed;
      const g = springTo(gait, Math.min(1, speed / 1.2), 0.12, dt);
      phase += gaitAdvance(Math.max(speed, 0.0), stepLen, dt);
      const run = Math.min(1, speed / (legLen * 1.6)); // walk → run by relative speed
      const duty = 0.62 - 0.24 * run; // feet planted longer when walking
      const cyc = phase / (2 * Math.PI);
      const L = legCycle(cyc, duty), R = legCycle(cyc + 0.5, duty);
      const swingAmp = sweepFor(duty);
      // lean with acceleration and bank into turns (atan2 against gravity, softened)
      const accel = dt > 0 ? (speed - prevSpeed) / dt : 0; prevSpeed = speed;
      const yawRate = prevYaw === null || dt <= 0 ? 0 : wrapAngle(s.yaw - prevYaw) / dt; prevYaw = s.yaw;
      const leanT = Math.atan2(accel, 9.8) * 0.5 + 0.12 * run * g;
      const bankT = Math.max(-0.25, Math.min(0.25, Math.atan2(speed * yawRate, 9.8) * 0.4));
      const leanX = springTo(lean, leanT, 0.15, dt), bankX = springTo(bank, bankT, 0.15, dt);

      // legs: thigh swing from the duty-factor cycle, knee lifts during swing, plus action pose
      rotWorld(B.lLeg, SIDE, -L.swing * swingAmp * g + P.lLeg);
      rotWorld(B.rLeg, SIDE, -R.swing * swingAmp * g + P.rLeg);
      rotWorld(B.lKnee, SIDE, L.lift * (0.55 + 0.35 * run) * g + 0.08 * g + P.lKnee);
      rotWorld(B.rKnee, SIDE, R.lift * (0.55 + 0.35 * run) * g + 0.08 * g + P.rKnee);
      // pelvis bob: lowest when a foot plants (twice per cycle); hips twist with the stride
      const bob = -Math.abs(Math.cos(phase)) * 0.012 * height * g;
      rotWorld(B.hips, UP, Math.sin(phase) * 0.1 * g);
      rotWorld(B.hips, FWD, bankX);
      // torso: breathing, lean, counter-twist against the hips, action lean/twist
      const breathe = Math.sin(time * 2.0) * 0.025;
      rotWorld(B.spine, SIDE, P.lean * 0.5 + breathe + leanX);
      rotWorld(B.chest, SIDE, P.lean * 0.5);
      rotWorld(B.chest, UP, P.twist - Math.sin(phase) * 0.16 * g);
      rotWorld(B.neck, SIDE, P.head + Math.sin(time * 1.5) * 0.035 - leanX * 0.6); // keep the head level
      // arms: action pose + counter-swing opposite the legs (elbows bend more when running) + idle sway
      const idle = Math.sin(time * 2.0) * 0.035 * (1 - g);
      rotWorld(B.rArm, FWD, P.rOut - 0.08 * g); rotWorld(B.lArm, FWD, P.lOut + 0.08 * g);
      rotWorld(B.rArm, SIDE, P.rArm + L.swing * swingAmp * 0.9 * g + idle);
      rotWorld(B.lArm, SIDE, P.lArm + R.swing * swingAmp * 0.9 * g + idle);
      rotWorld(B.rFore, SIDE, P.rFore - 0.15 - (0.5 + 0.6 * run) * g);
      rotWorld(B.lFore, SIDE, P.lFore - 0.15 - (0.5 + 0.6 * run) * g);
      if (!s.clipDriven && s.altitude < 0.08) {
        const baseY = ch.root.getWorldPosition(center).y;
        ch.root.getWorldScale(worldScale);
        ch.root.position.y = clearance(baseY, worldScale.y, height * 0.08);
      } else ch.root.position.y = bob;
      if (tailBones.length) {
        tailPh += dt * 2 * Math.PI * (0.8 + 0.5 * g);
        const n = tailBones.length;
        tailBones.forEach((b, i) => {
          const k = n > 1 ? i / (n - 1) : 0, lag = 0.62 * i;
          rotWorld(b, UP, (0.09 + 0.16 * k) * Math.sin(tailPh - lag) - P.twist * 0.35 * k);
          rotWorld(b, SIDE, (0.05 + 0.08 * k) * Math.sin(2 * tailPh - 1.25 * lag + 1));
        });
      }
    },
  };
}
