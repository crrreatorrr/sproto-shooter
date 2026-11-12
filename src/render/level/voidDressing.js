// Re-skin the authored L04 solids. The model transforms never enter campaign state.
const BOX_PLATFORMS = /^(?:s1\.(?:gen|blk1|launch|mem|file1)|s2\.(?:ent|porch[WE]|pit)|s3\.mouth|s4\.(?:ent|porchW|chFloor[NSEW]|b[1-9]|hb[1-5]|exit)|s5\.(?:ent|step[ABC]|vaultFloor|batLedge)|sb\.(?:vest|cause|t[0-4][0-4]))$/i;
const COVERS = /wall|roofp|stub|gatep/i;
const RELAYS = { 's1.c1post': 'c1', 's3.c2post': 'c2', 's3.c3post': 'c3', 's4.c4post': 'c4' };
const ISLAND_ROCKS = new Set(['s3.head', 's3.isl1', 's3.r1', 's3.r2', 's3.r3', 's3.r4', 's5.isl']);
const SLAB_ROCKS = new Set(['s1.gen', 's1.blk1', 's1.mem', 's2.pit', 's3.mouth', 's4.chFloorN', 's4.chFloorS', 's5.vaultFloor']);

function placement(model, at, { yaw = 0, scale = 1, replace } = {}) {
  return { model: `void_${model}`, at, yaw, scale, replace };
}

function boxFit(model, g, { longSide = false, raise = 0, ids = [g.id] } = {}) {
  const [x, y, z] = g.at;
  const [w, h, d] = g.size;
  const turn = longSide && d > w;
  return placement(model, [x, y - h / 2 + raise, z], {
    yaw: (g.yaw || 0) + (turn ? 90 : 0),
    scale: turn ? [d / 2, h, w / 2] : [w / 2, h, d / 2],
    replace: ids,
  });
}

function column(model, g, ids = [g.id]) {
  return placement(model, g.at, { scale: [g.r, g.h, g.r], replace: ids });
}

function tiled(g, model, size, raise = 0, xOnly = false) {
  const [x, y, z] = g.at;
  const [w, h, d] = g.size;
  const nx = Math.ceil(w / size), nz = xOnly ? 1 : Math.ceil(d / size);
  const tw = w / nx, td = d / nz;
  const out = [];
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    out.push(placement(model, [x + tw * (ix + .5 - nx / 2), y - h / 2 + raise, z + td * (iz + .5 - nz / 2)], {
      yaw: model === 'deck' ? ((ix + iz) % 2) * 180 : 0,
      scale: [tw / 2, h, td / 2], replace: [g.id],
    }));
  }
  return out;
}

function boxPlacements(g, prims) {
  const { id, mat, tag } = g;
  if (tag === 'lockWall' || tag === 'fireRing') return [];
  if (tag === 'energyBridge') {
    // The authored slabs overlap. A small lift separates adjacent surfaces.
    const split = id.lastIndexOf('-');
    return [boxFit('bridge', g, {
      raise: .012 + (Number(id.slice(split + 1)) % 3) * .007, ids: [id, `marker:${id.slice(0, split)}`],
    })];
  }
  if (tag === 'slide') return tiled(g, 'apron', 10, .018, true);
  if (tag === 'mover') return [boxFit('deck', g, { ids: [id, `marker:${id.replace(/-deck$/, '')}`] })];
  if (/\.chain.*-\d+$/.test(id)) return [boxFit('deck', g)];
  if (mat === 'candleUp' || mat === 'candleDown') {
    if (!id.endsWith('-body')) return [boxFit('bulkhead', g)];
    return [boxFit(mat === 'candleUp' ? 'candle_up' : 'candle_down', g)];
  }
  if (id.includes('-wick-') || /\.rail[12AB]$/.test(id)) return [boxFit('rail', g, { longSide: true })];
  if (id === 's5.vaultW1') {
    return [placement('vault', [g.at[0], g.at[1] - g.size[1] / 2, g.at[2] + 7.5], {
      yaw: 270, replace: [id, 's5.vaultW2'],
    })];
  }
  if (id === 's5.vaultW2') return [];
  if (id === 's1.mono') return [boxFit('candle_up', g)];
  if (RELAYS[id]) return [boxFit('relay', g, { ids: [id, `marker:${RELAYS[id]}`] })];
  if (/^n[123]-body$/.test(id)) {
    return [placement('pylon', [g.at[0], g.at[1] - 1.5, g.at[2]], {
      scale: [1, .64, 1], replace: [id, `${id}-core`],
    })];
  }
  if (mat === 'crate' || id === 's4.duckCache') return [boxFit('cargo', g)];
  if (/srv/i.test(id) && !id.endsWith('-strip')) {
    const ids = prims.has(`${id}-strip`) ? [id, `${id}-strip`] : [id];
    return [boxFit('server', g, { longSide: true, ids })];
  }
  if (mat === 'concrete') return [boxFit('shelter', g)];
  if (/\.sign\w*$/i.test(id)) return [boxFit('sign', g)];
  if (mat === 'neon' && /\.(?:tick|pitT|athT|chT)/.test(id)) return [boxFit('ticker', g)];
  if (BOX_PLATFORMS.test(id)) return tiled(g, 'deck', 12);
  if (COVERS.test(id)) return [boxFit('shield', g, { longSide: true })];
  if (/^s5\.vault[NSE][12]?$|\.(?:tun|vaultRoof)/.test(id)) return [boxFit('bulkhead', g, { longSide: true })];
  return [];
}

