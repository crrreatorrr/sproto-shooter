# Sproto Shooter

A wacky first-person loot shooter built with Three.js, inspired by Borderlands. You fight waves of googly-eyed Sproto blobs in a circular arena, grab procedurally generated guns, craft better ones at Weapon Boxes, and level four skills just by playing.

This is the **mechanics sandbox** stage. All art is low-poly placeholder. There's no login, hub, saving or multiplayer yet; the code is structured so those can be added later (see `PLAN.md` §9).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 30 unit/sim tests (Vitest)
npm run build      # static build in dist/
```

URL params: `?mode=waves|sandbox&tier=1-10&seed=123&debug=1`

## What's in

| Area | Details |
|---|---|
| Arena | Blank 60 m circle, glowing edge, 12 spawn points, 2 Weapon Boxes |
| Modes | **Wave Mode**: 3 waves (8 / 14 / 20 enemies), Mega Sproto ends wave 2, Mega Sproto + Hex Auditor together end wave 3, 15 s shop break between waves, victory leads to the next tier (1–10). **Sandbox**: spawn anything from the debug panel |
| Guns | 4 types with drop rarity: Machine Gun (common ~60%), Shotgun (rare ~17%), Sniper (rare ~17%), Bazooka (very rare ~6%). Separate quality roll Common→Legendary, 4 manufacturers, 12 parts, 3 elements (Fire burn, Shock chain, Goo slow). Legendaries get a wacky perk: rubber-duck bullets, yeet reload, every-10th mega bullet, mini Sproto buddies, confetti kills, big-head mode |
| Enemies | Grunt (melee rusher), Spitter (dodgeable lobs), Bouncer (hopping stomper), Tank (front shield, hit its back battery). Elites (crown, ×2.5 HP, double drops, random element affinity). Weak spots everywhere = **BONK** |
| Bosses | **Mega Sproto** (Physical): charge (stuns itself on the wall, exposing a belly weak spot), jump-over shockwaves, summons Grunts. **Hex Auditor** (Magic): bullet-hell orbs, homing tax bolts, teleports, orbiting weak spot, mana-draining aura |
| Skills | No skill points. Each skill levels from its own XP and perks unlock automatically. **Health**: kills, taking damage, healing pickups, Physical bosses. **Gunslinger**: gun kills, crits/weak spots, Physical bosses. **Magic**: casting spells, spell kills, Magic bosses. **Crafting**: crafting guns (T1 counts) and ammo |
| Spells | Goo Bolt (Q, Lv1), Chain Zap (E, Lv3), Sproto Swarm (Z, Lv6), Mana Shield (X, Lv8), Meteor Bonk (F, Lv10, full mana) |
| Crafting | Resources drop from monsters: Scrap (all), Springs (Bouncers), Goo (Spitters), Plating (Tanks), Boss Cores, Mana Crystals (Hex). Weapon Box recipes for 4 types × 5 tiers, cheap ammo, medkits. Higher Crafting levels unlock element choice, part choice, salvage and stat reroll |
| Economy | Tickets from kills, wave clears and bosses. Between-wave shop: tier-scaled gun offers, gacha vending machine, ammo/shield/slot upgrades, sell guns |
| Feel | Hitstop on big crits, screen shake, recoil climb, FOV punches, confetti deaths, damage numbers (pellets merged), magnet pickups, synthesized SFX |

## Controls

| Key | Action |
|---|---|
| WASD / Mouse | Move / aim (click the game to lock the mouse) |
| LMB / RMB | Fire / zoom (sniper scope) |
| Shift · Space · C · Alt or V | Sprint · jump/double jump · slide · dash |
| R · 1–4 / wheel | Reload · switch gun |
| G | Pick up gun / open Weapon Box |
| H | Use medkit |
| Q E Z X F | Spells |
| Tab (hold) · B · I | Skills · shop (between waves) · your guns |
| Enter · ` · M · Esc | Ready for next wave · debug panel · mute · pause |

## Code layout

```
src/
  core/    rng (seeded sfc32), math, eventBus
  data/    all balance: guns, enemies+bosses, drops, recipes, skills, waves, shop, tuning
  sim/     pure deterministic simulation (no three.js/DOM): simulate() runs every system at 60 Hz
  input/   keyboard/mouse + pointer lock -> Command objects
  render/  Three.js views, viewmodel, VFX (reads state only)
  ui/      DOM HUD + menus (queues actions, never writes state)
  audio/   WebAudio synth SFX
  game/    Game: loop, hitstop, screens, lil-gui debug panel
tests/     Vitest: architecture rules, RNG, gun generator, collision, damage, drops, XP, crafting, waves, determinism, full autopilot run
```

`PLAN.md` is the full architecture and milestone plan, with every balance number.
