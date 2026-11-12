import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { getLevelRuntime } from '../src/sim/level/runtime.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot() {
  const s = createGameState({ seed: 2 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
  const section = getLevelRuntime(s.level.id).sectionById[s.level.section];
  return { s, p, section };
}

describe('campaign mechanisms', () => {
  it('a barrel blast kills a midget and hurts the player', () => {
    const { s, p, section } = boot();
    const barrel = section.mechanisms.find((m) => m.kind === 'barrel');
    p.pos = { x: barrel.at[0], y: 0, z: barrel.at[2] + 1 };
    p.prevPos = { ...p.pos };
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'debug', op: 'spawnEnemy', args: { type: 'midget', count: 1 } }] }) });
    const e = s.enemies.find((en) => !en.dead);
    e.pos = { x: barrel.at[0] + 1, y: 0, z: barrel.at[2] };
    e.state = 'chase';
    e.hp = 40;
    const pool = p.hp + p.shield;
    simulate(s, { [p.id]: cmd({ held: { fire: true } }) });
    expect(e.hp).toBeLessThan(40);
    expect(p.hp + p.shield).toBeLessThan(pool);
  });

  it('a carry mover walks the player to its end', () => {
    const { s, p, section } = boot();
    const from = [p.pos.x, 0, p.pos.z];
    section.mechanisms.push({ kind: 'mover', id: 'lift', carry: true, from, to: [p.pos.x + 6, 4, p.pos.z], speed: 30 });
    for (let i = 0; i < 40; i++) simulate(s, { [p.id]: cmd() });
    expect(p.pos.y).toBeGreaterThan(3);
    expect(p.pos.x).toBeGreaterThan(from[0] + 4);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('73c6eb0f');
    expect(CONTENT_FINGERPRINT).toBe('e749d2fd');
  });
});
