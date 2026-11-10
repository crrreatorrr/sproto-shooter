# L03 engine needs

Landed on main and wired in this level: the four bodies, Hex `arena: { x: 45, z: -80, radius: 34 }`,
`fleeAt: 0.5` on `S6-F2` with `S6-LG` `opens: 'S6-F2.fled'` and `S6-RISE` `starts: 'S6-F2.fled'`,
targets `S1-LB-hp` (bulletMul 0.2), `S6-HCB-hp`, and `TOT-N-hp` / `TOT-SE-hp` / `TOT-SW-hp`.

Still open, with the numbers the grove doc asks for. A guns-only god-mode bot can clear the level
without these. Do not change the census to paper over them.

Numbers are tier-1 unless noted. L03 tier is 3, so enemy HP and damage, and spell damage, scale by
1.32 (1.15²). Player hazard damage does not scale.

`S3-BARK`, `S4-BARK` and `S5-BARK` are temporary: `enemyDps: 0.01` and `stripsBark: true` over the
section, so bullets can kill a Bark Brute. Delete them when Goo or Yeet opens bark. The real pools
still do 12 dps to the player and 40 to enemies.

## E8 — still short of the doc

| Id | HP | Speed | Body | Damage taken | Attack |
|---|---|---|---|---|---|
| `hexWisp` | 45 | 5 m/s, fly 1.2–2.6 m | r 0.5, h 1 | bullets ×0.2, explosives ×0.5, spells ×2, reflected orbs ×2 | ghost (below). Orb every 3.2 s inside 16 m: 8 damage, 9 m/s, 4 s life. Touch inside 1.5 m after 0.6 s: 6 damage and 12 mana |
| `barkBrute` | 260 | 3.2 m/s, turn 90°/s | r 0.8, h 2.4 | bark states below. Back knot always takes bullets ×1 | Club reach 2.6, wind-up 0.8, 22 damage, knockback 8. Charge from 6–14 m, wind-up 0.7, 10 m/s for up to 10 m, 18 damage, knockback 10, stops on walls, every 6 s |
| `manaLeech` | 55 | 3.8 m/s, keeps 6–9 m | r 0.45, h 1.1 | normal, weak to shock | Latch inside 10 m with line of sight, 0.8 s wind-up, then 8 mana/s and heals 4 HP/s. At 0 mana the beam does 4 dps to shields. At most 2 latched. Inside 4 m it runs. Line of sight broken for 0.5 s drops the latch; 2 s before it can latch again |
| `gooGlob` | 90 / 40 / 15 | 3.0 / 4.2 / 6.0 | r 1.1 / 0.7 / 0.4 | core ×2.5. Always Conductive. Immune to goo slow and to toxic | Hop 6 m, 1 s shadow, 14 damage in r 2.5, puddle r 3 for 5 s at 40% slow. Medium: 9 damage, puddle r 2. Small: bite 5, no puddle. Splits 1 → 2 → 4. A Yeet off a ledge, or a blast of 150 or more, kills it with no split. Counts as **1** enemy |

`barkBrute` states: **Hard** bullets 0, explosives 0.25, spells 1. **Softened** (Goo, 4 s) bullets 1.
**Cracked** (Chain Zap, 6 s) bullets 1 and staggered 0.8 s. **Stripped** (Goo then Zap inside 4 s,
toxic runoff, or a seed pod) for good, bullets 1.25. Yeet moves it 5 m, or 8 m once the bark is open.
The F1 brute at `TOT-SW` is `elite: true`. The director keeps that flag.

`gooGlob` Chain Zap always jumps 9 m between Glob bodies and does +50%.

## E3 — ghost movement

A `hexWisp` passes through solids and stays inside its encounter bounds (the activate box, or the
lockdown room once sealed). It still needs line of sight to fire. Flyers in a lockdown stay under
the lid: Gazebo Court y ≤ 9, Hothouse y ≤ 8, Rootway arena y ≤ 12. `flyerVolume` is one box per
section, so a court lid cannot be the whole of S2. Per-encounter lids are the missing hook.
`S5-LID` is a disc (drawn, not a solid) of r 35 at y 12.

`navLinks` are copied onto the level. A lockdown room is the flyer lid. Passing through solids,
and a lid that is not the lockdown room, are still open.

## E7 / E8 — damage by source, bark, `onlyWhen`

