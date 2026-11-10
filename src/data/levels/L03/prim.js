// Local placement helpers. Coordinates stay section-local.
// Yaw is degrees about Y. 0 faces +z. Positive yaw turns toward +x
// (the same Y rotation the level renderer uses).

import { box, cone, cylinder, disc, ramp, sphere, stairs } from '../kit.js';

export { box, cone, cylinder, disc, ramp, sphere, stairs };

export function rotY(x, z, yawDeg) {
  const t = (yawDeg || 0) * Math.PI / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [x * c + z * s, -x * s + z * c];
}

/** Bake a prefab's local parts onto a point. */
export function place(parts, { at = [0, 0, 0], yaw = 0, id }) {
  return parts.map((part, i) => {
    const [x, z] = rotY(part.at[0], part.at[2], yaw);
    return {
      ...part,
      id: `${id}-${part.id || i}`,
      at: [at[0] + x, (at[1] || 0) + part.at[1], at[2] + z],
      yaw: ((part.yaw || 0) + (yaw || 0)) % 360,
    };
  });
}

/** Point at bearing degrees clockwise from north. */
export function polar(cx, cz, radius, bearing, y = 0) {
  const b = bearing * Math.PI / 180;
  return [cx + radius * Math.sin(b), y, cz - radius * Math.cos(b)];
}

function span(a, b) {
  return { length: b - a, centre: (a + b) / 2 };
}

/**
 * One hedge ring inside a 120 m square whose local south-west corner is (0, 0)
 * and whose north edge is z = -120. A gap is { at, width } on that side.
 * West/east gaps are z values. North/south gaps are x values.
 */
export function hedgeRing(id, { a, b, h, west, north, east, south }) {
  const thick = b - a;
  const westX = (a + b) / 2;
  const eastX = 120 - westX;
  const southZ = -westX;
  const northZ = -(120 - westX);
  const alongZ = span(a, 120 - a).length;
  const z0 = -60 - alongZ / 2;
  const z1 = -60 + alongZ / 2;
  const alongX = 120 - 2 * b;
  const x0 = b;
  const x1 = 120 - b;
  const parts = [];
  splitWall(parts, `${id}-W`, west, z0, z1, (piece, n) => box({
    id: `${id}-W${n}`,
    at: [westX, h / 2, piece.centre],
    size: [thick, h, piece.length],
    mat: 'hedge',
  }));
  splitWall(parts, `${id}-E`, east, z0, z1, (piece, n) => box({
    id: `${id}-E${n}`,
    at: [eastX, h / 2, piece.centre],
    size: [thick, h, piece.length],
    mat: 'hedge',
  }));
  splitWall(parts, `${id}-S`, south, x0, x1, (piece, n) => box({
    id: `${id}-S${n}`,
    at: [piece.centre, h / 2, southZ],
    size: [piece.length, h, thick],
    mat: 'hedge',
  }));
  splitWall(parts, `${id}-N`, north, x0, x1, (piece, n) => box({
    id: `${id}-N${n}`,
    at: [piece.centre, h / 2, northZ],
    size: [piece.length, h, thick],
    mat: 'hedge',
  }));
  return parts;
}

function splitWall(out, _id, gap, from, to, make) {
  if (!(to - from >= 0.5)) return;
  if (!gap) {
    out.push(make(span(from, to), ''));
    return;
  }
  const half = (gap.width || 4) / 2;
  const cut0 = gap.at - half;
  const cut1 = gap.at + half;
  if (cut0 - from >= 0.5) out.push(make(span(from, cut0), 'a'));
  if (to - cut1 >= 0.5) out.push(make(span(cut1, to), 'b'));
}

export function hazardBox(id, min, max, extra = {}) {
  return { kind: 'hazard', id, min, max, dps: extra.dps ?? 12, ...extra };
}

export function ammo(id, at, ammoType, amount) {
  return { kind: 'ammo', id, at, ammoType, amount };
}

export function door(id, at, size, extra = {}) {
  return { kind: 'door', id, at, size, ...extra };
}
