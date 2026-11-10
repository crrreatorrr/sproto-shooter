// Format v2 director: several squads, triggers, objectives, lockdown doors.
// The corridor director still runs every level whose format is not 'v2'.
import { BOSSES } from '../../data/enemies.js';
import { emit } from '../events.js';
import { createEnemy, createBoss } from '../state.js';
import { inBox } from '../level/runtime.js';
import { solidFromPrimitive, solidsFromGeometry } from './solids.js';
import { tickBossScript } from './bossScript.js';

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
  let solids = sec && sec.solids ? sec.solids.slice() : solidsFromGeometry(sec && sec.geometry);
  if (lv.brokenSolids) solids = solids.filter((s) => !lv.brokenSolids[s.id]);
  lv.solids = solids;
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
  if (tr.type === 'onRemain') {
    const byCount = prog.started && aliveOf(state, enc.id) <= (tr.n ?? 2) && Object.keys(prog.squads).length > 0;
    if (byCount) return true;
    const waveSec = enc.lockdown && enc.lockdown.waveSec;
    if (!waveSec || !prog.started) return false;
    const keys = Object.keys(prog.squads);
    if (!keys.length) return false;
    const last = prog.squads[keys[keys.length - 1]];
    if (prog.t - (last.at || 0) < waveSec) return false;
    for (let i = 0; i < (enc.squads || []).length; i++) {
      const sq = enc.squads[i];
      if (prog.squads[squadKey(sq, i)]) continue;
      return sq === squad;
    }
    return false;
  }
  if (tr.type === 'onAlert') {
    const p = state.players[state.localPlayerId];
    if (!p) return false;
    if (tr.zBelow != null && p.pos.z < tr.zBelow) return true;
    if (tr.zAbove != null && p.pos.z > tr.zAbove) return true;
    if (tr.box && inBox(tr.box, p.pos.x, p.pos.y, p.pos.z)) return true;
    for (const e of state.enemies) {
      if (!e.dead && e.campaignEnc === enc.id && e.ai && e.ai.alert === 'alerted') return true;
    }
    return false;
  }
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
  const bossDef = BOSSES[type];
  const e = bossDef
    ? createBoss(state, type, { pos: { x: pos[0], z: pos[2] } })
    : createEnemy(state, type, { elite: !!at.elite, pos: { x: pos[0], z: pos[2] } });
  e.pos.y = pos[1] || 0;
  e.campaignEnc = enc.id;
  e.spawnMethod = squad.method || 'placed';
  if (enc.noAmmoDrop) e.noAmmoDrop = true;
  if (at.partId) e.partId = at.partId;
  if (bossDef) {
    if (enc.arena) e.boss.arena = enc.arena;
    emit(state, 'bossSpawn', { id: e.id, bossType: type });
  }
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
      spots.push({ type: u.type, pos: at, partId: u.partId || null, elite: !!u.elite });
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

function pointInside(solid, x, y, z) {
  return x >= solid.min[0] && x <= solid.max[0] && y >= solid.min[1] && y <= solid.max[1] && z >= solid.min[2] && z <= solid.max[2];
}

function pushClear(p, solid, toward) {
  const y = p.pos.y + 1;
  if (!pointInside(solid, p.pos.x, y, p.pos.z)) return true;
  const cx = (solid.min[0] + solid.max[0]) / 2;
  const cz = (solid.min[2] + solid.max[2]) / 2;
  const tx = toward[0] - cx;
  const tz = toward[2] - cz;
  if (Math.abs(tx) >= Math.abs(tz)) p.pos.x = tx >= 0 ? solid.max[0] + 0.45 : solid.min[0] - 0.45;
  else p.pos.z = tz >= 0 ? solid.max[2] + 0.45 : solid.min[2] - 0.45;
  return !pointInside(solid, p.pos.x, y, p.pos.z);
}

function switchedDoorIds(sec) {
  const ids = {};
  for (const m of (sec && sec.mechanisms) || []) {
    if ((m.kind === 'switch' || m.kind === 'conduit') && m.opens) ids[m.opens] = true;
  }
  return ids;
}

function refreshDoors(state, sec) {
  const lv = state.level;
  const switched = switchedDoorIds(sec);
  const sealed = {};
  for (const enc of (sec && sec.encounters) || []) {
    const prog = encState(lv, enc.id);
    if (!enc.lockdown || !prog.sealed) continue;
    if (enc.lockdown.entry) sealed[enc.lockdown.entry] = enc;
    if (enc.lockdown.exit && !enc.lockdown.noExit) sealed[enc.lockdown.exit] = enc;
  }
  const doors = [];
  for (const m of (sec && sec.mechanisms) || []) {
    if (m.kind !== 'door') continue;
    if (!sealed[m.id] && !(switched[m.id] && !lv.got[m.id])) continue;
    const box = doorBox(m);
    if (box) doors.push(box);
  }
  lv.closedDoors = doors;
}

