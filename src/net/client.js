// Arena client. Snapshots are interpolated on a clock. The server result is the only outcome.
//
// Timing (SHOOTER-S1, still protocol 1):
// - Server clock: every snapshot (and the PHASE that starts the match) gives an offset
//   `tick * STEP_MS - arrival`. The estimate uses the largest offset of the last few, i.e. the
//   least-delayed packet, so estimated server tick = that snapshot's tick + elapsed × 30 Hz.
// - Input clock: a fixed 30 Hz accumulator, not the render loop. Each input tick builds one wish
//   and sends exactly one INPUT stamped frame = estimated server tick + lead.
// - Lead adapts: start 2; a `frame` reject below the cursor raises it by cursor - frame + 1; a
//   frame past the director's futureFrames window lowers it; a long run with no late frame
//   probes one tick lower. Capped at NET.leadMax.
// - Remote interpolation: render time = estimated server time - delay. Interpolate between the
//   two snapshots around it, extrapolate up to NET.extrapolateMs when starved, then hold.
import { createMockRealtimeServer } from '@metaverse/hub-sdk';
import { decodeInput, encodeInput, wishFromCommand } from './inputCodec.js';
import {
  CONTENT, FREE_MATCH_NAME, OP, PROTOCOL, SIM_VERSION, matchmakerProps,
} from './protocol.js';
import { createDirector } from '../sim/pvp/director.js';
import { INPUT_LIMITS, STALL_MS, STEP_MS } from '../sim/pvp/rules.js';

/** Client netcode tuning. Nothing here is part of the wire contract. */
export const NET = Object.freeze({
  leadStart: 2,
  leadMin: 1,
  leadMax: 12,
  /** Input ticks without a late frame before the lead probes one tick lower. */
  leadProbeTicks: 900,
  /** Snapshots kept for the clock estimate (10 Hz at protocol 1, so 1.6 s). */
  clockWindow: 16,
  /** Most input ticks one update() may send after a slow render frame (director cap: 4 per tick). */
  maxTicksPerUpdate: 4,
  interpDelayMs: 100,
  extrapolateMs: 100,
  snapshotBuffer: 24,
});

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
    graceMs: latest.graceMs,
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

