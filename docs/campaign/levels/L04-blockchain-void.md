# L04: The Blockchain Void

Level document for `docs/campaign/PLAN.md` (cited as **PLAN §x**). Plan only: nothing here is built.
Engine specs are `docs/codex/C-campaign-levels.md` (**C §x**) and `docs/codex/C-bosses-sproto-duel.md` (**B §x**).
This file replaces "L4: The Blockchain Void" in `docs/codex/C-level-designs.md`.

## 1. Header

| Field | Value |
|---|---|
| Id, name | `L04`, The Blockchain Void |
| Stage, lighting | `void`. Black sky with a green and purple aurora and a price-chart line across it. Candles and trims are emissive, so the route is lit by the world itself. Fog starts at 220 m |
| Tier | 4 (enemy HP and damage × 1.15³ = **1.52**) |
| Par | 20:00. The estimate in §4 is **21:25** |
| Jetpack | `'pickup'`: pedestal on the launch deck in S1. A second pedestal is in `SB` for boss runs from the hub |
| Enemy total | **152** = 112 in eight encounters + 40 boss adds, plus the two bosses. Each bitbug counts as one |
| Route length | **1,243 m** = 587 m on foot + 656 m in the air |
| Sections | 6: `S1` Genesis Block, `S2` Candle Forest, `S3` Liquidity Stream, `S4` Mine Field, `S5` Ledger Hub, `SB` The Exchange |
| Lockdown arenas | 3: **[L1]** `S2-E3` Trading Pit, **[L2]** `S4-E7` Clearing House, **[L3]** `SB-BOSS` |
| Checkpoints, depots | 10 checkpoints, 2 depots (S3 Stream Head, S5 vault) |
| Unlockables | Spell **Mana Shield** (shrine, S3), reward spell **Pump It**, **Mana Battery** (S5), gun type **Duck Gun** (secret cache, S4), Golden Bonk **Moon Boots** (S2), 3 Audit Files |
| Loot and ammo | Racks are Uncommon. 13 guaranteed guns. 36 ammo boxes, 3 ammo crates, 4 depot crates. Bullets budget 2.1× the ask (§12) |
| Finale | **Boss: Bitcoin Obama & The Midget**, a double fight in 5 parts, 4:10. Reward spell **Pump It** |
| Pressure rules | `maxAlive` 12 (6 bitbugs = 1 unit), 4 threat roles at once, 1 elite per section (S2 to S5), 2 kinds of hazard zone in a fight |

## 2. Concept

The first jetpack level. A floating exchange hangs in a dark void: start blocks, candlestick towers, a
canyon of red candles with a wind stream through it, a field of drifting mines, a ledger tower, and the
trading floor where the Pump & Dump Duo work. There is no ground. Below everything is a kill plane.

How it plays differently from L01 to L03: fights have **height**. The player learns to hop, hover and
drop, then is tested four ways: flocks that are swept, not aimed at (machine gun, Chain Zap); flyers that
match your altitude (Jet Obama); mines that are shot from range (sniper); and flak that only hurts a
player who is in the air, so the right answer is sometimes to land and walk.

Rhythm: ground warm-up → jetpack tutorial → sealed flock arena [L1] → vertical climb → flight card →
shrine and depot → flak corridor → sniping → sealed dogfight [L2] → ground-and-air objective → depot → boss [L3].

**Cutscene cards** (placeholder cards, C §3.19):

| Where | Kind | Title | Lines |
|---|---|---|---|
| Level start | `cutscene` | The Blockchain Void | "The money leaves the Grove and goes up." / "There is no floor on this exchange. Mind the gap." |
| S2 → S3 | `flight` | Liquidity | "Bitcoin Obama pumps the price. The Midget dumps it." / "You ride the chart." |
| S5 → SB | `cutscene` (boss card, B §4) | The Pump & Dump Duo | "Shiller shills." / "One counts. One flies." |

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Carried from L03: machine gun, shotgun, often a sniper, mostly Uncommon. A level-select start gets the tier-4 recommended loadout (C §3.14). Every gun has finite ammo, the machine gun included (PLAN §7.4) |
| Spells held at start | Goo Bolt, Chain Zap, Magic Carpet, Yeet, Sproto Swarm |
| Unlockable: spell | **Mana Shield**, at the shrine on the Stream Head island in S3, `(22, 0, 50)`, 45 m before the first flak pod. Spells are unlockables; there is no Magic level (PLAN §6.2) |
| Unlockable: Mana Battery | Hidden in S5 on a ledge under the south rim of the hub island, `(60, -9, 114)`. +10 max mana, +0.5 mana/s, kept for good |
| Unlockable: gun type | **Duck Gun** (always Legendary), in the secret cache on top of the Clearing House lid in S4, `(177, 30.6, 100)`. If the Zap Ray has landed (COOP_PLAN §6.3b) the L1 chest offers it first |
| Unlockable: reward spell | **Pump It** (B §6) for beating the Duo |
| Suggested quick slots | Chain Zap, Mana Shield, Yeet, Goo Bolt |
| World guns | Racks at the level's base tier, **Uncommon**: MG inside the Trading Pit (S2), sniper on the S4 entry deck, bazooka in the `SB` vestibule. Everything else is a drop (loot table in §12) |
| Movement taught | Thrust, hover, fast drop (C), fuel regen on landing, fuel pads, updrafts, wind lanes, void rescue |

| Spell | Use in this level |
|---|---|
| Chain Zap | Kills 4 of a 6-bitbug flock per cast. Powers conduits `c1` to `c4` (energy bridges). Pops Hex Acolyte bubbles. Stuns a flak pod 1.5 s |
| Goo Bolt | Jams a flak pod for 4 s (PLAN §6.2). Drops a flying target to the ground: Jet Obama, and the Midget in his flying stage (B §2.7) |
| Yeet | Turns flak shells round (slow projectiles). Shoves Balloon Midgets into Jet Obamas. Pushes anything into the gravity well |
| Mana Shield | Absorbs 60% of flak damage and all of its fuel drain. Takes the Mana Leech drain in S5 |
| Sproto Swarm | Buddies draw the flocks' dives in the two lockdowns |
| Magic Carpet | 3.5 s of fuel-free hover: the emergency crossing when fuel is at zero. It cannot leave a lockdown |

## 4. Time budget

Rules from PLAN §3. Combat = sum of enemy seconds × 1.3. Walking = metres ÷ 5.5. Flying = metres ÷ 8.
Enemy seconds used: midget, bitbug, boomMidget 3; flyingMidget, balloonMidget 5; obama, robotLaser 6;
riotMidget, hexAcolyte 8; jetObama, robotShooter 9; elite × 2. Two enemies have no row in PLAN §3, so
this document assumes **flakPod 9** (a static 160 HP target, the Shooter Bot class) and **manaLeech 8** (support).
Boss adds are killed inside the boss time and are not timed again. Cards and transform cinematics freeze the sim and are not counted.

| # | Beat | Section | Arithmetic | Seconds | Running | Intensity |
|---|---|---|---|---|---|---|
| 1 | `S1-E1` Welcome Desk | S1 | (8×3 + 2×6 + 2×3 = 42) × 1.3 = 54.6; walk 86 ÷ 5.5 = 15.6 | 70.2 | 1:10 | 0.30 |
| 2 | Jetpack pickup and three hops | S1 | stated 30; fly 96 ÷ 8 = 12.0 | 42.0 | 1:52 | 0.10 |
| 3 | `S1-E2` First Flight | S1 | (5×5 + 2×6 + 3×3 = 46) × 1.3 = 59.8; walk 58 ÷ 5.5 = 10.6 | 70.4 | 3:03 | 0.40 |
| 4 | **[L1]** `S2-E3` Trading Pit | S2 | (24×3 + 3×3 + 3×5 = 96) × 1.3 = 124.8; walk 95 ÷ 5.5 = 17.3 | 142.1 | 5:25 | 0.75 |
| 5 | `S2-E4` Bull Run | S2 | (3×9 + 1×6 + 1×12 = 45) × 1.3 = 58.5; fly 165 ÷ 8 = 20.6 | 79.1 | 6:44 | 0.60 |
| 6 | Depot A and Mana Shield shrine | S3 | depot 45; shrine 15; walk 30 ÷ 5.5 = 5.5 | 65.5 | 7:49 | 0 |
| 7 | `S3-E5` Gas Fees | S3 | (3×9 + 1×18 + 6×3 = 63) × 1.3 = 81.9; two conduits 5; gate pylon 4; walk 58 ÷ 5.5 = 10.6; fly 190 ÷ 8 = 23.8 | 125.2 | 9:55 | 0.70 |
| 8 | `S4-E6` Dust Sweep | S4 | (9×5 = 45) × 1.3 = 58.5; walk 15 ÷ 5.5 = 2.7; fly 115 ÷ 8 = 14.4 | 75.6 | 11:10 | 0.45 |
| 9 | **[L2]** `S4-E7` Clearing House | S4 | (3×9 + 1×18 + 4×5 + 1×9 + 16×3 = 122) × 1.3 = 158.6; walk 90 ÷ 5.5 = 16.4 | 175.0 | 14:05 | 0.90 |
| 10 | `S5-E8` Proof of Stake | S5 | (2×8 + 2×6 + 1×8 + 1×8 + 4×3 + 1×18 = 74) × 1.3 = 96.2; three nodes 9; walk 50 ÷ 5.5 = 9.1; fly 90 ÷ 8 = 11.3 | 125.5 | 16:11 | 0.70 |
| 11 | Depot B (vault) | S5 | depot 45; walk 65 ÷ 5.5 = 11.8 | 56.8 | 17:07 | 0 |
| 12 | **[L3]** `SB-BOSS` the Duo | SB | parts 30 + 60 + 40 + 75 + 45 = 250; walk 40 ÷ 5.5 = 7.3 | 257.3 | 21:25 | 1.00 |
| | **Total** | | combat 692.9 + boss 250 + depots 90 + stated 63 + walk 106.7 + fly 82.0 | **1,284.7 s = 21:25** | | |

- Par 20:00 ± 2:00 → 18:00 to 22:00. **21:25 is inside.** It sits high because 152 enemies at 3 s or more, plus 30%, is already 10 minutes before any traversal.
- Per section: S1 3:03, S2 3:41, S3 3:11, S4 4:11, S5 3:02, SB 4:17.
- Beats: 12 = 8 combat, 1 mechanism, 2 breathers, 1 finale. No two beats above 0.8 intensity are adjacent.
- Fast replay target: 15:00 (70% of the estimate). The pods in E5 can be bypassed; the lockdowns cannot.

**Enemy ledger** (E = elite, already counted in the number before it)

| Encounter | midget | boom | obama | robotLaser | flyingMidget | bitbug | jetObama | balloon | flakPod | riot | acolyte | manaLeech | robotShooter | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1-E1 | 8 | 2 | 2 | | | | | | | | | | | 12 |
| S1-E2 | 3 | | 2 | | 5 | | | | | | | | | 10 |
| S2-E3 [L1] | | 3 | | | 3 | 24 | | | | | | | | 30 |
| S2-E4 | | | 1 (E) | 1 | | | 3 | | | | | | | 5 |
| S3-E5 | | | | | | 6 | | | 4 (1 E) | | | | | 10 |
| S4-E6 | | | | | | | | 9 | | | | | | 9 |
| S4-E7 [L2] | | | | | | 16 | 4 (1 E) | 4 | 1 | | | | | 25 |
| S5-E8 | 4 | | 2 | | | | | | | 2 | 1 | 1 | 1 (E) | 11 |
| SB-BOSS adds [L3] | 7 | 5 | | | | 24 | | 4 | | | | | | 40 |
| **Level** | 22 | 10 | 7 | 1 | 8 | 70 | 7 | 17 | 5 | 2 | 1 | 1 | 1 | **152** |

## 5. Overview map

North is up. Each section has its own origin, so this map shows order, not world positions. `CPn` = checkpoint, `[L]` = lockdown.

