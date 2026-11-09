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

### 6.3 S3: Gatehouse and Courtyard — lockdown 1 [L]

Footprint 100 × 120 m, built. The gatehouse (n 0–22) holds depot 1. The courtyard is the mini-boss
arena: **70 × 70 m** of floor (x 15–85, n 24–94), walls 12 m high, a gallery ring at y 5 on all
four sides, a force-field lid at y 12. About 80 solids.

```
  n  x 0         25        50        75        100
 115                      |S4|                         covered passage to Frost Halls
 105                      |  |
  95        ############## N  #############            N  exit door (locked until the fight ends)
  90        ##G------------+------------G##            G  courtyard generators (Part 2)   + Overshield
  85        ##|: c     =       =     c :|##            --- | gallery ring at y 5, 4 m wide
  80        ##| :                     : |##
  75        ##|  :  O             O  :  |##            O  ice pillars (charge stoppers)
  70        ##|   :   xxxxxxxxxxx   :   |##            x  floor that cracks in Part 3 (over a 3 m basin)
  65        ##|    :  xxx@@@@@xxx  :    |##
  60        #W|  =  ::xxx@DAISxxx::  =  |E#            W E  add doors (SP-W, SP-E)
  55        ##|      :xxx@@@@@xxx:      |##            @  dais with the Ice Machine
  50        ##|       xxxxxxxxxxx       |##
  45        ##|       xxxxxxxxxxx       |##
  40        ##|     O   :     :   O     |##            =  barriers 1.2 m   c crate stacks 2 m
  35        ##|s         :   :         s|##            s  stairs to the gallery
  30        ##|  c     =  : :  =     c  |##            threshold line at n 30
  25        ##-------------E-------------##            E  Captured Mining Rig emplacement (50, 5, 26)
  20        ######........|  |.......######            arena door at n 22.5; checkpoint *6 outside it
  10              .DEPOT..|  |stairs.                  D1 depot west of the gate passage
   0              ........|^ |.......
```

Sightlines: emplacement to each generator **73 m**; south gallery to north gallery **66 m**; west
gallery to east gallery **66 m**; arena door to the dais **36 m**.

| Id | Shape | Size (m) | Position (x, y, n) | Mat | Purpose |
|---|---|---|---|---|---|
| S3-floorS, S3-floorN | box | 100 × 1 × 46, 100 × 1 × 48 | (50, -0.5, 23), (50, -0.5, 96) | concrete | Floor south and north of the basin |
| S3-floorW, S3-floorE | box | 37 × 1 × 26 | (18.5, -0.5, 59), (81.5, -0.5, 59) | concrete | Floor either side of the basin |
| S3-basin | box | 26 × 1 × 26 | (50, -4.5, 59) | ice | Basin floor at y −4. Cold water y −4 to −1: rescue to the edge, −15% max HP |
| S3-iceFloor | `crackTiles`, 8 × 8 tiles of 3.25 m | 26 × 26 | x 37–63, n 46–72, top y 0 | ice | Locked solid in Parts 1 and 2, cracks in Part 3 |
| S3-dais | cylinder | r 5, h 4.6 | (50, -4, 59) | ice | Top at y 0.6. Always solid |
| S3-iceMachine | cylinder | r 1.5, h 4 | (50, 0.6, 59) | metal | The Auditor starts frozen in a block on top of it |
| S3-passage | 2 wall boxes 1 × 6 × 22, roof 10 × 0.5 × 22 | — | walls (45.5, 3, 11), (54.5, 3, 11); roof (50, 6.25, 11) | concrete | Gate passage x 46–54 |
| S3-depot | `room(28–45, 2–20, 0, 6)`, door east at n 11 | — | — | concrete | Depot 1 |
| S3-stairRoom | `room(55–72, 2–20, 0, 6)`, door west at n 11, door north at y 5 (70, 5, 20); stairs 3 × 5 × 12, low end south | — | stairs (70, 2.5, 10) | concrete | Way up to the south gallery and the emplacement |
| S3-arenaDoor [L] | door slab, neon trim | 8 × 6 × 0.6 | (50, 3, 22.5) | metal | Entry. Drops 1 s after the player crosses n 30 |
| S3-threshold [L] | disc line | 8 × 0.3 | (50, 0.02, 30) | neon | 6 m inside |
| S3-wallW, S3-wallE | box | 2 × 12 × 74 | (14, 6, 59), (86, 6, 59) | concrete | Each has a 3 × 3 add door at n 59: **SP-W**, **SP-E** |
| S3-wallS ×2, lintel | box | 32 × 12 × 2 ×2; 8 × 6 × 2 | (30, 6, 23), (70, 6, 23); lintel (50, 9, 23) | concrete | South wall, door 8 × 6 |
| S3-wallN ×2, lintel | box | 34 × 12 × 2 ×2; 4 × 8 × 2 | (31, 6, 95), (69, 6, 95); lintel (50, 8, 95) | concrete | North wall, exit door 4 × 4 |
| S3-exitDoor [L] | door slab, neon trim | 4 × 4 × 0.6 | (50, 2, 95) | metal | Exit. Opens when the lockdown ends |
| S3-gallS, S3-gallN | box | 62 × 0.5 × 4 | (50, 4.75, 26), (50, 4.75, 92) | metal | Gallery floors at y 5 |
| S3-gallW, S3-gallE | box | 4 × 0.5 × 70 | (17, 4.75, 59), (83, 4.75, 59) | metal | Gallery floors at y 5 |
| S3-rail | 24 boxes 8 × 1.2 × 0.5 with 2 m gaps | — | inner edge of all four galleries at y 5.6 | metal | Crouch cover on the gallery |
| S3-stairSW, S3-stairSE | stairs, low end north | 3 × 5 × 10 | (20.5, 2.5, 34), (79.5, 2.5, 34) | metal | Courtyard floor to the south gallery |
| S3-pillar ×4 | cylinder, breaks after 2 charge hits | r 2, h 8 | (32, 0, 41), (68, 0, 41), (32, 0, 77), (68, 0, 77) | ice | A charge into one stuns the Auditor 2 s |
| S3-barrier ×6 | box | 4 × 1.2 × 1 | (40, 0.6, 32), (60, 0.6, 32), (24, 0.6, 59), (76, 0.6, 59), (40, 0.6, 86), (60, 0.6, 86) | concrete | Crouch cover |
| S3-crates ×4 | prefab `crateStack` | — | (26, 0, 30), (74, 0, 30), (26, 0, 88), (74, 0, 88) | crate | Full cover |
| S3-genNW, S3-genNE | `target` generator (500 HP) | prefab `generator` | (17, 5, 91), (83, 5, 91) | metal | Power the Part 2 cold aura |
| S3-rig | `emplacement` (def `miningRig`), arc 120° | — | (50, 5, 26), yaw 180 (faces north) | metal | Captured Mining Rig |
| S3-ropeN ×2 | spawn markers **SP-N** | — | (35, 5, 92), (65, 5, 92) | — | Agents rope down to the north gallery |
| S3-kennelHatch | spawn marker **SP-K**, box 3 × 1.5 × 2 | — | (62, 0.75, 93) | metal | Hounds in Part 3 |
| S3-passageN | 2 wall boxes 1 × 6 × 20, roof 6 × 0.5 × 20 | — | walls (47.5, 3, 106), (52.5, 3, 106); roof (50, 6.25, 106) | concrete | To S4 |

**Lockdown 1 summary:** room 70 × 70 m, two levels. Entry S3-arenaDoor, exit S3-exitDoor. Spawn
points **SP-W** (west door), **SP-E** (east door), **SP-N** (north gallery ropes), **SP-K** (kennel hatch by
the exit). Cover: 6 barriers, 4 crate stacks, 4 pillars, the dais, the gallery rails. Inside the room:
the emplacement, a sniper box on the north gallery (50, 5, 92), a bullets box by the emplacement
(46, 5, 26), an Overshield at (50, 5, 90). Checkpoint *6 at (50, 0, 18). Waves: the parts table in §10.

**Mechanisms in S3:** `depot` D1; `lockdown` L1; `emplacement`; 2 `target` generators; cold aura (`hazardZone cold`, Part 2); `crackTiles` and `hazardZone slick` (Part 3); `powerup` Overshield.

**Transition out:** seamless. S4's origin is S3 (10, 0, 116).

### 6.4 S4: Frost Halls — three floors, lockdown 2 [L] on the upper two

Footprint 80 × 70 m, built, floors at y 0, 7 and 14, roof at y 20. F1 is the Intake level (E6). The
Records Library (E7) is one double-height room: its floor is F2 (y 7) and its gallery ring is F3
(y 14). Library floor **56 × 44 m** (x 12–68, n 12–56). About 150 solids.

