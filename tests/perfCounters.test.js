import { describe, it, expect } from 'vitest';
import { createPerfCounters, percentile } from '../src/render/debug/perfCounters.js';

const sample = (frameMs, extra = {}) => ({
  frameMs, simMs: 1, renderCpuMs: 2, hudMs: 0.2, ticks: 1, gpuMs: null, ...extra,
});

describe('perf counters', () => {
  it('uses nearest-rank percentiles', () => {
    expect(percentile([10, 20, 30, 40, 100], 0.95)).toBe(100);
    expect(percentile([10, 20, 30, 40, 100], 0.5)).toBe(30);
    expect(percentile([], 0.95)).toBe(0);
  });

  it('windows the report by timestamp', () => {
    const c = createPerfCounters();
    for (let i = 0; i < 10; i++) c.push(sample(10), 1000 + i * 16);
    c.push(sample(40, { simMs: 3, renderCpuMs: 8, gpuMs: 4 }), 5000);
    const r = c.report(1, 5000);
    expect(r.frames).toBe(1);
    expect(r.maxMs).toBe(40);
    expect(r.avgFps).toBeCloseTo(25);
    expect(r.framesOver20ms).toBe(1);
    expect(r.framesOver50ms).toBe(0);
    expect(r.simMaxMs).toBe(3);
    expect(r.simAvgMs).toBe(3);
    expect(r.renderAvgMs).toBe(8);
    expect(r.gpuAvgMs).toBe(4);
    expect(r.p95Ms).toBe(40);
    expect(r.p99Ms).toBe(40);
  });

  it('keeps the newest 240 samples', () => {
    const c = createPerfCounters();
    for (let i = 0; i < 300; i++) c.push(sample(i), i);
    const r = c.report(10000, 299);
    expect(r.frames).toBe(240);
    expect(r.maxMs).toBe(299);
    const tail = c.tail(3);
    expect(tail.map((s) => s.frameMs)).toEqual([297, 298, 299]);
  });
});
