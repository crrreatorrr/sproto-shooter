// UI/debug actions arrive inside commands; dispatched here. Keeps the sim the only writer of state.
import { next } from '../core/rng.js';
import { RES_IDS } from '../data/drops.js';
import { SKILL_IDS, SPELL_IDS, PERKS_BY_ID, xpToNext } from '../data/skills.js';
import { emit } from './events.js';
import { createEnemy, createBoss, newRunStats, nextId } from './state.js';
import { generateGun } from './guns.js';
import { spawnGunPickup, rollGunType, rollQuality } from './drops.js';
import { addXp, applySkillPassives } from './progression.js';
import { onEnemyKilled, GOD_HP } from './combat.js';
import { respawn, godTopUp } from './player.js';
import { startWaves } from './waves.js';
import { startCampaign, transitionDone } from './campaign/campaign.js';
import { TUNING } from '../data/tuning.js';
import { BOSSES } from '../data/enemies.js';
import { LEGENDARY_SLOT } from '../data/guns.js';
import {
  startCraft, salvage, reroll, pickupGun, dropGun, buyOffer, rerollShop, sellGun, vend, buyUpgrade, buySupply, rollShopOffers,
} from './economy.js';

export function applyActions(state, commands) {
  for (const p of Object.values(state.players)) {
    const c = commands[p.id];
    if (!c) continue;
    if (c.pressed?.interact && p.nearGunPickupId) pickupGun(state, p, p.nearGunPickupId);
    for (const a of c.actions || []) handle(state, p, a);
  }
}

function handle(state, p, a) {
  switch (a.type) {
    case 'craft': return startCraft(state, p, a);
    case 'salvage': return salvage(state, p, a.slot);
    case 'reroll': return reroll(state, p, a.slot, a.stat);
    case 'pickupGun': return pickupGun(state, p, a.pickupId);
    case 'dropGun': return dropGun(state, p, a.slot);
    case 'buy': return buyOffer(state, p, a.offerId);
    case 'rerollShop': return rerollShop(state, p);
    case 'sell': return sellGun(state, p, a.slot);
    case 'vend': return vend(state, p);
    case 'buyUpgrade': return buyUpgrade(state, p, a.id);
    case 'buySupply': return buySupply(state, p, a.id);
    case 'startMode': return startMode(state, p, a.mode, a.tier, a);
    case 'transitionDone': return transitionDone(state);
    case 'debug': return debugOp(state, p, a.op, a.args || {});
  }
}

export function startMode(state, p, mode, tier = 1, opts = {}) {
  state.enemies.length = 0; state.projectiles.length = 0; state.hazards.length = 0; state.allies.length = 0;
  state.pickups = state.pickups.filter((k) => k.kind === 'gun');
  state.run = newRunStats();
  if (p.dead || p.downed) respawn(state, p);
  p.hp = p.maxHp; p.shield = p.maxShield; p.mana = p.maxMana;
  p.pos = { x: 0, y: 0, z: 8 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 };
  // leaving the test range takes its free loadout and infinite ammo back
  if (state.testMode && mode !== 'test') { resetLoadout(state, p); state.tuning.infiniteAmmo = false; setGodMode(state, p, false); }
  // ...and so does leaving a boss fight
  if (state.bossFight && mode !== 'boss' && mode !== 'test') resetLoadout(state, p);
  state.testMode = mode === 'test';
  state.bossFight = null;
  if (mode === 'waves') {
    startWaves(state, tier);
  } else if (mode === 'campaign') {
    startCampaign(state, p, opts.level);
  } else if (mode === 'boss') {
    startBossFight(state, p, opts.boss, tier);
  } else {
    state.mode = 'sandbox'; state.wave = null; state.tier = tier;
    p.unlockedSlots = 4;
    rollShopOffers(state);
    if (mode === 'test') giveTestLoadout(state, p);
    else placeSandboxLegendary(state, p, tier);
    emit(state, 'modeStart', { mode: state.testMode ? 'test' : 'sandbox', tier });
  }
}

/**
 * Boss Fight mode: one boss of your choice in the arena, with real damage (unlike the sandbox). You get one of
 * every gun with full ammo; leaving the mode gives the starting loadout back.
 */
function startBossFight(state, p, type, tier) {
  if (!BOSSES[type]) type = Object.keys(BOSSES)[0];
  state.mode = 'boss'; state.wave = null; state.tier = tier;
  state.bossFight = { type, over: null, startT: state.time, time: 0 };
  giveAllGuns(state, p);
  for (const k of Object.keys(p.ammoCap)) p.ammo[k] = p.ammoCap[k];
  for (const g of p.guns) if (g) g.ammoInMag = g.stats.magSize;
  const b = createBoss(state, type, { tier, pos: { x: 0, z: -18 } });
  emit(state, 'modeStart', { mode: 'boss', tier, boss: type });
  emit(state, 'bossIntro', { types: [type] });
  emit(state, 'bossSpawn', { id: b.id, bossType: type });
}

