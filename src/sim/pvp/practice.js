// Deterministic practice opponent. Inputs only. It never declares a winner.
import { yawTo } from '../../core/math.js';

export function practiceWish(tick, self, other) {
  const yaw = yawTo(
    { x: self.x, z: self.z },
    { x: other.x, z: other.z },
  );
  return {
    yaw,
    pitch: 0,
    moveX: 0,
    moveZ: tick % 120 < 90 ? 1 : 0,
    fire: tick % 24 < 10,
    zoom: true,
    sprint: false,
    jump: false,
    dash: false,
    reload: false,
    slot: 0,
  };
}

/**
 * A practice opponent that uses the whole movement kit: it strafes on a 1.5 s beat, picks its gun by
 * range (shotgun close, sniper far), jumps and dashes on some beats, and sprints, slides and grapples
 * to close a long gap. Same contract as practiceWish: inputs only, a pure function of the tick and the
 * two players, so a practice match stays deterministic. practiceWish is kept as it is for the network
 * tests and the two-bot demo, which are measured against its exact inputs.
 */
export function practiceBotWish(tick, self, other) {
  const dist = Math.hypot(other.x - self.x, other.z - self.z);
  // Its aim sways about a body width at mid range, so it lands some shots and misses others. A perfect
  // aim (what practiceWish has) wins in three seconds and teaches nothing.
  const sway = 0.045 * Math.sin(tick * 0.37) + 0.03 * Math.sin(tick * 0.113 + 1);
  const yaw = yawTo({ x: self.x, z: self.z }, { x: other.x, z: other.z }) + sway;
  const pitch = Math.atan2(((other.y || 0) + 1.0) - ((self.y || 0) + 1.6), Math.max(0.5, dist));
  const beat = Math.floor(tick / 45); // 1.5 s at 30 ticks a second
  const phase = tick % 45;
  const h = Math.imul(beat + 1, 0x9e3779b1) >>> 0; // which way and what trick this beat
  const far = dist > 26;
  const slot = dist < 9 ? 1 : dist > 32 ? 2 : 0;
  return {
    yaw,
    pitch,
    moveX: h & 1 ? 1 : -1,
    moveZ: far ? 1 : dist < 7 ? -1 : 0.35,
    fire: tick % 30 < 16,
    zoom: !far,
    sprint: far && phase < 22,
    jump: ((h >>> 3) & 3) === 0 && phase === 8,
    dash: ((h >>> 5) % 3) === 0 && phase === 30,
    slide: far && phase === 21,
    grapple: far && ((h >>> 8) % 3) === 0 && phase >= 2 && phase < 20,
    reload: false,
    slot,
  };
}
