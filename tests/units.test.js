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
    expect(l2.bosses.map((b) => b.model)).toEqual(['monster', 'monster', 'monster']);
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
    expect(WAVES[1].boss.types).toEqual(['monster']);
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

describe('test range', () => {
  it('gives every gun type with infinite ammo, and leaving resets the loadout', () => {
    const s = createGameState({ seed: 7 });
    const p = s.players[s.localPlayerId];
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'test', tier: 1 }] }));
    expect(p.guns.map((g) => g && g.type)).toEqual(['mg', 'shotgun', 'sniper', 'bazooka']);
    expect(new Set(p.guns.map((g) => g.id)).size).toBe(4);
    expect(s.tuning.infiniteAmmo).toBe(true);
    expect(s.enemies.filter((e) => e.type === 'dummy').length).toBe(5);
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }] }));
    expect(p.guns.map((g) => g && g.type)).toEqual(['mg', null, null, null]);
    expect(s.tuning.infiniteAmmo).toBe(false);
  });
});

describe('god mode', () => {
  it('hits still land but health never drops below 99, and P-style toggling revives', () => {
    const s = createGameState({ seed: 3 });
    const p = s.players[s.localPlayerId];
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    expect(s.tuning.godMode).toBe(true);
    const dealt = damagePlayer(s, p, { base: 500, sourceKind: 'enemy' });
    expect(dealt).toBeGreaterThan(0); // shield and the 1 HP above the floor still take the hit
    expect(p.hp).toBe(99);
    expect(p.downed).toBe(false);
    expect(p.tickets).toBe(99999);
    for (const v of Object.values(p.resources)) expect(v).toBe(9999);
    p.tickets = 0; run(s, 1, () => cmd());
    expect(p.tickets).toBe(99999); // kept topped up while god mode is on
    for (const id of ['gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor']) expect(p.perks[id]).toBe(true);
    damagePlayer(s, p, { base: 500, sourceKind: 'enemy' });
    expect(p.hp).toBe(99);
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    expect(p.perks.gooBolt).toBe(true); // Magic Lv 1 spell stays
    expect(p.perks.meteor).toBe(false); // god-mode-only spell locks again
    damagePlayer(s, p, { base: 500, sourceKind: 'enemy' });
    expect(p.downed).toBe(true);
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    expect(p.downed).toBe(false);
    expect(p.hp).toBeGreaterThanOrEqual(99);
  });
  it('keeps mana full so spells can be cast back to back (cooldowns still apply)', () => {
    const s = createGameState({ seed: 6 });
    const p = s.players[s.localPlayerId];
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    run(s, 1, () => cmd({ pressed: { swarm: true } }));
    expect(s.allies.length).toBeGreaterThan(0);
    expect(p.mana).toBe(p.maxMana);
    run(s, 1, () => cmd({ pressed: { meteor: true } }));
    expect(p.spells.cd.meteor).toBeGreaterThan(0);
    expect(p.mana).toBe(p.maxMana);
  });
  it('gives every gun endless spare ammo, still with reloads', () => {
    const s = createGameState({ seed: 8 });
    const p = s.players[s.localPlayerId];
    const sn = generateGun({ seed: 3, level: 1, forced: { type: 'sniper', quality: 'common', manufacturer: 'reliable', element: 'none' } });
    sn.id = 999; p.guns[1] = sn; p.activeSlot = 1; p.ammo.sniper = 0; sn.ammoInMag = 0;
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    p.ammo.sniper = 0; // god mode tops ammo up; empty it again to prove the reserve isn't used
    run(s, 1, () => cmd({ pressed: { reload: true } }));
    expect(p.reloadT).toBeGreaterThan(0);
    run(s, 4 * 60, () => cmd());
    expect(sn.ammoInMag).toBe(sn.stats.magSize);
    expect(p.ammo.sniper).toBe(p.ammoCap.sniper); // god mode keeps the reserve topped up; the reload didn't use it
  });
  it('gives one of every gun type, keeping guns you carry and dropping extras', () => {
    const s = createGameState({ seed: 10 });
    const p = s.players[s.localPlayerId];
    const mine = generateGun({ seed: 4, level: 1, forced: { type: 'shotgun', quality: 'epic', manufacturer: 'blastco', element: 'fire' } });
    const extra = generateGun({ seed: 5, level: 1, forced: { type: 'shotgun', quality: 'common', manufacturer: 'reliable', element: 'none' } });
    mine.id = 501; extra.id = 502; p.guns[1] = mine; p.guns[2] = extra; p.unlockedSlots = 3; p.activeSlot = 1;
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    expect(p.guns.map((g) => g.type)).toEqual(['mg', 'shotgun', 'sniper', 'bazooka']);
    expect(p.guns[1]).toBe(mine); // your epic shotgun is kept
    expect(p.activeSlot).toBe(1); // still holding it
    expect(p.unlockedSlots).toBe(4);
    expect(s.pickups.some((k) => k.kind === 'gun' && k.gun.id === 502)).toBe(true); // the spare is dropped, not deleted
  });
  it('is on in the Test Range and off again after leaving it', () => {
    const s = createGameState({ seed: 4 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'test', tier: 1 }] }));
    expect(s.tuning.godMode).toBe(true);
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }] }));
    expect(s.tuning.godMode).toBe(false);
  });
});

