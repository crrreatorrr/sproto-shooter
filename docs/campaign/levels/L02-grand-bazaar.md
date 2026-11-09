# L02: The Grand Bazaar

Level document for `docs/campaign/PLAN.md` (cited as **PLAN §x**). Enemy behaviour is C §3.12, mechanisms
are C §3.9, the boss data is B §3.1. Plan only: nothing here is built.

## 1. Header

| Field | Value |
|---|---|
| Id, name | `L02`, The Grand Bazaar |
| Stage, lighting | `desert`. Late afternoon: low orange sun, sand haze, long shadows in the alleys. `SB` is at dusk, lit by the fire ring |
| Tier | 2 (enemy HP and damage × 1.15). Rack and base drop tier: Common |
| Par | 20:00. Estimate from §4: **21:34** (inside ±2:00). Fast replay about 15:05 |
| Jetpack | No. Double jump (2.6 m) only |
| Enemy total | **161**: 121 in encounters E1 to E9, 40 adds in `SB-BOSS`, plus Sahil. One elite (in the boss fight) |
| Route length | **1.25 km**: 1,078 m on foot, 170 m on carpets, ziplines, the lift, the geyser and the catapult |
| Sections | 5: `S1` Caravan Camp and Souk Alleys, `S2` Dune Sea, `S3` Canyon Rim, `S4` Rooftop Market and Bazaar Gate, `SB` Sahil's Showroom |
| Encounters | 9 combat encounters (E1 to E9) and `SB-BOSS` |
| Lockdown arenas | **3** (PLAN §5.6): **[L1]** E3 Dyers' Court (S1, 44 × 44 m), **[L2]** E5 High Caravanserai (S2, 44 × 44 m), **[L3]** `SB-BOSS` (fire ring, 56 m across) |
| Checkpoints, depots | 10 checkpoints, 2 depots, plus a depot crate in `SB` |
| Unlockables | Chain Zap (shrine), Magic Carpet (Sahil), Mana Battery (hidden, S4), gun types Sniper and Bazooka, the first boss gun |
| Finale | **Boss: Sahil the RugMaster**, 5 parts, about 4:15 |

## 2. Concept

L01 was wide streets and a machine gun. L02 is the opposite: **5 m alleys, 4 m ledges and small roofs**,
where the shotgun is the right gun and the question in every fight is "how do I get beside or behind
that?". Riot Midgets block a lane until you flank them, stun them or blow them up. Boom Midgets punish
backing into a corner. Hex Acolytes put bubbles on both. The level breaks the close-quarters rule twice on
purpose so it does not get monotonous: the Dune Sea is open ground with bombers coming over the crests,
and the Canyon Rim is one long-range beat with a sniper rack before the carpets.

How it differs from the other nine: no jetpack, no stealth, almost no long sightlines. It is the only level
where most enemies die inside 8 m, and the only one where the main movers are flying carpets over a void.

The set pieces are three **lockdown arenas**: a yard whose doors drop behind you and stay shut until
every wave is dead. The Dyers' Court opens with the phalanx marching at you down a sealed lane. The High
Caravanserai is where the Hex Acolyte is taught. Sahil's fire ring is the third.

Three things the level teaches for the boss: quicksand (E4), sand geysers (Geyser Flats), and **Rug Looms**,
destroyable machines that power a shield (one alone after E5, two under pressure in E9, then in the fight).

**Cutscene cards**

| When | Title | Lines |
|---|---|---|
| Level start | The Grand Bazaar | "Sahil's bazaar is where the Empire launders its rugs." / "Take his carpet." |
| S1 → S2 | Into the Dunes | "The souk was the easy part." / "Sahil's caravan route crosses the Dune Sea." |
| S4 → SB (boss card, 2.6 s) | Sahil, the RugMaster | "Every rug comes with a lifetime guarantee. The rug pull is free." |

## 3. What the player has and learns

There is no crafting and Magic has no levels (PLAN §6.2, §7). Everything below is found.

| Item | Detail |
|---|---|
| Guns expected at the start | Machine gun and the L01 shotgun, with whatever dropped in L01. All ammo is finite, the machine gun included |
| Gun types in the drop pool at the start | Machine Gun, Shotgun |
| **Gun types first found here** | **Sniper**: `rack-sn-tower` on the canyon rim (S3). **Bazooka**: `rack-bz-vault` in the boss section. **Ray Gun or Big Bullets**: Sahil's boss-gun drop, the first boss gun of the campaign. Each joins the drop pool once picked up |
| Other placed guns | Shotgun rack at the Souk Arch (S1, 40 m in), two shotgun standees, two lockdown chests, one secret cache (§12). Racks are Common, gun level 2 |
| Spells held at the start | Goo Bolt (L01 shrine) |
| **New spell** | **Chain Zap** (30 mana, 4 s cooldown, 25 m, 4 chains). Shrine in the Shrine Court, S1 at (100, 0, 22), reached at about 2:11. It is 13 m before the Dyers' Gate, which opens only when conduit `C1` is zapped. Behind that gate is **[L1]**, whose first wave is the first phalanx that cannot be flanked |
| What Chain Zap does here | Stuns riot shields 2 s, pops Tax Shield bubbles, powers conduits `C1` (door) and `C2` (lift), sets off pots along the chain |
| Reward spell | **Magic Carpet** from Sahil (B §6). Not needed anywhere in L02; on replays the lockdown lids stop it |
| **Mana Battery** | Hidden on filler roof F1 in S4 at (12, 5, 50): +10 max mana, +0.5 mana/s, kept for good. Route in §12 |
| New enemies | `boomMidget` (E1), `riotMidget` (E2), `hexAcolyte` (E5). Each alone first, then in a mix, then with a twist (§9) |
| New mechanisms | Lockdown arenas, quicksand, sand geysers, flying carpets over a void (void rescue), clothesline ziplines, rug catapult, explosive pots with elements, conduits, Rug Looms, the depot |
| Power-up | Overshield on the Minaret Terrace (S4) |

## 4. Time budget

Formula per beat (PLAN §3): enemy seconds × 1.3 + metres on foot ÷ 5.5 + stated mechanism time.
Enemy seconds: midget 3, boomMidget 3, flyingMidget 5, obama 6, robotLaser 6, riotMidget 8, hexAcolyte 8,
robotShooter 9. The boss row is the flat PLAN figure; its 40 adds are inside it and are not counted twice.
**[L]** marks a lockdown arena.

| # | Beat | Sec. | Enemies | Enemy s | × 1.3 | On foot (m) | ÷ 5.5 | Mechanism time | Beat (s) | Clock |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | E1 Caravan Camp | S1 | 6 midget, 1 obama, 2 boom = 9 | 18+6+6 = 30 | 39.0 | 45 | 8.2 | — | 47.2 | 0:47 |
| 2 | E2 Shield Wall | S1 | 2 riot, 6 midget, 2 obama = 10 | 16+18+12 = 46 | 59.8 | 95 (incl. 39 m flank loop) | 17.3 | — | 77.1 | 2:04 |
| 3 | Chain Zap shrine, conduit `C1` | S1 | — | — | — | 34 | 6.2 | 20 (shrine, practice cast, gate) | 26.2 | 2:31 |
| 4 | **[L1]** E3 Dyers' Court, 4 waves | S1 | 4 riot, 2 obama, 13 midget, 6 boom = 25 | 32+12+39+18 = 101 | 131.3 | 83 | 15.1 | 6 (chest and crate) | 152.4 | 5:03 |
| 5 | E4 Boom Dunes | S2 | 6 boom, 4 midget, 2 obama = 12 | 18+12+12 = 42 | 54.6 | 163 | 29.6 | — | 84.2 | 6:27 |
| 6 | Geyser Flats, then **[L2]** E5 High Caravanserai, 4 waves | S2 | 2 acolyte, 2 obama, 14 midget, 3 flying, 4 boom = 25 | 16+12+42+15+12 = 97 | 126.1 | 82 | 14.9 | 8 (geyser) + 4 (loom-0) + 6 (chest) = 18 | 159.0 | 9:06 |
| 7 | Depot 1 | S2 | — | — | — | 42 | 7.6 | 45 (breather) | 52.6 | 9:59 |
| 8 | E6 Far Ledge | S3 | 3 obama, 1 acolyte, 2 laser, 1 shooter = 7 | 18+8+12+9 = 47 | 61.1 | 116 (incl. tower climb) | 21.1 | 5 (rack, scope) | 87.2 | 11:26 |
| 9 | E7 Narrows and Carpets | S3 | 4 midget, 2 boom, 2 flying, 2 obama = 10 | 12+6+10+12 = 40 | 52.0 | 131 | 23.8 | 30 (3 carpet waits and rides, 67 m) | 105.8 | 13:12 |
| 10 | E8 Rooftop Market | S4 | 5 midget, 2 boom, 2 obama, 2 riot, 1 acolyte = 12 | 15+6+12+16+8 = 57 | 74.1 | 148 | 26.9 | 14 (conduit `C2` and lift 8, two ziplines and catapult 6) | 115.0 | 15:07 |
| 11 | E9 Bazaar Gate | S4 | 6 midget, 2 riot, 3 boom = 11 | 18+16+9 = 43 | 55.9 | 66 | 12.0 | 6 (two looms) | 73.9 | 16:21 |
| 12 | Depot 2 | S4 | — | — | — | 32 | 5.8 | 45 (breather) | 50.8 | 17:11 |
| 13 | **[L3]** `SB-BOSS` Sahil, 5 parts | SB | 40 adds (inside the boss time) | — | — | 41 | 7.5 | 255 (boss) | 262.5 | 21:34 |
| | **Total** | | **121 + 40 = 161** | **503** | **653.9** | **1,078** | **196.0** | **99 + 90 + 255 = 444** | **1,293.9 s** | **21:34** |

Check: 653.9 + 196.0 + 444 = 1,293.9 s. Par 1,200 s, so +94 s, inside ±120 s.
Section times: S1 5:03, S2 4:56, S3 3:13, S4 4:00, SB 4:23 (all inside the 3 to 6 minute rule).
Time sealed in each lockdown: [L1] 2:11, [L2] 2:06 (rule: 2 to 3.5 minutes), [L3] 4:15 (boss rule: 4 to 5.5).

**Intensity** (no two above 0.8 in a row): E1 0.3, E2 0.5, shrine 0.1, [L1] 0.85, E4 0.5, [L2] 0.8, depot 0,
E6 0.45, E7 0.65, E8 0.7, E9 0.75, depot 0, [L3] 1.0.

**Why the mix is fodder-heavy, and why the estimate sits above par.** 160 enemies inside a 20-minute par
leave about 3 to 4 enemy-seconds each once the boss, depots and 1 km of walking are paid for. Two
lockdowns of 25 enemies and at least 2 minutes each take 50 enemies and 4:20 of that. So 119 of the 161
are 3-second enemies (Midgets and Boom Midgets), the seven open encounters have 7 to 12 enemies each, and
the 13 shields and 5 Acolytes are placed where they matter. Big Obama does not appear on Normal (30 s
each); Heroic adds one at E9. See §14, open question 5.

## 5. Overview map

Schematic, not to scale. North is up. `◉` start, `CPn` checkpoint, `D1`/`D2` depots, `✦` shrine,
`SG`/`SN`/`BZ` racks, **[L]** lockdown arena (doors seal until every wave is dead).

```
        ┌─────────── S1  CARAVAN CAMP + SOUK ALLEYS  200×150 ───────────┐
        │  ✦CP2 Shrine Court ─[C1]═ Dyers' Passage ═► [L1] DYERS' COURT ─┼─► card "Into the Dunes"
        │      ▲ Thread Lane                          (E3) CP3 on clear  │
        │  Spice Square                                                  │
        │      ▲ Spice Alley + 2 side lanes (E2)   SG at the arch        │
        │  Caravan Camp (E1)  ◉CP1                                       │
        └────────────────────────────────────────────────────────────────┘
 ┌────────────────── S2  DUNE SEA  290×200 (terrain) ──────────────────┐   ┌──── S3  CANYON RIM  220×160 ─────┐
 │ ► crest A ► quicksand ► crest B ► The Teeth (E4) ► Geyser Flats ⇧   │   │ tower SN ► Rim Terrace (E6) CP6  │
 │   CP4 ► [L2] HIGH CARAVANSERAI (E5) ► D1 CP5 ══════════════════ pass╪══►│ ► Narrows ► carpet ► Needle ►    │
 └─────────────────────────────────────────────────────────────────────┘   │ carpet ► East Dock (E7) ► carpet ╪═╗
                                                                           └──────────────────────────────────┘ ║
                      ┌──── S4  ROOFTOP MARKET + BAZAAR GATE  140×240 ────┐                                     ║
                      │ CP7 R1 ► R2 ► R3 ─[C2 lift]► M1 ─zip► M2 ─pad► H1 │◄════════════════════════════════════╝
                      │ (E8)    Mana Battery on F1    Overshield on H1    │
                      │                 long zipline ▼                    │
                      │ CP8 Gate Landing ► Gate Square (E9, 2 looms)      │
                      │ ► Bazaar Gate ► D2 CP9 ► vault door               │
                      └───────────────────────┬───────────────────────────┘
                                              ▼ boss card
                      ┌──── SB  SAHIL'S SHOWROOM  80×110 ────┐
                      │ CP10 Rug Vault (BZ, depot crate) ►   │
                      │ ring gate ► [L3] fire-ring arena     │
                      │ r 27.8 (SB-BOSS)                     │
                      └──────────────────────────────────────┘
```

The three lockdowns are in S1, S2 and `SB`, with E4 between the first two and E6 to E9 before the third,
so no two are back to back. The Gate Square (E9) would also suit one, but it is the last fight before
the boss arena, so it stays open: its entry arch never closes.

## 6. Sections

**Conventions for every table below.** Metres. `+x` east, `+z` south, `y` up, yaw 0 faces `+z`. Each
section has its own origin at the corner where x and z are smallest (the **north-west** ground corner),
so every coordinate is positive and the top row of each map is z = 0. PLAN §4 says "south-west corner",
which cannot be right with `+z` south; see §14. `at` follows `kit.js`: **centre** for `box` and `ramp`,
**base centre** for `cylinder` and `cone`, centre for `sphere`, ground point for `disc` and prefabs.
Box size is X × Y × Z (east-west × height × north-south). On terrain, y = 0 means "snap to the ground".

### 6.1 S1: Caravan Camp and Souk Alleys

Footprint 200 × 150 m, flat. The player starts in the south and goes north through the souk, then east.
About 125 solids. Route on foot 257 m. The Dyers' Court at the east end is lockdown **[L1]**.

```
 x=0                   60    80  97 103  120   140  150                 197
 +----------------------+-------+---------+-----+----+-------------------+ z=0
 |                      :       | SHRINE  |     :    |    [sp-vatN]      | z=2
 |      filler          :       | COURT   |     :    | (v) (v) (v)  [L1] |
 |                      :       | ✦CP2 C1]|== PASSAGE ==►  [plat] DYERS' ]═► caravanGate → S2
 |                      :       +--+   +--+ ^line    | (v) (v) (v) COURT | z=31
 |                      :       |thread|    x=120    |    [sp-vatS] [sp-east]
 |                      +-------+--+  +--+-------+   +-------------------+ z=48
 |                      |  SPICE SQUARE   (well)  |                      | z=44-62
 |      W block         |=== Top Lane ============|      E block         | z=62-67
 |      (8 m)           |Cu| Block A|SPICE|Block B|La|   (8 m)           | z=67-93
 |                      |  | (4 m)  |ALLEY| (4 m) |  |                   |
 |                      |=== Arch Lane ==== SG ===|                      | z=93-98
 +----------------------+----------┐   ┌----------+----------------------+ z=99
 |                      | tent   (fire)   cart     |                     |
 |      berm            |      CARAVAN CAMP  tent  |      berm           | z=100-148
 |                      |         ◉ CP1            |                     |
 +----------------------+--------------------------+---------------------+ z=150
```