```
  F1 Intake (y 0)                                   F2 + F3 Records Library (floor y 7, gallery y 14)
  n  x 0         20        40        60        80   n  x 0         20        40        60        80
  68   #########################################    68
  64   #              ...LIFT A..              #    64                    LIFT A top *8
  60   #          ----...........              #    60
  56   #         |            ::::::           #    56         #############IN #############
  52   #         |       |RRR|::::::           #    52         #           - - -           #   threshold n 50
  48   #         |  :::::|~~~|:KEN::           #    48         # s   I  I I     I I  I     #
  44   #         |  :W2::|~~~|::::::           #    44         # s   I  I I     I I  I     G   G gallery door (SP-G)
  40   #         |  :::::|~~~|                 #    40         # s   Iv I I     I I  I     #   v ceiling vents (SP-V1, SP-V2)
  36   #service  |       |~~~|::::::           #    36         #                           #
  32   #passage  |       |~~~|::::::           #    32         W   =    =    @    =    =   E   W E floor doors (SP-W, SP-E)
  28   #         |  :::::|~~~|:E1:::           #    28         #     I  I I     I I vI  s  #   @ index desk  = tables
  24   #         |  :::::|~~~|::::::           #    24         #     I  I I     I I  I  s  #   I shelves 3 m high
  20   #         |  :W1::|~~~|                 #    20         #cccc I  I I     I I  I  s  #   c records cage (SP-C)
  16   #         |  :::::|~~~|                 #    16         #cccc                       #   s stairs to the gallery
  12   #         |     .........               #    12         #############OUT#############   OUT on the gallery (y 14)
   8   #         |     .VEST R2.               #     8
   4   #               .........               #     4                    FREIGHT (y 14)
   0   ###################|^|###################     0
```

`~` slick corridor 5 × 44 m, `RRR` the riot line, `KEN` kennel, W1 W2 E1 cold lockers. Sightlines:
F1 corridor **44 m**. Library: east gallery perch (66, 14, 44) to the entry **27 m**; south gallery
(40, 14, 14) to the entry **38 m**; floor north-west corner to the south-east gallery **58 m**.

| Id | Shape | Size (m) | Position (x, y, n) | Mat | Purpose |
|---|---|---|---|---|---|
| S4-shell | 4 wall boxes; slabs | walls 1 × 21 × 70 ×2, 80 × 21 × 1 ×2; slabs 80 × 1 × 70 | walls (0.5, 10.5, 35), (79.5, 10.5, 35), (40, 10.5, 0.5), (40, 10.5, 69.5); slabs at y −0.5, 6.5, 20.5 | concrete | Shell. The y 6.5 slab has a 4 × 4 lift hole at (40, 62). South door at x 38–42 on F1 |
| F1-vestibule | `room(32–48, 1–12, 0, 6)`, doors south x 40, north x 40, west n 8 | — | — | concrete | Rack R2 shotgun (34, 0, 6), shells box (46, 0, 6) |
| F1-corrW | box, door gaps n 21–23.4 and n 43–45.4 | 1 × 6 × 44 | (37, 3, 34) | concrete | Corridor west wall, doors to W1 and W2 |
| F1-corrE | box, door gaps n 29–31.4 and n 49–51.4 | 1 × 6 × 44 | (43, 3, 34) | concrete | Corridor east wall, doors to E1 and the kennel |
| F1-slick | `hazardZone slick` | 5 × 40 | x 37.5–42.5, n 14–54 | ice | Slick corridor floor |
| F1-pallet ×3 | box | 1.5 × 1.2 × 1 | (39, 0.6, 20), (41.5, 0.6, 32), (39, 0.6, 44) | ice | Crouch cover in the corridor |
| F1-service | box; link passage 2 boxes 7 × 6 × 1 | 1 × 6 × 52 | wall (21.5, 3, 33); link walls (28.5, 3, 5.5), (28.5, 3, 10.5) | concrete | Service passage, lane x 22–25, n 8–58. The flank |
| F1-lockerW1, W2 | `room(26–36.5, 16–28, 0, 6)`, `room(26–36.5, 38–50, 0, 6)`, doors east and west at mid n | — | — | metal | Cold lockers (`hazardZone cold`). Mana Battery behind pallets in W2 at (31, 0.5, 47) |
| F1-lockerE1, F1-kennel | `room(43.5–56, 24–36, 0, 6)`, `room(43.5–56, 44–56, 0, 6)`, door west | — | — | metal | E1 is cold. The kennel is E6-c |
| F1-liftLobby | `room(30–50, 56–68, 0, 6)`, doors south x 40, west n 58 | — | — | concrete | Both routes meet here |
| S4-liftA | mover | 4 × 0.5 × 4 | (40, 0, 62) to y 7 | metal | Lift A, `onTrigger` |
| F2-lobby | `room(30–50, 58–68, 7, 6)`, door south x 40 | — | — | concrete | Checkpoint *8, shells box (44, 7, 64) |
| LIB-shell | `room(12–68, 12–56, 7, 13)`: wall boxes 13 m high | — | — | concrete | Library, ceiling at y 20 |
| LIB-in [L] | door slab, neon trim | 4 × 6 × 0.6 | (40, 10, 56.5) | metal | Entry. Drops 1 s after the player crosses n 50 |
| LIB-threshold [L] | disc line | 4 × 0.3 | (40, 7.02, 50) | neon | 6 m inside |
| LIB-out [L] | door slab, neon trim | 4 × 6 × 0.6 | (40, 17, 11.5) | metal | Exit, on the south gallery |
| LIB-shelf ×12 | box | 0.8 × 3 × 10 | x 24, 29, 34, 46, 51, 56 at n 25 and n 43, y 8.5 | wood | Stacks. Aisles 4.2 m; centre aisle x 35–45; cross aisle n 30–38 |
| LIB-table ×4 | box | 3 × 1.2 × 1.5 | (20, 7.6, 34), (30, 7.6, 34), (50, 7.6, 34), (60, 7.6, 34) | wood | Crouch cover in the cross aisle |
| LIB-desk | cylinder | r 2, h 1.2 | (40, 7, 34) | wood | Index desk. Reward chest and crate appear here |
| LIB-cage | `room(13–21, 13–21, 7, 3)`, glass walls, door east | — | — | glass | Records cage: **SP-C**. Audit File 3 inside |
| LIB-gallW, LIB-gallE | box | 4 × 0.5 × 44 | (14, 13.75, 34), (66, 13.75, 34) | metal | Gallery floors at y 14 |
| LIB-gallS, LIB-gallN | box | 48 × 0.5 × 4 | (40, 13.75, 14), (40, 13.75, 54) | metal | Gallery floors at y 14 |
| LIB-rail | 16 boxes 8 × 1.2 × 0.5 with 2 m gaps | — | inner edges of the gallery at y 14.6 | metal | Crouch cover |
| LIB-stairNW | stairs, low end north; landing box 3 × 0.5 × 2 | 3 × 7 × 14 | (17.5, 10.5, 43); landing (17.5, 13.75, 35) | metal | Floor to the west gallery |
| LIB-stairSE | stairs, low end south; landing box 3 × 0.5 × 2 | 3 × 7 × 14 | (62.5, 10.5, 25); landing (62.5, 13.75, 33) | metal | Floor to the east gallery |
| LIB-doorW, LIB-doorE | door 3 × 3 | — | (11.5, 8.5, 34), (68.5, 8.5, 34) | metal | **SP-W** archive door, **SP-E** stairwell door |
| LIB-doorG | door 3 × 3 | — | (68.5, 15.5, 44) | metal | **SP-G** east gallery door |
| LIB-vent ×2 | spawn markers, ceiling grate boxes 2 × 0.5 × 2 | — | **SP-V1** (26, 19.75, 43), **SP-V2** (54, 19.75, 25) | metal | Ropes drop to the floor |
| F3-lobby | `room(30–50, 2–11, 14, 6)` on a floor slab 20 × 1 × 9 at (40, 13.5, 6.5) | — | — | concrete | Freight lobby |
| S4-freight | mover | 6 × 0.5 × 5 | (40, 14, 5) to y 21 | metal | Freight lift, 15 s, hides the S5 load |

**Lockdown 2 summary:** room 56 × 44 m, two levels (floor and gallery ring). Entry LIB-in, exit
LIB-out. Spawn points **SP-W**, **SP-E**, **SP-G**, **SP-V1**, **SP-V2**, **SP-C** on five different sides.
Cover: 12 shelves, 4 tables, the desk, the cage, the gallery rails. Inside the room: shells box at the
desk (38, 7, 36), sniper box on the west gallery (14, 14, 20). Checkpoint *8 in the F2 lobby. Waves: §8, E7.

**Mechanisms in S4:** `rack` R2; `hazardZone slick` and `cold`; `mover` Lift A and freight lift; `lockdown` L2; `manaBloom` in the library reward.

**Transition out:** the freight lift. S5's origin is the lift's top: S5 (40, 0, 5) = S4 (40, 21, 5).

### 6.5 S5: Armory and Vault — lockdown 3 [L]

Footprint 80 × 100 m, built, one floor at y 0, vault ceiling at y 12. Vault floor **44 × 44 m**
(x 18–62, n 40–84). About 70 solids.

