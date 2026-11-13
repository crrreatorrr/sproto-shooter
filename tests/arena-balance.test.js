// Arena rules that changed with docs/gameplay-improvement-plan.md: the tier ladder (B2, D1), Second Wind
// (B3), Wave Mode spell unlocks (B4), Wave Mode skill pacing (B5) and the lava secret (A5).
// None of them may change the campaign: its pins are checked elsewhere, and spot-checked here.
import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from './helpers.js';
import { WAVES, MAX_TIER, FIXED_DIFFICULTY, tierWave, tierExtraElites, tierExtraAlive, tierEnemyMult, tierArenaHpMult, ARENA_HP, secondWindTime, nextWaveSpell, WAVE_SPELLS, waveConfig, waveDifficulty, waveLayout, waveEndsRound } from '../src/data/waves.js';
import { ENEMIES, BOSSES } from '../src/data/enemies.js';
import { levelAssets } from '../src/data/stages.js';
import { xpToNext } from '../src/data/skills.js';
import { TUNING } from '../src/data/tuning.js';
import { createEnemy, createBoss } from '../src/sim/state.js';
import { damagePlayer, onEnemyKilled } from '../src/sim/combat.js';
import { generateGun } from '../src/sim/guns.js';

const start = (mode, extra = {}, seed = 3) => {
  const s = createGameState({ seed });
  run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode, ...extra }] }));
  return { s, p: s.players[s.localPlayerId] };
};
/** The first wave (0-based) of an endless run that plays at difficulty step `d`. */
const firstWaveAt = (d) => (d - 1) * WAVES.length;
/** A Wave Mode run moved on to wave `idx` (0-based). */
const wavesAt = (idx, seed = 3) => {
  const r = start('waves', {}, seed);
  run(r.s, 1, () => cmd({ actions: [{ type: 'debug', op: 'jumpToWave', args: { wave: idx + 1 } }] }));
  return r;
};
const count = (w, pick = (x) => x.count) => w.groups.reduce((n, g) => n + g.spawns.reduce((m, x) => m + pick(x), 0), 0);
const types = (w) => new Set(w.groups.flatMap((g) => g.spawns.map((x) => x.type)));

