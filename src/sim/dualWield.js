// Dual wielding and melee. Pure sim (no three, no DOM, no wall clock).
//
// Dual wield: while the gun in your hands is dual-wieldable (data/guns.js `dualWield`), picking up another
// dual-wieldable gun from the floor puts it in your left hand instead of a slot. The left gun lives on
// `p.dual` ({ gun, rightId, fireCd, reloadT, gap, turn }), never in `p.guns`, and has its own magazine and
// reload. `p.dual` is absent unless you are dual wielding, so a state that never dual wields hashes as before.
// The left gun drops to the floor when you change weapon, when the right gun leaves your hands, or when you
// melee. You cannot aim or zoom while dual wielding (playerInput).
//
// Melee: Interact with no gun or Weapon Box in reach. Works with any gun. Both features use inputs the
// campaign log already carries (fire, interact, slot, wheel), so a recorded run replays them exactly.
import { TUNING } from '../data/tuning.js';
import { isDualWield } from '../data/guns.js';
import { dirFromYawPitch, deg } from '../core/math.js';
import { createPickup } from './state.js';
import { emit } from './events.js';
import { damageEnemy } from './combat.js';

export { isDualWield };

/** True when the floor gun would go to the left hand: the held gun and the floor gun can both be dual wielded. */
export function grabsOffhand(p, floorGun) {
  const held = p.guns[p.activeSlot];
  return !!held && isDualWield(held) && isDualWield(floorGun);
}

/** Put `gun` in the left hand. A gun already there drops to the floor. */
export function takeOffhand(state, p, gun) {
  if (p.dual) dropOffhand(state, p);
  const held = p.guns[p.activeSlot];
  p.dual = { gun, rightId: held.id, fireCd: 0.3, reloadT: 0, gap: 0, turn: 'left' };
  p.zooming = false;
  emit(state, 'gunPickedUp', { playerId: p.id, gunId: gun.id, slot: 'left', quality: gun.quality });
  emit(state, 'dualWield', { playerId: p.id, on: true, gunId: gun.id });
}

/** Drop the left-hand gun on the floor in front of the player and go back to one gun. */
export function dropOffhand(state, p) {
  const d = p.dual;
  if (!d) return;
  delete p.dual;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  createPickup(state, {
    kind: 'gun', gun: d.gun, pos: { x: p.pos.x + fx * 0.6, y: p.pos.y + 1, z: p.pos.z + fz * 0.6 },
    vel: { x: fx * 2.5, y: 3.5, z: fz * 2.5 }, ttl: TUNING.gunPickupTtl,
  });
  emit(state, 'gunDropped', { gunId: d.gun.id, slot: 'left' });
  emit(state, 'dualWield', { playerId: p.id, on: false, gunId: d.gun.id });
}

/** The left gun only stays while the same dual-wieldable gun is in the right hand. */
export function checkOffhand(state, p) {
  if (!p.dual) return;
  const held = p.guns[p.activeSlot];
  if (!held || held.id !== p.dual.rightId || !isDualWield(held)) dropOffhand(state, p);
}

/** Melee with whatever you hold. Dual wielding: the left gun drops first, then the hit. */
export function melee(state, p) {
  const m = TUNING.melee;
  if (p.meleeCd > 0 || p.downed || p.medkitT > 0) return false;
  if (p.dual) dropOffhand(state, p);
  p.meleeCd = m.cooldown;
  p.fireCd = Math.max(p.fireCd, m.fireLock);
  p.reloadT = 0; // a melee cancels a reload, as a swap does
  const aim = dirFromYawPitch(p.yaw, 0);
  const cosCone = Math.cos(deg(m.coneDeg));
  const footY = p.pos.y;
  let best = null, bestD = Infinity;
  for (const e of state.enemies) {
    if (e.dead || e.faction !== 'enemy') continue;
    const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
    const flat = Math.hypot(dx, dz);
    const reach = flat - (e.radius || 0.5) * (e.scale || 1);
    if (reach > m.range) continue;
    if (e.pos.y > footY + 2.2 || e.pos.y + (e.height || 1.8) * (e.scale || 1) < footY - 0.4) continue;
    if (flat > 0.01 && (dx * aim.x + dz * aim.z) / flat < cosCone) continue;
    if (reach < bestD) { bestD = reach; best = e; }
  }
  if (best) {
    const point = { x: best.pos.x, y: best.pos.y + (best.height || 1.8) * (best.scale || 1) * 0.55, z: best.pos.z };
    damageEnemy(state, best, { sourceId: p.id, sourceKind: 'melee', base: m.damage, element: 'none', elementChance: 0,
      zone: 'body', critChance: 0, critMult: 1, canCrit: false, point });
  }
  emit(state, 'melee', { playerId: p.id, hit: !!best, targetId: best ? best.id : null });
  return true;
}
