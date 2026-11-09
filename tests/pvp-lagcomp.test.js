// SHOOTER-S2b: sim 2. History ring and viewTick rewind (with the director's per-seat clamp),
// alive/invuln rules, same-tick trades, the split seed (sha256 commit at start, reveal in
// RESULT), crits off in PvP, replay v2 with the rewind, the 18-byte input and the client side
// (view stamps, PING echoes, server-confirmed hit events, commit check).
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/core/sha256.js';
import { yawTo } from '../src/core/math.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { TUNING } from '../src/data/tuning.js';
import {
  clampView, combatCommitOf, createDirector, rewindCapFor,
} from '../src/sim/pvp/director.js';
import * as pvp from '../src/sim/pvp/export.js';
import {
  createMatch, hashState, historyAt, rewoundTarget, step, traceShots, weaponTick, normalizeWish,
} from '../src/sim/pvp/sim.js';
import {
  DT, INPUT_LIMITS, LOADOUT, PVP_SIM_VERSION, REWIND, STEP_MS,
} from '../src/sim/pvp/rules.js';
import { SOURCE, decodeUsedLog } from '../src/sim/pvp/used.js';
import { decodeInput, encodeInput } from '../src/net/inputCodec.js';
import { CONTENT, OP, PROTOCOL, SIM_VERSION } from '../src/net/protocol.js';
import { createLoopbackTable, createPvpClient, viewStamp } from '../src/net/client.js';

const { replayJSON } = pvp;
const H = REWIND.historyTicks;
const SEED = '00112233445566778899aabbccddeeff';

function hello(id) {
  return { accountId: id, protocol: PROTOCOL, sim: SIM_VERSION, content: CONTENT };
}

function boot({ combatSeed = SEED, spawnSeed = 3 } = {}) {
  const director = createDirector({ spawnSeed, combatSeed, matchId: 'm', leadInTicks: 0 });
  const out = [];
  const keep = (res) => { out.push(...((res && res.messages) || [])); return res; };
  keep(director.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now: 0 }));
  keep(director.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now: 0 }));
  keep(director.ready({ presenceUserId: 'ada', sessionId: 'sa', now: 0 }));
  keep(director.ready({ presenceUserId: 'bea', sessionId: 'sb', now: 0 }));
  expect(director.phase).toBe('live');
  return { director, out, keep };
}

function send(director, who, packet, now) {
  return director.input({ presenceUserId: who, sessionId: who === 'ada' ? 'sa' : 'sb', packet: encodeInput(packet), now });
}

function stepTo(director, tick, keep = null) {
  while (director.sim.tick < tick) {
    const res = director.advance(director.liveStart + (director.sim.tick + 1) * STEP_MS);
    if (keep) keep(res);
  }
}

const idle = (p) => ({ yaw: p.yaw, pitch: 0, moveX: 0, moveZ: 0, fire: false, slot: -1 });

/** A sniper shot (zoomed: zero spread) from `shooter` at a point, with a rewind claim. */
function sniperAt(state, shooter, point, extra = {}) {
  const p = state.players[shooter];
  return { yaw: yawTo(p, point), pitch: 0, moveX: 0, moveZ: 0, fire: true, zoom: true, slot: -1, ...extra };
}

/** A match with both seats holding the sniper (swap done), the target standing still. */
function sniperMatch() {
  const state = createMatch(90, 5);
  const swap = (p) => ({ ...idle(p), slot: 2 });
  step(state, [swap(state.players[0]), swap(state.players[1])]);
  while (state.players[0].swapT > 0) step(state, [idle(state.players[0]), idle(state.players[1])]);
  return state;
}

describe('sha256 (pure JS, for the seed commitment)', () => {
  it('matches the FIPS 180-4 vectors and node:crypto', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))
      .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    for (const text of ['a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000), SEED, 'héllo 🎯']) {
      expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });
});

