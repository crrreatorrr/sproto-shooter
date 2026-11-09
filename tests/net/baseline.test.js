// SHOOTER-S0 baseline, updated by SHOOTER-S1. PvP netcode measured on the harness, plus the
// §R.8 launch gates.
//
// The "documents current behaviour" tests pin how it behaves today, so the suite stays green.
// When a PR fixes one, update that block and turn on (it.skip -> it) the pending test it names.
//   S1  client 30 Hz input clock + adaptive input lead + one send per tick   (done: on below)
//   S2a director v2: rejoin via HELLO, late-accept-discard, hold-last, frame caps
//   S2b/S3 viewTick rewind, prediction, adaptive interpolation -> correction p99, rewind, starvation
//
// Before S1 (protocol 1, inputs stamped with the last snapshot tick): RTT 0 applied real input on
// 1 tick in 3, and RTT 100±30 / 150 rejected every input and ended both_stall at 10 s.
//
// The harness is the realistic one (netsim.js REALISM): client clock offset and drift, a jittered
// Nakama loop with pauses, ~130 B envelopes. `queued` is what the director accepted for a tick
// it has stepped; director v1 applies exactly that.
//
// Set NETSIM_REPORT=1 to print the measured numbers.
import { describe, expect, it } from 'vitest';
import { contentFingerprint } from '../../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT, STEP_MS } from '../../src/sim/pvp/rules.js';
import { hashState, replay, scriptedMatch } from '../../src/sim/pvp/sim.js';
import { NET } from '../../src/net/client.js';
import { IDEAL, PROFILES, TARGETS, runScenario } from './netsim.js';

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
          steady: p.steadyQueuedFraction,
          firstInputCursor: p.firstInputCursor,
          lead: p.net && p.net.lead,
          leadTrace: p.leadTrace.length > 12 ? `${p.leadTrace.length} changes` : p.leadTrace,
          late: p.lateFraction,
          rejects: p.rejectsByOp,
          snapMs: p.snapshotInterArrivalMs,
          starved: p.starvedFraction,
          clientStarved: p.clientStarvedFraction,
          extrapolated: p.extrapolatedFrames,
          held: p.heldFrames,
          snapLate: p.snapshotLateFrames,
          frames: p.renderFrames,
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
  it('keeps the PvP golden ce272de1 and both fingerprints', () => {
    const state = replay(scriptedMatch(7, 180));
    expect(hashState(state)).toBe('ce272de1');
    expect(CONTENT_FINGERPRINT).toBe('f5949631');
    expect(contentFingerprint(1)).toBe('3c657fb5');
  });
});

