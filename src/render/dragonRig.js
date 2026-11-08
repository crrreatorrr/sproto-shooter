// Procedural animation for the Jade Dragon (Tripo quadruped rig shipped without animation clips), an eastern
// (wingless, serpentine) dragon. Every frame the rig resets to its bind pose, then layers motion based on
// animal-locomotion research:
//  - Ground walk: a lateral-sequence near-trot like Komodo dragons and caimans (duty factor ~0.77; the fore
//    foot lands ~43% of a stride after the hind foot on the same side; Usherwood & Self Davies 2017), with
//    feet planted longer than they swing and the cycle tied to ground speed so feet don't slide. The trunk
//    bends side to side as a standing wave with still points at the shoulders and hips (lizard/croc spines),
//    the head bobs twice per stride, and the tail trails turns through lagging springs.
//  - Flight: it swims through the air like an eel or snake: a backward-travelling wave of ~0.7 body lengths
//    whose amplitude grows exponentially toward the tail (a(s) = a_max·e^(s-1)), the body bends into turns,
//    and the neck cancels the body's wave so the head stays on target (snake-robot head stabilisation). Legs
//    fold back and paddle with the wave; the body pitches with climbs/dives and banks into turns.
// All blends are exact critically damped springs (anim.js), so walking, flying and attacking flow together.
// Rotations are applied in world space around the dragon's own axes, independent of bone-local conventions.
import * as THREE from 'three';
import { springTo, spring, gaitAdvance, legCycle, rotWorld, wrapAngle } from './anim.js';

const _up = new THREE.Vector3(), _side = new THREE.Vector3(), _fwd = new THREE.Vector3(), _rootQ = new THREE.Quaternion();

