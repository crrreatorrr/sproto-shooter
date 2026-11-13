// The Great Sproto Audit. Ten levels, one section chain each.
// L01–L09 register themselves from their own folders. Level 10
// still live here until each one moves into src/data/levels/LNN/.
import { makeLevel } from './assemble.js';
import { L01 } from './L01/index.js';
import { L02 } from './L02/index.js';
import { L03 } from './L03/index.js';
import { L04 } from './L04/index.js';
import { L05 } from './L05/index.js';
import { L06 } from './L06/index.js';
import { L07 } from './L07/index.js';
import { L08 } from './L08/index.js';
import { L09 } from './L09/index.js';

export { L01, L02, L03, L04, L05, L06, L07, L08, L09 };

const card = (title, lines) => ({ title, lines });

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
