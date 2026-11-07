# Sproto Shooter: Campaign Levels Plan (part C): engine and systems

Goal: add a **10-level, Halo-style campaign** to Sproto Shooter. Levels are big and varied:
open battlefields, narrow pathways, fortresses, interiors, sky islands and an on-rails ride.
Each level has its own mechanisms and monster mixes. There's a **jetpack** for air combat
against flying enemies, and **basic weapons lying around the world**, Halo style.

This plan is written for **Cursor agents**. It has three files:

| File | What's in it |
|---|---|
| `docs/codex/C-campaign-levels.md` (this file) | What exists, ground rules, and the full engine/system spec: level format, collision, navigation, campaign director, mechanisms, jetpack, world weapons, new enemies, bosses, rendering, HUD |
| `docs/codex/C-level-designs.md` | The 10 levels: variety matrix, enemy introduction schedule, and per-level encounter-by-encounter designs with ASCII maps |
| `docs/codex/C-bosses-sproto-duel.md` | The 5 Sproto Duel boss fights ported to first person with the same attacks: stages, spells, volleys, powers, arena shifts, arenas, cinematics, reward spells |
| `docs/codex/C-milestones-cursor.md` | Milestones C-M0…C-M14 and C-L01…C-L10, dependencies, parallel tracks, Definition of Done, Cursor prompts, risks |

Read §0 of this file before starting any milestone.

---

## 0. What I verified in the code (read first)

Verified against `main` @ `f952c6a` and the in-flight Cursor branches `cursor/b-m1-tooling-ci-fc1a`,
`cursor/b-m2-perf-overlay-fc1a` and `cursor/b-m3-renderer-split-fc1a` (not merged when this was written).

**The world today is a flat 90 m circle.** Everything assumes it:

| Assumption | Where |
|---|---|
| Arena radius `ARENA_R = 45` | `src/data/tuning.js:39` (`TUNING.arenaRadius`) |
| Player/enemy clamp to the circle | `src/sim/collision.js:5` `clampToArena`; called from `src/sim/player.js:112`, `src/sim/enemies.js:271,285` |
| Ground is always `y = 0` | `src/sim/player.js:107`, `src/sim/world.js:59` (projectiles), `world.js:146,162` (pickups), `src/sim/bosses.js:84,160` |
| Enemies steer away from the circle edge | `src/sim/enemies.js:38` (`steer` wall term), `enemies.js:167` (flyers) |
| Boss charge stops at the circle wall | `src/sim/bosses.js:85,220` |
| Projectiles die or bounce at the circle edge | `src/sim/world.js` `projectiles()` (`r > ARENA_R`) |
| Hitscan only hits enemies or the ground plane | `src/sim/collision.js` `rayWorld()` (ground only) |
| Spawn points: 16 on a ring at r = 43 | `src/sim/state.js:24-27` |
| Weapon Boxes at fixed x = ±28 | `TUNING.weaponBoxes`, `src/sim/state.js:28-30` |
| Enemy steering is "seek + separate + edge push": no pathfinding, no line of sight | `src/sim/enemies.js:22-44` |
| The renderer builds a circle floor, rim and ring wall | `src/render/renderer.js:68-82` (main); `src/render/stage/StageEnvironment.js` on the B-M3 branch |
| Stages are textures + 2 GLBs each (`pillar.glb`, `prop.glb`, ~250-300 KB per stage) | `src/data/stages.js` `stageAssets()`, `public/assets/models/stages/{city,volcano,glacier,void}` |
| Assets load per level | `levelAssets()` in `src/data/stages.js`, the queue in `src/render/assets.js`, `LevelStreamer.js` on B-M3 |
| Architecture test bans three/DOM/`Math.random`/wall clock in `src/sim` + `src/data` | `tests/units.test.js:18` |
| Full-run autopilot test (god mode + aimbot clears Wave Mode) | `tests/fullrun.test.js` |

**Characters available** (from Sproto Duel, rigged, 3 stages each, clips idle/run/cast/cast_big/hit/defeat/roll/victory/jump/stun/strafe_l/strafe_r):
- Already in the shooter (`public/assets/models/characters/`): `midget`, `obama`, `tinubu`, `sahil`.
- In Sproto Duel only (`crrreatorrr/sproto-duel` → `public/assets/models/rigged/`): `broccoli_stage1..3.glb`
  (~1.0 MB) and `agent_stage1..3.glb` (Glowie, ~0.8 MB). Copy them (C-M12).
All new enemies reuse these models plus procedural accessories (propellers, jetpacks, shields,
balloons, visors). That way the plan never blocks on new art.

**Sproto Duel is the reference for stages and bosses** (local clone: `~/games/sproto-duel`, `main` @ `126eeb2`):
- **8 stages** (`src/arena/themes.ts`, names from `src/campaign/levels.ts` `ARENA_NAMES`): `city` Los Angeles,
  `desert` The Grand Bazaar (Sunken Sands), `void` The Blockchain Void, `office` Government Office,
  `volcano` Hellfire Caldera, `glacier` Frostspire Black Site, `grove` The Vegetable Grove (Twilight Grove),
  `moonlit` Moonlit Ruins. The shooter has 4 of them. `desert`, `office` and `grove` must be copied
  (`textures/themes/<id>/{floor,sky,stone}.jpg` + `models/themes/<id>/{pillar,prop}.glb`, ~5.6 MB before
  KTX2). `moonlit` uses Duel's default arena textures; check they exist before building on them.
- **5 boss fights, 6 bosses** (`src/campaign/levels.ts` `BOSSES`): Sahil *the RugMaster*,
  Bitcoin Obama & The Midget *the Pump & Dump Duo*, Broccoli Head *the Floret Lord*, Glowie
  *Government Enforcement*, Tinubu *the Unshackled Demon*. Each has 3 stage forms, ordinary
  spells (bolt, blast, stun, ultimate, shield, roll), a signature volley, 3-4 special powers
  (`src/spells/BossPowers.ts`), arena shifts at stages 2 and 3 (`src/arena/ArenaShifts.ts`), a
  transformation cinematic (`src/campaign/BossCinematic.ts`, `transformStyles.ts`), projectile
  skins (`src/spells/ProjectileSkins.ts`, `skinLooks.ts`) and a reward spell (`src/spells/RewardSpells.ts`).
  **The campaign bosses are these bosses with the same attacks.** The full port spec is in
  `docs/codex/C-bosses-sproto-duel.md`.
- The shooter's own wave bosses (Mega Tinubu, Hex Sahil) stay in Wave Mode, unchanged.

**Enemies today:** `midget` (melee swarm), `flyingMidget` (air, orbits 3-6.5 m up), `obama`
(ranged bursts, keeps 9-20 m), `bigObama` (front shield, back battery, ground pound), `dummy`.
**Bosses:** `megaSproto` (Mega Tinubu), `hexAuditor` (Hex Sahil).
**Guns:** `mg`, `shotgun`, `sniper`, `bazooka` via `generateGun({seed, level, forced})` in `src/sim/guns.js:62`.
`forced` never changes RNG draw order, which makes it safe for world weapons.

**Dependencies on in-flight work.** B-M1 (lint/typecheck/CI), B-M2 (perf overlay,
`window.__sproto.perf`) and B-M3 (renderer split into `src/render/**` modules, `src/sim/types.js`)
must be merged before C-M0 starts. All file paths for render code below assume the B-M3 layout.
If B-M3 isn't merged yet, **stop and say so in the PR**. Don't re-split the renderer yourself.

**Conflicts with plan A that this plan resolves:**
- A §4.1 `decals.js` assumes "the arena floor is flat at y = 0". Campaign levels aren't flat.
  Decals must use the hit point and **surface normal** returned by `raycastWorld` (§3.5).
- A-M7 (enemy AI depth) must be built on the navigation layer from C-M3 (§3.6). It must not
  use the "seek + edge push" steering.
- A-M11 (stage hazards) should use the hazard-volume framework from C-M11 (§3.9).
- A-M9 (wave director + adaptive music) shares its intensity model with the campaign
  encounter director (§3.8).

---

## 1. Vision and quality bar

### 1.1 What "Halo style" means here
Halo's campaign formula, in our wacky Sproto tone:

1. **The 30-second loop in ever-changing spaces.** The core combat stays the same: shoot,
   dodge, cast, loot. The *space* changes every few minutes, and so does the mix of enemies
   and the tool you have.
2. **Encounters are designed, not spawned.** Each encounter is *a space + an enemy squad mix +
   an objective + a tool*. Squads have roles (fodder, ranged, heavy, support, sniper, air).
   Spaces have cover, elevation, flanks and sightlines.
3. **Teach → test → twist.** Every new enemy or mechanism first appears alone in a safe
   setting. Then it's combined with things you know. Then it's twisted (e.g. jump pads under
   sniper fire).
4. **Pacing curve.** Quiet → skirmish → big fight → breather (loot, depot, vista) → set piece.
   Never two max-intensity encounters back to back without a breather.
5. **World weapons as tools.** Basic guns sit on racks where the next fight needs them:
   a sniper on the overlook, a shotgun before the corridors, a bazooka before the heavy.
6. **Vistas.** Every level has a big view that sells scale: the volcano erupting, the Blockchain
   Void's giant candlestick towers, the Bazaar's sandstorm over the dunes.
7. **Fair, generous checkpoints.** Death is a short setback, never a big replay.
8. **It's still a looter-shooter.** Loot drops, skills, crafting and tickets all carry through
   the campaign. The campaign is the best place to use them.

### 1.2 Quality targets (all measurable; C-M14 checks every row)