export function createDragonRig(ch, def = {}) {
  const bones = {};
  ch.root.traverse((o) => { if (o.isBone) bones[o.name.replace(/^tripo/, '')] = o; });
  const chain = (prefix, n) => Array.from({ length: n }, (_, i) => bones[`${prefix}${i}`]).filter(Boolean);
  const tail = chain('Tail_', 5);
  const root = bones.Root;
  const spine = chain('Spine_', 4);
  const neck = chain('Head_', 4); // Head_0..3 form the neck; Head_4+ the skull/jaw
  // lateral-sequence walk: hind leg first, same-side fore 43% later; right side half a cycle later
  const legs = [
    { bones: chain('1_Left_Limb_', 3), off: 0.0, front: false },
    { bones: chain('0_Left_Limb_', 3), off: 0.43, front: true },
    { bones: chain('1_Right_Limb_', 3), off: 0.5, front: false },
    { bones: chain('0_Right_Limb_', 3), off: 0.93, front: true },
  ];
  const all = Object.values(bones);
  const bind = new Map(all.map((b) => [b, b.quaternion.clone()]));
  // stride from the skeleton: measured shoulder-to-foot leg length; the stance sweep covers what the body
  // travels while a foot is planted (stepLen × duty), so the feet don't skate
  const DUTY = 0.77;
  ch.root.updateMatrixWorld(true);
  const fl = legs[1].bones;
  const legLen = fl.length >= 3 ? fl[0].getWorldPosition(new THREE.Vector3()).distanceTo(fl[2].getWorldPosition(new THREE.Vector3())) : 0.3 * (def.height || 3.2);
  const stepLen = 1.0 * Math.max(0.1, legLen);
  const sweep = Math.asin(Math.min(0.85, (stepLen * DUTY) / Math.max(0.1, legLen)));
  let time = 0, walk = 0, swim = 0;
  const gait = spring(), fly = spring(), breath = spring(), bank = spring(), pitch = spring(), steer = spring();
  const tailLag = tail.map(() => spring());
  let prevYaw = null, prevAlt = null;
  const body = [...spine, ...tail]; // the undulating body (neck handled separately)
  // Jaw: rigged in Blender (art/blender/boss_animations.blend). Flight clips animate it themselves; on the ground
  // it opens through the breath stream and snaps open on each fireball. Opening = -angle about SIDE.
  const jaw = bones.Jaw, jawOpen = spring();
  let lastRoll = 0, lastNose = 0;

  return {
    ok: tail.length > 0 || spine.length > 0,
    /** Re-apply flight banking/pitch on top of an authored clip blended in with weight w (clipLayer.js). */
    post(w) {
      if (!root || w <= 0) return;
      rotWorld(root, _fwd, lastRoll * w); rotWorld(root, _side, lastNose * w);
    },
    /** s = { moving, speed, action, actionT, altitude, yaw } from the boss sim state */
    update(dt, s) {
      dt = Math.min(dt, 0.05);
      if (dt <= 0) return;
      time += dt;
      for (const [b, q] of bind) b.quaternion.copy(q);
      ch.root.updateMatrixWorld(true);
      ch.root.getWorldQuaternion(_rootQ);
      _up.set(0, 1, 0);
      _side.set(1, 0, 0).applyQuaternion(_rootQ);
      _fwd.set(0, 0, 1).applyQuaternion(_rootQ);

      const flying = springTo(fly, (s.altitude || 0) > 0.4 ? 1 : 0, 0.18, dt);
      const g = springTo(gait, s.moving && flying < 0.5 ? 1 : 0, 0.1, dt) * (1 - flying);
      const yawRate = prevYaw === null ? 0 : wrapAngle(s.yaw - prevYaw) / dt; prevYaw = s.yaw;
      const vy = prevAlt === null ? 0 : ((s.altitude || 0) - prevAlt) / dt; prevAlt = s.altitude || 0;
      // whole-body attitude: bank into turns and pitch with climbs/dives while flying
      const roll = springTo(bank, Math.max(-0.5, Math.min(0.5, -yawRate * 0.35)) * flying, 0.2, dt);
      const nose = springTo(pitch, Math.max(-0.45, Math.min(0.45, -vy * 0.09)) * flying, 0.25, dt);
      if (root) { rotWorld(root, _fwd, roll); rotWorld(root, _side, nose); }
      lastRoll = roll; lastNose = nose;

      // ---- ground walk: speed-matched duty-factor cycle ----
      walk += gaitAdvance(g > 0.05 ? (s.speed || 0) : 0, stepLen, dt);
      const cyc = walk / (2 * Math.PI);
      // trunk: standing-wave side bend (C-curve between still shoulders and hips), toward the reaching fore leg
      const bend = Math.sin(walk) * 0.09 * g;
      const shape = [1, 0.5, -0.5, -1];
      spine.forEach((b, i) => rotWorld(b, _up, bend * (shape[i] ?? 0)));
      if (root && g > 0.01) rotWorld(root, _side, Math.abs(Math.cos(walk)) * 0.025 * g); // body dips per footfall

      // ---- flight: backward-travelling body wave, amplitude growing toward the tail ----
      const flySpeed = s.speed || 0;
      swim += dt * (2.4 + 0.12 * flySpeed) * flying + dt * 2.0 * (1 - flying);
      const steerBend = springTo(steer, Math.max(-0.4, Math.min(0.4, yawRate * 0.25)) * flying, 0.2, dt);
      const n = body.length, waveStep = (2 * Math.PI) / (0.7 * n); // ~0.7 body lengths per wave
      let trunkHeading = 0; // accumulated sideways rotation, cancelled by the neck
      body.forEach((b, i) => {
        const s01 = n > 1 ? i / (n - 1) : 0;
        const amp = 0.3 * Math.exp(s01 - 1) * flying; // a(s) = a_max e^(s-1)
        const lat = Math.sin(swim - i * waveStep) * amp + (steerBend / n) + (i < spine.length ? 0 : 0.02 * Math.sin(time * 2 - i) * (1 - flying));
        const ver = Math.sin(swim * 0.8 - i * waveStep + 1.2) * 0.08 * flying * (0.4 + s01);
        rotWorld(b, _up, lat); rotWorld(b, _side, ver);
        if (i < spine.length) trunkHeading += lat;
      });
      // ---- tail: follow-through on turns (each segment lags a little more) + gentle ground sweep ----
      tail.forEach((b, i) => {
        const lag = springTo(tailLag[i], -yawRate * 0.06 * (i + 1) / tail.length, 0.08 + i * 0.05, dt);
        rotWorld(b, _up, lag + Math.sin(time * 2.4 - i * 0.75) * (0.08 + 0.08 * g) * (1 - flying));
      });

      // ---- neck/head: cancel the trunk's sway so the head stays on target; breath/fireball poses; bob ----
      const want = s.action === 'breath' ? (s.actionT < 0.7 ? -1 : 1) : s.action === 'fireballs' ? 0.6 : s.action === 'fly' ? 0.35 : 0;
      const bp = springTo(breath, want, 0.1, dt);
      neck.forEach((b, i) => {
        if (i === 0) rotWorld(b, _up, -trunkHeading * 0.9 - bend * 0.5);
        rotWorld(b, _side, Math.sin(time * 1.6 - i * 0.5) * 0.04 * (1 - g) + Math.sin(walk * 2) * 0.03 * g + bp * 0.12);
      });

      // ---- legs: duty-factor walk; in flight folded back and paddling with the wave ----
      for (const l of legs) {
        if (!l.bones.length) continue;
        const c = legCycle(cyc + l.off, DUTY);
        const swing = c.swing * sweep * g, lift = c.lift * g;
        const paddle = Math.sin(swim + l.off * 2 * Math.PI + (l.front ? 0 : 1.6)) * 0.45 * flying;
        const tuck = flying * (l.front ? 0.7 : 0.95);
        rotWorld(l.bones[0], _side, swing + tuck + paddle); // + swings forward on this rig (its head is at -X)
        // hind knees bend the other way from the elbows, so their lift goes the opposite direction
        if (l.bones[1]) rotWorld(l.bones[1], _side, lift * (l.front ? 1.0 : -1.0) + flying * (l.front ? -0.9 : 0.4) - paddle * 0.6);
        if (l.bones[2]) rotWorld(l.bones[2], _side, flying * 0.4 + paddle * 0.4 + lift * 0.4);
      }

      // ---- jaw: breath stream holds it open, each ground fireball snaps it open; idle breathing otherwise ----
      if (jaw) {
        let open = 0.03 + Math.max(0, Math.sin(time * 1.3)) * 0.04;
        if (s.action === 'breath') {
          const tel = (def.breath && def.breath.telegraph) || 0.7;
          open = s.actionT < tel ? 0.14 * (s.actionT / tel) : 0.42 + Math.sin(time * 23) * 0.03;
        } else if (s.action === 'fireballs') {
          const n = (def.fireball && def.fireball.count) || 3;
          let m = 0;
          for (let i = 0; i < n; i++) { const d = s.actionT - (0.4 + i * 0.45); m = Math.max(m, d < 0 ? 1 + d / 0.2 : 1 - d / 0.25); }
          open = 0.08 + 0.36 * Math.max(0, Math.min(1, m));
        } else if (s.action === 'tailSwipe') open = 0.16;
        rotWorld(jaw, _side, -springTo(jawOpen, open, 0.04, dt));
      }
    },
  };
}
