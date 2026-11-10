// Squads for Frostspire Black Site. Positions are design (x, y, north).
// `optional` squads are the six alarm packs (26 enemies). clearAll on today's
// director still waits for them: see ENGINE-NEEDS.md.
import { P, zone } from './prim.js';

const u = (type, count, extra = {}) => ({ type, count, ...extra });

function at(points) {
  return points.map((p) => (p.length === 2 ? P(p[0], 0, p[1]) : P(p[0], p[1], p[2])));
}

function squad(id, trigger, units, points, method = 'placed', extra = {}) {
  return { id, trigger, method, at: at(points), units, ...extra };
}

function alarm(id, alarmId, units, points, method = 'door') {
  return squad(id, { type: 'onAlarm', alarm: alarmId }, units, points, method, { optional: true, delay: 6 });
}

const whole = (nMax, xMax, y1 = 40) => zone(0, xMax, 0, nMax, -8, y1);

export const E1 = {
  id: 'S1-E1',
  name: 'The Picket',
  maxAlive: 9,
  objective: { kind: 'clearAll', text: 'Clear the picket' },
  activate: zone(90, 200, 60, 220, -4, 12),
  squads: [
    squad('E1-a', { type: 'onEnter' }, [u('midget', 5)], [[158, 0, 168]], 'placed', {
      facing: 'away', note: 'Two face away from the ridge. Fire barrel is heard by the lookout.',
    }),
    squad('E1-b', { type: 'onEnter' }, [
      u('obama', 1, { role: 'runner', alarm: 'S1-alarm1' }),
      u('obama', 1),
    ], [[120, 2.5, 186], [122, 2.5, 186]], 'placed'),
    squad('E1-c', { type: 'onEnter' }, [
      u('sewerMidget', 2),
    ], [[150, 0, 165], [172, 0, 166]], 'burrow', { delay: 0.6, near: 'the campfire, 20 m' }),
    alarm('E1-R', 'S1-alarm1', [u('midget', 4), u('boomMidget', 2)], [[18, 0, 215]]),
  ],
};

export const E2 = {
  id: 'S1-E2',
  name: 'Frozen Creek',
  maxAlive: 7,
  objective: { kind: 'reach', text: 'Reach the north bank' },
  activate: zone(12, 288, 200, 356, -4, 16),
  zone: zone(12, 288, 266, 290, -2, 8),
  squads: [
    squad('E2-a', { type: 'onEnter' }, [u('spotterDrone', 1)], [[80, 8, 256]], 'air', {
      patrol: { loop: [[80, 8, 256], [235, 8, 256]], speed: 8, period: 39 },
    }),
    squad('E2-b', { type: 'onEnter' }, [u('midget', 4)], [[150, 0, 274]], 'placed', { asleep: true, hearing: 12 }),
    squad('E2-c', { type: 'onAlert', zBelow: -266 }, [u('frostHound', 2)], [[205, 0, 285], [205, 0, 285]], 'door', { delay: 1.5 }),
    alarm('E2-R', 'S1-drone', [u('midget', 3), u('robotLaser', 1)], [[150, 0, 275]], 'drop'),
  ],
};

export const E3 = {
  id: 'S1-E3',
  name: 'The Listening Post',
  maxAlive: 5,
  objective: { kind: 'clearAll', text: 'Clear the listening post' },
  activate: zone(40, 270, 300, 530, -4, 30),
  squads: [
    squad('E3-a', { type: 'onEnter' }, [u('auditSniper', 2)], [[150, 14, 442], [70, 6, 420]], 'placed', {
      perches: [['P1', 'P3', 'P1'], ['P2', 'P3', 'P2']],
      shotsBeforeMove: 2,
    }),
    squad('E3-b', { type: 'onEnter' }, [
      u('obama', 1, { role: 'runner', alarm: 'S1-alarm3' }),
    ], [[216, 0, 433]], 'placed'),
    squad('E3-c', { type: 'onKills', n: 2 }, [
      u('auditSniper', 1, { elite: true, name: 'the Head Auditor' }),
    ], [[150, 22, 442]], 'hidden', { delay: 2, perches: ['P4', 'P1', 'P3'] }),
    squad('E3-d', { type: 'onAlert', box: zone(100, 200, 400, 530, -2, 8) }, [
      u('miningRig', 1),
    ], [[150, 0, 512]], 'placed'),
    alarm('E3-R', 'S1-alarm3', [u('midget', 3), u('riotMidget', 2)], [[216, 0, 433]]),
  ],
};

