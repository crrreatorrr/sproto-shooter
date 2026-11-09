# L01: Sproto Landing

Status: **plan only.** Follows the template in `docs/campaign/PLAN.md` §14 (cited as **PLAN §x**).
Replaces "L1: Sproto Landing" in `docs/codex/C-level-designs.md`.

## 1. Header

| Field | Value |
|---|---|
| Level id | `L01` |
| Stage | `city`, Los Angeles |
| Lighting | Dusk. Low orange sun in the west (the player walks east with it at their back), purple sky, neon signs and street lamps on. `neon` material marks the critical path |
| Tier | 1 |
| Par | 18 min. Estimate from §4: **19 min 3 s** |
| Jetpack | No |
| Enemy total (Normal) | **139**: 85 `midget`, 11 `obama`, 23 `flyingMidget`, 13 `robotLaser`, 5 `robotShooter`, 1 `bigObama`, 1 `gatekeeper` (mini-boss) |
| Route length | 1,031 m on the critical path (about 1,180 m with the generator loop in the finale) |
| Sections | 6: S1 Drop Zone, S2 Alley and Fire Escapes, S3 Mall of Sproto, S4 Parking Spiral, S5 Overpass, S6 Gate Plaza |
| Combat encounters | 9 (E1 to E9) and the finale `FIN` |
| Lockdown arenas (PLAN §5.6) | 3: **E6 Mall of Sproto** (66 × 50 m, two floors), **E8 Parking Roof** (60 × 60 m), **FIN Gate Plaza** (80 × 78 m) |
| Checkpoints, depots | 8 checkpoints, 2 depots |
| Finale | Mini-boss **Big Bitcoin Obama "The Gatekeeper"**, 3 parts, with a Security Bot escort |
| Unlockables | Spell: Goo Bolt. Gun types: Machine Gun, Shotgun. Mana Battery 1 of 10. Golden Bonk: Big Head Mode. 3 Audit Files |
| Loot | Racks are Common. Enemy drops 85% Common, 15% Uncommon. 5 guaranteed guns (§12) |
| Ammo | 33 ammo boxes, 4 ammo crates, 2 depot crates. Machine gun budget 2.6× (§12) |

## 2. Concept

L01 is the tutorial that does not feel like one. The player lands on a boulevard at sunset with one
machine gun and has to reach the city gate. Each stretch of the route asks for one new thing and
then mixes it with what came before: move, shoot from cover, hold a corridor against a swarm, use a
spell, look up, fight indoors on two floors, fight uphill, survive a sealed arena, kill a heavy
from behind.

What makes it different from the other nine levels: it has the lowest pressure in the campaign
(8 enemies alive, 2 threat roles, no elites, no hazards in fights), every enemy type is met alone
before it is mixed, and nothing needs a spell or a gun the level has not just handed over.

Each enemy is taught, tested and twisted:

| Enemy | Taught alone | Tested in a mix | Twisted |
|---|---|---|---|
| `midget` | E1, partying at a food truck | E3, corridor swarm from two ends | E7, pouring down a ramp; E4, into a goo puddle |
| `obama` | E2, behind a barricade | E2 with a midget flank | E7, firing down from a rail; E9, on the toll canopy |
| `flyingMidget` | E5, on a rooftop | E6 wave 3, indoors with midgets | E8, from two sides of a sealed roof; FIN part 3 |
| `robotLaser` | E6 wave 1, mall security | E6 wave 2, at the mezzanine rail above midgets | E8 wave 4, crossing a bridge; FIN part 1 |
| `robotShooter` | E7, guarding a generator across a 40 m deck | E8 wave 4, with Laser Bots | E9, at sniper range on the off-ramp; FIN part 1 |
| `bigObama` | E9, alone among stalled cars | — | FIN, as the Gatekeeper |

**Cutscene cards**

- Opening: **"SPROTO LANDING"** / *"Los Angeles. Dusk."* / *"The Bitcoin Tax Empire has shut the city gate."* / *"You have one machine gun and a bad attitude."*
- S6 intro (kept from the current data): **"Gate Plaza"** / *"A Big Bitcoin Obama is counting the take."* / *"The gate does not open until he drops it."*
- End: **"GATE OPEN"** / *"The road east runs through Sahil's bazaar."* / *"He launders the Empire's rugs. Take his carpet."*

**Vista.** A giant inflatable Tinubu (two spheres and a cone, 30 m tall) drifts over downtown, and
a hillside sign reads SPROTOWOOD (10 boxes). The gate towers carry a `neon` strip and are visible
from S1, S2's roofs and S5 as two tall boxes placed in each section's backdrop.

## 3. What the player has and learns

| Item | Where | Notes |
|---|---|---|
| **Machine Gun** (gun type unlock) | Start | Common. Starts with 36 in the magazine and **36 in reserve**, not the usual 240, so the ammo lesson happens in E1 (below) |
| **Shotgun** (gun type unlock) | Rack `S2-rack-sg` at the alley mouth, 12 m before E3's trigger | Common. `why: 'E3 corridor swarm'`. A second rack inside the finale arena |
| Sniper, Bazooka | None | Both are first found in L02 (PLAN §7.3). The S5 gantry is high ground for the machine gun, not a sniper perch |
| **Goo Bolt** (spell unlock) | Shrine `S2-shrine` in the Shrine Court, S2 | 15 mana, 25 damage, slow, 3 m puddle for 4 s (PLAN §6.2). The shrine refills mana and saves checkpoint CP3. Nothing before the shrine needs a spell |
| **Mana Battery** 1 of 10 | Hidden on the toll canopy in S5, `S5-battery` | +10 max mana, +0.5 mana/s, kept for good |
| Mana | 100, regen 5/s | 110 and 5.5/s with the battery. There are no Magic levels |
| Skills | Health and Gunslinger, level 1 | No Crafting, no Magic skill |

**How ammo is taught** (this is the level where the player learns that ammo is finite)

| Step | Where | What happens |
|---|---|---|
| 1. First box | `A1`, bullets, on a `neon` pad at (96, 30) in S1, in the middle of the road at the far lip of the sinkhole | Prompt: "AMMO BOX: walk over it." Reserve goes 36 → 96 |
| 2. Run low | E1 | Nine Midgets cost about 75 bullets. E1's enemies drop no ammo (`noAmmoDrop` on this one encounter), so the reserve falls under one magazine and the HUD flashes "LOW AMMO" |
| 3. Box in plain sight | `A2` and `A3`, bullets, at (127, 29) and (129, 31), 6 m past the food truck on a `neon` pad | Visible from anywhere in the fight. Prompt: "Out of ammo? Look for boxes." |
| 4. Drops | E2 | The first Obama killed drops a pack. Prompt: "Enemies drop ammo for the guns you carry." |
| 5. Crates and depots | E6 reward crate, Depot 1 | Prompt on first use: "Ammo crate: three uses." and "Depot crate: unlimited." |

If the player still runs dry, the supply drone (PLAN §7.4) drops bullets, and Goo Bolt needs no ammo.

**How Goo Bolt is taught and used**

| Step | Where | What happens |
|---|---|---|
| Teach | Shrine Court, E4 | Three cardboard standees stand between the shrine and the north gate. The gate is 3 m wide. Midgets come through it in single file while the player holds the shrine circle; one bolt on the gate slows the whole file |
| Mechanism | Mall revolving door `S2-revolve` | The door spins too fast to enter and shoves the player back. Goo jams it for 4 s (`gooGear`) |
| Goo spot 1 | E7, foot of each parking ramp | Midgets pour down an 8 m ramp. A puddle at the foot turns a rush into a queue |
| Goo spot 2 | E9, toll lanes | Midgets from the bus funnel through four 2.5 to 3 m lanes |
| Goo spot 3 | FIN part 2, tower doors | Each add wave leaves a 2.4 m door |

`obama` resists goo (`affinity.resist: 'goo'` in `src/data/enemies.js`). E9 shows it: the midgets
in the toll lanes stick, the Obamas on the canopy do not.

**Movement** is taught in the first 86 m with four obstacles (§6 S1): jump, double jump, slide,
dash. It is used again at the fire escapes and the roof gap (S2), the mezzanine (S3) and the
bandstand (S6).

**Mechanisms** the player learns here: ammo boxes and crates, doors, a switch, weapon racks,
checkpoints, fire and shock barrels, a hold zone, a destructible generator, a lift, an extending
bridge, depots, lockdown arenas and their reward chests.

## 4. Time budget

Seconds per enemy are from PLAN §3: midget 3, flyingMidget 5, obama 6, robotLaser 6, robotShooter 9,
bigObama 30. Combat = enemy seconds × 1.3. Traversal = metres ÷ 5.5. Mechanism time is stated.
**[L]** marks a lockdown arena.

| # | Beat | Section | Enemies | Enemy s | × 1.3 | Traversal | Mechanism | Beat total | Clock |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Movement course | S1 | — | 0 | 0 | 86 m = 15.6 s | 16 s (4 prompts × 4 s) | 31.6 s | 0:32 |
| 2 | E1 Block Party | S1 | 9 midget | 27 | 35.1 | 48 m = 8.7 s | — | 43.8 s | 1:15 |
| 3 | E2 Checkpoint | S1 | 5 obama, 3 midget | 39 | 50.7 | 78 m = 14.2 s | 4 s (switch) | 68.9 s | 2:24 |
| 4 | E3 Alley Cat | S2 | 12 midget | 36 | 46.8 | 55 m = 10.0 s | 5 s (rack) | 61.8 s | 3:26 |
| 5 | E4 Sticky Situation (hold 25 s, runs during the fight) | S2 | 8 midget | 24 | 31.2 | 33 m = 6.0 s | 15 s (shrine, standees) | 52.2 s | 4:18 |
| 6 | E5 Pigeons, then roofs and the revolving door | S2 | 6 flyingMidget | 30 | 39.0 | 132 m = 24.0 s | 8 s (goo the door) | 71.0 s | 5:29 |
| 7 | **[L]** E6 Mall Lockdown | S3 | 6 robotLaser, 13 midget, 4 flyingMidget, 2 obama | 107 | 139.1 | 100 m = 18.2 s | — | 157.3 s | 8:07 |
| 8 | Depot 1 | S3 | — | — | — | — | 45 s | 45.0 s | 8:52 |
| 9 | E7 Going Up | S4 | 9 midget, 2 obama, 1 robotShooter | 48 | 62.4 | 186 m = 33.8 s | 12 s (generator 6, lift 6) | 108.2 s | 10:40 |
| 10 | **[L]** E8 Roof Lockdown | S4 | 15 midget, 7 flyingMidget, 2 robotLaser, 1 robotShooter | 101 | 131.3 | 53 m = 9.6 s | — | 140.9 s | 13:01 |
| 11 | E9 Toll Booth | S5 | 1 bigObama, 4 midget, 2 obama, 1 robotLaser, 1 robotShooter | 69 | 89.7 | 190 m = 34.5 s | — | 124.2 s | 15:05 |
| 12 | Depot 2 | S6 | — | — | — | — | 45 s | 45.0 s | 15:50 |
| 13 | **[L]** FIN The Gatekeeper | S6 | mini-boss and 24 adds | — | 180 (stated: 65 + 60 + 55) | 70 m = 12.7 s | — | 192.7 s | 19:03 |
| | **Total** | | **139** | 481 | 625.3 | 1,031 m = 187.5 s | 60 s + 90 s depots | **1,142.8 s** | **19:03** |

Check: 625.3 + 187.5 + 60 + 90 + 180 = 1,142.8 s = 19 min 3 s. Par is 18 min; the limit is 20 min.

- 13 beats: 1 traversal beat, 9 combat encounters, 2 depots, 1 finale.
- The three lockdowns take 139 s, 131 s and 180 s. PLAN §5.6 asks for 120 to 210 s each.
- A fast replay (skips the prompts and the depots, knows the back battery) should land near 12.5 min.
- The gantry overlook, the Golden Bonk, the Mana Battery, the secret cache and the Audit Files are
  not in the budget. Ammo boxes are walk-over pick-ups and cost no time.
- If the vertical-slice playtest runs long, cut in this order: E9 squad C (−20 s), E6 wave 4's two
  Obamas (−16 s), E2 squad C (−16 s).

**Intensity** (rough, 0 to 1): E1 0.3, E2 0.4, E3 0.55, E4 0.4, E5 0.35, E6 0.75, E7 0.55, E8 0.8,
E9 0.7, FIN 0.95. No two beats above 0.8 are adjacent, and a depot sits before E7 and before FIN.

## 5. Overview map

North is up. World metres; about 8 m per character across and 16 m per row. Not to scale in detail:
the section tables are the reference.

```
 world x:  0        80       160       240       320       400       480
           |         |         |         |         |         |         |
 z= 80                          +-----------+
                                | S3  MALL  |d1 +-------+
                                | [L] E6    |==>| S4    |            +--------+
 z=112                          | 2 floors  |CP5| PARK  |==bridge===>| S5     |
                                |    CP4    |   | E7,CP6|            | OVER-  |
                                +-----^-----+   |[L]E8  |CP7         | PASS   |
 z=150                    +-----------+---+     +-------+            | E9 toll|
                          | forecourt (rev. door)                    +----+   |
                          | roofs  E5         |                           |   |
                          | Shrine Court      |                           | ga|  ga = sign gantry
 z=230                    |  E4  CP3 (shrine) |                           |   |
                          | alley  E3         |                       +---+ v +-----+
                          |   CP2 (rack)      |                       | d2  CP8     |
 z=300 +------------------+-------^-----+-----+                       |             |
       | S1 DROP ZONE                   |rubble                       | S6  GATE    |
       | start > course > E1 CP1 > E2 > |                             | PLAZA [L]   |
 z=360 +--------------------------------+                             | FIN         |
                                                                      +===GATE======+
```

| Section | Footprint (x × z) | World offset of its local origin | Floors | Entry (local) | Exit (local) |
|---|---|---|---|---|---|
| S1 Drop Zone | 220 × 60 | (0, 0, 300) | y 0 | start (12, 0, 30) | alley stub (208, 0, 0) |
| S2 Alley and Fire Escapes | 80 × 150 | (168, 0, 150) | y 0, roofs 9 and 10.5 | (40, 0, 150) | revolving door (58, 0, 0) |
| S3 Mall of Sproto | 110 × 70 | (181, 0, 80) | y 0 and 5 | (45, 0, 70) | service door (110, 0, 35) |
| S4 Parking Spiral | 92 × 60 | (291, 0, 85) | y 0, 4, 8, 12 | (0, 0, 30) | bridgehead (92, 12, 30) |
| S5 Overpass | 78 × 130 | (383, 0, 106) | y 12, ramp to 0 | (0, 12, 9) | apron (69, 0, 130) |
| S6 Gate Plaza | 88 × 100 | (408, 0, 236) | y 0 | (44, 0, 0) | gate (44, 0, 96) |

