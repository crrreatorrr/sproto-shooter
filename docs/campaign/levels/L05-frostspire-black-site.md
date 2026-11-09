# L05: Frostspire Black Site

Level document for `docs/campaign/PLAN.md` (cited as **PLAN §x**). It follows the template in PLAN §14.
Old design: `docs/codex/C-level-designs.md` "L5: Frostspire Black Site". This file replaces it.
**C §x** is `docs/codex/C-campaign-levels.md`, **B §x** is `docs/codex/C-bosses-sproto-duel.md`.

## 1. Header

| Field | Value |
|---|---|
| Id, name | `L05`, Frostspire Black Site |
| Stage, lighting | `glacier`. Clear polar night with an aurora for the first half; floodlit concrete and cold blue strip lights indoors. A blizzard on a timer in section S2 |
| Tier | 5 (enemy HP and damage × 1.749) |
| Par | 20 min. Estimate in §4: **21 min 16 s** (20 min 29 s if no alarm rings) |
| Jetpack | No |
| Enemy total | **154** + the mini-boss: 128 always spawn, 26 arrive only when an alarm rings |
| Route length | **1.41 km** (S1 516 m, S2 438 m, S3 105 m, S4 250 m, S5 105 m) |
| Sections | 5: S1 Crash Site and Outer Snowfield, S2 Kill Zone, Wall and two Bunkers, S3 Gatehouse and Courtyard, S4 Frost Halls, S5 Armory and Vault |
| Encounters | 7 combat encounters (E1 to E7) and a two-stage finale (F1, F2). Three are lockdown arenas: F1 Courtyard, E7 Records Library, F2 Vault |
| Finale | (1) Mini-boss **"The Abominable Auditor"** (`monster`, Blue Monster) in the courtyard, 3 parts. (2) The **vault hold** under Glowie's Drone Strikes |
| Checkpoints, depots | 10 checkpoints plus the start, 2 depots |
| Golden Bonk | Tax Season |

## 2. Concept

A government black site on a glacier. The ledgers of the Bitcoin Tax Empire are in a vault at the top
of the spire. The first half is **quiet**: you lie on a ridge 90 to 140 m from the enemy, read who is
looking where, and shoot in the right order so nobody reaches an alarm. Squads are asleep or bored
until you wake them. Searchlights, Spotter Drones and Audit Snipers hunt for you, and a blizzard
closes the view every 90 seconds. The second half is **loud**: the gate drops, a 7 m monster breaks
out of the courtyard ice machine, and from there to the vault every big room locks behind you.

It differs from every other level in three ways: the fights start at 100 m instead of 20 m, the
player chooses when a fight starts, and mistakes cost reinforcements and ammo instead of health.

**Stealth-lite rules** (used by every `placed` squad in E1 to E5)

| Rule | Value |
|---|---|
| Unaware (`idle`) sight | 30 m in a 120° cone. Asleep: no sight, hearing 12 m |
| Audit Sniper sight | 140 m inside its scan cone (30° wide, sweeps a 60° arc in 6 s, drawn as a faint red line); 60 m outside it |
| Mining Rig sight | 90 m, all round |
| Searchlight | Beam 120 m, spot radius 6 m. Holds the player 2 s: wall alarm |
| Spotter Drone | Cone 35 m long, 20° half-angle. Holds the player 1.5 s: mortar strike and the area wakes |
| Frost Hound | Scent 45 m, no line of sight needed. Not fooled by weather or the Decoy |
| Blizzard (S2 only) | Every sight range above is capped at 40 m. The player's view is capped at 40 m too |
| Noise | A machine gun or shotgun is heard 25 m from the shooter, a sniper, bazooka or explosion 40 m (C §3.8). A sniper shot from 90 m is silent to the target's squad |
| Body seen | An idle enemy with a line to a corpse inside 20 m is suspicious for 2 s, then alert |
| Sneak shot | A sniper hit on an unaware, asleep or suspicious enemy is a **guaranteed crit** (the existing × 1.5 in `damageEnemy`). It stacks with the weak-spot multiplier. No gun stat changes |
| Alarm | An alerted squad sends its **runner** (marked with a bell icon) to the alarm box. He needs 1.5 s at the box. The siren brings the written reinforcement squad 6 s later and wakes every placed squad in the encounter |
| Cutting an alarm | Shoot the box (40 HP) or any part of its red cable (20 HP). A cut alarm does nothing when pulled, and the runner stands there for 3 s wondering why |

At equal tier a sneak body shot (85 × 1.5 = 127) kills a Midget, Obama, Glowie Agent, Audit Sniper,
Frost Hound or Laser Bot. A sneak hit on a weak spot (85 × 3.3 × 1.5 = 421) kills anything short of
the mini-boss.

**Cutscene cards**

