// L01 Sproto Landing. Format v2. Coordinates are local to each section.
// The boulevard, mall, roof and plaza are playable floors with the design's
// encounters, lockdowns and finale. Prop dressing that is not on the route
// (cars, bins, planters and kiosks) is drawn by the cartoon kit: src/render/level/dressing.js.
import { box, cone, cylinder, disc, ramp, sphere } from '../kit.js';
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';

const card = (title, lines) => ({ title, lines });

function floor(id, length, width = 28) {
  return box({ id, at: [length / 2, -0.25, 16], size: [length, 0.5, width], mat: 'concrete' });
}

function zone(x0, x1, z0 = 4, z1 = 28) {
  return { min: [x0, -2, z0], max: [x1, 8, z1] };
}

function squad(id, trigger, units, at, method = 'placed') {
  return {
    id,
    trigger,
    method,
    at,
    units: units.map(([type, count, partId]) => (partId ? { type, count, partId } : { type, count })),
  };
}

// Cover the player and the enemies both use. Sizes match the kit models that are drawn over them.
const carAt = (id, x, z) => box({ id, at: [x, 0.7, z], size: [3, 1.4, 1.6], mat: 'metal' });
const binAt = (id, x, z) => box({ id, at: [x, 0.7, z], size: [2.4, 1.4, 1.4], mat: 'metal' });
const planterAt = (id, x, z) => box({ id, at: [x, 0.6, z], size: [1.6, 1.2, 1.6], mat: 'stone' });

// The street is lined with shopfronts, so its sides are solid. `gapS` leaves the south side open
// between two x values (the Overpass stair leaves the deck there). The Overpass has rails instead:
// low enough to vault, and past them is the drop.
function sides(id, length, { h = 6, gapS = null, width = 28 } = {}) {
  const edge = h < 2 ? 0.3 : 0.6;
  const z = [16 - width / 2 - edge, 16 + width / 2 + edge];
  const w = h < 2 ? 0.5 : 0.8;
  const wall = (tag, x0, x1, zz) => box({ id: `${id}-side-${tag}`, at: [(x0 + x1) / 2, h / 2, zz], size: [x1 - x0, h, w], mat: 'concrete' });
  const south = gapS ? [wall('s1', 0, gapS[0], z[1]), wall('s2', gapS[1], length, z[1])] : [wall('s', 0, length, z[1])];
  return [wall('n', 0, length, z[0]), ...south];
}

function ammo(id, at, ammoType = 'bullets', amount = 60) {
  return { kind: 'ammo', id, at, ammoType, amount };
}

function door(id, at, span = 32) {
  return { kind: 'door', id, at, size: [1.2, 4, span] };
}

const MALL_WIDTH = 42;
const GARAGE_WIDTH = 38;
const PLAZA_WIDTH = 48;
const lane = (length, width) => ({ min: [0, 16 - width / 2], max: [length, 16 + width / 2] });
const laneZone = (x0, x1, width) => zone(x0, x1, 16 - width / 2, 16 + width / 2);
const airspace = (length, width, height, start = 0) => ({
  min: [start, 0, 16 - width / 2], max: [length, height, 16 + width / 2],
});

