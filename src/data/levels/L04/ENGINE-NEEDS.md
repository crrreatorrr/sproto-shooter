# L04 engine needs

The Blockchain Void is authored against `docs/campaign/ENGINE-API.md` and
`docs/campaign/levels/L04-blockchain-void.md`. Level data already carries the
ids, positions and numbers. Do not change the census (152 enemies + Bitcoin
Obama and The Midget) to paper over these.

Tier is 4. Enemy HP and damage scale by **1.52** (1.15³). Player hazard damage
does not scale. `DUEL_HP_K` for this fight is **1.52**.

## Blocking a clear on today's director

1. **The canonical boss id is still `S3-E3`.** `assertCanonicalManifest()` in
   `src/data/serverManifest.js` requires an L04 encounter `S3-E3` whose units
   are exactly `obamaDuo` ×1 and `midgetDuo` ×1 and nothing else. The fight is
   section **`SB`**, encounter **`SB-BOSS`**, and that encounter also schedules
   the 40 adds. Importing the manifest throws `missing canonical encounter obama`.
   `contentFingerprint` hashes that encounter's `sectionStart`, so retargeting
   it moves campaign pin `bfe99bf4`. This PR does not edit the pin, the manifest,
   or `DUEL_BOSSES` (live bars are still Obama 760 and the Midget 520). E15.

2. **The shared autopilot never leaves the Genesis Block.** `s1.genCr3` sits
   on the centreline at `(22, 0.6, 60)`. The god-mode bot in
   `tests/levels/campaign.test.js` walks east and wedges on that crate; its
   strafe does not clear it (observed stuck at about x=20.8, z=60 for the
   rest of the run). Past that crate the route is the jetpack: the launch
   deck ends at x=90, h1 starts at x=102 (**12 m**), h2 is **16 m** further
   and **3 m** up, h3 is **20 m** further and **4 m** up. The bot never holds
   jump. `noteV2Section` does not copy `section.voids` onto `state.level.voids`,
   so the kill plane at **y = -40** never rescues. The run does not reach S2,
   a lockdown, the Duo, or the results screen.

3. **`flakPod` is not an enemy.** The first spawn is `S3-E5` squad A at
   `(63, 0, 60)`. `createEnemy` reads `ENEMIES[type]` and throws. The stat
   block is `FLAK_POD` in `enemies.js`. Wire `look` the way `buildLookGroup`
   already draws.

4. **Targets never call `markPartDestroyed`.** `S3-E5` is `destroy` of
   `s3.gatePylon` (228 HP). `S5-E8` also destroys `n1`, `n2`, `n3` (228 HP
   each); squad B's trigger is `onPartDestroyed` of `n1`, and the document
   wants the **first** of the three. Boss pylons are **274 HP** each (`sb.py1`,
   `sb.py2`, `sb.py3`). Circuit breakers are **365 HP** each (`sb.cb1`,
   `sb.cb2`). A `kind: 'target'` mechanism has HP in the data and no ticker.

5. **v2 does not tick the Duo.** `campaignPost` returns inside `v2Post` before
   `tickDuelBoss`. There is no part script, Price Shield, held transform, last
   bar lock, tile drop, or fire-ring shrink. Stage bars the fight needs:
   Obama **578 / 669 / 760** (total 2,007), the Midget **684 / 783 / 852**
   (total 2,319). Names players see: **Bitcoin Obama**, **The Midget**,
   **The Pump & Dump Duo**.

6. **Add clocks and `maxAlive` units.** A squad `time` trigger carries `part`
   and a part-relative `t`. The director ignores `part` and fires on encounter
   time, so part 3's `t: 2` dumps a flock two seconds into the opening.
   `fallbackSec: 25` is on L1 and L2 and is not read. `maxAlive` counts bodies.
   Bitbugs count as **1 unit per 6**. L2's cap is **10 units**; wave 3 is a
   flak pod plus 8 bitbugs. The boss objective waits until every add squad has
   spawned and died. Leftover flocks leave when their part ends and drop nothing.

## Jetpack (E9)

`jetpack: 'pickup'`. `s1.jet` at `(85, 1.2, 60)` already sets `p.jetpack` and
80 fuel, because `kind: 'jetpack'` is wired. `sb.jet` at `(6, 1.2, 54)` must
do nothing when the player already has one (`skipIfOwned: true`). Still missing:

