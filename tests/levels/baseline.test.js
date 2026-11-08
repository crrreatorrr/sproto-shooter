import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from '../helpers.js';
import { generateGun } from '../../src/sim/guns.js';
import { stateHash } from '../../src/sim/hash.js';
import fixture from '../fixtures/baseline-hashes.json';

function aim(st) {
  const pl = st.players[st.localPlayerId];
  if (st.wave && st.wave.phase === 'victory') return cmd();
  let best = null, bd = 1e9;
  for (const e of st.enemies) {
    if (e.dead || e.state === 'spawning') continue;
    const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return cmd({ pressed: { skip: true } });
  const ty = best.type === 'hexAuditor' ? best.pos.y : best.pos.y + best.height * best.scale * 0.5;
  const yaw = Math.atan2(-(best.pos.x - pl.pos.x), -(best.pos.z - pl.pos.z));
  const pitch = Math.atan2(ty - (pl.pos.y + 1.6), bd);
  return cmd({ yaw, pitch: pitch - pl.recoil.pitch, held: { fire: true } });
}

function hashRun(seed, mode) {
  const s = createGameState({ seed });
  const p = s.players[s.localPlayerId];
  const g = generateGun({ seed: 5, level: 4, forced: { type: 'mg', quality: 'legendary', wacky: 'tenthMega' } });
  g.id = 999;
  p.guns[0] = g;
  const actions = [
    { type: 'startMode', mode, tier: 1 },
    { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
    { type: 'debug', op: 'setTuning', args: { key: 'infiniteAmmo', value: true } },
  ];
  if (mode === 'sandbox') {
    for (const [type, count] of [['midget', 6], ['flyingMidget', 3], ['obama', 2], ['bigObama', 1]]) {
      actions.push({ type: 'debug', op: 'spawnEnemy', args: { type, count } });
    }
  }
  const out = {};
  const marks = [600, 3000, 6000];
  for (let i = 0; i < 6000; i++) {
    const c = i === 0 ? cmd({ actions }) : aim(s);
    run(s, 1, () => c);
    if (marks.includes(s.tick)) out[s.tick] = stateHash(s);
  }
  return out;
}

// Wave hashes lock the current arena sim (seeds 11–13, legendary MG, god mode),
// including boss weapons and the duck gun. Sandbox uses that same harness plus
// midget×6, flying midget×3, obama×2, big obama×1.
describe('arena baseline', () => {
  it('wave mode hashes match the locked main baseline', () => {
    for (const seed of [11, 12, 13]) {
      const got = hashRun(seed, 'waves');
      expect(got).toEqual({
        600: fixture.waves[seed][600],
        3000: fixture.waves[seed][3000],
        6000: fixture.waves[seed][6000],
      });
    }
  }, 30000);

  it('sandbox hashes match the locked main baseline', () => {
    const got = hashRun(21, 'sandbox');
    expect(got).toEqual({
      600: fixture.sandbox[21][600],
      3000: fixture.sandbox[21][3000],
      6000: fixture.sandbox[21][6000],
    });
  }, 20000);
});