```
 S1 GENESIS BLOCK 240 m                         S2 CANDLE FOREST 270 m, climbs 54 m
 [GEN]=eb1=[BLOCK 1]|[J] (h1)(h2)(h3) [MEMPOOL]==tunnel==>[ent]-chain-[L1 TRADING PIT]-|sl|sl| K8 K9/10 K11 K12/13 [ATH]
  CP1  c1    E1    CP2   tutorial       E2                       CP3    E3, MG rack  CP4      E4 Bull Run            ring
                                                                                                                       :
     ..................... flight card "Liquidity" ....................................................................:
     :
 S3 LIQUIDITY STREAM 270 m                                    S4 MINE FIELD 250 m
 (HEAD)--chain--(FP1)  R1 . R2 . R3 . R4  [MOUTH]==tunnel==>[ent]  . balloons .  [b9]-[L2 CLEARING HOUSE]-[exit]
  CP5  Depot A    E5 Gas Fees: FP2 FP3 FP4*  gate pylon       CP6    E6 Dust Sweep     CP7    E7, the well      CP8
       shrine         wind ->->->                             sniper rack                                         ||
                                                                                                                tunnel
 SB THE EXCHANGE 110 m                         S5 LEDGER HUB 140 m                                                ||
 [L3 trading floor, fire ring r 27.8]<=gate=[vestibule]<=card<=[VAULT Depot B]=eb5=( island r 42: Ledger tower, 3 nodes )<==
   SB-BOSS                                    CP10                 CP9              E8 Proof of Stake
```

## 6. Sections

**Conventions for every table below.** Metres. `+x` east, `+z` south, `y` up. All coordinates are
section-local and non-negative in x and z: the origin is the footprint corner with the smallest x and z, at
the height of the section's entry deck (y = 0). The route runs west to east, so maps read left to right.
`box` `at` is the centre and `size` is x × y × z. `cylinder` `at` is the base centre. "top" is the y of the
walkable top face. A row with several positions places the same shape at each. Prefab names are from §7.
Flyer altitudes are absolute section y, because there is no ground under most of the level.

### 6.1 S1 Genesis Block

Footprint 240 × 120 m, y from -40 (kill plane) to 70. Ground warm-up, then the jetpack and three hops. Route 240 m.

```
 1 char = 4 m (x). North up.
       x=0       40        80        120       160       200       240
 z=44  +------+  c1  +--[hutN]--+                              +-[stubN]-[hut]+
 z=52  | mono |  o   | t      s |#+-+         (h2)             |              |
 z=60  | S>  c|=eb1==| c  MM  c G|J |  (h1)    +3     (h3)     | c    w       |=chain=[tunnel]> S2
 z=68  |      |      | t      s |#+-+   0              +7      |     +8       |
 z=76  +------+      +--[hutS]--+                              +-[stubS]------+
       GEN  top 0     BLOCK 1 top 0   12 m   16 m   20 m gaps   MEMPOOL top 8
```

| id | shape | size (m) | at (x, y, z) | top | mat | purpose |
|---|---|---|---|---|---|---|
| s1.gen | box | 30 × 4 × 40 | (15, -2, 60) | 0 | metal | Genesis Block. Spawn (4, 0, 60) yaw 90. CP1 |
| s1.mono | box | 4 × 12 × 4 | (4, 6, 46) | 12 | gold | "Block #0" landmark behind the spawn |
| s1.genCr1-3 | crate ×3 | 1.6 × 1.2 × 1.6 | (12, 0.6, 52) (12, 0.6, 68) (22, 0.6, 60) | 1.2 | crate | cover facing the gap |
| s1.signZap | sign | 4 × 2 × 0.5 | (27, 3, 54) | | neon | "ZAP THE CONDUIT" |
| s1.c1post | box | 3 × 3 × 3 | (37, -0.5, 50) | 1 | metal | floating block; conduit `c1` on it at (37, 2, 50), 13.5 m from the edge of GEN |
| s1.blk1 | box | 36 × 4 × 40 | (62, -2, 60) | 0 | metal | Block 1 (x 44 to 80): arena of E1 |
| s1.hutN | hut | 6 × 3 × 5 | (62, 1.5, 42.5) | 3 | concrete | spawn door facing south at (62, 0, 45) |
| s1.hutS | hut | 6 × 3 × 5 | (62, 1.5, 77.5) | 3 | concrete | spawn door facing north at (62, 0, 75) |
| s1.tickA, tickB | ticker ×2 | 0.6 × 2 × 6 | (52, 1, 52) (52, 1, 68) | 2 | neon | full cover on the player's side |
| s1.srvA, srvB | server ×2 | 1.2 × 2 × 2.4 | (68, 1, 54) (68, 1, 66) | 2 | metal | full cover on the enemy side |
| s1.blkCr1-4 | crate ×4 | 1.6 × 1.2 × 1.6 | (48, 0.6, 60) (58, 0.6, 48) (58, 0.6, 72) (74, 0.6, 60) | 1.2 | crate | crouch cover |
| s1.wallN | box | 0.6 × 4 × 16 | (79.7, 2, 48) | 4 | metal | east wall, north of the gate (too high to jump) |
| s1.wallS | box | 0.6 × 4 × 16 | (79.7, 2, 72) | 4 | metal | east wall, south of the gate |
| s1.launch | box | 10 × 4 × 16 | (85, -2, 60) | 0 | metal | launch deck (x 80 to 90). CP2 |
| s1.dais | cylinder | r 2, h 0.5 | (85, 0, 60) | 0.5 | gold | jetpack pedestal; pickup at (85, 1.2, 60) |
| s1.signHold | sign | 4 × 2 × 0.5 | (88, 3, 54) | | neon | "HOLD SPACE TO FLY" |
| s1.h1 | island | r 6, h 3 | (108, -3, 60) | 0 | stone | hop 1: 12 m gap, level |
| s1.h2 | island | r 6, h 3 | (136, 0, 54) | 3 | stone | hop 2: 16 m gap, 3 m up. Sign "HOLD TO HOVER" |
| s1.h3 | island | r 6, h 3 | (168, 4, 62) | 7 | stone | hop 3: 20 m gap, 4 m up. Sign "C TO DROP" |
| s1.file1 | box | 4 × 0.5 × 4 | (136, -6.25, 54) | -6 | metal | ledge hanging under h2: Audit File 1 |
| s1.mem | box | 36 × 4 × 44 | (200, 6, 60) | 8 | metal | Mempool block (x 182 to 218, z 38 to 82). 8 m gap from h3 |
| s1.stubN | candle (up) | 6 × 8 × 6 | (198, 12, 46) | 16 | candleUp | perch 8 m above the deck |
| s1.stubS | candle (down) | 6 × 6 × 6 | (198, 11, 74) | 14 | candleDown | perch 6 m above the deck |
| s1.memHut | hut | 5 × 3 × 5 | (212, 9.5, 42.5) | 11 | concrete | spawn door facing south at (212, 8, 45) |
| s1.memCr1-3 | crate ×3 | 1.6 × 1.2 × 1.6 | (188, 8.6, 60) (204, 8.6, 54) (204, 8.6, 66) | 9.2 | crate | cover |
| s1.memWall | ticker | 0.6 × 2 × 8 | (210, 9, 60) | 10 | neon | full cover before the exit |
| s1.chainX | chain | 3 links | (218, 8, 60) → (224, 8, 60) | 8 | trim | walkable link to the tunnel |
| s1.tun | tunnel | 16 long, inner 6 × 4 | floor centre (232, 7.5, 60) | 8 | metal | Block 2 tunnel (x 224 to 240), the seamless connector |
| s1.vista1-8 | candle ×8 | 10 × 40 to 80 × 10 | x = 20, 60, 100, 140, 180, 220 at z 8; x = 80, 160 at z 112 | | candleUp / candleDown | vista only, off the route |

| Mechanism | Data | Notes |
|---|---|---|
| Kill plane | `killPlane({y: -40})` | Void rescue: back to the last safe ground, -25% max HP, 1 s invulnerable (C §3.9) |
| Conduit and energy bridge | `conduit c1` at (37, 2, 50) → `energyBridge eb1` from (30, 0, 60) to (44, 0, 60), width 4 | 14 m gap, twice a sprint jump. Taught before the jetpack, so the bridge is required here |
| Door | `gate1` 0.6 × 4 × 8 at (79.7, 2, 60), opens on `S1-E1.cleared` | |
| Jetpack | `pickup({kind:'jetpack'})` at (85, 1.2, 60) | Sets `p.jet.has` |
| Fuel pads | `fuelPad` at the centre of h1, h2, h3 | Each pad is also a safe point for void rescue |
| Exit door | at (239.7, 10, 60), opens when S2 is streamed in and `S1-E2.cleared` | |

**Transition out:** `seamless` through the Block 2 tunnel into S2.

### 6.2 S2 Candle Forest

Footprint 270 × 200 m, y from -40 to 100. The Trading Pit lockdown, then a 54 m climb up a rising chart. Route 260 m.

```
 Top view, 1 char = 4 m.                                         Side view (x against y)
      x=0   20   40        92  112 132 154   176   200   222   252     y 54                                      [ATH]
 z=74            +---N----+   |   |                                      48                             K12* K13
 z=80            |pk1  pk2|   |   |       [K9]         [K12*]            42                       [K11] ^V4
 z=90  +--+      |        |   |   |                                      30                  K9 K10
 z=100 |en|=ch=[]> I pk5 O<[] sl1 sl2 [K8]      [K11]        [ATH]>>     24  ....lid.....
 z=110 +--+      |        |   |   |                                      20  : pk5 16   :     [K8] ^V3
 z=120           |pk3  pk4|   |   |       [K10]        [K13]             12  : pk2 pk4  :  sl2
 z=126           +---S----+   |   |                                       6  : pk1 pk3  : sl1
       I = entry door, O = exit door, * = hollow candle (Golden Bonk)     0 [en]=[ PIT ]=
       N, S = wall vents (spawn points)                                 -12            == Order Book ==
```

