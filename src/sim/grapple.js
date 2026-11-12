// Grapple hook. Campaign, Wave Mode and Sandbox only. PvP never calls this.
import { GAMEPLAY as G } from '../data/gameplay.js';
import { dirFromYawPitch } from '../core/math.js';
import { emit } from './events.js';
import { eyePos, rayWorld } from './collision.js';
import { activeSolids, firstSolid } from './campaign/solids.js';
import { releaseGrappleSpeed, steerGrapple } from './grappleMotion.js';

function inBox(box, x, y, z) {
  if (!box || !box.min || !box.max) return false;
  return x >= box.min[0] && x <= box.max[0] && y >= box.min[1] && y <= box.max[1] && z >= box.min[2] && z <= box.max[2];
}

export function sealOf(state, p) {
  const sec = state._v2section;
  const book = state.level && state.level.v2 && state.level.v2.enc;
  if (!sec || !book) return null;
  for (const enc of sec.encounters || []) {
    const prog = book[enc.id];
    const room = enc.lockdown && enc.lockdown.room;
    if (!prog || !prog.sealed || !room) continue;
    if (inBox(room, p.pos.x, p.pos.y + 0.4, p.pos.z)) return room;
  }
  return null;
}

function blocked(state, x, y, z) {
  const zones = (state.level && state.level.noGrapple) || [];
  for (let i = 0; i < zones.length; i++) if (inBox(zones[i], x, y, z)) return true;
  return false;
}

function snapAnchor(state, point, origin, maxDist) {
  const anchors = (state.level && state.level.grappleAnchors) || [];
  let best = null;
  let bd = 2.4;
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const at = a.at;
    if (!at) continue;
    const d = Math.hypot(at[0] - point.x, (at[1] || 0) - point.y, at[2] - point.z);
    const reach = a.r == null ? 2.4 : a.r;
    if (d <= reach && d < bd && Math.hypot(at[0] - origin.x, (at[1] || 0) - origin.y, at[2] - origin.z) <= maxDist) {
      bd = d;
      best = { x: at[0], y: at[1] || 0, z: at[2], id: a.id || null };
    }
  }
  return best;
}

function anchorOnRay(state, origin, dir, maxDist) {
  const anchors = (state.level && state.level.grappleAnchors) || [];
  let best = null;
  let bt = maxDist;
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const at = a.at;
    if (!at) continue;
    const ox = at[0] - origin.x, oy = (at[1] || 0) - origin.y, oz = at[2] - origin.z;
    if (Math.hypot(ox, oy, oz) > maxDist) continue;
    const t = ox * dir.x + oy * dir.y + oz * dir.z;
    if (t < 0.4 || t > maxDist) continue;
    const px = origin.x + dir.x * t, py = origin.y + dir.y * t, pz = origin.z + dir.z * t;
    const miss = Math.hypot(at[0] - px, (at[1] || 0) - py, at[2] - pz);
    const reach = a.r == null ? 1.4 : a.r;
    if (miss <= reach && t < bt) {
      bt = t;
      best = { x: at[0], y: at[1] || 0, z: at[2], id: a.id || null, t };
    }
  }
  return best;
}

export function findHook(state, p) {
  const origin = eyePos(p);
  const dir = dirFromYawPitch(p.yaw, p.pitch);
  const maxDist = G.grappleRange;
  const solids = activeSolids(state);
  let hit = null;
  if (solids) {
    const wall = firstSolid(solids, origin, dir, maxDist, null, true);
    if (wall) {
      hit = {
        x: origin.x + dir.x * wall.t,
        y: origin.y + dir.y * wall.t,
        z: origin.z + dir.z * wall.t,
        t: wall.t,
        id: wall.solid.id || null,
      };
    }
  }
  const groundT = rayWorld(origin, dir, maxDist);
  if (groundT > 0.4 && groundT < maxDist && (!hit || groundT < hit.t)) {
    hit = {
      x: origin.x + dir.x * groundT,
      y: origin.y + dir.y * groundT,
      z: origin.z + dir.z * groundT,
      t: groundT,
      id: 'ground',
    };
  }
  const along = anchorOnRay(state, origin, dir, maxDist);
  if (along && (!hit || along.t <= hit.t + 0.4)) hit = along;
  if (hit) {
    const snapped = snapAnchor(state, hit, origin, maxDist);
    if (snapped) hit = snapped;
  }
  if (!hit || blocked(state, hit.x, hit.y, hit.z)) return null;
  const room = sealOf(state, p);
  if (room && !inBox(room, hit.x, hit.y, hit.z)) return null;
  return { x: hit.x, y: hit.y, z: hit.z, id: hit.id || null };
}

