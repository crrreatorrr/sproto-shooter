// Facade. The picture is still drawn by the modules under src/render/.
import * as THREE from 'three';
import { ARENA_R } from '../data/tuning.js';
import { BOSSES, ENEMIES as ENEMY_DEFS, enemyStage } from '../data/enemies.js';
import { stageFor, levelAssets } from '../data/stages.js';
import { panoramaPath, surfaceArtPath } from './level/campaignSurfaceArt.js';
import { GUN_MODELS, loadTexture, pendingDownloads, PRIORITY, ensureGunModel, ensureStage, stageReady, ensureCharacter, characterReady, stagePaths, characterPath, setAssetDemand, loadReport, retryFailed } from './assets.js';
import { createRenderContext } from './core/RenderContext.js';
import { createMaterials } from './materials/geometries.js';
import { mountStage } from './stage/StageEnvironment.js';
import { mountWorld } from './views/worldProps.js';
import { mountCreatures } from './views/creatures.js';
import { mountProjectiles } from './instancing/ProjectileBatches.js';
import { mountGuns } from './viewmodel/gunMesh.js';
import { mountVfx } from './vfx/VfxEngine.js';
import { GRAPPLER_MODEL } from './vfx/grappler.js';
import { mountViewmodel } from './viewmodel/Viewmodel.js';
import { mountPresent } from './frame/present.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ELEM_COL = { none: 0xffe9a8, fire: 0xff7a1a, shock: 0x4fe3ff, goo: 0x9be33b };

export function createRenderer(container, bus, playerModel, graphicsPreset = 'high') {
  const env = { bus, lerp, ELEM_COL, ARENA_R, ...createRenderContext(container, graphicsPreset), ...createMaterials() };
  env.stageOverride = null;
  mountStage(env);
  mountWorld(env);
  mountCreatures(env);
  mountProjectiles(env);
  mountGuns(env);
  mountVfx(env);
  mountViewmodel(env, playerModel);
  const demandNow = [];
  const demandLater = [];
  function requestNeeds(state) {
    const { NOW, LATER } = PRIORITY;
    demandNow.length = 0;
    demandLater.length = 0;
    const stageId = stageFor(state, env.stageOverride);
    ensureStage(stageId, NOW);
    demandNow.push(...stagePaths(stageId), env.fp.modelPath, GRAPPLER_MODEL);
    for (const g of state.players[state.localPlayerId].guns) if (g && GUN_MODELS[g.type]) {
      ensureGunModel(g.type, NOW);
      demandNow.push(GUN_MODELS[g.type].path);
    }
    for (const k of state.pickups || []) if (k.kind === 'gun' && k.gun && GUN_MODELS[k.gun.type]) {
      ensureGunModel(k.gun.type, LATER);
      demandLater.push(GUN_MODELS[k.gun.type].path);
    }
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (e.boss) {
        const b = BOSSES[e.type];
        b.phases.forEach((_, i) => {
          ensureCharacter(b.model, i + 1, NOW);
          const path = characterPath(b.model, i + 1);
          if (path) demandNow.push(path);
        });
        continue;
      }
      const def = ENEMY_DEFS[e.type];
      if (def.model) {
        ensureCharacter(def.model, enemyStage(e), NOW);
        const path = characterPath(def.model, enemyStage(e));
        if (path) demandNow.push(path);
      }
    }
    if (state.mode === 'campaign' && state.level) {
      const art = surfaceArtPath(state.level.id);
      demandNow.push(art);
      loadTexture(art, { color: false });
      const panorama = panoramaPath(state.level.id, state.level.section);
      if (panorama) {
        demandNow.push(panorama);
        loadTexture(panorama);
      }
    }
    if (state.mode !== 'waves' || !state.wave) {
      setAssetDemand(demandNow, demandLater);
      return;
    }
    const w = state.wave;
    const lvl = levelAssets(w.index);
    for (const c of lvl.characters) {
      ensureCharacter(c.model, c.stage, NOW);
      const path = characterPath(c.model, c.stage);
      if (path) demandNow.push(path);
    }
    const coreReady = stageReady(lvl.stage) && lvl.characters.every((c) => characterReady(c.model, c.stage));
    if (coreReady) for (const c of lvl.bosses) {
      const prio = w.phase === 'bossIntro' || w.phase === 'boss' ? NOW : LATER;
      ensureCharacter(c.model, c.stage, prio);
      const path = characterPath(c.model, c.stage);
      if (path) (prio === NOW ? demandNow : demandLater).push(path);
    }
    const between = w.phase === 'cleared' || w.phase === 'intermission';
    const next = between ? levelAssets(w.index + 1) : null;
    if (next) {
      ensureStage(next.stage, LATER);
      demandLater.push(...stagePaths(next.stage));
      for (const c of next.characters) {
        ensureCharacter(c.model, c.stage, LATER);
        const path = characterPath(c.model, c.stage);
        if (path) demandLater.push(path);
      }
    }
    setAssetDemand(demandNow, demandLater);
  }
  env.requestNeeds = requestNeeds;
  mountPresent(env);
  return {
    render(...args) { env.resize(); env.render(...args); },
    setGraphicsPreset: env.setGraphicsPreset,
    project: env.project,
    resize: env.resize,
    canvas: env.canvas,
    camera: env.camera,
    setShowHitboxes: env.setShowHitboxes,
    setStage(id) { env.stageOverride = id || null; },
    firstPerson: env.fp,
    THREE, scene: env.scene,
    pendingDownloads, loadReport, retryFailed,
    info: env.info,
    counts: env.counts,
    liveFx: env.liveFx,
    renderScale: env.renderScale,
    takeGpuMs: env.takeGpuMs,
  };
}
