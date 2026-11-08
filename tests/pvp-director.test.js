// SHOOTER-S2a: director v2 / protocol 2. Jitter buffer, late-accept-discard, hold-last, frame
// rate caps, catch-up cap, lead-in, rejoin via HELLO, PING/PONG, per-recipient messages,
// exportState/importState, and the used-input log that replayJSON v2 verifies.
import { describe, expect, it } from 'vitest';
import { createDirector, restoreDirector } from '../src/sim/pvp/director.js';
import * as pvp from '../src/sim/pvp/export.js';
import { encodeInput } from '../src/net/inputCodec.js';
import { CONTENT, OP, PROTOCOL, matchmakerProps } from '../src/net/protocol.js';
import {
  CONTENT_FINGERPRINT, HASH_EVERY_TICKS, INPUT_LIMITS, LEAD_IN_TICKS, MATCHMAKER_QUERY,
  PVP_PROTOCOL_VERSION, STALL_MS, STEP_MS,
} from '../src/sim/pvp/rules.js';
import { SOURCE, decodeUsedLog } from '../src/sim/pvp/used.js';
import { createLoopbackTable, registerFreeMatch } from '../src/net/client.js';
import './fixtures/director-golden.js';
import goldenFixture from './fixtures/director-golden.json';

const { directorGolden } = globalThis;
const { replayJSON } = pvp;

const { comment: _comment, ...DIRECTOR_GOLDEN } = goldenFixture;

function hello(id, extra = {}) {
  return { accountId: id, protocol: PROTOCOL, sim: 1, content: CONTENT, ...extra };
}

function wish(seq, frame, extra = {}) {
  return { seq, frame, yaw: 0.2, pitch: 0, moveX: 0, moveZ: 0, fire: false, slot: -1, ...extra };
}

const SESSION = { ada: 'sa', bea: 'sb' };

function boot({ now = 0, leadInTicks } = {}) {
  const director = createDirector({ seed: 3, matchId: 'm', leadInTicks });
  director.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now });
  director.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now });
  director.ready({ presenceUserId: 'ada', sessionId: 'sa', now });
  director.ready({ presenceUserId: 'bea', sessionId: 'sb', now });
  expect(director.phase).toBe('live');
  return director;
}

function send(director, who, packet, now, sessionId = SESSION[who]) {
  return director.input({ presenceUserId: who, sessionId, packet: encodeInput(packet), now });
}

/** Advance to server tick `tick` (one advance per tick, so the catch-up cap never bites). */
function stepTo(director, tick) {
  let last = null;
  while (director.sim.tick < tick) {
    last = director.advance(director.liveStart + (director.sim.tick + 1) * STEP_MS);
  }
  return last;
}

function usedTicks(director) {
  return decodeUsedLog(director.replayRecord().used);
}

describe('protocol 2 identity (SHOOTER-S2a)', () => {
  it('bumps the protocol and fingerprint, and the matchmaker pairs only on both', () => {
    expect(PVP_PROTOCOL_VERSION).toBe(2);
    expect(PROTOCOL).toBe(2);
    expect(CONTENT_FINGERPRINT).toBe('0e584d36');
    expect(OP.PING).toBe(10);
    expect(OP.PONG).toBe(11);
    const props = matchmakerProps();
    expect(props.query).toBe(MATCHMAKER_QUERY);
    expect(props.query).toBe('+properties.game:sproto-shooter +properties.mode:free +properties.protocol:2 +properties.content:0e584d36');
    expect(props.stringProperties).toMatchObject({ protocol: '2', content: '0e584d36', sim: '1' });
    expect(matchmakerProps('deadbeef').query).toContain('+properties.content:deadbeef');
  });
});

