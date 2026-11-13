// Spawn timelines from L03 §8 and §10. Triggers use the v2 director's types.
// The doc's own trigger is kept on `design` when the director has no volume,
// alert, switch or boss-part hook yet. See ENGINE-NEEDS.md.

function squad(id, trigger, units, at, method = 'placed', design = null) {
  return { id, trigger, method, at, units, design };
}

function u(type, count, extra) {
  return extra ? { type, count, ...extra } : { type, count };
}

function line(origin, count, step = 1.2, axis = 2) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const p = origin.slice();
    p[axis] += (i - (count - 1) / 2) * step;
    pts.push(p);
  }
  return pts;
}

const E1 = {
  id: 'S1-E1',
  name: 'Scarecrow Row',
  maxAlive: 10,
  intensity: 0.4,
  objective: { kind: 'clearAll' },
  activate: { min: [20, -2, -156], max: [150, 8, -4] },
  squads: [
    squad('E1-a', { type: 'onEnter' }, [u('floretSprout', 2)], [[90, 0, -80], [94, 0, -80]], 'placed', 'onEnter x>66, behind CB3 (99,-84) and CB4 (107,-116)'),
    squad('E1-b', { type: 'time', t: 6 }, [u('midget', 4)], line([110, 0, -80], 4, 1.4, 0), 'door', 'onAlert or t+6, shed SD1, 0.4s apart'),
    squad('E1-c', { type: 'onKills', n: 4 }, [u('obama', 2)], [[120, 0, -80], [124, 0, -80]], 'hidden', 'parapets of T1 and T2'),
    squad('E1-d', { type: 'onRemain', n: 2 }, [u('midget', 3), u('floretSprout', 1)], line([130, 0, -80], 4, 1.4, 0), 'door', 'SD2, sprout 2s late toward CB7'),
  ],
};

const E2 = {
  id: 'S1-E2',
  name: 'Wisp Furrows',
  maxAlive: 10,
  intensity: 0.5,
  objective: { kind: 'clearAll' },
  activate: { min: [168, -2, -176], max: [255, 8, 16] },
  squads: [
    squad('E2-a', { type: 'onEnter' }, [u('hexWisp', 2)], [[190, 1.2, -80], [194, 1.2, -80]], 'hidden', 'rise out of PK2 and PK5'),
    squad('E2-b', { type: 'onKills', n: 2 }, [u('flyingMidget', 3)], line([200, 4, -80], 3, 2, 0), 'air', 'over the barn roof from the south'),
    squad('E2-c', { type: 'onKills', n: 4 }, [u('riotMidget', 1), u('midget', 5)], line([210, 0, -80], 6, 1.4, 0), 'door', 'barn doorway, riot first'),
    squad('E2-d', { type: 'onRemain', n: 3 }, [u('hexWisp', 3)], line([220, 1.2, -80], 3, 1.6, 0), 'hidden', 'through the silo wall and the hay'),
  ],
};

const E3 = {
  id: 'S2-E3',
  name: 'Dust in the Hedges',
  maxAlive: 10,
  intensity: 0.55,
  objective: { kind: 'clearAll' },
  activate: { min: [2, -2, -80], max: [36, 6, -40] },
  squads: [
    squad('E3-a', { type: 'onEnter' }, [u('sewerMidget', 3)], line([12, 0, -60], 3, 1.4, 0), 'burrow', 'BM1 and BM2'),
    squad('E3-b', { type: 'onKills', n: 2 }, [u('sewerMidget', 2)], line([16, 0, -60], 2, 1.4, 0), 'burrow', 'BM3 behind the player, BM4'),
    squad('E3-c', { type: 'onKills', n: 5 }, [u('boomMidget', 3)], line([20, 0, -60], 3, 1.4, 0), 'door', 'onEnter corridor B, HD1, 0.6s apart'),
    squad('E3-d', { type: 'onKills', n: 8 }, [u('sewerMidget', 3)], line([24, 0, -60], 3, 1.4, 0), 'burrow', 'onEnter corridor C, BM5 and BM6'),
    squad('E3-e', { type: 'with', after: 'E3-d', delay: 0 }, [u('midget', 3), u('hexAcolyte', 1)], line([28, 0, -60], 4, 1.4, 0), 'door', 'HD2, acolyte 3s late'),
  ],
};

