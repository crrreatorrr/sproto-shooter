# Test Lab plan: Sproto Shooter

Status: this is a plan only; nothing has been built yet. It was written on 7 November 2026 from a read-only pass over `main` at `8a5676e`, which includes the new enemies, the Duck Gun, the frame-stats overlay and the hub link.
Implementer: Cursor, working on branch `cursor/test-lab`. This repo has no `AGENTS.md`. Follow `CODEX_PLAN.md` "Ground rules" (pure sim, level-scoped loading, `npm test` + `npm run build`) and `.cursor/rules/campaign-levels.mdc`.

## What the lab is for

`lab.html` is a separate page. It covers:
- Every enemy and boss, with every animation clip.
- Data hitboxes, drawn over model bounds.
- Every gun in three settings: the first-person viewmodel bench, third-person fitting on the soldier and enemy hands, and a gun-generator browser.
- Every projectile.
- Arena stages and campaign levels L01–L10.
- A live sandbox that runs the real sim.

## Owner decisions (7 November 2026, the same for every game repo)

These answers came from the owner's Q&A and apply to every game. Repo-specific sections below may add to them, but never relax them.

1. **A separate page.** The lab is its own HTML entry, `lab.html`, at the root of the built site, with its own JS bundle. The game's `index.html` must not import, link to or preload anything from the lab.
   - Measure the game's load before and after: JS bytes, request count and time to first frame. Put both sets of numbers in the PR. The game's numbers must not change.
2. **A hidden URL in production.** The lab ships in the production build at `lab.html`, relative to the game's base path.
   - Nothing in the game links to it.
   - It has `<meta name="robots" content="noindex,nofollow">`.
   - It must pass every existing production check, including banned-string scans. The repo section lists them.
3. **Desktop browser only:** keyboard and mouse. No touch layout.
4. **Automated QA.** Expose a small automation API on `window.testLab`. Never reuse an existing debug handle name. It needs at least:
   - `list()`, which returns every entity with its id, kind and animations/attacks;
   - `select(id)`;
   - `play(clipOrAttack)`;
   - `step(n)`;
   - `state()`, which returns position, velocity, state, clip, frame and HP;
   - `ready`, a promise that resolves when the current view has finished loading and drawing.

   Add a headless script (Playwright or CDP) that opens `lab.html`, visits every entity and every animation, and fails on console errors, failed requests or a blank canvas. Wire it into the repo's checks where browser checks already exist.
5. **Interaction:**
   - **Playback controls:** play, pause, step ±1 frame or tick, speed from 0.1× to 4×, scrub and loop.
   - **Live sandbox:** drive the character with the game's own controls. Show a live readout of position, velocity, facing, state, current animation and frame.
   - **Overlays:** see item 8.
   - **Spawn and fire:** spawn any enemy or boss; force any boss phase or attack; set HP; freeze AI; give any weapon, item or power-up; fire any attack on demand.
6. **Extras:**
   - **Load-time panel.** For each asset show bytes, fetch ms, decode ms and whether it came from cache; show a total per character. Load each character only when it is selected, never the whole roster up front. Use `PerformanceResourceTiming` plus timing around decode.
   - **Side-by-side compare.** Two entities, or two phases or variants of one entity, on one shared clock.
   - **Share links.** Keep all view state in the URL hash, for example `#tab=anim&id=x&clip=y&frame=12`, so a reload restores the exact view. Add a "Save PNG" button.
7. **No sim edits.** The lab is lab-only code. Do not change gameplay or sim files, or anything that changes a sim fingerprint, server bundle, replay golden or gameplay hash.
   - If the lab needs a private value, such as a collision function the game does not export, mirror it in lab code.
   - Add a unit test that fails when the mirror drifts from the source, for example by comparing outputs on sample inputs.
