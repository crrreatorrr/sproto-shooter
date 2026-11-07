// Crafting (weapon boxes), shop, vending, gun pickup/sell. PLAN §3.11, §7.7, §7.9
import { RECIPES_BY_ID, ARCANE_COST, REROLL_COST, REROLL_LEVEL, SALVAGE_LEVEL } from '../data/recipes.js';
import { SHOP } from '../data/shop.js';
import { RES_IDS } from '../data/drops.js';
import { TUNING } from '../data/tuning.js';
import { float, weighted, next, range } from '../core/rng.js';
import { emit } from './events.js';
import { generateGun, regenerate, sellValue, shopPrice, salvageYield, REROLLABLE } from './guns.js';
import { rollQuality, rollGunType, spawnGunPickup } from './drops.js';
import { applySkillPassives } from './progression.js';
import { nextId, createPickup } from './state.js';
import { healPlayer } from './combat.js';

export const canAfford = (res, cost) => Object.entries(cost).every(([k, v]) => (res[k] || 0) >= v);
const pay = (res, cost) => { for (const [k, v] of Object.entries(cost)) res[k] -= v; };
export const mergeCost = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = (o[k] || 0) + v; return o; };

export function recipeUnlocked(state, p, r) {
  return state.tuning.unlockAllRecipes || p.skills.crafting.level >= r.craftingLevel;
}

export function nearBox(state, p) {
  for (const b of state.weaponBoxes) if (Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z) <= b.interactRadius) return b;
  return null;
}

/** Returns error string or null */
export function validateCraft(state, p, a) {
  const r = RECIPES_BY_ID[a.recipeId];
  if (!r) return 'Unknown recipe';
  const box = state.weaponBoxes.find((b) => b.id === a.boxId);
  if (!box || Math.hypot(p.pos.x - box.pos.x, p.pos.z - box.pos.z) > box.interactRadius + 0.5) return 'Too far from the Weapon Box';
  if (box.craft) return 'Box is busy';
  if (!recipeUnlocked(state, p, r)) return `Needs Crafting Lv ${r.craftingLevel}`;
  let cost = r.cost;
  if (a.choice?.arcane) cost = mergeCost(cost, ARCANE_COST);
  if (!canAfford(p.resources, cost)) return 'Not enough resources';
  if (r.category === 'ammo' && p.ammo[r.ammoType] >= p.ammoCap[r.ammoType]) return 'Ammo full';
  if (r.id === 'medkit' && p.medkits >= TUNING.medkitCarry) return 'Medkits full';
  return null;
}

export function startCraft(state, p, a) {
  const err = validateCraft(state, p, a);
  if (err) { emit(state, 'actionFailed', { playerId: p.id, reason: err }); return false; }
  const r = RECIPES_BY_ID[a.recipeId];
  const box = state.weaponBoxes.find((b) => b.id === a.boxId);
  let cost = r.cost;
  if (a.choice?.arcane) cost = mergeCost(cost, ARCANE_COST);
  pay(p.resources, cost);
  box.craft = { recipeId: r.id, playerId: p.id, choice: a.choice || {}, t: 0, duration: r.craftTime, seed: next(state.rng) };
  emit(state, 'craftStart', { boxId: box.id, recipeId: r.id, playerId: p.id });
  return true;
}

export function crafting(state, dt) {
  const intermission = state.wave && state.wave.phase === 'intermission';
  for (const box of state.weaponBoxes) {
    box.glow = intermission || state.mode === 'sandbox';
    const c = box.craft;
    if (!c) continue;
    c.t += dt;
    if (c.t < c.duration) continue;
    box.craft = null;
    const p = state.players[c.playerId];
    const r = RECIPES_BY_ID[c.recipeId];
    let gunId = null;
    if (r.category === 'gun') {
      const forced = { type: r.gunType, quality: r.quality };
      if (r.options.chooseElement && c.choice.element) forced.element = c.choice.element;
      if (r.options.choosePart && c.choice.part) forced.part = c.choice.part;
      const gun = generateGun({ seed: c.seed, level: state.tier, forced, arcane: !!(r.options.arcane && c.choice.arcane) });
      gun.id = nextId(state);
      gun.source = 'craft';
      gunId = gun.id;
      spawnGunPickup(state, gun, { x: box.pos.x * 0.9, z: box.pos.z }, 'craft');
    } else if (r.category === 'ammo') {
      p.ammo[r.ammoType] = Math.min(p.ammoCap[r.ammoType], p.ammo[r.ammoType] + r.amount);
    } else if (r.id === 'medkit') {
      p.medkits = Math.min(TUNING.medkitCarry, p.medkits + 1);
    }
    state.run.crafts++;
    emit(state, 'craftComplete', { boxId: box.id, recipeId: r.id, playerId: p.id, gunId, category: r.category, pos: { ...box.pos } });
  }
}