describe('history ring (inside the sim state)', () => {
  it('keeps the last REWIND.historyTicks ticks of {x, y, z, alive, invuln} per player, as plain JSON', () => {
    const state = createMatch(7, 7);
    expect(state.hist).toHaveLength(2);
    expect(state.hist[0]).toHaveLength(REWIND.historyTicks);
    expect(state.hist[0][0]).toEqual({ t: 0, x: state.players[0].x, y: 0, z: state.players[0].z, alive: true, invuln: 0 });
    const seen = [];
    for (let i = 0; i < 20; i++) {
      step(state, [{ ...idle(state.players[0]), moveX: 1, jump: i === 3, dash: i === 5 }, { ...idle(state.players[1]), moveZ: 1 }]);
      seen.push(state.players.map((p) => ({ t: state.tick, x: p.x, y: p.y, z: p.z, alive: p.alive, invuln: p.invuln })));
    }
    for (let tick = 21 - H; tick <= 20; tick++) {
      for (let seat = 0; seat < 2; seat++) {
        expect(state.hist[seat][tick % H]).toEqual(seen[tick - 1][seat]);
      }
    }
    expect(historyAt(state, 0, 20 - H)).toBeNull();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    // The ring is part of the hash, so a replay must reproduce it.
    const tampered = JSON.parse(JSON.stringify(state));
    tampered.hist[1][3].x += 0.5;
    expect(hashState(tampered)).not.toBe(hashState(state));
  });

  it('is long enough for the deepest rewind: frame - maxTicks .. frame + 1', () => {
    // Coordinator decision (S2b review): ABS_MAX 10 ticks (333 ms), ring ABS_MAX + 2.
    expect(REWIND.maxTicks).toBe(10);
    expect(REWIND.historyTicks).toBe(REWIND.maxTicks + 2);
  });

  it('never holds the combat seed itself', () => {
    const state = createMatch(7, SEED);
    expect(JSON.stringify(state).includes(SEED)).toBe(false);
  });
});

describe('rewound capsule', () => {
  it('interpolates between history ticks base and base + 1 at viewFrac / 256', () => {
    const state = createMatch(11, 11);
    for (let i = 0; i < 12; i++) step(state, [{ ...idle(state.players[0]), moveX: 1, sprint: true }, idle(state.players[1])]);
    const frame = state.tick - 1; // after the step, history holds frame + 1 = state.tick too
    const a = state.hist[0][(frame - 3) % H];
    const b = state.hist[0][(frame - 2) % H];
    const mid = rewoundTarget(state, 0, frame, 3, 128);
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 4);
    expect(mid.z).toBeCloseTo((a.z + b.z) / 2, 4);
    expect(mid.base).toBe(frame - 3);
    const exact = rewoundTarget(state, 0, frame, 3, 0);
    expect([exact.x, exact.z]).toEqual([a.x, a.z]);
    // Rewind 0, frac 0 is the start of the frame: history tick `frame`.
    const now = rewoundTarget(state, 0, frame, 0, 0);
    expect(now.x).toBe(state.hist[0][frame % H].x);
  });

  it('clamps a claim to REWIND.maxTicks in the sim too, so a forged replay log cannot reach further', () => {
    const state = createMatch(5, 5);
    for (let i = 0; i < 20; i++) step(state, [idle(state.players[0]), idle(state.players[1])]);
    const p = state.players[0];
    expect(normalizeWish(p, { rewind: 200, viewFrac: 90 }, 20)).toMatchObject({ rewind: REWIND.maxTicks, viewFrac: 0 });
    expect(normalizeWish(p, { viewTick: 3, viewFrac: 90 }, 20)).toMatchObject({ rewind: REWIND.maxTicks, viewFrac: 0 });
    expect(normalizeWish(p, { viewTick: 18, viewFrac: 90 }, 20)).toMatchObject({ rewind: 2, viewFrac: 90 });
    expect(normalizeWish(p, { viewTick: 25, viewFrac: 90 }, 20)).toMatchObject({ rewind: 0, viewFrac: 0 });
    // History starts at tick 0.
    expect(normalizeWish(p, { rewind: 5, viewFrac: 9 }, 2)).toMatchObject({ rewind: 2, viewFrac: 0 });
  });

  it('a shot at where the shooter saw a moving target hits only with the rewind', () => {
    const run = (rewind) => {
      const state = sniperMatch();
      // The target sprints sideways for 10 ticks.
      for (let i = 0; i < 10; i++) step(state, [idle(state.players[0]), { ...idle(state.players[1]), moveX: 1 }]);
      const frame = state.tick;
      const seen = historyAt(state, 1, frame - 3);
      const before = state.players[1].shield + state.players[1].hp;
      const events = [];
      step(state, [sniperAt(state, 0, seen, { rewind }), { ...idle(state.players[1]), moveX: 1 }], events);
      return { dealt: before - (state.players[1].shield + state.players[1].hp), events };
    };
    const rewound = run(3);
    expect(rewound.dealt).toBeGreaterThan(0);
    expect(rewound.events).toEqual([expect.objectContaining({ shooter: 0, rewind: 3, hits: 1 })]);
    expect(rewound.events[0].dmg).toBe(rewound.dealt);
    const current = run(0);
    expect(current.dealt).toBe(0);
    expect(current.events).toEqual([expect.objectContaining({ shooter: 0, rewind: 0, hits: 0, dmg: 0 })]);
  });
});

