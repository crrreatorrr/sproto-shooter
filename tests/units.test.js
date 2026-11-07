import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRng, float, weighted } from '../src/core/rng.js';
import { generateGun, compareGuns, sellValue, salvageYield, effectiveGunStats } from '../src/sim/guns.js';
import { raySphere, rayCapsule, raycastEnemies } from '../src/sim/collision.js';
import { damageEnemy, damagePlayer } from '../src/sim/combat.js';
import { rollDrops } from '../src/sim/drops.js';
import { addXp } from '../src/sim/progression.js';
import { validateCraft, startCraft } from '../src/sim/economy.js';
import { xpToNext } from '../src/data/skills.js';
import { WAVES } from '../src/data/waves.js';
import { GUN_RECIPES, RECIPES_BY_ID } from '../src/data/recipes.js';
import { createGameState, createEnemy, createBoss } from '../src/sim/state.js';
import { run, cmd } from './helpers.js';

describe('architecture', () => {
  it('sim and data never touch three, DOM, Math.random or wall clock', () => {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    for (const f of [...walk('src/sim'), ...walk('src/data')]) {
      const src = fs.readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/from 'three'|\bwindow\.|\bdocument\.|Math\.random|Date\.now|performance\.now/);
    }
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(5), b = createRng(5);
    for (let i = 0; i < 100; i++) expect(float(a)).toBe(float(b));
  });
  it('weighted respects weights roughly', () => {
    const r = createRng(1); const c = { a: 0, b: 0 };
    for (let i = 0; i < 10000; i++) c[weighted(r, [{ id: 'a', weight: 9 }, { id: 'b', weight: 1 }]).id]++;
    expect(c.a / 10000).toBeGreaterThan(0.85); expect(c.a / 10000).toBeLessThan(0.95);
  });
});

describe('gun generator', () => {
  it('same seed + args = same gun', () => {
    expect(generateGun({ seed: 123, level: 3 })).toEqual(generateGun({ seed: 123, level: 3 }));
  });
  it('forcing type does not reshuffle parts of a same-type roll', () => {
    const g = generateGun({ seed: 99 });
    const f = generateGun({ seed: 99, forced: { type: g.type } });
    expect(f.parts).toEqual(g.parts);
  });
  it('legendaries always get a wacky perk; others never', () => {
    for (let s = 0; s < 50; s++) {
      expect(generateGun({ seed: s, forced: { quality: 'legendary' } }).wacky).toBeTruthy();
      expect(generateGun({ seed: s, forced: { quality: 'rare' } }).wacky).toBeNull();
    }
  });
  it('type drop frequency ~ 60/17/17/6', () => {
    const c = { mg: 0, shotgun: 0, sniper: 0, bazooka: 0 };
    for (let s = 0; s < 4000; s++) c[generateGun({ seed: s * 7919 }).type]++;
    expect(c.mg / 4000).toBeGreaterThan(0.54); expect(c.bazooka / 4000).toBeLessThan(0.1);
  });
  it('higher quality and level means more damage', () => {
    const c = generateGun({ seed: 1, forced: { type: 'mg', quality: 'common', manufacturer: 'reliable' } });
    const l = generateGun({ seed: 1, forced: { type: 'mg', quality: 'legendary', manufacturer: 'reliable' } });
    const lv = generateGun({ seed: 1, level: 5, forced: { type: 'mg', quality: 'common', manufacturer: 'reliable' } });
    expect(l.stats.damage).toBeGreaterThan(c.stats.damage * 1.5);
    expect(lv.stats.damage).toBeGreaterThan(c.stats.damage * 1.5);
  });
  it('Gloop Labs is never plain', () => {
    for (let s = 0; s < 40; s++) expect(generateGun({ seed: s, forced: { manufacturer: 'gloop' } }).element).not.toBe('none');
  });
  it('compare, sell and salvage', () => {
    const a = generateGun({ seed: 3, forced: { type: 'sniper', quality: 'epic' } });
    const b = generateGun({ seed: 4, forced: { type: 'sniper', quality: 'common' } });
    expect(compareGuns(a, b).find((r) => r.key === 'damage').verdict).toBe('better');
    expect(sellValue(a)).toBeGreaterThan(sellValue(b));
    expect(salvageYield(a).plating).toBeGreaterThan(0);
  });
});