## 6. Sections

**Coordinates.** Metres, `+x` east, `+z` south, `y` up, yaw in degrees about Y with 0 facing `+z`
and 90 facing `+x`. Each section's local origin is its **north-west** ground corner, so every
coordinate is positive and the maps read with north up. (PLAN §4 says south-west; with `+z` south
that makes every z negative. See §14.)

**Table conventions.** `box`: size is x × y × z and `at` is the centre. `cylinder`: `at` is the base
centre. `ramp` and `stairs`: size is width × rise × run, `at` is the centre of the bounding box, and
the yaw is the direction it rises toward. Prefab: `at` is the base centre and the yaw is given after
it. Floors are 0.5 m slabs with their top at the stated level. Several positions in one row mean
several copies. Prefab parts are in §7.

### S1. Drop Zone: Sunset Sproto Boulevard

Footprint 220 × 60 m. A 24 m road (z 18 to 42) with a 4 m sidewalk each side and building fronts
behind. The player runs west to east. About 105 solids after prefabs expand.

```
      x=0        40        80        120       160       200   220
       |         |         |         |         |         |      |
 z=0   ###########################[NA]##################### a ####
 z=8   #### N1 ######### N2 ######## N3 ############ N4 ### a ####    a = alley stub to S2
 z=14  .........SSSSSSSSSSSSSSSS.....................bbbb..D1.####    S = scaffold, b = balcony (y 4)
 z=18  .....c...:..|...B...T..~~..c.....FFF....d..c...c...|.....XX    | barrier  B bus  T trailer
 z=30  (O)@>....:..|...B...T..~~....p..m*m*..c..1...p...p.#P.sw.XX    ~~ sinkhole  FFF food truck
 z=42  .......c.:..|...B...T..~~..c..........p..c.....c...|.....XX    * barrel  # barricade  P police car
 z=46  .........SSSSSSSSSSSSSSSS....[SA]...  .Ac=====.......[SB]...   A awning, c===== billboard walk
 z=52  ##### S1 ########### S2 #####    ####### S3 ########    # S4
 z=60  ###########################################################
       start    jump dbl slide dash    E1 Block Party   E2 Checkpoint
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S1-road-W | box | 84 × 0.5 × 24 | (42, −0.25, 30) | concrete | Road, x 0 to 84 |
| S1-pit-floor | box | 9 × 0.5 × 24 | (88.5, −2.25, 30) | dirt | Sinkhole floor, 2 m down, x 84 to 93 |
| S1-pit-ramp | ramp | 4 × 2 × 7, yaw 90 | (89.5, −1, 39.5) | dirt | Way out of the sinkhole (rises east). Falling in costs time, not health |
| S1-road-E | box | 127 × 0.5 × 24 | (156.5, −0.25, 30) | concrete | Road, x 93 to 220 |
| S1-walk-N, S1-walk-S | box | 220 × 0.7 × 4 | (110, −0.15, 16); (110, −0.15, 44) | stone | Sidewalks, top at y 0.2 |
| S1-west-rubble | box | 2 × 10 × 32 | (1, 5, 30) | concrete | Closes the west end |
| S1-east-rubble | box | 6 × 9 × 32 | (217, 4.5, 30) | concrete | Collapsed overpass. Closes the east end |
| S1-bN1 | box | 40 × 14 × 14 | (20, 7, 7) | stone | "Sproto Arms" apartments, x 0 to 40 |
| S1-bN2 | box | 56 × 18 × 14 | (68, 9, 7) | concrete | Building site, x 40 to 96 |
| S1-bN3a, S1-bN3b | box | 32.5 × 10 × 14; 18.5 × 10 × 14 | (112.25, 5, 7); (140.75, 5, 7) | stone | Shop row either side of spawn gap NA (x 128.5 to 131.5) |
| S1-bN4 | box | 55 × 16 × 14 | (177.5, 8, 7) | stone | "Bank of Tinubu", x 150 to 205 |
| S1-bN5 | box | 9 × 16 × 14 | (215.5, 8, 7) | stone | East of the alley, x 211 to 220 |
| S1-bS1 | box | 60 × 16 × 14 | (30, 8, 53) | stone | x 0 to 60 |
| S1-bS2 | box | 50.5 × 12 × 14 | (85.25, 6, 53) | stone | x 60 to 110.5 |
| S1-bS3 | box | 61 × 9 × 14 | (144, 4.5, 53) | stone | x 113.5 to 174.5. Carries the billboard |
| S1-bS4 | box | 42.5 × 14 × 14 | (198.75, 7, 53) | stone | x 177.5 to 220 |
| S1-gap-NA | prefab `city.spawnGap` | — | (130, 0.2, 14) yaw 0 | metal | "Taco Sproto" kitchen door. E1 squad B |
| S1-gap-SA | prefab `city.spawnGap` | — | (112, 0.2, 46) yaw 180 | metal | "Laundromat" door. E1 squad C |
| S1-gap-SB | prefab `city.spawnGap` | — | (176, 0.2, 46) yaw 180 | metal | "Pawn alley" door. E2 squad B |
| S1-alley-floor | box | 6 × 0.5 × 14 | (208, −0.25, 7) | concrete | Alley stub, x 205 to 211, z 0 to 14 |
| S1-pod | cylinder | r 1.6, h 3.2 | (8, 0, 30) | metal | Drop pod. Cone r 1.6 h 1.4 at (8, 3.2, 30); crater `disc` r 4.5 at (8, 0.02, 30) |
| S1-scaf-N, S1-scaf-S | box | 61 × 4 × 4 | (66.5, 2, 16); (66.5, 2, 44) | metal | Scaffolding on both sidewalks, x 36 to 97. Stops a walk-around. Its top (y 4) is a speedrun line from the bus roof |
| S1-t1-barrier | box | 0.6 × 1.0 × 24 | (44, 0.5, 30) | concrete | **Jump** (1.0 m; jump reaches 1.45) |
| S1-t2-bus | box | 3 × 2.2 × 24 | (58, 1.1, 30) | metal | **Double jump** (2.2 m; reaches 2.6). A bus on its side |
| S1-t3-trailer | box | 3 × 2.6 × 24 | (72, 2.4, 30) | metal | **Slide** under it: underside at y 1.1, top at 3.7 |
| S1-t3-cab, S1-t3-bogie | box | 3 × 1.1 × 2.5 | (72, 0.55, 19.25); (72, 0.55, 40.75) | metal | Hold the trailer up. Slide gap is z 20.5 to 39.5 |
| S1-t4 | (the sinkhole) | 9 m gap | x 84 to 93 | — | **Dash**: a sprint jump covers 6.9 m, a sprint jump with a dash or a double jump clears it |
| S1-prompt-1…4 | disc | r 1.2 | (40, 0.02, 30); (54, 0.02, 30); (68, 0.02, 30); (81, 0.02, 30) | neon | Prompt pads: Jump, Double jump, Sprint then Slide, Dash |
| S1-car-1…2 | prefab `city.car` | — | (22, 0, 24) yaw 80; (30, 0, 36) yaw 100 | metal | Dressing near the start |
| S1-car-3…5 | prefab `city.car` | — | (102, 0, 24) yaw 110; (106, 0, 36) yaw 75; (132, 0, 35) yaw 95 | metal | E1 cover |
| S1-plant-1…3 | prefab `city.planter` | — | (110, 0, 30) yaw 0; (114, 0, 21) yaw 0; (140, 0, 38) yaw 0 | concrete | E1 cover (1.2 m) |
| S1-truck | prefab `city.foodTruck` | — | (121, 0, 26) yaw 90 | metal | The party. Burning (a render-only flame) |
| S1-brl-1…2 | barrel (fire) | — | (117.5, 0, 29.5); (124.5, 0, 29.5) | — | By the party. One shot can kill four |
| S1-dump-1 | prefab `city.dumpster` | — | (137, 0, 19.5) yaw 90 | metal | E1 cover |
| S1-car-6 | prefab `city.car` | — | (150, 0, 40.5) yaw 90 | metal | Step 1 to the Golden Bonk (roof y 1.8). Also E2 cover |
| S1-awning | box | 6 × 0.5 × 3 | (150, 3.55, 44.5) | trim | Step 2, top y 3.8 |
| S1-bb-walk | box | 10 × 0.5 × 1.5 | (159, 5.75, 45.25) | metal | Step 3, billboard catwalk, top y 6.0, x 154 to 164 |
| S1-bb-panel | box | 10 × 4 × 0.5 | (159, 11, 46.25) | neon | Billboard above building S3 ("SPROTO COLA") |
| S1-busstop | prefab `city.busStop` | — | (166, 0.2, 43.5) yaw 180 | glass | E2 cover on the south sidewalk |
| S1-car-7…9 | prefab `city.car` | — | (160, 0, 25) yaw 0; (171, 0, 21) yaw 0; (173, 0, 38) yaw 15 | metal | E2 cover, broadside to the barricade |
| S1-plant-4…5 | prefab `city.planter` | — | (166, 0, 33) yaw 0; (178, 0, 29) yaw 0 | concrete | E2 cover |
| S1-bar-N, S1-bar-S | box | 0.6 × 1.2 × 9 | (188, 0.6, 22.5); (188, 0.6, 37.5) | concrete | Empire barricade. Sidewalks stay open as flank routes |
| S1-police | prefab `city.policeCar` | — | (189, 0, 30) yaw 0 | metal | Plugs the middle of the barricade |
| S1-sandbag-1…2 | box | 3 × 1.2 × 1 | (193, 0.6, 26); (193, 0.6, 34) | sand | Behind the barricade |
| S1-brl-3 | barrel (fire) | — | (191.5, 0, 24) | — | Behind the barricade |
| S1-tent | box | 5 × 3 × 5 | (200, 1.5, 37) | trim | Empire command tent |
| S1-balcony | box | 14 × 0.5 × 3 | (183, 4, 15.5) | stone | Bank balcony, top y 4.25. Parapet box 14 × 1 × 0.5 at (183, 4.75, 16.75). E2 squad C |
| S1-palms | prefab `city.palm` | — | N sidewalk x 20, 100, 148, 196 (z 16.5); S sidewalk x 28, 104, 186 (z 43.5) | wood | Dressing |
| S1-lamps | prefab `city.lamp` | — | N sidewalk x 10, 60, 120, 170; S sidewalk x 40, 90, 140, 200 | metal | Lit path |

**Mechanisms and pick-ups**

| id | kind | at | Behaviour |
|---|---|---|---|
| S1-sw-gate | switch | (195, 0, 30) | The barricade's control box. Hold 1.5 s. Opens `S1-D1`. Usable when E2 is clear. **First switch** |
| S1-D1 | door | (208, 1.75, 13.75), 6 × 3.5 × 0.5 | Roller shutter at the alley mouth. **First door** |
| CP1 | checkpoint | (146, 0, 30) | When E1 is clear |
| S1-bonk | secret | (163, 6.0, 45.25) | Golden Bonk, at the east end of the billboard catwalk |
| S1-file-1 | Audit File | (88.5, −1.5, 22) | In the sinkhole |
| A1 to A5 | ammo boxes | see §12 | The ammo lesson (A1 to A3), CP1 (A4), the barricade (A5) |

**Transition out.** Seamless. The alley stub leads north; the exit volume is x 205 to 211, z 0 to 3.

### S2. Alley and Fire Escapes

Footprint 80 × 150 m. The player enters at the south end and goes north: a 6 m alley, the Shrine
Court, a short second alley, three flights of fire escape, two roofs with a gap between them, a
scaffold down to the mall forecourt. About 120 solids.

```
       x=0        20        40        60        80
        |         |         |         |         |
 z=0    ######################|======[RD]=========|    mall front, revolving door at x 58
 z=5    ######################|  P        4   p   |    forecourt (ground). 4 = CP4 is inside the mall
 z=12   ######################|      [L]<<<<<<<<  |    scaffold ramp 2 (down to the ground)
 z=16   ######################|      [L]>>>>>>>>T |    scaffold ramp 1 (from roof 1b)
 z=20   ####################ff|   ROOF 1b   y 9   |
 z=28   ####################ff|  a  [sk] BBBBBB a |    B = billboard
 z=36   ####################==|......cross alley..|    ground, dead end; a fall lands here
 z=40   ##################| B |~~~~ plank ~~~~~~~~|
 z=46   ##################| B |   ROOF 1a  y 10.5 |
 z=50   ##################| B FE  a   a (TANK) a  |    FE = fire escape, x 40 to 43, z 48 to 60
 z=56   ##################| B FE    a             |
 z=60   ##################|=G=|###################|    G = gate S2-D2, 3 m
 z=66   ###########|     t   t   t     |##########     t = standee
 z=72   ###########|   p           p   |##########
 z=78   ###########|      ( SHRINE )   |##########     Goo Bolt, hold zone r 4, CP3
 z=84   ###########|   p           p   |##########
 z=90   ###########| k               k |##########
 z=95   #################|=D1=|###################
 z=98   ##############[M]|    |###################     M = "Sproto Meats" door
 z=110  #################|cat |###################     cat = catwalk (y 4) on the west wall
 z=125  #################|cat d|##################
 z=133  #################|st  d|##################     st = stairs to the catwalk
 z=141  #################|k   |[K]################     K = "Back Door"
 z=146  #################|R  $|###################     R = shotgun rack, $ = shells
 z=150  #################| in |###################
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S2-fl-alleyA | box | 6 × 0.5 × 55 | (40, −0.25, 122.5) | concrete | Alley A, x 37 to 43, z 95 to 150 |
| S2-fl-court | box | 36 × 0.5 × 34 | (40, −0.25, 78) | stone | Shrine Court, x 22 to 58, z 61 to 95 |
| S2-fl-alleyB | box | 6 × 0.5 × 25 | (40, −0.25, 48.5) | concrete | Alley B, z 36 to 61 |
| S2-fl-cross | box | 37 × 0.5 × 4 | (61.5, −0.25, 38) | concrete | Cross alley under the roof gap, x 43 to 80 |
| S2-fl-fore | box | 37 × 0.5 × 18 | (61.5, −0.25, 9) | stone | Mall forecourt, x 43 to 80, z 0 to 18 |
| S2-bWA | box | 37 × 14 × 50 | (18.5, 7, 125) | stone | West of alley A, z 100 to 150 |
| S2-bWA0 | box | 37 × 14 × 2 | (18.5, 7, 96) | stone | z 95 to 97 |
| S2-gap-M | prefab `city.spawnGap` | — | (37, 0, 98.5) yaw 90 | metal | "Sproto Meats" loading door. E3 squads A and D |
| S2-bEA1 | box | 37 × 14 × 7.5 | (61.5, 7, 146.25) | stone | East of alley A, z 142.5 to 150 |
| S2-bEA2 | box | 37 × 14 × 44.5 | (61.5, 7, 117.25) | stone | z 95 to 139.5 |
| S2-gap-K | prefab `city.spawnGap` | — | (43, 0, 141) yaw 270 | metal | "Back Door", behind the player. E3 squad B |
| S2-bWC, S2-bEC | box | 22 × 12 × 34 | (11, 6, 78); (69, 6, 78) | stone | West and east sides of the court |
| S2-bWB | box | 37 × 16 × 43 | (18.5, 8, 39.5) | stone | West of alley B, z 18 to 61 |
| S2-fill | box | 6 × 16 × 18 | (40, 8, 27) | stone | North of alley B, z 18 to 36 |
| S2-bEB1 | box | 37 × 10.5 × 21 | (61.5, 5.25, 50.5) | concrete | Its top is **roof 1a** (y 10.5), x 43 to 80, z 40 to 61 |
| S2-bEB2 | box | 37 × 9 × 18 | (61.5, 4.5, 27) | concrete | Its top is **roof 1b** (y 9), z 18 to 36 |
| S2-bNW | box | 43 × 16 × 18 | (21.5, 8, 9) | stone | West of the forecourt |
| S2-wall-E1, S2-wall-E2 | box | 1 × 8 × 18; 1 × 10.5 × 4 | (79.5, 4, 9); (79.5, 5.25, 38) | concrete | East ends of the forecourt and the cross alley |
| S2-D1 | door | 6 × 3.5 × 0.5 | (40, 1.75, 95.25) | metal | Shutter between alley A and the court. Opens on `E3.cleared` |
| S2-gate-jambs | box | 1.5 × 4 × 1 | (37.75, 2, 60.5); (42.25, 2, 60.5) | stone | Narrow alley B to the 3 m gate |
| S2-D2 | door | 3 × 3 × 0.6 | (40, 1.5, 60.5) | metal | North gate of the court. Opens when the shrine is used |
| S2-cat | box | 1.5 × 0.5 × 22 | (37.75, 3.75, 115) | metal | Catwalk on alley A's west wall, top y 4, z 104 to 126. The high-ground route |
| S2-cat-st | stairs | 1.5 × 4 × 6, yaw 180 | (37.75, 2, 129) | metal | Up to the catwalk (rises north, z 132 to 126) |
| S2-dump-1…3 | prefab `city.dumpster` | — | (42.2, 0, 133) yaw 0; (42.2, 0, 124) yaw 0; (42.2, 0, 112) yaw 0 | metal | Alley A cover |
| S2-crate-1…2 | prefab `city.crateStack` | — | (38, 0, 141); (38, 0, 106) | crate | Alley A cover |
| S2-shrine | prefab `shrine.goo` | — | (40, 0, 78) | neon | Goo Bolt shrine. Its `disc` (r 4) is E4's hold zone |
| S2-standee-1…3 | prefab `city.standee` | — | (33, 0, 68); (40, 0, 66); (47, 0, 68) | crate | Cardboard tax collectors (`dummy`, 60 HP) to try the spell on |
| S2-plant-1…4 | prefab `city.planter` | — | (30, 0, 72) yaw 90; (50, 0, 72) yaw 90; (30, 0, 84) yaw 90; (50, 0, 84) yaw 90 | concrete | Court cover |
| S2-crate-3…4 | prefab `city.crateStack` | — | (25, 0, 91); (55, 0, 91) | crate | Court cover |
| S2-dump-4 | prefab `city.dumpster` | — | (38, 0, 44) yaw 0 | metal | Alley B. A shells crate sits beside it |
| S2-fe-1 | stairs | 1.5 × 3.5 × 7, yaw 180 | (42.25, 1.75, 54.5) | metal | Fire escape flight 1: y 0 at z 58 to y 3.5 at z 51 |
| S2-fe-L1 | box | 3 × 0.5 × 3 | (41.5, 3.25, 49.5) | metal | Landing 1, top y 3.5 |
| S2-fe-2 | stairs | 1.5 × 3.5 × 7, yaw 0 | (40.75, 5.25, 54.5) | metal | Flight 2: y 3.5 at z 51 to y 7 at z 58 (rises south) |
| S2-fe-L2 | box | 3 × 0.5 × 2 | (41.5, 6.75, 59) | metal | Landing 2, top y 7 |
| S2-fe-3 | stairs | 1.5 × 3.5 × 7, yaw 180 | (42.25, 8.75, 54.5) | metal | Flight 3: y 7 at z 58 to y 10.5 at z 51 |
| S2-fe-L3 | box | 1.5 × 0.5 × 3 | (42.25, 10.25, 49.5) | metal | Top landing. Step east onto roof 1a |
| S2-r1a-parapets | box | 37 × 1 × 0.5; 0.5 × 1 × 21 | (61.5, 11, 60.75); (79.75, 11, 50.5) | concrete | South and east edges of roof 1a |
| S2-tank | cylinder | r 2.5, h 3.2 | (66, 10.5, 50) | metal | Water tank. Audit File 2 on top (y 13.7) |
| S2-ac-1…4 | prefab `city.ac` | — | (62.6, 10.5, 50); (50, 10.5, 56); (56, 10.5, 44); (74, 10.5, 44) | metal | Roof 1a cover. The first is the step up to the tank |
| S2-plank | ramp | 1.5 × 1.5 × 4, yaw 0 | (50, 9.75, 38) | wood | Across the gap, from roof 1b (y 9) up to roof 1a (y 10.5). The gap is 4 m and can also be jumped |
| S2-billboard | box | 12 × 4.5 × 0.5 | (64, 11.25, 30) | neon | On roof 1b. E5 squad B comes from behind it |
| S2-skylight | box | 6 × 0.8 × 4 | (56, 9.4, 30) | glass | Roof 1b low cover |
| S2-ac-5…6 | prefab `city.ac` | — | (52, 9, 24); (72, 9, 24) | metal | Roof 1b cover |
| S2-r1b-parapets | box | 31 × 1 × 0.5; 0.5 × 1 × 18 | (58.5, 9.5, 18.25); (79.75, 9.5, 27) | concrete | North (x 43 to 74) and east edges of roof 1b |
| S2-sc-top | box | 3 × 0.5 × 2.5 | (75.5, 8.75, 16.75) | metal | Scaffold top platform at the roof edge |
| S2-sc-r1 | ramp | 2.5 × 4.5 × 12, yaw 90 | (68, 6.75, 16.75) | wood | Scaffold ramp 1: y 9 at x 74 down to y 4.5 at x 62 |
| S2-sc-land | box | 3 × 0.5 × 5 | (60.5, 4.25, 15.5) | metal | Scaffold landing, top y 4.5 |
| S2-sc-r2 | ramp | 2.5 × 4.5 × 12, yaw 270 | (68, 2.25, 14.25) | wood | Scaffold ramp 2: y 4.5 at x 62 down to y 0 at x 74 |
| S2-fac-W, S2-fac-E | box | 13 × 12 × 1; 20 × 12 × 1 | (49.5, 6, 0.5); (70, 6, 0.5) | glass | Mall front either side of the door (x 56 to 60) |
| S2-fac-lintel | box | 4 × 8.5 × 1 | (58, 7.75, 0.5) | neon | Above the door, "MALL OF SPROTO" |
| S2-vestibule | box | 0.5 × 3.5 × 4 (two); 5 × 0.5 × 4 | (55.75, 1.75, 3); (60.25, 1.75, 3); (58, 3.75, 3) | glass | Walls and roof round the revolving door |
| S2-fore-props | prefabs | — | `city.planter` (50, 0, 10), (66, 0, 6); `city.palm` (48, 0, 5), (72, 0, 10) | — | Forecourt dressing |

