import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { getLevelRuntime } from '../src/sim/level/runtime.js';
import { stateHash } from '../src/sim/hash.js';
import { validateLevel } from '../src/data/levels/kit.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { noteV2Section } from '../src/sim/campaign/v2.js';
import { L02 } from '../src/data/levels/L02/index.js';
import { ADD_CENSUS, AMMO, BEATS, BOSS_SCRIPT, CENSUS, CRATES, LOOT } from '../src/data/levels/L02/spec.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function tally(level, encounterIds) {
  const out = {};
  for (const sec of level.sections) {
    for (const enc of sec.encounters || []) {
      if (encounterIds && !encounterIds(enc)) continue;
      for (const sq of enc.squads || []) {
        for (const u of sq.units || []) out[u.type] = (out[u.type] || 0) + u.count;
      }
    }
  }
  return out;
}

function scriptAdds(script) {
  const out = {};
  for (const part of script.parts) {
    for (const wave of part.adds || []) {
      for (const unit of wave.units) {
        const type = unit[2] && unit[2].elite ? 'eliteRiot' : unit[0];
        out[type] = (out[type] || 0) + unit[1];
      }
    }
  }
  return out;
}

describe('L02 Grand Bazaar data', () => {
  it('matches the encounter census, lockdowns, ammo and loot', () => {
    const v = validateLevel(L02);
    expect(v.errors).toEqual([]);
    expect(L02.sections.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'SM', 'S4']);
    expect(L02.sections.map((s) => s.designId)).toEqual(['S1', 'S2', 'S3', 'S4', 'SB']);
    expect(L02.tier).toBe(2);
    expect(L02.parTime).toBe(20 * 60);
    expect(L02.jetpack).toBe(false);
    expect(tally(L02, (e) => e.id !== 'S4-E4')).toEqual(CENSUS);
    expect(tally(L02, (e) => e.id === 'S4-E4')).toEqual({ sahil: 1 });
    const anchors = L02.sections.flatMap((s) => s.grappleAnchors || []);
    expect(anchors.map((a) => a.id)).toEqual([
      's1-arch', 's1-roll', 's1-roof',
      's2-arch', 's2-shelf',
      's3-tower', 's3-ledge', 's3-needle',
      'sm-minaret', 'sm-crane', 'sm-gate',
      'sb-balcony', 'sb-facade',
    ]);
    expect(L02.sections.some((s) => (s.geometry || []).some((g) => g.id === 's2-slide' || (g.id || '').startsWith('s2-slide')))).toBe(true);
    expect(scriptAdds(BOSS_SCRIPT)).toEqual(ADD_CENSUS);
    const locks = L02.sections.flatMap((s) => s.encounters).filter((e) => e.lockdown);
    expect(locks.map((e) => e.id)).toEqual(['S1-E3', 'S2-E5', 'S4-E4']);
    const rooms = Object.assign({}, ...L02.sections.map((s) => s.rooms || {}));
    expect(rooms.L1.x1 - rooms.L1.x0).toBe(44);
    expect(rooms.L1.z1 - rooms.L1.z0).toBe(64);
    expect(rooms.L2.x1 - rooms.L2.x0).toBe(56);
    expect(rooms.L2.z1 - rooms.L2.z0).toBe(60);
    expect(rooms.L3.d).toBe(56);
    const mechs = L02.sections.flatMap((s) => s.mechanisms);
    expect(mechs.filter((m) => String(m.id).startsWith('ab')).map((m) => m.id).sort())
      .toEqual(AMMO.map((row) => row[0]).sort());
    expect(CRATES).toHaveLength(7);
    expect(mechs.filter((m) => m.crate).map((m) => m.id).sort())
      .toEqual(CRATES.map((c) => c.id).sort());
    expect(L02.design.loot).toEqual(LOOT);
    expect(L02.design.estimateSec).toBe(1294);
    expect(BEATS.reduce((s, b) => s + b.sec, 0)).toBeCloseTo(1293.9, 0);
    const boss = L02.sections.find((s) => s.id === 'S4');
    expect(boss.start).toEqual([149.5, 0, 11]);
    expect(boss.bossScript.parts).toHaveLength(5);
    expect(boss.encounters[0].script.parts.map((part) => part.id)).toEqual([1, 2, 3, 4, 5]);
    expect(boss.encounters[0].script.parts.map((part) => part.designHp || part.hp || 0)).toEqual([0, 1714, 0, 1909, 1967]);
    expect(boss.encounters[0].script.parts.map((part) => part.hp || 0)).toEqual([0, 1300, 0, 1000, 900]);
    expect(boss.encounters[0].hp).toMatchObject({ part2: 1714, part4: 1909, part5: 1967 });
    expect(mechs.some((m) => m.kind === 'shrine' && m.spell === 'chainZap')).toBe(true);
    expect(mechs.some((m) => m.kind === 'secret' && m.modifier === 'confetti')).toBe(true);
    expect(contentFingerprint(1)).toBe('73c6eb0f');
  });

  it('seals Dyers Court one step after the threshold', () => {
    const s = createGameState({ seed: 7 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L02' }] }) });
    const court = getLevelRuntime('L02').sectionById.S1;
    s.level.section = 'S1';
    s.level.intro = null;
    noteV2Section(s, court, getLevelRuntime('L02'));
    const enc = court.encounters.find((e) => e.id === 'S1-E3');
    const enter = enc.activate;
    p.pos = { x: (enter.min[0] + enter.max[0]) / 2, y: 0, z: (enter.min[2] + enter.max[2]) / 2 };
    p.prevPos = { ...p.pos };
    simulate(s, { [p.id]: cmd() });
    expect(s.level.v2.enc['S1-E3'].started).toBe(true);
    const box = enc.lockdown.threshold;
    const tx = (box.min[0] + box.max[0]) / 2;
    const tz = (box.min[2] + box.max[2]) / 2;
    for (let i = 0; i < 80; i++) {
      p.pos = { x: tx, y: 0, z: tz };
      p.prevPos = { ...p.pos };
      p.vel = { x: 0, y: 0, z: 0 };
      simulate(s, { [p.id]: cmd() });
    }
    expect(s.level.v2.enc['S1-E3'].sealed).toBe(true);
    expect(s.level.closedDoors.map((d) => d.id).sort()).toEqual(['caravanGate', 'dyersGate']);
    expect(s.enemies.some((e) => e.type === 'riotMidget' && !e.dead)).toBe(true);
  });
});

function runClear(seed, record, replay) {
  const s = createGameState({ seed });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [
    { type: 'startMode', mode: 'campaign', level: 'L02' },
    { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
    { type: 'debug', op: 'setTuning', args: { key: 'enemyHpMult', value: 0.08 } },
  ] }) });
  const decide = makeAim();
  for (let n = 0; n < 24000 && !s.level.won && !s.level.lost; n++) {
    const c = replay ? replay[n] : decide(s);
    if (record) record.push(c);
    simulate(s, { [p.id]: c });
  }
  return s;
}

