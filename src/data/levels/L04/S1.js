// S1 Genesis Block. Local metres. Footprint 240 × 120, y -40 to 70.
import { box, cylinder, disc, ammo, door, deck, slope, deckBox } from './prim.js';
import { candle, chain, crate, hut, island, server, sign, ticker, tunnel } from './prefabs.js';
import { ENCOUNTERS } from './encounters.js';

const vistaX = [20, 60, 100, 140, 180, 220];
const vistaH = [40, 50, 60, 70, 80, 55];
const vista = [];
vistaX.forEach((x, i) => {
  const h = vistaH[i];
  vista.push(...candle(`s1.vista${i + 1}`, [10, h, 10], [x, h / 2, 8], i % 2 ? 'down' : 'up'));
});
[80, 160].forEach((x, i) => {
  const h = i ? 75 : 65;
  vista.push(...candle(`s1.vista${i + 7}`, [10, h, 10], [x, h / 2, 112], i ? 'down' : 'up'));
});

export const S1 = {
  id: 'S1',
  name: 'Genesis Block',
  origin: [0, 0, 0],
  start: [4, 0, 60],
  yaw: -Math.PI / 2,
  footprint: [240, 120],
  routeM: 240,
  navBounds: { min: [0, 0], max: [240, 120] },
  flyerVolume: { min: [0, -40, 0], max: [240, 70, 120] },
  voids: [{ id: 's1.void', min: [-20, -200, -20], max: [260, -40, 140], penalty: 0.25, invuln: 1, mode: 'lastSafe', to: [4, 0, 60] }],
  exit: { min: [232, -2, 56], max: [242, 14, 64] },
  intro: {
    title: 'The Blockchain Void',
    lines: ['The money leaves the Grove and goes up.', 'There is no floor on this exchange. Mind the gap.'],
  },
  navLinks: [
    { from: { x: 30, z: 60 }, to: { x: 44, z: 60 }, kind: 'bridge' },
    { from: { x: 218, z: 60 }, to: { x: 224, z: 60 }, kind: 'chain' },
  ],
  grappleAnchors: [
    { id: 's1.hook.h1', at: [108, 8, 48], r: 3 },
    { id: 's1.hook.h2', at: [136, 12, 46], r: 3 },
    { id: 's1.hook.h3', at: [168, 16, 74], r: 3 },
    { id: 's1.hook.mem', at: [200, 16, 60], r: 3 },
  ],
  geometry: [
    box({ id: 's1.gen', at: [15, -2, 60], size: [30, 4, 40], mat: 'metal' }),
    box({ id: 's1.mono', at: [4, 6, 46], size: [4, 12, 4], mat: 'gold' }),
    crate('s1.genCr1', [12, 0.6, 52]),
    crate('s1.genCr2', [12, 0.6, 68]),
    crate('s1.genCr3', [22, 0.6, 64]),
    ...sign('s1.signZap', [27, 3, 54], 'ZAP THE CONDUIT'),
    box({ id: 's1.c1post', at: [37, -0.5, 50], size: [3, 3, 3], mat: 'metal' }),
    ...deck('eb1', [30, 0, 60], [44, 0, 60], 4, 0),
    box({ id: 's1.blk1', at: [62, -2, 60], size: [36, 4, 40], mat: 'metal' }),
    ...hut('s1.hutN', [6, 3, 5], [62, 1.5, 42.5]),
    ...hut('s1.hutS', [6, 3, 5], [62, 1.5, 77.5]),
    ticker('s1.tickA', [52, 1, 52], 6),
    ticker('s1.tickB', [52, 1, 68], 6),
    ...server('s1.srvA', [68, 1, 54]),
    ...server('s1.srvB', [68, 1, 66]),
    crate('s1.blkCr1', [48, 0.6, 64]),
    crate('s1.blkCr2', [58, 0.6, 48]),
    crate('s1.blkCr3', [58, 0.6, 72]),
    crate('s1.blkCr4', [74, 0.6, 64]),
    box({ id: 's1.wallN', at: [79.7, 2, 48], size: [0.6, 4, 16], mat: 'metal' }),
    box({ id: 's1.wallS', at: [79.7, 2, 72], size: [0.6, 4, 16], mat: 'metal' }),
    box({ id: 's1.launch', at: [85, -2, 60], size: [10, 4, 16], mat: 'metal' }),
    cylinder({ id: 's1.dais', at: [85, 0, 54], r: 2, h: 0.5, mat: 'gold' }),
    ...sign('s1.signHold', [88, 3, 54], 'HOLD SPACE TO FLY'),
    ...island('s1.h1', 6, 3, [108, -3, 48]),
    ...island('s1.h2', 6, 3, [136, 0, 46]),
    ...sign('s1.signHover', [136, 6, 40], 'HOLD TO HOVER'),
    ...island('s1.h3', 6, 3, [168, 4, 74]),
    ...sign('s1.signDrop', [168, 10, 80], 'C TO DROP'),
    box({ id: 's1.file1', at: [136, -6.25, 46], size: [4, 0.5, 4], mat: 'metal' }),
    box({ id: 's1.mem', at: [200, 6, 60], size: [36, 4, 44], mat: 'metal' }),
    ...candle('s1.stubN', [6, 8, 6], [198, 12, 46], 'up'),
    ...candle('s1.stubS', [6, 6, 6], [198, 11, 74], 'down'),
    ...hut('s1.memHut', [5, 3, 5], [212, 9.5, 42.5]),
    crate('s1.memCr1', [188, 8.6, 64]),
    crate('s1.memCr2', [204, 8.6, 54]),
    crate('s1.memCr3', [204, 8.6, 66]),
    ticker('s1.memWall', [210, 9, 66], 6),
    ...chain('s1.chainX', [218, 8, 60], [224, 8, 60]),
    ...tunnel('s1.tun', { length: 16, floorAt: [232, 7.5, 60] }),
    deckBox('s1.slide.h1', 78, 242, 0, 60, 8),
    disc({ id: 's1.slide-pad', at: [100, 0.08, 60], r: 1.1, mat: 'neon' }),
    ...vista,
    disc({ id: 'crit-CP1', at: [4, 0.08, 60], r: 1.2, mat: 'neon' }),
    disc({ id: 'crit-CP2', at: [85, 0.08, 60], r: 1.2, mat: 'neon' }),
  ],
  weapons: [],
  checkpoints: [
    { id: 'CP1', at: [4, 0, 60] },
    { id: 'CP2', at: [85, 0, 60], when: 'S1-E1.cleared' },
  ],
  mechanisms: [
    { kind: 'killPlane', id: 's1.kill', y: -40 },
    { kind: 'conduit', id: 'c1', at: [37, 2, 50], spell: 'chainZap', powers: 'eb1' },
    { kind: 'energyBridge', id: 'eb1', from: [30, 0, 60], to: [44, 0, 60], width: 4, when: 'c1' },
    door('gate1', [79.7, 2, 60], [0.6, 4, 8], { opens: 'S1-E1.cleared' }),
    { kind: 'jetpack', id: 's1.jet', at: [88, 0.4, 60] },
    { kind: 'jetpack', id: 's1.jet-n', at: [88, 0.4, 58] },
    { kind: 'jetpack', id: 's1.jet-s', at: [88, 0.4, 62] },
    { kind: 'fuelPad', id: 's1.pad.h1', at: [108, 0.2, 48], safe: true },
    { kind: 'fuelPad', id: 's1.pad.h2', at: [136, 3.2, 46], safe: true },
    { kind: 'fuelPad', id: 's1.pad.h3', at: [168, 7.2, 74], safe: true },
    { kind: 'secret', id: 's1.file', at: [136, -6, 46], tickets: 5, story: 'Block #0 was mined by a midget on a dare.' },
    ammo('ammo-s1-1', [8, 0, 56], 'bullets', 60),
    ammo('ammo-s1-2', [26, 0, 64], 'bullets', 60),
    ammo('ammo-s1-3', [83, 0, 56], 'bullets', 60),
    ammo('ammo-s1-4', [132, 3, 54], 'bullets', 60),
    ammo('ammo-s1-5', [190, 8, 66], 'shells', 12),
  ],
  encounters: [ENCOUNTERS.E1, ENCOUNTERS.E2],
};
