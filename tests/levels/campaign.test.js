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
  // The quick sidestep below only fires on a dead stop. Pressed head-on into a car or a tank the bot
  // jitters instead, never counts as stuck, and stays there. So also watch progress: a fixed target that
  // (an encounter or the exit, not an enemy) that gets no closer for a few seconds means walk one way for a stretch to get round, the other way next time.
  const sameTarget = Math.hypot(tx - (pl._tx ?? tx), tz - (pl._tz ?? tz)) < 1;
  pl._tx = tx; pl._tz = tz;
  if (!sameTarget || pl._near == null || dist < pl._near - 0.3) { pl._near = dist; pl._idle = 0; }
  else if (dist > 1.4) pl._idle = (pl._idle || 0) + 1;
  if (!best && pl._idle > 150 && !(pl._detour > 0)) { pl._detour = 45; pl._detourDir = pl._detourDir === 1 ? -1 : 1; pl._idle = 0; pl._near = null; }
  const detour = pl._detour > 0;
  if (detour) pl._detour--;
  const sidestep = detour || pl._stuck > 30;
  const hook = pl._stuck > 70 ? anchorAim(pl, lv.grappleAnchors, { x: tx, z: tz }) : null;
  const pull = hook && (pl._stuck % 36) < 14;
  const gap = !!(lv.voids && lv.voids.length) && pl._stuck > 16;
  const fling = !pull && gap && (pl._stuck % 36) < 14;
  let aimYaw = yaw;
  let aimPitch = fling ? 0.65 : pitch;
  if (pull) {
    aimYaw = Math.atan2(-hook.dx, -hook.dz);
    aimPitch = Math.atan2(hook.dy, Math.hypot(hook.dx, hook.dz) || 1);
  }
  return cmd({
    yaw: aimYaw, pitch: aimPitch,
    moveZ: sidestep ? 0 : (dist > 1.1 ? 1 : 0),
    moveX: detour ? pl._detourDir : sidestep ? (Math.floor(pl._stuck / 18) % 2 === 0 ? 1 : -1) : 0,
    held: {
      fire: !!(best && best.state !== 'spawning'),
      sprint: !sidestep,
      jump: pl._stuck > 50,
      grapple: !!(pull || fling),
    },
    // Slide-tagged decks are for the player. Taking them leaves the lane.
    pressed: {},
  });
}

function anchorAim(pl, anchors, goal) {
  let best = null;
  let bd = 28;
  const gx = goal ? goal.x - pl.pos.x : 0;
  const gz = goal ? goal.z - pl.pos.z : 0;
  const gl = Math.hypot(gx, gz) || 1;
  for (const a of anchors || []) {
    if (!a.at) continue;
    const dx = a.at[0] - pl.pos.x;
    const dy = (a.at[1] || 0) - pl.pos.y;
    const dz = a.at[2] - pl.pos.z;
    const flat = Math.hypot(dx, dz) || 1;
    const d = Math.hypot(dx, dy, dz);
    if (d > 28 || d < 1.5 || dy < 1.2) continue;
    if (goal && (dx * gx + dz * gz) / (flat * gl) < 0.15) continue;
    if (d < bd) { bd = d; best = { dx, dy, dz, d }; }
  }
  return best;
}

function onSlideTag(sec, pl) {
  for (const g of (sec && sec.geometry) || []) {
    if (g.tag !== 'slide' || !g.at) continue;
    const dx = g.at[0] - pl.pos.x;
    const dz = g.at[2] - pl.pos.z;
    const sx = (g.size && g.size[0]) || 4;
    const sz = (g.size && g.size[2]) || 4;
    if (Math.hypot(dx, dz) < Math.max(sx, sz) * 0.55 + 1.5 && Math.abs((g.at[1] || 0) - pl.pos.y) < 3) return true;
  }
  return false;
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
      const where = JSON.stringify({ id, won: lv.won, lost: lv.lost, section: lv.section, open, tick: s.tick, pos: s.players[s.localPlayerId].pos });
      expect(lv.won, where).toBe(true);
      expect(n).toBeLessThan(cap);
    }
  }, 120000);

  it('is deterministic', () => {
    const a = boot(2, 'L01');
    const b = boot(3, 'L01');
    const c = boot(2, 'L01');
    run(a, 400, aim); run(c, 400, aim);
    expect(stateHash(a)).toBe(stateHash(c));
    run(b, 400, aim);
    expect(stateHash(a)).not.toBe(stateHash(b));
  });

  it('grapples an anchor when stuck and notices a slide tag', () => {
    const s = createGameState({ seed: 1 });
    const sec = getLevelRuntime('L01').sectionById.S1;
    const enc = sec.encounters[0];
    const gx = (enc.activate.min[0] + enc.activate.max[0]) / 2;
    const gz = (enc.activate.min[2] + enc.activate.max[2]) / 2;
    const gl = Math.hypot(gx, gz) || 1;
    s.level = {
      id: 'L01', section: 'S1', cleared: {},
      grappleAnchors: [{ id: 'hook', at: [(gx / gl) * 6, 6, (gz / gl) * 6], r: 1.5 }],
    };
    const p = s.players[s.localPlayerId];
    p.pos = { x: 0, y: 0, z: 0 };
    p._px = 0; p._pz = 0; p._stuck = 80;
    const c = aim(s);
    expect(c.held.grapple).toBe(true);
    expect(c.pitch).toBeGreaterThan(0.4);
    const ramp = { tag: 'slide', at: [2, 1, 0], size: [8, 2, 6] };
    expect(onSlideTag({ geometry: [ramp] }, p)).toBe(true);
    expect(onSlideTag({ geometry: [{ tag: 'floor', at: [2, 0, 0], size: [4, 1, 4] }] }, p)).toBe(false);
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
