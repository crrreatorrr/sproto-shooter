// Gun generation (seeded, fixed draw order), effective stats, comparison, value. PLAN §4.2–4.3
import { createRng, float, range, weighted, pickWeightedByFloat } from '../core/rng.js';
import {
  GUN_TYPES, GUN_TYPES_BY_ID, QUALITIES, QUALITIES_BY_ID, MANUFACTURERS, MANUFACTURERS_BY_ID,
  PARTS_BY_ID, PARTS_BY_SLOT, SLOTS, ELEMENTS, WACKY, STAT_KEYS, NAME_BITS,
} from '../data/guns.js';
import { SHOP } from '../data/shop.js';

const ELEMENTS_NO_NONE = ELEMENTS.filter((e) => e.id !== 'none');
export const levelMult = (level) => Math.pow(1.13, level - 1);

function applyMods(s, def) {
  for (const [k, m] of Object.entries(def.mods || {})) if (k in s) s[k] *= m;
  for (const [k, a] of Object.entries(def.add || {})) if (k in s) s[k] += a;
}

function shuffle4(r) {
  const a = SLOTS.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(float(r) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampStats(s) {
  s.fireRate = Math.max(0.2, s.fireRate);
  s.spread = Math.max(0, s.spread);
  s.adsSpread = Math.max(0, s.adsSpread);
  s.magSize = Math.max(1, Math.round(s.magSize));
  s.reloadTime = Math.max(0.3, s.reloadTime);
  s.elementChance = Math.min(1, Math.max(0, s.elementChance));
  s.critChance = Math.min(0.6, Math.max(0, s.critChance));
}

function roundStats(s) {
  for (const k of Object.keys(s)) {
    if (k === 'magSize' || k === 'pellets' || k === 'pierce') s[k] = Math.round(s[k]);
    else s[k] = Math.round(s[k] * 1000) / 1000;
  }
}

export const REROLLABLE = ['damage', 'fireRate', 'spread', 'reloadTime', 'critMult', 'elementChance'];

function applyReroll(s, rr, seed) {
  const r = createRng((seed ^ rr.salt) >>> 0);
  // reroll a stat to a new multiplier in [0.92, 1.18] (favours improvements)
  const m = range(r, 0.92, 1.18);
  if (rr.stat === 'spread' || rr.stat === 'reloadTime') s[rr.stat] /= m;
  else s[rr.stat] *= m;
}

export function makeName(type, man, element, nameDraws) {
  const typeBits = NAME_BITS[type];
  const elBits = NAME_BITS.element[element];
  const el = elBits[Math.floor(nameDraws[0] * elBits.length)];
  const noun = typeBits[Math.floor(nameDraws[1] * typeBits.length)];
  return [man.name, el, noun].filter(Boolean).join(' ');
}

/** Pure + reproducible from args. RNG draw order never depends on `forced`. */
export function generateGun({ seed, level = 1, forced = {}, arcane = false, rerolls = [] }) {
  const r = createRng(seed >>> 0);
  const dType = weighted(r, GUN_TYPES);
  const dQual = weighted(r, QUALITIES);
  const dMan = weighted(r, MANUFACTURERS);
  const slotOrder = shuffle4(r);
  const partDraws = SLOTS.map(() => float(r));
  const dElem = weighted(r, ELEMENTS);
  const dElemAlt = weighted(r, ELEMENTS_NO_NONE);
  const dWacky = float(r);
  const jitter = STAT_KEYS.map(() => range(r, -0.05, 0.05));
  const nameDraws = [float(r), float(r)];

  const type = forced.type ?? dType.id;
  const quality = forced.quality ?? dQual.id;
  const man = MANUFACTURERS_BY_ID[forced.manufacturer ?? dMan.id];
  const q = QUALITIES_BY_ID[quality];
  const parts = { barrel: 'stock', grip: 'stock', mag: 'stock', scope: 'stock' };
  for (let i = 0; i < q.partSlots; i++) {
    const slot = slotOrder[i];
    const opts = PARTS_BY_SLOT[slot];
    parts[slot] = opts[Math.floor(partDraws[SLOTS.indexOf(slot)] * opts.length)].id;
  }
  if (forced.parts) Object.assign(parts, forced.parts);
  if (forced.part) parts[forced.part.slot] = forced.part.id;
  const element = forced.element ?? (man.alwaysElement && dElem.id === 'none' ? dElemAlt.id : dElem.id);
  let wacky = null;
  if (quality === 'legendary') {
    const pool = WACKY.filter((w) => w.allowedTypes.includes(type)).map((w) => ({ ...w, weight: 1 }));
    wacky = forced.wacky ?? pickWeightedByFloat(pool, dWacky).id;
  }

  const def = GUN_TYPES_BY_ID[type];
  const s = { ...def.base };
  applyMods(s, man);
  for (const slot of SLOTS) if (parts[slot] !== 'stock') applyMods(s, PARTS_BY_ID[parts[slot]]);
  const lm = levelMult(level);
  s.damage *= q.damageMult * lm;
  if (s.splashDamage) s.splashDamage *= q.damageMult * lm;
  s.magSize = s.magSize * q.magMult;
  s.reloadTime *= q.reloadMult;
  s.spread *= q.spreadMult;
  s.adsSpread *= q.spreadMult;
  STAT_KEYS.forEach((k, i) => { if (k in s) s[k] *= 1 + jitter[i]; });
  if (def.base.projectileSpeed === 0) s.projectileSpeed = 0;
  if (element === 'none') s.elementChance = 0;
  if (arcane && element !== 'none') s.elementChance += 0.2;
  for (const rr of rerolls) applyReroll(s, rr, seed);
  clampStats(s);
  roundStats(s);

  return {
    id: 0, seed: seed >>> 0, level, type, quality, manufacturer: man.id, element, parts, wacky, arcane, rerolls,
    name: makeName(type, man, element, nameDraws), ammoType: def.ammoType, stats: s, ammoInMag: s.magSize, source: 'drop',
  };
}

/** Regenerate a gun keeping identity (used after reroll). */
export function regenerate(gun, extra = {}) {
  const g = generateGun({
    seed: gun.seed, level: gun.level,
    forced: { type: gun.type, quality: gun.quality, manufacturer: gun.manufacturer, element: gun.element, wacky: gun.wacky, parts: gun.parts },
    arcane: gun.arcane, rerolls: extra.rerolls ?? gun.rerolls,
  });
  return { ...g, id: gun.id, source: gun.source, ammoInMag: Math.min(gun.ammoInMag, g.stats.magSize) };
}

/** Stats after player skills/perks/buffs. */
export function effectiveGunStats(gun, player) {
  const s = gun.stats;
  const gs = player.skills.gunslinger.level;
  const stacks = player.buffs.killFrenzy.stacks;
  const mv = player.move.mode;
  let movePenalty = 1;
  if (!player.onGround) movePenalty = 2.0;
  else if (mv === 'slide') movePenalty = 0.8;
  else if (Math.hypot(player.vel.x, player.vel.z) > 1) movePenalty = 1.4;
  const skillMult = Math.max(0.4, 1 - 0.04 * (gs - 1));
  return {
    ...s,
    damage: s.damage * (1 + 0.03 * stacks),
    splashDamage: s.splashDamage * (1 + 0.03 * stacks),
    fireRate: s.fireRate * (1 + 0.04 * stacks),
    spread: (player.zooming ? s.adsSpread : s.spread) * movePenalty * skillMult,
    recoil: s.recoil * skillMult,
    recoilYaw: s.recoilYaw * skillMult,
    reloadTime: s.reloadTime * (1 - 0.03 * (gs - 1)),
    swapTime: player.perks.fastHands ? 0.2 : s.swapTime,
    critMult: s.critMult + (player.perks.deadeye ? 0.5 : 0),
    ammoSaveChance: player.perks.bottomlessMags ? 0.15 : 0,
  };
}

export const COMPARE_STATS = [
  { key: 'damage', label: 'Damage', better: 'higher' },
  { key: 'fireRate', label: 'Fire rate', better: 'higher' },
  { key: 'spread', label: 'Spread', better: 'lower' },
  { key: 'magSize', label: 'Magazine', better: 'higher' },
  { key: 'reloadTime', label: 'Reload', better: 'lower' },
  { key: 'critMult', label: 'Weak-spot ×', better: 'higher' },
  { key: 'elementChance', label: 'Element %', better: 'higher' },
];

export const dpsOf = (g) => g.stats.damage * g.stats.pellets * g.stats.fireRate + g.stats.splashDamage * g.stats.fireRate;

export function compareGuns(a, b) {
  return COMPARE_STATS.map(({ key, label, better }) => {
    const va = a.stats[key];
    const vb = b ? b.stats[key] : null;
    let verdict = 'same';
    if (vb != null && Math.abs(va - vb) > 1e-6) {
      const higher = va > vb;
      verdict = (better === 'higher') === higher ? 'better' : 'worse';
    }
    return { key, label, value: va, other: vb, verdict };
  });
}

export function sellValue(gun) {
  const q = QUALITIES_BY_ID[gun.quality];
  return Math.round(SHOP.sellBase * q.sellMult * SHOP.typePremium[gun.type] * (1 + 0.1 * (gun.level - 1)));
}

export function shopPrice(gun, tier) {
  const q = QUALITIES_BY_ID[gun.quality];
  return Math.round(SHOP.basePrice[gun.type] * q.priceMult * (1 + 0.15 * (tier - 1)));
}

export function salvageYield(gun) {
  const q = QUALITIES_BY_ID[gun.quality].idx;
  const m = GUN_TYPES_BY_ID[gun.type].bossOnly ? 2.5 : gun.type === 'bazooka' ? 1.5 : 1;
  const y = {
    scrap: Math.round((5 + 6 * q + gun.level) * m),
    springs: Math.round(2 * q * m),
    goo: gun.element !== 'none' ? Math.round(3 * m) : 0,
    plating: q >= 3 ? Math.round(5 * m) : 0,
  };
  return Object.fromEntries(Object.entries(y).filter(([, v]) => v > 0));
}
