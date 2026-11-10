import { makeLevel } from '../assemble.js';
import { registerLevel } from '../register.js';

const card = (title, lines) => ({ title, lines });

export const L03 = makeLevel({
  id: 'L03', name: 'The Vegetable Grove', stage: 'grove', tier: 3, parTime: 18 * 60,
  sections: [
    {
      id: 'S1', name: 'Crop Fields', length: 52, floor: 'dirt',
      encounters: [{ id: 'E1', x: 18, space: 'field', units: [['floretSprout', 3]] }],
      weapons: [{ id: 'sn-field', x: 10, gun: 'sniper', why: 'sprouts across the furrows' }],
      mechanisms: [{ kind: 'jumpPad', id: 'mushroom', x: 28, power: 11 }],
      secret: { x: 8, modifier: 'floorIsLava' },
    },
    {
      id: 'S2', name: 'Hedge Maze', length: 52, floor: 'hedge',
      encounters: [{ id: 'E2', x: 16, space: 'corridor', units: [['sewerMidget', 4], ['daycare', 1]] }],
      weapons: [
        { id: 'mg-maze', x: 26, gun: 'mg', why: 'burrowers in the hedges' },
        { id: 'sg-maze', x: 30, gun: 'shotgun', why: 'close hedges' },
      ],
      mechanisms: [{ kind: 'bridge', id: 'vine-bridge', x: 34 }, { kind: 'power', id: 'turbo', x: 12, modifier: 'turbo' }],
      cover: [{ x: 20, h: 1.6, z: 8 }, { x: 22, h: 1.6, z: 14 }],
    },
    {
      id: 'S3', name: 'Greenhouses', length: 46, floor: 'dirt',
      encounters: [{ id: 'E3', x: 16, space: 'interior', units: [['floretSprout', 2], ['midget', 3]] }],
      mechanisms: [{ kind: 'hazard', id: 'runoff', x: 24, dps: 10 }, { kind: 'door', id: 'airlock', x: 34, opens: 'E3.cleared' }],
    },
    {
      id: 'S4', name: 'The Patch', length: 46,
      intro: card('Something Smells Green', ['The Floret Lord is only a sprout.', 'He will not stay for the whole fight.']),
      encounters: [{ id: 'E4', x: 16, space: 'arena', objective: 'boss', fleeAt: 0.5, units: [['broccoli', 1]] }],
      weapons: [{ id: 'bz-nest', x: 10, gun: 'bazooka', why: 'the sprout in the patch' }],
    },
  ],
});

registerLevel(L03);