**Mechanisms and pick-ups**

| id | kind | at | Behaviour |
|---|---|---|---|
| S2-rack-sg | rack (shotgun, Common) | (38.2, 0.9, 146) | `why: 'E3 corridor swarm'`. Unlocks the Shotgun type. CP2 saves here on entry |
| S2-shrine | spellShrine | (40, 0, 78) | Grants Goo Bolt, refills mana, saves CP3, opens `S2-D2`, starts E4 |
| S2-revolve | rotator + `gooGear` | (58, 0, 3) | Two crossed boxes 3.8 × 3 × 0.5 at 60 rpm. Touching it pushes the player back 6 m with no damage. Goo Bolt slows it to 6 rpm for 4 s |
| S2-file-2 | Audit File | (66, 13.7, 50) | On the water tank: AC unit (1.2 m), then a double jump |
| S2-cache | secret weapon cache | (77, 0, 38) | At the dead end of the cross alley under the roof gap. Reached by dropping off the plank on purpose; the way back is the fire escape. One Uncommon gun (§12) |
| A6 to A12 | ammo boxes | see §12 | Rack and CP2 (A6, A7), shrine (A8, A9), alley B (A10), fire escape top (A11), forecourt (A12) |

**Transition out.** Seamless, through the revolving door. Exit volume x 56 to 60, z 0 to 1.

### S3. Mall of Sproto

Footprint 110 × 70 m: the mall is x 0 to 86, the service corridor with Depot 1 is x 86 to 110.
Two floors: F1 at y 0, F2 at y 5, roof at y 10. The play floor is x 10 to 76, z 10 to 60
(66 × 50 m) round an atrium that is open from F1 to a glass skylight. **This room is lockdown E6.**
About 110 solids.

