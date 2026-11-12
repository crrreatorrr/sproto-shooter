import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { ringAlarm } from '../src/sim/campaign/v2.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function level() {
  return makeV2Level({
    id: 'T-ALARM',
    name: 'Alarm',
    sections: [{
      id: 'S1',
      start: [8, 0, 6],
      geometry: [box({ id: 'floor', at: [8, -0.25, 6], size: [16, 0.5, 12] })],
      encounters: [{
        id: 'E1',
        maxAlive: 8,
        activate: { min: [0, -2, 0], max: [16, 6, 12] },
        objective: { kind: 'clearAll' },
        squads: [
          { id: 'A', trigger: { type: 'onEnter' }, at: [[8, 0, 6]], units: [{ type: 'midget', count: 1 }] },
          {
            id: 'E1-R', trigger: { type: 'onAlarm', alarm: 'S1-alarm1' }, optional: true, delay: 0.2,
            at: [[10, 0, 6]], units: [{ type: 'midget', count: 2 }],
          },
        ],
      }],
    }],
  });
}

function boot() {
  installLevel(level());
  const s = createGameState({ seed: 5 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-ALARM' }] }) });
  p.pos = { x: 8, y: 0, z: 6 };
  p.prevPos = { ...p.pos };
  simulate(s, { [p.id]: cmd() });
  return { s, p };
}

function frames(s, p, n) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd() });
}

describe('optional alarm squads', () => {
  it('keeps the campaign and PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('dc00f234');
  });

  it('clears a quiet run without waiting for an alarm pack that never rings', () => {
    const { s, p } = boot();
    expect(s.enemies.filter((e) => !e.dead).length).toBe(1);
    for (const e of s.enemies) { e.dead = true; e.hp = 0; }
    simulate(s, { [p.id]: cmd() });
    expect(s.level.cleared.E1).toBe(true);
    expect(s.enemies.filter((e) => e.campaignEnc === 'E1').length).toBe(1);
  });

  it('spawns the pack after the siren delay, and the clear waits for it', () => {
    const { s, p } = boot();
    ringAlarm(s, 'S1-alarm1');
    frames(s, p, 8);
    expect(s.enemies.filter((e) => !e.dead).length).toBe(1);
    frames(s, p, 8);
    expect(s.enemies.filter((e) => !e.dead).length).toBe(3);
    const pack = s.enemies.filter((e) => !e.dead);
    pack[0].dead = true;
    pack[0].hp = 0;
    simulate(s, { [p.id]: cmd() });
    expect(s.level.cleared.E1).toBeFalsy();
    for (const e of s.enemies) { e.dead = true; e.hp = 0; }
    simulate(s, { [p.id]: cmd() });
    expect(s.level.cleared.E1).toBe(true);
  });
});
