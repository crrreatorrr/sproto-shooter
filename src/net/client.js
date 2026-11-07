// Arena client. Snapshots are interpolated. The server result is the only outcome.
import { createMockRealtimeServer } from '@metaverse/hub-sdk';
import { decodeInput, encodeInput, wishFromCommand } from './inputCodec.js';
import {
  CONTENT, FREE_MATCH_NAME, OP, PROTOCOL, SIM_VERSION, matchmakerProps,
} from './protocol.js';
import { createDirector } from '../sim/pvp/director.js';
import { STALL_MS } from '../sim/pvp/rules.js';

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function sampleSnapshots(snaps, delay = 3) {
  if (!snaps || snaps.length === 0) return null;
  const latest = snaps[snaps.length - 1];
  if (!latest.players) return latest;
  const target = latest.tick - delay;
  let left = snaps[0];
  let right = latest;
  for (let i = 0; i < snaps.length - 1; i++) {
    if (snaps[i].tick <= target && snaps[i + 1].tick >= target) {
      left = snaps[i];
      right = snaps[i + 1];
      break;
    }
  }
  const span = right.tick - left.tick;
  const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (target - left.tick) / span));
  return {
    tick: target,
    phase: latest.phase,
    outcome: latest.outcome,
    winner: latest.winner,
    reason: latest.reason,
    graceMs: latest.graceMs,
    players: left.players.map((p, i) => {
      const q = right.players[i];
      return {
        ...q,
        x: p.x + (q.x - p.x) * t,
        y: p.y + (q.y - p.y) * t,
        z: p.z + (q.z - p.z) * t,
        yaw: lerpAngle(p.yaw, q.yaw, t),
        pitch: p.pitch + (q.pitch - p.pitch) * t,
      };
    }),
  };
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

export function createPvpClient({ accountId, match, onChange }) {
  const snaps = [];
  let seq = 0;
  let nextFrame = 0;
  let sentFor = -1;
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

  function changed() { if (onChange) onChange(); }

  function send(op, data) {
    if (!match || !match.send) return;
    match.send(op, data);
  }

  function onWelcome(body) {
    if (!body || body.accountId !== accountId) {
      if (body && body.accountId) opponent = body.accountId;
      changed();
      return;
    }
    seat = body.seat;
    phase = body.phase || phase;
    if (Number.isInteger(body.tick)) nextFrame = body.tick;
    opponent = body.opponent || opponent;
    link = 'live';
    rejectReason = null;
    changed();
  }

  function onSnapshot(body) {
    if (!body || !body.players) return;
    snaps.push(body);
    if (snaps.length > 12) snaps.shift();
    if (Number.isInteger(body.tick)) nextFrame = body.tick;
    if (body.phase) phase = body.phase;
    if (body.outcome && body.phase === 'done' && !result) {
      result = {
        outcome: body.outcome,
        winner: body.winner,
        reason: body.reason,
        tick: body.tick,
        ticketsMinted: 0,
      };
    }
    changed();
  }

  function onResult(body) {
    if (!body || seenResults.has(body.reason + ':' + body.tick + ':' + body.outcome)) return;
    seenResults.add(body.reason + ':' + body.tick + ':' + body.outcome);
    result = body;
    phase = 'done';
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
        phase = body.phase || phase;
        if (Number.isInteger(body.tick)) nextFrame = body.tick;
      }
      changed();
    } else if (msg.opCode === OP.SNAPSHOT) onSnapshot(body);
    else if (msg.opCode === OP.RESULT) onResult(body);
    else if (msg.opCode === OP.REJECT && body && (body.accountId === accountId || body.accountId == null)) {
      rejectReason = body.reason;
      if (Number.isInteger(body.lastSeq)) seq = body.lastSeq;
      if (Number.isInteger(body.tick)) nextFrame = body.tick;
      sentFor = -1;
      changed();
    }
  }

  if (match && match.onMessage) match.onMessage(onPacket);
  if (match && match.onClose) match.onClose(() => {
    link = 'reconnecting';
    reconnectAt = nowMs();
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

  send(OP.HELLO, {
    accountId,
    protocol: PROTOCOL,
    sim: SIM_VERSION,
    content: CONTENT,
  });

  function submit(wish) {
    if (phase !== 'live' || result) return false;
    if (sentFor === nextFrame) return false;
    seq += 1;
    const packet = encodeInput({ ...wish, seq, frame: nextFrame, yaw: wish.yaw ?? 0, pitch: wish.pitch ?? 0 });
    if (Number.isInteger(wish.slot) && wish.slot >= 0) slotNow = wish.slot;
    sentFor = nextFrame;
    send(OP.INPUT, packet);
    return true;
  }

  return {
    accountId,
    get seat() { return seat; },
    get phase() { return phase; },
    get link() { return link; },
    get result() { return result; },
    get rejectReason() { return rejectReason; },
    setHoldReconnect(value) { holdReconnect = !!value; },
    ready() {
      readied = true;
      send(OP.READY, { accountId });
    },
    submit,
    submitCommand(cmd) {
      return submit(wishFromCommand(cmd, seq + 1, nextFrame, slotNow));
    },
    sample() { return sampleSnapshots(snaps, 3); },
    viewState(now = nowMs()) {
      const sample = sampleSnapshots(snaps, 3) || snaps[snaps.length - 1] || null;
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
        sample,
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
