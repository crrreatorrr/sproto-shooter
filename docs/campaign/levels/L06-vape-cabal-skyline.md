# L06: Vape Cabal Skyline

Level document for `docs/campaign/PLAN.md` (cited as **PLAN §x**). Engine spec: `docs/codex/C-campaign-levels.md`
(**C §x**). Boss spec: `docs/codex/C-bosses-sproto-duel.md` (**B §x**). This file replaces
"L6: Vape Cabal Skyline" in `docs/codex/C-level-designs.md`. Plan only: nothing here is built.

## 1. Header

| | |
|---|---|
| Id, name | `L06`, Vape Cabal Skyline |
| Stage, lighting | `city`, Los Angeles at night, neon, steady rain (`lighting: { weather: 'rain' }`) |
| Tier | 6 (enemy HP and damage × 1.15⁵ = 2.01) |
| Par | 20:00. Estimate **21:48** (§4), inside ±2:00 |
| Jetpack | Off in S1 and S2. On from the vending machine in S3 (rooftops onward), and on in `SB` |
| Enemy total | **180** (102 in seven encounters, 33 in the mini-boss fight, 45 boss adds), plus 2 finale bodies |
| Route length | **1,037 m** (609 m on foot, 138 m on two ziplines, 290 m flown) |
| Sections | 6: S1 Freeway Convoy, S2 Traffic Jam and Toll Plaza, S3 Billboards and Crane Yard, S4 Rain Canyon, S5 Helipad, `SB` Cabal Streets |
| Encounters | 9: `S1-E1`, `S2-E2`, `S2-E3` (mini-boss), `S3-E4`, `S3-E5`, `S4-E6`, `S4-E7`, `S5-E8`, `SB-BOSS` |
| Lockdowns | 3: **[L1]** Toll Plaza 64 × 64 m (`S2-E3`), **[L2]** Crane Yard 48 × 48 m (`S3-E5`), **[L3]** Cabal Streets 64 × 64 m (`SB-BOSS`) |
| Finales | Mini-boss **Car Part Monster** (3 parts, 2:45), then **Boss: Broccoli Head** (5 parts, 4:20) |
| Checkpoints, depots | 10 checkpoints, 2 depots (Depot A in S3, Depot B in S5), plus a depot crate inside `SB` |
| Unlockables | Spell **Meteor Bonk** (shrine, S2), reward spell **Vape Cloud**, **Mana Battery** (S5), Golden Bonk **Duck Hunt** (S4), secret weapon cache (S2), 3 Audit Files |

## 2. Concept

L06 is the heavy-weapons level. The player has spent five levels learning that bullets solve
everything. Here three things shrug bullets off: the Armoured Audit Van (bullets do 10%), the Vape
Blimp Gunship (only its engine pods take real damage) and the plates on the Car Part Monster. The
bazooka is handed over in the first ten seconds and rockets are everywhere, so the question the
level asks is never "do I have a rocket" but "is this target worth one".

| A rocket is worth it on | A rocket is wasted on |
|---|---|
| A van that has not unloaded yet (one kill takes its passengers with it) | A van that has already unloaded, when its engine block is facing you (use bullets) |
| Four or more enemies inside 4 m (the roadblock, a Boom Midget pack) | One Midget; a Bitbug flock (it scatters, use the machine gun) |
| A Car Part Monster plate, a gunship engine pod, a Daycare nest | The gunship's envelope (no damage); a Rocket Obama more than 40 m away (he shoots it down) |
| A `fragile` wall | Broccoli Head while his Shield is ready (B §2.2: a perfect block sends it back) |

The level runs west to east and climbs: a freeway deck 12 m above the street, a toll plaza, the
billboards and a skyscraper skeleton above it, a flight down a 25 m street canyon between towers,
a helipad, and then a zipline back down to the street under the same freeway for the boss.

How it differs from the other levels: L04 was air combat against small flyers with a machine gun;
here the air target is one big armoured body. L05 was patience at long range; here the answer is
splash, timing and lane position. L07 uses explosives the player places; here the player fires them.

**Cutscene cards** (placeholder cards, C-level-designs §0.1)

| Card | When | Lines |
|---|---|---|
| "Los Angeles, again" | Level start | "Broccoli Head got away in the Grove." / "He is moving his product tonight. Armoured." / "Bullets will not do. We packed something bigger." |
| "CAR PART MONSTER" | `S2-E3` part 2 starts | "The scrapyard magnet has opinions about your driving." |
| Boss card "Los Angeles" (B §4) | Zipline from S5 to `SB`; hides the load | "BROCCOLI HEAD, the Floret Lord." / "Leads the LA Vape Cabal." |

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Machine Gun, Shotgun, Sniper carried from L05 (any tier). A Bazooka from L02 is possible but not assumed: the cache at the start gives a Rare one |
| Spells held | Goo Bolt, Chain Zap, Yeet, Sproto Swarm, Mana Shield, Decoy, Magic Carpet, Pump It (8). Mana 150, regen 7.5/s if all five earlier Mana Batteries were found; the level is tuned for 100 and 5/s |
| Unlockable: spell | **Meteor Bonk**, at the shrine `S2-shrine` at S2 `(90, 0, 24)`, just outside the Toll Plaza door. Costs 60 mana minimum, breaks `fragile` walls and strips vehicle armour for 6 s. Taught on a wrecked van and a `fragile` wall beside the shrine |
| Unlockable: reward spell | **Vape Cloud**, from Broccoli Head (B §6) |
| Unlockable: Mana Battery | S5, on the service ledge under the helipad's north overhang, `(26, -3, 3)`. +10 max mana, +0.5 mana/s, kept for good |
| Unlockable: gun type | None new (Bazooka first appears in L02). The secret cache holds an **Epic Bazooka** |
| Jetpack | Vending machine "JETPACK 0 T" on the Depot A porch in S3. Fuel 100, C §3.10 numbers. The fields over [L2] and [L3] let it fly inside and not leave |
| Yeet on rockets | A Rocket Obama rocket caught in the 7 m Yeet cone turns round, flies back at 21 m/s and does 150 to enemies. `S3-E4` is built on this |
| Goo Bolt on machines | Goo on a van's rear doors delays the unload 4 s. Goo on a gunship pod stalls the blimp 4 s |
| Decoy | A van rams the Decoy. The gunship strafes it |
| Rain | Fire pools last 2 s instead of 4. Marked `metal` catwalks are slick (friction × 0.5). Enemy sight range × 0.8 outdoors |

Rules the level teaches, in order: bazooka splash on a cluster (S1 standees), bazooka on a `fragile`
wall (S1 trailer), a van alone (S1), movers that crush and carry (S2), Meteor Bonk (S2 shrine),
plates (mini-boss), Rocket Obama alone and Yeet (S3), jetpack in a closed yard (S3), a flock where
rockets are wasted (S4), engine pods (S4), a nest (S5). The boss then uses clouds, tanks and adds.

## 4. Time budget

Rules from PLAN §3. Combat = sum of enemy seconds × 1.3. Walking = metres ÷ 5.5. Flying = metres ÷ 8.
Zipline = metres ÷ 16 (C §3.9). Enemy seconds used: midget, sewerMidget, bitbug, boomMidget 3;
flyingMidget, balloonMidget 5; obama 6; auditSniper 8; jetObama 9; daycare 25; elite × 2.
New enemies: **auditVan 40** (the PLAN "Vehicle" row), **rocketObama 9** (ranged heavy, the Shooter
Bot class), **vapeGunship 45** (two armoured pods, a little more than a vehicle). Finale adds are killed
inside the finale time and are not timed again. Cards and transform cinematics freeze the sim and are not counted.

| # | Beat | Section | Arithmetic | Seconds | Running | Intensity |
|---|---|---|---|---|---|---|
| 1 | Bazooka cache, then `S1-E1` Convoy | S1 | cache 5; (10×3 + 2×6 + 1×40 + 4×3 = 94) × 1.3 = 122.2; walk 200 ÷ 5.5 = 36.4 | 163.6 | 2:44 | 0.55 |
| 2 | `S2-E2` Traffic Jam (optional escort runs inside it) | S2 | (6×3 + 6×3 + 6×3 = 54) × 1.3 = 70.2; walk 100 ÷ 5.5 = 18.2 | 88.4 | 4:12 | 0.50 |
| 3 | Meteor Bonk shrine | S2 | stated 12 (take it, one cast on the wrecked van) | 12.0 | 4:24 | 0.05 |
| 4 | **[L1]** `S2-E3` Car Part Monster | S2 | parts 50 + 55 + 60 = 165; walk 84 ÷ 5.5 = 15.3 | 180.3 | 7:24 | 0.95 |
| 5 | `S3-E4` Rocket Duel | S3 | (2×9 + 1×18 + 2×5 = 46) × 1.3 = 59.8; walk 76 ÷ 5.5 = 13.8; zipline 48 ÷ 16 = 3.0 | 76.6 | 8:41 | 0.50 |
| 6 | Depot A and the jetpack vending machine | S3 | depot 45; vending 8; walk 8 ÷ 5.5 = 1.5 | 54.5 | 9:35 | 0 |
| 7 | **[L2]** `S3-E5` Crane Yard | S3 | (8×3 + 4×3 + 12×3 + 2×9 + 1×8 + 1×9 = 107) × 1.3 = 139.1; walk 61 ÷ 5.5 = 11.1 | 150.2 | 12:06 | 0.85 |
| 8 | `S4-E6` Flock Canyon | S4 | (18×3 + 2×5 = 64) × 1.3 = 83.2; fly 190 ÷ 8 = 23.8 | 107.0 | 13:53 | 0.60 |
| 9 | `S4-E7` Gunship | S4 | (1×45 + 4×3 = 57) × 1.3 = 74.1; fly 100 ÷ 8 = 12.5 | 86.6 | 15:19 | 0.80 |
| 10 | `S5-E8` Daycare on the Helipad | S5 | (1×25 + 6×3 + 2×3 = 49) × 1.3 = 63.7; walk 50 ÷ 5.5 = 9.1 | 72.8 | 16:32 | 0.55 |
| 11 | Depot B and the zipline down | S5 | depot 45; zipline 90 ÷ 16 = 5.6 | 50.6 | 17:23 | 0 |
| 12 | **[L3]** `SB-BOSS` Broccoli Head | SB | parts 35 + 60 + 55 + 45 + 65 = 260; walk 30 ÷ 5.5 = 5.5 | 265.5 | 21:48 | 1.00 |
| | **Total** | | combat 612.3 + finales 425 + depots 90 + stated 25 + walk 110.7 + zipline 8.6 + fly 36.3 | **1,308 s = 21:48** | | |

- Par 20:00 ± 2:00 is 18:00 to 22:00. **21:48 is inside**, near the top. Two finales take 7:05 of
  it, so the seven ordinary encounters are deliberately light on expensive enemies: only one van
  and one gunship are outside the finales. If L01's playtest shows the PLAN table runs long, cut
  `S1-E1` squads C and D first (−15.6 s), then the two Balloon Midgets in `S4-E6` (−13 s).
- Per section: S1 2:44, S2 4:41, S3 4:41, S4 3:14, S5 2:03, `SB` 4:26. S1 and S5 are under the
  3-minute guide in PLAN §3: S1 is one long running fight, S5 is a nest and a depot.
- Beats: 12 = 7 combat, 1 mechanism, 2 breathers, 2 finales. No two beats above 0.8 are adjacent.
- Fast replay target: 15:15 (70%). The roadblock can be jumped, the catwalk can be skipped by the
  south roofs, and the flock can be outrun. The three lockdowns cannot be skipped.

**Enemy ledger**

| Encounter | midget | boom | sewer | obama | rocketObama | flyingMidget | bitbug | jetObama | auditSniper | balloon | floretSprout | daycare | auditVan | vapeGunship | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `S1-E1` | 10 | 4 | | 2 | | | | | | | | | 1 | | 17 |
| `S2-E2` | 6 | 6 | 6 | | | | | | | | | | | | 18 |
| `S2-E3` [L1] adds | 23 | 5 | | 3 | | | | | | | | | 2 | | 33 |
| `S3-E4` | | | | | 3 (1 elite) | 2 | | | | | | | | | 5 |
| `S3-E5` [L2] | 8 | 4 | | | 1 | | 12 | 2 | 1 | | | | | | 28 |
| `S4-E6` | | | | | | | 18 | | | 2 | | | | | 20 |
| `S4-E7` | | 4 | | | | | | | | | | | | 1 | 5 |
| `S5-E8` | 6 | 2 | | | | | | | | | | 1 | | | 9 |
| `SB-BOSS` [L3] adds | 18 | 5 | | | | 5 | 12 | 1 | | | 4 | | | | 45 |
| **Level** | 71 | 30 | 6 | 5 | 4 | 7 | 42 | 3 | 1 | 2 | 4 | 1 | 3 | 1 | **180** |

**Rocket budget** (the headline gun; full detail in §12.5). The level asks for **28** rockets:
`S1-E1` 4, `S2-E2` 1, `S2-E3` 12, `S3-E4` 1, `S3-E5` 3, `S4-E6` 0, `S4-E7` 4, `S5-E8` 3, `SB-BOSS` 0.
Three Rocket Crates (36), ten small rocket boxes (30) and the guaranteed drops from three vans and
the gunship (10) give **76**, which is **2.7 ×** the ask, before the three depot crates, two ammo
crates and random drops are counted.

## 5. Overview map

North is up. One character is about 14 m. `=` freeway deck, `#` buildings, `~` open air over the street.
The level's world y 0 is the street. The freeway deck is at y 12, the S3 parking roof at y 20, the
S4 and S5 datum at y 32, and `SB` is back at y 0 under the freeway.

```
 WEST                                                                                              EAST
 y 12 freeway deck                        y 20..32 roofs            y 32 canyon air        y 32      y 0
 +---------------+  +-------------+------+ +----+-------+-----+ +----------------+------+ +-----+  +------+
 | S1 FREEWAY    |  | S2 TRAFFIC  | TOLL | | P  |BILLBD |CRANE| | S4 RAIN CANYON | GUN  | | S5  |  |  SB  |
 | CONVOY        |  | JAM         |PLAZA | |roof|catwalk|YARD | | flock          | SHIP | |HELI |  |CABAL |
 |C1 $ t ==R==v==|C2|==bus lanes==|C3[L1]|C4 >>> zip >>>|DA[L2]|C6 ~~~~~~~~~~~~~ C7 ~~~ |C8 N DB| z |C10[L3]|
 | cache  E1     |  | E2  shrine  | E3   | | E4         |C5 E5| | E6          G  | E7   | | E8 C9 | i | BOSS |
 +---------------+  +-------------+------+ +----+-------+-----+ +----------------+------+ +-----+ p +------+
   210 x 40 m          184 x 72 m             190 x 80 m             300 x 60 m             64x48    80 x 76 m

 Route: S1 east along the deck -> gate -> S2 jam -> shrine -> Toll Plaza [L1] -> off-ramp up 8 m ->
        S3 parking roof -> billboard catwalk -> zipline -> Depot A porch (jetpack) -> Crane Yard [L2] ->
        launch balcony (MG rack) -> S4 fly east 190 m -> gunship bowl 100 m -> S5 helipad -> Depot B ->
        zipline 90 m down (boss card) -> SB vestibule -> Cabal Streets [L3]
 Legend: C1..C10 checkpoints   DA, DB depots   $ bazooka cache   t fragile trailer   R roadblock   v van
         [L1] [L2] [L3] lockdowns   G Golden Bonk   N nest   zip zipline
```

| Section | Footprint (x × z) | World offset of local origin | Local floor y | Entry (local) | Exit (local) | Transition out |
|---|---|---|---|---|---|---|
| S1 Freeway Convoy | 210 × 40 | (0, 12, 0) | 0 | (6, 0, 28) | (208, 0, 30) | Seamless: freeway barrier gate |
| S2 Traffic Jam and Toll Plaza | 184 × 72 | (210, 12, −16) | 0 | (2, 0, 46) | (184, 8, 36) | Seamless: off-ramp up 8 m |
| S3 Billboards and Crane Yard | 190 × 80 | (394, 20, −20) | 0, catwalk 6, yard 6, balcony 12 | (2, 0, 40) | (190, 12, 28) | Seamless: fly off the launch balcony |
| S4 Rain Canyon | 300 × 60 | (584, 32, −22) | 0 (air; smog floor at −30) | (2, 0, 30) | (298, 0, 30) | Seamless: land on the helipad ledge |
| S5 Helipad | 64 × 48 | (884, 32, −16) | 0 | (2, 0, 24) | (62, 2, 24) | Cutscene: boss card during the zipline |
| `SB` Cabal Streets | 80 × 76 | (1,040, 0, −30) | 0 | (4, 0, 38) | — | Level end |

## 6. Sections

**Coordinates.** Metres, `+x` east, `+z` south, `y` up, yaw in degrees about Y with 0 facing `+z`
and 90 facing `+x`. Each section's local origin is its **north-west** corner at its floor level, so
every coordinate is positive and the maps read with north up (PLAN §4 says south-west; see §14).

