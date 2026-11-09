# L10: Hellfire Caldera

Plan only. Follows `docs/campaign/PLAN.md` (cited as **PLAN §x**) §14. Replaces the L10 section of
`docs/codex/C-level-designs.md`. Engine spec: `C-campaign-levels.md` (**C §x**). Boss spec:
`C-bosses-sproto-duel.md` (**B §x**).

## 1. Header

| Field | Value |
|---|---|
| Stage | `volcano`, open volcano (ridge, lava tubes, bridges, geyser basin, rim, caldera, vent shaft) |
| Lighting | Red dusk under an ash sky. S2 is a `dark` zone lit by lava. SB mood goes to `0xff4a1a` (B §3.5). S6 is full eruption glow |
| Tier | 10 |
| Par | 22 min. Estimate in §4: **22 min 44 s** (1,364 s) |
| Jetpack | `'pickup'`: granted on the raft at the start of S6. Double jump until then |
| Enemy total | **238** (82 in seven regular encounters, 26 Jade Dragon adds, 44 Tinubu adds, 86 escape flyers) |
| Route | **1,190 m** on foot (S1 240, S2 156, S3 246, S4 185, S5 347, SB 16), then the escape: 120 m climb and 223 m flight |
| Sections | 7: `S1` Ridge Trail, `S2` Lava Tubes, `S3` Bridge Chain, `S4` Geyser Fields, `S5` Rim Descent, `SB` The Caldera, `S6` Eruption Escape |
| Encounters | 10: `S1-E1`, `S2-E2`, `S2-E3` **[L]**, `S3-E4`, `S3-MB` **[L]**, `S4-E5`, `S5-E6`, `S5-E7`, `SB-BOSS` **[L]**, `S6-ESC` |
| Lockdowns (PLAN §5.6) | 3: the Kiln (`S2-E3`, 44 × 40 m), the Spire Roost (`S3-MB`, 64 × 48 m), the Caldera (`SB-BOSS`, disc 56 m across) |
| Finales | Mini-boss **Jade Dragon** (3 parts, 2 min 30 s), final boss **Tinubu** (5 parts, 5 min 15 s), **eruption escape** (1 min 35 s), credits |
| Unlockables | Hellfire Breath (Tinubu), the tenth Mana Battery (S4), Golden Bonk: Iron Sproto. No new gun type |
| Base gun tier | Epic (PLAN §7.3). No crafting, no Weapon Box, no resource drops |

## 2. Concept

The final exam. Each section tests one thing the campaign taught, in the order it was taught, and
each is harder than the level that taught it because the volcano adds a way to die that the
original level did not have.

| Section | Discipline | Taught in | What makes it harder here |
|---|---|---|---|
| S1 Ridge Trail | Sniper duel across a 70 m chasm | L05 | You stand on a 3 to 4 m ledge. Midgets drop in behind you while lasers track you. Knockback means a void rescue |
| S2 Lava Tubes | Close quarters | L02 | A 4 m tube with a lava channel down one side, burrowers behind you, then a sealed room (the Kiln) with the new Tinubu Imp |
| S3 Bridge Chain | Explosives | L07 | You plant and shoot charges on rope bridges under bouncing bombs. Then the Jade Dragon, which sits on spires you can blow out from under it |
| S4 Geyser Fields | Magic | L03 | Islands in a lava basin. Bullets barely work on half the enemies, two Leeches drain mana, and a Nullifier guards the last conduit |
| S5 Rim Descent | Heavy weapons | L06 | An armoured van on an 8 m ledge road with no room to flank, rockets from above, then an elite squad and an Imp on the way down |
| SB The Caldera | Everything | — | Tinubu: chains, three Duel stages, a floor that breaks into islands, a ring that shrinks |
| S6 Eruption Escape | Air combat | L04 | A vertical climb ahead of rising lava, then a flight between sinking rafts of debris |

It differs from L09 (open, any order) by being strictly linear and by having three finales. That
leaves less time for ordinary fights, so they are short and sharp (§4).

**Cutscene cards.** Start: *"Hellfire Caldera" / "Tinubu the Unshackled Demon." / "This is the
audit."* Boss card (2.6 s): portrait `ui/bosses/tinubu.png`, *"Infects you to make you sell your
tickets."* After the boss: *"ERUPTION" / "The Demon is down. The volcano disagrees." / "Fly."*
Then credits, then: Legendary difficulty and the modifier menu unlock.

## 3. What the player has and learns

**Guns.** Whatever was carried from L09, plus `S1-cache` at the start: machine gun, shotgun, sniper,
bazooka, all at L10's base tier, **Epic**. Rocket Crates on the rim (S5). A bazooka rack inside
`SB`. Every gun uses finite ammo, the machine gun included; boxes, crates and the budget are in §12.

**Spells held (14), no new shrine:** Goo Bolt, Chain Zap, Yeet, Sproto Swarm, Mana Shield, Decoy,
Meteor Bonk, Yoink, Blink, Time Bubble, Magic Carpet, Pump It, Vape Cloud, Lock-On. Reward for
beating Tinubu: **Hellfire Breath** (B §6). It is put on the selected-spell slot at once, so it
can be used in the escape, and it is kept for replays.

**Unlockables in this level.** Hellfire Breath; the tenth **Mana Battery** (on island G7 in S4,
§12); the Iron Sproto modifier; three Audit Files. No new gun type. Magic has no levels: a player
with all ten batteries has 200 mana and 10 mana/s, a player with none has 100 and 5. The level is
built for 100 and 5: no route needs a spell (S4 has a stone-and-geyser route), the two conduits
cost one 30-mana Chain Zap each, and S4 holds three mana blooms and a Mana Surge.

| Section | Strong spells | Why |
|---|---|---|
| S1 | Decoy, Mana Shield, Vape Cloud, Time Bubble | Snipers and the Spotter Drone lock onto the standee. The shield eats one sniper round. The cloud breaks line of sight on a ledge with no cover. The bubble holds drop-in Midgets |
| S2 | Chain Zap, Yeet, Goo Bolt, Sproto Swarm | Zap stuns riot shields 2 s and pops the Tax Shield. Yeet shoves a phalanx into the lava channel. Goo puddles fill a 4 m tube, cut an Imp's charge short and put out its fire trail |
| S3 | Yoink, Yeet, Meteor Bonk, Magic Carpet | Yoink throws bombs back and carries barrels and charge packs. Yeet clears Boom Midgets off a bridge. Bonk breaks the barricade or a spire. The carpet saves you when Bridge 2 drops |
| S4 | All of them. Chain Zap, Goo Bolt, Yeet, Mana Shield, Magic Carpet, Pump It | Wisps take 200% from spells. Goo then guns for the Bark Brute, or Yeet it into lava. The shield takes the Leech drain. The carpet crosses lava. Two conduits need Chain Zap |
| S5 | Meteor Bonk, Yeet, Time Bubble, Decoy, Blink | Bonk strips van armour for 6 s. Yeet and Time Bubble deal with slow rockets. Decoy turns the van. Blink gets past it to the engine block |
| SB | Mana Shield, Time Bubble, Magic Carpet, Blink, Goo Bolt | Shield counts as shielding against the Ultimate (×0.35) and takes Infection's drain. Bubble slows seekers and meteors. Carpet and Blink move between islands. None is required (§10.2) |
| S6 | Chain Zap, Yeet, Mana Shield, Hellfire Breath, Magic Carpet | Zap kills a Bitbug flock. Yeet pushes Balloon Midgets into Jet Obamas. The carpet is 3.5 s of free hover when fuel runs out |

## 4. Time budget

Rules used. Enemy seconds come from the PLAN §3 table, and combat beats add 30%. PLAN §3 has no
row for the PLAN §5.3 enemies, so this document maps them: `hexWisp` 5, `manaLeech` 8, `nullifier`
8, `bombTosser` 8, `magmaSlug` 8, `spotterDrone` 8, `rocketObama` 9, `barkBrute` 30, `auditVan` 40,
`tinubuImp` 20 (a charger with 240 HP against 180 and a fire trail: 14 × 1.4). Elite ×2.
"Traversal" counts only the metres walked outside an encounter's space; movement inside a fight is
part of its 30%. Adds inside a finale are paid for by the finale's block, because PLAN §3 gives one
number for a boss. Escape flyers are obstacles on an `escape` objective and are not summed.

| # | Beat | Sec. | Arithmetic | Seconds | Running | Intensity |
|---|---|---|---|---|---|---|
| 1 | Walk in, open the cache | S1 | 40 m ÷ 5.5 = 7, cache 13 | 20 | 0:20 | 0.1 |
| 2 | `S1-E1` Counter-Audit (sniping) | S1 | 3 snipers (1 elite) 32 + drone 8 + 7 midgets 21 + 1 boom 3 = 64, × 1.3 | 83 | 1:43 | 0.6 |
| 3 | Trail to the tube mouth | S1 | 50 m ÷ 5.5 | 9 | 1:52 | 0.1 |
| 4 | `S2-E2` Tube Rats (close quarters, Imp alone) | S2 | 2 riot 16 + acolyte 8 + 3 sewer 9 + 1 Imp 20 = 53, × 1.3 | 69 | 3:01 | 0.7 |
| 5 | `S2-E3` **[L]** The Kiln, 4 waves | S2 | 13 midgets 39 + 6 sewer 18 + 5 boom 15 + 1 Imp 20 = 92, × 1.3 | 120 | 5:01 | 0.8 |
| 6 | Exit tube to Mesa 0 | S2, S3 | 30 m ÷ 5.5 | 5 | 5:06 | 0.1 |
| 7 | `S3-E4` Demolition Row (explosives) | S3 | 2 tossers 16 + 4 boom 12 + 2 flyers 10 + 6 midgets 18 + slug 8 = 64, × 1.3 = 83, plant and fire the charge 10 | 93 | 6:39 | 0.75 |
| 8 | Depot 1 on Mesa 2, Bridge 3 | S3 | 45, 20 m ÷ 5.5 = 4 | 49 | 7:28 | 0.0 |
| 9 | `S3-MB` **[L]** Jade Dragon, 3 parts | S3 | Mini-boss block, bottom of the PLAN range | 150 | 9:58 | 1.0 |
| 10 | Roost exit to the first island | S3, S4 | 40 m ÷ 5.5 | 7 | 10:05 | 0.1 |
| 11 | `S4-E5` Spell Check (magic) | S4 | 4 wisps 20 + 2 leeches 16 + Bark Brute 30 + nullifier 8 = 74, × 1.3 | 96 | 11:41 | 0.75 |
| 12 | Basin exit to the rim top | S4, S5 | 40 m ÷ 5.5 | 7 | 11:48 | 0.1 |
| 13 | `S5-E6` Armoured Push (heavy weapons) | S5 | van 40 + riot 8 + 4 midgets 12 + 2 Rocket Obamas 18 = 78, × 1.3 | 101 | 13:29 | 0.85 |
| 14 | Rest of Leg B | S5 | 30 m ÷ 5.5 | 5 | 13:34 | 0.2 |
| 15 | `S5-E7` Above and Below (elite squad) | S5 | 2 elite agents 24 + 4 midgets 12 + Imp 20 = 56, × 1.3 | 73 | 14:47 | 0.7 |
| 16 | Leg D foot, Depot 2 | S5 | 30 m ÷ 5.5 = 5, depot 45 | 50 | 15:37 | 0.0 |
| 17 | Gate tunnel | S5, SB | 40 m ÷ 5.5 | 7 | 15:44 | 0.1 |
| 18 | `SB-BOSS` **[L]** Tinubu, 5 parts | SB | Boss block: card 3 + 45 + 65 + transform 5 + 75 + 50 + transform 5 + 62 + death 5 | 315 | 20:59 | 1.0 |
| 19 | "ERUPTION" card, take the jetpack | S6 | stated | 10 | 21:09 | 0.0 |
| 20 | `S6-ESC` Eruption escape | S6 | stated: shaft 45 + flight 40 + margin 10 | 95 | 22:44 | 0.9 |
| | **Total** | | | **1,364 s = 22 min 44 s** | | |

Check by kind: finales 560 + regular combat 625 + traversal 56 (320 m) + depots 90 + stated 33 = 1,364.
Par 22:00 ± 2:00, so it passes with 76 s to spare. A fast replay at 70% of par is 15:24.

**Three finales make the ordinary fights short.** The finales take 560 s, 41% of the level. A
20-minute level with one 285 s boss spends 24% on its finale and has about 700 s for eight
encounters. L10 has 625 s for seven: 89 s each on average, and the six that are not a lockdown
average 84 s and 9.5 enemies. Encounters `S1-E1`, `S2-E2`, `S3-E4`, `S5-E6` and `S5-E7` are
three to five small squads each. Their difficulty comes from where the player is standing.

**Intensity.** No two beats above 0.8 are adjacent: the Kiln (0.8) is followed by E4 (0.75), a
depot sits before each boss, and E6 (0.85) is followed by E7 (0.7). The boss runs straight into
the escape by design; the 10 s card and reward screen is the only pause.

**Checks on the finale blocks.** Add-seconds inside each block: Jade Dragon 90 of 150, Tinubu 195
of 315. Both are affordable because adds are mostly fodder that comes to the player, and because
23 of Tinubu's 44 adds arrive in parts 1 and 4, when he cannot be hurt anyway.

## 5. Overview map

```
 S1 RIDGE TRAIL 240 m           S2 LAVA TUBES 156 m                S3 BRIDGE CHAIN 246 m
 ▪ ▪ ▪ snipers on the far wall ▪ ▪
 ~ ~ ~ ~ chasm 70 m ~ ~ ~ ~ ~ ~                                     ▲A  ▲B  spires
 [CP1 cache]═P1══E1══P2═[CP2]─►─tubeA─E2─fork─tubeB─[CP3]▮[L] KILN▮[CP4]─►─mesa0═b1═E4═mesa1▓═b2═mesa2[D1][CP5]═b3═▮[L] ROOST: JADE DRAGON▮[CP6]
                                 imp alone ┘        E3, 4 waves                 charges   collapses              ▲C            │
                                                                                                                              ▼
 S5 RIM DESCENT 347 m (square spiral, 30 m down)                    S4 GEYSER FIELDS 185 m                                    │
   ┌─────────── Leg C ◄── E7 elite squad ◄────────┐
   │  L3 cave      [Golden Bonk cave]             │ Leg B: debris, lava channel, [CP8]
 Leg D  ┌──────── pit: view of SB ────────┐       ▲
   ▼ L4 │                                 │       │ Rocket Ledge
 [D2]───┴─gate tunnel─[CP9]▮              │       │
 [CP7 rim top]══ Leg A ══ E6 van ═════════╧═══════┘◄──── exit shelf ◄═C2═(G8)◄•••C1•(G5)◄─(G2)◄─[G1]◄──────────────────────────┘
   Rocket Crates ×2                                                    E5 spell check: islands, geysers, lava

 SB THE CALDERA (disc r 28)                 S6 ERUPTION ESCAPE
 ▮[L] TINUBU, 5 parts▮──exit──►[CP10 raft, jetpack]──shaft 120 m up──lip──R1──R2──R3──R4──►[DROP SHIP]──► credits
      bazooka rack, Rocket Crate inside       rising lava 1.5 m/s      flight 223 m, ash wall behind
```

