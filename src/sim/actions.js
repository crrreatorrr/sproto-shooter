// UI/debug actions arrive inside commands; dispatched here. Keeps the sim the only writer of state.
import { next } from '../core/rng.js';
import { RES_IDS } from '../data/drops.js';
import { SKILL_IDS, xpToNext } from '../data/skills.js';
import { emit } from './events.js';
import { createEnemy, createBoss, newRunStats, nextId } from './state.js';
import { generateGun } from './guns.js';
import { spawnGunPickup, rollGunType, rollQuality } from './drops.js';
import { addXp, applySkillPassives } from './progression.js';
import { onEnemyKilled } from './combat.js';
import { respawn } from './player.js';
import { startWaves } from './waves.js';
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
    case 'startMode': return startMode(state, p, a.mode, a.tier);
    case 'debug': return debugOp(state, p, a.op, a.args || {});
  }
}

export function startMode(state, p, mode, tier = 1) {
  state.enemies.length = 0; state.projectiles.length = 0; state.hazards.length = 0; state.allies.length = 0;
  state.pickups = state.pickups.filter((k) => k.kind === 'gun');
  state.run = newRunStats();
  if (p.dead || p.downed) respawn(state, p);
  p.hp = p.maxHp; p.shield = p.maxShield; p.mana = p.maxMana;
  p.pos = { x: 0, y: 0, z: 8 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 };
  if (mode === 'waves') {
    startWaves(state, tier);
  } else {
    state.mode = 'sandbox'; state.wave = null; state.tier = tier;
    p.unlockedSlots = 4;
    rollShopOffers(state);
    emit(state, 'modeStart', { mode: 'sandbox', tier });
  }
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
    case 'setTuning': state.tuning[args.key] = args.value; break;
    case 'setGunStat': { const g = p.guns[p.activeSlot]; if (g && args.key in g.stats) g.stats[args.key] = args.value; break; }
    case 'skipWave': if (state.wave) { for (const e of state.enemies) if (!e.dead) { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(state, e); } state.wave.spawnQueue = []; state.wave.groupIdx = 99; } break;
  }
  applySkillPassives(state, p);
}
