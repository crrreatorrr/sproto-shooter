// Gun definitions: types, qualities, manufacturers, parts, elements, wacky perks (PLAN §3.10, §7.2)

const B = (o) => ({
  damage: 0, fireRate: 1, spread: 1, adsSpread: 0.5, magSize: 1, reloadTime: 2, projectileSpeed: 0,
  critMult: 2, critChance: 0.05, elementChance: 0.1, pellets: 1, splashRadius: 0, splashDamage: 0,
  recoil: 1, recoilYaw: 0.2, swapTime: 0.5, zoomFov: 70, pierce: 0, ...o,
});

export const GUN_TYPES = [
  { id: 'mg', name: 'Machine Gun', short: 'MG', ammoType: 'bullets', weight: 60, fireMode: 'auto',
    base: B({ damage: 9, fireRate: 10, spread: 1.2, adsSpread: 0.45, magSize: 36, reloadTime: 1.8, critMult: 2.0, critChance: 0.05, elementChance: 0.10, recoil: 0.35, recoilYaw: 0.15, swapTime: 0.5, zoomFov: 70 }) },
  { id: 'shotgun', name: 'Shotgun', short: 'SG', ammoType: 'shells', weight: 17, fireMode: 'auto',
    base: B({ damage: 8, pellets: 9, fireRate: 1.2, spread: 6.0, adsSpread: 4.5, magSize: 6, reloadTime: 2.4, critMult: 2.0, critChance: 0.03, elementChance: 0.06, recoil: 3.5, recoilYaw: 1.0, swapTime: 0.5, zoomFov: 75 }) },
  { id: 'sniper', name: 'Sniper', short: 'SN', ammoType: 'sniper', weight: 17, fireMode: 'auto',
    base: B({ damage: 85, fireRate: 0.8, spread: 3.0, adsSpread: 0, magSize: 4, reloadTime: 2.6, critMult: 3.0, critChance: 0.08, elementChance: 0.35, recoil: 5.0, recoilYaw: 0.8, swapTime: 0.6, zoomFov: 25, pierce: 1 }) },
  { id: 'bazooka', name: 'Bazooka', short: 'BZ', ammoType: 'rockets', weight: 6, fireMode: 'auto',
    base: B({ damage: 140, fireRate: 0.6, spread: 0.5, adsSpread: 0.2, magSize: 1, reloadTime: 2.2, projectileSpeed: 28, critMult: 1.5, critChance: 0, elementChance: 0.5, splashRadius: 4.0, splashDamage: 110, recoil: 4.0, recoilYaw: 0.5, swapTime: 0.7, zoomFov: 70 }) },
];

export const QUALITIES = [
  { id: 'common', idx: 0, name: 'Common', color: '#cfcfcf', weight: 55, damageMult: 1.0, magMult: 1.0, reloadMult: 1.0, spreadMult: 1.0, partSlots: 1, priceMult: 1.0, sellMult: 1.0 },
  { id: 'uncommon', idx: 1, name: 'Uncommon', color: '#4cd964', weight: 27, damageMult: 1.12, magMult: 1.1, reloadMult: 0.97, spreadMult: 0.95, partSlots: 2, priceMult: 1.6, sellMult: 1.6 },
  { id: 'rare', idx: 2, name: 'Rare', color: '#3fa9ff', weight: 12, damageMult: 1.27, magMult: 1.15, reloadMult: 0.94, spreadMult: 0.9, partSlots: 3, priceMult: 2.6, sellMult: 2.6 },
  { id: 'epic', idx: 3, name: 'Epic', color: '#b05cff', weight: 5, damageMult: 1.45, magMult: 1.2, reloadMult: 0.9, spreadMult: 0.85, partSlots: 4, priceMult: 4.2, sellMult: 4.2 },
  { id: 'legendary', idx: 4, name: 'Legendary', color: '#ff9f1a', weight: 1, damageMult: 1.7, magMult: 1.3, reloadMult: 0.85, spreadMult: 0.8, partSlots: 4, priceMult: 7.0, sellMult: 7.0 },
];

export const MANUFACTURERS = [
  { id: 'blastco', name: 'Blastco', color: 0xd94a3a, weight: 1, mods: { damage: 1.15, fireRate: 0.9, recoil: 1.2 }, add: {}, quirk: 'Big boom, big kick' },
  { id: 'zippity', name: 'Zippity', color: 0x39ff88, weight: 1, mods: { fireRate: 1.2, magSize: 1.25, damage: 0.88, reloadTime: 0.85 }, add: {}, quirk: 'Brrrrrt' },
  { id: 'reliable', name: "Ol' Reliable", color: 0xa8794a, weight: 1, mods: { spread: 0.7, adsSpread: 0.7, recoil: 0.7, reloadTime: 1.1 }, add: { critMult: 0.3 }, quirk: 'Steady as a rock' },
  { id: 'gloop', name: 'Gloop Labs', color: 0x9b59ff, weight: 1, mods: { elementChance: 1.5, damage: 0.95 }, add: { elementChance: 0.05 }, alwaysElement: true, quirk: 'Always elemental' },
];

export const SLOTS = ['barrel', 'grip', 'mag', 'scope'];

