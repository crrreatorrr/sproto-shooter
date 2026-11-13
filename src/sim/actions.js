// UI/debug actions arrive inside commands; dispatched here. Keeps the sim the only writer of state.
import { next } from '../core/rng.js';
import { SKILLS, SKILL_IDS, PERKS, xpToNext } from '../data/skills.js';
import { syncSpellbook } from './spellbook.js';
import { emit } from './events.js';
import { createEnemy, createBoss, newRunStats, nextId } from './state.js';
import { generateGun } from './guns.js';
import { spawnGunPickup, rollGunType, rollQuality } from './drops.js';
import { addXp, applySkillPassives } from './progression.js';
import { onEnemyKilled, GOD_HP } from './combat.js';
import { respawn, godTopUp } from './player.js';
import { startWaves, jumpToWave } from './waves.js';
import { startCampaign, transitionDone } from './campaign/campaign.js';
import { noteV2Section } from './campaign/v2.js';
import { getLevelRuntime } from './level/runtime.js';
import { TUNING } from '../data/tuning.js';
import { BOSSES } from '../data/enemies.js';
import { LEGENDARY_SLOT, GUN_TYPES_BY_ID, QUALITIES_BY_ID, MANUFACTURERS_BY_ID, ELEMENTS_BY_ID, WACKY_BY_ID, PARTS_BY_ID, SLOTS } from '../data/guns.js';
import { MAX_TIER, FIXED_DIFFICULTY } from '../data/waves.js';
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
    case 'loadLoadout': return loadLoadout(state, p, a);
    case 'debug': return debugOp(state, p, a.op, a.args || {});
  }
}

/**
 * Start a mode. Nobody picks a tier: Wave Mode takes its difficulty from the wave number, the campaign
 * from the level, and Boss Fight, the sandbox and the Test Range sit at FIXED_DIFFICULTY. The fourth
 * argument (and a `tier` on the startMode action) is ignored; it stays so older callers keep working.
 */