| Area | Target |
|---|---|
| Level count | 10 levels, each 10-30 min at par for a first-time player (L1 is the short tutorial) |
| Encounters | 5-8 per level; each has a distinct space type, enemy mix or objective from its neighbours |
| Space variety | Each level uses ≥ 3 of the 9 space types in §1.3. Across the campaign, every type appears ≥ 3 times |
| Novelty | Every level introduces ≥ 1 new enemy **or** mechanism and ≥ 1 new combination (see the variety matrix in C-level-designs §1) |
| Checkpoints | ≤ 120 s of play between checkpoints; a checkpoint never triggers in combat or mid-air |
| Fairness | No spawn within 15 m of the player or in the player's view frustum (LOS test). Every lethal hazard is telegraphed ≥ 0.8 s. Snipers telegraph with a visible laser ≥ 1.2 s |
| Completability | A deterministic autopilot bot completes every level on 3 seeds (C-milestones §3) |
| Navigation | Ground enemies never get stuck for > 3 s (stuck detector in tests); reachability validator passes |
| Performance | 60 fps at 1080p on a mid laptop GPU in each level's heaviest encounter. Sim tick ≤ 4 ms with 40 active enemies. Visible draw calls ≤ 300; visible triangles ≤ 1.5 M |
| Scale | Levels feel vast: 1-3 km of travel per level, fields up to 1.2 km across, split into **sections** with seamless connectors or placeholder cutscenes between them (§3.19). The whole game, or a whole level, is never loaded at once |
| Loading | First section cold load ≤ 3 s on 50 Mbps (level data + stage + first encounter's models). Later encounters stream during play; no hitch > 50 ms when an encounter activates. Section switch ≤ 4 s, hidden behind a connector or placeholder card |
| Wave Mode | Unchanged: the same seed produces a bit-identical sim state hash before and after the campaign work (C-M0 locks this) |
| Bosses | All 5 Sproto Duel fights ported with every stage, spell, volley, power and arena shift from Duel's `levels.ts`. A parity test compares the ported data with a JSON export of Duel's `BOSSES` (C-bosses §8). Each stage lasts 90-150 s for a tier-matched player (TTK tool, A-M13) |
| Stages | All 8 Sproto Duel stages appear in the campaign |

### 1.3 Space types (the variety vocabulary)

| ID | Space type | What it tests | Example |
|---|---|---|---|
| `field` | Big open field (150-600 m) | Long sightlines, sniper duels, choosing a route, flanking | L4 snowfield, L8 expanse |
| `corridor` | Narrow pathway (2-6 m wide) | Close quarters, shotgun, swarm control, ambushes | L1 alley, L7 shafts |
| `ledge` | Ledges and bridges over a drop | Positioning, knockback danger | L3 ridge trail, L9 walkways |
| `interior` | Multi-floor interior | Verticality, lifts, room clearing | L1 mall, L4 halls |
| `arena` | Bounded combat bowl | Big set-piece fights, bosses | L3 caldera, L7 reactor ring |
| `vertical` | Towers, rooftops, ramps | Height advantage, falling | L5 rooftops, L10 tower |
| `sky` | Open air (jetpack) | 3D combat against fliers | L5 canyon, L6 islands |
| `rail` | Moving platform / on-rails | Shooting while carried | L7 mine cart, L4 sliding exchange blocks, L6 crane hooks |
| `hold` | Defend a zone or switch | Holding position under waves | L1 gate, L4 vault, L8 outposts |

---

## 2. Ground rules (in addition to CODEX_PLAN.md ground rules 1-5)

1. **Weapon mechanics stay exactly as they are.** World weapons are created with the existing
   `generateGun({ seed, level, forced: { type, quality: 'common', manufacturer: 'reliable', element: 'none' } })`.
   No new gun types and no new damage multipliers on guns. Power-ups (§3.11) affect shields,
   speed, stealth and fuel, never gun damage.
2. **Wave Mode and Sandbox stay bit-identical.** The circle arena becomes a level
   (`src/data/levels/arena.js`) that takes the exact old code path. C-M0 records a golden
   state hash and every later PR must keep it.
3. **Levels are data.** Geometry, encounters, mechanisms, weapons and bot routes live in
   `src/data/levels/*.js` as plain JS objects built with pure helper functions. No three.js,
   no GLB collision meshes. The sim collides only with data, so collision is deterministic
   and testable headless.
4. **Static level data stays outside `state`.** It's derived from data and cached per level
   id. Only dynamic level state lives in `state.level` (§3.3). This keeps checkpoint snapshots
   and determinism hashes small.
5. **Every new sim event needs presentation coverage** in `src/game/eventCoverage.js` (B-M3 /
   A-M0 test).
6. **One milestone per PR**, on branch `cursor/c-<id>-<slug>` (e.g. `cursor/c-m3-navigation`,
   `cursor/c-l04-frostbite-bastion`). Each PR passes `npm test`, `npm run lint`,
   `npm run typecheck` and `npm run build`. Each PR adds tests and includes the level
   map/screenshot artifacts described in C-milestones §3.
7. **Don't author levels in the engine milestones** (except the dev test level), and **don't
   change the engine in level milestones.** If a level needs an engine change, open a separate
   small engine PR first.

---

## 3. Architecture

### 3.1 Overview

```
src/data/levels/                pure data (allowed: plain JS, deterministic helpers)
  kit.js                        authoring helpers: box, ramp, stairs, corridor, room, tower, cover, terrain…
  index.js                      LEVELS registry + CAMPAIGN order
  arena.js                      legacy 90 m circle (Wave Mode, Sandbox, Test Range)
  dev-blocks.js                 engine test level (every primitive, mechanism and enemy)
  L01-sproto-landing.js … L10-hellfire-caldera.js

src/sim/level/                  pure sim
  runtime.js                    getLevelRuntime(id) → cached static data: colliders, spatial grid, heightfield, nav grid
  spatialGrid.js                uniform 2D hash grid (8 m cells) over static colliders
  heightfield.js                terrain sampling (height, normal) with bilinear interpolation
  collide.js                    moveAndCollide(ent, shape, dt) for capsules/spheres vs world
  raycast.js                    raycastWorld(o, d, maxT) → { t, point, normal, material, colliderId }
  los.js                        hasLOS(a, b), throttled perception queries
  nav/navGrid.js                2.5D layered nav grid built from colliders + terrain
  nav/flowField.js              BFS flow fields per active zone toward a goal
  nav/tactical.js               firing-position queries (LOS + cover + distance scoring)
src/sim/campaign/
  campaign.js                   mode=campaign entry: load level, system order hooks, win/fail
  encounters.js                 encounter state machine, squads, spawners, drop-ins, dormancy
  triggers.js                   volume triggers (enter/exit/inside-for)
  objectives.js                 reach, clearAll, destroy, hold, switches, survive, boss, escape
  checkpoints.js                snapshot/restore
  sections.js                   section chain/hub, transitions, sectionMemory (§3.19)
  perception.js                 idle/alert/combat awareness, alert propagation
src/sim/mechanisms/             doors, switches, jumpPads, movers, barrels, killVolumes, bridges,
                                hazardZones, conveyors, crushers, lasers, ziplines, portals,
                                gravity, energyBridges, emplacements
src/sim/movement/jetpack.js     jetpack movement mode
src/sim/ai/                     archetypes: melee, ranged, flyer, heavy, sniper, bomber, shieldBearer,
                                charger, support, artillery, swarmFlock, jetFlyer, floaterMine, turret, spawner, burrower
src/sim/duelBoss/               Sproto Duel boss port (C-bosses-sproto-duel): fighter, spells, volleys,
                                powers, arenaShift, fireRing, duo, flight
src/data/duelBosses.js          the 5 fights copied from Duel's levels.ts (+ conversion constants)
src/sim/rewardSpells.js         Magic Carpet, Pump It, Vape Cloud, Lock-On, Hellfire Breath (player)
src/render/level/               LevelBuilder, TerrainMesh + TerrainTiles (distance streaming), chunking, triplanar material,
                                MechanismViews, Vista, Weather, TransitionPlayer (placeholder cutscenes/flights)
src/render/debug/LevelOverlay.js colliders, nav, flow fields, triggers, spawners, bot route
src/ui/                         objectives.js, navMarker.js, motionTracker.js, jetpackHud.js,
                                levelSelect.js, levelSummary.js, checkpointToast.js, transitionCard.js
src/save/profile.js             localStorage campaign profile (outside sim; versioned + migrations)
scripts/level-map.mjs           Playwright: top-down map PNG + camera screenshots per level
tests/levels/                   per-level validate, reachability, autopilot, determinism
```

`simulate()` system order with the campaign (new systems in **bold**):

```
input → **mechanisms.pre (movers advance, doors animate)** → player (movement incl. **jetpack**, **moveAndCollide**)
→ **triggers** → **campaign director (encounters, objectives, spawns)** → **perception**
→ enemies (AI archetypes, **nav**) → bosses → combat → projectiles (**raycastWorld**) → hazards (**hazard volumes**)
→ status → pickups (**world weapons, power-ups**) → allies → **checkpoints** → cleanup
```

In Wave Mode/Sandbox (level `arena`) the bold systems are no-ops, and the old clamp/ground
code paths run unchanged (rule 2).

### 3.2 Level data format

Each level module exports one object. Lengths are in metres, angles in degrees in data
(converted at load), and `y` is up.

```js
// src/data/levels/L10-hellfire-caldera.js (excerpt)
import { box, ramp, stairs, ledgePath, cylinder, terrain, killPlane, lavaZone, ropeBridge,
         spawner, rack, ammoCrate, checkpoint, trigger, encounter, squad, S, botRoute } from './kit.js';

export default {
  id: 'L10', name: 'Hellfire Caldera', stage: 'volcano',
  tier: 10,                                  // enemy scaling + loot level (tierEnemyMult etc.)
  parTime: 30 * 60,
  lighting: { preset: 'volcano', sun: { intensity: 1.4 }, fog: { near: 40, far: 260 }, weather: 'ash' },
  bounds: { min: [-60, -40, -30], max: [340, 80, 260] },   // hard world box (outside → void rescue)
  start: { pos: [0, 12, 0], yaw: 180, loadout: 'carry' },  // 'carry' = keep guns from the previous level
  jetpack: false,                                          // true | false | 'pickup' (found in level)
  gravityMult: 1,

  geometry: [
    terrain({ id: 'caldera', origin: [120, 0, 120], size: [240, 240], cell: 2, seed: 33,
              noise: { amp: 6, freq: 0.02, octaves: 3 }, flatten: [{ center: [200, 200], r: 35, h: 0 }],
              mat: 'rock' }),
    ledgePath({ id: 'ridge', points: [[0, 12, 0], [40, 12, 10], [80, 14, 30]], width: 3, wallHeight: 8, drop: 'outer', mat: 'stone' }),
    box({ at: [55, 13, 18], size: [2, 2, 1.2], mat: 'stone', tag: 'cover' }),
    ramp({ at: [100, 6, 60], size: [6, 12, 20], yaw: 30, mat: 'stone' }),
    cylinder({ at: [200, 0, 200], r: 1.5, h: 7, mat: 'pillar', tag: 'chargeStop' }),
    // ...
  ],
  props: [ { model: 'pillar', at: [30, 12, 4], yaw: 15, scale: 1.2 }, { proc: 'rockCluster', at: [70, 13, 22], seed: 4 } ],
  volumes: [
    killPlane({ y: -20 }),                                  // void/lava fall → rescue (§3.9)
    lavaZone({ id: 'river', min: [20, -5, 40], max: [300, 1, 70], dps: 25 }),
  ],
  mechanisms: [ ropeBridge({ id: 'b2', from: [140, 8, 50], to: [140, 8, 80], width: 2.5, collapseOn: 'crossed' }) ],
  weapons: [ rack({ id: 'snp1', at: [52, 12.5, 16], gun: 'sniper', why: 'E1 snipers across chasm' }), ammoCrate({ at: [54, 12.5, 16], ammo: ['sniper', 'bullets'] }) ],
  checkpoints: [ checkpoint({ id: 'cp1', at: [90, 14, 34], when: 'E1.cleared' }) ],
  encounters: [
    encounter({
      id: 'E1', space: 'ledge', zone: { min: [0, 0, -10], max: [120, 40, 120] },
      activate: trigger({ kind: 'enter', min: [10, 0, -5], max: [20, 30, 15] }),
      squads: [
        squad({ role: 'sniper', spawn: 'perch', at: ['p1', 'p2'], units: [S('auditSniper', 2)] }),
        squad({ role: 'fodder', spawn: 'dropIn', at: ['d1'], delay: 8, units: [S('midget', 6)] }),
      ],
      objective: { kind: 'clearAll' },
      maxAlive: 14,
    }),
    // ...
  ],
  spawners: [ spawner({ id: 'p1', at: [70, 22, 90], kind: 'perch' }), spawner({ id: 'd1', at: [60, 12, 20], kind: 'dropIn' }) ],
  navLinks: [ { kind: 'jump', from: [30, 12, 4], to: [34, 10, 8] } ],
  botRoute: botRoute([ ['goto', [20, 12, 5]], ['clear', 'E1'], ['goto', [90, 14, 34]], ['take', 'snp1'] /* ... */ ]),
  cams: [ { id: 'overview', pos: [0, 40, -30], look: [120, 0, 120] }, { id: 'E1', pos: [15, 14, 0], look: [70, 18, 80] } ],
  secret: { id: 'goldenBonk', at: [44, 20, 12], modifier: 'floorIsLava' },
  music: { explore: 'volcano_explore', combat: 'volcano_combat', boss: 'boss_tinubu' },
};
```

**Collider primitives** (all produced by `kit.js`, all with `mat` and optional `tag`):

| Primitive | Shape | Notes |
|---|---|---|
| `box` | Axis-aligned or yaw-rotated box (OBB with yaw only) | The workhorse: walls, floors, cover, platforms. Minimum thickness 0.5 m (validator) |
| `ramp` | Wedge: rectangle rising along local +z | Walkable if slope ≤ 40°; sides are walls |
| `stairs` | Generates a ramp collider (smooth) + stepped visual mesh | Collide as a ramp, show steps: no step-jitter |
| `cylinder` | Vertical cylinder | Pillars, trees (pines), silos |
| `terrain` | Heightfield (grid, bilinear) | Deterministic: noise from a seeded hash (no `Math.random`), plus `flatten`, `raise`, `carve` stamps. Slopes > 45° are not walkable |
| `killPlane` / volumes | AABB volumes, not solid | Lava, kill, low-g, wind, slick, triggers |

**Composite helpers** expand into primitives: `corridor(path, width, height, {roof})`,
`room(min, max, {doors})`, `tower(at, floors, floorHeight, {stairs:'spiral'})`,
`ledgePath(points, width, {drop})`, `bridge(from, to, width, {rails})`,
`coverCluster(at, seed, {count, spread, heights})`, `car(at, yaw)`, `crateStack(at, n)`,
`trench(points, width, depth)`, `catwalk(points, width, height)`, `floatingIsland(at, r, seed)`.
These keep levels short and readable for agents. A 400-line level file can describe a 400 m level.

### 3.3 Static vs dynamic level state

- `getLevelRuntime(levelId)` (in `src/sim/level/runtime.js`) builds the static data **once**
  per level id from the data module and memoizes it in a module-level `Map`. That data is:
  the flattened collider list, AABBs, the spatial grid, heightfield arrays, the nav grid,
  trigger volumes, spawner positions, and precomputed encounter zone bounds. It's
  deterministic and never mutated. It isn't part of `state`, so snapshots and hashes skip it.
- `state.level` holds only dynamic data:
  ```js
  state.level = {
    id: 'L10',
    t: 0,                                    // level time (for movers, timers)
    encounters: { E1: { phase: 'dormant'|'active'|'cleared', spawned: 0, killed: 0, squadsDone: [] } },
    objectives: { current: 'E1', progress: 0, list: [...] },
    mech: { doors: { d1: { open: 0, target: 1 } }, switches: { s1: { progress: 0, on: false } },
            movers: { bus1: { u: 0.3, dir: 1 } }, bridges: { b2: { state: 'intact' } }, racks: { snp1: { taken: false } } },
    checkpoint: { id: 'cp1', snapshot: null }, // snapshot stored outside state (see §3.8)
    secretFound: false,
    playerLastSafe: { x, y, z },             // for void rescue
  };
  ```
- In `arena` levels, `state.level = { id: 'arena' }` and every campaign system returns early.

### 3.4 Collision

**Shapes.** Player: vertical capsule r = 0.4, height 1.8 (1.0 sliding, 0.9 downed); matches
`TUNING`. Ground enemies: capsule from their def (`radius`, `height`, scaled). Fliers: sphere.
Pickups and projectiles: sphere / swept ray.

**`moveAndCollide(ent, shape, dt)`** replaces `clampToArena` + the `y <= 0` ground checks in
campaign levels:

1. **Substeps:** `n = ceil(|v|·dt / (0.5·r))`, capped at 6. Dash (24 m/s) and jump pads
   (up to 32 m/s) can't tunnel through 0.5 m walls.
2. **Horizontal resolve** (per substep, max 3 iterations): query the spatial grid with the
   capsule's swept AABB. For each overlapping solid whose vertical extent overlaps the capsule
   (`feetY + stepHeight` to `headY`), compute the XZ closest point (box/OBB: clamp in local
   space; cylinder: radial) and push out along the minimum penetration. Remove the velocity
   component into the normal (slide along walls).
3. **Ground:** `groundY = max(support heights under the capsule footprint within [feetY − snap, feetY + stepHeight])`.
   Supports are box tops, ramp planes, heightfield and mover tops. `stepHeight = 0.45`,
   `snap = 0.3` when grounded last tick (stairs and down-ramps stick), else 0.
   If `feetY ≤ groundY`, then `feetY = groundY`, `onGround = true` and `vel.y = max(0, vel.y)`.
   Emit `land` exactly as player.js does today (same threshold −6).
4. **Slopes:** support normal y < cos(45°) → not ground. Apply a slide acceleration down the
   slope (8 m/s²) and keep `onGround = false` (no climbing walls by jumping repeatedly).
5. **Ceiling:** if the head enters a solid's underside, set `vel.y = min(0, vel.y)`.
6. **Movers:** if the support belongs to a mover, add the mover's delta this tick to the
   entity's position (riders get carried), and on leaving it add its velocity once (momentum
   carry, like jumping off a bus).