| Id | Shape | Size (m) | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| `s1.ground` | box | 200×1×150 | (100, −0.5, 75) | sand | Floor |
| `s1.fillA` | box ×4 | 86×8×42; 60×8×54; 60×8×50; 28×8×12 | (43, 4, 21); (30, 4, 71); (170, 4, 73); (100, 4, 6) | stone | Out-of-bounds mass north-west, west, east and north of the shrine. Their faces are the outer walls |
| `s1.fillB` | box ×4 | 58×8×52; 58×8×52; 37×8×18; 37×8×18 | (29, 4, 124); (171, 4, 124); (131.5, 4, 9); (131.5, 4, 35) | stone | Mass beside the camp and on both sides of the Dyers' Passage |
| `camp.berm` | box ×3 | 2×6×50; 2×6×50; 84×6×2 | (59, 3, 125); (141, 3, 125); (100, 3, 149) | sand | Camp walls west, east, south. Camp floor is x 60–140, z 100–148 |
| `camp.tent1..3` | prefab `desert.tent` | — | (74, 0, 112); (126, 0, 110); (84, 0, 138) | — | Tents. `tent1` holds spawn door `sd-tent` |
| `camp.fire` | cylinder | r 1.2, h 0.5 | (100, 0, 118) | stone | Campfire ring (render adds flame). The party stands round it |
| `camp.cart` | prefab `desert.cart` | — | (112, 0, 122) yaw 20 | — | Coin cart; the Obama stands behind it |
| `camp.crates` | prefab `desert.crateStack` ×3 | — | (92, 0, 130); (108, 0, 134); (120, 0, 128) | — | Cover in the first 15 m |
| `camp.palms` | prefab `desert.palm` ×4 | — | (66, 0, 104); (134, 0, 104); (70, 0, 144); (130, 0, 144) | — | Landmarks |
| `camp.lowwall` | box ×2 | 6×1.2×1 | (88, 0.6, 108); (112, 0.6, 108) | stone | Crouch cover facing the arch (Boom Midget intro) |
| `souk.swall` | box ×2 | 37.5×7×2 | (78.75, 3.5, 99); (121.25, 3.5, 99) | stone | Souk south wall. Arch opening x 97.5–102.5 |
| `souk.lintel` | box | 5×2×2 | (100, 6, 99) | trim | Arch top. Opening is 5 wide, 5 high |
| `souk.blockA` | box | 14.5×4×26 | (90.25, 2, 80) | stone | Stalls west of Spice Alley. Roof at y 4 is walkable |
| `souk.blockB` | box | 14.5×4×26 | (109.75, 2, 80) | stone | Stalls east of Spice Alley. Roof at y 4 |
| `souk.blockW` | box | 20×8×54 | (70, 4, 71) | stone | West side of Copper Lane (x 80–83) and of Spice Square |
| `souk.blockE` | box | 20×8×54 | (130, 4, 71) | stone | East side of Lamp Lane (x 117–120) and of Spice Square |
| `souk.parapet` | box ×2 | 0.5×1.2×8 | (97.25, 4.6, 78); (102.75, 4.6, 86) | trim | Roof-edge cover for the two Obamas of squad 2c |
| `souk.awning` | box ×2 | 5×0.5×3 | (100, 4.25, 74); (100, 4.25, 88) | wood | Shade over Spice Alley. The first is the roof-to-roof crossing |
| `souk.stalls` | prefab `desert.stall` ×4 | — | (98, 0, 89) yaw 90; (102, 0, 83) yaw 270; (98, 0, 77) yaw 90; (102, 0, 71) yaw 270 | — | Alternating cover in the 5 m alley; leaves 4 m clear |
| `souk.stairs` | box ×2 | 2×1.3×2; 2×2.7×2 | (86, 0.65, 65); (88, 1.35, 65) | crate | Crate stairs to Block A roof (steps 1.3, 1.4, 1.3) |
| `souk.roll` | box | 5×1.5×1.5 | (118.5, 5.25, 80) | trim | Rolled carpet hung over Lamp Lane. Golden Bonk on top |
| `sq.well` | cylinder | r 1.5, h 1.2 | (100, 0, 53) | stone | Centre of Spice Square (x 80–120, z 44–62) |
| `sq.stalls` | prefab `desert.stall` ×3 | — | (86, 0, 48); (114, 0, 48); (108, 0, 58) | — | Cover |
| `sq.crates` | prefab `desert.crateStack` ×2 | — | (92, 0, 56); (110, 0, 50) | — | Cover |
| `sq.nwall` | box ×2 | 18×7×2 | (89, 3.5, 43); (111, 3.5, 43) | stone | Square north wall; Thread Lane opening x 98–102 |
| `thread.blocks` | box ×2 | 12×7×12 | (92, 3.5, 37); (108, 3.5, 37) | stone | Walls of Thread Lane (x 98–102, z 31–43) and south wall of the Shrine Court |
| `shrine.walls` | box ×4 | 28×7×2; 2×7×18; 2×7×7; 2×7×7 | (100, 3.5, 13); (87, 3.5, 22); (113, 3.5, 16.5); (113, 3.5, 27.5) | stone | Shrine Court x 88–112, z 14–31. East wall has the gate gap z 20–24 |
| `shrine.spell` | prefab `desert.shrine` | — | (100, 0, 22) | — | Chain Zap shrine |
| `shrine.c1` | prefab `desert.conduit` | — | (111.5, 0, 17) | — | Conduit `C1`, 12 m from the shrine, in plain view beside the gate |
| `pass.walls` | box ×2 | 35×7×2 | (131.5, 3.5, 19); (131.5, 3.5, 25) | stone | Dyers' Passage x 114–149, z 20–24: **4 m wide, 35 m long, no side exits**. The entry hall of [L1] |
| `pass.canopy` | box | 35×0.5×8 | (131.5, 7.25, 22) | wood | Rug canopy: the passage's ceiling |
| `pass.line` | disc | r 2 | (120, 0, 22) | neon | Lockdown threshold, 6 m inside `dyersGate` |
| `pass.crates` | box ×2 | 1.5×1.2×1.5 | (122, 0.6, 21); (128, 0.6, 23) | crate | Crouch cover at the player's end |
| `dye.walls` | box ×6 | 2×7×20; 2×7×24; 48×7×2; 48×7×2; 2×7×21; 2×7×21 | (150, 3.5, 10); (150, 3.5, 36); (173, 3.5, 1); (173, 3.5, 47); (196, 3.5, 10.5); (196, 3.5, 37.5) | stone | **Dyers' Court: floor x 151–195, z 2–46 (44 × 44 m).** West gap z 20–24 is the passage mouth. East gap z 21–27 is `caravanGate` |
| `dye.lid` | force-field lid | 44×44 at y 7 | (173, 7, 24) | glass | Seals the top of [L1] (no collider below y 7; stops Magic Carpet and flyers) |
| `dye.vats` | prefab `desert.vat` ×6 | — | (162, 0, 12); (173, 0, 12); (184, 0, 12); (162, 0, 36); (173, 0, 36); (184, 0, 36) | — | Round cover 1.2 m high (cover pieces 1 to 6) |
| `dye.plat` | box | 6×2×10 | (181, 1, 24) | wood | Second height level. The two Obamas of wave 1 stand here and see down the passage |
| `dye.ramps` | ramp ×2 | 6×2×4 | (181, 1, 17) rises to +z; (181, 1, 31) rises to −z | wood | Up to the platform from both sides |
| `dye.racks` | box ×3 | 6×2×0.5 | (158, 1, 30); (188, 1, 16); (168, 1, 20) | wood | Drying racks: full cover (cover pieces 7 to 9) |
| `dye.crates` | prefab `desert.crateStack` ×2 | — | (156, 0, 14); (190, 0, 40) | — | Cover pieces 10 and 11 |

**Mechanisms and pick-ups in S1** (ammo boxes and crates are listed in §12)

| Id | Kind | At | Data |
|---|---|---|---|
| `cp1` | checkpoint | (100, 0, 144) | Level start |
| `archCurtain` | door 5×5×2, slides up | (100, 2.5, 99) | Opens when squads 1a and 1b are dead. Squads 1c and 1d come through it |
| `rack-sg-arch` | rack, shotgun (Common) | (104, 0, 96.5) | `why`: "E2 Shield Wall and [L1] Dyers' Court, 4 to 5 m alleys" |
| `standee-sg-1` | standee, shotgun (Common) | (92, 0, 27) | For players who skipped the rack. Within 40 m of [L1] |
| `pot1..7` | barrel (pot) | fire (100, 0, 104); goo (99, 0, 80); fire (112, 0, 64.5); **shock (134, 0, 20.6); shock (142, 0, 23.4)**; fire (166, 0, 24); goo (188, 0, 32) | The two shock pots in the passage are the no-magic answer to the phalanx. The last two are in the court |
| `threadGate` | door 4×5×2 | (100, 2.5, 43) | Opens on `E2.cleared` |
| `shrine-chainzap` | spellShrine | (100, 0, 22) | Grants Chain Zap, refills mana, saves `cp2` |
| `C1` | conduit | (111.5, 0, 17) | Zapped: opens `dyersGate` and saves `cp2` again. Prompt: "Zap the conduit" |
| `dyersGate` | lockdown door, slab 0.6×7×4 | (113, 3.5, 22) | **Entry door of [L1].** `opens: 'conduit:C1'`. Drops 1 s after the player crosses `pass.line` |
| `caravanGate` | lockdown door, slab 0.6×7×6 | (196, 3.5, 24) | **Exit door of [L1].** Locked until the last wave is dead. Walking through ends S1 |
| `lockdown-L1` | lockdown | — | Entry `dyersGate`, exit `caravanGate`, encounter `E3`, checkpoint outside: `cp2` (13 m from the door) |
| `sp-mouth`, `sp-plat` | spawn points (wave 1) | (146, 0, 22); (181, 2, 24) | Passage mouth (west side of the court); the platform |
| `sp-vatN`, `sp-vatS`, `sp-east` | spawn doors | (168, 0, 2.5); (168, 0, 45.5); (194.5, 0, 36) | North, south and east walls of the court |
| `chest-L1`, `cp3` | reward chest; checkpoint | (186, 0, 24) | Appear when [L1] is cleared, with ammo crate `ac1` |
| `sd-tent`, `sd-well`, `sd-copper`, `sd-lamp` | spawn door | (76, 0, 112); (100, 0, 60); (80, 0, 78); (120, 0, 72) | Flush doors on wall faces (prefab `desert.spawnDoor`) |
| `secret-confetti` | Golden Bonk | (118.5, 6.3, 80) | On the carpet roll. Route in §12 |
| `af1` | Audit File | (84, 0.5, 141) | Behind `tent3` |

**Transition out:** through `caravanGate` → cutscene card "Into the Dunes" (hides the load) → S2 start.

### 6.2 S2: Dune Sea

Footprint 290 × 200 m, heightfield with ±1.2 m of noise; named crests are primitives. The player goes west
to east. About 95 solids. Route on foot 287 m, plus a 12 m geyser launch. Fight hazard: quicksand only
(E4). The geysers are in a stretch with no enemies. The High Caravanserai on the Shelf is lockdown **[L2]**.

```
 x=0      50        100   126     158 164    198 204          248    272  290
 +-------------------------------------------------------------------------+ z=0
 |   cactus                                  (Sahil statue, vista)         |
 |              ====== crest B ======            ___fallback ramp___       | z=58-64
 |           . . road . (75,76) . .   [T4]|arch|  G1   G3  #[==gallery==]# | z=76
 |  wreck  c ~~~~~~~~~~    ~~~~~  [T1]   [T3]            #  [sp-north]   # |
 | ◉ . . . r ~~  Q1  ~~  . ~Q2~~    THE TEETH     G5⇧CP4 ]line (well) [L2] ]D1 CP5 ═pass═► S3   z=98
 |         e ~~~~~~~~~~    ~~~~~  [T2]   [T5]    G2   G4  #    [sp-east] #   |
 |         s                        [T6]                 # [sp-arcade]   # | z=120
 |         t A      ====== crest C ======                                  | z=140
 |   cactus              . . . (secret cache)                              | z=172
 +-------------------------------------------------------------------------+ z=200
```

| Id | Shape | Size (m) | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| `s2.dunes` | terrain | 290×200, cell 2, seed 202, amp 1.2, freq 0.02, 2 octaves | origin (0, 0, 0) | sand | Ground |
| `s2.bounds` | box ×3 | 290×14×4; 290×14×4; 4×14×200 | (145, 7, 2); (145, 7, 198); (2, 7, 100) | rock | North, south and west cliffs |
| `wreck.carts` | prefab `desert.cart` ×2 | — | (26, 0, 94) yaw 15; (36, 0, 108) yaw −30 | — | Caravan wreck: cover in the first 15 m |
| `wreck.crates` | prefab `desert.crateStack` ×2 | — | (22, 0, 106); (40, 0, 96) | — | Cover |
| `road` | disc ×10 | r 1.2 | (16, 0, 100); (30, 0, 100); (44, 0, 100); (58, 0, 96); (66, 0, 84); (75, 0, 76); (88, 0, 78); (100, 0, 84); (112, 0, 82); (124, 0, 84) | stone | Old road slabs. They mark the firm path round both quicksand pools |
| `crestA` | prefab `desert.dune` L 60, h 5 | — | (50, 0, 100), ridge runs north-south | sand | Squad 4a waits behind it (east side) |
| `crestB` | prefab `desert.dune` L 50, h 5 | — | (88, 0, 62) yaw 90, ridge runs east-west | sand | Squad 4b comes over it from the north |
| `crestC` | prefab `desert.dune` L 40, h 4 | — | (120, 0, 140) yaw 90 | sand | Squad 4d comes over it from the south. The secret cache is 30 m behind it |
| `teeth.walls` | box ×6 | 10×2×1; 1×2×8; 8×1.2×1; 12×3×1; 1×1.2×10; 6×1.2×1 | (130, 1, 90); (134, 1, 106); (142, 0.6, 98); (150, 1.5, 86); (154, 0.6, 108); (144, 0.6, 114) | stone | The Teeth, broken ruin walls T1 to T6 (x 126–158, z 78–118) |
| `teeth.cols` | cylinder ×5 | r 0.6, h 5 | (128, 0, 82); (138, 0, 82); (148, 0, 116); (156, 0, 116); (158, 0, 94) | pillar | Columns: thin full cover |
| `teeth.arch` | cylinder ×2 + box | r 0.8, h 6; lintel 8×1×2 | (140, 0, 92); (146, 0, 92); lintel (143, 6.5, 92) | stone | Broken arch. Audit File 2 on the lintel |
| `flats.ribs` | cone ×6 | r 0.4, h 2.5 | ring of r 4 round (180, 0, 100) | stone | Camel skeleton; marks the Geyser Flats (x 164–198, z 78–118) |
| `cache.cacti` | prefab `desert.cactus` ×3 | — | (124, 0, 152); (130, 0, 162); (136, 0, 170) | — | A line of three cacti pointing at the secret cache |
| `shelf` | box | 92×9×68 | (244, 4.5, 98) | rock | The Shelf, a mesa. Top at y 9, x 198–290, z 64–132 |
| `shelf.ramp` | ramp | 30×9×6 | (213, 4.5, 61) rises to +x | rock | Walk-up for players and bots who do not ride the geyser. It joins the same west door |
| `serai.wallW` | box ×2 | 1×6×18 | (204, 12, 85); (204, 12, 111) | stone | **High Caravanserai: floor x 204–248, z 76–120 (44 × 44 m)**, walls 6 m. West gap z 94–102 is the entry door |
| `serai.wallN`, `serai.wallS` | box ×2 | 44×6×1 | (226, 12, 76); (226, 12, 120) | stone | North and south walls |
| `serai.wallE` | box ×2 | 1×6×18 | (248, 12, 85); (248, 12, 111) | stone | East wall. Gap z 94–102 is the exit door |
| `serai.lid` | force-field lid | 44×44 at y 15 | (226, 15, 98) | glass | Seals the top of [L2]. Flyers stay under it |
| `serai.line` | disc | r 4 | (210, 9, 98) | neon | Lockdown threshold, 6 m inside the west door |
| `serai.gallery` | box | 30×3×5 | (226, 10.5, 79) | stone | Second height level along the north wall, top y 12. `sp-north` opens onto it |
| `serai.gramps` | ramp ×2 | 6×3×5 | (208, 10.5, 79) rises to +x; (244, 10.5, 79) rises to −x | stone | Both ends of the gallery |
| `serai.well` | cylinder | r 1.5, h 1.2 | (226, 9, 98) | stone | Cover piece 1. The first Acolyte floats over it |
| `serai.stubs` | cylinder ×4 | r 0.6, h 1.2 | (214, 9, 90); (238, 9, 90); (214, 9, 106); (238, 9, 106) | pillar | Cover pieces 2 to 5. Acolyte orbs die on them |
| `serai.rubble` | box ×3 | 3×1.2×1 | (212, 9.6, 98); (236, 9.6, 92); (236, 9.6, 104) | stone | Cover pieces 6 to 8. The two Obamas of wave 1 stand behind the east pair |
| `serai.crates` | prefab `desert.crateStack` ×2 | — | (220, 9, 112); (232, 9, 86) | — | Cover pieces 9 and 10 |
| `depot1.walls` | box ×2 | 24×4×1 | (261, 11, 88); (261, 11, 108) | stone | Depot court x 250–272, z 88–108 |
| `pass.walls` | box ×2 | 18×10×26 | (281, 14, 81); (281, 14, 115) | rock | Canyon pass x 272–290, z 94–102, 8 m wide |
| `vista.statue` | prefab `desert.sahilStatue` | — | (250, 0, 30) | — | Giant Sahil holding a rolled rug. Not reachable |
| `cacti` | prefab `desert.cactus` ×8 | — | (20, 0, 70); (34, 0, 130); (70, 0, 130); (96, 0, 120); (150, 0, 60); (170, 0, 130); (186, 0, 70); (100, 0, 40) | — | Scale and landmarks |

