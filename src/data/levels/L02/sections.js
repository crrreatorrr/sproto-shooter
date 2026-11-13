// L02 sections in local metres. Origins in index.js chain them and pin the
// boss section start at the hub's [149.5, 0, 11]. The route slots are the
// document's corridors; the cutter keeps that slot walkable.
import { AMMO, BOSS_HP, BOSS_SCRIPT, CARDS, CRATES } from './spec.js';
import {
  ammo, box, cone, cutRoute, cylinder, disc, door, floor, points, ramp, sphere, squad, wall, zone,
} from './author.js';

const card = (title, lines) => ({ title, lines });

function units(list) {
  const n = list.reduce((s, u) => s + u[1], 0);
  return { list, n };
}

function atFor(n, x, z, along) {
  return points(n, x, z, along, 1.4);
}

const S1_ROUTE = [
  { x0: 93, x1: 107, z0: 18, z1: 150 },
  { x0: 96, x1: 202, z0: 16, z1: 32 },
];

function s1() {
  const geometry = [
    floor('s1-ground', -35, 233, -33, 188),
    wall('s1-berm-w', 58, 60, 100, 148, 6, 'sand'),
    wall('s1-berm-e', 140, 142, 100, 148, 6, 'sand'),
    wall('s1-berm-s', 60, 140, 148, 150, 6, 'sand'),
    box('s1-tent1', [5, 3, 5], [74, 1.5, 112], 'wood'),
    box('s1-tent2', [5, 3, 5], [126, 1.5, 110], 'wood'),
    box('s1-tent3', [5, 3, 5], [84, 1.5, 138], 'wood'),
    cylinder('s1-fire', 1.2, 0.5, [100, 0, 118], 'stone'),
    box('s1-cart', [3, 1.4, 1.6], [112, 0.7, 122], 'wood'),
    box('s1-low-a', [6, 1.2, 1], [88, 0.6, 108], 'stone'),
    box('s1-low-b', [6, 1.2, 1], [112, 0.6, 108], 'stone'),
    wall('s1-souk-w', 60, 93, 98, 100, 7),
    wall('s1-souk-e', 107, 140, 98, 100, 7),
    box('s1-lintel', [14, 2, 2], [100, 6, 99], 'trim'),
    wall('s1-block-a', 79, 93, 67, 93, 4),
    wall('s1-block-b', 107, 121, 67, 93, 4),
    wall('s1-block-w', 55, 75, 44, 98, 8),
    wall('s1-block-e', 125, 145, 44, 98, 8),
    cylinder('s1-well', 1.5, 1.2, [100, 0, 53], 'stone'),
    wall('s1-sq-n-w', 75, 93, 42, 44, 7),
    wall('s1-sq-n-e', 107, 125, 42, 44, 7),
    box('s1-shrine', [2, 2.2, 2], [100, 1.1, 14], 'neon'),
    wall('s1-shrine-n', 88, 112, 12, 14, 7),
    wall('s1-shrine-s-w', 88, 96, 30, 32, 7),
    wall('s1-shrine-s-e', 104, 112, 30, 32, 7),
    wall('s1-pass-n', 114, 150, 14, 16, 7),
    wall('s1-pass-s', 114, 150, 32, 34, 7),
    box('s1-canopy', [35, 0.5, 18], [131.5, 7.25, 24], 'wood'),
    disc('s1-line', 2, [120, 0.05, 22]),
    // Dyers' Court spans 44 × 64 metres, with a 16-metre gate lane.
    wall('s1-dye-w-n', 150, 152, -8, 16, 7),
    wall('s1-dye-w-s', 150, 152, 32, 56, 7),
    wall('s1-dye-e-n', 194, 196, -8, 16, 7),
    wall('s1-dye-e-s', 194, 196, 32, 56, 7),
    wall('s1-dye-n', 152, 194, -8, -6, 7),
    wall('s1-dye-s', 152, 194, 54, 56, 7),
    box('s1-dye-plat', [6, 2, 10], [181, 1, 24], 'wood'),
    cylinder('s1-vat-1', 2, 1.2, [162, 0, 12], 'stone'),
    cylinder('s1-vat-2', 2, 1.2, [173, 0, 12], 'stone'),
    cylinder('s1-vat-3', 2, 1.2, [184, 0, 12], 'stone'),
    cylinder('s1-vat-4', 2, 1.2, [162, 0, 36], 'stone'),
    cylinder('s1-vat-5', 2, 1.2, [173, 0, 36], 'stone'),
    cylinder('s1-vat-6', 2, 1.2, [184, 0, 36], 'stone'),
    box('s1-rack-1', [6, 2, 0.6], [158, 1, 30], 'wood'),
    box('s1-rack-2', [6, 2, 0.6], [188, 1, 16], 'wood'),
    sphere('s1-bonk-roll', 0.8, [118.5, 6, 80], 'gold'),
  ];
  const e1 = units([['midget', 3], ['obama', 1], ['midget', 1], ['boomMidget', 1], ['midget', 2], ['boomMidget', 1]]);
  const e2 = units([['riotMidget', 2], ['midget', 3], ['obama', 2], ['midget', 3]]);
  const e3 = units([['riotMidget', 3], ['obama', 2], ['midget', 7], ['riotMidget', 1], ['boomMidget', 2], ['midget', 3], ['boomMidget', 4], ['midget', 3]]);
  return {
    id: 'S1', name: 'Caravan Camp and Souk Alleys', designId: 'S1',
    origin: [-614.5, 0, -181],
    start: [100, 0, 144], yaw: 0,
    intro: card(CARDS.start.title, CARDS.start.lines),
    flyerVolume: { min: [151, 0, -8], max: [195, 7, 56] },
    exit: zone(192, 202, 16, 32),
    grappleAnchors: [
      { id: 's1-arch', at: [100, 5.2, 96], r: 1.6 },
      { id: 's1-roll', at: [118.5, 6.3, 80], r: 1.8 },
      { id: 's1-roof', at: [100, 5.2, 74], r: 1.4 },
    ],
    rooms: { L1: { x0: 151, x1: 195, z0: -8, z1: 56 } },
    geometry: cutRoute(geometry, S1_ROUTE),
    weapons: [
      { id: 'rack-sg-arch', at: [104, 0, 96], gun: 'shotgun', why: 'E2 Shield Wall and L1 Dyers Court, 4 to 5 m alleys' },
    ],
    checkpoints: [
      { id: 'cp1', at: [100, 0, 140], when: null },
      { id: 'cp2', at: [100, 0, 22], when: null },
      { id: 'cp3', at: [186, 0, 24], when: 'S1-E3.cleared' },
    ],
    mechanisms: [
      { kind: 'shrine', id: 'shrine-chainzap', at: [100, 0, 14], spell: 'chainZap' },
      { kind: 'switch', id: 'C1', at: [100, 0, 24], opens: 'dyersGate', needsHold: false, touchRadius: 8, designAt: [111.5, 0, 17] },
      door('dyersGate', [113.6, 3.5, 24], [0.8, 7, 16]),
      door('caravanGate', [196, 3.5, 24], [0.8, 7, 16]),
      { kind: 'barrel', id: 'pot1', at: [92, 0, 110], element: 'fire', hp: 30 },
      { kind: 'barrel', id: 'pot4', at: [134, 0, 20], element: 'shock', hp: 30 },
      { kind: 'barrel', id: 'pot5', at: [142, 0, 28], element: 'shock', hp: 30 },
      { kind: 'barrel', id: 'pot6', at: [166, 0, 16], element: 'fire', hp: 30 },
      { kind: 'secret', id: 'secret-confetti', at: [108, 0, 130], modifier: 'confetti' },
      { kind: 'secret', id: 'af1', at: [84, 0, 130], tickets: 5, text: 'Invoice 0001: one (1) city gate, rug included' },
      { kind: 'chest', id: 'chest-L1', at: [186, 0, 20], gun: 'shotgun', opens: 'S1-E3.cleared' },
      ...placeAmmo('S1'),
      ...placeCrates('S1'),
    ],
    encounters: [
      {
        id: 'S1-E1', name: 'Caravan Camp', maxAlive: 8,
        objective: { kind: 'clearAll' },
        activate: zone(70, 140, 100, 150),
        squads: [
          squad('1a', { type: 'onEnter' }, 'placed', [['midget', 3], ['obama', 1]], atFor(4, 100, 120, 'x'), [[100, 0, 118], [112, 0, 122]]),
          squad('1b', { type: 'onKills', n: 2 }, 'door', [['midget', 1]], atFor(1, 100, 116), [[76, 0, 112]]),
          squad('1c', { type: 'onRemain', n: 0 }, 'door', [['boomMidget', 1]], atFor(1, 100, 108), [[100, 0, 99]]),
          squad('1d', { type: 'with', after: '1c', delay: 2 }, 'door', [['midget', 2], ['boomMidget', 1]], atFor(3, 100, 104), [[100, 0, 99]]),
        ],
      },
      {
        id: 'S1-E2', name: 'Shield Wall', maxAlive: 8,
        objective: { kind: 'clearAll' },
        activate: zone(90, 112, 40, 98),
        squads: [
          squad('2a', { type: 'onEnter' }, 'door', [['riotMidget', 2]], atFor(2, 100, 78, 'z'), [[100, 0, 60]]),
          squad('2b', { type: 'time', t: 6 }, 'door', [['midget', 3]], atFor(3, 100, 70), [[80, 0, 78]]),
          squad('2c', { type: 'onKills', n: 3 }, 'hidden', [['obama', 2]], atFor(2, 100, 62), [[97, 4, 78], [103, 4, 86]]),
          squad('2d', { type: 'onRemain', n: 2 }, 'door', [['midget', 3]], atFor(3, 100, 54), [[120, 0, 72]]),
        ],
      },
      {
        id: 'S1-E3', name: 'Dyers Court', maxAlive: 10,
        objective: { kind: 'clearAll' },
        activate: zone(93, 107, 15, 33),
        lockdown: {
          entry: 'dyersGate', exit: 'caravanGate',
          threshold: zone(116, 124, 16, 32),
          room: { min: [112, -1, -8], max: [198, 8, 56] },
          waves: 4, waveSec: 25, stallSec: 12,
        },
        squads: [
          squad('w1', { type: 'onEnter' }, 'placed', [['riotMidget', 3], ['obama', 2]], atFor(5, 160, 24), [[146, 0, 22], [181, 2, 24]]),
          squad('w2', { type: 'onRemain', n: 2 }, 'door', [['midget', 7]], atFor(7, 170, 24), [[168, 0, 8], [168, 0, 40]]),
          squad('w3', { type: 'onRemain', n: 2 }, 'door', [['riotMidget', 1], ['boomMidget', 2], ['midget', 3]], atFor(6, 180, 24), [[190, 0, 36]]),
          squad('w4', { type: 'onRemain', n: 2 }, 'door', [['boomMidget', 4], ['midget', 3]], atFor(7, 176, 24), [[168, 0, 40], [190, 0, 36]]),
        ],
      },
    ],
    counts: { e1: e1.n, e2: e2.n, e3: e3.n },
  };
}

