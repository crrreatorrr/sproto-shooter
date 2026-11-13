// Which kit model stands in for which level primitive, and the scenery around the route.
// Render only: the sim still collides with the primitives in src/data/levels, so a model is
// stretched to the box it replaces. Scenery has no collision and sits outside the walkable strip.

/** Mechanism kind to model name. `rack` is a weapon rack. */
export const MECHANISM_MODEL = {
  barrel: (m) => (m.element === 'shock' ? 'barrel_shock' : 'barrel_fire'),
  chest: () => 'chest',
  switch: () => 'switch',
  shrine: () => 'shrine',
  secret: () => 'secret',
  rack: () => 'weapon_rack',
};

/** Mechanisms that disappear once `level.got[id]` is set. */
export const HIDE_WHEN_GOT = new Set(['barrel', 'secret', 'ammo']);

const BUILDINGS = [
  { model: 'building_a', w: 13 },
  { model: 'building_b', w: 10 },
  { model: 'building_c', w: 15 },
];

const FAR = ['skyline_a', 'skyline_c', 'skyline_b'];

/**
 * A street's worth of scenery for a section `length` metres long. Coordinates are section-local.
 * The walkable strip is z 2 to 30. Flat pieces (pavement, markings) lie on it. Everything
 * with height stands on its edge or beyond it.
 */
function street(length, { seed = 0, buildings = true, palms = true, lamps = true, rails = false, planters = false, crossings = [], extras = [], skipNorth = [], skipSouth = [], vista = null } = {}) {
  const out = [];
  const clear = (x, w, skips) => skips.every(([a, b]) => x + w / 2 < a || x - w / 2 > b);
  if (buildings) {
    for (const [z, skips, offset] of [[-3.2, skipNorth, 0], [35.2, skipSouth, 1]]) {
      let x = -4;
      let i = seed + offset;
      while (x < length + 4) {
        const b = BUILDINGS[i++ % BUILDINGS.length];
        if (clear(x + b.w / 2, b.w, skips)) out.push({ model: b.model, at: [x + b.w / 2, 0, z] });
        x += b.w + 1.2;
      }
    }
  }
  // Far skyline behind both sides, staggered in depth so it never reads as one wall.
  for (let x = -10, i = seed; x < length + 30; x += 34, i++) {
    // `vista` is a stretch of the north side left open so the hill behind it shows.
    if (!vista || x < vista[0] || x > vista[1]) out.push({ model: FAR[i % 3], at: [x, -2, -34 - (i % 2) * 16], yaw: (i % 4) * 90 });
    out.push({ model: FAR[(i + 1) % 3], at: [x + 17, -2, 64 + (i % 2) * 14], yaw: (i % 4) * 90 });
  }
  // Pavement along both edges, a dashed centre line, and crossings where asked.
  for (let x = 6; x < length; x += 12) {
    out.push({ model: 'sidewalk', at: [x, 0.01, 3.2] });
    out.push({ model: 'sidewalk', at: [x, 0.01, 28.8], yaw: 180 });
  }
  for (let x = 4; x < length; x += 7) {
    if (crossings.every((c) => Math.abs(x - c) > 4)) out.push({ model: 'road_dash', at: [x, 0.01, 16] });
  }
  for (const x of crossings) out.push({ model: 'crosswalk', at: [x, 0.01, 16] });
  if (rails) {
    for (let x = 3; x < length; x += 6) {
      out.push({ model: 'guard_rail', at: [x, 0, 1.7] });
      out.push({ model: 'guard_rail', at: [x, 0, 30.3] });
    }
  }
  for (let x = 10; x < length - 4; x += 24) {
    if (lamps) {
      out.push({ model: 'street_lamp', at: [x, 0, 2.5], yaw: 180 });
      out.push({ model: 'street_lamp', at: [x + 12, 0, 29.5], yaw: 0 });
    }
    if (palms) {
      out.push({ model: 'palm_tree', at: [x + 12, 0, 1.4], yaw: (x * 37) % 360 });
      out.push({ model: 'palm_tree', at: [x, 0, 30.6], yaw: (x * 53) % 360 });
    }
    if (planters) {
      out.push({ model: 'planter', at: [x + 6, 0, 2.6] });
      out.push({ model: 'planter', at: [x + 18, 0, 29.4] });
    }
  }
  return out.concat(extras);
}

