// Damage pipeline, splash, element procs, kills, healing. PLAN §4.5–4.6, §4.9
import { float, range } from '../core/rng.js';
import { emit } from './events.js';
import { ENEMIES, ELITE, ALLY } from '../data/enemies.js';
import { ELEMENTS_BY_ID } from '../data/guns.js';
import { TUNING } from '../data/tuning.js';
import { distToCapsule, entityDef, sphereHitsPlayer } from './collision.js';
import { rollDrops, spawnDrops } from './drops.js';
import { createHazard, nextId } from './state.js';

export function healPlayer(p, amount) {
  if (p.dead) return 0;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  return p.hp - before;
}

export function damageEnemy(state, e, hit) {
  if (e.dead || e.state === 'spawning' || (e.boss && e.boss.invuln)) return 0;
  let dmg = hit.base;
  const p = state.players[hit.sourceId];
  if (p) {
    if (hit.sourceKind === 'spell') dmg *= 1 + 0.08 * (p.skills.magic.level - 1);
  }
  const isWeak = hit.zone === 'weak';
  if (isWeak) {
    const override = !e.boss && ENEMIES[e.type].weakMultOverride;
    dmg *= Math.max(hit.critMult ?? 2, override || 0);
    if (e.boss && e.boss.action.id === 'stunned') dmg *= 1.5;
  }
  const isCrit = !!hit.canCrit && float(state.rng) < (hit.critChance ?? 0.05);
  if (isCrit) dmg *= 1.5;
  if (hit.zone === 'shield') dmg *= 0.1;
  if (e.type === 'bigObama') { if (hit.isSplash) dmg *= 1.5; if (hit.pellet) dmg *= 1.3; }
  const el = hit.element || 'none';
  if (el !== 'none') {
    if (e.affinity.weak === el) dmg *= 1.5;
    if (e.affinity.resist === el) dmg *= 0.5;
  }
  dmg = Math.max(1, Math.round(dmg));
  if (e.type === 'dummy' && state.tuning.dummyInfinite) e.hp = e.maxHp + dmg;
  e.hp -= dmg;
  e.poise += dmg;
  e.hitFlash = 0.08;
  if (e.type === 'dummy') e.ai.regenT = 2;
  e.lastHit = { sourceId: hit.sourceId, sourceKind: hit.sourceKind, element: el, isCrit, isWeak, gunId: hit.gunId ?? null, wacky: hit.wacky ?? null };
  if (hit.wacky === 'bigHead') e.bigHeadT = 6;
  const killed = e.hp <= 0;
  if (p) {
    state.run.damageDealt += dmg;
    state.run.bestHit = Math.max(state.run.bestHit, dmg);
    if (isCrit) state.run.crits++;
    if (isWeak) state.run.weakHits++;
  }
  emit(state, 'damage', {
    sourceId: hit.sourceId, targetId: e.id, amount: dmg, element: el, isCrit, isWeak, zone: hit.zone,
    pos: hit.point || { x: e.pos.x, y: e.pos.y + entityDef(e).height * e.scale * 0.8, z: e.pos.z },
    sourceKind: hit.sourceKind, killed, pellet: !!hit.pellet,
  });
  if (!hit.noProc && el !== 'none' && float(state.rng) < (hit.elementChance ?? 0)) applyElementProc(state, e, hit, dmg);
  if (p && p.perks.lifesteal && !p.downed && p.lifestealBudget > 0) {
    const h = Math.min(dmg * 0.02, p.lifestealBudget);
    p.lifestealBudget -= h;
    healPlayer(p, h);
  }
  if (hit.wacky === 'critSproto' && isWeak && p && state.allies.length < 12) spawnAlly(state, p, e.pos, 'gun');
  if (!e.boss && e.type !== 'dummy' && !killed && e.poise >= e.poiseMax) {
    e.state = 'stagger'; e.stateT = 0; e.poise = 0;
    emit(state, 'stagger', { targetId: e.id });
  }
  if (killed) onEnemyKilled(state, e);
  return dmg;
}

export function applyElementProc(state, e, hit, dmg) {
  const def = ELEMENTS_BY_ID[hit.element];
  if (!def || !def.proc) return;
  const pot = hit.arcane ? 1.5 : 1;
  if (def.proc.kind === 'burn') {
    const dps = dmg * def.proc.dpsFrac * pot;
    if (!e.status.burn || e.status.burn.dps < dps) e.status.burn = { t: def.proc.duration, dps, sourceId: hit.sourceId };
    else e.status.burn.t = def.proc.duration;
  } else if (def.proc.kind === 'slow') {
    const b = e.boss ? 0.5 : 1;
    e.status.goo = { t: def.proc.duration * pot * b, slow: def.proc.slow * b };
  } else if (def.proc.kind === 'chain') {
    const hitSet = { [e.id]: true };
    let from = e;
    for (let i = 0; i < def.proc.targets; i++) {
      const n = nearestEnemy(state, from.pos, def.proc.range, hitSet);
      if (!n) break;
      hitSet[n.id] = true;
      emit(state, 'tracer', { from: centerOf(from), to: centerOf(n), element: 'shock', zap: true });
      damageEnemy(state, n, { sourceId: hit.sourceId, sourceKind: hit.sourceKind, base: dmg * def.proc.dmgFrac * pot, element: 'shock', zone: 'body', noProc: true });
      from = n;
    }
  }
  emit(state, 'statusApplied', { targetId: e.id, status: def.proc.kind, pos: centerOf(e) });
}

