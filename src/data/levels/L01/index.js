// L01 Sproto Landing. Format v2. Coordinates are local to each section.
// The boulevard, mall, roof and plaza are playable floors with the design's
// encounters, lockdowns and finale. Prop dressing that is not on the route
// (every car, bench and kiosk) is still a placeholder.
import { box, cone, cylinder, disc, ramp, sphere } from '../kit.js';
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';

const card = (title, lines) => ({ title, lines });

function floor(id, length) {
  return box({ id, at: [length / 2, -0.25, 16], size: [length, 0.5, 28], mat: 'concrete' });
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

function ammo(id, at, ammoType = 'bullets', amount = 60) {
  return { kind: 'ammo', id, at, ammoType, amount };
}

function door(id, at) {
  return { kind: 'door', id, at, size: [1.2, 4, 32] };
}

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
    box({ id: 'S1-truck', at: [62, 1.2, 8], size: [4, 2.4, 2.4], mat: 'metal' }),
    box({ id: 'S1-cover-a', at: [54, 0.7, 8], size: [2.4, 1.4, 1.4], mat: 'metal' }),
    box({ id: 'S1-cover-b', at: [54, 0.7, 24], size: [2.4, 1.4, 1.4], mat: 'metal' }),
    box({ id: 'S1-barricade', at: [150, 1.1, 8], size: [1.2, 2.2, 4], mat: 'metal' }),
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
    box({ id: 'S2-alley-n', at: [40, 2, 4], size: [70, 4, 1], mat: 'concrete' }),
    box({ id: 'S2-alley-s', at: [40, 2, 28], size: [70, 4, 1], mat: 'concrete' }),
    cylinder({ id: 'S2-pillar', at: [78, 0, 12], r: 0.5, h: 4, mat: 'stone' }),
    box({ id: 'S2-tank', at: [130, 1.2, 16], size: [3, 2.4, 3], mat: 'metal' }),
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
  navBounds: { min: [0, 2], max: [90, 30] },
  flyerVolume: { min: [0, 0, 2], max: [90, 12, 30] },
  exit: zone(84, 90),
  // North balcony. One hook during the lockdown, or the ramp. The floor at z 16 is the fight.
  grappleAnchors: [{ id: 'S3-hook', at: [58, 6.2, 5], r: 1.8 }],
  geometry: [
    floor('S3-floor', 90),
    box({ id: 'S3-kiosk', at: [40, 1, 8], size: [3, 2, 3], mat: 'neon' }),
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
    door('S3-L1-in', [10, 2, 16]),
    door('S3-L1-out', [80, 2, 16]),
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
      activate: zone(12, 78),
      lockdown: { entry: 'S3-L1-in', exit: 'S3-L1-out', threshold: zone(14, 24) },
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
  navBounds: { min: [0, 2], max: [130, 30] },
  flyerVolume: { min: [70, 0, 2], max: [130, 20, 30] },
  exit: zone(118, 130),
  geometry: [
    floor('S4-floor', 130),
    box({ id: 'S4-ramp', at: [36, 0.4, 8], size: [16, 0.5, 4], mat: 'concrete' }),
    box({ id: 'S4-car', at: [24, 0.7, 10], size: [3, 1.4, 1.6], mat: 'metal' }),
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
    door('S4-L2-in', [70, 2, 16]),
    door('S4-L2-out', [112, 2, 16]),
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
      activate: zone(6, 64),
      squads: [
        squad('A', { type: 'onEnter' }, [['midget', 4]], [[18, 0, 16]], 'hidden'),
        squad('B', { type: 'onKills', n: 3 }, [['obama', 2]], [[28, 3, 10]], 'hidden'),
        squad('C', { type: 'onKills', n: 6 }, [['midget', 2]], [[36, 0, 20]], 'hidden'),
        squad('D', { type: 'onKills', n: 8 }, [['midget', 3]], [[44, 0, 16]], 'hidden'),
        squad('E', { type: 'onKills', n: 11 }, [['robotShooter', 1]], [[58, 0, 16]]),
        squad('G', { type: 'onEnter' }, [['gateGenerator', 1, 'S4-gen']], [[52, 0, 22]]),
      ],
    },
    {
      id: 'S4-E8', maxAlive: 8,
      objective: { kind: 'clearAll' },
      activate: zone(74, 110),
      lockdown: { entry: 'S4-L2-in', exit: 'S4-L2-out', threshold: zone(74, 84) },
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
    box({ id: 'S5-toll', at: [52, 1.2, 8], size: [1, 2.4, 4], mat: 'metal' }),
    box({ id: 'S5-canopy', at: [52, 4.5, 16], size: [8, 0.5, 12], mat: 'concrete' }),
    box({ id: 'S5-rail-n', at: [52, 5.35, 9.7], size: [8.4, 1.2, 0.8], mat: 'concrete' }),
    box({ id: 'S5-car', at: [30, 0.7, 10], size: [3, 1.4, 1.6], mat: 'metal' }),
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
  navBounds: { min: [0, 2], max: [110, 30] },
  flyerVolume: { min: [0, 0, 2], max: [110, 22, 30] },
  intro: card('Gate Plaza', ['A Big Bitcoin Obama is counting the take.', 'The gate does not open until he drops it.']),
  geometry: [
    floor('S6-floor', 110),
    cylinder({ id: 'S6-fountain', at: [48, 0, 8], r: 2, h: 2, mat: 'stone' }),
    box({ id: 'S6-stand', at: [40, 1.2, 8], size: [6, 2.4, 4], mat: 'stone' }),
    box({ id: 'S6-gate-l', at: [96, 6, 6], size: [2, 12, 2], mat: 'gold' }),
    box({ id: 'S6-gate-r', at: [96, 6, 26], size: [2, 12, 2], mat: 'gold' }),
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
    door('S6-L3-in', [12, 2, 16]),
    door('S6-gate', [96, 2, 16]),
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
      activate: zone(14, 92),
      lockdown: { entry: 'S6-L3-in', exit: 'S6-gate', threshold: zone(16, 26) },
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
        squad('P3a', { type: 'onKills', n: 20 }, [['flyingMidget', 3]], [[90, 8, 16]], 'air'),
        squad('P3b', { type: 'onKills', n: 24 }, [['flyingMidget', 3]], [[90, 8, 12]], 'air'),
      ],
    },
    {
      id: 'S6-EXIT',
      objective: { kind: 'reach' },
      activate: zone(98, 108),
      zone: zone(98, 108),
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