describe('collision', () => {
  it('ray hits sphere and capsule', () => {
    expect(raySphere({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -10 }, 1)).toBeCloseTo(9);
    expect(rayCapsule({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 0, -10, 0, 2, 0.5)).toBeCloseTo(9.5);
    expect(rayCapsule({ x: 3, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 0, -10, 0, 2, 0.5)).toBe(-1);
  });
  it('weak spot wins over body at the head', () => {
    const s = createGameState();
    const e = createEnemy(s, 'midget', { pos: { x: 0, z: -10 } }); e.state = 'chase';
    const hit = raycastEnemies(s, { x: 0, y: 1.1, z: 0 }, { x: 0, y: 0, z: -1 }, 50);
    expect(hit.zone).toBe('weak');
    const body = raycastEnemies(s, { x: 0, y: 0.5, z: 0 }, { x: 0, y: 0, z: -1 }, 50);
    expect(body.zone).toBe('body');
  });
});

describe('damage pipeline', () => {
  const setup = () => { const s = createGameState(); const p = s.players[s.localPlayerId]; const e = createEnemy(s, 'midget', { pos: { x: 0, z: -5 } }); e.state = 'chase'; return { s, p, e }; };
  it('weak spot multiplies by critMult', () => {
    const { s, p, e } = setup();
    const d = damageEnemy(s, e, { sourceId: p.id, sourceKind: 'gun', base: 10, zone: 'weak', critMult: 2, canCrit: false });
    expect(d).toBe(20);
  });
  it('tank shield only lets 10% through', () => {
    const s = createGameState(); const p = s.players[s.localPlayerId];
    const t = createEnemy(s, 'bigObama', { pos: { x: 0, z: -5 } }); t.state = 'chase';
    expect(damageEnemy(s, t, { sourceId: p.id, sourceKind: 'gun', base: 100, zone: 'shield' })).toBe(10);
  });
  it('element weakness and resistance', () => {
    const s = createGameState(); const p = s.players[s.localPlayerId];
    const sp = createEnemy(s, 'obama', { pos: { x: 0, z: -5 } }); sp.state = 'chase';
    expect(damageEnemy(s, sp, { sourceId: p.id, sourceKind: 'gun', base: 10, zone: 'body', element: 'fire' })).toBe(15);
    expect(damageEnemy(s, sp, { sourceId: p.id, sourceKind: 'gun', base: 10, zone: 'body', element: 'goo' })).toBe(5);
  });
  it('player damage goes shield first, health DR applies, and lethal damage downs', () => {
    const s = createGameState(); const p = s.players[s.localPlayerId];
    damagePlayer(s, p, { base: 60, sourceKind: 'enemy' });
    expect(p.shield).toBe(0); expect(p.hp).toBe(90);
    p.skills.health.level = 10;
    damagePlayer(s, p, { base: 100, sourceKind: 'enemy' });
    expect(p.hp).toBeCloseTo(90 - 73);
    damagePlayer(s, p, { base: 500, sourceKind: 'enemy' });
    expect(p.downed).toBe(true);
  });
  it('second wind: a kill revives a downed player', () => {
    const { s, p, e } = setup();
    p.hp = 1; p.shield = 0; damagePlayer(s, p, { base: 50, sourceKind: 'enemy' });
    expect(p.downed).toBe(true);
    damageEnemy(s, e, { sourceId: p.id, sourceKind: 'gun', base: 1000, zone: 'body' });
    expect(p.downed).toBe(false); expect(p.hp).toBeGreaterThan(0);
  });
});

describe('enemies shoot back (midgets never do)', () => {
  it('obamas fire slow, inaccurate bitcoin bursts; midgets only melee', () => {
    const s = createGameState({ seed: 4 }); const p = s.players[s.localPlayerId];
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } }, { type: 'debug', op: 'spawnEnemy', args: { type: 'midget', count: 5 } }] }));
    let ev = run(s, 60 * 6);
    expect(ev.some((e) => e.type === 'enemyShot')).toBe(false);
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'clearEnemies' }, { type: 'debug', op: 'spawnEnemy', args: { type: 'obama' } }] }));
    ev = run(s, 60 * 10);
    const shots = ev.filter((e) => e.type === 'enemyShot');
    expect(shots.length).toBeGreaterThan(2);
    expect(shots.length / 10).toBeLessThan(3); // < 3 shots/s, the player's MG does 10
    const bullets = s.projectiles.filter((x) => x.kind === 'bullet');
    for (const b of bullets) expect(Math.hypot(b.vel.x, b.vel.y, b.vel.z)).toBeLessThanOrEqual(31);
  });
  it('enemy stage models: base, +1 elite, +1 from tier 4', async () => {
    const { enemyStage } = await import('../src/data/enemies.js');
    expect(enemyStage({ type: 'midget', elite: false, tier: 1 })).toBe(1);
    expect(enemyStage({ type: 'midget', elite: true, tier: 1 })).toBe(2);
    expect(enemyStage({ type: 'obama', elite: true, tier: 5 })).toBe(3);
    expect(enemyStage({ type: 'bigObama', elite: false, tier: 1 })).toBe(3);
  });
});