describe('alive and invuln rules', () => {
  function aimed() {
    const state = sniperMatch();
    const frame = state.tick;
    const target = state.players[1];
    return { state, frame, target, wish: sniperAt(state, 0, target, { rewind: 2 }) };
  }

  it('takes invuln from the rewound tick: invulnerable then blocks the shot, invulnerable now does not', () => {
    const blocked = aimed();
    blocked.state.hist[1][(blocked.frame - 2) % H].invuln = 0.1;
    const events = [];
    step(blocked.state, [blocked.wish, idle(blocked.target)], events);
    expect(events[0]).toMatchObject({ hits: 1, dmg: 0 });
    expect(blocked.target.shield).toBe(TUNING.maxShield * 1000);

    const lands = aimed();
    lands.target.invuln = 0.1;
    const events2 = [];
    step(lands.state, [lands.wish, idle(lands.target)], events2);
    expect(events2[0].dmg).toBeGreaterThan(0);
    expect(lands.target.shield).toBeLessThan(TUNING.maxShield * 1000);
  });

  it('takes alive from the current tick: no hits on a corpse, and a dead shooter cannot fire', () => {
    const corpse = aimed();
    corpse.target.alive = false;
    const events = [];
    step(corpse.state, [corpse.wish, idle(corpse.target)], events);
    expect(events[0]).toMatchObject({ dmg: 0 });
    expect(corpse.target.shield).toBe(TUNING.maxShield * 1000);

    const dead = aimed();
    dead.state.players[0].alive = false;
    const mag = dead.state.players[0].mag[2];
    const events2 = [];
    step(dead.state, [dead.wish, idle(dead.target)], events2);
    expect(events2).toEqual([]);
    expect(dead.state.players[0].mag[2]).toBe(mag);
  });

  it('trades on the same tick go through double_ko, rewind or not', () => {
    const state = sniperMatch();
    state.players[0].hp = 1000;
    state.players[0].shield = 0;
    state.players[1].hp = 1000;
    state.players[1].shield = 0;
    const w0 = sniperAt(state, 0, historyAt(state, 1, state.tick - 1), { rewind: 1 });
    const w1 = sniperAt(state, 1, state.players[0], { rewind: 0 });
    step(state, [w0, w1]);
    expect(state).toMatchObject({ phase: 'done', outcome: 'draw', reason: 'double_ko', winner: null });
  });
});

describe('crits off in PvP', () => {
  it('never rolls a crit: every pellet is base damage times falloff, and spread is the only RNG', () => {
    expect(LOADOUT.every((gun) => gun.stats.critChance === 0)).toBe(true);
    for (const slot of [0, 1, 2]) {
      const state = createMatch(12, 77);
      const [p, target] = state.players;
      p.slot = slot;
      const gun = LOADOUT[slot];
      const wish = normalizeWish(p, { yaw: yawTo(p, target), pitch: 0, fire: true, zoom: true }, 0);
      for (let shot = 0; shot < 30; shot++) {
        p.fireCd = 0;
        p.mag[slot] = 5;
        p.reloadT = 0;
        p.swapT = 0;
        expect(weaponTick(p, wish, DT)).toBe(true);
        const before = { ...p.rng };
        const hits = traceShots(p, target, wish);
        for (const dmg of hits) expect(dmg).toBeLessThanOrEqual(gun.stats.damage * 1000);
        // Two spread draws per pellet, nothing else.
        const probe = { ...before };
        for (let i = 0; i < 2 * (gun.stats.pellets || 1); i++) pvpRngNext(probe);
        expect(p.rng).toEqual(probe);
      }
    }
  });
});

