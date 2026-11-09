# L08: Government Office

Status: **plan only.** Follows `docs/campaign/PLAN.md` §14. Replaces "L8: Government Office" in
`docs/codex/C-level-designs.md`. Engine ids (E1 to E15) are PLAN §10; **C §x** is
`docs/codex/C-campaign-levels.md`; **B §x** is `docs/codex/C-bosses-sproto-duel.md`.

## 1. Header

| Field | Value |
|---|---|
| Id, name | `L08`, Government Office |
| Stage, lighting | `office`: cold fluorescent interiors, glass and steel; one dark floor (S4); roof at night with the LA skyline and the void rift on the horizon |
| Tier | 8 (enemy HP and damage × 1.15⁷ = 2.66) |
| Par | 20 min. Budget in §4 sums to **21 min 32 s** |
| Jetpack | No |
| Enemy total | **217** = 201 scripted + 16 alarm reinforcements that come only if an alarm runs out (§8.12) |
| Route length | about **1,150 m** (S1 258, S2 206, S3 239, S4 210, S5 175, SB 60) |
| Sections | 6: `S1` Lobby and Cubicle Farm, `S2` Security Vault, `S3` Atrium, `S4` Server Floor, `S5` Executive Floor, `SB` The Roof |
| Lockdown arenas (PLAN §5.6) | 3: **[L1]** Cubicle Farm (S1), **[L2]** Atrium (S3), **[L3]** the roof arena (SB) |
| Checkpoints, depots | 10 checkpoints, 2 depots (Mail Room in S3, Executive Lounge in S5) |
| Finale | **Boss: Glowie**, 5 parts, 4 min 45 s, in `SB` / `SB-BOSS`. Reward spell: Lock-On |
| Pressure rules | `maxAlive` 14, at most 5 threat roles at once, 2 elites per section, 2 hazard kinds overlapping |

## 2. Concept

Glowie's tower. Nine storeys climbed room by room. Every room is a small tactical problem: a squad
behind cover with one flashbang carrier, a drone that shields one of them from bullets, and a
Nullifier Agent whose field switches your spells off. The player reads the room, picks the target
that unlocks the others, and changes tool: guns into a null field, spells at a shielded squad.
L03 said "cast at everything". L08 says "check first whether you are allowed to cast".

How it differs from the other levels:

- **Interiors only.** Sightlines are 10 to 40 m. Cover is furniture: 1.35 m cubicle walls you can
  jump or shoot over, desks, server racks, glass that stops bullets but not Blink.
- **Anti-magic.** Five rooms have a static `nullZone`, and six Nullifier Agents carry a mobile one.
  Each static field has a visible emitter and a way to turn it off (§11.2).
- **Timers.** Laser grids cycle, alarms count down, the lift stalls, the download takes 75 s.
- **Three lockdowns.** Security shutters drop in the Cubicle Farm, the Atrium and on the roof, and
  open only when every wave is dead.
- **One spell that breaks the building's rules:** Blink goes through lasers, glass and gaps. It does
  not go through walls, closed doors or lockdown shutters.

Cutscene card: **GOVERNMENT OFFICE** / "Glowie has a badge and a flashbang." / "The last key is on
the roof. Your spells are not cleared for this building." / "Look away."

Vista: floor-to-ceiling glass on the west and south faces from F1 up. The void rift grows on the
horizon as the player climbs.

## 3. What the player has and learns

| Item | Detail |
|---|---|
| Guns expected | Carried loadout from L07. World racks (tier 8, common): **MG** at the lobby security desk, **shotgun** in the break room, **sniper** at the atrium kiosk, **bazooka** and a spare **MG** standee inside `SB` |
| Spells held on arrival (11) | Goo Bolt, Chain Zap, Yeet, Sproto Swarm, Mana Shield, Decoy, Meteor Bonk, Yoink, Magic Carpet, Pump It, Vape Cloud |
| New spell | **Blink** ("Tax Evasion"): 25 mana, 4 s cooldown, teleport 9 m along the aim, 0.3 s invulnerable. Shrine in the vault, S2 (58, 0, 43), checkpoint CP3, at about 6 min |
| Reward spell | **Lock-On**, from Glowie |
| New enemies | `nullifier` (S1-E1, alone), `shieldDrone` (S1-E2 wave 3), `cabinetMimic` (S2-E4, alone) |
| New mechanisms | Laser grids, alarms with reinforcements here, revolving doors, pneumatic tubes, a fight on a moving lift, sprinkler slick, `nullZone`, the halon purge |

**Blink has three clear uses**, each taught on the critical path and each with a slower way round:

| # | Use | First place | Later places | Way round without Blink |
|---|---|---|---|---|
| 1 | **Through laser grids** | Vault exit grid G5 (always on), straight after the shrine | G7 in front of breaker 2 (S4), the laser-hall grids on a replay | G5: none needed, the player always has Blink there. G7: wait for the 1.5 s off window |
| 2 | **Across gaps and glass rails** | The 7 m gap in the y 5 bridge (S3), once the null dish NZ-3 is shot | Balcony to balcony, onto the lift from a ring | Walk round the north ring through timed grid G6 (+40 m) |
| 3 | **Through glass partitions to flank or reach a switch** | Glass offices in S5: get behind a shielded Agent, reach alarm AL4 | AV closet switch SW-5 in the boardroom; Audit File 2 behind G5b | Use the office door; shoot both projectors instead of SW-5 |

What Blink does **not** do, shown on the shrine's board and proved by a dummy shutter next to it:
it does not pass walls, closed doors or a locked **lockdown shutter** (the cast fizzles and the mana
comes back), and it cannot start or end inside a null field.

## 4. Time budget

Seconds per enemy are PLAN §3. New enemies: `nullifier` **8** (support row), `shieldDrone` **5**
(flyer row), `cabinetMimic` **5**. An elite counts twice. Combat beats are enemy sum × 1.3.
The ride, the hold and the boss are stated times (PLAN §3 "hold, ride: stated per beat").

| # | Beat | Arithmetic | s | Clock |
|---|---|---|---|---|
| 1 | Plaza walk-in | 11 m ÷ 5.5 | 2 | 0:02 |
| 2 | **S1-E1** Lobby | (3 Agents 18 + Riot 8 + 3 Midgets 9 + Nullifier 8 + 2 Midgets 6 + 2 Laser Bots 12 = 61) × 1.3 | 79 | 1:21 |
| 3 | Reception switch, escalator, to the farm shutter | 1.5 + 69 m ÷ 5.5 | 14 | 1:35 |
| 4 | **[L1] S1-E2** Cubicle Farm lockdown | (18 Midgets 54 + 2 elite +6 + 4 Boom 12 + 3 Agents 18 + Drone 5 = 95) × 1.3 | 124 | 3:39 |
| 5 | Break room, copy room, stair B | 70 m ÷ 5.5 | 13 | 3:52 |
| 6 | S2 landing to the checkpoint room | 15 m ÷ 5.5 | 3 | 3:55 |
| 7 | **S2-E3** Checkpoint and Laser Hall | (2 Laser Bots 12 + 3 Agents 18 + 2 Riot 16 + Nullifier 8 = 54) × 1.3 | 70 | 5:05 |
| 8 | Laser hall crossing | 3 timed grids, stated | 15 | 5:20 |
| 9 | **S2-E4** Evidence Lockers | (2 Mimics 10 + 4 Sewer 12 + 2 elite +6 + 2 Laser Bots 12 = 40) × 1.3 | 52 | 6:12 |
| 10 | Keycard, vault walk, Blink shrine | 1.5 + 45 m ÷ 5.5 + 15 tutorial | 25 | 6:37 |
| 11 | Tube room and tube T1 | 55 m ÷ 5.5 | 10 | 6:47 |
| 12 | Depot 1, Mail Room | breather | 45 | 7:32 |
| 13 | **[L2] S3-E5** Atrium lockdown | (2 Snipers 16 + 3 Agents 18 + 8 Midgets 24 + 2 Boom 6 + 8 Bitbugs 24 + Shooter Bot 9 + Drone 5 = 102) × 1.3 | 133 | 9:45 |
| 14 | Rings, tube T2, bridge to the lift dock | 97 m ÷ 5.5 | 18 | 10:03 |
| 15 | **S3-E6** Freight Lift | ride, stated | 60 | 11:03 |
| 16 | **S4-E7** Cold Aisles | (4 Sewer 12 + 2 Mimics 10 + 2 Laser Bots 12 = 34) × 1.3 | 44 | 11:47 |
| 17 | Two breakers and the dark aisles between them | 3 + 110 m ÷ 5.5 | 23 | 12:10 |
| 18 | **S4-E8** Download | hold, stated; ends in the halon purge | 75 | 13:25 |
| 19 | Stair C | 30 m ÷ 5.5 | 5 | 13:30 |
| 20 | **S5-E9** Executive Offices | (4 Agents 24 + 2 Riot 16 + Nullifier 8 = 48) × 1.3 | 62 | 14:32 |
| 21 | To the boardroom door | 25 m ÷ 5.5 | 5 | 14:37 |
| 22 | **S5-E10** Boardroom | (4 Agents 24 + 2 elite +12 + Drone 5 + Nullifier 8 + 3 Boom 9 = 58) × 1.3 | 75 | 15:52 |
| 23 | Keycard and walk to the lounge | 1.5 + 20 m ÷ 5.5 | 5 | 15:57 |
| 24 | Depot 2, Executive Lounge | breather | 45 | 16:42 |
| 25 | Stair D to the roof | 30 m ÷ 5.5 | 5 | 16:47 |
| 26 | **[L3] SB-BOSS** Glowie | 5 parts: 50 + 55 + 60 + 45 + 75, stated | 285 | 21:32 |
| | **Total** | | **1,292 s** | **21 min 32 s** |

Par is 20:00, so the budget is 1:32 over and inside the ±2:00 window. A fast replay at 70% is
about 15 min. Each alarm that runs out adds 30 to 35 s (§8.12); all four add 2:11.

**What makes the numbers fit.** A clear-all level of 217 enemies with Glowie Agents in every room
costs about 29 minutes by the PLAN §3 table. This level fits because 98 enemies are inside three
stated-time beats (27 on the lift, 42 in the hold, 29 boss adds) and 16 are alarm reinforcements.
The lift leaves its enemies behind and the halon purge kills what the hold left alive, so neither
beat needs a clean-up. See §14 for the note back to PLAN.

Intensity (0 to 1): E1 0.5, **L1** 0.75, E3 0.6, E4 0.45, depot, **L2** 0.8, E6 0.85, E7 0.5,
E8 0.9, E9 0.65, E10 0.8, depot, **L3** 1.0. No two encounters above 0.8 are adjacent.

## 5. Overview map

Side view of the tower, looking north. Heights are absolute; each section's tables use its own
local y = 0.

```
 y abs
  60   ~~ chopper loop (part 5) ~~
  55      A4 |          | A1          uplink antenna tops
  46 ROOF ====( [L3] SB: GLOWIE, ring r 27.8 )====  CP10 at the stair head
  41 F8   | LOUNGE D2 | BOARDROOM E10 | CEO *bonk | OFFICES E9 |   S5  CP8, CP9   ^ stair D
  36 F7   | dark racks | CORE: E8 hold | dark racks |  E7        |   S4  CP6, CP7   ^ stair C
  31 F6   | ring y15 ..... bridge (Big Obama) ......            | \
  26 F5   | ring y10 ..... bridge ..... [LIFT dock]             |  | S3 [L2] ATRIUM  E5, then
  21 F4   | ring y5  ... bridge | 7 m gap | bridge ...          |  | the lift ride E6 ^ to F7
  16 F3   | atrium floor, fountain | MAIL ROOM D1  CP4          | /       CP5 when L2 clears
  11 F2   | LOCKERS E4 | VAULT (Blink) CP3 | LASER HALL E3 | CHECKPOINT |   S2    tube T1 ^
   6 F1   | [L1] CUBICLE FARM E2 | COPY | BREAK (shotgun) | stair B ^   |   S1    CP2 when L1 clears
   0 F0   | escalator ^ CP1 | LOBBY E1 (MG) | sec. office | PLAZA start |   S1
```

Route: plaza → lobby → escalator → **[L1]** farm → break room → stair B → checkpoint room → laser
hall → lockers → vault and Blink shrine → tube T1 → Mail Room (depot 1) → **[L2]** atrium → rings →
freight lift (ride) → dark server hall, two breakers → core (hold) → stair C → executive offices →
boardroom → lounge (depot 2) → stair D → **[L3]** roof.

Coordinates: `+x` east, `+z` south, `y` up, metres. Each section's origin is its corner with the
smallest x and z at its lowest floor (north-west on the maps; see §14, note 2). Box and ramp
positions are **centres**, cylinder positions are **base centres**, as in `kit.js`. Sizes are
x × y × z. Interior walls are 4.5 m high and 0.5 m thick unless a row says otherwise. Maps: north
is up, 1 character = 2 m across, 1 row = 4 m.

## 6. Sections

### 6.1 S1: Lobby and Cubicle Farm (F0 and F1)

Footprint 96 × 70 m. Floors at y 0 (lobby, clear height 5.5) and y 6 (farm, clear height 4.5).
About 330 solids (22 pods × 8 is most of it). Encounters S1-E1, S1-E2 **[L1]**.

```
F0, y 0
x:  0   8        20                  48                  76      88
z28     +--------+-------[LA]-----[LB]-----[LC]------------+
z32     |        | cop       ___SW-1___                cop |
z36     |        |   pl     [_RECEPTION_]   pl    [MG] AL1 |
z40     |        | bn    o        o        o       desk bn |
z44     | foot   D1     pl             pl                  +------+
z48     |  ||    |   pl                        pl         SO  SEC |
z52     |  ||esc | ]  =====][=====][=====][=====][=====  [ |  OFF |
z56     |  top   |       o   bn   o   bn       o           +------+
z60     +--------+======(RD-1)==========(RD-2)=============+
z64                    |          PLAZA         |
z68                    |         START *        |

F1, y 6
x:  4   14  18  27  36  45  54  63  69 70     83 84   92
z0  +---------------------------------+---------+-----+
z4  | DAIS y 7.5                [MGR] | COPY    | ST.B|
z8  |^st=====glass rail==========st^  H c c  c  D  up |
z12 |pb  [P] [P] [P] [P] [P] [P]      |  shelf  |  to |
z16 |                                 |         |  S2 |
z20 |    [P] [P] cc  [P] [P] [P]      +---D-----+-----+
z24 |pb                               |  BREAK ROOM   |
z28 |    [P] [P] [P] [P] tbl [P]      |   o   o    vm |
z32 |                               SH-1b             |
z36 |pb  [P] [P] [P] [P] [P] [P]      |   o   o    vm |
z40 | ..threshold z 39..              |      [SG] ammo|
z44 +--SH-1a--+----M1----------M2-----+---------------+
z48 | well    |    meeting rooms (solid block)        |
z52 | esc     |                                       |
z56 | top CP1 |                                       |
z60 +---------+---------------------------------------+
```