describe('live-start lead-in', () => {
  it('starts tick 0 LEAD_IN_TICKS after the last READY and announces it in PHASE', () => {
    const director = createDirector({ seed: 3, matchId: 'm' });
    director.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now: 0 });
    director.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now: 0 });
    director.ready({ presenceUserId: 'ada', sessionId: 'sa', now: 100 });
    const out = director.ready({ presenceUserId: 'bea', sessionId: 'sb', now: 100 });
    const phase = out.messages.find((m) => m.op === OP.PHASE);
    expect(phase.to).toBeNull();
    expect(phase.body).toMatchObject({ phase: 'live', tick: 0, startTick: 0, leadInTicks: LEAD_IN_TICKS, clockTick: -LEAD_IN_TICKS });
    expect(director.liveStart).toBeCloseTo(100 + LEAD_IN_TICKS * STEP_MS, 9);
    // Each seat gets the spawn snapshot right away.
    expect(out.messages.filter((m) => m.op === OP.SNAPSHOT).map((m) => m.to.userId).sort()).toEqual(['ada', 'bea']);
    // An input for frame 0 sent during the lead-in is applied at tick 0.
    expect(send(director, 'ada', wish(1, 0, { moveZ: 1 }), 150).ok).toBe(true);
    expect(director.advance(director.liveStart - 1).messages).toEqual([]);
    expect(director.sim.tick).toBe(0);
    director.advance(director.liveStart + STEP_MS);
    expect(director.sim.tick).toBe(1);
    expect(director.seatStats(0)).toMatchObject({ applied: 1, ackFrame: 0 });
    expect(usedTicks(director)[0][0]).toMatchObject({ src: SOURCE.input, mz: 127 });
  });

  it('takes the lead-in from createDirector, clamped', () => {
    expect(boot({ leadInTicks: 0 }).liveStart).toBe(0);
    expect(createDirector({ leadInTicks: 1000 }).leadInTicks).toBe(INPUT_LIMITS.maxLeadInTicks);
    expect(createDirector({ leadInTicks: -1 }).leadInTicks).toBe(LEAD_IN_TICKS);
  });
});

describe('jitter buffer', () => {
  it('queues frames cursor..cursor+8 and rejects a frame past the window', () => {
    const director = boot({ leadInTicks: 0 });
    stepTo(director, 10);
    for (let i = 0; i <= INPUT_LIMITS.futureFrames; i++) {
      const got = send(director, 'ada', wish(i + 1, 10 + i), director.liveStart + 10 * STEP_MS + i * STEP_MS);
      expect(got.ok, `frame ${10 + i}`).toBe(true);
      expect(got.late).toBeUndefined();
    }
    const far = send(director, 'ada', wish(20, 10 + INPUT_LIMITS.futureFrames + 1), director.liveStart + 10 * STEP_MS);
    expect(far.reason).toBe('frame');
    expect(far.messages[0].body).toMatchObject({ seq: 20, frame: 19, tick: 10, lastSeq: 9 });
  });

  it('accepts and discards a late frame: it consumes its seq, refreshes the stall timer and the held aim, and counts', () => {
    const director = boot({ leadInTicks: 0 });
    stepTo(director, 30);
    const at = director.liveStart + 30 * STEP_MS;
    const got = send(director, 'ada', wish(7, 12, { yaw: 1.0, moveZ: 1 }), at);
    expect(got).toMatchObject({ ok: true, late: true, messages: [] });
    expect(director.seatStats(0)).toMatchObject({ late: 1, lastSeq: 7, applied: 0 });
    expect(send(director, 'ada', wish(7, 31), at).reason).toBe('sequence');
    // The next tick has no frame: it holds the late frame's aim but not its movement.
    stepTo(director, 31);
    const used = usedTicks(director)[30][0];
    expect(used.src).not.toBe(SOURCE.input);
    expect(used.y).toBe(Math.round((1.0 / Math.PI) * 32767));
    expect(used.mz).toBe(0);
    // The snapshot tells the seat about it.
    const snap = director.advance(director.liveStart + 32 * STEP_MS).messages.find((m) => m.op === OP.SNAPSHOT && m.to.userId === 'ada');
    expect(snap.body.you).toMatchObject({ seat: 0, late: 1, lastSeq: 7 });
    // The late frame kept ada's stall timer alive: bea (silent since tick 0) forfeits alone,
    // instead of a both_stall draw.
    expect(director.advance(director.liveStart + STALL_MS).result).toMatchObject({ outcome: 'forfeit', winner: 0, reason: 'stall' });
  });

  it('allows sequence gaps', () => {
    const director = boot({ leadInTicks: 0 });
    expect(send(director, 'ada', wish(1, 0), 0).ok).toBe(true);
    expect(send(director, 'ada', wish(5, 1), 0).ok).toBe(true);
    expect(send(director, 'ada', wish(9000, 2), 0).ok).toBe(true);
    expect(send(director, 'ada', wish(8999, 3), 0).reason).toBe('sequence');
  });
});