const E4 = {
  id: 'S2-E4',
  name: 'Gazebo Court',
  maxAlive: 10,
  intensity: 0.8,
  objective: { kind: 'clearAll' },
  activate: { min: [38, -2, -84], max: [82, 10, -36] },
  lockdown: {
    entry: 'LD1-IN',
    exit: 'LD1-OUT',
    threshold: { min: [42, -1, -65], max: [46, 3, -55] },
    room: { min: [38, 0, -84], max: [82, 9, -36] },
    waves: 4,
    fallbackSec: 25,
  },
  squads: [
    squad('E4-w1a', { type: 'onEnter' }, [u('manaLeech', 1)], [[55, 0, -60]], 'placed', 'GZ-ROOF, alone for 4s'),
    squad('E4-w1b', { type: 'with', after: 'E4-w1a', delay: 4 }, [u('midget', 4)], line([58, 0, -60], 4, 1.3, 0), 'door', 'GZ-N'),
    squad('E4-w2a', { type: 'onRemain', n: 2 }, [u('sewerMidget', 5)], line([62, 0, -60], 5, 1.3, 0), 'burrow', 'GZ-M1 M2 M4'),
    squad('E4-w2b', { type: 'with', after: 'E4-w2a', delay: 0 }, [u('manaLeech', 1)], [[68, 0, -60]], 'door', 'GZ-S'),
    squad('E4-w3a', { type: 'onRemain', n: 2 }, [u('midget', 5), u('manaLeech', 1)], line([50, 0, -60], 6, 1.3, 0), 'door', 'GZ-N and GZ-S'),
    squad('E4-w3b', { type: 'with', after: 'E4-w3a', delay: 0 }, [u('sewerMidget', 3)], line([70, 0, -60], 3, 1.3, 0), 'burrow', 'GZ-M3 and GZ-M1'),
    squad('E4-w4a', { type: 'onRemain', n: 2 }, [u('hexWisp', 3)], line([52, 1.2, -60], 3, 1.4, 0), 'hidden', 'GZ-E'),
    squad('E4-w4b', { type: 'with', after: 'E4-w4a', delay: 0 }, [u('midget', 3)], line([72, 0, -60], 3, 1.3, 0), 'door', 'GZ-S'),
  ],
};

const E5 = {
  id: 'S3-E5',
  name: 'First Bridge',
  maxAlive: 10,
  intensity: 0.6,
  objective: { kind: 'clearAll' },
  activate: { min: [8, -2, -100], max: [100, 6, -20] },
  squads: [
    squad('E5-a', { type: 'onEnter' }, [u('barkBrute', 1)], [[43, 0, -60]], 'placed', 'middle of Bridge 1, in the runoff that strips bark'),
    squad('E5-b', { type: 'onKills', n: 1 }, [u('boomMidget', 4)], line([70, 0, -60], 4, 1.4, 0), 'door', 'pump shack PS1, 0.6s apart'),
    squad('E5-c', { type: 'onRemain', n: 1 }, [u('barkBrute', 1), u('midget', 4)], [[74, 0, -40], ...line([78, 0, -60], 4, 1.4, 0)], 'door', 'PS1, midgets 2s late, brute in RP1'),
  ],
};

const E6 = {
  id: 'S3-E6',
  name: 'Runoff Flats',
  maxAlive: 10,
  intensity: 0.65,
  objective: { kind: 'clearAll' },
  activate: { min: [130, -2, -110], max: [200, 6, -20] },
  plates: ['S3-PP1', 'S3-PP2'],
  designObjective: 'switch: PP1 and PP2 held together for 1s, then clearAll',
  squads: [
    squad('E6-a', { type: 'onEnter' }, [u('gooGlob', 1)], [[150, 0, -60]], 'placed', 'in pool RP3'),
    squad('E6-b', { type: 'onRemain', n: 0 }, [u('robotLaser', 2)], [[200, 0, -60], [204, 0, -60]], 'hidden', 'far-bank crates FC1 FC2'),
    squad('E6-c', { type: 'with', after: 'E6-b', delay: 0 }, [u('sewerMidget', 4)], line([155, 0, -60], 4, 1.4, 0), 'burrow', 'onSwitch of the first plate, S3-BM1..4'),
    squad('E6-d', { type: 'onKills', n: 7 }, [u('gooGlob', 1), u('midget', 3)], line([210, 0, -60], 4, 1.4, 0), 'door', 'Bridge 3 grown, PS2, midgets 3s late'),
  ],
};

