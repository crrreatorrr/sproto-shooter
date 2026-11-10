# L05 engine needs

Frostspire Black Site is authored against `docs/campaign/ENGINE-API.md` and
`docs/campaign/levels/L05-frostspire-black-site.md`. The level data already
carries the ids, positions and numbers. Do not change the census (128 scripted
enemies + 26 alarm enemies + **The Abominable Auditor**) to paper over these.

Tier is 5. Enemy HP and damage scale by **1.749** (1.15⁴). Player hazard
damage does not scale. The Auditor's Wave Mode bar stays **3,800** (6,646 at
tier 5). This fight is not in the hub's canonical boss table.

## Blocking a clear on today's director

1. **Alarm squads never spawn, and `clearAll` waits for them.** `S1-E1` (The
   Picket) and `S1-E3` (The Listening Post) include `optional: true` squads
   `E1-R` and `E3-R` with `trigger.type: 'onAlarm'`. `triggerReady` returns
   false for that type, and `objectiveDone` still requires every squad to have
   spawned. A quiet run, which is the run the level is built for, never rings
   the alarm, so those two encounters never clear. The god-mode bot in
   `tests/levels/campaign.test.js` kills the picket and then stands on the camp.
   It does not reach S2, a lockdown, the Auditor, or the results screen.
   The six packs are 26 enemies: E1-R 4 midget + 2 boomMidget, E2-R 3 midget +
   1 robotLaser, E3-R 3 midget + 2 riotMidget, E4-R 4 midget + 2 obama,
   E5-RW 2 midget + 1 riotMidget, E5-RE 2 glowieAgent. The siren is 6 s before
   they arrive. Skip `optional` squads in the clearAll count, and spawn them
   only when their alarm id is rung.

2. **`spotterDrone` and `frostHound` are not enemies.** The first of each is
   `S1-E2` (the creek drone, then the kennel hounds). `createEnemy` reads
   `ENEMIES[type]` and throws. Stat blocks and primitive looks are
   `SPOTTER_DRONE` and `FROST_HOUND` in `enemies.js`. Wire `look` the way
   `buildLookGroup` already draws. Tier-1 HP is 45 and 55 (tier 5: 79 and 96).

3. **The Auditor is ticked by the wave `MEGA` brain, which calls
   `summonGrunts`.** `bosses()` runs any boss whose def has no `campaign`
   flag. `monster` does not. At the phase-2 transition (50% HP) it summons
   **10** Midgets because tier is 5, from `state.spawnPoints`. A campaign
   section has no spawn points, so `pts[i % 4]` is missing and the summon
   throws. The part script on `S3-F1` already lists the 24 written adds and
   sets `attacks` without `summon`. `MEGA` does not read `boss.attackList`.
   Skip `summonGrunts` for a scripted Auditor, and spawn the script adds at
   `add.at` (today `spawnAdd` drops them on the boss).

4. **Doors that start shut only stay shut while a switch names them.** The
   pass gate (`S1-passGate`, opens `S1-E3.cleared`) and the shield gate
   (`S2-shieldGate`, opens `S2-E5.cleared`) use an unreachable latch switch so
   `refreshDoors` keeps the slab solid until the encounter flag sets
   `lv.got[door]`. That wiring is in the level because it is the only hook
   that exists. A door with `opens: 'encounter.cleared'` should start solid
   and delete itself when the flag trips, with no dummy switch.

5. **`destroy` never hears a generator die unless a bullet hits its solid.**
   `S2-E5` ids are `BW-gen-body` and `BE-gen-body`, each a `target` of
   **500** HP with a core weak spot ×2 (`BW-gen-hp`, `BE-gen-hp`). The same
   is true of `S3-genNW-body` and `S3-genNE-body`. The autopilot aims at
   enemies, not at cylinders. Part 2 of the Auditor (`Cold Storage`) is
   `immune` until script targets of the same generators die; those targets
   are spawned as Midgets with `hp: 500` and `tickBossScript` does not apply
   the tier multiplier.