export const PARTS = [
  { id: 'long', slot: 'barrel', name: 'Long Barrel', mods: { damage: 1.1, spread: 0.85, projectileSpeed: 1.1, fireRate: 0.95 }, add: {} },
  { id: 'short', slot: 'barrel', name: 'Short Barrel', mods: { fireRate: 1.1, spread: 1.25 }, add: {} },
  { id: 'ported', slot: 'barrel', name: 'Ported Barrel', mods: { recoil: 0.75 }, add: {} },
  { id: 'ergo', slot: 'grip', name: 'Ergo Grip', mods: { recoil: 0.8 }, add: {} },
  { id: 'quickdraw', slot: 'grip', name: 'Quickdraw Grip', mods: { swapTime: 0.75, reloadTime: 0.9 }, add: {} },
  { id: 'heavy', slot: 'grip', name: 'Heavy Grip', mods: { adsSpread: 0.7, recoil: 0.9, fireRate: 0.95 }, add: {} },
  { id: 'drum', slot: 'mag', name: 'Drum Mag', mods: { magSize: 1.5, reloadTime: 1.2 }, add: {} },
  { id: 'quick', slot: 'mag', name: 'Quick Mag', mods: { reloadTime: 0.75, magSize: 0.85 }, add: {} },
  { id: 'spicy', slot: 'mag', name: 'Spicy Mag', mods: {}, add: { elementChance: 0.1 } },
  { id: 'redDot', slot: 'scope', name: 'Red Dot', mods: { adsSpread: 0.8 }, add: {} },
  { id: 'longScope', slot: 'scope', name: 'Long Scope', mods: { zoomFov: 0.75 }, add: { critMult: 0.3 } },
  { id: 'lucky', slot: 'scope', name: 'Lucky Scope', mods: {}, add: { critChance: 0.05 } },
];

export const ELEMENTS = [
  { id: 'none', name: 'Plain', color: '#dddddd', weight: 50 },
  { id: 'fire', name: 'Fire', color: '#ff7a1a', weight: 17, proc: { kind: 'burn', dpsFrac: 0.25, duration: 3 } },
  { id: 'shock', name: 'Shock', color: '#4fe3ff', weight: 17, proc: { kind: 'chain', targets: 2, range: 5, dmgFrac: 0.5 } },
  { id: 'goo', name: 'Goo', color: '#9be33b', weight: 16, proc: { kind: 'slow', slow: 0.4, duration: 2.5 } },
];

export const WACKY = [
  { id: 'rubberDuck', name: 'Rubber Duckie', desc: 'Shots become bouncing rubber ducks.', allowedTypes: ['mg', 'shotgun', 'sniper'] },
  { id: 'yeetReload', name: 'Yeet Reload', desc: 'Reloading throws the gun as an explosive.', allowedTypes: ['mg', 'shotgun', 'sniper', 'bazooka'] },
  { id: 'tenthMega', name: 'Every Tenth', desc: 'Every 10th shot fires a giant mega bullet.', allowedTypes: ['mg', 'shotgun', 'sniper'] },
  { id: 'critSproto', name: 'Lil Buddy', desc: 'Weak-spot hits spawn a mini friendly Sproto.', allowedTypes: ['mg', 'shotgun', 'sniper', 'bazooka'] },
  { id: 'confettiKill', name: 'Party Popper', desc: 'Kills explode in damaging confetti.', allowedTypes: ['mg', 'shotgun', 'sniper', 'bazooka'] },
  { id: 'bigHead', name: 'Big Head Mode', desc: 'Enemies you hit get huge heads (bigger weak spots).', allowedTypes: ['mg', 'shotgun', 'sniper', 'bazooka'] },
];

export const NAME_BITS = {
  mg: ['Brrrt-o-Matic', 'Spray Sprout', 'Bullet Hose', 'Rattler'],
  shotgun: ['Boomstick', 'Door Knocker', 'Pellet Party', 'Splatterer'],
  sniper: ['Long Boi', 'Pokey Stick', 'Eyeball', 'Far Bonker'],
  bazooka: ['Big Yeet', 'Kaboomer', 'Rocket Pal', 'Sky Mail'],
  element: { none: ['', 'Trusty', 'Basic'], fire: ['Spicy', 'Toasty', 'Hot'], shock: ['Zappy', 'Buzzy', 'Static'], goo: ['Gloopy', 'Sticky', 'Slimy'] },
};

export const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
export const GUN_TYPES_BY_ID = byId(GUN_TYPES);
export const QUALITIES_BY_ID = byId(QUALITIES);
export const MANUFACTURERS_BY_ID = byId(MANUFACTURERS);
export const PARTS_BY_ID = byId(PARTS);
export const ELEMENTS_BY_ID = byId(ELEMENTS);
export const WACKY_BY_ID = byId(WACKY);
export const PARTS_BY_SLOT = Object.fromEntries(SLOTS.map((s) => [s, PARTS.filter((p) => p.slot === s)]));
export const STAT_KEYS = ['damage', 'fireRate', 'spread', 'magSize', 'reloadTime', 'projectileSpeed', 'critMult', 'elementChance'];