const E7 = {
  id: 'S4-E7',
  name: 'The Hothouse',
  maxAlive: 10,
  intensity: 0.85,
  objective: { kind: 'clearAll' },
  activate: { min: [34, -2, -73], max: [98, 9, -17] },
  lockdown: {
    entry: 'LD2-IN',
    exit: 'LD2-OUT',
    threshold: { min: [38, -1, -56], max: [42, 3, -34] },
    room: { min: [34, 0, -73], max: [98, 8, -17] },
    waves: 4,
    fallbackSec: 25,
  },
  squads: [
    squad('E7-w1a', { type: 'onEnter' }, [u('daycare', 1, { spawnBudget: 5 })], [[50, 0, -45]], 'placed', 'nest A, core opens 1.5s at each spawn'),
    squad('E7-w1b', { type: 'with', after: 'E7-w1a', delay: 0 }, [u('midget', 5)], line([54, 0, -45], 5, 1.3, 0), 'summon', 'budget 5, two every 6s once the nest ticker exists'),
    squad('E7-w2a', { type: 'onRemain', n: 2 }, [u('floretSprout', 2)], [[60, 0, -45], [63, 0, -45]], 'door', 'HH-CE'),
    squad('E7-w2b', { type: 'with', after: 'E7-w2a', delay: 0 }, [u('sewerMidget', 4)], line([66, 0, -45], 4, 1.3, 0), 'burrow', 'HH-M1 and HH-M3'),
    squad('E7-w3a', { type: 'onRemain', n: 2 }, [u('daycare', 1, { spawnBudget: 5 }), u('midget', 5)], [[74, 0, -45], ...line([78, 0, -45], 5, 1.2, 0)], 'drop', 'HH-ROOF nest B'),
    squad('E7-w3b', { type: 'with', after: 'E7-w3a', delay: 0 }, [u('manaLeech', 1)], [[84, 0, -45]], 'door', 'HH-S'),
    squad('E7-w3c', { type: 'with', after: 'E7-w3a', delay: 0 }, [u('hexWisp', 2)], [[86, 1.2, -45], [88, 1.2, -45]], 'hidden', 'HH-N through the glass'),
    squad('E7-w4', { type: 'onRemain', n: 2 }, [u('barkBrute', 1), u('midget', 4)], [[66, 0, -72], ...line([70, 0, -45], 4, 1.3, 0)], 'door', 'HH-N brute in the north runoff, midgets on the lane'),
  ],
};

const E8 = {
  id: 'S4-E8',
  name: 'Compost Yard',
  maxAlive: 10,
  intensity: 0.5,
  objective: { kind: 'clearAll' },
  activate: { min: [106, -2, -102], max: [168, 6, 12] },
  squads: [
    squad('E8-a', { type: 'onEnter' }, [u('gooGlob', 1)], [[134, 0, -45]], 'placed', 'in pool RP5'),
    squad('E8-b', { type: 'time', t: 2 }, [u('boomMidget', 3)], line([140, 0, -45], 3, 1.4, 0), 'door', 'onAlert, shed S4-CSH, 0.6s apart'),
    squad('E8-c', { type: 'onRemain', n: 2 }, [u('hexWisp', 2), u('midget', 2)], line([148, 0, -45], 4, 1.4, 0), 'hidden', 'bins CB3 CB5 and behind CB4'),
  ],
};

