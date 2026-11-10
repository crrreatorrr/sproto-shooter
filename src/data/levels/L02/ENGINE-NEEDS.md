# L02 engine needs that are not on main yet

The playable level in this folder clears on the E1–E7 director: 121 encounter enemies, three lockdown seals, and a Sahil fight the straight-line autopilot can finish. The rows below are the document's behaviour that the current director does not run. Each one names the data field L02 already stores.

## Blocker: verified Sahil run never rebinds the section

`buildIssuedState` in `src/server/runContract.js` calls `startCampaign` (which binds **S1** solids), then sets `state.level.section` to `S4` and moves the player to `[149.5, 0, 11]`. It does not call `noteV2Section`. The v2 director keeps ticking S1. Sahil's encounter is on S4, so he never spawns. The walker strides east on the wrong solids, falls, and `verifyRun` rejects the log as `teleport` (tick 2455 on seed 7). A v1 corridor did not fall because campaign movement clamps y to 0 when solids are off.

The fix is one rebind after the section jump:

```js
if (state.level.format === 'v2') noteV2Section(state, section, getLevelRuntime(boss.levelId));
```

Until that lands, `tests/run-validation.test.js` and `tests/goja-goldens.test.js` cannot match the Sahil rows. Do not edit those fixtures in the L02 PR. The campaign fingerprint is still `bfe99bf4` (boss section start and `sahil` × 1 are unchanged). Obama's golden is unaffected.

Hub ids stay `S4` / `S4-E4` because `tests/server-sim.test.js` and `CANONICAL_BOSSES` still require them. `designId` is `SB` on the showroom and `SB-BOSS` on the fight. Do not put the 40 adds on `S4-E4`'s `squads`: `sameParts` allows only `sahil` × 1. They live on `S4-ADDS`, and the real schedule lives on `script`.

## E4 — lockdown and triggers

| Need | Exact behaviour L02 uses | What main does |
|---|---|---|
| Wave timer | Wave n+1 starts on `onRemain(2)` **or 25 s** after that wave started, whichever is first. `lockdown.waveSec` is 25. | `onRemain` only. Live squads are ordered so the next wave waits until 2 are left. |
| Anti-stall | If the last 2 enemies of a wave live **12 s**, mark them and make them run at the player. `lockdown.stallSec` is 12. | Not implemented. |
| Door delay | Entry slab drops **1 s** after the threshold. It pushes a player standing in the slab inward. It never closes on them. | The slab becomes solid the same frame the player is in `threshold`. |
| Entry opened by a switch | `dyersGate` stays shut until conduit `C1` is zapped, then the threshold can drop it. `N6`. | Doors are not solid until the lockdown seals. `C1` is a proximity switch, not a zap target. |
| No exit door | `S4-E4` sets `lockdown.exit: null` and `noExit: true`. The level ends on Sahil's death, not a second slab. `N7`. | Seal ignores a missing exit id. There is still no fire-ring wall. |
| Death reset | Dying in a lockdown respawns at `cp2`, `cp4`, or `cp10` with wave 1 and the entry door open. | `v2Post` sets `level.lost` on death. No wave rewind. |
| `onAlert` | E1 squad `1a` is alerted by sight, or by entering z < 128. | No `onAlert`. The live squad uses `onEnter`. |
| Lid | `flyerVolume` is set on the three rooms (Dyers y 7, serai y 8, showroom y 14). Flyers, Magic Carpet, and Blink stay inside. | `flyerVolume` is stored. Campaign has no Magic Carpet or Blink. |

## E6 — quicksand, geysers, movers

| Need | Parameters |
|---|---|
| Quicksand `slow` | `Q1` x 60–90, z 86–116 and `Q2` x 108–122, z 86–112. Speed × **0.5**, no damage. Enemies path around (`navCost` × 4). Section field `hazards`. The live level does not emit these as `kind: 'hazard'` because the current hazard multiplies velocity every tick, which stops a body in a few frames. |
| Geyser | `G0` period 6 s, damage 0, lands on the arch. `G1`–`G4` period 5 s, offsets 0 / 1.5 / 3 / 0.5, damage 15, rumble 1.2 s. `G5` period 4 s, damage 0, `to: [201, 9, 98]`. Section field `geysers`. |
| Carpet mover | `carpetC1` 15.8 m at 3 m/s ping-pong, pause 2.5 s. `carpetC2` 17.7 m at 3.5 m/s. `carpetC3` 33.8 m at 5 m/s, one shot, returns after 4 s. Nothing paths onto them. Section field `carpets`. The live zipline only slides on x and drops y to 0, so `Z1`/`Z2` are data on `SM.links`, not mechanisms. |
| Targets | `rugLoom` 161 HP, spool × 2. While any linked loom lives, the shielded chest, crate, or gate takes no damage. `carpetPylon` 230 HP, cannot be hurt while it rises for 1.5 s. `loom-0` shields `chest-L2`. `loom-1` and `loom-2` gate `bazaarGate` with `E9.cleared`. |
| Void rescue | S3 kill plane y = −20, −25% max HP, back to the last safe ground. Enemies that fall die with no loot. Section field `voidRescue`. `state.level.voids` is never filled from the section, so S3 has a floor across the canyon. |
| Depot | `depot-1` and `depot-2`: unlimited crate, health station, spell loadout bench, ticket shop. No Weapon Box. `kind: 'depot'` is stored and does nothing. |

