import { makeLevel } from '../assemble.js';
import { box } from '../kit.js';

const ruins = makeLevel({
  id: 'L09', name: 'Moonlit Ruins', stage: 'moonlit', tier: 9, parTime: 28 * 60, jetpack: 'pickup',
  sections: [
    {
      id: 'S1', name: 'Ruin Plains', length: 72, floor: 'rock',
      encounters: [{ id: 'E1', x: 18, space: 'field', units: [['glowieAgent', 2], ['obama', 2], ['midget', 2]] }],
      weapons: [
        { id: 'mg-camp', x: 10, gun: 'mg', why: 'camp cache' },
        { id: 'sn-camp', x: 14, gun: 'sniper', why: 'camp cache' },
        { id: 'bz-camp', x: 18, gun: 'bazooka', why: 'camp cache' },
      ],
      mechanisms: [
        { kind: 'portal', id: 'moon-gate', x: 30, dx: 8 },
        { kind: 'jetpack', id: 'moon-pack', x: 36 },
        { kind: 'hazard', id: 'low-g', x: 24, slow: 0, dps: 0 },
      ],
      secret: { x: 8, modifier: 'swarmSurge' },
    },
    {
      id: 'S2', name: 'Catacombs', length: 64, floor: 'rock',
      intro: { title: 'Descent', lines: ['The plains were the map.', 'The dead keep the other one.'] },
      encounters: [{ id: 'E2', x: 16, space: 'interior', units: [['hexAcolyte', 3], ['sewerMidget', 3]] }],
      weapons: [{ id: 'sg-cata', x: 28, gun: 'shotgun', why: 'catacomb standee' }],
    },
    {
      id: 'S3', name: 'Moon Gate', length: 76,
      intro: { title: 'The Moon Gate', lines: ['Two Big Obamas. One key.', 'Something older is waking up.'] },
      encounters: [
        { id: 'E3', x: 14, space: 'arena', units: [['bigObama', 2]] },
        { id: 'E4', x: 28, space: 'arena', objective: 'boss', fleeAt: 0.7, units: [['tinubu', 1]] },
      ],
    },
  ],
});

// Enlarge the existing decks around the original centreline. Portal, jetpack,
// weapons and encounter spawn points keep their authored section-local positions.
const widths = { S1: 46, S2: 54, S3: 66 };
for (const sec of ruins.sections) {
  const [floor, north, south] = sec.geometry;
  const width = widths[sec.id];
  const center = floor.at[2];
  const z0 = center - width / 2, z1 = center + width / 2;
  if (sec.id !== 'S1') {
    // Incoming stone supports a handoff at the earliest exit position.
    for (const part of [floor, north, south]) {
      part.at[0] -= 1.5;
      part.size[0] += 3;
    }
  }
  floor.size[2] = width;
  north.at[2] = z0 + north.size[2] / 2;
  south.at[2] = z1 - south.size[2] / 2;
  for (const { activate, zone } of sec.encounters) {
    activate.min[2] = z0 + 1.2;
    activate.max[2] = z1 - 1.2;
    zone.min[2] = z0 + 1;
    zone.max[2] = z1 - 1;
  }
  if (sec.exit) {
    sec.exit.min[2] = z0 + 2;
    sec.exit.max[2] = z1 - 2;
  }
  if (sec.id === 'S2') continue;
  for (const [side, z] of [['N', z0 + 1.1], ['S', z1 - 1.1]]) {
    sec.geometry.push(box({
      id: `${sec.id}-terrace-edge${side}`, at: [floor.at[0], -.92, z],
      size: [floor.size[0], .9, 2.2], mat: 'stone',
    }));
  }
}

const centerZ = ruins.sections[0].start[2];
ruins.bounds.min[2] = centerZ - widths.S3 / 2 - 6;
ruins.bounds.max[2] = centerZ + widths.S3 / 2 + 6;

export const L09 = ruins;