- Start: *"FROSTSPIRE BLACK SITE"* / *"The ledgers are in a vault at the top of the spire."* / *"Glowie is watching from a drone. Be far away. Be boring."*
- Gate drops (before F1): *"Something in the courtyard has been on ice since the last audit."*
- Vault door (before F2): *"Glowie, on the speakers: 'This is a routine inquiry. Please stand still.'"*
- End: *"You have the ledgers. Glowie has your face. See you at the office."*

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Whatever was carried out of L04 (usually a machine gun and a shotgun or sniper). Sniper and bazooka types were unlocked in L02 |
| Guns placed (base tier **Uncommon**) | Cache **C1** sniper at the crash site (why: E1, E3, E4). Rack **R1** bazooka at the pass (why: the Mining Rigs). Rack **R2** shotgun at the Frost Halls vestibule (why: E6 corridor, hounds, the Library) |
| Spells held at the start | Goo Bolt, Chain Zap, Magic Carpet, Yeet, Sproto Swarm, Mana Shield, Pump It (7) |
| **Unlockable: Decoy** ("Cardboard Sproto") | Shrine in S1 at (150, 0, 300), after E2 and 20 m before the first counter-sniper duel. 30 mana, 12 s cooldown, standee lasts 6 s |
| Unlockable: Mana Battery | Hidden in Frost Halls F1, locker W2 (§12) |
| New gun types | None |
| Taught here | Sneak shots and target order (E1), reading a detection cone (E2), the counter-sniper duel (E3), crossing open ground under turrets and weather (E4), cover squads and flashbangs (E5), lockdown arenas with long sightlines (F1, E7, F2) |

**Three clear uses of the Decoy**, each set up by the level within two minutes of the shrine:

1. **Audit Snipers** (E3, 20 m after the shrine). A sniper that sees the standee locks its laser on it and fires both shots of its cycle at cardboard. The laser shows which perch it is on, and it must relocate afterwards, so the player gets one free aimed shot or one free dash between boulders.
2. **Mining Rigs** (E3 pass, then E4). A rig fires its 4 s stream at the standee, overheats, and opens its vent for 2 s. One sniper round in the vent kills it. The player never has to stand in its range.
3. **Searchlights and Spotter Drones** (practice light at the shrine, then E4). The beam or cone parks on the standee for 6 s. A drone calls its mortar on the standee, which hits whoever stands near it and does not raise the alarm.

A fourth use appears in F2: Glowie's Drone Strike reticle follows a standee placed while it is tracking.

Other spells that help: Goo Bolt jams a Mining Rig for 4 s (PLAN §6.2). Chain Zap stuns riot shields
(E5, E6). Yeet throws a Frost Hound back in mid-lunge. Sproto Swarm buddies keep the vault drill
running while the player steps out of the ring (F2).

## 4. Time budget

Seconds per enemy are PLAN §3, with these additions for this level:

| Assumption | Seconds |
|---|---|
| Unaware target killed with one sniper shot | the PLAN value, at least 5 (find it, wait for the look-away, shoot) |
| Alerted target more than 60 m away | PLAN value + 3 (scope, lead, 4-round magazine, 2.6 s reload) |
| Audit Sniper in a duel at 80 to 140 m | 8 + 3 = 11 (elite 22) |
| Mining Rig | 15 (PLAN) |
| `spotterDrone` (new) | 8 |
| `frostHound` (new) | 5 |
| `manaLeech` (L03, not in the PLAN table) | 8 |
| Scouting before a stealth encounter (E1, E3, E4) | 10 each |
| Generator (500 HP target) | 8 each |
| Alarm squads | Not in the rows. 6 alarms, 141 s if all ring; the budget assumes 2 of 6 ring on a first run: 47 s |

| # | Beat | Enemies (seconds each) | Sum | × 1.3 | Other | Total s | Route m |
|---|---|---|---|---|---|---|---|
| B1 | Crash site: open cache C1, walk to the ridge | — | — | — | cache 20, 60 m ÷ 5.5 = 11 | 31 | 57 |
| E1 | The Picket | 5 midget × 5, 2 obama × 6, 2 sewerMidget × 3 | 43 | 56 | scout 10 | 66 | 100 |
| E2 | Frozen Creek | 1 spotterDrone × 8, 4 midget × 3, 2 frostHound × 5 | 30 | 39 | 80 m walk in = 15 | 54 | 129 |
| B2 | Decoy shrine and practice light | — | — | — | shrine 12, 44 m = 8 | 20 | 0 |
| E3 | The Listening Post and the pass | 2 auditSniper × 11, 1 elite auditSniper × 22, 1 obama × 6, 1 miningRig × 15 | 65 | 85 | scout 10, 60 m quiet = 11 | 106 | 230 |
| E4 | The Kill Zone | 2 miningRig × 15, 2 auditSniper × 11, 2 spotterDrone × 8, 3 midget × 3, 2 obama × 6, 2 balloonMidget × 5, 2 frostHound × 5 | 109 | 142 | scout 10 | 152 | 215 |
| E5 | The two Bunkers | 3 riotMidget × 8, 2 midget × 3, 3 glowieAgent × 6, 1 elite glowieAgent × 12, 2 boomMidget × 3 | 66 | 86 | 2 generators 16, 70 m roof walk = 13 | 115 | 223 |
| D1 | Depot 1, gatehouse | — | — | — | 45, 40 m = 7 | 52 | 40 |
| **F1 [L]** | **The Abominable Auditor** (mini-boss, lockdown 1) | mini-boss with 24 adds | — | — | PLAN 150 to 210 | 160 | 65 |
| E6 | Frost Halls F1: Intake | 3 riotMidget × 8, 2 midget × 3, 2 frostHound × 5 | 40 | 52 | 45 m and rack R2 = 16, Lift A 10 | 78 | 120 |
| **E7 [L]** | **Records Library** (lockdown 2) | 12 midget × 3, 3 glowieAgent × 6, 2 riotMidget × 8, 2 auditSniper × 8, 1 manaLeech × 8, 2 boomMidget × 3, 2 frostHound × 5, 1 elite robotShooter × 18 | 128 | 166 | — | 166 | 100 |
| B3 | Gallery exit and freight lift | — | — | — | 30 m = 5, ride 15 | 20 | 30 |
| D2 | Depot 2, armory | — | — | — | 45, 35 m = 6 | 51 | 35 |
| **F2 [L]** | **Vault hold** (lockdown 3), then the exit | 14 midget × 3, 4 boomMidget × 3, 3 glowieAgent × 6, 2 frostHound × 5, 1 spotterDrone × 8, 1 elite riotMidget × 16 | 106 | 138 | start the drill 8, exit 12 | 158 | 70 |
| | **Sum of rows** | 128 enemies + mini-boss | | | | **1,229** | **1,414** |
| | Alarm squads (2 of 6) | 26 conditional enemies | | | | 47 | |
| | **Total** | | | | | **1,276 s = 21 min 16 s** | |

