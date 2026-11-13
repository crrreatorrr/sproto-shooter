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
    fit: {
      'S1-truck': { duel: 'food_truck' },
      'S1-cover-a': { model: 'landing_bin' },
      'S1-cover-b': { model: 'landing_bin' },
      'S1-barricade': { model: 'barricade' },
      'S2-tank': { model: 'water_tank' },
      'S3-kiosk': { model: 'kiosk' },
      'S4-car': { model: 'landing_car' },
      'S4-core': { model: 'machine' },
      'S5-car': { model: 'landing_car' },
      'S5-toll': { model: 'toll_booth' },
      'S6-fountain': { model: 'fountain' },
      'S6-gate-l': { model: 'landing_tower', yaw: -90 },
      'S6-gate-r': { model: 'landing_tower', yaw: -90 },
      'S1-car-a': { model: 'landing_car' },
      'S1-car-b': { model: 'landing_car' },
      'S1-car-c': { model: 'landing_car' },
      'S1-bin-c': { model: 'landing_bin' },
      'S1-barricade-s': { model: 'barricade' },
      'S2-bin-a': { model: 'landing_bin' },
      'S2-bin-b': { model: 'landing_bin' },
      'S2-car-a': { model: 'landing_car' },
      'S3-kiosk-b': { model: 'kiosk' },
      'S3-planter-a': { model: 'planter' },
      'S3-planter-b': { model: 'planter' },
      'S4-car-b': { model: 'landing_car' },
      'S4-car-c': { model: 'landing_car' },
      'S4-car-d': { model: 'landing_car' },
      'S4-car-e': { model: 'landing_car' },
      'S5-car-b': { model: 'landing_car' },
      'S5-car-c': { model: 'landing_car' },
      'S5-car-d': { model: 'landing_car' },
      'S5-car-e': { model: 'landing_car' },
      'S6-planter-a': { model: 'planter' },
      'S6-planter-b': { model: 'planter' },
      'S6-planter-c': { model: 'planter' },
    },
    groups: [
      { ids: ['S1-slide-body', 'S1-slide-cab'], model: 'slide_truck' },
    ],

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
