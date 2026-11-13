import { makeLevel } from '../assemble.js';
import { box } from '../kit.js';

const caldera = makeLevel({
  id: 'L10', name: 'Hellfire Caldera', stage: 'volcano', tier: 10, parTime: 30 * 60, jetpack: true,
  // Give both approach decks more room while keeping the Tinubu checkpoint in place.
  originX: -28,
  sections: [
    {
      id: 'S1', name: 'Ridge Trail', length: 68, floor: 'rock',
      encounters: [{ id: 'E1', x: 18, space: 'ledge', units: [['miniTinubu', 2], ['auditSniper', 2]] }],
      weapons: [
        { id: 'mg-cache', x: 8, gun: 'mg', why: 'ridge cache' },
        { id: 'sg-cache', x: 12, gun: 'shotgun', why: 'ridge cache' },
        { id: 'sn-cache', x: 16, gun: 'sniper', why: 'ridge cache' },
        { id: 'bz-cache', x: 20, gun: 'bazooka', why: 'ridge cache' },
      ],
      mechanisms: [{ kind: 'bridge', id: 'rope-bridge', x: 32 }, { kind: 'barrel', id: 'ridge-barrel', x: 26 }],
      secret: { x: 6, modifier: 'ironSproto' },
    },
    {
      id: 'S2', name: 'Geyser Fields', length: 66, floor: 'rock',
      encounters: [{ id: 'E2', x: 16, space: 'field', units: [['boomMidget', 3], ['jetObama', 2]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'geyser', x: 12, power: 13 },
        { kind: 'hazard', id: 'lava-pool', x: 28, dps: 16 },
      ],
    },
    {
      id: 'S3', name: 'The Caldera', length: 76, floor: 'rock',
      intro: { title: 'Hellfire Caldera', lines: ['Tinubu the Unshackled Demon.', 'This is the audit.'] },
      encounters: [{ id: 'E3', x: 16, space: 'arena', objective: 'boss', units: [['tinubu', 1]] }],
    },
    {
      id: 'S4', name: 'Eruption', length: 72, floor: 'rock',
      intro: { title: 'ERUPTION', lines: ['The Demon is down. The volcano disagrees.', 'Fly.'] },
      encounters: [{ id: 'E4', x: 16, space: 'sky', units: [['flyingMidget', 3], ['bitbug', 3]] }],
      mechanisms: [{ kind: 'fuel', id: 'last-fuel', x: 10 }, { kind: 'jumpPad', id: 'vent', x: 24, power: 14 }],
    },
  ],
});

const widths = { S1: 38, S2: 48, S3: 62, S4: 66 };
for (const sec of caldera.sections) {
  const [floor, north, south] = sec.geometry;
  const width = widths[sec.id];
  const center = floor.at[2];
  const z0 = center - width / 2, z1 = center + width / 2;
  // Keep ground under the earliest exit as the next section takes over.
  const overlap = sec.id === 'S1' ? 0 : 3;
  for (const part of [floor, north, south]) {
    part.at[0] -= overlap / 2;
    part.size[0] += overlap;
  }
  floor.size[2] = width;
  north.at[2] = z0 + .3;
  south.at[2] = z1 - .3;
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
  const bridge = sec.mechanisms.find(m => m.kind === 'bridge');
  if (bridge) bridge.width = 4;
  for (const [side, z] of [['N', z0 + 1.2], ['S', z1 - 1.2]]) {
    sec.geometry.push(box({
      id: `${sec.id}-basalt-edge${side}`, at: [floor.at[0], -.86, z],
      size: [floor.size[0], .82, 2.4], mat: 'rock',
    }));
  }
}
caldera.bounds.min[2] = 11 - widths.S4 / 2 - 6;
caldera.bounds.max[2] = 11 + widths.S4 / 2 + 6;

export const L10 = caldera;
