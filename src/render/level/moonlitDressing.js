const PLAINS = [
  ['camp', 16.9, .06, -1.68],
  ['ruin_arch', 24, .03, -2.1, -4, 1.12], ['column', 30.5, .04, -2.6, 0, 1.18],
  ['fragment', 5.6, 0, -2.05, 16, 1.16], ['fragment', 33, 0, 24.4, 173],
  ['fragment', 43.1, 0, -2.1, 8, 1.32], ['column', 43.5, .02, 24.1, 180, 1.3],
  ['ruin_arch', 64.2, 0, 24.65, 180, 1.28], ['ruin_arch', 65.1, .08, -3.1, 11, 1.24],
  ['obelisk', 5.5, .16, 24.5, 180, .84], ['obelisk', 61.6, .17, -2.1, 0, .90],
];

const ARENA = [
  ['ruin_arch', 50, .02, -4.17, 2, 1.05], ['ruin_arch', 50.8, .02, 26.35, 180, 1.06],
  ['column', 14.5, 0, -2.1, 3, 1.13], ['column', 15, 0, 24.4, 180, 1.04],
  ['fragment', 37.5, .02, -2.4, 3], ['fragment', 37, .02, 24.4, 181, 1.05],
];

export function moonlitPlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !['S1', 'S2', 'S3'].includes(sec.id)) return [];
  const start = sec.start[0] - 3.5;
  const [length, , width] = floor.size;
  const first = floor.at[0] - start - length / 2;
  const end = first + length;
  const center = floor.at[2];
  const crypt = sec.id === 'S2';
  const arena = sec.id === 'S3';
  const out = [];
  const add = (name, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `moonlit_${name}`, at: [start + x, y, z], yaw, scale, replace });

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [span, , depth] = wall.size;
    const north = side === 'N', sign = north ? -1 : 1;
    const edge = center + sign * width / 2;
    const yaw = north ? 0 : 180;
    const bays = crypt ? 6 : 8;
    const bay = span / bays;
    for (let i = 0; i < bays; i++) {
      const x = first + bay * (i + .5);
      add(crypt ? 'crypt_wall' : 'wall', x, 0, wall.at[2], yaw,
        [bay / 2, crypt ? 4.55 : arena ? 1.82 : 2.06, depth / 2], [wall.id]);
    }

    if (crypt) {
      // Two burial galleries flank the wide central nave. The breaks are cross aisles.
      for (const x of [8, 13, 24, 29, 43, 48, 57]) {
        add('tomb', x + (north ? 0 : 1.6), .02, center + sign * 15.5, yaw + 90, [.94, 1, 1]);
      }
      for (const x of [5, 18, 34, 51, 60]) {
        add('sconce', x, 2.20, edge - sign * .52, yaw, 1.02);
      }
      for (const x of [6, 20, 35, 52, 61]) {
        add('column', x, 0, edge - sign * .85, yaw, [.87, .89, .87]);
      }
      add('obelisk', 57, 0, center + sign * 9.8, yaw, .87);
      continue;
    }

    add('apron', (first + end) / 2, -.32, edge + sign * 2.35, yaw, [length / 2, 1, 2.8]);
    for (const x of (arena ? [8, 23, 40, 57, 69] : [7, 19, 37, 52, 66])) {
      add('lantern', x, .01, edge - sign * 1.9, yaw, arena ? .95 : .86);
    }
    if (arena) for (const x of [17, 36, 61]) {
      add('obelisk', x, .03, center + sign * 18, yaw, x === 36 ? 1.18 : .99);
    }
    // Break up the distant silhouette with a few ridges and long aqueduct spans.
    for (let i = 0; i < 4; i++) {
      const variant = (i * 3 + (north ? 0 : 2)) % 5;
      const x = -10 + i * 22 + variant * 1.8;
      const z = edge + sign * (18 + (variant % 3) * 8);
      add('ridge', x, -5.3, z, i * 22 + yaw, [2.05 + variant * .26, 1.40 + variant * .18, 1.65]);
    }
    add('viaduct', arena ? 47 : 30, -4.9, edge + sign * 30, yaw + sign * 19, [1.37, 1.12, 1.3]);
    add('ridge', end + (north ? 29 : 42), -7.5, edge + sign * 12, yaw + 46, [2.2, 1.8, 1.6]);
  }

  if (crypt) {
    const bays = 8;
    const bay = length / bays;
    for (let i = 0; i < bays; i++) {
      add('vault', first + (i + .5) * bay, 4.15, center, 0, [bay / 6.1, 1.25, width / 23.92]);
    }
    add('crypt_wall', first - .36, 0, center, 90, [width / 2, 11.3, .52]);
    // The far end contains a deep niche and an arch marking the handoff.
    for (const side of [-1, 1]) {
      add('crypt_wall', end + .9, 0, center + side * (width / 4 + 2), -90, [width / 4 - 2, 12, .55]);
      add('sconce', end - .3, 2.7, center + side * 5.7, -90, 1.18);
    }
    add('crypt_wall', end + .9, 7.4, center, -90, [4.05, 4.65, .52]);
    add('crypt_wall', end + 2.3, 0, center, -90, [4.3, 8.1, .42]);
    add('apron', end + 1.1, -.31, center, 0, [1.8, 1, width / 2]);
    add('ruin_arch', end - 2.3, .02, center, -90, 1.19);
  } else {
    if (arena) {
      add('medallion', 38, .008, center, 0, [2.15, 1, 2.15]);
      add('apron', end + 4.7, -.32, center, 0, [5.4, 1, 12.2]);
      add('gate', end + 4.25, -.04, center, -90, 1.28);
    } else {
      add('apron', end + 2.6, -.32, center, 0, [3.15, 1, 8.8]);
      add('ruin_arch', end + 2.2, .02, center, -90, 1.68);
      // A cache terrace and a second landmark break up the open plains.
      add('apron', 14.3, -.286, center + 2.64, 0, [7.5, 1, 2.9]);
      add('camp', 10.7, .018, center + 6.3, 180);
      add('camp', 17.8, .018, center + 6.3, 180);
      add('column', 45, .02, center + 12.8, 0, 1.08);
      add('fragment', 51, .02, center + 13.9, 17, 1.12);
    }
    for (const [name, x, y, z, yaw, scale] of (arena ? ARENA : PLAINS)) {
      const edgeOffset = z < 11 ? center - width / 2 + z : center + width / 2 + z - 22;
      add(name, x, y, edgeOffset, yaw, scale);
    }
  }

  const portal = sec.mechanisms?.find(m => m.kind === 'portal');
  if (portal) add('portal_frame', portal.at[0] - start, 0, portal.at[2], -90);
  return out;
}