export const E4 = {
  id: 'S2-E4',
  name: 'The Kill Zone',
  maxAlive: 12,
  objective: { kind: 'reach', text: 'Reach the gate apron' },
  activate: zone(0, 260, 0, 380, -8, 20),
  zone: zone(110, 150, 180, 200, -2, 6),
  squads: [
    squad('E4-a', { type: 'onEnter' }, [u('miningRig', 2)], [[130, 0, 172], [130, 0, 176]], 'placed', {
      overheatOffset: 3, openFire: 90,
    }),
    squad('E4-b', { type: 'onEnter' }, [u('auditSniper', 2)], [[130, 0, 100], [130, 0, 108]], 'placed', {
      perches: [[60, 12, 203], [85, 12, 203], [200, 12, 203], [175, 12, 203]],
    }),
    squad('E4-c', { type: 'onEnter' }, [u('spotterDrone', 2)], [[100, 9, 110], [150, 9, 70]], 'air', {
      patrol: [
        [[100, 9, 110], [160, 9, 110], [160, 9, 160], [100, 9, 160]],
        [[150, 9, 70], [240, 9, 70], [240, 9, 170], [150, 9, 170]],
      ],
      ringsAlarm: 'S2-alarm4',
    }),
    squad('E4-d', { type: 'onEnter' }, [u('midget', 3)], [[130, 0, 196]], 'placed', { asleep: true, hearing: 0.01 }),
    squad('E4-e', { type: 'onEnter' }, [u('obama', 2)], [[130, 0, 148]], 'placed', {
      patrol: { loop: [[130, 0, 148], [130, 0, 130], [130, 0, 148]], period: 40 },
    }),
    squad('E4-f', { type: 'onEnter' }, [u('balloonMidget', 2)], [[200, 4, 95], [225, 5, 135]], 'placed', { tethered: true }),
    squad('E4-g', { type: 'onAlert', zBelow: -150 }, [u('frostHound', 2)], [[130, 0, 160]], 'door', { delay: 1 }),
    alarm('E4-R', 'S2-alarm4', [u('midget', 4), u('obama', 2)], [[130, 0, 160]], 'drop'),
  ],
};

export const E5 = {
  id: 'S2-E5',
  name: 'The two Bunkers',
  maxAlive: 8,
  objective: { kind: 'destroy', ids: ['BW-gen-body', 'BE-gen-body'], text: 'Destroy both generators' },
  activate: zone(80, 180, 198, 240, -2, 12),
  squads: [
    squad('E5-a', { type: 'onEnter' }, [u('riotMidget', 3)], [[130, 0, 208]], 'placed'),
    squad('E5-b', { type: 'onAlert', box: zone(86, 114, 214, 236, -2, 8) }, [u('midget', 2)], [[108, 0, 208]], 'door', { delay: 1 }),
    alarm('E5-RW', 'S2-alarm5W', [u('midget', 2), u('riotMidget', 1)], [[100, 0, 235]]),
    squad('E5-c', { type: 'onAlert', box: zone(156, 164, 198, 206, -2, 6) }, [
      u('glowieAgent', 3, { flashbang: 1 }),
    ], [[153, 0, 221], [167, 0, 221], [160, 0, 219]], 'placed'),
    squad('E5-d', { type: 'onKills', n: 2 }, [
      u('glowieAgent', 1, { elite: true, name: 'the Supervisor' }),
      u('boomMidget', 2),
    ], [[160, 0, 235], [152, 0, 208]], 'door', { also: 'generator E at 50%' }),
    alarm('E5-RE', 'S2-alarm5E', [u('glowieAgent', 2)], [[170, 8, 208]], 'drop'),
  ],
};

export const E6 = {
  id: 'S4-E6',
  name: 'Intake',
  maxAlive: 7,
  objective: { kind: 'reach', text: 'Reach Lift A' },
  activate: zone(20, 60, 14, 110, -2, 8),
  zone: zone(32, 48, 56, 68, -2, 8),
  squads: [
    squad('E6-a', { type: 'onAlert', zBelow: -14 }, [u('riotMidget', 3)], [[40, 0, 52]], 'placed'),
    squad('E6-b', { type: 'onAlert', zBelow: -28 }, [u('midget', 2)], [[31, 0, 22]], 'door'),
    squad('E6-c', { type: 'onKills', n: 3 }, [u('frostHound', 2)], [[50, 0, 50]], 'door', { delay: 1 }),
  ],
};

