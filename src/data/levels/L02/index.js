// L02 The Grand Bazaar. Format v2. Registers from this folder.
// The hub still names the payable fight S4 / S4-E4, so the showroom keeps
// those ids. designId on the section and the boss encounter is SB / SB-BOSS.
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';
import { buildSections } from './sections.js';
import { BEATS, BOT_ROUTE, DEV_ENTRY, DIFFICULTY, LOOT } from './spec.js';

const beats = BEATS.reduce((sum, row) => sum + row.sec, 0);

export const L02 = makeV2Level({
  id: 'L02',
  name: 'The Grand Bazaar',
  stage: 'desert',
  tier: 2,
  parTime: 20 * 60,
  jetpack: false,
  maxAlive: 10,
  useNav: false,
  lighting: { preset: 'desert', sun: 'late-afternoon', boss: 'dusk-fire-ring' },
  sections: buildSections(),
});

L02.design = {
  loot: LOOT,
  beats: BEATS,
  estimateSec: Math.round(beats),
  botRoute: BOT_ROUTE,
  devEntry: DEV_ENTRY,
  difficulty: DIFFICULTY,
  parTime: 20 * 60,
};

registerLevel(L02);
