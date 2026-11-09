# L03: The Vegetable Grove

Plan only. Follows `docs/campaign/PLAN.md` (cited as **PLAN §x**), template §14. Replaces "L3: The
Vegetable Grove" in `docs/codex/C-level-designs.md`. **C §x** is `docs/codex/C-campaign-levels.md`,
**B §x** is `docs/codex/C-bosses-sproto-duel.md`.

## 1. Header

| Field | Value |
|---|---|
| Id, stage | `L03`, stage `grove` |
| Lighting | Twilight. Low sun in the west, green fog (`0x1c3a18`), fireflies. `neon` marks the critical path, `toxic` glows |
| Tier | 3 (enemy HP and damage ×1.32; world guns and spells scale the same, PLAN §3, §6.2) |
| Par | 20 min. Estimate **21 min 27 s** (§4) |
| Jetpack | No |
| Enemy total | **164** (122 in encounters E1 to E8, 42 in the finale) plus 2 bosses. Normal |
| Route length | **1,272 m** |
| Sections | 6: S1 Crop Fields, S2 Hedge Maze, S3 Toxic Creek, S4 Greenhouses, S5 The Rootway, S6 The Patch |
| Lockdowns | 3: **[L1]** Gazebo Court (S2), **[L2]** The Hothouse (S4), **[L3]** The Rootway arena (S5, mini-boss) |
| Checkpoints, depots | 10 checkpoints, 2 depots |
| Finale | Mini-boss **The Compost Hex** (`hexAuditor`, 3 parts), then **Broccoli Head, stage 1 *Sprout*** (flees at 50%), then the runoff escape to the exit truck |
| Golden Bonk | Floor Is Lava |

## 2. Concept

The Vape Cabal grows its product in a hexed farm-forest. This is the **magic level**. Almost every
fight has an enemy that guns handle badly and a spell handles in one cast, and almost every lock
on the route is opened by a spell. Guns still kill everything, slowly: Hex Wisps take 20% from
bullets, Bark Brutes take bullets only on a small back knot until a spell opens the bark.

What is different from L01 and L02:

- **Mana is the resource the level attacks.** Mana Leeches and the mini-boss aura drain it. Mana
  blooms are placed like ammo, and §12 lists every one with its reason.
- **Each spell is taught alone, then in a combo.** Yeet at the first shrine, Sproto Swarm at the
  second. Combos: Goo → Conductive → Chain Zap; Yeet into toxic runoff or off a vine bridge; Swarm
  buddies on pressure plates.
- **Seven new enemy types**, each met alone first: `floretSprout`, `hexWisp`, `sewerMidget`,
  `manaLeech`, `barkBrute`, `gooGlob`, `daycare`.
- **One hazard kind**: toxic runoff. It hurts the player and it is the best place to Yeet an enemy.

Cutscene cards (2.6 s each, sim frozen):

| When | Title | Lines |
|---|---|---|
| Level start | The Vegetable Grove | "The Cabal grows it here." / "Bullets are a second opinion. Bring spells." |
| Entering the Rootway arena | The Compost Hex | "Sahil left a shade to guard the crop." / "It eats mana. Feed it its own orbs." |
| Entering the Patch | Something Smells Green | "The Floret Lord is only a sprout." / "He will not stay for the whole fight." (the card already in `campaign.js`) |

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Machine Gun and Shotgun from L01, Sniper and Bazooka types unlocked in L02. Racks here are **Uncommon** (PLAN §7.3) |
| Spells held on arrival | Goo Bolt, Chain Zap, Magic Carpet |
| Mana on arrival | 100 max and 5 /s, plus 10 and 0.5 /s for each Mana Battery found in L01 and L02. The level is tuned for 100 and 5 /s |
| New spell 1 | **Yeet**, shrine `SH-YEET` in S1 at (34, 0, −80), 34 m from the start. Taught on seed pods, then on Sprout florets (E1) |
| New spell 2 | **Sproto Swarm**, shrine `SH-SWARM` in S3 on Island A at (92, 0, −42), at 9:05 of 21:27. Taught on the buddy gate, then on two plates (E6) |
| Mana Battery | One, in the maze's far corner (S2). +10 max mana, +0.5 /s |
| New gun types | None new. A secret cache in S3 gives one **Epic** gun |
| New enemies | Seven (§9) |
| Power-ups | Turbo ×2, Mana Surge ×2 |
| World objects first used | `seedPod`, `manaBloom`, `gooGear`, `conduit` with a bark cap, `pressurePlate`, `spellShrine` ×2 |

Teaching order:

| Step | Where | What |
|---|---|---|
| 1 | B1 pod range | Yeet launches seed pods |
| 2 | E1 | Yeet turns Sprout florets round |
| 3 | E2 | Hex Wisps: bullets 20%, any spell kills. Chain Zap stuns a riot shield |
| 4 | E3 | Goo plugs a burrow mound. Yeet sends a Boom Midget back into its pack |
| 5 | B5 trimmer gate | Goo jams a `gooGear` |
| 6 | E4 **[L1]** | Mana Leeches: mana is a target. A plain conduit takes Chain Zap |
| 7 | Maze exit | Bark-capped conduit: Goo softens bark, then Chain Zap. Same rule as the Bark Brute |
| 8 | E5 | Bark Brute: Yeet off the bridge, or Goo then guns |
| 9 | B8 | Swarm buddy holds a plate. Cast again to send buddies |
| 10 | E6 | Goo Glob: Chain Zap the small ones. Two plates at once |
| 11 | E7 **[L2]** | Nests, with everything above mixed in |
| 12 | E8 | Twist: Yeet Boom Midgets into a Goo Glob |
| 13 | Finale **[L3]** | All four spells have a job (§10) |

## 4. Time budget

Seconds per enemy come from PLAN §3. For the enemies PLAN §3 does not list, this document assumes:

| Enemy | Seconds | Why |
|---|---|---|
| `hexWisp` | 5 | Same as a flyer. One spell kills it, but it has to be found and aimed at |
| `manaLeech` | 6 | Same as a ranged enemy. Low HP, sits back, priority target |
| `barkBrute` | 18 | Between charger (14) and heavy (30). A spell first, then about 8 s of gunfire. 3 s with a Yeet off a ledge |
| `gooGlob` | 14 | One family: 1 big, 2 medium, 4 small. One Chain Zap clears the four small ones |
| `daycare` | 25 | PLAN §3. The Midgets it spawns are counted separately at 3 each |

A Goo Glob counts as **1** enemy in the total (its 6 split bodies are not counted). Daycare spawns
are counted, and each nest has a fixed spawn budget so the count is exact.

| # | Beat | Section | Arithmetic | Seconds | Clock |
|---|---|---|---|---|---|
| B1 | Arrival, Yeet shrine, seed-pod range | S1 | 60 m ÷ 5.5 = 11; shrine and 3 guided casts 20 | 31 | 0:31 |
| B2 | **E1 Scarecrow Row** | S1 | (3×8 + 7×3 + 2×6) = 57 × 1.3 | 74 | 1:45 |
| — | Canal crossing on mushroom pads | S1 | 30 m ÷ 5.5 | 5 | 1:50 |
| B3 | **E2 Wisp Furrows** | S1 | (5×5 + 3×5 + 1×8 + 5×3) = 63 × 1.3 | 82 | 3:12 |
| — | To the maze, racks | S1→S2 | 30 m ÷ 5.5 | 5 | 3:17 |
| B4 | **E3 Dust in the Hedges** | S2 | (8×3 + 3×3 + 3×3 + 1×8) = 50 × 1.3 | 65 | 4:22 |
| B5 | Trimmer gate, then **E4 Gazebo Court [L1]** | S2 | gate: 10 m ÷ 5.5 = 2, Goo jam 15. Lockdown: (3×6 + 12×3 + 8×3 + 3×5) = 93 × 1.3 = 121 | 138 | 6:40 |
| — | Exit corridor, bark-capped conduit | S2 | 38 m ÷ 5.5 = 7; Goo then Zap 10 | 17 | 6:57 |
| — | Near bank to Bridge 1 | S3 | 30 m ÷ 5.5 | 5 | 7:02 |
| B6 | **E5 First Bridge** | S3 | (2×18 + 4×3 + 4×3) = 60 × 1.3 | 78 | 8:20 |
| B7 | Depot 1 | S3 | breather | 45 | 9:05 |
| B8 | Swarm shrine, buddy gate, collapsing bridge | S3 | 20 m ÷ 5.5 = 4; shrine and gate 25; bridge 26 m ÷ 5.5 = 5 | 34 | 9:39 |
| B9 | **E6 Runoff Flats** | S3 | (2×14 + 2×6 + 4×3 + 3×3) = 61 × 1.3 = 79; two plates 15 | 94 | 11:13 |
| — | Far bank and potting yard | S3→S4 | 68 m ÷ 5.5 | 12 | 11:25 |
| B10 | **E7 The Hothouse [L2]** | S4 | (2×25 + 14×3 + 2×8 + 4×3 + 1×6 + 2×5 + 1×18) = 154 × 1.3 | 200 | 14:45 |
| — | To the compost yard | S4 | 20 m ÷ 5.5 | 4 | 14:49 |
| B11 | **E8 Compost Yard** | S4 | (1×14 + 3×3 + 2×5 + 2×3) = 39 × 1.3 | 51 | 15:40 |
| B12 | Depot 2 | S5 | 20 m ÷ 5.5 = 4; breather 45 | 49 | 16:29 |
| — | Rootway tunnel | S5 | 40 m ÷ 5.5 | 7 | 16:36 |
| B13a | **F1 The Compost Hex [L3]** | S5 | Mini-boss, PLAN §3 gives 150 to 210. Parts 50 + 55 + 80 | 185 | 19:41 |
| B13b | **F2 Broccoli Head *Sprout*** | S6 | 30 m ÷ 5.5 = 5; flee encounter 60 | 65 | 20:46 |
| B13c | **F3 Runoff escape** | S6 | 140 m ÷ 5.5 = 25; 4 Sewer Midgets 4×3 × 1.3 = 16 | 41 | 21:27 |
| | **Total** | | | **1,287 s** | **21 min 27 s** |

| Check | Value |
|---|---|
| Par ±2 min | 18:00 to 22:00. Estimate 21:27. Inside |
| Combat E1 to E8 | 577 s of enemies × 1.3 = 750 s (12.5 min) |
| Finale | 185 + 60 + 41 = 286 s. The adds in F1 (26) and F2 (8) are inside the mini-boss and flee figures. The 4 Sprouts in F3 can be outrun and are not in the time |
| Traversal outside fights | 422 m = 76 s. Metres walked inside a fight are in the 30% |
| Shrines, locks, plates | 20 + 15 + 10 + 25 + 15 = 85 s |
| Depots | 2 × 45 = 90 s |
| Beats | 13: 8 combat, 2 mechanism (B1, B8), 2 depots, 1 finale |
| Fast replay | About 15 min (70%) |
| Why it is over par | The 160-enemy floor costs 12.5 minutes by the PLAN §3 table even with 70% fodder. See §14, note 1 |

Intensity (0 to 1): E1 0.4, E2 0.5, E3 0.55, E4 0.8, E5 0.6, depot, E6 0.65, E7 0.85, E8 0.5,
depot, F1 0.95, F2 0.7, F3 0.6. No two above 0.8 in a row without a breather.

## 5. Overview map

North is up. Sections are drawn to rough scale; each has its own origin (§6).

```
                                                         ┌──────────────────────────────┐
                                                         │ S6 THE PATCH                 │
                                                         │ (F2) bowl ─► terraces ─► ▣ exit truck
                                                         └──▲───────────────────────────┘
                                                         ┌──┴────────────┐
                                                         │ S5 ROOTWAY    │
                                                         │ [L3] (F1) arena, r 34
                                                         │   ◇CP10       │
                                                         │   tunnel      │
                                                         │ ⌂D2 ◇CP9      │
                                                         └──▲────────────┘
┌───────────────────────┐┌───────────┐┌─────────────────────┐┌──┴───────────────────┐
│ S1 CROP FIELDS        ││ S2 MAZE   ││ S3 TOXIC CREEK      ││ S4 GREENHOUSES       │
│ ◉►✦◇1 (E1) ◇2 (E2)  ◇3►│ (E3) ◇4   ││ ═B1═(E5)⌂D1✦◇6═B2═ ││ ◇7 [L2](E7) ◇8 (E8) │
│ start, Yeet shrine    ││ [L1](E4)◇5►│ (E6) ═B3═ far bank ►││ yard  Hothouse  yard │
└───────────────────────┘└───────────┘└─────────────────────┘└──────────────────────┘

◉ start   ✦ spell shrine   ◇n checkpoint n   ⌂D depot   [L] lockdown   ═B═ vine bridge   ► route
```

| Section | Footprint (m) | Route (m) | Encounters | Clock in → out |
|---|---|---|---|---|
| S1 Crop Fields | 260 × 160, terrain | 290 | E1, E2 | 0:00 → 3:17 |
| S2 Hedge Maze | 120 × 120 | 232 | E3, E4 [L1] | 3:17 → 6:57 |
| S3 Toxic Creek | 230 × 120 | 230 | E5, E6 | 6:57 → 11:19 |
| S4 Greenhouses | 170 × 90 | 200 | E7 [L2], E8 | 11:19 → 15:44 |
| S5 The Rootway | 90 × 120 | 110 | F1 [L3] | 15:44 → 19:41 |
| S6 The Patch | 150 × 100 | 210 | F2, F3 | 19:41 → 21:27 |

## 6. Sections

Conventions for every blockout table: metres, section-local. `+x` is east. PLAN §4 puts the origin
at the south-west corner with `+z` south, so **north is −z and every z is 0 or negative**. A box's
size is x × y × z and its position is its centre. A cylinder's or cone's position is its base
centre. A sphere's position is its centre. A terrain's origin is its minimum corner (north-west).
Yaw 0 unless given. "×N" rows list N positions.

### 6.1 S1 Crop Fields (260 × 160)