| id | shape | size (m) | at (x, y, z) | top | mat | purpose |
|---|---|---|---|---|---|---|
| s2.ent | box | 20 × 4 × 20 | (10, -2, 100) | 0 | metal | entry deck |
| s2.chainIn | chain | 6 links | (20, 0, 100) → (32, 0, 100) | 0 | trim | walkable link to the porch |
| s2.porchW | box | 8 × 4 × 12 | (36, -2, 100) | 0 | metal | west porch (x 32 to 40). **CP3**, just outside the entry door |
| s2.pit | box | 52 × 4 × 52 | (66, -2, 100) | 0 | metal | Trading Pit floor (x 40 to 92, z 74 to 126) |
| s2.pitRoom | lockRoom | inner 50 × 50, lid at y 24 | min (41, 0, 75), max (91, 24, 125) | | forceField | four energy walls and the lid. Doors on the west and east walls |
| s2.pitIn | door slab | 0.6 × 6 × 4 | (40.3, 3, 100) | | neon | entry door. Threshold disc line at x 47 |
| s2.pitOut | door slab | 0.6 × 6 × 4 | (91.7, 3, 100) | | neon | exit door |
| s2.pk1 | candle (up) | 8 × 6 × 8 | (54, 3, 86) | 6 | candleUp | low cover, north-west |
| s2.pk2 | candle (down) | 8 × 10 × 8 | (78, 5, 86) | 10 | candleDown | north-east |
| s2.pk3 | candle (down) | 8 × 8 × 8 | (54, 4, 114) | 8 | candleDown | south-west |
| s2.pk4 | candle (up) | 8 × 12 × 8 | (78, 6, 114) | 12 | candleUp | south-east |
| s2.pk5 | candle (up) | 6 × 16 × 6 | (66, 8, 100) | 16 | candleUp | centre, the high perch. Fuel pad on top |
| s2.pitCr1-4 | crate ×4 | 1.6 × 1.2 × 1.6 | (48, 0.6, 108) (60, 0.6, 78) (72, 0.6, 122) (86, 0.6, 108) | 1.2 | crate | crouch cover |
| s2.pitT1, T2 | ticker ×2 | 0.6 × 2 × 6 | (60, 1, 100) (84, 1, 92) | 2 | neon | full cover |
| s2.pitHut | hut | 5 × 3 × 5 | (88, 1.5, 78) | 3 | concrete | spawn point `PIT-E`, door facing west at (85.5, 0, 78) |
| s2.pv1, pv2 | vent ×2 | r 3, h 0.5 | (46, 0, 80) (86, 0, 120) | 0.5 | metal | updrafts to y 18 |
| s2.porchE | box | 8 × 4 × 12 | (96, -2, 100) | 0 | metal | east porch (x 92 to 100). **CP4** on clear |
| s2.book | box | 60 × 2 × 70 | (135, -13, 100) | -12 | glass | Order Book: safety floor under the sliders and K8 (x 105 to 165) |
| s2.v1, v2 | vent ×2 | r 3, h 0.5 | (122, -12, 100) (144, -12, 112) | -11.5 | metal | updrafts from the Order Book up to y 14 |
| s2.rail1 | box | 0.6 × 0.6 × 60 | (112, 3.7, 100) | | trim | rail, z 70 to 130 |
| s2.sl1 | mover | 8 × 2 × 8, with a 0.6 × 1.2 × 8 parapet on its east edge | path (112, 5, 74) ↔ (112, 5, 126) | 6 | metal | slider 1, 4 m/s. Ferry and moving cover |
| s2.rail2 | box | 0.6 × 0.6 × 60 | (132, 9.7, 100) | | trim | rail |
| s2.sl2 | mover | 8 × 2 × 8, with parapet | path (132, 11, 126) ↔ (132, 11, 74) | 12 | metal | slider 2, opposite phase |
| s2.k8 | candle (up) | 12 × 20 × 12 | (154, 10, 100) | 20 | candleUp | first tall candle. Vent `v3` on top, fuel pad |
| s2.k9 | candle (down) | 8 × 18 × 8 | (176, 21, 80) | 30 | candleDown | stepping candle |
| s2.k10 | candle (up) | 8 × 22 × 8 | (176, 23, 120) | 34 | candleUp | Laser Bot perch |
| s2.k11 | candle (up) | 12 × 24 × 12 | (200, 30, 100) | 42 | candleUp | vent `v4` on top, fuel pad |
| s2.k12 | hollowCandle | outer 10 × 20 × 10, walls and floor 1 thick | (222, 38, 80) | rim 48, floor 29 | candleDown | open top. **Golden Bonk** inside at (222, 29, 80) |
| s2.k13 | candle (up) | 8 × 24 × 8 | (222, 40, 120) | 52 | candleUp | flank route to the top |
| s2.k14 | candle (up) | 20 × 30 × 20 | (252, 39, 100) | 54 | candleUp | "All-Time High" (x 242 to 262) |
| s2.athT1, T2 | ticker ×2 | 0.6 × 2 × 6 | (246, 55, 94) (246, 55, 106) | 56 | neon | cover for the elite |
| s2.athSrv | server | 1.2 × 2 × 2.4 | (254, 55, 100) | 56 | metal | cover |
| s2.ring | disc | r 3 | (259, 54, 100) | | neon | launch ring: the trigger of the flight transition |
| s2.vista1-10 | candle ×10 | 10 × 60 to 120 × 10 | z 30 and z 170, x every 50 from 20 | | mixed | vista only |

| Mechanism | Data | Notes |
|---|---|---|
| Kill plane | `killPlane({y: -40})` | |
| Lockdown **[L1]** | `lockdown({id:'L1', entry:'s2.pitIn', exit:'s2.pitOut', encounter:'S2-E3', threshold: x 47})` | PLAN §5.6. The lid is at 24 m, so the jetpack works inside and cannot leave |
| Updrafts | `hazardZone({kind:'updraft'})`: pv1 (43..49, 0..18, 77..83); pv2 (83..89, 0..18, 117..123); v1 (119..125, -12..14, 97..103); v2 (141..147, -12..14, 109..115); v3 (151..157, 20..38, 97..103); v4 (197..203, 42..56, 97..103) | +30 m/s² up inside: net +8 against gravity. v3 and v4 are the lifts of the climb |
| Sliding blocks | `mover` sl1, sl2, `mode:'pingpong'`, speed 4 | Gaps: porch to sl1 8 m, sl1 to sl2 12 m, sl2 to K8 12 m and 8 m up |
| Fuel pads | on pk5, K8, K11, K14 | |
| Rack | `rack({id:'mg-pit', at:(50, 0, 94), gun:'mg', why:'bitbug flocks in S2-E3'})` | Uncommon. 3 m past the threshold, inside the room. Bullets boxes at (50, 0, 106) and (80, 0, 104) |

**Transition out:** `flight` card "Liquidity", triggered at `s2.ring` after `S2-E4.cleared`.

### 6.3 S3 Liquidity Stream

Footprint 270 × 120 m, y from -40 to 80. Depot, shrine, then a 170 m canyon of red candles ("the Spread") with a tailwind and four flak pods. Route 278 m.

```
 1 char = 4 m. North up.
      x=0       40        80        120       160       200       240     270
 z=30                        #     #     #     #     #     #     #          north wall of the Spread
 z=46                               (FP2)              (FP4*)       py
 z=53                      ====slA=========
 z=52                                    (R2)
 z=60  (HEAD D)--chain--(FP1)    wind ->  ->  ->  ->  ->  ->  ->     [MOUTH |gate]> S4
 z=68       S B             (R1)c2\eb2   ====slB========(R3)c3\eb3(R4)
 z=74                                         (FP3)
 z=90                        #     #     #     #     #     #     #          south wall
 z=104                                      (file2)
 Heights: HEAD 0, FP1 0, R1 2, FP2 4, R2 2, FP3 -6, R3 -2, FP4 10, R4 -2, MOUTH -2. D depot, S shrine, B mana bloom, py gate pylon.
```

| id | shape | size (m) | at (x, y, z) | top | mat | purpose |
|---|---|---|---|---|---|---|
| s3.head | island | r 16, h 4 | (18, -4, 60) | 0 | stone | Stream Head (x 2 to 34). Arrival (14, 0, 60). CP5 |
| s3.depotWall | box | 0.6 × 3 × 8 | (4, 1.5, 60) | 3 | metal | back wall of Depot A |
| s3.shrine | cylinder | r 2.5, h 0.5 | (22, 0, 50) | 0.5 | gold | dais of the Mana Shield shrine |
| s3.bloom | disc | r 1.5 | (22, 0, 70) | | neon | mana bloom |
| s3.sign | sign | 4 × 2 × 0.5 | (30, 3, 56) | | neon | "FLAK HITS FLYERS. WALK, SHIELD OR SNIPE." |
| s3.chainA | chain | 10 links | (34, 0, 60) → (54, 0, 60) | 0 | trim | 20 m walkable link: the grounded way to FP1 |
| s3.isl1 | island | r 7, h 3 | (61, -3, 60) | 0 | stone | island of FP1 (x 54 to 68). FP1 stands at (63, 0, 60) |
| s3.isl1Cr1, 2 | crate ×2 | 1.6 × 1.2 × 1.6 | (56, 0.6, 57.5) (56, 0.6, 62.5) | 1.2 | crate | cover at the end of the chain |
| s3.wallN1-7 | candle (down) ×7 | 10 × 60 × 10 | (x, 10, 30), x = 95, 120, 145, 170, 195, 220, 245 | 40 | candleDown | north wall, y -20 to 40 |
| s3.wallS1-7 | candle (down) ×7 | 10 × 60 × 10 | (x, 10, 90), same x | 40 | candleDown | south wall |
| s3.r1 | island | r 6, h 3 | (100, -1, 70) | 2 | stone | rest 1: fuel pad, conduit `c2` |
| s3.r1Wall | box | 0.6 × 1.2 × 5 | (104, 2.6, 70) | 3.2 | metal | crouch cover on the east side |
| s3.c2post | cylinder | r 0.5, h 2 | (98, 2, 74) | 4 | metal | conduit `c2` at (98, 4.5, 74) |
| s3.p2 | podIsle | r 4, h 3 | (122, 1, 46) | 4 | stone | FP2 |
| s3.railA | box | 70 × 0.6 × 0.6 | (120, 7.7, 53) | | trim | rail of slab A |
| s3.slA | mover | 10 × 8 × 1.5 | path (90, 12, 53) ↔ (150, 12, 53) | 16 | metal | slab shield between the lane and FP2 (y 8 to 16), 8 m/s |
| s3.r2 | island | r 6, h 3 | (142, -1, 52) | 2 | stone | rest 2: fuel pad |
| s3.r2Wall | box | 0.6 × 1.2 × 5 | (146, 2.6, 52) | 3.2 | metal | crouch cover |
| s3.p3 | podIsle | r 4, h 3 | (164, -9, 74) | -6 | stone | FP3, below the lane |
| s3.railB | box | 70 × 0.6 × 0.6 | (182, 1.7, 68) | | trim | rail of slab B |
| s3.slB | mover | 10 × 8 × 1.5 | path (150, 6, 68) ↔ (214, 6, 68) | 10 | metal | slab shield between the lane and FP3 (y 2 to 10), 8 m/s |
| s3.r3 | island | r 6, h 3 | (186, -5, 66) | -2 | stone | rest 3: fuel pad, conduit `c3` |
| s3.r3Wall | box | 0.6 × 2 × 5 | (190, -1, 66) | 0 | metal | full cover against FP4 |
| s3.c3post | cylinder | r 0.5, h 2 | (184, -2, 70) | 0 | metal | conduit `c3` at (184, 0.5, 70) |
| s3.p4 | podIsle | r 4, h 3 | (208, 7, 48) | 10 | stone | FP4, the elite pod, above the lane |
| s3.r4 | island | r 6, h 3 | (230, -5, 58) | -2 | stone | rest 4: fuel pad |
| s3.mouth | box | 24 × 4 × 28 | (258, -4, 60) | -2 | metal | Stream Mouth (x 246 to 270, z 46 to 74). 10 m gap from R4 |
| s3.mouthWall | ticker | 0.6 × 2 × 6 | (250, -1, 60) | 0 | neon | full cover on landing |
| s3.gatePylon | pylon (target) | r 0.8, h 5 | (252, -2, 52) | 3 | metal | powers the mouth gate. Same prefab as the boss pylons |
| s3.tun | tunnel | 12 long, inner 6 × 4 | floor is s3.mouth, x 258 to 270 | | metal | connector to S4 |
| s3.fileIsl | island | r 3, h 2 | (158, -3, 104) | -1 | stone | behind the south wall, through the gap at x 150 to 165: Audit File 2 |

| Mechanism | Data | Notes |
|---|---|---|
| Kill plane | `killPlane({y: -40})` | |
| Depot A | `depot({at:(8, 0, 60), yaw: 90})` | PLAN §7.7: depot crate (unlimited ammo), health station, spell loadout bench, ticket shop terminal, checkpoint. Safe zone on the whole Stream Head |
| Spell shrine | `spellShrine({at:(22, 0.5, 50), spell:'manaShield'})` | Grants Mana Shield, refills mana, saves a checkpoint |
| Mana bloom | `manaBloom` at (22, 0, 70) | +50 mana, regrows in 20 s |
| Wind lane | `hazardZone({kind:'wind', min:(80, -8, 44), max:(250, 34, 76), force:(6, 0, 0)})` | Tailwind: about 14 m/s eastward in the lane. Flying back west is slow |
| Sliding slabs | `mover` slA, slB, `mode:'pingpong'`, 1 s pause at each end | Fly beside a slab to keep it between you and the pod |
| Energy bridges | `c2` → `eb2` from (106, 2, 68) to (136, 2, 54), width 4. `c3` → `eb3` from (192, -2, 65) to (224, -2, 59), width 4 | Flat decks at island height. A player walking on one is grounded, so no pod fires |
| Gate | door at (258.3, 0, 60), opens on `target s3.gatePylon destroyed` | The pylon is inside FP4's range: kill the pod, or zap `c3` and walk under it |
| Fuel pads | R1, R2, R3, R4 | |

