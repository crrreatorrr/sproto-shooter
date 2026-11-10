import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot() {
  const lv = makeV2Level({
    id: 'T-JET',
    name: 'Jet',
    sections: [{
      id: 'S1',
      start: [4, 0, 6],
      flyerVolume: { min: [0, -4, 0], max: [20, 16, 16] },
      geometry: [box({ id: 'floor', at: [8, -0.25, 8], size: [20, 0.5, 16] })],
      mechanisms: [
        { kind: 'jetpack', id: 'pack', at: [4, 1, 6] },
        { kind: 'jetpack', id: 'spare', at: [6, 1, 6], skipIfOwned: true },
        { kind: 'fuelPad', id: 'pad', at: [8, 0.2, 6], safe: true },
        { kind: 'door', id: 'gate', at: [10, 1.5, 6], size: [0.6, 3, 3], opens: 'p.jet.has' },
      ],
      encounters: [{
        id: 'E1',
        activate: { min: [20, 0, 20], max: [22, 2, 22] },
        objective: { kind: 'reach' },
        zone: { min: [20, 0, 20], max: [22, 2, 22] },
        squads: [],
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 3 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-JET' }] }) });
  return { s, p };
}

function frames(s, p, n, extra) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd(extra) });
}

describe('jetpack hover', () => {
  it('holds altitude, drops on slide, regens on a pad, and opens the jet gate', () => {
    const { s, p } = boot();
    expect(p.jetpack).toBe(true);
    expect(s.level.got.spare).toBeUndefined();
    expect(s.level.closedDoors.some((d) => d.id === 'gate')).toBe(false);
    p.pos = { x: 8, y: 4, z: 8 };
    p.onGround = false;
    p.vel.y = 0;
    const y = p.pos.y;
    const fuel = s.level.fuel;
    frames(s, p, 20, { held: { jump: true } });
    expect(p.pos.y).toBeGreaterThan(y - 0.4);
    expect(s.level.fuel).toBeLessThan(fuel);
    p.onGround = false;
    p.pos.y = 4;
    frames(s, p, 5, { pressed: { slide: true } });
    expect(p.vel.y).toBeLessThan(-10);
    p.pos = { x: 8, y: 0, z: 6 };
    p.onGround = true;
    const low = s.level.fuel;
    frames(s, p, 10, {});
    expect(s.level.fuel).toBeGreaterThan(low);
    expect(s.level.safePos.x).toBeCloseTo(8, 0);
    p.jetpack = false;
    frames(s, p, 1, {});
    expect(s.level.closedDoors.some((d) => d.id === 'gate')).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
