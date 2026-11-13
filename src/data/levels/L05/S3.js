// S3 Gatehouse and Courtyard. Lockdown 1, the Abominable Auditor.
// Origin is S2's inner wall face (80, 0, 206).
import { P, ammo, door, hazard, hook, room, slab, stairs, zone } from './prim.js';
import { crateStack, generator } from './prefabs.js';
import { F1 } from './encounters.js';

const rails = [];
for (let i = 0; i < 8; i++) {
  const x = 17 + i * 9.4;
  rails.push(slab(`S3-railS${i}`, x, 5.6, 28, [8, 1.2, 0.5], 'metal'));
  rails.push(slab(`S3-railN${i}`, x, 5.6, 90, [8, 1.2, 0.5], 'metal'));
}
for (let i = 0; i < 6; i++) {
  const n = 30 + i * 10;
  rails.push(slab(`S3-railW${i}`, 13, 5.6, n, [0.5, 1.2, 8], 'metal'));
  rails.push(slab(`S3-railE${i}`, 87, 5.6, n, [0.5, 1.2, 8], 'metal'));
}
const dots = [];
for (let i = 0; i < 14; i++) dots.push({ kind: 'disc', id: `S3-threshold${i}`, at: P(43.5 + i, 0.05, 30), r: 0.4, mat: 'neon' });

