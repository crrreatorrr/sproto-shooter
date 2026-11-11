import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from './helpers.js';
import { generateGun } from '../src/sim/guns.js';
import { LEGENDARY_SLOT } from '../src/data/guns.js';
import { stateHash } from '../src/sim/hash.js';
import { buildIssuedState, canonicalLoadoutOk } from '../src/server/runContract.js';
import { CANONICAL_BOSSES } from '../src/data/serverManifest.js';
import { quantizeCommand } from '../src/server/protocol.js';
import { cloudBody } from '../src/save/profile.js';
import { nonEconomicSave } from '../src/hub/link.js';
import {
  LOADOUT_KEY, MAX_SAVED_GUNS, gunSpec, loadoutAction, loadoutEmpty, loadoutFromState, normalizeLoadout, readLoadout, writeLoadout,
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