7. **Bounds and kill volumes:** outside `level.bounds` or inside a `kill` volume → void
   rescue (§3.9).

**Enemy-vs-enemy and player-vs-enemy pushes** stay as they are (`enemies.js:255-286`). Only
the `clampToArena` calls switch to `moveAndCollide` when the level isn't `arena`.

**Weapon Boxes** become level entities (`weaponBoxes` in level data or a `depot()` helper).
`pushOutOfBoxes` keeps working on `state.weaponBoxes` unchanged.

**Budget:** ≤ 0.6 ms for player + 40 enemies of collision per tick (measured with the B-M2
perf overlay counters). The spatial grid uses 8 m cells. Store colliders per cell as an
`Int32Array` of indices, with no allocations per query (scratch arrays).

### 3.5 Raycasts, line of sight and cover

**`raycastWorld(o, d, maxT)`** returns `{ t, point, normal, material, colliderId }` or `null`:
- It walks the spatial grid with 2D DDA along the ray's XZ projection and tests every
  collider in visited cells once (stamp array). Box/OBB uses the slab method in local space;
  ramp uses its plane plus bounds; cylinder is analytic. Terrain is marched in 1 m steps then
  bisected 6 times. Active solid movers and closed doors are included.
- **Player hitscan** (`player.js` firing): `worldHit = raycastWorld(eye, dir, hitscanRange)`, then
  `raycastEnemies(…, maxDist = worldHit ? worldHit.t : range)`. Today's `rayWorld()` ground-only
  logic is the arena special case. Emit `impact` with the `normal` and `material` (for decals and
  per-surface VFX in plan A §2.2).
