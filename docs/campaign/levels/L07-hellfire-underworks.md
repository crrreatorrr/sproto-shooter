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
| Par | 20 min (budget below sums to 21 min 16 s) |
| Jetpack | No. Ceilings are 3 to 10 m. Double jump stays |
| Enemy total | 200, plus The Foreman (99 on foot, 46 on the rail ride, 33 mini-boss adds, 22 escape blockers) |
| Route length | 1,520 m (1,080 m on foot, 440 m by cart) |
| Sections | 6: S1 Intake Shafts, S2 Sorting Hall, S3 Mine Cart Run, S4 Furnace Gallery, S5 Reactor Ring, S6 Meltdown Escape |
| Finale | Mini-boss **Mole Monster "The Foreman"** in 3 parts (185 s), then the **meltdown escape** (120 s) |
| Checkpoints, depots | 10 checkpoints, 2 depots |
| Golden Bonk | Lights Out |

## 2. Concept

The player's job is to blow the foundry up. Every room is full of things that explode, and the
level asks the player to look first and shoot second. Three encounters are **set-up fights**: the
enemies are visible and idle, the player arranges barrels, opens a valve or plants a charge, and
then starts the fight with one shot. The other encounters each make one explosive the right answer.

How it differs from the other levels: L06 gave the player a bazooka and big targets in the open.
L07 takes the sky away. Rooms are tight and dark, the enemies carry explosives too (Boom Midgets,
Bomb Tossers, Mole Miners with mines, Magma Slugs that burst), and the player's best weapon is the
room itself. Yoink turns every barrel, mine, charge and thrown bomb into ammunition.

| Explosive (PLAN §7) | The encounter it answers |
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
| Guns expected | Carried from L06: machine gun, bazooka, usually a shotgun or sniper. World guns here: shotgun (S1), sniper (on the cart, S3), bazooka cache (S5), Lob-o-Matic rack (S4, only if COOP_PLAN §6.3b has landed) |
| Spells held at the start | Goo Bolt, Chain Zap, Yeet, Sproto Swarm, Mana Shield, Decoy, Meteor Bonk, Magic Carpet, Pump It, Vape Cloud |
| New spell | **Yoink**, from the shrine in the spawn room of S1 (`S1-SHR`, 6 m from the spawn). 15 mana, 2 s cooldown, 18 m |
| Suggested quick slots | Yoink, Goo Bolt, Chain Zap, Yeet |

**The three Yoink uses, each taught once and tested twice**

