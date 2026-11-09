// SHOOTER-S1: the client's 30 Hz input clock, adaptive input lead, reject handling, monotonic
// phase, and clock-based remote interpolation. Protocol 1 and the director are unchanged.
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
  const match = {
    send(op, data) { sent.push({ op, at: now, data }); },
    onMessage(fn) { fns.push(fn); return () => {}; },
    onClose() { return () => {}; },
    onRejoin() { return () => {}; },
  };
  const client = createPvpClient({ accountId: 'ada', match, clock: () => now });
  const deliver = (op, body) => { for (const fn of fns) fn({ opCode: op, json: () => body }); };
  const r = {
    client,
    sent,
    deliver,
    get now() { return now; },
    set now(v) { now = v; },
    inputs: () => sent.filter((m) => m.op === OP.INPUT).map((m) => ({ at: m.at, ...decodeInput(m.data) })),
    reject(reason, lastSeq, tick) { deliver(OP.REJECT, { accountId: 'ada', reason, lastSeq, tick, ticketsMinted: 0 }); },
    /** HELLO/READY answered after rttMs, then the match goes live at `now`, tick 0. */
    goLive() {
      now += rttMs;
      deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0 });
      client.ready();
      now += rttMs;
      deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'live', tick: 0 });
      deliver(OP.PHASE, { phase: 'live', tick: 0 });
      deliver(OP.SNAPSHOT, snapshot(0));
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
      expect(Math.max(...perAt.values())).toBeLessThanOrEqual(INPUT_LIMITS.maxInputsPerTick);
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

  it('starts the lead at the handshake round trip plus one tick when it has one', () => {
    const r = rig({ rttMs: 120 });
    r.goLive();
    expect(r.client.net.rttMs).toBe(120);
    expect(r.client.net.lead).toBe(Math.ceil(120 / STEP_MS) + 1);
  });
});

describe('input lead and rejects (SHOOTER-S1)', () => {
  function inflight() {
    const r = rig();
    r.goLive();
    run(r, { hz: 30, ms: 200 });
    return r;
  }

  it('a late frame raises the lead by cursor - frame + 1, and its in-flight echoes do not cascade', () => {
    const r = inflight();
    const sent = r.inputs();
    expect(sent.length).toBeGreaterThanOrEqual(5);
    const first = sent[0];
    // The server rejected seq 1 as late at cursor frame + 3; seq 2.. came back as sequence.
    r.reject('frame', 0, first.frame + 3);
    expect(r.client.net.lead).toBe(NET.leadStart + 3 + 1);
    for (let i = 1; i < sent.length; i++) r.reject('sequence', 0, first.frame + 3);
    expect(r.client.net.staleRejects).toBe(sent.length - 1);
    run(r, { hz: 30, ms: 200 });
    const after = r.inputs().slice(sent.length);
    expect(after.map((input) => input.seq)).toEqual(after.map((_, i) => i + 1));
    const serverTick = Math.floor(after[0].at / STEP_MS + 1e-9);
    expect(after[0].frame - serverTick).toBeGreaterThanOrEqual(r.client.net.lead - 1);
  });

  it('a sequence reject past the expected echoes is a real gap and rewinds again', () => {
    const r = inflight();
    const count = r.inputs().length;
    r.reject('frame', 0, r.inputs()[0].frame + 1);
    for (let i = 1; i < count; i++) r.reject('sequence', 0, 0);
    r.client.update(r.now + STEP_MS, () => ({ yaw: 0 }));
    r.now += STEP_MS;
    r.reject('sequence', 0, 0);
    r.client.update(r.now + STEP_MS, () => ({ yaw: 0 }));
    const last = r.inputs().at(-1);
    expect(last.seq).toBe(1);
  });

  it('a frame past the futureFrames window lowers the lead into it', () => {
    const r = inflight();
    const sent = r.inputs();
    const lead = r.client.net.lead;
    // Pretend the server was 6 ticks behind what the client expected.
    r.reject('frame', 0, sent[0].frame - INPUT_LIMITS.futureFrames - 2);
    expect(r.client.net.lead).toBeLessThan(lead);
    expect(r.client.net.lead).toBeGreaterThanOrEqual(NET.leadMin);
  });

  it('caps the lead at NET.leadMax', () => {
    const r = inflight();
    r.reject('frame', 0, r.inputs()[0].frame + 100);
    expect(r.client.net.lead).toBe(NET.leadMax);
    expect(NET.leadMax).toBe(12);
  });

  it('probes one tick lower after a long clean run, repeating one frame rather than skipping a send', () => {
    const r = rig({ rttMs: 100 });
    r.goLive();
    const start = r.client.net.lead;
    run(r, { hz: 60, ms: (NET.leadProbeTicks + 30) * STEP_MS });
    expect(r.client.net.lead).toBe(start - 1);
    const frames = r.inputs().map((input) => input.frame);
    const repeats = frames.filter((frame, i) => i > 0 && frame === frames[i - 1]).length;
    expect(repeats).toBe(1);
  });
});

