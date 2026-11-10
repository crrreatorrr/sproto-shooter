// Projectiles, hazards, pickups, allies, status effects, cleanup.
import { TUNING, ARENA_R } from '../data/tuning.js';
import { activeSolids, groundHeight, raySolids } from './campaign/solids.js';
import { ALLY } from '../data/enemies.js';
import { XP } from '../data/skills.js';
import { RES_IDS } from '../data/drops.js';
import { emit } from './events.js';
import { raycastEnemies, sphereHitsPlayer } from './collision.js';
import { damageEnemy, damagePlayer, explode, healPlayer, nearestEnemy, centerOf, enemyAoE } from './combat.js';
import { createProjectile } from './state.js';

// ---------------- Projectiles ----------------
export function projectiles(state, dt) {
  for (const p of state.projectiles) {
    if (p.dead) continue;
    p.vel.y -= p.gravity * dt;
    if (p.homing > 0) {
      const tgt = p.faction === 'enemy' ? Object.values(state.players).find((pl) => !pl.dead) : null;
      if (tgt) {
        const dx = tgt.pos.x - p.pos.x, dy = tgt.pos.y + 1.1 - p.pos.y, dz = tgt.pos.z - p.pos.z;
        const dl = Math.hypot(dx, dy, dz) || 1;
        let sp = Math.hypot(p.vel.x, p.vel.y, p.vel.z) || 1;
        if (p.homingSpeed) sp += (p.homingSpeed - sp) * Math.min(1, dt * 2); // missiles accelerate to cruise speed
        const k = Math.min(1, p.homing * dt);
        p.vel.x += ((dx / dl) * sp - p.vel.x) * k;
        p.vel.y += ((dy / dl) * sp - p.vel.y) * k;
        p.vel.z += ((dz / dl) * sp - p.vel.z) * k;
      }
    }
    const len = Math.hypot(p.vel.x, p.vel.y, p.vel.z) * dt;
    const dir = len > 0 ? { x: (p.vel.x * dt) / len, y: (p.vel.y * dt) / len, z: (p.vel.z * dt) / len } : { x: 0, y: 0, z: 1 };
    const shotSolids = activeSolids(state);
    if (shotSolids && len > 0) {
      const wall = raySolids(shotSolids, p.pos, dir, len);
      if (wall >= 0) {
        p.pos = { x: p.pos.x + dir.x * wall, y: p.pos.y + dir.y * wall, z: p.pos.z + dir.z * wall };
        detonate(state, p);
        continue;
      }
    }
    const end = { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt, z: p.pos.z + p.vel.z * dt };
    let consumed = false;
    if (p.faction === 'player') {
      const hit = raycastEnemies(state, p.pos, dir, len + p.radius, p.hitIds);
      if (hit) {
        damageEnemy(state, hit.e, {
          sourceId: p.ownerId, sourceKind: p.sourceKind, base: p.damage, element: p.element, elementChance: p.elementChance,
          zone: hit.zone, critMult: p.critMult, critChance: p.critChance, canCrit: p.kind === 'duckBullet' || p.kind === 'megaBullet' || p.kind === 'bigBullet' || p.kind === 'rubberBullet',
          point: hit.point, gunId: p.gunId, arcane: p.arcane, wacky: p.wacky, pellet: !!p.pellet,
        });
        p.hitIds[hit.e.id] = true;
        if (p.splash) explode(state, hit.point, p.splash, p.ownerId, p.element, p.sourceKind === 'spell' ? 'spell' : 'splash', false,
          { elementChance: p.sourceKind === 'spell' ? 1 : p.elementChance, arcane: p.arcane, wacky: p.wacky });
        if (p.pierce > 0) p.pierce--;
        else if (p.kind === 'duckBullet' && p.bounces > 0) { p.bounces--; p.vel.x *= -0.6; p.vel.z *= -0.6; p.vel.y = Math.abs(p.vel.y) + 4; emit(state, 'duckBounce', { pos: hit.point }); }
        else { p.dead = true; consumed = true; }
      }
    } else {
      for (const pl of Object.values(state.players)) {
        if (pl.dead) continue;
        if (sphereHitsPlayer(end, p.radius, pl)) {
          if (p.splash) { enemyAoE(state, end, p.splash.radius, p.splash.damage, p.sourceKind); emitEnemyBlast(state, p, end); }
          else damagePlayer(state, pl, { base: p.damage, sourceKind: p.sourceKind, fromPos: p.pos });
          p.dead = true; consumed = true; break;
        }
      }
    }
    if (consumed) continue;
    p.pos = end;
    if (p.pos.y <= 0) {
      if (p.bounces > 0) {
        p.bounces--; p.pos.y = 0.01; p.vel.y = Math.abs(p.vel.y) * 0.7;
        // duck rounds quack; anything else (the Car Part Monster's tyres) just thuds
        const duck = p.kind === 'duckBullet' || p.kind === 'rubberBullet';
        emit(state, duck ? 'duckBounce' : 'bounce', { pos: { ...p.pos }, kind: p.kind });
        // rubber rounds lose most of their speed on the bounce and pop shortly after, close to where they landed
        if (p.kind === 'rubberBullet') { p.vel.x *= 0.4; p.vel.z *= 0.4; p.vel.y *= 0.7; p.ttl = Math.min(p.ttl, 0.35); }
      }
      else { detonate(state, p); continue; }
    }
    const r = Math.hypot(p.pos.x, p.pos.z);
    if (state.mode !== 'campaign' && r > ARENA_R + (p.faction === 'enemy' ? 2 : 0)) {
      if (p.bounces > 0) { p.bounces--; const nx = p.pos.x / r, nz = p.pos.z / r; const vr = p.vel.x * nx + p.vel.z * nz; p.vel.x -= 2 * vr * nx; p.vel.z -= 2 * vr * nz; }
      else { detonate(state, p); continue; }
    }
    p.ttl -= dt;
    if (p.ttl <= 0) detonate(state, p);
  }
}

