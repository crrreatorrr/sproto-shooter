// Arena client. Snapshots are interpolated on a clock. The server result is the only outcome.
//
// Timing (SHOOTER-S1, updated for protocol 2 in SHOOTER-S2a):
// - Server clock: every snapshot, PHASE and PONG carries `clockTick`, the server clock in ticks
//   when it was sent (negative during the live-start lead-in). Each gives an offset
//   `clockTick * STEP_MS - arrival`; the estimate uses the largest of the last few, i.e. the
//   least-delayed packet.
// - Round trip: PING/PONG every NET.pingMs (and once more right after the first PONG), median of
//   the last NET.rttWindow samples; a sample over NET.rttMaxSampleMs is ignored.
// - Input clock: a fixed 30 Hz accumulator, not the render loop. Each input tick builds one wish
//   and sends exactly one INPUT stamped frame = estimated server tick + lead (never below 0, so
//   nothing is sent until the lead-in has a tick to aim at).
// - Lead adapts (one owner: the target lead `lead`; SHOOTER-S3 reaches it with the clock trim
//   below, never by moving frames). It starts at the round trip in ticks plus one; the director
//   accepts and discards late frames and counts them in the snapshot (`you.late`), and a new late
//   count raises the target by one at most once per round trip, up to the round-trip lead +
//   NET.leadJitterTicks; whenever the measured RTT falls, the target is capped at that same
//   ceiling (an RTT spike's raises come back down within ~2 s); when the snapshot's `you.buffer`
//   (frames queued ahead at the server) stays above NET.bufferTarget for NET.bufferTrimMs, the
//   target drops by the excess the trim is not already draining (never below the round trip in
//   ticks); a `frame` reject past the director's futureFrames window lowers it, at most
//   once per round trip. Capped at NET.leadMax.
// - A hidden tab gets no animation frames: no update(), so no inputs and no PINGs. The director
//   forfeits a seat after STALL_MS (10 s) without input.
// - Sequence numbers only increase. Protocol 2 allows gaps, so a reject never rewinds them.
// - Rejoin on a new session id sends HELLO (the director rebinds the seat), not RESYNC.
// - Remote interpolation: render time = estimated server time - delay. Interpolate between the
//   two snapshots around it, extrapolate up to NET.extrapolateMs when starved, then hold.
// - Lag compensation (sim 2, SHOOTER-S2b): each input carries viewTick/viewFrac, the render
//   time of the newest drawn frame (what the shooter saw), so the server can rewind the target.
//   PINGs echo the last PONG's serverMs and how long it was held, so the director measures this
//   seat's round trip itself. Spread is cosmetic here; damage comes from the server's hit events
//   in snapshots (`hits`), and the combat seed revealed in RESULT is checked against the
//   sha256 commit from WELCOME.
// - Prediction (SHOOTER-S3): each input tick also steps the local player with the sim's own
//   movePlayer + weaponTick (src/net/predict.js). Each snapshot rebases on the server's exact
//   copy of this seat (you.private), replays the inputs after it, and blends the difference out
//   over ~100 ms (snap past 2 m). The muzzle flash, tracer, sound and ammo come from the
//   prediction at once; hitmarkers and damage numbers only from the server's `hits`.
// - Adaptive delay (SHOOTER-S3): D = clamp(snapshot interval + 2 x jitter p95, 50, 150 ms),
//   slewed smoothly (src/net/timing.js) and announced in every PING for the rewind cap.
// - Clock trim (SHOOTER-S3): frames go up by exactly one per input tick. The stamped lead
//   (frame - estimated tick) follows the target lead by running the input clock up to 5% fast or
//   slow. Only big errors resync: more than TIMING.holdTicks over the target (a big drop: an RTT
//   spike's raises capped, a deep buffer trimmed) repeats the previous frame each tick until the
//   trim can take the rest; under it, frames jump forward to the target when the server reports
//   late frames (past TIMING.lateResyncTicks) or the input clock dropped a render stall's backlog
//   (past TIMING.resyncTicks). A clock-estimate step of a tick or more (the downlink changing)
//   moves the target with it, and the RTT rising well past the target lifts it at once.
// - View continuity: frame - viewTick moves by at most NET.viewStepTicks (the director's
//   REWIND.maxBackStep) between inputs and viewTick never moves back, so an honest client is
//   never clamped (`viewClamped`).
import { createMockRealtimeServer } from '@metaverse/hub-sdk';
import { sha256Hex } from '../core/sha256.js';
import { createPredictor, playerFromSnapshot } from './predict.js';
import {
  TIMING, clockRate, createInterpDelay, percentile,
} from './timing.js';
import { decodeInput, encodeInput, wishFromCommand } from './inputCodec.js';
import {
  CONTENT, FREE_MATCH_NAME, OP, PROTOCOL, SIM_VERSION, matchmakerProps,
} from './protocol.js';
import { createDirector, restoreDirector } from '../sim/pvp/director.js';
import { INPUT_LIMITS, REWIND, STALL_MS, STEP_MS } from '../sim/pvp/rules.js';
import { TUNING } from '../data/tuning.js';

