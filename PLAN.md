# SPROTO SHOOTER: Implementation Plan (PLAN.md)

> This is the single source of truth for implementation. Build milestone by milestone, in order. Each milestone ends with `npm test` passing, `npm run build` succeeding, no console errors, and its manual playtest checklist done.
> I checked the repo: `/home/user` is empty. The machine has Node 22.x and npm 10.x, which is enough.

---

## 0. Decisions and Key Bindings (resolved)

### 0.1 Language
**Plain modern JavaScript (ES modules)** with **JSDoc typedefs** in `src/sim/types.js`. Add `// @ts-check` to the sim and data files so VS Code catches type errors, with no TypeScript build step.
- Why: it iterates fastest, data files stay plain JS objects, and Vite/Vitest need no TS config. The JSDoc typedefs give most of the safety where it matters (schemas).

### 0.2 Dependencies
- `three` (latest r17x) and `lil-gui` (latest 0.19/0.20).
- Dev: `vite` (latest 6.x) and `vitest` (latest 2.x/3.x).
- Nothing else. No physics engine, no UI framework.

### 0.3 Final key bindings (all data-driven in `src/data/keybindings.js`)

| Action | Primary | Secondary | Notes |
|---|---|---|---|
| Move | W A S D | Arrow keys | |
| Look | Mouse | — | Pointer Lock |
| Fire | LMB | — | Every gun fires while held, at its fireRate |
| Zoom / ADS | RMB (hold) | — | Sniper gets a scope overlay; other guns get a mild FOV zoom |
| Sprint | Left Shift (hold) | — | |
| Jump / Double jump | Space | — | |
| **Slide** | **C** | Left Ctrl | **Ctrl+W closes the browser tab and the page cannot block it.** The default is C, Ctrl is a secondary binding, and the controls screen warns about it. |
| **Dash** | **Left Alt** | V | `preventDefault` on Alt keydown/keyup stops the Firefox menu bar. V is a fallback for Alt-hostile OS setups. |
| Reload | R | — | |
| Gun slots | 1 2 3 4 | Mouse wheel cycles | |
| Spell: Goo Bolt (Magic Lv1) | Q | — | |
| Spell: Chain Zap (Magic Lv3) | Y | — | Was E. Since the 2026-11 Sproto keyboard convention E is Interact in every Sproto game. |
| Spell: Sproto Swarm (Magic Lv6) | Z | — | Dedicated key, no slot cycling |
| Spell: Mana Shield (Magic Lv8) | X | — | Toggle |
| Ultimate: Meteor Bonk (Magic Lv10) | T | — | Needs full mana (F is the aim toggle) |
| **Interact** (Weapon Box, pick up a gun) | **E** | G | E matches the hub and the other Sproto games |
| Use Medkit | H | — | |
| Skills / Stats screen | Tab (**hold**) | — | Overlay only. Pointer lock is kept and the game is not paused. |
| Shop (intermission only) | B | — | Releases pointer lock |
| Skip intermission | Enter | "Ready!" button in the shop | |
| Debug panel | ` (Backquote) | — | Releases pointer lock |
| Pause | Esc | — | The browser drops pointer lock on Esc, and we show the pause overlay |
| Menus | Arrows, W / S | A / D across a row | Enter or Space confirms, Esc goes back |

Controller bindings and aim assist: README.md (Controls) and `src/input/padConfig.js`.

---

## 1. Architecture Overview

### 1.1 Module diagram

```
                ┌─────────────────────────── main.js / game/Game.js ───────────────────────────┐
                │  owns: GameState, Loop, InputManager, Renderer, Audio, UI, EventBus          │
                └──────────────────────────────────────────────────────────────────────────────┘
   DOM events                     fixed 60Hz                         per RAF frame
 ┌──────────────┐   Command   ┌────────────────────┐  state (read-only) ┌──────────────────────┐
 │ input/       │ ──────────▶ │ sim/simulate.js    │ ─────────────────▶ │ render/ (Three.js)   │
 │ keyboardMouse│  per tick   │  systems/*         │                    │  interpolates prev→  │
 │ commandBuild │             │  collision/*       │                    │  curr with alpha     │
 └──────▲───────┘             │  guns/*  ai/*      │                    └──────────────────────┘
        │ UI actions          │  uses data/* only  │  state.events[]    ┌──────────────────────┐
 ┌──────┴───────┐  (queued)   │  NO three/DOM/     │ ─────────────────▶ │ core/eventBus.js     │
 │ ui/ (DOM)    │ ◀────────── │  Math.random/Date  │   drained after    │  → audio/  render/vfx│
 │ hud, menus,  │  reads state└────────────────────┘   every tick       │  → ui/ (banners, nums)│
 │ debugPanel   │                                                       │  → render/feel (hitstop│
 └──────────────┘                                                       │     shake)           │
                                                                        └──────────────────────┘
          data/*  (guns, enemies, bosses, waves, recipes, skills, perks, spells, shop, tiers, tuning)
                    imported by sim (rules) and by ui (labels, icons, colours)
```

### 1.2 Hard boundaries
1. **`src/sim/**` and `src/data/**`** must never import `three`, touch `window`/`document`, or call `Math.random`, `Date.now` or `performance.now`. `tests/architecture.test.js` enforces this by scanning the source text.
2. **The sim is the only writer of GameState.** The renderer, audio and UI only read it. The UI changes things only by queuing **actions** (`input.queueAction({...})`). Actions ride inside the next tick's Command.
3. **Gameplay events** (`state.events`) are written by sim systems during a tick.
   - Sim-side consumers, mainly progression/XP, read the current tick's events **inside** `simulate`. This keeps XP deterministic and authoritative.
   - After the tick, `Game` drains `state.events` into the `EventBus` for presentation: audio, VFX, damage numbers, banners, hitstop and shake.
4. **Presentation randomness** (SFX pitch jitter, confetti velocity) may use `Math.random`. The sim uses only `state.rng`.
5. **Hitstop is client-side.** The loop holds back the sim accumulator for N ms, so the sim never knows. It is disabled in a future multiplayer build.
6. Entities are **plain JSON-serializable objects with numeric ids**: no classes, Maps or Sets in state. Use objects keyed by id (`{[id]: true}`) instead of Sets.

### 1.3 Fixed-timestep loop (`src/core/loop.js`)

```js
const DT = 1 / 60;                 // sim tick
const MAX_FRAME = 0.25;            // clamp after tab switches
const MAX_TICKS_PER_FRAME = 5;     // spiral-of-death guard
let acc = 0, last = performance.now(), hitstopMs = 0;

function frame(now) {
  let ft = Math.min((now - last) / 1000, MAX_FRAME); last = now;
  if (hitstopMs > 0) { hitstopMs -= ft * 1000; ft = 0; }        // freeze sim, keep rendering
  if (!game.paused) acc += ft * game.debugTimeScale;
  let n = 0;
  while (acc >= DT && n < MAX_TICKS_PER_FRAME) {
    const cmd = input.buildCommand(state.tick);                  // consumes edge latches once
    simulate(state, { [state.localPlayerId]: cmd }, DT);
    bus.emitAll(state.events);                                   // presentation listeners
    acc -= DT; n++;
  }
  if (n === MAX_TICKS_PER_FRAME) acc = 0;
  const alpha = acc / DT;
  renderer.render(state, alpha, input.liveLook());               // camera uses live yaw/pitch
  ui.update(state);                                              // dirty-checked DOM writes
  requestAnimationFrame(frame);
}
export function requestHitstop(ms) { hitstopMs = Math.max(hitstopMs, Math.min(ms, 200)); }
```

- **Look responsiveness:** the mouse delta updates `input.yaw/pitch` straight away. The camera renders the live values plus the sim's `player.recoil` offset. Each tick's Command carries a yaw/pitch snapshot, and the sim aims with it.
- **Edge latches:** `pressed` flags (jump, dash, reload, interact, spells, slot keys) are set on keydown and cleared only by `buildCommand`. They are never lost when a frame has 0 ticks, and never doubled when a frame has 2 ticks: only the first tick gets them.

### 1.4 Data flow per frame
1. DOM events go into InputManager (held keys, latches, mouse delta, queued UI actions).
2. For each due tick, `buildCommand` produces a Command, `simulate` mutates the state and fills `state.events`, and `bus.emitAll(events)` runs.
3. EventBus listeners run: `audio/sfx.js` plays sounds; `render/vfx/*` spawns muzzle flash, confetti and tracers; `ui/damageNumbers.js` and `ui/hitmarker.js` react; `render/feel.js` calls `requestHitstop` and adds shake trauma; `ui/banner.js` shows level-ups.
4. `renderer.render(state, alpha)` syncs entity views by id, lerps `prevPos→pos`, updates the camera and draws.
5. `ui.update(state)` refreshes the HUD from state, changing the DOM only when values differ.

### 1.5 Sim system order (`src/sim/simulate.js`)

```js
export function simulate(state, commands, dt) {
  state.events.length = 0;
  state.tick++; state.time += dt;
  snapshotPrev(state);              // copy pos→prevPos for every entity
  applyActions(state, commands);    // craft, buy, sell, pickupGun, debug ops, skip intermission
  playerInput(state, commands, dt); // look, buttons → player intent
  playerMovement(state, dt);
  playerCombat(state, dt);          // fire, reload, swap, recoil
  spells(state, dt);
  allies(state, dt);                // mini friendly Sprotos
  waveDirector(state, dt);          // M8; no-op in sandbox
  enemyAI(state, dt);               // regular enemies
  bosses(state, dt);                // boss phase machines
  hazards(state, dt);               // shockwaves, meteor markers, auras, spawn portals
  projectiles(state, dt);
  statusEffects(state, dt);         // burn DoT, goo slow, timers
  playerVitals(state, dt);          // shield regen, mana regen, downed timer, invuln
  pickups(state, dt);
  crafting(state, dt);              // craft timers at weapon boxes
  progression(state);               // consumes this tick's events → XP, level ups, perks
  cleanup(state);                   // swap-remove dead entities
}
```

---

## 2. Directory / File Tree

```
/home/user/sproto-shooter/
├── index.html                      # canvas container + HUD/menu DOM skeleton, loads src/main.js
├── package.json                    # scripts: dev, build, preview, test, test:watch, ttk
├── vite.config.js                  # Vite config + Vitest block (environment: 'node')
├── README.md                       # how to run, controls, URL params, debug panel
├── scripts/
│   └── ttk.js                      # (M9) node script printing time-to-kill tables from pure modules
├── src/
│   ├── main.js                     # boot: parse URL params (?seed,&mode,&tier,&debug), new Game()
│   ├── styles/
│   │   ├── base.css                # reset, fonts, full-screen canvas
│   │   ├── hud.css                 # HUD layout
│   │   └── menus.css               # crafting, shop, tab screen, title/win/lose, loot card
│   ├── core/
│   │   ├── loop.js                 # fixed-timestep loop, hitstop, pause, time scale
│   │   ├── rng.js                  # sfc32 seeded RNG on a plain state object + helpers; hashSeed
│   │   ├── math.js                 # vec3 helpers on {x,y,z}, clamp, lerp, angle utils, approach
│   │   ├── eventBus.js             # on/off/emit/emitAll for presentation listeners
│   │   └── pool.js                 # generic object pool (presentation side)
│   ├── data/
│   │   ├── tuning.js               # player movement, arena, vitals, global constants
│   │   ├── keybindings.js          # action → key codes
│   │   ├── tiers.js                # tier scaling formulas/table (1–10)
│   │   ├── guns/
│   │   │   ├── types.js            # 4 gun types: base stats, ammo type, drop weight, fire mode
│   │   │   ├── qualities.js        # Common..Legendary multipliers, colours, part counts, weights
│   │   │   ├── manufacturers.js    # 4 brands + stat quirks + colours + name prefixes
│   │   │   ├── parts.js            # barrel/grip/mag/scope options and stat mods
│   │   │   ├── elements.js         # none/fire/shock/goo params, colours, roll weights
│   │   │   ├── wackyPerks.js       # Legendary wacky perks (M9)
│   │   │   └── names.js            # name fragments per type/element/quality
│   │   ├── enemies.js              # grunt, spitter, bouncer, tank, dummy, miniSprotoAlly
│   │   ├── bosses.js               # megaSproto, hexAuditor: stats, phases, action params
│   │   ├── elites.js               # elite modifiers + affinity pool
│   │   ├── dropTables.js           # per-enemy/boss drop tables, gun type/quality tables
│   │   ├── resources.js            # resource ids, names, colours, icons
│   │   ├── recipes.js              # gun recipe table (4×5), ammo/medkit recipes, salvage, reroll
│   │   ├── skills.js               # 4 skills: XP curve params, per-level passives, XP per action
│   │   ├── perks.js                # perk defs (skill, level, params)
│   │   ├── spells.js               # spell defs (mana, cooldown, damage, key)
│   │   ├── waves.js                # 3 wave configs
│   │   └── shop.js                 # prices, vending table, upgrades
│   ├── sim/
│   │   ├── types.js                # JSDoc typedefs for every schema in §3 (no runtime code)
│   │   ├── state.js                # createGameState(opts), resetRun, nextId
│   │   ├── simulate.js             # system order (§1.5)
│   │   ├── events.js               # EV constants + emit(state, type, payload)
│   │   ├── actions.js              # applyActions: dispatch UI/debug actions to handlers
│   │   ├── debugOps.js             # debug action handlers (spawn, give, set tier, god, killAll…)
│   │   ├── selectors.js            # read-only helpers: getLocalPlayer, activeGun, nearestBox…
│   │   ├── collision/
│   │   │   ├── arena.js            # circle boundary clamp, ground, box colliders
│   │   │   ├── raycast.js          # ray vs sphere / capsule / ground; raycastEnemies w/ zones
│   │   │   ├── hitboxes.js         # world-space hitboxes for an entity from data (incl. weak spots)
│   │   │   └── overlap.js          # sphere-vs-capsule, circle push-apart, queryRadius
│   │   ├── factories/
│   │   │   ├── player.js           # createPlayer
│   │   │   ├── enemy.js            # createEnemy(type, tier, elite, pos)
│   │   │   ├── boss.js             # createBoss(type, tier, pos, paired)
│   │   │   ├── projectile.js       # createProjectile(kind, params)
│   │   │   ├── pickup.js           # createPickup(kind, params)
│   │   │   └── hazard.js           # createHazard(kind, params)
│   │   ├── guns/
│   │   │   ├── generator.js        # generateGun({seed, level, forced}) – pure, reproducible
│   │   │   ├── stats.js            # effectiveGunStats(gun, player) incl. skills/perks/buffs
│   │   │   ├── compare.js          # compareGuns(a, b) → per-stat delta + better/worse
│   │   │   └── value.js            # sellValue, salvageYield, shopPrice
│   │   ├── ai/
│   │   │   ├── steering.js         # seek, separation, wall avoidance, strafe, combine
│   │   │   ├── fsm.js              # setState helper, shared state timers
│   │   │   └── behaviors/
│   │   │       ├── grunt.js
│   │   │       ├── spitter.js
│   │   │       ├── bouncer.js
│   │   │       ├── tank.js
│   │   │       └── dummy.js
│   │   ├── bosses/
│   │   │   ├── bossCommon.js       # phase thresholds, transitions, action runner, drops
│   │   │   ├── megaSproto.js       # actions: chase, charge, stunned, slam, roarSummon
│   │   │   └── hexAuditor.js       # actions: drift, ring, spiral, fan, taxBolts, teleport, aura
│   │   ├── combat/
│   │   │   ├── damage.js           # THE damage pipeline (§4.2); applyDamageToEnemy/Player
│   │   │   ├── splash.js           # radial damage with falloff, self-damage, knockback
│   │   │   ├── elements.js         # proc logic: burn/shock chain/goo
│   │   │   └── kill.js             # onEnemyKilled: events, drops, second-wind revive
│   │   └── systems/
│   │       ├── playerInput.js
│   │       ├── playerMovement.js   # walk/sprint/jump/double/slide/dash, coyote, buffer
│   │       ├── playerCombat.js     # firing modes, reload, swap, recoil, ammo, medkit
│   │       ├── spells.js           # 5 spells
│   │       ├── allies.js           # mini Sprotos (Swarm spell, critSproto perk)
│   │       ├── enemyAI.js          # loops enemies, dispatches behavior by type
│   │       ├── bosses.js           # loops bosses, dispatches by bossType
│   │       ├── hazards.js          # shockwave rings, meteor markers, auras, portals, puddles
│   │       ├── projectiles.js      # integrate, swept collision, bounce, splash
│   │       ├── statusEffects.js
│   │       ├── playerVitals.js     # shield regen, mana regen, downed/second wind, invuln
│   │       ├── pickups.js          # magnet, collect, ttl
│   │       ├── drops.js            # rollDrops(table, ctx) → pickups (pure roll fn + spawner)
│   │       ├── crafting.js         # validate cost/unlock, start/finish craft, salvage, reroll
│   │       ├── shop.js             # offers, buy, sell, vending, upgrades
│   │       ├── progression.js      # XP from events, levels, perk unlocks, skill passives
│   │       ├── waveDirector.js     # wave state machine, spawn queue, intermission, win/lose
│   │       └── cleanup.js
│   ├── input/
│   │   ├── pointerLock.js          # request/exit, state, change handler, re-lock cooldown guard
│   │   ├── keyboardMouse.js        # held keys, latches, mouse delta, wheel, sensitivity
│   │   └── commandBuilder.js       # build Command; zero out combat input while menus open
│   ├── render/
│   │   ├── renderer.js             # WebGLRenderer, resize, main render(state, alpha)
│   │   ├── materials.js            # shared toon/standard materials, quality/element colours
│   │   ├── geometries.js           # shared low-poly geometries
│   │   ├── arenaView.js            # ground disc, glowing ring, spawn markers, weapon boxes
│   │   ├── cameraRig.js            # FP camera: interp pos, live look + recoil, FOV, shake, bob
│   │   ├── viewSync.js             # create/update/destroy views by entity id each frame
│   │   ├── feel.js                 # subscribes to events → hitstop, shake trauma, FOV punches
│   │   ├── views/
│   │   │   ├── viewmodel.js        # first-person gun built from parts; kick, sway, reload anim
│   │   │   ├── enemyView.js        # capsule Sprotos with googly eyes, per type; elite crown
│   │   │   ├── bossView.js         # Mega Sproto, Hex Auditor, weak spot, aura mesh
│   │   │   ├── allyView.js
│   │   │   ├── projectileView.js   # InstancedMesh per projectile visual kind
│   │   │   ├── pickupView.js       # InstancedMesh per pickup kind + loot beams for guns
│   │   │   ├── hazardView.js       # shockwave rings, meteor marker, spawn portal
│   │   │   └── debugHitboxes.js    # wireframe hitboxes toggle
│   │   └── vfx/
│   │       ├── muzzleFlash.js
│   │       ├── tracers.js          # pooled line segments
│   │       ├── confetti.js         # InstancedMesh particle system (1500)
│   │       ├── explosions.js       # expanding sphere + flash
│   │       └── impacts.js          # hit sparks, element puffs
│   ├── audio/
│   │   ├── audio.js                # AudioContext, master gain, resume on gesture, throttling
│   │   ├── synth.js                # tone(), noise(), sweep(), envelope helpers
│   │   └── sfx.js                  # named SFX recipes + bus listeners
│   ├── ui/
│   │   ├── ui.js                   # mounts all UI modules, update(state) fan-out
│   │   ├── uiState.js              # which menu is open, hover; NOT game state
│   │   ├── hud.js                  # bars, skills, gun panel, slots, top bar, resources
│   │   ├── crosshair.js            # crosshair (spread-reactive), hitmarker, scope overlay
│   │   ├── damageNumbers.js        # pooled DOM numbers projected from world positions
│   │   ├── banner.js               # queued banners ("GUNSLINGER LV 4", "WAVE 2")
│   │   ├── lootCard.js             # gun card + compare arrows
│   │   ├── skillsScreen.js         # Tab overlay
│   │   ├── craftingMenu.js         # weapon box UI
│   │   ├── shopPanel.js            # intermission shop
│   │   ├── bossBar.js              # top-centre boss HP + phase pips + tag
│   │   ├── screens.js              # title, pause, controls, win, lose/run summary
│   │   ├── debugPanel.js           # lil-gui panel → debug actions
│   │   └── format.js               # number/stat formatting, colours
│   └── game/
│       └── Game.js                 # wiring: state, loop, input, renderer, audio, ui, bus, modes
└── tests/
    ├── architecture.test.js
    ├── rng.test.js
    ├── determinism.test.js
    ├── collision.test.js
    ├── raycast.test.js
    ├── gunGenerator.test.js
    ├── gunStats.test.js
    ├── damage.test.js
    ├── dropTables.test.js
    ├── xp.test.js
    ├── progression.test.js
    ├── crafting.test.js
    ├── waves.test.js
    ├── shop.test.js
    └── helpers/
        └── simHarness.js           # createGameState + scripted commands runner
```

---

## 3. Core Data Schemas

All of these are plain objects. Positions are `{x,y,z}` with y up, the ground at y = 0, and the arena centre at the origin. Angles are in radians in the sim and degrees in data files where noted.

### 3.1 GameState
```js
{
  version: 1,
  seed: 12345,
  rng: { a, b, c, d },             // sfc32 uint32 state
  tick: 0, time: 0,
  nextId: 1,
  mode: 'sandbox' | 'waves',
  tier: 1,                          // 1..10
  localPlayerId: 1,
  players: { [id]: Player },        // map even with 1 player (MP hook)
  enemies: Enemy[],                 // includes bosses (enemy.boss != null)
  allies: Ally[],
  projectiles: Projectile[],
  pickups: Pickup[],
  hazards: Hazard[],
  weaponBoxes: WeaponBox[],
  spawnPoints: [{x,z}],             // 12 points at r = 28.5
  wave: WaveState | null,
  shop: ShopState,
  run: RunStats,
  tuning: { godMode:false, enemyHpMult:1, enemyDmgMult:1, unlockAllRecipes:false, infiniteAmmo:false },
  events: GameEvent[],              // cleared at start of each tick
}
```

### 3.2 Player
```js
{
  id, kind: 'player',
  pos, prevPos, vel,                // m, m/s
  yaw, pitch,                       // from command
  radius: 0.4, height: 1.8,         // standing; 1.0 while sliding
  onGround: true, jumpsLeft: 2, coyoteT: 0, jumpBufferT: 0,
  move: { mode:'walk'|'sprint'|'slide'|'dash'|'air', slideT:0, slideCd:0, dashT:0, dashCd:0, dashDir:{x,z} },
  hp: 100, maxHp: 100, shield: 50, maxShield: 50, shieldDelayT: 0,
  mana: 100, maxMana: 100,
  invulnT: 0, downed: false, downedT: 0, dead: false, respawnT: 0,
  unkillableUsed: false,            // reset each wave
  guns: [Gun|null, Gun|null, Gun|null, Gun|null],
  unlockedSlots: 3,                 // 4 in sandbox; 4th buyable in waves
  activeSlot: 0, swapT: 0, reloadT: 0, fireCd: 0,
  zooming: false,
  recoil: { pitch: 0, yaw: 0, heat: 0 }, // aim offset (radians), in sim
  shotCounter: 0,                   // for tenthMega perk
  ammo:    { bullets: 240, shells: 24, sniper: 12, rockets: 4 },
  ammoCap: { bullets: 480, shells: 64, sniper: 36, rockets: 12 },
  medkits: 0, medkitT: 0,
  resources: { scrap:0, springs:0, goo:0, plating:0, bossCore:0, manaCrystal:0 },
  tickets: 0,
  skills: SkillState,
  perks: { [perkId]: true },
  spells: { cd: { gooBolt:0, chainZap:0, swarm:0, manaShield:0, meteor:0 }, manaShieldOn: false },
  buffs: { killFrenzy: { stacks:0, t:0 } },
  lastDamageT: 0,                   // time since last damage taken
  intent: {}                        // per-tick parsed buttons (internal)
}
```

### 3.3 Enemy (bosses included)
```js
{
  id, kind: 'enemy', type: 'grunt'|'spitter'|'bouncer'|'tank'|'dummy'|'megaSproto'|'hexAuditor',
  faction: 'enemy',
  pos, prevPos, vel, yaw,
  radius, height, scale: 1,         // elite 1.25
  hp, maxHp, dmgMult: 1, speedMult: 1, tier: 1,
  elite: false,
  affinity: { resist: null|'fire'|'shock'|'goo', weak: null|'fire'|'shock'|'goo' },
  state: 'spawning'|'idle'|'chase'|'attack'|'stagger'|'dead',
  stateT: 0,
  attack: { phase: 'windup'|'active'|'recover', t: 0, hasHit: false },
  poise: 0,                         // accumulated stagger damage, decays
  status: { burn: null|{t, dps, sourceId}, goo: null|{t, slow}, shockT: 0 },
  ai: { strafeDir: 1, strafeT: 0, hopT: 0, airborne: false, ... },  // per-behavior scratch
  lastHit: { sourceId, sourceKind:'gun'|'spell'|'ally'|'dot'|'splash', element, isCrit, isWeak, gunId },
  dead: false,
  boss: null | BossData,
}
```

### 3.4 BossData
```js
{
  bossType: 'megaSproto'|'hexAuditor',
  tag: 'physical'|'magic',
  phaseIdx: 0,
  transitioning: false,
  invuln: false,
  action: { id: 'chase', t: 0, data: {} },
  patternIdx: 0,
  weakAngle: 0,                     // Hex rotating weak spot
  summonT: 0,
  manaOrbNext: 0.9,                 // hp fraction for next mana-orb drop (Hex)
  paired: false
}
```

### 3.5 Ally (mini friendly Sproto)
```js
{ id, kind:'ally', type:'miniSproto', pos, prevPos, vel, ttl: 8, targetId: null,
  damage: 30, splashRadius: 2, sourceKind: 'spell'|'gun', ownerId }
```

### 3.6 Projectile
```js
{
  id, kind: 'rocket'|'gooBolt'|'spit'|'orb'|'taxBolt'|'duckBullet'|'yeetGun'|'megaBullet',
  faction: 'player'|'enemy',
  ownerId, gunId: null,
  sourceKind: 'gun'|'spell'|'enemy'|'boss',
  pos, prevPos, vel, radius, gravity: 0,   // m/s² (spit uses 14)
  damage, element: 'none', elementChance: 0,
  splash: null | { radius, damage, minFalloff: 0.3, selfMult: 0.35, knockback: 8 },
  ttl, bounces: 0, pierce: 0, homing: 0,   // homing turn rate rad/s
  hitIds: {}                                // ids already hit (pierce)
}
```

### 3.7 Pickup
```js
{
  id, kind: 'health'|'bigHealth'|'mana'|'ammo'|'resource'|'tickets'|'gun',
  pos, prevPos, vel,
  amount: 20,
  ammoType: null|'bullets'|'shells'|'sniper'|'rockets',
  resId: null|'scrap'|'springs'|'goo'|'plating'|'bossCore'|'manaCrystal',
  gun: null | Gun,
  ttl: 30, age: 0, magnetized: false
}
```

### 3.8 Hazard
```js
{ id, kind: 'shockwave'|'meteorMarker'|'spawnPortal'|'aura'|'telegraphLine',
  pos, radius, maxRadius, speed, height, t, ttl, ownerId, damage, hitIds: {}, data: {} }
```

### 3.9 Gun (generated instance)
```js
{
  id, seed: 3735928559, level: 1,
  type: 'mg'|'shotgun'|'sniper'|'bazooka',
  quality: 'common'|'uncommon'|'rare'|'epic'|'legendary',
  manufacturer: 'blastco'|'zippity'|'reliable'|'gloop',
  element: 'none'|'fire'|'shock'|'goo',
  parts: { barrel: 'stock'|'long'|'short'|'ported', grip: ..., mag: ..., scope: ... },
  wacky: null | 'rubberDuck'|'yeetReload'|'tenthMega'|'critSproto'|'confettiKill'|'bigHead',
  arcane: false,                    // Mana Crystal infusion (crafting)
  rerolls: [ { stat:'damage', salt: 123 } ], // reproducibility of rerolled stats
  name: 'Zippity Spicy Brrrt-o-Matic',
  ammoType: 'bullets',
  stats: {                          // base generated stats (no player modifiers)
    damage, fireRate, spread, adsSpread, magSize, reloadTime, projectileSpeed, // 0 = hitscan
    critMult, critChance, elementChance, pellets, splashRadius, splashDamage,
    recoil, recoilYaw, swapTime, zoomFov, pierce
  },
  ammoInMag: 36,
  source: 'start'|'drop'|'craft'|'shop'|'vending'|'debug'|'boss'
}
```

### 3.10 Definitions (data)
```js
// GunTypeDef (data/guns/types.js)
{ id:'mg', name:'Machine Gun', ammoType:'bullets', dropWeight:60, fireMode:'auto',
  base:{ damage:9, fireRate:10, spread:1.2, adsSpread:0.45, magSize:36, reloadTime:1.8,
         projectileSpeed:0, critMult:2.0, critChance:0.05, elementChance:0.10, pellets:1,
         splashRadius:0, splashDamage:0, recoil:0.35, recoilYaw:0.15, swapTime:0.5, zoomFov:70, pierce:0 },
  visual:{ bodyLen:0.6, color:0x888888 } }

// QualityDef
{ id:'epic', idx:3, name:'Epic', color:'#b05cff', weight:5, damageMult:1.45, magMult:1.2,
  reloadMult:0.9, spreadMult:0.85, partSlots:4, wacky:false, priceMult:4.2, sellMult:4.2 }

// ManufacturerDef
{ id:'blastco', name:'Blastco', color:0xd94a3a, weight:1,
  mods:{ damage:1.15, fireRate:0.9, recoil:1.2 }, add:{}, alwaysElement:false,
  quirk:'Huge muzzle flash, chunky boxes' }

// GunPartDef (data/guns/parts.js) – mods are multiplicative unless in `add`
{ id:'long', slot:'barrel', name:'Long Barrel', mods:{ damage:1.10, spread:0.85, projectileSpeed:1.1, fireRate:0.95 }, add:{} }

// ElementDef
{ id:'fire', name:'Fire', color:'#ff7a1a', weight:17,
  proc:{ kind:'burn', dpsFrac:0.25, duration:3 } }
{ id:'shock', name:'Shock', color:'#4fe3ff', weight:17, proc:{ kind:'chain', targets:2, range:5, dmgFrac:0.5 } }
{ id:'goo',  name:'Goo',  color:'#9be33b', weight:16, proc:{ kind:'slow', slow:0.4, duration:2.5 } }

// WackyPerkDef
{ id:'rubberDuck', name:'Rubber Duckie', desc:'Bullets become bouncing rubber ducks (3 bounces).', allowedTypes:['mg','shotgun','sniper'] }
```

### 3.11 Recipe
```js
{ id:'mg_t3', category:'gun', gunType:'mg', tier:3, quality:'rare',
  cost:{ scrap:60, springs:20, goo:10 },
  craftingLevel:5, craftTime:1.5, xp:200,
  options:{ chooseElement:true, choosePart:false, arcaneInfusion:true, wackyRandom:false } }

{ id:'ammo_bullets', category:'ammo', ammoType:'bullets', amount:45, cost:{ scrap:5 }, craftingLevel:1, craftTime:0.5, xp:8 }
{ id:'medkit', category:'item', cost:{ scrap:10, goo:5 }, craftingLevel:1, craftTime:0.8, xp:10 }

// CraftAction (UI → sim)
{ type:'craft', boxId, recipeId, choice:{ element?:'fire', part?:{slot:'barrel', id:'long'}, arcane?:true } }
```

### 3.12 SkillState, SkillDef, Perk, Spell
```js
// player.skills
{ health:{ level:1, xp:0, total:0 }, gunslinger:{...}, magic:{...}, crafting:{...} }

// SkillDef (data/skills.js)
{ id:'gunslinger', name:'Gunslinger', color:'#ffcc33', xpBase:120, xpGrowth:1.45, maxLevel:10,
  perLevel:{ recoilMult:-0.04, spreadMult:-0.04, reloadMult:-0.03 },   // × (level-1)
  xp:{ gunKill:10, critKillBonus:5, weakHit:1, weakKillBonus:5, physicalBossKill:200 } }

// PerkDef (data/perks.js)
{ id:'killFrenzy', skill:'gunslinger', level:10, name:'Kill Frenzy', kind:'passive'|'spell'|'unlock',
  desc:'Kills grant a stack (max 10): +4% fire rate, +3% damage each. Stacks drop 4s after your last kill.',
  params:{ maxStacks:10, fireRatePer:0.04, dmgPer:0.03, window:4 } }

// SpellDef (data/spells.js)
{ id:'chainZap', perk:'chainZap', key:'E', manaCost:30, cooldown:4, damage:40, range:25,
  chains:4, chainRange:6, chainFalloff:0.8, xpCast:6 }
```

### 3.13 WaveConfig and WaveState
```js
// data/waves.js
{ id:1, name:'Wave 1: Warm-Up Sprotos', clearTickets:20, maxAlive:10,
  groups:[
    { at:0,  aliveBelow:null, pattern:'spread', spawns:[{ type:'grunt', count:3, elites:0 }] },
    { at:8,  aliveBelow:1,    pattern:'cluster', spawns:[{ type:'grunt', count:2, elites:0 }, { type:'spitter', count:1, elites:0 }] },
  ],
  boss: null | { types:['megaSproto'], afterAliveBelow:0, introDelay:3 } }

// state.wave
{ index:0, phase:'pre'|'combat'|'bossIntro'|'boss'|'cleared'|'intermission'|'victory'|'defeat',
  t:0, groupIdx:0, spawnQueue:[{ type, elite, delay, pointIdx }], spawnedCount:0, killedCount:0,
  totalCount:8, bossIds:[], intermissionT:0 }
```

### 3.14 ShopState, RunStats, WeaponBox
```js
state.shop = { offers:[{ id, gun, price, sold:false }], rerolls:0,
               upgrades:{ ammoCap:0, shieldCap:0, slot4:false } }
state.run  = { startTime:0, kills:0, eliteKills:0, bossKills:0, damageDealt:0, damageTaken:0,
               bestHit:0, crits:0, weakHits:0, ticketsEarned:0, gunsFound:0, crafts:0,
               xpGained:{ health:0, gunslinger:0, magic:0, crafting:0 } }
weaponBox  = { id, pos:{x:±20,y:0,z:0}, radius:1.0, interactRadius:3.0, glow:false,
               craft: null | { recipeId, playerId, choice, t, duration } }
```

### 3.15 Command (input → sim)
```js
{ tick, yaw, pitch, moveX:-1..1, moveZ:-1..1,
  held:{ fire, zoom, sprint },
  pressed:{ jump, slide, dash, reload, interact, medkit, gooBolt, chainZap, swarm, manaShield, meteor, skip },
  slot: -1|0|1|2|3, wheel: -1|0|1,
  actions:[ /* CraftAction | {type:'buy',offerId} | {type:'sell',slot} | {type:'vend'} |
              {type:'buyUpgrade',id} | {type:'salvage',boxId,slot} | {type:'reroll',boxId,slot,stat} |
              {type:'pickupGun',pickupId} | {type:'debug',op,args} | {type:'startMode',mode,tier} ] }
```

### 3.16 Events (`src/sim/events.js`)
Every event is `{ type, tick, ...payload }`.

| type | payload | Main listeners |
|---|---|---|
| `shot` | playerId, gunId, gunType, origin, dir, wacky | audio, muzzle flash, viewmodel kick, shake |
| `tracer` | from, to, element | tracers |
| `damage` | sourceId, targetId, amount, element, isCrit, isWeak, zone:'body'/'weak'/'shield', kind, pos, sourceKind, killed | damage numbers, hitmarker, audio, hitstop, progression |
| `kill` | victimId, victimType, elite, bossTag, killerId, sourceKind, element, wasCrit, wasWeak, pos, tier | confetti, audio, progression, second wind, run stats |
| `playerDamaged` | playerId, amount, toShield, toHealth, sourceId, dirFromSource | vignette, shake, audio, progression (Health XP) |
| `shieldBroken` / `shieldRegenStart` | playerId | audio, HUD |
| `playerDowned` / `playerRevived` / `playerDied` / `unkillableTriggered` | playerId | screens, audio, banner |
| `jump` / `doubleJump` / `land` / `slide` / `dash` | playerId | audio, FOV punch |
| `reloadStart` / `reloadEnd` / `swap` / `ammoEmpty` | playerId, slot | audio, viewmodel |
| `explosion` | pos, radius, element | explosions vfx, shake by distance, audio |
| `statusApplied` | targetId, status | impacts vfx, audio |
| `stagger` | targetId | vfx, audio |
| `enemySpawn` / `enemyAttack` (windup start) | id, type | audio telegraph |
| `pickup` | playerId, kind, amount, resId, ammoType | audio, HUD pulse, progression (healing → Health XP) |
| `gunPickedUp` / `gunDropped` | gunId, slot | audio |
| `cast` | playerId, spellId, manaCost | audio, vfx, progression (Magic XP) |
| `craftStart` / `craftComplete` | boxId, recipeId, gunId?, category | audio, vfx, progression (Crafting XP) |
| `salvage` / `reroll` | ... | audio, progression |
| `xpGain` | playerId, skill, amount | HUD mini-bar pulse |
| `levelUp` | playerId, skill, level | banner, audio |
| `perkUnlocked` | playerId, perkId | banner |
| `waveStart` / `waveCleared` / `intermissionStart` / `intermissionEnd` | waveIndex | banner, audio, shop |
| `bossSpawn` / `bossPhase` / `bossDefeated` | id, bossType, phaseIdx | boss bar, banner, hitstop (200ms) |
| `ticketsGained` | amount, reason | HUD |
| `purchase` / `sold` / `vend` | ... | audio, UI |
| `victory` / `defeat` | tier | screens |

---

## 4. Key Algorithms

### 4.1 RNG (`src/core/rng.js`)
```js
export function hashSeed(n) { /* splitmix32 → 4 uint32 */ }
export function createRng(seed) { const [a,b,c,d] = hashSeed(seed); const r = {a,b,c,d}; for (let i=0;i<12;i++) next(r); return r; }
export function next(r) { /* sfc32 on r.a..r.d, returns uint32 */ }
export const float = r => next(r) / 4294967296;           // [0,1)
export const range = (r, lo, hi) => lo + float(r) * (hi - lo);
export const int = (r, lo, hiIncl) => lo + Math.floor(float(r) * (hiIncl - lo + 1));
export const chance = (r, p) => float(r) < p;
export const pick = (r, arr) => arr[Math.floor(float(r) * arr.length)];
export function weighted(r, entries /* [{id, weight}] */) { /* cumulative, always 1 draw */ }
```
`state.rng` is the sim's only RNG. A gun has its own RNG built from `gun.seed`.

### 4.2 Gun generation (`src/sim/guns/generator.js`)
Rule: **the generator always draws from the RNG in the same order and the same number of times, whatever is forced.** Forcing the type, for example, does not reshuffle the parts. A gun is fully reproducible from `{seed, level, forced, arcane, rerolls}`.

```js
export function generateGun({ seed, level = 1, forced = {}, arcane = false, rerolls = [] }) {
  const r = createRng(seed);
  // 1) fixed-order draws
  const dType   = weighted(r, GUN_TYPES);            // MG 60 / SG 17 / SN 17 / BZ 6
  const dQual   = weighted(r, QUALITIES);            // C55 U27 R12 E5 L1
  const dMan    = weighted(r, MANUFACTURERS);        // equal
  const slotOrder = shuffle4(r);                     // 3 draws: which slots get parts first
  const partDraws = SLOTS.map(() => float(r));       // 4 draws
  const dElem   = weighted(r, ELEMENTS);             // none 50 fire 17 shock 17 goo 16
  const dElemAlt= weighted(r, ELEMENTS_NO_NONE);     // used if manufacturer.alwaysElement
  const dWacky  = float(r);
  const jitter  = STAT_KEYS.map(() => range(r, -0.05, 0.05)); // 8 draws
  const nameDraws = [float(r), float(r)];

  // 2) apply forced overrides
  const type = forced.type ?? dType.id;
  const quality = forced.quality ?? dQual.id;
  const man = MANUFACTURERS_BY_ID[forced.manufacturer ?? dMan.id];
  const q = QUALITIES_BY_ID[quality];
  const parts = { barrel:'stock', grip:'stock', mag:'stock', scope:'stock' };
  for (let i = 0; i < q.partSlots; i++) {
    const slot = slotOrder[i];
    const opts = PARTS_BY_SLOT[slot];                // 3 non-stock options
    parts[slot] = opts[Math.floor(partDraws[SLOTS.indexOf(slot)] * opts.length)].id;
  }
  if (forced.part) parts[forced.part.slot] = forced.part.id;
  let element = forced.element ?? (man.alwaysElement && dElem.id === 'none' ? dElemAlt.id : dElem.id);
  const wacky = quality === 'legendary'
     ? (forced.wacky ?? pickByFloat(WACKY.filter(w => w.allowedTypes.includes(type)), dWacky)) : null;

  // 3) stats
  const s = { ...GUN_TYPES_BY_ID[type].base };
  applyMods(s, man);                                 // multiplicative mods + adds
  for (const slot of SLOTS) if (parts[slot] !== 'stock') applyMods(s, PARTS_BY_ID[parts[slot]]);
  s.damage *= q.damageMult * levelMult(level);       // levelMult = 1.13^(level-1)
  if (s.splashDamage) s.splashDamage *= q.damageMult * levelMult(level);
  s.magSize = Math.max(1, Math.round(s.magSize * q.magMult));
  s.reloadTime *= q.reloadMult; s.spread *= q.spreadMult; s.adsSpread *= q.spreadMult;
  STAT_KEYS.forEach((k, i) => { if (k in s) s[k] *= 1 + jitter[i]; });
  if (element === 'none') s.elementChance = 0;
  if (arcane) { s.elementChance += 0.2; }
  for (const rr of rerolls) applyReroll(s, rr, quality);    // own RNG from seed ^ salt
  clampStats(s); roundStats(s);
  return { seed, level, type, quality, manufacturer: man.id, element, parts, wacky, arcane, rerolls,
           name: makeName(type, man, element, quality, nameDraws), ammoType: GUN_TYPES_BY_ID[type].ammoType,
           stats: s, ammoInMag: s.magSize };
}
```
- STAT_KEYS (8): `damage, fireRate, spread, magSize, reloadTime, projectileSpeed, critMult, elementChance`.
- **Drop rolling** (in `drops.js`) uses the context table (enemy, boss, shop, vending) and `state.rng` to roll type and quality. It then calls `generateGun({ seed: next(state.rng), level: state.tier, forced: {type, quality} })`. `id` and `source` are assigned outside the generator.

### 4.3 Effective gun stats (`src/sim/guns/stats.js`)
```js
effectiveGunStats(gun, player) → {
  damage:  gun.damage * (1 + 0.03*killFrenzyStacks),
  fireRate: gun.fireRate * (1 + 0.04*killFrenzyStacks),
  spread:  (zooming ? adsSpread : spread) * movePenalty * (1 - 0.04*(GS-1)),
           // movePenalty: 1 standing, 1.4 moving, 2.0 airborne, 0.8 sliding (wacky bonus)
  recoil:  gun.recoil * (1 - 0.04*(GS-1)),
  reloadTime: gun.reloadTime * (1 - 0.03*(GS-1)),
  swapTime: perks.fastHands ? 0.2 : gun.swapTime,
  critMult: gun.critMult + (perks.deadeye ? 0.5 : 0),
  ammoSaveChance: perks.bottomlessMags ? 0.15 : 0,
  ...rest
}   // GS = gunslinger level
```

### 4.4 Firing (`playerCombat.js`)
```
if swapT>0: swapT-=dt; return
if reloadT>0: reloadT-=dt; if reloadT<=0 finishReload(); return
fireCd -= dt
if held.fire && fireCd<=0:
  if ammoInMag==0: if pool>0 startReload() else emit ammoEmpty; return
  fireCd += 1/stats.fireRate
  if !(rng<ammoSaveChance) && !tuning.infiniteAmmo: ammoInMag--
  aimDir = dirFromYawPitch(yaw + recoil.yaw, pitch + recoil.pitch)
  for p in 0..pellets-1: dir = coneSpread(aimDir, stats.spread deg, state.rng)
     if projectileSpeed==0: hitscan(dir, range 150, pierce)   // §4.9
     else spawn projectile (rocket) from eye + dir*0.6
  recoil.pitch += rad(stats.recoil) * (1 + recoil.heat*0.6)    // climbing
  recoil.yaw   += rad(stats.recoilYaw) * range(rng,-1,1)
  recoil.heat = min(1, recoil.heat + 0.08)
  emit shot
