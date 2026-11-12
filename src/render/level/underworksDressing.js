// Position set dressing relative to the slab. The rail and lava art follow the authored mechanisms.
const FEATURES = {
  S1: [
    ['roof', 5.1, 6.45, 11], ['roof', 10.7, 6.45, 11], ['roof', 16.3, 6.45, 11],
    ['roof', 29.1, 6.45, 11], ['roof', 34.7, 6.45, 11], ['roof', 40.3, 6.45, 11],
    ['gantry', 2.5, 0, 11], ['gantry', 20.8, 0, 11], ['gantry', 24.6, 0, 11],
    ['hoist', 10, .1, -2.64], ['hoist', 26, .2, 25.2, 180],
    ['cart', 12, .5, -2.45, -12], ['pipe', 25.8, 0, -1.9],
  ],
  S2: [
    ['gantry', 4.8, 0, 11], ['gantry', 17, 0, 11], ['gantry', 30, 0, 11], ['gantry', 43, 0, 11],
    ['hoist', 11.5, .48, -2.38], ['hoist', 18, .23, 24.36, 180], ['hoist', 25.5, .68, -2.12],
    ['cart', 11.5, 2.68, -2.35, -6], ['cart', 18, 2.43, 24.3, 171],
    ['cart', 25.5, 2.88, -2.12, 3], ['pipe', 32, -.1, 24, 180],
    ['chimney', 16, -1.7, -7, 20, 1.06], ['chimney', 40, -1.7, 29, 20, 1.4],
  ],
  S3: [
    ['roof', 5.4, 7.28, 11], ['roof', 10.99, 7.28, 11],
    ['gantry', 14, 0, 11, 0, [1, 1.13, 1]], ['gantry', 36, 0, 11, 0, [1, 1.13, 1]],
    ['furnace', 10, 1.55, -2.25], ['furnace', 18, 1.55, -2.25],
    ['furnace', 24, 1.18, 24.35, 180], ['furnace', 39, 1.55, -2.25],
    ['pipe', 27, -.35, -2.65], ['chimney', 40, .23, 26.1],
  ],
  S4: [
    ['gantry', 5.5, 0, 11, 0, [1, 1.19, 1]], ['gantry', 24, 0, 11, 0, [1, 1.19, 1]],
    ['reactor', 16.5, .42, -4.1, -7, [1.55, 1.67, 1.28]],
    ['reactor', 33, .64, 26.9, 188, [1.46, 1.57, 1.3]],
    ['furnace', 9.5, 1.26, 24.75, 180], ['furnace', 40.5, 1.35, -2.6],
    ['pipe', 8, -.26, -6.45], ['pipe', 41.5, -.26, 25.5, 180],
    ['chimney', 12.4, -.3, -8.1, 0, 1.44], ['chimney', 38.4, -1, 32, 0, 1.50],
  ],
};
const WALLS = { S1: 'basalt_wall', S2: 'basalt_wall', S3: 'steel_wall', S4: 'steel_wall' };

export function underworksPlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const start = floor.at[0] - (floor.size[0] - 1) / 2;
  const length = floor.size[0] - 1;
  const out = [];
  const add = (name, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `underworks_${name}`, at: [start + x, y, z], yaw, scale, replace });

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [width, height, depth] = wall.size;
    const bays = Math.ceil(width / 7);
    const span = width / bays;
    for (let i = 0; i < bays; i++) {
      add(WALLS[sec.id], span * (i + .5) - .5, wall.at[1] - height / 2, wall.at[2],
        side === 'N' ? 0 : 180, [span / 2, height, depth / 2], [wall.id]);
    }
  }
  for (const feature of FEATURES[sec.id]) add(...feature);

  // Cavern shelves and stack silhouettes are visible above the walls and from the cart lane.
  const section = Number(sec.id.slice(1));
  for (const [side, z] of [[0, -9], [1, 31]]) {
    for (let i = 0; i < 7; i++) {
      const shape = (i * 3 + section + side * 2) % 5;
      add('basalt_cluster', i * 10.5 - 7 + shape, -3, z + (side ? 1 : -1) * shape * 1.1,
        (i * 58 + side * 180) % 360, [1.02 + shape * .12, 1.06 + shape * .19, 1.15 + shape * .12]);
    }
    add('magma', length / 2, -3.9, z + (side ? 7 : -7), 0, [length * .82, 1, 13]);
    add('chimney', 25 + side * 12, -2.5, z + (side ? 12 : -12), 18 * side, 1.65);
  }
  add('tunnel', length - 1.45, 0, 11);
  add('basalt_cluster', length + 15, -5, 2.7, 16, [1.42, 2.16, 1.44]);
  add('basalt_cluster', length + 19, -5.5, 19.6, 97, [1.29, 1.78, 1.55]);
  add('basalt_cluster', length + 29, -8.5, 12.5, 10, [1.75, 2.45, 1.48]);
  if (sec.id === 'S1') {
    for (const [x, z, yaw] of [[5, -4.9, 3], [15, 26.8, 169], [28, -4.3, 20], [38, 26.8, 180]]) {
      add('basalt_cluster', x, -.6, z, yaw, [.96, 1.08, 1.16]);
    }
  } else {
    add('lavafall', length + 25, -4.0, 12.5, -90, [1.15, 12.5, 1]);
    add('lavafall', 29, -3.9, -10.4, 0, [.86, 7.2, 1]);
    add('lavafall', 32, -3.9, 34.1, 180, [.85, 8.6, 1]);
  }

  for (const mechanism of sec.mechanisms || []) {
    if (mechanism.kind === 'rail') {
      const { from, to } = mechanism;
      const railLength = to[0] - from[0];
      const segments = Math.ceil(railLength / 4);
      const span = railLength / segments;
      for (let i = 0; i < segments; i++) {
        add('track', from[0] - start + (i + .5) * span, 0, from[2], 0,
          [span / 4, 1, 1], [`marker:${mechanism.id}`]);
      }
    }
    if (mechanism.kind === 'hazard') {
      const { min, max } = mechanism;
      add('magma', (min[0] + max[0]) / 2 - start, .007, (min[2] + max[2]) / 2,
        0, [(max[0] - min[0]) / 2, 1, (max[2] - min[2]) / 2]);
    }
    if (mechanism.kind === 'crusher') {
      const [x] = mechanism.at;
      // Legacy crusher markers are visual only. Keep the moving press behind the parapet.
      add('press', x - start, 2.28, -2.15, 0, 1, [`marker:${mechanism.id}`]);
    }
  }
  return out;
}
