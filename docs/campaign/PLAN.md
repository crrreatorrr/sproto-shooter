# Sproto Shooter: Campaign Plan v2 — *The Great Sproto Audit*

Status: **plan only, nothing here is built yet.** Written 2026-11-09.

This plan replaces the level content of `docs/codex/C-level-designs.md` and extends the engine spec
in `docs/codex/C-campaign-levels.md` (cited as **C §x**) and the boss spec in
`docs/codex/C-bosses-sproto-duel.md` (cited as **B §x**). Where this file and those disagree, this
file wins. The ten level documents are in `docs/campaign/levels/`.

| File | What's in it |
|---|---|
| `docs/campaign/PLAN.md` (this file) | Audit of what exists, campaign arc, 20-minute pacing model, primitive world kit, enemy roster, magic, explosives, bosses, engine work, build order, pins |
| `docs/campaign/levels/L01…L10-*.md` | One document per level: sections, blockout primitives, spawn timelines, boss parts, time budget |

---

## 0. What exists today (checked in the code on `main` @ `acafce3`)

The old plan describes a Halo-scale campaign. The code has a thin stand-in for it.

| Area | Old plan says | Code has |
|---|---|---|
| Levels | 10 levels, 0.9 to 3 km each, par 10 to 30 min | `src/data/levels/campaign.js`: 10 levels, each 3 or 4 straight corridors of about 48 × 22 m, one squad of 1 to 6 enemies per corridor. A level takes about a minute |
| World collision | Solids, ramps, terrain, raycasts (C §3.4, §3.5) | None in campaign. `src/sim/player.js` only keeps `y >= 0`. Walls, cover and props are drawn by `src/render/level/levelView.js` and nothing collides with them. Bullets pass through them |
| Navigation, line of sight | Nav grid, perception, cover use (C §3.6) | None. Enemies run straight at the player |
| Encounters | Squads, waves, spawn methods, objectives (C §3.8) | One squad per encounter, spawned all at once when the player walks into a box. Objectives are `clearAll` or `boss` |
| Mechanisms | 23 kinds with real behaviour (C §3.9) | Proximity stubs in `src/sim/campaign/campaign.js` `touchMechanism`. A door is a flag, a mover nudges velocity, a barrel emits an event and deals no damage |
| New enemies | 13 archetypes with their own behaviour (C §3.12) | 13 `dress()` re-skins in `src/data/enemies.js`. A Boom Midget is a Midget with different HP and colour. Nothing explodes, burrows, shields, snipes or spawns (the Daycare nest is the one exception) |
| Bosses | Five Sproto Duel fights, 3 stages, powers, arena shifts (B §3) | `tickDuelBoss`: walk at the player and fire one random attack every 1.6 s. 980 to 1,600 HP |
| Jetpack | Fuel, hover, regen, ceiling (C §3.10) | Hold jump to rise while fuel lasts. No regen |
| Carry-over, depots, shop mid-level | C §3.14 | Not built |
| Crafting | Weapon Box at every depot, resources from every enemy (C §3.9, §3.12) | Built for Wave Mode: Crafting skill, recipes, six resources, two Weapon Boxes. **This plan removes all of it** (§7.1) |
| Ammo | — | Four ammo types with caps and drops exist. The Machine Gun and the boss guns have endless reserves |
| Unused models | — | `robot_laser`, `robot_shooter`, `monster`, `dragon`, `sproto_monster`, `car_monster`, `mole_monster` are in `public/assets/models/characters/` and have working wave-mode behaviour. The campaign uses none of them |

So this plan has two halves: the engine work that makes a real level possible (§10), and ten levels
designed to last about 20 minutes each (§2 and the level documents).

---

## 1. Goals and hard rules

**Goals**

1. Ten long levels, about **20 minutes each** on a first Normal playthrough (§3 says how that is measured).
2. Each level has its own **environment** and its own **way of playing**: assault, close quarters,
   magic, air combat, sniping, heavy weapons, explosives, tactical interiors, open battlefield, final exam.
3. **Difficulty rises** every level: tier, number of threat roles at once, elites, hazard density.
4. Every world is built from **simple shapes** (boxes, ramps, cylinders, spheres, cones, heightfield
   terrain). No level waits for a 3D model. Enemies without a model get a primitive placeholder.
5. **Multi-part bosses.** Every level ends in a fight with several parts: phases, destroyable parts,
   adds on a schedule, arena changes. Odd levels use the wave bosses whose models already exist.
6. Magic is a real third tool next to guns and movement: ten new or reworked spells, spell shrines,
   and world objects that react to spells.
7. **Progress is what you find, not what you grind or build.** There is no crafting and there are no
   Magic skill levels. Spells are unlocked in campaign levels, guns come as drops (new types, or the
   same type at a better tier), and ammo is picked up (§7).

**Hard rules**

- `src/sim` and `src/data` stay pure (`tests/architecture.test.js`). Level data is plain data.
- **Gun stats are never changed by campaign systems** (CODEX_PLAN ground rule 1). Power-ups,
  modifiers and spells never edit a gun.
- **Wave Mode and Sandbox change once, on purpose.** Removing crafting, the Weapon Boxes and Magic
  skill levels (§7.1) is game-wide, so the hashes in `tests/fixtures/baseline-hashes.json` are
  re-pinned in that one PR. After it they do not move again: new campaign state is created lazily
  so the arena state shape stays put.
- The pins in `AGENTS.md` move only on purpose. §12 lists which ones this plan moves.
- Bosses stay on **L02, L04, L06, L08, L10** so the hub's canonical boss table keeps its level ids.

---

## 2. The campaign arc

