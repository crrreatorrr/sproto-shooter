# Sproto Shooter: Gameplay, Game Feel, VFX and Audio Plan (half 2 of 2)

Scope: what the player feels, sees and hears, plus gameplay depth. Rendering architecture, the asset pipeline and performance belong to the other half. I only note what my features need from it (§9).

## 0. What I verified in the code (read this before starting)

- **Event bus.** `src/sim/events.js` defines `emit(state, type, payload)`. About 70 event types exist today. Presentation listens in four places: `src/render/renderer.js` (about lines 519–574), `src/audio/sfx.js` (`bus.on('*')` into a `SFX` map), `src/ui/ui.js` (lines 86–169) and `src/game/Game.js` `wireFeel()`, which handles hitstop.
- **Payloads that already exist:** `damage` {amount, element, isCrit, isWeak, zone, pos, sourceKind, killed, pellet}, `kill` {victimType, elite, bossTag, element, wasCrit, wasWeak, pos, tier, summoned}, `playerDamaged` {dir (atan2 angle), toShield, toHealth}, `shot` {gunType, manufacturer, element, mega}, `reloadStart` {time}, `tracer` {from, to, element, gunType, zap, mega}, `bossTelegraph` {kind: charge|volley|slam}, `bossCast`, `enemyAttack`, `enemyShot`, `land` {speed}.
- **Dead enemies are removed one tick after they die** (`src/sim/world.js:235`, `deadT`). The renderer then drops the view in `releaseUnseen()`. Today death is "scale to 0.01 plus confetti". Any death animation therefore has to live entirely on the presentation side (a corpse system).
- **`instantiateCharacter`** in `src/render/assets.js:167` exposes `play(k, {fade, once, speed, restart})`, `has`, `setSpeed`, `update`, `setFlash` and `setTint`. Clips present: idle, run, cast, castBig, hit, defeat, stun, jump, victory, strafeL, strafeR. `hit` and `defeat` are never used today. Strafe clips are never used either, even though Obama strafes.
- **The viewmodel** is a single sine/lerp block inside `render()` (around lines 676–696). Kick is a linear decay. Reload is a sine wobble. There are no shells. The muzzle flash is one sphere. Tracers are 1 px `LineSegments`, which are invisible at 1440p.
- **Hitstop** is in `Game.js:59–65`: weak gun hits over 40 damage get 45 ms, weak kills 60, `bossPhase` 120, `bossDefeated` 200, meteor 90. The cap is 200 ms.
- **Bug:** the Spawn folder in the debug GUI defaults to `enemy: 'grunt'`, which does not exist (`Game.js` `buildDebug`). Fix it to `'midget'` in M0.
- **Audio in sproto-duel is placeholder only.** `/home/user/crrreatorrr/sproto-duel/public/assets/audio/` contains only `placeholder/*.wav` (57 files, 3.5 MB), and all of them are synthesized by `scripts/gen-placeholder-audio.mjs`. No real recordings exist in either repo. So "move to real SFX" means:
  - (a) build a sample-based engine now,
  - (b) reuse the sproto-duel placeholder wavs where they fit,
  - (c) bake our own synth recipes into wavs as interim files,
  - (d) give the owner a list of real files to source.
- **sproto-duel ambient particles per stage** are in `src/arena/themes.ts`. They exist for all four of our stages:

  | Stage | Ambient kind | Rate | Colours |
  |---|---|---|---|
  | city | `vape` | 7 | pink / teal |
  | volcano | `embers` | 40 | |
  | glacier | `snow` | 48 | |
  | void | `motes` | 30 | violet / green |

  The emitter code is `src/arena/Arena.ts` lines 323–340 (setup) and 1222–1305 (`emitAmbient`).
- **Architecture test:** `tests/units.test.js:18` bans `three`, `window.`, `document.`, `Math.random`, `Date.now` and `performance.now` in `src/sim` and `src/data`. Presentation-only definitions (VFX recipes, the audio manifest) must therefore live under `src/render/` and `src/audio/`. Gameplay data (affixes, hazards, director, balance) goes in `src/data/`.

---

## 1. Vision and quality bar

**Vision:** Borderlands energy with Sproto Duel absurdity.
- Every trigger pull has weight. Every hit is unmistakable. Every kill is a small cartoon payoff: midgets get launched, Obamas burst into bitcoin piñatas, flyers lose their propellers.
- Legendary drops are an event: a beam, a sting, slow motion.
- Bosses are staged fights with intros, telegraphs, arena hazards and transformation beats.

**Measurable targets (Codex checks these per milestone):**

