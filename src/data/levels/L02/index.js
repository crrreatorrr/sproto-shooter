import { makeLevel } from '../assemble.js';
import { registerLevel } from '../register.js';

const card = (title, lines) => ({ title, lines });

export const L02 = makeLevel({
  id: 'L02', name: 'The Grand Bazaar', stage: 'desert', tier: 2, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Souk Alleys', length: 50, floor: 'sand',
      encounters: [{ id: 'E1', x: 16, space: 'corridor', units: [['riotMidget', 3], ['obama', 2]] }],
      weapons: [{ id: 'sg-souk', x: 28, gun: 'shotgun', why: 'phalanx in the alleys' }],
      mechanisms: [
        { kind: 'hazard', id: 'quicksand', x: 24, slow: 0.45, dps: 0 },
        { kind: 'barrel', id: 'spice-barrel', x: 20 },
      ],
      secret: { x: 8, modifier: 'confetti' },
    },
    {
      id: 'S2', name: 'Dune Sea', length: 52, floor: 'sand',
      intro: card('Into the Dunes', ['The souk was the easy part.', "Sahil's caravan route crosses the Dune Sea."]),
      encounters: [{ id: 'E2', x: 18, space: 'field', units: [['boomMidget', 4]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'sand-geyser', x: 12, power: 12 },
        { kind: 'carpet', id: 'carpet-1', x: 30 },
        { kind: 'power', id: 'overshield', x: 36, modifier: 'overshield' },
      ],
    },
    {
      id: 'S3', name: 'Canyon Rim', length: 50, floor: 'sand',
      encounters: [{ id: 'E3', x: 16, space: 'ledge', units: [['hexAcolyte', 3]] }],
      weapons: [{ id: 'sn-rim', x: 30, gun: 'sniper', why: 'acolytes across the rim' }],
      mechanisms: [{ kind: 'zipline', id: 'clothesline', x: 22 }],
    },
    {
      id: 'S4', name: 'Bazaar Gate', length: 48,
      intro: card('The Grand Bazaar', ['Sahil the RugMaster.', 'He sells the floor out from under you.']),
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', units: [['sahil', 1]] }],
      weapons: [{ id: 'bz-sahil', x: 10, gun: 'bazooka', why: 'Sahil at the gate' }],
    },
  ],
});

registerLevel(L02);
