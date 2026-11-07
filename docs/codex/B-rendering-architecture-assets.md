# Sproto Shooter: Rendering, Architecture, Assets, Performance and QA Plan (half B)

Scope: rendering quality, code architecture, asset pipeline and loading, performance, QA and tooling. Gameplay, game feel, VFX content and audio content belong to the other half. This plan only builds their infrastructure: the VFX engine, the particle system, the audio engine and the view lifecycle.

Repo: `/home/user/sproto-shooter` (remote `crrreatorrr/sproto-shooter`, branch `main`, no `.github/` yet). Sibling reference: `/home/user/crrreatorrr/sproto-duel`.

---

## 0. What I found (facts the plan relies on)

**Renderer (`src/render/renderer.js`, 854 lines, one closure `createRenderer`)**
- `WebGLRenderer({antialias:true})`, pixel ratio capped at 1.5, `outputColorSpace` sRGB.
- No tone mapping, no shadows, no post-processing.
- The sky is a 48x24 `SphereGeometry` with a basic material. The env map is unused (`scene.environment` is null), so PBR materials get no reflections.
- `applyStage()` is keyed on `id + ':' + assetsVersion()`. It re-runs on every asset load anywhere: it clones textures and rebuilds `decor` (16 pillars plus 12 props, each a separate `clone(true)`, so about 28+ draw calls).
- Enemies: `syncView` builds a `THREE.Group` per entity and drops it with `releaseUnseen` (no pooling). Dead enemies are scaled to 0.01.
- Per-frame allocations:
  - `const tint = [...]` per enemy per frame (renderer.js ~L657).
  - `new THREE.Color` per tracer.
  - `new Mesh + new MeshBasicMaterial` per explosion (`addBoom`).
  - With hitboxes on, new meshes are built every frame.
  - The confetti loop rewrites all 1500 instance matrices every frame, live or dead.
- `Math.random` is used in render (tracer jag, confetti). Two `PointLight`s live permanently on the camera (`vmLight`, `flashLight`). They are fine as long as the light count never changes.
- Projectiles and pickups are already instanced (`InstancedMesh` per kind, caps per kind / 256).

**Assets (`src/render/assets.js`)**
- GLTFLoader + MeshoptDecoder. Priority queue NOW/LATER, `MAX_PARALLEL = 4`, level-scoped via `levelAssets()` in `src/data/stages.js`.
- `instantiateCharacter()` clones every material per instance (for hit flash) and sets `frustumCulled = false` on every mesh.
- Every material is forced to `DoubleSide` (doubles fragment cost on closed meshes and breaks backface culling).
- Each spawn builds a new `AnimationMixer` and runs `clipAction` 11 times.

**Asset facts (measured)**

| Asset | Count | Tris | Texture | Notes |
|---|---|---|---|---|
| `models/characters/*_stage{1..3}.glb` | 12 | 7.4k–7.8k each | 1 x 1024² webp, 1 material | 24 joints (tinubu s2/s3: 26), 9–13 clips, meshopt + quantized, 280–400 KB |
| `models/stages/<id>/{pillar,prop}.glb` | 8 | 4.0k / 7.1k | 1024² webp | 95–175 KB |
| `textures/stages/<id>/floor.jpg` | 4 | – | city 2048², others 1024² | city 1.67 MB |
| `textures/stages/<id>/sky.jpg` | 4 | – | 2048x1024 | 270–845 KB |
| `textures/stages/<id>/stone.jpg` | 4 | – | 1024² | 250–600 KB |
| `ui/bosses/*.png` | 6 | – | PNG | 380–510 KB each (2.7 MB total, should be webp/avif at about 40 KB) |

GPU memory today:
- An RGBA8 1024² texture with mips is about 5.6 MB.
- The city floor at 2048² is about 22 MB.
- Each sky is about 8 MB, with mips it is wasted.
- Wave 3 holds about 6 characters + 2 props + 3 stage textures, roughly 70–80 MB of textures.
- Worst case across stages is about 130 MB, because nothing is ever disposed.

Wave 3 load: 60 enemies x 7.6k tris = about 456k skinned triangles, 60 skinned draw calls, 60 mixers.

**Game loop (`src/game/Game.js`)**: fixed 60 Hz `simulate()` then `bus.emitAll(state.events)` then `renderer.render(state, alpha, look, opts)`. lil-gui is imported statically. `window.__game` is exposed.

**Tests**: 35 Vitest tests. The architecture rule lives in `tests/units.test.js` (`describe('architecture')`): it scans `src/sim` and `src/data` text for `from 'three'|window.|document.|Math.random|Date.now|performance.now`.

**sproto-duel, worth porting**

| Duel file | What to take |
|---|---|
| `src/render/Renderer.ts` | ACES tone mapping, `info.autoReset=false` and once-per-frame reset, EffectComposer + half-res `UnrealBloomPass` + `OutputPass`, `setQuality`, and especially `precompile()` + `precompileShadowDepth()` + the `SHADOW_SIDE` map (warms every program, including shadow depth variants, into a 64x64 HalfFloat target) |
| `src/config.ts` `render:` block | `maxPixelRatio 1.5, bloomStrength 0.85, bloomRadius 0.5, bloomThreshold 0.78, shadowMapSize 2048, exposure 1.0` (shooter stage lighting was copied from duel `themes.ts`, which is tuned for these) |
| `src/arena/themes.ts` | `SkyDef` (procedural gradient/stars/smog/skyline shader params), `fog.density`, `ambient: {kind, rate, color, color2}` per theme (embers, snow, motes, dust) |
| `src/arena/Arena.ts` | `buildSky()` ~L950 (ShaderMaterial dome, `frustumCulled=false`, `renderOrder=-1`), sky-file handling ~L679 (`EquirectangularReflectionMapping`, `scene.background = files.sky`), ambient `ParticleSystem(800,false)` + `(500,true)` ~L324, sun shadow setup ~L979, texture dispose on theme swap ~L651 |
| `src/fx/ParticleSystem.ts` | Fixed-capacity point particles, live-packed with swap-and-pop, zero allocation. Port as the core of the VFX engine |
| `src/fx/textures.ts`, `Effects.ts`, `MuzzleFx.ts` | Procedural sprite textures; pooled effects pattern |
| `src/assets/rig.ts` | `rootBone`, `prepareRig`, improved `pinRootMotion` (foot-centred, samples 12 poses); the sampling loop is reusable for bounds |
| `src/assets/AssetLoader.ts` + `manifest.ts` | `resolveAsset` against `virtual:asset-index`, per-spec `maxTriangles` budget warning, `maxVoices` per sound, template-shares-materials clone |
| `vite.config.ts` | `assetIndex()` plugin (`virtual:asset-index`), `resolveBase()`, `build.assetsDir:'build'`, vendor chunk split for three, test/watch excludes for `.claude/**` and `.qa-build/**` |
| `scripts/check-assets.mjs` | gltf-transform NodeIO + meshopt triangle/bounds/size table, non-zero exit when over budget |
| `scripts/qa-headless.mjs` | Dependency-free headless Chrome (SwiftShader) runner over CDP that evaluates `__duel.qa.runAll()`, with `QA_PERF` |
| `src/qa/QAHarness.ts` (`perf()` ~L146, `step`, `setup`, scenario registry), `src/qa/pixels.ts` (silhouette luminance/contrast check), `src/qa/dev.ts` (dev-only install) | The in-browser QA harness design |
| `.claude/agents/qa-tester.md` | QA agent procedure and report format (p95 ≤ 16.7 ms, no frames > 50 ms) |
| `.github/workflows/ci.yml` | Node 20, `npm ci`, test, build, concurrency group |
| `ASSETS.md` L162 | `gltf-transform optimize ... --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.5` |

