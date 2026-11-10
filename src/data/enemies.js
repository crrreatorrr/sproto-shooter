// Enemy + boss + elite definitions. Visuals reuse Sproto Duel's rigged characters (see data/stages.js MODELS).
import { DUEL_BOSS_LIST } from './duelBosses.js';
// Hitboxes are local: +z forward, y up, multiplied by the enemy's scale.
export const ENEMIES = {
  // Fast melee runner that comes in swarms. Never shoots.
  midget: {
    name: 'Midget', hp: 40, speed: 7.8, accel: 40, radius: 0.45, height: 1.3, damage: 9,
    range: 1.3, windup: 0.25, active: 0.15, recover: 0.45, poiseMax: 25, staggerTime: 0.4,
    color: 0xff8a3d, affinity: { resist: null, weak: null },
    weights: { seek: 1.0, sep: 1.2, wall: 2.0, strafe: 0.25 },
    model: 'midget', stage: 1,
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.45, y0: 0, y1: 1.15 },
      { type: 'sphere', zone: 'weak', r: 0.22, x: 0, y: 1.1, z: 0.05 },
    ],
  },
  // Flying minion (Midget stage 3 model + propeller beanie): fast, erratic, circles you in the air and
  // peppers you with tiny weak pellets. Hard to hit, easy to kill.
  flyingMidget: {
    name: 'Flying Midget', hp: 30, speed: 10.5, accel: 26, radius: 0.4, height: 1.3, damage: 0,
    flying: true, altMin: 3, altMax: 6.5, orbitMin: 7, orbitMax: 14, jinkMin: 0.5, jinkMax: 1.2,
    poiseMax: 20, staggerTime: 0.35,
    color: 0xff5ec4, affinity: { resist: null, weak: 'shock' },
    weights: { seek: 1.0, sep: 1.2, wall: 2.0, strafe: 0.4 },
    gun: { damage: 2, burst: 2, burstGap: 0.12, cooldownMin: 1.1, cooldownMax: 1.8, spread: 6, speed: 34, range: 30, windup: 0.2, small: true },
    model: 'midget', stage: 3,
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.4, y0: 0, y1: 1.15 },
      { type: 'sphere', zone: 'weak', r: 0.22, x: 0, y: 1.1, z: 0.05 },
    ],
  },
  // Keeps its distance, strafes and shoots bursts of bitcoins. Slower and much less accurate than you.
  obama: {
    name: 'Bitcoin Obama', hp: 70, speed: 4.2, accel: 22, radius: 0.5, height: 2.1, damage: 0,
    keepMin: 9, keepMax: 20, poiseMax: 30, staggerTime: 0.5,
    color: 0x7fd34e, affinity: { resist: 'goo', weak: 'fire' },
    weights: { seek: 1.0, sep: 1.5, wall: 2.0, strafe: 0.8 },
    gun: { damage: 6, burst: 3, burstGap: 0.22, cooldownMin: 2.0, cooldownMax: 3.0, spread: 4.5, speed: 30, range: 34, windup: 0.45 },
    model: 'obama', stage: 1,
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.5, y0: 0, y1: 1.85 },
      { type: 'sphere', zone: 'weak', r: 0.24, x: 0, y: 1.9, z: 0.05 },
    ],
  },
  // Heavy: slow, front shield, ground pound up close and a sloppy bullet hose at range. Hit the back battery.
  bigObama: {
    name: 'Big Bitcoin Obama', hp: 320, speed: 2.4, accel: 8, radius: 0.9, height: 2.6, damage: 25,
    turnRate: 70, range: 3.5, poundRadius: 3.2, windup: 0.9, recover: 1.2, poiseMax: 150, staggerTime: 0.8,
    color: 0x6a7bd1, affinity: { resist: 'fire', weak: 'shock' }, weakMultOverride: 2.5,
    gun: { damage: 5, burst: 6, burstGap: 0.12, cooldownMin: 3.0, cooldownMax: 4.0, spread: 7, speed: 26, range: 28, windup: 0.7 },
    model: 'obama', stage: 3,
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.9, y0: 0, y1: 2.6 },
      { type: 'sphere', zone: 'shield', r: 1.0, x: 0, y: 1.3, z: 0.95 },
      { type: 'sphere', zone: 'weak', r: 0.38, x: 0, y: 1.5, z: -0.9 },
    ],
  },
  // Robots: rigged + animated in Blender (art/blender/new_enemies.blend). `clips: true` = every state is an authored
  // clip (render/bossClips.js enemyClipWant). `from` = where shots leave the model, as fractions of its height
  // (up, fwd, side; side + = the model's left), measured on the firing frame of the clip.
  // Common ranged robot: keeps its distance and fires 2-shot bursts of fast red lasers from its head.
  robotLaser: {
    name: 'Laser Bot', hp: 60, speed: 4.6, accel: 22, radius: 0.5, height: 2.2, damage: 0,
    keepMin: 8, keepMax: 18, poiseMax: 30, staggerTime: 0.5,
    color: 0xff4a3d, affinity: { resist: 'fire', weak: 'shock' },
    weights: { seek: 1.0, sep: 1.5, wall: 2.0, strafe: 0.8 },
    gun: { kind: 'laser', damage: 7, burst: 2, burstGap: 0.2, cooldownMin: 1.6, cooldownMax: 2.6, spread: 2.5, speed: 46, range: 36, windup: 0.5,
      radius: 0.16, from: { up: 0.78, fwd: 0.12, side: 0.04 }, trackDone: true },
    model: 'robotLaser', stage: 1, clips: true, behavior: 'obama',
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.5, y0: 0, y1: 1.4 },
      { type: 'sphere', zone: 'weak', r: 0.42, x: 0, y: 1.8, z: 0.05 },
    ],
  },
  // Tougher robot: arm-gun bursts as its regular attack and, on its own cooldown, a charged big head laser.
  robotShooter: {
    name: 'Shooter Bot', hp: 170, speed: 3.6, accel: 16, radius: 0.55, height: 2.7, damage: 0,
    keepMin: 10, keepMax: 22, poiseMax: 90, staggerTime: 0.6,
    color: 0x8a4dff, affinity: { resist: 'fire', weak: 'shock' },
    weights: { seek: 1.0, sep: 1.5, wall: 2.0, strafe: 0.6 },
    gun: { kind: 'bullet', damage: 6, burst: 3, burstGap: 0.15, cooldownMin: 1.4, cooldownMax: 2.2, spread: 4, speed: 34, range: 34, windup: 0.45,
      from: { up: 0.75, fwd: 0.33, side: 0.03 }, trackDone: true },
    special: { kind: 'bigLaser', damage: 26, burst: 1, burstGap: 0.2, cooldownMin: 5.5, cooldownMax: 7.5, spread: 0.5, speed: 58, range: 44, windup: 1.0,
      radius: 0.55, from: { up: 0.87, fwd: 0.12, side: -0.01 }, trackDone: true },
    model: 'robotShooter', stage: 1, clips: true, behavior: 'gunner',
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.5, y0: 0, y1: 2.15 },
      { type: 'sphere', zone: 'weak', r: 0.3, x: 0, y: 2.35, z: 0.1 },
    ],
  },
  dummy: {
    name: 'Target Dummy', hp: 500, speed: 0, accel: 0, radius: 0.5, height: 1.8, damage: 0,
    poiseMax: 1e9, staggerTime: 0, color: 0xe8d7a8, affinity: { resist: null, weak: null }, regen: true,
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.5, y0: 0, y1: 1.6 },
      { type: 'sphere', zone: 'weak', r: 0.3, x: 0, y: 1.85, z: 0 },
    ],
  },
};