describe('flying midgets', () => {
  it('fly fast above the ground and fire small, weak pellets', () => {
    const s = createGameState({ seed: 8 });
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } }, { type: 'debug', op: 'spawnEnemy', args: { type: 'flyingMidget', count: 3 } }] }));
    const ev = run(s, 60 * 8);
    const fl = s.enemies.filter((e) => e.type === 'flyingMidget');
    expect(fl.length).toBe(3);
    for (const e of fl) expect(e.pos.y).toBeGreaterThan(2);
    expect(Math.max(...fl.map((e) => Math.hypot(e.vel.x, e.vel.z)))).toBeGreaterThan(5);
    const shots = ev.filter((e) => e.type === 'enemyShot' && e.enemyType === 'flyingMidget');
    expect(shots.length).toBeGreaterThan(3);
    const pellets = s.projectiles.filter((p) => p.kind === 'pellet');
    for (const p of pellets) expect(p.damage).toBeLessThanOrEqual(3);
  });
  it('use the Midget stage 3 model', async () => {
    const { enemyStage } = await import('../src/data/enemies.js');
    expect(enemyStage({ type: 'flyingMidget', elite: false, tier: 1 })).toBe(3);
  });
});

describe('level-scoped loading', () => {
  it('level 1 needs only its stage and the models its wave spawns', async () => {
    const { levelAssets } = await import('../src/data/stages.js');
    const l1 = levelAssets(0, 1);
    expect(l1.stage).toBe('city');
    expect(l1.characters).toEqual([{ model: 'midget', stage: 1 }, { model: 'obama', stage: 1 }]);
    expect(l1.bosses.map((b) => b.model)).toEqual(['dragon', 'dragon', 'dragon']); // Jade Dragon, one model for all phases
    const l2 = levelAssets(1, 1);
    expect(l2.stage).toBe('volcano');
    expect(l2.characters).toContainEqual({ model: 'midget', stage: 3 }); // flying midgets
    expect(l2.bosses.map((b) => b.model)).toEqual(['tinubu', 'tinubu', 'tinubu']);
    expect(levelAssets(2, 1).bosses.map((b) => b.model)).toContain('sahil');
  });
});

describe('drops', () => {
  it('each enemy drops its own resource; elites drop double', () => {
    const r = createRng(1);
    const tank = rollDrops(r, 'bigObama', { tier: 1 });
    expect(tank.some((d) => d.resId === 'plating')).toBe(true);
    const sumScrap = (elite) => { const rr = createRng(9); let n = 0; for (let i = 0; i < 200; i++) n += rollDrops(rr, 'obama', { elite, tier: 1 }).filter((d) => d.resId === 'scrap').reduce((a, d) => a + d.amount, 0); return n; };
    expect(sumScrap(true)).toBeGreaterThan(sumScrap(false) * 1.7);
  });
  it('bosses drop a Boss Core; Hex drops Mana Crystals', () => {
    const r = createRng(2);
    expect(rollDrops(r, 'megaSproto', { tier: 1 }).some((d) => d.resId === 'bossCore')).toBe(true);
    expect(rollDrops(r, 'hexAuditor', { tier: 1 }).some((d) => d.resId === 'manaCrystal')).toBe(true);
  });
});

