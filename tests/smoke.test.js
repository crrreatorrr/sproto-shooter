import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from './helpers.js';
describe('smoke', () => {
  it('sandbox runs with every enemy and boss while firing', () => {
    const s = createGameState({ seed: 7 });
    run(s, 1, () => cmd({ actions: [
      { type: 'debug', op: 'spawnEnemy', args: { type: 'grunt', count: 3 } },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'spitter' } },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'bouncer' } },
      { type: 'debug', op: 'spawnEnemy', args: { type: 'tank', elite: true } },
      { type: 'debug', op: 'spawnBoss', args: { type: 'megaSproto' } },
      { type: 'debug', op: 'spawnBoss', args: { type: 'hexAuditor' } },
      { type: 'debug', op: 'maxSkills' },
    ] }) );
    const ev = run(s, 60 * 40, (st, i) => {
      const p = st.players[st.localPlayerId];
      const e = st.enemies.find(x => !x.dead);
      let yaw = p.yaw, pitch = 0;
      if (e) { yaw = Math.atan2(-(e.pos.x - p.pos.x), -(e.pos.z - p.pos.z)); pitch = Math.atan2(e.pos.y + 1 - (p.pos.y + 1.6), Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z)); }
      return cmd({ yaw, pitch, held: { fire: true }, moveX: Math.sin(i / 30), pressed: { gooBolt: i % 50 === 0, chainZap: i % 300 === 0, swarm: i % 900 === 0, meteor: i % 1800 === 5, jump: i % 90 === 0 } });
    });
    const types = new Set(ev.map(e => e.type));
    expect(types.has('shot')).toBe(true);
    expect(types.has('damage')).toBe(true);
    expect(types.has('cast')).toBe(true);
    expect(s.players[s.localPlayerId]).toBeTruthy();
    expect(JSON.parse(JSON.stringify(s)).tick).toBe(s.tick);
  });
  it('wave mode starts and spawns', () => {
    const s = createGameState({ seed: 3 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }, { type: 'setTuning' }, { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } }] }));
    const ev = run(s, 60 * 12);
    expect(ev.some(e => e.type === 'waveStart')).toBe(true);
    expect(s.enemies.length).toBeGreaterThan(0);
  });
});
