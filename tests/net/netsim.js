// Seeded discrete-event model of a Nakama match over TCP/WebSocket, on a virtual clock.
//
// It drives the real PvP code: two createPvpClient clients, and registerFreeMatch's match
// handler (which owns a real createDirector). Nothing in src/ is replaced. The harness only
// stands in for the network, the Nakama match loop and the SDK's realtime match handle.
//
// TCP rules: delivery is ordered and reliable. Loss shows up as a head-of-line stall followed
// by a burst, never as a drop. Only a connection reset loses in-flight data, and the client
// then comes back on a NEW session id, the way the hub SDK's reconnect does.
//
// No wall clock and no Math.random: the same seed and profile give the same run.
//
// Realism (on by default, see REALISM; pass `realism: IDEAL` to switch it off):
//  - each client has its own clock: a seeded offset (performance.now() starts at page load) and
//    a seeded drift of up to +-200 ppm, so a client's 60 Hz loop and its timestamps run slightly
//    fast or slow against the server;
//  - the Nakama match loop fires 0..15 ms late on every callback and pauses for 50 ms now and
//    then (GC, a busy node). Nakama drives the loop from a Go time.Ticker, whose channel holds
//    one tick: the ticks inside a pause collapse into one callback at its end, the rest are lost;
//  - each message pays a realistic Nakama envelope (~130 B of JSON around the base64 payload);
//  - optionally, a cap on the messages one loop callback hands the match (`loopMessageCap`,
//    the rest wait for the next callback) and a bounded input queue (`inputQueueSize`, Nakama's
//    match input queue; a full queue drops the message).
import { createPvpClient, registerFreeMatch } from '../../src/net/client.js';
import { decodeInput } from '../../src/net/inputCodec.js';
import { OP } from '../../src/net/protocol.js';
import { TUNING } from '../../src/data/tuning.js';
import { rayCapsule } from '../../src/sim/pvp/hit.js';
import { practiceWish } from '../../src/sim/pvp/practice.js';
import { REWIND, STEP_MS } from '../../src/sim/pvp/rules.js';
import { rewoundTarget } from '../../src/sim/pvp/sim.js';
import { SOURCE } from '../../src/sim/pvp/used.js';
import { createMetrics } from './metrics.js';

/** §R.8 launch gates. S1, S2a and S3 turn the pending baseline tests on against these. */
export const TARGETS = Object.freeze({
  lateFraction: 0.01,
  correctionP99Cm: 5,
  rewindAgreement: 0.98,
  starvedFraction: 0.01,
});

/** Bytes Nakama wraps around one match message's base64 payload (JSON envelope with ids). */
export const ENVELOPE_BYTES = 130;

/** What the harness models beyond the links. Every scenario uses this unless told otherwise. */
export const REALISM = Object.freeze({
  clockOffsetMs: 600000, // each client clock starts at a seeded offset in [0, this)
  clockDriftPpm: 200, // each client clock runs fast or slow by a seeded amount in +-this
  loop: Object.freeze({ jitterMs: 15, pauseEveryMs: 5000, pauseMs: 50 }),
  envelopeBytes: ENVELOPE_BYTES,
});

/** The idealised harness S0 first shipped with: shared perfect clock, perfect 30 Hz loop. */
export const IDEAL = Object.freeze({
  clockOffsetMs: 0,
  clockDriftPpm: 0,
  loop: null,
  envelopeBytes: ENVELOPE_BYTES,
});

/**
 * Link profiles. `latencyMs` and `jitterMs` are ONE-WAY, so RTT 100±30 ms is 50±15 each way.
 * `stall` adds head-of-line stalls: a Poisson process with mean gap `everyMs`, each lasting
 * `minMs..maxMs` (a retransmission timeout). `bandwidth` is bytes per second, per direction.
 */
