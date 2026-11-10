import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

describe('section voids', () => {
  it('copies the section volumes and rescues to the last safe ground', () => {
    const id = 'T-VOID';
    const lv = makeV2Level({
      id, name: 'Void',
      sections: [{
        id: 'S1', start: [4, 0, 6],
        geometry: [box({ id: 'pad', at: [4, -0.25, 6], size: [8, 0.5, 8] })],
        voids: [{ id: 'gap', min: [-10, -200, -10], max: [40, -40, 40], penalty: 0.25, invuln: 1, mode: 'lastSafe', to: [4, 0, 6] }],
        encounters: [{ id: 'E', objective: { kind: 'reach' }, activate: { min: [80, -2, 0], max: [90, 4, 4] }, squads: [] }],
      }],
    });
    installLevel(lv);
    const s = createGameState({ seed: 1 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }] }) });
    expect(s.level.voids).toHaveLength(1);
    simulate(s, { [p.id]: cmd() });
    expect(s.level.safePos.x).toBeCloseTo(4, 0);
    p.shield = 0;
    const taken = s.run.damageTaken;
    p.pos = { x: 20, y: -50, z: 6 };
    p.prevPos = { x: 20, y: -50, z: 6 };
    simulate(s, { [p.id]: cmd() });
    expect(p.pos.y).toBeGreaterThan(-1);
    expect(p.pos.x).toBeCloseTo(4, 0);
    expect(s.run.damageTaken).toBeGreaterThan(taken);
    expect(p.invulnT).toBeGreaterThan(0);
    expect(s.events.some((e) => e.type === 'voidRescue')).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
