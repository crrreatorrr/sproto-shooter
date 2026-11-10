// S1 Crash Site and Outer Snowfield. Footprint 300 × 520. Local design metres.
import { P, ammo, door, hazard, hook, latch, room, slab, stairs, terrain, zone } from './prim.js';
import {
  alarmPole, boulderL, boulderM, crateStack, pine, rockSlab, searchlight, snowBerm, snowcat,
} from './prefabs.js';
import { E1, E2, E3 } from './encounters.js';

const lips = [118, 134, 150, 166, 182].map((x, i) => slab(`S1-ridgeLip${i + 1}`, x, 3.6, 77.5, [6, 1.2, 1], 'snow'));
const pines = [[60, 100], [72, 118], [55, 135], [80, 140], [66, 160], [90, 170], [58, 185], [84, 198], [70, 215], [95, 225]]
  .flatMap(([x, n], i) => pine(`S1-pine${i + 1}`, x, n));
const flank = [[50, 330], [58, 350], [46, 368], [60, 385], [52, 400], [66, 410]]
  .flatMap(([x, n], i) => pine(`S1-flank${i + 1}`, x, n));
const field = [[140, 100], [170, 112], [128, 122], [152, 136], [186, 144], [122, 150]]
  .flatMap(([x, n], i) => boulderM(`S1-fieldRock${i + 1}`, x, n));
const bermX = [44.5, 114.5, 193, 263];
const bermL = [65, 63, 78, 50];
const berms = [];
bermX.forEach((x, i) => {
  berms.push(slab(`S1-bermS${i + 1}`, x, 0.6, 249.25, [bermL[i], 1.2, 1.5], 'snow'));
  berms.push(slab(`S1-bermN${i + 1}`, x, 0.6, 262.75, [bermL[i], 1.2, 1.5], 'snow'));
});
const rowA = [[110, 320], [150, 320], [190, 320]].flatMap(([x, n], i) => boulderL(`S1-rowA${i + 1}`, x, n));
const rowB = [[90, 340], [130, 340], [170, 340], [210, 340]].flatMap(([x, n], i) => boulderM(`S1-rowB${i + 1}`, x, n));
const rowC = [[110, 360], [150, 360], [190, 360]].flatMap(([x, n], i) => rockSlab(`S1-rowC${i + 1}`, x, n));
const rowD = [[95, 378], [135, 378], [165, 378], [205, 378]].flatMap(([x, n], i) => boulderM(`S1-rowD${i + 1}`, x, n));
const rowE = [[120, 395], [150, 395], [180, 395]].flatMap(([x, n], i) => snowBerm(`S1-rowE${i + 1}`, x, n));
const pass = [[146, 470], [154, 482], [146, 494]].flatMap(([x, n], i) => rockSlab(`S1-passSlab${i + 1}`, x, n));

const mastRails = [
  [0, 2.5, [5, 1.2, 0.5]], [0, -2.5, [5, 1.2, 0.5]], [2.5, 0, [0.5, 1.2, 5]], [-2.5, 0, [0.5, 1.2, 5]],
].map((r, i) => slab(`S1-mastRail${i}`, 150 + r[0], 14.6, 445 + r[1], r[2], 'metal'));
const nestRails = [
  [0, 1.5, [3, 1.2, 0.5]], [0, -1.5, [3, 1.2, 0.5]], [1.5, 0, [0.5, 1.2, 3]], [-1.5, 0, [0.5, 1.2, 3]],
].map((r, i) => slab(`S1-nestRail${i}`, 150 + r[0], 22.6, 445 + r[1], r[2], 'metal'));