export function salvage(state, p, slot) {
  if (!(state.tuning.unlockAllRecipes || p.skills.crafting.level >= SALVAGE_LEVEL)) return fail(state, p, `Salvage needs Crafting Lv ${SALVAGE_LEVEL}`);
  if (!nearBox(state, p)) return fail(state, p, 'Stand at a Weapon Box');
  const g = p.guns[slot];
  if (!g) return;
  if (p.guns.filter(Boolean).length <= 1) return fail(state, p, "Can't salvage your last gun");
  const y = salvageYield(g);
  for (const [k, v] of Object.entries(y)) p.resources[k] += v;
  p.guns[slot] = null;
  ensureActiveGun(p);
  emit(state, 'salvage', { playerId: p.id, gunId: g.id, yield: y });
}

export function reroll(state, p, slot, stat) {
  if (!(state.tuning.unlockAllRecipes || p.skills.crafting.level >= REROLL_LEVEL)) return fail(state, p, `Reroll needs Crafting Lv ${REROLL_LEVEL}`);
  if (!nearBox(state, p)) return fail(state, p, 'Stand at a Weapon Box');
  const g = p.guns[slot];
  if (!g || !REROLLABLE.includes(stat)) return;
  let cost = REROLL_COST;
  if (g.quality === 'legendary') cost = mergeCost(cost, { manaCrystal: 1 });
  if (!canAfford(p.resources, cost)) return fail(state, p, 'Not enough resources');
  pay(p.resources, cost);
  const rerolls = g.rerolls.filter((r) => r.stat !== stat).concat([{ stat, salt: next(state.rng) }]);
  p.guns[slot] = regenerate(g, { rerolls });
  emit(state, 'reroll', { playerId: p.id, gunId: g.id, stat });
}

function fail(state, p, reason) { emit(state, 'actionFailed', { playerId: p.id, reason }); return false; }

export function ensureActiveGun(p) {
  if (p.guns[p.activeSlot]) return;
  const i = p.guns.findIndex((g, idx) => g && idx < p.unlockedSlots);
  if (i >= 0) p.activeSlot = i;
}

/** Put a gun in an empty slot, else swap with the active gun (dropping the old one). */
export function pickupGun(state, p, pickupId) {
  const k = state.pickups.find((x) => x.id === pickupId && !x.dead && x.kind === 'gun');
  if (!k) return;
  if (Math.hypot(p.pos.x - k.pos.x, p.pos.z - k.pos.z) > TUNING.gunPickupRadius + 1) return;
  let slot = -1;
  for (let i = 0; i < p.unlockedSlots; i++) if (!p.guns[i]) { slot = i; break; }
  const gun = k.gun;
  k.dead = true;
  if (slot === -1) {
    slot = p.activeSlot;
    const old = p.guns[slot];
    if (old) {
      createPickup(state, { kind: 'gun', gun: old, pos: { x: p.pos.x, y: 1, z: p.pos.z }, vel: { x: 0, y: 4, z: 0 }, ttl: TUNING.gunPickupTtl });
      emit(state, 'gunDropped', { gunId: old.id, slot });
    }
  }
  p.guns[slot] = gun;
  p.activeSlot = slot;
  p.reloadT = 0;
  p.swapT = 0.3;
  emit(state, 'gunPickedUp', { playerId: p.id, gunId: gun.id, slot, quality: gun.quality });
}

export function dropGun(state, p, slot) {
  const g = p.guns[slot];
  if (!g || p.guns.filter(Boolean).length <= 1) return;
  p.guns[slot] = null;
  createPickup(state, { kind: 'gun', gun: g, pos: { x: p.pos.x, y: 1, z: p.pos.z }, vel: { x: -Math.sin(p.yaw) * 3, y: 4, z: -Math.cos(p.yaw) * 3 }, ttl: TUNING.gunPickupTtl });
  ensureActiveGun(p);
  emit(state, 'gunDropped', { gunId: g.id, slot });
}

// ---------------- Shop ----------------
export function rollShopOffers(state) {
  state.shop.offers = [];
  for (let i = 0; i < SHOP.offerCount; i++) {
    const gun = generateGun({ seed: next(state.rng), level: state.tier, forced: { type: rollGunType(state.rng), quality: rollQuality(state.rng, 'shop') } });
    gun.id = nextId(state);
    gun.source = 'shop';
    state.shop.offers.push({ id: nextId(state), gun, price: shopPrice(gun, state.tier), sold: false });
  }
}

