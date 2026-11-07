# Sproto Shooter

A wacky first-person loot shooter built with Three.js, inspired by Borderlands. You fight waves of Sproto Duel characters (midget swarms and bitcoin-shooting Obamas) across Sproto Duel's stages, grab procedurally generated guns, craft better ones at Weapon Boxes, and level four skills just by playing.

This is the **mechanics sandbox** stage. Characters, stages and boss portraits are reused from [sproto-duel](https://github.com/crrreatorrr/sproto-duel) (`public/assets/`). The machine gun, shotgun and sniper use toy gun models (`public/assets/models/guns/`); the bazooka is still a low-poly placeholder. There's no login, hub, saving or multiplayer yet; the code is structured so those can be added later (see `PLAN.md` §9).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 30 unit/sim tests (Vitest)
npm run build      # static build in dist/
```

URL params: `?mode=waves|sandbox|test&tier=1-10&seed=123&debug=1`

## What's in

| Area | Details |
|---|---|
| Arena & stages | 90 m circle, 16 spawn points, 2 Weapon Boxes. Sproto Duel stages wrap it: wave 1 Los Angeles, wave 2 Ashen Caldera, wave 3 The Void, sandbox Aurora Glacier (sky, floor, stone, pillar and prop models) |
| Modes | **Wave Mode**: 3 waves (20 / 33 / 50 enemies, mostly midget swarms), Mega Tinubu ends wave 2, Mega Tinubu + Hex Sahil together end wave 3, 15 s shop break between waves, victory leads to the next tier (1–10). **Sandbox**: spawn anything from the debug panel. **Test Range** (`?mode=test`): the sandbox with every gun type in slots 1–4, infinite ammo, god mode and target dummies; starting Wave Mode afterwards resets you to the starting gun |
| Guns | 4 types with drop rarity: Machine Gun (common ~60%), Shotgun (rare ~17%), Sniper (rare ~17%), Bazooka (very rare ~6%). Separate quality roll Common→Legendary, 4 manufacturers, 12 parts, 3 elements (Fire burn, Shock chain, Goo slow). Legendaries get a wacky perk: rubber-duck bullets, yeet reload, every-10th mega bullet, mini Sproto buddies, confetti kills, big-head mode |
| Enemies | **Midget**: fast melee runner that never shoots and comes in big swarms. **Bitcoin Obama**: keeps distance, strafes and fires 3-round bitcoin bursts (about 1 shot/s, 4.5° spread, 30 m/s, so you can dodge; your MG does 10 shots/s). **Flying Midget** (Midget stage 3 + propeller beanie, from wave 2): fast and erratic, circles you 3–6 m up and peppers you with tiny 2-damage pellets; 30 HP but hard to hit. **Big Bitcoin Obama**: heavy with a front shield, ground pound and a sloppy 6-round hose; hit the back battery. Models use Sproto Duel's stage 1/2/3 versions: elites and tier 4+ step up a stage. Elites wear a crown, have ×2.5 HP and drop double. Headshots = **BONK** |
| Bosses | Each phase swaps to the next Sproto Duel stage model. **Mega Tinubu** (Physical, 3 phases): bitcoin volleys, charge (stuns itself on the wall, exposing a belly weak spot), jump-over shockwaves, summons midget swarms. **Hex Sahil** (Magic, 3 phases): floating caster with bullet-hell orbs, homing tax bolts, teleports, an orbiting weak spot and a mana-draining aura |
| Skills | No skill points. Each skill levels from its own XP and perks unlock automatically. **Health**: kills, taking damage, healing pickups, Physical bosses. **Gunslinger**: gun kills, crits/weak spots, Physical bosses. **Magic**: casting spells, spell kills, Magic bosses. **Crafting**: crafting guns (T1 counts) and ammo |
| Spells | Goo Bolt (Q, Lv1), Chain Zap (E, Lv3), Sproto Swarm (Z, Lv6), Mana Shield (X, Lv8), Meteor Bonk (F, Lv10, full mana) |
| Crafting | Resources drop from monsters: Scrap (all), Springs (Midgets), Goo (Bitcoin Obamas), Plating (Big Obamas), Boss Cores, Mana Crystals (Hex Sahil). Weapon Box recipes for 4 types × 5 tiers, cheap ammo, medkits. Higher Crafting levels unlock element choice, part choice, salvage and stat reroll |
| Economy | Tickets from kills, wave clears and bosses. Between-wave shop: tier-scaled gun offers, gacha vending machine, ammo/shield/slot upgrades, sell guns |
| Feel | Hitstop on big crits, screen shake, recoil climb, FOV punches, confetti deaths, damage numbers (pellets merged), magnet pickups, synthesized SFX |

## Asset loading

Assets load per level, not all at once (`render/assets.js` priority queue + `levelAssets()` in `data/stages.js`):

- Title and sandbox share wave 1's stage (Los Angeles), so the first download is 5 files.
- Each wave downloads only the enemy models its config can spawn (by type, elite and tier).
- Boss models (all phases) download in the background once the wave's own assets are in.
- The next wave's stage and enemies download during the intermission.
- Sandbox spawns load their model on demand. A small "⏳ loading" hint shows in the HUD while downloads run.

## Controls

| Key | Action |
|---|---|
| WASD / Mouse | Move / aim (click the game to lock the mouse) |
| LMB / RMB (hold) | Fire / aim |
| F | Aim on / off (Shift cancels it). Sniper: zoom 1 → zoom 2 (3× stronger) → off |
| Wheel while zoomed | Sniper: switch between zoom 1 and zoom 2 (instead of switching guns) |
| 5 | Stats & powers panel (spells and perks show what unlocks them) |
| P | God mode: you still get hit but health never drops below 99; also unlocks every spell and tops up tickets, resources, ammo and medkits |
| Shift · Space · C · Alt or V | Sprint · jump/double jump · slide · dash |
| R · 1–4 / wheel | Reload · switch gun |
| G | Pick up gun / open Weapon Box |
| H | Use medkit |
| Q E Z X T | Spells (Meteor Bonk is T) |
| Tab (hold) · B · I | Skills · shop (between waves) · your guns |
| Enter · ` · M · Esc | Ready for next wave · debug panel · mute · pause |

## Code layout

```
src/
  core/    rng (seeded sfc32), math, eventBus
  data/    all balance: guns, enemies+bosses, drops, recipes, skills, waves, shop, tuning; stages.js maps stages and character models
  sim/     pure deterministic simulation (no three.js/DOM): simulate() runs every system at 60 Hz
  input/   keyboard/mouse + pointer lock -> Command objects
  render/  Three.js views, viewmodel, VFX (reads state only); assets.js loads the Sproto Duel GLBs (meshopt) and stage textures
  ui/      DOM HUD + menus (queues actions, never writes state)
  audio/   WebAudio synth SFX
  game/    Game: loop, hitstop, screens, lil-gui debug panel
tests/     Vitest: architecture rules, RNG, gun generator, collision, damage, drops, XP, crafting, waves, determinism, full autopilot run
```

`PLAN.md` is the full architecture and milestone plan, with every balance number.