8. **Overlays show the game's truth plus the art's bounds.** Draw exactly what gameplay uses (hit, hurt and collision shapes; anchors; muzzle and spawn points) in one colour, and the sprite or model bounds in another, so mismatches are obvious. Also draw a grid with world coordinates.
9. **Accepted art only.** The roster lists only art the game currently uses. Pending or archived art may appear only in a tab labelled "Archive (not in game)", never in the sandbox.
10. **Isolation.** The lab never writes the player's real save, never takes tab or writer locks, never initialises the hub and never sends scores or tickets. Use an in-memory save with everything unlocked.
11. **Free-form per repo.** Fit the layout to the game. There is no shared kit across repos.
12. **Branch and PR.** Work on `cursor/test-lab`. It was created from the latest `main` with this plan committed. Commit after each phase below, and open a PR into `main` when done. Never push to `main`. Run every repo check and report any you could not run. A different agent reviews the PR.

## Facts this plan relies on

### Stack and assets
- Plain JS (ESM), `three` 0.170, Vite 5 and `lil-gui`.
- `vite.config.js` sets `base: './'`, the Nakama dev proxy (`/v2`, `/ws`) and vitest. It has no multi-page input yet.
- Assets are GLB only (meshopt, webp). The loader is `src/render/assets.js` (a NOW/LATER priority queue).
- `src/main.js` boots `connectHub()` before `new Game`. **The lab must not import `src/hub/**`.**

### Enemies (`src/data/enemies.js`)
- Base: `midget`, `flyingMidget`, `obama`, `bigObama`, `robotLaser`, `robotShooter` (new: laser gun plus a `bigLaser` special), `dummy`.
- Campaign `dress()` variants: hexAcolyte, glowieAgent, audit sniper, miningRig, bitbug, jetObama, balloonMidget, miniTinubu.
- Each enemy has hp, speed, radius, height, model, stage and `hitboxes`.

### Bosses
- `megaSproto`, `monster`, `dragon`, `sprotoBeast`, `carMonster` (new: melee plus bouncing tyres), `moleMonster` (new: drill head) and `hexAuditor`.
- Campaign Duel bosses live in `src/data/duelBosses.js`.
- Character models: `CHARACTER_MODELS` in `src/data/stages.js`. New GLBs: `car_monster`, `mole_monster`, `robot_laser`, `robot_shooter`. New projectiles: `tyre`, `drill_head`, `rubber_bullet`.

### Clips
- Humanoids have: idle, run, cast, cast_big, hit, defeat, roll, victory, jump, stun, strafe_l, strafe_r, run_back. `midget_stage3` lacks jump, the strafes and run_back.
- `instantiateCharacter`'s `CLIP` map never uses `roll` or `run_back`. Show them as "present, unused".
- `monster` has smash and walk. `sproto_monster` has kick, punch and walk. `dragon` has fireball and fly. Read the new models' clips from their GLBs; `src/render/bossClips.js` holds the boss clip timing.
- Enemy clip selection is an inline if-chain in `renderer.js` (around line 1036). Boss rigs use `humanoidRig.js`, `dragonRig.js` and `clipLayer.js`.

### Hitboxes and movement
- Data capsules and spheres with zones (body, weak, shield), plus `onlyWhen` and `orbit`.
- `worldHitboxes(e)` (`src/sim/collision.js:80`) is pure and reusable as is.
- Hitboxes do not follow the skeleton.
- Level solids have no sim collision in campaign mode.
- Player tuning lives in `src/data/tuning.js`.

### Guns
- `GUN_TYPES` (`src/data/guns.js`): mg, shotgun, sniper, bazooka, raygun (boss), bigbullets (boss) and **duckgun** (legendary, exploding rubber bullets).
- `src/data/guns.js` also defines QUALITIES, MANUFACTURERS, PARTS, ELEMENTS, WACKY and the new legendary slot.
- The generator is `src/sim/guns.js` `generateGun({seed, level, forced})`.
- `GUN_MODELS` (with `muzzleY`) and `instantiateGun` live in `assets.js`.

### First-person rig
- The soldier, `sproto_player.glb`, is a Mixamo skeleton with **no clips**. It is used only as the first-person arms (`src/render/firstPerson.js`, IK against the gun SDF from `gunCollider.js`, about 50 ms per gun).
- Gun poses are **closure-private consts** in `renderer.js`: `GUN_MODEL_LEN`, `HAND_FRAC`, `VM_POSE`, `RELOAD_ANIM` and the reload hand targets.
- `dev/fpLab.js` already has `pose(slot, hip|aim|reload, t)`, `matrix()` (counts penetrating vertices) and `side()`/`fpv()`.