| Id | Shape | Size | At | Mat | Purpose |
|---|---|---|---|---|---|
| `s1-plaza` | box | 36 × 0.5 × 10 | (48, −0.25, 65) | concrete | Plaza. Level start at (48, 0, 67) facing north |
| `s1-f0` | box | 68 × 0.5 × 32 | (42, −0.25, 44) | stone | Floor of the lobby (x 20–76) and escalator hall (x 8–20), z 28–60 |
| `s1-f0-sec` | box | 12 × 0.5 × 12 | (82, −0.25, 50) | stone | Security office floor |
| `s1-w-n` | box | 68 × 5.5 × 1 | (42, 2.75, 27.5) | concrete | North wall. Three openings 2.4 × 2.8 at x 40, 48, 56: lift doors **LA, LB, LC** (enemy only), an `office.liftCar` behind each |
| `s1-w-s` | box | 56 × 5.5 × 0.5 | (48, 2.75, 60) | glass | Glass front. Openings 3.6 wide at x 40 and x 56 for the revolving doors |
| `s1-w-hs` | box | 12 × 5.5 × 1 | (14, 2.75, 60.5) | concrete | South wall of the escalator hall |
| `s1-w-w` | box | 1 × 5.5 × 33 | (7.5, 2.75, 44) | concrete | West wall |
| `s1-w-e` | box | 1 × 5.5 × 32 | (76.5, 2.75, 44) | concrete | East wall. Opening 2.4 at z 50: door **SO** to the security office |
| `s1-part` | box | 0.5 × 5.5 × 32 | (20, 2.75, 44) | concrete | Lobby / escalator hall partition. Opening z 44–47 holds D-1 |
| `s1-sec` | box ×3 | 12 × 5.5 × 0.5; 0.5 × 5.5 × 12; 12 × 5.5 × 0.5 | (82, 2.75, 44); (88, 2.75, 50); (82, 2.75, 56) | concrete | Security office shell (spawn room for squad B) |
| `s1-f0-lid` | — | — | — | — | The F1 slab (`s1-f1`) is the lobby ceiling |
| `RD-1`, `RD-2` | rotator, 2 crossed boxes | 3.4 × 2.8 × 0.5 each | (40, 1.4, 60), (56, 1.4, 60) | glass | Revolving doors, 10 rpm. Carry the player through; a wing blocks bullets while it is in line |
| `s1-col` | cylinder ×6 | r 0.6, h 5.5 | x 30, 48, 66 at z 40 and z 56 | pillar | Full cover |
| `s1-recept` | `office.reception` | 10 × 1.2 × 1.5 + 2 wings | (48, 0, 36) | wood | Squad A's cover. Switch **SW-1** behind it at (48, 1, 33.5) |
| `s1-det` | `office.detector` ×4 | 3.2 × 2.9 × 0.5 | z 52, x 36, 44, 52, 60 | metal | Riot lane. A detector beeps when the player walks through and alerts squad A |
| `s1-bar` | box ×5 | 5.3 × 1.2 × 0.5 (×3); 10 × 1.2 × 0.5 (×2) | z 52: x 40, 48, 56; x 29.5, 66.5 | metal | Crouch cover between detectors. Leaves 4 m flank lanes along both walls |
| `s1-pl` | `office.planter` ×6 | 4 × 1.2 × 1.5 | (28, 0, 47), (68, 0, 47), (40, 0, 44), (56, 0, 44), (30, 0, 35), (66, 0, 35) | stone | Crouch cover |
| `s1-bench` | box ×4 | 3 × 0.6 × 1 | (44, 0.3, 56.5), (52, 0.3, 56.5), (24, 0.3, 40), (72, 0.3, 42) | wood | Low cover |
| `s1-secdesk` | box | 5 × 1.2 × 1.5 | (70, 0.6, 37) | wood | Security desk. Rack **`mg-lobby`** at (72, 0, 34.5), MG ammo crate at (74, 0, 37), alarm **AL1** on the wall at (75.8, 1.6, 40) |
| `s1-cop0` | `office.copier` ×2 | 1 × 1.1 × 0.7 | (22, 0, 31), (74, 0, 31) | metal | Shock barrels beside the lift doors |
| `s1-esc` | ramp | 4 × 6 × 12 | (10.5, 3, 51.5) | metal | Escalator. Low end z 45.5 (y 0), high end z 57.5 (y 6) |
| `D-1` | door | 0.5 × 2.8 × 3 | (20, 1.4, 45.5) | metal | Turnstile gate. Opens on SW-1 |
| `s1-f1` | box, 4 pieces round the well | 88 × 0.5 × 60 | (48, 5.75, 30) | stone | F1 slab, x 4–92, z 0–60. Well hole x 8.5–12.5, z 45.5–57.5 |
| `s1-f1-w` | box ×4 | 1 thick, 4.5 high | perimeter of x 4–92, z 0–60, y 6–10.5 | concrete; glass above y 7.2 on west and south | Outer walls and the skyline view |
| `s1-f1-lid` | box | 88 × 0.5 × 60 | (48, 10.75, 30) | concrete | Ceiling (the lockdown lid). Shaft hole over stair B |
| `s1-well` | box ×2 | 0.5 × 1.1 × 12; 4.5 × 1.1 × 0.5 | (12.75, 6.55, 51.5); (10.5, 6.55, 45.25) | glass | Rails round the escalator well |
| `s1-farm-s` | box | 17 × 4.5 × 0.6 | (13.5, 8.25, 45) | concrete | Farm south wall, x 5–22. Opening x 12.75–15.75 for SH-1a |
| `s1-meet` | box | 47 × 4.5 × 14 | (45.5, 8.25, 52) | concrete | Meeting-room block, x 22–69, z 45–59. Its north face is the rest of the farm's south wall. Door fronts **SP-M1** (30, 45) and **SP-M2** (58, 45) |
| `s1-farm-e` | box | 1 × 4.5 × 44 | (69.5, 8.25, 23) | concrete | Farm east wall. Openings: SH-1b at z 33–35.4; roll-up hatch **SP-COPY** at z 10–12.4 (enemy only) |
| `s1-dais` | box | 64 × 1.5 × 6 | (37, 6.75, 4) | wood | Manager's dais, top at y 7.5. Second height level of the farm |
| `s1-dais-st` | stairs ×2 | 3 × 1.5 × 3 | (6.5, 6.75, 8.5), (67.5, 6.75, 8.5) | wood | Low end south. The dais edge is also a double-jump (1.5 m) |
| `s1-dais-rail` | box | 56 × 1.1 × 0.5 | (37, 8.05, 6.75) | glass | Rail: stops bullets from below up to y 8.6, Agents fire over it |
| `s1-mgr` | box ×3 | 8 × 3 × 0.5; 0.5 × 3 × 4 (×2) | (62, 9, 5); (58, 9, 3), (66, 9, 3) | concrete | Manager's office. Door 2.2 wide at x 61–63.2 = **SP-DAIS**. Audit File 1 inside |
| `s1-pod` | `office.pod` ×22 | 6 × 1.35 × 6 | y 6; x 18, 27, 36, 45, 54, 63 at z 12, 21, 30, 39; none at (36, 21) or (54, 30) | hedge (grey felt) | The maze. Aisles are 3 m; walls are 1.35 m: jump or shoot over. **SP-PODS** = inside the pods of rows z 12 and z 21 |
| `s1-cop1` | `office.copier` ×6 | 1 × 1.1 × 0.7 | y 6: (34.5, 21), (37.5, 21), (22.5, 25.5), (49.5, 16.5), (58.5, 34.5), (40.5, 43.5) | metal | Shock barrels at aisle crossings |
| `s1-table` | box | 5 × 0.8 × 2.5 | (54, 6.4, 30) | wood | Team table. The lockdown reward appears on it |
| `s1-printer` | box ×3 | 2 × 1.2 × 6 | (9, 6.6, 14), (9, 6.6, 24), (9, 6.6, 34) | metal | Cover in the 10 m west strip |
| `SH-1a` | `office.shutter` | 3 × 3.5 × 0.6 | (14.25, 7.75, 45) | metal, neon trim | **[L1] entry.** Threshold line (`disc` strip, neon) at z 39 |
| `SH-1b` | `office.shutter` | 0.6 × 3.5 × 2.4 | (69.5, 7.75, 34.2) | metal, neon trim | **[L1] exit** to the break room |
| `s1-break` | box ×2 | 21 × 4.5 × 0.5 | (80.5, 8.25, 22), opening x 75–77.4; (80.5, 8.25, 46) | concrete | Break room, x 70–91, z 22–46 |
| `s1-break-f` | box; cylinder ×4; box ×3 | 8 × 1 × 1; r 0.7, h 0.8; 1.2 × 2 × 1 | (86, 6.5, 44.5); (76, 6, 28), (82, 6, 28), (76, 6, 38), (82, 6, 38); (90.2, 7, 27), (90.2, 7, 30), (90.2, 7, 33) | wood, metal | Counter, tables, vending machines. Rack **`sg-break`** at (86, 6, 43), shell crate at (84, 6, 43) |
| `s1-copy` | box; box; `office.copier` ×4 | 0.5 × 4.5 × 20; 0.6 × 2 × 6 | (83.25, 8.25, 11), opening z 9–11.4 = door **D-1B**; (76, 7, 14); copiers at (72, 6, 4), (72, 6, 8), (78, 6, 3), (81, 6, 3) | concrete, metal | Copy room, x 70–83, z 1–21 |
| `s1-stairB` | stairs | 3 × 5 × 12 | (87.5, 8.5, 11) | concrete | Stair B. Low end z 17 (y 6), high end z 5 (y 11). Exit door to S2 at (87.5, 11, 1.5) |

Mechanisms: `RD-1`, `RD-2` (rotator); `SW-1` reception switch (hold 1.5 s) → `D-1`; alarm `AL1`
(lobby, 30 s); `lockdown L1` {entry `SH-1a`, exit `SH-1b`, encounter `S1-E2`}; 8 copier barrels
(shock); door `D-1B` opens with `SH-1b`.
Transition: the door at the top of stair B. The stairwell is the load tunnel to S2.

### 6.2 S2: Security Vault (F2)

Footprint 88 × 56 m, one floor at y 0. About 95 solids. Encounters S2-E3, S2-E4. The Blink shrine.

```
x:  0  6        16  24  33      42 46 50        62      76      88
z0  +--+-------------------------------+----------------+-------+
z4  |  |                               | bay   |counter  D  SL  |
z8  |  +---G4---G3--G2-----------G1----+       |   AL2  |   in *|
z12 |  | <==== LASER HALL 44 x 14 <=== D-2  o  |     o  +-------+
z16 |  |                               | xray  +--[GR]--+
z20 |  +D-2b---------------------------+ bay   | guard  |
z24 +--+  ############################ +-------+--------+
z28 |  cab cab     .   cab cab     |###|   == deposit ==  [X]  |
z32 |  cab cab    NZ-2 cab cab     |###|  o            o       +-------+
z36 |  cab cab     .   cab cab  dr |###|                       | TUBE  |
z40 |  cab cab     .   cab cab  m2 D-V====>   (BLINK) CP3   G5=> ROOM  |
z44 +--cage--+  cr m1 cr           |###|  o            o       | rL  rL|
z48 | KC-1   |          dr      cr |###|   == deposit ==  AF2  |  (T1) |
z52 +--------+---------------------+---+-----------------------+-------+
```

| Id | Shape | Size | At | Mat | Purpose |
|---|---|---|---|---|---|
| `s2-floor` | box | 88 × 0.5 × 56 | (44, −0.25, 28) | metal | Floor |
| `s2-lid` | box | 88 × 0.5 × 56 | (44, 4.75, 28) | concrete | Ceiling |
| `s2-perim` | box ×4 | 1 thick, 4.5 high | edges of x 0–88, z 0–56 | concrete | Outer walls |
| `s2-sl` | box ×2 | 0.5 × 4.5 × 14; 12 × 4.5 × 0.5 | (76, 2.25, 7), opening z 6–8.4; (82, 2.25, 14) | concrete | Stair landing **SL**, x 76–88, z 0–14. Arrival at (82, 0, 4) |
| `s2-ck-s` | box | 26 × 4.5 × 0.5 | (63, 2.25, 26) | concrete | Checkpoint room south wall (room is x 50–76, z 0–26) |
| `s2-ck-w` | box | 0.5 × 4.5 × 26 | (50, 2.25, 13) | concrete | West wall. Opening z 11.8–14.2 = door **D-2** (opens when squads A and B are dead) |
| `s2-counter` | box | 1.5 × 1.2 × 12 | (60, 0.6, 9) | metal | Security counter. Squad B's cover |
| `s2-xray` | box | 1.2 × 0.9 × 6 | (56, 0.45, 19) | metal | X-ray belt. Low cover |
| `s2-bay` | cylinder ×2 + box ×2 | r 0.9, h 0.5; 2 × 2.5 × 0.5 | (53, −0.1, 4), (53, −0.1, 22); (53, 1.25, 1.5), (53, 1.25, 24.5) | metal, neon | Bot charging pads. Squad A stands on them, idle |
| `s2-gr` | box ×2 | 0.5 × 4.5 × 10; 12 × 4.5 × 0.5 | (64, 2.25, 21), opening z 20–22.4 = door **GR**; (70, 2.25, 16) | concrete | Guard room, x 64–76, z 16–26 |
| `s2-ck-pil` | cylinder ×2 | r 0.5, h 4.5 | (56, 0, 13), (68, 0, 8) | pillar | Full cover |
| `AL2` | alarm box | 0.5 cube, 40 HP | (66, 1.6, 0.8) | neon | On the north wall, in sight from the landing door |
| `s2-lh-n` | box | 44 × 4.5 × 0.5 | (28, 2.25, 6) | concrete | Laser hall north wall (hall is x 6–50, z 6–20) |
| `s2-lh-s` | box | 44 × 4.5 × 4 | (28, 2.25, 22) | concrete | Thick south wall, z 20–24. Passage x 10–13 = door **D-2b** (opens when S2-E3 is clear) |
| `s2-lh-w` | box | 0.5 × 4.5 × 14 | (6, 2.25, 13) | concrete | West end |
| `s2-lh-pil` | box ×6 | 1 × 4.5 × 1 | x 46, 37, 12 at z 8 and z 18 | pillar | Full cover between grids |
| `s2-lh-low` | box ×3 | 2 × 1.2 × 1 | (39, 0.6, 13), (28, 0.6, 13), (20, 0.6, 13) | crate | Crouch cover in the middle of the hall |
| `G1` | laserGrid | plane x 42, z 6.25–19.75, y 0–4.5 | — | neon | On 2.0 s, off 2.5 s, offset 0 |
| `G2` | laserGrid | plane x 33, same span | — | neon | On 2.0, off 2.0, offset 1.0 |
| `G3` | laserGrid | plane x 24, y 0.2–0.8 only | — | neon | **Always on, low.** Jump it. Teaches the jump for Glowie's Suppressing Fire |
| `G4` | laserGrid | plane x 16, full height | — | neon | On 2.5, off 1.5, offset 0.5 |
| `s2-vwall` | box | 4 × 4.5 × 30 | (44, 2.25, 39) | metal | Vault wall, x 42–46, z 24–54. Tunnel opening z 41–45 |
| `s2-cab` | `office.cabinetRow` ×8 | 8 × 1.5 × 0.6 | z 28, 32, 36, 40 at x 12 and x 28 | metal | Locker rows. Centre aisle x 16–24 |
| `s2-cage` | box ×2 | 12 × 2.6 × 0.5; 0.5 × 2.6 × 7 | (10, 1.3, 44); (16, 1.3, 50.5) | glass | Evidence cage, x 4–16, z 44–54. Door gap z 44.25–47 |
| `s2-cagedesk` | box | 3 × 0.9 × 1.2 | (9, 0.45, 50) | wood | Keycard **KC-1** lies on it |
| `NZ-2` | target: cylinder | r 0.5, h 3; 150 HP | (20, 0, 34) | neon | **Null pylon.** Field r 12: covers the lockers. Destroy it with guns |
| `s2-crate` | ammoCrate ×5 | — | (20, 0, 46), (30, 0, 46), (36, 0, 30), (6, 0, 34), (38, 0, 50) | crate | Real crates |
| `m1`, `m2` | mimic spots | — | (25, 0, 46), (39, 0, 40) | — | m1 sits between two real crates; m2 beside D-V |
| `DR-1..3` | disc ×3 | r 0.6 | (20, 0, 30), (20, 0, 50), (36, 0, 38) | metal | Floor drains: burrow points |
| `D-V` | door | 1 × 3.4 × 3.4 | (44, 1.7, 43) | metal, with a disc r 1.7 on it | Round vault door. Opens on KC-1 |
| `s2-v-n` | box | 24 × 4.5 × 1 | (58, 2.25, 30.5) | metal | Vault north wall (vault is x 46–70, z 31–54) |
| `s2-v-e` | box | 1 × 4.5 × 24 | (70.5, 2.25, 42) | metal | Vault east wall. Opening z 41–45 holds G5 |
| `s2-v-box` | box ×2 | 16 × 2.4 × 1 | (58, 1.2, 33), (58, 1.2, 52) | gold | Deposit-box walls |
| `s2-v-pil` | cylinder ×4 | r 0.5, h 4.5 | (52, 0, 37), (64, 0, 37), (52, 0, 49), (64, 0, 49) | pillar | Cover |
| `shrine-blink` | spellShrine: disc r 2, cylinder r 0.6 h 1.2 | — | (58, 0, 43) | neon | **Blink.** Refills mana. Checkpoint CP3 |
| `G5` | laserGrid | plane x 70.5, z 41–45 | — | neon | **Always on.** The only way out of the vault: Blink through it |
| `s2-demo` | `office.shutter`, never opens | 3 × 3.5 × 0.6 | (67.5, 1.75, 31.3) | metal, red neon | Marked "LOCKDOWN". Blink at it fizzles: the tutorial's second line |
| `G5b`, AF2 | laserGrid, always on; pick-up | plane z 47, x 66–70 | AF2 at (68, 0.5, 51) | neon | Audit File 2 in the corner behind the deposit wall. Blink only |
| `s2-tr` | box; box ×3 | 16 × 4.5 × 0.5; 2 × 1.2 × 1 | (80, 2.25, 30); (76, 0.6, 38), (76, 0.6, 48), (82, 0.6, 43) | concrete, crate | Tube room, x 71–88, z 30–54, and its cover |
| `T1` | `office.tube` + zipline | r 1, h 3; 40 m | station (84, 0, 48) → S3 (10, 1.5, 74), 5 m higher | glass | Pneumatic tube up to the Mail Room |

