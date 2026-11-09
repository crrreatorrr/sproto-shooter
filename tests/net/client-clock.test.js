// SHOOTER-S1: the client's 30 Hz input clock, adaptive input lead, monotonic phase, and
// clock-based remote interpolation. SHOOTER-S2a: protocol 2 (PING round trips, late counts in
// snapshots instead of late rejects, sequences that never rewind, the lead-in, HELLO on rejoin).
import { describe, expect, it } from 'vitest';
import { NET, createPvpClient, sampleAt } from '../../src/net/client.js';
import { decodeInput } from '../../src/net/inputCodec.js';
import { OP } from '../../src/net/protocol.js';
import { INPUT_LIMITS, STEP_MS } from '../../src/sim/pvp/rules.js';

function player(x, z, extra = {}) {
  return { x, y: 0, z, yaw: 0, pitch: 0, vx: 0, vz: 0, hp: 100000, shield: 50000, alive: true, slot: 0, ...extra };
}

function snapshot(tick, extra = {}) {
  return {
    tick,
    phase: 'live',
    outcome: null,
    winner: null,
    reason: null,
    players: [player(tick * 0.1, 0, { vx: 3 }), player(-tick * 0.1, 0, { vx: -3 })],
    ...extra,
  };
}

/** A fake SDK match handle: records sends, and lets the test deliver server messages. */
function rig({ rttMs = 0 } = {}) {
  let now = 0;
  const fns = [];
  const sent = [];
  const hooks = {};
  const match = {
    send(op, data) { sent.push({ op, at: now, data }); },
    onMessage(fn) { fns.push(fn); return () => {}; },
    onClose(fn) { hooks.close = fn; return () => {}; },
    onRejoin(fn) { hooks.rejoin = fn; return () => {}; },
  };
  const client = createPvpClient({ accountId: 'ada', match, clock: () => now });
  const deliver = (op, body) => { for (const fn of fns) fn({ opCode: op, json: () => body }); };
  const r = {
    client,
    sent,
    deliver,
    hooks,
    get now() { return now; },
    set now(v) { now = v; },
    inputs: () => sent.filter((m) => m.op === OP.INPUT).map((m) => ({ at: m.at, ...decodeInput(m.data) })),
    reject(reason, extra = {}) { deliver(OP.REJECT, { accountId: 'ada', reason, ticketsMinted: 0, ...extra }); },
    /** Answer the newest PING after `rttMs`. */
    pong(extra = {}) {
      const ping = sent.filter((m) => m.op === OP.PING).at(-1);
      deliver(OP.PONG, { t: ping.data.t, serverMs: 0, tick: 0, clockTick: 0, phase: 'lobby', ...extra });
    },
    /** WELCOME (the client pings), the PONG after rttMs, READY, then live at `now`, tick 0. */
    goLive({ leadIn = 0 } = {}) {
      deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, lastSeq: 0 });
      now += rttMs;
      r.pong();
      client.ready();
      deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'live', tick: 0, lastSeq: 0 });
      deliver(OP.PHASE, { phase: 'live', tick: 0, clockTick: -leadIn, leadInTicks: leadIn });
      deliver(OP.SNAPSHOT, snapshot(0, { clockTick: -leadIn }));
    },
  };
  return r;
}

/** Run render frames at `hz` for `ms`, with a 10 Hz snapshot stream that is `downMs` old. */
function run(r, { hz = 60, ms = 3000, liveAt = 0, downMs = 0, build = () => ({ yaw: 0.5, pitch: 0.1, moveZ: 1 }) } = {}) {
  const frameMs = 1000 / hz;
  let nextSnap = 3;
  const end = r.now + ms;
  while (r.now < end) {
    r.now += frameMs;
    while ((nextSnap * STEP_MS) + liveAt + downMs <= r.now) {
      r.deliver(OP.SNAPSHOT, snapshot(nextSnap));
      nextSnap += 3;
    }
    r.client.update(r.now, build);
  }
}