| # | Level | Stage | Tier | Par | How it plays | Headline tools | Finale (multi-part) |
|---|---|---|---|---|---|---|---|
| L01 | Sproto Landing | `city` dusk | 1 | 18 min | **Assault basics**: cover, movement, swarms, first heavy | Machine gun, then shotgun | Mini-boss: **Big Bitcoin Obama "The Gatekeeper"** with a Security Bot escort |
| L02 | The Grand Bazaar | `desert` | 2 | 20 min | **Close quarters**: alleys, shields, flanking, rooftops | Shotgun, Chain Zap | **Boss: Sahil the RugMaster** |
| L03 | The Vegetable Grove | `grove` twilight | 3 | 20 min | **Magic**: spell shrines, hexed enemies, spell-driven mechanisms | Goo Bolt, Chain Zap, Yeet, Sproto Swarm | Mini-boss: **Hex Sahil's shade "The Compost Hex"**, then Broccoli Head *Sprout* (flees) |
| L04 | The Blockchain Void | `void` | 4 | 20 min | **Air combat**: jetpack, flocks, floating islands | Machine gun, jetpack, Mana Shield | **Boss: Bitcoin Obama & The Midget** |
| L05 | Frostspire Black Site | `glacier` | 5 | 20 min | **Sniping and infiltration**: long sightlines, counter-snipers, searchlights | Sniper, Decoy | Mini-boss: **Blue Monster "The Abominable Auditor"**, then the vault hold |
| L06 | Vape Cabal Skyline | `city` night, rain | 6 | 20 min | **Heavy weapons**: armoured convoy, gunship, rooftops | Bazooka, Meteor Bonk, jetpack | Mini-boss: **Car Part Monster** on the freeway, then **Boss: Broccoli Head** |
| L07 | Hellfire Underworks | `volcano` interior | 7 | 20 min | **Explosives and demolition**: charges, gas lines, ore carts, a rail ride | Barrels, charge packs, Yoink, bazooka | Mini-boss: **Mole Monster "The Foreman"**, then the meltdown escape |
| L08 | Government Office | `office` | 8 | 20 min | **Tactical interiors**: smart squads, lasers, anti-magic, flashbangs | Shotgun, MG, Blink | **Boss: Glowie** |
| L09 | Moonlit Ruins | `moonlit` | 9 | 21 min | **Open battlefield**, three outposts in any order, each a different discipline | Everything, Time Bubble | Mini-boss: **Sproto Beast**, then the **Big Obama twins**, then Tinubu *Emi Lokan* (flees) |
| L10 | Hellfire Caldera | `volcano` | 10 | 22 min | **Final exam**: one section per discipline, then the last boss and a jetpack escape | Everything | Mini-boss: **Jade Dragon**, then **Final boss: Tinubu**, then the eruption escape |

Changes from the old arc: L03 becomes the magic level, L05 the sniping level, L06 the heavy-weapons
level, L07 the explosives level. Every level now has a mini-boss or a boss, and the existing wave-boss
models are used as mini-bosses. L01 goes from 10 to 18 minutes; L09 and L10 come down from 28 and 30.

### 2.1 Story spine (one line per level)

1. L01: you drop into Los Angeles; the Bitcoin Tax Empire has shut the city gate.
2. L02: Sahil's bazaar is where the Empire launders its rugs. Take his carpet.
3. L03: the Vape Cabal grows its product in a hexed grove. Sahil's shade guards it. Broccoli Head escapes.
4. L04: the money goes to a floating exchange in the Void, run by the Pump & Dump Duo.
5. L05: the ledgers are in a black site in the glacier. Glowie watches from a drone.
6. L06: back to LA at night to finish Broccoli Head, through his armoured convoy.
7. L07: Tinubu's foundry under the volcano prints the coins. Blow it up.
8. L08: Glowie's tower holds the last key.
9. L09: the Moon Gate in the old ruins opens the way to the Caldera. Tinubu looks through it.
10. L10: climb the Caldera, end Tinubu, fly out.

---

## 3. The 20-minute pacing model

A level document must add up. Every beat gets an estimated time, and the beats sum to the par.

**Shape of a level**

- 4 to 6 **sections** (L09 has 3: its hub is one section with four districts). Only the current section is loaded (C §3.19). A section lasts 3 to 6 minutes.
- 10 to 13 **beats**: 7 to 9 combat encounters, 2 or 3 traversal or mechanism beats, 1 or 2
  breathers at a depot, 1 finale.
- Route length 1.0 to 1.6 km. The player walks at 6.5 m/s and sprints at 9.5 m/s; budget **5.5 m/s** average.
- 3 or 4 **lockdown arenas** (§5.6): semi-large rooms whose doors close until every wave is dead.
- 8 to 10 checkpoints, never more than 2.5 minutes apart **outside sealed fights**, each with an
  ammo box; 2 depots (§7.7). A lockdown restarts from its first wave (§5.6). A boss fight saves at
  its part boundaries in the campaign, and not at all in a hub-verified boss run.
- Hidden: 1 Golden Bonk (the old modifier table in C-level-designs §1.4 stays), 1 **Mana Battery**,
  1 secret weapon cache and 3 **Audit Files** (tickets and a line of story each).

**Time estimate** (first playthrough, Normal, a player who has finished the earlier levels):

| Item | Seconds |
|---|---|
| Fodder: midget, sewerMidget, bitbug (each) | 3 |
| Rusher: boomMidget | 3 |
| Flyer: flyingMidget, balloonMidget | 5 |
| Ranged: obama, glowieAgent, robotLaser | 6 |
| Shield, artillery, sniper, support: riotMidget, floretSprout, auditSniper, hexAcolyte | 8 |
| Jet Obama, Shooter Bot | 9 |
| Charger: miniTinubu | 14 |
| Turret: miningRig | 15 |
| Nest: daycare | 25 |
| Heavy: bigObama | 30 |
| Vehicle | 40 |
| New enemies (§5.3): hexWisp, frostHound 5; manaLeech, spotterDrone, shieldDrone, cabinetMimic 6 | as listed |
| bombTosser, magmaSlug, nullifier 8; rocketObama 9; moonCultist 10 (its portal Midgets counted separately) | as listed |
| gooGlob 14 (the whole family); tinubuImp 14; flakPod 15; barkBrute 18; ruinSentinel 30 | as listed |
| auditVan 40 (its passengers counted separately); vapeGunship 60 | as listed |
| Elite of any type | ×2 |
| Mini-boss, **adds included** | 150 to 210 |
| Boss, **adds included** | 240 to 330 |
| Escape or hold | stated time; its enemies are not summed |
| Traversal | metres ÷ 5.5 |
| Switch, puzzle, hold, ride | stated per beat |
| Depot breather | 45 to 60 |

Combat beats add **30%** on top of the enemy sum for reloads, repositioning and wave delays.
A boss, mini-boss, hold or escape is one stated block of time: the adds that arrive during it count
toward the level's enemy total but are not summed again in the time budget.
A level's total must land within **±2 minutes of its par**. A fast replay should take about 70% of par.

**Pressure rules by level** (how difficulty rises besides tier)

| Levels | `maxAlive` (ground) | Threat roles at once | Elites | Hazards during fights |
|---|---|---|---|---|
| L01 | 8 | 2 | none | none |
| L02, L03 | 10 | 3 | 1 per level, in the finale | 1 kind |
| L04 to L06 | 12 | 4 | 1 per section | 2 kinds |
| L07, L08 | 14 | 5 | 2 per section, pairs allowed | 2 kinds, overlapping |
| L09, L10 | 16 | any | elite squads | any |

