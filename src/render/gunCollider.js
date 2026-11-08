// Distance field around a gun mesh, in the gun's local space. The first-person rig uses it to keep the hands,
// fingers and arms on the gun's surface instead of inside it: palms are placed where the field reaches the
// hand's thickness, fingers curl until they touch, and elbows pick a side where the forearm clears the gun.
//
// Build: rasterize the triangles into a voxel grid with scanline parity along all three axes (majority vote,
// so a few holes in a non-watertight toy model don't flood a whole column), then a two-pass chamfer distance
// transform over the empty cells. A gun takes ~20-40 ms once; results are cached by key.
import * as THREE from 'three';

const SQ2 = Math.SQRT2, SQ3 = Math.sqrt(3);

/**
 * Triangles of every mesh under `root`, in root-local space, as a flat [x,y,z, x,y,z, x,y,z, ...] array.
 * `skip(mesh)` can leave decorations out.
 */
export function collectTriangles(root, skip) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out = [];
  const v = new THREE.Vector3(), m = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || (skip && skip(o))) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const idx = o.geometry.index, n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m);
      out.push(v.x, v.y, v.z);
    }
  });
  return out;
}

/**
 * Build a collider from a flat triangle array (root-local coordinates).
 * opts.cell: voxel size (default 6 mm), opts.pad: empty margin around the mesh (default 9 cm, past the sleeve clearance).
 */
export function buildCollider(tris, opts = {}) {
  const cell = opts.cell || 0.006, pad = opts.pad ?? 0.09;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < tris.length; i++) { const k = i % 3; if (tris[i] < min[k]) min[k] = tris[i]; if (tris[i] > max[k]) max[k] = tris[i]; }
  if (!(min[0] < Infinity)) return null;
  for (let k = 0; k < 3; k++) { min[k] -= pad; max[k] += pad; }
  const dims = [0, 1, 2].map((k) => Math.max(1, Math.ceil((max[k] - min[k]) / cell)));
  const [nx, ny, nz] = dims;
  const N = nx * ny * nz;
  const at = (c) => c[0] + nx * (c[1] + ny * c[2]);
  const votes = new Uint8Array(N);
  const c = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const u = (k + 1) % 3, w = (k + 2) % 3;
    // crossings per column (u, w) along axis k
    const cols = new Map();
    for (let t = 0; t < tris.length; t += 9) {
      const u0 = tris[t + u], u1 = tris[t + 3 + u], u2 = tris[t + 6 + u];
      const w0 = tris[t + w], w1 = tris[t + 3 + w], w2 = tris[t + 6 + w];
      const d = (u1 - u0) * (w2 - w0) - (u2 - u0) * (w1 - w0);
      if (Math.abs(d) < 1e-14) continue;
      const iu0 = Math.max(0, Math.floor((Math.min(u0, u1, u2) - min[u]) / cell - 0.5));
      const iu1 = Math.min(dims[u] - 1, Math.ceil((Math.max(u0, u1, u2) - min[u]) / cell - 0.5));
      const iw0 = Math.max(0, Math.floor((Math.min(w0, w1, w2) - min[w]) / cell - 0.5));
      const iw1 = Math.min(dims[w] - 1, Math.ceil((Math.max(w0, w1, w2) - min[w]) / cell - 0.5));
      for (let iu = iu0; iu <= iu1; iu++) {
        const cu = min[u] + (iu + 0.5) * cell + 1.3e-7;
        for (let iw = iw0; iw <= iw1; iw++) {
          const cw = min[w] + (iw + 0.5) * cell + 3.1e-7;
          const l1 = ((cu - u0) * (w2 - w0) - (u2 - u0) * (cw - w0)) / d;
          const l2 = ((u1 - u0) * (cw - w0) - (cu - u0) * (w1 - w0)) / d;
          if (l1 < 0 || l2 < 0 || l1 + l2 > 1) continue;
          const z = tris[t + k] + l1 * (tris[t + 3 + k] - tris[t + k]) + l2 * (tris[t + 6 + k] - tris[t + k]);
          const key = iu * 65536 + iw;
          let arr = cols.get(key);
          if (!arr) cols.set(key, (arr = []));
          arr.push(z);
        }
      }
    }
    // parity walk along each column
    for (const [key, arr] of cols) {
      arr.sort((a, b) => a - b);
      c[u] = Math.floor(key / 65536); c[w] = key % 65536;
      let j = 0, inside = false;
      for (let i = 0; i < dims[k]; i++) {
        const ck = min[k] + (i + 0.5) * cell;
        while (j < arr.length && arr[j] < ck) { inside = !inside; j++; }
        if (inside) { c[k] = i; votes[at(c)]++; }
      }
    }
  }
  // chamfer distance (in cells) from every empty cell to the nearest solid one
  const dist = new Float32Array(N);
  const BIG = 1e6;
  let solid = 0;
  for (let i = 0; i < N; i++) { if (votes[i] >= 2) { dist[i] = 0; solid++; } else dist[i] = BIG; }
  const off = [];
  for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const n = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
    if (!n) continue;
    off.push({ dx, dy, dz, d: dx + nx * (dy + ny * dz), w: n === 1 ? 1 : n === 2 ? SQ2 : SQ3 });
  }
  // interior cells only (no bounds checks in the hot loop); the one-cell border is filled from its neighbour after
  const half = (sel) => { const l = off.filter(sel); return [Int32Array.from(l, (o) => o.d), Float32Array.from(l, (o) => o.w)]; };
  const [fd, fw] = half((o) => o.d < 0), [bd, bw] = half((o) => o.d > 0);
  const pass = (D, W, forward) => {
    const n = D.length;
    for (let zi = 1; zi < nz - 1; zi++) for (let yi = 1; yi < ny - 1; yi++) {
      const z = forward ? zi : nz - 1 - zi, y = forward ? yi : ny - 1 - yi;
      const row = nx * (y + ny * z);
      for (let xi = 1; xi < nx - 1; xi++) {
        const i = row + (forward ? xi : nx - 1 - xi);
        let best = dist[i];
        if (best === 0) continue;
        for (let o = 0; o < n; o++) { const v = dist[i + D[o]] + W[o]; if (v < best) best = v; }
        dist[i] = best;
      }
    }
  };
  if (nx > 2 && ny > 2 && nz > 2) {
    pass(fd, fw, true);
    pass(bd, bw, false);
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      if (x > 0 && y > 0 && z > 0 && x < nx - 1 && y < ny - 1 && z < nz - 1) continue;
      const X = Math.min(nx - 2, Math.max(1, x)), Y = Math.min(ny - 2, Math.max(1, y)), Z = Math.min(nz - 2, Math.max(1, z));
      const i = x + nx * (y + ny * z), j = X + nx * (Y + ny * Z);
      if (dist[i] !== 0) dist[i] = Math.min(dist[i], dist[j] + Math.hypot(x - X, y - Y, z - Z));
    }
  }
  return makeQuery({ min, dims, cell, dist, solid });
}