const S2_ROUTE = [{ x0: 6, x1: 298, z0: 88, z1: 108 }];

function s2() {
  const geometry = [
    floor('s2-ground', -40, 336, -35, 235),
    wall('s2-cliff-n', 0, 290, 0, 4, 8, 'rock'),
    wall('s2-cliff-s', 0, 290, 196, 200, 8, 'rock'),
    // The rock shelves flank the wider floor of the Caravanserai.
    wall('s2-shelf-n', 198, 290, 49, 68, 6, 'rock'),
    wall('s2-shelf-s', 198, 290, 128, 147, 6, 'rock'),
    disc('s2-road', 1.2, [16, 0.05, 98], 'stone'),
    disc('s2-road-b', 1.2, [80, 0.05, 98], 'stone'),
    disc('s2-road-c', 1.2, [140, 0.05, 98], 'stone'),
    // High Caravanserai, 56 × 60 metres with two 20-metre gates.
    wall('s2-serai-w-n', 203, 205, 68, 88, 6),
    wall('s2-serai-w-s', 203, 205, 108, 128, 6),
    wall('s2-serai-e-n', 259, 261, 68, 88, 6),
    wall('s2-serai-e-s', 259, 261, 108, 128, 6),
    wall('s2-serai-n', 205, 259, 68, 70, 6),
    wall('s2-serai-s', 205, 259, 126, 128, 6),
    box('s2-gallery', [30, 3, 5], [232, 1.5, 77], 'stone'),
    cylinder('s2-well', 1.5, 1.2, [226, 0, 110], 'stone'),
    cylinder('s2-stub-1', 0.6, 1.2, [214, 0, 90], 'pillar'),
    cylinder('s2-stub-2', 0.6, 1.2, [238, 0, 90], 'pillar'),
    disc('s2-line', 4, [210, 0.05, 98]),
    // Optional downhill slide south of the firm road. The road at z 98 stays flat.
    ramp('s2-slide', [8, 4, 70], [90, 2, 112], 270, 'sand'),
    box('s2-teeth-1', [10, 2, 1], [130, 1, 90], 'stone'),
    box('s2-teeth-2', [8, 1.2, 1], [142, 0.6, 108], 'stone'),
    cone('s2-rib', 0.4, 2.5, [180, 0, 108], 'stone'),
    sphere('s2-cache-mark', 0.8, [136, 0.8, 172], 'hedge'),
  ];
  return {
    id: 'S2', name: 'Dune Sea', designId: 'S2',
    origin: [-430.5, 0, -257],
    start: [12, 0, 98], yaw: 0,
    intro: card(CARDS.dunes.title, CARDS.dunes.lines),
    flyerVolume: { min: [204, 0, 68], max: [260, 8, 128] },
    exit: zone(280, 296, 87, 109),
    grappleAnchors: [
      { id: 's2-arch', at: [143, 7.5, 92], r: 2 },
      { id: 's2-shelf', at: [201, 8, 98], r: 2.2 },
    ],
    rooms: { L2: { x0: 204, x1: 260, z0: 68, z1: 128 } },
    hazards: [
      { id: 'Q1', kind: 'slow', min: [60, -1, 86], max: [90, 3, 116], speed: 0.5, dps: 0, navCost: 4 },
      { id: 'Q2', kind: 'slow', min: [108, -1, 86], max: [122, 3, 112], speed: 0.5, dps: 0, navCost: 4 },
    ],
    geysers: [
      { id: 'G0', at: [143, 0, 96], period: 6, damage: 0, to: [143, 7.5, 92] },
      { id: 'G1', at: [170, 0, 90], period: 5, offset: 0, damage: 15 },
      { id: 'G2', at: [176, 0, 108], period: 5, offset: 1.5, damage: 15 },
      { id: 'G3', at: [184, 0, 94], period: 5, offset: 3, damage: 15 },
      { id: 'G4', at: [190, 0, 106], period: 5, offset: 0.5, damage: 15 },
      { id: 'G5', at: [195, 0, 98], period: 4, damage: 0, to: [201, 9, 98] },
    ],
    geometry: cutRoute(geometry, S2_ROUTE),
    weapons: [
      { id: 'standee-sg-2', at: [264, 0, 104], gun: 'shotgun', why: 'second shotgun past L2' },
    ],
    checkpoints: [
      { id: 'cp4', at: [200, 0, 98] },
      { id: 'cp5', at: [266, 0, 98], when: 'S2-E5.cleared' },
    ],
    mechanisms: [
      door('seraiGateW', [204, 3, 98], [0.8, 6, 20]),
      door('seraiGateE', [260, 3, 98], [0.8, 6, 20]),
      { kind: 'chest', id: 'chest-L2', at: [242, 0, 98], gun: 'shotgun', opens: 'S2-E5.cleared' },
      { kind: 'chest', id: 'cache-secret', at: [136, 0, 172], gun: 'shotgun', tier: 'rare', opens: null },
      { kind: 'secret', id: 'af2', at: [143, 0, 92], tickets: 5, text: 'Shipping manifest: 400 rugs, 0 rugs delivered' },
      { kind: 'depot', id: 'depot-1', at: [273, 0, 92] },
      ...placeAmmo('S2'),
      ...placeCrates('S2'),
    ],
    encounters: [
      {
        id: 'S2-E4', name: 'Boom Dunes', maxAlive: 10,
        objective: { kind: 'clearAll' },
        activate: zone(16, 170, 73, 123),
        squads: [
          squad('4a', { type: 'onEnter' }, 'hidden', [['boomMidget', 3]], atFor(3, 40, 98), [[50, 0, 100]]),
          squad('4b', { type: 'onKills', n: 2 }, 'hidden', [['boomMidget', 1], ['midget', 2]], atFor(3, 70, 98), [[88, 0, 62]]),
          squad('4c', { type: 'onKills', n: 5 }, 'placed', [['obama', 2]], atFor(2, 110, 98), [[150, 0, 86]]),
          squad('4d', { type: 'onKills', n: 6 }, 'hidden', [['boomMidget', 2], ['midget', 2]], atFor(4, 140, 98), [[120, 0, 140]]),
        ],
      },
      {
        id: 'S2-E5', name: 'High Caravanserai', maxAlive: 10,
        objective: { kind: 'clearAll' },
        activate: zone(200, 260, 69, 127),
        lockdown: {
          entry: 'seraiGateW', exit: 'seraiGateE',
          threshold: zone(206, 214, 88, 108),
          room: { min: [204, -1, 68], max: [260, 8, 128] },
          waves: 4, waveSec: 25, stallSec: 12,
        },
        squads: [
          squad('w1', { type: 'onEnter' }, 'placed', [['hexAcolyte', 1], ['obama', 2]], atFor(3, 226, 98), [[226, 0, 98], [236, 0, 92]]),
          squad('w2', { type: 'onRemain', n: 2 }, 'door', [['midget', 7]], atFor(7, 220, 98), [[226, 0, 119]]),
          squad('w3', { type: 'onRemain', n: 2 }, 'air', [['flyingMidget', 3], ['midget', 4]], atFor(7, 230, 98), [[204, 2, 86]]),
          squad('w4', { type: 'onRemain', n: 2 }, 'door', [['hexAcolyte', 1], ['boomMidget', 4], ['midget', 3]], atFor(8, 224, 98), [[226, 0, 77]]),
        ],
      },
    ],
  };
}