Mechanisms: door `D-2`; grids `G1` to `G5b`; alarm `AL2` (30 s); door `D-2b`; null pylon `NZ-2`;
keycard `KC-1` → `D-V`; spell shrine; tube `T1`.
Transition: tube T1. The 40 m tube is the load tunnel to S3.

### 6.3 S3: Atrium (F3 to F6) **[L2]**

Footprint 80 × 80 m. The hall is x 4–76, z 4–58 (72 × 54 m), 21 m high: a floor at y 0 and three
balcony rings at y 5, 10 and 15 round a 54 × 36 m void, under a glass skylight. The Mail Room
(depot 1) is south of the hall. About 150 solids. Encounters S3-E5 **[L2]**, S3-E6.

```
Floor, y 0                                        Rings, y 5 / 10 / 15 (R = ring slab, 9 m wide)
x:  4       13        36  40  44        67   76   x:  4       13        36  40  44        67   76
z4  +--------------------------------------+NE|   z4  +R-[N-a]----G6-----[N-b]-T2end-R---+NE|
z8  |  under the north ring               |st|   z8  |R  p15            p15            R |st|
z12 |- - - - - - - - - - - - - - - - - - -+--+   z12 |R R R R R R R R R R R R R R R R R R+--+
z16 |  .    pl                    pl    .    |   z16 |R  .               |            . R  |
z20 |  .                                .    |   z20 |R  +=====Y15 bridge=|===(BigO)===+ R  |
z24 |  .       pl      ___      pl      .    |   z24 |R  .               |            . R  |
z28 GL .              /   \             .    |   z28 GL  .              Y10            . R  |
z32 GL .             | FTN |            .    |   z32 GL  +==Y5 bridge= [gap] =Y5 br.==+ R AL-
z36 |  .              \___/             .    |   z36 |R  .       (NZ-3 dish under Y10) . R  |
z40 |  .       pl               pl      .    |   z40 |R  .               |            . R  |
z44 |  . [esc up, x 16-28]  [LIFT 6x6]  .    |   z44 |R  ld        [LIFT dock, y 10]  T2 R  |
z48 |- - - - - - - - - - - - - - - - - - - - |   z48 |R R R R R R R R R R R R R R R R R R R |
z52 |  ..threshold z 52..  [SN kiosk]        |   z52 |R [S-w]                    [S-e]   R |
z56 +--SH-3a--+------------------------------+   z56 +--------------------------------------+
z60 | MAIL ROOM   |  cafe (closed block)     |
z68 |  table  D1  |
z72 |  (T1 in)CP4 |
z76 +-------------+
```

| Id | Shape | Size | At | Mat | Purpose |
|---|---|---|---|---|---|
| `s3-floor` | box | 76 × 0.5 × 78 | (40, −0.25, 41) | stone | Atrium floor and Mail Room floor |
| `s3-w-n`, `s3-w-s` | box ×2 | 74 × 21 × 1 | (40, 10.5, 3.5); (40, 10.5, 58.5), opening x 12.5–15.5 for SH-3a | concrete | Hall north and south walls |
| `s3-w-w`, `s3-w-e` | box ×2 | 1 × 21 × 54 | (3.5, 10.5, 31); (76.5, 10.5, 31) | glass above y 1.2 | Hall side walls: the skyline |
| `s3-sky` | box | 72 × 0.5 × 54 | (40, 21.25, 31) | glass | Skylight: the lockdown lid. **SP-SKY** = ropes and flyers through four hatches at (22, 20), (58, 20), (22, 42), (58, 42) |
| `s3-mail` | box ×3 + box + cylinder | walls 0.5 × 4.5; table 6 × 0.9 × 2; r 1, h 3 | room x 4–26, z 59–78; table (18, 0.45, 66); tube arrival (10, 0, 74) | concrete, wood, glass | **Mail Room.** `depot` at (20, 0, 72). Checkpoint CP4 |
| `s3-cafe` | box | 50 × 4.5 × 19 | (51, 2.25, 68.5) | concrete | Closed café block: fills the rest of the south strip |
| `s3-ringN` | box ×3 (y 5, 10, 15) | 63 × 0.5 × 9 | (35.5, L − 0.25, 8.5) | stone | North ring, x 4–67 (the NE corner is the stair core) |
| `s3-ringS` | box ×3 | 72 × 0.5 × 9 | (40, L − 0.25, 53.5) | stone | South ring |
| `s3-ringW` | box ×3 | 9 × 0.5 × 36 | (8.5, L − 0.25, 31) | stone | West ring |
| `s3-ringE` | box ×3 | 9 × 0.5 × 36 | (71.5, L − 0.25, 31) | stone | East ring |
| `s3-rail` | box ×4 per level | 54 × 1.1 × 0.5 (N, S); 0.5 × 1.1 × 36 (W, E) | N (40, L + 0.55, 13.25); S (40, L + 0.55, 48.75); W (13.25, L + 0.55, 31); E (66.75, L + 0.55, 31) | glass | Rails round the void. 4.5 m gaps at every bridge mouth, at the escalator landing and at the lift dock (y 10, x 37–43) |
| `s3-y5-w`, `s3-y5-e` | box ×2 | 23.5 × 0.5 × 4 | (24.75, 4.75, 31); (55.25, 4.75, 31) | metal | **Y5 bridge**, east–west at z 31. **7 m gap** at x 36.5–43.5 ("under repair") |
| `s3-y10` | box | 4 × 0.5 × 30 | (40, 9.75, 28) | metal | **Y10 bridge**, north–south at x 40, z 13–43. Its south end is the lift dock |
| `s3-y15` | box | 54 × 0.5 × 4 | (40, 14.75, 22) | metal | **Y15 bridge**, east–west at z 22. The Big Obama's post during the ride |
| `s3-brail` | box, 2 per bridge span | 0.5 × 1.1 × span | along each bridge edge | glass | Bridge rails |
| `s3-ftn` | cylinder ×2 | r 4, h 0.8; r 0.8, h 3 | (40, 0, 31); (40, 0.8, 31) | stone, water | Fountain and sculpture. Crouch cover in the middle of the floor |
| `NZ-3` | target: sphere | r 0.7; 120 HP | (40, 8.8, 31), hung under the Y10 bridge | neon | **Null dish.** Field r 10 centred (40, 5, 31): covers the gap and the fountain. Shoot it |
| `s3-pl` | `office.planter` ×8 | 4 × 1.2 × 1.5 | y 0: (22, 18), (58, 18), (22, 26), (58, 26), (22, 40), (58, 40), (30, 34), (50, 34) | stone | Floor cover (8 pieces) |
| `s3-bench` | box ×6 | 3 × 0.6 × 1 | y 0.3: (30, 14), (50, 14), (16, 31), (64, 31), (34, 42), (48, 40) | wood | Low cover |
| `s3-kiosk` | box | 4 × 1.2 × 2 | (30, 0.6, 51) | wood | Security kiosk. Rack **`sn-atrium`** at (30, 0, 53.5), sniper crate at (33, 0, 53.5) |
| `s3-esc` | ramp + box | 12 × 5 × 3; 3 × 0.5 × 3 | (22, 2.5, 47.5), low end x 28, high end x 16; landing (14.5, 4.75, 47.5) | metal | Escalator from the floor to the y 5 rings (south-west corner) |
| `s3-ne` | stairs ×3 + walls | 3 × 5 × 8 each | core x 67–76, z 4–13; flights 0→5, 5→10, 10→15, switchback | concrete | North-east stair core. Enemy route between levels and the player's second way up. Floor door **SP-NE** at (67, 0, 9) |
| `s3-offN` | box ×3 (y 5, 10, 15) | 40 × 4.5 × 4 | (40, L + 2.25, 6) | concrete | North ring offices. Doors **N-a** (30, L, 8), **N-b** (50, L, 8) |
| `s3-offS` | box ×6 | 20 × 4.5 × 4 | (16, L + 2.25, 56), (64, L + 2.25, 56) | concrete | South ring offices. Doors **S-w** (16, L, 54), **S-e** (64, L, 54) |
| `s3-gl` | box + doors | 4 × 21 × 6 | (6, 10.5, 31) | glass | Glass lift on the west wall, enemy only. Doors **SP-GL** at y 0, 5, 10, 15 |
| `G6` | laserGrid | plane x 40, z 8–13, y 5–9.5 | — | neon | On 2.0, off 2.0. On the north ring walkway: the way round the gap |
| `T2` | `office.tube` ×2 + zipline | 37 m | (72, 5, 44) → (62, 10, 10) | glass | Tube from the east ring y 5 to the north ring y 10. Shooting allowed on the ride |
| `s3-perch` | box ×2 | 2 × 1.2 × 1 | (28, 15.6, 11), (52, 15.6, 11) | crate | Sniper perches on the north ring y 15 |
| `s3-slick` | hazardZone `slick` | — | Y5 bridge both halves; east ring y 5, z 13–49 | water | Sprinklers. On from wave 3 of L2 |
| `SH-3a` | `office.shutter` | 3 × 3.5 × 0.6 | (14, 1.75, 58.5) | metal, neon trim | **[L2] entry** from the Mail Room. Threshold at z 52 |
| `SH-3b` | `office.shutter`, horizontal | 6 × 0.6 × 6 | (40, 20.3, 46) | metal, neon trim | **[L2] exit**: the lift shaft hatch. The lift waits above it and comes down to y 10 when L2 clears |
| `FL` | mover: box + rails | 6 × 0.5 × 6; rails 1.1 on E, W, S | (40, 9.75, 46) → (40, 19.75, 46) → shaft | metal | **Freight lift.** Guide rails: 2 boxes 0.5 × 21 × 0.5 at (37, 10.5, 49.25), (43, 10.5, 49.25) |
| `s3-os` | powerup `overshield` | — | (16, 15, 22), west end of the Y15 bridge | — | Optional climb by the NE stairs or a Blink |

Mechanisms: `lockdown L2` {entry `SH-3a`, exit `SH-3b`, encounter `S3-E5`}; depot 1; null dish
`NZ-3`; grid `G6`; tube `T2`; sprinkler slick zones; freight lift `FL` (the S3-E6 ride).
Transition: the lift rises into the shaft at y 20. The shaft is the load tunnel to S4.

### 6.4 S4: Server Floor (F7)

Footprint 88 × 60 m, one floor at y 0, ceiling at 4.5. The hall is a `dark` hazard zone: the
player's light reaches 9 m, enemies glow (Agent flashlights, bot eyes, Bitbug propellers), the
motion tracker works. About 90 solids. Encounters S4-E7, S4-E8.

```
x:  4   8 ........ 29   36      44      52   59 ........ 80  84
z0  +-------------------+---> stair C up to S5 >---+-----------+
z4  |                   D-4N                       |           |
z8  |  | : | | : | |    +=====[MAINFRAME]=====+    | | : | | : | |
z12 |  | : | | : | |    | o    [TERM]      o  |    | | : | | : | |
z16 |  | : | | : | |    |     (hold r 6)      |    | | : | | : | |
z20 |BR-1 =cross-aisle= D-4W               D-4E =cross-aisle= G7 BR-2
z24 |                   |   con      con      |              mm |
z28 |  | : | | : | |    | o                o  |    | | : | | : | |
z32 |  | : | | : | |    +=====================+    | | : | | : | |
z36 |  | : | | : | |       staging  (AL3)          | | : | | : | |
z40 W-door              cr    Turbo    cr                   E-door
z44 |                                                          |
z48 +-------------------+---D---+------------------------------+
z52                     | LIFT  |        | = rack row   : = cold aisle (wind)
z56                     | CP6 * |        mm = crates by breaker 2 (two are mimics)
z60                     +-------+
```

