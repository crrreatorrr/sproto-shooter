// Section-local scenery for the playable Hellfire Caldera route.
const FEATURES = {
  S1: [
    ['overhang', 8.4, 4.45, 1.76, 2, [1.08, 1.16, 1.14]],
    ['overhang', 17.1, 5.02, 1.35, -6, [1.06, 1.30, 1.07]],
    ['spires', 10.1, -.7, -4.29, 5, [1.49, 1.60, 1.35]],
    ['spires', 26.5, -1.4, -4.28, 12, [1.15, 1.13, 1.26]],
    ['scree', 11.8, .02, 1.51, 14], ['scree', 16.2, .02, 1.42, 175, .83],
    ['brazier', 8.0, .02, 3.28], ['brazier', 19.5, .02, 3.0, -11, .95],
    ['brazier', 29.1, .02, 20.3, 180, .98], ['obelisk', 44.6, .05, 1.53, 15, 1.05],
    ['obelisk', 44.9, .05, 20.35, 165, .92],
  ],
  S2: [
    ['spires', 29.1, -2.45, -4.47, -7, [1.24, 1.08, 1.15]],
    ['spires', 38.2, -2.65, 26.12, 158, [1.20, 1.32, 1.25]],
    ['brazier', 4.9, .02, 1.67, 0, .84], ['brazier', 18.6, .02, 20.3, 164, .85],
    ['brazier', 39.2, .02, 1.64, 31, 1.10], ['brazier', 46.5, .02, 20.25, 168, .92],
    ['scree', 30.4, .012, 3.03, 19, .72], ['scree', 25.9, .012, 2.98, -4, .60],
  ],
  S3: [
    ['seal', 24.25, .018, 11, 0, [1.16, 1, 1.16]],
    ['shrine', 56.8, -.025, 7.3, -90, [1.32, 1.47, 1.21]],
    ['obelisk', 37.0, .03, 1.63, -25, 1.35], ['obelisk', 33.6, .03, 20.65, 163, 1.35],
    ['obelisk', 12.5, .03, 1.61, 17, 1.13], ['obelisk', 12.8, .03, 20.34, 162, 1.13],
    ['brazier', 20.1, .02, 1.73, 6, 1.04], ['brazier', 22.7, .02, 20.2, 170, 1.04],
    ['spires', 44.4, -2.77, -6.6, -21, [1.20, 1.45, 1.16]],
  ],
  S4: [
    ['spires', 10.6, -2.4, -4.9, -23, [1.44, 1.39, 1.21]],
    ['spires', 26.3, -2.2, -4.82, 18, [1.46, 2.05, 1.24]],
    ['spires', 22.7, -2.1, 27.4, 177, [1.20, 1.77, 1.23]],
    ['spires', 45.7, -3.1, 26.35, 141, [1.61, 1.91, 1.39]],
    ['brazier', 13.0, .02, 20.38, 180, .95], ['obelisk', 41.8, .03, 1.61, 6, 1.20],
    ['obelisk', 41.2, .03, 20.31, 180, 1.20],
  ],
};

export function calderaPlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const length = floor.size[0] - 1;
  const start = floor.at[0] - length / 2;
  const centre = floor.at[2];
  const eruption = sec.id === 'S4';
  const out = [];
  const place = (model, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model, at: [start + x, y, z], yaw, scale, replace });
  const add = (name, ...args) => place(`caldera_${name}`, ...args);
  const magma = (name, ...args) => place(`underworks_${name}`, ...args);

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [width, height, depth] = wall.size;
    const bays = Math.ceil(width / 7);
    const span = width / bays;
    const north = side === 'N', sign = north ? -1 : 1;
    const yaw = north ? 0 : 180;
    for (let i = 0; i < bays; i++) {
      add('wall', span * (i + .5) - .5, wall.at[1] - height / 2, wall.at[2],
        yaw, [span / 2, height, depth / 2], [wall.id]);
    }
    add('apron', length / 2, -.42, centre + sign * 13.28, 0, [(length + 1.25) / 2, 1, 2.4]);
    for (let i = 0; i < 5; i++) {
      const shape = (i * 7 + (north ? 0 : 3) + Number(sec.id.slice(1))) % 5;
      const x = i * 14.5 - 7 + shape;
      const z = centre + sign * (23 + (shape % 3) * 3.6);
      add('spires', x, -4.35, z, i * 37 + yaw, [1.07 + shape * .14, 1.19 + shape * .20, 1.15 + shape * .15]);
    }
    magma('magma', length / 2, -3.9, centre + sign * 25, 0, [length * .82, 1, 10]);
    for (const x of (eruption ? [14, 28, 41] : [23, 41])) {
      const z = centre + sign * (eruption ? 15.96 : 19.07);
      const h = eruption ? 10.7 + x % 4 * .62 : 7.1 + x % 5 * .38;
      add('spires', x - .47, -3.64, z + sign * 2.11, yaw, [.69, h / 6.3, .9]);
      add('scree', x + .28, h - 4.12, z + sign * .46, yaw, [1.20, .79, .96]);
      magma('lavafall', x, -3.87, z, yaw, [1.04 + x % 5 * .17, h, 1]);
    }
  }

  add('apron', length + 4.72, -.42, centre, 0, [5.06, 1, 11.35]);
  add('spires', length + 13.8, -5.45, 24.2, 147, [1.62, eruption ? 2.03 : 1.63, 1.48]);
  add('spires', length + 17.8, -4.95, -4.6, -19, [1.49, eruption ? 1.88 : 1.52, 1.54]);
  for (const feature of FEATURES[sec.id]) add(...feature);
  for (const m of sec.mechanisms || []) {
    if (m.kind === 'bridge') {
      add('bridge', (m.from[0] + m.to[0]) / 2 - start, .001, m.from[2], 0,
        [(m.to[0] - m.from[0]) / 6, 1, m.width / 2], [`marker:${m.id}`]);
    }
    if (m.kind === 'hazard') {
      const { min, max } = m;
      magma('magma', (min[0] + max[0]) / 2 - start, .008, (min[2] + max[2]) / 2,
        0, [(max[0] - min[0]) / 2, 1, (max[2] - min[2]) / 2]);
    }
  }
  return out;
}
