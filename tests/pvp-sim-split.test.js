// SHOOTER-S1 guard: splitting step() into movePlayer / weaponTick / traceShots must not move a
// single bit of the PvP sim. The golden ce272de1 is the cross-runtime pin (goja and Chromium run
// in pvp-sim.test.js); the fuzz hashes below were recorded on the unsplit step() and cover what the
// golden does not: strafing, sprint, jump, dash, reload, gun swaps, pitch, ammo exhaustion.
import { describe, expect, it } from 'vitest';
import * as sim from '../src/sim/pvp/sim.js';
import { DT } from '../src/sim/pvp/rules.js';
import { yawTo } from '../src/core/math.js';

const { createMatch, hashState, replay, scriptedMatch, step } = sim;

/** mulberry32, test-local so the guard does not depend on the net harness. */
function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (lo, hi) => lo + (hi - lo) * next() };
}

/** A seeded duel driven from the live state, so shots land, shields break and players die. */
function fuzzMatch(seed, ticks, noise = 0.06) {
  const rng = createRng(seed);
  const state = createMatch(seed);
  for (let i = 0; i < ticks && state.phase === 'live'; i++) {
    const wishes = [0, 1].map((seat) => {
      const self = state.players[seat];
      const other = state.players[1 - seat];
      return {
        yaw: yawTo(self, other) + rng.range(-noise, noise),
        pitch: rng.range(-0.05, 0.05),
        moveX: rng.next() < 0.5 ? rng.range(-1, 1) : 0,
        moveZ: rng.range(-0.4, 1),
        fire: rng.next() < 0.6,
        zoom: rng.next() < 0.3,
        sprint: rng.next() < 0.3,
        jump: rng.next() < 0.04,
        dash: rng.next() < 0.03,
        reload: rng.next() < 0.02,
        slot: rng.next() < 0.03 ? Math.floor(rng.range(0, 3)) : -1,
      };
    });
    step(state, wishes);
  }
  return state;
}

// Recorded on the unsplit step() (sproto-shooter 78edcef) before the refactor.
const FUZZ = Object.freeze([
  { seed: 1, ticks: 900, noise: 0.06, tick: 236, reason: 'ko', hash: '49f3057b' },
  { seed: 7, ticks: 900, noise: 0.06, tick: 619, reason: 'ko', hash: '1e2dbb05' },
  { seed: 2024, ticks: 2700, noise: 0.06, tick: 116, reason: 'ko', hash: '27e09c5f' },
  { seed: 5, ticks: 2700, noise: 0.5, tick: 2700, reason: 'time', hash: '95e040d0' },
  { seed: 6, ticks: 2700, noise: 0.35, tick: 2700, reason: 'time', hash: '623eab41' },
]);

describe('PvP sim split keeps the golden (SHOOTER-S1)', () => {
  it('keeps golden ce272de1 in node', () => {
    const state = replay(scriptedMatch(7, 180));
    expect(hashState(state)).toBe('ce272de1');
    expect(state.tick).toBe(61);
    expect(state.reason).toBe('double_ko');
  });

  for (const row of FUZZ) {
    it(`keeps the fuzz match hash for seed ${row.seed}`, () => {
      const state = fuzzMatch(row.seed, row.ticks, row.noise);
      expect({ tick: state.tick, reason: state.reason, hash: hashState(state) })
        .toEqual({ tick: row.tick, reason: row.reason, hash: row.hash });
    });
  }

  it('exports pure movePlayer, weaponTick and traceShots', () => {
    expect(typeof sim.movePlayer).toBe('function');
    expect(typeof sim.weaponTick).toBe('function');
    expect(typeof sim.traceShots).toBe('function');
  });

  it('movePlayer moves only its own player', () => {
    const state = createMatch(5);
    const [p, other] = state.players;
    const before = JSON.stringify(other);
    const wish = sim.normalizeWish(p, { yaw: p.yaw, pitch: 0.3, moveZ: 1, sprint: true });
    sim.movePlayer(p, wish, DT);
    expect(JSON.stringify(other)).toBe(before);
    expect(p.pitch).toBeCloseTo(0.3, 4);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(0);
  });

  it('weaponTick fires once per cooldown and traceShots only reads the target', () => {
    const state = createMatch(5);
    const [p, other] = state.players;
    const wish = sim.normalizeWish(p, { yaw: p.yaw, pitch: 0, fire: true, zoom: true, slot: -1 });
    const mag = p.mag[p.slot];
    expect(sim.weaponTick(p, wish, DT)).toBe(true);
    expect(p.mag[p.slot]).toBe(mag - 1);
    expect(p.fireCd).toBeGreaterThan(0);
    const before = JSON.stringify(other);
    const hits = sim.traceShots(p, other, wish);
    expect(Array.isArray(hits)).toBe(true);
    expect(hits.every((h) => Number.isInteger(h) && h >= 0)).toBe(true);
    expect(JSON.stringify(other)).toBe(before);
    expect(sim.weaponTick(p, wish, DT)).toBe(false);
  });
});
