// Spawn timelines from L04 §8 and §10. Triggers use the v2 director's types.
// The document's own trigger is on `design` when the director has no volume,
// alert, part clock or "any node" hook yet. See ENGINE-NEEDS.md.

function squad(id, trigger, units, at, method = 'placed', design = null, extra = null) {
  const row = { id, trigger, method, at, units };
  if (design) row.design = design;
  if (extra) Object.assign(row, extra);
  return row;
}

function u(type, count, extra) {
  return extra ? { type, count, ...extra } : { type, count };
}

const E1 = {
  id: 'S1-E1',
  name: 'Welcome Desk',
  maxAlive: 8,
  intensity: 0.3,
  objective: { kind: 'clearAll' },
  activate: { min: [44, -2, 32], max: [80, 6, 88] },
  squads: [
    squad('A', { type: 'onEnter' }, [u('midget', 4)], [[58, 0, 56], [66, 0, 56], [58, 0, 64], [66, 0, 64]], 'placed', 'placed, wakes on sight, ring round (62, 0, 60)'),
    squad('B', { type: 'time', t: 1 }, [u('obama', 2)], [[58, 0, 50], [66, 0, 50]], 'door', 'onAlert, hutN, delay 1s'),
    squad('C', { type: 'onKills', n: 4 }, [u('midget', 4)], [[54, 0, 70], [60, 0, 70], [66, 0, 70], [72, 0, 70]], 'door', 'onKills(4), hutS'),
    squad('C2', { type: 'with', after: 'C', delay: 3 }, [u('boomMidget', 2)], [[58, 0, 68], [68, 0, 68]], 'door', 'booms 3s after the midgets'),
  ],
};

const E2 = {
  id: 'S1-E2',
  name: 'First Flight',
  maxAlive: 8,
  intensity: 0.4,
  objective: { kind: 'clearAll' },
  activate: { min: [96, -4, 50], max: [230, 16, 70] },
  squads: [
    squad('A', { type: 'onEnter' }, [u('flyingMidget', 2)], [[110, 2, 60], [118, 2, 60]], 'air', 'onEnter h2, y 7 to 10', { alt: [7, 10] }),
    squad('B', { type: 'time', t: 6 }, [u('flyingMidget', 3)], [[140, 2, 60], [148, 2, 60], [156, 2, 60]], 'air', 'onEnter h3, y 11 to 15', { alt: [11, 15] }),
    squad('C', { type: 'time', t: 12 }, [u('obama', 2)], [[198, 0, 60], [206, 0, 60]], 'placed', 'onEnter Mempool x>182, perched on the stubs'),
    squad('D', { type: 'onKills', n: 5 }, [u('midget', 3)], [[214, 0, 60], [218, 0, 60], [222, 0, 60]], 'door', 'onKills(5), memHut'),
  ],
};

const E3 = {
  id: 'S2-E3',
  name: 'Trading Pit',
  maxAlive: 12,
  flockUnit: 6,
  intensity: 0.75,
  objective: { kind: 'clearAll' },
  activate: { min: [40, -2, 62], max: [92, 24, 138] },
  lockdown: {
    id: 'L1',
    entry: 's2.pitIn',
    exit: 's2.pitOut',
    threshold: { min: [46.5, -1, 93], max: [48.5, 6, 107] },
    room: { min: [41, 0, 63], max: [91, 24, 137] },
    waves: 4,
    fallbackSec: 25,
  },
  squads: [
    squad('W1', { type: 'onEnter' }, [u('bitbug', 6)], [[66, 1, 100]], 'air', 'door drops, PIT-N, y 8 to 18', { alt: [1, 4], spawn: 'PIT-N' }),
    squad('W2a', { type: 'onRemain', n: 2 }, [u('bitbug', 6)], [[70, 1, 100]], 'air', 'onRemain(2) or 25s, PIT-S', { alt: [1, 4], spawn: 'PIT-S', fallbackSec: 25 }),
    squad('W2b', { type: 'with', after: 'W2a', delay: 0 }, [u('flyingMidget', 3)], [[62, 1, 100]], 'air', 'PIT-LID, y 14 to 22', { alt: [1, 4], spawn: 'PIT-LID' }),
    squad('W3a', { type: 'onRemain', n: 2 }, [u('boomMidget', 3)], [[74, 0, 100]], 'door', 'PIT-E', { spawn: 'PIT-E', fallbackSec: 25 }),
    squad('W3b', { type: 'with', after: 'W3a', delay: 0 }, [u('bitbug', 6)], [[58, 1, 100]], 'air', 'PIT-N again', { alt: [1, 4], spawn: 'PIT-N' }),
    squad('W4a', { type: 'onRemain', n: 2 }, [u('bitbug', 3)], [[66, 1, 98]], 'air', 'half-flock PIT-N', { alt: [1, 4], spawn: 'PIT-N', fallbackSec: 25 }),
    squad('W4b', { type: 'with', after: 'W4a', delay: 0 }, [u('bitbug', 3)], [[66, 1, 102]], 'air', 'half-flock PIT-S', { alt: [1, 4], spawn: 'PIT-S' }),
  ],
};

