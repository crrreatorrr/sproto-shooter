// Position set dressing relative to the slab. The rail and lava art follow the authored mechanisms.
const FEATURES = {
  S1: [
    ['roof', 5.1, 6.45, 11], ['roof', 10.7, 6.45, 11], ['roof', 16.3, 6.45, 11],
    ['roof', 39.1, 6.45, 11], ['roof', 44.7, 6.45, 11], ['roof', 50.3, 6.45, 11],
    ['gantry', 2.5, 0, 11], ['gantry', 20.8, 0, 11], ['gantry', 44.7, 0, 11],
    ['hoist', 10, .1, -2.64], ['hoist', 26, .2, 25.2, 180],
    ['cart', 12, .5, -2.45, -12], ['pipe', 25.8, 0, -1.9],
  ],
  S2: [
    ['gantry', 4.8, 0, 11], ['gantry', 17, 0, 11], ['gantry', 37, 0, 11], ['gantry', 55, 0, 11],
    ['hoist', 11.5, .48, -2.38], ['hoist', 18, .23, 24.36, 180], ['hoist', 25.5, .68, -2.12],
    ['cart', 11.5, 2.68, -2.35, -6], ['cart', 18, 2.43, 24.3, 171],
    ['cart', 25.5, 2.88, -2.12, 3], ['pipe', 32, -.1, 24, 180],
    ['chimney', 16, -1.7, -7, 20, 1.06], ['chimney', 40, -1.7, 29, 20, 1.4],
  ],
  S3: [
    ['roof', 5.4, 7.28, 11], ['roof', 10.99, 7.28, 11],
    ['gantry', 14, 0, 11, 0, [1, 1.13, 1]], ['gantry', 49, 0, 11, 0, [1, 1.13, 1]],
    ['furnace', 10, 1.55, -2.25], ['furnace', 18, 1.55, -2.25],
    ['furnace', 24, 1.18, 24.35, 180], ['furnace', 50, 1.55, -2.25],
    ['pipe', 27, -.35, -2.65], ['chimney', 40, .23, 26.1], ['pipe', 49, -.25, 25.9, 180],
  ],
  S4: [
    ['gantry', 5.5, 0, 11, 0, [1, 1.19, 1]], ['gantry', 24, 0, 11, 0, [1, 1.19, 1]],
    ['reactor', 16.5, .42, -4.1, -7, [1.55, 1.67, 1.28]],
    ['reactor', 44, .64, 26.9, 188, [1.46, 1.57, 1.3]],
    ['furnace', 9.5, 1.26, 24.75, 180], ['furnace', 52.5, 1.35, -2.6],
    ['pipe', 8, -.26, -6.45], ['pipe', 41.5, -.26, 25.5, 180], ['hoist', 57, .15, 25.1, 180],
    ['chimney', 12.4, -.3, -8.1, 0, 1.44], ['chimney', 38.4, -1, 32, 0, 1.50],
  ],
};
const WALLS = { S1: 'basalt_wall', S2: 'basalt_wall', S3: 'steel_wall', S4: 'steel_wall' };

export function underworksPlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const start = sec.start[0] - 3.5;
  const length = floor.at[0] + (floor.size[0] - 1) / 2 - start;
  const width = floor.size[2];
  const north = floor.at[2] - width / 2;
  const south = floor.at[2] + width / 2;
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
      add(WALLS[sec.id], wall.at[0] - start - width / 2 + span * (i + .5), wall.at[1] - height / 2, wall.at[2],
        side === 'N' ? 0 : 180, [span / 2, height, depth / 2], [wall.id]);
    }
  }
  // Feature rows retain their original offsets from the nearest edge or the centreline.
  for (const [name, x, y, z, yaw, scale = 1] of FEATURES[sec.id]) {
    if (name === 'roof' || name === 'gantry') {
      const [sx, sy, sz] = Array.isArray(scale) ? scale : [scale, scale, scale];
      add(name, x, y, floor.at[2], yaw, [sx, sy, sz * width / 22]);
    } else {
      add(name, x, y, z < 11 ? north + z : south + z - 22, yaw, scale);
    }
  }

  // Light the chasm with animated lava below the deck and silhouettes set into the rock.
  const variant = Number(sec.id.slice(1));
  for (const [direction, edge] of [[-1, north], [1, south]]) {
    const yaw = direction > 0 ? 180 : 0;
    const shore = edge + direction * 18;
    for (let i = 0; i < 5; i++) {
      const shape = (i * 3 + variant + (direction > 0 ? 2 : 0)) % 5;
      add('cavern_rib', i * (length / 4) - 5 + shape * 1.8, -9 - shape,
        shore + direction * shape * 3, yaw + 11 * (shape - 2),
        [1.04 + shape * .09, .95 + shape * .19, 1.25 + shape * .1]);
    }
    add('magma', length / 2, -5.1, edge + direction * 16, 0, [length * .73, 1, 13]);
    add('distant_smelter', length * (direction < 0 ? .57 : .32), -5.15,
      edge + direction * 30, yaw, [1.35, 1.16, 1.25]);
    const fallX = length * (direction < 0 ? .77 : .56);
    add('cavern_rib', fallX, -8.8, shore + direction * 8, yaw, [1.16, 1.35, 1.05]);
    add('lavafall', fallX - 1.2, -5.11, shore + direction * 4.6, yaw, [1.15, 13.5, 1]);
  }
  add('tunnel', length - 1.45, 0, floor.at[2], 0, [1, 1, width / 22]);
  add('cavern_rib', length + 21, -11, north - 4.7, 29, [1.47, 1.68, 1.65]);
  add('cavern_rib', length + 33, -12, south + 5.4, 97, [1.56, 1.81, 1.62]);
  if (sec.id === 'S1') {
    for (const [x, z, yaw] of [[5, north - 4.9, 3], [15, south + 4.8, 169], [29, north - 4.3, 20], [50, south + 4.8, 180]]) {
      add('basalt_cluster', x, -.6, z, yaw, [.96, 1.08, 1.16]);
    }
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
      add('press', x - start, 2.28, north - 2.15, 0, 1, [`marker:${mechanism.id}`]);
    }
  }
  return out;
}
