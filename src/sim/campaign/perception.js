// Line of sight, cover and alert. An enemy with no ai.alert keeps today's chase behaviour.
import { activeSolids, raySolids } from './solids.js';

const blocksSight = (s) => s.sight !== false;

export function hasLOS(state, from, to, max = 80) {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.05) return true;
  if (dist > max) return false;
  const solids = activeSolids(state);
  if (!solids) return true;
  const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
  const hit = raySolids(solids, from, dir, dist, blocksSight);
  return hit < 0 || hit > dist - 0.25;
}

/** Solids within radius of a point. A level uses this to ask "is there cover here?". */
export function coverNear(solids, x, z, radius = 1.6) {
  const ids = [];
  if (!solids) return ids;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    const cx = Math.max(s.min[0], Math.min(x, s.max[0]));
    const cz = Math.max(s.min[2], Math.min(z, s.max[2]));
    if (Math.hypot(x - cx, z - cz) <= radius) ids.push(s.id);
  }
  return ids;
}

/**
 * Unaware enemies stand still until they see the player or hear a shot.
 * Returns true when the enemy should chase.
 */
export function sensePlayer(state, e, target) {
  if (!e.ai.alert || e.ai.alert === 'alerted') return true;
  const sight = e.ai.sight || 28;
  const dx = target.pos.x - e.pos.x, dz = target.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const from = { x: e.pos.x, y: e.pos.y + e.height * 0.8, z: e.pos.z };
  const to = { x: target.pos.x, y: target.pos.y + 1.2, z: target.pos.z };
  let wake = dist <= sight && hasLOS(state, from, to);
  if (!wake) {
    const hear = e.ai.hearing || 16;
    for (let i = 0; i < state.events.length; i++) {
      if (state.events[i].type === 'shot' && dist <= hear) { wake = true; break; }
    }
  }
  if (!wake) return false;
  e.ai.alert = 'alerted';
  return true;
}
