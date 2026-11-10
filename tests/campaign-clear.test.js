import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

let seq = 0;
function boot(sections) {
  const lv = makeV2Level({ id: `T-CL-${++seq}`, name: 'Clear', sections });
  installLevel(lv);
  const s = createGameState({ seed: 1 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: lv.id }] }) });
  return { s, p };
}

describe('what a grove clear needs', () => {
  it('spawns the Hex inside the grove and does not pull it back to the origin', () => {
    const { s } = boot([{
      id: 'S1', start: [40, 0, -70],
      geometry: [box({ id: 'floor', at: [45, -0.25, -80], size: [40, 0.5, 40] })],
      encounters: [{
        id: 'S5-F1',
        objective: { kind: 'boss' },
        activate: { min: [20, -2, -100], max: [70, 6, -60] },
        arena: { x: 45, z: -80, radius: 34 },
        squads: [{ id: 'boss', trigger: { type: 'onEnter' }, method: 'placed', at: [[45, 1.6, -80]], units: [{ type: 'hexAuditor', count: 1 }] }],
      }],
    }]);
    const p = s.players[s.localPlayerId];
    p.pos = { x: 40, y: 0, z: -70 };
    for (let i = 0; i < 30; i++) simulate(s, { [p.id]: cmd() });
    const hex = s.enemies.find((e) => e.type === 'hexAuditor');
    expect(hex).toBeTruthy();
    expect(hex.boss).toBeTruthy();
    expect(Math.hypot(hex.pos.x, hex.pos.z)).toBeGreaterThan(60);
  });

  it('a flee opens the gate and does not count as a boss kill', () => {
    const { s, p } = boot([{
      id: 'S1', start: [4, 0, 8],
      geometry: [box({ id: 'floor', at: [12, -0.25, 8], size: [30, 0.5, 16] })],
      mechanisms: [{ kind: 'door', id: 'S6-LG', at: [20, 1.5, 8], size: [1, 3, 4], opens: 'S6-F2.fled' }],
      encounters: [{
        id: 'S6-F2',
        objective: { kind: 'boss' },
        fleeAt: 0.5,
        activate: { min: [0, -2, 0], max: [20, 6, 16] },
        squads: [{ id: 'boss', trigger: { type: 'onEnter' }, at: [[8, 0, 8]], units: [{ type: 'broccoli', count: 1 }] }],
      }],
    }]);
    p.pos = { x: 6, y: 0, z: 8 };
    simulate(s, { [p.id]: cmd() });
    const boss = s.enemies.find((e) => e.type === 'broccoli');
    boss.hp = boss.maxHp * 0.4;
    const kills = s.run.bossKills;
    simulate(s, { [p.id]: cmd() });
    simulate(s, { [p.id]: cmd() });
    expect(boss.fled).toBe(true);
    expect(s.level.fled['S6-F2']).toBe(true);
    expect(s.run.bossKills).toBe(kills);
    expect(s.level.got['S6-LG']).toBe(true);
  });

  it('a bullet breaks a barricade and marks the totem part', () => {
    const { s, p } = boot([{
      id: 'S1', start: [4, 0, 8],
      geometry: [
        box({ id: 'floor', at: [12, -0.25, 8], size: [30, 0.5, 16] }),
        box({ id: 'TOT-N', at: [8, 1.5, 8], size: [2, 3, 2], mat: 'wood' }),
      ],
      mechanisms: [{ kind: 'target', id: 'TOT-N-hp', at: [8, 1.5, 8], hp: 30, bulletMul: 1 }],
      encounters: [{
        id: 'HOLD',
        objective: { kind: 'reach' },
        activate: { min: [80, -1, 0], max: [90, 4, 4] },
        zone: { min: [80, -1, 0], max: [90, 4, 4] },
        squads: [],
      }],
    }]);
    p.pos = { x: 4, y: 0, z: 8 };
    p.yaw = -Math.PI / 2;
    for (let i = 0; i < 40; i++) simulate(s, { [p.id]: cmd({ yaw: -Math.PI / 2, held: { fire: true } }) });
    expect(s.level.brokenSolids['TOT-N']).toBe(true);
    expect(s.level.v2.parts['TOT-N']).toBe(true);
    expect(s.level.solids.some((solid) => solid.id === 'TOT-N')).toBe(false);
  });

  it('keeps an elite flag and the pins', () => {
    const { s, p } = boot([{
      id: 'S1', start: [2, 0, 4],
      geometry: [box({ id: 'floor', at: [6, -0.25, 4], size: [16, 0.5, 10] })],
      encounters: [{
        id: 'E',
        objective: { kind: 'clearAll' },
        activate: { min: [0, -2, 0], max: [12, 4, 8] },
        squads: [{ id: 'A', trigger: { type: 'onEnter' }, at: [[6, 0, 4]], units: [{ type: 'barkBrute', count: 1, elite: true }] }],
      }],
    }]);
    p.pos = { x: 3, y: 0, z: 4 };
    simulate(s, { [p.id]: cmd() });
    const brute = s.enemies.find((e) => e.type === 'barkBrute');
    expect(brute.elite).toBe(true);
    expect(contentFingerprint(1)).toBe('4ae191d6');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
