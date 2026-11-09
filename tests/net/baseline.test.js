// SHOOTER-S0 baseline, updated by SHOOTER-S1 and SHOOTER-S2a. PvP netcode measured on the
// harness, plus the §R.8 launch gates.
//
// The "documents current behaviour" tests pin how it behaves today, so the suite stays green.
// When a PR fixes one, update that block and turn on (it.skip -> it) the pending test it names.
//   S1  client 30 Hz input clock + adaptive input lead + one send per tick   (done: on below)
//   S2a director v2: rejoin via HELLO, lead-in, late-accept-discard, hold-last, frame caps (done)
//   S2b viewTick rewind (sim 2): the harness now scores rewind agreement (done: measured below;
//       the >= 98% gate stays pending, see the note on it)
//   S3  prediction, adaptive interpolation -> correction p99, rewind, starvation
//
// Before S1 (protocol 1, inputs stamped with the last snapshot tick): RTT 0 applied real input on
// 1 tick in 3, and RTT 100±30 / 150 rejected every input and ended both_stall at 10 s.
// Before S2a (S1 client, director v1): RTT 100±30 / 150 applied 98.67% of the 15 s window (the
// first round trip of ticks had no input), stall bursts rejected ~80 inputs per seat as
// `sequence` echoes and applied 79-80%, and a rejoin on a new session id forfeited on stall.
//
// The window starts at tick 0, after the director's live-start lead-in.
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
          applied: p.appliedFraction,
          directorApplied: p.directorApplied,
          directorHeld: p.directorHeld,
          directorNeutral: p.directorNeutral,
          steady: p.steadyAppliedFraction,
          firstInputCursor: p.firstInputCursor,
          late: p.lateFraction,
          lateDiscards: p.lateDiscards,
          rejects: p.rejectsByOp,
          snapMs: p.snapshotInterArrivalMs,
          starved: p.starvedFraction,
          clientStarved: p.clientStarvedFraction,
          extrapolated: p.extrapolatedFrames,
          held: p.heldFrames,
          snapLate: p.snapshotLateFrames,
          frames: p.renderFrames,
          lead: p.net && p.net.lead,
          rttMs: p.net && Math.round(p.net.rttMs),
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
  it('keeps the PvP golden 4b3e8828 and both fingerprints', () => {
    const state = replay(scriptedMatch(7, 180));
    // Sim 2 (SHOOTER-S2b) is a deliberate golden bump from ce272de1 (sim 1).
    expect(hashState(state)).toBe('4b3e8828');
    // Fingerprints: f5949631 (protocol 1) -> 0e584d36 (S2a) -> accf6cd7 (S2b, sim 2).
    expect(CONTENT_FINGERPRINT).toBe('accf6cd7');
    expect(contentFingerprint(1)).toBe('3c657fb5');
  });
});

