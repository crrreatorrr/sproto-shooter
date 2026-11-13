import { makeLevel } from '../assemble.js';
import { box } from '../kit.js';

const underworks = makeLevel({
  id: 'L07', name: 'Hellfire Underworks', stage: 'volcano', tier: 7, parTime: 16 * 60,
  sections: [
    {
      id: 'S1', name: 'Shafts', length: 60, floor: 'rock',
      encounters: [{ id: 'E1', x: 16, space: 'interior', units: [['miniTinubu', 2], ['midget', 2]] }],
      weapons: [{ id: 'sg-shaft', x: 28, gun: 'shotgun', why: 'chargers in the shafts' }],
      mechanisms: [{ kind: 'barrel', id: 'ore-barrel', x: 20 }],
      secret: { x: 8, modifier: 'lightsOut' },
    },
    {
      id: 'S2', name: 'Cart Run', length: 64, floor: 'rock',
      encounters: [{ id: 'E2', x: 18, space: 'rail', units: [['midget', 4]] }],
      weapons: [{ id: 'sn-cart', x: 12, gun: 'sniper', why: 'the cart ride' }],
      mechanisms: [{ kind: 'rail', id: 'mine-cart', x: 22 }],
    },
    {
      id: 'S3', name: 'Furnace Gallery', length: 64, floor: 'rock',
      encounters: [{ id: 'E3', x: 16, space: 'arena', units: [['miniTinubu', 2], ['boomMidget', 2]] }],
      mechanisms: [{ kind: 'hazard', id: 'lava-run', x: 26, dps: 14 }, { kind: 'crusher', id: 'press', x: 32 }],
    },
    {
      id: 'S4', name: 'Meltdown', length: 64, floor: 'rock',
      intro: { title: 'MELTDOWN', lines: ['Reactors at 300%.', "Tinubu calls this a controlled burn. Run."] },
      encounters: [{ id: 'E4', x: 16, space: 'corridor', units: [['miniTinubu', 2]] }],
      weapons: [{ id: 'bz-reactor', x: 10, gun: 'bazooka', why: 'the reactor ring' }],
    },
  ],
});

// The wider decks share the original centreline. The rail and pickups keep their
// lateral positions, and the side approaches can also activate each encounter.
const widths = { S1: 34, S2: 40, S3: 46, S4: 48 };
for (const sec of underworks.sections) {
  const [floor, north, south] = sec.geometry;
  const half = widths[sec.id] / 2;
  const z0 = floor.at[2] - half;
  const z1 = floor.at[2] + half;
  if (sec.id !== 'S1') {
    // The exit can switch sections before the original incoming slab starts.
    for (const part of [floor, north, south]) {
      part.at[0] -= 1;
      part.size[0] += 2;
    }
  }
  floor.size[2] = 2 * half;
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
  for (const [side, z] of [['N', z0 + 1.25], ['S', z1 - 1.25]]) {
    sec.geometry.push(box({
      id: `${sec.id}-deck-edge${side}`, at: [floor.at[0], -.79, z],
      size: [floor.size[0], .6, 2.5], mat: 'metal',
    }));
  }
}
const halfWidth = Math.max(...Object.values(widths)) / 2;
const centerZ = underworks.sections[0].start[2];
underworks.bounds.min[2] = centerZ - halfWidth - 6;
underworks.bounds.max[2] = centerZ + halfWidth + 6;

export const L07 = underworks;
