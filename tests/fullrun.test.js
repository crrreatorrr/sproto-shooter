import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from './helpers.js';
import { generateGun } from '../src/sim/guns.js';
describe('full wave run (autopilot, god mode)', () => {
  it('reaches victory with both bosses defeated', () => {
    const s = createGameState({ seed: 11 });
    const p = s.players[s.localPlayerId];
    const g = generateGun({ seed: 5, level: 4, forced: { type: 'mg', quality: 'legendary', wacky: 'tenthMega' } }); g.id = 999;
    p.guns[0] = g;
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }, { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } }, { type: 'debug', op: 'setTuning', args: { key: 'infiniteAmmo', value: true } }] }));
    const ev = run(s, 60 * 60 * 8, (st, i) => {
      const pl = st.players[st.localPlayerId];
      if (st.wave.phase === 'victory') return cmd();
      let best = null, bd = 1e9;
      for (const e of st.enemies) { if (e.dead || e.state === 'spawning') continue; const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z); if (d < bd) { bd = d; best = e; } }
      if (!best) return cmd({ pressed: { skip: true } });
      const ty = best.type === 'hexAuditor' ? best.pos.y : best.pos.y + best.height * best.scale * 0.5;
      const yaw = Math.atan2(-(best.pos.x - pl.pos.x), -(best.pos.z - pl.pos.z));
      const pitch = Math.atan2(ty - (pl.pos.y + 1.6), bd);
      return cmd({ yaw, pitch: pitch - pl.recoil.pitch, held: { fire: true } });
    });
    const types = ev.map(e => e.type);
    const summary = { phase: s.wave.phase, wave: s.wave.index, kills: s.run.kills, bosses: s.run.bossKills, tickets: p.tickets, skills: Object.fromEntries(Object.entries(p.skills).map(([k,v])=>[k,v.level])), res: p.resources, time: s.run.time.toFixed(0) };
    console.log(JSON.stringify(summary));
    expect(types).toContain('bossSpawn');
    expect(s.wave.phase).toBe('victory');
    expect(s.run.bossKills).toBe(3);
  });
});
