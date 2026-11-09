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

**Hard rules**

- `src/sim` and `src/data` stay pure (`tests/architecture.test.js`). Level data is plain data.
- **Gun stats are never changed by campaign systems** (CODEX_PLAN ground rule 1). Power-ups,
  modifiers and spells never edit a gun.
- **Wave Mode and Sandbox stay bit-identical.** The hashes in `tests/fixtures/baseline-hashes.json`
  do not move. New campaign state is created lazily so the arena state shape does not change.
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

- 4 to 6 **sections**. Only the current section is loaded (C §3.19). A section lasts 3 to 6 minutes.
- 10 to 13 **beats**: 7 to 9 combat encounters, 2 or 3 traversal or mechanism beats, 1 or 2
  breathers at a depot, 1 finale.
- Route length 1.0 to 1.6 km. The player walks at 6.5 m/s and sprints at 9.5 m/s; budget **5.5 m/s** average.
- 8 to 10 checkpoints (never more than 2.5 minutes apart), 2 depots (mid level and before the finale).
- 1 Golden Bonk (the old modifier table in C-level-designs §1.4 stays) and 3 optional **Audit Files**
  (tickets and a line of story each).

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
| Elite of any type | ×2 |
| Mini-boss | 150 to 210 |
| Boss | 240 to 330 |
| Traversal | metres ÷ 5.5 |
| Switch, puzzle, hold, ride | stated per beat |
| Depot breather | 45 to 60 |

Combat beats add **30%** on top of the enemy sum for reloads, repositioning and wave delays.
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

**Enemy budget per level** (totals, Normal): L01 120 to 140, L02 and L03 160 to 180, L04 and L05
150 to 170, L06 180 to 200, L07 190 to 210, L08 200 to 220, L09 220 to 250, L10 230 to 260.

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
- Each section has its own local origin at its south-west ground corner. The assembler offsets it.
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

---

## 6. Magic

### 6.1 What exists

Five spells in `src/data/skills.js`, unlocked by Magic skill level: Goo Bolt (1), Chain Zap (3),
Sproto Swarm (6), Mana Shield (8), Meteor Bonk (10). Mana 100, regen 5/s plus 1 per Magic level.
The old plan adds five boss reward spells (B §6). None of the reward spells is built.

### 6.2 Changes

**Shrines grant spells in the campaign.** A spell shrine sets the perk directly, whatever the Magic
level, so a level can rely on its spell. Magic level still raises spell damage. Wave Mode keeps
unlocking by level, unchanged.

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
| **Time Bubble** ("Audit Extension") | L09 | 45 | 20 s | A 6 m sphere for 5 s: enemies and enemy projectiles inside move at 30%. Player bullets are unaffected | Never gun stats |

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

## 7. Guns, explosives and pick-ups

**World guns** stay as C §3.11: the four basic types, common quality, on racks and in caches, each
with a `why`. Loot drops, Weapon Boxes and the shop stay on. Guns, skills, resources, tickets and
ammo carry from level to level.

**Explosives kit** (no new input: everything uses Fire, Interact and spells)

| Item | Behaviour |
|---|---|
| Barrel | 30 HP. Explodes at 4 m for 60 to enemies and 25 to the player, with an element: fire (burn pool 4 s), shock (stun 1.5 s), goo (slow puddle 5 s). Chains. Today's barrel only emits an event |
| Gas line | A pipe segment with a valve. Shoot the valve: a 6 s jet of fire across a corridor. Shoot the pipe: it bursts along its whole length |
| Charge pack | Carried in one hand (Interact to pick up, Interact at a marked point to plant, shoot it to detonate). 8 m blast, breaks `fragile` walls and destructible targets. You run 15% slower while carrying one and it explodes if you take a hit over 20 |
| Proximity mine | Placed by the level or by enemies. 0.5 s chime, 3 m blast. Shoot it from range or Yoink it |
| Ore cart | A cart on a short rail. Shoot the brake and it rolls downhill and explodes on impact |
| Destructible target | Generators, reactors, engines, armour plates. Has HP and weak spots, no AI |

The **Lob-o-Matic** grenade launcher from COOP_PLAN §6.3b fits L07. If it has landed by then, L07 puts
one on a rack; the level does not depend on it.

**Power-ups** (C §3.11): Overshield, Sproto Camo, Turbo, Infinite Fuel. New: **Rocket Crate** (refills
rockets to the cap; L06, L07, L10) and **Mana Surge** (20 s of 4× mana regen; L03, L09, L10).

---

## 8. Mechanisms