**Mechanisms and pick-ups in S2** (ammo boxes and crates are listed in §12)

| Id | Kind | At | Data |
|---|---|---|---|
| S2 start | section start | (12, 0, 100) | Respawn point of `cp3` once S2 is loaded |
| `Q1`, `Q2` | hazardZone `slow` (quicksand) | x 60–90, z 86–116; x 108–122, z 86–112 | Speed × 0.5, no damage. Enemies path round it (nav cost × 4). Darker sand, slow ripple |
| `G0` | geyser | (143, 0, 96) | Period 6 s. Launches to the arch lintel (Audit File 2). Damage 0 |
| `G1..G4` | geyser | (170, 0, 90); (176, 0, 108); (184, 0, 94); (190, 0, 106) | Period 5 s, offsets 0, 1.5, 3, 0.5. 1.2 s rumble. Damage 15. They teach the telegraph with nobody shooting |
| `G5` | geyser (launcher) | (195, 0, 98) | Period 4 s, damage 0, lands at (201, 9, 98) on the Shelf edge. A `neon` ring marks it as the route |
| `cache-secret` | secret weapon cache | (136, 0, 172) | Half-buried caravan chest behind crest C. Guaranteed **Rare shotgun** (§12) |
| `cp4` | checkpoint | (201, 9, 98) | Just outside the entry door of [L2], on the geyser landing |
| `seraiGateW` | lockdown door, slab 0.6×6×8 | (204, 12, 98) | **Entry door of [L2].** Open on arrival. Drops 1 s after the player crosses `serai.line` |
| `seraiGateE` | lockdown door, slab 0.6×6×8 | (248, 12, 98) | **Exit door of [L2].** Locked until the last wave is dead |
| `lockdown-L2` | lockdown | — | Entry `seraiGateW`, exit `seraiGateE`, encounter `E5`, checkpoint outside: `cp4` |
| `sp-north`, `sp-arcade`, `sp-east` | spawn doors | (226, 12, 77); (226, 9, 119.5); (247.5, 9, 110) | North (on the gallery), south and east walls |
| `sp-sky` | air entry | over the west wall at (204, 14, 86) | Under the lid |
| `chest-L2`, `loom-0` | reward chest; target `rugLoom` (161 HP) | (242, 9, 98); (242, 9, 94) | Appear when [L2] is cleared, with ammo crate `ac2`. The loom's beam feeds a shield over the chest and crate: the first loom, shown alone |
| `cp5`, `depot-1` | checkpoint; depot | (252, 9, 98); (262, 9, 92) yaw 180 | `cp5` saves when [L2] is cleared. Depot: depot crate (unlimited ammo), health station, spell loadout bench, ticket shop terminal. Safe zone |
| `standee-sg-2` | standee, shotgun (Common) | (254, 9, 104) | |

**Transition out:** seamless. Walk the canyon pass; S3 preloads from `cp5`.

### 6.3 S3: Canyon Rim

Footprint 220 × 160 m. Rim tops are y 0. The canyon is 30 m wide in the north (x 90–120) and 60 m wide in
the south (x 90–150), 40 m deep; `killPlane y = −20` with void rescue. About 70 solids. Route on foot
247 m, plus 67 m on carpets.

```
 x=0   10         36-44          85 90       110-120          150     198-214
 +-----+----------------------------+~~~~~~~~~~+-------------------------------+ z=0
 |#####|         massif N           |  canyon  |          east rim             |
 |#####+----------------------------+   [A]====|  Ledge A  y+3  (z 36-54)      | z=50
 | pass ►   RIM TERRACE   [tower SN]:          |                               |
 | z=80     crates  boulders        : front    |                               |
 |#####|                            : wall [B]=|  Ledge B  y-4  (z 86-104)     |
 |#####+----------------------[gate]+ CP6      +---------------+               | z=100-110
 |#####|      massif S       [cave] |N|                         \  [Market Dock y4] ══► S4
 |#####|                            |a|    void                  | ↗ C3   (198-214, z 105-119)
 |#####|                            |r|          ( Needle )      | East Dock  bales  hut
 |#####+-------------+   West Dock  |w|==C1==►   (  r 6   ) ==C2==►                    | z=126-150
 |###################|   ammo       +-+                          |                    |
 +-------------------+---------------~~~~~~~~~~~~~~~~~~~~~~~~~~~~+--------------------+ z=160
```

| Id | Shape | Size (m) | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| `rim.west` | box | 90×40×160 | (45, −20, 80) | rock | West rim, top y 0, x 0–90 |
| `rim.eastN` | box | 100×40×110 | (170, −20, 55) | rock | East rim north, x 120–220, z 0–110 |
| `rim.eastS` | box | 70×40×50 | (185, −20, 135) | rock | East rim south, x 150–220, z 110–160 |
| `canyon.floor` | box | 130×1×160 | (120, −40.5, 80) | sand | Seen far below. Never reached (kill plane at −20) |
| `rim.bounds` | box ×2 | 220×10×4 | (110, 5, 2); (110, 5, 158) | rock | North and south limits |
| `pass.walls` | box ×2 | 10×10×76 | (5, 5, 38); (5, 5, 122) | rock | Entry pass x 0–10, z 76–84 |
| `massifN` | box | 80×10×46 | (50, 5, 27) | rock | North side of the terrace |
| `massifS` | box ×2 | 76×10×44; 60×10×12 | (48, 5, 122); (40, 5, 150) | rock | South side of the terrace; its east face is the wall of the Narrows |
| `tower` | box | 8×6×8 | (40, 3, 62) | stone | Sniper tower, top y 6. 77 m from Ledge A, 83 m from Ledge B: outside every enemy's range |
| `tower.ramp` | ramp | 3×6×12 | (34.5, 3, 64) rises to −z | stone | Up the west face |
| `tower.parapet` | box ×2 | 0.5×1.2×3 | (43.75, 6.6, 59.5); (43.75, 6.6, 64.5) | stone | East edge, 2 m firing slot between them |
| `terrace.front` | box ×3 | 1×1.2×8 | (85, 0.6, 58); (85, 0.6, 74); (85, 0.6, 90) | stone | Crouch wall at the rim edge, 26 to 34 m from the ledges: the machine-gun approach |
| `terrace.crates` | prefab `desert.crateStack` ×3 | — | (60, 0, 70); (70, 0, 86); (56, 0, 92) | — | Cover |
| `terrace.rocks` | sphere ×3 | r 1.5 | (74, 1, 62); (64, 1, 80); (76, 1, 96) | rock | Boulders, half buried: full cover |
| `ledgeA` | box | 10×1×18 | (115, 2.5, 45) | stone | Upper far ledge, top y 3, x 110–120, z 36–54 |
| `ledgeA.cover` | box ×2 | 3×1.2×1 | (112, 3.6, 40); (112, 3.6, 50) | crate | Enemy cover. `sd-ledgeA` is on the rim face behind |
| `ledgeA.post` | cylinder | r 1, h 42 | (112, −40, 45) | rock | Visual support |
| `ledgeB` | box | 8×1×18 | (116, −4.5, 95) | stone | Lower far ledge, top y −4, x 112–120, z 86–104 |
| `ledgeB.cover` | box ×2 | 1×1.2×4 | (113, −3.4, 90); (113, −3.4, 100) | crate | Enemy cover. `sd-ledgeB` is on the rim face behind |
| `narrows.crates` | box ×3 | 1.5×1.2×1.5 | (88, 0.6, 112); (87.5, 0.6, 126); (88.5, 0.6, 138) | crate | Cover on the Narrows: x 86–90, z 102–144, **4 m wide, void on the east side** |
| `dockW` | box | 6×1×8 | (93, −0.5, 150) | wood | West Dock slab, 6 m out over the canyon |
| `needle` | cylinder | r 6, h 40 | (120, −40, 140) | rock | The Needle. Top y 0, a 12 m round island |
| `needle.crate` | box | 1.5×1.2×1.5 | (120, 0.6, 137) | crate | The only cover on it |
| `dockE` | box | 6×1×8 | (147, −0.5, 126) | wood | East Dock slab |
| `dockE.bales` | box ×3 | 3×1.2×1.5 | (156, 0.6, 122); (156, 0.6, 130); (164, 0.6, 126) | crate | Cover for the two Obamas of squad 7d, then for the player |
| `dockE.hut` | box | 6×3×6 | (175, 1.5, 126) | stone | Backdrop of the East Dock yard |
| `marketDock` | box | 16×4×14 | (206, 2, 112) | stone | Top y 4, level with the first market roof. S3 ends on it |
| `marketDock.ramp` | ramp | 8×4×3 | (194, 2, 117.5) rises to +x | stone | Walk-up, so carpet `C3` is never the only way |
| `vista.spires` | cone ×5 | r 3, h 18 | (100, −40, 20); (108, −40, 70); (135, −40, 150); (140, −40, 115); (104, −40, 120) | rock | Rock spires in the canyon |

**Mechanisms and pick-ups in S3** (ammo boxes are listed in §12)

| Id | Kind | At | Data |
|---|---|---|---|
| `rack-sn-tower` | rack, sniper (Common) | (40, 6, 62) | `why`: "E6 far ledges, 77 to 83 m". **First sniper of the campaign**: picking it up puts the type in the drop pool |
| `sd-ledgeA`, `sd-ledgeB`, `sd-cave` | spawn door | (119.5, 3, 45); (119.5, −4, 95); (86.5, 0, 122) | |
| `rimGate` | door 4×5×2 | (88, 2.5, 101) | Opens on `E6.cleared`. `cp6` at (88, 0, 98) |
| `pot8` | barrel, fire | (86.8, 0, 118) | Beside the cave door |
| `voidRescue` | killPlane y −20 | whole section | −25% max HP, back to the last safe ground or carpet berth. Enemies that fall die |
| `carpetC1` | mover `desert.carpet` | (98.5, −0.25, 150) ⇄ (111.5, −0.25, 141) | 15.8 m, pingpong, 3 m/s, pause 2.5 s at each end |
| `carpetC2` | mover `desert.carpet` | (128.5, −0.25, 139) ⇄ (141.5, −0.25, 127) | 17.7 m, pingpong, 3.5 m/s, pause 2.5 s |
| `carpetC3` | mover `desert.carpet` | (162, 0.25, 114) → (195.5, 4.25, 112) | 33.8 m, `onTrigger` (boarding), 5 m/s, returns after 4 s. Over ground: a lift, not a risk |
| `needle.grate` | burrow point | (120, 0, 140) | Squad 7c |

**Transition out:** seamless. Step off the Market Dock at (214, 4, 112) onto roof R1. S4 preloads from the East Dock.

### 6.4 S4: Rooftop Market and Bazaar Gate

Footprint 140 × 240 m. North half: roofs at three heights (Low 4 m, Mid 7 m, High 10 m) over streets at
y 0. A fall costs time, not health: every route building has an outside stair. South half: the Gate
Square and the depot. About 150 solids. Route on foot 246 m, plus 91 m on the lift, two ziplines and the
catapult. (The suggested "Rooftop Market" and "Bazaar Gate" sections are merged: alone they last 1:55 and
2:05, under the 3-minute floor in PLAN §3.) No lockdown here: see §5.

```
 x=0     26  34       60 64         92  100       124    140
 +---------------------------------------------------------+ z=0
 | [R1 4m]=B1=[R2 4m laundry hut]            [F3 9m]        |
 |  CP7 ◄S3                                                 | z=26
 |             =B2=                                         |
 | [F1 5m]    [R3 4m]  C2 ⇅L1 [M1 7m  tent  hut]            | z=30-56
 |             hut             P1 ●                         |
 | - - - - - Main Souk Street (y 0) - - |Z1 - - - - - - - - | z=56-76
 | [F2 6m]                    [M2 7m]  J1 ⇒ [H1 10m  ★OS]   | z=74-100
 |                             stairs = bridge   minaret    |
 |                                street        ╲ Z2        |
 | [F4 5m]                                       ╲  [F5 6m] | z=107-138
 |                        [Gate Landing y2] CP8 ◄─┘         | z=142-154
 |           +-------------[squareArch]-------------+       | z=160
 |           | stall                         stall  |       |
 |           |[guardW ▲L1]   (fountain)  [guardE ▲L2]|      | z=187
 |           | stall       pots              stall  |       |
 |           +========[ BAZAAR GATE, shielded ]=====+       | z=212-216
 |              |  D2 depot      CP9            |           | z=216-236
 |              +----------[vaultDoor]----------+           | z=237 → SB
 +---------------------------------------------------------+ z=240
```