Flocks (bitbugs) are counted as one unit per 6 against `maxAlive`. Tier still scales enemy HP and
damage by 1.15 per tier, and world guns scale with tier, so time-to-kill stays near constant and the
pressure rules carry the difficulty.

**Enemy budget per level** (totals, Normal, finale adds included): L01 110 to 140, L02 and L03
140 to 180, L04 and L05 135 to 170, L06 160 to 200, L07 165 to 210, L08 175 to 220, L09 190 to 250,
L10 200 to 260. The first drafts of the level documents showed that the top of each range does not
fit the par once a mini-boss and 1.2 km of route are in, so the ranges were widened downward. When
the two disagree, **the par wins**: cut enemies, not minutes.

**No two encounters above 0.8 intensity in a row** without a breather (C-level-designs §3 pacing check).

---

## 4. Building worlds from simple shapes

Everything without a model is built from primitives. The kit in `src/data/levels/kit.js` already has
`box`, `ramp`, `stairs`, `cylinder` and `terrain`. This plan adds three.

| Primitive | Collides | Use |
|---|---|---|
| `box({at, size, yaw, mat})` | yes | Walls, floors, buildings, crates, cars, cover |
| `ramp(...)`, `stairs(...)` | yes | Slopes, escalators, roofs you can climb |
| `cylinder({at, r, h, mat})` | yes | Pillars, trees, tanks, towers, wheels, barrels |
| `terrain({origin, size, cell, seed, noise})` | yes (height query) | Dunes, snowfields, crop fields, ruin plains |
| **`sphere({at, r, mat})`** (new) | yes | Boulders, tree crowns, domes, balloons, cabbages |
| **`cone({at, r, h, mat})`** (new) | visual only, with an optional cylinder collider | Roofs, spires, tents, stalagmites, tree tops |
| **`disc({at, r, mat})`** (new) | no (a floor decal) | Pads, rings, targets, landing circles, telegraph marks |

**Conventions**

- Metres. `+x` east, `+z` south, `y` up. Yaw is degrees about Y, 0 facing `+z` (as in `kit.js`).
- Each section has its own local origin at its **north-west** ground corner, the minimum x and z, so every local coordinate is positive. A terrain's `origin` is its minimum corner too. The assembler offsets sections into the level.
- A section's footprint is at most 320 × 320 m for built spaces, 700 × 700 m for terrain.
- At most **600 solids per section** and 2,500 per level. Static solids merge into one mesh per
  material, so draw calls stay low.
- No solid thinner than 0.5 m (the validator already checks this). Doorways are at least 2.2 m wide
  and 2.6 m high. Cover is 1.2 m (crouch) or 2 m (full). Jump height is 1.45 m, double jump 2.6 m.

**Materials** (flat colours for now): `stone`, `sand`, `dirt`, `hedge`, `metal`, `ice`, `rock`, `crate`,
`pillar`, `trim` exist. Add `concrete`, `wood`, `grass`, `snow`, `glass` (see-through, blocks bullets),
`neon` (emissive, marks the critical path), `lava` and `toxic` (emissive hazard surfaces), `water`, `gold`.

**Prefabs.** A prefab is a named group of primitives, written once per theme and placed many times.
Examples: `city.car` = body box 4.2 × 1.2 × 1.8 + cabin box + 4 wheel cylinders; `grove.tree` =
trunk cylinder + crown sphere; `office.cubicle` = three boxes 1.35 m high. Each level document
lists its prefabs with parts and sizes. `flattenGeometry` in `kit.js` already expands groups.

**Placeholder enemies.** An enemy without a model declares a `look` in its data: a short list of
primitives with colours (for example a Hex Wisp is a sphere 0.5 m with two small sphere eyes and a
cone tail). A new render view draws any `look`. Hitboxes stay data, as today.

**Files when built** (one directory per level, so ten agents never touch the same file):

```
src/data/levels/
  kit.js                    primitives + validator (extended)
  prefabs/<theme>.js        city, desert, grove, void, glacier, volcano, office, moonlit
  L01/index.js              level header, section order
  L01/S1.js … S5.js         one file per section: geometry, encounters, mechanisms
  campaign.js               imports L01…L10 only
```

---

## 5. Enemies

### 5.1 Enemies that already work

| Id | Role | Notes |
|---|---|---|
| `midget` | Fodder, melee swarm | 40 HP, 7.8 m/s |
| `flyingMidget` | Flyer | 30 HP, orbits 3 to 6.5 m up, weak pellets |
| `obama` | Ranged | 70 HP, keeps 9 to 20 m, 3-round bursts |
| `bigObama` | Heavy | 320 HP, front shield, back battery, ground pound |
| `robotLaser` (Laser Bot) | Ranged, telegraphed beam | 60 HP. Has a model. New to the campaign |
| `robotShooter` (Shooter Bot) | Ranged heavy | 170 HP. Has a model. New to the campaign |

### 5.2 Re-skins that need real behaviour (specs are in C §3.12)

`boomMidget` (bomber), `riotMidget` (front shield), `sewerMidget` (burrower), `floretSprout`
(mortar), `hexAcolyte` (shield support), `glowieAgent` (cover squad, flashbang), `auditSniper`
(laser telegraph, relocates), `miningRig` (turret, overheats), `daycare` (spawner nest), `bitbug`
(flock), `jetObama` (jet flyer, thruster weak spot), `balloonMidget` (floating mine), `miniTinubu`
(charger, stunned by walls). Level documents use them **as C §3.12 specifies them**, not as they are today.

### 5.3 New placeholder enemies (primitive looks)

Each is introduced alone, then tested in a mix, then twisted. A level may propose up to **three** more;
the level document gives the full stat block.

