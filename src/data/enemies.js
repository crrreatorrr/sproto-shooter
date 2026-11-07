// Enemy + boss + elite definitions (PLAN §4.10, §7.3)
export const ENEMIES = {
  grunt: {
    name: 'Grunt', hp: 60, speed: 5.5, accel: 30, radius: 0.5, height: 1.6, damage: 12,
    range: 1.6, windup: 0.35, active: 0.15, recover: 0.6, poiseMax: 30, staggerTime: 0.5,
    color: 0xff8a3d, affinity: { resist: null, weak: null },
    weights: { seek: 1.0, sep: 1.5, wall: 2.0, strafe: 0.15 },
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.5, y0: 0, y1: 1.6 },
      { type: 'sphere', zone: 'weak', r: 0.22, x: 0, y: 1.75, z: 0 },
    ],
  },
  spitter: {
    name: 'Spitter', hp: 45, speed: 3.8, accel: 20, radius: 0.55, height: 1.3, damage: 14,
    windup: 0.5, cooldown: 2.4, keepMin: 10, keepMax: 18, poiseMax: 25, staggerTime: 0.6,
    color: 0x7fd34e, affinity: { resist: 'goo', weak: 'fire' },
    weights: { seek: 1.0, sep: 1.5, wall: 2.0, strafe: 0.8 },
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.55, y0: 0, y1: 1.3 },
      { type: 'sphere', zone: 'weak', r: 0.25, x: 0, y: 1.0, z: 0.45 },
    ],
  },
  bouncer: {
    name: 'Bouncer', hp: 50, speed: 9, accel: 10, radius: 0.6, height: 1.2, damage: 15,
    hopMin: 0.7, hopMax: 1.3, hopVy: 7, stompRadius: 2.5, poiseMax: 30, staggerTime: 0.6,
    color: 0xff5ec4, affinity: { resist: null, weak: 'shock' },
    hitboxes: [
      { type: 'sphere', zone: 'body', r: 0.6, x: 0, y: 0.6, z: 0 },
      { type: 'sphere', zone: 'weak', r: 0.3, x: 0, y: 0.05, z: 0 },
    ],
  },
  tank: {
    name: 'Tank', hp: 320, speed: 2.2, accel: 8, radius: 0.9, height: 2.2, damage: 25,
    turnRate: 70, range: 3.5, poundRadius: 3.2, windup: 0.9, recover: 1.2, poiseMax: 150, staggerTime: 0.8,
    color: 0x6a7bd1, affinity: { resist: 'fire', weak: 'shock' }, weakMultOverride: 2.5,
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.9, y0: 0, y1: 2.2 },
      { type: 'sphere', zone: 'shield', r: 0.95, x: 0, y: 1.1, z: 0.85 },
      { type: 'sphere', zone: 'weak', r: 0.35, x: 0, y: 1.3, z: -0.85 },
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

export const ELITE = { hpMult: 2.5, dmgMult: 1.3, speedMult: 1.1, scale: 1.25, poiseMult: 2, dropMult: 2, gunMult: 3, xpMult: 3 };
export const AFFINITY_POOL = ['fire', 'shock', 'goo'];

export const BOSSES = {
  megaSproto: {
    name: 'MEGA SPROTO', tag: 'physical', hp: 3500, radius: 2.0, height: 4.5, color: 0xff6a3d, speed: 4.5,
    contactDamage: 15, chargeDamage: 35, chargeSpeed: 22, slamDamage: 25,
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['chase', 'charge', 'chase', 'slam'] },
      { hpBelow: 0.5, speedMult: 1.3, pattern: ['chase', 'charge', 'slam', 'charge', 'slam', 'summon'] },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 2.0, y0: 0, y1: 4.5 },
      { type: 'sphere', zone: 'weak', r: 0.6, x: 0, y: 4.6, z: 0.6 },
      { type: 'sphere', zone: 'weak', r: 0.5, x: 0, y: 2.0, z: 1.9, onlyWhen: 'stunned' },
    ],
  },
  hexAuditor: {
    name: 'THE HEX AUDITOR', tag: 'magic', hp: 3000, radius: 1.3, height: 2.6, color: 0x9b59ff, speed: 4,
    orbDamage: 8, taxDamage: 12, auraRadius: 8, auraRadiusP3: 12, auraDrain: 15,
    phases: [
      { hpBelow: 1.0, pattern: ['drift', 'ring', 'fan', 'spiral', 'teleport'] },
      { hpBelow: 0.6, pattern: ['ring', 'taxBolts', 'spiral', 'fan', 'teleport'] },
      { hpBelow: 0.25, pattern: ['spiralRing', 'taxBolts', 'fan', 'teleport'] },
    ],
    hitboxes: [
      { type: 'sphere', zone: 'body', r: 1.3, x: 0, y: 0, z: 0 },
      { type: 'sphere', zone: 'weak', r: 0.45, orbit: 1.9 },
    ],
  },
};

export const ALLY = { ttl: 8, speed: 7, damage: 30, splashRadius: 2, fireCd: 0.8, range: 14 };
