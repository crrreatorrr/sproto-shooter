import { makeLevel } from '../assemble.js';
import { box } from '../kit.js';

const office = makeLevel({
  id: 'L08', name: 'Government Office', stage: 'office', tier: 8, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Lobby', length: 48, floor: 'metal',
      encounters: [{ id: 'E1', x: 16, space: 'interior', units: [['glowieAgent', 4]] }],
      weapons: [{ id: 'mg-lobby', x: 28, gun: 'mg', why: 'the lobby' }],
      mechanisms: [
        { kind: 'laser', id: 'lobby-laser', x: 22 },
        { kind: 'door', id: 'turnstile', x: 34, opens: 'E1.cleared' },
      ],
      secret: { x: 8, modifier: 'redTape' },
    },
    {
      id: 'S2', name: 'Cubicle Farm', length: 48, floor: 'metal',
      encounters: [{ id: 'E2', x: 16, space: 'corridor', units: [['riotMidget', 2], ['glowieAgent', 2]] }],
      weapons: [{ id: 'sg-cubes', x: 28, gun: 'shotgun', why: 'cubicle farm' }],
      mechanisms: [{ kind: 'elevator', id: 'lift-2', x: 34, y: 0.4 }],
    },
    {
      id: 'S3', name: 'Server Floor', length: 48, floor: 'metal',
      encounters: [{ id: 'E3', x: 16, space: 'interior', units: [['auditSniper', 2], ['hexAcolyte', 2]] }],
      weapons: [{ id: 'sn-atrium', x: 28, gun: 'sniper', why: 'the atrium sightline' }],
      mechanisms: [{ kind: 'laser', id: 'server-grid', x: 22, dps: 8 }],
    },
    {
      id: 'S4', name: 'The Roof', length: 68, floor: 'metal',
      intro: { title: 'Government Office', lines: ['Glowie has a badge and a flashbang.', 'Look away.'] },
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', units: [['glowie', 1]] }],
      weapons: [{ id: 'bz-glowie', x: 10, gun: 'bazooka', why: 'Glowie on the roof' }],
    },
  ],
});

const rooms = {
  S1: { width: 36, ceiling: 9.4 },
  S2: { width: 40, ceiling: 7.3 },
  S3: { width: 44, ceiling: 8.4 },
  S4: { width: 52 },
};

for (const sec of office.sections) {
  const { width, ceiling } = rooms[sec.id];
  const [floor, north, south] = sec.geometry;
  const center = floor.at[2];
  const z0 = center - width / 2, z1 = center + width / 2;
  if (sec.id !== 'S1') {
    for (const part of [floor, north, south]) {
      part.at[0] -= 1.5;
      part.size[0] += 3;
    }
  }
  floor.size[2] = width;
  north.at[2] = z0 + .3;
  south.at[2] = z1 - .3;
  for (const { zone, activate } of sec.encounters) {
    zone.min[2] = z0 + 1;
    zone.max[2] = z1 - 1;
    activate.min[2] = z0 + 1.2;
    activate.max[2] = z1 - 1.2;
  }
  if (sec.exit) {
    sec.exit.min[2] = z0 + 2;
    sec.exit.max[2] = z1 - 2;
  }
  if (!ceiling) continue;
  sec.legacyCeiling = ceiling;
  const [span] = floor.size;
  const x0 = floor.at[0] - span / 2;
  const x1 = floor.at[0] + span / 2;
  for (const wall of [north, south]) {
    wall.at[1] = ceiling / 2;
    wall.size[1] = ceiling;
  }
  sec.geometry.push(
    box({ id: `${sec.id}-ceiling`, at: [floor.at[0], ceiling + .25, center], size: [span, .5, width], mat: 'metal' }),
    box({ id: `${sec.id}-rear`, at: [x0 + .3, ceiling / 2, center], size: [.6, ceiling, width], mat: 'metal' }),
    box({ id: `${sec.id}-end`, at: [x1 - .3, ceiling / 2, center], size: [.6, ceiling, width], mat: 'metal' }),
  );
  const start = sec.start[0] - 3.5;
  const island = (id, x, z, length, height, depth) => sec.geometry.push(box({
    id: `${sec.id}-${id}`, at: [start + x, height / 2, z], size: [length, height, depth], mat: 'metal', tag: 'cover',
  }));
  if (sec.id === 'S1') island('desk', 12.5, .65, 6.70, 1.50, 1.75);
  if (sec.id === 'S2') {
    for (const [i, x] of [10.3, 19.3, 31.5].entries()) {
      island(`podN${i}`, x, 1.8, 5.95, 1.62, 1.44);
      island(`podS${i}`, x + 1.4, 20.2, 5.95, 1.62, 1.44);
    }
  }
  if (sec.id === 'S3') {
    for (const [i, x] of [8.4, 16.9, 29.9, 39.4].entries()) {
      island(`rackN${i}`, x, .6, 4.72, 3.02, 1.46);
      island(`rackS${i}`, x + 1.2, 21.4, 4.72, 3.02, 1.46);
    }
  }
}

office.bounds.min[2] = -21;
office.bounds.max[2] = 43;

export const L08 = office;
