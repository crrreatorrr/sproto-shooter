// @ts-check
// Analytic damped spring. Stable at the frame steps the viewmodel will use.

/**
 * @param {number} [hz]
 * @param {number} [zeta]
 */
export function createSpring(hz = 10, zeta = 0.7) {
  const state = { x: 0, v: 0 };
  return {
    get x() { return state.x; },
    get v() { return state.v; },
    reset(x = 0, v = 0) { state.x = x; state.v = v; },
    /** @param {number} target @param {number} dt */
    step(target, dt) { return stepSpring(state, target, dt, hz, zeta); },
  };
}

/**
 * @param {{ x: number, v: number }} state
 * @param {number} target
 * @param {number} dt
 * @param {number} [hz]
 * @param {number} [zeta]
 */
export function stepSpring(state, target, dt, hz = 10, zeta = 0.7) {
  if (dt <= 0) return state.x;
  const w = hz * 2 * Math.PI;
  const x = state.x - target;
  const v = state.v;
  const exp = Math.exp(-zeta * w * dt);
  if (zeta < 1) {
    const wd = w * Math.sqrt(1 - zeta * zeta);
    const cos = Math.cos(wd * dt);
    const sin = Math.sin(wd * dt);
    const c2 = (v + zeta * w * x) / wd;
    state.x = target + exp * (x * cos + c2 * sin);
    state.v = exp * ((c2 * wd - x * zeta * w) * cos - (x * wd + c2 * zeta * w) * sin);
  } else {
    const c2 = v + w * x;
    state.x = target + exp * (x + c2 * dt);
    state.v = exp * (v - w * (x + c2 * dt) + c2);
  }
  return state.x;
}
