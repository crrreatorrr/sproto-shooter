import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createEnemy, createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

let seq = 0;
function boot(section) {
  const id = `T-MOVE-${++seq}`;
  const lv = makeV2Level({
    id, name: 'Move',
    sections: [{
      id: 'S1', origin: [100, 0, 0], start: [4, 0, 6],
      geometry: [box({ id: 'floor', at: [10, -0.25, 8], size: [40, 0.5, 24] })],
      encounters: [{ id: 'E', objective: { kind: 'reach' }, activate: { min: [80, -2, 0], max: [90, 4, 4] }, squads: [] }],
      ...section,
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 1 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }] }) });
  return { s, p, lv };
}

describe('bazaar motion fields', () => {
  it('slows the player in a section hazard and shifts it by the origin', () => {
    const { s, p } = boot({
      hazards: [{ id: 'Q1', kind: 'slow', min: [0, -1, 0], max: [12, 3, 12], speed: 0.5, navCost: 4 }],
    });
    p.pos = { x: 104, y: 0, z: 6 };
    const off = boot({ hazards: [] });
    off.p.pos = { x: 104, y: 0, z: 6 };
    for (let i = 0; i < 30; i++) {
      simulate(s, { [p.id]: cmd({ moveZ: 1 }) });
      simulate(off.s, { [off.p.id]: cmd({ moveZ: 1 }) });
    }
    expect(p.scriptSlow == null).toBe(true);
    expect(Math.abs(p.pos.z - 6)).toBeLessThan(Math.abs(off.p.pos.z - 6));
  });

  it('a zero-damage geyser launches to its landing point', () => {
    const { s, p } = boot({
      geysers: [{ id: 'G5', at: [8, 0, 6], period: 6, damage: 0, to: [18, 9, 6] }],
    });
    p.pos = { x: 108, y: 0, z: 6 };
    for (let i = 0; i < 10; i++) simulate(s, { [p.id]: cmd() });
    expect(p.pos.x).toBeGreaterThan(110);
  });

  it('rides a carpet and a zipline', () => {
    const { s, p } = boot({
      carpets: [{ id: 'C1', from: [2, 0, 6], to: [12, 0, 6], speed: 10, mode: 'pingpong', pause: 0.2 }],
      links: [{ id: 'Z1', kind: 'zipline', from: [20, 4, 6], to: [30, 1, 6], speed: 20 }],
    });
    p.pos = { x: 102, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    expect(p.pos.x).toBeGreaterThan(102);
    p.pos = { x: 120, y: 4, z: 6 };
    const z = p.pos.z;
    for (let i = 0; i < 20; i++) simulate(s, { [p.id]: cmd() });
    expect(p.pos.x).toBeGreaterThan(120);
    expect(p.pos.z).toBeCloseTo(z, 1);
  });

  it('rescues a fall and drops an enemy with no loot', () => {
    const { s, p } = boot({ voidRescue: { y: -20, penalty: 0.25 } });
    p.pos = { x: 104, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    p.shield = 0;
    const before = p.hp;
    p.pos = { x: 104, y: -25, z: 6 };
    const fallen = createEnemy(s, 'midget', { pos: { x: 110, z: 6 } });
    fallen.pos.y = -30;
    fallen.campaignEnc = 'E';
    simulate(s, { [p.id]: cmd() });
    expect(p.pos.y).toBeGreaterThan(-1);
    expect(p.hp).toBeLessThan(before);
    expect(s.events.some((e) => e.type === 'voidRescue')).toBe(true);
    expect(fallen.dead).toBe(true);
    expect(fallen.noAmmoDrop).toBe(true);
  });

  it('a depot refills health and the magazine', () => {
    const { s, p } = boot({
      mechanisms: [{ kind: 'depot', id: 'depot-1', at: [4, 0, 6] }],
    });
    p.pos = { x: 104, y: 0, z: 6 };
    p.hp = 10;
    const gun = p.guns.find((g) => g);
    gun.ammoInMag = 0;
    p.ammo[gun.ammoType] = 0;
    const ammo = 0;
    simulate(s, { [p.id]: cmd() });
    expect(p.hp).toBeGreaterThan(10);
    expect(gun.ammoInMag).toBe(gun.stats.magSize);
    expect(p.ammo[gun.ammoType]).toBeGreaterThan(ammo);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('4ae191d6');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
