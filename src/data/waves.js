// Wave configs (PLAN §7.8)
const S = (type, count, elites = 0) => ({ type, count, elites });

export const WAVES = [
  {
    id: 1, name: 'Wave 1: Warm-Up Sprotos', clearTickets: 20, maxAlive: 8,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'spread', spawns: [S('grunt', 3)] },
      { at: 8, aliveBelow: 1, pattern: 'cluster', spawns: [S('grunt', 2), S('spitter', 1)] },
      { at: 16, aliveBelow: 2, pattern: 'spread', spawns: [S('spitter', 2)] },
    ],
    boss: null,
  },
  {
    id: 2, name: 'Wave 2: Bouncy Business', clearTickets: 35, maxAlive: 10,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'spread', spawns: [S('grunt', 3), S('spitter', 1)] },
      { at: 10, aliveBelow: 2, pattern: 'spread', spawns: [S('bouncer', 2), S('spitter', 1), S('grunt', 1)] },
      { at: 20, aliveBelow: 2, pattern: 'cluster', spawns: [S('tank', 1), S('grunt', 2)] },
      { at: 30, aliveBelow: 2, pattern: 'spread', spawns: [S('tank', 1, 1), S('bouncer', 1), S('spitter', 1, 1)] },
    ],
    boss: { types: ['megaSproto'], introDelay: 3 },
  },
  {
    id: 3, name: 'Wave 3: The Final Audit', clearTickets: 50, maxAlive: 12,
    groups: [
      { at: 0, aliveBelow: null, pattern: 'spread', spawns: [S('grunt', 3), S('spitter', 2)] },
      { at: 10, aliveBelow: 3, pattern: 'spread', spawns: [S('bouncer', 3), S('grunt', 1, 1), S('tank', 1)] },
      { at: 22, aliveBelow: 3, pattern: 'cluster', spawns: [S('tank', 1, 1), S('spitter', 2), S('bouncer', 2)] },
      { at: 34, aliveBelow: 3, pattern: 'spread', spawns: [S('grunt', 3, 1), S('spitter', 1, 1), S('tank', 1)] },
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