The catalog in C §3.9 stands: door, switch, barrel, kill volume and void rescue, jump pad, mover,
collapsing bridge, hazard zones, geyser, conveyor, crusher, laser grid, zipline, portal, gravity
well, energy bridge, rotating platform, cracking tiles, rising hazard, rail ride, emplacement, fuel
pad, depot, destructible target. This plan adds the magic objects in §6.2, the explosives in §7,
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
  `hexAuditor`) keep their Wave Mode data. The campaign wraps them in a part script and a walled
  arena. Their charge needs walls instead of the circle edge (§10 E12).

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
| **E4** | Level format v2: free-form sections, several squads per encounter with triggers (§5.5) and spawn methods (§5.4), objectives `clearAll`, `reach`, `switch`, `hold`, `destroy`, `survive`, `capture`, `escort`, `escape`, `boss` | one squad, two objectives | C §3.2, §3.8 |
| **E5** | Rendering big sections: merged static meshes, new primitives and materials, prefab instancing, culling, the placeholder-enemy `look` view | boxes and cylinders, one mesh each | C §3.15 |
| **E6** | Mechanisms with real behaviour (§8) | proximity stubs | C §3.9 |
| **E7** | Enemy archetype framework with the data-driven attack runner; real behaviour for the 13 re-skins | re-skins | C §3.12, COOP_PLAN §6.3 |
| **E8** | The new placeholder enemies in §5.3 | — | this plan |
| **E9** | Jetpack v2: fuel regen, hover, ceiling, fuel pads | hold to rise | C §3.10 |
| **E10** | Magic v2: shrines, reworked and new spells, world objects, the four-slot loadout, reward spells | 5 spells | §6, B §6 |
| **E11** | Explosives kit (§7) | barrel event only | this plan |
| **E12** | Boss part scripts; Sproto Duel boss ports; wave bosses in walled arenas | generic boss tick | §9, B §2 to §5 |
| **E13** | Campaign meta: carry-over, depots with shop and Weapon Box, difficulty, profile, objective marker, checkpoint toast, boss bars with part pips, timers, cutscene cards | partly | C §3.14, §3.16 |
| **E14** | Tools: validator with reachability and the §3 pacing estimate, top-down map export, nav-following autopilot bot, debug fly and teleport | basic validator, straight-line bot | C §4 |
| **E15** | Pins and the hub contract (§12) | — | AGENTS.md |

---

## 11. Build order

1. **Engine track** (serial where it must be): E1 → E2 → E3 → E4 and E5 → E6 and E7 → E8 to E13. E14 runs alongside from E4.
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
| Campaign content fingerprint `3c657fb5` | Boss encounter ids, section starts or units change; boss HP changes; any spell number changes (`SPELLS` is in `contentBody`); `TUNING` changes | Update `CANONICAL_BOSSES` in `src/data/serverManifest.js`, `tests/pvp-sim.test.js`, `tests/fixtures/boss-goldens.json`, `docs/shooter-server-contract.md`; run `npm run build:server-sim`; re-vendor in metaverse-hub |
| Wave Mode and Sandbox hashes | Must **not** move | New player and level state is created lazily in campaign mode only |
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
3. **What the player has and learns**: guns expected, spells held, the new spell and where its shrine is.
4. **Time budget**: one row per beat with its estimate from §3. The rows sum to the par.
5. **Overview map**: ASCII, all sections, the route, checkpoints, depots.
6. **Sections**: for each one, footprint, an ASCII map, and a **blockout table** of primitives
   (id, shape, size, position, material, purpose), mechanisms, the transition out.
7. **Prefabs**: each with its parts.
8. **Encounters**: for each one, the space, the objective, and a **spawn timeline**: one row per
   squad with trigger (§5.5), spawn method (§5.4), where from, enemy types and counts, and what it
   teaches or tests. Then `maxAlive`, weapons and ammo nearby, and the estimated minutes.
9. **New enemies**: full stat block and primitive look for any enemy this level introduces.
10. **Finale**: the mini-boss or boss as a **parts table** (§9): HP, attacks, adds, arena change, what ends the part.
11. **Mechanisms, magic and explosives used**, with what is new to this level.
12. **Checkpoints, depots, weapons, power-ups, secrets** (Golden Bonk and 3 Audit Files).
13. **Difficulty**: how this level is harder than the one before, and the Easy and Heroic changes.
14. **Engine needs**: which of E1 to E15 it uses, and anything it needs that §10 lacks.
15. **Bot route and tests**.
16. **Build tasks**: the ordered task list for the agent that will build this level.
