import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { abyssY } from '../src/sim/campaign/abyss.js';
import { LEVELS } from '../src/data/levels/index.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot(level) {
  const s = createGameState({ seed: 5 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level }] }) });
  return { s, p };
}

describe('the abyss', () => {
  it('has a death floor under every campaign level, below everything the level is built from', () => {
    const ids = Object.keys(LEVELS).filter((id) => /^L\d\d$/.test(id));
    expect(ids.length).toBeGreaterThan(4);
    for (const id of ids) {
      const y = abyssY({ id });
      expect(Number.isFinite(y), id).toBe(true);
      expect(y, id).toBeLessThanOrEqual(-30);
    }
  });

  it('kills a player who walks off the edge instead of letting them fall forever', () => {
    const { s, p } = boot('L01');
    p.pos = { x: p.pos.x, y: 0, z: -40 }; // off the north side of the boulevard
    const events = [];
    let ticks = 0;
    for (; ticks < 1200 && !p.dead; ticks++) {
      simulate(s, { [p.id]: cmd() });
      for (const ev of s.events) events.push(ev.type);
    }
    expect(p.dead).toBe(true);
    expect(ticks).toBeLessThan(600); // seconds, not forever
    expect(events).toContain('playerFell');
    expect(events).toContain('playerDied');
    const depth = p.pos.y;
    for (let i = 0; i < 120; i++) simulate(s, { [p.id]: cmd() });
    expect(p.pos.y).toBe(depth); // and stops falling
  });

  it('leaves a player standing on the level alone', () => {
    const { s, p } = boot('L01');
    for (let i = 0; i < 240; i++) simulate(s, { [p.id]: cmd() });
    expect(p.dead).toBe(false);
    expect(p.pos.y).toBeGreaterThan(-1);
  });
});