const F1 = {
  id: 'S5-F1',
  name: 'The Compost Hex',
  maxAlive: 10,
  intensity: 0.95,
  objective: { kind: 'boss' },
  boss: 'hexAuditor',
  arena: { x: 45, z: -80, radius: 34 },
  activate: { min: [20, -2, -114], max: [70, 12, -46] },
  lockdown: {
    entry: 'LD3-IN',
    exit: 'LD3-OUT',
    threshold: { min: [42, -1, -54], max: [48, 3, -50] },
    room: { min: [11, 0, -114], max: [79, 12, -46] },
    waves: 3,
    fallbackSec: null,
  },
  parts: [
    { id: 'audit', kind: 'phase', hpFrom: 3000, hpTo: 1800, ends: '60% HP', seconds: 50 },
    { id: 'rooted', kind: 'intermission', ends: 'third totem destroyed', seconds: 55, totems: ['TOT-N', 'TOT-SE', 'TOT-SW'] },
    { id: 'liquidation', kind: 'phase', hpFrom: 1800, hpTo: 0, ends: '0 HP', seconds: 80, floodAt: 0.25 },
  ],
  squads: [
    squad('F1-boss', { type: 'onEnter' }, [u('hexAuditor', 1)], [[45, 1.6, -80]], 'placed', 'arena centre C'),
    squad('F1-p1a', { type: 'onBossHp', p: 85 }, [u('midget', 5)], line([45, 0, -90], 5, 1.4, 0), 'burrow', 'RM2 and RM5'),
    squad('F1-p1b', { type: 'onBossHp', p: 70 }, [u('hexWisp', 2)], [[48, 1.2, -80], [42, 1.2, -80]], 'summon', 'HEAP'),
    squad('F1-p2a', { type: 'onBossHp', p: 60 }, [u('sewerMidget', 3)], [[45, 0, -100], [47, 0, -100], [43, 0, -100]], 'burrow', 'TOT-N, shots break the post on the way'),
    squad('F1-p2b', { type: 'onBossHp', p: 60 }, [u('manaLeech', 1), u('midget', 3)], line([55, 0, -80], 4, 1.4, 0), 'summon', 'TOT-SE'),
    squad('F1-p2c', { type: 'onBossHp', p: 60 }, [u('barkBrute', 1, { elite: true })], [[26, 0, -69]], 'burrow', 'TOT-SW elite, runoff strips bark'),
    squad('F1-p2d', { type: 'onBossHp', p: 60 }, [u('midget', 3)], line([45, 0, -96], 3, 1.4, 0), 'burrow', 'onPartDestroyed TOT-N, RM1 and RM6'),
    squad('F1-p3a', { type: 'onBossHp', p: 45 }, [u('boomMidget', 3)], line([40, 0, -80], 3, 1.4, 0), 'burrow', 'RM3 and RM4'),
    squad('F1-p3b', { type: 'onBossHp', p: 25 }, [u('hexWisp', 2)], [[50, 1.2, -80], [40, 1.2, -80]], 'summon', 'HEAP, flood starts'),
    squad('F1-p3c', { type: 'onBossHp', p: 12 }, [u('sewerMidget', 3)], line([45, 0, -86], 3, 1.4, 0), 'burrow', 'RM1 RM3 RM5'),
  ],
};

const F2 = {
  id: 'S6-F2',
  name: 'Broccoli Head Sprout',
  maxAlive: 10,
  intensity: 0.7,
  objective: { kind: 'boss' },
  boss: 'broccoli',
  fleeAt: 0.5,
  fleeTo: 'S6-LG',
  activate: { min: [12, -2, -65], max: [58, 6, -16] },
  squads: [
    squad('F2-boss', { type: 'onEnter' }, [u('broccoli', 1)], [[36, 0.6, -40]], 'placed', 'on the vape tank, stage 1 only'),
    squad('F2-a', { type: 'time', t: 8 }, [u('midget', 3)], line([36, 0, -48], 3, 1.4, 0), 'door', 'PT-N'),
    squad('F2-b', { type: 'onBossHp', p: 80 }, [u('midget', 3)], line([30, 0, -40], 3, 1.4, 0), 'door', 'PT-W'),
    squad('F2-c', { type: 'onBossHp', p: 65 }, [u('floretSprout', 2)], [[42, 0, -40], [46, 0, -40]], 'hidden', 'behind GV1 and GV2'),
  ],
};

const F3 = {
  id: 'S6-F3',
  name: 'Runoff Escape',
  maxAlive: 10,
  intensity: 0.6,
  objective: { kind: 'escape' },
  zone: { min: [126, -2, -52], max: [144, 14, -36] },
  activate: { min: [126, -2, -52], max: [144, 14, -36] },
  squads: [
    squad('F3-a', { type: 'onEnter' }, [u('sewerMidget', 2)], [[134, 9, -44], [136, 9, -46]], 'burrow', 'terrace 1, EM1 EM2'),
    squad('F3-b', { type: 'onEnter' }, [u('floretSprout', 2)], [[132, 9, -42], [138, 9, -44]], 'placed', 'terrace 2'),
    squad('F3-c', { type: 'time', t: 8 }, [u('sewerMidget', 2)], [[134, 9, -40], [136, 9, -48]], 'burrow', 'onEnter terrace 2, EM3 EM4'),
    squad('F3-d', { type: 'time', t: 12 }, [u('floretSprout', 2)], [[130, 9, -44], [140, 9, -44]], 'placed', 'levee, can be outrun'),
  ],
};

export const ENCOUNTERS = { E1, E2, E3, E4, E5, E6, E7, E8, F1, F2, F3 };

export const EXPECTED_COUNTS = {
  midget: 67,
  sewerMidget: 34,
  hexWisp: 16,
  boomMidget: 13,
  floretSprout: 11,
  manaLeech: 5,
  barkBrute: 4,
  gooGlob: 3,
  flyingMidget: 3,
  obama: 2,
  robotLaser: 2,
  daycare: 2,
  riotMidget: 1,
  hexAcolyte: 1,
};