**Transition out:** `seamless` through the mouth tunnel into S4.

### 6.4 S4 Mine Field

Footprint 250 × 200 m, y from -60 to 90. A field of floating blocks with drifting mines and a crosswind, then the Clearing House lockdown over a gravity well. Route 220 m.

```
 1 char = 4 m. North up.                                              Side view of the Clearing House (x against y)
      x=0   24    44    68     96    116   132 146           208  230   y 30 ===================== lid
 z=62                 wind v   v   v  (C: 3 balloons)                    20           [hb5]
 z=72              [b4]         [b7]         +------N-------+            14   [hb3]
 z=84        [b1]                            |hb1      hb2  |            12              [hb2]
 z=92                     [b6]               |  s  +--+  s  |            10   [hb1]
 z=100 [ent ]   A:ooo  [b3] B:ooo      [b9][]I  t  |()|  t  O[exit ]>     8                  [hb4]
 z=108  rack                    [b8]         |  s  +--+  s  |             0 __floor__|    |__floor__
 z=116       [b2]                            |hb3      hb4 H|            -8          ( well )
 z=124                [b5]                   +------S-------+
      () = hole 16 × 16 with the gravity well under it.  H = floor hatch.  I, O = doors.  N, S = wall vents.
```

| id | shape | size (m) | at (x, y, z) | top | mat | purpose |
|---|---|---|---|---|---|---|
| s4.ent | box | 24 × 4 × 24 | (12, -2, 100) | 0 | metal | entry deck. CP6. Sniper rack (16, 0, 94), sniper box (16, 0, 106) |
| s4.entWall | box | 0.6 × 1.2 × 8 | (22, 0.6, 100) | 1.2 | metal | crouch wall to snipe over. Sign "POP THEM FROM HERE" |
| s4.b1 | box | 10 × 6 × 10 | (44, -1, 84) | 2 | metal | field block |
| s4.b2 | box | 8 × 8 × 8 | (50, 2, 116) | 6 | metal | field block |
| s4.b3 | box | 14 × 4 × 8 | (68, 6, 98) | 8 | metal | first landing, 44 m from the deck |
| s4.b4 | box | 6 × 6 × 6 | (74, -7, 74) | -4 | metal | lowest block: Audit File 3 |
| s4.b5 | box | 10 × 10 × 10 | (88, 7, 124) | 12 | metal | high southern block |
| s4.b6 | box | 8 × 4 × 14 | (96, 0, 92) | 2 | metal | second landing |
| s4.b7 | box | 12 × 6 × 12 | (110, 9, 72) | 12 | metal | northern block, upwind |
| s4.b8 | box | 6 × 12 × 6 | (116, 0, 112) | 6 | metal | pillar block |
| s4.b9 | box | 12 × 4 × 12 | (132, 4, 100) | 6 | metal | last landing (x 126 to 138): fuel pad, sniper box |
| s4.b9Wall | box | 0.6 × 1.2 × 6 | (128, 6.6, 100) | 7.2 | metal | crouch cover facing back at the field |
| s4.porchW | box | 8 × 4 × 12 | (142, -2, 100) | 0 | metal | west porch (x 138 to 146). **CP7**, just outside the entry door |
| s4.chFloorN | box | 62 × 4 × 23 | (177, -2, 80.5) | 0 | metal | Clearing House floor, north strip (z 69 to 92) |
| s4.chFloorS | box | 62 × 4 × 23 | (177, -2, 119.5) | 0 | metal | south strip (z 108 to 131) |
| s4.chFloorW | box | 23 × 4 × 16 | (157.5, -2, 100) | 0 | metal | west strip (x 146 to 169) |
| s4.chFloorE | box | 23 × 4 × 16 | (196.5, -2, 100) | 0 | metal | east strip (x 185 to 208). The four strips leave a 16 × 16 hole at the centre |
| s4.chRoom | lockRoom | inner 60 × 60, lid at y 30 | min (147, 0, 70), max (207, 30, 130) | | forceField | four energy walls and the lid |
| s4.chIn | door slab | 0.6 × 6 × 4 | (146.3, 3, 100) | | neon | entry door. Threshold disc line at x 153 |
| s4.chOut | door slab | 0.6 × 6 × 4 | (207.7, 3, 100) | | neon | exit door |
| s4.hb1 | box | 8 × 3 × 8 | (159, 8.5, 82) | 10 | metal | upper level, north-west |
| s4.hb2 | box | 8 × 3 × 8 | (195, 10.5, 82) | 12 | metal | upper level, north-east |
| s4.hb3 | box | 8 × 3 × 8 | (159, 12.5, 118) | 14 | metal | upper level, south-west |
| s4.hb4 | box | 8 × 3 × 8 | (195, 6.5, 118) | 8 | metal | upper level, south-east |
| s4.hb5 | box | 6 × 3 × 6 | (177, 18.5, 100) | 20 | metal | "the bell": high block over the hole. Overshield on it |
| s4.chSrv1-4 | server ×4 | 1.2 × 2 × 2.4 | (154, 1, 92) (154, 1, 108) (200, 1, 92) (200, 1, 108) | 2 | metal | full cover |
| s4.chCr1-4 | crate ×4 | 1.6 × 1.2 × 1.6 | (165, 0.6, 76) (189, 0.6, 76) (165, 0.6, 124) (189, 0.6, 124) | 1.2 | crate | crouch cover |
| s4.chT1, T2 | ticker ×2 | 0.6 × 2 × 6 | (166, 1, 100) (188, 1, 100) | 2 | neon | full cover at the rim of the hole |
| s4.c4post | cylinder | r 0.5, h 2 | (152, 0, 76) | 2 | metal | conduit `c4` at (152, 2.5, 76) |
| s4.wellVis | sphere | r 3 | (177, -8, 100) | | metal (black) | the well. Three discs r 6, 9, 12 at y -5 as rings |
| s4.exit | box | 22 × 4 × 20 | (219, -2, 100) | 0 | metal | exit deck (x 208 to 230). **CP8** on clear |
| s4.duckCache | cache | box 1.2 × 0.8 × 0.8 | (177, 30.6, 100) | | gold | **secret weapon cache** on top of the lid, outside the lockdown: fly 25 m up from b9 or from the exit deck. Holds the Duck Gun and two rubber boxes |
| s4.tun | tunnel | 12 long, inner 6 × 4 | floor is s4.exit, x 218 to 230 | | metal | connector to S5 |

| Mechanism | Data | Notes |
|---|---|---|
| Kill plane | `killPlane({y: -60})` | |
| Crosswind | `hazardZone({kind:'wind', min:(36, -10, 60), max:(126, 30, 140), force:(0, 0, 3)})` | Pushes flyers and balloons south. Moving targets for the sniper |
| Lockdown **[L2]** | `lockdown({id:'L2', entry:'s4.chIn', exit:'s4.chOut', encounter:'S4-E7', threshold: x 153})` | Lid at 30 m. Jetpack ceiling inside is 28 m |
| Gravity well | `gravityWell({at:(177, -8, 100), r: 26, strength: 5})`, kill sphere r 4 | Pulls flyers, enemy bullets, flak shells, wrecks and pick-ups. Falling down the hole is a void rescue |
| Conduit and energy bridge | `c4` → `eb4` from (169, 0, 100) to (185, 0, 100), width 4 | A deck across the hole: the grounded crossing, safe from flak |
| Fuel pads | b3, b9, and (150, 0, 94), (204, 0, 94) inside the room | |
| Ammo inside the room | bullets boxes at (150, 0, 106) and (204, 0, 106); sniper box on hb1 at (159, 10, 82) | PLAN §5.6 and §7.4: two boxes or more inside, a crate in the reward |
| Power-up | `powerup({kind:'overshield'})` on hb5 at (177, 20, 100) | |

**Transition out:** `seamless` through the exit tunnel into S5.

### 6.5 S5 Ledger Hub

Footprint 140 × 160 m, y from -40 to 80. One round island with the Ledger tower, three validator nodes on floating platforms, and a sealed vault with the second depot. Route 205 m.

```
 1 char = 4 m (x), 1 row = 8 m (z). North up.
       x=0      18        60        102  112     134
 z=44                   [hutN]  (N1 y10)
 z=64            .  s                     .
 z=72          .   t        ___          s  .       +--------+
 z=80  [ent]==>. s    c  A (TWR) roof 16      f  .=eb5=| D VAULT |> card > SB
 z=88          .   t   B C  ---          s  .       +--------+
 z=96       (N2 y14)  s            (N3 y18)
 z=116                  [hutS]
 A, B, C = steps 4, 8, 12 m.  t ticker, s server, c crate, f fuel pad, D depot B.
```

| id | shape | size (m) | at (x, y, z) | top | mat | purpose |
|---|---|---|---|---|---|---|
| s5.ent | box | 18 × 4 × 10 | (9, -2, 80) | 0 | metal | entry deck and tunnel end (x 0 to 18). Arrival (4, 0, 80) |
| s5.isl | island | r 42, h 6 | (60, -6, 80) | 0 | stone | hub island (x 18 to 102, z 38 to 122) |
| s5.tower | cylinder | r 8, h 16 | (60, 0, 80) | 16 | metal | the Ledger. Infinite Fuel on the roof at (60, 17, 80) |
| s5.roofP1, P2 | box ×2 | 0.6 × 1.2 × 4 | (60, 16.6, 73) (60, 16.6, 87) | 17.2 | metal | parapets on the roof |
| s5.stepA | box | 4 × 4 × 4 | (48, 2, 76) | 4 | metal | step 1 |
| s5.stepB | box | 4 × 8 × 4 | (49, 4, 84) | 8 | metal | step 2 |
| s5.stepC | box | 4 × 12 × 4 | (54, 6, 90) | 12 | metal | step 3; the roof is 4 m above it |
| s5.tickW1, W2 | ticker ×2 | 0.6 × 2 × 6 | (38, 1, 72) (38, 1, 88) | 2 | neon | west plaza, full cover |
| s5.srvW1-3 | server ×3 | 1.2 × 2 × 2.4 | (30, 1, 80) (46, 1, 64) (46, 1, 96) | 2 | metal | full cover |
| s5.crW1-3 | crate ×3 | 1.6 × 1.2 × 1.6 | (26, 0.6, 74) (26, 0.6, 86) (44, 0.6, 80) | 1.2 | crate | crouch cover |
| s5.hutN | hut | 8 × 3 × 6 | (60, 1.5, 44) | 3 | concrete | spawn door facing south at (60, 0, 47.3) |
| s5.hutS | hut | 8 × 3 × 6 | (60, 1.5, 116) | 3 | concrete | spawn door facing north at (60, 0, 112.7) |
| s5.n1plat | cylinder | r 5, h 2 | (60, 8, 46) | 10 | stone | node platform north. Node `n1` on it |
| s5.n2plat | cylinder | r 5, h 2 | (31, 12, 97) | 14 | stone | node platform south-west. Node `n2` |
| s5.n3plat | cylinder | r 5, h 2 | (89, 16, 97) | 18 | stone | node platform south-east. Node `n3` |
| s5.srvE1, E2 | server ×2 | 1.2 × 2 × 2.4 | (84, 1, 72) (84, 1, 88) | 2 | metal | east plaza cover |
| s5.crE | crate | 1.6 × 1.2 × 1.6 | (96, 0.6, 76) | 1.2 | crate | cover |
| s5.vaultFloor | box | 22 × 4 × 24 | (123, -2, 80) | 0 | metal | vault floor (x 112 to 134, z 68 to 92) |
| s5.vaultN, S | box ×2 | 22 × 5 × 1 | (123, 2.5, 68.5) (123, 2.5, 91.5) | 5 | metal | vault side walls |
| s5.vaultW1, W2 | box ×2 | 1 × 5 × 9 | (112.5, 2.5, 72.5) (112.5, 2.5, 87.5) | 5 | metal | west wall beside the 6 m door gap |
| s5.vaultE1, E2 | box ×2 | 1 × 5 × 9 | (133.5, 2.5, 72.5) (133.5, 2.5, 87.5) | 5 | metal | east wall beside the exit door |
| s5.vaultRoof | box | 22 × 1 × 24 | (123, 5.5, 80) | 6 | metal | roof: the vault cannot be entered from above |
| s5.batLedge | box | 4 × 0.5 × 4 | (60, -9.25, 114) | -9 | metal | ledge 3 m under the island's south rim: the **Mana Battery** |

