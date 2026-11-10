// Tier-1 stat blocks for the enemies L03 introduces. The campaign multiplies
// HP and damage by 1.32. These records are not wired into src/data/enemies.js;
// the four placeholders are not spawnable until the engine adds them.

export const L03_ARCHETYPES = {
  floretSprout: {
    hp: 50, speed: 6.2, radius: 0.4, height: 1.3, seconds: 8,
    attacks: { florets: 3, flight: 1.2, warningR: 1.6, damage: 6, every: 5, puffR: 2, puffDps: 3, puffTime: 3 },
    yeetReturn: { window: 0.4, damageEach: 30 },
  },
  sewerMidget: {
    hp: 40, speed: 7.8, radius: 0.45, height: 1.3, seconds: 3, melee: 9,
    burrow: { dust: 0.6, near: 12, surface: 4 },
    gooPlug: 4,
  },
  daycare: {
    hp: 400, speed: 0, radius: 2, height: 3, seconds: 25,
    spawn: { count: 2, every: 6, capAlive: 8, budget: 5, coreOpen: 1.5 },
    damageTaken: { shellBullets: 0.5, core: 2.5, explosives: 1 },
    gooJam: 4,
  },
  hexWisp: {
    hp: 45, speed: 5, fly: [1.2, 2.6], radius: 0.5, height: 1, seconds: 5,
    ghost: true,
    damageTaken: { bullet: 0.2, explosive: 0.5, spell: 2, reflectedOrb: 2 },
    orb: { every: 3.2, range: 16, damage: 8, speed: 9, life: 4 },
    touch: { range: 1.5, windup: 0.6, damage: 6, mana: 12 },
    look: [
      { kind: 'sphere', at: [0, 0.6, 0], r: 0.5, mat: 'neon' },
      { kind: 'sphere', at: [-0.12, 0.7, 0.2], r: 0.08, mat: 'neon' },
      { kind: 'sphere', at: [0.12, 0.7, 0.2], r: 0.08, mat: 'neon' },
      { kind: 'cone', at: [0, 0.5, -0.4], r: 0.3, h: 0.8, mat: 'neon' },
    ],
  },
  barkBrute: {
    hp: 260, speed: 3.2, turn: 90, radius: 0.8, height: 2.4, seconds: 18,
    club: { reach: 2.6, windup: 0.8, damage: 22, knockback: 8 },
    charge: { from: 6, to: 14, windup: 0.7, speed: 10, distance: 10, damage: 18, knockback: 10, every: 6 },
    bark: { hard: { bullet: 0, explosive: 0.25, spell: 1 }, softened: 4, cracked: 6, knotBullet: 1, strippedBullet: 1.25 },
    yeet: { closed: 5, open: 8 },
    look: [
      { kind: 'box', at: [0, 0.45, 0], size: [1.0, 0.9, 0.7], mat: 'wood' },
      { kind: 'box', at: [0, 1.4, 0], size: [1.4, 1.0, 0.9], mat: 'wood' },
      { kind: 'box', at: [0, 2.15, 0], size: [0.7, 0.5, 0.6], mat: 'wood' },
    ],
  },
  manaLeech: {
    hp: 55, speed: 3.8, radius: 0.45, height: 1.1, seconds: 6,
    latch: { range: 10, windup: 0.8, drain: 8, heal: 4, shieldDps: 4, maxLatched: 2, breakLos: 0.5, relatch: 2 },
    keep: [6, 9],
    look: [
      { kind: 'cylinder', at: [0, 0, 0], r: 0.4, h: 1.1, mat: 'toxic' },
      { kind: 'disc', at: [0, 0.7, 0.4], r: 0.45, mat: 'neon' },
    ],
  },
  gooGlob: {
    hp: { big: 90, medium: 40, small: 15 },
    speed: { big: 3, medium: 4.2, small: 6 },
    radius: { big: 1.1, medium: 0.7, small: 0.4 },
    seconds: 14,
    slam: { hop: 6, shadow: 1, damage: 14, radius: 2.5, puddle: 3, puddleTime: 5, slow: 0.4 },
    split: [1, 2, 4],
    core: 2.5,
    immune: ['goo', 'toxic'],
    yeetKillWithoutSplit: true,
    look: [
      { kind: 'sphere', at: [0, 1.1, 0], r: 1.1, mat: 'toxic' },
      { kind: 'sphere', at: [0, 1.1, 0], r: 0.33, mat: 'neon' },
    ],
  },
};

export const L03_SPELLS = {
  yeet: { mana: 20, cd: 3, length: 7, arc: 60, light: 8, bruteClosed: 5, bruteOpen: 8, riot: 5, bigObama: 2, boss: 0, wallHit: 20, slowSpeed: 14, returnMul: 5, returnMin: 30 },
  gooBolt: { puddle: 3, puddleTime: 4, plugBurrow: 4, hexOrbit: 0.25 },
  chainZap: { puddleHitsAll: true, barkCapNeedsGoo: true },
  swarm: { life: 12, parkedMax: 30, commandCd: 0.5, commandMana: 0 },
  manaSurge: { seconds: 20, regenMul: 4, breaksLatch: true },
  magicCarpet: { gapDrop: 2 },
  toxic: { enemyDps: 40, stripsBark: true, globImmune: true },
};