export const PROFILES = Object.freeze({
  rtt0: Object.freeze({ latencyMs: 0, jitterMs: 0 }),
  rtt100j30: Object.freeze({ latencyMs: 50, jitterMs: 15 }),
  rtt150: Object.freeze({ latencyMs: 75, jitterMs: 0 }),
  stallBurst: Object.freeze({
    latencyMs: 40,
    jitterMs: 5,
    stall: Object.freeze({ everyMs: 2000, minMs: 200, maxMs: 400 }),
  }),
  // RTT ~100 ms with a heavy tail: 3% of messages pick up an extra Pareto(alpha 1.5) delay of
  // 40 ms scale, capped at 400 ms. TCP order means everything behind such a message waits too.
  // RTT 80 ms, then a 300 ms spike for 3 s from 4 s after live start, then 80 ms again.
  rttSpike: Object.freeze({
    latencyMs: 40,
    jitterMs: 5,
    spikes: Object.freeze([Object.freeze({ atMs: 4000, forMs: 3000, latencyMs: 150 })]),
  }),
  heavyTail: Object.freeze({
    latencyMs: 50,
    jitterMs: 10,
    tail: Object.freeze({ p: 0.03, scaleMs: 40, alpha: 1.5, maxMs: 400 }),
  }),
});

/** Deterministic 32-bit PRNG (mulberry32). Returns floats in [0, 1). */
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range(lo, hi) { return lo + (hi - lo) * next(); },
    fork() { return createRng(Math.floor(next() * 4294967296)); },
  };
}

/**
 * Virtual clock with a discrete-event queue. Events at the same time run in the order they
 * were scheduled, so runs are reproducible.
 */
export function createScheduler() {
  const heap = [];
  let now = 0;
  let order = 0;

  function less(a, b) {
    return a.at < b.at || (a.at === b.at && a.order < b.order);
  }

  function push(event) {
    heap.push(event);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  }

  function pop() {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < heap.length && less(heap[l], heap[best])) best = l;
        if (r < heap.length && less(heap[r], heap[best])) best = r;
        if (best === i) break;
        [heap[i], heap[best]] = [heap[best], heap[i]];
        i = best;
      }
    }
    return top;
  }

  return {
    get now() { return now; },
    at(time, fn) {
      if (!Number.isFinite(time)) throw new Error(`bad event time ${time}`);
      push({ at: Math.max(time, now), order: order++, fn });
    },
    after(delay, fn) { this.at(now + delay, fn); },
    every(period, fn, start = now) {
      const tick = (time) => {
        this.at(time, () => {
          if (fn() !== false) tick(time + period);
        });
      };
      tick(start);
    },
    /** Run events up to and including `time`, or until `stop()` returns true. */
    runUntil(time, stop = () => false) {
      while (heap.length && heap[0].at <= time) {
        const event = pop();
        now = event.at;
        event.fn();
        if (stop()) return true;
      }
      now = Math.max(now, time);
      return false;
    },
    get pending() { return heap.length; },
  };
}

/** Bytes on the wire for one Nakama match message: base64 payload inside a JSON envelope. */
export function wireBytes(payloadBytes, envelopeBytes = ENVELOPE_BYTES) {
  return Math.ceil(payloadBytes / 3) * 4 + envelopeBytes;
}

/**
 * One direction of a TCP connection. `send(bytes, payload)` schedules `deliver(payload)`.
 * Ordered (arrival never precedes an earlier send's arrival), reliable (never drops), with a
 * bandwidth queue and head-of-line stalls. `reset()` loses everything in flight.
 */