export function createLoopbackTable(director, clock) {
  const matches = [];
  function emit(op, body) {
    for (const match of matches) {
      for (const fn of match.fns) fn({ opCode: op, json: () => body, data: jsonBytes(body) });
    }
  }
  function deliver(out) {
    if (!out) return;
    for (const msg of out.messages || []) emit(msg.op, msg.body);
    for (const snap of out.snapshots || []) emit(OP.SNAPSHOT, snap);
    if (out.phaseMessage) emit(OP.PHASE, out.phaseMessage);
    if (out.result) emit(OP.RESULT, out.result);
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
  const seenResults = new Set();

  // Server clock: offsets (tick * STEP_MS - arrival) of the newest snapshots.
  const offsets = [];
  let clockOffset = null;
  // Round trips of HELLO/READY -> own WELCOME (the only request/response pair in protocol 1).
  const pings = [];
  let rttMs = null;
  // Input clock and lead.
  let inputAcc = 0;
  let inputLast = null;
  let lastFrame = -1;
  let lead = NET.leadStart;
  let cleanTicks = 0;
  let resyncSeq = -1;
  let echoBudget = 0;
  const inFlight = new Map();
  const stats = { inputTicks: 0, leadRaises: 0, leadDrops: 0, staleRejects: 0, maxLead: NET.leadStart };
  let look = { yaw: 0, pitch: 0 };
  // Edge buttons and slot picks latched between render frames until an input tick carries them.
  const latch = { jump: false, dash: false, reload: false, slide: false };
  let latchSlot = -1;

  function changed() { if (onChange) onChange(); }

  function send(op, data) {
    if (!match || !match.send) return;
    match.send(op, data);
  }

  function request(op, data) {
    pings.push(clock());
    send(op, data);
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
    if (!Number.isInteger(tick)) return;
    offsets.push(tick * STEP_MS - at);
    if (offsets.length > NET.clockWindow) offsets.shift();
    clockOffset = Math.max(...offsets);
  }

  /**
   * At live start, lift the lead to the handshake round trip in ticks plus one tick of jitter
   * margin when a round trip was measured, so the first inputs are not late. With no sample it
   * stays at NET.leadStart and the late-reject rule finds it.
   */
  function seedLead() {
    if (rttMs == null || lastFrame >= 0) return;
    lead = Math.max(lead, Math.min(NET.leadMax, Math.ceil(rttMs / STEP_MS) + 1));
    stats.maxLead = Math.max(stats.maxLead, lead);
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
    if (pings.length) {
      const rtt = clock() - pings.shift();
      rttMs = rttMs == null ? rtt : Math.min(rttMs, rtt);
    }
    seat = body.seat;
    setPhase(body.phase);
    opponent = body.opponent || opponent;
    link = 'live';
    rejectReason = null;
    changed();
  }

  function onSnapshot(body) {
    if (!body || !body.players) return;
    const latest = snaps[snaps.length - 1];
    if (latest && Number.isInteger(body.tick) && body.tick < latest.tick) return;
    if (latest && body.tick === latest.tick) snaps.pop();
    snaps.push(body);
    if (snaps.length > NET.snapshotBuffer) snaps.shift();
    clockSample(body.tick, clock());
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
    result = body;
    phase = 'done';
    changed();
  }

  /**
   * A reject for this seat. Protocol 1 rejects carry the server's lastSeq and cursor tick, so
   * the next input reuses lastSeq + 1. In-flight inputs sent before the rewind come back as
   * `sequence` rejects with the same lastSeq; those are echoes and are ignored, so one late
   * frame no longer cascades.
   */
  function onReject(body) {
    rejectReason = body.reason;
    if (!Number.isInteger(body.lastSeq)) {
      changed();
      return;
    }
    if (body.reason === 'sequence' && body.lastSeq === resyncSeq && echoBudget > 0) {
      echoBudget -= 1;
      stats.staleRejects += 1;
      return;
    }
    const failed = inFlight.get(body.lastSeq + 1);
    if (body.reason === 'frame' && failed && Number.isInteger(body.tick)) {
      const cursor = body.tick;
      if (failed.frame < cursor) {
        // Late: the packet's lead was short by cursor - frame. Inputs already in flight with the
        // same lead fail the same way, so the raise is relative to the failed packet's lead.
        const want = Math.min(NET.leadMax, failed.lead + cursor - failed.frame + 1);
        if (want > lead) {
          lead = want;
          stats.leadRaises += 1;
          stats.maxLead = Math.max(stats.maxLead, lead);
        }
        cleanTicks = 0;
      } else if (failed.frame > cursor + INPUT_LIMITS.futureFrames) {
        // Too far ahead for the director's window: aim for the middle of it.
        const over = failed.frame - cursor - Math.floor(INPUT_LIMITS.futureFrames / 2);
        const want = Math.max(NET.leadMin, failed.lead - over);
        if (want < lead) {
          lastFrame -= lead - want;
          lead = want;
          stats.leadDrops += 1;
        }
      }
    }
    // Every input after the failed one was already rejected as `sequence` with this same
    // lastSeq. Those echoes are expected; anything past them is a real gap.
    echoBudget = Math.max(0, seq - body.lastSeq - 1);
    seq = body.lastSeq;
    resyncSeq = body.lastSeq;
    for (const key of [...inFlight.keys()]) if (key > seq) inFlight.delete(key);
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
        // The PHASE that starts the match is tick 0 at live start. (The READY reply may have
        // already said 'live', so this keys on "no input sent yet", not on the phase.)
        if (body.phase === 'live' && !result && lastFrame < 0) {
          clockSample(body.tick, clock());
          seedLead();
        }
        setPhase(body.phase);
      }
      changed();
    } else if (msg.opCode === OP.SNAPSHOT) onSnapshot(body);
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
    send(OP.RESYNC, { accountId });
    changed();
  });

  request(OP.HELLO, {
    accountId,
    protocol: PROTOCOL,
    sim: SIM_VERSION,
    content: CONTENT,
  });

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
    const frame = Math.min(INPUT_LIMITS.maxFrame, Math.max(Math.floor(est) + lead, lastFrame + 1));
    // Encode before committing seq, so a bad wish (NaN aim) cannot desync the sequence.
    const packet = encodeInput({ ...wish, seq: seq + 1, frame, yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0 });
    seq += 1;
    if (Number.isInteger(wish.slot) && wish.slot >= 0) slotNow = wish.slot;
    look = { yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0 };
    lastFrame = frame;
    inFlight.set(seq, { frame, lead });
    if (inFlight.size > 64) inFlight.delete(inFlight.keys().next().value);
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
      const wish = build(Math.max(Math.floor(estTick(at)) + lead, lastFrame + 1));
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
    return sampleAt(snaps, est - interpDelayMs / STEP_MS);
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
    /** Input lead, server-clock estimate and handshake RTT, for overlays and tests. */
    get net() {
      return {
        lead,
        rttMs,
        estTick: estTick(clock()),
        lastFrame,
        interpDelayMs,
        ...stats,
      };
    },
    setHoldReconnect(value) { holdReconnect = !!value; },
    ready() {
      readied = true;
      request(OP.READY, { accountId });
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
        ticketsMinted: 0,
      };
    },
  };
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function registerFreeMatch(server, options = {}) {
  server.registerMatch(FREE_MATCH_NAME, {
    init(params) {
      const seed = (params && params.seed) || options.seed || 1;
      const director = createDirector({ seed, matchId: 'pending' });
      return {
        state: {
          director,
          clock: (params && params.clock) || options.clock || (() => Date.now()),
          resultSent: false,
        },
        label: JSON.stringify({
          kind: FREE_MATCH_NAME,
          game: 'sproto-shooter',
          mode: 'free',
          protocol: PROTOCOL,
          stake: 0,
        }),
      };
    },
    joinAttempt(state, presence) {
      return state.director.joinAttempt(presence.userId);
    },
    join() {},
    leave(state, presences) {
      for (const presence of presences) state.director.disconnect(presence.userId, presence.sessionId);
    },
    loop(state, messages, dispatcher) {
      const now = state.clock();
      for (const message of messages) {
        const out = state.director.handle(message.sender, message.opCode, message.data, now);
        for (const msg of (out && out.messages) || []) dispatcher.broadcast(msg.op, msg.body);
      }
      const advanced = state.director.advance(now);
      if (advanced.phaseMessage) dispatcher.broadcast(OP.PHASE, advanced.phaseMessage);
      for (const snap of advanced.snapshots) dispatcher.broadcast(OP.SNAPSHOT, snap);
      if (advanced.result && !state.resultSent) {
        state.resultSent = true;
        dispatcher.broadcast(OP.RESULT, advanced.result);
      }
    },
  });
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
