// SB The Exchange. Footprint 110 × 120. Boss: Bitcoin Obama & The Midget.
// (D) rows are the blockout of duelArena('exchange'). That helper is not in
// the tree, so the candlestick bars, chains and sliders are placed from §6.6.
import { box, cylinder, disc, ammo, door } from './prim.js';
import { candle, chain, crate, fireRing, pylon } from './prefabs.js';
import { ENCOUNTERS } from './encounters.js';

const tiles = [];
for (let j = 0; j < 5; j++) {
  for (let i = 0; i < 5; i++) {
    if ((i === 0 || i === 4) && (j === 0 || j === 4)) continue;
    const drop = (i + j) % 2 === 1;
    const rise = i === 2 && j === 0 ? 6 : i === 2 && j === 4 ? 3 : 0;
    tiles.push({
      ...box({
        id: `sb.t${i}${j}`,
        at: [46 + 12 * i, -2, 36 + 12 * j],
        size: [12, 4, 12],
        mat: 'metal',
      }),
      tag: drop ? 'drop' : 'keep',
      rise,
    });
  }
}

const rivets = [
  [64, 54], [76, 54], [64, 66], [76, 66], [52, 54], [52, 66], [88, 54], [88, 66],
].map(([x, z], n) => cylinder({ id: `sb.rivet${n + 1}`, at: [x, -4, z], r: 1.5, h: 4, mat: 'trim' }));

const vista = [];
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const h = 60;
  const y = 20 + h / 2;
  vista.push(...candle(`sb.vista${i + 1}`, [10, h, 10], [70 + Math.cos(a) * 45, y, 60 + Math.sin(a) * 45], i % 2 ? 'down' : 'up'));
}