| Id | Shape | Size | At | Mat | Purpose |
|---|---|---|---|---|---|
| `s4-floor`, `s4-lid` | box ×2 | 88 × 0.5 × 60 | (44, −0.25, 30); (44, 4.75, 30) | metal; concrete | Floor (raised tiles) and ceiling |
| `s4-perim` | box ×4 | 1 thick, 4.5 high | edges of x 0–88, z 0–60 | concrete | Outer walls |
| `s4-ll` | box ×2 | 0.5 × 4.5 × 12 | (36, 2.25, 54), (52, 2.25, 54) | concrete | Lift lobby, x 36–52, z 48–60. Lit. Arrival at (44, 0, 55). Checkpoint CP6 |
| `s4-hall-s` | box ×2 | 38 × 4.5 × 0.5 | (23, 2.25, 48), (65, 2.25, 48) | concrete | Hall south wall. Opening x 42–46 = hall door |
| `s4-hall-n` | box | 80 × 4.5 × 0.5 | (44, 2.25, 6) | concrete | Hall north wall. Opening x 37–39.4 = door **D-4N** (opens when the hold ends) |
| `s4-rackW` | `office.rackRow` ×14 | 1 × 2.2 × 12 | x 8, 11.5, 15, 18.5, 22, 25.5, 29 at z 14 and z 32 | metal | West bank: 7 rows in two blocks (z 8–20, z 26–38). Aisles 2.5 m. Full cover; tops reachable by double jump |
| `s4-rackE` | `office.rackRow` ×14 | 1 × 2.2 × 12 | x 59, 62.5, 66, 69.5, 73, 76.5, 80 at z 14 and z 32 | metal | East bank |
| `s4-wind` | hazardZone `wind` ×8 | 2.5 × 2.2 × 12 | aisles centred x 13.25, 23.75, 64.25, 74.75, both blocks | — | **Cold aisles.** Push 6 m/s² away from the cross-aisle (north in the north blocks, south in the south blocks), 4 s on, 3 s off, white mist. Bitbugs are blown along them |
| `s4-cross` | disc ×20 | r 0.3, every 4 m | z 23, x 6–82 | neon | Emergency floor lights along the cross-aisle (z 20–26): the critical path |
| `s4-core` | box ×4 | 16 × 4.5 × 0.5 (N, S); 0.5 × 4.5 × 24 (W, E) | N (44, 2.25, 10); S (44, 2.25, 34); W (36, 2.25, 22); E (52, 2.25, 22) | glass | **Core cage**, x 36–52, z 10–34. Openings z 21.8–24.2 in W and E hold D-4W, D-4E |
| `D-4W`, `D-4E` | door ×2 | 0.5 × 2.8 × 2.4 | (36, 1.4, 23), (52, 1.4, 23) | metal | Core doors. Open when BR-1 and BR-2 are both pulled. Seal for the halon purge |
| `s4-main` | box | 6 × 3.5 × 2 | (44, 1.75, 12) | neon | Mainframe. Emits **NZ-4** (field r 14 centred on it) until both breakers are pulled |
| `s4-dais` | box | 8 × 0.5 × 8 | (44, 0.15, 19) | metal | Terminal dais, top at y 0.4. Terminal **SW-4** at (44, 1.2, 15.5). Hold zone r 6 centred (44, 0, 19) |
| `s4-core-pil` | box ×4 | 1 × 4.5 × 1 | (39, 2.25, 13), (49, 2.25, 13), (39, 2.25, 30), (49, 2.25, 30) | pillar | Full cover. A charging Mini Tinubu stuns itself on one |
| `s4-con` | box ×4 | 3 × 1.2 × 1 | (40, 0.6, 25), (48, 0.6, 25), (41, 0.6, 29), (47, 0.6, 29) | metal | Consoles: crouch cover facing both doors |
| `BR-1`, `BR-2` | switchPanel ×2 | hold 1.5 s | (5, 1.2, 23), (83, 1.2, 23) | neon | Breakers on the west and east walls |
| `G7` | laserGrid | plane x 78.25, z 20–26 | — | neon | On 3.0, off 1.5. Guards breaker 2. Blink through, or time it |
| `s4-crate` | ammoCrate ×2 + mimic ×2 | — | real (82, 0, 21), (82, 0, 25); mimics (80.5, 0, 21), (80.5, 0, 25) | crate | Behind G7. Two of the four hum |
| `s4-tile` | disc ×8 | r 0.6 | (10, 23), (20, 23), (27, 40), (33, 16), (55, 30), (62, 23), (40, 17), (48, 17) | metal | Loose floor tiles: burrow points **TL-1..8** (7 and 8 are inside the core) |
| `s4-vent` | disc ×3 on the ceiling | r 0.8 | (44, 4.5, 16), (20, 4.5, 23), (68, 4.5, 23) | metal | Vents **V-C, V-W, V-E**: `air` spawns |
| `W-door`, `E-door` | door ×2 | 1 × 2.8 × 2.4 | (4, 1.4, 41), (84, 1.4, 41) | metal | Service doors: `door` spawns |
| `s4-stage` | box ×4 | 2 × 1.2 × 2 | (38, 0.6, 42), (50, 0.6, 42), (32, 0.6, 45), (56, 0.6, 45) | crate | Cover in the staging area (z 34–48) |
| `AL3` | alarm beacon | 0.5 cube, 40 HP | (44, 4.1, 40), on a ceiling beam | neon (red) | The only red light in the hall. Shoot it |
| `s4-turbo` | powerup `turbo` | — | (44, 0, 44) | — | For the breaker run |
| `AF3` | pick-up | — | (80, 2.2, 14), on top of the north-east rack row | — | Audit File 3. Double jump onto the racks |
| `s4-stairC` | stairs | 12 × 5 × 3 | (45, 2.5, 3) | concrete | Stair C in the corridor x 36–52, z 1–5. Low end x 39 (y 0), high end x 51 (y 5) |

Mechanisms: `dark` zone over the hall; 8 `wind` zones on a 7 s cycle; breakers `BR-1`, `BR-2` →
`NZ-4` off and `D-4W`, `D-4E` open; grid `G7`; alarm `AL3` (35 s); terminal `SW-4` starts the hold;
halon purge at the end of the hold (§8.8); door `D-4N`.
Transition: stair C to S5.

### 6.5 S5: Executive Floor (F8)

Footprint 88 × 62 m, one floor at y 0. Carpet, wood, full-height glass partitions (bullets stop,
Blink passes). About 110 solids. Encounters S5-E9, S5-E10. Depot 2. The Golden Bonk.

```
x:  4       20  24      36  44      56  60  66 68       84
z0              +-lift--+   +-stair C+  +cl+
z4              | lobby |   | CP8 *  |  |  |
z8  +-----------+--D----+---+---D----+--+D-+------------+
z12 | W1   g                 o                 g   E1   |
z16 |------g   dk  dk  dk  dk  dk              g--------|
z20 | W2   g      pl   cop cop   pl            g  E2 AL4|
z24 |------g   o                     o         g--------|
z28 | W3   g   dk  dk  dk  dk  dk              g   E3   |
z32 |      g  cop            o                 g        |
z36 +------+---------D-5a----------------+-----+--------+
z40 | LOUNGE   |  sb   BOARDROOM    sb   |  CEO SUITE   |
z44 | depot D2 D-5b PJ1 [==TABLE==] PJ2  D   desk       |
z48 |          |                         |      +mirror-+
z52 |          |      podium    [AV SW-5]|      | *BONK |
z56 +--D-5c----+---------cat-------------+------+-------+
z60 | stair D up to SB ->   |          g = glass partition   dk = desk
```

| Id | Shape | Size | At | Mat | Purpose |
|---|---|---|---|---|---|
| `s5-floor`, `s5-lid` | box ×2 | 88 × 0.5 × 62 | (44, −0.25, 31); (44, 4.75, 31) | wood; concrete | Floor and ceiling |
| `s5-perim` | box ×4 | 1 thick, 4.5 high | edges of x 0–88, z 0–62 | glass above y 1.2 on west and south | Outer walls |
| `s5-land` | box ×2 | 0.5 × 4.5 × 8 | (44, 2.25, 4), (56, 2.25, 4) | concrete | Stair C landing, x 44–56, z 0–8. Arrival (51, 0, 3). Checkpoint CP8 |
| `s5-pool-n` | box | 80 × 4.5 × 0.5 | (44, 2.25, 8) | concrete | North wall of the office pool (pool is x 4–84, z 8–36). Openings: landing door x 48.8–51.2; lift lobby door **XL** x 28.8–31.2; closet door x 62–64.4 |
| `s5-xl` | `office.liftCar` + box ×2 | lobby x 24–36, z 2–8 | walls (24, 2.25, 5), (36, 2.25, 5) | metal | Executive lift lobby: `door` spawns |
| `s5-closet` | box ×2 | 0.5 × 4.5 × 6 | (60, 2.25, 5), (66, 2.25, 5) | concrete | Supply closet, x 60–66, z 2–8: shell and MG ammo crates at (62, 0, 4), (64, 0, 4) |
| `s5-gW` | box | 0.5 × 4.5 × 28 | (20, 2.25, 22) | glass | Front of the west offices. Door openings z 11.8–14.2, 20.8–23.2, 29.8–32.2 |
| `s5-gW-div` | box ×2 | 16 × 4.5 × 0.5 | (12, 2.25, 17), (12, 2.25, 26) | glass | Dividers: offices **W1, W2, W3** |
| `s5-gE` | box | 0.5 × 4.5 × 28 | (68, 2.25, 22) | glass | Front of the east offices, same door openings |
| `s5-gE-div` | box ×2 | 16 × 4.5 × 0.5 | (76, 2.25, 17), (76, 2.25, 26) | glass | Dividers: offices **E1, E2, E3** |
| `s5-odesk` | `office.desk` ×6 | 2 × 1.25 × 1 | y 0: (9, 12.5), (9, 21.5), (9, 31), (79, 12.5), (79, 21.5), (79, 31) | wood | One per office |
| `s5-pdesk` | `office.desk` ×10 | 2 × 1.25 × 1 | y 0: x 28, 36, 44, 52, 60 at z 16 and z 28 | wood | Assistants' desks: crouch cover in two rows |
| `s5-pl` | `office.planter` ×4 | 4 × 1.2 × 1.5 | (32, 0, 22), (56, 0, 22), (24, 0, 12), (64, 0, 32) | stone | Cover |
| `s5-pil` | cylinder ×4 | r 0.5, h 4.5 | (26, 0, 24), (62, 0, 24), (44, 0, 12), (44, 0, 32) | pillar | Full cover |
| `s5-cop` | `office.copier` ×3 | 1 × 1.1 × 0.7 | (40, 0, 21), (48, 0, 21), (23, 0, 33) | metal | Shock barrels. The pair sits where the riot wall walks |
| `AL4` | alarm box | 0.5 cube, 40 HP | (83.3, 1.6, 21.5), east wall of office E2 | neon | In sight only through E2's door, or from inside E2 (Blink through the glass) |
| `s5-band` | box | 80 × 4.5 × 0.5 | (44, 2.25, 36) | concrete | Wall between the pool and the south band. Opening x 42.8–45.2 = door **D-5a** (opens when S5-E9 is clear) |
| `s5-br-w` | box | 0.5 × 4.5 × 20 | (24, 2.25, 46) | concrete | Boardroom west wall (room is x 24–64, z 36–56). Opening z 45.8–48.2 = door **D-5b** (KC-2) |
| `s5-br-e` | box | 2 × 4.5 × 20 | (65, 2.25, 46) | concrete | East wall. Opening z 45.8–48.2 to the CEO suite (open) |
| `s5-br-s` | box | 40 × 4.5 × 0.5 | (44, 2.25, 56) | concrete | South wall. Opening x 50–52.4 = catering door **CAT** (`door` spawns) |
| `s5-table` | box | 16 × 0.8 × 4 | (44, 0.4, 46) | wood | Boardroom table. Low: Agents crouch behind it, Boom Midgets run over it. KC-2 appears on it |
| `s5-chair` | cylinder ×12 | r 0.35, h 0.9 | 6 along z 43, 6 along z 49, x 37–51 | wood | Clutter |
| `s5-side` | box ×2 | 6 × 1.2 × 1 | (30, 0.6, 38.5), (58, 0.6, 38.5) | wood | Sideboards: the player's first cover inside D-5a |
| `s5-podium` | box | 1.5 × 1.2 × 1 | (44, 0.6, 53) | wood | The elite pair starts here |
| `s5-br-pil` | cylinder ×2 | r 0.5, h 4.5 | (30, 0, 50), (58, 0, 42) | pillar | Full cover |
| `PJ-1`, `PJ-2` | target ×2 | box 0.6 cube; 80 HP each | (36, 4.1, 46), (52, 4.1, 46), on the ceiling | neon | Projectors. Together they emit **NZ-5**: the whole boardroom |
| `s5-av` | box ×2 | 6 × 4.5 × 0.5; 0.5 × 4.5 × 4 | (61, 2.25, 52); (58, 2.25, 54) | glass | AV closet, x 58–64, z 52–56. No door. Switch **SW-5** inside at (62, 1.2, 55): turns NZ-5 off |
| `s5-ceo` | box + box ×2 | desk 4 × 0.9 × 1.5; sofas 3 × 0.8 × 1 | (75, 0.45, 42); (70, 0.4, 52), (74, 0.4, 38) | wood | CEO suite, x 66–84, z 36–56. Empty of enemies |
| `s5-bath` | box ×2 + fragileWall | 6 × 4.5 × 0.5; 0.5 × 4.5 × 6; mirror 0.5 × 2.6 × 2 | (81, 2.25, 50); (78, 2.25, 53); mirror in it at (78, 1.3, 53) | concrete; mirror = glass | Private bathroom, x 78–84, z 50–56. **Golden Bonk** at (81.5, 0.5, 53.5) behind the mirror |
| `s5-lounge` | box ×3 | bar 6 × 1.1 × 1; sofas 3 × 0.8 × 1 | (10, 0.55, 38.5); (8, 0.4, 50), (16, 0.4, 50) | wood | Executive lounge, x 4–24, z 36–56. `depot` at (13, 0, 45) |
| `D-5c` | door | 2.4 × 2.8 × 0.5 | (8, 1.4, 56) | metal | Roof stair door. Opens on KC-2 |
| `s5-stairD` | stairs | 12 × 5 × 3 | (13, 2.5, 59) | concrete | Stair D, x 4–20, z 57–62. Low end x 7 (y 0), high end x 19 (y 5) |

Mechanisms: alarm `AL4` (35 s); doors `D-5a`, `D-5b`, `D-5c`; projectors `PJ-1`, `PJ-2` and switch
`SW-5` → `NZ-5`; keycard `KC-2`; depot 2; `fragileWall` mirror; 3 copier barrels.
Transition: stair D to `SB`.

### 6.6 SB: The Roof **[L3]**

Footprint 80 × 80 m, roof deck at y 0. The arena is a disc of radius 27.8 m centred (40, 0, 34),
bounded by Glowie's fire ring (B §2.5: 27.8 → 26.8 → 25.5 m by stage) under a force-field lid at
y 20. Cover inside the ring comes from `duelArena('cubicles', [40, 0, 34])` (B §4); the cubicle
rows below are the stand-in until that helper lands. About 85 solids. Encounter `SB-BOSS`.
A hub-verified boss run starts at (40, 0, 76) with the starter MG (PLAN §9), so every tool listed
here is inside this section.

```
x:  0       16  24      40      56  64      80
z0  +-----------+==PENTHOUSE==+-------------+
z4  |           | G perch y 4 |             |
z8  |        .  +-----PH------+  .          |
z12 |     .           [AC]          .       |
z16 |   .     A4                A1    .     |
z20 |  .         c    c    c    c      .    |
z24 | .        gr          gr           .   |
z28 | .      c                    c     .   |
z32 | H-W [AC]      ( HELIPAD )    [AC] H-E |
z36 | .      c        mast        c     .   |
z40 | .        gr          gr           .   |
z44 |  .         c    c    c    c      .    |
z48 |   .     A3                A2    .     |
z52 |     .           [AC]          .       |
z56 |        .                   .          |
z60 |           ' . . GATE . . '            |
z64 |      [BZ] rk   hp   mg  [MG]          |
z68 |              staging                  |
z72 |            +--stair D--+       (WT)   |
z76 |            |  CP10 *   |              |
z80 +------------+-----------+--------------+
```

