# Campaign engine API

Status: the contract for level folders. L01, L02 and L03 each register from
`src/data/levels/LNN/index.js`. A level file exports `const LNN` and calls
`registerLevel`. It does not edit `src/data/levels/campaign.js`.

The corridor levels still in `campaign.js` are format v1. New sections use
format v2. `makeV2Level` in `src/data/levels/v2.js` offsets each section by
`origin` and the v2 director in `src/sim/campaign/v2.js` runs only when
`level.format === 'v2'`.

Set `useSolids` for E1 collision, `useNav` plus `navBounds` for E3, and
`flyerVolume` for a lid. A v2 level turns solids on by itself.

## Registration

```js
import { registerLevel } from '../register.js';
import { makeV2Level } from '../v2.js';

export const L02 = makeV2Level({ id: 'L02', name: 'The Grand Bazaar', /* ... */ });
registerLevel(L02);
```

`src/data/levels/campaign.js` has one import line each for L01, L02 and L03.
Those lines stay. Replace the folder, not the import.

## Level

| Field | Meaning |
|---|---|
| `id`, `name`, `stage`, `tier`, `parTime` | Identity. `tier` scales enemy HP. |
| `maxAlive` | Cap on living enemies in one encounter. Default 8. |
| `sections` | Ordered. Only the current section is simulated. |
| `jetpack` | `true` starts with fuel. |

Holding jump in the air spends fuel at 10 per second and holds altitude. C drops. Fuel regens at 25 per second on the ground, and a `fuelPad` refills at 40 per second (`safe: true` records a void-rescue point). A second `jetpack` with `skipIfOwned` does nothing if the player already has one. A `power` modifier `fuel` is infinite fuel for 20 seconds. The jetpack cannot climb within 2 m of a flyer lid. A door with `opens: 'p.jet.has'` is solid until the player has a jetpack.

## Section

Local coordinates. `origin: [x, y, z]` is the section's north-west corner in the world. `+x` east, `+z` south, `y` up. Yaw degrees about Y, 0 faces `+z`.

| Field | Meaning |
|---|---|
| `id`, `name` | `S1` … or `SB` for a boss section. |
| `start` | `[x, y, z]` where the player appears. Local. |
| `geometry` | Primitives. `box`, `ramp`, `cylinder` collide. `sphere`, `cone`, `disc` are drawn and do not block. |
| `encounters` | Squads, objective, optional lockdown. |
| `mechanisms` | Doors, switches, barrels, hazards. `at` is local. |
| `weapons` | `{ id, gun, why, at }`. `why` is required. |
| `checkpoints` | `{ id, at, when }`. |
| `exit` | `{ min, max }` in local metres. Entering it loads the next section after every encounter in this section is clear. |
| `intro` | `{ title, lines }` card. |

`box({ id, at, size, yaw, mat })` — `at` is the centre, `size` is x × y × z.
`ramp` uses the same shape; the walkable top rises toward yaw.
`cylinder({ id, at, r, h })` — `at` is the base centre.

## Encounter

```js
{
  id: 'S1-E1',
  maxAlive: 8,
  activate: { min: [x, y, z], max: [x, y, z] },
  objective: { kind: 'clearAll' },
  squads: [/* ... */],
}
```

`objective.kind` is one of `clearAll`, `reach`, `hold`, `destroy`, `boss`, `survive`, `switch`, `capture`, `escort`, `escape`.

| Kind | Done when |
|---|---|
| `clearAll`, `boss` | Every squad has spawned and nobody from the encounter is alive. |
| `reach`, `escape`, `switch` | The player is inside `zone`. |
| `hold`, `survive`, `capture`, `escort` | The player has been inside `hold` for `objective.seconds`. |
| `destroy` | `markPartDestroyed(state, id)` has run for every id in `objective.ids`. |

## Squad

```js
{
  id: 'A',
  trigger: { type: 'onEnter' },
  method: 'placed',
  at: [[x, y, z]],
  units: [{ type: 'midget', count: 2 }],
  delay: 0.5,
}
```

`method` is `placed`, `door`, `drop`, `air`, `hidden`, `burrow`, `portal`, `summon`, or `vehicle`. The director records it on the enemy. The spawn point is `at`.

`trigger.type`:

