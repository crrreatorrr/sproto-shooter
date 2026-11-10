// Real campaign mechanisms. The old proximity triggers still decide when a
// switch or barrel fires, so corridor levels keep their timing.
import { explode, damagePlayer } from '../combat.js';
import { emit } from '../events.js';

export function detonateBarrel(state, section, m) {
  const lv = state.level;
  if (lv.got[m.id]) return;
  lv.got[m.id] = true;
  const pos = { x: m.at[0], y: m.at[1] || 0.5, z: m.at[2] };
  const element = m.element || 'fire';
  emit(state, 'barrel', { id: m.id, pos, element });
  explode(state, pos, { radius: m.radius || 4, damage: m.damage || 60, minFalloff: 0.35, selfMult: 0, knockback: 6 }, 0, element, 'world');
  const p = state.players[state.localPlayerId];
  const d = Math.hypot(p.pos.x - pos.x, p.pos.y - pos.y, p.pos.z - pos.z);
  const radius = m.radius || 4;
  if (d < radius) damagePlayer(state, p, { base: (m.playerDamage || 25) * (1 - d / radius), sourceKind: 'world', fromPos: pos });
  for (const other of (section && section.mechanisms) || []) {
    if (other.kind !== 'barrel' || other.id === m.id || lv.got[other.id]) continue;
    if (Math.hypot(other.at[0] - pos.x, other.at[2] - pos.z) > radius) continue;
    detonateBarrel(state, section, other);
  }
}

export function tickSwitch(state, p, m, dt) {
  const lv = state.level;
  if (lv.got[m.id]) return;
  const held = p.cmd && p.cmd.held && p.cmd.held.interact;
  if (!m.needsHold) {
    lv.got[m.id] = true;
    emit(state, 'switch', { id: m.id });
    return;
  }
  if (!held) { m._hold = 0; return; }
  m._hold = (m._hold || 0) + dt;
  if (m._hold >= (m.holdTime || 0.35)) {
    lv.got[m.id] = true;
    emit(state, 'switch', { id: m.id });
  }
}

export function onMover(p, m) {
  if (!m.carry) return Math.abs(p.pos.x - m.from[0]) < 1.6;
  const dx = m.to[0] - m.from[0], dz = (m.to[2] || 0) - (m.from[2] || 0);
  const len2 = dx * dx + dz * dz || 1;
  const t = ((p.pos.x - m.from[0]) * dx + (p.pos.z - (m.from[2] || 0)) * dz) / len2;
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = m.from[0] + dx * clamped;
  const pz = (m.from[2] || 0) + dz * clamped;
  return Math.hypot(p.pos.x - px, p.pos.z - pz) < 1.6;
}

export function tickMover(state, p, m, dt) {
  if (!m.carry || !m.from || !m.to) {
    p.vel.x += (m.speed || 2) * dt;
    return;
  }
  const dx = m.to[0] - p.pos.x, dz = m.to[2] - p.pos.z;
  const dist = Math.hypot(dx, dz) || 1;
  const step = Math.min(dist, (m.speed || 2) * dt);
  p.pos.x += (dx / dist) * step;
  p.pos.z += (dz / dist) * step;
  if (m.to[1] != null) p.pos.y = m.to[1];
}

export function slowEnemiesInHazard(state, m) {
  if (!m.affectsEnemies || m.slow == null) return;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (e.pos.x < m.min[0] || e.pos.x > m.max[0] || e.pos.z < m.min[2] || e.pos.z > m.max[2]) continue;
    e.vel.x *= m.slow;
    e.vel.z *= m.slow;
  }
}
