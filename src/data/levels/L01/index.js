import { makeLevel } from '../assemble.js';
import { registerLevel } from '../register.js';

const card = (title, lines) => ({ title, lines });

export const L01 = makeLevel({
  id: 'L01', name: 'Sproto Landing', stage: 'city', tier: 1, parTime: 10 * 60,
  sections: [
    {
      id: 'S1', name: 'Drop Zone', length: 48,
      encounters: [{ id: 'E1', x: 16, space: 'corridor', units: [['midget', 4]] }],
      weapons: [{ id: 'sg-alley', x: 30, gun: 'shotgun', why: 'E2 mall corridors' }],
      mechanisms: [
        { kind: 'door', id: 'mall-door', x: 34, opens: 'E1.cleared' },
        { kind: 'switch', id: 'gate-switch', x: 12, opens: 'side-door' },
        { kind: 'door', id: 'side-door', x: 14, opens: 'switch:gate-switch' },
        { kind: 'barrel', id: 'barrel-1', x: 22 },
      ],
      checkpoints: [{ id: 'cp1', x: 36, when: 'E1.cleared' }],
      secret: { x: 10, modifier: 'bigHead' },
      cover: [{ x: 20, h: 1.2 }],
    },
    {
      id: 'S2', name: 'Mall', length: 48, transition: 'seamless',
      encounters: [{ id: 'E2', x: 16, space: 'interior', units: [['obama', 2], ['flyingMidget', 2]] }],
      mechanisms: [
        { kind: 'jumpPad', id: 'lift-pad', x: 12, power: 10 },
        { kind: 'mover', id: 'parking-lift', x: 28 },
      ],
      checkpoints: [{ id: 'cp2', x: 34, when: 'E2.cleared' }],
      cover: [{ x: 22, h: 1.4 }],
    },
    {
      id: 'S3', name: 'Gate Plaza', length: 48,
      intro: card('Gate Plaza', ['A Big Bitcoin Obama is counting the take.', 'The gate does not open until he drops it.']),
      encounters: [{ id: 'E3', x: 16, space: 'arena', units: [['bigObama', 1]] }],
      checkpoints: [{ id: 'cp3', x: 8, when: 'E3.cleared' }],
    },
  ],
});

registerLevel(L01);
