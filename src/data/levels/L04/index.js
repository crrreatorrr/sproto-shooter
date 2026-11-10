// L04 The Blockchain Void. Format v2. Section coordinates are local and match
// docs/campaign/levels/L04-blockchain-void.md. makeV2Level adds each origin.
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';
import { S1 } from './S1.js';
import { S2 } from './S2.js';
import { S3 } from './S3.js';
import { S4 } from './S4.js';
import { S5 } from './S5.js';
import { SB } from './SB.js';
import { EXPECTED_COUNTS } from './encounters.js';
import { DUO, FLAK_POD, L04_FLYERS, L04_SPELLS } from './enemies.js';

export const L04_PACING = [
  ['S1-E1', 70.2],
  ['jetpack', 42],
  ['S1-E2', 70.4],
  ['S2-E3', 142.1],
  ['S2-E4', 79.1],
  ['depot-a', 65.5],
  ['S3-E5', 125.2],
  ['S4-E6', 75.6],
  ['S4-E7', 175],
  ['S5-E8', 125.5],
  ['depot-b', 56.8],
  ['SB-BOSS', 257.3],
];

export const L04_BOT = [
  { section: 'S1', steps: ['spawn', 'zap c1 from (28, 0, 60)', 'eb1', 'clear E1', 'gate1', 'pedestal', 'jet h1 h2 h3', 'clear E2', 'chain', 'tunnel'] },
  { section: 'S2', steps: ['porch', 'cross x 47', 'take mg-pit', 'hold pk5 through 4 waves', 'jet sl1 sl2 K8', 'v3', 'K11', 'v4', 'K14', 'ring'] },
  { section: 'S3', steps: ['depot', 'shrine', 'chain', 'FP1 on foot', 'zap c2', 'walk eb2', 'zap c3', 'walk eb3', 'destroy the gate pylon', 'tunnel'] },
  { section: 'S4', steps: ['take sn-mines', 'snipe A and B from the wall', 'jet b3 b6 b9', 'cross x 153', 'fight from hb3', 'zap c4', 'eb4', 'pod', 'exit'] },
  { section: 'S5', steps: ['plaza', 'jet n2 n1 n3', 'roof', 'vault', 'depot', 'exit door'] },
  { section: 'SB', steps: ['pedestal', 'gate', 'pylons from the centre tile', 'breakers from the centre tile', 'follow the Midget cycle with jet steps'] },
];

function shift(at, origin) {
  return [at[0] + origin[0], (at[1] || 0) + (origin[1] || 0), at[2] + origin[2]];
}

const BUILT = makeV2Level({
  id: 'L04',
  name: 'The Blockchain Void',
  stage: 'void',
  tier: 4,
  parTime: 20 * 60,
  jetpack: 'pickup',
  useNav: true,
  maxAlive: 12,
  lighting: { sky: 'black', aurora: ['green', 'purple'], chart: true, fogStart: 220 },
  bounds: { min: [-30, -80, -30], max: [1560, 140, 240] },
  sections: [S1, S2, S3, S4, S5, SB],
});

for (const sec of BUILT.sections) {
  const o = sec.origin;
  if (sec.navLinks) {
    sec.navLinks = sec.navLinks.map((link) => ({
      ...link,
      from: { x: link.from.x + o[0], z: link.from.z + o[2] },
      to: { x: link.to.x + o[0], z: link.to.z + o[2] },
    }));
  }
  if (sec.voids) {
    sec.voids = sec.voids.map((v) => ({
      ...v,
      min: shift(v.min, o),
      max: shift(v.max, o),
      to: v.to ? shift(v.to, o) : v.to,
    }));
  }
}

BUILT.estimateSeconds = Math.round(L04_PACING.reduce((sum, row) => sum + row[1], 0) * 10) / 10;
BUILT.pacing = L04_PACING;
BUILT.botRoute = L04_BOT;
BUILT.census = EXPECTED_COUNTS;
BUILT.archetypes = { ...L04_FLYERS, flakPod: FLAK_POD };
BUILT.duo = DUO;
BUILT.spellNotes = L04_SPELLS;
BUILT.drops = 'voidSafe';
BUILT.difficulty = {
  easy: { voidPenalty: 0.1, flakShells: 3, flakFuel: 10, l1NoBooms: true, l2Whale: false, e5Flock: false, bossDrop: false, midgetStep: 16, ammo: 1.5 },
  heroic: { flakLead: 1, flakRange: 55, eliteRange: 65, e2EliteFlyer: true, l1ExtraFlock: 6, l2Pods: 2, e8Kills: 5, bossBreaker: 3, midgetStep: 9, crateUses: 1 },
};
BUILT.loot = {
  tierOdds: { common: 30, uncommon: 45, rare: 22, epic: 3, legendary: 0 },
  baseTier: 'uncommon',
  racks: ['mg-pit', 'sn-mines', 'bz-duo'],
  elites: ['Head Trader', 'Priority Fee', 'Whale', 'Shooter Bot'],
  chests: ['chest-l1', 'chest-l2'],
  boss: ['rare', 'rare', 'ray|bigbullets'],
  secretCache: 's4.cache',
};

export const L04 = BUILT;
registerLevel(L04);