```
        x=0       20        40        60        80   86       110
         |         |         |         |         |    |         |
 z=0     #################################################
 z=5     ############### shops (solid) ###################
 z=10    #####+----------------------------------[OF]+###          OF = M-OFFICE (F2)
 z=16    #####|  F2 north gallery        | food  t   |###
 z=22    #####|   o=======rail===o=======o court  c  |###          o = pillar, c = counter
 z=28    #####| F2 |  k            E v   |  t  v  c  |###          E v = east escalator (rises south)
 z=32    #####| W  |        b        v   L        [F]D2===D3======+   F = M-FOOD (F2), D2 = lockdown exit
 z=35    ###[S] g  |    b  (ST)  b   *   |   t       ....passage... depot 1  D4 > S4
 z=38    #####| a  ^                  L   |        c  D2===D3======+   S = M-SEC (F1), ST = statue
 z=44    #####| l  ^ W esc      k        |  t  v     |###
 z=48    #####|   o=======rail===o=======o     t  c  |###
 z=54    #####|  F2 south gallery ----T--|  [TY]     |###          T = threshold line, TY = M-TOYS (F1)
 z=60    #####+-----------| in |---------------------+###
 z=65    ################ |hall| #########################
 z=70    ################ | ^  | #########################          entry from S2, CP4
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S3-fl-F1 | box | 86 × 0.5 × 70 | (43, −0.25, 35) | stone | Ground floor |
| S3-bandW | box | 10 × 10 × 70 | (5, 5, 35) | stone | West shop band (solid, both floors) |
| S3-bandN | box | 76 × 10 × 10 | (48, 5, 5) | stone | North shop band |
| S3-bandS-W, S3-bandS-E | box | 32 × 10 × 10; 38 × 10 × 10 | (26, 5, 65); (67, 5, 65) | stone | South band either side of the 6 m entry hall (x 42 to 48) |
| S3-entry-lintel | box | 6 × 5.5 × 10 | (45, 7.25, 65) | stone | Over the entry hall, y 4.5 to 10 |
| S3-bandE-N, S3-bandE-S | box | 10 × 4.5 × 22 | (81, 2.25, 21); (81, 2.25, 49) | stone | F1 east band either side of the exit passage (z 32 to 38) |
| S3-wallE-F2 | box | 1 × 5.5 × 50 | (85.5, 7.25, 35) | stone | F2 east wall of the food court |
| S3-F2-W | box | 18 × 0.5 × 50 | (19, 4.75, 35) | stone | F2 west gallery, x 10 to 28 |
| S3-F2-E | box | 24 × 0.5 × 50 | (74, 4.75, 35) | stone | F2 east gallery and food court, x 62 to 86 |
| S3-F2-N, S3-F2-S | box | 34 × 0.5 × 12 | (45, 4.75, 16); (45, 4.75, 54) | stone | F2 north and south galleries |
| S3-roof | box (four) | 28 × 0.5 × 70; 24 × 0.5 × 70; 34 × 0.5 × 22; 34 × 0.5 × 22 | (14, 10.25, 35); (74, 10.25, 35); (45, 10.25, 11); (45, 10.25, 59) | concrete | Roof round the skylight |
| S3-skylight | box | 34 × 0.5 × 26 | (45, 10.25, 35) | glass | Seals the room. Two 4 × 4 hatches at (38, 10, 30) and (52, 10, 40) are spawn-only (M-SKY) |
| S3-rail-N, S3-rail-S | box | 34 × 1.1 × 0.5 | (45, 5.55, 21.75); (45, 5.55, 48.25) | glass | Mezzanine rails. Bots behind them show only their heads from below |
| S3-rail-W | box | 0.5 × 1.1 × 9; 0.5 × 1.1 × 14 | (28.25, 5.55, 26.5); (28.25, 5.55, 41) | glass | Gap at z 31 to 34 for the escalator landing |
| S3-rail-E | box | 0.5 × 1.1 × 14; 0.5 × 1.1 × 9 | (61.75, 5.55, 29); (61.75, 5.55, 43.5) | glass | Gap at z 36 to 39 |
| S3-esc-W | ramp | 3 × 5 × 12, yaw 180 | (29.5, 2.5, 40) | metal | West escalator: y 0 at z 46 to y 5 at z 34 |
| S3-esc-W-land | box | 3 × 0.5 × 3 | (29.5, 4.75, 32.5) | metal | Joins the west gallery |
| S3-esc-E | ramp | 3 × 5 × 12, yaw 0 | (60.5, 2.5, 30) | metal | East escalator: y 0 at z 24 to y 5 at z 36 |
| S3-esc-E-land | box | 3 × 0.5 × 3 | (60.5, 4.75, 37.5) | metal | Joins the east gallery |
| S3-pillars-F1 | cylinder (eight) | r 0.5, h 4.5 | (28, 0, 22); (45, 0, 22); (62, 0, 22); (28, 0, 48); (45, 0, 48); (62, 0, 48); (19, 0, 35); (70, 0, 35) | pillar | Hold up the galleries. Full cover |
| S3-statue | cylinder + sphere | r 2, h 1; sphere r 2 | (45, 0, 35); (45, 3, 35) | gold | Golden Sproto in the middle of the atrium. Something to circle |
| S3-kiosk-1…2 | prefab `mall.kiosk` | — | (36, 0, 28) yaw 0; (54, 0, 42) yaw 0 | wood | F1 cover |
| S3-bench-1…4 | prefab `mall.bench` | — | (38, 0, 42) yaw 90; (52, 0, 28) yaw 90; (45, 0, 52) yaw 90; (45, 0, 18) yaw 90 | wood | Low cover (0.5 m); slide behind them |
| S3-plant-1…4 | prefab `city.planter` | — | (41, 0, 56) yaw 0; (49, 0, 56) yaw 0; (34, 0, 36) yaw 0; (56, 0, 34) yaw 0 | concrete | F1 cover. The first two are 4 m inside the threshold |
| S3-room-SEC | prefab `city.spawnRoom` | — | (12.25, 0, 35) yaw 90 | metal | **M-SEC**, F1 west, "Security" |
| S3-room-TOYS | prefab `city.spawnRoom` | — | (66, 0, 57.75) yaw 180 | metal | **M-TOYS**, F1 south-east, "Sproto Toys" |
| S3-room-OFF | prefab `city.spawnRoom` | — | (78, 5, 12.25) yaw 0 | metal | **M-OFFICE**, F2 north-east |
| S3-room-FOOD | prefab `city.spawnRoom` | — | (83.25, 5, 35) yaw 270 | metal | **M-FOOD**, F2 east, the kitchen |
| S3-counters | box (three) | 1.5 × 1.2 × 6 | (83, 5.6, 18); (83, 5.6, 26); (83, 5.6, 50) | wood | Food court counters |
| S3-tables | prefab `mall.table` (five) | — | (68, 5, 18); (74, 5, 24); (68, 5, 44); (74, 5, 50); (68, 5, 56) | wood | Food court low cover |
| S3-vending-1…3 | prefab `mall.vending` | — | (66, 5, 28); (66, 5, 46); (20, 5, 20) | metal | F2 full cover |
| S3-pillars-F2 | cylinder (three) | r 0.5, h 5 | (70, 5, 30); (70, 5, 40); (19, 5, 48) | pillar | F2 full cover |
| S3-brl-1…3 | barrel (shock) | — | (16, 0, 31); (64, 0, 40); (64, 5, 30) | — | By M-SEC, under the east gallery, and at the F2 east rail. Bots are weak to shock |
| S3-L1-in | door (lockdown) | 6 × 4.5 × 0.6 | (45, 2.25, 60.3) | metal, neon trim | Entry slab |
| S3-L1-thresh | disc (line) | 6 × 0.3 | (45, 0.02, 54) | neon | Threshold, 6 m inside |
| S3-L1-out | door (lockdown) | 0.6 × 4.5 × 6 | (76.3, 2.25, 35) | metal, neon trim | Exit slab |
| S3-passage-floor | (part of S3-fl-F1) | 10 × 6 | x 76 to 86, z 32 to 38 | — | Exit passage under the food court |
| S3-D3 | door | 0.5 × 4 × 6 | (86.25, 2, 35) | metal | Opens `near` |
| S3-cor-floor | box | 24 × 0.5 × 10 | (98, −0.25, 35) | concrete | Service corridor, x 86 to 110, z 30 to 40 |
| S3-cor-walls | box | 24 × 4 × 0.5 (two) | (98, 2, 29.75); (98, 2, 40.25) | concrete | Corridor walls |
| S3-cor-roof | box | 24 × 0.5 × 11 | (98, 4.25, 35) | concrete | Corridor roof |

**Mechanisms and pick-ups**

| id | kind | at | Behaviour |
|---|---|---|---|
| CP4 | checkpoint | (45, 0, 66) | In the entry hall, just outside `S3-L1-in` |
| S3-lockdown-1 | lockdown | — | Entry `S3-L1-in`, exit `S3-L1-out`, encounter `S3-E6` |
| A13 to A17 | ammo boxes | see §12 | CP4 (A13, A14) and three inside the lockdown (A15 to A17) |
| S3-reward-1 | lockdown reward | (45, 0, 31) | Appears when E6 clears: ammo crate `C1`, chest `S3-chest` (one gun, §12) and a health pick-up |
| S3-depot1 | depot | (98, 0, 35) yaw 90 | Depot crate `D1` (94, 0, 31.5), health station (97, 0, 31.5), spell loadout bench (100, 0, 31.5), ticket shop terminal (103, 0, 31.5). Saves CP5 |
| S3-D4 | door | (109.75, 2, 35) | Opens `near`. To S4 |

**Transition out.** Seamless, through `S3-D4`.

### S4. Parking Spiral

Footprint 92 × 60 m: the structure is x 0 to 60, the sky bridge is x 60 to 92. Four decks: G at
y 0, P1 at y 4, P2 at y 8, the roof at y 12. Ramps run in an 8 m lane along the north edge (G to
P1, rising east) and along the south edge (P1 to P2, rising west). The ramp from P2 to the roof has
collapsed; the lift is the way up. **The roof is lockdown E8.** About 150 solids.

```
  G (y 0) and the north ramp          P1 (y 4) and the south ramp         P2 (y 8)                       ROOF (y 12)  [L] E8
  x=0      30       60                x=0      30       60                x=0      30       60           x=0      30       60          92
  +--------------------+ z=0          +--------------------+              +--------------------+         +--------[HN]--------+
  |... /////ramp////// |              |  (open)        land|              |land  XX (collapsed) |         | AW   a             AE
  |....:...............| z=8          |-----rail--o o-------|              |-----rail-----------|         | c                c |
  |.c..................|              |      c        c    |              |       c         c  |         |          |T      k |
  >in.....+core+.......| z=30         |      +core+    c   |              | c   +core+[lift]   |         | v   [RS]+hut+[lft]:  ====bridge====D
  |.c.....+----+...c...|              |   c  +----+        |              |   c +----+ sw      |         | c                k |    (x 60-90)
  |.................c..|              |             c      |              |      G*    S   c   |         |    c          c    |
  |....................| z=52         |                    |              |--------------rail--|         | a                   |
  |....................|              |pocket \\\\ramp\\\\ start           |land                |         +--------[HS]--------+
  +--------------------+ z=60         +--------------------+              +--------------------+
   in = from S3                        pocket = Audit File 3               G* = generator, S = Shooter Bot   T = threshold, RS/HN/HS/AW/AE = spawn points
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S4-G | box | 60 × 0.5 × 60 | (30, −0.25, 30) | concrete | Ground deck |
| S4-core | box | 10 × 15 × 10 | (30, 7.5, 30) | concrete | Lift and stair core, x 25 to 35, z 25 to 35. Stands 3 m above the roof as the stair hut |
| S4-ramp-1 | ramp | 8 × 4 × 32, yaw 90 | (30, 2, 4) | concrete | G to P1, north lane, y 0 at x 14 to y 4 at x 46 |
| S4-P1 | box | 60 × 0.5 × 44 | (30, 3.75, 30) | concrete | P1 main slab, z 8 to 52 |
| S4-P1-landN | box | 14 × 0.5 × 8 | (53, 3.75, 4) | concrete | Top of ramp 1, x 46 to 60 |
| S4-P1-landS | box | 14 × 0.5 × 8 | (53, 3.75, 56) | concrete | Foot of ramp 2, x 46 to 60 |
| S4-P1-pocket | box | 14 × 0.5 × 8 | (7, 3.75, 56) | concrete | Dead-end corner, x 0 to 14. Audit File 3 |
| S4-P1-rail | box | 46 × 1.2 × 0.5 | (23, 4.6, 8.25) | metal | Rail over ramp 1. E7 squad B stands here |
| S4-ramp-2 | ramp | 8 × 4 × 32, yaw 270 | (30, 6, 56) | concrete | P1 to P2, south lane, y 4 at x 46 to y 8 at x 14 |
| S4-P2 | box | 60 × 0.5 × 44 | (30, 7.75, 30) | concrete | P2 main slab |
| S4-P2-landS | box | 14 × 0.5 × 8 | (7, 7.75, 56) | concrete | Top of ramp 2, x 0 to 14 |
| S4-P2-landN | box | 14 × 0.5 × 8 | (7, 7.75, 4) | concrete | North-west corner |
| S4-P2-rubble | box | 8 × 3 × 8 | (18, 9.5, 4) | concrete | The collapsed ramp to the roof |
| S4-P2-rails | box | 46 × 1.2 × 0.5 (two) | (37, 8.6, 8.25); (37, 8.6, 51.75) | metal | Rails over the two ramp lanes, x 14 to 60 |
| S4-roof | box (four) | 35 × 0.5 × 60; 21 × 0.5 × 60; 4 × 0.5 × 28; 4 × 0.5 × 28 | (17.5, 11.75, 30); (49.5, 11.75, 30); (37, 11.75, 14); (37, 11.75, 46) | concrete | Roof slab round the 4 × 4 lift hole (x 35 to 39, z 28 to 32) |
| S4-screens | box (per deck G, P1, P2) | 60 × 3.5 × 0.5 (N, S); 0.5 × 3.5 × 60 (E, W) | y centre = deck + 1.75; N z 0.25, S z 59.75, W x 0.25, E x 59.75 | glass | Mesh screens on all four sides of each lower deck. `S4-screen-G-W` is split for the entry (z 27 to 33) |
| S4-roof-screens | box | 60 × 7 × 0.5 (N, S); 0.5 × 7 × 60 (W); 0.5 × 7 × 27.5 (E, two) | y centre 15.5; E pieces at (59.75, 15.5, 13.75) and (59.75, 15.5, 46.25) | glass | Roof walls up to the lid at y 19. The east gap (z 27.5 to 32.5) is the bridge |
| S4-roof-lid | force-field lid | 60 × 60 (+ 32 × 5 over the bridge) | y 19 | neon | No way out over the top. Flyers pass in through it, then stay inside |
| S4-pillars | cylinder (eight per deck G, P1, P2) | r 0.5, h 3.5 | (15, y, 15); (30, y, 15); (45, y, 15); (15, y, 30); (45, y, 30); (15, y, 45); (30, y, 45); (45, y, 45) | pillar | Full cover on every deck |
| S4-G-cars | prefab `city.car` | — | (6, 0, 24) yaw 90; (12, 0, 16) yaw 0; (20, 0, 44) yaw 0; (48, 0, 40) yaw 0 | metal | G cover. The first two are within 15 m of the entry |
| S4-G-crate | prefab `city.crateStack` | — | (4, 0, 12) | crate | G cover by the ramp foot |
| S4-P1-cars | prefab `city.car` | — | (50, 4, 14) yaw 90; (56, 4, 24) yaw 0; (48, 4, 34) yaw 0; (56, 4, 44) yaw 0; (40, 4, 20) yaw 0 | metal | P1 cover. E7 squad C hides among them |
| S4-P1-van | prefab `city.van` | — | (8, 4, 54) yaw 90 | metal | Hides the pocket |
| S4-P2-cars | prefab `city.car` | — | (12, 8, 46) yaw 0; (18, 8, 50) yaw 90; (24, 8, 40) yaw 0; (40, 8, 50) yaw 90; (48, 8, 22) yaw 0 | metal | P2 cover between the landing and the Shooter Bot |
| S4-gen | prefab `city.generator` | — | (30, 8, 44) | metal | Destructible target, 200 HP. Powers `S4-cage` |
| S4-cage | door (shield, three faces) | 0.5 × 3.5 × 6; 5 × 3.5 × 0.5 (two) | (40.25, 9.75, 30); (37.5, 9.75, 26.75); (37.5, 9.75, 33.25) | neon | Energy cage round the lift on P2. Drops when `S4-gen` is destroyed |
| S4-lift | mover | 4 × 0.5 × 4 | (37, 7.75, 30) to (37, 11.75, 30) | metal | **First lift.** 2 m/s, `onTrigger` |
| S4-lobby | box | 6 × 3.5 × 0.5 (two); 6.5 × 0.5 × 7 | (38, 13.75, 26.75); (38, 13.75, 33.25); (38.25, 15.75, 30) | concrete | Lift lobby on the roof: north wall, south wall, roof |
| S4-L2-in | door (lockdown) | 0.6 × 3.5 × 6 | (41.3, 13.75, 30) | metal, neon trim | Entry slab on the lobby's east side |
| S4-L2-thresh | disc (line) | 0.3 × 6 | (47, 12.02, 30) | neon | Threshold, 6 m inside |
| S4-room-HN | prefab `city.spawnRoom` | — | (30, 12, 2.25) yaw 0 | metal | **R-HATCH-N**, north side |
| S4-room-HS | prefab `city.spawnRoom` | — | (30, 12, 57.75) yaw 180 | metal | **R-HATCH-S**, south side |
| S4-stair-door | door (spawn) | 0.5 × 2.7 × 2.4 | (24.75, 13.35, 30) | metal | **R-STAIR**, the hut's west face |
| S4-roof-cars | prefab `city.car` | — | (46, 12, 16) yaw 20; (48, 12, 44) yaw −15; (16, 12, 14) yaw 90; (14, 12, 46) yaw 90 | metal | Roof cover |
| S4-roof-van | prefab `city.van` | — | (9, 12, 30) yaw 0 | metal | Roof full cover, west |
| S4-roof-crates | prefab `city.crateStack` | — | (52, 12, 24); (52, 12, 36) | crate | Roof cover facing the bridge |
| S4-roof-ac | prefab `city.ac` | — | (22, 12, 10); (22, 12, 50); (40, 12, 8); (40, 12, 52) | metal | Roof cover |
| S4-roof-barriers | prefab `city.barrier` | — | (56, 12, 26) yaw 0; (56, 12, 34) yaw 0 | concrete | Crouch cover either side of the bridge mouth |
| S4-brl-1 | barrel (shock) | — | (58, 12, 25) | — | For wave 4 as it steps off the bridge |
| S4-bridge-1…3 | mover (three boxes) | 10 × 0.5 × 5 each | (65, 11.75, 30); (75, 11.75, 30); (85, 11.75, 30) | metal | Sky bridge. Segments slide out in turn (3 s each) when wave 3 starts |
| S4-bridge-rails | box (two) | 30 × 1.1 × 0.5 | (75, 12.55, 27.75); (75, 12.55, 32.25) | glass | Move with the segments |
| S4-bridgehead | box | 2 × 1 × 8 | (91, 11.5, 30) | concrete | Far end of the bridge |
| S4-L2-out | door (lockdown) | 0.6 × 3.5 × 5 | (90.3, 13.75, 30) | metal, neon trim | Exit slab at the bridgehead. Also the spawn door **R-BRIDGE** for wave 4 |

**Mechanisms and pick-ups**

| id | kind | at | Behaviour |
|---|---|---|---|
| A18 to A25 | ammo boxes | see §12 | Entry (A18), P1 (A19), P2 landing (A20), CP6 (A21), three inside the lockdown (A22 to A24), CP7 (A25) |
| S4-file-3 | Audit File | (4, 4, 57) | Behind the van in the P1 pocket |
| S4-sw-lift | switch | (41.5, 8, 30) | Lift call button. Hold 1 s. Usable when the cage is down |
| CP6 | checkpoint | (41.5, 8, 30) | When `S4-gen` is destroyed. This is the checkpoint outside the E8 entry |
| S4-lockdown-2 | lockdown | — | Entry `S4-L2-in`, exit `S4-L2-out`, encounter `S4-E8` |
| S4-reward-2 | lockdown reward | (54, 12, 30) | When E8 clears: ammo crate `C2`, chest `S4-chest` (one gun, §12) and a mana bloom. Saves CP7 |