describe('machine gun ammo', () => {
  it('never runs out of spare ammo but still empties its magazine and takes time to reload', () => {
    const s = createGameState({ seed: 9 });
    const p = s.players[s.localPlayerId];
    const g = p.guns[0];
    expect(g.type).toBe('mg');
    p.ammo.bullets = 0;
    g.ammoInMag = 1;
    const fire = () => cmd({ held: { fire: true } });
    run(s, 10, fire); // fires the last round, then starts a reload instead of reporting empty
    expect(g.ammoInMag).toBe(0);
    expect(p.reloadT).toBeGreaterThan(2); // 2.5 s reload
    const ev = run(s, Math.ceil(2.6 * 60), () => cmd());
    expect(ev.some((e) => e.type === 'ammoEmpty')).toBe(false);
    expect(g.ammoInMag).toBe(g.stats.magSize);
    expect(p.ammo.bullets).toBe(0); // reserve untouched
  });
  it('enemies drop ammo for the guns you carry', async () => {
    const { rollDrops } = await import('../src/sim/drops.js');
    const { createRng } = await import('../src/core/rng.js');
    const rng = createRng(1);
    const ammo = [];
    for (let i = 0; i < 200; i++) ammo.push(...rollDrops(rng, 'obama', { tier: 1, playerGunTypes: ['bullets', 'sniper'] }).filter((d) => d.kind === 'ammo'));
    expect(ammo.length).toBeGreaterThan(100); // 70% for an obama
    expect(new Set(ammo.map((d) => d.ammoType))).toEqual(new Set(['bullets', 'sniper']));
  });
});

describe('sniper zoom levels', () => {
  it('the sniper has a second zoom three times stronger; other guns have one level', async () => {
    const { zoomFovFor, zoomLevelsOf } = await import('../src/data/guns.js');
    const sn = generateGun({ seed: 1, level: 1, forced: { type: 'sniper', quality: 'common', manufacturer: 'reliable', element: 'none' } });
    const mg = generateGun({ seed: 2, level: 1, forced: { type: 'mg', quality: 'common', manufacturer: 'reliable', element: 'none' } });
    expect(zoomLevelsOf(sn)).toBe(2);
    expect(zoomLevelsOf(mg)).toBe(1);
    expect(zoomFovFor(sn, 2)).toBeCloseTo(zoomFovFor(sn, 1) / 3);
    expect(zoomFovFor(mg, 2)).toBe(zoomFovFor(mg, 1));
  });
});

describe('boss melee, missiles and sandbox', () => {
  const setup = (mode) => {
    const s = createGameState({ seed: 21 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode, tier: 1 }] }));
    const p = s.players[s.localPlayerId];
    const b = createBoss(s, 'monster', { pos: { x: 0, z: 0 } });
    b.boss.action = { id: 'chase', t: 0, data: {} };
    return { s, p, b };
  };
  it('a boss swings for heavy damage when you get close', () => {
    const { s, p } = setup('waves');
    s.wave.phase = 'boss'; s.enemies = s.enemies.filter((e) => e.boss);
    p.pos = { x: 0, y: 0, z: 4 }; p.prevPos = { ...p.pos }; p.shield = 0;
    const ev = run(s, 60, () => cmd());
    expect(ev.some((e) => e.type === 'bossCast' && e.kind === 'melee')).toBe(true);
    expect(p.hp).toBeLessThan(p.maxHp - 30);
  });
  it('missiles home in and explode for splash damage', () => {
    const { s, p, b } = setup('waves');
    s.wave.phase = 'boss'; s.enemies = s.enemies.filter((e) => e.boss);
    p.pos = { x: 0, y: 0, z: 25 }; p.prevPos = { ...p.pos }; p.shield = 0;
    b.boss.action = { id: 'missiles', t: 0, data: {} };
    const ev = run(s, 5 * 60, () => cmd());
    expect(ev.some((e) => e.type === 'bossCast' && e.kind === 'missiles')).toBe(true);
    expect(ev.some((e) => e.type === 'explosion' && e.enemy)).toBe(true);
    expect(p.hp).toBeLessThan(p.maxHp);
  });
  it('in the sandbox boss hits land but deal no damage', () => {
    const { s, p } = setup('sandbox');
    p.pos = { x: 0, y: 0, z: 4 }; p.prevPos = { ...p.pos };
    const hp = p.hp, sh = p.shield;
    const ev = run(s, 5 * 60, () => cmd());
    expect(ev.some((e) => e.type === 'playerDamaged' && e.noDamage)).toBe(true);
    expect(p.hp).toBe(hp);
    expect(p.shield).toBe(sh);
  });
});