```
  n  x 0         20        40        60        80
  96                     (EXIT)                       extraction pad, level end
  88                      |  |                        gantry
  84           ########### N  ##########              N  exit door
  80           #   O               O   #              O  pillars r 1.5
  76           #     C     =     D     #              A B C D  roof hatches (spawn points)
  72           #      =         =      #              =  deposit blocks, ring r 14
  68      ......        v     v        #              v  coolant grates (cold pulses)
  64      .guard    =     (S)     =    #              (S) safe and drill; hold ring r 9 round it
  60      ......                       #              guard room door in the west wall (spawn point)
  56      ......        v     v        #
  52           #      =         =      #
  48           #   O A     =     B O   #              threshold line at n 46
  44           #                       #
  40           ########### BD ##########              BD blast door (entry)
  36                      |*10                        antechamber, checkpoint *10
  28                      |  |
  24                 .............
  16                 .ARMORY D2...                    depot 2
   8                 .............
   4                     [lift]                       freight lift from S4
```

Sightlines: blast door to the exit door **44 m**; any hatch to the ring edge **11 to 17 m**; guard door to the safe **22 m**.

| Id | Shape | Size (m) | Position (x, y, n) | Mat | Purpose |
|---|---|---|---|---|---|
| S5-floor | box | 80 × 1 × 100 | (40, -0.5, 50) | concrete | Floor |
| S5-liftBay | `room(36–44, 1–9, 0, 5)`, door north | — | — | concrete | Freight lift top |
| S5-armory | `room(28–52, 9–25, 0, 5)`, doors south and north at x 40 | — | — | concrete | Depot 2: depot crate (33, 0, 17), health station (33, 0, 21), loadout bench (47, 0, 21), shop terminal (47, 0, 17) |
| S5-antechamber | `room(36–44, 25–39, 0, 6)`, door south | — | — | concrete | Checkpoint *10 at (40, 0, 34), bullets box (42, 0, 32) |
| S5-blastDoor [L] | door slab, neon trim | 6 × 6 × 0.6 | (40, 3, 39.5) | metal | Entry. Drops 1 s after the player crosses n 46 |
| S5-threshold [L] | disc line | 6 × 0.3 | (40, 0.02, 46) | neon | 6 m inside |
| S5-vaultWalls | 4 boxes 2 m thick, 12 high, with door gaps | 48 × 12 × 2 ×2, 2 × 12 × 44 ×2 | south (40, 6, 39), north (40, 6, 85), west (17, 6, 62), east (63, 6, 62) | metal | Vault shell |
| S5-roof | 4 boxes round a centre opening, each with a 3 × 3 hatch hole | slab 1 m thick at y 12.5 | hatches **A** (26, 12, 50), **B** (54, 12, 50), **C** (26, 12, 74), **D** (54, 12, 74); iris opening r 6 at (40, 12, 62) | metal | Ceiling. The iris is a force-field lid: strikes and the drone pass, the player does not |
| S5-exitDoor [L] | door slab, neon trim | 4 × 4 × 0.6 | (40, 2, 84.5) | metal | Exit |
| S5-guardRoom | `room(6–17, 56–68, 0, 4)`, door east 3 × 3 at (17, 1.5, 62) | — | — | concrete | **Guard door** spawn point |
| S5-safe | cylinder; drill arm box 1 × 1 × 6 | r 2.5, h 3 | (40, 0, 62); arm (40, 4, 62) | gold, metal | The ledger safe and the drill. Switch on its south face |
| S5-ring | disc | r 9 | (40, 0.02, 62) | neon | Hold zone |
| S5-console ×4 | box | 2 × 1.2 × 1 | (46, 0.6, 62), (34, 0.6, 62), (40, 0.6, 56), (40, 0.6, 68) | metal | Crouch cover inside the ring |
| S5-block ×8 | box, alternating 3 × 2.2 × 1.5 and 3 × 1.2 × 1.5 | — | (54, 62), (49.9, 71.9), (40, 76), (30.1, 71.9), (26, 62), (30.1, 52.1), (40, 48), (49.9, 52.1) | metal | Deposit blocks, ring r 14. Tall ones first in the list order |
| S5-pillar ×4 | cylinder | r 1.5, h 12 | (24, 0, 46), (56, 0, 46), (24, 0, 78), (56, 0, 78) | concrete | Full cover in the corners |
| S5-grate ×4 | disc, `hazardZone cold` when pulsing | r 3 | (30, 0.02, 56), (50, 0.02, 56), (30, 0.02, 68), (50, 0.02, 68) | ice | Coolant vents |
| S5-gantry | box | 4 × 0.5 × 12 | (40, -0.25, 90) | metal | To the pad |
| S5-pad | disc | r 5 | (40, 0.02, 96) | neon | Level end volume |

**Lockdown 3 summary:** room 44 × 44 m. Entry S5-blastDoor, exit S5-exitDoor. Spawn points: roof
hatches **A**, **B**, **C**, **D** (four corners), the **iris** (centre roof), the **guard door** (west wall).
Cover: 8 deposit blocks, 4 consoles, 4 pillars, the safe (17 pieces). Inside the room: bullets box
(60, 0, 62), shells box (40, 0, 80). Checkpoint *10 outside the blast door. Waves: §10.

**Mechanisms in S5:** `depot` D2; `lockdown` L3 with a `hold` ring; Drone Strike emitter; 4 cold grates; `switch` on the safe.

**Transition out:** stepping on the pad ends the level.

## 7. Prefabs

All in `src/data/levels/prefabs/glacier.js`. Positions inside a prefab are relative to its origin on the ground.

| Prefab | Parts |
|---|---|
| `pine` | Trunk cylinder r 0.3 h 2.5 (`wood`, the only collider); cone r 1.6 h 3 at y 2 and cone r 1.1 h 2.4 at y 4 (`hedge`) |
| `boulderS` | Sphere r 1.0 at y 0.4 (`ice`). Top at 1.4 m: crouch cover |
| `boulderM` | Sphere r 1.6 at y 0.8 (`ice`). Top at 2.4 m: full cover |
| `boulderL` | Sphere r 2.6 at y 1.2 and sphere r 1.6 at (2.4, 0.6, 0.8) (`ice`). 6 m wide, full cover |
| `rockSlab` | Box 4 × 2.2 × 1.2 (`rock`), long side east–west |
| `snowBerm` | Box 6 × 1.2 × 1.5 (`snow`) |
| `crateStack` | Two boxes 1.2 × 1.2 × 1.2 side by side and one on top (`crate`). 2.4 m high |
| `snowcat` | Body box 5 × 1.6 × 2.4 at y 1.2; cabin box 2.2 × 1.4 × 2.2 at (1.2, 2.7, 0); 2 track boxes 5.4 × 0.8 × 0.6 at y 0.4, ±1.3 to the sides (`metal`) |
| `fishHut` | Box 3 × 2.4 × 3 (`wood`) with a 1.2 m door gap on the south side; roof box 3.4 × 0.5 × 3.4 at y 2.65 |
| `watchtower` | 4 leg cylinders r 0.3 at the corners of a 3.4 m square (h 8, or 4 on the wall); deck box 4.4 × 0.5 × 4.4; 4 parapet boxes 4.4 × 1.2 × 0.5; 4 post cylinders r 0.25 h 2.3; roof box 4.8 × 0.5 × 4.8; stairs 1 × h × 5 on the north side. 15 parts |
| `searchlight` | Post cylinder r 0.3 h 2; lamp box 0.8 × 0.8 × 0.8 at y 2.4 (the 30 HP target); render-only beam cone; the `searchlight` mechanism |
| `alarmPole` | Pole cylinder r 0.25 h 4; siren box 0.6 × 0.6 × 0.6 at y 4 (`neon` red, the 40 HP target); a cable drawn as a red line with a 0.5 m hit radius |
| `generator` | Cylinder r 1.2 h 2.4 (`metal`); 2 coil boxes 0.6 × 2 × 0.6 at ±1.5; core sphere r 0.5 at y 1.6 (`neon`, weak spot × 2) |
| `room(x0–x1, n0–n1, y, h)` | Kit helper, not a prefab file: 4 wall boxes 1 m thick and `h` high standing on `y`, each split at its doors (door 2.4 wide × 2.6 high unless stated, lintel box above), and a roof box 0.5 m thick |

## 8. Encounters

Level-wide: `maxAlive` 12, at most 4 threat roles engaged at once, one elite per section. Where a
squad would be the fifth role or the thirteenth enemy, the director holds it until there is room.
Placed squads in S1 and S2 exist from section load, because they are seen from 130 m (C §3.8's 70 m
pre-spawn is too short here).

### E1 The Picket (S1)

Space: a 91 m shot from Overlook Ridge down to a camp round a wrecked snowcat, with a lookout stand
113 m away on the left. Approaches: stay on the ridge; the west pines (hidden from the lookout); the
centre boulders. Objective: `clearAll`.

| Squad | Trigger | Method | From | Distance | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| E1-a | section load | `placed` | Campfire by the snowcat (158, 168). Two face away from the ridge | 91 m | 5 midget | — | Sneak shots: one body shot each, back-turned ones first. The fire barrel kills four at once but is heard by the lookout |
| E1-b | section load | `placed` | Lookout stand (120, 186). One scans south, one watches the camp; the camp-watcher is the alarm runner | 113 m | 2 obama | — | Target order. Shoot the runner first, or shoot alarm 1's box, or wait until both look away from the camp |
| E1-c | `onEnter` within 20 m of the fire | `burrow` | Snow mounds (150, 165), (172, 166) | 6–12 m | 2 sewerMidget | 0 s, 0.6 s | A cleared camp still bites. Watch for dust; a reason to carry a second gun |
| E1-R | alarm 1 rung | `door` | Ice tunnel in the west cliff (12, 215) | 150 m from the ridge | 4 midget, 2 boomMidget | 6 s | The price of noise: a pack crossing 110 m of open snow. Snipe the Boom Midgets inside the pack |

