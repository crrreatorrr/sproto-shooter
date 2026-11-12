import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { ENEMIES } from '../src/data/enemies.js';
import { createGameState, createEnemy } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { damageEnemy } from '../src/sim/combat.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot() {
  const s = createGameState({ seed: 5 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
  return { s, p };
}

describe('L03 placeholder enemies', () => {
  it('a wisp takes little from bullets and a lot from spells', () => {
    const { s, p } = boot();
    const a = createEnemy(s, 'hexWisp', { pos: { x: 8, z: 8 } });
    const b = createEnemy(s, 'hexWisp', { pos: { x: 10, z: 8 } });
    a.state = 'chase'; b.state = 'chase';
    const bullet = damageEnemy(s, a, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    const spell = damageEnemy(s, b, { base: 20, sourceId: p.id, sourceKind: 'spell', zone: 'body' });
    expect(bullet).toBeLessThan(spell);
    expect(bullet).toBeGreaterThan(0);
  });

  it('hard bark ignores bullets and the knot does not', () => {
    const { s, p } = boot();
    const brute = createEnemy(s, 'barkBrute', { pos: { x: 8, z: 8 } });
    brute.state = 'chase';
    expect(brute.ai.armour).toBe('hard');
    expect(damageEnemy(s, brute, { base: 30, sourceId: p.id, sourceKind: 'gun', zone: 'body' })).toBe(0);
    expect(brute.hp).toBe(brute.maxHp);
    const knot = damageEnemy(s, brute, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'weak' });
    expect(knot).toBeGreaterThan(0);
    brute.ai.armour = 'softened';
    expect(damageEnemy(s, brute, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'body' })).toBeGreaterThan(0);
  });

  it('a glob splits twice down to the small ones', () => {
    const { s, p } = boot();
    const glob = createEnemy(s, 'gooGlob', { pos: { x: 8, z: 8 } });
    glob.state = 'chase';
    damageEnemy(s, glob, { base: 500, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    const mids = s.enemies.filter((e) => e.type === 'gooGlobMid' && !e.dead);
    expect(mids).toHaveLength(2);
    for (const mid of mids) damageEnemy(s, mid, { base: 500, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(s.enemies.filter((e) => e.type === 'gooGlobSmall').length).toBe(4);
  });

  it('a leech drains mana and a ghost walks through a wall', () => {
    const { s, p } = boot();
    p.mana = 100;
    const leech = createEnemy(s, 'manaLeech', { pos: { x: p.pos.x + 3, z: p.pos.z } });
    leech.state = 'chase';
    for (let i = 0; i < 60; i++) simulate(s, { [p.id]: cmd() });
    expect(p.mana).toBeLessThan(100);

    ENEMIES.probe = { ...ENEMIES.midget, ghost: true, behavior: 'midget', name: 'Probe' };
    const lv = makeV2Level({
      id: 'T-GHOST', name: 'Ghost', useNav: true,
      sections: [{
        id: 'S1', start: [2, 0, 6], navBounds: { min: [0, 0], max: [24, 12] },
        geometry: [
          box({ id: 'floor', at: [12, -0.25, 6], size: [24, 0.5, 12] }),
          box({ id: 'wall', at: [10, 1.5, 6], size: [1, 3, 10] }),
        ],
        encounters: [{ id: 'E', objective: { kind: 'reach' }, activate: { min: [80, -1, 0], max: [90, 4, 4] }, zone: { min: [80, -1, 0], max: [90, 4, 4] }, squads: [] }],
      }],
    });
    installLevel(lv);
    const g = createGameState({ seed: 2 });
    const gp = g.players[g.localPlayerId];
    simulate(g, { [gp.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'T-GHOST' }] }) });
    gp.pos = { x: 16, y: 0, z: 6 };
    const probe = createEnemy(g, 'probe', { pos: { x: 4, z: 6 } });
    probe.state = 'chase';
    for (let i = 0; i < 180; i++) simulate(g, { [gp.id]: cmd() });
    expect(probe.pos.x).toBeGreaterThan(11);
    delete ENEMIES.probe;
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('c8a753da');
  });
});
