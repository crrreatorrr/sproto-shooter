// Levels register themselves from their own folder. Call registerLevel once at
// module load. src/data/levels/campaign.js imports L01, L02 and L03 so those
// folders run. Do not add a fourth import there for a later level until that
// level's folder exists.

const byId = new Map();

export function registerLevel(level) {
  if (!level || typeof level.id !== 'string') throw new Error('registerLevel needs a level id');
  byId.set(level.id, level);
  return level;
}

export function registeredLevel(id) {
  return byId.get(id) || null;
}

export function registeredLevels() {
  return [...byId.values()];
}