function roundPlacements(g, prims) {
  const { id } = g;
  if (RELAYS[id]) return [column('relay', g, [id, `marker:${RELAYS[id]}`])];
  if (/\.pylon$|-vis$/.test(id)) {
    return [placement('pylon', g.at, { replace: [id, `${id}-core`, `${id}-bar1`, `${id}-bar2`, `${id}-bar3`] })];
  }
  if (id === 's5.tower' || /stub$/.test(id)) return [column('ledger', g)];
  if (id.includes('rivet') || id.includes('-pole')) return [];
  const rim = `${id}-rim`;
  const model = /\.p?v\d$/.test(id) ? 'vent' : 'landing';
  return [column(model, g, prims.has(rim) ? [id, rim] : [id])];
}

function attachedRocks(g) {
  const [x, y, z] = g.at;
  if (ISLAND_ROCKS.has(g.id)) {
    const depth = Math.min(24, g.r * .9);
    return [placement('rockfall', [x, y - depth, z], { yaw: 18, scale: [g.r * .94, depth, g.r * .94] })];
  }
  if (!SLAB_ROCKS.has(g.id) && !/^s4\.b[1-9]$|^s1\.h[13]$/.test(g.id)) return [];
  const [w, h, d] = g.size || [g.r * 2, g.h, g.r * 2];
  const bottom = g.size ? y - h / 2 : y;
  const count = w > 22 ? 3 : 1;
  return Array.from({ length: count }, (_, i) => {
    const depth = Math.min(16, 4.5 + d * (.23 + i * .04));
    return placement('rockfall', [x + w * ((i + .5) / count - .5), bottom - depth, z + (i % 2) * .06 * d], {
      yaw: (i * 61) % 180, scale: [w * .51 / count, depth, d * .44],
    });
  });
}

function points(model, coords) {
  return coords.map(([x, y, z, scale = 1, yaw = 0]) => placement(model, [x, y, z], { scale, yaw }));
}

