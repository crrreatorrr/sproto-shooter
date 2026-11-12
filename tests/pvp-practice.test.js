import { describe, it, expect } from 'vitest';
import { createMatch, step, hashState } from '../src/sim/pvp/sim.js';
import { practiceWish, practiceBotWish } from '../src/sim/pvp/practice.js';
import { MATCH_TICKS } from '../src/sim/pvp/rules.js';

/** Seat 0 is driven by `a`, seat 1 by `b`. Returns the finished match and what seat 1 pressed. */
function play(seed, a, b) {
  const state = createMatch(seed);
  const used = { jump: 0, dash: 0, slide: 0, grapple: 0, sprint: 0, slots: new Set(), left: 0, right: 0 };
  for (let i = 0; i <= MATCH_TICKS + 5 && state.phase !== 'done'; i++) {
    const w0 = a(state.tick, state.players[0], state.players[1]);
    const w1 = b(state.tick, state.players[1], state.players[0]);
    for (const k of ['jump', 'dash', 'slide', 'grapple', 'sprint']) if (w1[k]) used[k]++;
    used.slots.add(w1.slot);
    if (w1.moveX > 0) used.right++; else if (w1.moveX < 0) used.left++;
    step(state, [w0, w1]);
  }
  return { state, used };
}

describe('Free 1v1 practice opponent', () => {
  it('is a pure function of the tick and the two players', () => {
    const a = play(7, practiceBotWish, practiceBotWish).state;
    const b = play(7, practiceBotWish, practiceBotWish).state;
    expect(hashState(a)).toBe(hashState(b));
    const self = { x: 0, y: 0, z: 10 }, other = { x: 3, y: 0, z: -12 };
    expect(practiceBotWish(123, self, other)).toEqual(practiceBotWish(123, self, other));
  });

  it('uses the movement kit: strafes both ways, jumps, dashes, slides, sprints and changes gun', () => {
    const totals = { jump: 0, dash: 0, slide: 0, sprint: 0, grapple: 0, left: 0, right: 0, slots: new Set() };
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      // against a still target, so the match runs long enough to show the whole pattern
      const { used } = play(seed, (t, me) => ({ yaw: me.yaw, pitch: 0 }), practiceBotWish);
      for (const k of ['jump', 'dash', 'slide', 'sprint', 'grapple', 'left', 'right']) totals[k] += used[k];
      for (const s of used.slots) totals.slots.add(s);
    }
    for (const k of ['jump', 'dash', 'left', 'right']) expect(totals[k], k).toBeGreaterThan(0);
    expect(totals.slots.size).toBeGreaterThan(1);
    // far apart it sprints, slides and reaches for a pillar
    const far = practiceBotWish(21, { x: 0, y: 0, z: 40 }, { x: 0, y: 0, z: -40 });
    expect(far.slide).toBe(true);
    expect(far.slot).toBe(2);
    expect(practiceBotWish(10, { x: 0, y: 0, z: 40 }, { x: 0, y: 0, z: -40 }).sprint).toBe(true);
    expect(practiceBotWish(10, { x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: -3 }).slot).toBe(1);
  });

  it('is a threat without being an aimbot: it wins against a target that stands still, but takes longer than the old one', () => {
    const still = (t, me) => ({ yaw: me.yaw, pitch: 0 });
    for (const seed of [1, 2, 3, 4]) {
      const fresh = play(seed, still, practiceBotWish).state;
      const old = play(seed, still, practiceWish).state;
      expect(fresh.winner).toBe(1);
      expect(old.winner).toBe(1);
      // Shared locomotion (double jump, dash end) lets the bot close a little faster than the
      // old 1.5x gap. The sway still makes it slower than the aimbot, which never misses.
      expect(fresh.tick).toBeGreaterThan(old.tick * 1.25);
      expect(fresh.tick).toBeLessThan(MATCH_TICKS / 2);
    }
  });

  it('leaves the old opponent exactly as it was', () => {
    expect(practiceWish(95, { x: 0, z: 10 }, { x: 0, z: -10 })).toEqual({
      yaw: practiceWish(95, { x: 0, z: 10 }, { x: 0, z: -10 }).yaw, pitch: 0, moveX: 0, moveZ: 0, fire: false, zoom: true,
      sprint: false, jump: false, dash: false, reload: false, slot: 0,
    });
  });
});
