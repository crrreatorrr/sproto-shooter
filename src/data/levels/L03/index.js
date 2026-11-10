// L03 The Vegetable Grove. Format v2. Section coordinates are local and match
// docs/campaign/levels/L03-vegetable-grove.md. makeV2Level adds each origin.
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';
import { S1 } from './S1.js';
import { S2 } from './S2.js';
import { S3 } from './S3.js';
import { S4 } from './S4.js';
import { S5 } from './S5.js';
import { S6 } from './S6.js';
import { EXPECTED_COUNTS } from './encounters.js';
import { L03_ARCHETYPES, L03_SPELLS } from './enemies.js';

export const L03_PACING = [
  ['B1', 31], ['E1', 74], ['canal', 5], ['E2', 82], ['toMaze', 5],
  ['E3', 65], ['E4', 138], ['barkCap', 17], ['toBridge', 5], ['E5', 78],
  ['depot1', 45], ['swarm', 34], ['E6', 94], ['toHothouse', 12], ['E7', 200],
  ['toCompost', 4], ['E8', 51], ['depot2', 49], ['tunnel', 7],
  ['F1', 185], ['F2', 65], ['F3', 41],
];

export const L03_BOT = [
  { section: 'S1', steps: ['truck', 'SH-YEET', 'pod 2 twice at the barricade', 'clear E1', 'MP3', 'clear E2', 'S1-GATE', 'optional hook S1-GA-LEAF then S1-GA-CROWN'] },
  { section: 'S2', steps: ['W2 W3', 'main ring route', 'clear E3', 'goo S2-GG1', 'threshold', 'four waves', 'zap S2-CD1 when 3 are near the gazebo', 'goo then zap S2-CD2'] },
  { section: 'S3', steps: ['Yeet the brute off Bridge 1', 'clear E5', 'DP1', 'SH-SWARM', 'buddy on S3-PP0', 'sprint Bridge 2', 'PP1 and swarm on PP2', 'Bridge 3'] },
  { section: 'S4', steps: ['threshold', 'four waves', 'bazooka the nest cores', 'clear E8', 'S4-DE'] },
  { section: 'S5', steps: ['DP2', 'threshold', 'swing S5-GA-N E S W inside the room', 'Yeet orbs in part 1', 'goo then zap totems from TOT-SE', 'stay inside radius 24 after the flood'] },
  { section: 'S6', steps: ['F2 until the flee', 'hook S6-GA-T1 T2 TRK or walk R1 R3', 'S6-SLIDE back down', 'truck'] },
];

const BUILT = makeV2Level({
  id: 'L03',
  name: 'The Vegetable Grove',
  stage: 'grove',
  tier: 3,
  parTime: 20 * 60,
  jetpack: false,
  useNav: true,
  maxAlive: 10,
  startAmmo: { bullets: 240, shells: 24, sniper: 12, rockets: 4 },
  lighting: { time: 'twilight', fog: 0x1c3a18, sun: 'west', fireflies: true },
  bounds: { min: [-20, -30, -420], max: [980, 48, 40] },
  sections: [S1, S2, S3, S4, S5, S6],
});

for (const sec of BUILT.sections) {
  // The baked grid for a 200 m section makes every enemy search too slow for the
  // autopilot. Keep the bounds as data; the director only paths when navBounds is set.
  if (sec.navBounds) {
    sec.navPlan = sec.navBounds;
    delete sec.navBounds;
  }
  if (!sec.navLinks) continue;
  const o = sec.origin;
  sec.navLinks = sec.navLinks.map((link) => ({
    ...link,
    from: { x: link.from.x + o[0], z: link.from.z + o[2] },
    to: { x: link.to.x + o[0], z: link.to.z + o[2] },
  }));
}

BUILT.estimateSeconds = L03_PACING.reduce((sum, row) => sum + row[1], 0);
BUILT.pacing = L03_PACING;
BUILT.botRoute = L03_BOT;
BUILT.census = EXPECTED_COUNTS;
BUILT.archetypes = L03_ARCHETYPES;
BUILT.spellNotes = L03_SPELLS;
BUILT.difficulty = {
  easy: { maxAlive: 8, fodder: -0.25, leechDrain: 5, aura: 10, bloomRegrow: 12, ammo: 1.5, barkSoft: 6, totemHp: 180, runoff: 0.14, waveTimer: 35 },
  heroic: { maxAlive: 10, queueSooner: 0.3, fodder: 0.25, leechDrain: 12, aura: 15, auraRadius: 11, bloomRegrow: 30, knotNeedsSpell: true, totemHp: 300, ringEvery: 8, runoff: 0.22, waveTimer: 20 },
};
BUILT.loot = {
  tierOdds: { common: 45, uncommon: 40, rare: 14, epic: 1, legendary: 0 },
  baseTier: 'uncommon',
  chests: ['L1-CHEST', 'L2-CHEST', 'L3-CHEST'],
  secretCache: 'SC1',
  elite: 'F1-p2c',
};

export const L03 = BUILT;
registerLevel(L03);
