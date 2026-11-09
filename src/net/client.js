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
// - Lead adapts: it starts at the round trip in ticks plus one; the director accepts and
//   discards late frames and counts them in the snapshot (`you.late`), and a new late count
//   raises the lead by one at most once per round trip, up to the round-trip lead +
//   NET.leadJitterTicks; whenever the measured RTT falls, the lead is capped at that same
//   ceiling (an RTT spike's raises come back down within ~2 s); when the snapshot's `you.buffer`
//   (frames queued ahead at the server) stays above NET.bufferTarget for NET.bufferTrimMs, the
//   lead drops by the excess; a `frame` reject past the director's futureFrames window lowers
//   it; a long clean run probes one tick lower. Capped at NET.leadMax.
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
import { createMockRealtimeServer } from '@metaverse/hub-sdk';
import { sha256Hex } from '../core/sha256.js';
import { decodeInput, encodeInput, wishFromCommand } from './inputCodec.js';
import {
  CONTENT, FREE_MATCH_NAME, OP, PROTOCOL, SIM_VERSION, matchmakerProps,
} from './protocol.js';
import { createDirector, restoreDirector } from '../sim/pvp/director.js';
import { INPUT_LIMITS, REWIND, STALL_MS, STEP_MS } from '../sim/pvp/rules.js';

