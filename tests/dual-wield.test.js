import { describe, it, expect } from 'vitest';
import { createGameState, createEnemy } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { startMode } from '../src/sim/actions.js';
import { generateGun } from '../src/sim/guns.js';
import { spawnGunPickup, rollGunType } from '../src/sim/drops.js';
import { GUN_TYPES, isDualWield } from '../src/data/guns.js';
import { TUNING } from '../src/data/tuning.js';
import { createRng } from '../src/core/rng.js';
import { stateHash } from '../src/sim/hash.js';

function setup() {
  const s = createGameState({ seed: 5, mode: 'sandbox' });
  const p = s.players[s.localPlayerId];
  startMode(s, p, 'sandbox');
  s.pickups = [];
  return { s, p };
}
const gun = (type, seed, id) => Object.assign(generateGun({ seed, forced: { type, quality: 'common', element: 'none' } }), { id });
const cmd = (p, o = {}) => ({ [p.id]: { yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o } });
const run = (s, p, n, o) => { const ev = []; for (let i = 0; i < n; i++) { simulate(s, cmd(p, o)); ev.push(...s.events); } return ev; };
/** Hold a Handgun in slot 2 and stand on a Machine Pistol. */
function holdingHandgun() {
  const { s, p } = setup();
  const right = gun('handgun', 1, 9001), left = gun('machinepistol', 2, 9002);
  p.guns[1] = right; p.activeSlot = 1;
  spawnGunPickup(s, left, { x: p.pos.x, z: p.pos.z }, 'debug');
  run(s, p, 40);
  return { s, p, right, left };
}
const grab = (s, p) => simulate(s, cmd(p, { pressed: { interact: true } }));

describe('sidearms', () => {
  it('two dual-wieldable types roll as common enemy drops', () => {
    const duals = GUN_TYPES.filter((t) => t.dualWield).map((t) => t.id);
    expect(duals).toEqual(['handgun', 'machinepistol']);
    const rng = createRng(3), seen = {};
    for (let i = 0; i < 4000; i++) { const t = rollGunType(rng); seen[t] = (seen[t] || 0) + 1; }
    expect(seen.handgun / 4000).toBeGreaterThan(0.12);
    expect(seen.machinepistol / 4000).toBeGreaterThan(0.1);
    expect(seen.handgun).toBeGreaterThan(seen.shotgun);
  });
});

describe('dual wield', () => {
  it('a dual-wieldable gun on the floor goes to the left hand when you hold one', () => {
    const { s, p, right, left } = holdingHandgun();
    grab(s, p);
    expect(p.dual && p.dual.gun).toBe(left);
    expect(p.guns[1]).toBe(right);
    expect(p.guns.filter(Boolean)).not.toContain(left);
  });

  it('only when both guns are dual-wieldable', () => {
    const { s, p } = setup(); // holding the starting machine gun
    const hg = gun('handgun', 1, 9001);
    spawnGunPickup(s, hg, { x: p.pos.x, z: p.pos.z }, 'debug');
    run(s, p, 40);
    grab(s, p);
    expect(p.dual).toBeUndefined();
    expect(p.guns).toContain(hg); // a normal pickup into a slot

    const b = holdingHandgun();
    const sg = gun('shotgun', 3, 9003);
    b.s.pickups = [];
    spawnGunPickup(b.s, sg, { x: b.p.pos.x, z: b.p.pos.z }, 'debug');
    run(b.s, b.p, 40);
    grab(b.s, b.p);
    expect(b.p.dual).toBeUndefined();
    expect(b.p.guns).toContain(sg);
    expect(isDualWield(sg)).toBe(false);
  });

  it('both guns fire in turn, each from its own magazine', () => {
    const { s, p, right, left } = holdingHandgun();
    grab(s, p);
    const r0 = right.ammoInMag, l0 = left.ammoInMag;
    const ev = run(s, p, 45, { held: { fire: true } });
    const shots = ev.filter((e) => e.type === 'shot');
    const lefts = shots.filter((e) => e.hand === 'left').length, rights = shots.length - lefts;
    expect(lefts).toBeGreaterThan(0);
    expect(rights).toBeGreaterThan(0);
    expect(r0 - right.ammoInMag).toBe(rights);
    expect(l0 - left.ammoInMag).toBe(lefts);
  });

  it('an empty gun reloads on its own while the other keeps firing', () => {
    const { s, p, right, left } = holdingHandgun();
    grab(s, p);
    right.ammoInMag = 1;
    const ev = run(s, p, 40, { held: { fire: true } });
    expect(ev.some((e) => e.type === 'reloadStart' && e.slot === 1)).toBe(true);
    expect(p.reloadT).toBeGreaterThan(0);
    expect(p.dual.reloadT).toBe(0);
    const late = ev.slice(ev.findIndex((e) => e.type === 'reloadStart'));
    expect(late.some((e) => e.type === 'shot' && e.hand === 'left')).toBe(true);
    expect(left.ammoInMag).toBeLessThan(left.stats.magSize);
  });

  it('you cannot aim or zoom while dual wielding', () => {
    const { s, p } = holdingHandgun();
    run(s, p, 2, { held: { zoom: true } });
    expect(p.zooming).toBe(true);
    grab(s, p);
    run(s, p, 2, { held: { zoom: true } });
    expect(p.zooming).toBe(false);
  });

  it('changing weapon drops the left-hand gun on the floor', () => {
    const { s, p, left } = holdingHandgun();
    grab(s, p);
    const ev = run(s, p, 1, { slot: 0 });
    expect(p.dual).toBeUndefined();
    expect(p.activeSlot).toBe(0);
    expect(ev.some((e) => e.type === 'gunDropped' && e.gunId === left.id)).toBe(true);
    expect(s.pickups.some((k) => !k.dead && k.gun === left)).toBe(true);
  });

  it('another dual-wieldable gun swaps the left-hand gun', () => {
    const { s, p, left } = holdingHandgun();
    grab(s, p);
    const third = gun('handgun', 7, 9007);
    spawnGunPickup(s, third, { x: p.pos.x, z: p.pos.z }, 'debug');
    run(s, p, 40);
    grab(s, p);
    expect(p.dual.gun).toBe(third);
    expect(s.pickups.some((k) => !k.dead && k.gun === left)).toBe(true);
  });

  it('a state that never dual wields has no dual field', () => {
    const { s, p } = setup();
    run(s, p, 30, { held: { fire: true } });
    expect('dual' in p).toBe(false);
    expect(typeof stateHash(s)).toBe('string');
  });
});

