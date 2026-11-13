// L03 scenery is render-only. Prefab replacements use the authored world coordinates;
// additional scenery below uses section-local coordinates, including terrace heights.
const MATCHED_PREFABS = [
  [/^S[16]-TRK$/, 'body', 'truck', -1.65, [0, 0, .8], null, [1.84, 1.2, 1.61]],
  [/^S1-TR1$/, 'body', 'tractor', -1.17],
  [/^S1-TREE--?\d+-\d+$/, 'trunk', 'tree', 0],
  [/^S1-SC\d$/, 'pole', 'scarecrow', 0],
  [/^S1-T[12]$/, 'post0', 'tower', 0, [2.2, 0, 2.2]],
  [/^S(?:1-SD\d|3-PS\d|4-PSH|4-CSH)$/, 'back', 'shed', -1.5, [0, 0, 2.5]],
  [/^S1-BS$/, 'stalk', 'beanstalk', 0, null, /^stalk$/],
  [/^S2-GZ$/, 'base', 'gazebo', 0],
  [/^S2-TP\d$/, 'stem', 'topiary', 0],
  [/^S(?:1-ST\d|4-ST\d|5-POD\d|6-POD\d)$/, 'stump', 'pod', 0],
  [/^MB\d+b?$/, 'stem', 'bloom', 0],
];

const LANDMARKS = [
  ['S1-SI', 'silo', ['S1-SI-cap']],
  ['S6-WT', 'water_tower', ['S6-WT-head', 'S6-WT-f1', 'S6-WT-f2', 'S6-WT-f3']],
  ...['TOT-N', 'TOT-SE', 'TOT-SW'].map((id) => [id, 'totem', [`${id}-eye`]]),
];

function rotate(x, z, yaw) {
  const r = yaw * Math.PI / 180;
  return [x * Math.cos(r) + z * Math.sin(r), -x * Math.sin(r) + z * Math.cos(r)];
}

function atPrimitive(prims, pattern, part, model, lift, offset = null, include = null, scale = 1) {
  const out = [];
  for (const g of prims.values()) {
    if (!g.id.endsWith(`-${part}`)) continue;
    const prefix = g.id.slice(0, -part.length - 1);
    if (!pattern.test(prefix)) continue;
    const yaw = g.yaw || 0;
    const [x, z] = offset ? rotate(offset[0], offset[2], yaw) : [0, 0];
    const replace = [...prims.keys()].filter((id) => id.startsWith(`${prefix}-`) &&
      (!include || include.test(id.slice(prefix.length + 1))));
    out.push({ model, at: [g.at[0] + x, g.at[1] + lift, g.at[2] + z], yaw, scale, replace });
  }
  return out;
}

function repeatAlong(g, model, interval, modelSize, offset = 0) {
  const alongZ = g.size[2] > g.size[0];
  const [w, h, d] = alongZ ? [g.size[2], g.size[1], g.size[0]] : g.size;
  const n = Math.ceil(w / interval);
  const yaw = (g.yaw || 0) + (alongZ ? 90 : 0);
  return Array.from({ length: n }, (_, i) => {
    const [x, z] = rotate(((i + 0.5) / n - 0.5) * w, offset, yaw);
    return {
      model, at: [g.at[0] + x, g.at[1] - h / 2, g.at[2] + z], yaw,
      scale: [w / n / modelSize[0], h / modelSize[1], d / modelSize[2]],
      replace: [g.id],
    };
  });
}

function boxDressing(g) {
  const [x, y, z] = g.at;
  const [w, h, d] = g.size;
  const placement = (model, scale, yaw = g.yaw || 0, lift = 0) => [
    { model, at: [x, y - h / 2 + lift, z], yaw, scale, replace: [g.id] },
  ];
  if (/^S1-BS-leaf\d$/.test(g.id)) {
    return placement('leaf_step', 1, [270, 0, 90, 180][Number(g.id.at(-1)) - 1]);
  }
  if (/^S1-F[12]$/.test(g.id)) return repeatAlong(g, 'stockade', 7.2, [3.5, 3, 2]);
  if (g.id === 'S1-BN6') return placement('barn_roof', 1);
  if (g.mat === 'hedge') return repeatAlong(g, 'hedge', 8.0, [2, 2, 2]);
  if (g.mat === 'crate' || /^S4-CB\d$/.test(g.id)) return placement('crate', [w / 2, h / 1.2, d / 2]);
  if (/^S1-HB\d$/.test(g.id)) return placement('hay', [w / 2, h / 1.2, d / 1.18]);
  if (/^(HH-PL-|S6-PL\d)/.test(g.id)) return placement('planter', [w / 8, h / 1.2, d / 1.6]);
  if (/^(S3-BR[123]|S1-PB1)$/.test(g.id)) return placement('bridge', [w / 8.8, h / .46, d / 4], 0, .026);
  if (/^S5-(?:HW|TW|W\d)/.test(g.id)) return repeatAlong(g, 'root_wall', 7.0, [3, 5.15, 2]);
  if (/^HH-W[NEWS]\d?$/.test(g.id)) {
    // Keep the glass visible through the open frame. End-wall panels stop at the door jambs.
    return repeatAlong(g, 'greenhouse_frame', 4.5, [4, 8, .35]).map(({ replace: _replace, ...p }) => p);
  }
  return [];
}

