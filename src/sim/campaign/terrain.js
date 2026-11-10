// Deterministic heightfield. Section terrain lives on section.terrain, not in
// geometry, because the level view used to read at[1] on every primitive.

function hash2(ix, iz, seed) {
  let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967296;
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const v00 = hash2(x0, z0, seed);
  const v10 = hash2(x0 + 1, z0, seed);
  const v01 = hash2(x0, z0 + 1, seed);
  const v11 = hash2(x0 + 1, z0 + 1, seed);
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return (a + (b - a) * tz) * 2 - 1;
}

function fbm(x, z, seed, octaves) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  const n = Math.max(1, octaves | 0);
  for (let i = 0; i < n; i++) {
    sum += valueNoise(x * freq, z * freq, (seed + i * 101) | 0) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Local metres inside the field, or null. North is measured from the south edge. */
export function terrainLocal(t, x, z) {
  if (!t || !t.origin || !t.size) return null;
  const u = x - t.origin[0];
  const v = z - t.origin[2];
  if (u < 0 || v < 0 || u > t.size[0] || v > t.size[1]) return null;
  return { u, v, north: t.size[1] - v };
}

function inFlat(t, u, north) {
  const flats = t.flat || [];
  for (let i = 0; i < flats.length; i++) {
    const f = flats[i];
    if (f.x0 != null && (u < f.x0 || u > f.x1)) continue;
    if (f.n0 != null) {
      const lo = Math.min(f.n0, f.n1);
      const hi = Math.max(f.n0, f.n1);
      if (north < lo || north > hi) continue;
    }
    if (f.x0 == null && f.n0 == null) continue;
    return true;
  }
  return false;
}

/** Surface height, or null outside the field. Flats sit on the origin's y. */
export function heightAt(t, x, z) {
  const local = terrainLocal(t, x, z);
  if (!local) return null;
  const base = t.origin[1] || 0;
  if (inFlat(t, local.u, local.north)) return base;
  const noise = t.noise || {};
  const amp = noise.amp || 0;
  if (!amp) return base;
  const freq = noise.freq == null ? 0.02 : noise.freq;
  const octaves = noise.octaves == null ? 1 : noise.octaves;
  return base + amp * fbm(x * freq, z * freq, t.seed || 1, octaves);
}

/** Grid the renderer and tests share. Cell grows if the field would be huge. */
export function terrainGrid(t) {
  let cell = Math.max(0.5, t.cell || 2);
  let nx = Math.ceil(t.size[0] / cell);
  let nz = Math.ceil(t.size[1] / cell);
  while (nx * nz > 20000) {
    cell *= 2;
    nx = Math.ceil(t.size[0] / cell);
    nz = Math.ceil(t.size[1] / cell);
  }
  const cols = nx + 1;
  const positions = new Float32Array(cols * (nz + 1) * 3);
  const indices = [];
  for (let iz = 0; iz <= nz; iz++) {
    for (let ix = 0; ix <= nx; ix++) {
      const x = t.origin[0] + Math.min(t.size[0], ix * cell);
      const z = t.origin[2] + Math.min(t.size[1], iz * cell);
      const y = heightAt(t, x, z);
      const i = (iz * cols + ix) * 3;
      positions[i] = x;
      positions[i + 1] = y == null ? (t.origin[1] || 0) : y;
      positions[i + 2] = z;
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * cols + ix;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return { positions, indices };
}