| Id | Name | Intro | Role | Behaviour in one line | Counter | Look (primitives) |
|---|---|---|---|---|---|---|
| `bombTosser` | Bomb Tosser (COOP_PLAN §6.3a) | L07 | Artillery | Lobs bouncing bombs with a 1.2 s fuse; a satchel on its back detonates when shot | Shoot the satchel; Yoink the bomb back | Box body, sphere satchel, cone hat |
| `gooGlob` | Goo Glob (COOP_PLAN §6.3a) | L03 | Splitter | Slams, leaves a slow puddle, splits 1 → 2 → 4 on death | Hit the core; Chain Zap the small ones | See-through sphere with a small core sphere |
| `hexWisp` | Hex Wisp | L03 | Spell-check | Floats through cover; bullets do 20%, spells do 200% | Any spell | Sphere, two eye spheres, cone tail |
| `barkBrute` | Bark Brute | L03 | Armoured heavy | Bark armour ignores bullets until goo softens it or shock cracks it | Goo Bolt then guns; Yeet into hazards | Stacked boxes, cylinder arms |
| `manaLeech` | Mana Leech | L03 | Drain | Latches a beam that drains 8 mana/s inside 10 m | Kill first or break line of sight | Cylinder body, disc mouth |
| `flakPod` | Gas Fee Flak Pod | L04 | Area denial (air) | Static pod that fires slow flak bursts at anything flying | Land and shoot the base, or snipe | Cylinder base, sphere turret, box barrels |
| `spotterDrone` | Spotter Drone | L05 | Detection | Sweeps a searchlight cone; if it holds you 1.5 s it calls a mortar strike and wakes the area | Stay out of the cone, Decoy, shoot the lamp | Box body, cone light, 4 disc rotors |
| `frostHound` | Frost Hound | L05 | Tracker | Follows your trail, lunges, leaves a slick patch | Shotgun on the lunge | Box body, box head, 4 cylinder legs |
| `auditVan` | Armoured Audit Van | L06 | Vehicle | Drives a lane, bullets do 10%, unloads squads, engine block at the back is a weak spot | Bazooka, Meteor Bonk, barrels, the engine | Box body, box cab, 6 wheel cylinders |
| `rocketObama` | Rocket Obama | L06 | Ranged heavy | Fires one slow rocket you can shoot down or dodge | Shoot the rocket, close in | `obama` model with a cylinder launcher |
| `vapeGunship` | Vape Blimp Gunship | L06 | Air heavy | Circles, strafes a line, drops Boom Midgets; two engine pods are weak spots | Bazooka at the pods | Big ellipsoid (scaled sphere), 2 cylinder pods, box gondola |
| `magmaSlug` | Magma Slug | L07 | Hazard maker | Slow, fire-immune, leaves a burning trail, bursts into a lava pool | Kill at range, goo cools the trail | Three spheres in a row |
| `nullifier` | Nullifier Agent | L08 | Anti-magic | Projects a 9 m field where spells fizzle and mana does not regenerate | Guns; kill it first | `sahil` model tinted, cylinder backpack, disc field |
| `shieldDrone` | Shield Drone | L08 | Support (air) | Hovers behind a squad and gives one ally a front shield | Shoot the drone | Sphere body, disc shield |
| `cabinetMimic` | Filing Cabinet Mimic | L08 | Ambush | Looks like an ammo crate until you are 3 m away | Shoot crates that hum | Box with a hinged box lid |
| `ruinSentinel` | Ruin Sentinel | L09 | Golem heavy | Slow stone golem; its core glows only while it winds up a slam | Shoot the core in the window; Time Bubble widens it | 5 stacked boxes, sphere core |
| `moonCultist` | Moon Cultist | L09 | Summoner | Opens a small portal that brings 3 Midgets every 8 s until the portal is shot | Shoot the portal ring | `sahil` model tinted, disc portal |
| `tinubuImp` | Tinubu Imp | L10 | Elite charger | A Mini Tinubu that leaves fire where it charged and explodes on death | Sidestep, make it hit walls, stay off the trail | `tinubu` model at 0.6 scale, cone horns |

### 5.4 Spawn methods (what a level document may use)

Every squad in a level document names one.

| Method | What the player sees | Telegraph |
|---|---|---|
| `placed` | Already there, idle or patrolling, unaware until alerted | None; reward for a sneak shot |
| `door` | Runs out of a door, cave, alley or vent | Door opens, 0.5 s light |
| `drop` | Drop pod or rope from above | Shadow ring for 1.2 s |
| `burrow` | Bursts from a mound, grate or floor tile | Dust for 0.6 s |
| `air` | Flies in over a wall or from the sky | Engine sound, 1 s |
| `hidden` | Steps out from behind cover or a window | None, but always in front of the player |
| `portal` | Walks out of a moon gate or boss portal | Ring glow for 1 s |
| `vehicle` | Unloads from a van or blimp | The vehicle arrives first |
| `summon` | A boss or nest makes it | The summoner's animation |

### 5.5 Triggers (when a squad spawns)

`onEnter` (the player crosses a volume), `t+N` (N seconds after the encounter starts),
`onKills(n)` (after n kills in this encounter), `onRemain(n)` (when n are left alive),
`onSwitch(id)`, `onHold(p%)` (hold or objective progress), `onBossHp(p%)`, `onPartDestroyed(id)`,
`onAlert` (a placed squad noticed the player).

### 5.6 Lockdown arenas (doors close until every wave is dead)

A lockdown is a semi-large room or yard that seals when the player walks in and opens only when
every wave in it is dead. Every level has them. They are the level's set-piece fights.

| Rule | Value |
|---|---|
| How many | **3 or 4 per level**, spread across sections, never two back to back. A boss or mini-boss arena is also a lockdown and counts as one of them |
| Size | **Semi-large**: between 40 × 40 m and 80 × 80 m of floor. Not a corridor, not an open field |
| Shape | At least two height levels (a balcony, a roof, a pit) or at least 8 pieces of cover, and room to circle |
| Entrances for enemies | At least 3 named spawn points on different sides (doors, vents, roofs, mounds, portals) |
| Waves | **3 to 5 waves**, 25 to 45 enemies in all, 2 to 3.5 minutes. A boss or mini-boss lockdown follows §9 instead: its parts are its waves |
| Start | The player crosses a threshold 6 m inside the room. One second later the entry door drops behind them and the exit door locks. The door never closes on a player standing in it: it pushes them in |
| Next wave | `onRemain(2)` of the wave before. As a fallback, 40 s after the wave started if fewer than half of `maxAlive` are alive. A new wave never pushes the room past `maxAlive` or past the level's roles-at-once limit |
| End | Last enemy dead: both doors open, a checkpoint saves, and a reward appears (ammo crate, mana bloom or health) |
| No escape | The doors are full-height slabs. Blink, Magic Carpet, jump pads and the jetpack cannot leave: the room has a ceiling or a lid (a force field, a dome, a fire curtain) that the player, flyers and spells all respect, and Blink fails against a locked door |
| No stalling | Every enemy must be able to reach or shoot the player. Flyers stay inside the room's volume. If the last 2 enemies of a wave live more than 12 s, they are marked on the HUD and run at the player |
| Dying | A checkpoint sits just outside the entry door. Dying restarts the lockdown at wave 1 with the doors open |
| Tools | Any gun, ammo or spell object the lockdown needs is inside the room |
| HUD | "LOCKDOWN" banner, wave counter "2 / 4", enemies remaining |
| Look | Door = a box slab 0.6 m thick with `neon` trim: red while locked, green when open. The threshold is a `disc` line on the floor |

