// Visual dressing for Frostspire's authored solids and encounter markers.
const DECKS = /^(?:S1-bridge|S1-lookDeck|S1-mastDeck|S1-crowsNest|S2-tower[WE]-deck|S3-(?:gall[NSWE]|landing)|S4-(?:gall[NSWE]|landNW|landSE|f3floor))$/;
const OUTER_WALLS = /^S2-(?:wall|pier|parapet|lintel)|^(?:BW|BE)-shell|^S3-wall/;
const GENERATORS = /^(?:BW|BE)-gen-body$/;
const CRASH_FINS = ['S1-podFin1', 'S1-podFin2', 'S1-podFin3'];
const MACHINE_PARTS = ['S3-genNW', 'S3-genNE'];

export const FROST_COLORS = {
  snow: 0xbccfe6, ice: 0x699bc2, rock: 0x4d627c, concrete: 0x53677d,
  metal: 0x486079, wood: 0x73584e, gold: 0xd28b42,
};

function prop(name, at, scale = 1, yaw = 0, replace) {
  return { model: `frost_${name}`, at, scale, yaw, replace };
}

function boxRun(out, model, g, segment = Infinity, raise = 0) {
  const [x, y, z] = g.at;
  const [w, h, d] = g.size;
  const turned = d > w;
  const length = Math.max(w, d), width = Math.min(w, d);
  const count = Math.max(1, Math.ceil(length / segment));
  for (let i = 0; i < count; i++) {
    const offset = ((i + .5) / count - .5) * length;
    out.push(prop(model, [x + (turned ? 0 : offset), y - h / 2 + raise, z + (turned ? offset : 0)],
      [length / count / 2, h, width / 2], (g.yaw || 0) + (turned ? 90 : 0), [g.id]));
  }
}

function column(name, g, replace = [g.id]) {
  return prop(name, g.at, [g.r, g.h, g.r], 0, replace);
}

function dressPrimitive(g, out, prims) {
  const { id, mat, kind, at } = g;
  if (kind === 'sphere' && (mat === 'ice' || mat === 'snow')) {
    out.push(prop('boulder', [at[0], at[1] - g.r, at[2]], [g.r, g.r * 2, g.r], at[0] * 17 % 360, [id]));
  } else if (id === 'S1-pod') {
    out.push(prop('pod', at, 1, 0, [id, ...CRASH_FINS]));
  } else if (id === 'S1-snowcat-body') {
    out.push(prop('snowcat', [at[0], at[1] - 1.2, at[2]], 1, g.yaw,
      [id, 'S1-snowcat-cabin', 'S1-snowcat-trackW', 'S1-snowcat-trackE']));
  } else if (/-trunk$/.test(id) && prims.has(id.replace(/-trunk$/, '-bough1'))) {
    const tree = id.replace(/-trunk$/, '');
    out.push(prop('pine', at, 1, at[0] * 27 % 360, [id, `${tree}-bough1`, `${tree}-bough2`]));
  } else if (/^S1-tent[12]$/.test(id)) {
    out.push(prop('tent', at, 1, id.endsWith('2') ? 27 : -19, [id, `${id}-col`]));
  } else if (id === 'S1-spire') {
    out.push(prop('spire', at, [g.r, g.h + 6, g.r], 0, [id, 'S1-spireCap']));
  } else if (id === 'S3-iceMachine') {
    out.push(prop('tank', at, 1, 0, [id]));
  } else if (id === 'S5-safe') {
    out.push(prop('safe', at, 1, 0, [id]));
  } else if (id === 'S5-drill') {
    out.push(prop('drill', [at[0], at[1] - .5, at[2]], 1, 0, [id]));
  } else if (id === 'S5-pad') {
    out.push(prop('pad', at, 1, 0, [id]));
  } else if (id === 'S5-ring' || id === 'S1-shrineDisc') {
    out.push(prop('charge_ring', at, [g.r / 9, 1, g.r / 9], 0, [id]));
  } else if (kind === 'cylinder' && mat === 'ice' && /^S3-pillar|^S1-shrineStone/.test(id)) {
    out.push(column('spire', g));
  } else if (kind === 'cylinder' && (/^S5-pillar|^S2-tower[WE]-(?:leg|post)|^S1-mast$/.test(id))) {
    out.push(column('column', g));
  } else if (kind === 'box') {
    dressBox(g, out);
  }
}

