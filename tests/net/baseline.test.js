// SHOOTER-S0 baseline, updated by SHOOTER-S1 and SHOOTER-S2a. PvP netcode measured on the
// harness, plus the §R.8 launch gates.
//
// The "documents current behaviour" tests pin how it behaves today, so the suite stays green.
// When a PR fixes one, update that block and turn on (it.skip -> it) the pending test it names.
//   S1  client 30 Hz input clock + adaptive input lead + one send per tick   (done: on below)
//   S2a director v2: rejoin via HELLO, lead-in, late-accept-discard, hold-last, frame caps (done)
//   S2b viewTick rewind (sim 2): the harness scores rewind agreement; the >= 98% gate is on (done)
//   S3  prediction, adaptive interpolation -> correction p99, rewind, starvation
//
// Before S1 (protocol 1, inputs stamped with the last snapshot tick): RTT 0 applied real input on
// 1 tick in 3, and RTT 100±30 / 150 rejected every input and ended both_stall at 10 s.
// Before S2a (S1 client, director v1): RTT 100±30 / 150 applied 98.67% of the 15 s window (the
// first round trip of ticks had no input), stall bursts rejected ~80 inputs per seat as
// `sequence` echoes and applied 79-80%, and a rejoin on a new session id forfeited on stall.
//
// The window starts at tick 0, after the director's live-start lead-in.
//
// The harness is the realistic one (netsim.js REALISM): client clock offset and drift, a jittered
// Nakama loop with pauses, ~130 B envelopes. `queued` counts frames the director accepted for a
// tick it has stepped; `directorApplied` is what the director itself says it applied.
//
// Set NETSIM_REPORT=1 to print the measured numbers.
import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../../src/sim/pvp/rules.js';
import { hashState, replay, scriptedMatch } from '../../src/sim/pvp/sim.js';
import { NET } from '../../src/net/client.js';
import { STEP_MS } from '../../src/sim/pvp/rules.js';
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
          applied: p.queuedFraction,
          directorApplied: p.directorApplied,
          directorHeld: p.directorHeld,
          directorNeutral: p.directorNeutral,
          steady: p.steadyQueuedFraction,
          directorAppliedFraction: p.directorAppliedFraction,
          leadTrace: p.leadTrace.length > 12 ? `${p.leadTrace.length} changes` : p.leadTrace,
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
  it('keeps the PvP golden 6545ca0a and both fingerprints', () => {
    const state = replay(scriptedMatch(7, 180));
    // Sim 2 (SHOOTER-S2b) is a deliberate golden bump from ce272de1 (sim 1).
    expect(hashState(state)).toBe('6545ca0a');
    // Fingerprints: f5949631 (protocol 1) -> 0e584d36 (S2a) -> ec36c8fa (S2b, sim 2).
    expect(CONTENT_FINGERPRINT).toBe('ec36c8fa');
    expect(contentFingerprint(1)).toBe('3c657fb5');
  });
});

describe('baseline: documents current behaviour (S1 client, director v2)', () => {
  for (const name of ['rtt0', 'rtt100j30', 'rtt150']) {
    it(`${name}: no rejects, no late frames, real input on every tick from tick 0`, () => {
      const report = measure(name);
      expect(report.result).toBeNull();
      // The jittered loop's last callback lands a tick or two either side of 15 s.
      expect(report.ticks).toBeGreaterThanOrEqual(448);
      expect(report.ticks).toBeLessThanOrEqual(450);
      for (const peer of report.peers) {
        expect(peer.rejectTotal).toBe(0);
        expect(peer.lateFraction).toBe(0);
        // The lead-in lets the first inputs reach the director before tick 0.
        expect(peer.firstInputCursor).toBe(0);
        expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
        expect(peer.directorAppliedFraction).toBeGreaterThanOrEqual(0.99);
        // The lead starts at the PING round trip in ticks plus one; the buffer trim may take
        // a tick back.
        const start = { rtt0: 2, rtt100j30: 5, rtt150: 6 }[name];
        expect(peer.net.lead).toBeLessThanOrEqual(start);
        expect(peer.net.lead).toBeGreaterThanOrEqual(start - 1);
        // One snapshot per tick, per recipient (33.3 ms on a perfect loop; the jittered loop's
        // callbacks wander 0-15 ms).
        expect(peer.snapshotInterArrivalMs.p50).toBeGreaterThan(30);
        expect(peer.snapshotInterArrivalMs.p50).toBeLessThan(40);
      }
    });
  }

  it('RTT 100±30 ms: 30 Hz snapshots bring client extrapolation down to ~1% at a fixed 100 ms delay', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) {
      expect(peer.starvedFraction).toBeLessThanOrEqual(TARGETS.starvedFraction);
      // S1 at 10 Hz: 21-26% (ideal loop 13-17%). The first 100 ms of the match are always held
      // (no older snapshot), and loop pauses delay a few snapshots past the delay.
      expect(peer.clientStarvedFraction).toBeLessThanOrEqual(0.02);
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
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.9);
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
  // agrees. The director's cap is min(10 ticks, its own RTT + the client's announced
  // interpolation delay + 2 ticks) (review decision: an honest claim is about uplink lead +
  // downlink + interpolation delay + input buffer, i.e. RTT + D + a tick or two; the first draft's
  // min(6, RTT/2 + D + 1) clipped 97% of claims at RTT 100 and scored 69.5%).
  it('S2b rewind: exact at the claim, and the per-seat cap covers honest claims', () => {
    const zero = measure('rtt0', { fire: true });
    expect(zero.rewind.checks).toBeGreaterThan(300);
    expect(zero.rewind.agreement).toBeGreaterThanOrEqual(TARGETS.rewindAgreement);
    expect(zero.rewind.unclampedAgreement).toBe(1);
    for (const name of ['rtt100j30', 'rtt150']) {
      const report = measure(name, { fire: true });
      expect(report.rewind.checks).toBeGreaterThan(300);
      expect(report.rewind.unclampedAgreement).toBe(1);
      // Only the first second (no RTT sample yet: cap 5) clamps.
      expect(report.rewind.clampedFraction).toBeLessThan(0.05);
      expect(report.rewind.appliedTicks.max).toBeLessThanOrEqual(10);
    }
    const mid = measure('rtt100j30', { fire: true });
    expect(mid.rewind.claimTicks.p50).toBe(8);
    for (const peer of mid.peers) {
      // The director's own PING-echo RTT, and the cap it gives with the announced 100 ms delay.
      expect(peer.net.serverRttMs).toBeGreaterThan(90);
      expect(peer.net.serverRttMs).toBeLessThan(140);
      expect(peer.net.rewindCap).toBeGreaterThanOrEqual(8);
      expect(peer.net.rewindCap).toBeLessThanOrEqual(10);
    }
  });
});

