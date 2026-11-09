// SHOOTER-S0 baseline. Today's PvP netcode measured on the harness, plus the §R.8 launch gates
// as pending tests.
//
// The "documents current behaviour" tests pin how bad it is today, so the suite stays green.
// When a PR fixes one, delete that block and turn on (it.skip -> it) the pending test it names.
//   S1  client input lead + one send per tick       -> late < 1%, real input on >= 99% of ticks
//   S2a director v2: rejoin via HELLO, late-accept-discard, hold-last, frame caps
//   S2b/S3 viewTick rewind, prediction, interpolation -> correction p99, rewind, starvation
//
// The harness is the realistic one (netsim.js REALISM): client clock offset and drift, a jittered
// Nakama loop with pauses, ~130 B envelopes. `queued` is what the director accepted for a tick
// it has stepped; director v1 applies exactly that.
//
// Set NETSIM_REPORT=1 to print the measured numbers.
import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../../src/sim/pvp/rules.js';
import { hashState, replay, scriptedMatch } from '../../src/sim/pvp/sim.js';
import { PROFILES, TARGETS, runScenario } from './netsim.js';

const DURATION_MS = 15000;
const DROP = Object.freeze({ peer: 1, atMs: 3000, downMs: 1500 });

const cache = new Map();
function measure(name, extra = {}) {
  const key = `${name}:${JSON.stringify(extra)}`;
  if (!cache.has(key)) {
    const profile = PROFILES[name] || PROFILES.rtt0;
    const report = runScenario({ seed: 1, matchSeed: 7, durationMs: DURATION_MS, profile, ...extra });
    if (process.env.NETSIM_REPORT) {
      console.log(name, JSON.stringify({
        ticks: report.ticks,
        result: report.result,
        peers: report.peers.map((p) => ({
          sent: p.inputsSent,
          accepted: p.inputsAccepted,
          queued: p.queuedFraction,
          late: p.lateFraction,
          rejects: p.rejectsByOp,
          snapMs: p.snapshotInterArrivalMs,
          starved: p.starvedFraction,
          held: p.heldFrames,
          snapLate: p.snapshotLateFrames,
          frames: p.renderFrames,
        })),
        downBytesPerLiveSec: report.links.map((l) => Math.round(l.down.bytes / ((report.endedAt - report.liveAt) / 1000))),
      }));
    }
    cache.set(key, report);
  }
  return cache.get(key);
}

const rejoin = () => measure('rejoin', { profile: PROFILES.rtt0, disconnects: [DROP] });

describe('pins the harness must never move', () => {
  it('keeps the PvP golden ce272de1 and both fingerprints', () => {
    const state = replay(scriptedMatch(7, 180));
    expect(hashState(state)).toBe('ce272de1');
    expect(CONTENT_FINGERPRINT).toBe('f5949631');
    expect(contentFingerprint(1)).toBe('3c657fb5');
  });
});

