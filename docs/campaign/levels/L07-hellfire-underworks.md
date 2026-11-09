# L07: Hellfire Underworks

Level document for `docs/campaign/PLAN.md` (cited as **PLAN §x**). Plan only; nothing here is built.
It replaces "L7: Hellfire Underworks" in `docs/codex/C-level-designs.md`. Kept from the old design:
the dark intake shafts with Sewer Midgets 1 → 4 → 8, conveyors into crushers, the mine-cart ride with
a sniper rack, the Mini Tinubu intro on a straight with alcoves, the reactor ring, the 120-second
meltdown and the Golden Bonk on the cart ride. Changed: the level is now about explosives, it is
4 minutes longer, it has a mini-boss, and every encounter has a written spawn timeline.

All HP and damage numbers are **tier-1 base values**; tier 7 multiplies enemy HP and damage as usual.

## 1. Header

| Field | Value |
|---|---|
| Id, name | `L07`, Hellfire Underworks |
| Stage | `volcano`, interior (Tinubu's bitcoin-mining foundry under the volcano) |
| Lighting | Dark. Black fog from 28 m (12 m in the `dark` zones of S1). Light comes from lava, barrels (each element glows its own colour), warning lamps and `neon` path strips |
| Tier | 7 |
| Par | 20 min (budget below sums to 21 min 21 s) |
| Jetpack | No. Ceilings are 3 to 10 m. Double jump stays |
| Enemy total | 205, plus The Foreman (114 on foot, 36 on the rail ride, 33 mini-boss adds, 22 escape blockers) |
| Route length | 1,520 m (1,080 m on foot, 440 m by cart) |
| Sections | 6: S1 Intake Shafts, S2 Sorting Hall, S3 Mine Cart Run, S4 Furnace Gallery, S5 Reactor Ring, S6 Meltdown Escape |
| Lockdown arenas (PLAN §5.6) | 3: **[L1]** Sorting Hall (E3), **[L2]** Tapping Floor (E7), **[L3]** Reactor Ring (The Foreman) |
| Finale | Mini-boss **Mole Monster "The Foreman"** in 3 parts (180 s), then the **meltdown escape** (120 s) |
| Checkpoints, depots | 10 checkpoints, 2 depots |
| Hidden | Golden Bonk (Lights Out), Mana Battery, secret weapon cache, 3 Audit Files |
| Base gun tier | Rare (PLAN §7.3) |

## 2. Concept

The player's job is to blow the foundry up. Every room is full of things that explode, and the
level asks the player to look first and shoot second. Three encounters are **set-up fights**: the
enemies are visible and idle, the player arranges barrels, opens a valve or plants a charge, and
then starts the fight with one shot. The other encounters each make one explosive the right answer.

How it differs from the other levels: L06 gave the player a bazooka and big targets in the open.
L07 takes the sky away. Rooms are tight and dark, the enemies carry explosives too (Boom Midgets,
Bomb Tossers, Mole Miners with mines, Magma Slugs that burst), and the player's best weapon is the
room itself. Yoink turns every barrel, mine, charge and thrown bomb into ammunition.

| Explosive (PLAN §7.5) | The encounter it answers |
|---|---|
| Barrel, fire | E1 crowd round the fire barrel; E3 barrels sent down belt A into the shift |
| Barrel, shock | E4 stuns the Riot Midget on the belt so the crusher takes it; F1 stuns The Foreman |
| Barrel, goo | E6 slows the Mini Tinubu pair; E7 holds the cage crowd in the gas jet |
| Gas line and valve | E3 fire wall between the belts; E7 fire wall at the cage door; E8 ring main that chains three charges |
| Charge pack | E3 drops the north gantry; E7 cage door; E8 three reactors; F1 pylons, ore seams, tank clamps |
| Proximity mine | E2 mined corridor; Mole Miners plant them; E5 mines on the rail |
| Ore cart | E5 clears the rail barricade; E7 three carts aimed at the floor; F2 carts rolled at the player |
| Destructible target | E5 gate locks; E8 reactors; F1 ore seams and coolant tanks |

**Cutscene cards** (placeholder cards as in C-level-designs §0.1)

- Start, "The Underworks": *"Every coin Tinubu spends is printed down here." / "Bring the roof down."*
- Before F1, "The Foreman": *"Three reactors gone. The shift supervisor would like a word."*
- Before F2, "MELTDOWN" (kept from the old design): *"Reactors at 300%." / "Tinubu calls this 'a controlled burn.' Run."*
- End: *"The mint is slag. Glowie still has the last key."* (leads to L08)

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Carried from L06: machine gun, bazooka, usually a shotgun or sniper. Racks here give **Rare** guns: shotgun (S1), sniper (on the cart, S3), bazooka cache (S5), Lob-o-Matic rack (S4, only if COOP_PLAN §6.3b has landed; picking it up unlocks the type) |
| Ammo | Finite for every gun. Gun ammo is lean in this level (1.53× demand, §12.5) and explosives are everywhere, so demolition is the cheap answer |
| Spells held at the start | Goo Bolt, Chain Zap, Yeet, Sproto Swarm, Mana Shield, Decoy, Meteor Bonk, Magic Carpet, Pump It, Vape Cloud |
| Unlockable: spell | **Yoink**, from the shrine in the spawn room of S1 (`S1-SHR`, 6 m from the spawn). 15 mana, 2 s cooldown, 18 m. Kept for good |
| Unlockable: Mana Battery | Hidden in S4, in the crawl pipe off the junction room (§12.6). +10 max mana, +0.5 mana/s |
| Unlockable: gun type | Lob-o-Matic, only if it has landed (rack `WR3`, S4) |
| Suggested quick slots | Yoink, Goo Bolt, Chain Zap, Yeet |

**The three Yoink uses, each taught once and tested twice**

| # | Use | Taught | Tested | Twist |
|---|---|---|---|---|
| Y1 | **Fetch and throw explosives**: grab a barrel, charge pack or mine that is out of reach and throw it | B0 Yoink range (barrels on a shelf behind a grille, thrown at a cracked wall) | E2 (pull a mine out of the corridor and throw it over the barricade), E3 (shock barrel off the far shelf) | E8: throw a charge pack onto a charge point from 18 m instead of carrying it through the fight |
| Y2 | **Catch a Bomb Tosser's bomb** and throw it back | E1 squad 1C (one Tosser alone on a gantry behind a low wall; guns cannot reach its satchel from the floor) | E3 (two Tossers), E5 (bombs land on the cart) | F2: a Tosser drops bombs down the spiral shaft; the caught bomb opens the grate it stands on |
| Y3 | **Throw a small enemy**: a Boom Midget is a live grenade; a Midget goes into lava or a crusher | E1 squad 1D (Boom Midgets from a grate, prompt on the first) | E4 (Midgets on the belt, crushers), E6 (lava channels) | F1 part 3: Boom Midgets thrown into The Foreman while he is frozen |

**Spell reactions the level relies on** (all from PLAN §6.2): Goo Bolt jams a crusher, turret or
conveyor roller for 4 s and cools Magma Slug trails; Chain Zap sets off every barrel along its
chain; Yeet shoves barrels, bombs and Riot Midgets; Meteor Bonk and the bazooka break `fragile`
walls, so no shortcut needs a charge pack.

## 4. Time budget

Seconds per enemy are from PLAN §3. Types the table does not list, as assumed here:

| Type | Seconds | Reason |
|---|---|---|
| `bombTosser` | 8 | Artillery, same class as `floretSprout` |
| `magmaSlug` | 10 | Slow, 140 HP, killed at range |
| `moleMiner` (proposed) | 10 | Burrower with 110 HP; only hittable while surfaced |
| `rocketObama` | 9 | Ranged heavy, same class as Shooter Bot (ride only, adds no time) |

Combat beats are (enemy seconds) × 1.3. The ride, the mini-boss and the escape are fixed-length
beats: their enemies add no time, because the cart, the part script and the lava set the length.

| # | Beat | Section | Arithmetic | Seconds | Running |
|---|---|---|---|---|---|
| B0 | Yoink shrine and range (mechanism) | S1 | stated | 30 | 0:30 |
| T1 | Walk: spawn → range → store, store → shafts | S1 | 55 m ÷ 5.5 | 10 | 0:40 |
| E1 | Powder Store | S1 | (9 midget × 3 + 1 tosser × 8 + 3 boom × 3) = 44 × 1.3 | 57 | 1:37 |
| E2 | The Grates | S1 | (10 sewer × 3 + 2 boom × 3 + 1 moleMiner × 10 + 2 obama × 6) = 58 × 1.3 | 75 | 2:52 |
| T2 | Connector to the hall vestibule | S1→S2 | 40 m ÷ 5.5 | 7 | 2:59 |
| E3 | **[L1]** Sorting Hall lockdown, **set-up fight 1** | S2 | set-up 25 + (15 midget × 3 + 1 riot × 8 + 3 laser × 6 + 2 tosser × 8 + 3 boom × 3 + 4 sewer × 3) = 108 × 1.3 = 140 | 165 | 5:44 |
| E4 | Crusher Line | S2 | (2 laser × 6 + 6 midget × 3 + 1 riot × 8 + 2 boom × 3 + 1 rig × 15) = 59 × 1.3 | 77 | 7:01 |
| T3 | Walk to the cart station | S2 | 20 m ÷ 5.5 | 4 | 7:05 |
| D1 | Depot 1, Cart Station (breather) | S2 | stated | 45 | 7:50 |
| E5 | Mine Cart Run (ride, 36 enemies) | S3 | 440 m ÷ 5.5 m/s = 80, + 8 at the Brake Gate | 88 | 9:18 |
| T4 | Platform to the straight | S4 | 30 m ÷ 5.5 | 5 | 9:23 |
| E6 | Slag Straight | S4 | (3 miniTinubu × 14 + 3 midget × 3 + 2 boom × 3) = 57 × 1.3 | 74 | 10:37 |
| T5 | Junction, slug bridge (1 magmaSlug alone) | S4 | 25 m ÷ 5.5 = 5, + 10 × 1.3 = 13 | 18 | 10:55 |
| E7 | **[L2]** Tapping Floor lockdown, **set-up fight 2** | S4 | set-up 25 + (12 midget × 3 + 1 elite riot × 16 + 2 laser × 6 + 1 tosser × 8 + 3 boom × 3 + 2 slug × 10 + 4 sewer × 3) = 113 × 1.3 = 147 | 172 | 13:47 |
| T6 | Walk to the lift lobby | S4 | 35 m ÷ 5.5 | 6 | 13:53 |
| D2 | Depot 2, Lift Lobby (breather) | S4 | stated | 45 | 14:38 |
| T7 | Freight lift, walk to the ring | S4→S5 | lift 15 + 20 m ÷ 5.5 | 19 | 14:57 |
| E8 | Overload, **set-up fight 3** | S5 | set-up 20 + (2 laser × 6 + 3 midget × 3 + 3 sewer × 3 + 1 moleMiner × 10 + 3 boom × 3) = 49 × 1.3 = 64 | 84 | 16:21 |
| F1 | **[L3]** Mini-boss lockdown: The Foreman, 3 parts, 33 adds | S5 | 60 + 70 + 50 (PLAN §3 allows 150 to 210) | 180 | 19:21 |
| F2 | Meltdown Escape (22 blockers) | S6 | 420 m ÷ 5.5 = 76, + 44 for seven blocker groups | 120 | 21:21 |
| | **Total** | | | **1,281 s** | **21 min 21 s** |

Par 20 min; the sum is inside the ±2 minute band. A fast replay (70%) is about 15 minutes.
Beat count: 8 combat encounters (E1 to E8, the ride is E5), 1 mechanism beat, 2 breathers, a
two-stage finale; 13 beats. Lockdowns last 2.3 min (L1), 2.5 min (L2) and 3.0 min (L3), and no two
are back to back: E4, D1, E5 and E6 sit between L1 and L2; D2 and E8 between L2 and L3.

**Intensity** (0 to 1, for the "no two above 0.8 in a row" rule): E1 0.4, E2 0.6, E3 0.85, E4 0.65,
D1 0, E5 0.75, E6 0.6, E7 0.85, D2 0, E8 0.75, F1 1.0, card and checkpoint, F2 0.9.

## 5. Overview map

North is up. One character is about 12 m. `C1`…`C10` are checkpoints, `D1` `D2` depots, `[L1]`…`[L3]`
lockdown arenas.

```
                          S3 MINE CART RUN (rail, 440 m)
   Station B  <====== Tunnel 2 ======+
   C6 |                              ‖  Brake Gate (323 m)
      v                              ‖
  S4 FURNACE GALLERY            +====+========= trestle over the LAVA LAKE =====+
  [platform]-[E6 Slag Straight]-+                                                \\
                 C7             |                                                 \\ ramp down
                          [slug bridge]                                            \\
                      [L2][E7 TAPPING FLOOR]--[D2 Lift Lobby C8]                    ‖ Tunnel 1
                                                   | freight lift (down)            ‖
                                                   v                                ‖
                                        S5 REACTOR RING                             ‖
                                        ( E8 Overload  C9 )                         ‖
                                   [L3] ( F1 The Foreman  )                         ‖
                                                   | emergency tunnel  C10          ‖
                                                   v                                ‖
              S6 MELTDOWN ESCAPE: tunnel > catwalks > crushers > spiral > incline > surface

  S1 INTAKE SHAFTS                    S2 SORTING HALL
  [spawn C1 + Yoink shrine]-[range]-[E1 Powder Store C2]-[E2 The Grates]
                                                             | north arm (mines)
                                                             +--C3--[booth]-[L1][E3 SORTING HALL C4]-[E4 Crusher Line]-[D1 Cart Station C5]==> rail
```

Route order: S1 → S2 → S3 (ride) → S4 → S5 → S6. Section transitions: S1→S2 seamless corridor;
S2→S3 the cart leaves the station; S3→S4 the cart stops at Station B; S4→S5 freight lift (hides
the load); S5→S6 cutscene card "MELTDOWN".

## 6. Sections

**Conventions for every blockout table.** Metres. `+x` east, `+z` south, `y` up. Each section's
local origin is its **north-west** ground corner, so every coordinate is positive and the ASCII maps
read top to bottom (PLAN §4 says south-west with `+z` south, which would make every `z` negative;
see §14). `box` rows give `size (x, y, z)` and `at` = the **centre**; `cyl` rows give `r, h` and
`at` = the **base centre** (as in `kit.js`). Prefab names starting `uw.` are in §7. Walls are 1 m
thick. "×n at …" places the same piece n times.

### 6.1 S1 Intake Shafts

Footprint 124 × 90 m. Ceilings 3 m in the shafts, 4 m in the spawn rooms, 6 m in the store. The
shafts (x 63 to 90) are a `dark` zone: fog at 12 m, the motion tracker matters, barrels glow.

```
 z                                                       x86 x89
26                                                      +--------------- connector ------> S2
30                                                      |D1|-------------------------------
36                                                      |==| barricade, obama x2 (2E)
40                                                      |M4|
45                                                      |M3|  mined north arm
50                                                      |M2|
54           +----gantry y3----[GD1]-----+              |M1|
57           | racks   crates            |              |G8|
60 +----+----+                           |              |G7|
64 | A  | B   FW1   (o) E1 POWDER STORE RD1=WR1==G2===G3===G4=+ T-junction (E2)
68 |shr | range     G1                   | C2  Shaft 1       |G5|
72 +----+----+                           |              |G6|
78           +----------[SD1]------------+              |  |
84                                                      [WD]
90                                                      |AF1|
   x0   12   35                          62 63               90
```

| Id | Shape | Size / r,h | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S1-FL | box | 124 × 1 × 90 | (62, −0.5, 45) | rock | Floor slab for the whole section |
| S1-A-N, S1-A-S | box | 35 × 4 × 1 | (17, 2, 59.5), (17, 2, 72.5) | rock | North and south walls of spawn room A and range B (x 0 to 35) |
| S1-A-W | box | 1 × 4 × 12 | (−0.5, 2, 66) | rock | West wall, intake lift door painted on it |
| S1-AB-CL | box | 36 × 1 × 14 | (17, 4.5, 66) | rock | Ceiling of A and B |
| S1-SHR | cyl + sphere | r 1.2, h 0.6; sphere r 0.5 | (6, 0, 66); (6, 1.4, 66) | gold, neon | **Yoink shrine** `spellShrine`, checkpoint C1 |
| S1-B-SHELF | box | 6 × 0.5 × 2 | (30, 3.0, 61) | metal | Barrel shelf, top at y 3.25, out of jump reach |
| BR-B1…3 | barrel fire | — | (28, 3.25, 61), (30, 3.25, 61), (32, 3.25, 61) | — | Yoink practice; each respawns after 6 s until FW1 breaks |
| S1-B-E1, S1-B-E2 | box | 1 × 4 × 4 | (34.5, 2, 62), (34.5, 2, 70) | rock | East wall of the range either side of FW1 |
| **FW1** | box `fragileWall` | 1 × 4 × 4 | (34.5, 2, 66) | concrete | Cracked wall. A thrown barrel breaks it. Way into the store |
| S1-C-N, S1-C-S | box | 28 × 6 × 1 | (48.5, 3, 53.5), (48.5, 3, 78.5) | rock | Store north and south walls (store is x 35 to 62, z 54 to 78) |
| S1-C-W1, S1-C-W2 | box | 1 × 6 × 6 | (34.5, 3, 57), (34.5, 3, 75) | rock | Store west wall north and south of the range |
| S1-C-WL | box | 1 × 2 × 12 | (34.5, 5, 66) | rock | Lintel over the range roof |
| S1-C-E1, S1-C-E2 | box | 1 × 6 × 10 | (62.5, 3, 59), (62.5, 3, 73) | rock | Store east wall either side of RD1 |
| S1-C-EL | box | 1 × 3 × 4 | (62.5, 4.5, 66) | rock | Lintel over RD1 |
| S1-C-CL | box | 28 × 1 × 24 | (48.5, 6.5, 66) | rock | Store ceiling |
| **RD1** | door slab | 0.6 × 3 × 4 | (62.5, 1.5, 66) | metal | Roller door to Shaft 1. Opens on `E1.cleared` |
| **SD1** | door slab | 4 × 3 × 0.6 | (48, 1.5, 78.5) | metal | South roller door, enemy entrance (squad 1B) |
| S1-C-GAN | box | 20 × 0.5 × 3 | (48, 2.75, 55.5) | metal | Gantry deck, top y 3, x 38 to 58 |
| S1-C-GANW | box | 20 × 1.2 × 0.5 | (48, 3.6, 57.25) | metal | Low wall on the gantry edge: hides the Tosser's satchel from the floor |
| S1-C-GP1, GP2 | cyl | r 0.3, h 2.5 | (40, 0, 56.5), (56, 0, 56.5) | metal | Gantry posts |
| **GD1** | door slab | 2.2 × 2.6 × 0.6 | (56, 4.3, 53.5) | metal | Gantry door, enemy entrance (squad 1C) |
| S1-C-RK1…3 | `uw.barrelRack` | — | (40, 0, 62), (40, 0, 70), (52, 0, 74) | — | Full cover, 2 m |
| S1-C-CR1…3 | `uw.crateStack` | — | (46, 0, 60), (54, 0, 64), (47, 0, 72) | — | Crouch and full cover |
| BR-C1…4 | barrel fire | — | (49, 0, 66), (44, 0, 68), (56, 0, 70), (58, 0, 60) | — | C1 is the one the Midgets dance round |
| BR-C5, BR-C6 | barrel shock, goo | — | (52, 0, 58), (60, 0, 66) | — | Shock under the gantry; goo at RD1 |
| G1 | `uw.grate` | — | (49, 0, 74) | — | Burrow point (squad 1D) |
| S1-D-N, S1-D-S | box | 23 × 3 × 1 | (74.5, 1.5, 63.5), (74.5, 1.5, 67.5) | rock | Shaft 1 walls (shaft is x 63 to 86, z 64 to 67, 3 m wide) |
| S1-D-CL | box | 23 × 1 × 5 | (74.5, 3.5, 65.5) | rock | Shaft 1 ceiling at y 3 |
| S1-E-W1 | box | 1 × 3 × 34 | (85.5, 1.5, 46.5) | rock | Shaft 2 west wall, north arm (z 29.5 to 63.5) |
| S1-E-W2 | box | 1 × 3 × 17 | (85.5, 1.5, 76) | rock | Shaft 2 west wall, south arm |
| S1-E-E | box | 1 × 3 × 55 | (89.5, 1.5, 57) | rock | Shaft 2 east wall (shaft is x 86 to 89, z 30 to 84) |
| S1-E-CL | box | 5 × 1 × 56 | (87.5, 3.5, 57) | rock | Shaft 2 ceiling |
| S1-E-P1…3 | box | 1 × 2 × 1.5 | (86.6, 1, 58), (88.4, 1, 49), (86.6, 1, 43) | rock | Wall stubs: the only cover in the mined arm |
| S1-E-BAR | box | 3 × 1.2 × 0.6 | (87.5, 0.6, 36) | crate | Barricade; the Obamas of 2E stand behind it |
| **M1…M4** | proximity mine | — | (87.5, 0, 55), (86.8, 0, 50), (88.2, 0, 45), (87.5, 0, 40) | — | Mined arm. Shoot them or Yoink them |
| BR-E1, BR-E2 | barrel fire | — | (86.5, 0, 68.5), (88.5, 0, 62) | — | Light the T-junction; kill the 2C swarm |
| BR-E3 | barrel shock | — | (88.5, 0, 80) | — | In front of the Boom door WD |
| G2, G3, G4 | `uw.grate` | — | (70, 0, 65.5), (78, 0, 65.5), (82, 0, 65.5) | — | Burrow points in Shaft 1 |
| G5, G6, G7, G8 | `uw.grate` | — | (87.5, 0, 70), (87.5, 0, 76), (87.5, 0, 60), (87.5, 0, 52) | — | Burrow points in Shaft 2 |
| **WD** | door slab | 3 × 3 × 0.6 | (87.5, 1.5, 84.3) | metal | Boom Midget door (2C). Stays open after: leads to the AF1 room |
| S1-AF | box shell | room 8 × 3 × 5 | x 84 to 92, z 85 to 90 | rock | Dead-end store with Audit File 1 and a mine on the floor |
| **D1** | door slab | 3 × 3 × 0.6 | (87.5, 1.5, 29.7) | metal, neon trim | Exit. Opens on `E2.cleared` |
| S1-X-N | box | 40 × 3 × 1 | (105, 1.5, 25.5) | rock | Connector north wall (connector is x 85 to 124, z 26 to 30) |
| S1-X-S | box | 34 × 3 × 1 | (107, 1.5, 30.5) | rock | Connector south wall |
| S1-X-CL | box | 40 × 1 × 6 | (105, 3.5, 28) | rock | Connector ceiling |
| S1-NEON | box | 0.5 × 0.5 × 0.5, ×14 | every 6 m along z 65.5 (x 64 to 84) and x 87.5 (z 32 to 62) | neon | Critical-path floor studs |
| S1-LAMP1…4 | `uw.lamp` | — | (63.5, 2.6, 64.3), (86, 2.6, 64.3), (87.5, 2.6, 30.5), (122, 2.6, 28) | — | Red warning lamps at doors |

**Mechanisms:** `spellShrine` S1-SHR; `fragileWall` FW1; doors RD1, SD1, GD1, WD, D1;
`hazardZone(dark)` min (63, 0, 26) max (90, 3, 85); 14 barrels; 4 mines; rack `WR1` (shotgun) at
(65, 0, 64.4) with a shells box beside it.
**Transition out:** seamless. The connector ends at x 124 and joins the S2 vestibule; S2 preloads
when D1 opens.

### 6.2 S2 Sorting Hall  ·  **[L1]** lockdown room

Footprint 190 × 64 m. Three rooms: the **Sorting Hall** (the lockdown, 70 × 44 m, x 16 to 86,
z 10 to 54, ceiling 10 m, two gantries at y 4.5), the **Crusher Line** (64 × 10 m) and the
**Cart Station** with Depot 1.

```
 z   x0      16                                             86 90                                  154 156        190
10           +==N gantry y4.5==[CP1]=============[SP-N]======+
14  +booth---+ mining racks under the gantry                 +--reject chute (secret cache SC1)
18  | LV-A   | [CR-B] . . . belt A  >>>  (3 fire barrels) |gate| . . . >>> [CR-A]>>
26  +--ramp--+   G11    crates      +--table--+   G10        |          Crusher Line (belt C <<<)
29  |        |     GL1 gas line     |  W1 mob |       [BD1x]=+==[walk][CR1][walk][CR2][walk][CR3][plat]=D3=+ CART STATION
34  +vestib--+     |                +---------+              |        ledge L1      ledge L2     rig  BM1 | D1 depot  C5
38  | C3  [BD1] ¦threshold x22      crates          [SP-E RD2]                                            |
42  +--------+   G9                              G12         |                                            | cart ====> rail
46           | [CR-B]<<< . . . belt B <<< . . . . . [SP-BELT]<<                                           |
52           +==S gantry y4.5====================[SP-S]======+                                            +----------
```

| Id | Shape | Size / r,h | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S2-FL | box | 190 × 1 × 64 | (95, −0.5, 32) | concrete | Floor slab |
| S2-V-N, S2-V-S | box | 16 × 4 × 1 | (8, 2, 33.5), (8, 2, 42.5) | rock | Vestibule walls (vestibule is x 0 to 16, z 34 to 42). West side open to the S1 connector |
| S2-RAMP | ramp | 2 × 4 × 8 | (3, 2, 30) | metal | Vestibule floor up to the booth, rising north |
| S2-BOOTH | box | 16 × 0.5 × 12 | (8, 3.75, 20) | metal | Control booth deck, top y 4 (x 0 to 16, z 14 to 26) |
| S2-BOOTH-G1 | box | 0.5 × 1 × 12 | (16.25, 4.5, 20) | glass | Booth front, lower pane (y 4 to 5) |
| S2-BOOTH-G2 | box | 0.5 × 3.8 × 12 | (16.25, 8.1, 20) | glass | Upper pane (y 6.2 to 10). The 1.2 m gap between the panes is the shooting slit |
| S2-BOOTH-W | box | 17 × 6 × 1; 1 × 6 × 12 | (8, 7, 13.5); (−0.5, 7, 20) | rock | Booth north and west walls |
| LV-A | switch (lever) | — | (14, 4, 16) | neon | Starts belt A. Hold 1 s |
| CH1 | charge pack | — | (12, 4, 24) | — | One pack for CP1 |
| S2-H-N, S2-H-S | box | 70 × 10 × 1 | (51, 5, 9.5), (51, 5, 54.5) | rock | Hall north and south walls |
| S2-H-W | box ×4 | 1 thick, y 0 to 10 | x 15.5; z 10–14, 26–36, 40–54 full height; z 14–26 from y 0 to 4 | rock | Hall west wall. Openings: the booth glass (z 14 to 26, above y 4) and BD1 (z 36 to 40, lintel from y 4) |
| S2-H-E | box ×6 | 1 thick, y 0 to 10 | x 86.5; solid except the four openings | rock | Hall east wall. Openings: belt A hole (z 16–20, y 1–3.5), BD1x (z 27–31, y 0–4), RD2 (z 36–40, y 0–4), belt B mouth (z 44–48, y 1–3.5) |
| S2-H-CL | box | 72 × 1 × 46 | (51, 10.5, 32) | rock | Hall ceiling |
| **BD1** | blast door slab | 0.6 × 4 × 4 | (15.5, 2, 38) | metal, neon trim | Lockdown entry door |
| S2-THR | disc line | r 0.3 ×8 | x 22, z 36 to 40 | neon | Threshold, 6 m inside |
| **BD1x** | blast door slab | 0.6 × 4 × 4 | (86.5, 2, 29) | metal, neon trim | Lockdown exit door |
| S2-BELT-A | `uw.conveyor` | 62 × 1 × 4 | (51, 0.5, 18) | metal | Belt A, x 20 to 82, top y 1, velocity (+3, 0, 0), **off** until LV-A |
| S2-BELT-B | `uw.conveyor` | 66 × 1 × 4 | (53, 0.5, 46) | metal | Belt B, x 20 to 86, velocity (−3, 0, 0), on. Carries wave 2 toward the door |
| CR-A, CR-B | `uw.crusher` | head 4 × 2 × 4 | (80, 0, 18), (22, 0, 46) | metal | Crushers at the end of each belt. Period 4 s |
| SG-A | door (stop gate) | 0.5 × 1.5 × 4 | (50.25, 1.75, 18) | metal | Holds belt-A barrels beside the table. Opens when shot (40 HP) |
| BR-A1…3 | barrel fire | — | (22, 1, 18), (24, 1, 18), (26, 1, 18) | — | Parked on belt A. LV-A sends them to SG-A, 4 m from the wave-1 mob |
| S2-TABLE | box | 12 × 1.2 × 8 | (50, 0.6, 32) | metal | Sorting table. Wave 1 stands round it. Crouch cover |
| S2-NG | box | 46 × 0.5 × 3 | (53, 4.25, 11.5) | metal | North gantry deck, top y 4.5, x 30 to 76 |
| S2-NG-P1…4 | cyl | r 0.3, h 4 | (34, 0, 13.5), (46, 0, 13.5), (60, 0, 13.5), (72, 0, 13.5) | metal | Gantry posts. P1 is cracked |
| **CP1** | charge point | — | (34, 0.5, 13.5) | neon | On post P1. A charge here drops the deck from x 30 to 46 with whoever stands on it |
| S2-SG | box | 46 × 0.5 × 3 | (53, 4.25, 52.5) | metal | South gantry deck |
| S2-SG-P1…4 | cyl | r 0.3, h 4 | (34, 0, 50.5), (46, 0, 50.5), (60, 0, 50.5), (72, 0, 50.5) | metal | Posts |
| S2-SG-ST | stairs | 8 × 4.5 × 2 | (80, 2.25, 52.5) | metal | Player stairs up to the south gantry, rising west |
| S2-CR1…6 | `uw.crateStack` | — | (28, 0, 30), (36, 0, 36), (44, 0, 24), (58, 0, 26), (66, 0, 34), (72, 0, 28) | — | Cover on the floor |
| S2-MR1…4 | `uw.miningRack` | — | (38, 0, 15), (50, 0, 15), (64, 0, 15), (70, 0, 15) | — | Rows of mining rigs under the north gantry: full cover |
| **GL1** | `uw.pipe` | 0.6 × 0.6 × 16 | (34, 0.6, 32) | metal | Gas line across the floor, z 24 to 40 |
| **GV1** | `uw.valve` | — | (34, 1.2, 24) | neon | Valve. Shot: a 6 s fire wall along GL1, between the mob and BD1 |
| BR-H1, BR-H2 | barrel fire | — | (42, 0, 32), (58, 0, 32) | — | Either end of the table |
| BR-H3, BR-H4 | barrel shock | — | (70, 2, 12), (36, 0, 26) | — | H3 is on a shelf at the far end, a Yoink fetch |
| BR-H5, BR-H6 | barrel goo | — | (26, 0, 38), (74, 0, 38) | — | Inside BD1 and inside RD2 |
| **SP-E** (RD2) | door slab | 0.6 × 4 × 4 | (86.5, 2, 38) | metal | Spawn point east |
| **SP-BELT** | opening | — | (86, 1, 46) | — | Spawn point: belt B mouth |
| **SP-N**, **SP-S** | door slab | 2.2 × 2.6 × 0.6 | (74, 5.8, 9.5), (74, 5.8, 54.5) | metal | Spawn points: north and south gantry doors |
| **SP-G** (G9…G12) | `uw.grate` | — | (40, 0, 40), (62, 0, 24), (30, 0, 28), (70, 0, 42) | — | Spawn points: floor grates |
| S2-SC | box shell | room 6 × 3.5 × 8 | x 87 to 93, z 14 to 22 | rock | Reject chute room behind CR-A: the **secret weapon cache SC1**. One-way door south into the crusher corridor |
| S2-CL-N, S2-CL-S | box | 64 × 6 × 1 | (122, 3, 23.5), (122, 3, 34.5) | rock | Crusher Line walls (x 90 to 154, z 24 to 34) |
| S2-CL-CL | box | 64 × 1 × 12 | (122, 6.5, 29) | rock | Crusher Line ceiling at y 6 |
| S2-BELT-C | `uw.conveyor` | 52 × 0.5 × 6 | (118, 0.25, 29) | metal | Belt C, x 92 to 144, z 26 to 32, top y 0.5, velocity (−3, 0, 0): against the player |
| S2-WK1…3 | box | 10 × 0.5 × 2; 8 × 0.5 × 2 ×2 | (97, 0.25, 25); (114, 0.25, 25), (130, 0.25, 25) | metal | Side walk in three pieces (x 92–102, 110–118, 126–134). Safe from the belt, open to the ledges |
| S2-HS1…3 | box | 8 × 3 × 2 | (106, 1.5, 25), (122, 1.5, 25), (138, 1.5, 25) | metal | Crusher housings that block the walk: the player must pass under each crusher on the belt |
| CR1, CR2, CR3 | `uw.crusher` | head 4 × 2 × 6 | (106, 0.5, 29), (122, 0.5, 29), (138, 0.5, 29) | metal | Period 4 s, offsets 0, 1.3, 2.6 s. `gooGear` GG1…GG3 on each housing at y 2 |
| S2-L1, S2-L2 | box | 6 × 2.5 × 2 | (114, 1.25, 33), (130, 1.25, 33) | metal | South ledges, top y 2.5 (squad 4A) |
| S2-SF1…3 | box | 20 × 6 × 2; 10 × 6 × 2; 21 × 6 × 2 | (101, 3, 33); (122, 3, 33); (143.5, 3, 33) | rock | Fill the south strip between the ledges |
| S2-PLAT | box | 10 × 0.5 × 10 | (149, 0.25, 29) | metal | Exit platform, x 144 to 154. The Mining Rig sits at (151, 0.5, 31) |
| BM1 | door slab | 0.6 × 3 × 4 | (154.5, 2, 31.5) | metal | Enemy door onto the platform and the belt (squads 4B, 4C) |
| **D3** | door slab | 0.6 × 3 × 3 | (154.5, 2, 26) | metal, neon trim | Exit. Opens on `E4.cleared` |
| BR-L1, BR-L2 | barrel shock | — | (114, 0.5, 25), (130, 0.5, 25) | — | On the walk pieces |
| BR-CHUTE | barrel chute (fire) | — | drops at (143, 0.5, 29) | — | One fire barrel onto belt C every 12 s, at most 2 on the belt. They ride toward the player |
| S2-ST | box shell | room 34 × 8 × 30 | x 156 to 190, z 14 to 44 | rock | Cart Station. Tunnel mouth 6 × 5 in the east wall at z 35 to 41 |
| **D1 depot** | `depot` | — | (166, 0, 22) | — | Depot crate, health station, loadout bench, shop terminal, checkpoint C5 |
| S2-RAIL | box | 16 × 0.5 × 2 | (182, 0.25, 38) | metal | Rail stub; the cart waits at (176, 0.5, 38) |

**Mechanisms:** `lockdown` L1 (entry BD1, exit BD1x, encounter E3); conveyors A, B, C; crushers
CR-A, CR-B, CR1 to CR3 (`crush: 999`, 1 s warning lamp); 3 `gooGear`; gas line GL1; lever LV-A;
charge pack and point; stop gate SG-A; barrel chute; depot; rail cart.
**Lockdown rewards** (appear when the doors open): chest `LC1` at (82, 0, 29), ammo crate `AC1` at
(82, 0, 26), `manaBloom` at (80, 0, 31), checkpoint C4.
**Transition out:** the player boards the cart; S3 preloads at the depot; the cart leaves on Interact.

### 6.3 S3 Mine Cart Run

Footprint 310 × 170 m. A 440 m `railCart` path (`lock: 'soft'`, 5.5 m/s) through a dark tunnel, down
onto a trestle over the lava lake, through the Brake Gate and up a second tunnel to Station B.
`d` is distance along the track. Falling off the cart or the trestle is a lava kill volume with
rescue back onto the cart.

| Waypoint | At (x, y, z) | d (m) | Leg |
|---|---|---|---|
| W0 | (10, 0, 160) | 0 | Leaves the Cart Station |
| W1 | (90, 0, 160) | 80 | Tunnel 1, straight east, dark |
| W2 | (150, −4, 120) | 152 | Ramp down into the cavern (yaw 124°, 72 m) |
| W3 | (250, −4, 120) | 252 | Trestle over the lava lake, straight east |
| W4 | (300, −4, 70) | 323 | Curve north-east (yaw 135°, 71 m). **Brake Gate** at W4 |
| W5 | (300, 0, 10) | 383 | Tunnel 2, north, climbing 4 m |
| W6 | (243, 0, 10) | 440 | West into Station B |

```
 z                                                                         x243        x300
 10                                                     Station B <====== Tunnel 2 ======+ W5
 40      +----------------------- cavern wall -------------------------------------+     ‖
 68                              (P2)                                              | [BRAKE GATE] W4
 75                    (P1)                                    spur OC-R  \        |    //
 93                                                              barricade B3 >  //
107                                       +--pump barge PB--+   MR2  MR1      //
120                         W2 +=========== trestle (y −4) ===============+ W3
140                 GBL1   //            ~~~~ LAVA LAKE (y −10) ~~~~
150                      //                         GBL2
160  W0 ===Tunnel 1=== W1          (P3)                       (P4)
     x10   R1 ledge   x90        x190                        x245
```

| Id | Shape | Size / r,h | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S3-RL1 | box | 80 × 0.5 × 2 | (50, −0.25, 160) | metal | Rail, leg W0–W1 |
| S3-RL2 | ramp | 2 × 4 × 72 (yaw 124°) | (120, −2, 140) | metal | Rail ramp, leg W1–W2 |
| S3-RL3 | box | 100 × 0.5 × 3 | (200, −4.25, 120) | metal | Trestle deck, leg W2–W3 |
| S3-RL4 | box | 3 × 0.5 × 71 (yaw 135°) | (275, −4.25, 95) | metal | Trestle deck, leg W3–W4 |
| S3-RL5 | ramp | 2 × 4 × 60 (yaw 180°) | (300, −2, 40) | metal | Rail ramp, leg W4–W5 |
| S3-RL6 | box | 57 × 0.5 × 2 | (271.5, −0.25, 10) | metal | Rail, leg W5–W6 |
| S3-TR-L1…8 | cyl | r 0.5, h 6 | every 20 m under S3-RL3 and S3-RL4, base y −10 | metal | Trestle legs |
| S3-T1 | box shell | tunnel 80 × 5 × 6 | x 10 to 90, z 157 to 163 | rock | Tunnel 1 (floor, two walls, ceiling: 4 boxes) |
| S3-R1L | box | 14 × 1.5 × 4 | (27, 0.75, 155) | rock | Side ledge in Tunnel 1, top y 1.5, with two `uw.crateStack` (squad R1) |
| **B1**, **B2** | box | 6 × 0.5 × 0.5 | (55, 2.45, 160), (70, 2.45, 160) | neon (red) | Overhead bars at d 45 and d 60. Crouch or take 15 damage |
| S3-V1 | opening | 2 × 2 | (80, 5, 160) | — | Ceiling vent (squad R2) |
| S3-LAVA | box | 190 × 1 × 130 | (215, −10.5, 105) | lava | Lava lake, surface y −10. Kill volume |
| S3-CAV | box ×5 | walls 20 high, ceiling y 18 | around x 120 to 310, z 40 to 170 | rock | Cavern shell: four walls and a ceiling slab 190 × 1 × 130 at (215, 18.5, 105) |
| **P1…P4** | cyl | r 2.5, h 14 | (170, −10, 75), (215, −10, 68), (190, −10, 160), (245, −10, 165) | rock | Rock pillars, tops at y 4: Audit Sniper perches, 40 to 52 m from the track |
| S3-PB | box | 20 × 1 × 8 | (225, −4.5, 107) | metal | Pump barge, top y −4, 9 m north of the track (squad R6). Three `uw.crateStack` on it |
| BR-R1…4 | barrel fire | — | (218, −4, 105), (223, −4, 109), (229, −4, 105), (233, −4, 109) | — | On the barge |
| **GL-R**, **GV-R** | `uw.pipe`, `uw.valve` | 24 × 0.6 × 0.6 | (225, −3.4, 111.5); valve (213, −3, 111.5) | metal | Gas main along the barge's near edge. Burst it and all four barrels go |
| S3-SPUR | ramp | 2 × 6 × 28 (yaw 123°) | (263.5, −1, 87.5) | metal | Ore spur from a rock shelf at (252, 2, 80) down to the rail at (275, −4, 95) |
| **OC-R** | `uw.oreCart` | — | (252, 2.5, 80) | — | Ore cart with a brake target (30 HP), visible from d 240 to d 262 |
| **B3** | box, destructible | 3 × 2 × 1.5 | (277, −3, 93) | crate | Barricade on the rail at d 290, 200 HP. Hit by OC-R: destroyed. Hit by the player's cart: 30 damage to the player and the cart slows to 3 m/s for 4 s |
| **MR1…MR3** | proximity mine | — | (263, −4, 107), (270, −4, 100), (287.5, −4, 82.5) | — | On the rail at d 270, d 280, d 305. 30 damage each if the cart runs over one |
| S3-GATE | door slab | 6 × 5 × 0.6 | (300, −1.5, 68) | metal | Brake Gate across the rail |
| **LK1**, **LK2** | destructible target | box 0.8 | (296, 1, 68.5), (304, 1, 68.5) | neon | Gate locks, 150 HP each. Both shot: the gate opens at once (not before 3 s); otherwise it opens after 8 s |
| S3-GG | box | 12 × 0.5 × 3 | (300, 2.25, 66) | metal | Gantry over the gate (Rocket Obamas of R8) |
| S3-GP | box | 8 × 0.5 × 10 | (294, −4.25, 75) | metal | Side platform at cart level; door at its west end (Midgets and Boom Midgets of R8) |
| BR-R5, BR-R6 | barrel fire, shock | — | (293, −4, 72), (295, −4, 78) | — | On the side platform |
| S3-T2 | box shell | tunnel 6 × 5 × 56 | x 297 to 303, z 10 to 66 | rock | Tunnel 2, north leg |
| S3-T3 | box shell | tunnel 57 × 5 × 6 | x 243 to 300, z 7 to 13 | rock | Tunnel 2, west leg into Station B |
| **GBL1…3** | target (lamp) | sphere r 0.4 | (112, 6, 140), (235, 8, 150), (288, 3.5, 7.5) | gold | Golden Bonk lamps (§12.6) |
| S3-CART | `uw.rideCart` | deck 3 × 0.8 × 5 | on the path | metal | The ride cart. Carries rack `WR2` (sniper), 2 sniper boxes and a fire barrel in a clamp at the back |

**Mechanisms:** `railCart`; lava `killZone` with rescue to the cart; overhead bars; ore cart and spur;
3 mines; gas main; destructible barricade and gate locks; 3 lamp targets.
**Transition out:** the cart stops at Station B (W6), which is the west end of S4. S4 preloads at d 323.

### 6.4 S4 Furnace Gallery  ·  **[L2]** lockdown room

Footprint 156 × 112 m. Station B, the **Slag Straight** (60 × 8 m walkway between two lava
channels), a junction room, the slug bridge, the **Tapping Floor** (the lockdown, 60 × 44 m,
x 70 to 130, z 64 to 108, floor sunk to y −3, ceiling y 6, a catwalk and an entry landing above the
floor) and the Lift Lobby with Depot 2.

```
 z  x0     22 24                                             84 85      97
40  +-------+ +~~~~~~~~~~~~ lava channel ~~[alc]~~~~~~[alc]~~~+ +--------+
44  |Station| |  (P)        (P)   SLAG STRAIGHT   (P)     (P) TD junction|== crawl pipe (Mana Battery)
48  | B  C6 = =  E6: Mini Tinubu intro, then the pair         = | overshld|
52  |       | +~~~~~~[alc]~~~~~~~~~~~~~[alc]~~~~~~~~~~~~~~~~~~+ +--+  +--+
56  +-------+                                                      |C7| slug bridge (7A)
64      x70 +------------------[BD2]-------[SP-CAT]-----------------------------+ x130
68          | crates   OC2 ====\  landing y0 |catwalk|  GV2                     |
74   [SP-W] | G                 \___ramp_____| y1.5  |   |      +---cage---+    |
80          | ladle   OC1 ======\____________|__BF2__|   | CP2  | W1 mob   [SP-CAGE]
86          |  G       G         \___________|_______|BF1[CG]   | 8 midget |    |
92          | ladle   OC3 ======\            |       |   | GL2  +----------+    |
98          |  G                 \___________|__BF3__|   |              [BD2x]==+==ramp==[D2 Lift Lobby C8][lift]
104         | rack          ladle            |stairs |  ~~~~ slag channel ~~~~~ |
108         +----------------------[SP-SLAG]-+-------+--------------------------+
                                    FW2 > AF3
```

| Id | Shape | Size / r,h | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S4-FL | box | 156 × 1 × 64 | (78, −0.5, 32) | rock | Floor slab for the north half (y 0) |
| S4-STB | box shell | room 22 × 6 × 16 | x 0 to 22, z 40 to 56 | rock | Station B. The rail enters through the north wall. Checkpoint C6 at (12, 0, 48) |
| S4-SS-WALK | box | 60 × 1 × 8 | (54, −0.5, 48) | metal | Slag Straight walkway, x 24 to 84, z 44 to 52 (overlays the floor slab) |
| S4-SS-LN, S4-SS-LS | box | 60 × 0.5 × 2 | (54, −0.75, 43), (54, −0.75, 53) | lava | Lava channels each side, surface y −0.5; the floor slab is cut 1 m deep under them |
| S4-SS-N, S4-SS-S | box | 60 × 5 × 1 | (54, 2.5, 41.5), (54, 2.5, 54.5) | rock | Straight walls |
| S4-SS-CL | box | 62 × 1 × 14 | (54, 5.5, 48) | rock | Ceiling at y 5 |
| S4-ALC1…4 | box | 4 × 0.5 × 2 | (36, −0.25, 43), (60, −0.25, 43), (48, −0.25, 53), (72, −0.25, 53) | metal | Dodge alcoves: grates over the channels |
| **S4-P1…4** | cyl `chargeStop` | r 0.8, h 5 | (34, 0, 48), (50, 0, 48), (66, 0, 48), (80, 0, 48) | pillar | Pillars a charging Mini Tinubu stuns itself on |
| BR-S1, BR-S2 | barrel goo | — | (42, 0, 46), (58, 0, 50) | — | Slow the pair |
| BR-S3, BR-S4, BR-S5 | barrel fire, fire, shock | — | (52, 0, 45), (70, 0, 51), (76, 0, 46) | — | |
| **TD** | door slab | 0.6 × 4 × 4 | (84.5, 2, 48) | metal | Mini Tinubu door; also the way on. Opens at `onEnter` V6 |
| S4-J | box shell | room 12 × 5 × 14 | x 85 to 97, z 42 to 56 | rock | Junction room. Overshield at (91, 0, 45) |
| S4-PIPE | box shell | tunnel 8 × 2.6 × 2.4 | x 97 to 105, z 53 to 55.4 | metal | Crawl pipe. Entrance hidden by three goo barrels at (96.3, 0, 54.2). **Mana Battery** at (104, 0.5, 54.2) |
| S4-SB | box shell | corridor 4 × 4 × 8 | x 89 to 93, z 56 to 64 | rock | Slug bridge corridor |
| S4-SB-L | box | 4 × 0.5 × 3 | (91, −0.75, 59.5) | lava | Channel under the grate bridge (grate: box 4 × 0.5 × 3 at (91, −0.25, 59.5), metal) |
| **BD2** | blast door slab | 4 × 4 × 0.6 | (91, 2, 63.7) | metal, neon trim | Lockdown entry door. Checkpoint C7 at (91, 0, 57) |
| S4-TF-FL | box | 60 × 1 × 44 | (100, −3.5, 86) | rock | Tapping Floor floor at y −3 |
| S4-TF-N, S4-TF-S | box | 60 × 9 × 1 | (100, 1.5, 63.5), (100, 1.5, 108.5) | rock | North and south walls (openings: BD2, SP-CAT, SP-SLAG) |
| S4-TF-W, S4-TF-E | box | 1 × 9 × 44 | (69.5, 1.5, 86), (130.5, 1.5, 86) | rock | West and east walls (openings: SP-W, SP-CAGE, BD2x) |
| S4-TF-CL | box | 62 × 1 × 46 | (100, 6.5, 86) | rock | Ceiling at y 6 |
| S4-LAND | box | 12 × 3 × 4 | (91, −1.5, 66) | metal | Entry landing, top y 0, x 85 to 97: the set-up position, inside the door and before the threshold |
| S4-LRAMP | ramp | 4 × 3 × 6 | (91, −1.5, 71) | metal | Landing down to the floor, descending south |
| S4-THR | disc line | r 0.3 ×8 | z 70, x 89 to 93 | neon | Threshold, 6 m inside |
| S4-OC1R, OC2R, OC3R | ramp | 20 × 4 × 2 | (82, −1, 86), (82, −1, 74), (82, −1, 98) | metal | Ore rails from y 1 at the west wall down to the floor at x 92 |
| **OC1, OC2, OC3** | `uw.oreCart` | — | (73, 1.5, 86), (73, 1.5, 74), (73, 1.5, 98) | — | Ore carts. Brake targets face the landing |
| **BF1, BF2, BF3** | box | 1 × 1.5 × 2 | (106.5, −2.25, 86), (100.5, −2.25, 74), (100.5, −2.25, 98) | metal | Buffers: where each cart explodes (6 m, 150 to enemies). BF1 is 5 m from the cage door; BF2 and BF3 are under the catwalk |
| S4-CW | box | 4 × 0.5 × 40 | (100, 1.25, 84) | metal | Catwalk deck, top y 1.5, z 64 to 104. Two halves: north of z 86 falls with BF2, south with BF3 |
| S4-CW-P1…4 | cyl | r 0.3, h 4.5 | (99, −3, 72), (101, −3, 80), (99, −3, 92), (101, −3, 100) | metal | Catwalk posts (clear of the OC1 rail at z 86) |
| S4-CW-ST | stairs | 2 × 4.5 × 8 | (104, −0.75, 100) | metal | Player stairs up to the catwalk, rising north |
| S4-CAGE-N, -S | box | 16 × 4 × 0.5 | (120, −1, 78.25), (120, −1, 93.75) | glass | Cage grille, see-through, stops bullets |
| S4-CAGE-W1, -W2 | box | 0.5 × 4 × 6 | (112.25, −1, 81), (112.25, −1, 91) | glass | Cage west grille either side of the door |
| **CG** | door slab | 0.5 × 4 × 4 | (112.25, −1, 86) | metal | Cage door. Opens when the lockdown starts |
| **CP2** | charge point | — | (111, −2.5, 86) | neon | On the cage door frame |
| CH2 | charge pack | — | (94, 0, 66) | — | On the landing |
| **GL2**, **GV2** | `uw.pipe`, `uw.valve` | 0.6 × 0.6 × 32 | (108, −2.4, 86); valve (108, −1.8, 70) | metal | Gas line z 70 to 102. Valve shot: a 6 s fire wall 4 m west of the cage |
| BR-T1…3 | barrel fire | — | (86, 0, 65), (87.5, 0, 65), (96, 0, 65) | — | On the landing, to Yoink and place |
| BR-T4, BR-T5 | barrel shock | — | (102, −3, 76), (102, −3, 96) | — | Beside BF2 and BF3 |
| BR-T6, BR-T7 | barrel goo | — | (109, −3, 83), (109, −3, 89) | — | Either side of the cage door, inside the GL2 fire wall |
| S4-LD1…4 | `uw.ladle` | — | (80, −3, 80), (80, −3, 92), (92, −3, 104), (116, −3, 100) | — | Slag ladles: full cover |
| S4-CR1…4 | `uw.crateStack` | — | (76, −3, 68), (88, −3, 80), (94, −3, 92), (120, −3, 72) | — | Cover |
| S4-MR1, MR2 | `uw.miningRack` | — | (124, −3, 100), (74, −3, 104) | — | Cover |
| S4-SLAG | box | 24 × 0.5 × 3 | (116, −3.25, 106.5) | lava | Slag channel along the south wall, x 104 to 128 |
| **SP-CAGE** | door slab | 0.6 × 4 × 4 | (130.5, −1, 86) | metal | Spawn point east: back door of the cage |
| **SP-CAT** | door slab | 2.2 × 2.6 × 0.6 | (100, 2.8, 63.5) | metal | Spawn point north: catwalk door |
| **SP-SLAG** | opening | 4 × 3 | (100, −1.5, 108.5) | — | Spawn point south: slag tunnel mouth |
| **SP-W** | door slab | 0.6 × 4 × 3 | (69.5, −1, 80) | metal | Spawn point west |
| **SP-GR** (G13…G16) | `uw.grate` | — | (76, −3, 74), (76, −3, 98), (86, −3, 92), (92, −3, 78) | — | Spawn points: floor grates |
| FW2 | box `fragileWall` | 1 × 3 × 3 | (102.5, −1.5, 110.5) | concrete | In the slag tunnel (x 98 to 102, z 108 to 112). Behind it: Audit File 3 |
| **BD2x** | blast door slab | 0.6 × 4 × 4 | (130.5, −1, 102) | metal, neon trim | Lockdown exit door |
| S4-XR | ramp | 6 × 3 × 4 | (134, −1.5, 102) | metal | Up to the lobby, rising east |
| S4-LOB | box shell | room 19 × 5 × 18 | x 137 to 156, z 92 to 110 | rock | Lift Lobby (floor y 0) |
| **D2 depot** | `depot` | — | (144, 0, 96) | — | Depot crate, health station, loadout bench, shop terminal, checkpoint C8 |
| **FL** | mover (lift) | 5 × 0.5 × 5 | (151, 0, 103) → (151, −12, 103) | metal | Freight lift, 15 s, `onTrigger`. Hides the S5 load |

**Mechanisms:** `lockdown` L2 (entry BD2, exit BD2x, encounter E7); 3 ore carts; gas line GL2;
charge pack and point; cage door; lava channels (25 dps and burn); `chargeStop` pillars;
`fragileWall` FW2; depot; lift.
**Lockdown rewards:** chest `LC2` at (126, −3, 102), ammo crate `AC2` at (126, −3, 105), health pack
at (124, −3, 103); the checkpoint that saves is C8 at the depot, 20 m past the exit door.
**Transition out:** the freight lift goes down 12 m into the S5 vestibule.

### 6.5 S5 Reactor Ring  ·  **[L3]** lockdown room

Footprint 90 × 104 m. A round hall, **outer radius 40 m (80 × 80 m)**, centre C = (45, 0, 45),
domed at y 16, with an octagonal gantry at y 4 (second height level) and a lift vestibule to the
south. Three reactors stand at r 26, four bumper pylons with coolant tanks above them at r 15,
three ore seams in the wall at r 39.5. The core column is the vista: a glowing cylinder with a
Tinubu face.

```
 z                         OS2 (ore seam N)                 x45
 5                   ..-----[====]-----..
12              .-'   GR-N    RC2 (gantry)  '-.   [ED] emergency door (NE)
19   [SP-NW] .'            ( R1 )               '.
30          /     CT4/PY4          CT1/PY1        \
38         |  rack        .-~~~~-.          rack   |
45    OS3 [|  GR-W       ( CORE   )  moat r10  GR-E |] OS1
52         |  rack        '-~~~~-'          rack   |
58          \  ( R3 ) CT3/PY3      CT2/PY2  ( R2 ) /
66           '.          GV3 on the ring main     .'
73   [SP-SW]   '-.   gantry y4 (octagon r33)   .-'  [SP-SE]
80                ''--.. CD  WC1 RC1 ..--''
85                      +--[BD3]--+
96                      |   C9    |  vestibule, lift from S4
104                     +---------+
```

| Id | Shape | Size / r,h | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S5-FL | cyl | r 40, h 1 | (45, −1, 45) | metal | Ring floor, top y 0 |
| S5-WALL1…16 | box | 16 × 16 × 1 | on a circle r 40.5 round C, every 22.5°, yaw to face C | rock | Outer wall. The pieces at 45° (NE), 135° (SE), 225° (SW), 315° (NW) and 180° (S) hold doors |
| S5-CL | cyl | r 41, h 1 | (45, 16, 45) | rock | Ceiling slab |
| S5-CORE | cyl | r 4, h 16 | (45, 0, 45) | neon | Core column |
| S5-MOAT | disc + `hazardZone(lava)` | r 10 (grows to r 14 in part 3) | (45, 0.05, 45) | lava | Lava moat round the core: 25 dps and burn |
| **R1, R2, R3** | `uw.reactor` | r 3, h 8 | (45, 0, 19), (67.5, 0, 58), (22.5, 0, 58) | metal, neon | Reactors (destructible, see E8). Each has a switch `RS1…3` on its outer side and a charge point `RC1…3` on its inner side |
| **GM1…6** | `uw.pipe` | 26 × 0.6 × 0.6 | hexagon r 26 round C; vertices (45, 19), (67.5, 32), (67.5, 58), (45, 71), (22.5, 58), (22.5, 32), y 0.6 | metal | Gas ring main through all three reactors. Shot anywhere, it bursts along its whole length |
| **GV3** | `uw.valve` | — | (45, 1.2, 71) | neon | Ring-main valve: a 6 s jet along segment GM3–GM4 only |
| **PY1…PY4** | cyl `chargeStop` | r 1, h 6 | (55.6, 0, 34.4), (55.6, 0, 55.6), (34.4, 0, 55.6), (34.4, 0, 34.4) | pillar | Bumper pylons. The Foreman's charge stops on them. Charge points `PC1…4` at each base |
| S5-DISC1…4 | disc | r 4 | under each pylon, y 0.05 | neon | Drop marks for the coolant tanks |
| **CT1…CT4** | `uw.coolantTank` | r 2, h 4 | above PY1…PY4, base y 9 | ice | Coolant tanks on ceiling struts. Two clamp targets each (`CL1a`…`CL4b`, 120 HP, at y 13) or one charge point on the strut at gantry height |
| S5-GAN1…8 | box | 27 × 0.5 × 3 | on a circle r 33 round C, every 45°, y 3.75, yaw to face C | metal | Gantry octagon, top y 4. Segment 1 (north) falls in part 3 |
| S5-GAN-P | cyl ×16 | r 0.3, h 3.5 | two under each gantry segment | metal | Gantry posts |
| S5-GR1, GR2 | ramp | 3 × 4 × 8 | (66, 2, 70), (24, 2, 70) | metal | Ramps up to the gantry, south-east and south-west |
| **OS1, OS2, OS3** | `uw.oreSeam` | 6 × 5 × 2 | (84.5, 0, 45), (45, 0, 5.5), (5.5, 0, 45) | gold, rock | Ore seams in the wall (destructible, 600 HP, `fragile`). Charge points `SC1…3` on the floor in front |
| **CD1, CD2** | `uw.chargeDispenser` | — | (45, 0, 80), (20, 0, 30) | neon | Charge pack dispensers. One pack each, a new one 8 s after the last was taken |
| BC1…BC4 | barrel chute | — | (59.5, 0, 9.9), (80.1, 0, 59.5), (30.5, 0, 80.1), (9.9, 0, 30.5) | — | During F1 each drops one barrel every 15 s, in the order fire, shock, goo. At most 6 loose barrels |
| BR-K1…3 | barrel fire | — | (40, 0, 24), (72, 0, 52), (18, 0, 52) | — | One beside each reactor (E8) |
| BR-K4…6 | barrel shock | — | (52, 0, 26), (62, 0, 64), (28, 0, 64) | — | |
| BR-K7, BR-K8 | barrel goo | — | (45, 0, 60), (45, 0, 30) | — | |
| S5-MR1…6 | `uw.miningRack` | — | (60, 0, 71), (30, 0, 71), (75, 0, 38), (15, 0, 38), (60, 0, 16), (30, 0, 16) | — | Cover at r 30 |
| S5-CR1…4 | `uw.crateStack` | — | (70, 0, 45), (20, 0, 45), (45, 0, 66), (52, 0, 12) | — | Cover |
| **SP-SE, SP-SW, SP-NW** | door slab | 4 × 4 × 0.6 | (73.3, 2, 73.3), (16.7, 2, 73.3), (16.7, 2, 16.7) | metal | Spawn points: three service doors |
| **GR-N, GR-E, GR-S, GR-W** | `uw.grate` | — | (45, 0, 13), (77, 0, 45), (45, 0, 77), (13, 0, 45) | — | Spawn points: floor grates |
| **SP-PIT** | marker | — | (45, 0, 34), (45, 0, 56) | — | Spawn points: moat edge (Magma Slugs crawl out of the lava) |
| **BD3** | blast door slab | 4 × 4 × 0.6 | (45, 2, 85) | metal, neon trim | Entry from the vestibule. Open during E8; drops when F1 starts |
| **ED** | blast door slab | 4 × 4 × 0.6 (yaw 45°) | (73.3, 2, 16.7) | metal, neon trim | Emergency door, the L3 exit. Opens when The Foreman dies |
| S5-VEST | box shell | room 16 × 5 × 19 | x 37 to 53, z 85 to 104 | rock | Vestibule. The lift lands at (45, 0, 100). Checkpoint C9 at (45, 0, 96) |

**Mechanisms:** `lockdown` L3 (entry BD3, exit ED, encounter F1); 3 reactors, 3 ore seams, 4 tanks
with 8 clamps (`target`); 14 charge points; 2 dispensers; ring main; 4 barrel chutes; lava moat;
`chargeStop` pylons; bazooka cache `WC1` at (40, 0, 82), Rocket Crates `RC1` at (50, 0, 82) and
`RC2` at (45, 4, 12).
**Lockdown rewards** (at ED when it opens): The Foreman's two guns, ammo crate `AC3` at
(70, 0, 20), Turbo at (72, 0, 18), checkpoint C10.
**Transition out:** cutscene card "MELTDOWN", then S6 starts in the emergency tunnel.

### 6.6 S6 Meltdown Escape

Footprint 145 × 190 m, climbing 44 m. `d` is distance along the route. The lava is one
`risingHazard` whose surface is `y = −6 + 0.36 × t` (t in seconds from the start of the escape).

| Leg | d (m) | From → to (x, y, z) | Space |
|---|---|---|---|
| A Emergency tunnel | 0 to 70 | (0, 0, 14) → (70, 6, 14) | 5 m wide, 4 m high, ramp east |
| B Catwalk hall | 70 to 130 | (70, 6, 14) → (130, 12, 14) | Hall 60 × 24 × 16, lava below. A 3 m wide catwalk of ten 6 m planks that fall 1 s after they are stepped on |
| C Crusher gallery | 130 to 200 | (133, 12, 14) → (133, 20, 84) | 6 m wide, ramp south. Three stalled crushers that restart as the player nears |
| D Spiral shaft | 200 to 270 | round (133, ·, 96), y 20 → 28 | 20 × 20 m shaft, four ramp flights of 17.5 m |
| E Ore incline | 270 to 340 | (123, 28, 106) → (53, 36, 106) | 6 m wide ramp west with three pairs of alcoves |
| F Last tunnel | 340 to 420 | (50, 36, 109) → (50, 44, 189) | 5 m wide ramp south to the surface door |

```
 z   x0                    70                         130  133
 14  C10 ==A tunnel=(riot)==+== B collapsing catwalk ===+
 34                                                     |[CRa]
 52        lava rises under everything                  |[CRb]   C crusher gallery
 58                                             FW3 =|  |
 70                                                  |__|[CRc]
 96                                             +--D spiral--+  (Tosser on the top grate)
106        +<<<<<<<< E ore incline (carts roll down) <<<<<<<<+
109        |
130        | GL3 gas line          F last tunnel
189        +==[SURFACE DOOR]==  exit, y 44
          x50
```

| Id | Shape | Size / r,h | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S6-A | ramp | 70 × 6 × 5 | (35, 3, 14) | rock | Tunnel A floor, rising east. Walls and ceiling: 3 boxes 70 long |
| S6-A-D | door slab | 3 × 3 × 0.6 | (30, 4.1, 11.2) | metal | Side door at d 30 (blocker group 1) |
| S6-B-HALL | box shell | hall 60 × 16 × 24 | x 70 to 130, z 2 to 26, y 0 to 16 | rock | Catwalk hall. No floor: the lava is under it |
| **S6-B-PL1…10** | `ropeBridge` planks | 6 × 0.5 × 3 each | from (73, 6.3, 14) to (127, 11.7, 14), stepping 0.6 up per plank | metal | Collapsing catwalk. Each plank shakes 1 s then falls. Plank 5 and plank 8 carry mines |
| MC1, MC2 | proximity mine | — | (100, 9.3, 14), (118, 11.1, 14) | — | On planks 5 and 8 |
| S6-C | ramp | 6 × 8 × 70 | (133, 16, 49) | metal | Crusher gallery floor, rising south. Walls and ceiling 5 m above the ramp |
| **CRa, CRb, CRc** | `uw.crusher` | head 6 × 2 × 4 | (133, 14.3, 34), (133, 16.3, 52), (133, 18.4, 70) | metal | Stalled. Each restarts 1.5 s after the player comes within 10 m (period 3 s). Goo jams one for 4 s |
| S6-C-D | door slab | 0.6 × 3 × 3 | (136.3, 16.5, 40) | metal | Side door at d 156 (blocker group 4) |
| S6-BY | box shell | passage 3 × 3 × 24 | x 126 to 129, z 58 to 82, floor following the ramp | rock | Bypass round CRc |
| **FW3** | box `fragileWall` | 3 × 3 × 1 | (127.5, 18.5, 58.5) | concrete | Blocks the bypass. Charge pack `CH3` at (131, 16.6, 54), rockets box beside it. Bazooka, Meteor Bonk or the pack opens it |
| S6-D-SHAFT | box shell | shaft 20 × 12 × 20 | x 123 to 143, z 86 to 106, y 18 to 30 | rock | Spiral shaft |
| S6-D-R1…4 | ramp | 17.5 × 2 × 4 | east side, south side, west side, north side of the shaft, each rising 2 m | metal | Four flights, anticlockwise from (141, 20, 88) to (125, 28, 104) |
| S6-D-GRATE | box, destructible | 4 × 0.5 × 4 | (133, 27.75, 96) | metal | Grate bridge in the shaft centre, 60 HP. The Tosser stands on it |
| S6-E | ramp | 70 × 8 × 6 | (88, 32, 106) | metal | Ore incline, rising west, with a rail down its centre |
| S6-E-AL1…6 | box | 3 × 0.5 × 3 | north and south of the ramp at x 105, 85, 65 | metal | Alcoves: step out of the way of a cart or a charge |
| **OCa, OCb** | `uw.oreCart` | — | (56, 36.5, 106), (58, 36.5, 106) | — | Released at the player on a schedule (below). Shooting a rolling cart's brake stops it; shooting its ore detonates it early |
| S6-F | ramp | 5 × 8 × 80 | (50, 40, 149) | rock | Last tunnel floor, rising south |
| **GL3**, **GV3b** | `uw.pipe`, `uw.valve` | 0.6 × 0.6 × 30 | (47.8, 39.5, 145); valve (47.8, 38.6, 128) | metal | Gas line along the west wall, z 130 to 160: the answer to blocker group 7 |
| S6-F-D | door slab | 0.6 × 3 × 3 | (47.2, 41.6, 150) | metal | Side door at d 381 |
| **S6-EXIT** | blast door slab | 5 × 4 × 0.6 | (50, 46, 189) | metal, neon trim | Surface door. Open. Crossing it ends the level |
| BR-X1 | barrel shock | — | (28, 2.4, 15.5) | — | Opposite the side door at d 30 |
| BR-X2, BR-X3 | barrel fire | — | (59, 5.1, 12.5), (61, 5.2, 15.5) | — | Beside the Riot pair at d 60 |
| BR-X4 | barrel fire | — | (133, 13.9, 30) | — | Before CRa |
| BR-X5 | barrel shock | — | (139, 20, 88) | — | Foot of the spiral |
| BR-X6 | barrel fire | — | (85, 32.4, 103) | — | Middle alcove pair |
| BR-X7, BR-X8 | barrel fire | — | (49, 39.6, 138), (51, 40.2, 152) | — | In the last tunnel, on the gas line |
| S6-TURBO | power-up | — | (2, 0, 14) | — | Turbo, at the start |

**Mechanisms:** `risingHazard`; collapsing bridge (10 planks); 3 crushers; `fragileWall` FW3; 2 ore
carts; gas line GL3; 2 mines; destructible grate.
**Transition out:** the surface door. End card.