In level data a lockdown is a `lockdown` mechanism that names its entry door, its exit door and its
encounter. The encounter's objective is `clearAll` and its squads are the waves. A level document
marks each lockdown in its overview map with **[L]**, gives the room's blockout, and writes the
wave table like any other spawn timeline.

---

## 6. Magic

### 6.1 What exists

Five spells in `src/data/skills.js`, unlocked by Magic skill level: Goo Bolt (1), Chain Zap (3),
Sproto Swarm (6), Mana Shield (8), Meteor Bonk (10). Mana 100, regen 5/s plus 1 per Magic level.
Spell damage is ×(1 + 0.08 per Magic level) in `src/sim/combat.js`. Magic XP comes from casting,
spell kills and Magic bosses. The old plan adds five boss reward spells (B §6). None of them is built.

### 6.2 Changes

**Magic has no skill levels.** The Magic skill, its XP and its level gates are removed. A spell is
an **unlockable**: you get it at a spell shrine in a campaign level or from a boss, and you keep it
for good. The spellbook is saved in the profile and is available in every mode; a new profile has
Goo Bolt only. What the level bonus used to do is replaced like this:

| Was | Now |
|---|---|
| Spells unlock at Magic level 1, 3, 6, 8, 10 | Spells unlock at shrines and from bosses (schedule below) |
| Spell damage +8% per Magic level | Spell damage scales with the level's tier, on the same 1.15 curve as enemy HP, so a spell stays as strong against a tier-9 enemy as against a tier-1 one |
| Mana regen +1/s per Magic level | **Mana Battery**: one hidden in every level. Each gives +10 max mana and +0.5 mana/s (100 → 200 mana and 5 → 10 /s across the campaign) |
| Magic XP for casting and spell kills | Nothing. Casting is its own reward |
| Magic bosses give Magic XP | Bosses give their reward spell |

**Reworked spells** (same ids; numbers are a first pass)

| Spell | Today | Change |
|---|---|---|
| Goo Bolt | 25 damage, slow | Also leaves a 3 m goo puddle for 4 s. Gooed targets are **Conductive**: Chain Zap jumps 1.5× farther to them and does +50%. Goo **jams** mechanisms for 4 s (crushers, turrets, conveyor rollers, fans) and softens Bark armour |
| Chain Zap | 40 damage, 4 chains | Powers **conduits** (a switch you shoot with a spell), pops Hex Acolyte bubbles, stuns riot shields and Shield Drones 2 s, sets off barrels along the chain |
| Sproto Swarm | 5 buddies, 8 s | Buddies stand on **pressure plates** and hold **capture zones** for you. Look at a target and cast again to send them at it |
| Mana Shield | Mana absorbs 60% | While on, mana drain auras and Nullifier fields weaken it instead of you (the shield takes the drain) |
| Meteor Bonk | All mana, 300 damage | Costs 60 mana minimum and scales with mana spent. Breaks `fragile` walls and vehicle armour for 6 s |

**New shrine spells**

| Spell | Shrine | Mana | Cooldown | What it does | Rule-1 note |
|---|---|---|---|---|---|
| **Yeet** | L03 | 20 | 3 s | A 7 m cone shove: enemies fly 8 m, slow projectiles turn round, barrels and seed pods launch | Force only |
| **Decoy** ("Cardboard Sproto") | L05 | 30 | 12 s | A standee that draws fire for 6 s, then pops into confetti (20 damage, 3 m). Snipers and Spotter Drones lock onto it | Perception only |
| **Yoink** | L07 | 15 | 2 s | Grab a barrel, charge pack, bomb or a small enemy at up to 18 m and hold it; cast again to throw it | Force only |
| **Blink** ("Tax Evasion") | L08 | 25 | 4 s | Teleport 9 m along your aim. Passes laser grids, glass rails and gaps. 0.3 s invulnerable | Movement only |
| **Time Bubble** ("Audit Extension") | L09 | 45 | 20 s | A sphere of 6 m radius for 5 s: enemies inside move, wind up and count their timers at 30%, and enemy projectiles fly at 30%. Player bullets are unaffected | Never gun stats |

**Boss reward spells** stay as B §6: Magic Carpet (L02), Pump It (L04), Vape Cloud (L06), Lock-On (L08),
Hellfire Breath (L10).

**Schedule: what the player holds at the start of each level**

| Level | New in this level | Total by the end |
|---|---|---|
| L01 | Goo Bolt (taught at a shrine in section 2) | 1 |
| L02 | Chain Zap (shrine), Magic Carpet (Sahil) | 3 |
| L03 | Yeet (shrine, start), Sproto Swarm (shrine, middle) | 5 |
| L04 | Mana Shield (shrine), Pump It (the Duo) | 7 |
| L05 | Decoy (shrine) | 8 |
| L06 | Meteor Bonk (shrine), Vape Cloud (Broccoli Head) | 10 |
| L07 | Yoink (shrine) | 11 |
| L08 | Blink (shrine), Lock-On (Glowie) | 13 |
| L09 | Time Bubble (shrine) | 14 |
| L10 | Hellfire Breath (Tinubu, for replays) | 15 |

**Spell loadout.** RMB / LT casts the selected spell and Q / LB cycles, as today. The four quick-cast
keys (Y Z X T, D-pad) become **four slots you assign** at a depot or on the pause screen. This
replaces the old plan's single Boss Spell slot on Y, which now collides with the Chain Zap quick cast.

**World objects that react to magic**

| Object | Reacts to | Effect |
|---|---|---|
| `conduit` | Chain Zap | Counts as a switch; lights a path, opens a door, powers a lift |
| `gooGear` | Goo Bolt | Jams a crusher, fan, turret or conveyor for 4 s |
| `pressurePlate` | Player weight or a Sproto Swarm buddy | Holds a door or bridge while occupied |
| `seedPod` / `barrel` | Yeet, Yoink | Launches or carries it; it explodes on impact |
| `fragileWall` | Meteor Bonk, bazooka, charge pack | Breaks; opens a shortcut or a secret |
| `manaBloom` | Walking through it | Refills 50 mana, regrows in 20 s |
| `nullZone` | — | Spells fizzle inside (L08 mechanic) |
| `spellShrine` | Interact | Grants a spell, refills mana, saves a checkpoint |

---

## 7. Unlockables, weapon drops, ammo and explosives

### 7.1 What is removed from the game

Crafting goes completely, in every mode. Magic skill levels go with it (§6.2).

