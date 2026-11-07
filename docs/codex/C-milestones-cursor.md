# Sproto Shooter: Campaign Milestones for Cursor (part C)

How to build the campaign with **Cursor agents**: the milestone list, dependencies, which
milestones can run in parallel, the Definition of Done, and the exact prompts to paste.

Specs: `C-campaign-levels.md` (**C §x**), `C-level-designs.md` (**D §x / Lnn**),
`C-bosses-sproto-duel.md` (**B §x**). Cursor rules: `.cursor/rules/campaign-levels.mdc`.

---

## 0. Working with Cursor

- **One milestone = one agent = one branch = one PR.** Branch `cursor/c-<id>-<slug>` from the
  latest `main`, e.g. `cursor/c-m3-navigation`, `cursor/c-l02-grand-bazaar`. This matches the
  existing `cursor/b-m*` branches.
- **Background Agents** for engine milestones and levels (long, self-verifying). **Agent mode in
  the editor** for small fixes and playtest tuning.
- Every agent starts by reading `CODEX_PLAN.md`, the spec sections named in its milestone, and
  `.cursor/rules/campaign-levels.mdc` (auto-attached on matching files).
- **You review each PR** with its artifacts (map PNG, screenshots, perf numbers, test output),
  play it locally (`npm run dev`, `?mode=campaign&level=N&debug=1`), then merge. Merge in
  dependency order. Parallel PRs rebase on `main` before merge and re-run all checks.
- If an agent finds the spec wrong or impossible, it **stops and writes why in the PR
  description** instead of improvising architecture.

---

## 1. Order and parallel tracks

**Prerequisites (in flight):** B-M1 tooling/CI, B-M2 perf overlay, B-M3 renderer split
(branches `cursor/b-m1-tooling-ci-fc1a`, `cursor/b-m2-perf-overlay-fc1a`, `cursor/b-m3-renderer-split-fc1a`)
must be merged. B-M4 (Playwright QA harness) is strongly recommended before C-M2, because the
map/screenshot exporter builds on it.

```
            C-M0 baseline + level format
                       │
            C-M1 collision + raycasts
              ┌────────┴────────┐
   C-M2 renderer + debug   C-M3 navigation
              └────────┬────────┘
            C-M4 campaign framework
                       │
            C-M5 sections + transitions + terrain streaming
                       │
   ┌──────────────┬────┴─────────┬────────────────┬───────────────┐
 Track A        Track B        Track C          Track D         Track E
 C-M6 weapons   C-M8 enemy     C-M9a jetpack    C-M12a Duel     C-M13 polish
 C-M7 mech 1    refactor +     C-M9b air pack   boss framework  (late)
 C-M11 mech 2   ground pack    (needs C-M8)     + Sahil
                C-M10 specials                  C-M12b..e bosses (parallel)
                                                C-M12f reward spells
                       │
   Levels: C-L01 … C-L10 (parallel once their dependencies are merged; one agent per level)
                       │
            C-M14 campaign QA pass
```

**Can run at the same time** (disjoint files): Track A ∥ Track B ∥ Track D after C-M5.
C-M9a can start after C-M5; C-M9b needs C-M8. Bosses C-M12b-e run in parallel after C-M12a.
Levels run in parallel with each other (each owns only `src/data/levels/Lnn-*.js`,
`tests/levels/Lnn.test.js` and its card images).

**Fit with `CODEX_PLAN.md`'s combined order:** insert C-M0…C-M5 after master #5 (B-M4 QA
harness). A-M7 (enemy AI depth) must come **after C-M3** and use its nav. A-M11 (stage hazards)
should come **after C-M11** and reuse its hazard volumes. Plan A's decals (A-M1) must use the
surface normal from C-M1's `raycastWorld`. B-M8/B-M9 (character LOD / instanced crowds) should
land before C-M9b (bitbug flocks).

