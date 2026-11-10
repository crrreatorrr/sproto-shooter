# L04 engine needs

The Blockchain Void clears on the god-mode autopilot in `tests/levels/campaign.test.js`
after the merge of main (`c932fb95`). Census stays 152 enemies plus Bitcoin Obama and
The Midget. Nothing below blocks that clear. Shared engine code was not edited.

## A Duo script and a target solid crash the sim

`scriptShields` in `src/sim/campaign/bossScript.js` calls `Object.keys(prog.targets)`
on every entry in `level.scripts`. `tickDuo` stores `{ part, partT, home }` and never
sets `targets`. The first gun hit on a `kind: 'target'` solid after `SB-BOSS` has
started throws `TypeError: Cannot convert undefined or null to object`.

This level does not put HP on those solids. The six opening bitbugs in `SB-BOSS`
squad `P1a` carry `partId` `sb.py1`, `sb.py2`, `sb.py3`, `sb.cb1` and `sb.cb2`.
Killing one calls `markPartDestroyed`, which is what the Duo clock reads. The pylon
and breaker meshes stay as scenery. `S3-E5` and `S5-E8` targets are unaffected
because no Duo book exists during those fights.

A one-line guard (`prog.targets || {}`) would let the fight use real destructible
pylons again.

## Read by the sim

- Canonical Obama encounter is `SB` / `SB-BOSS`.
- `voids` are copied, and each section sets `voidRescue` so a fall and a flyer
  who drops out of the world both resolve.
- `flakPod` spawns. Duo bars, the part clock, entry and intermission shields,
  and the Midget's last-bar lock all run.
- Grapple anchors are on every section. Long `slide`-tagged decks run the
  Genesis lane, the Candle Forest lip and stair, the wind lane, and the mine field.
- `kind: 'jetpack'` grants the pack. `sb.jet` is `skipIfOwned`. `sb.gate` opens
  on `p.jet.has`.

## Still not applied

- `hazardZone` `force` and `accel`. `s3.wind`, `s4.wind` and the S2 updrafts set
  those fields. The ticker only applies `slow` and `dps`.
- `gravityWell` does not pull flyers or bend shells. `s4.well` is data only.
- Tiles tagged `drop`, and `rise` on a tile, are not driven by the Duo clock.
  The exchange floor stays put through Flash Crash.
- The Duo clock does not play the held transform, the Price Shield sphere, or
  the Moon Pad flight cycle. It does pin both fighters and hold them invulnerable
  during Opening Bell and Flash Crash.
- A mover without `carry` adds to `vel.x` once. `mode: 'pingpong'` does not ferry.
- Lock walls and lids are solid for the whole section, not only while the room
  is sealed.
- `s5.battery` asks for `manaRegen: 0.5`. Only `mana: 10` is applied. Regen stays
  the global tuning value.
- `giveWorldGun` still grants Common. The racks ask for Uncommon, and `s4.cache`
  asks for a Legendary Duck.
- Energy-bridge decks are solid from the start. `when: 'c4'` does not hide `eb4`.
- Sign `text` is not drawn.
- The live `flakPod` does not use every field in `FLAK_POD` (vent weak spot,
  fuel drain, goo jam, shell bend).
- Part-timed add squads on `SB-BOSS` are `optional`. The director skips a squad
  when its part ends, but the first time it sees the clock it does not skip parts
  it never sat on. Optional keeps a skipped opening from stalling the win.
