import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot(level) {
  installLevel(level);
  const s = createGameState({ seed: 4 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: level.id }] }) });
  p.pos = { x: 8, y: 0, z: 6 };
  p.prevPos = { ...p.pos };
  simulate(s, { [p.id]: cmd() });
  return { s, p };
}

function frames(s, p, n) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd() });
}

function living(s, enc) {
  return s.enemies.filter((e) => e.campaignEnc === enc && !e.dead);
}

describe('part clocks, flock units, fallback waves', () => {
  it('keeps the campaign and PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  });

  it('spawns a part squad on the script clock and sends the flock home when the part ends', () => {
    const level = makeV2Level({
      id: 'T-PART',
      name: 'Part clock',
      sections: [{
        id: 'S1',
        start: [8, 0, 6],
        geometry: [box({ id: 'floor', at: [12, -0.25, 6], size: [30, 0.5, 16] })],
        encounters: [{
          id: 'E1',
          maxAlive: 8,
          activate: { min: [0, -2, 0], max: [24, 8, 14] },
          objective: { kind: 'clearAll' },
          script: {
            parts: [
              { id: 'p1', immune: true, targets: [{ id: 'loom', hp: 20, at: [6, 0, 6] }] },
              { id: 'p2', hp: 40 },
            ],
          },
          squads: [
            { id: 'boss', trigger: { type: 'onEnter' }, at: [[20, 0, 6]], units: [{ type: 'monster', count: 1 }] },
            { id: 'early', trigger: { type: 'time', t: 0.05, part: 1 }, at: [[8, 0, 8]], units: [{ type: 'bitbug', count: 2 }] },
            { id: 'late', trigger: { type: 'time', t: 30, part: 1 }, at: [[8, 0, 10]], units: [{ type: 'midget', count: 1 }] },
            { id: 'next', trigger: { type: 'time', t: 0.05, part: 2 }, at: [[9, 0, 8]], units: [{ type: 'midget', count: 1 }] },
          ],
        }],
      }],
    });
    const { s, p } = boot(level);
    frames(s, p, 10);
    const early = living(s, 'E1').filter((e) => e.type === 'bitbug');
    expect(early.length).toBe(2);
    expect(early.every((e) => e.flockPart === 1)).toBe(true);
    expect(living(s, 'E1').some((e) => e.type === 'midget' && !e.partId)).toBe(false);
    const kills = s.run.kills;
    const loom = s.enemies.find((e) => e.partId === 'loom');
    expect(loom).toBeTruthy();
    loom.dead = true;
    loom.hp = 0;
    frames(s, p, 2);
    expect(early.every((e) => e.dead && e.dismissed)).toBe(true);
    expect(s.run.kills).toBe(kills);
    expect(s.level.v2.enc.E1.squads.late.skipped).toBe(true);
    expect(living(s, 'E1').some((e) => e.type === 'midget' && !e.ai.scriptTarget)).toBe(false);
    frames(s, p, 8);
    expect(living(s, 'E1').some((e) => e.type === 'midget' && e.flockPart === 2)).toBe(true);
  });

  it('counts six bitbugs as one maxAlive unit', () => {
    const level = makeV2Level({
      id: 'T-FLOCK',
      name: 'Flock cap',
      sections: [{
        id: 'S1',
        start: [8, 0, 6],
        geometry: [box({ id: 'floor', at: [8, -0.25, 6], size: [16, 0.5, 12] })],
        encounters: [{
          id: 'E1',
          maxAlive: 1,
          flockUnit: 6,
          activate: { min: [0, -2, 0], max: [16, 6, 12] },
          objective: { kind: 'clearAll' },
          squads: [
            { id: 'A', trigger: { type: 'onEnter' }, at: [[8, 2, 6]], units: [{ type: 'bitbug', count: 8 }] },
          ],
        }],
      }],
    });
    const { s, p } = boot(level);
    const bugs = () => living(s, 'E1').filter((e) => e.type === 'bitbug');
    expect(bugs().length).toBe(6);
    expect(s.level.v2.enc.E1.queue.length).toBe(2);
    for (const e of bugs()) { e.dead = true; e.hp = 0; }
    frames(s, p, 4);
    expect(bugs().length).toBe(2);
    expect(s.level.v2.enc.E1.queue.length).toBe(0);
  });

  it('opens the next wave on fallbackSec when the room is still full', () => {
    const level = makeV2Level({
      id: 'T-FALL',
      name: 'Fallback',
      sections: [{
        id: 'S1',
        start: [8, 0, 6],
        geometry: [box({ id: 'floor', at: [8, -0.25, 6], size: [16, 0.5, 12] })],
        encounters: [{
          id: 'E1',
          maxAlive: 8,
          activate: { min: [0, -2, 0], max: [16, 6, 12] },
          lockdown: { fallbackSec: 0.3, entry: 'nope', exit: 'nope' },
          objective: { kind: 'clearAll' },
          squads: [
            { id: 'A', trigger: { type: 'onEnter' }, at: [[8, 0, 6], [9, 0, 6], [10, 0, 6]], units: [{ type: 'midget', count: 3 }] },
            { id: 'B', trigger: { type: 'onRemain', n: 0 }, at: [[8, 0, 8]], units: [{ type: 'obama', count: 1 }] },
          ],
        }],
      }],
    });
    const { s, p } = boot(level);
    expect(living(s, 'E1').some((e) => e.type === 'obama')).toBe(false);
    frames(s, p, 12);
    expect(living(s, 'E1').some((e) => e.type === 'obama')).toBe(false);
    frames(s, p, 12);
    expect(living(s, 'E1').some((e) => e.type === 'obama')).toBe(true);
  });
});