6. **The vault cannot end on the written rule.** `S5-F2` objective is
   `clearAll` plus `also: { kind: 'hold', seconds: 90 }`. The director reads
   only `kind`, so the room opens when the waves die even if the drill is at
   0. The drill must run only while the player or a Sproto Swarm buddy stands
   in `S5-hold` (r **9**), enemies in the ring do not pause it, and if the
   waves die first it runs at ×3. The exit opens only when both are done.
   Strikes are on `S5-strikes`: t+8, 22, 36, 50, 64, 78, 92, then every 14 s.
   Nothing ticks a `droneStrike`.

## N1 — sight, and placed squads at section load

`auditSniper` sight is **140** m inside a 30° cone that sweeps 60° in 6 s,
**60** m outside it, and **40** m in a whiteout. The laser is **1.4** s and
**35** damage, then the sniper relocates after 2 shots. `miningRig` sight is
**90** m all round, **40** m in a whiteout, and it cannot aim inside **15** m
of the wall under it. Idle sight is **30** m in a 120° cone. Asleep enemies
have no sight and hear **12** m. A Frost Hound scents **45** m with no line of
sight. Placed squads in S1 and S2 have to exist when the section loads: the
duels are at 125 m, 128 m and 135 m, and a 70 m pre-spawn never shows them.

## N2 — blizzard

`S2-blizzard`: whiteouts of **20** s at t = 10–30, 100–120, 190–210 and every
90 s after, with a **4** s warning. Player view and every sight range above
are capped at **40** m. Hounds are not. No weather mechanism is ticked.

## N3 — stealth and alarms

A sniper hit on an unaware, asleep or suspicious enemy is a guaranteed crit
(the existing ×1.5 in `damageEnemy`), stacked with the weak-spot multiplier.
An idle enemy with a line to a corpse inside **20** m is suspicious for 2 s,
then alert. The runner (unit `role: 'runner'`) needs **1.5** s at the box.
The box is **40** HP, the cable **20** HP. A cut alarm does nothing and the
runner waits 3 s. Cables are non-solid lines (`S1-alarm1`, `S1-alarm3`,
`S2-alarm4`, `S2-alarm5W`, `S2-alarm5E`); the 0.5 m solid minimum cannot
draw them. Searchlights (`S2-lightW`, `S2-lightE`, and the harmless
`S1-practice`) hold for **2** s inside a 120 m beam, spot radius **6** m, lamp
**30** HP, then ring the alarm. A Spotter Drone holds **1.5** s out of 3 s,
fires 3 mortars (radius 3.5 m, 22 damage, tier 5: 38) and wakes placed squads
inside 60 m. In S2 that call also rings `S2-alarm4`. In the vault the call is
one extra Drone Strike with no tracking time.

## N4 — plates, and the wave summon

Brow plate **250** HP (437 at tier 5), sphere r 1 at y 6.5, covers the head.
Chest and back plates **400** HP each (700). A hit on a plate damages the
plate, not the boss. While the chest is on, front-180° body hits do 10%.
While the back is on, rear hits do 10%. A charge into `S3-pillar1`–`4` (or a
wall) stuns him 2 s; each pillar breaks after 2 charges. Part 2 puts him in
an ice dome on the dais until both gallery generators die, then stuns him 4 s.
Part 3 makes x 35–65, n 44–74 slick and cracks the 26 × 26 ice floor. Those
sets are `F1-part2` and `F1-part3` on the hazard zones. Nothing calls
`setHazardSet`.

## N5 — Drone Strike without Glowie

Reticle radius **2.6** m, track **1.8** s, lock **0.75** s, then **30** to the
player and **120** to enemies. It follows a Decoy placed while it is tracking.
Cadence is the `times` array on `S5-strikes`, then every **14** s until the
room is clear. The strike clock does not wait for waves.

## N6 — hold plus clearAll

