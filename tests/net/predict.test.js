// SHOOTER-S3: client-side prediction and reconciliation. The predictor steps the local player with
// the sim's own movePlayer + weaponTick, keeps the inputs it sent, and on each snapshot rewinds to
// the server's exact copy of this seat (you.private), replays the inputs the server has not used
// yet, and turns the difference into a visual offset that decays with tau ~100 ms (snap > 2 m).
import { describe, expect, it } from 'vitest';
import {
  PREDICT, createPredictor, holdWish, neutralWish, playerFromSnapshot, predictStep,
} from '../../src/net/predict.js';
import { createDirector } from '../../src/sim/pvp/director.js';
import { CONTENT_FINGERPRINT, INPUT_LIMITS, STEP_MS } from '../../src/sim/pvp/rules.js';
import { createMatch, hashState, replay, scriptedMatch, step } from '../../src/sim/pvp/sim.js';
import { createLoopbackTable, createPvpClient } from '../../src/net/client.js';

const PUBLIC = ['seat', 'x', 'y', 'z', 'yaw', 'pitch', 'vx', 'vz', 'hp', 'shield', 'alive', 'slot'];

/** What the director sends for one seat: the public player and you.private. */
function wire(p) {
  const pub = {};
  const priv = {};
  for (const key of Object.keys(p)) {
    if (key === 'rng') continue;
    const value = Array.isArray(p[key]) ? p[key].slice() : p[key];
    if (PUBLIC.includes(key)) pub[key] = value;
    else priv[key] = value;
  }
  return { pub, priv };
}

function fromSim(p) {
  const { pub, priv } = wire(p);
  return playerFromSnapshot(pub, priv);
}

/** A busy wish stream for seat 0: strafe, sprint, jump, dash, fire bursts, a reload, a swap. */
function wishAt(frame) {
  return {
    yaw: 0.4 + Math.sin(frame / 9) * 0.6,
    pitch: Math.cos(frame / 13) * 0.2,
    moveX: Math.sin(frame / 7) > 0 ? 1 : -1,
    moveZ: 1,
    sprint: frame % 40 < 20,
    jump: frame % 31 === 5,
    dash: frame % 47 === 11,
    fire: frame % 18 < 9,
    zoom: false,
    reload: frame === 70,
    slot: frame === 90 ? 2 : frame === 120 ? 0 : -1,
  };
}

const FIELDS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'onGround', 'dashT', 'dashCd', 'invuln',
  'fireCd', 'reloadT', 'swapT', 'slot', 'shells', 'sniper'];

function same(a, b) {
  for (const key of FIELDS) expect(a[key], key).toBe(b[key]);
  expect(a.mag).toEqual(b.mag);
}

/** A sim where seat 1 stands far away (no body contact), stepped with seat 0's wishes. */
function simWith(wishes, ticks) {
  const state = createMatch(7);
  for (let f = 0; f < ticks; f++) step(state, [wishes(f), { yaw: state.players[1].yaw, moveZ: 0 }]);
  return state;
}

describe('predictStep runs the sim\'s own movement and weapon code (SHOOTER-S3)', () => {
  it('matches the sim bit for bit over 150 busy ticks without body contact', () => {
    const state = createMatch(7);
    const local = fromSim(state.players[0]);
    let shots = 0;
    for (let f = 0; f < 150; f++) {
      const before = state.players[0].mag.slice();
      step(state, [wishAt(f), { yaw: state.players[1].yaw, moveZ: 0 }]);
      const fired = predictStep(local, wishAt(f), f);
      // The sim spent a round exactly when the predictor says it fired.
      const spent = before.some((n, i) => n > state.players[0].mag[i]);
      expect(fired).toBe(spent);
      if (fired) shots += 1;
      same(local, state.players[0]);
    }
    expect(shots).toBeGreaterThan(10);
  });

  it('a dead player does not move or fire', () => {
    const p = fromSim(createMatch(7).players[0]);
    p.alive = false;
    const x = p.x;
    expect(predictStep(p, { moveZ: 1, fire: true, yaw: 0 }, 0)).toBe(false);
    expect(p.x).toBe(x);
  });

  it('substitute wishes mirror the director: hold keeps move, aim and held buttons; neutral keeps aim only', () => {
    const w = wishAt(5);
    w.jump = true;
    w.slot = 2;
    expect(holdWish(w)).toMatchObject({
      yaw: w.yaw, pitch: w.pitch, moveX: w.moveX, moveZ: w.moveZ, fire: w.fire, zoom: w.zoom, sprint: w.sprint,
      jump: false, dash: false, reload: false, slot: -1,
    });
    expect(neutralWish(w)).toMatchObject({
      yaw: w.yaw, pitch: w.pitch, moveX: 0, moveZ: 0, fire: false, zoom: false, sprint: false, jump: false, slot: -1,
    });
  });
});

