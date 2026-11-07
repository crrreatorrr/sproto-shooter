// Enemy AI: FSM + steering + behaviors (midget runner, obama shooter, gunner two-weapon robot, bigObama heavy, dummy). PLAN §4.8
import { ENEMIES, ENEMY_BULLET_RADIUS } from '../data/enemies.js';
import { ARENA_R, TUNING } from '../data/tuning.js';
import { float, range } from '../core/rng.js';
import { angleWrap, yawTo, deg } from '../core/math.js';
import { emit } from './events.js';
import { clampToArena, pushOutOfBoxes, entityDef } from './collision.js';
import { hitPlayerSphere, enemyAoE } from './combat.js';
import { createProjectile, createHazard } from './state.js';

export function nearestPlayer(state, pos) {
  let best = null, bd = Infinity;
  for (const p of Object.values(state.players)) {
    if (p.dead) continue;
    const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function setState(e, s) { e.state = s; e.stateT = 0; }

function steer(state, e, target, w, invertSeek = false) {
  let sx = target.pos.x - e.pos.x, sz = target.pos.z - e.pos.z;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl; sz /= sl;
  if (invertSeek) { sx = -sx; sz = -sz; }
  let px = 0, pz = 0;
  for (const o of state.enemies) {
    if (o === e || o.dead) continue;
    const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z;
    const rr = e.radius * e.scale + o.radius * o.scale + 0.6;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr) { const k = 1 / Math.max(d2, 0.01); px += dx * k; pz += dz * k; }
  }
  const r = Math.hypot(e.pos.x, e.pos.z);
  let wx = 0, wz = 0;
  if (state.mode !== 'campaign' && r > ARENA_R - 3) { const k = (r - (ARENA_R - 3)) / 3; wx = (-e.pos.x / r) * k; wz = (-e.pos.z / r) * k; }
  const stx = -sz * e.ai.strafeDir, stz = sx * e.ai.strafeDir;
  let dx = w.seek * sx + w.sep * px + w.wall * wx + w.strafe * stx;
  let dz = w.seek * sz + w.sep * pz + w.wall * wz + w.strafe * stz;
  const dl = Math.hypot(dx, dz) || 1;
  return { x: dx / dl, z: dz / dl };
}

function approachVel(e, desired, speed, accel, dt) {
  const tx = desired.x * speed, tz = desired.z * speed;
  const dx = tx - e.vel.x, dz = tz - e.vel.z;
  const dl = Math.hypot(dx, dz);
  const a = accel * dt;
  if (dl > 0) { const k = Math.min(1, a / dl); e.vel.x += dx * k; e.vel.z += dz * k; }
}

function faceToward(e, target, maxRate, dt) {
  const want = yawTo(e.pos, target.pos);
  const d = angleWrap(want - e.yaw);
  const step = maxRate * dt;
  e.yaw = angleWrap(e.yaw + Math.max(-step, Math.min(step, d)));
}

/**
 * Enemy gun: wind up, then a burst of slow, inaccurate shots aimed at the player's chest (no leading).
 * gun.kind = projectile kind (default bitcoin 'bullet'); gun.from = muzzle as fractions of the enemy's height
 * ({ up, fwd, side }, side + = its left); `slot` keeps a second weapon's timers apart (ai[slot + 'gunCd']...).
 * gun.trackDone: ai[slot + 'doneT'] counts up from the last burst's final shot (the renderer finishes the firing clip
 * with it; off for older enemies so their state, and the locked baseline hashes, stay identical).
 */
function enemyGun(state, e, t, gun, dt, canFire, slot = '') {
  const ai = e.ai;
  const K = (n) => slot + n;
  if (ai[K('gunCd')] == null) ai[K('gunCd')] = range(state.rng, 0.8, gun.cooldownMax);
  if (gun.trackDone && ai[K('doneT')] != null) ai[K('doneT')] += dt;
  if (ai[K('burstLeft')] > 0) {
    ai[K('burstT')] -= dt;
    if (ai[K('burstT')] <= 0) {
      ai[K('burstLeft')]--;
      ai[K('burstT')] = gun.burstGap;
      if (gun.trackDone && ai[K('burstLeft')] === 0) ai[K('doneT')] = 0;
      const sc = e.scale;
      let from;
      if (gun.from) {
        const h = e.height * sc, fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
        const f = gun.from.fwd * h, side = -(gun.from.side || 0) * h; // + side = the model's left = -right
        from = { x: e.pos.x + fx * f + rx * side, y: e.pos.y + gun.from.up * h, z: e.pos.z + fz * f + rz * side };
      } else from = { x: e.pos.x - Math.sin(e.yaw) * 0.6 * sc, y: e.pos.y + e.height * 0.7 * sc, z: e.pos.z - Math.cos(e.yaw) * 0.6 * sc };
      const dx = t.pos.x - from.x, dy = t.pos.y + 1.1 - from.y, dz = t.pos.z - from.z;
      const dl = Math.hypot(dx, dy, dz) || 1;
      const d = cone(state, { x: dx / dl, y: dy / dl, z: dz / dl }, gun.spread);
      const kind = gun.kind || (gun.small ? 'pellet' : 'bullet');
      createProjectile(state, {
        kind, faction: 'enemy', ownerId: e.id, sourceKind: 'enemy', pos: from,
        vel: { x: d.x * gun.speed, y: d.y * gun.speed, z: d.z * gun.speed }, radius: gun.radius || (gun.small ? ENEMY_BULLET_RADIUS * 0.6 : ENEMY_BULLET_RADIUS),
        damage: gun.damage * e.dmgMult, ttl: 3,
      });
      emit(state, 'enemyShot', { id: e.id, enemyType: e.type, pos: from, kind });
    }
    return true;
  }
  if (ai[K('aimT')] > 0) {
    ai[K('aimT')] -= dt;
    if (ai[K('aimT')] <= 0) { ai[K('burstLeft')] = gun.burst; ai[K('burstT')] = 0; }
    return true;
  }
  ai[K('gunCd')] -= dt;
  const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
  if (canFire && ai[K('gunCd')] <= 0 && d < gun.range && !t.downed) {
    ai[K('gunCd')] = range(state.rng, gun.cooldownMin, gun.cooldownMax);
    ai[K('aimT')] = gun.windup;
    emit(state, 'enemyAttack', { id: e.id, enemyType: e.type, special: !!slot });
    return true;
  }
  return false;
}

function cone(state, aim, spreadDeg) {
  const th = deg(spreadDeg) * Math.sqrt(float(state.rng));
  const ph = float(state.rng) * Math.PI * 2;
  const up = Math.abs(aim.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  let rx = aim.y * up.z - aim.z * up.y, ry = aim.z * up.x - aim.x * up.z, rz = aim.x * up.y - aim.y * up.x;
  const rl = Math.hypot(rx, ry, rz); rx /= rl; ry /= rl; rz /= rl;
  const ux = ry * aim.z - rz * aim.y, uy = rz * aim.x - rx * aim.z, uz = rx * aim.y - ry * aim.x;
  const st = Math.sin(th), ct = Math.cos(th), cp = Math.cos(ph), sp = Math.sin(ph);
  return { x: aim.x * ct + (rx * cp + ux * sp) * st, y: aim.y * ct + (ry * cp + uy * sp) * st, z: aim.z * ct + (rz * cp + uz * sp) * st };
}

const BEHAVIORS = {
  midget: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      if (e.state === 'chase') {
        faceToward(e, t, deg(720), dt);
        approachVel(e, steer(state, e, t, def.weights), speed, def.accel, dt);
        if (d < def.range + e.radius * e.scale + TUNING.playerRadius) {
          setState(e, 'attack'); e.attack = { phase: 'windup', t: 0, hasHit: false };
          emit(state, 'enemyAttack', { id: e.id, enemyType: e.type });
        }
      } else if (e.state === 'attack') {
        const a = e.attack; a.t += dt;
        faceToward(e, t, deg(300), dt);
        if (a.phase === 'windup') { approachVel(e, { x: 0, z: 0 }, 0, 30, dt); if (a.t >= def.windup) { a.phase = 'active'; a.t = 0; } }
        else if (a.phase === 'active') {
          const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
          e.vel.x = fx * 4; e.vel.z = fz * 4;
          if (!a.hasHit) {
            const c = { x: e.pos.x + fx * 0.9 * e.scale, y: e.pos.y + 0.8, z: e.pos.z + fz * 0.9 * e.scale };
            if (hitPlayerSphere(state, c, 0.9 * e.scale, def.damage * e.dmgMult, 'enemy', e.pos)) a.hasHit = true;
          }
          if (a.t >= def.active) { a.phase = 'recover'; a.t = 0; }
        } else { approachVel(e, { x: 0, z: 0 }, 0, 20, dt); if (a.t >= def.recover) setState(e, 'chase'); }
      }
    },
  },
  obama: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      faceToward(e, t, deg(360), dt);
      const w = { ...def.weights };
      let inv = false;
      if (d < def.keepMin) inv = true;
      else if (d < def.keepMax) w.seek = 0.1;
      const shooting = enemyGun(state, e, t, def.gun, dt, true);
      e.ai.shooting = shooting;
      approachVel(e, steer(state, e, t, w, inv), shooting ? speed * 0.35 : speed, def.accel, dt);
    },
  },
  // Two weapons: regular arm-gun bursts, and a charged special (def.special) on its own cooldown. Only one fires
  // at a time; the special gets first call when both are ready. ai.special tells the renderer which is firing.
  gunner: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      faceToward(e, t, deg(300), dt);
      const w = { ...def.weights };
      let inv = false;
      if (d < def.keepMin) inv = true;
      else if (d < def.keepMax) w.seek = 0.1;
      const ai = e.ai;
      const regularBusy = ai.aimT > 0 || ai.burstLeft > 0;
      const special = enemyGun(state, e, t, def.special, dt, !regularBusy, 'sp');
      const regular = special ? false : enemyGun(state, e, t, def.gun, dt, true);
      ai.special = special;
      ai.shooting = special || regular;
      approachVel(e, steer(state, e, t, w, inv), special ? 0 : regular ? speed * 0.35 : speed, def.accel, dt);
    },
  },
  flyingMidget: {
    update(state, e, t, def, speed, dt) {
      const ai = e.ai;
      ai.jinkT = (ai.jinkT ?? 0) - dt;
      if (ai.jinkT <= 0) {
        ai.jinkT = range(state.rng, def.jinkMin, def.jinkMax);
        ai.orbitDir = float(state.rng) < 0.5 ? -1 : 1;
        ai.alt = range(state.rng, def.altMin, def.altMax);
        ai.orbitR = range(state.rng, def.orbitMin, def.orbitMax);
      }
      const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const nx = dx / d, nz = dz / d;
      const radial = Math.max(-1, Math.min(1, (d - ai.orbitR) / 4));
      let wx = nx * radial + -nz * ai.orbitDir, wz = nz * radial + nx * ai.orbitDir;
      const r = Math.hypot(e.pos.x, e.pos.z);
      if (r > ARENA_R - 4) { wx -= e.pos.x / r; wz -= e.pos.z / r; }
      const wl = Math.hypot(wx, wz) || 1;
      approachVel(e, { x: wx / wl, z: wz / wl }, speed, def.accel, dt);
      e.vel.y += ((ai.alt - e.pos.y) * 3 - e.vel.y) * Math.min(1, 4 * dt);
      faceToward(e, t, deg(720), dt);
      ai.shooting = enemyGun(state, e, t, def.gun, dt, true);
    },
  },
  bigObama: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      if (e.state === 'chase') {
        faceToward(e, t, deg(def.turnRate), dt);
        const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
        const shooting = enemyGun(state, e, t, def.gun, dt, d > 5);
        e.ai.shooting = shooting;
        approachVel(e, { x: fx, z: fz }, d > 2 && !shooting ? speed : 0, def.accel, dt);
        const ang = Math.abs(angleWrap(yawTo(e.pos, t.pos) - e.yaw));
        if (!shooting && d < def.range && ang < deg(30)) {
          setState(e, 'attack'); e.attack = { phase: 'windup', t: 0, hasHit: false };
          emit(state, 'enemyAttack', { id: e.id, enemyType: e.type });
        }
      } else if (e.state === 'attack') {
        const a = e.attack; a.t += dt;
        approachVel(e, { x: 0, z: 0 }, 0, 20, dt);
        if (a.phase === 'windup' && a.t >= def.windup) {
          a.phase = 'recover'; a.t = 0;
          const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
          const c = { x: e.pos.x + fx * 1.2, y: 0, z: e.pos.z + fz * 1.2 };
          createHazard(state, { kind: 'stompRing', pos: { ...c, y: 0.05 }, radius: def.poundRadius, maxRadius: def.poundRadius, ttl: 0.4 });
          enemyAoE(state, c, def.poundRadius, def.damage * e.dmgMult, 'enemy', 1.5);
          emit(state, 'pound', { id: e.id, pos: c });
        } else if (a.phase === 'recover' && a.t >= def.recover) setState(e, 'chase');
      }
    },
  },
  dummy: {
    update(state, e, t, def, speed, dt) {
      if (e.ai.regenT > 0) { e.ai.regenT -= dt; if (e.ai.regenT <= 0) e.hp = e.maxHp; }
    },
  },
};