/** Client netcode tuning. Nothing here is part of the wire contract. */
export const NET = Object.freeze({
  leadStart: 2,
  leadMin: 1,
  leadMax: 12,
  /** Clock samples kept for the estimate (30 Hz snapshots, so 1 s). */
  clockWindow: 30,
  /** Most input ticks one update() may send after a slow render frame. */
  maxTicksPerUpdate: 4,
  pingMs: 500,
  rttWindow: 5,
  /** A round trip longer than this is not a sample (a PONG held up by a long stall). */
  rttMaxSampleMs: 2000,
  /** Unanswered PINGs remembered; a PONG must answer one of them, once. */
  pingsOutMax: 8,
  /** A late count rising by at most this much per snapshot is jitter (more is a stall burst). */
  lateJitterFrames: 2,
  /** Late frames may raise the lead to the round-trip lead plus this many ticks, no further; and
   * whenever the RTT falls, the lead is capped there. */
  leadJitterTicks: 2,
  /**
   * Trim the target lead when `you.buffer` stays above bufferTarget for bufferTrimMs, by the
   * excess the clock trim is not already draining.
   */
  bufferTarget: 2,
  bufferTrimMs: 1000,
  /**
   * Most frame - viewTick may move between consecutive inputs, and most the claimed view may
   * step forward when frames go up by one (the director clamps at REWIND.maxBackStep).
   */
  viewStepTicks: 2,
  /** Initial remote interpolation delay; adaptive from the first snapshots (SHOOTER-S3). */
  interpDelayMs: 100,
  /** Re-announce the delay early (PING) when it moved this far, at most every pingMinMs. */
  interpAnnounceMs: 10,
  pingMinMs: 100,
  extrapolateMs: 100,
  snapshotBuffer: 24,
  /** Server-confirmed hit events kept for the HUD. */
  hitLog: 32,
  /** Predicted local shots kept for the muzzle flash, tracers and sound. */
  shotLog: 32,
  /** A correction within this much of the two bodies touching counts as body contact. */
  contactSlackM: 0.05,
  /** Samples kept for the net graph (10 s of corrections and render frames). */
  graphWindow: 300,
});

/**
 * Render tick -> the viewTick/viewFrac an input carries: the whole tick and 1/256ths of the next.
 * Never before tick 0.
 */
export function viewStamp(renderTick) {
  if (!Number.isFinite(renderTick) || renderTick <= 0) return { viewTick: 0, viewFrac: 0 };
  const viewTick = Math.floor(renderTick);
  const viewFrac = Math.min(REWIND.fracSteps - 1, Math.floor((renderTick - viewTick) * REWIND.fracSteps));
  return { viewTick, viewFrac };
}

const PHASE_RANK = Object.freeze({ joining: 0, lobby: 1, live: 2, done: 3 });

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function headerOf(latest, tick, mode) {
  return {
    tick,
    mode,
    phase: latest.phase,
    outcome: latest.outcome,
    winner: latest.winner,
    reason: latest.reason,
    graceMs: latest.graceMs ?? STALL_MS,
  };
}

function blend(left, right, t) {
  return left.players.map((p, i) => {
    const q = right.players[i];
    return {
      ...q,
      x: p.x + (q.x - p.x) * t,
      y: p.y + (q.y - p.y) * t,
      z: p.z + (q.z - p.z) * t,
      yaw: lerpAngle(p.yaw, q.yaw, t),
      pitch: p.pitch + (q.pitch - p.pitch) * t,
    };
  });
}

/**
 * Sample the snapshot buffer at `renderTick` (fractional server tick).
 * mode 'interp': between two snapshots. 'extrap': past the newest, by velocity, for at most
 * `maxExtrapTicks`. 'hold': before the oldest, or starved for longer than that.
 */
export function sampleAt(snaps, renderTick, maxExtrapTicks = NET.extrapolateMs / STEP_MS) {
  if (!snaps || snaps.length === 0) return null;
  const latest = snaps[snaps.length - 1];
  if (!latest.players) return latest;
  const first = snaps[0];
  if (!Number.isFinite(renderTick) || renderTick <= first.tick) {
    return { ...headerOf(latest, first.tick, 'hold'), players: first.players.map((p) => ({ ...p })) };
  }
  if (renderTick <= latest.tick) {
    for (let i = 0; i < snaps.length - 1; i++) {
      const left = snaps[i];
      const right = snaps[i + 1];
      if (left.tick <= renderTick && right.tick >= renderTick) {
        const span = right.tick - left.tick;
        const t = span <= 0 ? 1 : (renderTick - left.tick) / span;
        return { ...headerOf(latest, round3(renderTick), 'interp'), players: blend(left, right, t) };
      }
    }
  }
  const ahead = renderTick - latest.tick;
  const done = latest.phase === 'done';
  const mode = done || ahead > maxExtrapTicks ? 'hold' : 'extrap';
  const ticks = mode === 'hold' ? (done ? 0 : maxExtrapTicks) : ahead;
  const dt = (ticks * STEP_MS) / 1000;
  return {
    ...headerOf(latest, round3(latest.tick + ticks), mode),
    players: latest.players.map((p) => (p.alive === false ? { ...p } : {
      ...p,
      x: p.x + (p.vx || 0) * dt,
      z: p.z + (p.vz || 0) * dt,
    })),
  };
}

/** Tick-delay sampler kept for tools and tests: render `delay` ticks behind the newest snapshot. */
export function sampleSnapshots(snaps, delay = 3) {
  if (!snaps || snaps.length === 0) return null;
  const latest = snaps[snaps.length - 1];
  if (!latest.players) return latest;
  const sample = sampleAt(snaps, latest.tick - delay, 0);
  return { ...sample, tick: latest.tick - delay };
}

function jsonBytes(value) {
  const text = JSON.stringify(value);
  const buf = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) buf[i] = text.charCodeAt(i) & 255;
  return buf;
}

/** Local table for practice: routes the director's messages to each `to` presence, or to all. */
export function createLoopbackTable(director, clock) {
  const matches = [];
  function emit(op, body, to) {
    for (const match of matches) {
      if (to && to.sessionId !== match.self.sessionId) continue;
      for (const fn of match.fns) fn({ opCode: op, json: () => body, data: jsonBytes(body) });
    }
  }
  function deliver(out) {
    if (!out) return;
    for (const msg of out.messages || []) emit(msg.op, msg.body, msg.to);
  }
  return {
    deliver,
    open(accountId, sessionId) {
      const match = {
        self: { userId: accountId, sessionId },
        fns: [],
        send(op, data) {
          const payload = data instanceof Uint8Array ? data : jsonBytes(data);
          deliver(director.handle(match.self, op, payload, clock()));
        },
        onMessage(fn) { match.fns.push(fn); return () => {}; },
        onClose(fn) { match.closeFn = fn; return () => {}; },
        onRejoin(fn) { match.rejoinFn = fn; return () => {}; },
        drop() { if (match.closeFn) match.closeFn('drop'); },
      };
      matches.push(match);
      return match;
    },
    advance(now) { deliver(director.advance(now)); },
  };
}

