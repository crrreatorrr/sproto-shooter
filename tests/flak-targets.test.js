import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { ENEMIES } from '../src/data/enemies.js';
import { createEnemy, createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { damageLevelSolid } from '../src/sim/campaign/mechanisms.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

describe('flak pod and hp targets', () => {
  it('spawns a flak pod body', () => {
    expect(ENEMIES.flakPod.hp).toBe(160);
    expect(ENEMIES.flakPod.look.length).toBeGreaterThan(0);
    const s = createGameState({ seed: 1 });
    const e = createEnemy(s, 'flakPod', { pos: { x: 0, z: 0 } });
    expect(e.hp).toBe(160);
    expect(ENEMIES.flakPod.speed).toBe(0);
  });

  it('marks a target when its body solid is destroyed', () => {
    const id = 'T-PYLON';
    const lv = makeV2Level({
      id, name: 'Pylon',
      sections: [{
        id: 'S1', start: [2, 0, 2],
        geometry: [box({ id: 'n1-body', at: [6, 1, 2], size: [1, 2, 1], mat: 'metal' })],
        mechanisms: [
          { kind: 'target', id: 'n1', at: [6, 1, 2], hp: 228, weak: 2 },
          { kind: 'door', id: 'mouth', at: [8, 1, 2], size: [0.4, 3, 2], opens: 'n1.destroyed' },
        ],
        encounters: [{ id: 'E', objective: { kind: 'destroy', ids: ['n1'] }, activate: { min: [0, -2, 0], max: [4, 4, 4] }, squads: [] }],
      }],
    });
    installLevel(lv);
    const s = createGameState({ seed: 1 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }] }) });
    const solid = s.level.solids.find((item) => item.id === 'n1-body');
    expect(damageLevelSolid(s, solid, { base: 100, sourceKind: 'gun', zone: 'body' })).toBe(false);
    expect(damageLevelSolid(s, solid, { base: 70, sourceKind: 'gun', zone: 'weak' })).toBe(true);
    expect(s.level.v2.parts.n1).toBe(true);
    simulate(s, { [p.id]: cmd() });
    expect(s.level.got.mouth).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
