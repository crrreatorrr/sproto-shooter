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

function boot() {
  const lv = makeV2Level({
    id: `T-AUD-${++seq}`,
    name: 'Auditor',
    sections: [{
      id: 'S1',
      start: [4, 0, 8],
      geometry: [box({ id: 'floor', at: [12, -0.25, 8], size: [40, 0.5, 24] })],
      encounters: [{
        id: 'S3-F1',
        objective: { kind: 'clearAll' },
        activate: { min: [0, -4, 0], max: [30, 10, 20] },
        script: {
          parts: [
            {
              id: 'p1', seconds: 60,
              attacks: ['chase', 'volley'],
              adds: [{ t: 0, at: [20, 1, 14], units: [['midget', 4]] }],
            },
            {
              id: 'p2', immune: true, attacks: ['missiles'],
              targets: [{ id: 'gen', hp: 20, at: [6, 0, 8] }],
            },
            {
              id: 'p3', seconds: 60, attacks: ['chase', 'slam'],
              adds: [{ t: 0, at: [22, 0, 14], units: [['midget', 2]] }],
            },
          ],
        },
        squads: [{
          id: 'auditor', trigger: { type: 'onEnter' }, at: [[4, 0, 8]],
          units: [{ type: 'monster', count: 1 }],
        }],
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 5 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: lv.id }] }) });
  p.pos = { x: 8, y: 0, z: 8 };
  p.prevPos = { ...p.pos };
  s.spawnPoints = [];
  return { s, p };
}

function frames(s, p, n) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd() });
}

describe('scripted Auditor', () => {
  it('spawns the written adds at their mark and does not summon into an empty list', () => {
    const { s, p } = boot();
    frames(s, p, 3);
    const boss = s.enemies.find((e) => e.type === 'monster');
    expect(boss.boss.scripted).toBe(true);
    expect(boss.boss.attackList).toEqual(['chase', 'volley']);
    const adds = s.enemies.filter((e) => e.type === 'midget' && !e.ai.scriptTarget);
    expect(adds).toHaveLength(4);
    for (const e of adds) {
      expect(e.pos.x).toBeGreaterThan(17);
      expect(e.pos.x).toBeLessThan(23);
      expect(e.pos.z).toBeCloseTo(14, 0);
      expect(e.summoned).toBe(false);
    }
    boss.hp = Math.round(boss.maxHp * 0.4);
    frames(s, p, 150);
    expect(s.enemies.filter((e) => e.summoned).length).toBe(0);
    expect(s.enemies.filter((e) => e.type === 'midget' && !e.ai.scriptTarget).length).toBe(4);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('c8a753da');
  });
});