export const SB = {
  id: 'SB',
  name: 'The Exchange',
  origin: [1088, 0, 0],
  start: [4, 0, 60],
  yaw: -Math.PI / 2,
  footprint: [110, 120],
  routeM: 110,
  navBounds: { min: [0, 20], max: [110, 100] },
  flyerVolume: { min: [0, -40, 20], max: [110, 16, 100] },
  voids: [{
    id: 'sb.void', min: [-20, -200, 0], max: [130, -40, 130],
    penalty: 0.25, invuln: 1, mode: 'fixed', when: 'flashCrash', to: [70, 0, 60],
  }],
  exit: null,
  intro: {
    title: 'The Pump & Dump Duo',
    lines: ['Shiller shills.', 'One counts. One flies.'],
  },
  grappleAnchors: [
    { id: 'sb.hook.moon', at: [70, 12, 36], r: 2.6 },
    { id: 'sb.hook.py2', at: [92, 16, 74], r: 2.2 },
    { id: 'sb.hook.py3', at: [48, 18, 74], r: 2.2 },
    { id: 'sb.hook.lid', at: [70, 14, 60], r: 2.4 },
  ],
  navLinks: [
    { from: { x: 52, z: 51 }, to: { x: 88, z: 51 }, kind: 'slider' },
    { from: { x: 88, z: 69 }, to: { x: 52, z: 69 }, kind: 'slider' },
  ],
  geometry: [
    box({ id: 'sb.vest', at: [11, -2, 60], size: [22, 4, 16], mat: 'metal' }),
    cylinder({ id: 'sb.jetDais', at: [6, 0, 54], r: 1.5, h: 0.5, mat: 'gold' }),
    box({ id: 'sb.cause', at: [31, -0.5, 60], size: [18, 1, 6], mat: 'metal' }),
    box({ id: 'sb.gateP1', at: [39.7, 2.5, 56.5], size: [1, 5, 1], mat: 'metal' }),
    box({ id: 'sb.gateP2', at: [39.7, 2.5, 63.5], size: [1, 5, 1], mat: 'metal' }),
    ...tiles,
    ...rivets,
    cylinder({ id: 'sb.podium', at: [70, 0, 60], r: 3, h: 1, mat: 'gold' }),
    ...candle('sb.bar1', [3, 3, 3], [58, 1.5, 46], 'up'),
    ...candle('sb.bar2', [3, 4, 3], [82, 2, 46], 'down'),
    ...candle('sb.bar3', [3, 4, 3], [58, 2, 74], 'up'),
    ...candle('sb.bar4', [3, 3, 3], [82, 1.5, 74], 'down'),
    crate('sb.chainW1', [46, 0.6, 48]),
    crate('sb.chainW2', [46, 0.6, 72]),
    ...chain('sb.chainW', [46, 1.2, 46], [46, 1.2, 52]),
    crate('sb.chainE1', [94, 0.6, 55.5]),
    crate('sb.chainE2', [94, 0.6, 64.5]),
    ...chain('sb.chainE', [94, 1.2, 56.5], [94, 1.2, 63.5]),
    box({ id: 'sb.SLa-deck', at: [52, 1.25, 51], size: [3, 2.5, 3], mat: 'metal', tag: 'mover' }),
    box({ id: 'sb.SLb-deck', at: [88, 1.25, 69], size: [3, 2.5, 3], mat: 'metal', tag: 'mover' }),
    ...pylon('sb.py1-vis', [70, 0, 35]),
    cylinder({ id: 'sb.py2stub', at: [92, 0, 74], r: 1.5, h: 5, mat: 'candleDown' }),
    ...pylon('sb.py2-vis', [92, 5, 74]),
    cylinder({ id: 'sb.py3stub', at: [48, 0, 74], r: 1.5, h: 8, mat: 'candleUp' }),
    ...pylon('sb.py3-vis', [48, 8, 74]),
    ...pylon('sb.cb1-vis', [47, 0, 66]),
    ...pylon('sb.cb2-vis', [93, 0, 66]),
    box({ id: 'sb.lid', at: [70, 16.3, 60], size: [56, 0.6, 56], mat: 'forceField', tag: 'lockWall' }),
    ...fireRing('sb.ring', { at: [70, 0, 60], r: 27.8, h: 4 }),
    ...vista,
    disc({ id: 'crit-CP10', at: [11, 0.08, 60], r: 1.2, mat: 'neon' }),
  ],
  weapons: [
    { id: 'bz-duo', at: [6, 0, 66], gun: 'bazooka', quality: 'uncommon', why: 'pylons and the Duo in SB-BOSS' },
  ],
  checkpoints: [
    { id: 'CP10', at: [11, 0, 60] },
  ],
  mechanisms: [
    { kind: 'killPlane', id: 'sb.kill', y: -40, rescue: [70, 0, 60], when: 'flashCrash' },
    { kind: 'jetpack', id: 'sb.jet', at: [6, 1.2, 54], skipIfOwned: true },
    { kind: 'jetpack', id: 'sb.jet-lane', at: [12, 0.4, 60], skipIfOwned: true },
    door('sb.gate', [39.7, 3, 60], [0.6, 6, 6], { opens: 'p.jet.has' }),
    { kind: 'fireRing', id: 'sb.fire', at: [70, 0, 60], r: [27.8, 26.8, 25.5] },
    { kind: 'mover', id: 'sb.SLa', mode: 'pingpong', speed: 3, from: [52, 1.25, 51], to: [88, 1.25, 51], size: [3, 2.5, 3] },
    { kind: 'mover', id: 'sb.SLb', mode: 'pingpong', speed: 3, from: [88, 1.25, 69], to: [52, 1.25, 69], size: [3, 2.5, 3] },
    { kind: 'depotCrate', id: 'depot-crate-vest', at: [18, 0, 60] },
    { kind: 'depotCrate', id: 'depot-crate-arena', at: [74, 0, 64.5] },
    { kind: 'fuelPad', id: 'sb.pad.vest', at: [16, 0.2, 66], safe: true },
    { kind: 'fuelPad', id: 'sb.pad.t31', at: [86, 0.2, 44], safe: true },
    { kind: 'fuelPad', id: 'sb.pad.t13', at: [54, 0.2, 76], safe: true },
    { kind: 'power', id: 'sb.fuel', at: [70, 1, 60], modifier: 'fuel', when: 'part:5' },
    ammo('ammo-sb-1', [14, 0, 54], 'bullets', 60),
    ammo('ammo-sb-2', [9, 0, 66], 'rockets', 3),
    ammo('ammo-sb-3', [62, 0, 44], 'bullets', 60),
    ammo('ammo-sb-4', [78, 0, 76], 'bullets', 60),
    ammo('ammo-sb-5', [78, 0, 44], 'rockets', 3),
    { kind: 'ammoCrate', id: 'crate-l3', at: [70, 1, 60], uses: 3, refill: 0.5, opens: 'SB-BOSS.cleared' },
    {
      kind: 'bossReward', id: 'sb.reward', at: [70, 1, 60], spell: 'pumpIt',
      guns: { rare: 2, boss: ['ray', 'bigbullets'] },
    },
  ],
  encounters: [ENCOUNTERS.BOSS],
};