describe('tier ladder: what a wave looks like at a tier', () => {
  it('leaves tier 1 exactly as written', () => {
    WAVES.forEach((w, i) => { expect(tierWave(i, 1)).toBe(w); expect(tierWave(i)).toBe(w); });
  });

  it('keeps the head count and adds elites and room as tiers rise', () => {
    for (let i = 0; i < WAVES.length; i++) {
      let lastElites = -1;
      for (let tier = 1; tier <= MAX_TIER; tier++) {
        const w = tierWave(i, tier);
        expect(count(w), `wave ${i} tier ${tier}`).toBe(count(WAVES[i]));
        const elites = count(w, (x) => x.elites);
        expect(elites).toBeGreaterThanOrEqual(lastElites);
        lastElites = elites;
        for (const g of w.groups) for (const x of g.spawns) { expect(x.elites).toBeLessThanOrEqual(x.count); expect(ENEMIES[x.type], x.type).toBeTruthy(); }
        expect(w.maxAlive).toBe(WAVES[i].maxAlive + tierExtraAlive(tier));
      }
      expect(count(tierWave(i, 10), (x) => x.elites)).toBeGreaterThan(count(WAVES[i], (x) => x.elites) + 8);
    }
  });

  it('leaves tiers 2 to 6 as they were and takes no whole step at once from tier 7', () => {
    const extra = (tier) => [0, 1, 2, 3].map((gi) => tierExtraElites(tier, gi));
    for (let tier = 1; tier <= 6; tier++) {
      expect(extra(tier), `tier ${tier}`).toEqual([0, 0, 0, 0].map(() => Math.floor((tier - 1) / 2)));
      expect(tierExtraAlive(tier), `tier ${tier}`).toBe(2 * Math.floor((tier - 1) / 3));
    }
    expect([7, 8, 9, 10].map(extra)).toEqual([[2, 3, 2, 3], [3, 3, 3, 3], [3, 4, 3, 4], [4, 4, 4, 4]]);
    expect([7, 8, 9, 10].map(tierExtraAlive)).toEqual([2, 4, 4, 4]);
    // what each tier adds to the one below, over the three waves: elites, room, late bosses
    const elites = (tier) => [0, 1, 2].reduce((n, i) => n + count(tierWave(i, tier), (x) => x.elites), 0);
    const steps = [];
    for (let tier = 7; tier <= MAX_TIER; tier++) {
      steps.push([elites(tier) - elites(tier - 1), tierWave(2, tier).maxAlive - tierWave(2, tier - 1).maxAlive, tierWave(2, tier).boss.late.length - tierWave(2, tier - 1).boss.late.length]);
    }
    // the old ladder put [12, 2, 1] on tier 7, [12, 0, 0] on tier 9 and another crowd step on tier 10
    expect(steps).toEqual([[6, 0, 1], [6, 2, 0], [6, 0, 0], [6, 0, 0]]);
  });

  it('eases the arena health curve after tier 7, and only there', () => {
    for (let tier = 1; tier <= 7; tier++) expect(tierArenaHpMult(tier), `tier ${tier}`).toBeCloseTo(Math.pow(1.18, tier - 1), 10);
    for (let tier = 8; tier <= MAX_TIER; tier++) {
      const step = tierArenaHpMult(tier) / tierArenaHpMult(tier - 1);
      expect(step, `tier ${tier}`).toBeCloseTo(ARENA_HP.lateStep, 10);
      expect(step).toBeGreaterThan(1); // still harder every tier
      expect(step).toBeLessThan(1.18);
    }
    expect(tierEnemyMult(10)).toBeCloseTo(Math.pow(1.15, 9), 10); // damage, and the campaign's curve, untouched
    const hi = wavesAt(firstWaveAt(10));
    expect(hi.s.tier).toBe(10);
    expect(createBoss(hi.s, 'dragon', {}).maxHp).toBe(Math.round(BOSSES.dragon.hp * tierArenaHpMult(10)));
  });

  it('brings in the robots at tier 4, rotates the wave-2 boss and adds the Sproto Beast at tier 7', () => {
    for (const tier of [1, 2, 3]) for (let i = 0; i < 3; i++) expect([...types(tierWave(i, tier))].some((t) => t.startsWith('robot'))).toBe(false);
    expect(types(tierWave(0, 10)).has('robotLaser')).toBe(false); // wave 1 stays a Midget rush
    for (const i of [1, 2]) {
      const t = types(tierWave(i, 4));
      expect(t.has('robotLaser')).toBe(true);
      expect(t.has('robotShooter')).toBe(true);
      expect(t.has('obama')).toBe(true);
      expect(count(tierWave(i, 4), (x) => (x.type === 'robotShooter' ? x.count : 0))).toBe(1);
    }
    expect([1, 2, 3, 4, 5, 6, 7].map((tier) => tierWave(1, tier).boss.types[0])).toEqual(['monster', 'monster', 'monster', 'carMonster', 'moleMonster', 'monster', 'carMonster']);
    expect(tierWave(2, 6).boss.types).toEqual(['megaSproto', 'hexAuditor']);
    expect(tierWave(2, 6).boss.late).toEqual([]);
    expect(tierWave(2, 7).boss.types).toEqual(['megaSproto', 'hexAuditor']); // never three at once
    expect(tierWave(2, 7).boss.late).toEqual(['sprotoBeast']);
    for (let tier = 1; tier <= MAX_TIER; tier++) for (let i = 0; i < 3; i++) for (const b of [...tierWave(i, tier).boss.types, ...(tierWave(i, tier).boss.late || [])]) expect(BOSSES[b], b).toBeTruthy();
  });

  it('preloads the models a wave needs at its difficulty', () => {
    const models = (a) => new Set([...a.characters, ...a.bosses].map((x) => x.model));
    expect(models(levelAssets(1)).has('robotLaser')).toBe(false);
    const t4 = models(levelAssets(firstWaveAt(4) + 1));
    for (const m of ['robotLaser', 'robotShooter', 'carMonster']) expect(t4.has(m), m).toBe(true);
    expect(models(levelAssets(firstWaveAt(7) + 2)).has('sprotoBeast')).toBe(true);
    expect(levelAssets(firstWaveAt(7) + 2).stage).toBe('void');
  });

  it('scales arena health faster than damage, and leaves campaign enemies on the old curve', () => {
    expect(tierArenaHpMult(1)).toBe(1);
    const a = wavesAt(firstWaveAt(5));
    expect(a.s.tier).toBe(5);
    const e = createEnemy(a.s, 'obama', { pos: { x: 5, z: 5 } });
    expect(e.maxHp).toBe(Math.round(ENEMIES.obama.hp * tierArenaHpMult(5)));
    expect(e.dmgMult).toBeCloseTo(tierEnemyMult(5));
    expect(createBoss(a.s, 'monster', {}).maxHp).toBe(Math.round(BOSSES.monster.hp * tierArenaHpMult(5)));
    const b = start('boss', { boss: 'dragon' });
    expect(b.s.enemies.find((x) => x.boss).maxHp).toBe(Math.round(BOSSES.dragon.hp * tierArenaHpMult(FIXED_DIFFICULTY)));
    const sb = start('sandbox');
    expect(createEnemy(sb.s, 'obama', { pos: { x: 5, z: 5 } }).maxHp).toBe(Math.round(ENEMIES.obama.hp * tierEnemyMult(FIXED_DIFFICULTY)));
    const c = start('campaign', { level: 'L05' });
    expect(c.s.tier).toBeGreaterThan(1);
    const ce = createEnemy(c.s, 'obama', { pos: { x: 5, z: 5 } });
    expect(ce.maxHp).toBe(Math.round(ENEMIES.obama.hp * tierEnemyMult(c.s.tier)));
  });

  it('plays the rounds at difficulty 4, 7 and 10 through with every boss of that round', () => {
    for (const tier of [4, 7, 10]) {
      const from = firstWaveAt(tier);
      const s = createGameState({ seed: 11 });
      const p = s.players[s.localPlayerId];
      const g = generateGun({ seed: 5, level: 10, forced: { type: 'mg', quality: 'legendary', wacky: 'tenthMega' } }); g.id = 999;
      p.guns[0] = g;
      run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves' }, { type: 'debug', op: 'jumpToWave', args: { wave: from + 1 } }, { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } }, { type: 'debug', op: 'setTuning', args: { key: 'infiniteAmmo', value: true } }, { type: 'debug', op: 'setTuning', args: { key: 'enemyHpMult', value: 0.25 } }] }));
      const seen = new Set();
      let mostBosses = 0;
      let roundPaid = 0;
      for (let i = 0; i < 60 * 60 * 10 && s.wave.index < from + WAVES.length; i++) {
        if (s.wave.index < from + WAVES.length - 1 || s.wave.phase !== 'intermission') expect(s.tier).toBe(tier);
        mostBosses = Math.max(mostBosses, s.enemies.filter((e) => e.boss && !e.dead).length);
        let best = null, bd = 1e9;
        for (const e of s.enemies) { if (e.dead || e.state === 'spawning') continue; seen.add(e.type); const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < bd) { bd = d; best = e; } }
        let c = cmd({ pressed: { skip: true } });
        if (best) {
          const ty = best.type === 'hexAuditor' ? best.pos.y : best.pos.y + best.height * best.scale * 0.5;
          c = cmd({ yaw: Math.atan2(-(best.pos.x - p.pos.x), -(best.pos.z - p.pos.z)), pitch: Math.atan2(ty - (p.pos.y + 1.6), bd) - p.recoil.pitch, held: { fire: true } });
        }
        roundPaid += run(s, 1, () => c).filter((e) => e.type === 'roundCleared').length;
      }
      expect(s.wave.index, `tier ${tier}`).toBe(from + WAVES.length);
      expect(roundPaid, `tier ${tier}`).toBe(1);
      expect(s.tier).toBe(Math.min(MAX_TIER, tier + 1));
      expect(mostBosses, `tier ${tier}`).toBeLessThanOrEqual(2); // the Sproto Beast waits for one of the pair to fall
      const bosses = [0, 1, 2].flatMap((i) => [...tierWave(i, tier).boss.types, ...(tierWave(i, tier).boss.late || [])]);
      expect(s.run.bossKills, `tier ${tier}`).toBe(bosses.length);
      for (const b of bosses) expect(seen.has(b), b).toBe(true);
      expect(seen.has('robotLaser')).toBe(true);
      expect(seen.has('robotShooter')).toBe(true);
    }
  }, 240000);
});