function detonate(state, p) {
  p.dead = true;
  if (!p.splash) { if (p.faction === 'player') emit(state, 'impact', { pos: { ...p.pos }, element: p.element }); return; }
  if (p.faction === 'player') {
    explode(state, { ...p.pos, y: Math.max(0.2, p.pos.y) }, p.splash, p.ownerId, p.element, p.sourceKind === 'spell' ? 'spell' : 'splash', false,
      { elementChance: p.sourceKind === 'spell' ? 1 : p.elementChance, arcane: p.arcane, wacky: p.wacky });
  } else {
    enemyAoE(state, p.pos, p.splash.radius, p.splash.damage, p.sourceKind, p.pos.y + 1.8);
    emitEnemyBlast(state, p, p.pos);
  }
}

/** Enemy splash effect: missiles and tyres explode, everything else (goo spit) splats. */
function emitEnemyBlast(state, p, pos) {
  if (p.kind === 'missile' || p.kind === 'tyre') emit(state, 'explosion', { pos: { x: pos.x, y: Math.max(0.3, pos.y), z: pos.z }, radius: p.splash.radius, element: 'none', enemy: true });
  else emit(state, 'splat', { pos: { ...pos }, element: p.element });
}

// ---------------- Hazards ----------------
function tickIce(state) {
  let live = false;
  for (let i = 0; i < state.hazards.length; i++) {
    const h = state.hazards[i];
    if (!h.dead && h.kind === 'icePatch') live = true;
  }
  const players = Object.values(state.players);
  let sticky = false;
  if (!live) {
    for (let i = 0; i < players.length; i++) if (players[i].iceSlow != null) sticky = true;
    if (!sticky) return;
  }
  for (let i = 0; i < players.length; i++) if (players[i].iceSlow != null) delete players[i].iceSlow;
  if (!live) return;
  for (let i = 0; i < state.hazards.length; i++) {
    const h = state.hazards[i];
    if (h.dead || h.kind !== 'icePatch') continue;
    for (let p = 0; p < players.length; p++) {
      const pl = players[p];
      if (pl.dead) continue;
      if (Math.hypot(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z) < h.radius + 0.4) pl.iceSlow = h.slow == null ? 0.15 : h.slow;
    }
  }
}