| Mechanism | Data | Notes |
|---|---|---|
| Kill plane | `killPlane({y: -40})` | |
| Validator nodes | `target({id:'n1'..'n3', def:'validatorNode'})` on the three platforms | 150 HP at tier 1 (228 at tier 4). The gold sphere on top is a ×2 weak spot, easiest from above |
| Energy causeway | `energyBridge eb5` from (102, 0, 80) to (112, 0, 80), width 5, on when all three nodes are destroyed | Shows the way. The vault door is the real gate |
| Vault door | 0.6 × 4 × 6 at (112.5, 2, 80), opens on `S5-E8.cleared` | |
| Depot B | `depot({at:(123, 0, 74), yaw: 180})` | Depot crate, health station, loadout bench, shop terminal. **CP9** when the door opens |
| Power-up | `powerup({kind:'fuel'})` at (60, 17, 80) | Infinite Fuel, 20 s. First use, before the boss needs it |
| Fuel pads | (24, 0, 80) and (92, 0, 80) | Ammo boxes are listed in §12 |
| Exit door | at (133.5, 2, 80) | Trigger of the boss card |

**Transition out:** `cutscene` boss card into `SB`.

### 6.6 SB The Exchange

Footprint 110 × 120 m, y from -40 to 16 (jetpack ceiling 14 m). A vestibule, a causeway and the trading floor: 21 floor tiles of 12 × 12 m in a 5 × 5 grid without its corners, inside the fire ring.

```
 Tile grid. Tile (i, j) is a box 12 × 4 × 12 at (46 + 12 i, -2, 36 + 12 j), top 0. The four corner tiles do not exist.
 K = kept after the Flash Crash (i + j even), d = dropped.  o = rivet.
              i=0    i=1    i=2    i=3    i=4
      x:     40-52  52-64  64-76  76-88  88-100
 j=0 z30-42    .      d    [K+6]    d      .        (2,0) rises 6 m: the Moon Pad. PY1 stands here in part 1
 j=1 z42-54    d     [K]o    d    o[K]     d        slider SLa runs along z 51
 j=2 z54-66 =>[K]     d    [K P]    d     [K]       (2,2) podium P. (0,2) and (4,2) get the breakers CB1, CB2
 j=3 z66-78    d     [K]o    d    o[K]     d        slider SLb runs along z 69. PY3 on (0,3), PY2 on (4,3)
 j=4 z78-90    .      d    [K+3]    d      .        (2,4) rises 3 m
 Vestibule x 0 to 22, causeway x 22 to 40, gate at x 39.7. Fire ring centre (70, 60), r 27.8 → 26.8 → 25.5.
```

| id | shape | size (m) | at (x, y, z) | top | mat | purpose |
|---|---|---|---|---|---|---|
| sb.vest | box | 22 × 4 × 16 | (11, -2, 60) | 0 | metal | vestibule. **CP10**. A boss run from the hub starts at (4, 0, 60) |
| sb.jetDais | cylinder | r 1.5, h 0.5 | (6, 0, 54) | 0.5 | gold | jetpack pedestal. Does nothing if the player already has one |
| sb.cause | box | 18 × 1 × 6 | (31, -0.5, 60) | 0 | metal | causeway |
| sb.gateP1, P2 | box ×2 | 1 × 5 × 1 | (39.7, 2.5, 56.5) (39.7, 2.5, 63.5) | 5 | metal | gate posts |
| sb.gate | door slab | 0.6 × 6 × 6 | (39.7, 3, 60) | | neon | entry door of the lockdown. Threshold disc line at x 46 |
| sb.t(i,j) | box ×21 | 12 × 4 × 12 | (46 + 12 i, -2, 36 + 12 j) | 0 | metal | floor tiles, see the grid |
| sb.rivet1-8 | cylinder ×8 | r 1.5, h 4 | y -4 at (64, 54) (76, 54) (64, 66) (76, 66) (52, 54) (52, 66) (88, 54) (88, 66) | 0 | trim | join the kept tiles at their corners, so the broken floor can be walked |
| sb.podium | cylinder | r 3, h 1 | (70, 0, 60) | 1 | gold | where the Duo stand under the Price Shield |
| sb.depotIn | depot crate | two stacked crates 1.2 × 0.8 × 0.8 | (74, 0, 64.5) | 1.6 | crate | unlimited ammo **inside** the arena, on the centre tile, which never drops |
| sb.depotVest | depot crate | two stacked crates | (18, 0, 60) | 1.6 | crate | unlimited ammo in the vestibule, before the gate |
| sb.bar1-4 (D) | candle ×4 | 3 × 3 or 4 × 3 | (58, 1.5, 46) (82, 2, 46) (58, 2, 74) (82, 1.5, 74) | 3 or 4 | candleUp / candleDown | candlestick bars of the Duel `exchange` layout. Destructible, leave stumps |
| sb.chainW (D) | crate ×2 and a chain | 1.6 × 1.2 × 1.6 | (46, 0.6, 55.5) (46, 0.6, 64.5) | 1.2 | crate | chained blocks, west |
| sb.chainE (D) | crate ×2 and a chain | 1.6 × 1.2 × 1.6 | (94, 0.6, 55.5) (94, 0.6, 64.5) | 1.2 | crate | chained blocks, east |
| sb.SLa (D) | mover | 3 × 2.5 × 3 | path (52, 1.25, 51) ↔ (88, 1.25, 51) | 2.5 | metal | sliding block on a rail, 3 m/s. After the crash it ferries across the gap at (2,1) |
| sb.SLb (D) | mover | 3 × 2.5 × 3 | path (88, 1.25, 69) ↔ (52, 1.25, 69) | 2.5 | metal | second sliding block, ferries across (2,3) |
| sb.py1 | pylon (target) | r 0.8, h 5 | (70, 0, 35) | 5 | metal | price-chart pylon 1, on the floor |
| sb.py2stub, py2 | cylinder r 1.5 h 5, then pylon | | (92, 0, 74) | 10 | candleDown | pylon 2 on a 5 m stub |
| sb.py3stub, py3 | cylinder r 1.5 h 8, then pylon | | (48, 0, 74) | 13 | candleUp | pylon 3 on an 8 m stub |
| sb.cb1, cb2 | pylon (target) ×2 | r 0.8, h 5 | (47, 0, 60) (93, 0, 60) | 5 | metal | circuit breakers. Rise through tiles (0,2) and (4,2) in part 3 |
| sb.lid | forceField | disc r 28 at y 16 | (70, 16, 60) | | forceField | lid of the lockdown |
| sb.vista1-8 | candle ×8 | 10 × 60 × 10 | on a circle r 45 round (70, 60) | | mixed | vista outside the ring |

(D) rows stand in for the converted Duel layout `duelArena('exchange', at: (70, 0, 60))` (B §4). Use the converted positions when the port exists, and keep the two sliders on the two rows of kept tiles.

| Mechanism | Data | Notes |
|---|---|---|
| Kill plane | `killPlane({y: -40})`; rescue point fixed at the centre tile (70, 0, 60) | Open only after the Flash Crash |
| Lockdown **[L3]** | `lockdown({id:'L3', entry:'sb.gate', exit: none, encounter:'SB-BOSS', threshold: x 46})` | The fire ring is the wall and the lid is at 16 m |
| Gate rule | `sb.gate` opens only while `p.jet.has` | Guarantees the jetpack for part 5 |
| Fire ring | `fireRing({at:(70, 60), r:[27.8, 26.8, 25.5]})` | B §2.5 |
| Tile drop | 12 tiles marked d: 1 s shake, then `mover oneShot` down 40 m at 10 m/s, 0.15 s apart, clockwise from (1,0) | Part 3. (2,0) rises 6 m and (2,4) rises 3 m at 2 m/s |
| Rack and ammo | `rack({id:'bz-duo', at:(6, 0, 66), gun:'bazooka', why:'pylons and the Duo in SB-BOSS'})`, Uncommon; rockets box (9, 0, 66); bullets box (14, 0, 54); two depot crates | All inside `SB`. Boxes on the tiles are listed in §12 |
| Fuel pads | vestibule (16, 0, 66); tiles (3,1) at (86, 0, 44) and (1,3) at (54, 0, 76) | |
| Power-up | `powerup({kind:'fuel'})` appears on the podium when part 5 starts | |

## 7. Prefabs (`src/data/levels/prefabs/void.js`)

| Prefab | Parts |
|---|---|
| `candle(w, h, dir)` | Body box w × h × w in `candleUp` (green) or `candleDown` (red). Wick box 0.6 × min(h/4, 6) × 0.6 in `trim` centred on top, and the same below. The top of the body is landable. Table rows give the body |
| `hollowCandle(w, h)` | Four wall boxes 1 m thick and a floor box 1 m thick. Open top |
| `island(r, h)` | Cylinder in `stone` and a `neon` disc of the same radius on top as a rim light |
| `podIsle` | Cylinder r 4, h 3 in `stone` and a `neon` disc r 4 |
| `chain(from, to)` | Link boxes 2.4 × 0.6 × 1.6 in `trim`, one every 2 m, yawed along the line. Walkable |
| `crate` | Box 1.6 × 1.2 × 1.6 in `crate` |
| `server` | Box 1.2 × 2 × 2.4 in `metal` with a `neon` strip box 0.5 × 0.5 × 2.4 on top |
| `ticker` | Box 0.6 × 2 × L in `neon`: a price ticker board used as a wall |
| `hut` | Box in `concrete` with a door frame on one face: a `door` spawn point |
| `sign` | Pole cylinder r 0.25, h 2 and a box 4 × 2 × 0.5 in `neon` |
| `vent` | Cylinder r 3, h 0.5 in `metal`, a `neon` disc r 3, and an `updraft` zone above it |
| `tunnel(L)` | Floor and roof boxes L × 1 × 8, two wall boxes L × 6 × 1, a door at each end |
| `pylon` | Cylinder r 0.8, h 5 in `metal`; sphere r 1.2 in `neon` on top (weak spot ×2); three boxes 0.5 × (1, 2, 3) × 0.5 at the foot as a bar chart. A `target` with HP |
| `validatorNode` | Box 2 × 3 × 2 in `metal`; sphere r 0.9 in `gold` on top (weak spot ×2). A `target` with HP |
| `lockRoom({min, max})` | Four energy walls 0.6 m thick in `forceField` from the floor to the lid, a lid slab 0.6 m thick at `max.y`, two door slabs 0.6 × 6 × 4 in `neon` with a wall piece above each, and a `disc` line 6 m inside the entry. `forceField` is see-through and stops movement, bullets and spells |

## 8. Encounters

Spawn methods are from PLAN §5.4 and triggers from PLAN §5.5. "Alt" is the absolute y band a flyer keeps.

### S1-E1 Welcome Desk (ground, before the jetpack)

Space: Block 1, 36 × 40 m, flat. Objective: `clearAll`, opens `gate1`. Starts when the bridge `eb1` is powered and crossed.

| Squad | Trigger | Method | From | Alt | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| A | placed, wakes on sight | `placed` | ring round (62, 0, 60), partying | ground | midget ×4 | | a sneak shot from the bridge; the basic swarm |
| B | `onAlert` | `door` | hutN (62, 0, 45) | ground | obama ×2 | 1 s | ranged enemies behind the servers: use the tickers |
| C | `onKills(4)` | `door` | hutS (62, 0, 75) | ground | midget ×4, boomMidget ×2 | booms 3 s after the midgets | shoot a Boom Midget inside the pack |

