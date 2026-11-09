// SHOOTER-S3: adaptive remote interpolation delay and input clock trimming.
import { describe, expect, it } from 'vitest';
import { NET, createPvpClient } from '../../src/net/client.js';
import { decodeInput } from '../../src/net/inputCodec.js';
import { OP } from '../../src/net/protocol.js';
import { INPUT_LIMITS, STEP_MS } from '../../src/sim/pvp/rules.js';
import { continuousView } from '../../src/sim/pvp/director.js';
import {
  TIMING, clockRate, createInterpDelay, interpTarget,
} from '../../src/net/timing.js';

describe('adaptive interpolation delay D = clamp(snapshot interval + 2 x jitter p95, 50, 150)', () => {
  it('computes the target and clamps it', () => {
    expect(interpTarget(STEP_MS, 0)).toBe(TIMING.interpMinMs);
    // A tick more than the p95 lateness of the first newly drawable tick is a floor.
    expect(interpTarget(STEP_MS, 5, 45)).toBeCloseTo(STEP_MS + 45, 9);
    expect(interpTarget(STEP_MS, 20, 5)).toBeCloseTo(STEP_MS + 40, 9);
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

  it('covers the tick a late loop callback skipped (stepLate), not just each snapshot tick', () => {
    const d = createInterpDelay({ initialMs: 100 });
    // Every other snapshot follows a two-tick step: its first new tick arrived a tick late.
    for (let i = 0; i < 90; i++) d.observe(5, STEP_MS, i % 2 ? 5 + STEP_MS : 5);
    expect(d.jitterP95Ms).toBe(5);
    expect(d.stepLateP95Ms).toBeCloseTo(5 + STEP_MS, 9);
    expect(d.targetMs).toBeCloseTo(2 * STEP_MS + 5, 9);
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

// SHOOTER-S3 merged with the S1/S2a/S2b review fixes: one owner of the lead. Every rule (late
// raises, the RTT cap and lift, the buffer trim, frame rejects, clock-estimate steps) moves the
// target lead only; the frames follow it with the clock trim, a hold (repeat) past
// TIMING.holdTicks over it, or a forward jump when frames are really falling short.
describe('one owner of the lead: rules move the target, the input clock moves the frames', () => {
  /**
   * A client with snapshots every tick. The downlink takes `downAt(t)` ms (TCP order: a faster
   * downlink does not overtake), a PING round trip takes `rttAt(t)`; `you(tick, t)` fills you.
   */
  function rig({ rttAt = () => 80, downAt = () => 40, you = () => ({}) } = {}) {
    let now = 0;
    const fns = [];
    const sent = [];
    const match = {
      send(op, data) { sent.push({ op, at: now, data }); },
      onMessage(fn) { fns.push(fn); return () => {}; },
    };
    const client = createPvpClient({ accountId: 'ada', match, clock: () => now });
    const deliver = (op, body) => { for (const fn of fns) fn({ opCode: op, json: () => body }); };
    const answered = new Set();
    deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, lastSeq: 0 });
    now += rttAt(0);
    const ping = sent.filter((m) => m.op === OP.PING).at(-1);
    answered.add(ping);
    deliver(OP.PONG, { t: ping.data.t, serverMs: 0, tick: 0, clockTick: 0, phase: 'lobby' });
    client.ready();
    deliver(OP.PHASE, { phase: 'live', tick: 0, clockTick: (now - downAt(now)) / STEP_MS });
    const inputs = () => sent.filter((m) => m.op === OP.INPUT).map((m) => ({ at: m.at, ...decodeInput(m.data) }));
    let tick = Math.floor((now - downAt(now)) / STEP_MS);
    return {
      client,
      deliver,
      inputs,
      sent,
      get now() { return now; },
      run(ms) {
        const end = now + ms;
        while (now < end) {
          now += 1000 / 60;
          for (const m of sent) {
            if (m.op !== OP.PING || answered.has(m) || m.at + rttAt(m.at) > now) continue;
            answered.add(m);
            deliver(OP.PONG, { t: m.data.t, serverMs: 0, tick, clockTick: (now - downAt(now)) / STEP_MS, phase: 'live' });
          }
          while ((tick + 1) * STEP_MS + downAt((tick + 1) * STEP_MS) <= now) {
            tick += 1;
            deliver(OP.SNAPSHOT, {
              tick, clockTick: tick, phase: 'live', players: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
              you: { seat: 0, ackFrame: tick - 1, ackSeq: 0, buffer: 2, late: 0, ...you(tick, now) },
            });
          }
          client.update(now, () => ({ yaw: 0, moveZ: 0 }));
        }
      },
    };
  }

  /** Feed the inputs through the director's continuity rule; count its clamps. */
  function viewClamps(inputs) {
    const seat = { viewTick: null, viewBack: null };
    let clamps = 0;
    for (const input of inputs) {
      const kept = continuousView(seat, input.frame, input.viewTick);
      if (kept.clamped) clamps += 1;
      seat.viewTick = kept.viewTick;
      seat.viewBack = input.frame - kept.viewTick;
    }
    return clamps;
  }

  it('an RTT spike: the target lifts at once, is capped when the RTT falls, and frames never move back', () => {
    const spike = (t) => t >= 2000 && t < 5000;
    let late = 0;
    const r = rig({
      rttAt: (t) => (spike(t) ? 300 : 80),
      // Inputs stamped before the lift arrive late during the first round trip of the spike.
      you: (tick, t) => ({ late: spike(t) && t < 2400 ? (late += 1) : late }),
    });
    r.run(2000);
    const calm = r.client.net.lead;
    r.run(3000);
    expect(r.client.net.leadLifts).toBeGreaterThanOrEqual(1);
    expect(r.client.net.maxLead).toBeGreaterThanOrEqual(Math.ceil(300 / STEP_MS) + 1);
    r.run(3000);
    // Back to the round-trip lead plus the jitter margin, and the frames followed it.
    expect(r.client.net.lead).toBeLessThanOrEqual(calm + NET.leadJitterTicks);
    expect(r.client.net.leadCaps).toBeGreaterThanOrEqual(1);
    expect(r.client.net.clockHolds).toBeGreaterThan(0);
    expect(r.client.net.leadNow).toBeLessThan(r.client.net.lead + TIMING.holdTicks);
    const inputs = r.inputs();
    for (let i = 1; i < inputs.length; i++) expect(inputs[i].frame).toBeGreaterThanOrEqual(inputs[i - 1].frame);
    // The director's continuity rule never fires for this client.
    expect(viewClamps(inputs)).toBe(0);
  });

  it('a clock-estimate step (the downlink got slower) moves the target with it: no trim chases it', () => {
    // 40 ms -> 140 ms one way: the estimate falls 3 ticks once the slow packets fill its window.
    const r = rig({ downAt: (t) => (t >= 2000 ? 140 : 40), rttAt: (t) => (t >= 2000 ? 180 : 80) });
    r.run(2000);
    const lead = r.client.net.lead;
    const before = r.inputs().length;
    r.run(1500);
    expect(r.client.net.clockSteps).toBe(1);
    expect(r.client.net.lead).toBe(lead + 3);
    expect(r.client.net.clockSnaps).toBe(0);
    expect(r.client.net.clockHolds).toBe(0);
    // The same frames, one per tick: nothing pulled them down toward the fallen estimate.
    const after = r.inputs().slice(before - 1);
    for (let i = 1; i < after.length; i++) expect(after[i].frame).toBe(after[i - 1].frame + 1);
    expect(r.client.net.clockRateMin).toBeGreaterThan(0.98);
  });

  it('a clock step up (the downlink got faster) lowers the target with it, without late frames no jump', () => {
    const r = rig({ downAt: (t) => (t >= 2000 ? 40 : 140), rttAt: (t) => (t >= 2000 ? 80 : 180) });
    r.run(1900);
    const lead = r.client.net.lead;
    const steps = r.client.net.clockSteps;
    r.run(1600);
    // The packets queued behind the slow ones arrive in a burst: one step or a few.
    expect(r.client.net.clockSteps).toBeGreaterThan(steps);
    // 100 ms is three ticks; the burst lands on render frames, so two or three.
    expect(r.client.net.lead).toBeLessThanOrEqual(lead - 2);
    expect(r.client.net.clockSnaps).toBe(0);
    expect(viewClamps(r.inputs())).toBe(0);
  });

  it('late frames jump the stamp up once it is lateResyncTicks short; without them it trims', () => {
    let late = 0;
    const r = rig({ rttAt: () => 60, you: (tick) => ({ late: tick % 6 === 0 && tick > 40 && tick < 120 ? (late += 1) : late }) });
    r.run(1000);
    const start = r.client.net.lead;
    r.run(3000);
    // Raised once per round trip, up to the round-trip lead + the jitter margin.
    expect(r.client.net.lead).toBe(Math.min(NET.leadMax, start + NET.leadJitterTicks));
    expect(r.client.net.clockSnaps).toBeGreaterThanOrEqual(1);
    expect(r.client.net.leadNow).toBeGreaterThan(r.client.net.lead - 1);
    expect(viewClamps(r.inputs())).toBe(0);
  });

  it('counts a PONG once, and only for a PING still outstanding', () => {
    const r = rig({ rttAt: () => 80 });
    r.run(1500);
    const samples = r.client.net.rttSamples.length;
    const rtt = r.client.net.rttMs;
    const old = r.sent.filter((m) => m.op === OP.PING)[0];
    // A repeated (or forged) answer to an old PING would read as a 1.5 s round trip.
    r.deliver(OP.PONG, { t: old.data.t, serverMs: 0, tick: 0, clockTick: 0, phase: 'live' });
    r.deliver(OP.PONG, { t: r.now - 1500, serverMs: 0, tick: 0, clockTick: 0, phase: 'live' });
    expect(r.client.net.rttSamples.length).toBe(samples);
    expect(r.client.net.rttMs).toBe(rtt);
    expect(r.client.net.leadLifts).toBe(0);
  });

  it('a deep buffer trims the target by what the clock is not already draining, floored at the shortest round trip', () => {
    const r = rig({ rttAt: () => 80, you: (tick, t) => ({ buffer: t > 1500 ? 6 : 2 }) });
    r.run(1500);
    const lead = r.client.net.lead;
    r.run(NET.bufferTrimMs + 200);
    expect(r.client.net.leadTrims).toBe(1);
    // 4 over bufferTarget, but never below ceil(80 ms / tick) = 3.
    expect(r.client.net.lead).toBe(Math.max(Math.ceil(80 / STEP_MS), lead - 4));
    const trims = r.client.net.leadTrims;
    // While the trim drains the stamped lead, the same deep buffer does not trim again.
    r.run(NET.bufferTrimMs + 100);
    expect(r.client.net.leadTrims).toBeLessThanOrEqual(trims + 1);
    expect(r.client.net.lead).toBeGreaterThanOrEqual(Math.ceil(80 / STEP_MS));
  });

  it('a frame reject lowers the target at most once per round trip', () => {
    const r = rig({ rttAt: () => 200 });
    r.run(1500);
    const lead = r.client.net.lead;
    const sent = r.inputs().at(-1);
    const reject = () => r.deliver(OP.REJECT, {
      accountId: 'ada', reason: 'frame', lastSeq: sent.seq - 1, seq: sent.seq, frame: sent.frame,
      tick: sent.frame - INPUT_LIMITS.futureFrames - 3, ticketsMinted: 0,
    });
    // Every frame in flight was stamped with the same excess: three rejects, one drop.
    reject();
    reject();
    reject();
    expect(r.client.net.leadDrops).toBe(1);
    expect(r.client.net.lead).toBeLessThan(lead);
    expect(r.client.net.lead).toBeGreaterThanOrEqual(NET.leadMin);
  });

  it('keeps its view step within the director rule', () => {
    expect(NET.viewStepTicks).toBeLessThanOrEqual(2);
    expect(TIMING.holdTicks).toBeLessThan(TIMING.resyncTicks);
  });
});