**Transition out.** Seamless, across the bridge and through `S4-L2-out`.

### S5. Overpass

Footprint 78 × 130 m. A freeway deck at y 12: leg A runs east 78 m, leg B turns south for 52 m,
then a 54 m off-ramp drops to the ground. Stalled cars, a toll plaza, a sign gantry. About 75 solids.

```
        x=0       20        40        60        78
         |         |         |         |         |
 z=0     +=======================================+      2.8 m glass sound walls on every edge
 z=4     |  c         c    v  [T]  .  [BUS]      |      T = toll booth (three), canopy over them
 z=9     >in     c       c    [T] BO     c       |      BO = Big Obama waits here
 z=14    |    c         c     [T]  .       c     |
 z=18    +=============================+ st      |      st = stairs to the gantry
 z=24                                  | st      |
 z=30                                  |==GANTRY=|      catwalk at y 19, optional high ground
 z=40                                  | c       |
 z=47                                  |      c  |
 z=55                                  | c       |
 z=64                                  |  L   c  |      L, L, S = E9 squad C
 z=70                                  |---- L --|      top of the off-ramp (y 12)
 z=80                                  |    S    |
 z=90                                  |===      |      barriers on the ramp
 z=105                                 |      ===|
 z=124                                 |---------|      foot of the ramp (y 0)
 z=130                                 +--- v ---+      to S6
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S5-deckA | box | 78 × 1 × 18 | (39, 11.5, 9) | concrete | Leg A, top y 12 |
| S5-deckB | box | 18 × 1 × 52 | (69, 11.5, 44) | concrete | Leg B, x 60 to 78, z 18 to 70 |
| S5-ramp | ramp | 18 × 12 × 54, yaw 180 | (69, 6, 97) | concrete | Off-ramp: y 12 at z 70 down to y 0 at z 124 |
| S5-apron | box | 18 × 0.5 × 6 | (69, −0.25, 127) | concrete | Ground at the foot of the ramp |
| S5-piers | cylinder (five) | r 1.2, h 11 | (12, 0, 9); (36, 0, 9); (60, 0, 9); (69, 0, 36); (69, 0, 60) | concrete | Hold the deck up (dressing) |
| S5-wall-N | box | 78 × 2.8 × 0.5 | (39, 13.4, 0.25) | glass | Sound wall |
| S5-wall-S | box | 60 × 2.8 × 0.5 | (30, 13.4, 17.75) | glass | Leg A south, x 0 to 60 |
| S5-wall-W | box (two) | 0.5 × 2.8 × 6.5 | (0.25, 13.4, 3.25); (0.25, 13.4, 14.75) | glass | West end, gap for the bridge (z 6.5 to 11.5) |
| S5-wall-E | box | 0.5 × 2.8 × 70 | (77.75, 13.4, 35) | glass | East edge, z 0 to 70 |
| S5-wall-BW | box | 0.5 × 2.8 × 52 | (60.25, 13.4, 44) | glass | Leg B west edge |
| S5-ramp-walls | box (two) | 0.5 × 15 × 60 | (60.25, 7.5, 100); (77.75, 7.5, 100) | concrete | Retaining walls beside the ramp and apron |
| S5-A-cars | prefab `city.car` | — | (10, 12, 5) yaw 80; (14, 12, 13) yaw 100; (22, 12, 8) yaw 90; (28, 12, 3.5) yaw 90; (30, 12, 14) yaw 85; (36, 12, 9) yaw 95 | metal | Stalled traffic. Cover, and things to circle the Big Obama round |
| S5-A-van | prefab `city.van` | — | (19, 12, 15.5) yaw 90 | metal | Full cover |
| S5-toll-booths | box (three) | 4 × 3 × 2 | (44, 13.5, 4.5); (44, 13.5, 9); (44, 13.5, 13.5) | trim | Toll booths. Four lanes between them, 2.5 to 3 m wide |
| S5-toll-canopy | box | 6 × 0.5 × 18 | (44, 15.25, 9) | metal | Canopy, top y 15.5. E9 squad B's Obamas stand on it |
| S5-toll-arms | door (four) | 0.5 × 1 × 2.5 | x 46.5, y 12.5, z 2, 6.75, 11.25, 16 | neon | Barrier arms. Lift when E9 starts |
| S5-bus | box | 10 × 3 × 2.6 | (58, 13.5, 3.5) | metal | Empire bus. Its door (55, 12, 5) is a spawn door |
| S5-step-car | prefab `city.car` | — | (58, 12, 7.5) yaw 90 | metal | Parked against the bus. The step up to the bus roof and the Mana Battery |
| S5-corner-cars | prefab `city.car` | — | (66, 12, 12) yaw 90; (72, 12, 6) yaw 0 | metal | Corner cover |
| S5-gantry-pylons | box (two) | 1.5 × 6.5 × 1.5 | (61.5, 15.25, 30.5); (76.5, 15.25, 30.5) | metal | Under the gantry |
| S5-gantry | box | 17 × 0.5 × 2.5 | (69, 18.75, 30.25) | metal | Gantry catwalk, top y 19, z 29 to 31.5. Optional high ground over E9 squad C (32 to 55 m; the machine gun keeps full damage to 30 m) |
| S5-gantry-rail | box | 17 × 1 × 0.5 | (69, 19.5, 31.25) | metal | Crouch cover on the south edge |
| S5-gantry-sign | box | 12 × 3 × 0.5 | (70.5, 17, 28.75) | neon | "GATE PLAZA 1/4 MILE", hangs on the north side |
| S5-gantry-stairs | stairs | 1.5 × 7 × 10, yaw 0 | (61.25, 15.5, 24) | metal | y 12 at z 19 up to y 19 at z 29 |
| S5-B-cars | prefab `city.car` | — | (64, 12, 40) yaw 0; (73, 12, 47) yaw 10; (65, 12, 55) yaw −10; (72, 12, 63) yaw 0 | metal | Leg B cover |
| S5-ramp-barriers | box (two) | 7 × 1.6 × 0.6 | (64.5, 8.2, 90); (73.5, 4.9, 105) | concrete | Cover on the slope (bases sunk into the ramp) |
| S5-rescue | void rescue volume | — | everything below y 8 outside the deck and ramp | — | Safety net only. No health loss on L01 |

**Mechanisms and pick-ups**

| id | kind | at | Behaviour |
|---|---|---|---|
| S5-battery | Mana Battery | (44, 15.5, 15) | On the south end of the toll canopy. Route: roof of `S5-step-car` (y 13.8), bus roof (y 15), then a 6 m sprint jump west to the canopy (y 15.5) |
| A26 to A29 | ammo boxes | see §12 | Bridgehead (A26, A27), gantry (A28), start of leg B (A29) |
| C3 | ammo crate | (48, 12, 16) | Behind the toll booths, for after squad B. 3 uses |

**Transition out.** Seamless. Exit volume x 60 to 78, z 127 to 130.

### S6. Gate Plaza

Footprint 88 × 100 m. A depot alcove on the north side, then the arena: x 4 to 84, z 14 to 92
(80 × 78 m), walled, with the city gate in the south wall. **The arena is lockdown FIN.**
About 95 solids.

```
        x=0       20        40        60        80  88
         |         |         |         |         |   |
 z=0     ################| depot 2 |#################
 z=7     ################|  CP8    |#################
 z=14    ####+-----------+==L3-in==+------------+####
 z=20    ####|        -----T-----               |####      T = threshold (z 20)
 z=24    ####|    k        R R $       k        |####      R = racks, $ = ammo
 z=32    ####|   s     /[ G-N on bandstand ]\    s |####      / \ = stairs, bandstand top y 2.4
 z=40    ####|                p                  |####
 z=44    ####|   c                          c    |####
 z=52    ####|        p    ( FOUNTAIN )    p     |####
 z=58    ####| G-W|     f              f    |G-E |####      f = fire barrel
 z=64    ####|  z          p                  z  |####      z = shock barrel
 z=74    ###[BW] s                           s [BE]###      BW, BE = guard booths
 z=86    ####|          +======shield======+     |####
 z=89    ####|          |    GATEKEEPER    |     |####
 z=92    ####+---[TW]---+------GATE--------+[TE]-+####      TW, TE = tower doors
 z=100   ############################################
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S6-floor | box | 88 × 0.5 × 100 | (44, −0.25, 50) | stone | Plaza paving |
| S6-wall-W, S6-wall-E | box | 4 × 10 × 100 | (2, 5, 50); (86, 5, 50) | stone | Side walls |
| S6-wall-N | box (two) | 28 × 10 × 4 | (18, 5, 12); (70, 5, 12) | stone | North wall either side of the alcove |
| S6-alcove-walls | box (two) | 2 × 8 × 14 | (33, 4, 7); (55, 4, 7) | stone | Alcove sides. The alcove is x 34 to 54, z 0 to 14 |
| S6-alcove-jambs | box (two) | 7 × 10 × 1 | (37.5, 5, 13.5); (50.5, 5, 13.5) | stone | Narrow the alcove mouth to 6 m |
| S6-L3-in | door (lockdown) | 6 × 8 × 0.6 | (44, 4, 13.7) | metal, neon trim | Entry slab |
| S6-L3-thresh | disc (line) | 6 × 0.3 | (44, 0.02, 20) | neon | Threshold, 6 m inside |
| S6-wall-SW, S6-wall-SE | box | 20 × 12 × 8 | (14, 6, 96); (74, 6, 96) | stone | South wall, x 4 to 24 and 64 to 84 |
| S6-tower-W, S6-tower-E | box | 8 × 18 × 8 | (28, 9, 96); (60, 9, 96) | stone | Gate towers, with a `neon` strip |
| S6-gate | door (lockdown exit) | 24 × 12 × 2 | (44, 6, 95) | gold | The city gate, x 32 to 56. Opens a third after part 1, fully at the end |
| S6-gate-lintel | box | 24 × 6 × 8 | (44, 15, 96) | stone | Over the gate |
| S6-lid | force-field lid | 80 × 78 | y 20 | neon | Seals the arena |
| S6-shield | door (shield, three faces) | 26 × 12 × 0.6; 0.6 × 12 × 6 (two) | (44, 6, 85.7); (31.3, 6, 89); (56.7, 6, 89) | neon | Shield bay round the Gatekeeper in part 1. Blocks bullets both ways. Drops when all three generators are destroyed |
| S6-door-TW, S6-door-TE | door (spawn) | 2.4 × 2.7 × 0.5 | (28, 1.35, 91.75); (60, 1.35, 91.75) | metal | **T-W** and **T-E**, tower doors. 2.4 m wide: goo spots |
| S6-booth-W | prefab `city.spawnRoom` | — | (6.25, 0, 74) yaw 90 | metal | **B-W**, west guard booth |
| S6-booth-E | prefab `city.spawnRoom` | — | (81.75, 0, 74) yaw 270 | metal | **B-E**, east guard booth |
| S6-fountain-basin | cylinder | r 6, h 0.8 | (44, 0, 52) | stone | Low ring |
| S6-fountain-column | cylinder | r 1.2, h 5 | (44, 0, 52) | stone | Full cover to circle. Breaks in part 3 |
| S6-fountain-coin | sphere | r 1.6 | (44, 5.6, 52) | gold | A golden bitcoin. Falls in part 3 |
| S6-fountain-rubble | box | 3 × 1 × 3 | (44, 0.5, 52) | stone | Replaces the column in part 3 |
| S6-bandstand | box | 12 × 2.4 × 8 | (44, 1.2, 32) | stone | Second height level, x 38 to 50, z 28 to 36 |
| S6-band-stairs | stairs (two) | 3 × 2.4 × 5, yaw 90; yaw 270 | (35.5, 1.2, 32); (52.5, 1.2, 32) | stone | West and east steps |
| S6-band-parapet | box | 12 × 1 × 0.5 | (44, 2.9, 35.75) | stone | Crouch cover on the south edge |
| S6-gen-N | prefab `city.generator` | — | (44, 2.4, 32) | metal | Generator on the bandstand |
| S6-gen-W, S6-gen-E | prefab `city.generator` | — | (12, 0, 58); (76, 0, 58) | metal | Side generators |
| S6-gen-screens | box (two) | 0.6 × 2 × 5 | (15.5, 1, 58); (72.5, 1, 58) | metal | Hide each side generator from the middle; approach from the north or south |
| S6-plant-1…4 | prefab `city.planter` | — | (30, 0, 52) yaw 0; (58, 0, 52) yaw 0; (44, 0, 40) yaw 90; (44, 0, 66) yaw 90 | concrete | Ring of cover round the fountain |
| S6-statue-1…4 | prefab `city.statue` | — | (22, 0, 34); (66, 0, 34); (22, 0, 74); (66, 0, 74) | stone | Full cover pillars to circle the Gatekeeper round |
| S6-crate-1…2 | prefab `city.crateStack` | — | (16, 0, 44); (72, 0, 44) | crate | Full cover |
| S6-kiosk-1…2 | prefab `mall.kiosk` | — | (20, 0, 24) yaw 0; (68, 0, 24) yaw 0 | wood | Cover near the entry |
| S6-brl-f1…2 | barrel (fire) | — | (26, 0, 60); (62, 0, 60) | — | For midget waves |
| S6-brl-s1…2 | barrel (shock) | — | (14, 0, 64); (74, 0, 64) | — | For the bots at the side generators. 60 damage to a generator too |

**Mechanisms and pick-ups**

| id | kind | at | Behaviour |
|---|---|---|---|
| S6-depot2 | depot | (44, 0, 5) yaw 0 | Depot crate `D2` (37, 0, 4), health station (41, 0, 3), spell loadout bench (47, 0, 3), ticket shop terminal (51, 0, 4). Saves CP8, the checkpoint outside the FIN entry |
| S6-rack-sg, S6-rack-mg | rack (Common) | (39, 0.9, 25); (44, 0.9, 25) | Inside the arena. `why: 'FIN adds at the tower doors'` and `'FIN, in case the machine gun was swapped away'` |
| A30 to A33 | ammo boxes | see §12 | Four inside the arena |
| C4 | ammo crate | (44, 0, 23) | Inside the arena, behind the racks. 3 uses |
| S6-lockdown-3 | lockdown | — | Entry `S6-L3-in`, exit `S6-gate`, encounter `S6-FIN` |
| S6-exit | reach volume | (44, 0, 96) | Level end |

**Transition out.** The end card.

## 7. Prefabs

All go in `src/data/levels/prefabs/city.js`. Positions are relative to the prefab's base centre at
yaw 0. A prefab's "front" faces `+z`. Parts marked (v) are visual only.

