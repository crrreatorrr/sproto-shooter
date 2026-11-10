// Free-arena solids. Both seats share this list. A grapple hook lands on these
// pillars or the boundary wall, and nowhere else: not the floor, not the other player.
import { TUNING } from '../../data/tuning.js';
import { firstSolid } from '../campaign/solids.js';

/** How high the boundary wall can be hooked. Above this the rim is air. */
export const ARENA_WALL_H = 12;

function box(id, x, z, hx, hy, hz) {
  return Object.freeze({
    id,
    kind: 'box',
    min: Object.freeze([x - hx, 0, z - hz]),
    max: Object.freeze([x + hx, hy, z + hz]),
  });
}

// Four pillars, identical under a half turn, and off the seed-7 duel line.
export const ARENA_SOLIDS = Object.freeze([
  box('ne', 14, 14, 1.1, 10, 1.1),
  box('nw', -14, 14, 1.1, 10, 1.1),
  box('se', 14, -14, 1.1, 10, 1.1),
  box('sw', -14, -14, 1.1, 10, 1.1),
]);

/** First hit on the inside of the arena wall, or null when the ray misses the rim. */
export function rayArenaWall(origin, dir, maxDist) {
  const radius = TUNING.arenaRadius;
  const A = dir.x * dir.x + dir.z * dir.z;
  if (A < 1e-8) return null;
  const B = origin.x * dir.x + origin.z * dir.z;
  const C = origin.x * origin.x + origin.z * origin.z - radius * radius;
  const disc = B * B - A * C;
  if (disc < 0) return null;
  const t = (-B + Math.sqrt(disc)) / A;
  if (!(t >= 0.4) || t > maxDist) return null;
  const y = origin.y + dir.y * t;
  if (y < 0 || y > ARENA_WALL_H) return null;
  return {
    t,
    x: origin.x + dir.x * t,
    y,
    z: origin.z + dir.z * t,
    id: 'wall',
  };
}

/** Closest grapple anchor on a pillar or the wall. Never the floor. */
export function arenaHook(origin, dir) {
  const maxDist = TUNING.grappleRange;
  let best = null;
  const solid = firstSolid(ARENA_SOLIDS, origin, dir, maxDist, null, true);
  if (solid) {
    best = {
      t: solid.t,
      x: origin.x + dir.x * solid.t,
      y: origin.y + dir.y * solid.t,
      z: origin.z + dir.z * solid.t,
      id: solid.solid.id,
    };
  }
  const wall = rayArenaWall(origin, dir, maxDist);
  if (wall && (!best || wall.t < best.t)) best = wall;
  if (!best) return null;
  return { x: best.x, y: best.y, z: best.z, id: best.id };
}

/** True when a pillar face sits on the segment, ignoring the anchor itself. */
export function arenaOccludes(origin, dir, maxDist, ignoreId) {
  const hit = firstSolid(ARENA_SOLIDS, origin, dir, maxDist, (s) => s.id !== ignoreId, true);
  return !!hit;
}
