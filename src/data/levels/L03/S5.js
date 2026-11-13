// S5 The Rootway. Arena centre C = (45, 0, -80). Bearings are clockwise from north.
import { box, cylinder, disc, polar, place, rotY, sphere } from './prim.js';
import { manaBloom, mound, podStump, rootArch } from './prefabs.js';
import { ENCOUNTERS } from './encounters.js';

// High points inside the lockdown room so a swing stays in the Hex fight.
const HEX_ANCHORS = [
  { id: 'S5-GA-N', at: [45, 9, -108], r: 2.4 },
  { id: 'S5-GA-E', at: [73, 9, -80], r: 2.4 },
  { id: 'S5-GA-S', at: [45, 9, -52], r: 2.4 },
  { id: 'S5-GA-W', at: [17, 9, -80], r: 2.4 },
];

function arenaWalls() {
  const parts = [];
  for (let i = 0; i < 16; i++) {
    const bearing = i * 22.5;
    const at = polar(45, -80, 35, bearing, 6);
    const tag = String(i).padStart(2, '0');
    if (i === 0 || i === 8) {
      for (const side of [-1, 1]) {
        const [dx, dz] = rotY(side * 4.5, 0, bearing);
        parts.push(box({
          id: `S5-W${tag}${side < 0 ? 'a' : 'b'}`,
          at: [at[0] + dx, 6, at[2] + dz],
          size: [5, 12, 2],
          yaw: bearing,
          mat: 'rock',
        }));
      }
    } else {
      parts.push(box({
        id: `S5-W${tag}`,
        at,
        size: [14.2, 12, 2],
        yaw: bearing,
        mat: 'rock',
      }));
    }
  }
  return parts;
}

function floodZones() {
  const zones = [];
  for (let i = 0; i < 16; i++) {
    const bearing = i * 22.5;
    const at = polar(45, -80, 31, bearing, 0.5);
    zones.push({
      kind: 'hazardSet',
      id: `S5-FLD${String(i).padStart(2, '0')}`,
      at,
      size: [13, 1, 6],
      yaw: bearing,
      enabled: false,
      dps: 12,
      enemyDps: 40,
      element: 'toxic',
      starts: 'F1.hp<=0.25',
    });
  }
  return zones;
}

const boulderBearings = [30, 90, 150, 210, 270, 330];
const podBearings = [0, 60, 120, 180, 240, 300];
const moundBearings = [20, 100, 140, 220, 260, 340];
const bloomBearings = [60, 180, 300];

