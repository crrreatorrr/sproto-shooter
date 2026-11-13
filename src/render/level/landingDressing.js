// Dimensions in metres. Palm placements are confined to open setbacks and the outer plaza.
const FACADES = [
  ['facade_a', 14],
  ['facade_b', 11],
  ['facade_c', 16],
];
const PALETTES = {
  S1: { seed: 0, frontage: true, crossings: [40, 112, 184], gap: [[6, 36], [83, 120]], wall: 'street_wall' },
  S2: { seed: 1, frontage: true, crossings: [100], gap: [[81, 106]], wall: 'street_wall' },
  S3: { seed: 2, interior: [8, 80], wall: 'mall_wall', roof: 'S3-atrium-roof' },
  S4: { seed: 1, interior: [2.5, 57.5], crossings: [69, 115], wall: 'garage_wall', roof: 'S4-parking-roof' },
  S5: { seed: 0, wall: 'rail' },
  S6: { seed: 2, crossings: [14, 93], wall: 'street_wall' },
};

const FEATURES = {
  S1: [
    ['landing_hill', 101, -.52, -99, 0, 1.15],
    ['landing_palm', 16, 0, -4.9, 26, 1.23], ['landing_palm', 28, 0, -4.8, 68, 1.29],
    ['landing_palm', 92, 0, -4.8, -29, 1.26], ['landing_palm', 114, 0, -4.8, 154, 1.26],
    ['planter', 90, 0, .60], ['planter', 112, 0, .60], ['bench', 101, 0, .8],
    ['billboard', 118, 0, .6], ['hydrant', 44, 0, 2.6], ['bench', 84, 0, 29.4, 180],
    ['bench', 132, 0, 2.6], ['hydrant', 178, 0, 29.4],
    ['traffic_cone', 145, 0, 2.7], ['traffic_cone', 148, 0, 2.7], ['traffic_cone', 148, 0, 29.3],
  ],
  S2: [
    ['hydrant', 150, 0, 2.8], ['billboard', 140, 0, 31.5, 180],
    ['landing_wall_light', 29, 1.81, 4.56], ['landing_wall_light', 56, 1.81, 4.56],
    ['landing_wall_light', 35, 1.81, 27.44, 180], ['landing_wall_light', 66, 1.81, 27.44, 180],
    ['landing_palm', 88.5, 0, -6.2, 20, 1.16], ['landing_palm', 99.5, 0, -7.4, 177, 1.31],
  ],
  S3: [
    ['bench', 20, 0, -3], ['bench', 64, 0, 34.9, 180], ['bench', 34, 0, 34.9, 180],
    ['landing_mall_sign', 30, 8.6, -5.01], ['landing_mall_sign', 63, 8.6, 37.01, 180],
    ['landing_arrow', 83.3, .012, 8.2, -20, .76], ['landing_arrow', 83.3, .012, 23.8, 20, .76],
  ],
  S4: [
    ['traffic_cone', 12, 0, -1.6], ['traffic_cone', 14, 0, -1.6],
    ['traffic_cone', 59, 0, 32.7], ['traffic_cone', 64, 0, 32.7], ['hydrant', 116, 0, -1.7],
    ['landing_park_sign', 23, 4.45, -3.04], ['landing_park_sign', 52, 4.45, 35.04, 180],
    ['landing_arrow', 113.8, .012, 5.0, -14], ['landing_arrow', 113.8, .012, 27.0, 14],
    ['landing_arrow', 122.2, .012, 8.0, -7], ['landing_arrow', 122.2, .012, 24.0, 7],
  ],
  S5: [
    ['billboard', 20, 0, .6], ['billboard', 112, 0, 31.5, 180],
    ['traffic_cone', 40, 0, 2.7], ['traffic_cone', 101, 0, 29.3],
    ['landing_roof_light', 50, 3.98, 13], ['landing_roof_light', 54, 3.98, 19],
  ],
  S6: [
    ['landing_palm', 34, 0, -15.2, 41, 1.24], ['landing_palm', 56, 0, -15.4, 81, 1.18],
    ['landing_palm', 74, 0, -15.1, 151, 1.10], ['landing_palm', 34, 0, 47.4, 89, 1.15],
    ['landing_palm', 56, 0, 47.8, -124, 1.22], ['landing_palm', 74, 0, 47.2, 38, 1.08],
    ['bench', 36, 0, -5.7], ['bench', 58, 0, -5.7], ['bench', 36, 0, 37.7, 180], ['bench', 58, 0, 37.7, 180],
    ['planter', 46, 0, -5.8], ['planter', 69, 0, -5.8], ['planter', 46, 0, 37.8], ['planter', 69, 0, 37.8],
    ['landing_roof_rib', 96, 11.68, 16, 0, [1.45, 1.13, 20.1]],
    ['landing_gate_sign', 94.97, 10.67, 16, -90, 1.11],
    ['landing_wall_light', 94.88, 8.1, -3, -90, .89], ['landing_wall_light', 94.88, 8.1, 35, -90, .89],
  ],
};