/**
 * One seat's client. `clock` is the time source in ms (performance.now by default; the netcode
 * harness passes its virtual clock). Call update(now, build) from the render loop: it runs the
 * 30 Hz input clock and calls build(frame) once per input tick.
 */
export function createPvpClient({
  accountId, match, onChange, clock = nowMs, interpDelayMs = NET.interpDelayMs,
  adaptiveInterp = true, predict = true, onCorrection = null,
}) {
  const snaps = [];
  let seq = 0;
  let phase = 'joining';
  let seat = -1;
  let link = 'connecting';
  let result = null;
  let readied = false;
  let holdReconnect = false;
  let opponent = null;
  let rejectReason = null;
  let slotNow = 0;
  let reconnectAt = 0;
  let names = [null, null];
  let combatCommit = null;
  let spawnSeed = null;
  const seenResults = new Set();
  // Server-confirmed hits ({ tick, shooter, dmg, hits, rewind, at }), newest last.
  const hitLog = [];
  // Render tick of the newest sample() (what is on screen); inputs stamp it as viewTick.
  let viewTick = null;
  // The newest PONG: its serverMs is echoed in the next PING with how long it was held.
  let lastPong = null;

  // Server clock: offsets (clockTick * STEP_MS - arrival) of the newest server packets.
  const offsets = [];
  let clockOffset = null;
  // The clock offset the target lead is measured against (see clockSample).
  let offsetAnchor = null;
  // PING round trips.
  const rtts = [];
  let rttMs = null;
  // Send times of the PINGs not answered yet.
  const pingsOut = [];
  let lastPingAt = -Infinity;
  // Input clock and lead.
  let inputAcc = 0;
  let inputLast = null;
  let lastFrame = -1;
  // Target input lead in ticks. The stamped lead (frame - estimated tick) follows it by trimming
  // the input clock rate, never by skipping frames.
  let lead = NET.leadStart;
  let lateSeen = 0;
  let leadRaisedAt = -Infinity;
  let ack = null;
  let leadLoweredAt = -Infinity;
  // When a snapshot last reported fresh late frames, and whether the input clock just dropped a
  // render stall's backlog: the two cases where frames may jump forward (see planFrame).
  let lateAt = -Infinity;
  let ticksDropped = false;
  let rate = 1;
  let leadNow = null;
  // Server buffer (you.buffer) while it stays above NET.bufferTarget: its minimum, and since when.
  let bufferMin = Infinity;
  let bufferSince = null;
  let pongs = 0;
  // Remote interpolation delay (adaptive) and when sample() last ran.
  const interp = createInterpDelay({ initialMs: interpDelayMs });
  let sampledAt = null;
  let announcedInterp = Math.round(interpDelayMs);
  let lastSnapAt = null;
  // Prediction of this seat, and what it produced for the HUD and the net graph.
  const predictor = predict ? createPredictor() : null;
  const shotLog = [];
  let shotsDrained = 0;
  const corrections = [];
  const frameModes = [];
  const stats = {
    inputTicks: 0, leadRaises: 0, leadLifts: 0, leadDrops: 0, leadCaps: 0, leadTrims: 0, lateFrames: 0, pings: 0,
    maxLead: NET.leadStart, hitsConfirmed: 0, damageConfirmed: 0,
    clockSnaps: 0, clockHolds: 0, clockSteps: 0, clockRateMin: 1, clockRateMax: 1, corrections: 0, snaps: 0, shots: 0,
    contactCorrections: 0, viewHeld: 0,
  };
  let wasTouching = false;
  // The render tick the previous input claimed (viewTick + viewFrac/256), and that input's
  // frame - viewTick (the director keeps both continuous).
  let lastViewStamp = null;
  let lastViewBack = null;
  let server = { rttMs: null, rewindCap: null };
  let look = { yaw: 0, pitch: 0 };
  // Edge buttons and slot picks latched between render frames until an input tick carries them.
  const latch = { jump: false, dash: false, reload: false, slide: false };
  let latchSlot = -1;

  function changed() { if (onChange) onChange(); }

  function send(op, data) {
    if (!match || !match.send) return;
    match.send(op, data);
  }

  function hello() {
    send(OP.HELLO, {
      accountId,
      protocol: PROTOCOL,
      sim: SIM_VERSION,
      content: CONTENT,
      // The director's rewind cap counts this client's interpolation delay (sim 2).
      interpMs: announcedInterp,
    });
  }

  function currentInterp() {
    return adaptiveInterp ? interp.valueMs : interpDelayMs;
  }

  function maybePing(now = clock(), force = false) {
    if (seat < 0 || link !== 'live') return;
    const since = now - lastPingAt;
    // The adaptive delay is re-announced early when it moved, so the rewind cap follows it.
    const moved = Math.abs(Math.round(currentInterp()) - announcedInterp) >= NET.interpAnnounceMs;
    if (!force && since < NET.pingMs && !(moved && since >= NET.pingMinMs)) return;
    lastPingAt = now;
    stats.pings += 1;
    announcedInterp = Math.round(currentInterp());
    const body = { t: now, interpMs: announcedInterp };
    if (lastPong) {
      body.echo = lastPong.serverMs;
      body.hold = Math.max(0, now - lastPong.at);
    }
    pingsOut.push(now);
    if (pingsOut.length > NET.pingsOutMax) pingsOut.shift();
    send(OP.PING, body);
  }

  /** Phase only moves forward, and never leaves 'done' once a result exists. */
  function setPhase(next) {
    if (!next || !(next in PHASE_RANK)) return;
    if (result) {
      phase = 'done';
      return;
    }
    if (PHASE_RANK[next] < PHASE_RANK[phase]) return;
    phase = next;
  }

  /** One server clock sample. Returns how late it arrived behind the least-delayed one (ms). */
  function clockSample(tick, at) {
    if (typeof tick !== 'number' || !Number.isFinite(tick)) return null;
    const offset = tick * STEP_MS - at;
    offsets.push(offset);
    if (offsets.length > NET.clockWindow) offsets.shift();
    clockOffset = Math.max(...offsets);
    // The estimate moving a tick or more from where the frames were last anchored is the
    // downlink changing (an RTT spike starting or ending), not the frames arriving any earlier
    // or later at the server: move the target lead with it, so the clock trim does not chase
    // the estimate the wrong way. Jitter moves the window's best sample by less than a tick.
    if (lastFrame < 0 || offsetAnchor == null) offsetAnchor = clockOffset;
    else if (Math.abs(clockOffset - offsetAnchor) >= STEP_MS) {
      const shift = Math.trunc((clockOffset - offsetAnchor) / STEP_MS);
      offsetAnchor += shift * STEP_MS;
      lead = Math.max(NET.leadMin, Math.min(NET.leadMax, lead - shift));
      stats.clockSteps += 1;
    }
    return clockOffset - offset;
  }

  /**
   * The lowest target lead the buffer trim may reach: the shortest recent round trip in ticks
   * (not the median, which lags behind the end of an RTT spike while the buffer already shows it).
   */
  function leadFloor() {
    if (!rtts.length) return NET.leadMin;
    return Math.max(NET.leadMin, Math.ceil(Math.min(...rtts) / STEP_MS));
  }

  /**
   * Reconcile this seat's prediction with the snapshot: the server's exact player at body.tick
   * and the newest frame that used this seat's own input.
   */
  function reconcile(body, you, now) {
    if (!predictor || !Array.isArray(body.players) || !body.players[seat] || !you.private) return;
    if (body.phase === 'done' || result) return;
    const full = playerFromSnapshot(body.players[seat], you.private);
    const got = predictor.reconcile(body.tick, you.ackFrame, full, now);
    if (!got || got.error == null) return;
    stats.corrections += 1;
    if (got.snapped) stats.snaps += 1;
    corrections.push(got.error);
    if (corrections.length > NET.graphWindow) corrections.shift();
    // Body contact is server-only (the prediction leaves `separate` out): tag those corrections.
    const other = body.players[1 - seat];
    const touching = !!(other && other.alive !== false
      && Math.hypot(other.x - full.x, other.z - full.z) <= 2 * TUNING.playerRadius + NET.contactSlackM);
    const contact = touching || wasTouching;
    wasTouching = touching;
    if (contact) stats.contactCorrections += 1;
    if (onCorrection) onCorrection(got.error, { contact, tick: body.tick });
  }

  /**
   * At live start, lift the lead to the PING round trip in ticks plus one tick of jitter margin
   * when a round trip was measured, so the first inputs are not late. With no sample it stays at
   * NET.leadStart and the late count finds it.
   */
  function leadForRtt() {
    return rttMs == null ? NET.leadStart : Math.min(NET.leadMax, Math.ceil(rttMs / STEP_MS) + 1);
  }

  function seedLead() {
    if (rttMs == null || lastFrame >= 0) return;
    lead = Math.max(lead, leadForRtt());
    stats.maxLead = Math.max(stats.maxLead, lead);
  }

  function leadCeiling() {
    return Math.min(NET.leadMax, leadForRtt() + NET.leadJitterTicks);
  }

  /**
   * Lower the target lead to `want`. Frames already sent stay where they are: the clock trim
   * (or, past TIMING.holdTicks, repeating the previous frame) brings the stamped lead down.
   */
  function lowerLead(want) {
    if (want >= lead) return false;
    lead = want;
    stats.leadDrops += 1;
    return true;
  }

  function estTick(now) {
    return clockOffset == null ? null : (now + clockOffset) / STEP_MS;
  }

  function onWelcome(body) {
    if (!body || body.accountId !== accountId) {
      if (body && body.accountId) opponent = body.accountId;
      changed();
      return;
    }
    seat = body.seat;
    setPhase(body.phase);
    opponent = body.opponent || opponent;
    if (Array.isArray(body.names)) names = body.names.map((n) => (typeof n === 'string' ? n : null));
    if (typeof body.combatCommit === 'string') combatCommit = body.combatCommit;
    if (Number.isInteger(body.spawnSeed)) spawnSeed = body.spawnSeed;
    // Resume after the last sequence the seat accepted (a reload starts from 0).
    if (Number.isInteger(body.lastSeq) && body.lastSeq > seq) seq = body.lastSeq;
    link = 'live';
    rejectReason = null;
    // A lobby rejoin clears the seat's ready flag on the server; say it again.
    if (readied && body.phase === 'lobby' && body.ready === false) send(OP.READY, { accountId });
    maybePing();
    changed();
  }

  function onPong(body) {
    if (!body || typeof body.t !== 'number') return;
    const now = clock();
    // Only the answer to a PING still outstanding counts, once: a repeated or stale PONG would
    // read as a long round trip (and lift the lead).
    const out = pingsOut.indexOf(body.t);
    if (out < 0) return;
    pingsOut.splice(out, 1);
    const rtt = now - body.t;
    if (!(rtt >= 0) || rtt > NET.rttMaxSampleMs) return;
    if (typeof body.serverMs === 'number' && Number.isFinite(body.serverMs)) lastPong = { serverMs: body.serverMs, at: now };
    pongs += 1;
    rtts.push(rtt);
    if (rtts.length > NET.rttWindow) rtts.shift();
    const before = rttMs;
    const sorted = [...rtts].sort((a, b) => a - b);
    rttMs = sorted[Math.floor((sorted.length - 1) / 2)];
    // The RTT fell: a spike's raises may not outlive it.
    if (before != null && rttMs < before && lastFrame >= 0) {
      if (lowerLead(Math.max(NET.leadMin, leadCeiling()))) stats.leadCaps += 1;
    }
    // The RTT rose by more than a tick past what the target covers (an RTT spike): lift the
    // target to the round-trip lead at once instead of one late-frame raise per round trip.
    if (before != null && rttMs > before && lastFrame >= 0 && leadForRtt() > lead + 1) {
      lead = leadForRtt();
      stats.leadLifts += 1;
      stats.maxLead = Math.max(stats.maxLead, lead);
    }
    if (body.phase === 'live' && !result) clockSample(body.clockTick, now);
    // A second PING right away gives the server its first round trip one RTT sooner.
    if (pongs === 1) maybePing(now, true);
  }

  /**
   * you.buffer above NET.bufferTarget for a whole NET.bufferTrimMs (a dip to the target restarts
   * the window): lower the target lead by the smallest excess seen, less what the clock trim is
   * still draining (stamped lead above the target), never below the round trip in ticks.
   */
  function bufferSample(depth, now) {
    if (!Number.isInteger(depth) || lastFrame < 0) return;
    if (depth <= NET.bufferTarget) {
      bufferMin = Infinity;
      bufferSince = null;
      return;
    }
    if (bufferSince == null) bufferSince = now;
    bufferMin = Math.min(bufferMin, depth);
    if (now - bufferSince < NET.bufferTrimMs) return;
    const draining = leadNow == null ? 0 : Math.max(0, leadNow - (lead - 0.5));
    const excess = Math.round(bufferMin - NET.bufferTarget - draining);
    bufferMin = Infinity;
    bufferSince = null;
    if (excess > 0 && lowerLead(Math.max(leadFloor(), lead - excess))) stats.leadTrims += 1;
  }

  function onSnapshot(body) {
    if (!body || !body.players) return;
    const latest = snaps[snaps.length - 1];
    if (latest && Number.isInteger(body.tick) && body.tick < latest.tick) return;
    if (latest && body.tick === latest.tick) snaps.pop();
    snaps.push(body);
    if (snaps.length > NET.snapshotBuffer) snaps.shift();
    const now = clock();
    const late = clockSample(body.clockTick ?? body.tick, now);
    if (late != null && body.phase !== 'done') {
      // Jitter is how late the snapshot's tick arrives on the estimated server clock: network
      // jitter plus the server loop running behind its ticks (clockTick is stamped when the
      // snapshot is sent, so `late` alone misses the loop). A late loop callback steps two ticks
      // and sends one snapshot, so the first tick this one makes drawable is tracked too.
      const dataLate = Number.isInteger(body.tick) ? clockOffset + now - body.tick * STEP_MS : late;
      const first = latest && Number.isInteger(latest.tick) && latest.tick < body.tick ? latest.tick + 1 : null;
      const stepLate = first == null ? null : clockOffset + now - first * STEP_MS;
      interp.observe(Math.max(late, dataLate), lastSnapAt == null ? null : now - lastSnapAt, stepLate);
    }
    lastSnapAt = now;
    if (Array.isArray(body.hits)) {
      for (const hit of body.hits) {
        if (!hit || !Number.isInteger(hit.tick) || !Number.isInteger(hit.dmg)) continue;
        hitLog.push({ ...hit, at: now });
        if (hit.shooter === seat) {
          stats.hitsConfirmed += 1;
          stats.damageConfirmed += hit.dmg;
        }
      }
      while (hitLog.length > NET.hitLog) hitLog.shift();
    }
    const you = body.you;
    if (you && you.seat === seat) {
      ack = { frame: you.ackFrame, seq: you.ackSeq, buffer: you.buffer, late: you.late };
      server = { rttMs: you.rttMs ?? null, rewindCap: you.rewindCap ?? null, interpMs: you.interpMs ?? null };
      reconcile(body, you, now);
      bufferSample(you.buffer, now);
      if (Number.isInteger(you.late) && you.late > lateSeen) {
        const fresh = you.late - lateSeen;
        stats.lateFrames += fresh;
        lateSeen = you.late;
        lateAt = now;
        // A frame or two late is jitter: raise by one, at most once per round trip (frames sent
        // before the raise cannot benefit). A larger run is a TCP stall; the director's hold-last
        // covers it, and a bigger lead would only add input delay.
        const ceiling = leadCeiling();
        if (fresh <= NET.lateJitterFrames && now - leadRaisedAt >= (rttMs ?? 0) + STEP_MS && lead < ceiling) {
          lead += 1;
          leadRaisedAt = now;
          stats.leadRaises += 1;
          stats.maxLead = Math.max(stats.maxLead, lead);
        }
      }
    }
    if (body.outcome && body.phase === 'done' && !result) {
      result = {
        outcome: body.outcome,
        winner: body.winner,
        reason: body.reason,
        tick: body.tick,
        ticketsMinted: 0,
      };
    }
    setPhase(body.phase);
    changed();
  }

  function onResult(body) {
    if (!body || seenResults.has(body.reason + ':' + body.tick + ':' + body.outcome)) return;
    seenResults.add(body.reason + ':' + body.tick + ':' + body.outcome);
    // The combat seed is revealed now: it must hash to the commit this client got at start.
    const combatVerified = typeof body.combatSeed === 'string' && combatCommit != null
      ? sha256Hex(body.combatSeed) === combatCommit
      : null;
    // Keep the match outcome. Drop every economy field. A forged RESULT cannot mint, stake, or refund.
    result = {
      outcome: body.outcome,
      winner: body.winner ?? null,
      reason: body.reason,
      tick: body.tick,
      stateHash: body.stateHash ?? null,
      combatSeed: typeof body.combatSeed === 'string' ? body.combatSeed : undefined,
      combatVerified,
      ticketsMinted: 0,
      stakes: false,
    };
    phase = 'done';
    changed();
  }

  /**
   * A reject for this seat. Protocol 2 never rewinds the sequence (gaps are allowed). A `frame`
   * reject past the futureFrames window lowers the lead into the window.
   */
  function onReject(body) {
    rejectReason = body.reason;
    if (Number.isInteger(body.lastSeq) && body.lastSeq > seq) seq = body.lastSeq;
    if (body.reason === 'frame' && Number.isInteger(body.frame) && Number.isInteger(body.tick)
      && body.frame > body.tick + INPUT_LIMITS.futureFrames) {
      // Every frame already in flight was stamped with the same excess: one drop per round trip.
      const over = body.frame - body.tick - Math.floor(INPUT_LIMITS.futureFrames / 2);
      const now = clock();
      if (now - leadLoweredAt >= (rttMs ?? 0) + STEP_MS && lowerLead(Math.max(NET.leadMin, lead - over))) {
        leadLoweredAt = now;
      }
    }
    changed();
  }

  function onPacket(msg) {
    let body = null;
    if (msg.opCode !== OP.INPUT) {
      try { body = msg.json(); } catch { body = null; }
    }
    if (msg.opCode === OP.WELCOME) onWelcome(body);
    else if (msg.opCode === OP.PHASE) {
      if (body) {
        // The PHASE that starts the match carries the server clock (minus the lead-in). The
        // READY reply may have already said 'live', so this keys on "no input sent yet".
        if (body.phase === 'live' && !result && lastFrame < 0) {
          clockSample(body.clockTick ?? body.tick, clock());
          seedLead();
        }
        setPhase(body.phase);
      }
      changed();
    } else if (msg.opCode === OP.SNAPSHOT) onSnapshot(body);
    else if (msg.opCode === OP.PONG) onPong(body);
    else if (msg.opCode === OP.RESULT) onResult(body);
    else if (msg.opCode === OP.REJECT && body && (body.accountId === accountId || body.accountId == null)) {
      onReject(body);
    }
  }

  if (match && match.onMessage) match.onMessage(onPacket);
  if (match && match.onClose) match.onClose(() => {
    link = 'reconnecting';
    reconnectAt = clock();
    changed();
  });
  if (match && match.onRejoin) match.onRejoin(() => {
    if (holdReconnect) {
      link = 'reconnecting';
      changed();
      return;
    }
    link = 'live';
    // A reconnect is a new session id: only HELLO rebinds the seat (RESYNC needs the old one).
    hello();
    changed();
  });

  hello();

  function live() {
    return phase === 'live' && !result;
  }

  /**
   * The frame the next input tick stamps at time `at`, or null (not live, no clock, or still
   * before tick 0 in the lead-in). The first frame is estimated tick + lead; after that frames
   * go up by exactly one per tick and the clock trim moves the stamped lead. Behind the target
   * (late frames reported, or a dropped backlog) the frame jumps forward to estimated tick +
   * lead; more than TIMING.holdTicks ahead of it the previous frame is repeated (the director
   * replaces it) until the trim can take over. Never moving a frame back keeps frame - viewTick
   * within NET.viewStepTicks per input.
   */
  function planFrame(at) {
    if (!live()) return null;
    const est = estTick(at);
    if (est == null) return null;
    const aim = Math.floor(est) + lead;
    if (lastFrame < 0) return aim < 0 ? null : { frame: Math.min(INPUT_LIMITS.maxFrame, aim), est, snap: false, hold: false };
    const next = lastFrame + 1;
    const error = lead - 0.5 - (next - est);
    // Behind: jump only when frames are really falling short: a dropped backlog (past
    // resyncTicks), or late frames in the last round trip (past lateResyncTicks: those frames
    // are lost anyway). Otherwise the trim takes it.
    const lateNow = at - lateAt <= (rttMs ?? 0) + 2 * STEP_MS;
    if ((ticksDropped && error > TIMING.resyncTicks) || (lateNow && error > TIMING.lateResyncTicks)) {
      return { frame: Math.min(INPUT_LIMITS.maxFrame, Math.max(next, aim)), est, snap: true, hold: false };
    }
    if (error < -TIMING.holdTicks) return { frame: lastFrame, est, snap: false, hold: true };
    return { frame: Math.min(INPUT_LIMITS.maxFrame, next), est, snap: false, hold: false };
  }

  /**
   * The render tick an input claims for `frame`: what the shooter saw (`want`), kept continuous
   * the way the director checks it. viewTick never moves back; frame - viewTick moves by at most
   * NET.viewStepTicks from the previous input; and while that allows it, the claim steps forward
   * by at most NET.viewStepTicks (a clock-window jump in the render time cannot leap). Returns a
   * fractional render tick.
   */
  function continuousSeen(frame, want) {
    if (lastViewStamp == null || lastViewBack == null) return want;
    const step = NET.viewStepTicks;
    const lastTick = Math.floor(lastViewStamp);
    // Whole view ticks the director accepts: frame - back within step of the last back, and
    // never below the last view tick.
    const lo = Math.max(lastTick, frame - lastViewBack - step);
    const hi = frame - lastViewBack + step;
    let seen = Math.max(lastViewStamp, Math.min(lastViewStamp + step, want));
    if (Math.floor(seen) < lo) seen = lo;
    else if (Math.floor(seen) > hi) seen = hi + (REWIND.fracSteps - 1) / REWIND.fracSteps;
    if (seen !== want) stats.viewHeld += 1;
    return seen;
  }

  /**
   * Send one input tick (see planFrame), predict it, and set the clock rate for the next one.
   * Returns false when not live or the clock has no sample yet.
   */
  function sendTick(wish, at = clock()) {
    const plan = planFrame(at);
    if (!plan) return false;
    const { frame, est } = plan;
    // What the shooter saw: the newest drawn frame's render tick (else the render time now),
    // kept continuous (see continuousSeen).
    const seen = continuousSeen(frame, viewTick != null ? viewTick : est - currentInterp() / STEP_MS);
    const view = wish.viewTick != null
      ? { viewTick: wish.viewTick, viewFrac: wish.viewFrac ?? 0 }
      : viewStamp(seen);
    // Encode before committing seq, so a bad wish (NaN aim) cannot desync the sequence.
    const packet = encodeInput({
      ...wish, ...view, seq: seq + 1, frame, yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0,
    });
    seq += 1;
    if (Number.isInteger(wish.slot) && wish.slot >= 0) slotNow = wish.slot;
    look = { yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0 };
    if (plan.snap) stats.clockSnaps += 1;
    if (plan.hold) stats.clockHolds += 1;
    ticksDropped = false;
    const sentView = view.viewTick + view.viewFrac / REWIND.fracSteps;
    if (Number.isFinite(sentView)) {
      lastViewStamp = wish.viewTick != null ? sentView : Math.max(sentView, seen);
      lastViewBack = frame - view.viewTick;
    }
    lastFrame = frame;
    stats.inputTicks += 1;
    // Trim the input clock toward the target lead (half a tick under it, as floor(est) + lead was).
    leadNow = frame - est;
    rate = clockRate(lead - 0.5 - leadNow);
    stats.clockRateMin = Math.min(stats.clockRateMin, rate);
    stats.clockRateMax = Math.max(stats.clockRateMax, rate);
    send(OP.INPUT, packet);
    // Predict with exactly what the server will decode, and fire the cosmetics at once.
    if (predictor && predictor.ready) {
      const used = decodeInput(packet);
      const shot = predictor.push(frame, used, at);
      if (shot.fired) {
        const p = predictor.state;
        stats.shots += 1;
        shotLog.push({
          frame, at, slot: p.slot, yaw: used.yaw, pitch: used.pitch, x: p.x, y: p.y, z: p.z, zoom: used.zoom, id: stats.shots,
        });
        while (shotLog.length > NET.shotLog) shotLog.shift();
      }
    }
    return true;
  }

  /**
   * The 30 Hz input clock, trimmed by +-5% (see sendTick). Call it every render frame. Each due
   * input tick calls build(frame) for a wish and sends exactly one INPUT. A long render stall
   * drops the backlog beyond NET.maxTicksPerUpdate instead of bursting it at the director.
   */
  function update(now, build) {
    maybePing(now);
    if (!live() || clockOffset == null) {
      inputLast = null;
      inputAcc = 0;
      return 0;
    }
    if (inputLast == null) {
      inputLast = now;
      inputAcc = STEP_MS;
    } else {
      inputAcc += Math.max(0, now - inputLast) * rate;
      inputLast = now;
    }
    if (inputAcc > NET.maxTicksPerUpdate * STEP_MS) {
      inputAcc = NET.maxTicksPerUpdate * STEP_MS;
      ticksDropped = true;
    }
    let sent = 0;
    while (inputAcc >= STEP_MS - 1e-6) {
      inputAcc -= STEP_MS;
      // Stamp each tick at the moment the accumulator crossed it, so ticks stay exactly one
      // (trimmed) frame apart however the render frames fall.
      const at = now - inputAcc / rate;
      const plan = planFrame(at);
      if (!plan) continue;
      const wish = build(plan.frame);
      if (wish && sendTick(wish, at)) sent += 1;
    }
    return sent;
  }

  /** update() for a campaign Command: latches edge buttons and slot picks until a tick sends them. */
  function updateCommand(now, cmd) {
    if (cmd) {
      const pressed = cmd.pressed || {};
      for (const key of Object.keys(latch)) if (pressed[key]) latch[key] = true;
      if (Number.isInteger(cmd.slot) && cmd.slot >= 0 && cmd.slot <= 2) latchSlot = cmd.slot;
      else if (cmd.wheel) latchSlot = ((latchSlot >= 0 ? latchSlot : slotNow) + (cmd.wheel > 0 ? 1 : -1) + 3) % 3;
    }
    return update(now, (frame) => {
      const wish = wishFromCommand({
        ...(cmd || {}),
        pressed: { ...latch },
        slot: latchSlot,
        wheel: 0,
      }, seq + 1, frame, slotNow);
      for (const key of Object.keys(latch)) latch[key] = false;
      latchSlot = -1;
      return wish;
    });
  }

  /** How far the input clock is into the next tick (0..1), for blending the predicted player. */
  function inputAlpha(now) {
    if (inputLast == null) return 1;
    return Math.max(0, Math.min(1, (inputAcc + Math.max(0, now - inputLast) * rate) / STEP_MS));
  }

  /** The newest snapshot sample with this seat drawn from the prediction. */
  function withPrediction(view, now) {
    if (!view || !view.players || seat < 0 || !predictor || !predictor.ready || !live()) return view;
    const server = view.players[seat];
    if (!server || server.alive === false) return view;
    const p = predictor.visual(now, inputAlpha(now));
    const players = view.players.slice();
    players[seat] = {
      ...server,
      x: p.x, y: p.y, z: p.z,
      vx: p.vx, vz: p.vz,
      yaw: p.yaw, pitch: p.pitch,
      slot: p.slot,
      grappleCd: p.grappleCd, grappleMiss: p.grappleMiss,
      grapple: p.grapple ? { x: p.grapple.x, y: p.grapple.y, z: p.grapple.z, id: p.grapple.id } : null,
      mag: p.mag, shells: p.shells, sniper: p.sniper, reloadT: p.reloadT, swapT: p.swapT, slideT: p.slideT,
      predicted: true,
    };
    return { ...view, players };
  }

  function sample(now = clock()) {
    const est = estTick(now);
    if (est == null) return sampleSnapshots(snaps, 3);
    const dt = sampledAt == null ? 0 : now - sampledAt;
    sampledAt = now;
    const delay = adaptiveInterp ? interp.step(dt) : interpDelayMs;
    const renderTick = est - delay / STEP_MS;
    viewTick = renderTick;
    const view = sampleAt(snaps, renderTick);
    if (view && view.mode && live()) {
      frameModes.push(view.mode === 'extrap' || view.mode === 'hold' ? 1 : 0);
      if (frameModes.length > NET.graphWindow) frameModes.shift();
    }
    return withPrediction(view, now);
  }

  /** Predicted local shots after the last drain (sound and one-shot effects). */
  function drainShots() {
    const out = shotLog.filter((shot) => shot.id > shotsDrained);
    if (out.length) shotsDrained = out[out.length - 1].id;
    return out;
  }

  /** Numbers for the dev net graph. */
  function netGraph(now = clock()) {
    const est = estTick(now);
    const claimTicks = lastFrame >= 0 && viewTick != null ? lastFrame - viewTick : null;
    const starved = frameModes.length ? frameModes.reduce((a, b) => a + b, 0) / frameModes.length : null;
    return {
      rttMs: rttMs,
      serverRttMs: server.rttMs,
      jitterMs: interp.jitterP95Ms,
      buffer: ack ? ack.buffer : null,
      latePct: stats.inputTicks ? (100 * stats.lateFrames) / stats.inputTicks : 0,
      correctionP50Cm: corrections.length ? percentile(corrections, 50) * 100 : null,
      correctionP99Cm: corrections.length ? percentile(corrections, 99) * 100 : null,
      interpMs: currentInterp(),
      interpTargetMs: adaptiveInterp ? interp.targetMs : interpDelayMs,
      rewindMs: claimTicks == null ? null : claimTicks * STEP_MS,
      rewindCapMs: server.rewindCap == null ? null : server.rewindCap * STEP_MS,
      starvedPct: starved == null ? null : starved * 100,
      lead,
      leadNow,
      clockRate: rate,
      estTick: est,
    };
  }

  function recentHits(now, windowMs = 1000) {
    return hitLog.filter((hit) => now - hit.at <= windowMs);
  }

  return {
    accountId,
    get seat() { return seat; },
    get phase() { return phase; },
    get link() { return link; },
    get result() { return result; },
    get rejectReason() { return rejectReason; },
    /** Yaw and pitch of the newest wish this client sent: the camera follows these, not the server echo. */
    get look() { return look; },
    /** Input lead, server-clock estimate, PING RTT and the server's ack, for overlays and tests. */
    get net() {
      return {
        lead,
        rttMs,
        rttSamples: [...rtts],
        estTick: estTick(clock()),
        lastFrame,
        seq,
        interpDelayMs: currentInterp(),
        interpTargetMs: adaptiveInterp ? interp.targetMs : interpDelayMs,
        interpAnnouncedMs: announcedInterp,
        jitterP95Ms: interp.jitterP95Ms,
        leadNow,
        clockRate: rate,
        predicted: !!(predictor && predictor.ready),
        correctionP50Cm: corrections.length ? percentile(corrections, 50) * 100 : null,
        correctionP99Cm: corrections.length ? percentile(corrections, 99) * 100 : null,
        ack,
        viewTick,
        serverRttMs: server.rttMs,
        rewindCap: server.rewindCap,
        ...stats,
      };
    },
    get names() { return names; },
    /** sha256(combatSeed) from WELCOME; RESULT reveals the seed. */
    get combatCommit() { return combatCommit; },
    get spawnSeed() { return spawnSeed; },
    /** Server-confirmed hit events, newest last. */
    get hits() { return hitLog.slice(); },
    /** Predicted local shots (cosmetic: muzzle flash, tracer, sound), newest last. */
    get shots() { return shotLog.slice(); },
    drainShots,
    netGraph,
    /** The predicted local player (null until the first snapshot with you.private). */
    get predicted() { return predictor && predictor.ready ? predictor.state : null; },
    setHoldReconnect(value) { holdReconnect = !!value; },
    ready() {
      readied = true;
      send(OP.READY, { accountId });
    },
    update,
    updateCommand,
    /** One input tick now, outside the clock. Prefer update(). */
    submit(wish) { return sendTick(wish, clock()); },
    sample,
    viewState(now = clock()) {
      const view = sample(now) || snaps[snaps.length - 1] || null;
      const graceLeftMs = link === 'reconnecting' ? Math.max(0, STALL_MS - (now - reconnectAt)) : STALL_MS;
      return {
        accountId,
        seat,
        phase,
        link,
        result,
        readied,
        opponent,
        rejectReason,
        sample: view,
        graceLeftMs,
        hits: recentHits(now),
        shots: shotLog.filter((shot) => now - shot.at <= 1000),
        ticketsMinted: 0,
      };
    },
  };
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * The free match handler the mock realtime server runs (the hub's H3 handler follows the same
 * shape). With `freeze`, the director lives in match state only as exportState() JSON and is
 * thawed for each callback, as Nakama's copied match state requires.
 */
export function registerFreeMatch(server, options = {}) {
  server.registerMatch(FREE_MATCH_NAME, {
    init(params) {
      const seed = (params && params.seed) || options.seed || 1;
      // The hub passes a secret combatSeed. The local mock may leave it out (derived, flagged).
      const combatSeed = (params && params.combatSeed) || options.combatSeed;
      const director = createDirector({
        spawnSeed: seed, combatSeed, matchId: (params && params.matchId) || 'pending',
      });
      const freeze = !!((params && params.freeze) ?? options.freeze);
      return {
        state: {
          director: freeze ? null : director,
          frozen: freeze ? director.exportState() : null,
          clock: (params && params.clock) || options.clock || (() => Date.now()),
        },
        label: JSON.stringify({
          kind: FREE_MATCH_NAME,
          game: 'sproto-shooter',
          mode: 'free',
          protocol: PROTOCOL,
          content: CONTENT,
          stake: 0,
        }),
      };
    },
    joinAttempt(state, presence) {
      return withDirector(state, (director) => director.joinAttempt(presence.userId));
    },
    join() {},
    leave(state, presences) {
      withDirector(state, (director) => {
        for (const presence of presences) director.disconnect(presence.userId, presence.sessionId);
      });
    },
    loop(state, messages, dispatcher) {
      const now = state.clock();
      const send = (out) => {
        for (const msg of (out && out.messages) || []) dispatcher.broadcast(msg.op, msg.body, msg.to ? [msg.to] : undefined);
      };
      withDirector(state, (director) => {
        for (const message of messages) send(director.handle(message.sender, message.opCode, message.data, now));
        send(director.advance(now));
      });
    },
  });
}

function withDirector(state, fn) {
  if (state.director) return fn(state.director);
  const director = restoreDirector(state.frozen);
  const out = fn(director);
  state.frozen = director.exportState();
  return out;
}

export function createMockArena(options = {}) {
  const server = createMockRealtimeServer();
  registerFreeMatch(server, options);
  const matchId = server.createMatch(FREE_MATCH_NAME, { seed: options.seed ?? 7, clock: options.clock });
  return { server, matchId };
}

export function freeMatchmakerRequest() {
  return matchmakerProps(CONTENT);
}

export function commandLooksLive(packet) {
  return decodeInput(packet).seq > 0;
}
