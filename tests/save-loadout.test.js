import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from './helpers.js';
import { generateGun } from '../src/sim/guns.js';
import { LEGENDARY_SLOT } from '../src/data/guns.js';
import { stateHash } from '../src/sim/hash.js';
import { buildIssuedState, canonicalLoadoutOk } from '../src/server/runContract.js';
import { CANONICAL_BOSSES } from '../src/data/serverManifest.js';
import { quantizeCommand } from '../src/server/protocol.js';
import { cloudBody } from '../src/save/profile.js';
import { PERKS, SKILL_IDS } from '../src/data/skills.js';
import { onEnemyKilled } from '../src/sim/combat.js';
import { createBoss } from '../src/sim/state.js';
import { addXp } from '../src/sim/progression.js';
import { spawnGunPickup } from '../src/sim/drops.js';
import { nonEconomicSave } from '../src/hub/link.js';
import {
  LOADOUT_KEY, MAX_SAVED_GUNS, debugTaints, gunSpec, loadoutAction, loadoutEmpty, loadoutFromState, normalizeLoadout, readLoadout, writeLoadout,
} from '../src/save/loadout.js';

const waves = (seed = 3) => {
  const s = createGameState({ seed });
  run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }] }));
  return { s, p: s.players[s.localPlayerId] };
};
const kit = (s, p) => {
  const epic = generateGun({ seed: 77, level: 3, forced: { type: 'shotgun', quality: 'epic' } }); epic.id = 9001;
  const leg = generateGun({ seed: 78, level: 4, forced: { type: 'raygun', quality: 'legendary' } }); leg.id = 9002;
  p.guns[1] = epic; p.guns[LEGENDARY_SLOT] = leg;
  p.skills.health.level = 4; p.skills.health.xp = 33; p.skills.health.total = 900;
  p.skills.gunslinger.level = 6; p.skills.gunslinger.xp = 10; p.skills.gunslinger.total = 2000;
  return { epic, leg };
};
const apply = (s, loadout) => run(s, 1, () => cmd({ actions: [loadoutAction(loadout)] }));