export const S5 = {
  id: 'S5',
  name: 'The Rootway',
  origin: [732, 0, -80],
  start: [45, 0, -4],
  yaw: Math.PI,
  footprint: [90, 120],
  routeM: 110,
  navBounds: { min: [0, -120], max: [90, 0] },
  exit: { min: [41, -1, -120], max: [49, 6, -114] },
  intro: { title: 'The Compost Hex', lines: ['Sahil left a shade to guard the crop.', 'It eats mana. Feed it its own orbs.'] },
  geometry: [
    box({ id: 'S5-FL', at: [45, -0.25, -60], size: [400, 0.5, 400], mat: 'dirt' }),
    box({ id: 'S5-HW1', at: [27, 2.5, -8], size: [2, 5, 16], mat: 'wood' }),
    box({ id: 'S5-HW2', at: [63, 2.5, -8], size: [2, 5, 16], mat: 'wood' }),
    box({ id: 'S5-HW3a', at: [32, 2.5, -17], size: [10, 5, 2], mat: 'wood' }),
    box({ id: 'S5-HW3b', at: [58, 2.5, -17], size: [10, 5, 2], mat: 'wood' }),
    box({ id: 'S5-TW1', at: [37, 2.5, -31], size: [2, 5, 28], mat: 'wood' }),
    box({ id: 'S5-TW2', at: [53, 2.5, -31], size: [2, 5, 28], mat: 'wood' }),
    ...place(rootArch(7.3), { at: [45, 0, -22], id: 'S5-AR1' }),
    ...place(rootArch(7.3), { at: [45, 0, -31], id: 'S5-AR2' }),
    ...place(rootArch(7.3), { at: [45, 0, -40], id: 'S5-AR3' }),
    ...arenaWalls(),
    disc({ id: 'S5-LID', at: [45, 12, -80], r: 35, mat: 'glass' }),
    cylinder({ id: 'S5-HEAP', at: [45, -0.2, -80], r: 6, h: 0.5, mat: 'dirt' }),
    cylinder({ id: 'TOT-N', at: [45, 0, -102], r: 0.8, h: 4, mat: 'wood' }),
    sphere({ id: 'TOT-N-eye', at: [45, 4.4, -102], r: 0.7, mat: 'neon' }),
    cylinder({ id: 'TOT-SE', at: [64.1, 0, -69], r: 0.8, h: 4, mat: 'wood' }),
    sphere({ id: 'TOT-SE-eye', at: [64.1, 4.4, -69], r: 0.7, mat: 'neon' }),
    cylinder({ id: 'TOT-SW', at: [25.9, 0, -69], r: 0.8, h: 4, mat: 'wood' }),
    sphere({ id: 'TOT-SW-eye', at: [25.9, 4.4, -69], r: 0.7, mat: 'neon' }),
    ...boulderBearings.map((b, i) => {
      const at = polar(45, -80, 14, b, 1.4);
      return { kind: 'sphere', id: `S5-B${i}`, at, r: 2, mat: 'rock' };
    }),
    box({ id: 'S5-L1', at: polar(45, -80, 27, 90, 0.6), size: [1.5, 1.2, 8], yaw: 90, mat: 'wood' }),
    box({ id: 'S5-L2', at: polar(45, -80, 27, 210, 0.6), size: [1.5, 1.2, 8], yaw: 210, mat: 'wood' }),
    box({ id: 'S5-L3', at: polar(45, -80, 27, 330, 0.6), size: [1.5, 1.2, 8], yaw: 330, mat: 'wood' }),
    ...podBearings.flatMap((b, i) => place(podStump(), { at: polar(45, -80, 18, b, 0), id: `S5-POD${i + 1}` })),
    ...moundBearings.flatMap((b, i) => place(mound(), { at: polar(45, -80, 26, b, 0), id: `S5-RM${i + 1}` })),
    ...place(manaBloom(), { at: [45, 0, -30], id: 'MB16' }),
    ...bloomBearings.flatMap((b, i) => place(manaBloom(), { at: polar(45, -80, 24, b, 0), id: `MB${17 + i}` })),
    disc({ id: 'S5-THR', at: [45, 0.05, -52], r: 2, mat: 'neon' }),
    ...HEX_ANCHORS.map((a) => sphere({ id: `${a.id}-mark`, at: a.at, r: 0.45, mat: 'neon' })),
  ],
  weapons: [
    { id: 'W5', at: [41, 0.9, -52], gun: 'mg', why: 'F1: the finale section holds its own gun' },
  ],
  checkpoints: [
    { id: 'CP9', at: [45, 0, -4] },
    { id: 'CP10', at: [45, 0, -116], when: 'S5-F1.cleared' },
  ],
  mechanisms: [
    { kind: 'door', id: 'LD3-IN', at: [45, 6, -45.3], size: [4, 12, 0.6] },
    { kind: 'door', id: 'LD3-OUT', at: [45, 6, -114.7], size: [4, 12, 0.6] },
    { kind: 'depot', id: 'DP2', at: [39, 0, -8] },
    { kind: 'target', id: 'TOT-N-hp', at: [45, 2, -102], hp: 240, bark: true },
    { kind: 'target', id: 'TOT-SE-hp', at: [64.1, 2, -69], hp: 240, bark: true },
    { kind: 'target', id: 'TOT-SW-hp', at: [25.9, 2, -69], hp: 240, bark: true },
    { kind: 'hazard', id: 'TOT-SW-HZ', min: [22, -1, -73], max: [30, 3, -65], dps: 12, enemyDps: 40, stripsBark: true, element: 'toxic' },
    { kind: 'hazard', id: 'S5-BARK', min: [-4, -2, -124], max: [94, 8, 8], dps: 0, enemyDps: 0.01, stripsBark: true, element: 'toxic' },
    ...podBearings.map((b, i) => ({
      kind: 'seedPod', id: `S5-POD-use${i + 1}`, at: polar(45, -80, 18, b, 1.1), regrow: 12, damage: 150, radius: 4,
    })),
    ...floodZones(),
    { kind: 'power', id: 'PU3', at: [45, 1, -80], modifier: 'manaSurge', starts: 'F1.part2' },
    { kind: 'manaBloom', id: 'MB16-use', at: [45, 0.6, -30], mana: 50, regrow: 20 },
    ...bloomBearings.map((b, i) => ({
      kind: 'manaBloom', id: `MB${17 + i}-use`, at: polar(45, -80, 24, b, 0.6), mana: 50, regrow: 20,
    })),
    { kind: 'ammo', id: 'AB19', at: [49, 0.4, -52], ammoType: 'bullets', amount: 60 },
    { kind: 'ammo', id: 'AB20', at: [41, 0.4, -58], ammoType: 'shells', amount: 12 },
    { kind: 'ammo', id: 'AB21', at: [45, 0.4, -117], ammoType: 'sniper', amount: 8 },
    { kind: 'ammoCrate', id: 'RC3', at: [45, 0.4, -84], uses: 3, fraction: 0.5 },
    { kind: 'chest', id: 'L3-CHEST', at: [45, 0.6, -80], opens: 'S5-F1.cleared', guns: 2, tier: 'rare' },
  ],
  encounters: [ENCOUNTERS.F1],
  grappleAnchors: HEX_ANCHORS,
};