export const S3 = {
  id: 'S3',
  name: 'Gatehouse and Courtyard',
  origin: [100, 0, -726],
  start: P(50, 0, 6),
  yaw: 0,
  footprint: [100, 120],
  routeM: 105,
  flyerVolume: { min: [0, -6, -120], max: [100, 14, 0] },
  exit: zone(46, 54, 114, 120, -2, 8),
  grappleAnchors: [
    hook('S3-hook-gallSW', 14, 5.8, 28),
    hook('S3-hook-gallSE', 86, 5.8, 28),
    hook('S3-hook-gallNW', 14, 5.8, 90),
    hook('S3-hook-gallNE', 86, 5.8, 90),
    hook('S3-hook-pillarSW', 32, 7.4, 41),
    hook('S3-hook-pillarSE', 68, 7.4, 41),
    hook('S3-hook-pillarNW', 32, 7.4, 77),
    hook('S3-hook-pillarNE', 68, 7.4, 77),
    hook('S3-hook-rig', 50, 6.4, 26),
  ],
  intro: {
    title: 'Something in the courtyard has been on ice since the last audit.',
    lines: [],
  },
  geometry: [
    slab('S3-floorS', 50, -0.5, 23, [100, 1, 46], 'concrete'),
    slab('S3-floorN', 50, -0.5, 96, [100, 1, 48], 'concrete'),
    slab('S3-floorW', 18.5, -0.5, 59, [37, 1, 26], 'concrete'),
    slab('S3-floorE', 81.5, -0.5, 59, [37, 1, 26], 'concrete'),
    slab('S3-basin', 50, -4.5, 59, [26, 1, 26], 'ice'),
    slab('S3-iceFloor', 50, -0.25, 59, [26, 0.5, 26], 'ice', { tag: 'crackTiles' }),
    { kind: 'cylinder', id: 'S3-dais', at: P(50, -4, 59), r: 5, h: 4.6, mat: 'ice' },
    { kind: 'cylinder', id: 'S3-iceMachine', at: P(50, 0.6, 59), r: 1.5, h: 4, mat: 'metal' },
    ...[['W', 42.5], ['E', 57.5]].flatMap(([side, x]) => [
      slab(`S3-pass${side}S`, x, 3, 4.9, [1, 6, 9.8], 'concrete'),
      slab(`S3-pass${side}N`, x, 3, 17.1, [1, 6, 9.8], 'concrete'),
      slab(`S3-pass${side}Lintel`, x, 4.3, 11, [1, 3.4, 2.4], 'concrete'),
    ]),
    slab('S3-passRoof', 50, 6.25, 11, [16, 0.5, 22], 'concrete'),
    ...room('S3-depot', 25, 42, 2, 20, 0, 6, [{ side: 'e', at: 11 }], 'concrete'),
    ...room('S3-stairRoom', 58, 75, 2, 20, 0, 9, [
      { side: 'w', at: 11 }, { side: 'n', at: 70, w: 4, h: 8 },
    ], 'concrete'),
    stairs({ id: 'S3-stairUp', at: P(70, 2.5, 12), size: [3, 5, 16], yaw: 180, mat: 'concrete' }),
    slab('S3-landing', 70, 4.75, 23, [4, 0.5, 6], 'metal'),
    slab('S3-wallW1', 8, 6, 39.75, [2, 12, 35.5], 'concrete'),
    slab('S3-wallW2', 8, 6, 78.25, [2, 12, 35.5], 'concrete'),
    slab('S3-wallWLintel', 8, 7.5, 59, [2, 9, 3], 'concrete'),
    slab('S3-wallE1', 92, 6, 39.75, [2, 12, 35.5], 'concrete'),
    slab('S3-wallE2', 92, 6, 78.25, [2, 12, 35.5], 'concrete'),
    slab('S3-wallELintel', 92, 7.5, 59, [2, 9, 3], 'concrete'),
    slab('S3-wallS1', 25.5, 6, 23, [35, 12, 2], 'concrete'),
    slab('S3-wallS2', 74.5, 2.5, 23, [35, 5, 2], 'concrete'),
    slab('S3-wallS2UpperW', 62.5, 6.6, 23, [11, 3.2, 2], 'concrete'),
    slab('S3-wallS2UpperE', 82, 6.6, 23, [20, 3.2, 2], 'concrete'),
    slab('S3-wallS2Header', 74.5, 10.1, 23, [35, 3.8, 2], 'concrete'),
    slab('S3-wallSLintel', 50, 9, 23, [14, 6, 2], 'concrete'),
    slab('S3-wallN1', 27, 6, 95, [38, 12, 2], 'concrete'),
    slab('S3-wallN2', 73, 6, 95, [38, 12, 2], 'concrete'),
    slab('S3-wallNLintel', 50, 8, 95, [8, 8, 2], 'concrete'),
    slab('S3-gallS', 50, 4.75, 26, [74, 0.5, 4], 'metal'),
    slab('S3-gallN', 50, 4.75, 92, [74, 0.5, 4], 'metal'),
    slab('S3-gallW', 11, 4.75, 59, [4, 0.5, 70], 'metal'),
    slab('S3-gallE', 89, 4.75, 59, [4, 0.5, 70], 'metal'),
    ...rails,
    stairs({ id: 'S3-stairSW', at: P(14.5, 2.5, 34), size: [3, 5, 10], yaw: 0, mat: 'metal', tag: 'slide' }),
    stairs({ id: 'S3-stairSE', at: P(85.5, 2.5, 34), size: [3, 5, 10], yaw: 0, mat: 'metal', tag: 'slide' }),
    { kind: 'cylinder', id: 'S3-pillar1', at: P(32, 0, 41), r: 2, h: 8, mat: 'ice' },
    { kind: 'cylinder', id: 'S3-pillar2', at: P(68, 0, 41), r: 2, h: 8, mat: 'ice' },
    { kind: 'cylinder', id: 'S3-pillar3', at: P(32, 0, 77), r: 2, h: 8, mat: 'ice' },
    { kind: 'cylinder', id: 'S3-pillar4', at: P(68, 0, 77), r: 2, h: 8, mat: 'ice' },
    slab('S3-bar1', 40, 0.6, 32, [4, 1.2, 1], 'concrete'),
    slab('S3-bar2', 60, 0.6, 32, [4, 1.2, 1], 'concrete'),
    slab('S3-bar3', 24, 0.6, 59, [4, 1.2, 1], 'concrete'),
    slab('S3-bar4', 76, 0.6, 59, [4, 1.2, 1], 'concrete'),
    slab('S3-bar5', 40, 0.6, 86, [4, 1.2, 1], 'concrete'),
    slab('S3-bar6', 60, 0.6, 86, [4, 1.2, 1], 'concrete'),
    ...crateStack('S3-crate1', 26, 30),
    ...crateStack('S3-crate2', 74, 30),
    ...crateStack('S3-crate3', 26, 88),
    ...crateStack('S3-crate4', 74, 88),
    ...generator('S3-genNW', 11, 5, 91),
    ...generator('S3-genNE', 89, 5, 91),
    { kind: 'cylinder', id: 'S3-rigPad', at: P(50, 5, 26), r: 1.2, h: 1, mat: 'metal' },
    slab('S3-hatch', 62, 0.75, 93, [3, 1.5, 2], 'metal'),
    slab('S3-passN1', 45.5, 3, 106, [1, 6, 20], 'concrete'),
    slab('S3-passN2', 54.5, 3, 106, [1, 6, 20], 'concrete'),
    slab('S3-passNRoof', 50, 6.25, 106, [10, 0.5, 20], 'concrete'),
    ...dots,
  ],
  weapons: [],
  checkpoints: [
    { id: 'CP6', at: P(50, 0, 18), whenDesign: 'leaving depot 1' },
    { id: 'CP7', at: P(50, 0.6, 59), when: 'S3-F1.cleared' },
  ],
  mechanisms: [
    { kind: 'depot', id: 'D1', at: P(36, 0, 11) },
    { kind: 'depotCrate', id: 'D1-crate', at: P(33, 0, 6) },
    { kind: 'health', id: 'D1-health', at: P(33, 0, 16) },
    { kind: 'bench', id: 'D1-bench', at: P(41, 0, 6) },
    { kind: 'shop', id: 'D1-shop', at: P(41, 0, 16) },
    door('S3-arenaDoor', 50, 3, 22.5, [14, 6, 0.6]),
    door('S3-exitDoor', 50, 2, 95, [8, 4, 0.6]),
    door('S3-doorUp', 70, 5, 20, [2.4, 2.6, 0.6]),
    door('SP-W', 8, 1.5, 59, [2, 3, 3]),
    door('SP-E', 92, 1.5, 59, [2, 3, 3]),
    { kind: 'emplacement', id: 'S3-rig', at: P(50, 5, 26), yaw: 180, def: 'miningRig', arc: 120, rate: 8, damage: 3, overheat: 4, recover: 2 },
    { kind: 'target', id: 'S3-genNW-hp', solid: 'S3-genNW-body', hp: 500, at: P(11, 6, 91), weak: 2 },
    { kind: 'target', id: 'S3-genNE-hp', solid: 'S3-genNE-body', hp: 500, at: P(89, 6, 91), weak: 2 },
    hazard('S3-cold', 9, 91, 24, 94, { set: 'F1-part2', dps: 3, shieldRegen: 0, y0: -4, y1: 3, tag: 'cold' }),
    hazard('S3-slick', 35, 65, 44, 74, { set: 'F1-part3', slow: 0.15, tag: 'slick' }),
    { kind: 'crackTiles', id: 'S3-crack', at: P(50, 0, 59), size: [26, 0.5, 26], tile: 3.25, set: 'F1-part3', fall: 1, telegraph: 0.5, return: 20 },
    { kind: 'breakable', id: 'S3-break1', solid: 'S3-pillar1', hits: 2, stun: 2 },
    { kind: 'breakable', id: 'S3-break2', solid: 'S3-pillar2', hits: 2, stun: 2 },
    { kind: 'breakable', id: 'S3-break3', solid: 'S3-pillar3', hits: 2, stun: 2 },
    { kind: 'breakable', id: 'S3-break4', solid: 'S3-pillar4', hits: 2, stun: 2 },
    { kind: 'power', id: 'S3-overshield', at: P(50, 5, 90), modifier: 'overshield' },
    { kind: 'chest', id: 'chest-l1', at: P(50, 0.6, 63), opens: 'S3-F1.cleared', tier: 'uncommon' },
    { kind: 'ammoCrate', id: 'AC1', at: P(52, 0.6, 63), uses: 3, opens: 'S3-F1.cleared' },
    ammo('AB15', 50, 5, 92, 'sniper', 8),
    ammo('AB16', 46, 5, 26, 'bullets', 60),
  ],
  encounters: [F1],
};
