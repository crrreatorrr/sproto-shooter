// Drop rolling (pure) + spawning. PLAN §4.13
import { float, int, range, weighted, next } from '../core/rng.js';
import { DROP_TABLES, QUALITY_TABLES } from '../data/drops.js';
import { QUALITIES, GUN_TYPES, BOSS_GUN_TYPES } from '../data/guns.js';
import { ELITE } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';
import { generateGun } from './guns.js';
import { createPickup, nextId } from './state.js';

export function rollQuality(rng, tableId, shift = 0) {
  const w = QUALITY_TABLES[tableId];
  const q = weighted(rng, QUALITIES.map((qq, i) => ({ id: qq.id, idx: i, weight: w[i] })));
  return QUALITIES[Math.min(4, q.idx + shift)].id;
}

export function rollGunType(rng) {
  return weighted(rng, GUN_TYPES).id;
}

// a boss whose table doesn't list a boss weapon (or that has no table: the campaign bosses) always drops one
const BOSS_WEAPON_DROP = { kind: 'bossGun', chance: 1, table: 'boss' };

/** Pure: returns drop specs. ctx = {elite, tier, playerGunTypes(ammoTypes), summoned, boss} */
export function rollDrops(rng, tableId, ctx = {}) {
  let table = DROP_TABLES[tableId] || [];
  if (ctx.boss && !table.some((e) => e.kind === 'bossGun')) table = [...table, BOSS_WEAPON_DROP];
  const tierM = 1 + 0.1 * ((ctx.tier || 1) - 1);
  const eliteM = ctx.elite ? ELITE.dropMult : 1;
  const out = [];
  for (const entry of table) {
    let chance = entry.chance;
    if (entry.kind === 'gun' && ctx.elite) chance = Math.min(0.6, chance * ELITE.gunMult);
    if (ctx.summoned && entry.kind === 'gun') chance *= 0.25;
    const roll = float(rng);
    if (roll >= chance) continue;
    const count = entry.count || 1;
    for (let c = 0; c < count; c++) {
      switch (entry.kind) {
        case 'resource': {
          const base = int(rng, entry.min, entry.max);
          const amt = entry.noScale ? base : Math.round(base * tierM * eliteM);
          out.push({ kind: 'resource', resId: entry.resId, amount: amt });
          break;
        }
        case 'tickets': {
          const base = int(rng, entry.min, entry.max);
          out.push({ kind: 'tickets', amount: Math.round(base * tierM * eliteM) });
          break;
        }
        case 'health': out.push({ kind: 'health', amount: TUNING.healthOrb }); break;
        case 'bigHealth': out.push({ kind: 'bigHealth', amount: TUNING.bigOrb }); break;
        case 'ammo': {
          // ammo for one of the guns the player carries
          const types = ctx.playerGunTypes && ctx.playerGunTypes.length ? ctx.playerGunTypes : ['bullets'];
          const t = types[Math.floor(float(rng) * types.length)];
          if (t) out.push({ kind: 'ammo', ammoType: t, amount: TUNING.ammoDrop[t] });
          break;
        }
        case 'gun': {
          const shift = ctx.elite && float(rng) < 0.5 ? 1 : 0;
          const quality = rollQuality(rng, entry.table, shift);
          const type = rollGunType(rng);
          out.push({ kind: 'gun', type, quality, seed: next(rng), level: ctx.tier || 1 });
          break;
        }
        case 'bossGun': {
          // boss-only weapon (Ray Gun / Big Bullets), at least rare; one quality step up unless the table says otherwise
          const type = BOSS_GUN_TYPES[Math.min(BOSS_GUN_TYPES.length - 1, Math.floor(float(rng) * BOSS_GUN_TYPES.length))];
          const quality = rollQuality(rng, entry.table, entry.shift ?? 1);
          out.push({ kind: 'gun', type, quality, seed: next(rng), level: ctx.tier || 1, source: 'boss' });
          break;
        }
      }
    }
  }
  return out;
}

export function spawnDrops(state, specs, pos) {
  for (const s of specs) {
    const a = range(state.rng, 0, Math.PI * 2);
    const sp = range(state.rng, 2, 4.5);
    const vel = { x: Math.cos(a) * sp, y: range(state.rng, 4, 7), z: Math.sin(a) * sp };
    const base = { pos: { x: pos.x, y: Math.max(0.5, pos.y), z: pos.z }, vel };
    if (s.kind === 'gun') {
      const gun = generateGun({ seed: s.seed, level: s.level, forced: { type: s.type, quality: s.quality } });
      gun.id = nextId(state);
      gun.source = s.source || 'drop';
      createPickup(state, { ...base, kind: 'gun', gun, ttl: TUNING.gunPickupTtl, vel: { x: vel.x * 0.5, y: 6, z: vel.z * 0.5 } });
      state.run.gunsFound++;
    } else {
      createPickup(state, { ...base, kind: s.kind, amount: s.amount, resId: s.resId || null, ammoType: s.ammoType || null });
    }
  }
}

/** Spawn a specific gun pickup (debug, victory, vending) */
export function spawnGunPickup(state, gun, pos, source = 'drop') {
  gun.id = gun.id || nextId(state);
  gun.source = source;
  return createPickup(state, { kind: 'gun', gun, pos: { x: pos.x, y: 1, z: pos.z }, vel: { x: 0, y: 5, z: 0 }, ttl: TUNING.gunPickupTtl });
}
