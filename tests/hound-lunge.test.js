import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { enemyZoneSlow } from '../src/sim/campaign/mechanisms.js';
import { enemyAI } from '../src/sim/enemies.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createEnemy, createGameState } from '../src/sim/state.js';
import { hazards } from '../src/sim/world.js';

const DT = 1 / 60;

function world() {
  const s = createGameState({ seed: 1 });
  const p = s.players[s.localPlayerId];
  p.pos = { x: 0, y: 0, z: 0 };
  p.shield = 0;
  return { s, p };
}

function houndAt(s, z) {
  const e = createEnemy(s, 'frostHound', { pos: { x: 0, z } });
  e.state = 'chase';
  e.pos.y = 0;
  e.yaw = 0;
  e.vel = { x: 0, y: 0, z: 0 };
  return e;
}

describe('frost hound lunge', () => {
  it('crouches, dashes at 20 m/s, and leaves an ice patch', () => {
    const { s, p } = world();
    const e = houndAt(s, 2.4);
    const hp = p.hp;
    let dashed = false;
    for (let i = 0; i < 80; i++) {
      enemyAI(s, DT);
      if (e.attack && e.attack.phase === 'active' && e.attack.t > 0) {
        dashed = true;
        expect(Math.hypot(e.vel.x, e.vel.z)).toBeCloseTo(20, 0);
      }
    }
    expect(dashed).toBe(true);
    expect(p.hp).toBe(hp - 16);
    expect(Math.hypot(p.vel.x, p.vel.z)).toBeGreaterThan(4);
    expect(p.vel.y).toBeGreaterThan(2);
    const patch = s.hazards.find((h) => h.kind === 'icePatch');
    expect(patch.radius).toBe(2.5);
    expect(patch.ttl).toBe(6);
    p.pos = { x: patch.pos.x, y: 0, z: patch.pos.z };
    hazards(s, DT);
    expect(p.iceSlow).toBe(0.15);
  });

  it('chases at a run and ignores a slick zone', () => {
    const { s } = world();
    const e = houndAt(s, 20);
    for (let i = 0; i < 40; i++) enemyAI(s, DT);
    expect(Math.hypot(e.vel.x, e.vel.z)).toBeGreaterThan(8);
    const zone = { kind: 'slow', tag: 'slick', affectsEnemies: true, slow: 0.15, min: [-40, 0, -5], max: [40, 4, 40] };
    expect(enemyZoneSlow({ got: {} }, { mechanisms: [zone] }, e)).toBe(1);
    const midget = createEnemy(s, 'midget', { pos: { x: 0, z: 0 } });
    expect(enemyZoneSlow({ got: {} }, { mechanisms: [zone] }, midget)).toBe(0.15);
  });

  it('keeps a midget bite at 4 m/s', () => {
    const { s } = world();
    const e = createEnemy(s, 'midget', { pos: { x: 0, z: 2 } });
    e.state = 'attack';
    e.attack = { phase: 'active', t: 0, hasHit: false };
    e.yaw = 0;
    e.vel = { x: 0, y: 0, z: 0 };
    enemyAI(s, DT);
    expect(Math.hypot(e.vel.x, e.vel.z)).toBeCloseTo(4, 1);
  });

  it('does not throw when the lunge fields are missing', () => {
    const def = ENEMIES.frostHound;
    const saved = {
      weights: def.weights, range: def.range, windup: def.windup, active: def.active,
      recover: def.recover, lunge: def.lunge, knockback: def.knockback, patch: def.patch, run: def.run,
    };
    delete def.weights;
    delete def.range;
    delete def.windup;
    delete def.active;
    delete def.recover;
    delete def.lunge;
    delete def.knockback;
    delete def.patch;
    delete def.run;
    try {
      const { s } = world();
      const e = houndAt(s, 30);
      for (let i = 0; i < 40; i++) enemyAI(s, DT);
      expect(Number.isFinite(e.pos.x)).toBe(true);
      expect(Number.isFinite(e.pos.y)).toBe(true);
      expect(Number.isFinite(e.pos.z)).toBe(true);
      expect(Number.isFinite(e.vel.x)).toBe(true);
      expect(Number.isFinite(e.vel.z)).toBe(true);
    } finally {
      Object.assign(def, saved);
    }
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  });
});