| Id | Shape | Size | At | Mat | Purpose |
|---|---|---|---|---|---|
| `sb-deck` | box | 80 × 1 × 80 | (40, −0.5, 40) | concrete | Roof deck |
| `sb-parapet` | box ×4 | 80 × 1.2 × 0.5; 0.5 × 1.2 × 80 | edges, y 0.6 | concrete | Parapet. `killPlane` at y −8 outside it |
| `sb-head` | box ×3 + lid | walls 0.5 × 3 high; lid 12 × 0.5 × 9 | bulkhead x 34–46, z 70–79 | concrete | Stair D head. Arrival (40, 0, 76). Checkpoint CP10. Door north at (40, 0, 70) |
| `bz-roof` | rack | — | (34, 0, 65) | — | **Bazooka rack.** Rocket crates at (31, 0, 65) and inside the ring at (40, 0, 55) |
| `mg-roof` | standee | — | (46, 0, 65) | — | Tier-8 MG on a fallen Sproto standee, for a canonical-start run. MG crates at (49, 0, 65) and (40, 0, 13) |
| `sb-hp` | health pick-up ×2 | — | (40, 0, 65), (40, 0, 58) | — | Before and just inside the gate |
| `SH-Ba` | `office.shutter` | 6 × 4 × 0.6 | (40, 2, 61.5) | metal, neon trim | **[L3] entry gate.** Drops 1 s after the player crosses z 56 (6 m inside the ring) |
| `sb-ring` | fire ring + lid | r 27.8 → 26.8 → 25.5; lid at y 20 | centre (40, 0, 34) | lava (emissive) | Arena wall (burns) and lockdown lid. There is no exit door: the fight ends the level |
| `sb-pad` | cylinder + disc | r 6, h 0.5; disc r 5.5 | (40, −0.1, 34), top at y 0.4 | concrete, neon | Helipad. Chopper rope point above it at y 9 |
| `sb-mast` | mover: cylinder; target ×3 spheres | r 0.8, h 6; nodes r 0.45, 90 HP each | rises through the pad at (40, 0.4, 34); nodes at y 1.6, 3.2, 4.8 on bearings 0°, 120°, 240°, 1 m out | metal, neon | **Null Mast** (part 4 only). Emits **NZ-B**, r 30 |
| `A1`–`A4` | `office.antenna` ×4, target | dish 120 HP, mast immune | (56, 0, 18), (56, 0, 50), (24, 0, 50), (24, 0, 18) | metal, neon | **Uplink antennas** (part 1). 22.6 m from the centre |
| `sb-cubE` | box ×8 | 4 × 1.35 × 0.5 | y 0.675: (30, 20), (37, 20), (43, 20), (50, 20), (30, 44), (37, 44), (43, 44), (50, 44) | hedge | Cubicle partitions, east–west. Block bolts, not the sweep (jump it) |
| `sb-cubN` | box ×4 | 0.5 × 1.35 × 4 | y 0.675: (27, 28), (53, 28), (27, 36), (53, 36) | hedge | Cubicle partitions, north–south |
| `sb-ac` | box ×4 | 3 × 2 × 2 | (22, 1, 32), (58, 1, 32), (40, 1, 13), (40, 1, 52) | metal | Air-conditioning units: full cover |
| `H-W`, `H-E` | door ×2 (roof hatches) | 2 × 0.5 × 2 frames | (16, 0, 34), (64, 0, 34) | metal | `door` spawns on the west and east |
| `GR-1..4` | disc ×4 | r 0.7 | (32, 0, 24), (48, 0, 24), (32, 0, 40), (48, 0, 40) | metal | Roof grates: `burrow` spawns |
| `sb-ph` | box | 24 × 4 × 6 | (40, 2, 3) | concrete | Server penthouse, x 28–52, z 0–6. Door **PH** at (40, 0, 6): `door` spawns. Glowie's part-1 perch on its roof at (40, 4, 4), inside the Uplink Shield (sphere r 2.5) |
| `sb-chopper` | mover + target ×2 | body = scaled sphere 6 × 2.5 × 2.5, tail box 5 × 0.6 × 0.6, rotor disc r 4; pods cylinder r 0.5 h 1.5, 160 HP each | loop r 34 round (40, 14, 34), 24 s a lap; hovers at (40, 9, 34) for drops | metal | Unmarked chopper (part 5). No guns. Not an enemy: a mover with two destructible engine pods |
| `sb-wt` | cylinder + cone | r 3, h 7; cone r 3.4, h 2 | (70, 0, 72) | metal | Water tower. Scenery outside the ring |
| `sb-crate4` | ammoCrate ×2 + mimic ×2 | — | real (34, 0, 30), (46, 0, 38); mimics (46, 0, 30), (34, 0, 38) | crate | Dropped at the start of part 4 |

Mechanisms: `lockdown L3` {entry `SH-Ba`, no exit, encounter `SB-BOSS`}; fire ring; uplink
antennas; Null Mast; chopper mover; Duel arena shifts (Live Wires, Water Cooler, Server Meltdown).
Transition: none. Glowie's death ends the level.

## 7. Prefabs (`src/data/levels/prefabs/office.js`)

| Prefab | Parts | Footprint | Notes |
|---|---|---|---|
| `office.cubicle` | Back box 3 × 1.35 × 0.5; two side boxes 0.5 × 1.35 × 2.5; desk box 2 × 0.75 × 0.8 | 3 × 3 m | One desk bay. Used singly as scenery |
| `office.pod` | Three north–south boxes 0.5 × 1.35 × 6 at x −2.75, 0, +2.75; spine box 6 × 1.35 × 0.5; four desk boxes 2 × 0.75 × 0.8 | 6 × 6 m | Four cubicles back to back, open to the north and south aisles. 8 solids |
| `office.desk` | Top box 2 × 0.75 × 1; monitor box 0.6 × 0.5 × 0.5 on it | 2 × 1 m | 1.25 m high: crouch cover |
| `office.reception` | Desk box 10 × 1.2 × 1.5; two wing boxes 1.5 × 1.2 × 3 | 10 × 4.5 m | Open to the north |
| `office.detector` | Two posts 0.5 × 2.4 × 0.5 at x ±1.35; lintel 3.2 × 0.5 × 0.5 at y 2.65 | 3.2 × 0.5 m | 2.2 m clear width |
| `office.copier` | Body box 1 × 1.1 × 0.7; tray box 0.5 × 0.5 × 0.5 | 1.5 × 0.7 m | A `barrel` with element `shock`: 30 HP, 4 m blast, 1.5 s stun. Flashes its scanner light before it blows |
| `office.cabinetRow` | Box 8 × 1.5 × 0.6 | 8 × 0.6 m | Chest-high: full cover crouched, Agents fire over it |
| `office.rackRow` | Box 1 × 2.2 × 12; a `neon` strip (visual) | 1 × 12 m | Server racks |
| `office.planter` | Box 4 × 1.2 × 1.5; sphere r 0.8 on top (visual) | 4 × 1.5 m | Crouch cover |
| `office.liftCar` | Floor box 3 × 0.5 × 3; three wall boxes 0.5 × 2.8; lid box; a `door` on the open side | 3 × 3 m | Enemy spawn room behind a lift door |
| `office.shutter` | Slab box 0.6 m thick, full height; `neon` trim, red locked, green open | as given | Lockdown door (PLAN §5.6). Drops in 0.4 s and pushes the player inward |
| `office.tube` | Cylinder r 1, h 3, `glass`; a `zipline` anchor at y 1.5 | r 1 m | Pneumatic tube station |
| `office.antenna` | Base box 2 × 1 × 2; mast cylinder r 0.4, h 9; dish sphere r 0.9 at y 7 | 2 × 2 m | Target. Only the dish takes damage |

## 8. Encounters

Ten encounters and the boss. `maxAlive` is 14 everywhere (a Bitbug flock counts 1 per 6). A squad
that would break the cap waits. Roster, scripted (201): Midget 54, Bitbug 44, Glowie Agent 31,
Sewer Midget 22, Boom Midget 15, Laser Bot 10, Cabinet Mimic 6, Riot Midget 5, Nullifier 5, Shield
Drone 4, Audit Sniper 2, Shooter Bot 1, Big Obama 1, Mini Tinubu 1. Alarm squads add 9 Agents,
3 Laser Bots, 2 Riot Midgets, 1 Nullifier, 1 Shield Drone (16). Nine of the eleven beats have an
Agent squad of 3 or 4 with one flashbang carrier (white bandolier).

### 8.1 S1-E1 Lobby

Space: lobby 56 × 32 m, 5.5 m high. Objective: `clearAll`, then `switch` SW-1. Approaches: through
the detectors, or along either wall lane; RD-1 or RD-2.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` (a revolving door) | placed | Behind the reception desk and planters (30, 35), (66, 35) | 3 Glowie Agents (1 flashbang) | Squads hold cover and peek. The first flashbang lands at the detectors: look away |
| B | `onKills(2)` | door | SO (security office), through the detector lane | 1 Riot Midget, 3 Midgets | A shield pushes while Agents suppress. AL1 starts |
| C | `onRemain(2)` | door | Lift LB | 1 Nullifier, 2 Midgets | **Nullifier intro, alone.** Its 9 m disc rolls out of the lift; a spell cast inside fizzles. Guns |
| D | `onSwitch(SW-1)` | door | Lifts LA and LC | 2 Laser Bots | Security bots wake when the gate opens; they fire along the route to D-1 |

Roles: ranged, shield, fodder, anti-magic (4). Hazards: none (first room). Weapons: rack `mg-lobby`
(why: Riot and swarm lanes here and in L1). Ammo: boxes b1, b2, b3. Estimate 79 s.

### 8.2 S1-E2 Cubicle Farm **[L1]**

**Lockdown room:** the farm, x 5–69, z 1–45 (**64 × 44 m**), ceiling at 4.5 m. Two height levels
(floor y 6, dais y 7.5) and 22 pods of cover. Entry `SH-1a` (south, from the landing), threshold
z 39. Exit `SH-1b` (east, to the break room). Checkpoint CP1 on the landing outside SH-1a. Spawn
points on three sides and inside: **SP-PODS** (inside the pods of rows z 12 and z 21), **SP-M1**
(30, 45) and **SP-M2** (58, 45) south, **SP-COPY** (69, 11) east, **SP-DAIS** (62, 7.5, 5) north.

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Lock: the player crosses z 39, SH-1a drops 1 s later | hidden | SP-PODS | 9 Midgets | They vault the 1.35 m walls from the north. Stand on a desk and sweep with the MG |
| 2 | `onRemain(2)` or 25 s after wave 1 | door | SP-COPY: 3 Boom Midgets. SP-M1: 4 Midgets | 7 | Bombs run the east aisles past three copiers: one shot chains them. Yeet or Yoink a bomb back |
| 3 | `onRemain(2)` or 25 s after wave 2 | door | SP-DAIS | 3 Glowie Agents (1 flashbang), 1 Shield Drone | **Shield Drone intro.** It tethers the carrier and gives him a front shield. Shoot the drone or stun it with Chain Zap. The dais is climbable from both ends or by double jump |
| 4 | `onRemain(2)` or 25 s after wave 3 | door | SP-M2: 3 Midgets (2 elite "Floor Managers"). SP-M1: 2 Midgets, 1 Boom Midget | 6 | Elite pair in a 3 m aisle while a bomb comes from the other door |

26 enemies, 4 waves. Roles: fodder, rusher, ranged, support (4). Hazards: copier blasts (shock).
End: both shutters open, CP2 saves, the reward appears on the team table (54, 6, 30): chest
(1 gun, Rare or better), ammo crate c1, a health pick-up. Ammo inside: b5, b6, b7. No weapon is
needed that the player does not already carry; `mg-lobby` is 60 m back. Estimate 124 s (2.1 min).

### 8.3 S2-E3 Checkpoint and Laser Hall

Space: checkpoint room 26 × 26 m, then the hall 44 × 14 m with four grids. Objective: `clearAll`,
which opens D-2b. Approaches: over or round the counter; in the hall, the grid windows or the
pillar pairs on either wall.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` (landing door) | placed | Charging pads (53, 4), (53, 22) | 2 Laser Bots | Idle until alerted: a free first shot. AL2 starts when they wake |
| B | `onAlert` or `onKills(1)` | door | Guard room GR | 3 Glowie Agents (1 flashbang) | A squad takes the counter. The alarm box is on the wall behind them |
| C | `onEnter` (through D-2) | hidden | West end of the hall, behind G4 | 2 Riot Midgets, 1 Nullifier | Shields walk east through the grids on the timer. The Nullifier stays behind G4, so the hall is guns only: shoot it through G4's 1.5 s off window, or the shields' feet under G3's low beam |

Roles: ranged, shield, anti-magic (3). Hazards: laser grids and a mobile null field, overlapping.
Weapons: `sg-break` is 45 m back (why: Riot Midgets here, Mimics and Sewer Midgets in S2-E4).
Ammo: b10, b11, b12 (b12 is inside the hall). Estimate 70 s plus 15 s of grid timing.

### 8.4 S2-E4 Evidence Lockers and Vault

Space: lockers 38 × 30 m under null pylon NZ-2 (guns only until it is destroyed), then the vault
24 × 22 m. Objective: pick up KC-1, `clearAll`, reach the shrine.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` (D-2b) | placed | m1 at (25, 0, 46), between two real ammo crates | 1 Cabinet Mimic | **Mimic intro, alone.** Three crates in a row; the middle one hums and its papers twitch. Shoot it dormant for double damage |
| B | `onSwitch(KC-1)` | burrow | Drains DR-1, DR-2, DR-3; m2 at (39, 0, 40) | 4 Sewer Midgets (2 elite), 1 Cabinet Mimic | Ambush on the way out, inside the field. The second Mimic sits beside the vault door |
| C | `onSwitch(shrine-blink)` | placed | Tube room, behind G5 | 2 Laser Bots | **Blink test.** They fire through G5; bullets pass a grid both ways. Blink through and take them from the side |

Roles: ambush, rusher, ranged (3). Hazards: static null field, laser grid G5. Ammo inside the
field: crates c2, c3, boxes b13, b14. Estimate 52 s.

### 8.5 S3-E5 Atrium **[L2]**

**Lockdown room:** the atrium hall, x 4–76, z 4–58 (**72 × 54 m**), four height levels (y 0, 5,
10, 15) under the skylight. Entry `SH-3a` (south, from the Mail Room), threshold z 52. Exit
`SH-3b`, the lift shaft hatch: the freight lift is parked above it and comes down when the room
is clear. Checkpoint CP4 in the Mail Room outside SH-3a. Spawn points: **SP-SKY** (skylight
hatches, top), **SP-GL** (glass lift, west, any level), **SP-N15** (north ring office doors N-a,
N-b at y 15), **SP-NE** (north-east stair core, floor door and y 5 door).

| Wave | Trigger | Method | Spawn point | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| 1 | Lock: the player crosses z 52 | door | SP-N15: 2 Audit Snipers to the perches. SP-NE at y 5: 3 Glowie Agents (1 flashbang) to the east ring | 5 | Two lasers from 15 m up and a squad at 5 m. The sniper rack is 3 m from the threshold. The planters hide you from one side at a time |
| 2 | `onRemain(2)` or 25 s after wave 1 | drop | SP-SKY ropes at (22, 20) and (58, 42) | 6 Midgets, 2 Boom Midgets | Pressure on the floor while you are looking up. The escalator and the NE stairs are the ways off the floor |
| 3 | `onRemain(2)` or 25 s after wave 2 | air | SP-SKY | 8 Bitbugs | Sprinklers start: the Y5 bridge and the east ring are slick. Chain Zap the flock, but not from inside NZ-3 |
| 4 | `onRemain(2)` or 25 s after wave 3 | door | SP-GL at y 10: 1 Shooter Bot, 1 Shield Drone, onto the Y10 bridge. SP-NE floor: 2 Midgets | 4 | A shielded heavy on a 4 m bridge. Kill the drone first, or get behind it: tube T2, the NE stairs, or Blink across the gap once the dish is down |

25 enemies, 4 waves. Roles: sniper, ranged, fodder, rusher, flyer (5; wave 4 adds heavy and support
after the snipers are dead or marked). Hazards: slick floor and the static null field NZ-3
(r 10 over the fountain and the bridge gap), overlapping. Anti-stall: snipers that outlive their
wave by 12 s are marked and walk down the NE stairs. End: SH-3b opens, the lift descends, CP5
saves, the reward appears at the dock (40, 10, 40): chest, ammo crate c4, Overshield. Weapons: rack
`sn-atrium` inside the room (why: the two snipers, the null dish, AL-style targets at range). Ammo
inside: b17, b18, b19, b20. Estimate 133 s (2.2 min).

### 8.6 S3-E6 Freight Lift

Space: the 6 × 6 m platform, rising from y 10 to y 20 past the y 15 ring and the Y15 bridge.
Objective: `ride`, 60 s. The lift moves at 0.25 m/s and stalls twice ("LIFT HALTED BY SECURITY").
When it enters the shaft, everything not on the platform is left behind and despawns. The shaft
door at the top opens when the platform is clear.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| R1 | `t+0` | placed | Centre of the Y15 bridge, 24 m north | 1 Big Obama | Hoses the platform at long range for the whole ride. Killing him is optional: use the rail as cover |
| R2 | `t+4` | hidden | Over the south ring rail at y 10 | 5 Midgets | They jump on as the lift leaves. Yeet clears the platform |
| R3 | `t+10`, stall 1 (y 12.5, 14 s) | door | South ring offices S-w, S-e at y 15 | 3 Glowie Agents (1 flashbang) | They fire down from 2.5 m above. The flashbang lands on the platform: look away, or Yoink it and throw it back |
| R4 | `t+24` | drop | SP-SKY ropes onto the platform | 2 Boom Midgets, 3 Midgets | Bombs on a 6 × 6 m floor. Shoot them on the rope |
| R5 | `t+36`, then stall 2 at `t+44` (y 17.5, 8 s) | drop | Ropes onto the platform | 3 Midgets (2 elite) | Elite pair at arm's length: shotgun. Their gun drops land on the lift |
| R6 | `t+46` | air | Shaft vents above | 10 Bitbugs | A flock pours down the shaft as the lift goes in |

27 enemies. Roles: heavy, fodder, ranged, rusher, flyer (5). Hazards: the platform edge (a fall to
the floor costs the ride: void rescue back onto the lift, −25% health). Ammo: boxes b22, b23 on
the platform. Stated time 60 s. On-platform kill sum is 42 s × 1.3 = 55 s, so the platform is
clear as the shaft door opens.

### 8.7 S4-E7 Cold Aisles

Space: the dark server hall, 80 × 42 m, 28 rack rows. Objective: `switch` BR-1 and BR-2. Approaches:
the lit cross-aisle, or the dark aisles and rack tops.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` (hall door) | burrow | Tiles TL-1, TL-2, TL-3, TL-4 | 4 Sewer Midgets | Darkness: dust puffs and the motion tracker are the tells. AL3 starts (the red beacon) |
| B | `onSwitch(BR-1)` | placed | Behind G7: (80.5, 0, 21), (80.5, 0, 25) | 2 Cabinet Mimics | In the dark the hum is the only tell. Four crates by breaker 2; two are real |
| C | `onSwitch(BR-1)` | door | E-door | 2 Laser Bots | Their beams light an aisle for you. A cold-aisle gust pushes you into their lane |