| Prefab | Parts | Height | Use |
|---|---|---|---|
| `city.car` | Body box 1.8 × 1.2 × 4.2 at (0, 0.6, 0); cabin box 1.6 × 0.6 × 2.2 at (0, 1.5, −0.2); four wheel cylinders r 0.4 h 0.5 at (±0.9, 0, ±1.3) (v) | 1.8 | Crouch cover at the bonnet, near-full cover at the cabin. A step for double jumps |
| `city.policeCar` | `city.car` plus a light bar box 1.2 × 0.5 × 0.5 at (0, 2.05, −0.2), `neon` | 2.3 | Barricade |
| `city.van` | Box 2.2 × 2.4 × 5 at (0, 1.2, 0); four wheels (v) | 2.4 | Full cover |
| `city.barrier` | Box 0.6 × 1.0 × 3 at (0, 0.5, 0) | 1.0 | Crouch cover |
| `city.planter` | Box 1.2 × 1.2 × 3 at (0, 0.6, 0), `concrete`; two spheres r 0.6 at (0, 1.5, ±0.8), `hedge` (v) | 1.2 | Crouch cover |
| `city.palm` | Trunk cylinder r 0.3 h 7, `wood`; crown sphere r 1.6 at (0, 7.6, 0), `hedge` | 9.2 | Dressing; the trunk is thin cover |
| `city.lamp` | Pole cylinder r 0.25 h 6; lamp box 0.5 × 0.5 × 1.5 at (0, 6.25, 0.5), `neon` | 6.5 | Lit path |
| `city.dumpster` | Box 1.4 × 1.4 × 2.4 at (0, 0.7, 0), `metal` | 1.4 | Crouch cover |
| `city.crateStack` | Box 1.4 × 1.4 × 1.4 at (0, 0.7, 0); box 1.4 × 0.7 × 1.4 at (0.3, 1.75, 0), `crate` | 2.1 | Full cover |
| `city.foodTruck` | Body box 2.4 × 3 × 6 at (0, 1.5, 0); awning box 1.5 × 0.5 × 3 at (1.95, 2.4, 0), `trim`; four wheels (v) | 3.0 | Full cover; the party |
| `city.busStop` | Back box 4 × 2.2 × 0.5 at (0, 1.1, 0.9), `glass`; roof box 4 × 0.5 × 2 at (0, 2.25, 0); bench box 3 × 0.5 × 0.6 at (0, 0.25, 0.4) | 2.5 | Full cover from one side |
| `city.ac` | Box 2 × 1.2 × 1.5 at (0, 0.6, 0), `metal` | 1.2 | Roof crouch cover |
| `city.statue` | Plinth cylinder r 0.9 h 3, `stone`; sphere r 0.8 at (0, 3.6, 0), `gold` | 4.4 | Full cover to circle |
| `city.standee` | Box 1 × 1.8 × 0.5 at (0, 0.9, 0), `crate`; carries a `dummy` enemy with 60 HP and no drops | 1.8 | Spell target |
| `city.generator` | Base box 1.6 × 1.6 × 1.6 at (0, 0.8, 0), `metal`; coil cylinder r 0.4 h 1.0 at (0, 1.6, 0), `neon` (weak spot); `disc` r 2 at (0, 0.02, 0) | 2.6 | Destructible target, def `gateGenerator` (§9) |
| `city.spawnGap` | For a 3 m gap between two building boxes. Origin on the door line, the gap runs to −z. Door box 3 × 3 × 0.5 at (0, 1.5, −0.25) (slides up); roof box 3 × 0.5 × 6 at (0, 3.25, −3); back wall box 3 × 4 × 0.5 at (0, 2, −5.75) | 3.5 | Street spawn door. Enemies wait inside, off the nav grid, until the door opens |
| `city.spawnRoom` | Free-standing, 4 × 3.7 × 4. Side walls two boxes 0.5 × 3.2 × 4 at (±1.75, 1.6, 0); back wall box 3 × 3.2 × 0.5 at (0, 1.6, −1.75); roof box 4 × 0.5 × 4 at (0, 3.45, 0); door box 3 × 2.7 × 0.5 at (0, 1.35, 1.75) | 3.7 | Spawn door for interiors, roofs and the plaza. Placed with its back to a wall |
| `mall.kiosk` | Counter box 3 × 1.2 × 2 at (0, 0.6, 0); two posts cylinder r 0.25 h 2.4 at (±1.4, 0, 0); roof box 3.4 × 0.5 × 2.4 at (0, 2.65, 0) | 2.9 | Crouch cover with a roof |
| `mall.bench` | Box 0.8 × 0.5 × 2.4 at (0, 0.25, 0) | 0.5 | Slide cover |
| `mall.table` | Cylinder r 0.9 h 0.8 | 0.8 | Low cover |
| `mall.vending` | Box 1.2 × 2 × 1 at (0, 1, 0), `metal` with a `neon` face | 2.0 | Full cover |
| `shrine.goo` | Plinth cylinder r 1.2 h 0.6; orb sphere r 0.6 at (0, 1.6, 0), `toxic`; four pillars cylinder r 0.4 h 4 at (±3, 0, ±3); `disc` r 4 at (0, 0.02, 0), `neon` | 4.0 | Spell shrine and hold zone |

## 8. Encounters

Every squad names a trigger (PLAN §5.5) and a spawn method (PLAN §5.4). `maxAlive` is 8 in every
encounter, flyers included; when a squad would pass it, the extra enemies wait behind their door.
Roles: fodder (`midget`), flyer (`flyingMidget`), ranged (`obama`, `robotLaser`), ranged heavy
(`robotShooter`), heavy (`bigObama`). No squad adds a third role; in a lockdown, up to two
stragglers of the wave before may be a third role for a few seconds (§14).

### E1 `S1-E1` Block Party

- **Space:** the road at x 98 to 146, 24 m wide, sidewalks open. **Objective:** `clearAll`.
- **Approaches:** straight up the road behind the cars, or along either sidewalk. **Cover in the
  first 15 m:** `S1-car-3`, `S1-car-4`, `S1-plant-1`, `S1-plant-2`.
- **Flag:** `noAmmoDrop` (the ammo lesson, §3).

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| A | `onEnter` x ≥ 98, alert on sight or sound | `placed` | Dancing in a ring round (121, 31) by the burning food truck | 4 midget | — | Midgets alone. A sneak shot on barrel `S1-brl-1` or `-2` kills up to four before they turn |
| B | `onKills(2)` | `door` | `S1-gap-NA`, "Taco Sproto", north side | 2 midget | 0.5 s between | They come to you: stand and shoot, or back up |
| C | `onKills(5)` | `door` | `S1-gap-SA`, "Laundromat", south side, behind and to the right | 3 midget | 0.5 s between | Turn round. Prompt: Dash. The reserve runs low here |

`maxAlive` 6. Weapons: the starting machine gun. Ammo: `A1` 2 m before the trigger; `A2`, `A3`
inside; `A4` at CP1. **Estimate:** 27 s × 1.3 = 35 s (0.6 min).

### E2 `S1-E2` Checkpoint

- **Space:** the road at x 150 to 205, an Empire barricade at x 188. **Objective:** `clearAll`,
  then switch `S1-sw-gate`.
- **Approaches:** car to car up the middle, the north sidewalk under the balcony, or the south
  sidewalk past the bus stop. **Cover in the first 15 m:** `S1-car-6`, `S1-car-7`, `S1-busstop`,
  `S1-plant-4`.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| A | `onEnter` x ≥ 150 | `placed` | Behind the barricade at (192, 22), (193, 30), (192, 38) | 3 obama | — | Obamas alone. Their burst has a 0.45 s wind-up: step behind a car, lean out between bursts |
| B | `onKills(2)` | `door` | `S1-gap-SB`, "Pawn alley", south side, level with the player's cover | 3 midget | 0.5 s between | First mix. Midgets flush you out of cover while one Obama still shoots |
| C | `onKills(5)` | `hidden` | Step up to the parapet of `S1-balcony` (y 4.25), ahead and to the left | 2 obama | 1 s | Look up. Enemies can be above you |

`maxAlive` 6. Weapons: machine gun. Ammo: `A4` 4 m before the trigger, `A5` behind the barricade;
enemy drops are on from here. `S1-brl-3` behind the barricade rewards a shot through the gap.
**Estimate:** 39 s × 1.3 = 51 s (0.8 min), plus 4 s at the switch.

### E3 `S2-E3` Alley Cat

- **Space:** alley A, 6 × 55 m, a catwalk at y 4 on the west wall. **Objective:** `clearAll`.
- **Approaches:** the alley floor with the shotgun, or up `S2-cat-st` to the catwalk and shoot down.
  **Cover in the first 15 m:** `S2-crate-1`, `S2-dump-1`, `S2-dump-2`.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| A | `onEnter` z ≤ 138 | `door` | `S2-gap-M`, "Sproto Meats", far end, 40 m ahead | 5 midget | 0.4 s between | A swarm in a corridor. The shotgun kills two a shot at 7 m |
| B | `t+7` | `door` | `S2-gap-K`, "Back Door", 3 m behind the trigger line | 3 midget | 0.4 s between | Enemies come from behind. The door clang and the motion tracker warn you |
| C | `onKills(6)` | `drop` | Off the catwalk at z 110 and z 118 | 2 midget | 1.2 s shadow ring | Look up in a corridor too |
| D | `onRemain(1)` | `door` | `S2-gap-M` again | 2 midget | — | Reload timing: the last two arrive as the magazine empties |

`maxAlive` 8. Weapons: `S2-rack-sg` 12 m before the trigger. Ammo: `A6` (shells) and `A7` (bullets)
at the rack. **Estimate:** 36 s × 1.3 = 47 s (0.8 min), plus 5 s at the rack.

### E4 `S2-E4` Sticky Situation (hold)

- **Space:** the Shrine Court, 36 × 34 m, one 3 m gate in the north wall. **Objective:** `hold` the
  shrine circle (r 4) for 25 s. Progress pauses outside the circle and does not reset.
- **Approaches:** hold the circle and goo the gate, or stand at a planter 8 m from the gate with
  the shotgun and step back into the circle between squads. **Cover:** `S2-plant-1` to `-4`, the
  four shrine pillars.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| — | Shrine used | — | `S2-standee-1` to `-3` between the shrine and the gate | 3 standee | — | Try the spell on targets that do not fight back. The puddle stays 4 s |
| A | `onHold(0%)` | `door` | `S2-D2`, the north gate | 3 midget | 0.6 s between, single file | Goo Bolt on a choke point: one bolt slows all three |
| B | `onHold(40%)` | `door` | `S2-D2` | 5 midget | 0.4 s between | The same, harder. Goo, then shoot the queue. First hold zone |

`maxAlive` 8. Weapons: shotgun, machine gun, Goo Bolt (15 mana a cast, 6 casts on a full bar).
Ammo: `A8` (bullets) and `A9` (shells) at the shrine. **Estimate:** 24 s × 1.3 = 31 s (0.5 min);
the 25 s hold runs inside that. Plus 15 s for the shrine and the standees.

### E5 `S2-E5` Pigeons

- **Space:** roofs 1a (37 × 21 m, y 10.5) and 1b (37 × 18 m, y 9), a 4 m gap between them.
  **Objective:** `clearAll`.
- **Approaches:** fight from the top of the fire escape with the tank as cover, or push across the
  roof and take the AC units. **Cover in the first 15 m:** `S2-ac-2`, `S2-ac-3`, `S2-tank`.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| A | `onEnter` roof 1a | `placed` | Circling the water tank at (66, 14.5, 50) | 2 flyingMidget | — | Flyers alone. They jink every 0.5 to 1.2 s: fire in short bursts, lead them. 30 HP |
| B | `onKills(1)` | `air` | From behind `S2-billboard` on roof 1b | 2 flyingMidget | 1 s engine sound | Flyers from a second direction |
| C | `onEnter` the plank volume (x 48 to 52, z 36 to 40) | `air` | Rising out of the gap, one each side | 2 flyingMidget | 1 s engine sound | Fight while crossing a gap. A fall lands in the cross alley by the secret cache |

`maxAlive` 4. Weapons: machine gun (the shotgun cannot reach). Ammo: `A11` (bullets) on the top
landing, `A10` (shells) in alley B. **Estimate:** 30 s × 1.3 = 39 s (0.7 min). The rest of the beat
is 132 m of roofs and scaffold and 8 s at the revolving door.

### E6 `S3-E6` Mall Lockdown **[L]**

| Lockdown card | |
|---|---|
| Room | The mall interior: play floor x 10 to 76, z 10 to 60 = **66 × 50 m**, two floors (F1 y 0, F2 y 5) round a 34 × 26 m atrium. Ceiling: roof and glass skylight at y 10 |
| Entry door | `S3-L1-in` at (45, 60.3), 6 m wide. Drops 1 s after the player crosses `S3-L1-thresh` at z 54 |
| Exit door | `S3-L1-out` at (76.3, 35), 6 m wide, to the service corridor and Depot 1 |
| Checkpoint outside | CP4 at (45, 66) in the entry hall |
| Spawn points | **M-SEC** (F1 west, door faces east), **M-TOYS** (F1 south-east, faces north), **M-OFFICE** (F2 north-east, faces south), **M-FOOD** (F2 east, faces west), **M-SKY** (two skylight hatches) |
| Cover | F1: 8 pillars, statue, 2 kiosks, 4 benches, 4 planters. F2: 3 vending machines, 3 pillars, 5 tables, 3 counters. More than 8 pieces, and two height levels |
| Tools inside | Ammo boxes `A15` (bullets), `A16` (shells), `A17` (bullets, F2). Shock barrels `S3-brl-1` to `-3` |
| Reward | Ammo crate `C1`, chest `S3-chest`, a health pick-up. Saves CP5 |

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | `onEnter` threshold | `placed` | Patrolling the atrium round the statue | 2 robotLaser | Laser Bots alone. A 0.5 s red telegraph, then a 2-shot burst; the head is the weak spot. Kiosks and pillars break the line |
| 1 | with wave 1, `t+4` | `door` | M-SEC | 2 robotLaser | The same, from the side. Barrel `S3-brl-1` is by their door |
| 2 | `onRemain(2)` or 25 s after wave 1 | `door` | M-TOYS | 5 midget | Fodder and ranged together |
| 2 | with wave 2 | `door` | M-FOOD | 2 robotLaser | They stop at the F2 east rail and fire down. Only their heads show over the glass. Barrel `S3-brl-3` is beside them |
| 3 | `onRemain(2)` or 25 s after wave 2 | `drop` | M-SKY | 4 flyingMidget | Flyers indoors: they orbit inside the atrium. Go up an escalator to shoot level |
| 3 | with wave 3, `t+3` | `door` | M-SEC | 3 midget | Keeps the player moving on F1 |
| 4 | `onRemain(2)` or 25 s after wave 3 | `door` | M-OFFICE | 2 obama | They take the F2 north rail |
| 4 | with wave 4 | `door` | M-TOYS (3) and M-SEC (2) | 5 midget | Last push from two sides |

