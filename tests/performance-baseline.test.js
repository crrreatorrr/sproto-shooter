import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import hashes from './fixtures/baseline-hashes.json';
import profile from './fixtures/load-profile.json';
import { GATE, GROWTH, MEASURED, evaluate } from '../scripts/check-budgets.mjs';
import { summarizeRuns } from '../scripts/load-profile.mjs';

const LOCKED_HASHES = {
  waves: {
    11: { 600: 'f7986cea', 3000: '7464bac2', 6000: 'cbe61fc3' },
    12: { 600: 'f29d4caf', 3000: '3965d05e', 6000: '3af76c81' },
    13: { 600: 'fbbf7387', 3000: '621c6d4a', 6000: '61b202e0' },
  },
  sandbox: {
    21: { 600: '031b0c8f', 3000: '81d08173', 6000: '7c8d0da9' },
  },
};

describe('sim hashes', () => {
  it('matches the accepted main lock', () => {
    expect(hashes).toEqual(LOCKED_HASHES);
  });
});

describe('budget pins', () => {
  it('keeps the plan caps now that the measured load is under them', () => {
    expect(MEASURED.titleShellGzipBytes).toBeLessThanOrEqual(150 * 1024);
    expect(MEASURED.staticShipBytes).toBeLessThanOrEqual(28 * 1024 * 1024);
    expect(MEASURED.criticalTransferBytes).toBeLessThanOrEqual(6 * 1024 * 1024);
    expect(MEASURED.criticalFirstPartyRequests).toBeLessThanOrEqual(20);
    expect(GATE.titleShellGzipBytes).toBe(150 * 1024);
    expect(GATE.staticShipBytes).toBe(28 * 1024 * 1024);
    expect(GATE.criticalTransferBytes).toBe(6 * 1024 * 1024);
    expect(GATE.criticalRequests).toBe(20);
    expect(GATE.glbBytes).toBe(3 * 1024 * 1024);
    expect(GATE.textureMaxEdge).toBe(1024);
    expect(GATE.decodedBytes).toBe(MEASURED.decodedBytes);
    expect(GROWTH).toBe(0.05);
  });

  it('accepts the current dist when it has been built', () => {
    if (!fs.existsSync('dist/index.html')) return;
    const result = evaluate('dist');
    expect(result.violations).toEqual([]);
    expect(result.measured.criticalTransferBytes).toBeLessThanOrEqual(GATE.criticalTransferBytes);
    expect(result.measured.criticalRequests).toBeLessThanOrEqual(GATE.criticalRequests);
    expect(result.measured.titleShellGzipBytes).toBeLessThanOrEqual(GATE.titleShellGzipBytes);
    expect(result.measured.staticShipBytes).toBeLessThanOrEqual(GATE.staticShipBytes);
  });
});

describe('load profile', () => {
  it('identifies browser, device, source, and cold/warm runs', () => {
    expect(profile.schema).toBe('sproto-shooter.load-profile.v1');
    expect(profile.runs.length).toBeGreaterThanOrEqual(3);
    expect(profile.browser.name).toBe('chromium');
    expect(profile.browser.version).toBeTruthy();
    expect(profile.device.userAgent).toBeTruthy();
    expect(profile.source.baselineCommit).toBe('8a5676ed24700dafd15a759c1e2fa71b470180b9');
    expect(profile.source.generatedFromCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(profile.conditions.cold.cache).toBe('disabled');
    expect(profile.conditions.warm.cache).toBe('enabled');
    expect(profile.syntheticProfile.downMbps).toBe(10);
    expect(profile.syntheticProfile.rttMs).toBe(100);
    expect(profile.syntheticProfile.cpuSlowdown).toBe(4);
    for (const run of profile.runs) {
      expect(run.cold.condition).toBe('cold');
      expect(run.warm.condition).toBe('warm');
      expect(run.cold.waterfall.length).toBeGreaterThan(0);
      expect(run.warm.waterfall.length).toBeGreaterThan(0);
      expect(run.cold.perf.frames).toBeGreaterThan(0);
      expect(run.warm.perf.frames).toBeGreaterThan(0);
      expect(typeof run.cold.perf.p95Ms).toBe('number');
      expect(run.warm.transferBytes).toBeLessThan(run.cold.transferBytes);
    }
  });

  it('stores a nearest-rank median and keeps frame timings advisory', () => {
    expect(profile.gates.bytes).toBe(true);
    expect(profile.gates.frameTimings).toBe(false);
    expect(profile.hardwareTiming.advisory).toBe(true);
    expect(profile.hardwareTiming.ciGate).toBe(false);
    expect(profile.browser.gl).toBe('swiftshader');
    expect(profile.summary).toEqual(summarizeRuns(profile.runs));
    expect(profile.summary.aggregator).toContain('percentile');
    expect(profile.bytes.criticalTransferBytes).toBe(MEASURED.criticalTransferBytes);
    expect(profile.bytes.criticalTransferBytes).toBeLessThanOrEqual(GATE.criticalTransferBytes);
    expect(profile.bytes.titleShellGzipBytes).toBe(MEASURED.titleShellGzipBytes);
  });

  it('ships the cold and warm title screenshots', () => {
    for (const file of [profile.screenshots.cold, profile.screenshots.warm]) {
      const stat = fs.statSync(file);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });
});