describe('boss fight mode', () => {
  it('spawns the chosen boss with real damage and ends on a win or a loss', () => {
    const s = createGameState({ seed: 31 });
    const p = s.players[s.localPlayerId];
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'megaSproto' }] }));
    expect(s.mode).toBe('boss');
    expect(s.enemies.filter((e) => e.boss).map((e) => e.type)).toEqual(['megaSproto']);
    expect(p.guns.map((g) => g.type)).toEqual(['mg', 'shotgun', 'sniper', 'bazooka']);
    damagePlayer(s, p, { base: 20, sourceKind: 'boss' }); // not the sandbox: boss hits hurt
    expect(p.shield).toBeLessThan(p.maxShield);
    const won = run(s, 2, () => cmd({ actions: [{ type: 'debug', op: 'killAll' }] }));
    expect(won.find((e) => e.type === 'bossFightOver')).toMatchObject({ won: true, boss: 'megaSproto' });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'monster' }] }));
    p.hp = 1; p.shield = 0;
    damagePlayer(s, p, { base: 500, sourceKind: 'boss' });
    p.downedT = 0;
    const lost = run(s, 3, () => cmd());
    expect(lost.find((e) => e.type === 'bossFightOver')).toMatchObject({ won: false, boss: 'monster' });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }] }));
    expect(p.guns.map((g) => g && g.type)).toEqual(['mg', null, null, null]); // leaving gives the starting loadout back
  });
});

describe('jade dragon flight and sproto beast combos', () => {
  it('the dragon takes off, circles at altitude dropping fireballs, then lands', () => {
    const s = createGameState({ seed: 41 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'dragon' }] }));
    const b = s.enemies.find((e) => e.boss);
    b.boss.action = { id: 'fly', t: 0, data: {} };
    let maxY = 0; const kinds = new Set();
    for (let i = 0; i < 6 * 60; i++) { run(s, 1, () => cmd()); maxY = Math.max(maxY, b.pos.y); s.projectiles.forEach((p) => kinds.add(p.kind)); if (b.boss.action.id !== 'fly') break; }
    expect(maxY).toBeGreaterThan(5);
    expect(kinds.has('fireball')).toBe(true);
    run(s, 4 * 60, () => cmd());
    expect(b.pos.y).toBe(0); // landed
  });
  it('the sproto beast mixes punches and kicks; kicks hit harder', () => {
    const s = createGameState({ seed: 42 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'sprotoBeast' }] }));
    const p = s.players[s.localPlayerId];
    s.tuning.godMode = true; // keep the player standing for several swings
    const variants = [];
    for (let i = 0; i < 20 * 60 && variants.length < 4; i++) {
      p.pos = { x: 0, y: 0, z: -14 }; p.prevPos = { ...p.pos };
      const b = s.enemies.find((e) => e.boss); b.pos.x = 0; b.pos.z = -18;
      for (const ev of run(s, 1, () => cmd())) if (ev.type === 'bossCast' && ev.kind === 'melee') variants.push(ev.variant);
    }
    expect(variants).toContain('punch');
    expect(variants).toContain('kick');
  });
});