**Table conventions.** `box`: size is x × y × z and `at` is the centre. `cylinder`: `at` is the base
centre. `ramp` and `stairs`: size is width × rise × run, `at` is the centre of the bounding box, and
the yaw is the direction it rises toward. Prefab: `at` is the base centre and the yaw follows it; a
car at yaw 90 lies along a lane. Several positions in one row mean several copies. Prefab parts are
in §7. A wall "with openings" is typed as several boxes around the openings listed.

### S1. Freeway Convoy

Footprint 210 × 40 m. An elevated freeway deck with 6 m sound walls. Six lanes: westbound lanes 1
to 3 at z 6, 10 and 14; a median barrier at z 20; eastbound lanes 4 to 6 at z 26, 30 and 34. The
player runs west to east. **Lane 2 (z 10) is the convoy lane**: it is kept clear of wrecks from
x 66 to x 204 so the van can drive it. About 120 solids after prefabs expand.

```
      x=0      30       60        90       120       150       180      210
       |        |        |         |         |         |         |        |
 z=0   ########################################[hN]##########################   sound wall
 z=6   .....          T  c . c  . . P|        .    c   .  B  .   . c      |G
 z=10  .....          T  . c . c .  P|   <====== VAN A lane 2 =========== |g  g = van hatch
 z=14  .....   sss    T  c . . c .  P|        c    .   .   . c    .       |G
 z=20  ..--------------  -------   [F]   ------------------   -----------  |G  median, F flatbed
 z=26  ..       s     T  c . . . .  P|     b  c   .  b .   .  .  c         |G
 z=30  (O)$R          T  . . c . .  P|        .  b .   c   .   . .   (C2)  |G
 z=34  ..        K    T  . K . c .  P|        .    .   .  [hS] b           |G
 z=40  ######################################################################   sound wall
       start cache    trailer  jam 1  roadblock    van field             gate
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S1-deck | box | 210 × 1 × 40 | (105, −0.5, 20) | concrete | Freeway deck, top at y 0 |
| S1-wallN, S1-wallS | box | 210 × 6 × 2 | (105, 3, 1); (105, 3, 39) | concrete | Sound walls. Nothing can leave the deck |
| S1-wallW | box | 2 × 6 × 36 | (1, 3, 20) | concrete | Closes the west end |
| S1-median-1…4 | box | 36 × 1 × 0.6; 28 × 1 × 0.6; 46 × 1 × 0.6; 34 × 1 × 0.6 | (40, 0.5, 20); (80, 0.5, 20); (135, 0.5, 20); (183, 0.5, 20) | concrete | Median barrier, crouch cover. Gaps at x 58 to 66, 94 to 112 and 158 to 166 |
| S1-pod | cylinder | r 1.6, h 3.2 | (10, 0, 30) | metal | Sproto supply pod. Cone r 1.6 h 1.4 on top; crater `disc` r 4.5 at (10, 0.02, 30) |
| S1-cache | cache `bz-cache` | 1.6 × 1 × 1 | (14, 0, 30) | crate | **Bazooka cache**: one Rare Bazooka. Opens with Interact |
| S1-RC1 | Rocket Crate | 1.8 × 0.6 × 0.6 | (14, 0, 33) | crate | Rockets to the cap of 12 |
| S1-stand-1…3 | prefab `city.standee` | — | (34, 0, 14); (35.5, 0, 15.5); (36, 0, 13) | crate | Three dummies inside 2 m. Prompt: "One rocket, three kills" |
| S1-stand-4 | prefab `city.standee` | — | (34, 0, 26) | crate | One dummy alone. Prompt: "Not this one" |
| S1-truck-0 | prefab `city.boxTruck` | — | (47, 0, 34) yaw 90 | metal | Roof y 3.4: step to the gantry (Audit File 1) |
| S1-gantry-1 | box + 2 cylinders | beam 1.5 × 0.5 × 36; posts r 0.5 h 5.1 | beam (50, 5.35, 20); posts (50, 0, 3), (50, 0, 37) | metal | Sign gantry, top y 5.6. Reached from the truck roof with a double jump |
| S1-sign-1 | box | 0.5 × 3 × 14 | (50, 7.1, 11) | neon | "CONVOY LANE →" over lanes 1 to 3 |
| S1-trailer | box, `fragileWall` | 3 × 3.6 × 36 | (62, 1.8, 20) | crate | Jack-knifed trailer across all six lanes. 150 HP, bullets do nothing, one rocket breaks a 6 m hole at the impact point |
| S1-car-0 | prefab `city.car` | — | (58, 0, 8) yaw 0 | metal | Second way over: car roof 1.8, then double jump to the trailer top 3.6 |
| S1-car-1…6 | prefab `city.car` | — | (72, 0, 6) yaw 90; (78, 0, 14) yaw 90; (84, 0, 6) yaw 85; (76, 0, 26) yaw 90; (86, 0, 30) yaw 95; (90, 0, 34) yaw 90 | metal | Stalled traffic, cover on the approach. None in lane 2 |
| S1-truck-1 | prefab `city.boxTruck` | — | (80, 0, 34) yaw 90 | metal | Full cover, roof 3.4 looks over the roadblock |
| S1-police-1…4 | prefab `city.policeCar` | — | (100, 0, 6) yaw 0; (100, 0, 14) yaw 0; (101, 0, 27) yaw 0; (101, 0, 33) yaw 0 | metal | Roadblock, broadside. Lane 2 is left open between the first two |
| S1-barrier-1…4 | prefab `city.barrier` | — | (97, 0, 8); (97, 0, 16); (97, 0, 24); (97, 0, 31) yaw 0 | concrete | Roadblock front line, crouch cover for the Midgets |
| S1-flatbed | prefab `city.flatbed` | — | (104, 0, 20) yaw 0 | metal | Parked in the median gap. Bed top y 1.4: the two Obamas stand on it |
| S1-brl-1, S1-brl-2 | barrel (fire) | — | (102, 0, 9); (102, 0, 30) | — | Either side of the roadblock |
| S1-hatch-N | prefab `city.spawnRoom` | — | (120, 0, 4) yaw 0 | metal | Spawn point **hN**: service hatch on the north shoulder |
| S1-hatch-S | prefab `city.spawnRoom` | — | (150, 0, 36) yaw 180 | metal | Spawn point **hS**: service hatch on the south shoulder |
| S1-car-7…12 | prefab `city.car` | — | (124, 0, 14) yaw 90; (140, 0, 6) yaw 90; (136, 0, 26) yaw 90; (148, 0, 30) yaw 90; (168, 0, 14) yaw 90; (176, 0, 26) yaw 90 | metal | Van field cover. Lanes 1 and 3 only on the north side |
| S1-truck-2 | prefab `city.boxTruck` | — | (160, 0, 6) yaw 90 | metal | Full cover, and a perch above the van's roof line |
| S1-barrier-5…8 | prefab `city.barrier` | — | (118, 0, 24); (130, 0, 30); (154, 0, 24); (184, 0, 14) yaw 90 | concrete | Crouch cover |
| S1-gantry-2 | box + 2 cylinders | beam 1.5 × 0.5 × 36; posts r 0.5 h 7 | beam (170, 7.25, 20); posts (170, 0, 3), (170, 0, 37) | metal | Dressing; the posts are thin cover |
| S1-lamp-1…5 | prefab `city.lamp` | — | (30, 0, 20); (76, 0, 20); (120, 0, 20); (150, 0, 20); (190, 0, 20) | metal | On the median. Lit path |
| S1-gate | door | 0.6 × 6 × 36 | (204, 3, 20) | metal, `neon` trim | Freeway barrier gate. Opens on `S1-E1.cleared` |
| S1-vanHatch | door | 0.6 × 3.2 × 3.4 | (204, 1.6, 10) | metal | Van-sized hatch in the gate at lane 2. Opens only for the van |
| S1-cp2 | disc | r 1.5 | (198, 0.02, 30) | neon | Checkpoint C2 pad |
| S1-lane2 | lane path (data) | nodes | (208, 10) → stop (132, 10) → patrol (112, 10) ↔ (196, 10); crossover to lane 5 at x 162 → (112, 30) ↔ (196, 30) | — | Van A's lane graph. Lane 5 is its second lane |

Mechanisms: `S1-cache`, `S1-RC1`, `S1-trailer` (`fragileWall`), two fire barrels, `S1-gate` and
`S1-vanHatch` (doors), rain. Hazards during `S1-E1`: fire barrels only.

Transition out: walk through `S1-gate`. S2 preloads when squad B spawns.

### S2. Traffic Jam and Toll Plaza **[L1]**

Footprint 184 × 72 m. Two spaces. The **jam** (x 0 to 98, z 16 to 56) is the same freeway packed
with cars: westbound lanes 1 to 3 at z 22, 26 and 30, a median at z 36, eastbound lanes 4 to 6 at
z 42, 46 and 50. **Lane 3 (z 30) and lane 4 (z 42) are bus lanes.** Lane 5 (z 46) is kept clear: it
is the escort lane and the sprint line. The **Toll Plaza** (x 100 to 164, z 4 to 68, 64 × 64 m) is
lockdown [L1] and the Car Part Monster's arena. An off-ramp (x 164 to 184) climbs 8 m to S3.
About 230 solids after prefabs expand.

```
      x=0       20        40        60        80       100       120       140       160  164   184
       |         |         |         |         |         |         |         |         |    |     |
 z=4                                                 ####################[TP-N]################
 z=8                                         +-----+ # <st====== admin balcony y 4 ==[sw]=RC==st> #
 z=12                                        |cache| #         [b]                  o W1          E1 van gate
 z=16  ######################################|#ff##| #     .    .   ^                             #
 z=22  c . c . c . . c T c . . c . . c  . D  shrine  #    [b]          --- magnet rail y 12 ---   #
 z=26  . c . c . V . c . . c . . c . .  c .  (C3)    #          (M) drop disc                     #
 z=30  <== bus lane W (lane 3) <========= <== [garage]#    [b]               ^                 +--+------+
 z=36  ----g----   ----*----   ----*----   --        #          d                              X exit ramp
 z=42  ==> bus lane E (lane 4) ==========> =========> ==========================================> slot  up 8 m
 z=46  P . . . . . . . . escort lane 5 . . . . . .  >E entry        g       d    g             +--+------+
 z=50  . c [SG] V . c . c . c . T . c . c . . c     >E                                         #
 z=56  ##########g#####################g############ #     [b]                       o W2         E2 van gate
 z=62                                                #  S   S    T    S    T  S                #
 z=68                                                ####################[TP-S]################
       jam: E2, escort                               Toll Plaza: E3 Car Part Monster [L1]   off-ramp
 c car  V van (prop)  T box truck / scrap tower  [b] toll booth  S scrap stack  d dumpster  g drain grate (burrow)
 * barrel  P Rocket Pal truck  [SG] shotgun rack  D demo van  ff fragile wall  W1 W2 van park discs  st stairs
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S2-deck-jam | box | 100 × 1 × 40 | (50, −0.5, 36) | concrete | Jam deck, x 0 to 100 |
| S2-wallN-jam | box | 86 × 6 × 2; 8 × 6 × 2 | (43, 3, 17); (96, 3, 17) | concrete | North sound wall, with a 6 m gap at x 86 to 92 filled by `S2-fragile` |
| S2-wallS-jam | box | 100 × 6 × 2 | (50, 3, 55) | concrete | South sound wall |
| S2-median-1…3 | box | 20 × 1 × 0.6 | (14, 0.5, 36); (44, 0.5, 36); (74, 0.5, 36) | concrete | Median. Gaps at x 24 to 34, 54 to 64 and 84 to 98 are the crossings |
| S2-busW-a, S2-busW-b | mover (`city.bus`), `crush: 40` | 2.6 × 3.2 × 11 | path (97, 0, 30) → (1, 0, 30), 12 m/s, loop, 7 s apart | metal | **Bus lane W.** Comes at the player. 1 s horn and headlights before it leaves the garage |
| S2-busE-a…c | mover (`city.bus`), `crush: 40` | 2.6 × 3.2 × 11 | path (1, 0, 42) → (163, 0, 42), 10 m/s, loop, 7 s apart | metal | **Bus lane E.** Goes the player's way; ride the roof (y 3.2) for 96 m of moving high ground. Runs on through the Toll Plaza |
| S2-slot-W1, S2-slot-W2 | mover-only curtain | 0.6 × 3.6 × 3.6 | (0.3, 1.8, 30); (0.3, 1.8, 42) | neon | Bus slots in the west end wall. Movers pass; everything else is pushed back |
| S2-garage | box | 2 × 4 × 4.4 | (99, 2, 30) | metal | Bus garage mouth in the plaza's west wall. Lane W buses appear here |
| S2-jamcar-N1…6 | prefab `city.car` | — | lane 1 (z 22): (8), (20), (32), (50), (70), (80) yaw 90 | metal | North column. Cover and Boom Midget hiding places |
| S2-jamcar-N7…11 | prefab `city.car` | — | lane 2 (z 26): (12), (26), (56), (66), (76) yaw 90 | metal | Second north column |
| S2-jamvan-1, S2-jamtruck-1 | prefab `city.van`; `city.boxTruck` | — | (44, 0, 26) yaw 90; (62, 0, 22) yaw 90 | metal | Full cover on the north side |
| S2-jamcar-S1…7 | prefab `city.car` | — | lane 6 (z 50): (6), (14), (40), (52), (64), (86), (94) yaw 90 | metal | South column. Lane 5 beside it stays empty |
| S2-jamvan-2, S2-jamtruck-2 | prefab `city.van`; `city.boxTruck` | — | (30, 0, 50) yaw 90; (76, 0, 50) yaw 90 | metal | Full cover on the south side |
| S2-pickup | prefab `city.pickup` | — | (22, 0, 50) yaw 90 | metal | Bed top y 0.9. Carries the **shotgun rack** `sg-jam` (Rare) |
| S2-grate-1…4 | disc, burrow point | r 0.9 | (20, 0.02, 19); (48, 0.02, 53); (66, 0.02, 19); (84, 0.02, 53) | metal | Drain grates on the shoulders. Sewer Midgets come out here |
| S2-brl-1…3 | barrel | — | goo (30, 0, 36); fire (58, 0, 36); fire (90, 0, 38) | — | In the median gaps |
| S2-rocketPal | escort mover (`city.boxTruck`, 600 HP) | 2.6 × 3.4 × 7 | path (6, 0, 46) → (96, 0, 46) → (112, 0, 48), 2.2 m/s | metal, `neon` stripe | Optional **escort**: the "Rocket Pal" delivery truck. Interact to start it. Stops while an enemy is within 4 m ahead |
| S2-shrine | prefab `shrine.meteor` | — | (90, 0, 24) | stone, `lava` orb | **Meteor Bonk shrine.** Checkpoint C3. Lanes 1 and 2 are empty east of x 82 |
| S2-demoVan | destructible target `auditVanHulk` | 2.4 × 2.6 × 6 | (82, 0, 26) yaw 90 | metal | A dead Audit Van, 340 HP, armoured. Meteor Bonk strips it: prompt "Now shoot" |
| S2-fragile | box, `fragileWall` | 6 × 6 × 2 | (89, 3, 17) | concrete, cracked | Meteor Bonk or a rocket opens it. Behind it is the toll office |
| S2-office-floor | box | 16 × 1 × 10 | (90, −0.5, 11) | concrete | Toll office, x 82 to 98, z 6 to 16 |
| S2-office-walls | box | 16 × 4 × 0.6; 0.6 × 4 × 10; 0.6 × 4 × 10 | (90, 2, 6.3); (82.3, 2, 11); (97.7, 2, 11) | concrete | Closes the office |
| S2-secretCache | cache `bz-secret` | 1.6 × 1 × 1 | (90, 0, 9) | gold | **Secret weapon cache**: Epic Bazooka, one rocket box |
| S2-plaza-floor | box | 64 × 1 × 64 | (132, −0.5, 36) | concrete | Toll Plaza floor, x 100 to 164, z 4 to 68 |
| S2-plaza-wallW | box, with openings | 2 × 9 × 64 | (99, 4.5, 36) | concrete | Openings: bus slot z 40 to 44; player entry z 45 to 52 |
| S2-plaza-wallE | box, with openings | 2 × 9 × 64 | (165, 4.5, 36) | concrete | Openings: van gate E1 z 14 to 18; exit z 32 to 40; bus slot z 40 to 44; van gate E2 z 54 to 58 |
| S2-plaza-wallN, S2-plaza-wallS | box | 68 × 9 × 2 | (132, 4.5, 3); (132, 4.5, 69) | concrete | Each has one 3 m spawn door: TP-N at x 136, TP-S at x 126 |
| S2-lid | force-field lid | 64 × 0.5 × 64 | (132, 14, 36) | glass | Lid at y 14, above the magnet rail. Magic Carpet cannot leave |
| S2-TP-entry | lockdown door | 0.6 × 7 × 7 | (99, 3.5, 48.5) | metal, `neon` trim | Toll shutter. Threshold `disc` line at x 106 |
| S2-TP-exit | lockdown door | 0.6 × 7 × 8 | (165, 3.5, 36) | metal, `neon` trim | Exit shutter to the off-ramp |
| S2-booth-1…5 | prefab `city.tollBooth`, breakable (charge only) | — | (126, 0, 12); (126, 0, 22); (126, 0, 32); (126, 0, 52); (126, 0, 62) | concrete, glass | Full cover. Lanes 7.6 m wide between them. The Monster's charge stops in a booth, breaks it and stuns him |
| S2-balcony | box | 56 × 0.5 × 4 | (132, 3.75, 7) | metal | Admin balcony, top y 4, x 104 to 160. The second height level |
| S2-balcony-rail | box | 56 × 1 × 0.5 | (132, 4.5, 8.75) | metal | Crouch cover along the balcony edge |
| S2-stairs-W, S2-stairs-E | stairs | 3 × 4 × 8 | (108, 2, 11) yaw 90; (156, 2, 11) yaw 270 | metal | Up to the balcony at both ends |
| S2-magnetSw | switch | hold 1.5 s | (132, 4, 6) | neon | Drops the magnet. 40 s recharge, shown on the switch |
| S2-RC2 | Rocket Crate | 1.8 × 0.6 × 0.6 | (146, 4, 6) | crate | On the balcony. Rockets to the cap |
| S2-rail, S2-rail-posts | box; 2 boxes | 60 × 1 × 1.5; 1.5 × 13 × 1.5 | rail (132, 12.5, 26); posts (101.5, 6.5, 26), (162.5, 6.5, 26) | metal | Scrapyard magnet crane rail |
| S2-magnet | mover (cylinder r 2.2, h 1), on trigger | — | rest (132, 10, 26); drops to (132, 1, 26) in 0.6 s | metal | Magnet head. In part 2 it builds the Monster; after that the switch drops it |
| S2-magnet-disc | disc | r 4 | (132, 0.02, 26) | neon | "MAGNET" target ring. Lure him onto it |
| S2-park-1, S2-park-2 | disc | r 3.5 | (150, 0.02, 16); (150, 0.02, 56) | neon | Where vans B and C stop, and where their wrecks stay |
| S2-scrap-1…5 | prefab `city.scrapStack` | — | (110, 0, 60) yaw 90; (120, 0, 64) yaw 0; (134, 0, 62) yaw 90; (146, 0, 64) yaw 0; (156, 0, 60) yaw 90 | metal | South side cover, top y 2.4 |
| S2-scrapTower-1, S2-scrapTower-2 | prefab `city.scrapTower` | — | (128, 0, 65); (152, 0, 65) yaw 0 | metal | Top y 4.8, from a stack with a double jump. South high ground |
| S2-barrier-1…4 | prefab `city.barrier` | — | (112, 0, 16); (140, 0, 18); (150, 0, 28); (116, 0, 30) yaw 90 | concrete | North floor cover |
| S2-dump-1, S2-dump-2 | prefab `city.dumpster` | — | (118, 0, 38); (140, 0, 48) yaw 90 | metal | Cover beside the bus lane |
| S2-pgrate-1, S2-pgrate-2 | disc, burrow point | r 0.9 | (114, 0.02, 46); (150, 0.02, 38) | metal | Spawn points TP-G1 and TP-G2 |
| S2-pbrl-1…3 | barrel (fire) | — | (136, 0, 14); (144, 0, 54); (112, 0, 24) | — | A barrel beside each van park, one by the entry |
| S2-chest | lockdown chest | 1.4 × 1 × 1 | (160, 0, 30) | gold | Appears when the Monster dies, with an ammo crate at (160, 0, 42) |
| S2-ramp | ramp | 8 × 8 × 20 | (174, 4, 36) yaw 90 | concrete | Off-ramp, rises east from y 0 to y 8 |
| S2-ramp-walls | box | 20 × 11 × 0.6 | (174, 5.5, 31.7); (174, 5.5, 40.3) | concrete | Ramp side walls |
| S2-cp4 | disc | r 1.5 | (168, 0.02, 36) | neon | Checkpoint C4 at the foot of the ramp |

