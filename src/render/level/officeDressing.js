// Decorative props line the existing corridor. The roof retains an open combat floor.
const FEATURES = {
  S1: [
    ['reception', 10.9, .15, -1.42, 0, [1.15, 1.4, 1]],
    ['clock', 10.9, 2.10, -1.99, 0, [1.30, 1.14, 1]],
    ['planter', 6.75, .02, -1.21], ['planter', 15.05, .02, -1.21],
    ['planter', 12.8, .02, 23.15, 180], ['planter', 34.9, .02, 23.15, 180],
    ['elevator', 30.2, .02, 22.7, 180], ['elevator', 36.3, .02, -.62],
  ],
  S2: [
    ['elevator', 34, 0, -.61], ['elevator', 34, 0, 22.61, 180],
    ['planter', 31, .02, -.82], ['planter', 37, .02, 22.9, 180],
  ],
  S3: [
    ['conduit', 13, .05, -1.75], ['conduit', 30, .05, -1.75], ['conduit', 38, .05, 23.6, 180],
    ['conduit', 18, .05, 23.6, 180], ['elevator', 42, .02, -.58],
  ],
  S4: [
    ['fan', 11, 1.77, -2.34, -8], ['fan', 19, 1.78, 24.5, 179, 1.15],
    ['fan', 38, 1.85, -2.38, 0, 1.08], ['conduit', 8.75, -.22, -3.7],
    ['dish', 29, 1.98, -2.85, 0, 1.30], ['dish', 41, 1.98, 25.3, 199, 1.13],
    ['pad', 25, .016, 11, 0, [1.65, 1, 1.43]],
    ['skirt', 22, -.27, -2.82, 0, [21, 17.2, 2.73]],
    ['skirt', 24, -.27, 24.83, 180, [20, 17.5, 2.72]],
  ],
};

export function officePlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const length = floor.size[0] - 1;
  const start = floor.at[0] - length / 2;
  const roof = sec.id === 'S4';
  const out = [];
  const add = (name, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `office_${name}`, at: [start + x, y, z], yaw, scale, replace });
  const ceiling = sec.id === 'S1' ? 7.6 : sec.id === 'S2' ? 5.55 : 6.65;

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [width, height, depth] = wall.size;
    const north = side === 'N';
    const yaw = north ? 0 : 180;
    const bays = 8, span = width / bays;
    for (let i = 0; i < bays; i++) {
      const x = span * (i + .5) - .5;
      const open = sec.id === 'S1' ? (north ? i <= 2 : i % 3 === 1)
        : sec.id === 'S2' ? i !== 7 : i > 0 && i < 7;
      const model = roof ? 'parapet' : open ? 'facade' : 'wall';
      add(model, x, wall.at[1] - height / 2, wall.at[2], yaw, [span / 2, roof ? 2.12 : height, depth / 2], [wall.id]);
      if (!roof) {
        const outer = north ? -3.7 : 25.7;
        // The solid backing sits behind the furniture to keep the interior enclosed.
        add('wall', x, 0, outer, yaw, [span / 2, ceiling + .4, .3]);
      }
    }
    if (!roof) add('skirt', length / 2, -.13, north ? -1.9 : 23.9, yaw, [(length + 1) / 2, 1, 1.9]);
    if (!roof) for (const x of [1.5, 8, 16, 24, 32, 40, 47]) {
      add('pilaster', x, 0, north ? -.53 : 22.53, yaw, [1, (ceiling + .34) / 7.75, 1]);
    }
    if (sec.id === 'S2') for (const x of [3.35, 6.85, 11.85, 15.35, 20.85, 24.35, 40]) {
      add('cubicle', x, .52, north ? -1.43 : 23.43, yaw, [1.02, 1.13, .91]);
    }
    if (sec.id === 'S3') for (const x of [4.8, 7, 9.2, 14, 16.2, 18.4, 24.4, 26.6, 28.8, 35.7, 37.9]) {
      if ((!north && x < 8) || (north && x === 37.9) || (!north && x === 28.8)) continue;
      add('server', x, .27, north ? -1.16 : 23.16, yaw, [1, 1.16, 1]);
    }
  }
  if (!roof) {
    for (let i = 0; i < 6; i++) add('soffit', 3.5 + i * 8, ceiling, 11, 0, [1, 1, 1.27]);
    add('portal', length - 1.0, 0, 11, 0, [1, (ceiling + .25) / 6.8, 1]);
    // Enclose the rear of the first-person view without blocking the start.
    add('wall', -1.4, 0, 11, 90, [14.2, ceiling + .6, .57]);
    // The live section ends at the portal. A shallow elevator vestibule gives the route depth.
    add('skirt', length + 3.25, -.13, 11, 0, [2.8, 1, 12]);
    add('soffit', length + 3.7, ceiling, 11, 0, [.93, 1, 1.04]);
    add('wall', length + 7.15, 0, 11, -90, [13.8, ceiling + .6, .54]);
    add('elevator', length + 6.53, 0, 11, -90, [1.55, 1.15, 1]);
    add('wall', length + 3.5, 0, -1.1, 0, [3.65, ceiling + .4, .4]);
    add('wall', length + 3.5, 0, 23.1, 180, [3.65, ceiling + .4, .4]);
  } else {
    add('parapet', -1.15, 0, 11, 90, [11.8, 1.45, .34]);
    add('parapet', length + .6, 0, 11, -90, [11.8, 1.45, .34]);
    for (const [side, z] of [[0, -29], [1, 51]]) for (let i = 0; i < 6; i++) {
      const v = (i * 7 + side * 3) % 5;
      add('tower', -21 + i * 18 + v * 2.4, -26 + v * 3.1, z + (side ? 1 : -1) * (v % 3) * 9,
        side * 180 + (v % 3 - 1) * 12, [1.45 + v * .15, 1.7 + v * .14, 1.36 + v * .08]);
    }
    add('tower', length + 32, -25, 2, -90, [1.9, 2.28, 1.6]);
    add('tower', length + 54, -17, 23, -65, [1.55, 1.84, 1.8]);
  }
  for (const feature of FEATURES[sec.id]) add(...feature);
  return out;
}
