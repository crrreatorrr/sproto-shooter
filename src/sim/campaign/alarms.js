// Alarm boxes, cables, searchlights and the runner who rings them.
// A cut alarm never rings. Optional onAlarm squads wait for ringAlarm.
import { emit } from '../events.js';
import { hasLOS } from './perception.js';
import { ringAlarm } from './v2.js';

function mechanisms(state) {
  const sec = state._v2section;
  return (sec && sec.mechanisms) || [];
}

function alarmOf(state, id) {
  for (const m of mechanisms(state)) if (m.kind === 'alarm' && m.id === id) return m;
  return null;
}

function hpBook(lv) {
  if (!lv.alarmHp) lv.alarmHp = {};
  return lv.alarmHp;
}

function recOf(lv, m) {
  const book = hpBook(lv);
  return book[m.id] || (book[m.id] = {
    box: m.hp == null ? 40 : m.hp,
    cable: m.cableHp == null ? 20 : m.cableHp,
    lamp: m.lamp == null ? 30 : m.lamp,
    hold: 0,
  });
}

export function alarmCut(lv, id) {
  return !!(lv && lv.alarmsCut && lv.alarmsCut[id]);
}

function markCut(state, id) {
  const lv = state.level;
  if (!lv.alarmsCut) lv.alarmsCut = {};
  if (lv.alarmsCut[id]) return;
  lv.alarmsCut[id] = true;
  emit(state, 'alarm', { id, cut: true });
}

function cablesOf(m) {
  const from = m.at;
  if (!from) return [];
  const ends = [];
  if (m.cableTo) ends.push(m.cableTo);
  for (const c of m.cables || []) ends.push(c);
  return ends.map((to) => ({ a: from, b: to }));
}

/** Ray against a sphere. Returns distance or -1. */
function raySphere(o, d, c, r, maxDist) {
  const ox = o.x - c[0], oy = o.y - (c[1] || 0), oz = o.z - c[2];
  const b = ox * d.x + oy * d.y + oz * d.z;
  const c0 = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - c0;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  if (t < 0.05 || t > maxDist) return -1;
  return t;
}

/** Ray against a capsule-ish cable: closest approach within radius. */
function rayCable(o, d, a, b, radius, maxDist) {
  const abx = b[0] - a[0], aby = (b[1] || 0) - (a[1] || 0), abz = b[2] - a[2];
  let best = -1;
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const c = [a[0] + abx * u, (a[1] || 0) + aby * u, a[2] + abz * u];
    const t = raySphere(o, d, c, radius, maxDist);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
}

/**
 * Nearest alarm box, cable or searchlight lamp along a shot.
 * Returns { t, id, part } or null. `part` is 'box', 'cable' or 'lamp'.
 */
export function alarmRay(state, origin, dir, maxDist) {
  const lv = state.level;
  if (!lv) return null;
  let best = null;
  for (const m of mechanisms(state)) {
    if (!m.at) continue;
    if (m.kind === 'alarm') {
      const box = raySphere(origin, dir, m.at, 0.8, maxDist);
      if (box >= 0 && (!best || box < best.t)) best = { t: box, id: m.id, part: 'box', m };
      for (const seg of cablesOf(m)) {
        const t = rayCable(origin, dir, seg.a, seg.b, 0.45, maxDist);
        if (t >= 0 && (!best || t < best.t)) best = { t, id: m.id, part: 'cable', m };
      }
    } else if (m.kind === 'searchlight' && !m.harmless) {
      const t = raySphere(origin, dir, m.at, 0.6, maxDist);
      if (t >= 0 && (!best || t < best.t)) best = { t, id: m.id, part: 'lamp', m };
    }
  }
  return best;
}

