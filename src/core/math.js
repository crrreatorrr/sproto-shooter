// @ts-check
// Small vector helpers on plain {x,y,z} objects. Pure, no three.js.

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const copy = (o, a) => { o.x = a.x; o.y = a.y; o.z = a.z; return o; };
export const clone = (a) => ({ x: a.x, y: a.y, z: a.z });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a) => Math.hypot(a.x, a.y, a.z);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const norm = (a) => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const deg = (d) => (d * Math.PI) / 180;
export const approach = (cur, target, maxDelta) =>
  cur < target ? Math.min(cur + maxDelta, target) : Math.max(cur - maxDelta, target);

/** Forward vector for yaw (around Y, 0 = -Z) and pitch (up positive). Matches three.js camera 'YXZ'. */
export function dirFromYawPitch(yaw, pitch) {
  const cp = Math.cos(pitch);
  return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
}

export function angleWrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** yaw that faces from a toward b (same convention as dirFromYawPitch) */
export const yawTo = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z));
