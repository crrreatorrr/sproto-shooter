import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { stateHash } from '../../src/sim/hash.js';
import { runAllBaselines, WAVE_SEEDS } from './scenarios.js';

const golden = JSON.parse(fs.readFileSync('tests/fixtures/baseline-hashes.json', 'utf8'));

describe('stateHash', () => {
  it('ignores key order and events', () => {
    const a = stateHash({ events: [{ type: 'shot' }], b: 1, a: { d: 1, c: [2, 3] } });
    const b = stateHash({ a: { c: [2, 3], d: 1 }, events: [], b: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('can omit state.level so the arena field is not gameplay', () => {
    const withLevel = { events: [], level: { id: 'arena' }, tick: 3 };
    expect(stateHash(withLevel, { omit: ['events', 'level'] })).toBe(stateHash({ tick: 3 }));
    expect(stateHash(withLevel)).not.toBe(stateHash({ tick: 3 }));
  });
});

describe('wave and sandbox baseline', () => {
  it('matches the locked hashes at 600, 3000 and 6000 ticks', () => {
    const got = runAllBaselines(6000);
    for (const seed of WAVE_SEEDS) {
      for (const tick of golden.ticks) {
        const key = String(tick);
        expect(got.waves[seed][tick].full, `waves ${seed} @ ${tick} full`).toBe(golden.full.waves[String(seed)][key]);
        expect(got.waves[seed][tick].gameplay, `waves ${seed} @ ${tick} gameplay`).toBe(golden.gameplay.waves[String(seed)][key]);
      }
    }
    for (const tick of golden.ticks) {
      const key = String(tick);
      expect(got.sandbox[tick].full, `sandbox @ ${tick} full`).toBe(golden.full.sandbox[key]);
      expect(got.sandbox[tick].gameplay, `sandbox @ ${tick} gameplay`).toBe(golden.gameplay.sandbox[key]);
    }
  }, 20000);
});