export function landingPlacements(sec, prims) {
  const style = PALETTES[sec.id];
  const floor = prims.get(`${sec.id}-floor`);
  if (!style || !floor) return [];
  const [x0, y0, z0] = sec.origin;
  const [length, , width] = floor.size;
  const centre = floor.at[2] - z0;
  const out = [];
  const add = (model, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model, at: [x0 + x, y0 + y, z0 + z], yaw, scale, replace });

  for (const g of prims.values()) {
    if (!g.id.startsWith(`${sec.id}-side-`)) continue;
    const [span, h, depth] = g.size;
    const count = Math.ceil(span / (sec.id === 'S5' ? 9 : 14));
    const w = span / count;
    const north = g.at[2] < floor.at[2];
    for (let i = 0; i < count; i++) {
      add(`landing_${style.wall}`, g.at[0] - x0 - span / 2 + (i + .5) * w, 0, g.at[2] - z0,
        north ? 0 : 180, [w / 2, h, depth / 2], [g.id]);
    }
  }

  for (const side of [-1, 1]) {
    const edge = centre + side * width / 2;
    const yaw = side === -1 ? 0 : 180;
    if (style.frontage) {
      let i = style.seed + (side === 1 ? 1 : 0);
      for (let x = 0; x < length;) {
        const [facade, w] = FACADES[i++ % FACADES.length];
        const mid = x + w / 2;
        const clear = side > 0 || style.gap.every(([a, b]) => x + w + 1.0 < a || x - 1.0 > b);
        if (clear) add(`landing_${facade}`, mid, 0, edge + side * 4.31, yaw, [1, 1 + (i % 3) * .075, 1]);
        x += w + 2.2;
      }
    }
    // A second row recedes from both edges and a third row is painted into the sky.
    for (let i = 0, x = 6; x < length + 25; x += 32, i++) {
      if (sec.id === 'S1' && side === -1 && x > 65 && x < 129) continue;
      const z = edge + side * (30 + (i % 3) * 9);
      const h = 1.13 + ((i + style.seed) % 4) * .24;
      add('landing_block', x + (side > 0 ? 10 : 0), sec.id === 'S5' ? -13 : -.35, z, yaw, [1.24, h, 1.24]);
    }
    for (let x = 6; x < length; x += 12) {
      add('sidewalk', x, .008, edge - side * 1.22, yaw);
    }
    if (sec.id === 'S3') continue;
    for (let x = 14 + (side > 0 ? 12 : 0); x < length - 5; x += 25) {
      if (style.interior && x >= style.interior[0] && x <= style.interior[1]) continue;
      if (sec.id === 'S5' && side === 1 && x >= 45 && x <= 59) continue;
      add('landing_lamp', x, 0, edge - side * 1.28, yaw);
    }
  }

  if (sec.id === 'S4') {
    for (const z of [2.4, 28.7]) {
      for (let x = 7; x < 53; x += 4.05) {
        add('landing_parking_bay', x, .015, z, z < centre ? 180 : 0);
      }
    }
  }

  if (sec.id !== 'S3' && sec.id !== 'S6') {
    for (let x = 4; x < length; x += 7) {
      if (style.crossings?.some(c => Math.abs(x - c) <= 4)) continue;
      add('road_dash', x, .009, centre);
    }
  }
  for (const x of style.crossings || []) add('crosswalk', x, .009, centre, 0, [1, 1, width / 28]);

  if (style.roof) {
    const roof = prims.get(style.roof);
    const [span, thickness, depth] = roof.size;
    const bottom = roof.at[1] - y0 - thickness / 2;
    const start = roof.at[0] - x0 - span / 2;
    const count = Math.ceil(span / 12);
    const w = span / count;
    for (let i = 0; i < count; i++) {
      const x = start + w * (i + .5);
      add('landing_roof_rib', x, bottom - .32, centre, 0, [.72, 1, depth / 2]);
      for (const side of [-1, 1]) {
        const z = centre + side * (width / 2 + .58);
        const upper = bottom - 5.99;
        add(sec.id === 'S3' ? 'landing_upper_wall' : 'landing_garage_wall', x, 5.99, z,
          side < 0 ? 0 : 180, [w / 2, upper, .41]);
        add('landing_roof_light', x + w * .31, bottom - .26, centre + side * width * .23);
        if (sec.id === 'S4') add('landing_wall_light', x + w * .21, 2.12, z - side * .48, side < 0 ? 0 : 180);
      }
    }
  }
  if (sec.id === 'S5') {
    for (const x of [12, 38, 67, 94, 122]) {
      for (const side of [-1, 1]) {
        add('landing_tower', x, -13, centre + side * 9, 90, [1.4, 1.04, 1.23]);
      }
    }
  }
  // Close the visual horizon with a set-back cross street. It remains beyond the section transition.
  add('landing_block', length + 53, sec.id === 'S5' ? -13 : -.55, centre - 37, -90, [1.4, 1.39, 1.34]);
  add('landing_block', length + 61, sec.id === 'S5' ? -13 : -.55, centre + 44, -96, [1.8, 1.82, 1.35]);

  for (const feature of FEATURES[sec.id]) add(...feature);
  return out;
}
