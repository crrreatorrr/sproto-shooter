// Section fields L02 stores beside the mechanism list: carpets, ziplines, and
// the canyon rescue. Nothing here runs unless the loaded section has the field.
import { emit } from '../events.js';
import { damagePlayer, onEnemyKilled } from '../combat.js';

function pointOn(from, to, u) {
  return {
    x: from[0] + (to[0] - from[0]) * u,
    y: (from[1] || 0) + ((to[1] || 0) - (from[1] || 0)) * u,
    z: from[2] + (to[2] - from[2]) * u,
  };
}

function lengthOf(from, to) {
  const dy = (to[1] || 0) - (from[1] || 0);
  return Math.hypot(to[0] - from[0], dy, to[2] - from[2]) || 1;
}

function near(p, q, r) {
  return Math.hypot(p.pos.x - q.x, p.pos.z - q.z) <= r && Math.abs(p.pos.y - q.y) < 2.2;
}

function rideBook(lv) {
  if (!lv.rides) lv.rides = {};
  return lv.rides;
}

function stepPlatform(st, from, to, speed, dt, pause) {
  const len = lengthOf(from, to);
  const prev = pointOn(from, to, st.u);
  if (st.pause > 0) {
    st.pause -= dt;
    return { prev, next: prev };
  }
  st.u += (st.dir || 1) * (speed / len) * dt;
  if (st.u >= 1) {
    st.u = 1;
    st.dir = -1;
    st.pause = pause || 0;
  } else if (st.u <= 0) {
    st.u = 0;
    st.dir = 1;
    st.pause = pause || 0;
  }
  return { prev, next: pointOn(from, to, st.u) };
}

function carry(p, prev, next) {
  if (!near(p, prev, 1.35)) return;
  p.pos.x += next.x - prev.x;
  p.pos.y = next.y;
  p.pos.z += next.z - prev.z;
}

export function noteSafeGround(state, sec) {
  const v = sec && sec.voidRescue;
  const lv = state.level;
  if (!v) {
    if (lv.safePos) delete lv.safePos;
    return;
  }
  const p = state.players[state.localPlayerId];
  if (!p || p.pos.y < v.y + 2) return;
  lv.safePos = { x: p.pos.x, y: Math.max(0, p.pos.y), z: p.pos.z };
}

export function tickVoid(state, sec) {
  const v = sec && sec.voidRescue;
  if (!v) return;
  const lv = state.level;
  const p = state.players[state.localPlayerId];
  if (p && p.pos.y < v.y) {
    const back = lv.safePos || { x: sec.start[0], y: sec.start[1] || 0, z: sec.start[2] };
    p.pos.x = back.x;
    p.pos.y = back.y;
    p.pos.z = back.z;
    p.vel.x = 0;
    p.vel.y = 0;
    p.vel.z = 0;
    damagePlayer(state, p, { base: p.maxHp * (v.penalty == null ? 0.25 : v.penalty), sourceKind: 'world', fromPos: { x: back.x, y: back.y, z: back.z } });
    emit(state, 'voidRescue', { penalty: v.penalty == null ? 0.25 : v.penalty });
  }
  for (const e of state.enemies) {
    if (e.dead || e.pos.y >= v.y) continue;
    e.noAmmoDrop = true;
    e.lastHit = { sourceId: p ? p.id : 0, sourceKind: 'world', element: 'none' };
    onEnemyKilled(state, e);
  }
}

export function tickRides(state, sec, dt) {
  const carpets = (sec && sec.carpets) || [];
  const zips = ((sec && sec.links) || []).filter((link) => link.kind === 'zipline');
  const lv = state.level;
  if (!carpets.length && !zips.length) {
    if (lv.rides) delete lv.rides;
    return;
  }
  const book = rideBook(lv);
  const p = state.players[state.localPlayerId];
  if (!p) return;
  for (const c of carpets) {
    if (!c.from || !c.to) continue;
    const st = book[c.id] || (book[c.id] = { u: 0, dir: 1, pause: 0, armed: c.mode !== 'onTrigger' });
    if (!st.armed) {
      if (near(p, pointOn(c.from, c.to, 0), 1.35)) st.armed = true;
      else continue;
    }
    const pause = c.mode === 'onTrigger' ? (c.returnAfter == null ? 4 : c.returnAfter) : (c.pause || 0);
    const moved = stepPlatform(st, c.from, c.to, c.speed || 3, dt, pause);
    if (st.u === 1) st.reached = true;
    carry(p, moved.prev, moved.next);
    if (c.mode === 'onTrigger' && st.reached && st.u === 0 && st.pause <= 0) {
      st.armed = false;
      st.reached = false;
    }
  }
  for (const z of zips) {
    if (!z.from || !z.to) continue;
    const st = book[z.id] || (book[z.id] = { u: 0, dir: 1, pause: 0, riding: false });
    if (!st.riding) {
      if (near(p, pointOn(z.from, z.to, 0), 1.2)) st.riding = true;
      else continue;
    }
    const len = lengthOf(z.from, z.to);
    const prev = pointOn(z.from, z.to, st.u);
    st.u = Math.min(1, st.u + ((z.speed || 16) / len) * dt);
    const next = pointOn(z.from, z.to, st.u);
    p.pos.x += next.x - prev.x;
    p.pos.y = next.y;
    p.pos.z += next.z - prev.z;
    if (st.u >= 1) { st.riding = false; st.u = 0; }
  }
}
