// Director v2 (protocol 2): seat ownership, ready deadline, live-start lead-in, the input jitter
// buffer, hold-last substitutes, the used-input log and the 10 s stall rule.
// The outcome is this object's result. Callers do not invent a winner.
//
// Every output is a message { op, body, to }. `to` is null (send to the whole match) or the
// presence { userId, sessionId } it is for: per-recipient snapshots, PONG, REJECT and WELCOME go
// to one presence. Callers send exactly `messages`; RESULT appears there once.
//
// All state is plain JSON (no Map, no closures over state), so a host can freeze it with
// exportState() after a callback and thaw it with importState() before the next one.
import { decodeInput, encodeInput, PvpInputError } from '../../net/inputCodec.js';
import {
  OP, hostileReason, parseJsonBody, validId, versionsMatch, CONTENT, PROTOCOL, SIM_VERSION,
} from '../../net/protocol.js';
import { createMatch, hashState, step } from './sim.js';
import {
  HASH_EVERY_TICKS, INPUT_LIMITS, LEAD_IN_TICKS, LOADOUT_HASH, READY_MS, STALL_MS, STEP_MS,
} from './rules.js';
import {
  HELD_MASK, SOURCE, appendUsedTick, neutralUsed, usedOf, wishOfUsed,
} from './used.js';

export const DIRECTOR_STATE_VERSION = 2;

// Fields every snapshot already carries in `players`, and the combat RNG, which stays secret.
const PRIVATE_SKIP = new Set([
  'rng', 'seat', 'x', 'y', 'z', 'yaw', 'pitch', 'vx', 'vz', 'hp', 'shield', 'alive', 'slot',
]);

function presence(userId, sessionId) {
  return { userId: typeof userId === 'string' ? userId : '', sessionId: typeof sessionId === 'string' ? sessionId : '' };
}

function reject(to, reason, extra = {}) {
  return {
    ok: false,
    reason,
    messages: [{ op: OP.REJECT, body: { accountId: to.userId, reason, ticketsMinted: 0, ...extra }, to }],
  };
}

function cleanName(name, fallback) {
  if (typeof name !== 'string' || !name) return fallback;
  return name.slice(0, INPUT_LIMITS.maxNameLength);
}

function clampLeadIn(value) {
  if (!Number.isInteger(value) || value < 0) return LEAD_IN_TICKS;
  return Math.min(INPUT_LIMITS.maxLeadInTicks, value);
}

