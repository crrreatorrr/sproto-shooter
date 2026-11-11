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
// Arena modes only (Wave Mode, Boss Fight, sandbox): enemy health climbs faster than enemy damage,
// so a higher tier takes longer to clear without one-shotting you. Campaign enemies keep tierEnemyMult.
export const tierArenaHpMult = (t) => Math.pow(1.18, t - 1);

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
//  - every group gets floor((tier - 1) / 2) more elites, and maxAlive grows by 2 every three tiers;
//  - from tier 4, in waves 2 and 3, Laser Bots take half of each Bitcoin Obama squad and one Shooter Bot
//    takes a Big Bitcoin Obama's place, and the wave-2 boss rotates Car Part Monster, Mole Monster, Blue Monster;
//  - from tier 7 the Sproto Beast joins the final pair.
const WAVE2_BOSSES = ['carMonster', 'moleMonster', 'monster'];
const tierWaveCache = new Map();
export function tierWave(index, tier = 1) {
  const base = WAVES[index];
  if (!base || !(tier > 1)) return base;
  const key = index * 100 + tier;
  if (tierWaveCache.has(key)) return tierWaveCache.get(key);
  const robots = tier >= 4 && index >= 1;
  const extraElites = Math.floor((tier - 1) / 2);
  let shooters = robots ? 1 : 0;
  const groups = base.groups.map((g) => {
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
    let left = extraElites;
    for (const s of spawns) { const add = Math.min(left, s.count - s.elites); s.elites += add; left -= add; }
    return { ...g, spawns };
  });
  let types = base.boss.types;
  if (index === 1 && tier >= 4) types = [WAVE2_BOSSES[(tier - 4) % WAVE2_BOSSES.length]];
  if (index === WAVES.length - 1 && tier >= 7) types = [...types, 'sprotoBeast'];
  const out = { ...base, maxAlive: base.maxAlive + 2 * Math.floor((tier - 1) / 3), groups, boss: { ...base.boss, types } };
  tierWaveCache.set(key, out);
  return out;
}
export const tierRewardMult = (t) => 1 + 0.1 * (t - 1);
export const tierPriceMult = (t) => 1 + 0.15 * (t - 1);