describe('30 Hz input clock (SHOOTER-S1)', () => {
  for (const hz of [144, 60, 30, 20]) {
    it(`sends exactly one input per 30 Hz tick at a ${hz} Hz render loop, one frame apart`, () => {
      const r = rig();
      r.goLive();
      run(r, { hz, ms: 3000 });
      const inputs = r.inputs();
      expect(inputs.length).toBeGreaterThanOrEqual(89);
      expect(inputs.length).toBeLessThanOrEqual(91);
      for (let i = 1; i < inputs.length; i++) {
        expect(inputs[i].seq).toBe(inputs[i - 1].seq + 1);
        expect(inputs[i].frame).toBe(inputs[i - 1].frame + 1);
      }
      // Never more than the director's per-tick cap in one burst.
      const perAt = new Map();
      for (const input of inputs) perAt.set(input.at, (perAt.get(input.at) || 0) + 1);
      expect(Math.max(...perAt.values())).toBeLessThanOrEqual(INPUT_LIMITS.maxFramesPerCursor);
    });
  }

  it('stamps frame = estimated server tick + lead, starting at lead 2', () => {
    const r = rig();
    r.goLive();
    run(r, { hz: 60, ms: 1000 });
    expect(r.client.net.lead).toBe(NET.leadStart);
    for (const input of r.inputs()) {
      const serverTick = Math.floor(input.at / STEP_MS + 1e-9);
      expect(input.frame - serverTick).toBeGreaterThanOrEqual(NET.leadStart - 1);
      expect(input.frame - serverTick).toBeLessThanOrEqual(NET.leadStart);
    }
  });

  it('sends nothing before live, and drops a long render stall instead of bursting it', () => {
    const r = rig();
    expect(r.client.update(100, () => ({ yaw: 0 }))).toBe(0);
    r.goLive();
    run(r, { hz: 60, ms: 200 });
    const before = r.inputs().length;
    r.now += 2000;
    r.deliver(OP.SNAPSHOT, snapshot(Math.floor(r.now / STEP_MS)));
    expect(r.client.update(r.now, () => ({ yaw: 0 }))).toBe(NET.maxTicksPerUpdate);
    expect(r.inputs().length).toBe(before + NET.maxTicksPerUpdate);
  });

  it('starts the lead at the PING round trip plus one tick when it has one', () => {
    const r = rig({ rttMs: 120 });
    r.goLive();
    expect(r.client.net.rttMs).toBe(120);
    expect(r.client.net.lead).toBe(Math.ceil(120 / STEP_MS) + 1);
  });

  it('takes the median of the last PING round trips', () => {
    const r = rig();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0 });
    for (const rtt of [100, 300, 90, 110, 95]) {
      r.now += rtt;
      r.pong();
      r.now += NET.pingMs - rtt;
      r.client.update(r.now, () => null);
    }
    expect(r.client.net.rttMs).toBe(100);
    expect(r.client.net.pings).toBeGreaterThanOrEqual(5);
  });

  it('sends nothing during the lead-in until the aim point reaches tick 0', () => {
    const r = rig({ rttMs: 110 });
    r.goLive({ leadIn: 9 });
    const phaseAt = r.now;
    const lead = r.client.net.lead;
    expect(lead).toBe(5);
    const frames = [];
    let firstAt = null;
    while (r.now < phaseAt + 600) {
      r.now += 1000 / 60;
      const before = r.inputs().length;
      r.client.update(r.now, () => ({ yaw: 0 }));
      if (r.inputs().length > before && firstAt == null) firstAt = r.now;
    }
    for (const input of r.inputs()) frames.push(input.frame);
    // Tick 0 is 9 ticks after the PHASE; the first frame goes out `lead` ticks before it.
    expect(frames[0]).toBe(0);
    expect(firstAt).toBeGreaterThanOrEqual(phaseAt + (9 - lead) * STEP_MS - 1e-6);
    expect(firstAt).toBeLessThanOrEqual(phaseAt + (9 - lead + 1) * STEP_MS + 1000 / 60);
    expect(frames).toEqual(frames.map((_, i) => i));
  });
});

