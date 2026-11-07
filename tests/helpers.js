import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
export const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });
export function run(state, n, make = (_state, _i) => cmd()) {
  const all = [];
  for (let i = 0; i < n; i++) {
    const p = state.players[state.localPlayerId];
    simulate(state, { [p.id]: make(state, i) });
    all.push(...state.events);
  }
  return all;
}
export { createGameState, simulate };
