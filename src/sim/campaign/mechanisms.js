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
    if (!insideZone(m, e.pos.x, e.pos.z)) continue;
    e.vel.x *= m.slow;
    e.vel.z *= m.slow;
  }
}

export function insideZone(m, x, z) {
  if (m.min && m.max) return x >= m.min[0] && x <= m.max[0] && z >= m.min[2] && z <= m.max[2];
  if (m.at && m.r) return Math.hypot(x - m.at[0], z - m.at[2]) <= m.r;
  return false;
}

/** A named set is off until a script turns it on. `when` uses the same flags as doors. */
export function hazardOn(lv, m) {
  if (!lv) return true;
  if (m.set) {
    const sets = lv.hazardSets || {};
    if (sets[m.set] == null) return false;
    return !!sets[m.set];
  }
  if (m.when) {
    if (m.when.endsWith('.cleared')) return !!lv.cleared[m.when.slice(0, -'.cleared'.length)];
    if (m.when.startsWith('switch:')) return !!lv.got[m.when.slice('switch:'.length)];
    return !!lv.got[m.when];
  }
  return true;
}

export function setHazardSet(state, id, on) {
  const lv = state.level;
  if (!lv) return;
  if (!lv.hazardSets) lv.hazardSets = {};
  lv.hazardSets[id] = !!on;
  lv._zonesDirty = true;
  emit(state, 'hazardSet', { id, on: !!on });
}

export function isZone(m) {
  return m.kind === 'hazardZone' || m.kind === 'slow';
}

/** Sustained speed multiplier for the player. 1 when they are not in a live zone. */
export function playerZoneSlow(lv, sec, p) {
  let slow = 1;
  for (const m of (sec && sec.mechanisms) || []) {
    if (!isZone(m) || !hazardOn(lv, m) || m.slow == null) continue;
    if (!insideZone(m, p.pos.x, p.pos.z)) continue;
    if (m.slow < slow) slow = m.slow;
  }
  return slow;
}

export function enemyZoneSlow(lv, sec, e) {
  let slow = 1;
  for (const m of (sec && sec.mechanisms) || []) {
    if (!isZone(m) || !hazardOn(lv, m) || !m.affectsEnemies || m.slow == null) continue;
    if (!insideZone(m, e.pos.x, e.pos.z)) continue;
    if (m.slow < slow) slow = m.slow;
  }
  return slow;
}

export function publishSlowZones(lv, sec) {
  const zones = [];
  for (const m of (sec && sec.mechanisms) || []) {
    if (!isZone(m) || !hazardOn(lv, m) || !(m.navCost > 1) || !m.min || !m.max) continue;
    zones.push({ min: m.min, max: m.max, cost: m.navCost });
  }
  lv.slowZones = zones;
  lv._zonesDirty = false;
}

export function tickZoneDamage(state, p, m, dt) {
  if (!isZone(m) || !hazardOn(state.level, m)) return;
  if (!insideZone(m, p.pos.x, p.pos.z)) return;
  if (m.dps) damagePlayer(state, p, { base: m.dps * dt, sourceKind: 'world', fromPos: { x: (m.min && m.min[0]) || m.at[0], y: 0, z: (m.min && m.min[2]) || m.at[2] } });
  if (m.affectsEnemies && m.dps) {
    for (const e of state.enemies) {
      if (e.dead || !insideZone(m, e.pos.x, e.pos.z)) continue;
      e.hp -= m.dps * dt;
      if (e.hp <= 0) { e.hp = 0; e.dead = true; }
    }
  }
}

export function tickGeyser(state, p, m) {
  if (m.kind !== 'geyser' || !m.at || !hazardOn(state.level, m)) return;
  const lv = state.level;
  const period = m.period || 5;
  const phase = ((lv.time + (m.offset || 0)) % period + period) % period;
  const rumble = m.rumble == null ? 1.2 : m.rumble;
  const book = lv.mech || (lv.mech = {});
  const st = book[m.id] || (book[m.id] = {});
  const warning = rumble > 0 && phase >= period - rumble;
  if (warning && !st.warn) {
    st.warn = true;
    emit(state, 'geyser', { id: m.id, phase: 'rumble' });
  }
  if (!warning) st.warn = false;
  const near = Math.hypot(p.pos.x - m.at[0], p.pos.z - m.at[2]) <= (m.r || 1.6);
  if (phase < 0.45 && near && !st.hit) {
    st.hit = true;
    emit(state, 'geyser', { id: m.id, phase: 'erupt' });
    if (m.damage) damagePlayer(state, p, { base: m.damage, sourceKind: 'world', fromPos: { x: m.at[0], y: m.at[1] || 0, z: m.at[2] } });
    if (m.to) {
      p.pos.x = m.to[0];
      p.pos.y = m.to[1] == null ? p.pos.y : m.to[1];
      p.pos.z = m.to[2];
      p.vel.y = Math.max(p.vel.y, 6);
    }
  }
  if (phase >= 0.45) st.hit = false;
}
