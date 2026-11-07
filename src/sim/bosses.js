// Boss phase machines: Mega Tinubu (physical, id megaSproto), Hex Sahil (magic, id hexAuditor). PLAN §4.11
// Each phase swaps the boss to the next Sproto Duel stage model (render side).
import { BOSSES, ENEMY_BULLET_RADIUS } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';
import { range, float } from '../core/rng.js';
import { yawTo, angleWrap, deg } from '../core/math.js';
import { emit } from './events.js';
import { createEnemy, createProjectile, createHazard, createPickup } from './state.js';
import { damagePlayer, knockPlayer, hitPlayerSphere } from './combat.js';
import { nearestPlayer, resolveOverlaps } from './enemies.js';
import { getLevelRuntime } from './level/runtime.js';

const ARENA_R = getLevelRuntime('arena').radius;

function start(e, id, data = {}) { e.boss.action = { id, t: 0, data }; }

function nextAction(state, e, def) {
  const phase = def.phases[e.boss.phaseIdx];
  const id = phase.pattern[e.boss.patternIdx++ % phase.pattern.length];
  start(e, id);
}

export function bosses(state, dt) {
  for (const e of state.enemies) {
    if (e.dead || !e.boss) continue;
    const def = BOSSES[e.type];
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.bigHeadT > 0) e.bigHeadT -= dt;
    const b = e.boss;
    const t = nearestPlayer(state, e.pos);
    // phase transitions
    const frac = e.hp / e.maxHp;
    const nxt = def.phases[b.phaseIdx + 1];
    if (nxt && frac <= nxt.hpBelow && !b.transitioning) {
      b.transitioning = true; b.invuln = true;
      start(e, 'transition', { duration: 2 });
      emit(state, 'bossPhase', { id: e.id, bossType: e.type, phaseIdx: b.phaseIdx + 1 });
    }
    if (state.tuning.freezeEnemies || !t) { continue; }
    const a = b.action;
    a.t += dt;
    const impl = e.type === 'megaSproto' ? MEGA : HEX;
    const done = impl(state, e, a, dt, def, t);
    if (done) {
      if (a.id === 'transition') {
        b.phaseIdx++; b.transitioning = false; b.invuln = false; b.patternIdx = 0;
        if (e.type === 'megaSproto' && b.phaseIdx === 1) summonGrunts(state, e);
      }
      nextAction(state, e, def);
    }
    // Hex mana orbs every 10% hp lost
    if (e.type === 'hexAuditor') {
      while (frac <= b.manaOrbNext && b.manaOrbNext > 0) {
        b.manaOrbNext -= 0.1;
        for (let i = 0; i < 2; i++) {
          const ang = range(state.rng, 0, Math.PI * 2);
          createPickup(state, { kind: 'mana', amount: TUNING.manaOrb, pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }, vel: { x: Math.cos(ang) * 4, y: 3, z: Math.sin(ang) * 4 } });
        }
      }
    }
  }
}

function summonGrunts(state, e) {
  const n = state.tier >= 5 ? 10 : 6;
  const pts = state.spawnPoints.slice().sort((p1, p2) => Math.hypot(p1.x - e.pos.x, p1.z - e.pos.z) - Math.hypot(p2.x - e.pos.x, p2.z - e.pos.z));
  for (let i = 0; i < n; i++) {
    const pt = pts[i % 4];
    if (i < 4) createHazard(state, { kind: 'spawnPortal', pos: { x: pt.x, y: 0, z: pt.z }, radius: 1.2, ttl: 0.8 });
    createEnemy(state, 'midget', { pos: { x: pt.x + range(state.rng, -1, 1), z: pt.z + range(state.rng, -1, 1) }, summoned: true });
  }
  emit(state, 'bossRoar', { id: e.id });
}