describe('hold-last substitutes', () => {
  it('repeats move, aim and held buttons for 3 missing ticks, then goes neutral; edges never repeat', () => {
    const director = boot({ leadInTicks: 0 });
    stepTo(director, 5);
    const now = director.liveStart + 5 * STEP_MS;
    expect(send(director, 'ada', wish(1, 5, {
      yaw: -0.5, pitch: 0.25, moveX: -1, moveZ: 1, fire: true, zoom: true, sprint: true, jump: true, dash: true, reload: true, slot: 2,
    }), now).ok).toBe(true);
    stepTo(director, 11);
    const ticks = usedTicks(director).map((pair) => pair[0]);
    const real = ticks[5];
    expect(real).toMatchObject({ src: SOURCE.input, mx: -127, mz: 127, s: 2 });
    expect(real.b).toBe(0b1111111 & ~(1 << 6));
    for (const tick of [6, 7, 8]) {
      expect(ticks[tick]).toEqual({ y: real.y, p: real.p, mx: -127, mz: 127, b: 0b111, s: -1, src: SOURCE.hold });
    }
    for (const tick of [9, 10]) {
      expect(ticks[tick]).toEqual({ y: real.y, p: real.p, mx: 0, mz: 0, b: 0, s: -1, src: SOURCE.neutral });
    }
    // Ticks 0-4 had no input either: 3 held, 2 neutral, then the same after tick 5.
    expect(director.seatStats(0)).toMatchObject({ applied: 1, held: 6, neutral: 4, ackFrame: 5 });
    // Before any input, a missing tick keeps the spawn aim (null = the player's own yaw).
    expect(ticks[0]).toMatchObject({ y: null, p: null, mx: 0, mz: 0, b: 0, src: SOURCE.hold });
  });
});

describe('frame rate caps', () => {
  it('allows 6 queued frames per server clock tick, but late frames do not count toward it', () => {
    const director = boot({ leadInTicks: 0 });
    stepTo(director, 20);
    const now = director.liveStart + 20 * STEP_MS;
    let seq = 0;
    // A TCP burst: 10 late frames and 6 fresh ones arrive in one server tick. All pass.
    for (let frame = 10; frame < 26; frame++) {
      seq += 1;
      const got = send(director, 'ada', wish(seq, frame), now);
      expect(got.ok, `frame ${frame}`).toBe(true);
    }
    expect(director.seatStats(0)).toMatchObject({ late: 10, buffer: 6 });
    expect(send(director, 'ada', wish(seq + 1, 26), now).reason).toBe('rate');
    // The next server tick has room again.
    expect(send(director, 'ada', wish(seq + 2, 26), now + STEP_MS).ok).toBe(true);
  });

  it('counts every frame against a 45/s token bucket, so a burst after a quiet stall passes and spam does not', () => {
    const director = boot({ leadInTicks: 0 });
    stepTo(director, 60);
    const now = director.liveStart + 60 * STEP_MS;
    let seq = 0;
    let ok = 0;
    let rate = 0;
    for (let i = 0; i < 60; i++) {
      seq += 1;
      const got = send(director, 'ada', wish(seq, 1), now);
      if (got.ok) ok += 1;
      else if (got.reason === 'rate') rate += 1;
    }
    expect(ok).toBe(INPUT_LIMITS.maxFramesPerSecond);
    expect(rate).toBe(60 - INPUT_LIMITS.maxFramesPerSecond);
    // Refills at 45/s.
    expect(send(director, 'ada', wish(seq + 1, 1), now + 1000 / 45 + 0.01).ok).toBe(true);
    expect(send(director, 'ada', wish(seq + 2, 1), now + 1000 / 45 + 0.02).reason).toBe('rate');
  });
});

describe('catch-up cap', () => {
  it('steps at most 4 ticks per advance after a late callback', () => {
    const director = boot({ leadInTicks: 0 });
    director.advance(5000);
    expect(director.sim.tick).toBe(INPUT_LIMITS.catchUpTicks);
    director.advance(5000);
    expect(director.sim.tick).toBe(2 * INPUT_LIMITS.catchUpTicks);
    // It catches up over later callbacks and never passes the clock.
    for (let i = 0; i < 100; i++) director.advance(5000);
    expect(director.sim.tick).toBe(Math.floor(5000 / STEP_MS + 1e-9));
  });
});