`[L]` lockdown arena, `▮` lockdown door, `[CPn]` checkpoint, `[D1]` `[D2]` depots, `═` ledge, bridge or road.

Height of each section's local `y = 0` above the caldera floor: S1 +84, S2 +84, S3 +80, S4 +74,
S5 +34 (rim top; Depot 2 is at local −30), SB 0, S6 −12 (raft), drop ship at S6 local +140.

## 6. Sections

Conventions for every blockout table. Metres. `+x` east, `+z` south, `y` up, as PLAN §4. The local
origin is the section's south-west ground corner, so `x` runs from 0 east and **every `z` is 0 or
negative** (north is −z). `at` is as in `kit.js`: the centre of a box or sphere, the base centre of
a cylinder or cone. Sizes are x × y × z. A ramp is given as length × rise × width with its two
ends. "×N" rows list N positions. Prefabs are in §7. Jump gaps are 3 m or less unless the row says
otherwise; the validator's reachability pass is the proof, and positions may move ±1 m in blockout.
Ammo boxes, ammo crates, chests and secrets are listed once, in §12, not in these tables.

### 6.1 S1 Ridge Trail (240 × 110 m, y −62 to +36)

```
 z                                                                        N ↑
-110 ┌───────────────────── far wall (top y +36) ───────────────────────────────┐
 -78 │         FP1▪ y+6    FP2▪ y−3       FP3▪ y+10   FP4▪ y+3    FP5▪ y+12     │
     │ ~ ~ ~ ~ ~ ~ chasm 62 to 71 m, lava at y −60, kill plane y −30 ~ ~ ~ ~ ~ ~ │
 -45 │ ~ ~ ~ ~ ~ ▲SP1 ~ ~ ~ ~ ~ ~ ▲SP2 ~ ~ ~ ~ ▲SP3 ~ ~ ~ ~ ~ ~ ▲SP4 ~ ~ ~ ~ ~ ~ │
 -17 │┌──────┐           ┌ PULPIT 1 ┐          ┌ PULPIT 2 ┐ y+4        ┌───────┐│
     ││CACHE │═trail A═══│▪ ▪ ▪   R1│═trail B══│▪ ▪ ▪  AF1│═trail C════│ CP2   ├► S2
  -5 │└─CP1──┘ o  o  o   └──────────┘ 3 m wide └──────────┘ 4 m wide   └───────┘│
   0 └──────────────── cliff behind the trail (top y +35) ──────────────────────┘
     x=0     30          80        104        150        176          215     240
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| S1-cliffS | box | 240 × 50 × 5 | (120, 10, −2.5) | rock | Wall behind the trail. Rope drop-ins come over its top |
| S1-land | box | 30 × 16 × 12 | (15, −8, −11) | rock | Landing shelf, top y 0, x 0–30, z −17 to −5. CP1 |
| S1-trailA | box | 50 × 16 × 4 | (55, −8, −7) | rock | 4 m ledge, x 30–80 |
| S1-pulpit1 | box | 24 × 16 × 10 | (92, −8, −10) | rock | First Pulpit, x 80–104, z −15 to −5 |
| S1-trailB | ramp | 46 × 4 × 3 | low (104, 0, −6.5) → high (150, 4, −6.5) | rock | 3 m ledge that climbs 4 m. The narrowest stretch |
| S1-pulpit2 | box | 26 × 20 × 12 | (163, −6, −11) | rock | Sniper's Pulpit, top y 4, x 150–176, z −17 to −5 |
| S1-trailC | ramp | 39 × 4 × 4 | high (176, 4, −7) → low (215, 0, −7) | rock | 4 m ledge back down |
| S1-mouth | box | 25 × 16 × 12 | (227.5, −8, −11) | rock | Tube-mouth shelf, x 215–240. CP2 |
| S1-wallE | box ×2 | 4 × 50 × 93; 4 × 31 × 12 | (238, 10, −63.5); (238, 19.5, −11) | rock | East wall. The second box is the lintel over a 4 × 4 m tube mouth |
| S1-farwall | box | 240 × 100 × 30 | (120, −14, −95) | rock | North side of the chasm, z −110 to −80 |
| S1-FP1…FP5 | `perch` ×5 | — | ledge tops at (60, 6, −78), (100, −3, −78), (140, 10, −78), (172, 3, −78), (205, 12, −78) | rock | Sniper perches, 62 to 71 m from the trail. Relocation links: FP1↔FP3, FP2↔FP3, FP4↔FP5 (2 s out of sight) |
| S1-SP1…SP4 | `spire` ×4 | r 3; h 56, 62, 50, 66 | bases (70, −62, −45), (122, −62, −40), (160, −62, −52), (198, −62, −44) | rock | Sightline breakers. Each hides about 8 m of trail from two perches |
| S1-lava | box | 240 × 2 × 70 | (120, −61, −45) | lava | Chasm floor, seen only |
| S1-kill | killPlane | y −30 | — | — | Void rescue to the last safe ledge, −25% HP |
| S1-cache | cache | — | (15, 0, −12) | crate | MG, shotgun, sniper, bazooka, all Epic. One ammo box of each type beside it |
| S1-cacheCover | box ×2 | 3 × 2 × 1; 3 × 1.2 × 1 | (22, 1, −16.5); (12, 0.6, −16.5) | crate | Cover on the chasm side of the landing |
| S1-colA1…A3 | `basalt(2.2)` ×3 | r 0.8 | (40, 0, −8.2), (55, 0, −8.2), (70, 0, −8.2) | rock | Cover on trail A. 2.4 m left to pass |
| S1-p1Cover | box ×3 | 3 × 2 × 1; 3 × 1.2 × 1; 3 × 2 × 1 | (85, 1, −14.5); (92, 0.6, −14.5); (99, 1, −14.5) | rock | Firing line on Pulpit 1 |
| S1-p1Boulder | `boulder(1.4)` | — | (84, 0.9, −8) | rock | Cover against Cave R1 |
| S1-caveR1 | `caveMouth` | 3 × 3 | (100, 0, −5), opens north | rock | Door spawner, E1 squad c |
| S1-bB1, bB2 | `boulder(1.0)` ×2 | — | (118, 1.8, −7.6), (138, 3.6, −7.6) | rock | The only cover on trail B |
| S1-p2Cover | box ×3 | 4 × 2 × 1; 3 × 1.2 × 1; 4 × 2 × 1 | (154, 5, −16.5); (163, 4.6, −16.5); (172, 5, −16.5) | rock | Firing line on Pulpit 2, with a gap to scope through |
| S1-p2Boulder | `boulder(1.6)` | — | (170, 5, −9) | rock | Cover against drop-ins |
| S1-nook | box ×2 | 6 × 1 × 3; 2 × 1 × 3 | (166, 1.5, −18.5); (170, 2.5, −18.5) | rock | Step and nook 2 m under the north lip of Pulpit 2. Audit File 1 |
| S1-cC1, cC2 | `basalt(1.2)` ×2 | r 0.8 | (190, 2.6, −8.4), (204, 1.1, −8.4) | rock | Cover on trail C |
| S1-mouthCover | box ×2 | 3 × 1.2 × 1 | (222, 0.6, −15.5), (230, 0.6, −15.5) | rock | Cover on the last shelf |
| S1-drops | markers D1–D3 | — | (128, 2.1, −6.5), (146, 3.7, −6.5), (158, 4, −9) | — | Rope drop points, E1 squad e |
| S1-neon | disc ×12 | r 0.5 | every 20 m on the trail centre line | neon | Critical path |

Mechanisms: kill plane and void rescue, weapon cache. Transition out: seamless, through the tube
mouth at (236, 0, −11) into S2's Tube A.

### 6.2 S2 Lava Tubes (160 × 90 m, y −1 to +10, `dark`)

```
 z                                                          K-N
-75               T2 (dead end, AF2)                       ┌──┐
-65              ┌──┐                       ┌──────────────┘  └────┬──► K-E
-52          ┌───┘  └───┐                   │ m  ●      ║   ●      │
-48 ┌~~~~~~~~┤          ├──────[A2]──────── ▮    ▪      ╬      ▪   │
 S1►│      ▮ │ FORK  ●  │   tube B  [CP3]  IN  ●   KILN ║   ●     OUT▮──exit tube──► S3
-42 └────────┤          ├──[A1]──────────── ▮    ▪      ╬      ▪   │
-38          └──────────┘                   │ m  ●      ║   ●      │
-25                                         └────┐  ┌──────────────┘
                                                 └──┘ K-S
    x=0    30 44        58                  88  96 100 108 111    132        156
    ~ lava channel   ▮ barricade or lockdown door   ● pillar   ▪ low wall   m mounds   ║ lava channel   ╬ bridge
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| S2-tubeA-floor | box | 44 × 1 × 4 | (22, −0.5, −46) | rock | Walkway, x 0–44, z −48 to −44 |
| S2-tubeA-lava | box | 44 × 0.5 × 2 | (22, −0.75, −43) | lava | Channel on the north side, 0.5 m below the walkway. `hazardZone` lava |
| S2-tubeA-walls | box ×2 | 44 × 5 × 1 | (22, 2, −48.5), (22, 2, −41.5) | rock | Tube sides |
| S2-tubeA-roof | box | 44 × 1 × 8 | (22, 4.5, −45) | rock | Clear height 4 m |
| S2-barricade | box | 1 × 1.2 × 1.6 | (30, 0.6, −47.2) | crate | Phalanx cover. Leaves a 2.4 m gap beside the channel |
| S2-tubeA-cover | `basalt(1.2)` ×2 | r 0.6 | (12, 0, −47.3), (21, 0, −44.7) | rock | Player cover on the approach |
| S2-fork-floor | box | 14 × 1 × 14 | (51, −0.5, −45) | rock | Junction room, x 44–58, z −52 to −38 |
| S2-fork-walls | box ×7 | 1 thick, 6 high | perimeter of the floor; gaps: west z −48 to −42, north x 49–53, east z −47.5 to −42.5 | rock | Room walls |
| S2-fork-roof | box | 16 × 1 × 16 | (51, 6.5, −45) | rock | Ceiling |
| S2-fork-pillar | cylinder | r 0.9, h 6 | (51, 0, −45) | pillar | Centre pillar |
| S2-fork-cover | box ×2 | 2 × 1.2 × 1; 2 × 2 × 1 | (47.5, 0.6, −50); (55.5, 1, −40.5) | rock | Cover |
| S2-fork-mounds | disc ×3 | r 0.8 | (47, 0, −41), (54, 0, −49), (40, 0, −46) | dirt | Burrow points, E2 squad b |
| S2-T2 | `tubeSeg` | 20 × 4 × 3.5 | from (51, 0, −52) north to (51, 0, −72) | rock | Dead end. Audit File 2 at the end |
| S2-tubeB-floor | box | 30 × 1 × 5 | (73, −0.5, −45) | rock | The charger straight, x 58–88, z −47.5 to −42.5 |
| S2-tubeB-walls | box ×6 | 1 thick, 5 high | both sides of the floor, leaving niche A1 (x 66–68, 2 m deep, south) and A2 (x 78–80, 2 m deep, north); each niche has a back and two sides | rock | Niches are where you step out of a charge |
| S2-tubeB-roof | box | 30 × 1 × 9 | (73, 4.5, −45) | rock | Ceiling |
| S2-kiln-floorW | box | 20 × 1 × 40 | (98, −0.5, −45) | rock | West floor, x 88–108, z −65 to −25 |
| S2-kiln-lava | box | 3 × 0.5 × 40 | (109.5, −0.75, −45) | lava | Channel across the room, north to south |
| S2-kiln-floorE | box | 21 × 1 × 40 | (121.5, −0.5, −45) | rock | East floor, x 111–132 |
| S2-kiln-bridges | box ×2 | 3 × 0.5 × 5 | (109.5, −0.25, −55), (109.5, −0.25, −35) | stone | Two crossings, tops at y 0 |
| S2-kiln-walls | box ×10 | 1 thick, 9 high | perimeter x 88–132, z −65 to −25; gaps: west z −47.5 to −42.5 (entry), east z −47 to −43 (exit), north x 118–122 (K-N), south x 96–100 (K-S), east z −60 to −56 (K-E) | rock | Room walls |
| S2-kiln-roof | box | 46 × 1 × 42 | (110, 9.5, −45) | rock | Ceiling. No way out upward |
| S2-L1-in, S2-L1-out | door slab ×2 | 0.6 × 5 × 5; 0.6 × 5 × 4 | (88, 2.5, −45); (132, 2.5, −45) | stone, `neon` trim | Lockdown doors (basalt slabs). Threshold `disc` line at x 94 |
| S2-kiln-pillars | `basalt(9)` ×6 | r 1.0 | (95, 0, −53), (95, 0, −37), (103, 0, −45), (116, 0, −55), (116, 0, −35), (125, 0, −45) | rock, tag `chargeStop` | Cover. An Imp that hits one is stunned |
| S2-kiln-low | `lowWall(3)` ×4 | — | (99, 0.6, −60), (99, 0.6, −30), (121, 0.6, −50), (121, 0.6, −40) | rock | Crouch cover. 10 cover pieces in the room |
| S2-kiln-mounds | disc ×4 | r 0.8 | (92, 0, −57), (92, 0, −33), (104, 0, −62), (104, 0, −28) | dirt | Spawn point **K-M** (west floor) |
| S2-K-N, K-S, K-E | `tubeSeg` ×3 | 10 × 4 × 3.5 | K-N from (120, 0, −65) north; K-S from (98, 0, −25) south; K-E from (132, 0, −58) east | rock | Spawn points **K-N**, **K-S**, **K-E** |
| S2-kiln-barrels | barrel ×3 (fire) | — | (106, 0, −45), (113, 0, −62), (129, 0, −30) | — | One sits by the channel between the bridges |
| S2-exit | `tubeSeg` | 24 × 4 × 3.5 | from (132, 0, −45) east to (156, 0, −45) | rock | Out to S3 |
| S2-dark | hazardZone `dark` | — | whole section | — | Render-only fog. Lava and `neon` discs every 12 m are the light |

