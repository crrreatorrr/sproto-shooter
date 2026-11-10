// Campaign world collision. Off unless state.level.useSolids is set, so Wave Mode,
// Sandbox and the current corridor levels keep their old movement.
// Solids are axis-aligned. A ramp's walkable top rises along yaw (0 rises toward +z).

export const STEP_UP = 0.4;

export function solidFromPrimitive(prim) {
  if (!prim) return null;
  if (prim.kind === 'box' || prim.kind === 'ramp') {
    let sx = prim.size[0], sy = prim.size[1], sz = prim.size[2];
    const yaw = ((prim.yaw || 0) % 360 + 360) % 360;
    if (yaw === 90 || yaw === 270) { const t = sx; sx = sz; sz = t; }
    return {
      kind: prim.kind, id: prim.id, yaw,
      min: [prim.at[0] - sx / 2, prim.at[1] - sy / 2, prim.at[2] - sz / 2],
      max: [prim.at[0] + sx / 2, prim.at[1] + sy / 2, prim.at[2] + sz / 2],
    };
  }
  if (prim.kind === 'cylinder') {
    return {
      kind: 'box', id: prim.id, yaw: 0,
      min: [prim.at[0] - prim.r, prim.at[1], prim.at[2] - prim.r],
      max: [prim.at[0] + prim.r, prim.at[1] + prim.h, prim.at[2] + prim.r],
    };
  }
  return null;
}

export function solidsFromGeometry(geometry) {
  const out = [];
  for (const prim of geometry || []) {
    const s = solidFromPrimitive(prim);
    if (s) out.push(s);
  }
  return out;
}

export function campaignSolidsOn(state) {
  return !!(state && state.mode === 'campaign' && state.level && state.level.useSolids);
}

export function activeSolids(state) {
  if (!campaignSolidsOn(state)) return null;
  return state.level.solids || null;
}

function overlapsXZ(s, x, z, r) {
  return x + r > s.min[0] && x - r < s.max[0] && z + r > s.min[2] && z - r < s.max[2];
}

export function surfaceY(s, x, z) {
  if (s.kind !== 'ramp') return s.max[1];
  const spanZ = Math.max(0.001, s.max[2] - s.min[2]);
  const spanX = Math.max(0.001, s.max[0] - s.min[0]);
  let t;
  if (s.yaw === 90) t = (x - s.min[0]) / spanX;
  else if (s.yaw === 270) t = (s.max[0] - x) / spanX;
  else if (s.yaw === 180) t = (s.max[2] - z) / spanZ;
  else t = (z - s.min[2]) / spanZ;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return s.min[1] + t * (s.max[1] - s.min[1]);
}

/** Highest walkable top under the body that is not above feet + step. */
export function groundHeight(solids, x, z, radius, feet, step = STEP_UP) {
  let g = -Infinity;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (!overlapsXZ(s, x, z, radius)) continue;
    const top = surfaceY(s, x, z);
    if (top > feet + step + 0.02) continue;
    if (top > g) g = top;
  }
  return g;
}

function pushCircle(x, z, s, radius) {
  const cx = Math.max(s.min[0], Math.min(x, s.max[0]));
  const cz = Math.max(s.min[2], Math.min(z, s.max[2]));
  let dx = x - cx, dz = z - cz;
  let dist = Math.hypot(dx, dz);
  if (dist >= radius) return null;
  if (dist < 1e-6) {
    const left = x - s.min[0], right = s.max[0] - x, back = z - s.min[2], fwd = s.max[2] - z;
    const m = Math.min(left, right, back, fwd);
    if (m === left) { dx = -1; dz = 0; }
    else if (m === right) { dx = 1; dz = 0; }
    else if (m === back) { dx = 0; dz = -1; }
    else { dx = 0; dz = 1; }
    dist = 1;
  }
  const k = (radius - dist) / dist + 1e-4;
  return { x: x + dx * k, z: z + dz * k };
}

export function pushHorizontal(ent, solids, radius, height, step = STEP_UP) {
  const feet = ent.pos.y;
  const head = feet + height;
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      const top = surfaceY(s, ent.pos.x, ent.pos.z);
      if (top <= feet + step + 0.02) continue;
      if (head <= s.min[1] + 0.01 || feet + step >= s.max[1]) continue;
      const next = pushCircle(ent.pos.x, ent.pos.z, s, radius);
      if (!next) continue;
      ent.pos.x = next.x;
      ent.pos.z = next.z;
    }
  }
}

export function snapToGround(ent, solids, radius, step = STEP_UP) {
  const feet = ent.prevPos ? ent.prevPos.y : ent.pos.y;
  const g = groundHeight(solids, ent.pos.x, ent.pos.z, radius * 0.2, Math.max(feet, ent.pos.y), step);
  if (g === -Infinity) {
    ent.onGround = false;
    return;
  }
  const crossed = feet + 0.05 >= g - step && ent.pos.y <= g + 0.02;
  if (crossed) {
    ent.pos.y = g;
    if (ent.vel && ent.vel.y < 0) ent.vel.y = 0;
    ent.onGround = true;
    return;
  }
  ent.onGround = Math.abs(ent.pos.y - g) < 0.02;
}

/** First solid hit along a ray. Returns distance or -1. */
export function raySolids(solids, origin, dir, maxDist, allow = null) {
  let best = -1;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (allow && !allow(s)) continue;
    const t = rayAabb(origin, dir, s.min, s.max, maxDist);
    if (t < 0) continue;
    if (best < 0 || t < best) best = t;
  }
  return best;
}

function rayAabb(o, d, min, max, maxDist) {
  let t0 = 0, t1 = maxDist;
  for (let axis = 0; axis < 3; axis++) {
    const p = axis === 0 ? o.x : axis === 1 ? o.y : o.z;
    const v = axis === 0 ? d.x : axis === 1 ? d.y : d.z;
    const lo = min[axis], hi = max[axis];
    if (Math.abs(v) < 1e-8) {
      if (p < lo || p > hi) return -1;
      continue;
    }
    let ta = (lo - p) / v, tb = (hi - p) / v;
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  return t0 >= 0 && t0 <= maxDist ? t0 : -1;
}

export function voidAt(pos, volumes) {
  for (let i = 0; i < (volumes ? volumes.length : 0); i++) {
    const v = volumes[i];
    if (pos.x < v.min[0] || pos.x > v.max[0]) continue;
    if (pos.y < v.min[1] || pos.y > v.max[1]) continue;
    if (pos.z < v.min[2] || pos.z > v.max[2]) continue;
    return v;
  }
  return null;
}