export function createTcpLink({ scheduler, rng, profile = {}, deliver, horizonMs = 600000 }) {
  const latency = profile.latencyMs || 0;
  const jitter = profile.jitterMs || 0;
  const bandwidth = profile.bandwidth || 0;
  const tail = profile.tail || null;
  const spikes = profile.spikes || [];
  // Spike times count from the origin (runScenario sets it at live start).
  let origin = null;
  function latencyAt(time) {
    if (origin == null) return latency;
    for (const spike of spikes) {
      const t = time - origin;
      if (t >= spike.atMs && t < spike.atMs + spike.forMs) return spike.latencyMs;
    }
    return latency;
  }
  const stalls = [];
  if (profile.stall) {
    const { everyMs, minMs, maxMs } = profile.stall;
    let t = -Math.log(1 - rng.next()) * everyMs;
    while (t < horizonMs) {
      const length = rng.range(minMs, maxMs);
      stalls.push([t, t + length]);
      t += length - Math.log(1 - rng.next()) * everyMs;
    }
  }
  let epoch = 0;
  let wireFree = 0;
  let lastArrival = 0;
  const stats = { sent: 0, delivered: 0, lostToReset: 0, bytes: 0, stalled: 0, tailed: 0 };

  function stallEnd(time) {
    for (const [start, end] of stalls) {
      if (time < start) return null;
      if (time < end) return end;
    }
    return null;
  }

  return {
    stats,
    stalls,
    send(bytes, payload) {
      const now = scheduler.now;
      const serial = bandwidth > 0 ? (bytes * 1000) / bandwidth : 0;
      const departs = Math.max(now, wireFree) + serial;
      wireFree = departs;
      let arrival = departs + latencyAt(departs) + (jitter > 0 ? rng.range(-jitter, jitter) : 0);
      if (tail && rng.next() < tail.p) {
        // Pareto: scale * (U^(-1/alpha) - 1), capped.
        const extra = tail.scaleMs * ((1 - rng.next()) ** (-1 / tail.alpha) - 1);
        arrival += Math.min(tail.maxMs, extra);
        stats.tailed += 1;
      }
      const held = stallEnd(departs);
      if (held != null) {
        arrival = Math.max(arrival, held + latency);
        stats.stalled += 1;
      }
      arrival = Math.max(arrival, lastArrival, now);
      lastArrival = arrival;
      stats.sent += 1;
      stats.bytes += bytes;
      const sentEpoch = epoch;
      scheduler.at(arrival, () => {
        if (sentEpoch !== epoch) {
          stats.lostToReset += 1;
          return;
        }
        stats.delivered += 1;
        deliver(payload);
      });
    },
    /** Latency spikes (profile.spikes) are timed from here. */
    setOrigin(time) { origin = time; },
    /** Connection reset: in-flight data is gone, and a fresh connection starts empty. */
    reset() {
      epoch += 1;
      wireFree = scheduler.now;
      lastArrival = scheduler.now;
    },
  };
}

/**
 * A client's own clock: `now(trueMs)` is what performance.now() reads on that client when the
 * server's clock reads `trueMs`. `truePeriod(localMs)` is how long a local timer period lasts
 * in true time.
 */
export function createPeerClock({ offsetMs = 0, driftPpm = 0 } = {}) {
  const rate = 1 + driftPpm / 1e6;
  return {
    offsetMs,
    driftPpm,
    now(trueMs) { return offsetMs + trueMs * rate; },
    truePeriod(localMs) { return localMs / rate; },
  };
}

/** Poisson windows with mean gap `everyMs` and length `minMs..maxMs`, up to `horizonMs`. */
function poissonWindows(rng, everyMs, minMs, maxMs, horizonMs) {
  const windows = [];
  let t = -Math.log(1 - rng.next()) * everyMs;
  while (t < horizonMs) {
    const length = rng.range(minMs, maxMs);
    windows.push([t, t + length]);
    t += length - Math.log(1 - rng.next()) * everyMs;
  }
  return windows;
}

/**
 * Nakama's match loop: a Go time.Ticker at `periodMs` whose callbacks run 0..`jitterMs` late,
 * plus Poisson pauses (mean gap `pauseEveryMs`, length `pauseMs`). A ticker's channel holds one
 * tick, so the ticks that fall inside a pause become one callback at the pause's end and the
 * others are dropped. Callbacks never reorder. `run(at)` returning false stops the loop.
 */
export function createServerLoop({
  scheduler, rng, periodMs, run, jitterMs = 0, pauseEveryMs = 0, pauseMs = 0, horizonMs = 600000, start = 0,
}) {
  const pauses = pauseEveryMs > 0 && pauseMs > 0
    ? poissonWindows(rng, pauseEveryMs, pauseMs, pauseMs, horizonMs)
    : [];
  const stats = { calls: 0, dropped: 0, pauses: pauses.length };
  const buffered = new Set();
  let k = 0;
  let last = start;
  let p = 0;

  function next() {
    for (;;) {
      const nominal = start + k * periodMs;
      k += 1;
      let at = nominal + (jitterMs > 0 ? rng.range(0, jitterMs) : 0);
      while (p < pauses.length && pauses[p][1] <= nominal) p += 1;
      // The pause (if any) that holds this tick: it started before the callback could run.
      let held = -1;
      for (let i = p; i < pauses.length && pauses[i][0] <= at; i++) {
        if (at < pauses[i][1]) { held = i; break; }
      }
      if (held >= 0) {
        if (buffered.has(held)) {
          stats.dropped += 1;
          continue;
        }
        buffered.add(held);
        at = pauses[held][1];
      }
      at = Math.max(at, last);
      last = at;
      scheduler.at(at, () => {
        stats.calls += 1;
        if (run(at) !== false) next();
      });
      return;
    }
  }
  next();
  return { stats, pauses };
}

