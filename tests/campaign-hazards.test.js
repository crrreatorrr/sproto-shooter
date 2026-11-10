import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { setHazardSet } from '../src/sim/campaign/mechanisms.js';
import { bakeNav, findPath } from '../src/sim/campaign/nav.js';
import { solidFromPrimitive } from '../src/sim/campaign/solids.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: -Math.PI / 2, pitch: 0, moveX: 0, moveZ: 1, held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

let seq = 0;
function level(extra) {
  return makeV2Level({
    id: `T-HZ-${++seq}`,
    name: 'Hazards',
    useNav: true,
    sections: [{
      id: 'S1',
      start: [2, 0, 8],
      navBounds: { min: [0, 0], max: [24, 16] },
      geometry: [box({ id: 'floor', at: [12, -0.25, 8], size: [24, 0.5, 16] })],
      mechanisms: extra,
      encounters: [{
        id: 'HOLD',
        objective: { kind: 'reach' },
        activate: { min: [80, -1, 0], max: [90, 4, 4] },
        zone: { min: [80, -1, 0], max: [90, 4, 4] },
        squads: [],
      }],
    }],
  });
}

function boot(mechs) {
  const lv = level(mechs);
  installLevel(lv);
  const s = createGameState({ seed: 1 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ moveZ: 0, actions: [{ type: 'startMode', mode: 'campaign', level: lv.id }] }) });
  return { s, p };
}

describe('campaign hazard zones and geysers', () => {
  it('a slow zone cuts speed in half and a script can switch it off', () => {
    const zone = { kind: 'hazardZone', id: 'sand', min: [4, -1, 0], max: [20, 3, 16], slow: 0.5, set: 'sand' };
    const { s, p } = boot([zone]);
    setHazardSet(s, 'sand', true);
    p.pos = { x: 6, y: 0, z: 8 };
    p.prevPos = { ...p.pos };
    for (let i = 0; i < 30; i++) simulate(s, { [p.id]: cmd() });
    const slowed = p.pos.x;
    const off = boot([zone]);
    off.p.pos = { x: 6, y: 0, z: 8 };
    off.p.prevPos = { ...off.p.pos };
    for (let i = 0; i < 30; i++) simulate(off.s, { [off.p.id]: cmd() });
    expect(slowed).toBeGreaterThan(6);
    expect(off.p.pos.x - 6).toBeGreaterThan((slowed - 6) * 1.4);
  });

  it('a launcher geyser moves the player and a damaging one hurts', () => {
    const { s, p } = boot([
      { kind: 'geyser', id: 'G5', at: [4, 0, 8], period: 5, rumble: 0, damage: 0, to: [12, 4, 8], r: 1.6 },
    ]);
    p.pos = { x: 4, y: 0, z: 8 };
    p.prevPos = { ...p.pos };
    simulate(s, { [p.id]: cmd({ moveZ: 0 }) });
    expect(p.pos.x).toBe(12);
    expect(p.pos.y).toBeGreaterThan(3.5);
    const hurt = boot([{ kind: 'geyser', id: 'G1', at: [4, 0, 8], period: 5, rumble: 0, damage: 15, r: 1.6 }]);
    hurt.p.pos = { x: 4, y: 0, z: 8 };
    const pool = hurt.p.hp + hurt.p.shield;
    simulate(hurt.s, { [hurt.p.id]: cmd({ moveZ: 0 }) });
    expect(hurt.p.hp + hurt.p.shield).toBeLessThan(pool);
  });

  it('nav walks around an expensive pool', () => {
    const floor = solidFromPrimitive({ kind: 'box', id: 'floor', at: [10, -0.25, 6], size: [20, 0.5, 12] });
    const bounds = { min: [0, 0], max: [20, 12] };
    const zones = [{ min: [8, -1, 2], max: [12, 2, 10], cost: 8 }];
    const path = findPath(bakeNav([floor], bounds, [], 1, zones), { x: 2, z: 6 }, { x: 18, z: 6 });
    expect(path.some((p) => p.z < 2 || p.z > 10)).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('9ec1c6ea');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