const cones = (x, z, n, step = 1.1) => Array.from({ length: n }, (_, i) => ({ model: 'traffic_cone', at: [x + i * step, 0, z] }));

/**
 * fit: primitive id to model. The model is stretched to that primitive's box.
 * groups: several primitives replaced by one model stretched over their combined box.
 * decor: scenery by section id.
 * hide: primitives that collide but are not drawn (the shopfronts and rails already stand there).
 * ground: colour of the city floor drawn under and around the route, so the street does not float.
 */
export const DRESSING = {
  L01: {
    ground: 0x3a3144,
    hide: /-side-(n|s|s1|s2)$/,
    fit: {
      'S1-truck': { duel: 'food_truck' },
      'S1-cover-a': { duel: 'dumpster' },
      'S1-cover-b': { duel: 'dumpster' },
      'S1-barricade': { model: 'barricade' },
      'S2-tank': { model: 'water_tank' },
      'S3-kiosk': { model: 'kiosk' },
      'S4-car': { duel: 'parked_car' },
      'S4-core': { model: 'machine' },
      'S5-car': { duel: 'parked_car' },
      'S5-toll': { model: 'toll_booth' },
      'S6-fountain': { model: 'fountain' },
      'S1-car-a': { duel: 'parked_car' },
      'S1-car-b': { duel: 'parked_car' },
      'S1-car-c': { duel: 'parked_car' },
      'S1-bin-c': { duel: 'dumpster' },
      'S1-barricade-s': { model: 'barricade' },
      'S2-bin-a': { duel: 'dumpster' },
      'S2-bin-b': { duel: 'dumpster' },
      'S2-car-a': { duel: 'parked_car' },
      'S3-kiosk-b': { model: 'kiosk' },
      'S3-planter-a': { model: 'planter' },
      'S3-planter-b': { model: 'planter' },
      'S4-car-b': { duel: 'parked_car' },
      'S4-car-c': { duel: 'parked_car' },
      'S4-car-d': { duel: 'parked_car' },
      'S4-car-e': { duel: 'parked_car' },
      'S5-car-b': { duel: 'parked_car' },
      'S5-car-c': { duel: 'parked_car' },
      'S5-car-d': { duel: 'parked_car' },
      'S5-car-e': { duel: 'parked_car' },
      'S6-planter-a': { model: 'planter' },
      'S6-planter-b': { model: 'planter' },
      'S6-planter-c': { model: 'planter' },
    },
    groups: [
      { ids: ['S1-slide-body', 'S1-slide-cab'], model: 'slide_truck' },
    ],
    decor: {
      S1: street(200, {
        seed: 0, crossings: [40, 112, 184], vista: [40, 160],
        skipNorth: [[8, 34], [84, 118]], // the neon sign hangs in the first gap; the second frames the hill
        extras: [
          { model: 'hill_sign', at: [101, -8, -120], scale: 1.9 },
          { model: 'planter', at: [90, 0, 0.6] },
          { model: 'planter', at: [112, 0, 0.6] },
          { model: 'bench', at: [101, 0, 0.8] },
          { model: 'billboard', at: [118, 0, 0.6] },
          { model: 'hydrant', at: [44, 0, 2.6] },
          { model: 'bench', at: [84, 0, 29.4], yaw: 180 },
          { model: 'bench', at: [132, 0, 2.6] },
          { model: 'hydrant', at: [178, 0, 29.4] },
          ...cones(146, 2.7, 4),
          ...cones(146, 29.3, 4),
        ],
      }),
      S2: street(180, {
        seed: 1, palms: false, crossings: [100],
        extras: [
          { duel: 'dumpster', at: [96, 0, 2.9], height: 1.4 },
          { duel: 'dumpster', at: [118, 0, 29.1], yaw: 180, height: 1.4 },
          { model: 'hydrant', at: [150, 0, 2.6] },
          { model: 'billboard', at: [140, 0, 31.4], yaw: 180 },
          ...cones(160, 29.3, 3),
        ],
      }),
      S3: street(90, {
        seed: 2, lamps: false, planters: true,
        extras: [
          { model: 'bench', at: [20, 0, 2.6] },
          { model: 'bench', at: [64, 0, 29.4], yaw: 180 },
          { model: 'bench', at: [34, 0, 29.4], yaw: 180 },
        ],
      }),
      S4: street(130, {
        seed: 0, palms: false, crossings: [68],
        extras: [...cones(10, 2.7, 5, 1.4), ...cones(66, 29.3, 4), { model: 'hydrant', at: [116, 0, 2.6] }],
      }),
      S5: street(140, {
        seed: 1, buildings: false, palms: false, rails: true,
        extras: [
          { model: 'billboard', at: [20, 0, 0.8] },
          { model: 'billboard', at: [112, 0, 31.2], yaw: 180 },
          ...cones(40, 2.7, 4),
          ...cones(100, 29.3, 4),
        ],
      }),
      S6: street(110, {
        seed: 2, planters: true, crossings: [14],
        extras: [
          { model: 'bench', at: [36, 0, 2.6] },
          { model: 'bench', at: [58, 0, 2.6] },
          { model: 'bench', at: [36, 0, 29.4], yaw: 180 },
          { model: 'bench', at: [58, 0, 29.4], yaw: 180 },
        ],
      }),
    },
  },
};