Mechanisms: bus lanes (5 buses, crush 40, rideable), 5 mover-only curtains, 6 burrow grates,
6 barrels, the `escort` truck, the Meteor Bonk shrine with its demo van, `S2-fragile`, the
`lockdown` [L1] (entry and exit shutters, lid at y 14), 5 breakable booths, the magnet switch.
Hazards during `S2-E2`: bus lanes and barrels. During `S2-E3`: bus lane E and the magnet.

**The escort** (optional, not in the time budget). Interact with the Rocket Pal truck at (6, 0, 46).
It crawls 90 m along lane 5 in about 41 s. The `S2-E2` squads split their targets between the
player and the truck (it is a second target, not extra enemies). If it reaches the shutter with
HP left it drives into the plaza and parks at (112, 0, 48) as a second Rocket Crate and an
Overshield. If it dies it explodes like a barrel and nothing else is lost.

Transition out: the off-ramp is the seam. S3 preloads when the Monster reaches part 3.

### S3. Billboards and Crane Yard **[L2]**

Footprint 190 × 80 m. Local y 0 is a parking-structure roof 8 m above the freeway. From it a
billboard catwalk at y 6 runs east over the street (a fall is a void rescue at y −8, not a death),
a zipline crosses to the Depot A porch at y 6, and the **Crane Yard** (x 136 to 184, z 16 to 64,
48 × 48 m, floor y 6) is lockdown [L2]: a skyscraper skeleton inside a force field with its lid at
y 26, so there are 20 m of air to fly in. The exit is on the girder ring at y 12 and leads to the
launch balcony. About 150 solids after prefabs expand.

```
      x=0     20      40      56      72      90     106    122   136      160      184 190
       |       |       |       |       |       |      |      |     |        |        |   |
 z=14                                                                    [CY-N lift]
 z=16                                          +------+            +=====field wall====+
 z=22  +-------------+                         | R1   |            | o===N beam y 12==o |##+
 z=28  | parking     |                         | y 9  |      +-----+ M1=cab(SN)..jib1.. X| MG| launch
 z=34  | roof y 0    |                         +------+      |vend | |  hook H1 -> NEdk | C6| balcony
 z=40  | in > ====st=[B1]==[B2]==[B3] >>>>> zip 48 m >>>>>>> |porch E     (mixer)      o|##+ y 12
 z=46  |   rb        |  +-----------------+st   +------+     |DA C5| |  hook H2 <- SWdk |
 z=52  |             |==| south roofs y 0 |     | R2   |     +-----+ | ..jib2..cab=M2   [CY-E]
 z=58  +-------------+  | ac  ac T ac  ac |     | y 9  |           | o===S beam y 12==o |
 z=64                   +-----------------+     +------+           +=====field wall====+
 z=66                                                                    [CY-S lift]
       arrival        E4 Rocket Duel            perches    Depot A      E5 Crane Yard [L2]
 [B] billboard platform y 6   st stairs   R1 R2 Rocket Obama roofs   E elite booth on the gatehouse (y 14)
 M mast   SN sniper rack   o column   X exit door (y 12)   T Turbo   rb rocket box   vend jetpack vending machine
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S3-park | box | 30 × 1 × 36 | (15, −0.5, 40) | concrete | Parking roof, x 0 to 30, z 22 to 58. Arrival from the off-ramp at (2, 0, 40) |
| S3-park-parapet | box | 30 × 1.2 × 0.6; 30 × 1.2 × 0.6 | (15, 0.6, 22.3); (15, 0.6, 57.7) | concrete | Crouch cover north and south |
| S3-park-car-1…3 | prefab `city.car` | — | (8, 0, 30) yaw 0; (14, 0, 50) yaw 0; (22, 0, 32) yaw 90 | metal | Cover from the first rocket |
| S3-stairs-1 | stairs | 3 × 6 × 10 | (29, 3, 40) yaw 90 | metal | Up to the catwalk, x 24 to 34 |
| S3-B1, S3-B2, S3-B3 | prefab `city.billboard` | — | (40, 0, 40); (56, 0, 40); (72, 0, 40) yaw 0 | metal, `neon` panel | Platforms 10 × 3 m at y 6. Each has a north panel (full cover from R1) and a junction box (full cover from the east) |
| S3-bridge-1, S3-bridge-2 | box | 6 × 0.5 × 2 | (48, 5.75, 40); (64, 5.75, 40) | metal, `slick` | Catwalk bridges, 2 m wide, slick in the rain, no cover |
| S3-plank | box | 4 × 0.5 × 2 | (32, −0.25, 53) | wood | Parking roof to the south roofs |
| S3-roofS | box | 44 × 1 × 14 | (56, −0.5, 53) | concrete | South roofs at y 0, x 34 to 78. The low route |
| S3-ac-1…4 | prefab `city.ac` | — | (42, 0, 50); (52, 0, 56); (62, 0, 50); (72, 0, 56) | metal | Crouch cover on the low route |
| S3-stairs-2 | stairs | 3 × 6 × 10 | (74, 3, 47) yaw 180 | metal | South roofs up to B3 |
| S3-turbo | power-up (Turbo) | — | (60, 0, 54) | — | Reward for the low route |
| S3-towerR1, S3-towerR2 | prefab `city.tower` (14 × 30 × 14) | — | (100, −21, 22); (100, −21, 58) | glass | Roofs at y 9, x 93 to 107. Rocket Obama perches |
| S3-R1-cover, S3-R2-cover | box | 3 × 1.2 × 1 | (95, 9.6, 22); (95, 9.6, 58) | metal | A parapet in front of each Rocket Obama |
| S3-zip | zipline | 48 m | from (77, 7.5, 40) to (125, 7, 40) | — | Passes between the two perches. Shooting is allowed on it |
| S3-porch | box | 14 × 1 × 20 | (129, 5.5, 40) | concrete | Depot A porch, top y 6, x 122 to 136, z 30 to 50 |
| S3-depotA | depot | — | (128, 6, 46) | crate, `neon` sign | Depot crate, health station, spell loadout bench, shop terminal. Checkpoint C5 |
| S3-vending | prefab `mall.vending` | — | (128, 6, 33) | metal, `neon` | **"JETPACK 0 T"**. Interact: jetpack on for the rest of the level |
| S3-fuel-0 | fuel pad (disc r 1.5) | — | (133, 6.02, 34) | neon | Practice hop before the door |
| S3-gatehouse | box | 4 × 0.5 × 8 | (134, 13.75, 40) | metal | Platform over the yard door, top y 14 |
| S3-booth | box | 0.5 × 2 × 8, with a 1 m firing slit | (132.25, 15, 40) | glass | Blast screen in front of the elite. Stops bullets and player rockets. A returned rocket goes through the slit |
| S3-yard-floor | box | 48 × 1 × 48 | (160, 5.5, 40) | concrete | Crane Yard floor, top y 6 |
| S3-field-W, S3-field-E | force-field wall | 0.6 × 20 × 48 | (136.3, 16, 40); (183.7, 16, 40) | glass | y 6 to 26 |
| S3-field-N, S3-field-S | force-field wall | 48 × 20 × 0.6 | (160, 16, 16.3); (160, 16, 63.7) | glass | y 6 to 26 |
| S3-lid | force-field lid | 48 × 0.5 × 48 | (160, 26.25, 40) | glass | **Lid at y 26**: 20 m of flight inside. Jetpack thrust fades from y 20 |
| S3-CY-entry | lockdown door | 0.6 × 7 × 8 | (136.3, 9.5, 40) | metal, `neon` trim | West door. Threshold `disc` line at x 142 |
| S3-CY-exit | lockdown door | 0.6 × 4 × 6 | (183.7, 14, 28) | metal, `neon` trim | East door at ring level |
| S3-col-1…8 | cylinder | r 0.6, h 20 | base y 6 at (142, 22); (160, 22); (178, 22); (142, 40); (178, 40); (142, 58); (160, 58); (178, 58) | metal | Skeleton columns. Thin full cover |
| S3-ring-N, S3-ring-S | box | 39 × 0.5 × 3 | (160, 11.75, 22); (160, 11.75, 58) | metal | Girder ring, top y 12 |
| S3-ring-W, S3-ring-E | box | 3 × 0.5 × 33 | (142, 11.75, 40); (178, 11.75, 40) | metal | Girder ring, top y 12 |
| S3-ystairs-1, S3-ystairs-2 | stairs | 3 × 6 × 10 | (150, 9, 25) yaw 90; (170, 9, 55) yaw 270 | metal | Floor to ring, for a player who is out of fuel |
| S3-deck-NE, S3-deck-SW | box | 14 × 0.5 × 10 | (171, 17.75, 27); (149, 17.75, 53) | metal | Upper decks, top y 18. By jetpack or by hook |
| S3-mast-1, S3-mast-2 | box | 2 × 20 × 2 | (146, 16, 30); (174, 16, 50) | metal | Tower crane masts, y 6 to 26 |
| S3-cab-1, S3-cab-2 | box | 3 × 2.5 × 3 | (148.5, 20.25, 30); (171.5, 20.25, 50) | metal, `neon` | Crane cabs. Roof top y 21.5 |
| S3-jib-1, S3-jib-2 | box | 30 × 1 × 1 | (160, 24.5, 30); (160, 24.5, 50) | metal | Jibs. Walkable, 1 m wide |
| S3-hook-1 | mover (box 3 × 0.5 × 3), pingpong | — | (152, 12.5, 30) ↔ (170, 18.5, 30), 4 m/s, 2 s pause | metal | **Crane hook**: ring level up to the NE deck. Riders are carried |
| S3-hook-2 | mover (box 3 × 0.5 × 3), pingpong | — | (168, 12.5, 50) ↔ (150, 18.5, 50), 4 m/s, 2 s pause | metal | Ring level up to the SW deck |
| S3-rack-sn | rack `sn-crane` | — | (148.5, 21.5, 30) | — | **Sniper rack** (Rare) on the roof of cab 1 |
| S3-crate-1…5 | prefab `city.crateStack` | — | base y 6 at (148, 36); (156, 46); (164, 34); (172, 44); (154, 60) | crate | Floor cover, 2.1 m |
| S3-girders-1…4 | box | 6 × 1.2 × 1.2 | (150, 6.6, 44); (166, 6.6, 54); (170, 6.6, 26); (158, 6.6, 30) | metal | Girder piles, crouch cover |
| S3-mixer | cylinder | r 1.2, h 2.2 | (160, 6, 40) | metal | Cement mixer in the centre. Full cover to circle |
| S3-fuel-1, S3-fuel-2 | fuel pad (disc r 1.5) | — | (140, 6.02, 60); (180, 6.02, 20) | neon | Opposite corners of the floor |
| S3-lift-N, S3-lift-S, S3-lift-E | box with a 3 m door | 4 × 8 × 4 | (160, 10, 14); (160, 10, 66); (186, 10, 48) | metal | Spawn points **CY-N**, **CY-S**, **CY-E**: construction lifts outside the field. The door is a port in the field |
| S3-port-1, S3-port-2 | disc in the lid (one-way) | r 3 | (172, 26, 28); (148, 26, 52) | neon | Spawn points **CY-AIR1**, **CY-AIR2**: flyers come in, nothing goes out |
| S3-rope-1, S3-rope-2 | drop point | — | (166, 12, 22); (154, 12, 58) | — | Spawn points **CY-ROPE1**, **CY-ROPE2** on the ring |
| S3-chest | lockdown chest | 1.4 × 1 × 1 | (178, 12, 34) | gold | Appears when [L2] clears, with an ammo crate at (178, 12, 38) |
| S3-balcony | box | 6 × 0.5 × 12 | (187, 11.75, 28) | metal | Launch balcony, top y 12, x 184 to 190 |
| S3-rack-mg | rack `mg-canyon` | — | (186, 12, 24) | — | **Machine-gun rack** (Rare). Why: Bitbug flocks in `S4-E6` |
| S3-cp6 | disc | r 1.5 | (187, 12.02, 30) | neon | Checkpoint C6 |
| S3-killplane | kill plane, void rescue | — | y −8 | — | Falling off any roof or catwalk: back to the last safe ground, −25% max HP |

Mechanisms: zipline, slick bridges, void rescue, Depot A, the jetpack vending machine, 3 fuel
pads, `lockdown` [L2] (two doors, four field walls, lid at y 26), two crane-hook movers, three lift
doors and two lid ports. Hazards during `S3-E4`: slick bridges and the fall. During `S3-E5`: none
placed (the hooks carry, they do not crush).

Transition out: step off the launch balcony. An updraft column at (192, 0 to 30, 28) catches a
player who has not learned to hover. S4 preloads when [L2] reaches wave 3.

### S4. Rain Canyon

Footprint 300 × 60 m. Local y 0 is the launch altitude, 32 m above the street. The first 196 m is
a street canyon 25 m wide (z 17.5 to 42.5) between towers; the smog floor at y −30 is a void rescue.
The last 100 m opens into the **gunship bowl** (x 200 to 298, z 2 to 58) with four roof islands
around a central spire. Section ceiling y 45, so the jetpack ceiling is y 43 and thrust fades from
y 37. Towers are single boxes from y −40 up. About 75 solids.

```
      x=0      40       80  96  116      150      196 200      230      252      276    298
       |        |        |   |   |        |        |   |        |        |        |      |
 z=0   ########################   ##########################################################
 z=2   #  N1   ##   N2  (r1) #   #  N3  ## N4      #   .   +--------+                     #
 z=10  # y 30  ##  y 50      # ^ # y 20 ## y 50    #   .   | G-N y 4|        .            #
 z=17  ###b1####n########n####   ####b3#####n###n###   .   +---f----+     gunship         #
 z=22  >> . . . n . |SB1| . . uuu . n . |SB2| . . n . +----+        circle r 26           #
 z=30  >> launch  . |y10| . . uuu . . . |y-6| . .  (C7)RC  |   .   [SPIRE] G      .     >> X  to S5
 z=38  >> . . n . . |   | . b2 uuu  n . |   | . b4 . +----+ .       y 22          +------+ #
 z=43  ######n############## w  ########################   +-------+             | G-E  | #
 z=50  #   S1  y 50   # S2   # w # S3  y 50      # S4  #   | G-S f |             | y 6 f| #
 z=58  #              # y 14 #   #               # y 26#   | y -2  |             +------+ #
 z=60  ########################   ##########################################################
       E6 Flock Canyon (190 m)                          E7 Gunship bowl (100 m)
 b balcony with fuel pad   n neon sign (obstacle)   r roost (flock spawn)   uuu updraft   w wind
 SB sky bridge   f fuel pad   G Golden Bonk on the antenna tip (y 43)   X door to the helipad
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S4-N1 | box | 40 × 70 × 17.5 | (20, −5, 8.75) | glass | North tower, x 0 to 40, top y 30 |
| S4-N2 | box | 52 × 90 × 17.5 | (70, 5, 8.75) | concrete | x 44 to 96, top y 50 (above the ceiling: a wall) |
| S4-N3 | box | 34 × 60 × 17.5 | (133, −10, 8.75) | glass | x 116 to 150, top y 20. Its roof is a rest stop |
| S4-N4 | box | 46 × 90 × 17.5 | (173, 5, 8.75) | concrete | x 150 to 196, top y 50 |
| S4-S1 | box | 52 × 90 × 17.5 | (26, 5, 51.25) | concrete | South tower, x 0 to 52, top y 50 |
| S4-S2 | box | 40 × 54 × 17.5 | (76, −13, 51.25) | glass | x 56 to 96, top y 14. Roof rest stop |
| S4-S3 | box | 54 × 90 × 17.5 | (143, 5, 51.25) | concrete | x 116 to 170, top y 50 |
| S4-S4 | box | 26 × 66 × 17.5 | (183, −7, 51.25) | glass | x 170 to 196, top y 26 |
| S4-gapfill-N, S4-gapfill-S | box | 4 × 90 × 17.5 | (42, 5, 8.75); (54, 5, 51.25) | concrete | Close the slits between towers |
| S4-crossN, S4-crossS | box | 20 × 90 × 2 | (106, 5, 1); (106, 5, 59) | concrete | End walls of cross street 1 (x 96 to 116) |
| S4-ledge-in | box | 6 × 0.5 × 12 | (3, −0.25, 30) | metal | Arrival ledge under the S3 balcony |
| S4-bal-1…4 | box | 8 × 0.5 × 4 | (44, −2.25, 19.5); (84, 3.75, 40.5); (130, −4.25, 19.5); (176, 5.75, 40.5) | metal | Balconies, tops at y −2, 4, −4, 6. A fuel pad `disc` r 1.5 on each |
| S4-sky-1 | box | 4 × 3 × 25 | (66, 10, 30) | glass | Sky bridge, y 8.5 to 11.5. Fly under or over. **Infinite Fuel** power-up on top at (66, 11.5, 30) |
| S4-sky-2 | box | 4 × 3 × 25 | (150, −6, 30) | glass | Sky bridge, y −7.5 to −4.5 |
| S4-file3-ledge | box | 3 × 0.5 × 3 | (150, −10.25, 30) | metal | Maintenance cradle under sky bridge 2. Audit File 3 |
| S4-neon-1…6 | box | 1 × 8 × 6 | (24, 6, 20.5); (58, −6, 39.5); (90, 10, 20.5); (124, 2, 39.5); (140, 12, 20.5); (182, −2, 20.5) | neon | Signs sticking 6 m into the canyon. Obstacles, and cover from the flock's dive line |
| S4-updraft-1 | hazard zone `updraft` | 12 × 60 × 12 | (106, 0, 30) | — | Cross street 1. +30 m/s² up while inside |
| S4-wind-1 | hazard zone `wind` | 20 × 60 × 25 | (106, 0, 30) | — | Gust from the north (+z, 6 m/s²), 3 s on, 4 s off, 1 s whistle first |
| S4-roost-1…4 | flock roost (spawn) | — | (40, 8, 17.5); (70, −4, 42.5); (128, 6, 17.5); (160, 0, 42.5) | neon | Lit window bays. Spawn points **r1** to **r4** |
| S4-bowl-wallN, S4-bowl-wallS | box | 100 × 90 × 2 | (248, 5, 1); (248, 5, 59) | concrete | Bowl walls |
| S4-bowl-wallE | box, with an opening | 2 × 90 × 60 | (299, 5, 30) | concrete | Opening z 24 to 36, y 0 to 8: the door to S5 |
| S4-door-E | door | 0.6 × 8 × 12 | (298.3, 4, 30) | metal, `neon` trim | Opens on `S4-E7.cleared` |
| S4-GW | box | 16 × 44 × 16 | (208, −18, 30) | concrete | West roof island, top y 4, x 200 to 216. Checkpoint C7 at (204, 4, 30) |
| S4-GW-ac-1, S4-GW-ac-2 | prefab `city.ac` | — | base y 4 at (212, 25); (212, 35) | metal | Crouch cover from the strafe line |
| S4-RC3 | Rocket Crate | 1.8 × 0.6 × 0.6 | (206, 4, 26) | crate | Rockets to the cap, before the gunship |
| S4-GN | box | 20 × 44 × 14 | (240, −18, 9) | concrete | North roof island, top y 4. Fuel pad at (240, 4.02, 12) |
| S4-GN-tank | cylinder | r 2, h 3 | (234, 4, 7) | metal | Water tank, full cover |
| S4-GS | box | 20 × 38 × 14 | (236, −21, 51) | concrete | South roof island, top y −2. Fuel pad at (236, −1.98, 48) |
| S4-GS-hut | box | 4 × 3 × 4 | (242, −0.5, 54) | concrete | Stair hut, full cover. Boom Midget drop point 1 is beside it |
| S4-GE | box | 18 × 46 × 16 | (276, −17, 46) | concrete | East roof island, top y 6. Fuel pad at (276, 6.02, 42) |
| S4-GE-ac | prefab `city.ac` | — | base y 6 at (280, 50) | metal | Crouch cover. Boom Midget drop point 2 |
| S4-spire | box | 8 × 62 × 8 | (252, −9, 30) | concrete | Central spire, top y 22. The gunship circles it at r 26 |
| S4-antenna | cylinder | r 0.5, h 21 | (252, 22, 30) | metal, `neon` tip | Tip at y 43, the jetpack ceiling. **Golden Bonk** on the tip |
| S4-ledge-out | box | 6 × 0.5 × 12 | (295, −0.25, 30) | metal | Landing ledge inside the east door |
| S4-smog | kill plane, void rescue | — | y −30 | toxic (fog) | The street is never seen. Rescue to the last ledge or balcony |

