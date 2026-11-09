// Client timing for the arena (SHOOTER-S3). Pure: no DOM, no clock of its own.
//
// - Adaptive remote interpolation delay. D = clamp(snapshot interval + 2 x jitter p95, 50, 150 ms).
//   Jitter is the lateness of each snapshot behind the least-delayed one in the client's clock
//   window (what a jitter buffer has to absorb). D slews toward its target, faster up than
//   down, so the remote player's clock never jumps.
// - Input clock trim. The client keeps a target input lead in ticks; instead of skipping or
//   repeating frames it runs its 30 Hz input clock up to 5% fast or slow until the stamped lead
//   reaches it (Overwatch-style). Only an error past `resyncTicks` snaps.

/** Tuning. Nothing here is part of the wire contract. */
export const TIMING = Object.freeze({
  interpMinMs: 50,
  interpMaxMs: 150,
  /** Snapshots (30 Hz) in the jitter window: 3 s. */
  interpWindow: 90,
  /** D may rise by this many ms per ms of render time (the remote clock runs at 0.8x)... */
  interpUpPerMs: 0.2,
  /** ...and fall by this many (the remote clock runs at 1.05x). */
  interpDownPerMs: 0.05,
  /** The input clock runs at 1 +- rateMax. */
  rateMax: 0.05,
  /** Clock rate change per tick of lead error. */
  rateGainPerTick: 0.05,
  /** No trim while the lead is this close to the target. */
  rateDeadbandTicks: 0.1,
  /** Lead errors past this many ticks resync the frame stamp instead of trimming. */
  resyncTicks: 3,
});

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank];
}

export function median(values) {
  return percentile(values, 50);
}

/** D for a snapshot interval and a jitter p95, both in ms. */
export function interpTarget(intervalMs, jitterP95Ms) {
  const d = intervalMs + 2 * jitterP95Ms;
  if (!Number.isFinite(d)) return TIMING.interpMaxMs;
  return Math.max(TIMING.interpMinMs, Math.min(TIMING.interpMaxMs, d));
}

/**
 * The adaptive delay. observe(lateMs, gapMs) once per snapshot: its lateness behind the
 * least-delayed packet and the time since the previous one. step(dtMs) once per render frame.
 */
export function createInterpDelay({ initialMs = 100, window = TIMING.interpWindow } = {}) {
  const lates = [];
  const gaps = [];
  let value = Math.max(TIMING.interpMinMs, Math.min(TIMING.interpMaxMs, initialMs));
  let target = value;
  let jitter = null;
  let interval = null;

  function refresh() {
    jitter = percentile(lates, 95);
    interval = gaps.length ? median(gaps) : null;
    target = interpTarget(interval ?? 1000 / 30, jitter ?? 0);
  }

  return {
    observe(lateMs, gapMs) {
      if (Number.isFinite(lateMs)) {
        lates.push(Math.max(0, lateMs));
        if (lates.length > window) lates.shift();
      }
      if (Number.isFinite(gapMs) && gapMs > 0) {
        gaps.push(gapMs);
        if (gaps.length > window) gaps.shift();
      }
      refresh();
    },
    step(dtMs) {
      const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
      if (target > value) value = Math.min(target, value + dt * TIMING.interpUpPerMs);
      else if (target < value) value = Math.max(target, value - dt * TIMING.interpDownPerMs);
      return value;
    },
    get valueMs() { return value; },
    get targetMs() { return target; },
    get jitterP95Ms() { return jitter; },
    get intervalMs() { return interval; },
  };
}

/**
 * Input clock rate for a lead error in ticks (target lead - stamped lead). Positive: the client
 * is too close to the server's cursor and runs fast. Clamped to 1 +- TIMING.rateMax.
 */
export function clockRate(errorTicks) {
  if (!Number.isFinite(errorTicks) || Math.abs(errorTicks) < TIMING.rateDeadbandTicks) return 1;
  const adjust = Math.max(-TIMING.rateMax, Math.min(TIMING.rateMax, errorTicks * TIMING.rateGainPerTick));
  return 1 + adjust;
}