/** Boss Fight mode: ends when the boss or the player goes down. */
export function bossFightDirector(state) {
  const f = state.bossFight;
  if (state.mode !== 'boss' || !f || f.over) return;
  const boss = state.enemies.find((e) => e.boss && e.type === f.type);
  const p = state.players[state.localPlayerId];
  f.time = state.time - f.startT;
  if (!boss || boss.dead) { f.over = 'won'; emit(state, 'bossFightOver', { won: true, boss: f.type, time: f.time }); }
  else if (p.dead) { f.over = 'lost'; emit(state, 'bossFightOver', { won: false, boss: f.type, hpLeft: boss.hp / boss.maxHp }); }
}

/** Sandbox: a Duck Gun (always legendary) waiting just ahead of the spawn point, unless you already have one. */
export const SANDBOX_DUCK_POS = { x: 1.5, z: 4.5 };
function placeSandboxLegendary(state, p, tier) {
  const has = p.guns.some((g) => g && g.type === 'duckgun') || state.pickups.some((k) => !k.dead && k.gun && k.gun.type === 'duckgun');
  if (has) return;
  const gun = generateGun({ seed: 0xD0C4, level: tier, forced: { type: 'duckgun', manufacturer: 'blastco', element: 'none' } });
  const k = spawnGunPickup(state, gun, SANDBOX_DUCK_POS, 'sandbox');
  k.ttl = Infinity; // stays until you take it
  k.vel = { x: 0, y: 0, z: 0 };
}

/** Test range: one of every gun type in slots 1-4, full ammo, infinite reserve, target dummies. */
export const TEST_GUN_TYPES = ['mg', 'shotgun', 'sniper', 'bazooka'];
function giveTestLoadout(state, p) {
  p.guns = TEST_GUN_TYPES.map((type, i) => {
    const g = generateGun({ seed: 0x7E57 + i, level: state.tier, forced: { type, quality: 'common', manufacturer: 'reliable', element: 'none' } });
    g.id = nextId(state); g.source = 'test';
    return g;
  });
  p.guns.push(null); // legendary slot
  p.activeSlot = 0; p.reloadT = 0; p.swapT = 0;
  for (const k of Object.keys(p.ammoCap)) p.ammo[k] = p.ammoCap[k];
  state.tuning.infiniteAmmo = true;
  setGodMode(state, p, true);
  debugOp(state, p, 'spawnDummies', {});
}

/** God mode on: back up to at least GOD_HP (reviving if down) and stocked up on everything. Off: normal damage again. */
export function setGodMode(state, p, on) {
  state.tuning.godMode = !!on;
  // every spell while god mode is on; turning it off keeps only what the Magic level has earned
  for (const id of SPELL_IDS) p.perks[id] = on || p.skills[PERKS_BY_ID[id].skill].level >= PERKS_BY_ID[id].level;
  if (!p.perks.manaShield) p.spells.manaShieldOn = false;
  if (!on) return;
  if (p.dead || p.downed) respawn(state, p);
  p.hp = Math.max(p.hp, Math.min(GOD_HP, p.maxHp));
  p.mana = p.maxMana;
  godTopUp(p);
  giveAllGuns(state, p);
}

/**
 * One gun of every type in slots 1-4. Guns you already carry are kept for their type (your looted one beats a
 * plain one); any that don't fit (a second shotgun, say) are dropped on the ground in front of you, not deleted.
 */
function giveAllGuns(state, p) {
  p.unlockedSlots = Math.max(p.unlockedSlots, TEST_GUN_TYPES.length);
  const legendary = p.guns[LEGENDARY_SLOT] || null; // the legendary slot is left alone
  const carried = p.guns.filter((g, i) => g && i !== LEGENDARY_SLOT);
  const active = p.guns[p.activeSlot];
  const guns = TEST_GUN_TYPES.map((type, i) => {
    const own = carried.find((g) => g.type === type);
    if (own) return own;
    const g = generateGun({ seed: 0x60D0 + i, level: state.tier, forced: { type, quality: 'common', manufacturer: 'reliable', element: 'none' } });
    g.id = nextId(state); g.source = 'god';
    return g;
  });
  carried.filter((g) => !guns.includes(g)).forEach((g, i) => spawnGunPickup(state, g, aheadOf(p, 2 + i * 0.8), 'drop'));
  p.guns = [...guns, legendary];
  const keep = p.guns.indexOf(active);
  if (keep >= 0) p.activeSlot = keep;
  else { p.activeSlot = Math.max(0, guns.findIndex((g) => active && g.type === active.type)); p.reloadT = 0; p.swapT = 0; }
}