const S3_ROUTE = [{ x0: 0, x1: 225, z0: 66, z1: 94 }];

function s3() {
  const geometry = [
    floor('s3-ground', -65, 280, -54, 209),
    wall('s3-mass-n', 10, 90, 0, 40, 8, 'rock'),
    wall('s3-mass-s', 10, 86, 110, 160, 8, 'rock'),
    box('s3-tower', [8, 6, 8], [40, 3, 40], 'stone'),
    ramp('s3-tower-ramp', [8, 6, 12], [40, 3, 52], 180, 'stone'),
    box('s3-ledge-a', [10, 1, 18], [115, 3, 45], 'stone'),
    box('s3-ledge-b', [8, 1, 18], [116, 1, 110], 'stone'),
    cylinder('s3-needle', 6, 1, [120, 0, 140], 'rock'),
    box('s3-dock-e', [16, 1, 10], [170, 0.5, 120], 'wood'),
    cone('s3-spire', 3, 8, [100, 0, 20], 'rock'),
    // Walkable span where the canyon would be a hole. The kill plane is data
    // until void rescue copies onto the sim.
    box('s3-canyon-span', [70, 0.5, 36], [120, -0.25, 80], 'sand', { keep: true }),
  ];
  return {
    id: 'S3', name: 'Canyon Rim', designId: 'S3',
    origin: [-146.5, 0, -239],
    start: [4, 0, 80], yaw: 0,
    exit: zone(206, 225, 67, 93),
    grappleAnchors: [
      { id: 's3-tower', at: [40, 7, 40], r: 2 },
      { id: 's3-ledge', at: [115, 4.5, 45], r: 2 },
      { id: 's3-needle', at: [120, 6, 140], r: 2.4 },
    ],
    voidRescue: { y: -20, penalty: 0.25, design: true },
    carpets: [
      { id: 'carpetC1', from: [98, 0, 150], to: [112, 0, 141], speed: 3, mode: 'pingpong', pause: 2.5 },
      { id: 'carpetC2', from: [128, 0, 139], to: [142, 0, 127], speed: 3.5, mode: 'pingpong', pause: 2.5 },
      { id: 'carpetC3', from: [162, 0, 114], to: [196, 4, 112], speed: 5, mode: 'onTrigger' },
    ],
    geometry: cutRoute(geometry, S3_ROUTE),
    weapons: [
      { id: 'rack-sn-tower', at: [40, 0, 70], gun: 'sniper', why: 'E6 far ledges, 77 to 83 m' },
    ],
    checkpoints: [{ id: 'cp6', at: [88, 0, 80], when: 'S3-E6.cleared' }],
    mechanisms: [
      door('rimGate', [88, 2.5, 80], [1, 5, 4]),
      { kind: 'barrel', id: 'pot8', at: [70, 0, 90], element: 'fire', hp: 30 },
      ...placeAmmo('S3'),
    ],
    encounters: [
      {
        id: 'S3-E6', name: 'Far Ledge', maxAlive: 7,
        objective: { kind: 'clearAll' },
        activate: zone(8, 100, 66, 94),
        squads: [
          squad('6a', { type: 'onEnter' }, 'placed', [['obama', 2]], atFor(2, 55, 80), [[112, 3, 45]]),
          squad('6b', { type: 'onKills', n: 1 }, 'door', [['obama', 1], ['hexAcolyte', 1]], atFor(2, 62, 80), [[119, 3, 45]]),
          squad('6c', { type: 'onKills', n: 3 }, 'door', [['robotLaser', 2]], atFor(2, 70, 80), [[119, 0, 95]]),
          squad('6d', { type: 'onRemain', n: 1 }, 'door', [['robotShooter', 1]], atFor(1, 78, 80), [[119, 0, 95]]),
        ],
      },
      {
        id: 'S3-E7', name: 'Narrows and Carpets', maxAlive: 8,
        objective: { kind: 'clearAll' },
        activate: zone(100, 210, 66, 94),
        squads: [
          squad('7a', { type: 'onEnter' }, 'door', [['midget', 2], ['boomMidget', 2]], atFor(4, 130, 80), [[88, 0, 118]]),
          squad('7b', { type: 'onKills', n: 2 }, 'air', [['flyingMidget', 2]], atFor(2, 145, 80), [[100, 3, 150]]),
          squad('7c', { type: 'onKills', n: 4 }, 'burrow', [['midget', 2]], atFor(2, 160, 80), [[120, 0, 140]]),
          squad('7d', { type: 'onKills', n: 6 }, 'placed', [['obama', 2]], atFor(2, 175, 80), [[156, 0, 126]]),
        ],
      },
    ],
  };
}

