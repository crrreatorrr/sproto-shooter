// Compiled campaign level. Static data stays here; only dynamic fields live on state.level.
import { getLevelData } from '../../data/levels/index.js';

const cache = new Map();

export function getLevelRuntime(id) {
  const key = String(id);
  if (cache.has(key)) return cache.get(key);
  const data = getLevelData(key);
  const sectionById = {};
  for (const s of data.sections || []) sectionById[s.id] = s;
  const rt = { ...data, sectionById };
  cache.set(key, rt);
  cache.set(data.id, rt);
  return rt;
}

export function sectionById(levelId, sectionId) {
  const rt = getLevelRuntime(levelId);
  return rt.sectionById[sectionId] || rt.sections[0] || null;
}

export function inBox(box, x, y, z) {
  if (!box) return false;
  const y0 = box.min ? box.min[1] : -1e9;
  const y1 = box.max ? box.max[1] : 1e9;
  const min = box.min || box;
  const max = box.max || box;
  if (box.min) return x >= box.min[0] && x <= box.max[0] && y >= y0 && y <= y1 && z >= box.min[2] && z <= box.max[2];
  return x >= min[0] && x <= max[0] && z >= min[2] && z <= max[2];
}

export function nearPoint(at, x, y, z, r) {
  if (!at) return false;
  const dx = x - at[0], dy = y - (at[1] || 0), dz = z - at[2];
  return dx * dx + dy * dy + dz * dz <= r * r;
}
