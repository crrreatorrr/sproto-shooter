// Collision: arena clamp, ray vs sphere/capsule, world hitboxes, raycastEnemies. PLAN §4.9–4.10
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';
import { getLevelRuntime } from './level/runtime.js';

const ARENA_R = getLevelRuntime('arena').radius;

export function clampToArena(ent, radius) {
  const r = Math.hypot(ent.pos.x, ent.pos.z);
  const maxR = ARENA_R - radius;
  if (r > maxR) {
    const nx = ent.pos.x / r, nz = ent.pos.z / r;
    ent.pos.x = nx * maxR; ent.pos.z = nz * maxR;
    const vr = ent.vel.x * nx + ent.vel.z * nz;
    if (vr > 0) { ent.vel.x -= nx * vr; ent.vel.z -= nz * vr; }
    return true;
  }
  return false;
}

export function pushOutOfBoxes(state, ent, radius) {
  for (const b of state.weaponBoxes) {
    const dx = ent.pos.x - b.pos.x, dz = ent.pos.z - b.pos.z;
    const d = Math.hypot(dx, dz);
    const min = b.radius + radius;
    if (d < min && ent.pos.y < 1.2) {
      const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
      ent.pos.x = b.pos.x + nx * min; ent.pos.z = b.pos.z + nz * min;
    }
  }
}

/** returns t >= 0 or -1 */
export function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  let t = -b - s;
  if (t < 0) t = -b + s;
  return t >= 0 ? t : -1;
}

/** vertical capsule from (base.x, y0+r, base.z) to (base.x, y1-r, base.z) */
export function rayCapsule(o, d, cx, cz, y0, y1, r) {
  const a0 = y0 + r, a1 = Math.max(a0, y1 - r);
  let best = -1;
  const ox = o.x - cx, oz = o.z - cz;
  const A = d.x * d.x + d.z * d.z;
  if (A > 1e-9) {
    const B = ox * d.x + oz * d.z;
    const C = ox * ox + oz * oz - r * r;
    const disc = B * B - A * C;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      for (const t of [(-B - s) / A, (-B + s) / A]) {
        if (t < 0) continue;
        const y = o.y + d.y * t;
        if (y >= a0 && y <= a1) { best = t; break; }
      }
    }
  }
  for (const yy of [a0, a1]) {
    const t = raySphere(o, d, { x: cx, y: yy, z: cz }, r);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}

/** Point vs capsule distance (for splash) */
export function distToCapsule(p, cx, cz, y0, y1, r) {
  const y = Math.max(y0 + r, Math.min(Math.max(y0 + r, y1 - r), p.y));
  return Math.max(0, Math.hypot(p.x - cx, p.y - y, p.z - cz) - r);
}

export function entityDef(e) {
  return e.boss ? BOSSES[e.type] : ENEMIES[e.type];
}

/** World-space hitboxes for an enemy. */
export function worldHitboxes(e, out = []) {
  out.length = 0;
  const def = entityDef(e);
  const sc = e.scale;
  const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
  // local +z forward -> world forward = (-sin yaw, -cos yaw)
  const toWorld = (lx, lz) => ({ x: e.pos.x + (-sy * lz + cy * lx), z: e.pos.z + (-cy * lz - sy * lx) });
  for (const hb of def.hitboxes) {
    if (hb.onlyWhen && !(e.boss && e.boss.action.id === hb.onlyWhen)) continue;
    let r = hb.r * sc;
    if (hb.zone === 'weak' && e.bigHeadT > 0) r *= 1.8;
    if (hb.type === 'capsule') {
      out.push({ type: 'capsule', zone: hb.zone, x: e.pos.x, z: e.pos.z, y0: e.pos.y + hb.y0 * sc, y1: e.pos.y + hb.y1 * sc, r });
    } else if (hb.orbit) {
      const a = e.boss.weakAngle;
      out.push({ type: 'sphere', zone: hb.zone, x: e.pos.x + Math.cos(a) * hb.orbit, y: e.pos.y + 0.2, z: e.pos.z + Math.sin(a) * hb.orbit, r });
    } else {
      const w = toWorld(hb.x * sc, hb.z * sc);
      out.push({ type: 'sphere', zone: hb.zone, x: w.x, y: e.pos.y + hb.y * sc, z: w.z, r });
    }
  }
  return out;
}

const ZONE_PRI = { weak: 3, shield: 2, body: 1 };
const _hbs = [];

export function boundCenter(e) {
  const def = entityDef(e);
  if (e.type === 'hexAuditor') return { x: e.pos.x, y: e.pos.y, z: e.pos.z, r: 2.6 * e.scale };
  const h = def.height * e.scale;
  return { x: e.pos.x, y: e.pos.y + h / 2, z: e.pos.z, r: (h / 2 + def.radius * e.scale) * 1.6 };
}

export function raycastEnemies(state, o, d, maxDist, ignore = null) {
  let best = null;
  for (const e of state.enemies) {
    if (e.dead || e.state === 'spawning') continue;
    if (ignore && ignore[e.id]) continue;
    const bc = boundCenter(e);
    const tb = raySphere(o, d, bc, bc.r);
    if (tb < 0 || tb > maxDist + bc.r * 2) continue;
    worldHitboxes(e, _hbs);
    for (const hb of _hbs) {
      const t = hb.type === 'sphere' ? raySphere(o, d, hb, hb.r) : rayCapsule(o, d, hb.x, hb.z, hb.y0, hb.y1, hb.r);
      if (t < 0 || t > maxDist) continue;
      if (!best || t < best.t - 0.05 || (Math.abs(t - best.t) <= 0.05 && ZONE_PRI[hb.zone] > ZONE_PRI[best.zone])) {
        best = { e, t, zone: hb.zone, point: { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t } };
      }
    }
  }
  return best;
}

/** Ray vs ground/arena edge: distance to where a shot ends if it misses. */
export function rayWorld(o, d, maxDist) {
  let t = maxDist;
  if (d.y < -1e-4) t = Math.min(t, -o.y / d.y);
  return t;
}

/** Sphere (center c, radius r) overlapping player capsule */
export function sphereHitsPlayer(c, r, p) {
  const top = p.pos.y + playerHeight(p);
  const y = Math.max(p.pos.y + TUNING.playerRadius, Math.min(top - TUNING.playerRadius, c.y));
  return Math.hypot(c.x - p.pos.x, c.y - y, c.z - p.pos.z) < r + TUNING.playerRadius;
}

export function playerHeight(p) {
  if (p.downed) return 0.9;
  return p.move.mode === 'slide' ? 1.0 : TUNING.playerHeight;
}

export function eyePos(p) {
  const eye = p.downed ? TUNING.downedEye : p.move.mode === 'slide' ? TUNING.slideEye : TUNING.eyeHeight;
  return { x: p.pos.x, y: p.pos.y + eye, z: p.pos.z };
}