| Rule | Value |
|---|---|
| Hover | hold space, altitude held |
| Fast drop | C |
| Fuel regen | on landing, not while airborne |
| Fuel pad | continuous refill, and a void-rescue safe point. Ids: `s1.pad.h1` `s1.pad.h2` `s1.pad.h3`, `s2.pad.pk5` `s2.pad.k8` `s2.pad.k11` `s2.pad.k14`, `s3.pad.r1`–`r4`, `s4.pad.b3` `s4.pad.b9` `s4.pad.w` `s4.pad.e`, `s5.pad.w` `s5.pad.e`, `sb.pad.vest` `sb.pad.t31` `sb.pad.t13` |
| Ceiling | SB lid **y = 16**, jetpack ceiling **14 m**. L1 lid y=24, L2 lid y=30 |
| Infinite Fuel | `s5.fuel` at `(60, 17, 80)` for **20 s**. `sb.fuel` appears on the podium when part 5 starts (`when: 'part:5'`). Today's `modifier: 'fuel'` is permanent |

`sb.gate` opens only while `p.jet.has`. `flagOn` does not understand that string.

## Flyers (E7) — use the document, not the live dress()

| Id | Spec HP (tier 4) | Live HP | What the level needs |
|---|---|---|---|
| `bitbug` | 12 (18) | 18 | Flocks of 3 to 8. Circle at **8 m**, then dive-bite for **4** (6 at tier 4). 6 bodies = 1 `maxAlive` unit. Chain Zap kills **4** per cast |
| `jetObama` | 80 (122) | 55 | Holds the squad `alt` band. Matches the player's height when the player is airborne. 4-round bursts. Thruster ×**2** (live weak spot is 2.5×). Death blast r **3**, damage **15**. Goo Bolt drops it |
| `balloonMidget` | 10 (15) | 28 | Drifts at **3 m/s** plus wind. Bursts within **2.5 m**, r **4**, damage **20** (30 at tier 4). Chains to other balloons and hurts enemies. Live blast is 18 in r 2.6 |

`alt` on a squad is an absolute section y, because most of the level has no ground. Copy it through `makeV2Level` (it is not shifted; it is a height). Elites on units (`elite: true`, names **Head Trader**, **Priority Fee**, **Whale**, **Shooter Bot**) are dropped by `spawnOne`. Elite HP is ×2.5. The Whale fires 6-round bursts. Priority Fee is below.

## `flakPod` (E8)

Tier-1 numbers. Tier 4 in parentheses.

| Field | Value |
|---|---|
| HP | 160 (243). No stagger. Elite Priority Fee 400 (608), scale 1.25 |
| Body | r 1.3, h 2.6, speed 0. Turn 120°/s. Pitch −5° to +85° |
| Target | Airborne only: not grounded for **0.35 s**, and feet more than **1.2 m** above the surface or over the void. Range **45 m** (elite **55 m**), line of sight. Drops the lock **0.5 s** after the target lands. Cannot aim below −5° |
| Gas Fee | 0.9 s tell (whine + purple lock line). Then **4** shells (elite **6**), **0.22 s** apart. Shell speed **24 m/s**, r 0.3, proximity fuse **2.5 m**. Burst r **3.2 m**, damage **8 to 4** (12 to 6). Each burst that hits drains **18** fuel. Lead **70%**. **3.0 to 3.6 s** between bursts |
| Hitboxes | Base cylinder r 1.3, y 0–1, `body`. Turret sphere r 0.85 at y 1.7, `armor` ×0.4. Vent sphere r 0.4 at y 0.8, z −1.2, `weak` ×2.5, open **1.5 s** after each burst |
| Reactions | Goo Bolt jams **4 s**. Chain Zap stuns **1.5 s**. Yeet turns shells round. Mana Shield absorbs **60%** of the damage and **all** of the fuel drain (6 mana per hit instead). The gravity well bends shells |
| Drops | Ammo 85%, gun 8%, 4 tickets, **no resources**. The elite always drops one gun. Proposed random gun chance 8%; bitbug 0.5%; balloonMidget 0; jetObama 6% |

Easy: 3 shells, drain 10 fuel, and no E5 flock. Heroic: lead 100%, range 55 m, elite 65 m. L2 heroic adds a second pod at the hatch `(152, 0, 126)`.

Player state **airborne** has to be readable by this AI. It is not, beyond a render bob.

## Void, wind, updraft, well (E1, E6)

Each section has `voids` in world space after `index.js` shifts them, plus a `killPlane` mechanism.

| Section | Plane | Rescue | Penalty |
|---|---|---|---|
| S1–S3, S5, SB | y = **−40** | last safe ground (fuel pads are safe points) | **25%** max HP, then **1 s** invulnerable |
| S4 | y = **−60** | same | same |
| SB after the Flash Crash | y = −40 | **fixed** at the centre tile `(70, 0, 60)` | same |

Easy penalty is **10%**. `state.level.voids` is never copied off the section, so `voidAt` never sees these boxes.

