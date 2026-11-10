// The campaign Auditor wears three plates. Wave Mode's monster does not.
import { tierEnemyMult } from '../../data/waves.js';
import { emit } from '../events.js';

const PLATES = [
  { id: 'brow', covers: 'head', hp: 250 },
  { id: 'chest', covers: 'front', hp: 400, bodyMul: 0.1 },
  { id: 'back', covers: 'rear', hp: 400, bodyMul: 0.1 },
];

export function equipAuditorPlates(e, tier = 1) {
  const tm = tierEnemyMult(tier || 1);
  e.plates = PLATES.map((p) => {
    const hp = Math.round(p.hp * tm);
    return { id: p.id, covers: p.covers, bodyMul: p.bodyMul, hp, maxHp: hp };
  });
}

/**
 * Spends a hit on a plate. Returns null when no plate takes it, or the damage
 * that should still reach the body (0 while the brow covers the head).
 */
export function applyPlates(state, e, hit, dmg) {
  if (!e.plates || !hit.point || hit.sourceKind === 'dot' || hit.sourceKind === 'spell') return null;
  let plate = null;
  let mul = 1;
  const head = e.plates.find((p) => p.covers === 'head' && p.hp > 0);
  if (head && hit.zone === 'weak' && hit.point.y >= e.pos.y + 5) {
    plate = head;
    mul = 0;
  } else if (hit.zone !== 'weak') {
    const dx = hit.point.x - e.pos.x;
    const dz = hit.point.z - e.pos.z;
    const front = dx * -Math.sin(e.yaw) + dz * -Math.cos(e.yaw) >= 0;
    plate = e.plates.find((p) => p.hp > 0 && p.covers === (front ? 'front' : 'rear'));
    if (plate) mul = plate.bodyMul == null ? 1 : plate.bodyMul;
  }
  if (!plate) return null;
  plate.hp = Math.max(0, plate.hp - dmg);
  if (plate.hp === 0) emit(state, 'plateBreak', { targetId: e.id, plate: plate.id });
  return Math.max(0, Math.round(dmg * mul));
}
