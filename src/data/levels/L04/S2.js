// S2 Candle Forest. Footprint 270 × 200, y -40 to 100. Climbs 54 m.
import { box, cylinder, disc, ammo, door, deckBox, stair } from './prim.js';
import { candle, chain, crate, hollowCandle, hut, server, ticker, vent } from './prefabs.js';
import { ENCOUNTERS } from './encounters.js';

const vista = [];
const heights = [60, 80, 100, 70, 120, 90, 110, 65, 85, 75];
[30, 170].forEach((z, row) => {
  [20, 70, 120, 170, 220].forEach((x, i) => {
    const h = heights[row * 5 + i];
    vista.push(...candle(`s2.vista${row * 5 + i + 1}`, [10, h, 10], [x, h / 2, z], (row + i) % 2 ? 'down' : 'up'));
  });
});

function updraft(id, min, max) {
  return { kind: 'hazardZone', id, hazard: 'updraft', accel: 30, min, max };
}

export const S2 = {
  id: 'S2',
  name: 'Candle Forest',
  origin: [240, 0, -40],
  start: [6, 0, 100],
  yaw: -Math.PI / 2,
  footprint: [270, 200],
  routeM: 260,
  navBounds: { min: [0, 0], max: [270, 200] },
  flyerVolume: { min: [0, -40, 0], max: [270, 100, 200] },
  voids: [{ id: 's2.void', min: [-20, -200, -20], max: [290, -40, 220], penalty: 0.25, invuln: 1, mode: 'lastSafe', to: [6, 0, 100] }],
  exit: { min: [250, 40, 94], max: [266, 90, 106] },
  grappleAnchors: [
    { id: 's2.hook.pit', at: [66, 20, 100], r: 2.4 },
    { id: 's2.hook.k8', at: [154, 24, 100], r: 2.6 },
    { id: 's2.hook.k11', at: [200, 48, 100], r: 2.6 },
    { id: 's2.hook.k14', at: [252, 60, 100], r: 3 },
  ],
  navLinks: [
    { from: { x: 20, z: 100 }, to: { x: 32, z: 100 }, kind: 'chain' },
    { from: { x: 100, z: 100 }, to: { x: 112, z: 100 }, kind: 'slider' },
    { from: { x: 112, z: 100 }, to: { x: 132, z: 100 }, kind: 'slider' },
    { from: { x: 132, z: 100 }, to: { x: 154, z: 100 }, kind: 'slider' },
  ],
  geometry: [
    box({ id: 's2.ent', at: [10, -2, 100], size: [20, 4, 20], mat: 'metal' }),
    deckBox('s2.slide.lip', -12, 24, 0, 100, 12),
    ...stair('s2.slide.climb', [100, 0, 100], [262, 76, 100], 10),
    disc({ id: 's2.slide-pad', at: [108, 4, 100], r: 1.1, mat: 'neon' }),
    ...chain('s2.chainIn', [20, 0, 100], [32, 0, 100]),
    box({ id: 's2.porchW', at: [36, -2, 100], size: [8, 4, 12], mat: 'metal' }),
    box({ id: 's2.pit', at: [60, -2, 100], size: [80, 4, 160], mat: 'metal' }),
    disc({ id: 's2.thresh', at: [47, 0.06, 100], r: 2, mat: 'neon' }),
    ...candle('s2.pk1', [8, 6, 8], [54, 3, 40], 'up'),
    ...candle('s2.pk2', [8, 10, 8], [78, 5, 40], 'down'),
    ...candle('s2.pk3', [8, 8, 8], [54, 4, 160], 'down'),
    ...candle('s2.pk4', [8, 12, 8], [78, 6, 160], 'up'),
    ...candle('s2.pk5', [6, 16, 6], [66, 8, 170], 'up'),
    crate('s2.pitCr1', [48, 0.6, 108]),
    crate('s2.pitCr2', [60, 0.6, 78]),
    crate('s2.pitCr3', [72, 0.6, 122]),
    crate('s2.pitCr4', [86, 0.6, 108]),
    ticker('s2.pitT1', [60, 1, 88], 6),
    ticker('s2.pitT2', [84, 1, 92], 6),
    ...hut('s2.pitHut', [5, 3, 5], [88, 1.5, 78]),
    ...vent('s2.pv1', [46, 0, 80]),
    ...vent('s2.pv2', [86, 0, 120]),
    box({ id: 's2.porchE', at: [96, -2, 100], size: [8, 4, 12], mat: 'metal' }),
    box({ id: 's2.book', at: [135, -13, 100], size: [60, 2, 70], mat: 'glass' }),
    ...vent('s2.v1', [122, -12, 100]),
    ...vent('s2.v2', [144, -12, 112]),
    box({ id: 's2.rail1', at: [112, 3.7, 100], size: [0.6, 0.6, 60], mat: 'trim' }),
    box({ id: 's2.sl1-deck', at: [112, 5, 74], size: [8, 2, 8], mat: 'metal', tag: 'mover' }),
    box({ id: 's2.sl1-wall', at: [116.3, 6.6, 74], size: [0.6, 1.2, 8], mat: 'trim' }),
    box({ id: 's2.rail2', at: [132, 9.7, 100], size: [0.6, 0.6, 60], mat: 'trim' }),
    box({ id: 's2.sl2-deck', at: [132, 11, 126], size: [8, 2, 8], mat: 'metal', tag: 'mover' }),
    box({ id: 's2.sl2-wall', at: [136.3, 12.6, 126], size: [0.6, 1.2, 8], mat: 'trim' }),
    ...candle('s2.k8', [12, 20, 12], [154, 10, 100], 'up'),
    ...vent('s2.v3', [154, 20, 100]),
    ...candle('s2.k9', [8, 18, 8], [176, 21, 80], 'down'),
    ...candle('s2.k10', [8, 22, 8], [176, 23, 120], 'up'),
    ...candle('s2.k11', [12, 24, 12], [200, 30, 100], 'up'),
    ...vent('s2.v4', [200, 42, 100]),
    ...hollowCandle('s2.k12', [10, 20, 10], [222, 38, 80]),
    ...candle('s2.k13', [8, 24, 8], [222, 40, 120], 'up'),
    ...candle('s2.k14', [20, 30, 20], [252, 39, 100], 'up'),
    ticker('s2.athT1', [246, 55, 94], 6),
    ticker('s2.athT2', [246, 55, 106], 6),
    ...server('s2.athSrv', [254, 55, 100]),
    disc({ id: 's2.ring', at: [259, 54.1, 100], r: 3, mat: 'neon' }),
    ...vista,
    disc({ id: 'crit-CP3', at: [36, 0.08, 100], r: 1.2, mat: 'neon' }),
    disc({ id: 'crit-CP4', at: [96, 0.08, 100], r: 1.2, mat: 'neon' }),
  ],
  weapons: [
    { id: 'mg-pit', at: [50, 0, 94], gun: 'mg', quality: 'uncommon', why: 'bitbug flocks in S2-E3' },
  ],
  checkpoints: [
    { id: 'CP3', at: [36, 0, 100] },
    { id: 'CP4', at: [96, 0, 100], when: 'S2-E3.cleared' },
  ],
  mechanisms: [
    { kind: 'killPlane', id: 's2.kill', y: -40 },
    door('s2.pitIn', [40.3, 3, 100], [0.6, 6, 8]),
    door('s2.pitOut', [91.7, 3, 100], [0.6, 6, 8]),
    updraft('s2.pv1-up', [43, 0, 77], [49, 18, 83]),
    updraft('s2.pv2-up', [83, 0, 117], [89, 18, 123]),
    updraft('s2.v1-up', [119, -12, 97], [125, 14, 103]),
    updraft('s2.v2-up', [141, -12, 109], [147, 14, 115]),
    updraft('s2.v3-up', [151, 20, 97], [157, 38, 103]),
    updraft('s2.v4-up', [197, 42, 97], [203, 56, 103]),
    { kind: 'mover', id: 's2.sl1', mode: 'pingpong', speed: 4, from: [112, 5, 74], to: [112, 5, 126], size: [8, 2, 8] },
    { kind: 'mover', id: 's2.sl2', mode: 'pingpong', speed: 4, from: [132, 11, 126], to: [132, 11, 74], size: [8, 2, 8] },
    { kind: 'fuelPad', id: 's2.pad.pk5', at: [66, 16.2, 112], safe: true },
    { kind: 'fuelPad', id: 's2.pad.k8', at: [154, 20.2, 100], safe: true },
    { kind: 'fuelPad', id: 's2.pad.k11', at: [200, 42.2, 100], safe: true },
    { kind: 'fuelPad', id: 's2.pad.k14', at: [252, 54.2, 100], safe: true },
    { kind: 'secret', id: 's2.bonk', at: [222, 29, 80], modifier: 'moonBoots' },
    ammo('ammo-s2-1', [36, 0, 96], 'bullets', 60),
    ammo('ammo-s2-2', [50, 0, 106], 'bullets', 60),
    ammo('ammo-s2-3', [80, 0, 104], 'bullets', 60),
    ammo('ammo-s2-4', [96, 0, 104], 'bullets', 60),
    ammo('ammo-s2-5', [200, 42, 104], 'bullets', 60),
    { kind: 'ammoCrate', id: 'crate-l1', at: [66, 0, 108], uses: 3, refill: 0.5, opens: 'S2-E3.cleared' },
    { kind: 'manaBloom', id: 'bloom-l1', at: [66, 0, 110], amount: 50, regrow: 20, opens: 'S2-E3.cleared' },
    { kind: 'chest', id: 'chest-l1', at: [66, 0, 104], opens: 'S2-E3.cleared', roll: { minTier: 'uncommon', avoidCarried: true } },
  ],
  encounters: [ENCOUNTERS.E3, ENCOUNTERS.E4],
};
