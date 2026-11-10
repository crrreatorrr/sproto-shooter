// L02 design tables from docs/campaign/levels/L02-grand-bazaar.md.
// Playable positions sit on a cut route so the current straight-line autopilot
// can finish. designAt / design fields keep the document coordinates.

export const CENSUS = {
  midget: 58,
  boomMidget: 25,
  obama: 16,
  riotMidget: 10,
  flyingMidget: 5,
  hexAcolyte: 4,
  robotLaser: 2,
  robotShooter: 1,
};

export const ADD_CENSUS = {
  midget: 27,
  boomMidget: 9,
  riotMidget: 2,
  hexAcolyte: 1,
  eliteRiot: 1,
};

export const LOOT = {
  baseTier: 'common',
  odds: { common: 65, uncommon: 30, rare: 5, epic: 0, legendary: 0 },
  gunLevel: 2,
  poolAtStart: ['mg', 'shotgun'],
  unlocks: ['sniper', 'bazooka'],
  guaranteed: [
    { id: 'chest-L1', tier: 'common', note: 'one gun the player does not carry, else shotgun' },
    { id: 'chest-L2', tier: 'common', note: 'same rule, after loom-0' },
    { id: 'cache-secret', gun: 'shotgun', tier: 'rare' },
    { id: 'elite-rug-security', tierStep: 1, odds: { uncommon: 65, rare: 30, epic: 5 } },
    { id: 'sahil', guns: 2, tier: 'uncommon', bossGun: ['raygun', 'bigbullets'], spell: 'magicCarpet' },
  ],
};

export const AMMO = [
  ['ab01', 'bullets', 60, 'S1', [98, 0, 142]],
  ['ab02', 'shells', 12, 'S1', [106, 0, 96]],
  ['ab03', 'shells', 12, 'S1', [92, 0, 48]],
  ['ab04', 'bullets', 60, 'S1', [110, 0, 56]],
  ['ab05', 'shells', 12, 'S1', [108, 0, 28]],
  ['ab06', 'bullets', 60, 'S1', [92, 0, 16]],
  ['ab07', 'shells', 12, 'S1', [156, 0, 32]],
  ['ab08', 'bullets', 60, 'S1', [188, 0, 12]],
  ['ab09', 'bullets', 60, 'S2', [14, 0, 104]],
  ['ab10', 'shells', 12, 'S2', [152, 0, 100]],
  ['ab11', 'bullets', 60, 'S2', [150, 0, 104]],
  ['ab12', 'shells', 12, 'S2', [200, 9, 94]],
  ['ab13', 'shells', 12, 'S2', [212, 9, 84]],
  ['ab14', 'bullets', 60, 'S2', [242, 9, 114]],
  ['ab15', 'sniper', 8, 'S3', [41, 6, 60]],
  ['ab16', 'sniper', 8, 'S3', [38, 6, 64]],
  ['ab17', 'bullets', 60, 'S3', [82, 0, 66]],
  ['ab18', 'shells', 12, 'S3', [86, 0, 98]],
  ['ab19', 'bullets', 60, 'S3', [78, 0, 150]],
  ['ab20', 'sniper', 8, 'S3', [118, 0, 143]],
  ['ab21', 'shells', 12, 'S3', [166, 0, 120]],
  ['ab22', 'shells', 12, 'SM', [8, 4, 22]],
  ['ab23', 'bullets', 60, 'SM', [54, 4, 36]],
  ['ab24', 'shells', 12, 'SM', [67, 7, 46]],
  ['ab25', 'bullets', 60, 'SM', [104, 10, 96]],
  ['ab26', 'shells', 12, 'SM', [86, 2, 152]],
  ['ab27', 'bullets', 60, 'SM', [94, 2, 152]],
  ['ab28', 'shells', 12, 'SM', [88, 0, 165]],
  ['ab29', 'rockets', 3, 'S4', [47, 0, 11]],
  ['ab30', 'rockets', 3, 'S4', [47, 0, 13]],
  ['ab31', 'shells', 12, 'S4', [30, 0, 48]],
  ['ab32', 'bullets', 60, 'S4', [50, 0, 48]],
  ['ab33', 'bullets', 60, 'S4', [20, 0, 62]],
  ['ab34', 'bullets', 60, 'S4', [60, 0, 78]],
  ['ab35', 'shells', 12, 'S4', [46, 0, 92]],
  ['ab36', 'rockets', 3, 'S4', [34, 0, 92]],
];

export const CRATES = [
  { id: 'ac1', kind: 'ammoCrate', uses: 3, section: 'S1', at: [184, 0, 24] },
  { id: 'ac2', kind: 'ammoCrate', uses: 3, section: 'S2', at: [240, 9, 100] },
  { id: 'ac3', kind: 'ammoCrate', uses: 3, section: 'S4', at: [40, 0, 94] },
  { id: 'ac4', kind: 'ammoCrate', uses: 3, section: 'S4', at: [28, 0, 57] },
  { id: 'dc1', kind: 'depotCrate', uses: null, section: 'S2', at: [262, 9, 92] },
  { id: 'dc2', kind: 'depotCrate', uses: null, section: 'SM', at: [80, 0, 226] },
  { id: 'dc3', kind: 'depotCrate', uses: null, section: 'S4', at: [35, 0, 12] },
];

export const BEATS = [
  { id: 'E1', sec: 47.2 },
  { id: 'E2', sec: 77.1 },
  { id: 'shrine', sec: 26.2 },
  { id: 'L1', sec: 152.4 },
  { id: 'E4', sec: 84.2 },
  { id: 'L2', sec: 159 },
  { id: 'depot1', sec: 52.6 },
  { id: 'E6', sec: 87.2 },
  { id: 'E7', sec: 105.8 },
  { id: 'E8', sec: 115 },
  { id: 'E9', sec: 73.9 },
  { id: 'depot2', sec: 50.8 },
  { id: 'L3', sec: 262.5 },
];