const S1 = {
  id: 'S1', name: 'Drop Zone', origin: [0, 0, 0], start: [8, 0, 10], yaw: -Math.PI / 2,
  // North lane (z 10) is the lesson. South of z 12 the road is flat, so a walk
  // with an empty stamina bar still reaches every fight.
  intro: card('SPROTO LANDING', [
    'Los Angeles. Dusk.',
    'The Bitcoin Tax Empire has shut the city gate.',
    'You have one machine gun and a bad attitude.',
    'Sprint the lane. Slide under the truck. Hook the gold ring, then let go.',
  ]),
  grappleAnchors: [{ id: 'S1-hook', at: [30, 5.6, 10], r: 2.2 }],
  navBounds: { min: [0, 2], max: [200, 30] },
  exit: zone(190, 200),
  geometry: [
    floor('S1-floor', 200),
    ...sides('S1', 200),
    box({ id: 'S1-truck', at: [62, 1.2, 8], size: [4, 2.4, 2.4], mat: 'metal' }),
    box({ id: 'S1-cover-a', at: [54, 0.7, 8], size: [2.4, 1.4, 1.4], mat: 'metal' }),
    box({ id: 'S1-cover-b', at: [54, 0.7, 24], size: [2.4, 1.4, 1.4], mat: 'metal' }),
    box({ id: 'S1-barricade', at: [150, 1.1, 8], size: [1.2, 2.2, 4], mat: 'metal' }),
    // Party cover (E1) and a second firing line at the barricade (E2). The middle of the road stays open.
    carAt('S1-car-a', 70, 22), carAt('S1-car-b', 77, 11),
    carAt('S1-car-c', 132, 20), binAt('S1-bin-c', 140, 10),
    box({ id: 'S1-barricade-s', at: [154, 1.1, 24], size: [1.2, 2.2, 4], mat: 'metal' }),
    sphere({ id: 'S1-tinubu', at: [40, 14, 48], r: 8, mat: 'gold' }),
    cone({ id: 'S1-tinubu-hat', at: [40, 22, 48], r: 5, h: 8, mat: 'gold' }),
    box({ id: 'S1-sign', at: [20, 6, -6], size: [14, 2, 0.6], mat: 'neon' }),
    // Sprint lane. Discs only: the bar on the HUD is the lesson, and walking
    // the same lane still reaches the truck.
    disc({ id: 'S1-sprint-a', at: [11, 0.06, 10], r: 1.15, mat: 'neon' }),
    disc({ id: 'S1-sprint-b', at: [13.5, 0.06, 10], r: 0.7, mat: 'neon' }),
    disc({ id: 'S1-sprint-c', at: [16, 0.06, 10], r: 0.7, mat: 'neon' }),
    cylinder({ id: 'S1-lane-n', at: [12, 0, 7.2], r: 0.35, h: 1.2, mat: 'neon' }),
    cylinder({ id: 'S1-lane-s', at: [12, 0, 12.8], r: 0.35, h: 1.2, mat: 'neon' }),
    // Slide truck. Underside y 1.15 blocks a standing body (1.8) and lets a
    // slide (height 1.0) through. South of z 11.4 the road is open.
    box({ id: 'S1-slide-body', at: [20, 2.25, 7.2], size: [4.2, 2.2, 8.4], mat: 'metal' }),
    box({ id: 'S1-slide-cab', at: [20, 0.55, 3.8], size: [4.2, 1.1, 1.6], mat: 'metal' }),
    disc({ id: 'S1-slide-pad', at: [16.2, 0.06, 10], r: 1.15, mat: 'neon' }),
    disc({ id: 'S1-walk-pad', at: [20, 0.06, 18], r: 0.85, mat: 'neon' }),
    // First hook. Hold the ring for about a third of a second, then let go.
    // The pull stays on you and throws you over the wall toward the party.
    // The south road walks around it, and an empty stamina bar still can.
    box({ id: 'S1-hook-wall', at: [30, 2, 7.8], size: [1.2, 4, 9.6], mat: 'concrete' }),
    cylinder({ id: 'S1-hook-post-n', at: [30, 4, 8.4], r: 0.3, h: 2.6, mat: 'gold' }),
    cylinder({ id: 'S1-hook-post-s', at: [30, 4, 11.6], r: 0.3, h: 2.6, mat: 'gold' }),
    box({ id: 'S1-hook-bar', at: [30, 6.45, 10], size: [0.6, 0.5, 3.8], mat: 'gold' }),
    sphere({ id: 'S1-hook-ring', at: [30, 5.6, 10], r: 0.55, mat: 'gold' }),
    disc({ id: 'S1-hook-pad', at: [25.2, 0.06, 10], r: 1.15, mat: 'neon' }),
  ],
  weapons: [],
  checkpoints: [
    { id: 'CP1', at: [96, 0, 16], when: 'S1-E1.cleared' },
    { id: 'CP2', at: [176, 0, 16], when: 'S1-E2.cleared' },
  ],
  mechanisms: [
    { kind: 'secret', id: 'S1-bonk', at: [12, 0.6, 22], modifier: 'bigHead' },
    { kind: 'secret', id: 'S1-file-1', at: [88, 0.4, 8], tickets: 5 },
    { kind: 'barrel', id: 'S1-brl-1', at: [58, 0.55, 14], element: 'fire' },
    { kind: 'barrel', id: 'S1-brl-2', at: [66, 0.55, 18], element: 'fire' },
    { kind: 'barrel', id: 'S1-brl-3', at: [156, 0.55, 16], element: 'fire' },
    { kind: 'switch', id: 'S1-sw-gate', at: [168, 0.5, 16], needsHold: true, holdTime: 1.5 },
    ammo('A1', [46, 0.4, 16]),
    ammo('A2', [70, 0.4, 14]),
    ammo('A3', [72, 0.4, 18]),
    ammo('A4', [100, 0.4, 16]),
    ammo('A5', [158, 0.4, 16]),
    disc({ id: 'S1-pad', at: [46, 0.05, 16], r: 1.2, mat: 'neon' }),
  ].filter((m) => m.kind),
  encounters: [
    {
      id: 'S1-E1', maxAlive: 6, noAmmoDrop: true,
      objective: { kind: 'clearAll' },
      activate: zone(48, 80),
      squads: [
        squad('A', { type: 'onEnter' }, [['midget', 4]], [[60, 0, 16]]),
        squad('B', { type: 'onKills', n: 2 }, [['midget', 2]], [[66, 0, 10]], 'door'),
        squad('C', { type: 'onKills', n: 5 }, [['midget', 3]], [[66, 0, 22]], 'door'),
      ],
    },
    {
      id: 'S1-E2', maxAlive: 6,
      objective: { kind: 'clearAll' },
      activate: zone(120, 175),
      squads: [
        squad('A', { type: 'onEnter' }, [['obama', 3]], [[150, 0, 12], [152, 0, 16], [150, 0, 20]]),
        squad('B', { type: 'onKills', n: 2 }, [['midget', 3]], [[140, 0, 24]], 'door'),
        squad('C', { type: 'onKills', n: 5 }, [['obama', 2]], [[146, 4, 8]], 'hidden'),
        // First Kamikaze Midgets. They start 20 m out on open road, so the fuse is seen before it is felt.
        squad('K', { type: 'onKills', n: 3 }, [['kamikazeMidget', 2]], [[126, 0, 14], [126, 0, 18]], 'door'),
      ],
    },
  ],
};

