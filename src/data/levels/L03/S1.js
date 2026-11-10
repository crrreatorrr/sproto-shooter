// S1 Crop Fields. Local metres, north is -z. Terrain is visual; S1-FL is the
// walkable slab until terrain collision exists.
import { box, cylinder, cone, disc, place, stairs } from './prim.js';
import { beanstalk, manaBloom, podStump, scarecrow, scarecrowTower, shed, shrine, tractor, tree, truck } from './prefabs.js';
import { ENCOUNTERS } from './encounters.js';

const trees = [];
for (const z of [-152, -8]) {
  for (let i = 0; i < 7; i++) {
    trees.push(...place(tree(), { at: [18 + i * 36, 0, z], id: `S1-TREE-${z}-${i}` }));
  }
}

const cabbageR = [2.2, 2.6, 3.0, 2.4, 2.6, 2.2, 3.0, 2.4];
const cabbageAt = [[74, 1.6, -70], [84, 2.0, -104], [96, 2.4, -84], [104, 1.8, -116], [112, 2.0, -66], [120, 1.6, -92], [134, 2.4, -78], [142, 1.8, -110]];
const pumpR = [1.6, 2.2, 1.8, 2.4, 2.0, 1.6, 2.4, 1.8];
const pumpAt = [[178, 1.1, -72], [186, 1.7, -94], [194, 1.3, -112], [200, 1.9, -78], [210, 1.5, -100], [216, 1.1, -120], [238, 1.9, -106], [246, 1.3, -86]];

function spheres(prefix, radii, ats, mat) {
  return radii.map((r, i) => ({
    kind: 'sphere', id: `${prefix}${i + 1}`, at: ats[i], r, mat,
  }));
}