// sfc32 step, as core/rng.js does it (kept local so the test pins the draw count, not the API).
function pvpRngNext(r) {
  r.a >>>= 0; r.b >>>= 0; r.c >>>= 0; r.d >>>= 0;
  const t = (r.a + r.b) >>> 0;
  r.a = r.b ^ (r.b >>> 9);
  r.b = (r.c + (r.c << 3)) >>> 0;
  r.c = (r.c << 21) | (r.c >>> 11);
  r.d = (r.d + 1) >>> 0;
  const res = (t + r.d) >>> 0;
  r.c = (r.c + res) >>> 0;
  return res;
}

describe('director rewind clamp', () => {
  it('caps a seat at min(10, RTT + announced interpolation delay (50..150 ms) + 2 ticks), rounded up', () => {
    // No RTT sample and no announcement: 0 + 100 ms + 2 ticks = 5 ticks.
    expect(rewindCapFor(null)).toBe(5);
    expect(rewindCapFor(0, 100)).toBe(5);
    expect(rewindCapFor(40, 100)).toBe(7);
    expect(rewindCapFor(100, 100)).toBe(8);
    expect(rewindCapFor(120, 100)).toBe(9);
    expect(rewindCapFor(100, 150)).toBe(10);
    // The announced delay is clamped to 50..150 ms on the server.
    expect(rewindCapFor(100, 20)).toBe(rewindCapFor(100, 50));
    expect(rewindCapFor(100, 20)).toBe(7);
    expect(rewindCapFor(100, 9999)).toBe(rewindCapFor(100, 150));
    expect(rewindCapFor(5000, 100)).toBe(REWIND.maxTicks);
    expect(rewindCapFor(-50, NaN)).toBe(5);
    expect(clampView({ viewTick: 95, viewFrac: 40 }, 100, 6)).toEqual({ rewind: 5, frac: 40, claim: 5, clamped: false });
    expect(clampView({ viewTick: 100 - 255, viewFrac: 40 }, 100, 6)).toEqual({ rewind: 6, frac: 0, claim: 255, clamped: true });
    expect(clampView({ viewTick: 104, viewFrac: 40 }, 100, 6)).toEqual({ rewind: 0, frac: 0, claim: -4, clamped: false });
  });

  it('clamps a malicious oversized claim to the seat estimate and logs the clamped rewind', () => {
    const { director } = boot();
    stepTo(director, 20);
    const now = director.liveStart + 20 * STEP_MS;
    // No RTT sample yet: the cap is RTT 0 + 100 ms + 2 ticks = 5 ticks.
    expect(send(director, 'ada', { seq: 1, frame: 21, yaw: 0, viewTick: 21 - 255, viewFrac: 200, fire: true }, now).ok).toBe(true);
    expect(send(director, 'bea', { seq: 1, frame: 21, yaw: 0, viewTick: 18, viewFrac: 77 }, now).ok).toBe(true);
    stepTo(director, 22);
    const pair = director.usedAt(21);
    expect(pair[0]).toMatchObject({ src: SOURCE.input, r: 5, f: 0 });
    expect(pair[1]).toMatchObject({ src: SOURCE.input, r: 3, f: 77 });
    expect(director.seatStats(0)).toMatchObject({ rewindCap: 5, clamped: 1, rttMs: null });
    expect(director.seatStats(1)).toMatchObject({ clamped: 0 });
  });

  it('measures RTT itself from PING echoes of its own PONGs, takes the announced delay, and caps at 10', () => {
    const { director } = boot();
    const ping = (body, now) => director.handle({ userId: 'ada', sessionId: 'sa' }, OP.PING, JSON.stringify(body), now);
    let t = 0;
    let serverMs = ping({ t: 0 }, 1000).messages[0].body.serverMs;
    expect(serverMs).toBe(1000);
    // Echoes: 1000 ms later, held 900 ms by the client -> 100 ms round trip.
    for (let i = 0; i < 5; i++) {
      t += 1000;
      const out = ping({ t, echo: serverMs, hold: 900 }, serverMs + 1000);
      serverMs = out.messages[0].body.serverMs;
    }
    expect(director.seatStats(0)).toMatchObject({ rttMs: 100, interpMs: 100, rewindCap: 8 });
    // An echo of a serverMs this seat was never sent, or a hold longer than the gap, is ignored.
    ping({ t: 1, echo: 12345, hold: 0 }, serverMs + 50);
    ping({ t: 2, echo: serverMs, hold: 99999 }, serverMs + 60);
    expect(director.seatStats(0).rttMs).toBe(100);
    // Bea never echoed: her cap stays at the RTT-0 estimate.
    expect(director.seatStats(1)).toMatchObject({ rttMs: null, rewindCap: 5 });
    // The client announces its interpolation delay in PING (and HELLO); the server clamps it.
    ping({ t: 3, interpMs: 150 }, serverMs + 700);
    expect(director.seatStats(0)).toMatchObject({ interpMs: 150, rewindCap: 10 });
    ping({ t: 4, interpMs: 10 }, serverMs + 800);
    expect(director.seatStats(0)).toMatchObject({ interpMs: 50, rewindCap: 7 });
    ping({ t: 5, interpMs: 'x' }, serverMs + 900);
    expect(director.seatStats(0).interpMs).toBe(50);
    ping({ t: 6, interpMs: 100 }, serverMs + 950);
    // The snapshot tells each seat its own estimate and cap.
    const snap = director.advance(director.liveStart + STEP_MS).messages.find((m) => m.op === OP.SNAPSHOT && m.to.userId === 'ada');
    expect(snap.body.you).toMatchObject({ rttMs: 100, interpMs: 100, rewindCap: 8 });
  });

  it('takes the interpolation delay from HELLO too', () => {
    const director = createDirector({ spawnSeed: 1, combatSeed: SEED, matchId: 'h', leadInTicks: 0 });
    director.hello({ presenceUserId: 'ada', sessionId: 'sa', body: { ...hello('ada'), interpMs: 140 }, now: 0 });
    expect(director.seatStats(0)).toMatchObject({ interpMs: 140, rewindCap: 7 });
  });
});