export function hazards(state, dt) {
  for (const h of state.hazards) {
    if (h.dead) continue;
    h.t += dt;
    if (h.kind === 'shockwave') {
      h.radius += h.speed * dt;
      for (const p of Object.values(state.players)) {
        if (p.dead || h.hitIds[p.id]) continue;
        const d = Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z);
        if (Math.abs(d - h.radius) < 0.5 + TUNING.playerRadius && p.pos.y < h.height) {
          h.hitIds[p.id] = true;
          damagePlayer(state, p, { base: h.damage, sourceKind: 'boss', fromPos: h.pos });
        }
      }
      if (h.radius >= h.maxRadius) h.dead = true;
    } else if (h.kind === 'meteorMarker') {
      if (h.t >= h.data.delay) {
        h.dead = true;
        explode(state, { ...h.pos, y: 0.3 }, { radius: h.radius, damage: h.damage, minFalloff: 0.5, selfMult: 0, knockback: 14 }, h.ownerId, 'fire', 'spell', false, { elementChance: 1 });
        emit(state, 'meteorImpact', { pos: { ...h.pos } });
      }
    }
    if (h.t >= h.ttl && h.kind !== 'shockwave') h.dead = true;
  }
  tickIce(state);
}

// ---------------- Status effects ----------------
export function statusEffects(state, dt) {
  for (const e of state.enemies) {
    if (e.dead) continue;
    const s = e.status;
    if (s.burn) {
      s.burn.t -= dt;
      s.burnTick += dt;
      if (s.burnTick >= 0.5) {
        s.burnTick -= 0.5;
        damageEnemy(state, e, { sourceId: s.burn.sourceId, sourceKind: 'dot', base: s.burn.dps * 0.5, element: 'fire', zone: 'body', noProc: true, canCrit: false });
      }
      if (s.burn && s.burn.t <= 0) s.burn = null;
    }
    if (s.goo) { s.goo.t -= dt; if (s.goo.t <= 0) s.goo = null; }
  }
}

// ---------------- Pickups ----------------
export function pickups(state, dt) {
  const p = state.players[state.localPlayerId];
  const intermission = state.wave && state.wave.phase === 'intermission';
  p.nearGunPickupId = null;
  let nearD = TUNING.gunPickupRadius;
  for (const k of state.pickups) {
    if (k.dead) continue;
    k.age += dt;
    k.ttl -= dt;
    if (k.ttl <= 0) { k.dead = true; continue; }
    const dx = p.pos.x - k.pos.x, dy = p.pos.y + 0.8 - k.pos.y, dz = p.pos.z - k.pos.z;
    const d = Math.hypot(dx, dy, dz);
    if (k.kind === 'gun') {
      k.vel.y -= 18 * dt;
      k.pos.x += k.vel.x * dt; k.pos.y += k.vel.y * dt; k.pos.z += k.vel.z * dt;
      const dropSolids = activeSolids(state);
      const floor = dropSolids ? Math.max(0.6, groundHeight(dropSolids, k.pos.x, k.pos.z, 0.2, k.pos.y, 2) + 0.3) : 0.6;
      if (k.pos.y < floor) { k.pos.y = floor; k.vel.y = 0; k.vel.x *= 0.85; k.vel.z *= 0.85; }
      clampR(k);
      if (!p.dead && d < nearD) { nearD = d; p.nearGunPickupId = k.id; }
      continue;
    }
    const wants = wantsPickup(p, k);
    if (!p.dead && wants && (d < TUNING.magnetRadius || k.magnetized || (intermission && k.age > 0.5))) k.magnetized = true;
    if (k.magnetized && wants && !p.dead) {
      const sp = Math.min(30, Math.hypot(k.vel.x, k.vel.y, k.vel.z) + TUNING.magnetAccel * dt);
      k.vel.x = (dx / d) * sp; k.vel.y = (dy / d) * sp; k.vel.z = (dz / d) * sp;
    } else {
      k.magnetized = false;
      k.vel.y -= 18 * dt;
      k.vel.x *= Math.max(0, 1 - 1.5 * dt); k.vel.z *= Math.max(0, 1 - 1.5 * dt);
    }
    k.pos.x += k.vel.x * dt; k.pos.y += k.vel.y * dt; k.pos.z += k.vel.z * dt;
    if (k.pos.y < 0.3) { k.pos.y = 0.3; k.vel.y = Math.abs(k.vel.y) * 0.3; }
    clampR(k);
    if (d < TUNING.collectRadius && wants && !p.dead) collect(state, p, k);
  }
}

function clampR(k) {
  const r = Math.hypot(k.pos.x, k.pos.z);
  if (r > ARENA_R - 0.5) { k.pos.x *= (ARENA_R - 0.5) / r; k.pos.z *= (ARENA_R - 0.5) / r; k.vel.x = k.vel.z = 0; }
}