const E4 = {
  id: 'S2-E4',
  name: 'Bull Run',
  maxAlive: 6,
  intensity: 0.6,
  objective: { kind: 'clearAll' },
  activate: { min: [100, -14, 60], max: [262, 60, 140] },
  squads: [
    squad('A', { type: 'onEnter' }, [u('jetObama', 1)], [[130, 16, 100]], 'air', 'onEnter slider 1, matches the player, y 4 to 28', { alt: [4, 28] }),
    squad('B', { type: 'onKills', n: 1 }, [u('robotLaser', 1)], [[160, 32, 100]], 'placed', 'onEnter K8, perched on K10'),
    squad('C', { type: 'onKills', n: 2 }, [u('jetObama', 1)], [[190, 48, 100]], 'air', 'onEnter K11, north', { alt: [38, 56] }),
    squad('C2', { type: 'with', after: 'C', delay: 4 }, [u('jetObama', 1)], [[210, 56, 100]], 'air', 'second jet 4s later, south', { alt: [38, 56] }),
    squad('D', { type: 'onKills', n: 4 }, [u('obama', 1, { elite: true, name: 'Head Trader' })], [[240, 72, 100]], 'placed', 'wakes on landing on K12, K13 or K14'),
  ],
};

const E5 = {
  id: 'S3-E5',
  name: 'Gas Fees',
  maxAlive: 5,
  flockUnit: 6,
  intensity: 0.7,
  objective: { kind: 'clearAll', design: 'destroy s3.gatePylon and reach the mouth' },
  activate: { min: [50, -12, 33], max: [250, 30, 87] },
  squads: [
    squad('A', { type: 'onEnter' }, [u('flakPod', 1)], [[63, 0, 60]], 'placed', 'FP1, static y 0'),
    squad('B', { type: 'time', t: 4 }, [u('flakPod', 1)], [[122, 1, 60]], 'placed', 'onEnter x>80, FP2'),
    squad('B2', { type: 'with', after: 'B', delay: 2 }, [u('bitbug', 6)], [[110, 2, 60]], 'air', 'flock 4s later, riding the wind, y 8 to 16', { alt: [8, 16] }),
    squad('C', { type: 'time', t: 10 }, [u('flakPod', 1)], [[164, 1, 60]], 'placed', 'onEnter R2, FP3 below the lane'),
    squad('D', { type: 'time', t: 16 }, [u('flakPod', 1, { elite: true, name: 'Priority Fee' })], [[208, 1, 60]], 'placed', 'onEnter R3, FP4'),
  ],
};

const E6 = {
  id: 'S4-E6',
  name: 'Dust Sweep',
  useSectionFlyerVolume: true,
  maxAlive: 9,
  intensity: 0.45,
  objective: { kind: 'clearAll' },
  activate: { min: [4, -8, 60], max: [140, 20, 140] },
  squads: [
    squad('A', { type: 'onEnter' }, [u('balloonMidget', 3)], [[52, 6, 100], [58, 9, 94], [58, 5, 106]], 'placed', 'cluster 30 to 36m from the entry wall, y 5 to 9', { alt: [5, 9] }),
    squad('B', { type: 'onKills', n: 2 }, [u('balloonMidget', 3)], [[76, 12, 94], [84, 14, 100], [90, 10, 90]], 'placed', 'onKills(2), round b3 and b6, y 10 to 14', { alt: [10, 14] }),
    squad('C', { type: 'onKills', n: 5 }, [u('balloonMidget', 1)], [[100, 14, 62]], 'air', 'onKills(5), crosswind, 2s apart', { alt: [12, 16] }),
    squad('C2', { type: 'with', after: 'C', delay: 2 }, [u('balloonMidget', 1)], [[108, 16, 62]], 'air', 'second mine', { alt: [12, 16] }),
    squad('C3', { type: 'with', after: 'C2', delay: 2 }, [u('balloonMidget', 1)], [[116, 12, 62]], 'air', 'third mine', { alt: [12, 16] }),
  ],
};

