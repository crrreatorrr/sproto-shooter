// Cached static data for a level. Not part of GameState, so hashes skip it.
// Spatial grid (C-M1) and nav (C-M3) stay empty until those milestones.
import { getLevelData } from '../../data/levels/index.js';
import { flattenGeometry, validateLevel } from '../../data/levels/kit.js';

const cache = new Map();

function yawRad(yaw) {
  return ((yaw || 0) * Math.PI) / 180;
}

function aabbOfBox(g) {
  const [cx, cy, cz] = g.at;
  const hx = g.size[0] / 2, hy = g.size[1] / 2, hz = g.size[2] / 2;
  const th = yawRad(g.yaw);
  const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  const ex = c * hx + s * hz;
  const ez = s * hx + c * hz;
  return { min: [cx - ex, cy - hy, cz - ez], max: [cx + ex, cy + hy, cz + ez] };
}

function aabbOfCylinder(g) {
  return {
    min: [g.at[0] - g.r, g.at[1], g.at[2] - g.r],
    max: [g.at[0] + g.r, g.at[1] + g.h, g.at[2] + g.r],
  };
}

function aabbOfTerrain(g) {
  const amp = g.noise && g.noise.amp ? g.noise.amp : 0;
  let extra = amp;
  for (const stamp of g.raise || []) extra = Math.max(extra, stamp.h || 0);
  return {
    min: [g.origin[0], g.origin[1], g.origin[2]],
    max: [g.origin[0] + g.size[0], g.origin[1] + extra, g.origin[2] + g.size[1]],
  };
}

function compileCollider(g) {
  const c = { ...g };
  if (g.at) c.at = g.at.slice();
  if (g.size) c.size = g.size.slice();
  if (g.origin) c.origin = g.origin.slice();
  if (g.kind === 'box' || g.kind === 'ramp') {
    c.yawRad = yawRad(g.yaw);
    c.aabb = aabbOfBox(g);
    if (g.kind === 'ramp') c.slopeDeg = Math.atan2(g.size[1], g.size[2]) * 180 / Math.PI;
  } else if (g.kind === 'cylinder') {
    c.aabb = aabbOfCylinder(g);
  } else if (g.kind === 'terrain') {
    const cols = Math.floor(g.size[0] / g.cell) + 1;
    const rows = Math.floor(g.size[1] / g.cell) + 1;
    c.cols = cols;
    c.rows = rows;
    c.heights = null;
    c.aabb = aabbOfTerrain(g);
  }
  return c;
}

function compile(level) {
  const colliders = flattenGeometry(level.geometry).map(compileCollider);
  const triggers = [...(level.volumes || [])];
  for (const enc of level.encounters || []) if (enc.activate) triggers.push(enc.activate);
  return {
    id: level.id,
    legacy: !!level.legacy,
    radius: level.legacy ? level.radius : null,
    bounds: level.bounds,
    colliders,
    heightfields: colliders.filter((c) => c.kind === 'terrain'),
    spatial: null,
    nav: null,
    triggers,
    spawners: level.spawners || [],
    encounterZones: (level.encounters || []).map((e) => ({ id: e.id, zone: e.zone || null })),
  };
}

/** Compile one level object. Does not touch the cache. Throws if validation fails. */
export function buildLevelRuntime(level) {
  const report = validateLevel(level);
  if (!report.ok) {
    const err = new Error(`level ${level && level.id} invalid: ${report.errors.join('; ')}`);
    err.report = report;
    throw err;
  }
  return compile(level);
}

/** Build static level data once per id. The returned object is never mutated. */
export function getLevelRuntime(levelId = 'arena') {
  const id = levelId || 'arena';
  const hit = cache.get(id);
  if (hit) return hit;
  const runtime = buildLevelRuntime(getLevelData(id));
  cache.set(id, runtime);
  return runtime;
}

export function isLegacyArena(state) {
  const id = state && state.level && state.level.id;
  return !id || id === 'arena';
}

export function resetLevelRuntimeForTests() {
  cache.clear();
}
