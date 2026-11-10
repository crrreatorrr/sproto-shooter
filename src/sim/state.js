// GameState creation + entity factories. Everything is plain JSON data with numeric ids. PLAN §3
import { createRng, next } from '../core/rng.js';
import { TUNING } from '../data/tuning.js';
import { ENEMIES, BOSSES, ELITE, AFFINITY_POOL } from '../data/enemies.js';
import { tierEnemyMult } from '../data/waves.js';
import { PERKS } from '../data/skills.js';
import { generateGun } from './guns.js';
import { pick, float } from '../core/rng.js';

export const nextId = (state) => state.nextId++;

export function createGameState({ seed = 12345, mode = 'sandbox', tier = 1 } = {}) {
  const state = {
    version: 1, seed, rng: createRng(seed), tick: 0, time: 0, nextId: 1,
    mode, tier, localPlayerId: 0,
    players: {}, enemies: [], allies: [], projectiles: [], pickups: [], hazards: [],
    weaponBoxes: [], spawnPoints: [],
    wave: null,
    shop: { offers: [], rerolls: 0, upgrades: { ammoCap: 0, shieldCap: 0, slot4: false } },
    run: newRunStats(),
    tuning: { godMode: false, enemyHpMult: 1, enemyDmgMult: 1, unlockAllRecipes: false, infiniteAmmo: false, freezeEnemies: false },
    events: [],
  };
  for (let i = 0; i < TUNING.spawnPointCount; i++) {
    const a = (i / TUNING.spawnPointCount) * Math.PI * 2;
    state.spawnPoints.push({ x: Math.cos(a) * TUNING.spawnRadius, z: Math.sin(a) * TUNING.spawnRadius });
  }
  const p = createPlayer(state, mode === 'sandbox' ? 4 : 3);
  state.players[p.id] = p;
  state.localPlayerId = p.id;
  return state;
}

export function newRunStats() {
  return { kills: 0, eliteKills: 0, bossKills: 0, damageDealt: 0, damageTaken: 0, bestHit: 0, crits: 0, weakHits: 0,
    ticketsEarned: 0, gunsFound: 0, crafts: 0, xpGained: { health: 0, gunslinger: 0 }, time: 0 };
}

export function createPlayer(state, slots = 4) {
  const id = nextId(state);
  const start = generateGun({ seed: 0xC0FFEE, level: 1, forced: { type: 'mg', quality: 'common', manufacturer: 'reliable', element: 'none' } });
  start.id = nextId(state);
  start.source = 'start';
  const p = {
    id, kind: 'player',
    pos: { x: 0, y: 0, z: 8 }, prevPos: { x: 0, y: 0, z: 8 }, vel: { x: 0, y: 0, z: 0 },
    yaw: 0, pitch: 0,
    onGround: true, jumpsLeft: 2, coyoteT: 0, jumpBufferT: 0,
    move: { mode: 'walk', slideT: 0, slideCd: 0, dashT: 0, dashCd: 0, dashDir: { x: 0, z: 0 } },
    hp: TUNING.maxHp, maxHp: TUNING.maxHp, shield: TUNING.maxShield, maxShield: TUNING.maxShield, shieldDelayT: 0,
    mana: TUNING.maxMana, maxMana: TUNING.maxMana,
    invulnT: 0, downed: false, downedT: 0, dead: false, respawnT: 0, unkillableUsed: false,
    guns: [start, null, null, null, null], unlockedSlots: slots, activeSlot: 0, // 5th = legendary slot (key L)
    swapT: 0, reloadT: 0, fireCd: 0, zooming: false,
    recoil: { pitch: 0, yaw: 0, heat: 0 }, shotCounter: 0,
    ammo: { ...TUNING.startAmmo }, ammoCap: { ...TUNING.ammoCap },
    medkits: 1, medkitT: 0,
    tickets: 0,
    skills: { health: sk(), gunslinger: sk() },
    perks: {},
    spellUnlocks: state.mode === 'campaign' ? {} : { gooBolt: true },
    spells: { cd: { gooBolt: 0, chainZap: 0, swarm: 0, manaShield: 0, meteor: 0 }, manaShieldOn: false },
    buffs: { killFrenzy: { stacks: 0, t: 0 } },
    lastDamageT: 99, lifestealBudget: 4, xpCaps: { dmg: 0, weak: 0 },
    interactBoxId: null, nearGunPickupId: null,
  };
  for (const perk of PERKS) if (perk.level === 1) p.perks[perk.id] = true;
  if (p.spellUnlocks.gooBolt) p.perks.gooBolt = true;
  return p;
}
const sk = () => ({ level: 1, xp: 0, total: 0 });