export const BOSS_HP = { part2: 1714, part4: 1909, part5: 1967, loom: 161, pylon: 230, elite: 173 };

export const BOSS_SCRIPT = {
  designEncounter: 'SB-BOSS',
  liveEncounter: 'S4-E4',
  parts: [
    {
      id: 1, kind: 'entry', seconds: 30,
      designTargets: [{ id: 'loom-E', hp: 161, at: [58, 0, 70] }, { id: 'loom-W', hp: 161, at: [22, 0, 70] }],
      attacks: { bolts: 'half' },
      adds: [
        { t: 2, from: ['sh-NW', 'sh-NE'], units: [['midget', 3], ['midget', 3]] },
        { on: 'firstLoom', from: ['sh-SE'], units: [['boomMidget', 2]], gap: 1.5 },
      ],
    },
    {
      id: 2, kind: 'phase', seconds: 55, hp: 1300, designHp: 1714, duelStage: 1,
      attacks: ['bolt', 'carpetSweep'],
      adds: [
        { onBossHp: 65, from: ['sh-SW', 'sh-SE'], units: [['midget', 2], ['midget', 2]] },
        { onBossHp: 30, from: ['sh-NW'], units: [['boomMidget', 2]] },
      ],
    },
    {
      id: 3, kind: 'intermission', seconds: 8,
      designTargets: [
        { id: 'pylon-N', hp: 230, at: [40, 0, 52] },
        { id: 'pylon-SE', hp: 230, at: [55.6, 0, 79] },
        { id: 'pylon-SW', hp: 230, at: [24.4, 0, 79] },
      ],
      pit: { at: [40, 0, 70], r: 7, slow: 0.5, dps: 4 },
      adds: [
        { t: 0, from: ['sh-NE'], units: [['riotMidget', 2], ['hexAcolyte', 1]] },
        { t: 10, from: ['sh-SE', 'sh-SW'], units: [['midget', 3], ['midget', 2]] },
        { on: 'secondPylon', from: ['sh-NW'], units: [['midget', 3]] },
      ],
    },
    {
      id: 4, kind: 'phase', seconds: 60, hp: 1000, designHp: 1909, duelStage: 2,
      ring: 26.8,
      adds: [
        { onBossHp: 70, from: ['sh-NE', 'sh-SW'], units: [['midget', 2], ['midget', 1]] },
        { onBossHp: 35, from: ['sh-SE'], units: [['boomMidget', 3]], gap: 1.5 },
      ],
    },
    {
      id: 5, kind: 'phase', seconds: 65, hp: 900, designHp: 1967, duelStage: 3,
      ring: 25.5,
      adds: [
        { onBossHp: 75, from: ['sh-NW'], units: [['riotMidget', 1, { elite: true, name: 'Head of Rug Security', hp: 173 }], ['midget', 3]] },
        { onBossHp: 40, from: ['sh-NE', 'sh-SE'], units: [['midget', 3], ['boomMidget', 2]] },
      ],
    },
  ],
};

export const BOT_ROUTE = [
  { section: 'S1', steps: ['(100,144)', 'clear E1', 'rack-sg-arch', 'clear E2', 'shrine', 'zap C1', 'cross pass.line', 'clear L1', 'chest-L1', '(196,24)'] },
  { section: 'S2', steps: ['(12,100)', 'road to (124,84)', 'clear E4', 'G5 or shelf.ramp', 'cross serai.line', 'clear L2', 'loom-0', 'chest-L2', 'depot', '(288,98)'] },
  { section: 'S3', steps: ['(4,80)', 'tower rack-sn-tower', 'clear E6', 'C1', 'Needle', 'C2', 'C3 or ramp', '(214,112)'] },
  { section: 'S4', steps: ['(4,16)', 'clear 8a-8c', 'zap C2', 'L1', 'clear 8d', 'Z1', 'J1', 'os-1', 'Z2', 'looms', 'clear E9', 'depot', '(90,237)'] },
  { section: 'SB', steps: ['(40,6)', 'dc3', 'rack-bz-vault', 'cross ring.line', 'looms', 'bars and pylons', 'exitRug'] },
];

export const DIFFICULTY = {
  easy: {
    maxAlive: 8,
    e2Riots: 1,
    l1Wave1Riots: 2,
    l1DropBoom: 1,
    l1AddMidget: 3,
    bubbleHp: 30,
    quicksand: 0.65,
    loomHp: 120,
    waveSec: 35,
    bossNoPart2Adds: true,
    bossNoElite: true,
    springHeal: 60,
    ammoMult: 1.5,
  },
  heroic: {
    maxAlive: 12,
    elites: ['L1 wave 3 riot', 'L2 wave 4 acolyte', 'E6 shooter', 'E8 riot'],
    e9BigObama: true,
    bubbleHp: 60,
    waveSec: 20,
    pylonRegrowSec: 25,
    springNoRefill: true,
    crateUses: 2,
  },
};

export const CARDS = {
  start: { title: 'The Grand Bazaar', lines: ["Sahil's bazaar is where the Empire launders its rugs.", 'Take his carpet.'] },
  dunes: { title: 'Into the Dunes', lines: ['The souk was the easy part.', "Sahil's caravan route crosses the Dune Sea."] },
  boss: { title: 'Sahil, the RugMaster', lines: ['Every rug comes with a lifetime guarantee. The rug pull is free.'] },
};

export const DEV_ENTRY = {
  unlock: 'L01 cleared',
  query: '?mode=campaign&level=L02',
  grants: ['gooBolt'],
};
