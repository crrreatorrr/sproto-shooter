import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from '../helpers.js';
import { CAMPAIGN, getLevelData } from '../../src/data/levels/index.js';
import { validateLevel } from '../../src/data/levels/kit.js';
import { stateHash } from '../../src/sim/hash.js';
import { getLevelRuntime } from '../../src/sim/level/runtime.js';

function aim(st) {
  const pl = st.players[st.localPlayerId];
  const lv = st.level;
  if (!lv || lv.won) return cmd();
  if (lv.transition || lv.intro) return cmd({ actions: [{ type: 'transitionDone' }] });
  const rt = getLevelRuntime(lv.id);
  const sec = rt.sectionById[lv.section];
  let best = null, bd = 1e9;
  for (const e of st.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
    if (d < bd) { bd = d; best = e; }
  }
  let tx, tz;
  if (best) { tx = best.pos.x; tz = best.pos.z; }
  else {
    const enc = (sec.encounters || []).find((e) => !lv.cleared[e.id]);
    if (enc) {
      tx = (enc.activate.min[0] + enc.activate.max[0]) / 2;
      tz = (enc.activate.min[2] + enc.activate.max[2]) / 2;
    } else if (sec.exit) {
      tx = (sec.exit.min[0] + sec.exit.max[0]) / 2;
      tz = (sec.exit.min[2] + sec.exit.max[2]) / 2;
    } else { tx = pl.pos.x + 4; tz = pl.pos.z; }
  }
  const dx = tx - pl.pos.x, dz = tz - pl.pos.z;
  const dist = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(-dx, -dz);
  let pitch = 0;
  if (best) {
    const ty = best.pos.y + (best.height || 1.6) * 0.55;
    pitch = Math.atan2(ty - (pl.pos.y + 1.6), bd) - pl.recoil.pitch;
  }
  const stuck = pl._stuck || 0;
  const moved = Math.hypot(pl.pos.x - (pl._px ?? pl.pos.x), pl.pos.z - (pl._pz ?? pl.pos.z));
  pl._px = pl.pos.x; pl._pz = pl.pos.z;
  pl._stuck = moved < 0.02 && dist > 1.4 ? stuck + 1 : 0;
  const sidestep = pl._stuck > 40;
  return cmd({
    yaw, pitch, moveZ: dist > 1.1 ? 1 : 0, moveX: sidestep ? 1 : 0,
    held: { fire: !!(best && best.state !== 'spawning'), sprint: true },
  });
}

function boot(seed, level) {
  const s = createGameState({ seed });
  run(s, 1, () => cmd({ actions: [
    { type: 'startMode', mode: 'campaign', level },
    { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
    { type: 'debug', op: 'setTuning', args: { key: 'enemyHpMult', value: 0.08 } },
  ] }));
  return s;
}

describe('campaign levels', () => {
  it('validates all ten levels', () => {
    expect(CAMPAIGN).toHaveLength(10);
    for (const id of CAMPAIGN) {
      const lv = getLevelData(id);
      const v = validateLevel(lv);
      expect(v.errors, id).toEqual([]);
      expect(lv.sections.length).toBeGreaterThan(0);
      expect(lv.sections.some((s) => (s.weapons || []).length)).toBe(true);
      expect(lv.sections.some((s) => (s.mechanisms || []).some((m) => m.kind === 'secret'))).toBe(true);
    }
  });

  it('autopilots every level', () => {
    for (const id of CAMPAIGN) {
      const s = boot(1, id);
      const cap = 24000;
      let n = 0;
      for (; n < cap; n++) {
        run(s, 1, aim);
        if (s.level.won || s.level.lost) break;
      }
      const lv = s.level;
      const open = Object.entries(lv.cleared).filter(([, v]) => !v).map(([k]) => k);
      expect({ id, won: lv.won, lost: lv.lost, section: lv.section, open, tick: s.tick, pos: s.players[s.localPlayerId].pos }, id).toMatchObject({ won: true });
      expect(n).toBeLessThan(cap);
    }
  }, 60000);

  it('is deterministic', () => {
    const a = boot(2, 'L01');
    const b = boot(3, 'L01');
    const c = boot(2, 'L01');
    run(a, 400, aim); run(c, 400, aim);
    expect(stateHash(a)).toBe(stateHash(c));
    run(b, 400, aim);
    expect(stateHash(a)).not.toBe(stateHash(b));
  });

  it('a secret grants a modifier and does not touch gun stats', () => {
    const s = boot(1, 'L01');
    const p = s.players[s.localPlayerId];
    const before = p.guns[0].stats.damage;
    const sec = getLevelRuntime('L01').sections[0];
    const secret = sec.mechanisms.find((m) => m.kind === 'secret');
    p.pos.x = secret.at[0]; p.pos.z = secret.at[2];
    run(s, 5, () => cmd());
    expect(s.level.modifiers.bigHead).toBe(true);
    expect(p.guns[0].stats.damage).toBe(before);
  });
});
