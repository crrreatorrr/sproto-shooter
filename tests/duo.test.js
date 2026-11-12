import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { damageEnemy } from '../src/sim/combat.js';
import { markPartDestroyed } from '../src/sim/campaign/v2.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot() {
  const lv = makeV2Level({
    id: 'T-DUO',
    name: 'Duo',
    tier: 1,
    sections: [{
      id: 'SB',
      start: [4, 0, 60],
      geometry: [box({ id: 'floor', at: [70, -0.25, 60], size: [40, 0.5, 40] })],
      encounters: [{
        id: 'SB-BOSS',
        maxAlive: 12,
        activate: { min: [0, -4, 30], max: [100, 16, 90] },
        objective: { kind: 'boss' },
        parts: [
          { id: 1, kind: 'entry', seconds: 30 },
          { id: 2, kind: 'double', seconds: 60 },
          { id: 3, kind: 'intermission', seconds: 40 },
          { id: 4, kind: 'double', seconds: 75 },
          { id: 5, kind: 'chase', seconds: 45 },
        ],
        squads: [
          { id: 'bosses', trigger: { type: 'onEnter' }, at: [[70, 1, 58], [70, 1, 62]], units: [{ type: 'obamaDuo', count: 1 }, { type: 'midgetDuo', count: 1 }] },
          { id: 'P2a', trigger: { type: 'time', t: 0, part: 2 }, at: [[46, 0, 60]], units: [{ type: 'midget', count: 1 }] },
        ],
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 4 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-DUO' }] }) });
  p.pos = { x: 50, y: 0, z: 60 };
  p.prevPos = { ...p.pos };
  simulate(s, { [p.id]: cmd() });
  return { s, p };
}

describe('Pump and Dump Duo', () => {
  it('shields both fighters until the pylons fall, then opens part 2 on a stage-2 bar', () => {
    const { s, p } = boot();
    const obama = s.enemies.find((e) => e.type === 'obamaDuo');
    const midget = s.enemies.find((e) => e.type === 'midgetDuo');
    expect(obama.hp).toBe(578);
    expect(midget.hp).toBe(684);
    expect(obama.boss.invuln).toBe(true);
    expect(midget.boss.invuln).toBe(true);
    expect(s.enemies.some((e) => e.type === 'midget')).toBe(false);
    for (const id of ['sb.py1', 'sb.py2', 'sb.py3']) markPartDestroyed(s, id);
    simulate(s, { [p.id]: cmd() });
    expect(s.level.scripts['SB-BOSS'].part).toBe(1);
    expect(obama.boss.invuln).toBe(false);
    simulate(s, { [p.id]: cmd() });
    expect(s.enemies.some((e) => e.type === 'midget')).toBe(true);
    obama.hp = 2;
    damageEnemy(s, obama, { base: 50, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    simulate(s, { [p.id]: cmd() });
    expect(obama.boss.bar).toBe(1);
    expect(obama.hp).toBe(669);
    obama.hp = 2;
    damageEnemy(s, obama, { base: 50, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    simulate(s, { [p.id]: cmd() });
    expect(s.level.scripts['SB-BOSS'].part).toBe(2);
    expect(obama.boss.invuln).toBe(true);
    expect(midget.boss.invuln).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('c8a753da');
  });
});