describe('split combat seed', () => {
  it('sends only spawnSeed and sha256(combatSeed) until RESULT reveals the seed', () => {
    const { director, out, keep } = boot();
    const commit = sha256Hex(SEED);
    expect(director.combatCommit).toBe(commit);
    expect(combatCommitOf(SEED)).toBe(commit);
    expect(director.combatSeedDerived).toBe(false);
    const welcome = out.find((m) => m.op === OP.WELCOME);
    expect(welcome.body).toMatchObject({ spawnSeed: 3, combatCommit: commit });
    expect(welcome.body.seed).toBeUndefined();
    expect(out.find((m) => m.op === OP.PHASE).body).toMatchObject({ spawnSeed: 3, combatCommit: commit });
    stepTo(director, 60, keep);
    keep(director.handle({ userId: 'ada', sessionId: 'sa' }, OP.PING, '{"t":1}', director.liveStart + 60 * STEP_MS));
    for (const msg of out) expect(JSON.stringify(msg.body).includes(SEED), `op ${msg.op}`).toBe(false);
    const done = director.advance(director.liveStart + 60 * STEP_MS + 10001).messages;
    const result = done.find((m) => m.op === OP.RESULT);
    expect(result.body).toMatchObject({ combatSeed: SEED, combatCommit: commit, spawnSeed: 3 });
    expect(sha256Hex(result.body.combatSeed)).toBe(commit);
  });

  it('places spawns from spawnSeed alone; combatSeed only seeds the RNG', () => {
    const a = createMatch(42, SEED);
    const b = createMatch(42, 'ffeeddccbbaa99887766554433221100');
    expect(a.players.map((p) => [p.x, p.z, p.yaw])).toEqual(b.players.map((p) => [p.x, p.z, p.yaw]));
    expect(a.players[0].rng).not.toEqual(b.players[0].rng);
    // Both seats share one combat RNG start, so identical inputs take identical damage.
    expect(a.players[0].rng).toEqual(a.players[1].rng);
  });

  it('refuses a short or non-hex combat seed and flags a derived one', () => {
    expect(() => createDirector({ spawnSeed: 1, combatSeed: 'abc' })).toThrow(/combatSeed/);
    expect(() => createDirector({ spawnSeed: 1, combatSeed: 12345 })).toThrow(/combatSeed/);
    expect(() => createDirector({ spawnSeed: 1, combatSeed: SEED.toUpperCase() })).toThrow(/combatSeed/);
    const derived = createDirector({ seed: 1, matchId: 'practice' });
    expect(derived.combatSeedDerived).toBe(true);
    expect(derived.spawnSeed).toBe(1);
  });

  it('the client checks the revealed seed against the commit from WELCOME', () => {
    const director = createDirector({ spawnSeed: 9, combatSeed: SEED, matchId: 'c', leadInTicks: 0 });
    let now = 0;
    const table = createLoopbackTable(director, () => now);
    const ada = createPvpClient({ accountId: 'ada', match: table.open('ada', 'sa'), clock: () => now });
    const bea = createPvpClient({ accountId: 'bea', match: table.open('bea', 'sb'), clock: () => now });
    ada.ready();
    bea.ready();
    expect(ada.combatCommit).toBe(sha256Hex(SEED));
    expect(ada.spawnSeed).toBe(9);
    now = 10001;
    table.advance(now);
    expect(ada.result).toMatchObject({ outcome: 'draw', reason: 'both_stall', combatSeed: SEED, combatVerified: true });
    expect(bea.result.combatVerified).toBe(true);

    // A RESULT whose seed does not hash to the commit is flagged.
    const fake = createDirector({ spawnSeed: 9, combatSeed: SEED, matchId: 'c2', leadInTicks: 0 });
    const fns = [];
    const match = { send() {}, onMessage(fn) { fns.push(fn); return () => {}; } };
    const cy = createPvpClient({ accountId: 'cy', match, clock: () => 0 });
    for (const fn of fns) fn({ opCode: OP.WELCOME, json: () => ({ accountId: 'cy', seat: 0, phase: 'lobby', combatCommit: fake.combatCommit }) });
    for (const fn of fns) fn({ opCode: OP.RESULT, json: () => ({ outcome: 'ko', winner: 0, reason: 'ko', tick: 5, combatSeed: 'ffeeddccbbaa99887766554433221100' }) });
    expect(cy.result.combatVerified).toBe(false);
  });
});