| Removed | Where it lives today | What replaces it |
|---|---|---|
| Crafting skill, its XP and its six perks (T1 to T5 recipes, Salvage, Master Forger) | `src/data/skills.js`, `src/sim/progression.js` | Nothing. Two skills remain: Health and Gunslinger |
| Recipes for guns, ammo and medkits | `src/data/recipes.js`, `src/sim/economy.js` | Guns drop; ammo and medkits are picked up or bought |
| Weapon Boxes (the crafting box) and their panel | `TUNING.weaponBoxes`, `src/sim/state.js`, `src/sim/collision.js` `pushOutOfBoxes`, `src/ui/ui.js`, `src/render/frame/present.js` | Removed from the arena and from campaign depots |
| Resources: Scrap, Springs, Goo, Plating, Boss Cores, Mana Crystals | `src/data/drops.js` (every table), the `resources` vending outcome in `src/data/shop.js`, the HUD counters | Enemies drop ammo, health, mana, tickets and guns only |
| Choosing a gun's element or part, salvage, stat reroll | Crafting perks | The drop decides. A better gun is found, not made |
| Magic skill, Magic XP, Magic level gates | `src/data/skills.js` `SKILLS.magic`, `XP.magic`, `PERKS`; `src/sim/progression.js`; `src/sim/combat.js` | Spell unlockables (§6.2) |

The ticket shop stays (between waves, between campaign levels and at depots): it sells guns, ammo
and medkits for tickets. Health and Gunslinger keep their use-based levels and perks.

### 7.2 What you unlock in campaign levels

| Unlockable | How you get it | Kept |
|---|---|---|
| **Spell** | A spell shrine in a level, or a boss's reward spell | For good, every mode |
| **Mana Battery** | Hidden, one per level | For good |
| **Gun type** | The first time you pick that type up (a rack, a cache or a drop). From then on that type is in the drop pool | For good |
| **Gun** | A drop, a rack, a cache, a lockdown reward, a boss | Carried from level to level until you swap it |
| **Golden Bonk modifier** | Hidden, one per level | For good (toggle on replays) |
| **Audit File** | Hidden, three per level | For good (tickets and a line of story) |

### 7.3 Weapons as drops

A drop is a different gun, or the same gun at a better **tier** (quality: Common, Uncommon, Rare,
Epic, Legendary, as in `src/data/guns.js`). The gun generator and its stats are not changed; the
plan only changes where guns come from and the odds.

**Where guns come from**

| Source | What it gives |
|---|---|
| Weapon rack or cache (placed) | A fixed type at the level's base tier. Always the same gun for the same rack. Placed where an encounter needs that type |
| Enemy drop | Small chance per kill (today 2% to 10% by enemy). Any unlocked type, tier rolled from the level's table |
| Elite | Always drops one gun, rolled one tier step up |
| Lockdown reward | A chest when the doors open: one gun, never below the level's base tier, of a type the player does not carry if possible |
| Mini-boss | Two guns, one of them guaranteed one tier above the level's base |
| Boss | Two guns one tier above base, plus a **boss gun** (Ray Gun, Big Bullets), as today |
| Secret cache | One per level: a guaranteed gun at the level's best tier |

**Tier odds by level** (enemy drops; percent)

| Level | Base tier (racks) | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|---|
| L01 | Common | 85 | 15 | 0 | 0 | 0 |
| L02 | Common | 65 | 30 | 5 | 0 | 0 |
| L03 | Uncommon | 45 | 40 | 14 | 1 | 0 |
| L04 | Uncommon | 30 | 45 | 22 | 3 | 0 |
| L05 | Uncommon | 20 | 42 | 30 | 7 | 1 |
| L06 | Rare | 10 | 35 | 40 | 13 | 2 |
| L07 | Rare | 5 | 27 | 43 | 21 | 4 |
| L08 | Rare | 0 | 20 | 44 | 29 | 7 |
| L09 | Epic | 0 | 12 | 40 | 37 | 11 |
| L10 | Epic | 0 | 5 | 35 | 44 | 16 |

Racks used to be Common everywhere (C §3.11). They now follow the base tier, so a rack is never a
downgrade. Elements, manufacturers, parts and wacky Legendary perks roll as they do today.

**Gun types and when they first appear**

| Type | First found | Notes |
|---|---|---|
| Machine Gun | L01, start | |
| Shotgun | L01, rack before the alley | |
| Sniper | L02, canyon rim rack | Headline in L05 |
| Bazooka | L02, rack in the boss section | Headline in L06 |
| Ray Gun, Big Bullets | L02, Sahil's boss-gun drop | Boss guns, as today |
| Duck Gun | L04 secret cache | Always Legendary |
| Lob-o-Matic, Zap Ray, Pocket Bonker (COOP_PLAN §6.3b) | L07, L04, L01 if they have landed | Optional; no level depends on them |

**Comparing and swapping.** Walking over a gun shows the compare card (it exists today). Hold reload
to swap it into the active slot; the old gun drops and stays for 120 s. Four slots plus the
Legendary slot, as today.

### 7.4 Ammo and ammo pick-ups

Every gun uses ammo you have to find. Ammo is no longer crafted, and no reserve is endless.

| Ammo | Guns | Carry cap | Small box | Enemy drop |
|---|---|---|---|---|
| Bullets | Machine Gun | 480 | 60 | 45 |
| Shells | Shotgun | 64 | 12 | 8 |
| Sniper rounds | Sniper | 36 | 8 | 5 |
| Rockets | Bazooka | 12 | 3 | 2 |
| Energy cells | Ray Gun | 300 | 60 | 30 |
| Heavy rounds | Big Bullets | 40 | 8 | 4 |
| Rubber | Duck Gun | 80 | 16 | 8 |

The caps and enemy-drop sizes for the first four are today's `TUNING.ammoCap` and `TUNING.ammoDrop`.
The Machine Gun and the boss guns lose `infiniteReserve`; that is a gun-definition change and
moves the content fingerprint (§12).

**Ammo pick-ups**

| Pick-up | Behaviour | Look (primitives) |
|---|---|---|
| **Ammo box** (small) | One ammo type. Walk over it to take it; it stays if you are full. Placed by the level along the route | Box 0.5 m in the ammo's colour with a `neon` stripe |
| **Ammo crate** (big) | Refills every ammo type you carry to 50% of cap. Three uses. Interact to open | Box 1.2 × 0.8 × 0.8 m, `crate` with a lid box |
| **Depot crate** | Unlimited. At depots and inside every boss section | Two stacked crates and a `neon` sign |
| **Rocket Crate** | Rockets to the cap, once | Long box with cone ends |
| **Enemy drop** | A small pack of one type, magnet pick-up as today, gone after 30 s | Small box |

**Rules**

- **Smart drops.** An enemy's ammo drop is for a gun you carry, weighted toward the type you are
  lowest on. You never get ammo for a gun you do not have.