else: recoil recovers toward 0 at 9°/s; heat decays 1.5/s
coneSpread: theta = rad(spread) * sqrt(float), phi = 2π*float
```

### 4.5 Damage pipeline (`src/sim/combat/damage.js`)
```js
// hit = { sourceId, sourceKind:'gun'|'spell'|'ally'|'dot'|'splash'|'enemy'|'boss', targetId,
//         base, element, elementChance, zone:'body'|'weak'|'shield', critChance, critMult,
//         canCrit, pellet:boolean, isSplash, fromPos, gunId, noProc }
export function damageEnemy(state, e, hit) {
  if (e.dead || e.state === 'spawning' || e.boss?.invuln) return 0;
  let dmg = hit.base;                                            // already includes quality+level
  // 1. attacker modifiers
  const p = state.players[hit.sourceId];
  if (p) {
    if (hit.sourceKind === 'spell') dmg *= 1 + 0.08 * (p.skills.magic.level - 1);
    if (hit.sourceKind === 'gun')   dmg *= 1 + 0.03 * p.buffs.killFrenzy.stacks;
  }
  // 2. weak spot ("BONK") and random crit
  let isWeak = hit.zone === 'weak';
  if (isWeak) dmg *= hit.critMult;                               // MG/SG 2.0, Sniper 3.0, +0.5 Deadeye
  let isCrit = hit.canCrit && float(state.rng) < (hit.critChance ?? 0.05);
  if (isCrit) dmg *= 1.5;
  // 3. type-specific armour
  if (hit.zone === 'shield') dmg *= 0.1;                         // Tank front shield "TINK"
  if (e.type === 'tank') { if (hit.isSplash) dmg *= 1.5; if (hit.pellet) dmg *= 1.3; }
  // 4. element affinity (whole hit)
  if (hit.element !== 'none') {
    if (e.affinity.weak === hit.element) dmg *= 1.5;
    if (e.affinity.resist === hit.element) dmg *= 0.5;
  }
  // 5. status vulnerability: none at launch (hook)
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.poise += dmg;
  e.lastHit = { sourceId: hit.sourceId, sourceKind: hit.sourceKind, element: hit.element, isCrit, isWeak, gunId: hit.gunId };
  emit(state, 'damage', { ..., amount: dmg, isCrit, isWeak, zone: hit.zone, killed: e.hp <= 0 });
  // 6. element proc (not for dot/procs to avoid recursion)
  if (!hit.noProc && hit.element !== 'none' && float(state.rng) < hit.elementChance)
    applyElementProc(state, e, hit, dmg);                        // burn/chain/slow
  // 7. lifesteal
  if (p?.perks.lifesteal && !p.downed) healPlayer(p, Math.min(dmg * 0.02, lifestealBudget(p))); // cap 4 hp/s
  // 8. stagger
  if (!e.boss && e.poise >= ENEMIES[e.type].poiseMax) { setState(e, 'stagger'); e.poise = 0; }
  if (e.hp <= 0) onEnemyKilled(state, e);
  return dmg;
}

