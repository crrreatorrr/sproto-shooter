// Void prefabs from docs/campaign/levels/L04-blockchain-void.md §7.
// They live in this folder so the level PR does not touch src/data/levels/prefabs/.
// candleUp, candleDown and forceField are not renderer materials yet; they
// draw as stone until E5 adds them. See ENGINE-NEEDS.md.
import { box, cylinder, disc, sphere } from './prim.js';

export function candle(id, size, at, dir = 'up') {
  const [w, h, d] = size;
  const mat = dir === 'down' ? 'candleDown' : 'candleUp';
  const wickH = Math.max(0.5, Math.min(h / 4, 6));
  const top = at[1] + h / 2;
  const bot = at[1] - h / 2;
  return [
    box({ id: `${id}-body`, at, size: [w, h, d], mat }),
    box({ id: `${id}-wick-t`, at: [at[0], top, at[2]], size: [0.6, wickH, 0.6], mat: 'trim' }),
    box({ id: `${id}-wick-b`, at: [at[0], bot, at[2]], size: [0.6, wickH, 0.6], mat: 'trim' }),
  ];
}

/** Open top. `at` is the outer body's centre, same as a candle row. */
export function hollowCandle(id, size, at, mat = 'candleDown') {
  const [w, h, d] = size;
  const bot = at[1] - h / 2;
  const wallH = h - 1;
  const wallY = bot + 1 + wallH / 2;
  const x0 = at[0] - w / 2;
  const z0 = at[2] - d / 2;
  return [
    box({ id: `${id}-floor`, at: [at[0], bot + 0.5, at[2]], size: [w, 1, d], mat }),
    box({ id: `${id}-n`, at: [at[0], wallY, z0 + 0.5], size: [w, wallH, 1], mat }),
    box({ id: `${id}-s`, at: [at[0], wallY, z0 + d - 0.5], size: [w, wallH, 1], mat }),
    box({ id: `${id}-w`, at: [x0 + 0.5, wallY, at[2]], size: [1, wallH, d - 2], mat }),
    box({ id: `${id}-e`, at: [x0 + w - 0.5, wallY, at[2]], size: [1, wallH, d - 2], mat }),
  ];
}

export function island(id, r, h, at, mat = 'stone') {
  return [
    cylinder({ id, at, r, h, mat }),
    disc({ id: `${id}-rim`, at: [at[0], at[1] + h + 0.04, at[2]], r, mat: 'neon' }),
  ];
}

export function podIsle(id, at) {
  return island(id, 4, 3, at);
}

/** Link boxes every 2 m. Long axis is world X; L04's chains run east. */
export function chain(id, from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  const n = Math.max(1, Math.round(len / 2));
  const alongX = Math.abs(dx) >= Math.abs(dz);
  const size = alongX ? [2.4, 0.6, 1.6] : [1.6, 0.6, 2.4];
  const parts = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    parts.push(box({
      id: `${id}-${i + 1}`,
      at: [from[0] + dx * t, from[1] + dy * t, from[2] + dz * t],
      size,
      mat: 'trim',
    }));
  }
  return parts;
}

export function crate(id, at) {
  return box({ id, at, size: [1.6, 1.2, 1.6], mat: 'crate' });
}

export function server(id, at) {
  return [
    box({ id, at, size: [1.2, 2, 2.4], mat: 'metal' }),
    box({ id: `${id}-strip`, at: [at[0], at[1] + 1.25, at[2]], size: [0.5, 0.5, 2.4], mat: 'neon' }),
  ];
}

export function ticker(id, at, length) {
  return box({ id, at, size: [0.6, 2, length], mat: 'neon' });
}

export function hut(id, size, at) {
  return [box({ id, at, size, mat: 'concrete' })];
}

export function sign(id, at, text) {
  const boardY = at[1];
  return [
    cylinder({ id: `${id}-pole`, at: [at[0], boardY - 3, at[2]], r: 0.25, h: 2, mat: 'metal' }),
    { ...box({ id, at, size: [4, 2, 0.5], mat: 'neon' }), text },
  ];
}

export function vent(id, at) {
  return [
    cylinder({ id, at, r: 3, h: 0.5, mat: 'metal' }),
    disc({ id: `${id}-rim`, at: [at[0], at[1] + 0.52, at[2]], r: 3, mat: 'neon' }),
  ];
}

/** Floor, roof and side walls. Ends stay open so the connector can be walked. */
export function tunnel(id, { length, floorAt, innerH = 4 }) {
  const [x, y, z] = floorAt;
  const wallH = innerH + 2;
  const wallY = (y - 0.5) + wallH / 2;
  return [
    box({ id: `${id}-floor`, at: [x, y, z], size: [length, 1, 8], mat: 'metal' }),
    box({ id: `${id}-roof`, at: [x, y + innerH + 1, z], size: [length, 1, 8], mat: 'metal' }),
    box({ id: `${id}-n`, at: [x, wallY, z - 3.5], size: [length, wallH, 1], mat: 'metal' }),
    box({ id: `${id}-s`, at: [x, wallY, z + 3.5], size: [length, wallH, 1], mat: 'metal' }),
  ];
}