Duel versions: three ^0.186.1, vite ^8.3.5, vitest ^3.2.4, @gltf-transform/cli ^4.5.1, playwright 1.63.0, TypeScript 7 plus a `typescript5` alias. Duel does **not** use KTX2, distance LOD (staffs use a `-lod1` file always), or skinned culling.

---

## 1. Quality targets

### 1.1 Visual bar
| Feature | Decision |
|---|---|
| Tone mapping | `ACESFilmicToneMapping`, exposure 1.0, plus a per-stage `exposure` multiplier. Reason: the stage light values were copied from duel `themes.ts`, which is tuned for ACES. Expose `NeutralToneMapping` and `AgXToneMapping` in the debug panel for A/B only. |
| Lighting | Hemisphere + sun (shadow caster) + bounce, from `STAGES`. Add `scene.environment = PMREM(sky equirect)` with per-stage `envIntensity` (0.4–0.8) through `scene.environmentIntensity`, so characters and props get real IBL. The light set stays fixed for the whole session (no add/remove), so programs are never invalidated. |
| Shadows | One `DirectionalLight` sun, `PCFSoftShadowMap` on High and `PCFShadowMap` on Medium, 2048 map (1024 on Medium, off on Low). The shadow camera is an orthographic box of 50 m x 50 m that follows the player, with texel snapping (`floor(pos/texel)*texel`) to stop shimmer. Casters: stage props/pillars, weapon boxes, bosses, and only the **nearest 12 enemies** (`castShadow` toggled per frame by distance rank). Every other enemy uses the instanced blob shadow. The ground receives shadows. |
| Ambient occlusion | No SSAO on Low/Medium. On High, N8AO (`n8ao` ^1.9, half-res, `aoRadius 2, intensity 2.5`) only. Plus contact blob shadows (instanced) for every character and pickup. Bake AO into the stage props' vertex colors in the asset pipeline (optional, later). |
| Bloom | Threshold bloom at half resolution: strength 0.85, radius 0.5, threshold 0.78. Emissive projectiles, muzzle flashes, rarity beams and elements use `toneMapped:false` with colors above 1.0 so they bloom; the world does not. Per-stage `bloomStrength` override; `bloomBoost` hook for boss moments (the VFX half drives it). |
| Color grading | One final grade pass: exposure, contrast, saturation, lift/gain tint, and vignette, with per-stage params in `STAGES[id].grade` (plain numbers, so it stays sim-pure). Optional 32³ LUT per stage later. |
| Fog / atmosphere | Keep `THREE.Fog`, with near/far per stage (`fogNear`, `fogFar`; today it is hard-coded `60, 200`). Add the ambient particle field from duel `themes.ts` `ambient`: city dust/smog motes, volcano embers, void motes, glacier snow. Capacity 800 soft + 500 glow. |
| Readability | A Fresnel rim term injected into the shared character material (`onBeforeCompile`) with a per-stage `rimColor` and `rimStrength` (0.35 default, 0.6 for elites). Hit flash, burn and goo are material **variants** (see §3), not per-instance clones. No inverted-hull outlines on crowds (it doubles skinned draws). Bosses may get a hull outline on High. |
| Anti-aliasing | Composer render target with `samples: 4` (WebGL2 MSAA) on Medium/High; SMAA on Low; FXAA never. |
| Render scale | `renderScale` 0.67–1.0 applied as `setPixelRatio(devicePixelRatio * scale)`, capped at 1.5. Dynamic resolution: if render p90 > 15 ms over a 2 s window, scale steps down 0.1 (min 0.67); if p90 < 11 ms for 5 s, it steps up. |

Quality presets live in `src/render/core/quality.js`:

| Preset | Shadows | Bloom | MSAA/SMAA | AO | Shadow casters | Anim LOD distances (m) |
|---|---|---|---|---|---|---|
| Low | off | on (quarter res) | SMAA | off | 0 | 12/25/40 |
| Medium (default) | 1024 PCF | half res | MSAA 4 | off | 8 | 18/32/50 |
| High | 2048 PCFSoft | half res | MSAA 4 | N8AO | 12 | 25/40/60 |

### 1.2 Performance budgets
Reference machine: mid laptop GPU (Intel Iris Xe / RTX 3050 Laptop / Apple M1), 1080p, Medium preset. Worst-case scene: wave 3 with 60 enemies + Mega Tinubu + Hex Sahil, 600 projectiles, 1500 confetti.

| Metric | Budget |
|---|---|
| Frame | 60 fps; p95 ≤ 16.7 ms; 0 frames > 50 ms during combat; ≤ 1 frame > 33 ms per 10 s |
| Sim (`simulate` + `bus.emitAll`) | avg ≤ 1.5 ms per tick, max ≤ 4 ms. 1 tick per frame normally |
| Render CPU (scene update + `renderer.render` submission) | avg ≤ 5 ms |
| GPU | ≤ 10 ms at 1080p Medium |
| DOM HUD update | ≤ 0.8 ms per frame; 0 layout thrash (no reads after writes) |
| Draw calls (main + shadow) | typical ≤ 250, worst ≤ 400 |
| Triangles (main pass) | ≤ 900k worst; ≤ 1.4M including shadow pass |
| Shader programs | ≤ 40 total; **0 programs compiled after the wave-start warm-up** |
| Texture GPU memory (estimated from manifest) | ≤ 160 MB resident, ≤ 96 MB per level after KTX2 |
| Geometries resident | ≤ 300 |
| JS heap | ≤ 150 MB; growth ≤ 2 MB/min in steady combat; no GC pause > 5 ms (Chrome trace) |
| Initial JS | ≤ 220 KB gzip (three in a separate cached chunk; lil-gui lazy) |
| First load (title playable) | ≤ 2.5 MB of assets; TTI ≤ 3 s on 50 Mbps, ≤ 7 s on Lighthouse "Slow 4G" |
| Wave start | the asset gate resolves before the first spawn; no frame > 50 ms on the first spawn of each enemy type |

---

## 2. Architecture refactor

### 2.1 Typing: JSDoc + `// @ts-check` with `tsc --noEmit` (do **not** migrate to TS now)
Reasons:
1. 5.5k lines of working JS, and the architecture test scans `.js` text.
2. Data files stay plain objects.
3. Codex iterates faster without a build step.
4. `@types/three` gives full three typings to JS through `checkJs`.
5. PLAN.md §0.1 already chose this.

A later TS migration stays mechanical: the JSDoc types carry over.

Setup:
- Add `typescript@~5.9` and `@types/three@0.170.x`, matched to the three version. Duel keeps `typescript5` for a reason; TS 7 native JSDoc support is newer.
- Add `tsconfig.json`: `{"compilerOptions":{"allowJs":true,"checkJs":true,"noEmit":true,"target":"es2022","module":"esnext","moduleResolution":"bundler","strict":false,"noImplicitAny":false,"types":["vite/client"]},"include":["src","tests","scripts"]}`.
- Add `tsconfig.strict.json`, which extends it with `strict:true` and includes only `src/sim/**`, `src/data/**`, `src/core/**` and `src/render/**` as they are converted.
- `npm run typecheck` = `tsc -p tsconfig.json && tsc -p tsconfig.strict.json`.
- Central typedefs: `src/sim/types.js` (GameState, Enemy, Projectile, Pickup, Event union) and `src/render/types.js` (View, ViewFactory, QualityPreset, AssetSpec).

