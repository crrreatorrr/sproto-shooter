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
  `S1-E1` squad D first (−15.6 s), then two Balloon Midgets in `S4-E6` (−13 s).
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
 z=40  |(C4)> ====st=[B1]==[B2]==[B3] >>>>> zip 48 m >>>>>>> |porch E     (mixer)      o|##+ y 12
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