| Id | Shape | Size (m) | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| `s4.ground` | box | 140×1×240 | (70, −0.5, 120) | sand | Streets and square floor |
| `s4.bounds` | box ×4 | 140×12×2; 2×12×10; 2×12×138; 2×12×240 | (70, 6, 1); (1, 6, 6); (1, 6, 91); (139, 6, 120) | stone | North, west (gap z 11–22 for the Market Dock), east |
| `R1` | box | 24×4×20 | (14, 2, 16) | stone | Landing Roof, x 2–26, z 6–26 |
| `R1.crates` | prefab `desert.crateStack` ×2 | — | (14, 4, 12); (20, 4, 20) | — | Cover |
| `B1` | box | 8×0.5×3 | (30, 3.75, 16) | wood | Plank bridge R1 to R2 |
| `R2` | box | 26×4×22 | (47, 2, 15) | stone | Laundry Roof, x 34–60, z 4–26 |
| `R2.laundry` | box ×3 | 8×2×0.5 | (44, 5, 10); (50, 5, 16); (44, 5, 21) | wood | Hung rugs: full cover. Squad 8b hides behind them |
| `R2.hut` | prefab `desert.hut` | — | (56, 4, 8) | — | Stair hut, spawn door `sd-r2` |
| `B2` | box | 3×0.5×6 | (47, 3.75, 29) | wood | Plank bridge R2 to R3 |
| `R3` | box | 22×4×24 | (47, 2, 44) | stone | Spice Roof, x 36–58, z 32–56 |
| `R3.sacks` | box ×3 | 2×1.2×2 | (42, 4.6, 38); (52, 4.6, 48); (50, 4.6, 38) | crate | Spice sacks: cover |
| `R3.hut` | prefab `desert.hut` | — | (39, 4, 53) | — | Spawn door `sd-r3` |
| `R3.c2` | prefab `desert.conduit` | — | (57, 4, 44) | — | Conduit `C2` at the roof edge beside the lift |
| `M1` | box | 28×7×26 | (78, 3.5, 43) | stone | Copper Roof, x 64–92, z 30–56 |
| `M1.parapet` | box ×2 | 0.5×1.2×10 | (64.25, 7.6, 36); (64.25, 7.6, 50) | stone | West edge. Squad 8c fires down from here. Gap z 41–45 is the lift landing |
| `M1.tent` | box | 8×3×8 | (78, 8.5, 43) | wood | Market tent in the middle. You circle it to get behind shields |
| `M1.pots` | cylinder ×4 | r 0.8, h 1.2 | (70, 7, 34); (86, 7, 36); (70, 7, 52); (86, 7, 50) | gold | Copper pot stacks: cover |
| `M1.hut` | prefab `desert.hut` | — | (89, 7, 33) | — | Spawn door `sd-m1` |
| `M2` | box | 28×7×24 | (80, 3.5, 88) | stone | Lantern Roof, x 66–94, z 76–100 |
| `M2.racks` | box ×2 | 4×2×0.5 | (74, 8, 84); (86, 8, 92) | wood | Lantern racks: full cover |
| `M2.crane` | box | 14×0.5×0.5 | (80, 13, 88) | wood | Crane arm. Squad 8e drops from it |
| `M2.stairs` | ramp | 6×3×3 | (91, 8.5, 98.5) rises to +x | wood | Walk-up to H1 |
| `M2.bridge` | box | 6×0.5×3 | (97, 9.75, 98.5) | wood | Bridge from the stairs to H1 |
| `H1` | box | 24×10×26 | (112, 5, 87) | stone | Minaret Terrace, x 100–124, z 74–100 |
| `H1.parapet` | box | 24×1.2×0.5 | (112, 10.6, 74.25) | stone | North edge |
| `H1.minaret` | cylinder + cone | r 3, h 12; cone r 3.5, h 5 | (118, 10, 80); cone (118, 22, 80) | stone, gold | Landmark, seen from the whole level |
| `H1.balcony` | box | 8×0.5×8 | (118, 16.25, 80) | wood | Balcony ring at y 16.5. Audit File 3 |
| `zipPoles` | prefab `desert.zipPole` ×4 | — | (78, 7, 55); (80, 7, 77); (112, 10, 99); (92, 2, 146) | — | Ends of clotheslines Z1 and Z2 |
| `stairs.out` | ramp ×4 | 8×4×3; 3×4×8; 14×7×3; 14×7×3 | (14, 2, 27.5) rises to −z... see note; (34.5, 2, 44); (71, 3.5, 57.5) rises to +x; (87, 3.5, 74.5) rises to −x | stone | Outside stairs from the street to R1, R3, M1 and M2. Note: each top is flush with its roof edge |
| `landing` | box | 16×2×12 | (90, 1, 148) | stone | Gate Landing, top y 2, x 82–98, z 142–154 |
| `landing.ramps` | ramp ×2 | 6×2×6 | (90, 1, 139) rises to +z; (90, 1, 157) rises to −z | stone | From the street, and down to the square |
| `fill` | box ×5 | 26×5×24; 56×6×32; 36×9×56; 78×5×24; 30×6×30 | (17, 2.5, 46); (32, 3, 94); (118, 4.5, 34); (41, 2.5, 126); (121, 3, 122) | stone | Filler buildings F1 to F5. They collide and block sight. Only F1 (roof y 5, x 4–30, z 34–58) has anything on it: the Mana Battery |
| `F1.tank` | cylinder | r 1.5, h 2 | (14, 5, 50) | metal | Water tank on F1. The Mana Battery is behind it, out of sight from R3 |
| `sq.wallN` | box ×2 | 26×8×2 | (73, 4, 161); (107, 4, 161) | stone | Gate Square (x 60–120, z 162–212) north wall. 8 m gap: the open `squareArch` |
| `sq.wallWE` | box ×2 | 2×8×56 | (59, 4, 188); (121, 4, 188) | stone | West and east walls |
| `sq.guardW`, `sq.guardE` | box ×2 | 10×5×14 | (66, 2.5, 187); (114, 2.5, 187) | stone | Guardhouses. Roof y 5 holds a loom each. Spawn doors `sd-guardW`, `sd-guardE` on the inner faces |
| `sq.fountain` | cylinder ×2 | r 3, h 1.2; r 0.8, h 3 | (90, 0, 187) | stone | Centre cover; you circle it |
| `sq.stalls` | prefab `desert.stall` ×4 | — | (72, 0, 168); (108, 0, 168); (72, 0, 206); (108, 0, 206) | — | Corner cover |
| `sq.carts` | prefab `desert.cart` ×2 | — | (82, 0, 176) yaw 30; (99, 0, 198) yaw −20 | — | Cover |
| `sq.crates` | prefab `desert.crateStack` ×3 | — | (84, 0, 200); (97, 0, 174); (90, 0, 168) | — | Cover in the first 15 m |
| `gate.wall` | box ×2 | 26×10×4 | (73, 5, 214); (107, 5, 214) | stone | The Bazaar Gate wall, top y 10. Rope points for `drop` squads at (78, 10, 212) and (102, 10, 212) |
| `depot2.walls` | box ×4 | 2×8×20; 2×8×20; 16×8×2; 16×8×2 | (69, 4, 226); (111, 4, 226); (78, 4, 237); (102, 4, 237) | stone | Depot Court x 70–110, z 216–236 |

**Mechanisms and pick-ups in S4** (ammo boxes are listed in §12)

| Id | Kind | At | Data |
|---|---|---|---|
| `cp7` | checkpoint | (4, 4, 16) | Section start |
| `mana-battery` | Mana Battery | (12, 5, 50) | On F1 behind the tank. +10 max mana, +0.5 mana/s. Reached by a sprint double jump from R3's west edge over the 6 m alley (1 m up) |
| `pot9..14` | barrel (pot) | goo (40, 4, 20); fire (54, 4, 22); shock (74, 7, 49); fire (84, 7, 44); goo (78, 7, 90); fire (88, 7, 82) | Small roofs: a pot is as dangerous to you as to them |
| `c2Shutter` | door 2×2×0.5 over `C2` | (57, 5, 44) | Lifts when squads 8a, 8b and 8c are dead |
| `C2`, `L1` | conduit; mover 6×0.5×4 | `L1` (61, 3.75, 44) ⇄ (61, 6.75, 44) | Zap `C2`: the lift runs for 20 s (2 m/s, 3 s pause at each end). Zap again any time |
| `Z1` | zipline | (78, 9.5, 55) → (80, 8.5, 77) | 22 m over Main Souk Street |
| `J1` | jumpPad (rug catapult) | (91, 7, 90) → (104, 10, 86), apex 13 | M2 to H1 |
| `J2` | jumpPad | (110, 10, 94) → (116, 16.5, 83), apex 19 | To the minaret balcony (Audit File 3) |
| `os-1` | powerup `overshield` | (108, 10, 80) | Highest roof on the route. Taken just before E9 |
| `Z2` | zipline | (112, 12.5, 99) → (92, 4.5, 146) | 52 m, the long ride down to the Gate Landing |
| `cp8` | checkpoint | (90, 2, 150) | |
| `squareArch` | open arch, 8 m wide | (90, 0, 161) | Never closes: E9 is not a lockdown (it is the last fight before [L3]) |
| `pot15..18` | barrel (pot) | fire (80, 0, 190); fire (100, 0, 184); shock (90, 0, 204); goo (90, 0, 172) | |
| `loom-1`, `loom-2` | target `rugLoom` (161 HP each) | (67, 5, 187); (113, 5, 187) | On the guardhouse roofs. Shot from the ground |
| `bazaarGate` | door 8×7×4 with a shield | (90, 3.5, 214) | `opens: 'target:loom-1 & target:loom-2 & E9.cleared'` |
| `cp9`, `depot-2` | checkpoint; depot | (90, 0, 220); (80, 0, 226) yaw 90 | Depot crate (unlimited ammo), health station, spell loadout bench, ticket shop terminal. Last shop before Sahil |
| `vaultDoor` | door 8×6×2 | (90, 3, 237) | Interact. Boss card, then `SB` |

**Transition out:** `vaultDoor` → boss card "Sahil, the RugMaster" (2.6 s, hides the load) → `SB` start.

### 6.5 SB: Sahil's Showroom (boss section)

Footprint 80 × 110 m. A small vault, a corridor, and a round arena with centre **C = (40, 0, 70)** and the
fire ring at r 27.8. About 70 solids. Everything the fight needs is in this section. A hub boss run
starts at `cp10` with the starter machine gun, fills up at depot crate `dc3`, and goes in.

The arena is lockdown **[L3]**: a round floor 56 m across, 12 pieces of cover (6 pillars, 4 rug piles,
2 carts), a second level in part 3 (the pit), four named spawn points on four sides (the shutters), the
`ringGate` slab behind the player and a force-field lid at y 14.

```
 x=0     12       30     40     50       68     80
 +----------------------------------------------+ z=0
 |                +-------------+                |
 |                |  RUG VAULT  |  ◉ CP10        | z=4-24
 |                | ammo    BZ  |                |
 |                +---[vault]---+                | z=25
 |                    |     |                    |
 |            ________|[ring]|________           | z=41  ringGate closes
 |         .-'  [sh-NW] (Pn) [sh-NE]  '-.        | z=52-53
 |       .'     pile          pile       '.      | z=58
 |      /   [LW]     ( GRAND RUG )    [LE] \     | z=70  looms, centre C
 |      \             r 7 → pit            /     |
 |       '.   (Psw)   cart        (Pse)  .'      | z=79  pylons (rise in part 3)
 |         '-.  [sh-SW]  ammo  [sh-SE] .-'       | z=87
 |            '--------.____.--------'           | z=98  ring r 27.8
 |                 (minaret balcony y 9)         | z=105
 +----------------------------------------------+ z=110
```

| Id | Shape | Size (m) | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| `sb.ground` | box | 80×1×110 | (40, −0.5, 55) | sand | Floor |
| `vault.walls` | box ×5 | 24×6×2; 2×6×20; 2×6×20; 8×6×2; 8×6×2 | (40, 3, 3); (29, 3, 14); (51, 3, 14); (34, 3, 25); (46, 3, 25) | stone | Rug Vault x 30–50, z 4–24 |
| `vault.rugs` | cylinder ×4 | r 0.6, h 3 | (32, 0, 6); (32, 0, 22); (48, 0, 6); (48, 0, 22) | trim | Rolled rugs standing in the corners |
| `corridor` | box ×2 | 2×6×16 | (36, 3, 34); (44, 3, 34) | stone | 6 m wide, 16 m long. Point of no return |
| `facade` | box ×9 | N: 9×8×2 twice; S: 24×8×2; E, W: 2×8×24; diagonals: 24×8×2 ×4 | N (31, 4, 39), (49, 4, 39); S (40, 4, 101); E (71, 4, 70); W (9, 4, 70); NE (61.9, 4, 48.1) yaw 45; SE (61.9, 4, 91.9) yaw 135; SW (18.1, 4, 91.9) yaw 45; NW (18.1, 4, 48.1) yaw 135 | stone | Octagon of stall fronts at r 31, outside the fire ring. Backstop and backdrop |
| `grandRug` | disc | r 7 | C (40, 0, 70) | gold | The Grand Rug. Part 3 pulls it away |
| `cover.pillars` | cylinder ×6 | r 0.7, h 2 | (34, 0, 50); (46, 0, 50); (28, 0, 66); (52, 0, 66); (36, 0, 88); (44, 0, 88) | pillar | Pot pillars. The first two are cover in the first 15 m |
| `cover.piles` | box ×4 | 3×1.2×1.5 | (32, 0.6, 58); (48, 0.6, 58); (30, 0.6, 82); (50, 0.6, 82) | trim | Rug piles: crouch cover. Destructible, 120 HP, stump 0.5 m (B §4) |
| `cover.carts` | prefab `desert.cart` ×2 | — | (46, 0, 64) yaw 20; (34, 0, 76) yaw 200 | — | Destructible, 160 HP |
| `shutters` | prefab `desert.shutterStall` ×4 | — | `sh-NE` (57, 0, 53); `sh-SE` (57, 0, 87); `sh-SW` (23, 0, 87); `sh-NW` (23, 0, 53), doors face C | — | The four named spawn points, on four sides, at r 24, inside the stage-3 ring (r 25.5) |
| `balcony` | cylinder | r 4, h 9 | (40, 0, 105.5) | stone | Minaret Balcony outside the ring. Sahil's perch in part 3 |
| `balcony.roof` | cone | r 4.5, h 4 | (40, 13, 105.5) | gold | Canopy on four posts |

The Duel `bazaar` layout (rugs, a cart, pots) comes from `duelArena('bazaar', C)` (B §4). The cover rows
above are its stand-ins: if the port has other positions, keep the port and keep the two pillars near the entrance.

**Mechanisms and pick-ups in SB** (ammo boxes and crates are listed in §12)

