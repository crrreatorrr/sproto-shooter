// Seat ownership, ready deadline, input checks, and the 10s stall rule.
// The outcome is this object's result. Callers do not invent a winner.
import { decodeInput, encodeInput, PvpInputError } from '../../net/inputCodec.js';
import {
  OP, hostileReason, parseJsonBody, validId, versionsMatch, CONTENT, PROTOCOL, SIM_VERSION,
} from '../../net/protocol.js';
import { hashState, snapshotOf, step, createMatch } from './sim.js';
import {
  INPUT_LIMITS, LOADOUT_HASH, READY_MS, STALL_MS, STEP_MS,
} from './rules.js';

function reject(accountId, reason, extra = {}) {
  return {
    ok: false,
    reason,
    messages: [{ op: OP.REJECT, body: { accountId, reason, ticketsMinted: 0, ...extra } }],
  };
}

function blankSeat(accountId, sessionId) {
  return {
    accountId,
    sessionId,
    ready: false,
    connected: true,
    lastInputAt: 0,
    lastSeq: 0,
    holdYaw: 0,
    holdPitch: 0,
    queue: new Map(),
    acceptedAt: [],
    tickMark: -1,
    inputsThisTick: 0,
  };
}

export function createDirector({ seed = 1, matchId = 'local' } = {}) {
  const director = {
    seed: seed >>> 0,
    matchId,
    phase: 'lobby',
    seats: [null, null],
    sim: null,
    result: null,
    liveStart: 0,
    waitDeadline: null,
    readyDeadline: null,
    phaseMessage: null,
    forceSnap: false,
  };

  function occupied() {
    return director.seats.filter(Boolean).length;
  }

  function seatIndex(accountId) {
    return director.seats.findIndex((seat) => seat && seat.accountId === accountId);
  }

  function otherAccount(index) {
    const other = director.seats[1 - index];
    return other ? other.accountId : null;
  }

  function welcome(index) {
    const seat = director.seats[index];
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
      tick: director.sim ? director.sim.tick : 0,
      opponent: otherAccount(index),
      ticketsMinted: 0,
      stakes: false,
    };
  }

  function ok(index, extra = {}) {
    return { ok: true, seat: index, messages: [{ op: OP.WELCOME, body: welcome(index) }], ...extra };
  }

  function bothReady() {
    return director.seats.length === 2
      && director.seats.every((seat) => seat && seat.ready);
  }

  function publish(phase, tick) {
    director.phaseMessage = {
      phase,
      tick,
      seed: director.seed,
      matchId: director.matchId,
      ticketsMinted: 0,
      stakes: false,
    };
  }

  function startLive(now) {
    director.sim = createMatch(director.seed);
    director.phase = 'live';
    director.liveStart = now;
    for (const seat of director.seats) {
      seat.lastInputAt = now;
      seat.holdYaw = director.sim.players[seat === director.seats[0] ? 0 : 1].yaw;
      seat.holdPitch = 0;
    }
    director.seats[0].holdYaw = director.sim.players[0].yaw;
    director.seats[1].holdYaw = director.sim.players[1].yaw;
    publish('live', 0);
    director.forceSnap = true;
  }

  function finish(outcome, winner, reason) {
    director.phase = 'done';
    director.result = {
      outcome,
      winner,
      reason,
      tick: director.sim ? director.sim.tick : 0,
      stateHash: director.sim ? hashState(director.sim) : null,
      ticketsMinted: 0,
      stakes: false,
    };
    publish('done', director.result.tick);
    director.forceSnap = true;
    return director.result;
  }

  function adoptSim() {
    return finish(director.sim.outcome, director.sim.winner, director.sim.reason);
  }

  function requireSeat(presenceUserId, sessionId) {
    if (!validId(presenceUserId) || !validId(sessionId)) return { error: reject(presenceUserId, 'malformed') };
    const index = seatIndex(presenceUserId);
    if (index < 0) return { error: reject(presenceUserId, 'wrong_sender') };
    const seat = director.seats[index];
    if (!seat.connected || seat.sessionId !== sessionId) return { error: reject(presenceUserId, 'wrong_sender', { lastSeq: seat.lastSeq, tick: director.sim ? director.sim.tick : 0 }) };
    return { index, seat };
  }

  function hello({ presenceUserId, sessionId, body, now }) {
    if (!validId(presenceUserId) || !validId(sessionId)) return reject(presenceUserId, 'malformed');
    if (!body || typeof body !== 'object') return reject(presenceUserId, 'malformed');
    const hostile = hostileReason(body);
    if (hostile) return reject(presenceUserId, hostile);
    if (body.accountId !== presenceUserId) return reject(presenceUserId, 'wrong_sender');
    if (!versionsMatch(body)) return reject(presenceUserId, 'version');
    if (director.phase === 'done') return reject(presenceUserId, 'ended');
    let index = seatIndex(presenceUserId);
    if (index < 0) {
      if (occupied() >= 2) return reject(presenceUserId, 'match_full');
      index = director.seats[0] ? 1 : 0;
      director.seats[index] = blankSeat(presenceUserId, sessionId);
      if (occupied() === 1) director.waitDeadline = now + READY_MS;
      if (occupied() === 2) director.readyDeadline = now + READY_MS;
    } else {
      director.seats[index].sessionId = sessionId;
      director.seats[index].connected = true;
    }
    return ok(index);
  }

  function ready({ presenceUserId, sessionId, now }) {
    const got = requireSeat(presenceUserId, sessionId);
    if (got.error) return got.error;
    if (director.phase === 'done') return reject(presenceUserId, 'ended');
    got.seat.ready = true;
    if (director.phase === 'lobby' && bothReady()) startLive(now);
    else publish(director.phase, director.sim ? director.sim.tick : 0);
    return ok(got.index);
  }

  function acceptPacket(seat, packet) {
    if (packet instanceof Uint8Array) return decodeInput(packet);
    return decodeInput(encodeInput(packet));
  }

  function input({ presenceUserId, sessionId, packet, now }) {
    const got = requireSeat(presenceUserId, sessionId);
    if (got.error) return got.error;
    if (director.phase !== 'live' || !director.sim) return reject(presenceUserId, 'not_live');
    let wish;
    try {
      wish = acceptPacket(got.seat, packet);
    } catch (err) {
      const reason = err instanceof PvpInputError ? err.reason : 'malformed';
      return reject(presenceUserId, reason, { lastSeq: got.seat.lastSeq, tick: director.sim.tick });
    }
    const cursor = director.sim.tick;
    if (wish.seq !== got.seat.lastSeq + 1) {
      return reject(presenceUserId, 'sequence', { lastSeq: got.seat.lastSeq, tick: cursor });
    }
    if (wish.frame < cursor - INPUT_LIMITS.pastFrames || wish.frame > cursor + INPUT_LIMITS.futureFrames || wish.frame < cursor) {
      return reject(presenceUserId, 'frame', { lastSeq: got.seat.lastSeq, tick: cursor });
    }
    const times = got.seat.acceptedAt;
    while (times.length && now - times[0] > 1000) times.shift();
    if (times.length >= INPUT_LIMITS.maxInputsPerSecond) {
      return reject(presenceUserId, 'rate', { lastSeq: got.seat.lastSeq, tick: cursor });
    }
    if (got.seat.tickMark !== cursor) {
      got.seat.tickMark = cursor;
      got.seat.inputsThisTick = 0;
    }
    if (got.seat.inputsThisTick >= INPUT_LIMITS.maxInputsPerTick) {
      return reject(presenceUserId, 'rate', { lastSeq: got.seat.lastSeq, tick: cursor });
    }
    got.seat.inputsThisTick += 1;
    times.push(now);
    got.seat.lastSeq = wish.seq;
    got.seat.lastInputAt = now;
    got.seat.holdYaw = wish.yaw;
    got.seat.holdPitch = wish.pitch;
    got.seat.queue.set(wish.frame, wish);
    return { ok: true, seat: got.index, messages: [] };
  }

  function wishFor(seat, tick) {
    if (seat.queue.has(tick)) {
      const wish = seat.queue.get(tick);
      seat.queue.delete(tick);
      return wish;
    }
    return {
      yaw: seat.holdYaw,
      pitch: seat.holdPitch,
      moveX: 0,
      moveZ: 0,
      fire: false,
      zoom: false,
      sprint: false,
      jump: false,
      dash: false,
      reload: false,
      slot: -1,
    };
  }

  function snapBody() {
    const body = snapshotOf(director.sim);
    body.matchId = director.matchId;
    body.protocol = PROTOCOL;
    body.sim = SIM_VERSION;
    body.content = CONTENT;
    body.graceMs = STALL_MS;
    body.ticketsMinted = 0;
    body.stakes = false;
    return body;
  }

  function advance(now) {
    const snapshots = [];
    if (!Number.isFinite(now)) return { snapshots, result: director.result, phaseMessage: takePhase() };
    if (director.phase === 'lobby') {
      const filled = occupied();
      if (filled < 2 && director.waitDeadline != null && now >= director.waitDeadline) finish('cancel', null, 'ready_timeout');
      else if (filled >= 2 && !bothReady() && director.readyDeadline != null && now >= director.readyDeadline) finish('cancel', null, 'ready_timeout');
      return { snapshots, result: director.result, phaseMessage: takePhase() };
    }
    if (director.phase === 'live' && director.sim && director.sim.phase !== 'done') {
      const target = Math.max(director.sim.tick, Math.floor((now - director.liveStart) / STEP_MS + 1e-9));
      const cap = director.sim.tick + 18000;
      while (director.sim.phase === 'live' && director.sim.tick < target && director.sim.tick < cap) {
        const tick = director.sim.tick;
        step(director.sim, [wishFor(director.seats[0], tick), wishFor(director.seats[1], tick)]);
        if (director.sim.tick % 3 === 0 || director.sim.phase === 'done') snapshots.push(snapBody());
      }
      if (director.sim.phase === 'done') adoptSim();
      else {
        const stalled = director.seats.map((seat) => now - seat.lastInputAt >= STALL_MS);
        if (stalled[0] && stalled[1]) finish('draw', null, 'both_stall');
        else if (stalled[0]) finish('forfeit', 1, 'stall');
        else if (stalled[1]) finish('forfeit', 0, 'stall');
      }
    }
    if (director.forceSnap && director.sim) {
      director.forceSnap = false;
      snapshots.push(snapBody());
    }
    return { snapshots, result: director.result, phaseMessage: takePhase() };
  }

  function takePhase() {
    const message = director.phaseMessage;
    director.phaseMessage = null;
    return message;
  }

  function disconnect(userId, sessionId) {
    const index = seatIndex(userId);
    if (index < 0) return;
    const seat = director.seats[index];
    if (seat.sessionId !== sessionId) return;
    seat.connected = false;
  }

  function clientResult(presenceUserId) {
    return reject(presenceUserId, 'client_result', { tick: director.sim ? director.sim.tick : 0 });
  }

  function handle(sender, op, data, now) {
    const presenceUserId = sender && sender.userId;
    const sessionId = sender && sender.sessionId;
    if (op === OP.RESULT) return clientResult(presenceUserId);
    if (op === OP.HELLO || op === OP.READY || op === OP.RESYNC) {
      const parsed = data && typeof data === 'object' && !(data instanceof Uint8Array)
        ? { ok: true, body: data }
        : parseJsonBody(data);
      if (!parsed.ok) return reject(presenceUserId, parsed.reason);
      if (op === OP.HELLO) return hello({ presenceUserId, sessionId, body: { ...parsed.body, accountId: parsed.body.accountId }, now });
      if (op === OP.READY) return ready({ presenceUserId, sessionId, now });
      const got = requireSeat(presenceUserId, sessionId);
      if (got.error) return got.error;
      director.forceSnap = true;
      return ok(got.index);
    }
    if (op === OP.INPUT) {
      const packet = data instanceof Uint8Array ? data : null;
      return input({ presenceUserId, sessionId, packet: packet || data, now });
    }
    return reject(presenceUserId, 'malformed');
  }

  return {
    get phase() { return director.phase; },
    get result() { return director.result; },
    get sim() { return director.sim; },
    seatOf: seatIndex,
    occupied,
    joinAttempt(userId) {
      if (!validId(userId)) return { accept: false, reason: 'malformed' };
      if (seatIndex(userId) >= 0) return { accept: true };
      if (director.phase === 'done') return { accept: false, reason: 'ended' };
      if (occupied() >= 2) return { accept: false, reason: 'match_full' };
      return { accept: true };
    },
    hello, ready, input, advance, disconnect, handle, clientResult,
  };
}