| Source | Rule |
|---|---|
| Bullet on hard bark | 0, except the back knot ×1 |
| Explosive on hard bark | ×0.25 |
| Spell on bark | ×1, and it changes state as above |
| Bullet on a Hex Wisp | ×0.2 |
| Spell on a Hex Wisp | ×2 |
| Daycare shell | bullets ×0.5. Open core ×2.5 for 1.5 s at each spawn. Explosives ×1 |
| Goo on the core | jams the next spawn 4 s |
| Totem roots | bullets ×0.2 always. The post uses bark states |

`onlyWhen` hitboxes already exist for bosses. The brute's knot and the leech's mouth are the `weak`
zones and are always live. The daycare core is `weak` only while the core is open.

`floretSprout`, `sewerMidget` and `daycare` exist as re-skins. L03 still needs the doc's version:
Sprout lobs **3** florets (flight 1.2 s, warning r 1.6, 6 damage) every 5 s from 14–30 m, and a
Hotbox puff r 2 for 3 s at 3 dps on death. Yeet in the last 0.4 s of the flight returns all three
(30 each). Sewer Midgets come out of the mound nearest the player within 12 m (0.6 s dust), melee 9,
and burrow again after 4 s without a target. A goo puddle on a mound plugs it 4 s. A daycare does
not move, spawns 2 Midgets every 6 s, at most 8 alive, and stops at `spawnBudget` (5 on both nests).
v2 never runs the old nest ticker, so the 10 nest Midgets are explicit `summon` squads. When the
budgeted ticker exists, those squads should be produced by the nest, not doubled.

## E6 — mechanisms this level adds

The director already runs `door`, `jumpPad`, `hazard` (player `dps` only), `shrine` for a spell id
it knows, `ammo`, `chest`, `secret` (including `mana`), `depot` as a pickup point, and `power` for
`turbo`. These do nothing yet:

| Kind | Ids | Behaviour |
|---|---|---|
| `seedPod` | S1 ×3, S4 ×2, S5 ×6, S6 ×2 | Yeet launches at 22 m/s along aim. Impact 150 in r 4, 25 to the player, strips bark. Regrow 12 s |
| `manaBloom` | MB1–MB20 including MB6b (21) | 50 mana, regrow 20 s. Easy 12 s, Heroic 30 s |
| `gooGear` | `S2-GG1` | Goo holds the trimmer open 4 s. Blades `S2-TG-N` and `S2-TG-S`, crush 40, knockback 8, closed 0.8 s, open 0.4 s |
| `conduit` | `S2-CD1` | Chain Zap: stun every enemy within 8 m for 2 s, recharge 20 s |
| `conduit` `barkCap` | `S2-CD2` | Goo softens 4 s, then Chain Zap opens `S2-XD`. The door's `opens` is `S2-CD2`. The conduit does not set `opens` itself: a conduit `opens` holds that door solid, and nothing fires a conduit yet, so the exit would stay shut |
| `pressurePlate` | `S3-PP0` r 1.2 | Player or a parked Swarm buddy. Holds `S3-BG`. Shuts 0.3 s after it empties. A buddy on a plate does not age (max 30 s) |
| `pressurePlate` | `S3-PP1`, `S3-PP2`, 55 m apart | Both held 1 s grows `S3-BR3` for good |
| `ropeBridge` | `S3-BR2-mech` | `collapseOn: 'x>114'`. 1 s shake, planks drop from the west every 0.15 s. Resets 4 s after a void rescue. The slab `S3-BR2` is the deck until that exists |
| `energyBridge` | `S3-BR3-mech` | Absent until the plates latch, then a vine grows in 1 s. The slab `S3-BR3` is present so the section is not a hole; hide it until the latch |
| `hazard` bark from Goo | the same pools | `enemyDps` and `stripsBark` already run while the player is in the box, and Goo is immune. A Goo puddle is still what should soften bark without a player standing in the pool |
| `hazardSet` | `S5-FLD00`–`S5-FLD15` | 16 zones, r 31, size 13 × 1 × 6, `enabled: false`. At Hex HP ≤ 25% turn them on (outer ring r 28–34). Boss stays inside r 24. Blooms at r 24 stay dry |
| `risingHazard` difficulty | `S6-RISE` | The rise is wired (`starts: 'S6-F2.fled'`, 0.18 m/s). Easy 0.14 and Heroic 0.22 are not read |
| `killZone` / voids | `S3` `voids` | Creek below y -6.5: rescue the player to `(20, 0, -60)` at 15% max HP, kill enemies. `state.level.voids` is never copied off the section |
| `shrine` | `SH-YEET-use` spell `yeet` | Grants Yeet, refills mana, saves. `yeet` is not in `SPELL_IDS`, so `syncSpellbook` cannot turn it on. `SH-SWARM-use` is `swarm`, which exists |
| `power` | `PU2`, `PU3` modifier `manaSurge` | 20 s of 4× mana regen, and it breaks every Leech latch. `PU3` appears on the heap when Part 2 starts |
| `ammoCrate` | `RC1` `RC2` `RC3` | 3 uses, each refill to 50% of cap. `depot` crates at `DP1` and `DP2` are unlimited |
| `chest` | `L1-CHEST`, `L2-CHEST` | One gun, Uncommon or better, of a type not carried if possible |
| `chest` | `L3-CHEST` | Two guns, one of them Rare. The elite brute drops one gun a tier step up. `SC1` is one Epic gun |