## E10 — Chain Zap, conduits, rewards

| Need | Parameters |
|---|---|
| Chain Zap shrine | `shrine-chainzap` grants `chainZap` (30 mana, 4 s, 25 m, 4 chains). That grant works today. |
| What a zap must do here | Stun every riot shield in the chain for **2 s**. Pop every Tax Shield bubble in the chain. Power conduits `C1` (opens `dyersGate`) and `C2` (runs lift `L1` for 20 s). Detonate pots along the chain. Gooed targets take +50% and the jump reaches 1.5×. |
| Mana Battery | `mana-battery` at design `(12, 5, 50)`: **+10 max mana and +0.5 mana/s**, kept. The secret sets `mana: 10` only. Regen is `manaRegen: 0.5` and is not applied. |
| Magic Carpet | Learned when Sahil dies (`rewardSpellLearned`). Not cast anywhere in L02. Lockdown lids block it on replay. |
| Spell slots | Four assignable slots at a depot or on pause. Not read. |

## E11 — pots

22 pots. Elements: fire (burn pool 4 s), shock (stun 1.5 s, and riot shields down 2 s), goo (slow puddle 5 s). Blast 4 m, 60 to enemies and 25 to the player, × tier 1.15 for enemies only. A live barrel still explodes for 60 / 25 and chains. It does not leave a pool or drop a shield.

## E12 — Sahil, five parts

`S4-E4.script` is the document. Parts 2, 4, and 5 are Duel stages. v2 never calls `tickDuelBoss`, so Sahil stands and can be shot immediately. He is not immune in parts 1 and 3. Looms and pylons do not exist as targets. The pit, quicksand pools, oasis, and sand vents do not spawn.

| Part | Time | HP | Ends when | Adds |
|---|---|---|---|---|
| 1 Showroom | 30 s | immune; looms 161 | both looms destroyed; Sahil stunned 3 s | 6 midget at t+2; 2 boom when the first loom dies |
| 2 Friendly Discount | 55 s | **1714** | bar empty | 4 midget at 65% bar; 2 boom at 30% |
| 3 Rug Pull | 45 s | immune; pylons 230 | three pylons destroyed; pit fills | 2 riot + 1 acolyte at t+0; 5 midget at t+10; 3 midget on the second pylon |
| 4 No Refunds | 60 s | **1909** | bar empty | 3 midget at 70%; 3 boom at 35% |
| 5 Full Rug Pull | 65 s | **1967** | bar empty | 1 elite riot (173 HP) + 3 midget at 75%; 3 midget + 2 boom at 40% |

`onBossHp` is a share of the **current** bar. The fire ring is r 27.8, then 26.8, then 25.5, and it burns on crossing. Part 3's pit is r 7 at `(40, 0, 70)`, speed × 0.5, 4 dps. The elite always drops one gun, one tier step up (65 / 30 / 5).

`S4-ADDS` spawns those 40 bodies on a short timer so the autopilot can finish inside the suite cap. It is not the part schedule.

## E13, E14, E17

| Need | L02 data |
|---|---|
| Checkpoint toast, boss bar with 5 pips, 2.6 s boss card | Intros are on S1, S2, and S4. No toast or pips. |
| Carry-over | Dev entry is `?mode=campaign&level=L02`. The level select stays locked until L01 is cleared. Expected guns are the machine gun and the L01 shotgun. |
| Pacing validator | Beats sum to **1293.9 s** (21:34), par 20:00. `L02.design.estimateSec` is 1294. |
| Bot route | `L02.design.botRoute` is the document's waypoint list. The suite bot walks straight at the nearest enemy. |
| Loot row | Common 65, uncommon 30, rare 5, epic 0, legendary 0. Racks are Common, gun level 2. |
| Guaranteed drops | `chest-L1`, `chest-L2`, Rare shotgun `cache-secret`, elite tier step, Sahil's two Uncommon guns plus Ray Gun or Big Bullets and Magic Carpet. Chests call `giveWorldGun` once. They do not roll the table. |
| Ammo | 36 boxes (`ab01`–`ab36`), 4 crates, 3 depot crates. Crates are a single bullets pickup. They are not 3-use or unlimited. |
| Smart drops and supply drone | Not level data. The machine gun still has `infiniteReserve` in `src/data/guns.js`, so the finite-ammo rule is not on yet. |
| Type unlock | Picking `rack-sn-tower` or `rack-bz-vault` should add Sniper or Bazooka to the drop pool. Not implemented. |
| Easy / Heroic | `L02.design.difficulty`. Not applied. |

## Walkable compromise

Section origins chain the exits so the autopilot changes section on foot. The showroom `start` is exactly `[149.5, 0, 11]`, which keeps `encounterFacts.sectionStart` and the campaign fingerprint. Floors are extended a few metres past each exit so the arrival square has ground. The 9 m Shelf and the canyon kill plane are not the walkable surface: the road slot and a canyon slab are y = 0. Design elevations stay on the geyser `to` points and on `voidRescue`.