describe('weapon range', () => {
  it('shotgun pellets cannot hit past their range and lose damage with distance', async () => {
    const { gunRange, rangeFalloff } = await import('../src/data/guns.js');
    const { fireHitscan } = await import('../src/sim/player.js');
    const sg = generateGun({ seed: 1, level: 1, forced: { type: 'shotgun', quality: 'common', manufacturer: 'reliable', element: 'none' } });
    sg.parts.barrel = 'stock';
    const r = gunRange(sg);
    expect(r.max).toBe(16);
    expect(rangeFalloff(r, 5)).toBe(1);
    expect(rangeFalloff(r, 12)).toBeLessThan(1);
    expect(rangeFalloff(r, 20)).toBe(0);
    const shootAt = (dist) => {
      const s = createGameState({ seed: 2 });
      const p = s.players[s.localPlayerId];
      const e = createEnemy(s, 'dummy', { pos: { x: 0, z: p.pos.z - dist } });
      e.state = 'idle';
      const hp = e.hp;
      fireHitscan(s, p, sg, { ...sg.stats, pellets: 1, critChance: 0 }, { x: 0, y: 1.1, z: p.pos.z }, { x: 0, y: 0, z: -1 });
      return hp - e.hp;
    };
    const near = shootAt(4), mid = shootAt(12), far = shootAt(22);
    expect(near).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(near);
    expect(far).toBe(0);
  });
});

describe('boss movement feel', () => {
  it('the flying dragon weaves: altitude and distance change, and it swoops low', () => {
    const s = createGameState({ seed: 43 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'dragon' }] }));
    const p = s.players[s.localPlayerId], b = s.enemies.find((e) => e.boss);
    run(s, 120, () => cmd());
    b.boss.action = { id: 'fly', t: 0, data: {} };
    const alts = [], dists = [];
    for (let i = 0; i < 8 * 60 && b.boss.action.id === 'fly'; i++) {
      run(s, 1, () => cmd());
      if (b.boss.action.t > 1.5 && b.boss.action.t < 8) { alts.push(b.pos.y); dists.push(Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z)); }
    }
    expect(Math.max(...alts) - Math.min(...alts)).toBeGreaterThan(4); // rolls up and down, incl. the swoop
    expect(Math.min(...alts)).toBeLessThan(4); // the swoop comes down low
    expect(Math.max(...dists) - Math.min(...dists)).toBeGreaterThan(5); // swings in and out
  });
  it('physical bosses turn at a limited rate instead of snapping', () => {
    const s = createGameState({ seed: 44 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'boss', tier: 1, boss: 'monster' }] }));
    const p = s.players[s.localPlayerId], b = s.enemies.find((e) => e.boss);
    run(s, 150, () => cmd());
    b.boss.action = { id: 'chase', t: 0, data: {} };
    b.yaw = 0; p.pos = { x: 0, y: 0, z: b.pos.z + 20 }; p.prevPos = { ...p.pos }; // player straight behind it
    let maxStep = 0, prev = b.yaw;
    for (let i = 0; i < 30; i++) { run(s, 1, () => cmd()); const st = Math.abs(Math.atan2(Math.sin(b.yaw - prev), Math.cos(b.yaw - prev))); maxStep = Math.max(maxStep, st); prev = b.yaw; }
    expect(maxStep).toBeLessThan(0.1); // ≤ ~6° per tick, never a 180° snap
  });
});

describe('animation math (anim.js)', () => {
  it('the critically damped spring is frame-rate independent', async () => {
    const { springTo, spring } = await import('../src/render/anim.js');
    const run = (fps) => { const s = spring(); for (let i = 0; i < fps * 0.5; i++) springTo(s, 1, 0.1, 1 / fps); return s.x; };
    expect(Math.abs(run(30) - run(144))).toBeLessThan(1e-6);
    expect(run(60)).toBeGreaterThan(0.9); // mostly there after 5 half-lives
  });
  it('a boss strike holds its windup, then reaches full extension exactly on the damage frame', async () => {
    const { attackEnvelope, STRIKE } = await import('../src/render/anim.js');
    const w = 0.75, rec = 0.9;
    expect(attackEnvelope(w * 0.7, w, rec)).toMatchObject({ wind: 1, hit: 0 }); // held, cocked
    expect(attackEnvelope(w - STRIKE / 2, w, rec).hit).toBeLessThan(0.2); // accelerating: slow start
    expect(attackEnvelope(w, w, rec).hit).toBe(1); // contact on the damage frame
    expect(attackEnvelope(w + 0.1, w, rec).rec).toBe(0); // impact hold
    expect(attackEnvelope(w + rec, w, rec).rec).toBe(1); // recovered
  });
  it('the leg cycle keeps the foot planted for the duty factor and sweeps it back while planted', async () => {
    const { legCycle } = await import('../src/render/anim.js');
    let planted = 0;
    for (let i = 0; i < 1000; i++) if (legCycle(i / 1000, 0.77).lift === 0) planted++;
    expect(planted / 1000).toBeCloseTo(0.77, 2);
    expect(legCycle(0, 0.77).swing).toBeGreaterThan(legCycle(0.5, 0.77).swing); // stance moves the leg back
  });
});
