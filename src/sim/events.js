// Gameplay events. Written by sim systems during a tick; consumed by progression (in-sim) and presentation (after tick).
export function emit(state, type, payload = {}) {
  state.events.push({ type, tick: state.tick, ...payload });
}