Quiet if played well: nothing leaves the tunnel and the lookout box holds 8 sniper rounds. Loud if
not: E1-R, and the camp scatters into cover. `maxAlive` 9 (15 with the alarm). Roles: fodder, ranged
(+ rusher). Nearby: cache C1 and a sniper box 18 m before the ridge. **1.1 min.**

### E2 Frozen Creek (S1)

Space: the creek, 12 m of slick ice between two berms, three crossings (west gap, log bridge, east
gap). Objective: `reach` the north bank.

| Squad | Trigger | Method | From | Distance | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| E2-a | section load | `placed`, air patrol | Flies the creek line x 80 ↔ 235 at n 256, 8 m up, 8 m/s, 39 s loop | first seen at 85 m | 1 spotterDrone | — | New enemy, alone. Read the cone (white, yellow, red), cross behind it, or shoot the lamp with one round |
| E2-b | section load | `placed`, asleep | Lean-to on the north bank (165, 265) | 15 m from the bridge end | 4 midget | — | Sleepers wake to noise inside 12 m, a mortar, or barking. Walk past or kill them close |
| E2-c | `onEnter` north bank (n ≥ 266) | `door` | Sled kennel (205, 285) | 40–55 m | 2 frostHound | 0 s, 1.5 s | New enemy, alone. They come however quiet you were. Shoot on the crouch; note the slick patch |
| E2-R | drone holds the player 1.5 s | mortar, then `drop` | 3 shells on the marked spot; pod lands at (150, 275) | 8 m or more | 3 midget, 1 robotLaser; E2-b wakes | shells +1.4 s, pod +4 s | Being seen costs time and ammo, not the run |

Quiet: the drone passes, the sleepers sleep, only the hounds come. Loud: mortar, pod, sleepers.
`maxAlive` 7 (11). Roles: detection, fodder, tracker. Nearby: bullets box at the camp checkpoint. **0.9 min.**

### E3 The Listening Post and the pass (S1)

Space: five rows of boulders, 20 m apart, facing a fenced radio post 125 to 135 m away with three
sniper perches, then a 60 m pass with a Mining Rig at its end. Approaches: the rows (centre), the
west pines to the spire, the east snow wall to the hut. Objective: `clearAll`, then the pass gate opens.

| Squad | Trigger | Method | From | Distance | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| E3-a | section load | `placed`, perch | P1 mast deck (150, 445, y 14) and P2 spire ledge (70, 420, y 6). Each relocates after 2 shots: P1 → P3 → P1, P2 → P3 → P2 | 125 m, 128 m | 2 auditSniper | — | The duel. A 1.4 s laser, step behind the boulder, shoot back during its next aim. **Decoy use 1** |
| E3-b | section load | `placed` | Hut door (220, 431), 3 m from alarm 3. He is the runner | 135 m | 1 obama | — | The runner is the first target, or cut the cable on the hut wall |
| E3-c | `onKills(2)` of E3-a | `hidden` | Steps out of the crow's nest hatch, P4 (150, 445, y 22). Relocates P4 → P1 → P3 | 60–125 m | 1 elite auditSniper, "the Head Auditor" | 2 s | Section elite. 2.5 × HP: a body shot does not kill, a head shot does |
| E3-d | player inside 90 m with a line to it | `placed` | Rig pad at the pass end (150, 512) | 50 m from the pass mouth | 1 miningRig | — | New enemy, alone. 4 s stream, 2 s overheat with the vent open. **Decoy use 2**, or the bazooka from rack R1, or a Goo Bolt jam |
| E3-R | alarm 3 rung | `door` | Hut west door (220, 433) | 30–135 m | 3 midget, 2 riotMidget | 6 s | Shields walking at you while snipers pin you |

Quiet: three snipers, one clerk, one rig. Loud: E3-R, and the snipers get your position from the
squad (no scan needed for 20 s). `maxAlive` 5 (10). Roles: sniper, ranged, turret (+ fodder, shield:
the director holds the rig until the post is clear). Nearby: sniper box at the shrine 20 m before row
A; rack R1 and a rockets box at the pass mouth. **1.8 min.**

### E4 The Kill Zone (S2)

Space: 200 m of open snow in front of the wall, three routes (§6.2). Objective: `reach` the gate apron.

| Squad | Trigger | Method | From | Distance | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| E4-a | section load | `placed` | Bunker roofs (100, 203, y 8) and (160, 203, y 8). Open fire inside 90 m. Rig E overheats 3 s after rig W, so there is never a shared pause | 119 m from Sniper Rocks | 2 miningRig | — | Kill one to open a gap. Vent shots from Last Cover, the bazooka, or climb a bunker and take it from behind |
| E4-b | section load | `placed`, perch | Tower W (60, 203, y 12), tower E (200, 203, y 12). Relocate along the wall walk to (85, 203) and (175, 203) | 135 m | 2 auditSniper | — | Counter-sniping at the edge of range, between whiteouts |
| E4-c | section load | `placed`, air patrol | D1 loop (100, 110) → (160, 110) → (160, 160) → (100, 160); D2 loop (150, 70) → (240, 70) → (240, 170) → (150, 170); 9 m up | 40–90 m | 2 spotterDrone | — | Mix. A drone's call here also rings the wall alarm. **Decoy use 3** |
| E4-d | section load | `placed`, asleep | Trench dugout (62, 150) | 3 m off the lane | 3 midget | — | Trench route: creep past, or a loud brawl in a 3 m lane |
| E4-e | section load | `placed`, patrol | Walks (118, 150) → (112, 112) → (118, 150), 40 s loop | 20–60 m | 2 obama | — | Centre route: drop them where a rock hides the bodies from the towers |
| E4-f | section load | `placed`, tethered | Over the lake (200, 95, y 4), (225, 135, y 5) | on the lake route | 2 balloonMidget | — | Lake route: mines over cracking ice. A blast breaks tiles inside 4 m (it opens the cave tile) and is loud |
| E4-g | `onEnter` n ≥ 150 | `door` | Wall kennel (75, 198) | 50–60 m | 2 frostHound | 0 s, 1 s | Hounds under the rigs. They ignore the blizzard and the Decoy |
| E4-R | wall alarm: a searchlight holds 2 s, a drone call, or a tower sees a body | `drop`, 2 pods | 20 m north of the player, never north of n 170 | 20 m | 4 midget, 2 obama; all placed squads wake; searchlights follow the player | 5 s | Everyone awake |

Quiet: the towers and drones die one at a time, the dugout sleeps, the hounds are the only rush.
Loud: E4-R and both searchlights tracking. `maxAlive` 12. Roles: sniper and detection at range;
turret plus one route role from n 118; the hounds wait for a free role. Hazards: blizzard, cracking
ice. Nearby: sniper box at the pass gate; rockets box at Last Cover. **2.5 min.**

### E5 The two Bunkers (S2)

Space: two bunkers of 30 × 36 m, each an entry corridor, a bunk room, a stair to the roof and a
generator room. Either order. Each has a second way in: the roof hatch from the wall walk.
Objective: `destroy` both generators.

| Squad | Trigger | Method | From | Distance | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| E5-a | `onEnter` bunker W door | `placed` | Line abreast in the entry corridor (100, 210) | 10 m | 3 riotMidget | — | A phalanx in a 4 m corridor. Go round by the roof hatch, or splash, or Chain Zap the shields |
| E5-b | `onEnter` generator room W | `door` | Bunk room (108, 208) | 8–12 m | 2 midget | 1 s | Something at your back while you shoot the generator |
| E5-RW | alarm 5W (a Riot Midget is the runner) | `door` | North service door (100, 235) | 9 m | 2 midget, 1 riotMidget | 6 s | |
| E5-c | `onEnter` bunker E door | `placed` | Behind the generator-room crates (153, 221), (167, 221), (160, 219) | 18–22 m | 3 glowieAgent, one with a flashbang | — | New enemy, alone. They hold cover and peek. Look away from the flashbang. Flank through the bunk room |
| E5-d | `onKills(2)` of E5-c, or generator E at 50% | `hidden`, `door` | Supervisor from the north service door (160, 235); Boom Midgets from the bunk room (152, 208) | 8–14 m | 1 elite glowieAgent, "the Supervisor"; 2 boomMidget | 0 s, 2 s | Section elite. Bombers flush you out of cover while he shoots: the mix |
| E5-RE | alarm 5E (an Agent is the runner) | `drop`, rope | Roof hatch (170, 8, 208) | 12 m | 2 glowieAgent | 6 s | |

Quiet (cut each alarm or kill each runner): 11 enemies. Loud: 16. `maxAlive` 8. Roles: shield, fodder
/ ranged, rusher. Nearby: shells box in generator room W, bullets box in generator room E. **1.9 min.**

### E6 Frost Halls F1: Intake (S4)