const S2 = {
  id: 'S2', name: 'Alley and Fire Escapes', origin: [185, 0, 0],
  navBounds: { min: [0, 2], max: [180, 30] },
  exit: zone(168, 180),
  // Crown of the north slide. The alley at z 16 stays flat.
  grappleAnchors: [{ id: 'S2-hook', at: [30, 4.6, 8], r: 1.8 }],
  geometry: [
    floor('S2-floor', 180),
    ...sides('S2', 180),
    box({ id: 'S2-alley-n', at: [40, 2, 4], size: [70, 4, 1], mat: 'concrete' }),
    box({ id: 'S2-alley-s', at: [40, 2, 28], size: [70, 4, 1], mat: 'concrete' }),
    cylinder({ id: 'S2-pillar', at: [78, 0, 12], r: 0.5, h: 4, mat: 'stone' }),
    box({ id: 'S2-tank', at: [130, 1.2, 16], size: [3, 2.4, 3], mat: 'metal' }),
    // Shrine court corners for the hold, and a car to duck the flyers behind.
    binAt('S2-bin-a', 88, 10), binAt('S2-bin-b', 88, 22), carAt('S2-car-a', 146, 21),
    // Walk up, or hook the crown and let go. Slide down the far side.
    ramp({ id: 'S2-slide-up', at: [22, 1.1, 8], size: [3.2, 2.2, 12], yaw: 90, mat: 'metal' }),
    box({ id: 'S2-slide-crown', at: [30, 1.95, 8], size: [4, 0.5, 3.2], mat: 'metal' }),
    ramp({ id: 'S2-slide-down', at: [38, 1.1, 8], size: [3.2, 2.2, 12], yaw: 270, mat: 'metal' }),
    sphere({ id: 'S2-hook-ring', at: [30, 4.6, 8], r: 0.5, mat: 'gold' }),
    disc({ id: 'S2-hook-pad', at: [14, 0.06, 8], r: 1.0, mat: 'neon' }),
    disc({ id: 'S2-slide-pad', at: [30, 2.28, 8], r: 0.75, mat: 'neon' }),
  ],
  weapons: [{ id: 'S2-rack-sg', at: [22, 0.5, 16], gun: 'shotgun', why: 'E3 corridor swarm' }],
  checkpoints: [{ id: 'CP3', at: [78, 0, 16] }],
  mechanisms: [
    { kind: 'shrine', id: 'S2-shrine', at: [78, 0.5, 16], spell: 'gooBolt' },
    { kind: 'secret', id: 'S2-cache', at: [100, 0.4, 8], modifier: 'bigHead' },
    { kind: 'secret', id: 'S2-file-2', at: [130, 2.2, 10], tickets: 5 },
    ammo('A6', [22, 0.4, 14], 'shells', 12),
    ammo('A7', [24, 0.4, 18]),
    ammo('A8', [76, 0.4, 14]),
    ammo('A9', [80, 0.4, 18], 'shells', 12),
    ammo('A10', [110, 0.4, 16], 'shells', 8),
    ammo('A11', [128, 0.4, 16]),
  ],
  encounters: [
    {
      id: 'S2-E3', maxAlive: 8,
      objective: { kind: 'clearAll' },
      activate: zone(28, 60),
      squads: [
        squad('A', { type: 'onEnter' }, [['midget', 5]], [[52, 0, 16]], 'door'),
        squad('B', { type: 'time', t: 7 }, [['midget', 3]], [[30, 0, 16]], 'door'),
        squad('C', { type: 'onKills', n: 6 }, [['midget', 2]], [[40, 4, 16]], 'drop'),
        squad('D', { type: 'onRemain', n: 1 }, [['midget', 2]], [[52, 0, 16]], 'door'),
        // Down the corridor at you: shoot them in the pack and the swarm thins itself.
        squad('K', { type: 'onKills', n: 4 }, [['kamikazeMidget', 2]], [[58, 0, 16]], 'door'),
      ],
    },
    {
      id: 'S2-E4', maxAlive: 8,
      objective: { kind: 'hold', seconds: 25 },
      activate: zone(70, 96),
      hold: zone(72, 90),
      squads: [
        squad('A', { type: 'onHold', p: 0 }, [['midget', 3]], [[84, 0, 16]], 'door'),
        squad('B', { type: 'onHold', p: 10 }, [['midget', 5]], [[84, 0, 16]], 'door'),
      ],
    },
    {
      id: 'S2-E5', maxAlive: 4,
      objective: { kind: 'clearAll' },
      activate: zone(110, 160),
      squads: [
        squad('A', { type: 'onEnter' }, [['flyingMidget', 2]], [[130, 6, 16]]),
        squad('B', { type: 'onKills', n: 1 }, [['flyingMidget', 2]], [[148, 8, 16]], 'air'),
        squad('C', { type: 'onEnter' }, [['flyingMidget', 2]], [[140, 7, 12]], 'air'),
      ],
    },
  ],
};

