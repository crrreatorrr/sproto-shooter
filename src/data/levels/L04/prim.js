// Local placement helpers for L04. Coordinates stay section-local.
// Yaw is degrees about Y. 0 faces +z. Collision only swaps a box's x/z at
// yaw 90 and 270, so decks and chains are built axis-aligned.
import { box, cylinder, disc, sphere } from '../kit.js';

export { box, cylinder, disc, sphere };

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