| Level | Needs merged |
|---|---|
| C-L01 Sproto Landing | C-M0-C-M7 |
| C-L02 Grand Bazaar | C-L01 deps + C-M8, C-M11, C-M12a, C-M12f (Magic Carpet) |
| C-L03 Vegetable Grove | C-M8, C-M11, C-M12c (Broccoli Head data for the preview) |
| C-L04 Blockchain Void | C-M9a, C-M9b, C-M11, C-M12b |
| C-L05 Frostspire Black Site | C-M10, C-M11, C-M12a (Drone Strike power as a hazard) |
| C-L06 Vape Cabal Skyline | C-M9a, C-M9b, C-M10, C-M11, C-M12c |
| C-L07 Hellfire Underworks | C-M10, C-M11 |
| C-L08 Government Office | C-M10, C-M11, C-M12d |
| C-L09 Moonlit Ruins | C-M10, C-M11, C-M12e (Tinubu stage-1 preview) |
| C-L10 Hellfire Caldera | everything (C-M12e for Tinubu) |

About **40 PRs** in total: 15 engine, 6 boss, 10 level, plus polish, QA and fixes.

---

## 2. Engine milestones

Each lists **Goal · Files · Tasks · Acceptance**. "Spec" points at the section to implement.

### C-M0: Baseline lock, level format, arena as a level
- **Spec:** C §2 (rules 2-4), §3.2, §3.3.
- **Files:** `src/data/levels/{kit.js,index.js,arena.js}`, `src/sim/level/runtime.js`,
  `tests/levels/baseline.test.js`, `tests/fixtures/baseline-hashes.json`.
- **Tasks:** (1) **Before any change**, add `stateHash(state)` (stable JSON of `state` minus
  `events`, FNV-1a) and record hashes after 600/3000/6000 ticks of scripted runs: Wave Mode seeds
  11/12/13 with the `fullrun` autopilot, and Sandbox with spawned enemies. (2) Add the level
  format, `kit.js` (box/ramp/cylinder/terrain stubs + validation) and the `arena` level.
  (3) Route every `ARENA_R` use through `getLevelRuntime('arena')` without changing the math.
- **Acceptance:** hashes are identical before and after; `npm test`/lint/typecheck/build green;
  no behaviour change in Wave Mode, Sandbox or Test Range.

### C-M1: World collision and raycasts
- **Spec:** C §3.4, §3.5.
- **Files:** `src/sim/level/{spatialGrid,heightfield,collide,raycast,los}.js`, edits in
  `player.js`, `enemies.js`, `world.js`, `collision.js`, `combat.js` (splash LOS);
  `src/data/levels/dev-blocks.js` (test level: walls, ramps, stairs, cylinders, terrain, thin
  walls, a 3-storey block).
- **Tasks:** `moveAndCollide` (substeps, slide, step-up, snap, slopes, ceiling); `raycastWorld`
  (DDA + primitives); hitscan stops at walls; projectiles hit walls (duck bullets reflect);
  splash LOS; `impact` carries `normal`/`material`. Arena path untouched.
- **Acceptance:** unit tests for each primitive (push-out, step-up 0.45 m, no tunnelling at 32 m/s,
  slope slide > 45°, ray vs each primitive incl. terrain); baseline hashes still identical;
  collision ≤ 0.6 ms/tick for player + 40 enemies on `dev-blocks` (perf counter).

### C-M2: Level renderer, debug tools, map export, Duel stages
- **Spec:** C §3.15, §4.3, §4.4; B §0 (assets).
- **Files:** `src/render/level/*`, `src/render/debug/LevelOverlay.js`, `scripts/level-map.mjs`,
  `src/data/stages.js` (+ `desert`, `office`, `grove`, `moonlit`), copied assets.
- **Tasks:** LevelBuilder (chunks per material), triplanar material, terrain mesh, instanced
  props, culling, shadow follow; overlay (colliders/nav/flow/triggers/spawners/route), noclip
  (`N`), `?at=` teleport; `npm run level:map`; copy Duel's `desert`/`office`/`grove` themes and
  check `moonlit`'s default textures exist (if not, document it and use tinted glacier textures
  as a temporary stand-in).
- **Acceptance:** `dev-blocks` renders correctly in all 8 stage looks; map PNG and camera
  screenshots are produced in CI; visible draw calls ≤ 150 on `dev-blocks`; arena look unchanged
  (B-M4 screenshot goldens).