const S3 = {
  id: 'S3', name: 'Mall of Sproto', origin: [350, 0, 0],
  navBounds: lane(90, MALL_WIDTH),
  flyerVolume: airspace(90, MALL_WIDTH, 12),
  exit: laneZone(84, 90, GARAGE_WIDTH - 1),
  // North balcony. One hook during the lockdown, or the ramp. The floor at z 16 is the fight.
  grappleAnchors: [{ id: 'S3-hook', at: [58, 6.2, 5], r: 1.8 }],
  geometry: [
    floor('S3-floor', 90, MALL_WIDTH),
    ...sides('S3', 90, { width: MALL_WIDTH }),
    box({ id: 'S3-atrium-roof', at: [44, 15.75, 16], size: [72, 0.6, MALL_WIDTH + 2], mat: 'metal' }),
    box({ id: 'S3-kiosk', at: [40, 1, 8], size: [3, 2, 3], mat: 'neon' }),
    box({ id: 'S3-kiosk-b', at: [64, 1, 22], size: [3, 2, 3], mat: 'neon' }),
    planterAt('S3-planter-a', 32, 19.5), planterAt('S3-planter-b', 50, 11),
    cylinder({ id: 'S3-pillar-w', at: [28, 0, 10], r: 0.6, h: 6, mat: 'stone' }),
    cylinder({ id: 'S3-pillar-e', at: [52, 0, 22], r: 0.6, h: 6, mat: 'stone' }),
    ramp({ id: 'S3-balc-ramp', at: [48, 1.825, 5], size: [3, 3.65, 12], yaw: 90, mat: 'metal' }),
    box({ id: 'S3-balc', at: [58, 3.4, 5], size: [8, 0.5, 3], mat: 'metal' }),
    sphere({ id: 'S3-hook-ring', at: [58, 6.2, 5], r: 0.5, mat: 'gold' }),
    disc({ id: 'S3-hook-pad', at: [40, 0.06, 5], r: 0.9, mat: 'neon' }),
  ],
  weapons: [],
  checkpoints: [
    { id: 'CP4', at: [6, 0, 16] },
    { id: 'CP5', at: [70, 0, 16], when: 'S3-E6.cleared' },
  ],
  mechanisms: [
    door('S3-L1-in', [10, 2, 16], MALL_WIDTH + 2),
    door('S3-L1-out', [80, 2, 16], MALL_WIDTH + 2),
    { kind: 'barrel', id: 'S3-brl-1', at: [24, 0.55, 12], element: 'shock' },
    { kind: 'barrel', id: 'S3-brl-2', at: [40, 0.55, 20], element: 'shock' },
    { kind: 'barrel', id: 'S3-brl-3', at: [56, 0.55, 12], element: 'shock' },
    { kind: 'chest', id: 'S3-chest', at: [70, 0.5, 12], gun: 'mg', opens: 'S3-E6.cleared' },
    ammo('A12', [6, 0.4, 16]),
    ammo('A13', [8, 0.4, 12]),
    ammo('A14', [8, 0.4, 20], 'shells', 8),
    ammo('A15', [36, 0.4, 10]),
    ammo('A16', [36, 0.4, 22], 'shells', 8),
    ammo('A17', [60, 0.4, 16]),
    ammo('C1', [70, 0.4, 18], 'bullets', 120),
    ammo('D1', [86, 0.4, 16], 'bullets', 180),
  ],
  encounters: [
    {
      id: 'S3-E6', maxAlive: 8,
      objective: { kind: 'clearAll' },
      activate: laneZone(12, 78, MALL_WIDTH),
      lockdown: { entry: 'S3-L1-in', exit: 'S3-L1-out', threshold: laneZone(14, 24, MALL_WIDTH) },
      squads: [
        squad('W1', { type: 'onEnter' }, [['robotLaser', 2]], [[40, 0, 16]]),
        squad('W1b', { type: 'with', after: 'W1', delay: 4 }, [['robotLaser', 2]], [[22, 0, 10]], 'door'),
        squad('W2', { type: 'onRemain', n: 2 }, [['midget', 5]], [[58, 0, 22]], 'door'),
        squad('W2b', { type: 'with', after: 'W2', delay: 0 }, [['robotLaser', 2]], [[60, 5, 12]], 'door'),
        squad('W3', { type: 'onRemain', n: 2 }, [['flyingMidget', 4]], [[40, 6, 16]], 'drop'),
        squad('W3b', { type: 'with', after: 'W3', delay: 3 }, [['midget', 3]], [[22, 0, 16]], 'door'),
        squad('W4', { type: 'onRemain', n: 2 }, [['obama', 2]], [[48, 5, 10]], 'door'),
        squad('W4b', { type: 'with', after: 'W4', delay: 0 }, [['midget', 5]], [[30, 0, 22]], 'door'),
      ],
    },
  ],
};

