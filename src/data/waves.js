// Wave configs (PLAN §7.8)
const S = (type, count, elites = 0) => ({ type, count, elites });

// Midgets come in big swarms; Bitcoin Obamas shoot from range; Big Obamas anchor later waves;
// Flying Midgets (from wave 2) harass from the air.
export const WAVES = [
  {
    id: 1, name: 'Wave 1: Midget Rush', clearTickets: 20, maxAlive: 14,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'cluster', spawns: [S('midget', 5)] },
      { at: 7, aliveBelow: 2, pattern: 'spread', spawns: [S('obama', 2), S('midget', 3)] },
      { at: 16, aliveBelow: 3, pattern: 'cluster', spawns: [S('midget', 6)] },
      { at: 26, aliveBelow: 3, pattern: 'spread', spawns: [S('obama', 2), S('midget', 2)] },
    ],
    boss: { types: ['dragon'], introDelay: 3 },
  },
  {
    id: 2, name: 'Wave 2: Bitcoin Barrage', clearTickets: 35, maxAlive: 18,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'spread', spawns: [S('midget', 6), S('obama', 2)] },
      { at: 10, aliveBelow: 4, pattern: 'cluster', spawns: [S('midget', 8)] },
      { at: 20, aliveBelow: 4, pattern: 'spread', spawns: [S('bigObama', 1), S('obama', 3), S('midget', 4, 1), S('flyingMidget', 2)] },
      { at: 32, aliveBelow: 4, pattern: 'spread', spawns: [S('bigObama', 1, 1), S('obama', 2, 1), S('midget', 6), S('flyingMidget', 2)] },
    ],
    boss: { types: ['monster'], introDelay: 3 },
  },
  {
    id: 3, name: 'Wave 3: The Final Audit', clearTickets: 50, maxAlive: 24,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'spread', spawns: [S('midget', 8), S('obama', 3)] },
      { at: 10, aliveBelow: 5, pattern: 'cluster', spawns: [S('midget', 10, 1), S('bigObama', 1), S('flyingMidget', 3)] },
      { at: 22, aliveBelow: 5, pattern: 'spread', spawns: [S('obama', 4, 1), S('midget', 8), S('bigObama', 1, 1)] },
      { at: 34, aliveBelow: 5, pattern: 'spread', spawns: [S('midget', 10, 1), S('obama', 3, 1), S('bigObama', 2), S('flyingMidget', 4, 1)] },
    ],
    boss: { types: ['megaSproto', 'hexAuditor'], introDelay: 3 },
  },
];

export const INTERMISSION_TIME = 15;
export const VICTORY_TICKETS = 150;
export const MAX_TIER = 10;

export const tierEnemyMult = (t) => Math.pow(1.15, t - 1);
// Wave Mode and Boss Fight only: enemy health climbs faster than enemy damage, so a higher tier takes
// longer to clear without one-shotting you. Campaign and sandbox enemies keep tierEnemyMult.
// 1.18 per tier up to tier 7, then 1.10: at the old 1.18 all the way, a maxed test bot's win rate fell
// from about 78% at tier 7 to 55% at tier 10 (200 seeds a tier), nearly all of it from the two curves
// and not from what the waves were made of. Tiers 1 to 7 are unchanged.
export const ARENA_HP = { step: 1.18, knee: 7, lateStep: 1.1 };
export const tierArenaHpMult = (t) => Math.pow(ARENA_HP.step, Math.min(t, ARENA_HP.knee) - 1) * Math.pow(ARENA_HP.lateStep, Math.max(0, t - ARENA_HP.knee));

// Arena Second Wind: every down inside one wave (or one Boss Fight) leaves less time to get the kill.
// 10, 7, 4, then 3 seconds. The campaign keeps the flat TUNING.secondWindTime.
export const SECOND_WIND = { step: 3, min: 3 };
export const secondWindTime = (base, downs) => Math.max(SECOND_WIND.min, base - SECOND_WIND.step * downs);

