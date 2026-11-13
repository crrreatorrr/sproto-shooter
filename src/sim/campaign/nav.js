// Baked walk grid for campaign levels that set useNav. Wave Mode never calls this.
import { activeSolids, groundHeight, surfaceY } from './solids.js';

const CELL = 1;
const grids = new WeakMap();

function blocked(solids, x, z) {
  let floor = -Infinity;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (x < s.min[0] || x > s.max[0] || z < s.min[2] || z > s.max[2]) continue;
    const top = surfaceY(s, x, z);
    const thin = s.kind === 'ramp' || s.max[1] - s.min[1] <= 0.6;
    if (thin && top > floor) floor = top;
  }
  if (floor === -Infinity) {
    const g = groundHeight(solids, x, z, 0.15, 0, 0.5);
    if (g === -Infinity) return true;
    floor = g;
  }
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (x < s.min[0] || x > s.max[0] || z < s.min[2] || z > s.max[2]) continue;
    const top = surfaceY(s, x, z);
    if (top > floor + 0.45 && s.min[1] < floor + 1.5) return true;
  }
  return false;
}

function zoneCostAt(zones, x, z) {
  let cost = 1;
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (x < zone.min[0] || x > zone.max[0] || z < zone.min[2] || z > zone.max[2]) continue;
    if (zone.cost > cost) cost = zone.cost;
  }
  return cost;
}

// Cells are numbered iz * nx + ix. `open` is 1 where an enemy can stand, `cost` is the slow-zone cost
// (0 means 1). A link end outside the grid is left out; no level has one.
export function bakeNav(solids, bounds, links = [], cell = CELL, zones = []) {
  const x0 = bounds.min[0], z0 = bounds.min[1];
  const nx = Math.max(1, Math.ceil((bounds.max[0] - x0) / cell));
  const nz = Math.max(1, Math.ceil((bounds.max[1] - z0) / cell));
  const open = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = x0 + (ix + 0.5) * cell, z = z0 + (iz + 0.5) * cell;
      if (!blocked(solids, x, z)) open[iz * nx + ix] = 1;
    }
  }
  const inside = (c) => c.ix >= 0 && c.ix < nx && c.iz >= 0 && c.iz < nz;
  const extra = [];
  for (let i = 0; i < links.length; i++) {
    const a = cellAt(bounds, links[i].from, cell);
    const b = cellAt(bounds, links[i].to, cell);
    if (!inside(a) || !inside(b)) continue;
    const ka = a.iz * nx + a.ix, kb = b.iz * nx + b.ix;
    extra.push({ a: ka, b: kb, to: links[i].to, kind: links[i].kind || 'link' });
    open[ka] = 1;
    open[kb] = 1;
  }
  let cost = null;
  if (zones.length) {
    cost = new Float64Array(nx * nz);
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const x = x0 + (ix + 0.5) * cell, z = z0 + (iz + 0.5) * cell;
        const c = zoneCostAt(zones, x, z);
        if (c > 1) cost[iz * nx + ix] = c;
      }
    }
  }
  return { bounds, cell, nx, nz, open, extra, cost, scratch: null };
}

function cellAt(bounds, pos, cell = CELL) {
  const ix = Math.floor((pos.x - bounds.min[0]) / cell);
  const iz = Math.floor(((pos.z != null ? pos.z : pos.y) - bounds.min[1]) / cell);
  return { ix, iz };
}

function center(grid, ix, iz) {
  return {
    x: grid.bounds.min[0] + (ix + 0.5) * grid.cell,
    z: grid.bounds.min[1] + (iz + 0.5) * grid.cell,
  };
}

// What a baked grid depends on, by value. Closed doors and slow zones are rebuilt as new arrays every
// tick and a level with no links reads as a fresh `[]`, so keying on the arrays themselves missed on
// every call: each enemy re-baked the whole grid each tick.
const EMPTY = [];
function boxesKey(list) {
  let s = '';
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    s += `${b.kind}/${b.yaw || 0}/${b.min[0]},${b.min[1]},${b.min[2]}/${b.max[0]},${b.max[1]},${b.max[2]}/${b.cost ?? ''};`;
  }
  return s;
}

const GRID_CACHE = 8; // door states per section: a few encounters, each locked and opened
export function navGridFor(state) {
  const solids = activeSolids(state);
  const lv = state.level;
  const bounds = lv && lv.navBounds;
  if (!solids || !bounds) return null;
  const links = lv.navLinks || EMPTY;
  const zones = lv.slowZones || EMPTY;
  const base = lv.solids || EMPTY;
  const sig = `${boxesKey(lv.closedDoors || EMPTY)}#${boxesKey(zones)}`;
  let byBase = grids.get(base);
  if (!byBase) { byBase = []; grids.set(base, byBase); }
  for (let i = 0; i < byBase.length; i++) {
    const c = byBase[i];
    if (c.bounds === bounds && c.links === links && c.sig === sig) return c.grid;
  }
  const grid = bakeNav(solids, bounds, links, CELL, zones);
  byBase.unshift({ bounds, links, sig, grid });
  if (byBase.length > GRID_CACHE) byBase.pop();
  return grid;
}