Space: a slick corridor 5 × 44 m with four side rooms and a parallel service passage. Objective:
`reach` Lift A. Not a lockdown: the player can back out to the vestibule.

| Squad | Trigger | Method | From | Distance | Enemies | Delay | Teaches or tests |
|---|---|---|---|---|---|---|---|
| E6-a | `onEnter` corridor (n ≥ 14) | `placed` | Line abreast at the north end (40, 52) | 38 m | 3 riotMidget | advance at once | Shields on ice: they slide, and a bash sends you 8 m. Flank through the service passage and the lockers |
| E6-b | `onEnter` n ≥ 28 | `door` | Locker W1 (31, 22), behind the player | 6–10 m | 2 midget | 0 s | Pincer from a side door |
| E6-c | `onKills(3)` | `door` | Kennel (50, 50) | 10–25 m | 2 frostHound | 1 s | Twist: hounds do not slip, and their slick patches spread the ice into the lockers |

`maxAlive` 7. Roles: shield, fodder, tracker. Hazards: slick, cold. Nearby: rack R2 shotgun and a
shells box in the vestibule. **0.9 min** of fighting (1.3 with the walk in and Lift A).

### E7 Records Library (S4) — lockdown 2 [L]

Room and doors: §6.4. Objective: `clearAll`. The entry door drops 1 s after the player crosses n 50.
Next wave on `onRemain(2)` or 25 s after the previous wave started, whichever is first.

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | doors seal | `drop` (ropes); `door` | SP-V1 north-west vent; SP-E stairwell door | 6 midget; 2 glowieAgent | Fodder in the stacks while agents take the tables. Use the aisles |
| 2 | `onRemain(2)` or +25 s | `door`; `door`; `door` | SP-W archive door; SP-G gallery door; SP-E | 2 riotMidget; 2 auditSniper (perches: east gallery (66, 14, 44), south gallery (40, 14, 14)); 1 manaLeech | Twist on the duel: snipers 27 to 58 m away and above you, shields on the floor. The Leech taxes the Decoy. Shelves block lasers |
| 3 | `onRemain(2)` or +25 s | `drop`; `door` | SP-V2 south-east vent; SP-W | 4 midget, 2 boomMidget; 2 frostHound | Rush from two sides. The gallery is the safe place from hounds only until they take the stairs |
| 4 | `onRemain(2)` or +25 s | `drop`; `door`; `hidden` | SP-V1; SP-E; SP-C records cage | 2 midget; 1 glowieAgent; 1 elite robotShooter, "the Archivist" | Section elite. His big laser (1 s wind-up) rakes an aisle; cross aisles break it |

Totals: **25 enemies, 4 waves, 2.8 min**. `maxAlive` 12. Roles per wave: 2, 3, 3, 3. End: both doors
open, checkpoint *9 saves, a chest, an ammo crate and a mana bloom appear at the index desk, and the
records cage unlocks (Audit File 3). Anti-stall as PLAN §5.6: the last two of a wave are marked after
12 s; snipers leave their perch and come down.

## 9. New enemies

Five enemies are new to the player here. `glowieAgent`, `auditSniper` and `miningRig` are used exactly
as C §3.12 specifies them, with the level settings below. `spotterDrone` and `frostHound` (PLAN §5.3)
get full blocks. Tier-1 numbers; tier 5 multiplies HP and damage by 1.749. This level proposes no
further placeholder enemy.

| Enemy | Level settings on top of C §3.12 | Intro (alone) | Mix | Twist |
|---|---|---|---|---|
| `auditSniper` | Sight 140 m inside a visible 30° scan cone, 60 m outside it, 40 m in a whiteout. Laser 1.4 s, 35 damage, relocates after 2 shots along a written perch list. Locks onto a Decoy | E3 | E4 towers | E7 gallery, indoors at 27–58 m |
| `miningRig` | Sight 90 m all round, 40 m in a whiteout. Cannot aim at anything closer than 15 m to the wall under it. Fires at a Decoy. Goo Bolt jams it 4 s | E3 pass | E4, two with offset overheats | F1: the player mounts a captured one |
| `glowieAgent` | Squads of 3; one flashbang each squad. One agent is the alarm runner | E5 bunker E | F1 Part 2, E7 | F2, roping in beside the Drone Strikes |

### `spotterDrone` — Spotter Drone (detection)

| Field | Value |
|---|---|
| HP | 45 (tier 5: 79). Lamp: its own 20 HP part (tier 5: 35) |
| Movement | Flies a written patrol loop at 8 m/s, 8 to 9 m above the ground (4 m indoors). Turns at 90°/s. Never leaves its encounter zone |
| Sense | A searchlight cone pointing forward and down: 35 m long, 20° half-angle, ground spot about 5 m radius, 14 m ahead of the drone. Cone colour: white (searching), yellow (the player has been inside for 0.5 s), red (lock) |
| Attack | None of its own. If the player is inside the cone for 1.5 s out of any 3 s it **calls**: 3 mortar shells on the marked spot, 0.5 s apart, each with a 1.4 s ground ring, radius 3.5 m, 22 damage (tier 5: 38). Every placed squad inside 60 m wakes. In S2 the call also rings the wall alarm. In the vault the call is one extra Drone Strike instead of mortars. 10 s before it can call again |
| Counter | Stay out of the cone. Shoot the lamp (weak spot): a blind drone drifts in circles and cannot call. Decoy: the cone parks on the standee for 6 s and any call lands on the standee without waking anyone |
| Stagger | Poise 20. A hit while the cone is yellow resets the 1.5 s count |
| Affinity | Weak to shock |
| Drops | Ammo 50%, tickets 2, gun 4% |
| Hitboxes | Body sphere r 0.6; lamp sphere r 0.25 under it (`weak`) |
| Look | Box body 1.0 × 0.4 × 1.0 (`metal`); cone lamp r 0.3 h 0.5 under it (`neon` yellow); 4 disc rotors r 0.35 at the corners; a see-through cone for the beam (render only) |
| Time estimate | 8 s |

### `frostHound` — Frost Hound (tracker)

| Field | Value |
|---|---|
| HP | 55 (tier 5: 96) |
| Movement | Trots at 5 m/s, runs at 9.5 m/s. Follows the player's **trail** (a breadcrumb every 2 m, last 60 m), so walls, weather, camo-like tricks and the Decoy do not shake it. Does not slip on `slick` |
| Sense | Scent: knows the player inside 45 m without a line of sight. Barking wakes sleepers inside 12 m |
| Attack | At 9 m it crouches for 0.5 s (growl, eyes flash), then lunges 9 m in a straight line at 20 m/s: 16 damage (tier 5: 28) and knockback 6. Where it lands it leaves a slick patch, radius 2.5 m, for 6 s. Recovers for 0.9 s |
| Counter | Shotgun on the crouch or the landing. A stagger during the crouch cancels the lunge. Sidestep: the lunge does not turn. Yeet reverses a lunge in flight |
| Stagger | Poise 30 |
| Affinity | Weak to fire |
| Drops | Ammo 40%, health 8%, tickets 2, gun 3% |
| Hitboxes | Body capsule r 0.5, length 1.2 along its facing, 0.3 to 0.9 m up; head sphere r 0.28 at the front (`weak`) |
| Look | Box body 1.2 × 0.5 × 0.6 (`ice` blue); box head 0.45 cube; 4 cylinder legs r 0.1 h 0.5; cone tail; 2 small `neon` sphere eyes |
| Time estimate | 5 s |
| Elite "Alpha" (F1) | 2.5 × HP, lunges twice in a row, patch radius 3.5 m |

## 10. Finale

Two stages, both lockdowns, with Frost Halls between them.

### F1 "The Abominable Auditor" — mini-boss, lockdown 1 [L], 2 min 40 s

`monster` (BLUE MONSTER) with its Wave Mode data untouched: 3,800 HP (6,646 at tier 5), radius 2.4,
7 m tall, contact 18, melee 50 (0.75 s wind-up), volley 5 shots × 2 fans at 12, 3 homing missiles at
34, charge 24 m/s at 40, slam ring at 30 (jump it). Tier 5 multiplies damage by 1.749. The part
script adds three ice plates, an intermission and an arena shift, and replaces the data's random
`summon` and its automatic phase-2 grunts with the written adds below. He starts frozen in a block on
the Ice Machine and breaks out 2 s after the arena door drops.

**Ice plates** (destroyable parts; a hit on a plate damages the plate, not the boss)

| Plate | Covers | HP (tier 5) | While it is on |
|---|---|---|---|
| Brow | The head weak spot, sphere r 1.0 at y 6.5 | 250 (437) | The head cannot be hit. A small target: the sniper's job |
| Chest | The front of the body | 400 (700) | Body hits from the front 180° do 10% (the existing `shield` zone rule) |
| Back | The rear of the body | 400 (700) | Body hits from behind do 10% |