### 2.2 Shared code with sproto-duel: **no workspace or shared package now**
Reasons:
- Different three versions (0.170 vs 0.186) and languages.
- Separate deploys and repos.
- Duel carries server-sim/goja/Rapier constraints.
- The overlap is small: about 6 modules and the assets.

Instead:
1. **Port by copy**, with a header comment `// Ported from sproto-duel <path> @ <git sha>` so upstream fixes can be diffed.
2. **Asset sync script** `scripts/sync-duel-assets.mjs`: reads a list in `assets-src/duel-sources.json`, copies from `../crrreatorrr/sproto-duel/public/assets` (or a `DUEL_ASSETS` env path), and records the sha256 in `assets-src/duel-sources.lock.json`.
3. Revisit a `@sproto/three-kit` package only once both repos are on the same three version and at least 3 modules are byte-identical. Record this in `docs/ARCHITECTURE.md`.

Also align versions now (milestone M1): `three ^0.186.1` (WebGLRenderer, `compileAsync`, `scene.environmentIntensity` and postprocessing APIs are all stable there), `vite ^6` (or ^8 like duel if it installs cleanly), `vitest ^3.2.4`.

### 2.3 Target module layout
`renderer.js` becomes a thin facade that keeps its current public API: `render(state, alpha, look, opts)`, `project`, `resize`, `canvas`, `camera`, `setShowHitboxes`, `setStage`, `pendingDownloads`, `info`. `Game.js` does not change during the split.

```
src/render/
  renderer.js                 facade: createRenderer(container, bus) wires modules below, ~150 lines
  types.js                    JSDoc typedefs
  core/
    RenderContext.js          WebGLRenderer, scene, camera, resize, info reset per frame, renderScale
    PostFX.js                 composer: RenderPass(MSAA) → [N8AO] → Bloom → Grade+Vignette → OutputPass(ACES, sRGB)
    quality.js                presets (table §1.1) + applyQuality(ctx, preset)
    Warmup.js                 port of duel Renderer.precompile + precompileShadowDepth + compileAsync wrapper
    DynamicResolution.js
    clock.js                  presentation clock (performance.now, or fixed in QA)
    fxRandom.js               presentation RNG: Math.random normally, seeded sfc32 in QA (reuse core/rng.js)
  materials/
    geometries.js             shared G.* (sphere, box, ...)
    materials.js              shared M()/E() cache keyed by params; never per-instance
    characterMaterial.js      rim + variant cache (normal/flash/burn/goo/spawnFade) per template
  stage/
    StageEnvironment.js       sky (equirect background + PMREM env), ground, rim, edge ring, wall, lights, fog, grade params
    StageDecor.js             pillars/props as InstancedMesh (one per mesh part), placed once per stage
    AmbientParticles.js       per-stage ambient field (uses vfx/ParticleSystem)
    ShadowRig.js              follow-player texel-snapped sun shadow, caster selection
  camera/
    CameraRig.js              eye height, bob, landDip, trauma shake, fov punch/zoom (move from render())
  viewmodel/
    Viewmodel.js              gun mesh cache by gun.id, sway/kick/reload/swap, muzzle anchor, separate render layer/FOV
    gunMesh.js                buildGunMesh (shared by pickups)
  views/
    ViewRegistry.js           id→view map, factories by kind, acquire/update/release, linger support, pools
    EnemyView.js  BossView.js  AllyView.js  GunPickupView.js  HazardView.js  WeaponBoxView.js
    labels.js                 canvas label sprites (cached by text)
  characters/
    CharacterPool.js          pooled animated instances per (model,stage); prewarm(n)
    AnimLod.js                distance/visibility-based mixer update rates
    CrowdRenderer.js          (M9, optional) baked-bone-texture instanced crowd for midgets
  instancing/
    InstancedBatch.js         generic: capacity, live count, setMatrix/setColor/custom attrs, auto-grow ×2
    ProjectileBatches.js  PickupBatches.js  BlobShadows.js
  vfx/
    VfxEngine.js              owns systems; event→effect registry API for the content half: vfx.register('kill', fn)
    ParticleSystem.js         port of duel src/fx/ParticleSystem.ts (points, swap-and-pop, additive/soft)
    MeshParticles.js          instanced quads/meshes (confetti, debris) with live packing
    Tracers.js  Booms.js (pooled instanced spheres)  DamageNumbers.js (WebGL digit atlas, optional)
    textures.js               procedural sprite textures (port subset of duel fx/textures.ts)
  assets/
    AssetStore.js             (was assets.js) templates, textures, refcounts, dispose
    DownloadQueue.js          NOW/LATER queue + byte progress
    LevelStreamer.js          (was requestNeeds) needs(state) → requests, readiness, prefetch, eviction
    manifest.generated.js     produced by the pipeline: logical id → {url, bytes, gpuBytes, tris, kind, lod1?}
    ktx2.js                   shared KTX2Loader (transcoder path, detectSupport)
    rig.js                    port of duel rig.ts + bounds sampler
  debug/
    StatsOverlay.js  FrameGraph.js  HitboxOverlay.js (pooled meshes)  perfCounters.js
src/audio/
  AudioEngine.js              buses, voice limits, sample cache via the asset queue (infrastructure only)
  sfx.js                      existing synth, routed through AudioEngine buses
src/qa/                       QA harness (loaded only with ?qa=1 or in dev)
```

Rules:
- `sim/` and `data/` stay pure.
- `render/`, `ui/` and `audio/` may import `data/` and read state, and must never write state.
- `render/` must not import `ui/`; `ui/` gets projections through the `project` callback, as today.
- Add an ESLint 9 flat config with `no-restricted-imports` (three, `../render`, `../ui` banned in sim/data) and `no-restricted-globals`/`no-restricted-properties` (`Math.random`, `Date.now`, `performance.now`, `window`, `document` in sim/data). Keep the existing text-scan test too.

### 2.4 Entity view lifecycle and pooling
`ViewRegistry` API:
```js
/** @typedef {{kind:string, key:(e)=>string, create:(e,ctx)=>View, update:(view,e,frame)=>void, release:(view)=>void, linger?:(view,frame)=>boolean}} ViewFactory */
registry.define('enemy', EnemyView); // etc.
registry.sync(kind, entities, frame); // per frame: acquire new ids, update seen, mark unseen
registry.endFrame(frame);             // unseen → linger (death anim) → release to pool
```
- Pools are keyed by `kind + key`; for enemies the key is `type:model:stage:loaded`, as in today's `viewKey`.
- `release` hides the object and returns it to the pool; nothing is removed from the scene graph per frame.
- **Linger**: the sim drops dead entities. The view can keep playing `defeat` for up to 1.2 s with interpolation frozen, then release. The content half decides the visuals; the infrastructure only provides the hook.
- A model swap on asset arrival (fallback capsule → rigged) releases the fallback and acquires a rigged instance with the same transform.

### 2.5 Event-driven presentation
Keep `core/eventBus.js`. Add a frame-batched dispatcher in the renderer:
- Events from N ticks in one frame are queued and processed at the start of `render()`, so VFX spawning happens once per frame.
- Stable event-type constants in `src/sim/events.js`; render, audio and UI subscribe to these.
- `VfxEngine.on(type, handler)` replaces the inline `bus.on(...)` blocks in renderer.js (~L319–375).
- Hitstop and shake stay in Game and CameraRig respectively.

---

## 3. Character rendering at scale (60 rigged enemies)

Apply in order and measure after each step (stats overlay, §5).

