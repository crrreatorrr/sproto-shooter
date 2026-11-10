// Chase camera and aim convergence for the free arena (SHOOTER-S3). Pure: no Three, no DOM.
//
// The view is a third-person chase camera, so the crosshair (the screen centre) looks along the
// camera ray, not along the shooter's eye. The server traces from the shooter's eye
// (eyeHeight above its feet), so sending the look angles would land shots above or below the
// crosshair. Instead cast the crosshair ray from the camera, find what it meets past the
// player (the opponent's drawn capsule, the floor, the arena wall, or max range) and send the
// yaw/pitch from the eye to that point. The camera is straight behind the player, so the yaw
// stays the look yaw (movement is unchanged); only the pitch converges.
import { TUNING } from '../../data/tuning.js';
import { rayCapsule } from '../../sim/pvp/hit.js';
import { ARENA_SOLIDS, ARENA_WALL_H } from '../../sim/pvp/arena.js';
import { firstSolid } from '../../sim/campaign/solids.js';

export const CAM = Object.freeze({ back: 11, up: 5.5, ahead: 8, eye: 1.1 });
/** Crosshair rays that meet nothing converge at this range. */
export const AIM_RANGE_M = 120;

/**
 * Chase camera from the LOCAL look (the yaw and pitch this client is sending), not the server's
 * echo of it, which arrives a round trip late. Pitch tilts the view; at pitch 0 this is the
 * original level chase camera.
 */
export function chaseCamera(me, yaw, pitch = 0) {
  const p = Math.max(-1.5, Math.min(1.5, Number.isFinite(pitch) ? pitch : 0));
  const y = Number.isFinite(yaw) ? yaw : 0;
  const cp = Math.cos(p);
  const dx = -Math.sin(y) * cp;
  const dy = Math.sin(p);
  const dz = -Math.cos(y) * cp;
  return {
    position: {
      x: me.x - dx * CAM.back,
      y: Math.max(me.y + 0.3, me.y + CAM.up - dy * CAM.back),
      z: me.z - dz * CAM.back,
    },
    target: {
      x: me.x + dx * CAM.ahead,
      y: me.y + CAM.eye + dy * CAM.ahead,
      z: me.z + dz * CAM.ahead,
    },
  };
}

function unit(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Distance along a unit ray from `o` to the inside of the arena wall (a vertical cylinder). */
function wallDistance(o, d, radius) {
  const A = d.x * d.x + d.z * d.z;
  if (A < 1e-9) return Infinity;
  const B = o.x * d.x + o.z * d.z;
  const C = o.x * o.x + o.z * o.z - radius * radius;
  const disc = B * B - A * C;
  if (disc < 0) return Infinity;
  const t = (-B + Math.sqrt(disc)) / A;
  return t > 0 ? t : Infinity;
}

/**
 * The crosshair ray's aim point and the eye-to-point yaw/pitch.
 * `me` is the drawn local player (feet), `look` the local {yaw, pitch}, `opponent` the drawn
 * opponent (feet) or null.
 */
export function convergeAim(me, look, opponent = null) {
  const cam = chaseCamera(me, look.yaw, look.pitch);
  const o = cam.position;
  const d = unit({ x: cam.target.x - o.x, y: cam.target.y - o.y, z: cam.target.z - o.z });
  // Only what lies past the player counts (the camera sits behind it).
  const past = (me.x - o.x) * d.x + (me.y + TUNING.eyeHeight - o.y) * d.y + (me.z - o.z) * d.z;
  let t = past + AIM_RANGE_M;
  let hit = 'range';
  if (opponent && opponent.alive !== false) {
    const tp = rayCapsule(o, d, opponent.x, opponent.z, opponent.y, opponent.y + TUNING.playerHeight, TUNING.playerRadius);
    if (tp > past && tp < t) { t = tp; hit = 'player'; }
  }
  if (d.y < -1e-6) {
    const tg = -o.y / d.y;
    if (tg > past && tg < t) { t = tg; hit = 'ground'; }
  }
  const cover = firstSolid(ARENA_SOLIDS, o, d, t, null, true);
  if (cover && cover.t > past && cover.t < t) { t = cover.t; hit = 'solid'; }
  const tw = wallDistance(o, d, TUNING.arenaRadius);
  if (tw > past && tw < t) {
    const y = o.y + d.y * tw;
    if (y >= 0 && y <= ARENA_WALL_H) { t = tw; hit = 'wall'; }
  }
  const point = { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t };
  const eye = { x: me.x, y: me.y + TUNING.eyeHeight, z: me.z };
  const dx = point.x - eye.x;
  const dy = point.y - eye.y;
  const dz = point.z - eye.z;
  const flat = Math.hypot(dx, dz);
  // A point straight above or below the eye keeps the look yaw.
  const yaw = flat > 1e-6 ? Math.atan2(-dx, -dz) : look.yaw;
  const pitch = Math.max(-1.5, Math.min(1.5, Math.atan2(dy, flat)));
  return { yaw, pitch, point, hit, eye, camera: cam };
}
