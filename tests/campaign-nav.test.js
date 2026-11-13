import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { solidFromPrimitive } from '../src/sim/campaign/solids.js';
import { bakeNav, findPath, navGridFor } from '../src/sim/campaign/nav.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

describe('campaign nav', () => {
  it('paths around a wall and across a nav link', () => {
    const floor = solidFromPrimitive({ kind: 'box', id: 'floor', at: [10, -0.25, 6], size: [20, 0.5, 12] });
    const wall = solidFromPrimitive({ kind: 'box', id: 'wall', at: [10, 1.5, 6], size: [1, 3, 8] });
    const bounds = { min: [0, 0], max: [20, 12] };
    const grid = bakeNav([floor, wall], bounds);
    const path = findPath(grid, { x: 4, z: 6 }, { x: 16, z: 6 });
    expect(path).toBeTruthy();
    expect(path.some((p) => p.z < 3 || p.z > 9)).toBe(true);
    const gapA = solidFromPrimitive({ kind: 'box', id: 'a', at: [2, -0.25, 2], size: [4, 0.5, 4] });
    const gapB = solidFromPrimitive({ kind: 'box', id: 'b', at: [12, 2, 2], size: [4, 0.5, 4] });
    const wide = { min: [0, 0], max: [16, 6] };
    expect(findPath(bakeNav([gapA, gapB], wide), { x: 2, z: 2 }, { x: 12, z: 2 })).toBeNull();
    const linked = bakeNav([gapA, gapB], wide, [{ from: { x: 2, z: 2 }, to: { x: 12, y: 2, z: 2 }, kind: 'pad' }]);
    expect(findPath(linked, { x: 2, z: 2 }, { x: 12, z: 2 }).length).toBeGreaterThan(1);
  });

  it('an enemy with useNav walks around the wall toward the player', () => {
    const floor = solidFromPrimitive({ kind: 'box', id: 'floor', at: [10, -0.25, 6], size: [20, 0.5, 12] });
    const wall = solidFromPrimitive({ kind: 'box', id: 'wall', at: [10, 1.5, 6], size: [1, 3, 8] });
    const s = createGameState({ seed: 4 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
    s.level.useSolids = true;
    s.level.useNav = true;
    s.level.solids = [floor, wall];
    s.level.navBounds = { min: [0, 0], max: [20, 12] };
    p.pos = { x: 16, y: 0, z: 6 };
    p.prevPos = { ...p.pos };
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'debug', op: 'spawnEnemy', args: { type: 'midget', count: 1 } }] }) });
    const e = s.enemies.find((en) => !en.dead);
    e.pos = { x: 4, y: 0, z: 6 };
    e.prevPos = { ...e.pos };
    e.state = 'chase';
    let swung = false;
    for (let i = 0; i < 180; i++) {
      simulate(s, { [p.id]: cmd() });
      if (e.pos.z < 3 || e.pos.z > 9) swung = true;
    }
    expect(swung).toBe(true);
    expect(e.pos.x).toBeGreaterThan(8);
  });

  it('bakes the grid once per door state, not once per call', () => {
    const floor = solidFromPrimitive({ kind: 'box', id: 'floor', at: [10, -0.25, 6], size: [20, 0.5, 12] });
    const level = { useSolids: true, useNav: true, solids: [floor], navBounds: { min: [0, 0], max: [20, 12] } };
    const s = { mode: 'campaign', level };
    // No links, no zones: each read is a fresh `[]`, as in the sim.
    const open = navGridFor(s);
    expect(navGridFor(s)).toBe(open);
    // The sim rebuilds closedDoors and slowZones as new arrays every tick.
    const door = () => solidFromPrimitive({ kind: 'box', id: 'door', at: [10, 1.6, 6], size: [2, 3.2, 12] });
    level.closedDoors = [door()];
    const shut = navGridFor(s);
    expect(shut).not.toBe(open);
    level.closedDoors = [door()];
    level.slowZones = [];
    expect(navGridFor(s)).toBe(shut);
    expect(findPath(shut, { x: 4, z: 6 }, { x: 16, z: 6 })).toBeNull();
    level.closedDoors = [];
    expect(navGridFor(s)).toBe(open);
  });

  it('keeps a flyer under the lid', () => {
    const s = createGameState({ seed: 5 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
    s.level.flyerVolume = { min: [0, 1, 0], max: [20, 4, 20] };
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'debug', op: 'spawnEnemy', args: { type: 'flyingMidget', count: 1 } }] }) });
    const e = s.enemies.find((en) => en.type === 'flyingMidget');
    e.pos.y = 12;
    e.vel.y = 4;
    simulate(s, { [p.id]: cmd() });
    expect(e.pos.y).toBeLessThanOrEqual(4);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('e749d2fd');
  });
});
