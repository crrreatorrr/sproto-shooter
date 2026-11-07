// Ray vs capsule. Same test as src/sim/collision.js, copied so the arena bundle
// does not pull campaign enemies into the server export.

function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  let t = -b - s;
  if (t < 0) t = -b + s;
  return t >= 0 ? t : -1;
}

/** Vertical capsule. Returns distance along a unit ray, or -1. */
export function rayCapsule(o, d, cx, cz, y0, y1, r) {
  const a0 = y0 + r, a1 = Math.max(a0, y1 - r);
  let best = -1;
  const ox = o.x - cx, oz = o.z - cz;
  const A = d.x * d.x + d.z * d.z;
  if (A > 1e-9) {
    const B = ox * d.x + oz * d.z;
    const C = ox * ox + oz * oz - r * r;
    const disc = B * B - A * C;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      for (const t of [(-B - s) / A, (-B + s) / A]) {
        if (t < 0) continue;
        const y = o.y + d.y * t;
        if (y >= a0 && y <= a1) { best = t; break; }
      }
    }
  }
  for (const yy of [a0, a1]) {
    const t = raySphere(o, d, { x: cx, y: yy, z: cz }, r);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}
