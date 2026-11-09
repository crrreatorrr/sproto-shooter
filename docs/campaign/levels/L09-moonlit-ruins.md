# L09: Moonlit Ruins

Level document for `docs/campaign/PLAN.md` (cited as **PLAN §x**). Engine specs: `docs/codex/C-campaign-levels.md`
(**C §x**). Bosses: `docs/codex/C-bosses-sproto-duel.md` (**B §x**). Plan only; nothing here is built.

## 1. Header

| Field | Value |
|---|---|
| Stage | `moonlit`: ancient ruins on rolling hills |
| Lighting | Night. A huge moon low in the north, behind the ridge and the Moon Gate. Path lights are `neon` bands on obelisks and braziers |
| Tier | 9 (enemy HP and damage × 1.15^8 = 3.06) |
| Par | 21 min (budget below: 22.0 to 22.2 min, depending on the order) |
| Jetpack | Optional, on a pedestal at the camp. Ceiling y = 68 in the hub. No use inside the three lockdowns |
| Enemy total | 221 on Normal (135 before the finale, 86 in the finale), plus Sproto Beast and Tinubu |
| Route length | 1.1 km critical path; about 1.4 km with the fights and one optional route |
| Sections | 3: `S1` Ruin Plains (hub, terrain 640 × 560 m, four districts), `S2` Catacombs (interior 160 × 96 m, re-entry allowed), `S3` Moon Gate (arena 120 × 120 m) |
| Lockdowns | 3: **[L] Crypt of the Seal** (44 × 40 m), **[L] Sunken Stage** (80 m bowl under a dome), **[L] Moon Gate** (72 m ring) |
| Finale | Sproto Beast (2 parts), Big Obama twins (2 parts), Tinubu *Emi Lokan* (flees at 70%) |
| Golden Bonk | Swarm Surge |

## 2. Concept

The open battlefield. A camp in the middle of a moonlit plain, three outposts around it, and no fixed
order. Each outpost holds a **moon seal**; breaking all three opens the Moon Gate.

| Outpost | District | Discipline | Shape of the fight |
|---|---|---|---|
| **A Catacombs** | West, underground | Close quarters and explosives in the dark | Graveyard, a boom rush in a 4 m gallery, a crumbling hall, then a sealed crypt **[L]** |
| **B Colonnade Ridge** | North, a ridge 18 m high | Long range: snipers, turrets, Spotter Drones | Counter-snipe from the aqueduct, or sneak up the gully with Sproto Camo; then hold the seal in the open |
| **C Sunken Amphitheatre** | East, a bowl 8 m deep | Air and magic in low gravity | Balloons on the rim, then the bowl under a moon-barrier dome **[L]**: cultists, wisps, flocks, rotating rings |

What makes it different from L01 to L08: the player chooses the order; three patrols cross the map and
react to each capture; moon gates link the ruins and enemies walk through them too; the later an
outpost is taken, the stronger it is (§8.1). The hub is never sealed. The three lockdowns are inside
outposts A and C and at the Moon Gate.

**Cutscene cards**

| Card | When | Lines |
|---|---|---|
| Moonlit Ruins | Level start | "Three seals hold the Moon Gate shut." / "Break them in any order. They will notice." |
| Descent | Entering `S2` | "The plains were the map." / "The dead keep the other one." |
| The Moon Gate | Entering `S3` | "The gate is open. Something is sitting in front of it." |
| Emi Lokan | F3 boss card (2.6 s) | "It is my turn." |
| To the Caldera | Level end | "He left the door open. That is not kindness." |

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Whatever was carried from L08 (Rare, some Epic). The **camp cache** gives all four basic types at Epic, so no loadout is assumed |
| New gun types | None. All four basic types were unlocked by L02 |
| Spells held (13) | Goo Bolt, Chain Zap, Magic Carpet, Yeet, Sproto Swarm, Mana Shield, Pump It, Decoy, Meteor Bonk, Vape Cloud, Yoink, Blink, Lock-On |
| New spell | **Time Bubble** ("Audit Extension"): 45 mana, 20 s cooldown, a sphere of radius 6 m for 5 s. Enemies, their timers and their projectiles inside run at 30%. Shrine `H10` at the camp, (320, 2, 446) |
| Mana Battery | Hidden in the West Gully nook behind boulder `H40d`, (209, 5, 236). +10 max mana, +0.5 mana/s |
| Taught at camp | A half-buried Ruin Sentinel in the sparring pit `H12` slams every 5 s. Cast the bubble on it: the 1.2 s core window becomes 4 s |

**Time Bubble: four planned uses**

| Where | Use |
|---|---|
| A, Ossuary Gallery (A2-1) | Bubble the gallery mouth. Five Boom Midgets bunch up at 30% speed; one shot chains them all |
| B, Processional Stair (B2-1) | Bubble the open stair. The two Mining Rigs' streams crawl through it; walk between the bitcoins and reach the vents |
| C, Sunken Stage [L] wave 2 | Bubble the seal as the Bitbug flock dives. Eight bugs hang in the air for one Chain Zap |
| Finale, F1 part 2 | Bubble the Gate Warden as it raises its arms. Its core stays open 4 s and it dies in one window, which drops the Beast's ward |

Other spells that pay here: Sproto Swarm (buddies charge a seal while you fight), Decoy (snipers and
Spotter Drones lock onto it), Yoink (Bomb Tosser bombs, mines in the Charnel Crawl), Yeet (shove
enemies off a seal or off a rotating ring), Chain Zap and Goo Bolt (Hex Wisps take 200% from spells).

## 4. Time budget

Rules used, all from PLAN §3: each enemy costs its table seconds, a combat beat adds 30%, traversal is
metres ÷ 5.5, depots 45 s. Enemies PLAN §3 does not list are mapped to its classes: `hexWisp`,
`spotterDrone`, `shieldDrone` = flyer 5; `moonCultist`, `bombTosser` = support or artillery 8;
`ruinSentinel` = heavy 30. Three kinds of beat have a stated time instead of an enemy sum:

- **B3**, the hold on the ridge seal: 35 s of capture progress plus 10 s contested = 45 s. Enemies
  still alive when the seal breaks are banished (§8.5), so the 20 enemies of B3 cost no table time.
- **F1 and F2** are mini-boss stages at the bottom of PLAN §3's "mini-boss 150 to 210" row. Their adds
  are fought during the stage and are inside its time.
- **F3** is a scripted flee encounter: it ends at 70% boss HP or at t+75 s, whichever is first.

**Order A → B → C** (A is 1st, B 2nd, C 3rd; §8.1 gives what "2nd" and "3rd" add)

| # | Beat | Arithmetic | Seconds | Clock |
|---|---|---|---|---|
| 1 | Drop pad to camp | 60 m ÷ 5.5 | 10.9 | 0:11 |
| 2 | Camp depot: cache, shrine, jetpack, shop | depot breather | 45.0 | 0:56 |
| 3 | Shrine lesson: half-buried Sentinel | stated | 15.0 | 1:11 |
| 4 | Camp to gate ring to waystone Wa | (60 + 157) m ÷ 5.5 | 39.5 | 1:50 |
| 5 | **R1** First Contact (on the road, inside beat 4) | (cultist 8 + midget 6×3 + patrol 27) = 53 × 1.3 | 68.9 | 2:59 |
| 6 | **A1** Graveyard | (riot 2×8 + sewer 2×3) = 22 × 1.3 | 28.6 | 3:28 |
| 7 | Card "Descent" + stair | 4 + 34 m ÷ 5.5 | 10.2 | 3:38 |
| 8 | **A2** Ossuary and Cracked Hall | (boom 5×3 + miniTinubu 14) = 29 × 1.3 | 37.7 | 4:16 |
| 9 | **[L] A3** Crypt of the Seal, 4 waves, 25 enemies | (sentinel 30 + riot 8 + tosser 8 + fodder 22×3) = 112 × 1.3 | 145.6 | 6:41 |
| 10 | Exit gate, card, ring | 4 + 25 m ÷ 5.5 | 8.5 | 6:50 |
| 11 | **R2** Ring Raid | (patrol 27 + boom 2×3) = 33 × 1.3 | 42.9 | 7:33 |
| 12 | **B1** The Aqueduct | (sniper 2×8 + drone 5 + midget 3×3) = 30 × 1.3 | 39.0 | 8:12 |
| 13 | **B2** The Colonnade, 2nd | (rig 2×15 + agent 2×6 + sniper 8 + midget 4×3) = 62 × 1.3 | 80.6 | 9:32 |
| 14 | **B3** Hold the ridge seal | stated: 35 + 10 | 45.0 | 10:17 |
| 15 | Return gate to ring to waystone Wc | 25 m ÷ 5.5 | 4.5 | 10:22 |
| 16 | **C1** The Rim, 3rd | (obama 2×6 + balloon 3×5 + patrol 27) = 54 × 1.3 | 70.2 | 11:32 |
| 17 | **[L] C2** Sunken Stage, 3rd, 4 waves, 32 enemies | (base 99 + bitbug 4×3 + elite agent 2×12 + shield drone 5) = 140 × 1.3 | 182.0 | 14:34 |
| 18 | Return gate, ring, gate to the Forecourt | 85 m ÷ 5.5 | 15.5 | 14:50 |
| 19 | Forecourt depot | depot breather | 45.0 | 15:35 |
| 20 | Card "The Moon Gate" + entry stair | 4 + 22 m ÷ 5.5 | 8.0 | 15:43 |
| 21 | **[L] F1** Sproto Beast, 2 parts | mini-boss, stated | 150.0 | 18:13 |
| 22 | **[L] F2** Big Obama twins, 2 parts | mini-boss, stated | 150.0 | 20:43 |
| 23 | **[L] F3** Tinubu *Emi Lokan* + walk into the gate | 80 + 10 | 90.0 | 22:13 |
| | **Total** | | **1,332.6 s = 22.2 min** | par 21 ± 2 |

**Order C → B → A** (only the rows that change)

| Beat | Arithmetic | Seconds |
|---|---|---|
| Camp to ring to waystone Wc | (60 + 139) m ÷ 5.5 | 36.2 |
| R1 with the Sky Patrol | 53 × 1.3 | 68.9 |
| C1, 1st | 27 × 1.3 | 35.1 |
| [L] C2, 1st, 3 waves, 25 enemies | 99 × 1.3 | 128.7 |
| R2 with the Lantern Patrol | 33 × 1.3 | 42.9 |
| B1, B2 (2nd), B3 | 39.0 + 80.6 + 45.0 | 164.6 |
| A1, 3rd, with the fallen-back patrol | (22 + 27) = 49 × 1.3 | 63.7 |
| A2 | 29 × 1.3 | 37.7 |
| [L] A3, 3rd, 5 waves, 32 enemies | (112 + 12 + 29) = 153 × 1.3 | 198.9 |
| Everything else (beats 1 to 3, cards, hops, depot, finale) | 70.9 + 9.0 + 10.2 + 19.5 + 45 + 8 + 390 | 552.6 |
| **Total** | | **1,329.3 s = 22.2 min** |

**Order B → C → A** gives 1,322.2 s = 22.0 min (the first walk is 100 m instead of 157 m). All six
orders land between 22.0 and 22.2 min because the three patrols cost the same (27 s each), the
position extras are the same for every outpost (§8.1), and only the first walk differs.

A fast replay: portals after the first capture, Camo up the gully, bubble-and-chain on every swarm,
rockets on the Beast while it is stunned: about 15 min (70% of par).

**Why the total sits 1.2 min over par.** PLAN §3 asks L09 for 220 to 250 enemies. At 3 s each plus 30%
that is 14.3 min of combat before any traversal or the 6.5 min finale. The budget above holds only
because 86 enemies are finale adds inside stated stage times and 20 are in the B3 hold. See §14.

## 5. Overview map

North is up. One column = 10 m, one row = 20 m. `S1` is 640 × 560 m. Coordinates are section-local
with x east and z south, origin at the north-west corner (PLAN §4 says "south-west corner" and
"+z south"; both cannot hold, so this document uses the minimum-x, minimum-z corner).