export const E7 = {
  id: 'S4-E7',
  name: 'Records Library',
  maxAlive: 12,
  objective: { kind: 'clearAll', text: 'Clear the Records Library' },
  activate: zone(12, 68, 12, 56, 6, 20),
  lockdown: {
    id: 'L2',
    entry: 'LIB-in',
    exit: 'LIB-out',
    threshold: zone(36, 44, 48, 52, 6, 14),
    delaySec: 1,
    waveSec: 25,
    stallSec: 12,
    stallN: 2,
    room: zone(12, 68, 12, 56, 7, 20),
  },
  squads: [
    squad('W1', { type: 'onEnter' }, [u('midget', 6)], [[26, 7, 43]], 'drop'),
    squad('W1b', { type: 'with', after: 'W1', delay: 0 }, [u('glowieAgent', 2)], [[68, 7, 34]], 'door'),
    squad('W2', { type: 'onRemain', n: 2 }, [u('riotMidget', 2)], [[12, 7, 34]], 'door'),
    squad('W2b', { type: 'with', after: 'W2', delay: 0 }, [u('auditSniper', 2)], [[66, 14, 44], [40, 14, 14]], 'door'),
    squad('W2c', { type: 'with', after: 'W2', delay: 0 }, [u('manaLeech', 1)], [[68, 7, 34]], 'door'),
    squad('W3', { type: 'onRemain', n: 2 }, [u('midget', 4), u('boomMidget', 2)], [[54, 7, 25]], 'drop'),
    squad('W3b', { type: 'with', after: 'W3', delay: 0 }, [u('frostHound', 2)], [[12, 7, 34]], 'door'),
    squad('W4', { type: 'onRemain', n: 2 }, [u('midget', 2)], [[26, 7, 43]], 'drop'),
    squad('W4b', { type: 'with', after: 'W4', delay: 0 }, [u('glowieAgent', 1)], [[68, 7, 34]], 'door'),
    squad('W4c', { type: 'with', after: 'W4', delay: 0 }, [
      u('robotShooter', 1, { elite: true, name: 'the Archivist' }),
    ], [[17, 7, 17]], 'hidden'),
  ],
};

const spW = [18, 0, 59];
const spE = [82, 0, 59];
const spN = [[35, 5, 92], [65, 5, 92]];
const spK = [62, 0, 93];

export const F1 = {
  id: 'S3-F1',
  name: 'The Abominable Auditor',
  maxAlive: 8,
  objective: { kind: 'clearAll', text: 'Drop the Abominable Auditor' },
  activate: zone(15, 85, 24, 94, -6, 14),
  arena: { x: 50, z: -59, radius: 35 },
  lockdown: {
    id: 'L1',
    entry: 'S3-arenaDoor',
    exit: 'S3-exitDoor',
    threshold: zone(42, 58, 28, 32, -2, 8),
    delaySec: 1,
    stallSec: 12,
    room: zone(15, 85, 24, 94, -6, 12),
  },
  squads: [
    squad('auditor', { type: 'onEnter' }, [
      u('monster', 1, { name: 'The Abominable Auditor' }),
    ], [[50, 0.6, 59]], 'placed', { frozen: 2 }),
  ],
  script: {
    parts: [
      {
        id: 'frozen-assets',
        name: 'Frozen Assets',
        seconds: 60,
        attacks: ['chase', 'volley', 'missiles', 'chase', 'charge', 'slam'],
        adds: [
          { t: 20, at: spW, method: 'door', spawn: 'SP-W', units: [['midget', 4]] },
          { t: 45, at: spE, method: 'door', spawn: 'SP-E', units: [['midget', 4]] },
        ],
      },
      {
        id: 'cold-storage',
        name: 'Cold Storage',
        seconds: 40,
        immune: true,
        attacks: ['missiles'],
        targets: [
          { id: 'S3-genNW', hp: 500, at: P(17, 5, 91) },
          { id: 'S3-genNE', hp: 500, at: P(83, 5, 91) },
        ],
        adds: [
          { t: 0, at: spN[0], method: 'drop', spawn: 'SP-N', units: [['glowieAgent', 3, { flashbang: 1 }]] },
          { t: 18, at: spW, method: 'door', spawn: 'SP-W', units: [['midget', 3]] },
          { t: 18, at: spE, method: 'door', spawn: 'SP-E', units: [['boomMidget', 2]] },
        ],
      },
      {
        id: 'final-notice',
        name: 'Final Notice',
        seconds: 60,
        attacks: ['chase', 'missiles', 'volley', 'charge', 'slam'],
        adds: [
          { onBossHp: 35, at: spW, method: 'door', spawn: 'SP-W', units: [['midget', 3]] },
          { onBossHp: 35, at: spE, method: 'door', spawn: 'SP-E', units: [['midget', 2]] },
          { onBossHp: 20, at: spK, method: 'door', spawn: 'SP-K', units: [['frostHound', 1, { elite: true, name: 'Alpha' }], ['frostHound', 2]] },
        ],
      },
    ],
  },
};

