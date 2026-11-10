// Format v2 director: several squads, triggers, objectives, lockdown doors.
// The corridor director still runs every level whose format is not 'v2'.
import { BOSSES } from '../../data/enemies.js';
import { emit } from '../events.js';
import { createEnemy, createBoss } from '../state.js';
import { inBox } from '../level/runtime.js';
import { solidFromPrimitive, solidsFromGeometry } from './solids.js';

function book(lv) {
  if (!lv.v2) lv.v2 = { enc: {}, parts: {}, doorOpen: {} };
  return lv.v2;
}

function encState(lv, id) {
  const v = book(lv);
  if (!v.enc[id]) v.enc[id] = { started: false, t: 0, kills: 0, alive: 0, squads: {}, sealed: false };
  return v.enc[id];
}

export function bindV2Section(state, sec) {
  const lv = state.level;
  lv.solids = sec && sec.solids ? sec.solids.slice() : solidsFromGeometry(sec && sec.geometry);
  lv.closedDoors = [];
  lv.useSolids = true;
}

export function beginV2(state) {
  const lv = state.level;
  lv.format = 'v2';
  lv.useSolids = true;
  book(lv);
}

function squadKey(squad, i) { return squad.id || String(i); }

function noteKills(state, enc, prog) {
  if (!prog.seen) prog.seen = {};
  for (const e of state.enemies) {
    if (!e.dead || e.campaignEnc !== enc.id || prog.seen[e.id]) continue;
    prog.seen[e.id] = true;
    prog.kills++;
  }
}

function aliveOf(state, encId) {
  let n = 0;
  for (const e of state.enemies) if (!e.dead && e.campaignEnc === encId) n++;
  return n;
}

function triggerReady(state, enc, squad, prog) {
  const tr = squad.trigger || { type: 'onEnter' };
  if (tr.type === 'onEnter') return prog.started;
  if (tr.type === 'time') return prog.t >= (tr.t || 0);
  if (tr.type === 'onKills') return prog.kills >= (tr.n || 1);
  if (tr.type === 'onRemain') return prog.started && aliveOf(state, enc.id) <= (tr.n ?? 2) && Object.keys(prog.squads).length > 0;
  if (tr.type === 'onHold') return (prog.hold || 0) >= (tr.p || 0);
  if (tr.type === 'onBossHp') {
    for (const e of state.enemies) {
      if (e.dead || !e.boss || e.campaignEnc !== enc.id) continue;
      return (e.hp / e.maxHp) * 100 <= (tr.p ?? 100);
    }
    return false;
  }
  if (tr.type === 'onPartDestroyed') return !!(book(state.level).parts[tr.id]);
  if (tr.type === 'with') {
    const prev = prog.squads[tr.after];
    return !!prev && prog.t - prev.at >= (tr.delay || 0);
  }
  return false;
}

function spawnOne(state, enc, squad, at) {
  const type = at.type;
  const pos = at.pos;
  const boss = BOSSES[type] && BOSSES[type].campaign;
  const e = boss
    ? createBoss(state, type, { pos: { x: pos[0], z: pos[2] } })
    : createEnemy(state, type, { pos: { x: pos[0], z: pos[2] } });
  e.pos.y = pos[1] || 0;
  e.campaignEnc = enc.id;
  e.spawnMethod = squad.method || 'placed';
  if (enc.noAmmoDrop) e.noAmmoDrop = true;
  if (at.partId) e.partId = at.partId;
  if (boss) emit(state, 'bossSpawn', { id: e.id, bossType: type });
  return e;
}

function trySpawn(state, enc, squad, key) {
  const lv = state.level;
  const prog = encState(lv, enc.id);
  const cap = enc.maxAlive || lv.maxAlive || 8;
  const spots = [];
  let i = 0;
  for (const u of squad.units || []) {
    for (let n = 0; n < u.count; n++) {
      const at = (squad.at && squad.at[Math.min(i, squad.at.length - 1)]) || [0, 0, 0];
      spots.push({ type: u.type, pos: at, partId: u.partId || null });
      i++;
    }
  }
  const born = [];
  for (const spot of spots) {
    if (aliveOf(state, enc.id) >= cap) {
      prog.queue = prog.queue || [];
      prog.queue.push({ encId: enc.id, squad: key, spot });
      continue;
    }
    born.push(spawnOne(state, enc, squad, spot));
  }
  prog.squads[key] = { at: prog.t, count: spots.length };
  emit(state, 'squadSpawn', { encounter: enc.id, squad: key, method: squad.method || 'placed', count: born.length });
}

function doorBox(m) {
  if (!m || !m.at) return null;
  return solidFromPrimitive({
    kind: 'box', id: m.id, at: m.at, size: m.size || [0.6, 3.2, 3.2],
  });
}

function seal(state, sec, enc) {
  const prog = encState(state.level, enc.id);
  if (prog.sealed || !enc.lockdown) return;
  prog.sealed = true;
  const doors = [];
  for (const m of sec.mechanisms || []) {
    if (m.kind !== 'door') continue;
    if (m.id !== enc.lockdown.entry && m.id !== enc.lockdown.exit) continue;
    const box = doorBox(m);
    if (box) doors.push(box);
  }
  state.level.closedDoors = doors;
  emit(state, 'lockdown', { encounter: enc.id, sealed: true });
}