Totals: 6 robotLaser, 13 midget, 4 flyingMidget, 2 obama = **25 enemies, 4 waves**. `maxAlive` 8.
**Estimate:** 107 s × 1.3 = 139 s (2.3 min).

### E7 `S4-E7` Going Up

- **Space:** parking decks G, P1 and P2, two 8 × 32 m ramps. **Objective:** `destroy` generator
  `S4-gen`.
- **Approaches:** up the middle of each ramp behind a goo puddle, or along the ramp's outer edge
  out of the rail's line of fire. On P2: straight at the generator between the cars, or round the
  north side of the core. **Cover in the first 15 m:** `S4-G-cars` 1 and 2, `S4-G-crate`, the G pillars.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| A | `onEnter` G, x ≥ 4 | `hidden` | From behind the cars on the P1 north landing, down ramp 1 | 4 midget | 0.4 s between | Fighting uphill. **Goo spot 1**: a puddle at the ramp foot (14, 0, 4) |
| B | `onKills(3)` | `hidden` | Step up to `S4-P1-rail` above ramp 1 | 2 obama | — | Ranged enemies above. Use the ramp's outer edge, or climb and flank them on P1 |
| C | `onEnter` P1 north landing | `hidden` | Between `S4-P1-cars` 3 and 4 | 2 midget | — | A short ambush in parked cars |
| D | `onEnter` P1 south landing | `hidden` | From the P2 south landing, down ramp 2 | 3 midget | 0.4 s between | The same lesson, second ramp. Goo at (46, 4, 56) |
| E | `onEnter` P2 south landing | `placed` | At (46, 8, 40), facing the landing across 40 m of deck | 1 robotShooter | — | The Shooter Bot alone. Arm bursts, then a big head laser with a 1.0 s wind-up for 26 damage: break the line behind a car or a pillar. 170 HP |

After E dies, or while it lives, the player destroys `S4-gen` (200 HP). The cage drops, CP6 saves,
the lift call button works. `maxAlive` 6. Weapons: shotgun for the ramps, machine gun for squad B
and the Shooter Bot. Ammo: `A18`, `A19`, `A20`. **Estimate:** 48 s × 1.3 = 62 s (1.0 min), plus
6 s for the generator and 6 s for the lift.

### E8 `S4-E8` Roof Lockdown **[L]**

| Lockdown card | |
|---|---|
| Room | The parking roof, **60 × 60 m** at y 12, plus the 30 × 5 m sky bridge once it extends. Glass walls 7 m high, force-field lid at y 19 |
| Entry door | `S4-L2-in` on the lift lobby at (41.3, 30). Drops 1 s after the player crosses `S4-L2-thresh` at x 47 |
| Exit door | `S4-L2-out` at the far bridgehead (90.3, 30) |
| Checkpoint outside | CP6 at the P2 lift |
| Spawn points | **R-STAIR** (the stair hut, faces west), **R-HATCH-N** (north edge), **R-HATCH-S** (south edge), **R-AIR-E** and **R-AIR-W** (through the lid above the east and west walls), **R-BRIDGE** (the exit slab, opens for wave 4 only) |
| Cover | 4 cars, 1 van, 2 crate stacks, 4 AC units, 2 barriers, the stair hut and the lift lobby: 15 pieces |
| Tools inside | Ammo boxes `A22` (bullets), `A23` (shells), `A24` (bullets). Shock barrel `S4-brl-1` |
| Reward | Ammo crate `C2`, chest `S4-chest`, a mana bloom. Saves CP7 |

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | `onEnter` threshold | `door` | R-STAIR (3) and R-HATCH-N (3) | 6 midget | A swarm in the open from two sides. Goo is weaker here than in a corridor: keep moving |
| 2 | `onRemain(2)` or 25 s after wave 1 | `air` | R-AIR-E (2) and R-AIR-W (2) | 4 flyingMidget | Flyers from both sides at once |
| 2 | with wave 2, `t+4` | `door` | R-HATCH-S | 3 midget | Fodder under the flyers |
| 3 | `onRemain(2)` or 25 s after wave 2 | `door` | R-HATCH-N (3) and R-HATCH-S (3) | 6 midget | The bridge starts to extend: three segments, 3 s each |
| 3 | with wave 3, `t+6` | `air` | R-AIR-W | 3 flyingMidget | The west flyers pull the player's eyes off the bridge |
| 4 | `onRemain(2)` or 25 s after wave 3 | `door` | R-BRIDGE | 1 robotShooter, 2 robotLaser | They walk the 30 m bridge in a file. Fight them from the barriers and crates at its mouth; barrel `S4-brl-1` is where they step off |

Totals: 15 midget, 7 flyingMidget, 2 robotLaser, 1 robotShooter = **25 enemies, 4 waves**.
`maxAlive` 8. **Estimate:** 101 s × 1.3 = 131 s (2.2 min).

### E9 `S5-E9` Toll Booth

- **Space:** the freeway deck, 18 m wide: leg A (78 m) with stalled cars and a toll plaza, then
  leg B (52 m) and the off-ramp. **Objective:** `clearAll`.
- **Approaches (squad A):** circle the Big Obama round a car to reach its back, or hold range and
  wait for it to turn after a ground pound. **Cover in the first 15 m:** `S5-A-cars` 1 to 3, `S5-A-van`.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| A | `onEnter` x ≥ 18 | `door` | The toll arms lift; it walks out of the middle lane from (52, 12, 9) | 1 bigObama | 2 s walk-in | The heavy alone. Front shield, 320 HP, back battery takes ×2.5. Ground pound inside 3.2 m with a 0.9 s wind-up. It turns at 70°/s: run round a car and it cannot keep up |
| B | `onRemain(0)`, 2 s later | `door` | The bus door at (55, 12, 5), east of the toll | 4 midget | 0.4 s between | **Goo spot 2**: they funnel through the toll lanes |
| B | with the midgets | `hidden` | Step out on `S5-toll-canopy` (y 15.5) | 2 obama | — | Obamas resist goo: bullets for them, goo for the lanes |
| C | `onEnter` leg B, z ≥ 20, or on alert | `placed` | Laser Bot at (66, 12, 64), Shooter Bot on the ramp at (69, 9.8, 80) | 1 robotLaser, 1 robotShooter | — | A long-range duel down a straight road, 30 to 60 m. The gantry is the high-ground option |

`maxAlive` 6. Weapons: machine gun for the battery, shotgun for the lanes. Ammo: `A26`, `A27` at
the bridgehead, crate `C3` behind the toll, `A28` on the gantry, `A29` at the corner.
**Estimate:** 69 s × 1.3 = 90 s (1.5 min).

### FIN `S6-FIN` The Gatekeeper **[L]**

| Lockdown card | |
|---|---|
| Room | The plaza arena, x 4 to 84, z 14 to 92 = **80 × 78 m**. Walls 10 m, force-field lid at y 20. Two height levels (the bandstand, y 2.4) |
| Entry door | `S6-L3-in` at (44, 13.7), 6 m wide. Drops 1 s after the player crosses `S6-L3-thresh` at z 20 |
| Exit door | `S6-gate`, the city gate |
| Checkpoint outside | CP8 at Depot 2 in the alcove |
| Spawn points | **B-W** (west booth), **B-E** (east booth), **T-W** and **T-E** (tower doors, south), **AIR-S** (over the gate, through the lid) |
| Cover | Fountain, bandstand, 4 statues, 4 planters, 2 crate stacks, 2 kiosks, 2 generator screens: 16 pieces |
| Tools inside | Racks `S6-rack-sg`, `S6-rack-mg`; ammo boxes `A30` to `A33`; ammo crate `C4`; 2 fire and 2 shock barrels |
| Reward | The Gatekeeper's two guns (§12). The gate opens |

The parts table is in §10. The parts are this lockdown's waves: 1 mini-boss and 24 adds =
**25 enemies, 3 parts**. **Estimate:** 180 s (3.0 min), stated.

## 9. New enemies

L01 proposes **no new enemy** beyond PLAN §5.1. It is the first campaign use of `robotLaser` and
`robotShooter`, and it adds one mini-boss definition and one destructible target.

**Enemies used, tier 1** (from `src/data/enemies.js`)

| Id | HP | Speed | Attack | Weak spot | Element |
|---|---|---|---|---|---|
| `midget` | 40 | 7.8 | Melee 9, reach 1.3 m, wind-up 0.25 s | Head | — |
| `flyingMidget` | 30 | 10.5 | 2 pellets × 2 damage every 1.1 to 1.8 s; orbits 7 to 14 m out, 3 to 6.5 m up | Head | Weak to shock |
| `obama` | 70 | 4.2 | 3-round burst × 6, wind-up 0.45 s, every 2 to 3 s; keeps 9 to 20 m | Head | Resists goo, weak to fire |
| `robotLaser` | 60 | 4.6 | 2 lasers × 7, wind-up 0.5 s, every 1.6 to 2.6 s; keeps 8 to 18 m | Head (r 0.42) | Resists fire, weak to shock |
| `robotShooter` | 170 | 3.6 | 3-round burst × 6 every 1.4 to 2.2 s; big laser 26, wind-up 1.0 s, every 5.5 to 7.5 s; keeps 10 to 22 m | Head (r 0.3) | Resists fire, weak to shock |
| `bigObama` | 320 | 2.4 | Ground pound 25 in 3.2 m, wind-up 0.9 s; 6-round hose × 5; turns 70°/s | Back battery ×2.5; front shield | Resists fire, weak to shock |

**`gatekeeper`: Big Bitcoin Obama "The Gatekeeper"** (mini-boss; a new entry built on `bigObama`)

| Field | Value |
|---|---|
| Model | `obama`, stage 3, scale 1.5, gold tint, a gate key on a chain (box and cylinder) |
| HP | 1,600 (5 × `bigObama`), tier 1. Not in the hub's canonical boss table |
| Size | Radius 1.35, height 3.9 |
| Speed, turn rate | 2.4 m/s and 60°/s in part 2; 3.4 m/s and 60°/s in part 3 |
| Hitboxes | Body capsule r 1.35, y 0 to 3.9. Shield sphere r 1.5 at (0, 1.95, 1.45). Weak sphere (battery) r 0.57 at (0, 2.25, −1.35), ×2.5. Vent weak sphere r 0.5 at (0, 3.4, −0.6), `onlyWhen: 'venting'`, ×2.5 |
| Hose | 8 rounds × 6 damage, gap 0.12 s, wind-up 0.7 s, every 3 to 4 s, spread 7°, range 40 m |
| Ground pound | Inside 4.5 m: wind-up 1.0 s, radius 4.5, 30 damage, knockback |
| Double pound (part 3) | Two pounds 0.7 s apart, radius 4.5 then 6 |
| Poise | Cannot be staggered except by the scripted kneel between parts 2 and 3 |
| Affinity | Resists fire, weak to shock (as `bigObama`). Immune to slows; goo is for his adds |
| Drops | Two guns (§12), 6 ammo packs, 2 big health |

**`gateGenerator`** (destructible target, prefab `city.generator`): 200 HP, no AI. The `neon` coil
on top is a weak spot (×2). Takes 60 from a barrel. Four in the level: `S4-gen` (the lesson) and
`S6-gen-N`, `-W`, `-E` (the finale).

## 10. Finale: The Gatekeeper

Mini-boss, 3 parts, 180 s. Every part uses something the level has already taught: generators
(E7), Laser and Shooter Bots (E6 to E9), the heavy's shield and back battery (E9), midgets through
a narrow door (E4, E7, E9), flyers in a sealed arena (E8).

On crossing the threshold: the entry slab drops, the card "Gate Plaza" shows for 3 s, the boss bar
appears with three pips. The Gatekeeper stands at (44, 0, 89) inside the shield bay, counting coins.

| Part | Gatekeeper HP | What he does | Adds: when, where, what | Arena change | Ends when |
|---|---|---|---|---|---|
| **1. Closed for Audit** (65 s). Kind: intermission with destroyable parts | 1,600, cannot be hurt | Stays in the shield bay. No attacks. Points at the nearest live generator (a hint) | Start: `placed`, one robotLaser at each generator: (16, 0, 54), (72, 0, 54), (44, 2.4, 30). `onPartDestroyed` (first generator): `door` B-W, 1 robotShooter. `onPartDestroyed` (second generator): `door` B-E, 1 robotShooter and 1 robotLaser. **6 adds** | Each generator that dies dims one third of `S6-shield` | All three `gateGenerator`s are destroyed (200 HP each). The shield drops, `S6-gate` opens a third, the adds left alive stay |
| **2. The Toll** (60 s). Kind: phase | 1,600 → 720 (100% to 45%) | Walks at the player. Hose at 8 to 40 m. Ground pound inside 4.5 m. Front shield; back battery ×2.5 | `onBossHp(90%)`: `door` T-W, 4 midget. `onBossHp(75%)`: `door` T-E, 4 midget. `onBossHp(60%)`: `door` T-W 2 and T-E 2, 4 midget. **12 adds**. Goo spot 3: the tower doors are 2.4 m wide | None. The fountain column and the four statues are there to circle | HP reaches 45%. He kneels for 2 s (the battery is open to free hits), then stands up gold |
| **3. Overdraft** (55 s). Kind: phase with a weak spot on a schedule | 720 → 0 | Enraged: 3.4 m/s, double pound, hose every 2.5 s. An overclock field cuts all damage to him to 25% and the back battery retracts. **Vent:** 8 s into the part and every 12 s after, he stops for 3.5 s, drops the shield and raises the battery on a stalk above his head, ×2.5, visible from every side. A pip on the boss bar blinks for 1.5 s before each vent | `onBossHp(35%)`: `air` AIR-S, 3 flyingMidget. `onBossHp(15%)`: `air` AIR-S, 3 flyingMidget. **6 adds** | His first double pound breaks the fountain: the column and coin fall, `S6-fountain-rubble` replaces them. The statues remain | HP reaches 0. He falls against the gate, it opens fully, the adds left alive pop. Objective: `reach` `S6-exit` |

**HP and timing.** Part 2 removes 880 HP in about 60 s. Part 3 removes 720 HP across about four
vents (180 HP a vent: 3.5 s of machine-gun fire on a ×2.5 spot at half accuracy is about 390, so
two good vents can end it early). These are first-pass numbers; tune HP after the vertical slice so
parts 2 and 3 each take 50 to 65 s on Normal.

**Pressure.** In part 1 the Gatekeeper does not attack and the adds are ranged and ranged heavy.
In parts 2 and 3 he is one role and the adds are one more (fodder, then flyers). Never more than 8
adds alive.

**Starter loadout check.** Every part can be done with a Common machine gun: generators and bots
have no armour, the battery and the vent take bullets, and `C4` and four ammo boxes are inside.