const SCENERY = {
  S1: [
    ...points('crystal', [[3, 0, 42, 2.8], [11, 0, 76, 2.3, 18], [24, 0, 43, 1.65, 51],
      [46, 0, 44, 1.5, 22], [72, 0, 76, 1.65, 49], [187, 8, 43, 1.65], [216, 8, 75, 1.75, 15]]),
    ...points('beacon', [[26, 0, 56], [27, 0, 64], [47, 0, 57], [47, 0, 63], [88, 0, 52],
      [111, 0, 51], [139, 3, 47], [171, 7, 76], [216, 8, 56], [216, 8, 64]]),
    ...points('gantry', [[9, 0, 46, [3.3, 6.8, 3.3], 90], [64, 0, 75, [2.4, 5, 2.4], 90]]),
    ...points('supply', [[9, 3.6, 46, 1.2], [65, 3.2, 75]]),
    ...points('terminal', [[16, 0, 52, 1, 270], [84, 0, 67, 1.2, 270], [206, 8, 64]]),
  ],
  S2: [
    ...points('crystal', [[5, 0, 91, 1.55], [12, 0, 108, 2.1, 23], [26, 0, 76, 2.4],
      [27, 0, 126, 1.65], [52, 0, 76, 1.4], [79, 0, 127, 1.8], [94, 0, 77, 2.4],
      [94, 0, 123, 2.15]]),
    ...points('beacon', [[18, 0, 96], [17, 0, 104], [35, 0, 96], [34, 0, 103], [43, 0, 96],
      [89, 0, 103], [98, 0, 105], [157, 20, 101], [201, 42, 102], [254, 54, 103]]),
    ...points('gantry', [[25, 0, 82, [3, 6, 3], 90], [91, 0, 125, [2.5, 5.2, 2.5], 90]]),
    ...points('supply', [[25, 3, 82, 1.13], [91, 2.7, 125, 1.04]]),
    ...points('terminal', [[65, 0, 107, 1.2, 270], [80, 0, 88], [251, 54, 98, .88]]),
  ],
  S3: [
    ...points('crystal', [[8, 0, 49, 1.75], [11, 0, 69, 2.15], [26, 0, 66, 1.45],
      [58, 0, 65, 1.35], [98, 2, 68, .91], [144, 2, 50, .88], [184, -2, 63, .88], [250, -2, 67, 1.4]]),
    ...points('beacon', [[32, 0, 58], [32, 0, 62], [55, 0, 58], [55, 0, 62], [104, 2, 67],
      [139, 2, 53], [189, -2, 64], [227, -2, 57], [258, -2, 56], [258, -2, 64]]),
    ...points('gantry', [[9, 0, 65, [2.2, 5.6, 2.2], 90], [128, -8, 39, [2.4, 7, 2.4], 90],
      [214, -8, 80, [2.4, 7, 2.4], 90]]),
    ...points('supply', [[9, 2.5, 65, 1.05]]),
  ],
  S4: [
    ...points('crystal', [[4, 0, 91, 2.25], [9, 0, 110, 2.1], [19, 0, 90, 1.4],
      [160, 0, 72, 2.05], [193, 0, 70, 1.8], [157, 0, 126, 1.7], [197, 0, 126, 2.2], [222, 0, 106, 1.55]]),
    ...points('beacon', [[20, 0, 94], [20, 0, 106], [69, 8, 95], [132, 6, 96], [143, 0, 96],
      [144, 0, 104], [168, 0, 96], [168, 0, 104], [186, 0, 96], [186, 0, 104], [216, 0, 93], [216, 0, 107]]),
    ...points('gantry', [[8, 0, 91, [3.2, 6.2, 3.2], 90], [154, 0, 80, [2.8, 5.4, 2.8], 90],
      [201, 0, 121, [2.8, 5.4, 2.8], 90]]),
    ...points('supply', [[8, 3.4, 91], [154, 2.7, 80], [201, 2.7, 121]]),
    ...points('terminal', [[149, 0, 107, 1.15, 270], [205, 0, 104, 1.15, 90]]),
  ],
  S5: [
    ...points('crystal', [[25, 0, 65, 2.3], [28, 0, 93, 2.1], [53, 0, 48, 2.85], [71, 0, 47, 2.3],
      [66, 0, 118, 2.6], [89, 0, 57, 2.1], [93, 0, 103, 2.4], [119, 0, 89, 1.15]]),
    ...points('beacon', [[16, 0, 76], [16, 0, 84], [27, 0, 76], [27, 0, 84], [97, 0, 76], [97, 0, 84],
      [113, 0, 76], [113, 0, 84], [129, 0, 76], [129, 0, 84]]),
    ...points('gantry', [[33, 0, 91, [2.4, 5, 2.4], 90], [87, 0, 68, [2.7, 5.8, 2.7], 90]]),
    ...points('supply', [[33, 2.7, 91], [87, 3.12, 68]]),
    ...points('terminal', [[117, 0, 74, 1.2, 270], [129, 0, 86, 1.18, 90], [55, 16, 100]]),
  ],
  SB: [
    ...points('halo', [[70, 22, 60, 1.55, 15]]),
    ...points('gantry', [[67, 17, 35, [4.8, 11, 4.8], 0], [68, 17, 85, [4.8, 11, 4.8], 0],
      [46, 17, 60, [4.8, 11, 4.8], 90], [93, 17, 60, [4.8, 11, 4.8], 90]]),
    ...points('crystal', [[3, 0, 54, 1.55], [6, 0, 66, 1.7], [21, 0, 65, 1.42]]),
    ...points('beacon', [[23, 0, 58], [23, 0, 62], [38, 0, 57.6], [38, 0, 62.4],
      [56, 0, 35], [84, 0, 35], [93, 0, 51], [84, 0, 83], [56, 0, 83], [46, 0, 69]]),
    ...points('terminal', [[17, 0, 56, 1.16, 270]]),
  ],
};

function distantScenery(sec) {
  const [width, depth] = sec.footprint;
  const out = [];
  for (let i = 0; i < 16; i++) {
    const x = (i % 8 + .5) * width / 8 + ((i * 23) % 17 - 8);
    const z = i < 8 ? -17 - ((i * 9) % 28) : depth + 14 + ((i * 9) % 24);
    const scale = 3.9 + ((i * 19) % 12) * .51;
    out.push(placement('asteroid', [x, -23 + ((i * 13) % 23), z], { scale, yaw: i * 69 % 360 }));
  }
  return out;
}

function markers(m) {
  if (!m.at) return [];
  const ids = [`marker:${m.id}`];
  if (m.kind === 'fuelPad') {
    return [placement('fuel', [m.at[0], m.at[1] - .19, m.at[2]], { scale: 1.2, replace: ids })];
  }
  if (m.kind === 'gravityWell') {
    return [placement('vortex', [m.at[0], m.at[1] - 1, m.at[2]], {
      replace: ids.concat('s4.wellVis', 's4.well1', 's4.well2', 's4.well3'),
    })];
  }
  return [];
}

export function voidPlacements(sec, prims, doors = []) {
  const out = [];
  for (const g of prims.values()) {
    if (g.kind === 'box') out.push(...boxPlacements(g, prims));
    if (g.kind === 'cylinder') out.push(...roundPlacements(g, prims));
    out.push(...attachedRocks(g));
  }
  for (const m of sec.mechanisms) out.push(...markers(m));
  for (const { id, min, max } of doors) {
    const at = min.map((v, i) => (v + max[i]) / 2);
    const size = min.map((v, i) => max[i] - v);
    out.push(boxFit('bulkhead', { id, at, size }, { longSide: true }));
  }
  for (const prop of (SCENERY[sec.id] || []).concat(distantScenery(sec))) {
    out.push({ ...prop, at: prop.at.map((v, i) => v + sec.origin[i]) });
  }
  return out;
}