describe('saved Wave Mode loadout', () => {
  it('round-trips skills and guns through a save, rebuilding each gun from its seed', () => {
    const a = waves();
    const { epic, leg } = kit(a.s, a.p);
    const saved = JSON.parse(JSON.stringify(loadoutFromState(a.s, 2)));
    expect(saved.guns.map((g) => g.slot)).toEqual([0, 1, LEGENDARY_SLOT]);
    expect(saved.bestTier).toBe(2);
    const b = waves(9);
    apply(b.s, saved);
    expect(b.p.guns[1].stats).toEqual(epic.stats);
    expect(b.p.guns[1].name).toBe(epic.name);
    expect(b.p.guns[LEGENDARY_SLOT].stats).toEqual(leg.stats);
    expect(b.p.guns[LEGENDARY_SLOT].wacky).toBe(leg.wacky);
    expect(b.p.guns.filter(Boolean).every((g) => g.source === 'stash')).toBe(true);
    expect(b.p.skills.health).toMatchObject({ level: 4, xp: 33 });
    expect(b.p.skills.gunslinger.level).toBe(6);
    // perks and passives follow the levels
    expect(b.p.perks.quickShield).toBe(true);
    expect(b.p.perks.deadeye).toBe(true);
    expect(b.p.perks.killFrenzy).toBeFalsy();
    expect(b.p.maxHp).toBeGreaterThan(100);
    expect(b.p.hp).toBe(b.p.maxHp);
  });

  it('never lowers a skill and ignores an empty save', () => {
    const { s, p } = waves();
    p.skills.health.level = 5;
    const before = p.guns[0];
    apply(s, normalizeLoadout({ skills: { health: { level: 2, xp: 0 } }, guns: [] }));
    expect(p.skills.health.level).toBe(5);
    expect(p.guns[0]).toBe(before);
    expect(loadoutEmpty(normalizeLoadout(null))).toBe(true);
    expect(loadoutEmpty(loadoutFromState(s))).toBe(false);
  });

  it('drops what a tampered or broken save claims', () => {
    const { s, p } = waves();
    const good = gunSpec(generateGun({ seed: 5, level: 2, forced: { type: 'sniper', quality: 'rare' } }), 0);
    run(s, 1, () => cmd({ actions: [{ type: 'loadLoadout',
      skills: { health: { level: 99, xp: 1e9 }, gunslinger: { level: 'x' } },
      guns: [
        { ...good, type: 'nope' }, // unknown type
        { ...good, quality: 'mythic' }, // unknown quality
        { ...good, level: 500 }, // above the tier cap
        { ...good, type: 'duckgun', quality: 'legendary', slot: LEGENDARY_SLOT }, // sandbox only
        { ...good, slot: 0, parts: { barrel: 'long', grip: 'ergo', mag: 'stock', scope: 'stock' }, quality: 'common' }, // more parts than a Common has
        good,
      ] }] }));
    expect(p.skills.health.level).toBe(1);
    expect(p.skills.gunslinger.level).toBe(1);
    const carried = p.guns.filter(Boolean);
    expect(carried.map((g) => g.type)).toEqual(['sniper']); // the over-parted Common took slot 0; the good one is on the floor
    expect(carried[0].quality).toBe('common');
    expect(Object.values(carried[0].parts).filter((x) => x !== 'stock').length).toBeLessThanOrEqual(1);
    expect(s.pickups.filter((k) => k.gun && k.gun.source === 'stash').map((k) => k.gun.quality)).toEqual(['rare']);
    for (const g of [...carried, ...s.pickups.map((k) => k.gun).filter(Boolean)]) expect(g.level).toBeLessThanOrEqual(10);
  });

  it('keeps at most eight guns and puts the ones without a slot on the floor', () => {
    const { s, p } = waves();
    p.unlockedSlots = 3;
    const specs = Array.from({ length: 12 }, (_, i) => gunSpec(generateGun({ seed: 100 + i, level: 1, forced: { type: 'mg', quality: 'common' } }), i % 5));
    expect(normalizeLoadout({ guns: specs }).guns.length).toBe(MAX_SAVED_GUNS);
    apply(s, { guns: specs });
    const floor = s.pickups.filter((k) => k.gun && k.gun.source === 'stash').length;
    expect(p.guns.filter(Boolean).length + floor).toBe(MAX_SAVED_GUNS);
    expect(p.guns[3]).toBeNull(); // the fourth slot is locked
    expect(p.guns[LEGENDARY_SLOT]).toBeNull(); // a Common never takes the legendary slot
  });

  it('is ignored outside Wave Mode, so it cannot reach a campaign level or a boss fight', () => {
    const src = waves();
    kit(src.s, src.p);
    const saved = loadoutFromState(src.s);
    for (const [mode, extra] of [['campaign', { level: 'L02' }], ['boss', { boss: 'monster' }], ['sandbox', {}], ['test', {}]]) {
      const s = createGameState({ seed: 3 });
      run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode, tier: 1, ...extra }] }));
      const p = s.players[s.localPlayerId];
      const before = JSON.stringify([p.guns, p.skills]);
      apply(s, saved);
      expect(JSON.stringify([p.guns, p.skills]), mode).toBe(before);
    }
  });

  it('cannot enter a rewarded run: the issued state is canonical and the wire format refuses the action', () => {
    const src = waves();
    kit(src.s, src.p);
    const action = loadoutAction(loadoutFromState(src.s));
    for (const boss of CANONICAL_BOSSES) {
      const issuance = { canonicalBoss: boss.id, seed: 7, sectionId: boss.sectionId };
      const plain = buildIssuedState(issuance);
      const poked = buildIssuedState(issuance);
      const p = poked.players[poked.localPlayerId];
      expect(canonicalLoadoutOk(poked), boss.id).toBe(true);
      run(poked, 1, () => cmd({ actions: [action] }));
      run(plain, 1, () => cmd());
      // the player keeps its last command, so step both once more before comparing whole states
      run(poked, 1, () => cmd());
      run(plain, 1, () => cmd());
      expect(stateHash(poked), boss.id).toBe(stateHash(plain));
      expect(p.guns.filter(Boolean).map((g) => g.source)).toEqual(['start']);
      expect(p.skills.health.level).toBe(1);
      expect(canonicalLoadoutOk(poked), boss.id).toBe(true);
    }
    expect(() => quantizeCommand(cmd({ actions: [action] }))).toThrow();
  });

  it('is stored under its own key and never rides the hub save', () => {
    const mem = new Map();
    globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); } };
    try {
      const { s, p } = waves();
      kit(s, p);
      writeLoadout(loadoutFromState(s, 3));
      expect([...mem.keys()]).toEqual([LOADOUT_KEY]);
      expect(readLoadout().guns.length).toBe(3);
      expect(readLoadout().bestTier).toBe(3);
      // the campaign profile's cloud body has no room for it, and the hub filter strips `guns` anyway
      expect(Object.keys(cloudBody({ ...readLoadout(), unlocked: ['L01'] })).sort()).toEqual(['modifiers', 'settings', 'unlocked', 'updatedAt', 'v']);
      expect(nonEconomicSave({ guns: readLoadout().guns, unlocked: ['L01'] }).guns).toBeUndefined();
      mem.set(LOADOUT_KEY, '{not json');
      expect(loadoutEmpty(readLoadout())).toBe(true);
    } finally { delete globalThis.localStorage; }
  });
});

