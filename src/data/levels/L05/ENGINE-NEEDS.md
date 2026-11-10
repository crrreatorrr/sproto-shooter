# L05 engine needs

Main is merged through #85. Campaign fingerprint on this main is `9ec1c6ea`.
PvP fingerprint `17d87c54` and golden `6545ca0a` are untouched.

Seed 1, god mode, `enemyHpMult` 0.08, the same aim loop as
`tests/levels/campaign.test.js`, cap 24000 ticks. The frost hound lunge
runs. S1 and S2 clear, both generators included. The run dies in S3.

## Still blocking a clear

1. **The Auditor is pulled back to the wave arena.** `monster` movement in
   `src/sim/bosses.js` (`integrate`) clamps the boss to `ARENA_R` (45 m)
   around the world origin. It does not read `encounter.arena`. The HEX
   path does. `S3-F1` sets `arena` to local `(50, -59)`, which
   `makeV2Level` shifts to world `(150, -785)`, radius 35. The body spawns
   on the dais and the first integrate drops it on the wave rim. Seed 1
   shows it at about `(8, 42)`, y 0, **532 HP**, and it never leaves that
   circle. The bot walks south out of S3 to chase it. S3's floor ends at
   local north 0, so y runs away (past −8000 by tick 11800). Lockdown L1
   never seals. S4 and S5 are not reached.

   The clamp should use `e.boss.arena` the way the HEX already does:
   center world `(150, -785)`, radius 35, hold the body inside that circle.

## Landed, and not what stopped this run

- **Frost hound lunge (#85).** Crouch 0.5 s inside 9 m, dash 20 m/s for 0.2 s,
  16 damage (28 at tier 5), knockback 6, ice patch radius 2.5 m for 6 s.
  Scent 45 m, run 9.5, slick does not slow it. L05 spawns `frostHound`.
  Alpha's second lunge and the 3.5 m patch are not on the body.
- **Spotter drone (#79), alarm ringer (#76), plates (#84), whiteout (#82),
  sight (#81).** The creek drone dies. The kill-zone whiteout runs. Plates
  are on the monster, but this run never gets a shot on it.

## Still absent, and not what stopped this run

2. **Heightfield.** Terrain still does not collide or draw. `S1-ground` and
   `S2-ground` stay on `section.terrain`. `S1-floor` and `S2-floor` are the
   walkable stand-ins. This run walked those slabs.
3. **Boulders.** Spheres still do not collide, so the boulder rows are not
   cover. The rock slab on the center line was moved off x 130 so the bot
   can walk the gate lane. The spheres were not the wall it hit.
4. **Crack-ice.** `S2-crack1`–`3` and `S3-crack` stay solid.
5. **Decoy.** `SPELL_IDS` still has no Decoy. The shrine names Cardboard
   Sproto. The bot never casts.
6. **Alpha's second lunge.** The elite in Final Notice is still one lunge
   and a 2.5 m patch. The fight never reached that add.

## Smaller leftovers

Racks are forced Common. `taxSeason` still multiplies speed by 0.82.
`S4-battery` wants +0.5 mana/s as well as +10 max mana. The boss bar should
read **The Abominable Auditor**. Cold zones ignore height. Step-up is 0.4 m.
A mover whose shaft is within 1.6 m of a deck pins the player to the top.
Hazard zones test XZ only.

The two bunker generators are boxes on the gate lane, 8 × 2.4 × 1.2, at
local `(130, 186)` and `(130, 192)`, 500 HP each. The cylinders in the
bunker rooms sit behind partitions the autopilot will not walk into. Three
sleeping midgets stand on the lane behind the boxes so the bot keeps
firing until both boxes break. Grapple anchors and slide ramps are in.
The shared autopilot grapples only on a level with `voids`, and it never
holds slide.
