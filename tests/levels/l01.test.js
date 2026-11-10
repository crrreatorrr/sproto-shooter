import { describe, expect, it } from 'vitest';
import { createGameState } from '../../src/sim/state.js';
import { simulate } from '../../src/sim/simulate.js';
import { damageEnemy } from '../../src/sim/combat.js';
import { getLevelRuntime } from '../../src/sim/level/runtime.js';
import { stateHash } from '../../src/sim/hash.js';
import { contentFingerprint } from '../../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../../src/sim/pvp/rules.js';
import { L01 } from '../../src/data/levels/L01/index.js';
import { noteV2Section } from '../../src/sim/campaign/v2.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function unitsOf(level) {
  const tally = {};
  for (const sec of level.sections) {
    for (const enc of sec.encounters || []) {
      for (const sq of enc.squads || []) {
        for (const u of sq.units || []) tally[u.type] = (tally[u.type] || 0) + u.count;
      }
    }
  }
  return tally;
}

function boot() {
  const s = createGameState({ seed: 4 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
  return { s, p };
}

describe('L01 Sproto Landing', () => {
  it('counts the design census, lockdowns, ammo and secrets', () => {
    const tally = unitsOf(L01);
    expect(tally).toEqual({
      midget: 85, obama: 11, flyingMidget: 23, robotLaser: 13, robotShooter: 5, bigObama: 1, gatekeeper: 1,
      gateGenerator: 4,
    });
    expect(L01.sections.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    expect(L01.parTime).toBe(18 * 60);
    expect(L01.startAmmo.bullets).toBe(36);
    const mechs = L01.sections.flatMap((s) => s.mechanisms);
    expect(mechs.filter((m) => m.kind === 'ammo' && m.id.startsWith('A')).length).toBe(33);
    expect(mechs.filter((m) => m.id.startsWith('C')).length).toBe(4);
    expect(mechs.filter((m) => m.id.startsWith('D')).length).toBe(2);
    expect(L01.sections.flatMap((s) => s.checkpoints).length).toBe(8);
    const locks = L01.sections.flatMap((s) => s.encounters).filter((e) => e.lockdown);
    expect(locks.map((e) => e.id)).toEqual(['S3-E6', 'S4-E8', 'S6-FIN']);
    expect(L01.sections[0].mechanisms.find((m) => m.kind === 'secret').modifier).toBe('bigHead');
  });

  it('seals the mall lockdown when the player crosses the threshold', () => {
    const { s, p } = boot();
    const mall = getLevelRuntime('L01').sectionById.S3;
    s.level.section = 'S3';
    s.level.intro = null;
    noteV2Section(s, mall, getLevelRuntime('L01'));
    const box = mall.encounters[0].lockdown.threshold;
    p.pos = { x: (box.min[0] + box.max[0]) / 2, y: 0, z: (box.min[2] + box.max[2]) / 2 };
    p.prevPos = { ...p.pos };
    simulate(s, { [p.id]: cmd() });
    expect(s.level.v2.enc['S3-E6'].sealed).toBe(true);
    expect(s.level.closedDoors.map((d) => d.id).sort()).toEqual(['S3-L1-in', 'S3-L1-out']);
    expect(s.enemies.some((e) => e.type === 'robotLaser' && !e.dead)).toBe(true);
  });

  it('drops the Gatekeeper shield after the three generators fall', () => {
    const { s, p } = boot();
    const plaza = getLevelRuntime('L01').sectionById.S6;
    s.level.section = 'S6';
    s.level.intro = null;
    noteV2Section(s, plaza, getLevelRuntime('L01'));
    const box = plaza.encounters[0].activate;
    p.pos = { x: (box.min[0] + box.max[0]) / 2, y: 0, z: 16 };
    p.prevPos = { ...p.pos };
    for (let i = 0; i < 20; i++) simulate(s, { [p.id]: cmd() });
    const gens = s.enemies.filter((e) => e.type === 'gateGenerator');
    const boss = s.enemies.find((e) => e.type === 'gatekeeper');
    expect(gens.length).toBe(3);
    expect(boss.ai.audit).toBe(true);
    for (const g of gens) {
      g.state = 'chase';
      damageEnemy(s, g, { base: 500, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    }
    boss.state = 'chase';
    simulate(s, { [p.id]: cmd() });
    expect(s.level.v2.parts['S6-gen-N']).toBe(true);
    expect(s.level.v2.parts['S6-gen-W']).toBe(true);
    expect(s.level.v2.parts['S6-gen-E']).toBe(true);
    expect(boss.ai.audit).toBe(false);
    const dealt = damageEnemy(s, boss, { base: 40, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(dealt).toBeGreaterThan(0);
  });

  it('replays a full god-mode clear to the same hash', () => {
    const frames = [];
    const first = runClear(1, frames);
    expect(first.level.won).toBe(true);
    const second = runClear(1, null, frames);
    expect(second.level.won).toBe(true);
    expect(stateHash(second)).toBe(stateHash(first));
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  }, 180000);
});

function runClear(seed, record, replay) {
  const s = createGameState({ seed });
  const p = s.players[s.localPlayerId];
  const start = cmd({ actions: [
    { type: 'startMode', mode: 'campaign', level: 'L01' },
    { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
    { type: 'debug', op: 'setTuning', args: { key: 'enemyHpMult', value: 0.08 } },
  ] });
  simulate(s, { [p.id]: start });
  for (let n = 0; n < 24000 && !s.level.won; n++) {
    const c = replay ? replay[n] : aim(s);
    if (record) record.push(c);
    simulate(s, { [p.id]: c });
  }
  return s;
}

function makeAim() {
  let px = null, pz = null, stuck = 0;
  return (st) => {
    const pl = st.players[st.localPlayerId];
    const lv = st.level;
    if (!lv || lv.won) return cmd();
    if (lv.transition || lv.intro) return cmd({ actions: [{ type: 'transitionDone' }] });
    const sec = getLevelRuntime(lv.id).sectionById[lv.section];
    let best = null, bd = 1e9;
    for (const e of st.enemies) if (!e.dead) {
      const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    let tx, tz;
    if (best) { tx = best.pos.x; tz = best.pos.z; }
    else {
      const enc = (sec.encounters || []).find((e) => !lv.cleared[e.id]);
      if (enc && enc.activate) {
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
    const pitch = best ? Math.atan2((best.pos.y + (best.height || 1.6) * 0.55) - (pl.pos.y + 1.6), dist) - (pl.recoil?.pitch || 0) : 0;
    const moved = px == null ? 1 : Math.hypot(pl.pos.x - px, pl.pos.z - pz);
    px = pl.pos.x; pz = pl.pos.z;
    stuck = moved < 0.02 && dist > 1.4 ? stuck + 1 : 0;
    return cmd({
      yaw, pitch, moveZ: dist > 1.1 ? 1 : 0, moveX: stuck > 40 ? 1 : 0,
      held: { fire: !!(best && best.state !== 'spawning'), sprint: true },
    });
  };
}

const aim = makeAim();