describe('melee', () => {
  function withDummy(type = 'mg') {
    const { s, p } = setup();
    if (type !== 'mg') { p.guns[1] = gun(type, 4, 9100); p.activeSlot = 1; }
    s.enemies.length = 0;
    const e = createEnemy(s, 'dummy', { pos: { x: p.pos.x, z: p.pos.z - 1.6 } });
    run(s, p, 2);
    return { s, p, e };
  }

  it('Interact with nothing in reach hits the enemy in front, with any gun', () => {
    for (const type of ['mg', 'sniper', 'handgun']) {
      const { s, p, e } = withDummy(type);
      const hp = e.hp;
      const ev = run(s, p, 1, { pressed: { interact: true } });
      expect(ev.some((x) => x.type === 'melee' && x.hit), type).toBe(true);
      expect(e.hp, type).toBeLessThan(hp);
    }
  });

  it('misses an enemy behind you and has a cooldown', () => {
    const { s, p, e } = withDummy();
    e.pos.z = p.pos.z + 1.6; e.prevPos.z = e.pos.z;
    const ev = run(s, p, 1, { pressed: { interact: true } });
    expect(ev.find((x) => x.type === 'melee').hit).toBe(false);
    const again = run(s, p, 1, { pressed: { interact: true } });
    expect(again.some((x) => x.type === 'melee')).toBe(false);
    run(s, p, Math.ceil(TUNING.melee.cooldown * 60));
    expect(run(s, p, 1, { pressed: { interact: true } }).some((x) => x.type === 'melee')).toBe(true);
  });

  it('dual wielding: the left gun drops, then the attack', () => {
    const { s, p, left } = holdingHandgun();
    grab(s, p);
    run(s, p, 2);
    s.enemies.length = 0;
    const e = createEnemy(s, 'dummy', { pos: { x: p.pos.x, z: p.pos.z - 1.6 } });
    const hp = e.hp;
    run(s, p, 1);
    s.pickups = s.pickups.filter((k) => k.dead);
    const ev = run(s, p, 1, { pressed: { interact: true } });
    expect(p.dual).toBeUndefined();
    const drop = ev.findIndex((x) => x.type === 'gunDropped' && x.gunId === left.id);
    const hit = ev.findIndex((x) => x.type === 'melee');
    expect(drop).toBeGreaterThanOrEqual(0);
    expect(hit).toBeGreaterThan(drop);
    expect(e.hp).toBeLessThan(hp);
  });

  it('Interact next to a floor gun picks it up instead of meleeing', () => {
    const { s, p } = holdingHandgun();
    const ev = run(s, p, 1, { pressed: { interact: true } });
    expect(ev.some((x) => x.type === 'melee')).toBe(false);
    expect(p.dual).toBeDefined();
  });
});