// ---------------- Mega Sproto ----------------
function MEGA(state, e, a, dt, def, t) {
  const phase = def.phases[e.boss.phaseIdx];
  const spd = def.speed * phase.speedMult * (e.status.goo ? 1 - e.status.goo.slow : 1);
  const toward = (s) => {
    const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
    e.vel.x = (dx / d) * s; e.vel.z = (dz / d) * s;
    e.yaw = yawTo(e.pos, t.pos);
  };
  const integrate = () => {
    e.vel.y -= 30 * dt;
    e.pos.x += e.vel.x * dt; e.pos.y += e.vel.y * dt; e.pos.z += e.vel.z * dt;
    if (e.pos.y <= 0) { e.pos.y = 0; e.vel.y = 0; }
    const r = Math.hypot(e.pos.x, e.pos.z), maxR = ARENA_R - def.radius;
    if (r > maxR) { e.pos.x *= maxR / r; e.pos.z *= maxR / r; return true; }
    return false;
  };
  // contact damage
  const contact = () => {
    for (const p of Object.values(state.players)) {
      if (p.dead) continue;
      const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
      if (d < def.radius + TUNING.playerRadius + 0.1 && p.pos.y < def.height && (e.ai.contactCd || 0) <= 0) {
        damagePlayer(state, p, { base: def.contactDamage * e.dmgMult, sourceKind: 'boss', fromPos: e.pos });
        knockPlayer(p, e.pos, 8, 4);
        e.ai.contactCd = 0.8;
      }
    }
  };
  e.ai.contactCd = (e.ai.contactCd || 0) - dt;

  switch (a.id) {
    case 'intro': e.vel.x = e.vel.z = 0; integrate(); return a.t > 2.0;
    case 'transition': e.vel.x = e.vel.z = 0; integrate(); return a.t >= 2;
    case 'chase': toward(spd); integrate(); contact(); return a.t >= 3;
    case 'charge': {
      if (!a.data.dir) {
        const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
        a.data.dir = { x: dx / d, z: dz / d };
        e.yaw = yawTo(e.pos, t.pos);
        createHazard(state, { kind: 'telegraphLine', pos: { x: e.pos.x, y: 0.05, z: e.pos.z }, ttl: 0.8, data: { dir: a.data.dir, len: 30, width: def.radius * 2 } });
        emit(state, 'bossTelegraph', { id: e.id, kind: 'charge' });
      }
      if (a.t < 0.8) { e.vel.x = e.vel.z = 0; integrate(); return false; }
      const cs = def.chargeSpeed * phase.speedMult;
      e.vel.x = a.data.dir.x * cs; e.vel.z = a.data.dir.z * cs;
      const hitWall = integrate();
      if (!a.data.hit) {
        for (const p of Object.values(state.players)) {
          if (p.dead) continue;
          if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < def.radius + TUNING.playerRadius + 0.3 && p.pos.y < def.height) {
            damagePlayer(state, p, { base: def.chargeDamage * e.dmgMult, sourceKind: 'boss', fromPos: e.pos });
            knockPlayer(p, e.pos, 12, 6);
            a.data.hit = true;
          }
        }
      }
      if (hitWall) { start(e, 'stunned'); emit(state, 'bossStunned', { id: e.id, pos: { ...e.pos } }); return false; }
      return a.t >= 2.8;
    }
    case 'stunned': e.vel.x = e.vel.z = 0; integrate(); return a.t >= 2.0;
    case 'volley': {
      // Fans of bitcoins: slow and spread out, so strafing dodges most of them.
      e.vel.x = e.vel.z = 0; integrate();
      e.yaw = yawTo(e.pos, t.pos);
      const v = def.volley;
      const waves = v.waves + (e.boss.phaseIdx >= 2 ? 1 : 0);
      if (a.t < 0.5) { if (!a.data.tele) { a.data.tele = true; emit(state, 'bossTelegraph', { id: e.id, kind: 'volley' }); } return false; }
      a.data.fired = a.data.fired || 0;
      while (a.data.fired < waves && a.t >= 0.5 + a.data.fired * v.gap) {
        const from = { x: e.pos.x - Math.sin(e.yaw) * 2.2, y: 3.2, z: e.pos.z - Math.cos(e.yaw) * 2.2 };
        const base = Math.atan2(t.pos.x - from.x, t.pos.z - from.z) + (a.data.fired % 2 ? deg(v.fan / v.count / 2) : 0);
        const pitch = Math.atan2(t.pos.y + 1.1 - from.y, Math.hypot(t.pos.x - from.x, t.pos.z - from.z));
        for (let i = 0; i < v.count; i++) {
          const yaw = base + deg(v.fan) * (i / (v.count - 1) - 0.5);
          const dir = { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
          createProjectile(state, { kind: 'bullet', faction: 'enemy', ownerId: e.id, sourceKind: 'boss', pos: { ...from },
            vel: { x: dir.x * v.speed, y: dir.y * v.speed, z: dir.z * v.speed }, radius: ENEMY_BULLET_RADIUS * 1.5, damage: v.damage * e.dmgMult, ttl: 4 });
        }
        a.data.fired++;
        emit(state, 'bossCast', { id: e.id, kind: 'volley' });
      }
      return a.t >= 0.5 + waves * v.gap + 0.4;
    }
    case 'slam': {
      if (!a.data.hopped) { a.data.hopped = true; e.vel.y = 10; e.vel.x = e.vel.z = 0; emit(state, 'bossTelegraph', { id: e.id, kind: 'slam' }); }
      integrate();
      const rings = e.boss.phaseIdx >= 1 ? 2 : 1;
      a.data.landed = a.data.landed || (a.t > 0.3 && e.pos.y <= 0);
      if (a.data.landed) {
        a.data.lt = (a.data.lt || 0) + dt;
        a.data.spawned = a.data.spawned || 0;
        if (a.data.spawned < rings && a.data.lt >= a.data.spawned * 0.6) {
          a.data.spawned++;
          createHazard(state, { kind: 'shockwave', pos: { x: e.pos.x, y: 0, z: e.pos.z }, radius: def.radius, maxRadius: 22, speed: 10, height: 0.6, ttl: 3, damage: def.slamDamage * e.dmgMult, ownerId: e.id });
          emit(state, 'explosion', { pos: { x: e.pos.x, y: 0.2, z: e.pos.z }, radius: 4, element: 'none', slam: true });
        }
        return a.data.lt >= 1.6;
      }
      return a.t > 3;
    }
    case 'summon': {
      e.vel.x = e.vel.z = 0; integrate();
      if (!a.data.done) {
        a.data.done = true;
        const alive = state.enemies.filter((o) => !o.dead && o.summoned).length;
        if (alive < 10) summonGrunts(state, e);
      }
      return a.t > 1.2;
    }
  }
  return true;
}

