// Client build only. vite.config.js resolves src/data/levels/campaign.js to this file, so the
// title does not download the ten level bodies (src/data/levels/L01-L10). Each entry is the
// level's menu metadata until src/game/campaignLevels.js loads it and swaps the real level in.
// The sim, the server bundles (scripts/build-server-sim.mjs) and the tests keep the real file.
// tests/campaign-lazy.test.js checks these names and stages against the levels themselves.
const META = [
  ['L01', 'Sproto Landing', 'city'],
  ['L02', 'The Grand Bazaar', 'desert'],
  ['L03', 'The Vegetable Grove', 'grove'],
  ['L04', 'The Blockchain Void', 'void'],
  ['L05', 'Frostspire Black Site', 'glacier'],
  ['L06', 'Vape Cabal Skyline', 'city'],
  ['L07', 'Hellfire Underworks', 'volcano'],
  ['L08', 'Government Office', 'office'],
  ['L09', 'Moonlit Ruins', 'moonlit'],
  ['L10', 'Hellfire Caldera', 'volcano'],
];

/** Same order and ids as the real CAMPAIGN_LEVELS. A stub has `pending: true` and no sections. */
export const CAMPAIGN_LEVELS = META.map(([id, name, stage]) => ({ id, name, stage, pending: true }));

/** Put a loaded level in its slot, for the modules that read CAMPAIGN_LEVELS (index.js, serverManifest.js). */
export function replaceCampaignLevel(level) {
  const i = CAMPAIGN_LEVELS.findIndex((l) => l.id === level.id);
  if (i >= 0) CAMPAIGN_LEVELS[i] = level;
}