### Existing debug tools
- The lil-gui panel opens with backtick or `?debug=1`. It has spawn, guns, player, world and "Show hitboxes" controls, and drives sim `debug` ops (`src/sim/actions.js`): spawnEnemy, spawnBoss, spawnGun, killAll, setTuning, setGunStat.
- `?stats=1` shows the frame-stats overlay (`src/render/debug/*`).
- `?mode=sandbox`, `window.__game`, `window.__debugCam` and `dev/model-viewer.html` (dev only).
- **Bug:** the debug panel's default `enemy: 'grunt'` (`src/game/Game.js:277`) is not an ENEMIES key.

## Owner decisions applied here

- **No sim edits; lab-only code.**
  - `renderer.js` is not a sim file, but it is a 1,300-line monolith shared with open PRs. **Do not refactor it.**
  - Mirror the gun-pose constants (`GUN_MODEL_LEN`, `HAND_FRAC`, `VM_POSE`, reload anims) and the enemy clip-selection chain into `src/lab/mirror/`.
  - Add a drift test that parses `renderer.js` with a regex or AST and fails if the values differ.
- **All four shooter options:**
  - **First-person viewmodel bench.** Each gun in the FP arms: hip, ADS and reload scrubbed over time, recoil kick, muzzle flash, hand anchors and the clipping matrix (fpLab `matrix()`).
  - **Third-person gun fitting.** Attach any gun to the soldier's hand bones and to enemy or boss hand bones (humanoid `ALIASES` from `humanoidRig.js`). Show grip, scale, muzzle point and fire direction. This is lab-only; the game is unchanged.
  - **Gun generator browser.** Roll guns by seed, level, quality, manufacturer, element, wacky and legendary. Show stat tables, compare two guns, and fire them at dummies in the sandbox.
  - **Fix the lil-gui bug.** Change the default `enemy: 'grunt'` to a valid key (`midget`) in `Game.js`. This is the only game-file edit, and it is debug-UI only. Add a test that the default is a key of `ENEMIES`.
- **Overlays.**
  - Game truth: `worldHitboxes` capsules and spheres, coloured by zone (body, weak, shield), plus `onlyWhen` states; player radius and height; projectile radii; the arena radius 45; and the muzzle origin and aim ray.
  - Art bounds: model `Box3` and skeleton.
- **Boss control.** Spawn any boss. Force each action (volley, melee, missiles, tyres, drill, breath, fireball, tail, fly or swoop, and so on), go to any phase or stage height, set HP and freeze. Use the existing sim `debug` ops, sent to the lab's own sim state, so the sim is not edited.

## Tabs

1. **Characters.** Every enemy, elite, campaign variant and boss on a turntable. Clip list with playback, a clip-coverage table, the selected-clip-per-state preview (from the mirrored chain), bones and hitboxes.
2. **Bosses.** Boss plus arena. Forced actions, phase and stage height, the clip layer, the procedural rig springs and impact-frame markers from `bossClips.js`.
3. **Guns: first person.** The viewmodel bench.
4. **Guns: third person.** Fitting on the soldier and on enemy hands.
5. **Gun generator.** Rolls, stats and compare.
6. **Projectiles.** Every projectile model and kind (bullets, missiles, tyre, drill_head, rubber_bullet with explosion, lasers, beams), fired on demand with radius overlays.
7. **Sandbox.** The real sim with `mode=sandbox` semantics on the lab's own `Game`-free loop.
   - Drive the player.
   - Spawn anything through the debug ops.
   - Pause, step one tick, time scale.
   - Live readout of pos, vel, yaw, state and current clip.
   - Third-person debug cam toggle.
8. **Stages & levels.** The arena stages, and L01–L10 geometry via `getLevelRuntime`, with a note that level solids have no sim collision.
9. **Compare** and **Loading.**