1. **Stop forcing `DoubleSide`** in `loadModel`/`loadStatic`. Respect the authored `material.side`, except for an allowlist in the manifest (`doubleSided: true`) for models with open meshes. This halves fragment overdraw on characters and props.
2. **Shared materials with variants instead of per-instance clones.** `characterMaterial.js`:
   - `getVariant(templatePath, baseMaterial, variant)` returns a cached clone per (template, variant). Variants: `normal`, `flash` (emissive 0.9), `burn` (0.45,0.12,0), `goo` (0.08,0.3,0), `elite` (rim boost). All variants share defines, so they share one program.
   - `setTint` becomes `mesh.material = variant`, set only when the state changes.
   - Rim/Fresnel injection through `onBeforeCompile`, with `customProgramCacheKey = () => 'charRim'` so all characters share one program.
   - Do not use per-object `uniformsNeedUpdate` tricks.
3. **Frustum culling for skinned meshes.** In `rig.js`, `computeAnimatedBounds(template, clips)`:
   - For each clip, sample 8 times with a temporary mixer and union the `SkinnedMesh.computeBoundingBox()` results (three r151+ computes skinned bounds from the current pose).
   - Pad by 10% and assign `skinnedMesh.boundingSphere` and `boundingBox` on the template. SkeletonUtils clones copy them, so it is a one-time cost per template.
   - Set `frustumCulled = true`.
   - With a 90° FOV, about 50–70% of enemies are off-screen in a surround fight.
4. **Animation LOD (`AnimLod.js`)**:
   - Each view keeps `animAcc`.
   - Update rates: 60 Hz under d0, 30 Hz under d1, 15 Hz under d2, 7.5 Hz beyond (distances from the quality preset).
   - Culled views are not updated at all. They accumulate time, are capped at 0.5 s, and are applied on re-entry.
   - Call `mixer.update(acc)` only when the accumulator crosses the step.
   - Stagger by `id % k` so updates spread across frames.
   - Bosses are always 60 Hz.
   - Target: at most 25 `mixer.update` calls per frame in wave 3.
5. **Character pool (`CharacterPool.js`)**:
   - `prewarm(model, stage, n)` builds instances (SkeletonUtils clone, mixer, all `clipAction`s bound) during level loading, off the combat path.
   - Default prewarm counts come from `levelAssets()` × the wave's max concurrent count (computed from `WAVES[i].groups`; see `src/data/waves.js`), capped at 24 per type.
   - `acquire/release` reset actions with `mixer.stopAllAction()` and set a random start phase via the seeded fxRandom.
6. **Shadow caster cap**: only the nearest K enemies cast shadows (K from the preset); the rest use instanced blob shadows (`BlobShadows.js`, one draw call).
7. **Distance LOD meshes**:
   - The pipeline produces `<name>-lod1.glb` (meshopt simplify, ratio 0.35, error 0.01, about 2.6k tris) with the skin kept and **animations and textures stripped**.
   - At load, the LOD1 `SkinnedMesh` is bound to the LOD0 skeleton: `lod1.bind(lod0Skeleton, lod0.bindMatrix)`. The pipeline check asserts identical joint names and order.
   - Switch at 25 m with hysteresis of ±2 m.
   - Expected wave-3 triangle saving is about 50%.
8. **(Conditional, M9) Instanced crowd with baked bone textures.** Do this only if, after steps 1–7, wave 3 render CPU is still above 5 ms or draw calls are above 300.
   - At load, for midget/flying-midget clips `run`, `idle`, `cast`, `jump` and `stun`, bake bone matrices at 30 fps into a `DataTexture`. Size: 24 bones × 4 texels × about 120 frames ≈ 11.5k texels (RGBA32F, about 184 KB). This is far smaller than vertex-animation textures (about 1.2 MB per clip).
   - Draw all far midgets (beyond 15 m) with one `InstancedMesh` of the LOD1 geometry. A custom skinning chunk reads `boneTexture` at `(instanceClipStart + frame) * 24 + boneIndex`.
   - Per-instance attributes: `aClip` (start, length), `aTime`, `aTint` (vec3).
   - Near enemies stay real SkinnedMeshes for crossfades and hit reactions.
   - Hand-off between the two at 15 m uses the pool, with no visible pop: same frame index at the swap.
   - Impostors: not needed at a 90 m arena with fog; skip.

Acceptance numbers for §3 (wave 3 stress, Medium): skinned draw calls ≤ 35, `mixer.update` calls per frame ≤ 25, programs for characters = 1 (main) + 1 (depth), render CPU ≤ 5 ms on the reference machine, and ≤ 12 ms under SwiftShader at 800x450 relative to the baseline (tracked, not absolute).

---

## 4. Asset pipeline and loading

### 4.1 Layout
- Move the current `public/assets/**` originals to `assets-src/**` with `git mv` (no duplication in history).
- The pipeline writes processed files to `public/assets/**` with **content-hashed names** and generates `src/render/assets/manifest.generated.js`, which is committed.
- `data/stages.js` keeps **logical ids** (`models/characters/midget_stage1.glb`); only `AssetStore` maps logical id to hashed URL through the manifest. data/ stays pure.

### 4.2 Tools (devDependencies)
`@gltf-transform/core`, `@gltf-transform/extensions` and `@gltf-transform/functions` ^4.5.1, `@gltf-transform/cli` ^4.5.1, `meshoptimizer` ^0.22, `sharp` ^0.33.

KTX-Software `toktx` 4.3+ is required for `etc1s`/`uastc`. Document the install; CI downloads the release `.deb`.

`scripts/build-assets.mjs` (idempotent; skips a file when the sha256 of input + config is unchanged, cached in `assets-src/.cache.json`):

| Class | Steps | Target |
|---|---|---|
| Character GLB | `dedup → prune → weld → resample (animations, tolerance 1e-4) → quantize → meshopt` (level medium). Texture: resize ≤ 1024, then `etc1s` (quality 128) for baseColor; normal maps, if present, use `uastc` + zstd. Keep `KHR_mesh_quantization`. Also emit `-lod1.glb` (simplify ratio 0.35, error 0.01, strip animations and textures, keep skin) | ≤ 300 KB per GLB, ≤ 9k tris, LOD1 ≤ 3k tris, ≤ 26 joints |
| Stage pillar/prop | Same; textures ≤ 1024 ETC1S; simplify only if over budget | pillar ≤ 5k tris, prop ≤ 8k tris (duel budgets), ≤ 150 KB |
| Floor/stone | Resize floor to 1024² (city floor 2048 → 1024; it tiles 10x anyway). `toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap` for floor (detail matters); stone ETC1S | ≤ 400 KB each; GPU 1.4 MB for 1024² UASTC→BC7/ASTC |
| Sky | 2048x1024 ETC1S, **no mipmaps** (`minFilter = LinearFilter`) | ≤ 350 KB; GPU about 1 MB |
| Boss portraits | sharp → `.webp` q80 at the actual display size (≤ 512 px) | ≤ 60 KB each (from about 450 KB) |
| UI images / icons | webp | – |
| Audio (when sampled audio arrives) | ffmpeg → `.webm` Opus 64 kbps for SFX (mono, ≤ 1.5 s, ≤ 30 KB) and 96 kbps for music; `.m4a` AAC fallback when `canPlayType('audio/webm; codecs=opus')` fails | SFX ≤ 30 KB, music streamed through `<audio>` + MediaElementSource |

The generated manifest entry looks like this:
```js
export const MANIFEST = { 'models/characters/midget_stage1.glb': { url: 'models/characters/midget_stage1.3f9a2c1d.glb', bytes: 241332, gpuBytes: 1398101, tris: 7578, joints: 24, lod1: 'models/characters/midget_stage1-lod1.a81c0e22.glb', kind: 'character' }, ... };
```