| Zone | Box (section-local) | Force |
|---|---|---|
| `s3.wind` | min `(80, -8, 44)`, max `(250, 34, 76)` | `(6, 0, 0)` — about 14 m/s east. Flying west is slow |
| `s4.wind` | min `(36, -10, 60)`, max `(126, 30, 140)` | `(0, 0, 3)` — pushes flyers and balloons south |
| Updrafts `s2.pv1-up` `s2.pv2-up` `s2.v1-up` `s2.v2-up` `s2.v3-up` `s2.v4-up` | the min/max on each mechanism | **+30 m/s²** up, net +8 against gravity |

`s4.well` at `(177, -8, 100)`, r **26**, strength **5**, kill sphere r **4**. Pulls flyers, enemy bullets, flak shells, wrecks and pickups. Never the player's bullets. A drop that reaches the hole is thrown onto the east floor strip, not into the kill sphere. Falling down the hole is a void rescue.

`kind: 'hazardZone'` today only applies `slow` and `dps`. These zones set `force` or `accel` and neither.

## Bridges, movers, doors

Energy-bridge **decks are solid now** so the spans are not holes (`eb1`–`eb5` geometry, tag `energyBridge`). Hide them until the conduit fires. `eb5` waits until **n1, n2 and n3** are destroyed, not a Chain Zap.

| Bridge | From → to | Width | Power |
|---|---|---|---|
| `eb1` | `(30, 0, 60)` → `(44, 0, 60)` | 4 | `c1` at `(37, 2, 50)` |
| `eb2` | `(106, 2, 68)` → `(136, 2, 54)` | 4 | `c2` at `(98, 4.5, 74)` |
| `eb3` | `(192, -2, 65)` → `(224, -2, 59)` | 4 | `c3` at `(184, 0.5, 70)` |
| `eb4` | `(169, 0, 100)` → `(185, 0, 100)` | 4 | `c4` at `(152, 2.5, 76)` |
| `eb5` | `(102, 0, 80)` → `(112, 0, 80)` | 5 | all three nodes |

A player walking an energy bridge is grounded, so a flak pod does not fire. Chain Zap powers a conduit.

Movers are `mode: 'pingpong'`. The director's `mover` shoves the player toward `to` once.

| Id | Path | Speed | Pause |
|---|---|---|---|
| `s2.sl1` | `(112, 5, 74)` ↔ `(112, 5, 126)` | 4 | — |
| `s2.sl2` | `(132, 11, 126)` ↔ `(132, 11, 74)` | 4 | — |
| `s3.slA` | `(90, 12, 53)` ↔ `(150, 12, 53)` | 8 | 1 s |
| `s3.slB` | `(150, 6, 68)` ↔ `(214, 6, 68)` | 8 | 1 s |
| `sb.SLa` | `(52, 1.25, 51)` ↔ `(88, 1.25, 51)` | 3 | — |
| `sb.SLb` | `(88, 1.25, 69)` ↔ `(52, 1.25, 69)` | 3 | — |

`gate1` opens on `S1-E1.cleared`. `s3.mouthGate` opens on `s3.gatePylon.destroyed`. `s5.vaultDoor` opens on `S5-E8.cleared`. `s5.exitDoor` is the boss-card trigger. `sb.gate` opens only while `p.jet.has`, then the L3 lockdown seals it **1 s** after the player crosses **x = 46** and it stays shut until the win. Lockdown entry doors must push a player standing in them; they never close on the body.

`navLinks` are shifted into world space on each section. `noteV2Section` does not copy them.

## Lockdown lids

L1 room min `(41, 0, 75)`, max `(91, 24, 125)`. L2 min `(147, 0, 70)`, max `(207, 30, 130)`. L3 is the fire ring plus `sb.lid` at y=16. Walls and lids are `forceField` boxes, solid the whole time, with door gaps. They should become solid only while the room is sealed, stay see-through, and stop movement, bullets and spells. Flyers clamp to the room. `forceField`, `candleUp` and `candleDown` are not in `LEVEL_COLOR`, so they draw as stone. The fire curtain is lava boxes, not a shrinking ring.

`fireRing` radii **27.8 → 26.8 → 25.5** at `(70, 60)`, drawn over the gaps after the floor breaks.

## Boss part script (E12)

Five parts on `SB-BOSS`. Adds use the spawn ids in each squad's `design` (`SB-N` `(70, 10, 36)`, `SB-S` `(70, 10, 84)`, `SB-LID` `(70, 14, 60)`, `SB-W` `(46, 0, 60)`, `SB-E` `(94, 0, 60)`, `SB-C` `(66, 0, 64)`).

