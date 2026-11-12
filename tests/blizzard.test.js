import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { sensePlayer } from '../src/sim/campaign/perception.js';
import { tickWeather } from '../src/sim/campaign/weather.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createEnemy, createGameState } from '../src/sim/state.js';

const WEATHER = {
  kind: 'weather', id: 'S2-blizzard', whiteout: 20, period: 90, warning: 4,
  windows: [[10, 30], [100, 120], [190, 210]], sightCap: 40, viewCap: 40,
};

function rig() {
  const s = createGameState({ seed: 1 });
  s.level = { time: 0 };
  const sec = { id: 'S2', mechanisms: [WEATHER] };
  return { s, sec };
}

describe('blizzard whiteout', () => {
  it('whites out on the listed windows, then every 90 s, with a 4 s warning', () => {
    const { s, sec } = rig();
    tickWeather(s, sec, 5);
    expect(s.level.whiteout).toBeUndefined();
    expect(s.level.whiteoutWarn).toBeUndefined();
    tickWeather(s, sec, 2);
    expect(s.level.whiteout).toBeUndefined();
    expect(s.level.whiteoutWarn).toBeCloseTo(3);
    expect(s.events.some((ev) => ev.type === 'whiteoutWarn')).toBe(true);
    tickWeather(s, sec, 3);
    expect(s.level.whiteout).toBe(true);
    expect(s.level.sightCap).toBe(40);
    expect(s.level.viewCap).toBe(40);
    tickWeather(s, sec, 20);
    expect(s.level.whiteout).toBeUndefined();
    expect(s.events.some((ev) => ev.type === 'whiteoutLift')).toBe(true);
    const { s: later, sec: same } = rig();
    for (const t of [15, 110, 200, 285]) {
      tickWeather(later, same, t - (later.level._weatherT || 0));
      expect(later.level.whiteout, String(t)).toBe(true);
    }
    tickWeather(later, same, 20);
    expect(later.level.whiteout).toBeUndefined();
  });

  it('caps a sniper at 40 m and leaves a hound alone', () => {
    const { s, sec } = rig();
    tickWeather(s, sec, 15);
    const sniper = createEnemy(s, 'auditSniper', { pos: { x: 0, z: 0 } });
    sniper.yaw = 0;
    const hound = createEnemy(s, 'frostHound', { pos: { x: 0, z: 0 } });
    const p = s.players[s.localPlayerId];
    p.pos = { x: 0, y: 0, z: -50 };
    expect(sensePlayer(s, sniper, p)).toBe(false);
    p.pos = { x: 0, y: 0, z: -30 };
    expect(sensePlayer(s, sniper, p)).toBe(true);
    p.pos = { x: 0, y: 0, z: -44 };
    expect(sensePlayer(s, hound, p)).toBe(true);
  });

  it('does not write weather fields on a section that has none', () => {
    const s = createGameState({ seed: 1 });
    s.level = { time: 0 };
    tickWeather(s, { id: 'S1', mechanisms: [] }, 12);
    expect(s.level.whiteout).toBeUndefined();
    expect(s.level._weatherT).toBeUndefined();
    expect(s.level._wx).toBeUndefined();
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('dc00f234');
  });
});