export function startMode(state, p, mode, _tier = null, opts = {}) {
  const tier = FIXED_DIFFICULTY;
  state.enemies.length = 0; state.projectiles.length = 0; state.hazards.length = 0; state.allies.length = 0;
  state.pickups = state.pickups.filter((k) => k.kind === 'gun');
  // Sandbox toys stay in the sandbox: the Duck Gun it places and anything the debug panel spawned
  // do not follow you into a real mode.
  const real = mode === 'waves' || mode === 'campaign' || mode === 'boss';
  if (real) state.pickups = state.pickups.filter((k) => !SANDBOX_SOURCES.includes(k.gun && k.gun.source));
  state.run = newRunStats();
  if (p.downCount != null) delete p.downCount;
  if (p.dead || p.downed) respawn(state, p);
  p.hp = p.maxHp; p.shield = p.maxShield; p.mana = p.maxMana;
  p.pos = { x: 0, y: 0, z: 8 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 };
  // Wave Mode progress (looted and saved guns, skill levels, wave spells) belongs to Wave Mode alone.
  // Leaving it for any other mode puts the player back to a clean start and clears the floor, so
  // nothing a save brought in can reach the campaign, Boss Fight, the sandbox or the Test Range.
  if (state.mode === 'waves' && mode !== 'waves') {
    state.pickups = [];
    resetProgress(state, p);
  }
  // leaving the test range takes its free loadout and infinite ammo back
  if (state.testMode && mode !== 'test') { resetLoadout(state, p); state.tuning.infiniteAmmo = false; setGodMode(state, p, false); }
  // ...and so does leaving the sandbox, or walking into the campaign from another mode, when the
  // client asks (opts.freshLoadout). A state that was never started in a mode also reads 'sandbox',
  // so the sim cannot tell a real sandbox by itself. Wave Mode loot, saved or not, stays out of the campaign.
  if (opts.freshLoadout && real && ((state.mode === 'sandbox' && !state.testMode) || (mode === 'campaign' && state.mode !== 'campaign'))) resetLoadout(state, p);
  // ...and so does leaving a boss fight
  if (state.bossFight && mode !== 'boss' && mode !== 'test') resetLoadout(state, p);
  // The same rule the other way: Wave Mode starts from a clean player, whatever was earned or picked up
  // in the campaign, a Boss Fight, the Test Range or the sandbox. Skills and guns from there would
  // otherwise be written into the Wave Mode save. The saved loadout arrives after this, as loadLoadout.
  // The sandbox needs the client's flag, for the reason above: without it this could be a state no
  // mode has started, which keeps what it was set up with.
  const fromOutside = state.mode !== 'waves' && (state.mode !== 'sandbox' || state.testMode || !!opts.freshLoadout);
  if (mode === 'waves' && fromOutside) {
    state.pickups = [];
    resetProgress(state, p, startingLoadout(p));
  }
  state.testMode = mode === 'test';
  state.bossFight = null;
  if (mode === 'waves') {
    startWaves(state);
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
  if (state.mode !== 'campaign') {
    if (!p.spellUnlocks) p.spellUnlocks = {};
    p.spellUnlocks.gooBolt = true;
    syncSpellbook(state, p);
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

/** Gun pickups with these sources are removed when a real mode starts. */
const SANDBOX_SOURCES = ['sandbox', 'debug'];

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
  syncSpellbook(state, p);
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

/** True when the player carries the starting gun and nothing else (a new player, or one already reset). */
function startingLoadout(p) {
  return p.guns.every((g, i) => (i === 0 ? !!g && g.source === 'start' : !g));
}

/** Most guns a saved loadout may bring: the five slots, plus three that are put on the floor. */
export const LOADOUT_MAX_GUNS = 8;

/**
 * Wave Mode only: put a loadout saved on this device (skill levels and guns) on the player. The save is
 * untrusted input, so every field is checked and each gun is rebuilt from its seed by generateGun, never
 * copied. Skills only ever go up. Ignored in every other mode, so it can never touch a campaign run
 * (a rewarded run also cannot carry the action: src/server/protocol.js refuses it).
 */
export function loadLoadout(state, p, a) {
  if (state.mode !== 'waves' || !a || typeof a !== 'object') return;
  for (const id of SKILL_IDS) {
    const src = a.skills && a.skills[id];
    const level = Math.floor(Number(src && src.level));
    if (!(level >= 1 && level <= SKILLS[id].maxLevel)) continue;
    const xp = level >= SKILLS[id].maxLevel ? 0 : Math.min(Math.max(0, Number(src.xp) || 0), xpToNext(id, level, 'waves') - 1);
    const sk = p.skills[id];
    if (level < sk.level || (level === sk.level && xp <= sk.xp)) continue;
    sk.level = level; sk.xp = xp; sk.total = Math.max(sk.total, Number(src.total) || 0);
  }
  for (const perk of PERKS) if (p.skills[perk.skill].level >= perk.level) p.perks[perk.id] = true;
  applySkillPassives(state, p);
  p.hp = p.maxHp;
  const guns = [];
  for (const spec of Array.isArray(a.guns) ? a.guns.slice(0, LOADOUT_MAX_GUNS) : []) {
    const g = gunFromSpec(state, spec);
    if (g) guns.push({ gun: g, slot: Math.floor(Number(spec.slot)) });
  }
  if (!guns.length) return;
  p.guns = [null, null, null, null, null];
  const spare = [];
  for (const { gun, slot } of guns) {
    const fits = slot === LEGENDARY_SLOT ? gun.quality === 'legendary' : slot >= 0 && slot < p.unlockedSlots;
    if (fits && !p.guns[slot]) p.guns[slot] = gun; else spare.push(gun);
  }
  // Anything without a slot (a locked fourth slot, a duplicate) waits on the floor in front of you.
  // It stays there until taken (no despawn timer), and stays in the save meanwhile (src/save/loadout.js).
  spare.forEach((gun, i) => { spawnGunPickup(state, gun, aheadOf(p, 2 + i * 0.8), 'stash').ttl = Infinity; });
  if (!p.guns.some(Boolean)) { resetLoadout(state, p); return; }
  p.activeSlot = Math.max(0, p.guns.findIndex((g, i) => g && i !== LEGENDARY_SLOT));
  if (!p.guns[p.activeSlot]) p.activeSlot = p.guns.findIndex(Boolean);
  p.reloadT = 0; p.swapT = 0;
}

function gunFromSpec(state, spec) {
  if (!spec || typeof spec !== 'object') return null;
  const def = GUN_TYPES_BY_ID[spec.type];
  const level = Math.floor(Number(spec.level));
  // The Duck Gun is a sandbox toy and is never found in Wave Mode, so a save cannot hold one.
  if (!def || def.legendaryOnly || !QUALITIES_BY_ID[spec.quality] || !Number.isFinite(spec.seed) || !(level >= 1 && level <= MAX_TIER)) return null;
  const forced = { type: def.id, quality: spec.quality };
  if (MANUFACTURERS_BY_ID[spec.manufacturer]) forced.manufacturer = spec.manufacturer;
  if (ELEMENTS_BY_ID[spec.element]) forced.element = spec.element;
  if (spec.quality === 'legendary' && WACKY_BY_ID[spec.wacky] && WACKY_BY_ID[spec.wacky].allowedTypes.includes(def.id)) forced.wacky = spec.wacky;
  if (spec.parts && typeof spec.parts === 'object') {
    const parts = {};
    let fitted = 0;
    for (const slot of SLOTS) {
      const id = spec.parts[slot];
      if (id === 'stock') parts[slot] = id;
      else if (PARTS_BY_ID[id] && PARTS_BY_ID[id].slot === slot) { parts[slot] = id; fitted++; }
    }
    // A gun never has more parts than its quality allows; a save that claims more keeps what the seed rolls.
    if (fitted <= QUALITIES_BY_ID[spec.quality].partSlots && Object.keys(parts).length === SLOTS.length) forced.parts = parts;
  }
  const gun = generateGun({ seed: spec.seed >>> 0, level, forced, arcane: !!spec.arcane });
  gun.id = nextId(state); gun.source = 'stash';
  return gun;
}

/** Back to a new player's guns, ammo, skills, perks and spells. Used when Wave Mode is left. */
function resetProgress(state, p, keepGuns = false) {
  if (keepGuns) p.ammo = { ...TUNING.startAmmo }; else resetLoadout(state, p);
  for (const id of SKILL_IDS) p.skills[id] = { level: 1, xp: 0, total: 0 };
  for (const perk of PERKS) if (perk.level > 1 && p.perks[perk.id]) p.perks[perk.id] = false;
  p.buffs.killFrenzy.stacks = 0; p.buffs.killFrenzy.t = 0;
  p.unkillableUsed = false;
  p.spellUnlocks = { gooBolt: true };
  syncSpellbook(state, p);
  applySkillPassives(state, p);
  p.hp = p.maxHp; p.shield = p.maxShield;
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
        createEnemy(state, args.type, { elite: !!args.elite, pos });
      }
      break;
    }
    case 'spawnBoss': {
      const pos = aheadOf(p, 14); const r = Math.hypot(pos.x, pos.z); if (r > 24) { pos.x *= 24 / r; pos.z *= 24 / r; }
      const b = createBoss(state, args.type, { pos });
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
    case 'campaignSection': {
      const rt = getLevelRuntime(state.level.id);
      const sec = rt.sectionById[args.id];
      if (!sec) break;
      state.level.section = sec.id;
      state.level.intro = null;
      state.level.transition = null;
      if (state.level.format === 'v2') noteV2Section(state, sec, rt);
      if (args.x != null) {
        p.pos.x = args.x; p.pos.y = args.y || 0; p.pos.z = args.z || 0;
        p.prevPos = { ...p.pos };
        p.vel = { x: 0, y: 0, z: 0 };
      }
      break;
    }
    case 'killAll':
      for (const e of state.enemies) if (!e.dead && e.type !== 'dummy') { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(state, e); }
      break;
    case 'clearEnemies': state.enemies.length = 0; break;
    case 'giveTickets': p.tickets += args.amount || 100; break;
    case 'giveResources': break;
    case 'giveXp': addXp(state, p, args.skill, args.amount || 100); break;
    case 'levelSkill': {
      const s = p.skills[args.skill];
      if (s && s.level < 10) addXp(state, p, args.skill, (xpToNext(args.skill, s.level, state.mode) - s.xp + 1) / (1 + 0.1 * (state.tier - 1)));
      break;
    }
    case 'maxSkills': for (const sk of SKILL_IDS) for (let i = 0; i < 10; i++) debugOp(state, p, 'levelSkill', { skill: sk }); break;
    case 'refillAmmo': for (const k of Object.keys(p.ammo)) p.ammo[k] = p.ammoCap[k]; for (const g of p.guns) if (g) g.ammoInMag = g.stats.magSize; break;
    case 'heal': p.hp = p.maxHp; p.shield = p.maxShield; p.mana = p.maxMana; if (p.dead || p.downed) respawn(state, p); break;
    case 'setTuning': if (args.key === 'godMode') setGodMode(state, p, args.value); else state.tuning[args.key] = args.value; break;
    case 'toggleGod': setGodMode(state, p, !state.tuning.godMode); break;
    case 'setGunStat': { const g = p.guns[p.activeSlot]; if (g && args.key in g.stats) g.stats[args.key] = args.value; break; }
    case 'jumpToWave': jumpToWave(state, (args.wave | 0) - 1); break;
    case 'skipWave': if (state.wave) { for (const e of state.enemies) if (!e.dead) { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(state, e); } state.wave.spawnQueue = []; state.wave.groupIdx = 99; } break;
  }
  applySkillPassives(state, p);
}