function nearestOpen(grid, pos) {
  const c = cellAt(grid.bounds, pos, grid.cell);
  const { nx, nz, open } = grid;
  if (c.ix >= 0 && c.ix < nx && c.iz >= 0 && c.iz < nz && open[c.iz * nx + c.ix]) return c;
  let best = null, bd = 1e9;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      if (!open[iz * nx + ix]) continue;
      const p = center(grid, ix, iz);
      const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = { ix, iz }; }
    }
  }
  return best;
}

/** Per-grid search buffers, reused across calls. A cell's entry counts only when its stamp is this search's. */
function scratchFor(grid) {
  const n = grid.nx * grid.nz;
  if (!grid.scratch) {
    grid.scratch = { gen: 0, g: new Float64Array(n), gAt: new Uint32Array(n), came: new Int32Array(n), cameAt: new Uint32Array(n), seenAt: new Uint32Array(n) };
  }
  const s = grid.scratch;
  if (++s.gen === 0xffffffff) { s.gAt.fill(0); s.cameAt.fill(0); s.seenAt.fill(0); s.gen = 1; }
  return s;
}

const NEIGH_X = [1, -1, 0, 0];
const NEIGH_Z = [0, 0, 1, -1];

// The search order is the original string-keyed one, step for step, so enemies walk the same paths
// and replays and goldens hold: the head of the open list is weighed by g alone, the rest by g + h,
// the first lowest wins, and a cell can sit in the list more than once.
export function findPath(grid, from, to) {
  if (!grid) return null;
  const a = nearestOpen(grid, from);
  const b = nearestOpen(grid, to);
  if (!a || !b) return null;
  const { nx, nz, open: walk, cost, extra } = grid;
  const start = a.iz * nx + a.ix, goal = b.iz * nx + b.ix;
  if (start === goal) return [center(grid, a.ix, a.iz)];
  const { gen, g, gAt, came, cameAt, seenAt } = scratchFor(grid);
  const bx = b.ix, bz = b.iz;
  const open = [start];
  g[start] = 0; gAt[start] = gen;
  while (open.length) {
    let bi = 0, bg = g[open[0]] + 0;
    for (let i = 1; i < open.length; i++) {
      const k = open[i];
      const ix = k % nx, iz = (k - ix) / nx;
      const f = g[k] + (Math.abs(ix - bx) + Math.abs(iz - bz));
      if (f < bg) { bg = f; bi = i; }
    }
    const cur = open[bi];
    open.splice(bi, 1);
    if (cur === goal) break;
    if (seenAt[cur] === gen) continue;
    seenAt[cur] = gen;
    const ix = cur % nx, iz = (cur - ix) / nx;
    const gc = g[cur];
    for (let n = 0; n < 4; n++) {
      const jx = ix + NEIGH_X[n], jz = iz + NEIGH_Z[n];
      if (jx < 0 || jx >= nx || jz < 0 || jz >= nz) continue;
      const nk = jz * nx + jx;
      if (!walk[nk]) continue;
      const ng = gc + ((cost && cost[nk]) || 1);
      if (ng < (gAt[nk] === gen ? g[nk] : 1e9)) { g[nk] = ng; gAt[nk] = gen; came[nk] = cur; cameAt[nk] = gen; open.push(nk); }
    }
    for (let n = 0; n < extra.length; n++) {
      const link = extra[n];
      const nk = link.a === cur ? link.b : link.b === cur ? link.a : -1;
      if (nk < 0) continue;
      const ng = gc + 2;
      if (ng < (gAt[nk] === gen ? g[nk] : 1e9)) { g[nk] = ng; gAt[nk] = gen; came[nk] = cur; cameAt[nk] = gen; open.push(nk); }
    }
  }
  if (cameAt[goal] !== gen) return null;
  const cells = [goal];
  let at = goal;
  while (cameAt[at] === gen) { at = came[at]; cells.push(at); }
  cells.reverse();
  return cells.map((k) => {
    const ix = k % nx;
    return center(grid, ix, (k - ix) / nx);
  });
}

/** Next walk point from an enemy toward a world position. Null when nav is off or no path. */
export function navWaypoint(state, from, to) {
  if (!state.level || !state.level.useNav) return null;
  const grid = navGridFor(state);
  const path = findPath(grid, from, to);
  if (!path || path.length < 2) return path && path[0] ? path[0] : null;
  return path[1];
}

/** Keep a flyer inside a world AABB. No-op without a volume. */
export function clampFlyer(e, volume) {
  if (!volume) return;
  const m = volume.min, M = volume.max;
  if (e.pos.x < m[0]) e.pos.x = m[0];
  if (e.pos.x > M[0]) e.pos.x = M[0];
  if (e.pos.y < m[1]) e.pos.y = m[1];
  if (e.pos.y > M[1]) { e.pos.y = M[1]; if (e.vel.y > 0) e.vel.y = 0; }
  if (e.pos.z < m[2]) e.pos.z = m[2];
  if (e.pos.z > M[2]) e.pos.z = M[2];
}
