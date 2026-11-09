// SHOOTER-S3: adaptive remote interpolation delay and input clock trimming.
import { describe, expect, it } from 'vitest';
import { NET, createPvpClient } from '../../src/net/client.js';
import { decodeInput } from '../../src/net/inputCodec.js';
import { OP } from '../../src/net/protocol.js';
import { STEP_MS } from '../../src/sim/pvp/rules.js';
import {
  TIMING, clockRate, createInterpDelay, interpTarget,
} from '../../src/net/timing.js';

describe('adaptive interpolation delay D = clamp(snapshot interval + 2 x jitter p95, 50, 150)', () => {
  it('computes the target and clamps it', () => {
    expect(interpTarget(STEP_MS, 0)).toBe(TIMING.interpMinMs);
    expect(interpTarget(STEP_MS, 20)).toBeCloseTo(STEP_MS + 40, 9);
    expect(interpTarget(STEP_MS, 400)).toBe(TIMING.interpMaxMs);
    expect(interpTarget(NaN, NaN)).toBe(TIMING.interpMaxMs);
  });

  it('measures jitter as the p95 lateness of snapshots behind the least-delayed one', () => {
    const d = createInterpDelay({ initialMs: 100 });
    // Evenly spread lateness 0..29 ms at a 33 ms interval: p95 is 28 ms.
    for (let i = 0; i < 90; i++) d.observe(i % 30, STEP_MS);
    expect(d.jitterP95Ms).toBe(28);
    expect(d.intervalMs).toBeCloseTo(STEP_MS, 9);
    expect(d.targetMs).toBeCloseTo(STEP_MS + 56, 9);
  });

  it('moves smoothly: up at most interpUpPerMs, down at most interpDownPerMs of elapsed time', () => {
    const d = createInterpDelay({ initialMs: 100 });
    for (let i = 0; i < 90; i++) d.observe(0, STEP_MS);
    expect(d.targetMs).toBe(TIMING.interpMinMs);
    expect(d.step(100)).toBeCloseTo(100 - 100 * TIMING.interpDownPerMs, 9);
    for (let t = 0; t < 2000; t += 16) d.step(16);
    expect(d.valueMs).toBe(TIMING.interpMinMs);
    // A stall: lateness of 400 ms pulls the target to the cap; D rises at most 0.2 ms per ms.
    for (let i = 0; i < 12; i++) d.observe(400 - i * 33, STEP_MS);
    expect(d.targetMs).toBe(TIMING.interpMaxMs);
    expect(d.step(50)).toBeCloseTo(TIMING.interpMinMs + 50 * TIMING.interpUpPerMs, 9);
    for (let t = 0; t < 2000; t += 16) d.step(16);
    expect(d.valueMs).toBe(TIMING.interpMaxMs);
  });

  it('forgets old samples after the window', () => {
    const d = createInterpDelay({ initialMs: 100 });
    for (let i = 0; i < 10; i++) d.observe(300, STEP_MS);
    for (let i = 0; i < TIMING.interpWindow; i++) d.observe(5, STEP_MS);
    expect(d.jitterP95Ms).toBe(5);
  });
});