describe('baseline: documents current behaviour (S1: client fixed, director v1)', () => {
  it('RTT 0: no late inputs, real input on every tick after the first two', () => {
    const report = measure('rtt0');
    expect(report.result).toBeNull();
    expect(report.ticks).toBe(450);
    for (const peer of report.peers) {
      // A loop pause can put one frame past v1's 4-frame window: one reject, and the lead drops.
      expect(peer.rejectTotal).toBeLessThanOrEqual(2);
      expect(peer.lateFraction).toBe(0);
      // One input per 30 Hz tick (S0: 150 in 15 s, one per snapshot).
      expect(peer.inputsSent).toBe(450);
      expect(peer.queuedFraction).toBeGreaterThan(0.99);
      expect(peer.net.lead).toBeLessThanOrEqual(2);
      expect(peer.snapshotInterArrivalMs.p50).toBeGreaterThan(95);
      expect(peer.snapshotInterArrivalMs.p50).toBeLessThan(105);
      // The remote is sampled on the clock, so it moves every frame (S0: 5 of 6 frames held).
      expect(peer.starvedFraction).toBeLessThan(0.01);
      // A jittered loop delays 10 Hz snapshots past the fixed 100 ms delay now and then
      // (ideal loop: 0.7%).
      expect(peer.clientStarvedFraction).toBeLessThan(0.2);
    }
  });

  for (const name of ['rtt100j30', 'rtt150']) {
    it(`${name}: the match runs with < 1% late, but v1's window and live start cost 1-3% of ticks`, () => {
      const report = measure(name);
      expect(report.result).toBeNull();
      expect(report.ticks).toBeGreaterThanOrEqual(449);
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        // A loop pause makes the cursor lag, so a few frames land past v1's 4-frame window.
        expect(peer.rejectTotal).toBeLessThanOrEqual(10);
        // The director starts the clock on the last READY, so ticks before the first input can
        // arrive carry none (ideal loop: 98.67% of all ticks, 99.3-99.6% steady).
        expect(peer.firstInputCursor).toBeGreaterThanOrEqual(1);
        expect(peer.queuedFraction).toBeGreaterThan(0.96);
        expect(peer.queuedFraction).toBeLessThan(0.99);
      }
    });
  }

  it('RTT 100±30: a fixed 100 ms interpolation delay extrapolates on ~20-25% of frames at 10 Hz snapshots', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) {
      // The S0 proxy (held, or newest snapshot > 150 ms old) is now under 1%...
      expect(peer.starvedFraction).toBeLessThan(TARGETS.starvedFraction);
      // ...but the client itself renders past the newest snapshot this often. S3 adapts the delay.
      // (ideal loop: 13-17%).
      expect(peer.clientStarvedFraction).toBeGreaterThan(0.1);
      expect(peer.clientStarvedFraction).toBeLessThan(0.3);
    }
  });

  it('stall bursts: the match survives, but stalled inputs arrive late and their echoes are rejected', () => {
    const report = measure('stallBurst');
    // S0: both_stall at 10 s with no input accepted.
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.inputsAccepted).toBeGreaterThan(300);
      expect(peer.lateFraction).toBeGreaterThan(TARGETS.lateFraction);
      expect(peer.lateFraction).toBeLessThan(0.02);
      // Each late frame costs the inputs already in flight behind it (protocol 1 sequence rule).
      expect(peer.rejects.sequence).toBeGreaterThan(50);
      expect(peer.queuedFraction).toBeGreaterThan(0.75);
      expect(peer.queuedFraction).toBeLessThan(0.9);
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
  // The S1 gates are the client's: measured on the ideal loop (realism: IDEAL), as when S1 was
  // written. On the realistic loop, director v1's 4-frame window rejects a few frames after loop
  // pauses (96-99% of ticks above); S2a's director turns the same gates on, realistically.
  it('S1: rtt0 late inputs < 1% and real input on >= 99% of ticks (ideal loop)', () => {
    const report = measure('rtt0', { realism: IDEAL });
    expect(report.result).toBeNull();
    for (const peer of report.peers) {
      expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
      expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
    }
  });

  for (const name of ['rtt100j30', 'rtt150']) {
    it(`S1: ${name} late inputs < 1% and real input on >= 99% of ticks once inputs can arrive (ideal loop)`, () => {
      const report = measure(name, { realism: IDEAL });
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.steadyQueuedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });

    it(`S1: ${name} over a full-length match, late < 1% and real input on >= 99% of all ticks (ideal loop)`, () => {
      const report = measure(name, { durationMs: 85000, realism: IDEAL });
      expect(report.result).toBeNull();
      for (const peer of report.peers) {
        expect(peer.lateFraction).toBeLessThan(TARGETS.lateFraction);
        expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
      }
    });

    // Needs a director change (S2a): the match clock starts on the last READY, so the first
    // ~RTT of ticks can never carry input, and v1's 4-frame window rejects frames after a loop
    // pause. Measured with S1 on the realistic harness: 97.1% at RTT 100±30, 98.66% at 150
    // (ideal loop: 98.67% for both). A live-start lead-in and a wider window fix it.
    it.skip(`S2a: ${name} real input on >= 99% of all ticks of a 15 s window`, () => {
      const report = measure(name);
      for (const peer of report.peers) expect(peer.queuedFraction).toBeGreaterThanOrEqual(0.99);
    });
  }

  it('S1: after an RTT spike (300 ms for 3 s, then 80 ms) the input buffer comes back within ~2 s', () => {
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

  // The S0 proxy (starvedFraction) already passes after S1; the client's own count of frames
  // drawn past the newest snapshot is the stricter gate, and needs S3's adaptive delay.
  it.skip('S3: RTT 100±30 ms remote starvation < 1% of frames', () => {
    const report = measure('rtt100j30');
    for (const peer of report.peers) {
      expect(peer.starvedFraction).toBeLessThan(TARGETS.starvedFraction);
      expect(peer.clientStarvedFraction).toBeLessThan(TARGETS.starvedFraction);
    }
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