const S4 = {
  id: 'S4', name: 'Parking Spiral', origin: [425, 0, 0],
  navBounds: lane(130, GARAGE_WIDTH),
  flyerVolume: airspace(130, GARAGE_WIDTH, 20, 70),
  exit: laneZone(118, 130, 27),
  geometry: [
    floor('S4-floor', 130, GARAGE_WIDTH),
    ...sides('S4', 130, { width: GARAGE_WIDTH }),
    box({ id: 'S4-parking-roof', at: [30, 8.1, 16], size: [55, .52, GARAGE_WIDTH + 2], mat: 'concrete' }),
    box({ id: 'S4-ramp', at: [36, 0.4, 8], size: [16, 0.5, 4], mat: 'concrete' }),
    box({ id: 'S4-car', at: [24, 0.7, 10], size: [3, 1.4, 1.6], mat: 'metal' }),
    // It is a car park: parked rows on the south side of the ramp deck and two on the sealed roof.
    carAt('S4-car-b', 14, 22), carAt('S4-car-c', 32, 23.5), carAt('S4-car-d', 86, 25.5), carAt('S4-car-e', 100, 9),
    box({ id: 'S4-core', at: [90, 1.5, 8], size: [4, 3, 4], mat: 'metal' }),
  ],
  weapons: [],
  checkpoints: [
    { id: 'CP6', at: [48, 0, 16], when: 'S4-E7.cleared' },
    { id: 'CP7', at: [100, 0, 16], when: 'S4-E8.cleared' },
  ],
  mechanisms: [
    { kind: 'mover', id: 'S4-lift', carry: true, from: [48, 0, 8], to: [62, 4, 8], speed: 2 },
    { kind: 'switch', id: 'S4-sw-lift', at: [46, 0.5, 8], needsHold: true, holdTime: 1 },
    door('S4-L2-in', [70, 2, 16], GARAGE_WIDTH + 2),
    door('S4-L2-out', [112, 2, 16], GARAGE_WIDTH + 2),
    { kind: 'barrel', id: 'S4-brl-1', at: [96, 0.55, 16], element: 'shock' },
    { kind: 'chest', id: 'S4-chest', at: [104, 0.5, 12], gun: 'shotgun', opens: 'S4-E8.cleared' },
    { kind: 'secret', id: 'S4-file-3', at: [20, 0.4, 24], tickets: 5 },
    ammo('A18', [8, 0.4, 16]),
    ammo('A19', [30, 0.4, 16]),
    ammo('A20', [44, 0.4, 16], 'shells', 8),
    ammo('A21', [48, 0.4, 20]),
    ammo('A22', [84, 0.4, 12]),
    ammo('A23', [84, 0.4, 20], 'shells', 8),
    ammo('A24', [96, 0.4, 12]),
    ammo('A25', [104, 0.4, 20]),
    ammo('C2', [104, 0.4, 16], 'bullets', 120),
  ],
  encounters: [
    {
      id: 'S4-E7', maxAlive: 6,
      objective: { kind: 'clearAll' },
      activate: laneZone(6, 64, GARAGE_WIDTH),
      squads: [
        squad('A', { type: 'onEnter' }, [['midget', 4]], [[18, 0, 16]], 'hidden'),
        squad('B', { type: 'onKills', n: 3 }, [['obama', 2]], [[28, 3, 10]], 'hidden'),
        squad('C', { type: 'onKills', n: 6 }, [['midget', 2]], [[36, 0, 20]], 'hidden'),
        squad('D', { type: 'onKills', n: 8 }, [['midget', 3]], [[44, 0, 16]], 'hidden'),
        squad('K', { type: 'onKills', n: 5 }, [['kamikazeMidget', 3]], [[50, 0, 14]], 'hidden'),
        squad('E', { type: 'onKills', n: 11 }, [['robotShooter', 1]], [[58, 0, 16]]),
        squad('G', { type: 'onEnter' }, [['gateGenerator', 1, 'S4-gen']], [[52, 0, 22]]),
      ],
    },
    {
      id: 'S4-E8', maxAlive: 8,
      objective: { kind: 'clearAll' },
      activate: laneZone(74, 110, GARAGE_WIDTH),
      lockdown: { entry: 'S4-L2-in', exit: 'S4-L2-out', threshold: laneZone(74, 84, GARAGE_WIDTH) },
      squads: [
        squad('W1', { type: 'onEnter' }, [['midget', 3]], [[80, 0, 10]], 'door'),
        squad('W1b', { type: 'with', after: 'W1', delay: 0 }, [['midget', 3]], [[80, 0, 22]], 'door'),
        squad('W2', { type: 'onRemain', n: 2 }, [['flyingMidget', 4]], [[96, 8, 16]], 'air'),
        squad('W2b', { type: 'with', after: 'W2', delay: 4 }, [['midget', 3]], [[88, 0, 22]], 'door'),
        squad('W3', { type: 'onRemain', n: 2 }, [['midget', 6]], [[92, 0, 12]], 'door'),
        squad('W3b', { type: 'with', after: 'W3', delay: 6 }, [['flyingMidget', 3]], [[100, 8, 10]], 'air'),
        squad('W4', { type: 'onRemain', n: 2 }, [['robotShooter', 1], ['robotLaser', 2]], [[108, 0, 16]], 'door'),
      ],
    },
  ],
};

