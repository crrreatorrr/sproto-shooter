// Level authoring helpers. Pure data. Seeded hashes only.
// Lengths are metres. Yaw is degrees, about Y, 0 facing +Z (local +Z rotates toward +X).
// `at` for a box or ramp is the centre of its bounds. `at` for a cylinder is the base centre.

function num(v) { return typeof v === 'number' && Number.isFinite(v); }

function localOffset(at, yawDeg, lx, ly, lz) {
  const th = (yawDeg || 0) * Math.PI / 180;
  const c = Math.cos(th), s = Math.sin(th);
  return [at[0] + lx * c + lz * s, at[1] + ly, at[2] - lx * s + lz * c];
}

/** Deterministic unit float in [0, 1) from an integer seed and a channel. */
function unit(seed, channel) {
  let x = (seed | 0) ^ Math.imul(channel | 0, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function box({ id, at, size, yaw = 0, mat = 'stone', tag } = {}) {
  return { kind: 'box', id, at: at.slice(), size: size.slice(), yaw, mat, tag };
}

export function ramp({ id, at, size, yaw = 0, mat = 'stone', tag } = {}) {
  return { kind: 'ramp', id, at: at.slice(), size: size.slice(), yaw, mat, tag };
}

/** Collides as a ramp. `steps` is visual only (C-M2). */
export function stairs({ id, at, size, yaw = 0, steps, mat = 'stone', tag } = {}) {
  const n = steps ?? Math.max(2, Math.round(size[2] / 0.3));
  return { ...ramp({ id, at, size, yaw, mat, tag }), visual: 'stairs', steps: n };
}

export function cylinder({ id, at, r, h, mat = 'pillar', tag } = {}) {
  return { kind: 'cylinder', id, at: at.slice(), r, h, mat, tag };
}

/**
 * Heightfield descriptor. The grid is sampled later (C-M1); this stores the seeded recipe only.
 */
export function terrain({ id, origin, size, cell = 2, seed, noise = {}, flatten = [], raise = [], carve = [], mat = 'rock' } = {}) {
  return {
    kind: 'terrain', id, origin: origin.slice(), size: size.slice(), cell, seed,
    noise: { amp: noise.amp ?? 0, freq: noise.freq ?? 0.02, octaves: noise.octaves ?? 1 },
    flatten: flatten.map((s) => ({ ...s, center: s.center.slice() })),
    raise: raise.map((s) => ({ ...s, center: s.center.slice() })),
    carve: carve.map((s) => ({ ...s, center: s.center.slice() })),
    mat,
  };
}

export function killPlane({ id = 'kill', y = -20 } = {}) {
  return { kind: 'killPlane', id, y };
}

export function lavaZone({ id, min, max, dps = 25 } = {}) {
  return { kind: 'lava', id, min: min.slice(), max: max.slice(), dps };
}

export function ropeBridge({ id, from, to, width = 2, collapseOn, mat = 'wood' } = {}) {
  return { kind: 'ropeBridge', id, from: from.slice(), to: to.slice(), width, collapseOn, mat };
}

export function spawner({ id, at, kind = 'placed' } = {}) {
  return { id, at: at.slice(), kind };
}

export function rack({ id, at, gun, why } = {}) {
  return { kind: 'rack', id, at: at.slice(), gun, why };
}

export function ammoCrate({ id, at, ammo } = {}) {
  return { kind: 'ammo', id, at: at.slice(), ammo: ammo ? ammo.slice() : [] };
}

export function checkpoint({ id, at, when } = {}) {
  return { kind: 'checkpoint', id, at: at.slice(), when };
}

export function trigger(o = {}) {
  return { kind: 'trigger', ...o };
}

export function encounter(o = {}) {
  return { ...o, squads: (o.squads || []).map((s) => ({ ...s, units: s.units ? s.units.map((u) => ({ ...u })) : [] })) };
}

export function squad(o = {}) {
  return { ...o, units: (o.units || []).map((u) => ({ ...u })) };
}

export function S(type, count = 1) {
  return { type, count };
}

export function botRoute(steps) {
  return steps.map((step) => step.slice());
}

function group(id, parts) {
  return { kind: 'group', id, parts };
}

function segmentFrame(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[2] + b[2]) / 2;
  return { dx, dy, dz, len, yaw, cx, cz, y0: a[1], y1: b[1] };
}

function floorPiece(id, a, b, width, mat) {
  const seg = segmentFrame(a, b);
  if (seg.len < 0.5) return [];
  const rise = seg.y1 - seg.y0;
  if (Math.abs(rise) >= 0.5) {
    const up = rise > 0;
    const yaw = up ? seg.yaw : seg.yaw + 180;
    return [ramp({
      id, mat,
      at: [seg.cx, (seg.y0 + seg.y1) / 2, seg.cz],
      size: [width, Math.abs(rise), seg.len],
      yaw,
    })];
  }
  const y = (seg.y0 + seg.y1) / 2;
  return [box({ id, mat, at: [seg.cx, y - 0.25, seg.cz], size: [width, 0.5, seg.len], yaw: seg.yaw })];
}

function sideWalls(id, a, b, width, height, mat, sides) {
  const seg = segmentFrame(a, b);
  if (seg.len < 0.5) return [];
  const yBase = Math.min(seg.y0, seg.y1);
  const yTop = Math.max(seg.y0, seg.y1) + height;
  const wallH = Math.max(0.5, yTop - yBase);
  const cy = yBase + wallH / 2;
  const side = width / 2 + 0.25;
  const parts = [];
  const place = (suffix, sign) => {
    const at = localOffset([seg.cx, cy, seg.cz], seg.yaw, sign * side, 0, 0);
    parts.push(box({ id: id + suffix, mat, at, size: [0.5, wallH, seg.len], yaw: seg.yaw }));
  };
  if (sides.left) place('-l', -1);
  if (sides.right) place('-r', 1);
  return parts;
}

export function corridor(path, width, height, opt = {}) {
  const id = opt.id || 'corridor';
  const mat = opt.mat || 'stone';
  const parts = [];
  for (let i = 0; i < path.length - 1; i++) {
    parts.push(...floorPiece(`${id}-floor-${i}`, path[i], path[i + 1], width, mat));
    parts.push(...sideWalls(`${id}-wall-${i}`, path[i], path[i + 1], width, height, mat, { left: true, right: true }));
    if (opt.roof) {
      const seg = segmentFrame(path[i], path[i + 1]);
      if (seg.len >= 0.5) {
        const y = Math.max(seg.y0, seg.y1) + height + 0.25;
        parts.push(box({
          id: `${id}-roof-${i}`, mat, yaw: seg.yaw,
          at: [seg.cx, y, seg.cz],
          size: [width + 1, 0.5, seg.len],
        }));
      }
    }
  }
  return group(id, parts);
}

function splitWall(wall, door, axis) {
  if (!door) return [wall];
  const [sx, sy, sz] = wall.size;
  const span = axis === 'x' ? sx : sz;
  const thick = axis === 'x' ? sz : sx;
  const gap = Math.min(door.width ?? 2, Math.max(0.5, span - 1));
  const doorH = Math.min(door.height ?? 2.5, Math.max(0.5, sy - 0.5));
  const half = gap / 2;
  const limit = span / 2 - half - 0.5;
  let centerOff = ((door.u ?? 0.5) - 0.5) * span;
  if (!(limit > 0)) centerOff = 0;
  else centerOff = Math.max(-limit, Math.min(limit, centerOff));
  const left = span / 2 + centerOff - half;
  const right = span / 2 - centerOff - half;
  const [cx, cy, cz] = wall.at;
  const y0 = cy - sy / 2;
  const lintelH = sy - doorH;
  const parts = [];
  const piece = (suffix, at, size) => parts.push(box({
    id: wall.id + suffix, at, size, yaw: wall.yaw || 0, mat: wall.mat, tag: wall.tag,
  }));
  if (axis === 'x') {
    if (left >= 0.5) piece('-l', [cx + centerOff - half - left / 2, cy, cz], [left, sy, thick]);
    if (right >= 0.5) piece('-r', [cx + centerOff + half + right / 2, cy, cz], [right, sy, thick]);
    if (lintelH >= 0.5) piece('-t', [cx + centerOff, y0 + doorH + lintelH / 2, cz], [gap, lintelH, thick]);
  } else {
    if (left >= 0.5) piece('-l', [cx, cy, cz + centerOff - half - left / 2], [thick, sy, left]);
    if (right >= 0.5) piece('-r', [cx, cy, cz + centerOff + half + right / 2], [thick, sy, right]);
    if (lintelH >= 0.5) piece('-t', [cx, y0 + doorH + lintelH / 2, cz + centerOff], [thick, lintelH, gap]);
  }
  return parts;
}

export function room(min, max, opt = {}) {
  const id = opt.id || 'room';
  const mat = opt.mat || 'stone';
  const t = opt.wall ?? 0.5;
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const sx = x1 - x0, sz = z1 - z0, h = y1 - y0;
  const cy = y0 + h / 2;
  const doors = Object.fromEntries((opt.doors || []).map((d) => [d.wall, d]));
  let parts = [
    box({ id: `${id}-floor`, at: [cx, y0 - t / 2, cz], size: [sx, t, sz], mat }),
  ];
  const walls = [
    ['n', box({ id: `${id}-n`, at: [cx, cy, z0], size: [sx, h, t], mat }), 'x'],
    ['s', box({ id: `${id}-s`, at: [cx, cy, z1], size: [sx, h, t], mat }), 'x'],
    ['w', box({ id: `${id}-w`, at: [x0, cy, cz], size: [t, h, sz], mat }), 'z'],
    ['e', box({ id: `${id}-e`, at: [x1, cy, cz], size: [t, h, sz], mat }), 'z'],
  ];
  for (const [name, wall, axis] of walls) parts.push(...splitWall(wall, doors[name], axis));
  if (opt.roof) parts.push(box({ id: `${id}-roof`, at: [cx, y1 + t / 2, cz], size: [sx, t, sz], mat }));
  return group(id, parts);
}

export function tower(at, floors, floorHeight, opt = {}) {
  const id = opt.id || 'tower';
  const mat = opt.mat || 'stone';
  const r = opt.radius ?? 4;
  const parts = [cylinder({ id: `${id}-core`, at: [at[0], at[1], at[2]], r: Math.max(0.5, r * 0.2), h: floors * floorHeight, mat })];
  for (let f = 0; f < floors; f++) {
    const y = at[1] + f * floorHeight;
    parts.push(cylinder({ id: `${id}-slab-${f}`, at: [at[0], y, at[2]], r, h: 0.5, mat }));
    const yaw = opt.stairs === 'spiral' ? f * 90 : 0;
    const stairAt = localOffset([at[0], y + floorHeight / 2, at[2]], yaw, 0, 0, r + 1.5);
    parts.push(ramp({
      id: `${id}-stair-${f}`, at: stairAt, yaw, mat, tag: 'stairs',
      size: [2, Math.max(0.5, floorHeight), Math.max(0.5, r)],
    }));
  }
  return group(id, parts);
}

export function ledgePath(points, width, opt = {}) {
  const id = opt.id || 'ledge';
  const mat = opt.mat || 'stone';
  const wallHeight = opt.wallHeight ?? 2;
  const drop = opt.drop ?? 'outer';
  const parts = [];
  const left = drop === 'both' || drop === 'left' || drop === 'outer';
  const right = drop === 'both' || drop === 'right' || drop === 'inner';
  for (let i = 0; i < points.length - 1; i++) {
    parts.push(...floorPiece(`${id}-floor-${i}`, points[i], points[i + 1], width, mat));
    parts.push(...sideWalls(`${id}-wall-${i}`, points[i], points[i + 1], width, wallHeight, mat, { left, right }));
  }
  return group(id, parts);
}

export function bridge(from, to, width, opt = {}) {
  const id = opt.id || 'bridge';
  const mat = opt.mat || 'wood';
  const parts = [...floorPiece(`${id}-deck`, from, to, width, mat)];
  if (opt.rails !== false) parts.push(...sideWalls(`${id}-rail`, from, to, width, opt.railHeight ?? 1, mat, { left: true, right: true }));
  return group(id, parts);
}

export function coverCluster(at, seed, opt = {}) {
  const id = opt.id || `cover-${seed}`;
  const count = opt.count ?? 4;
  const spread = opt.spread ?? 6;
  const heights = opt.heights ?? [1, 1.2, 1.6];
  const mat = opt.mat || 'stone';
  const parts = [];
  for (let i = 0; i < count; i++) {
    const u = unit(seed, i * 2) - 0.5;
    const v = unit(seed, i * 2 + 1) - 0.5;
    const h = heights[i % heights.length];
    parts.push(box({
      id: `${id}-${i}`, mat, tag: 'cover',
      at: [at[0] + u * spread * 2, at[1] + h / 2, at[2] + v * spread * 2],
      size: [1, h, 1],
    }));
  }
  return group(id, parts);
}

export function car(at, yaw = 0) {
  const id = `car-${at[0]}-${at[2]}-${yaw}`;
  const body = localOffset(at, yaw, 0, 0.6, 0);
  const cab = localOffset(at, yaw, 0, 1.5, -0.4);
  return group(id, [
    box({ id: `${id}-body`, at: body, size: [1.8, 1, 4.2], yaw, mat: 'metal' }),
    box({ id: `${id}-cab`, at: cab, size: [1.6, 0.8, 2], yaw, mat: 'metal' }),
  ]);
}

export function crateStack(at, n = 3, opt = {}) {
  const id = opt.id || `crates-${at[0]}-${at[2]}`;
  const s = opt.size ?? 1;
  const mat = opt.mat || 'crate';
  const parts = [];
  for (let i = 0; i < n; i++) {
    parts.push(box({ id: `${id}-${i}`, at: [at[0], at[1] + s / 2 + i * s, at[2]], size: [s, s, s], mat }));
  }
  return group(id, parts);
}

export function trench(points, width, depth, opt = {}) {
  const id = opt.id || 'trench';
  const mat = opt.mat || 'dirt';
  const lowered = points.map((p) => [p[0], p[1] - depth, p[2]]);
  const parts = [];
  for (let i = 0; i < lowered.length - 1; i++) {
    parts.push(...floorPiece(`${id}-floor-${i}`, lowered[i], lowered[i + 1], width, mat));
    parts.push(...sideWalls(`${id}-wall-${i}`, lowered[i], lowered[i + 1], width, depth, mat, { left: true, right: true }));
  }
  return group(id, parts);
}

export function catwalk(points, width, height, opt = {}) {
  const id = opt.id || 'catwalk';
  const raised = points.map((p) => [p[0], p[1] + height, p[2]]);
  return ledgePath(raised, width, { ...opt, id, wallHeight: opt.wallHeight ?? 1, drop: opt.drop ?? 'both' });
}

export function floatingIsland(at, r, seed, opt = {}) {
  const id = opt.id || `island-${seed}`;
  const mat = opt.mat || 'rock';
  const parts = [cylinder({ id: `${id}-disc`, at: [at[0], at[1], at[2]], r, h: 1, mat })];
  const cluster = coverCluster([at[0], at[1] + 1, at[2]], seed, { id: `${id}-rocks`, count: 3, spread: r * 0.4, heights: [0.8, 1.2, 1], mat });
  parts.push(...cluster.parts);
  return group(id, parts);
}

export function flattenGeometry(items, out = []) {
  for (const item of items || []) {
    if (item && item.kind === 'group') flattenGeometry(item.parts, out);
    else out.push(item);
  }
  return out;
}

function idsOf(list, bucket, errors) {
  for (const item of list || []) {
    if (!item || item.id == null) continue;
    if (bucket.has(item.id)) errors.push(`duplicate id ${item.id}`);
    else bucket.add(item.id);
  }
}

function checkVec(errors, label, v, n) {
  if (!Array.isArray(v) || v.length < n || v.slice(0, n).some((x) => !num(x))) errors.push(`${label} needs ${n} finite numbers`);
}

function checkSolid(errors, g, index) {
  const where = g.id || `#${index}`;
  if (!g.mat || typeof g.mat !== 'string') errors.push(`${where} needs a mat`);
  if (g.kind === 'box' || g.kind === 'ramp') {
    checkVec(errors, `${where} at`, g.at, 3);
    checkVec(errors, `${where} size`, g.size, 3);
    if (Array.isArray(g.size) && g.size.some((s) => !(s >= 0.5))) errors.push(`${where} is thinner than 0.5 m`);
    if (g.yaw != null && !num(g.yaw)) errors.push(`${where} yaw is not a number`);
    if (g.kind === 'ramp' && g.visual === 'stairs' && !(g.steps >= 2)) errors.push(`${where} stairs need at least 2 steps`);
  } else if (g.kind === 'cylinder') {
    checkVec(errors, `${where} at`, g.at, 3);
    if (!(g.r >= 0.25)) errors.push(`${where} radius must be >= 0.25`);
    if (!(g.h >= 0.5)) errors.push(`${where} height must be >= 0.5`);
  } else if (g.kind === 'terrain') {
    if (!g.id) errors.push('terrain needs an id');
    checkVec(errors, `${where} origin`, g.origin, 3);
    checkVec(errors, `${where} size`, g.size, 2);
    if (Array.isArray(g.size) && (g.size[0] <= 0 || g.size[1] <= 0)) errors.push(`${where} size must be positive`);
    if (!(g.cell >= 0.5)) errors.push(`${where} cell must be >= 0.5`);
    if (!Number.isInteger(g.seed)) errors.push(`${where} seed must be an integer`);
    const oct = g.noise && g.noise.octaves;
    if (!Number.isInteger(oct) || oct < 1) errors.push(`${where} noise.octaves must be an integer >= 1`);
  } else {
    errors.push(`${where} has unknown geometry kind ${g.kind}`);
  }
}

/**
 * Structural check for a level module. Reachability and nav live in later milestones.
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateLevel(level) {
  const errors = [];
  const warnings = [];
  if (!level || typeof level !== 'object') return { ok: false, errors: ['level is not an object'], warnings };
  if (typeof level.id !== 'string' || !level.id) errors.push('id is required');
  if (typeof level.name !== 'string' || !level.name) errors.push('name is required');
  checkVec(errors, 'bounds.min', level.bounds && level.bounds.min, 3);
  checkVec(errors, 'bounds.max', level.bounds && level.bounds.max, 3);
  if (level.bounds && Array.isArray(level.bounds.min) && Array.isArray(level.bounds.max)) {
    for (let i = 0; i < 3; i++) if (!(level.bounds.min[i] < level.bounds.max[i])) errors.push('bounds min must be less than max');
  }
  const geometry = flattenGeometry(level.geometry);
  if (level.legacy) {
    if (!(typeof level.radius === 'number' && level.radius > 0)) errors.push('legacy level needs a positive radius');
    if (geometry.length) errors.push('legacy arena keeps an empty geometry list so the circle path stays unchanged');
  }
  geometry.forEach((g, i) => checkSolid(errors, g, i));
  for (const g of geometry) {
    if (g.kind !== 'ramp') continue;
    const slope = Math.atan2(g.size[1], g.size[2]) * 180 / Math.PI;
    if (slope > 40) warnings.push(`${g.id || 'ramp'} slope ${slope.toFixed(1)}° is not walkable (> 40°)`);
  }
  for (const v of level.volumes || []) {
    if (v.kind === 'killPlane') { if (!num(v.y)) errors.push(`${v.id || 'killPlane'} needs a y`); }
    else if (v.kind === 'lava') {
      checkVec(errors, `${v.id || 'lava'} min`, v.min, 3);
      checkVec(errors, `${v.id || 'lava'} max`, v.max, 3);
    }
  }
  for (const m of level.mechanisms || []) {
    if (!m.id) errors.push('mechanism needs an id');
    if (!m.kind) errors.push(`${m.id || 'mechanism'} needs a kind`);
  }
  for (const w of level.weapons || []) {
    if (!w.id) errors.push('weapon placement needs an id');
    if (w.kind === 'rack' && (!w.why || typeof w.why !== 'string')) errors.push(`rack ${w.id || ''} needs why`);
    if (w.kind === 'rack' && !w.gun) errors.push(`rack ${w.id || ''} needs a gun`);
  }
  for (const e of level.encounters || []) {
    if (!e.id) errors.push('encounter needs an id');
    if (!e.objective || !e.objective.kind) errors.push(`${e.id || 'encounter'} needs an objective`);
  }
  for (const s of level.spawners || []) {
    if (!s.id) errors.push('spawner needs an id');
    checkVec(errors, `${s.id || 'spawner'} at`, s.at, 3);
  }
  const ids = new Set();
  idsOf(geometry, ids, errors);
  idsOf(level.volumes, ids, errors);
  idsOf(level.mechanisms, ids, errors);
  idsOf(level.weapons, ids, errors);
  idsOf(level.checkpoints, ids, errors);
  idsOf(level.spawners, ids, errors);
  idsOf(level.encounters, ids, errors);
  return { ok: errors.length === 0, errors, warnings };
}
