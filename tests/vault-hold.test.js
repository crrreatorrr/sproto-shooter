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
    id: 'T-VAULT',
    name: 'Vault',
    sections: [{
      id: 'S1',
      start: [8, 0, 6],
      geometry: [box({ id: 'floor', at: [8, -0.25, 6], size: [20, 0.5, 16] })],
      encounters: [{
        id: 'S5-F2',
        maxAlive: 8,
        activate: { min: [0, -2, 0], max: [16, 6, 14] },
        hold: { min: [6, -1, 4], max: [10, 4, 8] },
        objective: { kind: 'clearAll', also: { kind: 'hold', seconds: 0.2 }, text: 'Hold the drill' },
        strikes: [0.1],
        strikeEvery: 0.4,
        strikeTrack: 0.05,
        strikeLock: 0.05,
        squads: [
          { id: 'W1', trigger: { type: 'onEnter' }, at: [[14, 0, 12]], units: [{ type: 'midget', count: 1 }] },
        ],
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 6 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-VAULT' }] }) });
  p.pos = { x: 8, y: 0, z: 6 };
  p.prevPos = { ...p.pos };
  p.shield = 0;
  simulate(s, { [p.id]: cmd() });
  return { s, p };
}

function frames(s, p, n) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd() });
}

describe('vault drill and drone strikes', () => {
  it('waits for the waves and the drill, and rushes the drill once the waves are dead', () => {
    const { s, p } = boot();
    frames(s, p, 20);
    expect(s.level.cleared['S5-F2']).toBeFalsy();
    expect(s.level.v2.enc['S5-F2'].hold).toBeGreaterThan(0.15);
    for (const e of s.enemies) { e.dead = true; e.hp = 0; }
    const before = s.level.v2.enc['S5-F2'].hold;
    frames(s, p, 3);
    const gained = s.level.v2.enc['S5-F2'].hold - before;
    expect(gained).toBeGreaterThan(0.04);
    expect(s.level.cleared['S5-F2']).toBe(true);
  });

  it('drops a drone strike on the written clock', () => {
    const { s, p } = boot();
    const hp = p.hp;
    frames(s, p, 6);
    expect(p.hp).toBe(hp);
    frames(s, p, 12);
    expect(p.hp).toBeLessThan(hp);
  });

  it('keeps the campaign and PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('c8a753da');
  });
});
