// @ts-check
// Presentation clock. performance.now() in play; a frozen value under the QA harness.

let frozen = /** @type {number | null} */ (null);

export function now() {
  return frozen == null ? performance.now() : frozen;
}

/** @param {number | null} t */
export function freezeAt(t) { frozen = t; }

export function createClock() {
  let last = now();
  return {
    now,
    reset() { last = now(); },
    tick() {
      const t = now();
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      return { now: t, dt };
    },
  };
}
