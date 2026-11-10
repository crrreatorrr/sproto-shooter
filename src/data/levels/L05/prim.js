// Placement helpers for L05. The design measures (x, y, north) from each
// section's south-west corner. Kit space is +x east, +y up, +z south, so
// north n is stored as z = -n. makeV2Level adds the section origin.
import { box, cone, cylinder, disc, ramp, sphere, stairs, terrain } from '../kit.js';

export { box, cone, cylinder, disc, ramp, sphere, stairs, terrain };

export function P(x, y, n) {
  return [x, y == null ? 0 : y, -n];
}

export function zone(x0, x1, n0, n1, y0 = -8, y1 = 30) {
  return {
    min: [Math.min(x0, x1), y0, -Math.max(n0, n1)],
    max: [Math.max(x0, x1), y1, -Math.min(n0, n1)],
  };
}

export function ammo(id, x, y, n, ammoType, amount) {
  return { kind: 'ammo', id, at: P(x, y, n), ammoType, amount };
}

/** A hook the grapple snaps to. `at` is local kit space; makeV2Level adds the origin. */
export function hook(id, x, y, n, r = 1.8) {
  return { id, at: P(x, y, n), r };
}

export function door(id, x, y, n, size, extra = {}) {
  return { kind: 'door', id, at: P(x, y, n), size, ...extra };
}

/** A switch the player never reaches. refreshDoors keeps `opens` solid until the door's own flag. */
export function latch(id, doorId, at) {
  return { kind: 'switch', id, at, opens: doorId, needsHold: true, holdTime: 999, latch: true };
}

export function slab(id, x, y, n, size, mat, extra = {}) {
  return box({ id, at: P(x, y, n), size, mat, ...extra });
}

function spans(a, b, gaps) {
  const cuts = gaps.slice().sort((p, q) => p[0] - q[0]);
  const out = [];
  let cursor = a;
  for (const [g0, g1] of cuts) {
    if (g0 - cursor >= 0.5) out.push([cursor, g0]);
    cursor = Math.max(cursor, g1);
  }
  if (b - cursor >= 0.5) out.push([cursor, b]);
  return out;
}

/**
 * room(x0–x1, n0–n1, y, h) from the level spec.
 * Walls are 1 m thick, centred on the boundary. Doors default to 2.4 × 2.6.
 * A door taller than the room opens to the roof and grows no lintel.
 */
export function room(id, x0, x1, n0, n1, y, h, doors = [], mat = 'concrete') {
  const parts = [];
  const on = { s: [], n: [], w: [], e: [] };
  for (const d of doors) {
    const want = d.h || 2.6;
    const dh = h - want >= 0.5 ? want : h;
    const w = d.w || 2.4;
    const side = d.side;
    on[side].push({ at: d.at, w, dh });
  }
  const wallY = y + h / 2;
  const south = spans(x0, x1, on.s.map((d) => [d.at - d.w / 2, d.at + d.w / 2]));
  south.forEach((seg, i) => {
    parts.push(slab(`${id}-s${i}`, (seg[0] + seg[1]) / 2, wallY, n0, [seg[1] - seg[0], h, 1], mat));
  });
  const north = spans(x0, x1, on.n.map((d) => [d.at - d.w / 2, d.at + d.w / 2]));
  north.forEach((seg, i) => {
    parts.push(slab(`${id}-n${i}`, (seg[0] + seg[1]) / 2, wallY, n1, [seg[1] - seg[0], h, 1], mat));
  });
  const west = spans(n0, n1, on.w.map((d) => [d.at - d.w / 2, d.at + d.w / 2]));
  west.forEach((seg, i) => {
    parts.push(slab(`${id}-w${i}`, x0, wallY, (seg[0] + seg[1]) / 2, [1, h, seg[1] - seg[0]], mat));
  });
  const east = spans(n0, n1, on.e.map((d) => [d.at - d.w / 2, d.at + d.w / 2]));
  east.forEach((seg, i) => {
    parts.push(slab(`${id}-e${i}`, x1, wallY, (seg[0] + seg[1]) / 2, [1, h, seg[1] - seg[0]], mat));
  });
  for (const d of [...on.s, ...on.n, ...on.w, ...on.e]) {
    if (!(h - d.dh >= 0.5)) continue;
    const lintelY = y + d.dh + (h - d.dh) / 2;
    const horizontal = on.s.includes(d) || on.n.includes(d);
    const n = on.s.includes(d) ? n0 : on.n.includes(d) ? n1 : d.at;
    const x = horizontal ? d.at : (on.w.includes(d) ? x0 : x1);
    const size = horizontal ? [d.w, h - d.dh, 1] : [1, h - d.dh, d.w];
    parts.push(slab(`${id}-lintel-${parts.length}`, x, lintelY, n, size, mat));
  }
  parts.push(slab(`${id}-roof`, (x0 + x1) / 2, y + h + 0.25, (n0 + n1) / 2, [x1 - x0, 0.5, n1 - n0], mat));
  return parts;
}

export function hazard(id, x0, x1, n0, n1, extra = {}) {
  const box = zone(x0, x1, n0, n1, extra.y0 == null ? -2 : extra.y0, extra.y1 == null ? 6 : extra.y1);
  const mech = { kind: 'hazardZone', id, min: box.min, max: box.max };
  for (const key of Object.keys(extra)) {
    if (key === 'y0' || key === 'y1') continue;
    mech[key] = extra[key];
  }
  return mech;
}
