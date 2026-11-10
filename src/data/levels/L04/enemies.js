// Stat blocks the level needs and the live enemy table does not have.
// Do not copy these into src/data/enemies.js from this PR: that file is the
// engine owner's, and HP there is in the campaign fingerprint.
// Tier-1 numbers. L04 multiplies HP and damage by 1.15^3 = 1.52.

export const TIER = 1.52;

export const L04_FLYERS = {
  bitbug: {
    archetype: 'swarmFlock', hp: 12, hpTier: 18, seconds: 3,
    note: 'Live dress() hp is 18. Flocks of 6 count as 1 against maxAlive.',
  },
  jetObama: {
    archetype: 'jetFlyer', hp: 80, hpTier: 122, seconds: 9,
    thruster: 2, death: { r: 3, damage: 15 },
    note: 'Live dress() hp is 55 and the weak spot is 2.5×. The level wants ×2.',
  },
  balloonMidget: {
    archetype: 'floaterMine', hp: 10, hpTier: 15, seconds: 5,
    speed: 3, fuse: 2.5, burst: { r: 4, damage: 20, damageTier: 30 },
    note: 'Live dress() hp is 28 and the blast is 18 in r 2.6.',
  },
};

export const FLAK_POD = {
  id: 'flakPod',
  name: 'Gas Fee Flak Pod',
  archetype: 'flakTurret',
  hp: 160,
  hpTier: 243,
  stagger: false,
  radius: 1.3,
  height: 2.6,
  speed: 0,
  turn: 120,
  pitch: [-5, 85],
  range: 45,
  airborne: { groundedFor: 0.35, feetAbove: 1.2 },
  dropLock: 0.5,
  tell: 0.9,
  shells: 4,
  shellGap: 0.22,
  shellSpeed: 24,
  shellRadius: 0.3,
  fuse: 2.5,
  burst: { r: 3.2, damage: [8, 4], damageTier: [12, 6] },
  fuelDrain: 18,
  lead: 0.7,
  between: [3.0, 3.6],
  gooJam: 4,
  zapStun: 1.5,
  shield: { absorb: 0.6, fuel: 0, manaPerHit: 6 },
  elite: {
    name: 'Priority Fee',
    hp: 400,
    hpTier: 608,
    shells: 6,
    range: 55,
    scale: 1.25,
  },
  drops: { ammo: 0.85, gun: 0.08, tickets: 4, resources: 0 },
  seconds: 9,
  look: [
    { kind: 'cylinder', at: [0, 0, 0], r: 1.3, h: 1, mat: 'metal' },
    { kind: 'sphere', at: [0, 1.7, 0], r: 0.85, mat: 'neon', color: 0xb26bff },
    { kind: 'box', at: [0.25, 1.7, 0.6], size: [0.3, 0.3, 1.6], mat: 'metal' },
    { kind: 'box', at: [-0.25, 1.7, 0.6], size: [0.3, 0.3, 1.6], mat: 'metal' },
    { kind: 'box', at: [0, 0.8, -1.2], size: [0.5, 0.5, 0.3], mat: 'metal' },
  ],
  hitboxes: [
    { zone: 'body', shape: 'cylinder', r: 1.3, y0: 0, y1: 1 },
    { zone: 'armor', shape: 'sphere', r: 0.85, y: 1.7, mult: 0.4 },
    { zone: 'weak', shape: 'sphere', r: 0.4, y: 0.8, z: -1.2, mult: 2.5, onlyWhen: 'vent' },
  ],
};

// Duel stageHealth × DUEL_HP_K, first pass 1.52. Live DUEL_BOSSES stay 760 and 520.
export const DUO = {
  k: 1.52,
  obama: { pump: 578, hype: 669, dump: 760, total: 2007 },
  midget: { smallCap: 684, moon: 783, squeeze: 852, total: 2319 },
  pylon: 274,
  breaker: 365,
  names: { obama: 'Bitcoin Obama', midget: 'The Midget', duo: 'The Pump & Dump Duo' },
};

export const L04_SPELLS = {
  held: ['gooBolt', 'chainZap', 'carpet', 'yeet', 'swarm'],
  shrine: 'manaShield',
  reward: 'pumpIt',
};
