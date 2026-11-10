# L05 engine needs

Main is merged through #79. Campaign fingerprint on this main is `9ec1c6ea`.
PvP fingerprint `17d87c54` and golden `6545ca0a` are untouched.

Seed 1, god mode, `enemyHpMult` 0.08, the same aim loop as
`tests/levels/campaign.test.js`. The Spotter Drone stays at a finite altitude
and dies. The bot clears S1 (Crash Site, Frozen Creek, listening post) and
walks into S2. At tick **11185** the sim throws.

## Still blocking a clear

1. **`frostHound` has no steering weights, so the first chase throws.**
   `ENEMIES.frostHound` (`src/data/enemies.js`) is `behavior: 'midget'` and
   does not set `weights`, `range`, `windup`, `active`, or `recover`.
   `midget.update` calls `steer` with `def.weights`, and `steer` reads
   `w.seek`.

   ```
   TypeError: Cannot read properties of undefined (reading 'seek')
       at steer (src/sim/enemies.js:47)
       at midget.update (src/sim/enemies.js:139)
   ```

   Seed 1 reached that line when squad `E4-g` woke. Those two hounds spawn
   at local `(75, 0, 198)` once the player crosses local north 150
   (`onAlert`, `zBelow: -150`). Both were alive at the throw, world about
   `(95, 0, -718)`, **8 HP** of 8. Also still up: two Mining Rigs at 20 HP
   and one Audit Sniper at 8 HP. S2-E4 was not cleared. S3, S4 and S5 were
   not reached. The shared autopilot in `tests/levels/campaign.test.js`
   throws on the same line, so "autopilots every level" cannot pass while
   L05 is registered.

   Minimum so chase does not throw, using the design lunge:

   - `weights: { seek: 1.0, sep: 1.2, wall: 2.0, strafe: 0.25 }`
   - `range: 9`
   - `windup: 0.5` (the crouch)
   - `active: 0.2`
   - `recover: 0.9`

   The design lunge is also speed **20**, damage **16** (28 at tier 5),
   knockback **6**, then an ice patch of radius **2.5** for **6** s.
   `midget`'s active step is a hardcoded 4 m/s, so those fields stop the
   throw and still are not that lunge. Scent is **45** m with no line of
   sight, trot **5**, run **9.5**. Hounds ignore Decoy, weather and slick.
   Elite **Alpha** is 2.5× HP, two lunges, patch radius 3.5.

## Landed, and not what stopped this run

- **Spotter Drone (#79).** `altMin` 8, `altMax` 9, `orbitMin` 7, `orbitMax` 14,
  `jinkMin` 0.5, `jinkMax` 1.2. `y` stays finite. Seed 1 killed the creek
  drone and cleared S1-E2. The written 8 m/s patrol loop is still not what
  `flyingMidget` does.
- **Alarm ringer (#76).** Runners stand 1.5 s at the box, a searchlight hold
  of 2 s rings, and a spotter with `ringsAlarm` rings after 1.5 s of line of
  sight inside 35 m. This run threw before an alarm pack spawned. The six
  packs stay `optional: true`, `delay: 6`, `onAlarm`.

## Not on the engine, and not what stopped this run

2. **Sight.** Audit Sniper **140** m inside a 30° cone (sweep 60° in 6 s),
   **60** m outside it, **40** m in a whiteout. Laser **1.4** s, **35** damage,
   relocate after 2 shots. Mining Rig **90** m, no aim inside **15** m of the
   wall. Idle **30** m / 120°. Asleep: no sight, hearing **12** m. Hound scent
   **45** m with no line of sight. The duels are at 125, 128 and 135 m.
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
6. **Ground.** Terrain does not collide or draw, and `primitiveGeometry`
   reads `at[1]` on every entry, so a heightfield in `geometry` crashes the
   frame. `S1-ground` and `S2-ground` sit on `section.terrain` instead.
   `S1-floor` and `S2-floor` are the flat stand-ins. Spheres do not collide,
   so boulder rows are not cover. `crackTiles` (`S2-crack1`–`3`, `S3-crack`)
   stay solid: fall **1** s after a step, telegraph **0.5** s, back in **20** s.
7. **Nav.** `findPath` cannot search a 1 m grid of 300 × 520. Sections do not
   set `navBounds`. `useNav` is false. Wanted local bounds: S1 x 0–300
   z −520–0, S2 x 0–260 z −250–0, S3 x 0–100 z −120–0, S4 x 0–80 z −70–0,
   S5 x 0–80 z −100–0.
8. **Smaller leftovers.** Racks are forced Common; C1, R1 and R2 want Uncommon,
   gun level 5. `S1-secretCache` wants a Legendary sniper. `taxSeason` still
   multiplies speed by 0.82; the bonk is +25% enemy HP and tickets ×2.
   `S4-battery` wants +0.5 mana/s as well as +10 max mana. The boss bar should
   read **The Abominable Auditor**. Cold zones ignore height, so an aura that
   is switched on would burn the gallery too. Step-up is 0.4 m, and a mover
   whose shaft is within 1.6 m of a deck pins the player to the top of the
   shaft. Hazard zones test XZ only, so a slick band under a bridge slows the
   bridge too.

The shrine dais and the pass rig pad are discs. A cylinder has to be at least
0.5 m tall, and step-up is 0.4 m, so the legal cylinder is a curb the bot
cannot climb and cannot sidestep while the sandbags pinch the pass.

Grapple anchors and `tag: 'slide'` are on the ridge, the gallery stairs, the
library stairs, the tower cabins, the wall walk and the vault pillars.
`noGrapple` covers the volume above the vault ceiling. The shared autopilot
grapples only when the level has `voids` and the bot is stuck, and it never
holds slide, so those routes do not move this clear.