describe('input lead, late counts and rejects (protocol 2)', () => {
  function inflight(opts) {
    const r = rig(opts);
    r.goLive();
    run(r, { hz: 30, ms: 200 });
    return r;
  }

  const late = (r, n) => r.deliver(OP.SNAPSHOT, snapshot(6, { you: { seat: 0, late: n, ackFrame: 5, ackSeq: 5, buffer: 1 } }));

  it('a late count rising by one or two raises the lead by one, at most once per round trip', () => {
    const r = inflight({ rttMs: 60 });
    const start = r.client.net.lead;
    late(r, 1);
    expect(r.client.net.lead).toBe(start + 1);
    late(r, 2);
    expect(r.client.net.lead).toBe(start + 1);
    r.now += 60 + STEP_MS + 1;
    late(r, 3);
    expect(r.client.net.lead).toBe(start + 2);
    expect(r.client.net.lateFrames).toBe(3);
    expect(r.client.net.ack).toMatchObject({ frame: 5, seq: 5, buffer: 1, late: 3 });
  });

  it('a stall-sized burst of late frames does not raise the lead, and raises stop at RTT lead + 2', () => {
    const r = inflight({ rttMs: 60 });
    const start = r.client.net.lead;
    late(r, 9);
    expect(r.client.net.lead).toBe(start);
    let count = 9;
    for (let i = 0; i < 10; i++) {
      r.now += 60 + STEP_MS + 1;
      count += 1;
      late(r, count);
    }
    expect(r.client.net.lead).toBe(Math.ceil(60 / STEP_MS) + 1 + NET.leadJitterTicks);
  });

  it('never rewinds the sequence: rejects and gaps keep it rising, a WELCOME can move it up', () => {
    const r = inflight();
    const before = r.inputs();
    const last = before.at(-1).seq;
    r.reject('rate', { lastSeq: 1, tick: 3, seq: last, frame: 5 });
    r.reject('sequence', { lastSeq: 2, tick: 3, seq: last - 1, frame: 4 });
    run(r, { hz: 30, ms: 100 });
    const after = r.inputs().slice(before.length);
    expect(after[0].seq).toBe(last + 1);
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'live', tick: 9, lastSeq: 500 });
    run(r, { hz: 30, ms: 100 });
    expect(r.inputs().at(-1).seq).toBeGreaterThan(500);
  });

  it('a frame past the futureFrames window lowers the lead into it', () => {
    const r = inflight({ rttMs: 200 });
    const lead = r.client.net.lead;
    const sent = r.inputs().at(-1);
    // The server was 3 ticks further behind than the window allows.
    r.reject('frame', { lastSeq: sent.seq - 1, seq: sent.seq, frame: sent.frame, tick: sent.frame - INPUT_LIMITS.futureFrames - 3 });
    expect(r.client.net.lead).toBeLessThan(lead);
    expect(r.client.net.lead).toBeGreaterThanOrEqual(NET.leadMin);
  });

  it('caps the lead at NET.leadMax', () => {
    const r = rig({ rttMs: 1000 });
    r.goLive();
    expect(r.client.net.lead).toBe(NET.leadMax);
    expect(NET.leadMax).toBe(12);
  });

  it('rejoins with HELLO (the director rebinds the seat), not RESYNC', () => {
    const r = inflight();
    r.hooks.close('drop');
    expect(r.client.link).toBe('reconnecting');
    r.hooks.rejoin();
    const last = r.sent.at(-1);
    expect(last.op).toBe(OP.HELLO);
    expect(r.sent.some((m) => m.op === OP.RESYNC)).toBe(false);
    expect(r.client.link).toBe('live');
  });

  it('says READY again when a lobby rejoin comes back unready', () => {
    const r = rig();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, ready: false });
    r.client.ready();
    const readies = () => r.sent.filter((m) => m.op === OP.READY).length;
    expect(readies()).toBe(1);
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, ready: false, names: ['Ada', 'Bea'] });
    expect(readies()).toBe(2);
    expect(r.client.names).toEqual(['Ada', 'Bea']);
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, ready: true });
    expect(readies()).toBe(2);
  });
});