```
x 0       100       200       300       400       500       600
   0 |                        {MOON GATE} -> S3 [L]
  40 |                                ^
  60 |                      D2  Forecourt  Gf
 100 |                               ||  back stair
 120 |                               T2             /N\ Needle (Golden Bonk)
 160 |                     T1 ======(B)======= T3
 180 |                    :        r    r
 200 |                    :          ##
 220 |                     :         ##  Processional Stair
 240 |                     :         ##
 260 |                      :                   JP
 280 |                 camo : nnnnnnnnnnnnnnnnn  aqueduct
 300 |                               Wb
 340 |                               +N
 360 |                                .                   oooooo
 380 |                                .                 oo dome oo
 400 |        graves               (RING)               o [L] C  o
 420 |   [A]>S2  +     Wa .....+W..  .  .  .....        oo seal oo
 440 |   [L] below                   .       +E....Wc     oooooo
 460 |                            [CAMP D1]
 500 |                                .
 520 |                              START
```

| Mark | Meaning |
|---|---|
| `[CAMP D1]` | Camp: depot 1, cache, Time Bubble shrine, jetpack |
| `(RING)` | Camp gate ring: four small moon gates `Ga`, `Gb`, `Gc`, `Gm` and the arrival disc |
| `Wa` `Wb` `Wc` | Waystone gates, paired with `Ga` `Gb` `Gc`. Dark until the first capture |
| `+W` `+N` `+E` | Wayshrines on the three roads (R1 happens at the one you take) |
| `[A]>S2` | Crypt portico, transition to `S2`. The Crypt of the Seal **[L]** is 150 m further, underground |
| `(B)` | Ridge seal. `T1` `T2` `T3` towers, `r` Mining Rig pads, `=` colonnade, `:` West Gully, `JP` jump pad |
| `[L] C` | Sunken Stage lockdown under the dome, with the seal on the stage |
| `D2` `Gf` | Forecourt: depot 2 and the gate paired with `Gm` (lit after three captures) |
| `{MOON GATE}` | Great Stair and the transition to `S3`, the finale lockdown |

**Distances** (metres, straight line)

| From | To | m | From | To | m |
|---|---|---|---|---|---|
| Start | Camp centre | 60 | Ring | Waystone Wa | 157 |
| Camp centre | Ring | 60 | Ring | Waystone Wb | 100 |
| Camp centre | Crypt portico (A) | 251 | Ring | Waystone Wc | 139 |
| Camp centre | Ridge seal (B) | 305 | Wa | Crypt portico | 93 |
| Camp centre | Stage seal (C) | 232 | Wb | Ridge seal | 150 |
| Ridge seal | Forecourt | 90 | Wc | West Arch of the bowl | 55 |

**Portals keep the walking in budget.** Only the first outpost is walked to (100 to 157 m from the
ring). Its capture lights its return gate and the whole camp ring. From then on: return gate →
arrival disc at the ring (one-way) → `Ga`/`Gb`/`Gc` → the waystone 55 to 150 m short of the next
outpost. After the third capture `Gm` leads to the Forecourt. Total traversal outside fights: 411 to
468 m (75 to 85 s).

## 6. Sections

Sizes are x × y × z. A box or ramp position is its centre; a cylinder, cone, disc or prefab position is
its base centre (`kit.js`). Prefabs are in §7.

### 6.1 `S1` Ruin Plains (hub)

**Terrain**

| Parameter | Value |
|---|---|
| Primitive | `terrain({ id: 'plains', origin: [0, 0, 0], size: [640, 560], cell: 2, seed: 909, mat: 'grass' })` |
| Noise | `amp: 6` m, `freq: 0.011` (hills about 90 m across), `octaves: 3` |
| Bounds | y from −14 to 70. Perimeter: four `rock` boxes 30 m high just outside the edges (`H64`) |
| Needs | `pads` (flatten to a height) and `stamps` (raise or lower), see §14 N1 |

| Pad or stamp | Shape | Centre (x, z) | Size | Height | Blend |
|---|---|---|---|---|---|
| `padStart` | disc | (320, 515) | r 12 | y 1 | 10 |
| `padCamp` | disc | (320, 455) | r 36 | y 2 | 16 |
| `padRing` | disc | (320, 395) | r 18 | y 3 | 12 |
| `padShrineW` / `N` / `E` | disc | (235, 425) / (320, 345) / (400, 430) | r 10 | y 3 / 5 / 2 | 8 |
| `padStoneA` / `C` | disc | (165, 420) / (455, 430) | r 9 | y 2 | 8 |
| `padGrave` | disc | (100, 415) | r 30 | y 1 | 12 |
| `padAqueduct` | box | (320, 292) | half 95 × 9 | y 6 | 10 |
| `stampRidge` | ellipse | (320, 150) | half 150 × 36 | +18 | 50 |
| `padCrest` | box | (320, 150) | half 135 × 30 | y 20 | 10 |
| `stampGully` | box, yaw 9° | (213, 236) | half 4 × 58 | −3 | 3 |
| `padForecourt` | disc | (320, 60) | r 24 | y 26 | 12 |
| `padGate` | box | (320, 22) | half 16 × 12 | y 32 | 6 |
| `padRim` | disc | (545, 400) | r 50 | y 0 | 10 |
| `bowl4` / `3` / `2` / `1` | disc | (545, 400) | r 40 / 32 / 24 / 16 | y −2 / −4 / −6 / −8 | 2 |

**Blockout**