function dress(behavior, over) {
  return { ...ENEMIES[behavior], ...over, behavior };
}
Object.assign(ENEMIES, {
  boomMidget: dress('midget', { name: 'Boom Midget', hp: 34, color: 0xff5533, archetype: { deathBlast: { radius: 3.2, damage: 28 } } }),
  riotMidget: dress('midget', { name: 'Riot Midget', hp: 58, speed: 5.4, color: 0x88a0c0, archetype: { frontShield: 0.3 } }),
  sewerMidget: dress('midget', { name: 'Sewer Midget', hp: 36, color: 0x6aa84f, archetype: { burrow: { every: 5, duration: 0.6 } } }),
  floretSprout: dress('midget', { name: 'Floret Sprout', hp: 48, speed: 6.2, color: 0x6adf3a, archetype: { mortar: { every: 3, damage: 8, speed: 11 } } }),
  hexAcolyte: dress('obama', { name: 'Hex Acolyte', hp: 64, color: 0x3ecf8e, model: 'sahil', archetype: { bubble: { radius: 8, every: 4, duration: 2.5 } } }),
  glowieAgent: dress('obama', { name: 'Glowie Agent', hp: 70, color: 0x8ec8ff, model: 'sahil', archetype: { flash: { every: 6, radius: 7 } } }),
  auditSniper: dress('obama', {
    name: 'Audit Sniper', hp: 55, color: 0xc8d8ff, model: 'obama',
    gun: { damage: 8, burst: 1, burstGap: 0.2, cooldownMin: 1.6, cooldownMax: 2.4, spread: 1.5, speed: 40, range: 48, windup: 0.35 },
    archetype: { relocate: { every: 4 } },
  }),
  miningRig: dress('bigObama', { name: 'Mining Rig', hp: 140, speed: 1.4, color: 0x9aa4b2, model: 'obama', archetype: { turret: true } }),
  daycare: dress('midget', { name: 'Daycare Nest', hp: 80, speed: 2.2, color: 0xffb4a2, archetype: { nest: true } }),
  bitbug: dress('flyingMidget', { name: 'Bitbug', hp: 18, color: 0xb07cff, model: 'midget', archetype: { flock: true } }),
  jetObama: dress('flyingMidget', { name: 'Jet Obama', hp: 55, color: 0x7fd34e, model: 'obama', stage: 2, weakMultOverride: 2.5, archetype: { thruster: true } }),
  balloonMidget: dress('flyingMidget', { name: 'Balloon Midget', hp: 28, color: 0xff8ad4, model: 'midget', archetype: { deathBlast: { radius: 2.6, damage: 18 } } }),
  flakPod: {
    name: 'Gas Fee Flak Pod', hp: 160, speed: 0, accel: 0, radius: 1.3, height: 2.6, damage: 0,
    poiseMax: 1e9, staggerTime: 0, color: 0xb26bff, affinity: { resist: null, weak: null },
    behavior: 'midget',
    look: [
      { kind: 'cylinder', at: [0, 0, 0], r: 1.3, h: 1, mat: 'metal' },
      { kind: 'sphere', at: [0, 1.7, 0], r: 0.85, mat: 'neon' },
      { kind: 'box', at: [0, 0.8, -1.2], size: [0.5, 0.5, 0.3], mat: 'metal' },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 1.3, y0: 0, y1: 1 },
      { type: 'sphere', zone: 'armor', r: 0.85, x: 0, y: 1.7, z: 0 },
      { type: 'sphere', zone: 'weak', r: 0.4, x: 0, y: 0.8, z: -1.2 },
    ],
  },
  spotterDrone: {
    name: 'Spotter Drone', hp: 45, speed: 8, accel: 20, radius: 0.6, height: 0.8, damage: 0,
    flying: true, poiseMax: 20, staggerTime: 0.3, color: 0x9fd6ff,
    affinity: { resist: null, weak: 'shock' },
    behavior: 'flyingMidget',
    look: [
      { kind: 'box', at: [0, 0.6, 0], size: [1, 0.4, 1], mat: 'metal' },
      { kind: 'cone', at: [0, 0.1, 0], r: 0.3, h: 0.5, mat: 'neon' },
      { kind: 'disc', at: [0.45, 0.7, 0.45], r: 0.35, mat: 'metal' },
      { kind: 'disc', at: [-0.45, 0.7, 0.45], r: 0.35, mat: 'metal' },
      { kind: 'disc', at: [0.45, 0.7, -0.45], r: 0.35, mat: 'metal' },
      { kind: 'disc', at: [-0.45, 0.7, -0.45], r: 0.35, mat: 'metal' },
    ],
    hitboxes: [
      { type: 'sphere', zone: 'body', r: 0.6, y: 0.6 },
      { type: 'sphere', zone: 'weak', r: 0.25, x: 0, y: 0.7, z: 0.2 },
    ],
  },
  frostHound: {
    name: 'Frost Hound', hp: 55, speed: 5, accel: 24, radius: 0.5, height: 0.9, damage: 16,
    poiseMax: 30, staggerTime: 0.35, color: 0xd5e4ef,
    affinity: { resist: null, weak: 'fire' },
    behavior: 'midget',
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
      { type: 'capsule', zone: 'body', r: 0.5, y0: 0.3, y1: 0.9 },
      { type: 'sphere', zone: 'weak', r: 0.28, x: 0, y: 0.85, z: 0.55 },
    ],
  },
  miniTinubu: dress('midget', { name: 'Mini Tinubu', hp: 90, speed: 6.4, color: 0xff6a3d, model: 'tinubu', radius: 0.55, height: 1.8, archetype: { charge: { every: 3, duration: 0.4, speed: 14 } } }),
  gateGenerator: dress('midget', { name: 'Gate Generator', hp: 200, speed: 0, accel: 0, damage: 0, color: 0x66ffcc, model: 'robotLaser' }),
  gatekeeper: dress('bigObama', {
    name: 'The Gatekeeper', hp: 1600, speed: 2.4, color: 0xd4af37, radius: 1.35, height: 3.9,
    archetype: { audit: true },
  }),
  hexWisp: {
    name: 'Hex Wisp', hp: 45, speed: 5, accel: 22, radius: 0.5, height: 1, damage: 0,
    flying: true, ghost: true, altMin: 1.2, altMax: 2.6, orbitMin: 6, orbitMax: 14, jinkMin: 0.6, jinkMax: 1.2,
    poiseMax: 15, staggerTime: 0.3, color: 0xb388ff, affinity: { resist: null, weak: null },
    taken: { bullet: 0.2, explosive: 0.5, spell: 2 },
    weights: { seek: 1, sep: 0.4, wall: 0, strafe: 0.2 },
    behavior: 'flyingMidget',
    archetype: { wisp: { every: 3.2, damage: 8, speed: 9 } },
    look: [
      { kind: 'sphere', at: [0, 0.6, 0], r: 0.5, mat: 'neon' },
      { kind: 'sphere', at: [0.12, 0.7, 0.2], r: 0.08, mat: 'stone' },
      { kind: 'sphere', at: [-0.12, 0.7, 0.2], r: 0.08, mat: 'stone' },
      { kind: 'cone', at: [0, 0.5, -0.4], r: 0.3, h: 0.8, mat: 'neon' },
    ],
    hitboxes: [{ type: 'sphere', zone: 'body', r: 0.5, x: 0, y: 0.6, z: 0 }],
  },
  barkBrute: {
    name: 'Bark Brute', hp: 260, speed: 3.2, accel: 14, radius: 0.8, height: 2.4, damage: 22,
    range: 2.6, windup: 0.8, active: 0.2, recover: 0.6, turnRate: 90, poiseMax: 80, staggerTime: 0.5,
    color: 0x8a5a2b, affinity: { resist: null, weak: null }, weakIgnoresArmour: true,
    armour: {
      hard: { bullet: 0, explosive: 0.25, spell: 1 },
      softened: { bullet: 1, explosive: 1, spell: 1 },
      cracked: { bullet: 1, explosive: 1, spell: 1 },
      stripped: { bullet: 1.25, explosive: 1.25, spell: 1 },
    },
    weights: { seek: 1, sep: 0.8, wall: 2, strafe: 0.1 },
    behavior: 'midget',
    archetype: { bark: true },
    look: [
      { kind: 'box', at: [0, 0.45, 0], size: [1, 0.9, 0.7], mat: 'wood' },
      { kind: 'box', at: [0, 1.3, 0], size: [1.4, 1, 0.9], mat: 'wood' },
      { kind: 'box', at: [0, 2, 0], size: [0.7, 0.5, 0.6], mat: 'wood' },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.8, y0: 0, y1: 2.2 },
      { type: 'sphere', zone: 'weak', r: 0.25, x: 0, y: 1.3, z: -0.7 },
    ],
  },
  manaLeech: {
    name: 'Mana Leech', hp: 55, speed: 3.8, accel: 18, radius: 0.45, height: 1.1, damage: 4,
    range: 1.2, windup: 0.25, active: 0.15, recover: 0.4, poiseMax: 20, staggerTime: 0.35,
    color: 0x7dff6a, affinity: { resist: null, weak: 'shock' },
    weights: { seek: 1, sep: 1, wall: 2, strafe: 0.4 },
    behavior: 'midget',
    archetype: { leech: { range: 10, drain: 8 } },
    look: [
      { kind: 'cylinder', at: [0, 0, 0], r: 0.4, h: 1.1, mat: 'toxic' },
      { kind: 'disc', at: [0, 0.7, 0.4], r: 0.45, mat: 'neon' },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.45, y0: 0, y1: 1.1 },
      { type: 'sphere', zone: 'weak', r: 0.2, x: 0, y: 0.7, z: 0.4 },
    ],
  },
  gooGlob: {
    name: 'Goo Glob', hp: 90, speed: 3, accel: 12, radius: 1.1, height: 1.6, damage: 14,
    range: 2.2, windup: 0.4, active: 0.2, recover: 0.5, poiseMax: 40, staggerTime: 0.4,
    color: 0x6adf3a, affinity: { resist: 'goo', weak: null }, split: 'gooGlobMid',
    weights: { seek: 1, sep: 0.6, wall: 2, strafe: 0.1 },
    behavior: 'midget',
    look: [
      { kind: 'sphere', at: [0, 0.8, 0], r: 1.1, mat: 'toxic' },
      { kind: 'sphere', at: [0, 0.9, 0.2], r: 0.33, mat: 'neon' },
    ],
    hitboxes: [{ type: 'sphere', zone: 'body', r: 1.1, x: 0, y: 0.8, z: 0 }],
  },
  gooGlobMid: {
    name: 'Goo Glob', hp: 40, speed: 4.2, accel: 16, radius: 0.7, height: 1.1, damage: 9,
    range: 1.6, windup: 0.3, active: 0.15, recover: 0.4, poiseMax: 20, staggerTime: 0.3,
    color: 0x6adf3a, affinity: { resist: 'goo', weak: null }, split: 'gooGlobSmall',
    weights: { seek: 1, sep: 0.8, wall: 2, strafe: 0.2 },
    behavior: 'midget',
    hitboxes: [{ type: 'sphere', zone: 'body', r: 0.7, x: 0, y: 0.5, z: 0 }],
  },
  gooGlobSmall: {
    name: 'Goo Glob', hp: 15, speed: 6, accel: 22, radius: 0.4, height: 0.7, damage: 5,
    range: 1.2, windup: 0.2, active: 0.1, recover: 0.3, poiseMax: 10, staggerTime: 0.25,
    color: 0x9dff7a, affinity: { resist: 'goo', weak: null },
    weights: { seek: 1.2, sep: 1, wall: 2, strafe: 0.3 },
    behavior: 'midget',
    hitboxes: [{ type: 'sphere', zone: 'body', r: 0.4, x: 0, y: 0.35, z: 0 }],
  },
});

