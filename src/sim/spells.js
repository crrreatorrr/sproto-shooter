// Spells: Goo Bolt, Chain Zap, Sproto Swarm, Mana Shield, Meteor Bonk. PLAN §7.5
import { SPELLS } from '../data/skills.js';
import { dirFromYawPitch } from '../core/math.js';
import { emit } from './events.js';
import { eyePos, raycastEnemies, rayWorld } from './collision.js';
import { damageEnemy, nearestEnemy, centerOf, spawnAlly } from './combat.js';
import { createProjectile, createHazard } from './state.js';

export function spells(state, dt) {
  for (const p of Object.values(state.players)) {
    for (const k of Object.keys(p.spells.cd)) p.spells.cd[k] = Math.max(0, p.spells.cd[k] - dt);
    if (p.dead || p.downed) continue;
    const c = p.cmd.pressed;
    const eye = eyePos(p);
    const aim = dirFromYawPitch(p.yaw, p.pitch);
    const can = (id, cost) => {
      if (!p.perks[id]) { if (c[id]) emit(state, 'spellLocked', { playerId: p.id, spellId: id }); return false; }
      if (p.spells.cd[id] > 0) return false;
      if (p.mana < cost) { emit(state, 'noMana', { playerId: p.id, spellId: id }); return false; }
      return true;
    };
    const cast = (id, cost) => {
      p.mana -= cost;
      p.spells.cd[id] = SPELLS[id].cd;
      emit(state, 'cast', { playerId: p.id, spellId: id, manaCost: cost });
    };
    const magicMult = 1; // magic-level bonus applied in damage pipeline for sourceKind 'spell'

    if (c.gooBolt && can('gooBolt', SPELLS.gooBolt.mana)) {
      const s = SPELLS.gooBolt;
      cast('gooBolt', s.mana);
      createProjectile(state, {
        kind: 'gooBolt', faction: 'player', ownerId: p.id, sourceKind: 'spell',
        pos: { x: eye.x + aim.x * 0.6, y: eye.y + aim.y * 0.6 - 0.1, z: eye.z + aim.z * 0.6 },
        vel: { x: aim.x * s.speed, y: aim.y * s.speed, z: aim.z * s.speed }, radius: 0.3, gravity: 3,
        damage: s.damage * magicMult, element: 'goo', elementChance: 1, ttl: 3,
        splash: { radius: s.splash, damage: s.damage * 0.6, minFalloff: 0.5, selfMult: 0, knockback: 3 },
      });
    }
    if (c.chainZap && can('chainZap', SPELLS.chainZap.mana)) {
      const s = SPELLS.chainZap;
      const hit = raycastEnemies(state, eye, aim, s.range);
      let first = hit ? hit.e : null;
      if (!first) {
        // soft-aim: nearest enemy within a cone
        let best = null, bd = 0.9;
        for (const e of state.enemies) {
          if (e.dead || e.state === 'spawning') continue;
          const cc = centerOf(e);
          const dx = cc.x - eye.x, dy = cc.y - eye.y, dz = cc.z - eye.z, dl = Math.hypot(dx, dy, dz);
          if (dl > s.range) continue;
          const dot = (dx * aim.x + dy * aim.y + dz * aim.z) / dl;
          if (dot > bd) { bd = dot; best = e; }
        }
        first = best;
      }
      cast('chainZap', s.mana);
      if (first) {
        const hitSet = {};
        let from = { x: eye.x + aim.x * 0.5, y: eye.y - 0.15, z: eye.z + aim.z * 0.5 };
        let cur = first, dmg = s.damage;
        for (let i = 0; i <= s.chains && cur; i++) {
          hitSet[cur.id] = true;
          const to = centerOf(cur);
          emit(state, 'tracer', { from, to, element: 'shock', zap: true });
          damageEnemy(state, cur, { sourceId: p.id, sourceKind: 'spell', base: dmg, element: 'shock', elementChance: 0, zone: 'body', noProc: true });
          from = to; dmg *= s.falloff;
          cur = nearestEnemy(state, cur.pos, s.chainRange, hitSet);
        }
      } else {
        const t = rayWorld(eye, aim, s.range);
        emit(state, 'tracer', { from: eye, to: { x: eye.x + aim.x * t, y: eye.y + aim.y * t, z: eye.z + aim.z * t }, element: 'shock', zap: true });
      }
    }
    if (c.swarm && can('swarm', SPELLS.swarm.mana)) {
      cast('swarm', SPELLS.swarm.mana);
      for (let i = 0; i < SPELLS.swarm.count; i++) spawnAlly(state, p, p.pos, 'spell');
    }
    if (c.manaShield && p.perks.manaShield && p.spells.cd.manaShield <= 0) {
      if (p.spells.manaShieldOn) { p.spells.manaShieldOn = false; p.spells.cd.manaShield = SPELLS.manaShield.cd; emit(state, 'manaShieldOff', { playerId: p.id }); }
      else if (can('manaShield', SPELLS.manaShield.mana)) { cast('manaShield', SPELLS.manaShield.mana); p.spells.manaShieldOn = true; }
    } else if (c.manaShield && !p.perks.manaShield) emit(state, 'spellLocked', { playerId: p.id, spellId: 'manaShield' });
    if (c.meteor) {
      if (!p.perks.meteor) emit(state, 'spellLocked', { playerId: p.id, spellId: 'meteor' });
      else if (p.spells.cd.meteor <= 0 && p.mana >= p.maxMana - 0.5) {
        const s = SPELLS.meteor;
        const hit = raycastEnemies(state, eye, aim, 60);
        let target;
        if (hit) target = { x: hit.e.pos.x, y: 0, z: hit.e.pos.z };
        else { const t = Math.min(rayWorld(eye, aim, 40), 40); target = { x: eye.x + aim.x * t, y: 0, z: eye.z + aim.z * t }; }
        cast('meteor', p.mana);
        createHazard(state, { kind: 'meteorMarker', pos: target, radius: s.radius, ttl: s.delay + 0.1, damage: s.damage, ownerId: p.id, data: { delay: s.delay } });
      } else if (p.spells.cd.meteor <= 0) emit(state, 'noMana', { playerId: p.id, spellId: 'meteor' });
    }
  }
}