describe('endless Wave Mode: one difficulty for everyone, rising with the waves', () => {
  it('cycles the three arenas and steps the difficulty up once a round, to MAX_TIER', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(waveLayout)).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect([0, 2, 3, 5, 6, 26, 27, 60, 500].map(waveDifficulty)).toEqual([1, 1, 2, 2, 3, 9, 10, 10, 10]);
    expect([0, 1, 2, 3, 5, 8].map(waveEndsRound)).toEqual([false, false, true, false, true, true]);
    for (let i = 0; i < 3; i++) expect(waveConfig(i).groups).toBe(WAVES[i].groups); // the first round is the waves as written
    expect(waveConfig(3).name).toBe('Wave 4: Midget Rush');
    expect(waveConfig(10)).toMatchObject({ maxAlive: tierWave(1, 4).maxAlive, boss: tierWave(1, 4).boss });
    expect(waveConfig(10)).toBe(waveConfig(10));
  });

  it('ignores a tier on startMode: Boss Fight, sandbox and Test Range use the fixed difficulty, Wave Mode starts at 1', () => {
    for (const tier of [1, 10]) {
      expect(start('boss', { boss: 'monster', tier }).s.tier).toBe(FIXED_DIFFICULTY);
      expect(start('sandbox', { tier }).s.tier).toBe(FIXED_DIFFICULTY);
      expect(start('test', { tier }).s.tier).toBe(FIXED_DIFFICULTY);
      expect(start('waves', { tier }).s.tier).toBe(1);
      expect(start('campaign', { level: 'L07', tier }).s.tier).toBe(7);
    }
  });

  it('never ends in a win: a round clear pays Run Cash and a Legendary, then wave 4 starts one step harder', () => {
    const { s, p } = start('waves');
    const seen = [];
    let tickets = 0;
    for (let n = 0; n < 3; n++) {
      const from = s.wave.index;
      run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'skipWave' }] }));
      for (let i = 0; i < 60 * 40 && s.wave.index === from; i++) {
        for (const e of s.enemies) if (!e.dead) { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(s, e); }
        for (const ev of run(s, 1, () => cmd({ pressed: { skip: true } }))) {
          seen.push(ev.type);
          if (ev.type === 'roundCleared') { tickets = ev.tickets; expect(ev.waveIndex).toBe(2); }
        }
      }
    }
    expect(seen).not.toContain('victory');
    expect(seen.filter((t) => t === 'roundCleared')).toHaveLength(1);
    expect(tickets).toBe(150);
    expect(s.pickups.some((k) => k.gun && k.gun.quality === 'legendary' && k.gun.level === 1)).toBe(true);
    expect(s.wave.index).toBe(3);
    expect(s.tier).toBe(2);
    expect(s.wave.phase).toBe('pre');
  });
});