### C-M3: Navigation, line of sight, tactical positions
- **Spec:** C §3.6, §3.5 (perception LOS), §3.7 (flyer avoidance).
- **Files:** `src/sim/level/nav/{navGrid,flowField,tactical}.js`, `src/sim/enemies.js` (use nav
  when the level has nav; arena path unchanged), `tests/levels/nav.test.js`.
- **Acceptance:** tests route around walls, through doors, up ramps, between 2 floors and over
  jump links; flow-field rebuild ≤ 1.5 ms for 120 × 120 m; 30 Midgets + 10 Obamas on
  `dev-blocks` chase a scripted player for 3 minutes with **zero stuck** events; Obamas only
  shoot with LOS and reposition behind cover; baseline hashes identical.

### C-M4: Campaign framework
- **Spec:** C §3.8, §3.14, §3.16, §4.2, §4.5.
- **Files:** `src/sim/campaign/*`, `src/ui/{objectives,navMarker,motionTracker,levelSelect,levelSummary,checkpointToast}.js`,
  `src/save/profile.js`, `src/sim/level/validate.js`, `tests/levels/autopilot.js`,
  `src/game/Game.js` (mode wiring, checkpoint snapshots, death → restore).
- **Tasks:** `mode=campaign`; encounters (dormant/active/cleared), spawn kinds incl. drop pods
  and the hidden-spawn fairness rule; perception (idle → combat, alert spread); all objective
  kinds; checkpoints via snapshot in the Game layer; level select, summary, between-level shop;
  profile with migrations; validator; autopilot bot (`goto`, `clear`, `take`, `interact`,
  `hold`, `wait`).
- **Acceptance:** `dev-blocks` is playable as a 3-encounter mini campaign from level select to
  summary; checkpoint restore + replay = same hash; autopilot completes `dev-blocks` on 3 seeds;
  validator catches seeded broken fixtures (unreachable objective, spawner in a wall, rack without `why`).

### C-M5: Sections, transitions, terrain streaming
- **Spec:** C §3.19.
- **Files:** `src/sim/campaign/sections.js`, `src/render/level/{TerrainTiles,TransitionPlayer}.js`,
  `src/ui/transitionCard.js`, `src/render/assets/LevelStreamer.js` (per-section lists), validator.
- **Tasks:** section chain + hub; `transitionDone` command; carry rules (rare+ guns follow);
  `sectionMemory`; placeholder cutscene cards and flights; terrain tiles with 3 LODs and a horizon
  ring; preload/evict.
- **Acceptance:** `dev-blocks` split into 3 sections (seamless elevator, cutscene card, return
  to a hub) works; memory stays at ≤ 2 sections (log asset store counts); a 1.2 km test terrain
  holds 60 fps while flying across it in noclip; determinism holds across transitions (the bot
  sends `transitionDone` immediately).

### C-M6: World weapons, ammo, power-ups, depots
- **Spec:** C §3.11, §3.9 (depot), §3.16 (interact prompt).
- **Acceptance:** racks give the exact `generateGun` common/reliable/none gun for
  `hash(level, rack)` (test); swap flow drops the old gun; ammo crates and uses; 4 power-ups
  with timers and HUD; depot opens the existing shop; validator rules 1-3 enforced.

### C-M7: Mechanisms pack 1
- **Spec:** C §3.9: doors, switches, barrels, kill volumes + void rescue, jump pads, movers/lifts
  (riders, crush), collapsing bridges.
- **Acceptance:** each mechanism has a sim test, a view and events; riders carried
  without jitter at 60 Hz; enemies use doors, lifts and jump pads via nav links; the bot uses them.

### C-M8: Enemy archetypes refactor + ground pack
- **Spec:** C §3.12. Split `enemies.js` into `src/sim/ai/*`, then add `boomMidget`, `riotMidget`,
  `hexAcolyte`, `floretSprout`, `sewerMidget`, `daycareNest`.