## Files

- Add:
  - `lab.html`
  - `src/lab/**`
  - `src/lab/mirror/*`
  - `tests/lab.test.js` (node): mirror drift vs `renderer.js`; every ENEMIES and BOSSES entry has a model and hitboxes; the generator rolls are deterministic per seed; hash round-trip
  - `tests/labDefaults.test.js` (the grunt fix)
  - `scripts/lab-smoke.mjs`
- Edit:
  - `vite.config.js`: add `build.rollupOptions.input = { main: 'index.html', lab: 'lab.html' }`
  - `src/game/Game.js:277`: one-word bug fix
  - `README.md`: a lab section, and correct the stale test count
- Do not touch: `src/sim/**`, `src/data/**` (the architecture test in `units.test.js` guards them), `src/render/renderer.js`, `firstPerson.js`, `src/hub/**`, `vendor/hub-sdk`.

## Phases

1. Skeleton. The lab entry, its own Three scene and loader, and before/after numbers for `index.html`. The grunt fix and its test.
2. Characters and Bosses tabs, with the mirrored clip chain and overlays.
3. Guns tabs: first person, third person and generator, with the mirrored gun poses and the drift test.
4. Projectiles and Sandbox tabs.
5. Stages, Compare, Loading, PNG export, `window.testLab`, the smoke test, docs, and the PR.

## Acceptance

- `npm test` and `npm run build` pass.
- The baseline hash fixtures are unchanged.
- Every enemy and boss plays every clip, and every gun type including duckgun works in FP, in 3P and in the sandbox.
- The lab never opens a hub or Nakama connection.
- The `index.html` bundle is unchanged, except for the one-word fix.

## Cursor prompt

The owner pastes this into Cursor:

```text
You are working in the Sproto Shooter repo (crrreatorrr/sproto-shooter). Check out the existing branch `cursor/test-lab`. It was created from the latest `main` and already contains `docs/test-lab-plan.md`.

1. Read `README.md`, `CODEX_PLAN.md` (ground rules) and `.cursor/rules/campaign-levels.mdc` (this repo has no `AGENTS.md`), then read `docs/test-lab-plan.md` in full. That plan is the spec. It records the owner's answers, so follow it exactly and don't re-ask anything it already settles.
2. Build the Test Lab phase by phase as the plan lays out, and commit after each phase. The lab is a separate, unlinked `lab.html` page with `noindex` and its own bundle. It loads each character only when that character is selected. It ships hidden in the production build.
3. Repo-specific hard rules:
   - Don't edit `src/sim/**`, `src/data/**`, `src/render/renderer.js`, `firstPerson.js` or `src/hub/**`. Mirror the private gun-pose constants (`GUN_MODEL_LEN`, `HAND_FRAC`, `VM_POSE`, reload anims) and the enemy clip-selection chain in `src/lab/mirror/`, with a drift test that parses `renderer.js`.
   - Build all three gun views: the first-person bench (hip, ADS, reload, recoil, clipping matrix), third-person fitting on soldier and enemy hand bones, and the gun-generator browser. Include the duckgun and the new robotLaser, robotShooter, carMonster and moleMonster.
   - The only game-file edit allowed: fix the debug-panel default `enemy: 'grunt'` in `src/game/Game.js` to a real `ENEMIES` key, and add a test for it.
   - Never import `src/hub/**`; the lab makes no hub or Nakama calls. Spawn and force boss actions through the existing sim `debug` ops on the lab's own state.
4. Never write the real save, never take tab or writer locks, and never initialise the hub. Use `window.testLab` as the automation handle.
5. When done, run: `npm test`, `npm run build`, and the new `scripts/lab-smoke.mjs`. Then open a PR from `cursor/test-lab` into `main` titled "Add Test Lab (lab.html)". In the PR, report:
   - the game page's load numbers (JS bytes, request count, time to first frame) before and after;
   - the result of every check, and any check you could not run, with the reason;
   - every place you mirrored private code, and the drift test that guards it.
6. If part of the plan can only be done by breaking one of these rules, stop and ask me rather than editing a protected file.
```