export function damagePlayer(state, p, hit) {
  if (state.tuning.godMode || p.invulnT > 0 || p.dead) return 0;
  let dmg = hit.base * (hit.sourceKind === 'self' ? 1 : state.tuning.enemyDmgMult);
  dmg *= 1 - 0.03 * (p.skills.health.level - 1);               // Health DR, 27% at Lv10
  if (p.spells.manaShieldOn && p.mana > 0) {                     // Mana Shield absorbs 60%
    const absorb = Math.min(dmg * 0.6, p.mana * 1.5);
    p.mana -= absorb / 1.5; dmg -= absorb;
  }
  const toShield = Math.min(p.shield, dmg); p.shield -= toShield; dmg -= toShield;
  if (toShield > 0 && p.shield <= 0) emit(state, 'shieldBroken', ...);
  let toHealth = dmg;
  if (p.hp - toHealth <= 0) {
    if (p.perks.unkillable && !p.unkillableUsed) { p.unkillableUsed = true; toHealth = p.hp - 1; p.invulnT = 3; emit('unkillableTriggered'); }
    else if (!p.downed) { p.hp = 0; startDowned(state, p); toHealth = 0; }
    else { toHealth = 0; }                                       // already downed: hits ignored, the timer is the threat
  }
  p.hp -= toHealth; p.lastDamageT = 0; p.shieldDelayT = shieldDelay(p);
  emit(state, 'playerDamaged', { amount: toShield + toHealth, toShield, toHealth, ... });
}
```

**Second Wind (`playerVitals.js` and `kill.js`):**
- `startDowned`: `downed = true`, `downedT = 10`, speed ×0.3. The player can still shoot but cannot jump, sprint, dash, slide or cast.
- `onEnemyKilled`: if any player is downed, revive them. Revive gives HP = 30% max, full shield and `invulnT = 2`.
- When `downedT` reaches 0: `dead = true`. In waves that means defeat. In sandbox the player respawns after 3 s.

### 4.6 Element procs (`combat/elements.js`)
- **Fire:** `e.status.burn = { t: 3, dps: hitDmg * 0.25, sourceId }`. A new burn refreshes the timer and keeps the higher dps. `statusEffects` ticks burn every 0.5 s as `damageEnemy({ sourceKind: 'dot', noProc: true, canCrit: false, element: 'fire' })`.
- **Shock:** find up to 2 nearest other enemies within 5 m that are not yet hit, and deal 50% of the hit's damage to each (`noProc: true`). Emit a `tracer` with element `'shock'` for the zap arc.
- **Goo:** `e.status.goo = { t: 2.5, slow: 0.4 }`, so effective speed ×0.6. Bosses get half slow and half duration.
- **Arcane** (crafted with a Mana Crystal): proc potency ×1.5 (burn dps, chain dmgFrac, slow duration).

### 4.7 XP curve and perks (`progression.js`, `data/skills.js`)
```js
xpToNext(skill, L) = Math.round(skill.xpBase * Math.pow(skill.xpGrowth, L - 1));   // L in 1..9
function addXp(state, p, skillId, amount) {
  amount *= 1 + 0.10 * (state.tier - 1);                       // tier bonus
  const s = p.skills[skillId]; if (s.level >= 10) return;
  s.xp += amount; s.total += amount; emit('xpGain');
  while (s.level < 10 && s.xp >= xpToNext(SKILLS[skillId], s.level)) {
    s.xp -= xpToNext(SKILLS[skillId], s.level); s.level++;
    emit('levelUp', { skill: skillId, level: s.level });
    for (const perk of PERKS.filter(k => k.skill === skillId && k.level === s.level)) {
      p.perks[perk.id] = true; emit('perkUnlocked', { perkId: perk.id });
    }
    applySkillPassives(p);   // recompute maxHp, maxMana, regen, etc. Keep the hp fraction; +maxHp delta added to hp
  }
}
// progression(state): iterate events[0..lenAtStart) and map each to addXp calls per §7.4
```
Lv1 perks (Goo Bolt, Crafting T1) are granted in `createPlayer`.

### 4.8 Enemy AI: FSM and steering
```
enemyAI(state, dt): for e of enemies (non-boss, !dead):
  e.stateT += dt
  slow = e.status.goo ? (1 - e.status.goo.slow) : 1
  speed = def.speed * e.speedMult * slow
  target = nearest alive player (downed players count; enemies "dance" on them)
  switch e.state:
    'spawning': if stateT >= 0.8 → 'chase'   (invulnerable, pops out of a portal)
    'idle':     → 'chase' (arena is small, always aggro); dummy stays idle
    'chase':    desired = behavior.steer(e, target, state)       // unit vector * speed
                if behavior.canAttack(e, target) → 'attack', attack={phase:'windup',t:0,hasHit:false}, emit enemyAttack
    'attack':   behavior.attackUpdate(e, target, dt)            // windup → active → recover → 'chase'
                desired = behavior.attackMove ?? zero
    'stagger':  desired = zero; if stateT >= def.staggerTime → 'chase'  (an attack in progress is cancelled)
  e.vel.xz = approach(e.vel.xz, desired, def.accel * dt)
  integrate; gravity for Bouncer; ground clamp
  e.poise = max(0, e.poise - def.poiseMax*0.5*dt)