function blankSeat(accountId, sessionId, name) {
  return {
    accountId,
    sessionId,
    name,
    ready: false,
    connected: true,
    lastInputAt: 0,
    lastSeq: 0,
    queue: {},
    hold: neutralUsed(null, null, SOURCE.hold),
    miss: 0,
    tokens: INPUT_LIMITS.maxFramesPerSecond,
    tokensAt: 0,
    cursorMark: null,
    framesThisCursor: 0,
    pingAt: 0,
    pings: 0,
    ackFrame: -1,
    ackSeq: 0,
    applied: 0,
    held: 0,
    neutral: 0,
    late: 0,
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export function createDirector({ seed = 1, matchId = 'local', leadInTicks = LEAD_IN_TICKS } = {}) {
  let director = {
    v: DIRECTOR_STATE_VERSION,
    seed: seed >>> 0,
    matchId: String(matchId),
    leadInTicks: clampLeadIn(leadInTicks),
    phase: 'lobby',
    seats: [null, null],
    sim: null,
    result: null,
    resultSent: false,
    liveStart: 0,
    waitDeadline: null,
    readyDeadline: null,
    log: [],
  };

  function occupied() {
    return director.seats.filter(Boolean).length;
  }

  function seatIndex(accountId) {
    return director.seats.findIndex((seat) => seat && seat.accountId === accountId);
  }

  function seatTo(seat) {
    return presence(seat.accountId, seat.sessionId);
  }

  function cursor() {
    return director.sim ? director.sim.tick : 0;
  }

  /** The server clock in ticks: negative during the lead-in, fractional between ticks. */
  function clockTick(now) {
    if (director.phase !== 'live' && director.phase !== 'done') return 0;
    if (!director.sim) return 0;
    return round3((now - director.liveStart) / STEP_MS);
  }

  function welcome(index) {
    const seat = director.seats[index];
    const other = director.seats[1 - index];
    return {
      accountId: seat.accountId,
      seat: index,
      matchId: director.matchId,
      protocol: PROTOCOL,
      sim: SIM_VERSION,
      content: CONTENT,
      seed: director.seed,
      loadoutHash: LOADOUT_HASH,
      phase: director.phase,
      tick: cursor(),
      ready: seat.ready,
      lastSeq: seat.lastSeq,
      leadInTicks: director.leadInTicks,
      opponent: other ? other.accountId : null,
      names: director.seats.map((s) => (s ? s.name : null)),
      ticketsMinted: 0,
      stakes: false,
    };
  }

  function welcomeTo(index) {
    const seat = director.seats[index];
    return { op: OP.WELCOME, body: welcome(index), to: seatTo(seat) };
  }

  function welcomeAll() {
    const out = [];
    director.seats.forEach((seat, index) => { if (seat && seat.connected) out.push(welcomeTo(index)); });
    return out;
  }

  function bothReady() {
    return director.seats.length === 2
      && director.seats.every((seat) => seat && seat.ready && seat.connected);
  }

  function phaseBody(phase, now) {
    return {
      phase,
      tick: cursor(),
      clockTick: clockTick(now),
      startTick: 0,
      leadInTicks: director.leadInTicks,
      seed: director.seed,
      matchId: director.matchId,
      ticketsMinted: 0,
      stakes: false,
    };
  }

  function bufferDepth(seat) {
    return Object.keys(seat.queue).length;
  }

  function privateOf(p) {
    const out = {};
    for (const key of Object.keys(p)) {
      if (PRIVATE_SKIP.has(key)) continue;
      const value = p[key];
      out[key] = Array.isArray(value) ? value.slice() : value;
    }
    return out;
  }

  function snapshotFor(index, now) {
    const sim = director.sim;
    const seat = director.seats[index];
    const body = {
      tick: sim.tick,
      clockTick: clockTick(now),
      phase: sim.phase === 'done' ? 'done' : director.phase,
      outcome: director.result ? director.result.outcome : sim.outcome,
      winner: director.result ? director.result.winner : sim.winner,
      reason: director.result ? director.result.reason : sim.reason,
      players: sim.players.map((p) => ({
        seat: p.seat,
        x: p.x, y: p.y, z: p.z,
        yaw: p.yaw, pitch: p.pitch,
        vx: p.vx, vz: p.vz,
        hp: p.hp, shield: p.shield,
        alive: p.alive,
        slot: p.slot,
      })),
      you: {
        seat: index,
        ackFrame: seat.ackFrame,
        ackSeq: seat.ackSeq,
        lastSeq: seat.lastSeq,
        buffer: bufferDepth(seat),
        late: seat.late,
        held: seat.held,
        neutral: seat.neutral,
        // The rest of this seat's exact sim state: players[seat] plus these fields.
        private: privateOf(sim.players[index]),
      },
      ticketsMinted: 0,
    };
    if (sim.tick % HASH_EVERY_TICKS === 0 || director.phase === 'done' || sim.phase === 'done') {
      body.hash = hashState(sim);
    }
    return { op: OP.SNAPSHOT, body, to: seatTo(seat) };
  }

  function snapshotsAll(now) {
    const out = [];
    if (!director.sim) return out;
    director.seats.forEach((seat, index) => { if (seat && seat.connected) out.push(snapshotFor(index, now)); });
    return out;
  }

  function startLive(now) {
    director.sim = createMatch(director.seed);
    director.phase = 'live';
    director.liveStart = now + director.leadInTicks * STEP_MS;
    for (const seat of director.seats) {
      seat.lastInputAt = director.liveStart;
      seat.queue = {};
      seat.hold = neutralUsed(null, null, SOURCE.hold);
      seat.miss = 0;
      seat.tokens = INPUT_LIMITS.maxFramesPerSecond;
      seat.tokensAt = now;
    }
    return [{ op: OP.PHASE, body: phaseBody('live', now), to: null }, ...snapshotsAll(now)];
  }

  function finish(outcome, winner, reason, now) {
    director.phase = 'done';
    director.result = {
      outcome,
      winner,
      reason,
      tick: cursor(),
      stateHash: director.sim ? hashState(director.sim) : null,
      ticketsMinted: 0,
      stakes: false,
    };
    const out = [...snapshotsAll(now), { op: OP.PHASE, body: phaseBody('done', now), to: null }];
    if (!director.resultSent) {
      director.resultSent = true;
      out.push({ op: OP.RESULT, body: { ...director.result }, to: null });
    }
    return out;
  }

  function requireSeat(from) {
    if (!validId(from.userId) || !validId(from.sessionId)) return { error: reject(from, 'malformed') };
    const index = seatIndex(from.userId);
    if (index < 0) return { error: reject(from, 'wrong_sender') };
    const seat = director.seats[index];
    if (!seat.connected || seat.sessionId !== from.sessionId) {
      return { error: reject(from, 'wrong_sender', { lastSeq: seat.lastSeq, tick: cursor() }) };
    }
    return { index, seat };
  }

  /**
   * HELLO seats an account, or rebinds its seat to a new session (the only way a reconnect on a
   * new session id gets the seat back). The answer is a WELCOME for every connected seat, and a
   * snapshot for the sender once the match is live.
   */
  function hello({ presenceUserId, sessionId, body, now, name }) {
    const from = presence(presenceUserId, sessionId);
    if (!validId(presenceUserId) || !validId(sessionId)) return reject(from, 'malformed');
    if (!body || typeof body !== 'object') return reject(from, 'malformed');
    const hostile = hostileReason(body);
    if (hostile) return reject(from, hostile);
    if (body.accountId !== presenceUserId) return reject(from, 'wrong_sender');
    if (!versionsMatch(body)) return reject(from, 'version');
    if (director.phase === 'done') return reject(from, 'ended');
    let index = seatIndex(presenceUserId);
    if (index < 0) {
      if (occupied() >= 2) return reject(from, 'match_full');
      index = director.seats[0] ? 1 : 0;
      director.seats[index] = blankSeat(presenceUserId, sessionId, cleanName(name, presenceUserId));
      if (occupied() === 1) director.waitDeadline = now + READY_MS;
      if (occupied() === 2) director.readyDeadline = now + READY_MS;
    } else {
      const seat = director.seats[index];
      seat.sessionId = sessionId;
      seat.connected = true;
      if (typeof name === 'string' && name) seat.name = cleanName(name, seat.name);
    }
    const messages = welcomeAll();
    if (director.phase === 'live' && director.sim) messages.push(snapshotFor(index, now));
    return { ok: true, seat: index, messages };
  }

  function ready({ presenceUserId, sessionId, now }) {
    const got = requireSeat(presence(presenceUserId, sessionId));
    if (got.error) return got.error;
    if (director.phase === 'done') return reject(presence(presenceUserId, sessionId), 'ended');
    got.seat.ready = true;
    const messages = [welcomeTo(got.index)];
    if (director.phase === 'lobby' && bothReady()) {
      messages.push(...startLive(now));
      // The other seat's welcome still says lobby; the PHASE above moves it.
    }
    return { ok: true, seat: got.index, messages };
  }

  function refill(seat, now) {
    const dt = Math.max(0, now - seat.tokensAt);
    seat.tokens = Math.min(INPUT_LIMITS.maxFramesPerSecond, seat.tokens + (dt * INPUT_LIMITS.maxFramesPerSecond) / 1000);
    seat.tokensAt = Math.max(seat.tokensAt, now);
  }

  function decodePacket(packet) {
    if (packet instanceof Uint8Array) return decodeInput(packet);
    return decodeInput(encodeInput(packet));
  }

  /**
   * One INPUT frame. In the window it is queued for its tick. Below the cursor it is late: it is
   * accepted and discarded, consuming its seq and refreshing the stall timer and held aim, so a
   * TCP burst never turns into a reject storm.
   */
  function input({ presenceUserId, sessionId, packet, now }) {
    const from = presence(presenceUserId, sessionId);
    const got = requireSeat(from);
    if (got.error) return got.error;
    const seat = got.seat;
    if (director.phase !== 'live' || !director.sim) return reject(from, 'not_live');
    let wish;
    try {
      wish = decodePacket(packet);
    } catch (err) {
      const reason = err instanceof PvpInputError ? err.reason : 'malformed';
      return reject(from, reason, { lastSeq: seat.lastSeq, tick: cursor() });
    }
    const tick = cursor();
    const extra = { lastSeq: seat.lastSeq, tick, seq: wish.seq, frame: wish.frame };
    if (wish.seq <= seat.lastSeq) return reject(from, 'sequence', extra);
    if (wish.frame > tick + INPUT_LIMITS.futureFrames) return reject(from, 'frame', extra);
    refill(seat, now);
    if (seat.tokens < 1) return reject(from, 'rate', extra);
    const late = wish.frame < tick;
    if (!late) {
      const mark = Math.floor((now - director.liveStart) / STEP_MS + 1e-9);
      if (seat.cursorMark !== mark) {
        seat.cursorMark = mark;
        seat.framesThisCursor = 0;
      }
      if (seat.framesThisCursor >= INPUT_LIMITS.maxFramesPerCursor) return reject(from, 'rate', extra);
      seat.framesThisCursor += 1;
    }
    seat.tokens -= 1;
    seat.lastSeq = wish.seq;
    seat.lastInputAt = Math.max(now, seat.lastInputAt);
    const used = usedOf(wish, SOURCE.input);
    if (late) {
      seat.late += 1;
      seat.hold.y = used.y;
      seat.hold.p = used.p;
      return { ok: true, seat: got.index, late: true, messages: [] };
    }
    seat.queue[String(wish.frame)] = { u: used, seq: wish.seq };
    return { ok: true, seat: got.index, messages: [] };
  }

  function ping({ presenceUserId, sessionId, body, now }) {
    const from = presence(presenceUserId, sessionId);
    const got = requireSeat(from);
    if (got.error) return got.error;
    const seat = got.seat;
    if (!body || typeof body.t !== 'number' || !Number.isFinite(body.t)) return reject(from, 'malformed');
    if (now - seat.pingAt >= 1000) {
      seat.pingAt = now;
      seat.pings = 0;
    }
    if (seat.pings >= INPUT_LIMITS.maxPingsPerSecond) return reject(from, 'rate');
    seat.pings += 1;
    return {
      ok: true,
      seat: got.index,
      messages: [{
        op: OP.PONG,
        body: { t: body.t, serverMs: now, tick: cursor(), clockTick: clockTick(now), phase: director.phase },
        to: from,
      }],
    };
  }

  /** The wish this seat uses on `tick`: its queued frame, else the held wish, else neutral. */
  function takeWish(seat, tick) {
    const key = String(tick);
    const entry = seat.queue[key];
    if (entry) {
      delete seat.queue[key];
      seat.miss = 0;
      seat.ackFrame = tick;
      seat.ackSeq = entry.seq;
      seat.applied += 1;
      const u = entry.u;
      seat.hold = { y: u.y, p: u.p, mx: u.mx, mz: u.mz, b: u.b & HELD_MASK, s: -1, src: SOURCE.hold };
      return u;
    }
    seat.miss += 1;
    if (seat.miss <= INPUT_LIMITS.holdTicks) {
      seat.held += 1;
      return { ...seat.hold, src: SOURCE.hold };
    }
    seat.neutral += 1;
    return neutralUsed(seat.hold.y, seat.hold.p, SOURCE.neutral);
  }

  function dropStale(seat, tick) {
    for (const key of Object.keys(seat.queue)) if (Number(key) < tick) delete seat.queue[key];
  }

  function advance(now) {
    const messages = [];
    if (!Number.isFinite(now)) return { messages, result: director.result };
    if (director.phase === 'lobby') {
      const filled = occupied();
      if (filled < 2 && director.waitDeadline != null && now >= director.waitDeadline) {
        messages.push(...finish('cancel', null, 'ready_timeout', now));
      } else if (filled >= 2 && !bothReady() && director.readyDeadline != null && now >= director.readyDeadline) {
        messages.push(...finish('cancel', null, 'ready_timeout', now));
      }
      return { messages, result: director.result };
    }
    if (director.phase === 'live' && director.sim && director.sim.phase !== 'done') {
      const sim = director.sim;
      const target = Math.floor((now - director.liveStart) / STEP_MS + 1e-9);
      const cap = sim.tick + INPUT_LIMITS.catchUpTicks;
      let stepped = 0;
      while (sim.phase === 'live' && sim.tick < target && sim.tick < cap) {
        const tick = sim.tick;
        const pair = [takeWish(director.seats[0], tick), takeWish(director.seats[1], tick)];
        appendUsedTick(director.log, pair);
        step(sim, [wishOfUsed(pair[0]), wishOfUsed(pair[1])]);
        for (const seat of director.seats) dropStale(seat, sim.tick);
        stepped += 1;
      }
      if (sim.phase === 'done') {
        messages.push(...finish(sim.outcome, sim.winner, sim.reason, now));
      } else {
        const stalled = director.seats.map((seat) => now - seat.lastInputAt >= STALL_MS);
        if (stalled[0] && stalled[1]) messages.push(...finish('draw', null, 'both_stall', now));
        else if (stalled[0]) messages.push(...finish('forfeit', 1, 'stall', now));
        else if (stalled[1]) messages.push(...finish('forfeit', 0, 'stall', now));
        else if (stepped > 0) messages.push(...snapshotsAll(now));
      }
    }
    return { messages, result: director.result };
  }

  function disconnect(userId, sessionId) {
    const index = seatIndex(userId);
    if (index < 0) return;
    const seat = director.seats[index];
    if (seat.sessionId !== sessionId) return;
    seat.connected = false;
    if (director.phase === 'lobby') seat.ready = false;
  }

  function clientResult(from) {
    return reject(from, 'client_result', { tick: cursor() });
  }

  function handle(sender, op, data, now) {
    const presenceUserId = sender && sender.userId;
    const sessionId = sender && sender.sessionId;
    const from = presence(presenceUserId, sessionId);
    if (op === OP.RESULT) return clientResult(from);
    if (op === OP.HELLO || op === OP.READY || op === OP.RESYNC || op === OP.PING) {
      const parsed = data && typeof data === 'object' && !(data instanceof Uint8Array)
        ? { ok: true, body: data }
        : parseJsonBody(data);
      if (!parsed.ok) return reject(from, parsed.reason);
      if (op === OP.HELLO) {
        return hello({ presenceUserId, sessionId, body: parsed.body, now, name: sender && sender.username });
      }
      if (op === OP.READY) return ready({ presenceUserId, sessionId, now });
      if (op === OP.PING) return ping({ presenceUserId, sessionId, body: parsed.body, now });
      // RESYNC only serves the session bound to the seat. A new session sends HELLO first.
      const got = requireSeat(from);
      if (got.error) return got.error;
      const messages = [welcomeTo(got.index)];
      if (director.sim) messages.push(snapshotFor(got.index, now));
      return { ok: true, seat: got.index, messages };
    }
    if (op === OP.INPUT) return input({ presenceUserId, sessionId, packet: data, now });
    return reject(from, 'malformed');
  }

  /** Plain-JSON copy of the whole director. Import it into a fresh createDirector(). */
  function exportState() {
    return JSON.parse(JSON.stringify(director));
  }

  function importState(state) {
    const copy = typeof state === 'string' ? JSON.parse(state) : JSON.parse(JSON.stringify(state));
    if (!copy || copy.v !== DIRECTOR_STATE_VERSION || !Array.isArray(copy.seats) || !Array.isArray(copy.log)) {
      throw new Error('director state: unsupported version');
    }
    director = copy;
  }

  /**
   * Everything replayJSON v2 needs to re-run the match and check it: the seed, the used-input
   * log and the expected end state.
   */
  function replayRecord() {
    const sim = director.sim;
    return {
      v: 2,
      seed: director.seed,
      matchId: director.matchId,
      protocol: PROTOCOL,
      sim: SIM_VERSION,
      content: CONTENT,
      used: director.log.slice(),
      expect: sim ? {
        tick: sim.tick,
        stateHash: hashState(sim),
        outcome: sim.outcome,
        winner: sim.winner,
        reason: sim.reason,
      } : null,
      result: director.result ? { ...director.result } : null,
      ticketsMinted: 0,
    };
  }

  function seatStats(index) {
    const seat = director.seats[index];
    if (!seat) return null;
    return {
      accountId: seat.accountId,
      connected: seat.connected,
      lastSeq: seat.lastSeq,
      ackFrame: seat.ackFrame,
      buffer: bufferDepth(seat),
      applied: seat.applied,
      held: seat.held,
      neutral: seat.neutral,
      late: seat.late,
    };
  }

  return {
    get phase() { return director.phase; },
    get result() { return director.result; },
    get sim() { return director.sim; },
    get liveStart() { return director.liveStart; },
    get leadInTicks() { return director.leadInTicks; },
    seatOf: seatIndex,
    occupied,
    joinAttempt(userId) {
      if (!validId(userId)) return { accept: false, reason: 'malformed' };
      if (seatIndex(userId) >= 0) return { accept: true };
      if (director.phase === 'done') return { accept: false, reason: 'ended' };
      if (occupied() >= 2) return { accept: false, reason: 'match_full' };
      return { accept: true };
    },
    hello, ready, input, ping, advance, disconnect, handle,
    clientResult(userId, sessionId) { return clientResult(presence(userId, sessionId)); },
    exportState, importState, replayRecord, seatStats,
  };
}

/** Thaw a director from exportState(). */
export function restoreDirector(state) {
  const director = createDirector();
  director.importState(state);
  return director;
}