```
z−160 ┌──────────────────────────────────────────────────────────────────┐
      │ trees ─────────────────────────────────── PB1 ══ ───── BEANSTALK★ │
      │                         CW3 [T2]▲         ▓▓        PK6           │
      │   F          CB4○       ○CB8              ▓▓    ○PK3      ○PK7    │
      │   F     TR1▣     ◦MB2  ○CB6     SD2⌂      ▓▓  ○PK2   ○PK5         │
z−80  │◉ ✦◇1 ooo ⌂⌂⌂ LB     ○CB3      ○CB7    MP3►▓▓►◇2 ◦MB3 ○PK4  ○PK8 GATE►
      │   F        ○CB1       ○CB5  SD1⌂          ▓▓  ○PK1    ╔═barn═╗    │
      │   F      CW1  [T1]▲        CW4            ▓▓          ║◦MB4  ║ (SI)│
      │                                           ▓▓          ╚══════╝    │
z 0   └──────────────────────────────────────────────────────────────────┘
       x0      x64 fence        E1: x66–150      canal x152–162   E2: x170–255
```

| Id | Shape | Size | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S1-T | terrain | 260 × 160, cell 2, seed 301, amp 0.4, freq 0.03 | origin (0, 0, −160) | grass | Field floor. Furrows are noise only |
| S1-WN, S1-WS | box ×2 | 260 × 6 × 2 | (130, 3, −159), (130, 3, −1) | hedge | North and south tree walls |
| S1-WW | box | 2 × 6 × 160 | (1, 3, −80) | hedge | West wall |
| S1-WE1, WE2 | box ×2 | 2 × 6 × 77 | (259, 3, −38.5), (259, 3, −121.5) | hedge | East wall, 6 m gate gap at z −77…−83 |
| S1-GATE | door | 1 × 5 × 6 | (259, 2.5, −80) | wood | Opens on `E2.cleared` |
| S1-TRK | prefab `grove.truck` | — | (10, 0, −80), yaw 90 | — | Start. The player steps off the tailgate |
| SH-YEET | prefab `grove.shrine` | — | (34, 0, −80) | — | Yeet shrine, CP1 |
| S1-ST1…3 | prefab `grove.podStump` ×3 | — | (46, 0, −74), (46, 0, −80), (46, 0, −86) | — | Seed pods for the range. Regrow in 12 s |
| S1-SC1…3 | prefab `grove.scarecrow` ×3 | — | (58, 0, −74), (58, 0, −80), (58, 0, −86) | — | Targets, 1 HP. Each pops confetti |
| S1-LB | box, `target` 200 HP | 2 × 3 × 6 | (64, 1.5, −80) | wood | Log barricade. Two pod blasts break it. Bullets do 20% |
| S1-F1, F2 | box ×2 | 2 × 3 × 75 | (64, 1.5, −39.5), (64, 1.5, −120.5) | wood | Fence either side of the barricade |
| S1-CB1…8 | sphere ×8 | r 2.2, 2.6, 3.0, 2.4, 2.6, 2.2, 3.0, 2.4 | (74, 1.6, −70), (84, 2.0, −104), (96, 2.4, −84), (104, 1.8, −116), (112, 2.0, −66), (120, 1.6, −92), (134, 2.4, −78), (142, 1.8, −110) | grass | Giant cabbages, full cover, half buried |
| S1-CW1…4 | box ×4 | 12 × 2.4 × 1.5 | (86, 1.2, −60), (108, 1.2, −100), (126, 1.2, −124), (140, 1.2, −60) | hedge | Corn walls, full cover |
| S1-T1, T2 | prefab `grove.scarecrowTower` ×2 | — | (100, 0, −50), (128, 0, −112) | — | Platforms at y 5. Obama perches |
| S1-MP1, MP2 | `jumpPad` ×2 | pad r 1.2 | (95, 0, −54) → (100, 5.5, −50), apex 7; (123, 0, −108) → (128, 5.5, −112), apex 7 | — | Mushroom pads onto the towers |
| S1-TR1 | prefab `grove.tractor` | — | (78, 0, −92), yaw 20 | — | Wreck, full cover. Sniper rack W1 beside it |
| S1-SD1, SD2 | prefab `grove.shed` ×2 | — | (124, 0, −62) door north; (144, 0, −96) door west | — | Spawn doors for E1 |
| S1-CNL | box | 10 × 0.5 × 156 | (157, −0.2, −80) | toxic | Irrigation canal, `hazardZone` toxic 12 dps over x 152…162 |
| S1-MP3, MP4 | `jumpPad` ×2 | pad r 1.2 | (149, 0, −80) → (166, 0, −80), apex 4; (165, 0, −84) → (148, 0, −84), apex 4 | — | Over the canal and back |
| S1-PB1 | box | 12 × 0.5 × 3 | (157, 0, −136) | wood | Plank bridge, the walking way round |
| S1-PK1…8 | sphere ×8 | r 1.6, 2.2, 1.8, 2.4, 2.0, 1.6, 2.4, 1.8 | (178, 1.1, −72), (186, 1.7, −94), (194, 1.3, −112), (200, 1.9, −78), (210, 1.5, −100), (216, 1.1, −120), (238, 1.9, −106), (246, 1.3, −86) | gold | Pumpkins, cover. Wisps rise out of PK2 and PK5 |
| S1-BN1 | box | 18 × 8 × 0.5 | (228, 4, −54.25) | wood | Barn back wall (south) |
| S1-BN2, BN3 | box ×2 | 0.5 × 8 × 12 | (219.25, 4, −60), (236.75, 4, −60) | wood | Barn side walls |
| S1-BN4, BN5 | box ×2 | 7 × 8 × 0.5 | (222.5, 4, −65.75), (233.5, 4, −65.75) | wood | Barn front (north), 4 m doorway between them |
| S1-BN6 | box | 19 × 0.5 × 13 | (228, 8.25, −60) | wood | Barn roof |
| S1-BN7 | box | 17 × 0.5 × 5 | (228, 4, −57) | wood | Loft at y 4.25. MB4 on it |
| S1-BN8 | ramp | 3 × 4 × 7 | (221.5, 2, −61.5), rises south | wood | Ramp to the loft |
| S1-SI | cylinder + cone | r 4, h 14; cone r 4.4, h 3 at y 14 | (250, 0, −50) | metal | Silo. Landmark |
| S1-HB1…6 | box ×6 | 2 × 1.2 × 1.2 (HB4, HB6: 2 × 2.4 × 1.2) | (190, 0.6, −66), (204, 0.6, −90), (222, 0.6, −88), (232, 1.2, −114), (244, 0.6, −72), (214, 1.2, −72) | sand | Hay bales, crouch cover and two stacks |
| S1-BS | prefab `grove.beanstalk` | — | (244, 0, −142) | — | Secret climb. Golden Bonk on the top leaf at (244, 22.5, −145.5) |
| S1-TREE | prefab `grove.tree` ×14 | — | every 36 m along z −152 and z −8 | — | Visual tree line in front of the walls |

Mechanisms: `spellShrine` SH-YEET; `seedPod` ×3; `target` S1-LB and 3 scarecrows; `jumpPad` ×8
(MP1 to MP4 and 4 on the beanstalk); `hazardZone` toxic (canal); `door` S1-GATE; `manaBloom` MB1 to
MB4; `rack` W1; `secret` Golden Bonk; Audit File 1 on tower T1.

Transition out: through S1-GATE at (259, −80) into S2's west entry.

### 6.2 S2 Hedge Maze (120 × 120)

Concentric square hedge rings around a 44 × 44 m court. Corridors are 4 or 5 m wide, hedges 3.5 m
high (double jump is 2.6 m). The court is lockdown **[L1]**.

```
z−120 ┌────────────────────────────────────────────────────────────┐
      │ A ┌──────── gap x30 ─────────────────────────────────────┐ │
      │   │ B ┌────────────── gap x50 ───────────────────◈BAT ┐  │ │
      │   │   │ C ┌──────────────── gap x64 ────────────────┐ │  │ │
      │   │   │   │ D ┌────────────── N door ─────────────┐ │ │  │ │
      │   │  ◦MB5 │   │ E ┌─────────────────────────────┐ │ │ │  │ │
      │   ├─gap   │   │   │  ○   ▭      ○      ▭    ○   │ │ │ │  │ │
      │   │   │   ├─gap   │                            │ │ │ │  │ │
z−60  ►═══╡   │   │   │  IN█  ▭    (GAZEBO)  ⚡   ▭    █OUT══XD══►S3
      │   │   │  ◇4 ✂─┤   │                            │ │◦AF2│  │ │
      │   │   ├─gap   │   │  ○   ▭      ○      ▭    ○   │ │ │ │  │ │
      │   │   │   │   │   └─────────── S door ──────────┘ │ │ │  │ │
      │   ├─gap   │   └───────────────────────────────────┘ │ │  │ │
      │   │   └─────────────────────────────────────────────┘ │  │ │
      │   └────────────────────────────────────────────────────┘  │ │
z 0   └────────────────────────────────────────────────────────────┘
       x0  7  14  21  28  35 38        court x38–82        82 ...  120
       ✂ trimmer gate   █ lockdown door   ⚡ conduit   XD exit door   ◈BAT Mana Battery
```

A ring hedge occupies the band from `a` to `b` metres in from the footprint edge. Each ring is four
boxes, one per side. A side with a gap is two boxes that stop 2 m either side of the gap centre.

- West side: size (b − a) × h × (120 − 2a), centre ((a + b)/2, h/2, −60).
- East side: the same at x = 120 − (a + b)/2.
- South side: size (120 − 2b) × h × (b − a), centre (60, h/2, −(a + b)/2).
- North side: the same at z = −(120 − (a + b)/2).

| Ring id | a–b | h | West gap (z) | North gap (x) | East gap (z) | South gap (x) |
|---|---|---|---|---|---|---|
| S2-HB (boundary) | 0–2 | 5 | −60, entry from S1 | — | −60, 5 m, exit to S3 | — |
| S2-H1 | 7–10 | 3.5 | −30 | 30 | −60, 5 m | — |
| S2-H2 | 14–17 | 3.5 | −70 | 50 | −60, 5 m | — |
| S2-H3 | 21–24 | 3.5 | −50 | 64 | −60, 5 m | — |
| S2-H4 | 28–31 | 3.5 | −66, trimmer gate | 56 | −60, 5 m | — |
| S2-H5 (court wall) | 35–38 | 9 | −60, door LD1-IN | 60, spawn door GZ-N | −60, door LD1-OUT | 60, spawn door GZ-S |

Corridor centre lines, in from the edge: A 4.5, B 12, C 19, D 26, E 33. The main route is: entry
(0, −60) → A to z −30 → B to z −70 → C to z −50 → D to z −66 → trimmer gate → E to z −60 → court.
A second route runs along the north sides through the north gaps and meets corridor E.

| Id | Shape | Size | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S2-FL | box | 120 × 0.5 × 120 | (60, −0.25, −60) | grass | Floor |
| S2-LIN1, LIN2 | box ×2 | 33 × 3.5 × 1 | (101.5, 1.75, −57), (101.5, 1.75, −63) | hedge | Line the exit corridor so the ring corridors dead-end on it |
| S2-BLKB | box + spawn door HD1 | 4 × 3.5 × 1 | (12, 1.75, −98) | hedge | Closes corridor B to the north. Boom Midgets come through HD1 |
| S2-BLKD | box + spawn door HD2 | 4 × 3.5 × 1 | (26, 1.75, −36) | hedge | Closes corridor D to the south. Midgets come through HD2 |
| S2-BM1…6 | prefab `grove.mound` ×6 | — | (4.5, 0, −50), (4.5, 0, −40), (4.5, 0, −74), (12, 0, −38), (19, 0, −62), (26, 0, −58) | dirt | Burrow mounds for E3 |
| S2-TG | `mover` ×2, `crush: 40` | blade 0.5 × 2.4 × 2 each | (29.5, 1.2, −65) and (29.5, 1.2, −67), meet at z −66 | metal | Hedge trimmer in the H4 gap. Closed 0.8 s, open 0.4 s. 40 damage and knockback 8 |
| S2-GG1 | `gooGear` | r 0.5 | (29.5, 1.5, −63.6) | neon | On the trimmer post. Goo holds the blades open 4 s |
| LD1-IN | lockdown door | 0.6 × 9 × 4 | (37.7, 4.5, −60) | metal, neon trim | Entry slab. Drops 1 s after the threshold |
| S2-THR | disc line | 0.5 × 4 strip | (44, 0, −60) | neon | Threshold, 6 m inside |
| LD1-OUT | lockdown door | 0.6 × 9 × 4 | (82.3, 4.5, −60) | metal, neon trim | Exit slab |
| S2-LID | box | 50 × 0.5 × 50 | (60, 9.25, −60) | glass | Vine-net lid over the court. Nothing leaves |
| S2-GZ | prefab `grove.gazebo` | — | (60, 0, −60) | — | Base, 6 pillars, flat roof at y 4.5. Second height level |
| S2-GZP | `jumpPad` | pad r 1.2 | (66.5, 0, −60) → (60, 4.5, −60), apex 6 | — | Onto the gazebo roof. Stays inside the room |
| S2-BN1…4 | box ×4 | 3 × 1.2 × 1 | (50, 0.6, −50), (70, 0.6, −50), (50, 0.6, −70), (70, 0.6, −70) | stone | Benches, crouch cover |
| S2-TP1…4 | prefab `grove.topiary` ×4 | — | (44, 0, −52), (76, 0, −68), (60, 0, −44), (60, 0, −76) | — | Full cover |
| S2-UR1…4 | cylinder ×4 | r 1, h 1.2 | (54, 0, −42), (66, 0, −42), (54, 0, −78), (66, 0, −78) | stone | Urn planters, crouch cover |
| S2-GM1…4 | prefab `grove.mound` ×4 | — | (43, 0, −43), (77, 0, −43), (43, 0, −77), (77, 0, −77) | dirt | Court burrow mounds (spawn points GZ-M1…M4) |
| S2-CD1 | `conduit` | r 0.4 | (65, 2, −60), on the gazebo's east pillar | neon | Chain Zap it: the gazebo discharges, stunning every enemy within 8 m for 2 s. Recharges in 20 s |
| S2-XD | door | 1 × 3.5 × 5 | (110, 1.75, −60) | wood | Exit door. Opens on conduit CD2 |
| S2-CD2 | `conduit`, `barkCap` | r 0.4 | (106, 1.5, −57.6) | wood, neon | Goo softens the cap for 4 s, then Chain Zap |
| S2-BAT | pick-up | — | (108, 0.5, −104) | gold | Mana Battery, at the far end of corridor B's north side |