Lockdown doors (`LD1-IN`, `LD1-OUT`, `LD2-IN`, `LD2-OUT`, `LD3-IN`, `LD3-OUT`) use the v2 seal.
The 25 s wave fallback is **not** in the director (`fallbackSec: 25` on L1 and L2). Waves are
ordered `onRemain` n = 2, which is the doc's primary trigger. L3 adds follow `onBossHp` percent
(85, 70, 60, 45, 25, 12), not the timer.

`onEnter` in the director means "the encounter has started", not "the player entered this corridor".
Squads whose doc trigger is a sub-volume, `onAlert`, or `onSwitch` use `time`, `onKills`, `onRemain`
or `with`, and the doc text is the squad's `design` string. Volume triggers still need to land for
E3's corridor B/C and E6's plates.

## E10 — magic

Held on arrival, for a profile that cleared L01 and L02: Goo Bolt, Chain Zap, Magic Carpet.
A fresh L03 boot has none of them. Dev entry is the level id `L03` (already registered). There is
no separate debug spell grant.

Yeet (shrine `SH-YEET` at `(34, 0, -80)`): mana 20, cooldown 3 s, cone 7 m long and 60° wide.
Light enemies fly 8 m. Bark Brute 5 m (8 m with open bark), Riot Midget 5 m, Big Obama 2 m, bosses 0.
Hitting a wall deals 20. Off a ledge into a kill zone: dead. "Slow" projectiles are 14 m/s or less.
A returned projectile is the player's, counts as a spell, does 5× damage (at least 30) and homes
if it homed before. Orbs returned at the Hex do 40, tax bolts 60.

Goo Bolt: puddle r 3 for 4 s, Conductive (Chain Zap jumps 1.5× and +50%), jams a `gooGear` 4 s,
softens bark 4 s, plugs a burrow mound 4 s. A gooed Hex orbits its weak spot at 1/4 speed. This
last one is campaign-only and must not change Wave Mode.

Chain Zap: a zap that lands in a goo puddle hits everything standing in it. Bark-capped conduits
need Goo first.

Sproto Swarm: buddies live 12 s (not 8). Cast again while they live is free (0 mana, 0.5 s):
looking at a plate sends the 2 nearest, looking at an enemy or a totem sends every free buddy.
Buddy rockets count as spells.

Magic Carpet follows the ground and drops into a gap deeper than 2 m. It may cross the canal and
the pools. It must not cross Bridge 2 or Bridge 3 while those decks are gone.

Mana Surge: 20 s, regen ×4, breaks every latch.

## E12 — Compost Hex parts

The Hex now spawns in the grove arena and is not pulled to the origin. Wave Mode data stays:
3,000 HP, r 0.7, hover 1.6, orb 8, tax bolt 12, aura 9 m (13 m in the last phase) at 15 mana/s,
weak spot orbit 1.9 m at 120°/s (200°/s in the last phase), 2 mana orbs of 25 per 10% HP lost.
There is still no part script. `F1-p2d` uses `onBossHp` 60 so a fast kill cannot skip the squad;
the design trigger remains "the first totem dies" (`TOT-N`). It must not change the wave boss.