function textBytes(text) {
  const buf = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) buf[i] = text.charCodeAt(i) & 255;
  return buf;
}

function bytesText(buf) {
  let out = '';
  for (let i = 0; i < buf.length; i++) out += String.fromCharCode(buf[i]);
  return out;
}

function encodePayload(data) {
  if (data instanceof Uint8Array) return new Uint8Array(data);
  return textBytes(JSON.stringify(data));
}

/** A movement-heavy bot built on the shipped practice bot, with a seeded strafe. */
export function botWish(sample, seat, frame, { fire = false, strafe = 0 } = {}) {
  const self = sample.players[seat];
  const other = sample.players[1 - seat];
  const wish = practiceWish(Math.max(0, sample.tick), self, other);
  wish.moveX = Math.sin((frame + strafe) / 23) > 0 ? 1 : -1;
  wish.moveZ = 1;
  if (!fire) wish.fire = false;
  return wish;
}

const FIRE_BIT = 1;
/** Lateral aim offsets for the rewind check: uniform in +-AIM_SPREAD_M around the drawn target. */
const AIM_SPREAD_M = 0.8;

function capsuleHit(eye, dir, at) {
  return rayCapsule(eye, dir, at.x, at.z, at.y, at.y + TUNING.playerHeight, TUNING.playerRadius) >= 0;
}

/**
 * The S2b rewind-agreement check for one applied, firing input. Geometry only (spread is server
 * randomness, not netcode): a ray from the shooter's server eye at the frame, toward a seeded
 * point near the target the client drew, against (a) the capsule the client drew and (b) the
 * capsule the server rewound to with the clamped rewind it logged. It also scores the same ray
 * against the capsule at the client's full, unclamped claim, to show what the clamp costs.
 * The aim from the server eye stands in for S3's prediction and aim convergence.
 */
