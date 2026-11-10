# L05 engine needs

Wired to main through #75. A quiet god-mode run clears **The Picket** and stops on the
Frozen Creek. Campaign fingerprint on this main is `0ebc3c6d`. PvP fingerprint
`17d87c54` and golden `6545ca0a` are untouched.

## Still blocking a clear

1. **`spotterDrone` flies into NaN.** `ENEMIES.spotterDrone` uses
   `behavior: 'flyingMidget'` and does not set `altMin`, `altMax`, `orbitMin`,
   `orbitMax`, `jinkMin`, or `jinkMax`. `flyingMidget.update` calls
   `range(rng, def.altMin, def.altMax)`, which is NaN, and the drone's `y`
   becomes NaN on the first jink. Bullets never meet it. Observed on seed 1,
   tier 5, `enemyHpMult` 0.08: the drone sits at about `(80, NaN, -256)` with
   **6 HP** of 6, and the bot stands on the creek. The level data already
   spawns it (`S1-E2` squad `E2-a`, plus the two in `S2-E4` and the one in
   `S5-F2`). The flying Midget's own numbers work: alt **8 to 9**, orbit
   **7 to 14**, jink **0.5 to 1.2**. The design patrol (8 m/s along a written
   loop, 8 to 9 m up) is still not what `flyingMidget` does; the NaN is what
   stops the run.

## Not on the engine, and not what stopped this run

These are still absent. A clear does not need them once the drone has a
finite altitude. Numbers are the design's.

2. **Sight.** Audit Sniper **140** m inside a 30° cone (sweep 60° in 6 s),
   **60** m outside it, **40** m in a whiteout. Laser **1.4** s, **35** damage,
   relocate after 2 shots. Mining Rig **90** m, no aim inside **15** m of the
   wall. Idle **30** m / 120°. Asleep: no sight, hearing **12** m. Hound scent
   **45** m with no line of sight. Placed squads in S1 and S2 should exist at
   section load; the duels are at 125, 128 and 135 m.
3. **Blizzard.** `S2-blizzard`: **20** s whiteouts at t = 10–30, 100–120,
   190–210 and every 90 s, **4** s warning. View and sight cap **40** m.
   Hounds ignore it.
4. **Plates.** Brow **250** HP (437 at tier 5), chest and back **400** (700).
   A plate hit does not hurt the boss. Front or rear body hits do 10% while
   that plate is on. A charge into `S3-pillar1`–`4` stuns 2 s; each pillar
   breaks after 2 hits (`S3-break1`–`4`). Part 2's cold set is `F1-part2`
   (3 damage/s below y 3). Part 3's slick and ice are set `F1-part3`. Nothing
   calls `setHazardSet`. The script still changes parts when the bar empties
   or the generator targets die, which is what #74 runs.
5. **Decoy.** Shrine `S1-shrine` grants `decoy` (Cardboard Sproto): **30**
   mana, **12** s cooldown, **6** s life, cast **20** m. `SPELL_IDS` has no
   Decoy, so the unlock never becomes a cast. Snipers, drones, searchlights,
   rigs and a tracking strike should lock the standee. Hounds ignore it.
6. **Alarm ringer.** `ringAlarm(state, id)` exists. Nothing calls it. The six
   packs are `optional: true` with `delay: 6` and `onAlarm`, so a quiet clear
   no longer waits on them. Still missing: the runner's **1.5** s at the box,
   box **40** HP, cable **20** HP (a non-solid line), searchlight hold **2** s
   (beam 120 m, spot r 6, lamp 30 HP), and a drone hold of **1.5** s. Alarm
   ids: `S1-alarm1`, `S1-alarm3`, `S2-alarm4`, `S2-alarm5W`, `S2-alarm5E`.
7. **Ground.** Terrain does not collide or draw, and `primitiveGeometry`
   reads `at[1]` on every entry, so a heightfield in `geometry` crashes the
   frame. `S1-ground` and `S2-ground` sit on `section.terrain` instead.
   `S1-floor` and `S2-floor` are the flat stand-ins (`S1-ground` is still
   seed 501, amp 1.2, freq 0.012, 2 octaves). Spheres do not collide, so
   boulder rows are not cover.
   `crackTiles` (`S2-crack1`–`3`, `S3-crack`) stay solid: fall **1** s after a
   step, telegraph **0.5** s, back in **20** s. The Tax Season cave stays sealed.
8. **Nav.** `findPath` cannot search a 1 m grid of 300 × 520. Sections do not
   set `navBounds`. Wanted local bounds: S1 x 0–300 z −520–0, S2 x 0–260
   z −250–0, S3 x 0–100 z −120–0, S4 x 0–80 z −70–0, S5 x 0–80 z −100–0.
   Lifts: `S1-lift` (y 0, 14, 22), `S4-lift` (y 0 to 7), `S4-freight` (15 s).
9. **Smaller leftovers.** Racks are forced Common; C1, R1 and R2 want Uncommon,
   gun level 5. `S1-secretCache` wants a Legendary sniper. `taxSeason` still
   multiplies speed by 0.82; the bonk is +25% enemy HP and tickets ×2.
   `S4-battery` wants +0.5 mana/s as well as +10 max mana. The boss bar should
   read **The Abominable Auditor**. Cold zones ignore height, so an aura that
   is switched on would burn the gallery too.
