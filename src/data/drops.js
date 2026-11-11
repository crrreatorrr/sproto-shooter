// Drop tables (PLAN §4.13, §7.6)
// Arena bosses drop a boss weapon some of the time (bossGun chance), at the boss table's own quality
// (shift 0), so it is one find among several. Campaign bosses have no table here and keep the
// always-drops rule in sim/drops.js.
export const DROP_TABLES = {
  midget: [
    { kind: 'resource', resId: 'scrap', min: 1, max: 3, chance: 1 },
    { kind: 'resource', resId: 'springs', min: 1, max: 2, chance: 1 },
    { kind: 'health', chance: 0.08 },
    { kind: 'ammo', chance: 0.4 },
    { kind: 'gun', chance: 0.02, table: 'enemyGun' },
    { kind: 'tickets', min: 1, max: 1, chance: 1 },
  ],
  flyingMidget: [
    { kind: 'resource', resId: 'scrap', min: 1, max: 2, chance: 1 },
    { kind: 'resource', resId: 'springs', min: 2, max: 3, chance: 1 },
    { kind: 'health', chance: 0.1 },
    { kind: 'ammo', chance: 0.5 },
    { kind: 'gun', chance: 0.04, table: 'enemyGun' },
    { kind: 'tickets', min: 2, max: 2, chance: 1 },
  ],
  obama: [
    { kind: 'resource', resId: 'scrap', min: 3, max: 5, chance: 1 },
    { kind: 'resource', resId: 'goo', min: 2, max: 3, chance: 1 },
    { kind: 'health', chance: 0.18 },
    { kind: 'ammo', chance: 0.7 },
    { kind: 'gun', chance: 0.06, table: 'enemyGun' },
    { kind: 'tickets', min: 2, max: 2, chance: 1 },
  ],
  bigObama: [
    { kind: 'resource', resId: 'scrap', min: 5, max: 8, chance: 1 },
    { kind: 'resource', resId: 'plating', min: 3, max: 5, chance: 1 },
    { kind: 'health', chance: 0.25 },
    { kind: 'ammo', chance: 0.85 },
    { kind: 'gun', chance: 0.1, table: 'enemyGun' },
    { kind: 'tickets', min: 4, max: 4, chance: 1 },
  ],
  dummy: [],
  carMonster: [
    { kind: 'resource', resId: 'scrap', min: 25, max: 25, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.5, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
  moleMonster: [
    { kind: 'resource', resId: 'scrap', min: 25, max: 25, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.5, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
  robotLaser: [
    { kind: 'resource', resId: 'scrap', min: 3, max: 5, chance: 1 },
    { kind: 'resource', resId: 'goo', min: 2, max: 3, chance: 1 },
    { kind: 'health', chance: 0.18 },
    { kind: 'ammo', chance: 0.7 },
    { kind: 'gun', chance: 0.06, table: 'enemyGun' },
    { kind: 'tickets', min: 2, max: 2, chance: 1 },
  ],
  robotShooter: [
    { kind: 'resource', resId: 'scrap', min: 5, max: 8, chance: 1 },
    { kind: 'resource', resId: 'plating', min: 3, max: 5, chance: 1 },
    { kind: 'health', chance: 0.25 },
    { kind: 'ammo', chance: 0.85 },
    { kind: 'gun', chance: 0.1, table: 'enemyGun' },
    { kind: 'tickets', min: 4, max: 4, chance: 1 },
  ],
  megaSproto: [
    { kind: 'resource', resId: 'scrap', min: 25, max: 25, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.5, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
  monster: [
    { kind: 'resource', resId: 'scrap', min: 25, max: 25, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.5, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
  sprotoBeast: [
    { kind: 'resource', resId: 'scrap', min: 25, max: 25, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.5, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
  dragon: [
    { kind: 'resource', resId: 'scrap', min: 20, max: 20, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.25, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 45, max: 45, chance: 1 },
  ],
  hexAuditor: [
    { kind: 'resource', resId: 'scrap', min: 20, max: 20, chance: 1 },
    { kind: 'resource', resId: 'bossCore', min: 1, max: 1, chance: 1, noScale: true },
    { kind: 'resource', resId: 'manaCrystal', min: 2, max: 2, chance: 1, noScale: true },
    { kind: 'bigHealth', count: 2, chance: 1 },
    { kind: 'ammo', count: 3, chance: 1 },
    { kind: 'gun', count: 2, chance: 1, table: 'boss' },
    { kind: 'bossGun', chance: 0.5, table: 'boss', shift: 0 }, // sometimes a Ray Gun or Big Bullets
    { kind: 'tickets', min: 60, max: 60, chance: 1 },
  ],
};

for (const id of Object.keys(DROP_TABLES)) {
  DROP_TABLES[id] = DROP_TABLES[id].filter((entry) => entry.kind !== 'resource');
}

// quality weights C U R E L
export const QUALITY_TABLES = {
  enemyGun: [55, 27, 12, 5, 1],
  boss: [0, 0, 40, 35, 25],
  shop: [35, 35, 20, 9, 1],
  vending: [40, 30, 18, 9, 3],
};

export const RESOURCES = [
  { id: 'scrap', name: 'Scrap', color: '#b8b8b8', icon: '⚙' },
  { id: 'springs', name: 'Springs', color: '#ff5ec4', icon: '➰' }, // from Midgets
  { id: 'goo', name: 'Goo', color: '#7fd34e', icon: '●' }, // from Bitcoin Obamas
  { id: 'plating', name: 'Plating', color: '#6a7bd1', icon: '▣' }, // from Big Bitcoin Obamas
  { id: 'bossCore', name: 'Boss Core', color: '#ff3b3b', icon: '◆' },
  { id: 'manaCrystal', name: 'Mana Crystal', color: '#b07cff', icon: '✦' },
];
export const RES_IDS = RESOURCES.map((r) => r.id);
