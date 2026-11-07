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
    boss: null,
  },
  {
    id: 2, name: 'Wave 2: Bitcoin Barrage', clearTickets: 35, maxAlive: 18,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'spread', spawns: [S('midget', 6), S('obama', 2)] },
      { at: 10, aliveBelow: 4, pattern: 'cluster', spawns: [S('midget', 8)] },
      { at: 20, aliveBelow: 4, pattern: 'spread', spawns: [S('bigObama', 1), S('obama', 3), S('midget', 4, 1), S('flyingMidget', 2)] },
      { at: 32, aliveBelow: 4, pattern: 'spread', spawns: [S('bigObama', 1, 1), S('obama', 2, 1), S('midget', 6), S('flyingMidget', 2)] },
    ],
    boss: { types: ['dragon'], introDelay: 3 },
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
export const tierRewardMult = (t) => 1 + 0.1 * (t - 1);
export const tierPriceMult = (t) => 1 + 0.15 * (t - 1);