- **Projectiles** (`world.js`): sweep `pos → end` with `raycastWorld`. On a hit, player
  projectiles detonate. Duck bullets with `bounces > 0` **reflect off the wall normal** (×0.6
  speed), which turns corridors into duck pinball. Enemy projectiles detonate (`splat`).
- **Splash LOS:** `explode()` and `enemyAoE()` only damage targets whose centre has LOS from
  the blast point (one ray each; skip the ray when the target is within 1 m). That makes
  cover real. The arena level skips this check (no colliders, so the ray is free anyway).
- **Enemy perception LOS** (`los.js`): each enemy checks LOS to the player at most every
  0.2 s, staggered by `id % 12`, and caches `e.ai.seesPlayer` / `e.ai.lastSeenPos`.
  Budget ≤ 60 world rays per tick for all perception.
- **Enemy firing:** ranged enemies only fire if `seesPlayer`. Each burst checks one ray from
  the muzzle; if a wall blocks it, they reposition (`tactical.js`) instead of shooting the wall.
- **Cover tags:** colliders tagged `cover` are preferred by the tactical query and by the
  player-facing "cover" hints in the level validator report.

### 3.6 Navigation

Ground enemies must route around walls, through doors, up ramps and between floors.

**Nav grid** (`nav/navGrid.js`, built in `getLevelRuntime`):
- 2.5D grid with 1 m cells over each encounter zone's bounds plus 10 m padding, merged into
  one level grid. Each cell stores up to **3 layers** (floor heights). They're found by
  casting down from the top of the zone and collecting walkable support surfaces separated
  by ≥ 2.2 m of headroom.
- A cell layer is walkable if the support normal is ≤ 40° from vertical and a 0.45 m-radius,
  1.3 m-high clearance test passes (midget-sized). Big units (`radius ≥ 0.8`) use an eroded
  copy (erode walkable by 1 cell).
