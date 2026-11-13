import { makeLevel } from '../assemble.js';
import { box } from '../kit.js';

const skyline = makeLevel({
  id: 'L06', name: 'Vape Cabal Skyline', stage: 'city', tier: 6, parTime: 22 * 60, jetpack: true,
  lighting: { weather: 'rain' },
  sections: [
    {
      id: 'S1', name: 'Freeway', length: 56, floor: 'metal',
      encounters: [{ id: 'E1', x: 18, space: 'rail', units: [['boomMidget', 3], ['riotMidget', 2]] }],
      weapons: [{ id: 'sg-traffic', x: 30, gun: 'shotgun', why: 'traffic jam' }],
      mechanisms: [{ kind: 'crusher', id: 'bus-lane', x: 24 }],
      secret: { x: 8, modifier: 'duckHunt' },
    },
    {
      id: 'S2', name: 'Crane Yard', length: 50, floor: 'metal',
      encounters: [{ id: 'E2', x: 16, space: 'vertical', units: [['jetObama', 3]] }],
      weapons: [{ id: 'sn-crane', x: 28, gun: 'sniper', why: 'crane cab overlook' }],
      mechanisms: [{ kind: 'zipline', id: 'roof-line', x: 20 }, { kind: 'mover', id: 'crane-hook', x: 34 }],
    },
    {
      id: 'S3', name: 'Rain Canyon', length: 50, floor: 'metal',
      encounters: [{ id: 'E3', x: 16, space: 'sky', units: [['bitbug', 4], ['balloonMidget', 2]] }],
      weapons: [{ id: 'mg-canyon', x: 12, gun: 'mg', why: 'bitbugs in the canyon' }],
    },
    {
      id: 'S4', name: 'Cabal Streets', length: 64, floor: 'concrete',
      intro: { title: 'Los Angeles', lines: ['Broccoli Head owns the night.', 'The clouds are not weather.'] },
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', units: [['broccoli', 1]] }],
      weapons: [{ id: 'bz-broc', x: 10, gun: 'bazooka', why: 'Broccoli Head' }],
    },
  ],
});

// Expand the decks around the original route. Keeping the centreline and encounter
// starts also keeps Broccoli Head's issued start and the authored pickup locations.
const deckWidths = { S1: 36, S2: 44, S3: 48, S4: 52 };
for (const section of skyline.sections) {
  const [floor, north, south] = section.geometry;
  const width = deckWidths[section.id];
  const edge = floor.at[2] - width / 2;
  // A seamless exit can switch sections up to 2 m before the next slab's original start.
  const overlap = section.id === 'S1' ? 0 : 2;
  for (const part of [floor, north, south]) {
    part.at[0] -= overlap / 2;
    part.size[0] += overlap;
  }
  floor.size[2] = width;
  north.at[2] = edge + north.size[2] / 2;
  south.at[2] = edge + width - south.size[2] / 2;
  for (const { activate, zone } of section.encounters) {
    activate.min[2] = edge + 1.2;
    activate.max[2] = edge + width - 1.2;
    zone.min[2] = edge + 1;
    zone.max[2] = edge + width - 1;
  }
  if (section.exit) {
    section.exit.min[2] = edge + 2;
    section.exit.max[2] = edge + width - 2;
  }
  for (const [side, z] of [['N', edge + 1.4], ['S', edge + width - 1.4]]) {
    section.geometry.push(box({
      id: `${section.id}-deck-edge${side}`, at: [floor.at[0], -.68, z],
      size: [floor.size[0], .8, 2.8], mat: 'metal',
    }));
  }
}
const centerZ = skyline.sections[0].start[2];
const halfWidth = Math.max(...Object.values(deckWidths)) / 2;
skyline.bounds.min[2] = centerZ - halfWidth - 6;
skyline.bounds.max[2] = centerZ + halfWidth + 6;

export const L06 = skyline;
