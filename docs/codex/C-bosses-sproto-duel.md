# Sproto Shooter: Campaign Bosses (part C): Sproto Duel bosses, same attacks

The campaign's bosses are the **Sproto Duel** bosses, brought into first person with **the same
attacks**: the same stages, ordinary spells, signature volleys, special powers, arena shifts,
projectile looks, transformation cinematics and reward spells.

Source of truth: `crrreatorrr/sproto-duel` (local clone `~/games/sproto-duel`, `main` @ `126eeb2`).
Every number below was copied from that commit. **When you port, re-read the Duel files and copy
from them, not from this document.** If Duel has changed since, Duel wins. The parity test (§8)
enforces it.

---

## 0. What to port, from where

| Duel file | What it holds | Shooter destination |
|---|---|---|
| `src/campaign/levels.ts` | `BOSSES` (5 fights, 6 fighters): stages, models, attacks per stage, volleys, powers, skins, palettes, AI profiles, stage health, damage multipliers, arena shifts, transform styles, rewards, `ARENA_NAMES` | `src/data/duelBosses.js` (plain JS copy; keep field names) |
| `src/config.ts` → `spells` | Ordinary spell numbers: bolt, blast, shield, stun, ultimate | `src/data/duelBosses.js` → `DUEL_SPELLS` |
| `src/config.ts` → `powers` | Power framework constants (recharge per stage, first delay, damage scale, gap, sight, fall height, ring/sweep height) | `DUEL_POWERS` |
| `src/config.ts` → `campaign` | `stageDamage`, `stageAI`, `aggression`, `ultCharge`, `volley`, `duo`, `flight`, `cinematic`, `hurtbox` | `DUEL_CAMPAIGN` |
| `src/config.ts` → `arenaShifts` | Fire ring per stage, mood, pools, spring, vents | `DUEL_SHIFTS` |
| `src/config.ts` → `arena.layouts` + `src/arena/layouts.ts` | Boss arena cover: `bazaar`, `exchange`, `streets`, `caldera`, plus `cubicles` for the office | `src/data/levels/duelArenas.js` (converted to kit colliders) |
| `src/campaign/BossStages.ts` | Stage machine: bars, transform, per-stage multipliers and AI | `src/sim/duelBoss/fighter.js` |
| `src/spells/SpellSystem.ts` | How bolts, blasts, stuns, ultimates, shields and volleys behave, and the damage formula (`:969-970`) | `src/sim/duelBoss/spells.js` |
| `src/spells/BossPowers.ts` | The 9 power kinds: telegraph, fire, evade rules, damage (`:530`, `:707`) | `src/sim/duelBoss/powers.js` |
| `src/arena/ArenaShifts.ts` | Stage 2/3 pools, spring, vents, mood | `src/sim/duelBoss/arenaShift.js` + `src/render/level/ArenaShiftView.js` |
| `src/arena/FireRing.ts` | The fire ring boundary and its shader | `src/sim/duelBoss/fireRing.js` + `src/render/level/FireRingView.js` |
| `src/enemy/AIController.ts` | Boss AI (burst/pause, strafe, range, dodge, shield preference, punish, hop) | `src/sim/duelBoss/ai.js` |
| `src/campaign/BossCinematic.ts`, `transformStyles.ts` | Transformation cinematics per style | `src/render/cinematic/BossCinematic.js` (render-only; the sim just freezes) |
| `src/spells/ProjectileSkins.ts`, `skinLooks.ts` | Code-built projectile meshes: rugRoll, carpet, phone, pig, floret, broccoli, bullet, grenade, hellfire, skull | `src/render/vfx/projectileSkins.js` |
| `src/fx/PowerFx.ts`, `SpellFx.ts` | Telegraph and spell visuals | `src/render/vfx/duelPowerFx.js` |
| `src/spells/RewardSpells.ts`, `rewardCatalog.ts`, `config.ts` → `rewardSpells` | Magic Carpet, Pump It, Vape Cloud, Lock-On, Hellfire Breath | `src/sim/rewardSpells.js`, `src/data/rewardSpells.js` |
| `public/assets/models/rigged/{broccoli,agent}_stage{1..3}.glb` | Broccoli Head and Glowie models (~1.8 MB) | `public/assets/models/characters/` (same naming as the others) |
| `public/assets/ui/bosses/*.png` | Portraits + stage concept art (`<id>.png`, `<id>_stage2.png`, `<id>_stage3.png`) | `public/assets/ui/bosses/` |
| `public/assets/audio/boss_{rise,roar,slam}.mp3` | Boss stingers | Through the audio manifest (A-M4) |

