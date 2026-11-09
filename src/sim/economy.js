// Crafting (weapon boxes), shop, vending, gun pickup/sell. PLAN §3.11, §7.7, §7.9
import { SHOP } from '../data/shop.js';
import { TUNING } from '../data/tuning.js';
import { weighted, next } from '../core/rng.js';
import { emit } from './events.js';
import { generateGun, sellValue, shopPrice } from './guns.js';
import { LEGENDARY_SLOT, slotUsable } from '../data/guns.js';
import { rollQuality, rollGunType, spawnGunPickup } from './drops.js';
import { applySkillPassives } from './progression.js';
import { nextId, createPickup } from './state.js';
import { healPlayer } from './combat.js';

export const canAfford = () => false;
export const mergeCost = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = (o[k] || 0) + v; return o; };

export function recipeUnlocked() {
  return false;
}

export function nearBox(state, p) {
  for (const b of state.weaponBoxes) if (Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z) <= b.interactRadius) return b;
  return null;
}

/** Returns an error string. Crafting is not in the game. */
export function validateCraft() {
  return 'Crafting is gone';
}

export function startCraft(state, p) {
  return fail(state, p, 'Crafting is gone');
}

export function crafting() {}

export function salvage(state, p) {
  return fail(state, p, 'Crafting is gone');
}

export function reroll(state, p) {
  return fail(state, p, 'Crafting is gone');
}

function fail(state, p, reason) { emit(state, 'actionFailed', { playerId: p.id, reason }); return false; }

export function ensureActiveGun(p) {
  if (p.guns[p.activeSlot]) return;
  const i = p.guns.findIndex((g, idx) => g && slotUsable(p, idx));
  if (i >= 0) p.activeSlot = i;
}

/**
 * Put a gun in an empty slot, else swap with the active gun (dropping the old one). Legendary guns go to the
 * legendary slot (key L) first, swapping out the legendary already there; only legendaries ever go there.
 */
export function pickupGun(state, p, pickupId) {
  const k = state.pickups.find((x) => x.id === pickupId && !x.dead && x.kind === 'gun');
  if (!k) return;
  if (Math.hypot(p.pos.x - k.pos.x, p.pos.z - k.pos.z) > TUNING.gunPickupRadius + 1) return;
  const gun = k.gun;
  const legendary = gun.quality === 'legendary';
  let slot = -1;
  if (legendary && !p.guns[LEGENDARY_SLOT]) slot = LEGENDARY_SLOT;
  else for (let i = 0; i < p.unlockedSlots; i++) if (!p.guns[i]) { slot = i; break; }
  if (slot === -1 && legendary) slot = LEGENDARY_SLOT; // all full: a legendary swaps with the legendary
  k.dead = true;
  if (slot === -1 || p.guns[slot]) {
    if (slot === -1) slot = p.activeSlot === LEGENDARY_SLOT ? 0 : p.activeSlot; // a regular gun never replaces the legendary
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
    const carried = p.guns.filter((g) => g);
    const t = carried.length ? carried[0].ammoType : 'bullets';
    const add = TUNING.ammoDrop[t] || 0;
    p.ammo[t] = Math.min(p.ammoCap[t], p.ammo[t] + add);
    detail = `${add} ${t}`;
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
