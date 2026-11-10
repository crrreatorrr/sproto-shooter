import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createEnemy, createGameState } from '../src/sim/state.js';

describe('Frostspire bodies', () => {
  it('spawns a spotter drone and a frost hound at tier 1 and tier 5', () => {
    const s = createGameState({ seed: 1 });
    s.tier = 1;
    const drone = createEnemy(s, 'spotterDrone', { tier: 1 });
    const hound = createEnemy(s, 'frostHound', { tier: 1 });
    expect(drone.maxHp).toBe(45);
    expect(hound.maxHp).toBe(55);
    expect(drone.type).toBe('spotterDrone');
    expect(ENEMIES.spotterDrone.flying).toBe(true);
    expect(ENEMIES.spotterDrone.look.length).toBeGreaterThan(0);
    expect(ENEMIES.frostHound.look.some((p) => p.kind === 'box')).toBe(true);
    expect(ENEMIES.spotterDrone.hitboxes.some((h) => h.zone === 'weak')).toBe(true);
    expect(ENEMIES.frostHound.hitboxes.some((h) => h.zone === 'weak')).toBe(true);
    s.tier = 5;
    expect(createEnemy(s, 'spotterDrone', { tier: 5 }).maxHp).toBe(79);
    expect(createEnemy(s, 'frostHound', { tier: 5 }).maxHp).toBe(96);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  });
});
