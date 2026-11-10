import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { damageEnemy } from '../src/sim/combat.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

const script = {
  parts: [
    {
      id: 1, immune: true,
      targets: [{ id: 'loom-E', hp: 161, shields: ['gate'] }, { id: 'loom-W', hp: 161 }],
      adds: [{ on: 'firstLoom', units: [['midget', 1]] }],
    },
    { id: 2, hp: 1714, adds: [{ onBossHp: 50, units: [['boomMidget', 1]] }] },
    { id: 3, immune: true, targets: [{ id: 'pylon-N', hp: 230, rise: 1.5 }], pit: { at: [8, 0, 8], r: 7, slow: 0.5, dps: 4 } },
    { id: 4, hp: 100, ring: 6 },
  ],
};

let seq = 0;
function boot() {
  const lv = makeV2Level({
    id: `T-SCRIPT-${++seq}`,
    name: 'Script',
    sections: [{
      id: 'S1', start: [4, 0, 8],
      geometry: [
        box({ id: 'floor', at: [10, -0.25, 8], size: [24, 0.5, 16] }),
        box({ id: 'gate', at: [14, 1.5, 8], size: [1, 3, 4], mat: 'metal' }),
      ],
      mechanisms: [{ kind: 'target', id: 'gate-hp', hp: 50, at: [14, 1.5, 8] }],
      encounters: [{
        id: 'S4-E4',
        objective: { kind: 'boss' },
        activate: { min: [0, -2, 0], max: [20, 6, 16] },
        script,
        squads: [{ id: 'sahil', trigger: { type: 'onEnter' }, at: [[10, 0, 8]], units: [{ type: 'sahil', count: 1 }] }],
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 3 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: lv.id }] }) });
  return { s, p };
}

describe('boss part script', () => {
  it('keeps Sahil immune until the looms fall, then opens the next bar', () => {
    const { s, p } = boot();
    p.pos = { x: 4, y: 0, z: 8 };
    simulate(s, { [p.id]: cmd() });
    const sahil = s.enemies.find((e) => e.type === 'sahil');
    const looms = s.enemies.filter((e) => e.ai.scriptTarget);
    expect(sahil.boss.invuln).toBe(true);
    expect(looms).toHaveLength(2);
    expect(looms[0].maxHp).toBe(161);
    const before = sahil.hp;
    damageEnemy(s, sahil, { base: 500, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(sahil.hp).toBe(before);
    for (const loom of looms) damageEnemy(s, loom, { base: 500, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    simulate(s, { [p.id]: cmd() });
    expect(sahil.boss.invuln).toBe(false);
    expect(sahil.hp).toBe(1714);
    expect(s.level.v2.parts['loom-E']).toBe(true);
    expect(s.enemies.some((e) => e.type === 'midget' && !e.ai.scriptTarget)).toBe(true);
  });

  it('a linked gate takes no damage while its loom lives', () => {
    const { s, p } = boot();
    p.pos = { x: 12, y: 0, z: 8 };
    p.yaw = -Math.PI / 2;
    simulate(s, { [p.id]: cmd() });
    const hp = s.level.targets;
    for (let i = 0; i < 10; i++) simulate(s, { [p.id]: cmd({ yaw: -Math.PI / 2, held: { fire: true } }) });
    expect(s.level.brokenSolids && s.level.brokenSolids.gate).not.toBe(true);
    expect(hp).toBeFalsy();
  });

  it('a phase bar empties into the next part, and a pit slows while a ring burns once', () => {
    const lv = makeV2Level({
      id: `T-PIT-${++seq}`,
      name: 'Pit',
      sections: [{
        id: 'S1', origin: [100, 0, 0], start: [4, 0, 8],
        geometry: [box({ id: 'floor', at: [10, -0.25, 8], size: [40, 0.5, 30] })],
        encounters: [{
          id: 'E',
          objective: { kind: 'boss' },
          activate: { min: [0, -2, 0], max: [40, 6, 30] },
          script: {
            parts: [
              { id: 1, kind: 'phase', hp: 40, pit: { at: [8, 0, 8], r: 3, slow: 0.5, dps: 60 } },
              { id: 2, kind: 'phase', hp: 20, ring: 6 },
            ],
          },
          squads: [{ id: 'sahil', trigger: { type: 'onEnter' }, at: [[10, 0, 8]], units: [{ type: 'sahil', count: 1 }] }],
        }],
      }],
    });
    installLevel(lv);
    const s = createGameState({ seed: 1 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: lv.id }] }) });
    const sahil = s.enemies.find((e) => e.type === 'sahil');
    expect(sahil.pos.x).toBeGreaterThan(100);
    p.pos = { x: sahil.pos.x - 2, y: 0, z: sahil.pos.z };
    const taken = s.run.damageTaken;
    simulate(s, { [p.id]: cmd() });
    expect(p.scriptSlow).toBe(0.5);
    expect(s.run.damageTaken).toBeGreaterThan(taken);
    damageEnemy(s, sahil, { base: 5000, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(sahil.hp).toBe(1);
    expect(sahil.boss.barEmpty).toBe(true);
    simulate(s, { [p.id]: cmd() });
    expect(sahil.hp).toBe(20);
    p.pos = { x: sahil.pos.x + 20, y: 0, z: sahil.pos.z };
    const taken2 = s.run.damageTaken;
    simulate(s, { [p.id]: cmd() });
    expect(s.run.damageTaken).toBeGreaterThan(taken2);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('4ae191d6');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