describe('round-trip probes and the lead after an RTT spike (S1 review fix)', () => {
  /**
   * Render at 60 Hz for `ms`, with 10 Hz snapshots `downMs` old and every READY probe answered
   * by this seat's WELCOME after rttAt(sentAt) ms.
   */
  function runProbed(r, { ms, rttAt, downMs = 0 }) {
    const answered = new Set();
    const frameMs = 1000 / 60;
    let nextSnap = Math.floor(r.now / STEP_MS / 3) * 3 + 3;
    const end = r.now + ms;
    while (r.now < end) {
      r.now += frameMs;
      r.sent.forEach((m, i) => {
        if (m.op !== OP.READY || answered.has(i) || m.at + rttAt(m.at) > r.now) return;
        answered.add(i);
        r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'live', tick: 0 });
      });
      while ((nextSnap * STEP_MS) + downMs <= r.now) {
        r.deliver(OP.SNAPSHOT, snapshot(nextSnap));
        nextSnap += 3;
      }
      r.client.update(r.now, () => ({ yaw: 0 }));
    }
  }

  it('probes the round trip with READY every NET.pingMs while live (protocol 1 has no PING)', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    const before = r.sent.filter((m) => m.op === OP.READY).length;
    runProbed(r, { ms: 3000, rttAt: () => 80 });
    const probes = r.sent.filter((m) => m.op === OP.READY).length - before;
    expect(probes).toBeGreaterThanOrEqual(Math.floor(3000 / NET.pingMs) - 1);
    expect(probes).toBeLessThanOrEqual(Math.ceil(3000 / NET.pingMs) + 1);
    expect(r.client.net.rttMs).toBeGreaterThanOrEqual(80);
    expect(r.client.net.rttMs).toBeLessThan(80 + 20);
  });

  it('caps the lead at leadForRtt + NET.leadJitterTicks as soon as the measured RTT falls', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    runProbed(r, { ms: 1500, rttAt: () => 80 });
    const calm = r.client.net.lead;
    expect(calm).toBe(Math.ceil(80 / STEP_MS) + 1);
    // A spike: the RTT jumps to 300 ms for 3 s and late rejects push the lead up.
    const spikeStart = r.now;
    const rttAt = (at) => (at >= spikeStart && at < spikeStart + 3000 ? 300 : 80);
    runProbed(r, { ms: 1000, rttAt });
    const last = r.inputs().at(-1);
    r.reject('frame', last.seq - 1, last.frame + 8);
    expect(r.client.net.lead).toBeGreaterThanOrEqual(calm + 8);
    runProbed(r, { ms: 2000, rttAt });
    const spiked = r.client.net.lead;
    expect(spiked).toBeGreaterThanOrEqual(calm + 8);
    // Back to 80 ms: within ~2 s the lead is back to the round-trip lead plus the jitter margin.
    runProbed(r, { ms: 2000, rttAt });
    expect(r.client.net.rttMs).toBeLessThan(100);
    expect(r.client.net.lead).toBeLessThanOrEqual(Math.ceil(80 / STEP_MS) + 1 + NET.leadJitterTicks);
    expect(r.client.net.leadCaps).toBeGreaterThanOrEqual(1);
    expect(NET.leadJitterTicks).toBe(2);
  });

  it('never caps below the round-trip lead while the RTT is rising', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    runProbed(r, { ms: 1500, rttAt: () => 80 });
    runProbed(r, { ms: 3000, rttAt: () => 300 });
    expect(r.client.net.rttMs).toBeGreaterThanOrEqual(300);
    expect(r.client.net.leadCaps).toBe(0);
  });

  it('drops a probe whose answer never came (socket reset) instead of mismatching later ones', () => {
    const r = rig({ rttMs: 80 });
    r.goLive();
    r.client.update(r.now + NET.pingMs, () => ({ yaw: 0 }));
    r.now += NET.pingMs + NET.rttMaxSampleMs + 1;
    runProbed(r, { ms: 2000, rttAt: () => 80 });
    expect(r.client.net.rttMs).toBeLessThan(80 + 20);
    expect(Math.max(...r.client.net.rttSamples)).toBeLessThan(80 + 20);
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