Mechanisms: lava channels, burrow mounds, barrels, the `S2-L1` lockdown. Transition out: seamless,
the exit tube opens onto Mesa 0 of S3.

### 6.3 S3 Bridge Chain and Spire Roost (250 × 130 m, y −34 to +20)

```
 z                                             ▲A            ▲B              N ↑
-95                                       (spires in the lava, perch tops y +14)
-88                                  ┌──────────────────────────────┐
-76          ╭C-M1╮  ∴ ∴ ∴ ∴ ╭C-M2╮  │        g              g      ▐ R-NE
-64 S2►[CP4]═b1═(MESA 1 ▓)═b2═(MESA 2)═b3═▮  W  │  ROOST  [L]  │  E  ▮═exit═► S4
-52                 charges    [D1][CP5]  │ R-SW      g        g    ▐
-40                                  └──────────────────────────────┘
-33                                                 ▲C
     x=4  24    54     84     114    140  160  178          206   224     250
 side view along z = −64:
   y 0  ▀▀▀▀·········▀▀▀▀▀▀▀·········▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        mesa0  b1     mesa1   b2      mesa2  b3        roost shelf
 y −32 ~~~~~~~~~~~~~~~~~~~ lava sea, kill plane y −20: void rescue ~~~~~~~~~~~~
   ▓ fragile barricade   ∴ the Teeth (stepping pillars)   g geyser   ▮ lockdown door
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| S3-wallW | box | 4 × 60 × 130 | (2, 0, −65) | rock | West cliff. S2's exit tube opens at (4, 0, −64) |
| S3-mesa0 | box | 20 × 32 × 26 | (14, −16, −64) | rock | x 4–24, z −77 to −51, top y 0 |
| S3-secret | box; geyser (launch) | 8 × 1 × 4 | (14, −4.5, −49); geyser at (17, −4, −49) → (17, 0, −53) | rock | Hidden ledge 4 m under Mesa 0's south lip, not visible from above. Holds the secret weapon cache. The geyser is the way back up |
| S3-m0Cover | `lowWall(3)` ×2, `boulder(1.2)` | — | (18, 0.6, −59), (18, 0.6, −69); (10, 0.8, −56) | rock | Cover facing Bridge 1 |
| S3-bridge1 | `ropeBridge(30)` | 30 planks 1 × 0.5 × 2.5 | (24, 0, −64) → (54, 0, −64) | wood | Does not collapse |
| S3-jets | geyser ×2 (damage only) | column r 1.2 | (34, −32, −61.5), (44, −32, −66.5) | lava | Period 5 s, offsets 0 and 2.5. Each clips the outer 0.5 m of Bridge 1: 15 damage. Keep to the middle and keep moving |
| S3-mesa1 | cylinder | r 15, h 32 | (69, −32, −64) | rock | x 54–84 |
| S3-b1Barrels | barrel ×2 (shock) | — | (56, 0, −62), (56, 0, −66) | — | At the far end of Bridge 1, for the Boom Midget rush |
| S3-m1Cover | `lowWall(3)` ×2, `highWall(3)`, `basalt(2.2)` ×2 | — | (60, 0.6, −58), (60, 0.6, −70); (66, 1, −64); (73, 0, −57), (73, 0, −71) | rock | Mesa 1 cover. The Bomb Tossers stand behind the two columns |
| S3-m1Cave | box hut 6 × 4 × 5 with `caveMouth` | — | (69, 2, −75), opens south | rock | Door spawner **C-M1** |
| S3-m1Barrels | barrel ×4 (fire) | — | (74, 0, −60), (74, 0, −68), (76.5, 0, −62), (76.5, 0, −66) | — | Beside the Tossers and 2.5 m from the barricade |
| S3-m1Charges | chargePack ×3 on a crate 2 × 1 × 1 | — | (63, 0, −64) | crate | For the barricade. A rocket box beside it |
| S3-barricade | `fragileWall` box, flank box ×2 | 1.5 × 4 × 8; 1.5 × 4 × 9 | (79, 2, −64); (79, 2, −72.5), (79, 2, −55.5) | rock | Closes Mesa 1's east side. Plant point at (77.5, 0, −64) |
| S3-bridge2 | `ropeBridge(30)`, `collapseOn: S3-b2` | 30 planks | (84, 0, −64) → (114, 0, −64) | wood | Collapses 1 s after the player passes x 104, or when an anchor barrel blows |
| S3-b2Anchors | barrel ×2 (fire) | — | (115, 0, −62.3), (115, 0, −65.7) | — | On Mesa 2's lip. Shooting either drops the bridge early |
| S3-teeth | cylinder ×7 | r 1.5, h 32 | (85.5 + 4.5k, −32, −70), k = 0…6 | rock | The Teeth: stepping pillars beside Bridge 2, tops y 0, 1.5 m gaps. The way across once the bridge is gone |
| S3-mesa2 | cylinder | r 13, h 32 | (127, −32, −64) | rock | x 114–140 |
| S3-m2Cave | box hut 6 × 4 × 5 with `caveMouth` | — | (127, 2, −74), opens south | rock | Door spawner **C-M2** |
| S3-m2Cover | `boulder(1.4)` ×2, `lowWall(3)` | — | (120, 0.9, −68), (133, 0.9, −70); (122, 0.6, −59) | rock | Cover. The Magma Slug hides behind the second boulder |
| S3-depot1 | depot | — | (129, 0, −56) | — | Depot 1 (PLAN §7.7): depot crate, health station, spell bench, ticket shop. Charge packs ×2 |
| S3-bridge3 | box | 20 × 2 × 4 | (150, −1, −64) | stone | Solid span, x 140–160 |
| S3-roostW, C, E | box ×3 | 18 × 32 × 48; 28 × 32 × 48; 18 × 32 × 48 | (169, −16, −64); (192, −16, −64); (215, −16, −64) | rock | The Roost shelf, 64 × 48 m, x 160–224, z −88 to −40. The west box sinks in dragon part 3 |
| S3-L2-in | door slab, wall box ×2 | 0.6 × 5 × 4; 1 × 5 × 22 | (160.3, 2.5, −64); (160.5, 2.5, −77), (160.5, 2.5, −51) | stone, `neon` | Roost entry. Threshold `disc` line at x 166 |
| S3-wallE | box ×3 | 6 × 40 × 22; 6 × 40 × 22; 6 × 36 × 4 | (227, 4, −77); (227, 4, −51); (227, 6, −64) | rock | Plateau cliff, x 224–230. The third box is the lintel over the 4 × 4 m exit |
| S3-L2-out | door slab | 0.6 × 4 × 4 | (224.3, 2, −64) | stone, `neon` | Roost exit |
| S3-lid | lockdown lid | 64 × 30 × 48 | around the shelf, y 0 to 30 | fire wall | A curtain of fire on the three open edges and a heat lid at y 30 while locked. Blink and Magic Carpet stop at it |
| S3-R-NE | `caveMouth` | 3 × 3 | (224, 0, −80), opens west | rock | Spawn point **R-NE** |
| S3-R-SW | box hut 6 × 4 × 5 with `caveMouth` | — | (166, 2, −44), opens north-east | rock | Spawn point **R-SW** |
| S3-R-airN, R-airS | air spawn markers | — | (193, 12, −104), (192, 12, −24) | — | Spawn points **R-airN**, **R-airS** (flyers enter over the fire wall and stay inside the lid) |
| S3-spireA, B, C | `spire` ×3 | r 3, h 46, cone h 6 | bases (180, −32, −95), (206, −32, −95), (192, −32, −33) | rock | Dragon perches, perch height y +14. Each has a **crack band** at y 0–2: a `target`, 300 HP, `fragile` |
| S3-plantA, B, C | disc ×3 | r 0.8 | (180, 0, −87.2), (206, 0, −87.2), (192, 0, −40.8) | neon | Charge plant points. 7.8 m from the spire axis, inside the 8 m blast |
| S3-roostCols | `basalt(2.5)` ×6 | r 1.2 | (172, 0, −74), (172, 0, −54), (190, 0, −64), (200, 0, −78), (200, 0, −50), (214, 0, −64) | rock | Full cover from breath and fireballs |
| S3-roostLow | `lowWall(4)` ×4 | — | (181, 0.6, −70), (181, 0.6, −58), (208, 0.6, −72), (208, 0.6, −56) | rock | Crouch cover. 10 cover pieces on the shelf |
| S3-roostGeysers | geyser ×4 (launch 12 m) | — | (180, 0, −83), (206, 0, −83), (192, 0, −45), (196, 0, −64) | — | Dormant until dragon part 2. Period 6 s. The first three put you level with a perched head |
| S3-roostBarrels | barrel ×6 (4 fire, 2 shock) | — | (176, 0, −86), (184, 0, −86), (202, 0, −86), (210, 0, −86), (188, 0, −42), (196, 0, −42) | — | Yoink and throw at a crack band, or at the dragon |
| S3-roostSupply | chargePack ×2 | — | (164, 0, −61), (164, 0, −67) | crate | Inside the room, with three ammo boxes (§12) |
| S3-exitShelf | box | 20 × 32 × 8 | (240, −16, −64) | rock | Past the exit door, x 230–250, to S4 |
| S3-lava, S3-kill | box; killPlane | 250 × 2 × 130; y −20 | (125, −33, −65) | lava | Lava sea. Void rescue |

Mechanisms: rope bridge, collapsing bridge, damage geysers, launch geysers, barrels, charge packs,
fragile wall, destructible targets (crack bands), depot, the `S3-L2` lockdown. Transition out:
seamless, across the exit shelf to island G1 of S4.

### 6.4 S4 Geyser Fields (180 × 120 m, y −4 to +20)

```
 z                                                                        N ↑
-118 ┌───────────────────────────────────────────────────────────────────────┐
 -86 │ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ (G7) MB  ~ ~ ~ ~ ~ ~ ~ ~ ~ │
 -80 │ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ (G4) · · ~ ~ ~ ~ ~ ~ · · ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ │
     │ ~ ~ ~ ~ ~ ~ ~ ~ · ·  leech   · ╭────────────╮ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ │
 -60 ►[G1 CP6]·( G2 )─ ─ ─ ─ ─ ─ ─ ─►(  G5  [V1] C1)• • • • •( G8  C2 )═════[exit]► S5
     │ ~ ~ ~ ~ ~ ~ ~ · ~ ~ ~ ~ ~ ~ ~ ╰────────────╯ ~ ~ ~ ~ ~ ~ null ~ ~ ~ ~ ~ ~ │
 -40 │ ~ ~ ~ ~ ~ ~ ~ ~ (G3) leech ~ ~ ~ ~ ~ ~ ~ (G6) Overshield ~ ~ ~ ~ ~ ~ ~ ~ │
   0 └───────────────────────────────────────────────────────────────────────┘
     x=4    24  29  47  52 68      74      102        124    144   156     178
     ~ lava (25 dps, wade)   · stepping stone   ─ ► geyser arc or Magic Carpet lane   • conduit pillars   ═ conduit bridge
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| S4-floor | box | 180 × 2 × 120 | (90, −3, −60) | rock | Basin floor under the lava |
| S4-lava | box | 180 × 1 × 120 | (90, −1.5, −60) | lava | Lava surface y −1. `hazardZone` lava: 25 dps, move ×0.6. You can wade out; it is not a void rescue |
| S4-walls | box ×4 | 4 thick, 22 high | north (90, 9, −118), south (90, 9, −2), west (2, 9, −60), east (178, 9, −60); gaps: west z −64 to −56, east z −63 to −57 | rock | Basin walls |
| S4-G1 | box | 20 × 4 × 24 | (14, −2, −60) | rock | Entry shelf, x 4–24, top y 0. CP6. Mana bloom at (10, 0, −66) |
| S4-st1 | cylinder | r 1.5, h 3 | (26.5, −3, −60) | rock | Stone, G1 → G2 |
| S4-G2 | cylinder | r 9, h 3 | (38, −3, −60) | rock | First island |
| S4-st2 | cylinder | r 1.5, h 4.3 | (46.5, −3, −49.5) | rock | Step, top y 1.3, G2 → G3 |
| S4-G3 | cylinder | r 7, h 5.6 | (52, −3, −40) | rock | High island, top y 2.6. A Leech hides here |
| S4-st3, st4 | cylinder ×2 | r 1.5, h 3 | (47.5, −3, −68.5), (51, −3, −72) | rock | Stones, G2 → G4 |
| S4-G4 | cylinder | r 8, h 3 | (60, −3, −80) | rock | Island. The second Leech |
| S4-st5, st6 | cylinder ×2 | r 1.5, h 3 | (70, −3, −73), (74.5, −3, −69.5) | rock | Stones, G4 → G5. The no-spell route |
| S4-G5 | cylinder | r 14, h 3 | (88, −3, −60) | rock | Centre island, x 74–102 |
| S4-stump | box hut 6 × 4 × 6 with `caveMouth` | — | (88, 2, −69), opens south | rock | Cave **V1**, the Bark Brute's door |
| S4-st7, st8 | cylinder ×2 | r 1.5, h 4.3 | (99, −3, −46), (102.5, −3, −41.5) | rock | Steps, tops y 1.3, G5 → G6 |
| S4-G6 | cylinder | r 6, h 5.6 | (108, −3, −36) | rock | High island, top y 2.6. **Overshield** |
| S4-st9…st11 | cylinder ×3 | r 1.5, h 3 | (98.5, −3, −72), (102.5, −3, −76), (106, −3, −80) | rock | Stones, G5 → G7 |
| S4-G7 | cylinder | r 8, h 3 | (114, −3, −86) | rock | Side island behind a `basaltCluster` at (112, 0, −88). The **Mana Battery** |
| S4-pillars | mover cylinder ×5 | r 1.5, h 4 | x 105.5, 109.5, 113.5, 117.5, 121.5; z −60; rise from top y −3 to y 0 | rock | Raised by conduit **C1**. G5 → G8 |
| S4-G8 | cylinder | r 10, h 3 | (134, −3, −60) | rock | Last island, x 124–144 |
| S4-bridge | energyBridge | 12 × 0.5 × 3 | (150, −0.25, −60) | neon | Switched on by conduit **C2**. G8 → exit shelf |
| S4-exit | box | 22 × 4 × 24 | (167, −2, −60) | rock | Exit shelf, x 156–178 |
| S4-C1, C2 | conduit ×2 | — | (100, 0, −60) on G5; (141, 0, −60) on G8 | metal | Chain Zap switches |
| S4-GY1…GY5 | geyser ×5 (launch, with a target) | — | GY1 (44, 0, −60) → (77, 0, −60); GY2 (55, 2.6, −43) → (80, 0, −52); GY3 (93, 0, −51) → (107, 2.6, −37); GY4 (99, 0, −64) → (127, 0, −60); GY5 (140, 0, −64) → (159, 0, −60) | — | Periods 6, 6, 6, 8, 8 s. Standing on one when it fires costs 15 HP and throws you to the target. GY4 and GY5 are the no-spell way past the two conduits |
| S4-lavaGeysers | geyser ×6 (damage only) | column r 1.5 | (49, −1, −70), (72, −1, −71.5), (60, −1, −56), (112, −1, −62), (104, −1, −78), (150, −1, −62) | lava | Period 5 s, staggered. They cross the stone lanes and the carpet lane |
| S4-g2Cover | `boulder(1.3)`, `basaltCluster` | — | (35, 0.8, −55); (41, 0, −65) | rock | G2 cover. Mana bloom at (36, 0, −63) |
| S4-g34Cover | `boulder(1.3)` ×2 | — | (54, 3.4, −38); (62, 0.8, −82) | rock | The Leeches hide behind these |
| S4-g5Cover | `basalt(2.2)` ×4, `lowWall(3)` ×2 | — | (80, 0, −55), (80, 0, −65), (95, 0, −55), (96, 0, −67); (86, 0.6, −52), (90, 0.6, −62) | rock | Centre island cover |
| S4-g5Items | powerup Mana Surge, manaBloom, barrel ×2 (goo) | — | (88, 0, −60); (84, 0, −56); (78, 0, −60), (92, 0, −66) | — | The surge is the answer to the Leeches |
| S4-g8Cover | `basaltCluster`, `boulder(1.5)` | — | (131, 0, −55); (138, 1, −64) | rock | The Nullifier stands behind the boulder, 3 m from C2. Mana bloom at (128, 0, −64) |
| S4-exitCover | `lowWall(3)` ×2 | — | (160, 0.6, −56), (160, 0.6, −64) | rock | Cover on the exit shelf |