Mechanisms: jetpack flight, 4 balcony fuel pads and 3 roof fuel pads, 1 updraft, 1 wind zone, the
Infinite Fuel power-up, void rescue, `S4-door-E`. Hazards during `S4-E6`: wind and the updraft.
During `S4-E7`: none placed (the strafe line is the gunship's attack).

Transition out: walk through `S4-door-E` onto the S5 landing. S5 preloads when the first pod dies.

### S5. Helipad

Footprint 64 × 48 m. One tower roof at y 0 (the S4 datum), 64 × 44 m, with a helipad, a penthouse
that holds Depot B, and the zipline mast. Not a lockdown. About 45 solids after prefabs expand.

```
      x=0       14        26        40   46        62 64
       |         |         |         |    |         |  |
 z=2             .  [ledge y -3: Mana Battery]
 z=4   +=========================[hutN]=================+
 z=8   | (T)  ac            ac            +-----------+ |
 z=14  |        .   _______               | penthouse | |
 z=22  >> rb   .  /  H    \    ac         D  Depot B  | zip >>>>  90 m down to SB
 z=24  >> C8   . |  NEST   |              D  C9       |[mast]
 z=30  |  ac    . \_______/   ac          |           | |
 z=40  |      [hutS]              (T)     +-----------+ |
 z=48  +================================================+
       landing     helipad r 9              depot       zipline
 H helipad (the nest lands on it)   hutN hutS spawn huts   (T) water tank   ac AC unit   D door   rb rocket box
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| S5-roof | box | 64 × 40 × 44 | (32, −20, 26) | concrete | Tower block, top y 0, z 4 to 48 |
| S5-parapet-N, S5-parapet-S | box | 64 × 1.2 × 0.6 | (32, 0.6, 4.3); (32, 0.6, 47.7) | concrete | Roof edge, crouch cover |
| S5-parapet-W | box | 0.6 × 1.2 × 16; 0.6 × 1.2 × 18 | (0.3, 0.6, 12); (0.3, 0.6, 39) | concrete | West edge with a 10 m landing gap at z 20 to 30 |
| S5-pad | cylinder | r 9, h 0.6 | (26, 0, 22) | concrete | Helipad, top y 0.6. `disc` r 8 "H" on it in `neon` |
| S5-hutN | prefab `city.spawnRoom` | — | (36, 0, 6.5) yaw 0 | concrete | Spawn point **HP-N**: stair hut, door faces south |
| S5-hutS | prefab `city.spawnRoom` | — | (16, 0, 44) yaw 180 | concrete | Spawn point **HP-S**: stair hut, door faces north |
| S5-tank-1, S5-tank-2 | cylinder | r 2.2, h 4 | (6, 0, 9); (40, 0, 42) | metal | Water tanks, full cover |
| S5-ac-1…5 | prefab `city.ac` | — | (14, 0, 9); (36, 0, 12); (40, 0, 24); (10, 0, 31); (34, 0, 34) | metal | Crouch cover ringing the pad at 10 to 14 m: rocket positions |
| S5-ledge | box | 6 × 0.5 × 2 | (26, −3.25, 3) | metal | Service ledge under the north edge, top y −3. **Mana Battery** at (26, −3, 3) |
| S5-pent-W | box, with a 3 m door | 0.6 × 4 × 24 | (46.3, 2, 24) | concrete | Penthouse west wall. Door at z 22.5 to 25.5 opens on `S5-E8.cleared` |
| S5-pent-N, S5-pent-S | box | 16 × 4 × 0.6 | (54, 2, 12.3); (54, 2, 35.7) | glass | Penthouse side walls |
| S5-pent-roof | box | 16 × 0.5 × 24 | (54, 4.25, 24) | concrete | Roof over the depot |
| S5-depotB | depot | — | (52, 0, 30) | crate, `neon` sign | Depot crate, health station, spell loadout bench, shop terminal. Checkpoint C9 |
| S5-mast-base | box | 3 × 2 × 3 | (61, 1, 24) | metal | Zipline platform, top y 2. Two 1 m steps on its west side |
| S5-mast | cylinder | r 0.3, h 4 | (62.5, 2, 24) | metal | Zipline mast |
| S5-zip | zipline | 90 m | from (62, 2.5, 24) to `SB` (4, 1, 38), dropping 32 m | — | The boss card plays during the ride and hides the load |
| S5-cp8 | disc | r 1.5 | (4, 0.02, 24) | neon | Checkpoint C8 on the landing |

Mechanisms: Depot B, zipline, two spawn huts, the nest's drop pod. Hazards during `S5-E8`: none.

Transition out: the zipline. `SB` loads behind the boss card (2.6 s, sim frozen, B §4).

### SB. Cabal Streets **[L3]**

Footprint 80 × 76 m. Street level under the freeway from S1. A vestibule (x 0 to 12) where the
zipline lands, then the arena yard (x 12 to 76, z 6 to 70, 64 × 64 m), centre (44, 0, 38). The Duel
fire ring (r 27.8, then 26.8, then 25.5, B §2.5) is centred there. The freeway deck is the roof:
underside y 14, with the field lid just under it, so the jetpack works up to y 12. Cover follows
B §4 `duelArena('streets')` placed at (44, 0, 38). The rows below are this level's placement of
that obstacle set. If the port disagrees, the port wins for cover; the part objects (tanks, depot
crate, rack, doors, spawn points) keep these coordinates. About 110 solids after prefabs expand.

```
      x=0    12        24        38   44   50        64        76 80
       |      |         |         |    |    |         |         |  |
 z=6          +=================[SB-N grate]====================+
 z=14         | (V1)     c   [FOOD TRUCK]v       c              |
 z=20         |     c                                           |
 z=28  +------+   (o)p      (o)      (o)p      (o)4  B          |   (o) freeway column
 z=34  | zip  G DC   d                                B         |   4 = tank VT4 on the column, y 4
 z=38  | C10  G        c        (V5 hangs y 6)     c  B       [SB-E]
 z=42  | ab   G RK                                              |
 z=48  +------+   (o)3 d    (o)      (o)       (o)  d           |   3 = tank VT3 on the column, y 4
 z=54         |  bs  p   c            p        c                |
 z=62         |            v                            (V2)    |
 z=70         +=================[SB-S door]=====================+
       vestibule            arena 64 x 64, fire ring r 27.8
 V1 V2 vape tanks (part 1)   VT3 VT4 V5 vape tanks (part 4)   c car  v van  B bus  d dumpster  p planter  bs bus stop
 G lockdown gate   DC depot crate   RK bazooka rack   ab ammo box
```

| id | shape | size | at | mat | purpose |
|---|---|---|---|---|---|
| SB-floor | box | 80 × 1 × 76 | (40, −0.5, 38) | concrete | Street |
| SB-wallN, SB-wallS | box | 64 × 14 × 2 | (44, 7, 5); (44, 7, 71) | concrete | Building fronts. SB-S has a 3 m door at x 44 |
| SB-wallW | box, with an opening | 2 × 14 × 64 | (11, 7, 38) | concrete | Opening z 34 to 42, y 0 to 7: the gate |
| SB-wallE | box, with a 3 m door | 2 × 14 × 64 | (77, 7, 38) | concrete | Alley door at z 38: spawn point and, after the fight, the level exit |
| SB-deck | box | 68 × 1.5 × 28 | (44, 14.75, 38) | concrete | Freeway deck overhead, underside y 14, z 24 to 52 |
| SB-lid | force-field lid | 64 × 0.5 × 64 | (44, 13.75, 38) | glass | **Lid at y 13.5.** Covers the open strips north and south of the deck |
| SB-col-1…8 | cylinder | r 1.2, h 14 | (24, 0, 28); (38, 0, 28); (50, 0, 28); (64, 0, 28); (24, 0, 48); (38, 0, 48); (50, 0, 48); (64, 0, 48) | concrete | Freeway columns. Full cover to circle |
| SB-vest-walls | box | 12 × 6 × 0.6 | (6, 3, 27.7); (6, 3, 48.3) | concrete | Vestibule sides. A roof box 12 × 0.5 × 21 at (6, 6.25, 38) |
| SB-gate | lockdown door | 0.6 × 7 × 8 | (11, 3.5, 38) | metal, `neon` trim | Threshold `disc` line at x 18. There is no second player door: the fight ends the level |
| SB-cp10 | disc | r 1.5 | (6, 0.02, 38) | neon | Checkpoint C10. The section's authored start is (4, 0, 38) |
| SB-depotCrate | depot crate | — | (16, 0, 34) | crate, `neon` sign | **Inside the arena.** Unlimited ammo for every carried gun |
| SB-rack-bz | rack `bz-cabal` | — | (16, 0, 42) | — | Bazooka rack (Rare), optional. Why: vape tanks and add packs in `SB-BOSS` |
| SB-truck | prefab `city.foodTruck` | — | (44, 0, 15) yaw 90 | metal | "Floret Tacos". Roof y 3 is Broccoli Head's stage in parts 1 and 4 |
| SB-bus | prefab `city.bus` (static) | — | (64, 0, 36) yaw 0 | metal | Roof y 3.2. The largest island in part 4 |
| SB-car-1…6 | prefab `city.car` | — | (26, 0, 20) yaw 90; (52, 0, 18) yaw 100; (30, 0, 38) yaw 0; (56, 0, 40) yaw 10; (34, 0, 56) yaw 80; (56, 0, 54) yaw 90 | metal | Roofs y 1.8: islands in part 4. Breakable cover (B §4) |
| SB-van-1, SB-van-2 | prefab `city.van` | — | (50, 0, 14) yaw 90; (38, 0, 62) yaw 90 | metal | Roofs y 2.4 |
| SB-dump-1…3 | prefab `city.dumpster` | — | (22, 0, 32); (26, 0, 50); (66, 0, 50) yaw 90 | metal | Tops y 1.4: islands in part 4 |
| SB-plant-1…4 | prefab `city.planter` | — | (27, 0, 26); (53, 0, 26); (30, 0, 54); (46, 0, 56) yaw 90 | concrete | Tops y 1.2: the lowest islands |
| SB-busstop | prefab `city.busStop` | — | (18, 0, 54) yaw 90 | glass | Roof y 2.5 |
| SB-VT1, SB-VT2 | destructible target `vapeTank` | cylinder r 0.9, h 2.4 | (20, 0, 14); (68, 0, 62) | metal, `toxic` gauge | **Part 1 tanks.** Feed the dome over the food truck by a visual hose |
| SB-VT3, SB-VT4 | destructible target `vapeTank` | cylinder r 0.9, h 1.6 | (24, 4, 46.5); (64, 4, 29.5) | metal, `toxic` gauge | **Part 4 tanks**, on collars on columns 5 and 4, above the vape |
| SB-VT5 | destructible target `vapeTank` | cylinder r 0.9, h 1.6 | (44, 6, 38) | metal, `toxic` gauge | **Part 4 tank**, hung from the deck over the centre |
| SB-grate-N | disc, burrow point | r 1.2 | (44, 0.02, 9) | metal | Spawn point **SB-N** (sewer grate) |
| SB-door-E, SB-door-S | door | 3 × 3 × 0.6 | (76.3, 1.5, 38); (44, 1.5, 70.3) | metal | Spawn points **SB-E** (alley) and **SB-S** (parking ramp) |
| SB-port-1, SB-port-2 | disc in the lid (one-way) | r 3 | (30, 13.5, 14); (58, 13.5, 62) | neon | Spawn points **SB-AIR1**, **SB-AIR2** |
| SB-cloud-1…3 | soft zone (`blocksSight`) | r 2.2 to 2.4, h 3.0 to 3.2 | anchors (34, 0, 32); (54, 0, 44); (44, 0, 52), drift 2.5 to 3.5 m, period 38 to 46 s | — | Duel's drifting vape clouds (B §3.3) |
| SB-ring | fire ring | r 27.8 → 26.8 → 25.5 | centre (44, 0, 38) | — | Duel fire ring. The walls are 4 m outside it |
| SB-chest | reward | — | (44, 0, 38) | gold | Boss drop and the [L3] reward, when Broccoli Head falls |

Mechanisms: `lockdown` [L3] (one gate, lid at y 13.5), fire ring, 3 drifting clouds, 5 vape tanks,
the depot crate, 2 spawn doors, 1 burrow grate, 2 lid ports; pools, spring and vents arrive with the
stages (B §2.5). Everything a part needs is inside the gate.

## 7. Prefabs

Reused from L01 as written there (`src/data/levels/prefabs/city.js`): `city.car` (roof 1.8),
`city.policeCar`, `city.van` (roof 2.4), `city.barrier` (1.0), `city.planter` (1.2), `city.lamp`,
`city.dumpster` (1.4), `city.crateStack` (2.1), `city.foodTruck` (3.0), `city.busStop` (2.5),
`city.ac` (1.2), `city.standee`, `city.spawnRoom`, `mall.vending`. New for L06, added to the same
file. Positions are relative to the base centre at yaw 0; the front faces `+z`; (v) is visual only.

| Prefab | Parts | Height | Use |
|---|---|---|---|
| `city.boxTruck` | Cargo box 2.6 × 2.8 × 5.5 at (0, 2.0, −0.75); cab box 2.4 × 2.2 × 1.8 at (0, 1.1, 2.9); six wheel cylinders r 0.5 h 0.5 (v) | 3.4 | Full cover; a roof you reach with a double jump from a car |
| `city.flatbed` | Bed box 2.6 × 0.6 × 6 at (0, 1.1, −1); cab box 2.4 × 2.2 × 1.8 at (0, 1.1, 3); six wheels (v) | 2.2 (bed 1.4) | A stage for ranged enemies |
| `city.pickup` | Bed box 1.9 × 0.9 × 2.4 at (0, 0.45, −1.2); cab box 1.9 × 1.7 × 2.2 at (0, 0.85, 1.1); four wheels (v) | 1.7 | Rack stand |
| `city.bus` | Body box 2.6 × 3.2 × 11 at (0, 1.6, 0); windscreen box 2.4 × 1.2 × 0.5 at (0, 2.2, 5.5), `glass` (v); headlight `disc` × 2 (v); six wheels (v) | 3.2 | Mover in S2 (`crush: 40`, riders carried), static in `SB` |
| `city.tollBooth` | Booth box 4 × 3 × 2.4 at (0, 1.5, 0), `concrete`; window box 2 × 1 × 2.5 at (0, 2, 0), `glass` (v); barrier arm box 3.5 × 0.5 × 0.5 at (0, 1, 2.9), `neon` (v). 400 HP against the Monster's charge only | 3.0 | Full cover that the mini-boss breaks |
| `city.scrapStack` | Two crushed-car boxes 2 × 1.2 × 4.4 at (0, 0.6, 0) and (0.2, 1.8, 0.2) | 2.4 | Full cover; first step |
| `city.scrapTower` | Four crushed-car boxes 2 × 1.2 × 4.4 stacked at y 0.6, 1.8, 3.0, 4.2, each offset 0.2 | 4.8 | South high ground in the Toll Plaza |
| `city.billboard` | Two posts cylinder r 0.5 h 12 at (±4, 0, −1.2); platform box 10 × 0.5 × 3 at (0, 5.75, 0); panel box 10 × 5 × 0.5 at (0, 9.5, −1.75), `neon`; junction box 1 × 2 × 1 at (3, 7, 0.9), `metal` | 12 | A catwalk node: top y 6, one north wall, one east post of cover |
| `city.tower` | One box, default 14 × 30 × 14, `glass` with `neon` window strips (v). `at` is the centre of its base | as sized | Skyscraper. S4 writes its towers as plain boxes with their own sizes |
| `shrine.meteor` | Plinth cylinder r 1.2 h 0.6; orb sphere r 0.6 at (0, 1.6, 0), `lava`; four pillars cylinder r 0.4 h 4 at (±3, 0, ±3); `disc` r 4 at (0, 0.02, 0), `neon` | 4.0 | Spell shrine, mana refill, checkpoint |

## 8. Encounters

All use `maxAlive` 12 (a Bitbug flock of 6 counts as one), at most 4 threat roles at once, one
elite per section at most, two kinds of placed hazard at most. Triggers and spawn methods are
PLAN §5.5 and §5.4. A van counts as one enemy; its passengers die with it if it is destroyed
before it unloads, and still count as kills.

### `S1-E1` Convoy

Space: the freeway from the trailer (x 66) to the gate (x 204), 138 × 36 m, six lanes of wrecks
with lane 2 clear. Objective: `clearAll` (the van must be destroyed). Two approaches: along the
north lanes behind cars, or on the truck roofs at y 3.4 (trucks 1 and 2), which look over the roadblock.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` x 66 (through or over the trailer) | `placed` | Behind barriers 1 to 4, x 97 to 101 | midget 6 | A traffic stop. Six Midgets inside 6 m: the cluster rocket from S1's standees, now for real |
| A2 | with A | `placed` | On the flatbed (104, 1.4, 20) | obama 2 | Ranged fire over the barrier line. Tests using cars as cover on the way in |
| B | `onKills(5)`, or t+35 | `vehicle` | **Van A** through `S1-vanHatch`, lane 2, stops at (132, 10) after 6.9 s | auditVan 1, carrying midget 4 | The van alone. Horn 1 s before the hatch opens. The drive is long enough for two rockets (reload 2.2 s): a kill before it stops takes the four Midgets with it |
| C | t+20 after B | `door` | Hatch hN (120, 0, 4) | boomMidget 2 | Rushers from the shoulder while the van patrols lane 2 and lane 5. A Boom Midget shot beside the van hurts the van |
| D | 2 s after C | `door` | Hatch hS (150, 0, 36) | boomMidget 2 | The other shoulder: a pincer. Tests not standing in the van's lane while turning |

`maxAlive` 12 (17 in all; the van arrives when at most 3 are left). Roles: fodder, ranged, vehicle,
rusher. Nearby: bazooka cache and Rocket Crate at x 14, rocket box at (92, 0, 3), bullets at
(68, 0, 37). Estimate: 122.2 s combat, 2:44 with the walk.

### `S2-E2` Traffic Jam

Space: the jam, 98 × 36 m, two bus lanes. Objective: `clearAll`; clearing lights the shrine.
Approaches: on foot down empty lane 5 beside the south cars; on a lane E bus roof (y 3.2) for the
whole length; or lane-hopping through the north cars. The optional escort runs through it.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` x 4 | `hidden` | Between north cars N2, N3 and N8, x 20 to 32 | boomMidget 3 | Beeping you can hear before you see it. Teaches listening in clutter; the shotgun rack is 20 m ahead |
| B | `onEnter` x 4 | `placed` | Lane 6 cars S3 to S5, x 40 to 64, a tailgate party | midget 6 | They party until they see you. A lane E bus passes them every 7 s: let it work |
| C | `onKills(4)` | `burrow` | Grates 1 (20, 19) and 2 (48, 53) | sewerMidget 3 | Dust 0.6 s. Shotgun on emergence |
| D | `onEnter` x 50 | `hidden` | Under box truck 2 (76, 50) and behind van 1 (44, 26) | boomMidget 3 | They sprint down the bus lanes at you. Twist: the bus that crushes them also crushes you |
| E | `onKills(12)` | `burrow` | Grates 3 (66, 19) and 4 (84, 53) | sewerMidget 3 | Last push beside the shrine. Tests crossing two bus lanes under pressure |

`maxAlive` 12 (18 in all). Roles: fodder, rusher, burrower. Hazards: bus lanes, barrels. Nearby:
shotgun rack `sg-jam` at (22, 0, 50) with shells at (26, 0, 53); bullets at (4, 0, 52); rockets at
(60, 0, 53). Estimate: 70.2 s combat, 1:28 with the walk.

### `S2-E3` Car Part Monster **[L1 lockdown]**

Toll Plaza, 64 × 64 m. Doors `S2-TP-entry` and `S2-TP-exit`. Spawn points: TP-N (door, north
wall), TP-S (door, south wall), TP-E1 and TP-E2 (van gates, east wall), TP-G1 and TP-G2 (drain
grates). Checkpoint C3 at the shrine outside. Four waves and 33 enemies; the parts table and the
wave schedule are in §10.1.

### `S3-E4` Rocket Duel

Space: the billboard catwalk, 43 m of 3 m platforms and 2 m bridges at y 6, facing two tower roofs
28 to 68 m east and the booth on the gatehouse. Objective: `clearAll`; clearing powers the vending
machine. Approaches: the catwalk (high, slick, three panels of cover) or the south roofs at y 0
(four AC units, out of R1's sight), joining at B3. **This is the Yeet encounter.**

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` stairs top (34, 6, 40) | `placed` | Roof R1 (104, 9, 24), 70 m away | rocketObama 1 | **Alone.** 1.2 s laser dot, then one rocket at 14 m/s: 5 s to watch it come. Shoot it (10 HP), sidestep it, or stand behind a panel |
| B | `onEnter` B2 (x 51) | `placed` | Roof R2 (104, 9, 56) | rocketObama 1 | Crossfire from the side the panels do not cover. Prompt when a rocket is inside 10 m: "YEET IT BACK". A returned rocket kills a Rocket Obama outright |
| C | `onKills(1)` | `air` | Over the south roofs, from z 64 | flyingMidget 2 | Pellets while you stand on a 2 m bridge. Tests aiming on slick metal |
| D | `onEnter` B3 (x 67) | `placed` | Booth on the gatehouse (134, 14, 40) | rocketObama 1, **elite** "Launch Director" | Behind the blast screen: bullets and your own rockets stop on it. Twist: only his rockets fit the slit. Two returns kill him. Or take the zipline: inside 12 m he leaves the booth and jumps to the porch |

`maxAlive` 5. Roles: ranged heavy, flyer. Hazards: slick bridges, the fall. Nearby: rockets at
(4, 0, 36), sniper rounds at (26, 0, 44), a `manaBloom` on B2 at (56, 6, 40.8) so Yeet is never
out of mana. Estimate: 59.8 s combat, 1:17 with the walk and the zipline.

### `S3-E5` Crane Yard **[L2 lockdown]**

Room 48 × 48 m, floor y 6, girder ring y 12, decks y 18, cab roofs y 21.5, jibs y 25, lid y 26.
Doors `S3-CY-entry` (west, floor) and `S3-CY-exit` (east, ring level). Seven spawn points on four
sides and the lid. Checkpoint C5 on the porch outside. Objective: `clearAll`. Next wave on
`onRemain(2)` or 25 s after the wave before started. First fight with the jetpack.

| Wave | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1a | Threshold x 142, +1 s | `door` | CY-N lift (160, 6, 16) | midget 6 | The room on foot. Six in a lift door is a rocket |
| 1b | with 1a, +3 s | `drop` | CY-ROPE1 on the north ring (166, 12, 22) | boomMidget 2 | They jump down from the ring: look up |
| 2a | `onRemain(2)` or t+25 | `air` | CY-AIR1 (172, 26, 28) | bitbug 6 | **Fly.** A flock in a box: a rocket kills two at most. Machine gun, Chain Zap |
| 2b | 2 s after 2a | `air` | CY-AIR2 (148, 26, 52) | bitbug 6, jetObama 1 | Second flock from the opposite corner. The Jet Obama matches your height; his thruster is the weak spot |
| 3a | `onRemain(2)` or t+25 | `door` | CY-E lift (184, 6, 48) | midget 2, boomMidget 2 | Floor pressure that pulls you down from the ring |
| 3b | with 3a | `drop` | CY-ROPE2, then walks to the SW deck (149, 18, 53) | auditSniper 1 | 1.4 s laser, 35 damage. Counter with the sniper rack on cab 1, 22 m away, or fly to him. Decoy takes his shot |
| 4a | `onRemain(2)` or t+25 | `door` | CY-S lift (160, 6, 64), climbs stairs 2 to the south ring | rocketObama 1 | Yeet in flight: his rocket follows you up; turn and shove it |
| 4b | with 4a | `air` | CY-AIR1 | jetObama 1 | Twist: a rocket and a jet at once. A returned rocket can be aimed at the Jet Obama |

`maxAlive` 12 (28 in all: 8, 13, 5, 2). Roles at once: fodder, rusher, flock, flyer in waves 1 to
2; fodder, rusher, sniper in wave 3; ranged heavy, flyer in wave 4. Inside the room: sniper rack
with sniper rounds at (148.5, 21.5, 31.5), bullets at (139, 6, 22) and (181, 6, 58), rockets at
(162, 6, 61), three fuel pads counting the porch. Reward: chest and ammo crate on the east ring.
Estimate: 139.1 s combat (2:19), 2:30 with the walk.

### `S4-E6` Flock Canyon

Space: 190 m of canyon, 25 m wide, from y −10 to y 30 of useful air. Objective: `reach` the west
roof island (C7). Flocks that are still alive at x 196 break off. Approaches: high over sky bridge
1 (the Infinite Fuel is there) or low under it and under sky bridge 2 (Audit File 3).

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` x 20 | `air` | Roost r1 (40, 8, 17.5) | bitbug 6 | One flock, head on. Machine gun sweep. Prompt on the first rocket fired at it: "SAVE IT" |
| B | `onEnter` x 60 | `air` | Roost r2 (70, −4, 42.5), from below and behind | bitbug 6 | A dive from under you as you pass sky bridge 1. Tests looking down while hovering |
| C | `onEnter` x 96 | `air` | Cross street 1, north end, carried on the gust | balloonMidget 2 | Mines pushed across the updraft. Shoot one beside a flock and it takes the flock |
| D | `onEnter` x 120 | `air` | Roosts r3 (128, 6, 17.5) and r4 (160, 0, 42.5), three each | bitbug 6 | Two half-flocks from both walls while the neon signs force you to weave |

`maxAlive` 5 units (20 in all). Roles: flock, mine. Hazards: wind, updraft. Nearby: machine-gun
rack and bullets on the launch balcony; bullets on balcony 2 (84, 4, 40.5) and balcony 3
(130, −4, 19.5). Estimate: 83.2 s combat, 1:47 with the flight.

### `S4-E7` Gunship

Space: the bowl, 98 × 56 m, four roof islands at y 4, 4, −2 and 6 around the spire. Objective:
`destroy` the gunship, then `clearAll`. Approaches: stay on a roof and fire up, or hover level
with a pod (Goo Bolt on a pod stalls the blimp for 4 s).

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` west roof (x 200) | `air` | Rises from behind the spire at (252, 16, 30) | vapeGunship 1 | Circles at r 26, y 14 to 20. The pods glow; the envelope pings. Two rockets a pod. Its strafe line is drawn 1.2 s before it fires |
| B | Its first `drop` state, t+14 | `vehicle` | Ropes onto the roof island the player is on (authored drop points on each island) | boomMidget 2 | Company on your roof while you aim up. Fly to the next island |
| C | `onPartDestroyed(pod 1)` | `vehicle` | The same rule | boomMidget 2 | With one pod the blimp is slower and lower but strafes twice a cycle |

`maxAlive` 5. Roles: air heavy, rusher. Nearby: Rocket Crate and sniper rounds on the west roof,
rockets at (278, 6, 42), bullets at (240, 4, 6). Estimate: 74.1 s combat, 1:27 with the flight.

### `S5-E8` Daycare on the Helipad

Space: the roof, 46 × 44 m west of the penthouse. Objective: `destroy` the nest, then `clearAll`.
Approaches: from the west landing behind AC 1 and tank 1, or round the south side behind AC 4 and hut S.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` landing (x 8) | `drop` | A drop pod onto the helipad (26, 0.6, 22), 1.2 s shadow ring | daycare 1 | A nest: 400 HP, core open 1.5 s at each spawn. Three rockets through the open core, or 25 s of bullets. Rocket flight from the AC ring is 0.4 s: fire as it opens |
| B | The nest, every 6 s, 2 at a time, 6 in all | `summon` | The nest's mouth | midget 6 | Each wasted rocket is two more Midgets |
| C | Nest at 50% HP | `door` | Huts HP-N and HP-S, one each | boomMidget 2 | From behind while you watch the core |

`maxAlive` 9. Roles: nest, fodder, rusher. Nearby: rockets at (6, 0, 20), bullets at (4, 0, 28).
Estimate: 63.7 s combat, 1:13 with the walk.

### `SB-BOSS` Broccoli Head **[L3 lockdown]**

Arena 64 × 64 m under the freeway. Door `SB-gate`. Spawn points SB-N (grate), SB-E (alley door),
SB-S (parking ramp door), SB-AIR1 and SB-AIR2 (lid ports). Checkpoint C10 in the vestibule. Five
parts and 45 adds; the parts table and the add schedule are in §10.2.

## 9. New enemies

Stats are tier-1 values; `tierEnemyMult(6)` = 2.01 multiplies HP and damage in this level. Rocket
counts assume the Rare rack Bazooka (140 × 1.27 = 178 direct, 110 × 1.27 = 140 splash, both scaled
with gun level as PLAN §3 assumes). L06 proposes **no extra enemies** beyond PLAN §5.3.

### 9.1 `auditVan`: Armoured Audit Van (vehicle)

| Field | Value |
|---|---|
| Role, seconds | Vehicle, 40 s |
| HP | 340. No poise: it cannot be staggered, knocked back or Yeeted |
| Size | Body 2.4 × 2.6 × 6.0 m, cab 2.2 × 1.8 × 1.6 m on the front |
| Armour (zone `armour`: body, cab, wheels) | Bullets, pellets and lasers × 0.10. Sniper rounds × 0.25. Spells × 0.5. Rockets, barrels, Boom Midget blasts and bus hits × 1.0 |
| Weak spot (zone `weak`) | Engine block at the back: sphere r 0.55 at (0, 1.0, −3.1). Bullets × 1.0 (armour ignored), rockets × 2.0. It is covered by the rear doors except while the van is unloading, stalled or patrolling away from you |
| Kill counts | Two body rockets (356 ≥ 340) or one engine rocket. Machine gun on the engine: about 5 s. Machine gun on the body: about 50 s |
| Meteor Bonk | 300 damage at 60 mana, and the armour is off for 6 s (every zone × 1.0) with a 2 s stall |
| Other spells | Goo Bolt on the rear doors jams them 4 s (delays or pauses the unload). Chain Zap: half damage, no stun. Decoy: the van rams the Decoy and overshoots 10 m. Sproto Swarm buddies bite the engine |
| Lane behaviour | Lives on a **lane graph** written in the section (nodes joined along lanes, crossovers at marked median gaps). It never leaves the graph and never turns round: it drives forward and in reverse |
| States | `enter` (11 m/s to its stop node, 1 s horn first) → `brake` 1.0 s → `unload` (rear doors open, one passenger every 0.5 s) → `patrol` (7 m/s between its two patrol nodes, changing lane at a crossover every second pass) → `ram` when a player is in its lane or the next one inside 25 m: 0.8 s rev telegraph and a `neon` lane arrow, then 16 m/s in a straight line for up to 30 m |
| Ram | 30 damage, knockback 12. Enemies in the way are knocked aside, not hurt. If the ram ends on a wall, a wreck, a bus or a barrier: `stalled` 2.5 s, engine exposed and smoking |
| Guns | None. The passengers are the guns |
| Passengers | Set per squad, 4 to 6. If the van dies before or during the unload, those still inside die with it (they count as kills and drop loot) |
| Death | 1.0 s of sparks, then a blast: r 5, 60 to enemies, 25 to the player. Leaves a **wreck** (solid box 2.4 × 2.0 × 6.0, full cover) for the rest of the encounter |
| Perception | Knows where the player is while any passenger does |
| Drops | Always one rocket pack (2). Gun 10% |
| Look | Box body `metal` with a `neon` stripe "AUDIT"; box cab; six wheel cylinders r 0.5; two door boxes 1.1 × 2.2 × 0.5 at the back that swing; engine sphere `lava` behind them |
| Teach, test, twist | `S1-E1` alone; `S2-E3` part 1, two at once with a time limit of their own; then their wrecks become the Car Part Monster's plates |

### 9.2 `rocketObama`: Rocket Obama (ranged heavy)

| Field | Value |
|---|---|
| Role, seconds | Ranged heavy, 9 s |
| HP, speed | 110; 3.4 m/s; poise 40 |
| Range | Keeps 18 to 40 m. Prefers authored `perch` points and holds them |
| Attack | One rocket. 1.2 s telegraph (laser dot on the player, rising whistle, `enemyTelegraph`), fires, then kneels 2.0 s to reload (head weak spot easy to hit), then 2.5 to 3.5 s before the next |
| Rocket | Speed 14 m/s, straight after a 15°/s turn in its first second, life 6 s (84 m). Direct 34, splash r 3.5 for 22. **The rocket has 10 HP**: shot down, it bursts where it is for 60 to enemies inside 3 m and nothing to the player beyond 3 m |
| Yeet | A rocket inside the 7 m cone turns round, re-targets whoever fired it (or the enemy under the crosshair inside 60 m), flies at 21 m/s and does **150 direct, 60 splash** to enemies. It cannot be shot down by its owner |
| Other counters | Mana Shield absorbs the splash. Decoy draws the rocket. Inside 8 m he bashes with the launcher (14 damage, knockback 8) and backs off |
| Shooting down player rockets | Beyond 40 m he fires at an incoming player rocket instead of at the player, and hits it 70% of the time. This is the "wasted rocket" case |
| Elite "Launch Director" | HP × 2.5 = 275, fires two rockets 0.8 s apart. Two returns kill him |
| Hitboxes | As `obama`: capsule r 0.5 to 1.85 m, head sphere r 0.24 `weak` |
| Drops | Rocket pack (2) 50%. Gun 6% |
| Look | `obama` model, stage 2, with a cylinder launcher r 0.18, length 1.4, on the right shoulder and a box backpack |
| Teach, test, twist | `S3-E4` squad A alone; squads B and D; `S3-E5` wave 4 in the air with a Jet Obama |

### 9.3 `vapeGunship`: Vape Blimp Gunship (air heavy)

| Field | Value |
|---|---|
| Role, seconds | Air heavy, 45 s |
| Size | Envelope 16 × 6 × 6 m (scaled sphere); gondola box 5 × 2 × 2.4 under it; two engine pods (cylinder r 0.9, length 3) on outriggers 5 m either side of the gondola |
| HP | **Pods 260 each.** Gondola 500. It dies when both pods are gone (it spirals into the spire and bursts) or when the gondola reaches 0 |
| Armour | Envelope: nothing damages it (a "ping" and a spark). Gondola: bullets × 0.10, rockets × 1.0. Pods: bullets × 0.35, sniper × 1.0, rockets × 1.0 |
| Kill counts | Two rockets a pod (four in all). Sniper: four rounds a pod. Machine gun: about 11 s of fire a pod |
| Flight | Circles an authored anchor at r 26, 7 m/s, y 14 to 20. Stays inside the encounter volume |
| Cycle (12 s) | `circle` 4 s → `strafe`: a `neon` dashed line 24 × 3 m through the player's position, 1.2 s warning, then 20 bolts over 1.6 s (6 each) along it → `circle` 3 s → `drop`: hovers 2 s over a roof island and ropes down 2 Boom Midgets (only when the encounter's timeline says so) → repeat |
| One pod left | Speed × 0.6, y 8 to 12, the strafe comes twice a cycle, and it trails a vape plume 3 m wide that blocks sight for 4 s |
| Spells | Goo Bolt on a pod: the blimp stalls 4 s. Chain Zap arcs between the pods (40 each, × 1.0). Meteor Bonk can only hit it at y 8 to 12 and removes a pod. Decoy draws the strafe line. Yeet: nothing |
| Contact | None. It never descends below y 8 |
| Drops | Always two rocket packs (4). Gun 25% |
| Look | Scaled sphere `toxic` green with a `neon` "VAPE NATION" strip; two cylinder pods `metal` with `lava` exhaust discs; box gondola; two box guns under the gondola |
| Teach, test, twist | `S4-E7` only. The pods teach what the Car Part Monster's plates taught, in the air |

### 9.4 Destructible targets (no AI)

| Def | HP (tier 1) | Rules | Used in |
|---|---|---|---|
| `auditVanHulk` | 340 | A dead van with the `auditVan` armour table and no engine spot. Target for the first Meteor Bonk | S2 shrine |
| `carPlate` | 170 | A car door or bonnet on the Monster. Bullets × 0.10, rockets × 1.0 (one rocket), Meteor Bonk removes every plate inside its radius | `S2-E3` |
| `vapeTank` | 260 | Cylinder with a valve sphere r 0.3 (`weak`, × 2). Bullets × 1.0: it is sized for the starter machine gun. Bursts into a harmless puff | `SB-BOSS` |

## 10. Finales

### 10.1 Mini-boss: Car Part Monster (`S2-E3`) **[L1 lockdown]**

The existing wave boss `carMonster` (`src/data/enemies.js`) with its Wave Mode data unchanged:
radius 2.6, height 6.4, speed 4.4, contact 20, melee 52 (reach 3.2, wind-up 0.75 s), charge 42 at
23 m/s, slam 30, four tyres per throw (30 each, splash 5, one bounce). The campaign wraps it in a
part script (PLAN §9, E12) with three settings: `hpScale: 0.6` (4,200 → **2,520** at tier 1,
5,065 at tier 6), four `carPlate` parts, and the `summon` step of its pattern replaced by a roar
plus the scheduled wave below. Its charge stops on walls, booths, wrecks and buses instead of the
arena circle. Total 2:45.

| Part | Starts | HP | Attacks | Adds (exact) | Arena change | Ends |
|---|---|---|---|---|---|---|
| **1. Roadblock** (50 s) | The player crosses the threshold at x 106. 1 s later both shutters drop | Two `auditVan`, 340 each | The vans: ram (30) on two short lanes, z 16 and z 56, x 108 to 156. No boss yet | **Wave 1**, t+2: van B through TP-E1 to park 1 (150, 16), unloads midget 4, boomMidget 2. **Wave 2**, t+12 or when van B dies: van C through TP-E2 to park 2 (150, 56), unloads obama 3, midget 3 | Bus lane E keeps running through the plaza (z 42), one bus every 7 s. The magnet switch is dark | Both vans are wrecks and at most 2 passengers live. At t+60 the magnet takes any van still running (it counts as destroyed) |
| **2. Assembly** (55 s) | Card "CAR PART MONSTER" (frozen). The magnet lifts both wrecks and the scrap between them and drops the Monster on the magnet disc (132, 26) | Body 2,520. Four plates of 170: bonnet (chest), boot (back), two doors (arms). Body damage × 0.30 with 4 plates, 0.45 with 3, 0.60 with 2, 0.80 with 1, 1.0 with none. The head spot is never covered | Wave phase 1 pattern at speed × 1.0: chase, tyres, chase, charge, slam, plus the melee swipe inside 3.2 m | **Wave 3**, 8 s into the part: midget 8 from TP-N | The magnet switch goes live: dropped on him while he is on the disc it does 8% of his max HP, stuns 3 s and tears off one plate. 40 s recharge. A charge that ends in a toll booth breaks the booth and stuns him 2 s (belly spot open). A bus that hits him stops dead, does 6% and stuns 2 s | Body at 55% (the wave data's own phase 2 line) |
| **3. Stripped** (60 s) | He rips off any plates still on him and throws them (one extra tyre-type projectile each). From here body damage is × 1.0 | Body from 1,386 to 0 | Wave phase 2 pattern at speed × 1.2: chase, tyres, charge, slam, roar. Below 20%: phase 3 pattern at × 1.4: tyres, chase, charge, tyres, slam, roar | **Wave 4a**, at 55%: midget 5 from TP-S, boomMidget 3 from TP-N. **Wave 4b**, at 20%: midget 3 by `burrow` from TP-G1 and TP-G2 | Booths keep breaking: by the end the middle of the plaza is open. Wrecked buses block lane E for 14 s each | Body at 0. He falls into a scrap pile. Both shutters open, checkpoint C4 saves, the chest and an ammo crate appear |

| Check | Value |
|---|---|
| Lockdown rules (PLAN §5.6) | 64 × 64 m; two height levels (balcony y 4, scrap towers y 4.8) and 20 pieces of cover; 6 spawn points on 4 sides; 4 waves, 33 enemies; 2:45; lid at y 14 |
| `maxAlive` | 12. Wave 3 waits until at most 4 adds are alive; wave 4a until at most 3 |
| Threat roles at once | Part 1: vehicle, fodder, rusher, ranged. Parts 2 and 3: boss, fodder, rusher |
| Hazards | Bus lane E and the magnet (the player's own) |
| Tools inside the room | Rocket Crate on the balcony (146, 4, 6); rocket boxes at (110, 0, 12) and (154, 0, 64); shells at (122, 0, 44); bullets at (106, 4, 7); 3 fire barrels; the Rocket Pal truck's second Rocket Crate and Overshield if the escort was done |
| Rockets asked | 12: two a van (4), one a plate (4), four on the body or on add packs. Meteor Bonk replaces up to four of them (all plates inside its 6 m radius) |
| Taught before | Vans in `S1-E1`; buses in `S2-E2`; plates and Meteor Bonk on the demo van at the shrine; the cluster rocket in S1 |
| Where a rocket is wasted | On the body while four plates are on (× 0.30). On a van that has unloaded and turned its engine to you |
| Dying | Respawn at C3 by the shrine; the fight restarts at part 1 with the shutters open |
| Drops | Two guns, one of them Epic (PLAN §7.3). This is also the [L1] reward chest |

### 10.2 Boss: Broccoli Head (`SB-BOSS`) **[L3 lockdown]**

The Duel fight from B §3.3, kept whole: three stages with their own bars (880, 900, 1,000 ×
`DUEL_HP_K`; at tier 6 that is 1,769, 1,809 and 2,010), his attacks, powers, arena shifts, fire
ring and the three drifting clouds. Damage numbers below are Duel's raw values (B §3 applies
`damageMultiplier` 0.76, the stage multiplier and `DUEL_DMG_K` 0.68). Around the Duel fight this
level adds an entry part, an intermission, five vape tanks and a written add schedule. Total 4:20.
Transform cinematics freeze the sim and are not counted.

| Part | Starts | HP | Attacks | Adds (exact) | Arena change | Ends |
|---|---|---|---|---|---|---|
| **1. Smoke Screen** (35 s, entry) | The player crosses the threshold at x 18. The gate drops, the fire ring lights at r 27.8 | Tanks `SB-VT1` and `SB-VT2`, 260 each. Broccoli Head (*Sprout*) stands on the food truck inside a vape dome and cannot be hurt | Bolts only, from the roof, in bursts of 1 to 3 with pauses × 1.5 | t+3: midget 6 from SB-E. When the first tank bursts: boomMidget 2 by `burrow` from SB-N | The three drifting clouds are already out | Both tanks destroyed: the dome pops. At t+70 a tank still standing overheats and bursts |
| **2. Stage 1, *Sprout*** (60 s) | He jumps down | Bar 880 × K | Bolts. Shield (0.8 s, 5 s recharge; a perfect block returns a projectile, rockets included). Dodge roll. Power **Floret Mortar** (barrage: 8 circles r 2 over 2.4 s, spread 5.5, 1.0 s warning, 11, every 14 s, first at 5.6 s) | Bar at 66%: floretSprout 2, midget 4 from SB-S. Bar at 33%: bitbug 6 from SB-AIR1 | None beyond the clouds | Bar empty: `vape` transform to *Overgrown* |
| **3. Stage 2, *Overgrown*** (55 s) | Transform ends | Bar 900 × K | Bolts, Blast (20, splash 3.6), Stun (1.0 s, every 8 s), Floret Mortar (recharge × 0.85), power **Hotbox** (cloud r 4.2 where you stand, 0.95 s warning, 6 s, 8 a second, every 15.3 s) | Bar at 75%: boomMidget 2, midget 4 from SB-E. Bar at 40%: jetObama 1, flyingMidget 2 from SB-AIR2 | Duel stage 2 shift: ring to r 26.8, four **Toxic Runoff** pools (r 1.7 to 2.3, 12 a second), one **Fire Hydrant** spring (9 HP/s, 40 HP), green mood | Bar empty: he does **not** transform yet |
| **4. Intermission, The Hotbox** (45 s) | He leaps back onto the food truck, plugs his box mod into the road and domes up. Klaxon and a rising green line on the walls for 3 s | Tanks `SB-VT3`, `SB-VT4` (on columns, y 4) and `SB-VT5` (hung at y 6), 260 each | He cannot be hurt. Floret Mortar on the player's position every 9 s, so no island is safe for long | t+2: bitbug 6 from SB-AIR1. t+20: flyingMidget 3 from SB-AIR2. Flyers only: nothing on the ground | **The floor is vape.** Vape fills the arena to y 1.2. A player whose feet are below y 1.2 takes 8 a second and sees 4 m. Islands: planters (1.2), dumpsters (1.4), cars (1.8), vans (2.4), bus stop (2.5), food truck (3.0), bus (3.2). No two islands on the chain are more than 6 m apart | All three tanks destroyed: the vape drains in 2 s and the dome pops; `vape` transform to *Floret Colossus*. From t+70 the tanks vent themselves, one every 10 s |
| **5. Stage 3, *Floret Colossus*** (65 s) | Transform ends | Bar 1,000 × K | Blast, Stun, Ultimate (38, a wave at 30 m/s to 40 m), volley **Floret Spray** (5 shots over 36°, × 0.6), Floret Mortar, Hotbox, power **Big Exhale** (cone 60°, 13 m, 1.05 s warning, 20, knockback 9, every 10 s). Recharges × 0.72 | Bar at 80%: midget 4, boomMidget 1 from SB-S. Bar at 50%: floretSprout 2 from SB-E. None below 50% | Duel stage 3 shift: ring to r 25.5, three **Sewer Steam** vents (r 1.7, 1.3 s warning, every 7 to 9.5 s, 10 and knockback 19), spring refilled. Big Exhale near the edge pushes you into the ring | Bar empty. Reward spell **Vape Cloud**, the boss drop, gate and alley door open, level complete |

| Check | Value |
|---|---|
| Lockdown rules (PLAN §5.6) | 64 × 64 m; two height levels (street, roofs up to y 3.2) and 26 pieces of cover; 5 spawn points on 3 sides and the lid; 5 parts as waves, 45 adds (8, 12, 9, 9, 7); 4:20; lid at y 13.5 |
| `maxAlive` | 12 with a flock as one. An add squad whose line is crossed while 8 or more adds are alive waits until 6 are left |
| Threat roles at once | Boss plus at most three of: fodder, rusher, artillery, flock, flyer |
| Hazards | The Duel set: fire ring, clouds, then pools, then vents. The vape floor only in part 4 |
| Hub rule (PLAN §9) | A verified run starts at (4, 0, 38) with the starter Machine Gun and nothing else. Every part is beatable with it: tanks take bullets at × 1.0 (about 6 s each on the valve), every tank is in sight from an island, the islands chain on foot, and no part needs a rocket, a spell or the jetpack. The depot crate at (16, 0, 34) is inside the gate because the Machine Gun is no longer endless. Expect 6 to 7 minutes with that loadout, against 4:20 at par |
| Tools inside the room | Depot crate; bazooka rack `bz-cabal` with a rocket box at (18, 0, 44); bullets at (70, 0, 38) and (44, 0, 66); a `manaBloom` at (44, 0, 30) |
| Taught before | Tanks with a weak valve: the demo van, gunship pods and the nest core. Leaving the ground: car and bus roofs in `S2-E2`. Vape that blocks sight: the gunship's plume. Mortars: Floret Sprouts since L03. Adds from lid ports: `S3-E5` |
| Where a rocket is wasted | At Broccoli Head while his Shield is ready: it glints for 0.3 s first, and a perfect block sends the rocket back at 1.35 × speed. Fire during his casts, at tanks, or at add packs |
| Yeet | Blast and Floret Spray shots are slow projectiles: Yeet returns them. Big Exhale and Yeet are both cones: Yeet does not cancel it |
| Dying | Respawn at C10; the fight restarts at part 1 with the gate open |
| Drops | Two Epic guns and one boss gun (Ray Gun or Big Bullets). This is also the [L3] reward |

## 11. Mechanisms, magic and explosives used

| Item | Where | Notes | New to L06 |
|---|---|---|---|
| Rain | Every section | Fire pools 2 s instead of 4; marked `metal` is slick (friction × 0.5); enemy sight × 0.8 outdoors | **Yes** |
| Bus lanes (mover, `crush: 40`, riders carried) | S2 jam and Toll Plaza | 5 buses on 2 lanes, 7 s apart. 1 s horn and headlights. Kill Boom Midgets, stun the Monster | **Yes** |
| Mover-only curtain | S2, 5 slots | Lets a bus through a sealed wall and nothing else | **Yes** (§14) |
| Vehicle lane graph | S1, Toll Plaza | The lanes an `auditVan` may use | **Yes** (§14) |
| `escort` (optional) | S2 jam | The Rocket Pal truck, 90 m at 2.2 m/s, 600 HP. Reward: a second Rocket Crate and an Overshield in the plaza | **Yes** (first use; L07 may reuse) |
| Scrapyard magnet (mover on a switch) | Toll Plaza | 8% of the Monster's HP, 3 s stun, one plate. 40 s recharge | **Yes** |
| Breakable toll booths | Toll Plaza | Destructible cover that only the charge breaks | **Yes** |
| Crane-hook movers | Crane Yard | Two pallets, 4 m/s, carry riders between y 12 and y 18 | **Yes** |
| Zipline | S3 (48 m), S5 to `SB` (90 m) | 16 m/s, shooting allowed, jump to drop off | L02 |
| Jetpack vending machine | S3 porch | Turns the jetpack on for the rest of the level | **Yes** (as a machine; jetpack is L04) |
| Fuel pads | S3 (3), S4 (7) | 80 fuel a second | L04 |
| Updraft, wind | S4 cross street; S3 balcony edge | Wind gusts 3 s on, 4 s off | L04 |
| Void rescue | S3 (y −8), S4 (y −30) | Back to the last safe ground, −25% max HP | L02 |
| `lockdown` | Toll Plaza, Crane Yard, `SB` | Lids at y 14, y 26 and y 13.5; one-way lid ports for flyers | L01 |
| `fragileWall` | S1 trailer, S2 toll office | Rocket or Meteor Bonk | L03 |
| Spell shrine | S2 (Meteor Bonk) | Grants the spell, refills mana, checkpoint | L01 |
| `manaBloom` | S3 B2 (56, 6, 40.8); `SB` (44, 0, 30) | 50 mana, regrows in 20 s. Keeps Yeet available | L03 |
| Barrels | S1 (2 fire), S2 jam (1 goo, 2 fire), Toll Plaza (3 fire) | PLAN §7.5. Fire pools are short in the rain | L01 |
| Destructible targets | Demo van, 4 plates, 5 vape tanks, 2 gunship pods, nest core | §9.4 | L05 |
| Vape floor (flood hazard) | `SB` part 4 | Damage and blindness below y 1.2 | **Yes** (§14) |
| Duel arena shifts | `SB` | Fire ring, clouds, pools, spring, vents (B §2.5, §3.3) | L02 (per boss) |

**Spells and what they are for here**

| Spell | Use in L06 |
|---|---|
| **Meteor Bonk** (new) | Strips a van's armour for 6 s; removes every Monster plate in its radius; breaks the toll office wall; can take a pod off a low gunship. 60 mana: one cast, then guns |
| Yeet | Returns Rocket Obama rockets (150), Blast and Floret Spray shots. Launches barrels at vans. No effect on vans, the gunship or the Monster |
| Goo Bolt | Jams van doors 4 s; stalls the gunship 4 s on a pod hit; drops Jet Obamas; slows the Monster 30% for 2.5 s |
| Chain Zap | Bitbug flocks (the right answer to them); arcs between gunship pods; sets off barrels |
| Sproto Swarm | Buddies bite the van's engine and the nest core; they draw the gunship's strafe |
| Mana Shield | Rocket splash, tyre splash, Floret Mortar |
| Decoy | The van rams it; the sniper and the gunship aim at it; Rocket Obamas fire at it |
| Magic Carpet | Crossing bus lanes; over Toxic Runoff pools; cannot leave a lockdown |
| Pump It | Before a Meteor Bonk or a returned rocket (returned rockets count as spell damage) |

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

### 12.1 Checkpoints

| CP | Where (local) | When | Time | Gap |
|---|---|---|---|---|
| C1 | S1 start (6, 0, 28) | Level start | 0:00 | |
| C2 | S1 gate (198, 0, 30) | `S1-E1.cleared` | 2:25 | 2:25 |
| C3 | S2 shrine (90, 0, 24), outside the [L1] shutter | `S2-E2.cleared` lights it; taking the spell saves again | 4:12, then 4:24 | 1:47 |
| C4 | S2 ramp foot (168, 0, 36) | [L1] cleared | 7:09 | 2:45 (sealed fight) |
| C5 | S3 Depot A porch (128, 6, 46), outside the [L2] door | Arrival; saved again at the yard threshold | 8:41, then 9:35 | 1:32 |
| C6 | S3 launch balcony (187, 12, 30) | [L2] cleared | 12:04 | 2:29 |
| C7 | S4 west roof (204, 4, 30) | Arrival (`S4-E6` reached) | 13:53 | 1:49 |
| C8 | S5 landing (4, 0, 24) | `S4-E7.cleared` and arrival | 15:19 | 1:26 |
| C9 | S5 Depot B (52, 0, 30) | `S5-E8.cleared` | 16:23 | 1:04 |
| C10 | `SB` vestibule (6, 0, 38), outside the [L3] gate | Arrival | 17:23 | 1:00 |

Ten checkpoints. No gap is over 2:30 except the sealed mini-boss (2:45), which PLAN §5.6 restarts
from its first part. The boss (4:20) restarts from C10.

### 12.2 Depots, racks, power-ups, secrets

| Kind | Item | Where | Why |
|---|---|---|---|
| Depot | Depot A: depot crate, health station, spell loadout bench, ticket shop terminal, checkpoint | S3 porch (128, 6, 46) | Mid level (8:41), after the mini-boss, with the jetpack machine |
| Depot | Depot B: the same five things | S5 penthouse (52, 0, 30) | Before the finale |
| Depot crate | `SB-depotCrate` | `SB` (16, 0, 34), inside the gate | PLAN §7.4: every boss section has one |
| Cache | `bz-cache`: Bazooka, Rare | S1 (14, 0, 30) | The level's gun. Vans, the trailer, the roadblock |
| Rack | Shotgun `sg-jam`, Rare | S2 pickup (22, 0, 50) | Boom and Sewer Midgets between cars in `S2-E2` |
| Rack | Sniper `sn-crane`, Rare | S3 crane cab roof (148.5, 21.5, 30) | The Audit Sniper in `S3-E5` wave 3; gunship pods in `S4-E7` |
| Rack | Machine Gun `mg-canyon`, Rare | S3 launch balcony (186, 12, 24) | Bitbug flocks in `S4-E6` |
| Rack | Bazooka `bz-cabal`, Rare | `SB` (16, 0, 42) | Tanks and add packs in `SB-BOSS` (optional there) |
| Rocket Crate | RC1, RC2, RC3 | S1 (14, 0, 33); S2 balcony (146, 4, 6); S4 west roof (206, 4, 26) | Before the van, inside the mini-boss arena, before the gunship |
| Rocket Crate | Escort bonus | S2 plaza (112, 0, 48), only if the Rocket Pal truck arrives | Reward |
| Power-up | Overshield | With the escort bonus, (114, 0, 50) | Reward for the escort |
| Power-up | Turbo | S3 south roofs (60, 0, 54) | Reward for the low route in `S3-E4` |
| Power-up | Infinite Fuel | S4, on sky bridge 1 (66, 11.5, 30) | The high line through the flock |
| Golden Bonk | **Duck Hunt** (enemy projectiles render as rubber ducks) | S4, the antenna tip (252, 43, 30) | Exactly at the jetpack ceiling: thrust fades from y 37, so climb the spire side, refuel on the north island, and arrive with speed. Possible during or after the gunship |
| Mana Battery | +10 max mana, +0.5 mana/s | S5, service ledge (26, −3, 3) under the north edge | Step off the north parapet and hover back under |
| Secret weapon cache | `bz-secret`: **Bazooka, Epic**, and one rocket box | S2 toll office (90, 0, 9), behind `S2-fragile` | The wall is beside the Meteor Bonk shrine: the first thing the new spell can open |
| Audit File 1 | "Convoy manifest. Product: 40 pallets. Declared value: vibes." | S1, gantry 1 (50, 5.6, 30) | Box truck roof, then a double jump |
| Audit File 2 | "Building permit: zero floors. Floors are taxable." | S3, tip of jib 1 (174, 25, 30) | Walk the 1 m jib, or fly, under the lid |
| Audit File 3 | "Blimp log. Altitude: high. Crew: also high." | S4, cradle under sky bridge 2 (150, −10, 30) | The low line through the canyon |

No depot has a Weapon Box. Enemies drop ammo, health, mana, tickets and guns only.

### 12.3 Loot table

Tier odds for enemy gun drops in L06 (PLAN §7.3). Base tier for racks, caches and chests: **Rare**.

| Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|
| 10% | 35% | 40% | 13% | 2% |

| Guaranteed drop | Source | Where it appears | What |
|---|---|---|---|
| Cache gun | `bz-cache` | S1 (14, 0, 30) | Bazooka, Rare |
| 4 rack guns | `sg-jam`, `sn-crane`, `mg-canyon`, `bz-cabal` | See §12.2 | Fixed type, Rare |
| Elite | "Launch Director", elite rocketObama, `S3-E4` | S3 porch (130, 6, 40), where he lands or falls | One gun, rolled one tier step up |
| Mini-boss and [L1] chest | Car Part Monster | S2 (160, 0, 30) | Two guns, one of them Epic; ammo crate beside it |
| [L2] chest | Crane Yard cleared | S3 (178, 12, 34) | One gun, Rare or better, of a type the player does not carry; ammo crate beside it |
| Boss and [L3] reward | Broccoli Head | `SB` (44, 0, 38) | Two guns at Epic, one boss gun (Ray Gun or Big Bullets) |
| Secret cache | `bz-secret` | S2 (90, 0, 9) | Bazooka, Epic (the level's best placed tier; see §14 note 6) |

13 guaranteed guns. Random gun drops keep today's chances per kill (2% Midget types, 4%
flyingMidget, 6% Obama types, 10% nests). Proposed for the new types: auditVan 10%, rocketObama
6%, vapeGunship 25%; bitbug 0.5% each. Expected random guns over the level: about 4.

### 12.4 Ammo boxes, ammo crates, depot crates

Small boxes: bullets 60, shells 12, sniper 8, rockets 3 (PLAN §7.4). 33 small boxes.

| Section | Type | Position | Rule it serves |
|---|---|---|---|
| S1 | bullets | (8, 0, 26) | C1 |
| S1 | bullets | (68, 0, 37) | Start of `S1-E1` |
| S1 | rockets | (92, 0, 3) | 20 m before the van's stop node |
| S1 | bullets | (200, 0, 33) | C2 |
| S2 | bullets | (4, 0, 52) | Start of `S2-E2` |
| S2 | shells | (26, 0, 53) | Shotgun rack, 4 m |
| S2 | rockets | (60, 0, 53) | Mid jam |
| S2 | rockets | (93, 0, 27) | C3, shrine; 14 m before the [L1] threshold |
| S2 | bullets | (94, 0, 21) | C3 |
| S2 | rockets | (110, 0, 12) | Inside [L1] |
| S2 | rockets | (154, 0, 64) | Inside [L1] |
| S2 | shells | (122, 0, 44) | Inside [L1] |
| S2 | bullets | (106, 4, 7) | Inside [L1], balcony |
| S2 | bullets | (168, 0, 39) | C4 |
| S3 | rockets | (4, 0, 36) | Arrival, before `S3-E4` |
| S3 | sniper | (26, 0, 44) | Counter-fire on the perches from the parking roof |
| S3 | sniper | (148.5, 21.5, 31.5) | Sniper rack, inside [L2] |
| S3 | bullets | (139, 6, 22) | Inside [L2] |
| S3 | bullets | (181, 6, 58) | Inside [L2] |
| S3 | rockets | (162, 6, 61) | Inside [L2] |
| S3 | bullets | (186, 12, 31) | C6 and the machine-gun rack |
| S4 | bullets | (84, 4, 40.5) | Balcony 2, mid flock |
| S4 | bullets | (130, −4, 19.5) | Balcony 3, mid flock |
| S4 | bullets | (203, 4, 27) | C7 |
| S4 | sniper | (204, 4, 34) | West roof, for the pods |
| S4 | rockets | (278, 6, 42) | East roof, for the second pod |
| S4 | bullets | (240, 4, 6) | North roof |
| S5 | bullets | (4, 0, 28) | C8 |
| S5 | rockets | (6, 0, 20) | 20 m before the nest |
| `SB` | bullets | (8, 0, 44) | C10 |
| `SB` | rockets | (18, 0, 44) | Bazooka rack, inside [L3] |
| `SB` | bullets | (70, 0, 38) | Inside [L3], far side |
| `SB` | bullets | (44, 0, 66) | Inside [L3], south |

| Kind | Count | Where |
|---|---|---|
| Small ammo boxes | 33 | 18 bullets, 10 rockets, 3 sniper, 2 shells (table above) |
| Ammo crates (3 uses, 50% of every cap) | 2 | [L1] reward, S2 (160, 0, 42); [L2] reward, S3 (178, 12, 38) |
| Depot crates (unlimited) | 3 | Depot A, Depot B, `SB` (16, 0, 34) |
| Rocket Crates (to the cap, once) | 3, plus 1 for the escort | S1, S2, S4; S2 (112, 0, 48) |

C5 and C9 are depots, so the depot crate is their ammo box. [L3]'s reward is the boss drop.

### 12.5 Ammo budget: rockets

Cap 12. Small box 3. Enemy pack 2. Rocket Crate to the cap. Counted here: Rocket Crates, small
boxes and the guaranteed packs (2 from each van, 4 from the gunship). Not counted: depot crates,
ammo crates, the escort crate, the secret cache's box, random smart drops.

| Leg | Asked | For what | Placed in the leg | Guaranteed drops | Leg ratio |
|---|---|---|---|---|---|
| S1 `S1-E1` | 4 | Trailer 1, roadblock 1, van A 2 | RC1 12 + box 3 = 15 | Van A 2 | 4.3 × |
| S2 `S2-E2` | 1 | A Boom Midget pack or a barrel | Boxes 3 + 3 = 6 | | 6.0 × |
| S2 `S2-E3` [L1] | 12 | Vans 4, plates 4, body and packs 4 | RC2 12 + boxes 6 = 18 | Vans B and C 4 | 1.8 × |
| S3 `S3-E4` | 1 | A perch, if Yeet is not used | Box 3 | | 3.0 × |
| S3 `S3-E5` [L2] | 3 | Lift-door packs 2, the Rocket Obama 1 | Box 3 (Depot A is at the door) | | 1.0 × placed, full pack from Depot A |
| S4 `S4-E6` | 0 | Flocks: rockets are wasted | | | |
| S4 `S4-E7` | 4 | Two a pod | RC3 12 + box 3 = 15 | Gunship 4 (after) | 3.8 × |
| S5 `S5-E8` | 3 | The nest core | Box 3 | | 1.0 × placed, 12 carried from RC3 |
| `SB-BOSS` [L3] | 0 | None needed; 4 optional on tanks | Box 3 (and the depot crate) | | |
| **Level** | **28** | | Rocket Crates 36 + boxes 30 = **66** | **10** | **76 ÷ 28 = 2.7 ×** |

PLAN §7.4 asks for 1.5 ×. With the 12-rocket cap the player can also carry enough at every step: 12
from RC1 into S1; refilled to 12 before the shutter by the two jam boxes and the shrine box; 12 from
Depot A into the Crane Yard; 12 from RC3 into the gunship and the nest; 12 from Depot B into `SB`.
The other guns: bullets 18 boxes × 60 = 1,080 placed against about 150 non-rocket enemies; shells
24 and sniper rounds 24 placed beside their racks; all three refill at both depots.

## 13. Difficulty

**Harder than L05 in these ways**

| Axis | L05 Frostspire | L06 Skyline |
|---|---|---|
| Tier | 5 (× 1.75) | 6 (× 2.01) |
| Enemy total | 150 to 170 | 180 |
| Pressure rules | `maxAlive` 12, 4 roles, 1 elite a section, 2 hazard kinds | The same caps (PLAN §3 keeps L04 to L06 together), but used: four roles at once in `S1-E1`, `S2-E3` and `S3-E5` |
| New kind of problem | Being seen | Targets that bullets do not hurt. The player has to manage a second ammo type and choose targets |
| Finales | One mini-boss and a hold | A mini-boss **and** a three-stage Duel boss with an intermission, 7:05 of sealed fighting |
| Movement | On foot | Buses that crush, a 2 m slick catwalk, then the first sealed fight with the jetpack and a 290 m flight under fire |
| Recovery | Long sightlines let you back off | Three lockdowns: no backing off |

Inside the level the curve is: one van alone (0.55), the jam (0.50), the mini-boss (0.95), a
breather and the duel (0.50), the Crane Yard (0.85), the flock (0.60), the gunship (0.80), the nest
(0.55), a depot, the boss (1.00).

| Setting | Easy | Heroic |
|---|---|---|
| Enemy HP and damage | × 0.8 | × 1.25 |
| `maxAlive` | 10 | 14 |
| `auditVan` | Bullets × 0.20; the engine is always exposed | A roof hatch Obama (one extra `obama` a van); patrol speed 9 m/s |
| `S1-E1` | Squad D removed | A second van 20 s after the first, lane 5, carrying obama 4 |
| Bus lanes | 9 s apart | 5 s apart |
| Car Part Monster | `hpScale` 0.5; plates 120 HP; magnet recharge 25 s | `hpScale` 0.75; five plates (a roof plate on the head spot); wave 4b adds boomMidget 3 |
| `S3-E4` | The Launch Director is not elite | His booth has no slit below 30 m: only the zipline rush or two returns from range work |
| Crane Yard | Wave 4 has no Jet Obama | Wave 3 has two Audit Snipers (both decks) |
| Gunship | Pods 200 HP; one strafe a cycle always | Pods 320 HP; drops Boom Midgets 3 at a time |
| Nest | 6 Midgets in all (unchanged), 300 HP | 10 Midgets in all, and a second nest lands at 50% |
| Broccoli Head | `DUEL_HP_K` × 0.8; part 4 vape to y 0.9 (every car bonnet is safe) | Powers recharge × 0.9; part 4 has four tanks (a second hung tank at (44, 6, 22)); adds also at 25% in part 5 (midget 4) |
| Rockets | Small boxes give 4 | Rocket Crates give 8 |

## 14. Engine needs

Uses **E1** (collision, void rescue), **E2** (raycasts, line of sight, clouds that block sight),
**E3** (nav per section, flyer steering in S3, S4 and `SB`), **E4** (sections, squads with
triggers, `clearAll`, `reach`, `destroy`, `escort`, `boss`, lockdowns), **E5** (primitives,
prefabs, `look` views for three enemies), **E6** (doors, movers with crush and riders, ziplines,
fuel pads, updraft, wind, slick, switches, depots, destructible targets), **E7** (boomMidget,
sewerMidget, floretSprout, auditSniper, jetObama, balloonMidget, bitbug, daycare), **E8**
(`auditVan`, `rocketObama`, `vapeGunship`), **E9** (jetpack), **E10** (Meteor Bonk rework, shrine,
Yeet on projectiles, `manaBloom`, Vape Cloud reward), **E11** (barrels), **E12** (wave boss in a
walled arena with a part script; the Duel port of Broccoli Head), **E13** (depots, boss bars with
part pips, cards), **E14** (validator, map export, bot), **E15** (pins: `SB-BOSS` replaces
`S4-E4` for `broccoli` in `CANONICAL_BOSSES`; Broccoli Head's HP becomes three bars), **E16**, **E17**
(tier odds, guaranteed drops, ammo boxes and crates, Rocket Crate).

**Needed and not in PLAN §10**

| # | Need | Used by | Size |
|---|---|---|---|
| 1 | **Vehicle lane graph**: nodes and crossovers a vehicle enemy drives on, forward and reverse, with stop nodes; passengers that die with the vehicle; a wreck left as a solid | `auditVan` (E8 names the enemy, not the lanes) | Medium |
| 2 | **Damage-kind armour on a hitbox zone**: a multiplier per source (bullet, pellet, sniper, rocket and blast, spell), and a timed "armour off" status that Meteor Bonk applies | `auditVan`, `vapeGunship`, `carPlate` | Small |
| 3 | **Projectiles with HP and an owner flip**: an enemy rocket that can be shot, and that Yeet (or a Duel perfect block, for player rockets) returns with a new owner, target, speed and damage | `rocketObama`, Broccoli Head's Shield against player rockets | Small |
| 4 | **Mover-only curtain**: an opening in a sealed wall that a mover passes and nothing else does | Bus lane through [L1] | Small |
| 5 | **Parts on a wave boss**: `hpScale`, attached destructible plates that scale body damage, scheduled waves in place of `summon`, charge stopped by tagged solids (booths, wrecks, movers) | Car Part Monster (E12 covers the arena wall only) | Medium |
| 6 | **Force-field lid with one-way ports**: flyers spawn through a port and cannot return; the jetpack ceiling is the lid, per room | [L2], [L3] (PLAN §5.6 names the lid, not the ports) | Small |
| 7 | **Flood hazard by height**: a volume that hurts and blinds only below a y level, for the player only | `SB` part 4 | Small |
| 8 | **Rain rules** (fire duration, slick tag, sight range) as one `weather` record | Whole level | Small |
| 9 | **Optional objective inside an encounter**, with enemies sharing targets between the player and an escort | Rocket Pal escort | Small |

**Notes on PLAN.md**

1. **§4, origin "south-west" with `+z` south** makes every z negative. This file uses the corner with the smallest x and z (north-west), like L01 and L08.
2. **§3, two finales in one par.** 7:05 of sealed finale leaves 14:55 for everything else. 180 enemies fit only because 78 of them (43%) are finale adds and the seven ordinary encounters are mostly 3-second enemies. A third van or a second gunship outside the finales pushes the estimate past 22:00.
3. **§3, "Vehicle 40 s"** is right for bullets on an engine block and long for a level that hands out 76 rockets (two rockets take about 8 s). It is used as written. If playtests agree it is long, L06 gains room for the Heroic second van on Normal.
4. **§3, sections of 3 to 6 minutes.** S1 (2:44) and S5 (2:03) are shorter. Merging S5 into S4 would break the 320 m footprint limit.
5. **§5.6 on a mini-boss arena.** The rule "25 to 45 enemies in 3 to 5 waves" is met by the Toll Plaza (33 in 4) only by counting two vans and their passengers as waves 1 and 2. Worth saying in §5.6 that a finale's parts count as waves.
6. **§7.3, "the level's best tier"** for the secret cache is not defined. Read here as one step above base (Epic), not the highest tier with non-zero odds (Legendary).
7. **§9, hub rule and the jetpack.** This file assumes the jetpack is a level setting, so a canonical run in `SB` has it; no part needs it either way.
8. **`src/data/duelBosses.js`** has Broccoli Head as one 1,100 HP bar; B §3.3 and this file use three bars. `docs/shooter-server-contract.md` lists the encounter as `S4-E4`. Both move with the E15 pin.

## 15. Bot route and tests

**Autopilot route** (god mode, fixed seed). Waypoints in section-local coordinates:

| # | Section | Waypoints and actions |
|---|---|---|
| 1 | S1 | (6, 0, 28) → open `bz-cache` → fire one rocket at `S1-trailer` → (66, 0, 20) → hold (90, 0, 14) until squad A dead → two rockets at van A at its stop node → (198, 0, 30) |
| 2 | S2 | (2, 0, 46) → lane 5 to (40, 0, 46) → (84, 0, 46) → shrine (90, 0, 24), take the spell, cast on `S2-demoVan` → (104, 0, 48) |
| 3 | S2 [L1] | Balcony (146, 4, 6) for RC2 → rockets at van B then van C → circle the booths clockwise; press `S2-magnetSw` when the Monster is inside the disc → (168, 0, 36) → ramp |
| 4 | S3 | (2, 0, 40) → stairs → B1 → B2 (Yeet any rocket inside 7 m) → B3 → zipline → (128, 6, 46) depot → vending → (142, 6, 40) |
| 5 | S3 [L2] | Hover at (160, 14, 40) for waves 1 and 2 → cab 1 roof for wave 3 → south ring for wave 4 → exit (183, 12, 28) → (187, 12, 28) |
| 6 | S4 | Fly (2, 0, 30) → over sky bridge 1 at y 13 → updraft → hold y 4 over sky bridge 2 → west roof (204, 4, 30) → RC3 → rockets at pod 1, fly to (240, 4, 12), rockets at pod 2 → (296, 0, 30) |
| 7 | S5 | (4, 0, 24) → AC 1 (14, 0, 9) → three rockets at the open core → (52, 0, 30) → mast (62, 2, 24), zipline |
| 8 | `SB` | (4, 0, 38) → threshold → tank VT1, tank VT2 → fight on the ring between columns 2, 3, 6, 7 → part 4: bus roof (64, 3.2, 36), shoot VT4, VT5, VT3 → finish |

**Tests** (in `tests/levels/L06.test.js` when built)

| Test | Asserts |
|---|---|
| Validator | No solid under 0.5 m; every rack has a `why`; ≤ 600 solids a section; every encounter has an objective |
| Pacing | The §3 estimator returns 1,308 s ± 5 with auditVan 40, rocketObama 9, vapeGunship 45; total is inside 1,080 to 1,320 |
| Enemy ledger | Sum over squads and finale waves is 180; every type's count matches §4; no enemy outside the L06 roster |
| Pressure | No timeline state exceeds `maxAlive` 12 (flock = 1 per 6) or 4 roles; one elite at most a section |
| Reachability | From every checkpoint to the exit on foot until the vending machine, then with the jetpack; `SB` parts 1 to 5 reachable on foot only |
| Lockdowns | Three `lockdown` mechanisms; each room 40 to 80 m a side, ≥ 3 spawn points, 25 to 45 enemies, ≥ 2 ammo boxes inside, a checkpoint outside the entry, a lid; the bus passes [L1]'s curtain and a player does not |
| Van | Dies to two Rare rockets on the body and one on the engine; 36 machine-gun rounds on the body do less than 10% of its HP; passengers die with a van killed before `unload` ends; it never leaves its lane graph |
| Rocket Obama | A rocket shot once is destroyed; a Yeeted rocket hits its owner for 150; two returns kill the elite |
| Gunship | The envelope takes 0; it dies when both pods are at 0; Boom Midgets drop only on the timeline's two triggers |
| Car Part Monster | Body multiplier follows the plate count; part 3 starts at 55%; a charge into a booth removes the booth and stuns 2 s; total adds 33; part 1 ends by t+60 at the latest |
| Broccoli Head | Golden of the five parts on three seeds; adds total 45 on the written lines; part 4 ends when three tanks are destroyed or by t+100; a starter-MG-only bot clears `SB` from (4, 0, 38) |
| Ammo | 33 small boxes, 2 ammo crates, 3 depot crates, 3 Rocket Crates at the listed positions; counted rockets 76 ≥ 1.5 × 28; a rocket box within 30 m of both bazooka sources |
| Determinism | Two bot runs with one seed give the same state hash at every checkpoint |
| Wave Mode | `carMonster` data unchanged; baseline hashes unchanged after the E16 re-pin |

## 16. Build tasks

In order, for the agent that owns `src/data/levels/L06/` (branch `<agent>/campaign-l06`).

1. `index.js`: header (stage `city`, tier 6, par 1,200 s, `weather: 'rain'`, jetpack `'pickup'`), section order, world offsets from §5.
2. Add the ten new prefabs of §7 to `prefabs/city.js` (shared file: coordinate with the L01 owner; add only, change nothing).
3. Blockout `S1.js` from the S1 table. Walk it with debug fly. Map export.
4. Blockout `S2.js`: the jam, then the Toll Plaza, then the ramp. Buses as plain movers first.
5. Blockout `S3.js`: parking roof, billboards, towers, porch, Crane Yard with field walls and lid, balcony.
6. Blockout `S4.js` (towers, balconies, bowl islands, spire) and `S5.js`.
7. Blockout `SB.js`: walls, deck, columns, then `duelArena('streets')` when the boss track delivers it; reconcile cover with the SB table.
8. Checkpoints, doors and transitions; run the bot through empty sections end to end.
9. Enemy data: `auditVan`, `rocketObama`, `vapeGunship` stat blocks and `look`s (§9), with the §14 needs 1 to 3. Unit tests for the van and the returned rocket.
10. Encounters `S1-E1` and `S2-E2` with their timelines; the bazooka cache, RC1, the trailer, the standees; bus lanes with crush and the curtains.
11. The Meteor Bonk shrine, the demo van, `S2-fragile` and the secret cache.
12. `S2-E3`: lockdown [L1], van waves, the part script on `carMonster` (plates, `hpScale`, booths, magnet, bus hit), chest and crate.
13. `S3-E4` (perches, booth, Yeet prompt, `manaBloom`), Depot A, the vending machine.
14. `S3-E5`: lockdown [L2], seven spawn points, four waves, hooks, sniper rack, chest and crate.
15. `S4-E6` (roosts, wind, updraft, leash at x 196) and `S4-E7` (gunship anchor, drop points, door).
16. `S5-E8` (drop pod nest, huts), Depot B, the zipline and the boss card.
17. `SB-BOSS`: lockdown [L3], tanks, dome, the five-part script around the Duel port, add lines, vape floor, depot crate, rack.
18. Ammo boxes, crates and Rocket Crates from §12.4; loot rows from §12.3; power-ups; Golden Bonk, Mana Battery, three Audit Files; the optional escort.
19. Easy and Heroic overrides from §13.
20. Tests from §15; pacing estimate; reachability; three bot seeds. Tuning pass on `hpScale`, plate HP, pod HP and `DUEL_HP_K` against the part times in §10.
21. Hand the `SB-BOSS` encounter id and section start to the pin PR (E15). Do not edit `src/data/serverManifest.js` in the level branch.