const S5 = {
  id: 'S5', name: 'Overpass', origin: [540, 0, 0],
  navBounds: { min: [0, 2], max: [140, 30] },
  exit: zone(128, 140),
  geometry: [
    floor('S5-floor', 140),
    ...sides('S5', 140, { h: 1.1, gapS: [47, 57] }),
    box({ id: 'S5-toll', at: [52, 1.2, 8], size: [1, 2.4, 4], mat: 'metal' }),
    box({ id: 'S5-canopy', at: [52, 4.5, 16], size: [8, 0.5, 12], mat: 'concrete' }),
    box({ id: 'S5-rail-n', at: [52, 5.35, 9.7], size: [8.4, 1.2, 0.8], mat: 'concrete' }),
    box({ id: 'S5-car', at: [30, 0.7, 10], size: [3, 1.4, 1.6], mat: 'metal' }),
    // Stalled traffic: the Big Obama is met alone among cars, and they are how you get behind him.
    carAt('S5-car-b', 40, 20), carAt('S5-car-c', 72, 11), carAt('S5-car-d', 108, 20), carAt('S5-car-e', 116, 11),
    // Stair up to the mana battery, then a catwalk and a downhill slide back
    // to the road. The deck at z 16 stays a flat walk under the canopy.
    box({ id: 'S5-stair-pad', at: [52, -0.25, 32.5], size: [8, 0.5, 8], mat: 'concrete' }),
    ramp({ id: 'S5-stair', at: [52, 2.375, 28.7], size: [4, 4.75, 8.6], yaw: 180, mat: 'concrete' }),
    box({ id: 'S5-cat', at: [67.15, 4.5, 23], size: [34.3, 0.5, 2.8], mat: 'metal' }),
    ramp({ id: 'S5-slide', at: [92.15, 2.375, 23], size: [2.8, 4.75, 16.3], yaw: 270, mat: 'concrete' }),
    disc({ id: 'S5-slide-pad', at: [84, 4.82, 23], r: 0.7, mat: 'neon' }),
  ],
  weapons: [],
  checkpoints: [],
  mechanisms: [
    { kind: 'secret', id: 'S5-battery', at: [52, 5, 10], mana: 10 },
    ammo('A26', [12, 0.4, 16]),
    ammo('A27', [16, 0.4, 12], 'shells', 8),
    ammo('A28', [52, 5, 12]),
    ammo('A29', [90, 0.4, 16]),
    ammo('C3', [60, 0.4, 16], 'bullets', 120),
  ],
  encounters: [
    {
      id: 'S5-E9', maxAlive: 6,
      objective: { kind: 'clearAll' },
      activate: zone(16, 120),
      squads: [
        squad('A', { type: 'onEnter' }, [['bigObama', 1]], [[52, 0, 16]], 'door'),
        squad('B', { type: 'onKills', n: 1 }, [['midget', 4]], [[58, 0, 16]], 'door'),
        squad('C', { type: 'with', after: 'B', delay: 0 }, [['obama', 2]], [[52, 5, 10]], 'hidden'),
        squad('D', { type: 'onKills', n: 6 }, [['robotLaser', 1], ['robotShooter', 1]], [[100, 0, 16]]),
      ],
    },
  ],
};