### 4.3 Runtime loading
- `ktx2.js`: one `KTX2Loader` with `setTranscoderPath(BASE + 'basis/')` and `detectSupport(renderer)`, set on GLTFLoader via `setKTX2Loader`. Copy `node_modules/three/examples/jsm/libs/basis/basis_transcoder.{js,wasm}` into `public/basis/` from a `postinstall` script (`scripts/copy-basis.mjs`). The transcoder (about 200 KB gzip) is fetched in parallel with the first GLB.
- Fallback: if KTX2 fails (no WebAssembly), keep the webp variants (`url` + `urlFallback` in the manifest) for one release, then drop them.
- `DownloadQueue.js`:
  - Keep NOW/LATER and promotion.
  - Add byte progress: `GLTFLoader.loadAsync(url, onProgress)`; the total comes from manifest `bytes`.
  - `progress(levelId) → {loaded, total, files}` drives a loading bar.
  - Raise `MAX_PARALLEL` to 6 on HTTP/2 hosts.
- **Upload on arrival**: after a texture or model template is ready, call `renderer.initTexture(tex)` for each texture (r163+), so the GPU upload does not hit the first draw.
- **Level gate (presentation only, sim untouched)**, in `Game.js`:
  - `startMode` for waves is queued only once `LevelStreamer.coreReady(level)` is true (stage + wave characters). Show a loading overlay with progress; time out at 15 s and fall back to capsules.
  - At intermission end, if the next level is not core-ready, Game stops advancing `acc` (it does not tick the sim) while `wave.phase === 'intermission'` and the remaining intermission time is ≤ 0.1 s, and shows "Loading next stage". Ticks resume when ready. Determinism is unaffected because only the number of ticks per wall second changes.
- **Warm-up before each wave and stage swap** (`Warmup.js`):
  1. `applyStage(next)`.
  2. `CharacterPool.prewarm`.
  3. Add one hidden instance of every enemy, boss phase, projectile kind and VFX system to the scene.
  4. `await renderer.compileAsync(scene, camera)`.
  5. Duel-style `precompile()` into the 64x64 HalfFloat target, including `precompileShadowDepth()`.
  6. Restore visibility.
  - Record `programsBefore/After` and log `[warmup] +N programs in X ms`.
  - Acceptance: `renderer.info.programs.length` does not change from 1 s after wave start until wave end.
- **Eviction**: `AssetStore` refcounts templates by level.
  - On entering wave N, release assets not in `levelAssets(N)`, the current boss set, or the next level's prefetch set. Dispose geometry, materials and textures, and drop pool entries.
  - Memory cap: if the summed manifest `gpuBytes` exceeds 160 MB, evict least-recently-used LATER items first.
  - Title/sandbox keep `city`.
- **Stage swap without rebuild churn**: `applyStage` runs once per stage when its assets are complete (not on every `assetsVersion` bump). Texture clones are created once per stage and disposed on swap. Pillars and props become `InstancedMesh` per sub-mesh: 16 pillars = 1 draw per material, 12 props = 1 draw per material.
- **Service worker**: **no**. Hashed filenames plus `Cache-Control: public, max-age=31536000, immutable` on `/assets/**`, `/build/**` and `/basis/**`, with `index.html` set to `no-cache`, give near-instant repeat loads without stale-SW bugs. Ship `public/_headers` (Netlify/Cloudflare Pages format) and `docs/DEPLOY.md` with nginx and Vercel equivalents. Revisit for offline/PWA later.
- **Bundle**:
  - `build.rollupOptions.output.manualChunks: { three: [/node_modules\/three/] }` (or a rolldown `codeSplitting.groups` block if on Vite 8, like duel).
  - `lil-gui` becomes `await import('lil-gui')` inside `buildDebug` when debug is opened.
  - `build.assetsDir: 'build'` (duel convention).
  - `target: 'es2022'`.

### 4.4 Audio engine (infrastructure only)
`src/audio/AudioEngine.js`:
- One `AudioContext`, unlocked on the first gesture (keep `ensure()`).
- Buses `master → {sfx, ui, music}` as GainNodes, plus a `DynamicsCompressorNode` on master.
- `play(id, {pos, volume, pitchVar})` with a per-sound `maxVoices` (duel `manifest.ts` pattern; oldest voice stolen) and a global cap of 32.
- Distance attenuation in 2D from the listener (camera) for positional SFX, computed cheaply without PannerNode per voice, or a PannerNode pool of 16.
- Decoded buffers are cached and loaded through `DownloadQueue` with level scope.
- The existing synth in `sfx.js` routes into the `sfx` bus.
- The content half supplies the sounds.

---

## 5. Performance engineering

### 5.1 Instrumentation (first, M2)
- `debug/perfCounters.js`: rolling ring buffers (240 samples) for `frameMs`, `simMs` (wrap the tick loop in `Game.frame`), `ticksPerFrame`, `renderCpuMs` (around `renderer.render()` / `composer.render()`), `hudMs` (around UI update), `gpuMs` (`EXT_disjoint_timer_query_webgl2` when available; otherwise "n/a").
- `StatsOverlay.js`: a fixed `<canvas>` 260x120 at top-left, toggled with F3 or `?stats=1`. Shows fps, p95, a frame graph (stacked sim/render/hud), `info.render.calls`, `triangles`, `info.memory.geometries/textures`, `info.programs.length`, live enemies/projectiles/particles, `performance.memory.usedJSHeapSize` (Chrome), pending downloads, estimated GPU MB from the manifest, and renderScale.
- `renderer.info.autoReset = false`, with `info.reset()` once at the start of `render()` (the composer renders several passes).
- `window.__sproto.perf(seconds)`: a port of duel `QAHarness.perf()` returning `{frames, avgFps, avgMs, p95Ms, p99Ms, maxMs, framesOver20ms, framesOver50ms, simAvgMs, simMaxMs, renderAvgMs, drawCalls, triangles, programs, textures, geometries, heapMB}`.

### 5.2 Fixes
- Remove all per-frame allocation in the render path:
  - Tint arrays become constant `Float32Array`s or the variant swap.
  - `addTracer` reuses a scratch `Color`.
  - `addBoom` uses a pooled instanced `Booms` batch (64 cap; per-instance scale/opacity via an `aAlpha` attribute and a shared shader).
  - `HitboxOverlay` uses pooled meshes.
  - `requestNeeds` moves into `LevelStreamer.update` without closures.
  - UI `n.pos = {...ev.pos}` copies into preallocated objects.
- Verify with a Chrome allocation timeline: < 50 KB/s steady-state allocation in combat.
- Confetti and particles: live packing (swap-and-pop), so only live instances are written and `count` is set to the live count. 1500 cap; the update loop runs over live particles only. Use `DynamicDrawUsage` and `instanceMatrix.addUpdateRange(0, live*16)` (r159+ `addUpdateRange`).
- Projectiles: 600 alive. `InstancedBatch` caps grow to the next power of two on overflow, which removes the silent `continue` that drops projectiles. Write matrices with direct `Float32Array` composition (position + scale + yaw/pitch quaternion) instead of `dummy.lookAt + updateMatrix`, to save about 40% of CPU in that loop.
- Pickups: keep instancing, plus `addUpdateRange`.
- Tracers: keep LineSegments; consider camera-facing quads later for width (content half).
- Damage numbers: the DOM pool of 48 currently writes `transform` and `opacity` every frame for all elements.
  - Fix: skip dead elements entirely (only write on the transition to dead), and batch reads (no `offsetWidth` reflow for the hitmarker; use `animation` restart via `classList` toggles on alternating classes).
  - Optional M8: `vfx/DamageNumbers.js` WebGL version, one `InstancedMesh` of quads plus a digit atlas canvas texture, so the DOM cost is zero. The content half decides the style.