| Id | Shape or prefab | Size | Position (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| H01 | `pod` | r 1.6, h 3 | (320, 1, 515) | metal | Start. Player faces north |
| H02–03 | `ruinedWall` L16 ×2 | 16 × 4 × 1 | (304, 2, 484), (336, 2, 484) yaw 0 | stone | Camp south wall, 16 m gap for the entrance |
| H04–05 | `ruinedWall` L20 ×2 | 20 × 4 × 1 | (288, 2, 462), (352, 2, 462) yaw 90 | stone | Camp west and east walls; exits at z 436 to 452 |
| H06–07 | `ruinedWall` L12 ×2 | 12 × 4 × 1 | (300, 2, 430), (340, 2, 430) yaw 0 | stone | Camp north wall, 28 m gap toward the ring |
| H08 | `depot` D1 | 6 × 2.4 × 3 | (332, 2, 462) yaw 270 | crate | Depot crate, health station, loadout bench, shop terminal, checkpoint. Safe radius 22 m |
| H09 | box (cache table) | 4 × 0.9 × 1.4 | (306, 2.45, 464) | wood | Camp cache: MG, shotgun, sniper, bazooka (Epic) |
| H10 | `spellShrine` | disc r 2.5 + `obelisk` | (320, 2, 446) | neon | Time Bubble. CP1 |
| H11 | cylinder | r 0.8, h 1 | (310, 2, 448) | gold | Jetpack pedestal |
| H12 | box ×4 (pit kerb) | 8 × 0.6 × 0.6 | square around (344, 2.3, 442) | stone | Sparring pit with the half-buried Sentinel |
| H13 | cylinder | r 0.6, h 0.4 | (320, 2, 460) | neon | Camp fire, critical-path light |
| H14 | `column` ×6 | r 0.9, h 7 | (296, 2, 446), (296, 2, 470), (344, 2, 470), (312, 2, 478), (328, 2, 478), (300, 2, 436) | pillar | Camp silhouette |
| H15 | cylinder (ring dais) | r 14, h 0.6 | (320, 3, 395) | stone | Gate ring floor |
| H16 | `gateSmall` `Ga` | ring r 2.2 | (308, 3.6, 395) yaw 270 | stone | Pair `Wa`. Lit when captures ≥ 1 |
| H17 | `gateSmall` `Gb` | ring r 2.2 | (320, 3.6, 383) yaw 180 | stone | Pair `Wb` |
| H18 | `gateSmall` `Gc` | ring r 2.2 | (332, 3.6, 395) yaw 90 | stone | Pair `Wc` |
| H19 | `gateSmall` `Gm` ×1.5 on a plinth | cylinder r 3, h 1.2 | (320, 3.6, 393) yaw 0 | gold | Pair `Gf`. Lit when captures = 3 |
| H20 | disc (arrival) | r 2 | (320, 3.6, 404) | neon | Where return gates drop you |
| H21 | `arch` ×3 | 10 × 8.2 × 2 | (304, 3, 408), (336, 3, 408), (320, 3, 372) | pillar | Cover around the ring |
| H22 | box ×6 (cover) | 2 × 1.2 × 1 | (310, 4.2, 402), (330, 4.2, 402), (306, 4.2, 388), (334, 4.2, 388), (314, 4.2, 380), (326, 4.2, 380) | stone | Crouch cover for R2 |
| H23 | `wayshrine` W | obelisk + 2 walls + 3 stubs | (235, 3, 425) | stone | R1 on the West Road. CP2 |
| H24 | `columnStub` ×8, neon caps | r 0.9, h 2 | every 17 m from (300, 440) to (181, 421) | pillar | West Road markers |
| H25 | `gateSmall` `Wa` | ring r 2.2 | (165, 2, 420) yaw 90 | stone | Waystone A |
| H26–27 | `ruinedWall` L30 ×2 | 30 × 4 × 1 | (105, 1, 392), (105, 1, 438) yaw 0 | stone | Graveyard walls |
| H28 | `grave` ×6 (burrow mounds) | 1 × 0.5 × 2 + stone | (118, 1, 402), (126, 1, 412), (116, 1, 424), (104, 1, 404), (108, 1, 428), (96, 1, 416) | dirt | Sewer Midget spawns G1 to G6 |
| H29 | `crypt` portico | 12 × 6 × 10 | (72, 1, 415) yaw 90 | stone | Door faces east. Transition to `S2` |
| H30 | `tomb` ×5 | 3 × 1.2 × 1.4 | (135, 1, 410), (130, 1, 426), (112, 1, 414), (92, 1, 406), (90, 1, 426) | stone | Cover for A1 |
| H31 | `standee` | — | (128, 1, 418) | wood | Shotgun (Epic), why: A1 to A3 |
| H32 | `barrel` fire ×2 | — | (86, 1, 411), (86, 1, 419) | — | Either side of the portico door |
| H33 | boulders ×4, wall, fallen column | sphere r 2; L10; 6 × 1.2 × 1.2 | (275, 432), (255, 418), (205, 428), (190, 410); (250, 436) yaw 20; (215, 418) | rock | West Road cover (y on terrain) |
| H34 | `wayshrine` N | as H23 | (320, 5, 345) | stone | R1 on the North Road |
| H35 | walls ×2, boulders ×2, fallen column | L10; r 2; 6 × 1.2 × 1.2 | (308, 368) yaw 90, (334, 322) yaw 90; (300, 330), (338, 356); (312, 312) | rock | North Road cover |
| H36 | `arch` ×9 (aqueduct piers) | 10 × 8.2 × 2 | (240 … 400 step 20, 6, 290) | pillar | The aqueduct; arches are firing positions |
| H37 | box (aqueduct deck) | 172 × 1 × 3 | (320, 14.7, 290) | stone | Walkable top, 8.2 m above the pad |
| H38 | `stairs` | 3 × 8.2 × 12 | (234, 10.1, 297) yaw 90 | stone | Up to the deck at its west end |
| H39 | `gateSmall` `Wb` | ring r 2.2 | (320, 6, 300) yaw 0 | stone | Waystone B |
| H40 | boulders a–f (spheres) | r 2 | (221, 280), (218, 262), (214, 248), (209, 234), (207, 212), (205, 192), y on terrain | rock | West Gully: hides the trench from the towers. `H40d` hides the Mana Battery |
| H41 | `powerup` Sproto Camo | — | (228, 6, 300) | — | Foot of the gully |
| H42 | `stairs` ×3 (Processional Stair) | 8 × 4.7 × 20 each | centres (320, 8.3, 240), (320, 13, 215), (320, 17.7, 190) | stone | From y 6 to y 20, facing north |
| H43 | box ×2 (landings) | 8 × 0.5 × 5 | (320, 10.4, 227.5), (320, 15.1, 202.5) | stone | Rest points with cover |
| H44 | `columnStub` ×6, box ×4 | r 0.9, h 2; 2 × 1.2 × 1 | stubs at x 314 and 326, z 245, 220, 195; boxes on the landings at x 317.5 and 322.5 | pillar | Cover on the stair |
| H45 | boulders ×8, fallen columns ×2 | r 2; 6 × 1.2 × 1.2 | (290, 270), (350, 268), (275, 240), (365, 238), (296, 215), (344, 210), (285, 192), (355, 190); (305, 258), (336, 228) | rock | Cover on the slope either side of the stair |
| H46 | box ×2 + lintel (gatehouse) | 6 × 5 × 4; 16 × 1 × 4 | (310, 22.5, 178), (330, 22.5, 178); (320, 25.5, 178) | stone | Stair head. Door spawner `B-GATEHOUSE-S` |
| H47 | box ×2 (rig pads) | 5 × 1 × 5 | (300, 20.5, 172), (340, 20.5, 172) | metal | Mining Rigs, overlooking the stair |
| H48 | `tower` T1, T2, T3 | r 4, h 14 | (222, 20, 150), (320, 20, 128), (418, 20, 150) | stone | Sniper perches; outside `stairs` 2 × 14 × 14 on the north side |
| H49 | `colonnadeBay` ×8 | 2 columns + lintel 20 × 1 × 1.2 | rows z 158 and z 164, x 240 to 400, the centre bay (x 310 to 330) open | pillar | Cover for B2 |
| H50 | `sealDais` B | r 9, h 0.4 | (320, 20, 148) | neon | Capture zone r 8 |
| H51 | `gateSmall` return `Ob` | ring r 2.2 | (336, 20.4, 146) yaw 270 | stone | One-way to the ring. Lit on capture |
| H52 | box ×8, fallen columns ×4 | 3 × 1.2 × 1; 6 × 1.2 × 1.2 | boxes on a 12 m circle round the seal; columns at (296, 152), (344, 152), (306, 138), (334, 138) | stone | Court cover |
| H53 | `stairs` (back stair) | 6 × 6 × 28 | (320, 23, 104) | stone | Ridge court to the Forecourt, y 20 to 26. Door spawner `B-GATEHOUSE-N` at its foot |
| H54 | `jumpPad` JP | disc r 1.5 | (430, 4, 262) → (424, 20, 172), apex 12 | neon | East approach to the ridge: fast and loud |
| H55 | `obelisk` Needle + 4 ledges | 5 × 30 × 5; ledges 3 × 0.5 × 3 | (448, 20, 140); ledges at y 26, 32, 38, 44 on alternate sides | stone | Golden Bonk on the top ledge. `lunarShrine` (low-g) at its foot |
| H56 | `depot` D2 | 6 × 2.4 × 3 | (304, 26, 60) yaw 90 | crate | Forecourt depot |
| H57 | `gateSmall` `Gf` | ring r 2.2 | (336, 26, 64) yaw 270 | gold | Pair `Gm` |
| H58 | `stairs` (Great Stair) | 10 × 6 × 18 | (320, 29, 37) | stone | Forecourt y 26 to the gate y 32 |
| H59 | `moonGate` (visual) + trigger box | ring r 9; 10 × 3 × 2 | (320, 32, 12); trigger (320, 33.5, 22) | gold | Three beams from the seals; transition to `S3` |
| H60 | `wayshrine` E, walls ×2, boulders ×3, fallen column | as H23; L10; r 2 | (400, 2, 430); (370, 440) yaw −15, (425, 422) yaw 10; (385, 415), (415, 440), (440, 418); (435, 436) | stone | East Road cover |
| H61 | `gateSmall` `Wc` | ring r 2.2 | (455, 2, 430) yaw 270 | stone | Waystone C |
| H62 | `column` ×12 (rim) | r 0.9, h 7 | on a circle r 43 round (545, 0, 400), every 30° | pillar | Dome posts; cover for C1 |
| H63 | `arch` (West Arch) + disc threshold | 10 × 8.2 × 2; ring r 34 | (503, 0, 400) yaw 90; disc line round (545, 400) | pillar / neon | Entry mark of the dome. CP outside it |
| H64 | box ×4 (perimeter) | 640 × 30 × 4, 4 × 30 × 560 | outside each edge | rock | Bounds |

The bowl interior (`H65` to `H76`) is in §8.4 with the lockdown.

**Mechanisms in `S1`:** 9 portals, capture zone B, the dome lockdown C, low-g shrines, 3 rotating
rings, jump pad, 2 depots, spell shrine. **Transitions out:** `H29` ⇄ `S2` (card "Descent"; `S2`
returns to the arrival disc `H20`; section memory keeps captures and taken items, C §3.19);
`H59` → `S3` (card "The Moon Gate", no return).

### 6.2 `S2` Catacombs

Footprint 160 × 96 m. Upper floor y 0, Lower Tunnels y −6. Walls are 1 m boxes, floors and ceilings
0.5 m. `roomShell` (§7) expands one row into floor, ceiling and four walls with the listed door gaps.
`dark` zones cover everything except the crypt; braziers mark the path.

```
z 28      +--------------------------------------------+      +---C-N----+
          | Ngal ============== GAL-N ================ |      | crypt N  |
          | N-DOOR                                     |      +---+  +---+
   40     |   []    []    []        tomb x8            |  +---+---+--+---+----+                      +---------+
          |                                            |  | rim                |  Ossuary Gallery     | Ante-   |   Descent    +------+
   48  Oa#|  []   (  SEAL  A  )   [] . . . threshold  #=====   cracked tiles   #======================| chamber |==============| start|
     exit |        grates x4                           | Seal| 18 x 18, 4 caps |  niches x12, barrels |         |   stair      +------+
   56     |   []    []    []                           | Pass+----+  +----+----+                      |  stairwell (Drain)
          |                               +--Robbers'--+      | crypt S |      +----Charnel Crawl-----+----+
   68     | Sgal ======= GAL-S ========== | Hole   #   |      +---C-S---+        mines x3      AF1
          +---------------S-DOOR----------+------------+
x         6                                            50    58          84                      120      134        152    160
   [L] Crypt of the Seal 44 x 40                 Lower (y -6): Under-hall under the tiles, Drain east to the stairwell,
                                                 fragile wall west to the Under-crypt tunnel, Vault, stair up to Robbers' Hole
```

| Id | Shape or prefab | Size or extent | Position | Mat | Purpose |
|---|---|---|---|---|---|
| K01 | `roomShell` Entry landing | x 152–160, z 44–52, floor y 6, h 4 | start (156, 6, 48) yaw 270 | stone | Arrival from the card. Automatic checkpoint |
| K02 | `stairs` Descent | 6 × 6 × 18 | (143, 3, 48) yaw 270 | stone | y 6 down to y 0; side walls 18 × 10 × 1 |
| K03 | `roomShell` Antechamber | x 120–134, z 40–56, h 4.5 | doors: E z 45–51, W z 46–50, S x 121–124 | stone | Breather; charge pack 1 at (130, 0, 42) |
| K04 | `stairs` Recovery (stairwell) | 3 × 6 × 8 | (128, −3, 53.5) yaw 90 | stone | Lower Tunnels back up into the Antechamber |
| K05 | `roomShell` Ossuary Gallery | x 84–120, z 46–50, h 3.5 | — | stone | 4 m wide, 36 m long. A2-1 |
| K06 | niches ×12 | 2 × 2.5 × 2 alcoves | x 87, 93, 99, 105, 111, 117 on both sides (z 44–46, z 50–52) | stone | Side-step cover; barrels in three |
| K07 | `barrel` ×3 | — | (93, 0, 45) fire, (105, 0, 51) shock, (117, 0, 45) fire | — | Chain with the boom rush |
| K08 | `door` Bone Door | 4 × 3.5 × 1, slides up | (84, 1.75, 48) | wood | Opens when A2-1 triggers; the rush comes through it |
| K09 | `roomShell` Charnel Crawl + link | x 84–120, z 58–61, h 2.8; link x 121–124, z 56–61 | — | stone | Second route past the gallery |
| K10 | `mine` ×3 | — | (112, 0, 59.5), (100, 0, 59.5), (90, 0, 59.5) | — | Shoot or Yoink them. Audit File 1 in the niche at (86, 0, 60.5) |
| K11 | `roomShell` Cracked Hall (walls and ceiling) | x 58–84, z 35–61, h 7 | doors: E z 46–50, W z 46–50, crawl at z 58–61 | stone | A2-2 |
| K12 | box ×4 (solid rim floor) | 26 × 0.5 × 4 (N, S), 4 × 0.5 × 18 (W, E) | (71, −0.25, 37), (71, −0.25, 59), (60, −0.25, 48), (82, −0.25, 48) | stone | Safe walkway round the tiles |
| K13 | `crackTiles` | x 62–80, z 39–57, tile 3 m (36 tiles) | y 0 | stone | Fall 1.0 s after a heavy step, respawn 20 s |
| K14 | cylinder ×4 + cap boxes | r 1, h 13; caps 3 × 0.5 × 3 | (66.5, −6, 43.5), (75.5, −6, 43.5), (66.5, −6, 52.5), (75.5, −6, 52.5) | pillar | Solid islands; the charger stuns itself on them |
| K15 | `roomShell` side crypts C-N, C-S | x 66–76, z 28–35; x 66–76, z 61–68; h 3.5 | doors 3 m wide onto the rim | stone | Hidden spawn rooms for A2-2 |
| K16 | `roomShell` Seal Passage | x 50–58, z 46–50, h 3.5 | — | stone | Checkpoint (56, 0, 48). Outside the entry slab |
| K17 | `roomShell` Crypt of the Seal **[L]** | x 6–50, z 28–68, h 9 | see §8.2 for doors and contents | stone | Lockdown room, 44 × 40 m |
| K18 | `roomShell` exit alcove + `gateSmall` `Oa` | x 0–6, z 45–51 | gate (3, 0, 48) yaw 90 | gold | Behind the exit slab. One-way to the ring |
| K19 | `roomShell` Under-hall | x 58–84, z 35–61, floor y −6, open to the tiles above | — | rock | Where you and the charger land. `water` disc r 12 |
| K20 | box (bone pile) | 4 × 1 × 4 | (71, −5.5, 48) | sand | Soft landing, no fall damage |
| K21 | `roomShell` Drain | x 84–124, z 52–55, floor y −6, h 2.8 | — | rock | Under-hall east to the Recovery stair |
| K22 | `fragileWall` ×2 | 3 × 3 × 1 | (58, −4.5, 48); (48, −4.5, 49.5) yaw 90 | stone | West wall of the Under-hall; the Vault door |
| K23 | `roomShell` Under-crypt tunnel | x 44–58, z 46.5–49.5, floor y −6, h 3 | — | rock | The breach route. Charge pack 2 at (80, −6, 37) |
| K24 | `roomShell` Vault | x 44–52, z 49.5–57.5, floor y −6, h 3 | — | gold | Secret weapon cache (§12) |
| K25 | `stairs` Breach stair | 3 × 6 × 8 | (46, −3, 61.5) yaw 0 | stone | Up into Robbers' Hole |
| K26 | `roomShell` Robbers' Hole | x 44–50, z 62–68, h 3 | door (slab) on its west face, z 63.5–66.5 | stone | Second entry into the crypt |
| K27 | `brazier` ×10 | — | Antechamber ×2, gallery at x 90, 102, 114, hall rim corners ×4, passage ×1 | neon | Critical-path lights |
| K28 | `hazardZone` dark ×4 | gallery, crawl, hall, lower tunnels | — | — | Fog; enemy sight ×0.4 (§14 N7) |

**Transition out:** `Oa` (after the lockdown) → card → `S1` arrival disc `H20`. Walking back out through
the portico also works.

### 6.3 `S3` Moon Gate

Footprint 120 × 120 m. A walled ring, floor radius 36 m, centre (60, 0, 64). The Moon Gate stands on a
dais at the north. A moon-barrier lid closes the ring at y 30. The whole section is the finale
lockdown (§10).

```
z  10            _____{ GREAT GATE }_____
   28          /  Ww  [=== dais ===]  We  \        Ww, We: Warden alcoves
   40        /        o           o        \       o: 8 pillars on a circle r 22
   52       |   o      []       []      o   |      []: 4 cover blocks
   64   Gw #|             (sigil)           |# Ge  Gw, Ge: side gates
   76       |   o      []  P3   []      o   |      P1 P2 P3: pod and rift discs
   88        \    P1  o           o  P2    /
  100          \_____ DC  [arch]  MG BZ __/
  116                  entry stair, start
x       24        40        60        80        96
```

| Id | Shape or prefab | Size | Position (x, y, z) | Mat | Purpose |
|---|---|---|---|---|---|
| M01 | cylinder (floor) | r 38, h 1 | (60, −1, 64) | stone | Arena floor |
| M02 | `ringWall` ×23 | 10 × 7 × 2 each | circle r 37.5 round (60, 64), gap at the south | stone | Walls the Beast's charge can hit |
| M03 | `arch` + `door` slab (entry) | 8 × 7 × 0.6 | (60, 3.5, 101.5) | neon | South Arch. Drops 1 s after the threshold |
| M04 | disc (threshold) | line r 30 | arc at z 94 | neon | 6 m inside the arch |
| M05 | `stairs` (entry) | 6 × 4 × 12 | (60, −2, 110) | stone | From y −4 up to y 0 |
| M06 | box (landing) | 10 × 0.5 × 6 | (60, −4.25, 117) | stone | Start (60, −4, 117). Checkpoint and ammo box |
| M07 | cylinder (gate dais) | r 13, h 1 | (60, 0, 30) | stone | The Beast starts here |
| M08 | `stairs` (dais steps) | 12 × 1 × 3 | (60, 0.5, 44.5) | stone | Front steps |
| M09 | `moonGate` | ring r 9, 16 boxes 3.6 × 1.6 × 1.6 | (60, 1, 24) yaw 0 | gold | Exit door. Spawn point `GREAT-GATE` |
| M10 | box ×2 (dais rails) | 8 × 1.2 × 1 | (49, 1.6, 40), (71, 1.6, 40) | stone | Crouch cover on the dais |
| M11 | Warden alcoves ×2 | back wall 5 × 6 × 1, plinth 3 × 0.6 × 3 | (42, 0, 34), (78, 0, 34) | stone | Statues `W-WARDEN`, `E-WARDEN` |
| M12 | `gateSmall` ×2 | ring r 2.2 | (25, 0, 64) yaw 90; (95, 0, 64) yaw 270 | stone | Spawn points `W-GATE`, `E-GATE` |
| M13 | cylinder ×8 (pillars) | r 1.5, h 8 | (80.3, 72.4), (68.4, 84.3), (51.6, 84.3), (39.7, 72.4), (39.7, 55.6), (51.6, 43.7), (68.4, 43.7), (80.3, 55.6) | pillar | Destructible: a Beast charge breaks one and leaves a 1.2 m stump |
| M14 | box ×4 (cover) | 4 × 1.4 × 1.5 | (48, 0.7, 76), (72, 0.7, 76), (48, 0.7, 52), (72, 0.7, 52) | stone | Full crouch cover |
| M15 | disc ×3 (pod and rift marks) | r 3 | P1 (38, 0, 86), P2 (82, 0, 86), P3 (60, 0, 76) | neon | Spawn points `P1`, `P2`, `P3` |
| M16 | disc (moon sigil) | r 10 | (60, 0, 64) | neon | Centre; low-g zone in F2 part 2 |
| M17 | `depot crate` DC3 | 2 crates | (50, 0, 97) | crate | Unlimited ammo inside the lockdown |
| M18 | `standee` ×2 | — | MG (67, 0, 97), bazooka (72, 0, 96) | wood | Epic. Why: the finale needs no carried gun |
| M19 | `barrel` shock ×4 | — | (34, 0, 58), (34, 0, 70), (86, 0, 58), (86, 0, 70) | — | Big Obamas are weak to shock |
| M20 | `manaBloom` ×2 | — | (44, 0, 64), (76, 0, 64) | — | Mana for the bubble |
| M21 | `brazier` ×8 | — | circle r 34, every 45° from 0° | neon | Light |
| M22 | `columnStub` ×6 | r 0.9, h 1.2 | circle r 32 at 30°, 60°, 120°, 150°, 210°, 330° | pillar | Low cover at the wall |
| M23 | `fallenColumn` ×4 | 6 × 1.2 × 1.2 | (30, 0.6, 50), (90, 0.6, 50), (36, 0.6, 88), (84, 0.6, 88) | pillar | Cover near the side gates and pods |
| M24 | force-field lid | disc r 38 at y 30 | (60, 30, 64) | glass | No jetpack or carpet exit |
| M25 | `hazardZone` fire ring (F3) | radius 27.8, off until F3 | (60, 0, 64) | lava | Tinubu's ring (B §2.5) |
| M26 | sphere (moon, visual) | r 60 | (60, 70, −260) | neon | Behind the gate, outside the bounds |

**Transition out:** the Great Gate becomes a `reach` volume when Tinubu leaves → card "To the Caldera" → level complete.

## 7. Prefabs

Theme file `src/data/levels/prefabs/moonlit.js`. Lengths run along local x at yaw 0.

| Prefab | Parts |
|---|---|
| `column(h = 7)` | cylinder r 0.9, h; cap box 2.2 × 0.5 × 2.2 |
| `columnStub(h = 2)` | cylinder r 0.9, h 1.2 to 2; optional `neon` cap box 1 × 0.5 × 1 |
| `fallenColumn` | box 6 × 1.2 × 1.2 `pillar` (crouch cover) |
| `arch(w = 8, h = 7)` | 2 cylinders r 0.9, h 7, 8 m apart; lintel box 10 × 1.2 × 2 |
| `ruinedWall(L)` | three boxes in a row, 1 m thick: L/2 long × 4 high, L/3 × 2 (full cover), L/6 × 1.2 (crouch) |
| `obelisk(h = 9)` | box 1.4 × h × 1.4; cone r 1, h 1.6 `gold`; `neon` band box 1.5 × 0.5 × 1.5 at 2 m |
| `wayshrine` | `obelisk`, 2 × `ruinedWall(8)` at right angles 5 m out, 3 × `columnStub`, disc r 6 |
| `gateSmall` | 12 boxes 1 × 0.6 × 0.6 on a vertical circle r 2.2 (opening 3.6 m wide, 3.8 m high); plinth box 5 × 0.5 × 1.5; `portal` volume 3.4 × 3.4 × 0.5 |
| `moonGate` | 16 boxes 3.6 × 1.6 × 1.6 on a vertical circle r 9; `neon` disc r 8 as the portal surface |
| `crypt` | 4 wall boxes round 12 × 6 × 10 (1 m thick), roof box 12 × 0.6 × 10, doorway 3 × 3, 4 × `column(5)` in front, ramp down 3 × 2 × 6 inside |
| `grave` | mound box 1 × 0.5 × 2 `dirt`; headstone box 0.8 × 1.2 × 0.5 |
| `tomb` | box 3 × 1.2 × 1.4 (a sarcophagus; crouch cover) |
| `tower` | cylinder r 4, h 14; 8 parapet boxes 2.4 × 1.2 × 0.5 at r 3.7 on top; outside `stairs` 2 × 14 × 14 |
| `colonnadeBay` | 2 × `column(8)` 20 m apart; lintel box 20 × 1 × 1.2 |
| `brazier` | cylinder r 0.5, h 1; sphere r 0.4 `neon` |
| `sealDais` | cylinder r 9, h 0.4; disc r 8 `neon`; `obelisk(6)` 6 m north of centre; `captureZone` r 8 |
| `lunarShrine(r)` | disc r `neon`; 4 × `columnStub` at the edge; sphere r 1 `neon` floating at 5 m; `hazardZone` lowG ×0.4, 30 m high |
| `stoneRing(r)` | `rotator` about y: 4 boxes (0.39 r) × 1 × 3 at 0°, 90°, 180°, 270° (four platforms, four gaps) |
| `aisle` | 4 × `stairs` 4 × 2 × 4 in a line, one per terrace step |
| `bench` | box 5 × 1.2 × 1 `stone` |
| `vomitory` | frame of 3 boxes round a 4 × 3 opening, 3 m deep; a `door` spawner |
| `ringWall` | box 10 × 7 × 2, placed tangent to a circle |
| `slab` | box (door width) × (full height) × 0.6 with `neon` trim: red locked, green open (PLAN §5.6) |
| `roomShell({min, max, h, doors})` | kit helper: floor and ceiling boxes 0.5 thick, four walls 1 thick, split at each door gap |
| `pod`, `standee`, `depot` | start pod (cylinder + cone); cardboard Sproto with a gun; depot crate, health station, loadout bench, shop terminal (PLAN §7.7) |

## 8. Encounters

Ten combat encounters and the three-stage finale. `R1` and `R2` are road fights with the patrols.
Each outpost has an approach, a capture fight and a counter-attack; at A and C the last two are the
waves of a lockdown.

| Id | Where | Kind | Enemies (1st position) | Table s | Time | Intensity |
|---|---|---|---|---|---|---|
| R1 | Wayshrine on the road you take | clearAll | 13 | 53 | 1.1 min | 0.45 |
| A1 | Graveyard (hub) | clearAll | 4 | 22 | 0.5 min | 0.4 |
| A2 | Ossuary Gallery, Cracked Hall | reach | 6 | 29 | 0.6 min | 0.6 |
| **A3 [L]** | Crypt of the Seal | lockdown | 25 | 112 | 2.4 min | 0.85 |
| R2 | Camp gate ring | clearAll | 8 | 33 | 0.7 min | 0.5 |
| B1 | Aqueduct and slope | reach | 6 | 30 | 0.7 min | 0.5 |
| B2 | Colonnade court | clearAll | 5 | 50 | 1.1 min | 0.7 |
| B3 | Ridge seal | capture (hold) | 20 | stated | 0.75 min | 0.8 |
| C1 | Rim of the bowl | clearAll | 5 | 27 | 0.6 min | 0.4 |
| **C2 [L]** | Sunken Stage | lockdown | 25 | 99 | 2.1 min | 0.85 |
| **F1–F3 [L]** | Moon Gate | boss stages | 86 + 2 bosses | stated | 6.5 min | 0.9, 0.9, 0.7 |

No two encounters above 0.8 follow each other: a portal hop and a road or approach fight sit between
A3, B3 and C2, the Forecourt depot sits before F1, and F1 and F2 are split by a 10 s resupply (§10).
The lockdowns are never back to back.

**Awake at once.** Only the outpost the player is in runs. Limits: 16 ground enemies and 8 flyers in
full combat AI (a Bitbug flock is one unit per 6); at most one patrol materialised (6, on a cheap
roam tick until it sees the player); placed idle squads within 70 m (at most 8). At most 38 enemies
exist in the level at any time, under the cap of 48 (C §3.8). A squad waits to spawn while it would
push the ground count over 16.

### 8.1 Order scaling and patrols

An outpost's **position** is 1 + the number of seals already broken when its approach encounter
activates. It is fixed at that moment.

| Position | Name | Approach fight | Capture fight (lockdown waves at A and C) | Counter-attack |
|---|---|---|---|---|
| 1st | Garrison | Base table | Base table | Base table |
| 2nd | Alerted | Base | **+4 fodder** in one named squad | Base |
| 3rd | Last Stand | Base **+ the fallen-back patrol** (6) | +4 fodder **+ the Audit Team**: elite `glowieAgent` ×2 and `shieldDrone` ×1, as an extra last squad or wave | Base |

| Outpost | 2nd and 3rd: +4 fodder | 3rd: the Audit Team arrives | 3rd: the patrol waits |
|---|---|---|---|
| A | Wave 2: `midget` ×4 jump down from `GAL-S` | Wave 5, `door`, one agent from `GAL-N`, one from `GAL-S`, the drone from `N-DOOR` | In the Graveyard, behind tombs `H30` (squad A1-P) |
| B | B2-4: `midget` ×4, `door`, `B-GATEHOUSE-N` | B2-5, `portal`, out of `Ob` (it flickers on for them) | At the aqueduct, under arches 4 to 6 (squad B1-P) |
| C | Wave 3: `bitbug` ×4 more from `RIFT` | Wave 4, agents by `door` from `E-TUNNEL`, the drone by `air` from `RIFT` | On the west rim between columns (squad C1-P) |

| Position | A3 [L]: waves, enemies, table s, time | C2 [L]: waves, enemies, table s, time | B2 + B3: enemies, time |
|---|---|---|---|
| 1st | 4 waves, 25, 112, 146 s | 3 waves, 25, 99, 129 s | 5 + 20, 65 + 45 s |
| 2nd | 4 waves, 29, 124, 161 s | 3 waves, 29, 111, 144 s | 9 + 20, 81 + 45 s |
| 3rd | 5 waves, 32, 153, 199 s | 4 waves, 32, 140, 182 s | 12 + 20, 118 + 45 s |

Every lockdown stays inside PLAN §5.6 at every position: 25 to 32 enemies, 3 to 5 waves, 2.1 to 3.3 min.

**The three patrols.** Each has 6 enemies and costs 27 table seconds, so any of them can fill any slot.

| Patrol | Sector | Composition | Route (loop, walking 3 m/s) |
|---|---|---|---|
| Lantern Patrol | West (A) | `riotMidget` ×1, `hexWisp` ×2 (the lanterns), `midget` ×3 | Ring west arch (304, 408) → wayshrine W → `Wa` → graveyard gate (132, 415) and back |
| Gate Wardens | North (B) | `glowieAgent` ×3 (one flashbang), `midget` ×3 | Ring north arch (320, 372) → wayshrine N → `Wb` → aqueduct west end (240, 292) and back |
| Sky Patrol | East (C) | `flyingMidget` ×3, `obama` ×1, `midget` ×2 | Ring east arch (336, 408) → wayshrine E → `Wc` → West Arch (503, 400) and back; flyers 5 m above the others |

| Event | What the patrols do |
|---|---|
| Level start | All three are abstract: a point moving on its route, no entities. A patrol materialises when the player is within 150 m and has no line of sight to it |
| The player leaves the ring on a road | That sector's patrol heads for its wayshrine and arrives as squad R1-2 |
| First capture, sector X | The camp ring and all waystones light. The patrol of the next sector clockwise (A → B → C → A) walks through its waystone gate and holds the camp ring: encounter R2. The third patrol shortens its loop to wayshrine ⇄ waystone |
| The player commits to the second outpost (its approach activates) | If the third patrol's sector is that outpost, it withdraws through its waystone gate to the last outpost. The player sees the last two step through |
| Second capture | The third patrol, wherever it is, gates to the last outpost and joins its approach fight (X1-P) |
| A patrol is killed early | Its later slot is empty. The level total does not change |
| The player flies past R1 | The patrol follows to the approach line and joins the approach fight as a late squad |
| The player runs from a patrol | Survivors go back to their route and keep their damage |

### 8.2 Outpost A: Catacombs

**A1 Graveyard** — hub, `padGrave`, 60 × 46 m between walls `H26`–`H27`. Objective: `clearAll`, opens the portico.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A1-1 | `onEnter` 20 m past `Wa` | `placed` | Portico steps (80, 415) | `riotMidget` ×2 | A two-shield wall on a door; flank round the tombs or use the barrels `H32` |
| A1-2 | `onAlert` | `burrow` | Graves G2, G5 | `sewerMidget` ×2 | Watch the dust; the shotgun standee is 10 m away |
| A1-P | 3rd position only, `onEnter` | `placed` | Behind tombs `H30` | The fallen-back patrol (6) | The outpost was warned |

`maxAlive` 10. Two approaches: the road, or over the north wall gap at (120, 392). Cover: five tombs,
six headstones. Shotgun standee `H31`, shells and rockets at the portico (§12). 0.5 min (1.1 min in 3rd).

**A2 Ossuary and Cracked Hall** — `S2`, 36 m gallery then the 26 × 26 m hall. Objective: `reach` the Seal Passage.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A2-1 | `onEnter` gallery, x < 116 | `door` | Bone Door `K08` | `boomMidget` ×5 | **Time Bubble use.** Bubble the gallery; one shot chains five. Or step into a niche, or take the Charnel Crawl and its mines |
| A2-2 | `onEnter` hall | `hidden` | Side crypt C-N | `miniTinubu` ×1 | It charges across the tiles. At 15 m/s the tiles hold; slowed by goo or the bubble they drop it 6 m (half its HP, stunned 2 s). It also stuns itself on the four pillars |

`maxAlive` 8. Two approaches each: gallery or crawl; across the tiles, round the rim, or down through
the Under-hall to the breach. Cover: 12 niches, 4 pillars. Shells in the Antechamber and at the hall
rim. 0.6 min.

**A3 [L] Crypt of the Seal** — lockdown.

| Lockdown | Value |
|---|---|
| Room | `K17`, 44 × 40 m, 9 m high, stone ceiling. Two levels: the floor and two galleries at y 3.5 |
| Entry doors | Slab `A-IN` in the Seal Passage (50, z 46–50), threshold at x 44. Slab `A-HOLE` on Robbers' Hole (44, z 63.5–66.5), threshold at x 38. Both drop 1 s after either threshold is crossed |
| Exit door | Slab `A-OUT` at (6, z 45–51) in front of the return gate `Oa` |
| Checkpoint | Seal Passage (56, 0, 48), outside `A-IN` |
| Spawn points | `N-DOOR` (18, 0, 28) north wall; `S-DOOR` (38, 0, 68) south wall; `GAL-N` (28, 3.5, 28) and `GAL-S` (28, 3.5, 68) gallery doors; `GRATES` four floor grates at (23, 43), (33, 43), (23, 53), (33, 53) |
| Reward | Chest and ammo crate on the dais, mana bloom; `A-OUT` opens; seal A breaks |

| Id | Shape or prefab | Size | Position (x, y, z) | Purpose |
|---|---|---|---|---|
| A01 | `sealDais` A | r 9, h 0.4 | (28, 0, 48) | The seal; the Sentinel stands on it as a statue |
| A02 | box ×2 (galleries) | 44 × 0.5 × 4 | (28, 3.25, 30), (28, 3.25, 66) | Second level; rails 44 × 1 × 0.5 on the inner edge |
| A03 | `stairs` ×2 | 2 × 3.5 × 7 | (8, 1.75, 35.5) yaw 180, (8, 1.75, 60.5) yaw 0 | Floor to galleries at the west end |
| A04 | `tomb` ×8 | 3 × 1.2 × 1.4 | (16, 0, 38), (28, 0, 36), (40, 0, 38), (14, 0, 48), (42, 0, 48), (16, 0, 58), (28, 0, 60), (40, 0, 58) | Eight pieces of cover round the dais |
| A05 | `column(9)` ×4 | r 1, h 9 | (20, 0, 41), (36, 0, 41), (20, 0, 55), (36, 0, 55) | Full cover; hold the galleries up |
| A06 | `brazier` ×4 | — | (12, 0, 32), (44, 0, 32), (12, 0, 64), (44, 0, 64) | The crypt is lit; the Sentinel's core is the brightest thing in it |
| A07 | `barrel` shock ×2 | — | (10, 0, 36), (46, 0, 60) | Under the galleries |
| A08 | spawn closets ×4 | 4 × 3 × 4 behind each door | behind `N-DOOR`, `S-DOOR`, `GAL-N`, `GAL-S` | Out of sight until the door opens |

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Doors drop, t+1 | `placed`; `burrow` | Dais; `GRATES` | `ruinSentinel` ×1; `sewerMidget` ×4 | The Sentinel in a mix. Its core shows only in the 1.2 s wind-up; rockets and barrels hurt its body |
| 2 | `onRemain(2)` or t+25 | `door` | `N-DOOR`; `S-DOOR` | `riotMidget` ×1; `boomMidget` ×4 | Shoot a boomer behind the shield and the shield goes with it. *2nd, 3rd: + `midget` ×4 from `GAL-S`* |
| 3 | `onRemain(2)` or t+25 | `door`; `burrow` | `GAL-N`; `S-DOOR`; `GRATES` | `bombTosser` ×1; `midget` ×4; `sewerMidget` ×3 | The counter-attack. Bombs come down from the gallery: Yoink them back, or bubble them |
| 4 | `onRemain(2)` or t+25 | `door`; `burrow` | `N-DOOR`; `GRATES` | `boomMidget` ×3; `sewerMidget` ×4 | Burrowers come up on the seal while boomers cross the floor |
| 5 | 3rd only, `onRemain(2)` or t+25 | `door` | `GAL-N`; `GAL-S`; `N-DOOR` | elite `glowieAgent` ×2; `shieldDrone` ×1 | The Audit Team shoots down from both galleries; the drone shields one of them |

`maxAlive` 16. The seal charges while the player or a Sproto Swarm buddy stands on it with no enemy on
it; every 20 s of charge it pulses and stuns everything in the room for 3 s. Inside the room: shells
×2 and rockets ×1 (§12). 2.4 min (2.7 in 2nd, 3.3 in 3rd).

### 8.3 Outpost B: Colonnade Ridge

Open ground. No lockdown. The seal is 150 m from the waystone and 14 m above it.

**B1 The Aqueduct** — the slope from z 300 to z 180. Objective: `reach` the stair head or the gully top.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| B1-1 | `onEnter` z < 310 | `placed` | Tops of `T1` and `T3` | `auditSniper` ×2 | Counter-snipe from the arches (sniper standee at arch 4). Their lasers are visible from 150 m. Each relocates to `T2` after two shots |
| B1-2 | with B1-1 | `air` | Over the slope, a figure-eight between (270, 240) and (370, 240) | `spotterDrone` ×1 | A cone held 1.5 s calls a mortar and starts B2 early. Decoy takes the cone |
| B1-3 | `onEnter` first landing (z 227) or `onAlert` | `door` | `B-GATEHOUSE-S` | `midget` ×3 | Flushes you out of sniper cover |
| B1-P | 3rd only, `onEnter` | `placed` | Under aqueduct arches 4 to 6 | The fallen-back patrol (6) | The outpost was warned |

`maxAlive` 10. Three approaches: the Processional Stair (direct), the West Gully with Sproto Camo (out
of sight of the towers until the last 20 m; Camo covers it), the jump pad `JP` (lands beside `T3`).
Cover: 9 arches, 10 boulders, 6 stubs. 0.7 min (1.2 in 3rd).

**B2 The Colonnade** — the crest court, 90 × 50 m. Objective: `clearAll`; the seal is warded until it is done.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| B2-1 | `onEnter` third stair flight, gully top or `JP` landing | `placed` | Rig pads `H47` | `miningRig` ×2 | **Time Bubble use.** Both rigs cover the stair. Bubble it and walk through the streams; or come up the gully behind the west rig's vent; or rockets from the aqueduct |
| B2-2 | `onAlert` | `hidden` | Colonnade bays 2 and 7 | `glowieAgent` ×2 | A cover fight between columns; look away from the flashbang |
| B2-3 | `onRemain(3)` | `placed` | Top of `T2` | `auditSniper` ×1 | A sniper 20 m above the seal. Climb the tower stair or snipe from a bay |
| B2-4 | 2nd, 3rd: `onRemain(3)` | `door` | `B-GATEHOUSE-N` | `midget` ×4 | — |
| B2-5 | 3rd: `onRemain(1)` | `portal` | `Ob` | elite `glowieAgent` ×2, `shieldDrone` ×1 | The Audit Team |

`maxAlive` 12. Sniper rounds on both outer towers and in the court; rockets at the aqueduct. 1.1 min
(1.3 in 2nd, 2.0 in 3rd).

**B3 Hold the ridge seal** — `capture`: 35 s of progress on `H50`. Progress pauses while an enemy
stands in the zone and while neither the player nor a buddy is in it. The hold starts when the player
touches the seal, so the pause before it is the player's. When progress reaches 100% the seal breaks
and its pulse banishes every enemy that arrived during the hold (no drops from them).

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| B3-1 | `onHold(10%)` | `drop` | Pod on the court at (300, 20, 140) | `midget` ×6 | They run onto the seal. Yeet them off, or let the buddies hold it |
| B3-2 | `onHold(40%)` | `door` | `B-GATEHOUSE-N` | `glowieAgent` ×3, `shieldDrone` ×1, `midget` ×2 | Ranged pressure from the back stair; you cannot leave the seal for long |
| B3-3 | `onHold(70%)` | `air`; `placed` | From the north over the Forecourt; tops of `T1`, `T3` | `jetObama` ×2, `flyingMidget` ×3, `spotterDrone` ×1; `auditSniper` ×2 | Long range from every side at once. Use the seal obelisk and the fallen columns |

`maxAlive` 16. 0.75 min at every position.

### 8.4 Outpost C: Sunken Amphitheatre

**C1 The Rim** — from `Wc` to the West Arch, 55 m. Objective: `clearAll`.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| C1-1 | `onEnter` 20 m past `Wc` | `placed` | Between rim columns at 150°, 180°, 210° | `obama` ×2 | Ranged enemies with a wall of columns |
| C1-2 | t+3 | `air` | Rising out of the bowl | `balloonMidget` ×3 | Shoot them over the Obamas: one balloon chains the rest. MG standee is inside the dome, so the camp MG or any gun does here |
| C1-P | 3rd only | `placed` | West rim | The fallen-back patrol (6) | — |

`maxAlive` 10. Approaches: the road to the West Arch, or round the rim to either side. Cover: 12 rim
columns, the East Road ruins. 0.6 min (1.2 in 3rd).

**C2 [L] Sunken Stage** — lockdown.

| Lockdown | Value |
|---|---|
| Room | The bowl inside the rim: a circle of radius 40 m (80 m across), four terraces dropping 2 m each to the stage at y −8. Five height levels with the stage, plus three rotating rings |
| Lid and doors | A moon-barrier **dome**: a hemisphere of radius 40 m centred at (545, 0, 400). Apex 40 m above the rim, 48 m above the stage. It is the entry door and the lid: it closes 1 s after the player crosses the threshold ring r 34, and pushes a player standing on the line inward |
| Exit door | The return gate `Oc` on the stage, dark and solid until the last enemy dies |
| Checkpoint | West Arch (501, 0, 400), outside the dome |
| Spawn points | `E-TUNNEL` (583, −2, 400); `N-VOM` (545, −2, 362); `S-VOM` (545, −2, 438); `TRAP` stage trapdoor (545, −7.6, 406); `RIFT` at the dome apex (545, 34, 400) |
| Reward | Chest and ammo crate on the stage, mana bloom; the dome drops; `Oc` lights; seal C breaks |

| Id | Shape or prefab | Size | Position (x, y, z) | Purpose |
|---|---|---|---|---|
| H65 | cylinder (stage) | r 14, h 0.4 | (545, −8, 400) | Stage floor |
| H66 | `sealDais` C | r 9, h 0.4 | (545, −7.6, 400) | The seal |
| H67 | `aisle` ×4 | 4 stairs 4 × 2 × 4 each | W: (505, −1), (513, −3), (521, −5), (529, −7) at z 400; N, E, S the same, rotated | Walkable ways down; the terrace steps are 2 m |
| H68 | `bench` ×12 | 5 × 1.2 × 1 | r 36 (y −2), r 28 (y −4), r 20 (y −6), each at 45°, 135°, 225°, 315° | Twelve pieces of cover |
| H69 | `stoneRing` ×3 | r 12 at y −3, 2 rpm; r 22 at y 2, −1.5 rpm; r 32 at y 7, 1 rpm | centre (545, 400) | Moving high ground; four platforms each |
| H70 | `lunarShrine` ×3 | r 7, r 7, r 10 | (545, −4, 372), (545, −4, 428), stage (545, −7.6, 400) | Low gravity ×0.4: a double jump reaches 6.5 m, enough for the rings |
| H71 | `vomitory` ×3 | 4 × 3 opening | `E-TUNNEL`, `N-VOM`, `S-VOM`, set into the top terrace riser | Door spawners |
| H72 | disc (trapdoor), rift marker | r 1.5; sphere r 1.5 `neon` | `TRAP`, `RIFT` | Burrow and air spawners |
| H73 | dome | hemisphere r 40 | (545, 0, 400) | `neon` field; flyers stay inside it |
| H74 | `standee` | — | (509, −2, 394) | MG (Epic), why: flyers and flocks |
| H75 | `powerup` Mana Surge | — | on ring 2, first platform, (567, 3, 400) at rest | 20 s of 4× mana regen for the wisps and the bubble |
| H76 | `gateSmall` `Oc` | ring r 2.2 | (545, −7.6, 412) yaw 0 | Exit door and return gate |

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Dome closes, t+1 | `placed`; `summon`; `hidden` | The two terrace shrines; the cultists' portals; `TRAP` | `moonCultist` ×2; `midget` ×6 (one batch of 3 from each portal); `hexWisp` ×2 | Cultists in a mix: shoot both rings first. Wisps take 20% from bullets and 200% from spells; Mana Surge is on ring 2 |
| 2 | `onRemain(2)` or t+25 | `air` | `RIFT`; `N-VOM` | `bitbug` ×8; `balloonMidget` ×2 | **Time Bubble use.** The flock dives at the seal: bubble it, Chain Zap it. Balloons drift between the rings |
| 3 | `onRemain(2)` or t+25 | `air` | `E-TUNNEL`; `S-VOM` | `jetObama` ×1; `bitbug` ×4 | A dogfight in low gravity; the Jet Obama matches your height. *2nd, 3rd: + `bitbug` ×4 from `RIFT`* |
| 4 | 3rd only, `onRemain(2)` or t+25 | `door`; `air` | `E-TUNNEL`; `RIFT` | elite `glowieAgent` ×2; `shieldDrone` ×1 | The Audit Team takes the top terrace; fight uphill or ride a ring over them |

`maxAlive` 16 ground, 8 flyers. Cultist portals inside a lockdown give exactly one batch, so the wave
count is fixed. The seal charges and pulses as in A3. Inside the dome: bullets ×3, the MG standee,
Mana Surge. The jetpack works under the dome but cannot leave it. 2.1 min (2.4 in 2nd, 3.0 in 3rd).

### 8.5 Road fights

**R1 First Contact** — the wayshrine of the road the player takes first (`H23`, `H34` or `H60`). Objective: `clearAll`.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| R1-1 | `onEnter` 60 m out from the ring | `placed` | At the wayshrine obelisk | `moonCultist` ×1; its portal gives `midget` ×3 twice (6) | The cultist alone. Shoot the ring and the Midgets stop |
| R1-2 | `onKills(4)` or t+25 | `placed` (walks in) | Along the road from the waystone | That sector's patrol (6) | A patrol in open ground. The Lantern Patrol's wisps want a spell, the Gate Wardens want cover, the Sky Patrol wants the MG |

`maxAlive` 12. Cover: two shrine walls, three stubs, boulders. Approaches: the road or either flank
over the hills. Bullets box at each wayshrine. Checkpoint CP2 when clear. 1.1 min.

**R2 Ring Raid** — the camp gate ring, after the first capture. Objective: `clearAll`.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| R2-1 | The player arrives on the disc `H20` | `portal` | The camp gate of the next sector clockwise | That sector's patrol (6) | Enemies use the gates. The ring glows 1 s before each one steps out |
| R2-2 | `onRemain(3)` | `portal` | The third sector's camp gate | `boomMidget` ×2 | Watch the other gate too |

`maxAlive` 10. Cover: three arches and six blocks. The depot's safe radius ends 30 m south. 0.7 min.

## 9. New enemies

Stats are tier 1; tier 9 multiplies HP and damage by 3.06. Drops follow PLAN §7: ammo, health, mana,
tickets, guns. No resources.

### 9.1 `ruinSentinel` — Ruin Sentinel (golem heavy)

| Field | Value |
|---|---|
| Archetype | `golem` (new, on the E7 attack runner). Budget class: heavy, 30 s |
| HP, size | 420 HP; radius 1.1 m, height 3.6 m |
| Movement | 2.0 m/s, accel 6, turn 50°/s. Cannot be staggered; cannot be Yeeted or Yoinked |
| Damage taken | Body: bullets ×0.25, spells ×0.5, explosions ×1.0. **Core ×3.0**, hittable only while `coreOpen`. Shock on the open core stuns it 2 s. Resists fire |
| Slam (player within 7 m) | Wind-up 1.2 s with arms raised and the core open and glowing; then a shockwave from r 1.1 to 9 m at 10 m/s, 0.6 m high (jump it), 30 damage. Recover 1.4 s, core closed. Cooldown 4 s |
| Stomp line (7 to 24 m) | The same 1.2 s wind-up with the core open; then 5 eruptions toward the player, 3 m apart, r 1.5, 0.5 s warning each, 22 damage. Cooldown 5 s |
| Leap | In low gravity, or after 6 s without line of sight: jumps up to 14 m to the player with a 1.0 s ground marker and lands with a Slam. The core is open in the air |
| Time Bubble | Its timers run at 30% inside the bubble: the 1.2 s window becomes 4.0 s |
| Death | Collapses into three boxes (1.2 m cover) that stay until the encounter ends |
| Drops | Health orb (big); gun 8% |
| Hitboxes | capsule `body` r 1.1, y 0 to 3.4; sphere `weak` (core) r 0.35 at (0, 2.2, 0.8), `onlyWhen: 'coreOpen'` |
| Look | Five stacked boxes `stone`: legs 1.8 × 1.0 × 1.0, hips 1.4 × 0.5 × 0.9, chest 2.2 × 1.3 × 1.2, shoulders 3.2 × 0.6 × 0.7, head 0.9 × 0.7 × 0.9; core sphere r 0.35 `neon` in a recess on the chest, dark while closed |
| Variants | `halfBuried` (camp lesson: cannot move, 40% HP, Slam only); `warden` (finale: while it lives the Beast takes half damage; a beam shows the link) |
| Elite | HP ×2.5, two shockwave rings |

### 9.2 `moonCultist` — Moon Cultist (summoner)

| Field | Value |
|---|---|
| Archetype | `summoner` (new). Budget class: support, 8 s, plus 3 s for each Midget it is expected to bring |
| HP, size | 80 HP; radius 0.5 m, height 1.9 m |
| Movement | 4.0 m/s; keeps 14 to 26 m and puts cover between; backs off if the player is within 8 m |
| Portal cast | Channels 1.5 s (a stagger or a kill interrupts it), then opens a ring on the ground 4 to 8 m from itself |
| Portal ring | 60 HP, radius 1.2 m, hit zone a sphere r 1.3 at 1.2 m. Bullets, spells and chains all hurt it |
| Summons | 1 s after it opens and every 8 s after that, 3 `midget` step out (`summon`). Stops when the ring is shot, or after `maxBatches` (default 4; R1 uses 2, lockdowns use 1, F1 uses 2). The ring stays if the cultist dies |
| Recast | 6 s after its ring closes, if `maxPortals` (default 2; lockdowns 1) allows |
| Own attack | Moon Bolt: one slow homing orb every 3.5 s, 6 damage, 14 m/s, 0.5 s wind-up |
| Time Bubble | The ring's batch timer and the Midgets coming out run at 30% |
| Weak, resist | Weak to fire |
| Drops | Mana orb 30%; gun 4% |
| Hitboxes | capsule `body` r 0.5, y 0 to 1.65; sphere `weak` r 0.24 at y 1.7 |
| Look | `sahil` model, stage 1, scale 0.8, tint `0x9a8cff`; cone hood; the ring is a `neon` disc r 1.2 with a dark centre disc r 0.9 |
| Elite | HP ×2.5; the ring brings 4 Midgets per batch |

## 10. Finale: the Moon Gate [L]

The Moon Gate arena `S3` is the level's boss-arena lockdown. The South Arch slab `M03` drops 1 s
after the threshold `M04`; the Great Gate is the exit and stays shut until Tinubu leaves. Size: a
ring 72 m across. Cover: 8 pillars, 4 blocks, 4 fallen columns, 6 stubs. Lid: moon-barrier at y 30.
Spawn points: `GREAT-GATE` (north), `W-GATE`, `E-GATE`, pod and rift discs `P1` `P2` `P3`, alcoves
`W-WARDEN` `E-WARDEN`. Inside: depot crate `M17`, MG and bazooka standees. Its "waves" are the three
stages below. It is longer and larger than PLAN §5.6's wave rule because it is three boss stages
(§14). Checkpoints after F1 and F2 respawn the player inside the sealed arena at the South Arch.

L09 is not a hub-verified boss level, so the starter-loadout rule of PLAN §9 does not bind here; the
standees and depot crate are in the section anyway.

### F1 Sproto Beast — "The Gatekeeper's Hound" (150 s)

Wave boss `sprotoBeast` with its Wave Mode attacks and phases (`src/data/enemies.js`). The part
script sets `hpScale: 0.5` (4,500 → 2,250 before tier and difficulty) and replaces its `summon`
action with a 1.2 s roar; the adds below come instead of the 10 Midgets that action spawns.

| Part | HP | Attacks | Adds (exact) | Arena change | Ends when |
|---|---|---|---|---|---|
| **1 Gate Hound** (about 60 s) | 100% → 55% (1,012) | Phase 1 pattern: chase, missiles (4 homing, 34, splash 4.5 m), chase, volley (7 bitcoins × 2 fans), charge (25 m/s, 45), slam (1 shockwave, jump it). Punch and kick combo inside 3.4 m (55) | t+12: `moonCultist` ×1 from `W-GATE` and ×1 from `E-GATE`; each ring gives `midget` ×3 twice (12 in all) unless shot | A charge that hits a pillar breaks it and stuns the Beast 2 s with the chest weak spot open. The wall also stuns it and does not break. Fewer pillars, fewer free stuns | HP ≤ 55% |
| **2 Warded** (about 90 s) | 55% → 0 (1,238) | 2 s roar, invulnerable. Phase 2 pattern (speed ×1.25, 2 slam rings), then phase 3 at 20% (speed ×1.5, 5 missiles, 3 fans) | At 55%: `W-WARDEN` wakes (`ruinSentinel` warden) and `midget` ×6 + `boomMidget` ×2 come out of `GREAT-GATE`. `onBossHp(30%)`: `midget` ×3 from `W-GATE`, ×3 from `E-GATE`. `onBossHp(20%)`: `bitbug` ×6 over `GREAT-GATE` | **While the Warden lives the Beast takes half damage.** **Time Bubble use:** bubble the Warden's wind-up, 4 s core window, one magazine. The dead Warden leaves cover in front of the dais | HP = 0 |

Adds: 35. After the kill the gate pulses and banishes what is left. Checkpoint, the depot crate is
there, 10 s before F2. Loot: two guns, one of them Legendary.

### F2 Big Obama twins (150 s)

Two elite `bigObama`: 320 × 2.5 = 800 HP each before tier (2,448 at tier 9), front shield, back
battery (×2.5, weak to shock), ground pound, 6-round hose. Two boss bars. PLAN §3 prices two elite
heavies at 2 × 60 = 120 s; the stage is stated at 150 s.

| Part | HP | Attacks | Adds (exact) | Arena change | Ends when |
|---|---|---|---|---|---|
| **1 Bonded** (about 90 s) | Left 800, Right 800 | Each: hose at range (6 rounds), ground pound inside 3.5 m (r 3.2, 25). **Bond:** within 12 m of each other they stand back to back, so neither battery shows. Pillars, the shock barrels `M19` and a Decoy pull them apart | t+0: the twins walk out of `GREAT-GATE`. t+4: `hexAcolyte` ×1 from `W-GATE`, ×1 from `E-GATE` (Tax Shield bubbles on the twins; Chain Zap pops them). t+20: pod at `P1`, `midget` ×6. t+50: pod at `P2`, `midget` ×4 + `boomMidget` ×2 | None | One twin dies |
| **2 Enraged** (about 60 s) | The survivor's remaining HP | Speed ×1.4 (3.4 m/s), burst ×1.5 (9 rounds), pound cooldown halved. No back-to-back cover any more | +3 s: `hexAcolyte` ×2 from `GREAT-GATE`. +10 s: pod at `P3`, `midget` ×6 + `boomMidget` ×3 | The side gates `M12` collapse (no more spawns there) and the sigil `M16` becomes a low-gravity zone r 12: jump the pound, shoot the battery from above | The second twin dies |

Adds: 4 Acolytes and 21 fodder; with the twins, 27. A pod waits while 14 or more ground enemies are
alive. Checkpoint and 10 s before F3. Loot: each twin drops one gun rolled one tier step up.

### F3 Tinubu, stage 1 *Emi Lokan* (80 s, a flee encounter)

Duel fighter Tinubu, stage 1 only (B §3.5): model `tinubu_stage1`, stage health 1,100 × `DUEL_HP_K`,
Bolt and Blast, skins `hellfire` and `skull`, AI range 8 to 13 m. Hellfire Pillars (march: 8 eruptions,
2.6 m apart, r 1.7, 0.85 s warning, 0.12 s step, damage 13 before Duel's power scale) are cast on a
script, not on his cooldown.

| Part | HP | Attacks | Adds (exact) | Arena change | Ends when |
|---|---|---|---|---|---|
| **1 Arrival** (10 s) | Invulnerable | Boss card 2.6 s. He steps out of the Great Gate. Pillars `cross` at t+6: four marches from the sigil to N, E, S, W | t+5: `E-WARDEN` wakes (`ruinSentinel`); his pillars do not hurt it | The fire ring `M25` lights at r 27.8 round the sigil (B §2.5). The dais and the side gates are outside it | t+10 |
| **2 Emi Lokan** (to 70% HP, 65 s at most) | 100% → 70% (330 × `DUEL_HP_K` to remove) | Bolts and Blast. Pillars every 8 s in this order: `fan3` (three marches at the player, −25°, 0°, +25°), `cross` (turned 45°), `fan3`, `wall` (a line of 12 across the ring that steps south four times, 5 m and 1 s apart: dash through between steps), then repeat | t+10: rift at `P1`, `midget` ×6 + `boomMidget` ×3. t+35: rift at `P2`, `bitbug` ×8. t+55, only if he is still above 70%: rift at `P3`, `midget` ×6 | The Warden gives a second core target; the bubble also slows the Bolts and Blasts | HP ≤ 70%, or t+75 |
| **3 "It is my turn"** (5 s) | — | He laughs and casts `ring`: 16 pillars on a circle r 12 round the player that close to r 4 in three steps; walk out through the gaps | Everything left is banished; the Warden falls apart | The fire ring dies. The Great Gate turns red: the Caldera | He is gone. `reach` the gate |

Adds: up to 24. If the player forces the flee before t+55 the last squad never spawns (215 enemies
instead of 221). Forcing the flee before t+75 pays 50 tickets. Loot: the lockdown chest and an ammo
crate appear in front of the gate.

**Finale wave table** (the lockdown's spawn timeline in one place)

| Stage | Trigger | Method | Spawn point | Enemies |
|---|---|---|---|---|
| F1 | t+12 | `portal` | `W-GATE`, `E-GATE` | `moonCultist` ×2 (+ `midget` ×12 by `summon`) |
| F1 | `onBossHp(55%)` | `placed`; `portal` | `W-WARDEN`; `GREAT-GATE` | `ruinSentinel` ×1; `midget` ×6, `boomMidget` ×2 |
| F1 | `onBossHp(30%)` | `portal` | `W-GATE`, `E-GATE` | `midget` ×6 |
| F1 | `onBossHp(20%)` | `air` | `GREAT-GATE` | `bitbug` ×6 |
| F2 | t+0, t+4 | `portal` | `GREAT-GATE`; `W-GATE`, `E-GATE` | elite `bigObama` ×2; `hexAcolyte` ×2 |
| F2 | t+20, t+50 | `drop` | `P1`; `P2` | `midget` ×6; `midget` ×4, `boomMidget` ×2 |
| F2 | `onPartDestroyed(twin)` +3 s, +10 s | `portal`; `drop` | `GREAT-GATE`; `P3` | `hexAcolyte` ×2; `midget` ×6, `boomMidget` ×3 |
| F3 | t+5 | `placed` | `E-WARDEN` | `ruinSentinel` ×1 |
| F3 | t+10, t+35, t+55 | `portal` (rifts) | `P1`; `P2`; `P3` | `midget` ×6, `boomMidget` ×3; `bitbug` ×8; `midget` ×6 |

## 11. Mechanisms, magic and explosives used

| Kind | Where | Notes |
|---|---|---|
| **Moon-gate portal** (new here) | 4 camp gates, 3 waystones, 3 return gates, `Gf` | Pairs: `Ga`⇄`Wa`, `Gb`⇄`Wb`, `Gc`⇄`Wc` (lit when captures ≥ 1), `Gm`⇄`Gf` (captures = 3). Return gates `Oa` `Ob` `Oc` are one-way to the disc `H20`. Enemies path through lit pairs (nav links) |
| **Capture zone** (new) | Seals A, B, C | B: a 35 s contested hold. A and C: the seal charges during the lockdown and pulses a 3 s stun every 20 s of charge. Sproto Swarm buddies count as holders |
| **Lockdown** | A3, C2, Moon Gate | PLAN §5.6. Stone slabs, a dome 40 m high, a slab and a lid at 30 m |
| **Low-gravity shrine** (new) | 3 in the bowl, 1 at the Needle, the sigil in F2 | Gravity ×0.4 in a 30 m column |
| **Rotating stone ring** (new) | 3 over the stage | `rotator`, 1 to 2 rpm; carries riders and pick-ups |
| **Crumbling floor** | Cracked Hall, 36 tiles | Falls 1.0 s after a heavy step (player, charger, Sentinel); fodder do not trigger it |
| Doors, jump pad, depot, spell shrine, destructible pillars, dark zones, fire ring | See §6 | Dark zones cut enemy sight to 40% |
| **Time Bubble** (new spell) | Four planned uses, §3 | Needs enemy timers slowed, not only movement (§14 N9) |
| Explosives | Catacombs | 3 gallery barrels, 2 portico barrels, 2 crypt barrels, 4 arena barrels; 3 proximity mines; 2 charge packs and 2 fragile walls (the breach and the Vault); Bomb Tosser bombs to Yoink |

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

**Checkpoints (14).** PLAN §3 says 8 to 10; a 22-minute level with three lockdowns needs these to stay under 2.5 minutes.

| # | Where | When | Ammo next to it |
|---|---|---|---|
| CP1 | Camp shrine and depot D1 | Shrine used | Depot crate, bullets `B1` |
| CP2 | Wayshrine of the first road | R1 clear | Bullets `B3`, `B4` or `B5` |
| CP3, CP4 | `S2` landing; Seal Passage (56, 0, 48) | Section entry; A2 done | Shells `S4`; shells `S7`, bullets `B13` |
| CP5 | Seal A | A3 clear (captured) | Ammo crate `AC-A` |
| CP6, CP7 | Stair foot (320, 6, 252); ridge court | B1 done; B2 clear | Sniper `N4`; sniper `N8`, bullets `B7` |
| CP8 | Seal B | B3 done (captured) | Ammo crate `AC-B` |
| CP9 | West Arch (501, 0, 400) | C1 clear | Bullets `B9` |
| CP10 | Seal C | C2 clear (captured) | Ammo crate `AC-C` |
| CP11 | Forecourt depot D2 | Arriving by `Gf` or the back stair | Depot crate |
| CP12 | `S3` landing | Section entry | Bullets `B14` |
| CP13, CP14 | South Arch, inside | F1 dead; F2 dead | Depot crate `M17` |

**Depots (2):** D1 camp `H08`, D2 Forecourt `H56`. Each: depot crate, health station, spell loadout bench, ticket shop terminal, checkpoint.

**Placed weapons** (all Epic, the level's base tier)

| Id | Where | Gun | Why |
|---|---|---|---|
| `cache-camp` | Camp table `H09` | MG, shotgun, sniper, bazooka | Any order is playable from here |
| `st-grave` | Graveyard `H31` | Shotgun | A1 to A3 |
| `st-aqueduct` | Aqueduct arch 4 (308, 6, 294) | Sniper | B1, B2 |
| `st-stage` | Bowl west terrace `H74` | MG | C2 flocks and flyers |
| `rack-fore` | Forecourt (310, 26, 70) | Bazooka | F1 Beast, the Wardens |
| `st-arch-mg`, `st-arch-bz` | Arena `M18` | MG, bazooka | The finale needs no carried gun |

**Loot table.** Enemy drops roll L09's row of PLAN §7.3: Common 0, Uncommon 12, Rare 40, Epic 37, Legendary 11.

| Guaranteed drop | Where | What |
|---|---|---|
| Lockdown and capture chest A | Dais, when A3 clears | One gun, Epic or better, a type not carried if possible; ammo crate `AC-A` |
| Capture chest B | Seal B, when B3 ends | One gun, Epic or better; ammo crate `AC-B` |
| Lockdown and capture chest C | Stage, when C2 clears | One gun, Epic or better; ammo crate `AC-C` |
| The Audit Team (elite squad) | The last outpost | Each elite Agent drops one gun rolled one tier step up (2 guns) |
| Sproto Beast (mini-boss) | Arena, end of F1 | Two guns, one of them Legendary |
| The twins (2 elites) | Arena, F2 | One gun each, rolled one tier step up |
| Moon Gate lockdown chest | In front of the gate, after F3 | One gun, Epic or better; ammo crate `AC-M` |
| Secret weapon cache | Vault `K24`, behind the second fragile wall | One Legendary gun |

**Ammo boxes (40)**

| Type (box size) | Ids and positions |
|---|---|
| Bullets (60) ×15 | `B1` shrine (322, 2, 448); `B2` ring disc (323, 3.6, 404); `B3` `B4` `B5` wayshrines W (237, 3, 427), N (322, 5, 347), E (402, 2, 432); `B6` stair landing (322, 15.4, 203); `B7` ridge court (328, 20, 150); `B8` `Wc` (457, 2, 432); `B9` West Arch (501, 0, 396); `B10` `B11` `B12` inside the dome (511, −2, 396), (579, −2, 406), (545, −7.6, 392); `B13` Seal Passage (56, 0, 49.5); `B14` `S3` landing (58, −4, 117); `B15` arena (56, 0, 96) |
| Shells (12) ×10 | `S1` `Wa` (167, 2, 422); `S2` standee (128, 1, 420); `S3` portico (80, 1, 412); `S4` `S2` landing (154, 6, 50); `S5` Antechamber (122, 0, 42); `S6` hall rim (82, 0, 37); `S7` Seal Passage (56, 0, 46.5); `S8` `S9` inside the crypt (46, 0, 44), gallery (28, 3.5, 30); `S10` Vault (46, −6, 54) |
| Sniper rounds (8) ×8 | `N1` `Wb` (322, 6, 302); `N2` standee (308, 6, 296); `N3` aqueduct deck (300, 15.2, 290); `N4` stair foot (318, 6, 252); `N5` gully top (206, 20, 180); `N6` `N7` tops of `T1` (222, 34, 150) and `T3` (418, 34, 150); `N8` ridge court (312, 20, 150) |
| Rockets (3) ×7 | `K1` portico (80, 1, 418); `K2` aqueduct arch 6 (340, 6, 294); `K3` Antechamber (122, 0, 54); `K4` inside the crypt (46, 0, 52); `K5` Vault (50, −6, 55); `K6` Forecourt rack (310, 26, 72); `K7` arena (64, 0, 96) |

**Crates:** 4 ammo crates (`AC-A`, `AC-B`, `AC-C`, `AC-M`; 3 uses each, 50% of every cap per use) and 3
depot crates (D1, D2, arena `M17`). A captured outpost keeps its crate and its return gate, so it is a
resupply point one gate away for the rest of the level. Rule check: every rack has its ammo within
30 m; A, B and C stock shells and rockets, sniper rounds, and bullets; each lockdown has at least two
boxes inside (crypt `S8` `S9` `K4`; dome `B10` `B11` `B12`; arena `B15` `K7` and the depot crate).

**Ammo budget.** Assumed rounds per kill at equal tier, misses included: bullets 8 per fodder, 5 per
Bitbug, 10 per flyer, 14 to 18 per ranged or support, 22 per Jet Obama; shells 1.5 per fodder, 3 per
shield or ranged, 5 per charger; sniper rounds 2 per sniper, Agent or drone, 3 per rig or Jet Obama;
rockets 4 per Sentinel, 2 per rig; elites ×2.5. Drops: one pack per 8 kills, weighted to the gun in
use. The finale is not counted: it has a depot crate.

| Ammo, outpost | Position | Asked | Own boxes + drops | Ratio | + one fill at the camp depot crate | + crates of captured outposts |
|---|---|---|---|---|---|---|
| Shells, A | 1st | 61 | 108 + 24 = 132 | 2.2× | 196 (3.2×) | — |
| Shells, A | 3rd | 94 | 132 | 1.4× | 196 (2.1×) | 260 (2.8×) |
| Sniper, B | 1st | 37 | 64 + 15 = 79 | 2.1× | 115 (3.1×) | — |
| Sniper, B | 3rd | 53 | 79 | 1.5× | 115 (2.2×) | 151 (2.8×) |
| Bullets, C | 1st | 268 | 360 + 180 = 540 | 2.0× | 1,020 (3.8×) | — |
| Bullets, C | 3rd | 438 | 540 | 1.2× | 1,020 (2.3×) | 1,500 (3.4×) |
| Rockets, level before the finale | any | 8 | 18 | 2.3× | 30 (3.8×) | — |
| Bullets, level before the finale | worst order | 822 | 780 + 360 = 1,140 | 1.4× | 1,620 (2.0×) | 2,100 (2.6×) |

Taken first, an outpost's own boxes and drops alone cover its discipline 2.0 to 2.2 times. Taken
last it asks more, and the player has passed the camp depot crate (60 m from the ring) and two
captured outposts' crates: 2.0 times or more in every row. The lowest ratio in the level is **2.0×**.

**Power-ups:** Sproto Camo at the gully foot `H41`; Mana Surge on ring 2 `H75`; Overshield at the Forecourt (320, 26, 56) and in the Vault.

**Secrets**

| Secret | Where | How |
|---|---|---|
| Golden Bonk: Swarm Surge | Top ledge of the Needle `H55`, (448, 44, 140) | Four 6 m hops in the low-gravity shrine at its foot, or the jetpack |
| Mana Battery | Gully nook behind boulder `H40d`, (209, 5, 236) | Take the stealth route and look behind the boulder |
| Secret weapon cache | Vault `K24` | Drop through the tiles or take the Drain; breach two fragile walls (charge packs, rockets or Meteor Bonk) |
| Audit File 1 | Charnel Crawl niche (86, 0, 60.5) | Past the third mine. "Tinubu rents the Moon Gate by the hour." |
| Audit File 2 | Top of `T3` (418, 34, 150) | Climb the tower. "The seals were not put there by the Empire." |
| Audit File 3 | Ring 3 over the stage, third platform | Ride the rings up. "The Caldera is not on the other side. It is underneath." |

## 13. Difficulty

| Compared with L08 | L09 |
|---|---|
| Tier 8 → 9 | HP and damage ×1.15 |
| `maxAlive` 14 → 16 | Plus 8 flyers; lockdown waves overlap on the 25 s timer |
| Elite pairs → an elite squad | The Audit Team at the last outpost; the elite twins |
| Two hazards → any | Dark, crumbling floor, mines, low gravity, moving rings, pillars, fire ring |
| A fixed route → the player's order | The second and third outposts scale up; patrols answer each capture |
| One boss → three stages in a row | 6.5 min with two checkpoints inside the sealed arena |

| Setting | Changes |
|---|---|
| Easy | Every outpost uses its 1st table. Patrols have 4. The B hold needs 25 s. Beast `hpScale` 0.4; the Warden's ward is 25%. Twins are not elite. Tinubu flees at 80% or t+60 |
| Heroic | Positions shift up: 1st uses 2nd, 2nd and 3rd use 3rd (an Audit Team at both; the patrol only at the last). The B seal pulse does not banish elites. The Warden wakes at 70%. Both twins enrage at 50% HP as well. Tinubu flees at 60% or t+90, and the t+55 squad always spawns |
| Swarm Surge (Golden Bonk) | +50% fodder in every squad and wave, still under `maxAlive`; lockdown waves stay inside 45 enemies at every position (32 → 43 at most) |

## 14. Engine needs

Uses **E1 to E14, E16, E17** (E15 only through the content fingerprint). Needs beyond PLAN §10:

| Id | Need | Smallest form |
|---|---|---|
| N1 | Terrain `pads` and `stamps` | Two arrays on `terrain()`: flatten a disc or box to a height with a blend; add or subtract a box or ellipse |
| N2 | Portal states | `enabledWhen` (a capture count or flag) and `oneWay` exits |
| N3 | Roaming patrols | Squads on a route outside any encounter leash (C §3.6), abstract when far, with orders on capture events (§8.1) |
| N4 | Position scaling | A squad or wave condition `ifPosition(n)`; the position is latched when the approach activates |
| N5 | Capture details | Contested pause, buddies as holders, `onHold(p%)`, a banish pulse (B) and a stun pulse (A, C) |
| N6 | Lockdown variants | Two entry doors (A3); a dome as door and lid (C2); stage checkpoints inside a boss lockdown |
| N7 | `dark` zones that cut enemy sight | C §3.9 has them render-only |
| N8 | Boss script extras (E12) | Wave-boss `hpScale`; replace an action (`summon` → roar); a ward link to another enemy; bonded twins and enrage; a flee encounter with an HP and a time exit; Tinubu's stage 1 must be ported before L09 ships |
| N9 | Time Bubble as time dilation | Enemy AI timers and wind-ups inside the sphere run at 30%, not only velocities |
| N10 | Crumbling tiles by weight | Only heavy entities trigger them |

**Conflicts with PLAN, resolved as stated in this document**

| PLAN | This level |
|---|---|
| §3: 220 to 250 enemies, table seconds, par 21 | Cannot all hold: 220 × 3 s × 1.3 is 14.3 min before traversal and a 6.5 min finale. Resolved with 86 finale adds inside stated stage times and 20 in a stated hold; total 22.0 to 22.2 min |
| §3: 4 to 6 sections, 7 to 9 combat encounters, 8 to 10 checkpoints | 3 sections (the hub has four districts), 10 encounters plus the finale, 14 checkpoints |
| §3: checkpoints at most 2.5 min apart; §5.6: a lockdown lasts up to 3.5 min and restarts at wave 1 | A lockdown at 3rd position runs 3.0 to 3.3 min between its two checkpoints |
| §5.6: a lockdown has 25 to 45 enemies in 3 to 5 waves | The Moon Gate lockdown is three boss stages: 86 adds, 6.5 min, with checkpoints between stages |
| §3 time table | Has no rows for the §5.3 enemies; mapped by role in §4 |
| §4: origin at the south-west corner, +z south | Contradictory; the north-west corner is used |
| §9: wave bosses keep their Wave Mode data | `sprotoBeast` needs `hpScale` 0.5 and no `summon` to fit 150 s |
| §6.2: Time Bubble "6 m sphere" | Read as radius 6 m |

## 15. Bot route and tests

| Item | Detail |
|---|---|
| Bot route | Start → shrine → ring → West Road → A1 → `S2` gallery → rim of the hall → A3 → `Oa` → R2 → `Gb` → stair → B2 → B3 → `Ob` → `Gc` → C1 → C2 → `Oc` → `Gm` → Forecourt → `S3` → F1 to F3 → gate. God mode, fixed seed, deterministic |
| Second route | C → B → A, using the gully and the Under-hall breach, to cover the other position tables |
| Order test | All six orders: 221 enemies spawn (215 if F3 ends before t+55), every outpost latches the right position, each patrol is used exactly once |
| Lockdown tests | Doors drop 1 s after the threshold and never on the player; Blink, Magic Carpet and the jetpack cannot leave the crypt, the dome or the arena; flyers stay inside; death restarts at wave 1 (finale: at the stage) |
| Portal tests | Gates stay dark until their condition; enemies cross lit pairs; return gates are one-way |
| Section memory | Leave and re-enter `S2` before and after the capture: nothing respawns, taken items stay taken |
| Pacing test | The validator's §3 estimate is 22.0 to 22.2 min for every order |
| Ammo test | With only the placed boxes and no drops, the bot finishes each outpost first with its discipline gun |
| Time Bubble tests | A Sentinel's core window is 4.0 s inside the bubble; enemy projectiles leave it at full speed |

## 16. Build tasks

1. Kit and prefabs: `pads` and `stamps` on `terrain`, `roomShell`, the §7 prefabs in `prefabs/moonlit.js`.
2. `L09/S1.js`: terrain, camp, ring, three roads, ridge, bowl, Forecourt (§6.1, `H65`–`H76`). Validator and map export.
3. `L09/S2.js` (§6.2 and `A01`–`A08`) and `L09/S3.js` (§6.3). Validator, reachability, map export.
4. Portals with their conditions; section links `S1` ⇄ `S2`, `S1` → `S3`; section memory test.
5. Enemies `ruinSentinel` and `moonCultist` (§9) with their looks; the camp lesson.
6. Road fights R1, R2 and the three patrols with their orders (§8.1, §8.5).
7. Outpost B: B1, B2, the capture hold B3.
8. Lockdowns A3 and C2 with doors, dome, spawn points, waves and seal pulses; then A1, A2, C1.
9. Position scaling and the Audit Team; run the six-order test.
10. Finale: arena lockdown, F1 script, F2 twins, F3 flee script and pillar patterns.
11. Weapons, loot table, 40 ammo boxes, crates, power-ups, secrets, checkpoints, depots (§12).
12. Bot routes and the tests in §15; pacing and ammo checks; tuning pass on `hpScale`, hold time and wave sizes.
