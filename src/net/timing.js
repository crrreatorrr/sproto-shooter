// Client timing for the arena (SHOOTER-S3). Pure: no DOM, no clock of its own.
//
// - Adaptive remote interpolation delay. D = clamp(snapshot interval + 2 x jitter p95, 50, 150 ms),
//   and at least one tick plus the p95 lateness of the first tick each snapshot makes drawable.
//   Jitter is how late each snapshot's tick arrives on the client's estimated server clock (the
//   least-delayed packet in its window): network jitter plus the server loop running behind.
//   A late loop callback steps two ticks and sends one snapshot; the second term covers the
//   tick it skipped. D slews toward its target, faster up than down, so the remote player's
//   clock never jumps.
// - Input clock trim. The client keeps a target input lead in ticks; instead of skipping or
//   repeating frames it runs its 30 Hz input clock up to 5% fast or slow until the stamped lead
//   reaches it (Overwatch-style). Only big errors resync: see resyncTicks, lateResyncTicks and
//   holdTicks.

import { STEP_MS } from '../sim/pvp/rules.js';

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
  /**
   * While the server reports late frames, a stamped lead this far under the target jumps up at
   * once: each late frame is input lost already, so one skipped frame costs less than trimming.
   */
  lateResyncTicks: 1.5,
  /**
   * A stamped lead this far over the target (a big drop: an RTT spike's raises capped, a deep
   * server buffer trimmed) repeats the previous frame each tick until the trim can take the rest.
   */
  holdTicks: 1.5,
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

/**
 * D for a snapshot interval and a jitter p95, both in ms; `stepLateP95Ms`, the p95 lateness of
 * the first newly drawable tick per snapshot, sets a floor of one tick more than it.
 */
export function interpTarget(intervalMs, jitterP95Ms, stepLateP95Ms = null) {
  let d = intervalMs + 2 * jitterP95Ms;
  if (Number.isFinite(stepLateP95Ms)) d = Math.max(d, STEP_MS + stepLateP95Ms);
  if (!Number.isFinite(d)) return TIMING.interpMaxMs;
  return Math.max(TIMING.interpMinMs, Math.min(TIMING.interpMaxMs, d));
}

/**
 * The adaptive delay. observe(lateMs, gapMs, stepLateMs) once per snapshot: its lateness behind
 * the least-delayed packet, the time since the previous one, and (optional) the lateness of the
 * first tick it makes drawable. step(dtMs) once per render frame.
 */
export function createInterpDelay({ initialMs = 100, window = TIMING.interpWindow } = {}) {
  const lates = [];
  const gaps = [];
  const stepLates = [];
  let value = Math.max(TIMING.interpMinMs, Math.min(TIMING.interpMaxMs, initialMs));
  let target = value;
  let jitter = null;
  let interval = null;
  let stepLate = null;

  function refresh() {
    jitter = percentile(lates, 95);
    interval = gaps.length ? median(gaps) : null;
    stepLate = percentile(stepLates, 95);
    target = interpTarget(interval ?? STEP_MS, jitter ?? 0, stepLate);
  }

  return {
    observe(lateMs, gapMs, stepLateMs = null) {
      if (Number.isFinite(lateMs)) {
        lates.push(Math.max(0, lateMs));
        if (lates.length > window) lates.shift();
      }
      if (Number.isFinite(stepLateMs)) {
        stepLates.push(Math.max(0, stepLateMs));
        if (stepLates.length > window) stepLates.shift();
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
    get stepLateP95Ms() { return stepLate; },
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