| Type | Fires when |
|---|---|
| `onEnter` | The player has entered `activate`. |
| `time` | `t` seconds after the encounter started. With `part`, `t` is seconds into that boss-script part (part 1 is the first part) and does not use the encounter clock. |
| `onKills` | `n` enemies from this encounter are dead. |
| `onRemain` | That many or fewer are still alive, and a squad has already spawned. |
| `onHold` | Hold time is at least `p` seconds. |
| `onBossHp` | The encounter's boss is at or below `p` percent health. |
| `onPartDestroyed` | `id` was marked destroyed. |
| `with` | Squad `after` has spawned and `delay` seconds have passed. |
| `onAlarm` | `ringAlarm(state, alarm)` has been called and `delay` seconds (on the squad) have passed. A runner (`role: 'runner'`, `alarm`) stands at the alarm box for `runner` seconds (default 1.5) to ring it. Shooting the box (`hp`, default 40) or the cable (`cableHp`, default 20) cuts it, and the runner then waits `wonder` seconds (default 3) without ringing. A searchlight holds the player in its beam for `hold` seconds (default 2) and rings `alarm`. Its lamp (`lamp` HP, default 30) can be shot out. A spotter whose squad sets `ringsAlarm` rings that alarm after 1.5 s of line of sight inside 35 m. |

`clearAll` and `boss` ignore a squad marked `optional: true` until it spawns. A quiet run does not wait on an alarm pack that never rings. Once it spawns, it still has to die. An objective may also set `also: { kind: 'hold', seconds }`. The exit waits for the waves and for that many seconds inside `hold`. The clock runs only while the player or an ally stands in `hold`. Enemies in the ring do not pause it. After the waves are dead it runs at three times speed. `strikes: [8, 22, ...]` and `strikeEvery` launch a drone strike on that clock: it tracks for 1.8 s, locks for 0.75 s, then deals 30 to the player and 120 to enemies inside 2.6 m. Extra enemies wait while the encounter is at `maxAlive`. `flockUnit: 6` counts six living bitbugs as one of those units. When a script part ends, a `part` squad that never spawned is skipped, and anyone it already spawned leaves with no drop and no kill credit.

## Lockdown

```js
lockdown: {
  entry: 'door-in',
  exit: 'door-out',
  threshold: { min: [x, y, z], max: [x, y, z] },
}
```

The two ids are `door` mechanisms with `at` and `size`. Crossing `threshold` adds those doors to the solid list (`lockdown` event, `sealed: true`). Clearing the encounter removes them (`sealed: false`).

`waveSec` starts the next squad when that many seconds have passed since the previous squad spawned, or on `onRemain`, whichever is first. `fallbackSec` on the lockdown, or on the squad, is the same timer when `waveSec` is absent. A squad's own `fallbackSec` wins. `null` leaves the timer off. A lockdown with `waveSec` waits `delaySec` seconds (default 1) before the slabs drop, pushes a player standing in the entry slab into the room, and does not seal while they are still inside it. `delaySec: 0` seals on the same frame, which is the default when `waveSec` is absent. `stallSec` marks the last `stallN` (default 2) enemies and makes them run at the player. `noExit` skips the exit slab. A switch or conduit with `opens` set to a door id keeps that door solid until the switch fires. Dying while a lockdown is sealed restores the last checkpoint (`lockdownReset`) instead of losing the level. `onAlert` spawns a squad when the player crosses `zBelow` or `zAbove`, enters `box`, or an enemy of the encounter is already alerted.

## Enemy re-skins

These ids have an `archetype` and run it on top of the enemy they are dressed as. Wave Mode never spawns them.

| Id | Extra behaviour |
|---|---|
| `boomMidget`, `balloonMidget` | Explode when they die. |
| `riotMidget` | Front shots deal 30% damage. |
| `sewerMidget` | Burrows for 0.6 s and ignores hits. |
| `floretSprout` | Lobs a mortar. |
| `hexAcolyte` | Puts a bubble on the nearest ally. Bubble hits deal half damage. |
| `glowieAgent` | Slows the player for one step when close. It does not take the controls. |
| `auditSniper` | Sees 140 m inside a 30° cone that sweeps 60° over 6 s, and 60 m outside it. A whiteout (`level.whiteout`) caps that at 40 m. |
| `miningRig` | Stays planted. |
| `daycare` | The nest spawn that was already there. |
| `bitbug` | Drifts toward other bitbugs. |
| `jetObama` | A weak spot that takes 2.5×. |
| `spotterDrone` | Flies the midget orbit at 8–9 m, radius 7–14 m. Tier-1 HP 45 (79 at tier 5). The lamp is the weak spot. |
| `frostHound` | Scents 45 m through walls, and a whiteout does not shorten that. Trots at 5 m/s and runs at 9.5. Inside 9 m it crouches for 0.5 s, then dashes at 20 m/s for 0.2 s (16 damage, 28 at tier 5, knockback 6) and leaves a 2.5 m ice patch for 6 s. It is not slowed by its own ice or by a zone tagged `slick`. Tier-1 HP 55 (96 at tier 5). The head is the weak spot. |
| `miniTinubu` | Charges. |

