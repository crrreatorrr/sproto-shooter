import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { damageLevelSolid } from '../src/sim/campaign/mechanisms.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createGameState } from '../src/sim/state.js';

function world() {
  const s = createGameState({ seed: 1 });
  s.level = { scripts: { 'SB-BOSS': { part: 0, partT: 0.2, home: {} } } };
  s._v2section = {
    mechanisms: [{ kind: 'target', id: 'py1', hp: 40 }],
  };
  return s;
}

describe('script shields', () => {
  it('lets a gun hit a target while the Duo book has no targets list', () => {
    const s = world();
    const gone = damageLevelSolid(s, { id: 'py1' }, { base: 10, sourceKind: 'gun' });
    expect(gone).toBe(false);
    expect(s.level.targets.py1.hp).toBe(30);
  });

  it('still blocks the shot while a living shield target is up', () => {
    const s = world();
    s.level.scripts['SB-BOSS'].targets = { loom: 7 };
    s.level.scripts['SB-BOSS'].specs = { loom: { shields: ['py1'] } };
    s.enemies.push({ id: 7, dead: false });
    const gone = damageLevelSolid(s, { id: 'py1' }, { base: 10, sourceKind: 'gun' });
    expect(gone).toBe(false);
    expect(s.level.targets).toBeUndefined();
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('e749d2fd');
  });
});
