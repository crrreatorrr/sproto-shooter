// Authoring helpers for L02. Pure data. Geometry yaw is degrees, 0 faces +z.
// A ramp's walkable top rises toward yaw (90 climbs toward +x).

export function box(id, size, at, mat = 'stone', extra = {}) {
  return { kind: 'box', id, size: size.slice(), at: at.slice(), yaw: extra.yaw || 0, mat, ...extra };
}

export function cylinder(id, r, h, at, mat = 'pillar', extra = {}) {
  return { kind: 'cylinder', id, r, h, at: at.slice(), mat, ...extra };
}

export function sphere(id, r, at, mat = 'rock', extra = {}) {
  return { kind: 'sphere', id, r, at: at.slice(), mat, ...extra };
}

export function cone(id, r, h, at, mat = 'stone', extra = {}) {
  return { kind: 'cone', id, r, h, at: at.slice(), mat, ...extra };
}

export function disc(id, r, at, mat = 'neon', extra = {}) {
  return { kind: 'disc', id, r, at: at.slice(), mat, ...extra };
}

export function ramp(id, size, at, yaw, mat = 'stone', extra = {}) {
  return { kind: 'ramp', id, size: size.slice(), at: at.slice(), yaw, mat, keep: true, ...extra };
}

export function floor(id, x0, x1, z0, z1, mat = 'sand') {
  return box(id, [x1 - x0, 0.5, z1 - z0], [(x0 + x1) / 2, -0.25, (z0 + z1) / 2], mat);
}

export function wall(id, x0, x1, z0, z1, h = 6, mat = 'stone', y0 = 0) {
  return box(id, [Math.max(0.6, x1 - x0), h, Math.max(0.6, z1 - z0)], [(x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2], mat);
}

function axisBox(g) {
  if (!g || (g.kind !== 'box' && g.kind !== 'ramp')) return g;
  const yaw = ((g.yaw || 0) % 360 + 360) % 360;
  if (yaw === 90 || yaw === 270) return { ...g, yaw: 0, size: [g.size[2], g.size[1], g.size[0]] };
  if (yaw === 180) return { ...g, yaw: 0 };
  return g;
}

function aabb(g) {
  const b = axisBox(g);
  if (!b) return null;
  if (b.kind === 'box' || b.kind === 'ramp') {
    return {
      minX: b.at[0] - b.size[0] / 2, maxX: b.at[0] + b.size[0] / 2,
      minY: b.at[1] - b.size[1] / 2, maxY: b.at[1] + b.size[1] / 2,
      minZ: b.at[2] - b.size[2] / 2, maxZ: b.at[2] + b.size[2] / 2,
      box: b,
    };
  }
  if (b.kind === 'cylinder') {
    return {
      minX: b.at[0] - b.r, maxX: b.at[0] + b.r,
      minY: b.at[1], maxY: b.at[1] + b.h,
      minZ: b.at[2] - b.r, maxZ: b.at[2] + b.r,
      box: b,
    };
  }
  return null;
}

function hits(a, r) {
  return a.maxX > r.x0 && a.minX < r.x1 && a.maxZ > r.z0 && a.minZ < r.z1;
}

function subtract(g, rect) {
  const x0 = g.at[0] - g.size[0] / 2;
  const x1 = g.at[0] + g.size[0] / 2;
  const z0 = g.at[2] - g.size[2] / 2;
  const z1 = g.at[2] + g.size[2] / 2;
  const y = g.at[1];
  const sy = g.size[1];
  const ix0 = Math.max(x0, rect.x0);
  const ix1 = Math.min(x1, rect.x1);
  const iz0 = Math.max(z0, rect.z0);
  const iz1 = Math.min(z1, rect.z1);
  if (ix1 - ix0 <= 0.02 || iz1 - iz0 <= 0.02) return [g];
  const raw = [];
  const add = (xa, xb, za, zb) => {
    if (xb - xa < 0.5 || zb - za < 0.5 || sy < 0.5) return;
    raw.push([xa, xb, za, zb]);
  };
  if (ix0 - x0 >= 0.5) add(x0, ix0, z0, z1);
  if (x1 - ix1 >= 0.5) add(ix1, x1, z0, z1);
  if (iz0 - z0 >= 0.5) add(ix0, ix1, z0, iz0);
  if (z1 - iz1 >= 0.5) add(ix0, ix1, iz1, z1);
  return raw.map((p, i) => ({
    ...g,
    yaw: 0,
    id: `${g.id}~${i}`,
    at: [(p[0] + p[1]) / 2, y, (p[2] + p[3]) / 2],
    size: [p[1] - p[0], sy, p[3] - p[2]],
  }));
}

/** Open a walkable slot through boxes and cylinders. Floors (top under 0.5 m) and
 *  overhead pieces (bottom above 1.7 m) stay. `keep` pieces stay. */
export function cutRoute(geometry, rects) {
  let parts = geometry.filter(Boolean);
  for (const rect of rects) {
    const next = [];
    for (const prim of parts) {
      if (prim.keep || prim.kind === 'sphere' || prim.kind === 'cone' || prim.kind === 'disc' || prim.kind === 'terrain') {
        next.push(prim);
        continue;
      }
      const box = axisBox(prim);
      const a = aabb(box);
      if (!a || a.maxY < 0.5 || a.minY > 1.7 || !hits(a, rect)) {
        next.push(prim);
        continue;
      }
      if (box.kind !== 'box') continue;
      next.push(...subtract(box, rect));
    }
    parts = next;
  }
  return parts;
}

export function points(n, x, z, along = 'x', gap = 1.5) {
  const out = [];
  const start = -((n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const d = start + i * gap;
    out.push(along === 'z' ? [x, 0, z + d] : [x + d, 0, z]);
  }
  return out;
}

export function squad(id, trigger, method, units, at, designAt) {
  const list = units.map(([type, count]) => ({ type, count }));
  return { id, trigger, method, units: list, at, designAt: designAt || at };
}

export function ammo(id, at, ammoType, amount) {
  return { kind: 'ammo', id, at, ammoType, amount };
}

export function door(id, at, size) {
  return { kind: 'door', id, at, size };
}

export function zone(x0, x1, z0, z1, y0 = -2, y1 = 12) {
  return { min: [x0, y0, z0], max: [x1, y1, z1] };
}