Par is 1,200 s; the allowed window is 1,080 to 1,320 s. Per section: S1 277 s, S2 267 s, S3 212 s,
S4 264 s, S5 209 s. A fast replay skips the two unused routes in E4, rings no alarm and kills the
rigs with the Decoy trick: about 14 min 30 s (72% of par).

Beat count: 7 combat encounters, 3 traversal or mechanism beats (B1, B2, B3), 2 depots and a finale
in two stages. That is 14 rows, one more than PLAN §3 allows, because the finale is split around
Frost Halls. Intensity: E3 and E4 are both about 0.7; the lockdowns (0.9) are separated by E6, by
D1 and by D2 with the freight lift.

## 5. Overview map

Not to scale. North is up. `*n` = checkpoint n, `D1`/`D2` = depots, `@` = Decoy shrine, `[L]` = lockdown arena.

```
   S5 ARMORY + VAULT (top of the spire, 80 x 100)
   +--------------------------------------------------------------------+
   |  (EXIT pad) <-- [L] F2 VAULT HOLD 44 x 44 <-- *10 antechamber <-- D2 armory <-- freight lift
   +----------------------------------------------------------^---------+
                                                              | freight lift, 15 s
   S4 FROST HALLS (80 x 70, floors at y 0, 7, 14)             |
   +----------------------------------------------------------+---------+
   |  y 14  library gallery --> exit door --> freight lobby --+         |
   |  y 7   *8 Lift A top --> [L] E7 RECORDS LIBRARY 56 x 44 (two levels) *9 when cleared
   |  y 0   vestibule (R2 shotgun) --> E6 INTAKE, slick corridor 44 m --> Lift A
   +------------------^-------------------------------------------------+
                      | covered passage, 20 m
   S3 GATEHOUSE + COURTYARD (100 x 120)
   +------------------+-------------------------------------------------+
   |        [L] F1 THE ABOMINABLE AUDITOR, courtyard 70 x 70, gallery ring at y 5   *7 when cleared
   |        D1 depot --> *6 arena door        Captured Mining Rig on the south gallery
   +------------------^-------------------------------------------------+
   ====wall==[tower W]==[BUNKER W + rig]==[ SHIELD GATE ]==[BUNKER E + rig]==[tower E]==wall====
   S2 KILL ZONE (260 x 250)           |              *5 first generator destroyed
   |   west trench        centre rocks *4 Last Cover        frozen lake (cracking ice)
   |                      Sniper Rocks: 135 m to each tower, 119 m to each rig
   |   blizzard every 90 s, 20 s long
   +------------------^-------------------------------------------------+
                      | the pass, 60 m, Mining Rig, R1 bazooka   *3 pass gate
   S1 CRASH SITE + OUTER SNOWFIELD (300 x 520)
   |   E3 LISTENING POST: mast, spire, hut. 125 to 135 m from the boulder field
   |   @ Decoy shrine *2
   |   E2 FROZEN CREEK: Spotter Drone, Frost Hounds
   |   E1 THE PICKET: camp and lookout. 91 m and 113 m from the ridge   *1 camp cleared
   |   Overlook Ridge
   |   crash site: cache C1 (sniper)          START
   +--------------------------------------------------------------------+
```

## 6. Sections

**How to read the blockout tables**

- Positions are `(x, y, n)`: `x` metres east and `n` metres **north** of the section's south-west ground corner. PLAN §4 makes `+z` south, so the kit position is `at: [x, y, -n]`.
- Sizes are `east-west × height × north-south`. A box `y` is its centre and a cylinder or cone `y` is its base, as in `src/data/levels/kit.js`. A sphere `y` is its centre.
- In the terrain sections (S1, S2) `y` is measured from the ground under the item; the assembler adds the terrain height.
- `room(x0–x1, n0–n1, y, h)` is shorthand for four wall boxes 1 m thick (split at each listed door, lintel above 2.6 m) and a roof slab 0.5 m thick (§7).
- A row with several positions is that many copies. `[L]` marks lockdown parts.

