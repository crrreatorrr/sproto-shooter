// Enemy + boss + elite definitions. Visuals reuse Sproto Duel's rigged characters (see data/stages.js MODELS).
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
    melee: { range: 3.0, damage: 45, windup: 0.45, recover: 0.5, cd: 1.6, knockback: 14 },
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
    melee: { range: 3.2, damage: 50, windup: 0.5, recover: 0.5, cd: 1.5, knockback: 16 },
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
    model: 'dragon', stageHeights: [3.2, 3.4, 3.6],
    portraits: [],
    phases: [
      { hpBelow: 1.0, speedMult: 1.0, pattern: ['stalk', 'breath', 'stalk', 'fireballs', 'tailSwipe'] },
      { hpBelow: 0.6, speedMult: 1.2, pattern: ['stalk', 'breath', 'fireballs', 'summon', 'tailSwipe', 'breath'] },
      { hpBelow: 0.25, speedMult: 1.4, pattern: ['breath', 'fireballs', 'tailSwipe', 'breath', 'summon'] },
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

export const ALLY = { ttl: 8, speed: 7, damage: 30, splashRadius: 2, fireCd: 0.8, range: 14 };

/** Which Sproto Duel stage model an enemy shows: base stage, +1 if elite, +1 from tier 4. */
export function enemyStage(e) {
  const def = ENEMIES[e.type];
  if (!def || !def.stage) return 1;
  return Math.min(3, def.stage + (e.elite ? 1 : 0) + (e.tier >= 4 ? 1 : 0));
}