`midget`, `flyingMidget`, `obama`, `bigObama`, `robotLaser` and `robotShooter` are unchanged.

An unaware enemy sees 30 m inside a 120° cone and hears a shot inside 16 m. `asleep: true` on a squad removes that sight and hears a shot inside `hearing` (default 12). A mining rig sees 90 m all round, except a player within 15 m who is tucked under the wall it stands on.

A campaign `monster` (the Auditor) wears three plates. The brow has 250 HP and covers the head, so a head shot does not reach the body until it breaks. The chest and the back have 400 HP each and cover the front and rear 180°. A body shot on a live plate deals 10% to the body and the rest to that plate. All three scale with the tier multiplier (437 and 700 at tier 5). Wave Mode's monster has no plates.

A `kind: 'weather'` mechanism times a whiteout from when the section is entered. `windows` are `[start, end]` pairs. The same gap then repeats: `period` seconds (default 90) after each start, for `whiteout` seconds (default 20). `warning` seconds before a window sets `level.whiteoutWarn`. While it is on, `level.whiteout` is set, sight other than a hound's is capped at `sightCap` (default 40), and the fog pulls in to `viewCap` (default 40).

## Mechanisms

A barrel blast damages enemies, hurts the player, and chains. A switch with `needsHold` waits for interact held for `holdTime`. A mover with `carry` rides the player from `from` to `to`. A hazard with `affectsEnemies` slows enemies in its box. Corridor switches stay proximity triggers.

## Bosses, flees and breakable solids

A squad whose type is in `BOSSES` spawns with `createBoss`, including the Hex. In a campaign the Hex is not pulled back to the wave arena. Set `encounter.arena` to `{ x, z, radius }` to keep it inside that circle. `unit.elite: true` is kept.

`fleeAt` on a v2 encounter marks the boss `fled`, emits `bossEscape`, and does not add a boss kill. `lv.fled[encounterId]` is set, so a door with `opens: 'S6-F2.fled'` opens. A `risingHazard` with `starts: 'S6-F2.fled'` then lifts its surface at `rate` metres per second.

`enc.script.parts` is an optional boss script. It does not add squads, so a `sameParts` encounter can stay `sahil` × 1. An `immune` part with `targets` takes no boss damage until those targets die. A target `{ id, hp, at, shields, rise }` is a stationary body. `rise` (1.5 s when the id starts with `pylon`) blocks damage while it counts down. A living target whose `shields` lists a solid id blocks damage to that solid. A phase part refills `hp` when the bar would hit zero, until the last part. `adds` spawn on `t` seconds, `on` (`firstLoom`, `secondPylon`), or `onBossHp` (percent of the current bar). `pit`, `pools` and `vents` are `{ at, r, slow, dps, period, offset }` in section-local coordinates. `ring` burns 12 once when the player crosses it. `attacks: { bolts: 'half' }` doubles the attack gap. `attacks` as a list replaces the boss attack list (`carpetSweep` is the low sweep). `kind: 'entry'` stuns the boss for 3 s when the part ends. `duelStage` selects the portrait phase. Target `at`, pit, pool and vent positions are shifted by the section origin.

An encounter `parts` list with `obamaDuo` and `midgetDuo` runs the Duo clock. Part 1 (`kind: 'entry'`) holds both under a Price Shield until `sb.py1`, `sb.py2` and `sb.py3` are destroyed. Part 2 ends when either fighter empties his second bar. Part 3 (`intermission`) raises the shield again until `sb.cb1` and `sb.cb2` are destroyed. Part 4 ends when Obama is down and the Midget is on his third bar. Part 5 ends when the Midget is down. Bars are Obama 578 / 669 / 760 and the Midget 684 / 783 / 852. The Midget's last bar stays shielded, and he only casts Pig Rain, while Obama is still up. These bars are not the hashed duel HP, so the corridor fight stays on 760 and 520.

A `target` with id `TOT-N-hp` tracks HP for the solid `TOT-N`. A bullet that hits that solid spends the HP (`bulletMul` scales gun damage). At 0 the solid is removed and both ids are marked destroyed.