describe('replay v2 reproduces the rewind', () => {
  function session() {
    const { director } = boot({ spawnSeed: 90, combatSeed: SEED });
    let seq = 0;
    // ada fires the sniper at where she saw bea three ticks before each frame; bea strafes.
    send(director, 'ada', { seq: ++seq, frame: 0, yaw: 0, slot: 2 }, 0);
    let seqB = 0;
    for (let frame = 1; frame < 150 && director.phase === 'live'; frame++) {
      const now = director.liveStart + frame * STEP_MS;
      const sim = director.sim;
      const seen = historyAt(sim, 1, Math.max(0, frame - 3)) || sim.players[1];
      send(director, 'ada', {
        seq: ++seq, frame, yaw: yawTo(sim.players[0], seen), pitch: 0, fire: frame % 30 === 0, zoom: true,
        viewTick: frame - 3, viewFrac: 0,
      }, now);
      send(director, 'bea', { seq: ++seqB, frame, yaw: sim.players[1].yaw, moveX: (frame >> 4) & 1 ? 1 : -1 }, now);
      director.advance(now);
    }
    return director;
  }

  it('verifies the logged rewinds, and a flipped rewind byte no longer matches', () => {
    const director = session();
    const record = director.replayRecord();
    expect(record).toMatchObject({ v: 2, sim: PVP_SIM_VERSION, spawnSeed: 90, combatSeed: SEED, combatCommit: sha256Hex(SEED) });
    const ticks = decodeUsedLog(record.used);
    const rewound = ticks.filter((pair) => pair[0].src === SOURCE.input && pair[0].r === 3);
    expect(rewound.length).toBeGreaterThan(50);
    const ok = JSON.parse(replayJSON(JSON.stringify(record)));
    expect(ok).toMatchObject({ ok: true, verified: true, mismatch: [], combatCommit: sha256Hex(SEED) });
    // The sim recorded hits, so rewinds decided damage.
    expect(director.sim.players[1].shield + director.sim.players[1].hp).toBeLessThan((TUNING.maxShield + TUNING.maxHp) * 1000);

    // Set every rewind byte of ada to 0: same inputs, other targets, other damage.
    const flat = record.used.map((chunk) => {
      let out = '';
      for (let at = 0; at < chunk.length; at += 40) out += chunk.slice(at, at + 16) + '0000' + chunk.slice(at + 20, at + 40);
      return out;
    });
    const bad = JSON.parse(replayJSON(JSON.stringify({ ...record, used: flat })));
    expect(bad.verified).toBe(false);
    expect(bad.mismatch).toContain('stateHash');
  });

  it('refuses a wrong commit, a malformed seed and another sim version', () => {
    const record = session().replayRecord();
    const wrong = JSON.parse(replayJSON(JSON.stringify({ ...record, combatCommit: sha256Hex('nope') })));
    expect(wrong.verified).toBe(false);
    expect(wrong.mismatch).toEqual(['combatCommit']);
    const other = JSON.parse(replayJSON(JSON.stringify({ ...record, combatSeed: 'ffeeddccbbaa99887766554433221100' })));
    expect(other.verified).toBe(false);
    expect(other.mismatch).toContain('combatCommit');
    expect(JSON.parse(replayJSON(JSON.stringify({ ...record, combatSeed: 7 })))).toMatchObject({ ok: false, reason: 'malformed' });
    expect(JSON.parse(replayJSON(JSON.stringify({ ...record, sim: 1 })))).toMatchObject({ ok: false, reason: 'version' });
  });
});

