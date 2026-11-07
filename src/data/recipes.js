// @ts-check
// Crafting recipes (PLAN §3.11, §7.7)
const QUAL = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const LEVEL_REQ = [1, 3, 5, 7, 10];
const XP = [60, 120, 200, 320, 500];
const OPTS = [
  { chooseElement: false, choosePart: false, arcane: false, wacky: false },
  { chooseElement: false, choosePart: false, arcane: false, wacky: false },
  { chooseElement: true, choosePart: false, arcane: true, wacky: false },
  { chooseElement: true, choosePart: true, arcane: true, wacky: false },
  { chooseElement: true, choosePart: true, arcane: true, wacky: true },
];
// [scrap, springs, goo, plating, bossCore]
const COSTS = {
  mg: [[20], [40, 10], [60, 20, 10], [100, 30, 0, 15], [150, 40, 0, 0, 2]],
  shotgun: [[30, 0, 5], [55, 12, 5], [80, 20, 15], [125, 30, 0, 20], [180, 45, 0, 0, 2]],
  sniper: [[30, 5], [55, 15], [80, 25, 10], [125, 35, 0, 20], [180, 50, 0, 0, 2]],
  bazooka: [[40, 0, 0, 5, 1], [70, 15, 0, 8, 1], [100, 20, 15, 10, 1], [150, 35, 0, 25, 1], [220, 50, 0, 30, 3]],
};
const KEYS = ['scrap', 'springs', 'goo', 'plating', 'bossCore'];
const toCost = (arr) => Object.fromEntries(arr.map((v, i) => [KEYS[i], v]).filter(([, v]) => v > 0));

export const GUN_RECIPES = [];
for (const type of Object.keys(COSTS)) {
  for (let t = 0; t < 5; t++) {
    GUN_RECIPES.push({
      id: `${type}_t${t + 1}`, category: 'gun', gunType: type, tier: t + 1, quality: QUAL[t],
      cost: toCost(COSTS[type][t]), craftingLevel: LEVEL_REQ[t], craftTime: 1.5, xp: XP[t], options: OPTS[t],
    });
  }
}

export const ITEM_RECIPES = [
  { id: 'ammo_bullets', category: 'ammo', name: 'Bullets ×45', ammoType: 'bullets', amount: 45, cost: { scrap: 5 }, craftingLevel: 1, craftTime: 0.5, xp: 8 },
  { id: 'ammo_shells', category: 'ammo', name: 'Shells ×8', ammoType: 'shells', amount: 8, cost: { scrap: 8 }, craftingLevel: 1, craftTime: 0.5, xp: 8 },
  { id: 'ammo_sniper', category: 'ammo', name: 'Sniper rounds ×5', ammoType: 'sniper', amount: 5, cost: { scrap: 10 }, craftingLevel: 1, craftTime: 0.5, xp: 8 },
  { id: 'ammo_rockets', category: 'ammo', name: 'Rockets ×2', ammoType: 'rockets', amount: 2, cost: { scrap: 15, plating: 2 }, craftingLevel: 1, craftTime: 0.5, xp: 8 },
  { id: 'medkit', category: 'item', name: 'Medkit', cost: { scrap: 10, goo: 5 }, craftingLevel: 1, craftTime: 0.8, xp: 10 },
];

export const ARCANE_COST = { manaCrystal: 1 };
export const REROLL_COST = { scrap: 40, goo: 10 };
export const REROLL_LEVEL = 10;
export const SALVAGE_LEVEL = 8;
export const SALVAGE_XP = 15;
export const REROLL_XP = 30;

export const RECIPES = [...GUN_RECIPES, ...ITEM_RECIPES];
export const RECIPES_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
