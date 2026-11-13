// The Great Sproto Audit. Ten levels, one section chain each.
// L01–L06 and L08 register themselves from their own folders. The other levels
// still live here until each one moves into src/data/levels/LNN/.
import { makeLevel } from './assemble.js';
import { L01 } from './L01/index.js';
import { L02 } from './L02/index.js';
import { L03 } from './L03/index.js';
import { L04 } from './L04/index.js';
import { L05 } from './L05/index.js';
import { L06 } from './L06/index.js';
import { L08 } from './L08/index.js';

export { L01, L02, L03, L04, L05, L06, L08 };

const card = (title, lines) => ({ title, lines });

export const L07 = makeLevel({
  id: 'L07', name: 'Hellfire Underworks', stage: 'volcano', tier: 7, parTime: 16 * 60,
  sections: [
    {
      id: 'S1', name: 'Shafts', length: 48, floor: 'rock',
      encounters: [{ id: 'E1', x: 16, space: 'interior', units: [['miniTinubu', 2], ['midget', 2]] }],
      weapons: [{ id: 'sg-shaft', x: 28, gun: 'shotgun', why: 'chargers in the shafts' }],
      mechanisms: [{ kind: 'barrel', id: 'ore-barrel', x: 20 }],
      secret: { x: 8, modifier: 'lightsOut' },
    },
    {
      id: 'S2', name: 'Cart Run', length: 52, floor: 'rock',
      encounters: [{ id: 'E2', x: 18, space: 'rail', units: [['midget', 4]] }],
      weapons: [{ id: 'sn-cart', x: 12, gun: 'sniper', why: 'the cart ride' }],
      mechanisms: [{ kind: 'rail', id: 'mine-cart', x: 22 }],
    },
    {
      id: 'S3', name: 'Furnace Gallery', length: 48, floor: 'rock',
      encounters: [{ id: 'E3', x: 16, space: 'arena', units: [['miniTinubu', 2], ['boomMidget', 2]] }],
      mechanisms: [{ kind: 'hazard', id: 'lava-run', x: 26, dps: 14 }, { kind: 'crusher', id: 'press', x: 32 }],
    },
    {
      id: 'S4', name: 'Meltdown', length: 48, floor: 'rock',
      intro: card('MELTDOWN', ['Reactors at 300%.', "Tinubu calls this a controlled burn. Run."]),
      encounters: [{ id: 'E4', x: 16, space: 'corridor', units: [['miniTinubu', 2]] }],
      weapons: [{ id: 'bz-reactor', x: 10, gun: 'bazooka', why: 'the reactor ring' }],
    },
  ],
});

export const L09 = makeLevel({
  id: 'L09', name: 'Moonlit Ruins', stage: 'moonlit', tier: 9, parTime: 28 * 60, jetpack: 'pickup',
  sections: [
    {
      id: 'S1', name: 'Ruin Plains', length: 56, floor: 'rock',
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
      id: 'S2', name: 'Catacombs', length: 50, floor: 'rock',
      intro: card('Descent', ['The plains were the map.', 'The dead keep the other one.']),
      encounters: [{ id: 'E2', x: 16, space: 'interior', units: [['hexAcolyte', 3], ['sewerMidget', 3]] }],
      weapons: [{ id: 'sg-cata', x: 28, gun: 'shotgun', why: 'catacomb standee' }],
    },
    {
      id: 'S3', name: 'Moon Gate', length: 50,
      intro: card('The Moon Gate', ['Two Big Obamas. One key.', 'Something older is waking up.']),
      encounters: [
        { id: 'E3', x: 14, space: 'arena', units: [['bigObama', 2]] },
        { id: 'E4', x: 28, space: 'arena', objective: 'boss', fleeAt: 0.7, units: [['tinubu', 1]] },
      ],
    },
  ],
});

export const L10 = makeLevel({
  id: 'L10', name: 'Hellfire Caldera', stage: 'volcano', tier: 10, parTime: 30 * 60, jetpack: true,
  sections: [
    {
      id: 'S1', name: 'Ridge Trail', length: 54, floor: 'rock',
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
      id: 'S2', name: 'Geyser Fields', length: 52, floor: 'rock',
      encounters: [{ id: 'E2', x: 16, space: 'field', units: [['boomMidget', 3], ['jetObama', 2]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'geyser', x: 12, power: 13 },
        { kind: 'hazard', id: 'lava-pool', x: 28, dps: 16 },
      ],
    },
    {
      id: 'S3', name: 'The Caldera', length: 50,
      intro: card('Hellfire Caldera', ['Tinubu the Unshackled Demon.', 'This is the audit.']),
      encounters: [{ id: 'E3', x: 16, space: 'arena', objective: 'boss', units: [['tinubu', 1]] }],
    },
    {
      id: 'S4', name: 'Eruption', length: 46, floor: 'rock',
      intro: card('ERUPTION', ['The Demon is down. The volcano disagrees.', 'Fly.']),
      encounters: [{ id: 'E4', x: 16, space: 'sky', units: [['flyingMidget', 3], ['bitbug', 3]] }],
      mechanisms: [{ kind: 'fuel', id: 'last-fuel', x: 10 }, { kind: 'jumpPad', id: 'vent', x: 24, power: 14 }],
    },
  ],
});

export const CAMPAIGN_LEVELS = [L01, L02, L03, L04, L05, L06, L07, L08, L09, L10];