export const F2 = {
  id: 'S5-F2',
  name: 'Vault hold',
  maxAlive: 12,
  objective: {
    kind: 'clearAll',
    also: { kind: 'hold', seconds: 90 },
    text: 'Hold the drill and clear the vault',
  },
  activate: zone(18, 62, 40, 84, -2, 14),
  hold: zone(31, 49, 53, 71, -1, 4),
  lockdown: {
    id: 'L3',
    entry: 'S5-blastDoor',
    exit: 'S5-exitDoor',
    threshold: zone(34, 46, 44, 48, -2, 8),
    delaySec: 1,
    stallSec: 12,
    room: zone(18, 62, 40, 84, -2, 13),
  },
  squads: [
    squad('W1', { type: 'onEnter' }, [u('midget', 6)], [[26, 12, 50]], 'drop'),
    squad('W2', { type: 'time', t: 25 }, [
      u('glowieAgent', 3, { flashbang: 1 }),
    ], [[54, 12, 50]], 'drop'),
    squad('W2b', { type: 'with', after: 'W2', delay: 0 }, [u('boomMidget', 2)], [[26, 12, 74]], 'drop'),
    squad('W3', { type: 'time', t: 50 }, [u('spotterDrone', 1)], [[40, 12, 62]], 'air'),
    squad('W3b', { type: 'with', after: 'W3', delay: 0 }, [u('midget', 4)], [[54, 12, 74]], 'drop'),
    squad('W3c', { type: 'with', after: 'W3', delay: 0 }, [u('frostHound', 2)], [[17, 0, 62]], 'door'),
    squad('W4', { type: 'time', t: 75 }, [u('midget', 4)], [[26, 12, 50]], 'drop'),
    squad('W4b', { type: 'with', after: 'W4', delay: 0 }, [u('boomMidget', 2)], [[26, 12, 74]], 'drop'),
    squad('W5', { type: 'time', t: 100 }, [
      u('riotMidget', 1, { elite: true, name: 'the Vault Warden' }),
    ], [[17, 0, 62]], 'door'),
  ],
  strikes: [8, 22, 36, 50, 64, 78, 92],
  strikeEvery: 14,
  coolant: [30, 60, 90],
};

export const S5_END = {
  id: 'S5-END',
  name: 'Extraction',
  objective: { kind: 'reach', text: 'Step on the pad' },
  activate: zone(30, 50, 88, 100, -2, 6),
  zone: zone(35, 45, 91, 101, -1, 4),
  squads: [],
};

export const ENCOUNTERS = { E1, E2, E3, E4, E5, E6, E7, F1, F2, S5_END };

function addUnits(counts, units, key) {
  for (const unit of units) {
    const bucket = counts[key];
    bucket[unit.type] = (bucket[unit.type] || 0) + unit.count;
    bucket._n += unit.count;
  }
}

export function census(list) {
  const counts = { always: { _n: 0 }, alarm: { _n: 0 }, script: { _n: 0 } };
  for (const enc of list) {
    for (const sq of enc.squads || []) {
      if (sq.units.some((unit) => unit.type === 'monster')) continue;
      addUnits(counts, sq.units, sq.optional ? 'alarm' : 'always');
    }
    for (const part of (enc.script && enc.script.parts) || []) {
      for (const add of part.adds || []) {
        for (const unit of add.units || []) {
          const type = unit[0];
          const n = unit[1] || 1;
          counts.script[type] = (counts.script[type] || 0) + n;
          counts.script._n += n;
        }
      }
    }
  }
  return counts;
}
