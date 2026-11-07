import { describe, it, expect } from 'vitest';
import { summarizeFrames, summarizeNetwork } from '../scripts/baseline-metrics.mjs';

describe('baseline measurements', () => {
  it('uses nearest-rank p95 and measures fps from elapsed time', () => {
    const frames = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(summarizeFrames(frames)).toEqual({ samples: 100, avgMs: 50.5, fps: 1000/50.5, p95Ms: 95, maxMs: 100 });
    expect(frames[0]).toBe(1);
    expect(() => summarizeFrames([])).toThrow();
    expect(() => summarizeFrames([0])).toThrow();
  });
  it('counts cold asset transfers separately from the JS and CSS bundles', () => {
    const responses = [
      { url: 'http://localhost/assets/index.js', bytes: 20 },
      { url: 'http://localhost/assets/index.css', bytes: 10 },
      { url: 'http://localhost/assets/models/midget.glb', bytes: 100 },
      { url: 'http://localhost/assets/textures/city.jpg', bytes: 50 },
      { url: 'http://localhost/', bytes: 5 },
    ];
    expect(summarizeNetwork(responses)).toMatchObject({ requests: 5, transferBytes: 185, assetRequests: 2, assetTransferBytes: 150 });
  });
});
