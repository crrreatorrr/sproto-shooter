// World placements for the three currently playable Moonlit Ruins sections.
const FEATURES = {
  S1: [
    ['camp', 12, .43, -1.68], ['camp', 16.9, .43, -1.68], ['camp', 15.8, .43, 24, 180],
    ['ruin_arch', 24, .03, -2.1, -4, 1.12], ['column', 30.5, .04, -2.6, 0, 1.18],
    ['fragment', 5.6, 0, -2.05, 16, 1.16], ['fragment', 33, 0, 24.4, 173],
    ['fragment', 43.1, 0, -2.1, 8, 1.32], ['column', 43.5, .02, 24.1, 180, 1.3],
    ['ruin_arch', 50.2, 0, 24.65, 180, 1.28], ['ruin_arch', 51.1, .08, -3.1, 11, 1.24],
    ['obelisk', 5.5, .16, 24.5, 180, .84], ['obelisk', 47.6, .17, -2.1, 0, .90],
  ],
  S2: [
    ['obelisk', 47.5, 0, -2.1, 10, .87], ['obelisk', 47.5, 0, 24.1, 176, .87],
  ],
  S3: [
    ['medallion', 25.5, .008, 11, 0, [1.24, 1, 1.24]],
    ['gate', 55.5, -.04, 11, -90, 1.28],
    ['ruin_arch', 37, .02, -4.17, 2, 1.05], ['ruin_arch', 37.8, .02, 26.35, 180, 1.06],
    ['column', 14.5, 0, -2.1, 3, 1.13], ['column', 15, 0, 24.4, 180, 1.04],
    ['fragment', 32.5, .02, -2.4, 3], ['fragment', 32, .02, 24.4, 181, 1.05],
  ],
};

export function moonlitPlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const length = floor.size[0] - 1;
  const start = floor.at[0] - length / 2;
  const crypt = sec.id === 'S2';
  const arena = sec.id === 'S3';
  const out = [];
  const add = (name, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `moonlit_${name}`, at: [start + x, y, z], yaw, scale, replace });

  for (const side of ['N', 'S']) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [width, height, depth] = wall.size;
    const bays = Math.ceil(width / 6.8), span = width / bays;
    const north = side === 'N', sign = north ? -1 : 1;
    const yaw = north ? 0 : 180;
    for (let i = 0; i < bays; i++) {
      const x = span * (i + .5) - .5;
      add(crypt ? 'crypt_wall' : 'wall', x, wall.at[1] - height / 2, wall.at[2],
        yaw, [span / 2, crypt ? 2.18 : arena ? 1.82 : 2.06, depth / 2], [wall.id]);
      if (crypt) {
        add('crypt_wall', x, 0, 11 + sign * 12.05, yaw, [span / 2, 4.28, .38]);
        if (i < bays - 1) {
          add('tomb', x + .9, .02, 11 + sign * 10.28, yaw, [.94, 1, 1]);
          add('sconce', x - 1.2, 2.20, 11 + sign * 11.28, yaw, .93);
        }
      }
    }
    add('apron', length / 2, -.32, 11 + sign * (crypt ? 11.02 : 13.7), yaw,
      [(length + 2) / 2, 1, crypt ? 1.17 : 2.9]);
    if (crypt) continue;
    for (const x of (arena ? [8, 20, 35, 45] : [6.5, 16.4, 27.3, 38.3, 49.3])) {
      add('lantern', x, .01, 11 + sign * 11.24, yaw, arena ? .95 : .86);
    }
    if (arena) for (const x of [7.0, 23.5, 43.6]) {
      add('obelisk', x, .03, 11 + sign * 13.35, yaw, x === 23.5 ? 1.18 : .99);
    }
    for (let i = 0; i < 7; i++) {
      const k = (i * 3 + (north ? 0 : 2)) % 5;
      const x = -8 + i * 12.6 + k * 1.5;
      const z = 11 + sign * (26 + (k % 3) * 5);
      add('ridge', x, -4.7, z, i * 18 + yaw, [1.55 + k * .19, 1.65 + k * .21, 1.5]);
      if (i % 2 === 0) add('ruin_arch', x + 2.5, 1.2 + (k % 3), z + sign * 2, i * 7 + yaw, 1.52 + k * .12);
    }
  }
  if (crypt) {
    for (let i = 0; i < 9; i++) add('vault', 2.55 + i * 6.03, 3.85, 11);
    add('crypt_wall', -1.55, 0, 11, 90, [12.4, 9.28, .45]);
    add('apron', length + 5.35, -.32, 11, 0, [5.7, 1, 12.15]);
    // Frame an open passage beyond the trigger, with layered darkness behind it.
    for (const side of [-1, 1]) {
      add('crypt_wall', length + 7.1, 0, 11 + side * 8.04, -90, [4.47, 9.27, .44]);
    }
    add('crypt_wall', length + 7.1, 6.15, 11, -90, [3.69, 3.12, .44]);
    add('crypt_wall', length + 10.85, 0, 11, -90, [5.2, 9.27, .42]);
    add('crypt_wall', length + 3.18, 0, -1.02, 0, [3.9, 4.28, .39]);
    add('crypt_wall', length + 3.18, 0, 23.02, 180, [3.9, 4.28, .39]);
    add('ruin_arch', length + 6.33, .05, 11, -90, 1.18);
    add('sconce', length + 5.9, 2.72, 7.7, -90, 1.18);
    add('sconce', length + 5.9, 2.72, 14.3, -90, 1.18);
  } else {
    add('ridge', length + 24, -5.95, 6, 14, [1.90, 1.64, 1.70]);
    add('ridge', length + 38, -7.9, 19, 56, [2.58, 1.65, 1.70]);
    add('apron', length + (arena ? 5 : 3.5), -.32, 11, 0, [arena ? 5.8 : 4.1, 1, 12.2]);
    if (!arena) add('ruin_arch', length + 3.12, .02, 11, -90, 1.84);
  }
  for (const feature of FEATURES[sec.id]) add(...feature);
  const portal = sec.mechanisms?.find(m => m.kind === 'portal');
  if (portal) add('portal_frame', portal.at[0] - start, 0, portal.at[2], -90);
  return out;
}
