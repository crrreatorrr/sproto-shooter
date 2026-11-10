import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { registeredLevel } from '../src/data/levels/register.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { markPartDestroyed } from '../src/sim/campaign/v2.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import '../src/data/levels/campaign.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

const level = makeV2Level({
  id: 'T-V2',
  name: 'Format Test',
  tier: 1,
  sections: [{
    id: 'S1',
    name: 'Yard',
    start: [2, 0, 6],
    geometry: [box({ id: 'floor', at: [10, -0.25, 6], size: [24, 0.5, 12] })],
    mechanisms: [
      { kind: 'door', id: 'in', at: [8, 1.5, 6], size: [0.6, 3, 4] },
      { kind: 'door', id: 'out', at: [16, 1.5, 6], size: [0.6, 3, 4] },
    ],
    encounters: [{
      id: 'E1',
      maxAlive: 8,
      activate: { min: [6, -1, 1], max: [18, 4, 11] },
      lockdown: {
        entry: 'in',
        exit: 'out',
        threshold: { min: [9, -1, 1], max: [15, 4, 11] },
      },
      objective: { kind: 'clearAll' },
      squads: [
        { id: 'A', trigger: { type: 'onEnter' }, method: 'placed', at: [[12, 0, 6], [13, 0, 6]], units: [{ type: 'midget', count: 2 }] },
        { id: 'B', trigger: { type: 'onKills', n: 2 }, method: 'door', at: [[14, 0, 6]], units: [{ type: 'midget', count: 1 }] },
      ],
    }],
  }],
});

describe('campaign format v2', () => {
  it('registers L01, L02 and L03 from their own folders', () => {
    expect(registeredLevel('L01').id).toBe('L01');
    expect(registeredLevel('L02').name).toBe('The Grand Bazaar');
    expect(registeredLevel('L03').stage).toBe('grove');
  });

  it('seals a lockdown, releases the next squad on kills, then opens the doors', () => {
    installLevel(level);
    const s = createGameState({ seed: 9 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-V2' }] }) });
    p.pos = { x: 12, y: 0, z: 6 };
    p.prevPos = { ...p.pos };
    simulate(s, { [p.id]: cmd() });
    expect(s.level.closedDoors.length).toBe(2);
    expect(s.enemies.filter((e) => e.campaignEnc === 'E1').length).toBe(2);
    for (const e of s.enemies) if (e.campaignEnc === 'E1') { e.dead = true; e.hp = 0; }
    simulate(s, { [p.id]: cmd() });
    expect(s.enemies.filter((e) => e.campaignEnc === 'E1' && !e.dead).length).toBe(1);
    for (const e of s.enemies) if (!e.dead) { e.dead = true; e.hp = 0; }
    simulate(s, { [p.id]: cmd() });
    expect(s.level.cleared.E1).toBe(true);
    expect(s.level.closedDoors.length).toBe(0);
    expect(s.level.won).toBe(true);
  });

  it('opens a destroy objective when every named part is destroyed', () => {
    const destroyLevel = makeV2Level({
      id: 'T-V2B',
      name: 'Parts',
      sections: [{
        id: 'S1',
        start: [2, 0, 2],
        geometry: [box({ id: 'floor', at: [4, -0.25, 2], size: [10, 0.5, 6] })],
        encounters: [{
          id: 'E1',
          activate: { min: [0, -1, 0], max: [8, 4, 6] },
          objective: { kind: 'destroy', ids: ['gen'] },
          squads: [],
        }],
      }],
    });
    installLevel(destroyLevel);
    const s = createGameState({ seed: 3 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-V2B' }] }) });
    simulate(s, { [p.id]: cmd() });
    expect(s.level.won).toBeFalsy();
    markPartDestroyed(s, 'gen');
    simulate(s, { [p.id]: cmd() });
    expect(s.level.cleared.E1).toBe(true);
  });

  it('keeps the campaign fingerprint and the PvP fingerprint', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
