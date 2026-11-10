import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/data/levels/kit.js';
import { L03 } from '../src/data/levels/L03/index.js';
import { EXPECTED_COUNTS } from '../src/data/levels/L03/encounters.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { getLevelRuntime } from '../src/sim/level/runtime.js';
import { noteV2Section } from '../src/sim/campaign/v2.js';
import { TUNING } from '../src/data/tuning.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function tally(level) {
  const counts = {};
  for (const sec of level.sections) {
    for (const enc of sec.encounters || []) {
      for (const sq of enc.squads || []) {
        for (const u of sq.units || []) counts[u.type] = (counts[u.type] || 0) + u.count;
      }
    }
  }
  return counts;
}

describe('L03 Vegetable Grove', () => {
  it('matches the design census, lockdowns, ammo and secrets', () => {
    const counts = tally(L03);
    const bosses = (counts.hexAuditor || 0) + (counts.broccoli || 0);
    delete counts.hexAuditor;
    delete counts.broccoli;
    expect(counts).toEqual(EXPECTED_COUNTS);
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(164);
    expect(bosses).toBe(2);
    expect(L03.sections.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    expect(L03.tier).toBe(3);
    expect(L03.parTime).toBe(20 * 60);
    expect(L03.jetpack).toBe(false);
    expect(L03.estimateSeconds).toBe(1287);
    expect(L03.maxAlive).toBe(10);
    const locks = L03.sections.flatMap((s) => s.encounters).filter((e) => e.lockdown);
    expect(locks.map((e) => e.id)).toEqual(['S2-E4', 'S4-E7', 'S5-F1']);
    expect(locks.every((e) => e.lockdown.entry && e.lockdown.exit && e.lockdown.threshold)).toBe(true);
    const mechs = L03.sections.flatMap((s) => s.mechanisms);
    expect(mechs.filter((m) => m.kind === 'ammo').map((m) => m.id).sort()).toEqual(
      ['AB1', 'AB10', 'AB11', 'AB12', 'AB13', 'AB14', 'AB15', 'AB16', 'AB17', 'AB18', 'AB19', 'AB2', 'AB20', 'AB21', 'AB22', 'AB3', 'AB4', 'AB5', 'AB6', 'AB7', 'AB8', 'AB9'],
    );
    expect(mechs.filter((m) => m.kind === 'ammoCrate').length).toBe(3);
    expect(mechs.filter((m) => m.kind === 'depot').map((m) => m.id).sort()).toEqual(['DP1', 'DP2']);
    expect(L03.sections.flatMap((s) => s.checkpoints).length).toBe(10);
    expect(mechs.find((m) => m.id === 'S1-BONK').modifier).toBe('floorIsLava');
    expect(mechs.find((m) => m.id === 'S2-BAT').mana).toBe(10);
    expect(mechs.filter((m) => m.story).length).toBe(3);
    expect(L03.sections.flatMap((s) => s.encounters).find((e) => e.id === 'S6-F2').fleeAt).toBe(0.5);
    expect(L03.loot.tierOdds).toEqual({ common: 45, uncommon: 40, rare: 14, epic: 1, legendary: 0 });
  });

  it('passes the level validator and stays under 600 solids a section', () => {
    const v = validateLevel(L03);
    expect(v.errors).toEqual([]);
    for (const sec of L03.sections) {
      const solids = (sec.geometry || []).filter((g) => g.kind === 'box' || g.kind === 'ramp' || g.kind === 'cylinder');
      expect(solids.length, sec.id).toBeLessThanOrEqual(600);
    }
    for (const rack of L03.sections.flatMap((s) => s.weapons)) expect(rack.why).toBeTruthy();
  });

  it('loads at the truck and shows the opening card', () => {
    const s = createGameState({ seed: 3 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L03' }] }) });
    expect(s.level.id).toBe('L03');
    expect(s.level.format).toBe('v2');
    expect(s.level.intro.title).toBe('The Vegetable Grove');
    expect(s.level.useSolids).toBe(true);
    const rt = getLevelRuntime('L03');
    expect(rt.sectionById.S1.geometry.some((g) => g.id === 'S1-FL')).toBe(true);
    expect(p.pos.x).toBeCloseTo(18, 0);
    expect(p.pos.z).toBeCloseTo(-80, 0);
  });

  it('marks grapple points and keeps the escape walkable without sprint', () => {
    const anchors = L03.sections.flatMap((s) => s.grappleAnchors || []);
    expect(anchors.map((a) => a.id)).toEqual([
      'S1-GA-GATE', 'S1-GA-LEAF', 'S1-GA-CROWN',
      'S2-GA-GZ',
      'S4-GA-CAT',
      'S5-GA-N', 'S5-GA-E', 'S5-GA-S', 'S5-GA-W',
      'S6-GA-T1', 'S6-GA-T2', 'S6-GA-TRK',
    ]);
    const room = L03.sections.find((s) => s.id === 'S5').encounters[0].lockdown.room;
    for (const a of L03.sections.find((s) => s.id === 'S5').grappleAnchors) {
      const [x, y, z] = a.at;
      expect(x).toBeGreaterThan(room.min[0]);
      expect(x).toBeLessThan(room.max[0]);
      expect(y).toBeGreaterThan(room.min[1]);
      expect(y).toBeLessThan(room.max[1]);
      expect(z).toBeGreaterThan(room.min[2]);
      expect(z).toBeLessThan(room.max[2]);
    }
    const bowl = [48, 0, -40];
    const truck = [134, 9, -44];
    const dist = Math.hypot(truck[0] - bowl[0], truck[1] - bowl[1], truck[2] - bowl[2]);
    expect(dist / TUNING.walkSpeed).toBeLessThan(47);
    expect(L03.sections.find((s) => s.id === 'S6').geometry.some((g) => g.id === 'S6-SLIDE')).toBe(true);

    const s = createGameState({ seed: 1 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L03' }] }) });
    const x0 = p.pos.x;
    let locked = false;
    for (let i = 0; i < 360; i++) {
      simulate(s, { [p.id]: cmd({ yaw: -Math.PI / 2, moveZ: 1, held: { sprint: true } }) });
      if (p.staminaLock) locked = true;
    }
    expect(locked).toBe(true);
    expect(p.pos.x).toBeGreaterThan(x0 + TUNING.walkSpeed * 4);

    const rt = getLevelRuntime('L03');
    const sec = rt.sectionById.S5;
    noteV2Section(s, sec, rt);
    const hook = sec.grappleAnchors.find((a) => a.id === 'S5-GA-N');
    p.pos = { x: hook.at[0], y: 0, z: hook.at[2] + 16 };
    p.prevPos = { ...p.pos };
    p.vel = { x: 0, y: 0, z: 0 };
    p.grapple = null;
    p.grappleCd = 0;
    const yaw = 0;
    const pitch = Math.atan2(hook.at[1] - 1.6, 16);
    simulate(s, { [p.id]: cmd({ yaw, pitch, held: { grapple: true } }) });
    expect(p.grapple && p.grapple.id).toBe('S5-GA-N');
  });
});