| Part | Seconds | Starts | Ends |
|---|---|---|---|
| 1 Opening Bell | 30 | Both stand on the podium under a Price Shield, sphere r **5**, invulnerable. Obama throws stage-1 bolts at half rate. No powers | All 3 pylons destroyed |
| 2 Pump | 60 | Shield drops. Each fighter keeps his own bars and transforms on his own bar. Powers alternate with a shared **4 s** gap | Either fighter empties his stage-2 bar |
| 3 Flash Crash | 40 | Both return to the podium and raise the shield. They do not attack. Breakers rise on tiles (0,2) and (4,2) | Both breakers destroyed, then the held transform plays |
| 4 Dump | 75 | The leader is in stage 3. The other keeps his own bars. Ground fighters leash to the centre tile and the four diagonal tiles | Obama is out and the Midget is in stage 3 |
| 5 Short Squeeze | 45 | Midget hovers **1.7 m** over whatever is under him. Every **12 s** he flies the cycle Moon Pad (2,0) → (3,3) → (0,2) → (2,4) → (4,2) → (1,1) at **9 m/s** and stays within **8 m** of that tile | The Midget is knocked out |

**Held transform.** The first time either fighter empties his stage-2 bar, the transform waits and plays when part 3 ends.

**Last bar lock.** The Midget's stage-3 bar is always the last bar. If he reaches stage 3 while Obama still stands, he flies to the Moon Pad, hovers inside a Price Shield, and casts only Pig Rain until Obama is knocked out.

**Tile drop, part 3.** 12 tiles tagged `drop`: 1 s shake, then a one-shot mover down **40 m** at **10 m/s**, **0.15 s** apart, clockwise from tile (1,0). Tile (2,0) rises **6 m** and (2,4) rises **3 m** at **2 m/s** (`rise` on the box). Nine tiles stay, joined by the rivets. The two sliders then ferry the gaps at (2,1) and (2,3).

Heroic adds a third breaker on tile (2,4), moves the Midget every **9 s**, and puts Liquidation Pits on raised tiles. Easy removes the second part-2 drop and moves him every **16 s**.

Reward when the last fighter falls, on the podium `(70, 1, 60)`: spell **Pump It**, two Rare guns, one boss gun (Ray Gun or Big Bullets), ammo crate `crate-l3`.

## Other mechanisms the data already names

| Kind | What to implement |
|---|---|
| `shrine` `s3.shrine-use` | `manaShield` at `(22, 0.5, 50)`. Grants the spell, refills mana, saves. The spell id exists. Also save again when the player steps on `s3.chainA` |
| `manaBloom` | `s3.bloom-use` and `bloom-l1`: +50 mana, regrow **20 s** |
| `secret` `s5.battery` | +10 max mana **and +0.5 mana/s**. Today only `mana: 10` is applied |
| `secret` `s2.bonk` | Moon Boots, gravity ×0.6. This grant already runs |
| `cache` `s4.cache` | Duck Gun, always Legendary, at `(177, 30.6, 100)`, plus two rubber boxes beside it |
| `chest` `chest-l1` `chest-l2` | One gun, Uncommon or better, of a type not carried. `giveWorldGun` still forces Common and needs `gun` |
| Racks `mg-pit` `sn-mines` `bz-duo` | Uncommon, not Common. `quality: 'uncommon'` is on the rack and ignored |
| `ammoCrate` | 3 uses, refill to 50% of cap. `depotCrate` is unlimited (Depot A, Depot B, SB vestibule, SB centre tile) |
| `depot` | crate, health station, spell bench, ticket shop, checkpoint. No Weapon Box |
| `health` `s4.l2-health` | L2 reward, beside the crate |
| Audit files | `s1.file`, `s3.file`, `s4.file`: 5 tickets and the `story` line |
| `drops: 'voidSafe'` | A drop falls at **12 m/s** onto the first solid. If none, it flies to the nearest walkable surface within **8 m**. If none, it flies to the player at **14 m/s**. Inside a lockdown it ends on the room floor. Never into the well's kill sphere. The 30 s despawn starts when it rests |

The machine gun still has `infiniteReserve`. §12.5's bullet ratio assumes that is gone (PLAN §7.4). That change is not this level's, and it moves the campaign fingerprint.

## Rendering

No new art. Candles, islands, the exchange floor, the fire ring and the Duo's arena are primitives. `candleUp` / `candleDown` should be emissive green and red, not hazards. `forceField` should be see-through. The void stage already in `stages.js` is the sky; it has no price-chart line and its fog is not the document's **220 m**. Signs carry a `text` field the renderer does not draw.

## What a clear needs, in order

1. Retarget the canonical obama encounter to `SB` / `SB-BOSS` and allow the add squads, then re-pin `bfe99bf4` in the engine batch. Do not touch PvP `17d87c54` or golden `6545ca0a`.
2. Copy `voids` (and `navLinks`) onto the live section, with last-safe and fixed rescue.
3. Jetpack thrust the autopilot can be taught, or an air waypoint follower, across the hop gaps.
4. Spawn `flakPod` and mark `target` destruction.
5. Run the Duo part script inside v2, with the two rules and the tile drop.
6. Gate `time` triggers on `part`, count bitbug flocks as one unit per 6, and despawn leftover adds at the end of a part.