Roles: rusher, ambush, ranged (3). Hazards: dark and wind, overlapping; grid G7. Ammo: b24, b25,
b26, crates c5, c6. Power-up: Turbo. Estimate 44 s plus 23 s for the breaker run.

### 8.8 S4-E8 The Download

Space: the core cage, 16 × 24 m, glass walls, two doors, four pillars, four consoles. Objective:
`hold` at the terminal (r 6) for 75 s. NZ-4 is off (both breakers pulled), so the player starts
with spells. At `t+70` both core doors seal; at `t+75` the **halon purge** fires: every enemy in
the hall outside the core dies, and enemies inside the core take 200 damage. An elite killed by
the purge still leaves its gun at the east core door.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| H1 | `t+0` | burrow | TL-7, TL-8 (inside the core), TL-4, TL-5 | 4 Sewer Midgets | The fight starts at your feet |
| H2 | `t+10` | air | V-C, the vent over the terminal | 12 Bitbugs | Chain Zap while you still have spells |
| H3 | `t+20` | door | Hall door, then the west core door | 3 Glowie Agents (1 flashbang), 1 Nullifier | The field reaches the terminal when the Nullifier is within 9 m. **Kill it first** or fight the rest with guns only. A flashbang through a glass wall still blinds |
| H4 | `t+34` | burrow | TL-1 to TL-6, both spines | 6 Sewer Midgets | They come at both doors at once |
| H5 | `t+45` | door | W-door, down the cross-aisle, west core door | 1 Mini Tinubu | Sidestep at the door: it hits a core pillar and is stunned 1.2 s, belly open |
| H6 | `t+54` | door | E-door, east core door | 2 Laser Bots (both elite) | Elite pair firing through the east door. Consoles face both doors |
| H7 | `t+62` | air | V-W, V-E | 8 Bitbugs | The last flock |
| H8 | `t+66` | door | Hall door | 5 Midgets | They are outside when the doors seal at `t+70` |

42 enemies. Roles: fodder, flyer, ranged, anti-magic, charger (5). Hazards: dark; wind in the
aisles outside. Ammo inside the core: b28, b29; CP7 box b27 at the west door. Stated time 75 s.
The hold bar only fills while the player is inside the 6 m zone; it does not drain.

### 8.9 S5-E9 Executive Offices

