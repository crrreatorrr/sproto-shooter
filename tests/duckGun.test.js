import { describe, it, expect } from 'vitest';
import { generateGun } from '../src/sim/guns.js';
import { rollGunType } from '../src/sim/drops.js';
import { createRng } from '../src/core/rng.js';
import { LEGENDARY_SLOT } from '../src/data/guns.js';
import { createGameState, createEnemy } from '../src/sim/state.js';
import { spawnGunPickup } from '../src/sim/drops.js';
import { run, cmd } from './helpers.js';

const sandbox = (seed = 3) => {
  const s = createGameState({ seed });
  run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'sandbox', tier: 1 }] }));
  return { s, p: s.players[s.localPlayerId] };
};
const duckPickup = (s) => s.pickups.find((k) => !k.dead && k.gun && k.gun.type === 'duckgun');
const grab = (s, p, k) => { p.pos.x = k.pos.x; p.pos.z = k.pos.z + 1; run(s, 1, () => cmd({ actions: [{ type: 'pickupGun', pickupId: k.id }] })); };

describe('Duck Gun (legendary) and the legendary slot', () => {
  it('is always legendary and never rolled at random', () => {
    expect(generateGun({ seed: 1, forced: { type: 'duckgun', quality: 'common' } }).quality).toBe('legendary');
    const rng = createRng(4);
    for (let i = 0; i < 3000; i++) expect(rollGunType(rng)).not.toBe('duckgun');
  });

  it('waits in the sandbox to be grabbed, does not despawn, and is not duplicated', () => {
    const { s, p } = sandbox();
    const k = duckPickup(s);
    expect(k).toBeTruthy();
    expect(k.gun.quality).toBe('legendary');
    run(s, 60 * 200, () => cmd()); // longer than any normal gun pickup lasts
    expect(duckPickup(s)).toBe(k);
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'sandbox', tier: 1 }] }));
    expect(s.pickups.filter((x) => !x.dead && x.gun && x.gun.type === 'duckgun').length).toBe(1);
    grab(s, p, k);
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'sandbox', tier: 1 }] }));
    expect(duckPickup(s)).toBeFalsy(); // you already carry it
  });

  it('goes to the legendary slot (L), and regular guns never take that slot', () => {
    const { s, p } = sandbox();
    grab(s, p, duckPickup(s));
    expect(p.guns[LEGENDARY_SLOT].type).toBe('duckgun');
    expect(p.activeSlot).toBe(LEGENDARY_SLOT);
    // fill the regular slots, holding the duck gun: a new regular gun swaps a regular one, not the duck
    for (let i = 0; i < 4; i++) {
      const g = generateGun({ seed: 50 + i, forced: { type: 'shotgun', quality: 'common' } });
      grab(s, p, spawnGunPickup(s, g, { x: p.pos.x, z: p.pos.z - 1 }));
      run(s, 1, () => cmd({ slot: LEGENDARY_SLOT }));
    }
    expect(p.guns[LEGENDARY_SLOT].type).toBe('duckgun');
    expect(p.guns.slice(0, 4).every(Boolean)).toBe(true);
  });

  it('can be selected with its key (slot 5 in the command) and by the mouse wheel', () => {
    const { s, p } = sandbox();
    grab(s, p, duckPickup(s));
    run(s, 40, () => cmd({ slot: 0 }));
    expect(p.activeSlot).toBe(0);
    run(s, 40, () => cmd({ slot: LEGENDARY_SLOT }));
    expect(p.activeSlot).toBe(LEGENDARY_SLOT);
    run(s, 40, (st, i) => cmd({ wheel: i === 0 ? 1 : 0 })); // wheel wraps from L back to slot 1
    expect(p.activeSlot).toBe(0);
    run(s, 40, (st, i) => cmd({ wheel: i === 0 ? -1 : 0 }));
    expect(p.activeSlot).toBe(LEGENDARY_SLOT);
  });

  it('fires medium rubber bullets that bounce once and explode for area damage', () => {
    const { s, p } = sandbox(7);
    grab(s, p, duckPickup(s));
    run(s, 40, () => cmd());
    s.enemies.length = 0;
    // two dummies side by side where a round fired down at the floor ends up: one blast hits both
    const a = createEnemy(s, 'dummy', { pos: { x: p.pos.x - 1, z: p.pos.z - 9.3 } });
    const b = createEnemy(s, 'dummy', { pos: { x: p.pos.x + 1, z: p.pos.z - 9.3 } });
    a.state = b.state = 'idle';
    const ha = a.hp, hb = b.hp;
    const ev = run(s, 1, () => cmd({ yaw: 0, pitch: -0.35, held: { fire: true } }));
    const round = s.projectiles.find((x) => x.kind === 'rubberBullet');
    expect(round).toBeTruthy();
    expect(round.radius).toBeGreaterThan(0.2); // medium sized
    expect(ev.some((e) => e.type === 'shot' && e.gunType === 'duckgun')).toBe(true);
    const later = run(s, 120, () => cmd());
    expect(later.some((e) => e.type === 'duckBounce' || e.type === 'explosion')).toBe(true);
    expect(later.some((e) => e.type === 'explosion')).toBe(true);
    expect(ha - a.hp).toBeGreaterThan(0);
    expect(hb - b.hp).toBeGreaterThan(0);
  });

  it('survives god mode handing out the basic guns', () => {
    const { s, p } = sandbox();
    grab(s, p, duckPickup(s));
    run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'toggleGod' }] }));
    expect(p.guns[LEGENDARY_SLOT] && p.guns[LEGENDARY_SLOT].type).toBe('duckgun');
    expect(p.guns.slice(0, 4).map((g) => g && g.type)).toEqual(['mg', 'shotgun', 'sniper', 'bazooka']);
  });
});