Mechanisms: `mover` trimmer and `gooGear`; `lockdown` LD1 (doors LD1-IN, LD1-OUT, encounter E4);
`conduit` ×2 (one bark-capped); `jumpPad` S2-GZP; `door` S2-XD; burrow mounds ×10; `manaBloom` MB5
to MB7; racks W2, W3; Audit File 2; Mana Battery.

Transition out: east along the lined corridor, through S2-XD, out of the boundary gap at
(120, −60) onto S3's near bank.

### 6.3 S3 Toxic Creek (230 × 120)

Three channels of a toxic creek, 8 m below the banks, cut the section into a near bank, two
islands and a far bank. Falling in is a void rescue for the player (C §3.9) and death for an enemy.

```
z−120 ┌──────────────────────────────────────────────────────────────────────┐
      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
      │ NEAR   ▓▓▓▓┌── ISLAND A ──┬─────┐▓▓▓▓▓▓┌─ ISLAND B ─┐▓▓▓▓▓▓┌ FAR BANK │
      │ BANK   ▓▓▓▓│  PS1⌂        │ ⌂D1 │▓(p)▓▓│   ◎PP2     │▓▓▓▓▓▓│  PS2⌂    │
      │        ▓▓▓▓│   ▪  ○       │ ◇6  │▓▓(p)▓│ ≈RP3  ▪    │▓▓▓▓▓▓│          │
z−60  ►   ◦MB8 ═B1═╪  ▪ ▪     ◦MB9│     │▓▓▓▓▓▓│  ◦MB10     ╪═B3═══╪ ▪ ▪      ►S4
      │        ▓▓▓▓│  ○      ◎PP0 █BG ⚡═══B2═══╪   ▪  ≈RP4  │▓▓▓▓▓▓│ ◦MB11    │
      │  MP5►──▓▓──►  ≈RP1    ✦   │     │▓▓▓▓▓▓│  ◎PP1      │▓▓▓▓▓▓│          │
      │        ▓▓▓▓└──────────────┴─────┘▓▓▓▓▓▓└────────────┘▓▓▓▓▓▓└──────────│
      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
z 0   └──────────────────────────────────────────────────────────────────────┘
       x0    30   56          101 106    132          172    196          230
       ≈ runoff pool   ◎ pressure plate   █BG buddy gate   ⚡ Turbo   (p) stepping pillar
```

| Id | Shape | Size | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S3-CRK | box | 230 × 0.5 × 120 | (115, −8.25, −60) | toxic | Creek surface. `killZone` below y −6.5: player rescue, enemies die |
| S3-WN, S3-WS | box ×2 | 230 × 12 × 2 | (115, −2, −119), (115, −2, −1) | rock | Canyon walls, y −8 to 4 |
| S3-WW1, WW2 | box ×2 | 2 × 6 × 57 | (1, 3, −28.5), (1, 3, −91.5) | hedge | West wall, 6 m gap at z −60 for the maze exit |
| S3-WE1, WE2 | box ×2 | 2 × 6 × 57 | (229, 3, −28.5), (229, 3, −91.5) | hedge | East wall, gap at z −60 |
| S3-DE | door | 1 × 5 × 6 | (229, 2.5, −60) | wood | Opens on `E6.cleared` |
| S3-NB | box | 30 × 8 × 116 | (15, −4, −60) | grass | Near bank, top at y 0 |
| S3-IA | box | 50 × 8 × 76 | (81, −4, −60) | grass | Island A, x 56…106, z −22…−98 |
| S3-IB | box | 40 × 8 × 80 | (152, −4, −60) | grass | Island B, x 132…172, z −20…−100 |
| S3-FB | box | 34 × 8 × 116 | (213, −4, −60) | grass | Far bank, x 196…230 |
| S3-NC1…3 | box ×3 | 2 × 1.2 × 2 | (20, 0.6, −56), (24, 0.6, −64), (17, 0.6, −62) | crate | Near-bank cover facing Bridge 1 |
| S3-BR1 | `ropeBridge` | 26 long, 4 wide, no rails | (30, 0, −60) → (56, 0, −60) | wood | Bridge 1. Does not collapse. The first Bark Brute stands at (43, 0, −60) |
| S3-MP5 | `jumpPad` | pad r 1.2 | (26, 0, −34) → (59, 0, −34), apex 6 | — | Flank jump onto Island A's north end |
| S3-AB1, AB2 | sphere ×2 | r 1.6 | (62, 1, −50), (66, 1, −72) | rock | Boulders, Island A |
| S3-AC1…3 | box ×3 | 2 × 1.2 × 2 | (72, 0.6, −56), (76, 0.6, −66), (70, 0.6, −62) | crate | Crates, Island A |
| S3-ALOG | box | 6 × 1.2 × 1.2 | (84, 0.6, −76) | wood | Log, crouch cover |
| S3-RP1 | disc + `hazardZone` toxic | r 5 | (74, 0, −40) | toxic | Runoff pool. Yeet target for the second Brute |
| S3-PS1 | prefab `grove.shed` | — | (80, 0, −88), door south | — | Pump shack. Spawn door for E5 |
| DP1 | `depot` | — | (94, 0, −74) | — | Depot 1, CP6. Enemies do not path east of x 88 |
| SH-SWARM | prefab `grove.shrine` | — | (92, 0, −42) | — | Sproto Swarm shrine. Re-saves CP6 |
| S3-PP0 | `pressurePlate` | disc r 1.2 | (90, 0, −50) | neon | Holds the buddy gate. 11 m from the gate |
| S3-BG | door | 1 × 3 × 4 | (101, 1.5, −50) | wood | Buddy gate. Open while PP0 is held, shut 0.3 s after |
| S3-BGF1, BGF2 | box ×2 | 1 × 3 × 26; 1 × 3 × 46 | (101, 1.5, −35), (101, 1.5, −75) | wood | Fence either side of the gate, edge to edge |
| S3-BR2 | `ropeBridge`, `collapseOn: 'x>114'` | 26 long, 3 wide | (106, 0, −50) → (132, 0, −50) | wood | Bridge 2. 1 s shake, then planks drop from the west, 0.15 s each. Resets 4 s after a rescue |
| S3-SP1, SP2 | cylinder ×2 | r 2, h 8 | (114, −8, −74), (124, −8, −70) | rock | Stepping pillars, tops at y 0. The slow way across |
| S3-MP6…8 | `jumpPad` ×3 | pad r 1 | (104, 0, −72) → SP1; SP1 → SP2; SP2 → (134, 0, −66); apex 3 each | — | Pad chain over channel 2 |
| S3-SP3 | cylinder | r 2, h 8 | (119, −8, −92) | rock | Hidden pillar behind a rock spur. Secret weapon cache on top |
| S3-MP9 | `jumpPad` | pad r 1 | on SP1 at (115.5, 0, −75.5) → SP3, apex 4; SP3 → SP2, apex 4 | — | The way to and from the cache |
| S3-RP3, RP4 | disc + `hazardZone` toxic ×2 | r 5; r 4 | (146, 0, −70), (164, 0, −46) | toxic | Runoff pools, Island B. The first Goo Glob sits in RP3 |
| S3-PP1, PP2 | `pressurePlate` ×2 | disc r 1.2 | (142, 0, −36), (166, 0, −86) | neon | Both held for 1 s grows Bridge 3 for good. 55 m apart |
| S3-BC1…4 | box ×4 | 2 × 1.2 × 2 | (138, 0.6, −54), (150, 0.6, −48), (158, 0.6, −72), (168, 0.6, −62) | crate | Crates, Island B |
| S3-BB1, BB2 | sphere ×2 | r 1.6 | (156, 1, −36), (140, 1, −84) | rock | Boulders by the plates |
| S3-BM1…4 | prefab `grove.mound` ×4 | — | (138, 0, −42), (148, 0, −30), (160, 0, −90), (170, 0, −80) | dirt | Burrow mounds beside the plates |
| S3-BR3 | `energyBridge`, `switch: PP1 && PP2`, latch | 24 long, 4 wide | (172, 0, −60) → (196, 0, −60) | wood | Bridge 3. A vine that grows in 1 s |
| S3-FC1…3 | box ×3 | 2 × 1.2 × 2 | (198, 0.6, −54), (198, 0.6, −66), (206, 0.6, −60) | crate | Far-bank edge cover. The Laser Bots use the first two |
| S3-PS2 | prefab `grove.shed` | — | (214, 0, −86), door south | — | Pump shack. Spawn door for E6 |

Mechanisms: `ropeBridge` ×2 (one collapsing); `energyBridge` on two plates; `pressurePlate` ×3;
`door` buddy gate and S3-DE; `jumpPad` ×6; `hazardZone` toxic ×3; `killZone`; `depot` DP1;
`spellShrine` SH-SWARM; `powerup` Turbo PU1 at (103.5, 0.5, −50); `manaBloom` MB8 to MB11; secret
weapon cache SC1.

Transition out: through S3-DE at (229, −60) into S4's potting yard.

### 6.4 S4 Greenhouses (170 × 90)

A potting yard, one large glasshouse (the Hothouse, lockdown **[L2]**, 64 × 44 m, two levels) and
a compost yard.

```
z−90  ┌────────────────────────────────────────────────────────────────────┐
      │                                                                    │
      │        ┌────────── N door (HH-N) ──────────┐                        │
      │        │▔▔▔▔▔▔▔▔▔▔ catwalk ⚡surge ▔▔▔▔▔◦MB13│    ▣  ▣     ⌂shed    │
      │ ⌂shed  │ ▭  ▭     ▭  ▭    (HH-M2)   ▭   ▭  ▔│                      │
z−45  ►  ◇7   IN█  rack   (NEST A)        (nest B↓) █OUT◇8  ≈RP5  ▣    DE►S5
      │        │ ▭  ▭     ▭  ▭   ≈sump      ▭   ▭  ▔│   ▣       ▣          │
      │ AF3    │(HH-M1) ▔▔▔▔▔▔ catwalk ▔▔▔▔ (HH-M3)▔│        ◦MB15         │
      │        └────────── S door (HH-S) ──────────┘                        │
      │                                                                    │
z 0   └────────────────────────────────────────────────────────────────────┘
       x0      34                                  98   106              170
```

| Id | Shape | Size | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S4-FL | box | 170 × 0.5 × 90 | (85, −0.25, −45) | dirt | Floor |
| S4-WN, S4-WS | box ×2 | 170 × 6 × 2 | (85, 3, −89), (85, 3, −1) | hedge | North and south walls |
| S4-WW1, WW2 | box ×2 | 2 × 6 × 42 | (1, 3, −21), (1, 3, −69) | hedge | West wall, 6 m gap at z −45 |
| S4-WE1, WE2 | box ×2 | 2 × 6 × 42 | (169, 3, −21), (169, 3, −69) | hedge | East wall, gap at z −45 |
| S4-DE | door | 1 × 5 × 6 | (169, 2.5, −45) | wood | Opens on `E8.cleared` |
| S4-PSH | prefab `grove.shed` | — | (12, 0, −22), door north | — | Potting shed. Rocket box inside. Audit File 3 on its roof |
| S4-PCR | box | 1.5 × 1.5 × 1.5 | (16, 0.75, −22) | crate | Step to the shed roof (y 3) |
| S4-YF1, YF2 | box ×2 | 1 × 6 × 21; 1 × 6 × 21 | (33.5, 3, −11.5), (33.5, 3, −78.5) | hedge | Seal the yard either side of the Hothouse |
| HH-WN, HH-WS | box ×2 | 64 × 8 × 0.5 | (66, 4, −67.25), (66, 4, −22.75) | glass | Hothouse north and south walls |
| HH-WW1, WW2 | box ×2 | 0.5 × 8 × 20 | (33.75, 4, −33), (33.75, 4, −57) | glass | West wall, 4 m doorway at z −45 |
| HH-WE1, WE2 | box ×2 | 0.5 × 8 × 20 | (98.25, 4, −33), (98.25, 4, −57) | glass | East wall, 4 m doorway at z −45 |
| HH-ROOF | box | 65 × 0.5 × 45 | (66, 8.25, −45) | glass | Roof. The lid of the lockdown |
| LD2-IN | lockdown door | 0.6 × 8 × 4 | (34, 4, −45) | metal, neon trim | Entry slab |
| HH-THR | disc line | 0.5 × 4 strip | (40, 0, −45) | neon | Threshold, 6 m inside |
| LD2-OUT | lockdown door | 0.6 × 8 × 4 | (98, 4, −45) | metal, neon trim | Exit slab |
| HH-CWN, HH-CWS | box ×2 | 56 × 0.5 × 3 | (66, 3, −65), (66, 3, −25) | metal | Catwalks along the north and south walls, top at y 3.25 |
| HH-CWE | box | 3 × 0.5 × 37 | (95, 3, −45) | metal | East catwalk joining them, over the exit door |
| HH-ST1, ST2 | stairs ×2 | 3 × 3.25 × 7 | (40, 1.6, −59.5) rises north; (40, 1.6, −30.5) rises south | metal | Stairs to each catwalk |
| HH-PL1…8 | box ×8 | 8 × 1.2 × 1.6 | x 46, 58, 74, 86 at z −37 and at z −53; y 0.6 | wood | Planter rows, crouch cover |
| HH-M1…3 | prefab `grove.mound` ×3 | — | (42, 0, −28), (66, 0, −60), (90, 0, −28) | dirt | Burrow mounds in planter beds |
| HH-SUMP | box + `hazardZone` toxic | 6 × 0.5 × 4 | (70, −0.2, −31) | toxic | Toxic sump. Yeet target |
| HH-NA | enemy `daycare` | — | (56, 0, −45) | — | Nest A, placed |
| HH-NB | disc (shadow ring) | r 2.5 | (82, 0, −45) | neon | Where nest B lands in wave 3 |
| HH-DN, HH-DS | spawn door ×2 | 2.4 wide | (66, 0, −67), (66, 0, −23) | metal | Spawn points HH-N and HH-S |
| HH-DCE | spawn door | 2.4 wide | (98, 3.25, −58), onto the catwalk | metal | Spawn point HH-CE |
| S4-TUN1, TUN2 | box ×2 | 8 × 4 × 0.5 | (102, 2, −42.75), (102, 2, −47.25) | glass | Short tunnel to the compost yard |
| S4-CB1…6 | box ×6 | 4 × 2 × 4 | (114, 1, −30), (126, 1, −62), (138, 1, −28), (146, 1, −58), (156, 1, −36), (120, 1, −46) | wood | Compost bins, full cover |
| S4-RP5 | disc + `hazardZone` toxic | r 5 | (134, 0, −45) | toxic | Runoff pool. The Goo Glob sits in it |
| S4-CSH | prefab `grove.shed` | — | (152, 0, −74), door south | — | Spawn door for E8 |
| S4-ST1, ST2 | prefab `grove.podStump` ×2 | — | (112, 0, −56), (128, 0, −34) | — | Seed pods |