export const ELITE = { hpMult: 2.5, dmgMult: 1.3, speedMult: 1.1, scale: 1.25, poiseMult: 2, dropMult: 2, gunMult: 3, xpMult: 3 };
export const AFFINITY_POOL = ['fire', 'shock', 'goo'];

/** Enemy projectile ("bitcoin") radius. */
export const ENEMY_BULLET_RADIUS = 0.2;

// Bosses: each phase swaps to the next Sproto Duel stage model (stage 1 → 2 → 3).
export const BOSSES = {
  // Physical bosses (ai 'mega'): chase, volley, charge, slam, summon, missiles, plus a heavy melee swipe when
  // you get close. melee.range is reach beyond the boss radius; missiles home in and explode.
  megaSproto: {
    name: 'MEGA TINUBU', tag: 'physical', ai: 'mega', hp: 3500, radius: 2.6, height: 5.85, color: 0xff6a3d, speed: 4.5,
    contactDamage: 15, chargeDamage: 35, chargeSpeed: 22, slamDamage: 25,
    volley: { damage: 10, count: 7, fan: 50, speed: 24, waves: 2, gap: 0.4, y: 4.2 },
    // melee timing follows boss-attack research: a readable windup that holds (>= 0.34 s from tell to hit), a
    // fast strike, then a long recovery (the punish window)
    melee: { range: 3.0, damage: 45, windup: 0.7, recover: 0.85, cd: 1.6, knockback: 14 },
    missiles: { count: 2, damage: 32, splash: 4.5, speed: 13, homing: 1.1, ttl: 6, gap: 0.3, y: 5.2 },
    model: 'tinubu', stageHeights: [5.5, 6.0, 6.5],
    portraits: ['ui/bosses/tinubu.png', 'ui/bosses/tinubu_stage2.png', 'ui/bosses/tinubu_stage3.png'],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['chase', 'volley', 'charge', 'chase', 'missiles', 'slam'] },
      { hpBelow: 0.5, speedMult: 1.3, pattern: ['chase', 'charge', 'missiles', 'volley', 'slam', 'charge', 'slam', 'summon'] },
      { hpBelow: 0.2, speedMult: 1.5, pattern: ['volley', 'missiles', 'charge', 'slam', 'volley', 'charge', 'summon'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 2.6, y0: 0, y1: 5.85 },
      { type: 'sphere', zone: 'weak', r: 0.78, x: 0, y: 5.7, z: 0.78 },
      { type: 'sphere', zone: 'weak', r: 0.65, x: 0, y: 2.6, z: 2.5, onlyWhen: 'stunned' },
    ],
  },
  monster: {
    // Wave 2 boss. Rigged humanoid without clips: the renderer animates its skeleton (humanoidRig.js).
    // Its melee is an overhead arm smash. Spits monster bullets.
    name: 'BLUE MONSTER', tag: 'physical', ai: 'mega', hp: 3800, radius: 2.4, height: 7.0, color: 0x2f6bff, speed: 4.8,
    contactDamage: 18, chargeDamage: 40, chargeSpeed: 24, slamDamage: 30,
    volley: { damage: 12, count: 5, fan: 40, speed: 26, waves: 2, gap: 0.45, y: 6.0, kind: 'monsterBullet' },
    melee: { range: 3.2, damage: 50, windup: 0.75, recover: 0.9, cd: 1.5, knockback: 16 },
    missiles: { count: 3, damage: 34, splash: 4.5, speed: 13, homing: 1.2, ttl: 6, gap: 0.28, y: 6.2 },
    model: 'monster', rig: 'humanoid', stageHeights: [7.0, 7.6, 8.2],
    portraits: [],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['chase', 'volley', 'missiles', 'chase', 'charge', 'slam'] },
      { hpBelow: 0.5, speedMult: 1.25, pattern: ['chase', 'missiles', 'volley', 'charge', 'slam', 'summon'] },
      { hpBelow: 0.2, speedMult: 1.45, pattern: ['missiles', 'volley', 'charge', 'slam', 'missiles', 'charge', 'summon'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 2.4, y0: 0, y1: 7.0 },
      { type: 'sphere', zone: 'weak', r: 0.9, x: 0, y: 6.5, z: 0.5 },
      { type: 'sphere', zone: 'weak', r: 0.7, x: 0, y: 3.6, z: 1.5, onlyWhen: 'stunned' },
    ],
  },
  // Jade Dragon: wave 1 boss (Tripo quadruped rig, no clips: animated procedurally in render/dragonRig.js).
  // Long body along local +z, so its hitboxes are a chain of spheres from head to tail.
  dragon: {
    name: 'JADE DRAGON', tag: 'physical', hp: 2200, radius: 1.6, height: 3.2, color: 0x2fae5a, speed: 5,
    breath: { damage: 6, speed: 18, rate: 0.07, duration: 1.6, sweep: 60, telegraph: 0.7 },
    fireball: { damage: 15, splash: 2.6, count: 3, flight: 1.2 },
    tail: { damage: 20, radius: 6.5, windup: 0.6 },
    // flight: take off, circle you at altitude dropping fireballs, land
    fly: { height: 7, heightSwing: 3, rise: 1.2, duration: 7, land: 1.4, speed: 13, radius: 13, radiusSwing: 4, shotEvery: 1.1, swoopAt: 3.2, swoopTime: 1.6, swoopHeight: 2.6 },
    model: 'dragon', stageHeights: [3.2, 3.4, 3.6],
    portraits: [],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['stalk', 'breath', 'fly', 'stalk', 'fireballs', 'tailSwipe'] },
      { hpBelow: 0.6, speedMult: 1.2, pattern: ['stalk', 'fly', 'breath', 'fireballs', 'summon', 'tailSwipe', 'fly'] },
      { hpBelow: 0.25, speedMult: 1.4, pattern: ['fly', 'breath', 'fireballs', 'tailSwipe', 'fly', 'summon'] },
    ],
    hitboxes: [
      { type: 'sphere', zone: 'weak', r: 0.55, x: 0, y: 2.55, z: 2.55 },
      { type: 'sphere', zone: 'body', r: 0.95, x: 0, y: 2.0, z: 1.9 },
      { type: 'sphere', zone: 'body', r: 1.15, x: 0, y: 1.35, z: 0.7 },
      { type: 'sphere', zone: 'body', r: 1.15, x: 0, y: 1.2, z: -0.6 },
      { type: 'sphere', zone: 'body', r: 0.9, x: 0, y: 0.95, z: -1.8 },
      { type: 'sphere', zone: 'body', r: 0.6, x: 0, y: 0.7, z: -2.7 },
    ],
  },
  sprotoBeast: {
    // Rigged humanoid (Tripo skeleton) without clips, animated by humanoidRig.js. Fights with punches and kicks.
    name: 'SPROTO BEAST', tag: 'physical', ai: 'mega', hp: 4500, radius: 2.4, height: 7.5, color: 0x7a3cff, speed: 5.4,
    contactDamage: 20, chargeDamage: 45, chargeSpeed: 25, slamDamage: 32,
    volley: { damage: 11, count: 7, fan: 55, speed: 26, waves: 2, gap: 0.35, y: 6.0 },
    melee: { range: 3.4, damage: 55, windup: 0.6, recover: 0.75, cd: 1.2, knockback: 15, combo: ['punch', 'kick', 'punch', 'punch', 'kick'], kick: { range: 1.0, damage: 1.2, knockback: 1.4 } },
    missiles: { count: 4, damage: 34, splash: 4.5, speed: 14, homing: 1.3, ttl: 6, gap: 0.25, y: 6.4 },
    model: 'sprotoBeast', rig: 'humanoid', stageHeights: [7.5, 8.0, 8.6],
    portraits: [],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['chase', 'missiles', 'chase', 'volley', 'charge', 'slam'] },
      { hpBelow: 0.55, speedMult: 1.25, pattern: ['chase', 'charge', 'missiles', 'chase', 'slam', 'summon'] },
      { hpBelow: 0.2, speedMult: 1.5, pattern: ['missiles', 'chase', 'charge', 'slam', 'volley', 'chase', 'summon'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 2.4, y0: 0, y1: 7.5 },
      { type: 'sphere', zone: 'weak', r: 0.9, x: 0, y: 6.4, z: 1.9 },
      { type: 'sphere', zone: 'weak', r: 0.75, x: 0, y: 3.9, z: 1.6, onlyWhen: 'stunned' },
    ],
  },
  // Car Part Monster: magnet-fisted junk golem. Smashes up close and hurls car tyres that bounce once and explode.
  // rig 'clips': every action is an authored clip (render/bossClips.js); no procedural rig under it.
  carMonster: {
    name: 'CAR PART MONSTER', tag: 'physical', ai: 'mega', hp: 4200, radius: 2.6, height: 6.4, color: 0xc0392b, speed: 4.4,
    contactDamage: 20, chargeDamage: 42, chargeSpeed: 23, slamDamage: 30,
    melee: { range: 3.2, damage: 52, windup: 0.75, recover: 0.9, cd: 1.5, knockback: 17 },
    // thrown from alternating hands every `gap` s after a 0.6 s wind-up, lobbed to land on you (`flight` s), one bounce
    missiles: { kind: 'tyre', count: 4, damage: 30, splash: 5, gap: 0.3, flight: 1.15, gravity: 16, bounces: 1, scatter: 2.5, ttl: 6, from: { up: 0.95, fwd: 0.25, side: 0.45 } },
    model: 'carMonster', rig: 'clips', stageHeights: [6.4, 6.9, 7.4],
    portraits: [],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['chase', 'missiles', 'chase', 'charge', 'slam'] },
      { hpBelow: 0.55, speedMult: 1.2, pattern: ['chase', 'missiles', 'charge', 'slam', 'summon'] },
      { hpBelow: 0.2, speedMult: 1.4, pattern: ['missiles', 'chase', 'charge', 'missiles', 'slam', 'summon'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 2.6, y0: 0, y1: 6.4 },
      { type: 'sphere', zone: 'weak', r: 0.9, x: 0, y: 5.8, z: 0.8 },
      { type: 'sphere', zone: 'weak', r: 0.8, x: 0, y: 3.4, z: 1.8, onlyWhen: 'stunned' },
    ],
  },
  // Mole Monster: a miner mole with a drill for a right hand. Drill stab up close; fans of drill heads at range.
  moleMonster: {
    name: 'MOLE MONSTER', tag: 'physical', ai: 'mega', hp: 4000, radius: 2.4, height: 5.6, color: 0x8d6e63, speed: 4.8,
    contactDamage: 18, chargeDamage: 40, chargeSpeed: 24, slamDamage: 30,
    melee: { range: 3.4, damage: 50, windup: 0.75, recover: 0.9, cd: 1.4, knockback: 16 },
    // fired from the drill hand: a 0.5 s aim, then `waves` fans every `gap` s (the shoot_loop clip is one gap long)
    volley: { kind: 'drill', damage: 14, count: 3, fan: 22, speed: 30, waves: 3, gap: 0.4, radius: 0.45, from: { up: 0.68, fwd: 0.79, side: -0.13 } },
    model: 'moleMonster', rig: 'clips', stageHeights: [5.6, 6.0, 6.5],
    portraits: [],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['chase', 'volley', 'chase', 'charge', 'slam'] },
      { hpBelow: 0.55, speedMult: 1.2, pattern: ['chase', 'volley', 'charge', 'volley', 'slam', 'summon'] },
      { hpBelow: 0.2, speedMult: 1.4, pattern: ['volley', 'chase', 'charge', 'volley', 'slam', 'summon'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 2.4, y0: 0, y1: 5.6 },
      { type: 'sphere', zone: 'weak', r: 0.85, x: 0, y: 4.9, z: 0.9 },
      { type: 'sphere', zone: 'weak', r: 0.75, x: 0, y: 2.8, z: 1.6, onlyWhen: 'stunned' },
    ],
  },
  hexAuditor: {
    // Floats ~1.6 m off the ground: pos.y is the body centre, so hitboxes go below and above it.
    name: 'HEX SAHIL', tag: 'magic', ai: 'hex', hp: 3000, radius: 0.7, height: 2.5, color: 0x9b59ff, speed: 4.5, hoverY: 1.6,
    orbDamage: 8, taxDamage: 12, auraRadius: 9, auraRadiusP3: 13, auraDrain: 15,
    model: 'sahil', stageHeights: [2.6, 2.8, 3.1],
    portraits: ['ui/bosses/sahil.png', 'ui/bosses/sahil_stage2.png', 'ui/bosses/sahil_stage3.png'],
    phases: [
      { hpBelow: 1.0, pattern: ['drift', 'ring', 'fan', 'spiral', 'teleport'] },
      { hpBelow: 0.6, pattern: ['ring', 'taxBolts', 'spiral', 'fan', 'teleport'] },
      { hpBelow: 0.25, pattern: ['spiralRing', 'taxBolts', 'fan', 'teleport'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.7, y0: -1.3, y1: 1.3 },
      { type: 'sphere', zone: 'weak', r: 0.45, orbit: 1.9 },
    ],
  },
};

for (const b of DUEL_BOSS_LIST) BOSSES[b.id] = b;

export const ALLY = { ttl: 8, speed: 7, damage: 30, splashRadius: 2, fireCd: 0.8, range: 14 };

/** Which Sproto Duel stage model an enemy shows: base stage, +1 if elite, +1 from tier 4. */
export function enemyStage(e) {
  const def = ENEMIES[e.type];
  if (!def || !def.stage) return 1;
  return Math.min(3, def.stage + (e.elite ? 1 : 0) + (e.tier >= 4 ? 1 : 0));
}
