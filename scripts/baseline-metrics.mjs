/** B-M0 reporting only: independent of the game and its deterministic simulation. */
export function summarizeFrames(frames) {
  if (!frames.length || frames.some((n) => !Number.isFinite(n) || n <= 0)) throw new Error('Expected positive frame durations');
  const sorted = [...frames].sort((a, b) => a - b);
  const avgMs = frames.reduce((a, b) => a + b, 0) / frames.length;
  return { samples: frames.length, avgMs, fps: 1000 / avgMs, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], maxMs: sorted.at(-1) };
}

export function summarizeNetwork(responses) {
  const assets = responses.filter((r) => new URL(r.url).pathname.startsWith('/assets/') && !/\.(js|css)$/.test(new URL(r.url).pathname));
  return { requests: responses.length, transferBytes: responses.reduce((n, r) => n + r.bytes, 0), assetRequests: assets.length, assetTransferBytes: assets.reduce((n, r) => n + r.bytes, 0), assets };
}