after loop: resolveEnemyOverlaps (pairwise circle push, O(n²) for n ≤ 60; tanks/bosses mass ×5)
            clampToArena for every enemy; push player out of enemies (player moves, enemy doesn't)
```

**Steering (`ai/steering.js`):**
```
seek     = normalize(target.xz - e.xz)
separate = Σ over others within (ri+rj+0.6): (e.xz - o.xz)/max(d², 0.01)
wall     = r > R-3 ? -radial * (r-(R-3))/3 : 0
strafe   = perp(seek) * e.ai.strafeDir                     // flip every 2–4 s (rng)
desired  = normalize(w.seek*seek + w.sep*separate + w.wall*wall + w.strafe*strafe) * speed
```

**Per-type behaviour:**
- **Grunt:** weights seek 1.0, sep 1.5, wall 2.0, strafe 0.15. Attacks when in range (1.6 m + radii).
  - Attack: windup 0.35 s, then a 0.15 s active window (a sphere r 1.0 in front at chest height that hits the player capsule once), then recover 0.6 s.
  - During windup it leans back (render squash). During active it lunges 3 m/s forward.
- **Spitter:** keeps 10–18 m away. Inside 10 m, seek is inverted (backs away); beyond 18 m it seeks. Strafe weight is 0.8. Attack cooldown 2.4 s when line of sight exists and distance < 22 m.
  - Windup 0.5 s (inflates), then lobs `spit`: gravity 14, solved for a ballistic arc to the player position **without leading**, which keeps it dodgeable. Speed is set so flight time is about 1.1 s. Splash r 1.5, dmg 14.
- **Bouncer:** custom movement.
  - When `hopT` ends (range 0.7–1.3 s) it jumps: vy = 7 and horizontal 9 m/s toward the player, rotated by a random ±60°.
  - On landing within 2.5 m of the player it stomps: 15 dmg AoE r 2.5 (a hazard ring visual).
  - Airborne Bouncers take full damage. Stagger knocks them to the ground.
- **Tank:** facing yaw turns toward the target at 70°/s at most, and it moves only along its facing at 2.2 m/s. When within 3.5 m and the target is in the front 60° cone, it attacks.
  - Attack: ground pound, windup 0.9 s (raises arms), 25 dmg AoE r 3.2, recover 1.2 s.
  - Its hitboxes include a front shield zone (see §4.10).
- **Dummy:** never moves. Optional `regen` resets HP 2 s after the last hit. Debug can toggle infinite HP.

### 4.9 Collision
**Player vs arena (`collision/arena.js`):**
```
r = hypot(x, z); maxR = ARENA_RADIUS(30) - radius
if r > maxR: x,z *= maxR/r; vRadial = dot(vel.xz, n); if vRadial>0 vel.xz -= n*vRadial
if y < 0: y = 0; vel.y = 0; onGround = true
weapon boxes: circle (r 1.0) vs circle (player r): push out along the normal
```

**Ray vs sphere:** the standard quadratic, returning the smallest t ≥ 0.

**Ray vs vertical capsule** (segment A = base + r·up to B = top − r·up, radius r):
```
1. Ray vs infinite cylinder around the axis (ignore y in the quadratic using the horizontal components
   of origin-A and dir). Take t0; hit y must lie within [A.y, B.y].
2. Else test ray vs sphere(A, r) and ray vs sphere(B, r); take the min valid t.
```

**`raycastEnemies(state, origin, dir, maxDist, ignoreIds)`:**
```
best = null
for e of enemies (not dead, not spawning):
   if !raySphere(origin, dir, e.centre, e.boundRadius) continue      // broadphase
   for hb of worldHitboxes(e):                                       // from data, scaled & rotated by yaw
       t = hb.type==='sphere' ? raySphere(...) : rayCapsule(...)
       if t < best.t - 1e-4 || (|t-best.t|<0.05 && zonePriority(hb.zone) > zonePriority(best.zone))
           best = {e, t, zone: hb.zone, point}
zonePriority: weak 3 > shield 2 > body 1
ground: if dir.y < 0 → tGround = -origin.y/dir.y (for impact puffs / meteor targeting)
```

**Hitscan:** call `raycastEnemies`. On a hit, run the damage pipeline. If `pierce > 0`, continue from the hit point + 0.05 with the hit enemy ignored. Emit a `tracer` to the final point.

**Projectiles (swept, `systems/projectiles.js`):**
```
for p of projectiles:
  p.vel.y -= p.gravity*dt; homing: rotate vel toward target by homing*dt
  segStart = p.pos; segEnd = p.pos + p.vel*dt; len = |segEnd-segStart|
  if faction==='player': hit = raycastEnemies(segStart, dir, len + p.radius)   // radius-inflated
  else: hit = segmentVsCapsule(player capsule inflated by p.radius)
  if hit: onProjectileHit (direct damage, then splash if any); unless pierce/bounce → dead
  elif segEnd.y <= 0: bounces>0 ? reflect vel.y*-0.7, bounces-- : (splash ? explode : dead)
  elif hypot(segEnd.xz) > ARENA_RADIUS: bounces>0 ? reflect radial : dead
  p.pos = segEnd; p.ttl -= dt; if p.ttl<=0 → explode or die
```

**Splash (`combat/splash.js`):**
```
explode(state, pos, splash, ownerId, element, sourceKind):
  for e within splash.radius + e.radius:
     d = distance(pos, closestPointOnCapsule(e)); f = lerp(1, splash.minFalloff, d/splash.radius)
     damageEnemy(e, {base: splash.damage*f, isSplash:true, zone:'body', element, canCrit:false})
     knockback e (not bosses/tanks) by splash.knockback*f
  if owner is a player and within radius: damagePlayer(owner, {base: splash.damage*f*splash.selfMult, sourceKind:'self'})
       + knockback the player (rocket-jump!)
  emit explosion
```

### 4.10 Hitboxes (data, `enemies.js`)
Offsets are local: +z is forward and y is up. They are multiplied by `scale`.
- **Grunt:** body capsule r 0.5, h 1.6. Weak sphere "antenna bulb" at (0, 1.75, 0) r 0.22.
- **Spitter:** body capsule r 0.55, h 1.3. Weak sphere "throat sac" at (0, 1.0, 0.45) r 0.25.
- **Bouncer:** body sphere r 0.6 at (0, 0.6, 0). Weak sphere "spring" at (0, 0.05, 0) r 0.3, so it is hittable mostly when airborne.
- **Tank:** body capsule r 0.9, h 2.2. Shield capsule (front plate) r 0.95 at (0, 1.1, 0.75), h 2.0. Weak sphere "battery" at (0, 1.3, −0.85) r 0.35, back only.
- **Mega Sproto:** body capsule r 2.0, h 4.5. Weak sphere head at (0, 4.6, 0.6) r 0.6. While stunned, an extra weak "belly button" at (0, 2.0, 1.9) r 0.5, critMult ×1.5 extra.
- **Hex Auditor:** body sphere r 1.3 at (0, 0, 0) relative to its hover position. Weak "Audit Ledger" sphere orbiting at radius 1.9, angle `weakAngle`, r 0.45.

### 4.11 Boss phase machine (`bosses/bossCommon.js`)
```
updateBoss(state, e, dt):
  def = BOSSES[e.boss.bossType]
  frac = e.hp / e.maxHp
  next = def.phases[e.boss.phaseIdx + 1]
  if next && frac <= next.hpBelow && !e.boss.transitioning:
     e.boss.transitioning = true; e.boss.invuln = true; startAction(e, 'transition', {duration: 2})
     emit bossPhase; impl.onPhaseEnter(state, e, phaseIdx+1)   // e.g. summon grunts
  a = e.boss.action; a.t += dt
  done = impl.actions[a.id](state, e, a, dt, def)              // returns true when finished
  if done:
     if a.id === 'transition': phaseIdx++; transitioning=false; invuln=false
     phase = def.phases[phaseIdx]
     id = phase.pattern[e.boss.patternIdx++ % phase.pattern.length]
     startAction(e, id)
```

**Mega Sproto actions:**
- `chase`: 3 s seeking at speed × phase.speedMult.
- `charge`:
  1. Telegraph 0.8 s, spawning a `telegraphLine` hazard toward the player's position.
  2. Dash at 22 m/s (× speedMult) for up to 2.0 s along the locked direction.
  3. Hitting the player deals 35 dmg plus a 12 m/s knockback, once.
  4. Hitting the arena wall (r ≥ 28) leads to `stunned`.
- `stunned`: 2.0 s. Belly weak spot active, taking ×1.5 extra.
- `slam`:
  1. Hop up for 0.6 s (vy 10), land, then spawn a `shockwave` hazard: speed 10 m/s, maxRadius 22, height 0.6, thickness 1.0, dmg 25.
  2. It hits the player if `|dist − radius| < 0.5 + player.radius` and `player.pos.y < height`, once per ring.
  3. Phase 2 spawns 2 rings 0.6 s apart.
- `roarSummon` (phase-2 enter): spawns 4 Grunts at T1–4 and 6 at T5+, at the 4 spawn points nearest to the boss. Repeats every 20 s while fewer than 6 summoned Grunts are alive (an extra `summon` pattern entry).

| Phase | Range | speedMult | Pattern |
|---|---|---|---|
| Phase 1 | hp > 50% | 1.0 | chase, charge, chase, slam |
| Phase 2 | hp ≤ 50% | 1.3 | chase, charge, slam, charge, slam, summon |

**Hex Auditor actions:**
- **Hover:** y = 3 + 0.3·sin(time·2). It drifts at 4 m/s toward a point 12 m from the player.
- **Weak spot:** `weakAngle += rad(120 or 200 in P3)·dt`.
- **Aura** (always active, radius 8 m, 12 m in P3): a player inside loses 15 mana/s and gets 0 mana regen.
- `ring`: 16 orbs, radial, speed 8.
- `spiral`: 3 arms rotating 90°/s, 10 orbs/s for 3 s, speed 7.
- `fan`: 5 orbs aimed at the player across a 40° fan, speed 10.
- `taxBolts` (P2+): 3 homing orbs, speed 6, homing 1.2 rad/s, ttl 6.
- `teleport`: fade 0.6 s (invuln), reappear at a random point with r 10–20 at least 8 m from the player, re-materialise 0.4 s.
- **Orbs:** radius 0.35, dmg 8 (Tax Bolt 12), ttl 6, purple glow.
- **Mana orbs:** at every 10% HP lost, drop 2 `mana` pickups (+25 mana each).
- **Death:** 2 Mana Crystals, 1 Boss Core and the standard boss drops.

| Phase | Range | Teleport every | Pattern |
|---|---|---|---|
| P1 | > 60% | 8 s | drift, ring, fan, spiral, teleport |
| P2 | ≤ 60% | 5 s | ring, taxBolts, spiral, fan, teleport |
| P3 "Final Audit" | ≤ 25% | — | spiral+ring (simultaneous), taxBolts, fan, teleport |

**Paired bosses** (wave 3): HP ×0.85 each. Hex attack cooldowns ×1.2 while Mega Sproto is alive.

### 4.12 Wave director (`systems/waveDirector.js`)
```
phases: pre(3s, banner "WAVE n") → combat → [bossIntro(3s) → boss] → cleared(2s) → intermission(15s) → pre ...
combat:
  t += dt
  while groupIdx < groups.length:
     g = groups[groupIdx]
     if t >= g.at || (g.aliveBelow != null && aliveEnemies() <= g.aliveBelow && t >= 2):
        enqueue each enemy with delay i*0.35 and spawnPoint by pattern; groupIdx++
     else break
  process spawnQueue: when delay elapsed AND alive < maxAlive → spawn portal hazard (0.8s) → createEnemy
  if all groups queued && queue empty && alive==0:
      boss ? → bossIntro : → cleared
  (also bossIntro may begin when alive <= boss.afterAliveBelow)
boss: when all boss ids dead and alive==0 → cleared
cleared: tickets += clearTickets*tierTicketMult; emit waveCleared; if last wave → victory
intermission: weaponBoxes.glow=true; enemies none; all non-gun pickups magnetize to player; shop offers rolled;
              player.unkillableUsed = false; t counts down 15s; command.pressed.skip → end early
victory: tickets += 150*tierMult; spawn guaranteed Legendary gun pickup at centre (level = tier); emit victory
defeat (player dead): emit defeat
Spawn-point pattern: 'spread' = pick points ≥ 90° apart, farthest from the player first;
  'cluster' = one random point ±1 neighbour; 'random' = rng. Points within 10 m of the player are never picked.
```

### 4.13 Drop tables (`systems/drops.js`, `data/dropTables.js`)
```js
// table entry shapes
{ kind:'resource', resId:'scrap', min:3, max:5, chance:1 }
{ kind:'health', amount:20, chance:0.20 }
{ kind:'ammo', chance:0.35 }                        // ammo type weighted by the player's carried guns
{ kind:'gun', chance:0.04, table:'enemyGun' }
{ kind:'tickets', min:1, max:1, chance:1 }

export function rollDrops(rng, table, ctx /* {elite, boss, tier, playerGunTypes} */) → DropSpec[]
// elite: resource & ticket amounts ×2; gun chance ×3 (cap 0.6) and the gun quality table shifts +1 tier at 50%
// tier: resource & ticket amounts × (1 + 0.10*(tier-1)), rounded
// pure: returns specs; spawnDrops(state, specs, pos) creates pickups with a random burst velocity
```
Ammo type rule: pick uniformly among the ammo types of the guns currently in the player's slots. Amounts: bullets 45, shells 8, sniper 5, rockets 2.

---

## 5. Milestones

General rules for every milestone:
- Write the data first, then the sim, then render/UI, then tests.
- Keep `npm test` green.
- Every new sim feature gets a debug-panel control.
- Commit at the end of each numbered task group.

---

### M1: Circle arena, FP movement, Machine Gun, target dummies, debug panel shell

**Goal:** the architecture skeleton is fully in place (loop, sim/render split, commands, events, RNG). It must already feel good to run around and shoot dummies.

**Files to create:**
- Root: `package.json`, `vite.config.js`, `index.html`, `README.md`
- `src/main.js`, `src/styles/{base,hud,menus}.css`
- `src/core/{loop,rng,math,eventBus,pool}.js`
- `src/data/{tuning,keybindings,enemies}.js`, `src/data/guns/types.js` (MG only for now)
- `src/sim/{types,state,simulate,events,actions,debugOps,selectors}.js`
- `src/sim/collision/{arena,raycast,hitboxes}.js`
- `src/sim/factories/{player,enemy}.js`
- `src/sim/systems/{playerInput,playerMovement,playerCombat,enemyAI,cleanup}.js`, `src/sim/ai/behaviors/dummy.js`
- `src/input/{pointerLock,keyboardMouse,commandBuilder}.js`
- `src/render/{renderer,materials,geometries,arenaView,cameraRig,viewSync,feel}.js`
- `src/render/views/{viewmodel,enemyView,debugHitboxes}.js`, `src/render/vfx/{muzzleFlash,tracers,impacts}.js`
- `src/audio/{audio,synth,sfx}.js`
- `src/ui/{ui,uiState,hud,crosshair,damageNumbers,screens,debugPanel,format}.js`
- `src/game/Game.js`
- `tests/{architecture,rng,determinism,collision,raycast}.test.js`, `tests/helpers/simHarness.js`

**Tasks:**
1. **Scaffold.**
   - Run `npm create vite@latest` (vanilla) or write the files by hand, then `npm i three lil-gui` and `npm i -D vite vitest`.
   - Scripts: `"dev":"vite"`, `"build":"vite build"`, `"preview":"vite preview"`, `"test":"vitest run"`, `"test:watch":"vitest"`.
   - `vite.config.js` gets a `test: { environment: 'node', include: ['tests/**/*.test.js'] }` block.
2. **`index.html`:** `<div id="app"><canvas id="game"></canvas><div id="hud"></div><div id="menus"></div><div id="damage-layer"></div></div>`, with a click-to-play overlay.
3. **`core/rng.js`** (sfc32 + helpers, §4.1) and **`core/math.js`** (v3 create/add/sub/scale/len/norm/dot/cross, `dirFromYawPitch`, `approach`, `angleDiff`, `clamp`, `lerp`).
4. **`core/eventBus.js`**: `on(type, fn)`, `off`, `emit(evt)`, `emitAll(arr)`, plus a wildcard `'*'` channel.
5. **`data/tuning.js`** with every value from §7.1. Add an `ARENA` block: `{ radius: 30, ringRadius: 30, spawnPointCount: 12, spawnRadius: 28.5, boxPositions: [{x:-20,z:0},{x:20,z:0}] }`.
6. **`sim/state.js`:** `createGameState({ seed, mode: 'sandbox', tier: 1 })` builds the rng, player at (0,0,0), spawn points, weapon boxes (inert in M1), and the tuning object. `nextId(state)` returns `state.nextId++`.
7. **`sim/events.js`:** EV constants and `emit(state, type, payload)`, which pushes `{type, tick: state.tick, ...payload}`.
8. **Input.**
   - `keyboardMouse.js` tracks held keys by `event.code`, latches edges, accumulates mouse movementX/Y × sensitivity (default 0.0022 rad/px, settings slider later), and clamps pitch to ±89°.
   - `commandBuilder.js` builds §3.15 and zeroes fire, zoom and look when `uiState.menuOpen`.
   - `pointerLock.js` requests lock on canvas click and fires a `lockchange` callback.
   - Call `preventDefault` for Tab, Alt, Space, Backquote, the Ctrl+key combos we use, and the context menu.
9. **`playerInput.js` and `playerMovement.js`:** walk, sprint, accel/friction, jump with coyote time and buffer, double jump, slide, dash. Use the §7.1 numbers and the arena clamp. Emit jump, land, slide and dash events.
10. **Render.**
    - `renderer.js`: WebGLRenderer with antialias, sRGB output, ACES tone mapping, hemisphere + directional light, sky colour `#7fd3ff`, fog.
    - `arenaView.js`:
      - Ground: a disc r 30 with a checker or grid texture made on a canvas.
      - Ring: a torus at r 30, emissive cyan `#3ff6ff`, pulsing.
      - Boundary: a faint transparent cylinder wall (opacity 0.06).
      - Spawn markers: 12 small glowing pads.
      - Weapon boxes: 2 boxes 1.6×1.2×1.6 with "?" decals.
    - `cameraRig.js`: interpolated player eye position (eye 1.6, 0.9 sliding), live yaw/pitch + recoil, FOV 90 base, +6 while sprinting, smooth FOV lerp, trauma shake (§8), head bob.
11. **Gun v0.**
    - `data/guns/types.js` holds the MG base stats (§7.2).
    - `createPlayer` calls a temporary `makeStarterGun()` that returns a Gun object with the full schema (common, blastco-less "Stock", element none).
    - M3 replaces this with `generateGun({seed:1, level:1, forced:{type:'mg', quality:'common', manufacturer:'reliable', element:'none'}})`.
12. **`playerCombat.js`:** auto fire, hitscan (`raycast.js` §4.9), recoil (§4.4), reload (R, or auto when the mag is empty), ammo pool.
13. **Dummy enemies.**
    - `data/enemies.js` defines `dummy`: hp 500, regen after 2 s, hitboxes body + weak (weak spots treated as body until M4 via `tuning.weakSpotsEnabled = false`).
    - `factories/enemy.js`; `debugOps.spawnEnemy`. In sandbox, spawn 5 dummies at r 10 at startup.
14. **`damage.js` v0:** subtract HP, emit damage/kill (dummies never die unless regen is off). Put the pipeline skeleton with TODO hooks in the final file location `src/sim/combat/damage.js`.
15. **Presentation:**
    - `viewmodel.js`: a box gun attached to the camera, with kick (z −0.06, pitch +3° spring), sway on mouse delta, and a reload dip animation.
    - `muzzleFlash.js`: an additive star sprite plus a point light, 50 ms.
    - `tracers.js`: a pool of 64 line segments, 60 ms.
    - `impacts.js`: a small spark burst.
    - `damageNumbers.js`: a DOM pool of 48 elements, rising 1 m over 0.7 s, scaled and fading.
    - `crosshair.js`: 4 ticks whose gap = spread, plus a hitmarker X for 120 ms.
    - `sfx.js`: `shot_mg` (noise burst 40 ms + square 220→110 Hz), `hit` (sine 880 Hz 30 ms), `reload` (two clicks), `jump` (boing sweep 300→600), `dash` (whoosh noise filtered), `land`.
    - `feel.js`: shake trauma on shot 0.04.
16. **HUD v0:** ammo `36 / 240` bottom-right, a speed readout in debug only, and the crosshair.
17. **Debug panel shell (`ui/debugPanel.js`, lil-gui, toggled by backtick):**
    - Stats folder: fps, tick, entities, player speed, position.
    - Game folder: god mode, infinite ammo, time scale (0.1–2), refill ammo, reset run (new seed), seed display/input.
    - Spawn folder: "Spawn dummy".
    - Render folder: show hitboxes.
    - Every button dispatches `input.queueAction({type:'debug', op, args})`. Ops: `setGod`, `setInfiniteAmmo`, `refillAmmo`, `spawnEnemy`, `reset`.
    - Panel open releases pointer lock and sets `uiState.menuOpen = true`.
18. **Pause:** an unexpected pointer-lock loss (Esc) opens the pause overlay and sets `game.paused = true`. Click resumes. `uiState.expectUnlock` separates menu-driven unlocks from Esc.
19. **Tests:** rng, collision (arena clamp), raycast (sphere/capsule), determinism (§9), architecture.

**Data added:** `tuning.js` (full movement/arena), MG base stats, dummy enemy def, keybindings.

**Acceptance criteria:**
- `npm run dev` shows the arena. Clicking locks the pointer.
- WASD walk reads 6.5 m/s in the debug readout and Shift reads 9.5.
- Space jumps about 1.45 m high. A second Space in the air double-jumps.
- C (or Ctrl) while moving > 5 m/s slides: low camera, speed boost to 13 m/s that decays over 0.75 s.
- Alt (or V) dashes 3.6 m in 0.15 s. Pressing it again within 2 s does nothing.
- Walking into the edge stops you at r = 29.6. You can never leave, even with dash or slide-jump.
- Holding LMB fires 10 shots/s. The mag empties after 36 and auto-reloads in 1.8 s. The reserve drops from 240 to 204.
- The crosshair climbs (recoil) during sustained fire and recovers when you release.
- Dummies show white "9" numbers, the hitmarker and the hit sound. Dummy HP resets 2 s after the last hit.
- Backtick opens the panel with the cursor visible. Closing it and clicking re-locks.
- Esc pauses (the sim stops; dummies' regen does not progress).
- `npm test` passes: determinism (same seed and same 600 scripted commands give identical state hashes), and the architecture scan finds no `three` or `Math.random` in sim/data.

**Debug verify:** god toggle, infinite ammo, time scale 0.2 (slow-motion movement still smooth thanks to interpolation), hitboxes overlay aligned with the dummy meshes, reset gives a new seed.

---

### M2: Four enemy types, health/shield/mana, healing orbs

**Goal:** real enemies that chase and hurt you, vitals, second wind, health orbs with magnet, and confetti death pops.

**Create:**
- `src/sim/ai/{steering,fsm}.js`, `src/sim/ai/behaviors/{grunt,spitter,bouncer,tank}.js`
- `src/sim/systems/{projectiles,playerVitals,pickups,drops,hazards}.js`
- `src/sim/combat/{splash,kill}.js`
- `src/sim/factories/{projectile,pickup,hazard}.js`
- `src/data/{dropTables,resources}.js` (resources defined but only scrap is visual until M6; drops in M2 are health orbs only)
- `src/render/views/{projectileView,pickupView,hazardView}.js`, `src/render/vfx/{confetti,explosions}.js`
- `tests/dropTables.test.js` (health-only table for now)

**Modify:** `enemies.js` (4 types, §7.3), `damage.js` (`damagePlayer` §4.5), `enemyView.js`, `hud.js` (bars), `debugPanel.js`, `sfx.js`, `feel.js`, `screens.js` (sandbox death/respawn).

**Tasks:**
1. `steering.js` and `fsm.js` (§4.8). `enemyAI.js` dispatches to `behaviors[type]` with the interface `{ steer, canAttack, attackUpdate, onSpawn }`.
2. Grunt behaviour, including the melee sphere vs player capsule overlap (`overlap.js: sphereVsCapsule`).
3. Spitter: the ballistic solve `solveLob(from, to, flightTime 1.1, gravity 14)`, plus the `spit` projectile and its splash vs the player.
4. Bouncer hop logic plus the stomp hazard (ring visual, instant damage check).
5. Tank: turn-rate-limited facing, shield hitbox zone (a 10% multiplier active now), back weak spot (2.5× active even before M4: `zone === 'weak'` multiplier enabled for the tank only via data `weakAlways: true`; M4 enables it everywhere), ground pound.
6. Enemy separation and arena clamp. The player is pushed out of enemies. Enemy melee knocks the player back 4 m/s.
7. Stagger: poise thresholds (§7.3) and a 0.4–0.8 s stagger with a white flash (render reacts to `stagger` events).
8. **Vitals (`playerVitals.js`):**
   - Shield regen: delay 3 s, then 25/s.
   - Mana regen: 5/s (no spells yet; the bar still exists).
   - Invuln timer.
   - Downed/Second Wind (§4.5): downed sets the camera to 0.6 m height with a desaturated screen and a big "SECOND WIND! KILL SOMETHING! 10…" countdown.
   - Sandbox: death leads to a respawn in 3 s at the centre with full vitals. In waves, defeat is implemented in M8.
9. `pickups.js`: magnet (radius 4 m, accel 30 m/s², collect at 0.9 m), health only magnetizes when hp < maxHp, ttl 30 s with blinking in the last 5 s. `drops.js` provides `rollDrops` plus `spawnDrops` with a burst velocity (y 4–6, xz 2–4) and simple gravity bounce.
10. Health orb drop chance per type (§7.6). The orb heals 20 HP, or 25% of maxHp if that is larger.
11. **Render:**
    - Enemies as capsule Sprotos: body colour by type (Grunt `#ff6b6b`, Spitter `#7bd389`, Bouncer `#ffd93d`, Tank `#6c8cff`), googly eyes (white spheres with black pupils that jitter), and a type prop: Spitter mouth-tube, Bouncer spring legs, Tank front plate (box).
    - Squash and stretch on hop and windup.
    - Hit flash: emissive white for 60 ms on damage events.
    - Spawn: scale 0→1 with an elastic ease over 0.8 s.
12. **Confetti:** an InstancedMesh of 1500 small quads. A kill bursts 40 particles (Tank 70) coloured from a palette plus the enemy colour, with gravity, spin and a 1.2 s life. Sound `pop` is a sine at 600 Hz with a pitch drop plus a noise click, followed by a party-horn sweep for 10% of kills (presentation random).
13. **HUD:** bottom-left bars. Shield is cyan over Health (red), with numbers. Mana is blue. A damage direction indicator shows red arcs around the crosshair. A low-HP vignette appears under 30%.
14. **Debug panel:**
    - Spawn folder: enemy type dropdown (grunt/spitter/bouncer/tank/dummy), count (1–20), tier (1–10, used from M4/M8 scaling; apply HP scaling now via `tiers.js`), elite checkbox (stub until M4), "Spawn at crosshair" vs "Spawn at edge".
    - Game folder: "Kill all", enemy HP mult slider (0.1–5), enemy dmg mult slider (0–5), "Freeze AI" toggle.
    - Player folder: set HP/shield/mana full, "Damage me 30".
15. `data/tiers.js`: `hpMult(t) = 1.15^(t-1)`, `dmgMult(t) = 1.15^(t-1)`, `gunLevel(t) = t`, `rewardMult(t) = 1 + 0.10*(t-1)`.

**Acceptance criteria:**
- Grunts run at you and hit for 12 after a visible 0.35 s windup. Strafing at sprint speed avoids most hits.
- Spitters keep their distance and lob green arcs. A sideways walk dodges them.
- Bouncers hop erratically and stomp when they land near you.
- Tanks turn slowly. Shooting the front shows "1"-ish numbers with a "TINK" sound; circling behind hits the battery for 2.5×.
- Damage drains the shield first. The shield starts regenerating 3 s after the last hit at 25/s. Health never regenerates.
- At 0 HP you are downed with a 10 s countdown. Killing an enemy revives you at 30% HP. Timeout means death and a respawn in sandbox.
- Killed enemies explode in confetti with a pop. Some drop red health orbs that fly to you when hurt. A full-HP player leaves orbs on the ground.
- 30 enemies alive hold steady at 60 fps on a mid laptop.

**Debug verify:** spawn 10 of each type; kill all; HP slider makes Grunts die in 1 shot at 0.1; dmg 0 makes you invulnerable-ish; freeze AI.

---

### M3: Four gun types, procedural generator, drops, compare UI

**Goal:** a seeded loot generator, distinct gun behaviours, slots, ammo pools, gun drops with beams, the loot card, and pickup with G.

**Create:**
- `src/data/guns/{qualities,manufacturers,parts,elements,names}.js`
- `src/sim/guns/{generator,stats,compare,value}.js`
- `src/ui/lootCard.js`
- `tests/{gunGenerator,gunStats}.test.js`

**Modify:** `guns/types.js` (all 4), `playerCombat.js`, `projectiles.js` (rocket), `splash.js`, `factories/player.js` (starter MG via generator; slots; ammo pools), `drops.js` and `dropTables.js` (gun and ammo drops), `pickupView.js` (gun pickups with beams), `viewmodel.js` (assembled from parts), `hud.js` (slots and gun panel), `crosshair.js` (scope overlay), `debugPanel.js`, `sfx.js`.

**Tasks:**
1. Data: the 4 types (§7.2), qualities, manufacturers, parts and elements (§7.2 tables). `names.js` holds type nouns (MG: "Brrrt-o-Matic", "Spray Buddy", "Hosepipe"; SG: "Boomstick", "Spreadinator", "Door Knocker"; SN: "Long Boi", "Peekaboo", "Eye Poker"; BZ: "Kaboomerang", "Tube of Joy", "Big Yes"), element adjectives (Spicy/Zappy/Sticky) and quality adjectives (L: "Absolutely Bonkers").
2. `generator.js` exactly as §4.2. `stats.js` as §4.3 (skill parts stubbed at level 1). `compare.js` returns `[{stat, a, b, delta, better: boolean|null}]`; for reloadTime and spread, lower is better.
3. Fire modes in `playerCombat.js`:
   - **MG:** existing.
   - **Shotgun:** `pellets` hitscan rays. Each pellet is a separate damage hit with `pellet: true`. The pump animation runs between shots.
   - **Sniper:** hitscan with pierce 1. Hip spread 3°, scoped spread 0. RMB gives FOV 25 (or the scope part's zoomFov), the black scope overlay, and sensitivity × (fov/90). Unscoping happens automatically during reload.
   - **Bazooka:** a `rocket` projectile, speed 28, radius 0.25, gravity 0, ttl 4. On impact: direct damage + splash (§4.9) + self-damage 35% + player knockback 10 m/s (rocket jump).
4. Slots:
   - Keys 1–4 and the wheel. Swap time 0.5 s, during which the viewmodel lowers and raises.
   - Locked slots: `unlockedSlots` is 4 in sandbox and 3 in waves (M8). Locked slots show a padlock.
   - Separate ammo pools. Reload takes from the pool of `gun.ammoType`.
5. Gun drops: the enemy gun table (§7.6) with the type and quality weights. Elites are added in M4.
6. Gun pickup visuals:
   - The gun model floats and spins at 0.6 m.
   - A vertical beam: a cylinder 6 m tall, quality-coloured, additive. Legendary also gets sparkles.
7. Loot card: shows when a gun pickup is within 2.5 m **and** within a 25° cone of the view direction, choosing the closest to the centre.
   - Contents: name coloured by quality, type/manufacturer/element icon, level, stats list with green ▲ / red ▼ against the active gun, the wacky perk text (M9), "[G] Pick up", and the sell value.
8. Pickup rule (action `pickupGun`): put the gun in the first empty unlocked slot. Otherwise replace the active slot and drop the old gun at your feet with its `ammoInMag` preserved.
9. Ammo pickups: on kill, 35% chance (§7.6). Ammo types are weighted by the player's carried guns.
10. Viewmodel assembled from parts:
    - Body: a box sized by type.
    - Barrel: a cylinder whose length depends on the part.
    - Mag: a box or drum.
    - Scope: a cylinder.
    - Colour: manufacturer colour. Accent: emissive quality colour. Element glow strip.
    - Bazooka is a big tube. Shotgun has a pump box that slides.
11. HUD gun panel (bottom-right): name in quality colour, `ammoInMag / pool`, ammo type icon, 4 slot boxes (numbered, with a short name and quality border colour; active one highlighted).
12. Debug panel "Spawn Gun" folder:
    - Inputs: type (random/mg/shotgun/sniper/bazooka), quality (random/...), element (random/none/fire/shock/goo), manufacturer (random/...), level (1–20), seed (blank = random from state.rng).
    - Buttons: "Spawn at feet" and "Give to slot".
    - "Gun Tuning" folder: sliders for the active gun's damage, fireRate, spread, magSize, reloadTime, projectileSpeed, critMult, elementChance. They write through debug op `setGunStat` and refresh when the slot changes.
    - "Give ammo (all)".
    - The loot card shows the seed in debug mode.
13. SFX:
    - `shot_shotgun`: low noise burst 120 ms + thump 80 Hz.
    - `shot_sniper`: crack (noise HP-filtered 20 ms) + tail.
    - `shot_bazooka`: whoomp sweep 200→60.
    - `explosion`: noise LP 400 ms.
    - `pickup_gun`: arpeggio, pitch rising with quality.
    - `swap`: two clicks.
14. Tests: `gunGenerator.test.js` and `gunStats.test.js` (§9).

**Acceptance criteria:**
- You start with "Ol' Reliable Common Hosepipe"-style MG in slot 1.
- Debug-spawning each type shows distinct handling:
  - The Shotgun one-shots a Grunt at under 4 m (9 pellets × 8).
  - The Sniper zooms on RMB with an overlay, and the shot pierces 2 lined-up Grunts.
  - The Bazooka rocket visibly travels, explodes with confetti and shake, and hurts you if you are within 4 m (shield drops). Shooting the floor while jumping launches you.
- The same seed + level + forced params in the debug panel spawns an identical gun every time (name and stats match).
- Killing about 50 Grunts yields roughly 2 gun drops, mostly MGs, with coloured beams.
- Walking up to a drop shows a card with green/red arrows. G equips it into a free slot or swaps the active one, dropping the old gun.
- Ammo pools are separate. An empty Bazooka with no rockets shows "NO AMMO" and plays an empty click.

**Debug verify:** gun tuning sliders change behaviour live (fireRate 30 = minigun); spawn 20 random guns to eyeball quality/type distribution; give ammo.

---

### M4: Elements, crits, weak spots, Elites

**Goal:** the full damage pipeline, status effects, weak-spot BONKs with hitstop, elite enemies, affinities.

**Create:** `src/sim/combat/elements.js`, `src/sim/systems/statusEffects.js`, `src/data/elites.js`, `tests/damage.test.js`.

**Modify:** `damage.js` (full §4.5), `raycast.js` (zone priority), `enemies.js` (weak spots and affinities for all types), `factories/enemy.js` (elite + affinity), `drops.js` (elite multipliers), `damageNumbers.js`, `feel.js` (hitstop), `enemyView.js` (status visuals, elite crown/outline), `debugPanel.js`, `sfx.js`.

**Tasks:**
1. Enable weak spots globally (`tuning.weakSpotsEnabled = true`).
2. Complete the damage pipeline order exactly as in §4.5.
3. Implement `applyElementProc`: burn ticks, shock chain (with a zap tracer event), goo slow (enemy speed multiplier in the AI).
4. Status visuals:
   - Burn: orange flicker particles and a tint.
   - Goo: a green drip, a scaled-down jiggle, slower anims.
   - Shock: a cyan arc line between the chained targets for 100 ms.
5. Base affinities (§7.3) and the elite modifiers (§7.3). Elites also get a random resist and a different random weak element from `elites.js`.
6. Elite visuals: scale 1.25, a gold crown (cone ring) on top, a pulsing gold rim (a back-face outline mesh scaled 1.05 in `#ffd700`), and a name tag "ELITE GRUNT" above.
7. Damage numbers:
   - Normal: white, 18 px.
   - Crit: yellow `#ffe14d`, 26 px, with a "!" suffix.
   - Weak spot: 30 px plus a separate "BONK!" text in a wobbly font (CSS rotate ±8°), pink `#ff4fd8`.
   - Element-coloured numbers for element damage and DoT ticks (smaller, 14 px).
   - Shield hit "TINK" grey.
   - Resisted hits get a "resist" grey tag; weak-element hits get a "WEAK!" tag.
8. Hitstop in `feel.js`: weak spot 60 ms, crit 40 ms, elite kill 90 ms. At most one hitstop per 150 ms. Weak-spot and crit hits also add +0.15 trauma and a 2° FOV punch.
9. SFX: `bonk` (sine 1200→400 with a wood-block noise), `crit` (bright ping), `burn` (crackle), `zap` (square jitter), `goo` (low wobble), `tink`.
10. Drops: elites double resource and ticket amounts, gun chance ×3 (cap 0.6), and quality up-shift (§4.13).
11. Debug panel:
    - Spawn folder: the elite checkbox works; affinity override dropdown.
    - Player folder: "Force crit next shot".
    - Damage log toggle: prints the pipeline breakdown to the console for each hit, for verifying multipliers.
12. Tests: `damage.test.js` (§9).

**Acceptance criteria:**
- Headshots (antenna bulbs) on Grunts show a big pink number and "BONK!", with a tiny freeze-frame you can feel.
- A Sniper on a Grunt bulb does 85 × 3 = 255 (one-shot).
- A Fire gun sets enemies burning: orange ticks for 3 s.
- A Shock gun zaps 2 neighbours (visible arc, cyan numbers).
- A Goo gun visibly slows enemies.
- Spawning an Elite Tank shows a crown and gold glow, 2.5× HP, and twice the drops on death.
- Fire against a fire-resistant Tank shows halved grey "resist" numbers.
- The damage log shows the multipliers in order.

**Debug verify:** damage log; elite spawn; force element via gun spawner; hitstop toggle (add `tuning.hitstop` checkbox).

---

### M5: Use-based XP for 4 skills plus perk unlocks (Health, Gunslinger, Magic incl. spells)

**Goal:** progression with no skill points. Levels from use, automatic perks, all 5 spells, and the Tab screen.

**Create:**
- `src/data/{skills,perks,spells}.js`
- `src/sim/systems/{progression,spells,allies}.js`
- `src/render/views/allyView.js`
- `src/ui/{banner,skillsScreen}.js`
- `tests/{xp,progression}.test.js`

**Modify:** `factories/player.js` (skills/perks init, Lv1 perks), `playerVitals.js` (Health passives, Quick Shield, mana regen, Mana Shield drain), `stats.js` (Gunslinger passives, Deadeye, Fast Hands, Bottomless Mags, Kill Frenzy), `damage.js` (Health DR, Mana Shield, Unkillable, lifesteal, spell damage scaling), `kill.js` (Kill Frenzy stacks), `hud.js` (skill mini-bars, spell icons), `debugPanel.js`, `sfx.js`, `feel.js`.

**Tasks:**
1. Data: skills (§7.4 XP values and curve params), perks (§7.5), spells (§7.5).
2. `progression.js`: map events to XP (§7.4 table). Implement `addXp` and `applySkillPassives(p)`:
   - `maxHp = 100*(1+0.08*(H-1))`
   - `drMult = 1-0.03*(H-1)`
   - `maxMana = 100+15*(M-1)`
   - `manaRegen = 5+1*(M-1)`
   - `spellDmgMult = 1+0.08*(M-1)`
   - Gunslinger multipliers are applied in `stats.js`.
3. Damage-taken XP accumulates fractionally (0.2 XP per HP), capped at 15 XP per second via a per-second budget in the player scratch.
4. Spells (`spells.js`). Each checks the perk, mana, cooldown and not-downed.
   - **Goo Bolt (Q):** a projectile from the eye at speed 30, splash r 1.5, dmg 25, guaranteed goo slow.
   - **Chain Zap (Y):** hitscan from the crosshair (range 25). On a hit, chain 4× within 6 m to the nearest unhit enemies, each ×0.8. Zap tracers. Each hit is shock element with a guaranteed proc of 0 (no recursion).
   - **Sproto Swarm (Z):** spawn 5 allies in an arc in front of you.
   - **Mana Shield (X):** toggle. Costs 10 mana on activation and drains 4/s, absorption per §4.5. Auto-off at 0 mana. Shows a blue bubble tint on the screen edges.
   - **Meteor Bonk (T):** needs `mana >= maxMana`, consumes all mana. Target = the crosshair ground point (raycast vs the ground, max 40 m; if pointing at the sky, use 15 m forward). Spawns a `meteorMarker` hazard (r 6, 1.0 s, pulsing red circle). Then 300 × spellMult splash with min falloff 0.4, knockback 14, a big shake and a falling-sphere visual from y = 40. It can hurt the player? No: the meteor has no self-damage.
5. `allies.js`: mini Sprotos seek the nearest enemy at 9 m/s and explode on contact (30 dmg × spellMult, splash r 2, sourceKind `'spell'` or `'gun'` per the creator). ttl 8 s, then they explode harmlessly into confetti. Cap 12 alive.
6. Kill attribution for XP:
   - `sourceKind` `'gun'` includes splash from rockets and DoT from gun elements. Carry `originKind` on DoT and splash hits (`burn.originKind = 'gun' | 'spell'`).
   - Spell kills go to Magic. Ally kills go by creator.
7. Banner (`banner.js`): a queue. Each banner holds 1.8 s: big text "GUNSLINGER LV 4" in the skill colour with a CSS pop/scale animation, then a subline "NEW PERK: FAST HANDS — swap guns way faster". Sound `levelup`: a major arpeggio C-E-G-C on square waves. Small confetti burst around the player (presentation).
8. HUD:
   - Bottom-left, under the bars: 4 skill chips ("HP 3", "GUN 5", "MAG 2", "CRF 1") with mini XP bars that pulse on `xpGain`.
   - Spell bar above the bars: Q/E/Z/X/F icons with mana cost. Each shows a radial cooldown sweep (CSS conic-gradient), is greyed when locked (padlock with "Magic Lv3"), and turns red when you cannot afford it. F glows when mana is full.
9. Tab screen (`skillsScreen.js`, hold Tab): 4 columns. Each shows the skill name, level, XP `x / y`, the per-level passive values now and at the next level, and the perk ladder (Lv1–10 rows with unlocked/locked styling). Plus a stats sidebar (Max HP, DR %, shield, shield delay, mana, regen, recoil −%, reload −%, spell dmg +%) and the run stats.
10. Debug panel "Progression" folder:
    - Per skill: "+100 XP", "+1000 XP", "Set level" dropdown (1–10, sets xp = 0 and grants all perks ≤ level).
    - "Max all skills".
    - "Refill mana", "Reset cooldowns".
11. Tests: `xp.test.js` and `progression.test.js` (§9).

**Acceptance criteria:**
- Killing 10 Grunts with a gun gives Health +100 → Lv2 with the banner "HEALTH LV 2", and Gunslinger +100 (just short of Lv2 at 120).
- Health Lv2 raises max HP to 108 (visible in the Tab screen).
- At Magic Lv1, Q fires a goo bolt for 15 mana. E shows a locked padlock until Magic Lv3.
- Debug "Set Magic level 10" unlocks all spells:
  - E chains visibly through 5 Grunts.
  - Z sends 5 wobbling mini Sprotos that explode on enemies.
  - X toggles the Mana Shield and the mana drains while you take hits.
  - F with full mana drops a meteor with a 1 s red warning, wipes a group and plays a huge BONK.
- Gunslinger Lv10 shows "FRENZY x7" near the crosshair while chaining kills, with a visibly faster fire rate.
- Health Lv10: lethal damage leaves you at 1 HP with a golden flash and 3 s invuln, once.

**Debug verify:** set levels, XP buttons, cooldown reset; damage log shows DR and spell multipliers.

---

### M6: Resources, Weapon Boxes, gun and ammo crafting, Crafting XP

**Goal:** the resource economy and the crafting loop.

**Create:** `src/data/recipes.js`, `src/sim/systems/crafting.js`, `src/ui/craftingMenu.js`, `tests/crafting.test.js`.

**Modify:** `dropTables.js` (resources per type, §7.6), `pickups.js` (resource pickups, magnet always on), `pickupView.js` (resource visuals), `progression.js` (Crafting XP), `playerCombat.js` (medkit H), `arenaView.js` (box glow states, craft animation), `hud.js` (resources top-right, medkit count), `actions.js`, `debugPanel.js`, `sfx.js`, `value.js` (salvage yields).

**Tasks:**
1. Resource drops per enemy type (§7.6). Elite ×2, tier multiplier.
2. Resource pickup visuals (instanced, bobbing):

   | Resource | Visual | Colour |
   |---|---|---|
   | Scrap | grey gear-ish box | `#b0b0b0` |
   | Springs | yellow torus | `#ffd93d` |
   | Goo | green blob sphere | `#7bd389` |
   | Plating | blue flat box | `#6c8cff` |
   | Boss Core | big orange octahedron | `#ff8c1a` |
   | Mana Crystal | purple octahedron | `#b05cff` |

3. HUD top-right resource strip with icons and counts, with a pulse on gain.
4. `recipes.js`: generate the 4×5 gun recipes from the compact cost table (§7.7) and add the ammo/medkit recipes. `craftingLevel` per tier: T1 1, T2 3, T3 5, T4 7, T5 10.
5. Weapon Box interaction:
   - G within 3 m opens `craftingMenu` (releases pointer lock and sets `uiState.menuOpen`). Time keeps running.
   - WASD still moves the player, because keyboard keeps working without lock.
   - The menu auto-closes when distance > 3.5 m.
   - Closing it (G, Esc or the X button) re-requests pointer lock on the next click or keypress. Respect the Chrome re-lock cooldown: if `requestPointerLock` rejects, show "Click to resume".
6. Crafting menu UI:
   - Tabs: **Guns** | **Ammo & Items** | **Salvage** (Lv8) | **Reroll** (Lv10).
   - **Guns tab:** a 4-column (MG/SG/SN/BZ) × 5-row (T1–T5) grid. Each cell shows the quality colour, cost icons (red when unaffordable) and its lock state ("Crafting Lv5").
   - Selecting a cell shows the detail pane:
     - T3+: element picker (Fire/Shock/Goo).
     - T3+: optional "Arcane Infusion (+1 Mana Crystal)".
     - T4+: part picker (slot dropdown + option).
     - T5: "Random Wacky Perk".
     - A preview of the expected stat ranges: generate with a placeholder seed and display it as "≈".
   - **Craft** button dispatches `{type:'craft', boxId, recipeId, choice}`.
7. `crafting.js`:
   - Validate the unlock (`craftingLevel` or `tuning.unlockAllRecipes`), cost, box idle and choice validity. Deduct the cost and start a timer (`craftTime`).
   - On finish: gun recipes call `generateGun({seed: next(rng), level: tier, forced:{type, quality, element?, part?}, arcane})` and spawn a gun pickup popping out of the box (an arc toward the player). Ammo and items go directly to the player, capped.
   - Emit `craftComplete`, then Crafting XP follows.
   - Box visual: a lid that bounces open and closed while crafting, sparks, and a "ding" sound on completion.
8. Medkits: H uses one (0.8 s use time, cancelled by firing). Heals 50 HP. Carry at most 3.
9. Salvage (Crafting Lv8): pick a slot gun (not the last remaining gun), get the salvage yield (§7.7) and remove the gun.
10. Reroll (Crafting Lv10): pick a slot gun and one of the 8 stats. Pay the cost (§7.7) and push `{stat, salt: next(rng)}` to `gun.rerolls`. Regenerate stats via the generator (deterministic). It shows old → new.
11. Crafting XP per recipe (§7.4).
12. Debug panel:
    - "Give resources" (each resource + amount, "+100 all").
    - "Unlock all recipes" toggle.
    - "Set Crafting level".
    - "Instant craft" toggle (`tuning.instantCraft`).
13. Tests: `crafting.test.js` (§9).

**Acceptance criteria:**
- Kills drop coloured resource bits that fly to you. Bouncers drop springs, Spitters goo, Tanks plating.
- At Crafting Lv1 the T1 MG costs 20 Scrap. Crafting it takes 1.5 s, a Common MG pops out of the box at your current tier, and Crafting gains 60 XP.
- T2 shows locked until Crafting Lv3.
- Bazooka T1 shows a Boss Core cost (red if you have none).
- With "unlock all" and debug resources, a T3 Shotgun with Fire comes out Rare and Fire, a T4 part choice is honoured, and T5 is Legendary.
- The menu stays open while enemies attack you (time does not pause). Walking away closes it.
- Ammo recipes add to the pools, capped. A medkit crafts and H heals.

**Debug verify:** resource giving, unlock toggle, instant craft, crafting level set → reroll/salvage tabs appear.

---

### M7: Both bosses (Physical/Magic tags, Boss Cores, Mana Crystals)

**Goal:** two multi-phase bosses with readable telegraphs and big rewards.

**Create:** `src/data/bosses.js`, `src/sim/bosses/{bossCommon,megaSproto,hexAuditor}.js`, `src/sim/systems/bosses.js`, `src/sim/factories/boss.js`, `src/render/views/bossView.js`, `src/ui/bossBar.js`.

**Modify:** `hazards.js` (shockwave ring, telegraph line, aura), `projectiles.js` (orbs, taxBolt homing), `projectileView.js` (orb instancing, cap 400), `dropTables.js` (boss tables), `progression.js` (boss XP by tag), `kill.js`, `debugPanel.js`, `sfx.js`, `feel.js` (boss phase hitstop 200 ms, slam shake).

**Tasks:**
1. Data: boss stats (§7.3) and phases/actions (§4.11).
2. `bossCommon.js` phase machine. Bosses are immune to stagger and knockback; goo is at half strength.
3. Mega Sproto actions:
   - Charge telegraph: a red ground strip 2 m wide along the path.
   - Slam: a ring hazard rendered as an expanding torus, orange `#ff7a1a`, 0.6 m tall.
   - Wall stun: a dizzy-stars sprite and the belly weak spot appears (pink glow).
   - Summon at 50%.
4. Hex Auditor:
   - Float and drift. Patterns: ring, spiral, fan, taxBolts.
   - Teleport with a puff and a fade (material opacity).
   - Rotating weak-spot ledger: a book-shaped box that glows.
   - Aura: a translucent purple sphere r 8 that drains mana and stops regen, with a purple screen tint and "MANA DRAIN" HUD text while inside.
   - Drops mana orbs every 10% HP.
5. Boss bar (top centre):
   - The name with the tag badge: **PHYSICAL** (orange fist) or **MAGIC** (purple star).
   - HP bar with phase pips at 50%, or at 60% and 25%.
   - Shows two stacked bars when paired.
6. Boss spawn: banner "MEGA SPROTO APPROACHES!", a 2 s drop-in from the sky (lands with a shockwave that does no damage), and a ground crack decal.
7. Boss death:
   - Hitstop 200 ms, slow-motion 0.5 s (time scale ramp, presentation only), and a giant confetti burst (300).
   - Drops (§7.6): Boss Core, 2 big health orbs (60 HP + full shield), 60 tickets, 2 guns from the boss table (L 25%, E 35%, R 40%). Hex also drops 2 Mana Crystals.
8. XP:
   - Physical boss kill: Health +200, Gunslinger +200.
   - Magic boss kill: Magic +200 (regardless of weapon) and Health +10.
   - Tier multiplier applies.
9. Debug panel "Boss" folder:
   - Spawn Mega / Hex / Both (paired), at the selected tier.
   - "Boss HP → 51% / 26%" (jump phases).
   - "Skip action".
   - "Show boss state" (phase, action, t).
   - "Freeze boss".
10. SFX:
    - `boss_roar`: low saw sweep with a tremolo.
    - `slam`: big noise and sub thump.
    - `charge_warn`: rising beep.
    - `orb_fire`: soft blip, throttled.
    - `teleport`: reverse whoosh.

**Acceptance criteria:**
- **Mega Sproto:**
  - It telegraphs its charge (red strip, rising beep), then barrels. Side-stepping avoids it.
  - Hitting the wall stuns it and exposes the pink belly (×3 BONK).
  - Slam rings are cleared by jumping; standing still takes 25.
  - At 50% it roars (2 s invuln, "IMMUNE" numbers) and summons 4 Grunts, then speeds up with double slams.
- **Hex Auditor:**
  - Orb patterns are slow enough to strafe through at walk speed (orb speed ≤ 10).
  - Standing in the aura drains mana visibly.
  - The ledger weak spot orbits. Hitting it shows BONK.
  - It teleports every 8 s, then 5 s.
  - It drops blue mana orbs as it loses HP.
- Kills award a Boss Core (plus 2 Mana Crystals for Hex), big orbs and boosted guns, plus the XP banners.
- Paired spawn at T1 is beatable with debug god mode off by a competent player with Epic guns.

**Debug verify:** HP phase jumps; freeze; spawn both; boss state readout.

---

### M8: Three-wave mode, intermission shop, tickets, tier replay, win/lose screens

**Goal:** the complete game loop.

**Create:** `src/data/{waves,shop}.js`, `src/sim/systems/{waveDirector,shop}.js`, `src/ui/shopPanel.js`, `tests/{waves,shop}.test.js`.

**Modify:** `state.js` (mode init, `resetRun` for retry/next tier), `screens.js` (title, controls, win, lose/summary), `hud.js` (top bar: wave #, enemies left, tickets), `drops.js` (tickets), `value.js` (shop prices, sell), `arenaView.js` (box glow during intermission, spawn portals), `actions.js` (buy/sell/vend/upgrade/skip/startMode), `debugPanel.js`, `sfx.js`.

**Tasks:**
1. Title screen. "SPROTO SHOOTER" in a big wobbly title over a slowly orbiting arena camera. Buttons:
   - **Wave Mode** (tier selector 1..highestUnlockedTier for the session).
   - **Sandbox**.
   - **Controls** (bindings table with the Ctrl+W warning).
   - Settings: sensitivity, volume, FOV, screen shake on/off. These live in memory only.
2. `waves.js` (§7.8) and `waveDirector.js` (§4.12). Use spawn portals: a purple swirl disc that pops up 0.8 s before the enemy, with a sound.
3. Tickets:
   - Kill tickets dropped as gold coin pickups (magnet), per §7.9.
   - Wave clear, boss and victory tickets credited directly with a "+35 TICKETS" HUD pop.
4. HUD top bar: "WAVE 2/3 · TIER 3", "ENEMIES LEFT 9" (remaining = total − killed, including queued), a ticket counter, and the resources (from M6).
5. Intermission (15 s):
   - Banner "INTERMISSION — SHOP [B] · READY [ENTER]".
   - Weapon Boxes glow gold and the HUD shows "SAFE".
   - All non-gun pickups magnetize from any distance.
   - Shop offers rolled. A big countdown sits top centre.
6. Shop panel (B; releases lock):
   - **Guns:** 4 offers at the current tier (§7.9 table); hover shows the loot card compare.
   - **Vending Machine:** 35 tickets per pull, with a little "clunk" animation; outcome per §7.9.
   - **Upgrades:** ammo cap, shield cap, 4th slot.
   - **Supplies:** ammo refill, medkit.
   - **Sell:** your slot guns with values (cannot sell the last gun).
   - **Reroll offers:** 10 tickets, +5 per reroll in the same intermission.
   - **Ready!** button.
7. Win:
   - After wave 3 clears: 150 × rewardMult tickets and a guaranteed Legendary gun pedestal at the centre (a golden beam).
   - Victory screen after 4 s (so you can grab it): "SPROTO-TASTIC! Tier N cleared", run stats, XP gained per skill.
   - Buttons: **Next Tier (N+1)** (max 10), **Replay Tier**, **Title**.
   - Next/replay keep guns, skills, resources, tickets and upgrades. HP, shield and mana are refilled. The wave resets.
8. Lose:
   - The downed timer expires in wave mode: slow-motion fall, then the "SPROTO'D" screen with the run summary (kills, damage dealt/taken, best hit, crits, BONKs, tickets earned, guns found, time, XP per skill).
   - Buttons: **Retry Tier** (keeps skills, guns, resources and upgrades; lose 50% of the run's earned tickets) and **Title**.
9. Tier scaling applied everywhere: enemy HP/dmg (`tiers.js`), drop gun level = tier, crafted level = tier, shop level = tier, rewards × rewardMult.
10. Wave mode starting loadout: Common MG level = 1 (always; it's a joke weapon at high tiers), 240 bullets, 3 unlocked slots, the Lv1 perks. Skills and inventory persist across modes within the session.
11. Debug panel "Waves" folder:
    - Start wave N; skip to intermission; end intermission.
    - Win now / Lose now.
    - Set tier (1–10).
    - Give tickets.
    - Spawn-queue readout.
    - Toggle "no spawns".
12. Tests: `waves.test.js` and `shop.test.js` (§9).

**Acceptance criteria:**
- A full run from the title: Wave Mode T1.
  - Wave 1: 8 enemies in 3 groups, with the counter going down.
  - Then a 15 s intermission: shop works, Enter skips, boxes glow.
  - Wave 2: 14 enemies including 2 elites, then Mega Sproto.
  - Wave 3: 20 enemies including 4 elites, then Mega + Hex together.
  - Then the victory screen with the Legendary pedestal.
- Next Tier starts T2. Enemies have ~15% more HP (debug readout) and drops are level 2.
- Dying shows the summary. Retry restarts T2 wave 1 with skills kept.
- Buying the 4th slot unlocks key 4. Vending gives a random gun or resources.

**Debug verify:** skip waves, win/lose now, set tier, tickets.

---

### M9: Balance pass, Wacky Legendaries, polish

**Goal:** fun, juicy and balanced.

**Create:** `src/data/guns/wackyPerks.js`, `scripts/ttk.js`.

**Modify:** `generator.js` (wacky roll active), `playerCombat.js`, `projectiles.js`, `kill.js` (wacky hooks), `lootCard.js`, every data balance file, vfx/sfx, `screens.js` (settings), plus the performance items in §8.

**Tasks:**
1. Wacky perks (Legendary only, defined in data, implemented with `if (gun.wacky === id)` hooks):
   - **rubberDuck** (mg/sg/sn): shots become `duckBullet` projectiles at speed 60 that bounce 3× off the ground and wall, with a squeak on bounce and yellow duck mesh visuals (sphere + cone beak). Damage ×1.1.
   - **yeetReload** (all): reloading throws the gun as a `yeetGun` projectile (arc, gravity 12, explodes on impact with splash r 4 and damage = 3 × gun damage × max(1, pellets)/1.5, gun element). A new copy "materializes" with a poof at the normal reload time. Spinning gun mesh.
   - **tenthMega** (all): every 10th shot is a `megaBullet` (5× damage, 3× size, pierce 5, big shake, "MEGA!" text). Uses `player.shotCounter`.
   - **critSproto** (all): weak-spot or crit hits spawn a mini friendly Sproto (sourceKind `'gun'`), 0.5 s internal cooldown, cap 6.
   - **confettiKill** (all): kills explode for 30% of the victim's max HP as splash r 3 (chainable, capped at 8 chain kills per tick).
   - **bigHead** (sg/sn/mg): hit enemies' weak spot radius ×1.8 for 5 s with a visibly inflated head bulb.
2. Loot card shows the wacky perk in an orange box with a joke description.
3. `scripts/ttk.js`: a node script that imports the generator, stats, damage and tiers data and prints a TTK table (seconds) for each gun type × quality × {Grunt, Tank front/back, Mega, Hex} × tier {1, 5, 10}, assuming 70% hit rate and 15% weak spot. Use it to tune toward the targets:
   - Grunt TTK with a same-tier Common MG ≈ 0.7–1.0 s.
   - Tank (flanked) ≈ 3–4 s.
   - Boss with same-tier Epic ≈ 30–45 s.
4. Balance playtests:
   - T1 full run takes 9–13 minutes for a new player.
   - A new player should win T1 about 60% of the time without debug.
   - Skill levels after one T1 win ≈ Health 5, Gunslinger 4, Magic 2–4, Crafting 2–3.
5. Polish:
   - Enemy idle bob, googly eye physics, voice blips (random pitch "hup!" on attack).
   - Kill streak text ("DOUBLE BONK", "SPROTOCALYPSE" at 5).
   - Ticket coin ka-ching.
   - Hit-direction indicators.
   - Screen-shake slider.
   - Better crosshair for each gun type (shotgun circle, sniper dot).
   - Footstep ticks.
   - Arena ring pulses with wave intensity.
   - Ambient music: a simple WebAudio sequencer loop, 4-bar bassline, toggleable.
6. Performance pass (§8): verify the instancing and pools, measure with the debug stats, and target 60 fps with 30 enemies + 300 orbs.
7. Accessibility: shake toggle, colour-blind-safe outlines for quality (shape glyph per quality: ●▲■◆★), FOV slider.

**Acceptance criteria:**
- Each wacky perk is spawnable via debug (add a "wacky" dropdown to the gun spawner) and works as described.
- The ttk script runs (`npm run ttk`) and its output matches the targets after tuning.
- A full T1 run plays without bugs or errors.
- Steady 60 fps in Chrome with the wave 3 boss fight.

---

## 6. Testing Strategy

### 6.1 Unit tests (Vitest, node environment; only pure sim/data modules)

| File | What it asserts |
|---|---|
| `architecture.test.js` | Recursively read `src/sim/**` and `src/data/**`. Fail if any file contains `from 'three'`, `Math.random`, `Date.now`, `performance.now`, `document.` or `window.`. |
| `rng.test.js` | Same seed gives the same sequence (first 1000). Different seeds diverge. `float` is in [0,1). `weighted` frequencies are within ±2% over 100k draws. `int` bounds are inclusive. |
| `determinism.test.js` | `simHarness` runs 3600 ticks of scripted commands (moving in circles, firing, spawning 10 grunts via a debug action at tick 10, casting) twice with the same seed. `JSON.stringify(state)` is identical. A different seed gives a different hash. |
| `collision.test.js` | A player outside the radius is clamped to R − r. Outward velocity is removed. Ground clamp. Box push-out. |
| `raycast.test.js` | Ray vs sphere hit/miss/inside. Ray vs capsule: side hit, cap hit, parallel miss. `raycastEnemies` picks the nearest and prefers the weak zone at equal t. Tank shield blocks a front ray before the body. |
| `gunGenerator.test.js` | (a) Same params give a deep-equal gun. (b) Forcing type does not change parts, element or jitter vs an unforced gun with the same seed (except type-dependent stats). (c) 20k random guns: type freq ≈ 60/17/17/6 (±1.5%), quality ≈ 55/27/12/5/1 (±1%). (d) Legendary always has `wacky` (after M9); non-legendary never does. (e) Gloop Labs never gives element none. (f) Part count equals quality.partSlots. (g) Level 5 damage ≈ level-1 × 1.13⁴ (±6% jitter). (h) All stats are finite and positive, and magSize is an integer ≥ 1. |
| `gunStats.test.js` | Gunslinger L10 reduces recoil by 36% and reload by 27%. Fast Hands sets swap to 0.2. Kill Frenzy 10 stacks gives fireRate ×1.4 and damage ×1.3. |
| `damage.test.js` | Use a fixed RNG stub. Body hit: base. Weak: ×critMult. Crit and weak: ×critMult×1.5. Shield zone: ×0.1. Tank splash: ×1.5. Weak affinity: ×1.5; resist: ×0.5. Minimum 1 damage. Player: DR at H10 = 27%. Shield absorbs before health. Mana Shield absorbs 60% at 1.5 dmg per mana. God mode = 0. Unkillable leaves you at 1 HP once. Downed instead of death. A kill while downed revives you at 30%. Bazooka self-damage = 35% of falloff-scaled splash. |
| `dropTables.test.js` | `rollDrops` with a fixed seed is deterministic. Over 10k Grunt kills, health orb rate is ≈ 20% ±1% and gun rate ≈ 4%. Elite doubles resource amounts. Tier 5 multiplies amounts by 1.4 (rounded). The boss table always includes a Boss Core and 2 guns. |
| `xp.test.js` | `xpToNext` values equal the §7.4 table. `addXp` handles multi-level overflow. Max level 10 caps XP. A perk is granted at its exact level. Tier XP multiplier. |
| `progression.test.js` | Synthetic events map to the right skills: a gun kill gives Health and Gunslinger; a spell kill gives Health and Magic; a Physical boss kill gives Health +200 and Gunslinger +200; a Magic boss killed by a gun gives Magic +200; a craft T3 gives Crafting +200; a healing pickup gives Health +3. The damage-taken XP cap holds. |
| `crafting.test.js` | Locked below the required level. Unaffordable fails without deducting. Success deducts exactly. Crafted quality matches the tier. Level = state.tier. The element choice is honoured. Bazooka T1 needs a Boss Core. Ammo respects the cap. A reroll is reproducible from seed + rerolls. Salvage yields match the table. `unlockAllRecipes` bypasses levels. |
| `waves.test.js` | Wave totals 8/14/20. Elite counts 0/2/4. Types per wave match the spec (W1 only grunt and spitter; W3 has all four). Boss configs: W1 none, W2 mega, W3 mega + hex. Simulating the director with instant kills reaches victory. Group triggers fire by time or alive count. |
| `shop.test.js` | Price formula. Tier scaling. Buy deducts and gives the gun. Insufficient funds fails. Upgrade ranks are capped. Selling the last gun is rejected. Sell value formula. |

### 6.2 Manual playtest checklist (run at the end of each milestone)
- **M1:** pointer lock and unlock flows (panel, Esc, click). Movement numbers. Can't escape the arena (try dash + slide-jump into the wall at all angles). MG feel: recoil, flash, tracer, numbers, sound. Pause halts the sim. FPS ≥ 60.
- **M2:** each enemy is readable (windups visible), dodgeable and fair. Shield regen timing. Second wind both outcomes. Orbs only magnetize when hurt. Confetti satisfying. 30 enemies at 60 fps.
- **M3:** each gun type feels distinct. Bazooka self-damage and rocket-jump. Scope overlay and sensitivity. Loot card correct arrows (manually compare 3 pairs). Swapping with a full inventory drops the old gun. Ammo pools independent.
- **M4:** BONK hitstop feels punchy, not laggy (spam MG weak spots: it must not stutter constantly; check the 150 ms window). Elements visible. Elites distinct. Damage log matches the expected maths for 5 sample hits.
- **M5:** XP gains feel frequent early. Banners don't overlap (queue). Every spell works and is bound correctly (Q/E/Z/X/F, no conflict with G). Tab hold shows correct stats. Mana Shield and Unkillable behave.
- **M6:** craft while being attacked (time flows). Menu closes when walking away. Pointer re-lock after the menu works in Chrome and Firefox. Costs deducted correctly. Crafting levels gate correctly.
- **M7:** every boss attack is telegraphed ≥ 0.6 s ahead. Shockwave jumpable. Orb patterns passable. Phase transitions are clear. Boss drops all appear and are collectable.
- **M8:** a full T1 run start to finish. The intermission skip works. Shop transactions. Victory, then the next tier is harder. Defeat, then the summary is accurate and retry works. Refreshing the page gives a fresh start (no persistence).
- **M9:** every wacky perk. TTK targets. Full T1 and T3 runs. Wave 3 boss fight performance. No console errors in a 20-minute session.

---

## 7. Initial Balance Tables

### 7.1 Player and movement (`data/tuning.js`)

| Param | Value |
|---|---|
| Arena radius | 30 m (player clamp 29.6) |
| Spawn points | 12 at r 28.5 |
| Weapon boxes | (±20, 0, 0), collider r 1.0, interact r 3.0 |
| Eye height | 1.6 (slide 0.9, downed 0.6) |
| Walk / Sprint | 6.5 / 9.5 m/s |
| Ground accel / friction | 60 m/s² / 10 per s |
| Air accel | 18 m/s², air max speed = current horizontal speed or walk |
| Gravity | 22 m/s² |
| Jump vel / Double jump vel | 8.0 / 7.0 m/s |
| Coyote / jump buffer | 0.10 s / 0.10 s |
| Slide | requires speed > 5. Boost to 13 m/s, decays over 0.75 s to walk, cooldown 0.4 s. Slide-jump keeps momentum. |
| Dash | 24 m/s for 0.15 s (3.6 m), cooldown 2.0 s, 0.12 s invuln. Direction = move input, or forward. |
| FOV | 90 base, sprint +6, ADS 70, sniper scope 25 |
| Max HP / Shield / Mana | 100 / 50 / 100 |
| Shield delay / regen | 3.0 s / 25 per s (Quick Shield 1.8 s / 37.5 per s) |
| Mana regen | 5/s (+1 per Magic level above 1) |
| Second wind | 10 s, revive 30% HP + full shield + 2 s invuln, downed speed ×0.3 |
| Sandbox respawn | 3 s |
| Starting ammo / caps | bullets 240/480, shells 24/64, sniper 12/36, rockets 4/12 |
| Medkit | heals 50, use time 0.8 s, carry 3 |
| Health orb / big orb / mana orb | 20 HP (or 25% max) / 60 HP + full shield / 25 mana |
| Pickup magnet | radius 4 m, accel 30 m/s², collect 0.9 m, ttl 30 s (guns 120 s) |

### 7.2 Guns

**Base stats (level 1, Common, before manufacturer, parts and jitter):**

| Stat | MG | Shotgun | Sniper | Bazooka |
|---|---|---|---|---|
| Drop weight | 60 | 17 | 17 | 6 |
| Ammo type | bullets | shells | sniper | rockets |
| damage | 9 | 8 ×9 pellets | 85 | 140 direct |
| splashDamage / radius | – | – | – | 110 / 4.0 m |
| fireRate (shots/s) | 10 | 1.2 | 0.8 | 0.6 |
| spread hip / ADS (deg) | 1.2 / 0.45 | 6.0 / 4.5 | 3.0 / 0 | 0.5 / 0.2 |
| magSize | 36 | 6 | 4 | 1 |
| reloadTime (s) | 1.8 | 2.4 | 2.6 | 2.2 |
| projectileSpeed | hitscan | hitscan | hitscan | 28 m/s |
| critMult (weak spot) | 2.0 | 2.0 | 3.0 | 1.5 |
| critChance | 0.05 | 0.03 | 0.08 | 0 |
| elementChance (if element) | 0.10 | 0.06 per pellet | 0.35 | 0.50 |
| recoil pitch / yaw (deg per shot) | 0.35 / 0.15 | 3.5 / 1.0 | 5.0 / 0.8 | 4.0 / 0.5 |
| swapTime | 0.5 | 0.5 | 0.6 | 0.7 |
| pierce | 0 | 0 | 1 | 0 |
| Self-damage | – | – | – | 35% of splash |
| Body DPS (no crit) | 90 | ~86 | 68 | ~84 + splash |

Level scaling: damage and splashDamage × 1.13^(level−1).

**Qualities:**

| Quality | Weight | dmg× | mag× | reload× | spread× | Parts | Colour | price/sell× |
|---|---|---|---|---|---|---|---|---|
| Common | 55 | 1.00 | 1.0 | 1.00 | 1.00 | 1 | #cfcfcf | 1.0 |
| Uncommon | 27 | 1.12 | 1.1 | 0.97 | 0.95 | 2 | #4cd964 | 1.6 |
| Rare | 12 | 1.27 | 1.15 | 0.94 | 0.90 | 3 | #3fa9ff | 2.6 |
| Epic | 5 | 1.45 | 1.2 | 0.90 | 0.85 | 4 | #b05cff | 4.2 |
| Legendary | 1 | 1.70 | 1.3 | 0.85 | 0.80 | 4 + wacky | #ff9f1a | 7.0 |

**Manufacturers (equal weight):**

| Id | Name | Mods | Quirk / visual |
|---|---|---|---|
| blastco | Blastco | dmg ×1.15, fireRate ×0.90, recoil ×1.2 | huge flash, chunky red `#d94a3a` |
| zippity | Zippity | fireRate ×1.20, mag ×1.25, dmg ×0.88, reload ×0.85 | neon green `#39ff88`, squeaky shot pitch +30% |
| reliable | Ol' Reliable Arms | spread ×0.70, recoil ×0.70, critMult +0.3, reload ×1.10 | brown/tan `#a8794a`, wood stock |
| gloop | Gloop Labs | elementChance ×1.5 (+0.05), dmg ×0.95, never element none | purple `#9b59ff`, goo drips |

**Parts (slot: options; the stock option has no mods):**

| Slot | Option | Mods |
|---|---|---|
| barrel | long | dmg ×1.10, spread ×0.85, projSpeed ×1.10, fireRate ×0.95 |
| barrel | short | fireRate ×1.10, spread ×1.25 |
| barrel | ported | recoil ×0.75 |
| grip | ergo | recoil ×0.80 |
| grip | quickdraw | swapTime ×0.75, reload ×0.90 |
| grip | heavy | adsSpread ×0.70, recoil ×0.90, fireRate ×0.95 |
| mag | drum | mag ×1.5, reload ×1.20 |
| mag | quick | reload ×0.75, mag ×0.85 |
| mag | spicy | elementChance +0.10 (applies only with an element) |
| scope | redDot | adsSpread ×0.80 |
| scope | longScope | zoomFov ×0.75 (more zoom), critMult +0.3 |
| scope | lucky | critChance +0.05 |

**Elements:** none 50, fire 17, shock 17, goo 16. Params per §4.6.

### 7.3 Enemies (Tier 1; HP and damage × 1.15^(tier−1))

| Type | HP | Speed | Radius/height | Attack | Damage | Cooldown/timing | Poise max | Stagger | Resist / Weak | Weak spot |
|---|---|---|---|---|---|---|---|---|---|---|
| Grunt | 60 | 5.5 | 0.5 / 1.6 | melee r 1.6 | 12 | windup 0.35, active 0.15, recover 0.6 | 30 | 0.5 s | – / – | antenna bulb |
| Spitter | 45 | 3.8 | 0.55 / 1.3 | lob, splash r 1.5 | 14 | windup 0.5, every 2.4 s | 25 | 0.6 s | goo / fire | throat sac |
| Bouncer | 50 | hop 9 h, 7 v | 0.6 sphere | stomp r 2.5 | 15 | hop every 0.7–1.3 s | 30 | 0.6 s | – / shock | spring (under) |
| Tank | 320 | 2.2, turn 70°/s | 0.9 / 2.2 | pound r 3.2 | 25 | windup 0.9, recover 1.2 | 150 | 0.8 s | fire / shock | back battery (×2.5 override) |
| Dummy | 500 (regen) | 0 | 0.5 / 1.8 | – | – | – | ∞ | – | – | head |

Tank modifiers: front shield 10% pass-through; splash ×1.5; pellets ×1.3.

**Elite modifiers:** HP ×2.5, dmg ×1.3, speed ×1.1, scale ×1.25, poise ×2, drops ×2 (resources and tickets), gun chance ×3 (cap 0.6), XP ×3, plus a random affinity (resist 1 element, weak to another).

**Bosses (Tier 1):**

| Boss | Tag | HP | Paired HP | Key damage | Rewards |
|---|---|---|---|---|---|
| Mega Sproto | Physical | 3500 | ×0.85 | charge 35 + knockback, slam ring 25, body contact 15 | 1 Boss Core, 2 big orbs, 60 tickets, 2 boss guns |
| Hex Auditor | Magic | 3000 | ×0.85 | orb 8, tax bolt 12, aura −15 mana/s | 1 Boss Core, 2 Mana Crystals, mana orbs at each 10%, 2 big orbs, 60 tickets, 2 boss guns |

### 7.4 XP

**Curve:** `xpToNext(L) = round(base × 1.45^(L−1))`.

| Skill | base | L1→2 | →3 | →4 | →5 | →6 | →7 | →8 | →9 | →10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Health | 100 | 100 | 145 | 210 | 305 | 442 | 641 | 929 | 1348 | 1954 | 6074 |
| Gunslinger | 120 | 120 | 174 | 252 | 366 | 530 | 769 | 1115 | 1617 | 2345 | 7288 |
| Magic | 80 | 80 | 116 | 168 | 244 | 354 | 513 | 744 | 1078 | 1563 | 4860 |
| Crafting | 100 | same as Health |

**XP per action** (× elite 3, × tier multiplier 1 + 0.1(t−1); bosses are already ~20× base):

| Skill | Action | XP |
|---|---|---|
| Health | any enemy kill | 10 |
| Health | per HP of damage taken | 0.2 (cap 15/s) |
| Health | health orb picked up / medkit used / big orb | 3 / 5 / 10 |
| Health | Physical boss kill | 200 |
| Health | Magic boss kill (as a regular kill) | 10 |
| Gunslinger | gun kill | 10 |
| Gunslinger | crit kill bonus / weak-spot kill bonus | +5 / +5 |
| Gunslinger | weak-spot hit | 1 (cap 10/s) |
| Gunslinger | Physical boss kill | 200 |
| Magic | cast: Goo Bolt / Chain Zap / Swarm / Mana Shield on / Meteor | 3 / 6 / 10 / 4 / 25 |
| Magic | Mana Shield absorb | 1 per 20 dmg absorbed |
| Magic | spell kill bonus (spell or swarm) | +8 |
| Magic | Magic boss kill (any weapon) | 200 |
| Crafting | gun T1 / T2 / T3 / T4 / T5 | 60 / 120 / 200 / 320 / 500 |
| Crafting | ammo / medkit / salvage / reroll | 8 / 10 / 15 / 30 |

Estimated run-1 (T1 win) totals: Health ≈ 1150 (Lv5), Gunslinger ≈ 950 (Lv5), Magic ≈ 300–500 (Lv3–4), Crafting ≈ 250–400 (Lv3).

### 7.5 Skill passives, perks and spells
- **Health:** +8% maxHp and 3% DR per level above 1.
  - Lv3 Quick Shield (delay 1.8 s, regen ×1.5).
  - Lv6 Lifesteal (2% of damage dealt heals, max 4 HP/s).
  - Lv10 Unkillable Sproto (once per wave: survive at 1 HP + 3 s invuln; sandbox resets on respawn).
- **Gunslinger:** −4% recoil and spread, −3% reload per level above 1.
  - Lv3 Fast Hands (swap 0.2 s).
  - Lv6 Deadeye (+0.5 critMult).
  - Lv8 Bottomless Mags (15% no ammo use).
  - Lv10 Kill Frenzy (max 10 stacks: +4% fireRate, +3% dmg each, 4 s window).
- **Magic:** +15 max mana, +1 regen/s, +8% spell damage per level above 1.

| Spell | Key | Unlock | Mana | CD | Effect |
|---|---|---|---|---|---|
| Goo Bolt | Q | Magic 1 | 15 | 0.6 s | proj 30 m/s, 25 dmg, splash 1.5, goo slow guaranteed |
| Chain Zap | Y | Magic 3 | 30 | 4 s | 40 dmg, range 25, 4 chains within 6 m, ×0.8 each |
| Sproto Swarm | Z | Magic 6 | 50 | 15 s | 5 allies, 8 s, 30 dmg splash r 2 each |
| Mana Shield | X | Magic 8 | 10 + 4/s | 1 s toggle | absorbs 60% of incoming at 1.5 dmg per mana |
| Meteor Bonk | T | Magic 10 | all (must be full) | 30 s | 1 s telegraph, 300 dmg splash r 6, knockback 14 |

- **Crafting unlocks:** Lv1 T1; Lv3 T2; Lv5 T3 + element choice; Lv7 T4 + part choice; Lv8 Salvage; Lv10 T5 + Reroll.

### 7.6 Drops (per kill, T1)

| Source | Scrap | Specific | Health orb | Ammo | Gun | Tickets |
|---|---|---|---|---|---|---|
| Grunt | 3–5 | (Scrap is its specific: +1–2 extra) | 20% | 35% | 4% | 1 |
| Spitter | 2–3 | Goo 2–3 | 15% | 35% | 5% | 1 |
| Bouncer | 2–3 | Springs 2–4 | 18% | 35% | 5% | 2 |
| Tank | 5–8 | Plating 3–5 | 25% | 50% | 10% | 4 |
| Mega Sproto | 25 | Boss Core 1 | 2 big orbs | 100% ×3 | 2 guns (boss table) | 60 |
| Hex Auditor | 20 | Boss Core 1, Mana Crystal 2, mana orbs | 2 big orbs | 100% ×3 | 2 guns (boss table) | 60 |

Elites: amounts ×2, gun ×3 (cap 0.6), 50% quality +1. Tier: amounts × (1 + 0.1(t−1)).

**Quality tables:**

| Table | C | U | R | E | L |
|---|---|---|---|---|---|
| enemyGun | 55 | 27 | 12 | 5 | 1 |
| boss | 0 | 0 | 40 | 35 | 25 |
| shop | 35 | 35 | 20 | 9 | 1 |
| vending (gun outcome) | 40 | 30 | 18 | 9 | 3 |

The type table is always 60/17/17/6.

### 7.7 Recipes
Columns are Scrap / Springs / Goo / Plating / Boss Core.

| Type | T1 (Common) | T2 (Uncommon) | T3 (Rare, element) | T4 (Epic, part) | T5 (Legendary, wacky) |
|---|---|---|---|---|---|
| MG | 20 | 40 / 10 | 60 / 20 / 10 | 100 / 30 / – / 15 | 150 / 40 / – / – / 2 |
| Shotgun | 30 / – / 5 | 55 / 12 / 5 | 80 / 20 / 15 | 125 / 30 / – / 20 | 180 / 45 / – / – / 2 |
| Sniper | 30 / 5 | 55 / 15 | 80 / 25 / 10 | 125 / 35 / – / 20 | 180 / 50 / – / – / 2 |
| Bazooka | 40 / – / – / 5 / 1 | 70 / 15 / – / 8 / 1 | 100 / 20 / 15 / 10 / 1 | 150 / 35 / – / 25 / 1 | 220 / 50 / – / 30 / 3 |

- **Arcane Infusion** (T3+): +1 Mana Crystal for elementChance +0.2 and proc potency ×1.5.
- **Craft time:** guns 1.5 s; ammo 0.5 s; medkit 0.8 s.
- **Ammo:** bullets ×45 = 5 Scrap; shells ×8 = 8 Scrap; sniper ×5 = 10 Scrap; rockets ×2 = 15 Scrap + 2 Plating.
- **Medkit:** 10 Scrap + 5 Goo.
- **Salvage yield:** Scrap = 5 + 6·qIdx + level; Springs = 2·qIdx; Goo = 3 if element; Plating = 5 if Epic or Legendary; Bazooka ×1.5.
- **Reroll:** 40 Scrap + 10 Goo (+1 Mana Crystal for Legendary).

### 7.8 Waves (data/waves.js)

**Wave 1** (8, no elites, clearTickets 20, maxAlive 8):

| Group | at | aliveBelow | Pattern | Spawns |
|---|---|---|---|---|
| G1 | 0 s | – | spread | 3 grunt |
| G2 | 8 s | 1 | cluster | 2 grunt + 1 spitter |
| G3 | 16 s | 2 | spread | 2 spitter |

**Wave 2** (14, 2 elites, clearTickets 35, maxAlive 10, boss megaSproto when alive = 0, intro 3 s):

| Group | at | aliveBelow | Pattern | Spawns |
|---|---|---|---|---|
| G1 | 0 s | – | spread | 3 grunt + 1 spitter |
| G2 | 10 s | 2 | spread | 2 bouncer + 1 spitter + 1 grunt |
| G3 | 20 s | 2 | cluster | 1 tank + 2 grunt |
| G4 | 30 s | 2 | spread | 1 tank (elite) + 1 bouncer + 1 spitter (elite) |

**Wave 3** (20, 4 elites, clearTickets 50, maxAlive 12, boss [megaSproto, hexAuditor] paired when alive = 0):

| Group | at | aliveBelow | Pattern | Spawns |
|---|---|---|---|---|
| G1 | 0 s | – | spread | 3 grunt + 2 spitter |
| G2 | 10 s | 3 | spread | 3 bouncer + 1 grunt (elite) + 1 tank |
| G3 | 22 s | 3 | cluster | 1 tank (elite) + 2 spitter + 2 bouncer |
| G4 | 34 s | 3 | spread | 3 grunt (1 elite) + 1 spitter (elite) + 1 tank |

Intermission: 15 s, after waves 1 and 2.

### 7.9 Economy and shop
**Tickets in:**
- Kills per §7.6.
- Wave clears 20 / 35 / 50.
- Bosses 60 each.
- Victory 150.
- Selling guns.
- Everything above × rewardMult(t) = 1 + 0.1(t−1).

**Prices:**
- Gun offers: `base[type] × quality.priceMult × (1 + 0.15(t−1))`. Bases: MG 25, Shotgun 45, Sniper 45, Bazooka 90.
  - Examples at T1: Rare SG = 117, Epic BZ = 378.
- 4 offers per intermission. Reroll 10 (+5 each).
- Vending pull: 35. Outcomes: 55% gun (vending table), 30% resource bundle (20 scrap + 8 random specific), 10% 60 tickets back (jackpot!), 5% "Rubber Chicken" (joke: 1 HP heal, squeak). Pure fun.
- Upgrades:
  - Ammo Cap +25% per rank: 3 ranks at 40 / 80 / 120.
  - Shield Cap +25 per rank: 3 ranks at 50 / 100 / 150.
  - 4th Gun Slot: 100, one time.
- Supplies: Ammo refill (all pools to cap) 30; Medkit 20.
- Sell value = `round(8 × quality.sellMult × typePremium × (1 + 0.1(level−1)))`. typePremium: MG 1, SG 1.5, SN 1.5, BZ 2.5.
- Estimated T1 full-run income ≈ 450–550 tickets.

### 7.10 Tier scaling (`data/tiers.js`)

| Tier | Enemy HP/dmg × | Gun level | Reward × | Shop price × |
|---|---|---|---|---|
| 1 | 1.00 | 1 | 1.0 | 1.00 |
| 2 | 1.15 | 2 | 1.1 | 1.15 |
| 3 | 1.32 | 3 | 1.2 | 1.30 |
| 4 | 1.52 | 4 | 1.3 | 1.45 |
| 5 | 1.75 | 5 | 1.4 | 1.60 |
| 6 | 2.01 | 6 | 1.5 | 1.75 |
| 7 | 2.31 | 7 | 1.6 | 1.90 |
| 8 | 2.66 | 8 | 1.7 | 2.05 |
| 9 | 3.06 | 9 | 1.8 | 2.20 |
| 10 | 3.52 | 10 | 1.9 | 2.35 |

Gun damage per level is ×1.13, so a same-tier gun at T10 = ×3.00 vs enemies ×3.52. The gap is closed by quality and skills, which is intentional.

---

## 8. Performance Notes

**Target entity counts:**
- ≤ 40 enemies alive (waves cap 12; the debug stress test is 40).
- ≤ 400 projectiles (Hex orbs dominate), ≤ 200 pickups, 1500 confetti particles, 48 damage numbers, 64 tracers, 12 allies.
- Frame budget: sim ≤ 2 ms per tick, render ≤ 8 ms.

**Rendering:**
- Use an `InstancedMesh` per projectile visual kind: orb 400, spit 64, gooBolt 32, duck 64, megaBullet 16. Rockets and yeetGuns use small pools of regular meshes (16).
- Pickups: one InstancedMesh per kind (health, bigHealth, mana, ammo×4 colours via instanceColor, resource×6, coin), 128 each. Gun pickups use real meshes from a pool of 16, each with a beam.
- Confetti: a single InstancedMesh with `instanceColor`. CPU-updated typed arrays; mark `instanceMatrix.needsUpdate` once per frame. Particle state lives in typed arrays (position, velocity, life), not objects.
- Shared geometries and materials (`geometries.js`, `materials.js`). Never create a material per enemy. Hit flash uses `onBeforeCompile` uniforms, or swaps to a shared white-emissive material for 60 ms.
- No real-time shadows. Use **blob shadows**: an instanced dark transparent disc under every entity. Antialias on, pixel ratio capped at `min(devicePixelRatio, 1.5)`.
- Target < 150 draw calls (show in debug stats via `renderer.info`).
- `viewSync` keeps `Map<id, view>`. Each frame it marks seen ids and releases unseen views back to per-type pools (no dispose/realloc churn).

**DOM UI:**
- Damage numbers: a pooled set of 48 absolutely positioned divs moved with `transform: translate3d`. When the pool is exhausted, recycle the oldest.
- The HUD writes `textContent` or style only when values change (cache the last values).
- Avoid layout reads in the frame loop.

**Sim:**
- Avoid allocations in hot loops. Raycast and steering use module-level scratch vectors.
- Arrays are compacted in `cleanup` with swap-remove (order-independent, deterministic, since order derives only from sim operations).
- Enemy separation is O(n²) for n ≤ 40 (1600 checks, trivial). Add a uniform grid in `overlap.js` only if profiling shows a need.
- Projectiles vs enemies: broadphase each projectile vs each enemy bounding sphere (400 × 40 = 16k cheap checks). Enemy projectiles test only vs players.

**Audio:**
- Throttle: at most 4 instances of the same SFX per 50 ms. Master compressor (`DynamicsCompressorNode`) to avoid clipping. Nodes are created per sound (cheap) and disconnected on end.

**Pools:** `core/pool.js` (`acquire`/`release`) for presentation objects. Sim entities are plain objects created per spawn. That is fine at these counts; sim-side pooling is not worth the determinism risk.

---

## 9. Multiplayer-Readiness Hooks (brief)
- `simulate(state, commandsByPlayerId, dt)` is pure and deterministic-ish (seeded `state.rng`, no wall clock, fixed dt). `state.players` is a map and every system loops over players. Enemy targeting already picks the "nearest player".
- All UI and debug interactions are **commands/actions**, so they serialize over the network unchanged. Shop, crafting and pickup are already per-player (`playerId` on actions and craft jobs).
- State is pure JSON: snapshots and deltas are straightforward. Entity ids come from `state.nextId` (authority assigns them).
- Presentation is driven by events with entity ids and positions. A remote client can rebuild the same feedback from replicated events.
- Client-only concerns are already separated: hitstop, camera shake, live look, damage numbers.
- Future model: host-authoritative with client-side prediction of the local player's movement only (`playerMovement` is self-contained and re-runnable). Floating-point cross-browser determinism is **not** relied on.
- Loot: drops currently spawn as shared pickups. A future `pickup.ownerId` field enables instanced loot.
- Later items (not planned here): hub, login, saves (state is JSON, and per-player progression lives in `player.skills`/`resources`, which is easy to persist), and real Sprotos art (views are isolated in `render/views/*`; swap meshes for glTF without touching the sim).

---

## 10. Risks and Open Questions

### 10.1 Risks and mitigations
1. **Ctrl+W closes the tab.** Default slide is C, Ctrl is a secondary binding with a warning. Optionally, call `navigator.keyboard.lock()` in fullscreen on Chromium to capture Ctrl+W. A "Fullscreen (recommended)" button can do this.
2. **The Alt key** can steal focus on some OS/browser combos. Use `preventDefault` and offer V as the fallback.
3. **Pointer Lock re-request cooldown** (Chrome rejects re-lock for about 1 s after an Esc exit). Handle the promise rejection and show "Click to resume". Menus use `expectUnlock` so they are not mistaken for a pause.
4. **Hitstop vs fixed tick:** constant BONK spam could feel stuttery. Mitigate with the 150 ms window, a 200 ms cap and a settings toggle.
5. **Hex bullet-hell in first person** may feel unfair because you can't see orbs behind you. Keep orbs slow (≤ 10 m/s), big and glowing, add a spawn sound cue, and never aim patterns at the player's back. Off-screen orbs within 4 m show edge arrows.
6. **Scope creep** (9 milestones, many systems). Keep each milestone shippable and resist adding systems not listed.
7. **Balance with use-based XP:** players who never cast will never level Magic. That is intended. Make sure Goo Bolt is fun and cheap at Lv1 so players try it.
8. **Damage numbers in the DOM** may thrash under shotgun spam (9 pellets). Merge pellet hits on the same target in the same tick into one number (sum, flagged as "x9").
9. **Determinism drift:** using `Math.random` or iterating object keys in the sim breaks it. The architecture test catches the former. Always iterate arrays in the sim, never `for…in` over id maps for gameplay order (exception: `players`, iterated by sorted id).
10. **Crafting menu while under attack** could frustrate players. The intermission is the safe crafting window (boxes glow), and mid-combat crafting is a risk/reward choice by design.

### 10.2 Open questions (each with the default I recommend)
1. **"Slots" shop upgrade vs "4 slots, any mix".** Default: wave mode starts with 3 unlocked slots and the 4th costs 100 tickets; sandbox has 4. Flip it with `tuning.startingGunSlots = 4`. If you set 4, replace the shop item with "+1 Medkit capacity".
2. **Penalty on defeat/retry.** Default: keep everything except 50% of the tickets earned that run.
3. **Do skills, guns and resources persist from Sandbox into Wave Mode in the same session?** Default: yes (one player state per page session). Debug-granted progress therefore carries over, which is fine for a sandbox build.
4. **Mana Crystal usage.** Default: optional Arcane Infusion at T3+ (+1 crystal) and the Legendary reroll surcharge. The element choice itself is free at T3+, so wave 3's crystals are not a hard gate.
5. **Crits vs weak spots.** Default: weak spot = ×critMult ("BONK"); a separate random crit (critChance, ×1.5) can stack. Simpler alternative: crit = weak-spot only.
6. **Can downed players shoot?** Default: yes, with movement ×0.3 (Borderlands-style), no spells.
7. **Meteor Bonk friendly fire / self-damage.** Default: none.
8. **Victory at Tier 10.** Default: "SPROTO SUPREME" screen; replay T10 is allowed. No T11.
9. **Sniper hip-fire spread** of 3° may feel bad. Tune in M9.
10. **Music.** Default: a minimal synth loop in M9, off by default if it is annoying.

---

### Critical Files for Implementation
- `/home/user/sproto-shooter/src/sim/simulate.js`: system order and the pure sim entry point every other system plugs into.
- `/home/user/sproto-shooter/src/core/loop.js`: fixed 60 Hz timestep, interpolation alpha, hitstop and pause.
- `/home/user/sproto-shooter/src/sim/combat/damage.js`: the damage pipeline every weapon, spell, element, perk and boss routes through.
- `/home/user/sproto-shooter/src/sim/guns/generator.js`: seeded, reproducible gun generation (with fixed RNG draw order) used by drops, crafting, the shop and debug.
- `/home/user/sproto-shooter/src/sim/systems/progression.js`: event-driven, use-based XP and automatic perk unlocks for all four skills.