const SM_ROUTE = [
  { x0: 2, x1: 102, z0: 50, z1: 70 },
  { x0: 81, x1: 99, z0: 54, z1: 236 },
];

function sm() {
  const geometry = [
    floor('sm-ground', -53, 185, -42, 277),
    box('sm-r1', [24, 0.5, 20], [14, 4.2, 16], 'stone'),
    box('sm-r2', [26, 0.5, 22], [47, 4.2, 15], 'stone'),
    box('sm-r3', [22, 0.5, 24], [47, 4.2, 44], 'stone'),
    box('sm-m1', [28, 0.5, 26], [78, 7.2, 43], 'stone'),
    box('sm-m2', [28, 0.5, 24], [80, 7.2, 88], 'stone'),
    box('sm-h1', [24, 0.5, 26], [112, 10.2, 87], 'stone'),
    cylinder('sm-minaret', 3, 12, [118, 10, 80], 'stone'),
    cone('sm-minaret-cap', 3.5, 5, [118, 22, 80], 'gold'),
    wall('sm-sq-w', 44, 46, 162, 212, 8),
    wall('sm-sq-e', 134, 136, 162, 212, 8),
    wall('sm-sq-n-w', 46, 81, 160, 162, 8),
    wall('sm-sq-n-e', 99, 134, 160, 162, 8),
    wall('sm-gate-w', 46, 81, 212, 216, 8),
    wall('sm-gate-e', 99, 134, 212, 216, 8),
    cylinder('sm-fountain', 3, 1.2, [119, 0, 199], 'stone'),
    box('sm-guard-w', [10, 5, 14], [66, 2.5, 187], 'stone'),
    box('sm-guard-e', [10, 5, 14], [114, 2.5, 187], 'stone'),
    cylinder('sm-tank', 1.5, 2, [14, 5, 50], 'metal'),
    box('sm-f1', [26, 0.5, 24], [17, 5.2, 46], 'stone'),
    // Slide beside the street, high at the north, low at the gate. The street itself stays flat.
    ramp('sm-slide', [6, 8, 80], [108, 4, 140], 180, 'wood'),
  ];
  return {
    id: 'SM', name: 'Rooftop Market and Bazaar Gate', designId: 'S4',
    origin: [59.5, 0, -219],
    start: [8, 0, 60], yaw: 0,
    exit: zone(81, 99, 222, 236),
    grappleAnchors: [
      { id: 'sm-minaret', at: [118, 18, 80], r: 2.2 },
      { id: 'sm-crane', at: [80, 13, 88], r: 1.8 },
      { id: 'sm-gate', at: [90, 11, 214], r: 2 },
    ],
    links: [
      { id: 'C2', kind: 'conduit', at: [57, 4, 44], powers: 'L1' },
      { id: 'L1', kind: 'mover', from: [61, 4, 44], to: [61, 7, 44], speed: 2, mode: 'onTrigger' },
      { id: 'Z1', kind: 'zipline', from: [78, 9.5, 55], to: [80, 8.5, 77], speed: 16 },
      { id: 'Z2', kind: 'zipline', from: [112, 12.5, 99], to: [92, 4.5, 146], speed: 16 },
      { id: 'J1', kind: 'jumpPad', at: [91, 7, 90], to: [104, 10, 86], apex: 13 },
      { id: 'J2', kind: 'jumpPad', at: [110, 10, 94], to: [116, 16.5, 83], apex: 19 },
    ],
    geometry: cutRoute(geometry, SM_ROUTE),
    weapons: [],
    checkpoints: [
      { id: 'cp7', at: [8, 0, 60] },
      { id: 'cp8', at: [90, 0, 150] },
      { id: 'cp9', at: [90, 0, 220], when: 'SM-E9.cleared' },
    ],
    mechanisms: [
      { kind: 'secret', id: 'mana-battery', at: [12, 5, 50], mana: 10, manaRegen: 0.5 },
      { kind: 'secret', id: 'af3', at: [118, 0, 80], tickets: 5, text: 'Warranty terms: void where prohibited, and over the void' },
      { kind: 'power', id: 'os-1', at: [108, 0, 80], modifier: 'overshield' },
      { kind: 'switch', id: 'C2', at: [70, 0, 60], needsHold: false },
      { kind: 'barrel', id: 'pot9', at: [40, 0, 70], element: 'goo', hp: 30 },
      { kind: 'barrel', id: 'pot15', at: [80, 0, 190], element: 'fire', hp: 30 },
      { kind: 'depot', id: 'depot-2', at: [80, 0, 226] },
      door('bazaarGate', [90, 3.5, 214], [18, 7, 1.2]),
      door('vaultDoor', [90, 3, 234], [18, 6, 1.2]),
      ...placeAmmo('SM'),
      ...placeCrates('SM'),
    ],
    encounters: [
      {
        id: 'SM-E8', name: 'Rooftop Market', maxAlive: 10,
        objective: { kind: 'clearAll' },
        activate: zone(10, 100, 47, 73),
        squads: [
          squad('8a', { type: 'onEnter' }, 'door', [['midget', 5]], atFor(5, 40, 60), [[47, 4, 15], [47, 4, 44]]),
          squad('8b', { type: 'time', t: 8 }, 'hidden', [['boomMidget', 2]], atFor(2, 55, 60), [[44, 4, 16]]),
          squad('8c', { type: 'onKills', n: 5 }, 'hidden', [['obama', 2]], atFor(2, 70, 60), [[64, 7, 43]]),
          squad('8d', { type: 'onKills', n: 7 }, 'door', [['riotMidget', 2], ['hexAcolyte', 1]], atFor(3, 85, 60), [[89, 7, 33]]),
        ],
      },
      {
        id: 'SM-E9', name: 'Bazaar Gate', maxAlive: 10,
        objective: { kind: 'clearAll' },
        destroy: ['loom-1', 'loom-2'],
        activate: zone(46, 134, 162, 210),
        squads: [
          squad('9a', { type: 'onEnter' }, 'drop', [['midget', 4]], atFor(4, 90, 180), [[78, 0, 212], [102, 0, 212]]),
          squad('9b', { type: 'onRemain', n: 1 }, 'door', [['riotMidget', 2]], atFor(2, 90, 190), [[66, 0, 187]]),
          squad('9c', { type: 'onKills', n: 5 }, 'drop', [['boomMidget', 3]], atFor(3, 90, 196), [[78, 0, 212]]),
          squad('9d', { type: 'onKills', n: 8 }, 'door', [['midget', 2]], atFor(2, 90, 204), [[114, 0, 187]]),
        ],
      },
    ],
  };
}