function makeAim() {
  let px = null;
  let pz = null;
  let stuck = 0;
  return (st) => {
    const pl = st.players[st.localPlayerId];
    const lv = st.level;
    if (!lv || lv.won) return cmd();
    if (lv.transition || lv.intro) return cmd({ actions: [{ type: 'transitionDone' }] });
    const sec = getLevelRuntime(lv.id).sectionById[lv.section];
    let best = null;
    let bd = 1e9;
    for (const e of st.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    let tx;
    let tz;
    if (best) { tx = best.pos.x; tz = best.pos.z; }
    else {
      const enc = (sec.encounters || []).find((e) => !lv.cleared[e.id]);
      if (enc && enc.activate) {
        tx = (enc.activate.min[0] + enc.activate.max[0]) / 2;
        tz = (enc.activate.min[2] + enc.activate.max[2]) / 2;
      } else if (sec.exit) {
        tx = (sec.exit.min[0] + sec.exit.max[0]) / 2;
        tz = (sec.exit.min[2] + sec.exit.max[2]) / 2;
      } else { tx = pl.pos.x; tz = pl.pos.z; }
    }
    const dx = tx - pl.pos.x;
    const dz = tz - pl.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = best ? Math.atan2((best.pos.y + (best.height || 1.6) * 0.55) - (pl.pos.y + 1.6), dist) : 0;
    const moved = px == null ? 1 : Math.hypot(pl.pos.x - px, pl.pos.z - pz);
    px = pl.pos.x;
    pz = pl.pos.z;
    stuck = moved < 0.02 && dist > 1.4 ? stuck + 1 : 0;
    return cmd({
      yaw, pitch, moveZ: dist > 1.1 ? 1 : 0, moveX: stuck > 25 ? 1 : 0,
      held: { fire: !!(best && best.state !== 'spawning'), sprint: true },
    });
  };
}

describe('L02 movement', () => {
  it('hooks a bazaar anchor and walks a required stretch without spending stamina', () => {
    const s = createGameState({ seed: 4 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L02' }] }) });
    const sec = getLevelRuntime('L02').sectionById.S1;
    const anchor = sec.grappleAnchors.find((a) => a.id === 's1-arch');
    p.pos = { x: anchor.at[0], y: 0, z: anchor.at[2] + 12 };
    p.prevPos = { ...p.pos };
    p.yaw = 0;
    p.pitch = Math.atan2((anchor.at[1] || 0) - 1.6, 12);
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, pitch: p.pitch, held: { grapple: true } }) });
    expect(p.grapple && p.grapple.id).toBe('s1-arch');
    expect(p.stamina == null || p.stamina).toBeGreaterThan(0.9);
    const before = p.stamina == null ? 1 : p.stamina;
    for (let i = 0; i < 90; i++) simulate(s, { [p.id]: cmd({ yaw: 0, moveZ: 1 }) });
    expect(p.stamina == null ? 1 : p.stamina).toBeGreaterThanOrEqual(before - 0.01);
    expect(Math.abs(p.pos.z - (anchor.at[2] + 12))).toBeGreaterThan(1);
  });
});

describe('L02 clear', () => {
  it('replays a god-mode clear to the same hash', () => {
    const frames = [];
    const first = runClear(4, frames);
    expect(first.level.won, JSON.stringify({
      section: first.level.section,
      lost: first.level.lost,
      pos: first.players[first.localPlayerId].pos,
      open: first.level.cleared,
    })).toBe(true);
    const second = runClear(4, null, frames);
    expect(second.level.won).toBe(true);
    expect(stateHash(second)).toBe(stateHash(first));
  }, 180000);
});