function resetLoadout(state, p) {
  const start = generateGun({ seed: 0xC0FFEE, level: 1, forced: { type: 'mg', quality: 'common', manufacturer: 'reliable', element: 'none' } });
  start.id = nextId(state); start.source = 'start';
  p.guns = [start, null, null, null, null];
  p.activeSlot = 0; p.reloadT = 0; p.swapT = 0;
  p.ammo = { ...TUNING.startAmmo };
}

function aheadOf(p, d = 10) { return { x: p.pos.x - Math.sin(p.yaw) * d, z: p.pos.z - Math.cos(p.yaw) * d }; }

export function debugOp(state, p, op, args) {
  switch (op) {
    case 'spawnEnemy': {
      const n = args.count || 1;
      for (let i = 0; i < n; i++) {
        const pos = aheadOf(p, 10 + i * 1.5);
        pos.x += (i % 3 - 1) * 2;
        const r = Math.hypot(pos.x, pos.z); if (r > 27) { pos.x *= 27 / r; pos.z *= 27 / r; }
        createEnemy(state, args.type, { elite: !!args.elite, tier: args.tier || state.tier, pos });
      }
      break;
    }
    case 'spawnBoss': {
      const pos = aheadOf(p, 14); const r = Math.hypot(pos.x, pos.z); if (r > 24) { pos.x *= 24 / r; pos.z *= 24 / r; }
      const b = createBoss(state, args.type, { tier: args.tier || state.tier, pos });
      emit(state, 'bossSpawn', { id: b.id, bossType: args.type });
      break;
    }
    case 'spawnDummies': {
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) * 0.35;
        createEnemy(state, 'dummy', { pos: { x: p.pos.x - Math.sin(p.yaw + a) * 12, z: p.pos.z - Math.cos(p.yaw + a) * 12 } });
      }
      break;
    }
    case 'spawnGun': {
      const forced = {};
      forced.type = args.type && args.type !== 'random' ? args.type : rollGunType(state.rng);
      forced.quality = args.quality && args.quality !== 'random' ? args.quality : rollQuality(state.rng, 'enemyGun');
      if (args.element && args.element !== 'random') forced.element = args.element;
      if (args.wacky && args.wacky !== 'random' && forced.quality === 'legendary') forced.wacky = args.wacky;
      const gun = generateGun({ seed: next(state.rng), level: args.level || state.tier, forced });
      gun.id = nextId(state);
      spawnGunPickup(state, gun, aheadOf(p, 3), 'debug');
      break;
    }
    case 'killAll':
      for (const e of state.enemies) if (!e.dead && e.type !== 'dummy') { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(state, e); }
      break;
    case 'clearEnemies': state.enemies.length = 0; break;
    case 'giveTickets': p.tickets += args.amount || 100; break;
    case 'giveResources': for (const k of RES_IDS) p.resources[k] += k === 'bossCore' || k === 'manaCrystal' ? 3 : args.amount || 100; break;
    case 'giveXp': addXp(state, p, args.skill, args.amount || 100); break;
    case 'levelSkill': {
      const s = p.skills[args.skill];
      if (s.level < 10) addXp(state, p, args.skill, (xpToNext(args.skill, s.level) - s.xp + 1) / (1 + 0.1 * (state.tier - 1)));
      break;
    }
    case 'maxSkills': for (const sk of SKILL_IDS) for (let i = 0; i < 10; i++) debugOp(state, p, 'levelSkill', { skill: sk }); break;
    case 'setTier': state.tier = Math.max(1, Math.min(10, args.tier | 0)); break;
    case 'refillAmmo': for (const k of Object.keys(p.ammo)) p.ammo[k] = p.ammoCap[k]; for (const g of p.guns) if (g) g.ammoInMag = g.stats.magSize; break;
    case 'heal': p.hp = p.maxHp; p.shield = p.maxShield; p.mana = p.maxMana; if (p.dead || p.downed) respawn(state, p); break;
    case 'setTuning': if (args.key === 'godMode') setGodMode(state, p, args.value); else state.tuning[args.key] = args.value; break;
    case 'toggleGod': setGodMode(state, p, !state.tuning.godMode); break;
    case 'setGunStat': { const g = p.guns[p.activeSlot]; if (g && args.key in g.stats) g.stats[args.key] = args.value; break; }
    case 'skipWave': if (state.wave) { for (const e of state.enemies) if (!e.dead) { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(state, e); } state.wave.spawnQueue = []; state.wave.groupIdx = 99; } break;
  }
  applySkillPassives(state, p);
}