### 6.1 S1: Crash Site and Outer Snowfield

Footprint 300 × 520 m, terrain. The player walks north from the pod to the pass. About 106 solids.

```
  n  x 0         50        100       150       200       250       300
 520   #############################|^S2|###########################
 500   #############################|RG |###########################   RG  Mining Rig (150,512)
 480   #############################|= =|###########################   R1  bazooka rack
 460   #############################|R1 |###########################
 440   ###                           MP1/P4        :HP3          ###   M mast  H hut  A ice spire
 420   ###           AP2             :          :::              ###   P1..P4 sniper perches
 400   ###       T     ::: ---------gate--------:                ###
 380   ###         T      o::     o  :  o   ::  o        |       ###   | snow wall (east flank)
 360   ###      T            =:::    =   ::: =           |       ###   T pines (west flank)
 340   ###         T     o       o:: : ::o       o       |       ###
 320   ###       T           O      :O:      O                   ###   row A: duel starts here
 300   ###                           @*2                         ###   @ Decoy shrine
 280   ###                                      K                ###   K sled kennel
 260   ###~~~~~~~~~~~~~ ~~~D>~~~~~~~~H~~zz~~~~~~~~~~~~ ~~~~~~~~~~###   ~ creek ice  H bridge  D> drone  zz sleepers
 240   ###                                                       ###
 220   ###[tun       T    T                                      ###   [tun  ice tunnel (alarm squad)
 200   ###              T                                        ###
 180   ###         T     T     L:      C*1                       ###   L lookout + alarm 1   C camp
 160   ###          T          o::    :f                         ###   f fire barrel
 140   ###        T    T         ::  o:     o                    ###
 120   ###           T           o::  :  o                       ###
 100   ###         T               o:::                          ###
  80   ###                   =================                   ###   Overlook Ridge, top at y 3
  60   ###                            c                          ###   c cache C1
  40   ###                                                       ###
  20   ###                           P                           ###   P pod (start)
   0   #############################################################
```

Sightlines (`:` on the map): ridge slot (150, 77) to the campfire **91 m**, to the lookout **113 m**.
Boulder row A (150, 320) to P1 the mast deck **125 m**, to P2 the spire ledge **128 m**, to P3 the hut
roof **135 m**. Post gate (150, 410) to the pass rig **102 m**; pass mouth to the rig **50 m**.

