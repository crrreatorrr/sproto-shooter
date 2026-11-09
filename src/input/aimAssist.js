// Gamepad aim assist: look slowdown near enemies and a light pull toward the head while aiming.
// Pure: reads sim state, never writes it. It only bends the yaw/pitch the pad feeds into the Command,
// so the sim, its hit tests and the run log see an ordinary aim. Keyboard and mouse never call this.
import { AIM_ASSIST } from '../data/gamepad.js';
import { worldHitboxes } from '../sim/collision.js';
import { angleWrap, deg } from '../core/math.js';

const _hbs = [];

/**
 * Assist targets for one player: every live enemy's body centre and head (its `weak` sphere; the top of
 * the body when it has none). Returns [{ center, head, r }].
 */
export function assistTargets(state, out = []) {
  out.length = 0;
  for (const e of state.enemies) {
    if (e.dead || e.state === 'spawning') continue;
    worldHitboxes(e, _hbs);
    let body = null, head = null;
    for (const hb of _hbs) {
      if (hb.zone === 'weak' && hb.type === 'sphere' && !head) head = { x: hb.x, y: hb.y, z: hb.z };
      else if (hb.zone === 'body' && !body) body = hb;
    }
    if (!body && !head) continue;
    let center, r;
    if (body && body.type === 'capsule') { center = { x: body.x, y: (body.y0 + body.y1) / 2, z: body.z }; r = Math.max(body.r, (body.y1 - body.y0) / 2); }
    else if (body) { center = { x: body.x, y: body.y, z: body.z }; r = body.r; }
    else { center = head; r = 0.3; }
    if (!head) head = body && body.type === 'capsule' ? { x: body.x, y: body.y1 - body.r, z: body.z } : center;
    out.push({ center, head, r });
  }
  return out;
}

/** Yaw/pitch that look from `eye` at `p` (same convention as dirFromYawPitch). */
export function lookAngles(eye, p) {
  const dx = p.x - eye.x, dy = p.y - eye.y, dz = p.z - eye.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), dist: Math.hypot(dx, dy, dz) };
}

/** Angular error between the aim and a look direction: { err, dYaw, dPitch } (dYaw is wrapped). */
function angErr(yaw, pitch, a) {
  const dYaw = angleWrap(a.yaw - yaw), dPitch = a.pitch - pitch;
  return { err: Math.hypot(dYaw * Math.cos(a.pitch), dPitch), dYaw, dPitch };
}

/**
 * One frame of aim assist.
 * @param {object} o
 * @param {{x:number,y:number,z:number}} o.eye
 * @param {number} o.yaw
 * @param {number} o.pitch
 * @param {Array<{center:object, head:object, r:number}>} o.targets
 * @param {boolean} o.aiming  LT held
 * @param {number} o.input  0..1, how hard the player is steering (look or move stick)
 * @param {number} o.dt  seconds
 * @param {number} [o.strength]  the player's setting (0 = off)
 * @param {number} [o.range]  the gun's reach in metres
 * @returns {{ slow: number, dYaw: number, dPitch: number, target: number }}
 *   `slow` multiplies the stick's look speed; dYaw/dPitch are added to the view this frame.
 */
export function aimAssist(o, cfg = AIM_ASSIST) {
  const none = { slow: 1, dYaw: 0, dPitch: 0, target: -1 };
  const k = (o.strength ?? 1) * cfg.strength;
  if (!cfg.enabled || !(k > 0) || !o.targets || !o.targets.length) return none;
  const maxRange = Math.min(cfg.maxRange, o.range > 0 ? o.range : cfg.maxRange);
  let best = -1, bestScore = 1, bestHead = null;
  for (let i = 0; i < o.targets.length; i++) {
    const t = o.targets[i];
    const c = lookAngles(o.eye, t.center);
    if (c.dist < cfg.minRange || c.dist > maxRange) continue;
    const cone = Math.min(deg(cfg.maxConeDeg), Math.max(deg(cfg.minConeDeg), Math.atan((t.r + cfg.marginM) / c.dist)));
    const h = lookAngles(o.eye, t.head);
    const ec = angErr(o.yaw, o.pitch, c), eh = angErr(o.yaw, o.pitch, h);
    const score = Math.min(ec.err, eh.err) / cone;
    if (score < bestScore) { bestScore = score; best = i; bestHead = { ...eh, cone }; }
  }
  if (best < 0) return none;
  const close = 1 - bestScore; // 1 at the centre, 0 at the cone's edge
  const slow = Math.max(cfg.minSlow, 1 - k * (o.aiming ? cfg.slowAds : cfg.slowHip) * close);
  if (!o.aiming || bestHead.err < 1e-5) return { slow, dYaw: 0, dPitch: 0, target: best };
  const steering = Math.min(1, Math.max(0, o.input || 0));
  const rate = deg(cfg.pullDegPerSec) * k * close * (cfg.pullIdleScale + (1 - cfg.pullIdleScale) * steering);
  const step = Math.min(bestHead.err, rate * Math.max(0, o.dt || 0));
  const f = step / bestHead.err;
  return { slow, dYaw: bestHead.dYaw * f, dPitch: bestHead.dPitch * f, target: best };
}