const E7 = {
  id: 'S4-E7',
  name: 'Clearing House',
  maxAlive: 10,
  flockUnit: 6,
  intensity: 0.9,
  objective: { kind: 'clearAll' },
  activate: { min: [146, -12, 58], max: [208, 30, 142] },
  lockdown: {
    id: 'L2',
    entry: 's4.chIn',
    exit: 's4.chOut',
    threshold: { min: [152, -1, 94], max: [154, 6, 106] },
    room: { min: [147, 0, 58], max: [207, 30, 142] },
    waves: 4,
    fallbackSec: 25,
  },
  squads: [
    squad('W1', { type: 'onEnter' }, [u('bitbug', 8)], [[177, 16, 58.5]], 'air', 'door drops, CH-N, y 6 to 20', { alt: [6, 20], spawn: 'CH-N' }),
    squad('W1b', { type: 'with', after: 'W1', delay: 4 }, [u('jetObama', 1)], [[195, 29, 100]], 'air', 'CH-LID 4s later, matches the player', { alt: [4, 26], spawn: 'CH-LID' }),
    squad('W2a', { type: 'onRemain', n: 2 }, [u('jetObama', 2)], [[177, 16, 141.5]], 'air', 'onRemain(2) or 25s, CH-S', { alt: [4, 26], spawn: 'CH-S', fallbackSec: 25 }),
    squad('W2b', { type: 'with', after: 'W2a', delay: 0 }, [u('balloonMidget', 4)], [[195, 29, 100]], 'air', 'CH-LID, y 26 falling to 8', { alt: [8, 26], spawn: 'CH-LID' }),
    squad('W3a', { type: 'onRemain', n: 2 }, [u('flakPod', 1)], [[202, 0, 126]], 'burrow', 'CH-HATCH', { spawn: 'CH-HATCH', fallbackSec: 25 }),
    squad('W3b', { type: 'with', after: 'W3a', delay: 0 }, [u('bitbug', 8)], [[177, -10, 100]], 'air', 'CH-WELL, y 0 to 16', { alt: [0, 16], spawn: 'CH-WELL' }),
    squad('W4', { type: 'onRemain', n: 2 }, [u('jetObama', 1, { elite: true, name: 'Whale' })], [[195, 29, 100]], 'air', 'CH-LID, y 6 to 26', { alt: [6, 26], spawn: 'CH-LID', fallbackSec: 25 }),
  ],
};

const E8 = {
  id: 'S5-E8',
  name: 'Proof of Stake',
  maxAlive: 10,
  intensity: 0.7,
  objective: {
    kind: 'clearAll',
    alsoDestroy: ['n1', 'n2', 'n3'],
    design: 'destroy n1, n2, n3 and clearAll',
  },
  activate: { min: [18, -8, 30], max: [102, 20, 130] },
  squads: [
    squad('A', { type: 'onEnter' }, [u('riotMidget', 2), u('obama', 2)], [[40, 0, 76], [40, 0, 84], [46, 0, 64], [46, 0, 96]], 'placed', 'west plaza'),
    squad('B', { type: 'onKills', n: 4 }, [u('hexAcolyte', 1), u('midget', 4)], [[60, 0, 47.3], [58, 0, 47.3], [62, 0, 47.3], [56, 0, 47.3], [64, 0, 47.3]], 'door', 'onPartDestroyed of the first node (n1, n2 or n3), hutN'),
    squad('C', { type: 'onKills', n: 7 }, [u('robotShooter', 1, { elite: true, name: 'Shooter Bot' })], [[36, 0, 80]], 'drop', 'onKills(7), drop pod on the Ledger roof'),
    squad('C2', { type: 'with', after: 'C', delay: 1 }, [u('manaLeech', 1)], [[40, 0, 84]], 'door', 'leech 3s later, hutS'),
  ],
};