| Part | HP | What the script adds | Ends |
|---|---|---|---|
| 1 The Audit | 3,000 → 1,800 | Pattern drift 2.5 s, ring (16 orbs, 8 m/s), fan (5 orbs, 10 m/s), spiral (3 arms, 3 s, 7 m/s), teleport (0.6 s out invulnerable, 0.4 s in, 10–26 m from C and ≥ 8 m from the player). Aura 9 m. Adds at 85% and 70% | 60% HP |
| 2 Rooted | invulnerable | Hex moves to the heap and tethers to `TOT-N`, `TOT-SE`, `TOT-SW`. Aura 4 m. One slow ring from the heap every 12 s. `PU3` appears. A totem's guards die with it. Adds at the start, and 3 Midgets when the first totem dies | third totem. Hex then drops for 5 s with the weak spot still live |
| 3 Liquidation | 1,800 → 0 | 60–25%: ring, tax bolts (3 homing, 6 m/s, 12 damage, 6 s), spiral, fan, teleport. Below 25%, 2 s invulnerable, then spiral-with-ring, tax bolts, fan, teleport. Aura 13 m, weak spot 200°/s. Flood the outer ring. Adds at 45%, 25%, 12% | 0 HP |

Adds are 26 and are already squads. Peak alive with the boss is 9. Dying in the arena restarts at
Part 1 from CP9. CP10 saves when the Hex dies, at local `(45, -116)`.

## E15 — flee id

`docs/shooter-server-contract.md` still says the L03 flee is `S4-E4` and is not issuable. The flee
is encounter **`S6-F2`** in section `S6`. It is still not a payable kill. `tests/server-sim.test.js`
accepts either id. L03 has no canonical boss, so the contract text does not move the campaign
fingerprint by itself. This folder does not edit the contract.

## E14 — pacing and the bot

The beat table sums to **1,287 s** (21:27), inside 18:00–22:00. `L03.estimateSeconds` is that sum.
The validator does not estimate pacing, check reachability, or run a nav bot. `L03.botRoute` is the
route in §15. The shared god-mode autopilot clears the level. It walks a straight lane, so west
hedge rings have an extra gap at z = -60, spawns sit on that lane, and the design positions stay
in each squad's `design` string.

## E17 — loot already described, not rolled

Enemy-drop odds for L03: Common 45, Uncommon 40, Rare 14, Epic 1, Legendary 0. Racks are Uncommon.
`startAmmo` is the solo-debug pouch (240 / 24 / 12 / 4). Placed ammo is 22 boxes: 8 bullets, 9
shells, 3 sniper, 2 rockets. The Machine Gun budget in the doc is 1,230 bullets asked and 1,845
placed-plus-expected (1.50×). Smart drops, crate uses, the supply drone and chest tier rolls are
not in the director. Ammo boxes of kind `ammo` do spawn a pickup.

## Easy and Heroic

On `L03.difficulty`. Easy: `maxAlive` 8, fodder −25% (at least 1), Leech 5/s, aura 10/s, blooms
regrow in 12 s, boxes +50%, softened bark 6 s, totems 180 HP, runoff 0.14 m/s, wave fallback 35 s.
Heroic: queued spawns 30% sooner, fodder +25%, Leech 12/s, aura 15/s at 11 m, blooms 30 s, hard
bark also ignores the back knot until a spell opens it, E5-c adds `bigObama` ×1, E7 wave 4 adds
`robotShooter` ×1 on the catwalk, E2 adds an elite `hexWisp`, totems 300 HP, Hex ring every 8 s,
runoff 0.22 m/s, wave fallback 20 s.

## What this folder already uses from main

Format v2, solids, doors that seal a lockdown, squads, `onEnter` / `time` / `onKills` / `onRemain` /
`onBossHp` / `onPartDestroyed` / `with`, objectives `clearAll`, `boss` and `escape`, shrines for a
known spell, ammo pickups, secrets, jump pads, player and enemy hazard damage, `risingHazard`,
destructible targets, a boss `arena`, `fleeAt`, copied `navLinks`, a lockdown flyer lid, and the
re-skins `floretSprout`, `sewerMidget`, `daycare`, `boomMidget`, `riotMidget`, `hexAcolyte`,
`hexWisp`, `barkBrute`, `manaLeech`, `gooGlob`.
