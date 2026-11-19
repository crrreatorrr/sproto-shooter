// Campaign level bodies load when a level starts, not with the title (src/game/campaignLevelStubs.js).
// Outside the client build (tests, Node) the real levels are already installed and this does nothing.
import { CAMPAIGN, getLevelData, installLevel, resolveLevelId } from '../data/levels/index.js';
import { replaceCampaignLevel } from './campaignLevelStubs.js';

// Literal specifiers, so the bundler gives each level its own chunk.
const LOADERS = {
  L01: () => import('../data/levels/L01/index.js').then((m) => m.L01),
  L02: () => import('../data/levels/L02/index.js').then((m) => m.L02),
  L03: () => import('../data/levels/L03/index.js').then((m) => m.L03),
  L04: () => import('../data/levels/L04/index.js').then((m) => m.L04),
  L05: () => import('../data/levels/L05/index.js').then((m) => m.L05),
  L06: () => import('../data/levels/L06/index.js').then((m) => m.L06),
  L07: () => import('../data/levels/L07/index.js').then((m) => m.L07),
  L08: () => import('../data/levels/L08/index.js').then((m) => m.L08),
  L09: () => import('../data/levels/L09/index.js').then((m) => m.L09),
  L10: () => import('../data/levels/L10/index.js').then((m) => m.L10),
};

const jobs = new Map();

/** True when the level's body is installed, so the sim can start it. Unknown ids count as ready. */
export function campaignLevelReady(id) {
  const key = resolveLevelId(id);
  if (!key || !LOADERS[key]) return true;
  return !getLevelData(key).pending;
}

/** Load and install one level. Resolves with its id; rejects if the chunk could not be fetched. */
export function loadCampaignLevel(id) {
  const key = resolveLevelId(id);
  if (campaignLevelReady(key)) return Promise.resolve(key);
  if (!jobs.has(key)) {
    const job = LOADERS[key]().then((level) => {
      installLevel(level);
      replaceCampaignLevel(level);
      return key;
    });
    // A failed fetch (offline, a stale deploy) may be retried.
    job.catch(() => jobs.delete(key));
    jobs.set(key, job);
  }
  return jobs.get(key);
}

/** Every level, for code that reads the whole campaign (the rewarded campaign's server checks). */
export function loadAllCampaignLevels() {
  return Promise.all(CAMPAIGN.map((id) => loadCampaignLevel(id)));
}
