import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { groundHeight, raySolids, solidFromPrimitive, surfaceY } from '../src/sim/campaign/solids.js';
import { coverNear, hasLOS } from '../src/sim/campaign/perception.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot(solids, extra = {}) {
  const s = createGameState({ seed: 3 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
  s.level.useSolids = true;
  s.level.solids = solids;
  s.level.voids = extra.voids || null;
  p.pos = { x: extra.x ?? 20, y: extra.y ?? 0, z: extra.z ?? 11 };
  p.prevPos = { ...p.pos };
  p.vel = { x: 0, y: 0, z: 0 };
  return s;
}

const floor = solidFromPrimitive({ kind: 'box', id: 'floor', at: [20, -0.25, 11], size: [30, 0.5, 16] });
const step = solidFromPrimitive({ kind: 'box', id: 'step', at: [24, 0.15, 11], size: [2, 0.3, 4] });
const wall = solidFromPrimitive({ kind: 'box', id: 'wall', at: [28, 1.5, 11], size: [1, 3, 8] });

describe('campaign solids', () => {
  it('steps onto a 0.3 m box and stops at a tall wall', () => {
    const s = boot([floor, step, wall], { x: 22, z: 11 });
    const p = s.players[s.localPlayerId];
    const yaw = Math.atan2(-(28 - 22), 0);
    let highest = 0;
    for (let i = 0; i < 90; i++) {
      simulate(s, { [p.id]: cmd({ yaw, moveZ: 1 }) });
      if (p.pos.y > highest) highest = p.pos.y;
    }
    expect(highest).toBeGreaterThan(0.2);
    expect(p.pos.x).toBeLessThan(27.2);
    expect(p.pos.y).toBeLessThan(0.05);
  });

  it('stands on a raised floor and a ramp rises toward +z', () => {
    const deck = solidFromPrimitive({ kind: 'box', id: 'deck', at: [10, 1.75, 10], size: [8, 0.5, 8] });
    expect(groundHeight([deck], 10, 10, 0.2, 2, 0.4)).toBeCloseTo(2);
    const ramp = solidFromPrimitive({ kind: 'ramp', id: 'ramp', at: [0, 1, 4], size: [2, 2, 8], yaw: 0 });
    expect(surfaceY(ramp, 0, ramp.min[2] + 0.1)).toBeLessThan(surfaceY(ramp, 0, ramp.max[2] - 0.1));
  });

  it('stops a hitscan and a projectile on a solid', () => {
    const block = solidFromPrimitive({ kind: 'box', id: 'block', at: [0, 1, 5], size: [4, 2, 1] });
    const t = raySolids([block], { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 20);
    expect(t).toBeGreaterThan(3);
    expect(t).toBeLessThan(6);
    const s = boot([floor, block], { x: 0, z: 0, y: 0 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'debug', op: 'spawnEnemy', args: { type: 'midget', count: 1 } }] }) });
    const e = s.enemies.find((en) => !en.dead);
    e.pos.x = 0; e.pos.z = 12; e.hp = 500;
    const yaw = Math.atan2(0, -12);
    for (let i = 0; i < 20; i++) simulate(s, { [p.id]: cmd({ yaw, pitch: 0, held: { fire: true } }) });
    expect(e.hp).toBe(500);
  });

  it('void rescue returns the player and can take a health penalty', () => {
    const s = boot([floor], {
      x: 4, z: 4, y: -3,
      voids: [{ id: 'pit', min: [0, -8, 0], max: [8, 0, 8], to: [20, 0, 11], penalty: 0.25 }],
    });
    const p = s.players[s.localPlayerId];
    const before = p.hp + p.shield;
    simulate(s, { [p.id]: cmd() });
    expect(p.pos.x).toBeCloseTo(20);
    expect(p.pos.z).toBeCloseTo(11);
    expect(p.hp + p.shield).toBeLessThan(before);
    expect(s.events.some((ev) => ev.type === 'voidRescue')).toBe(true);
  });

  it('hides a player behind a wall until they step into sight or fire', () => {
    const screen = solidFromPrimitive({ kind: 'box', id: 'screen', at: [20, 1.2, 8], size: [8, 2.4, 0.6] });
    const s = boot([floor, screen], { x: 20, z: 5, y: 0 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'debug', op: 'spawnEnemy', args: { type: 'midget', count: 1 } }] }) });
    const e = s.enemies.find((en) => !en.dead);
    e.pos = { x: 20, y: 0, z: 12 };
    e.prevPos = { ...e.pos };
    e.ai.alert = 'unaware';
    e.yaw = 0;
    e.state = 'chase';
    const from = { x: 20, y: 1.4, z: 12 };
    const hidden = { x: 20, y: 1.4, z: 5 };
    expect(hasLOS(s, from, hidden)).toBe(false);
    expect(coverNear(s.level.solids, 20, 8.2, 1).includes('screen')).toBe(true);
    const z0 = e.pos.z;
    for (let i = 0; i < 20; i++) simulate(s, { [p.id]: cmd() });
    expect(e.ai.alert).toBe('unaware');
    expect(e.pos.z).toBeCloseTo(z0, 1);
    e.yaw = -Math.PI / 2;
    p.pos.x = 28; p.pos.z = 12;
    for (let i = 0; i < 5; i++) simulate(s, { [p.id]: cmd() });
    expect(e.ai.alert).toBe('alerted');
  });

  it('does not move the campaign fingerprint or the PvP fingerprint', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
