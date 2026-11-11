import { describe, it, expect } from 'vitest';
import { generateGun } from '../src/sim/guns.js';
import { rollDrops, rollGunType } from '../src/sim/drops.js';
import { createRng } from '../src/core/rng.js';
import { BOSS_GUN_TYPES, GUN_TYPES_BY_ID } from '../src/data/guns.js';
import { BOSSES } from '../src/data/enemies.js';
import { createGameState, createEnemy, createBoss } from '../src/sim/state.js';
import { onEnemyKilled } from '../src/sim/combat.js';
import { run, cmd } from './helpers.js';

const give = (s, type) => {
  const p = s.players[s.localPlayerId];
  const g = generateGun({ seed: 5, level: 1, forced: { type, quality: 'common', manufacturer: 'reliable', element: 'none' } });
  g.id = 999;
  p.guns[0] = g; p.activeSlot = 0; p.swapT = 0; p.reloadT = 0; p.fireCd = 0;
  return { p, g };
};

describe('boss weapons (Ray Gun, Big Bullets)', () => {
  it('are never rolled at random', () => {
    const rng = createRng(3);
    for (let i = 0; i < 3000; i++) expect(BOSS_GUN_TYPES).not.toContain(rollGunType(rng));
    for (let seed = 1; seed < 400; seed++) expect(BOSS_GUN_TYPES).not.toContain(generateGun({ seed, level: 1 }).type);
  });

  it('in Wave Mode and Boss Fight a boss drops one some of the time, and never more than one', () => {
    const rate = (boss) => {
      let n = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const specs = rollDrops(createRng(seed), boss, { tier: 1, boss: true, arena: true });
        const bossGuns = specs.filter((d) => d.kind === 'gun' && BOSS_GUN_TYPES.includes(d.type));
        expect(bossGuns.length, boss).toBeLessThanOrEqual(1);
        for (const g of bossGuns) expect(['rare', 'epic', 'legendary']).toContain(g.quality);
        n += bossGuns.length;
      }
      return n / 400;
    };
    for (const boss of Object.keys(BOSSES)) {
      const r = rate(boss);
      if (BOSSES[boss].campaign) expect(r, boss).toBe(1); // no table of their own
      else { expect(r, boss).toBeGreaterThan(0.15); expect(r, boss).toBeLessThan(0.6); }
    }
    // the first boss of a run is the stingiest, and still leaves two ordinary guns behind
    expect(rate('dragon')).toBeLessThan(rate('monster'));
    expect(rollDrops(createRng(1), 'dragon', { tier: 1, boss: true, arena: true }).filter((d) => d.kind === 'gun' && !BOSS_GUN_TYPES.includes(d.type)).length).toBe(2);
    // both kinds show up across kills
    const seen = new Set();
    for (let seed = 1; seed < 120; seed++) for (const d of rollDrops(createRng(seed), 'monster', { tier: 1, arena: true })) if (d.kind === 'gun') seen.add(d.type);
    for (const t of BOSS_GUN_TYPES) expect(seen.has(t)).toBe(true);
  });

  // Locked against main (b9b4591): outside the two arena modes nothing about boss drops changed. The
  // campaign uses arena bosses as mini-bosses (L03 Hex Auditor, L05 Blue Monster), so this matters there.
  it('outside Wave Mode and Boss Fight every boss still drops exactly one, a quality step up, as before', () => {
    const q = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const boss of Object.keys(BOSSES)) {
      const quality = { rare: 0, epic: 0, legendary: 0 };
      for (let seed = 1; seed <= 200; seed++) {
        const specs = rollDrops(createRng(seed), boss, { tier: 1, boss: true });
        const bossGuns = specs.filter((d) => d.kind === 'gun' && BOSS_GUN_TYPES.includes(d.type));
        expect(bossGuns.length, boss).toBe(1);
        expect(q.indexOf(bossGuns[0].quality), boss).toBeGreaterThanOrEqual(3); // boss table is rare or better, plus one step
        quality[bossGuns[0].quality]++;
      }
      expect(quality.rare).toBe(0);
    }
    // the Jade Dragon's ordinary gun count is the old one too
    expect(rollDrops(createRng(1), 'dragon', { tier: 1, boss: true }).filter((d) => d.kind === 'gun' && !BOSS_GUN_TYPES.includes(d.type)).length).toBe(1);
    // and a kill inside a campaign level or the sandbox goes through that path
    for (const [mode, extra] of [['campaign', { level: 'L05' }], ['sandbox', {}]]) {
      for (let seed = 1; seed <= 8; seed++) {
        const s = createGameState({ seed });
        run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode, tier: 1, ...extra }] }));
        s.pickups.length = 0;
        const b = createBoss(s, 'monster', { pos: { x: 0, z: -10 } });
        onEnemyKilled(s, b);
        expect(s.pickups.filter((k) => k.gun && BOSS_GUN_TYPES.includes(k.gun.type)).length, mode).toBe(1);
      }
    }
  });

  it('a Wave Mode boss kill can spawn a boss weapon pickup, marked as a boss drop', () => {
    let found = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = createGameState({ seed });
      run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }] }));
      const b = createBoss(s, 'monster', { pos: { x: 0, z: -10 } });
      onEnemyKilled(s, b);
      const guns = s.pickups.filter((k) => k.kind === 'gun').map((k) => k.gun);
      expect(guns.length).toBeGreaterThanOrEqual(2); // ordinary guns always drop
      if (guns.some((g) => BOSS_GUN_TYPES.includes(g.type) && g.source === 'boss')) found++;
    }
    expect(found).toBeGreaterThan(0);
    expect(found).toBeLessThan(12);
  });

  it('roll legendaries with a wacky perk like any other gun', () => {
    for (const type of BOSS_GUN_TYPES) {
      const g = generateGun({ seed: 7, level: 3, forced: { type, quality: 'legendary' } });
      expect(g.wacky).toBeTruthy();
      expect(g.name.length).toBeGreaterThan(0);
      expect(GUN_TYPES_BY_ID[type].infiniteReserve).toBe(true);
    }
  });

  it('Ray Gun fires a piercing laser (hitscan through two targets)', () => {
    const s = createGameState({ seed: 2 });
    const { p } = give(s, 'raygun');
    const near = createEnemy(s, 'dummy', { pos: { x: 0, z: p.pos.z - 6 } });
    const far = createEnemy(s, 'dummy', { pos: { x: 0, z: p.pos.z - 12 } });
    near.state = far.state = 'idle';
    const h0 = near.hp, h1 = far.hp;
    const ev = run(s, 2, () => cmd({ yaw: 0, pitch: Math.atan2(near.pos.y + 0.8 - 1.6, 6), held: { fire: true } }));
    const tracer = ev.find((e) => e.type === 'tracer');
    expect(tracer.gunType).toBe('raygun');
    expect(near.hp).toBeLessThan(h0);
    expect(far.hp).toBeLessThan(h1);
  });

  it('Big Bullets fire a visible heavy round that hits much harder than a sniper', () => {
    const s = createGameState({ seed: 2 });
    const { p, g } = give(s, 'bigbullets');
    const sniper = generateGun({ seed: 5, level: 1, forced: { type: 'sniper', quality: 'common', manufacturer: 'reliable', element: 'none' } });
    expect(g.stats.damage).toBeGreaterThan(sniper.stats.damage * 3);
    const e = createEnemy(s, 'dummy', { pos: { x: 0, z: p.pos.z - 10 } });
    e.state = 'idle';
    const hp = e.hp;
    run(s, 1, () => cmd({ yaw: 0, pitch: Math.atan2(e.pos.y + 0.8 - 1.6, 10), held: { fire: true } }));
    const shot = s.projectiles.find((x) => x.kind === 'bigBullet');
    expect(shot).toBeTruthy();
    expect(shot.pierce).toBe(1);
    run(s, 30, () => cmd());
    expect(hp - e.hp).toBeGreaterThan(200);
  });

  it('reload from an endless reserve', () => {
    for (const type of BOSS_GUN_TYPES) {
      const s = createGameState({ seed: 9 });
      const { p, g } = give(s, type);
      g.ammoInMag = 1;
      run(s, 5, () => cmd({ held: { fire: true } }));
      expect(p.reloadT).toBeGreaterThan(0);
      const ev = run(s, Math.ceil((g.stats.reloadTime + 0.2) * 60), () => cmd());
      expect(ev.some((x) => x.type === 'ammoEmpty')).toBe(false);
      expect(g.ammoInMag).toBe(g.stats.magSize);
    }
  });
});