| Part | Boss HP | Attacks | Adds (exact) | Arena | Ends when |
|---|---|---|---|---|---|
| **1. Frozen Assets** (60 s) | 100% → 50%: 1,900 (3,323) | Phase-1 pattern from the data: chase, volley, missiles, chase, charge, slam. A charge that hits a pillar or a wall stuns him 2 s (weak-spot hits × 1.5) | t+20 s: 4 midget, `door` SP-W. t+45 s: 4 midget, `door` SP-E | 4 ice pillars; each breaks after 2 charge hits. Gallery and emplacement open | Boss HP reaches 50%. Any plate left stays on |
| **2. Cold Storage** (40 s, intermission) | Invulnerable inside an ice dome on the dais | 3 homing missiles every 8 s from the dome | t+0: 3 glowieAgent rope down at SP-N beside the generators (one flashbang). t+18 s: 3 midget from SP-W and 2 boomMidget from SP-E | **Cold aura** on the whole courtyard floor below y 3: no shield regen and 3 damage/s. The galleries are above it. Two generators (500 HP, core × 2) on the north gallery corners power it | Both generators are destroyed. The dome and any plates left shatter and he is stunned 4 s on the dais |
| **3. Final Notice** (60 s) | 50% → 0: 1,900 (3,323) | Phase-2 pattern: chase, missiles, volley, charge, slam (speed × 1.25). Below 20%: missiles ×4, volley 3 fans, two slam rings, speed × 1.45 | `onBossHp(35%)`: 5 midget, 3 from SP-W and 2 from SP-E. `onBossHp(20%)`: 1 elite frostHound "Alpha" and 2 frostHound from SP-K | **Arena shift:** the centre 30 × 30 m (x 35–65, n 44–74) is `slick` and the 26 × 26 m ice floor cracks under anyone, him included. If he is on a tile when it falls he drops into the basin and is stunned 2 s. His charges slide on the ice and always reach a wall | Boss HP 0. Adds still alive freeze and shatter 2 s later |

Totals: **24 adds + the Auditor = 25 enemies**, never more than 8 adds alive. Hazards: cold (Part 2),
then slick and cracking ice (Part 3). The section elite is the Alpha hound.

How the level taught each part: plates are the sniper's small-target work from E1 to E4. Generators
are E5's, and reaching them means using the gallery or shooting 73 m from the emplacement. Cracking
ice is the lake in E4, and slick ice is the creek in E2.

Every part works with a plain machine gun: plates take any damage, the emplacement has no ammo, and
the generators can be reached on foot in 12 s by the gallery stairs. This fight is not in the hub's
canonical boss table, so no `SB` section is needed.

When the lockdown ends: both doors open, checkpoint *7 saves, and on the dais appear the lockdown
chest, the mini-boss's two guns, an ammo crate and two health packs (§12).

### F2 The vault hold — lockdown 3 [L], 2 min 26 s

The blast door drops 1 s after the player crosses n 46. Holding Interact for 1.5 s on the safe starts
the drill and wave 1. **Objective:** every wave dead (`clearAll`) **and** the drill at 100%.

| Rule | Value |
|---|---|
| Drill | Needs 90 s. It runs only while the player or a Sproto Swarm buddy stands in the ring (r 9 m). Enemies in the ring do not stop it |
| If the waves die first | The drill runs at × 3 until it is done |
| Drill at 100% | The safe vents coolant: every enemy alive is frozen for 6 s and takes double damage |
| Drone Strike | Glowie's power as a level hazard (B §3.4): a reticle of radius 2.6 m tracks the player for 1.8 s, locks for 0.75 s, then hits. 30 damage to the player, 120 to enemies. It follows a Decoy placed while it is tracking |
| Coolant pulses | The four grates become `cold` zones (r 3 m, no shield regen) for 8 s |
| Next wave | The time below, or earlier on `onRemain(2)` (PLAN §5.6). The strike clock never moves |

| Time (latest) | Event |
|---|---|
| t+0 | Drill starts. **Wave 1:** 6 midget, `drop`, hatch A (south-west) |
| t+8 | Drone Strike 1 |
| t+22 | Drone Strike 2 |
| t+25 | **Wave 2:** 3 glowieAgent, `drop` by rope, hatch B (south-east), flashbang at +6 s; 2 boomMidget, `drop`, hatch C (north-west) |
| t+30 | Coolant pulse 1 |
| t+36 | Drone Strike 3 |
| t+50 | Drone Strike 4. **Wave 3:** 1 spotterDrone, `air`, through the iris; 4 midget, `drop`, hatch D (north-east); 2 frostHound, `door`, guard door (west) |
| t+60 | Coolant pulse 2 |
| t+64 | Drone Strike 5 |
| t+75 | **Wave 4:** 4 midget, `drop`, hatch A; 2 boomMidget, `drop`, hatch C |
| t+78 | Drone Strike 6 |
| t+90 | Coolant pulse 3. Earliest moment the drill can finish |
| t+92 | Drone Strike 7 |
| t+100 | **Wave 5:** 1 elite riotMidget, "the Vault Warden", `door`, guard door |
| t+106 and every 14 s | Drone Strikes continue until the room is clear |

Totals: **25 enemies, 5 waves** (14 midget, 4 boomMidget, 3 glowieAgent, 2 frostHound, 1
spotterDrone, 1 elite riotMidget). `maxAlive` 12. Hazards: Drone Strike and cold. Twists: the
Spotter Drone's call here is an extra Drone Strike with no tracking time; strikes kill enemies, so
standing behind the Warden's shield when the reticle locks solves him.

When the lockdown ends: both doors open, the last checkpoint saves, the safe opens (Interact to take
the ledgers), and a chest and an ammo crate rise beside it. The player walks 20 m of gantry to the pad.

## 11. Mechanisms, magic and explosives used