`maxAlive` 8. Roles: fodder, ranged, rusher. Approaches: straight over the bridge, or along either edge behind the tickers. Tools: carried guns; bullets box at (26, 0, 64), 18 m before Block 1. 12 enemies, 0.9 min.

### S1-E2 First Flight (the hops and the Mempool)

Space: islands h2 and h3 and the Mempool block, 110 × 50 m, 16 m of height. Objective: `clearAll`, opens the tunnel.

| Squad | Trigger | Method | From | Alt | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| A | `onEnter` h2 | `air` | north (136, 10, 30) | y 7 to 10 | flyingMidget ×2 | | aim while hovering; their pellets are weak |
| B | `onEnter` h3 | `air` | south-east (200, 16, 100) | y 11 to 15 | flyingMidget ×3 | | fight in the air between h3 and the Mempool |
| C | `onEnter` Mempool (x > 182) | `placed` | tops of stubN (198, 16, 46) and stubS (198, 14, 74) | perched | obama ×2 | | fly above a perched shooter and it loses its cover |
| D | `onKills(5)` | `door` | memHut (212, 8, 45) | ground | midget ×3 | | melee enemies cannot reach a player who hovers |

`maxAlive` 8. Roles: flyer, ranged, fodder. Approaches: over the top, or low along the deck behind the crates. Tools: bullets box on h2, shells box on the Mempool. 10 enemies, 1.0 min.

### S2-E3 Trading Pit **[L1 lockdown]**

Room: 50 × 50 m inside, lid at 24 m. Two height levels: the floor, and five candle tops at 6, 8, 10, 12 and 16 m. Cover: 5 candles, 4 crates, 2 tickers. Doors: `s2.pitIn` west, `s2.pitOut` east. The entry door drops 1 s after the player crosses x 47. Objective: `clearAll`.

| Spawn point | Where | Kind |
|---|---|---|
| `PIT-N` | vent slot in the north wall at (66, 14, 75) | air |
| `PIT-S` | vent slot in the south wall at (66, 14, 125) | air |
| `PIT-LID` | hatch in the lid at (78, 23, 100) | air, drops in |
| `PIT-E` | hut door at (85.5, 0, 78), east side | ground |

| Wave | Trigger | Method | Spawn point | Alt | Enemies | Teaches or tests |
|---|---|---|---|---|---|---|
| 1 | door drops | `air` | `PIT-N` | y 8 to 18 | bitbug ×6 | **Bitbug alone**: one flock circles 8 m out, then dives. Learn the dive tell with any gun; the MG rack is 3 m ahead |
| 2 | `onRemain(2)` or 25 s | `air` | `PIT-S` | y 6 to 18 | bitbug ×6 | sweep with the MG; Chain Zap kills four at once |
| 2 | same | `air` | `PIT-LID` | y 14 to 22 | flyingMidget ×3 | high shooters while a flock dives: pick the order |
| 3 | `onRemain(2)` or 25 s | `door` | `PIT-E` | ground | boomMidget ×3 | rushers on the floor: go up to a candle top, or pop them under the flock |
| 3 | same | `air` | `PIT-N` | y 8 to 18 | bitbug ×6 | air and ground pressure together |
| 4 | `onRemain(2)` or 25 s | `air` | `PIT-N` and `PIT-S` | y 6 to 20 | bitbug ×3 + ×3 | two half-flocks from opposite sides that merge over pk5 |

Totals: 30 enemies (bitbug 24, flyingMidget 3, boomMidget 3), 4 waves, 2.1 min. `maxAlive` 12 (at most 2 flock units, 3 flyers and 3 rushers). Roles: fodder flock, flyer, rusher. Tools inside: the MG rack and two bullets boxes. Reward on clear: ammo crate and mana bloom at (66, 0, 108), a chest at (66, 0, 104) with one gun; both doors open; CP4. Anti-stall: flyers are clamped to the room volume.

### S2-E4 Bull Run (the climb)

Space: sliders, K8 to K14, 150 × 60 m and 54 m of height. Objective: `clearAll`, arms the launch ring.

| Squad | Trigger | Method | From | Alt | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| A | `onEnter` slider 1 | `air` | east, above K8 (154, 28, 100) | matches the player, y 4 to 28 | jetObama ×1 | | **Jet Obama alone**: strafes at your height, 4-round bursts. The thruster on its back takes ×2. The slider parapet is moving cover |
| B | `onEnter` K8 | `placed` | top of K10 (176, 34, 120) | perched, 14 m above K8 | robotLaser ×1 | | a telegraphed beam from above: ride vent v3 past it or shoot it from K9 |
| C | `onEnter` K11 | `air` | north (200, 50, 70) and south (200, 50, 130) | y 38 to 56 | jetObama ×2 | second one 4 s later | a pincer in open air: break line of sight behind K12 and K13 |
| D | placed, wakes when the player lands on K12, K13 or K14 | `placed` | behind the tickers on K14 (246, 54, 100) | on the roof, y 54 | **elite** obama ×1 "Head Trader" | | the section's elite holds the exit: drop on it from v4, or flank over K13 |

`maxAlive` 6. Roles: air ranged, ranged. Approaches: vents v3 and v4 (fast, exposed) or the stepping candles K9, K10, K12, K13 (slow, covered). Tools: fuel pads on K8, K11, K14; bullets boxes on the east porch and on K11. The elite drops a gun on K14. 5 enemies, 1.0 min.

### S3-E5 Gas Fees (the flak corridor)

Space: the Spread, 170 × 46 m lane, pods above and below it. Objective: `destroy` the gate pylon and `reach` the mouth. Pods are optional kills, but each one left alive keeps firing.

| Squad | Trigger | Method | From | Alt | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| A | placed | `placed` | isl1 (63, 0, 60) | static, y 0 | flakPod ×1 (FP1) | | **Flak Pod alone**: it ignores a player on the chain and fires on one who flies. Walk in and shoot the base, or fly at it with Mana Shield on |
| B | `onEnter` x > 80 | `placed` and `air` | FP2 on p2 (122, 4, 46); flock from behind (70, 14, 60), riding the wind | pod y 4; flock y 8 to 16 | flakPod ×1, bitbug ×6 | flock 4 s later | the flock pushes you into the air and the flak punishes it. Fly beside slab A, or zap `c2` and walk `eb2` |
| C | `onEnter` R2 | `placed` | FP3 on p3 (164, -6, 74) | y -6, below the lane | flakPod ×1 | | a pod under you with no bridge on this gap (44 m): slab B, Mana Shield, Goo Bolt jam, or Yeet the shells back |
| D | `onEnter` R3 | `placed` | FP4 on p4 (208, 10, 48) | y 10, above the lane | **elite** flakPod ×1 "Priority Fee" | | 6-shell bursts, 55 m range, covers the gate pylon. Zap `c3` and walk `eb3` under it, or fight it from behind the R3 wall |

`maxAlive` 5 units. Roles: flak, fodder flock. Hazard: the wind lane. Approaches: fast in the air with slabs and shield, or grounded over chains and energy bridges. Tools: depot crate, shrine and mana bloom 45 m before FP1; fuel pads on every rest island; bullets boxes on R1 and R3, a sniper box on R2. The elite pod drops a gun on its own island. 10 enemies, 1.4 min.

### S4-E6 Dust Sweep (sniping mines)

Space: block field, 100 × 80 m. Objective: `clearAll`.

| Squad | Trigger | Method | From | Alt | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| A | placed | `placed` | cluster at (52, 6, 100) (58, 9, 94) (58, 5, 106), 30 to 36 m from the entry wall | y 5 to 9 | balloonMidget ×3 | | **Balloon Midget alone**: it drifts at you at 3 m/s and bursts at 2.5 m. One sniper shot from the wall chains the cluster |
| B | `onKills(2)` | `placed` | cluster at (76, 12, 94) (84, 14, 100) (90, 10, 90), round b3 and b6 | y 10 to 14 | balloonMidget ×3 | | they converge while you reload (4 shots per magazine): pick the middle one |
| C | `onKills(5)` | `air` | north on the crosswind: (100, 14, 62) (108, 16, 62) (116, 12, 62) | y 12 to 16, drifting south | balloonMidget ×3 | 2 s apart | moving targets across your path to b9; or Yeet one into the next |

`maxAlive` 9. Role: mine. Hazard: the crosswind. Approaches: snipe from the entry wall, or fly high over b7 and shoot down. Tools: sniper rack and a sniper box on the deck, sniper boxes on b6 and b9 (24 rounds for 9 balloons). 9 enemies, 1.0 min.

### S4-E7 Clearing House **[L2 lockdown]**

Room: 60 × 60 m inside, lid at 30 m. Two height levels: the floor ring round a 16 × 16 m hole, and five blocks at 8, 10, 12, 14 and 20 m. Cover: 5 blocks, 4 servers, 4 crates, 2 tickers. Doors: `s4.chIn` west, `s4.chOut` east. The entry door drops 1 s after the player crosses x 153. Objective: `clearAll`.

| Spawn point | Where | Kind |
|---|---|---|
| `CH-N` | vent slot in the north wall at (177, 16, 70.5) | air |
| `CH-S` | vent slot in the south wall at (177, 16, 129.5) | air |
| `CH-LID` | hatch in the lid at (195, 29, 100) | air, drops in |
| `CH-WELL` | up through the hole from (177, -10, 100) | air, from below |
| `CH-HATCH` | floor hatch at (202, 0, 126), south-east corner | rises from the floor |

| Wave | Trigger | Method | Spawn point | Alt | Enemies | Teaches or tests |
|---|---|---|---|---|---|---|
| 1 | door drops | `air` | `CH-N` | y 6 to 20 | bitbug ×8 | a flock over a hole that pulls: the well drags the flock's circle off centre |
| 1 | same, 4 s later | `air` | `CH-LID` | matches the player, y 4 to 26 | jetObama ×1 | a dogfight starts while the flock is alive |
| 2 | `onRemain(2)` or 25 s | `air` | `CH-S` | y 4 to 26 | jetObama ×2 | a pair in a closed room: use the upper blocks to break their line |
| 2 | same | `air` | `CH-LID` | y 26 falling to 8, drifting to the well | balloonMidget ×4 | mines sink toward the well through the fight: shoot one beside a Jet Obama |
| 3 | `onRemain(2)` or 25 s | `burrow` | `CH-HATCH` | static, y 0 | flakPod ×1 | flak inside the room: the whole air space is now costly. Land, zap `c4`, cross the hole on `eb4` and kill it on foot |
| 3 | same | `air` | `CH-WELL` | y 0 to 16 | bitbug ×8 | a flock from below while you are grounded |
| 4 | `onRemain(2)` or 25 s | `air` | `CH-LID` | y 6 to 26 | **elite** jetObama ×1 "Whale" | 6-round bursts, 2.5× HP. The thruster still takes ×2. Goo drops it; Yeet sends it at the well |

Totals: 25 enemies (bitbug 16, jetObama 4 with 1 elite, balloonMidget 4, flakPod 1), 4 waves, 2.6 min. `maxAlive` 10 units. Roles at once: fodder flock, air ranged, mine, flak. Hazard: the gravity well. Tools inside: two bullets boxes, a sniper box, conduit `c4`, two fuel pads, the Overshield. Reward on clear: ammo crate and health at (204, 0, 100), a chest at (204, 0, 96) with one gun; both doors open; CP8. The Whale's gun falls to the room floor. Anti-stall: flyers are clamped to the room; the pod is reachable on foot from every side; balloons always drift at the player.

### S5-E8 Proof of Stake (ground and air objective)

Space: the hub island, r 42, the Ledger roof at 16 m and node platforms at 10, 14 and 18 m. Objective: `destroy` n1, n2, n3 and `clearAll`. Opens the vault.

