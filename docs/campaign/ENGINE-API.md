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
| `time` | `t` seconds after the encounter started. |
| `onKills` | `n` enemies from this encounter are dead. |
| `onRemain` | That many or fewer are still alive, and a squad has already spawned. |
| `onHold` | Hold time is at least `p` seconds. |
| `onBossHp` | The encounter's boss is at or below `p` percent health. |
| `onPartDestroyed` | `id` was marked destroyed. |
| `with` | Squad `after` has spawned and `delay` seconds have passed. |

Extra enemies wait while the encounter is at `maxAlive`.

## Lockdown

```js
lockdown: {
  entry: 'door-in',
  exit: 'door-out',
  threshold: { min: [x, y, z], max: [x, y, z] },
}
```

The two ids are `door` mechanisms with `at` and `size`. Crossing `threshold` adds those doors to the solid list (`lockdown` event, `sealed: true`). Clearing the encounter removes them (`sealed: false`).

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
| `auditSniper` | Sidesteps on a timer. |
| `miningRig` | Stays planted. |
| `daycare` | The nest spawn that was already there. |
| `bitbug` | Drifts toward other bitbugs. |
| `jetObama` | A weak spot that takes 2.5×. |
| `miniTinubu` | Charges. |

`midget`, `flyingMidget`, `obama`, `bigObama`, `robotLaser` and `robotShooter` are unchanged.

## Mechanisms

A barrel blast damages enemies, hurts the player, and chains. A switch with `needsHold` waits for interact held for `holdTime`. A mover with `carry` rides the player from `from` to `to`. A hazard with `affectsEnemies` slows enemies in its box. Corridor switches stay proximity triggers.

## Hazard zones and geysers

`kind: 'hazardZone'` (or `'slow'`) with `min`/`max` or `at` plus `r`. `slow` is a sustained speed multiplier (0.5 means half speed). `dps` hurts the player. `affectsEnemies` does both to enemies. `navCost` above 1 makes the nav grid treat those cells as expensive, so enemies walk around a pool when a way around exists. `set` stays off until `setHazardSet(state, id, true)`. `when` uses the same flags as a door (`switch:id`, `id.cleared`).

`kind: 'geyser'` at `at`, with `period`, `offset`, `rumble`, `damage` and optional `to`. Damage 0 is a launcher. Standing on it during the erupt moves the player to `to`.

The old `kind: 'hazard'` brake is unchanged.

## What L02 and L03 can use today

Collision (`useSolids`), line of sight (`hasLOS`, `coverNear`), alert (`ai.alert = 'unaware'`), the nav grid (`useNav`, `navBounds`, `navLinks`), flyer lids (`flyerVolume`), this v2 director, the mechanisms above, and the re-skins in the table.

They should not edit `src/sim`, `src/server`, `src/net`, or `src/data/levels/campaign.js`.