Space: the assistants' pool, 80 × 28 m, with three glass offices on each side. Objective:
`clearAll`, which opens D-5a. Approaches: either desk row, the office doors, Blink through glass.

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` (landing door) | placed | Office W2 (1), office E2 (1), behind desks (36, 28) and (52, 16) (2, one has the flashbang) | 4 Glowie Agents | A squad split by glass. Bullets do not cross a partition; Blink does. AL4 starts when they see you |
| B | `onKills(2)` | door | XL, the executive lift lobby | 2 Riot Midgets, 1 Nullifier | A shield wall with a field behind it: no spells, no Blink inside 9 m. The two copiers at (40, 21), (48, 21) are on their path |

Roles: ranged, shield, anti-magic (3). Hazards: mobile null field, copier blasts. Ammo: b30, b31,
b32, b33 (b33 is in the pool). Estimate 62 s.

### 8.10 S5-E10 Boardroom

Space: 40 × 20 m room with a 16 m table. Objective: `clearAll`; KC-2 appears on the table.
Approaches: D-5a then left or right of the table. NZ-5 covers the room until both projectors are
shot or SW-5 is pressed (Blink into the AV closet from the pool side of the glass is not possible
through NZ-5: the closet is reached from the CEO suite side, through its outer glass wall).

| Squad | Trigger | Method | From | Enemies | Teaches or tests |
|---|---|---|---|---|---|
| A | `onEnter` (D-5a) | placed | Behind the table, at the podium, at the pillars | 4 Glowie Agents (2 elite, 1 flashbang), 1 Shield Drone | The level's hardest squad, under a static field. Order of work: projectors (2 × 80 HP, on the ceiling) or the drone, then the carrier, then the elites |
| B | `onKills(2)` | door | CAT, the catering door | 1 Nullifier, 3 Boom Midgets | Bombs run over the table inside a second, moving field. If you just switched NZ-5 off, this one switches your spells off again |

Roles: ranged, support, anti-magic, rusher (4). Hazards: static null field and mobile null field,
overlapping. Ammo inside: b35, b36; CP9 box b34 at the door. Estimate 75 s.

### 8.11 SB-BOSS **[L3]**

See §10. Lockdown room: the roof ring, 55.6 m across, under a lid at y 20. Spawn points: **PH**
(north), **H-W** (west), **H-E** (east), **GR-1..4** (floor), the **chopper rope** (top).

### 8.12 Alarms

An alarm box (40 HP) starts a visible countdown when its encounter says so. Shoot it, or hold
Interact on it for 1 s, to cut it. If the countdown ends, its squad arrives by `door` behind the
player and the room's laser grids, if any, run 25% faster until the squad is dead. No alarm is
inside a lockdown.

| Alarm | Encounter, start | Countdown | Squad if it runs out | From | Extra time |
|---|---|---|---|---|---|
| AL1 | S1-E1, when squad B spawns | 30 s | 3 Glowie Agents (1 flashbang), 1 Laser Bot | Lift LA | 31 s |
| AL2 | S2-E3, when squad A wakes | 30 s | 2 Laser Bots, 2 Riot Midgets | Stair B, behind the player | 36 s |
| AL3 | S4-E7, when squad A burrows | 35 s | 3 Glowie Agents (1 flashbang, flashlights), 1 Shield Drone | W-door | 30 s |
| AL4 | S5-E9, when squad A sees the player | 35 s | 3 Glowie Agents (1 flashbang), 1 Nullifier | Stair C | 34 s |

## 9. New enemies

Stats are tier 1; tier 8 multiplies HP and damage by 2.66. Drops follow PLAN §7: ammo, health,
mana, tickets and guns only.

### 9.1 `nullifier`: Nullifier Agent (anti-magic)

| Field | Value |
|---|---|
| Look | `sahil` model at scale 0.9, tinted violet-grey; cylinder backpack r 0.25, h 0.6; a `disc` r 9 on the floor, hatched blue, that moves with him |
| HP, poise | 85; poise 30, stagger 0.5 s |
| Movement | 3.8 m/s, accel 20. Stays 5 to 7 m behind the nearest ally and 10 to 18 m from the player. Alone, he backs toward the nearest spawn door |
| Hitboxes | Body capsule r 0.5, y 0–1.8; head weak sphere r 0.24 at y 1.85; **backpack** weak sphere r 0.3 at y 1.2, z −0.4 (×2, from behind) |
| Gun | Pistol: 1 round, 5 damage, cooldown 1.8–2.6 s, spread 4°, speed 32, range 30, windup 0.4 s |
| Null field | Radius 9 m, centred on him. Inside it: a spell cast fizzles (half the mana back, 0.6 s lockout); mana does not regenerate; spell projectiles and Chain Zap arcs stop at the edge; Sproto Swarm buddies and a Decoy pop 0.5 s after entering; Blink cannot start or end inside; a Mana Shield that is already on stays on and drains 12 mana/s (PLAN §6.2). Enemy magic fizzles too: a Hex Acolyte's bubbles pop |
| Counter | Guns. A poise break (shotgun, a copier blast) drops the field for 1.5 s. On death the field collapses and the player gets 25 mana if within 9 m |
| Drops | Ammo 70%, mana orb 50%, gun 6% |
| Seconds per enemy | 8 |

### 9.2 `shieldDrone`: Shield Drone (air support)

| Field | Value |
|---|---|
| Look | Sphere r 0.35, grey; `disc` r 0.5 projector under it; a thin beam to its ward; the ward's shield is a `disc` r 0.9, `glass`, in front of the ward |
| HP, poise | 35; no stagger |
| Movement | Flies at 7 m/s, 3 to 4.5 m up (ceiling minus 0.8 m indoors), 4 to 6 m behind its ward as seen from the player. Jinks 0.6 m every 1.2 s |
| Hitboxes | One sphere r 0.35 |
| Ward | Tethers one ally within 14 m. Priority: a boss, then a flashbang carrier, then a heavy, then the nearest. The ward gets a **front shield** over a 120° arc: bullets and pellets from the front do 0, splash does half, spells pass. If the ward dies, it re-tethers after 1.5 s |
| Attack | None. With no ally within 20 m for 6 s it self-destructs (10 damage, 2 m) |
| Counter | Shoot it (small target, steady hover). Chain Zap stuns it 2 s and drops the shield. Flank the ward |
| Drops | Ammo 50%, gun 4% |
| Seconds per enemy | 5 |

### 9.3 `cabinetMimic`: Filing Cabinet Mimic (ambush)

| Field | Value |
|---|---|
| Look | Box 1.2 × 0.8 × 0.8 with a hinged lid box 1.2 × 0.15 × 0.8: **the same shape and colour as an ammo crate** (PLAN §7.4). No colour tell |
| Tell | A low hum within 8 m (positional, louder closer) and a paper twitch at the lid every 3 s. Real crates are silent and still. The motion tracker does not show a dormant Mimic |
| HP, poise | 110; poise 60. **Dormant: takes ×2 damage** |
| Wakes | The player within 3 m, an Interact on it, or any hit. 0.4 s lid-snap telegraph |
| Attacks | Lunge bite: range 2.2 m, 18 damage, and it eats 15% of the reserve ammo of the gun in your hands (it drops that ammo again on death). Then hops 2 m every 0.6 s (5.5 m/s) and bites every 1.4 s for 14. If it cannot reach you for 3 s it spits 3 staples (4 damage each, 18 m range) |
| Hitboxes | Body box; weak sphere r 0.3 inside the open lid (only while the lid is open: during a bite and for 0.5 s after) |
| Counter | Shoot crates that hum. Shotgun in the open lid |
| Drops | Always one ammo box for the gun you are lowest on; gun 8% |
| Placement rules | Never in a depot or a boss staging area. Never within 6 m of a checkpoint, a rack or a lockdown reward. Every ammo box and crate named in §12.4 is real. A room with Mimics has at least as many real crates as Mimics |
| Seconds per enemy | 5 |

No other new enemy is proposed. The part-5 chopper is a mover with two destructible pods, not an enemy.

## 10. Finale: Boss Glowie, *Government Enforcement* (`SB-BOSS`)

Glowie's Duel data is kept as B §3.4 writes it: three stage bars, the stage attack sets, the three
powers, the `glitch` transform, the fire ring and the arena shifts. Two parts are added round the
stages: an entry part (uplinks) and an intermission (blackout). The chopper is an optional
destroyable part inside stage 3. Damage numbers are Duel raw values; B §1 converts them.

| Part | Kind | HP | Glowie's attacks | Adds (trigger → method, point: units) | Arena | Ends when | s |
|---|---|---|---|---|---|---|---|
| **1. Jam the Uplinks** | Entry, destroyable parts | 4 antenna dishes, 120 each. Glowie cannot be hurt | From the penthouse roof, inside the Uplink Shield: Bolts (4 damage, 52 m/s, every 0.17 s in bursts of 1 to 3). **Drone Strike** (r 2.6, track 1.8 s, warn 0.75 s, 17 damage, cooldown 14 s) | `t+5` → door, PH: 3 Glowie Agents (1 flashbang) | Fire ring at 27.8 m. Lid on. Cubicle rows and AC units as built | All four dishes are destroyed. The shield pops and he jumps into the ring | 50 |
| **2. Routine Inquiry** | Phase, Duel stage 1 | Bar 1: 1096 × `DUEL_HP_K` | Bolts, Drone Strike, shield bubble, dodge | `onBossHp(50%)` → door, H-W and H-E: 4 Midgets. `onBossHp(25%)` → air, over the north parapet: 1 Shield Drone tethered to **Glowie** (front shield until it is shot) | Unchanged | Bar 1 is empty. `glitch` transform (sim frozen, player safe) | 55 |
| **3. Armed Response** | Phase, Duel stage 2 | Bar 2: 1118 × `DUEL_HP_K` | Blast (20, splash 3.6 m, cooldown 3 s), volley **Burst Fire** (3 rounds, 3°, 0.09 s apart, cooldown 4.5 s, ×0.6), Drone Strike, **Flashbang** (r 7, warn 1.15 s, blind 1.6 s if within 110° of your view, cooldown 15 s). Power recharge ×0.85 | `t+8` → air, from the north: 6 Bitbugs. `onBossHp(40%)` → door, H-E: 2 Boom Midgets | Ring 26.8 m. Four **Live Wires** pools (r 1.7–2.3, 13 per second, electric). One **Water Cooler** spring (r 1.5, heals 9 HP/s up to 40) | Bar 2 is empty. He glitches out instead of transforming | 60 |
| **4. Blackout** | Intermission | 3 capacitor nodes on the Null Mast, 90 each | Glowie is gone. Drone Strike keeps falling on its cooldown | `t+0` → placed: 2 Cabinet Mimics among 4 crates dropped on the pad's corners. `t+2` → burrow, GR-1, GR-3: 2 Sewer Midgets. `t+18` → burrow, GR-2, GR-4: 2 Sewer Midgets | Lights out (`dark`). The **Null Mast** rises from the helipad and emits NZ-B, r 30: the whole ring. The nodes glow; they are the only light besides the fire ring | All three nodes are destroyed. Lights on, field off. The stage-3 transform finishes: he ropes down from the chopper | 45 |
| **5. Black Ops** | Phase, Duel stage 3, with an optional destroyable part | Bar 3: 1274 × `DUEL_HP_K`. Chopper: 2 engine pods, 160 each | Blast, Stun (1.0 s, 0.2 s telegraph), Ultimate (wave 30 m/s to 40 m, 38), volley **Full Auto** (7 rounds, 7°, 0.07 s apart, cooldown 5 s, ×0.4), Drone Strike, Flashbang, **Suppressing Fire** (low sweep, 240° in 1.6 s, 22 m long, warn 0.95 s, 13 damage, cooldown 15 s: jump it). Power recharge ×0.72 | `t+8` → vehicle, chopper rope over the pad: 3 Midgets, 2 Boom Midgets. `t+35` → vehicle, same rope: 2 Glowie Agents (both elite, 1 flashbang). Both drops are cancelled if both pods are destroyed first | Ring 25.5 m. Three **Server Meltdown** vents (r 1.7, warn 1.3 s, every 7 to 9.5 s, 11 damage, knockback 19). The spring refills. The chopper circles at r 34, y 14 | Bar 3 is empty: Glowie is dead | 75 |

Total 285 s (4 min 45 s). Adds: 3 + 5 + 8 + 6 + 7 = **29**, never more than 8 alive.

**Rules of the fight**

- Lockdown L3: `SH-Ba` drops 1 s after the player crosses z 56. There is no exit. Dying restarts
  at CP10 with part 1.
- Adds alive at a stage transform are stunned for 3 s after it. Adds never drop below the lid or
  outside the ring.
- Fail-safes: in part 1, after 80 s every remaining dish drops to 60 HP. In part 4, after 60 s the
  remaining nodes drop to 30 HP. No part can soft-lock.
- Each antenna dish is 7 m up. The cubicle rows do not hide them; the AC units do not block the shot.
- **Taught before it is used:** destroyable emitters (NZ-2 pylon, NZ-3 dish, projectors) → antennas
  and mast nodes. Dark plus a null field (S4, S5-E10) → part 4. Mimics among real crates in the dark
  (S4-E7) → part 4. Low laser G3 → the Suppressing Fire jump. Agent flashbangs in every section →
  Glowie's Flashbang. A Shield Drone on a carrier (L1, L2, S5-E10) → the drone on Glowie. Rope
  drops (L2 wave 2, the lift) → the chopper. Engine pods as weak spots → L06's gunship.
- **Hub loadout check** (starter MG, a new profile's spellbook, nothing carried): parts 1, 4 and
  the pods are gun targets; no part needs a spell, Blink or a second gun. Inside `SB`: rack
  `bz-roof` and depot crate D3 in the ring, standee `mg-roof` and health at the staging strip, four
  ammo boxes in the ring. Part 4 switches spells off for everyone, so it plays the same for a hub
  run and a campaign run.
- **Blink, for campaign players (optional):** through the Suppressing Fire sweep on its 0.3 s of
  invulnerability, over a Live Wires pool, out of a Drone Strike circle. Never out of the ring.
- **Drops:** two Epic guns and one boss gun (Ray Gun or Big Bullets) on the helipad; the reward
  spell **Lock-On** (B §6).
- **Red Tape** (this level's Golden Bonk modifier): boss powers recharge ×0.8; boss drops ×2.

## 11. Mechanisms, magic and explosives used

### 11.1 Mechanisms

| Mechanism | Where | New to L08 | Notes |
|---|---|---|---|
| Lockdown | L1 farm, L2 atrium, L3 roof | no (every level) | Security shutters, a "LOCKDOWN" klaxon, red neon |
| Revolving door (`rotator`) | S1 RD-1, RD-2 | yes, as a door | Collides; carries the player; 10 rpm |
| Switch, keycard | SW-1, KC-1, KC-2, BR-1, BR-2, SW-4, SW-5 | keycards are new | A keycard is a pick-up that satisfies a door's `opens` |
| Laser grid | G1–G5b (S2), G6 (S3), G7 (S4) | **yes** | 30 damage and knockback, 0.6 s flicker before on (C §3.9). Bullets pass. G3 is a low always-on beam; G5 and G5b never switch off |
| Alarm | AL1–AL4 | used in L05; reinforcements here | §8.12 |
| Lifts | Lobby lifts, glass lift, executive lift (enemy doors); freight lift (ride) | the ride is new | A `mover` that carries enemies as well as the player |
| Pneumatic tube (`zipline`) | T1 (S2 → S3), T2 (S3) | yes, upward | 16 m/s; shooting allowed; jump to drop |
| Sprinkler `slick` | S3 Y5 bridge, east ring | yes, triggered | Friction ×0.15 while on |
| `dark` | S4 hall; SB part 4 | no (L07 Lights Out is a modifier) | Render fog and a 9 m player light; enemies carry lights |
| Cooling `wind` | S4 cold aisles | no | 6 m/s² on a 4 s on, 3 s off cycle |
| Halon purge | End of S4-E8 | **yes** | Scripted kill outside the sealed core |
| Destructible target | NZ-2, NZ-3, PJ-1, PJ-2, antennas, mast nodes, chopper pods | no | Emitters are targets linked to a `nullZone` |
| Depot | Mail Room, Executive Lounge | no | PLAN §7.7 |
| Low walls | Farm pods, roof cubicles | no | 1.35 m: jump, or shoot over standing |

### 11.2 Null fields: where they are and how to turn them off

| Field | Room | Emitter | Radius | Turned off by |
|---|---|---|---|---|
| NZ-2 | S2 Evidence Lockers | Pylon at (20, 0, 34), 150 HP | 12 m | Destroying the pylon (guns, a copier-style blast) |
| NZ-3 | S3 atrium centre: the fountain and the Y5 bridge gap | Dish under the Y10 bridge, 120 HP | 10 m | Shooting the dish. The sniper rack is 25 m from it |
| NZ-4 | S4 core and the mouths of the cross-aisle | The mainframe | 14 m | Pulling breakers BR-1 and BR-2 |
| NZ-5 | S5 Boardroom, wall to wall | Projectors PJ-1, PJ-2, 80 HP each | the room | Shooting both projectors, or switch SW-5 in the AV closet |
| NZ-B | SB ring, part 4 only | Null Mast, 3 nodes of 90 HP | 30 m | Destroying the three nodes |
| mobile | Wherever a Nullifier Agent stands (S1-E1, S2-E3, S4-E8, S5-E9, S5-E10, AL4) | The Agent | 9 m | Killing him; a poise break drops it for 1.5 s |

Rules are in §9.1. A static field shows the same blue hatched disc and a hum. Every field room
has its ammo inside (§12.4), because the player has guns only there.

### 11.3 Magic in this level

| Spell | Use here |
|---|---|
| **Blink** (new) | Lasers, gaps, glass (§3). Fails on walls, closed doors, lockdown shutters and inside or into a null field |
| Chain Zap | Stuns Shield Drones and riot shields 2 s; clears Bitbug flocks; sets off copiers along the chain |
| Yeet, Yoink | Throw Boom Midgets and flashbangs back; clear the lift platform; throw a copier |
| Decoy | Draws the atrium snipers and a squad's first volley; pops inside a field |
| Mana Shield | Cast it **before** stepping into a field: it holds, draining 12 mana/s |
| Vape Cloud | Breaks a squad's sight line across the pool; does not stop a flashbang |
| Meteor Bonk | Breaks the mirror (`fragileWall`) for the Golden Bonk; cannot land inside a field |
| Sproto Swarm | Buddies pop in a field; send them at a Shield Drone from outside it |
| Lock-On (reward) | Granted after the fight; first used in L09 |

### 11.4 Explosives

Copier barrels (shock, 14 placed: 8 in S1, 3 in S5, and 3 more may be added in S2's checkpoint room
in tuning). Agent flashbangs can be shot in the air or thrown back. Bazooka rockets in SB for the
dishes and the pods. No charge packs, gas lines or mines in this level.

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

### 12.1 Checkpoints and depots

| # | Where | Position | Clock | Note |
|---|---|---|---|---|
| CP1 | S1 escalator landing, outside SH-1a | (16, 6, 56) | 1:35 | The L1 restart point |
| CP2 | S1 farm cleared (saved by L1), respawn at the break room door | (72, 6, 34) | 3:39 | |
| CP3 | S2 Blink shrine | (58, 0, 43) | 6:06 | 2:27 after CP2, the longest gap |
| CP4 | S3 Mail Room, **depot 1**, outside SH-3a | (20, 0, 72) | 6:47 | The L2 restart point |
| CP5 | S3 atrium cleared (saved by L2), at the lift dock | (40, 10, 40) | 9:45 | 2:13 of play after leaving the depot |
| CP6 | S4 lift lobby | (44, 0, 55) | 11:03 | |
| CP7 | S4 west core door | (33, 0, 23) | 12:10 | Before the hold |
| CP8 | S5 stair C landing | (51, 0, 3) | 13:30 | |
| CP9 | S5 boardroom door D-5a | (44, 0, 34) | 14:37 | |
| CP10 | SB stair D head, outside SH-Ba | (40, 0, 76) | 16:47 | The L3 restart point and the hub start |

Depot 2 (Executive Lounge, (13, 0, 45), clock 15:57) is not a checkpoint of its own: nothing
hostile lies between CP9's fight and CP10. Each depot has a depot crate, a health station, the
spell loadout bench and the ticket shop terminal (PLAN §7.7). At depot 1 the bench is where the
player first slots Blink.

### 12.2 Weapons (racks give Rare, the L08 base tier)

| Id | Type | Position | Why |
|---|---|---|---|
| `mg-lobby` | Machine Gun | S1 (72, 0, 34.5) | Riot and swarm lanes in S1-E1; the Midget waves of L1 |
| `sg-break` | Shotgun | S1 (86, 6, 43) | Riot Midgets in the laser hall, Mimics and Sewer Midgets in S2-E4, the lift |
| `sn-atrium` | Sniper | S3 (30, 0, 53.5) | Two Audit Snipers at 40 m, null dish NZ-3, the Big Obama on the Y15 bridge |
| `bz-roof` | Bazooka | SB (44, 0, 55), inside the ring | Antenna dishes, chopper pods, clumped adds |
| `mg-roof` | Machine Gun (standee) | SB (46, 0, 65) | A canonical-start boss run trades the starter MG for a Rare one |

No gun type is first found in L08.

### 12.3 Loot table

Enemy gun drops roll the L08 row of PLAN §7.3: **Common 0, Uncommon 20, Rare 44, Epic 29,
Legendary 7** (percent). Drop chances per kill stay as in `src/data/drops.js` (2% to 10%); about 7
random guns are expected over the level.

| Guaranteed drop | Where | What |
|---|---|---|
| Elite pair, Midgets | S1-E2 wave 4, the farm | 2 guns, one tier step up each |
| Elite pair, Sewer Midgets | S2-E4 squad B, the lockers | 2 guns, one step up |
| Elite pair, Midgets | S3-E6 squad R5, on the lift platform | 2 guns, one step up; they ride up with the player |
| Elite pair, Laser Bots | S4-E8 squad H6; if the purge kills them, the guns appear at the east core door (52, 0, 23) | 2 guns, one step up |
| Elite pair, Glowie Agents | S5-E10 squad A, the boardroom | 2 guns, one step up |
| Elite pair, Glowie Agents | SB part 5, the helipad | 2 guns, one step up |
| Lockdown chest L1 | S1 team table (54, 6, 30) | 1 gun, Rare or better, of a type the player does not carry if possible |
| Lockdown chest L2 | S3 lift dock (40, 10, 40) | 1 gun, Rare or better, same rule |
| Boss (also L3's reward) | SB helipad (40, 0.4, 34) | 2 Epic guns and a boss gun (Ray Gun or Big Bullets) |
| Secret weapon cache | S1 security office gun cabinet (86, 0, 54); shoot the padlock (40 HP) | 1 **Legendary** gun |

### 12.4 Ammo

Ammo is finite for every gun (PLAN §7.4). All boxes and crates below are real; Mimics are listed
in §8 and never stand in for one of these.

| Id | Kind | Section | Position | Rule it meets |
|---|---|---|---|---|
| b1 | Box, bullets | S1 | (52, 0, 62) | Before S1-E1 |
| b2 | Box, bullets | S1 | (74, 0, 37) | Rack `mg-lobby` |
| b3 | Box, shells | S1 | (26, 0, 30) | Inside the lobby (Nullifier squad C) |
| b4 | Box, bullets | S1 | (16, 6, 55) | CP1; before L1 |
| b5 | Box, bullets | S1 | (9, 6, 19) | Inside L1 |
| b6 | Box, shells | S1 | (64, 6, 43.5) | Inside L1 |
| b7 | Box, bullets | S1 | (40.5, 6, 8) | Inside L1 |
| c1 | Crate | S1 | (54, 6, 32) | L1 reward |
| b8 | Box, shells | S1 | (84, 6, 43) | Rack `sg-break` |
| b9 | Box, bullets | S1 | (72, 6, 37) | CP2 |
| b10 | Box, shells | S2 | (80, 0, 6) | Before S2-E3 |
| b11 | Box, bullets | S2 | (58, 0, 4) | Before the laser hall |
| b12 | Box, shells | S2 | (28, 0, 15) | Inside the hall (Nullifier squad C) |
| c2, c3 | Crate ×2 | S2 | (20, 0, 46), (30, 0, 46) | Inside NZ-2 |
| b13 | Box, bullets | S2 | (36, 0, 30) | Inside NZ-2 |
| b14 | Box, shells | S2 | (6, 0, 34) | Inside NZ-2 |
| b15 | Box, shells | S2 | (56, 0, 46) | CP3 |
| b16 | Box, bullets | S2 | (82, 0, 40) | Tube room, before squad C's lane |
| D1 | **Depot crate** | S3 | (20, 0, 72) | Depot 1; CP4; before L2 |
| b17 | Box, sniper rounds | S3 | (33, 0, 53.5) | Rack `sn-atrium`; inside L2 |
| b18 | Box, bullets | S3 | (24, 0, 28) | Inside L2 and inside NZ-3's edge |
| b19 | Box, shells | S3 | (64, 5, 51) | Inside L2, south ring y 5 |
| b20 | Box, sniper rounds | S3 | (62, 10, 11) | Inside L2, tube T2 landing |
| c4 | Crate | S3 | (40, 10, 38) | L2 reward |
| b21 | Box, bullets | S3 | (38, 10, 42) | CP5 |
| b22 | Box, bullets | S3 | (38, 10, 48), on the lift | The ride |
| b23 | Box, shells | S3 | (42, 10, 48), on the lift | The ride |
| b24 | Box, bullets | S4 | (41, 0, 57) | CP6 |
| b25 | Box, shells | S4 | (47, 0, 57) | Before S4-E7 |
| b26 | Box, bullets | S4 | (6, 0, 26) | Breaker 1 |
| c5, c6 | Crate ×2 | S4 | (82, 0, 21), (82, 0, 25) | Breaker 2; the real pair beside two Mimics |
| b27 | Box, shells | S4 | (33, 0, 25) | CP7 |
| b28 | Box, bullets | S4 | (40, 0, 27) | Inside the core (the hold; Nullifier in H3) |
| b29 | Box, shells | S4 | (48, 0, 27) | Inside the core |
| b30 | Box, bullets | S5 | (47, 0, 5) | CP8 |
| b31 | Box, shells | S5 | (62, 0, 4) | Supply closet |
| b32 | Box, bullets | S5 | (64, 0, 4) | Supply closet |
| b33 | Box, bullets | S5 | (44, 0, 14) | Inside the pool (Nullifier squad B) |
| b34 | Box, shells | S5 | (41, 0, 34) | CP9 |
| b35 | Box, bullets | S5 | (30, 0, 40) | Inside NZ-5 |
| b36 | Box, shells | S5 | (58, 0, 40) | Inside NZ-5 |
| D2 | **Depot crate** | S5 | (13, 0, 45) | Depot 2 |
| b37 | Box, bullets | SB | (37, 0, 74) | CP10 |
| b38 | Box, bullets | SB | (49, 0, 65) | Standee `mg-roof` |
| D3 | **Depot crate** | SB | (36, 0, 54), inside the ring | Boss section rule; inside L3 |
| b39 | Box, rockets | SB | (47, 0, 55) | Rack `bz-roof`; inside L3 |
| b40 | Box, rockets | SB | (40, 0, 15) | Inside L3, north side |
| b41 | Box, bullets | SB | (24, 0, 34) | Inside L3, west |
| b42 | Box, bullets | SB | (56, 0, 34) | Inside L3, east |
| c7, c8 | Crate ×2 | SB | (34, 0, 30), (46, 0, 38) | Dropped at the start of part 4, beside two Mimics. L3's reward is the boss drop |

Totals: **42 ammo boxes** (23 bullets, 15 shells, 2 sniper rounds, 2 rockets), **8 ammo crates**,
**3 depot crates**.

**Ammo budget.** Guns and enemies scale together with tier, so the sum is done in tier-1 numbers.
Enemy HP to remove: scripted enemies 9,290 + elite extra 990 + alarm squads 1,095 + boss bars
3,488 + boss parts 1,070 + emitters and alarm boxes 590 = **about 16,500**. Assume guns do all of
it (no spells, no copiers, nothing left to the purge or the lift), the MG does 50%, the shotgun
40%, other guns 10%.

| | Bullets (MG) | Shells (shotgun) |
|---|---|---|
| Damage asked | 8,250 | 6,600 |
| Per round that lands | 9; 65% of rounds land | 72 per shell; 60% of pellets land = 43 |
| **Rounds asked** | **1,410** | **154** |
| Placed boxes | 23 × 60 = 1,380 | 15 × 12 = 180 |
| Expected enemy drops (about 75 ammo drops, smart drops: 45% bullets, 35% shells) | 34 × 45 = 1,530 | 26 × 8 = 208 |
| **Boxes plus drops** | **2,910 = 2.06 ×** | **388 = 2.52 ×** |
| 8 crates, counted at one use of three each (50% of cap) | + 1,920 | + 256 |
| With crates | 4,830 = 3.4 × | 644 = 4.2 × |

The three depot crates are unlimited and are not counted. Both guns clear the 1.5 × rule on boxes
and drops alone. Sniper rounds and rockets are sized for their set pieces only: 16 rounds for two
snipers, a dish and a Big Obama; 6 rockets plus D3 for four dishes and two pods.

### 12.5 Power-ups

| Power-up | Position | For |
|---|---|---|
| Overshield | S3 (16, 15, 22), west end of the Y15 bridge | The lift ride. Reached by the NE stairs or a Blink from the west ring |
| Overshield | S3 lift dock, part of L2's reward | The lift ride |
| Turbo | S4 (44, 0, 44) | The breaker run |

### 12.6 Secrets

| Secret | Position | How |
|---|---|---|
| **Golden Bonk: Red Tape** | S5 (81.5, 0.5, 53.5), CEO's private bathroom | Break the mirror `fragileWall` with Meteor Bonk, a rocket or a copier thrown with Yoink. The suite is outside every null field |
| **Mana Battery** (+10 max mana, +0.5 mana/s) | S1 (48, 0.5, 25.5), at the back of lift car LB | The Nullifier's lift stays open after squad C. Easy to miss: the route turns west to the turnstile |
| Audit File 1 | S1 (62, 7.5, 3), the manager's office on the dais | Open after L1's wave 3 used its door. "Floor 1 processed 40,000 seizure notices. Floor 1 has no printer." |
| Audit File 2 | S2 (68, 0.5, 51), behind G5b in the vault | Blink through the grid. "Item 0412: one (1) spell, confiscated. Owner did not stop using it." |
| Audit File 3 | S4 (80, 2.2, 14), on top of the north-east rack row | Double jump onto the racks. "The download is the list of everyone the key opens. Your name is on it twice." |
| Secret weapon cache | S1 (86, 0, 54), security office | §12.3 |

## 13. Difficulty

**Harder than L07 because:**

- Tier 8. `maxAlive` and the role cap are the same as L07 (14 and 5), but here the fifth role is
  **anti-magic**, which removes a tool instead of adding a threat.
- Squads cover each other: a shield from the drone against guns, a field from the Nullifier
  against spells. L07's enemies could each be solved alone.
- Two hazards overlap in most rooms (lasers and a field; dark and wind; two fields), and timers
  run during fights (grids, alarms, the lift, the hold).
- Three lockdowns instead of open demolition: no retreating to a cleared corridor.
- Ammo matters more: five rooms are guns only.

Elites: two per section, always a pair (S1 Midgets, S2 Sewer Midgets, S3 Midgets on the lift, S4
Laser Bots, S5 Agents, SB Agents).

| Setting | Changes |
|---|---|
| Easy | `maxAlive` 11. One elite per pair is normal. Alarm countdowns +15 s. Grid off windows +0.5 s. Nullifier field 7 m. Hold 60 s. Flashbang blind 1.0 s. Boss adds: no Bitbugs in part 3, no second chopper drop. Mimics hum from 12 m |
| Normal | As written |
| Heroic | Fodder squads +25%, still capped at 14. Alarm countdowns 20 s. Nullifier field 11 m and no poise-break dropout. Two flashbang carriers per squad. Mimics hum from 4 m only. Mast nodes regenerate after 10 s unless all three die within that time. G3's low beam sweeps 4 m along the hall |

## 14. Engine needs

Uses **E1** (collision on nine storeys, void rescue on the roof and the lift), **E2** (line of
sight through `glass`, cover queries, perception in the dark), **E3** (nav across stairs,
escalators, lifts; flyers under ceilings), **E4** (triggers, `clearAll`, `switch`, `hold`, a ride,
`boss`, lockdowns), **E5** (`glass`, `neon`, prefabs, the three new `look`s), **E6** (doors,
switches, laser grids, ziplines, movers, rotators, hazard zones, alarms, depots, targets), **E7**
(Agent squads with a flashbang carrier, Riot, Sewer, Boom, Bitbug flock, sniper, charger), **E8**
(`nullifier`, `shieldDrone`, `cabinetMimic`), **E10** (Blink, the shrine, `nullZone`, Lock-On),
**E11** (copier barrels), **E12** (Glowie's Duel port and the part script), **E13**, **E14**,
**E15** (the canonical boss entry moves from `S4-E4` to section `SB`, encounter `SB-BOSS`),
**E16**, **E17** (loot table, ammo boxes and crates, smart drops). Not used: E9.

**Needed beyond PLAN §10**

| # | Need | Why |
|---|---|---|
| N1 | `nullZone` rules in full: a field owned by a static emitter (target or switch link) or by an enemy; spell projectiles stop at the edge; Blink cannot start or end inside; Mana Shield drain; enemy magic fizzles | PLAN §6.2 says only "spells fizzle inside" |
| N2 | A `ride` objective: fixed duration, enemies can stand and path on a moving platform, anything left behind despawns without loot | S3-E6. E4 lists no ride objective and E3's lift nav links do not cover fighting on the mover |
| N3 | An end-of-objective script that deals damage by region and seals doors | The halon purge |
| N4 | Targets parented to a mover; boss states "cannot be hurt" and "absent"; a part that spawns a mover (the mast) and a temporary `dark` zone | Chopper pods, parts 1 and 4 |
| N5 | The `alarm` spec: countdown, cut by damage or Interact, reinforcement squad, grid speed-up | PLAN §8 names it only. Should match L05 |
| N6 | **Spell change:** Blink passes any `glass` solid up to 0.5 m thick at any height, not only rails; it fails on a lockdown shutter with the mana refunded | Use 3 of Blink (S5). Without it, S5's partitions become 1.2 m rails and use 3 is weaker |
| N7 | Laser grids let bullets through in both directions and can be given a partial height (G3) and `off: 0` (always on) | S2 |
| N8 | Mimic support: an enemy that renders as the `ammoCrate` prefab while dormant, a positional hum loop, and a validator rule for its placement (§9.3) | `cabinetMimic` |
| N9 | Loot delivery for kills the player cannot reach (the purge) | S4-E8 elites |

**Notes back to PLAN.md**

1. **§3: the enemy budget and the seconds table do not agree.** 200 to 220 enemies at this level's
   mix is about 29 minutes of clear-all combat by the table. This document fits by putting 98
   enemies in stated-time beats and 16 behind alarms, and still lands 1:32 over par. The lockdown
   rule (25 to 45 enemies in 2 to 3.5 minutes, clear-all) makes it tighter: each lockdown here is
   at its minimum (26 and 25 enemies) and is mostly fodder for that reason. Either the budget drops
   to about 150 for L08, or the table's fodder and Agent costs are re-fitted after the L01 slice.
2. **§4: "origin at the south-west ground corner" with `+z` south** puts a section in negative z.
   This document uses the corner with the smallest x and z.
3. **§9 against B §1:** PLAN wants a 4 to 5.5 minute fight; B tunes each of three stages to 90 to
   150 s before any added part. With an entry part and an intermission the stages here have 55 to
   75 s each, so Glowie needs a lower `DUEL_HP_K` or a per-boss factor. That is a fingerprint change.
4. **Hub start:** the starter MG is Common and tier 1 against a tier-8 boss. `SB` holds a Rare MG
   standee, the bazooka rack and a depot crate so the run is possible; the hub contract should say
   whether picking those up is allowed in a verified run.
5. **§3 says 7 to 9 combat encounters;** this level has 10 and the boss, as its brief asked.
6. **§5.6 and checkpoints:** a lockdown saves a checkpoint when it ends, so the "8 to 10
   checkpoints" count fills up fast; this level has exactly 10 with two of them lockdown saves.

## 15. Bot route and tests

**Bot route** (nav-following autopilot, god mode, fixed seed). Waypoints in section-local
coordinates:

| Section | Waypoints and actions |
|---|---|
| S1 | (48, 0, 67) → RD-2 → (48, 0, 40) fight → hold SW-1 (48, 0, 33.5) → D-1 (20, 0, 45.5) → escalator → (14.25, 6, 47) → cross z 39 → fight L1 from (40.5, 6, 25.5) → SH-1b → (86, 6, 43) take `sg-break` → (76, 6, 22) → D-1B → stair B top |
| S2 | (82, 0, 4) → shoot AL2 → (56, 0, 13) fight → D-2 → hall west, waiting at G1, G2, jumping G3, waiting at G4 → D-2b → shoot NZ-2 → KC-1 (9, 0, 50) → fight → D-V → shrine (58, 0, 43) → Blink east through G5 → tube T1 |
| S3 | (10, 0, 74) → depot → cross z 52 → take `sn-atrium` → shoot NZ-3 → fight L2 from the floor, then escalator → Y5 bridge → Blink the gap → T2 → Y10 bridge → lift dock → ride 60 s at the platform centre |
| S4 | (44, 0, 55) → shoot AL3 → cross-aisle west → BR-1 → east → wait or Blink G7 → BR-2 → west core door → SW-4 → hold 75 s at (44, 0, 19) → D-4N → stair C |
| S5 | (51, 0, 3) → shoot AL4 through E2's door → fight at (44, 0, 22) → D-5a → shoot PJ-1, PJ-2 → fight → KC-2 → D-5b → depot → D-5c → stair D |
| SB | (40, 0, 76) → take `mg-roof` → cross z 56 → take `bz-roof` → dishes A2, A1, A4, A3 → boss → mast nodes → boss |

A second bot run uses no spells at all, taking the ways round in §3 (G5 is skipped by teleport in
that run only, because the shrine grants Blink before G5).

**Tests**

- Validator: reachability from every checkpoint; every solid at least 0.5 m; doorways at least
  2.2 × 2.6 m; no section over 600 solids; rack `why` strings; ammo placement rules of §7.4 for
  every row of §12.4.
- Pacing estimate from the level data equals 1,292 s ±10 s and is within ±120 s of 1,200 s.
- Enemy count: 201 scripted, 217 with all four alarms. `maxAlive` never above 14 in a bot run.
- Lockdowns: each has entry and exit shutters, at least 3 spawn points on different sides, 3 to 5
  waves, 25 to 45 enemies; Blink, Magic Carpet and Yeet-jumps cannot leave the room; dying
  restarts at wave 1 with the shutters open; the last two enemies get marked after 12 s.
- Null fields: each of the eleven spells fizzles inside each field and works 1 m outside it; each
  field's off switch works; killing a Nullifier returns 25 mana.
- Mimics: none within 6 m of a checkpoint, rack or reward; no row of §12.4 is a Mimic; a dormant
  Mimic takes double damage.
- Lift ride: lasts 60 s ±1 s; enemies off the platform at the end despawn; drops made on the
  platform arrive at the top.
- Hold: 75 s of progress; purge kills everything outside the core; elite guns appear at (52, 0, 23).
- Alarms: cutting an alarm cancels its squad; the same seed gives the same countdown and squad.
- Boss: a canonical-start bot (starter MG, Goo Bolt only) wins on 3 seeds; no part lasts over its
  fail-safe; adds never exceed 8 alive; boss goldens are re-pinned with the new encounter id.
- Determinism: two runs of the full bot route with one seed give the same state hash.

## 16. Build tasks

1. `prefabs/office.js`: the 13 prefabs of §7, with a prefab test (solid counts, footprints).
2. `L08/index.js`: header, section order `S1, S2, S3, S4, S5, SB`, par 1,200 s, tier 8, the cutscene card.
3. `L08/S1.js` blockout (§6.1). Check the escalator, the well and the 22 pods in the map export.
4. `L08/S2.js`, `S3.js`, `S4.js`, `S5.js`, `SB.js` blockouts. One map export per floor of S1 and per ring of S3.
5. Mechanisms, section by section: doors, switches and keycards; grids G1 to G7; tubes; lifts; slick, dark and wind zones; depots; shutters.
6. Null fields NZ-2 to NZ-5 with their emitters and switches (needs N1).
7. Encounters S1-E1, S2-E3, S2-E4, S4-E7, S5-E9, S5-E10 with their squads; then the four alarms (N5).
8. Lockdowns L1 and L2: wave tables, thresholds, rewards, checkpoints.
9. The lift ride S3-E6 (N2) and the hold S4-E8 with the purge (N3, N9).
10. The three new enemies' data and `look`s (with the E8 owner); Mimic placement and the validator rule (N8).
11. Racks, the loot table rows, the secret cache, every ammo box and crate of §12.4, power-ups, the Golden Bonk, the Mana Battery, three Audit Files.
12. `SB-BOSS` with the boss agent: the part script of §10, antennas, mast, chopper, the add schedule, fail-safes (N4).
13. Checkpoints CP1 to CP10 and the two depots; the bot route and the no-spell route.
14. Tests of §15; run the validator's pacing estimate and tune counts, not layout, if it is outside ±10 s of 1,292.
15. Easy and Heroic deltas (§13).
16. Hand the canonical boss change (`S4-E4` → `SB-BOSS`) to the pin PR (PLAN §12); do not re-pin in the level PR.
