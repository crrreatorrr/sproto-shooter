// @ts-check
// Facade. Scene, views, VFX and the viewmodel live in the modules under src/render/.
import { createRenderContext } from './core/RenderContext.js';
import { createClock } from './core/clock.js';
import { createMaterials } from './materials/geometries.js';
import { createStage } from './stage/StageEnvironment.js';
import { createCameraRig } from './camera/CameraRig.js';
import { createGunFactory } from './viewmodel/gunMesh.js';
import { createViewmodel } from './viewmodel/Viewmodel.js';
import { createCreatureViews } from './views/creatures.js';
import { createWorldViews } from './views/worldProps.js';
import { createProjectileBatches } from './instancing/ProjectileBatches.js';
import { createPickupBatches } from './instancing/PickupBatches.js';
import { createVfx } from './vfx/VfxEngine.js';
import { createHitboxes } from './debug/HitboxOverlay.js';
import { pendingDownloads } from './assets.js';

export function createRenderer(container, bus) {
  const ctx = createRenderContext(container);
  const mats = createMaterials();
  const clock = createClock();
  const cameraRig = createCameraRig(ctx);
  const guns = createGunFactory(mats);
  const viewmodel = createViewmodel(ctx, mats, guns);
  cameraRig.bindViewmodel(viewmodel.vm);
  const stage = createStage(ctx, mats);
  const creatures = createCreatureViews(ctx, mats);
  const world = createWorldViews(ctx, mats, guns);
  const projectiles = createProjectileBatches(ctx, mats);
  const pickups = createPickupBatches(ctx, mats);
  const vfx = createVfx(ctx, mats, bus, { cameraRig, viewmodel });
  const hitboxes = createHitboxes(ctx, mats);
  clock.reset();

  function render(state, alpha, look, opts = {}) {
    ctx.beginFrame();
    const frame = clock.tick();
    cameraRig.update(state, alpha, look, opts, frame);
    viewmodel.update(state, look, frame);
    world.updateBoxes(state, frame);
    stage.update(state, frame.dt);
    creatures.update(state, alpha, frame);
    world.updateRest(state, alpha, frame);
    projectiles.update(state, alpha, frame);
    pickups.update(state, alpha, frame);
    vfx.update(frame.dt);
    hitboxes.update(state);
    ctx.endFrame();
  }

  return {
    render,
    project: ctx.project,
    resize: ctx.resize,
    canvas: ctx.canvas,
    camera: ctx.camera,
    setShowHitboxes: hitboxes.setShow,
    setStage: stage.setStage,
    pendingDownloads,
    info: ctx.info,
    counts: ctx.counts,
    liveFx: vfx.liveFx,
    renderScale: ctx.renderScale,
    takeGpuMs: ctx.takeGpuMs,
  };
}
