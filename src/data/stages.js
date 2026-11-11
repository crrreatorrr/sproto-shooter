// Stages (environments) and character models reused from Sproto Duel. Paths are under public/assets/.
// Lighting values are copied from sproto-duel src/arena/themes.ts.
import { WAVES } from './waves.js';
import { ENEMIES, BOSSES, enemyStage } from './enemies.js';
export const STAGES = {
  city: {
    label: 'Los Angeles', background: 0x24102a, fog: 0x5a2c4a,
    hemi: { sky: 0xc07aa8, ground: 0x3a2228, intensity: 0.95 },
    sun: { color: 0xffa070, intensity: 2.3, position: [28, 11, -8] },
    bounce: { color: 0x30e8d8, intensity: 0.55 },
    ring: 0x30e8d8, ground: 0x5a4a58, floorRepeat: 10, propHeight: 9,
  },
  volcano: {
    label: 'Ashen Caldera', background: 0x0c0302, fog: 0x2a0c06,
    hemi: { sky: 0xff7a4a, ground: 0x401006, intensity: 0.95 },
    sun: { color: 0xffa070, intensity: 1.7, position: [16, 30, -26] },
    bounce: { color: 0xff5a1a, intensity: 0.9 },
    ring: 0xff5a1a, ground: 0x3a120a, floorRepeat: 8, propHeight: 6,
  },
  glacier: {
    label: 'Aurora Glacier', background: 0x03050c, fog: 0x0c1428,
    hemi: { sky: 0x7a90d0, ground: 0x283048, intensity: 0.95 },
    sun: { color: 0xc8d8ff, intensity: 2.1, position: [-14, 28, -18] },
    bounce: { color: 0x8ab8ff, intensity: 0.4 },
    ring: 0x8ab8ff, ground: 0x6a7896, floorRepeat: 8, propHeight: 6,
  },
  void: {
    label: 'The Void', background: 0x020005, fog: 0x0e0818,
    hemi: { sky: 0x9a6ad8, ground: 0x34406a, intensity: 1.15 },
    sun: { color: 0xd0b0ff, intensity: 2.0, position: [-14, 28, -18] },
    bounce: { color: 0x60ff9a, intensity: 0.42 },
    ring: 0x60ff9a, ground: null, floorRepeat: 8, propHeight: 7,
  },
  // Campaign-only. Textures fall back to city / glacier / void. Wave stages above are unchanged.
  desert: {
    label: 'Grand Bazaar', background: 0x2a1608, fog: 0xc48a4a,
    hemi: { sky: 0xffc48a, ground: 0x6a4020, intensity: 1 },
    sun: { color: 0xffd0a0, intensity: 2.4, position: [20, 28, -10] },
    bounce: { color: 0xffaa55, intensity: 0.45 },
    ring: 0xe8a060, ground: 0x8a6840, floorRepeat: 8, propHeight: 6,
  },
  grove: {
    label: 'Vegetable Grove', background: 0x102008, fog: 0x1c3a18,
    hemi: { sky: 0xb7e38a, ground: 0x243018, intensity: 1 },
    sun: { color: 0xfff0c0, intensity: 1.8, position: [12, 24, 8] },
    bounce: { color: 0x6adf3a, intensity: 0.4 },
    ring: 0x6adf3a, ground: 0x3d6a32, floorRepeat: 8, propHeight: 6,
  },
  office: {
    label: 'Government Office', background: 0x12141c, fog: 0x2a3144,
    hemi: { sky: 0xc5d0e0, ground: 0x2a3038, intensity: 0.9 },
    sun: { color: 0xe8eef8, intensity: 1.6, position: [8, 18, 6] },
    bounce: { color: 0x8ec8ff, intensity: 0.35 },
    ring: 0x8ec8ff, ground: 0x4a5568, floorRepeat: 6, propHeight: 4,
  },
  moonlit: {
    label: 'Moonlit Ruins', background: 0x070612, fog: 0x16142e,
    hemi: { sky: 0x9aa4d8, ground: 0x1a1830, intensity: 0.85 },
    sun: { color: 0xd0d8ff, intensity: 1.5, position: [-18, 30, -8] },
    bounce: { color: 0x6a78c8, intensity: 0.4 },
    ring: 0xb0a0e0, ground: 0x2a2840, floorRepeat: 8, propHeight: 7,
  },
};
export const STAGE_IDS = Object.keys(STAGES);