- **Acceptance:** **baseline hashes identical after the refactor** (commit the refactor first,
  then the new types); each new type has a behaviour test and a counterplay test (e.g. shooting
  a Riot Midget's shield does 0, its back does full); models/accessories show in a
  `?mode=sandbox` spawn menu.

### C-M9a: Jetpack + 3D flyer steering
- **Spec:** C §3.10, §3.7. Includes fuel pads and updrafts, the hover rule for spread, HUD,
  VFX/SFX hooks, and bot `jet` steps.
- **Acceptance:** tuning values from `TUNING.jetpack`; can't exceed the ceiling; fuel
  sputter; Flying Midgets follow terrain-relative altitude and avoid towers on `dev-blocks`;
  the bot flies a 3-island route.

### C-M9b: Air pack
- **Spec:** C §3.12: `bitbug` (boids, instanced), `jetObama`, `balloonMine`.
- **Acceptance:** 3 flocks of 12 + 4 Jet Obamas + 20 mines at 60 fps; flock costs ≤ 3 rays
  per flock per tick; mines chain-detonate.

### C-M10: Specials pack
- **Spec:** C §3.12: `auditSniper` (perches, laser), `miningRig` (overheat vent), `agentGoon`
  (squads, cover, flashbang via the B §2.4 `flash` logic, so this needs C-M12a's power module;
  if C-M12a isn't merged yet, implement the `flash` power here in `src/sim/duelBoss/powers.js`
  and let C-M12a extend it), `miniTinubu` (charge, wall stun), emplacement.
- **Acceptance:** behaviour + counterplay tests; the sniper laser is visible ≥ 1.2 s; flashbang
  look-away test.

### C-M11: Mechanisms pack 2 (hazards)
- **Spec:** C §3.9: hazard zones (lava, slick, slow, toxic, cold, wind, updraft, lowG, dark),
  geysers, conveyors, crushers, laser grids, ziplines, portals, gravity wells, energy bridges,
  rotators, crack tiles, rising hazard/escape timer, rail cart, blizzard visibility.
- **Acceptance:** each has a sim test + view + events + bot support where needed (zipline,
  rail, portal); enemies avoid hazards on nav (weights); A-M11 can build on this.

### C-M12a-f: Sproto Duel bosses and reward spells
- **Spec:** B (all). **a** framework + asset copy + parity fixture + Sahil; **b** Obama & Midget;
  **c** Broccoli Head; **d** Glowie; **e** Tinubu; **f** reward spells.
- **Acceptance:** B §8 (parity, power behaviour, stages, autopilot, determinism); each boss
  is playable in a `dev-blocks` boss arena (`?mode=campaign&level=dev&at=boss-<id>`) before its
  level exists.

### C-M13: Campaign polish
- Level intro cards, vistas, weather per stage, music states, Golden Bonk modifiers (D §1.4),
  difficulty select, Legendary unlock, death cam, cinematic skip.

### C-M14: Campaign QA pass
- Every row of C §1.2 measured and recorded in the PR: perf in each level's heaviest
  encounter, load times, stuck counts, autopilot on 3 seeds per level, par-time sanity
  (`DUEL_HP_K` final), the manual playtest checklist (§3.3) for all 10 levels.

---

## 3. Definition of Done and required artifacts

### 3.1 Every PR
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` green in CI.
- New behaviour has tests (sim in Vitest; flows in Playwright where they exist).
- `tests/levels/baseline.test.js` hashes unchanged (Wave Mode/Sandbox bit-identical).
- New sim events registered in `src/game/eventCoverage.js`.
- PR description: what changed, how it was verified (commands + results), perf numbers when
  relevant, known gaps.

### 3.2 Level PRs (C-L01…C-L10), additionally
- `tests/levels/Lnn.test.js`: validator green; reachability across all sections;
  **autopilot completes the level on seeds 1, 2, 3** under 4 × par sim time, ≤ 60 s wall per seed;
  zero stuck enemies; determinism (same seed → same hash after a full run).
- Artifacts attached to the PR: `artifacts/levels/Lnn-<section>-map.png` for every section,
  ≥ 1 screenshot per encounter (`cams`), placeholder cutscene cards rendered, and the
  validator report (counts, space-type coverage, intensity per encounter).
- Perf: visible draw calls, triangles and sim ms in each section's heaviest encounter
  (from the perf overlay), all within C §3.15/§3.19 budgets.
- The level matches its D section: every encounter, mechanism, weapon rack, checkpoint,
  secret and transition exists (checklist in the PR).

### 3.3 Manual playtest checklist (you, per level)
- Can I always tell where to go (lit path, nav marker)?
- Did each encounter feel different from the last (space, mix or objective)?
- Was the right basic weapon there when I needed it?
- Any death that felt unfair (no telegraph, spawn behind me, unclear hazard)?
- Any stuck enemy, falling through the floor, or visible pop-in?
- Did a section transition hitch or show an empty world?
- Boss: did I recognise the Duel boss's attacks, and could I learn each power's dodge?

---

## 4. Level milestones (C-L01…C-L10)

Each level agent owns **only**: `src/data/levels/Lnn-<slug>.js` (split into
`src/data/levels/Lnn/<section>.js` if > 400 lines), `tests/levels/Lnn.test.js`,
`public/assets/levels/Lnn/cards/*` (placeholder card images, optional) and its art wishlist
note. Engine changes go in a separate small PR first (C §2 rule 7).

Build order inside each level PR (D §3): blockout → validator → map export → encounters →
bot route → weapons/mechanisms → props/lighting → transitions/cards → screenshots → tuning.

| PR | Level | Specific acceptance (beyond §3.2) |
|---|---|---|
| C-L01 | Sproto Landing | First-time-player flow works without reading controls: each mechanic is introduced by the space (manual check); Big Obama finale |
| C-L02 | Grand Bazaar | Riot phalanx in the souk is beatable by flanking (bot route uses a side alley); Sahil fight passes B §8; Magic Carpet learned |
| C-L03 | Vegetable Grove | Hedge maze has ≥ 3 routes to the centre; Broccoli *Sprout* flees at 50% with the cutscene card |
| C-L04 | Blockchain Void | Jetpack tutorial completes for a new player in < 90 s (manual); duo fight; Midget flies in stage 3 |
| C-L05 | Frostspire Black Site | Three snowfield routes all reachable and viable (bot run per route); Drone Strike hazard during the hold |
| C-L06 | Vape Cabal Skyline | 1.2 km freeway section holds budget; Broccoli Head full fight with drifting vape clouds |
| C-L07 | Hellfire Underworks | Cart ride never desyncs (riders test); escape timer fair (bot finishes with ≥ 15 s left) |
| C-L08 | Government Office | Elevators as seamless transitions; Glowie flashbang look-away works in every arena spot |
| C-L09 | Moonlit Ruins | Outposts capturable in all 6 orders (bot runs per order); hub return to the catacombs keeps `sectionMemory`; 1.2 km terrain at 60 fps |
| C-L10 | Hellfire Caldera | Tinubu fight passes B §8; eruption escape; credits; Legendary unlocked in the profile |

---

## 5. Cursor prompts (paste into a Background Agent)

### 5.1 Engine milestone
```
You are implementing milestone <C-Mx: name> of the Sproto Shooter campaign plan.

Read first: CODEX_PLAN.md (ground rules), docs/codex/C-campaign-levels.md §0 and §<spec sections>,
docs/codex/C-milestones-cursor.md §2 "<C-Mx>" and §3, and .cursor/rules/campaign-levels.mdc.
Branch: cursor/c-<mx>-<slug> from latest main.

Implement exactly the milestone's Tasks. Don't start other milestones. Don't change gun mechanics.
Keep src/sim and src/data pure (no three/DOM/Math.random/wall clock).
Keep tests/levels/baseline.test.js hashes unchanged.

Done means: npm test, lint, typecheck and build pass; the milestone's Acceptance items are
demonstrated with tests or artifacts; new events are in eventCoverage. Open a PR with a summary,
verification commands + results, perf numbers if relevant, and known gaps.
If the spec is wrong or blocks you, stop and explain in the PR instead of inventing architecture.
```

### 5.2 Level milestone
```
You are building level <Lnn: name> (milestone C-Lnn) of the Sproto Shooter campaign.

Read first: docs/codex/C-level-designs.md §0, §0.1, §1, §3 and the "<Lnn>" section;
docs/codex/C-campaign-levels.md §3.2 (format), §3.8-3.12, §3.19 (sections), §4;
docs/codex/C-milestones-cursor.md §3.2 and §4; .cursor/rules/campaign-levels.mdc.
For a boss level also read docs/codex/C-bosses-sproto-duel.md §3.<n> and §4.
Branch: cursor/c-lnn-<slug> from latest main.

You own only src/data/levels/Lnn-*.js (or src/data/levels/Lnn/*), tests/levels/Lnn.test.js and
public/assets/levels/Lnn/cards/*. Don't change engine code; if you need an engine change, stop
and describe it in the PR.

Follow the build order: blockout → validator → map export → encounters → bot route → weapons and
mechanisms → props and lighting → transitions and placeholder cards → screenshots → tuning.
Done means everything in C-milestones §3.1 and §3.2, with the map PNGs, encounter screenshots and
validator report attached to the PR, plus a checklist proving every element of the level's design
section exists.
```

### 5.3 Boss port
```
You are porting Sproto Duel boss <name> (milestone C-M12<x>) into Sproto Shooter.

Read docs/codex/C-bosses-sproto-duel.md fully. The local Sproto Duel clone is at ~/games/sproto-duel
(or clone crrreatorrr/sproto-duel). Copy data from Duel's src/campaign/levels.ts and src/config.ts,
not from the plan document. If they differ, Duel wins; note the difference in the PR.
Same attacks: copy kinds, counts, radii, timings, cooldowns, skins and stage unlocks exactly. Only
DUEL_DMG_K and DUEL_HP_K convert. Update tests/fixtures/duel-bosses.json if needed and keep
the parity test green. Make the fight playable at ?mode=campaign&level=dev&at=boss-<id>.
```

### 5.4 Review (fresh agent, no code changes)
```
Review PR <#> against its milestone in docs/codex/C-milestones-cursor.md and the spec sections it
cites. Run every check. List: failing checks with output; spec items missing or different;
violations of ground rules (gun mechanics, sim purity, baseline hashes, file ownership); perf
budget misses; risky code. Write the review as a PR comment. Don't push changes.
```

### 5.5 Playtest tuning
```
Here is my playtest feedback for <Lnn>: <bullets>. Fix it by changing level data
(src/data/levels/Lnn*) or enemy/boss data only, not engine code. For each change, say what you
changed and why, re-run the level tests, and attach new screenshots of the changed encounters.
```

---

## 6. Risks and things agents must NOT do

| Risk | Mitigation |
|---|---|
| Collision/nav rewrite breaks Wave Mode | Baseline hashes (C-M0) on every PR; the arena path stays separate |
| Nav grids too slow for vast levels | Nav only per encounter zone; bake script if build > 120 ms; flow-field rebuild throttles |
| Too many draw calls in vast sections | Chunk merging per material, terrain tiles + LODs, instanced props, budgets asserted in level tests |
| Load-timing nondeterminism | `transitionDone` is a command; the sim never reads load state |
| Agents improvising architecture | Rules file + "stop and explain in the PR" instruction |
| Parallel PRs colliding | Strict file ownership per milestone/level; contracts (types, schemas, event names) change only in engine PRs |
| Duel bosses drifting from Duel | Parity fixture test; prompts say Duel wins |
| Boss fights too long/short in FPS | One `DUEL_HP_K` constant tuned via TTK; fight lengths logged in CI |
| Unfair FPS deaths (stun, flash) | Duel's telegraph times kept; HUD warnings; playtest checklist |

**Never:** change gun stats/generator/damage pipeline numbers; import three or touch the DOM in
`src/sim`/`src/data`; use `Math.random`/`Date.now`; load all levels or sections at boot; author
engine code in a level PR; skip the autopilot because "it's hard to route" (add `botRoute` steps instead);
copy assets from anywhere except Sproto Duel or the project's own art pipeline.
