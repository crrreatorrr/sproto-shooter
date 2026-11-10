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

function key(ix, iz) { return `${ix},${iz}`; }

export function bakeNav(solids, bounds, links = [], cell = CELL) {
  const x0 = bounds.min[0], z0 = bounds.min[1];
  const nx = Math.max(1, Math.ceil((bounds.max[0] - x0) / cell));
  const nz = Math.max(1, Math.ceil((bounds.max[1] - z0) / cell));
  const open = new Set();
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = x0 + (ix + 0.5) * cell, z = z0 + (iz + 0.5) * cell;
      if (!blocked(solids, x, z)) open.add(key(ix, iz));
    }
  }
  const extra = [];
  for (let i = 0; i < links.length; i++) {
    const a = cellAt(bounds, links[i].from, cell);
    const b = cellAt(bounds, links[i].to, cell);
    if (!a || !b) continue;
    extra.push({ a: key(a.ix, a.iz), b: key(b.ix, b.iz), to: links[i].to, kind: links[i].kind || 'link' });
    open.add(key(a.ix, a.iz));
    open.add(key(b.ix, b.iz));
  }
  return { bounds, cell, nx, nz, open, extra };
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

export function navGridFor(state) {
  const solids = activeSolids(state);
  const bounds = state.level && state.level.navBounds;
  if (!solids || !bounds) return null;
  const links = state.level.navLinks || [];
  const cached = grids.get(solids);
  if (cached && cached.bounds === bounds && cached.links === links) return cached.grid;
  const grid = bakeNav(solids, bounds, links);
  grids.set(solids, { bounds, links, grid });
  return grid;
}

function nearestOpen(grid, pos) {
  const c = cellAt(grid.bounds, pos, grid.cell);
  if (grid.open.has(key(c.ix, c.iz))) return c;
  let best = null, bd = 1e9;
  for (let iz = 0; iz < grid.nz; iz++) {
    for (let ix = 0; ix < grid.nx; ix++) {
      if (!grid.open.has(key(ix, iz))) continue;
      const p = center(grid, ix, iz);
      const d = (p.x - pos.x) ** 2 + (p.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = { ix, iz }; }
    }
  }
  return best;
}

export function findPath(grid, from, to) {
  if (!grid) return null;
  const a = nearestOpen(grid, from);
  const b = nearestOpen(grid, to);
  if (!a || !b) return null;
  const start = key(a.ix, a.iz), goal = key(b.ix, b.iz);
  if (start === goal) return [center(grid, a.ix, a.iz)];
  const open = [start];
  const came = new Map();
  const g = new Map([[start, 0]]);
  const seen = new Set();
  const neigh = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (open.length) {
    let bi = 0, bg = g.get(open[0]) + 0;
    for (let i = 1; i < open.length; i++) {
      const k = open[i];
      const [ix, iz] = k.split(',').map(Number);
      const h = Math.abs(ix - b.ix) + Math.abs(iz - b.iz);
      const f = g.get(k) + h;
      if (f < bg) { bg = f; bi = i; }
    }
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const [ix, iz] = cur.split(',').map(Number);
    for (let n = 0; n < neigh.length; n++) {
      const jx = ix + neigh[n][0], jz = iz + neigh[n][1];
      const nk = key(jx, jz);
      if (!grid.open.has(nk)) continue;
      const ng = g.get(cur) + 1;
      if (ng < (g.get(nk) ?? 1e9)) { g.set(nk, ng); came.set(nk, cur); open.push(nk); }
    }
    for (let n = 0; n < grid.extra.length; n++) {
      const link = grid.extra[n];
      const nk = link.a === cur ? link.b : link.b === cur ? link.a : null;
      if (!nk) continue;
      const ng = g.get(cur) + 2;
      if (ng < (g.get(nk) ?? 1e9)) { g.set(nk, ng); came.set(nk, cur); open.push(nk); }
    }
  }
  if (!came.has(goal) && start !== goal) return null;
  const cells = [goal];
  let walk = goal;
  while (came.has(walk)) { walk = came.get(walk); cells.push(walk); }
  cells.reverse();
  return cells.map((k) => {
    const [ix, iz] = k.split(',').map(Number);
    return center(grid, ix, iz);
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
