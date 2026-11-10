import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { bosses } from '../src/sim/bosses.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createBoss, createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { bossLabel } from '../src/ui/bossLabel.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

let seq = 0;

describe('Auditor arena', () => {
  it('keeps a campaign monster inside its courtyard instead of the wave circle', () => {
    const s = createGameState({ seed: 1 });
    s.mode = 'campaign';
    const e = createBoss(s, 'monster', { pos: { x: 150, z: -785 } });
    e.boss.arena = { x: 150, z: -785, radius: 35 };
    e.boss.displayName = 'The Abominable Auditor';
    e.boss.action = { id: 'chase', t: 0, data: {} };
    s.players[s.localPlayerId].pos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 600; i++) bosses(s, 1 / 60);
    expect(Math.hypot(e.pos.x - 150, e.pos.z + 785)).toBeLessThanOrEqual(31.05);
    expect(Math.hypot(e.pos.x, e.pos.z)).toBeGreaterThan(100);
    expect(bossLabel(e, { name: 'BLUE MONSTER' })).toBe('The Abominable Auditor');
  });

  it('still clamps a wave monster to the origin circle', () => {
    const s = createGameState({ seed: 1 });
    s.mode = 'waves';
    const e = createBoss(s, 'monster', { pos: { x: 80, z: 0 } });
    e.pos.x = 80;
    e.boss.action = { id: 'chase', t: 0, data: {} };
    bosses(s, 1 / 60);
    expect(Math.hypot(e.pos.x, e.pos.z)).toBeLessThanOrEqual(45 - 2.4 + 0.01);
    expect(bossLabel(e, { name: 'BLUE MONSTER' })).toBe('BLUE MONSTER');
  });

  it('copies the unit name and the shifted arena onto the body', () => {
    const id = `T-ARENA-${++seq}`;
    const lv = makeV2Level({
      id, name: 'Courtyard',
      sections: [{
        id: 'S3',
        origin: [100, 0, -726],
        start: [50, 0, -6],
        geometry: [box({ id: 'floor', at: [50, -0.5, -40], size: [120, 1, 100] })],
        encounters: [{
          id: 'S3-F1',
          arena: { x: 50, z: -59, radius: 35 },
          activate: { min: [0, -4, -80], max: [90, 8, 10] },
          squads: [{
            id: 'auditor', trigger: { type: 'onEnter' }, at: [[50, 0.6, -59]],
            units: [{ type: 'monster', count: 1, name: 'The Abominable Auditor' }],
          }],
        }],
      }],
    });
    installLevel(lv);
    const s = createGameState({ seed: 3 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }, { type: 'transitionDone' }] }) });
    for (let i = 0; i < 5; i++) simulate(s, { [p.id]: cmd() });
    const boss = s.enemies.find((en) => en.type === 'monster');
    expect(boss.boss.displayName).toBe('The Abominable Auditor');
    expect(boss.boss.arena).toEqual({ x: 150, z: -785, radius: 35 });
    expect(Math.hypot(boss.pos.x - 150, boss.pos.z + 785)).toBeLessThan(40);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
