// Level registry. Campaign levels are added by their own milestones.
import arena from './arena.js';

export const LEVELS = {
  arena,
};

/** Play order. Empty until C-L01…C-L10 register themselves. */
export const CAMPAIGN = [];

export function getLevelData(id) {
  const level = LEVELS[id];
  if (!level) throw new Error(`unknown level: ${id}`);
  return level;
}
