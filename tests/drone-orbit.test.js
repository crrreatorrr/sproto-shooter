import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { damageEnemy } from '../src/sim/combat.js';
import { enemyAI } from '../src/sim/enemies.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createEnemy, createGameState } from '../src/sim/state.js';

function stepFlyers(state, n) {
  const p = state.players[state.localPlayerId];
  p.pos = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < n; i++) enemyAI(state, 1 / 60);
}

describe('spotter drone orbit', () => {
  it('keeps a finite altitude and can be shot', () => {
    expect(ENEMIES.spotterDrone.altMin).toBe(8);
    expect(ENEMIES.spotterDrone.altMax).toBe(9);
    expect(ENEMIES.spotterDrone.orbitMin).toBe(7);
    expect(ENEMIES.spotterDrone.orbitMax).toBe(14);
    expect(ENEMIES.spotterDrone.jinkMin).toBe(0.5);
    expect(ENEMIES.spotterDrone.jinkMax).toBe(1.2);
    const s = createGameState({ seed: 1 });
    const drone = createEnemy(s, 'spotterDrone', { pos: { x: 12, z: 0 } });
    drone.state = 'chase';
    stepFlyers(s, 120);
    expect(Number.isFinite(drone.pos.y)).toBe(true);
    expect(Number.isFinite(drone.pos.x)).toBe(true);
    expect(Number.isFinite(drone.pos.z)).toBe(true);
    expect(Number.isFinite(drone.vel.y)).toBe(true);
    expect(drone.ai.alt).toBeGreaterThanOrEqual(8);
    expect(drone.ai.alt).toBeLessThanOrEqual(9);
    expect(drone.pos.y).toBeGreaterThan(4);
    drone.hp = 6;
    drone.pos = { x: 0, y: drone.ai.alt, z: 4 };
    const p = s.players[s.localPlayerId];
    damageEnemy(s, drone, { base: 10, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(drone.hp).toBeLessThan(6);
    expect(Number.isFinite(drone.pos.y)).toBe(true);
  });

  it('does not write NaN when the orbit fields are missing', () => {
    const saved = { ...ENEMIES.flyingMidget };
    delete ENEMIES.flyingMidget.altMin;
    delete ENEMIES.flyingMidget.altMax;
    delete ENEMIES.flyingMidget.orbitMin;
    delete ENEMIES.flyingMidget.orbitMax;
    delete ENEMIES.flyingMidget.jinkMin;
    delete ENEMIES.flyingMidget.jinkMax;
    try {
      const s = createGameState({ seed: 1 });
      const flyer = createEnemy(s, 'flyingMidget', { pos: { x: 10, z: 4 } });
      flyer.state = 'chase';
      flyer.ai.alt = NaN;
      flyer.ai.orbitR = NaN;
      flyer.ai.jinkT = NaN;
      flyer.pos.y = NaN;
      flyer.vel.y = NaN;
      stepFlyers(s, 30);
      expect(Number.isFinite(flyer.pos.x)).toBe(true);
      expect(Number.isFinite(flyer.pos.y)).toBe(true);
      expect(Number.isFinite(flyer.pos.z)).toBe(true);
      expect(Number.isFinite(flyer.vel.y)).toBe(true);
      expect(Number.isFinite(flyer.ai.alt)).toBe(true);
    } finally {
      Object.assign(ENEMIES.flyingMidget, saved);
    }
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('dc00f234');
  });
});
