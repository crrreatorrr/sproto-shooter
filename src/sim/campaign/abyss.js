// The death floor under a campaign level. Fall past it and you die, instead of falling forever.
// It sits well under the lowest thing the level is built from, so no jump, slide or fling inside
// the level reaches it, and a rescue void (which acts at ground height) always wins.
import { getLevelRuntime } from '../level/runtime.js';

const DROP = 30;
const cache = new Map();

function lowest(rt) {
  let y = 0;
  for (const sec of rt.sections || []) {
    for (const g of sec.geometry || []) {
      if (!g.at) continue;
      const half = g.size ? g.size[1] / 2 : g.r && !g.h ? g.r : 0;
      y = Math.min(y, g.at[1] - half);
    }
    if (sec.terrain && sec.terrain.origin) y = Math.min(y, sec.terrain.origin[1] || 0);
    if (sec.start) y = Math.min(y, sec.start[1] || 0);
  }
  return y;
}

/** World y below which a player in this level is dead. */
export function abyssY(level) {
  if (!level || !level.id) return -Infinity;
  if (!cache.has(level.id)) cache.set(level.id, lowest(getLevelRuntime(level.id)) - DROP);
  return cache.get(level.id);
}
