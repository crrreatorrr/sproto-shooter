// L05 Frostspire Black Site. Format v2. Section coordinates are local design
// metres (x east, north) stored as z = -north. makeV2Level adds each origin.
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';
import { census, ENCOUNTERS } from './encounters.js';
import { AUDITOR, DECOY, FROST_HOUND, SPOTTER_DRONE } from './enemies.js';
import { S1 } from './S1.js';
import { S2 } from './S2.js';
import { S3 } from './S3.js';
import { S4 } from './S4.js';
import { S5 } from './S5.js';

export const L05_PACING = [
  ['B1', 31], ['E1', 66], ['E2', 54], ['B2', 20], ['E3', 106],
  ['E4', 152], ['E5', 115], ['D1', 52], ['F1', 160],
  ['E6', 78], ['E7', 166], ['B3', 20], ['D2', 51], ['F2', 158],
];

export const L05_BOT = [
  { section: 'S1', steps: ['C1', 'ridge slot 3', 'snipe the runner', 'camp', 'bridge after the drone', 'shrine', 'Decoy', 'P1 P2 elite', 'clerk', 'R1', 'vent', 'gate'] },
  { section: 'S2', steps: ['whiteout', 'Sniper Rocks', 'Last Cover', 'rig vents', 'hounds', 'bunker W roof', 'bunker E', 'gate'] },
  { section: 'S3', steps: ['depot', 'south gallery', 'brow plate', 'emplacement', 'generators', 'gallery through part 3'] },
  { section: 'S4', steps: ['R2', 'service passage', 'locker W2', 'Lift A', 'north-west stair', 'freight'] },
  { section: 'S5', steps: ['depot', 'drill', 'circle the ring', 'ledgers', 'pad'] },
];

function add(at, origin) {
  return [at[0] + origin[0], (at[1] || 0) + (origin[1] || 0), at[2] + origin[2]];
}

function shiftBox(box, origin) {
  if (!box || !box.min || !box.max) return box;
  return { min: add(box.min, origin), max: add(box.max, origin) };
}

function shiftDesign(at, origin) {
  if (!at) return at;
  return [at[0] + origin[0], (at[1] || 0) + (origin[1] || 0), -(at[2] || 0) + origin[2]];
}

const BUILT = makeV2Level({
  id: 'L05',
  name: 'Frostspire Black Site',
  stage: 'glacier',
  tier: 5,
  parTime: 20 * 60,
  jetpack: false,
  // Nav stays off until pathing can take a 300 by 520 section. See ENGINE-NEEDS.md.
  useNav: false,
  maxAlive: 12,
  lighting: { sky: 'polar-night', aurora: true, indoor: 'cold-blue', blizzard: 'S2' },
  bounds: { min: [-30, -40, -1100], max: [420, 80, 40] },
  sections: [S1, S2, S3, S4, S5],
});

for (const sec of BUILT.sections) {
  const origin = sec.origin;
  if (sec.terrain && sec.terrain.origin) {
    sec.terrain = { ...sec.terrain, origin: add(sec.terrain.origin, origin) };
  }
  for (const enc of sec.encounters || []) {
    for (const sq of enc.squads || []) {
      const tr = sq.trigger;
      if (!tr) continue;
      if (tr.box) tr.box = shiftBox(tr.box, origin);
      if (tr.zBelow != null) tr.zBelow += origin[2];
      if (tr.zAbove != null) tr.zAbove += origin[2];
    }
    // makeV2Level shifts target marks. Adds stay in design (x, y, north) until here.
    const script = enc.script;
    if (!script) continue;
    for (const part of script.parts || []) {
      for (const addSpec of part.adds || []) {
        if (addSpec.at && addSpec.at.length && Array.isArray(addSpec.at[0])) {
          addSpec.at = addSpec.at.map((p) => shiftDesign(p, origin));
        } else addSpec.at = shiftDesign(addSpec.at, origin);
      }
    }
  }
}

const counted = census(BUILT.sections.flatMap((sec) => sec.encounters));

BUILT.estimateSeconds = L05_PACING.reduce((sum, row) => sum + row[1], 0);
BUILT.estimateWithAlarms = BUILT.estimateSeconds + 47;
BUILT.pacing = L05_PACING;
BUILT.botRoute = L05_BOT;
BUILT.census = counted;
BUILT.archetypes = { spotterDrone: SPOTTER_DRONE, frostHound: FROST_HOUND };
BUILT.spellNotes = { held: ['gooBolt', 'chainZap', 'carpet', 'yeet', 'swarm', 'manaShield', 'pumpIt'], shrine: DECOY };
BUILT.decoy = DECOY;
BUILT.auditor = AUDITOR;
BUILT.outro = { title: 'You have the ledgers. Glowie has your face. See you at the office.', lines: [] };
BUILT.difficulty = {
  easy: { laser: 1.8, searchHold: 3, droneHold: 2.5, alarmFewer: 2, whiteout: 30, rigVent: 3, hounds: 1, sniperBox: 12, plates: 0.7, generators: 1, drill: 70, strike: 18 },
  heroic: { laser: 1.1, searchHold: 1.2, droneHold: 1, alarmMore: 2, whiteout: 15, rigVent: 2, thirdRig: true, hounds: 3, dropBoxes: ['AB4', 'AB8'], plates: 1.3, generators: 3, missiles: 5, waveAt: 4, drill: 110, strike: 10, strikePairsAfter: 60 },
};
BUILT.loot = {
  tierOdds: { common: 20, uncommon: 42, rare: 30, epic: 7, legendary: 1 },
  baseTier: 'uncommon',
  racks: ['C1', 'R1', 'R2'],
  elites: ['the Head Auditor', 'the Supervisor', 'Alpha', 'the Archivist', 'the Vault Warden'],
  chests: ['chest-l1', 'chest-l2', 'chest-l3'],
  secretCache: 'S1-secretCache',
  bonk: 'Tax Season',
};
BUILT.sightlines = [
  { name: 'ridge to campfire', meters: 91 },
  { name: 'ridge to lookout', meters: 113 },
  { name: 'row A to mast', meters: 125 },
  { name: 'row A to spire', meters: 128 },
  { name: 'row A to hut', meters: 135 },
  { name: 'Sniper Rocks to tower', meters: 135 },
  { name: 'Sniper Rocks to rig', meters: 119 },
];

export const L05 = BUILT;
registerLevel(L05);

export { ENCOUNTERS };
