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
