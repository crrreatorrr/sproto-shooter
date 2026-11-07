// @ts-check
// Seeded sfc32 RNG stored on a plain object (JSON-serializable). The sim's ONLY randomness source.

export function hashSeed(n) {
  let s = (n >>> 0) || 0x9e3779b9;
  const out = [];
  for (let i = 0; i < 4; i++) {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    out.push((z ^ (z >>> 16)) >>> 0);
  }
  return out;
}

export function createRng(seed) {
  const [a, b, c, d] = hashSeed(seed);
  const r = { a, b, c, d };
  for (let i = 0; i < 12; i++) next(r);
  return r;
}

export function next(r) {
  r.a >>>= 0; r.b >>>= 0; r.c >>>= 0; r.d >>>= 0;
  const t = (r.a + r.b) >>> 0;
  r.a = r.b ^ (r.b >>> 9);
  r.b = (r.c + (r.c << 3)) >>> 0;
  r.c = (r.c << 21) | (r.c >>> 11);
  r.d = (r.d + 1) >>> 0;
  const res = (t + r.d) >>> 0;
  r.c = (r.c + res) >>> 0;
  return res;
}

export const float = (r) => next(r) / 4294967296;
export const range = (r, lo, hi) => lo + float(r) * (hi - lo);
export const int = (r, lo, hiIncl) => lo + Math.floor(float(r) * (hiIncl - lo + 1));
export const chance = (r, p) => float(r) < p;
export const pick = (r, arr) => arr[Math.floor(float(r) * arr.length)];

/** entries: [{id, weight}] — always exactly one draw */
export function weighted(r, entries) {
  const f = float(r);
  return pickWeightedByFloat(entries, f);
}

export function pickWeightedByFloat(entries, f) {
  let total = 0;
  for (const e of entries) total += e.weight;
  let x = f * total;
  for (const e of entries) {
    if (x < e.weight) return e;
    x -= e.weight;
  }
  return entries[entries.length - 1];
}
