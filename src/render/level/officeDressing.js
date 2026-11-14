// The interior islands share the collision footprints authored in the level.
const SIDES = {
  S1: [
    ['clock', 12.5, 3.5, .7],
    ['planter', 5, 0, 2.3], ['planter', 20, 0, 2.3],
    ['planter', 13, 0, -2.1, 180], ['planter', 34, 0, -2.1, 180],
    ['elevator', 34, 0, 1.1], ['elevator', 28, 0, -.95, 180],
  ],
  S2: [
    ['elevator', 36, 0, 1.1], ['elevator', 34, 0, -.95, 180],
    ['planter', 30, 0, 2.3], ['planter', 40, 0, -2.1, 180],
  ],
  S3: [
    ['conduit', 12, 0, 1.2], ['conduit', 33, 0, 1.2],
    ['conduit', 21, 0, -1.2, 180], ['conduit', 39, 0, -1.2, 180],
    ['elevator', 42, 0, 1.1],
  ],
  S4: [
    ['fan', 11, 0, 3.5, -8], ['fan', 24, 0, -3.8, 179, 1.15],
    ['fan', 52, 0, 3.6, 0, 1.08], ['conduit', 7.5, 0, 3.3],
    ['dish', 31, 0, 5, 0, 1.3], ['dish', 54, 0, -4.8, 199, 1.13],
  ],
};

export function officePlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !SIDES[sec.id]) return [];
  const start = sec.start[0] - 3.5;
  const [span, , width] = floor.size;
  const center = floor.at[2], north = center - width / 2, south = center + width / 2;
  const first = floor.at[0] - start - span / 2;
  const end = first + span;
  const roof = sec.id === 'S4';
  const out = [];
  const add = (name, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `office_${name}`, at: [start + x, y, z], yaw, scale, replace });

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const isNorth = side === 'N';
    const yaw = isNorth ? 0 : 180;
    const bays = roof ? 8 : 6;
    const bay = wall.size[0] / bays;
    for (let i = 0; i < bays; i++) {
      const x = first + bay * (i + .5);
      add(roof ? 'parapet' : 'wall', x, 0, wall.at[2], yaw,
        [bay / 2, roof ? 1.85 : wall.size[1], wall.size[2] / 2], [wall.id]);
    }
    if (roof) continue;
    for (const x of [4, 14, 25, 37, 45]) {
      add('pilaster', x, 0, isNorth ? north + .63 : south - .63, yaw, [1, wall.size[1] / 7.75, 1]);
    }
  }

  for (const [name, x, y, z, yaw, scale] of SIDES[sec.id]) {
    const edge = z > 0 || (z === 0 && yaw !== 180) ? north : south;
    add(name, x, y, edge + z, yaw, scale);
  }
  if (roof) {
    add('pad', 37, .018, center, 0, [2.55, 1, 2.4]);
    add('parapet', first, 0, center, 90, [width / 2, 1.48, .35]);
    add('parapet', end, 0, center, -90, [width / 2, 1.48, .35]);
    for (const [z, yaw] of [[north - 2.6, 0], [south + 2.6, 180]]) {
      add('skirt', (first + end) / 2, -16.8, z, yaw, [span / 2, 140, 2.65]);
    }
    for (const [side, edge] of [[-1, north], [1, south]]) {
      for (let i = 0; i < 5; i++) {
        const variant = (i * 3 + (side > 0 ? 2 : 0)) % 5;
        const model = i % 2 ? 'tower' : 'annex';
        add(model, -14 + i * 24 + variant * 2.7, -19 - variant * 1.8,
          edge + side * (19 + variant * 8), side > 0 ? 180 : 0,
          [1.16 + variant * .14, 1.45 + variant * .15, 1.20]);
      }
    }
    add('annex', end + 35, -23, north - 6.5, -72, [1.4, 1.58, 1.35]);
    return out;
  }

  const ceiling = prims.get(`${sec.id}-ceiling`);
  const height = ceiling.at[1] - ceiling.size[1] / 2;
  const bays = 6;
  const bay = span / bays;
  for (let i = 0; i < bays; i++) {
    add('soffit', first + bay * (i + .5), height, center, 0, [bay / 8, 1, width / 24.3], [ceiling.id]);
  }
  for (const [id, yaw] of [['rear', 90], ['end', -90]]) {
    const wall = prims.get(`${sec.id}-${id}`);
    add('wall', wall.at[0] - start, 0, center, yaw, [width / 2, height, .30], [wall.id]);
  }
  add('portal', end - 3.5, 0, center, 0, [1, height / 6.83, width / 23.35]);
  add('elevator', end - .8, 0, center, -90, [1.2, 1.04, 1]);

  if (sec.id === 'S1') {
    const desk = prims.get('S1-desk');
    add('reception', desk.at[0] - start, 0, desk.at[2] + .35, 0, 1, [desk.id]);
    add('atrium_sign', 8, height - 2.07, center - 4.1);
  }
  for (const prim of prims.values()) {
    if (prim.id.startsWith('S2-pod')) {
      const southRow = prim.id.includes('podS');
      for (const offset of [-1.5, 1.5]) {
        add('cubicle', prim.at[0] - start + offset, 0, prim.at[2], southRow ? 180 : 0, 1, [prim.id]);
      }
    }
    if (prim.id.startsWith('S3-rack')) {
      const southRow = prim.id.includes('rackS');
      for (const offset of [-1.59, 0, 1.59]) {
        add('server', prim.at[0] - start + offset, 0, prim.at[2], southRow ? 180 : 0, 1, [prim.id]);
      }
    }
  }
  return out;
}