// Saved progress is Wave Mode's alone. Whatever order the modes are visited in, every other mode starts
// from its own clean loadout and level-1 skills, and nothing a save brought in is left on the floor.
describe('saved progress never leaves Wave Mode', () => {
  // The worst save there is: both skills maxed, a level-10 legendary boss gun in every slot and three spares.
  const RICH = normalizeLoadout({
    skills: { health: { level: 10, xp: 0, total: 99999 }, gunslinger: { level: 10, xp: 0, total: 99999 } },
    guns: Array.from({ length: 8 }, (_, i) => gunSpec(generateGun({ seed: 500 + i, level: 10, forced: { type: i % 2 ? 'bigbullets' : 'raygun', quality: 'legendary' } }), i % 5)),
  });
  const OTHERS = [
    ['campaign', { level: 'L01' }], ['campaign', { level: 'L06' }], ['campaign', { level: 'L10' }],
    ['boss', { boss: 'monster' }], ['sandbox', {}], ['test', {}],
  ];
  const go = (s, mode, extra = {}, more = []) => run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode, tier: 1, ...extra }, ...more] }));
  const enterWaves = (s) => go(s, 'waves', {}, [loadoutAction(RICH)]);
  const expectRich = (s, why) => {
    const p = s.players[s.localPlayerId];
    expect(p.skills.health.level, why).toBe(10);
    expect(p.skills.gunslinger.level, why).toBe(10);
    expect(p.perks.unkillable, why).toBe(true);
    expect(p.maxHp, why).toBe(172);
    expect(p.guns.filter(Boolean).every((g) => g.source === 'stash' && g.level === 10), why).toBe(true);
    expect(p.guns.filter(Boolean).length + s.pickups.filter((k) => k.gun && k.gun.source === 'stash').length, why).toBe(8);
  };
  const expectClean = (s, mode, why) => {
    const p = s.players[s.localPlayerId];
    for (const id of SKILL_IDS) expect(p.skills[id], why).toEqual({ level: 1, xp: 0, total: 0 });
    for (const perk of PERKS) expect(!!p.perks[perk.id], `${why} ${perk.id}`).toBe(false);
    expect(p.maxHp, why).toBe(100);
    expect(p.hp, why).toBe(100);
    for (const id of ['chainZap', 'swarm', 'manaShield', 'meteor']) expect(!!p.spellUnlocks[id], why).toBe(false);
    // nothing from the save, carried or on the floor
    const all = [...p.guns.filter(Boolean), ...s.pickups.map((k) => k.gun).filter(Boolean)];
    expect(all.filter((g) => g.source === 'stash'), why).toEqual([]);
    expect(all.filter((g) => g.level > 1 || g.type === 'raygun' || g.type === 'bigbullets'), why).toEqual([]);
    const sources = p.guns.filter(Boolean).map((g) => g.source);
    if (mode === 'campaign' || mode === 'sandbox') expect(sources, why).toEqual(['start']);
    if (mode === 'boss') { expect(sources.every((x) => x === 'start' || x === 'god'), why).toBe(true); expect(p.guns[LEGENDARY_SLOT], why).toBeNull(); }
    if (mode === 'test') expect(sources.every((x) => x === 'test'), why).toBe(true);
    // the sandbox's own Duck Gun may lie on the floor there and in the Test Range; nowhere else has a gun pickup
    if (mode !== 'sandbox' && mode !== 'test') expect(s.pickups.filter((k) => k.gun), why).toEqual([]);
    else expect(s.pickups.filter((k) => k.gun && k.gun.type !== 'duckgun'), why).toEqual([]);
  };

  it('every other mode entered straight from Wave Mode is clean, with or without the client flag', () => {
    for (const [mode, extra] of OTHERS) for (const flag of [{}, { freshLoadout: true }]) {
      const s = createGameState({ seed: 3 });
      go(s, 'sandbox'); // what the title screen does at boot
      enterWaves(s);
      run(s, 30, () => cmd());
      expectRich(s, 'waves');
      go(s, mode, { ...extra, ...flag });
      expectClean(s, mode, `waves -> ${mode} ${extra.level || ''}`);
      run(s, 30, () => cmd());
      expectClean(s, mode, `waves -> ${mode} ${extra.level || ''} later`);
    }
  });

  it('stays clean through every order of two further modes, and Wave Mode gets it all back each time', () => {
    for (const a of OTHERS) for (const b of OTHERS) {
      const s = createGameState({ seed: 5 });
      go(s, 'sandbox');
      enterWaves(s);
      go(s, a[0], a[1]);
      expectClean(s, a[0], `waves -> ${a[0]}`);
      go(s, b[0], b[1]);
      expectClean(s, b[0], `waves -> ${a[0]} -> ${b[0]}`);
      enterWaves(s);
      expectRich(s, `... -> ${b[0]} -> waves`);
      go(s, a[0], a[1]);
      expectClean(s, a[0], `second visit to ${a[0]}`);
    }
  });

  it('is clean when the page was reloaded mid-run and the save came back in the same command', () => {
    for (const [mode, extra] of OTHERS) {
      // reload: a new state, the boot sandbox, then Wave Mode and the saved loadout queued together
      const s = createGameState({ seed: 8 });
      run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'sandbox', tier: 1 }, { type: 'startMode', mode: 'waves', tier: 3, freshLoadout: true }, loadoutAction(RICH)] }));
      expectRich(s, 'reload');
      run(s, 60 * 5, () => cmd()); // mid-wave
      go(s, mode, extra);
      expectClean(s, mode, `reload -> waves -> ${mode}`);
    }
    // even with all three mode changes in one command
    const s = createGameState({ seed: 8 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }, loadoutAction(RICH), { type: 'startMode', mode: 'campaign', level: 'L01' }] }));
    expectClean(s, 'campaign', 'one command');
  });

  it('takes Wave Mode loot found in the session with it too, and what a boss dropped on the floor', () => {
    const s = createGameState({ seed: 4 });
    go(s, 'waves');
    const p = s.players[s.localPlayerId];
    const b = createBoss(s, 'monster', { pos: { x: 0, z: -4 } });
    onEnemyKilled(s, b);
    expect(s.pickups.filter((k) => k.gun).length).toBeGreaterThan(0);
    p.skills.health.level = 4; p.perks.quickShield = true;
    go(s, 'boss', { boss: 'dragon' });
    expectClean(s, 'boss', 'session loot');
  });

  it('leaves Wave Mode to Wave Mode alone, and modes that never saw Wave Mode', () => {
    const s = createGameState({ seed: 3 });
    enterWaves(s);
    go(s, 'waves', { tier: 2 });
    expectRich(s, 'next tier');
    // a campaign run keeps what it earned from level to level
    const c = createGameState({ seed: 3 });
    go(c, 'campaign', { level: 'L06' });
    const p = c.players[c.localPlayerId];
    p.skills.health.level = 3;
    const g = generateGun({ seed: 9, forced: { type: 'shotgun', quality: 'common' } }); g.id = 777; p.guns[1] = g;
    go(c, 'campaign', { level: 'L07' });
    expect(p.skills.health.level).toBe(3);
    expect(p.guns[1]).toBe(g);
  });

  it('never saves what the debug panel made', () => {
    expect(debugTaints({ type: 'debug', op: 'spawnGun' })).toBe(true);
    expect(debugTaints({ type: 'debug', op: 'maxSkills' })).toBe(true);
    expect(debugTaints({ type: 'debug', op: 'toggleGod' })).toBe(true);
    expect(debugTaints({ type: 'debug', op: 'spawnDummies' })).toBe(false); // the title screen's own backdrop
    expect(debugTaints({ type: 'startMode', mode: 'waves' })).toBe(false);
    expect(debugTaints({ type: 'pickupGun', pickupId: 1 })).toBe(false);
    // and a debug-spawned or god-mode gun is left out of a save even if one is written
    const { s, p } = waves();
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'spawnGun', args: { type: 'sniper', quality: 'legendary' } }] }));
    const k = s.pickups.find((x) => x.gun);
    p.pos.x = k.pos.x; p.pos.z = k.pos.z;
    run(s, 1, () => cmd({ actions: [{ type: 'pickupGun', pickupId: k.id }] }));
    expect(p.guns.filter(Boolean).map((g) => g.source).sort()).toEqual(['debug', 'start']);
    expect(loadoutFromState(s).guns.map((g) => g.type)).toEqual(['mg']);
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    expect(p.guns.some((g) => g && g.source === 'god')).toBe(true);
    expect(loadoutFromState(s).guns.map((g) => g.type)).toEqual(['mg']);
  });
});

