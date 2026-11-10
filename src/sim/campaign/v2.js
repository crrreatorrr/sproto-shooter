// Format v2 director: several squads, triggers, objectives, lockdown doors.
// The corridor director still runs every level whose format is not 'v2'.
import { BOSSES } from '../../data/enemies.js';
import { emit } from '../events.js';
import { createEnemy, createBoss } from '../state.js';
import { damagePlayer } from '../combat.js';
import { inBox } from '../level/runtime.js';
import { solidFromPrimitive, solidsFromGeometry } from './solids.js';
import { tickBossScript } from './bossScript.js';
import { tickDuo } from './duo.js';

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
    if (!e.dead || e.dismissed || e.campaignEnc !== enc.id || prog.seen[e.id]) continue;
    prog.seen[e.id] = true;
    prog.kills++;
  }
}

function aliveOf(state, encId) {
  let n = 0;
  for (const e of state.enemies) if (!e.dead && e.campaignEnc === encId) n++;
  return n;
}

/** Bitbugs in a flock count as one unit per `flockUnit` bodies. Everyone else is one. */
function unitOf(enc, type) {
  const size = enc && enc.flockUnit;
  if (size > 0 && type === 'bitbug') return 1 / size;
  return 1;
}

function aliveUnits(state, enc) {
  let n = 0;
  for (const e of state.enemies) {
    if (e.dead || e.campaignEnc !== enc.id) continue;
    n += unitOf(enc, e.type);
  }
  return n;
}

function capOf(state, enc) {
  return enc.maxAlive || state.level.maxAlive || 8;
}

function roomFor(state, enc, type) {
  return aliveUnits(state, enc) + unitOf(enc, type) <= capOf(state, enc) + 1e-9;
}

/** Boss-script part clock. Part numbers in squad triggers are 1-based. */
function partClock(state, enc) {
  const book = state.level.scripts && state.level.scripts[enc.id];
  if (!book) return null;
  return { n: (book.part || 0) + 1, t: book.partT || 0 };
}