export function centerOf(e) {
  const def = entityDef(e);
  return { x: e.pos.x, y: e.pos.y + (e.type === 'hexAuditor' ? 0 : def.height * e.scale * 0.55), z: e.pos.z };
}

export function nearestEnemy(state, pos, range, exclude = null) {
  let best = null, bd = range;
  for (const o of state.enemies) {
    if (o.dead || o.state === 'spawning' || (exclude && exclude[o.id])) continue;
    const d = Math.hypot(o.pos.x - pos.x, o.pos.z - pos.z);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

export function onEnemyKilled(state, e) {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  const lh = e.lastHit || {};
  const killer = state.players[lh.sourceId];
  emit(state, 'kill', {
    victimId: e.id, victimType: e.type, elite: e.elite, bossTag: e.boss ? e.boss.tag : null, killerId: lh.sourceId ?? null,
    sourceKind: lh.sourceKind ?? null, element: lh.element ?? 'none', wasCrit: !!lh.isCrit, wasWeak: !!lh.isWeak,
    pos: centerOf(e), tier: e.tier, summoned: e.summoned, isDummy: e.type === 'dummy',
  });
  if (e.type === 'dummy') return;
  state.run.kills++;
  if (e.elite) state.run.eliteKills++;
  if (e.boss) { state.run.bossKills++; emit(state, 'bossDefeated', { id: e.id, bossType: e.type }); }
  // Kill frenzy
  for (const pid of Object.keys(state.players)) {
    const p = state.players[pid];
    if (p.perks.killFrenzy && killer === p) { p.buffs.killFrenzy.stacks = Math.min(10, p.buffs.killFrenzy.stacks + 1); p.buffs.killFrenzy.t = 4; }
    // Second wind: any kill revives a downed player
    if (p.downed && !p.dead) revivePlayer(state, p);
  }
  if (lh.wacky === 'confettiKill') {
    explode(state, centerOf(e), { radius: 4, damage: 40, minFalloff: 0.4, selfMult: 0, knockback: 6 }, lh.sourceId, 'none', 'splash', true);
  }
  // Drops
  const p = state.players[state.localPlayerId];
  const ctx = { elite: e.elite, tier: e.tier, playerGunTypes: p.guns.filter(Boolean).map((g) => g.ammoType), summoned: e.summoned };
  const specs = rollDrops(state.rng, e.type, ctx);
  spawnDrops(state, specs, centerOf(e));
}

export function revivePlayer(state, p) {
  p.downed = false; p.downedT = 0;
  p.hp = Math.max(p.hp, p.maxHp * TUNING.reviveHpFrac);
  p.shield = p.maxShield;
  p.invulnT = TUNING.reviveInvuln;
  emit(state, 'playerRevived', { playerId: p.id });
}

/** God mode: hits still land (shake, flash, shield and health drop) but health never goes below this. */
export const GOD_HP = 99;

export function damagePlayer(state, p, hit) {
  if (p.invulnT > 0 || p.dead) return 0;
  // sandbox: boss attacks still land (shake, flash, knockback) but do no damage
  if (state.mode === 'sandbox' && hit.sourceKind === 'boss') {
    const from = hit.fromPos;
    emit(state, 'playerDamaged', { playerId: p.id, amount: 0, toShield: 0, toHealth: 0, absorbed: 0, sourceKind: 'boss', noDamage: true,
      dir: from ? Math.atan2(from.x - p.pos.x, from.z - p.pos.z) : null });
    return 0;
  }
  let dmg = hit.base * (hit.sourceKind === 'self' ? 1 : state.tuning.enemyDmgMult);
  dmg *= 1 - 0.03 * (p.skills.health.level - 1);
  let absorbed = 0;
  if (p.spells.manaShieldOn && p.mana > 0) {
    const absorb = Math.min(dmg * 0.6, p.mana * 1.5);
    p.mana -= absorb / 1.5;
    dmg -= absorb;
    absorbed = absorb;
  }
  const toShield = Math.min(p.shield, dmg);
  p.shield -= toShield;
  dmg -= toShield;
  if (toShield > 0 && p.shield <= 0.01) emit(state, 'shieldBroken', { playerId: p.id });
  let toHealth = dmg;
  if (state.tuning.godMode) toHealth = Math.max(0, Math.min(toHealth, p.hp - Math.min(GOD_HP, p.maxHp)));
  if (p.hp - toHealth <= 0) {
    if (p.perks.unkillable && !p.unkillableUsed && !p.downed) {
      p.unkillableUsed = true; toHealth = p.hp - 1; p.invulnT = 3;
      emit(state, 'unkillableTriggered', { playerId: p.id });
    } else if (!p.downed) {
      toHealth = p.hp;
      p.hp = 0;
      startDowned(state, p);
      toHealth = 0;
    } else toHealth = 0;
  }
  p.hp -= toHealth;
  p.lastDamageT = 0;
  p.shieldDelayT = p.perks.quickShield ? TUNING.quickShieldDelay : TUNING.shieldDelay;
  state.run.damageTaken += toShield + toHealth;
  const from = hit.fromPos;
  emit(state, 'playerDamaged', {
    playerId: p.id, amount: toShield + toHealth, toShield, toHealth, absorbed, sourceKind: hit.sourceKind,
    dir: from ? Math.atan2(from.x - p.pos.x, from.z - p.pos.z) : null,
  });
  return toShield + toHealth;
}

export function startDowned(state, p) {
  p.downed = true;
  p.downedT = TUNING.secondWindTime;
  p.spells.manaShieldOn = false;
  emit(state, 'playerDowned', { playerId: p.id });
}

export function knockPlayer(p, from, strength, up = 3) {
  const dx = p.pos.x - from.x, dz = p.pos.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  p.vel.x += (dx / d) * strength;
  p.vel.z += (dz / d) * strength;
  p.vel.y = Math.max(p.vel.y, up);
  p.onGround = false;
}

/** Radial damage. PLAN §4.9 splash */
export function explode(state, pos, splash, ownerId, element = 'none', sourceKind = 'splash', noProc = false, extra = {}) {
  for (const e of state.enemies) {
    if (e.dead || e.state === 'spawning') continue;
    const def = entityDef(e);
    const d = e.type === 'hexAuditor'
      ? distToCapsule(pos, e.pos.x, e.pos.z, e.pos.y - 1.3, e.pos.y + 1.3, def.radius)
      : distToCapsule(pos, e.pos.x, e.pos.z, e.pos.y, e.pos.y + def.height * e.scale, def.radius * e.scale);
    if (d > splash.radius) continue;
    const f = 1 + (splash.minFalloff - 1) * (d / splash.radius);
    damageEnemy(state, e, { sourceId: ownerId, sourceKind, base: splash.damage * f, isSplash: true, zone: 'body', element,
      elementChance: extra.elementChance ?? (element !== 'none' ? 1 : 0), canCrit: false, noProc, arcane: extra.arcane, wacky: extra.wacky });
    if (!e.boss && e.type !== 'bigObama' && e.type !== 'dummy' && !e.dead) {
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, dd = Math.hypot(dx, dz) || 1;
      e.vel.x += (dx / dd) * splash.knockback * f;
      e.vel.z += (dz / dd) * splash.knockback * f;
    }
  }
  const owner = state.players[ownerId];
  if (owner && splash.selfMult > 0) {
    const top = owner.pos.y + 1.8;
    const cy = Math.max(owner.pos.y, Math.min(top, pos.y));
    const d = Math.hypot(pos.x - owner.pos.x, pos.y - cy, pos.z - owner.pos.z);
    if (d < splash.radius) {
      const f = 1 + (splash.minFalloff - 1) * (d / splash.radius);
      damagePlayer(state, owner, { base: splash.damage * f * splash.selfMult, sourceKind: 'self' });
      knockPlayer(owner, pos, splash.knockback * f * 1.3, 6 * f + 2);
    }
  }
  emit(state, 'explosion', { pos: { ...pos }, radius: splash.radius, element });
}

/** Enemy-origin AoE against players */
export function enemyAoE(state, pos, radius, damage, sourceKind, maxY = 99) {
  for (const p of Object.values(state.players)) {
    if (p.dead) continue;
    const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
    if (d < radius + TUNING.playerRadius && p.pos.y < maxY) damagePlayer(state, p, { base: damage, sourceKind, fromPos: pos });
  }
}

export function spawnAlly(state, owner, pos, sourceKind) {
  const a = range(state.rng, 0, Math.PI * 2);
  state.allies.push({
    id: nextId(state), kind: 'ally', type: 'miniSproto', pos: { x: pos.x + Math.cos(a), y: 0, z: pos.z + Math.sin(a) },
    prevPos: { x: pos.x, y: 0, z: pos.z }, vel: { x: 0, y: 0, z: 0 }, ttl: ALLY.ttl, targetId: null, fireCd: 0.3,
    damage: ALLY.damage, splashRadius: ALLY.splashRadius, sourceKind, ownerId: owner.id, dead: false, yaw: 0,
  });
}

export function hitPlayerSphere(state, c, r, damage, sourceKind, fromPos) {
  for (const p of Object.values(state.players)) {
    if (!p.dead && sphereHitsPlayer(c, r, p)) { damagePlayer(state, p, { base: damage, sourceKind, fromPos }); return p; }
  }
  return null;
}

export { createHazard };