// Fit cover and building faces to their existing collision volumes.
const stoneBox = (g) => g.kind === 'box' && g.mat === 'stone' && g.size;
DRESSING.L02 = {
  rules: [
    { match: /-tent\d$/, model: 'bazaar_tent' },
    { match: /-cart$/, model: 'cart' },
    { match: /-(low-[ab]|teeth-\d)$/, model: 'low_wall' },
    { match: /-vat-[14]$/, model: 'dye_vat_red' },
    { match: /-vat-[25]$/, model: 'dye_vat_teal' },
    { match: /-vat-[36]$/, model: 'dye_vat_gold' },
    { match: /-rack-\d$/, model: 'drying_rack' },
    { match: /-pile-\d$/, model: 'bazaar2_support' },
    { match: /-spire$/, model: 'bazaar2_ridge' },
    { match: /-tank$/, model: 'water_tank' },
    { match: /-fac-\w+$/, model: 'bazaar2_tower' },
    { match: /^s1-lintel$/, model: 'bazaar2_wall_panel' },
    { match: /^s2-well$/, model: 'well', keepHeight: true },
    { match: /^sm-fountain$/, model: 'fountain' },
    { when: (g) => stoneBox(g) && g.size[1] >= 4 && Math.min(g.size[0], g.size[2]) <= 4, model: 'bazaar2_wall_panel' },
    { when: (g) => stoneBox(g) && g.size[1] >= 3 && Math.min(g.size[0], g.size[2]) >= 5, model: 'bazaar2_shop' },
  ],
};

/**
 * Fallback by stage, for levels with no entry above: a far loop of that stage's own Sproto Duel props.
 * Big and distant, so each level has a horizon in its own theme without any hand placement.
 */
const duelRing = (stage, height) => ({ backdrop: { duel: true, ring: [`${stage}_prop`, `${stage}_pillar`], height, distance: 55, every: 70, y: 0 } });
export const STAGE_DRESSING = {
  city: duelRing('city', 22),
  desert: duelRing('desert', 20),
  grove: duelRing('grove', 22),
  glacier: duelRing('glacier', 24),
  void: duelRing('void', 26),
  volcano: duelRing('volcano', 24),
  office: duelRing('office', 18),
  moonlit: duelRing('void', 26),
};