const BOSS = {
  id: 'SB-BOSS',
  name: 'Bitcoin Obama & The Midget',
  maxAlive: 12,
  flockUnit: 6,
  intensity: 1,
  objective: { kind: 'boss', design: 'The Midget is knocked out in stage 3, after Bitcoin Obama is out' },
  activate: { min: [40, -4, 30], max: [100, 16, 90] },
  lockdown: {
    id: 'L3',
    entry: 'sb.gate',
    exit: null,
    threshold: { min: [45.5, -1, 54], max: [47.5, 6, 66] },
    room: { min: [42, -8, 32], max: [98, 16, 88] },
    waves: 5,
    fallbackSec: null,
  },
  // t is seconds from the part start. Today's director ignores `part` and fires
  // on encounter time. ENGINE-NEEDS says to gate these on the active part.
  parts: [
    { id: 1, name: 'Opening Bell', kind: 'entry', seconds: 30, ends: 'pylons destroyed' },
    { id: 2, name: 'Pump', kind: 'double', seconds: 60, ends: 'either stage-2 bar empty' },
    { id: 3, name: 'Flash Crash', kind: 'intermission', seconds: 40, ends: 'both breakers destroyed' },
    { id: 4, name: 'Dump', kind: 'double', seconds: 75, ends: 'Obama out and the Midget in stage 3' },
    { id: 5, name: 'Short Squeeze', kind: 'chase', seconds: 45, ends: 'the Midget is knocked out' },
  ],
  squads: [
    squad('P1a', { type: 'onEnter' }, [
      u('bitbug', 1, { partId: 'sb.py3' }),
      u('bitbug', 1, { partId: 'sb.cb1' }),
      u('bitbug', 1, { partId: 'sb.py1' }),
      u('bitbug', 1, { partId: 'sb.py2' }),
      u('bitbug', 1, { partId: 'sb.cb2' }),
      u('bitbug', 1),
    ], [[48, 1, 60], [52, 1, 60], [56, 1, 60], [60, 1, 60], [64, 1, 60], [68, 1, 60]], 'placed', 'part 1 t+3, SB-N', { spawn: 'SB-N', alt: [1, 2] }),
    squad('bosses', { type: 'onEnter' }, [u('obamaDuo', 1), u('midgetDuo', 1)], [[80, 1, 60], [84, 1, 60]], 'placed', 'both on the podium under the Price Shield'),
    squad('P1b', { type: 'time', t: 15, part: 1 }, [u('bitbug', 6)], [[80, 1, 60]], 'air', 'part 1 t+15, SB-S', { spawn: 'SB-S', alt: [1, 3], optional: true }),
    squad('P2a', { type: 'time', t: 20, part: 2 }, [u('midget', 4)], [[80, 0, 60]], 'drop', 'part 2 t+20, SB-W', { spawn: 'SB-W', optional: true }),
    squad('P2b', { type: 'time', t: 40, part: 2 }, [u('midget', 3), u('boomMidget', 2)], [[84, 0, 60]], 'drop', 'part 2 t+40, SB-E', { spawn: 'SB-E', optional: true }),
    squad('P3a', { type: 'time', t: 0, part: 3 }, [u('bitbug', 6)], [[80, 1, 60]], 'air', 'part 3 t+2, SB-N', { spawn: 'SB-N', optional: true }),
    squad('P3b', { type: 'time', t: 10, part: 3 }, [u('balloonMidget', 4)], [[84, 1, 60]], 'air', 'part 3 t+10, SB-LID', { spawn: 'SB-LID', optional: true }),
    squad('P3c', { type: 'time', t: 20, part: 3 }, [u('bitbug', 6)], [[82, 1, 60]], 'air', 'part 3 t+20, SB-S', { spawn: 'SB-S', optional: true }),
    squad('P4', { type: 'time', t: 15, part: 4 }, [u('boomMidget', 3)], [[80, 0, 60]], 'drop', 'part 4 t+15, SB-C', { spawn: 'SB-C', optional: true }),
  ],
};

export const ENCOUNTERS = { E1, E2, E3, E4, E5, E6, E7, E8, BOSS };

export const EXPECTED_COUNTS = {
  midget: 22,
  boomMidget: 10,
  obama: 7,
  robotLaser: 1,
  flyingMidget: 8,
  bitbug: 70,
  jetObama: 7,
  balloonMidget: 17,
  flakPod: 5,
  riotMidget: 2,
  hexAcolyte: 1,
  manaLeech: 1,
  robotShooter: 1,
};