const S6 = {
  id: 'S6', name: 'Gate Plaza', origin: [665, 0, 0],
  navBounds: lane(110, PLAZA_WIDTH),
  flyerVolume: airspace(110, PLAZA_WIDTH, 22),
  intro: card('Gate Plaza', ['A Big Bitcoin Obama is counting the take.', 'The gate does not open until he drops it.']),
  geometry: [
    floor('S6-floor', 110, PLAZA_WIDTH),
    ...sides('S6', 110, { width: PLAZA_WIDTH }),
    cylinder({ id: 'S6-fountain', at: [48, 0, 8], r: 2, h: 2, mat: 'stone' }),
    box({ id: 'S6-stand', at: [40, 1.2, 8], size: [6, 2.4, 4], mat: 'stone' }),
    planterAt('S6-planter-a', 40, 22), planterAt('S6-planter-b', 78, 10), planterAt('S6-planter-c', 78, 22),
    box({ id: 'S6-gate-l', at: [96, 6, -3], size: [2, 12, 2], mat: 'gold' }),
    box({ id: 'S6-gate-r', at: [96, 6, 35], size: [2, 12, 2], mat: 'gold' }),
    // Walk-up perch for the flying adds. No hook: a fling here leaves the floor.
    ramp({ id: 'S6-perch-ramp', at: [52, 1.6, 24], size: [3, 3.2, 14], yaw: 90, mat: 'metal' }),
    box({ id: 'S6-perch', at: [62, 3.2, 24], size: [6, 0.5, 3], mat: 'metal' }),
  ],
  weapons: [
    { id: 'S6-rack-sg', at: [16, 0.5, 12], gun: 'shotgun', why: 'finale tower doors' },
    { id: 'S6-rack-mg', at: [16, 0.5, 20], gun: 'mg', why: 'the Gatekeeper battery' },
  ],
  checkpoints: [{ id: 'CP8', at: [8, 0, 16] }],
  mechanisms: [
    door('S6-L3-in', [12, 2, 16], PLAZA_WIDTH + 2),
    door('S6-gate', [96, 2, 16], PLAZA_WIDTH + 2),
    { kind: 'barrel', id: 'S6-brl-f1', at: [30, 0.55, 10], element: 'fire' },
    { kind: 'barrel', id: 'S6-brl-f2', at: [30, 0.55, 22], element: 'fire' },
    { kind: 'barrel', id: 'S6-brl-s1', at: [70, 0.55, 10], element: 'shock' },
    { kind: 'barrel', id: 'S6-brl-s2', at: [70, 0.55, 22], element: 'shock' },
    ammo('A30', [24, 0.4, 12]),
    ammo('A31', [24, 0.4, 20], 'shells', 8),
    ammo('A32', [60, 0.4, 12]),
    ammo('A33', [60, 0.4, 20]),
    ammo('C4', [40, 0.4, 16], 'bullets', 120),
    ammo('D2', [8, 0.4, 12], 'bullets', 180),
  ],
  encounters: [
    {
      id: 'S6-FIN', maxAlive: 8,
      objective: { kind: 'clearAll' },
      activate: laneZone(14, 92, PLAZA_WIDTH),
      lockdown: { entry: 'S6-L3-in', exit: 'S6-gate', threshold: laneZone(16, 26, PLAZA_WIDTH) },
      squads: [
        squad('P1', { type: 'onEnter' }, [
          ['gateGenerator', 1, 'S6-gen-N'],
          ['gateGenerator', 1, 'S6-gen-W'],
          ['gateGenerator', 1, 'S6-gen-E'],
          ['robotLaser', 3],
          ['gatekeeper', 1],
        ], [[28, 0, 10], [28, 0, 16], [28, 0, 22], [36, 0, 16], [80, 0, 16]]),
        squad('P1b', { type: 'onPartDestroyed', id: 'S6-gen-N' }, [['robotShooter', 1]], [[22, 0, 8]], 'door'),
        squad('P1c', { type: 'onPartDestroyed', id: 'S6-gen-W' }, [['robotShooter', 1], ['robotLaser', 1]], [[22, 0, 24]], 'door'),
        squad('P2a', { type: 'onKills', n: 8 }, [['midget', 4]], [[70, 0, 8]], 'door'),
        squad('P2b', { type: 'onKills', n: 12 }, [['midget', 4]], [[70, 0, 24]], 'door'),
        squad('P2c', { type: 'onKills', n: 16 }, [['midget', 4]], [[64, 0, 16]], 'door'),
        squad('P2k', { type: 'onKills', n: 14 }, [['kamikazeMidget', 3]], [[72, 0, 16]], 'door'),
        squad('P3a', { type: 'onKills', n: 20 }, [['flyingMidget', 3]], [[90, 8, 16]], 'air'),
        squad('P3b', { type: 'onKills', n: 24 }, [['flyingMidget', 3]], [[90, 8, 12]], 'air'),
      ],
    },
    {
      id: 'S6-EXIT',
      objective: { kind: 'reach' },
      activate: laneZone(98, 108, PLAZA_WIDTH),
      zone: laneZone(98, 108, PLAZA_WIDTH),
      squads: [],
    },
  ],
};

// disc() returns geometry, not a mechanism. Drop it from the mechanism list.
S1.mechanisms = S1.mechanisms.filter((m) => m.kind !== 'disc');
S1.geometry.push(disc({ id: 'S1-neon-pad', at: [46, 0.06, 16], r: 1.2, mat: 'neon' }));

export const L01 = makeV2Level({
  id: 'L01',
  name: 'Sproto Landing',
  stage: 'city',
  tier: 1,
  parTime: 18 * 60,
  jetpack: false,
  useNav: true,
  maxAlive: 8,
  startAmmo: { bullets: 36 },
  lighting: 'dusk',
  sections: [S1, S2, S3, S4, S5, S6],
});

registerLevel(L01);