// ---------------- Hex Auditor ----------------
function orb(state, e, dir, speed, kind = 'orb', homing = 0, ttl = 6) {
  const def = BOSSES.hexAuditor;
  createProjectile(state, {
    kind, faction: 'enemy', ownerId: e.id, sourceKind: 'boss',
    pos: { x: e.pos.x + dir.x * 1.5, y: e.pos.y + dir.y * 1.5, z: e.pos.z + dir.z * 1.5 },
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    radius: 0.35, damage: (kind === 'taxBolt' ? def.taxDamage : def.orbDamage) * e.dmgMult, homing, ttl,
  });
}

function aimDir(e, t, yawOff = 0) {
  const dx = t.pos.x - e.pos.x, dy = t.pos.y + 1.2 - e.pos.y, dz = t.pos.z - e.pos.z;
  const h = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(dx, dz) + yawOff;
  const pitch = Math.atan2(dy, h);
  return { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
}

function HEX(state, e, a, dt, def, t) {
  const b = e.boss;
  const p3 = b.phaseIdx >= 2;
  const megaAlive = b.paired && state.enemies.some((o) => !o.dead && o.type === 'megaSproto');
  const cdMult = megaAlive ? 1.2 : 1;
  b.weakAngle += deg(p3 ? 200 : 120) * dt;
  // hover + drift toward point 12m from player
  const hoverY = def.hoverY + 0.25 * Math.sin(state.time * 2);
  e.pos.y += (hoverY - e.pos.y) * Math.min(1, 5 * dt);
  if (a.id !== 'teleport') {
    const dx = e.pos.x - t.pos.x, dz = e.pos.z - t.pos.z, d = Math.hypot(dx, dz) || 1;
    const goal = { x: t.pos.x + (dx / d) * 12, z: t.pos.z + (dz / d) * 12 };
    const gx = goal.x - e.pos.x, gz = goal.z - e.pos.z, gl = Math.hypot(gx, gz);
    const sp = def.speed * (e.status.goo ? 1 - e.status.goo.slow : 1);
    if (gl > 0.5) { e.pos.x += (gx / gl) * Math.min(gl, sp * dt); e.pos.z += (gz / gl) * Math.min(gl, sp * dt); }
    const r = Math.hypot(e.pos.x, e.pos.z); if (r > ARENA_R - 4) { e.pos.x *= (ARENA_R - 4) / r; e.pos.z *= (ARENA_R - 4) / r; }
    e.yaw = yawTo(e.pos, t.pos);
  }
  // aura: drains mana
  const auraR = p3 ? def.auraRadiusP3 : def.auraRadius;
  for (const p of Object.values(state.players)) {
    if (p.dead) continue;
    if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < auraR) {
      p.mana = Math.max(0, p.mana - def.auraDrain * dt);
      p.inAuraT = 0.2;
    }
  }
  e.ai.auraR = auraR;

  switch (a.id) {
    case 'intro': return a.t > 2;
    case 'transition': return a.t >= a.data.duration;
    case 'drift': return a.t > 2.5 * cdMult;
    case 'ring': {
      if (!a.data.fired) {
        a.data.fired = true;
        const n = 16, off = range(state.rng, 0, Math.PI);
        const dirToP = aimDir(e, t);
        for (let i = 0; i < n; i++) {
          const ang = off + (i / n) * Math.PI * 2;
          orb(state, e, { x: Math.sin(ang), y: dirToP.y * 0.8, z: Math.cos(ang) }, 8);
        }
        emit(state, 'bossCast', { id: e.id, kind: 'ring' });
      }
      return a.t > 1.6 * cdMult;
    }
    case 'fan': {
      if (!a.data.fired) {
        a.data.fired = true;
        for (let i = -2; i <= 2; i++) orb(state, e, aimDir(e, t, deg(10) * i), 10);
        emit(state, 'bossCast', { id: e.id, kind: 'fan' });
      }
      return a.t > 1.2 * cdMult;
    }
    case 'spiral':
    case 'spiralRing': {
      a.data.acc = (a.data.acc || 0) + dt * 10;
      const base = a.t * deg(90);
      const dy = aimDir(e, t).y * 0.8;
      while (a.data.acc >= 1) {
        a.data.acc -= 1;
        for (let k = 0; k < 3; k++) {
          const ang = base + (k / 3) * Math.PI * 2;
          orb(state, e, { x: Math.sin(ang), y: dy, z: Math.cos(ang) }, 7);
        }
      }
      if (a.id === 'spiralRing' && !a.data.ring && a.t > 1.2) {
        a.data.ring = true;
        for (let i = 0; i < 16; i++) { const ang = (i / 16) * Math.PI * 2; orb(state, e, { x: Math.sin(ang), y: dy, z: Math.cos(ang) }, 8); }
      }
      return a.t > 3 * cdMult;
    }
    case 'taxBolts': {
      if (!a.data.fired) {
        a.data.fired = true;
        for (let i = -1; i <= 1; i++) orb(state, e, aimDir(e, t, deg(35) * i), 6, 'taxBolt', 1.2, 6);
        emit(state, 'bossCast', { id: e.id, kind: 'tax' });
      }
      return a.t > 1.5 * cdMult;
    }
    case 'teleport': {
      if (a.t < 0.6) { b.invuln = true; b.fade = 1 - a.t / 0.6; return false; }
      if (!a.data.moved) {
        a.data.moved = true;
        for (let tries = 0; tries < 10; tries++) {
          const ang = range(state.rng, 0, Math.PI * 2), r = range(state.rng, 12, 30);
          const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
          if (Math.hypot(x - t.pos.x, z - t.pos.z) >= 8 || tries === 9) { e.pos.x = x; e.pos.z = z; e.prevPos.x = x; e.prevPos.z = z; break; }
        }
        emit(state, 'bossTeleport', { id: e.id, pos: { ...e.pos } });
      }
      b.fade = Math.min(1, (a.t - 0.6) / 0.4);
      if (a.t >= 1.0) { b.invuln = b.transitioning; b.fade = 1; return true; }
      return false;
    }
  }
  return true;
}

export { resolveOverlaps, float, angleWrap, hitPlayerSphere };