| # | Use | Taught | Tested | Twist |
|---|---|---|---|---|
| Y1 | **Fetch and throw explosives**: grab a barrel, charge pack or mine that is out of reach and throw it | B0 Yoink range (barrels on a shelf behind a grille, thrown at a cracked wall) | E2 (pull a mine out of the corridor and throw it over the barricade), E3 (shock barrel off the far shelf) | E8: throw a charge pack onto a charge point from 18 m instead of carrying it through the fight |
| Y2 | **Catch a Bomb Tosser's bomb** and throw it back | E1 squad 1C (one Tosser alone on a gantry behind a low wall; guns cannot reach its satchel from the floor) | E3 (two Tossers), E5 (bombs land on the cart) | F2: an elite Tosser drops bombs down a shaft; the caught bomb opens the grate it stands on |
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
| E1 | Powder Store | S1 | (9 midget × 3 + 2 obama × 6 + 1 tosser × 8 + 3 boom × 3) = 56 × 1.3 | 73 | 1:53 |
| E2 | The Grates | S1 | (10 sewer × 3 + 2 boom × 3 + 1 moleMiner × 10 + 2 obama × 6) = 58 × 1.3 | 75 | 3:08 |
| T2 | Connector to the hall | S1→S2 | 40 m ÷ 5.5 | 7 | 3:15 |
| E3 | Sorting Hall, **set-up fight 1** | S2 | set-up 25 + (10 midget × 3 + 1 riot × 8 + 3 laser × 6 + 2 tosser × 8 + 2 boom × 3 + 3 sewer × 3) = 87 × 1.3 = 113 | 138 | 5:33 |
| E4 | Crusher Line | S2 | (2 laser × 6 + 6 midget × 3 + 1 riot × 8 + 3 boom × 3 + 1 rig × 15) = 62 × 1.3 | 81 | 6:54 |
| T3 | Walk to the cart station | S2 | 20 m ÷ 5.5 | 4 | 6:58 |
| D1 | Depot 1, Cart Station (breather) | S2 | stated | 45 | 7:43 |
| E5 | Mine Cart Run (ride) | S3 | 440 m ÷ 5.5 m/s = 80, + 8 at the Brake Gate | 88 | 9:11 |
| T4 | Platform to the straight | S4 | 30 m ÷ 5.5 | 5 | 9:16 |
| E6 | Slag Straight | S4 | (3 miniTinubu × 14 + 4 midget × 3 + 2 boom × 3) = 60 × 1.3 | 78 | 10:34 |
| T5 | Junction and slug bridge | S4 | 25 m ÷ 5.5 | 5 | 10:39 |
| E7 | Tapping Floor, **set-up fight 2** | S4 | set-up 25 + (3 slug × 10 + 6 midget × 3 + 1 elite riot × 16 + 2 laser × 6 + 1 tosser × 8) = 84 × 1.3 = 109 | 134 | 12:53 |
| T6 | Walk to the lift lobby | S4 | 35 m ÷ 5.5 | 6 | 12:59 |
| D2 | Depot 2, Lift Lobby (breather) | S4 | stated | 45 | 13:44 |
| T7 | Freight lift, walk to the ring | S4→S5 | lift 15 + 20 m ÷ 5.5 | 19 | 14:03 |
| E8 | Overload, **set-up fight 3** | S5 | set-up 25 + (2 laser × 6 + 3 midget × 3 + 3 sewer × 3 + 1 moleMiner × 10 + 3 boom × 3 + 1 bigObama × 30) = 79 × 1.3 = 103 | 128 | 16:11 |
| F1 | Mini-boss: The Foreman, 3 parts | S5 | 65 + 70 + 50 (PLAN §3 allows 150 to 210) | 185 | 19:16 |
| F2 | Meltdown Escape | S6 | 420 m ÷ 5.5 = 76, + 44 for seven blocker groups | 120 | 21:16 |
| | **Total** | | | **1,276 s** | **21 min 16 s** |

Par 20 min; the sum is inside the ±2 minute band. A fast replay (70%) is about 15 minutes.
Beat count: 8 combat encounters (E1 to E8, the ride is E5), 1 mechanism beat, 2 breathers, a
two-stage finale; 13 beats.

**Intensity** (0 to 1, for the "no two above 0.8 in a row" rule): E1 0.4, E2 0.6, E3 0.85, E4 0.65,
D1 0, E5 0.75, E6 0.6, E7 0.85, D2 0, E8 0.75, F1 1.0, card and checkpoint, F2 0.9.

## 5. Overview map

North is up. One character is about 12 m. `C1`…`C10` are checkpoints, `D1` `D2` depots.

```
                          S3 MINE CART RUN (rail, 440 m)
   Station B  <====== Tunnel 2 ======+
   C6 |                              ‖  Brake Gate (323 m)
      v                              ‖
  S4 FURNACE GALLERY            +====+========= trestle over the LAVA LAKE =====+
  [platform]-[E6 Slag Straight]-+                                                \\
                 C7             |                                                 \\ ramp down
                          [slug bridge]                                            \\
                          [E7 TAPPING FLOOR]--[D2 Lift Lobby C8]                    ‖ Tunnel 1
                                                   | freight lift (down)            ‖
                                                   v                                ‖
                                        S5 REACTOR RING                             ‖
                                        ( E8 Overload  C9 )                         ‖
                                        ( F1 The Foreman  )                         ‖
                                                   | emergency tunnel  C10          ‖
                                                   v                                ‖
              S6 MELTDOWN ESCAPE: tunnel > catwalks > crushers > spiral > incline > surface

  S1 INTAKE SHAFTS                    S2 SORTING HALL
  [spawn C1 + Yoink shrine]-[range]-[E1 Powder Store C2]-[E2 The Grates]
                                                             | north arm (mines)
                                                             +--C3--[booth]-[E3 SORTING HALL C4]-[E4 Crusher Line]-[D1 Cart Station C5]==> rail
```

Route order: S1 → S2 → S3 (ride) → S4 → S5 → S6. Section transitions: S1→S2 seamless corridor;
S2→S3 the cart leaves the station; S3→S4 the cart stops at Station B; S4→S5 freight lift (hides
the load); S5→S6 cutscene card "MELTDOWN".

