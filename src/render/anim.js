// Shared helpers for code-driven boss animation (humanoidRig.js, dragonRig.js).
// Sources: Daniel Holden, "Spring-It-On" (theorangeduck.com) for the exact critically damped spring;
// Dark Souls 3 / God of War attack breakdowns (Game Developer) for the attack timing envelope;
// Usherwood & Self Davies 2017 (eLife) for reptile gait numbers.
import * as THREE from 'three';

const LN2 = Math.LN2;

/**
 * Exact critically damped spring (frame-rate independent), parameterised by half-life: the time it takes
 * to close half the distance to the goal. Mutates and returns state { x, v }.
 */
export function springTo(st, goal, halflife, dt) {
  const y = (2 * LN2) / Math.max(1e-4, halflife);
  const j0 = st.x - goal, j1 = st.v + j0 * y, e = Math.exp(-y * dt);
  st.x = e * (j0 + j1 * dt) + goal;
  st.v = e * (st.v - j1 * y * dt);
  return st.x;
}
export const spring = () => ({ x: 0, v: 0 });

/** Frame-rate independent exponential smoothing (a damper) by half-life. */
export const damp = (x, goal, halflife, dt) => x + (goal - x) * (1 - Math.exp((-LN2 * dt) / Math.max(1e-4, halflife)));

export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const easeIn = (t) => { t = clamp01(t); return t * t * t; }; // accelerate into contact
export const easeOut = (t) => { t = clamp01(t); return 1 - (1 - t) ** 3; }; // settle out of a move
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Attack envelope for a telegraphed boss strike that connects at `w` seconds:
 *   windup (eases into the cocked pose, reaches it at 75% of w and HOLDS: the readable tell),
 *   strike (the last STRIKE seconds before contact; accelerating ease-in, never easing out into the hit),
 *   impact hold (stays extended briefly), then recovery (eases back out: the punish window).
 * Returns { wind: 0..1 (how cocked), hit: 0..1 (how far into the strike), rec: 0..1 (how recovered) }.
 */
export const STRIKE = 0.12, IMPACT_HOLD = 0.22;
export function attackEnvelope(t, w, recover) {
  const strikeStart = Math.max(0.05, w - STRIKE);
  const wind = t < strikeStart ? smoothstep(t / (strikeStart * 0.75)) : 1;
  const hit = t < strikeStart ? 0 : easeIn((t - strikeStart) / STRIKE);
  const rec = easeOut((t - w - IMPACT_HOLD) / Math.max(0.1, recover - IMPACT_HOLD));
  return { wind, hit, rec };
}

/** World-space bone rotation about an axis (independent of the bone's local axis convention). */
const _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
export function rotWorld(bone, axis, angle) {
  if (!bone || !angle) return;
  _q.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(_wq).premultiply(_q);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}

/**
 * Gait phase advance tied to ground speed so feet don't slide: one full cycle covers two steps of
 * `stepLen` metres. Returns radians to add this frame.
 */
export const gaitAdvance = (speed, stepLen, dt) => (Math.PI * speed * dt) / Math.max(0.1, stepLen);

/**
 * Leg swing for one leg in a walk with duty factor `duty` (share of the cycle the foot is planted):
 * stance sweeps the leg back slowly, swing brings it forward quickly. p = cycle position 0..1.
 * Returns { swing: -1..1 (forward +), lift: 0..1 (foot raised during swing) }.
 */
export function legCycle(p, duty) {
  p = ((p % 1) + 1) % 1;
  if (p < duty) return { swing: 1 - 2 * (p / duty), lift: 0 };
  const s = (p - duty) / (1 - duty);
  return { swing: -1 + 2 * smoothstep(s), lift: Math.sin(Math.PI * s) };
}

// Approximate sole clearance for procedural poses. The bind sole is fitted to the floor by
// assets.js. A relative probe follows the ankle/toe without evaluating the skinned mesh every frame.
const _sole = new THREE.Vector3();
export function groundProbe(feet) {
  if (!feet.length) return () => 0;
  const bottom = () => {
    let y = Infinity;
    for (const foot of feet) y = Math.min(y, foot.getWorldPosition(_sole).y);
    return y;
  };
  const rest = bottom();
  return (baseY, scale, maxLift) => Math.min(maxLift, Math.max(0, rest + baseY - bottom()) / Math.max(0.01, scale));
}
