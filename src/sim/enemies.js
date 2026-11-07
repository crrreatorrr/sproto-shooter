// Enemy AI: FSM + steering + behaviors (grunt, spitter, bouncer, tank, dummy). PLAN §4.8
import { ENEMIES } from '../data/enemies.js';
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
  if (r > ARENA_R - 3) { const k = (r - (ARENA_R - 3)) / 3; wx = (-e.pos.x / r) * k; wz = (-e.pos.z / r) * k; }
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

const BEHAVIORS = {
  grunt: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      if (e.state === 'chase') {
        faceToward(e, t, deg(540), dt);
        approachVel(e, steer(state, e, t, def.weights), speed, def.accel, dt);
        if (d < def.range + e.radius * e.scale + TUNING.playerRadius) {
          setState(e, 'attack'); e.attack = { phase: 'windup', t: 0, hasHit: false };
          emit(state, 'enemyAttack', { id: e.id, type: e.type });
        }
      } else if (e.state === 'attack') {
        const a = e.attack; a.t += dt;
        faceToward(e, t, deg(200), dt);
        if (a.phase === 'windup') { approachVel(e, { x: 0, z: 0 }, 0, 30, dt); if (a.t >= def.windup) { a.phase = 'active'; a.t = 0; } }
        else if (a.phase === 'active') {
          const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
          e.vel.x = fx * 3; e.vel.z = fz * 3;
          if (!a.hasHit) {
            const c = { x: e.pos.x + fx * 1.0 * e.scale, y: e.pos.y + 1.0, z: e.pos.z + fz * 1.0 * e.scale };
            if (hitPlayerSphere(state, c, 1.0 * e.scale, def.damage * e.dmgMult, 'enemy', e.pos)) a.hasHit = true;
          }
          if (a.t >= def.active) { a.phase = 'recover'; a.t = 0; }
        } else { approachVel(e, { x: 0, z: 0 }, 0, 20, dt); if (a.t >= def.recover) setState(e, 'chase'); }
      }
    },
  },
  spitter: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      e.attack.cd = (e.attack.cd ?? 1.5) - dt;
      faceToward(e, t, deg(360), dt);
      if (e.state === 'chase') {
        const w = { ...def.weights };
        let inv = false;
        if (d < def.keepMin) inv = true;
        else if (d < def.keepMax) w.seek = 0.1;
        approachVel(e, steer(state, e, t, w, inv), speed, def.accel, dt);
        if (e.attack.cd <= 0 && d < 22) {
          setState(e, 'attack'); e.attack.phase = 'windup'; e.attack.t = 0;
          emit(state, 'enemyAttack', { id: e.id, type: e.type });
        }
      } else if (e.state === 'attack') {
        const a = e.attack; a.t += dt;
        approachVel(e, { x: 0, z: 0 }, 0, 20, dt);
        if (a.t >= def.windup) {
          // ballistic lob, no leading, ~1.1 s flight
          const sp = { x: e.pos.x, y: e.pos.y + 1.1 * e.scale, z: e.pos.z };
          const T = 1.1, g = 14;
          const tx = t.pos.x, ty = t.pos.y + 0.8, tz = t.pos.z;
          createProjectile(state, {
            kind: 'spit', faction: 'enemy', ownerId: e.id, sourceKind: 'enemy', pos: sp,
            vel: { x: (tx - sp.x) / T, y: (ty - sp.y + 0.5 * g * T * T) / T, z: (tz - sp.z) / T },
            radius: 0.3, gravity: g, damage: def.damage * e.dmgMult, ttl: 4, element: 'goo',
            splash: { radius: 1.5, damage: def.damage * e.dmgMult },
          });
          e.attack.cd = def.cooldown;
          setState(e, 'chase');
        }
      }
    },
  },
  bouncer: {
    update(state, e, t, def, speed, dt) {
      if (e.state !== 'chase') return;
      const onGround = e.pos.y <= 0.001;
      if (onGround) {
        if (e.ai.airborne) {
          e.ai.airborne = false;
          e.vel.x *= 0.2; e.vel.z *= 0.2;
          const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
          createHazard(state, { kind: 'stompRing', pos: { x: e.pos.x, y: 0.05, z: e.pos.z }, radius: def.stompRadius * e.scale, maxRadius: def.stompRadius * e.scale, ttl: 0.35 });
          if (d < def.stompRadius * e.scale + TUNING.playerRadius) enemyAoE(state, e.pos, def.stompRadius * e.scale, def.damage * e.dmgMult, 'enemy', 1.2);
          emit(state, 'stomp', { id: e.id, pos: { ...e.pos } });
        } else {
          e.vel.x *= Math.max(0, 1 - 10 * dt); e.vel.z *= Math.max(0, 1 - 10 * dt);
        }
        e.ai.hopT -= dt;
        if (e.ai.hopT <= 0) {
          e.ai.hopT = range(state.rng, def.hopMin, def.hopMax);
          const base = Math.atan2(t.pos.x - e.pos.x, t.pos.z - e.pos.z) + range(state.rng, -deg(60), deg(60));
          const dist = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
          const h = Math.min(speed, dist / 1.0 + 1);
          e.vel.x = Math.sin(base) * h; e.vel.z = Math.cos(base) * h; e.vel.y = def.hopVy;
          e.ai.airborne = true;
          e.yaw = yawTo(e.pos, t.pos);
        }
      }
    },
  },
  tank: {
    update(state, e, t, def, speed, dt) {
      const d = Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z);
      if (e.state === 'chase') {
        faceToward(e, t, deg(def.turnRate), dt);
        const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
        approachVel(e, { x: fx, z: fz }, d > 2 ? speed : 0, def.accel, dt);
        const ang = Math.abs(angleWrap(yawTo(e.pos, t.pos) - e.yaw));
        if (d < def.range && ang < deg(30)) {
          setState(e, 'attack'); e.attack = { phase: 'windup', t: 0, hasHit: false };
          emit(state, 'enemyAttack', { id: e.id, type: e.type });
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
      approachVel(e, { x: 0, z: 0 }, 0, 25, dt);
      if (e.stateT >= def.staggerTime) setState(e, 'chase');
    } else {
      if (e.state === 'idle' && e.type !== 'dummy') setState(e, 'chase');
      const slow = e.status.goo ? 1 - e.status.goo.slow : 1;
      BEHAVIORS[e.type].update(state, e, target, def, def.speed * e.speedMult * slow, dt);
    }
    // integrate
    const grav = e.type === 'bouncer' ? 20 : 30;
    e.vel.y -= grav * dt;
    e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; e.pos.z += e.vel.z * dt;
    if (e.pos.y <= 0) { e.pos.y = 0; if (e.vel.y < 0) e.vel.y = 0; }
    // knockback damping for non-bouncers
    if (e.type !== 'bouncer' && e.state !== 'chase' && e.state !== 'attack') { e.vel.x *= Math.max(0, 1 - 4 * dt); e.vel.z *= Math.max(0, 1 - 4 * dt); }
  }
  resolveOverlaps(state);
}

export function resolveOverlaps(state) {
  const es = state.enemies;
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    if (a.dead) continue;
    const ra = entityDef(a).radius * a.scale;
    const ma = a.boss || a.type === 'tank' ? 5 : 1;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j];
      if (b.dead) continue;
      if (a.type === 'hexAuditor' || b.type === 'hexAuditor') continue;
      const rb = entityDef(b).radius * b.scale;
      const mb = b.boss || b.type === 'tank' ? 5 : 1;
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
    if (a.type !== 'hexAuditor') { clampToArena(a, ra); pushOutOfBoxes(state, a, ra); }
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
    clampToArena(p, TUNING.playerRadius);
  }
}

export { float };