function seal(state, sec, enc) {
  const prog = encState(state.level, enc.id);
  if (prog.sealed || !enc.lockdown) return;
  const p = state.players[state.localPlayerId];
  const entry = (sec.mechanisms || []).find((m) => m.kind === 'door' && m.id === enc.lockdown.entry);
  const box = doorBox(entry);
  if (box && prog.sealDelay && p) {
    const act = enc.activate;
    const toward = act ? [
      (act.min[0] + act.max[0]) / 2,
      0,
      (act.min[2] + act.max[2]) / 2,
    ] : [p.pos.x, 0, p.pos.z];
    if (!pushClear(p, box, toward)) return;
  }
  prog.sealed = true;
  prog.sealWait = 0;
  refreshDoors(state, sec);
  emit(state, 'lockdown', { encounter: enc.id, sealed: true });
}

function unseal(state, enc) {
  const prog = encState(state.level, enc.id);
  if (!prog.sealed) return;
  prog.sealed = false;
  refreshDoors(state, state._v2section);
  emit(state, 'lockdown', { encounter: enc.id, sealed: false });
}

function lockdownDelay(enc) {
  if (!enc.lockdown) return 0;
  if (enc.lockdown.delaySec != null) return enc.lockdown.delaySec;
  return enc.lockdown.waveSec ? 1 : 0;
}

function considerSeal(state, sec, enc, prog, dt) {
  if (!enc.lockdown || prog.sealed || lvCleared(state, enc)) return;
  const p = state.players[state.localPlayerId];
  const inside = enc.lockdown.threshold && inBox(enc.lockdown.threshold, p.pos.x, p.pos.y, p.pos.z);
  if (!inside && !(prog.sealWait > 0)) return;
  const delay = lockdownDelay(enc);
  if (delay <= 0) { seal(state, sec, enc); return; }
  if (!(prog.sealWait > 0)) {
    prog.sealWait = delay;
    prog.sealDelay = true;
  }
  prog.sealWait -= dt;
  if (prog.sealWait <= 0) seal(state, sec, enc);
}

function lvCleared(state, enc) {
  return !!(state.level.cleared && state.level.cleared[enc.id]);
}

export function v2Pre(state, dt) {
  const lv = state.level;
  const rt = state._v2section;
  if (!rt) return;
  const p = state.players[state.localPlayerId];
  refreshDoors(state, rt);
  for (const enc of rt.encounters || []) {
    const prog = encState(lv, enc.id);
    if (!prog.started) {
      const box = enc.activate || enc.zone;
      if (box && inBox(box, p.pos.x, p.pos.y, p.pos.z)) {
        prog.started = true;
        lv.spawned[enc.id] = true;
      }
    }
    if (!prog.started || lv.cleared[enc.id]) continue;
    noteKills(state, enc, prog);
    considerSeal(state, rt, enc, prog, dt);
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
    tickBossScript(state, enc, dt);
    noteKills(state, enc, prog);
    if (enc.fleeAt) {
      for (const e of state.enemies) {
        if (e.dead || e.campaignEnc !== enc.id || !e.boss) continue;
        if (e.hp / e.maxHp > enc.fleeAt) continue;
        e.dead = true;
        e.fled = true;
        if (!lv.fled) lv.fled = {};
        lv.fled[enc.id] = true;
        const flag = `${enc.id}.fled`;
        for (const m of (sec && sec.mechanisms) || []) {
          if (m.opens === flag) lv.got[m.id] = true;
        }
        emit(state, 'bossEscape', { id: e.id, bossType: e.type });
      }
    }
    if (enc.lockdown && enc.lockdown.stallSec && prog.sealed && !lv.cleared[enc.id]) {
      const left = [];
      for (const e of state.enemies) if (!e.dead && e.campaignEnc === enc.id) left.push(e);
      if (left.length > 0 && left.length <= (enc.lockdown.stallN || 2)) prog.stall = (prog.stall || 0) + dt;
      else prog.stall = 0;
      if ((prog.stall || 0) >= enc.lockdown.stallSec) {
        for (const e of left) { e.ai.charge = true; e.marked = true; }
      }
    }
    if (objectiveDone(state, enc, prog)) {
      lv.cleared[enc.id] = true;
      unseal(state, enc);
      emit(state, 'encounterClear', { id: enc.id });
    }
  }
  if (p.dead) {
    let rewind = null;
    for (const enc of sec.encounters || []) {
      if (enc.lockdown && encState(lv, enc.id).sealed && !lv.cleared[enc.id]) rewind = enc.id;
    }
    if (rewind) { lv._rewind = rewind; return; }
    lv.lost = true;
    emit(state, 'levelLost', { level: lv.id });
    return;
  }
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
  const lids = [];
  for (const enc of (sec && sec.encounters) || []) {
    const room = enc.lockdown && enc.lockdown.room;
    if (room) lids.push(room);
    if (enc.lid) lids.push(enc.lid);
  }
  if (lids.length) state.level.flyerLids = lids;
  else if (state.level.flyerLids) delete state.level.flyerLids;
  if (sec && sec.navLinks) state.level.navLinks = sec.navLinks;
  else if (state.level.navLinks) delete state.level.navLinks;
  if (sec) bindV2Section(state, sec);
}