describe('server-confirmed hit events in snapshots', () => {
  it('carries { tick, shooter, dmg } for each hit stepped since the last snapshot, to both seats', () => {
    const { director, keep } = boot({ spawnSeed: 90 });
    send(director, 'ada', { seq: 1, frame: 0, yaw: 0, slot: 2 }, 0);
    stepTo(director, 40, keep);
    const sim = director.sim;
    const now = director.liveStart + 40 * STEP_MS;
    send(director, 'ada', { seq: 2, frame: 40, yaw: yawTo(sim.players[0], sim.players[1]), fire: true, zoom: true, viewTick: 40 }, now);
    const out = director.advance(director.liveStart + 41 * STEP_MS).messages.filter((m) => m.op === OP.SNAPSHOT);
    expect(out).toHaveLength(2);
    for (const snap of out) {
      expect(snap.body.hits).toHaveLength(1);
      expect(snap.body.hits[0]).toMatchObject({ tick: 40, shooter: 0, hits: 1, rewind: 0 });
      expect(snap.body.hits[0].dmg).toBeGreaterThan(0);
    }
    const next = director.advance(director.liveStart + 42 * STEP_MS).messages.find((m) => m.op === OP.SNAPSHOT);
    expect(next.body.hits).toEqual([]);
  });
});

describe('18-byte input with viewTick / viewFrac', () => {
  it('round-trips the view, clamps back to 0..255 and never before tick 0', () => {
    expect(INPUT_LIMITS.frameBytes).toBe(18);
    const base = { seq: 1, frame: 300, yaw: 0, pitch: 0 };
    expect(decodeInput(encodeInput({ ...base, viewTick: 292, viewFrac: 129 }))).toMatchObject({ frame: 300, viewTick: 292, viewFrac: 129 });
    expect(decodeInput(encodeInput({ ...base, viewTick: 292.9, viewFrac: 255.9 }))).toMatchObject({ viewTick: 292, viewFrac: 255 });
    expect(decodeInput(encodeInput({ ...base, viewTick: 2 }))).toMatchObject({ viewTick: 300 - 255 });
    expect(decodeInput(encodeInput({ ...base, viewTick: 310 }))).toMatchObject({ viewTick: 300 });
    expect(decodeInput(encodeInput({ ...base, frame: 3, viewTick: -50 }))).toMatchObject({ viewTick: 0 });
    expect(decodeInput(encodeInput(base))).toMatchObject({ viewTick: 300, viewFrac: 0 });
    expect(() => encodeInput({ ...base, viewTick: NaN })).toThrow(/nan/);
    expect(() => decodeInput(new Uint8Array(16))).toThrow(/malformed/);
  });
});