- **Placement.** An ammo box for a gun type is within 30 m of every rack of that type and within
  20 m before every encounter that needs it. Every lockdown has at least two ammo boxes inside
  and an ammo crate as part of its reward. Every checkpoint has an ammo box next to it.
- **Never stuck.** If every gun you carry is empty for 5 s, a supply drone drops one box of bullets
  (or of your first gun's ammo) at your feet. At most once every 30 s. Spells still work without ammo.
- **Boss sections.** A verified boss run starts with the starter machine gun, which is no longer
  endless, so every boss section `SB` has a depot crate.
- **Per-level budget.** A level document lists every ammo box and crate with its position, and shows
  that the headline gun has enough: placed ammo plus expected drops is at least 1.5 times what the
  level's encounters ask of it.

### 7.5 Explosives kit (no new input: everything uses Fire, Interact and spells)

| Item | Behaviour |
|---|---|
| Barrel | 30 HP. Explodes at 4 m for 60 to enemies and 25 to the player, with an element: fire (burn pool 4 s), shock (stun 1.5 s), goo (slow puddle 5 s). Chains. Today's barrel only emits an event |
| Gas line | A pipe segment with a valve. Shoot the valve: a 6 s jet of fire across a corridor. Shoot the pipe: it bursts along its whole length |
| Charge pack | Carried in one hand (Interact to pick up, Interact at a marked point to plant, shoot it to detonate). 8 m blast, breaks `fragile` walls and destructible targets. You run 15% slower while carrying one and it explodes if you take a hit over 20 |
| Proximity mine | Placed by the level or by enemies. 0.5 s chime, 3 m blast. Shoot it from range or Yoink it |
| Ore cart | A cart on a short rail. Shoot the brake and it rolls downhill and explodes on impact |
| Destructible target | Generators, reactors, engines, armour plates. Has HP and weak spots, no AI |

### 7.6 Power-ups

Overshield, Sproto Camo, Turbo, Infinite Fuel (C §3.11). New: **Rocket Crate** (L06, L07, L10) and
**Mana Surge** (20 s of 4× mana regen; L03, L09, L10).

### 7.7 Depots

A depot is a safe room with a depot crate (unlimited ammo), a health station, the spell loadout
bench, the ticket shop terminal and a checkpoint. It has **no Weapon Box**. Two per level.

---

## 8. Mechanisms

The catalog in C §3.9 stands: door, switch, barrel, kill volume and void rescue, jump pad, mover,
collapsing bridge, hazard zones, geyser, conveyor, crusher, laser grid, zipline, portal, gravity
well, energy bridge, rotating platform, cracking tiles, rising hazard, rail ride, emplacement, fuel
pad, depot, destructible target. This plan adds the magic objects in §6.2, the explosives in §7,
`lockdown` (§5.6: the doors of a semi-large arena seal until every wave is dead; every level),
`searchlight` (L05), `alarm` (L05, L08: reinforcements arrive if it is not cut), `capture zone`
(L09) and `escort` (a slow mover the player protects; L06 and L07 may use it).

---

## 9. Bosses with several parts

Every finale is built from **parts**. A level document writes its boss as a table of parts with HP,
attacks, the adds that arrive during the part, the arena change, and what ends the part.

**Kinds of part**

| Kind | Example |
|---|---|
| Phase | The boss changes model stage and attack set at an HP threshold |
| Destroyable part | Armour plates, engine pods, a shield generator, a weak spot that moves |
| Intermission | The boss leaves or shields itself; the player does a task (destroy pylons, survive adds, cross the arena) |
| Double fight | Two bodies with their own bars (the Duo, the Big Obama twins) |
| Arena shift | Floors drop, lava rises, cover breaks, the ring shrinks |
| Escape | The boss is dead and the level turns into a timed run |

**Rules**

- A boss fight has **3 to 5 parts** and lasts 4 to 5.5 minutes. A mini-boss has **2 or 3 parts** and
  lasts 2.5 to 3.5 minutes.
- Each part is taught by the level before the fight uses it.
- Adds arrive on a written schedule, never at random, and never more than `maxAlive` for the level.
- The Sproto Duel bosses keep their Duel attacks, powers and arena shifts (B §3). This plan adds
  parts **around** them: an entry part, intermissions and destroyable objects in the arena.
- Wave bosses used as mini-bosses (`monster`, `dragon`, `sprotoBeast`, `carMonster`, `moleMonster`,
  `hexAuditor`) keep their Wave Mode attacks and their Wave Mode data untouched. The campaign wraps
  each in a part script that may scale its HP (`hpScale`, so a 4,500 HP Sproto Beast fits 150 s),
  replace one action (a `summon` becomes a roar) and hook its transitions. Each needs an arena
  centre and radius instead of the global circle: the charge stops on walls and the Hex teleports
  about the room, not the world origin (§10 E12).

**Constraint from the hub.** A verified boss run starts in the boss section with the starter machine
gun and level-1 skills (`docs/shooter-server-contract.md`). So every boss part must be beatable with
that loadout, and anything a part needs (a rack, a conduit, a rocket crate) must be **inside the boss
section**. Boss HP is in the content fingerprint; changing it is a re-pin (§12).

---

## 10. Engine work the levels depend on

Level documents cite these ids in their "engine needs" section.

| Id | Work | Today | Source spec |
|---|---|---|---|
| **E1** | World collision: solids for player, enemies, projectiles and pick-ups; ground height; step-up 0.4 m; kill planes and void rescue | none in campaign | C §3.4 |
| **E2** | World raycasts: hitscan stopped by solids, `hasLOS`, enemy perception (sight, hearing, alert states), cover queries | ground plane only | C §3.5 |
| **E3** | Navigation: baked grid per section, nav links for pads, lifts and portals, 3D flyer steering | none | C §3.6, §3.7 |
| **E4** | Level format v2: free-form sections, several squads per encounter with triggers (§5.5) and spawn methods (§5.4), objectives `clearAll`, `reach`, `switch`, `hold`, `destroy`, `survive`, `capture`, `escort`, `escape`, `boss`; lockdown arenas with sealed doors, wave counter and anti-stall (§5.6) | one squad, two objectives | C §3.2, §3.8 |
| **E5** | Rendering big sections: merged static meshes, new primitives and materials, prefab instancing, culling, the placeholder-enemy `look` view | boxes and cylinders, one mesh each | C §3.15 |
| **E6** | Mechanisms with real behaviour (§8) | proximity stubs | C §3.9 |
| **E7** | Enemy archetype framework with the data-driven attack runner; real behaviour for the 13 re-skins | re-skins | C §3.12, COOP_PLAN §6.3 |
| **E8** | The new placeholder enemies in §5.3 | — | this plan |
| **E9** | Jetpack v2: fuel regen, hover, ceiling, fuel pads | hold to rise | C §3.10 |
| **E10** | Magic v2: shrines, reworked and new spells, world objects, the four-slot loadout, reward spells | 5 spells | §6, B §6 |
| **E11** | Explosives kit (§7.5) | barrel event only | this plan |
| **E12** | Boss part scripts; Sproto Duel boss ports; wave bosses in walled arenas | generic boss tick | §9, B §2 to §5 |
| **E13** | Campaign meta: carry-over, depots (§7.7, no Weapon Box), difficulty, profile, objective marker, checkpoint toast, boss bars with part pips, timers, cutscene cards | partly | C §3.14, §3.16 |
| **E14** | Tools: validator with reachability and the §3 pacing estimate, top-down map export, nav-following autopilot bot, debug fly and teleport | basic validator, straight-line bot | C §4 |
| **E15** | Pins and the hub contract (§12) | — | AGENTS.md |
| **E16** | Remove crafting game-wide: Crafting skill, recipes, Weapon Boxes, resources, their UI and HUD; remove the Magic skill and its XP; spellbook unlockables in the profile (§6.2, §7.1) | all present | this plan |
| **E17** | Loot and ammo: tier odds by level, guaranteed drops (elite, lockdown chest, mini-boss, boss, secret cache), gun-type unlocks, ammo for every gun, ammo boxes and crates, smart drops, the supply drone (§7.3, §7.4) | drops by enemy, endless MG | this plan |

---

## 11. Build order

1. **Engine track** (serial where it must be): **E16 first** (it is a removal, it re-pins Wave Mode once, and everything after builds on the smaller game), then E1 → E2 → E3 → E4 and E5 → E6 and E7 → E8 to E13 and E17. E14 runs alongside from E4.
2. **Vertical slice:** build L01 alone on E1 to E7. It proves the 18-minute pacing estimate against a real
   playthrough. Fix the estimate table in §3 before the other nine start.
3. **Level track, one agent per level, in parallel.** Each agent owns `src/data/levels/LNN/` and nothing
   else, works on its own branch `<agent>/campaign-lNN`, and follows its level document. Blockout
   with primitives first, then encounters, then mechanisms, then the finale.
4. **Boss track** in parallel with the levels: one agent per boss (B §9).
5. **Tuning pass** per level from playtests, changing level data only.
6. **One pin PR** at the end of each merged batch (§12).

---

## 12. Pins this plan moves

| Pin | Moves when | What to do |
|---|---|---|
| Campaign content fingerprint `3c657fb5` | Boss encounter ids, section starts or units change; boss HP changes; any spell number changes (`SPELLS` is in `contentBody`); `TUNING` changes (removing `weaponBoxes`); gun definitions change (`infiniteReserve` removed from the Machine Gun and boss guns) | Update `CANONICAL_BOSSES` in `src/data/serverManifest.js`, `tests/pvp-sim.test.js`, `tests/fixtures/boss-goldens.json`, `docs/shooter-server-contract.md`; run `npm run build:server-sim`; re-vendor in metaverse-hub |
| Wave Mode and Sandbox hashes | **Once**, in the E16 PR: crafting, Weapon Boxes, resources and the Magic skill leave the arena state; finite Machine Gun ammo changes Wave Mode play | Re-pin `tests/fixtures/baseline-hashes.json` in that PR and say so. After it, they must not move: new player and level state is created lazily in campaign mode only |
| PvP fingerprint `f5949631` and golden `ce272de1` | Must **not** move | Do not touch `src/sim/pvp/`. If a shared `src/sim` module must change, prove the PvP goldens still pass |

Every boss level keeps a dedicated boss section named **`SB`** with one boss encounter **`SB-BOSS`**,
so the canonical table changes once and then stays put.

---

## 13. Definition of done for a level

- The validator passes, including reachability from every checkpoint and the pacing estimate within ±2 minutes of par.
- The autopilot bot finishes the level in god mode, and the run is deterministic for a fixed seed.
- A human playthrough on Normal lands within ±3 minutes of par.
- Every encounter has at least two approaches and three pieces of cover in its first 15 m.
- Every tool an encounter needs is within 40 m of its start, with ammo within 30 m.
- A top-down map export is in the PR.
- `npm run lint`, `typecheck`, `test`, `build`, `assets:check`, `budgets` and `profile:check` pass.

---

## 14. Level document template

Every file in `docs/campaign/levels/` has these sections, in this order.

1. **Header table**: stage, lighting, tier, par, jetpack, enemy total, route length, sections, finale.
2. **Concept**: what the level is and how it plays differently from the others. Cutscene card text.
3. **What the player has and learns**: guns expected, spells held, and this level's **unlockables**: the new spell and its shrine, new gun types, the Mana Battery.
4. **Time budget**: one row per beat with its estimate from §3. The rows sum to the par.
5. **Overview map**: ASCII, all sections, the route, checkpoints, depots.
6. **Sections**: for each one, footprint, an ASCII map, and a **blockout table** of primitives
   (id, shape, size, position, material, purpose), mechanisms, the transition out.
7. **Prefabs**: each with its parts.
8. **Encounters**: for each one, the space, the objective, and a **spawn timeline**: one row per
   squad with trigger (§5.5), spawn method (§5.4), where from, enemy types and counts, and what it
   teaches or tests. Then `maxAlive`, weapons and ammo nearby, and the estimated minutes.
   Mark the 3 or 4 **lockdown arenas** (§5.6) and give each its room size, doors, spawn points and waves.
9. **New enemies**: full stat block and primitive look for any enemy this level introduces.
10. **Finale**: the mini-boss or boss as a **parts table** (§9): HP, attacks, adds, arena change, what ends the part.
11. **Mechanisms, magic and explosives used**, with what is new to this level.
12. **Checkpoints, depots, weapons, loot, ammo, power-ups, secrets**: racks and caches; the **loot table** (tier odds from §7.3 and every guaranteed drop: elites, lockdown chests, mini-boss, boss, secret cache); every **ammo box and crate** with its position and the ammo budget (§7.4); Golden Bonk, Mana Battery, 3 Audit Files. No Weapon Box, no crafting resources.
13. **Difficulty**: how this level is harder than the one before, and the Easy and Heroic changes.
14. **Engine needs**: which of E1 to E15 it uses, and anything it needs that §10 lacks.
15. **Bot route and tests**.
16. **Build tasks**: the ordered task list for the agent that will build this level.