export const S1 = {
  id: 'S1',
  name: 'Crop Fields',
  origin: [0, 0, 0],
  start: [4, 0, -80],
  yaw: -Math.PI / 2,
  footprint: [260, 160],
  routeM: 290,
  navBounds: { min: [0, -160], max: [260, 0] },
  exit: { min: [256, -1, -83], max: [262, 4, -77] },
  intro: { title: 'The Vegetable Grove', lines: ['The Cabal grows it here.', 'Bullets are a second opinion. Bring spells.'] },
  geometry: [
    box({ id: 'S1-FL', at: [130, -0.25, -80], size: [260, 0.5, 160], mat: 'grass' }),
    { kind: 'terrain', id: 'S1-T', origin: [0, 0, -160], size: [260, 160], cell: 2, seed: 301, mat: 'grass', noise: { amp: 0.4, freq: 0.03, octaves: 1 } },
    box({ id: 'S1-WN', at: [130, 3, -159], size: [260, 6, 2], mat: 'hedge' }),
    box({ id: 'S1-WS', at: [130, 3, -1], size: [260, 6, 2], mat: 'hedge' }),
    box({ id: 'S1-WW', at: [1, 3, -80], size: [2, 6, 160], mat: 'hedge' }),
    box({ id: 'S1-WE1', at: [259, 3, -38.5], size: [2, 6, 77], mat: 'hedge' }),
    box({ id: 'S1-WE2', at: [259, 3, -121.5], size: [2, 6, 77], mat: 'hedge' }),
    ...place(truck(), { at: [10, 0, -80], yaw: 90, id: 'S1-TRK' }),
    ...place(shrine(), { at: [34, 0, -80], id: 'SH-YEET' }),
    ...place(podStump(), { at: [46, 0, -74], id: 'S1-ST1' }),
    ...place(podStump(), { at: [46, 0, -80], id: 'S1-ST2' }),
    ...place(podStump(), { at: [46, 0, -86], id: 'S1-ST3' }),
    ...place(scarecrow(), { at: [58, 0, -74], id: 'S1-SC1' }),
    ...place(scarecrow(), { at: [58, 0, -80], id: 'S1-SC2' }),
    ...place(scarecrow(), { at: [58, 0, -86], id: 'S1-SC3' }),
    box({ id: 'S1-LB', at: [64, 1.5, -80], size: [2, 3, 6], mat: 'wood', tag: 'target' }),
    box({ id: 'S1-F1', at: [64, 1.5, -39.5], size: [2, 3, 75], mat: 'wood' }),
    box({ id: 'S1-F2', at: [64, 1.5, -120.5], size: [2, 3, 75], mat: 'wood' }),
    ...spheres('S1-CB', cabbageR, cabbageAt, 'grass'),
    box({ id: 'S1-CW1', at: [86, 1.2, -60], size: [12, 2.4, 1.5], mat: 'hedge' }),
    box({ id: 'S1-CW2', at: [108, 1.2, -100], size: [12, 2.4, 1.5], mat: 'hedge' }),
    box({ id: 'S1-CW3', at: [126, 1.2, -124], size: [12, 2.4, 1.5], mat: 'hedge' }),
    box({ id: 'S1-CW4', at: [140, 1.2, -60], size: [12, 2.4, 1.5], mat: 'hedge' }),
    ...place(scarecrowTower(), { at: [100, 0, -50], id: 'S1-T1' }),
    ...place(scarecrowTower(), { at: [128, 0, -112], id: 'S1-T2' }),
    ...place(tractor(), { at: [78, 0, -92], yaw: 20, id: 'S1-TR1' }),
    ...place(shed(), { at: [124, 0, -62], yaw: 180, id: 'S1-SD1' }),
    ...place(shed(), { at: [144, 0, -96], yaw: 270, id: 'S1-SD2' }),
    box({ id: 'S1-CNL', at: [157, -0.2, -80], size: [10, 0.5, 156], mat: 'toxic' }),
    box({ id: 'S1-PB1', at: [157, 0.25, -136], size: [12, 0.5, 3], mat: 'wood' }),
    ...spheres('S1-PK', pumpR, pumpAt, 'gold'),
    box({ id: 'S1-BN1', at: [228, 4, -54.25], size: [18, 8, 0.5], mat: 'wood' }),
    box({ id: 'S1-BN2', at: [219.25, 4, -60], size: [0.5, 8, 12], mat: 'wood' }),
    box({ id: 'S1-BN3', at: [236.75, 4, -60], size: [0.5, 8, 12], mat: 'wood' }),
    box({ id: 'S1-BN4', at: [222.5, 4, -65.75], size: [7, 8, 0.5], mat: 'wood' }),
    box({ id: 'S1-BN5', at: [233.5, 4, -65.75], size: [7, 8, 0.5], mat: 'wood' }),
    box({ id: 'S1-BN6', at: [228, 8.25, -60], size: [19, 0.5, 13], mat: 'wood' }),
    box({ id: 'S1-BN7', at: [228, 4, -57], size: [17, 0.5, 5], mat: 'wood' }),
    stairs({ id: 'S1-BN8', at: [221.5, 2, -61.5], size: [3, 4, 7], yaw: 0, mat: 'wood' }),
    cylinder({ id: 'S1-SI', at: [250, 0, -50], r: 4, h: 14, mat: 'metal' }),
    cone({ id: 'S1-SI-cap', at: [250, 14, -50], r: 4.4, h: 3, mat: 'metal' }),
    box({ id: 'S1-HB1', at: [190, 0.6, -66], size: [2, 1.2, 1.2], mat: 'sand' }),
    box({ id: 'S1-HB2', at: [204, 0.6, -90], size: [2, 1.2, 1.2], mat: 'sand' }),
    box({ id: 'S1-HB3', at: [222, 0.6, -88], size: [2, 1.2, 1.2], mat: 'sand' }),
    box({ id: 'S1-HB4', at: [232, 1.2, -114], size: [2, 2.4, 1.2], mat: 'sand' }),
    box({ id: 'S1-HB5', at: [244, 0.6, -72], size: [2, 1.2, 1.2], mat: 'sand' }),
    box({ id: 'S1-HB6', at: [214, 1.2, -72], size: [2, 2.4, 1.2], mat: 'sand' }),
    ...place(beanstalk(), { at: [244, 0, -142], id: 'S1-BS' }),
    ...place(manaBloom(), { at: [52, 0, -92], id: 'MB1' }),
    ...place(manaBloom(), { at: [108, 0, -86], id: 'MB2' }),
    ...place(manaBloom(), { at: [174, 0, -80], id: 'MB3' }),
    ...place(manaBloom(), { at: [228, 4.5, -57], id: 'MB4' }),
    disc({ id: 'S1-MP1-pad', at: [95, 0.05, -54], r: 1.2, mat: 'neon' }),
    disc({ id: 'S1-MP2-pad', at: [123, 0.05, -108], r: 1.2, mat: 'neon' }),
    disc({ id: 'S1-MP3-pad', at: [149, 0.05, -80], r: 1.2, mat: 'neon' }),
    disc({ id: 'S1-MP4-pad', at: [165, 0.05, -84], r: 1.2, mat: 'neon' }),
    ...trees,
  ],
  weapons: [
    { id: 'W1', at: [80, 0.9, -94], gun: 'sniper', why: 'E1: Obamas on the towers, Sprouts across the field' },
  ],
  checkpoints: [
    { id: 'CP1', at: [34, 0, -80] },
    { id: 'CP2', at: [168, 0, -80], when: 'S1-E1.cleared' },
  ],
  mechanisms: [
    { kind: 'door', id: 'S1-GATE', at: [259, 2.5, -80], size: [1, 5, 6], opens: 'S1-E2.cleared' },
    { kind: 'shrine', id: 'SH-YEET-use', at: [34, 1, -80], spell: 'yeet' },
    { kind: 'seedPod', id: 'S1-POD1', at: [46, 1.1, -74], regrow: 12, damage: 150, radius: 4 },
    { kind: 'seedPod', id: 'S1-POD2', at: [46, 1.1, -80], regrow: 12, damage: 150, radius: 4 },
    { kind: 'seedPod', id: 'S1-POD3', at: [46, 1.1, -86], regrow: 12, damage: 150, radius: 4 },
    { kind: 'target', id: 'S1-LB-hp', at: [64, 1.5, -80], hp: 200, bulletMul: 0.2, podHits: 2 },
    { kind: 'target', id: 'S1-SC1-hp', at: [58, 1.2, -74], hp: 1 },
    { kind: 'target', id: 'S1-SC2-hp', at: [58, 1.2, -80], hp: 1 },
    { kind: 'target', id: 'S1-SC3-hp', at: [58, 1.2, -86], hp: 1 },
    { kind: 'jumpPad', id: 'S1-MP1', at: [95, 0.2, -54], r: 1.2, power: 11, to: [100, 5.5, -50] },
    { kind: 'jumpPad', id: 'S1-MP2', at: [123, 0.2, -108], r: 1.2, power: 11, to: [128, 5.5, -112] },
    { kind: 'jumpPad', id: 'S1-MP3', at: [149, 0.2, -80], r: 1.2, power: 9, to: [166, 0, -80] },
    { kind: 'jumpPad', id: 'S1-MP4', at: [165, 0.2, -84], r: 1.2, power: 9, to: [148, 0, -84] },
    { kind: 'jumpPad', id: 'S1-BS-P0', at: [236, 0.2, -142], r: 1.2, power: 11, to: [240.5, 5, -142] },
    { kind: 'jumpPad', id: 'S1-BS-P1', at: [240.5, 5.2, -142], r: 1.2, power: 11, to: [244, 10.5, -138.5] },
    { kind: 'jumpPad', id: 'S1-BS-P2', at: [244, 10.7, -138.5], r: 1.2, power: 11, to: [247.5, 16, -142] },
    { kind: 'jumpPad', id: 'S1-BS-P3', at: [247.5, 16.2, -142], r: 1.2, power: 11, to: [244, 21.5, -145.5] },
    { kind: 'hazard', id: 'S1-CNL-HZ', min: [152, -1, -158], max: [162, 2, -2], dps: 12, enemyDps: 40, element: 'toxic' },
    { kind: 'manaBloom', id: 'MB1-use', at: [52, 0.6, -92], mana: 50, regrow: 20 },
    { kind: 'manaBloom', id: 'MB2-use', at: [108, 0.6, -86], mana: 50, regrow: 20 },
    { kind: 'manaBloom', id: 'MB3-use', at: [174, 0.6, -80], mana: 50, regrow: 20 },
    { kind: 'manaBloom', id: 'MB4-use', at: [228, 4.8, -57], mana: 50, regrow: 20 },
    { kind: 'ammo', id: 'AB1', at: [30, 0.4, -84], ammoType: 'bullets', amount: 60 },
    { kind: 'ammo', id: 'AB2', at: [76, 0.4, -95], ammoType: 'sniper', amount: 8 },
    { kind: 'ammo', id: 'AB3', at: [168, 0.4, -76], ammoType: 'shells', amount: 12 },
    { kind: 'secret', id: 'S1-BONK', at: [244, 22.5, -145.5], modifier: 'floorIsLava' },
    { kind: 'secret', id: 'S1-AF1', at: [100, 6.2, -50], tickets: 15, story: 'Invoice: 400 scarecrows. None of them scare.' },
  ],
  encounters: [ENCOUNTERS.E1, ENCOUNTERS.E2],
  navLinks: [
    { from: { x: 95, z: -54 }, to: { x: 100, z: -50 }, kind: 'pad' },
    { from: { x: 123, z: -108 }, to: { x: 128, z: -112 }, kind: 'pad' },
    { from: { x: 149, z: -80 }, to: { x: 166, z: -80 }, kind: 'pad' },
    { from: { x: 165, z: -84 }, to: { x: 148, z: -84 }, kind: 'pad' },
  ],
};