function rewindCheck({ history, frame, seat, used, view, rng }) {
  const at = (tick) => history.get(tick);
  const now = at(frame + 1);
  if (!now || !now[seat].alive || !now[1 - seat].alive) return null;
  // A state with just the ring rewoundTarget reads, built from the harness's full history.
  const hist = [[], []];
  for (let tick = frame - REWIND.historyTicks + 2; tick <= frame + 1; tick++) {
    const row = at(tick);
    for (let s = 0; s < 2; s++) hist[s][((tick % REWIND.historyTicks) + REWIND.historyTicks) % REWIND.historyTicks] = row ? row[s] : null;
  }
  const server = rewoundTarget({ hist }, 1 - seat, frame, used.r, used.f);
  const shooter = now[seat];
  const eye = { x: shooter.x, y: shooter.y + TUNING.eyeHeight, z: shooter.z };
  const drawn = view.target;
  const dx = drawn.x - eye.x;
  const dz = drawn.z - eye.z;
  const flat = Math.hypot(dx, dz) || 1;
  const offset = rng.range(-AIM_SPREAD_M, AIM_SPREAD_M);
  const aim = {
    x: drawn.x + (-dz / flat) * offset,
    y: drawn.y + TUNING.playerHeight / 2,
    z: drawn.z + (dx / flat) * offset,
  };
  const len = Math.hypot(aim.x - eye.x, aim.y - eye.y, aim.z - eye.z) || 1;
  const dir = { x: (aim.x - eye.x) / len, y: (aim.y - eye.y) / len, z: (aim.z - eye.z) / len };
  const clientHit = capsuleHit(eye, dir, drawn);
  const serverHit = capsuleHit(eye, dir, server);
  const claimAt = view.viewTick + view.viewFrac / REWIND.fracSteps;
  const base = Math.floor(claimAt);
  const a = at(base);
  const b = at(base + 1) || a;
  let unclampedHit = null;
  if (a && b) {
    const t = claimAt - base;
    const p = a[1 - seat];
    const q = b[1 - seat];
    unclampedHit = capsuleHit(eye, dir, { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
  }
  return {
    agree: clientHit === serverHit,
    agreeUnclamped: unclampedHit == null ? null : clientHit === unclampedHit,
    claim: frame - view.viewTick,
    applied: used.r,
  };
}

/**
 * Run one scenario and return its metrics report.
 *
 * options:
 *   seed            harness seed (links, strafe phases, render offsets)
 *   matchSeed       director seed
 *   durationMs      how long to run after both seats are live
 *   profile         link profile for both directions, or { up, down }
 *   disconnects     [{ peer, atMs, downMs }], peer 0 = 'ada', 1 = 'bea'; atMs from live start
 *   renderHz        client frame rate. Each render frame calls client.update(), whose own 30 Hz
 *                   input clock decides how many inputs (0..4) that frame sends.
 *   fire            whether bots fire (off by default so matches run the whole window)
 *   leaveDetectMs   how long the server takes to notice a reset socket
 *   realism         REALISM (default) or IDEAL, or an object with the same fields
 *   peerClocks      [{ offsetMs, driftPpm }] per peer, instead of the seeded ones
 *   envelopeBytes   Nakama envelope per message (defaults to realism.envelopeBytes)
 *   loopMessageCap  at most this many messages per loop callback; the rest wait (default none)
 *   inputQueueSize  messages waiting for the loop beyond this are dropped (default unbounded)
 */
export function runScenario(options = {}) {
  const {
    seed = 1,
    matchSeed = 7,
    durationMs = 15000,
    profile = PROFILES.rtt0,
    disconnects = [],
    renderHz = 60,
    fire = false,
    leaveDetectMs = 0,
    realism = REALISM,
    peerClocks = null,
    loopMessageCap = null,
    inputQueueSize = null,
    starveMs = 150,
  } = options;
  const envelopeBytes = options.envelopeBytes ?? realism.envelopeBytes ?? ENVELOPE_BYTES;
  const accounts = ['ada', 'bea'];
  const scheduler = createScheduler();
  const rng = createRng(seed);
  const metrics = createMetrics({ accounts, starveMs });
  // Realism draws from its own stream, so the link and render streams stay what they were.
  const realRng = createRng((seed ^ 0x9e3779b9) >>> 0);
  const clocks = [0, 1].map((index) => {
    const given = peerClocks && peerClocks[index];
    const offsetMs = given ? given.offsetMs : Math.floor(realRng.range(0, realism.clockOffsetMs || 0));
    const driftPpm = given ? given.driftPpm : Math.round(realRng.range(-1, 1) * (realism.clockDriftPpm || 0) * 100) / 100;
    return createPeerClock({ offsetMs, driftPpm });
  });
  const server = { loopMessageCap, inputQueueSize, deferred: 0, dropped: 0, maxBacklog: 0, loop: null };
  const upProfile = profile.up || profile;
  const downProfile = profile.down || profile;

  // Nakama side: capture registerFreeMatch's handler and run its loop at 30 Hz.
  let handler = null;
  registerFreeMatch({ registerMatch(_name, h) { handler = h; } });
  const { state } = handler.init({ seed: matchSeed, clock: () => scheduler.now });
  const director = state.director;
  metrics.watchDirector(director);
  // Rewind check: every tick's positions (copied out of the sim's history ring after each loop),
  // and what each client drew when it sent each frame.
  const history = new Map();
  // Its own stream, so the link and render streams stay what S0-S2a measured.
  const checkRng = createRng((seed ^ 0x5eed5eed) >>> 0);
  let checkedTo = 0;

  const inbox = [];
  const peers = accounts.map((accountId, index) => {
    const peer = {
      index,
      accountId,
      session: 0,
      presence: null,
      connected: false,
      clock: clocks[index],
      fns: [],
      rejoinFns: [],
      closeFns: [],
      client: null,
      frame: 0,
      // frame -> { viewTick, viewFrac, target } for the inputs this peer sent.
      views: new Map(),
      drawn: null,
      strafe: Math.floor(rng.range(0, 1000)),
    };
    const upRng = rng.fork();
    const downRng = rng.fork();
    peer.up = createTcpLink({
      scheduler,
      rng: upRng,
      profile: upProfile,
      horizonMs: durationMs + 60000,
      deliver: (msg) => {
        if (inputQueueSize != null && inbox.length >= inputQueueSize) {
          server.dropped += 1;
          return;
        }
        inbox.push(msg);
        server.maxBacklog = Math.max(server.maxBacklog, inbox.length);
      },
    });
    peer.down = createTcpLink({
      scheduler,
      rng: downRng,
      profile: downProfile,
      horizonMs: durationMs + 60000,
      deliver: (msg) => {
        if (msg.opCode === OP.SNAPSHOT) metrics.snapshotArrived(index, scheduler.now);
        const text = bytesText(msg.data);
        const packet = { opCode: msg.opCode, data: msg.data, json: () => JSON.parse(text) };
        for (const fn of peer.fns) fn(packet);
      },
    });
    return peer;
  });

  function presenceOf(peer) {
    return { userId: peer.accountId, sessionId: `${peer.accountId}-s${peer.session}` };
  }

  function join(peer) {
    peer.session += 1;
    peer.presence = presenceOf(peer);
    const verdict = handler.joinAttempt(state, peer.presence);
    if (!verdict.accept) {
      metrics.joinRefused(peer.index, verdict.reason);
      return false;
    }
    handler.join(state, [peer.presence]);
    peer.connected = true;
    return true;
  }

  // Nakama's broadcastMessage(op, data, presences): presences limits it to those sessions.
  const dispatcher = {
    broadcast(opCode, body, to) {
      const data = encodePayload(body);
      for (const peer of peers) {
        if (!peer.connected) continue;
        if (to && !to.some((p) => p.sessionId === peer.presence.sessionId)) continue;
        peer.down.send(wireBytes(data.length, envelopeBytes), { opCode, data });
      }
    },
  };

  function copyHistory() {
    const sim = director.sim;
    if (!sim) return;
    for (let i = 0; i < REWIND.historyTicks; i++) {
      const a = sim.hist[0][i];
      const b = sim.hist[1][i];
      if (a && b && a.t === b.t) history.set(a.t, [{ ...a }, { ...b }]);
    }
  }

  function checkRewinds() {
    const sim = director.sim;
    if (!sim || !fire) return;
    for (; checkedTo < sim.tick; checkedTo++) {
      const frame = checkedTo;
      const pair = director.usedAt(frame);
      if (!pair) continue;
      for (const peer of peers) {
        const seat = director.seatOf(peer.accountId);
        if (seat < 0) continue;
        const used = pair[seat];
        if (used.src !== SOURCE.input || !(used.b & FIRE_BIT)) continue;
        const view = peer.views.get(frame);
        if (!view || !view.target) continue;
        const got = rewindCheck({ history, frame, seat, used, view, rng: checkRng });
        if (!got) continue;
        metrics.rewindCheck(got.agree);
        metrics.rewindClaim(got.claim, got.applied, got.agreeUnclamped);
      }
    }
  }

  const loopSpec = realism.loop || {};
  const serverLoop = createServerLoop({
    scheduler,
    rng: realRng.fork(),
    periodMs: STEP_MS,
    jitterMs: loopSpec.jitterMs || 0,
    pauseEveryMs: loopSpec.pauseEveryMs || 0,
    pauseMs: loopSpec.pauseMs || 0,
    horizonMs: durationMs + 180000,
    run: () => {
      const messages = loopMessageCap != null ? inbox.splice(0, loopMessageCap) : inbox.splice(0);
      server.deferred += inbox.length;
      handler.loop(state, messages, dispatcher);
      copyHistory();
      checkRewinds();
      metrics.loopRan(scheduler.now);
    },
  });
  server.loop = serverLoop.stats;

  // The SDK's match handle: send() is silently dropped while the socket is down.
  for (const peer of peers) {
    const match = {
      get self() { return peer.presence; },
      send(opCode, data) {
        if (!peer.connected) {
          metrics.sendWhileDown(peer.index);
          return;
        }
        const payload = encodePayload(data);
        if (opCode === OP.INPUT) {
          try {
            const sent = decodeInput(payload);
            metrics.inputSent(peer.index, sent.frame, scheduler.now);
            peer.views.set(sent.frame, { viewTick: sent.viewTick, viewFrac: sent.viewFrac, target: peer.drawn });
          } catch {
            metrics.inputSent(peer.index, null, scheduler.now);
          }
        }
        peer.up.send(wireBytes(payload.length, envelopeBytes), {
          sender: { ...peer.presence },
          opCode,
          data: payload,
          receiveTimeMs: 0,
        });
      },
      onMessage(fn) { peer.fns.push(fn); return () => {}; },
      onClose(fn) { peer.closeFns.push(fn); return () => {}; },
      onRejoin(fn) { peer.rejoinFns.push(fn); return () => {}; },
    };
    join(peer);
    peer.client = createPvpClient({
      accountId: peer.accountId,
      match,
      clock: () => peer.clock.now(scheduler.now),
      // S3: every reconciliation's correction (metres) feeds the correction p99 gate, tagged
      // when the server had the two bodies touching (contact is not predicted).
      onCorrection: (metres, info) => metrics.correction(peer.index, metres, !!(info && info.contact)),
    });
  }

  // Tick 0 on the server clock, once the director goes live (after its lead-in).
  let liveAt = null;

  // Client render loops at renderHz with seeded phase offsets.
  const frameMs = 1000 / renderHz;
  for (const peer of peers) {
    // The render loop runs on the client's clock, so drift changes its true period.
    scheduler.every(peer.clock.truePeriod(frameMs), () => {
      const client = peer.client;
      peer.frame += 1;
      if (client.seat >= 0 && client.phase === 'lobby' && !peer.readied && peer.connected) {
        peer.readied = true;
        client.ready();
      }
      if (client.phase === 'live' && !client.result) {
        const local = peer.clock.now(scheduler.now);
        const sample = client.sample(local);
        // What the remote player looks like on this frame. S3 predicts the local player, so it moves
        // every frame regardless: only the remote seat says whether the view starved.
        const remote = sample && sample.players && client.seat >= 0 ? sample.players[1 - client.seat] : null;
        const viewKey = remote ? `${sample.tick}|${remote.x},${remote.z},${remote.yaw}` : null;
        // Render metrics start when the client's render clock reaches tick 0. Before that the
        // tick-0 spawn snapshot is the exact state (the sim has not stepped), held on purpose,
        // for the lead-in plus the interpolation delay plus the downlink; counted separately.
        if (liveAt != null && scheduler.now >= liveAt) {
          if (!peer.renderStarted && sample && sample.tick > 0) peer.renderStarted = true;
          if (peer.renderStarted) metrics.renderFrame(peer.index, scheduler.now, viewKey, sample && sample.mode);
          else metrics.preStartFrame(peer.index);
        }
        if (sample && sample.players && sample.players[0] && sample.players[1] && client.seat >= 0) {
          const other = sample.players[1 - client.seat];
          peer.drawn = { x: other.x, y: other.y, z: other.z };
          client.update(local, (frame) => botWish(sample, client.seat, frame, { fire, strafe: peer.strafe }));
        }
        metrics.clientNet(peer.index, client.net, scheduler.now);
      }
      return true;
    }, rng.range(0, frameMs));
  }

  // Disconnects are scheduled relative to live start: tick 0, after the director's lead-in.
  const pendingDrops = [...disconnects];
  function armDrops() {
    for (const drop of pendingDrops) {
      const peer = peers[drop.peer];
      scheduler.at(liveAt + drop.atMs, () => {
        const old = peer.presence;
        peer.connected = false;
        peer.up.reset();
        peer.down.reset();
        metrics.disconnected(peer.index, scheduler.now, old.sessionId);
        scheduler.after(leaveDetectMs, () => handler.leave(state, [old]));
        scheduler.after(drop.downMs, () => {
          if (director.phase === 'done') return;
          if (!join(peer)) return;
          metrics.rejoined(peer.index, scheduler.now, peer.presence.sessionId);
          for (const fn of peer.rejoinFns) fn();
        });
      });
    }
  }

  const deadline = 120000 + durationMs;
  let endAt = deadline;
  scheduler.runUntil(deadline, () => {
    if (liveAt == null && director.phase === 'live') {
      liveAt = Number.isFinite(director.liveStart) ? director.liveStart : scheduler.now;
      endAt = liveAt + durationMs;
      metrics.live(liveAt);
      for (const peer of peers) {
        peer.up.setOrigin(liveAt);
        peer.down.setOrigin(liveAt);
      }
      armDrops();
    }
    if (director.phase === 'done' && peers.every((peer) => !peer.connected || peer.client.result)) return true;
    return liveAt != null && scheduler.now >= endAt;
  });

  return metrics.report({
    director,
    links: peers.map((peer) => ({ up: peer.up.stats, down: peer.down.stats })),
    endedAt: scheduler.now,
    clocks: clocks.map((clock) => ({ offsetMs: clock.offsetMs, driftPpm: clock.driftPpm })),
    server,
    options: { seed, matchSeed, durationMs, profile, disconnects, renderHz, fire, realism, envelopeBytes },
  });
}
