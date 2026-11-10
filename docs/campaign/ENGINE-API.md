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

## What L02 and L03 can use today

Collision (`useSolids`), line of sight (`hasLOS`, `coverNear`), alert (`ai.alert = 'unaware'`), the nav grid (`useNav`, `navBounds`, `navLinks`), flyer lids (`flyerVolume`), and this v2 director.

They should not edit `src/sim`, `src/server`, `src/net`, or `src/data/levels/campaign.js`.