describe('Second Wind', () => {
  const down = (s, p) => { p.invulnT = 0; p.shield = 0; p.hp = 1; damagePlayer(s, p, { base: 999, sourceKind: 'enemy' }); expect(p.downed).toBe(true); return p.downedT; };
  const kill = (s, summoned = false) => { const e = createEnemy(s, 'midget', { pos: { x: 20, z: 20 }, summoned }); e.lastHit = { sourceId: s.localPlayerId, sourceKind: 'gun' }; onEnemyKilled(s, e); };

  it('gets shorter with every down in one wave: 10, 7, 4, then 3 seconds', () => {
    expect([0, 1, 2, 3, 4, 9].map((n) => secondWindTime(TUNING.secondWindTime, n))).toEqual([10, 7, 4, 3, 3, 3]);
    const { s, p } = start('waves');
    const got = [];
    for (let i = 0; i < 5; i++) { got.push(down(s, p)); kill(s); expect(p.downed).toBe(false); }
    expect(got).toEqual([10, 7, 4, 3, 3]);
  });

  it('starts over when the wave clears, a mode starts, or you respawn', () => {
    const { s, p } = start('waves');
    down(s, p); kill(s); down(s, p); kill(s);
    expect(p.downCount).toBe(2);
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'skipWave' }] }));
    for (let i = 0; i < 60 * 30 && s.wave.phase !== 'intermission'; i++) {
      for (const e of s.enemies) if (!e.dead) { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(s, e); }
      run(s, 1, () => cmd());
    }
    expect(s.wave.phase).toBe('intermission');
    expect(p.downCount).toBeUndefined();
    expect(down(s, p)).toBe(10);
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'monster' }] }));
    expect(p.downCount).toBeUndefined();
    expect(down(s, p)).toBe(10);
  });

  it("comes from a boss's summoned helpers too, on the same shrinking timer", () => {
    // In a Boss Fight the helpers are the only thing to kill besides the boss, so they have to count.
    const { s, p } = start('boss', { boss: 'megaSproto' });
    const got = [];
    for (let i = 0; i < 4; i++) { got.push(down(s, p)); kill(s, true); expect(p.downed).toBe(false); }
    expect(got).toEqual([10, 7, 4, 3]);
  });

  it('runs out when nothing is killed in time', () => {
    const { s, p } = start('boss', { boss: 'megaSproto' });
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'setTuning', args: { key: 'freezeEnemies', value: true } }] }));
    down(s, p); kill(s, true); down(s, p); kill(s, true); down(s, p); // third down: 4 seconds
    run(s, 60 * 4 + 30, () => cmd());
    expect(p.dead).toBe(true);
  });

  it('is unchanged in the campaign: always the full timer, any kill counts, nothing new on the player', () => {
    const { s, p } = start('campaign', { level: 'L06' });
    for (let i = 0; i < 4; i++) { expect(down(s, p)).toBe(TUNING.secondWindTime); kill(s, i % 2 === 0); expect(p.downed).toBe(false); }
    expect('downCount' in p).toBe(false);
  });
});