describe('baseline: documents current behaviour (expected to be bad)', () => {
  it('RTT 0: the jittered server loop makes a third of inputs late; real input on < 1 tick in 3', () => {
    const report = measure('rtt0');
    expect(report.result).toBeNull();
    expect(report.ticks).toBe(450);
    for (const peer of report.peers) {
      // Inputs are stamped with the last snapshot tick, and snapshots go out every 3 ticks. A
      // loop callback that runs late (or after a pause) catches up more than one tick, so the
      // next input arrives below the cursor: a perfect 30 Hz loop gave 0 rejects and 33.3%.
      expect(peer.rejects.frame).toBeGreaterThan(40);
      expect(peer.lateFraction).toBeGreaterThan(0.25);
      expect(peer.queuedFraction).toBeGreaterThan(0.25);
      expect(peer.queuedFraction).toBeLessThan(0.33);
      expect(peer.snapshotInterArrivalMs.p50).toBeGreaterThan(95);
      expect(peer.snapshotInterArrivalMs.p50).toBeLessThan(105);
      // The remote is sampled by tick, so it steps at 10 fps: 5 of every 6 frames at 60 Hz hold.
      expect(peer.starvedFraction).toBeGreaterThan(0.8);
      expect(peer.starvedFraction).toBeLessThan(0.86);
    }
  });

  for (const name of ['rtt100j30', 'rtt150', 'heavyTail']) {
    it(`${name}: every input is rejected as late, so the match ends both_stall at 10 s`, () => {
      const report = measure(name);
      expect(report.result).toMatchObject({ outcome: 'draw', reason: 'both_stall' });
      expect(report.result.tick).toBeGreaterThanOrEqual(300);
      expect(report.result.tick).toBeLessThanOrEqual(302);
      expect(report.bothStalled).toBe(1);
      for (const peer of report.peers) {
        expect(peer.inputsAccepted).toBe(0);
        expect(peer.queuedFraction).toBe(0);
        expect(peer.lateFraction).toBeGreaterThan(0.7);
        expect(peer.rejects.frame).toBeGreaterThan(150);
        // One late reject cascades into sequence rejects.
        expect(peer.rejects.sequence).toBeGreaterThan(0);
      }
    });
  }

  it('stall bursts: (almost) no input lands, snapshots arrive in bursts, and the match ends on a stall', () => {
    const report = measure('stallBurst');
    expect(['both_stall', 'stall']).toContain(report.result.reason);
    expect(report.result.tick).toBeLessThanOrEqual(302);
    for (const peer of report.peers) {
      expect(peer.inputsAccepted).toBeLessThanOrEqual(1);
      expect(peer.lateFraction).toBeGreaterThan(0.5);
      expect(peer.snapshotInterArrivalMs.max).toBeGreaterThan(300);
    }
    expect(Math.max(...report.peers.map((p) => p.starvedFraction))).toBeGreaterThan(TARGETS.starvedFraction);
  });

  it('rejoin on a new session id: RESYNC and every input are wrong_sender, then a stall forfeit', () => {
    const report = rejoin();
    const bea = report.peers[1];
    const ada = report.peers[0];
    expect(bea.rejoins).toBe(1);
    expect(bea.rejectsByOp['RESYNC:wrong_sender']).toBe(1);
    expect(bea.acceptedAfterRejoin).toBe(0);
    expect(bea.rejectsAfterRejoin.wrong_sender).toBeGreaterThan(100);
    expect(report.result).toMatchObject({ outcome: 'forfeit', reason: 'stall', winner: ada.seat });
    expect(report.stallForfeits).toBe(1);
  });

  it('prediction and rewind metrics have no samples yet', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) expect(peer.correctionP99Cm).toBeNull();
    expect(report.rewind.agreement).toBeNull();
  });
});

describe('§R.8 targets (pending: later PRs turn these on)', () => {
  for (const name of ['rtt0', 'rtt100j30', 'rtt150']) {
    it.skip(`S1: ${name} late inputs < 1% and real input on >= 99% of ticks`, () => {
      const report = measure(name);
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });
  }

  it.skip('S2a: heavy-tail jitter causes no reject storm and no stall forfeit', () => {
    const report = measure('heavyTail');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.rejectFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.9);
    }
  });

  it.skip('S2a: stall bursts cause no reject storm and no stall forfeit', () => {
    const report = measure('stallBurst');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.rejectFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.9);
    }
  });

  it.skip('S2a: a client that rejoins on a new session id keeps its seat and keeps playing', () => {
    const report = rejoin();
    const bea = report.peers[1];
    expect(bea.rejectsAfterRejoin.wrong_sender || 0).toBe(0);
    expect(bea.acceptedAfterRejoin).toBeGreaterThan(0);
    expect(report.stallForfeits).toBe(0);
    expect(report.result).toBeNull();
  });

  it.skip('S3: RTT 100±30 ms prediction correction p99 < 5 cm', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) {
      expect(peer.correctionP99Cm).not.toBeNull();
      expect(peer.correctionP99Cm).toBeLessThan(TARGETS.correctionP99Cm);
    }
  });

  it.skip('S3: RTT 100±30 ms remote starvation < 1% of frames', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) expect(peer.starvedFraction).toBeLessThan(TARGETS.starvedFraction);
  });

  // What this gate can show depends on the check behind rewindCheck(). If both rays start at
  // the server's eye (no client prediction yet), it only compares the drawn target with the
  // rewound one, so it mostly measures "the rewind claim was not clamped".
  it.skip('S2b/S3: RTT 100±30 ms rewind hit agreement >= 98%', () => {
    const report = measure('rtt100j30', { fire: true });
    expect(report.rewind.checks).toBeGreaterThan(0);
    expect(report.rewind.agreement).toBeGreaterThanOrEqual(TARGETS.rewindAgreement);
  });
});