describe('per-recipient messages', () => {
  it('sends REJECT only to the sender', () => {
    const director = boot();
    const out = director.handle({ userId: 'ada', sessionId: 'sa' }, OP.INPUT, encodeInput(wish(1, 99)), 0);
    expect(out.reason).toBe('frame');
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0]).toMatchObject({ op: OP.REJECT, to: { userId: 'ada', sessionId: 'sa' } });
    const stranger = director.handle({ userId: 'cy', sessionId: 'sc' }, OP.READY, '{}', 0);
    expect(stranger.messages[0].to).toEqual({ userId: 'cy', sessionId: 'sc' });
    const forged = director.handle({ userId: 'bea', sessionId: 'sb' }, OP.RESULT, '{"winner":1}', 0);
    expect(forged.messages.map((m) => m.to)).toEqual([{ userId: 'bea', sessionId: 'sb' }]);
  });

  it('sends each seat its own WELCOME with both names, and its own snapshot with ack and private state', () => {
    const director = createDirector({ seed: 3, matchId: 'm', leadInTicks: 0 });
    director.handle({ userId: 'ada', sessionId: 'sa', username: 'Ada Lovelace' }, OP.HELLO, JSON.stringify(hello('ada')), 0);
    const out = director.handle({ userId: 'bea', sessionId: 'sb', username: 'b'.repeat(50) }, OP.HELLO, JSON.stringify(hello('bea')), 0);
    const welcomes = out.messages.filter((m) => m.op === OP.WELCOME);
    expect(welcomes.map((m) => [m.to.userId, m.body.seat, m.body.opponent])).toEqual([['ada', 0, 'bea'], ['bea', 1, 'ada']]);
    expect(welcomes[0].body.names).toEqual(['Ada Lovelace', 'b'.repeat(INPUT_LIMITS.maxNameLength)]);
    director.ready({ presenceUserId: 'ada', sessionId: 'sa', now: 0 });
    director.ready({ presenceUserId: 'bea', sessionId: 'sb', now: 0 });
    send(director, 'bea', wish(1, 0, { fire: true }), 0);
    const tickOut = director.advance(STEP_MS);
    const snaps = tickOut.messages.filter((m) => m.op === OP.SNAPSHOT);
    expect(snaps.map((m) => m.to.userId)).toEqual(['ada', 'bea']);
    const bea = snaps[1].body;
    expect(bea.tick).toBe(1);
    expect(bea.you).toMatchObject({ seat: 1, ackFrame: 0, ackSeq: 1, lastSeq: 1, buffer: 0, late: 0 });
    const exact = director.sim.players[1];
    expect(bea.you.private).toMatchObject({ mag: exact.mag, fireCd: exact.fireCd, dashCd: exact.dashCd, invuln: exact.invuln });
    expect(bea.you.private.rng).toBeUndefined();
    expect(snaps[0].body.you.seat).toBe(0);
    expect(snaps[0].body.you.ackFrame).toBe(-1);
  });

  it('sends a snapshot every tick and the state hash once per second', () => {
    const director = boot({ leadInTicks: 0 });
    let hashed = 0;
    for (let tick = 1; tick <= 2 * HASH_EVERY_TICKS; tick++) {
      const snaps = director.advance(tick * STEP_MS).messages.filter((m) => m.op === OP.SNAPSHOT);
      expect(snaps).toHaveLength(2);
      if ('hash' in snaps[0].body) hashed += 1;
      expect('hash' in snaps[0].body).toBe(tick % HASH_EVERY_TICKS === 0);
    }
    expect(hashed).toBe(2);
  });

  it('sends RESULT once, to the whole match', () => {
    const director = boot({ leadInTicks: 0 });
    const out = director.advance(STALL_MS);
    const results = out.messages.filter((m) => m.op === OP.RESULT);
    expect(results).toHaveLength(1);
    expect(results[0].to).toBeNull();
    expect(results[0].body).toMatchObject({ outcome: 'draw', reason: 'both_stall', ticketsMinted: 0 });
    expect(director.advance(STALL_MS + 100).messages.filter((m) => m.op === OP.RESULT)).toEqual([]);
  });

  it('answers PING with PONG to the sender only, and caps pings', () => {
    const director = boot();
    const out = director.handle({ userId: 'ada', sessionId: 'sa' }, OP.PING, JSON.stringify({ t: 1234.5 }), 50);
    expect(out.messages).toEqual([{
      op: OP.PONG,
      body: { t: 1234.5, serverMs: 50, tick: 0, clockTick: expect.any(Number), phase: 'live' },
      to: { userId: 'ada', sessionId: 'sa' },
    }]);
    expect(director.handle({ userId: 'ada', sessionId: 'sa' }, OP.PING, '{"t":"x"}', 50).reason).toBe('malformed');
    let rate = null;
    for (let i = 0; i < INPUT_LIMITS.maxPingsPerSecond; i++) {
      rate = director.handle({ userId: 'ada', sessionId: 'sa' }, OP.PING, '{"t":1}', 60).reason;
    }
    expect(rate).toBe('rate');
    expect(director.handle({ userId: 'cy', sessionId: 'sc' }, OP.PING, '{"t":1}', 60).reason).toBe('wrong_sender');
  });
});