function makeQuery(G) {
  const { min, dims, cell, dist } = G;
  const [nx, ny, nz] = dims;
  const size = [nx * cell, ny * cell, nz * cell];
  /** Distance (local units) from p to the gun surface; 0 inside. Outside the grid: distance to the grid + its margin. */
  function distance(p) {
    const fx = (p.x - min[0]) / cell - 0.5, fy = (p.y - min[1]) / cell - 0.5, fz = (p.z - min[2]) / cell - 0.5;
    let ox = 0, oy = 0, oz = 0;
    if (fx < 0) ox = -fx; else if (fx > nx - 1) ox = fx - (nx - 1);
    if (fy < 0) oy = -fy; else if (fy > ny - 1) oy = fy - (ny - 1);
    if (fz < 0) oz = -fz; else if (fz > nz - 1) oz = fz - (nz - 1);
    const x = Math.min(nx - 1, Math.max(0, fx)), y = Math.min(ny - 1, Math.max(0, fy)), z = Math.min(nz - 1, Math.max(0, fz));
    // trilinear blend of the eight surrounding cells
    const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    const x1 = Math.min(nx - 1, x0 + 1), y1 = Math.min(ny - 1, y0 + 1), z1 = Math.min(nz - 1, z0 + 1);
    const tx = x - x0, ty = y - y0, tz = z - z0;
    const D = (X, Y, Z) => dist[X + nx * (Y + ny * Z)];
    const c00 = D(x0, y0, z0) * (1 - tx) + D(x1, y0, z0) * tx, c10 = D(x0, y1, z0) * (1 - tx) + D(x1, y1, z0) * tx;
    const c01 = D(x0, y0, z1) * (1 - tx) + D(x1, y0, z1) * tx, c11 = D(x0, y1, z1) * (1 - tx) + D(x1, y1, z1) * tx;
    const d = (c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz;
    return (d + Math.hypot(ox, oy, oz)) * cell;
  }
  /** Is p inside the gun (solid cell)? */
  function inside(p) {
    const x = Math.floor((p.x - min[0]) / cell), y = Math.floor((p.y - min[1]) / cell), z = Math.floor((p.z - min[2]) / cell);
    if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return false;
    return dist[x + nx * (y + ny * z)] === 0;
  }
  /**
   * Walk from `from` along unit `dir` and return the first distance s >= 0 at which the clearance reaches `clear`
   * (s = 0 if `from` already has it). Gives up after `maxS`.
   */
  function clearAlong(from, dir, clear, maxS = 0.4, step = cell * 0.5) {
    const p = new THREE.Vector3();
    for (let s = 0; s <= maxS; s += step) {
      p.copy(from).addScaledVector(dir, s);
      if (distance(p) >= clear) return s;
    }
    return maxS;
  }
  return { distance, inside, clearAlong, min: new THREE.Vector3(...min), size: new THREE.Vector3(...size), cell, solidCells: G.solid };
}

const cache = new Map();
/** Collider for a gun object (cached by `key` when given). Decorations flagged `userData.noCollide` are left out. */
export function colliderFor(root, key) {
  if (key && cache.has(key)) return cache.get(key);
  const col = buildCollider(collectTriangles(root, (m) => m.userData.noCollide));
  if (key) cache.set(key, col);
  return col;
}