export function enemyAI(state, dt) {
  for (const e of state.enemies) {
    if (e.dead || e.boss) continue;
    const def = ENEMIES[e.type];
    e.stateT += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.bigHeadT > 0) e.bigHeadT -= dt;
    e.poise = Math.max(0, e.poise - e.poiseMax * 0.5 * dt);
    e.ai.strafeT -= dt;
    if (e.ai.strafeT <= 0) { e.ai.strafeT = range(state.rng, 2, 4); e.ai.strafeDir *= -1; }
    const target = nearestPlayer(state, e.pos);
    if (state.tuning.freezeEnemies || !target) {
      approachVel(e, { x: 0, z: 0 }, 0, 30, dt);
    } else if (e.state === 'spawning') {
      if (e.stateT >= 0.8) setState(e, 'chase');
    } else if (e.state === 'stagger') {
      e.ai.burstLeft = 0; e.ai.aimT = 0;
      approachVel(e, { x: 0, z: 0 }, 0, 25, dt);
      if (e.stateT >= def.staggerTime) setState(e, 'chase');
    } else {
      if (e.state === 'idle' && e.type !== 'dummy') setState(e, 'chase');
      const slow = e.status.goo ? 1 - e.status.goo.slow : 1;
      const beh = BEHAVIORS[e.type] || BEHAVIORS[def.behavior];
      beh.update(state, e, target, def, def.speed * e.speedMult * slow, dt);
    }
    // integrate (flyers hold altitude themselves; staggered flyers sag a bit)
    if (def.flying) { if (e.state === 'stagger' || e.state === 'spawning') e.vel.y += ((e.state === 'spawning' ? 2 : -3) - e.vel.y) * Math.min(1, 5 * dt); }
    else e.vel.y -= 30 * dt;
    e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; e.pos.z += e.vel.z * dt;
    const floorY = def.flying ? 0.6 : 0;
    if (e.pos.y <= floorY) { e.pos.y = floorY; if (e.vel.y < 0) e.vel.y = 0; }
    // knockback damping
    if (e.state !== 'chase' && e.state !== 'attack') { e.vel.x *= Math.max(0, 1 - 4 * dt); e.vel.z *= Math.max(0, 1 - 4 * dt); }
  }
  resolveOverlaps(state);
}

