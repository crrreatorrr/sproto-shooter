// Scripted Wave Mode and Sandbox runs used by the C-M0 baseline hash.
// Wave Mode matches tests/fullrun.test.js: legendary MG, god mode, infinite ammo, aim nearest.
import { createGameState } from '../../src/sim/state.js';
import { simulate } from '../../src/sim/simulate.js';
import { generateGun } from '../../src/sim/guns.js';
import { stateHash } from '../../src/sim/hash.js';
import { cmd } from '../helpers.js';

export const BASELINE_TICKS = [600, 3000, 6000];
export const WAVE_SEEDS = [11, 12, 13];
export const SANDBOX_SEED = 21;

function aimNearest(st) {
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

function waveCommand(st, i) {
  if (i === 0) {
    return cmd({ actions: [
      { type: 'startMode', mode: 'waves', tier: 1 },
      { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
      { type: 'debug', op: 'setTuning', args: { key: 'infiniteAmmo', value: true } },
    ] });
  }
  return aimNearest(st);
}

function sandboxCommand(st, i) {
  if (i === 0) {
    return cmd({ actions: [
      { type: 'startMode', mode: 'sandbox', tier: 1 },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'midget', count: 6 } },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'flyingMidget', count: 3 } },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'obama', count: 2 } },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'bigObama' } },
    ] });
  }
  return aimNearest(st);
}

function prepareWave(seed) {
  const s = createGameState({ seed });
  const p = s.players[s.localPlayerId];
  const g = generateGun({ seed: 5, level: 4, forced: { type: 'mg', quality: 'legendary', wacky: 'tenthMega' } });
  g.id = 999;
  p.guns[0] = g;
  return s;
}

/**
 * Run a scripted scenario to `maxTick` and hash at BASELINE_TICKS.
 * `gameplay` drops `state.level` so the circle-arena path can be compared to pre-C-M0.
 */
export function runScenario(kind, seed, maxTick = 6000) {
  const state = kind === 'waves' ? prepareWave(seed) : createGameState({ seed });
  const make = kind === 'waves' ? waveCommand : sandboxCommand;
  const marks = new Set(BASELINE_TICKS.filter((t) => t <= maxTick));
  const hashes = {};
  const p = state.players[state.localPlayerId];
  for (let i = 0; i < maxTick; i++) {
    simulate(state, { [p.id]: make(state, i) });
    if (marks.has(state.tick)) {
      hashes[state.tick] = {
        full: stateHash(state),
        gameplay: stateHash(state, { omit: ['events', 'level'] }),
      };
    }
  }
  return { kind, seed, tick: state.tick, hashes };
}

export function runAllBaselines(maxTick = 6000) {
  const waves = {};
  for (const seed of WAVE_SEEDS) waves[seed] = runScenario('waves', seed, maxTick).hashes;
  const sandbox = runScenario('sandbox', SANDBOX_SEED, maxTick).hashes;
  return { ticks: BASELINE_TICKS.filter((t) => t <= maxTick), waves, sandbox };
}