describe('client view stamps, PING echoes and hit events', () => {
  function rig() {
    let now = 0;
    const fns = [];
    const sent = [];
    const match = { send(op, data) { sent.push({ op, at: now, data }); }, onMessage(fn) { fns.push(fn); return () => {}; } };
    const client = createPvpClient({ accountId: 'ada', match, clock: () => now });
    const deliver = (op, body) => { for (const fn of fns) fn({ opCode: op, json: () => body }); };
    return {
      client, sent, deliver,
      get now() { return now; },
      set now(v) { now = v; },
      pings: () => sent.filter((m) => m.op === OP.PING).map((m) => m.data),
      inputs: () => sent.filter((m) => m.op === OP.INPUT).map((m) => decodeInput(m.data)),
    };
  }

  function player(x, extra = {}) {
    return { x, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, hp: 100000, shield: 50000, alive: true, slot: 0, ...extra };
  }

  it('stamps viewTick/viewFrac from the render time of the newest drawn frame', () => {
    expect(viewStamp(12.5)).toEqual({ viewTick: 12, viewFrac: 128 });
    expect(viewStamp(12.999)).toEqual({ viewTick: 12, viewFrac: 255 });
    expect(viewStamp(-2)).toEqual({ viewTick: 0, viewFrac: 0 });
    const r = rig();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'live', tick: 0, lastSeq: 0 });
    for (let tick = 0; tick <= 20; tick++) {
      r.now = tick * STEP_MS;
      r.deliver(OP.SNAPSHOT, { tick, clockTick: tick, phase: 'live', players: [player(tick * 0.1), player(-1)] });
    }
    r.now = 20 * STEP_MS + 10;
    const drawn = r.client.sample(r.now);
    expect(drawn.mode).toBe('interp');
    const renderTick = 20 + 10 / STEP_MS - r.client.net.interpDelayMs / STEP_MS;
    expect(r.client.submit({ yaw: 0, fire: true })).toBe(true);
    const input = r.inputs().at(-1);
    expect(input.viewTick).toBe(Math.floor(renderTick));
    expect(input.viewFrac).toBe(Math.floor((renderTick - Math.floor(renderTick)) * 256));
    expect(input.frame - input.viewTick).toBe(r.client.net.lead + Math.ceil(r.client.net.interpDelayMs / STEP_MS));
  });

  it('echoes the newest PONG serverMs and its hold time in the next PING', () => {
    const r = rig();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'lobby', tick: 0, lastSeq: 0 });
    expect(r.pings()[0]).toEqual({ t: 0, interpMs: 100 });
    r.now = 80;
    r.deliver(OP.PONG, { t: 0, serverMs: 5000, tick: 0, clockTick: 0, phase: 'lobby' });
    // The first PONG is echoed at once (S2a: second PING right after the first PONG).
    expect(r.pings()[1]).toEqual({ t: 80, interpMs: 100, echo: 5000, hold: 0 });
    r.now = 160;
    r.deliver(OP.PONG, { t: 80, serverMs: 5080, tick: 0, clockTick: 0, phase: 'lobby' });
    r.now = 600;
    r.client.update(r.now, () => null);
    expect(r.pings()[2]).toEqual({ t: 600, interpMs: 100, echo: 5080, hold: 440 });
    expect(r.sent.find((m) => m.op === OP.HELLO).data).toMatchObject({ interpMs: 100 });
  });

  it('keeps server-confirmed hits from snapshots for the HUD and counts its own damage', () => {
    const r = rig();
    r.deliver(OP.WELCOME, { accountId: 'ada', seat: 0, phase: 'live', tick: 0, lastSeq: 0 });
    r.deliver(OP.SNAPSHOT, {
      tick: 5, clockTick: 5, phase: 'live', players: [player(0), player(1)],
      hits: [{ tick: 4, shooter: 0, dmg: 18000, hits: 2, rewind: 3 }, { tick: 4, shooter: 1, dmg: 9000, hits: 1, rewind: 1 }],
      you: { seat: 0, ackFrame: 4, ackSeq: 3, late: 0, rttMs: 90, rewindCap: 6 },
    });
    expect(r.client.hits.map((h) => [h.shooter, h.dmg])).toEqual([[0, 18000], [1, 9000]]);
    expect(r.client.net).toMatchObject({ hitsConfirmed: 1, damageConfirmed: 18000, serverRttMs: 90, rewindCap: 6 });
    expect(r.client.viewState(r.now).hits).toHaveLength(2);
    expect(r.client.viewState(r.now + 5000).hits).toHaveLength(0);
  });
});

describe('pins that S2b must not move', () => {
  it('keeps the campaign fingerprint 3c657fb5', () => {
    expect(contentFingerprint(1)).toBe('3c657fb5');
  });
});