describe('the lead after an RTT spike, and buffer trim (S1/S2a review fixes)', () => {
  /**
   * Render at 60 Hz for `ms` with 30 Hz snapshots. Every PING is answered after rttAt(sentAt)
   * ms; each snapshot carries you.late = late() and you.buffer = buffer().
   */
  function runPinged(r, { ms, rttAt, late = () => 0, buffer = () => 1 }) {
    const answered = new Set();
    const frameMs = 1000 / 60;
    let nextSnap = Math.floor(r.now / STEP_MS) + 1;
    const end = r.now + ms;
    while (r.now < end) {
      r.now += frameMs;
      r.sent.forEach((m, i) => {
        if (m.op !== OP.PING || answered.has(i) || m.at + rttAt(m.at) > r.now) return;
        answered.add(i);
        r.deliver(OP.PONG, { t: m.data.t, serverMs: 0, tick: 0, clockTick: 0, phase: 'live' });
      });
      while (nextSnap * STEP_MS <= r.now) {
        r.deliver(OP.SNAPSHOT, snapshot(nextSnap, { you: { seat: 0, late: late(r.now), buffer: buffer(r.now) } }));
        nextSnap += 1;
      }
      r.client.update(r.now, () => ({ yaw: 0 }));
    }
  }

  it('sends a second PING as soon as the first PONG arrives', () => {
    const r = rig();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, lastSeq: 0 });
    expect(r.sent.filter((m) => m.op === OP.PING).length).toBe(1);
    r.now += 80;
    r.pong();
    // Without waiting NET.pingMs: the server's first echo sample comes one round trip later.
    expect(r.sent.filter((m) => m.op === OP.PING).length).toBe(2);
    r.now += 80;
    r.pong();
    expect(r.sent.filter((m) => m.op === OP.PING).length).toBe(2);
  });

  it('ignores a round-trip sample longer than NET.rttMaxSampleMs', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    r.deliver(OP.PONG, { t: r.now - NET.rttMaxSampleMs - 1, serverMs: 0, tick: 0, clockTick: 0, phase: 'live' });
    expect(r.client.net.rttSamples.every((v) => v <= NET.rttMaxSampleMs)).toBe(true);
    expect(r.client.net.rttMs).toBe(80);
  });

  it('caps the lead at leadForRtt + NET.leadJitterTicks as soon as the measured RTT falls', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    runPinged(r, { ms: 1500, rttAt: () => 80 });
    const calm = r.client.net.lead;
    expect(calm).toBe(Math.ceil(80 / STEP_MS) + 1);
    // A spike: the RTT jumps to 300 ms for 3 s, and the late count keeps rising, which raises
    // the lead once per round trip up to the (now higher) round-trip ceiling.
    const spikeStart = r.now;
    const spiking = (at) => at >= spikeStart && at < spikeStart + 3000;
    const rttAt = (at) => (spiking(at) ? 300 : 80);
    let late = 0;
    runPinged(r, { ms: 3000, rttAt, late: (at) => (spiking(at) ? (late += 1) : late), buffer: () => 0 });
    const spiked = r.client.net.lead;
    expect(spiked).toBeGreaterThanOrEqual(calm + 4);
    // Back to 80 ms: within ~2 s the lead is back to the round-trip lead plus the jitter margin.
    runPinged(r, { ms: 2000, rttAt, late: () => late, buffer: () => 0 });
    expect(r.client.net.rttMs).toBeLessThan(100);
    expect(r.client.net.lead).toBeLessThanOrEqual(Math.ceil(80 / STEP_MS) + 1 + NET.leadJitterTicks);
    expect(r.client.net.leadCaps).toBeGreaterThanOrEqual(1);
    expect(NET.leadJitterTicks).toBe(2);
  });

  it('never caps while the RTT is rising', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    runPinged(r, { ms: 1500, rttAt: () => 80 });
    runPinged(r, { ms: 3000, rttAt: () => 300 });
    expect(r.client.net.rttMs).toBeGreaterThanOrEqual(300);
    expect(r.client.net.leadCaps).toBe(0);
  });

  it('trims the lead when the server buffer stays above 2 frames for a second', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    let late = 0;
    // Push the lead to its ceiling with late counts, at a steady RTT (no RTT cap).
    runPinged(r, { ms: 3000, rttAt: () => 80, late: () => (late += 1), buffer: () => 0 });
    const high = r.client.net.lead;
    expect(high).toBe(Math.ceil(80 / STEP_MS) + 1 + NET.leadJitterTicks);
    // The server now reports 5 frames queued ahead, all the time: 3 more than needed.
    runPinged(r, { ms: NET.bufferTrimMs + 300, rttAt: () => 80, late: () => late, buffer: () => 5 });
    expect(r.client.net.lead).toBe(high - (5 - NET.bufferTarget));
    expect(r.client.net.leadTrims).toBe(1);
  });

  it('does not trim when the buffer dips to the target within the second', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    let late = 0;
    runPinged(r, { ms: 3000, rttAt: () => 80, late: () => (late += 1), buffer: () => 0 });
    const high = r.client.net.lead;
    let n = 0;
    runPinged(r, {
      ms: 3 * NET.bufferTrimMs, rttAt: () => 80, late: () => late, buffer: () => ((n += 1) % 20 === 0 ? 2 : 6),
    });
    expect(r.client.net.lead).toBe(high);
    expect(r.client.net.leadTrims).toBe(0);
    expect(NET.bufferTarget).toBe(2);
  });
});