Mechanisms: `lockdown` LD2 (doors LD2-IN, LD2-OUT, encounter E7); `hazardZone` toxic ×2; burrow
mounds ×3; `seedPod` ×2; `door` S4-DE; `powerup` Mana Surge PU2 at (66, 3.75, −65); `manaBloom`
MB12 to MB15; rack W4; Audit File 3.

Transition out: through S4-DE at (169, −45) into S5's hollow.

### 6.5 S5 The Rootway (90 × 120)

A root hollow with Depot 2, a 28 m root tunnel, and a round walled arena of radius 34 m (68 m
across), lockdown **[L3]**. Arena centre **C = (45, 0, −80)**. Bearings are degrees clockwise from
north; a point at bearing b and radius r is (45 + r·sin b, y, −80 − r·cos b).

```
z−120 ┌──────────────────────────────────────┐
      │          ___ █OUT (N door) ___       │
      │       ▟▀▀        ▲TOT-N       ▀▀▙    │
      │     ▟▀   (m)    ⬬pod    (m)      ▀▙  │
      │    ▟   ◦MB19   ●      ●   ◦MB17    ▙ │
z−80  │    █  ━log  ●   ((HEAP))   ●  log━ █ │
      │    ▜   ▲TOT-SW  ●      ●  ▲TOT-SE  ▛ │
      │     ▜▄   (m)   ◦MB18    (m)      ▄▛  │
      │       ▜▄▄___  rack ▒ crate ___▄▄▛    │
      │              █IN (S door)            │
      │               ║ tunnel ║  ◦MB16      │
z−16  │        ┌──────╨────────╨──────┐      │
      │        │ ⌂D2   ◇9   hollow    │      │
z 0   └────────┴──────────►───────────┴──────┘
       x0      35         45          55    90
       ● boulder   ▲ root totem   (m) burrow mound   ⬬ seed pod   ((HEAP)) compost heap
```

| Id | Shape | Size | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S5-FL | box | 90 × 0.5 × 120 | (45, −0.25, −60) | dirt | Floor |
| S5-HW1…3 | box ×3 | 2 × 5 × 16; 2 × 5 × 16; 22 × 5 × 2 | (34, 2.5, −8), (56, 2.5, −8), (45, 2.5, −17) with a 6 m gap at x 45 (two boxes 8 × 5 × 2 at x 38 and x 52) | wood | Hollow walls. Entry from S4 is the open south side at (45, 0) |
| DP2 | `depot` | — | (39, 0, −8) | — | Depot 2, CP9 |
| S5-TW1, TW2 | box ×2 | 2 × 5 × 28 | (41, 2.5, −31), (49, 2.5, −31) | wood | Tunnel walls, 6 m apart |
| S5-AR1…3 | prefab `grove.rootArch` ×3 | — | (45, 0, −22), (45, 0, −31), (45, 0, −40) | — | Arches over the tunnel |
| S5-W00…W15 | box ×16 | 14.2 × 12 × 2, yaw = bearing | radius 35, bearings 0, 22.5, … 337.5; y 6. W00 (north) and W08 (south) are each two 5 × 12 × 2 boxes leaving a 4 m doorway | rock | Arena wall |
| S5-LID | disc (force field) | r 35 | (45, 12, −80) | glass | Root-canopy lid at y 12 |
| LD3-IN | lockdown door | 4 × 12 × 0.6 | (45, 6, −45.3) | metal, neon trim | Entry slab (south) |
| S5-THR | disc line | 4 × 0.5 strip | (45, 0, −52) | neon | Threshold, 6 m inside |
| LD3-OUT | lockdown door | 4 × 12 × 0.6 | (45, 6, −114.7) | metal, neon trim | Exit slab (north) |
| S5-HEAP | cylinder | r 6, h 0.5 | (45, 0, −80) | dirt | Compost heap. The Hex roots here in Part 2 |
| TOT-N, TOT-SE, TOT-SW | prefab `grove.totem` ×3, `target` 240 HP | — | radius 22, bearings 0, 120, 240: (45, 0, −102), (64.1, 0, −69), (25.9, 0, −69) | — | Root Totems. Dormant stumps until Part 2 |
| S5-B0…B5 | sphere ×6 | r 2 | radius 14, bearings 30, 90, … 330: (52, 1.4, −92.1), (59, 1.4, −80), (52, 1.4, −67.9), (38, 1.4, −67.9), (31, 1.4, −80), (38, 1.4, −92.1) | rock | Boulders, full cover from orbs |
| S5-L1…L3 | box ×3 | 1.5 × 1.2 × 8, yaw = bearing | radius 27, bearings 90, 210, 330: (72, 0.6, −80), (31.5, 0.6, −56.6), (31.5, 0.6, −103.4) | wood | Fallen logs, crouch cover |
| S5-POD1…6 | prefab `grove.podStump` ×6 | — | radius 18, bearings 0, 60, … 300: (45, 0, −98), (60.6, 0, −89), (60.6, 0, −71), (45, 0, −62), (29.4, 0, −71), (29.4, 0, −89) | — | Seed pods. Regrow in 12 s |
| S5-RM1…6 | prefab `grove.mound` ×6 | — | radius 26, bearings 20, 100, 140, 220, 260, 340: (53.9, 0, −104.4), (70.6, 0, −75.5), (61.7, 0, −60.1), (28.3, 0, −60.1), (19.4, 0, −75.5), (36.1, 0, −104.4) | dirt | Burrow mounds (spawn points RM1…RM6) |
| S5-FLD00…15 | `hazardZone` toxic ×16, off | 13 × 1 × 6, yaw = bearing | radius 31, same bearings as the wall | toxic | The outer ring (r 28…34). Floods at 25% boss HP |

Mechanisms: `lockdown` LD3 (doors LD3-IN, LD3-OUT, encounter F1); `target` ×3 totems; `seedPod` ×6;
burrow mounds ×6; `hazardZone` ×16 switched by the boss script; `depot` DP2; `powerup` Mana Surge
PU3 appears on the heap at the start of Part 2; `manaBloom` MB16 to MB19; rack W5.

Transition out: LD3-OUT opens when the Hex dies, CP10 saves at (45, −116), and the north doorway
leads to S6's south entry.

### 6.6 S6 The Patch (150 × 100)

A sunken vegetable patch (48 × 48 m, floor y 0) and three terraces climbing east to a levee road at
y 9. When Broccoli Head flees, the runoff rises from y 0 to y 8.5 at 0.18 m/s (47 s).

```
z−100 ┌───────────────────────────────────────────────────────────────┐
      │ hedge ─────────────────────────────────────────── water tower ◍│
      │  ┌────── N door ───────┐┌─────────┬─────────┬──────────────────│
      │  │   (BROCCOLI)  R1▲══►│ T1 y3   │ T2 y6   │ LEVEE y9         │
      │  │ ○  ▭ ▭   ⚡   ╱     ││ (m) ⬬   │R3▲═════►█LG                │
z−50  │  │◦MB20 ▭ + ▭         ││  (m)    │ (m) (m) │    ▣ EXIT TRUCK   │
      │  │ ○  ▭ ▭             ││ ⬬   MP►──►        │                  │
      │  │      ○             ││   ▒R2▲══►│   MP►───►                 │
      │  └──── entry ─────────┘└─────────┴─────────┴──────────────────│
      │ hedge ────▲──────────────────────────────────────────────────  │
z 0   └───────────┴───────────────────────────────────────────────────┘
       x0   12   36           60        90        120              150
       ▭ planter   ○ giant vegetable   ▒ hay barricade   █LG levee gate   (m) burrow mound
```

