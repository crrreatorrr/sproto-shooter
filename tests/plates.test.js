import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { damageEnemy } from '../src/sim/combat.js';
import { equipAuditorPlates } from '../src/sim/campaign/plates.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createBoss, createGameState } from '../src/sim/state.js';

function boss(tier = 1) {
  const s = createGameState({ seed: 1 });
  s.mode = 'campaign';
  s.tier = tier;
  const e = createBoss(s, 'monster', { pos: { x: 0, z: 0 } });
  e.yaw = 0;
  return { s, e };
}

function hit(e, zone, z, y) {
  return {
    sourceKind: 'gun', base: 100, zone, canCrit: false, critMult: 1,
    point: { x: e.pos.x, y: e.pos.y + y, z: e.pos.z + z },
  };
}

describe('Auditor plates', () => {
  it('covers the head until the brow breaks, then the front and the back', () => {
    const { s, e } = boss();
    const hp = e.hp;
    equipAuditorPlates(e, 1);
    damageEnemy(s, e, hit(e, 'weak', -1, 6.5));
    damageEnemy(s, e, hit(e, 'weak', -1, 6.5));
    expect(e.hp).toBe(hp);
    expect(e.plates.find((p) => p.id === 'brow').hp).toBe(50);
    damageEnemy(s, e, hit(e, 'weak', -1, 6.5));
    expect(e.plates.find((p) => p.id === 'brow').hp).toBe(0);
    expect(s.events.some((ev) => ev.type === 'plateBreak' && ev.plate === 'brow')).toBe(true);
    damageEnemy(s, e, hit(e, 'weak', -1, 6.5));
    expect(e.hp).toBe(hp - 100);
    const chest = e.plates.find((p) => p.id === 'chest');
    damageEnemy(s, e, hit(e, 'body', -2, 3));
    expect(chest.hp).toBe(300);
    expect(e.hp).toBe(hp - 110);
    const back = e.plates.find((p) => p.id === 'back');
    damageEnemy(s, e, hit(e, 'body', 2, 3));
    expect(back.hp).toBe(300);
    expect(chest.hp).toBe(300);
  });

  it('scales plate hp with the tier and leaves the wave monster bare', () => {
    const { e } = boss(5);
    equipAuditorPlates(e, 5);
    expect(e.plates.map((p) => p.maxHp)).toEqual([437, 700, 700]);
    const bare = createGameState({ seed: 2 });
    const wave = createBoss(bare, 'monster', { pos: { x: 0, z: 0 } });
    const before = wave.hp;
    damageEnemy(bare, wave, { sourceKind: 'gun', base: 100, zone: 'body', canCrit: false, point: { x: 0, y: 3, z: -2 } });
    expect(wave.plates).toBeUndefined();
    expect(wave.hp).toBe(before - 100);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  });
});