describe('Wave Mode spell unlocks', () => {
  it('names the next spell: two at tier 1, all four from tier 2', () => {
    expect(nextWaveSpell({ gooBolt: true }, 1)).toBe('chainZap');
    expect(nextWaveSpell({ gooBolt: true, chainZap: true }, 1)).toBe('swarm');
    expect(nextWaveSpell({ gooBolt: true, chainZap: true, swarm: true }, 1)).toBeNull();
    expect(nextWaveSpell({ gooBolt: true, chainZap: true, swarm: true }, 2)).toBe('manaShield');
    expect(nextWaveSpell(Object.fromEntries(WAVE_SPELLS.map((id) => [id, true])), 9)).toBeNull();
  });

  it('teaches one spell per cleared wave, two in the first round and the rest from the second', () => {
    const { s, p } = start('waves');
    expect(p.perks.gooBolt).toBe(true);
    expect(p.perks.chainZap).toBeFalsy();
    const clearWave = () => {
      const from = s.wave.index, events = [];
      run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'skipWave' }] }));
      for (let i = 0; i < 60 * 40 && s.wave.index === from; i++) {
        for (const e of s.enemies) if (!e.dead) { e.lastHit = { sourceId: p.id, sourceKind: 'gun' }; onEnemyKilled(s, e); }
        events.push(...run(s, 1, () => cmd({ pressed: { skip: true } })));
      }
      return events.filter((e) => e.type === 'spellUnlocked').map((e) => e.spellId);
    };
    expect(clearWave()).toEqual(['chainZap']);
    expect(p.perks.chainZap).toBe(true);
    expect(clearWave()).toEqual(['swarm']);
    expect(clearWave()).toEqual([]); // the first round stops at two
    expect(s.wave.index).toBe(3);
    expect(s.tier).toBe(2);
    expect(p.perks.swarm).toBe(true);
    expect(clearWave()).toEqual(['manaShield']);
    expect(clearWave()).toEqual(['meteor']);
    // a campaign level still starts with no spells at all
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }));
    expect(p.perks.chainZap).toBe(false);
    expect(p.perks.gooBolt).toBe(false);
  });
});

describe('Wave Mode skill pacing', () => {
  it('costs more per level in Wave Mode only', () => {
    expect(xpToNext('health', 1, 'waves')).toBe(100);
    expect(xpToNext('health', 2, 'waves')).toBe(175);
    for (const mode of [undefined, 'campaign', 'boss', 'sandbox']) expect(xpToNext('health', 2, mode)).toBe(145);
    const total = (mode) => Array.from({ length: 9 }, (_, i) => xpToNext('health', i + 1, mode)).reduce((a, b) => a + b, 0);
    expect(total('waves')).toBeGreaterThan(total('campaign') * 3);
  });
});

describe('The Floor Is Lava secret', () => {
  const lava = (level) => {
    const { s, p } = start('campaign', { level });
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'setTuning', args: { key: 'freezeEnemies', value: true } }] }));
    run(s, 30, () => cmd()); // settle on the ground
    s.level.modifiers.floorIsLava = true;
    return { s, p };
  };

  // L03 is the only level that has this secret, and it is a v2 level; L06 is the old format.
  it.each(['L03', 'L06'])('burns only on the ground, ends after 20 seconds and no longer kills (%s)', (level) => {
    const { s, p } = lava(level);
    expect(p.onGround).toBe(true);
    const full = p.shield + p.hp;
    run(s, 60, () => cmd());
    expect(full - (p.shield + p.hp)).toBeGreaterThan(3);
    expect(full - (p.shield + p.hp)).toBeLessThan(5);
    run(s, 60 * 60, () => cmd());
    expect(p.dead).toBe(false);
    expect(p.downed).toBe(false);
    expect(s.level.lost).toBe(false);
    expect(s.level.modifiers.floorIsLava).toBe(false);
    expect(s.level.lavaT).toBeUndefined();
    expect(Object.keys(s.level.modifiers)).toContain('floorIsLava'); // still remembered as found
  });

  it('does nothing while you are in the air', () => {
    const { s, p } = lava('L06');
    const before = p.shield + p.hp;
    for (let i = 0; i < 30; i++) { p.pos.y = 50; p.vel.y = 0; p.onGround = false; run(s, 1, () => cmd()); }
    expect(p.shield + p.hp).toBeGreaterThanOrEqual(before);
  });
});