describe('input clock trim (Overwatch-style): +-5% toward the target lead, no skipped frames', () => {
  it('maps the lead error to a clock rate within +-5%, with a dead band', () => {
    expect(clockRate(0)).toBe(1);
    expect(clockRate(TIMING.rateDeadbandTicks / 2)).toBe(1);
    expect(clockRate(0.5)).toBeCloseTo(1 + 0.5 * TIMING.rateGainPerTick, 9);
    expect(clockRate(1)).toBeCloseTo(1.05, 9);
    expect(clockRate(-1)).toBeCloseTo(0.95, 9);
    expect(clockRate(10)).toBeCloseTo(1 + TIMING.rateMax, 9);
    expect(clockRate(-10)).toBeCloseTo(1 - TIMING.rateMax, 9);
  });

  function rig(rttMs = 60) {
    let now = 0;
    const fns = [];
    const sent = [];
    const match = {
      send(op, data) { sent.push({ op, at: now, data }); },
      onMessage(fn) { fns.push(fn); return () => {}; },
    };
    const client = createPvpClient({ accountId: 'ada', match, clock: () => now });
    const deliver = (op, body) => { for (const fn of fns) fn({ opCode: op, json: () => body }); };
    deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, lastSeq: 0 });
    now += rttMs;
    const ping = sent.filter((m) => m.op === OP.PING).at(-1);
    deliver(OP.PONG, { t: ping.data.t, serverMs: 0, tick: 0, clockTick: 0, phase: 'lobby' });
    client.ready();
    deliver(OP.PHASE, { phase: 'live', tick: 0, clockTick: now / STEP_MS - 0 });
    const inputs = () => sent.filter((m) => m.op === OP.INPUT).map((m) => ({ at: m.at, ...decodeInput(m.data) }));
    return {
      client,
      deliver,
      inputs,
      get now() { return now; },
      /** 60 Hz render frames for `ms`, with a snapshot every tick carrying `you`. */
      run(ms, you = () => ({})) {
        const end = now + ms;
        let tick = Math.floor(now / STEP_MS);
        while (now < end) {
          now += 1000 / 60;
          while ((tick + 1) * STEP_MS <= now) {
            tick += 1;
            deliver(OP.SNAPSHOT, {
              tick, clockTick: tick, phase: 'live', players: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
              you: { seat: 0, ackFrame: tick - 1, ackSeq: 0, buffer: 2, late: 0, ...you(tick) },
            });
          }
          client.update(now, () => ({ yaw: 0, moveZ: 0 }));
        }
      },
    };
  }

  it('a late frame raises the target lead; the clock runs up to 5% fast to reach it without skipping a frame', () => {
    const r = rig();
    r.run(1000);
    const start = r.client.net.lead;
    const before = r.inputs().length;
    let late = 0;
    r.run(2000, (tick) => {
      if (tick === Math.floor(1100 / STEP_MS)) late = 1;
      return { late };
    });
    expect(r.client.net.lead).toBe(start + 1);
    const after = r.inputs().slice(before - 1);
    for (let i = 1; i < after.length; i++) expect(after[i].frame).toBe(after[i - 1].frame + 1);
    expect(r.client.net.clockRateMax).toBeGreaterThan(1.02);
    expect(r.client.net.clockRateMax).toBeLessThanOrEqual(1 + TIMING.rateMax + 1e-9);
    // It got there: the stamped lead now sits on the new target.
    expect(r.client.net.leadNow).toBeGreaterThan(start + 1 - 0.75);
    expect(r.client.net.clockSnaps).toBe(0);
  });

  it('a deep server buffer lowers the target lead; the clock runs slow and never repeats a frame', () => {
    const r = rig();
    r.run(1000);
    const start = r.client.net.lead;
    const before = r.inputs().length;
    r.run(4000, () => ({ buffer: 5 }));
    expect(r.client.net.lead).toBeLessThan(start);
    const after = r.inputs().slice(before - 1);
    for (let i = 1; i < after.length; i++) expect(after[i].frame).toBe(after[i - 1].frame + 1);
    expect(r.client.net.clockRateMin).toBeLessThan(0.98);
    expect(r.client.net.clockRateMin).toBeGreaterThanOrEqual(1 - TIMING.rateMax - 1e-9);
    expect(r.client.net.clockSnaps).toBe(0);
  });

  it('resyncs (one skip) only when the lead is off by more than resyncTicks', () => {
    const r = rig();
    r.run(1000);
    // A long render stall: the input clock drops the backlog, so frames fall behind the clock.
    const last = r.inputs().at(-1);
    r.run(0);
    r.client.update(r.now + 600, () => ({ yaw: 0 }));
    const next = r.inputs().at(-1);
    expect(next.frame - last.frame).toBeGreaterThan(NET.maxTicksPerUpdate);
    expect(r.client.net.clockSnaps).toBe(1);
  });

  it('stamps a non-decreasing view tick, at most NET.viewStepTicks past the previous input', () => {
    const r = rig();
    r.run(500);
    // Render frames with the clock estimate jumping back and forward.
    for (let i = 0; i < 60; i++) {
      r.client.sample(r.now + (i % 7 === 3 ? -200 : i % 11 === 5 ? 400 : 0));
      r.run(1000 / 30);
    }
    const views = r.inputs().map((input) => input.viewTick + input.viewFrac / 256);
    for (let i = 1; i < views.length; i++) {
      expect(views[i]).toBeGreaterThanOrEqual(views[i - 1]);
      expect(views[i] - views[i - 1]).toBeLessThanOrEqual(NET.viewStepTicks + 1 / 256);
    }
  });

  it('announces its current delay in every PING', () => {
    const r = rig();
    r.run(3000);
    const pings = [];
    // Fresh PINGs carry interpMs equal to the client's current D, rounded.
    r.client.update(r.now + NET.pingMs, () => ({ yaw: 0 }));
    expect(r.client.net.interpDelayMs).toBeGreaterThanOrEqual(TIMING.interpMinMs);
    expect(r.client.net.interpDelayMs).toBeLessThanOrEqual(TIMING.interpMaxMs);
    pings.push(r.client.net.interpAnnouncedMs);
    expect(pings[0]).toBe(Math.round(r.client.net.interpDelayMs));
  });
});
