# L02 engine needs still open after main

`#59` and `#60` are on main. Issued Sahil runs rebind S4, and `tickDuelBoss` runs during the campaign script. Grapple anchors, slide ramps, and sprint stamina are in the sim. This file is only what L02 still cannot turn on.

The campaign fingerprint stays `9ec1c6ea`. Section S4 still starts at `[149.5, 0, 11]`, and `S4-E4` is still `sahil` × 1.

## Verified Sahil cannot play the five bars

`S4.bossScript` is the full five-part fight (design HP 1714 / 1909 / 1967, looms, pylons, pit, rings, 40 adds). The live `S4-E4.script` is part 1 only: the entry bar plus the six midgets at t+2. Part 1 uses a single attack name, `bolt`.

Two engine limits force that:

1. The golden autopilot only aims at the boss. Immune looms and pylons never die, so a part that waits on them never ends. Those bodies are `designTargets` on the script, not spawned targets. A verified bot that can shoot script targets would let the looms and pylons be live.
2. A live five-bar kite runs thousands of frames. Node and the bundled verifier agree. Goja does not. Past roughly tick 2400, `Math.floor(float(rng) * attacks.length)` in `tickDuelBoss` picks a different attack, then hit tests diverge, and the same log is `boss_clear` in node and `player_down` in goja. One attack name does not save a long kite: the 1 ulp position drift still flips a hit. The entry bar ends near tick 1456 and replays the same receipt in node, goja, and the assisted clear. Extra bars also make the assisted recorder die (`player_down`) instead of `assisted`, because it stops shooting once the bar is under 80 HP.

Attach `bossScript` as `encounter.script` only after goja matches node for a multi-bar Sahil kite and the assisted recorder can finish every bar.

## Still data-only

| Need | What L02 stores | What the sim does |
|---|---|---|
| Chain Zap | `shrine-chainzap` grants `chainZap`. | The grant works. A zap does not stun riot shields for 2 s, pop bubbles, power `C1` / `C2`, or detonate pots. |
| Mana Battery | `mana: 10` and `manaRegen: 0.5` on the secret. | The +10 max is the secret. +0.5 mana/s is not applied. |
| Magic Carpet | Sahil's reward spell. | Not granted on the kill. |
| Pots | 22 barrels with fire, shock, or goo. | They explode for 60 / 25 and chain. They do not leave a pool or drop a shield. |
| Crates | 4 ammo crates and 3 depot crates. | A crate is one bullets pickup. A `depot` refills while you stand on it. |
| Drop pool | `rack-sn-tower`, `rack-bz-vault`. | Picking the rack does not add sniper or bazooka to the drop pool. |
| Easy / Heroic | `L02.design.difficulty`. | Not applied. |
| Shelf and canyon | Geyser `to` and `voidRescue` keep the design elevations. | The walk is y = 0. The shelf is split around the road. The canyon has a floor. |

## Movement

Grapple anchors and the two slides are shortcuts. The required route is the flat road (S2 z 94–102, rooftop street x 84–96). A slide sits beside that road, not on it. No required grapple is closer than the 6 s recharge, and no required step needs sprint. Stamina cannot close the bazaar.
