# L02 engine needs still open

`#88` is on main. `S4-E4.script` is the five-part fight: entry bar, then a 1300 bar, the rug pit, 1000, and 900. `designHp` on those bars is still 1714 / 1909 / 1967. GitHub's goja reaches about frame 11000 inside the verifier's 15 second budget, and the design bars run to about frame 16600, so the live bars are the longest set that still clears in both success and assisted mode inside that budget. Node and goja replay the same receipts. The campaign fingerprint is `cea1f88b`. Section S4 still starts at `[149.5, 0, 11]`, and the payable squad is still `sahil` × 1.

## Looms and pylons are not spawned

The golden autopilot only aims at the boss. Immune looms and pylons never die, so a part that waits on them never ends. Those bodies are `designTargets` (looms 161, pylons 230). A verified bot that can shoot script targets would let them be live `targets`.

The showroom floor is wide so the kite cannot walk off it. The columns, the balcony, and the vault marks are cones: they stay visible, and they do not add collision the five-bar replay cannot afford. A solid vault lip also left the shared autopilot stuck on a midget it could not walk around.

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