function stillClear(state, p, hook) {
  const origin = eyePos(p);
  const dx = hook.x - origin.x, dy = hook.y - origin.y, dz = hook.z - origin.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  const solids = activeSolids(state);
  if (!solids) return true;
  const wall = firstSolid(solids, origin, { x: dx / dist, y: dy / dist, z: dz / dist }, dist - 0.35, null, true);
  return !wall;
}

export function clampToRoom(p, room) {
  if (!room) return;
  const pad = 0.45;
  if (p.pos.x < room.min[0] + pad) { p.pos.x = room.min[0] + pad; if (p.vel.x < 0) p.vel.x = 0; }
  if (p.pos.x > room.max[0] - pad) { p.pos.x = room.max[0] - pad; if (p.vel.x > 0) p.vel.x = 0; }
  if (p.pos.z < room.min[2] + pad) { p.pos.z = room.min[2] + pad; if (p.vel.z < 0) p.vel.z = 0; }
  if (p.pos.z > room.max[2] - pad) { p.pos.z = room.max[2] - pad; if (p.vel.z > 0) p.vel.z = 0; }
  if (p.pos.y > room.max[1] - 0.3) { p.pos.y = room.max[1] - 0.3; if (p.vel.y > 0) p.vel.y = 0; }
}

function releaseGrapple(state, p) {
  if (!p.grapple) return;
  releaseGrappleSpeed(p.vel);
  p.grapple = null;
  emit(state, 'grappleRelease', { playerId: p.id });
}

export function tickGrapple(state, p, dt) {
  if (p.grappleCd > 0) p.grappleCd = Math.max(0, p.grappleCd - dt);
  const c = p.cmd || {};
  const held = !!(c.held && c.held.grapple);
  if (!held || p.downed) {
    releaseGrapple(state, p);
    return;
  }
  if (!p.grapple) {
    if (p.grappleCd > 0) return;
    const hook = findHook(state, p);
    p.grappleCd = G.grappleCd;
    if (!hook) {
      p.grappleMiss = true;
      return;
    }
    delete p.grappleMiss;
    p.grapple = hook;
    emit(state, 'grapple', { playerId: p.id, pos: { x: hook.x, y: hook.y, z: hook.z }, id: hook.id });
  }
  const hook = p.grapple;
  if (!stillClear(state, p, hook)) {
    releaseGrapple(state, p);
    return;
  }
  const originY = p.pos.y + G.grappleOrigin;
  const dx = hook.x - p.pos.x, dy = hook.y - originY, dz = hook.z - p.pos.z;
  if (steerGrapple(p.vel, dx, dy, dz, dt) === 'arrive') releaseGrapple(state, p);
  const room = sealOf(state, p);
  if (room) {
    const pad = 0.45;
    if (p.pos.x < room.min[0] + pad) p.pos.x = room.min[0] + pad;
    if (p.pos.x > room.max[0] - pad) p.pos.x = room.max[0] - pad;
    if (p.pos.z < room.min[2] + pad) p.pos.z = room.min[2] + pad;
    if (p.pos.z > room.max[2] - pad) p.pos.z = room.max[2] - pad;
    if (p.pos.y > room.max[1] - 0.2) { p.pos.y = room.max[1] - 0.2; if (p.vel.y > 0) p.vel.y = 0; }
  }
}