// Wave Mode spell unlocks: each cleared wave grants the next spell you do not have. Tier 1 stops after
// Sproto Swarm; from tier 2 the list runs to the end. Kept for the session, like looted guns.
export const WAVE_SPELLS = ['chainZap', 'swarm', 'manaShield', 'meteor'];
export function nextWaveSpell(unlocks, tier) {
  const pool = tier >= 2 ? WAVE_SPELLS : WAVE_SPELLS.slice(0, 2);
  for (const id of pool) if (!unlocks || !unlocks[id]) return id;
  return null;
}

// What a wave looks like at a tier. Tier 1 is WAVES itself, untouched. Above it:
//  - groups get more elites (tierExtraElites) and maxAlive grows (tierExtraAlive);
//  - from tier 4, in waves 2 and 3, Laser Bots take half of each Bitcoin Obama squad and one Shooter Bot
//    takes a Big Bitcoin Obama's place, and the wave-2 boss rotates Car Part Monster, Mole Monster, Blue Monster;
//  - from tier 7 the Sproto Beast follows the final pair: it arrives (boss.late) once one of the two is down,
//    so there are never three bosses on you at once.
// Tiers 2 to 6 are as they were. From tier 7 no tier takes a whole step at once: the old ladder gave
// tier 7 the Sproto Beast, a third extra elite in every group and a bigger crowd together.

/**
 * Extra elites in group `gi` of a wave. One more every two tiers (0, 0, 1, 1, 2, 2 for tiers 1 to 6).
 * From tier 7 the step comes in halves: the odd groups get it first and the even groups a tier later
 * (tier 7: 2, 3, 2, 3; tier 8: 3 each; tier 9: 3, 4, 3, 4; tier 10: 4 each).
 */
export const tierExtraElites = (tier, gi = 0) => Math.floor((tier - (tier >= 7 && gi % 2 === 0 ? 2 : 1)) / 2);
/** How many more enemies may be alive at once: 2 from tier 4, 4 from tier 8 (it was 7, and 6 at tier 10). */
export const tierExtraAlive = (tier) => (tier >= 8 ? 4 : tier >= 4 ? 2 : 0);
const WAVE2_BOSSES = ['carMonster', 'moleMonster', 'monster'];
/** Health of a boss that arrives late in a boss phase, as a share of its full health. */
export const LATE_BOSS_HP = 0.7;
const tierWaveCache = new Map();
export function tierWave(index, tier = 1) {
  const base = WAVES[index];
  if (!base || !(tier > 1)) return base;
  const key = index * 100 + tier;
  if (tierWaveCache.has(key)) return tierWaveCache.get(key);
  const robots = tier >= 4 && index >= 1;
  let shooters = robots ? 1 : 0;
  const groups = base.groups.map((g, gi) => {
    const spawns = [];
    for (const s of g.spawns) {
      if (robots && s.type === 'obama' && s.count >= 2) {
        const lasers = Math.floor(s.count / 2);
        const keepElites = Math.min(s.count - lasers, s.elites);
        spawns.push(S('obama', s.count - lasers, keepElites), S('robotLaser', lasers, s.elites - keepElites));
      } else if (shooters > 0 && s.type === 'bigObama') {
        shooters--;
        if (s.count > 1) spawns.push(S('bigObama', s.count - 1, Math.min(s.count - 1, s.elites)));
        spawns.push(S('robotShooter', 1, s.count > 1 ? 0 : s.elites));
      } else spawns.push(S(s.type, s.count, s.elites));
    }
    let left = tierExtraElites(tier, gi);
    for (const s of spawns) { const add = Math.min(left, s.count - s.elites); s.elites += add; left -= add; }
    return { ...g, spawns };
  });
  let types = base.boss.types;
  if (index === 1 && tier >= 4) types = [WAVE2_BOSSES[(tier - 4) % WAVE2_BOSSES.length]];
  const late = index === WAVES.length - 1 && tier >= 7 ? ['sprotoBeast'] : [];
  const out = { ...base, maxAlive: base.maxAlive + tierExtraAlive(tier), groups, boss: { ...base.boss, types, late, lateHp: LATE_BOSS_HP } };
  tierWaveCache.set(key, out);
  return out;
}
export const tierRewardMult = (t) => 1 + 0.1 * (t - 1);
export const tierPriceMult = (t) => 1 + 0.15 * (t - 1);
