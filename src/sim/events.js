// @ts-check
// Gameplay events. Written by sim systems during a tick; consumed by progression (in-sim) and presentation (after tick).
// `type` and `tick` are written last so a payload field can never overwrite them.
export function emit(state, type, payload = {}) {
  state.events.push({ ...payload, type, tick: state.tick });
}
