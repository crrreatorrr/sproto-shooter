# L04 engine needs

The Blockchain Void clears on the god-mode autopilot in `tests/levels/campaign.test.js`
after the merge of main (`c932fb95`). Census stays 152 enemies plus Bitcoin Obama and
The Midget. Shared engine code was not edited. CI on this branch is red until the
pins below move. Those files are outside this level.

## CI is red on the campaign pin

`contentFingerprint(1)` is `cea1f88b`. The pin on main is `9ec1c6ea`. The hash covers
the payable Obama encounter (`encounterFacts`: id, section start, squad units). Main's
corridor placeholder resolves to legacy `S3-E3` with only the two Duo parts. This
level's fight is `SB-BOSS`, so the hash moves. Thirty-eight tests, `tests/fixtures/boss-goldens.json`,
and the pvp bundle's `campaignContentFingerprint` still expect `9ec1c6ea`.

`tests/server-sim.test.js` expects `resolveCanonicalEncounter(obama).encounter.id`
to be `S3-E3`. The manifest prefers `SB-BOSS` when that encounter exists, and it
now does. `legacyEncounterId` is only the fallback for a tree that has not landed
this level.

`tests/run-validation.test.js` re-records `obama-success` and expects state hash
`8907f24e`. The fresh recording is rejected at tick 36 with reason `teleport`.
The scripted issuer walks from the Exchange vestibule to the Duo, dies, and
`restoreCheckpoint` copies the vestibule snapshot back onto the live state
(`Object.assign` in `campaign.js`). That snap is about 60 m. `movementDelta`
rejects any step over `LIMITS.maxStepMeters` (15). A bankable Obama clear needs
the verifier to allow a checkpoint restore, and then a new golden.

PvP fingerprint `17d87c54` and golden `6545ca0a` did not move.

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