function sphereDressing(g) {
  const model = /^S1-PK\d+$/.test(g.id) ? 'pumpkin' : /^S[16]-(?:CB|GV)\d+$/.test(g.id) ? 'cabbage' : null;
  if (g.mat === 'rock') return [{
    model: 'boulder', at: [g.at[0], Math.max(0, g.at[1] - g.r), g.at[2]],
    scale: g.r, yaw: g.at[0] * 37 % 360, replace: [g.id],
  }];
  if (!model) return [];
  return [{ model, at: [g.at[0], Math.max(0, g.at[1] - g.r), g.at[2]],
    scale: [g.r, g.r * 1.12, g.r], yaw: g.r * 73, replace: [g.id] }];
}

/** Repeated Blender props share one draw call per model. Keep placeholders until each GLB arrives. */
function groveReplacements(prims) {
  const out = MATCHED_PREFABS.flatMap((entry) => atPrimitive(prims, ...entry));
  for (const [id, model, parts] of LANDMARKS) {
    const anchor = prims.get(id);
    if (anchor) out.push({ model, at: anchor.at, replace: [id, ...parts] });
  }
  for (const g of prims.values()) {
    if (/^S5-AR\d-lintel$/.test(g.id)) {
      const prefix = g.id.slice(0, -7);
      out.push({
        model: 'wide_root_arch', at: [g.at[0], g.at[1] - g.size[1] / 2 - 5, g.at[2]], yaw: g.yaw,
        scale: [(g.size[0] - 2) / 14.6, 1, 1], replace: [g.id, prefix + '-l', prefix + '-r'],
      });
    }
    if (g.kind === 'box') out.push(...boxDressing(g));
    if (g.kind === 'ramp') out.push({
      model: 'timber_ramp', at: [g.at[0], g.at[1] - g.size[1] / 2, g.at[2]],
      yaw: g.yaw, scale: g.size, replace: [g.id],
    });
    if (g.kind === 'sphere') out.push(...sphereDressing(g));
  }
  return out;
}

function props(model, points) {
  return points.map(([x, z, y = 0, scale = 1], i) => ({ model, at: [x, y, z], scale, yaw: i * 137.5 % 360 }));
}

function row(model, n, start, step, scale = 1) {
  return Array.from({ length: n }, (_, i) => ({
    model, at: start.map((v, j) => v + i * step[j]), scale,
    yaw: (i % 3 - 1) * 11,
  }));
}

// Exterior bands sit beyond the authored boundary, separated from roofs and playable routes.
function orchard(w, north, south) {
  return [
    ...props('orchard_rise', [[w*.10, north-29, -3.8, 1.23], [w*.40, north-46, -4.9, 1.42],
      [w*.76, north-46, -3.8, 1.33], [w+45, north*.61, -3.7, 1.52], [w+72, south+27, -4.5, 1.38],
      [w*.66, south+42, -5.2, 1.37], [w*.28, south+49, -4.8, 1.49], [-46, (north+south)*.5, -4.5, 1.55]]),
    ...props('orchard_barn', [[w*.37, north-23, -.21, 1.25], [w*.43, south+23, -.26, 1.39], [w+37, south-19, -.31, 1.67]]),
    { model: 'orchard_windmill', at: [w+29, -.29, north*.69], yaw: 258, scale: 1.24 },
    ...props('pines', [[-24, north+7, -.8, .76], [w*.25, north-18, -.8, .75],
      [w*.63, south+18, -.8, .73], [w+21, north*.72, -.8, .69]]),
  ];
}

