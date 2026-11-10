import arena from './arena.js';
import { CAMPAIGN_LEVELS } from './campaign.js';

export const LEVELS = { arena };
for (const level of CAMPAIGN_LEVELS) LEVELS[level.id] = level;

/** Play order of The Great Sproto Audit. */
export const CAMPAIGN = CAMPAIGN_LEVELS.map((l) => l.id);

export function installLevel(level) {
  LEVELS[level.id] = level;
  return level;
}

export function getLevelData(id) {
  const level = LEVELS[id] || LEVELS[resolveLevelId(id)];
  if (!level) throw new Error(`unknown level: ${id}`);
  return level;
}

export function resolveLevelId(id) {
  if (!id) return null;
  const raw = String(id);
  if (LEVELS[raw]) return raw;
  const n = Number(raw);
  if (n >= 1 && n <= CAMPAIGN.length) return CAMPAIGN[n - 1];
  const hit = CAMPAIGN.find((k) => k.toLowerCase() === raw.toLowerCase());
  return hit || null;
}