describe('rejoin', () => {
  it('rebinds a seat only through HELLO; RESYNC still needs the bound session', () => {
    const director = boot({ leadInTicks: 0 });
    send(director, 'bea', wish(4, 0), 0);
    stepTo(director, 30);
    director.disconnect('bea', 'sb');
    const now = director.liveStart + 30 * STEP_MS;
    // The new session cannot RESYNC or send input before HELLO.
    expect(director.handle({ userId: 'bea', sessionId: 'sb2' }, OP.RESYNC, '{}', now).reason).toBe('wrong_sender');
    expect(send(director, 'bea', wish(5, 31), now, 'sb2').reason).toBe('wrong_sender');
    const back = director.handle({ userId: 'bea', sessionId: 'sb2' }, OP.HELLO, JSON.stringify(hello('bea')), now);
    expect(back.ok).toBe(true);
    expect(back.seat).toBe(1);
    const mine = back.messages.filter((m) => m.to.sessionId === 'sb2');
    expect(mine.map((m) => m.op)).toEqual([OP.WELCOME, OP.SNAPSHOT]);
    expect(mine[0].body).toMatchObject({ seat: 1, phase: 'live', lastSeq: 4 });
    // The old session is gone; the new one plays on with the next sequence number.
    expect(send(director, 'bea', wish(5, 31), now, 'sb').reason).toBe('wrong_sender');
    expect(send(director, 'bea', wish(5, 31), now, 'sb2').ok).toBe(true);
    expect(director.handle({ userId: 'bea', sessionId: 'sb2' }, OP.RESYNC, '{}', now).ok).toBe(true);
    expect(director.occupied()).toBe(2);
  });

  it('needs both seats ready and connected to go live; a lobby drop clears ready', () => {
    const director = createDirector({ seed: 3, matchId: 'm' });
    director.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now: 0 });
    director.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now: 0 });
    director.ready({ presenceUserId: 'ada', sessionId: 'sa', now: 0 });
    director.disconnect('ada', 'sa');
    director.ready({ presenceUserId: 'bea', sessionId: 'sb', now: 0 });
    expect(director.phase).toBe('lobby');
    const back = director.hello({ presenceUserId: 'ada', sessionId: 'sa2', body: hello('ada'), now: 10 });
    expect(back.messages.find((m) => m.to.sessionId === 'sa2').body.ready).toBe(false);
    expect(director.phase).toBe('lobby');
    director.ready({ presenceUserId: 'ada', sessionId: 'sa2', now: 20 });
    expect(director.phase).toBe('live');
  });
});

describe('exportState / importState', () => {
  it('is plain JSON and refuses an unknown version', () => {
    const director = boot();
    const state = director.exportState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(state.v).toBe(2);
    expect(state.seats[0].queue).toEqual({});
    expect(() => restoreDirector({ ...state, v: 1 })).toThrow(/version/);
    expect(() => restoreDirector({ v: 2 })).toThrow(/version/);
  });

  it('a thaw/freeze after every call reproduces the same messages, used log and final hash', () => {
    const live = directorGolden(pvp, { thaw: false });
    const thawed = directorGolden(pvp, { thaw: true });
    expect(thawed).toEqual(live);
  });
});