| Id | Kind | At | Data |
|---|---|---|---|
| `cp10` | checkpoint, section start | (40, 0, 6) | The hub's issued start |
| `rack-bz-vault` | rack, bazooka (Common) | (45, 0, 12) | `why`: "SB-BOSS looms, pylons and add clumps". **First bazooka of the campaign** |
| `dc3` | depot crate (unlimited ammo, every type carried) | (35, 0, 12) | Required by PLAN §7.4: a hub run starts here with a machine gun whose ammo is finite |
| `vaultGate` | door 4×5×2 | (40, 2.5, 25) | Opens on interact |
| `ring.line` | disc r 3 | (40, 0, 48) | Lockdown threshold, 6 m inside the ring |
| `ringGate` | lockdown door, slab 0.6×6×6 | (40, 3, 41) | **Entry door of [L3].** Drops 1 s after the player crosses `ring.line`; the boss card plays. Reopens when Sahil dies. There is no exit door: the level ends on `exitRug` |
| `lockdown-L3` | lockdown | — | Entry `ringGate`, encounter `SB-BOSS`, checkpoint outside: `cp10`. Lid: force field at y 14 over the facade octagon. For Magic Carpet (replays) the fire ring is a wall |
| `fireRing` | boss boundary | C, r 27.8 → 26.8 → 25.5 | B §2.5. Burns on crossing. Floor inside is 56 m across |
| `loom-E`, `loom-W` | target `rugLoom` (161 HP) | (58, 0, 70); (22, 0, 70) | Part 1. At r 18 |
| `pylon-N`, `pylon-SE`, `pylon-SW` | target `carpetPylon` (230 HP) | (40, 0, 52); (55.6, 0, 79); (24.4, 0, 79) | Part 3. Sunk under hatches until then |
| `pit` | hazardZone `slow`, r 7 at C | (40, 0, 70) | Part 3 only: speed × 0.5, 4 dps (Sahil's Quicksand numbers) |
| `pot19..22` | barrel (pot) | shock (56, 0, 66); shock (24, 0, 74); fire (55, 0, 84); fire (25, 0, 84) | One within 4 m of each loom and of the two south pylons: 60 damage to the target, for a gun-only run |
| `exitRug` | level end | C | Appears when Sahil dies |

## 7. Prefabs (`src/data/levels/prefabs/desert.js`)

| Prefab | Parts (sizes in m) |
|---|---|
| `desert.tent` | cylinder r 2.5, h 1.8 (`wood`, collides) + cone r 3, h 2.5 on top (visual) |
| `desert.stall` | counter box 3×1.2×1 (`wood`) + 2 post cylinders r 0.25, h 2.6 + awning box 3.4×0.5×1.6 at y 2.85 |
| `desert.cart` | body box 3×1×1.6 at y 0.9 (`wood`) + 2 wheel cylinders r 0.6, h 0.5 on their sides (visual) + shaft box 2×0.5×0.5. Cover 1.4 m |
| `desert.crateStack` | box 1.6×1.2×1.6 + box 1×0.8×1 on one corner (`crate`). Crouch cover with one 2 m corner |
| `desert.palm` | cylinder r 0.35, h 6 (`wood`) + sphere r 1.8 at y 6.5 (`hedge`) |
| `desert.cactus` | cylinder r 0.4, h 2.5 + 2 arm cylinders r 0.25, h 1 (`hedge`) |
| `desert.dune(L, h)` | two ramps L×h×10 back to back, ridge along L (`sand`). Footprint L × 20 |
| `desert.vat` | cylinder r 2, h 1.2 (`stone`) + disc r 1.7 on top in `toxic`, `water` or `gold` (dye) |
| `desert.spawnDoor` | frame box 2.6×3×0.5 (`trim`) flush on a wall + `door` panel 2.2×2.6×0.5 that slides up + spawn point 0.5 m in front. No room behind it |
| `desert.hut` | box 4×3×4 (`stone`) with a `desert.spawnDoor` on one face |
| `desert.pot` | cylinder r 0.5, h 1 (`stone`) + sphere r 0.45 on top, with a band: red fire, yellow shock, green goo. It is `barrel({element})` |
| `desert.shrine` | disc r 3 (`neon`) + cylinder r 1, h 0.5 + obelisk box 0.6×2.2×0.6 + sphere r 0.4 (`neon`) on top + 4 corner cones r 0.3, h 1 |
| `desert.conduit` | cylinder r 0.3, h 2 (`metal`) + sphere r 0.45 on top (dark; `neon` when powered) |
| `desert.carpet` | mover box 4×0.5×6 (`trim`) + rolled front edge box 4×1.2×0.6 (crouch cover while riding) |
| `desert.zipPole` | cylinder r 0.25, h 3 (`wood`) |
| `desert.loom` | 2 post boxes 0.5×3×0.5, 2.5 m apart + beam box 3×0.5×0.5 at y 3 (`wood`) + warp sheet box 2.5×2.5×0.5 (`neon`) + spool cylinder r 0.4, h 2.6 on its side at y 0.6 (`gold`, the weak spot) |
| `desert.pylon` | disc r 1.5 hatch + cylinder r 0.8, h 4 (`gold`) + sphere r 1 at y 4.5 (rolled carpet, the weak spot) |
| `desert.shutterStall` | box 4×3×2 (`wood`) + `desert.spawnDoor` on the inner face + awning box 4.4×0.5×1.5 |
| `desert.sahilStatue` | cylinder r 5, h 24 + sphere r 4 at y 27 (`stone`) + cylinder r 1.5, h 14 on its side at y 16 (`trim`, the rug) |
| `desert.lockSlab(w, h)` | box 0.6×h×w (`metal`) + `neon` trim boxes on both faces: red while locked, green when open (PLAN §5.6). Full height of its wall |
| `desert.chest` | box 1.4×0.8×0.9 (`wood`) + lid box 1.4×0.3×0.9 (`gold`) that swings open. Lockdown reward and secret cache |

## 8. Encounters

Rules for all nine: `maxAlive` is at most 10 and a squad that would exceed it waits in a queue. Triggers
are written so that **no more than three threat roles** (fodder, rusher, flyer, ranged, shield, support) are
alive at once. Tier 2 stats (× 1.15) apply. Counts are Normal. Ammo boxes near each fight are in §12.

**Lockdown rules (PLAN §5.6) for [L1], [L2] and [L3].** The entry door is open when the player arrives.
One second after the player crosses the threshold line 6 m inside, the entry slab drops (it pushes a
player standing under it inward) and the exit locks. Wave n + 1 starts on `onRemain(2)` of wave n or
25 s after wave n started, whichever is first. If the last 2 enemies of a wave live more than 12 s they
are marked on the HUD and run at the player. HUD: "LOCKDOWN", "wave 2 / 4", enemies left. When the last
enemy dies both doors open, a checkpoint saves and the reward appears. Dying returns the player to the
checkpoint outside the entry door and resets the room to wave 1. Each room has a lid, so Magic Carpet
(on replays), geysers and catapults do not lead out; L02 has no jetpack and no Blink.

### E1: Caravan Camp (S1) — objective `clearAll`

Space: the camp yard, 80 × 50 m, open, with tents, a cart, crates and two low walls. Lesson: the L01
basics again, then the first Boom Midget with nothing else on screen.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 1a | `onAlert` (or `onEnter` z < 128) | `placed` | Round the campfire (100, 118); the Obama at the coin cart (112, 122) | 3 midget, 1 obama | 0 | A free opening shot. Cover against bursts |
| 1b | `onKills(2)` | `door` | `sd-tent`, the west tent | 1 midget | 0 | A flank from the side |
| 1c | `onRemain(0)` | `door` | Souk Arch, as `archCurtain` lifts | 1 boomMidget | 1.5 s | **Boom Midget alone.** It beeps and runs 35 m straight at you past fire pot `pot1`. Shoot it early, or shoot the pot |
| 1d | 1c dead, + 2 s | `door` | Souk Arch | 2 midget, then 1 boomMidget behind them | 0, 1 s | Kill the bomber first and it kills its friends |

Roles at once: fodder, ranged, then fodder, rusher. `maxAlive` 8. Approaches: straight up the middle from
crate to crate, or along the west tents. Weapons: start guns; the shotgun rack is 6 m past the arch.
Estimate: 30 s × 1.3 + 45 m ÷ 5.5 = **47 s (0.8 min)**.

### E2: Shield Wall (S1) — objective `clearAll`, opens `threadGate`

Space: Spice Alley (5 m × 26 m) with two parallel lanes 3 m wide (Copper Lane west, Lamp Lane east) joined
at both ends, and two 4 m roofs reached by the crate stairs. Lesson: a Riot Midget pair fills the alley; go round.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 2a | `onEnter` Arch Lane | `door` | `sd-well` in Spice Square, marching south down Spice Alley | 2 riotMidget side by side | 0 | **Riot Midget.** Bullets stop on the shields. Copper Lane and Lamp Lane lead behind them (35 m). Feet and peeks also work |
| 2b | `t+6` | `door` | `sd-copper`, half-way up Copper Lane | 3 midget | 0 | The obvious flank is contested: use the shotgun in the 3 m lane, or switch to the east lane or the roofs |
| 2c | `onKills(3)` | `hidden` | Roof parapets on Block A and Block B | 2 obama | 0 | Fire from above. The awnings and stalls block it; the crate stairs reach them |
| 2d | `onRemain(2)` | `door` | `sd-lamp` in Lamp Lane | 3 midget | 0 | Arrives behind a player who went west: look at the motion tracker |

Roles at once: shield, fodder, ranged. `maxAlive` 8. Approaches: west lane, east lane, roofs, or pot `pot2`
(goo) in the alley to slow the pair. Weapons: `rack-sg-arch` 4 m from the start, shells beside it and in the
square. Estimate: 46 s × 1.3 + 95 m ÷ 5.5 = **77 s (1.3 min)**.

### E3: Dyers' Court — LOCKDOWN [L1] (S1) — objective `clearAll`

**Room.** The Dyers' Court, floor **44 × 44 m** (x 151–195, z 2–46), walls 7 m, force-field lid at y 7.
Its entry hall is the Dyers' Passage, 4 × 35 m, walled and roofed, with no side exits. Eleven pieces of
cover (6 vats, 3 drying racks, 2 crate stacks) and a second level (the 2 m platform with two ramps).
Blockout: §6.1, rows `pass.*` and `dye.*`.

| Part of the room | Detail |
|---|---|
| Entry door | `dyersGate`, slab 0.6×7×4 at (113, 3.5, 22). Opened by Chain Zap on conduit `C1`. Threshold `pass.line` at x 120; the slab drops 1 s later |
| Exit door | `caravanGate`, slab 0.6×7×6 at (196, 3.5, 24), east wall |
| Checkpoint outside | `cp2`, the Shrine Court, 13 m from the door. The shrine there refills mana |
| Spawn points | `sp-mouth` (146, 0, 22) west; `sp-plat` (181, 2, 24) on the platform; `sp-vatN` (168, 0, 2.5) north wall; `sp-vatS` (168, 0, 45.5) south wall; `sp-east` (194.5, 0, 36) east wall |
| Inside the room | Shock pots `pot4`, `pot5` in the passage; fire `pot6` and goo `pot7` in the court; ammo boxes `ab07` (shells) and `ab08` (bullets) |
| Reward | `chest-L1` (one gun, §12), ammo crate `ac1`, checkpoint `cp3`, at (186, 0, 24) |

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Door drops | `placed`; `hidden` | `sp-mouth`, marching west up the passage; `sp-plat` | 3 riotMidget (2 in front, 1 behind); 2 obama | **The phalanx that cannot be flanked**, with the door shut behind you. Chain Zap stuns all three shields for 2 s (one cast chains within 6 m), then the shotgun. Without magic: shock pots `pot4` and `pot5` as they pass, or feet and peeks. The Obamas fire down the lane over the shields: use the two crates |
| 2 | `onRemain(2)` or 25 s | `door` | `sp-vatN` (4), `sp-vatS` (3) | 7 midget | You are in the court now. Shotgun work among the vats, from two sides |
| 3 | `onRemain(2)` or 25 s | `door` | `sp-east` (riot, bombers); `sp-vatN` (midgets) | 1 riotMidget, 2 boomMidget behind it, 3 midget | Twist: bombers behind a shield. Zap the shield and shoot a bomber so it blows the shield up |
| 4 | `onRemain(2)` or 25 s | `door` | `sp-vatS` (2 boom, 3 midget); `sp-east` (2 boom) | 4 boomMidget, 3 midget | Bombers from two sides in a yard full of round cover: keep moving, use the platform, shoot them near `pot6` |

Totals: 4 riotMidget, 2 obama, 13 midget, 6 boomMidget = **25**. Roles at once: shield, ranged, then
fodder, then shield, rusher, fodder. `maxAlive` 10. Approaches to wave 1: zap and push; shock pots; hold
the crates and shoot feet. Approaches after it: ground among the vats, or the platform. Weapons:
`rack-sg-arch` earlier, `standee-sg-1` and shells box `ab05` at `cp2`.
Estimate: 101 s × 1.3 + 83 m ÷ 5.5 + 6 s = **152 s (2.5 min)**, of which 2:11 is sealed.

### E4: Boom Dunes (S2) — objective `reach` (the east side of The Teeth)

Space: 160 m of dunes with two quicksand pools and a ruin. Lesson: bombers in the open and reading ground.
Hazard: quicksand.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 4a | `onEnter` x > 24 | `hidden` | Behind crest A | 3 boomMidget | 1.5 s apart | You hear the beeps before they top the crest. At 40 m the machine gun is the right gun |
| 4b | `onEnter` the road at (66, 84) | `hidden` | Behind crest B, to the north | 1 boomMidget, 2 midget | 0 | Quicksand `Q1` is behind you: backing away from a bomber puts you in it at half speed |
| 4c | `onEnter` x > 100 | `placed` | The Teeth, behind walls T4 and T5 | 2 obama | 0 | Ranged across `Q2`. Wade it under fire, or take the firm gap to the north (z 76–86) |
| 4d | `onKills(6)` | `hidden` | Behind crest C, to the south | 2 boomMidget, 2 midget | 0 | A flank while you trade with the Obamas. Enemies path round the quicksand, so their line is readable |

Roles at once: rusher, fodder, ranged. `maxAlive` 10. Approaches: the firm road, or straight through the
quicksand if the bombers are dead. Cover in the first 15 m: two carts, two crate stacks.
Estimate: 42 s × 1.3 + 163 m ÷ 5.5 = **84 s (1.4 min)**.

### E5: High Caravanserai — LOCKDOWN [L2] (S2) — objective `clearAll`

Before it: the **Geyser Flats**, 35 m with four timed geysers and no enemies, then launcher `G5` up to the Shelf
(or the walk-up ramp, 60 m longer). Checkpoint `cp4` is on the landing.

**Room.** A walled courtyard, floor **44 × 44 m** (x 204–248, z 76–120, on the Shelf at y 9), walls 6 m,
force-field lid at y 15. Ten pieces of cover (the well, 4 column stubs, 3 rubble walls, 2 crate stacks)
and a second level (the 3 m gallery along the north wall, a ramp at each end). No hazard inside.
Blockout: §6.2, rows `serai.*`.

| Part of the room | Detail |
|---|---|
| Entry door | `seraiGateW`, slab 0.6×6×8 at (204, 12, 98), west wall. Threshold `serai.line` at x 210 |
| Exit door | `seraiGateE`, slab 0.6×6×8 at (248, 12, 98), east wall, 4 m from Depot 1 |
| Checkpoint outside | `cp4` at (201, 9, 98), 3 m from the door |
| Spawn points | `sp-north` (226, 12, 77) on the gallery; `sp-arcade` (226, 9, 119.5) south wall; `sp-east` (247.5, 9, 110) east wall; `sp-sky` over the west wall, under the lid |
| Inside the room | Ammo boxes `ab13` (shells) and `ab14` (bullets) |
| Reward | `chest-L2` and ammo crate `ac2` at (242, 9, 98) under a shield fed by `loom-0` (161 HP): **the first Rug Loom, alone, with nobody shooting**. Checkpoint `cp5` |

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Door drops | `placed` | Over the well; behind the east rubble | 1 hexAcolyte, 2 obama | **Hex Acolyte.** Every 8 s it bubbles allies within 12 m (46 HP). Kill it first, or one Chain Zap pops every bubble it reaches. Its 3 homing orbs die on the column stubs |
| 2 | `onRemain(2)` or 25 s | `door` | `sp-arcade` (4), `sp-north` (3, down the gallery ramps) | 7 midget | Bubbled fodder if the Acolyte is still alive: the price of ignoring it |
| 3 | `onRemain(2)` or 25 s | `air`; `door` | `sp-sky` (flyers); `sp-east` (midgets) | 3 flyingMidget, 4 midget | Look up and down at once. The gallery gives a level shot at the flyers |
| 4 | `onRemain(2)` or 25 s | `door` | `sp-north` (Acolyte, bombers); `sp-arcade` (midgets) | 1 hexAcolyte, 4 boomMidget, 3 midget | Twist: **bubbled bombers**. A bubble soaks the shot that would set one off early. Zap first, or kill the Acolyte on the gallery |

Totals: 2 hexAcolyte, 2 obama, 14 midget, 3 flyingMidget, 4 boomMidget = **25**. Roles at once: support,
ranged, fodder; then flyer, fodder; then support, rusher, fodder. `maxAlive` 10. Approaches: hold the
gallery, or circle the well on the ground. Weapons: shells box `ab12` at `cp4`.
Estimate: 97 s × 1.3 + 82 m ÷ 5.5 + 18 s = **159 s (2.7 min)**, of which 2:06 is sealed. Depot 1 is 14 m past the exit door.

### E6: Far Ledge (S3) — objective `clearAll`, opens `rimGate`

Space: the Rim Terrace (78 × 50 m) facing two ledges across a 30 m canyon. Lesson: the one long-range beat.
From the tower (77 to 83 m) nothing can hit you. From the front wall (26 to 34 m) everything can.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 6a | `onEnter` the terrace | `placed` | Ledge A, behind crates | 2 obama | 0 | Targets at range. The sniper rack is on the tower 30 m from the entry |
| 6b | `onKills(1)` | `door` | `sd-ledgeA` | 1 obama, 1 hexAcolyte | 0 | A bubble eats a body shot: head shots, or kill the Acolyte first (104 HP: one head shot) |
| 6c | `onKills(3)` | `door` | `sd-ledgeB`, the lower ledge | 2 robotLaser | 0 | A second target area, 7 m lower. Laser Bots telegraph 0.5 s |
| 6d | `onRemain(1)` | `door` | `sd-ledgeB` | 1 robotShooter | 0 | 196 HP and a 44 m charged laser that reaches the east half of the terrace: stay on the tower or behind a boulder |

Roles at once: ranged, support. `maxAlive` 7. Approaches: snipe from the tower, or fight from the front
wall with the machine gun (full damage to 30 m). Weapons: `rack-sn-tower` (the first sniper) with two
sniper boxes on the tower; bullets box `ab17` at the front wall. Estimate: 47 s × 1.3 + 116 m ÷ 5.5 + 5 s = **87 s (1.5 min)**.

### E7: Narrows and Carpets (S3) — objective `reach` (the Market Dock)

Space: a 4 m ledge 42 m long over the void, then two carpets across a 60 m canyon by way of the Needle
(a 12 m round island), then the East Dock. Lesson: fighting where a step back is a fall, and shooting
from a moving platform. Hazard: the void (void rescue).

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 7a | `onEnter` the Narrows, z > 108 | `door` | `sd-cave` in the rock wall | 2 midget, then 2 boomMidget | 0, 2 s | Shotgun on a ledge. A bomb at the edge throws you toward the void. Fire pot `pot8` is beside the door |
| 7b | `onEnter` carpet `C1` | `air` | Up from under the north rim | 2 flyingMidget | 0 | Aim while the floor moves at 3 m/s. The carpet's rolled edge is crouch cover |
| 7c | `onEnter` the Needle top | `burrow` | `needle.grate` | 2 midget | 0.6 s dust | A fight on a 12 m disc |
| 7d | `onEnter` the Needle top | `placed` | East Dock, behind bales | 2 obama | 0 | They shoot at carpet `C2` (26 to 34 m). Snipe them from the Needle first, or ride behind the rolled edge |

Roles at once: fodder, rusher, then flyer, then fodder, ranged. Ground enemies have no nav link onto a
carpet, so nothing follows you across. `maxAlive` 8. Approaches: clear the East Dock from the Needle with the
sniper, or ride in firing. Estimate: 40 s × 1.3 + 131 m ÷ 5.5 + 30 s = **106 s (1.8 min)**.

### E8: Rooftop Market (S4) — objective `reach` (the Gate Landing)

Space: three low roofs joined by plank bridges, a lift to a mid roof, a zipline to another, a catapult to the
high roof, and a 52 m zipline down. Lesson: everything from S1 again with gaps on every side. No hazard.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 8a | `onEnter` R2 | `door` | `sd-r2` and `sd-r3` | 5 midget (3 + 2) | 0 | They must use the plank bridges: hold a 3 m bridge with the shotgun |
| 8b | `t+8` | `hidden` | Behind the hung rugs on R2 | 2 boomMidget | 1 s apart | Bombers that start 6 m away. Step back over a bridge, or shoot goo pot `pot9` |
| 8c | `onKills(5)` | `hidden` | West parapet of M1, 3 m above | 2 obama | 0 | Fire from above. Killing them lifts `c2Shutter` |
| 8d | `onEnter` the top of lift `L1` | `door` | `sd-m1` | 2 riotMidget, 1 hexAcolyte | 0 | Twist: **bubbled shields**. One Chain Zap pops both bubbles and stuns both shields. Or circle the market tent |

After 8d the route is quiet on purpose: zipline `Z1`, catapult `J1`, the Overshield on H1, zipline `Z2`.
Roles at once: fodder, rusher, ranged, then shield, support. `maxAlive` 10. Approaches: roofs, or the
streets and outside stairs (slower, out of the Obamas' sight).
Estimate: 57 s × 1.3 + 148 m ÷ 5.5 + 14 s = **115 s (1.9 min)**.

### E9: Bazaar Gate (S4) — objective `destroy` (`loom-1`, `loom-2`) and `clearAll`

Space: the Gate Square, 60 × 50 m, a fountain in the middle, two guardhouses with a loom on each roof.
Not a lockdown: the entry arch stays open and the player may back out to the Gate Landing. Lesson: the
boss's first part, with squads instead of Sahil.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| 9a | `onEnter` the square, z > 170 | `drop` | Two ropes from the gate wall | 4 midget (2 + 2) | 1.2 s shadow | A swarm while you find the two beams that feed the gate shield |
| 9b | `onRemain(1)` | `door` | `sd-guardW`, under `loom-1` | 2 riotMidget | 0 | Shields under the loom you are aiming at. Circle the fountain or zap them |
| 9c | `onPartDestroyed` (first loom) | `drop` | Both ropes | 3 boomMidget | 0, 1.5 s, 3 s | Bombers while you look up. Four pots in the square work for either side |
| 9d | `onPartDestroyed` (second loom) | `door` | `sd-guardE` | 2 midget | 0 | Clean-up. Then the gate shield drops |

Roles at once: fodder, shield, rusher. `maxAlive` 10. Approaches: looms first (ends sooner, bombers arrive
sooner) or squads first. Estimate: 43 s × 1.3 + 66 m ÷ 5.5 + 6 s = **74 s (1.2 min)**. Depot 2 is behind the gate.

## 9. New enemies

No new placeholder enemy is proposed. L02 introduces three C §3.12 enemies; these are the stat blocks the
level assumes. `src/data/enemies.js` today has them as re-skins with other numbers (HP 34, 58, 64).
No enemy drops a crafting resource (PLAN §7.1).

| Field | `boomMidget` | `riotMidget` | `hexAcolyte` |
|---|---|---|---|
| Archetype, role | `bomber`, rusher | `shieldBearer`, shield | `support` |
| HP tier 1 → tier 2 | 30 → 35 | 60 → 69 (elite: 173) | 90 → 104 |
| Speed | 9 m/s | 5.4 m/s; 3 m/s while the shield is up | 4.2 m/s, floats 1 m up, blinks 6 m every 6 s |
| Radius, height | 0.45, 1.3 | 0.5, 1.4 | 0.45, 1.6 (`sahil` at 0.75) |
| Attack | Within 3 m: 0.8 s fuse, red ring r 3.5, explodes for 28 → 32. Shot dead early: explodes at once, hurting enemies too | Shield bash 12 → 14, knockback 6. Peeks every 2 to 3 s | 3 homing orbs, 8 → 9 each, 6 m/s. Every 8 s: Tax Shield bubble, 40 → 46 HP, on allies within 12 m |
| Weakness | Any hit before 3 m. Chains with pots and other bombers | Back and sides. Feet and head during a bash or peek. **Shock: shield down 2 s.** Explosions ignore the shield | Priority target. **Chain Zap pops every bubble in the chain.** Orbs stop on cover |
| Hitboxes | body capsule r 0.45; weak sphere r 0.22 head; weak sphere r 0.28 backpack (×2) | body capsule r 0.5; `shield` zone box 1.1×1.4, 0.5 m in front; weak sphere r 0.22 head | body capsule r 0.4; weak sphere r 0.22 head |
| Look (primitives added to the model) | `midget` stage 1 + sphere r 0.28 `gold` on the back + cylinder fuse r 0.04, h 0.2 + blinking disc | `midget` stage 2 + shield box 1.1×1.4×0.12 `metal` with a `glass` slit | `sahil` stage 1 at 0.75 + 3 orb spheres r 0.2 + bubble sphere r 0.9 (see-through) on each shielded ally |
| Events | `hazardWarn`, `explode` | `shieldBash`, `shieldStunned` | `shieldBuff`, `bubblePop`, `enemyBlink` |
| Drops (no resources) | Ammo 40%, health 8%, gun 2%, 1 ticket | Ammo 40%, health 8%, gun 2%, 2 tickets. The elite always drops a gun | Ammo 70%, health 18%, mana orb 25%, gun 6%, 2 tickets |
| Pacing seconds | 3 | 8 | 8 |

**Destroyable targets** (C §3.9 `target`, no AI)

| Id | HP tier 1 → 2 | Weak spot | Behaviour |
|---|---|---|---|
| `rugLoom` | 140 → 161 | Spool, × 2 | A beam links it to what it shields. While any linked loom lives, the shielded thing takes no damage |
| `carpetPylon` | 200 → 230 | Rolled carpet on top, × 2 | Same link. Rises from a hatch over 1.5 s; cannot be hurt while rising |

## 10. Finale: `SB-BOSS`, Sahil the RugMaster — LOCKDOWN [L3]

One encounter, `SB-BOSS`, objective `boss`, in section `SB`. Five parts, **255 s**. Parts 2, 4 and 5 are the
three Duel stages with B §3.1 data unchanged: attacks, powers, cooldowns, AI profile, fire ring, pools,
spring, vents, transform style `bazaar`. Parts 1 and 3 are added around them (PLAN §9). `maxAlive` 10 for
adds; a squad that would exceed it queues. `onBossHp(p)` means p% of the **current** bar.

As a lockdown: the room is the fire ring (56 m across, 12 cover pieces, room blockout in §6.5). Entry
door `ringGate`; threshold `ring.line`; checkpoint outside `cp10`; spawn points `sh-NE`, `sh-SE`, `sh-SW`,
`sh-NW`. The five parts are its waves and the add squads below are the wave table: 40 enemies. Inside:
3 bullets boxes, 2 shells boxes, 1 rockets box and 2 ammo crates (§12). Reward: Sahil's drops.

| Part | Kind | Time | HP | Sahil's attacks | Adds (trigger → method, spawn point, count) | Arena | Ends when |
|---|---|---|---|---|---|---|---|
| **1. The Showroom** | Entry; destroyable parts | 30 s | Sahil cannot be hurt. `loom-E`, `loom-W`: 161 each | Hovers on a carpet 6 m over the Grand Rug inside the **Warranty Shield**. Bolts only, at half rate (1 burst, pause × 2) | `t+2` → `door`, `sh-NW` and `sh-NE`: 6 midget (3 + 3). `onPartDestroyed` (first loom) → `door`, `sh-SE`: 2 boomMidget, 1.5 s apart | Fire ring r 27.8. No shifts | Both looms are destroyed. The shield bursts, the carpet drops, Sahil is stunned on the floor for 3 s (head weak zone open) |
| **2. Friendly Discount** | Phase (Duel stage 1) | 55 s | **1,714** (1,490 × 1.15) | Bolts. Shield bubble 0.8 s every 5 s (stops bullets). Power: **Carpet Sweep** (200° low sweep, 15 m, warn 1.1 s, every 15 s): jump it | `onBossHp(65)` → `door`, `sh-SW` and `sh-SE`: 4 midget (2 + 2). `onBossHp(30)` → `door`, `sh-NW`: 2 boomMidget | Unchanged | The bar is empty. No transform yet: part 3 |
| **3. Rug Pull** | Intermission; arena shift; destroyable parts | 45 s | Sahil cannot be hurt. 3 `carpetPylon`: 230 each | He pulls the Grand Rug away (1.5 s ripple telegraph, r 7) and flies to the Minaret Balcony. From there: **Bazaar Rain** at low strength (4 circles, one cast every 12 s), a preview of part 4 | `t+0` → `door`, `sh-NE`: 2 riotMidget, 1 hexAcolyte. `t+10` → `door`, `sh-SE` and `sh-SW`: 5 midget (3 + 2). `onPartDestroyed` (second pylon) → `door`, `sh-NW`: 3 midget | The floor under the rug is a quicksand **pit**, r 7 (speed × 0.5, 4 dps). Three pylons rise at r 18 | All three pylons are destroyed. He drops into the ring; transform cinematic `bazaar`; the pit fills and is floor again |
| **4. No Refunds** | Phase (Duel stage 2) | 60 s | **1,909** (1,660 × 1.15) | Bolts, **Blast**, **Stun** (1 s, 0.2 s tell). Powers: Carpet Sweep, **Bazaar Rain** (7 circles r 2 over 2.4 s, warn 1.15 s, every 17 s × 0.85) | `onBossHp(70)` → `door`, `sh-NE` and `sh-SW`: 3 midget (2 + 1). `onBossHp(35)` → `door`, `sh-SE`: 3 boomMidget, 1.5 s apart | Ring r 26.8. 4 **Quicksand** pools (4 dps, slow 0.5). 1 **Oasis** spring (9 HP/s, 40 HP) | The bar is empty. Transform cinematic |
| **5. Full Rug Pull** | Phase (Duel stage 3) | 65 s | **1,967** (1,710 × 1.15) | Bolts, Blast, Stun, **Ultimate** (wave to 40 m: jump or dash), volley **Rug Barrage** (3 shots, 22° fan). Powers: Carpet Sweep, Bazaar Rain, **Magic Carpet Drop** (r 2.7, tracks 1.6 s, warn 0.85 s, every 16 s × 0.72) | `onBossHp(75)` → `door`, `sh-NW`: **1 elite riotMidget "Head of Rug Security"** (173 HP), 3 midget. `onBossHp(40)` → `door`, `sh-NE` and `sh-SE`: 3 midget, 2 boomMidget | Ring r 25.5. 3 **Sand Geyser** vents (warn 1.3 s, every 7 to 9.5 s). The spring refills. Pools stay | The bar is empty: Sahil is dead. Ring out, `ringGate` reopens, `exitRug` appears, drops fall (§12), `rewardSpellLearned` **Magic Carpet** |

**Add totals:** part 1: 8, part 2: 6, part 3: 11, part 4: 6, part 5: 9 = **40** (27 midget, 9 boomMidget,
2 riotMidget, 1 hexAcolyte, 1 elite riotMidget). Roles at once never pass three (part 3 has shield, support,
fodder and no bombers). The elite always drops a gun, one tier step up.

**What the level taught first:** looms ([L2] reward, E9), quicksand (E4), geysers (Geyser Flats), shields
with an Acolyte (E8), bombers at close range (E1, [L1], [L2]), a sealed room with waves ([L1], [L2]).
Bazaar Rain is shown at low strength in part 3 before part 4 uses it in full.

**Starter-loadout check (hub rule).** No part needs a spell or a rack. Looms and pylons take bullets; each
has a pot within 4 m. Riot Midgets in a 56 m ring can be circled. A bubble is 46 HP of bullets. The
bazooka rack and depot crate `dc3` are in the Rug Vault. There is no shrine in `SB`, so a hub run has
only Goo Bolt, and nothing in `SB` is a conduit.

**Bullets for a hub run.** The fight is 8,570 HP of targets (bars 5,590, looms 322, pylons 690, adds
1,970): 953 bullets at 9 damage, about 1,360 at 70% accuracy. Supply: 480 carried from `dc3`, 3 bullets
boxes in the ring (180), 2 ammo crates × 3 uses × 240 (1,440), and about 16 enemy packs of 45 (720,
all bullets, because smart drops follow the only gun carried). That is 2,820, or 2.1 times the need;
2,100 (1.5 times) with no drops at all.

**Time check.** A starter machine gun does 90 dps on paper and about 40 sustained on a moving boss
(reloads, misses, bubble). That is 43, 48 and 49 s of fire for the three bars, plus adds and crate
stops: about 5:10 for a hub run. A campaign player with a tier-2 shotgun, rockets and Chain Zap on add
clumps lands near the 4:15 budget. Both are inside PLAN §9's 4 to 5.5 minutes. The HP figures are a
first pass for the TTK tool; they replace `hp: 980` in `src/data/duelBosses.js`, which is a re-pin.

**Risk to tune.** With B §1's conversion, Sahil's own damage is tiny (a stage-1 Bolt is 4 × 0.77 × 0.45 ×
0.68 = 0.94; Carpet Sweep is about 1.5). In this fight the adds, the pit and the ring carry the danger.
If playtests show the boss himself is harmless, raise `DUEL_DMG_K`, not the add counts.

## 11. Mechanisms, magic and explosives used

| Thing | Where | New to L02 | Note |
|---|---|---|---|
| Doors, switches as conduits, spawn doors | All sections | — | |
| **Lockdown arenas** (`lockdown`) | [L1] Dyers' Court (S1), [L2] High Caravanserai (S2), [L3] the fire ring (SB) | Yes | Entry slab, exit slab, lid, wave counter, reward chest (PLAN §5.6) |
| Explosive pots (`barrel` with fire, shock or goo) | 22 pots: S1 7, S3 1, S4 10, SB 4 | Elements are new | Shock pots are the no-magic answer to shields |
| Quicksand (`hazardZone slow`) | S2 `Q1`, `Q2`; SB pit and Sahil's pools | Yes | Speed × 0.5. Enemies path round it |
| Sand geyser | S2 `G0` to `G5`; SB vents | Yes | Traversal geysers do no damage (§14 N2) |
| Kill plane and void rescue | S3 | Yes | −25% max HP, back to safe ground |
| Flying-carpet movers | S3 `carpetC1..C3` | Yes | Riders carried. Nothing paths onto them |
| Clothesline ziplines | S4 `Z1` (22 m), `Z2` (52 m) | Yes | 16 m/s, you can shoot |
| Rug catapult (`jumpPad`) | S4 `J1`, `J2` | Yes | |
| Lift (`mover`, `onTrigger`) | S4 `L1` | — | Powered by `C2` |
| Destroyable targets | `loom-0`, `loom-1`, `loom-2`, `loom-E`, `loom-W`, 3 pylons | Yes | Shield link |
| Depot | S2, S4 | Yes | Depot crate, health station, spell loadout bench, ticket shop terminal, checkpoint. No Weapon Box |
| Ammo boxes, ammo crates, depot crates | 36 boxes, 4 crates, 3 depot crates (§12) | Yes | Every gun's ammo is finite |
| Reward chests, secret cache | `chest-L1`, `chest-L2`, `cache-secret` | Yes | Guns come as drops (§12 loot table) |
| **Chain Zap** shrine | S1 | Yes | Stun shields 2 s, pop bubbles, chain through pots |
| **Conduits** | `C1` (Dyers' Gate, S1), `C2` (lift, S4) | Yes | Two uses, as required. None in `SB` |
| Goo Bolt | Any | — | Slows bombers. Gooed targets are Conductive: +50% from Chain Zap |
| Overshield | S4, H1 | Yes | |
| Mana Battery | S4, on F1 | Yes | +10 max mana, +0.5 mana/s |
| Magic Carpet | Reward | Yes | Learned on the kill |

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

**Checkpoints.** Every one has an ammo box beside it (or a crate, or a depot crate).

| Checkpoint | Where | Saved when | Clock | Gap |
|---|---|---|---|---|
| `cp1` | S1 camp (100, 0, 144) | Start | 0:00 | — |
| `cp2` | S1 Shrine Court, outside the [L1] door | Shrine used (2:11); again when `C1` is zapped (2:31) | 2:11 | 131 s |
| `cp3` | S1 Dyers' Court (186, 0, 24); respawn moves to the S2 start once S2 loads | [L1] cleared | 4:48 | 137 s from the `C1` save |
| `cp4` | S2 Shelf landing (201, 9, 98), outside the [L2] door | Reached | 6:41 | 113 s |
| `cp5` | S2 Depot 1 (252, 9, 98) | [L2] cleared; again on leaving the depot | 8:56 | 135 s |
| `cp6` | S3 Rim Gate (88, 0, 98) | E6 cleared | 11:26 | 150 s from the clear, 137 s from the depot |
| `cp7` | S4 Landing Roof (4, 4, 16) | E7 reached | 13:12 | 106 s |
| `cp8` | S4 Gate Landing (90, 2, 150) | E8 reached | 15:07 | 115 s |
| `cp9` | S4 Depot 2 (90, 0, 220) | E9 cleared | 16:21 | 74 s |
| `cp10` | SB Rug Vault (40, 0, 6), outside the [L3] door | Section start | 17:11 | 51 s |

No gap is over 150 s. The boss fight (4:15) has no checkpoint inside it; see §14, open question 3.

**Depots** (PLAN §7.7: no Weapon Box, no crafting)

| Depot | Where | Contents |
|---|---|---|
| `depot-1` | S2, depot court on the Shelf, 4 m past the [L2] exit | Depot crate `dc1` (unlimited ammo), health station, spell loadout bench, ticket shop terminal, checkpoint `cp5` |
| `depot-2` | S4, behind the Bazaar Gate | Depot crate `dc2`, health station, spell loadout bench, ticket shop terminal, checkpoint `cp9`. Last shop before the boss |

**Placed weapons.** Racks and standees give the level's base tier, Common, at gun level 2.

| Weapon | Id | Where | `why` |
|---|---|---|---|
| Shotgun | `rack-sg-arch` | S1 (104, 0, 96.5) | E2 Shield Wall and [L1] Dyers' Court, 4 to 5 m alleys |
| Shotgun | `standee-sg-1`, `standee-sg-2` | S1 Shrine Court (92, 0, 27); S2 depot court (254, 9, 104) | Second chances |
| **Sniper (first found)** | `rack-sn-tower` | S3 (40, 6, 62) | E6 far ledges, 77 to 83 m; also the East Dock from the Needle |
| **Bazooka (first found)** | `rack-bz-vault` | SB (45, 0, 12) | `SB-BOSS` looms, pylons and add clumps |

**Loot table**

| Level | Base tier (racks) | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|---|
| L02 enemy drops (PLAN §7.3) | Common | 65 | 30 | 5 | 0 | 0 |

Enemy gun-drop chances stay as today (Midget and its re-skins 2%, Flying Midget 4%, Obama, Acolyte and
Laser Bot 6%, Shooter Bot 10%): about 4 random guns over the level. The drop pool is Machine Gun and
Shotgun at the start; Sniper joins when `rack-sn-tower` is taken.

| Guaranteed drop | Where | What |
|---|---|---|
| `chest-L1`, lockdown reward | S1 Dyers' Court (186, 0, 24), when [L1] is cleared | 1 gun, tier rolled on the L02 row (never below Common), a type the player does not carry if possible (here: the Machine Gun or Shotgun they lack, else a Shotgun). With ammo crate `ac1` |
| `chest-L2`, lockdown reward | S2 High Caravanserai (242, 9, 98), when [L2] is cleared and `loom-0` is destroyed | 1 gun, same rule. With ammo crate `ac2` |
| `cache-secret`, secret weapon cache | S2 (136, 0, 172), behind crest C, marked by three cacti in a line | **Rare Shotgun**, guaranteed: the level's best tier, in its headline type |
| Elite "Head of Rug Security" | `SB-BOSS` part 5, from `sh-NW` | 1 gun, one tier step up: Uncommon 65, Rare 30, Epic 5 |
| **Sahil** ([L3] reward) | `SB-BOSS`, on the kill, at the Grand Rug | 2 guns at Uncommon (one tier above base); **1 boss gun, Ray Gun or Big Bullets: the first boss gun of the campaign**; 3 ammo packs, 2 big health, tickets; the spell Magic Carpet |

**Ammo boxes** (one type each; small box = 60 bullets, 12 shells, 8 sniper rounds, 3 rockets)

| Id | Type | Sec. | At (x, y, z) | Placed for |
|---|---|---|---|---|
| `ab01` | bullets | S1 | (98, 0, 142) | `cp1` |
| `ab02` | shells | S1 | (106, 0, 96.5) | 2 m from `rack-sg-arch`; 4 m before E2 |
| `ab03` | shells | S1 | (92, 0, 48) | Spice Square, after E2 |
| `ab04` | bullets | S1 | (110, 0, 56) | Spice Square |
| `ab05` | shells | S1 | (108, 0, 28) | `cp2`; 9 m before the [L1] door |
| `ab06` | bullets | S1 | (92, 0, 16) | `cp2` |
| `ab07` | shells | S1 | (156, 0, 32) | **Inside [L1]** |
| `ab08` | bullets | S1 | (188, 0, 12) | **Inside [L1]** |
| `ab09` | bullets | S2 | (14, 0, 104) | S2 start; before E4 (machine-gun range) |
| `ab10` | shells | S2 | (152, 0, 100) | The Teeth, end of E4 |
| `ab11` | bullets | S2 | (150, 0, 104) | The Teeth |
| `ab12` | shells | S2 | (200, 9, 94) | `cp4`; 4 m before the [L2] door |
| `ab13` | shells | S2 | (212, 9, 84) | **Inside [L2]** |
| `ab14` | bullets | S2 | (242, 9, 114) | **Inside [L2]** |
| `ab15` | sniper | S3 | (41, 6, 60) | 2 m from `rack-sn-tower` |
| `ab16` | sniper | S3 | (38, 6, 64) | Tower top; E6 |
| `ab17` | bullets | S3 | (82, 0, 66) | Terrace front wall; the machine-gun approach to E6 |
| `ab18` | shells | S3 | (86.5, 0, 98) | `cp6`; 20 m before the cave of E7 |
| `ab19` | bullets | S3 | (78, 0, 150) | West Dock, before the carpets |
| `ab20` | sniper | S3 | (118, 0, 143) | The Needle; for the two Obamas on the East Dock |
| `ab21` | shells | S3 | (166, 0, 120) | East Dock |
| `ab22` | shells | S4 | (8, 4, 22) | `cp7`; 30 m before E8 |
| `ab23` | bullets | S4 | (54, 4, 36) | R3; the Obamas on M1 |
| `ab24` | shells | S4 | (67, 7, 46) | M1 lift landing; squad 8d |
| `ab25` | bullets | S4 | (104, 10, 96) | H1 |
| `ab26` | shells | S4 | (86, 2, 152) | `cp8` |
| `ab27` | bullets | S4 | (94, 2, 152) | `cp8` |
| `ab28` | shells | S4 | (88, 0, 165) | Square entrance; 5 m before E9 |
| `ab29` | rockets | SB | (47, 0, 11) | 2 m from `rack-bz-vault` |
| `ab30` | rockets | SB | (47, 0, 13) | 2 m from `rack-bz-vault` |
| `ab31` | shells | SB | (30, 0, 48) | **Inside [L3]**, north |
| `ab32` | bullets | SB | (50, 0, 48) | **Inside [L3]**, north |
| `ab33` | bullets | SB | (20, 0, 62) | **Inside [L3]**, west |
| `ab34` | bullets | SB | (60, 0, 78) | **Inside [L3]**, east |
| `ab35` | shells | SB | (46, 0, 92) | **Inside [L3]**, south |
| `ab36` | rockets | SB | (34, 0, 92) | **Inside [L3]**, south |

**36 ammo boxes:** 15 shells (180), 15 bullets (900), 3 sniper (24), 3 rockets (9).

**Ammo crates** (every type carried to 50% of cap, 3 uses) **and depot crates** (unlimited)

| Id | Kind | Sec. | At (x, y, z) | Note |
|---|---|---|---|---|
| `ac1` | ammo crate | S1 | (184, 0, 24) | [L1] reward, beside `chest-L1` and `cp3` |
| `ac2` | ammo crate | S2 | (240, 9, 100) | [L2] reward, beside `chest-L2` |
| `ac3` | ammo crate | SB | (40, 0, 94) | Inside [L3], south |
| `ac4` | ammo crate | SB | (28, 0, 57) | Inside [L3], north-west |
| `dc1` | depot crate | S2 | (262, 9, 92) | `depot-1`, `cp5` |
| `dc2` | depot crate | S4 | (80, 0, 226) | `depot-2`, `cp9` |
| `dc3` | depot crate | SB | (35, 0, 12) | Rug Vault, `cp10`. The [L3] reward crate too: `ringGate` reopens on the kill |

**4 ammo crates, 3 depot crates.** PLAN §7.4 placement check: every rack has a box of its type within
2 m; every encounter has a box of its gun within 20 m before it; each lockdown has at least 2 boxes
inside and a crate in its reward; all 10 checkpoints have a box, a crate or a depot crate.

**Ammo budget for shells** (the headline gun; cap 64, box 12, enemy pack 8)

| Line | Shells |
|---|---|
| **Ask.** Close kills with the shotgun at tier 2: 1 shell per Midget or Boom Midget, 2 per Riot Midget or Acolyte, 3 for the elite, × 1.3 for misses. E1 8, E2 13, [L1] 31, E4 5, [L2] 26, E7 7, E8 14, E9 13, boss adds 47 | **164** |
| Ammo boxes: 15 × 12 | 180 |
| Ammo crates: 4, counted as one use each at 50% of cap (32) | 128 |
| Depot crates: 3 fills, counted as half a cap each (32) | 96 |
| **Placed** | **404** (2.5 × the ask) |
| Expected enemy packs: about 72 ammo drops in the level (40% of Midget types, 70% of Obama types); smart drops give roughly a third as shells: 24 × 8 | 192 |
| **Placed + drops** | **596** (**3.6 × the ask**; rule: at least 1.5 ×) |

The cap matters more than the total: the largest ask between two refills is 47 (the boss adds, with
2 boxes and 2 crates in the ring) and 31 ([L1], entered 9 m after a box, with a box inside). Both are
under one full carry of 64. Sniper: E6 asks about 14 rounds; the rack gun's magazine plus 3 boxes give 28.

**Power-up:** Overshield `os-1` on H1 at (108, 10, 80).

| Secret | Where | How |
|---|---|---|
| **Golden Bonk: Confetti Everything** | S1, on the rolled carpet over Lamp Lane (118.5, 6.3, 80) | Crate stairs in Top Lane → Block A roof → the awning at z 74 across Spice Alley → Block B roof → double jump onto the roll (2 m up) |
| **Mana Battery** (+10 max mana, +0.5 mana/s) | S4, filler roof F1 at (12, 5, 50), behind the water tank | From R3's west edge, sprint and double jump the 6 m alley to F1 (1 m up). Nothing else is on F1, so the detour is the tell |
| **Secret weapon cache** (Rare Shotgun) | S2 (136, 0, 172) | Behind crest C, 30 m south of the route. Three cacti in a line point at it |
| Audit File 1, "Invoice 0001: one (1) city gate, rug included" | S1, behind the south tent (84, 0.5, 141) | Turn round at the start |
| Audit File 2, "Shipping manifest: 400 rugs, 0 rugs delivered" | S2, on the broken arch (143, 7.5, 92) | Ride geyser `G0` |
| Audit File 3, "Warranty terms: void where prohibited, and over the void" | S4, minaret balcony (118, 16.5, 80) | Rug catapult `J2` on H1 |

## 13. Difficulty

**Harder than L01 because:** tier 2 (× 1.15 HP and damage); `maxAlive` 10 instead of 8; three threat roles
at once instead of two; three new enemy types that each need an answer (shoot early, flank or stun, kill
first); the first hazards during fights (quicksand, the void); two lockdowns of four waves where L01's
fights could be walked away from; the first elite; the first boss with stages, powers and arena shifts;
space that is a quarter the width of L01's streets; and shells that run out if every shot is wasted.

| Setting | Changes |
|---|---|
| Easy | `maxAlive` 8. E2: one Riot Midget instead of two. [L1] wave 1: two Riot Midgets instead of three; waves 3 and 4 lose one Boom Midget each (the lockdown keeps 25 by adding 3 Midgets). Bubbles 30 HP. Quicksand speed × 0.65. Looms 120 HP. Lockdown wave timer 35 s instead of 25 s. Boss: no adds in part 2, no elite in part 5 (3 midgets only), spring heals 60 HP. Ammo boxes give × 1.5 |
| Normal | As written |
| Heroic | `maxAlive` 12. One elite per section ([L1] wave 3 Riot Midget, [L2] wave 4 Acolyte, E6 Shooter Bot, E8 one Riot Midget), each dropping a gun one tier up. E9 gains a squad 9e: 1 bigObama from the main gate on the second loom. Bubbles 60 HP. Lockdown wave timer 20 s. Boss: pylons regrow their shield link if not all three are destroyed within 25 s; the spring does not refill in part 5. Ammo crates have 2 uses |

## 14. Engine needs

| Id | Used for |
|---|---|
| E1 | Solids everywhere; ground height on dunes and roofs; kill plane and void rescue in S3 |
| E2 | Shields and cover stop hitscan; LOS for Obamas on parapets and ledges; `onAlert` squads in E1 |
| E3 | Nav in 3 m lanes, over plank bridges and stairs; quicksand as a nav cost; no links onto carpets; flyer steering in the canyon and under the lockdown lids |
| E4 | Sections `S1`..`S4`, `SB`; 28 squads, 8 lockdown waves and 11 boss add squads with triggers and methods; objectives `clearAll`, `reach`, `destroy`, `boss`; **three lockdown arenas** (sealed slabs, threshold, wave counter, 25 s wave timer, anti-stall, reset on death) |
| E5 | Merged meshes, `sphere`, `cone`, `disc`, new materials, prefab instancing |
| E6 | Door, barrel with elements, kill plane, jump pad, mover, hazard zone, geyser, zipline, depot, target, `lockdown` |
| E7 | `boomMidget`, `riotMidget`, `hexAcolyte` with real behaviour; `robotLaser` and `robotShooter` in the campaign |
| E10 | Chain Zap shrine and rework (stun shields, pop bubbles, conduits, pots); `conduit`; reward spell Magic Carpet; slot assignment at depots; the Mana Battery |
| E11 | Barrel damage and elements |
| E12 | Sahil's Duel port; the five-part script |
| E13 | Carry-over from L01, depots without a Weapon Box, checkpoint toast, boss bar with part pips, cutscene cards |
| E14 | Validator, pacing estimate, map export, autopilot bot |
| E15 | `SB-BOSS` replaces `S4-E4` in `CANONICAL_BOSSES`; Sahil's HP changes. Campaign fingerprint re-pin |
| E16 | No crafting, no resources, no Magic levels: this level places none of them |
| E17 | L02 tier odds; guaranteed drops (2 lockdown chests, the elite, Sahil, the secret cache); Sniper and Bazooka type unlocks; 36 ammo boxes, 4 ammo crates, 3 depot crates; smart drops; finite machine-gun ammo in the hub run |

Not used: E8 (no new placeholder enemy), E9 (no jetpack).

**Needs that PLAN §10 does not list**

| # | Need | Why |
|---|---|---|
| N1 | `hazardZone` kind **`slow`** (speed multiplier, optional dps, nav cost) | Quicksand. C §3.9 lists `slick` (friction) but no slow zone |
| N2 | `geyser` takes `damage` and an optional `to` landing point per instance | C §3.9 fixes 15 damage. A geyser that is the route (`G5`, `G0`) should not cost health |
| N3 | Boss part script: `shieldLink` (no damage while linked targets live), `perch` (hold the boss at a point with a limited attack list and rate), a scripted hazard (the pit), `onBossHp` as a share of the current bar | Parts 1 and 3. Probably inside E12; written here so it is not missed |
| N4 | `onPartDestroyed` for targets in ordinary encounters, doors that open on `target:<id>`, and a shield link from a target to a chest | E9 (`bazaarGate`) and the [L2] reward (`loom-0`) |
| N5 | A per-boss HP scale | B §1 has one `DUEL_HP_K` for all bosses and aims at 90 to 150 s per bar. PLAN §9 wants 4 to 5.5 minutes for the whole fight with added parts, which means 55 to 65 s bars here |
| N6 | A lockdown whose entry door is first opened by a switch, and whose "room" includes an entry hall | [L1]: `dyersGate` opens on conduit `C1`, then drops; the threshold is in the passage |
| N7 | A lockdown with no exit door, ended by the boss objective | [L3]: PLAN §5.6 assumes two doors and `clearAll` |

**Open questions**

1. PLAN §4 puts each section's origin at its south-west corner and says `+z` is south. Both cannot hold
   with positive coordinates. This document uses the north-west corner.
2. PLAN §3 allows one kind of hazard in an L02 fight. Sahil's stage 3 has quicksand pools, vents and the
   fire ring together (B §3.1). This document keeps B's arena shifts and treats the boss as the exception.
3. PLAN §3 wants checkpoints at most 2.5 minutes apart. The boss fight is 4:15, and PLAN §5.6 lets a
   lockdown run 3.5 minutes with a restart at wave 1. This document keeps the gaps under 150 s outside
   the boss. A campaign-only retry point at the start of part 3 would cover the boss; hub runs would ignore it.
4. PLAN §3 says 10 to 13 beats but lists up to 15 kinds of beat. This level has 13 rows by folding the
   Geyser Flats into E5's beat.
5. PLAN §5.6 asks 25 to 45 enemies and at least 2 minutes per lockdown. With L02's 160 to 180 enemies and
   a 20-minute par, two lockdowns at the minimum (25 each) leave 7 to 12 enemies for each open
   encounter, and the estimate lands at 21:34. A third non-boss lockdown does not fit. Either a
   21-minute par or a 20-enemy floor per lockdown would give L02 more room.
6. PLAN §5.6 says lockdowns are never back to back. E9 (the Gate Square) is the natural lockdown of S4
   but only Depot 2 separates it from the boss arena, so it is left open here. If a depot counts as a
   separator, E9 can be sealed with no other change.

## 15. Bot route and tests

**Bot route** (nav-following autopilot, god mode, seed fixed). Waypoints are section-local.

| Section | Waypoints and actions |
|---|---|
| S1 | (100, 144) → clear E1 → (100, 99) → take `rack-sg-arch` → west along Arch Lane → north up Copper Lane → east along Top Lane → clear E2 → (100, 53) → (100, 22) use shrine → cast Chain Zap at `C1` → cross `pass.line` at (120, 22) → **[L1]**: hold at the crates for wave 1, then circle the vats until wave 4 is dead → open `chest-L1`, use `ac1` → (196, 24) |
| S2 | (12, 100) → follow the road discs to (124, 84) → clear E4 → (195, 98) wait for `G5` (or take `shelf.ramp` if the nav link fails) → `cp4` → cross `serai.line` at (210, 98) → **[L2]**: circle the well until wave 4 is dead → shoot `loom-0`, open `chest-L2` → (262, 92) depot → (288, 98) |
| S3 | (4, 80) → tower top (40, 6, 62), take `rack-sn-tower`, clear E6 from there → (88, 101) → (88, 146) → ride `C1` → cross the Needle → ride `C2` → (162, 114) ride `C3` (or `marketDock.ramp`) → (214, 4, 112) |
| S4 | (4, 4, 16) → B1 → B2 → clear 8a to 8c → zap `C2` → ride `L1` → clear 8d → `Z1` → `J1` → take `os-1` → `Z2` → (90, 2, 150) → (90, 187) shoot `loom-1`, `loom-2`, clear E9 → (80, 226) depot → (90, 237) |
| SB | (40, 6) → fill at `dc3` → take `rack-bz-vault` → cross `ring.line` at (40, 48) → **[L3]**: looms → boss bar 1 → pylons → bars 2 and 3, circling at r 15, jumping sweeps, stopping at `ac3` and `ac4` when under 100 bullets → `exitRug` |

The bot skips the secrets. A second scripted route collects the Golden Bonk, the Mana Battery, the
secret cache and the three Audit Files to prove each can be reached.

**Tests**

| Test | Asserts |
|---|---|
| Validator | No solid under 0.5 m; doorways ≥ 2.2 × 2.6 m; every rack has a `why` and an ammo box of its type within 30 m; reachability from all 10 checkpoints; pacing estimate 1,294 s ± 5 |
| Counts | 121 enemies in E1 to E9 and 40 adds in `SB-BOSS`, by type, as in §4 and §10 |
| Pressure | In a full bot run, live ground enemies never exceed 10 and live threat roles never exceed 3 |
| Lockdown shape | [L1] and [L2] floors are 44 × 44 m, [L3] is 56 m across; each has ≥ 8 cover pieces, a second level and ≥ 3 spawn points on different sides; each has ≥ 2 ammo boxes inside |
| Lockdown seal | The entry slab drops 1 s after the threshold and never closes on the player; the exit is locked; with god mode off and Magic Carpet granted, no cast, catapult, geyser or double jump leaves the room; flyers stay under the lid |
| Lockdown waves | Wave n + 1 starts on `onRemain(2)` or at 25 s, whichever is first; 25 enemies in each of [L1] and [L2]; after 12 s the last 2 of a wave are marked and charge |
| Lockdown end and death | On the last kill both doors open, the checkpoint saves and the chest and crate appear. Dying inside respawns at `cp2`, `cp4` or `cp10` with the room reset to wave 1 and the entry door open |
| Phalanx | Nav has no path from the passage to the court except through the phalanx |
| Chain Zap | One cast at wave 1 of [L1] puts all three shields in `shieldStunned` for 2 s; one cast at squad 8d pops both bubbles; a cast at `C1` and at `C2` fires `switchOn` |
| Quicksand | Player speed × 0.5 inside `Q1`; enemy paths from crest B to the road do not cross `Q1` |
| Void | Stepping off `carpetC1` gives `voidRescue`, −25% max HP, and puts the player on the West Dock; a midget pushed off dies with no loot |
| Looms | The chest shield in [L2] and `bazaarGate` hold until their looms are destroyed; Sahil takes 0 damage in parts 1 and 3 |
| Boss schedule | Each of the 11 add squads spawns once, at its trigger, from its shutter, with its count |
| Loot | Racks give Common guns at gun level 2; 10,000 seeded enemy-drop rolls match 65 / 30 / 5 / 0 / 0 within 1.5 points; each of the 5 guaranteed drops appears once with its tier floor; Sniper is not in the drop pool before `rack-sn-tower` is taken; no drop is a crafting resource |
| Ammo | 36 boxes, 4 crates, 3 depot crates at the §12 positions; the machine gun has no endless reserve; a bot using only the shotgun on Midget types never has 0 shells for more than 5 s; the supply drone never fires in the bot run |
| Hub run | A bot starting at `cp10` with the starter machine gun, Goo Bolt only, filling at `dc3` and without taking the rack, kills Sahil without the supply drone. The run is deterministic for a fixed seed |
| Golden | State hash at each checkpoint for seed 7 |
| Pins | PvP hashes unchanged. Wave Mode and Sandbox hashes unchanged after the E16 re-pin |

## 16. Build tasks

In order, for the agent that owns `src/data/levels/L02/` (and `prefabs/desert.js`), on branch `<agent>/campaign-l02`.

1. `prefabs/desert.js`: the 21 prefabs in §7. Unit test: each flattens to valid solids.
2. `L02/index.js`: header (stage, tier 2, par 1,200 s, `maxAlive` 10, loot row 65 / 30 / 5 / 0 / 0, base tier Common), section order `S1`, `S2`, `S3`, `S4`, `SB`, the three cards.
3. `L02/S1.js` blockout from §6.1. Export the map; walk it in debug fly; check the 5 m, 3 m and 4 m widths and the 44 × 44 m court.
4. `L02/S2.js` blockout: terrain, three crests, The Teeth, the Shelf, the 44 × 44 m caravanserai with its gallery. Needs N1 and N2.
5. `L02/S3.js` blockout: rims, ledges, the Needle, docks, kill plane, three carpets.
6. `L02/S4.js` blockout: six roofs, bridges, stairs, the square, the depot court.
7. `L02/SB.js` blockout: vault, corridor, facade, `duelArena('bazaar', [40, 0, 70])` or the stand-in cover.
8. Mechanisms, section by section, from the tables in §6: doors and spawn doors, pots, racks, shrine and conduits, quicksand, geysers, movers, ziplines, catapults, looms, depots, checkpoints.
9. Lockdowns `lockdown-L1`, `lockdown-L2`, `lockdown-L3`: slabs, thresholds, lids, named spawn points, reward chests. Needs N6 and N7. Run the lockdown tests in §15 before adding waves.
10. Encounters E1 to E9 from §8, one at a time, each with its squad or wave table as data. Run the bot after each.
11. Enemy data check with the E7 owner: the three stat blocks in §9; `rugLoom` and `carpetPylon` targets.
12. `SB-BOSS` part script from §10 with the boss-track agent (B §9): parts 1 and 3 first with a dummy boss, then the Duel stages. Needs N3 and N5.
13. Loot and ammo from §12 with the E17 owner: the 5 guaranteed drops, 36 ammo boxes, 4 ammo crates, 3 depot crates. Check the shells budget and the hub-run bullets figure against a bot run.
14. Secrets (§12): Golden Bonk, Mana Battery, secret cache, three Audit Files; Overshield; standees. Easy and Heroic deltas (§13).
15. Tests in §15. Tune counts and HP in level data only until the pacing estimate and one human Normal run are inside 20:00 ± 3:00.
16. Pin PR with the boss owner: `SB-BOSS` in `CANONICAL_BOSSES`, Sahil's HP, `npm run build:server-sim`, hub re-vendor. Say in the PR that the campaign fingerprint moved on purpose.
17. Run every check in `AGENTS.md`; attach the five map exports to the PR.