The shooter's `sahil`, `obama`, `midget` and `tinubu` character GLBs came from the same Duel
rigs. **Verify by file hash** that they match Duel's `models/rigged/<id>_stage<n>.glb`. If they
differ, copy Duel's. Boss fit heights per stage are in Duel's `manifest.ts`: Sahil 2.0/2.25/2.55,
Obama 2.1/2.3/2.55, Midget 1.25/1.4/1.6, Broccoli 2.0/2.35/2.8, Glowie 2.0/2.2/2.5, Tinubu 2.1/2.45/2.9.
Sockets (staff, phones, vape, gun, hand, mouth) are in `RIG_SOCKETS`. Muzzles are in each stage's
`muzzle`.

---

## 1. Port rules: what "same attacks" means

**Copied exactly:** attack kinds; which stage unlocks what; counts, spreads, intervals,
radii, lengths, arcs, angles, warn times, track times, speeds, turn rates, lifetimes,
cooldowns; stage recharge factors; projectile skins; volley definitions; arena shift
contents; AI profile numbers; stage names, titles, intro lines, palettes, transform styles and
rewards.

**Converted with two global constants** (in `src/data/duelBosses.js`, tuned once, then frozen):

| Constant | Initial value | Why |
|---|---|---|
| `DUEL_DMG_K` | **0.68** | A Duel wizard has 220 HP (`CONFIG.wizard.maxHealth`). A shooter player has 100 HP + 50 shield = 150. So 150/220 keeps every attack's share of your health the same. Applied **after** Duel's own formula (base × `damageMultiplier` × `stageDamage[stage]` × `spellDamage` for ordinary spells, or × `powers.damageScale` for powers) |
| `DUEL_HP_K` | 1.0 × `tierEnemyMult(level.tier)` | Duel bars are sized for ~5 minutes against wizard bolts. Shooter guns hit much harder, so tune `DUEL_HP_K` with the TTK tool (A-M13) until each stage lasts **90-150 s** for a tier-matched player with common guns. One constant for all bosses keeps Duel's relative bar sizes |

**First-person adaptations** (mechanics map 1:1 onto what the shooter already has):

