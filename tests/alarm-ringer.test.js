import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { alarmRay, damageAlarm } from '../src/sim/campaign/alarms.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot(extra) {
  const lv = makeV2Level({
    id: extra.id,
    name: 'Ringer',
    sections: [{
      id: 'S1',
      start: [8, 0, 6],
      geometry: [box({ id: 'floor', at: [8, -0.25, 8], size: [24, 0.5, 20] })],
      mechanisms: extra.mechanisms,
      encounters: [{
        id: 'E1',
        maxAlive: 8,
        activate: { min: [0, -2, 0], max: [20, 6, 16] },
        objective: { kind: 'clearAll' },
        squads: extra.squads,
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 2 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: extra.id }] }) });
  p.pos = { x: 8, y: 0, z: 6 };
  p.prevPos = { ...p.pos };
  simulate(s, { [p.id]: cmd() });
  return { s, p };
}

function frames(s, p, n) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd() });
}

const alarm = {
  kind: 'alarm', id: 'S1-alarm1', at: [4, 1.2, 6], hp: 40, cableHp: 20, cableTo: [4, 1.2, 10], runner: 0.2, wonder: 0.3,
};

describe('alarm ringer', () => {
  it('lets a runner ring the box, and a cut cable keeps it quiet', () => {
    const { s, p } = boot({
      id: 'T-RUN',
      mechanisms: [alarm],
      squads: [{
        id: 'A', trigger: { type: 'onEnter' }, at: [[4, 0, 6]],
        units: [{ type: 'obama', count: 1, role: 'runner', alarm: 'S1-alarm1' }],
      }],
    });
    const runner = s.enemies.find((e) => e.role === 'runner');
    expect(runner).toBeTruthy();
    frames(s, p, 80);
    expect(s.level.alarms['S1-alarm1']).toEqual(expect.any(Number));

    const cut = boot({
      id: 'T-CUT',
      mechanisms: [{ ...alarm }],
      squads: [{
        id: 'A', trigger: { type: 'onEnter' }, at: [[4, 0, 6]],
        units: [{ type: 'obama', count: 1, role: 'runner', alarm: 'S1-alarm1' }],
      }],
    });
    const shot = alarmRay(cut.s, { x: 4, y: 1.2, z: 12 }, { x: 0, y: 0, z: -1 }, 20);
    expect(shot.part).toBe('cable');
    damageAlarm(cut.s, shot, 25);
    frames(cut.s, cut.p, 80);
    expect(cut.s.level.alarmsCut['S1-alarm1']).toBe(true);
    expect(cut.s.level.alarms).toBeUndefined();
  });

  it('rings when a searchlight holds the player', () => {
    const { s, p } = boot({
      id: 'T-LAMP',
      mechanisms: [
        alarm,
        { kind: 'searchlight', id: 'lamp', at: [8, 2, 12], alarm: 'S1-alarm1', hold: 0.15, beam: 40, spot: 6 },
      ],
      squads: [{
        id: 'A', trigger: { type: 'onEnter' }, at: [[14, 0, 14]],
        units: [{ type: 'midget', count: 1 }],
      }],
    });
    frames(s, p, 4);
    expect(s.level.alarms).toBeUndefined();
    frames(s, p, 12);
    expect(s.level.alarms['S1-alarm1']).toEqual(expect.any(Number));
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('c8a753da');
  });
});
