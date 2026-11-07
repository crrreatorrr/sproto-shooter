# Sproto Shooter: Codex Master Plan

Goal: turn Sproto Shooter into an ultra-high-quality, wacky first-person 3D looter-shooter with clean architecture and efficient asset use.

This file is the entry point. The detail lives in two companion plans:

- **A: gameplay, game feel, VFX, audio:** [`docs/codex/A-gameplay-feel-vfx-audio.md`](docs/codex/A-gameplay-feel-vfx-audio.md)
- **B: rendering, architecture, assets, performance, QA:** [`docs/codex/B-rendering-architecture-assets.md`](docs/codex/B-rendering-architecture-assets.md)

Milestone IDs below refer to those files (A-M3 = plan A, milestone M3). Read both files' section 0 ("what I found") before starting.

## Ground rules (non-negotiable)

1. **Weapon mechanics stay exactly as they are.** Gun types, stats, generator draw order, damage pipeline numbers. Visuals, feel, VFX and audio of guns may change.
2. **The sim stays pure and deterministic.** `src/sim/**` and `src/data/**` never import three, touch the DOM, or use `Math.random`/`Date.now`/`performance.now`. `tests/units.test.js` (architecture + determinism) must keep passing. All presentation reacts to sim events.
3. **Level-scoped loading stays.** Never load all assets at boot. Extend `levelAssets()` (`src/data/stages.js`) and the priority queue (`src/render/assets.js`) instead.
4. **Every milestone ships on its own branch** (`codex/<milestone>-<slug>`) as a pull request to `crrreatorrr/sproto-shooter`. Each PR passes `npm test` and `npm run build`, adds tests, and includes before/after screenshots from the Playwright harness once B-M4 exists.
5. Assets come from Sproto Duel (`crrreatorrr/sproto-duel`, `public/assets/`) where possible. New art follows that repo's `docs/higgsfield-workflow-guide.md`.

## Combined milestone order

Dependencies decide the order: infrastructure first, then the post stack and VFX engine that the feel work needs, then content.

| # | Milestone | From | Why here |
|---|---|---|---|
| 1 | Baseline capture (fps, draw calls, load sizes, screenshots) | B-M0 | Every later PR is measured against it |
| 2 | Tooling, pinned versions, GitHub Actions CI | B-M1 | Gate for all PRs |
| 3 | Perf instrumentation + stats overlay | B-M2 | Needed to verify budgets |
| 4 | Renderer/module split, no visual change (merge A-M0 into it) | B-M3 + A-M0 | Both halves need the same modules; do it once |
| 5 | QA harness: Playwright smoke + screenshot goldens per stage/wave | B-M4 | Catches visual regressions from here on |
| 6 | Rendering quality pass 1: tone mapping, env map, shadows, bloom/grading post stack, viewmodel layer | B-M5 (+ A §9 needs 1, 2, 5) | The VFX and feel work depend on bloom, HDR colors and the viewmodel layer |
| 7 | VFX core (pooled GPU particles, billboards, decals, rings, lights) + stage ambient | A-M1 | Engine for all effects |
| 8 | Gun feel (viewmodel anims, recoil spring, shells, muzzle per manufacturer, tracers) | A-M2 | Biggest perceived quality gain |
| 9 | Hit feedback | A-M3 | |
| 10 | Audio engine infrastructure + event→sound mapping (real SFX, spatial, ducking) | B-M10 + A-M4 | Same engine; one PR series |
| 11 | Enemy reactions, element status visuals, wacky deaths (corpse system) | A-M5 | |
| 12 | Movement polish + screen effects | A-M6 | |
| 13 | Asset pipeline: KTX2, resized textures, hashed names, manifest, LOD1 | B-M6 | Before content adds more assets |
| 14 | Loading UX, shader warm-up (`compileAsync`), eviction, stage instancing | B-M7 | No hitches on first spawn |
| 15 | Character scale + CPU efficiency (anim LOD, culling, shared materials) | B-M8 | Needed before bigger swarms |
| 16 | Enemy AI depth (squads, flanks, flyer dives, telegraphs) | A-M7 | |
| 17 | Elite affixes | A-M8 | |
| 18 | Wave director + adaptive music | A-M9 | |
| 19 | Loot ceremony + loot cards | A-M10 | |
| 20 | Boss choreography + stage hazards | A-M11 | |
| 21 | HUD polish (boss intro cards with stage portraits) | A-M12 | |
| 22 | Instanced crowd renderer (only if #15 misses budget) | B-M9 | Conditional |
| 23 | Balance pass + TTK tooling | A-M13 | Tune enemy/boss data only |
| 24 | Dynamic resolution, quality auto-detect, docs | B-M11 | |
| 25 | Quality-bar verification against both plans' targets | A-M14 + B §1 | Done when every target in both "quality targets" sections is met |

## Definition of done for the whole plan

- 60 fps at 1080p on a mid laptop GPU in wave 3 (about 60 enemies, both bosses), measured with the stats overlay.
- Every target in plan A §1 and plan B §1 is met and recorded in the final PR.
- First load stays level-scoped; first-load size and time-to-interactive meet plan B §1.
- All tests pass, CI is green, and screenshot goldens are updated intentionally.
