// Stages (environments) and character models reused from Sproto Duel. Paths are under public/assets/.
// Lighting values are copied from sproto-duel src/arena/themes.ts.
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
};
export const STAGE_IDS = Object.keys(STAGES);

export const stageAssets = (id) => ({
  floor: `textures/stages/${id}/floor.jpg`,
  sky: `textures/stages/${id}/sky.jpg`,
  stone: `textures/stages/${id}/stone.jpg`,
  pillar: `models/stages/${id}/pillar.glb`,
  prop: `models/stages/${id}/prop.glb`,
});

/** Wave 1 → Los Angeles, wave 2 → Ashen Caldera, wave 3 → The Void. Sandbox and title use the Glacier unless overridden. */
export const WAVE_STAGES = ['city', 'volcano', 'void'];
export function stageFor(state, override = null) {
  if (override) return override;
  if (state.mode === 'waves' && state.wave) return WAVE_STAGES[Math.min(WAVE_STAGES.length - 1, state.wave.index)];
  return 'glacier';
}

/** Rigged characters (24-joint humanoid with clips idle/run/cast/cast_big/hit/defeat/roll/victory/jump/stun/strafe_l/strafe_r). */
export const CHARACTER_MODELS = {
  midget: [1, 2, 3].map((s) => `models/characters/midget_stage${s}.glb`),
  obama: [1, 2, 3].map((s) => `models/characters/obama_stage${s}.glb`),
  tinubu: [1, 2, 3].map((s) => `models/characters/tinubu_stage${s}.glb`),
  sahil: [1, 2, 3].map((s) => `models/characters/sahil_stage${s}.glb`),
};
/** Tripo exports face +X; turn -90° so they face +Z (Sproto Duel uses the same rotation). */
export const CHARACTER_ROTATION_Y = -90;