function dressBox(g, out) {
  const { id, mat, size: [w, h, d] } = g;
  if (/^S1-debris/.test(id)) boxRun(out, 'debris', g);
  else if (/^S[12]-cliff/.test(id)) boxRun(out, 'glacier', g, 32);
  else if (mat === 'rock' && /^S1-(?:rowC|passSlab)|^S2-(?:rock|centreSlab)/.test(id)) boxRun(out, 'glacier', g);
  else if (mat === 'snow' && /^S1-(?:ridgeLip|berm|rowE|flankWall)|^S2-(?:tr[WE]|jog|last)/.test(id)) boxRun(out, 'drift', g, 13);
  else if (/^S1-creekIce$|^S2-ice[1-4]$/.test(id)) boxRun(out, 'ice_floor', g, 14);
  else if (/^S4-shelf-/.test(id)) boxRun(out, 'shelf', g);
  else if (/^S5-console/.test(id)) boxRun(out, 'console', g);
  else if (GENERATORS.test(id)) boxRun(out, 'generator', g);
  else if (mat === 'crate') boxRun(out, 'crate', g, 3);
  // These authored slabs are coplanar with the S5 floor and overlap each other.
  else if (id === 'S5-padFloor' || id === 'S5-gantry') boxRun(out, 'deck', g, 8, id === 'S5-padFloor' ? .026 : .012);
  else if (DECKS.test(id)) boxRun(out, 'deck', g, 8);
  else if (/rail/i.test(id) && h < 2) boxRun(out, 'rail', g, 8);
  else if (/^S2-tower[WE]-roof$/.test(id)) boxRun(out, 'roof', g);
  else if (/^S3-bar|^S5-block|^S2-apron|^S1-rigBag/.test(id)) boxRun(out, 'cover', g);
  else if ((mat === 'concrete' || /^S5-vault/.test(id)) && h >= 1 && h > Math.min(w, d) * .7) {
    boxRun(out, OUTER_WALLS.test(id) ? 'wall' : 'panel', g, 12);
  }
}

function mechanismProps(sec, out, prims) {
  for (const m of sec.mechanisms) {
    if (!m.at) continue;
    if (m.kind === 'searchlight') {
      const id = m.harmless ? 'S1-practiceLight' : m.id;
      const replace = [`${id}-post`, `${id}-lamp`, `${id}-beam`, `marker:${m.id}`];
      const lamp = m.harmless ? prop('floodlight', m.at, 1, 180, replace)
        : { ...prop('searchlight', m.at, 1, 0, replace), searchlight: m, ground: sec.origin[1] };
      out.push(lamp);
    } else if (m.kind === 'alarm') {
      const [x, y, z] = m.at;
      out.push(prop('alarm', [x, y - .38, z], 1, 0, [`${m.id}-siren`, `marker:${m.id}`]));
    }
  }
  for (const id of MACHINE_PARTS) {
    const g = prims.get(`${id}-body`);
    if (!g) continue;
    out.push(prop('generator', g.at, [1.8, 2.4, 1.2], 0,
      [g.id, `${id}-coilW`, `${id}-coilE`, `${id}-core`]));
  }
}