// What Game.start does around a mode change (src/game/Game.js): write the save on the way out of Wave
// Mode, and queue the saved loadout behind startMode on the way in from any other mode.
describe('Wave Mode save across mode switches', () => {
  const OTHERS = [['campaign', { level: 'L01' }], ['campaign', { level: 'L06' }], ['boss', { boss: 'dragon' }], ['sandbox', {}], ['test', {}]];
  const SAVE = normalizeLoadout({
    skills: { health: { level: 3, xp: 5, total: 400 }, gunslinger: { level: 2, xp: 0, total: 150 } },
    guns: [
      gunSpec(generateGun({ seed: 601, level: 2, forced: { type: 'mg', quality: 'rare' } }), 0),
      gunSpec(generateGun({ seed: 602, level: 2, forced: { type: 'shotgun', quality: 'epic' } }), 1),
      gunSpec(generateGun({ seed: 603, level: 3, forced: { type: 'sniper', quality: 'rare' } }), 2),
      gunSpec(generateGun({ seed: 604, level: 3, forced: { type: 'bazooka', quality: 'epic' } }), 3), // the fourth slot starts locked
      gunSpec(generateGun({ seed: 605, level: 3, forced: { type: 'raygun', quality: 'legendary' } }), LEGENDARY_SLOT),
      gunSpec(generateGun({ seed: 606, level: 3, forced: { type: 'bigbullets', quality: 'legendary' } }), LEGENDARY_SLOT), // a second legendary
    ],
    bestTier: 2,
  });
  const seeds = (l) => l.guns.map((g) => g.seed).sort();
  const skillsOf = (l) => SKILL_IDS.map((id) => `${l.skills[id].level}:${l.skills[id].xp}`).join(' ');
  const player = (s) => s.players[s.localPlayerId];
  // The client's own sequence. `disk` stands in for localStorage.
  function start(s, disk, mode, extra = {}, flag = true) {
    const from = s.mode;
    if (from === 'waves') disk.save = JSON.parse(JSON.stringify(loadoutFromState(s, disk.save.bestTier)));
    // `flag` false leaves out the campaign's flag, which the sim must not need. Leaving the sandbox always
    // carries it: only the client knows a sandbox from a state that no mode has started.
    const fresh = (from === 'sandbox' && !s.testMode && mode !== 'sandbox' && mode !== 'test') || (flag && mode === 'campaign' && from !== 'campaign');
    const actions = [{ type: 'startMode', mode, tier: 1, ...extra, ...(fresh ? { freshLoadout: true } : {}) }];
    if (mode === 'waves' && from !== 'waves' && !loadoutEmpty(disk.save)) actions.push(loadoutAction(disk.save));
    run(s, 1, () => cmd({ actions }));
    if (mode === 'waves') disk.save = JSON.parse(JSON.stringify(loadoutFromState(s, disk.save.bestTier))); // any later save point
  }
  // Progress made where it must not count: levels, perks, carried loot, loot on the floor, a wave spell.
  function earnOutside(s) {
    const p = player(s);
    addXp(s, p, 'health', 3000); addXp(s, p, 'gunslinger', 3000);
    expect(p.skills.health.level).toBeGreaterThan(5);
    expect(p.skills.gunslinger.level).toBeGreaterThan(5);
    const a = generateGun({ seed: 9100 + s.tick, level: 9, forced: { type: 'raygun', quality: 'epic' } }); a.id = 50000 + s.tick; a.source = 'drop';
    p.guns[1] = a;
    spawnGunPickup(s, generateGun({ seed: 9200 + s.tick, level: 9, forced: { type: 'sniper', quality: 'legendary' } }), { x: p.pos.x, z: p.pos.z - 2 }, 'boss');
    p.spellUnlocks.meteor = true;
  }
  function expectFreshWaves(s, why) {
    const p = player(s);
    for (const id of SKILL_IDS) expect(p.skills[id], why).toEqual({ level: 1, xp: 0, total: 0 });
    for (const perk of PERKS) expect(!!p.perks[perk.id], `${why} ${perk.id}`).toBe(perk.level === 1);
    expect(p.maxHp, why).toBe(100);
    // only the starting gun (it reads 'stash' once it has been through a save)
    expect(p.guns.filter(Boolean).map((g) => [g.seed, g.type, g.quality, g.level]), why).toEqual([[0xC0FFEE, 'mg', 'common', 1]]);
    expect(s.pickups.filter((k) => k.gun), why).toEqual([]);
    expect(!!p.spellUnlocks.meteor, why).toBe(false);
    // all a save written now would hold is the starting gun
    const saved = loadoutFromState(s);
    expect(saved.guns.map((g) => g.seed), why).toEqual([0xC0FFEE]);
    expect(loadoutEmpty({ ...saved, guns: [] }), why).toBe(true);
  }
  function expectSaved(s, disk, why) {
    const p = player(s);
    expect(skillsOf(disk.save), why).toBe(skillsOf(SAVE));
    expect(seeds(disk.save), why).toEqual(seeds(SAVE));
    expect(p.skills.health, why).toMatchObject({ level: 3, xp: 5 });
    expect(p.skills.gunslinger.level, why).toBe(2);
    expect(!!p.spellUnlocks.meteor, why).toBe(false);
    const all = [...p.guns.filter(Boolean), ...s.pickups.map((k) => k.gun).filter(Boolean)];
    expect(all.map((g) => g.source), why).toEqual(all.map(() => 'stash'));
    expect(all.map((g) => g.seed).sort(), why).toEqual(seeds(SAVE));
  }

  it('skills, guns and spells earned in another mode never enter Wave Mode or its save, in any order of modes', () => {
    for (const flag of [true, false]) for (const withSave of [false, true]) for (const a of OTHERS) for (const b of [null, ...OTHERS]) {
      const why = `${a[0]}${a[1].level || ''} -> ${b ? b[0] + (b[1].level || '') : ''} -> waves, save ${withSave}, flag ${flag}`;
      const s = createGameState({ seed: 6 });
      const disk = { save: JSON.parse(JSON.stringify(withSave ? SAVE : normalizeLoadout(null))) };
      const check = (w) => (withSave ? expectSaved(s, disk, w) : expectFreshWaves(s, w));
      start(s, disk, 'sandbox', {}, flag); // the title screen's backdrop
      start(s, disk, a[0], a[1], flag); earnOutside(s);
      if (b) { start(s, disk, b[0], b[1], flag); earnOutside(s); }
      start(s, disk, 'waves', {}, flag);
      check(why);
      run(s, 30, () => cmd());
      check(`${why}, later`);
      // out again, earn again, and back: still only what Wave Mode saved
      const c = b || a;
      start(s, disk, c[0], c[1], flag); earnOutside(s);
      start(s, disk, a[0], a[1], flag); earnOutside(s);
      start(s, disk, 'waves', {}, flag);
      check(`${why}, second visit`);
      start(s, disk, 'waves', { tier: 2 }, flag); // the next tier keeps it
      check(`${why}, next tier`);
    }
  });

  it('a mode entered first on a new page brings nothing into Wave Mode either', () => {
    for (const [mode, extra] of OTHERS) {
      const s = createGameState({ seed: 6 });
      const disk = { save: normalizeLoadout(null) };
      start(s, disk, mode, extra); earnOutside(s);
      start(s, disk, 'waves');
      expectFreshWaves(s, `${mode} -> waves`);
    }
  });

  it('Wave Mode progress is still kept from tier to tier and through a retry', () => {
    const s = createGameState({ seed: 6 });
    const disk = { save: normalizeLoadout(null) };
    start(s, disk, 'waves');
    const p = player(s);
    addXp(s, p, 'health', 3000);
    const level = p.skills.health.level;
    const g = generateGun({ seed: 31, level: 2, forced: { type: 'shotgun', quality: 'epic' } }); g.id = 4242; g.source = 'drop'; p.guns[1] = g;
    start(s, disk, 'waves', { tier: 2 });
    expect(p.skills.health.level).toBe(level);
    expect(p.guns[1]).toBe(g);
    expect(disk.save.skills.health.level).toBe(level);
    expect(disk.save.guns.map((x) => x.seed)).toContain(31);
  });

  it('a saved gun on the floor stays in the save through every order of modes', () => {
    const floorSeeds = (s) => s.pickups.filter((k) => !k.dead && k.gun).map((k) => k.gun.seed).sort();
    // With slot four locked the bazooka (604) waits on the floor; the second legendary (606) always does.
    for (const slots of [3, 4]) for (const a of OTHERS) for (const b of [null, ...OTHERS]) {
      const why = `${slots} slots: waves -> ${a[0]}${a[1].level || ''} -> ${b ? b[0] + (b[1].level || '') : ''} -> waves`;
      const onFloor = slots === 3 ? [604, 606] : [606];
      const s = createGameState({ seed: 7 });
      const disk = { save: JSON.parse(JSON.stringify(SAVE)) };
      const p = player(s);
      p.unlockedSlots = slots;
      start(s, disk, 'waves');
      expect(p.unlockedSlots, why).toBe(slots);
      expect(floorSeeds(s), why).toEqual(onFloor);
      expect(s.pickups.filter((k) => k.gun).every((k) => k.ttl === Infinity), why).toBe(true);
      expectSaved(s, disk, why);
      run(s, 120, () => cmd());
      start(s, disk, a[0], a[1]);
      expect(seeds(disk.save), `${why}: left`).toEqual(seeds(SAVE));
      expect(s.pickups.filter((k) => k.gun && k.gun.source === 'stash'), `${why}: nothing saved lies about outside`).toEqual([]);
      if (b) start(s, disk, b[0], b[1]);
      start(s, disk, 'waves');
      expectSaved(s, disk, `${why}: back`);
      p.unlockedSlots = slots; // the sandbox, the campaign and Boss Fight open slot four
      if (slots === 4) expect(floorSeeds(s), why).toEqual(onFloor);
      // and a second round trip, the other way round
      if (b) start(s, disk, b[0], b[1]);
      start(s, disk, a[0], a[1]);
      start(s, disk, 'waves');
      start(s, disk, 'waves', { tier: 2 });
      expectSaved(s, disk, `${why}: twice`);
      expect(floorSeeds(s).length, why).toBeGreaterThan(0);
    }
  });

  it('keeps a saved gun the player swapped out or dropped while it lies there, once, and no floor loot', () => {
    const s = createGameState({ seed: 7 });
    const disk = { save: JSON.parse(JSON.stringify(SAVE)) };
    const p = player(s);
    p.unlockedSlots = 3;
    start(s, disk, 'waves');
    // take the floor bazooka: it swaps with the active gun, which goes to the floor in its place
    const k = s.pickups.find((x) => x.gun && x.gun.seed === 604);
    p.pos.x = k.pos.x; p.pos.z = k.pos.z;
    run(s, 1, () => cmd({ actions: [{ type: 'pickupGun', pickupId: k.id }] }));
    expect(p.guns.some((g) => g && g.seed === 604)).toBe(true);
    run(s, 1, () => cmd({ actions: [{ type: 'dropGun', slot: 2 }] }));
    // session loot and a debug gun on the floor are not progress
    spawnGunPickup(s, generateGun({ seed: 9300, level: 5, forced: { type: 'raygun', quality: 'epic' } }), { x: 3, z: 3 }, 'boss');
    spawnGunPickup(s, generateGun({ seed: 9301, level: 5, forced: { type: 'raygun', quality: 'epic' } }), { x: 4, z: 3 }, 'debug');
    const saved = loadoutFromState(s, 2);
    expect(seeds(saved)).toEqual(seeds(SAVE));
    expect(saved.guns.length).toBe(SAVE.guns.length);
    start(s, disk, 'boss', { boss: 'monster' });
    start(s, disk, 'waves');
    expectSaved(s, disk, 'after a swap and a drop');
    expect(player(s).guns.some((g) => g && g.seed === 604)).toBe(true);
  });

  it('never saves more than eight guns, carried ones first', () => {
    const { s, p } = waves();
    const specs = Array.from({ length: 12 }, (_, i) => gunSpec(generateGun({ seed: 700 + i, level: 1, forced: { type: 'mg', quality: 'common' } }), i % 5));
    apply(s, { guns: specs });
    for (let i = 0; i < 4; i++) spawnGunPickup(s, generateGun({ seed: 800 + i, level: 1, forced: { type: 'mg', quality: 'common' } }), { x: i, z: 0 }, 'stash');
    const saved = loadoutFromState(s);
    expect(saved.guns.length).toBe(MAX_SAVED_GUNS);
    const carried = p.guns.filter(Boolean).map((g) => g.seed);
    expect(saved.guns.slice(0, carried.length).map((g) => g.seed)).toEqual(carried);
  });
});

