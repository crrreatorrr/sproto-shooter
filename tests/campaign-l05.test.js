import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/data/levels/kit.js';
import { L05 } from '../src/data/levels/L05/index.js';
import { DECOY, FROST_HOUND, SIGHT, SPOTTER_DRONE } from '../src/data/levels/L05/enemies.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

const ALWAYS = {
  midget: 58, obama: 5, sewerMidget: 2, spotterDrone: 4, frostHound: 13,
  auditSniper: 7, miningRig: 3, balloonMidget: 2, riotMidget: 9, glowieAgent: 13,
  boomMidget: 10, manaLeech: 1, robotShooter: 1,
};
const ALARM = {
  midget: 16, boomMidget: 2, robotLaser: 1, riotMidget: 3, obama: 2, glowieAgent: 2,
};

function merged(census) {
  const out = {};
  for (const key of ['always', 'script']) {
    for (const [type, n] of Object.entries(census[key])) {
      if (type === '_n') continue;
      out[type] = (out[type] || 0) + n;
    }
  }
  return out;
}

describe('L05 Frostspire Black Site', () => {
  it('matches the design census, cards, lockdowns and loot', () => {
    expect(L05.name).toBe('Frostspire Black Site');
    expect(L05.stage).toBe('glacier');
    expect(L05.tier).toBe(5);
    expect(L05.parTime).toBe(20 * 60);
    expect(L05.jetpack).toBe(false);
    expect(L05.maxAlive).toBe(12);
    expect(L05.estimateSeconds).toBe(1229);
    expect(L05.estimateWithAlarms).toBe(1276);
    expect(L05.sections.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    expect(L05.sections[0].intro).toEqual({
      title: 'FROSTSPIRE BLACK SITE',
      lines: [
        'The ledgers are in a vault at the top of the spire.',
        'Glowie is watching from a drone. Be far away. Be boring.',
      ],
    });
    expect(L05.sections[2].intro.title).toBe('Something in the courtyard has been on ice since the last audit.');
    expect(L05.sections[4].intro.title).toBe("Glowie, on the speakers: 'This is a routine inquiry. Please stand still.'");
    expect(L05.outro.title).toBe('You have the ledgers. Glowie has your face. See you at the office.');
    expect(merged(L05.census)).toEqual(ALWAYS);
    expect(Object.values(ALWAYS).reduce((s, n) => s + n, 0)).toBe(128);
    const alarm = { ...L05.census.alarm };
    delete alarm._n;
    expect(alarm).toEqual(ALARM);
    expect(L05.census.alarm._n).toBe(26);
    const bosses = L05.sections.flatMap((s) => s.encounters).flatMap((e) => e.squads).flatMap((sq) => sq.units)
      .filter((u) => u.type === 'monster');
    expect(bosses).toEqual([{ type: 'monster', count: 1, name: 'The Abominable Auditor' }]);
    const finale = L05.sections[2].encounters[0];
    expect(finale.name).toBe('The Abominable Auditor');
    expect(finale.script.parts.map((p) => p.name)).toEqual(['Frozen Assets', 'Cold Storage', 'Final Notice']);
    const locks = L05.sections.flatMap((s) => s.encounters).filter((e) => e.lockdown);
    expect(locks.map((e) => e.id)).toEqual(['S3-F1', 'S4-E7', 'S5-F2']);
    expect(locks.map((e) => e.lockdown.delaySec)).toEqual([1, 1, 1]);
    expect(L05.loot.tierOdds).toEqual({ common: 20, uncommon: 42, rare: 30, epic: 7, legendary: 1 });
    expect(L05.loot.bonk).toBe('Tax Season');
    expect(L05.decoy).toMatchObject({ name: 'Cardboard Sproto', mana: 30, cooldown: 12, life: 6 });
    expect(DECOY.locks).toEqual(['auditSniper', 'spotterDrone', 'searchlight', 'miningRig', 'droneStrike']);
    expect(SPOTTER_DRONE.hp).toBe(45);
    expect(SPOTTER_DRONE.hpTier).toBe(79);
    expect(FROST_HOUND.hp).toBe(55);
    expect(FROST_HOUND.elite.name).toBe('Alpha');
    expect(SIGHT.auditSniper.inCone).toBe(140);
    expect(SIGHT.blizzardCap).toBe(40);
    const e1 = L05.sections[0].encounters.find((e) => e.id === 'S1-E1');
    const pack = e1.squads.find((sq) => sq.id === 'E1-R');
    expect(pack.optional).toBe(true);
    expect(pack.delay).toBe(6);
    expect(pack.trigger).toMatchObject({ type: 'onAlarm', alarm: 'S1-alarm1' });
    const f1 = L05.sections[2].encounters.find((e) => e.id === 'S3-F1');
    expect(f1.script.parts[0].attacks[0]).toBe('chase');
    expect(f1.script.parts[0].adds[0].at[0]).toBeCloseTo(118, 0);
    expect(f1.script.parts[1].targets[0].at).toEqual([117, 5, -817]);
    const f2 = L05.sections[4].encounters.find((e) => e.id === 'S5-F2');
    expect(f2.objective.also).toEqual({ kind: 'hold', seconds: 90 });
    expect(f2.strikes).toEqual([8, 22, 36, 50, 64, 78, 92]);
    expect(f2.strikeEvery).toBe(14);
  });

  it('places the guns, ammo, depots, secrets and checkpoints from the document', () => {
    const mechs = L05.sections.flatMap((s) => s.mechanisms);
    const ammo = mechs.filter((m) => m.kind === 'ammo');
    expect(ammo.map((m) => m.id).sort()).toEqual(
      ['AB1', 'AB10', 'AB11', 'AB12', 'AB13', 'AB14', 'AB15', 'AB16', 'AB17', 'AB18', 'AB19', 'AB2', 'AB20', 'AB21', 'AB22', 'AB23', 'AB3', 'AB4', 'AB5', 'AB6', 'AB7', 'AB8', 'AB9'],
    );
    const sniper = ammo.filter((m) => m.ammoType === 'sniper');
    expect(sniper).toHaveLength(10);
    expect(sniper.every((m) => m.amount === 8)).toBe(true);
    const quiet = ['AB1', 'AB3', 'AB4', 'AB5', 'AB6', 'AB8', 'AB12'];
    const quietRounds = 4 + quiet.length * 8;
    expect(quietRounds + 20).toBeGreaterThanOrEqual(1.5 * 44);
    expect(mechs.filter((m) => m.kind === 'ammoCrate').map((m) => m.id)).toEqual(['AC1', 'AC2', 'AC3']);
    expect(mechs.filter((m) => m.kind === 'depot').map((m) => m.id)).toEqual(['D1', 'D2']);
    expect(L05.sections.flatMap((s) => s.checkpoints).map((c) => c.id)).toEqual(
      ['CP1', 'CP2', 'CP3', 'CP4', 'CP5', 'CP6', 'CP7', 'CP8', 'CP9', 'CP10'],
    );
    expect(L05.sections.flatMap((s) => s.weapons).map((w) => w.id)).toEqual(['C1', 'R1', 'R2']);
    expect(mechs.find((m) => m.id === 'S1-shrine')).toMatchObject({ spell: 'decoy', name: 'Cardboard Sproto' });
    expect(mechs.find((m) => m.id === 'S2-bonk')).toMatchObject({ modifier: 'taxSeason', name: 'Tax Season' });
    expect(mechs.find((m) => m.id === 'S4-battery')).toMatchObject({ mana: 10, manaRegen: 0.5, name: 'Mana Battery' });
    expect(mechs.filter((m) => m.file).map((m) => m.name)).toEqual(['Audit File 1', 'Audit File 2', 'Audit File 3']);
    expect(mechs.find((m) => m.id === 'S1-secretCache')).toMatchObject({ gun: 'sniper', quality: 'legendary' });
    expect(mechs.find((m) => m.id === 'S5-strikes').times).toEqual([8, 22, 36, 50, 64, 78, 92]);
    expect(mechs.find((m) => m.id === 'S5-hold')).toMatchObject({ r: 9, seconds: 90 });
  });

  it('passes the level validator and stays under 600 solids a section', () => {
    const v = validateLevel(L05);
    expect(v.errors).toEqual([]);
    for (const sec of L05.sections) {
      const solids = (sec.geometry || []).filter((g) => g.kind === 'box' || g.kind === 'ramp' || g.kind === 'cylinder');
      expect(solids.length, sec.id).toBeLessThanOrEqual(600);
    }
    for (const rack of L05.sections.flatMap((s) => s.weapons)) expect(rack.why).toBeTruthy();
    const gate = L05.sections[0].mechanisms.find((m) => m.id === 'S1-passGate');
    expect(gate.opens).toBe('S1-E3.cleared');
    expect(L05.sections[0].mechanisms.some((m) => m.latch && m.opens === 'S1-passGate')).toBe(true);
  });

  it('keeps the quiet sightlines', () => {
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(dist([150, 77], [158, 168])).toBeCloseTo(91, 0);
    expect(dist([150, 77], [120, 186])).toBeCloseTo(113, 0);
    expect(dist([150, 320], [150, 445])).toBeCloseTo(125, 0);
    expect(dist([150, 320], [70, 420])).toBeCloseTo(128, 0);
    expect(dist([150, 320], [225, 432])).toBeCloseTo(135, 0);
    expect(dist([130, 88], [60, 203])).toBeCloseTo(135, 0);
    expect(dist([130, 88], [100, 203])).toBeCloseTo(119, 0);
  });

  it('loads on the pod under the opening card', () => {
    const s = createGameState({ seed: 5 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L05' }] }) });
    expect(s.level.id).toBe('L05');
    expect(s.level.format).toBe('v2');
    expect(s.level.section).toBe('S1');
    expect(s.level.useSolids).toBe(true);
    expect(s.level.intro.title).toBe('FROSTSPIRE BLACK SITE');
    expect(s.level.intro.lines[1]).toBe('Glowie is watching from a drone. Be far away. Be boring.');
    expect(p.jetpack).toBe(false);
    expect(p.pos.x).toBeCloseTo(150, 0);
    expect(p.pos.y).toBeCloseTo(0, 0);
    expect(p.pos.z).toBeCloseTo(-19, 0);
  });
});
