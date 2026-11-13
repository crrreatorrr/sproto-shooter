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

// L02, The Grand Bazaar. The layout is authored piece by piece, so it is dressed by rule: what each
// primitive is decides what stands in for it. Sproto Duel's desert props are used where they fit.
const stoneBox = (g) => g.kind === 'box' && g.mat === 'stone' && g.size;
DRESSING.L02 = {
  rules: [
    { match: /-tent\d$/, model: 'bazaar_tent' },
    { match: /-cart$/, model: 'cart' },
    { match: /-(low-[ab]|teeth-\d)$/, model: 'low_wall' },
    { match: /-vat-[14]$/, model: 'dye_vat_red' },
    { match: /-vat-[25]$/, model: 'dye_vat_teal' },
    { match: /-vat-[36]$/, model: 'dye_vat_gold' },
    { match: /(minaret-cap|balcony-roof)$/, model: 'onion_dome' },
    { match: /-rack-\d$/, model: 'drying_rack' },
    { match: /-pile-\d$/, duel: 'rug_pile' },
    { match: /-spire$/, duel: 'rock_outcrop' },
    { match: /-tank$/, model: 'water_tank' },
    { match: /-fac-\w+$/, duel: 'desert_pillar' },
    // Souk walls: tall and thin. Houses: anything with a real footprint.
    { when: (g) => stoneBox(g) && g.size[1] >= 4 && Math.min(g.size[0], g.size[2]) <= 4, model: 'bazaar_wall' },
    { when: (g) => stoneBox(g) && g.size[1] >= 3 && Math.min(g.size[0], g.size[2]) >= 5, model: 'sandstone_house' },
  ],
  decor: {
    S1: [
      { model: 'lantern_post', at: [73, 0, 116], yaw: 180 },
      { model: 'lantern_post', at: [85, 0, 142], yaw: 90 },
      { model: 'lantern_post', at: [129, 0, 113], yaw: 180 },
      { model: 'lantern_post', at: [165, 0, 18], yaw: 270 },
      { model: 'lantern_post', at: [181, 0, 31] },
      { model: 'clay_pots', at: [77, 0, 115], yaw: 30 },
      { model: 'clay_pots', at: [86, 0, 140.9], yaw: 155 },
    ],
    S2: [
      // The authored well collision sits inside the south shelf. Show the well on its rooftop.
      { model: 'well', at: [226, 6, 110] },
      { model: 'lantern_post', at: [223, 6, 106] },
      { model: 'lantern_post', at: [229, 6, 114], yaw: 180 },
      { model: 'clay_pots', at: [226.8, 6, 113.6], yaw: 60 },
    ],
    S3: [{ model: 'lantern_post', at: [165, 1, 123], yaw: 90 }],
    SM: [
      { model: 'lantern_post', at: [63, 0, 177], yaw: 270 },
      { model: 'lantern_post', at: [117, 0, 177], yaw: 180 },
    ],
  },
  backdrop: { ring: ['mesa_a', 'dune', 'far_bazaar', 'mesa_b', 'dune', 'far_bazaar'], distance: 70, every: 60 },
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