Terrain: none. The basin is boxes and cylinders so every island edge is exact.
Mechanisms: launch geysers with targets, damage geysers, lava hazard, conduits, raised pillars,
energy bridge, mana blooms. Transition out: seamless, a 6 m tunnel through the east wall to the
rim-top shelf of S5.

### 6.5 S5 Rim Descent (140 × 140 m, y −38 to +18)

```
 z                                                                     N ↑
-131 ┌──────────── N cliff ──[GB]▒───── L3 ─────────────────┐
-123 │ pad ◄═══════ Leg C  y −16 → −24 ◄═══════════════ pad │
-115 │  ║  ┌──────────────────────────────────────┐   ▲     │
     │ Leg │                                      │  Leg  ·debris
  L4 │  D  │     PIT 60 × 60: view down to SB     │   B   ~ lava channel z −84
     │  ║  │     kill zone below y −31            │   ║  [CP8] z −80
     │  ▼  │                                      │   ║   L2 under the Rocket Ledge
 -75 │[D2]═gate tunnel═►[CP9]▮ SB                 │   ║  ·debris
 -59 ├─────┐──────────────────────────────────────┘   ║     │
 -51 │[CP7] ══════ Leg A  y 0 → −8 ══ van ◄══════════ pad   │
 -43 │ shelf  Rocket Crates   barrels   L1                  │
 -39 └────────────────── S cliff ───────────────────────────┘
     x=0     27  47 55                             115 123 131
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| S5-shelf | box | 47 × 38 × 16 | (23.5, −19, −51) | rock | Rim-top shelf, top y 0, x 0–47, z −59 to −43. CP7. Entry from S4 at (0, 0, −51) |
| S5-legA | ramp | 68 × 8 × 8 | high (47, 0, −51) → low (115, −8, −51) | rock | South side, runs east |
| S5-padSE | box | 8 × 8 × 8 | (119, −12, −51) | rock | Corner, top y −8 |
| S5-legB | ramp | 60 × 8 × 8 | high (119, −8, −55) → low (119, −16, −115) | rock | East side, runs north |
| S5-padNE | box | 8 × 8 × 8 | (119, −20, −119) | rock | Corner, top y −16 |
| S5-legC | ramp | 60 × 8 × 8 | high (115, −16, −119) → low (55, −24, −119) | rock | North side, runs west |
| S5-padNW | box | 8 × 8 × 8 | (51, −28, −119) | rock | Corner, top y −24 |
| S5-legD | ramp | 40 × 6 × 8 | high (51, −24, −115) → low (51, −30, −75) | rock | West side, runs south |
| S5-terrace | box | 28 × 8 × 16 | (41, −34, −67) | rock | Depot terrace, top y −30, x 27–55, z −75 to −59 |
| S5-ringFill | box ×4 | 8 wide, down to y −38 | under each leg, top 0.5 m below the leg's low end | rock | Solid rock under the road, so the pit has walls |
| S5-cliffS | box | 76 × 26 × 8 | (85, 5, −43) | rock | Outside Leg A. Cave **L1** `caveMouth` at (85, −4.5, −47) |
| S5-cliffE | box ×3 | 8 × 26 × 6; 8 × 13 × 18; 8 × 26 × 44 | (127, −3, −58); (127, −9.5, −70); (127, −7, −101) | rock | Outside Leg B. The middle box is lower: its top (y −3) is the **Rocket Ledge**, 6 to 9 m above the road. Cave **L2** in its face at (123, −10, −70) |
| S5-cliffN | box ×3 | 49 × 26 × 8; 4 × 22 × 8; 23 × 26 × 8 | (98.5, −11, −127); (68, −9, −127); (54.5, −11, −127) | rock | Outside Leg C. The middle box starts 3.5 m above the road and leaves a pocket 4 × 3.5 × 7. Cave **L3** at (92, −19, −123) |
| S5-gbWall | `fragileWall` box | 4 × 3.5 × 1 | (68, −20.5, −123.5) | rock | Closes the pocket. Golden Bonk inside at (68, −22.3, −128) |
| S5-cliffW | box | 8 × 26 × 52 | (43, −17, −101) | rock | Outside Leg D. Cave **L4** at (47, −27, −95) |
| S5-posts | `basalt(1.0)` ×24 | r 0.6 | along the pit edge of all four legs, every 10 m, 0.8 m in from the edge | rock | Knockback stoppers. There is no rail between them |
| S5-coverA | `lowWall(4)` ×2, `highWall(3)` ×2 | — | on Leg A at (60, −49), (88, −49); (74, −53), (104, −53) | rock | Staggered cover on the van's road |
| S5-barrels | barrel ×3 (fire) | — | on Leg A at (84, −53), (88, −52), (92, −53) | — | The van parks beside them |
| S5-rocket1, rocket2 | powerup Rocket Crate ×2 | — | (40, 0, −47); (72, −2.9, −48.5) | crate | Rockets to the cap, before and during E6 |
| S5-padSECover | `highWall(4)` ×2 | — | (117, −7, −49), (121, −7, −53) | rock | Cover at the first corner |
| S5-vanPath | path | — | (119, −8, −51) → (90, −5.1, −51) at 6 m/s, stop and unload, then west at 2 m/s | — | `auditVan` lane. It crushes `lowWall` cover it reaches |
| S5-coverB | `boulder(1.3)` ×2, `lowWall(3)` ×2 | — | on Leg B at (117, −64), (121, −96); (121, −76), (117, −108) | rock | Leg B cover |
| S5-lavaB | box; slab box | 8 × 0.5 × 2; 3 × 0.5 × 3 | (119, −12.3, −84); (121.5, −11.9, −84) | lava; stone | A lava channel across Leg B. Jump it or use the slab on the cliff side |
| S5-debris | debris emitter ×4 | sphere r 1.2 | Leg B at z −62, −74, −98, −108 | rock | One point every 9 s in turn. 1.2 s shadow ring, 30 damage in 3 m. Runs during E6 and E7 |
| S5-coverC | `lowWall(4)` ×2, `basaltCluster` ×2 | — | on Leg C at (104, −117), (76, −117); (90, −121), (62, −121) | rock | Leg C cover |
| S5-coverD | `highWall(3)`, `boulder(1.2)` ×2 | — | on Leg D at (49, −108); (53, −96), (49, −84) | rock | Leg D cover |
| S5-depot2 | depot | — | (36, −30, −67) | — | Depot 2 (PLAN §7.7) |
| S5-gate | `tubeSeg` | 23 × 4 × 4, drops 4 m | (55, −30, −67) → (78, −34, −67) | rock | Gate tunnel. It continues 17 m in SB. CP9 at its end |
| S5-kill | killZone | — | x 55–115, z −115 to −55, y below −31 | — | Falling into the pit is a void rescue |
| S5-vista | disc, ring | r 28 | (85, −36, −85) | lava, neon | The caldera seen from above: Tinubu in his chains. No collision |

Mechanisms: void rescue, caves as door spawners, falling debris, lava channel, barrels, fragile
wall, depot. Transition out: the gate tunnel, then the boss card.

### 6.6 SB The Caldera (90 × 100 m, y −6 to +18)

Centre **C = (45, 0, −50)**. Angles θ are clockwise from north. A point at radius R and angle θ is
`(45 + R·sin θ, y, −50 − R·cos θ)`.

```
                         N  θ 0
                  ▮ exit (opens on death)
              ╭──────[ I-N  ♥ ]──────╮
        T-NW ╱  ⚓  ·           ·  ⚓  ╲ T-NE
      [ I-NW ]        ╭───────╮        [ I-NE ]
       Hot Spring     │  DAIS │        Mana Surge
           ·          │ centre│          ·
      [ I-SW ♥ ]      │ r 11  │        [ I-SE ♥ ]
        T-SW ╲  ⚓  · ╰───────╯ ·  ⚓  ╱ T-SE
              ╰──────[ I-S rack ]────╯
                  ▮ entry gate  θ 180  ◄ tunnel from S5
   ⚓ chain anchor (part 1)   ♥ Caldera Heart (part 4)   · stepping stone   [ ] outer island
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| SB-tunnel | `tubeSeg` | 17 × 4 × 4 | from (45, 0, 0) north to (45, 0, −17) | rock | Last 17 m of the gate tunnel. CP9 at (45, 0, −14) |
| SB-wall | box ×12 | 17 × 18 × 3 | at R 31.5, θ = 0°, 30°, … 330°, each facing C | rock | Crater wall, inner face at R 30. Gaps: entry (θ 180, 4 × 4), exit (θ 0, 4 × 4), tunnels at θ 60, 120, 240, 300 (3 × 3) |
| SB-in, SB-out | door slab ×2 | 4 × 4 × 0.6 | (45, 2, −20.3); (45, 2, −79.7) | stone, `neon` | Lockdown doors. Threshold `disc` line at R 22 on I-S. `SB-out` opens only when Tinubu dies |
| SB-lid | lockdown lid | r 30 | y 18 | ash | Ceiling of ash and heat. With the fire ring it closes the room |
| SB-lava | cylinder | r 30, h 1 | (45, −2, −50) | lava | Lava under the floor, surface y −1. `hazardZone` lava: 25 dps, move ×0.6. Every island lip is 1 m, so you can climb out |
| SB-floor | cylinder, tag `breakaway` | r 28, h 1 | (45, −1, −50) | rock | The whole arena floor, top y 0. Removed at the start of part 4 after a 3 s crack telegraph |
| SB-centre | cylinder | r 11, h 6 | (45, −6, −50) | rock | Central island. Never sinks |
| SB-dais | cylinder | r 3.5, h 0.5 | (45, 0, −50) | stone | Tinubu's dais. Shatters when he is freed |
| SB-I-N, I-NE, I-SE, I-S, I-SW, I-NW | cylinder ×6, tag `sink` | r 7, h 6 | R 20.5 at θ 0, 60, 120, 180, 240, 300: (45, −6, −70.5), (62.8, −6, −60.3), (62.8, −6, −39.8), (45, −6, −29.5), (27.2, −6, −39.8), (27.2, −6, −60.3) | rock | Outer islands. 2.5 m from the central island |
| SB-stones | cylinder ×6, tag `sink` | r 2, h 6 | R 17.75 at θ 30, 90, 150, 210, 270, 330: (53.9, −6, −65.4), (62.8, −6, −50), (53.9, −6, −34.6), (36.1, −6, −34.6), (27.2, −6, −50), (36.1, −6, −65.4) | rock | Stepping stones between neighbouring outer islands, 1.3 m gaps |
| SB-stubs | box ×6 | 4 × 6 × 3 | R 28.75 at θ 0, 60, 120, 180, 240, 300, top y 0 | rock | Join each wall opening to its island |
| SB-T-NE, T-SE, T-SW, T-NW | `caveMouth` ×4 | 3 × 3 | in the wall at θ 60, 120, 240, 300 | rock | Spawn points **T-NE**, **T-SE**, **T-SW**, **T-NW** |
| SB-anchors | `chainAnchor` ×4 | r 1.2, h 5 | R 23 at θ 45, 135, 225, 315: (61.3, 0, −66.3), (61.3, 0, −33.7), (28.7, 0, −33.7), (28.7, 0, −66.3) | metal | `target`, 250 HP each. Part 1. They stand on the breakaway floor |
| SB-hearts | `heart` ×3 | r 1.6 | centres of I-N, I-SE, I-SW | lava | `target`, 300 HP each. Rise at the start of part 4 |
| SB-colsC | `basalt(2.2)` ×2, box ×2 | r 0.9; 3 × 2 × 1.5 | (40.5, 0, −46.5), (49.5, 0, −53.5); (45, 1, −57.5), (45, 1, −42.5) | rock, tag `chargeStop` | Central cover. Destructible (200 HP, 0.6 m stump), as Duel cover is |
| SB-outcrops | box ×5 | 3 × 2 × 1.5 | on I-N (45, 1, −73), I-NE (65, 1, −61.5), I-SE (65, 1, −38.5), I-SW (25, 1, −38.5), I-NW (25, 1, −61.5) | rock | One outcrop per outer island. 9 cover pieces with the central four |
| SB-pools | `lavaPool(1.7)` ×2 | — | (39.4, 0, −53.2), (50.6, 0, −46.8) | lava | The Duel `caldera` lava pools, on the central island |
| SB-rack-bz | rack | — | (42, 0, −27) | — | Bazooka, Epic. `why`: "SB-BOSS: anchors, hearts and Imps" |
| SB-rocket | powerup Rocket Crate | — | (48, 0, −27) | crate | Inside the boss section, as PLAN §9 requires |
| SB-depotCrate | depot crate (unlimited) | — | (45, 0, −42) | crate | On the central island, which never sinks. PLAN §7.4: the starter machine gun is no longer endless |
| SB-surge | powerup Mana Surge | — | (62.8, 0, −60.3) | — | On I-NE |
| SB-overshield | powerup Overshield | — | (45, 0, −46) | — | Appears when part 5 starts |
| SB-ring | fire ring | r 27.8 → 26.8 → 25.5, then 14 | about C | fire | Duel radii for stages 1 to 3 (B §2.5), then the last-stand shrink in part 5 |