- HUD writes only on change: the `set()` helper exists in ui.js; audit that every per-frame write goes through it.
- Sim (strict constraint: bit-identical results; the determinism and full-run tests must pass unchanged): profile `simulate` in Node with `tests/perf/sim.bench.js` (vitest `bench`). Only if projectile-vs-enemy collision dominates, add a uniform-grid broadphase in `src/sim/collision.js` that preserves iteration order (sort candidate ids ascending).
- Workers: **do not move the sim to a worker now**. Expected sim cost is about 1 ms; a worker adds a frame of input latency plus state transfer and would need SharedArrayBuffer (COOP/COEP headers). Reconsider only if `simAvgMs > 4`. Candidates for workers instead: KTX2 transcoding (already in a worker) and meshopt decoding (use `MeshoptDecoder.useWorkers(2)` from three's meshopt module, if the decoder build supports it).

---

## 6. QA and tooling

### 6.1 In-browser QA API (`src/qa/`, loaded with `?qa=1` or in dev via dynamic import; not in the default prod chunk)
`window.__sproto.qa`:
- `ready()`: resolves when the current level is core-ready and warm-up is done.
- `setStage(id)`, `startWave(index, tier)`.
- `stress({midgets:60, obamas:0, projectiles:600})`: uses the existing debug ops in `src/sim/actions.js` (`spawnEnemy`, plus a new deterministic `spawnProjectiles` debug op if needed, added in sim with tests).
- `freeze(true)`: stops ticking and sets the fixed presentation clock and seeded `fxRandom`.
- `setCamera({x,y,z,yaw,pitch})`.
- `step(ticks)`, `perf(s)`, `stats()`, `screenshotReady()` (waits 2 rAF).
- `runAll()`: a scenario registry like duel's `QAHarness`.

Port the `pixels.ts` idea as `qa/pixels.js` `regionStats(rect)`: mean luminance, blown-out %, and contrast. It asserts that the frame is not black or white and that enemies read against the background (contrast ≥ 0.08).

### 6.2 Playwright
- devDependency `@playwright/test@1.63.0` (same as duel).
- `playwright.config.js`: `webServer: { command: 'npm run build && npx vite preview --port 4174 --strictPort', url: 'http://127.0.0.1:4174' }`.
- `use.launchOptions.args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--mute-audio']`, viewport 1280x720, `deviceScaleFactor: 1`.

Tests in `tests/e2e/`:
1. `smoke.spec.js`: load `/?qa=1`. No console errors or `pageerror`. The title screen is visible. Canvas mean luminance is between 0.03 and 0.95. Click Wave Mode, then `ready()`. No 404s (`page.on('response')`). The initial JS transfer is ≤ 250 KB gzip (sum of `build/*.js` response sizes).
2. `stages.spec.js`: for each `city`, `volcano`, `void` and `glacier`: `setStage`, `freeze`, `setCamera` at a fixed pose, `ready()`, then `expect(page).toHaveScreenshot('stage-<id>.png', {maxDiffPixelRatio: 0.02, threshold: 0.2})`. Goldens are generated on the CI image (ubuntu-latest) with `npx playwright test --update-snapshots` and committed under `tests/e2e/__screenshots__/`.
3. `waves.spec.js`: for waves 0–2, `startWave(i,1)`, step 600 ticks with an autopilot command, then a screenshot and stats assertions. Draw calls ≤ 400, programs unchanged after warm-up, no texture count growth across two runs of the same wave (leak check), and `info.memory.textures` back to ≤ baseline + 2 after leaving the stage (eviction works).
4. `perf.spec.js`, `stress({midgets:60, projectiles:600})` for 8 s:
   - Hard (blocking) checks: `drawCalls ≤ 400`, `triangles ≤ 1.4M`, `programs` delta 0, `simAvgMs ≤ 3` (CPU-bound, fairly stable), `heapMB ≤ 200`.
   - Soft check: SwiftShader `p95Ms` compared with `tests/e2e/perf-baseline.json`; fail only on more than 35% regression; updated manually with `npm run perf:baseline`.
- Also keep a CDP runner for agents: port `scripts/qa-headless.mjs` from duel (it changes `__duel` to `__sproto`; no Playwright dependency needed) as `npm run qa:headless`.

### 6.3 Asset budget check
`scripts/check-assets.mjs`, extended from the duel script:
- For each GLB: tris vs budget by category, joints ≤ 26, texture dims ≤ 1024 (sky ≤ 2048x1024), KTX2 required for textures after M6, `DoubleSide` only if allowlisted, and LOD1 present for characters with joint order equal to LOD0.
- For each level (imports the pure `levelAssets()` and `stageAssets()` from `src/data/stages.js` in Node): total download bytes ≤ 4 MB for wave 1 + title, ≤ 4 MB per later wave delta, and GPU estimate ≤ 96 MB.
- Every logical id referenced in `data/` exists in the manifest; no unreferenced files in `public/assets`.
- Exit 1 on violation; prints `console.table`.

### 6.4 Bundle check
`scripts/check-bundle.mjs` gzips `dist/build/*.js`. Fail if the entry chunk is over 120 KB gzip, the three chunk over 190 KB gzip, or the total over 330 KB gzip.

### 6.5 CI (`.github/workflows/ci.yml`)
- Triggers: `pull_request` and `push` to main; concurrency group as in duel; Node 20; `npm ci`.
- Job `verify`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:assets`, `npm run check:bundle`.
- Job `e2e` (needs verify): `npx playwright install --with-deps chromium`, then `npx playwright test`. On failure, upload `test-results/` and `playwright-report/` as an artifact.
- Scripts in `package.json`: `lint` (eslint .), `typecheck`, `test`, `test:e2e`, `check:assets`, `check:bundle`, `assets:build`, `assets:sync`, `qa:headless`, `perf:baseline`.

### 6.6 Debug panel additions (lil-gui, lazy)
Folder "Render":
- Quality preset, renderScale, dynamic resolution on/off.
- Tone mapping (ACES/AgX/Neutral), exposure.
- Bloom strength/radius/threshold, AO on/off, MSAA/SMAA.
- Shadows on/off/size, shadow caster count.
- Anim LOD distances, LOD1 switch distance, crowd renderer on/off.
- Show bounds spheres, freeze culling (keep the culling camera fixed and fly away to inspect).
- Show stats overlay, warm-up now (logs program delta).
- Grade params live-edit, with "copy stage grade JSON" for pasting into `STAGES`.

Folder "Assets": pending downloads, resident GPU MB, evict now, list resident templates with refcounts.

Folder "Stress": spawn 60 midgets, add 600 projectiles, confetti burst 1500.

Also add `.claude/agents/qa-tester.md`, adapted from duel (sproto-shooter keys, `__sproto.qa`, the budgets from §1.2).

---

## 7. Milestones
Each milestone is one branch and one PR against `crrreatorrr/sproto-shooter` `main` (for example `infra/m1-tooling`). Every milestone ends with `npm test` (all 35+ existing tests unchanged and passing), `npm run build`, no console errors, and the listed acceptance checks. Commit messages and PR bodies use the attribution lines the session provides.

### M0. Baseline capture (half a day)
- **Goal**: numbers to compare against.
- **Files**: `docs/PERF_BASELINE.md` (new); a temporary measurement snippet run in devtools.
- **Steps**:
  1. Run `npm run build` and record dist sizes (gzip).
  2. In the dev server with `?mode=sandbox&debug=1`, spawn 60 midgets via the debug panel and record `renderer.info` (calls, triangles, programs, textures) and fps under SwiftShader 800x450.
  3. Record wave-1 first-load bytes from the network log.
- **Accept**: the doc exists with a table.

### M1. Tooling, versions, CI skeleton
- **Goal**: lint, typecheck and CI green before any refactor.
- **Files**:
  - `package.json` (scripts and deps: three ^0.186.1, @types/three ^0.186, vite ^6 or ^8, vitest ^3.2.4, typescript ~5.9, eslint ^9, @eslint/js, globals)
  - `tsconfig.json`, `tsconfig.strict.json`, `eslint.config.js`
  - `vite.config.js` (manualChunks three, assetsDir 'build', target es2022, test excludes `.claude/**`, `.qa-build/**`, `tests/e2e/**`)
  - `.github/workflows/ci.yml`
  - `src/game/Game.js` (lazy `import('lil-gui')`)
  - `scripts/check-bundle.mjs`
- **Steps**:
  1. Bump three and fix r170→r186 breakages. Expect few: verify `Box3.setFromObject(holder, true)`, `SkeletonUtils.clone`, and `RingGeometry`/`CapsuleGeometry` signatures.
  2. Add `// @ts-check` to `src/core/*`, `src/sim/*` and `src/data/*` and fix errors with JSDoc only.
  3. Write the ESLint boundary rules.
- **Accept**: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle` pass locally and in CI. Entry chunk ≤ 120 KB gzip. Game plays identically: the determinism and fullrun tests pass, and a manual check of wave 1 looks the same.

### M2. Perf instrumentation and stats overlay
- **Files**: `src/render/debug/perfCounters.js`, `src/render/debug/StatsOverlay.js`, `src/render/debug/FrameGraph.js`; `src/game/Game.js` (time sim and render, F3 toggle, `?stats=1`); `src/render/renderer.js` (`info.autoReset=false`); `window.__sproto = { game, perf }`.
- **Accept**: the overlay shows every metric in §5.1. `__sproto.perf(5)` returns the full object. Overhead when hidden ≤ 0.05 ms per frame.

### M3. Renderer split (pure refactor, no visual change)
- **Files**: create the `src/render/{core,materials,stage,camera,viewmodel,views,instancing,vfx,assets,debug}/` modules listed in §2.3. `renderer.js` becomes the facade. `assets.js` moves to `assets/AssetStore.js` + `assets/DownloadQueue.js` + `assets/LevelStreamer.js`, with a re-export shim at `src/render/assets.js` for one milestone. Add `src/render/types.js`.
- **Steps**: move code verbatim module by module (stage, then camera, viewmodel, instancing, VFX, views), running the game after each. Introduce `ViewRegistry` with pooling and linger hooks; `releaseUnseen` becomes `registry.endFrame`. Put the event handlers into `VfxEngine` (`vfx.on(type, fn)`). Add `clock.js` and `fxRandom.js`, and replace every `Math.random()` and `performance.now()` in render with them.
- **Accept**:
  - No file in `src/render` over 400 lines.
  - `renderer.js` ≤ 200 lines.
  - Before/after screenshots of the title (fixed seed, `?qa=1` freeze added in M4) are pixel-identical within 1%.
  - `__sproto.perf` numbers within ±5% of M0.
  - `tsc` passes with `src/render/**` under `@ts-check` (non-strict).

### M4. QA harness + Playwright smoke + screenshot goldens
- **Files**: `src/qa/index.js`, `src/qa/harness.js`, `src/qa/pixels.js`; `src/main.js` (dynamic import when `?qa=1` or `import.meta.env.DEV`); `playwright.config.js`; `tests/e2e/{smoke,stages,waves}.spec.js`; `scripts/qa-headless.mjs` (ported); `.claude/agents/qa-tester.md`; CI e2e job.
- **Accept**: CI e2e is green, with 4 stage goldens and 3 wave goldens committed. Smoke catches an injected console error (verify once locally by throwing in a test branch). The prod build without `?qa=1` does not download the qa chunk.

### M5. Rendering quality pass 1: tone mapping, env, shadows, post FX
- **Files**:
  - `src/render/core/RenderContext.js` (ACES, `antialias:false`, `stencil:false`)
  - `src/render/core/PostFX.js`: three `EffectComposer` + `RenderPass` + `UnrealBloomPass` (half res) + `ShaderPass` grade/vignette + `OutputPass`. The composer target uses `samples: 4`. Use three's built-ins for parity with duel. Optionally swap to pmndrs `postprocessing` ^6 later if the merged-pass cost matters (decide by GPU timer: switch if post is over 2.5 ms on the reference machine).
  - `src/render/core/quality.js`
  - `src/render/stage/StageEnvironment.js`: `scene.background = sky` equirect; PMREM `scene.environment` generated once per stage during loading and disposed on swap; remove the sky sphere.
  - `src/render/stage/ShadowRig.js`
  - `src/render/stage/AmbientParticles.js` + `src/render/vfx/ParticleSystem.js` (duel port)
  - `src/data/stages.js`: add per-stage `exposure`, `envIntensity`, `fogNear`, `fogFar`, `bloomStrength`, `rimColor`, `rimStrength`, `grade:{contrast,saturation,tint:[r,g,b],vignette}`, `ambient:{kind,rate,color,color2}` (values from duel `themes.ts` for city/volcano/glacier/void)
  - `src/render/materials/characterMaterial.js` (rim plus variants; this also does §3 step 2)
  - Remove forced `DoubleSide` (manifest allowlist placeholder in `AssetStore`).
- **Accept**:
  - Goldens updated after visual sign-off, with screenshots attached to the PR.
  - Per stage, `regionStats` over the enemy silhouettes shows contrast ≥ 0.08, and blown-out pixels are ≤ 2% of the frame outside VFX.
  - Medium preset: draw calls ≤ +20% vs M3 (shadow pass, capped casters). Programs ≤ 40.
  - Debug panel can switch Low/Medium/High live without errors.

### M6. Asset pipeline: KTX2, resize, hashing, manifest, LOD1
- **Files**:
  - `scripts/build-assets.mjs`, `scripts/copy-basis.mjs` (postinstall), `scripts/sync-duel-assets.mjs`
  - `assets-src/**` (git mv of the originals), `assets-src/duel-sources.json`, `assets-src/budgets.json`
  - `src/render/assets/manifest.generated.js`, `src/render/assets/ktx2.js`
  - `AssetStore.js` (manifest URL mapping, KTX2, LOD1 binding)
  - `scripts/check-assets.mjs`
  - `public/_headers`, `docs/ASSETS.md`, `docs/DEPLOY.md`
  - CI: install `toktx` only in an optional `assets` job. Processed outputs are committed, so verify does not need toktx.
- **Accept**:
  - `npm run check:assets` passes.
  - Wave-1 + title download ≤ 2.5 MB (from about 4 MB).
  - Total `public/assets` ≤ 9 MB (from 15 MB).
  - Resident estimated texture GPU MB per level ≤ 96 (logged by the overlay).
  - Boss portraits ≤ 60 KB each.
  - Screenshot goldens within `maxDiffPixelRatio 0.03` of M5, or re-approved.
  - Repeat load in CI with cache enabled shows 0 asset bytes re-downloaded (Playwright: reload and check `response.fromCache()` or the 304 count).

### M7. Loading UX, warm-up, eviction, stage instancing
- **Files**:
  - `src/render/assets/DownloadQueue.js` (byte progress), `LevelStreamer.js` (coreReady, prefetch, eviction, refcount)
  - `src/render/core/Warmup.js` (compileAsync + duel precompile/precompileShadowDepth)
  - `src/render/characters/CharacterPool.js` (prewarm)
  - `src/render/stage/StageDecor.js` (InstancedMesh decor)
  - `src/game/Game.js` (loading overlay gate before `startMode`, intermission hold; presentation-only)
  - `src/ui/ui.js` (progress bar element), `src/styles/game.css`
- **Accept**:
  - The Playwright `waves.spec` asserts `programs` delta == 0 from 1 s after wave start through 600 ticks.
  - No frame > 50 ms during the first 5 s of each wave (SwiftShader excluded; record on a real GPU in the PR description).
  - Decor draw calls ≤ 4 per stage (from about 28).
  - After wave 1 → 2 → 3, `info.memory.textures` ≤ textures needed for wave 3 + next + 4.
  - The sim tests are untouched and pass. A new Vitest test `tests/presentationGate.test.js` shows that holding ticks does not change a seeded run's final state hash compared to not holding.

### M8. Character scale and CPU efficiency
- **Files**:
  - `src/render/assets/rig.js` (`computeAnimatedBounds`, port of duel `rootBone` / `pinRootMotion`)
  - `src/render/characters/AnimLod.js`, `CharacterPool.js` (acquire/release)
  - `src/render/views/EnemyView.js` (culling on, variants, LOD1 swap, shadow caster rank)
  - `src/render/instancing/{InstancedBatch,ProjectileBatches,PickupBatches,BlobShadows}.js`
  - `src/render/vfx/{MeshParticles,Booms,Tracers}.js` (live packing, pooling, no allocations)
  - `src/ui/ui.js` (damage number write-skipping, no forced reflow)
  - `tests/perf/sim.bench.js`, `tests/e2e/perf.spec.js`, `tests/e2e/perf-baseline.json`
- **Accept** (stress: 60 midgets + 600 projectiles, Medium):
  - Draw calls ≤ 250.
  - Skinned draws ≤ 35.
  - `mixer.update` calls per frame ≤ 25.
  - No dropped projectiles (instance count equals `state.projectiles.length`).
  - Steady-state allocation < 50 KB/s (Chrome memory panel, noted in the PR).
  - `perf.spec` hard limits pass.
  - SwiftShader p95 improves ≥ 25% vs M3 baseline.

### M9 (conditional). Instanced crowd renderer
- **Trigger**: on the reference GPU after M8, render CPU > 5 ms or draw calls > 300 in wave 3.
- **Files**: `src/render/characters/CrowdRenderer.js`, `src/render/characters/bakeBones.js`, `src/render/materials/crowdSkinning.js` (shader chunk), and `EnemyView.js` (hand-off).
- **Accept**: wave-3 midgets beyond 15 m are drawn in ≤ 2 draw calls; render CPU drops ≥ 30%; no visible pop at hand-off (frame-matched; screenshot sequence in the PR).

### M10. Audio engine infrastructure + polish of tooling
- **Files**: `src/audio/AudioEngine.js`, `src/audio/sfx.js` (route through buses), the audio entries in the manifest, the audio path in `scripts/build-assets.mjs` (ffmpeg optional), and the debug panel volume buses.
- **Accept**: a global voice cap of 32 and per-sound `maxVoices` are enforced (Vitest with a mocked AudioContext). No audio work runs before the first gesture.

### M11. Dynamic resolution, quality auto-detect, docs
- **Files**: `src/render/core/DynamicResolution.js`, `quality.js` (auto-pick: Low if `renderer.capabilities.maxTextureSize < 8192` or the UNMASKED_RENDERER string matches a SwiftShader/llvmpipe pattern; Medium by default), `docs/ARCHITECTURE.md` (replaces the outdated PLAN.md §1 diagrams; PLAN.md stays as history), and a README update.
- **Accept**: with an artificial 8 ms GPU load (debug "stress shader" toggle), the scale settles at 0.67–0.8 and p95 stays ≤ 17 ms; it recovers to 1.0 within 6 s after removal.

Ordering rationale: M1–M4 make the work safe to measure and protect. M5 is the biggest visible uplift. M6–M7 cut bytes and hitches. M8–M9 make wave 3 hold 60 fps. M10–M11 polish.

---

## 8. Risks and what Codex must NOT do

**Do not**:
1. **Do not break the sim boundary or determinism.** Nothing in `src/sim/**` or `src/data/**` may import three, touch `window`/`document`, or call `Math.random`/`Date.now`/`performance.now`. Do not loosen the architecture test regex. Presentation randomness goes through `src/render/core/fxRandom.js`. Any sim change (debug ops, broadphase) must keep `tests/fullrun.test.js` and the determinism tests bit-identical.
2. **Do not change gun mechanics, balance or gameplay numbers** (`src/data/guns.js`, `tuning.js`, `waves.js`, `enemies.js` values; `src/sim/guns.js`, `combat.js`). Adding render-only fields to `STAGES` is allowed.
3. **Do not load all assets at boot.** Keep level-scoped loading (`levelAssets()`). Title + wave 1 stays at or under the M6 budget. No "preload everything" fallback.
4. Do not hold the game by mutating sim timers. Asset gates may only withhold `startMode` or stop advancing ticks in `Game.js`.
5. Do not add or remove lights at runtime (it recompiles every program). Toggle intensity or visibility instead, and keep `castShadow` changes to meshes.
6. Do not clone materials per enemy instance; use the variant cache.
7. Do not introduce a service worker, a sim web worker, or a monorepo/workspace in this plan.
8. Do not commit unprocessed duplicates: originals live in `assets-src/` (moved, not copied), and processed outputs in `public/assets/`.
9. Do not push to `main` directly. One branch and one PR per milestone on `crrreatorrr/sproto-shooter`, with CI green before merge. Do not force-push shared branches.
10. Do not refactor and change visuals in the same PR (M3 is visual-neutral; visual changes come in M5+ with updated goldens and screenshots in the PR).

**Risks and mitigations**:
- **three r170 → r186 upgrade**: API drift in examples (`SkeletonUtils`, postprocessing `OutputPass` color handling). Do it in isolation in M1, play-test all 4 stages, and roll back to r170 if blocked. Every later milestone works on r170 too, with `addUpdateRange` available since r159.
- **KTX2 toolchain** (`toktx` not in CI or dev machines): outputs are committed, the asset job is optional, and the webp fallback stays for one release.
- **Skinned bounds too tight**, so limbs pop at screen edges: pad 10%, sample every clip including `defeat`/`jump`, and use the debug "show bounds" toggle.
- **SwiftShader goldens flake**: freeze clock and fxRandom, wait for `ready()` + 2 rAF, `maxDiffPixelRatio 0.02`, goldens generated only on the CI image, and perf assertions on counts rather than ms.
- **LOD1 joint-order mismatch**: the pipeline asserts it; fall back to LOD0 if the check fails.
- **Post FX cost on iGPUs**: half-res bloom, AO only on High, a Low preset without MSAA, and dynamic resolution.
- **Shadow cost with 60 skinned casters**: a hard cap of K casters by distance rank plus blob shadows.
- **PMREM generation hitch on stage swap**: generate during loading or intermission inside the gate, never mid-combat.

---

### Critical Files for Implementation
- /home/user/sproto-shooter/src/render/renderer.js
- /home/user/sproto-shooter/src/render/assets.js
- /home/user/sproto-shooter/src/game/Game.js
- /home/user/sproto-shooter/src/data/stages.js
- /home/user/crrreatorrr/sproto-duel/src/render/Renderer.ts (precompile/precompileShadowDepth, composer setup), with /home/user/crrreatorrr/sproto-duel/src/fx/ParticleSystem.ts, /home/user/crrreatorrr/sproto-duel/scripts/check-assets.mjs and /home/user/crrreatorrr/sproto-duel/scripts/qa-headless.mjs as the main port sources
