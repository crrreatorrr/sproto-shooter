// Positive Z feature coordinates are measured from the original south edge at 22 m.
// North features keep their offsets from the north edge.
const FEATURES = {
  S1: [
    ['trailer', 17, .5, -2.1, 6], ['trailer', 35, .15, 24.4, 173],
    ['lamp', 6, 0, -.65], ['lamp', 21, 0, 22.55, 180],
    ['lamp', 37, 0, -.65], ['lamp', 51, 0, 22.55, 180],
    ['depot', 49, .18, -3.4], ['lamp', 49, 0, -.65],
  ],
  S2: [
    ['crane', 18, -.22, -4.7, -6], ['depot', 7, 0, 25, 180],
    ['depot', 15, 0, 25, 180], ['fan', 15, 3.54, 24.4, 180],
    ['trailer', 27, 0, 25.2, 176], ['depot', 45, .16, -3.15],
    ['lamp', 12, 0, -.65], ['lamp', 35, 0, -.65], ['lamp', 36, 0, 22.6, 180],
  ],
  S3: [
    ['slab', 7, -.4, -4.3, 0, [1.10, 1.24, 1.10]],
    ['tower', 16, -.25, -4.8, 0, [1.12, 1.17, 1.08]],
    ['slab', 26, -.5, -4.4, 0, [1.22, .91, 1.04]],
    ['tower', 38, -.2, -4.95, 0, [1.42, 1.34, 1.23]],
    ['slab', 46, -.4, -4.45, 0, [1.07, 1.10, 1.09]],
    ['tower', 9, -.2, 27.2, 180, [1.35, 1.23, 1.2]],
    ['slab', 20, -.3, 26.7, 180, [1.45, 1.04, 1.10]],
    ['tower', 30, -.3, 27.3, 180, [1.18, 1.31, 1.19]],
    ['slab', 43, -.4, 27.1, 180, [1.48, 1.19, 1.14]],
    ['fan', 7, 10.76, -4.3], ['fan', 26, 8.8, -3.4],
    ['lamp', 13, 0, -.63], ['lamp', 33, 0, 22.58, 180],
  ],
  S4: [
    ['shop', 9, 0, -3.05], ['canopy', 9, 4.46, -1.78],
    ['fan', 9, 5.65, -3.05],
    ['shop', 28, 0, 25.05, 180], ['canopy', 28, 4.46, 23.78, 180],
    ['depot', 20, 0, -4.2], ['trailer', 38, .22, -2.1],
    ['slab', 37, -.3, 28.2, 180, [1.27, .84, 1.04]],
    ['lamp', 3, 0, 22.6, 180], ['lamp', 15, 0, -.65],
    ['lamp', 32, 0, -.65], ['lamp', 44, 0, 22.6, 180],
    ['depot', 54, 0, 25.4, 180], ['lamp', 57, 0, -.65], ['lamp', 61, 0, 22.6, 180],
  ],
};

const WALLS = { S1: 'barrier', S2: 'cladding', S3: 'cladding', S4: 'masonry' };

export function skylinePlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const north = floor.at[2] - floor.size[2] / 2;
  const south = floor.at[2] + floor.size[2] / 2;
  const start = sec.start[0] - 3.5;
  const out = [];
  const add = (name, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `skyline_${name}`, at: [start + x, y, z], yaw, scale, replace });

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [length, height, depth] = wall.size;
    const bays = Math.ceil(length / 5.6);
    const span = length / bays;
    for (let i = 0; i < bays; i++) {
      add(WALLS[sec.id], wall.at[0] - start - length / 2 + span * (i + .5), wall.at[1] - height / 2, wall.at[2],
        side === 'N' ? 0 : 180, [span / 2, height, depth / 2], [wall.id]);
    }
  }
  for (const [name, x, y, z, yaw, scale] of FEATURES[sec.id]) {
    const edgeZ = z >= 22 ? south + z - 22 : north + z;
    add(name, x, y, edgeZ, yaw, scale);
  }

  // Use compact silhouettes for the buildings behind the original close-up props.
  const variant = Number(sec.id.slice(1));
  for (const [side, z] of [[0, north - 18], [1, south + 18]]) {
    const direction = side === 0 ? -1 : 1;
    for (let i = 0; i < 6; i++) {
      const pattern = i * 7 + side * 5 + variant * 3;
      const low = (i + variant + side) % 3 === 0;
      add(low ? 'midrise' : 'spire', i * 16 - 14 + (pattern % 3) * 1.25,
        -8, z + direction * (pattern % 4) * 4.2, side * 180 + (pattern % 3 - 1) * 12,
        [1.05 + (pattern % 4) * .17, .92 + (pattern % 5) * .19, 1.08 + (pattern % 3) * .18]);
    }
  }
  // Industrial links on the skyline, separated from the playable deck by open air.
  const end = floor.at[0] - start + floor.size[0] / 2;
  const linkZ = variant % 2 ? south + 32 : north - 32;
  const linkX = [23, 41, 18, 47][variant - 1];
  add('spire', linkX - 12, -8, linkZ, 0, [1, 1.20, 1]);
  add('spire', linkX + 12, -8, linkZ, 0, [1.1, 1.32, 1.08]);
  add('skybridge', linkX, 5.5, linkZ, 0, [1.6, 1, 1]);
  add('midrise', end + 23, -6.8, north - 8.2, 90, 1.42);
  add('spire', end + 31, -8.2, south + 6.8, 90, 1.35);
  return out;
}
