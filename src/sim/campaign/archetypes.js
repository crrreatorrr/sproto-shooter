// Extra behaviour for the campaign re-skins. Wave Mode enemies have no
// `archetype`, so this file never writes their state.
import { ENEMIES } from '../../data/enemies.js';
import { createProjectile } from '../state.js';

export function archetypeOf(e) {
  const def = ENEMIES[e.type];
  return def && def.archetype;
}

export function sourceTakenMul(e, hit) {
  const def = ENEMIES[e.type];
  if (!def) return 1;
  if (hit.zone === 'weak' && def.weakIgnoresArmour) return 1;
  const name = e.ai && e.ai.armour;
  const table = name && def.armour ? def.armour[name] : null;
  const spec = table || def.taken;
  if (!spec) return 1;
  const key = hit.sourceKind === 'spell' ? 'spell' : (hit.isSplash || hit.sourceKind === 'world') ? 'explosive' : 'bullet';
  return spec[key] == null ? 1 : spec[key];
}

export function archetypeDamageMul(e, from) {
  const a = archetypeOf(e);
  let mul = e.ai && e.ai.bubble > 0 ? 0.5 : 1;
  if (a && a.frontShield && from) {
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
    const dx = from.x - e.pos.x, dz = from.z - e.pos.z;
    if (fx * dx + fz * dz > 0) mul *= a.frontShield;
  }
  return mul;
}

export function archetypeDeathBlast(e) {
  const a = archetypeOf(e);
  return a && a.deathBlast;
}

export function tickArchetype(state, e, target, dt) {
  const a = archetypeOf(e);
  if (!a || !target) return;
  const ai = e.ai;
  if (a.burrow) {
    ai.burrowCd = (ai.burrowCd == null ? a.burrow.every : ai.burrowCd) - dt;
    if (ai.burrowCd <= 0) {
      ai.burrowCd = a.burrow.every;
      ai.buried = a.burrow.duration;
    }
  }
  if (a.bubble) {
    ai.bubbleCd = (ai.bubbleCd == null ? a.bubble.every : ai.bubbleCd) - dt;
    if (ai.bubbleCd <= 0) {
      ai.bubbleCd = a.bubble.every;
      let best = null, bd = a.bubble.radius;
      for (const o of state.enemies) {
        if (o === e || o.dead) continue;
        const d = Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) best.ai.bubble = a.bubble.duration;
    }
  }
  if (a.mortar) {
    ai.mortarCd = (ai.mortarCd == null ? a.mortar.every : ai.mortarCd) - dt;
    if (ai.mortarCd <= 0) {
      ai.mortarCd = a.mortar.every;
      const dx = target.pos.x - e.pos.x, dz = target.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      createProjectile(state, {
        kind: 'bullet', faction: 'enemy', ownerId: e.id, sourceKind: 'enemy',
        pos: { x: e.pos.x, y: e.pos.y + 1.4, z: e.pos.z },
        vel: { x: (dx / d) * a.mortar.speed, y: 8, z: (dz / d) * a.mortar.speed },
        gravity: 12, damage: a.mortar.damage, ttl: 2.5, radius: 0.25,
      });
    }
  }
  if (a.charge) {
    ai.chargeCd = (ai.chargeCd == null ? a.charge.every : ai.chargeCd) - dt;
    if (ai.chargeLeft > 0) {
      ai.chargeLeft -= dt;
      const dx = target.pos.x - e.pos.x, dz = target.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      e.vel.x = (dx / d) * a.charge.speed;
      e.vel.z = (dz / d) * a.charge.speed;
    } else if (ai.chargeCd <= 0) {
      ai.chargeCd = a.charge.every;
      ai.chargeLeft = a.charge.duration;
    }
  }
  if (a.relocate) {
    ai.relocateCd = (ai.relocateCd == null ? a.relocate.every : ai.relocateCd) - dt;
    if (ai.relocateCd <= 0) {
      ai.relocateCd = a.relocate.every;
      const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
      e.vel.x += fz * 8;
      e.vel.z += -fx * 8;
    }
  }
  if (a.turret) {
    e.vel.x *= 0.15;
    e.vel.z *= 0.15;
  }
  if (a.flock) {
    let sx = 0, sz = 0, n = 0;
    for (const o of state.enemies) {
      if (o === e || o.dead || o.type !== e.type) continue;
      sx += o.pos.x; sz += o.pos.z; n++;
    }
    if (n) {
      const dx = sx / n - e.pos.x, dz = sz / n - e.pos.z;
      e.vel.x += dx * 0.4 * dt;
      e.vel.z += dz * 0.4 * dt;
    }
  }
  if (a.bark && e.ai.armour !== 'stripped') {
    e.ai.armour = e.status && e.status.goo ? 'softened' : (e.ai.armour === 'softened' ? 'hard' : (e.ai.armour || 'hard'));
  }
  if (a.leech && target) {
    const d = Math.hypot(target.pos.x - e.pos.x, target.pos.z - e.pos.z);
    if (d < (a.leech.range || 10)) target.mana = Math.max(0, target.mana - (a.leech.drain || 8) * dt);
  }
  if (a.wisp && target) {
    e.ai.wispCd = (e.ai.wispCd == null ? a.wisp.every : e.ai.wispCd) - dt;
    if (e.ai.wispCd <= 0) {
      e.ai.wispCd = a.wisp.every;
      const dx = target.pos.x - e.pos.x, dz = target.pos.z - e.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      createProjectile(state, {
        kind: 'bullet', faction: 'enemy', ownerId: e.id, sourceKind: 'enemy',
        pos: { x: e.pos.x, y: e.pos.y + 0.6, z: e.pos.z },
        vel: { x: (dx / dist) * a.wisp.speed, y: 0, z: (dz / dist) * a.wisp.speed },
        damage: a.wisp.damage, ttl: 4, radius: 0.25,
      });
    }
  }
  if (a.audit) {
    e.ai.audit = state.enemies.some((o) => !o.dead && o.type === 'gateGenerator' && o.campaignEnc && o.campaignEnc === e.campaignEnc);
  }
  if (a.flash) {
    ai.flashCd = (ai.flashCd == null ? a.flash.every : ai.flashCd) - dt;
    const d = Math.hypot(target.pos.x - e.pos.x, target.pos.z - e.pos.z);
    if (ai.flashCd <= 0 && d < a.flash.radius) {
      ai.flashCd = a.flash.every;
      target.vel.x *= 0.45;
      target.vel.z *= 0.45;
    }
  }
}
