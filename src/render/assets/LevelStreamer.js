// @ts-check
// Was requestNeeds() inside the renderer. Level-scoped: this wave now, the next wave only between waves.
import { BOSSES, ENEMIES as ENEMY_DEFS, enemyStage } from '../../data/enemies.js';
import { levelAssets, stageFor } from '../../data/stages.js';
import { PRIORITY } from './DownloadQueue.js';
import { ensureStage, stageReady, ensureCharacter, characterReady } from './AssetStore.js';

export function createLevelStreamer() {
  let stageOverride = /** @type {string | null} */ (null);
  let needsT = 0;

  function requestNeeds(state) {
    const { NOW, LATER } = PRIORITY;
    const stageId = stageFor(state, stageOverride);
    ensureStage(stageId, NOW);
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (e.boss) { const b = BOSSES[e.type]; b.phases.forEach((_, i) => ensureCharacter(b.model, i + 1, NOW)); continue; }
      const def = ENEMY_DEFS[e.type];
      if (def.model) ensureCharacter(def.model, enemyStage(e), NOW);
    }
    if (state.mode !== 'waves' || !state.wave) return;
    const w = state.wave;
    const lvl = levelAssets(w.index, state.tier);
    for (const c of lvl.characters) ensureCharacter(c.model, c.stage, NOW);
    const coreReady = stageReady(lvl.stage) && lvl.characters.every((c) => characterReady(c.model, c.stage));
    if (coreReady) for (const c of lvl.bosses) ensureCharacter(c.model, c.stage, w.phase === 'bossIntro' || w.phase === 'boss' ? NOW : LATER);
    const between = w.phase === 'cleared' || w.phase === 'intermission';
    const next = between ? levelAssets(w.index + 1, state.tier) : null;
    if (next) {
      ensureStage(next.stage, LATER);
      for (const c of next.characters) ensureCharacter(c.model, c.stage, LATER);
    }
  }

  return {
    setStage(id) { stageOverride = id || null; },
    get override() { return stageOverride; },
    update(state, dt) {
      needsT -= dt;
      if (needsT <= 0) { needsT = 0.25; requestNeeds(state); }
    },
  };
}