describe('monotonic phase (SHOOTER-S1)', () => {
  it('ignores phase changes once a result exists', () => {
    const r = rig();
    r.goLive();
    r.deliver(OP.RESULT, { outcome: 'ko', winner: 0, reason: 'ko', tick: 40, ticketsMinted: 0 });
    expect(r.client.phase).toBe('done');
    r.deliver(OP.PHASE, { phase: 'live', tick: 41 });
    expect(r.client.phase).toBe('done');
    r.deliver(OP.SNAPSHOT, snapshot(42));
    expect(r.client.phase).toBe('done');
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0 });
    expect(r.client.phase).toBe('done');
    expect(r.client.update(r.now + 100, () => ({ yaw: 0 }))).toBe(0);
  });

  it('never moves back from live to lobby', () => {
    const r = rig();
    r.goLive();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0 });
    r.deliver(OP.PHASE, { phase: 'lobby', tick: 0 });
    expect(r.client.phase).toBe('live');
  });
});

describe('clock-based remote interpolation (SHOOTER-S1)', () => {
  const snaps = [snapshot(0), snapshot(3), snapshot(6)];

  it('interpolates between the snapshots around the render tick', () => {
    const sample = sampleAt(snaps, 4.5);
    expect(sample.mode).toBe('interp');
    expect(sample.tick).toBe(4.5);
    expect(sample.players[0].x).toBeCloseTo(0.45);
  });

  it('extrapolates by velocity for at most 100 ms, then holds', () => {
    const ahead = sampleAt(snaps, 6 + 1.5);
    expect(ahead.mode).toBe('extrap');
    expect(ahead.players[0].x).toBeCloseTo(0.6 + 3 * 0.05);
    const starved = sampleAt(snaps, 6 + 30);
    const limit = sampleAt(snaps, 6 + NET.extrapolateMs / STEP_MS);
    expect(starved.mode).toBe('hold');
    expect(starved.players[0].x).toBeCloseTo(limit.players[0].x);
    expect(starved.tick).toBe(limit.tick);
  });

  it('renders the delay behind the estimated server time, moving every frame', () => {
    const r = rig();
    r.goLive();
    run(r, { hz: 60, ms: 1000 });
    const a = r.client.sample(r.now);
    const b = r.client.sample(r.now + 1000 / 60);
    const expected = r.now / STEP_MS - NET.interpDelayMs / STEP_MS;
    expect(a.tick).toBeCloseTo(expected, 2);
    expect(b.tick).toBeGreaterThan(a.tick);
    expect(b.players[0].x).not.toBe(a.players[0].x);
  });
});

describe('campaign command latch (SHOOTER-S1)', () => {
  it('carries a jump pressed on a render frame with no input tick to the next tick', () => {
    const r = rig();
    r.goLive();
    const cmd = (pressed = {}) => ({ yaw: 0.3, pitch: -0.2, moveX: 0, moveZ: 1, held: { fire: true }, pressed });
    expect(r.client.updateCommand(r.now, cmd())).toBe(1);
    r.now += 5;
    expect(r.client.updateCommand(r.now, cmd({ jump: true }))).toBe(0);
    r.now += STEP_MS;
    expect(r.client.updateCommand(r.now, cmd())).toBe(1);
    const [first, second] = r.inputs();
    expect(first.jump).toBe(false);
    expect(second.jump).toBe(true);
    expect(second.fire).toBe(true);
    expect(r.client.look.pitch).toBeCloseTo(-0.2);
  });
});