export function createEnemy(state, type, { tier = state.tier, elite = false, pos = { x: 0, z: 0 }, summoned = false } = {}) {
  const def = ENEMIES[type];
  const tm = tierEnemyMult(tier);
  const e = {
    id: nextId(state), kind: 'enemy', type, faction: 'enemy',
    pos: { x: pos.x, y: 0, z: pos.z }, prevPos: { x: pos.x, y: 0, z: pos.z }, vel: { x: 0, y: 0, z: 0 },
    yaw: Math.atan2(pos.x, pos.z), // face roughly center
    radius: def.radius, height: def.height, scale: elite ? ELITE.scale : 1,
    hp: 0, maxHp: 0, dmgMult: tm * (elite ? ELITE.dmgMult : 1), speedMult: elite ? ELITE.speedMult : 1, tier,
    elite, affinity: { ...def.affinity },
    state: type === 'dummy' ? 'idle' : 'spawning', stateT: 0,
    attack: { phase: 'windup', t: 0, hasHit: false, cd: 0 },
    poise: 0, poiseMax: def.poiseMax * (elite ? ELITE.poiseMult : 1),
    status: { burn: null, goo: null, burnTick: 0 },
    ai: { strafeDir: 1, strafeT: 2, hopT: 1, airborne: false, regenT: 0 },
    lastHit: null, dead: false, boss: null, summoned, bigHeadT: 0, hitFlash: 0,
  };
  e.maxHp = Math.round(def.hp * tm * (elite ? ELITE.hpMult : 1) * state.tuning.enemyHpMult);
  e.hp = e.maxHp;
  if (def.archetype && def.archetype.audit) e.ai.audit = true;
  if (def.armour) e.ai.armour = 'hard';
  if (elite) {
    const resist = pick(state.rng, AFFINITY_POOL);
    const weaks = AFFINITY_POOL.filter((a) => a !== resist);
    e.affinity = { resist, weak: weaks[Math.floor(float(state.rng) * weaks.length)] };
  }
  state.enemies.push(e);
  return e;
}

export function createBoss(state, type, { tier = state.tier, pos = { x: 0, z: -15 }, paired = false } = {}) {
  const def = BOSSES[type];
  const tm = tierEnemyMult(tier);
  const e = {
    id: nextId(state), kind: 'enemy', type, faction: 'enemy',
    pos: { x: pos.x, y: def.hoverY || 0, z: pos.z }, prevPos: { x: pos.x, y: def.hoverY || 0, z: pos.z }, vel: { x: 0, y: 0, z: 0 },
    yaw: 0, radius: def.radius, height: def.height, scale: 1,
    hp: 0, maxHp: 0, dmgMult: tm, speedMult: 1, tier, elite: false,
    affinity: { resist: null, weak: null },
    state: 'boss', stateT: 0, attack: { phase: 'windup', t: 0, hasHit: false, cd: 0 },
    poise: 0, poiseMax: 1e9, status: { burn: null, goo: null, burnTick: 0 }, ai: {},
    lastHit: null, dead: false, summoned: false, bigHeadT: 0, hitFlash: 0,
    boss: { bossType: type, tag: def.tag, phaseIdx: 0, transitioning: false, invuln: false,
      action: { id: 'intro', t: 0, data: {} }, patternIdx: 0, weakAngle: 0, summonT: 0, manaOrbNext: 0.9, paired, fade: 1 },
  };
  e.maxHp = Math.round(def.hp * tm * (paired ? 0.85 : 1) * state.tuning.enemyHpMult);
  e.hp = e.maxHp;
  state.enemies.push(e);
  return e;
}

export function createProjectile(state, o) {
  const p = {
    id: nextId(state), kind: 'rocket', faction: 'player', ownerId: 0, gunId: null, sourceKind: 'gun',
    pos: { x: 0, y: 0, z: 0 }, prevPos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 },
    radius: 0.15, gravity: 0, damage: 0, element: 'none', elementChance: 0, arcane: false,
    splash: null, ttl: 5, bounces: 0, pierce: 0, homing: 0, hitIds: {}, critMult: 2, critChance: 0, wacky: null, dead: false,
    ...o,
  };
  p.prevPos = { ...p.pos };
  state.projectiles.push(p);
  return p;
}

export function createPickup(state, o) {
  const p = {
    id: nextId(state), kind: 'health', pos: { x: 0, y: 0.5, z: 0 }, prevPos: { x: 0, y: 0.5, z: 0 }, vel: { x: 0, y: 0, z: 0 },
    amount: 0, ammoType: null, resId: null, gun: null, ttl: TUNING.pickupTtl, age: 0, magnetized: false, dead: false, ...o,
  };
  p.prevPos = { ...p.pos };
  state.pickups.push(p);
  return p;
}

export function createHazard(state, o) {
  const h = { id: nextId(state), kind: 'shockwave', pos: { x: 0, y: 0, z: 0 }, radius: 0, maxRadius: 0, speed: 0, height: 0.6,
    t: 0, ttl: 1, ownerId: 0, damage: 0, hitIds: {}, data: {}, dead: false, ...o };
  state.hazards.push(h);
  return h;
}

export function rollSeed(state) { return next(state.rng); }
