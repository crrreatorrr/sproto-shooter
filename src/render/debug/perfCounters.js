// @ts-check
// Rolling frame timings for the stats overlay and window.__sproto.perf(). Plan B §5.1.

const CAP = 240;

/**
 * @typedef {{ frameMs: number, simMs: number, renderCpuMs: number, hudMs: number, ticks: number, gpuMs: number | null }} PerfSample
 */

export function createPerfCounters() {
  const frameMs = new Float64Array(CAP);
  const simMs = new Float64Array(CAP);
  const renderCpuMs = new Float64Array(CAP);
  const hudMs = new Float64Array(CAP);
  const gpuMs = new Float64Array(CAP);
  const gpuValid = new Uint8Array(CAP);
  const stamp = new Float64Array(CAP);
  let n = 0;

  function index(back) {
    return (n - 1 - back) % CAP;
  }

  return {
    push(/** @type {PerfSample} */ sample, /** @type {number} */ now) {
      const i = n % CAP;
      frameMs[i] = sample.frameMs;
      simMs[i] = sample.simMs;
      renderCpuMs[i] = sample.renderCpuMs;
      hudMs[i] = sample.hudMs;
      gpuValid[i] = sample.gpuMs == null ? 0 : 1;
      gpuMs[i] = sample.gpuMs ?? 0;
      stamp[i] = now;
      n++;
    },
    /** Oldest → newest, for the stacked frame graph. */
    tail(count) {
      const len = Math.min(count, n, CAP);
      /** @type {{ frameMs: number, simMs: number, renderCpuMs: number, hudMs: number }[]} */
      const out = [];
      for (let back = len - 1; back >= 0; back--) {
        const i = index(back);
        out.push({
          frameMs: frameMs[i],
          simMs: simMs[i],
          renderCpuMs: renderCpuMs[i],
          hudMs: hudMs[i],
        });
      }
      return out;
    },
    /** @param {number} seconds @param {number} now */
    report(seconds, now) {
      const cutoff = now - seconds * 1000;
      const len = Math.min(n, CAP);
      /** @type {number[]} */
      const frames = [];
      /** @type {number[]} */
      const sims = [];
      /** @type {number[]} */
      const renders = [];
      let framesOver20ms = 0;
      let framesOver50ms = 0;
      let maxMs = 0;
      let simMaxMs = 0;
      let gpuSum = 0;
      let gpuN = 0;
      for (let back = 0; back < len; back++) {
        const i = index(back);
        if (stamp[i] < cutoff) break;
        const f = frameMs[i];
        frames.push(f);
        sims.push(simMs[i]);
        renders.push(renderCpuMs[i]);
        if (f > maxMs) maxMs = f;
        if (simMs[i] > simMaxMs) simMaxMs = simMs[i];
        if (f > 20) framesOver20ms++;
        if (f > 50) framesOver50ms++;
        if (gpuValid[i]) { gpuSum += gpuMs[i]; gpuN++; }
      }
      const avg = (/** @type {number[]} */ arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
      const avgMs = avg(frames);
      return {
        frames: frames.length,
        avgFps: avgMs > 0 ? 1000 / avgMs : 0,
        avgMs,
        p95Ms: percentile(frames, 0.95),
        p99Ms: percentile(frames, 0.99),
        maxMs,
        framesOver20ms,
        framesOver50ms,
        simAvgMs: avg(sims),
        simMaxMs,
        renderAvgMs: avg(renders),
        gpuAvgMs: gpuN ? gpuSum / gpuN : null,
      };
    },
  };
}

/** Nearest-rank percentile. `values` is not mutated. */
export function percentile(values, p) {
  if (!values.length) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1));
  return s[idx];
}
