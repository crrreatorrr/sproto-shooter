// The harness itself: virtual clock, TCP link model, determinism, new-session reconnects.
import { describe, expect, it } from 'vitest';
import {
  PROFILES, createRng, createScheduler, createTcpLink, runScenario, wireBytes,
} from './netsim.js';
import { createMetrics, percentile } from './metrics.js';

function linkRig(profile, seed = 5) {
  const scheduler = createScheduler();
  const got = [];
  const link = createTcpLink({
    scheduler,
    rng: createRng(seed),
    profile,
    horizonMs: 60000,
    deliver: (payload) => got.push({ at: scheduler.now, payload }),
  });
  return { scheduler, link, got };
}

describe('virtual clock and rng', () => {
  it('is seeded and reproducible', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const sa = Array.from({ length: 8 }, () => a.next());
    expect(Array.from({ length: 8 }, () => b.next())).toEqual(sa);
    expect(Array.from({ length: 8 }, () => c.next())).not.toEqual(sa);
    for (const v of sa) expect(v >= 0 && v < 1).toBe(true);
  });

  it('runs events in time order, then in scheduling order', () => {
    const s = createScheduler();
    const order = [];
    s.at(20, () => order.push('b'));
    s.at(10, () => order.push('a'));
    s.at(20, () => order.push('c'));
    s.at(10, () => s.after(0, () => order.push('a2')));
    let ticks = 0;
    s.every(5, () => { ticks += 1; return ticks < 3; });
    s.runUntil(100);
    expect(order).toEqual(['a', 'a2', 'b', 'c']);
    expect(ticks).toBe(3);
    expect(s.now).toBe(100);
  });

  it('percentiles use nearest rank', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 99)).toBe(100);
  });
});

describe('TCP link model', () => {
  it('adds latency and jitter but keeps order and never drops', () => {
    const { scheduler, link, got } = linkRig({ latencyMs: 50, jitterMs: 15 });
    for (let i = 0; i < 300; i++) scheduler.at(i * 5, () => link.send(100, i));
    scheduler.runUntil(10000);
    expect(got.map((g) => g.payload)).toEqual(Array.from({ length: 300 }, (_, i) => i));
    expect(link.stats).toMatchObject({ sent: 300, delivered: 300, lostToReset: 0 });
    for (let i = 0; i < got.length; i++) {
      const delay = got[i].at - i * 5;
      expect(delay).toBeGreaterThanOrEqual(35 - 1e-9);
      if (i > 0) expect(got[i].at).toBeGreaterThanOrEqual(got[i - 1].at);
    }
    expect(new Set(got.map((g) => Math.round(g.at - got.indexOf(g) * 5))).size).toBeGreaterThan(5);
  });

  it('turns loss into a head-of-line stall and then a burst', () => {
    const { scheduler, link, got } = linkRig({
      latencyMs: 40, jitterMs: 0, stall: { everyMs: 1000, minMs: 300, maxMs: 300 },
    });
    expect(link.stalls.length).toBeGreaterThan(10);
    for (let i = 0; i < 1000; i++) scheduler.at(i * 10, () => link.send(80, i));
    scheduler.runUntil(20000);
    expect(link.stats.delivered).toBe(1000);
    expect(link.stats.stalled).toBeGreaterThan(50);
    expect(got.map((g) => g.payload)).toEqual(Array.from({ length: 1000 }, (_, i) => i));
    const [start, end] = link.stalls.find(([s]) => s > 100 && s < 9000);
    const burst = got.filter((g) => Math.abs(g.at - (end + 40)) < 1e-6);
    expect(burst.length).toBeGreaterThanOrEqual(Math.floor((end - start) / 10) - 1);
    const gapBefore = got.filter((g) => g.at > start + 40 && g.at < end + 40);
    expect(gapBefore).toEqual([]);
  });

  it('queues behind a bandwidth cap', () => {
    const { scheduler, link, got } = linkRig({ latencyMs: 10, bandwidth: 1000 });
    scheduler.at(0, () => { for (let i = 0; i < 10; i++) link.send(100, i); });
    scheduler.runUntil(5000);
    expect(got.map((g) => g.at)).toEqual(Array.from({ length: 10 }, (_, i) => (i + 1) * 100 + 10));
    expect(wireBytes(16)).toBe(24 + 64);
  });

  it('loses only what was in flight when the connection resets', () => {
    const { scheduler, link, got } = linkRig({ latencyMs: 100 });
    scheduler.at(0, () => link.send(10, 'lost'));
    scheduler.at(50, () => link.reset());
    scheduler.at(60, () => link.send(10, 'kept'));
    scheduler.runUntil(1000);
    expect(got.map((g) => g.payload)).toEqual(['kept']);
    expect(link.stats.lostToReset).toBe(1);
  });
});

describe('scenario runner', () => {
  it('drives the real clients and director to live and is deterministic', () => {
    const a = runScenario({ seed: 9, profile: PROFILES.rtt100j30, durationMs: 4000 });
    const b = runScenario({ seed: 9, profile: PROFILES.rtt100j30, durationMs: 4000 });
    const c = runScenario({ seed: 10, profile: PROFILES.rtt100j30, durationMs: 4000 });
    expect(a.liveAt).not.toBeNull();
    expect(a.ticks).toBeGreaterThan(100);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(c.peers.map((p) => p.snapshotInterArrivalMs)))
      .not.toBe(JSON.stringify(a.peers.map((p) => p.snapshotInterArrivalMs)));
    expect(new Set(a.peers.map((p) => p.seat))).toEqual(new Set([0, 1]));
  });

  it('reconnects a dropped client on a new session id', () => {
    const report = runScenario({
      seed: 3, profile: PROFILES.rtt0, durationMs: 3000, disconnects: [{ peer: 0, atMs: 1000, downMs: 500 }],
    });
    const ada = report.peers[0];
    expect(ada.disconnects).toBe(1);
    expect(ada.rejoins).toBe(1);
    expect(ada.joinRefusals).toEqual([]);
    expect(report.links[0].up.sent).toBeGreaterThan(0);
  });

  it('records the S3 correction and S2b rewind metrics through hooks', () => {
    const metrics = createMetrics();
    const fakeDirector = { sim: null, result: null, seatOf: () => -1, handle: () => ({ ok: true }) };
    metrics.watchDirector(fakeDirector);
    let empty = metrics.report({ director: fakeDirector });
    expect(empty.peers[0].correctionP99Cm).toBeNull();
    expect(empty.rewind.agreement).toBeNull();
    for (let i = 0; i < 100; i++) metrics.correction(0, i === 99 ? 0.2 : 0.01);
    metrics.rewindCheck(true);
    metrics.rewindCheck(false);
    metrics.rewindClaim(8, 6, true);
    metrics.rewindClaim(5, 5, true);
    empty = metrics.report({ director: fakeDirector });
    expect(empty.peers[0].correctionP99Cm).toBe(1);
    expect(empty.rewind).toMatchObject({ checks: 2, agreement: 0.5, clampedFraction: 0.5, unclampedAgreement: 1 });
    expect(empty.rewind.claimTicks).toMatchObject({ count: 2, max: 8 });
    expect(empty.rewind.appliedTicks).toMatchObject({ count: 2, max: 6 });
  });
});