function wantsPickup(p, k) {
  switch (k.kind) {
    case 'health': return p.hp < p.maxHp;
    case 'bigHealth': return p.hp < p.maxHp || p.shield < p.maxShield;
    case 'mana': return p.mana < p.maxMana;
    case 'ammo': return p.ammo[k.ammoType] < p.ammoCap[k.ammoType];
    default: return true;
  }
}

function collect(state, p, k) {
  k.dead = true;
  switch (k.kind) {
    case 'health': healPlayer(p, Math.max(k.amount, p.maxHp * 0.2)); break;
    case 'bigHealth': healPlayer(p, k.amount); p.shield = p.maxShield; break;
    case 'mana': p.mana = Math.min(p.maxMana, p.mana + k.amount); break;
    case 'ammo': p.ammo[k.ammoType] = Math.min(p.ammoCap[k.ammoType], p.ammo[k.ammoType] + k.amount); break;
    case 'resource': break;
    case 'tickets': p.tickets += k.amount; state.run.ticketsEarned += k.amount; break;
  }
  emit(state, 'pickup', { playerId: p.id, kind: k.kind, amount: k.amount, resId: k.resId, ammoType: k.ammoType, pos: { ...k.pos } });
}

// ---------------- Allies (mini Sprotos) ----------------
export function allies(state, dt) {
  for (const a of state.allies) {
    if (a.dead) continue;
    a.ttl -= dt;
    if (a.ttl <= 0) { a.dead = true; emit(state, 'allyPoof', { pos: { ...a.pos } }); continue; }
    const t = nearestEnemy(state, a.pos, 40);
    const owner = state.players[a.ownerId];
    let goal = t ? t.pos : owner ? owner.pos : a.pos;
    const dx = goal.x - a.pos.x, dz = goal.z - a.pos.z, d = Math.hypot(dx, dz) || 1;
    const want = t ? (d > ALLY.range * 0.6 ? ALLY.speed : 0) : (d > 3 ? ALLY.speed : 0);
    a.vel.x += ((dx / d) * want - a.vel.x) * Math.min(1, 8 * dt);
    a.vel.z += ((dz / d) * want - a.vel.z) * Math.min(1, 8 * dt);
    a.pos.x += a.vel.x * dt; a.pos.z += a.vel.z * dt;
    a.pos.y = Math.abs(Math.sin((state.time + a.id) * 9)) * 0.35;
    a.yaw = Math.atan2(-dx, -dz);
    a.fireCd -= dt;
    if (t && a.fireCd <= 0 && d < ALLY.range) {
      a.fireCd = ALLY.fireCd;
      const c = centerOf(t);
      const from = { x: a.pos.x, y: 0.6, z: a.pos.z };
      const ddx = c.x - from.x, ddy = c.y - from.y, ddz = c.z - from.z, dl = Math.hypot(ddx, ddy, ddz) || 1;
      createProjectile(state, {
        kind: 'gooBolt', faction: 'player', ownerId: a.ownerId, sourceKind: a.sourceKind === 'spell' ? 'spell' : 'gun',
        pos: from, vel: { x: (ddx / dl) * 22, y: (ddy / dl) * 22, z: (ddz / dl) * 22 }, radius: 0.2, damage: a.damage * 0.4, ttl: 2,
        splash: { radius: a.splashRadius, damage: a.damage * 0.6, minFalloff: 0.5, selfMult: 0, knockback: 2 }, element: 'none', ally: true,
      });
      emit(state, 'allyShot', { pos: from });
    }
  }
}

// ---------------- Cleanup ----------------
export function cleanup(state) {
  for (const key of ['enemies', 'projectiles', 'pickups', 'hazards', 'allies']) {
    const arr = state[key];
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      const keep = key === 'enemies' ? !(it.dead && (it.deadT = (it.deadT || 0) + 1) > 1) : !it.dead;
      if (keep) arr[w++] = it;
    }
    arr.length = w;
  }
  if (state.projectiles.length > 600) state.projectiles.splice(0, state.projectiles.length - 600);
}

export function snapshotPrev(state) {
  for (const p of Object.values(state.players)) { p.prevPos.x = p.pos.x; p.prevPos.y = p.pos.y; p.prevPos.z = p.pos.z; }
  for (const key of ['enemies', 'projectiles', 'pickups', 'allies']) {
    for (const e of state[key]) { e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; e.prevPos.z = e.pos.z; }
  }
}

export { RES_IDS, XP };