describe('§R.8 targets (pending: later PRs turn these on)', () => {
  it('S1: rtt0 late inputs < 1% and real input on >= 99% of ticks', () => {
    const report = measure('rtt0');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
    }
  });

  for (const name of ['rtt100j30', 'rtt150']) {
    it(`S1: ${name} late inputs < 1% and real input on >= 99% of ticks once inputs can arrive`, () => {
      const report = measure(name);
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.steadyQueuedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });

    it(`S1: ${name} over a full-length match, late < 1% and real input on >= 99% of all ticks`, () => {
      const report = measure(name, { durationMs: 85000 });
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });

    // S1 measured 97.1% / 98.66% on the realistic harness (98.67% on the ideal loop): the clock
    // started on the last READY, and v1's 4-frame window rejected frames after loop pauses.
    // S2a's lead-in and 8-frame window fix it. Checked on what the director really applied.
    it(`S2a: ${name} real input on >= 99% of all ticks of a 15 s window`, () => {
      const report = measure(name);
      for (const peer of report.peers) {
        expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
        expect(peer.directorAppliedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });
  }

  it('S1/S2a: after an RTT spike (300 ms for 3 s, then 80 ms) the input buffer comes back within ~2 s', () => {
    const report = measure('rttSpike');
    const spike = PROFILES.rttSpike.spikes[0];
    const spikeEnd = spike.atMs + spike.forMs;
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      // How far ahead of the cursor inputs arrive (the server-side input buffer), per 500 ms.
      const worst = (from, to) => Math.max(...peer.aheadSamples.filter(([at]) => at >= from && at < to).map(([, a]) => a));
      const calm = worst(spike.atMs - 2000, spike.atMs);
      for (let at = spikeEnd + 2000; at < DURATION_MS - 500; at += 500) {
        expect(worst(at, at + 500)).toBeLessThanOrEqual(calm + 1);
      }
      // And the client's own lead ends no higher than the round-trip lead plus the jitter margin.
      const roundTripLead = Math.ceil(peer.net.rttMs / STEP_MS) + 1;
      expect(peer.net.lead).toBeLessThanOrEqual(roundTripLead + NET.leadJitterTicks);
    }
  });

  it('S2a: heavy-tail jitter causes no reject storm and no stall forfeit', () => {
    const report = measure('heavyTail');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.rejectFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('S2a: stall bursts cause no reject storm and no stall forfeit', () => {
    const report = measure('stallBurst');
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.rejectFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.9);
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

  // On since SHOOTER-S2b's cap fix (min(10, RTT + D + 2 ticks)). RTT 150 is measured too: the
  // wagered RTT gate. Both rays start at the server's eye (no client prediction yet), so this
  // only compares the drawn target with the rewound one: it mostly measures "the rewind claim
  // was not clamped". S3 casts the client ray from the predicted eye.
  it('S2b: RTT 100±30 ms rewind hit agreement >= 98%', () => {
    const report = measure('rtt100j30', { fire: true });
    expect(report.rewind.checks).toBeGreaterThan(0);
    expect(report.rewind.agreement).toBeGreaterThanOrEqual(TARGETS.rewindAgreement);
  });

  it('S2b: RTT 150 ms rewind hit agreement >= 98%', () => {
    const report = measure('rtt150', { fire: true });
    expect(report.rewind.checks).toBeGreaterThan(0);
    expect(report.rewind.agreement).toBeGreaterThanOrEqual(TARGETS.rewindAgreement);
  });
});