export const S1 = {
  id: 'S1',
  name: 'Crash Site and Outer Snowfield',
  origin: [0, 0, 0],
  start: P(150, 0, 19),
  yaw: 0,
  footprint: [300, 520],
  routeM: 516,
  flyerVolume: { min: [0, 0, -520], max: [300, 40, 0] },
  exit: zone(143, 157, 519, 524, -2, 8),
  intro: {
    title: 'FROSTSPIRE BLACK SITE',
    lines: [
      'The ledgers are in a vault at the top of the spire.',
      'Glowie is watching from a drone. Be far away. Be boring.',
    ],
  },
  grappleAnchors: [
    hook('S1-hook-ridge', 150, 3.6, 75, 2.2),
    hook('S1-hook-look', 120, 3.2, 186),
    hook('S1-hook-mast', 150, 14.4, 445),
    hook('S1-hook-nest', 150, 22.2, 445),
    hook('S1-hook-spire', 70, 6.4, 420),
    hook('S1-hook-hut', 225, 4.4, 432),
  ],
  terrain: terrain({
    id: 'S1-ground',
    origin: [0, 0, -520],
    size: [300, 520],
    cell: 4,
    seed: 501,
    mat: 'snow',
    noise: { amp: 1.2, freq: 0.012, octaves: 2 },
    flat: [{ n0: 244, n1: 268 }, { x0: 143, x1: 157, n0: 460, n1: 520 }],
  }),
  geometry: [
    slab('S1-floor', 150, -0.25, 260, [300, 0.5, 520], 'snow', { tag: 'terrainStandIn' }),
    slab('S1-cliffW', 6, 7, 260, [12, 14, 520], 'rock'),
    slab('S1-cliffE', 294, 7, 260, [12, 14, 520], 'rock'),
    slab('S1-cliffS', 150, 7, 4, [276, 14, 8], 'rock'),
    slab('S1-cliffNW', 77.5, 7, 490, [131, 14, 60], 'rock'),
    slab('S1-cliffNE', 222.5, 7, 490, [131, 14, 60], 'rock'),
    { kind: 'cylinder', id: 'S1-pod', at: P(150, 0, 15), r: 1.6, h: 3.2, mat: 'metal' },
    slab('S1-podFin1', 147.8, 1, 14, [0.5, 2, 2.4], 'metal'),
    slab('S1-podFin2', 152.2, 1, 14, [0.5, 2, 2.4], 'metal'),
    slab('S1-podFin3', 150, 1, 12.6, [0.5, 2, 2.4], 'metal'),
    slab('S1-debris1', 143, 0.6, 26, [3, 1.2, 0.8], 'metal'),
    slab('S1-debris2', 158, 0.6, 32, [3, 1.2, 0.8], 'metal'),
    slab('S1-debris3', 149, 0.6, 40, [3, 1.2, 0.8], 'metal'),
    slab('S1-debris4', 144, 0.6, 50, [3, 1.2, 0.8], 'metal'),
    slab('S1-cacheC1', 156, 0.6, 54, [2.4, 1.2, 1.4], 'crate'),
    { kind: 'ramp', id: 'S1-ridgeS', at: P(150, 1.5, 66), size: [80, 3, 12], yaw: 180, mat: 'snow' },
    slab('S1-ridgeTop', 150, 1.5, 75, [80, 3, 6], 'snow'),
    ...lips,
    { kind: 'ramp', id: 'S1-ridgeN', at: P(150, 1.5, 83), size: [80, 3, 10], yaw: 0, mat: 'snow', tag: 'slide' },
    ...field,
    ...pines,
    ...snowcat('S1-snowcat', 165, 172, 30),
    { kind: 'cone', id: 'S1-tent1', at: P(171, 0, 181), r: 2.2, h: 2.6, mat: 'wood' },
    { kind: 'cylinder', id: 'S1-tent1-col', at: P(171, 0, 181), r: 1.8, h: 2, mat: 'wood' },
    { kind: 'cone', id: 'S1-tent2', at: P(149, 0, 183), r: 2.2, h: 2.6, mat: 'wood' },
    { kind: 'cylinder', id: 'S1-tent2-col', at: P(149, 0, 183), r: 1.8, h: 2, mat: 'wood' },
    ...crateStack('S1-campCrate1', 152, 176),
    ...crateStack('S1-campCrate2', 164, 162),
    { kind: 'sphere', id: 'S1-mound1', at: P(150, -0.4, 165), r: 1.2, mat: 'snow' },
    { kind: 'sphere', id: 'S1-mound2', at: P(172, -0.4, 166), r: 1.2, mat: 'snow' },
    slab('S1-lookDeck', 120, 2.25, 186, [5, 0.5, 5], 'wood'),
    { kind: 'cylinder', id: 'S1-lookLeg1', at: P(117.8, 0, 183.8), r: 0.3, h: 2, mat: 'wood' },
    { kind: 'cylinder', id: 'S1-lookLeg2', at: P(122.2, 0, 183.8), r: 0.3, h: 2, mat: 'wood' },
    { kind: 'cylinder', id: 'S1-lookLeg3', at: P(117.8, 0, 188.2), r: 0.3, h: 2, mat: 'wood' },
    { kind: 'cylinder', id: 'S1-lookLeg4', at: P(122.2, 0, 188.2), r: 0.3, h: 2, mat: 'wood' },
    stairs({ id: 'S1-lookStairs', at: P(120, 1.25, 190.5), size: [1.5, 2.5, 4], yaw: 0, mat: 'wood' }),
    slab('S1-lookRail', 120, 3.1, 183.75, [5, 1.2, 0.5], 'wood'),
    ...alarmPole('S1-alarm1', 122, 2.5, 187.5),
    slab('S1-relay1', 120, 0.75, 205, [1, 1.5, 1], 'metal'),
    slab('S1-tunnelJambW', 9.5, 2, 215, [1, 4, 1], 'metal'),
    slab('S1-tunnelJambE', 15.5, 2, 215, [1, 4, 1], 'metal'),
    slab('S1-tunnelLintel', 12.5, 4.5, 215, [6, 1, 1], 'metal'),
    slab('S1-creekIce', 150, -0.2, 256, [276, 0.5, 12], 'ice'),
    ...berms,
    slab('S1-bridge', 150, 1.5, 256, [3, 0.6, 18], 'wood'),
    { kind: 'ramp', id: 'S1-bridgeRampS', at: P(150, 0.9, 244.5), size: [3, 1.8, 5], yaw: 180, mat: 'wood' },
    { kind: 'ramp', id: 'S1-bridgeRampN', at: P(150, 0.9, 267.5), size: [3, 1.8, 5], yaw: 0, mat: 'wood' },
    slab('S1-bridgeRailW', 148.25, 2.4, 256, [0.5, 1.2, 18], 'wood'),
    slab('S1-bridgeRailE', 151.75, 2.4, 256, [0.5, 1.2, 18], 'wood'),
    slab('S1-leanRoof', 165, 1.85, 265.5, [6, 0.5, 3], 'wood'),
    slab('S1-leanWall', 165, 0.8, 267.25, [6, 1.6, 0.5], 'wood'),
    ...room('S1-kennel', 203, 207, 284, 286, 0, 1.6, [{ side: 's', at: 205, w: 1.2, h: 1.6 }], 'wood'),
    { kind: 'disc', id: 'S1-shrineDais', at: P(150, 0.02, 300), r: 3, mat: 'stone' },
    { kind: 'cylinder', id: 'S1-shrineObelisk', at: P(150, 0.5, 300), r: 0.5, h: 3, mat: 'gold' },
    { kind: 'disc', id: 'S1-shrineDisc', at: P(150, 0.05, 300), r: 5, mat: 'neon' },
    { kind: 'cylinder', id: 'S1-shrineStone1', at: P(146, 0, 296), r: 0.6, h: 2.5, mat: 'ice' },
    { kind: 'cylinder', id: 'S1-shrineStone2', at: P(154, 0, 296), r: 0.6, h: 2.5, mat: 'ice' },
    { kind: 'cylinder', id: 'S1-shrineStone3', at: P(146, 0, 304), r: 0.6, h: 2.5, mat: 'ice' },
    { kind: 'cylinder', id: 'S1-shrineStone4', at: P(154, 0, 304), r: 0.6, h: 2.5, mat: 'ice' },
    ...searchlight('S1-practiceLight', 150, 0, 312),
    ...rowA, ...rowB, ...rowC, ...rowD, ...rowE,
    ...flank,
    slab('S1-flankWall', 250, 1.1, 360, [1.5, 2.2, 60], 'snow'),
    slab('S1-fenceW', 122, 1.2, 410, [44, 2.4, 0.5], 'metal'),
    slab('S1-fenceE', 178, 1.2, 410, [44, 2.4, 0.5], 'metal'),
    { kind: 'cylinder', id: 'S1-mast', at: P(150, 0, 445), r: 0.6, h: 24, mat: 'metal' },
    slab('S1-mastDeck', 150, 13.75, 445, [5, 0.5, 5], 'metal'),
    ...mastRails,
    slab('S1-crowsNest', 150, 21.75, 445, [3, 0.5, 3], 'metal'),
    ...nestRails,
    slab('S1-mastLift', 157, 0.25, 448, [1.5, 0.5, 1.5], 'metal'),
    { kind: 'cylinder', id: 'S1-spire', at: P(70, 0, 425), r: 4, h: 9, mat: 'ice' },
    { kind: 'cone', id: 'S1-spireCap', at: P(70, 9, 425), r: 4, h: 6, mat: 'ice' },
    slab('S1-spireLedge', 70, 5.75, 420, [4, 0.5, 3], 'ice'),
    { kind: 'ramp', id: 'S1-spireRamp', at: P(76, 3, 430), size: [2, 6, 12], yaw: 0, mat: 'ice' },
    slab('S1-hut', 225, 2, 432, [10, 4, 8], 'concrete'),
    stairs({ id: 'S1-hutStairs', at: P(231.75, 2, 425), size: [1.5, 4, 6], yaw: 180, mat: 'concrete' }),
    slab('S1-hutRail', 225, 4.6, 428.25, [10, 1.2, 0.5], 'concrete'),
    ...pass,
    { kind: 'disc', id: 'S1-rigPad', at: P(150, 0.02, 512), r: 2.2, mat: 'concrete' },
    slab('S1-rigBagW', 146.5, 0.6, 508, [3, 1.2, 0.8], 'concrete'),
    slab('S1-rigBagE', 153.5, 0.6, 508, [3, 1.2, 0.8], 'concrete'),
  ],
  weapons: [
    { id: 'C1', at: P(156, 0.6, 54), gun: 'sniper', why: 'E1, E3, E4: every long shot in the quiet half', quality: 'uncommon', manufacturer: 'reliable', element: 'none', level: 5 },
    { id: 'R1', at: P(146, 0, 462), gun: 'bazooka', why: 'The rig in the pass and the two wall rigs', quality: 'uncommon', manufacturer: 'reliable', element: 'none', level: 5 },
  ],
  checkpoints: [
    { id: 'CP1', at: P(163, 0, 174), when: 'S1-E1.cleared' },
    { id: 'CP2', at: P(150, 0, 300), when: 'S1-shrine' },
    { id: 'CP3', at: P(150, 0, 516), when: 'S1-E3.cleared' },
  ],
  mechanisms: [
    { kind: 'barrel', id: 'S1-fire', at: P(158, 0.55, 168), element: 'fire' },
    { kind: 'shrine', id: 'S1-shrine', at: P(150, 0.5, 300), spell: 'decoy', name: 'Cardboard Sproto' },
    { kind: 'searchlight', id: 'S1-practice', at: P(150, 0, 312), harmless: true, beam: 120, spot: 6, sweep: 8 },
    hazard('S1-slickW', 12, 146, 250, 262, { slow: 0.15, tag: 'slick', y0: -1, y1: 1.2 }),
    hazard('S1-slickE', 154, 288, 250, 262, { slow: 0.15, tag: 'slick', y0: -1, y1: 1.2 }),
    door('S1-tunnel', 12.5, 1.5, 215, [4, 3, 1]),
    door('S1-hutDoor', 220, 1.3, 433, [1, 2.6, 2.4]),
    door('S1-passGate', 150, 2.5, 518.5, [14, 5, 1], { opens: 'S1-E3.cleared' }),
    latch('S1-passLatch', 'S1-passGate', P(6, 3, 500)),
    { kind: 'mover', id: 'S1-lift', carry: true, from: P(157, 0, 448), to: P(157, 22, 448), speed: 2, stops: [0, 14, 22] },
    { kind: 'alarm', id: 'S1-alarm1', at: P(122, 6.5, 187.5), hp: 40, cableHp: 20, cableTo: P(120, 0.75, 205), runner: 1.5, arrive: 6 },
    { kind: 'alarm', id: 'S1-alarm3', at: P(219.7, 2, 430), hp: 40, cableHp: 20, cableTo: P(219.7, 4, 436) },
    { kind: 'cache', id: 'S1-secretCache', at: P(70, 6, 424), gun: 'sniper', quality: 'legendary' },
    { kind: 'secret', id: 'S1-file1', at: P(150, 22, 445), tickets: 5, file: 1, name: 'Audit File 1' },
    ammo('AB1', 154, 0, 56, 'sniper', 8),
    ammo('AB2', 163, 0, 174, 'bullets', 60),
    ammo('AB3', 120, 2.5, 186, 'sniper', 8),
    ammo('AB4', 153, 0, 300, 'sniper', 8),
    ammo('AB5', 150, 14, 445, 'sniper', 8),
    ammo('AB6', 225, 4, 432, 'sniper', 8),
    ammo('AB7', 154, 0, 463, 'rockets', 3),
    ammo('AB8', 150, 0, 516, 'sniper', 8),
  ],
  encounters: [E1, E2, E3],
};
