// Bodies and numbers the live tables do not have.
// Tier-1 unless noted. L05 multiplies enemy HP and damage by 1.15^4 = 1.749.
// Do not copy these into src/data/enemies.js from this level: that file is the
// engine owner's, and HP there is in the campaign fingerprint.

export const TIER = 1.749;

export const SPOTTER_DRONE = {
  id: 'spotterDrone',
  name: 'Spotter Drone',
  archetype: 'detection',
  hp: 45,
  hpTier: 79,
  lamp: { hp: 20, hpTier: 35, weak: true },
  speed: 8,
  turn: 90,
  fly: { min: 8, max: 9, indoor: 4 },
  sense: { length: 35, halfAngle: 20, spotRadius: 5, spotAhead: 14 },
  hold: 1.5,
  holdWindow: 3,
  recall: 10,
  mortar: { count: 3, gap: 0.5, telegraph: 1.4, radius: 3.5, damage: 22, damageTier: 38 },
  wake: 60,
  poise: 20,
  affinity: { weak: 'shock' },
  drops: { ammo: 0.5, tickets: 2, gun: 0.04 },
  seconds: 8,
  look: [
    { kind: 'box', at: [0, 0, 0], size: [1, 0.4, 1], mat: 'metal' },
    { kind: 'cone', at: [0, -0.5, 0], r: 0.3, h: 0.5, mat: 'neon' },
    { kind: 'disc', at: [0.45, 0.1, 0.45], r: 0.35, mat: 'metal' },
    { kind: 'disc', at: [-0.45, 0.1, 0.45], r: 0.35, mat: 'metal' },
    { kind: 'disc', at: [0.45, 0.1, -0.45], r: 0.35, mat: 'metal' },
    { kind: 'disc', at: [-0.45, 0.1, -0.45], r: 0.35, mat: 'metal' },
  ],
  hitboxes: [
    { zone: 'body', shape: 'sphere', r: 0.6 },
    { zone: 'weak', shape: 'sphere', r: 0.25, part: 'lamp' },
  ],
};

export const FROST_HOUND = {
  id: 'frostHound',
  name: 'Frost Hound',
  archetype: 'tracker',
  hp: 55,
  hpTier: 96,
  trot: 5,
  run: 9.5,
  scent: 45,
  trail: { every: 2, length: 60 },
  bark: 12,
  lunge: { range: 9, crouch: 0.5, speed: 20, damage: 16, damageTier: 28, knockback: 6, recover: 0.9 },
  patch: { radius: 2.5, seconds: 6 },
  poise: 30,
  affinity: { weak: 'fire' },
  drops: { ammo: 0.4, health: 0.08, tickets: 2, gun: 0.03 },
  seconds: 5,
  ignores: ['decoy', 'weather', 'slick'],
  elite: { name: 'Alpha', hpMult: 2.5, lunges: 2, patch: 3.5 },
  look: [
    { kind: 'box', at: [0, 0.55, 0], size: [1.2, 0.5, 0.6], mat: 'ice' },
    { kind: 'box', at: [0, 0.7, 0.55], size: [0.45, 0.45, 0.45], mat: 'ice' },
    { kind: 'cylinder', at: [-0.35, 0, 0.3], r: 0.1, h: 0.5, mat: 'ice' },
    { kind: 'cylinder', at: [0.35, 0, 0.3], r: 0.1, h: 0.5, mat: 'ice' },
    { kind: 'cylinder', at: [-0.35, 0, -0.3], r: 0.1, h: 0.5, mat: 'ice' },
    { kind: 'cylinder', at: [0.35, 0, -0.3], r: 0.1, h: 0.5, mat: 'ice' },
    { kind: 'cone', at: [0, 0.55, -0.5], r: 0.15, h: 0.5, mat: 'ice' },
    { kind: 'sphere', at: [0.12, 0.85, 0.7], r: 0.08, mat: 'neon' },
    { kind: 'sphere', at: [-0.12, 0.85, 0.7], r: 0.08, mat: 'neon' },
  ],
  hitboxes: [
    { zone: 'body', shape: 'capsule', r: 0.5, length: 1.2, y0: 0.3, y1: 0.9 },
    { zone: 'weak', shape: 'sphere', r: 0.28, part: 'head' },
  ],
};

export const DECOY = {
  id: 'decoy',
  name: 'Cardboard Sproto',
  mana: 30,
  cooldown: 12,
  life: 6,
  castRange: 20,
  pop: { damage: 20, radius: 3 },
  locks: ['auditSniper', 'spotterDrone', 'searchlight', 'miningRig', 'droneStrike'],
  ignoredBy: ['frostHound'],
};

export const AUDITOR = {
  id: 'monster',
  name: 'The Abominable Auditor',
  model: 'monster',
  hp: 3800,
  hpTier: 6646,
  radius: 2.4,
  height: 7,
  plates: [
    { id: 'brow', covers: 'head', hp: 250, hpTier: 437, shape: { kind: 'sphere', r: 1, y: 6.5 } },
    { id: 'chest', covers: 'front', hp: 400, hpTier: 700, arc: 180, bodyMul: 0.1 },
    { id: 'back', covers: 'rear', hp: 400, hpTier: 700, arc: 180, bodyMul: 0.1 },
  ],
};

export const DRONE_STRIKE = {
  radius: 2.6,
  track: 1.8,
  lock: 0.75,
  every: 14,
  damagePlayer: 30,
  damageEnemy: 120,
  followsDecoy: true,
};

export const SIGHT = {
  idle: { range: 30, cone: 120 },
  asleep: { sight: 0, hearing: 12 },
  auditSniper: { inCone: 140, cone: 30, sweep: 60, sweepSec: 6, outside: 60, laser: 1.4, laserDamage: 35 },
  miningRig: { range: 90, stream: 4, vent: 2, deadAngle: 15 },
  searchlight: { beam: 120, spot: 6, hold: 2, lamp: 30 },
  blizzardCap: 40,
  noise: { mg: 25, shotgun: 25, sniper: 40, bazooka: 40, explosion: 40 },
  body: { range: 20, suspect: 2 },
  alarm: { box: 40, cable: 20, runner: 1.5, arrive: 6, wonder: 3 },
};