| Id | Shape | Size (m) | Position (x, y, n) | Mat | Purpose |
|---|---|---|---|---|---|
| S1-ground | terrain | 300 × 520, cell 4, seed 501, amp 1.2, freq 0.012, 2 octaves | origin (0, 0, 0) | snow | Snowfield. Flat (amp 0) inside n 244–268 and inside the pass |
| S1-cliffW, S1-cliffE | box | 12 × 14 × 520 | (6, 7, 260), (294, 7, 260) | rock | Side bounds |
| S1-cliffS | box | 276 × 14 × 8 | (150, 7, 4) | rock | South bound |
| S1-cliffNW, S1-cliffNE | box | 131 × 14 × 60 | (77.5, 7, 490), (222.5, 7, 490) | rock | North bound. The gap x 143–157 is the pass |
| S1-pod | cylinder | r 1.6, h 3.2 | (150, 0, 15) | metal | Crashed drop pod. Player start (150, 0, 19) facing north |
| S1-podFin ×3 | box | 0.5 × 2 × 2.4 | (147.8, 1, 14), (152.2, 1, 14), (150, 1, 12.6) | metal | Dressing |
| S1-debris ×4 | box | 3 × 1.2 × 0.8 | (143, 0.6, 26), (158, 0.6, 32), (149, 0.6, 40), (144, 0.6, 50) | metal | Crouch cover along the skid line |
| S1-cacheC1 | box | 2.4 × 1.2 × 1.4 | (156, 0.6, 54) | crate | Cache C1: sniper |
| S1-ridgeS | ramp | 80 × 3 × 12, high end north | (150, 1.5, 66) | snow | Climb |
| S1-ridgeTop | box | 80 × 3 × 6 | (150, 1.5, 75) | snow | Firing step, top at y 3 |
| S1-ridgeLip ×5 | box | 6 × 1.2 × 1 | x 118, 134, 150, 166, 182 at (x, 3.6, 77.5) | snow | Parapet with four 10 m firing slots |
| S1-ridgeN | ramp | 80 × 3 × 10, high end south | (150, 1.5, 83) | snow | Descent to the field |
| S1-fieldRock ×6 | prefab `boulderM` | — | (140, 0, 100), (170, 0, 112), (128, 0, 122), (152, 0, 136), (186, 0, 144), (122, 0, 150) | ice | Centre and east approach to the camp |
| S1-pine ×10 | prefab `pine` | — | (60, 100), (72, 118), (55, 135), (80, 140), (66, 160), (90, 170), (58, 185), (84, 198), (70, 215), (95, 225) | wood | West approach, hidden from the lookout |
| S1-snowcat | prefab `snowcat` | — | (165, 0, 172), yaw 30 | metal | Camp centre, full cover |
| S1-fire | barrel (fire) | — | (158, 0, 168) | — | Campfire. 5 Midgets dance round it |
| S1-tent ×2 | cone, cylinder collider r 1.8 h 2 | r 2.2, h 2.6 | (171, 0, 181), (149, 0, 183) | wood | Tents |
| S1-campCrate ×2 | prefab `crateStack` | — | (152, 0, 176), (164, 0, 162) | crate | Cover |
| S1-mound ×2 | sphere | r 1.2 | (150, -0.4, 165), (172, -0.4, 166) | snow | Burrow points for E1-c |
| S1-lookDeck | box | 5 × 0.5 × 5 | (120, 2.25, 186) | wood | Lookout stand, floor at y 2.5 |
| S1-lookLeg ×4 | cylinder | r 0.3, h 2 | x 117.8 or 122.2, n 183.8 or 188.2 | wood | Legs |
| S1-lookStairs | stairs | 1.5 × 2.5 × 4, high end south | (120, 1.25, 190.5) | wood | Climb from the north side |
| S1-lookRail | box | 5 × 1.2 × 0.5 | (120, 3.1, 183.75) | wood | Parapet facing the ridge |
| S1-alarm1 | prefab `alarmPole` | — | (122, 2.5, 187.5); cable to S1-relay1 box 1 × 1.5 × 1 at (120, 0.75, 205) | metal | Alarm 1. Box at y 6.5, cable 18 m |
| S1-tunnel | door slab in a frame | door 4 × 3 × 1; 2 jambs 1 × 4 × 1, lintel 6 × 1 × 1 | (12.5, 1.5, 215) | metal | E1-R comes out here |
| S1-creekIce | box | 276 × 0.5 × 12 | (150, -0.2, 256) | ice | Creek, top at y 0.05. `slick` zone |
| S1-bermS ×4 | box | 65, 63, 78, 50 long × 1.2 × 1.5 | x 44.5, 114.5, 193, 263 at (x, 0.6, 249.25) | snow | South bank. Gaps at x 77–83, 146–154, 232–238 |
| S1-bermN ×4 | box | same four | same x at (x, 0.6, 262.75) | snow | North bank, same gaps |
| S1-bridge | box | 3 × 0.6 × 18 | (150, 1.5, 256) | wood | Log bridge, top at y 1.8, off the slick ice |
| S1-bridgeRamp ×2 | ramp | 3 × 1.8 × 5 | (150, 0.9, 244.5) high end north, (150, 0.9, 267.5) high end south | wood | On and off |
| S1-bridgeRail ×2 | box | 0.5 × 1.2 × 18 | (148.25, 2.4, 256), (151.75, 2.4, 256) | wood | Crouch rails |
| S1-leanTo | box roof and back wall | 6 × 0.5 × 3 and 6 × 1.6 × 0.5 | (165, 1.85, 265.5), (165, 0.8, 267.25) | wood | Sleepers E2-b |
| S1-kennel | box with a door | 4 × 1.6 × 2 | (205, 0.8, 285) | wood | Sled kennel, E2-c |
| S1-shrine | cylinder dais r 3 h 0.5, cylinder obelisk r 0.5 h 3, disc r 5 | — | (150, 0, 300), (150, 0.5, 300), (150, 0.05, 300) | stone, gold, neon | `spellShrine` Decoy. Checkpoint *2 |
| S1-shrineStone ×4 | cylinder | r 0.6, h 2.5 | (146, 0, 296), (154, 0, 296), (146, 0, 304), (154, 0, 304) | ice | Ring, also cover |
| S1-practiceLight | prefab `searchlight`, harmless | — | (150, 0, 312), sweeps the 20 m gap to row A | metal | Decoy practice: it buzzes when it holds you |
| S1-rowA ×3 | prefab `boulderL` | — | (110, 0, 320), (150, 0, 320), (190, 0, 320) | ice | Duel cover, full height |
| S1-rowB ×4 | prefab `boulderM` | — | (90, 0, 340), (130, 0, 340), (170, 0, 340), (210, 0, 340) | ice | 20 m dash from row A |
| S1-rowC ×3 | prefab `rockSlab` | — | (110, 0, 360), (150, 0, 360), (190, 0, 360) | rock | Full cover |
| S1-rowD ×4 | prefab `boulderM` | — | (95, 0, 378), (135, 0, 378), (165, 0, 378), (205, 0, 378) | ice | |
| S1-rowE ×3 | prefab `snowBerm` | — | (120, 0, 395), (150, 0, 395), (180, 0, 395) | snow | Crouch cover 15 m from the fence |
| S1-flankPine ×6 | prefab `pine` | — | (50, 330), (58, 350), (46, 368), (60, 385), (52, 400), (66, 410) | wood | West flank to the spire |
| S1-flankWall | box | 1.5 × 2.2 × 60 | (250, 1.1, 360) | snow | East flank, full cover to the hut |
| S1-fenceW, S1-fenceE | box | 44 × 2.4 × 0.5 | (122, 1.2, 410), (178, 1.2, 410) | metal | Post fence. Gate gap x 144–156 |
| S1-mast | cylinder | r 0.6, h 24 | (150, 0, 445) | metal | Radio mast |
| S1-mastDeck (P1) | box, 4 rail boxes 5 × 1.2 × 0.5 | 5 × 0.5 × 5 | (150, 13.75, 445) | metal | Perch P1, floor y 14 |
| S1-crowsNest (P4) | box, 4 rail boxes 3 × 1.2 × 0.5 | 3 × 0.5 × 3 | (150, 21.75, 445) | metal | Perch P4, floor y 22. Audit File 1 |
| S1-mastLift | mover | 1.5 × 0.5 × 1.5 | (152.5, 0, 445), stops at y 0, 14, 22 | metal | `onTrigger` lift. First lift of the level |
| S1-spire (P2) | cylinder r 4 h 9, cone r 4 h 6 on top | — | (70, 0, 425), (70, 9, 425) | ice | Ice spire |
| S1-spireLedge | box; ramp 2 × 6 × 12 behind, high end south | 4 × 0.5 × 3 | (70, 5.75, 420); ramp (76, 3, 430) | ice | Perch P2, floor y 6. Secret weapon cache in an alcove at (70, 6, 424) |
| S1-hut (P3) | box; stairs 1.5 × 4 × 6; roof rail 10 × 1.2 × 0.5 | 10 × 4 × 8 | (225, 2, 432); stairs (231.75, 2, 425); rail (225, 4.6, 428.25) | concrete | Perch P3, roof y 4. Door on the west face (220, 1.3, 433) for E3-R |
| S1-alarm3 | alarm box on the hut's west wall | — | (219.7, 2, 430); cable up the wall to (219.7, 4, 436) | metal | Alarm 3 |
| S1-passSlab ×3 | prefab `rockSlab` | — | (146, 0, 470), (154, 0, 482), (146, 0, 494) | rock | Cover in the pass |
| S1-rigPad | cylinder; 2 sandbag boxes 3 × 1.2 × 0.8 | r 2.2, h 0.6 | (150, 0, 512); bags (146.5, 0.6, 508), (153.5, 0.6, 508) | concrete | Mining Rig E3-d |
| S1-passGate | door | 14 × 5 × 1 | (150, 2.5, 518.5) | metal | Opens when E3 is cleared. Checkpoint *3 |

