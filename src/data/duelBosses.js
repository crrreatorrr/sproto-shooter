// Sproto Duel bosses, first-person. Attack names match the Duel fights.
// Numbers are FPS-scaled; gun damage is unchanged. `campaign: true` keeps them off the wave boss machine.

function boss(partial) {
  return {
    tag: 'magic', campaign: true, ai: 'mega', rig: 'humanoid',
    stageHeights: [2.2, 2.4, 2.6],
    phases: [
      { hpBelow: 1, name: '1' },
      { hpBelow: 0.66, name: '2' },
      { hpBelow: 0.33, name: '3' },
    ],
    hitboxes: [
      { type: 'capsule', zone: 'body', r: 0.7, y0: 0, y1: 2 },
      { type: 'sphere', zone: 'weak', r: 0.35, y: 1.7, onlyWhen: 'stunned' },
    ],
    attackEvery: 1.6,
    speed: 3.2,
    ...partial,
  };
}

export const DUEL_BOSS_LIST = [
  boss({
    id: 'sahil', name: 'SAHIL', hp: 980, radius: 0.7, height: 2.2, color: 0x3ecf8e, model: 'sahil',
    portraits: ['ui/bosses/sahil.png', 'ui/bosses/sahil_stage2.png', 'ui/bosses/sahil_stage3.png'],
    attacks: ['bolt', 'blast', 'rugSlam', 'summon'],
  }),
  boss({
    id: 'obamaDuo', name: 'BITCOIN OBAMA', hp: 760, radius: 0.7, height: 2.2, color: 0x7fd34e, model: 'obama',
    portraits: [], attacks: ['bolt', 'blast', 'summon'], tag: 'physical',
  }),
  boss({
    id: 'midgetDuo', name: 'THE MIDGET', hp: 520, radius: 0.5, height: 1.4, color: 0xff5ec4, model: 'midget',
    stageHeights: [1.4, 1.5, 1.6], portraits: [], attacks: ['bolt', 'fly', 'blast'], tag: 'physical',
  }),
  boss({
    id: 'broccoli', name: 'BROCCOLI HEAD', hp: 1100, radius: 0.8, height: 2.4, color: 0x6adf3a, model: 'sahil',
    portraits: [], attacks: ['blast', 'bolt', 'summon', 'cloud'],
  }),
  boss({
    id: 'glowie', name: 'GLOWIE', hp: 1040, radius: 0.7, height: 2.2, color: 0x8ec8ff, model: 'sahil',
    portraits: [], attacks: ['bolt', 'flash', 'drone', 'blast'],
  }),
  boss({
    id: 'tinubu', name: 'TINUBU', hp: 1600, radius: 1.1, height: 3.2, color: 0xff6a3d, model: 'tinubu',
    stageHeights: [3.2, 3.6, 4],
    portraits: ['ui/bosses/tinubu.png', 'ui/bosses/tinubu_stage2.png', 'ui/bosses/tinubu_stage3.png'],
    attacks: ['breath', 'blast', 'slam', 'summon'], tag: 'physical',
  }),
];

export const DUEL_BOSSES = Object.fromEntries(DUEL_BOSS_LIST.map((b) => [b.id, b]));

export function isDuelBoss(type) { return !!DUEL_BOSSES[type]; }