// Local east, height and north coordinates. Navigation volumes and firing lanes stay clear.
const LANDMARKS = {
  S1: [
    ['beacon', 144, 0, 19], ['beacon', 158, 0, 52], ['beacon', 153, 1.8, 261, .54],
    ['beacon', 144, 0, 241, .55], ['beacon', 159.2, 0, 241, .55],
    ['beacon', 144, 0, 271, .55], ['beacon', 159.2, 0, 271, .55],
    ['beacon', 142.6, 0, 304, .7], ['beacon', 156.8, 0, 506, .72],
    ['spire', 111, 0, 21, [6, 13, 5], 28], ['spire', 186, 0, 46, [8, 16, 6], 81],
    ['boulder', 127, 0, 40, [4, 2.6, 3], 29], ['boulder', 169, 0, 39, [4, 2.8, 3], 107],
    ['boulder', 108, 0, 72, [5, 3.1, 4], 19], ['boulder', 195, 0, 64, [6, 3.7, 5], 61],
    ['spire', 102, 0, 132, [6, 10, 7], 34], ['spire', 217, 0, 151, [7, 12, 7], 87],
    ['boulder', 95, 0, 264, [5, 2.8, 4], 11], ['boulder', 215, 0, 240, [7, 4.6, 6], 42],
    ['boulder', 24, 0, 245, [7, 5, 5], 60], ['boulder', 271, 0, 266, [8, 5, 5], 100],
  ],
  S2: [
    ['portal_trim', 130, 0, 199.8],
    ['beacon', 112.2, 0, 194, .75], ['beacon', 147.8, 0, 194, .75],
    ['beacon', 121, 8, 203.3, .8], ['beacon', 139, 8, 203.3, .8],
    ['spire', 20, 0, 37, [8, 14, 7], 31], ['spire', 237, 0, 39, [7, 13, 6], 95],
    ['boulder', 22, 0, 105, [6, 3, 4], 92], ['boulder', 14, 0, 151, [4, 2.4, 6], 27],
    ['boulder', 247, 0, 192, [4, 2.9, 4], 129],
  ],
  S3: [
    ['portal_trim', 50, 0, 22, 1],
    ['beacon', 41.8, 0, 25, .8], ['beacon', 58.2, 0, 25, .8],
    ['beacon', 46, 0, 94, .8], ['beacon', 54, 0, 94, .8],
    ['floodlight', 28, 12, 23, .84, 180], ['floodlight', 72, 12, 23, .84, 180],
    ['floodlight', 32, 12, 95, .84], ['floodlight', 68, 12, 95, .84],
  ],
  S4: [
    ['beacon', 38.4, 0, 3, .63], ['beacon', 41.6, 0, 3, .63],
    ['beacon', 37.5, 0, 61.7, .82], ['beacon', 42.5, 0, 61.7, .82],
    ['portal_trim', 40, 0, 12, [8 / 14, .44, 1.7]],
    ['portal_trim', 40, 0, 56, [8 / 14, .44, 1.7]],
    ['console', 14.3, 7, 33.5, [1.08, 1.2, .44], 90],
    ['console', 65.7, 7, 38, [1.08, 1.2, .44], 270],
    ['beacon', 36.5, 14, 63.2, .7], ['beacon', 43.5, 14, 63.2, .7],
  ],
  S5: [
    ['portal_trim', 40, 0, 84, [10 / 14, 4 / 6, 1]],
    ['beacon', 36.9, 0, 38.4, .78], ['beacon', 43.1, 0, 38.4, .78],
    ['beacon', 37.5, 0, 87, .68], ['beacon', 42.5, 0, 87, .68],
    ['console', 28.9, 0, 17, [.88, 1.18, .45], 90],
    ['console', 51.1, 0, 17, [.88, 1.18, .45], 270],
    ['floodlight', 33.8, 0, 94, .91, 65], ['floodlight', 46.2, 0, 94, .91, 290],
  ],
};

function scenery(sec, out) {
  const [ox, oy, oz] = sec.origin;
  for (const [name, x, y, n, scale = 1, yaw = 0] of LANDMARKS[sec.id]) {
    out.push(prop(name, [ox + x, oy + y, oz - n], scale, yaw));
  }
  if (sec.id === 'S4') return;
  const [w, depth] = sec.footprint;
  // Layer foothills, inhabited relay stations, and the painted far mountains.
  for (const [x, n, scale, yaw] of [
    [w * .12, depth + 42, [1.23, 1.55, 1.2], 9], [w * .54, depth + 96, [1.72, 2.42, 1.8], 14],
    [w * .89, depth + 53, [1.43, 1.8, 1.38], -11], [-57, depth * .64, [1.16, 1.73, 1.37], 83],
    [w + 67, depth * .75, [1.28, 1.84, 1.43], -72], [-74, depth * .24, [1.41, 1.93, 1.52], 90],
    [w + 60, depth * .34, [1.36, 1.67, 1.35], -75],
  ]) {
    const nearExtraction = sec.id === 'S5' && n > depth;
    out.push(prop('ridge', [ox + x, oy - (nearExtraction ? 20 : 11), oz - n - (nearExtraction ? 30 : 0)], scale, yaw));
  }
  for (const [x, n, scale, yaw] of [[w * .8, depth + 52, 1.55, -15], [-31, depth * .41, 1.36, 67],
    [w + 34, depth * .57, 1.24, -60]]) {
    const y = oy - 3;
    const z = oz - n - (sec.id === 'S5' && n > depth ? 21 : 0);
    out.push(prop('relay_outpost', [ox + x, y, z], scale, yaw));
    out.push(prop('boulder', [ox + x, y - 9, z], [13 * scale, 10, 11 * scale], yaw));
  }
}

export function frostspirePlacements(sec, prims, doors = []) {
  const out = [];
  for (const g of prims.values()) if (g.at && g.id) dressPrimitive(g, out, prims);
  for (const { id, min, max } of doors) {
    boxRun(out, 'gate', { id, at: min.map((v, i) => (v + max[i]) / 2), size: min.map((v, i) => max[i] - v) });
  }
  mechanismProps(sec, out, prims);
  scenery(sec, out);
  return out;
}