| Mechanism | Where | New here? | Numbers |
|---|---|---|---|
| `searchlight` | S1 practice light; S2 lights W and E | **New** | Beam 120 m, spot r 6 m, sweeps a written arc in 8 s. Holds the player 2 s: alarm. Lamp 30 HP. Locks onto a Decoy for 6 s. 40 m in a whiteout |
| `alarm` | 1 (E1), 3 (E3), 4 (wall), 5W, 5E (bunkers) | **New** | Box 40 HP, cable 20 HP, runner needs 1.5 s, squad arrives 6 s after the siren (§2) |
| Blizzard (`weather`) | S2 | **New** | 20 s whiteout every 90 s, 4 s warning (wind, HUD countdown). Player view and all enemy sight capped at 40 m. Hounds unaffected |
| `hazardZone slick` | S1 creek, S4 corridor, F1 Part 3, hound patches | New to the level | Friction × 0.15 (C §3.9) |
| `crackTiles` | S2 lake, F1 Part 3 | **New** | Falls 1 s after a step, 0.5 s crack telegraph, back in 20 s. Explosions inside 4 m break tiles at once |
| `hazardZone cold` | S4 lockers, F1 Part 2 aura, F2 grates | **New** | Shield regen × 0.5 in the lockers; the aura and the grates stop regen and the aura adds 3 damage/s |
| `target` generator, shield gate | S2 (2), F1 Part 2 (2) | **New** | 500 HP, core weak spot × 2. Both down: the gate drops |
| `emplacement` Captured Mining Rig | S3 south gallery | **New** | 120° arc, the rig's own gun (8 shots/s, 3 damage at tier 1), no ammo, overheats after 4 s for 2 s |
| `mover` lifts | S1 mast lift, S4 Lift A, freight lift | Returning | 2 m/s; the freight ride is 15 s |
| `lockdown` | F1, E7, F2 | PLAN §5.6 | Door slabs 0.6 m with `neon` trim, threshold disc 6 m inside |
| `hold` ring | F2 | Returning (L01) | 90 s, not paused by enemies |
| Drone Strike emitter | F2 | **New** (Glowie's power without Glowie) | r 2.6 m, track 1.8 s, lock 0.75 s, every 14 s |
| `depot`, `cache`, `rack`, `door`, `switch`, kill zone with rescue | all | Returning | — |

Magic: the **Decoy shrine** (new spell, §3); a `manaBloom` in the library reward. No conduit, plate
or fragile wall is needed. Explosives: one fire `barrel` (E1). Balloon Midgets act as mines over the
lake. The bazooka is for the three rigs and is optional every time.

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

**Checkpoints** (times are the §4 estimate with no alarm)

| # | Where (section, position) | Saves when | At | Ammo next to it |
|---|---|---|---|---|
| start | S1 pod (150, 0, 19) | level start | 0:00 | — |
| *1 | S1 camp (163, 0, 174) | E1 cleared | 1:37 | bullets box |
| *2 | S1 shrine (150, 0, 300) | shrine used | 2:39 | sniper box |
| *3 | S1 pass gate (150, 0, 516) | E3 cleared | 4:37 | sniper box |
| *4 | S2 Last Cover (130, 0, 157) | both tower snipers dead, or the player reaches the apron by another route | 6:12 | rockets box |
| *5 | S2, the generator room just cleared | first generator destroyed | 7:59 | shells or bullets box |
| *6 | S3 gate passage (50, 0, 18), outside the arena door | leaving depot 1 | 9:56 | depot crate |
| *7 | S3 dais | lockdown 1 ends | 12:36 | reward crate |
| *8 | S4 F2 lobby (40, 7, 64), outside the library door | Lift A arrives | 13:54 | shells box |
| *9 | S4 index desk | lockdown 2 ends | 16:40 | reward crate |
| *10 | S5 antechamber (40, 0, 34), outside the blast door | leaving depot 2 | 17:51 | bullets box |

Lockdown 3 saves again when it ends (20:17), 12 s before the level does. Longest gaps: 2 min 40 s and
2 min 46 s across lockdowns 1 and 2, which PLAN §5.6 restarts from wave 1; every other gap is under
2 min 30 s.

**Depots** (PLAN §7.7: depot crate, health station, spell loadout bench, ticket shop terminal, checkpoint)

| Depot | Room | Crate | Health station | Loadout bench | Shop terminal |
|---|---|---|---|---|---|
| D1 | S3 `room(28–45, 2–20)` | (33, 0, 6) | (33, 0, 16) | (41, 0, 6) | (41, 0, 16) |
| D2 | S5 armory `room(28–52, 9–25)` | (33, 0, 17) | (33, 0, 21) | (47, 0, 21) | (47, 0, 17) |

**Placed weapons** (base tier Uncommon, `reliable`, no element, gun level 5)

| Id | Gun | Position | Why |
|---|---|---|---|
| C1 (cache) | Sniper, magazine full | S1 (156, 0.6, 54) | E1, E3, E4: every long shot in the quiet half |
| R1 (rack) | Bazooka | S1 (146, 0, 462) | The rig in the pass and the two wall rigs |
| R2 (rack) | Shotgun | S4 (34, 0, 6) | E6 corridor, Frost Hounds, the Library |

**Loot table**

| Tier odds for enemy drops (PLAN §7.3, L05) | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Percent | 20 | 42 | 30 | 7 | 1 |

| Guaranteed drop | Where it lands | What |
|---|---|---|
| Elite 1: the Head Auditor (E3) | Falls from the crow's nest to the mast foot, S1 (150, 0, 448) | 1 gun, rolled one tier step up |
| Elite 2: the Supervisor (E5) | S2 generator room E | 1 gun, one step up |
| Elite 3: Alpha hound (F1) | S3 courtyard, where it dies | 1 gun, one step up |
| Elite 4: the Archivist (E7) | S4 library floor | 1 gun, one step up |
| Elite 5: the Vault Warden (F2) | S5 vault | 1 gun, one step up |
| Lockdown 1 chest | S3 dais (50, 0.6, 63) | 1 gun, Uncommon or better, a type the player does not carry if possible |
| Mini-boss: the Auditor | S3 dais | 2 guns, one of them Rare or better. No boss gun (mini-boss) |
| Lockdown 2 chest | S4 index desk (42, 7, 34) | 1 gun, Uncommon or better |
| Lockdown 3 chest | S5 beside the safe (40, 0, 66) | 1 gun, Uncommon or better. Carried into L06 |
| Secret weapon cache | S1 spire, an alcove behind the P2 ledge (70, 6, 424), seen only from the ledge | 1 sniper at the level's best tier (Legendary, the top of the L05 row) |

Random gun drops on top: about 6 in a run (154 enemies at 2% to 10%).

**Ammo boxes** (small, one type: sniper 8, bullets 60, shells 12, rockets 3)

| Id | Type | Position | Reason (PLAN §7.4) |
|---|---|---|---|
| AB1 | Sniper | S1 (154, 0, 56), by cache C1 | Rack rule; 18 m before E1 |
| AB2 | Bullets | S1 (163, 0, 174), in the snowcat's lee | Checkpoint *1 |
| AB3 | Sniper | S1 (120, 2.5, 186), on the lookout deck | On a tower you cleared |
| AB4 | Sniper | S1 (153, 0, 300), at the shrine | Checkpoint *2; 20 m before E3 |
| AB5 | Sniper | S1 (150, 14, 445), mast deck P1 | On a tower you cleared |
| AB6 | Sniper | S1 (225, 4, 432), hut roof P3 | On a tower you cleared |
| AB7 | Rockets | S1 (154, 0, 463) | Rack R1; 50 m before the pass rig (the rig is the encounter; the box is at its start) |
| AB8 | Sniper | S1 (150, 0, 516), pass gate | Checkpoint *3; start of E4 |
| AB9 | Bullets | S2 (62, 0, 150), trench dugout | Trench route |
| AB10 | Sniper | S2 (232, 0, 100), fishing hut 2 | Lake route only |
| AB11 | Rockets | S2 (130, 0, 157), Last Cover | Checkpoint *4; the wall rigs |
| AB12 | Sniper | S2 (60, 12, 203), tower W cabin | On a tower you cleared |
| AB13 | Shells | S2 (93, 0, 230), generator room W | Checkpoint *5 |
| AB14 | Bullets | S2 (167, 0, 230), generator room E | Checkpoint *5 |
| AB15 | Sniper | S3 (50, 5, 92), north gallery | Inside lockdown 1, across the yard |
| AB16 | Bullets | S3 (46, 5, 26), by the emplacement | Inside lockdown 1 |
| AB17 | Shells | S4 (46, 0, 6), vestibule | Rack R2; before E6 |
| AB18 | Shells | S4 (44, 7, 64), F2 lobby | Checkpoint *8; before E7 |
| AB19 | Shells | S4 (38, 7, 36), index desk | Inside lockdown 2 |
| AB20 | Sniper | S4 (14, 14, 20), west gallery | Inside lockdown 2, on the gallery |
| AB21 | Bullets | S5 (42, 0, 32), antechamber | Checkpoint *10 |
| AB22 | Bullets | S5 (60, 0, 62), vault east wall | Inside lockdown 3 |
| AB23 | Shells | S5 (40, 0, 80), vault north side | Inside lockdown 3 |

23 boxes: 10 sniper, 6 bullets, 5 shells, 2 rockets.

**Ammo crates** (every carried type to 50% of cap, three uses): **AC1** S3 dais, **AC2** S4 index desk,
**AC3** S5 beside the safe. Each is part of a lockdown reward. There is no crate in the quiet half on
purpose. **Depot crates** (unlimited): D1 and D2.

**Ammo budget: sniper rounds** (cap 36, box 8, enemy drop 5)

| Quiet half | Shots the encounter asks for | Why |
|---|---|---|
| E1 | 8 | 5 Midgets, 2 Obamas, the alarm box |
| E2 | 4 | Drone lamp, drone, 2 sleepers |
| E3 | 11 | 2 snipers at 2 shots each, the elite 3, the clerk 1, the cable 1, the rig's vent 2 |
| E4 | 19 | 2 tower snipers 4, 2 drones 4, 2 rig vents 4, patrol 2, mines 2, 2 searchlight lamps 2, a cable 1 |
| E5 | 2 | Indoors, the sniper is a spare |
| **Asked** | **44** | |

| Supply in the quiet half | Rounds |
|---|---|
| Cache C1 magazine | 4 |
| Boxes on every route: AB1, AB3, AB4, AB5, AB6, AB8, AB12 | 56 |
| Expected enemy drops | 20 |
| **Total** | **80 = 1.82 × asked** |

Boxes alone are 60 rounds, 1.36 × asked, so drops matter. The drop estimate counts only kills made
inside pick-up reach, because a pack is gone after 30 s and nobody runs 90 m to a body in that time:
about 24 close kills × 50% ammo chance × one third going to sniper rounds (smart drops) × 5 = 20.
The lake route adds AB10 (+8). Stock runs like this for a player who arrives with no sniper rounds:
12 at the ridge, 4 after E1, 12 at the lookout, 16 at the shrine, 5 at the worst moment of the E3
duel, 29 at the pass gate, 10 after E4, 18 on tower W, then depot 1 refills to 36 before the
Auditor. The loud half asks about 24 more (brow plate 3, generators 6, head shots 8, library
snipers 4, spare 3) and has depot 1, AB15, AC1, AB20, AC2 and depot 2.

**Power-ups:** Overshield in fishing hut 4, S2 (238, 0, 150), the reward for the lake route;
Overshield on the courtyard's north gallery, S3 (50, 5, 90).

**Secrets**

| Secret | Where | How |
|---|---|---|
| Golden Bonk: **Tax Season** (enemies +25% HP, tickets × 2) | S2 ice cave under the lake (212, -4, 126) | Step on tile G in band 2, or pop the second Balloon Midget over it. A gold glow shows under the ice from hut 3's door. The ramp leads back up into hut 3 |
| **Mana Battery** (+10 max mana, +0.5 mana/s) | S4 F1, cold locker W2 (31, 0.5, 47), behind a pallet stack | Found by players who flank the riot line through the lockers. It hums inside 6 m |
| Secret weapon cache | S1 spire alcove (70, 6, 424) | Climb the ramp behind the spire after E3 |
| Audit File 1 | S1 crow's nest (150, 22, 445) | Ride the mast lift to the top |
| Audit File 2 | S2 tower W cabin (60, 12, 203) | From bunker W's roof walk 40 m west along the wall |
| Audit File 3 | S4 records cage (17, 7, 17) | The cage unlocks when lockdown 2 ends |

## 13. Difficulty

**Harder than L04** (same pressure row: `maxAlive` 12, 4 roles, 1 elite per section, 2 hazard kinds):

- Tier 5: enemy HP and damage × 1.15 over L04.
- The first enemies that hurt from beyond the player's comfortable range: a 35-damage sniper shot and a turret with a 90 m reach.
- The first level where being seen has a cost that lasts (alarms, mortar calls, searchlights that follow).
- Finite sniper ammo placed forward of the player (§12), so missing has a price.
- Three lockdowns, where L04 had fights you could fly away from, and no jetpack.
- Five elites, each with a second trick (relocating sniper, flashbang supervisor, double-lunge hound, aisle-raking laser, shield you beat with a Drone Strike).

| Setting | Easy | Normal | Heroic |
|---|---|---|---|
| Sniper laser | 1.8 s | 1.4 s | 1.1 s |
| Searchlight hold / drone hold | 3 s / 2.5 s | 2 s / 1.5 s | 1.2 s / 1.0 s |
| Alarm squads | 2 fewer each | as written | 2 more each, one of them elite |
| Whiteout | 30 s of every 90 | 20 s | 15 s |
| Rig overheat | 3 s | 2 s | 2 s, and a third rig above the gate |
| Hounds per squad | 1 | 2 | 3 |
| Sniper boxes | 12 rounds | 8 | 8, and AB4 and AB8 are removed |
| Auditor | plates −30% HP, 1 generator | as written | plates +30% HP, 3 generators, Part 2 missiles every 5 s |
| Lockdown waves | 20% fewer fodder | as written | next wave at `onRemain(4)` |
| Vault | drill 70 s, strike every 18 s | 90 s, 14 s | 110 s, 10 s, in pairs after t+60 |

## 14. Engine needs

Uses **E1** (collision, including volumes below section ground: lake bed, cave, courtyard basin),
**E2** (perception, line of sight to 150 m), **E3** (nav, lifts as nav links, flyer patrols),
**E4** (squads, triggers, `reach`, `clearAll`, `destroy`, `hold`, lockdowns), **E5** (terrain, new
primitives, 150 m draw distance, fog), **E6** (door, switch, barrel, mover, hazard zones, crack
tiles, emplacement, depot, target, searchlight, alarm, lockdown), **E7** (`auditSniper`,
`glowieAgent`, `miningRig`, `riotMidget`, `boomMidget`, `sewerMidget`, `balloonMidget`), **E8**
(`spotterDrone`, `frostHound`, `manaLeech`), **E10** (Decoy, shrine, mana bloom), **E11** (barrel),
**E12** (`monster` in a walled arena with a part script), **E13** (depots, checkpoints, boss bar with
part pips, timers), **E14**, **E15**, **E16**, **E17** (tier odds, guaranteed drops, ammo boxes and
crates, smart drops).

Needed and not in PLAN §10:

| # | Need | Why |
|---|---|---|
| N1 | Per-enemy sight profile in data (range, cone, scan sweep) and a weather cap on it; placed squads pre-spawned at section load | C §3.8 gives snipers 60 m and pre-spawns at 70 m. The duels here are at 125 to 135 m |
| N2 | `weather` mechanism: timed blizzard with fog distance, perception cap, HUD countdown | C §3.9 has only render-only `dark` |
| N3 | Stealth-lite hooks: forced crit for sniper hits on unaware targets, body discovery, the alarm runner, alarm box and cable as shootable targets (a cable is thinner than the 0.5 m solid minimum, so it is a non-solid line target) | PLAN §8 names `alarm` without a spec; §2 of this file is the spec |
| N4 | Destroyable parts on a boss body (plates as hit zones with their own HP), and a way to switch off `summonGrunts` and the `summon` action for a wave boss in a part script | `src/sim/bosses.js` summons 10 Midgets at phase 2 on tier 5 or higher |
| N5 | A Duel power run as a level hazard without its boss (the Drone Strike emitter) | F2 |
| N6 | A lockdown whose end also needs a `hold` at 100%, and whose waves have a fixed latest time | F2 |
| N7 | Decoy: Mining Rigs and searchlights also lock onto the standee; Frost Hounds ignore it; a tracking Drone Strike follows it; cast range 20 m | PLAN §6.2 lists snipers and Spotter Drones only |
| N8 | Enemy ammo packs from kills beyond 40 m last 120 s instead of 30 s (optional) | Otherwise sniping forfeits its drops; the budget in §12 already assumes they are lost |

## 15. Bot route and tests

**Bot route** (god mode, nav-following, fixed seed):

1. S1: take C1 → ridge slot 3 → `snipe` E1-b runner, E1-b second, E1-a × 5 → walk to the camp, shoot the mounds on `burrowWarn` → wait for the drone to pass x 150 heading east → cross the bridge → turn and shoot both hounds on `enemyTelegraph` → shrine → cast Decoy at the practice light.
2. Row A: cast Decoy 10 m east, `snipe` P1 while it aims at the standee, then P2, then the elite → walk to the hut, kill the clerk → pass mouth: take R1, cast Decoy at 85 m from the rig, `snipe` the vent → gate.
3. S2: wait out the first whiteout at the pass mouth → Sniper Rocks: `snipe` tower W, tower E, both drone lamps → centre route to Last Cover during the next whiteout → Decoy, vent shot on rig W, then rig E → apron → hounds → bunker W (roof hatch route), generator → wall walk → bunker E, generator → gate.
4. S3: depot (refill) → arena door → Part 1 from the south gallery: brow plate, head → Part 2: emplacement on both generators → Part 3: stay on the gallery, shoot during stuns.
5. S4: R2 → service passage → locker W2 → corridor behind the riot line → Lift A → library: hold the north-west stair top → exit door → freight lift.
6. S5: depot → blast door → start the drill → circle inside the ring, step out of each reticle → take the ledgers → pad.

**Tests** (`tests/levels/L05.test.js`)

| Test | Checks |
|---|---|
| Validator | Solids, thickness, reachability from every checkpoint; S1 to S5 under 600 solids each |
| Pacing estimate | 1,229 s without alarms, 1,276 s with 2 of 6; inside 1,080 to 1,320 |
| Enemy count | 128 scripted, 26 conditional; no more than 12 alive at any tick of the bot run |
| Sneak crit | A sniper hit on an idle Obama is a crit and kills; the same hit on an alert one is not forced |
| Alarm | Runner reaches the box: squad after 6 s. Box or cable destroyed first: no squad |
| Perception | Audit Sniper sees at 140 m in its cone and at 40 m in a whiteout; Frost Hound finds the player with no line of sight |
| Decoy | Sniper, rig, searchlight and drone target the standee for 6 s; a hound does not |
| Rig | Overheats after 4 s of fire; a vent hit during overheat does × 2.5 or more; cannot hit a target 10 m from the wall base |
| Lockdowns | Each seals 1 s after the threshold, cannot be left, restarts at wave 1 after a death, and opens with a chest and a crate; wave counts are 25, 25 and 25 |
| Auditor | Part changes at 50%, on both generators, at 0; no `summonGrunts` call; a charge into a pillar stuns |
| Vault | Strike times match §10; the drill needs 90 s in the ring; the exit opens only with all waves dead and the drill done |
| Ammo | 23 boxes and 3 crates exist at the listed positions; sniper supply in S1 + S2 is at least 1.5 × 44 |
| Determinism | The bot run's state hash is the same twice for one seed |

## 16. Build tasks

Owner: the L05 agent, branch `<agent>/campaign-l05`, files under `src/data/levels/L05/` and `src/data/levels/prefabs/glacier.js`.

1. `prefabs/glacier.js`: the 13 prefabs in §7 and the `room` helper (ask the kit owner if `room` belongs in `kit.js`).
2. `L05/index.js`: header (stage `glacier`, tier 5, par 1,200 s, no jetpack, `maxAlive` 12), section order S1 to S5, the five section origins.
3. `L05/S1.js` blockout from §6.1; run the validator and the map export; walk it with the debug fly camera and check the five sightline lengths.
4. `L05/S2.js` blockout from §6.2, the lake basin, the three routes, the wall and both bunkers; check the 135 m and 119 m lines from Sniper Rocks.
5. `L05/S3.js`, `S4.js`, `S5.js` blockouts; check each lockdown room's size, doors, thresholds and spawn markers.
6. Mechanisms: alarms 1, 3, 4, 5W, 5E with cables; searchlights; the blizzard clock; crack tiles; cold and slick zones; generators and the shield gate; three lifts; the emplacement; both depots.
7. Encounters E1 to E5 with their squads, runners and alarm squads (§8). Tune perches and patrol loops.
8. Encounter E6 and lockdown E7 (wave table in §8).
9. F1: the Auditor's part script, plates, Part 2 dome and aura, Part 3 floor (§10). Needs E12 and N4.
10. F2: the vault lockdown, drill, strike clock and coolant pulses (§10). Needs N5 and N6.
11. Pick-ups: C1, R1, R2, 23 ammo boxes, 3 crates, 2 Overshields, the loot table entries, the secret cache, Golden Bonk, Mana Battery, 3 Audit Files (§12).
12. Checkpoints *1 to *10, cutscene cards, objective text, HUD timers (whiteout, drill).
13. `tests/levels/L05.test.js` (§15) and the bot route; fix until the pacing estimate and the bot run pass.
14. Easy and Heroic tables (§13). Then the checks in `AGENTS.md`, the map export in the PR, and a note of any pin that moved (the Decoy spell and finite ammo move the campaign fingerprint through E10 and E17, not through this level's data).