`noteV2Section` copies `navLinks` and `voids` as stored (the level shifts them). A player who enters a void is sent to the last grounded point, or to `to` when `mode` is `fixed`. `penalty` is a fraction of max HP. `invuln` is seconds of invulnerability after the hit. Candle materials `candleUp` and `candleDown` are emissive green and red. `forceField` is see-through.

A `hazard` with `enemyDps` hurts enemies in the box. Goo globs ignore it. `stripsBark` sets bark to stripped.

## Placeholder enemies

`hexWisp` flies and ignores solids (`ghost`), and stays inside `navBounds`. Bullets deal 20%, explosives 50%, spells 200%. `barkBrute` starts in bark state `hard` (bullets deal nothing, the back knot still takes them). Goo softens it. `manaLeech` drains 8 mana per second inside 10 m. `gooGlob` splits into two smaller globs, then those split into two small ones. `e.ai.exposed` shows a hitbox whose `onlyWhen` matches it.

## Hazard zones and geysers

`kind: 'hazardZone'` (or `'slow'`) with `min`/`max` or `at` plus `r`. `slow` is a sustained speed multiplier (0.5 means half speed). `dps` hurts the player. `affectsEnemies` does both to enemies. `navCost` above 1 makes the nav grid treat those cells as expensive, so enemies walk around a pool when a way around exists. `set` stays off until `setHazardSet(state, id, true)`. `when` uses the same flags as a door (`switch:id`, `id.cleared`).

`kind: 'geyser'` at `at`, with `period`, `offset`, `rumble`, `damage` and optional `to`. Damage 0 is a launcher. Standing on it during the erupt moves the player to `to`.

The same behaviour runs from section fields, shifted by the section origin. `hazards` entries with `kind: 'slow'` and `speed` are zones (`navCost` included). `geysers` use `damage` and `to`. `carpets` ping-pong from `from` to `to` (`pause` at each end; `mode: 'onTrigger'` waits for the player, then returns after `returnAfter` seconds, default 4). A `links` entry with `kind: 'zipline'` carries the player from `from` to `to`. `voidRescue` with `y` and `penalty` puts the player back on the last safe ground and kills a fallen enemy with no drop. A `depot` mechanism refills health, the magazine, and reserve ammo while the player stands on it.

The old `kind: 'hazard'` brake is unchanged.

## Movement

Campaign, Wave Mode and Sandbox share this. PvP does not.

Sprint lasts `staminaSprint` seconds (4.5). The bar then regens after `staminaRegenDelay` (0.55 s) and fills in `staminaRegen` seconds (1.7). Sprint stays off until the bar reaches `staminaRefill` (0.28). Slide spends `slideStamina` (0.14). Grapple spends none.

Slide is C, or Ctrl held while sprinting. It boosts to at least `slideBoost` (16 m/s), eases toward `slideCruise` (8), and gains speed when the ground ahead is lower (`slideSlope`). The capsule and the camera drop (`slideEye` 0.72). Jumping out of a slide keeps the speed times `slideHopBoost` and sets `slideHopCd` (0.85 s) so the hop cannot be chained. A slide that just ends uses the shorter `slideCd` (0.22 s).

Grapple is B, or a mouse back button. It is not a gun slot. The hook is a hit-scan up to `grappleRange` (30 m) on solids and the ground, never on enemies or bosses. While it is held, `grapplePull` accelerates the player toward the anchor and ground friction stays off. Releasing, or arriving at the anchor, keeps that full velocity. Gravity and air steering apply after that, so a hook aimed up and let go throws the player over a wall or a gap. The recharge is `grappleCd` (6 s), including a miss. A sealed lockdown room rejects a hook outside that room, and the player is held inside it. Solids block the line.

`noGrapple` is a list of `{ min, max }` boxes. A hook point inside one is a miss. `grappleAnchors` is a list of `{ id, at, r }`. A ray that passes within `r` of an anchor snaps to it, which is how a level marks a grapple point. `makeV2Level` shifts both by the section origin. Ramps and slopes are already slide-friendly: the slide samples the ground ahead and speeds up when it drops.

## What L02 and L03 can use today

Collision (`useSolids`), line of sight (`hasLOS`, `coverNear`), alert (`ai.alert = 'unaware'`), the nav grid (`useNav`, `navBounds`, `navLinks`), flyer lids (`flyerVolume`), this v2 director, the mechanisms above, and the re-skins in the table.

They should not edit `src/sim`, `src/server`, `src/net`, or `src/data/levels/campaign.js`.
