import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/data/levels/kit.js';
import { L04 } from '../src/data/levels/L04/index.js';
import { EXPECTED_COUNTS } from '../src/data/levels/L04/encounters.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { transitionDone } from '../src/sim/campaign/campaign.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function tally(level) {
  const counts = {};
  for (const sec of level.sections) {
    for (const enc of sec.encounters || []) {
      for (const sq of enc.squads || []) {
        for (const u of sq.units || []) {
          if (u.type === 'obamaDuo' || u.type === 'midgetDuo') continue;
          counts[u.type] = (counts[u.type] || 0) + u.count;
        }
      }
    }
  }
  return counts;
}

describe('L04 The Blockchain Void', () => {
  it('matches the design census, lockdowns, ammo and secrets', () => {
    const counts = tally(L04);
    expect(counts).toEqual(EXPECTED_COUNTS);
    expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(152);
    const bosses = L04.sections.flatMap((s) => s.encounters).flatMap((e) => e.squads).flatMap((sq) => sq.units)
      .filter((u) => u.type === 'obamaDuo' || u.type === 'midgetDuo');
    expect(bosses.map((u) => u.type).sort()).toEqual(['midgetDuo', 'obamaDuo']);
    expect(L04.sections.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'SB']);
    expect(L04.tier).toBe(4);
    expect(L04.parTime).toBe(20 * 60);
    expect(L04.jetpack).toBe('pickup');
    expect(L04.maxAlive).toBe(12);
    expect(L04.estimateSeconds).toBe(1284.7);
    expect(L04.sections[5].name).toBe('The Exchange');
    const boss = L04.sections[5].encounters.find((e) => e.id === 'SB-BOSS');
    expect(boss.name).toBe('Bitcoin Obama & The Midget');
    expect(boss.objective.kind).toBe('boss');
    expect(boss.parts.map((p) => p.name)).toEqual(['Opening Bell', 'Pump', 'Flash Crash', 'Dump', 'Short Squeeze']);
    expect(L04.duo.names.duo).toBe('The Pump & Dump Duo');
    expect(L04.sections[5].intro.title).toBe('The Pump & Dump Duo');
    const locks = L04.sections.flatMap((s) => s.encounters).filter((e) => e.lockdown);
    expect(locks.map((e) => e.lockdown.id)).toEqual(['L1', 'L2', 'L3']);
    expect(locks.map((e) => e.id)).toEqual(['S2-E3', 'S4-E7', 'SB-BOSS']);
    const mechs = L04.sections.flatMap((s) => s.mechanisms);
    const ammo = mechs.filter((m) => m.kind === 'ammo');
    expect(ammo).toHaveLength(36);
    const byType = {};
    for (const box of ammo) byType[box.ammoType] = (byType[box.ammoType] || 0) + 1;
    expect(byType).toEqual({ bullets: 25, sniper: 6, rockets: 2, rubber: 2, shells: 1 });
    expect(mechs.filter((m) => m.kind === 'ammoCrate')).toHaveLength(3);
    expect(mechs.filter((m) => m.kind === 'depotCrate')).toHaveLength(4);
    expect(mechs.filter((m) => m.kind === 'depot').map((m) => m.id).sort()).toEqual(['depot-a', 'depot-b']);
    expect(L04.sections.flatMap((s) => s.checkpoints)).toHaveLength(10);
    expect(mechs.find((m) => m.id === 's2.bonk').modifier).toBe('moonBoots');
    expect(mechs.find((m) => m.id === 's5.battery')).toMatchObject({ mana: 10, manaRegen: 0.5 });
    expect(mechs.filter((m) => m.story)).toHaveLength(3);
    expect(mechs.find((m) => m.id === 's4.cache')).toMatchObject({ gun: 'duck', quality: 'legendary' });
    expect(mechs.find((m) => m.id === 's3.shrine-use').spell).toBe('manaShield');
    expect(L04.loot.tierOdds).toEqual({ common: 30, uncommon: 45, rare: 22, epic: 3, legendary: 0 });
    expect(L04.archetypes.flakPod.hp).toBe(160);
    expect(L04.archetypes.flakPod.hpTier).toBe(243);
    expect(L04.archetypes.flakPod.drops.resources).toBe(0);
  });

  it('passes the level validator and stays under 600 solids a section', () => {
    const v = validateLevel(L04);
    expect(v.errors).toEqual([]);
    for (const sec of L04.sections) {
      const solids = (sec.geometry || []).filter((g) => g.kind === 'box' || g.kind === 'ramp' || g.kind === 'cylinder');
      expect(solids.length, sec.id).toBeLessThanOrEqual(600);
    }
    for (const rack of L04.sections.flatMap((s) => s.weapons)) expect(rack.why).toBeTruthy();
  });

  it('keeps the full width of each exit over a receiving platform', () => {
    const landingIds = ['s2.slide.lip', 's3.slide.lane', 's4.ent', 's5.ent', 'sb.vest'];
    for (const [i, id] of landingIds.entries()) {
      const exit = L04.sections[i].exit;
      const deck = L04.sections[i + 1].geometry.find((g) => g.id === id);
      for (const axis of [0, 2]) {
        expect(deck.at[axis] - deck.size[axis] / 2, id).toBeLessThanOrEqual(exit.min[axis]);
        expect(deck.at[axis] + deck.size[axis] / 2, id).toBeGreaterThanOrEqual(exit.max[axis]);
      }
    }
  });

  it('fits the Clearing House perimeter and doors to its wider lockdown room', () => {
    const section = L04.sections.find((s) => s.id === 'S4');
    const { room, threshold, entry, exit } = section.encounters.find((e) => e.id === 'S4-E7').lockdown;
    expect(room.max[2] - room.min[2]).toBe(84);
    for (const [i, id] of [entry, exit].entries()) {
      const door = section.mechanisms.find((m) => m.id === id);
      const side = i === 0 ? 'w' : 'e';
      const walls = section.geometry.filter((g) => g.id.startsWith(`s4.chRoom-${side}-`) && g.at[1] === 15)
        .sort((a, b) => a.at[2] - b.at[2]);
      expect(door.at[2] - door.size[2] / 2).toBe(walls[0].at[2] + walls[0].size[2] / 2);
      expect(door.at[2] + door.size[2] / 2).toBe(walls[1].at[2] - walls[1].size[2] / 2);
      expect(threshold.max[2] - threshold.min[2]).toBe(door.size[2]);
    }
  });

  it('keeps Mine Field flyers outside the Clearing House before the player enters', () => {
    const state = createGameState({ seed: 4 });
    const player = state.players[state.localPlayerId];
    simulate(state, { [player.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L04' }] }) });
    state.level.transition = { to: 'S4' };
    transitionDone(state);
    const section = L04.sections.find((s) => s.id === 'S4');
    const [x, y, z] = section.start;
    player.pos = { x, y, z };
    player.prevPos = { ...player.pos };
    for (let tick = 0; tick < 90; tick++) simulate(state, { [player.id]: cmd() });
    const flyers = state.enemies.filter((enemy) => enemy.campaignEnc === 'S4-E6' && !enemy.dead);
    const room = section.encounters.find((e) => e.id === 'S4-E7').lockdown.room;
    expect(flyers).toHaveLength(3);
    expect(flyers.every((enemy) => enemy.pos.x < room.min[0])).toBe(true);
  });

  it('loads on the Genesis Block under the opening card', () => {
    const s = createGameState({ seed: 4 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L04' }] }) });
    expect(s.level.id).toBe('L04');
    expect(s.level.format).toBe('v2');
    expect(s.level.section).toBe('S1');
    expect(s.level.intro.title).toBe('The Blockchain Void');
    expect(s.level.intro.lines[1]).toBe('There is no floor on this exchange. Mind the gap.');
    expect(s.level.useSolids).toBe(true);
    expect(p.jetpack).toBe(false);
    expect(p.pos.x).toBeCloseTo(4, 0);
    expect(p.pos.y).toBeCloseTo(0, 0);
    expect(p.pos.z).toBeCloseTo(60, 0);
  });
});