| Id | Shape | Size | At (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| S6-FL | box | 150 × 0.5 × 100 | (75, −0.25, −50) | dirt | Bowl floor |
| S6-WN, S6-WW, S6-WE | box ×3 | 150 × 12 × 2; 2 × 12 × 100; 2 × 12 × 100 | (75, 6, −99), (1, 6, −50), (149, 6, −50) | hedge | Outer walls |
| S6-WS1, WS2 | box ×2 | 33 × 12 × 2; 111 × 12 × 2 | (16.5, 6, −1), (94.5, 6, −1) | hedge | South wall, 6 m entry gap at x 36 |
| S6-AW | box | 2 × 4 × 48 | (11, 2, −40) | hedge | Patch west hedge. Spawn door PT-W at (11, −40) |
| S6-AN | box | 48 × 4 × 2 | (36, 2, −65) | hedge | Patch north hedge. Spawn door PT-N at (36, −65) |
| S6-AS1, AS2 | box ×2 | 22 × 4 × 2 | (23, 2, −15), (49, 2, −15) | hedge | Patch south hedge, 4 m entry at x 36 |
| S6-PL1…6 | box ×6 | 3 × 1.2 × 1.2 | radius 9 about (36, −40), bearings 0, 60, … 300: (36, 0.6, −49), (43.8, 0.6, −44.5), (43.8, 0.6, −35.5), (36, 0.6, −31), (28.2, 0.6, −35.5), (28.2, 0.6, −44.5) | wood | Low planters, Duel-style crouch cover |
| S6-GV1…3 | sphere ×3 | r 2.5 | (20, 1.9, −24), (52, 1.9, −24), (20, 1.9, −58) | grass | Giant vegetables, full cover. Sprouts hide behind GV1 and GV2 |
| S6-PED | cylinder | r 2, h 0.6 | (36, 0, −58) | metal | Vape tank. Broccoli Head starts on it |
| S6-T1 | box | 30 × 3 × 44 | (75, 1.5, −40) | grass | Terrace 1, top y 3, x 60…90, z −18…−62 |
| S6-T2 | box | 30 × 6 × 44 | (105, 3, −40) | grass | Terrace 2, top y 6 |
| S6-LV | box | 30 × 9 × 96 | (135, 4.5, −50) | concrete | Levee road, top y 9 |
| S6-FN, S6-FS | box ×2 | 60 × 12 × 36; 60 × 12 × 16 | (90, 6, −80), (90, 6, −10) | hedge | Fill north and south of the terraces |
| S6-R1 | ramp | 10 × 3 × 5 | (55, 1.5, −56), rises east | wood | Patch floor up to T1 |
| S6-R2 | ramp | 10 × 3 × 5 | (85, 4.5, −24), rises east | wood | T1 up to T2 |
| S6-R3 | ramp | 10 × 3 × 5 | (115, 7.5, −56), rises east | wood | T2 up to the levee |
| S6-HCB | box, `target` 150 HP | 1 × 2 × 5 | (79, 4, −24) | sand | Hay barricade at the foot of R2. One pod blast, or 8 s of bullets |
| S6-POD1, POD2 | prefab `grove.podStump` ×2 | — | (64, 3, −48), (68, 3, −30) | — | Seed pods on T1 |
| S6-MP1 | `jumpPad` | pad r 1.2 | (86, 3, −54) → (93, 6, −54), apex 5 | — | Shortcut T1 → T2, skips the barricade |
| S6-MP2 | `jumpPad` | pad r 1.2 | (116, 6, −26) → (123, 9, −28), apex 5 | — | Shortcut T2 → levee |
| S6-EM1…4 | prefab `grove.mound` ×4 | — | (70, 3, −44), (74, 3, −30), (98, 6, −36), (106, 6, −50) | dirt | Burrow mounds for F3 |
| S6-LG | door | 1 × 4 × 5 | (120.5, 11, −56) | metal | Levee gate at the top of R3. Opens when Broccoli Head flees |
| S6-TRK | prefab `grove.truck` | — | (134, 9, −44), yaw 0 | — | Exit truck. Level ends within 3 m of it |
| S6-RISE | `risingHazard` toxic | min (0, −1, −100), max (120, y, 0) | y 0 → 8.5 at 0.18 m/s | toxic | Starts on `F2.fled` |
| S6-WT | cylinder + spheres | r 3, h 18; sphere r 6 at y 21; 3 spheres r 3 | (140, 9, −90) | hedge | Broccoli-shaped water tower. Visual, outside the playable area |

Mechanisms: `risingHazard`; `jumpPad` ×2; `target` barricade; `seedPod` ×2; `door` S6-LG; burrow
mounds ×4; `powerup` Turbo PU4 at (48, 0.5, −50); `manaBloom` MB20.

Transition out: reaching the truck ends the level.

## 7. Prefabs (`src/data/levels/prefabs/grove.js`)

Positions are relative to the prefab origin (ground centre).

| Prefab | Parts |
|---|---|
| `grove.tree` | Trunk cylinder r 0.6, h 6, `wood`. Crown sphere r 3.2 at y 7.5, `hedge` |
| `grove.truck` | Body box 6 × 2.2 × 2.4 at y 1.7, `metal`. Cab box 2 × 1.8 × 2.2 at (0, 1.5, 4), `metal`. 4 wheel cylinders r 0.6, h 0.5, `rock`. Tailgate ramp 2.2 × 0.6 × 2 |
| `grove.shrine` | Disc r 4, `neon`. Pedestal cylinder r 0.8, h 1.2, `stone`. Orb sphere r 0.5 at y 2, `neon` (no collider). 4 standing-stone boxes 1 × 3 × 1 at radius 3.5 |
| `grove.podStump` | Stump cylinder r 0.6, h 0.8, `wood`. A `seedPod` on top (sphere r 0.45, `toxic`) |
| `grove.scarecrow` | Pole cylinder r 0.25, h 2.2, `wood`. Arm box 1.8 × 0.5 × 0.5 at y 1.6. Head sphere r 0.35 at y 2.4, `sand` |
| `grove.scarecrowTower` | 4 post cylinders r 0.3, h 5 at (±2.2, 0, ±2.2), `wood`. Platform box 5 × 0.5 × 5 at y 5.25. 3 parapet boxes 5 × 1.2 × 0.5 on the north, east and west edges. A `grove.scarecrow` on top |
| `grove.tractor` | Body box 4 × 1.6 × 2.2 at y 1.2, `metal`. Cab box 1.6 × 1.4 × 1.8 at (−1, 2.7, 0). 2 wheel cylinders r 1, h 0.6 lying flat beside it, `rock` |
| `grove.shed` | Three wall boxes: back 6 × 3 × 0.5, two sides 0.5 × 3 × 5. Roof box 6.5 × 0.5 × 5.5 at y 3.25. Open front 2.4 m wide between two boxes 1.8 × 3 × 0.5. `wood` |
| `grove.mound` | Disc r 1.2, `dirt`. Cone r 1.2, h 0.5 (visual only). Marks a `burrow` point |
| `grove.beanstalk` | Stalk cylinder r 1.6, h 24, `hedge`. 4 leaf boxes 4 × 0.5 × 4 at (−3.5, 5, 0), (0, 10.5, 3.5), (3.5, 16, 0), (0, 21.5, −3.5). `jumpPad` on the ground at (−8, 0, 0) to leaf 1, and one on each of leaves 1 to 3 to the next leaf, apex 7 |
| `grove.gazebo` | Base cylinder r 5, h 0.5, `stone`. 6 pillar cylinders r 0.35, h 3.5 at radius 4.5 every 60°. Roof cylinder r 5.5, h 0.5 at y 4, `wood`. Spire cone r 1.5, h 2 at y 4.5 |
| `grove.topiary` | Stem cylinder r 0.4, h 1.2, `wood`. Ball sphere r 1.5 at y 2.4, `hedge` |
| `grove.totem` | Post cylinder r 0.8, h 4, `wood`. Eye sphere r 0.7 at y 4.4, `neon`. 3 root boxes 2 × 0.5 × 0.6 at 120° |
| `grove.rootArch` | 2 cylinders r 0.6, h 5 at x ±2.5, `wood`. Lintel box 7 × 1 × 1.5 at y 5.5 |
| `grove.manaBloom` | Stem cylinder r 0.25, h 0.6. Flower sphere r 0.5 at y 0.9, `neon` (no collider). Disc r 1 |
| `grove.nest` (the `daycare` look) | Base box 4 × 1 × 4, `crate`. 4 corner cylinders r 0.5, h 3. Core sphere r 0.8 at y 1.8, `neon`. Roof cone r 2.6, h 1.5 at y 3 |

## 8. Encounters

Level rules: `maxAlive` 10, at most 3 threat roles at once, toxic runoff is the only hazard kind.
Spawns that would exceed `maxAlive` wait in a queue. A daycare and the Midgets it makes count as
one role ("nest"). Goo puddles and Sprout puffs are enemy attacks, not level hazards.

### E1 Scarecrow Row (S1, x 66…150)

Space: open field, 8 cabbages, 4 corn walls, 2 towers. Objective `clearAll`. Intensity 0.4.
Approaches: straight up the middle between CB1 and CB3, or north along CW3 to tower T2's pad.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| E1-a | `onEnter` (x > 66) | `placed` | Behind CB3 at (99, −84) and CB4 at (107, −116) | floretSprout ×2 | 0 | Artillery, alone. Florets fly 1.2 s: Yeet as they arrive sends them back (HUD hint) |
| E1-b | `onAlert`, or `t+6` | `door` | Shed SD1 | midget ×4 | 0.4 s apart | Keep moving under mortar fire. Chain Zap the pack |
| E1-c | `onKills(4)` | `hidden` | Stand up behind the parapets of T1 and T2 | obama ×2 | 0 | High ground. Take a mushroom pad up, or use the sniper rack |
| E1-d | `onRemain(2)` | `door` | Shed SD2 | midget ×3, floretSprout ×1 | Sprout 2 s late, runs to CB7 | Mortar and a rush at once |

**12 enemies**: floretSprout 3, midget 7, obama 2. Roles: artillery, fodder, ranged. Peak alive 7.
Weapons: sniper rack W1 and sniper box at the tractor, 20 m from the start. MB2 mid-field.
Estimate 74 s (1.2 min).

### E2 Wisp Furrows (S1, x 170…255)

Space: pumpkin patch in front of the barn. Objective `clearAll`. Intensity 0.5.
Approaches: through the pumpkins, or round the east side and into the barn loft.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| E2-a | `onEnter` (x > 172) | `hidden` | Rise out of PK2 and PK5 | hexWisp ×2 | 0 | Spell-check, alone. The first bullet hit shows "20%" and the hint "Spells" |
| E2-b | `onKills(2)` | `air` | Over the barn roof from the south | flyingMidget ×3 | 1 s | Chain Zap chains flyers (weak to shock) |
| E2-c | `onKills(4)` | `door` | Barn doorway (228, −66) | riotMidget ×1, midget ×5 | Riot first | Chain Zap stuns the shield 2 s. Yeet shoves the line back into the barn |
| E2-d | `onRemain(3)` | `hidden` | Through the silo wall and the hay stacks | hexWisp ×3 | 0 | Wisps ignore cover. You cannot hide from them, cast |

**14 enemies**: hexWisp 5, flyingMidget 3, riotMidget 1, midget 5. Roles: spell-check, flyer,
shield with fodder. Peak alive 7. MB3 at the entry, MB4 in the loft. Estimate 82 s (1.4 min).

### E3 Dust in the Hedges (S2, corridors A to D)

Space: 4 and 5 m hedge corridors. Objective `clearAll`. Intensity 0.55.
Approaches: the main route, or the north-side loop through the north gaps.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| E3-a | `onEnter` (x > 3) | `burrow` | BM1, BM2 | sewerMidget ×3 | 0.6 s dust | Burrower, alone. Shotgun on emergence |
| E3-b | `onKills(2)` | `burrow` | BM3 (behind the player), BM4 | sewerMidget ×2 | 0 | Look behind. A goo puddle on a mound plugs it for 4 s |
| E3-c | `onEnter` corridor B | `door` | HD1 at the north end of the 40 m straight | boomMidget ×3 | 0.6 s apart | Yeet the first bomber back into the others. Or one shot at 15 m |
| E3-d | `onEnter` corridor C | `burrow` + `door` | BM5, BM6; HD2 | sewerMidget ×3, midget ×3, hexAcolyte ×1 | Acolyte 3 s late | Chain Zap pops the Acolyte's bubbles. Burrowers behind, fodder in front |

**15 enemies**: sewerMidget 8, boomMidget 3, midget 3, hexAcolyte 1. Roles: fodder, rusher, support.
Peak alive 7. Racks W2 (shotgun) and W3 (MG) at the entrance with a shell box. MB5 in corridor C.
Estimate 65 s (1.1 min).

### E4 Gazebo Court — lockdown [L1] (S2)

| Lockdown | Value |
|---|---|
| Room | The court, **44 × 44 m** (x 38…82, z −38…−82), hedge walls 9 m, vine-net lid at y 9 |
| Height levels | Floor, and the gazebo roof at y 4.5 (jump pad S2-GZP) |
| Cover | 12 pieces: 4 benches, 4 topiaries, 4 urns, plus the gazebo's 6 pillars |
| Doors | Entry LD1-IN (west, from corridor E), exit LD1-OUT (east). Threshold at x 44 |
| Spawn points | `GZ-N` north hedge door (60, −82). `GZ-S` south hedge door (60, −38). `GZ-E` the east hedge, for ghosts, at (82, −48) and (82, −72). `GZ-M1…M4` corner mounds. `GZ-ROOF` the gazebo roof |
| Inside | Ammo boxes: bullets at (41, −66), shells at (41, −54). Mana blooms MB6 (79, −66) and MB6b (41, −48). Conduit CD1 |
| Checkpoint | CP4 at (26, −62), outside the trimmer gate |
| Reward | Chest (one Uncommon-or-better gun), ammo crate, health pack and a mana bloom at (79, −60). CP5 saves |

Objective `clearAll`. Intensity 0.8. Next wave on `onRemain(2)` or 25 s after the wave before it
started (PLAN §5.6).

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Lock (threshold + 1 s) | `placed`; `door` at +4 s | `GZ-ROOF`; `GZ-N` | manaLeech ×1; midget ×4 | Drain, alone for 4 s. The beam is visible and the mana bar falls 8 /s. Kill it, or stand behind a topiary |
| 2 | `onRemain(2)` or 25 s | `burrow`; `door` | `GZ-M1`, `GZ-M2`, `GZ-M4`; `GZ-S` | sewerMidget ×5; manaLeech ×1 | The Leech hides behind a swarm. Zap conduit CD1 to stun what is near the gazebo |
| 3 | `onRemain(2)` or 25 s | `door`; `burrow`; `door` | `GZ-N` ×3, `GZ-S` ×2; `GZ-M3`, `GZ-M1`; `GZ-N` | midget ×5; sewerMidget ×3; manaLeech ×1 | Two doors and the floor at once. Goo a doorway, Chain Zap the puddle |
| 4 | `onRemain(2)` or 25 s | `hidden`; `door` | `GZ-E`; `GZ-S` | hexWisp ×3; midget ×3 | Wisps arrive when mana is lowest. The blooms decide the wave |

**26 enemies**: manaLeech 3, midget 12, sewerMidget 8, hexWisp 3. Roles: drain, fodder, spell-check.
Peak alive 10. Estimate 121 s (2.0 min).

### E5 First Bridge (S3, near bank to Island A)

Space: a 4 m bridge without rails, then the west half of Island A. Objective `clearAll`.
Intensity 0.6. Approaches: Bridge 1, or the mushroom pad MP5 to the island's north end.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| E5-a | `onEnter` (x > 12) | `placed` | Middle of Bridge 1, (43, −60) | barkBrute ×1 | 0 | Armoured heavy, alone. Bullets spark off. Yeet throws it off the deck. Or Goo for 4 s of soft bark |
| E5-b | `onKills(1)` | `door` | Pump shack PS1 | boomMidget ×4 | 0.6 s apart | Bombers in single file on a bridge. One Yeet, or one shot, ends all four |
| E5-c | `onRemain(1)` | `door` | Pump shack PS1 | barkBrute ×1, midget ×4 | Midgets 2 s late | A Brute on land. Goo then guns, Goo then Zap to strip it, or Yeet it into pool RP1 |

**10 enemies**: barkBrute 2, boomMidget 4, midget 4. Roles: armoured heavy, rusher, fodder. Peak
alive 5. MB8 on the near bank, MB9 at the camp. Bullet box at (22, −58). Estimate 78 s (1.3 min).

### E6 Runoff Flats (S3, Island B)

Space: Island B, two runoff pools, two plates 55 m apart. Objective `switch` (PP1 and PP2 held
together for 1 s), then `clearAll`. Intensity 0.65. Approaches: stand on one plate and send
buddies to the other, or send buddies to both from the middle.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| E6-a | `onEnter` (x > 134) | `placed` | In pool RP3 | gooGlob ×1 | 0 | Splitter, alone: 1 → 2 → 4. Shoot the core. Chain Zap the four small ones |
| E6-b | `onRemain(0)` | `hidden` | Far-bank crates FC1, FC2 | robotLaser ×2 | 0 | Fire across the gap while you work the plates. Crates block it |
| E6-c | `onSwitch(PP1)` or `onSwitch(PP2)`, whichever is first | `burrow` | S3-BM1…BM4 | sewerMidget ×4 | 0 | They attack whoever holds a plate. Defend the buddies |
| E6-d | Bridge 3 grown | `door` | Pump shack PS2, across Bridge 3 | gooGlob ×1, midget ×3 | Midgets 3 s late | A Glob on a bridge. Yeet it off and it dies whole |

**11 enemies** (plus 12 split bodies): gooGlob 2, robotLaser 2, sewerMidget 4, midget 3. Roles:
splitter, ranged, fodder. Peak alive 9. MB10 between the plates. Shell box at (150, −52).
Estimate 79 s + 15 s for the plates = 94 s (1.6 min).

### E7 The Hothouse — lockdown [L2] (S4)

| Lockdown | Value |
|---|---|
| Room | The Hothouse, **64 × 44 m** (x 34…98, z −23…−67), glass walls 8 m, glass roof |
| Height levels | Floor, and a U-shaped catwalk at y 3.25 along the north, east and south walls, two stairs |
| Cover | 8 planter rows, the nest shells, the stair blocks |
| Doors | Entry LD2-IN (west), exit LD2-OUT (east). Threshold at x 40 |
| Spawn points | `HH-N` north door (66, −67). `HH-S` south door (66, −23). `HH-CE` catwalk door (98, 3.25, −58). `HH-ROOF` roof panel over (82, −45). `HH-M1…M3` planter mounds |
| Inside | Bazooka rack W4 at (40, −38) with a rocket box. Ammo boxes: bullets (40, −52), shells (62, −45). Mana blooms MB12 (37, −56), MB13 (94, 3.5, −65), MB14 (74, −45). Mana Surge PU2 on the north catwalk |
| Checkpoint | CP7 at (24, −45), outside the entry door |
| Reward | Chest (one Uncommon-or-better gun), ammo crate, health pack and a mana bloom at (95, −49). CP8 saves |

Objective `clearAll` (both nests are enemies). Intensity 0.85.

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Lock (threshold + 1 s) | `placed`; `summon` | Floor at (56, −45) | daycare ×1, which makes midget ×5 (2 every 6 s) | Nest, alone. The core opens 1.5 s at each spawn. Bazooka, or Goo the core to jam a spawn |
| 2 | `onRemain(2)` or 25 s | `door`; `burrow` | `HH-CE`; `HH-M1`, `HH-M3` | floretSprout ×2 on the east catwalk; sewerMidget ×4 | Mortars from above. Take the stairs, or Yeet the florets back up |
| 3 | `onRemain(2)` or 25 s | `drop`; `summon`; `door`; `hidden` | `HH-ROOF`; `HH-S`; `HH-N` (through the glass) | daycare ×1, which makes midget ×5; manaLeech ×1; hexWisp ×2 | The mana test: a Leech drains while a nest spawns. Mana Surge is on the catwalk |
| 4 | `onRemain(2)` or 25 s | `door` | `HH-N`; `HH-S` | barkBrute ×1; midget ×4 (2 per door) | The Brute walks past the sump. Yeet it in |

**26 enemies**: daycare 2, midget 14 (10 from nests), floretSprout 2, sewerMidget 4, manaLeech 1,
hexWisp 2, barkBrute 1. Roles per wave: nest; artillery and fodder; nest, drain and spell-check;
armoured heavy and fodder. Peak alive 10. Estimate 200 s (3.3 min).

### E8 Compost Yard (S4, x 106…168)

Space: open yard, 6 compost bins, one runoff pool, 2 seed pods. Objective `clearAll`.
Intensity 0.5. Approaches: left of the pool past bin CB1, or right past CB2.

| Squad | Trigger | Method | From | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|
| E8-a | `onEnter` (x > 108) | `placed` | In pool RP5 | gooGlob ×1 | 0 | The twist: this one sits next to seed pods |
| E8-b | `onAlert` | `door` | Shed S4-CSH | boomMidget ×3 | 0.6 s apart | Yeet a bomber into the Glob: the blast kills the big body and both mediums |
| E8-c | `onRemain(2)` | `hidden` | Through bins CB3 and CB5; behind CB4 | hexWisp ×2, midget ×2 | 0 | Wisps while the small Globs are still loose |

**8 enemies**: gooGlob 1, boomMidget 3, hexWisp 2, midget 2. Roles: splitter, rusher, spell-check.
Peak alive 8. MB15 at (112, −60). Shell box at (110, −40). Estimate 51 s (0.9 min).

### Encounter totals

| Encounter | Enemies | Seconds | Lockdown |
|---|---|---|---|
| E1 | 12 | 74 | |
| E2 | 14 | 82 | |
| E3 | 15 | 65 | |
| E4 | 26 | 121 | [L1] 44 × 44 m |
| E5 | 10 | 78 | |
| E6 | 11 | 79 | |
| E7 | 26 | 200 | [L2] 64 × 44 m |
| E8 | 8 | 51 | |
| F1 adds | 26 | in 185 | [L3] round, 68 m across |
| F2 adds | 8 | in 60 | |
| F3 | 8 | 16 (4 of them) | |
| **Total** | **164** | | |

| Type | Count | Type | Count |
|---|---|---|---|
| midget | 67 | barkBrute | 4 (1 elite) |
| sewerMidget | 34 | gooGlob | 3 |
| hexWisp | 16 | flyingMidget | 3 |
| boomMidget | 13 | obama | 2 |
| floretSprout | 11 | robotLaser | 2 |
| manaLeech | 5 | daycare | 2 |
| riotMidget | 1 | hexAcolyte | 1 |

Fodder and rushers are 114 of 164 (70%). `robotShooter` and `bigObama` are not used on Normal.

## 9. New enemies

All numbers are tier-1 base values; tier 3 multiplies HP and damage by 1.32. The first three are
C §3.12 re-skins that get real behaviour (E7); the last four are PLAN §5.3 placeholders (E8). No
enemy beyond PLAN §5.3 is proposed. Drops are ammo, health, mana, tickets or a gun, never resources.

**Stats**

| Id | Name, role | HP | Speed (m/s) | Radius, height | Damage taken | `maxAlive` weight | Drops | Seconds |
|---|---|---|---|---|---|---|---|---|
| `floretSprout` | Floret Sprout, artillery | 50 | 6.2 | 0.4, 1.3 | Normal | 1 | Ammo 15% | 8 |
| `sewerMidget` | Sewer Midget, burrower fodder | 40 | 7.8 | 0.45, 1.3 | Normal. Untargetable underground | 1 | Ammo 6% | 3 |
| `daycare` | Midget Daycare, nest | 400 | 0 | 2.0, 3.0 | Shell ×0.5 to bullets, core ×2.5 while open, explosives ×1 | 1 | Ammo pack ×2, health | 25 |
| `hexWisp` | Hex Wisp, spell-check | 45 | 5.0, flies at 1.2 to 2.6 m | 0.5, 1.0 | Bullets ×0.2, explosives ×0.5, spells ×2, reflected orbs ×2 | 1 | Mana orb 10, always | 5 |
| `barkBrute` | Bark Brute, armoured heavy | 260 | 3.2, turns 90°/s | 0.8, 2.4 | By bark state (below). Back knot always takes bullets ×1 | 1 | Ammo 30%, health 20%. The elite always drops a gun | 18 |
| `manaLeech` | Mana Leech, drain | 55 | 3.8 | 0.45, 1.1 | Normal. Weak to shock | 1 | Mana orbs equal to what it drained, 15 to 40 | 6 |
| `gooGlob` | Goo Glob, splitter | 90 big, 40 medium, 15 small | 3.0, 4.2, 6.0 | 1.1, 0.7, 0.4 | Core ×2.5. Always Conductive. Immune to goo slow and to toxic | Big 1, medium 1, four small 1 | Ammo 20% (big only) | 14 per family |

**Behaviour and look**

| Id | Attacks | Counters and spell hooks | Look and hitboxes |
|---|---|---|---|
| `floretSprout` | Hides behind cover 14 to 30 m away. Every 5 s lobs 3 florets: flight 1.2 s, warning circles r 1.6, 6 damage each. Runs to new cover if the player is within 8 m. On death: Hotbox puff r 2, 3 s, 3 dps | Keep moving, flush it out. **Yeet** in the last 0.4 s of the flight returns all three florets (30 each to it). Do not stand in the puff | `broccoli` stage 1 model at scale 0.55. Capsule body, sphere weak spot r 0.2 on the head |
| `sewerMidget` | Comes out of the `burrow` mound nearest the player within 12 m, 0.6 s dust. Melee 9. Goes back under after 4 s without a target and comes up closer | Watch the dust, shotgun on emergence. A **goo puddle** on a mound plugs it 4 s | `midget` stage 1, a disc r 0.5 (manhole lid) as a hat |
| `daycare` | Does not move. Makes 2 Midgets every 6 s, up to 8 alive, until its spawn budget is spent (5 here). The core is open 1.5 s at each spawn | Bazooka, or time shots on the open core. **Goo** on the core jams the next spawn (4 s). **Chain Zap** into the open core chains to the new Midgets | Prefab `grove.nest`. Box hitbox for the shell, sphere r 0.8 for the core |
| `hexWisp` | Passes through solids (`ghost`), needs line of sight to fire. Hex orb every 3.2 s inside 16 m: 8 damage, 9 m/s, 4 s life. Touch inside 1.5 m, 0.6 s wind-up: 6 damage and 12 mana burned | Any spell. One Goo Bolt or one Chain Zap kills at tier parity. **Yeet** returns its orb | Sphere r 0.5 (`neon` violet, see-through), 2 eye spheres r 0.08, cone tail r 0.3, h 0.8. One sphere hitbox, no weak spot |
| `barkBrute` | Club: reach 2.6, wind-up 0.8, 22 damage, knockback 8. Shoulder charge from 6 to 14 m: wind-up 0.7, 10 m/s for up to 10 m, 18 damage, knockback 10, stops on walls, every 6 s | Bark states. **Hard**: bullets 0%, explosives 25%, spells 100%. **Softened** (Goo, 4 s): bullets 100%. **Cracked** (Chain Zap, 6 s): bullets 100%, staggered 0.8 s. **Stripped** (Goo then Zap inside 4 s, toxic runoff, or a seed pod): for good, bullets 125%. **Yeet** moves it 5 m, 8 m once the bark is open | 3 stacked boxes (legs 1.0 × 0.9 × 0.7, torso 1.4 × 1.0 × 0.9, head 0.7 × 0.5 × 0.6, `wood`), 2 arm cylinders r 0.22, h 1.3, knot sphere r 0.25 (`neon`) on the back. Capsule body, knot is the `weak` zone |
| `manaLeech` | Keeps 6 to 9 m away. Latch: 10 m, needs line of sight, 0.8 s wind-up with a visible tendril, then drains **8 mana/s** and heals itself 4 HP/s. At 0 mana the beam does 4 dps to shields. At most 2 latched at once. Runs if the player is inside 4 m | Kill it first. Breaking line of sight for 0.5 s drops the latch (2 s before it can latch again). **Yeet** and any stagger break it | Cylinder body r 0.4, h 1.1 (`toxic`), disc mouth r 0.45 on the front (`neon`), 3 foot spheres r 0.12. Capsule body, mouth is the `weak` zone |
| `gooGlob` | Hop slam: 6 m hop, 1 s shadow, 14 damage in r 2.5, leaves a slow puddle r 3 for 5 s (40% slow). Medium: 9 damage, puddle r 2. Small: bite 5, no puddle. Splits 1 → 2 → 4 on death | Shoot the core. **Chain Zap** always jumps 9 m between Glob bodies and does +50%. **Yeet** off a ledge or a blast of 150 or more kills it without a split | See-through sphere (`toxic`) with a core sphere at 0.3 × its radius (`neon`). Sphere body, core is the `weak` zone |

**Root Totem** (a `target`, not an enemy; S5 only): 240 HP, post r 0.8, h 4. It uses the Bark Brute's
bark states, and its root boxes always take bullets at 20%.

## 10. Finale

Three stages in two sections. L03 has no canonical boss (`docs/shooter-server-contract.md`: the
Broccoli flee is "not issuable"), so the hub's starter-loadout rule does not bind here. Every part
still has a gun-only answer, and everything a part needs is inside its section.

### 10.1 F1 The Compost Hex — mini-boss and lockdown [L3] (S5)

`hexAuditor` with its Wave Mode data unchanged: 3,000 HP, radius 0.7, hovers at 1.6 m, orb 8 damage,
tax bolt 12, aura 9 m (13 m in its last phase) draining 15 mana/s, a weak spot orbiting at 1.9 m and
120°/s (200°/s in its last phase), 2 mana orbs of 25 for every 10% HP lost. The campaign adds a part
script, a walled arena and the totems. It keeps 12 m from the player, so the 9 m aura only reaches
a player who walks in.

| Lockdown | Value |
|---|---|
| Room | Round arena, radius 34 m (**68 m across**), rock wall 12 m, root-canopy lid at y 12 |
| Cover | 9 pieces: 6 boulders, 3 logs. The compost heap is a second height of only 0.5 m, so the room qualifies on cover |
| Doors | Entry LD3-IN (south), exit LD3-OUT (north). Threshold at (45, −52) |
| Spawn points | `RM1…RM6` burrow mounds at radius 26 on all sides. `HEAP` (summons appear at the heap). `TOT-N`, `TOT-SE`, `TOT-SW` (guards rise beside a totem) |
| Inside | MG rack W5 at (41, −52). Ammo boxes: bullets (49, −52), shells (41, −58). Mana blooms MB17 to MB19 at radius 24. 6 seed pods |
| Checkpoint | CP9 at Depot 2. Dying restarts at Part 1 |
| Reward | The mini-boss drop (two guns, one Rare), an ammo crate, a health pack. CP10 saves |

| Part | Kind | HP | Boss attacks | Adds (trigger, method, spawn point, enemies) | Arena change | Ends when | Seconds |
|---|---|---|---|---|---|---|---|
| **1 The Audit** | Phase | 3,000 → 1,800 | Pattern: drift 2.5 s; **ring** (16 orbs, 8 m/s); **fan** (5 orbs, 10 m/s); **spiral** (3 arms for 3 s, 7 m/s); **teleport** (0.6 s out, invulnerable, 0.4 s in, 10 to 26 m from C and at least 8 m from the player). Aura 9 m | `onBossHp(85%)`, `burrow`, RM2 and RM5: midget ×5. `onBossHp(70%)`, `summon`, HEAP: hexWisp ×2 | None. The boss stays inside radius 30 | 60% HP | 50 |
| **2 Rooted** | Intermission, destroyable parts | Boss invulnerable. 3 Root Totems × 240 | The Hex floats to the heap and tethers to the three totems. Aura shrinks to 4 m. Every 12 s one slow **ring** from the heap | At start: TOT-N, `burrow`: sewerMidget ×3. TOT-SE, `summon`: manaLeech ×1, midget ×3. TOT-SW, `burrow`: **elite** barkBrute ×1. `onPartDestroyed(first totem)`, `burrow`, RM1 and RM6: midget ×3 | Mana Surge appears on the heap. A totem's guards die when it dies | The third totem dies. The Hex drops for 5 s with its weak spot still: a free damage window | 55 |
| **3 Liquidation** | Phase, then arena shift | 1,800 → 0 | 60% to 25%: **ring**, **tax bolts** (3 homing bolts, 6 m/s, 12 damage, 6 s life), spiral, fan, teleport. Below 25% (2 s invulnerable): **spiral with a ring**, tax bolts, fan, teleport. Aura 13 m, weak spot 200°/s | `onBossHp(45%)`, `burrow`, RM3 and RM4: boomMidget ×3. `onBossHp(25%)`, `summon`, HEAP: hexWisp ×2. `onBossHp(12%)`, `burrow`, RM1, RM3, RM5: sewerMidget ×3 | At 25% the outer ring (radius 28 to 34) floods with runoff: 12 dps. The boss stays inside radius 24. Blooms at radius 24 stay dry | 0 HP | 80 |

Adds: 7 + 11 + 8 = **26** (midget 11, sewerMidget 6, hexWisp 4, boomMidget 3, manaLeech 1, barkBrute 1
elite). Peak alive 9 with the boss. Adds follow the HP schedule above (PLAN §9), not the 25 s wave
timer. Total 185 s (3.1 min).

What each spell does in this fight, and where the level taught it:

| Tool | Use | Taught in |
|---|---|---|
| Yeet | Orbs and tax bolts are slow: a Yeet sends back every one in the cone at 5× damage (40 an orb, 60 a bolt). Launches seed pods at totems (150, strips bark). Shoves the elite Brute off a totem, or into the flooded ring | B1, E1, E2, E5 |
| Goo Bolt | Slows the Hex 40% (it does today). **New**: while gooed its weak spot orbits at a quarter speed. Softens totem bark for 4 s. Keeps the 13 m aura off a retreating player | B5, maze exit, E5 |
| Chain Zap | Chains from the Hex into its adds. Cracks totem bark for 6 s, strips it after Goo. +50% on a gooed Hex | E2, E4, maze exit |
| Sproto Swarm | Cast, look at a totem, cast again: buddy rockets count as spells and strip it in about 5 s | B8, E6 |
| Mana blooms, Mana Surge | The aura and the Leech take mana; three blooms and the Surge give it back | E4, E7 |
| Guns only | Body shots at the Hex work as in Wave Mode. Totem roots take bullets at 20% (about 35 s a totem). The elite's back knot takes bullets | — |

### 10.2 F2 Broccoli Head, stage 1 *Sprout* (S6)

Not a lockdown: nothing seals behind the player and the terraces are open during the fight. The
`broccoli` boss definition is used as L06 will use it, stage 1 only, and its HP is not changed here
(it is in the content fingerprint). B §3.3 gives stage 1 a bar of 880 × `DUEL_HP_K`; he flees at
50% of it (with today's stand-in data: 550 of 1,100).

| Part | Kind | HP | Boss attacks | Adds | Arena change | Ends when | Seconds |
|---|---|---|---|---|---|---|---|
| **1 Sprout** | Phase | Stage-1 bar 100% → 50% | Bolts (floret skin, damage 4 × 0.76, bursts of 1 to 3). **Floret Mortar** every 14 s: 8 circles r 2 over 2.4 s, 1 s warning. Keeps 9 to 14 m, dodges, raises a 0.8 s shield | `t+8`, `door`, PT-N: midget ×3. `onBossHp(80%)`, `door`, PT-W: midget ×3. `onBossHp(65%)`, `hidden`, behind GV1 and GV2: floretSprout ×2 | None | 50% of the bar | 54 |
| **2 Hotbox** | Scripted exit | — | He drops one **Hotbox** cloud on the player (r 4.2, 0.95 s warning, 6 s, toxic), rides a vape cloud up and over the north hedge. 6 s, the player keeps control | None. Living adds stay | The levee gate S6-LG opens. The runoff starts to rise | The exit ends | 6 |

Adds: **8** (midget 6, floretSprout 2). Roles: boss, fodder, artillery. Peak alive 9. His bolts fly
at 52 m/s, too fast for Yeet; the Sprouts' florets are not. Total 60 s.

### 10.3 F3 The runoff escape (S6)

Objective `escape`: reach the truck before the runoff does. The runoff reaches terrace 1 (y 3) at
17 s, terrace 2 (y 6) at 33 s and stops at y 8.5 at 47 s. The route is 140 m: 25 s at 5.5 m/s.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| F3-a | `onEnter` terrace 1 | `burrow` | EM1, EM2 | sewerMidget ×2 | They block the way to ramp R2. Yeet them down into the runoff |
| F3-b | `onEnter` terrace 1 | `placed` | Terrace 2 at (96, 6, −52) and (104, 6, −28) | floretSprout ×2 | Mortars on the barricade. Yeet a pod at the barricade, or take pad S6-MP1 |
| F3-c | `onEnter` terrace 2 | `burrow` | EM3, EM4 | sewerMidget ×2 | Same again, with less time |
| F3-d | `onEnter` terrace 2 | `placed` | Levee at (124, 9, −30) and (128, 9, −60) | floretSprout ×2 | Can be outrun. The runoff does not reach them |

**8 enemies.** Turbo PU4 at the foot of ramp R1. Estimate 41 s. The level ends at the truck.

## 11. Mechanisms, magic and explosives used

| Mechanism | Where | New to this level |
|---|---|---|
| `spellShrine` | SH-YEET (S1), SH-SWARM (S3) | Yeet and Sproto Swarm are new |
| `seedPod` (Yeet launches it; 150 damage, r 4, 25 to the player) | S1 range, S4 yard, S5 arena, S6 terrace | Yes |
| `manaBloom` | 21 placed, 2 as lockdown rewards (§12) | Yes |
| `gooGear` | Trimmer gate (S2) | Yes |
| `conduit` | CD1 gazebo discharge, CD2 bark-capped exit lock (S2) | Bark cap is new |
| `pressurePlate` | Buddy gate (S3), Bridge 3 plates (S3) | Yes |
| `lockdown` | L1 Gazebo Court, L2 Hothouse, L3 Rootway arena | — |
| `jumpPad` (mushrooms) | 8 in S1, 1 in S2, 6 in S3, 2 in S6 | Mushroom skin |
| `ropeBridge` | Bridge 1 (fixed), Bridge 2 (collapsing) in S3 | Yes |
| `energyBridge` on plates | Bridge 3 (S3) | Driven by plates, not a switch |
| `hazardZone` toxic, 12 dps | Canal (S1), 3 pools (S3), sump and pool (S4), flooded ring (S5) | Yes. The level's only hazard kind |
| `killZone` with rescue | Creek (S3) | From L02 |
| `risingHazard` toxic | The escape (S6) | Yes |
| Burrow mounds | 6 + 4 in S2, 4 in S3, 3 in S4, 6 in S5, 4 in S6 | Yes |
| `mover` with `crush: 40` | Hedge trimmer (S2) | — |
| `target` | Log barricade, scarecrows (S1), totems (S5), hay barricade (S6) | — |
| `door`, `depot`, `rack`, `powerup` | Throughout | Mana Surge is new |
| Explosives | Seed pods only. No barrels, charges or mines in this level | — |

**Proposed edits to spells and mechanisms** (changes to PLAN §6.2; numbers are a first pass)

| Item | PLAN says | Proposed for this level to work |
|---|---|---|
| Yeet: cone | "7 m cone" | 7 m long, 60° wide. Mana 20, cooldown 3 s as planned |
| Yeet: enemies | "fly 8 m" | Light enemies 8 m. Bark Brute 5 m (8 m with open bark), Riot Midget 5 m, Big Obama 2 m, bosses 0. 20 damage on hitting a wall. Off a ledge into a kill zone: dead |
| Yeet: projectiles | "slow projectiles turn round" | "Slow" means 14 m/s or less. A returned projectile becomes the player's, counts as a spell, does 5× its damage (at least 30) and homes back if it homed before |
| Yeet: seed pods | "launch" | 22 m/s along the aim, explode on impact for 150 in r 4, strip bark. A pod regrows in 12 s |
| Goo Bolt | Puddle 3 m, 4 s; Conductive; jams; softens bark | Add: a puddle on a burrow mound plugs it for 4 s. A gooed `hexAuditor` (campaign part script only) orbits its weak spot at a quarter speed |
| Chain Zap | Powers conduits; +50% and 1.5× jump on gooed targets | Add: a zap that lands in a goo puddle hits everything standing in it. Bark-capped conduits need Goo first |
| Sproto Swarm | 5 buddies, 8 s; plates; cast again to send | Buddies live **12 s**. A buddy standing on a plate does not age (30 s at most). Casting again while buddies live is a free command (no mana, 0.5 s cooldown): looking at a plate sends the 2 nearest, looking at an enemy or a totem sends all free buddies |
| Magic Carpet | Hovers over pools and low cover (B §6) | It follows the ground: it drops into a gap deeper than 2 m, so it cannot skip Bridge 2 or Bridge 3. It does cross the canal and the pools, on purpose |
| Mana Surge | 20 s of 4× regen | Also breaks every Leech latch when picked up |
| Toxic runoff and enemies | C §3.9 gives no rule | 40 dps to enemies and strips bark at once. Goo Globs are immune |
| `ropeBridge` | Collapses once | Resets 4 s after a rescue, or the level soft-locks |
| `daycare` | Spawns until dead | A per-placement spawn budget, so the enemy total is exact |
| No extra spell | — | None is needed. The level already teaches two |

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

**Checkpoints** (each has an ammo box or a crate)

| Id | Where | Section, position | Clock | Gap |
|---|---|---|---|---|
| CP1 | Yeet shrine | S1 (34, −80) | 0:15 | — |
| CP2 | Canal east bank, after E1 | S1 (168, −80) | 1:50 | 1:35 |
| CP3 | Maze entrance, after E2 | S2 (3, −60) | 3:17 | 1:27 |
| CP4 | Outside the trimmer gate, after E3. Entry checkpoint of [L1] | S2 (26, −62) | 4:22 | 1:05 |
| CP5 | [L1] cleared | S2 (86, −60) | 6:40 | 2:18 |
| CP6 | Depot 1, after E5. The Swarm shrine saves it again at 9:30 | S3 (94, −74) | 8:20 | 1:40 |
| CP7 | Potting yard, after E6. Entry checkpoint of [L2] | S4 (24, −45) | 11:25 | 1:55 |
| CP8 | [L2] cleared | S4 (100, −45) | 14:45 | 3:20 |
| CP9 | Depot 2, after E8. Entry checkpoint of [L3] | S5 (45, −4) | 15:44 | 0:59 |
| CP10 | [L3] cleared, the Hex is dead | S5 (45, −116) | 19:41 | 3:05 from leaving the depot |

Two gaps are over 2.5 minutes because a lockdown cannot hold a checkpoint (§14, note 2).

**Depots** (PLAN §7.7: depot crate, health station, spell loadout bench, ticket shop, checkpoint):
DP1 on Island A at (94, 0, −74) in S3, 39% of the way through; DP2 in the Rootway hollow at
(39, 0, −8) in S5, before the finale.

**Weapons** (racks are Uncommon, the level's base tier)

| Id | Gun | Where | Why |
|---|---|---|---|
| W1 | Sniper | S1, beside the tractor (80, 0, −94) | E1: Obamas on the towers, Sprouts across the field |
| W2 | Shotgun | S2 entrance (3, 0, −57) | E3: burrowers at arm's length in 4 m corridors |
| W3 | Machine Gun | S2 entrance (3, 0, −63) | E3 and E4: packs of fodder |
| W4 | Bazooka | S4, inside the Hothouse (40, 0, −38) | E7: two nests |
| W5 | Machine Gun | S5, inside the arena (41, 0, −52) | F1: the finale section holds its own gun |

**Loot table**

| Tier odds for enemy drops (PLAN §7.3, L03) | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Percent | 45 | 40 | 14 | 1 | 0 |

| Guaranteed drop | Where | What |
|---|---|---|
| Lockdown chest, [L1] | S2 court, by the exit door (80, 0, −62) | One gun, Uncommon or better, of a type the player does not carry if possible |
| Lockdown chest, [L2] | S4 Hothouse, by the exit door (95, 0, −41) | The same |
| Elite | The elite Bark Brute at totem TOT-SW, F1 Part 2 | One gun, rolled one tier step up |
| Mini-boss | The Compost Hex, at the compost heap. This is also [L3]'s reward | Two guns, one of them Rare |
| Secret weapon cache SC1 | S3, on the hidden pillar SP3 (119, 0, −92) | One Epic gun (the best tier in this level's table) |
| Broccoli Head | — | Nothing. He flees |

**Ammo boxes and crates.** Ammo is deliberately lean here and mana is generous, so a spell is the
cheap answer and a magazine is the expensive one.

| Id | Type | Section, position | Rule it meets |
|---|---|---|---|
| AB1 | Bullets | S1 (30, 0, −84) | CP1 |
| AB2 | Sniper | S1 (76, 0, −95) | Rack W1; before E1 |
| AB3 | Shells | S1 (168, 0, −76) | CP2; before E2 |
| AB4 | Shells | S2 (6, 0, −57) | CP3; rack W2 |
| AB5 | Bullets | S2 (6, 0, −63) | Rack W3; before E3 |
| AB6 | Shells | S2 (26, 0, −60) | CP4 |
| AB7, AB8 | Bullets, shells | S2 (41, 0, −66), (41, 0, −54) | Inside [L1] |
| AB9 | Sniper | S2 (88, 0, −60) | CP5 |
| AB10 | Bullets | S3 (22, 0, −58) | Before E5 |
| AB11 | Shells | S3 (150, 0, −52) | Before E6 |
| AB12 | Bullets | S4 (24, 0, −41) | CP7; before E7 |
| AB13 | Rockets | S4 (12, 0, −22), in the potting shed | Before E7 |
| AB14, AB15 | Bullets, shells | S4 (40, 0, −52), (62, 0, −45) | Inside [L2] |
| AB16 | Rockets | S4 (40, 0, −36) | Rack W4, inside [L2] |
| AB17 | Shells | S4 (102, 0, −45) | CP8 |
| AB18 | Shells | S4 (110, 0, −40) | Before E8 |
| AB19, AB20 | Bullets, shells | S5 (49, 0, −52), (41, 0, −58) | Inside [L3]; rack W5 |
| AB21 | Sniper | S5 (45, 0, −117) | CP10 |
| AB22 | Bullets | S6 (36, 0, −8) | Before F2 |
| RC1, RC2, RC3 | Ammo crate (3 uses, to 50% of cap) | S2 (80, 0, −58); S4 (95, 0, −49); S5 (45, 0, −84) | Rewards of [L1], [L2], [L3] |
| DC1, DC2 | Depot crate (unlimited) | S3 (94, 0, −74); S5 (39, 0, −8) | CP6 and CP9 |

22 ammo boxes (8 bullets, 9 shells, 3 sniper, 2 rockets), 3 ammo crates, 2 depot crates.

**Ammo budget, Machine Gun** (tier-1 numbers; tier scaling cancels out)

| Line | Value |
|---|---|
| HP of everything in the level | 13,665 (164 enemies 8,675 without Wisps, Wisps 720, the Hex 3,000, totems 720, Broccoli Head 550) |
| Expected share for the Machine Gun | 45% = 6,150 HP. Spells, Yeet kills, pods and returned orbs 40%, other guns 15% |
| HP per bullet fired | 5 (10 a hit for an Uncommon MG, half the bullets hit) |
| **Asked of the MG** | 6,150 ÷ 5 = **1,230 bullets** |
| Bullet boxes | 8 × 60 = 480 |
| Ammo crates | 3 × 150 = 450 (one use each, arriving with about 90 bullets) |
| Depot crates | 2 × 300 = 600 (arriving with about 180) |
| Enemy drops | 7 packs × 45 = 315 (about 12 ammo packs from 164 kills, 60% of them bullets by the smart-drop rule) |
| **Placed plus drops** | **1,845 bullets = 1.50 ×** what is asked. PLAN §7.4 asks for at least 1.5, and this level gives no more |

**Mana blooms** (50 mana, regrow in 20 s)

| Id | Section, position | Why it is there |
|---|---|---|
| MB1 | S1 (52, 0, −92) | The pod range cannot run dry: three Yeets cost 60 |
| MB2 | S1 (108, 0, −86) | Middle of E1, in the open between cabbages. Mana for the price of standing under mortars |
| MB3 | S1 (174, 0, −80) | The Wisp intro starts with a full bar |
| MB4 | S1 (228, 4.5, −57) | Barn loft. Reward for taking the barn in E2 |
| MB5 | S2 (19, 0, −92) | A 22 m detour in corridor C, before the trimmer gate and the court |
| MB6, MB6b | S2 (79, 0, −66), (41, 0, −48) | Inside [L1], in opposite corners and behind topiaries, out of the roof Leech's sight. Whichever Leech you face, one bloom is behind you |
| MB7 | S2 (96, 0, −60) | 10 m before the bark-capped conduit (45 mana) |
| MB8 | S3 (22, 0, −66) | Before the first Bark Brute (Yeet 20, or Goo and Zap 45) |
| MB9 | S3 (96, 0, −60) | The camp. The buddy gate costs 50 |
| MB10 | S3 (152, 0, −58) | Between the plates. A second Swarm if the first is lost |
| MB11 | S3 (202, 0, −50) | Far bank, after E6 |
| MB12, MB13, MB14 | S4 (37, 0, −56), (94, 3.5, −65), (74, 0, −45) | Inside [L2]: by the entry, on the catwalk, and mid-floor in the Leech's range, so wave 3 makes you choose |
| MB15 | S4 (112, 0, −60) | E8: the Wisps arrive last |
| MB16 | S5 (45, 0, −30) | Tunnel. Enter the arena full |
| MB17, MB18, MB19 | S5, radius 24 at bearings 60, 180, 300 | Inside [L3], between the totems, outside the 9 m aura and inside the dry ring after the flood |
| MB20 | S6 (16, 0, −40) | West edge of the patch, behind planters, away from Broccoli Head |

**Mana budget** at 100 max and 5 /s (no batteries)

| Line | Value |
|---|---|
| Damage by spells | 40% of 13,665 = 5,470 HP at about 3.5 HP per mana (a full Chain Zap chain is 4.5, a Goo Bolt 2.7) = 1,560 mana |
| Locks and commands | Pod range 60, trimmer 15, CD1 30, CD2 45, buddy gate 50, plates 50, totems about 150, Yeets on bridges and in the finale about 100 = 500 |
| Drained | 5 Leeches × about 4 s × 8 = 160; the aura about 10 s × 15 = 150. Together 310 |
| **Asked** | **2,370 mana** |
| Regen | 1,287 s × 5 /s, with the bar below full 60% of the time = 3,860 |
| Blooms | 21 once = 1,050; the 8 lockdown blooms twice more = 800 |
| Mana Surge | 2 × 20 s × 15 extra /s = 600 |
| Shrines, orbs | Shrine refills 120; Wisp orbs 16 × 10 = 160; Leech refunds 125; Hex orbs 9 × 2 × 25 = 450 |
| **Given** | **7,165 mana = 3.0 ×** what is asked. With both earlier batteries (120 and 6 /s) regen is 4,630 and the ratio is 3.3 |

No single lock costs more than 50 mana and no combo more than 80 (Swarm and Zap), so a 100-mana
bar is always enough, and every lock has a bloom within 15 m.

**Power-ups**: Turbo PU1 at the head of Bridge 2 (S3) and PU4 at ramp R1 (S6). Mana Surge PU2 on the
Hothouse catwalk (S4) and PU3 on the compost heap at the start of F1 Part 2 (S5).

**Secrets**

| Secret | Where | How |
|---|---|---|
| Golden Bonk: **Floor Is Lava** | S1, top leaf of the beanstalk (244, 22.5, −145.5) | Four mushroom pads up the stalk |
| Mana Battery | S2 (108, 0.5, −104), far end of corridor B's north side | The north-side loop, 78 m past the H1 north gap |
| Secret weapon cache | S3, pillar SP3 (119, 0, −92) | From stepping pillar SP1, the pad that points away from the route |
| Audit File 1 | S1, on scarecrow tower T1 | Pad MP1. "Invoice: 400 scarecrows. None of them scare." |
| Audit File 2 | S2 (101, 0, −54), a dead end against the exit corridor | Walk corridor C round to the east side. "The maze is a tax shelter. Nothing in the middle is declared." |
| Audit File 3 | S4, roof of the potting shed | Crate, then a double jump. "Shipment 6: to Los Angeles, by cloud." |

## 13. Difficulty

| Compared with L02 | L03 |
|---|---|
| Tier | 3 (×1.32) against 2 (×1.15) |
| Pressure limits | The same: `maxAlive` 10, 3 roles, 1 elite. The rise comes from what the roles are |
| New enemy types | 7, against 4 in L02. Two of them punish a guns-only habit |
| Resource under attack | Mana, for the first time (Leeches, the aura) |
| Ammo | Lean: 1.5× and no more |
| Hazard | Toxic runoff inside five fights (E5, E6, E7, E8, F1) |
| Lockdowns | Three, the longest 3.3 minutes without a checkpoint |
| Finale | Two stages and an escape. The first mini-boss with an intermission |

| Setting | Easy | Heroic |
|---|---|---|
| `maxAlive` | 8 | 10, and queued spawns arrive 30% sooner |
| Fodder per squad | −25% (rounded down, at least 1) | +25% |
| Leech drain, Hex aura | 5 /s, 10 /s | 12 /s, 15 /s with a 11 m aura |
| Mana blooms | Regrow in 12 s | Regrow in 30 s |
| Ammo | Boxes give +50% | Unchanged |
| Bark | Softened lasts 6 s | Hard bark also ignores the back knot until a spell opens it |
| Added enemies | None | E5-c adds bigObama ×1. E7 wave 4 adds robotShooter ×1 on the catwalk. E2 gets an elite hexWisp |
| Totems | 180 HP | 300 HP, and the Hex fires its ring every 8 s |
| Runoff in F3 | 0.14 m/s | 0.22 m/s |
| Lockdown wave timer | 35 s | 20 s |

## 14. Engine needs

Uses **E1** (solids, kill zone and rescue), **E2** (line of sight for Leech beams, perception, cover
queries for Sprouts), **E3** (nav grid, pad links, burrow points), **E4** (squads, triggers,
objectives `clearAll`, `switch`, `escape`, `boss`; lockdowns), **E5** (sphere, cone, disc, the new
materials, prefabs, the `look` view), **E6** (jump pad, rope bridge, energy bridge, hazard zones,
rising hazard, mover, door, depot, target), **E7** (`floretSprout`, `sewerMidget`, `daycare`, and
the returning `boomMidget`, `riotMidget`, `hexAcolyte`), **E8** (`hexWisp`, `barkBrute`,
`manaLeech`, `gooGlob`), **E10** (shrines, Yeet, the reworked Goo Bolt, Chain Zap and Swarm,
conduit, gooGear, pressure plate, seed pod, mana bloom, Mana Surge), **E11** (the seed-pod blast),
**E12** (the Hex part script and walled arena; Broccoli Head stage 1 with a flee), **E13**, **E14**,
**E15**, **E16** (no Magic levels, spell unlockables, Mana Battery) and **E17** (loot table, chests,
ammo boxes and crates). It does not use E9.

Needs that PLAN §10 does not name:

| # | Need | Why |
|---|---|---|
| 1 | `hexAuditor` takes an arena centre and radius | `HEX()` in `src/sim/bosses.js` clamps to the global `ARENA_R` and teleports about the world origin. PLAN E12 mentions only the charge of the physical bosses |
| 2 | Part-script hooks on `hexAuditor`: replace its 2 s transition at 60% with the intermission, switch the aura radius, scale the weak-spot orbit speed | Must not change Wave Mode behaviour |
| 3 | Projectile ownership swap for Yeet | A returned orb has to hurt its owner |
| 4 | Per-source damage multipliers and the bark state machine | Wisps, Brutes and totems |
| 5 | `ghost` movement (ignores solids, stays inside the encounter bounds) | Hex Wisps |
| 6 | Hazard zones with their own dps for enemies | Yeet into runoff |
| 7 | `conduit` with `barkCap`; `energyBridge` driven by plates; `ropeBridge` reset; `daycare` spawn budget; buddy "park" and "command" | §11 |
| 8 | `hazardZone` sets that a boss script switches on | The flooded ring |

Notes on PLAN.md:

1. **Enemy floor against the par.** By the §3 table, 160 enemies cost at least 12.5 minutes of combat
   even at 70% fodder. With two depots, a 3-minute mini-boss, a flee and 1.27 km of route, the level
   lands at 21:27. It cannot reach 20:00 without going under 160 enemies.
2. **Checkpoints.** §3 asks for 8 to 10 checkpoints no more than 2.5 minutes apart. §5.6 allows a
   lockdown of 3.5 minutes that restarts at wave 1. [L2] (3:20) and [L3] (3:05) break the first
   rule by obeying the second.
3. **Lockdown wave timer.** A new wave every 25 s puts all four waves of [L2] in the room within
   75 s, while the §3 table says they take 200 s to kill. `maxAlive` holds the count, but the
   "3 roles at once" rule cannot be guaranteed inside a lockdown.
4. **Coordinates.** "+z south" with the origin at the south-west corner makes every z negative and
   leaves a terrain's `origin` ambiguous. This document uses the minimum corner for terrain.
5. **Spell reworks and Wave Mode.** §12 re-pins the Wave Mode hashes once, in E16. Goo puddles and
   Conductive (E10) change how spells play in Wave Mode too, so either they land in the E16 PR or
   the hashes move a second time.
6. **Hub contract.** `docs/shooter-server-contract.md` names "L03 S4-E4" as the flee that is not
   issuable. Here it becomes S6, encounter F2. The contract text has to follow (E15).
7. **Mini-boss time.** §3 gives one figure for a mini-boss and does not say whether its adds are
   inside it. This document puts them inside.

## 15. Bot route and tests

Bot route (god mode, nav-following autopilot, fixed seed):

1. S1: truck → SH-YEET (interact) → Yeet pod 2 at the barricade twice → E1 clear → pad MP3 → E2
   clear → gate.
2. S2: racks → main route through the rings → E3 clear (on `burrowWarn`, aim at the mound) → Goo
   GG1, pass the trimmer → threshold → [L1] four waves (Zap CD1 when 3 or more enemies are inside
   8 m of the gazebo) → Goo then Zap CD2 → exit.
3. S3: Yeet the Brute off Bridge 1 → E5 clear → depot → SH-SWARM → stand 2 m from the gate, cast
   Swarm, look at PP0, cast → pass → sprint Bridge 2 → E6: stand on PP1, cast Swarm, look at PP2,
   cast → cross Bridge 3.
4. S4: threshold → [L2] four waves (bazooka at each nest core) → E8 clear → gate.
5. S5: depot → threshold → Part 1 (Yeet when 3 or more orbs are inside the cone) → Part 2 (Goo then
   Zap each totem, clockwise from TOT-SE) → Part 3 (stay inside radius 24 after the flood).
6. S6: F2 until the flee → R1 → pad S6-MP1 → R3 → truck.

Tests (`tests/levels/L03.test.js` and the level validator):

| Test | Checks |
|---|---|
| Validator | Every section under 600 solids, no solid under 0.5 m, every rack has a `why`, ids unique |
| Reachability | Every checkpoint reaches the exit. Each lockdown is sealed while locked: no pad arc, carpet or double jump leaves the room |
| Pacing | The §3 estimate is 1,287 s ± 5, inside 18 to 22 min |
| Counts | 164 enemies by type as in §8. Peak alive never above 10 in a bot run |
| Lockdowns | 3, each with 3 or more spawn points on different sides, 25 to 45 enemies, 2 boxes inside, a chest and a crate on clear, a checkpoint outside the entry |
| Mana soft-lock | Start each spell lock at 0 mana with blooms used: regen alone opens it in under 20 s |
| Guns only | A bot that never casts finishes E1 to E8 except the buddy gate and Bridge 3, and kills the Hex through the totem roots |
| Bark | Hard bark takes 0 from bullets. Goo, Zap, toxic and a pod each change the state as §9 says |
| Yeet | A returned orb damages the Hex. A Brute yeeted off Bridge 1 dies. A Glob yeeted off Bridge 3 does not split |
| Collapsing bridge | Bridge 2 resets after a rescue. Bridge 3 stays once the far bank is reached |
| Finale | Parts end at 60% and 0%. The ring floods at 25%. Guards die with their totem. Broccoli Head flees at 50% and no boss kill is recorded |
| Escape | The truck is reachable in 41 s at 5.5 m/s before the runoff reaches y 8.5 at 47 s |
| Ammo and mana | Placed bullets plus the expected drops are 1.5 × the 1,230 asked. Every lock has a bloom within 15 m |
| Determinism | Two bot runs with one seed give the same state hash at every checkpoint |
| Pins | Wave Mode, Sandbox and PvP hashes do not move. `hexAuditor` Wave Mode behaviour is unchanged |

## 16. Build tasks

1. `prefabs/grove.js`: the 16 prefabs in §7.
2. `L03/index.js`: header (tier 3, par 1,200 s, no jetpack), section order, cutscene cards.
3. `L03/S1.js` to `S6.js`: blockout geometry from §6, floors and walls first. Run the validator.
4. Checkpoints, depots, racks, ammo boxes and crates, blooms, power-ups, secrets (§12).
5. Mechanisms in S1: shrine, seed pods, barricade, pads, canal, gate.
6. S2: ring hedges from the ring table, trimmer and `gooGear`, both conduits, the lockdown doors and lid.
7. S3: bridges, plates, buddy gate, pools, kill zone, stepping pillars.
8. S4: Hothouse shell, catwalks, lockdown doors, sump, compost yard.
9. S5: arena wall, lid, totems, pods, mounds, flood zones (off).
10. S6: bowl, terraces, ramps, barricade, levee gate, rising runoff, truck.
11. Enemy data: stat blocks and looks from §9 (with the E7 and E8 owners).
12. Encounters E1 to E3, E5, E6, E8 from the spawn timelines.
13. Lockdowns E4 and E7: waves, spawn points, rewards.
14. F1: part script, adds, totems, flood, lockdown, mini-boss drop.
15. F2 and F3: Broccoli Head stage 1 with the flee, the escape squads, level end.
16. Bot route (§15), `tests/levels/L03.test.js`, top-down map export.
17. Easy and Heroic tables (§13).
18. Playtest on Normal. Tune level data only until a human run lands between 17 and 23 minutes.
19. Run `npm run lint`, `typecheck`, `test`, `build`, `assets:check`, `budgets`, `profile:check`. Report any pin that moved.