/** Client netcode tuning. Nothing here is part of the wire contract. */
export const NET = Object.freeze({
  leadStart: 2,
  leadMin: 1,
  leadMax: 12,
  /** Input ticks without a late frame before the lead probes one tick lower. */
  leadProbeTicks: 900,
  /** Clock samples kept for the estimate (30 Hz snapshots, so 1 s). */
  clockWindow: 30,
  /** Most input ticks one update() may send after a slow render frame. */
  maxTicksPerUpdate: 4,
  pingMs: 500,
  rttWindow: 5,
  /** A round trip longer than this is not a sample (a PONG held up by a long stall). */
  rttMaxSampleMs: 2000,
  /** A late count rising by at most this much per snapshot is jitter (more is a stall burst). */
  lateJitterFrames: 2,
  /** Late frames may raise the lead to the round-trip lead plus this many ticks, no further; and
   * whenever the RTT falls, the lead is capped there. */
  leadJitterTicks: 2,
  /** Trim the lead when `you.buffer` stays above bufferTarget for bufferTrimMs. */
  bufferTarget: 2,
  bufferTrimMs: 1000,
  interpDelayMs: 100,
  extrapolateMs: 100,
  snapshotBuffer: 24,
  /** Server-confirmed hit events kept for the HUD. */
  hitLog: 32,
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
  // PING round trips.
  const rtts = [];
  let rttMs = null;
  let lastPingAt = -Infinity;
  // Input clock and lead.
  let inputAcc = 0;
  let inputLast = null;
  let lastFrame = -1;
  let lead = NET.leadStart;
  let cleanTicks = 0;
  let lateSeen = 0;
  let leadRaisedAt = -Infinity;
  let ack = null;
  // Server buffer (you.buffer) since the last trim: its minimum and when the window started.
  let bufferMin = Infinity;
  let bufferSince = null;
  let pongs = 0;
  const stats = {
    inputTicks: 0, leadRaises: 0, leadDrops: 0, leadCaps: 0, leadTrims: 0, lateFrames: 0, pings: 0,
    maxLead: NET.leadStart, hitsConfirmed: 0, damageConfirmed: 0,
  };
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
      interpMs: interpDelayMs,
    });
  }

  function maybePing(now = clock(), force = false) {
    if (seat < 0 || link !== 'live' || (!force && now - lastPingAt < NET.pingMs)) return;
    lastPingAt = now;
    stats.pings += 1;
    const body = { t: now, interpMs: interpDelayMs };
    if (lastPong) {
      body.echo = lastPong.serverMs;
      body.hold = Math.max(0, now - lastPong.at);
    }
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

  function clockSample(tick, at) {
    if (typeof tick !== 'number' || !Number.isFinite(tick)) return;
    offsets.push(tick * STEP_MS - at);
    if (offsets.length > NET.clockWindow) offsets.shift();
    clockOffset = Math.max(...offsets);
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

  /** Lower the lead to `want`. The next frames repeat ones already sent; the director replaces them. */
  function lowerLead(want) {
    if (want >= lead) return false;
    if (lastFrame >= 0) lastFrame -= lead - want;
    lead = want;
    stats.leadDrops += 1;
    // What the server buffers changes only after the frames sent from now on arrive.
    bufferMin = Infinity;
    bufferSince = null;
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
    if (body.phase === 'live' && !result) clockSample(body.clockTick, now);
    // A second PING right away gives the server its first round trip one RTT sooner.
    if (pongs === 1) maybePing(now, true);
  }

  /** you.buffer above NET.bufferTarget for a whole NET.bufferTrimMs: lower the lead by the excess. */
  function bufferSample(depth, now) {
    if (!Number.isInteger(depth) || lastFrame < 0) return;
    if (bufferSince == null) bufferSince = now;
    bufferMin = Math.min(bufferMin, depth);
    if (now - bufferSince < NET.bufferTrimMs) return;
    const excess = bufferMin - NET.bufferTarget;
    if (excess > 0 && lowerLead(Math.max(NET.leadMin, lead - excess))) {
      stats.leadTrims += 1;
      return;
    }
    bufferMin = Infinity;
    bufferSince = now;
  }

  function onSnapshot(body) {
    if (!body || !body.players) return;
    const latest = snaps[snaps.length - 1];
    if (latest && Number.isInteger(body.tick) && body.tick < latest.tick) return;
    if (latest && body.tick === latest.tick) snaps.pop();
    snaps.push(body);
    if (snaps.length > NET.snapshotBuffer) snaps.shift();
    const now = clock();
    clockSample(body.clockTick ?? body.tick, now);
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
      server = { rttMs: you.rttMs ?? null, rewindCap: you.rewindCap ?? null };
      bufferSample(you.buffer, now);
      if (Number.isInteger(you.late) && you.late > lateSeen) {
        const fresh = you.late - lateSeen;
        stats.lateFrames += fresh;
        lateSeen = you.late;
        cleanTicks = 0;
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
    result = { ...body, combatVerified };
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
      const over = body.frame - body.tick - Math.floor(INPUT_LIMITS.futureFrames / 2);
      lowerLead(Math.max(NET.leadMin, lead - over));
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
   * Send one input tick: frame = estimated server tick (at `at`) + lead, and always after the
   * previous frame (only a lead drop repeats one frame, which the director simply replaces).
   * Returns false when not live or the clock has no sample yet.
   */
  function sendTick(wish, at = clock()) {
    if (!live()) return false;
    const est = estTick(at);
    if (est == null) return false;
    const aim = Math.floor(est) + lead;
    // During the lead-in the aim point is still before tick 0.
    if (aim < 0) return false;
    const frame = Math.min(INPUT_LIMITS.maxFrame, Math.max(aim, lastFrame + 1));
    // What the shooter saw: the newest drawn frame's render tick (else the render time now).
    const view = wish.viewTick != null
      ? { viewTick: wish.viewTick, viewFrac: wish.viewFrac ?? 0 }
      : viewStamp(viewTick != null ? viewTick : est - interpDelayMs / STEP_MS);
    // Encode before committing seq, so a bad wish (NaN aim) cannot desync the sequence.
    const packet = encodeInput({
      ...wish, ...view, seq: seq + 1, frame, yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0,
    });
    seq += 1;
    if (Number.isInteger(wish.slot) && wish.slot >= 0) slotNow = wish.slot;
    look = { yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0 };
    lastFrame = frame;
    stats.inputTicks += 1;
    cleanTicks += 1;
    if (cleanTicks >= NET.leadProbeTicks && lead > NET.leadMin) {
      // Probe one tick lower. The next frame repeats this one, which the director replaces.
      lead -= 1;
      lastFrame -= 1;
      cleanTicks = 0;
      stats.leadDrops += 1;
    }
    send(OP.INPUT, packet);
    return true;
  }

  /**
   * The 30 Hz input clock. Call it every render frame. Each due input tick calls
   * build(frame) for a wish and sends exactly one INPUT. A long render stall drops the backlog
   * beyond NET.maxTicksPerUpdate instead of bursting it at the director.
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
      inputAcc += Math.max(0, now - inputLast);
      inputLast = now;
    }
    if (inputAcc > NET.maxTicksPerUpdate * STEP_MS) inputAcc = NET.maxTicksPerUpdate * STEP_MS;
    let sent = 0;
    while (inputAcc >= STEP_MS - 1e-6) {
      inputAcc -= STEP_MS;
      // Stamp each tick at the moment the accumulator crossed it, so ticks stay exactly one
      // frame apart however the render frames fall.
      const at = now - inputAcc;
      const aim = Math.floor(estTick(at)) + lead;
      if (aim < 0) continue;
      const wish = build(Math.max(aim, lastFrame + 1));
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

  function sample(now = clock()) {
    const est = estTick(now);
    if (est == null) return sampleSnapshots(snaps, 3);
    const renderTick = est - interpDelayMs / STEP_MS;
    viewTick = renderTick;
    return sampleAt(snaps, renderTick);
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
        interpDelayMs,
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