describe('used-input log and replay v2', () => {
  it('replays the logged wishes to the same tick and hash, and refuses a tampered log', () => {
    const golden = directorGolden(pvp, { record: true });
    const record = golden.record;
    expect(record.v).toBe(2);
    expect(record.used.join('').length).toBe(record.expect.tick * 32);
    const ok = JSON.parse(replayJSON(JSON.stringify(record)));
    expect(ok).toMatchObject({ ok: true, verified: true, mismatch: [], tick: record.expect.tick, stateHash: record.expect.stateHash, ticketsMinted: 0 });
    // Flip one movement byte of one seat on one tick.
    const chunks = record.used.slice();
    const at = 16 * 32 + 8;
    chunks[0] = chunks[0].slice(0, at) + (chunks[0].slice(at, at + 2) === '7f' ? '00' : '7f') + chunks[0].slice(at + 2);
    const bad = JSON.parse(replayJSON(JSON.stringify({ ...record, used: chunks })));
    expect(bad.verified).toBe(false);
    expect(bad.mismatch).toContain('stateHash');
    const short = JSON.parse(replayJSON(JSON.stringify({ ...record, used: record.used.slice(0, 2) })));
    expect(short.verified).toBe(false);
    expect(short.mismatch).toEqual(expect.arrayContaining(['tick', 'stateHash']));
    expect(JSON.parse(replayJSON(JSON.stringify({ ...record, used: ['zz'] })))).toMatchObject({ ok: false, reason: 'malformed', verified: false });
    expect(JSON.parse(replayJSON(JSON.stringify({ ...record, expect: null }))).verified).toBe(false);
  });

  it('logs every applied wish, substitutes included, one per tick per seat', () => {
    const director = boot({ leadInTicks: 0 });
    send(director, 'ada', wish(1, 0, { moveZ: 1 }), 0);
    stepTo(director, 8);
    const ticks = usedTicks(director);
    expect(ticks).toHaveLength(8);
    expect(ticks.map((pair) => pair[0].src)).toEqual([0, 1, 1, 1, 2, 2, 2, 2]);
    expect(ticks.map((pair) => pair[1].src)).toEqual([1, 1, 1, 2, 2, 2, 2, 2]);
  });
});

describe('director golden (node, in source)', () => {
  it('ends the scripted session at the pinned tick and hash', () => {
    const golden = directorGolden(pvp, {});
    expect(golden).toMatchObject(DIRECTOR_GOLDEN);
  });
});

describe('loopback routing', () => {
  it('delivers per-recipient messages to that session only', () => {
    const director = createDirector({ seed: 4, matchId: 'loop' });
    const table = createLoopbackTable(director, () => 0);
    const got = { sa: [], sb: [] };
    const a = table.open('ada', 'sa');
    const b = table.open('bea', 'sb');
    a.onMessage((m) => got.sa.push(m.opCode));
    b.onMessage((m) => got.sb.push(m.opCode));
    a.send(OP.HELLO, hello('ada'));
    a.send(OP.INPUT, encodeInput(wish(1, 0)));
    expect(got.sa).toEqual([OP.WELCOME, OP.REJECT]);
    expect(got.sb).toEqual([]);
  });
});

describe('mock match handler', () => {
  function drive(freeze) {
    let handler = null;
    registerFreeMatch({ registerMatch(_name, h) { handler = h; } });
    let now = 0;
    const { state, label } = handler.init({ seed: 9, clock: () => now, freeze });
    const sent = [];
    const dispatcher = { broadcast(op, body, to) { sent.push([op, to ? to[0].sessionId : '*', JSON.stringify(body)]); } };
    const msg = (userId, opCode, data) => ({ sender: { userId, sessionId: `${userId}-1` }, opCode, data });
    for (const id of ['ada', 'bea']) expect(handler.joinAttempt(state, { userId: id }).accept).toBe(true);
    handler.loop(state, [msg('ada', OP.HELLO, JSON.stringify(hello('ada'))), msg('bea', OP.HELLO, JSON.stringify(hello('bea')))], dispatcher);
    handler.loop(state, [msg('ada', OP.READY, '{}'), msg('bea', OP.READY, '{}')], dispatcher);
    for (let k = 1; k < 60; k++) {
      now = k * STEP_MS;
      const frame = k - LEAD_IN_TICKS + 2;
      const inputs = frame >= 0 ? [
        msg('ada', OP.INPUT, encodeInput(wish(k, frame, { moveZ: 1 }))),
        msg('bea', OP.INPUT, encodeInput(wish(k, frame, { moveX: -1, fire: k % 2 === 0 }))),
      ] : [];
      if (k === 30) handler.leave(state, [{ userId: 'bea', sessionId: 'bea-1' }]);
      handler.loop(state, k > 30 && k < 40 ? inputs.slice(0, 1) : inputs, dispatcher);
    }
    return { sent, label: JSON.parse(label), frozen: state.frozen };
  }

  it('produces the same messages when the director is frozen to JSON between callbacks', () => {
    const live = drive(false);
    const frozen = drive(true);
    expect(frozen.frozen).toMatchObject({ v: 2, phase: 'live' });
    expect(live.frozen).toBeNull();
    expect(frozen.sent).toEqual(live.sent);
    expect(live.sent.length).toBeGreaterThan(90);
    expect(live.label).toEqual({ kind: 'sproto_shooter_free', game: 'sproto-shooter', mode: 'free', protocol: 2, content: '0e584d36', stake: 0 });
  });
});