/** Apply one shot. Returns true when the shot should stop. */
export function damageAlarm(state, hit, amount) {
  const lv = state.level;
  const rec = recOf(lv, hit.m);
  if (hit.part === 'lamp') {
    if (rec.lamp <= 0) return true;
    rec.lamp -= amount;
    if (rec.lamp <= 0) rec.lamp = 0;
    return true;
  }
  if (hit.part === 'cable') rec.cable -= amount;
  else rec.box -= amount;
  if (rec.box <= 0 || rec.cable <= 0) {
    rec.box = Math.max(0, rec.box);
    rec.cable = Math.max(0, rec.cable);
    markCut(state, hit.id);
  }
  return true;
}

function onBeam(m, px, pz, time) {
  const span = m.sweep > 0 ? Math.sin(time * Math.PI * 2 / m.sweep) * 0.9 : 0;
  const yaw = (m.yaw || 0) + span;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const dx = px - m.at[0];
  const dz = pz - m.at[2];
  const along = dx * fx + dz * fz;
  if (along < 0 || along > (m.beam || 120)) return false;
  const ox = dx - fx * along;
  const oz = dz - fz * along;
  return Math.hypot(ox, oz) <= (m.spot || 6);
}

/**
 * Runners walk to their box and ring it. A cut box or cable makes them wait
 * and leave it alone. A searchlight that holds the player rings its alarm.
 * A spotter with ringsAlarm does the same after 1.5 s of contact.
 */
export function tickAlarms(state, dt) {
  const lv = state.level;
  const list = mechanisms(state);
  let any = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i].kind === 'alarm' || list[i].kind === 'searchlight') any = true;
  }
  for (const e of state.enemies) if (e.ringsAlarm || e.role === 'runner') any = true;
  if (!any) return;
  const p = state.players[state.localPlayerId];
  for (const m of list) {
    if (m.kind !== 'searchlight' || m.harmless || !m.alarm || !m.at || !p) continue;
    const rec = recOf(lv, m);
    if (rec.lamp <= 0 || alarmCut(lv, m.alarm)) { rec.hold = 0; continue; }
    if (onBeam(m, p.pos.x, p.pos.z, lv.time || 0)) rec.hold += dt;
    else rec.hold = 0;
    if (rec.hold >= (m.hold || 2)) ringAlarm(state, m.alarm);
  }
  for (const e of state.enemies) {
    if (e.dead || e.type !== 'spotterDrone' || !e.ringsAlarm || !p) continue;
    if (alarmCut(lv, e.ringsAlarm)) continue;
    const from = { x: e.pos.x, y: e.pos.y + 0.6, z: e.pos.z };
    const to = { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z };
    const dist = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const seeing = dist <= 35 && hasLOS(state, from, to, 35);
    if (seeing) e.ai.spotT = (e.ai.spotT || 0) + dt;
    else e.ai.spotT = Math.max(0, (e.ai.spotT || 0) - dt);
    if ((e.ai.spotT || 0) >= 1.5) ringAlarm(state, e.ringsAlarm);
  }
}

/**
 * Where a runner should go this tick, or null to chase normally.
 * Also rings the alarm once they have stood at a live box long enough.
 */
export function runnerSteer(state, e, dt) {
  if (!e || e.role !== 'runner' || !e.alarm || e.dead) return null;
  const lv = state.level;
  if (!lv || (lv.alarms && lv.alarms[e.alarm] != null)) return null;
  const box = alarmOf(state, e.alarm);
  if (!box || !box.at) return null;
  const dx = box.at[0] - e.pos.x;
  const dz = box.at[2] - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const cut = alarmCut(lv, e.alarm);
  if (dist > 1.8) {
    e.ai.alarmT = 0;
    return { x: dx / (dist || 1), z: dz / (dist || 1) };
  }
  e.ai.alarmT = (e.ai.alarmT || 0) + dt;
  if (cut) return { x: 0, z: 0, wait: e.ai.alarmT < (box.wonder || 3) };
  if (e.ai.alarmT >= (box.runner || 1.5)) ringAlarm(state, e.alarm);
  return { x: 0, z: 0, wait: true };
}