function unseal(state, enc) {
  const prog = encState(state.level, enc.id);
  if (!prog.sealed) return;
  prog.sealed = false;
  state.level.closedDoors = [];
  emit(state, 'lockdown', { encounter: enc.id, sealed: false });
}

export function v2Pre(state, dt) {
  const lv = state.level;
  const rt = state._v2section;
  if (!rt) return;
  const p = state.players[state.localPlayerId];
  for (const enc of rt.encounters || []) {
    const prog = encState(lv, enc.id);
    if (!prog.started) {
      const box = enc.activate || enc.zone;
      if (box && inBox(box, p.pos.x, p.pos.y, p.pos.z)) {
        prog.started = true;
        lv.spawned[enc.id] = true;
        if (enc.lockdown && enc.lockdown.threshold && inBox(enc.lockdown.threshold, p.pos.x, p.pos.y, p.pos.z)) seal(state, rt, enc);
      }
    }
    if (!prog.started || lv.cleared[enc.id]) continue;
    noteKills(state, enc, prog);
    if (enc.lockdown && !prog.sealed && enc.lockdown.threshold && inBox(enc.lockdown.threshold, p.pos.x, p.pos.y, p.pos.z)) seal(state, rt, enc);
    prog.t += dt;
    if (enc.objective && enc.objective.kind === 'hold' && enc.hold && inBox(enc.hold, p.pos.x, p.pos.y, p.pos.z)) {
      prog.hold = (prog.hold || 0) + dt;
    }
    (enc.squads || []).forEach((squad, i) => {
      const key = squadKey(squad, i);
      if (prog.squads[key]) return;
      if (!triggerReady(state, enc, squad, prog)) return;
      trySpawn(state, enc, squad, key);
    });
    if (prog.queue && prog.queue.length && aliveOf(state, enc.id) < (enc.maxAlive || lv.maxAlive || 8)) {
      const job = prog.queue.shift();
      const squad = (enc.squads || []).find((s, i) => squadKey(s, i) === job.squad) || { method: 'door' };
      spawnOne(state, enc, squad, job.spot);
    }
  }
}

function objectiveDone(state, enc, prog) {
  const kind = (enc.objective && enc.objective.kind) || 'clearAll';
  const spawned = Object.keys(prog.squads).length;
  const pending = (enc.squads || []).length;
  const alive = aliveOf(state, enc.id);
  if (kind === 'clearAll' || kind === 'boss') return prog.started && spawned >= pending && alive === 0 && !(prog.queue && prog.queue.length);
  if (kind === 'reach' || kind === 'escape' || kind === 'switch') {
    const p = state.players[state.localPlayerId];
    return !!(enc.zone && inBox(enc.zone, p.pos.x, p.pos.y, p.pos.z));
  }
  if (kind === 'hold' || kind === 'survive' || kind === 'capture') return (prog.hold || 0) >= ((enc.objective && enc.objective.seconds) || 1);
  if (kind === 'destroy') {
    const ids = (enc.objective && enc.objective.ids) || [];
    return ids.length > 0 && ids.every((id) => book(state.level).parts[id]);
  }
  if (kind === 'escort') return (prog.hold || 0) >= ((enc.objective && enc.objective.seconds) || 1);
  return false;
}

export function markPartDestroyed(state, id) {
  book(state.level).parts[id] = true;
  emit(state, 'partDestroyed', { id });
}

export function v2Post(state, dt) {
  const lv = state.level;
  const sec = state._v2section;
  if (!sec) return;
  const p = state.players[state.localPlayerId];
  for (const enc of sec.encounters || []) {
    const prog = encState(lv, enc.id);
    if (!prog.started || lv.cleared[enc.id]) continue;
    noteKills(state, enc, prog);
    if (objectiveDone(state, enc, prog)) {
      lv.cleared[enc.id] = true;
      unseal(state, enc);
      emit(state, 'encounterClear', { id: enc.id });
    }
  }
  if (p.dead) { lv.lost = true; emit(state, 'levelLost', { level: lv.id }); return; }
  const rt = state._v2runtime;
  if (sec.exit && (sec.encounters || []).every((e) => lv.cleared[e.id]) && inBox(sec.exit, p.pos.x, p.pos.y, p.pos.z)) {
    const next = rt.sections[rt.sections.indexOf(sec) + 1];
    if (next && !lv.transition) {
      lv.transition = { to: next.id, kind: 'seamless', card: null };
      emit(state, 'sectionExit', { from: sec.id, to: next.id });
    }
  }
  let all = true;
  for (const s of rt.sections) for (const e of s.encounters || []) if (!lv.cleared[e.id]) all = false;
  if (all && rt.sections.length) {
    lv.won = true;
    lv.objective = 'Level clear';
    emit(state, 'levelClear', { level: lv.id, time: lv.time, par: lv.parTime });
  } else {
    const open = (sec.encounters || []).find((e) => !lv.cleared[e.id]);
    lv.objective = open ? (open.lockdown && encState(lv, open.id).sealed ? `LOCKDOWN ${open.id}` : `Clear ${sec.name}`) : `Exit: ${sec.name}`;
  }
  void dt;
}

export function noteV2Section(state, sec, rt) {
  state._v2section = sec;
  state._v2runtime = rt;
  state.level.useNav = !!(sec && sec.navBounds);
  state.level.navBounds = sec && sec.navBounds;
  state.level.flyerVolume = sec && sec.flyerVolume;
  if (sec) bindV2Section(state, sec);
}