**Mechanisms in S1:** `cache` C1; `barrel` (fire) at the camp; `alarm` 1 and 3; `door` S1-tunnel, hut door, S1-passGate; `hazardZone slick` on the creek (x 12–288, n 250–262); `spellShrine`; harmless `searchlight`; `mover` S1-mastLift; `rack` R1 bazooka at (146, 0, 462).

**Transition out:** seamless. The pass gate opens and S2 loads behind it. The first whiteout starts 10 s after the player enters S2.

### 6.2 S2: The Kill Zone, the Wall and two Bunkers

Footprint 260 × 250 m. Terrain west of x 170; the frozen lake east of it is built from boxes so it
can have water and a cave under it. The wall runs east–west at n 200–206; the two bunkers are built
into it either side of the shield gate. About 190 solids.

```
  n  x 0         50        100       150       200       250
 240   ##                                                 ##
 230   ##               ..gW...     ..gE...               ##   gW gE  generators
 220   ##               .BNK W.     .BNK E.               ##
 210   ##               .......     .......               ##
 200   ##====S=====T=======R====[GT]===R=======T=====S====##   S searchlight  T tower  R rig  [GT] shield gate
 190   ##           ::K        == ==         ::           ##   K hound kennel   == apron barriers
 180   ##            ::    |             ~~~~~~~~~~~~~~~~~##
 170   ##            ------              xxxxxxxxxxxxxxxxx##   x cracking-ice band 3
 160   ##            |  ::       _ *4    xxxxxxxxxxxxxxxxx##   _ Last Cover (checkpoint *4)
 150   ##          d |   ::    _   o    :~~~~~~~~~~~~~~h~~##   d dugout (sleepers)   h fishing hut
 140   ##                 :: o         ::~~~~~~~~h~~b~~~~~##   gap 2 in the trench wall at n 140–148
 130   ##            |     ::    =   o:: xxxxxxxxGxxxxxxxx##   band 2.  G tile over the secret cave
 120   ##      ------        :       :   xxxxxxxxxxxxxxxxx##
 110   ##      |              o:   :o    ~~~~~~~~~~~~~~~~~##   rigs open fire north of n 118
 100   ##      |               :: ::     ~~~~~~b~~~~~h~~~~##   b balloon mine
  90   ##      |            O  =:=:=  O  xxxxxxxxxxxxxxxxx##   Sniper Rocks.  band 1
  80   ##                                xxxxxxxxxxxxxxxxx##   gap 1 in the trench wall at n 80–88
  70   ##      |               o         ~~~~h~~~~~~~~~~~~##
  60   ##      |                         ~~~~~~~~~~~~~~~~~##
  50   ##      |                  o      ~~~~~~~~~~~~~~~~~##   trench mouth (40, 50)
  40   ##                                                 ##
  30   ##                       o                         ##
  20   ##                                                 ##
  10   ##                                                 ##
   0   ########################|pass|#######################
```