const shopOpen = (state) => state.mode === 'sandbox' || (state.wave && (state.wave.phase === 'intermission' || state.wave.phase === 'victory'));

export function buyOffer(state, p, offerId) {
  if (!shopOpen(state)) return fail(state, p, 'Shop is closed during combat');
  const o = state.shop.offers.find((x) => x.id === offerId);
  if (!o || o.sold) return;
  if (p.tickets < o.price) return fail(state, p, 'Not enough tickets');
  p.tickets -= o.price;
  o.sold = true;
  spawnGunPickup(state, o.gun, { x: p.pos.x - Math.sin(p.yaw) * 2, z: p.pos.z - Math.cos(p.yaw) * 2 }, 'shop');
  emit(state, 'purchase', { playerId: p.id, item: 'gun', price: o.price });
}

export function rerollShop(state, p) {
  if (!shopOpen(state)) return;
  const price = SHOP.rerollBase + SHOP.rerollStep * state.shop.rerolls;
  if (p.tickets < price) return fail(state, p, 'Not enough tickets');
  p.tickets -= price;
  state.shop.rerolls++;
  rollShopOffers(state);
  emit(state, 'purchase', { playerId: p.id, item: 'reroll', price });
}

export function sellGun(state, p, slot) {
  if (!shopOpen(state)) return fail(state, p, 'Shop is closed during combat');
  const g = p.guns[slot];
  if (!g || p.guns.filter(Boolean).length <= 1) return fail(state, p, "Can't sell your last gun");
  const v = sellValue(g);
  p.tickets += v;
  state.run.ticketsEarned += v;
  p.guns[slot] = null;
  ensureActiveGun(p);
  emit(state, 'sold', { playerId: p.id, gunId: g.id, value: v });
}

export function vend(state, p) {
  if (!shopOpen(state)) return;
  if (p.tickets < SHOP.vendPrice) return fail(state, p, 'Not enough tickets');
  p.tickets -= SHOP.vendPrice;
  const o = weighted(state.rng, SHOP.vendOutcomes).id;
  const spot = { x: p.pos.x - Math.sin(p.yaw) * 2, z: p.pos.z - Math.cos(p.yaw) * 2 };
  let detail = '';
  if (o === 'gun') {
    const gun = generateGun({ seed: next(state.rng), level: state.tier, forced: { type: rollGunType(state.rng), quality: rollQuality(state.rng, 'vending') } });
    gun.id = nextId(state);
    spawnGunPickup(state, gun, spot, 'vending');
    detail = `${gun.quality} ${gun.type}`;
  } else if (o === 'resources') {
    p.resources.scrap += 20;
    const spec = ['springs', 'goo', 'plating'][Math.floor(float(state.rng) * 3)];
    p.resources[spec] += 8;
    detail = `20 Scrap + 8 ${spec}`;
  } else if (o === 'jackpot') {
    p.tickets += 60; detail = '60 tickets';
  } else {
    healPlayer(p, 1); detail = 'Rubber Chicken';
  }
  emit(state, 'vend', { playerId: p.id, outcome: o, detail });
}

export function buyUpgrade(state, p, id) {
  if (!shopOpen(state)) return;
  const def = SHOP.upgrades.find((u) => u.id === id);
  const up = state.shop.upgrades;
  const rank = id === 'slot4' ? (up.slot4 ? 1 : 0) : up[id];
  if (!def || rank >= def.prices.length) return fail(state, p, 'Maxed out');
  const price = def.prices[rank];
  if (p.tickets < price) return fail(state, p, 'Not enough tickets');
  p.tickets -= price;
  if (id === 'slot4') { up.slot4 = true; p.unlockedSlots = 4; } else up[id]++;
  applySkillPassives(state, p);
  if (id === 'shieldCap') p.shield = p.maxShield;
  emit(state, 'purchase', { playerId: p.id, item: id, price });
}

export function buySupply(state, p, id) {
  if (!shopOpen(state)) return;
  const def = SHOP.supplies.find((s) => s.id === id);
  if (!def) return;
  if (p.tickets < def.price) return fail(state, p, 'Not enough tickets');
  if (id === 'medkit' && p.medkits >= TUNING.medkitCarry) return fail(state, p, 'Medkits full');
  p.tickets -= def.price;
  if (id === 'ammoRefill') for (const k of Object.keys(p.ammo)) p.ammo[k] = p.ammoCap[k];
  if (id === 'medkit') p.medkits++;
  emit(state, 'purchase', { playerId: p.id, item: id, price: def.price });
}

export { RES_IDS, range };