function triggerReady(state, enc, squad, prog) {
  const tr = squad.trigger || { type: 'onEnter' };
  if (tr.type === 'onEnter') return prog.started;
  if (tr.type === 'time') {
    if (tr.part != null) {
      const clock = partClock(state, enc);
      return !!clock && clock.n === tr.part && clock.t >= (tr.t || 0);
    }
    return prog.t >= (tr.t || 0);
  }
  if (tr.type === 'onKills') return prog.kills >= (tr.n || 1);
  if (tr.type === 'onRemain') {
    const byCount = prog.started && aliveOf(state, enc.id) <= (tr.n ?? 2) && Object.keys(prog.squads).length > 0;
    if (byCount) return true;
    const wait = waveWait(enc, squad);
    if (wait == null || wait <= 0 || !prog.started) return false;
    const keys = Object.keys(prog.squads);
    if (!keys.length) return false;
    const last = prog.squads[keys[keys.length - 1]];
    if (prog.t - (last.at || 0) < wait) return false;
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
  if (tr.type === 'onAlarm') {
    const at = state.level.alarms && state.level.alarms[tr.alarm];
    if (at == null) return false;
    const delay = squad.delay != null ? squad.delay : (tr.delay || 0);
    return (state.level.time || 0) - at >= delay;
  }
  return false;
}

/** Ring an alarm once. Optional `onAlarm` squads spawn `delay` seconds later. */
export function ringAlarm(state, id) {
  if (!id) return;
  const lv = state.level;
  if (lv.alarmsCut && lv.alarmsCut[id]) return;
  if (!lv.alarms) lv.alarms = {};
  if (lv.alarms[id] != null) return;
  lv.alarms[id] = lv.time || 0;
  emit(state, 'alarm', { id });
}

/** Seconds after the previous squad before the next `onRemain` squad may open anyway. */
function waveWait(enc, squad) {
  if (squad && squad.fallbackSec != null) return squad.fallbackSec;
  const lock = enc.lockdown;
  if (!lock) return null;
  if (lock.waveSec != null) return lock.waveSec;
  if (lock.fallbackSec != null) return lock.fallbackSec;
  return null;
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
  if (at.flockPart != null) e.flockPart = at.flockPart;
  if (at.role) e.role = at.role;
  if (at.alarm) e.alarm = at.alarm;
  if (at.ringsAlarm) e.ringsAlarm = at.ringsAlarm;
  if (bossDef) {
    if (enc.arena) e.boss.arena = enc.arena;
    emit(state, 'bossSpawn', { id: e.id, bossType: type });
  }
  return e;
}

function trySpawn(state, enc, squad, key) {
  const lv = state.level;
  const prog = encState(lv, enc.id);
  const spots = [];
  let i = 0;
  const flockPart = squad.trigger && squad.trigger.part != null ? squad.trigger.part : null;
  for (const u of squad.units || []) {
    for (let n = 0; n < u.count; n++) {
      const at = (squad.at && squad.at[Math.min(i, squad.at.length - 1)]) || [0, 0, 0];
      spots.push({
        type: u.type, pos: at, partId: u.partId || null, elite: !!u.elite, flockPart,
        role: u.role || null, alarm: u.alarm || null, ringsAlarm: squad.ringsAlarm || u.ringsAlarm || null,
      });
      i++;
    }
  }
  const born = [];
  for (const spot of spots) {
    if (!roomFor(state, enc, spot.type)) {
      prog.queue = prog.queue || [];
      prog.queue.push({ encId: enc.id, squad: key, spot, part: spot.flockPart });
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
    if (wantsHold(enc) && enc.hold && bodyIn(state, enc.hold)) {
      const rushed = enc.objective && enc.objective.also && enc.objective.also.kind === 'hold' && wavesClear(state, enc, prog);
      prog.hold = (prog.hold || 0) + dt * (rushed ? 3 : 1);
    }
    tickStrikes(state, enc, prog, dt);
    (enc.squads || []).forEach((squad, i) => {
      const key = squadKey(squad, i);
      if (prog.squads[key]) return;
      if (!triggerReady(state, enc, squad, prog)) return;
      trySpawn(state, enc, squad, key);
    });
    if (prog.queue && prog.queue.length) {
      const job = prog.queue[0];
      const clock = partClock(state, enc);
      if (job.part != null && clock && clock.n !== job.part) prog.queue.shift();
      else if (roomFor(state, enc, job.spot.type)) {
        prog.queue.shift();
        const squad = (enc.squads || []).find((s, i) => squadKey(s, i) === job.squad) || { method: 'door' };
        spawnOne(state, enc, squad, job.spot);
      }
    }
  }
}

function retirePartSquads(state, enc, prog) {
  const clock = partClock(state, enc);
  if (!clock) return;
  if (prog.partSeen == null) { prog.partSeen = clock.n; return; }
  if (prog.partSeen === clock.n) return;
  const ended = prog.partSeen;
  prog.partSeen = clock.n;
  (enc.squads || []).forEach((squad, i) => {
    if (!squad.trigger || squad.trigger.part !== ended) return;
    const key = squadKey(squad, i);
    if (!prog.squads[key]) prog.squads[key] = { at: prog.t, count: 0, skipped: true };
  });
  if (prog.queue) prog.queue = prog.queue.filter((job) => job.part !== ended);
  for (const e of state.enemies) {
    if (e.dead || e.campaignEnc !== enc.id || e.flockPart !== ended) continue;
    e.dead = true;
    e.hp = 0;
    e.dismissed = true;
  }
}

function wantsHold(enc) {
  const obj = enc.objective;
  if (!obj) return false;
  if (obj.kind === 'hold') return true;
  return !!(obj.also && obj.also.kind === 'hold');
}

function bodyIn(state, box) {
  const p = state.players[state.localPlayerId];
  if (p && !p.dead && inBox(box, p.pos.x, p.pos.y, p.pos.z)) return true;
  for (const a of state.allies || []) {
    if (a && !a.dead && a.pos && inBox(box, a.pos.x, a.pos.y, a.pos.z)) return true;
  }
  return false;
}

function wavesClear(state, enc, prog) {
  const accounted = (enc.squads || []).every((sq, i) => prog.squads[squadKey(sq, i)] || sq.optional);
  return !!(prog.started && accounted && aliveOf(state, enc.id) === 0 && !(prog.queue && prog.queue.length));
}

const STRIKE = { radius: 2.6, track: 1.8, lock: 0.75, player: 30, enemy: 120 };

function strikeDue(enc, n) {
  const times = enc.strikes || [];
  if (!times.length || n < 0) return Infinity;
  if (n < times.length) return times[n];
  return times[times.length - 1] + (n - times.length + 1) * (enc.strikeEvery || 14);
}

function tickStrikes(state, enc, prog, dt) {
  if (!enc.strikes || !enc.strikes.length) return;
  if (prog.strikeN == null) prog.strikeN = 0;
  if (prog.inbound) {
    prog.inbound.t += dt;
    const p = state.players[state.localPlayerId];
    const tracking = enc.strikeTrack != null ? enc.strikeTrack : STRIKE.track;
    if (p && prog.inbound.t < tracking) {
      prog.inbound.x = p.pos.x;
      prog.inbound.z = p.pos.z;
    }
    const track = enc.strikeTrack != null ? enc.strikeTrack : STRIKE.track;
    const lock = enc.strikeLock != null ? enc.strikeLock : STRIKE.lock;
    if (prog.inbound.t >= track + lock) {
      const hit = prog.inbound;
      const pNow = state.players[state.localPlayerId];
      if (pNow && !pNow.dead && Math.hypot(pNow.pos.x - hit.x, pNow.pos.z - hit.z) <= STRIKE.radius) {
        damagePlayer(state, pNow, { base: STRIKE.player, sourceKind: 'world', fromPos: { x: hit.x, y: 0, z: hit.z } });
      }
      for (const e of state.enemies) {
        if (e.dead || Math.hypot(e.pos.x - hit.x, e.pos.z - hit.z) > STRIKE.radius) continue;
        e.hp -= STRIKE.enemy;
        if (e.hp <= 0) { e.hp = 0; e.dead = true; }
      }
      emit(state, 'droneStrike', { x: hit.x, z: hit.z, encounter: enc.id });
      prog.inbound = null;
    }
  }
  if (!prog.inbound && prog.t >= strikeDue(enc, prog.strikeN)) {
    const p = state.players[state.localPlayerId];
    prog.inbound = { t: 0, x: p ? p.pos.x : 0, z: p ? p.pos.z : 0 };
    prog.strikeN += 1;
  }
}

function objectiveDone(state, enc, prog) {
  const kind = (enc.objective && enc.objective.kind) || 'clearAll';
  if (kind === 'clearAll' || kind === 'boss') {
    const waves = wavesClear(state, enc, prog);
    const also = enc.objective && enc.objective.also;
    if (also && also.kind === 'hold') return waves && (prog.hold || 0) >= (also.seconds || 1);
    return waves;
  }
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
    tickDuo(state, enc, dt);
    retirePartSquads(state, enc, prog);
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
  if (sec && sec.voids && sec.voids.length) state.level.voids = sec.voids;
  else if (state.level.voids) delete state.level.voids;
  if (sec && sec.noGrapple && sec.noGrapple.length) state.level.noGrapple = sec.noGrapple;
  else if (state.level.noGrapple) delete state.level.noGrapple;
  if (sec && sec.grappleAnchors && sec.grappleAnchors.length) state.level.grappleAnchors = sec.grappleAnchors;
  else if (state.level.grappleAnchors) delete state.level.grappleAnchors;
  if (sec) bindV2Section(state, sec);
}
