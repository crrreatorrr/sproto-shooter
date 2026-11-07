// Drop tables (PLAN §4.13, §7.6)
export const DROP_TABLES = {
  grunt: [
    { kind: 'resource', resId: 'scrap', min: 4, max: 7, chance: 1 },
    { kind: 'health', chance: 0.2 },
    { kind: 'ammo', chance: 0.35 },
    { kind: 'gun', chance: 0.04, table: 'enemyGun' },
    { kind: 'tickets', min: 1, max: 1, chance: 1 },
  ],
  spitter: [
    { kind: 'resource', resId: 'scrap', min: 2, max: 3, chance: 1 },
    { kind: 'resource', resId: 'goo', min: 2, max: 3, chance: 1 },
    { kind: 'health', chance: 0.15 },
    { kind: 'ammo', chance: 0.35 },
    { kind: 'gun', chance: 0.05, table: 'enemyGun' },
    { kind: 'tickets', min: 1, max: 1, chance: 1 },
  ],
  bouncer: [
    { kind: 'resource', resId: 'scrap', min: 2, max: 3, chance: 1 },
    { kind: 'resource', resId: 'springs', min: 2, max: 4, chance: 1 },
    { kind: 'health', chance: 0.18 },
    { kind: 'ammo', chance: 0.35 },
    { kind: 'gun', chance: 0.05, table: 'enemyGun' },
    { kind: 'tickets', min: 2, max: 2, chance: 1 },
  ],
  tank: [
    { kind: 'resource', resId: 'scrap', min: 5, max: 8, chance: 1 },
    { kind: 'resource', resId: 'plating', min: 3, max: 5, chance: 1 },
    { kind: 'health', chance: 0.25 },
    { kind: 'ammo', chance: 0.5 },
    { kind: 'gun', chance: 0.1, table: 'enemyGun' },
    { kind: 'tickets', min: 4, max: 4, chance: 1 },
  ],
  dummy: [],
  megaSproto: [
    { kind: 'resource', resId: 'scrap', min: 25, max: 25, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
  hexAuditor: [
    { kind: 'resource', resId: 'scrap', min: 20, max: 20, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'resource', resId: 'manaCrystal', min: 2, max: 2, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
};

// quality weights C U R E L
export const QUALITY_TABLES = {
  enemyGun: [55, 27, 12, 5, 1],
  boss: [0, 0, 40, 35, 25],
  shop: [35, 35, 20, 9, 1],
  vending: [40, 30, 18, 9, 3],
};

export const RESOURCES = [
  { id: 'scrap', name: 'Scrap', color: '#b8b8b8', icon: '⚙' },
  { id: 'springs', name: 'Springs', color: '#ff5ec4', icon: '➰' },
  { id: 'goo', name: 'Goo', color: '#7fd34e', icon: '●' },
  { id: 'plating', name: 'Plating', color: '#6a7bd1', icon: '▣' },
  { id: 'bossCore', name: 'Boss Core', color: '#ff3b3b', icon: '◆' },
  { id: 'manaCrystal', name: 'Mana Crystal', color: '#b07cff', icon: '✦' },
];
export const RES_IDS = RESOURCES.map((r) => r.id);