describe('reconciliation (SHOOTER-S3)', () => {
  function primed(upTo) {
    const pred = createPredictor();
    pred.rebase(0, -1, fromSim(createMatch(7).players[0]), 0);
    for (let f = 0; f <= upTo; f++) pred.push(f, wishAt(f), 0);
    return pred;
  }

  it('replays the inputs after the ack: a server that used the same inputs gives zero correction', () => {
    const pred = primed(11);
    const server = simWith(wishAt, 6);
    const got = pred.reconcile(6, 5, fromSim(server.players[0]), 0);
    expect(got.error).toBe(0);
    expect(got.replayed).toBe(6);
    expect(got.snapped).toBe(false);
    same(pred.state, simWith(wishAt, 12).players[0]);
    expect(pred.pendingFrames()).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it('a server that used different inputs moves the prediction, and the offset keeps the picture still', () => {
    const pred = primed(11);
    const before = pred.visual(0, 1);
    // The server dropped frame 4 (late) and held frame 3's wish instead.
    const used = (f) => (f === 4 ? holdWish(wishAt(3)) : wishAt(f));
    const server = simWith(used, 6);
    const got = pred.reconcile(6, 3, fromSim(server.players[0]), 0);
    expect(got.error).toBeGreaterThan(0);
    expect(got.error).toBeLessThan(PREDICT.snapM);
    // Truth: the server's state, then this client's frames 6..11.
    const truth = createMatch(7);
    for (let f = 0; f < 12; f++) step(truth, [used(f), { yaw: truth.players[1].yaw, moveZ: 0 }]);
    same(pred.state, truth.players[0]);
    const after = pred.visual(0, 1);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.z).toBeCloseTo(before.z, 9);
    expect(Math.hypot(pred.offset.x, pred.offset.y, pred.offset.z)).toBeCloseTo(got.error, 9);
  });

  it('the visual offset decays with tau ~100 ms', () => {
    const pred = primed(11);
    pred.reconcile(6, 5, fromSim(simWith((f) => (f === 2 ? neutralWish(wishAt(2)) : wishAt(f)), 6).players[0]), 1000);
    const start = Math.hypot(pred.offset.x, pred.offset.y, pred.offset.z);
    expect(start).toBeGreaterThan(0.01);
    pred.visual(1000 + PREDICT.tauMs, 1);
    expect(Math.hypot(pred.offset.x, pred.offset.y, pred.offset.z)).toBeCloseTo(start * Math.exp(-1), 6);
    pred.visual(1000 + 6 * PREDICT.tauMs, 1);
    expect(Math.hypot(pred.offset.x, pred.offset.y, pred.offset.z)).toBeLessThan(start * 0.003);
  });

  it('snaps (no offset) when the correction is above 2 m', () => {
    const pred = primed(11);
    const far = fromSim(simWith(wishAt, 6).players[0]);
    far.x += 3;
    const got = pred.reconcile(6, 5, far, 0);
    expect(got.snapped).toBe(true);
    expect(got.error).toBeGreaterThan(PREDICT.snapM);
    expect(pred.offset).toEqual({ x: 0, y: 0, z: 0 });
    expect(pred.visual(0, 1).x).toBe(pred.state.x);
  });

  it('fills a frame gap the way the director does: three held ticks, then neutral', () => {
    const pred = createPredictor();
    pred.rebase(0, -1, fromSim(createMatch(7).players[0]), 0);
    pred.push(0, wishAt(0), 0);
    pred.push(1, wishAt(1), 0);
    pred.push(7, wishAt(7), 0);
    const used = (f) => {
      if (f <= 1 || f === 7) return wishAt(f);
      return f - 1 <= INPUT_LIMITS.holdTicks ? holdWish(wishAt(1)) : neutralWish(wishAt(1));
    };
    same(pred.state, simWith(used, 8).players[0]);
  });

  it('cosmetic fire is reported once, on the first prediction, never again on replay', () => {
    const pred = createPredictor();
    pred.rebase(0, -1, fromSim(createMatch(7).players[0]), 0);
    const fired = [];
    for (let f = 0; f < 6; f++) fired.push(pred.push(f, { ...wishAt(0), fire: true }, 0).fired);
    expect(fired[0]).toBe(true);
    const again = pred.reconcile(2, 1, fromSim(simWith(() => ({ ...wishAt(0), fire: true }), 2).players[0]), 0);
    expect(again.error).toBe(0);
    expect(pred.state.mag[0]).toBeLessThan(36);
  });
});

describe('prediction against the real director (SHOOTER-S3)', () => {
  it('a client on a zero-latency loopback predicts exactly: every correction is 0 cm', () => {
    const director = createDirector({ spawnSeed: 7, matchId: 'predict' });
    let now = 0;
    const table = createLoopbackTable(director, () => now);
    const corrections = [];
    const ada = createPvpClient({
      accountId: 'ada', match: table.open('ada', 'a'), clock: () => now, onCorrection: (m) => corrections.push(m),
    });
    const bea = createPvpClient({ accountId: 'bea', match: table.open('bea', 'b'), clock: () => now });
    ada.ready();
    bea.ready();
    for (let i = 0; i < 30 * 12; i++) {
      now += STEP_MS / 2;
      table.advance(now);
      const sample = ada.sample(now);
      if (ada.phase === 'live' && sample && sample.players) {
        // Seat 1 stands still; seat 0 strafes away from it, so there is no body contact.
        ada.update(now, (frame) => ({ ...wishAt(frame), fire: false, yaw: wishAt(frame).yaw + Math.PI }));
        bea.update(now, () => ({ yaw: 0, moveZ: 0 }));
      }
    }
    expect(corrections.length).toBeGreaterThan(100);
    expect(Math.max(...corrections)).toBe(0);
    expect(ada.net.predicted).toBe(true);
  });

  it('leaves the sim, its golden and the content fingerprint alone', () => {
    expect(hashState(replay(scriptedMatch(7, 180)))).toBe('da423456');
    expect(CONTENT_FINGERPRINT).toBe('e749d2fd');
  });
});
