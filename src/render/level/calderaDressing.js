// Local landmarks use the original detailed Blender kit. The outer cliffs use
// one lower-poly silhouette so the wider landscape leaves room for those props.
const FEATURES = {
  S1: [
    ['overhang', 10.8, 4.6, 11.5, 2, [1.18, 1.12, 1.35]],
    ['overhang', 19.6, 5.0, 10.2, -6, [1.04, 1.25, 1.28]],
    ['escarpment', 12.2, -.10, 4.2, 14, [.82, .48, .64]],
    ['spires', 46, -.40, -5.5, 13, [1.27, .75, .93]],
    ['spires', 54.4, -.55, 26.0, 151, [1.32, .54, .92]],
    ['scree', 12.0, .02, 8.2, 14], ['scree', 18.3, .02, 7.1, 175, .83],
    ['brazier', 7.2, .02, 10.5], ['brazier', 20.0, .02, 9.0, -11, .95],
    ['brazier', 30.5, .02, 14.7, 180, .98],
    ['obelisk', 51.0, .05, .2, 15, 1.05], ['obelisk', 57.5, .05, 21.8, 165, .92],
  ],
  S2: [
    ['brazier', 6.5, .02, 8.2, 0, .84], ['brazier', 19.5, .02, 16.0, 164, .85],
    ['brazier', 34.5, .02, 1.7, 31, 1.10], ['brazier', 49.7, .02, 26.0, 168, .92],
    ['scree', 30.4, .012, 3.03, 19, .72], ['scree', 25.9, .012, 2.98, -4, .60],
    ['spires', 48, -.65, -8.4, -16, [1.18, .61, .86]],
    ['spires', 27.5, -.44, 28.9, 27, [1.37, .70, .97]],
    ['spires', 55.6, -.62, 29.8, 174, [1.11, .74, .90]],
    ['scree', 26.7, .012, 16.4, 19, .84], ['scree', 32.0, .012, 7.9, -4, 1.05],
  ],
  S3: [
    ['spires', 36.4, -1.0, -15.7, 10, [1.52, .95, .95]],
    ['spires', 36.4, -1.0, 37.7, 165, [1.45, 1.06, .87]],
    ['spires', 70.9, -.55, -8.5, -5, [1.42, .78, .97]],
    ['spires', 70.9, -.55, 30.5, 145, [1.42, .86, .97]],
    ['seal', 24.25, .018, 11, 0, [2.0, 1, 1.92]],
    ['obelisk', 44.5, .03, -4.6, -25, 1.35], ['obelisk', 44.5, .03, 26.6, 163, 1.35],
    ['obelisk', 13, .03, -4.6, 17, 1.13], ['obelisk', 13, .03, 26.6, 162, 1.13],
    ['brazier', 24.8, .02, -2.6, 6, 1.04], ['brazier', 24.8, .02, 24.6, 170, 1.04],
    ['brazier', 60.0, .02, 6.0, -16, 1.06], ['brazier', 60.0, .02, 16.0, 163, 1.06],
  ],
  S4: [
    ['spires', 49, -.75, -12.0, -9, [1.42, .88, 1.25]],
    ['spires', 59, -1.1, 36.4, 167, [1.26, 1.27, 1.40]],
    ['scree', 19, .015, 5.0, 147, 1.05], ['scree', 32, .01, 18.8, 153, .95],
    ['spires', 22, -1.0, -7.0, 18, [1.34, 1.18, 1.14]],
    ['spires', 32, -1.0, 34.2, 177, [1.20, 1.35, 1.14]],
    ['brazier', 9.5, .02, 6.1, 180, .95], ['brazier', 25.2, .02, 16.0, 180, 1.12],
    ['obelisk', 46.5, .03, 1.9, 6, 1.20], ['obelisk', 55.2, .03, 24.8, 180, 1.20],
  ],
};

const SHORE = {
  S1: [[.29, .74], [.51, .89]],
  S2: [[.41, .78], [.26, .71]],
  S3: [[.58, .91], [.49, .92]],
  S4: [[.32, .59, .88], [.38, .68, .93]],
};

export function calderaPlacements(sec, prims) {
  const floor = prims.get(`${sec.id}-floor`);
  if (!floor || !FEATURES[sec.id]) return [];
  const start = sec.start[0] - 3.5;
  const length = floor.size[0];
  const centre = floor.at[2];
  const end = floor.at[0] - start + length / 2;
  const eruption = sec.id === 'S4';
  const out = [];
  const place = (model, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model, at: [start + x, y, z], yaw, scale, replace });
  const add = (name, ...args) => place(`caldera_${name}`, ...args);
  const magma = (name, ...args) => place(`underworks_${name}`, ...args);

  for (const [index, side] of ['N', 'S'].entries()) {
    const wall = prims.get(`${sec.id}-wall${side}`);
    if (!wall) continue;
    const [span, height, depth] = wall.size;
    const left = wall.at[0] - start - span / 2;
    const bays = Math.ceil(span / 8.5);
    const bay = span / bays;
    const sign = index === 0 ? -1 : 1;
    const yaw = index * 180;
    const edge = wall.at[2];
    for (let i = 0; i < bays; i++) {
      add('wall', left + bay * (i + .5), wall.at[1] - height / 2, edge,
        yaw, [bay / 2, height, depth / 2], [wall.id]);
    }
    add('apron', floor.at[0] - start, -.42, edge + sign * 2.7, 0, [length / 2, 1, 2.8]);
    magma('magma', floor.at[0] - start, -4.15, edge + sign * 15.7, 0, [length * .68, 1, 13]);
    for (const [i, fraction] of SHORE[sec.id][index].entries()) {
      const x = end * fraction;
      const h = (eruption ? 10.6 : 7.2) + i * 1.32;
      const z = edge + sign * (7.4 + i * 2.1);
      add('escarpment', x, -4.05, z + sign * 2.1, yaw + sign * (8 + i * 9), [1.08, h / 12, .9]);
      magma('lavafall', x, -4.03, z, yaw, [1.12 + i * .19, h, 1]);
    }
    add('escarpment', end + 12 - index * 6, -6, edge + sign * 23, yaw + 31, [1.62, 1.06, 1.52]);
    add('escarpment', end * .3 + index * 14, -5.8, edge + sign * 28, yaw - 19, [1.81, 1.21, 1.46]);
  }

  add('apron', end + 5.6, -.42, centre, 0, [5.8, 1, floor.size[2] * .36]);
  if (sec.id === 'S3') add('shrine', end + 6.9, -.025, centre, -90, [1.72, 1.75, 1.4]);
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