function s4() {
  const geometry = [
    // Wide sand so a multi-bar kite cannot walk off the floor.
    floor('s4-ground', -900, 900, -900, 900),
    // Low vault marks. Full-height walls were trapping the straight-line bot in corners.
    cone('s4-vault-n', 1.2, 1.6, [40, 0, 3], 'stone'),
    cone('s4-vault-w', 1.2, 1.6, [29, 0, 14], 'stone'),
    cone('s4-vault-e', 1.2, 1.6, [51, 0, 14], 'stone'),
    cone('s4-fac-nw', 2, 6, [22, 0, 40], 'stone'),
    cone('s4-fac-ne', 2, 6, [58, 0, 40], 'stone'),
    cone('s4-fac-s', 2, 6, [40, 0, 112], 'stone'),
    disc('s4-rug', 7, [40, 0.05, 70], 'gold'),
    disc('s4-line', 3, [40, 0.05, 48]),
    // Cones, not columns: a solid pillar here pushes the five-bar replay over the verifier's time budget.
    cone('s4-pil-1', 0.7, 2, [28, 0, 66], 'pillar'),
    cone('s4-pil-2', 0.7, 2, [52, 0, 66], 'pillar'),
    cone('s4-pil-3', 0.7, 2, [34, 0, 88], 'pillar'),
    cone('s4-pil-4', 0.7, 2, [46, 0, 88], 'pillar'),
    box('s4-pile-1', [3, 1.2, 1.5], [32, 0.6, 58], 'trim'),
    box('s4-pile-2', [3, 1.2, 1.5], [48, 0.6, 58], 'trim'),
    cone('s4-balcony', 4, 9, [40, 0, 105], 'stone'),
    cone('s4-balcony-roof', 4.5, 4, [40, 13, 105], 'gold'),
  ];
  const route = [
    { x0: 36, x1: 44, z0: 2, z1: 120 },
  ];
  return {
    id: 'S4', name: "Sahil's Showroom", designId: 'SB',
    origin: [109.5, 0, 5],
    start: [40, 0, 6], yaw: 0,
    intro: card(CARDS.boss.title, CARDS.boss.lines),
    flyerVolume: { min: [8, 0, 38], max: [72, 14, 102] },
    grappleAnchors: [
      { id: 'sb-balcony', at: [40, 14, 105], r: 2.4 },
      { id: 'sb-facade', at: [40, 8, 39], r: 1.8 },
    ],
    exit: null,
    rooms: { L3: { d: 56, center: [40, 0, 70], ring: [27.8, 26.8, 25.5] } },
    bossScript: BOSS_SCRIPT,
    geometry: cutRoute(geometry, route),
    weapons: [
      { id: 'rack-bz-vault', at: [45, 0, 12], gun: 'bazooka', why: 'SB-BOSS looms, pylons and add clumps' },
    ],
    checkpoints: [{ id: 'cp10', at: [40, 0, 6] }],
    mechanisms: [
      door('ringGate', [40, 3, 41], [6, 6, 0.8]),
      door('vaultGate', [40, 2.5, 25], [4, 5, 0.8]),
      { kind: 'barrel', id: 'pot19', at: [56, 0, 66], element: 'shock', hp: 30 },
      { kind: 'barrel', id: 'pot20', at: [24, 0, 74], element: 'shock', hp: 30 },
      { kind: 'barrel', id: 'pot21', at: [55, 0, 84], element: 'fire', hp: 30 },
      { kind: 'barrel', id: 'pot22', at: [25, 0, 84], element: 'fire', hp: 30 },
      ...placeAmmo('S4'),
      ...placeCrates('S4'),
    ],
    encounters: [
      {
        id: 'S4-E4', name: 'SB-BOSS', designId: 'SB-BOSS', maxAlive: 10,
        objective: { kind: 'boss' },
        // Includes the vault start so Sahil exists before the walker picks a direction.
        activate: zone(10, 70, 0, 108),
        lockdown: {
          entry: 'ringGate', exit: null,
          threshold: zone(34, 46, 78, 88),
          room: { min: [8, -1, 0], max: [72, 16, 110] },
          waves: 5, waveSec: 25, stallSec: 12, noExit: true,
        },
        script: BOSS_SCRIPT,
        hp: BOSS_HP,
        squads: [
          squad('sahil', { type: 'onEnter' }, 'placed', [['sahil', 1]], [[40, 0, 70]], [[40, 0, 70]]),
        ],
      },
    ],
  };
}

function placeAmmo(section) {
  return AMMO.filter((row) => row[3] === section).map(([id, ammoType, amount, , at]) => (
    ammo(id, nudge(section, at), ammoType, amount)
  ));
}

function placeCrates(section) {
  return CRATES.filter((c) => c.section === section).map((c) => ({
    kind: 'ammo',
    id: c.id,
    at: nudge(section, c.at),
    ammoType: 'bullets',
    amount: c.kind === 'depotCrate' ? 480 : 240,
    crate: c.kind,
    uses: c.uses,
    designAt: c.at,
  }));
}

function nudge(section, at) {
  const on = {
    S1: [100, 0, 24],
    S2: [220, 0, 98],
    S3: [40, 0, 80],
    SM: [90, 0, 60],
    S4: [40, 0, 20],
  };
  const spot = on[section] || [at[0], 0, at[2]];
  const k = (at[0] + at[2]) % 7;
  return [spot[0] + (k - 3) * 0.4, 0, spot[2] + ((at[0] % 5) - 2) * 0.3];
}

export function buildSections() {
  return [s1(), s2(), s3(), sm(), s4()];
}