| Area | Target |
|---|---|
| Frame budget | 60 fps at 1080p on a mid GPU (GTX 1660 / M1) with 40 enemies, 2 bosses and full VFX. VFX CPU update ≤ 2.0 ms/frame. VFX draw calls ≤ 15. Show these with the `?debug=1` stats overlay. |
| Feedback latency | Muzzle flash, viewmodel kick and gunshot audio start in the same rendered frame as the `shot` event, and the hitmarker in the same frame as `damage`. 0 frames late. |
| Feedback coverage | Every sim event type has at least one presentation handler (audio, VFX or UI). A test enforces this (M0). |
| Hit clarity | 100% of player damage events show a hitmarker. Weak, crit, shield, kill and normal hits are visually and audibly distinct (5 variants). |
| Telegraphs | Every enemy attack that deals ≥ 8 damage has a telegraph of ≥ 0.4 s (enemies) or ≥ 0.6 s (bosses), shown both visually and as spatial audio. Colour language: **red = danger zone, yellow = weak spot, purple = magic, cyan = shock, green = goo, orange = fire/legendary**. |
| Audio | Max 32 voices. Gunshots use ≥ 3 round-robin variants plus ±6% pitch, so no two consecutive shots are identical. Master peaks stay below −1 dBFS (compressor plus limiter). Enemy telegraph sounds are spatial (HRTF). |
| Loading | VFX textures are procedural canvases, 0 downloads. Boot audio (UI plus the player's core gun sounds) ≤ 400 KB. Stage music and enemy sounds load per level through the existing `assets.js` queue. |
| Fight pacing | Regular enemy TTK and boss fight length stay inside the bands in §3.6, enforced by a test. |
| Determinism | `npm test` stays green. The sim stays pure. Presentation randomness only uses `Math.random` outside `src/sim` and `src/data`. |

---

## 2. Game-feel overhaul

### 2.1 Viewmodel and gun feel (visual only; sim mechanics untouched)

**New module `src/render/viewmodel.js`**, extracted from `renderer.js`. Export `createViewmodel({ camera, bus, fx, audio })` returning `{ update(fdt, p, look, gun), muzzleWorldPos(out), ejectWorldPos(out) }`.

**Spring model** (`src/render/feel/spring.js`, pure, no three, unit-testable):
```js
// critically/under-damped spring, semi-implicit Euler, stable for dt<=1/30
export function makeSpring(freqHz, zeta) { return { x: 0, v: 0, k: (2*Math.PI*freqHz)**2, c: 2*zeta*2*Math.PI*freqHz }; }
export function stepSpring(s, target, dt) { s.v += (-(s.x - target) * s.k - s.v * s.c) * dt; s.x += s.v * dt; return s.x; }
export function impulse(s, dv) { s.v += dv; }
```
- Use 6 springs: posX, posY, posZ (kick back), rotPitch, rotYaw, rotRoll.
- Sub-step at a fixed 1/120 s inside `update` so behaviour does not depend on frame rate.

**Per-type recoil profile.** Put it in `src/render/feel/gunFeel.js` as plain objects, which can be tuned live in lil-gui:

| Type | Kick back (m/s impulse) | Pitch (°/s impulse) | Roll jitter (°) | Spring f / ζ | Extra action |
|---|---|---|---|---|---|
| mg | 0.6 | 40 | ±0.8 random | 14 Hz / 0.55 | Shell every shot |
| shotgun | 2.8 | 320 | ±2 | 7 Hz / 0.45 | Pump animation 0.18 s after the shot (0.35 s long); shell ejected at pump |
| sniper | 3.5 | 420 | ±1 | 6 Hz / 0.5 | Bolt cycle 0.30 s after the shot (0.45 s long); casing at bolt-back |
| bazooka | 4.0 | 200 (plus 0.04 m up) | 0 | 4.5 Hz / 0.6 | Backblast smoke puff 1.2 m behind the camera, visible at screen edges |

Manufacturer multipliers:
- **blastco:** kick ×1.3, larger flash.
- **zippity:** kick ×0.8, freq ×1.2.
- **reliable:** kick ×0.7, ζ 0.75.
- **gloop:** ζ 0.3 plus a jelly scale wobble (scale spring 9 Hz / 0.25, impulse 0.04 per shot).

`ev.mega` (Every Tenth): ×3 kick plus a white flash.

**Hard rule: no extra camera rotation from gun feel.** The camera keeps using `look + p.recoil` from the sim, which is the gun mechanic. Visual kick goes only to the viewmodel, the FOV punch (already there) and trauma shake. Otherwise the crosshair and the sim aim drift apart.

**Sway, bob, idle and poses:**
- **Sway:** viewmodel lag. Feed mouse delta (`look.yaw − lastYaw`) as a target into the posX and rotYaw springs (6 Hz / 0.7), clamped to ±0.04 m and ±4°. ADS scales sway ×0.25.
- **Bob:** a figure-eight Lissajous at step frequency `speed × 0.9` Hz with amplitude 6 mm × (speed/6.5). Sprint switches to the sprint pose and doubles the amplitude. Landing sends an impulse to posY equal to −`land.speed` × 0.012.
- **Idle breathing:** 0.25 Hz, 2 mm.
- **Poses** (target offsets blended with an exponential lerp at rate 12/s):
  - `hip` (0.17, −0.15, −0.42)
  - `ads` (0, −0.1 or a per-type sight offset, −0.32)
  - `sprint` (0.12, −0.22, −0.38, with yaw +25° and roll −10°)
  - `slide` (roll +15°, y −0.03)
  - `downed` (y −0.2, roll 30°)
  - `swap` (y −0.35)
- **ADS:** sniper does a 0.12 s scope-in move (gun to centre, then the overlay fades in; the viewmodel is hidden once the overlay is fully on). Other guns get a glowing red-dot reticle on the `redDot` part.

**Reload animations** are keyframed procedural poses. Each one is normalized 0..1 and scaled to `reloadStart.time` (the sim's value, so it always matches). Store them as arrays of `{t, pos:[x,y,z], rot:[p,y,r], ease, cue}` in `src/render/feel/reloadAnims.js`. `cue` fires a VFX or audio callback (mag drop, click).

- **mg:** 0–0.15 roll right 25° and tilt down; at 0.20 mag-out cue (spawn a physical mag mesh that drops to the floor in world space, despawns after 3 s); 0.45–0.6 new mag rises from below; 0.70 slap cue (impulse posY +0.4); 0.85 charging-handle cue; 1.0 back to hip.
- **shotgun:** roll left 20° and raise. Show N = `magSize − ammoInMag` shell inserts evenly spread over 0.15–0.85, each with a thumb-push impulse and an `insert` click. Pump cue at 0.92.
- **sniper:** 0.1 bolt up and back (cue), 0.3 mag out, 0.55 mag in, 0.8 bolt forward (cue), 0.9 settle.
- **bazooka:** drop off-screen by 0.3 (y −0.5), rocket slides in from lower-left with a thunk cue at 0.6, shoulder back up with an overshoot spring.
- **Yeet Reload legendary:** the gun is already thrown as a sim projectile. The viewmodel plays a throw swing, then the new gun materializes from below with a sparkle burst.

**Swap:** 0.25 s down (ease-in), model swap, 0.25 s up with an overshoot impulse. Driven by `swap` and `gunPickedUp`.

**Shell ejection (`src/render/vfx/shells.js`):**
- One InstancedMesh per casing shape, cap 64.
- Spawned at the viewmodel `eject` socket in world space. Velocity is right 2.5 m/s, up 1.5, back 0.5, ±20% random, spin 20 rad/s.
- Gravity 22. One ground bounce at y = 0 (restitution 0.35), plus a `shellTink` sound throttled to 4/s. Life 2.0 s, then shrink.
- Colours: brass (mg, sniper), red plastic (shotgun).

**Muzzle flash by manufacturer** (`fxdefs.js` entries `muzzle_<manufacturer>`). Every flash has three layers:
1. Core star billboard with random roll.
2. Side "petals": two crossed quads along the barrel.
3. Smoke wisp: one soft particle that rises.

Plus a viewmodel point-light flash (intensity 6, 40 ms).

| Manufacturer | Shape | Colour (tinted by element when not 'none') | Life |
|---|---|---|---|
| blastco | Big 4-prong star, scale 1.6, heavy smoke | Orange-red `#ff6a2a` | 50 ms |
| zippity | Small ring burst plus streak, flickers 50/50 per frame | Lime-white `#c8ffd8` | 33 ms |
| reliable | Clean cone flash, light smoke | Warm white `#fff1c2` | 40 ms |
| gloop | Bubble cluster (port `bubbleTextures()` from sproto-duel `src/fx/MuzzleFx.ts:41`) | Element colour | 70 ms |

**Tracers:** replace the `LineSegments` with camera-facing ribbon quads (`src/render/vfx/ribbons.js`, an instanced quad per segment with a soft additive gradient).
- Widths: mg 0.025 m, shotgun pellets 0.015, sniper 0.06 with a 0.4 s smoke trail (normal-blend grey ribbon fading out), bazooka none (the rocket has a particle trail).
- Speed illusion: render the tracer as a 4 m streak that travels from muzzle to hit over `dist / 400` s (sniper `dist / 900`), not a full-length line.
- `zap` tracers use the jagged beam material (port `beamMaterial()` from sproto-duel `src/fx/SpellFx.ts:57`), rebuilt every 50 ms.

### 2.2 Impacts, per surface and per target

**Surface** (the sim emits `impact` when a ray hits the ground). The surface type is the stage, from `stageFor(state)`:

| Stage | Particles | Decal |
|---|---|---|
| city | Grey asphalt chips plus a dust puff | Dark scuff |
| volcano | Black ash plus 3 orange embers | Glowing scorch that fades to dark |
| glacier | White snow puff plus ice glints | Pale chip |
| void | Green sparkle motes | Glowing rune dot that fades |

**Enemy hit** (`damage` with zone `body`): a cartoon star spark in the element colour (6 sparks, 0.15 s) plus a hit flash (already done via `setTint`).
- Shotgun pellets merge into one bigger spark per target per tick. Group by `targetId` within the same tick.

**Weak spot (`isWeak`):** yellow star burst (12 sparks), 3 orbiting cartoon "stars" for 0.4 s, and a world-space comic text pop "BONK!".
- The text is a pooled canvas-texture sprite, 0.5 s, scale-pop 0→1.3→1.
- Random variants: "BONK!", "BOINK!", "CONK!", plus "BONKERS!" when the hit kills.

**Shield zone (Big Obama):** blue hex ripple on the shield plate (fresnel shader pulse, 0.25 s), a ricochet spark flying off at a reflected angle, and a "tink" sound.

**Boss body:** ×1.5 particle counts plus a small dust shake on the boss. On an invulnerable boss (`b.invuln`, during transition or teleport), show a grey "IMMUNE" spark and a dull thud.

### 2.3 Hit feedback

**Hitmarker** (`src/ui/hitmarker.js`, CSS):

| Kind | Look | Size / life | Sound |
|---|---|---|---|
| normal | White X | 18 px, 90 ms | `hitTick` |
| crit | Yellow X, thicker | 22 px | |
| weak | Yellow X plus a ring | 26 px | `bonk` |
| shield | Blue small X | | `tink` |
| kill | Red X expanding | 30 px, 220 ms | Layered `killConfirm` (pitched up for elites, a cash-register "ka-ching" for Obamas) |

**Damage numbers** (rewrite `updateNums` in `ui.js` into `src/ui/damageNumbers.js`):
- DOM pool of 48 nodes. Only `transform` and `opacity` are touched.
- World anchor goes through `project()`.
- Motion: initial velocity up 2.2 m/s plus random lateral ±1, gravity 4 (Borderlands arc). Scale pop 1.6→1.0 over 0.12 s. Life 0.9 s, fading over the last 0.3 s.
- Crits are 1.5× size, yellow, with a small "CRITICAL" label. Weak hits are orange with "BONK". Element numbers use the element colour with a tiny icon.
- Merge rule: hits on the same target within 0.25 s update one stacking number with a bump scale (pellets already merge; extend this to MG streams). Write the merge logic as a pure function `mergeNumber(list, ev, now)` so it can be tested.

**Hitstop table** (replace `wireFeel()` with `src/game/feel.js`, data in `src/render/feel/hitstop.js`):

| Trigger | ms |
|---|---|
| Weak-spot hit, sniper or shotgun, ≥ 40 damage | 45 |
| Weak-spot kill (any gun except mg) | 60 |
| mg weak kill | 0 (never; it fires 10/s) |
| Elite kill | 50 |
| Big Obama battery kill | 70 |
| Player shield broken | 40 |
| Boss phase | 120 |
| Meteor impact | 90 |
| Boss defeated | 200, then slow-mo (below) |

- Rate limit: at most 3 hitstops per 1 s window, and ≥ 150 ms apart.
- **Slow-mo** (new, client-side like hitstop): `game.presentScale` multiplies the sim accumulator. Boss defeated: 0.25× for 1.2 s, eased back over 0.4 s. Legendary drop: 0.5× for 0.35 s.
- Gated by `settings.hitstop`. Document it as disabled in a future multiplayer build.

### 2.4 Enemy reactions and wacky deaths

**Hit reactions** (`src/render/characterFx.js`):
- Add `flinch(dirX, dirZ, amount)` to the `instantiateCharacter` return in `assets.js`. After `mixer.update`, add a spring-driven rotation to the `Spine`/`Spine01` bone, away from the hit direction (max 18°, spring 10 Hz / 0.4). Bone names follow sproto-duel's 24-joint rig; look them up once by name and cache them.
- Small hits (< 15% max HP): flinch only. Amount = clamp(dmg / maxHp × 4, 0.15, 1).
- Big hits (≥ 25% max HP), or the sim's `stagger` event: play the `hit` clip once (fade 0.06, speed 1.4), then return to the state-driven clip. Use the 0.35 s hit hold from sproto-duel `src/wizard/Animator.ts` (HIT hold constants around line 59).
- `stagger` state: keep the `stun` clip and add 3 cartoon stars circling the head.
- Knockback squash: on a big hit, scale-pop the root to (1.12, 0.88, 1.12) and spring back (12 Hz / 0.35).
- **Head look-at:** port the look-at chain from `Animator.ts` (chest, neck and head turn toward the target). Enemies track the player's head with their eyes, which reads as menacing and funny.
- **Obama strafe clips:** when the velocity is mostly sideways relative to facing, play `strafeL` / `strafeR` (ported loco blend, `Animator.ts` "LOCO" section).
- **Cast timing:** align Obama's `cast` release (~0.45 s, `RIG_CAST_PEAKS` in the sproto-duel manifest) with the burst. Start the clip `windup − 0.45` s before the first bullet, using the new `enemyTelegraph` event (§3.1).

**Death / corpse system** (`src/render/corpses.js`):
- On a `kill` event, mark `pendingCorpse[victimId] = ev`. In `releaseUnseen()`, a view with a pending corpse moves into `corpses[]` instead of being disposed.
- Cap 24 corpses. Past the cap, the oldest poofs immediately.
- Each corpse runs a physics-light integrator: pos/vel with gravity 22, a ground plane, restitution 0.3 and angular velocity. It also gets a scripted "death recipe".
- The sim adds fields to `kill` (§3.1): `dir`, `overkill`, `yaw`, `scale`, `stage`, `gunType`, `affixes`.

| Victim | Death recipe (wacky, no gore) |
|---|---|
| midget | **Launch:** vel = dir × (5 + 4 × overkill) + up 5, spin 8 rad/s, `defeat` clip once at 1.5× speed. On first ground contact (or at 0.8 s): squash to (1.4, 0.3, 1.4) over 0.08 s, then a confetti puff, 3 spring coils (`springBoing`), and a "boing" sound. |
| flyingMidget | The propeller beanie detaches and flies straight up spinning (2 s, fades). The body spirals down trailing smoke and crashes with a dust ring and confetti. |
| obama | **Bitcoin piñata:** `defeat` clip for 0.45 s, then he bursts into 24 (elite 48) spinning gold bitcoin coins (instanced, bounce twice, fade at 2.5 s; decoration, not pickups), plus a "ka-ching" and a coin cascade sound. |
| bigObama | **Battery overload:** 0.6 s violent shake with cyan sparks from the back battery, white flash, then an explosion ring (cyan) and 60 coins. The shield plate clatters away as its own physics prop. |
| Boss | See §3.4 (finale). |
| Element: fire kill | Tint to charcoal over 0.2 s, then crumble into ash particles plus an ember pop (replaces the recipe's final burst). |
| Element: shock kill | 0.25 s x-ray flicker (emissive cyan strobe at 30 Hz) plus arcs, then the recipe. |
| Element: goo kill | Melt: scale Y→0 and XZ→1.4 over 0.5 s, then a goo puddle decal (4 s). |
| Weak-spot kill | Head pops into a star burst plus "BONKERS!". Recipe launch is ×1.5. |
| Confetti Kill perk | Keep the existing gameplay. Visual is ×3 confetti plus party horns. |

### 2.5 Player movement polish (`src/render/feel/cameraFeel.js`)

Extract the camera code from `render()`.
- **Strafe tilt:** roll = −localVelX / walkSpeed × 1.5° (spring 8 Hz / 0.8).
- **Slide:** roll spring to 4° (it currently snaps to 0.06 rad). Add 2° pitch down and speed lines (screen-space radial streak overlay, opacity tied to speed > 11 m/s).
- **Landing:** eye-dip spring impulse of −`land.speed` × 0.02 m, capped at 0.25. Hard landings (speed > 14) add trauma 0.15 and a dust ring.
- **Jump:** eye up 0.02 impulse. **Double jump:** FOV +2 plus a small air-puff ring under the player.
- **Dash:** FOV +8 (keep), plus radial speed-blur overlay 150 ms, wind whoosh, and 3 afterimage streaks in the dash direction.
- **Sprint:** FOV +6 (keep), with the FOV spring at 6 Hz instead of a raw lerp.
- **Head bob:** keep the current sine. Add a tiny 0.3° roll on alternating steps and footstep sounds per stage surface (step every 0.38 s at sprint, 0.5 s at walk).

### 2.6 Screen effects (`src/ui/screenFx.js` plus post uniforms from the rendering half)

- **Damage direction indicator:** `playerDamaged.dir` is an atan2 world angle. Relative angle = dir − camera yaw. Draw red arcs on a 120 px ring around the crosshair (pool of 6, 0.8 s fade). Width scales with damage, and shield hits are blue. Off-screen projectile warnings: when an enemy bullet passes within 1.5 m, add a faint whoosh plus a thin arc.
- **Low HP** (< 30% health): a red vignette pulsing at a heart rate that rises from 70 to 140 bpm as HP falls, a heartbeat audio loop, saturation −40%, and a 3 dB low-pass on music (4 kHz cutoff).
- **Shield break:** blue flash at the screen edges (120 ms), a glass-crack overlay SVG that fades over 0.6 s, a 40 ms hitstop and the `shieldBreak` sound. **Shield recharge start:** blue edge shimmer sweeping upward plus a rising tone.
- **Downed:** grey desaturation, roll 30° (exists), a heartbeat, and the Second Wind timer ring.
- **Mana Shield active:** screen-edge hex pattern overlay at 15% opacity in cyan.
- **Accessibility:** all of these scale with a new "Screen effects intensity" slider (0–1) in the pause menu, next to Shake.

---

## 3. Gameplay depth (sim changes; deterministic, `state.rng` only)

### 3.1 Event payload additions (presentation-only fields; they never change gameplay)

In `src/sim/combat.js` / `player.js` / `enemies.js` / `bosses.js` / `drops.js`:
- `damage`: add `dir:{x,z}` (unit vector from source to target, or the shot's aim direction), `gunType`, `targetType`, `hpFrac` (after the hit), `maxHp`.
- `kill`: add `dir`, `overkill` = clamp(−hpAfter / maxHp, 0, 3), `yaw`, `scale`, `stage` (`enemyStage(e)` or the boss phase), `gunType`, `affixes`.
- `shot`: add `ammoLeft`, `magSize` (a low-ammo click below 25%) and `pellets`.
- **New events:**
  - `enemyTelegraph` {id, enemyType, kind, dur, pos, targetPos?}
  - `lootSpawned` {pickupId, kind, quality?, gunType?, pos}. Emit it where `src/sim/drops.js` creates gun pickups. Today there is no event for monster gun drops (`gunDropped` is only the player dropping a gun).
  - `hazardWarn` {id, kind, pos, radius, dur}
  - `directorPhase` {phase, intensity}
  - `affixTrigger` {id, affix, pos}
  - `bossTeleportWarn` {id, to, dur}

### 3.2 Enemy AI upgrades (`src/sim/enemies.js`; new `src/sim/squad.js`)

**Midget swarm (squad behaviours):**
- **Surround slots:** each tick, `squad.js` assigns every chasing midget within 10 m of the player a ring slot angle. Use 12 slots at 1.6 m, ordered by current bearing. Midgets then seek their slot instead of the player centre, which turns a conga line into an encirclement.
- **Attack tokens:** at most `ATTACK_TOKENS = 3 + floor(tier/3)` midgets may be in `attack` at once. A midget without a token holds at 2.8–3.5 m and **taunts** (plays `victory`, emits `enemyTelegraph` kind `taunt`). That is wacky and fair.
- **Flank:** if the player is looking at a midget (dot(playerForward, toMidget) > 0.9) and it is more than 6 m away, raise its strafe weight to 1.2 for 1 s so it zig-zags. Midgets behind the player (dot < −0.3) get +15% speed. Swarms collapse from the sides.
- **Lunge** (new attack, tier ≥ 2, 25% chance when 4–6 m away with a token): crouch for 0.35 s (`enemyTelegraph` kind `lunge`, dur 0.35), then leap at 11 m/s toward the predicted player position (lead 0.2 s). Same damage as the melee. 1.0 s recover. Data: `lunge: { minD: 4, maxD: 6, chance: 0.25, windup: 0.35, speed: 11, recover: 1.0, tierMin: 2 }` in `ENEMIES.midget`.

**Flying Midget: dive bomb** (tier ≥ 1, wave 2+). In data: `dive: { cooldownMin: 6, cooldownMax: 10, windup: 0.6, speed: 16, damage: 12, recover: 1.2, vulnMult: 1.5 }`.
- **Windup:** hover in place and shake, propeller whine pitches up, `enemyTelegraph` kind `dive` (dur 0.6). Snapshot the target position.
- **Dive:** fly in a straight line to the snapshot. A sphere hit (0.8 m) deals the damage.
- **Recover:** 1.2 s at 1.2 m altitude, stunned. Takes ×1.5 damage (`e.ai.vulnT`). This rewards dodging with a juicy punish window.
- Keep the pellet gun unchanged.

**Bitcoin Obama:**
- **Telegraph:** when the burst windup (0.45 s) starts, emit `enemyTelegraph` kind `burst` dur 0.45. Presentation shows a glowing bitcoin in his hand (port the muzzle glow from `MuzzleFx.ts`) and a lens glint visible from 40 m.
- **Reposition:** after each burst, pick a new orbit angle ±40° and strafe there. This keeps the readable "slower and less accurate than the player" design.
- **Line of fire:** if another enemy is within 1 m of the line to the player, strafe instead of firing. Fewer friendly-fire-looking shots, more movement.
- **Spacing:** Obamas within 6 m of each other repel (separation weight 2.5) so they spread around the player.
- Accuracy and rate stay exactly as now (`tests/units.test.js:132` must still pass).

**Big Bitcoin Obama:**
- Pound windup (0.9 s) creates a `poundTelegraph` hazard: a red disc decal at the pound point that fills from 0 to 100% over the windup.
- Hose windup (0.7 s) emits `enemyTelegraph` kind `hose`, and the shield plate glows.
- When the battery is hit for ≥ 20% of max HP in 2 s, he "short-circuits": a 1.0 s stagger with sparks (`affixTrigger`-like event `batteryShort`). A reward for flanking.

### 3.3 Elite affixes (new `src/data/affixes.js`; sim in `src/sim/affixes.js`)

Elites keep the crown and ×2.5 HP. The new rule:
- Tier 1–2: 0 affixes.
- Tier 3–6: 1 affix.
- Tier 7+: 2 affixes.
- Rolled by `state.rng` at spawn. The name plate reads, for example, "TURBO SPLITTER MIDGET".

| id | Effect | Allowed types | Visual / sound hook |
|---|---|---|---|
| `turbo` | +35% speed, a 0.3 s afterimage trail | midget, obama, flyingMidget | Speed lines, sneaker squeak |
| `splitter` | On death spawns 2 mini midgets (0.6 scale, 15 HP, `summoned:true`, no drops) | midget, bigObama (spawns 2 midgets) | Pop-split animation |
| `bubble` | Bubble shield absorbing 30% max HP that regenerates after 6 s with no damage | all | Pink fresnel sphere that cracks on break |
| `bouncy` | Hops every 2–3 s (vel.y 8), harder to track | midget, obama | Spring sound, squash/stretch |
| `kaboom` | On death: 0.8 s fuse (`hazardWarn` red ring 3 m), then 20 damage AoE | midget, obama | Blinking red emissive, fuse hiss |
| `magnet` | Pulls nearby bitcoins (enemy bullets) into a slow orbit, then flings them (+1 bullet per burst) | obama, bigObama | Gold swirl |

All values live in data. Affix drops: +1 resource roll per affix.

### 3.4 Boss choreography

**Intro** (the existing `intro` action, 2.0 s, raised to 2.6 s):
- The sim freezes regular enemies during it (`state.tuning.freezeEnemies`-like flag `state.wave.cinematic = true`) and makes the player invulnerable (`p.invulnT`).
- Presentation: letterbox bars (8% height), 0.5× slow-mo for the first 0.4 s, boss card (§6) with the stage portrait, boss roar audio, music sting, then "FIGHT!".
- The camera is never moved by force (this is an FPS). Instead an off-screen arrow plus a screen-edge glow points to the boss.

**Phase transitions** (the existing `transition`, 2 s, invulnerable). The beats are adapted from sproto-duel `src/campaign/BossCinematic.ts` and `transformStyles.ts`: freeze → reel → charge → burst → land.
- **0.0 s:** 120 ms hitstop. The boss plays `hit`, then `castBig`.
- **0.0–1.2 s:** energy gathers (particles spiral in, emissive ramps to white, rising riser sound). The sim emits `bossPhase` at the start; it already exists.
- **1.2 s:** burst. A white flash sphere hides the model swap (the view rebuilds because `viewKey` changes when `phaseIdx` increments). Confetti/smoke shock ring.
- **Sim:** a 0-damage knockback ring (`shockwave` hazard with `damage:0, push:12`) pushes the player out of melee.
- **1.4–2.0 s:** the new form lands or roars (`victory` clip). The boss card updates with "STAGE 2" and the new portrait. The music intensity layer goes up.

**Telegraph VFX upgrades** (the sim already emits `bossTelegraph` charge/volley/slam):
- **Tinubu charge:** the `telegraphLine` hazard becomes a scrolling red chevron lane (shader UV scroll at 6 m/s) plus a dust paw.
- **Tinubu slam:** an expanding red ground circle filling over the hop, then a shockwave ring (sproto-duel `Effects.ts` RING_FRAG shader) plus debris and a camera trauma of 0.4 at distance falloff.
- **Tinubu volley:** a glowing belly and fan lines at 20% opacity for 0.5 s.
- **Tinubu stunned:** a yellow pulsing belly weak spot (exists) plus circling stars and a "BONK ME" comic sign.
- **Hex ring/spiral/fan:** a purple rune circle charging under Hex (port FireRing-style shader colours from `src/arena/FireRing.ts`).
- **Hex taxBolts:** a lock-on marker. Screen-edge purple brackets pulse and a lock-beep plays (reuse `lockBeep.wav`).
- **Hex teleport:** the sim must pick the destination at teleport start and emit `bossTeleportWarn {to, dur:0.4}`. Presentation shows a swirl at the destination and smoke at the origin.
- **Aura:** an animated rune ring shader instead of the flat ring, with mana-drain particles flowing from the player's screen edge toward Hex while inside it.

**Stage arena hazards during boss fights** (new `src/data/hazards.js`, sim in `src/sim/hazards.js` or the existing hazards code in `world.js`):
- They only run while a boss is alive and `phaseIdx ≥ 1`.
- Frequency: every 6–9 s (phase 1), 4–6 s (phase 2). Tier ≥ 5 waves also get a low frequency (every 15 s) during regular waves.
- All hazards emit `hazardWarn` with ≥ 1.0 s warning.

| Stage | Hazard | Warn | Effect |
|---|---|---|---|
| city (wave 1 and sandbox) | Bitcoin rain: 6 markers near the player | 1.2 s gold circles | 8 damage each, radius 1.5 |
| volcano (wave 2, Tinubu) | Lava geysers: 3 vents | 1.0 s glowing cracks plus rumble | 18 damage plus burn 2 s, radius 2.2, 1.5 s column |
| void (wave 3, Tinubu + Hex) | Gravity well | 1.0 s violet swirl decal | Pulls the player 3.5 m/s toward the centre for 4 s, radius 8; no damage |
| glacier (debug or sandbox) | Icicle drops plus ice patches | 1.2 s shadow circles | 12 damage; patch friction ×0.3 for 6 s |

### 3.5 Wave director and intensity (`src/sim/director.js`, called from `waves.js`)

- **Intensity** I ∈ [0, 1], updated each tick:
  - I_target = clamp(0.45 × threatAlive/threatCap + 0.35 × recentDamageTaken/(maxHp × 0.5) + 0.2 × (1 − hpFrac), 0, 1)
  - Threat weights: midget 1, flyer 1.5, obama 2, bigObama 5, elite ×2.
  - `recentDamageTaken` uses a 6 s exponential decay.
  - Smooth: I += (I_target − I) × min(1, dt × 0.8).
- **Phases** (emit `directorPhase` on change):
  - `build`: I < 0.55 for ≥ 4 s → the next group may spawn 3 s early (min `at − 3`).
  - `peak`: I > 0.8 → hold the next group (add up to +6 s delay, never past `at + 8`).
  - `relax`: after a peak, guarantee ≥ 4 s of no new groups and a pity drop (one health orb within 8 m if HP < 35% and no orb dropped in the last 10 s).
- Group composition and counts are unchanged, so the `3 waves with growing counts` test still passes. Spawns use the existing `at`/`aliveBelow` rules, offset by the director.
- Store `state.wave.intensity` and `state.wave.directorPhase`. Music reads them. Determinism is preserved.

### 3.6 Balance targets (weapons unchanged; tune enemy and boss data only)

Base numbers from `src/data/guns.js` and `src/data/enemies.js`. Gun damage scales by 1.13^(level−1), enemy HP by 1.15^(tier−1).

**T1, Common, tier-matched level, body shots, no crits:**

| Gun (DPS) | Midget 40 | Flyer 30 | Obama 70 | Big Obama 320 (battery ×2.5) | Tinubu 3500 | Hex 3000 |
|---|---|---|---|---|---|---|
| MG 90 | 0.44 s | 0.33 s* | 0.78 s | 1.4 s (battery) / 3.6 s (body) | 39 s | 33 s |
| Shotgun 72/shot, 86 DPS | 1 shot (close) | 1 shot | 1–2 shots | 2 shots (battery) | 41 s | 35 s |
| Sniper 85 (weak 255) | 1 shot | 1 shot | 1 weak / 1 body + chip | 2 battery shots | 51 s | 44 s |
| Bazooka 140 + 110 splash | Cluster wipe | Hard to hit | 1 rocket | 1 battery rocket (×1.5 crit cap) | 42 s | 36 s |

(*hit rate makes the real time ~1 s)

**Target bands** (assert them in `tests/balance.test.js` using a pure `scripts/ttk.js` helper that imports `generateGun` and `ENEMIES`):
- Regular enemies, tier-matched Rare MG, body: midget 0.25–0.7 s, Obama 0.5–1.2 s, Big Obama via battery 1.0–3.0 s, at every tier 1–10.
- Boss fight length (pure DPS time × 1.8 uptime factor), tier-matched Rare MG: Tinubu 60–120 s, Hex 50–110 s, the wave-3 duo 100–180 s combined.
- Player survival: unmitigated incoming DPS from a full T1 wave-1 group ≤ 25 HP/s. Midget melee 9 per 0.85 s cycle × 3 tokens ≈ 32 DPS is the worst case, so attack tokens are the balance lever.
- Enemy projectile speeds stay ≤ 34 m/s (dodgeable at 9.5 m/s sprint).
- If a band fails, change **enemy/boss HP or tier curves** in `src/data/enemies.js` / `waves.js`, never `src/data/guns.js`.

### 3.7 Loot excitement

**Loot beam** (`src/render/vfx/lootBeam.js`), on `lootSpawned` with `kind:'gun'`. A vertical additive cylinder with a scrolling noise shader, coloured by quality:

| Quality | Beam |
|---|---|
| Common | None, just a ground glow ring |
| Uncommon | 2.5 m |
| Rare | 5 m |
| Epic | 9 m plus sparkles |
| Legendary | 22 m orange beam, rotating light rays, ground rune ring, ember particles |

**Drop ceremony:**
- Guns pop out on an arc: the sim already sets the pickup velocity; the renderer adds spin and a landing bounce plus a dust puff.
- **Legendary:** 0.35 s 0.5× slow-mo, the `legendarySting` audio (music ducks −8 dB for 1.5 s), an orange glint sweeping the screen edge, a "LEGENDARY!" banner with the gun name in comic font, and a screen-edge arrow until it is picked up.
- **Epic+** guns get an off-screen HUD edge indicator in the quality colour.

**Pickup:**
- Looking at a gun within `gunPickupRadius` opens the loot card (§6).
- On pickup: the gun model flies to the camera over 0.2 s, then swaps in. Rarity sound; Legendary gets a 4-note fanfare.

---

## 4. VFX system spec

### 4.1 Architecture (`src/render/vfx/`)

| File | Contents |
|---|---|
| `ParticleSystem.js` | JS port of sproto-duel `src/fx/ParticleSystem.ts`: fixed-capacity CPU points with swap-and-pop, per-particle gravity, drag and size0→size1, and its soft point shader. Two instances: `glow` (additive, `toneMapped:false`, cap 2500) and `soft` (normal blend, cap 1500). Keep `setPointScale` for resolution. |
| `Billboards.js` | Instanced camera-facing quads with an atlas UV per instance (rotation, scale-over-life, colour-over-life, flipbook frame). Cap 512. Used for flashes, smoke puffs, stars, coins (2D), comic text. One draw call per blend mode. |
| `ribbons.js` | Instanced tracer and beam quads (cap 128) plus the jagged beam material port of `SpellFx.ts` `beamMaterial()`. |
| `rings.js` | Ground and air shockwave rings using `Effects.ts` RING_VERT/RING_FRAG (pool 16). |
| `lights.js` | Pooled point-light flashes (max 4 world plus 1 viewmodel), port of `Effects.ts` LightFlash. Never create lights at runtime. |
| `decals.js` | Ground decals. The arena floor is flat at y = 0, so these are pooled flat quads at y = 0.01 + i × 0.0005 with polygonOffset (cap 256, ring buffer, fade the oldest). Atlas: scorch, bullet scuff, goo puddle, bitcoin coin, rune, crack. Per-stage tint. |
| `shells.js`, `coins.js`, `props.js` | Instanced physics-light debris: casings, bitcoin coins (3D, cap 200), mags, shield plates, beanies. Shared integrator `debrisStep(arr, dt)` (pure, in `src/render/feel/debris.js`, tested). |
| `textures.js` | Procedural canvas atlas built at boot (no downloads): glow (port `glowTexture()` from sproto-duel `src/fx/textures.ts:11`), spark, 4-point star, 5-point cartoon star, smoke puff ×4, ring, flame flipbook ×8, bitcoin coin, confetti, hex cell, crack, bubble (port `bubbleTextures()` from `MuzzleFx.ts`), plus comic words rendered on demand into a 1024² text atlas (LRU of 32). |
| `fxdefs.js` | **Data-driven effect definitions** (plain objects). |
| `Fx.js` | `createFx(scene, camera, settings)` → `{ spawn(name, pos, opts), update(dt, camPos), setQuality(q), stats() }`. `opts` = { dir, normal, color, element, scale }. |
| `ambient.js` | Port of `Arena.ts` `emitAmbient` (lines 1250–1305) plus the theme ambient entries. Emitted in a 25 m box around the camera. |
| `status.js` | Per-enemy element status emitters (§4.2). |
| `telegraphs.js` | Ground telegraph shapes: fill-circle, chevron lane, rune circle, lock-on brackets. |

**Effect definition schema (`fxdefs.js`):**
```js
export const FX = {
  impact_city: { layers: [
    { sys: 'soft', count: [4, 6], speed: [1, 3], cone: 60, size: [0.12, 0.3], life: [0.3, 0.5], color: '#7a7480', gravity: 4, drag: 2 },
    { sys: 'billboard', tex: 'puff', count: 1, size: [0.4, 0.9], life: 0.4, color: '#9a94a0', alpha: [0.6, 0] },
    { sys: 'decal', tex: 'scuff', size: [0.25, 0.4], life: 12 } ] },
  explosion_fire: { layers: [ /* flash, fireball x8 additive flipbook, smoke x12 normal, sparks x30, ring, light 30, decal scorch, debris */ ], shake: { trauma: 0.6, falloff: 25 } },
  // ...
};
```
- `Fx.spawn` resolves `name + '_' + element` first, then falls back to `name`.
- Quality scaling: `low` ×0.4 counts, no decals beyond 64, no lights beyond 2. `medium` ×0.7. `high` ×1.0.

**Replace all current calls:** `burstConfetti`, `addBoom` and `addTracer` in `renderer.js` become `fx.spawn(...)`. Keep confetti as its own def because it is on-brand.

### 4.2 Element effects
- **Fire:** a burning enemy emits 10 flame-flipbook billboards/s from random points on its bounding capsule, plus an orange emissive flicker (8 Hz) on the existing `setTint`. Ember sparks. Death: char and ash. A fire explosion uses an orange/yellow fireball.
- **Shock:** a shocked enemy (status `chain` is instant, so trigger on `statusApplied` and on zap tracers) gets 3 jagged arc ribbons crawling over the body for 0.5 s plus a blue light blink. Shock explosion: an electric sphere flash plus 6 radial arcs.
- **Goo:** a slowed enemy drips green blobs (soft particles, gravity 9, 6/s) and gets a jiggle scale spring at 5 Hz, plus a puddle decal under it while slowed. Goo explosion: a splat with blob debris and a 2.5 m puddle decal.

### 4.3 Explosions
Layered recipe `explosion` (bazooka, Yeet Reload, kaboom affix, meteor ×3 scale):
1. Flash billboard (0.08 s, scale radius × 1.2).
2. Fireball: 8 additive flipbook puffs expanding to radius × 0.8 over 0.35 s.
3. Smoke: 12 normal-blend dark puffs rising at 1.5 m/s for 1.6 s.
4. Sparks: 30 glow points, 8–14 m/s.
5. Ground ring (radius × 1.3, 0.4 s).
6. Light flash (30, decays 120/s).
7. Scorch decal (radius × 0.7, 20 s).
8. Trauma: 0.6 × max(0, 1 − d/25) × radius/4 (the current formula).

### 4.4 Spell VFX (events `cast`, `meteorImpact`, `splat`, zap `tracer`, `allyPoof`)
- **Goo Bolt:** a wobbly green orb (projectile view with a scale spring) leaving a goo droplet trail. Impact splat plus puddle decal.
- **Chain Zap:** a thick 3-layer jagged beam (core white, mid cyan, outer glow) that flickers for 0.18 s, node sparks at each target, and a shock status on each.
- **Sproto Swarm:** 5 poofs with a party-horn burst. Mini Sprotos trail rainbow sparkles. Despawn is `allyPoof` confetti.
- **Mana Shield:** screen hex overlay plus a cyan rim light on the viewmodel. Absorbed hits make the hex flash where the damage came from.
- **Meteor Bonk:** at cast, a sky streak plus a ground rune ring at the marker (exists as `meteorMarker`; add the rune shader). The rock gets a flame trail plus an ember shower. Impact: explosion ×3, a 7 m scorch, debris chunks, shockwave ring, trauma 1, and 90 ms hitstop (exists).

### 4.5 Stage ambient (port from sproto-duel)
`ambient.js` uses the `themes.ts` values:
- city `vape` (rate 7, `[1.0,0.62,0.88]`/`[0.6,1.0,0.9]`)
- volcano `embers` (40, `[1.0,0.45,0.1]`/`[0.32,0.28,0.27]`, plus soft ash falling from 9–17 m)
- glacier `snow` (48)
- void `motes` (30, `[0.75,0.4,1.0]`/`[0.4,1.0,0.6]`)

Add the ambient definition to each entry in `src/data/stages.js` `STAGES` (plain numbers, allowed in data). Rates are scaled ×1.5 for our larger 45 m arena. Particles only spawn within 25 m of the camera.

---

## 5. Audio spec

### 5.1 Engine (`src/audio/AudioEngine.js`, WebAudio, no new dependency)

Port the design, not the code, from sproto-duel `src/audio/AudioManager.ts`: a manifest of `{path, volume, maxVoices, loop, music}`, positional playback, and extension fallback (`.mp3` → `.ogg` → `.wav`).

- **Buses:** `master → limiter (DynamicsCompressor −1 dB, ratio 20) → destination`. Under master: `music`, `sfx`, `ui`, `amb`. Each has a gain plus a user slider (Master/Music/SFX in the pause menu, saved to `localStorage`).
- **Voices:** global cap of 32 with priority stealing. Priority: playerGun 5, telegraph 4, boss 4, hit/kill 3, impact 2, ambience 1. A per-sound `maxVoices` replaces the current `throttle()`.
- **Variation:** each sound has `variants: [paths]` (round-robin without immediate repeat) and `pitch: ±0.06`.
- **Spatial:** a `PannerNode` (`panningModel: 'HRTF'`, `distanceModel: 'inverse'`, refDistance 3, rolloff 1.2, maxDistance 60) for anything with a `pos`/`id` in the event. Update `AudioListener` position and orientation from the camera every frame (`audio.setListener(camera)`, called from `Game.frame`). The player's own gun, UI and music are non-spatial.
- **Loading:** samples go through `src/render/assets.js`'s queue. Add `loadAudio(path, prio)` there with `fetch` + `decodeAudioData` and the same NOW/LATER priorities. Boot loads only the `core` group. Each level loads its stage music and enemy groups (extend `levelAssets()` with `sounds: [...]` in `src/data/stages.js`, or keep a parallel `levelSounds()` in `src/audio/soundManifest.js`).
- **Fallback:** if a sample is missing or not yet loaded, call the existing synth recipe in `sfx.js`. Keep that file renamed to `src/audio/synth.js`. The game is never silent.
- **Ducking:** `duck(bus, dB, attack, hold, release)`:

  | Trigger | Duck |
  |---|---|
  | Boss roar or intro | music −6 dB for 1.5 s |
  | Legendary sting | music −8 dB for 1.5 s |
  | Explosion within 15 m | music −3 dB for 0.3 s |
  | Level-up / perk | music −4 dB for 0.8 s |
  | Low HP | music low-pass at 4 kHz |

### 5.2 Music (`src/audio/music.js`)
- **Per stage**, 3 looping stems of equal length (synced; start all at the same `ctx.currentTime`):
  - `L0` pad/ambient (intermission and calm)
  - `L1` drums/bass (wave active)
  - `L2` lead/hype (intensity > 0.6)
- **Per boss**, a separate track with 3 phase layers: P1 base, P2 adds a choir or guitar layer, P3 adds a tempo-matched hype layer.
- Crossfade 2.0 s, driven by `state.wave.intensity`, `directorPhase` and `bossPhase`. Stings: wave start, wave cleared, boss intro, legendary, victory, defeat.
- **Interim:** reuse sproto-duel `musicBattle.wav` as L1 and `musicMenu.wav` as title/intermission L0 until real stems exist.

### 5.3 Event → sound mapping

Copy the reused files to `public/assets/audio/sfx/` (`/music/` for music). "Duel:x" means `/home/user/crrreatorrr/sproto-duel/public/assets/audio/placeholder/x.wav`. "Bake" means render our own synth recipe from `sfx.js` to a wav with `scripts/gen-audio.mjs`, a port of sproto-duel `scripts/gen-placeholder-audio.mjs`. "NEW" means a real recording the owner must source (CC0 libraries such as Kenney or Sonniss GDC bundles, or generated). Every row ships with a placeholder at once.

| Event (payload condition) | Key | Interim file | Final (NEW) description | Spatial |
|---|---|---|---|---|
| `shot` mg | `gun_mg` ×3 variants | Duel:gunshot (rate 1.3) | Punchy SMG crack plus a mechanical clack; zippity version brighter | no |
| `shot` shotgun | `gun_shotgun` ×3 | Bake | Deep boom plus pellet scatter | no |
| `shot` sniper | `gun_sniper` ×3 | Bake | Supersonic crack plus a long tail echo | no |
| `shot` bazooka | `gun_bazooka` ×2 | Duel:grenadeThump (rate 0.8) | Whoomp launch plus a fizz trail loop | no |
| `shot` mega | `gun_mega` | Duel:blastCast | Cartoon cannon | no |
| Manufacturer layer | `mfr_<id>` | Bake | blastco low thump, zippity zip, reliable click-tail, gloop bloop | no |
| Reload cues (mag out/in/slap, shell insert, bolt, pump) | `rl_*` | Bake | Foley mechanical set (8 files) | no |
| `ammoEmpty` / low ammo | `dry_fire` / `low_ammo_tick` | Bake | Dry click / light ping | no |
| Shell bounce | `shell_tink` ×3 | Bake | Brass tinkle; shotgun plastic thock | yes |
| `damage` normal | `hit_tick` | Duel:boltHit (rate 1.6, vol 0.4) | Soft thwack | yes (quiet) |
| `damage` weak | `bonk` ×3 | Bake | Cartoon wood-block "BONK" plus a squeak | no (feedback) |
| `damage` shield | `tink` | Duel:shieldBlock (rate 1.5) | Metallic ricochet | yes |
| `kill` | `kill_confirm` | Bake | Satisfying pop plus a sparkle | no |
| `kill` obama | `kaching` | Duel:pumpCoin | Cash register plus coin cascade | yes |
| `kill` midget | `boing` | Bake | Spring boing plus a squeaky toy | yes |
| `kill` elite | `kill_elite` | Duel:spellLearned (short) | Bright fanfare hit | no |
| `explosion` | `explosion` ×3 | Duel:blastExplode | Layered boom with debris | yes |
| `impact` (ground) per stage | `impact_<stage>` | Duel:pillarHit (rate 1.4) | Dirt/asphalt, ash, snow crunch, void chime | yes |
| `playerDamaged` health / shield | `hurt` / `shield_hit` | Duel:hurt / Duel:shieldBlock | Grunt-free thud plus a gasp blip (no real-voice clones) | no |
| `shieldBroken` | `shield_break` | Duel:clash (rate 1.2) | Glass shatter plus a power-down | no |
| `shieldRegenStart` | `shield_regen` | Duel:shieldUp | Rising electric hum | no |
| Low HP loop | `heartbeat` | Bake | Heartbeat loop | no |
| `jump` / `doubleJump` / `land` | `jump`, `djump`, `land` | Duel:dodge (rate 1.4) / Bake / Bake | Cloth plus a whoosh; double jump air puff; landing thud | no |
| `dash` | `dash` | Duel:carpetWhoosh | Air whoosh | no |
| `slide` | `slide` loop | Duel:rugWhoosh | Fabric scrape loop | no |
| Footsteps per stage | `step_<stage>` ×4 | Bake | Asphalt, ash crunch, snow, glassy void | no |
| `cast` gooBolt | `goo_cast` | Duel:vapePuff | Wet glorp | no |
| `cast` chainZap | `zap` | Duel:stunBeam | Electric crack | no |
| `cast` swarm | `swarm` | Duel:phoneBlip ×5 (rate 1.3) | Tiny squeaky cheers | no |
| `cast` manaShield | `mana_shield` | Duel:shieldUp | Glassy hum | no |
| `cast` meteor / `meteorImpact` | `meteor_fall` / `meteor_hit` | Duel:ultCharge / Duel:ultWave | Descending roar / huge impact | yes |
| `noMana`, `spellLocked`, `actionFailed` | `ui_deny` | Duel:noMana | Soft buzz | no |
| `enemyTelegraph` burst (Obama) | `obama_windup` | Duel:pumpCoin (rate 1.6, vol 0.5) | Coin flip ching | yes (+3 dB) |
| `enemyShot` | `bitcoin_shot` | Duel:phoneBlip (rate 0.8) | Coin "pew" | yes |
| `enemyTelegraph` lunge / dive | `midget_lunge` / `dive_whine` | Bake | Squeak "hup!" / propeller rising whine | yes (+3 dB) |
| Propeller loop (flyers) | `propeller_loop` | Bake | Toy propeller buzz (loop, spatial, max 4) | yes |
| `enemyAttack` midget / bigObama | `swipe` / `pound_windup` | Duel:rugWhoosh / Duel:bossRise (rate 1.5) | Swipe whoosh / heavy wind-up groan | yes |
| `pound` | `pound` | Duel:bossSlam (vol 0.6) | Ground thump | yes |
| `bossSpawn`, `bossIntro` | `boss_intro` | Duel:bossRise | Ominous riser plus a hit | no |
| `bossRoar` | `boss_roar_<type>` | Duel:bossRoar | Tinubu growl / Hex echoing chant; synthetic, not voice clones | yes |
| `bossTelegraph` charge / slam / volley | `boss_charge`, `boss_slam_windup`, `boss_volley` | Duel:breathRoar / Duel:bossRise / Duel:pumpCoin | | yes |
| Slam land | `boss_slam` | Duel:bossSlam | | yes |
| `bossCast` ring/fan/tax | `hex_cast` | Duel:blastCharge | Magic whoosh | yes |
| Tax lock-on | `lock_beep` | Duel:lockBeep | | no |
| `bossTeleport` | `teleport` | Duel:fizzle | Vworp | yes |
| `bossPhase` | `boss_transform` | Duel:ultCharge then Duel:bossRoar | Riser to burst | no |
| `bossStunned` | `boss_stunned` | Duel:stunHit | Dizzy birds plus a thud | yes |
| `bossDefeated` | `boss_defeat` | Duel:victory (short) | Huge explosion plus a fanfare | no |
| `hazardWarn` (stage) | `hz_<kind>` | Duel:fireLoop / Duel:fireRoar / Bake | Coin whistle, lava rumble, void suction, ice crack | yes |
| `pickup` health/mana/ammo/resource/tickets | `pk_*` | Duel:lifePackPickup / Duel:ticketPickup / Bake | Distinct blips; tickets = arcade coin | no |
| `lootSpawned` by quality | `loot_<quality>` | Duel:ticketSpawn (rate varies) | Rising chime per rarity | yes |
| Legendary | `legendary_sting` | Duel:spellLearned | Big orchestral-cartoon sting | no |
| `gunPickedUp` | `gun_pickup` | Bake | Weapon grab clack | no |
| `levelUp` / `perkUnlocked` | `level_up` / `perk` | Duel:spellLearned / Duel:ultReady | | no |
| `craftStart` / `craftComplete` | `craft_loop` / `craft_done` | Bake / Duel:ticketPickup | Workshop whirr / ding | yes |
| `purchase`, `sold`, `vend` | `buy`, `sell`, `vend_*` | Duel:pumpCoin / Bake | Gacha rattle; chicken = rubber chicken squeak (NEW) | no |
| `wavePre`, `waveStart`, `waveCleared` | `countdown`, `fight`, `wave_clear` | Duel:countdown / Duel:roundStart / Duel:roundWin | | no |
| `victory` / `defeat` | `victory` / `defeat` | Duel:victory / Duel:defeat | | no |
| UI hover/click | `ui_hover` / `ui_click` | Duel:uiHover / Duel:uiClick | | no |
| Ambience per stage | `amb_<stage>` loop | Duel:fireLoop (volcano), Bake others | City night hum, lava rumble, glacier wind, void drone | no |

Put the mapping in `src/audio/soundManifest.js` (`SOUNDS` plus `EVENT_SOUNDS: { [eventType]: (ev) => key | null }`). A test checks that every key referenced exists in `SOUNDS`, and that every `SOUNDS` entry has either a file on disk or a `synth` fallback name.

---

## 6. UI / HUD polish (`src/ui/`, `src/styles/game.css`)

- **Diegetic-feeling HUD (Borderlands style):**
  - Bottom-left: shield over HP bars, skewed with `transform: perspective(600px) rotateY(12deg)`, thick black outline and a cel-shade gradient.
  - Bottom-right: the ammo block, mirrored −12°, with per-type bullet icon rows (mg: thin bars, shotgun: shells, sniper: big rounds, bazooka: rocket) that pop out as you fire.
  - Spells sit as slanted cards with cooldown wipes.
  - **HUD lag:** the whole HUD translates by −(viewmodel sway) × 120 px and +landing dip × 60 px, which makes it feel attached to a helmet.
- **Dynamic crosshair:** a gap that reflects the gun's real current spread. r_px = tan(spreadDeg) × (h/2)/tan(fov/2), using `gun.stats.spread` / `adsSpread` (read only). Bloom while firing follows the sim's current-spread value if it exists; otherwise it is cosmetic only.
- **Damage numbers:** §2.3. **Font:** bundle one comic display font (for example "Bangers", OFL, woff2 ≈ 40 KB) under `public/assets/fonts/` and use it for numbers, banners, "BONK" sprites and loot names.
- **Boss intro card** (`src/ui/bossCard.js`):
  - On `bossIntro`: a full-width slanted banner slides in from the right (0.25 s ease-out-back).
  - It shows the stage portrait `BOSSES[type].portraits[0]` (in `public/assets/ui/bosses/`), the name in 72 px comic font, and an epithet from new data `BOSSES[type].epithets = ['The Physical Audit', ...]`.
  - Holds 1.8 s, exits left. For wave 3 (2 bosses), split diagonally with both portraits.
  - On `bossPhase`: a small card with `portraits[phaseIdx]` and "STAGE N: <phase epithet>".
- **Boss HP bar:** top centre, 60% width. Segment ticks at the phase thresholds (Tinubu 50/20%, Hex 60/25%) and a portrait icon on the left that swaps per phase. A white "chip" damage trail lags 0.4 s. Greyed out with "IMMUNE" during transition. Two bars stacked for the duo.
- **Loot cards** (upgrade `gunCardHtml`):
  - Projected next to the pickup when `p.nearGunPickupId` is set.
  - Rarity-coloured frame with an animated glow (Legendary gets a shimmering orange foil gradient), manufacturer badge (colour from `MANUFACTURERS`), element icon, and stat rows with green/red compare arrows against the equipped gun (`compareGuns` exists in the sim; call it read-only).
  - Wacky perk text in a callout. "[G] PICK UP" prompt. Animates in 120 ms.
- **Kill feed and comic pops:** keep `feed()`, but restyle it to slanted tags. Elite kills show the affix names.
- **Off-screen indicators:** ring-edge arrows for bosses (red), epic+ loot (quality colour) and active hazards near the player (red pulse).

---

## 7. Milestones

General rules for every milestone:
- `npm test` and `npm run build` are green.
- No console errors.
- Play the acceptance checklist with `?mode=sandbox&debug=1` and `?mode=waves`.
- No sim event payload change may alter existing gameplay values.

### M0: Groundwork and module split (no visible change)
**Goal:** make room for the features without growing `renderer.js` past 854 lines.
**Files:**
- Create: `src/render/vfx/Fx.js` (stub that wraps the current `burstConfetti`, `addBoom` and `addTracer`), `src/render/viewmodel.js`, `src/render/feel/cameraFeel.js`, `src/render/feel/spring.js`, `src/game/feel.js`, `tests/presentation.test.js`.
- Modify: `src/render/renderer.js`, `src/game/Game.js`.

**Tasks:**
1. Move the viewmodel block (`vmRoot`, `vm`, the `shot`/`reloadStart`/`swap` listeners and the viewmodel part of `render()`) into `viewmodel.js` unchanged.
2. Move camera feel (trauma, fovPunch, landDip, bob, eye) into `cameraFeel.js`.
3. Move the hitstop wiring into `src/game/feel.js`. Add `game.presentScale` (default 1), multiplied into `this.acc += ft * this.timeScale * this.presentScale`.
4. Add a settings object `{ fxQuality: 'high', screenFx: 1, volumes:{master,music,sfx} }` persisted in `localStorage`, with UI rows in the pause menu.
5. Fix the debug default `enemy: 'grunt'` → `'midget'`.
6. Agree file ownership with the rendering half: they own scene, lighting, post and `assets.js` loaders; this half owns `vfx/`, `feel/`, `viewmodel.js`, `corpses.js` and `characterFx.js`.

**Tests:**
- `spring.js` converges (|x − target| < 1e-3 after 1 s at 10 Hz / ζ 0.7) and is stable at dt 1/30.
- **Event coverage test:** regex-scan `src/sim/**/*.js` for `emit(state, '<name>'` and assert each name appears in a coverage list exported from `src/game/eventCoverage.js` (`{ shot:['audio','vfx'], ... }`, with explicitly allowed `'none'` entries such as `xpGain`).

**Acceptance:** the game looks and plays exactly as before. Hitstop toggle works. The debug panel spawns midgets by default.

### M1: VFX core (particles, billboards, decals, rings, lights) and stage ambient
**Files:**
- Create: everything under `src/render/vfx/` from §4.1 except `status.js` and `telegraphs.js`.
- Modify: `renderer.js` (replace confetti/booms/tracers), `src/data/stages.js` (add `ambient`).
- Port from sproto-duel: `src/fx/ParticleSystem.ts`, `src/fx/Effects.ts` (ring shader, light pool, flash sprite), `src/fx/textures.ts:11` `glowTexture`, `src/arena/Arena.ts:1250–1305`, `src/arena/themes.ts` ambient values.

**Tasks:**
1. Port the classes to JS.
2. Build the procedural atlas.
3. Implement `Fx.spawn` with the def schema.
4. Write the defs `confetti`, `impact_<stage>`, `spark_<element>`, `explosion`, `explosion_<element>`, `boom_small`, `splat`, `ring_ground`.
5. Add decals with ring-buffer fading.
6. Add ambient emitters per stage.
7. Show a `stats()` line in the debug overlay: particles alive, billboards, decals, draw calls.

**Tests:**
- Every `FX` def validates (known `sys`, numeric ranges, `count[0] ≤ count[1]`).
- The `debrisStep` integrator is deterministic given fixed inputs and bounces at y = 0.

**Acceptance:**
- Bazooka explosions show flash, fireball, smoke, sparks, ring, light and scorch.
- Ground impacts differ per stage.
- Embers drift in the volcano, snow on the glacier, motes in the void, vape clouds in the city.
- 40 enemies plus constant MG fire keep VFX under 2 ms (debug stat).

### M2: Gun feel
**Files:**
- Create: `src/render/feel/gunFeel.js`, `src/render/feel/reloadAnims.js`, `src/render/vfx/shells.js`, `src/render/vfx/ribbons.js`.
- Modify: `viewmodel.js`, `renderer.js` (tracers), `fxdefs.js` (muzzle defs).
- Port: `bubbleTextures()` from sproto-duel `src/fx/MuzzleFx.ts:41`, `beamMaterial()` from `src/fx/SpellFx.ts:57`.

**Tasks:** spring rig; per-type and per-manufacturer profiles (§2.1 table); sway, bob, poses, ADS and scope-in; reload keyframes scaled to `reloadStart.time`; swap; shells; mags; 4 manufacturer muzzle flashes; ribbon tracers with the travel-streak illusion; a lil-gui folder "Gun feel" exposing the profile numbers live.

**Needs from the rendering half:** viewmodel meshes with sockets `muzzle`, `eject`, `mag`, `sight` (named Object3Ds), and a viewmodel render layer with its own 60° FOV and a depth clear.

**Tests:**
- Every gun type has a reload anim with sorted `t` in [0, 1] that ends at the hip pose.
- Every manufacturer has a muzzle def.
- The reload anim sampler returns the hip pose at t = 1.

**Acceptance:** each gun type is recognisable with eyes closed (audio comes in M4) and with sound off from motion alone. The MG shakes rapidly but stays readable. The shotgun pumps after every shot. The sniper bolt cycles. Shells bounce on the floor. Reload length matches the HUD reload bar exactly. Camera aim is unchanged: a test shot at a dummy hits the same point as before M2.

### M3: Hit feedback
**Files:**
- Create: `src/ui/hitmarker.js`, `src/ui/damageNumbers.js`, `src/render/vfx/comicText.js`.
- Modify: `src/ui/ui.js`, `src/game/feel.js`, `src/sim/combat.js` (payload: `dir`, `gunType`, `targetType`, `hpFrac`, `maxHp`), `fxdefs.js`.

**Tasks:** 5 hitmarker variants; arcing pooled damage numbers with merging; BONK comic sprites; shield ripple and ricochet; boss IMMUNE feedback; hitstop table plus rate limiter; the comic font.

**Tests:**
- `mergeNumber` merges same-target hits within 0.25 s and splits after.
- The hitstop limiter never allows more than 3 per second.
- The sim determinism test still passes after the payload additions.

**Acceptance:**
- Weak-spot sniper shots feel huge: BONK, star burst and 45 ms hitstop.
- MG streams show one climbing number per target.
- Big Obama's shield gives a clearly different "tink" feedback.

### M4: Audio engine and mapping
**Files:**
- Create: `src/audio/AudioEngine.js`, `src/audio/soundManifest.js`, `src/audio/music.js`, `scripts/gen-audio.mjs` (port of sproto-duel `scripts/gen-placeholder-audio.mjs`, rendering our synth recipes offline into `public/assets/audio/sfx/*.wav`), plus copies of the "Duel:" files from §5.3 into `public/assets/audio/sfx/` and `music/`.
- Rename `src/audio/sfx.js` → `src/audio/synth.js` (kept as fallback).
- Modify: `src/render/assets.js` (`loadAudio`), `src/data/stages.js` or `soundManifest.js` (`levelSounds`), `Game.js` (`setListener`, volume sliders).

**Tasks:** buses, voices, round-robin, HRTF spatial, ducking, per-level loading, music stems with intensity crossfade (interim tracks), footsteps, propeller loops, reload cues fired from `reloadAnims` `cue`s.

**Tests:**
- Manifest integrity: keys exist, files exist or a synth fallback exists.
- Voice allocator unit test (pure `pickVoiceToSteal(voices, newPriority)`).
- `levelSounds(0, 1)` includes no boss or other-stage files.

**Acceptance:**
- Every event in the mapping makes a sound.
- Enemies behind you are audible and locatable.
- Nothing clips during a meteor plus a boss slam.
- The title screen downloads ≤ 400 KB of audio (Network tab).
- Muting and the sliders work and persist.

### M5: Enemy reactions, element status and wacky deaths
**Files:**
- Create: `src/render/corpses.js`, `src/render/characterFx.js`, `src/render/vfx/status.js`, `src/render/vfx/coins.js`.
- Modify: `src/render/assets.js` (`flinch`, a bone cache, a `once` clip completion callback), `renderer.js` (`releaseUnseen` corpse hand-off, strafe clips, look-at), `src/sim/combat.js` (`kill` payload: `dir`, `overkill`, `yaw`, `scale`, `stage`, `gunType`, `affixes`).
- Port: the look-at chain and loco blend ideas from sproto-duel `src/wizard/Animator.ts`; the `defeat`-keeps-travel rule from `src/assets/rig.ts`.

**Tasks:** flinch springs; hit clip on big hits; stagger stars; the death recipe table (§2.4); element kill variants; fire, shock and goo status emitters; a corpse cap of 24.

**Tests:**
- Pure `deathRecipeFor(ev)` returns the expected recipe id per victim, element and weak combination.
- The corpse cap never exceeds 24 (simulate 100 kill events against a mock view map).

**Acceptance:**
- Midgets get launched further by shotgun and overkill.
- Obamas burst into bouncing coins.
- Flyers lose their beanies.
- Fire kills crumble to ash and goo kills melt into puddles.
- No views leak: the view count returns to baseline after a 50-kill wave (debug stat).

### M6: Movement polish and screen effects
**Files:**
- Create: `src/ui/screenFx.js`, `src/ui/damageDirection.js`.
- Modify: `cameraFeel.js`, `ui.js`, `game.css`.

**Needs from the rendering half:** post uniforms `saturation`, `vignette`, `vignetteColor`, `chromaticAberration`, `radialBlur`.

**Tasks:** §2.5 and §2.6 in full, plus the "Screen effects intensity" slider.

**Tests:**
- Pure `relativeHitAngle(dir, yaw)` maps front, back, left and right correctly.
- The heartbeat bpm mapping is monotonic.

**Acceptance:** getting shot from behind shows a rear arc. Shield break is unmistakable. Low HP pulses and slows the heartbeat as you heal. Slides and dashes feel fast without causing nausea (all values capped, roll ≤ 4°).

### M7: Enemy AI depth (sim)
**Files:**
- Create: `src/sim/squad.js`.
- Modify: `src/sim/enemies.js`, `src/data/enemies.js` (`lunge`, `dive`, `ATTACK_TOKENS` params), `src/sim/events.js` docs, presentation listeners for `enemyTelegraph`, `src/render/vfx/telegraphs.js` (pound fill disc, Obama hand glow, lunge crouch dust, dive whine).

**Tasks:** surround slots, attack tokens and taunts, flank weights, midget lunge, flyer dive plus vulnerable recover, Obama telegraph/reposition/line-of-fire/spacing, Big Obama pound telegraph plus battery short.

**Tests** (add to `tests/units.test.js` or a new `tests/ai.test.js`):
- With 10 midgets around a stationary player, no more than `ATTACK_TOKENS` are in `attack` on any tick over 600 ticks.
- A flyer's dive always emits `enemyTelegraph` ≥ 0.6 s before contact damage.
- Every damaging enemy attack is preceded by a telegraph ≥ 0.4 s: scan events in a scripted 30 s fight and check `enemyTelegraph`/`enemyAttack` → `playerDamaged` timing.
- The existing Obama accuracy test still passes.
- The determinism test still passes.

**Acceptance:** swarms encircle instead of queueing. You can hear and see every lunge and dive coming. Dodging a dive and punishing the grounded flyer feels great. Obamas spread out and keep moving.

### M8: Elite affixes
**Files:**
- Create: `src/data/affixes.js`, `src/sim/affixes.js`.
- Modify: `src/sim/state.js` or the enemy factory (roll affixes), `src/sim/combat.js` (bubble absorb, splitter/kaboom on death), `src/data/drops.js` (+1 roll per affix), renderer (affix visuals), `ui.js` (name plates via `project()`).

**Tests:**
- Affix count by tier (0 / 1 / 2).
- Affixes only roll for allowed types.
- Splitter children have `summoned:true` and no drops.
- Kaboom fuse ≥ 0.8 s with a `hazardWarn`.

**Acceptance:** tier 3+ elites read instantly by name plate and visual (trail, bubble, blinking fuse).

### M9: Wave director and adaptive music
**Files:**
- Create: `src/sim/director.js`.
- Modify: `src/sim/waves.js`, `src/sim/state.js` (`wave.intensity`, `wave.directorPhase`), `src/audio/music.js`.

**Tests:**
- Same seed and commands produce the same intensity trace.
- Groups never spawn earlier than `at − 3` or later than `at + 8`.
- Pity orb drops when HP < 35% and none dropped in 10 s.
- `fullrun.test.js` autopilot still completes.

**Acceptance:** fights breathe (build → peak → relax). Music thickens at peaks and thins in lulls. You get a health orb when you are desperate.

### M10: Loot ceremony and loot cards
**Files:**
- Create: `src/render/vfx/lootBeam.js`, `src/ui/lootCard.js`, `src/ui/offscreen.js`.
- Modify: `src/sim/drops.js` (`lootSpawned` event), `renderer.js` (gun pickup bounce/spin), `ui.js` (replace the inline card), `src/game/feel.js` (legendary slow-mo).

**Tests:** every pickup creation path emits `lootSpawned` (scan events after `killAll` with forced drops in sandbox).

**Acceptance:** you can spot an Epic from across the arena. A Legendary drop stops your heart: beam, sting, slow-mo, banner, edge arrow. Loot cards compare correctly against the equipped gun.

### M11: Boss choreography and stage hazards
**Files:**
- Create: `src/data/hazards.js`, `src/ui/bossCard.js`, `src/ui/bossBar.js`.
- Modify: `src/sim/bosses.js` (intro 2.6 s with `state.wave.cinematic` freeze plus player invuln; transition knockback ring; `bossTeleportWarn` destination pre-pick), `src/sim/world.js` hazards (`lavaGeyser`, `coinRain`, `gravityWell`, `icicle`, `iceSlick`, `poundTelegraph`), `src/data/enemies.js` (epithets), `src/render/vfx/telegraphs.js`, `fxdefs.js`.
- Port: beats from sproto-duel `src/campaign/BossCinematic.ts` and `transformStyles.ts`; flame shader colours from `src/arena/FireRing.ts`.

**Tests:**
- Hazards only spawn during boss fights in phase ≥ 1, or at tier ≥ 5.
- Every hazard has ≥ 1.0 s of `hazardWarn` before damage.
- The player takes no damage during the intro.
- The transition knockback deals 0 damage.

**Acceptance:** each boss has a cinematic intro card with its portrait. Phase transitions read as transformations, not pops. Each stage's hazard changes how you move. All telegraphs follow the colour language.

### M12: HUD polish
**Files:** modify `src/ui/ui.js` and `src/styles/game.css`; add the font to `public/assets/fonts/`.
**Tasks:** §6 in full: skewed panels, HUD lag, ammo icons, dynamic crosshair, kill-feed restyle.
**Tests:** pure `spreadToPixels(spreadDeg, fov, h)` matches the formula.
**Acceptance:** the HUD reads at a glance at 1280×720 and 2560×1440. It never covers the centre 40% of the screen.

### M13: Balance pass and TTK tooling
**Files:**
- Create: `scripts/ttk.js` (`npm run ttk`), `tests/balance.test.js`.
- Modify: `src/data/enemies.js` and `src/data/waves.js` only.

**Tasks:** generate the §3.6 tables for tiers 1–10. Tune boss HP and enemy curves into the bands. Document the results in README.
**Acceptance:** all bands pass. A tier-1 run with starter gear clears wave 1 without dying for an average player. Tier 10 is hard but beatable with Epic/Legendary gear.

### M14: Quality-bar verification
Profile with 40 enemies, 2 bosses and full VFX on mid hardware, then apply the low/medium/high fxQuality presets. Make sure every §1 metric is met. Record the numbers in README "Feel & performance".

---

## 8. Risks and things Codex must NOT do

**Do not:**
1. **Do not change gun mechanics:** damage, fire rate, spread, recoil values, mag, reload time, pellets, perks or generator weights in `src/data/guns.js` / `src/sim/guns.js` / `player.js` firing. Feel is presentation only. In particular, add no camera rotation that the sim does not know about. Visual kick goes to the viewmodel, FOV and shake only.
2. **Do not put three, DOM, `Math.random`, `Date.now` or `performance.now` in `src/sim` or `src/data`.** VFX and audio defs live under `src/render/` and `src/audio/`. The sim must only use `state.rng`. Adding rng draws is fine, but keep their order deterministic.
3. **Do not break existing tests,** especially: Obama burst accuracy/rate (`units.test.js:132`), wave counts (line 266), determinism (line 281), level asset scoping (line 175), and the full autopilot run.
4. **Do not load all assets at boot.** Audio and music use the per-level `assets.js` queue (NOW/LATER). VFX textures are procedural. The font is the only new boot asset.
5. **Do not create Three.js objects per event.** Everything is pooled (particles, billboards, decals, lights, corpses, comic text). No `new THREE.PointLight` at runtime. No material clones per hit beyond the existing per-character clone.
6. **Do not let presentation write state.** The UI and renderer still only queue actions. Slow-mo and hitstop stay client-side in `Game.frame`.
7. **Do not clone real people's voices** or use recognisable voice impersonations for Obama, Tinubu or Sahil. Use synthetic gibberish grunts and SFX only.
8. **Do not force camera moves** in cinematics. This is an FPS: use letterbox, cards, slow-mo and indicators instead.
9. **Do not add physics engines or UI frameworks.** Use the light integrators described here. WebAudio directly; Howler is not needed.

**Risks and mitigations:**

| Risk | Mitigation |
|---|---|
| Bloom washes out telegraphs | Telegraph materials stay below the bloom threshold except their edge band. Test readability on all 4 stages. |
| MG plus shotgun spam floods particle caps | Per-def `maxPerSecond` throttles plus pellet merging. Quality presets. |
| Corpse system leaks skinned meshes | Dispose through the existing `dropView` path when a corpse expires, and add a debug counter. |
| AI changes make waves harder than intended | Attack tokens are the main lever. Re-run the TTK and incoming-DPS bands (M13). |
| Merge conflicts with the rendering half in `renderer.js` | Do M0 first and agree file ownership (§M0 task 6). |

---

## 9. What this half needs from the rendering/asset/performance half

1. **Post stack:** `EffectComposer` → `RenderPass` → `UnrealBloomPass` (start at sproto-duel's values 0.85 / 0.5 / 0.78 from `src/config.ts:126–129`, ported from `src/render/Renderer.ts:56–64`) → a grading pass exposing `saturation`, `vignette`, `vignetteColor`, `chromaticAberration`, `radialBlur` → `OutputPass`. A `bloomBoost` hook for boss transitions.
2. **Viewmodel layer:** a separate camera or layer with 60° FOV and a depth clear so guns never clip into enemies. Gun meshes per type with named sockets `muzzle`, `eject`, `mag`, `sight` (and optionally simple gloved hands).
3. **`assets.js`:** `loadAudio(path, prio)` and audio entries in `levelAssets()`. A `once`-clip finished callback and bone lookup (`getBone(name)`) on `instantiateCharacter`.
4. **Performance:** frame-time and draw-call stats in the debug overlay, and an fxQuality preset hook (low/med/high) that this half's `Fx.setQuality` subscribes to.
5. **Materials:** VFX use `toneMapped:false` with HDR colours > 1 for bloom. Particles never cast shadows.

### Critical Files for Implementation
- /home/user/sproto-shooter/src/render/renderer.js
- /home/user/sproto-shooter/src/sim/enemies.js
- /home/user/sproto-shooter/src/sim/combat.js
- /home/user/sproto-shooter/src/audio/sfx.js
- /home/user/sproto-shooter/src/game/Game.js
- Port sources: /home/user/crrreatorrr/sproto-duel/src/fx/ParticleSystem.ts, /home/user/crrreatorrr/sproto-duel/src/fx/Effects.ts, /home/user/crrreatorrr/sproto-duel/src/fx/MuzzleFx.ts, /home/user/crrreatorrr/sproto-duel/src/arena/Arena.ts, /home/user/crrreatorrr/sproto-duel/src/wizard/Animator.ts, /home/user/crrreatorrr/sproto-duel/scripts/gen-placeholder-audio.mjs