describe('sandbox toys stay in the sandbox', () => {
  const start = (s, mode, extra = {}) => run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode, tier: 1, ...extra }] }));

  it('removes the sandbox Duck Gun and debug-spawned guns when a real mode starts', () => {
    for (const [mode, extra] of [['waves', {}], ['boss', { boss: 'monster' }], ['campaign', { level: 'L06' }]]) {
      const { s } = sandbox();
      run(s, 1, () => cmd({ actions: [{ type: 'debug', op: 'spawnGun', args: { type: 'sniper', quality: 'legendary' } }] }));
      expect(s.pickups.filter((k) => k.gun).length).toBe(2);
      start(s, mode, extra);
      expect(s.pickups.filter((k) => k.gun), mode).toEqual([]);
    }
  });

  it('removes them even when both mode changes arrive in one command (page opened with ?mode=waves)', () => {
    const s = createGameState({ seed: 3 });
    run(s, 1, () => cmd({ actions: [{ type: 'startMode', mode: 'sandbox', tier: 1 }, { type: 'startMode', mode: 'waves', tier: 1, freshLoadout: true }] }));
    expect(s.mode).toBe('waves');
    expect(duckPickup(s)).toBeFalsy();
  });

  it('keeps the Duck Gun on the floor in the sandbox and the Test Range, and a dropped run gun in Wave Mode', () => {
    const { s } = sandbox();
    start(s, 'test');
    expect(duckPickup(s)).toBeTruthy();
    start(s, 'sandbox');
    expect(duckPickup(s)).toBeTruthy();
    const t = createGameState({ seed: 5 });
    start(t, 'waves');
    spawnGunPickup(t, generateGun({ seed: 9, forced: { type: 'shotgun', quality: 'rare' } }), { x: 3, z: 3 }, 'boss');
    start(t, 'waves');
    expect(t.pickups.filter((k) => k.gun).length).toBe(1);
  });

  it('gives the starting loadout back on leaving the sandbox when the client asks for it', () => {
    const { s, p } = sandbox();
    grab(s, p, duckPickup(s));
    expect(p.guns[LEGENDARY_SLOT]).toBeTruthy();
    start(s, 'waves', { freshLoadout: true });
    expect(p.guns.filter(Boolean).map((g) => g.source)).toEqual(['start']);
    // Wave Mode to Wave Mode keeps what you looted, flag or not
    const g = generateGun({ seed: 12, forced: { type: 'sniper', quality: 'epic' } });
    g.id = 4242; p.guns[1] = g;
    start(s, 'waves', { freshLoadout: true });
    expect(p.guns[1]).toBe(g);
    // ...but Wave Mode loot does not walk into the campaign, and campaign guns carry level to level
    start(s, 'campaign', { level: 'L06', freshLoadout: true });
    expect(p.guns.filter(Boolean).map((x) => x.source)).toEqual(['start']);
    p.guns[1] = g;
    start(s, 'campaign', { level: 'L07', freshLoadout: true });
    expect(p.guns[1]).toBe(g);
  });
});
