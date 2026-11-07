// @ts-check
// Presentation randomness. Math.random() unless the QA harness seeds it.
// The sim never imports this; it keeps using state.rng.
import { createRng, float } from '../../core/rng.js';

/** @type {ReturnType<typeof createRng> | null} */
let rng = null;

export function fxRandom() {
  return rng ? float(rng) : Math.random();
}

/** @param {number} seed */
export function seedFxRandom(seed) {
  rng = createRng(seed >>> 0);
}

export function clearFxRandom() { rng = null; }