Sightlines: Sniper Rocks (130, 88) to each tower **135 m**, to each rig **119 m**, to the gate
**112 m**. Last Cover (130, 155) to the rigs **57 m**, to the towers **85 m**. Trench gap 1 to tower W
**121 m**. Fishing hut 2 (232, 100) to tower E **108 m**. From the pass mouth the wall is 190 m away:
out of everyone's range, a place to watch one whole blizzard cycle.

**Three routes.** West: the trench, full cover except two 8 m gaps swept by searchlight W, ends at
bunker W's door. Centre: boulders with 15 to 25 m dashes, under both rigs from n 118. East: the
lake, the shortest line and no rig can see behind the huts, but the ice cracks and searchlight E
sweeps it; ends at bunker E's door.

| Id | Shape | Size (m) | Position (x, y, n) | Mat | Purpose |
|---|---|---|---|---|---|
| S2-ground | terrain | 170 × 200, cell 4, seed 502, amp 0.8, freq 0.015 | origin (0, 0, 0) | snow | West and centre |
| S2-cliffW, S2-cliffE | box | 10 × 14 × 250 | (5, 7, 125), (255, 7, 125) | rock | Side bounds |
| S2-cliffS ×2 | box | 113 × 14 × 8 | (66.5, 7, 4), (193.5, 7, 4) | rock | South bound, pass mouth x 123–137 |
| S2-eastSnow ×2 | box | 80 × 6 × 50 and 80 × 6 × 15 | (210, -3, 25), (210, -3, 192.5) | snow | Solid ground south and north of the lake |
| S2-lakeBed | box | 80 × 1 × 135 | (210, -5.5, 117.5) | rock | Lake floor at y −5. Water y −5 to −0.5 is a kill zone with rescue |
| S2-ice ×4 | box | 80 × 0.5 × 30, 28, 28, 13 | (210, -0.25, 65), (210, -0.25, 106), (210, -0.25, 146), (210, -0.25, 178.5) | ice | Solid ice between the bands, top y 0, not slick |
| S2-band1, 2, 3 | `crackTiles`, tile 4 m | 80 × 12 each | n 80–92, n 120–132, n 160–172, x 170–250 | ice | Falls 1 s after a step, back in 20 s |
| S2-log ×6 | box | 3 × 0.6 × 12 | (190, 0.3, 86), (240, 0.3, 86), (180, 0.3, 126), (225, 0.3, 126), (200, 0.3, 166), (245, 0.3, 166) | wood | Two safe crossings in each band |
| S2-hut ×4 | prefab `fishHut` | — | (190, 0, 70), (232, 0, 100), (212, 0, 143), (238, 0, 150) | wood | Lake cover. Hut 2 has a sniper box; hut 4 has the Overshield |
| S2-cave | box floor 10 × 0.5 × 10, 4 wall boxes 10 × 4 × 1, ramp 3 × 4 × 10 high end north | — | floor (212, -4.25, 126); ramp (212, -2, 136) comes up inside hut 3 | ice | Golden Bonk cave under tile G |
| S2-approach ×3 | prefab `boulderM` | — | (125, 0, 30), (137, 0, 50), (121, 0, 70) | ice | Cover from the pass to Sniper Rocks |
| S2-sniperRocks | 3 boxes 5 × 2.2 × 1.5; 2 prefab `boulderL` | — | boxes (118, 1.1, 90), (130, 1.1, 88), (142, 1.1, 90); boulders (104, 0, 90), (156, 0, 90) | rock, ice | Firing line. 2 m gaps to shoot through |
| S2-centre ×6 | prefab `boulderM` ×4, `rockSlab`, `boulderS` | — | M (116, 0, 110), (146, 0, 112), (112, 0, 145), (141, 0, 147); slab (128, 0, 128); S (150, 0, 126) | ice, rock | Centre route |
| S2-lastCover ×3 | prefab `snowBerm` | — | (118, 0, 152), (130, 0, 155), (142, 0, 152) | snow | Crouch cover 50 m from the wall. Checkpoint *4 |
| S2-apron ×2 | box | 4 × 1.2 × 1 | (121, 0.6, 188), (139, 0.6, 188) | concrete | Under the rigs' dead angle (they cannot aim inside 15 m of the wall) |
| S2-trLeg1 | 3 boxes 1.5 × 2.2 × L | L 73; 30; 30.5 | west wall (37.75, 1.1, 86.5); east wall (42.25, 1.1, 65) and (42.25, 1.1, 103.25) | snow | Lane x 38.5–41.5, n 50–120. **Gap 1** in the east wall n 80–88 |
| S2-trJog1 | 2 boxes L × 2.2 × 1.5 | L 31.5; 26.5 | north (52.75, 1.1, 122.25); south (56.25, 1.1, 117.75) | snow | Lane n 118.5–121.5, x 38.5–71.5 |
| S2-trLeg2 | 4 boxes 1.5 × 2.2 × L | L 25.5, 17.5; 23, 20.5 | west (67.75, 1.1, 135.25), (67.75, 1.1, 160.75); east (72.25, 1.1, 128.5), (72.25, 1.1, 158.25) | snow | Lane x 68.5–71.5, n 120–170. Dugout door in the west wall n 148–152. **Gap 2** in the east wall n 140–148 |
| S2-dugout | `room(58–67, 146–154, 0, 2.2)`, door east | — | — | wood | 3 sleeping Midgets, a bullets box |
| S2-trJog2 | 2 boxes L × 2.2 × 1.5 | L 31.5; 26.5 | north (82.75, 1.1, 172.25); south (86.25, 1.1, 167.75) | snow | Lane n 168.5–171.5, x 68.5–101.5 |
| S2-trLeg3 | 2 boxes 1.5 × 2.2 × L | L 27; 32 | west (97.75, 1.1, 185.5); east (102.25, 1.1, 183) | snow | Lane x 98.5–101.5, n 170–199, to bunker W's door |
| S2-wallW, S2-wallE | box | 75 × 8 × 6 | (47.5, 4, 203), (212.5, 4, 203) | concrete | Wall x 10–85 and x 175–250. Walk on top at y 8 |
| S2-pierW, S2-pierE | box | 11 × 8 × 6 | (120.5, 4, 203), (139.5, 4, 203) | concrete | Gate piers |
| S2-lintel | box | 8 × 2 × 6 | (130, 7, 203) | concrete | Gate opening 8 wide × 6 high |
| S2-shieldGate | door | 8 × 6 × 1 | (130, 3, 200.5) | glass | Energy gate. Drops when both generators are destroyed |
| S2-parapetS | 20 boxes 10 × 1.2 × 0.5 with 2 m gaps | — | x from 16 to 244, at (x, 8.6, 200.25) | concrete | Crouch parapet for the wall snipers |
| S2-parapetN | box | 240 × 3 × 0.5 | (130, 9.5, 205.75) | concrete | No way down into the courtyard from the wall |
| S2-towerW, S2-towerE | prefab `watchtower`, legs 4 m | — | (60, 8, 203), (200, 8, 203) | metal | Cabin floor at y 12. Audit File 2 and a sniper box in tower W |
| S2-lightW, S2-lightE | prefab `searchlight` | — | (30, 8, 202), (230, 8, 202) | metal | W sweeps the trench gaps, E sweeps the lake. Lamp 30 HP |
| S2-alarm4 | alarm box and 2 cables | — | box (130, 9.2, 200.2); cables along the wall face at y 7 to x 30 and x 230 | metal | Wall alarm. Cut either cable to unlink that searchlight |
| S2-kennel | box with a door on the south face | 4 × 2 × 3 | (75, 1, 198.5) | concrete | E4-g hounds |
| BW-shell | `room(85–115, 200–236, 0, 8)`, doors: south at x 100, north at x 100 (service) | — | — | concrete | Bunker W. Roof top at y 8 joins the wall walk |
| BW-corridor | 2 boxes | 1 × 7.5 × 13 | (97.5, 3.75, 207.5), (102.5, 3.75, 207.5) | concrete | Entry corridor x 98–102, n 201–214 |
| BW-partition | box with door gaps at x 88, 100, 108 | 28 × 7.5 × 1 | (100, 3.75, 214.5) | concrete | Splits front rooms from the generator room |
| BW-stairs | stairs, low end north | 3 × 7.5 × 12 | (88, 3.75, 207) | concrete | Up to a roof hatch at (88, 8, 202). The flank on the rig |
| BW-bunks ×2 | box | 2 × 1.2 × 1 | (110, 0.6, 204), (110, 0.6, 210) | wood | Bunk room x 103–114, n 201–214 |
| BW-gen | `target` generator (500 HP) | prefab `generator` | (100, 0, 227) | metal | Generator W |
| BW-cover ×3 | 2 prefab `crateStack`, box 4 × 1.2 × 1 | — | (93, 0, 221), (107, 0, 221), (100, 0.6, 219) | crate | Generator room x 86–114, n 215–235 |
| BW-alarm5W | alarm box, cable along the north wall to x 100 | — | (113, 2, 234) | metal | Alarm 5W |
| BW-rigPad | cylinder | r 2, h 0.5 | (100, 8, 203) | concrete | Mining Rig W on the roof |
| BE-* | Bunker E: every BW row mirrored about x 130 (x' = 260 − x) | — | door (160, 200), generator (160, 0, 227), stairs (172, 3.75, 207), rig pad (160, 8, 203), alarm 5E (147, 2, 234), roof rope hatch (170, 8, 208) | concrete | Bunker E |

**Mechanisms in S2:** blizzard (`weather`, whiteouts at t = 10–30, 100–120, 190–210 s after entering S2 and every 90 s after, 4 s warning); 2 `searchlight`; `alarm` 4, 5W, 5E; `crackTiles` × 3 bands; kill zone with rescue under the lake; 2 `target` generators; `door` shield gate, kennel, bunker doors; `powerup` Overshield in hut 4 (238, 0, 150).

**Transition out:** seamless through the gate. S3's origin is S2 (80, 0, 206): the inner face of the wall.