The cover list above is this document's own. When Duel's `caldera` layout is ported
(`duelArena('caldera')`, B §4), use Duel's pieces and move any that land on a gap between islands.
Transition out: Tinubu dies, the lava hardens to a walkable black crust in 3 s, `SB-out` opens,
12 m of tunnel leads to the S6 raft, and the "ERUPTION" card plays.

### 6.7 S6 Eruption Escape (300 × 80 m, y −3 to +165)

Side view, looking north. The shaft axis is (40, y, −40).

```
  y
 150 ─                                                             ▂▂▂[DROP SHIP] x 285
 140 ─                                                 T3 ↑  R4▂▂
 132 ─                                     T2 ↑  R3▂▂
 128 ─ ┌ shaft top ┐           T1 ↑  R2▂▂
 120 ─ │  L5▂   lip▂▂▂   R1▂▂
  96 ─ │       ▂L4 │        flight 223 m: a raft every 45 m, a thermal in each gap
  72 ─ │ L3▂       │        ash wall follows from x 62 at t+88, 7 m/s
  48 ─ │   ↑↑    ▂L2
  24 ─ │▂L1        │
   0 ─ │ [raft: CP10, jetpack]
       └─ lava rises 1.5 m/s from t+6 ─┘
       x=18.5      61.5   105  128  150  172  195  218  240          285
```

| id | shape | size | at (x, y, z) | mat | purpose |
|---|---|---|---|---|---|
| S6-raft | cylinder | r 8, h 2 | (40, −2, −40) | rock | Start, top y 0. Jetpack pedestal at the centre. CP10. Fuel pad |
| S6-shaft | box ×8 | 17.8 × 135 × 3 | at R 21.5 about the axis, θ = 0°, 45°, … 315°, base y 0; the east box (θ 90) is 118 high | rock | Shaft walls, inner radius 20. The exit is over the east wall |
| S6-L1 | box + fuelPad | 10 × 2 × 8 | (25, 23, −40) | rock | Ledge on the west wall, top y 24 |
| S6-L2 | box + fuelPad | 10 × 2 × 8 | (55, 47, −40) | rock | East wall, top y 48 |
| S6-L3 | box + fuelPad | 8 × 2 × 10 | (40, 71, −55) | rock | North wall, top y 72 |
| S6-L4 | box + fuelPad | 8 × 2 × 10 | (40, 95, −25) | rock | South wall, top y 96 |
| S6-L5 | box + fuelPad | 10 × 2 × 8 | (25, 117, −40) | rock | West wall, top y 118 |
| S6-lip | box + fuelPad | 12 × 2 × 10 | (66, 119, −40) | rock | Launch shelf outside the east wall, top y 120 |
| S6-Va, Vb, Vc | `caveMouth` ×3 | 3 × 3 | (40, 14, −60) north; (60, 36, −40) east; (40, 62, −20) south | rock | Side vents: flyer spawn points in the shaft |
| S6-updraft | hazardZone `updraft` | r 3, y 48–72 | on the axis | — | A free lift from L2 to L3. Balloon Midgets drift in it |
| S6-lavaRise | risingHazard | disc r 20 | starts y −3, 1.5 m/s, starts at t+6 | lava | Reaches the lip at t+88 |
| S6-shaftDebris | debris emitter ×6 | sphere r 1.2 | lanes at R 10 about the axis, θ = 0°, 60°, … 300° | rock | One boulder per lane every 4 s, lanes staggered by 0.67 s. 1.2 s shadow, 30 damage, cuts thrust for 1 s. Lanes 1, 3, 5 run from t+8; all six from t+35 |
| S6-flank | cone, no collision | r 110, h 118 | (40, 0, −40) | rock | The outer flank of the volcano below the flight path. Seen only |
| S6-R1 | `debrisRaft` mover | 10 × 2 × 10 | (105, 124, −40) | rock | Raft with a fuel pad. Each raft sinks 1 m/s from the moment it is touched |
| S6-R2 | `debrisRaft` mover | 10 × 2 × 10 | (150, 128, −34) | rock | Raft |
| S6-R3 | `debrisRaft` mover | 10 × 2 × 10 | (195, 132, −46) | rock | Raft |
| S6-R4 | `debrisRaft` mover | 10 × 2 × 10 | (240, 136, −40) | rock | Raft |
| S6-T1, T2, T3 | hazardZone `updraft` ×3 | r 5, y 105–150 | (128, −38), (172, −40), (218, −42) | — | Thermals between rafts |
| S6-flightDebris | scripted debris list | sphere r 1.5, 14 pieces | x = 80, 95, 115, 122, 140, 160, 165, 185, 205, 210, 228, 250, 262, 272; z within ±6 of the route; one every 3 s from t+45 | rock | Falls 16 m/s through the flight path. 1.2 s shadow line, 30 damage |
| S6-ash | advancing kill wall | 80 wide, full height | starts x 62 at t+88, moves east 7 m/s | ash | Reaches the ship at t+120. Touching it restarts the escape |
| S6-kill | killPlane in the flight zone | y 60 for x above 62 | — | — | Void rescue to the last raft touched, −25% HP |
| S6-ship | `dropShip` | — | (285, 140, −40) | metal | Finish volume on the ramp: `levelComplete` |
| S6-neon | disc on each ledge and raft | r 1.5 | — | neon | The next landing is always lit |

Jetpack arithmetic (C §3.10): a full tank is 4.5 s of thrust and about 38 m of climb. Ledges are
24 m apart, so each leg uses about 65 fuel and leaves room to hover and shoot. A pad refills a
tank in 1.25 s. Level flight for 45 m takes 4.1 s; thermals carry about half of each gap.

## 7. Prefabs (`src/data/levels/prefabs/volcano.js`)

| Prefab | Parts |
|---|---|
| `ropeBridge(n)` | n plank boxes 1 × 0.5 × 2.5 (`wood`) end to end, 4 post cylinders r 0.25 h 1.6 at the ends, render-only rope rails. It is the C §3.9 `ropeBridge` mechanism |
| `spire(r, h)` | cylinder r, h (`rock`) with a cone r, h ÷ 8 on top (visual) |
| `basalt(h)` | cylinder r 0.8 unless the row says otherwise, height h (`rock`) |
| `basaltCluster` | three `basalt` columns, h 2.2, 1.6, 1.2, touching |
| `boulder(r)` | sphere r with its centre 0.6 r above the ground |
| `lowWall(len)`, `highWall(len)` | box len × 1.2 × 1; box len × 2 × 1 (`rock`) |
| `caveMouth(w, h)` | two jamb boxes 1 × h × 2, lintel box (w + 2) × 1 × 2, dark back box, a `door` spawn marker 1.5 m inside |
| `tubeSeg(len, w, h)` | floor box len × 1 × w, two wall boxes len × (h + 1) × 1, roof box len × 1 × (w + 2) |
| `lavaPool(r)` | disc r (`lava`) with a `hazardZone` lava cylinder r, 0.6 high |
| `perch` | ledge box 8 × 1 × 4 and a parapet box 8 × 1.2 × 0.5 on its outer edge |
| `chainAnchor` | cylinder r 1.2 h 5 (`metal`), sphere r 0.8 on top, render-only chain of 0.5 m boxes to Tinubu's wrist or ankle |
| `heart` | sphere r 1.6 (`lava`, pulsing) on a cylinder r 1, h 1 |
| `debrisRaft` | box 10 × 2 × 10 (`rock`), a fuel pad disc r 1.5 in the middle, two boulders r 1 on corners as cover |
| `dropShip` | box 14 × 4 × 8 (`metal`), ramp 6 × 2 × 4 at the back, two engine cylinders r 1.2 h 3 |

## 8. Encounters

`maxAlive` is 16 everywhere (PLAN §3, L10). A Bitbug flock counts one unit per 6. **E** marks an elite.

**Lockdowns (PLAN §5.6).** Three, never back to back.

| Lockdown | Encounter | Room | Doors | Named spawn points | Cover and levels | Waves | Enemies | Length |
|---|---|---|---|---|---|---|---|---|
| The Kiln | `S2-E3` | 44 × 40 m, roofed at 9 m | `S2-L1-in` west, `S2-L1-out` east (basalt slabs) | K-N north tube, K-S south tube, K-E east tube, K-M west floor mounds | 6 pillars, 4 low walls; a lava channel splits the floor | 4 | 25 | 2:00 |
| The Spire Roost | `S3-MB` | 64 × 48 m shelf, fire curtain and heat lid at 30 m | `S3-L2-in` west, `S3-L2-out` east | R-NE cave, R-SW hut, R-airN, R-airS | 6 columns, 4 low walls; perches at +14 m | 3 parts | 26 adds | 2:30 |
| The Caldera | `SB-BOSS` | disc r 28 (56 m across), fire ring and ash lid | `SB-in` south, `SB-out` north | T-NE, T-SE, T-SW, T-NW tunnels | 9 cover pieces; floor and lava as two levels from part 4 | 5 parts | 44 adds | 5:15 |

Common rules: the entry slab drops 1 s after the player crosses the threshold line 6 m inside; it
pushes a player standing under it into the room. The exit stays locked. Blink fails against a
locked slab, and the roof or lid stops Magic Carpet and geyser launches. If the last 2 enemies of a
wave live 12 s they are marked and run at the player. Dying restarts the lockdown from wave or part
1 at the checkpoint outside the entry door. On the last kill both slabs open, a checkpoint saves
and the reward appears.

### 8.1 `S1-E1` Counter-Audit (sniper duel)

Space: trail A, Pulpit 1, trail B, Pulpit 2 (x 40–176). Objective: `clearAll`.

| Squad | Trigger | Method | From | Enemies | What it tests |
|---|---|---|---|---|---|
| a | `onEnter` x 40 | `placed` | FP1 and FP2 on the far wall | `auditSniper` ×2 | 1.4 s laser, 35 damage. Find them, scope them, hit them during the laser. They relocate after 2 shots |
| b | `t+6` | `air` | rises out of the chasm at x 70 | `spotterDrone` ×1 | Its cone sweeps trail A and Pulpit 1. A 1.5 s hold calls a mortar onto a 4 m ledge. Shoot the lamp or drop a Decoy |
| c | `onKills(2)` | `door` | Cave R1 on Pulpit 1 | `midget` ×4, `boomMidget` ×1 (0.5 s apart) | Melee on a ledge while a laser is on you. The Boom Midget's blast is a shove toward the edge |
| d | `onEnter` x 150 (Pulpit 2) | `placed` | FP4, relocating to FP5 | `auditSniper` **E** ×1 | 2.5× HP: a body shot does not kill. Flinch it mid-laser, then the head |
| e | `onKills(9)` | `drop` | ropes at D1, D2, D3, beside and behind the player | `midget` ×3 | Drop-ins at your back while you are scoped |

`maxAlive` 16 (peak 8). Sniper in `S1-cache`, 40 m before the start; sniper boxes at the cache and on both pulpits.
Two approaches: duel from the pulpits, or run trail B behind a Decoy and Vape Cloud.
Estimate: 64 s × 1.3 = 83 s (1.4 min).

### 8.2 `S2-E2` Tube Rats (close quarters, then the Imp alone)

Space: Tube A, the Fork, Tube B. Objective: `clearAll`.

| Squad | Trigger | Method | From | Enemies | What it tests |
|---|---|---|---|---|---|
| a | `onEnter` x 10 | `placed` | behind the barricade at x 30; the Acolyte at x 36 | `riotMidget` ×2, `hexAcolyte` ×1 | A shield wall in a 4 m tube with a Tax Shield on top. Yeet or a shotgun blast puts them in the lava channel. Chain Zap stuns the shields and pops the bubble |
| b | `onEnter` the Fork | `burrow` | the three Fork mounds, one behind the player | `sewerMidget` ×3 | 0.6 s of dust, then a shotgun shot. They re-burrow if ignored |
| c | `onKills(6)` and `onEnter` Tube B x 60 | `door` | the far end of Tube B (x 87) | `tinubuImp` ×1, alone | The Imp lesson on a 30 m straight: 0.5 s wind-up, step into niche A1 or A2, it hits the end wall and is stunned 1 s, shoot the belly. Then see the fire trail and the death blast |

`maxAlive` 16 (peak 4). Shell boxes at the tube mouth and in the Fork. Two approaches in Tube A: break the wall
from the front, or shove it sideways. Estimate: 53 s × 1.3 = 69 s (1.1 min).

### 8.3 `S2-E3` The Kiln **[L]** (lockdown, close quarters with the Imp in a crowd)

Room: 44 × 40 m (§6.2), roofed, 10 cover pieces, a 3 m lava channel with two bridges. CP3 is in
Tube B, 4 m outside `S2-L1-in`. Objective: `clearAll`. Next wave on `onRemain(2)` or 25 s after
the wave before it started.

| Wave | Trigger | Method | Spawn point | Enemies | What it tests |
|---|---|---|---|---|---|
| 1 | Lockdown start (1 s after the threshold at x 94) | `door`; `burrow` | K-N; K-M | `midget` ×5; `sewerMidget` ×3 | A swarm from the far side over two bridges, burrowers on your side. Hold a bridge or the west pillars |
| 2 | `onRemain(2)` or 25 s | `door`; `door` | K-S; K-E | `boomMidget` ×3; `midget` ×3 | Bombers from behind your right shoulder while Midgets cross. Shoot a bomber on a bridge: the barrel at (106, −45) goes with it |
| 3 | `onRemain(2)` or 25 s | `burrow`; `door`; `door` | K-M; K-N; K-S | `sewerMidget` ×3; `boomMidget` ×2; `midget` ×2 | Three sides at once. The first wave where standing still fails |
| 4 | `onRemain(2)` or 25 s | `door`; `door` | K-E; K-N | `tinubuImp` ×1; `midget` ×3 | The Imp in a crowd. Its charge crosses the room, its trail cuts the floor in two for 5 s, its death blast kills Midgets. Bait it into a pillar or across the channel |

Total 25 enemies. `maxAlive` 16 (peak 10). Two ammo boxes (shells, bullets) and three fire barrels
inside the room. Reward at the exit: a chest (one gun, Epic or better), an ammo crate, a health
orb and a mana bloom; CP4 saves.
Estimate: 92 s × 1.3 = 120 s (2.0 min).

