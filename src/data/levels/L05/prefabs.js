// Glacier prefabs from docs/campaign/levels/L05-frostspire-black-site.md §7.
// `at` is the prefab origin on the ground, in design (x, y, north).
import { box, cone, cylinder, sphere } from '../kit.js';
import { P, slab } from './prim.js';

export function pine(id, x, n) {
  return [
    cylinder({ id: `${id}-trunk`, at: P(x, 0, n), r: 0.3, h: 2.5, mat: 'wood' }),
    cone({ id: `${id}-bough1`, at: P(x, 2, n), r: 1.6, h: 3, mat: 'hedge' }),
    cone({ id: `${id}-bough2`, at: P(x, 4, n), r: 1.1, h: 2.4, mat: 'hedge' }),
  ];
}

export function boulderS(id, x, n) {
  return [sphere({ id, at: P(x, 0.4, n), r: 1, mat: 'ice' })];
}

export function boulderM(id, x, n) {
  return [sphere({ id, at: P(x, 0.8, n), r: 1.6, mat: 'ice' })];
}

export function boulderL(id, x, n) {
  return [
    sphere({ id: `${id}-a`, at: P(x, 1.2, n), r: 2.6, mat: 'ice' }),
    sphere({ id: `${id}-b`, at: P(x + 2.4, 0.6, n - 0.8), r: 1.6, mat: 'ice' }),
  ];
}

export function rockSlab(id, x, n) {
  return [slab(id, x, 1.1, n, [4, 2.2, 1.2], 'rock')];
}

export function snowBerm(id, x, n) {
  return [slab(id, x, 0.6, n, [6, 1.2, 1.5], 'snow')];
}

export function crateStack(id, x, n) {
  return [
    box({ id: `${id}-a`, at: P(x - 0.6, 0.6, n), size: [1.2, 1.2, 1.2], mat: 'crate' }),
    box({ id: `${id}-b`, at: P(x + 0.6, 0.6, n), size: [1.2, 1.2, 1.2], mat: 'crate' }),
    box({ id: `${id}-c`, at: P(x, 1.8, n), size: [1.2, 1.2, 1.2], mat: 'crate' }),
  ];
}

export function snowcat(id, x, n, yaw = 0) {
  const body = box({ id: `${id}-body`, at: P(x, 1.2, n), size: [5, 1.6, 2.4], yaw, mat: 'metal' });
  const cabin = box({ id: `${id}-cabin`, at: P(x + 1.2, 2.7, n), size: [2.2, 1.4, 2.2], yaw, mat: 'metal' });
  const west = box({ id: `${id}-trackW`, at: P(x, 0.4, n - 1.3), size: [5.4, 0.8, 0.6], yaw, mat: 'metal' });
  const east = box({ id: `${id}-trackE`, at: P(x, 0.4, n + 1.3), size: [5.4, 0.8, 0.6], yaw, mat: 'metal' });
  return [body, cabin, west, east];
}

export function fishHut(id, x, n) {
  const parts = [];
  const segs = spansSafe(x - 1.5, x + 1.5, [[x - 0.6, x + 0.6]]);
  segs.forEach((seg, i) => {
    parts.push(slab(`${id}-s${i}`, (seg[0] + seg[1]) / 2, 1.2, n - 1.5, [seg[1] - seg[0], 2.4, 0.5], 'wood'));
  });
  parts.push(slab(`${id}-n`, x, 1.2, n + 1.5, [3, 2.4, 0.5], 'wood'));
  parts.push(slab(`${id}-w`, x - 1.5, 1.2, n, [0.5, 2.4, 3], 'wood'));
  parts.push(slab(`${id}-e`, x + 1.5, 1.2, n, [0.5, 2.4, 3], 'wood'));
  parts.push(slab(`${id}-roof`, x, 2.65, n, [3.4, 0.5, 3.4], 'wood'));
  return parts;
}

function spansSafe(a, b, gaps) {
  const out = [];
  let cursor = a;
  for (const [g0, g1] of gaps) {
    if (g0 - cursor >= 0.5) out.push([cursor, g0]);
    cursor = Math.max(cursor, g1);
  }
  if (b - cursor >= 0.5) out.push([cursor, b]);
  return out;
}

export function watchtower(id, x, y, n, legH = 8) {
  const half = 1.7;
  const corners = [[-half, -half], [half, -half], [-half, half], [half, half]];
  const parts = corners.map((c, i) => cylinder({
    id: `${id}-leg${i}`, at: P(x + c[0], y, n + c[1]), r: 0.3, h: legH, mat: 'metal',
  }));
  const floor = y + legH;
  parts.push(slab(`${id}-deck`, x, floor - 0.25, n, [4.4, 0.5, 4.4], 'metal'));
  const rails = [
    [0, 2.2, [4.4, 1.2, 0.5]],
    [0, -2.2, [4.4, 1.2, 0.5]],
    [2.2, 0, [0.5, 1.2, 4.4]],
    [-2.2, 0, [0.5, 1.2, 4.4]],
  ];
  rails.forEach((r, i) => {
    parts.push(slab(`${id}-rail${i}`, x + r[0], floor + 0.6, n + r[1], r[2], 'metal'));
  });
  corners.forEach((c, i) => {
    parts.push(cylinder({
      id: `${id}-post${i}`, at: P(x + c[0], floor, n + c[1]), r: 0.25, h: 2.3, mat: 'metal',
    }));
  });
  parts.push(slab(`${id}-roof`, x, floor + 2.55, n, [4.8, 0.5, 4.8], 'metal'));
  parts.push({
    kind: 'ramp', id: `${id}-stairs`, visual: 'stairs', steps: 8,
    at: P(x, y + legH / 2, n + 2.2 + 2.5), size: [1, legH, 5], yaw: 0, mat: 'metal',
  });
  return parts;
}

export function searchlight(id, x, y, n) {
  return [
    cylinder({ id: `${id}-post`, at: P(x, y, n), r: 0.3, h: 2, mat: 'metal' }),
    box({ id: `${id}-lamp`, at: P(x, y + 2.4, n), size: [0.8, 0.8, 0.8], mat: 'metal' }),
    cone({ id: `${id}-beam`, at: P(x, y + 2.8, n), r: 0.6, h: 4, mat: 'neon' }),
  ];
}

export function alarmPole(id, x, y, n) {
  return [
    cylinder({ id: `${id}-pole`, at: P(x, y, n), r: 0.25, h: 4, mat: 'metal' }),
    box({ id: `${id}-siren`, at: P(x, y + 4, n), size: [0.6, 0.6, 0.6], mat: 'neon' }),
  ];
}

export function generator(id, x, y, n) {
  return [
    cylinder({ id: `${id}-body`, at: P(x, y, n), r: 1.2, h: 2.4, mat: 'metal' }),
    box({ id: `${id}-coilW`, at: P(x - 1.5, y + 1, n), size: [0.6, 2, 0.6], mat: 'metal' }),
    box({ id: `${id}-coilE`, at: P(x + 1.5, y + 1, n), size: [0.6, 2, 0.6], mat: 'metal' }),
    sphere({ id: `${id}-core`, at: P(x, y + 1.6, n), r: 0.5, mat: 'neon' }),
  ];
}