| Squad | Trigger | Method | From | Alt | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| A | placed | `placed` | west plaza: riots at (40, 0, 76) (40, 0, 84), obamas behind the servers at (46, 0, 64) (46, 0, 96) | ground | riotMidget ×2, obama ×2 | | a shield wall with shooters behind it: fly over the shields and hit them from above or behind |
| B | `onPartDestroyed` (first node) | `door` | hutN (60, 0, 47.3) | ground; the acolyte floats 1 m | hexAcolyte ×1, midget ×4 | | Tax Shield bubbles on the midgets: Chain Zap pops them |
| C | `onKills(7)` | `drop` and `door` | drop pod on the Ledger roof rim (67, 16, 80); hutS (60, 0, 112.7) | roof y 16; ground | **elite** robotShooter ×1, manaLeech ×1 | leech 3 s later | the elite's big laser reaches every node platform from the roof. The leech drains mana inside 10 m: Mana Shield takes the drain |

Nodes teach the boss pylons: a static target with a weak sphere on top, better from above. `maxAlive` 10. Roles at once: at most 4, because squad C waits for 7 kills. Approaches: clear the plaza first, or fly the node loop n2 → n1 → n3 and fight from the platforms. Tools: Infinite Fuel on the roof, fuel pads west and east, bullets boxes on the entry deck, the roof and the east plaza, a sniper box at (34, 0, 92). The elite drops a gun on the roof. 11 enemies, 1.7 min.

## 9. New enemies

Tier-1 numbers. At tier 4 multiply HP and damage by 1.52.

**Introduced here, as C §3.12 specifies them**

| Id | Archetype | HP (tier 4) | Behaviour in this level | Counter | §3 seconds |
|---|---|---|---|---|---|
| `bitbug` | `swarmFlock` | 12 (18) | Flocks of 3 to 8. Circle at 8 m, then dive-bite for 4 (6). Instanced render. First seen alone in L1 wave 1 | MG sweep, Chain Zap (4 per cast), any splash | 3 |
| `jetObama` | `jetFlyer` | 80 (122) | Flies in the y band its squad gives, matches the player's height when the player is airborne, strafes, 4-round bursts. Thruster on the back ×2. Spirals and explodes on death (r 3, 15). First seen alone in E4 squad A | Thruster, sniper, Goo Bolt (drops it), fight at its height | 9 |
| `balloonMidget` (`balloonMine`) | `floaterMine` | 10 (15) | Drifts at the player at 3 m/s plus wind, bursts within 2.5 m (r 4, 20 (30)), chains to other balloons, hurts enemies too. First seen alone in E6 squad A | Shoot from range, Yeet, use them on Jet Obamas | 5 |

Today's data has these three as re-skins (`bitbug` 18 HP, `jetObama` 55, `balloonMidget` 28). The level uses the C §3.12 numbers above.

**`flakPod`: Gas Fee Flak Pod** (PLAN §5.3, new placeholder enemy)

| Field | Value |
|---|---|
| Role, archetype | Area denial against flyers. `flakTurret` (new, static) |
| HP | 160 (243 at tier 4). No stagger |
| Size | radius 1.3, height 2.6, speed 0. Turret turns 120°/s, pitch from -5° to +85° |
| Target rule | Only a target that is **airborne**: not grounded for 0.35 s, and its feet more than 1.2 m above the surface below it or over the void. Range 45 m, needs line of sight. Drops the lock 0.5 s after the target lands. It cannot aim below -5°, so it never hits a player walking under it |
| Attack "Gas Fee" | 0.9 s tell: a rising whine and a purple lock line (`enemyTelegraph`). Then 4 shells, 0.22 s apart. Shell speed 24 m/s, radius 0.3, proximity fuse 2.5 m. Burst radius 3.2 m, damage 8 at the centre to 4 at the edge (12 to 6 at tier 4). **Each burst that hits also drains 18 jetpack fuel.** Aims with 70% lead, so a change of direction or a fast drop after the lock dodges it. 3.0 to 3.6 s between bursts |
| Hitboxes | Base: cylinder r 1.3, y 0 to 1.0, zone `body`. Turret: sphere r 0.85 at y 1.7, zone `armor` ×0.4. Vent: sphere r 0.4 at y 0.8, z -1.2, zone `weak` ×2.5, only open for 1.5 s after each burst |
| Reactions | Goo Bolt jams it for 4 s. Chain Zap stuns it 1.5 s; weak to shock. Yeet turns its shells round. Mana Shield absorbs 60% of the damage and all of the fuel drain (6 mana per hit instead). The gravity well bends its shells |
| Elite "Priority Fee Pod" | ×2.5 HP (400; 608 at tier 4), 6 shells per burst, range 55 m, scale 1.25 |
| Drops | Ammo 85%, gun 8% (level table), 4 tickets. No resources (PLAN §7.1). The elite always drops one gun |
| Events | `flakLock`, `flakBurst`, `fuelDrain` |
| Look | Base cylinder r 1.3, h 1.0 `metal`. Turret sphere r 0.85 at y 1.7, `neon` purple `0xb26bff` (the Gas Fees colour of the boss arena). Two barrel boxes 0.3 × 0.3 × 1.6. A box 0.5 × 0.5 × 0.3 on the back as the vent. A `disc` r 2 on the ground that turns purple while it holds a lock |
| §3 seconds | 9 (proposed row; the table has none) |

No further placeholder enemies are proposed.

## 10. Finale: Bitcoin Obama & The Midget (`SB-BOSS`) **[L3 lockdown]**

A double fight with two bars. Each fighter keeps his three Duel stages, attacks, powers and the shared arena shift (B §3.2, §2.5, §2.6). The level adds an entry part, one intermission and a guaranteed flying finale.

**HP** = Duel `stageHealth` × `DUEL_HP_K`, first pass `DUEL_HP_K` = 1.52 at tier 4. Boss HP is in the content fingerprint (PLAN §12).

| Body | Stage 1 | Stage 2 | Stage 3 | Total |
|---|---|---|---|---|
| Bitcoin Obama | *Pump* 380 → **578** | *Hype Cycle* 440 → **669** | *Dump* 500 → **760** | 2,007 |
| The Midget | *Small Cap* 450 → **684** | *To the Moon* 515 → **783** | *Short Squeeze* 560 → **852** | 2,319 |
| Targets | 3 pylons 180 → **274** each | 2 circuit breakers 240 → **365** each | | 1,552 |

**Two rules the part script adds to B §2.6**

1. **Held transform.** The first time either fighter empties his stage-2 bar, his transformation is held and the intermission starts. It plays when the intermission ends.
2. **Last bar lock.** The Midget's stage-3 bar is always the last bar of the fight. If he reaches stage 3 while Obama still stands, he flies to the Moon Pad, hovers there inside a Price Shield and casts only *Pig Rain* on its normal cooldown until Obama is knocked out.

**Parts**

| Part | Kind | Starts | Bodies, HP and attacks | Adds (time from part start, spawn point) | Arena | Ends when | Target |
|---|---|---|---|---|---|---|---|
| 1 Opening Bell | Entry, destroyable parts | Boss card ends | Both stand on the podium under the **Price Shield** (sphere r 5, invulnerable). Obama throws stage-1 bolts at half rate. No powers. Three pylons, 274 HP each, weak sphere ×2 | t+3: bitbug ×6 `SB-N`. t+15: bitbug ×6 `SB-S` | Whole floor. Ring 27.8 m | All 3 pylons destroyed | 30 s |
| 2 Pump | Double fight, phases | Shield drops | Obama stage 1 (578): bolts, *Green Candles* (march, 7 eruptions). Stage 2 (669): + blast, *Shill Calls* (3 seekers). Midget stage 1 (684): bolts, *Tantrum Stomp* (2 rings). Stage 2 (783): + blast, *To the Moon* (strike). Powers alternate with the shared 4 s gap. Each transforms on his own bar | t+20: midget ×4, `drop` at `SB-W`. t+40: midget ×3 and boomMidget ×2, `drop` at `SB-E` | Stage-2 shift when the first of them transforms: 4 Liquidation Pits, 1 Airdrop spring, ring 26.8 m. The two sliders run | Either fighter empties his stage-2 bar (rule 1) | 60 s |
| 3 Flash Crash | Intermission, arena shift | Rule 1 fires | Both jump to the podium and raise the Price Shield again. They do not attack. Two circuit breakers, 365 HP each, rise on tiles (0,2) and (4,2) | t+2: bitbug ×6 `SB-N`. t+10: balloonMidget ×4 from `SB-LID`, drifting. t+20: bitbug ×6 `SB-S` | **The floor breaks.** 12 tiles shake for 1 s and drop in order. Nine tiles stay, joined by rivets. (2,0) rises 6 m, (2,4) rises 3 m. The sliders now ferry across two gaps | Both breakers destroyed. Then the held transformation plays | 40 s |
| 4 Dump | Double fight on the broken floor | Transformation ends | The leader in stage 3. Obama *Dump* (760): blast, stun, ultimate, volley *Pump & Dump* (4 shots, 30°), *Liquidation* (3 rings) and his earlier powers. The other continues his own bars. Ground fighters are leashed to the centre tile and the four diagonal tiles. Rule 2 applies | t+15: boomMidget ×3, `drop` at `SB-C` | Stage-3 shift: 3 Gas Fee vents, ring 25.5 m. Pits and vents are placed on kept tiles only | Obama is knocked out and the Midget is in stage 3 | 75 s |
| 5 Short Squeeze | Phase, flying chase | Obama out and the Midget in stage 3 | Midget *Short Squeeze* (852): blast, stun, volley *Moon Shot* (3 shots), *Pig Rain* (9 circles) and his earlier powers. He hovers 1.7 m over whatever is under him (B §2.7). Added: every 12 s he flies to the next tile in the cycle Moon Pad (2,0) → (3,3) → (0,2) → (2,4) → (4,2) → (1,1) at 9 m/s, and stays within 8 m of it | none | Infinite Fuel appears on the podium. Fuel pads on (3,1) and (1,3) | The Midget is knocked out | 45 s |

Total 250 s (4:10). Bodies are exposed for 180 s and hold 4,326 HP, so the fight needs about 24 damage per second landed on them. Tune `DUEL_HP_K` with the TTK tool to hit the part targets for a tier-4 loadout.

**Lockdown data.** Floor 60 × 60 m (21 tiles), wall = the fire ring, lid at 16 m. Two height levels after part 3. The gate drops 1 s after the player crosses x 46 and never reopens until the win. Waves = the five parts. 40 adds. Leftover flocks leave when their part ends (no loot).

| Spawn point | Where | Kind |
|---|---|---|
| `SB-N` | (70, 10, 36), over the north edge | air |
| `SB-S` | (70, 10, 84), over the south edge | air |
| `SB-LID` | (70, 14, 60), under the lid | air |
| `SB-W` | (46, 0, 60), tile (0,2) | drop pod |
| `SB-E` | (94, 0, 60), tile (4,2) | drop pod |
| `SB-C` | (66, 0, 64), centre tile | drop pod |

**Taught before it is used** (PLAN §9): pylons by the S3 gate pylon and the S5 nodes; shield bubbles by the Hex Acolyte in E8; sliders in S2 and S3; a broken floor with gaps in S4; flocks and balloons in L1 and L2; chasing a flyer in E4 and L2; Infinite Fuel in E8.