### 8.4 `S3-E4` Demolition Row (explosives)

Space: Mesa 0, Bridge 1, Mesa 1, Bridge 2, Mesa 2. Objective: `reach` Mesa 2 (the depot).

| Squad | Trigger | Method | From | Enemies | What it tests |
|---|---|---|---|---|---|
| a | `onEnter` Mesa 0 east edge | `placed` | Mesa 1, behind the columns at x 73 | `bombTosser` ×2 | Bouncing bombs land on Bridge 1 with a 1.2 s fuse. Yoink one back, Yeet them, or shoot the satchels. The four fire barrels beside them finish it |
| b | `t+4` | `door` | C-M1, then across Bridge 1 at the player | `boomMidget` ×4 (0.8 s apart) | Shoot the first on the bridge and each blast sets off the next. The shock barrels at the far end do the same job |
| c | `onEnter` Mesa 1 | `air` | up from under Bridge 2 | `flyingMidget` ×2 | Pellets while you carry a charge (a hit over 20 sets it off; these do 2) |
| d | `onSwitch(S3-barricade)` (the wall is broken) | `door` | C-M2, then across Bridge 2 | `midget` ×6 | Shoot an anchor barrel and the bridge drops with all six on it. If you let them cross, the bridge still collapses under you at x 104 |
| e | `onEnter` Mesa 2 | `hidden` | behind the boulder at (133, −70) | `magmaSlug` ×1 | Kill it at range. Its trail reaches the anchor barrels if they are still there |

The barricade: one charge pack (carry it 15 m from the crate, plant, step back 8 m, shoot), or two
rockets, or a Meteor Bonk. Crossing after Bridge 2 falls: the Teeth, Magic Carpet, or two Blinks
with a stone between. `maxAlive` 16 (peak 8). Charge packs, rocket ammo and 8 barrels on Mesa 1.
A rocket box sits by the charges. Estimate: 64 s × 1.3 = 83 s, plus 10 s for the charge = 93 s (1.6 min).

### 8.5 `S3-MB` Jade Dragon **[L]**

The parts table and the add schedule are in §10.1. Room in §6.3. CP5 is on Bridge 3, 4 m outside
`S3-L2-in`. Estimate: 150 s (2.5 min).

### 8.6 `S4-E5` Spell Check (magic)

Space: islands G2 to G8. Objective: `reach` the exit shelf.

| Squad | Trigger | Method | From | Enemies | What it tests |
|---|---|---|---|---|---|
| a | `onEnter` G2 | `placed` | drifting over the lava between G2, G3 and G4 | `hexWisp` ×4 | Bullets do 20%. One Chain Zap takes all four; Goo first for +50% and a longer jump |
| b | `t+5` | `hidden` | behind the boulders on G3 and G4 | `manaLeech` ×2 | Each drains 8 mana/s inside 10 m, and both routes to G5 pass one. Kill it first, break line of sight, turn on Mana Shield, or send the Swarm |
| c | `onKills(4)` | `door` | Cave V1 in the stump on G5 | `barkBrute` ×1 | Bark ignores bullets. Goo softens it, shock cracks it, or Yeet it off G5 into 25 dps of lava. Mana Surge is on this island |
| d | `onKills(7)` | `hidden` | behind the boulder on G8, 3 m from conduit C2 | `nullifier` ×1 | The twist. Inside its 9 m field spells fizzle, and C2 is inside it. Guns only, from G5 or from the pillars |

Ways across: stones through G4 (no spells), geysers GY1 to GY5, Magic Carpet down the middle, the
C1 pillars and the C2 bridge. `maxAlive` 16 (peak 6). Three mana blooms and a Mana Surge in the
space. Estimate: 74 s × 1.3 = 96 s (1.6 min).

### 8.7 `S5-E6` Armoured Push (heavy weapons)

Space: the east end of the rim-top shelf, Leg A, the south-east pad. Objective: `destroy` the van.

| Squad | Trigger | Method | From | Enemies | What it tests |
|---|---|---|---|---|---|
| a | `onEnter` x 50 | `vehicle` | the south-east pad, driving west up Leg A | `auditVan` ×1 | Bullets do 10%. Two Rocket Crates, a Meteor Bonk (armour off for 6 s), or the three fire barrels where it parks. The engine block is at the back, on a road 8 m wide: Blink past it, jump its roof, or turn it with a Decoy |
| b | the van stops at x 90 (about `t+8`) | `vehicle` | the van's rear doors | `riotMidget` ×1, `midget` ×4 | A shield and a swarm that guard the engine block |
| c | `t+12` | `placed` (stand up) | the Rocket Ledge above Leg B | `rocketObama` ×2 | Slow rockets down the length of Leg A. Shoot them, Yeet them back or hold them in a Time Bubble. Close the range under their arc |

`maxAlive` 16 (peak 8). Bazooka from the cache; `S5-rocket1` 10 m before the start, `S5-rocket2`
on Leg A. Estimate: 78 s × 1.3 = 101 s (1.7 min).

### 8.8 `S5-E7` Above and Below (elite squad)

Space: Leg B from z −90, the north-east pad, Leg C, the north-west pad, Leg D. Objective: `clearAll`.

| Squad | Trigger | Method | From | Enemies | What it tests |
|---|---|---|---|---|---|
| a | `onEnter` Leg B z −90 | `door` | Cave L3 on Leg C, 8 m below and across the corner of the pit | `glowieAgent` **E** ×2 | An elite pair that takes cover on the north-east pad and fires up at you; one has a flashbang (look away). Debris is falling on your leg |
| b | `t+8` | `door` | Cave L2, above and behind you on Leg B | `midget` ×4 | The pincer. They come down the road you just walked |
| c | `onRemain(2)` or `onEnter` the north-west pad | `door` | Cave L4, at the foot of Leg D | `tinubuImp` ×1 | The Imp twist: it charges up a road with a pit on one side. Stand by a post and step aside, and it goes over the edge |

`maxAlive` 16 (peak 6). Ammo crate on the north-east pad; each elite Agent drops a gun there. The Golden Bonk cave is on Leg C.
Estimate: 56 s × 1.3 = 73 s (1.2 min).

### 8.9 `SB-BOSS` Tinubu **[L]** and 8.10 `S6-ESC` Eruption escape

Parts tables and schedules are in §10.2 and §10.3. Estimates: 315 s and 95 s.

## 9. New enemy: `tinubuImp`

No other new enemy is proposed. Chain anchors, Caldera Hearts and spire crack bands are
`target` mechanisms, not enemies.