- Neighbours (8-connected) link if `|Δh| ≤ 0.5` (step) or the move follows a ramp surface.
  Explicit `navLinks` add `jump` (Δh ≤ 3 m up, any drop down to 8 m), `drop`, `jumpPad`
  (follows the pad's arc) and `door` (blocked while closed).
- Build budget ≤ 120 ms for the largest level (L8). If it goes over, bake the grid at build
  time into `src/data/levels/baked/L08.nav.js` with a script (`npm run levels:bake`). Data
  imports are allowed in the sim. Verify with a test that baked = built.

**Flow fields** (`nav/flowField.js`):
- One flow field per active encounter toward the player's current nav cell. Rebuild when the
  player changes cell, at most every 0.25 s, with BFS (weighted: diagonal 1.4, jump links +2,
  cells next to hazards +6). Limit it to the encounter zone grid. 120 × 120 m = 14.4 k cells
  × layers; typical rebuild ≤ 1.5 ms.
- Enemies sample the flow direction at their cell and blend it with the existing steering:
  `desired = flow·w.seek + separation·w.sep + strafe·w.strafe` (keep today's weights). The
  `wall` term is replaced by the flow field and collision. On a `jump` link edge the enemy
  plays `jump` and follows a ballistic arc.
- **Stuck detector:** if an enemy moves < 0.5 m in 3 s while wanting to move, mark it stuck.
  Debug builds draw it red. Tests fail on any stuck enemy in the autopilot runs. Recovery:
  teleport to the nearest walkable cell out of the player's view (never in view).

**Tactical positions** (`nav/tactical.js`), for ranged, sniper and support archetypes:
- Every 1.5 s (staggered), sample 10 walkable cells in a ring around the enemy, using that
  archetype's preferred distance from the player (e.g. Obama 9-20 m, from `keepMin/keepMax`).
- Score each one: `+3 LOS to player`, `+2 cover (a 'cover' collider within 1.5 m on the line toward the player)`,
  `+1 elevation above player`, `−2 within 4 m of another ranged ally`, `−∞ inside a hazard`.
  Path cost is limited to 25 m.
- Move to the best cell via the flow field built toward that cell (a small local BFS, max
  30 × 30 cells).

**Encounter leashes.** Enemies belong to an encounter and never leave its zone. That's
Halo's "encounter space", and it keeps nav local and cheap. The leash is soft: enemies may
chase 10 m past the zone edge, then return.

### 3.7 Flyer steering in 3D

Fliers (`flyingMidget`, `bitbug`, `jetObama`, `balloonMine`, The Midget's flying stage) don't use nav:
- Altitude is relative to the **ground under them** (`heightfield/support` sample) and to
  the player's altitude when the player is jetpacking: `targetAlt = max(groundY + altMin, player.y + offset)`.
  This replaces today's absolute `alt` in `enemies.js:150-172`.
- Obstacle avoidance: each tick cast 3 short rays (forward, forward-left-up, forward-right-up,
  length = speed × 0.6 s, staggered so 1 ray per flyer per tick on average). If a ray hits,
  steer along the hit normal. Fliers stay inside the encounter zone AABB (soft repulsion,
  like the old edge push).
- Flocks (`bitbug`): boids (separation 1.5 m, alignment, cohesion) plus a target term.
  The flock shares one leader for avoidance rays, so 12 bitbugs cost 3 rays.

### 3.8 Campaign director

**Mode:** `startMode` action with `mode: 'campaign', level: 'L03'`; URL
`?mode=campaign&level=3&seed=…&debug=1`, plus `&at=E4` to start at an encounter or checkpoint
(debug only, for agents).

**Encounter state machine** (`encounters.js`): `dormant → active → cleared`.
- `dormant`: nothing is spawned, and the encounter's models stream in the background
  (§3.15). **Pre-placed** squads (Halo-style idle enemies: partying midgets, Obamas counting
  bitcoins) spawn when the player is within `prespawnDist` (default 70 m) or on activate.
  They stay in `idle` perception until alerted.
- `active` (on the `activate` trigger, or when a pre-placed enemy becomes alert): squads
  spawn according to `delay`, `aliveBelow` (reuse the wave group semantics from
  `src/data/waves.js`) and `maxAlive`.
- `cleared`: the objective is complete. Emit `encounterClear`, open linked doors, award
  `clearTickets`, then the next checkpoint may trigger.

**Spawn kinds** (spawner `kind` in data):
| Kind | Behaviour | Fairness rule |
|---|---|---|
| `placed` | Spawns at a position at prespawn, idle | Can be in view (they're "already there") |
| `hidden` | Spawns at the point when activated | Must be outside the player's view frustum **and** have no LOS; otherwise try the next point in the list, else delay 1 s |
| `dropIn` | Sproto Drop Pod falls from the sky (2 s red ground ring telegraph, `dropPodWarn`), lands with an AoE push (no damage), unloads up to 6 | Not within 8 m of the player |
| `door` | Enemies run out of a door/tunnel mouth | Door must be ≥ 15 m from the player |
| `perch` | Snipers/turrets placed at high points | Placed at prespawn |
| `burrow` | Ground hole; 0.6 s dust telegraph (`burrowWarn`) | Not within 4 m |
| `carrier` | Spawned out of a carrier (Daycare nests, the L6 Pump Blimp set piece) | — |

**Perception** (`perception.js`): `idle → suspicious → alert → combat`.
- Idle enemies notice the player if they have LOS within a 120° cone and 30 m (60 m for
  snipers) for 0.6 s, if they take damage, or if a gunshot happens within 25 m (40 m for
  the bazooka and sniper).
- An alert spreads to every encounter member within 20 m after 0.5 s, with an `alert` event
  (wacky "!" bubble plus a sound).
- **Stealth openings:** shots on idle enemies count as sneak hits (existing crit pipeline:
  pass `zone` as usual; just add `run.sneakKills`). Don't change damage numbers.

**Objectives** (`objectives.js`), in a list per level, shown in the HUD:
| Kind | Data | Done when |
|---|---|---|
| `reach` | volume | Player enters |
| `clearAll` | encounter id | All encounter enemies dead |
| `destroy` | target entity ids | All targets dead (generators, nests, reactors, engines) |
| `switch` | switch ids, `order?` | All switches on (hold G for `holdTime`) |
| `hold` | volume, seconds, `contested` | Player inside the zone for N s total. The timer pauses if an enemy is inside or the player leaves |
| `survive` | seconds | Timer elapses |
| `escape` | volume, seconds | Reach the volume before the timer ends; fail → restart at checkpoint |
| `boss` | boss ids | Bosses defeated |
| `capture` | list of `hold` zones, any order | All captured (L8 non-linear) |

**Checkpoints** (`checkpoints.js`):
- A checkpoint triggers when its `when` condition is true (e.g. `E2.cleared`) **and** the
  player is grounded, not in combat (no enemy in `combat` perception within 40 m for 3 s),
  and hp > 0.
- Snapshot: `structuredClone(state)` with `events` emptied, stored in the Game layer
  (`game.checkpointSnapshot`), not inside `state`. That avoids nested snapshots, and the
  sim stays pure. Restore = replace state with a clone of the snapshot, then emit
  `checkpointRestore`. The RNG state is inside `state`, so after restore the run is
  deterministic again.
- On player death in a campaign: 2.5 s death cam → restore the last checkpoint. Loot picked
  up since then is lost (Halo rules). Tickets and XP since then are lost too. That's simple
  and fair because checkpoints are frequent.
- Test: restore and replay the same command log → the same state hash.

**Win/fail:** level complete → `levelComplete` with stats (time vs par, kills, deaths,
secret found) → summary screen → level-end shop (reuse the Wave Mode shop UI) → next level.
There's no "game over": death always returns to a checkpoint. Quitting returns to level
select; the profile keeps the furthest level unlocked.

**Intensity model** (shared with A-M9): `intensity = clamp01(0.04·aliveWeighted + 0.3·recentDamageTaken + 0.2·bossActive)`.
It drives music stems and the director's pacing guard: an encounter's extra reinforcement
squads (`squad.optional: true`) only spawn if intensity < 0.7.

**Dormancy and performance:** only `active` encounters run enemy AI. Pre-placed idle
enemies run a cheap idle tick every 10 ticks (perception only). Cleared encounters despawn
their corpses after 10 s. Hard cap: 48 live enemies in the level (asserted in tests).

### 3.9 Mechanisms catalog

Each mechanism has data (in `kit.js`), sim behaviour (`src/sim/mechanisms/*`), a render view
(`src/render/level/MechanismViews.js`) and events. Dynamic state lives in `state.level.mech`.

| Mechanism | Sim behaviour | Data | Events | Introduced |
|---|---|---|---|---|
| **Door / gate** | Solid box that slides (open 0→1 over 0.8 s). Opened by encounter clear, switch, proximity or script. Blocks nav while closed | `door({id, at, size, slide:'up', opens:'E2.cleared'|'switch:s1'|'near'})` | `doorOpen`, `doorClose` | L1 |
| **Switch / terminal** | Hold G within 2 m for `holdTime` (default 1.5 s); interrupted by damage if `fragile` | `switchPanel({id, at, holdTime, fragile})` | `switchProgress`, `switchOn` | L1 |
| **Explosive barrel** | 30 hp; explodes r = 4 (damage 60 enemy / 25 player) with an element (fire/shock/goo) via the existing `explode()`. Chain reactions | `barrel({at, element})` | `barrelExplode` | L1 |
| **Kill volume + void rescue** | Falling into the void or lava sea: fade, teleport to `playerLastSafe` (updated every 0.5 s while grounded on non-hazard ground for 1 s), −25% max hp (not below 1), 1 s invuln. Enemies die (no loot) | `killPlane({y})`, `killZone({min,max})` | `voidRescue` | L2 |
| **Jump pad ("Bonk Cannon")** | Sets the velocity to a precomputed launch arc to a target point (apex `h`). Control is locked for `lockT` (0.4 s); dash cancels it. Enemies use pads via nav links | `jumpPad({id, at, to, apex})` | `jumpPad` | L2 (rug catapults), L3 (mushrooms) |
| **Mover / lift / bus** | Kinematic solid on a path (`points`, `speed`, `mode: 'loop'|'pingpong'|'oneShot'|'onTrigger'`, `pauseAt`). Carries riders (§3.4.6). Optional `crush`: 40 damage + knockback when it pins an entity against a wall | `mover({id, shape, path, speed, mode, crush})` | `moverStart`, `moverStop`, `crush` | L1 lift, L2 carpets, L6 buses |
| **Collapsing bridge** | Planks become non-solid in sequence after a trigger (0.15 s per plank, 1 s shake telegraph) | `ropeBridge({id, from, to, width, collapseOn})` | `bridgeShake`, `bridgeCollapse` | L3 |
| **Hazard zones** | Volumes: `lava` (dps 25 + burn status), `slick` (friction ×0.15, accel ×0.4), `wind` (force vector, stronger on fliers/jetpack), `updraft` (+up accel 30 when inside), `lowG` (gravityMult), `dark` (render-only fog), `cold` (shield regen ×0.5) | `hazardZone({kind, min, max, ...})` | `hazardEnter`, `hazardExit` | L2 quicksand, L3 toxic, L5 ice/cold, L4 wind/updraft, L9 low-g |
| **Geyser** | Timed: 1.2 s rumble telegraph (`hazardWarn`), then a column launches (jump-pad arc up 12 m) and damages 15 | `geyser({at, period, offset})` | `hazardWarn`, `geyser` | L2 (sand geysers), L10 |
| **Conveyor** | Floor volume that adds velocity to grounded entities and pickups | `conveyor({min, max, vel})` | — | L7 |
| **Crusher** | Mover with `crush: 999` (instant kill → checkpoint) on a 3-phase cycle; 1 s warning light | `crusher({at, size, period})` | `hazardWarn`, `crush` | L7 |
| **Laser grid** | Plane volume toggled on a timer; 30 damage + knockback on touch; 0.6 s flicker warning before on | `laserGrid({min, max, on, off, offset})` | `laserOn`, `laserOff` | L8 |
| **Zipline** | Press G near the start → ride along the segment at 16 m/s; shooting allowed; jump to drop off | `zipline({from, to})` | `zipStart`, `zipEnd` | L2 (clotheslines), L6, L8 (tubes) |
| **Teleport portal** | Paired volumes; keeps velocity relative to portal orientation; 1 s per-entity cooldown; enemies use them via nav links | `portal({id, at, yaw, pair})` | `teleport` | L9 |
| **Gravity well** | Sphere pull force on players, enemies, enemy projectiles and pickups (+5 m/s² toward the centre; player projectiles are not bent: ground rule 1); centre is a kill volume | `gravityWell({at, r, strength})` | `gravityWell` | L4 |
| **Energy bridge** | Solid only when its switch is on; toggles with a 0.5 s flicker | `energyBridge({id, from, to, width, switch})` | `bridgeOn`, `bridgeOff` | L4 |
| **Rotating platform** | Mover rotating around an axis (riders carried, yaw added to the player view) | `rotator({id, shape, axis:'y', rpm})` | — | L9 |
| **Cracking ice / falling tiles** | Tile becomes non-solid 1.0 s after first stepped on (0.5 s crack telegraph); respawns after 20 s | `crackTiles({min, max, tile})` | `tileCrack`, `tileFall` | L5, L9 |
| **Escape timer / rising lava** | Level-scripted: a `hazardZone(lava)` whose max.y rises at `speed`; HUD countdown | `risingHazard({min, max, speed, startOn})` | `escapeStart` | L7, L10 |
| **Rail ride** | `mover` with player-lock option: the player stands on the cart and can shoot/jump; leaving the cart → rescue back onto it | `railCart({path, speed, lock: 'soft'})` | `railStart`, `railEnd` | L7 |
| **Emplacement ("Captured Mining Rig")** | Interact G to mount: camera locked to a 120° arc; fires the enemy turret's gun (its own data, not a player gun) with infinite ammo and overheat; dismount with G. Not a gun: never enters inventory | `emplacement({at, yaw, arc, def:'miningRig'})` | `mount`, `dismount`, `overheat` | L5 |
| **Fuel pad** | Refills jetpack fuel at 80/s while standing | `fuelPad({at})` | `fuelPad` | L4 |
| **Supply depot** | Weapon Box + shop terminal (opens the existing shop UI mid-level) + ammo crate; safe zone (enemies won't path inside) | `depot({at, yaw})` | — | L2+ |
| **Destructible target** | Static enemy-like entity with hp and weak spots, no AI (generators, reactors, engines) | `target({id, at, def})` | `targetDestroyed` | L5 |

### 3.10 Jetpack

A movement upgrade, not a gun. It's enabled per level (`jetpack: true` or `'pickup'`, found
as a world item in L4).

| Param (in `src/data/tuning.js` → `TUNING.jetpack`) | Value |
|---|---|
| Fuel max | 100 |
| Thrust drain | 22 /s |
| Hover drain (hold thrust while descending → holds altitude) | 12 /s |
| Regen | 30 /s after 0.6 s without thrusting; ×2 when grounded |
| Up acceleration while thrusting | 34 m/s² (net +12 against gravity 22) |
| Max climb speed | 9 m/s |
| Air acceleration while jetpacking | 30 (vs `airAccel` 18) |
| Max horizontal speed in air | 11 m/s (sprint 9.5); dash still gives 24 for 0.15 s and **refunds 15 fuel** on a dash-kill (fun loop) |
| Fast descend (hold C in air) | −16 m/s² extra |
| Ceiling | `level.bounds.max.y − 2`; thrust fades over the last 6 m |
| Empty fuel | 0.5 s sputter (`fuelEmpty`), can't thrust until 20 fuel |

**Controls:** Space on the ground = jump (unchanged). Space in the air with jetpack =
**hold to thrust** (replaces the double jump in jetpack levels; the double jump stays
everywhere else). C in the air = fast descend. Aim, fire and spells all work while flying.
Movement penalty on gun spread: `guns.js:136` sets `movePenalty = 2.0` when airborne. **Keep
it**: gun mechanics stay as they are. To keep air combat fun, airborne *hovering* (vertical
speed within ±1 m/s and horizontal speed < 4 m/s) counts as grounded for that penalty only.
That's a movement-state rule in `player.js`, not a gun stat change. Document it in the PR.

**Sim:** `src/sim/movement/jetpack.js` exports `applyJetpack(state, p, cmd, dt)`, called from
`player.js` movement before integration. Player state: `p.jet = { has, fuel, thrusting, sputterT, regenT }`.
Events: `jetStart`, `jetStop`, `fuelEmpty`, `fuelPad`.
**Presentation:** viewmodel arms bob, flame particles (A-M1 VFX engine), a looping thrust
sound with pitch rising with altitude, a fuel ring around the crosshair plus a HUD bar,
and wind streaks at speed.
**Air enemies are designed around it:** jetObamas strafe at your altitude, bitbug flocks
dive, and balloon mines drift into your path. In L4, The Midget's flying stage 3 (*Short
Squeeze*) is easier to chase with the jetpack.

### 3.11 World weapons, power-ups and pickups (Halo-style finds)

**Basic weapons only.** World weapons are the four existing types at `common` quality,
`reliable` manufacturer, element `none`, at gun level = level `tier`. They come from
`generateGun` with `forced` (rule 1), using `seed = hash(levelId, rackId)` so the same rack
always gives the same gun.

| Item | Behaviour | Data |
|---|---|---|
| **Weapon rack** | Holds 1-2 guns visibly (procedural rack + the gun's existing viewmodel mesh). Take it with G (existing gun pickup flow: swap into the active slot if full, the old gun drops as a pickup). One-time per rack | `rack({id, at, gun, why})` |
| **Weapon cache** | A crate opened with G (or a switch, or "destroy the lock") containing 2-4 basic guns laid out | `cache({id, at, guns:[...], opens})` |
| **Fallen soldier** | Wacky Halo nod: a toppled cardboard Sproto standee holding a basic gun and ammo | `standee({at, gun})` |
| **Ammo crate** | Refills listed ammo types to 50% of cap per use, 3 uses, or unlimited in depots | `ammoCrate({at, ammo, uses})` |
| **Power-up: Overshield** | +100% max shield as overshield that decays 5/s after 10 s | `powerup({kind:'overshield'})` |
| **Power-up: Sproto Camo** | 12 s: enemies more than 8 m away lose track (perception treats you as invisible unless you fire; firing reveals for 1 s) | `powerup({kind:'camo'})` |
| **Power-up: Turbo** | 15 s: walk/sprint ×1.3, dash cooldown ×0.5 | `powerup({kind:'turbo'})` |
| **Power-up: Infinite Fuel** | 20 s: jetpack fuel doesn't drain (sky levels) | `powerup({kind:'fuel'})` |
| **Golden Bonk (secret)** | One per level, hidden; unlocks a campaign modifier (C-level-designs §1.4) | `secret({at, modifier})` |

**Placement rules** (the level validator enforces the first three):
1. Each encounter whose signature needs a specific tool has that tool within 40 m of its
   start: a sniper for `field`/`ledge` snipers, a shotgun for `corridor`, a bazooka for heavies, turrets and nests.
2. Every rack has a `why` string naming the encounter it serves.
3. Ammo for every placed weapon type is within 30 m of the rack.
4. Loot drops (Borderlands-style random guns from enemies, Weapon Boxes, the shop) stay on.
   World weapons are the dependable basic tools; loot is the exciting upgrade.

### 3.12 Enemies: archetypes and new monsters

**Refactor first (C-M8):** split `src/sim/enemies.js` into `src/sim/ai/<archetype>.js`
modules. Each enemy def in `src/data/enemies.js` gets `archetype: '...'` plus parameters, so
a new monster is mostly data. Existing types map to `melee` (midget), `flyer` (flyingMidget),
`ranged` (obama) and `heavy` (bigObama). **Their behaviour and numbers must not change**:
the Wave Mode golden hash proves it.

New monsters. All reuse existing models (`model` + `stage`) with procedural accessories, and
all are tier-1 stats scaled by `tierEnemyMult`.

| Type | Name | Model | Archetype | HP | Behaviour | Counterplay | Drops (extra resource) |
|---|---|---|---|---|---|---|---|
| `boomMidget` | Boom Midget | midget s1, bitcoin bomb backpack (blinking) | `bomber` | 30 | Sprints (9 m/s) at you; within 3 m arms a 0.8 s fuse (beeping, `hazardWarn` red ring r = 3.5), explodes for 28 damage. Killing it early detonates it on its friends | Shoot early, use chains, slide away | Springs |
| `riotMidget` | Riot Midget | midget s2, oversized riot-shield (procedural) | `shieldBearer` | 60 | Advances behind a front shield (shield zone like bigObama); shield bash 12 damage + knockback 6; peeks every 2-3 s | Flank, shoot its feet/head when it bashes or peeks, shock stuns the shield 2 s, explosives | Springs |
| `auditSniper` | Audit Sniper | obama s2 + visor + long bitcoin rifle | `sniper` | 60 | Spawns on `perch` points. 1.4 s visible laser telegraph (`sniperLaser`) then a 35-damage shot (shield-heavy). Relocates to another perch after 2 shots. Flinches (cancels the shot) if hit | Break LOS, counter-snipe (sniper racks placed), hit it during the laser | Goo |
| `miniTinubu` | Mini Tinubu | tinubu s1 at scale 0.7 | `charger` | 180 | Charges at 15 m/s after a 0.6 s windup (`enemyTelegraph`); 22 damage + knockback 10 (deadly near lava/ledges); stunned 1.2 s on hitting a wall, exposing a belly weak spot | Dodge sideways, make it hit pillars, punish the stun | Plating |
| `daycareNest` | Midget Daycare | procedural bouncy-castle (`target` + spawner) | `spawner` | 400 | Spawns 2 midgets every 6 s up to 8 alive; its weak core opens for 1.5 s on each spawn | Bazooka, time shots on the open core | Scrap ×5 |
| `miningRig` | Bitcoin Mining Rig | procedural turret | `turret` | 250 | Rotates 90°/s, streams bitcoins (8/s, 3 damage), overheats every 4 s for 2 s (cooling vent weak spot ×2.5 open) | Snipe the vent during overheat, flank behind | Plating |
| `hexAcolyte` | Hex Acolyte | sahil s1 at scale 0.75 | `support` | 90 | Floats 1 m up, blinks every 6 s, casts 3 slow homing orbs (8 each). Every 8 s gives allies within 12 m a 40-hp **Tax Shield** bubble (`shieldBuff`). Variant `illusionist` (L9) summons 3 decoy midgets (1 hp, pop into confetti) | Priority target; LOS-break the orbs | Mana Crystal (25%) |
| `sewerMidget` | Sewer Midget | midget s1, manhole lid hat | `burrower` | 40 | Emerges from `burrow` holes (0.6 s dust telegraph) near you, melees, re-burrows after 4 s if not engaged, reappears closer | Watch the dust, shotgun on emergence | Springs |
| `bitbug` | Bitbug | midget s1 at scale 0.45 + propeller | `swarmFlock` | 12 | Flocks of 6-12 (boids), circle then dive-bite (4 damage). Rendered **instanced** (needs B-M8/B-M9) | MG sweeps, Chain Zap, splash | Scrap |
| `jetObama` | Jet Obama | obama s2 + procedural jetpack | `jetFlyer` | 80 | Flies 4-20 m up, matches your altitude when you jetpack, strafes, 4-round bursts; back thruster weak spot ×2; on death spirals and explodes (r 3, 15) | Hit the thruster, fight at your altitude, sniper | Goo |
| `balloonMine` | Balloon Midget | midget head on a procedural balloon cluster | `floaterMine` | 10 | Drifts toward you at 3 m/s in the air; explodes within 2.5 m (r 4, 20 damage); chain-detonates others | Shoot from range, use them against jetObamas | — |
| `agentGoon` | Glowie Agent | agent s1 (Glowie's goons) at scale 0.9, sunglasses glow | `ranged` (squad) | 75 | Squads of 3-4 that keep 12-22 m, use cover (tactical query), and fire Glowie's *Burst Fire* pattern scaled down (3 rounds, 3° spread, 0.09 s apart, bullet skin, 5 damage). One per squad carries a **Flashbang** (Glowie's `flash` power at 60% radius: look away) | Look away from flashbangs, flank, explosives on clumped squads | Plating |
| `floretSprout` | Floret Sprout | broccoli s1 at scale 0.55 | `artillery` | 50 | Hides behind cover and lobs Broccoli Head's *Floret Mortar* in miniature (3 floret circles, radius 1.6, 1.0 s warn, 6 damage). On death it leaves a small *Hotbox* puff (radius 2, 3 s, 3 dps) | Keep moving, flush them out, don't fight in the puff | Goo |
| `bigObama` (existing) | — | — | `heavy` | 320 | Unchanged; campaign elites use ×2.5 HP from `ELITE` | Back battery | Plating |

**Role coverage** (Halo-style roles): fodder = midget, bitbug; rusher = boomMidget,
sewerMidget; ranged = obama, agentGoon; artillery = floretSprout; shield = riotMidget; sniper = auditSniper; heavy = bigObama,
miniTinubu; support = hexAcolyte; air = flyingMidget, jetObama, bitbug; area denial =
balloonMine, miningRig; spawner = daycareNest.

**Elites** keep today's crown + ×2.5 HP. Plan A §3.3 elite affixes (A-M8) apply to all new
types automatically, because affixes are data on top of archetypes.

### 3.13 Bosses in levels

**The campaign bosses are the Sproto Duel bosses, with the same attacks.** The full port spec
(every stage, spell, volley, power, arena shift, arena layout, cinematic and reward spell,
copied from Duel's `src/campaign/levels.ts` and `src/config.ts`) is in
**`docs/codex/C-bosses-sproto-duel.md`**. Summary:

| Level | Fight (Duel ladder order) | Duel arena → level boss arena | Powers (same as Duel) | Reward spell taught |
|---|---|---|---|---|
| L2 | **Sahil**, the RugMaster | `desert` / `bazaar` layout | Carpet Sweep, Bazaar Rain, Magic Carpet Drop; volley Rug Barrage | Magic Carpet |
| L4 | **Bitcoin Obama & The Midget**, the Pump & Dump Duo (double fight) | `void` / `exchange` layout (blocks on rails) | Obama: Green Candles, Shill Calls, Liquidation; Midget: Tantrum Stomp, To the Moon, Pig Rain (flies in stage 3) | Pump It |
| L6 | **Broccoli Head**, the Floret Lord | `city` / `streets` layout (vape clouds) | Floret Mortar, Hotbox, Big Exhale; volley Floret Spray | Vape Cloud |
| L8 | **Glowie**, Government Enforcement | `office` / `cubicles` layout | Drone Strike, Flashbang, Suppressing Fire; volleys Burst Fire, Full Auto | Lock-On |
| L10 | **Tinubu**, the Unshackled Demon | `volcano` / `caldera` layout (lava pools) | Hellfire Pillars, Infection, Inferno Rings, Meteor Rain; volleys Hellfire, Inferno | Hellfire Breath |

Odd levels end in set pieces with **previews**, Halo's recurring-villain beat. Bosses show up
early with one stage or one power, then leave: Broccoli Head's *Sprout* stage in L3, Glowie's
Drone Strike in L5, Tinubu's *Emi Lokan* stage in L9 (C-level-designs).

Boss XP tags: Sahil, Broccoli Head and the Obama duo are `magic`; Glowie and Tinubu are
`physical`. They feed the existing skills exactly as today.

The level's own geometry must work with the bosses' movement and powers. Floor telegraphs
follow the ground (`raycastWorld` down), and `needSight` uses `hasLOS`. The Midget's flying
stage uses §3.7 flight. Rings and sweeps are cleared by jumping, the same as in Duel.

### 3.14 Campaign progression

- **Tier per level:** level `n` uses `tier = n` for `tierEnemyMult`, loot level and rewards
  (functions in `src/data/waves.js`). Campaign difficulty multiplies on top via the existing
  `state.tuning.enemyHpMult/enemyDmgMult`: Easy 0.7/0.6, Normal 1/1, Heroic 1.3/1.4,
  Legendary 1.7/2.0 (unlocked after L10).
- **Carry-over:** guns (4 slots), skills/XP, resources, tickets, medkits and ammo carry from
  level to level. `start.loadout: 'carry'`. If a level is started from level select without
  a carried loadout, use a **recommended loadout** generated for that tier (deterministic seed).
- **Between levels:** summary → shop (existing UI, tier-scaled) → next level. Mid-level
  depots let you craft and shop.
- **Boss reward spells** (as in Duel, where beating a boss teaches its spell for good):
  L2 Magic Carpet, L4 Pump It, L6 Vape Cloud, L8 Lock-On, L10 Hellfire Breath (useful in
  Legendary / replays). They go in one **Boss Spell slot** (key `Y`, also mouse button 4); choose
  which one is equipped in the Stats panel (`5`). They use mana like the existing spells and add
  Magic XP. First-person rules are in C-bosses-sproto-duel §6. They follow ground rule 1: Pump It
  boosts **spell** damage only, and Lock-On homes **spells and Sproto buddies** only, never gun bullets.
- **Profile** (`src/save/profile.js`, UI layer, not sim): `{ version, unlockedLevel, best: { L01: { time, deaths } }, secrets: [...], modifiersOn: [...], carried: <loadout snapshot>, difficulty }`
  in localStorage, with versioned migrations and a test. All access is wrapped in try/catch
  (private mode).

### 3.15 Rendering big levels (`src/render/level/`)

- **LevelBuilder:** turns the collider list into meshes. Boxes, ramps and cylinders become
  merged `BufferGeometry` **per 64 m chunk per material** (`BufferGeometryUtils.mergeGeometries`).
  Each chunk gets a bounding sphere for frustum culling. Target ≤ 150 static draw calls
  visible.
- **Triplanar material:** `MeshStandardMaterial` + `onBeforeCompile` triplanar mapping
  (world-space, 1 texture repeat per 4 m). Tops use the stage `floor.jpg`, sides use
  `stone.jpg`. That means zero UV authoring and no new texture downloads. Material ids map
  to stage textures or procedural looks:
  `stone`, `floor`, `rock` (stone tinted), `metal` (procedural roughness/metalness, tinted),
  `glass` (transparent), `neon` (emissive stripes, colour per level), `lava` (emissive
  scrolling), `ice` (floor tinted + high specular), `pillar` (instanced `pillar.glb`), `wood`.
- **Terrain:** heightfield meshes streamed as 128 m tiles with distance LODs (§3.19 tool 2),
  splatting floor/stone by slope.
- **Props:** `pillar.glb`/`prop.glb` and procedural props (cars, crates, barrels, racks,
  rocks, pines, antennas) rendered as `InstancedMesh` per type per chunk.
- **Culling/LOD:** chunk frustum culling; props and characters beyond 120 m drop to LOD1 or
  impostor (B-M6/B-M8); camera far = `max(level size, 400)` with fog to hide it.
- **Shadows:** one directional shadow map (2048) following the player, 80 m frustum;
  static chunks cast, small props don't.
- **Vista:** each level declares `vista` set pieces (big low-poly silhouettes beyond the
  bounds plus sky colour). They're cheap and render-only.
- **Weather/ambient:** uses A-M1's ambient particle system: `ash`, `snow`, `rain`, `void motes`,
  `embers`, emitted around the camera only.
- **New stages from Sproto Duel:** add `desert`, `office`, `grove` and `moonlit` entries to
  `STAGES` in `src/data/stages.js`. Copy lighting, fog, hemi, sun, bounce and ambient values
  from Duel's `src/arena/themes.ts` (the existing four already follow that file). Copy the
  textures and models listed in §0. Port the theme ambient particles through A-M1
  (`sand`, `dust`, `fireflies`, `vape`, `motes`, `embers`, `snow`).
- **Streaming:** extend `levelAssets()` with `campaignLevelAssets(levelId)` → `{ stage, characters by encounter, bosses, props }`.
  `LevelStreamer` loads the stage + first two encounters' models before start, then each
  later encounter when the previous one activates. Boss models load when the boss
  encounter's zone is within 150 m. Evict the previous level's assets on level change.
- **Budgets per level** (asserted in `tests/levels` with a headless render count, plus the
  perf overlay in-game): visible draw calls ≤ 300, visible triangles ≤ 1.5 M, textures ≤ 64 MB
  GPU, level data module ≤ 60 KB gzipped.

### 3.16 HUD and UI

| Element | Spec |
|---|---|
| **Objective tracker** (top-left) | Current objective text, progress (e.g. "Generators 1/2", "Hold 0:12"), toast on update |
| **Nav marker** | Halo-style diamond over the current objective with distance; always on for 5 s after an update, then hold `J` to show |
| **Motion tracker** (bottom-left) | 25 m radius radar: enemies show as red dots only when moving or firing (Halo rule), allies yellow, objectives as a white diamond. Above/below indicators (▲/▼) for > 3 m height difference: essential for interiors and sky levels |
| **Jetpack HUD** | Fuel ring around the crosshair + bar; flashes red under 20 |
| **Checkpoint toast** | "CHECKPOINT… BONK!" 1.5 s |
| **Level intro card** | Level number, name, stage portrait art, 2.5 s |
| **Level select** | 10 cards in a row, locked/unlocked, best time, Golden Bonk found, difficulty, modifiers |
| **Level summary** | Time vs par, kills, deaths, accuracy, best hit, secret, tickets → Continue (shop) |
| **Death cam** | 2.5 s slow orbit + "You got audited" + restore |

New key bindings (add to the help screen): `J` objective marker, `G` (existing) also
interacts with switches, racks, ziplines and emplacements (pick the nearest interactable in a
30° view cone within 2.5 m; show a prompt), `N` noclip (debug only).

### 3.17 Audio hooks
- Music states per level (`explore`, `combat`, `boss`, `escape`) driven by the intensity
  model (A §5.2 stems).
- New sound events for every new sim event (coverage test).
- Positional loops: movers, conveyors, crushers, lasers, wind, lava, geysers, the Pump Blimp's engines.
- Barks: a wacky voice-line system for alerts and kills is a stretch goal (text bubbles
  until there's audio).

### 3.18 New sim events (add to coverage)

`levelStart`, `levelComplete`, `levelFail`, `encounterStart`, `encounterClear`,
`objectiveUpdate`, `checkpoint`, `checkpointRestore`, `alert`, `dropPodWarn`, `dropPodLand`,
`burrowWarn`, `sniperLaser`, `shieldBuff`, `doorOpen`, `doorClose`, `switchProgress`,
`switchOn`, `barrelExplode`, `voidRescue`, `jumpPad`, `moverStart`, `moverStop`, `crush`,
`bridgeShake`, `bridgeCollapse`, `hazardEnter`, `hazardExit`, `geyser`, `laserOn`,
`laserOff`, `zipStart`, `zipEnd`, `teleport`, `gravityWell`, `bridgeOn`, `bridgeOff`,
`tileCrack`, `tileFall`, `escapeStart`, `railStart`, `railEnd`, `mount`, `dismount`,
`overheat`, `fuelPad`, `jetStart`, `jetStop`, `fuelEmpty`, `rackTake`, `cacheOpen`,
`powerup`, `secretFound`, `targetDestroyed`, `sectionLeave`, `transitionStart`, `transitionDone`,
`sectionEnter`, plus the boss-port events in C-bosses-sproto-duel §7
(`bossStageStart`, `bossTransform`, `powerWarn`, `powerFire`, `volley`, `bossShield`, `bossReflect`,
`arenaShift`, `fireRingHurt`, `playerStunned`, `playerBlinded`, `rewardSpellLearned`, `rewardSpellCast`). Reuse `hazardWarn` and `enemyTelegraph` from plan A.

### 3.19 Vast worlds: sections, streaming and transition cutscenes

Goal: levels feel **vast**, with 1-3 km of travel per level and fields up to 1.2 km across,
without ever loading the whole game or a whole level at once. Two tools do this.

**Tool 1: sections (for different areas).** A level is a chain (or a small hub graph) of
**sections**. Each section is a self-contained play space with its own geometry, encounters,
spawners, nav grid, render chunks and asset list. Only the current section is in memory; the
next one is preloaded near the end of the current one. Between sections there is a
**transition**:

| Transition | What the player sees | Loading behaviour | Use for |
|---|---|---|---|
| `seamless` | A real but cheap connector: a corridor with an airlock, an elevator ride (10-20 s), a tunnel, a canyon pass | The next section starts streaming when the player enters the connector. The door ahead opens only when it's ready (the elevator "arrives"); the door behind closes, then the previous section unloads | Interior ↔ interior, anywhere a door makes sense |
| `cutscene` | A **placeholder cutscene** card: full-screen image (stage sky, concept art from Duel `ui/bosses/*`, or a level `cards/` image), the level/section title, 1-4 subtitle lines of story, and a loading bar. Skippable once loading is done and `minTime` (default 3 s) has passed | Unload the previous section, load the next while the card shows | Theme changes, big jumps in place (drop-pod flights, falling into the void, portals), boss arrivals |
| `flight` | A placeholder on-rails camera flight over the next section's skybox (a drop pod, a carpet ride, the Sproto drop ship) | Same as `cutscene`, with a moving camera | Arriving at a new area by air |

Placeholders are deliberately simple: **render-only data**, later replaced by real
cinematics without touching the sim:
```js
transitions: [
  { from: 'S1', to: 'S2', kind: 'cutscene', at: trigger({ kind: 'enter', min: [...], max: [...] }),
    cutscene: { id: 'L02_canyon', placeholder: { image: 'ui/bosses/sahil.png', title: 'The Canyon Rim',
                lines: ['Sahil\'s carpets ferry his guards across the canyon.', 'Ride one. Don\'t look down.'] },
                minTime: 3, music: 'sting_desert' } },
  { from: 'S2', to: 'S3', kind: 'seamless', connector: 'elevatorA' },
],
sections: [
  { id: 'S1', name: 'Souk Alleys', bounds: {...}, geometry: [...], encounters: [...], spawners: [...], weapons: [...], checkpoints: [...], botRoute: [...] },
  { id: 'S2', ... },
],
```

**Sim rules for sections (determinism is unchanged):**
- `state.level.section` holds the current section id. `getLevelRuntime(levelId, sectionId)`
  caches static data per section (C §3.3), and the previous section's cache entry is dropped.
- A transition puts the sim in `state.level.cinematic = { kind: 'transition', to }`. Nothing
  simulates; the player is safe. The sim **waits for an explicit command**
  `{ type: 'transitionDone' }`. The Game layer queues it once assets are loaded and `minTime`
  has passed. Load timing therefore never affects the sim: the command log is the only input,
  so replays and determinism hold. Headless tests and the bot send it immediately.
- On `transitionDone`: clear enemies, projectiles, hazards and pickups of the old section
  (unpicked guns at ≥ rare quality are moved to the new section's start so loot isn't lost);
  keep the player, guns, skills, run stats and tickets; place the player at the new section's
  `start`; take an automatic checkpoint (snapshots stay small: one section's dynamic state).
- **Hubs and returning** (L9): a section can be re-entered. Its small dynamic memory (cleared
  encounters, taken racks, opened doors, captured zones) is kept in
  `state.level.sectionMemory[sectionId]` and re-applied on entry. Enemies don't respawn in
  cleared encounters.
- Emit `sectionLeave`, `transitionStart`, `transitionDone`, `sectionEnter`.

**Tool 2: terrain tile streaming (for vast open fields inside one section).**
- Large `terrain` primitives (up to 1.2 × 1.2 km) are split into 128 m tiles. The **sim**
  keeps the whole heightfield in memory: it's plain data, small (1.2 km at 2 m cells is about
  1.4 MB of floats) and needed for deterministic collision anywhere. The **renderer** streams
  tiles by distance: full detail < 200 m, LOD1 (4 m) < 500 m, LOD2 (8 m) < 1 km, beyond that
  a low-poly horizon ring plus fog. Props and colliders per tile follow the same distances
  (render) or are always present (sim: colliders are cheap data).
- Nav grids exist only for encounter zones (C §3.6), so a vast field costs nothing until an
  encounter activates. Dormant encounters don't simulate (C §3.8).

**Budgets per section** (validator + perf overlay): ≤ 700 × 700 m playable (terrain sections
up to 1.2 km), ≤ 4000 colliders, ≤ 48 live enemies, incremental download ≤ 12 MB
(textures after KTX2), section switch ≤ 4 s on 50 Mbps (the placeholder card covers it), and
at most two sections in memory at once (current + preloading next).

**Asset streaming with sections:** `campaignLevelAssets(levelId)` returns per-section asset lists.
`LevelStreamer` (B-M3) loads the current section, preloads the next one when the player
reaches the section's `preloadAt` trigger (default: its last encounter activating), and
evicts sections two steps back. Each placeholder card image is tiny and preloaded with the
level.

---

## 4. Authoring kit and tooling (what makes 10 big levels possible for agents)

### 4.1 `kit.js`
Pure functions returning plain objects (see §3.2). Every helper validates its arguments and
throws with a clear message (`box(): size.y must be ≥ 0.5`). Helpers produce stable ids
(`${parentId}.${n}`), so validator errors point at the data.

### 4.2 Level validator (`src/sim/level/validate.js`, run in tests and `?debug=1`)
Fails the build if:
- a collider is thinner than 0.5 m, or outside `bounds`;
- a spawner isn't on a walkable nav cell (except `perch`, `dropIn` and air spawners, which are checked for clearance);
- **reachability:** start → every objective → level end isn't connected on the nav grid
  (walk + jump/jumpPad/door/portal links; plus `jet` links in jetpack levels: any two
  walkable cells within 25 m horizontally and ≤ 18 m up count as connected for jetpack-capable players);
- a rack is missing `why`, or a rack's ammo isn't within 30 m;
- a checkpoint is inside a hazard or has no ground under it;
- `maxAlive` > 30 ground + 20 air per encounter, or > 48 live enemies in the whole level;
- an encounter's `hidden` spawners are all visible from its activate trigger (none can ever be used);
- nothing in a `corridor` encounter is narrower than 2.0 m (except at doors);
- the budgets in §3.15 are exceeded (collider count ≤ 4000 per level).
It prints a report (counts, sizes, encounter list, space-type coverage).

### 4.3 Debug tools (`?mode=campaign&level=N&debug=1`)
- **Level overlay** (`` ` `` panel → Level): collider wireframes coloured by material,
  nav grid (walkable layers), the live flow field (arrows), trigger/hazard volumes,
  spawners by kind, bot route, encounter zones, cover tags.
- **Noclip** (`N`): free-fly camera; the sim pauses unless toggled.
- **Teleport:** `&at=E4` or the panel list (encounters, checkpoints).
- **Encounter controls:** activate, clear, kill all, toggle perception.
- **Perf:** B-M2 overlay plus per-system ms (collision, nav, perception, AI).

### 4.4 Map and screenshot export (`npm run level:map -- L03`)
A Playwright script loads `?mode=campaign&level=3&shot=1` and writes:
- `artifacts/levels/L03-map.png`: an orthographic top-down render with the overlay
  (encounters, weapons, checkpoints, bot route, height shading);
- `artifacts/levels/L03-<camId>.png` for each `cams` entry.
Every level PR attaches these. They're the main way you (and reviewers) check a level's
layout without playing it.

### 4.5 Autopilot bot (`tests/levels/autopilot.js`)
Extends the `tests/fullrun.test.js` approach:
- It follows `botRoute` steps: `goto` (path on the nav grid; in jetpack levels, `jet` links
  are flown with a simple thrust controller), `clear` (aimbot nearest enemy with LOS),
  `take`, `interact` (hold G), `hold`, `ride`, `wait`, `jet` (fly to a point).
- God mode and infinite ammo are on. It runs headless with no render.
- It asserts: the level completes; time < 4 × par (sim time); no stuck enemies; no void
  rescues except listed ones; each encounter was activated and cleared in order; ≤ 60 s wall time per seed.

---

## 5. What this plan deliberately leaves out
- **Vehicles** (Warthog-style). The jetpack and rail cart cover traversal variety. Add later as their own plan.
- **Co-op.** The sim is multi-player-ready (`state.players`), but no netcode is planned.
- **Grenades and melee.** Spells (Goo Bolt, Chain Zap, Meteor Bonk) fill the grenade role.
  A melee "Bonk" could come later as plan A material.
- **New gun types** or changes to gun stats (ground rule 1).
- **New character models.** Every character comes from Sproto Duel (including Broccoli Head
  and Glowie, copied in C-M12). Accessories are procedural. Optional art wishlists per level
  (C-level-designs) can feed the Higgsfield/Grok workflow later, but they never block a level.