**Dying** restarts the lockdown at part 1 from CP8 with the doors open (PLAN §5.6).

## 11. Mechanisms, magic and explosives used

Everything here is new to the campaign, because this is the first level. "First" gives the place
the player meets it.

| Kind | Ids | First | Notes |
|---|---|---|---|
| Ammo box, ammo crate, depot crate | `A1` to `A33`, `C1` to `C4`, `D1`, `D2` | `A1`, S1 | PLAN §7.4. The lesson is in §3 |
| Explosive barrel, fire | `S1-brl-1` to `-3`, `S6-brl-f1`, `-f2` | E1 | 30 HP, 4 m, 60 to enemies, 25 to the player, burn pool 4 s. Only next to midgets and Obamas |
| Explosive barrel, shock | `S3-brl-1` to `-3`, `S4-brl-1`, `S6-brl-s1`, `-s2` | E6 | Stun 1.5 s. Only next to bots, which are weak to shock |
| Door | `S1-D1`, `S2-D1`, `S2-D2`, `S3-D3`, `S3-D4`, spawn doors | E2 | Slides up in 0.8 s |
| Switch | `S1-sw-gate` (1.5 s), `S4-sw-lift` (1 s) | E2 | Hold Interact |
| Weapon rack | `S2-rack-sg`, `S6-rack-sg`, `S6-rack-mg` | S2 | Common. Each has a `why` |
| Spell shrine | `S2-shrine` | S2 | Grants Goo Bolt, refills mana, saves CP3 |
| Hold zone | the shrine `disc`, r 4, 25 s | E4 | Progress pauses outside the circle |
| `gooGear` | `S2-revolve` | S2 forecourt | The only spell-driven mechanism in L01 |
| Lockdown | `S3-lockdown-1`, `S4-lockdown-2`, `S6-lockdown-3` | E6 | PLAN §5.6 |
| Lockdown reward chest | `S3-chest`, `S4-chest` | E6 | One gun each (§12) |
| Depot | `S3-depot1`, `S6-depot2` | after E6 | Depot crate, health station, spell loadout bench, ticket shop terminal, checkpoint. No Weapon Box |
| Destructible target | `S4-gen`, `S6-gen-N`, `-W`, `-E` | E7 | `gateGenerator`, 200 HP |
| Shield door | `S4-cage`, `S6-shield` | E7 | A door whose `opens` is `destroyed:<target ids>` |
| Lift (mover) | `S4-lift` | E7 | `onTrigger`, 2 m/s, carries the player |
| Extending bridge (mover) | `S4-bridge-1` to `-3` | E8 wave 3 | Three `oneShot` movers started by the wave |
| Mana bloom | in `S4-reward-2` | E8 reward | Refills 50 mana |
| Void rescue | `S5-rescue` | S5 | Safety net only: returns the player to the deck with no health loss |
| Checkpoint | CP1 to CP8 | E1 | Toast "BONK" |

**Magic.** Goo Bolt only. No Conductive combo yet (Chain Zap arrives in L02). No `nullZone`, no
conduits, no pressure plates.

**Explosives.** Barrels only. No gas lines, charge packs, mines or ore carts. No barrel stands
where an enemy attack can set it off beside the player's first cover.

**Hazards.** None during fights. The sinkhole and the roof gap cost time, not health.

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

### Checkpoints and depots

| Id | Section, at | Saves when | Clock | Since the last one |
|---|---|---|---|---|
| CP1 | S1 (146, 0, 30) | E1 is clear | 1:15 | 75 s |
| CP2 | S2 (40, 0, 147), at the shotgun rack | The player enters S2 | 2:24 | 69 s |
| CP3 | S2 (40, 0, 78), the shrine | The shrine is used | 3:30 | 66 s |
| CP4 | S3 (45, 0, 66), the entry hall | The player enters S3. Outside lockdown E6 | 5:29 | 119 s |
| CP5 | S3 (45, 0, 31), then Depot 1 (98, 0, 35) | E6 is clear; again at the depot | 8:00 | 145 s |
| CP6 | S4 (41.5, 8, 30), the P2 lift | `S4-gen` is destroyed. Outside lockdown E8 | 10:35 | 108 s after leaving the depot |
| CP7 | S4 (54, 12, 30), the roof | E8 is clear | 12:55 | 137 s |
| CP8 | S6 (44, 0, 5), Depot 2 | The player enters S6. Outside lockdown FIN | 15:05 | 128 s |

Eight checkpoints. Every gap is under 2.5 min except the finale: 180 s with no checkpoint inside
it, because a lockdown restarts at its first wave (§14).

| Depot | Where | Contents |
|---|---|---|
| Depot 1 `S3-depot1` | S3 service corridor, 8:07 on the clock | Depot crate `D1`, health station, spell loadout bench, ticket shop terminal, CP5 |
| Depot 2 `S6-depot2` | S6 alcove, 15:05 on the clock | Depot crate `D2`, health station, spell loadout bench, ticket shop terminal, CP8 |

### Weapons

| Id | Gun | Tier | At | `why` |
|---|---|---|---|---|
| (start) | Machine Gun | Common | — | Starting gun. First find of the type |
| `S2-rack-sg` | Shotgun | Common | S2 (38.2, 0.9, 146) | `'E3 corridor swarm'`. 12 m before E3's trigger. First find of the type |
| `S6-rack-sg` | Shotgun | Common | S6 (39, 0.9, 25) | `'FIN adds at the tower doors'` |
| `S6-rack-mg` | Machine Gun | Common | S6 (44, 0.9, 25) | `'FIN, in case the machine gun was swapped away'` |

Gun types first found in L01: **Machine Gun** and **Shotgun**. Only these two are in the drop pool
here (Pocket Bonker too, if it has landed; nothing depends on it).

### Loot table

**Tier odds for enemy drops in L01** (PLAN §7.3): Common 85%, Uncommon 15%, Rare 0, Epic 0,
Legendary 0. Base tier for racks: Common. Best tier in the level: Uncommon.

Chance of a gun per kill stays as today: midget 2%, flyingMidget 4%, obama 6%, robotLaser 6%,
robotShooter 10%, bigObama 10%. With L01's 139 enemies that is about 4.7 random guns a run.

**Guaranteed drops**

| # | Source | Where | What |
|---|---|---|---|
| — | Elites | — | None. L01 has no elites |
| 1 | Lockdown chest `S3-chest` | S3 (45, 0, 33), by the statue, when E6 clears | One gun, Common or better, rolled from the L01 odds. A Shotgun if the player has not taken the rack, otherwise the type they do not hold in the active slot |
| 2 | Lockdown chest `S4-chest` | S4 (54, 12, 32), at the bridge mouth, when E8 clears | One gun, Common or better, the type the player carries fewer of |
| 3, 4 | Mini-boss, the Gatekeeper | S6, where he falls, about (44, 0, 88) | Two guns: one **Uncommon** Machine Gun (guaranteed one tier above base), one rolled from the L01 odds. This is also the FIN lockdown's reward |
| 5 | Secret weapon cache `S2-cache` | S2 (77, 0, 38), the dead end of the cross alley | One **Uncommon** Shotgun (the level's best tier) |

Other drops: ammo packs, health, mana and tickets as today. No resources.

### Ammo boxes and crates

Bullets boxes give 60, shells boxes give 12. `y` is the floor the box sits on.

| Id | Type | Section, at | Why it is there |
|---|---|---|---|
| A1 | bullets | S1 (96, 0, 30) | Ammo lesson step 1; 2 m before E1 |
| A2, A3 | bullets | S1 (127, 0, 29); (129, 0, 31) | Ammo lesson step 3; inside E1 |
| A4 | bullets | S1 (146, 0, 31) | CP1; 4 m before E2 |
| A5 | bullets | S1 (192, 0, 31) | Behind the barricade, by the switch |
| A6 | shells | S2 (41.8, 0, 146) | 4 m from `S2-rack-sg` |
| A7 | bullets | S2 (41.8, 0, 148) | CP2; before E3 |
| A8 | bullets | S2 (44, 0, 78) | CP3, the shrine; E4 |
| A9 | shells | S2 (36, 0, 78) | The shrine; E4 |
| A10 | shells | S2 (39.5, 0, 44) | Alley B, by `S2-dump-4` |
| A11 | bullets | S2 (42.25, 10.5, 49.5) | Top of the fire escape; before E5 |
| A12 | bullets | S2 (60, 0, 9) | Forecourt, after E5 |
| A13 | bullets | S3 (43.5, 0, 66) | CP4; before E6 |
| A14 | shells | S3 (46.5, 0, 66) | CP4; before E6 |
| A15 | bullets | S3 (36, 0, 26) | Inside E6, by kiosk 1 |
| A16 | shells | S3 (54, 0, 44) | Inside E6, by kiosk 2 |
| A17 | bullets | S3 (66, 5, 37) | Inside E6, F2, top of the east escalator |
| A18 | bullets | S4 (3, 0, 33) | S4 entry; before E7 |
| A19 | shells | S4 (58, 4, 10) | P1 north landing; before ramp 2 |
| A20 | bullets | S4 (5, 8, 56) | P2 south landing; before the Shooter Bot |
| A21 | bullets | S4 (42.5, 8, 32) | CP6; before E8 |
| A22 | bullets | S4 (44, 12, 30) | Inside E8, 3 m past the entry slab |
| A23 | shells | S4 (50, 12, 38) | Inside E8 |
| A24 | bullets | S4 (12, 12, 30) | Inside E8, west side by the van |
| A25 | bullets | S4 (57, 12, 34) | CP7, the bridge mouth |
| A26 | bullets | S5 (8, 12, 16) | Bridgehead; before E9 |
| A27 | shells | S5 (8, 12, 14) | Bridgehead; before E9 |
| A28 | bullets | S5 (69, 19, 30) | The gantry |
| A29 | bullets | S5 (66, 12, 22) | Start of leg B; before squad C |
| A30 | bullets | S6 (49, 0, 25) | Inside FIN, by the racks |
| A31 | shells | S6 (39, 0, 26.5) | Inside FIN, 1.5 m from `S6-rack-sg` |
| A32 | bullets | S6 (20, 0, 26) | Inside FIN, kiosk 1 |
| A33 | shells | S6 (68, 0, 26) | Inside FIN, kiosk 2 |
| C1 | ammo crate (3 uses) | S3 (45, 0, 31) | E6 reward |
| C2 | ammo crate (3 uses) | S4 (54, 12, 30) | E8 reward |
| C3 | ammo crate (3 uses) | S5 (48, 12, 16) | Behind the toll booths, mid E9 |
| C4 | ammo crate (3 uses) | S6 (44, 0, 23) | Inside FIN |
| D1 | depot crate (unlimited) | S3 (94, 0, 31.5) | Depot 1 |
| D2 | depot crate (unlimited) | S6 (37, 0, 4) | Depot 2, in the mini-boss section |

**Count:** 33 ammo boxes (23 bullets, 10 shells), 4 ammo crates, 2 depot crates.

**Placement rules (PLAN §7.4), checked:** a shells box within 30 m of each Shotgun rack (A6, A31)
and a bullets box within 30 m of the Machine Gun rack (A30); a box within 20 m before E1 to E9 and
a depot crate before FIN; at least two boxes inside each lockdown (three, three and four) and a
crate in each reward (C1, C2; FIN has C4 inside and D2 outside); a box or a depot crate at every
checkpoint.

### Ammo budget

Total enemy health on Normal: 85 midget × 40 + 11 obama × 70 + 23 flyingMidget × 30 + 13 robotLaser
× 60 + 5 robotShooter × 170 + 1 bigObama × 320 + Gatekeeper 1,600 + 4 generators × 200 + 3 standees
× 60 = **9,390 HP**. Assumed split: machine gun 70%, shotgun 22%, Goo Bolt and barrels 8%.
Weak-spot multipliers are ignored, so the asks are on the high side.

| | Bullets (Machine Gun, the headline gun) | Shells (Shotgun) |
|---|---|---|
| Damage asked | 6,573 HP | 2,066 HP |
| Per round | 9 a bullet, 55% hit | 72 a shell, 60% of pellets land = 43 |
| **Rounds asked** | **1,328** | **48** |
| Start | 36 + 36 = 72 | 6 in the rack gun |
| Ammo boxes | 23 × 60 = 1,380 | 10 × 12 = 120 |
| Ammo crates (one use each counted, to 50% of cap) | 4 × 150 = 600 | 4 × 20 = 80 |
| Depot crates (two, to the cap) | 2 × 300 = 600 | 2 × 40 = 80 |
| **Placed total** | **2,652 = 2.0 ×** | **286 = 6.0 ×** |
| Enemy drops: about 64 packs expected (E1 has none), smart-split 60 : 40, half picked up | 19 × 45 = 861 | 13 × 8 = 102 |
| **Total** | **3,513 = 2.6 ×** | **388 = 8.1 ×** |

Both pass the 1.5× rule on placed ammo alone. Shells are generous on purpose: L01 teaches the
shotgun and should not punish missing with it. The tightest stretch for bullets is the finale: it
asks about 490 (the Gatekeeper, three generators, 24 adds) and the player enters from `D2` with
480, with A30, A32 and three uses of C4 inside.

### Power-ups

None. Overshield is first found in L02.

### Secrets

| Secret | Where | How to reach it | Gives |
|---|---|---|---|
| **Golden Bonk** `S1-bonk` | S1 (163, 6.0, 45.25), east end of the billboard catwalk | Roof of `S1-car-6` (1.8 m), double jump to `S1-awning` (3.8 m), double jump to `S1-bb-walk` (6.0 m) | Modifier **Big Head Mode**: every enemy gets the big-head effect (the existing `bigHeadT`) |
| **Mana Battery** `S5-battery` | S5 (44, 15.5, 15), south end of the toll canopy | Roof of `S5-step-car`, the bus roof, a 6 m sprint jump west | +10 max mana, +0.5 mana/s |
| **Secret weapon cache** `S2-cache` | S2 (77, 0, 38), the cross alley under the roof gap | Drop off the plank or the roof edge on purpose. Return by the fire escape | One Uncommon Shotgun |
| Audit File 1 `S1-file-1` | S1 (88.5, −1.5, 22), in the sinkhole | Fall in, or walk down `S1-pit-ramp` | Tickets. *"Invoice 0001: one city gate, closed. Billed to: everyone."* |
| Audit File 2 `S2-file-2` | S2 (66, 13.7, 50), on the water tank | `S2-ac-1` (1.2 m), then a double jump | Tickets. *"Memo: the mall bots are leased from Glowie. Do not scratch them."* |
| Audit File 3 `S4-file-3` | S4 (4, 4, 57), the P1 pocket | Behind `S4-P1-van`, off the critical path | Tickets. *"Parking fine: B. Obama (Big). Vehicle: none. Bays occupied: four."* |

<!-- PART-5 -->