**Hub boss run** (starter machine gun with finite ammo, level-1 skills, a new profile's spellbook: Goo Bolt only): the jetpack pedestal, a depot crate, the bazooka rack and a fuel pad are in the vestibule, and a second depot crate stands on the centre tile inside the ring, so the run cannot go dry. Pylons and breakers are in machine-gun range from the centre tile (25 m and 23 m). The broken floor can be walked over the rivets and ridden on the sliders. In part 5 every tile in the Midget's cycle is within 35 m of the centre tile, and Goo Bolt grounds him. No conduit, shrine spell or power-up is required.

**Reward:** `rewardSpellLearned` Pump It; two guns at Rare and one boss gun (Ray Gun or Big Bullets) and an ammo crate, all placed on the podium when the last fighter falls; the level-complete summary.

## 11. Mechanisms, magic and explosives used

| Item | Where | New to this level |
|---|---|---|
| Jetpack pickup and tutorial | S1 launch deck; SB vestibule | **yes** |
| Fuel pad | every section | **yes** |
| Updraft | S2: pv1, pv2, v1 to v4 | **yes** |
| Wind lane | S3 tailwind, S4 crosswind | **yes** |
| Sliding blocks on rails (`mover`) | S2 sl1, sl2; S3 slA, slB; SB SLa, SLb | **yes** as moving cover |
| Energy bridge | eb1 (S1), eb2, eb3 (S3), eb4 (S4), eb5 (S5) | **yes** |
| Gravity well | S4 Clearing House | **yes** |
| Kill plane and void rescue | every section | from L02 |
| Lockdown (PLAN §5.6) | L1 Trading Pit, L2 Clearing House, L3 the Exchange | from L01 |
| Doors, checkpoints, depots, racks, ammo crates | throughout | from L01 and L02 |
| Destructible targets | S3 gate pylon, S5 nodes, SB pylons and breakers | used here for the first time in the campaign order unless L01 to L03 add one |
| Conduit (Chain Zap) | c1 to c4 | from L02 or L03 |
| Spell shrine, mana bloom | S3 Stream Head | shrine object from L01 |
| Power-ups | Infinite Fuel (S5 roof, SB part 5): **new**. Overshield (S4 hb5) | |
| Explosives | none placed. Balloon Midgets and Boom Midgets are the level's chain explosions | |

## 12. Checkpoints, depots, weapons, power-ups, secrets

| CP | Where | When | Time | Gap |
|---|---|---|---|---|
| CP1 | S1 spawn | level start | 0:00 | |
| CP2 | S1 launch deck | `S1-E1.cleared` | 1:10 | 1:10 |
| CP3 | S2 west porch, outside the L1 door | arrival in S2 | 3:08 | 1:58 |
| CP4 | S2 east porch | L1 cleared | 5:19 | 2:11 |
| CP5 | S3 Stream Head | arrival; saved again by the shrine and on stepping onto the chain | 6:44, then 7:49 | 1:25 |
| CP6 | S4 entry deck | arrival in S4 | 9:55 | 2:06 |
| CP7 | S4 west porch, outside the L2 door | `S4-E6.cleared` | 11:10 | 1:15 |
| CP8 | S4 exit deck (carried into S5) | L2 cleared | 14:05 | 2:55 |
| CP9 | S5 vault | `S5-E8.cleared` | 16:11 | 2:06 |
| CP10 | SB vestibule, outside the L3 gate | arrival in SB | 17:07 | 0:56 |

The 2:30 rule holds everywhere outside sealed fights. L2 (2:39 plus the walk in) and the boss (4:10) cannot hold a checkpoint, because PLAN §5.6 restarts a lockdown from wave 1.

| Kind | Item | Where | Why |
|---|---|---|---|
| Depot | Depot A | S3 (8, 0, 60) | mid level, before the flak corridor |
| Depot | Depot B | S5 vault (123, 0, 74) | before the finale |
| Rack | Machine gun `mg-pit` | S2 (50, 0, 94) | bitbug flocks in `S2-E3` |
| Rack | Sniper `sn-mines` | S4 (16, 0, 94) | Balloon Midgets in `S4-E6`, Jet Obamas in `S4-E7` |
| Rack | Bazooka `bz-duo` | SB (6, 0, 66) | pylons, breakers and the Duo in `SB-BOSS` |
| Ammo | sniper | S4 (16, 0, 106), b9, (150, 0, 106); S5 (34, 0, 92) | within 30 m of the rack and of each use |
| Ammo | rockets, bullets | SB (9, 0, 66), (14, 0, 54) | boss |
| Power-up | Infinite Fuel | S5 roof (60, 17, 80); SB podium in part 5 | node loop; the chase |
| Power-up | Overshield | S4 hb5 (177, 20, 100) | reward for taking the high block in L2 |
| Golden Bonk | **Moon Boots** (gravity × 0.6) | S2, inside hollow candle K12 at (222, 29, 80), entered from the top at y 48 | the only red candle on the climb with no wick |
| Audit File 1 | "Block #0 was mined by a midget on a dare." | S1, ledge under h2 at (136, -6, 54) | fly under the second hop |
| Audit File 2 | "The spread is the fee. The fee is the point." | S3, island behind the south wall at (158, -1, 104) | leave the lane between two candles |
| Audit File 3 | "Dust: balances too small to move, so they float." | S4, top of b4 at (74, -4, 74) | the lowest block, hidden from the deck by b3 |

## 13. Difficulty

Harder than L03: tier 4 (HP and damage × 1.52 against × 1.32); `maxAlive` 12 from 10; 4 threat roles at once from 3; an elite in four sections instead of one in the finale; two hazard kinds (wind, gravity well); a third axis in every fight; a fall costs 25% of max HP; two wave lockdowns of 30 and 25 enemies; a five-part double boss.

| Setting | Changes on top of C §3.14 (Easy 0.7 HP / 0.6 damage, Heroic 1.3 / 1.4) |
|---|---|
| Easy | Void rescue costs 10%. Flak bursts have 3 shells and drain 10 fuel. L1 wave 4 and L2 wave 4 are removed (27 and 24 enemies stay inside the 25-enemy rule for L1 only, so L2 keeps wave 4 with a normal Jet Obama). E5 has no flock. Boss: the second drop of part 2 is removed; the Midget moves every 16 s |
| Heroic | Flak pods lead 100% and reach 55 m (elite 65 m). E2 squad B gains an elite flyingMidget. L1 waves 2 and 3 each gain bitbug ×6. L2 wave 3 has two flak pods (second hatch at (152, 0, 126)). E8 squad C arrives on `onKills(5)`. Boss: part 3 has a third breaker on tile (2,4); the Midget moves every 9 s; Liquidation Pits also spawn on raised tiles |

## 14. Engine needs

Uses **E1** (collision, kill plane, void rescue), **E2** (line of sight for flak and Jet Obamas), **E3** (3D flyer steering, nav links over rivets and sliders), **E4** (sections, squads, triggers, lockdowns), **E5** (primitives, materials, instanced bitbugs), **E6** (door, mover, wind, updraft, gravity well, energy bridge, fuel pad, depot, target), **E7** (`bitbug`, `jetObama`, `balloonMidget`, `boomMidget`, `riotMidget`, `hexAcolyte`), **E8** (`flakPod`, `manaLeech`), **E9** (jetpack v2), **E10** (shrine, Mana Shield, conduit, mana bloom, Pump It), **E12** (Duel port of the Duo, part script), **E13**, **E14**, **E15** (the canonical boss entry moves from `S3-E3` to `SB` / `SB-BOSS`; boss HP changes). **E11** is not used.

Needs that PLAN §10 does not name:

| # | Need | Why |
|---|---|---|
| 1 | Flyer altitude over the void: an absolute y band per squad, or a `floorY` per encounter | C §3.7 defines altitude from the ground below, and most of this level has none |
| 2 | `forceField` material and the `lockRoom` lid: see-through, blocks movement, bullets and spells; flyers clamp to the room | Sky lockdowns |
| 3 | Materials `candleUp` and `candleDown` (emissive green and red, not hazards) | The level's look |
| 4 | Door condition `p.jet.has` | The SB gate |
| 5 | A fixed void-rescue point per section | SB after the floor breaks |
| 6 | Boss arena tile drop: solids that become movers and fall; arena-shift features placed only on remaining floor; the fire ring drawn over gaps | Part 3 |
| 7 | Two boss-script rules: held transform and last bar lock (§10) | Parts 3 and 5 |
| 8 | Player state "airborne" exposed to enemy AI, and a fuel-drain effect on the player | `flakPod` |
| 9 | Pacing estimate rows for `flakPod`, the L03 placeholder enemies, and a flying speed (8 m/s) | The validator in E14 |
| 10 | `flight` transitions (C §3.19) are not listed under any E id | S2 → S3 |

No spell number changes. Mana Shield taking the flak fuel drain is a `flakPod` rule.

## 15. Bot route and tests

**Bot route.** `walk` steps on decks, `jet` steps along authored air waypoints with altitude held to ±1 m (C §4.5).

| Section | Waypoints |
|---|---|
| S1 | spawn → zap `c1` from (28, 0, 60) → eb1 → clear E1 → gate1 → pedestal → jet h1, h2, h3 → Mempool → clear E2 → chain → tunnel |
| S2 | ent → chain → porch → cross x 47 → take `mg-pit` → hold on pk5 top through 4 waves → porchE → jet sl1, sl2, K8 → v3 → K11 → v4 → K14 → ring |
| S3 | depot → shrine → chain → FP1 on foot → jet R1 → zap `c2` → walk eb2 → R2 → jet beside slB to R3 → zap `c3` → walk eb3 → R4 → mouth → destroy gate pylon → tunnel |
| S4 | take `sn-mines` → snipe squads A and B from the wall → jet b3, b6, b9 → porch → cross x 153 → fight from hb3 → zap `c4` → eb4 → pod → exit |
| S5 | plaza → jet n2, n1, n3 → roof → vault → depot → exit door |
| SB | pedestal → gate → pylons from the centre tile → fight → breakers from the centre tile → fight → follow the Midget's cycle with `jet` steps |

**Tests for this level**

- Validator: no solid under 0.5 m, at most 600 solids per section, pacing estimate between 18:00 and 22:00, a `critPath` from every checkpoint.
- Reachability: every checkpoint to the next without Chain Zap after S1 (bridges eb2 to eb4 are optional), and SB with no jetpack use after the gate.
- Lockdowns: the entry door never closes on the player; no position inside either room lets a jetpack, Magic Carpet or Yeet-launched player leave; every spawn point is inside the room volume; the anti-stall mark fires after 12 s.
- `flakPod`: never fires at a grounded player; fires at an airborne one inside 45 m; no hit on a player walking a bridge under FP4; fuel drain is zero with Mana Shield on; Goo Bolt stops bursts for 4 s.
- Flock: 6 bitbugs count as 1 unit for `maxAlive`; a flock stays inside its room.
- Gravity well: bends enemy projectiles, never the player's.
- Boss: parts in order for both kill orders (Obama first, Midget first); rule 2 puts the Midget on the Moon Pad; bars are independent; the fight is won by the autopilot with the starter machine gun (finite ammo) and level-1 skills on 3 seeds; same seed and command log give the same state hash.
- Void rescue in SB lands on the centre tile.

## 16. Build tasks

1. `prefabs/void.js`: the prefabs of §7 and the three materials. Unit test that each prefab flattens to valid solids.
2. `L04/index.js`: header (tier 4, par 1200 s, `jetpack: 'pickup'`), section order, four transitions, the three cards.
3. `L04/S1.js` blockout from §6.1. Validator green. Map export.
4. `L04/S2.js` blockout from §6.2, with the Trading Pit as a `lockRoom`.
5. `L04/S3.js` blockout from §6.3. Wind lane and slabs.
6. `L04/S4.js` blockout from §6.4, with the Clearing House and the well.
7. `L04/S5.js` and `L04/SB.js` blockouts from §6.5 and §6.6. In SB use `duelArena('exchange')` for the (D) rows if it exists.
8. Mechanisms per section: conduits and bridges, doors, pads, updrafts, movers, targets, depots, shrine, power-ups, racks with `why`.
9. Encounters E1, E2, E4, E5, E6, E8 from §8, with altitude bands.
10. Lockdowns L1 and L2: `lockdown` mechanisms, named spawn points, wave tables, rewards, checkpoints.
11. `flakPod` data and behaviour (with the E8 engine owner), then the three C §3.12 flyers at their spec numbers.
12. `SB-BOSS`: part script (five parts, two rules, add schedule, tile drop), on top of the Duel port of the Duo.
13. Checkpoints, Golden Bonk, three Audit Files, signs, `critPath` neon.
14. Bot route from §15. Autopilot green in god mode, deterministic for a fixed seed.
15. Tests from §15. Then a tuning pass from a human playthrough: level data only.
16. PR notes: the canonical boss entry moves to `SB` / `SB-BOSS` and boss HP changes, so the campaign fingerprint is re-pinned in the batch pin PR (PLAN §12). Wave Mode, Sandbox and PvP pins must not move.