const GROVE_DECOR = {
  S1: [
    ...orchard(260, -178, 18),
    ...row('crops', 9, [21, .05, -72], [3.9, 0, 0]),
    ...row('crops', 9, [21, .05, -89], [3.9, 0, 0]),
    ...row('crops', 11, [19, .05, -66], [3.9, 0, 0], 1.08),
    ...row('crops', 10, [18, .05, -98], [3.9, 0, 0], 1.12),
    ...row('crops', 9, [78, .03, -119], [4, 0, -.15]),
    ...row('crops', 8, [184, .03, -110], [4, 0, .25]),
    ...row('stones', 11, [18, .06, -80], [4.25, 0, .13]),
    ...row('stones', 9, [166, .05, -81], [8.6, 0, .12], 1.14),
    ...row('crops', 8, [29, .05, -141], [7.6, 0, 0], .90),
    ...row('crops', 8, [180, .05, -16], [7.1, 0, 0], .92),
    ...props('tree', [[21, -128], [38, -146], [101, 3], [198, -9], [18, -57], [38, -106], [59, -100], [79, -48], [118, -124], [150, -66],
      [180, -42], [199, -120], [221, -124], [230, -146], [248, -112]]),
    ...props('lantern', [[17, -75], [25, -86], [36, -77], [53, -84], [65, -75], [82, -83], [111, -74],
      [135, -85], [149, -76], [166, -78], [188, -83], [214, -76], [241, -83], [255, -76]]),
    ...props('patch', [[17, -73], [24, -85], [31, -74], [37, -95], [47, -68], [53, -88], [76, -69],
      [89, -107], [109, -67], [131, -94], [146, -119], [169, -73], [192, -66], [205, -88],
      [229, -97], [236, -141], [253, -86]]),
    ...props('reeds', [[150, -120], [151, -102], [151, -88], [151, -75], [151, -58],
      [163, -60], [164, -70], [163, -96], [163, -118]]),
  ],
  S2: [
    ...orchard(120, -120, 0),
    ...row('stones', 4, [47, .01, -78], [8.6, 0, 0], .85),
    ...row('stones', 4, [47, .01, -42], [8.6, 0, 0], .85),
    ...row('stones', 7, [42, .01, -60], [5.9, 0, 0]),
    ...row('stones', 4, [98, .01, -60], [6.5, 0, 0], .72),
    ...props('lantern', [[4, -57], [18, -64], [32, -63], [43, -54], [55, -50], [65, -70],
      [78, -61], [94, -57], [109, -63], [117, -58]]),
    ...props('patch', [[5, -56, 0, .58], [19, -55, 0, .58], [33, -64, 0, .64], [47, -57],
      [48, -73], [54, -76], [70, -76], [74, -51], [78, -56], [106, -58, 0, .64]]),
    ...props('reeds', [[6, -66, 0, .66], [19, -63, 0, .52], [34, -56, 0, .62], [80, -55],
      [95, -62, 0, .65], [109, -58, 0, .62]]),
  ],
  S3: [
    ...orchard(230, -120, 0),
    ...props('tree', [[16, -82], [23, -33], [59, -86], [86, -31], [96, -89], [136, -85],
      [152, -25], [164, -87], [204, -92], [219, -34]]),
    ...props('lantern', [[25, -64], [59, -55], [84, -58], [104, -54], [134, -53], [165, -64],
      [173, -65], [194, -56], [213, -63]]),
    ...props('patch', [[11, -66], [22, -72], [27, -51], [61, -56], [78, -69], [88, -87],
      [145, -64], [161, -54], [169, -68], [201, -57], [215, -66], [218, -82]]),
    ...row('reeds', 9, [28, .01, -107], [0, 0, 10.5], 1.15),
    ...row('reeds', 9, [55, .01, -105], [0, 0, 10.2], .94),
    ...row('reeds', 9, [107, .01, -104], [0, 0, 10.2], 1.05),
    ...row('reeds', 9, [133, .01, -105], [0, 0, 10.4], .95),
    ...row('reeds', 9, [173, .01, -105], [0, 0, 10.4], .92),
    ...row('reeds', 9, [194, .01, -104], [0, 0, 10.1], 1.17),
    ...row('stones', 7, [60, .03, -59], [6.5, 0, 1], .93),
    ...row('stones', 6, [137, .03, -51], [6.2, 0, -1.5], .86),
  ],
  S4: [
    ...orchard(170, -103, 13),
    ...row('crops', 7, [5, .02, -32], [3.9, 0, 0]),
    ...row('crops', 7, [5, .02, -56], [3.9, 0, 0]),
    ...row('stones', 9, [6, .01, -45], [7.2, 0, .19]),
    ...row('stones', 7, [104, .01, -44], [8.9, 0, -.14]),
    ...props('lantern', [[10, -41], [24, -48], [33, -39], [33, -52], [47, -63], [58, -26],
      [78, -63], [91, -27], [100, -49], [112, -42], [133, -38], [151, -49], [164, -41]]),
    ...props('patch', [[13, -29], [16, -58], [29, -53], [36, -37], [44, -57], [54, -26], [62, -65],
      [79, -27], [89, -34], [105, -49], [115, -54], [122, -37], [140, -60], [155, -53]]),
    ...row('crops', 6, [106, .02, -89], [8.5, 0, 0], .83),
    ...row('crops', 6, [106, .02, 1], [8.5, 0, 0], .83),
    ...props('nest', [[29, -72, 0, 1.3], [103, -60, 0, 1.05], [119, -73, 0, 1.25], [153, -65, 0, 1.2]]),
    ...props('tree', [[20, -81], [40, -87], [81, -91], [101, -75], [128, -74], [146, -21], [160, -71]]),
  ],
  S5: [
    ...orchard(90, -125, 0),
    ...row('stones', 8, [45, .02, -5], [0, 0, -5.8], .74),
    ...props('lantern', [[31, -10], [59, -10], [39.5, -20], [50.5, -34], [41, -46], [49, -48],
      [24, -55], [66, -55], [14, -80], [76, -81], [27, -104], [63, -104]]),
    ...props('patch', [[31, -12], [58, -12], [38, -34], [52, -38], [32, -55], [60, -52],
      [19, -70], [24, -93], [34, -107], [54, -106], [65, -96], [73, -72], [69, -60]]),
    ...props('tree', [[12, -49, 0, 1.7], [78, -52, 0, 1.5], [7, -88, 0, 1.6], [81, -95, 0, 1.55],
      [26, -118, 0, 1.7], [65, -119, 0, 1.6]]),
    ...props('nest', [[27, -55], [63, -57], [25, -98], [65, -96]]),
  ],
  S6: [
    ...orchard(150, -100, 0),
    ...row('stones', 6, [36, .02, -8], [0, 0, -8.1]),
    ...row('crops', 5, [18, .02, -19], [4.3, 0, 0], .78),
    ...row('crops', 5, [32, .02, -62], [4.4, 0, 0], .85),
    ...row('crops', 4, [62, 3.02, -38], [5, 0, 0], .86),
    ...row('crops', 4, [95, 6.02, -46], [4.9, 0, 0], .84),
    ...row('stones', 5, [124, 9.02, -48], [4.3, 0, .9]),
    ...props('lantern', [[31, -12], [42, -18], [17, -49], [55, -48], [59, -55], [64, -59, 3],
      [81, -29, 3], [94, -27, 6], [111, -49, 6], [119, -60, 6], [124, -59, 9], [140, -42, 9]]),
    ...props('patch', [[19, -18], [23, -30], [49, -19], [16, -62], [43, -61], [53, -56],
      [61, -51, 3], [65, -35, 3], [76, -48, 3], [81, -58, 3], [94, -56, 6], [103, -32, 6],
      [112, -36, 6], [127, -51, 9], [136, -52, 9], [142, -36, 9], [140, -72, 9]]),
    ...row('crops', 4, [65, 3.02, -65], [5.4, 0, 0], .78),
    ...row('crops', 4, [96, 6.02, -15], [5.4, 0, 0], .78),
    ...props('tree', [[5, -23], [8, -69], [51, -75], [72, -73], [125, -75, 9], [143, -73, 9], [142, -22, 9]]),
  ],
};

export function grovePlacements(sec, prims) {
  const roof = prims.get('HH-ROOF');
  const roofKit = roof ? ['greenhouse_roof', 'greenhouse_glass'].flatMap((model, index) => {
    const x = roof.at[0] - sec.origin[0] - 30.1 + 2.15 * index;
    const y = roof.at[1] - sec.origin[1] + .23 + .03 * index;
    const z = roof.at[2] - sec.origin[2];
    return row(model, 15 - index, [x, y, z], [4.3, 0, 0], [1, 1, roof.size[2] / 45])
      .map((piece) => ({ ...piece, yaw: 0 }));
  }) : [];
  const local = [...(GROVE_DECOR[sec.id] || []), ...roofKit].map((d) => ({ ...d, at: d.at.map((v, i) => v + sec.origin[i]) }));
  return groveReplacements(prims).concat(local).map((d) => ({ ...d, model: `grove_${d.model}` }));
}

export function groveGeometry(g) {
  if (g.id !== 'S3-DECK') return g;
  // Separate the coplanar banks, bridges and safety deck visually.
  return { ...g, at: [g.at[0], g.at[1] - 0.045, g.at[2]], mat: 'creekBed' };
}