| Field | Value (tier 1 base; HP and damage × `tierEnemyMult`) |
|---|---|
| Id, name | `tinubuImp`, Tinubu Imp |
| Role | Elite charger. Introduced alone in `S2-E2`, in a crowd in `S2-E3`, on a ledge in `S5-E7`, on islands in `SB-BOSS` |
| Archetype | `charger` (the `miniTinubu` AI, C §3.12) with three added parameters: `trail`, `deathBlast`, `gooShorten` |
| HP | 240 (Mini Tinubu's spec is 180) |
| Body | radius 0.5, height 1.5 |
| Move | walk 6.4 m/s, accel 30 |
| Charge | Starts between 6 and 22 m with line of sight. Wind-up 0.5 s with an `enemyTelegraph` line on the floor. 17 m/s, at most 24 m, turns 20°/s. Hit: 24 damage, knockback 10. Cooldown 3.5 s |
| Wall hit | Hitting a solid or a `chargeStop` prop stuns it 1.0 s and opens the belly weak spot (×2.5) |
| Fire trail | A `burnTrail` strip 1.6 m wide along the charge path for 5 s: 12 dps and the burn status, to the player and allies only. It lights barrels after 0.5 s of contact. A Goo Bolt puddle puts out 3 m of it |
| Death | Swells for 0.7 s (red ring r 3.5), then explodes: 30 to the player, 60 to enemies, fire. Chains barrels. A kill by a fall or a void does not explode |
| Lava and edges | Immune to fire and lava damage. In lava it wades at half speed for about 3 s. A charge off a ledge into a kill volume kills it |
| Spells | Yeet shoves it 4 m and cancels a wind-up. Goo cuts the next charge to 10 m. Time Bubble slows the charge to 30%. Too heavy for Yoink |
| Poise | 120, stagger 0.6 s |
| Affinity | resists fire, weak to goo |
| Elite flag | `ELITE` multipliers as usual; trail lasts 8 s. Not used on Normal |
| Hitboxes | capsule `body` r 0.5, y 0–1.3; sphere `weak` r 0.2 at (0, 1.35, 0.05); sphere `weak` r 0.3 at (0, 0.7, 0.45), `onlyWhen: 'stunned'` |
| Drops | Ammo (smart drop), health or mana orb, tickets. Gun chance 8%, tier from the L10 row. No resources |
| Pacing | 20 s. Counts 2 against `maxAlive` |
| Look | `tinubu` stage 1 model at 0.6 scale, two cone horns (r 0.12, h 0.35), an ember disc r 0.6 under the feet, colour `0xff3a1a` |
| Counters | Sidestep, make it hit a wall or pillar, stay off the trail, kill it away from yourself and next to its friends |

## 10. Finales

### 10.1 Mini-boss: Jade Dragon (`S3-MB`, lockdown, 3 parts, 150 s)

Wave data unchanged: `BOSSES.dragon`, 2,200 HP, `breath`, `fireball`, `tail`, `fly`, phase
thresholds 60% and 25% (`src/data/enemies.js`). The campaign adds a part script, the perch state
and the room. The dragon has no charge, so the room needs no walls for it (PLAN §9). Its wave
`summon` step is replaced by the adds below.

| Part | HP | The dragon | Destroyable | Adds: trigger, method, spawn point, count | Arena change | Ends |
|---|---|---|---|---|---|---|
| 1 Roost (55 s) | 2,200 → 1,320 | Perched on Spire A, 14 m up. A salvo of 3 fireballs every 5 s (15 damage, splash 2.6). A breath sweep (0.7 s telegraph, 60°) at a player within 16 m of the spire. From below, only the head (weak zone) and neck can be hit | Spire A crack band, 300 HP, explosives ×4: one charge pack, two rockets, three thrown barrels, a Meteor Bonk, or about 6 s of machine gun. The spire falls, the dragon lands on the shelf stunned 4 s and loses 220 HP, then fights on the ground (`stalk`, `breath`, `tailSwipe`) | `t+6`, `air`, R-airN: `bitbug` ×8. `onPartDestroyed(spireA)`, `door`, R-NE: `boomMidget` ×2 | None | HP 60% |
| 2 Hunt (55 s) | 1,320 → 550 | Speed ×1.2. Loop: `fly` for 7 s (circle r 13 at 7 m, a fireball every 1.1 s, one swoop), then perch 8 s on Spire B, or C, or A if it still stands (breath and fireballs), then fly again. With no spire left it lands and uses the ground pattern | Spires B and C, as above. Each one dropped under it: 4 s stun and 220 HP | `onBossHp(60%)`, `air`, R-airS: `jetObama` ×2. `onBossHp(45%)`, `door`, R-SW: `midget` ×4 | The four shelf geysers wake (6 s period). The three by the spires lift you level with a perched head | HP 25% |
| 3 Grounded (40 s) | 550 → 0 | Speed ×1.4. Any spire left crumbles (2 s shake) and it cannot perch. Ground pattern: `breath`, `fireballs`, `tailSwipe` (20 damage, r 6.5), with 4 s hops | None | `onBossHp(25%)`, `air`, R-airN: `bitbug` ×6. `onBossHp(12%)`, `door`, R-NE: `midget` ×4 | `S3-roostW` shakes 2 s and sinks. The shelf is 46 × 48 m | Death: slabs open, CP6. Drops two guns (one Legendary); chest, ammo crate and mana bloom at the exit |

Adds: 26. Without explosives the fight is a shooting gallery at a small target and runs long;
each spire dropped is worth about 12 s. Taught before: charge packs and barrels in E4, launch
geysers in L02, sinking ground by Bridge 2.

### 10.2 Final boss: Tinubu, the Unshackled Demon (`SB-BOSS`, lockdown, 5 parts, 315 s)

Duel data unchanged (B §2, §3.5): stage health 1,100 / 1,111 / 800 × `DUEL_HP_K`; bolt `hellfire`,
blast `skull`; damage × 0.74 × stage damage × `DUEL_DMG_K`; AI profile, shield, dodge and volleys
as B §3.5. The campaign adds part 1, part 4 and the last-stand ring around the three stages.
Timing: card 3 s, the five parts, two 5 s transformations (sim frozen), 5 s death beat.

| Part | Kind | HP | Tinubu's attacks | Destroyable | Arena | Ends |
|---|---|---|---|---|---|---|
| 1 Shackled (45 s) | Entry, destroyable parts | Immune (hellfire aegis) | Stage 1 model on the dais, held by four chains. Does not move, no bolts. **Blast** every 3 s (20, splash 3.6). **Hellfire Pillars** every 12 s, first at `t+5` (8 eruptions, spacing 2.6, r 1.7, warn 0.85 s) | 4 chain anchors, 250 HP each, any order | Full floor. Fire ring 27.8 m. Two caldera lava pools | Fourth anchor destroyed: the aegis drops, the dais shatters, he walks free |
| 2 *Emi Lokan* (65 s) | Phase, Duel stage 1 | 1,100 × K | Full Duel fighter: bolts, **Blast**, shield, dodge. **Hellfire Pillars** (cd 12) | — | As part 1 | Bar empty: `hellfire` transformation |
| 3 *Unshackled* (75 s) | Phase, Duel stage 2 | 1,111 × K | Adds **Stun** (1 s, range 34), the **Hellfire** volley (3 shots, 20°), **Infection** (4 seekers, speed 9, 5.5 s, drain mana; cd 15). Powers recharge ×0.85 | — | Duel stage 2 shift: ring 26.8 m, four **Magma Fissures** (r 1.7 to 2.3), one **Hot Spring** (9 HP/s, 40 HP). Fissures are placed by the Duel rule but only on what will be island tops; the spring is fixed on I-NW | Bar empty: he slams the floor |
| 4 The Floor Is Lava (50 s) | Intermission, arena shift | Immune (aegis) | Kneels on the central island. Keeps **Hellfire Pillars** and **Infection** on stage 2 cooldowns. No bolts, no volley, no movement | 3 Caldera Hearts, 300 HP each, on I-N, I-SE, I-SW | After a 3 s crack telegraph `SB-floor` falls away. What is left: the central island, six outer islands, six stones, and lava between. Mana Surge on I-NE | Third heart destroyed: transformation to stage 3. If 75 s pass, the hearts burst and part 5 opens with Meteor Rain already charged |
| 5 *Inferno Incarnate* (62 s) | Phase, Duel stage 3, last stand | 800 × K | Adds the **Ultimate** (wave to 40 m, ×0.35 against a jump, dash or Mana Shield), the **Inferno** volley (5 shots, 40°), **Inferno Rings** (3 rings, 0.8 m high: jump them), **Meteor Rain** (10 circles r 2.2 in 2.6 s). Powers recharge ×0.72 | — | Duel stage 3 shift: ring 25.5 m, three **Eruption** vents fixed on the central island at R 7, θ 90, 210, 330 (warn 1.3 s, 13 damage, knockback 19); spring refilled; Overshield at the centre. At 66% of the bar I-N, I-SE and I-SW shake 2 s and sink. At 33% I-NE, I-NW, I-S and the stones sink and the ring closes to 14 m at 0.9 m/s: the last third is fought on the central island | Bar empty: death. Hellfire Breath, the loot in §12, lava crusts over, `SB-out` opens, CP10 |

Add schedule (44 adds, never more than 16 alive; adds still alive carry into the next part):

| Part | Trigger | Method | Spawn point | Enemies |
|---|---|---|---|---|
| 1 | `t+2` | `door` | T-NE and T-NW, 3 each | `midget` ×6 |
| 1 | `onPartDestroyed` (second anchor) | `door` | T-SE | `boomMidget` ×2 |
| 2 | `t+12` | `door` | T-SW | `obama` ×2 |
| 2 | `onBossHp(50%)` of the stage bar | `door` | T-NW | `midget` ×4 |
| 3 | `t+8` | `portal` | a hellfire ring at the north edge, θ 0, R 20 | `midget` ×4 |
| 3 | `onBossHp(60%)` | `door` | T-NE | `tinubuImp` ×1 |
| 3 | `onBossHp(30%)` | `air` | over the north wall, held under the lid | `flyingMidget` ×3 |
| 4 | `t+2` | `air` | out of the lava vent beside I-N | `bitbug` ×8 |
| 4 | `onPartDestroyed` (first heart) | `door` | T-SE | `boomMidget` ×3 |
| 4 | `onPartDestroyed` (second heart) | `door` | T-SW | `midget` ×4 |
| 5 | `onBossHp(66%)` | `portal` | central island rim, θ 90 and θ 270 | `tinubuImp` ×2 |
| 5 | `onBossHp(33%)` | `burrow` | crawl out of the lava onto the central island rim, θ 0, 72, 144, 216, 288 | `midget` ×5 |

**Taught before the fight.** Destroyable targets: the barricade and the spires (S3). Islands and
lava wading: S4. Sinking ground and a shrinking arena: Bridge 2 and dragon part 3. Imps: `S2-E2`,
`S2-E3`, `S5-E7`. Hellfire Pillars: Tinubu's preview at the end of L09.

**Starter loadout check (PLAN §9, §7.4).** A verified run starts in `SB` with the starter machine
gun, level-1 skills, Goo Bolt only, 100 mana and a finite reserve of bullets. Part 1: anchors are
250 HP targets in the open. Parts 2, 3, 5: Tinubu's bars; the depot crate on the central island
refills bullets without limit and is never more than 28 m away. Part 4: every gap is 2.5 m or
less, a single jump, and the hearts can be shot from the central island. No spell, no double jump
and no rocket is required. The depot crate, rack, Rocket Crate, three ammo boxes, Mana Surge,
Overshield and spring are all inside `SB`.

**Tuning targets.** `DUEL_HP_K` and target HP must give 62 to 75 s per stage for a tier-matched
player with Epic (base-tier) guns, and the hub loadout must finish inside the hub's time limit. B §1 asks for
90 to 150 s per stage; three such stages plus parts 1 and 4 would break PLAN §9's 5.5 minutes.

### 10.3 Eruption escape (`S6-ESC`, objective `escape`, 95 s expected, 120 s limit)

Lava starts at `t+6` and rises 1.5 m/s. It tops the shaft at `t+88`; then the ash wall leaves
x 62 at 7 m/s and reaches the ship at `t+120`. Flyers despawn 30 m below the lava or behind the
ash. They do not have to be killed. 86 flyers, never more than 14 units alive.

| Time (s) | Player is at | Lava or ash | Hazard | Flyers: trigger, method, from, count |
|---|---|---|---|---|
| 0–8 | Raft → L1 (y 0 → 24) | y −3, starts at 6 | — | `t+3`, `air`, vent Va: `bitbug` ×8 |
| 8–17 | L1 → L2 (24 → 48) | y 0 → 14 | Debris lanes 1, 3, 5 | `onEnter` y 26, `air`, vent Vb: `flyingMidget` ×4 |
| 17–26 | L2 → L3 (48 → 72) by the updraft | y 14 → 27 | Balloons in the updraft | `placed` in the updraft at y 54, 58, 62, 66, 70: `balloonMidget` ×5. Shoot one from L2 and the chain clears the lift |
| 26–35 | L3 → L4 (72 → 96) | y 27 → 41 | Debris lanes 1, 3, 5 | `onEnter` y 62, `air`, vent Vc: `bitbug` ×8. `onEnter` y 74, `air`, down from y 110: `jetObama` ×2 |
| 35–45 | L4 → L5 → lip (96 → 120) | y 41 → 56 | All six debris lanes | `placed` around L5 at y 104–114: `balloonMidget` ×4. `onEnter` y 100, `air`, from above: `flyingMidget` ×3 |
| 45–55 | Lip → R1 (x 66 → 105) | y 56 → 71 | Flight debris, one per 3 s | `onEnter` lip, `air`, out of the plume behind: `bitbug` ×8. `onEnter` x 70, `air`, from the north: `jetObama` ×2 |
| 55–64 | R1 → T1 → R2 (105 → 150) | y 71 → 84 | R1 sinks once touched | `onEnter` R1, `air`, from below: `bitbug` ×8. `placed` in a ring r 6 round T1 at y 120–132: `balloonMidget` ×5 |
| 64–73 | R2 → T2 → R3 (150 → 195) | y 84 → 98 | Flight debris | `onEnter` R2, `air`, from the south: `flyingMidget` ×4. `onEnter` x 165, `air`, from above T2: `bitbug` ×8 |
| 73–82 | R3 → T3 → R4 (195 → 240) | y 98 → 111 | Flight debris | `onEnter` R3, `air`, level, from the east: `jetObama` ×2 (one **E**). `placed` round T3 at y 128–140: `balloonMidget` ×4. `onEnter` x 205, `air`: `bitbug` ×8 |
| 82–95 | R4 → ship (240 → 285) | lava at the lip at 88, ash from x 62 | Last debris at x 262, 272 | `onEnter` R4, `air`, from behind: `flyingMidget` ×3 |
| 95 | On the ramp | — | — | `levelComplete`, credits |

Totals: `bitbug` 48, `flyingMidget` 14, `balloonMidget` 18, `jetObama` 6. A player at half the
expected pace is 5 m above the lava at the lip and reaches the ship with the ash 30 m behind.

## 11. Mechanisms, magic and explosives used

| Kind | Where | New to this level |
|---|---|---|
| Kill plane and void rescue | S1, S3, S5 pit, S6 flight | No |
| Lockdown (PLAN §5.6) | Kiln, Roost, Caldera | Fire curtain and heat lid for an open-air room; boss parts used as waves |
| Caves as door spawners, burrow mounds | S1, S2, S3, S4, S5, SB | No |
| Rope bridge, collapsing bridge | S3 | A bridge the player can drop early by shooting its anchor barrels |
| Geyser | S3, S4 | **Changed:** a launch geyser takes a `to` target; a second kind only damages |
| Lava channels, pools, wade-lava basin | S2, S4, S5, SB | Lava that is a damage zone, not a void rescue |
| Barrels, charge packs, fragile walls | S2, S3, S5 | No |
| Destructible targets | Spire crack bands, chain anchors, Caldera Hearts | Targets that hold up a boss (perch) or keep it immune |
| Conduit, raised pillars, energy bridge, mana bloom | S4 | No |
| Falling debris | S5 Leg B, S6 | **New:** `debris` emitter, a shadow telegraph then a falling sphere |
| Breakaway and sinking solids | Roost shelf, SB floor and islands | **New:** solids removed or sunk by a part script |
| Fire ring with a scripted radius | SB part 5 | **New:** radius set by the part script, not only by Duel stage |
| Jetpack pickup, fuel pads, updrafts | S6 | Fuel pads on moving, sinking debris rafts |
| Rising lava, advancing ash wall | S6 | **Changed:** `risingHazard` that moves along x as well as up |
| Depot | S3, S5 | No |
| `burnTrail` | Tinubu Imp | Shared with the Magma Slug's trail from L07 |

Magic: no shrine. Every world object from PLAN §6.2 appears except `gooGear`, `pressurePlate`,
`seedPod` and `nullZone` (the Nullifier brings its own field). Explosives: barrels (fire, shock,
goo), charge packs, and rockets from three Rocket Crates.

## 12. Checkpoints, depots, weapons, loot, ammo, power-ups, secrets

| # | Checkpoint | Where | Time | Gap |
|---|---|---|---|---|
| CP1 | Start | S1 landing | 0:00 | — |
| CP2 | Tube mouth | S1 (228, 0, −11) | 1:52 | 1:52 |
| CP3 | Kiln door | S2 Tube B (84, 0, −45), outside `S2-L1-in` | 3:01 | 1:09 |
| CP4 | Kiln cleared | S2 exit door | 5:01 | 2:00 |
| CP5 | Roost gate | S3 Bridge 3 (156, 0, −64), after Depot 1 | 7:28 | 2:27 |
| CP6 | Roost cleared | S3 exit door; respawn on S4 G1 | 9:58 | 2:30 |
| CP7 | Rim top | S5 shelf | 11:48 | 1:50 |
| CP8 | Leg B | S5 (119, −11.3, −80) | 13:34 | 1:46 |
| CP9 | Caldera gate | SB tunnel (45, 0, −14), after Depot 2 | 15:44 | 2:10 |
| CP10 | Escape start | S6 raft. The escape always restarts here | 21:09 | 5:25 |

Ten checkpoints. Nine gaps are 2 min 30 s or less. The tenth is the boss: PLAN §5.6 restarts a
lockdown from its first wave, so there is no save inside the 5 min 15 s fight (see §14, item 5).

**Depots (PLAN §7.7).** Each is a depot crate (unlimited ammo), a health station, the spell
loadout bench, the ticket shop terminal and a checkpoint. No Weapon Box. Depot 1 on Mesa 2 (7:24,
before the Jade Dragon), with two charge packs. Depot 2 on the rim terrace (15:32, before Tinubu).

### 12.1 Weapons and loot

| Rack or cache | Where | Guns | `why` |
|---|---|---|---|
| `S1-cache` | S1 (15, 0, −12) | Machine gun, shotgun, sniper, bazooka, all **Epic** | "S1-E1 snipers; one gun for each exam" |
| `SB-rack-bz` | SB (42, 0, −27) | Bazooka, **Epic** | "SB-BOSS: anchors, hearts and Imps" |

Tier odds for enemy drops in L10 (PLAN §7.3): Common 0%, Uncommon 5%, Rare 35%, **Epic 44%**,
Legendary 16%. Base tier Epic. Drop chance per kill is today's 2% to 10% by enemy: about 8 guns
from the 152 enemies outside the escape. Escape flyers drop no guns. No gun type is new here.
No enemy drops a crafting resource.

| # | Guaranteed drop | Where it lands | What |
|---|---|---|---|
| 1 | Elite `auditSniper` (`S1-E1` d) | Delivered to Pulpit 2 (163, 4, −9), since it dies across the chasm | 1 gun, rolled one tier step up |
| 2 | Kiln lockdown chest | S2 (130, 0, −43), at the exit slab | 1 gun, Epic or better, a type not carried if possible |
| 3 | **Secret weapon cache** | S3 hidden ledge under Mesa 0 (14, −4, −49) | 1 gun, **Legendary** |
| 4 | Jade Dragon | Where it dies; (192, 0, −64) if that is not on the shelf | 2 guns: one from the tier row, one **Legendary** (one tier above base) |
| 5 | Roost lockdown chest | S3 (220, 0, −62), at the exit slab | 1 gun, Epic or better |
| 6 | Elite squad (`S5-E7` a) | The north-east pad of S5 | 2 guns (one per elite Agent), each rolled one tier step up |
| 7 | Tinubu | SB central island (45, 0, −50) | 2 guns, both **Legendary**, and the boss gun (Ray Gun or Big Bullets, the one not carried), **Legendary**. The last drop of the campaign is always Legendary, for replays |
| 8 | Caldera lockdown chest | SB (45, 0, −77), at the exit slab | 1 gun, Epic or better |
| 9 | Elite `jetObama` (`S6-ESC`) | Delivered onto raft R4 (238, 137, −42) | 1 gun, rolled one tier step up |

Thirteen guaranteed guns besides the five placed ones; six of them are certain Legendaries.

### 12.2 Ammo boxes, crates and the budget

Each discipline section stocks its own ammo. Every checkpoint has a box, every rack has its type
within 30 m, every encounter has its type within 20 m before it, and each lockdown has boxes
inside and an ammo crate in its reward (PLAN §7.4). Box sizes: bullets 60, shells 12, sniper
rounds 8, rockets 3.

| Section | Ammo boxes: type (x, y, z) | Crates |
|---|---|---|
| S1 | bullets (11, 0, −9) CP1; shells (13, 0, −9); rockets (19, 0, −9); sniper (28, 0, −9), 12 m before E1; sniper (90, 0, −8) Pulpit 1; sniper (160, 4, −8) Pulpit 2; bullets (226, 0, −9) CP2; shells (233, 0, −12), 17 m before E2 | — |
| S2 | shells (46, 0, −39.5) Fork; shells (84, 0, −46.5) CP3; bullets (82, 0, −43.5) CP3; **in the Kiln:** shells (91, 0, −28), bullets (129, 0, −62); rockets (136, 0, −45) CP4 | Ammo crate (130, 0, −41), Kiln reward |
| S3 | bullets (8, 0, −60) Mesa 0; rockets (63, 0, −66) Mesa 1; sniper (155, 0, −63) CP5; **in the Roost:** rockets (164, 0, −56), bullets (164, 0, −72), sniper (218, 0, −44) | Depot crate (129, 0, −56). Ammo crate (220, 0, −60), Roost reward |
| S4 | bullets (8, 0, −56) CP6; bullets (90, 0, −57) G5; bullets (130, 0, −58) G8 | — |
| S5 | rockets (30, 0, −55) CP7; bullets (34, 0, −47); bullets (117, −11.3, −80) CP8; shells (121, −16, −117) | Rocket Crates (40, 0, −47) and (72, −2.9, −48.5). Ammo crate (117, −16, −121). Depot crate (36, −30, −67) |
| SB | bullets (45, 0, −12) CP9; **in the Caldera:** bullets (45, 0, −31) I-S, bullets (27.2, 0, −57) I-NW, rockets (62.8, 0, −42) I-SE | **Depot crate (45, 0, −42)**. Rocket Crate (48, 0, −27). Ammo crate (45, 0, −76), reward |
| S6 | all bullets, all on the rock the player lands on: raft (43, 0, −40) CP10; ledge L2 (55, 48, −38); ledge L4 (40, 96, −23); lip (68, 120, −38); raft R2 (152, 129, −34); raft R4 (242, 137, −40) | — |

Count: **37 ammo boxes** (bullets 20, shells 6, sniper 5, rockets 6), **4 ammo crates**, **3 depot
crates**, **3 Rocket Crates**.

**Budget.** HP is tier-1 base and damage is an Epic gun's base, since both scale 1.15 per tier:
13 per bullet, 73 per shell with 70% of pellets on target, 123 per sniper body shot, 203 per
rocket. "Drops" are smart enemy packs (PLAN §7.4).

| Section | Headline ammo | Asked of it | Placed before or inside | Drops | Ratio |
|---|---|---|---|---|---|
| S1 | Sniper rounds | 10: two per sniper, four for the elite, two for the drone | 24 (3 boxes) | 5 | **2.9** |
| S2 | Shells | 21: 70% of 1,720 HP at 73 a shell, plus 25% misses | 48 (4 boxes from CP2 on) | 16 | **3.0** |
| S3 | Rockets | 8: two for the barricade, two per spire. Seven charge packs and twelve barrels do the same job | 21: three boxes and the depot crate to the cap of 12 | 2 | **2.9** |
| S4 | Bullets (the fallback; magic is the tool) | 64: Leeches, Nullifier and a softened Bark Brute, 500 HP at 60% hits | 180 (3 boxes) | 45 | **3.5** |
| S4 | Mana, at 100 max and 5 /s | 170: Goo and Zap on the Wisps 45, Goo and Yeet on the Brute 35, two conduits 60, one spare Zap 30 | 100 + 96 s × 5 + three blooms 150 − Leech drain 160 = 570, before the Mana Surge | — | **3.4** |
| S5 | Rockets | 9: six for the van (900 HP at 80% hits), two Rocket Obamas, one for the Golden Bonk wall | 27: one box, two Rocket Crates | 2 | **3.2** |
| SB | Bullets, starter machine gun (Common, 9 a bullet) | 1,300: 7,027 HP of bars, anchors, hearts and adds at 60% hits. That is 2.7 full reserves | The depot crate, unlimited; plus 3 boxes and the Rocket Crate | about 10 packs | **no limit** |
| S6 | Bullets | 86: a third of the flyers, 562 HP at 50% hits | 360 (6 boxes on ledges and rafts) | none (packs fall) | **4.2** |

The lowest ratio is 2.9, against PLAN's 1.5.

### 12.3 Power-ups and explosives

| Item | Where | For |
|---|---|---|
| Overshield ×2 | S4 island G6; SB centre at part 5 | The geyser route; the last stand |
| Mana Surge ×2 | S4 island G5; SB island I-NE | The Leeches; part 4 |
| Rocket Crate ×3 | `S5-rocket1`, `S5-rocket2`, `SB-rocket` | The van; the boss |
| Charge packs ×7 | Mesa 1 ×3, Depot 1 ×2, Roost ×2 | Barricade and spires |

### 12.4 Secrets

| Secret | Where | Notes |
|---|---|---|
| Golden Bonk: Iron Sproto (death restarts the level, tickets ×3) | S5, the pocket on Leg C at (68, −22.3, −128), behind `S5-gbWall` | A rocket, a charge pack or a Meteor Bonk opens it. The Rocket Crates on Leg A supply the rocket |
| **Mana Battery** (the tenth: +10 max mana, +0.5 mana/s; 200 and 10 /s with all ten) | S4, island G7 at (114, 0, −86), behind the basalt cluster | Off the route. Three stones from G5, or Magic Carpet |
| Secret weapon cache | S3, the ledge under Mesa 0 | Drop off the south lip at x 14. A guaranteed Legendary. The geyser returns you |
| Audit File 1 | S1, the nook under Pulpit 2 | *"Form 10-K(aldera). Assets: one volcano. Liabilities: one volcano."* |
| Audit File 2 | S2, the dead end of tube T2 | *"Imp payroll. Paid in exposure. To lava."* |
| Audit File 3 | S3, the roof of the C-M2 hut on Mesa 2 (127, 4, −74); double jump from the boulder | *"Tinubu, personal return. Filing status: Unshackled. Dependents: four chains."* |

## 13. Difficulty

**Harder than L09.** L09 lets the player choose the order and walk away from a fight; L10 is one
road with three sealed rooms. Tier 10 against 9. `maxAlive` is 16 in both, but L10 puts a fall, a
lava edge or a timer under every fight. It has an elite sniper, an elite squad and an elite flyer,
a new elite charger, three finales against L09's two, and the longest boss in the game with no
save inside it.

| Setting | Changes |
|---|---|
| Easy | `maxAlive` 12. No elites outside `S5-E7`. Sniper laser 1.8 s. Lava 15 dps. Kiln waves lose their Boom Midgets (20 enemies). Spire crack bands 200 HP. Tinubu's powers recharge ×1.25 and part 4 has no time-out. Escape: lava 1.2 m/s, limit 150 s |
| Normal | As written |
| Heroic | One more elite in each of `S1-E1` (second sniper), `S2-E3` (wave 4 Imp), `S5-E6` (a Rocket Obama). Kiln wave 2 adds `riotMidget` ×2. Dragon adds +50%. Tinubu: an Imp joins the part 1 and part 4 schedules; part 4 time-out 60 s; part 5 ring closes to 12 m. Escape: lava 1.8 m/s, limit 105 s |
| Legendary (unlocked here) | Heroic, plus enemy HP and damage × 1.25 and no void-rescue refunds: a fall costs 50% HP |

Boss and mini-boss HP are the same on every setting (they are in the content fingerprint).

## 14. Engine needs

| Id | Use in L10 |
|---|---|
| E1 | Collision on ledges, ramps, tubes, islands; kill planes and void rescue in four sections |
| E2 | Sniper sight lines over 70 m, spire occlusion, cover queries, `hasLOS` for boss powers |
| E3 | Nav on ramps and islands; nav links for bridges, stones and geysers; flyers held inside a lid; 3D steering in S6 |
| E4 | Squads, triggers, all nine spawn methods, objectives `clearAll`, `reach`, `destroy`, `boss`, `escape`; three lockdowns |
| E5 | Sphere, cone, disc; `lava` and `neon`; prefab instancing; the Imp's `look` parts |
| E6 | Every mechanism in §11 |
| E7 | Real behaviour for `boomMidget`, `riotMidget`, `sewerMidget`, `hexAcolyte`, `glowieAgent`, `auditSniper`, `bitbug`, `jetObama`, `balloonMidget` |
| E8 | `tinubuImp`, `bombTosser`, `magmaSlug`, `hexWisp`, `manaLeech`, `barkBrute`, `nullifier`, `spotterDrone`, `auditVan`, `rocketObama` |
| E9 | Jetpack v2 as a mid-level pickup, fuel pads on movers |
| E10 | All fourteen spells, conduits, mana blooms, Hellfire Breath |
| E11 | Barrels, charge packs, fragile walls |
| E12 | Part scripts for the dragon and Tinubu; the Duel port of Tinubu |
| E13 | Depots (no Weapon Box), carry-over, boss bar with five part pips, lockdown HUD, escape timer, cards, credits, the Legendary and modifier unlocks |
| E14 | Validator, pacing estimate, map export, autopilot bot that can fly |
| E15 | `CANONICAL_BOSSES` for Tinubu moves from `S3-E3` to `SB-BOSS`; Tinubu's HP moves from one 1,600 bar to three Duel bars. Both re-pin the campaign fingerprint `bfe99bf4` |
| E16 | No crafting, no resources, no Magic levels: the level assumes spell unlockables and the Mana Battery |
| E17 | The L10 tier row, nine guaranteed drops, lockdown chests, 37 ammo boxes, crates, the depot crate in `SB`, smart drops |

Needs that PLAN §10 does not list:

1. **Perch state for a wave boss**: perch points, a destroyable support, fall, stun and fall damage.
2. **Breakaway and sinking solids** driven by a part script, with nav rebuilt for the new floor.
3. **Scripted fire-ring radius**, and an **immune, immobile boss state** (the aegis) tied to targets.
4. **`debris` emitter** and an **advancing hazard on x** (the ash wall).
5. **A decision on saves inside a boss lockdown.** PLAN §3 says checkpoints are never more than
   2.5 minutes apart; PLAN §5.6 says dying restarts a lockdown from the start; PLAN §9 allows a
   5.5-minute boss. Proposed: part saves at the two transformations, off in hub-verified runs.
6. **Pacing estimate rules** for E14: escape encounters are stated-time beats; adds inside a
   finale block are not summed; rows for the PLAN §5.3 enemies.
7. **Geyser `to` target** and a damage-only geyser (C §3.9 has one fixed 12 m launch).
8. **Lockdown lid for open-air rooms** (fire curtain, heat lid) that flyers and spells respect.
9. **Drop delivery.** A guaranteed drop from an enemy that dies out of reach (a sniper across the
   chasm, a flyer over lava) must land at a named point on the player's side.

## 15. Bot route and tests

Bot route (god mode, fixed seed), as waypoints: S1 trail centre line to x 236; S2 Tube A, Fork,
Tube B, Kiln threshold, hold at (98, 0, −45) until clear, exit tube; S3 Bridge 1, plant the charge,
the Teeth (never Bridge 2), depot, Roost threshold, plant at A, B, C in turn; S4 the stone route
G1, G2, G4, G5, then GY4 and GY5 (no spells); S5 Legs A to D on the cliff side, depot, tunnel; SB
anchors clockwise from θ 45, circle the central island, hearts N, SE, SW, then stay inside R 9;
S6 ledges L1 to L5, lip, rafts R1 to R4, ship.

| Test | Asserts |
|---|---|
| Validator | No errors; at most 600 solids per section; every rack has a `why`; no solid under 0.5 m |
| Reachability | From each of CP1 to CP10 the next checkpoint is reachable with single jumps and no spells (S6: with the jetpack) |
| Enemy total | The level data sums to 238, and by encounter to 12, 7, 25, 15, 26, 8, 8, 7, 44, 86 |
| Loot | Racks and the cache give Epic guns; every guaranteed drop in §12.1 appears, at its tier, at a reachable point; no drop table names a resource; drop tiers over 10,000 seeded rolls match the L10 row within 1% |
| Ammo | 37 boxes, 4 ammo crates, 3 depot crates, 3 Rocket Crates; a box at every checkpoint; two or more boxes inside each lockdown; the §7.4 distance rules hold; the machine gun runs dry without pick-ups |
| Mana | The bot clears S4 with 100 max mana and 5 mana/s, and separately with no spells |
| Pacing | The estimate is 1,364 s ± 5, inside par ± 120 |
| `maxAlive` | A timeline simulation of every encounter never has more than 16 units alive |
| Lockdowns | For each of the three: doors close 1 s after the threshold; Blink, Magic Carpet and a geyser launch cannot leave; the room is between 40 × 40 and 80 × 80 m with 3 or more spawn sides; doors open and a checkpoint saves on the last kill; a death restarts at wave or part 1 |
| Kiln waves | 4 waves, 25 enemies; each wave starts on `onRemain(2)` or at 25 s; the anti-stall marks the last 2 at 12 s |
| Dragon | Parts change at 60% and 25%; a destroyed spire under a perched dragon gives the stun and 220 damage; the fight can be won with bullets only |
| Tinubu parts | Immune in parts 1 and 4; each part ends on its condition; adds follow the schedule exactly; the floor breaks once; islands sink at 66% and 33%; the ring reaches 14 m |
| Starter loadout | A scripted bot with the starter machine gun (finite reserve), level-1 skills and no spells clears `SB-BOSS` from a section start, refilling only at `SB-depotCrate` |
| Duel parity | Tinubu's attack and power numbers equal B §3.5 (the parity test of B §8) |
| Escape | The bot finishes in under 120 s; a bot at half speed still finishes; a stationary bot is caught by the lava |
| Imp | Wall stun, belly weak spot, trail duration, death blast radius, edge kill without a blast |
| Determinism | Two bot runs with one seed give the same state hash at every checkpoint |
| Pins | Wave Mode, Sandbox and PvP hashes do not move. The campaign fingerprint moves once, in the pin PR |

## 16. Build tasks

1. Create `src/data/levels/L10/index.js` (header, section order, cards) and `S1.js` to `S5.js`, `SB.js`, `S6.js`. Write `prefabs/volcano.js` (§7).
2. Block out S1 to S5 (§6.1 to §6.5), then SB and S6. Run the validator and the map export. Fix reachability.
3. Add checkpoints, depots, the cache and rack at Epic, power-ups and secrets (§12).
4. Add every ammo box and crate from §12.2 and check the PLAN §7.4 distance rules.
5. Add mechanisms section by section (§11), then the three lockdowns with doors, thresholds, lids, spawn points and reward chests (§8).
6. Add `tinubuImp` data and behaviour (§9) with its tests.
7. Write encounters `S1-E1`, `S2-E2`, `S2-E3`, `S3-E4`, `S4-E5`, `S5-E6`, `S5-E7` (§8). Get the bot through S1 to S5 with the dragon stubbed out.
8. Write the Jade Dragon part script and perch state (§10.1).
9. With the boss track: port Tinubu (B §3.5), then write the five-part script, the breakaway floor and the ring schedule (§10.2).
10. Run the starter-loadout test. Tune `DUEL_HP_K`, anchor and heart HP to the part lengths.
11. Write `S6-ESC`: jetpack pickup, rising lava, debris, rafts, the flyer schedule, the ash wall, the ship (§10.3).
12. Loot: the L10 tier row, the nine guaranteed drops and drop delivery (§12.1). Hellfire Breath, credits, the Legendary and modifier-menu unlocks.
13. Difficulty variants (§13).
14. Full bot run, determinism test, pacing check, the ammo and mana tests, a human playthrough against the 22-minute par.
15. Tuning pass on level data only. Then the pin PR with the hub re-vendor (E15).