describe('baseline: documents current behaviour (S1 client, director v2)', () => {
  for (const name of ['rtt0', 'rtt100j30', 'rtt150']) {
    it(`${name}: no rejects, no late frames, real input on every tick from tick 0`, () => {
      const report = measure(name);
      expect(report.result).toBeNull();
      expect(report.ticks).toBe(450);
      for (const peer of report.peers) {
        expect(peer.rejectTotal).toBe(0);
        expect(peer.lateFraction).toBe(0);
        // The lead-in lets the first inputs reach the director before tick 0.
        expect(peer.firstInputCursor).toBe(0);
        expect(peer.appliedFraction).toBeGreaterThanOrEqual(0.99);
        expect(peer.directorApplied).toBeGreaterThanOrEqual(446);
        // The lead starts at the PING round trip in ticks plus one.
        expect(peer.net.lead).toBe({ rtt0: 2, rtt100j30: 5, rtt150: 6 }[name]);
        // One snapshot per tick, per recipient.
        expect(peer.snapshotInterArrivalMs.p50).toBeGreaterThan(32);
        expect(peer.snapshotInterArrivalMs.p50).toBeLessThan(34);
      }
    });
  }

  it('RTT 100±30 ms: 30 Hz snapshots bring client extrapolation down to ~1% at a fixed 100 ms delay', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) {
      expect(peer.starvedFraction).toBeLessThanOrEqual(TARGETS.starvedFraction);
      // S1 at 10 Hz: 13-15%. The first 100 ms of the match are always held (no older snapshot).
      expect(peer.clientStarvedFraction).toBeLessThanOrEqual(0.0101);
    }
  });

  it('stall bursts: stalled frames are late and discarded, held wishes cover the gap, no rejects', () => {
    const report = measure('stallBurst');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.rejectTotal).toBe(0);
      // TCP stalls of 200-400 ms make some frames late; they are accepted and discarded.
      expect(peer.lateDiscards).toBeGreaterThan(20);
      expect(peer.lateFraction).toBeLessThan(0.1);
      expect(peer.directorHeld).toBeGreaterThan(10);
      expect(peer.appliedFraction).toBeGreaterThanOrEqual(0.9);
      // The client does not chase stalls with a bigger lead.
      expect(peer.net.lead).toBeLessThanOrEqual(6);
    }
  });

  it('rejoin on a new session id: HELLO rebinds the seat and play continues', () => {
    const report = rejoin();
    const bea = report.peers[1];
    expect(bea.rejoins).toBe(1);
    // One input already queued at the server when the socket dropped meets the dead session.
    expect(bea.rejects.wrong_sender || 0).toBeLessThanOrEqual(1);
    expect(bea.rejectsAfterRejoin).toEqual({});
    expect(bea.acceptedAfterRejoin).toBeGreaterThan(300);
    // 1.5 s down: 3 held ticks, then neutral until the first input after the rejoin.
    expect(bea.directorHeld).toBe(3);
    expect(bea.directorNeutral).toBeGreaterThan(30);
    expect(bea.directorNeutral).toBeLessThan(60);
    expect(report.result).toBeNull();
  });

  it('prediction metrics have no samples yet, and rewind checks need firing bots', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) expect(peer.correctionP99Cm).toBeNull();
    expect(report.rewind.agreement).toBeNull();
  });

  // SHOOTER-S2b. The rewind itself is exact: scored at the client's full claim, every check
  // agrees. What moves agreement is the director's clamp, min(6 ticks, RTT/2 + 100 ms + 1 tick).
  // With the S1 input lead (about one full RTT plus a tick: the client clock trails the server by
  // the downlink) plus the 100 ms interpolation delay, an honest claim at RTT 100±30 is 8-9
  // ticks, so ~97% of checks are clamped to 6 and agreement is ~70%. Measured 2026-11-09:
  //   rtt0       claim p50 5, applied 5, agreement 0.9974 (the first second has no RTT sample: cap 4)
  //   rtt100j30  claim p50 8, applied 6, agreement 0.6954, unclamped 1.0
  //   rtt150     claim p50 9, applied 6, agreement 0.4343, unclamped 1.0
  // A cap of min(9, RTT + 100 ms + 2 ticks) with an 11-tick ring measured 0.9949 / 0.9975 at
  // rtt100j30 / rtt150: an owner decision for S3 (a wider rewind window is a wider backtrack).
  it('S2b rewind: exact at the claim, clamped by the per-seat cap', () => {
    const zero = measure('rtt0', { fire: true });
    expect(zero.rewind.checks).toBeGreaterThan(300);
    expect(zero.rewind.agreement).toBeGreaterThanOrEqual(0.99);
    expect(zero.rewind.unclampedAgreement).toBe(1);
    const mid = measure('rtt100j30', { fire: true });
    expect(mid.rewind.checks).toBeGreaterThan(300);
    expect(mid.rewind.unclampedAgreement).toBe(1);
    expect(mid.rewind.claimTicks.p50).toBe(8);
    expect(mid.rewind.appliedTicks.max).toBe(6);
    expect(mid.rewind.clampedFraction).toBeGreaterThan(0.9);
    expect(mid.rewind.agreement).toBeGreaterThan(0.6);
    expect(mid.rewind.agreement).toBeLessThan(TARGETS.rewindAgreement);
    for (const peer of mid.peers) {
      // The director's own PING-echo RTT, and the cap it gives.
      expect(peer.net.serverRttMs).toBeGreaterThan(90);
      expect(peer.net.serverRttMs).toBeLessThan(140);
      expect(peer.net.rewindCap).toBe(6);
    }
  });
});

describe('§R.8 targets (pending: later PRs turn these on)', () => {
  it('S1: rtt0 late inputs < 1% and real input on >= 99% of ticks', () => {
    const report = measure('rtt0');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.appliedFraction).toBeGreaterThanOrEqual(0.99);
    }
  });

  for (const name of ['rtt100j30', 'rtt150']) {
    it(`S1: ${name} late inputs < 1% and real input on >= 99% of ticks once inputs can arrive`, () => {
      const report = measure(name);
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.steadyAppliedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });

    it(`S1: ${name} over a full-length match, late < 1% and real input on >= 99% of all ticks`, () => {
      const report = measure(name, { durationMs: 85000 });
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.appliedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });

    // S1 measured 98.67% (444/450): the clock started on the last READY. S2a's lead-in fixes it.
    it(`S2a: ${name} real input on >= 99% of all ticks of a 15 s window`, () => {
      const report = measure(name);
      for (const peer of report.peers) expect(peer.appliedFraction).toBeGreaterThanOrEqual(0.99);
    });
  }

  it('S2a: stall bursts cause no reject storm and no stall forfeit', () => {
    const report = measure('stallBurst');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.rejectFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.appliedFraction).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('S2a: a client that rejoins on a new session id keeps its seat and keeps playing', () => {
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

  // With 30 Hz snapshots (S2a) both counts sit at ~1.0% at RTT 100±30, right on the gate: the
  // first 100 ms of the match are held. S3's adaptive delay and extrapolation decide it.
  it.skip('S3: RTT 100±30 ms remote starvation < 1% of frames', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) {
      expect(peer.starvedFraction).toBeLessThan(TARGETS.starvedFraction);
      expect(peer.clientStarvedFraction).toBeLessThan(TARGETS.starvedFraction);
    }
  });

  // S2b measured 0.6954 here (see 'S2b rewind' above): the clamp, not the rewind, decides it.
  // Turning this on needs a smaller claim (S3: adaptive delay, tighter lead) or a wider cap.
  it.skip('S2b/S3: RTT 100±30 ms rewind hit agreement >= 98%', () => {
    const report = measure('rtt100j30', { fire: true });
    expect(report.rewind.checks).toBeGreaterThan(0);
    expect(report.rewind.agreement).toBeGreaterThanOrEqual(TARGETS.rewindAgreement);
  });
});