See blocking item 6. Coolant grates (`S5-cool1`–`4`, r 3, set `F2-coolant`)
are cold for **8** s at t+30, t+60 and t+90. Cold stops shield regen. The
Part 2 aura also deals **3** damage/s below y 3; the galleries are above it.
`insideZone` ignores y, so a live aura would burn the gallery too.

## N7 — Decoy

Shrine `S1-shrine` grants `decoy` ("Cardboard Sproto"): **30** mana, **12** s
cooldown, standee **6** s, cast range **20** m, then a 20-damage pop in 3 m.
`grantSpell` stores the id and `syncSpellbook` only mirrors `SPELL_IDS`, which
has no Decoy, so the player never receives it. Snipers, drones, searchlights,
Mining Rigs and a tracking Drone Strike lock the standee. Frost Hounds ignore
it. A rig dumps its 4 s stream into the standee and opens the vent for 2 s. A
searchlight or drone parks on it for 6 s. A drone's mortar on a standee does
not wake the area.

## N8 — ammo that dies at 40 m

Optional. Packs from kills beyond 40 m should last **120** s instead of 30 s,
or the sniper forfeits them. The budget already assumes they are lost: quiet
half asks **44** sniper rounds; boxes on every route (AB1, AB3, AB4, AB5, AB6,
AB8, AB12) are 56, the cache magazine is 4, expected close drops are 20,
total 80 = 1.82 × asked.

## Also open, and not a reason to change this level's numbers

- Nav is off. `findPath` is an open-list scan, and a 1 m grid of S1 is 300 × 520
  cells. Baking that and searching it per enemy stalls the sim, so these
  sections do not set `navBounds`. The bounds the level wants, in local
  metres, are S1 x 0–300 z −520–0, S2 x 0–260 z −250–0, S3 x 0–100 z −120–0,
  S4 x 0–80 z −70–0, S5 x 0–80 z −100–0. Lifts that should be nav links:
  `S1-lift` (stops y 0, 14, 22), `S4-lift` (y 0 to 7), `S4-freight` (y 14 to 21,
  15 s).

- Terrain does not collide or draw (`solidFromPrimitive` returns null,
  `primitiveGeometry` skips it). `S1-floor` and `S2-floor` are flat stand-in
  slabs tagged `terrainStandIn`. `S1-ground` is still the authored heightfield
  (cell 4, seed 501, amp 1.2, freq 0.012, 2 octaves, flat on n 244–268 and in
  the pass). Spheres do not collide, so the boulder rows are not cover. The
  rock slabs and snow berms are.
- `crackTiles` (`S2-crack1`–`3`, `S3-crack`) are solid ice until the engine
  drops a tile 1 s after a step (0.5 s telegraph, back in 20 s). The Tax Season
  cave under band 2 stays sealed. Explosions inside 4 m should break tiles now.
- `giveWorldGun` forces Common. Racks C1, R1 and R2 are Uncommon, Ol' Reliable,
  no element, gun level 5. The secret cache `S1-secretCache` is a Legendary sniper.
- `taxSeason` currently multiplies campaign speed by 0.82. The bonk in the ice
  cave is **Tax Season**: enemies +25% HP, tickets ×2.
- `S4-battery` adds +10 max mana. It also wants +0.5 mana/s. The field is
  `manaRegen: 0.5`.
- Slick zones use `slow: 0.15` (creek, corridor). Hounds do not take that
  multiplier, and a hound patch is r 2.5 for 6 s (Alpha 3.5).
- Lockdown lids are `lockdown.room`. `noteV2Section` copies them. The force
  field over the courtyard is y 12, the library ceiling is y 20, the vault
  iris passes strikes and rejects the player.
- Easy and Heroic numbers are `L05.difficulty`. They are not applied.
- Only `section.intro` is shown. The gate card is S3's intro, the vault card
  is S5's, and the end card is `L05.outro`.
- The boss bar should read **The Abominable Auditor**, not BLUE MONSTER.
  Elites the player meets: **the Head Auditor**, **the Supervisor**, **Alpha**,
  **the Archivist**, **the Vault Warden**.
