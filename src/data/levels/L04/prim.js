// Local placement helpers for L04. Coordinates stay section-local.
// Yaw is degrees about Y. 0 faces +z. Collision only swaps a box's x/z at
// yaw 90 and 270, so decks and chains are built axis-aligned.
import { box, cylinder, disc, ramp, sphere } from '../kit.js';

export { box, cylinder, disc, ramp, sphere };

/** A walkable slope. `from` and `to` are [x, top, z]. The high end can be either side. */
export function slope(id, from, to, width = 4) {
  const west = from[0] <= to[0] ? from : to;
  const east = from[0] <= to[0] ? to : from;
  const rise = Math.max(0.5, Math.abs(east[1] - west[1]));
  const len = Math.max(0.5, east[0] - west[0]);
  const low = Math.min(west[1], east[1]);
  return ramp({
    id,
    at: [(west[0] + east[0]) / 2, low + rise / 2, (from[2] + to[2]) / 2],
    size: [width, rise, len],
    yaw: east[1] >= west[1] ? 90 : 270,
    mat: 'metal',
    tag: 'slide',
  });
}

/** Thin steps, 0.35 m each, so a shot is not trapped inside a ramp box. */
export function stair(id, from, to, width = 6) {
  const rise = to[1] - from[1];
  const run = to[0] - from[0];
  const steps = Math.max(1, Math.ceil(Math.abs(rise) / 0.35));
  const parts = [];
  const z = (from[2] + to[2]) / 2;
  for (let i = 0; i < steps; i++) {
    const t1 = (i + 1) / steps;
    const x0 = from[0] + run * (i / steps);
    const x1 = from[0] + run * t1;
    parts.push(deckBox(`${id}-${i}`, Math.min(x0, x1), Math.max(x0, x1) + 0.15, from[1] + rise * t1, z, width));
  }
  return parts;
}

export function deckBox(id, x0, x1, top, z, width = 4) {
  return box({
    id,
    at: [(x0 + x1) / 2, top - 0.25, z],
    size: [Math.max(0.5, x1 - x0), 0.5, width],
    mat: 'metal',
    tag: 'slide',
  });
}

export function ammo(id, at, ammoType, amount) {
  return { kind: 'ammo', id, at, ammoType, amount };
}

export function door(id, at, size, extra = {}) {
  return { kind: 'door', id, at, size, ...extra };
}

/** Overlapping square slabs along a line. `top` is the walkable face. */
export function deck(id, from, to, width, top = 0) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dz) || 1;
  const step = Math.max(width * 0.65, 2);
  const n = Math.max(1, Math.ceil(len / step));
  const parts = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    parts.push(box({
      id: `${id}-${i + 1}`,
      at: [from[0] + dx * t, top - 0.25, from[2] + dz * t],
      size: [width, 0.5, width],
      mat: 'neon',
      tag: 'energyBridge',
    }));
  }
  return parts;
}
