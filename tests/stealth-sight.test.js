import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { sensePlayer } from '../src/sim/campaign/perception.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createEnemy, createGameState } from '../src/sim/state.js';

function world() {
  const s = createGameState({ seed: 1 });
  s.mode = 'campaign';
  s.level = { useSolids: true, solids: [], time: 0, whiteout: false };
  return s;
}

function pair(s, type, x, z, yaw = 0) {
  const e = createEnemy(s, type, { pos: { x, z } });
  e.yaw = yaw;
  e.pos.y = 0;
  const p = s.players[s.localPlayerId];
  return { e, p };
}

describe('stealth sight', () => {
  it('gives a sniper 140 m in the cone and 60 m outside it', () => {
    const s = world();
    const { e, p } = pair(s, 'auditSniper', 0, 0, 0);
    p.pos = { x: 0, y: 0, z: -100 };
    expect(sensePlayer(s, e, p)).toBe(true);
    e.ai.alert = 'unaware';
    p.pos = { x: 80, y: 0, z: 0 };
    expect(sensePlayer(s, e, p)).toBe(false);
    p.pos = { x: 40, y: 0, z: 0 };
    expect(sensePlayer(s, e, p)).toBe(true);
    e.ai.alert = 'unaware';
    s.level.whiteout = true;
    p.pos = { x: 0, y: 0, z: -50 };
    expect(sensePlayer(s, e, p)).toBe(false);
    p.pos = { x: 0, y: 0, z: -30 };
    expect(sensePlayer(s, e, p)).toBe(true);
  });

  it('lets a hound scent through a wall and leaves an asleep enemy blind', () => {
    const s = world();
    s.level.solids = [{
      id: 'wall', kind: 'box', sight: true,
      min: [-2, 0, -8], max: [2, 4, -6],
    }];
    const hound = pair(s, 'frostHound', 0, 0);
    hound.p.pos = { x: 0, y: 0, z: -20 };
    expect(sensePlayer(s, hound.e, hound.p)).toBe(true);
    const asleep = createEnemy(s, 'midget', { pos: { x: 0, z: 0 } });
    asleep.ai.alert = 'asleep';
    asleep.ai.hearing = 12;
    const p = s.players[s.localPlayerId];
    p.pos = { x: 6, y: 0, z: 0 };
    expect(sensePlayer(s, asleep, p)).toBe(false);
    s.events.push({ type: 'shot' });
    expect(sensePlayer(s, asleep, p)).toBe(true);
  });

  it('keeps an idle enemy to a 30 m cone in front of them', () => {
    const s = world();
    const { e, p } = pair(s, 'midget', 0, 0, 0);
    e.ai.alert = 'unaware';
    p.pos = { x: 0, y: 0, z: -10 };
    expect(sensePlayer(s, e, p)).toBe(true);
    e.ai.alert = 'unaware';
    p.pos = { x: 0, y: 0, z: 10 };
    expect(sensePlayer(s, e, p)).toBe(false);
  });

  it('does not let a mining rig see someone tucked under its wall', () => {
    const s = world();
    const { e, p } = pair(s, 'miningRig', 0, 0);
    e.pos.y = 8;
    p.pos = { x: 8, y: 0, z: 0 };
    expect(sensePlayer(s, e, p)).toBe(false);
    p.pos = { x: 40, y: 8, z: 0 };
    expect(sensePlayer(s, e, p)).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