// Desert, grove and office have their own Sproto Duel sets. Moonlit has none yet and borrows the void's.
const STAGE_TEXTURE = { moonlit: 'void' };
export const stageAssets = (id) => {
  const folder = STAGE_TEXTURE[id] || id;
  return {
    floor: `textures/stages/${folder}/floor.jpg`,
    sky: `textures/stages/${folder}/sky.jpg`,
    stone: `textures/stages/${folder}/stone.jpg`,
    pillar: `models/stages/${folder}/pillar.glb`,
    prop: `models/stages/${folder}/prop.glb`,
  };
};

/**
 * Wave 1 → Los Angeles, wave 2 → Ashen Caldera, wave 3 → The Void.
 * Title and sandbox share wave 1's stage so the first download serves all three; Glacier is debug-only.
 */
export const WAVE_STAGES = ['city', 'volcano', 'void'];
export const SANDBOX_STAGE = 'city';
export function stageFor(state, override = null) {
  if (override) return override;
  if (state.mode === 'campaign' && state.level && state.level.stage && STAGES[state.level.stage]) return state.level.stage;
  if (state.mode === 'waves' && state.wave) return WAVE_STAGES[Math.min(WAVE_STAGES.length - 1, state.wave.index)];
  return SANDBOX_STAGE;
}

/**
 * Exactly what one level needs, derived from its wave config:
 * - `stage`: the environment,
 * - `characters`: every enemy model+stage the wave can spawn (type, elite, tier),
 * - `bosses`: every boss model for every phase (loaded after the rest, before the boss fight).
 */
export function levelAssets(waveIdx, tier) {
  const w = WAVES[waveIdx];
  if (!w) return null;
  const set = new Map();
  const add = (model, stage) => set.set(`${model}:${stage}`, { model, stage });
  for (const g of w.groups) {
    for (const sp of g.spawns) {
      const def = ENEMIES[sp.type];
      if (!def || !def.model) continue;
      if (sp.count - sp.elites > 0) add(def.model, enemyStage({ type: sp.type, elite: false, tier }));
      if (sp.elites > 0) add(def.model, enemyStage({ type: sp.type, elite: true, tier }));
    }
  }
  const bosses = new Map();
  for (const type of w.boss ? w.boss.types : []) {
    const b = BOSSES[type];
    b.phases.forEach((_, i) => bosses.set(`${b.model}:${i + 1}`, { model: b.model, stage: Math.min(3, i + 1) }));
    // bosses summon midgets
    if (b.ai === 'mega') add('midget', enemyStage({ type: 'midget', elite: false, tier }));
  }
  return { stage: WAVE_STAGES[Math.min(WAVE_STAGES.length - 1, waveIdx)], characters: [...set.values()], bosses: [...bosses.values()] };
}

/** Rigged characters (24-joint humanoid with clips idle/run/cast/cast_big/hit/defeat/roll/victory/jump/stun/strafe_l/strafe_r). */
export const CHARACTER_MODELS = {
  midget: [1, 2, 3].map((s) => `models/characters/midget_stage${s}.glb`),
  obama: [1, 2, 3].map((s) => `models/characters/obama_stage${s}.glb`),
  tinubu: [1, 2, 3].map((s) => `models/characters/tinubu_stage${s}.glb`),
  sahil: [1, 2, 3].map((s) => `models/characters/sahil_stage${s}.glb`),
  monster: [1, 2, 3].map(() => 'models/characters/monster.glb'), // one static model, scaled up per phase
  dragon: [1, 2, 3].map(() => 'models/characters/dragon.glb'), // one model for every phase
  sprotoBeast: [1, 2, 3].map(() => 'models/characters/sproto_monster.glb'),
  // rigged + animated in Blender (art/blender/new_enemies.blend); one model for every phase/stage
  carMonster: [1, 2, 3].map(() => 'models/characters/car_monster.glb'),
  moleMonster: [1, 2, 3].map(() => 'models/characters/mole_monster.glb'),
  robotLaser: [1, 2, 3].map(() => 'models/characters/robot_laser.glb'),
  robotShooter: [1, 2, 3].map(() => 'models/characters/robot_shooter.glb'),
};
/** Models that don't use CHARACTER_ROTATION_Y (they already face +Z). */
export const MODEL_ROTATION_Y = { monster: 0, sprotoBeast: 0, carMonster: 0, moleMonster: 0, robotLaser: 0, robotShooter: 0 };
export const rotationForModelPath = (path) => {
  for (const [m, paths] of Object.entries(CHARACTER_MODELS)) if (paths.includes(path) && m in MODEL_ROTATION_Y) return MODEL_ROTATION_Y[m];
  return CHARACTER_ROTATION_Y;
};
/** Tripo exports face +X; turn -90° so they face +Z (Sproto Duel uses the same rotation). */
export const CHARACTER_ROTATION_Y = -90;