export function resolveOverlaps(state) {
  const es = state.enemies;
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    if (a.dead) continue;
    const ra = entityDef(a).radius * a.scale;
    const ma = a.boss || a.type === 'bigObama' ? 5 : 1;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j];
      if (b.dead) continue;
      if (a.type === 'hexAuditor' || b.type === 'hexAuditor') continue;
      if (Math.abs(a.pos.y - b.pos.y) > 1.5) continue;
      const rb = entityDef(b).radius * b.scale;
      const mb = b.boss || b.type === 'bigObama' ? 5 : 1;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      const min = ra + rb;
      if (d < min && d > 1e-4) {
        const push = (min - d);
        const nx = dx / d, nz = dz / d;
        const ka = mb / (ma + mb), kb = ma / (ma + mb);
        a.pos.x -= nx * push * ka; a.pos.z -= nz * push * ka;
        b.pos.x += nx * push * kb; b.pos.z += nz * push * kb;
      }
    }
    if (a.type !== 'hexAuditor') {
      if (state.mode !== 'campaign') clampToArena(a, ra);
      pushOutOfBoxes(state, a, ra);
    }
  }
  // push players out of enemies
  for (const p of Object.values(state.players)) {
    if (p.dead) continue;
    for (const e of es) {
      if (e.dead || e.type === 'hexAuditor') continue;
      const def = entityDef(e);
      if (p.pos.y > e.pos.y + def.height * e.scale) continue;
      const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      const min = def.radius * e.scale + TUNING.playerRadius;
      if (d < min && d > 1e-4) { p.pos.x = e.pos.x + (dx / d) * min; p.pos.z = e.pos.z + (dz / d) * min; }
    }
    if (state.mode !== 'campaign') clampToArena(p, TUNING.playerRadius);
  }
}

export { float };