describe('use-based XP', () => {
  it('curve and perk unlocks', () => {
    expect(xpToNext('health', 1)).toBe(100);
    expect(xpToNext('gunslinger', 2)).toBe(174);
    const s = createGameState(); const p = s.players[s.localPlayerId];
    addXp(s, p, 'magic', 80 + 116 + 1);
    expect(p.skills.magic.level).toBe(3);
    expect(p.perks.chainZap).toBe(true);
    expect(p.maxMana).toBe(130);
  });
  it('casting spells levels Magic; killing a magic boss gives big Magic XP', () => {
    const s = createGameState(); const p = s.players[s.localPlayerId];
    run(s, 300, (st, i) => cmd({ pressed: { gooBolt: i % 40 === 0 } }));
    expect(p.skills.magic.total).toBeGreaterThan(0);
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'spawnBoss', args: { type: 'hexAuditor' } }] }));
    const before = p.skills.magic.total;
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'killAll' }] })); // gun kill of a Magic boss
    expect(p.skills.magic.total - before).toBeGreaterThanOrEqual(200);
  });
  it('kills give Health and Gunslinger XP; damage taken gives a little Health XP', () => {
    const s = createGameState(); const p = s.players[s.localPlayerId];
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'spawnEnemy', args: { type: 'midget' } }] }));
    run(s, 60);
    const e = s.enemies.find((x) => !x.dead);
    e.hp = 1;
    run(s, 1, () => { const yaw = Math.atan2(-(e.pos.x - p.pos.x), -(e.pos.z - p.pos.z)); return cmd({ yaw, pitch: Math.atan2(e.pos.y + 0.8 - 1.6, Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z)), held: { fire: true } }); });
    run(s, 1);
    expect(p.skills.gunslinger.total).toBeGreaterThan(0);
    expect(p.skills.health.total).toBeGreaterThan(0);
  });
});

describe('crafting', () => {
  it('every gun type has 5 tiers; bazooka always needs a Boss Core', () => {
    for (const t of ['mg', 'shotgun', 'sniper', 'bazooka']) expect(GUN_RECIPES.filter((r) => r.gunType === t)).toHaveLength(5);
    for (const r of GUN_RECIPES.filter((x) => x.gunType === 'bazooka')) expect(r.cost.bossCore).toBeGreaterThan(0);
  });
  it('validates distance, level and cost; crafting T1 gives Crafting XP', () => {
    const s = createGameState(); const p = s.players[s.localPlayerId];
    const box = s.weaponBoxes[0];
    expect(validateCraft(s, p, { boxId: box.id, recipeId: 'mg_t1' })).toMatch(/far/);
    p.pos = { x: box.pos.x + 1.5, y: 0, z: 0 };
    expect(validateCraft(s, p, { boxId: box.id, recipeId: 'mg_t1' })).toMatch(/resources/);
    p.resources.scrap = 100;
    expect(validateCraft(s, p, { boxId: box.id, recipeId: 'mg_t2' })).toMatch(/Lv 3/);
    expect(startCraft(s, p, { boxId: box.id, recipeId: 'mg_t1' })).toBe(true);
    expect(p.resources.scrap).toBe(80);
    const ev = run(s, 120, () => { p.pos = { x: box.pos.x + 1.5, y: 0, z: 0 }; return cmd(); });
    expect(ev.some((e) => e.type === 'craftComplete')).toBe(true);
    expect(p.skills.crafting.total).toBeGreaterThanOrEqual(60);
    expect(s.pickups.some((k) => k.kind === 'gun' && k.gun.source === 'craft')).toBe(true);
  });
  it('ammo is cheap (scrap only, at most 10) except rockets', () => {
    for (const id of ['ammo_bullets', 'ammo_shells', 'ammo_sniper']) {
      const r = RECIPES_BY_ID[id];
      expect(Object.keys(r.cost)).toEqual(['scrap']);
      expect(r.cost.scrap).toBeLessThanOrEqual(10);
    }
  });
});

describe('waves config', () => {
  it('3 waves with growing counts, mostly midget swarms, a boss on every wave', () => {
    const counts = WAVES.map((w) => w.groups.reduce((n, g) => n + g.spawns.reduce((m, s) => m + s.count, 0), 0));
    expect(counts[1]).toBeGreaterThan(counts[0]); expect(counts[2]).toBeGreaterThan(counts[1]);
    for (const w of WAVES) {
      const all = w.groups.flatMap((g) => g.spawns);
      const mid = all.filter((s) => s.type === 'midget').reduce((n, s) => n + s.count, 0);
      expect(mid / all.reduce((n, s) => n + s.count, 0)).toBeGreaterThan(0.5);
    }
    expect(WAVES[0].boss.types).toEqual(['dragon']);
    expect(WAVES[1].boss.types).toEqual(['megaSproto']);
    expect(WAVES[2].boss.types).toEqual(['megaSproto', 'hexAuditor']);
  });
});

describe('determinism', () => {
  it('same seed + same commands = same state', () => {
    const play = () => {
      const s = createGameState({ seed: 77 });
      run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 2 }] }));
      run(s, 900, (st, i) => cmd({ yaw: Math.sin(i / 50), held: { fire: i % 3 === 0 }, moveZ: 1, pressed: { jump: i % 60 === 0 } }));
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });
});