| Duel | Shooter |
|---|---|
| Dodge roll i-frames evade any power | **Dash** (`dashInvuln` 0.12 s) and **slide** evade the same things. Rolling through a seeker = dashing through it (it loses its lock and flies on) |
| Jump clears rings (0.8 m tall) and sweeps (0.55 m) | Same. Shooter jump velocity 8 m/s with gravity 22 peaks at ~1.45 m, so a timed jump clears both. Double jump and jetpack also count |
| Boss shield (`shieldPreference`, `perfectShieldChance`): blocks spells, perfect block reflects | The boss shield bubble (radius 1.25, 0.8 s, cooldown 5) **blocks bullets and pellets** (0 damage, `bossShield` event). A **perfect** shield **reflects projectiles** (rockets, spell bolts, duck bullets) back at ×1.35 speed and ×1.5 damage, as in Duel. Hitscan can't be reflected, only blocked. This is boss behaviour, not a gun change |
| Stun beam (range 34, 1.0 s) | The player is stunned 1.0 s: can't move, shoot or cast; camera sway; `playerStunned`. 0.2 s cast telegraph (beam charge) as in Duel |
| Flash (`flash`): blinds anyone in range *looking at it* | Look-away test against the **camera forward**: blinded if the grenade is within `facing`° of view and within `radius`. Blind = white-out + stun for `stun` s. A perfect first-person mechanic |
| Ultimate: expanding wave (30 m/s to 40 m, 38 damage, ×0.35 if shielding) | Same wave. Jump, dash i-frames, or the player's **Mana Shield** spell count as "shielding" (×0.35). The wave also breaks pillars in Duel (`pillarDamage`). In levels it damages only destructible cover |
| `needSight`: a power starts only with the target in sight | `hasLOS(boss, player)` (C §3.5). Strike, barrage and cloud may start from the air |
| Zones telegraph on the floor | Telegraph decals follow the ground (`raycastWorld` down at each circle's centre); what falls drops from `fallHeight` 14 m over the last `fallTime` 0.45 s |
| Mid-air spell clashes (`power`: the bigger spell wins) | Player rockets and spell bolts clash with boss bolts and blasts using Duel's `power` values (bolt 1, blast 4). Hitscan doesn't clash |
| Life packs, golden tickets (Duel arena pickups) | Not ported. The arena **spring** (stage 2 shift) heals, and normal shooter drops (health orbs) apply |
| Third-person camera | First person. The boss card, stage banners and transformation cinematic use a cinematic camera (render-only) |

Bosses are `e.boss` entities like the shooter's wave bosses, so all existing systems work:
`raycastEnemies`, damage pipeline, elements, crits, weak zones and drops. Hurtbox: Duel's
`campaign.hurtbox` (model height × 0.9, radius 0.42/0.48/0.55 per stage), plus a **weak zone** on
the head (r = 0.25 × height ratio) so BONK headshots work as on every shooter enemy.

---

## 2. The fighter framework (`src/sim/duelBoss/`)

### 2.1 Stages
- Three stages, **each with its own health bar** (`stageHealth[i] × DUEL_HP_K`). Emptying a bar
  starts the transformation into the next stage, and overflow damage is lost. Only emptying
  the last bar is a kill.
- On transform: `state.level.cinematic = { kind: 'transform', style, t }` freezes the sim
  (enemies, projectiles, powers); the player is invulnerable. The renderer plays the
  style's cinematic (§5). Then the new stage starts with a full bar and its model swaps.
  Emit `bossTransform` and `bossStageStart`.
- Per stage: `damageMultiplier = boss.damageMultiplier × stageDamage[stage]` with
  `stageDamage = [1, 1.25, 1.5]`. Ordinary spells also × `spellDamage ?? aggression.spellDamage (0.7)`.
  The AI profile is sharpened by `CONFIG.campaign.stageAI` and pressed by `aggression`
  (burstPause ×0.5, +1 burst, blastChance ×2.5, stunChance ×2, punishChance ×2, range ×0.85,
  strafeSpeed ×1.1). Copy `stageAI` from Duel.

### 2.2 Ordinary spells (from `CONFIG.spells`)

| Spell | Numbers (Duel) | Unlocked by `attacks` |
|---|---|---|
| Bolt | damage 4, speed 52 m/s, radius 0.16, fire interval 0.17 s, lifetime 1.4 s, knockback 2.4, power 1 | Always |
| Blast | damage 20, splash 3.6 m (edge ×0.35), speed 20, radius 0.5, cooldown 3, cast 0.16 s, lifetime 2.4, knockback 13, power 4 | `blast` |
| Shield | 0.8 s, cooldown 5, radius 1.25, perfect window 0.2 s, reflect ×1.35 speed ×1.5 damage, deflect ×0.5 | Always |
| Stun | 1.0 s, cooldown 8, cast 0.2 s, range 34, damage 6 | `stun` |
| Ultimate | charge 100 (boss rate × `ultCharge` 0.25), cast 0.3 s, damage 38, wave 30 m/s to 40 m, ×0.35 vs shield, knockback 20 | `ultimate` |
| Dodge roll | Bosses roll per `dodgeChance` (Tinubu's rigs skip roll/jump clips: procedural flip, `RIG_SKIP_CLIPS`) | Always |

Bolts and blasts use the boss's **skins** (`skins.bolt`, `skins.blast`). Stun and Ultimate keep
the spell effects.

### 2.3 Signature volleys
`count` bolt-skinned shots in a fan (`spreadDeg`) or a burst (`interval`), each at
`damageScale` × bolt damage. Framework: mana 8, AI max range 22 m, first use 0.35 × cooldown
after a stage starts, and every volley cooldown × `cooldownScale` 2.2.

### 2.4 Special powers (`BossPowers.ts`)
Framework (`CONFIG.powers`): stage recharge `[1, 0.85, 0.72]`, a stage's first use after
0.4 × recharge, damage × 0.4 (`damageScale`), ≥ 4 s between any two powers of the fight's
bosses (a double fight takes turns), target must be in sight, zone grace 0.5 × target radius,
fall from 14 m over the last 0.45 s, ring height 0.8, sweep height 0.55.

| Kind | Behaviour (Duel) | How the player evades |
|---|---|---|
| `strike` | A reticle follows you for `track` s, then locks for `warn` s, then hits from above (`radius`) | Leave the circle after it locks, or dash as it lands |
| `barrage` | `count` circles land around you over `duration` s within `spread` m, each `warn` s after it appears | Keep moving between them |
| `march` | A line of `count` eruptions from the boss toward where you stood, `spacing` m apart, `step` s apart | Sidestep the line |
| `rings` | `count` shockwaves roll out every `interval` s at `speed` up to `maxRadius` | Jump them or dash through |
| `sweep` | A low beam (`length`) turns `arc`° round the boss in `duration` s | Jump it or dash |
| `cone` | A cone (`angle`, `length`) toward you locks, then blasts with `knockback` | Get out of it or behind cover |
| `seekers` | `count` slow homers (`speed`, `turn`, `life`). `drain`: a hit also drains mana | Dash through as one arrives, use Mana Shield, or break LOS behind cover |
| `flash` | A grenade lands and pops after `warn`; anyone within `radius` looking within `facing`° is blinded (`stun` s) | Look away |
| `cloud` | A toxic cloud forms where you stand (`radius`, `warn`, `life`), hurting every second | Get out |

Power telegraphs and hits are sim hazards (`state.hazards`, kinds `duelStrike`, `duelBarrage`,
`duelMarch`, `duelRings`, `duelSweep`, `duelCone`, `duelSeeker`, `duelFlash`, `duelCloud`) with
`powerWarn`/`powerFire` events. They hurt **only the player and allies**, as in Duel
(zones there hurt "anyone"; keep friendly fire off for shooter enemies so a power doesn't wipe
the boss's own minions).

### 2.5 Arena shifts (`ArenaShifts.ts`, `CONFIG.arenaShifts`)
- **Fire ring** boundary: radius 27.8 → 26.8 → 25.5 m per stage, easing in at 0.9 m/s
  (`FireRing.ts`). Crossing it burns; it's the boss arena's wall. Level geometry outside the
  ring is just vista.
- **Mood:** light and fog turn toward the boss's `shift.mood` colour: 0 / 0.16 / 0.32 per stage over 2.5 s.
- **Stage 2:** 4 **pools** (radius 1.7-2.3) in the boss's theme that burn anyone with feet on the floor
  (`shift.pools.dps`, optional `slow`), plus 1 **spring** (radius 1.5) healing 9 HP/s until 40 HP
  are given. Stage 3 refills it.
- **Stage 3:** 3 **vents** (radius 1.7) that warn 1.3 s and erupt every 7-9.5 s (random phase per
  vent, from `state.rng`) for `shift.vents.damage` plus knockback 19.
- Placement (deterministic, `state.rng`): ≥ 4 m from fighters, ≥ 1 m from cover, 1.5 m apart, ≥ 3 m
  inside the ring, 200 attempts per feature. Each new feature fades in harmlessly for 1.8 s.
- Pools, spring and vents affect bosses too (Duel: "boss or player"). Bosses avoid pools if
  their AI does in Duel (copy `AIController` behaviour).

### 2.6 Double fights (`partner`)
Two full fighters with separate bars, stages and transforms. Knocking one out leaves the other
as he is. Spawn 5 m apart; their AIs keep 4.5 m apart (weight 0.9) and drift to flank you by 50°
(weight 0.45). They take turns on powers (the 4 s gap is shared). The arena shift follows the
furthest stage either has reached.

### 2.7 Flight
A stage with `fly` hovers that high over whatever is underneath (over low cover, fire and lava).
Rise 3, sink 3.5, climb 2.2 m/s, look-ahead 0.25 s, bob 0.14 m at 2.4 rad/s, jet particles.
A stun drops it to the ground until the stun wears off. In the shooter, the player's stun
sources are Shock element procs (existing `shock` status) and Goo slow, which **counts as a stun
for flight** (it drops to the ground for the goo duration). That's a simple, readable counter.

---

## 3. The five fights (data copied from Duel `levels.ts`)

Damage numbers are Duel's raw values. The framework applies Duel's multipliers, then `DUEL_DMG_K`.
`range` = farthest target distance to start a power.

### 3.1 Sahil, *the RugMaster* → L2 "Grand Bazaar" boss
*"Every rug comes with a lifetime guarantee. The rug pull is free."* Theme `desert`, arena
`bazaar` (rugs, a cart, pots), transform style `bazaar`, reward **Magic Carpet**. Fight 1: very easy.

| | Stage 1 *Friendly Discount* | Stage 2 *No Refunds* | Stage 3 *Full Rug Pull* |
|---|---|---|---|
| Model | `sahil_stage1` (staff) | `sahil_stage2` | `sahil_stage3` |
| Attacks | Bolts only | Blast, Stun | Blast, Stun, Ultimate, volley **Rug Barrage** (3 shots, 22° fan, cooldown 5, ×0.8) |
| Stage health | 1490 | 1660 | 1710 |

Skins: bolt `rugRoll`, blast `carpet`. damageMultiplier 0.77, spellDamage 0.45.
Powers:
| Power | Kind | From | Cooldown | Damage | Range | Shape |
|---|---|---|---|---|---|---|
| Carpet Sweep | sweep | stage 1 | 15 | 7 | 15 | arc 200°, 1.9 s, length 15, warn 1.1, skin carpet |
| Bazaar Rain | barrage | stage 2 | 17 | 7 | 30 | 7 circles r 2, spread 5, over 2.4 s, warn 1.15, skin rugRoll |
| Magic Carpet Drop | strike | stage 3 | 16 | 13 | 30 | r 2.7, track 1.6, warn 0.85, skin carpet |

AI: reaction 0.85, aimError 0.34, lead 0, dodge 0.08, shield pref 0.2, perfect 0, burst 1-2,
pause 2.3-3.6, blast 0.02, stun 0.008, punish 0.02, strafe 0.4, range 10-15.
Arena shift: mood `0xff9a3c`; pools **Quicksand** (`0xd9b26a`, 4 dps, sand, slow 0.5); spring
**Oasis** (`0x4fe0c8`); vents **Sand Geysers** (`0xffc070`, 9).
Palette robe `0x7a1f2b`, trim `0xe8b04a`, spell `0xff9a3c`, blast `0xd94a2a`, stun `0xffe2b0`, ultimate `0xffb347`.

### 3.2 Bitcoin Obama & The Midget, *the Pump & Dump Duo* → L4 "Blockchain Void" boss
*"Shiller shills."* Theme `void`, arena `exchange` (candlestick bars, chained blocks, **2 blocks
sliding on rails**), double fight, reward **Pump It**. Obama is the glass cannon (smaller bars,
hits hardest); The Midget is the tank who closes in. A sharp player drops Obama first.

**Bitcoin Obama** (transform `shill`; skins bolt `phone`, blast `pig`; damageMultiplier 0.64, spellDamage 0.5)
| | Stage 1 *Pump* | Stage 2 *Hype Cycle* | Stage 3 *Dump* |
|---|---|---|---|
| Model | `obama_stage1` (phone) | `obama_stage2` (two phones) | `obama_stage3` (fists) |
| Attacks | Bolts | Blast | Blast, Stun, Ultimate, volley **Pump & Dump** (4, 30°, cd 4.5, ×0.7) |
| Stage health | 380 | 440 | 500 |

| Power | Kind | From | Cd | Dmg | Range | Shape |
|---|---|---|---|---|---|---|
| Green Candles | march | 1 | 15 | 8 | 22 | 7 eruptions, spacing 2.6, r 1.5, warn 0.95, step 0.14 |
| Shill Calls | seekers | 2 | 17 | 6 | 26 | 3 seekers, speed 8.5, turn 2.2, life 5, skin phone |
| Liquidation | rings | 3 | 18 | 10 | 22 | 3 rings, interval 0.75, speed 13, max r 24, warn 0.95 |

AI: reaction 0.45, aimError 0.45, lead 0.05, dodge 0.25, shield 0.3, perfect 0.05, burst 1-2,
pause 2.8-4, blast 0.015, stun 0.008, punish 0.04, strafe 0.65, range 10-15.

**The Midget** (transform `tantrum`; skins bolt `phone`, blast `pig`; damageMultiplier 0.46,
spellDamage 0.5, **speed 1.5**, hitbox r 0.32 h 1.25)
| | Stage 1 *Small Cap* | Stage 2 *To the Moon* | Stage 3 *Short Squeeze* |
|---|---|---|---|
| Model | `midget_stage1` (phone) | `midget_stage2` | `midget_stage3`, **flies at 1.7 m** |
| Attacks | Bolts | Blast | Blast, Stun, volley **Moon Shot** (3, 4°, interval 0.1, cd 5, ×0.6) |
| Stage health | 450 | 515 | 560 |

| Power | Kind | From | Cd | Dmg | Range | Shape |
|---|---|---|---|---|---|---|
| Tantrum Stomp | rings | 1 | 19 | 7 | 16 | 2 rings, interval 0.6, speed 12, max r 18, warn 0.85 |
| To the Moon | strike | 2 | 20 | 10 | 30 | r 2.4, track 1.4, warn 0.85, skin phone |
| Pig Rain | barrage | 3 | 21 | 6 | 28 | 9 circles r 1.6, spread 6, 2.4 s, warn 0.95, skin pig |

AI: reaction 0.38, aimError 0.47, lead 0.04, dodge 0.3, shield 0.15, perfect 0.03, burst 1-2,
pause 2.6-3.8, blast 0.015, stun 0.008, punish 0.05, strafe 0.85, range 7-12, hopRate 0.45.
Arena shift: mood `0xf7931a`; pools **Liquidation Pits** (`0xff3346`, 11, liquid); spring
**Airdrop** (`0x5dff8a`); vents **Gas Fees** (`0xb26bff`, 10).
Palettes: Obama robe `0x18181f` trim `0xe0b23a` spell `0xf7931a`; Midget robe `0x1f3f9a` trim `0xc08a3e` spell `0x4f86ff`.

### 3.3 Broccoli Head, *the Floret Lord* → L6 "Los Angeles" boss
*"Leads the LA Vape Cabal."* Theme `city`, arena `streets` (freeway columns, parked cars,
a food truck, dumpsters, a bus stop, palm planters, and **drifting vape clouds that block
sight**), transform `vape`, reward **Vape Cloud**.

| | Stage 1 *Sprout* | Stage 2 *Overgrown* | Stage 3 *Floret Colossus* |
|---|---|---|---|
| Model | `broccoli_stage1` (vape pen) | `broccoli_stage2` (box mod) | `broccoli_stage3` (vape cannon) |
| Attacks | Bolts | Blast, Stun | Blast, Stun, Ultimate, volley **Floret Spray** (5, 36°, cd 4, ×0.6) |
| Stage health | 880 | 900 | 1000 |

Skins: bolt `floret`, blast `broccoli`. damageMultiplier 0.76, spellDamage 0.97.
| Power | Kind | From | Cd | Dmg | Range | Shape |
|---|---|---|---|---|---|---|
| Floret Mortar | barrage | 1 | 14 | 11 | 30 | 8 circles r 2, spread 5.5, 2.4 s, warn 1.0, skin floret |
| Hotbox | cloud | 2 | 18 | 8 | 26 | r 4.2, warn 0.95, life 6 |
| Big Exhale | cone | 3 | 14 | 20 | 12 | 60°, length 13, warn 1.05, knockback 9 |

AI: reaction 0.28, aimError 0.75, lead 0.12, dodge 0.4, shield 0.45, perfect 0.15, burst 1-3,
pause 2.6-4.1, blast 0.012, stun 0.012, punish 0.04, strafe 0.85, range 9-14.
Arena shift: mood `0x7dff5a`; pools **Toxic Runoff** (`0x7dff5a`, 12, liquid); spring **Fire
Hydrant** (`0x5ab8ff`); vents **Sewer Steam** (`0xdfe8e0`, 10).
Vape clouds (`streets.soft`): 3 soft zones (r 2.2-2.4, h 3.0-3.2) drifting 2.5-3.5 m over 38-46 s
periods. They block boss sight (`needSight`) and the player's view. Port as non-solid
LOS-blocking volumes (`raycastWorld` flag `blocksSight`).

### 3.4 Glowie, *Government Enforcement* → L8 "Government Office" boss
*"Unknown."* Theme `office`, arena `cubicles` (a grid of cubicles with aisles,
`CONFIG.arena.cubicles`), transform `glitch`, reward **Lock-On**.

| | Stage 1 *Routine Inquiry* | Stage 2 *Armed Response* | Stage 3 *Black Ops* |
|---|---|---|---|
| Model | `agent_stage1` (pistol) | `agent_stage2` (SMG) | `agent_stage3` (minigun) |
| Attacks | Bolts | Blast, volley **Burst Fire** (3, 3°, interval 0.09, cd 4.5, ×0.6) | Blast, Stun, Ultimate, volley **Full Auto** (7, 7°, interval 0.07, cd 5, ×0.4) |
| Stage health | 1096 | 1118 | 1274 |

Skins: bolt `bullet`, blast `grenade`. damageMultiplier 0.86, spellDamage 1.15.
| Power | Kind | From | Cd | Dmg | Range | Shape |
|---|---|---|---|---|---|---|
| Drone Strike | strike | 1 | 14 | 17 | 40 | r 2.6, track 1.8, warn 0.75, skin grenade |
| Flashbang | flash | 2 | 15 | 6 | 22 | r 7, warn 1.15, stun 1.6, facing 110°, skin grenade |
| Suppressing Fire | sweep | 3 | 15 | 13 | 22 | arc 240°, 1.6 s, length 22, warn 0.95, skin bullet |

AI: reaction 0.26, aimError 0.7, lead 0.16, dodge 0.42, shield 0.45, perfect 0.18, burst 1-3,
pause 3-4.3, blast 0.022, stun 0.01, punish 0.05, strafe 0.95, range 8-13.
Arena shift: mood `0x4fd8ff`; pools **Live Wires** (`0x5ae0ff`, 13, electric); spring **Water
Cooler** (`0x8fd8ff`); vents **Server Meltdown** (`0xffd04a`, 11).

### 3.5 Tinubu, *the Unshackled Demon* → L10 "Hellfire Caldera" final boss
*"Infects you to make you sell your tickets."* Theme `volcano`, arena `caldera` (basalt
outcrops, broken columns, **lava pools**), transform `hellfire`, reward **Hellfire Breath**.
Duel calls him "close to impossible". Here he's the campaign finale.

| | Stage 1 *Emi Lokan* | Stage 2 *Unshackled* | Stage 3 *Inferno Incarnate* |
|---|---|---|---|
| Model | `tinubu_stage1` (palm + mouth) | `tinubu_stage2` (claw + mouth) | `tinubu_stage3` |
| Attacks | Blast | Blast, Stun, volley **Hellfire** (3, 20°, cd 4.5, ×0.7) | Blast, Stun, Ultimate, volley **Inferno** (5, 40°, cd 3.5, ×0.7) |
| Stage health | 1100 | 1111 | 800 |

Skins: bolt `hellfire`, blast `skull`. damageMultiplier 0.74, spellDamage 0.8.
| Power | Kind | From | Cd | Dmg | Range | Shape |
|---|---|---|---|---|---|---|
| Hellfire Pillars | march | 1 | 12 | 13 | 24 | 8 eruptions, spacing 2.6, r 1.7, warn 0.85, step 0.12 |
| Infection | seekers | 2 | 15 | 8 | 28 | 4 seekers, speed 9, turn 2.6, life 5.5, skin skull, **drain** (mana) |
| Inferno Rings | rings | 3 | 16 | 12 | 22 | 3 rings, interval 0.6, speed 14, max r 26, warn 0.85 |
| Meteor Rain | barrage | 3 | 15 | 17 | 30 | 10 circles r 2.2, spread 6, 2.6 s, warn 0.95, skin hellfire |

AI: reaction 0.2, aimError 0.45, lead 0.2, dodge 0.45, shield 0.45, perfect 0.3, burst 2-3,
pause 3-4.2, blast 0.025, stun 0.02, punish 0.1, strafe 1.05, range 8-13.
Arena shift: mood `0xff4a1a`; pools **Magma Fissures** (`0xff5a1a`, 16, magma); spring **Hot
Spring** (`0x6fe8ff`); vents **Eruptions** (`0xff7a2a`, 13).
Tinubu's rig skips roll/jump clips (rigid wings go through the floor): use the procedural flip.

---

## 4. Boss arenas inside levels

- Each boss level ends in a **boss arena** built from Duel's layout for that boss:
  `bazaar`, `exchange`, `streets`, `cubicles` or `caldera`. Convert each `LayoutDef` entry
  (kind, x, z, turn, height, mirror) with Duel's `mirrored()` rules (`src/arena/layouts.ts`) into
  kit colliders, using Duel's obstacle shapes (`CONFIG.arena.obstacles`: parts are boxes/
  cylinders with sizes) → `src/data/levels/duelArenas.js` exports `duelArena(layoutId, at)`.
  Movers (exchange's sliding blocks: axis, span, speed, start) become `mover()` mechanisms.
  `hazards` (caldera lava pools) become lava `hazardZone`s. `soft` (streets vape clouds) become
  sight-blocking drifting volumes.
- The arena is a **disc of radius ~28 m** bounded by the **fire ring**. The level leads into
  it through a gate that closes behind you (Halo "point of no return") right after the
  pre-fight checkpoint.
- Destructible cover from Duel (`hp`, `stumpHeight`) stays destructible by bullets and
  explosions; it leaves stumps.
- The **boss card** (portrait, name, title, intro line, arena name from `ARENA_NAMES`) plays
  when you enter: 2.6 s, sim frozen, player invulnerable (shared with A-M11's boss intro).

## 5. Cinematics and presentation
- **Transformations:** port `BossCinematic.ts` + `transformStyles.ts` for styles `bazaar`, `shill`,
  `tantrum`, `vape`, `glitch`, `hellfire` (beats, props, camera paths, sounds). First person: cut to
  a cinematic camera for the transform, then back. The sim freezes for its length (copy
  `CONFIG.campaign.cinematic` durations). It can be skipped (hold Enter) after you've seen it once
  (profile flag).
- **Projectile skins:** port the 10 code-built skins. Each skin keeps the boss palette colours.
- **Power telegraphs:** port `PowerFx.ts` visuals onto ground-following decals (plan A's decal
  system with the surface normal).
- **HUD:** a boss bar shows the **stage name** and the current stage's bar with 3 pips (bars
  left). A stage banner shows concept art `ui/bosses/<id>_stage<n>.png` on transform.
  Double fights show two bars. Warnings appear for stun and flash.
- **Audio:** `boss_rise`, `boss_roar`, `boss_slam` stingers; positional power sounds; boss music
  state (C §3.17).

## 6. Reward spells in first person (`src/sim/rewardSpells.js`)

Numbers come from Duel's `CONFIG.rewardSpells`. Copy them; the table shows the behaviour.
Beating a boss emits `rewardSpellLearned` and unlocks the spell in the profile. The Boss Spell
slot is key `Y` / mouse button 4.

| Spell (from) | First-person behaviour | Rule-1 note |
|---|---|---|
| **Magic Carpet** (Sahil) | 3.5 s on a flying carpet: a burst of speed then > 2× speed, hovering over lava, fire ring, pools, low cover and shockwaves. Guns and spells fire normally. Ramming knocks enemies flying. Jump to leap off; press again to hop off | Movement only |
| **Pump It** (Obama & Midget) | 6 s: +50% **spell** damage. The shooter has no Ultimate, so the 1.5× Ultimate charge becomes 1.5× mana regen | Spells only, never guns |
| **Vape Cloud** (Broccoli Head) | Drops a 5 m smoke screen for 6 s. Enemies inside it or looking through it lose track of you (perception treats you as unseen) and fire at your last known position. You heal 2 HP/s inside. Attacking from it gives you away and pauses the healing | Perception + heal |
| **Lock-On** (Glowie) | 6 s: **spell projectiles and Sproto buddies** home gently on the nearest enemy in front of you. A dash still slips them for enemies, and boss shields still stop them | Never gun bullets |
| **Hellfire Breath** (Tinubu) | Channel a 6 m fire cone for 2 s. It burns everything in it (existing `fire` element burn status) and leaves them burning. You move slowly while breathing | Spell, uses the existing burn |

## 7. Events (add to coverage)
`bossCard`, `bossStageStart`, `bossTransform`, `powerWarn`, `powerFire`, `volley`, `bossShield`,
`bossReflect`, `arenaShift`, `fireRingHurt`, `springHeal`, `ventWarn`, `ventErupt`,
`playerStunned`, `playerBlinded`, `rewardSpellLearned`, `rewardSpellCast`.

## 8. Tests
- **Parity test:** in the Duel repo, a small script (`npx tsx scripts/export-bosses.ts`, added to
  Duel in a tiny separate PR, or run locally) writes `duel-bosses.json` from `BOSSES`,
  `CONFIG.spells`, `CONFIG.powers`, `CONFIG.campaign` (stageDamage, aggression, volley, duo,
  flight), `CONFIG.arenaShifts` and `CONFIG.arena.layouts`. Commit it to the shooter as
  `tests/fixtures/duel-bosses.json` with the Duel commit hash. `tests/duelBosses.test.js` asserts
  every copied field in `src/data/duelBosses.js` matches. Changing a copied number without
  updating the fixture fails CI.
- **Power behaviour tests** (headless, one per kind): strike tracks then locks; barrage drops
  exactly `count` circles within `spread`; march line spacing and timing; rings are cleared by
  a jump at the right time and hit a grounded player; sweep arc and height; cone knockback
  direction; seekers lose lock on dash-through; flash blinds when facing and not when facing
  away; cloud ticks only while inside.
- **Stage tests:** a bar empty → transform → next stage with a full bar and the right attacks
  unlocked; overflow lost; arena shift features appear at stage 2/3 with the clearance rules;
  the fire ring radius eases per stage; duo bars are independent; the Midget flies in stage 3
  and is dropped by a Goo slow.
- **Autopilot:** the campaign bot (C-milestones §3) beats each boss in its level with god mode
  on 3 seeds; fight length is logged so `DUEL_HP_K` tuning is visible in CI output.
- **Determinism:** each boss fight, same seed and command log → same state hash.

## 9. Milestones (detail in C-milestones-cursor)
- **C-M12a** Duel boss framework + assets copy + Sahil (the easiest fight proves the whole stack).
- **C-M12b** Obama & Midget (double fight, flight), **C-M12c** Broccoli Head (cloud, cone, vape
  clouds), **C-M12d** Glowie (flash, sweep, cubicles), **C-M12e** Tinubu (drain seekers, 4 powers).
  These four can run in parallel after C-M12a.
- **C-M12f** Reward spells (after C-M12a; each spell lands with or after its boss).
