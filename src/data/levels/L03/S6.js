// S6 The Patch. Broccoli Head flees, then the runoff climbs to the levee.
import { box, cylinder, disc, polar, place, ramp, sphere } from './prim.js';
import { manaBloom, mound, podStump, truck } from './prefabs.js';
import { ENCOUNTERS } from './encounters.js';

// The chase climbs east. Hooks are above each lip. The south chute is the way back down.
const CHASE_ANCHORS = [
  { id: 'S6-GA-T1', at: [64, 5.5, -40], r: 2.2 },
  { id: 'S6-GA-T2', at: [96, 8.5, -40], r: 2.2 },
  { id: 'S6-GA-TRK', at: [134, 13, -44], r: 2.4 },
];

const planterBearings = [0, 60, 120, 180, 240, 300];

export const S6 = {
  id: 'S6',
  name: 'The Patch',
  origin: [741, 0, -189],
  start: [36, 0, -8],
  yaw: Math.PI,
  footprint: [150, 100],
  routeM: 210,
  navBounds: { min: [0, -100], max: [150, 0] },
  intro: {
    title: 'Something Smells Green',
    lines: ['The Floret Lord is only a sprout.', 'He will not stay for the whole fight.'],
  },
  geometry: [
    box({ id: 'S6-FL', at: [75, -0.25, -50], size: [400, 0.5, 400], mat: 'dirt' }),
    box({ id: 'S6-WN', at: [75, 6, -99], size: [150, 12, 2], mat: 'hedge' }),
    box({ id: 'S6-WW', at: [1, 6, -50], size: [2, 12, 100], mat: 'hedge' }),
    box({ id: 'S6-WE', at: [149, 6, -50], size: [2, 12, 100], mat: 'hedge' }),
    box({ id: 'S6-WS1', at: [16.5, 6, -1], size: [33, 12, 2], mat: 'hedge' }),
    box({ id: 'S6-WS2', at: [94.5, 6, -1], size: [111, 12, 2], mat: 'hedge' }),
    box({ id: 'S6-AW', at: [11, 2, -40], size: [2, 4, 48], mat: 'hedge' }),
    box({ id: 'S6-AN', at: [36, 2, -65], size: [48, 4, 2], mat: 'hedge' }),
    box({ id: 'S6-AS1', at: [23, 2, -15], size: [22, 4, 2], mat: 'hedge' }),
    box({ id: 'S6-AS2', at: [49, 2, -15], size: [22, 4, 2], mat: 'hedge' }),
    ...planterBearings.map((b, i) => box({
      id: `S6-PL${i + 1}`,
      at: polar(36, -40, 9, b, 0.6),
      size: [3, 1.2, 1.2],
      mat: 'wood',
    })),
    sphere({ id: 'S6-GV1', at: [20, 1.9, -24], r: 2.5, mat: 'grass' }),
    sphere({ id: 'S6-GV2', at: [52, 1.9, -24], r: 2.5, mat: 'grass' }),
    sphere({ id: 'S6-GV3', at: [20, 1.9, -58], r: 2.5, mat: 'grass' }),
    cylinder({ id: 'S6-PED', at: [36, 0, -58], r: 2, h: 0.6, mat: 'metal' }),
    box({ id: 'S6-T1', at: [75, 2.75, -40], size: [30, 0.5, 56], mat: 'grass' }),
    box({ id: 'S6-T2', at: [105, 5.75, -40], size: [30, 0.5, 56], mat: 'grass' }),
    box({ id: 'S6-LV', at: [135, 8.75, -50], size: [30, 0.5, 96], mat: 'concrete' }),
    box({ id: 'S6-FN', at: [90, 6, -83.5], size: [60, 12, 31], mat: 'hedge' }),
    box({ id: 'S6-FS', at: [90, 6, -6], size: [60, 12, 10], mat: 'hedge' }),
    ramp({ id: 'S6-R1', at: [55, 1.5, -56], size: [10, 3, 5], yaw: 90, mat: 'wood' }),
    ramp({ id: 'S6-R2', at: [85, 4.5, -24], size: [10, 3, 5], yaw: 90, mat: 'wood' }),
    ramp({ id: 'S6-R3', at: [115, 7.5, -56], size: [10, 3, 5], yaw: 90, mat: 'wood' }),
    // Yaw 90 rises toward +x, so this chute drops from terrace 2's south edge to the ground.
    ramp({ id: 'S6-SLIDE', at: [84, 3, -18], size: [24, 6, 8], yaw: 90, mat: 'wood' }),
    box({ id: 'S6-HCB', at: [79, 4, -24], size: [1, 2, 5], mat: 'sand', tag: 'target' }),
    ...place(podStump(), { at: [64, 3, -48], id: 'S6-POD1' }),
    ...place(podStump(), { at: [68, 3, -30], id: 'S6-POD2' }),
    ...place(mound(), { at: [70, 3, -44], id: 'S6-EM1' }),
    ...place(mound(), { at: [74, 3, -30], id: 'S6-EM2' }),
    ...place(mound(), { at: [98, 6, -36], id: 'S6-EM3' }),
    ...place(mound(), { at: [106, 6, -50], id: 'S6-EM4' }),
    ...place(truck(), { at: [134, 9, -44], yaw: 0, id: 'S6-TRK' }),
    cylinder({ id: 'S6-WT', at: [140, 9, -90], r: 3, h: 18, mat: 'hedge' }),
    sphere({ id: 'S6-WT-head', at: [140, 30, -90], r: 6, mat: 'hedge' }),
    sphere({ id: 'S6-WT-f1', at: [134, 28, -90], r: 3, mat: 'hedge' }),
    sphere({ id: 'S6-WT-f2', at: [146, 28, -90], r: 3, mat: 'hedge' }),
    sphere({ id: 'S6-WT-f3', at: [140, 28, -84], r: 3, mat: 'hedge' }),
    ...place(manaBloom(), { at: [16, 0, -40], id: 'MB20' }),
    disc({ id: 'S6-MP1-pad', at: [86, 3.05, -54], r: 1.2, mat: 'neon' }),
    disc({ id: 'S6-MP2-pad', at: [116, 6.05, -26], r: 1.2, mat: 'neon' }),
    ...CHASE_ANCHORS.map((a) => sphere({ id: `${a.id}-mark`, at: a.at, r: 0.45, mat: 'neon' })),
  ],
  weapons: [],
  checkpoints: [],
  mechanisms: [
    { kind: 'door', id: 'S6-LG', at: [120.5, 11, -56], size: [1, 4, 5], opens: 'S6-F2.fled' },
    { kind: 'door', id: 'PT-N', at: [36, 1, -65], size: [2.4, 3, 0.6] },
    { kind: 'door', id: 'PT-W', at: [11, 1, -40], size: [0.6, 3, 2.4] },
    { kind: 'risingHazard', id: 'S6-RISE', min: [0, -1, -100], max: [120, 8.5, 0], rate: 0.18, dps: 12, element: 'toxic', starts: 'S6-F2.fled' },
    { kind: 'target', id: 'S6-HCB-hp', at: [79, 4, -24], hp: 150, bulletSeconds: 8, podHits: 1 },
    { kind: 'seedPod', id: 'S6-POD1-use', at: [64, 4.1, -48], regrow: 12, damage: 150, radius: 4 },
    { kind: 'seedPod', id: 'S6-POD2-use', at: [68, 4.1, -30], regrow: 12, damage: 150, radius: 4 },
    { kind: 'mushroomPad', id: 'S6-MP1', at: [86, 3.2, -54], r: 1.2, power: 9, to: [93, 6, -54] },
    { kind: 'mushroomPad', id: 'S6-MP2', at: [116, 6.2, -26], r: 1.2, power: 9, to: [123, 9, -28] },
    { kind: 'power', id: 'PU4', at: [48, 0.5, -50], modifier: 'turbo' },
    { kind: 'manaBloom', id: 'MB20-use', at: [16, 0.6, -40], mana: 50, regrow: 20 },
    { kind: 'ammo', id: 'AB22', at: [36, 0.4, -8], ammoType: 'bullets', amount: 60 },
  ],
  encounters: [ENCOUNTERS.F2, ENCOUNTERS.F3],
  grappleAnchors: CHASE_ANCHORS,
  navLinks: [
    { from: { x: 86, z: -54 }, to: { x: 93, z: -54 }, kind: 'pad' },
    { from: { x: 116, z: -26 }, to: { x: 123, z: -28 }, kind: 'pad' },
  ],
};