export function pylon(id, at, mat = 'metal') {
  const top = at[1] + 5;
  return [
    cylinder({ id, at, r: 0.8, h: 5, mat }),
    sphere({ id: `${id}-core`, at: [at[0], top + 1.2, at[2]], r: 1.2, mat: 'neon' }),
    box({ id: `${id}-bar1`, at: [at[0] - 0.8, at[1] + 0.5, at[2] + 1.2], size: [0.5, 1, 0.5], mat: 'trim' }),
    box({ id: `${id}-bar2`, at: [at[0], at[1] + 1, at[2] + 1.2], size: [0.5, 2, 0.5], mat: 'trim' }),
    box({ id: `${id}-bar3`, at: [at[0] + 0.8, at[1] + 1.5, at[2] + 1.2], size: [0.5, 3, 0.5], mat: 'trim' }),
  ];
}

export function validatorNode(id, at) {
  return [
    box({ id, at: [at[0], at[1] + 1.5, at[2]], size: [2, 3, 2], mat: 'metal' }),
    sphere({ id: `${id}-core`, at: [at[0], at[1] + 3.9, at[2]], r: 0.9, mat: 'gold' }),
  ];
}

function spans(from, to, gaps) {
  const cuts = (gaps || []).slice().sort((a, b) => a.at - b.at);
  const out = [];
  let cursor = from;
  for (const g of cuts) {
    const a = g.at - g.width / 2;
    const b = g.at + g.width / 2;
    if (a - cursor >= 0.5) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (to - cursor >= 0.5) out.push([cursor, to]);
  return out;
}

/**
 * Four force-field walls and a lid. `gaps` are door openings from the floor:
 * { side: 'w'|'e'|'n'|'s', at, width, height }. The door slab itself is a mechanism.
 */
export function lockRoom(id, { min, max, gaps = [] }) {
  const thick = 0.6;
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const parts = [];
  const ySize = y1 - y0;
  const yMid = y0 + ySize / 2;
  function add(partId, at, size) {
    if (size.some((n) => n < 0.5)) return;
    parts.push(box({ id: `${id}-${partId}`, at, size, mat: 'forceField', tag: 'lockWall' }));
  }
  const on = (side) => gaps.filter((g) => g.side === side).map((g) => ({ at: g.at, width: g.width }));
  for (const [a, b] of spans(z0, z1, on('w'))) {
    add(`w-${Math.round(a)}`, [x0, yMid, (a + b) / 2], [thick, ySize, b - a]);
  }
  for (const [a, b] of spans(z0, z1, on('e'))) {
    add(`e-${Math.round(a)}`, [x1, yMid, (a + b) / 2], [thick, ySize, b - a]);
  }
  for (const [a, b] of spans(x0, x1, on('n'))) {
    add(`n-${Math.round(a)}`, [(a + b) / 2, yMid, z0], [b - a, ySize, thick]);
  }
  for (const [a, b] of spans(x0, x1, on('s'))) {
    add(`s-${Math.round(a)}`, [(a + b) / 2, yMid, z1], [b - a, ySize, thick]);
  }
  for (const g of gaps) {
    const lintel = y1 - (y0 + g.height);
    if (lintel < 0.5) continue;
    const y = y0 + g.height + lintel / 2;
    if (g.side === 'w') add(`w-top-${g.at}`, [x0, y, g.at], [thick, lintel, g.width]);
    if (g.side === 'e') add(`e-top-${g.at}`, [x1, y, g.at], [thick, lintel, g.width]);
    if (g.side === 'n') add(`n-top-${g.at}`, [g.at, y, z0], [g.width, lintel, thick]);
    if (g.side === 's') add(`s-top-${g.at}`, [g.at, y, z1], [g.width, lintel, thick]);
  }
  add('lid', [(x0 + x1) / 2, y1 + thick / 2, (z0 + z1) / 2], [x1 - x0 + thick, thick, z1 - z0 + thick]);
  return parts;
}

/** Dotted fire curtain. Skips a ~8 m gap on the west for the gate. */
export function fireRing(id, { at, r, h = 4 }) {
  const n = 48;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let d = Math.abs(a - Math.PI);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < 0.55) continue;
    parts.push(box({
      id: `${id}-${i}`,
      at: [at[0] + Math.cos(a) * r, h / 2, at[2] + Math.sin(a) * r],
      size: [3.2, h, 3.2],
      mat: 'lava',
      tag: 'fireRing',
    }));
  }
  return parts;
}
