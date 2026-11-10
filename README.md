# Sproto Shooter

A wacky first-person loot shooter built with Three.js, inspired by Borderlands. You fight waves of Sproto Duel characters (midget swarms and bitcoin-shooting Obamas) across Sproto Duel's stages, grab procedurally generated guns, craft better ones at Weapon Boxes, and level four skills just by playing.

This is the **mechanics sandbox** stage. Characters, stages and boss portraits are reused from [sproto-duel](https://github.com/crrreatorrr/sproto-duel) (`public/assets/`). All four guns (machine gun, shotgun, sniper, bazooka) use toy gun models (`public/assets/models/guns/`). Campaign progress is saved in the browser. **Free 1v1** (title screen) is the first multiplayer mode: two equal fighters, fixed guns and ammo, no loot, no perks and no Tickets. Its lobby offers offline practice against a bot, a local two-client mock, and Find free match, which queues on the hub and joins the authoritative free 1v1. `docs/shooter-pvp-protocol.md` is the server contract.

A visit from the metaverse hub arrives as `/#t=<ticket>`. The client redeems it with `@metaverse/hub-sdk` (game id `sproto-shooter`), shows the hub ticket balance on the title screen, and Return to Hub leaves through `/#from=sproto-shooter`. Opened on its own, the game still runs and the chip stays `--`. Run tickets (the loot currency) are a different number from hub tickets. The hub registers this id (migration `0039_sproto_shooter_coop`; `0038` was never used) and opens it from the fifth plaza ring, The Range. The hub also has the server side of verified boss-clear receipts (`shooter.run.issue` / `shooter.run.submit`, migration `0040_shooter_boss_receipt`, `docs/shooter-server-contract.md`). This client does not call those RPCs yet, so it banks no hub Tickets. The one hub event it reports is the Dragon Scale Relic (hub-sdk 0.6.4): with a hub session, the first wave 1 clear of each Wave Mode run sends `shooter.wave_clear` with `{ wave: 1, godMode }` (God Mode counts; campaign and Boss Fight clears do not). The hub grants it once and pays no Tickets for it (`src/hub/waveRelic.js`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: unit, sim, golden, goja and browser tests (156 in 23 files on 2026-11-08; needs Go and Playwright Chromium)
npm run build      # static build in dist/
```

URL params: `?mode=waves|sandbox|test&tier=1-10&seed=123&debug=1&stats=1`

Hub (same shape as the other games):

| Variable | Meaning |
|---|---|
| `VITE_NAKAMA_URL` | Nakama origin. Dev default `http://127.0.0.1:7350`. `npm run dev` also proxies `/v2` and `/ws` there. |
| `VITE_NAKAMA_SERVER_KEY` | Nakama client server key. Dev and a page opened on loopback use Nakama's stock key. A public build sends no key unless this is set, so a ticket redeem is refused and the game stays standalone. This is not the Nakama HTTP key. |
| `VITE_HUB_URL` | Hub page for Return to Hub. Dev default `/hub/`. |

## What's in

| Area | Details |
|---|---|
| Arena & stages | 90 m circle, 16 spawn points, 2 Weapon Boxes. Sproto Duel stages wrap it: wave 1 Los Angeles, wave 2 Ashen Caldera, wave 3 The Void, sandbox Aurora Glacier (sky, floor, stone, pillar and prop models) |
| Modes | **Campaign**: The Great Sproto Audit, ten levels built on the arena engine (`src/data/levels/`). **Free 1v1**: see above. **Wave Mode**: 3 waves (20 / 33 / 50 enemies, mostly midget swarms), the Jade Dragon ends wave 1, the Blue Monster wave 2, Mega Tinubu + Hex Sahil together end wave 3, 15 s shop break between waves, victory leads to the next tier (1–10). **Sandbox**: spawn anything from the debug panel. **Boss Fight** (`?mode=boss&boss=monster`; also `dragon`, `sprotoBeast`, `megaSproto`, `hexAuditor`): pick any boss from the title screen and fight it alone with real damage and one of every gun. **Test Range** (`?mode=test`): the sandbox with every gun type in slots 1–4, infinite ammo, god mode and target dummies; starting Wave Mode afterwards resets you to the starting gun |
| Guns | 4 types with drop rarity: Machine Gun (common ~60%), Shotgun (rare ~17%), Sniper (rare ~17%), Bazooka (very rare ~6%). Separate quality roll Common→Legendary, 4 manufacturers, 12 parts, 3 elements (Fire burn, Shock chain, Goo slow). Legendaries get a wacky perk: rubber-duck bullets, yeet reload, every-10th mega bullet, mini Sproto buddies, confetti kills, big-head mode Range: shotgun pellets do full damage to 7 m and can't hit past 16 m, the machine gun falls off past 30 m (max 75 m), the sniper reaches the whole arena; long barrels +20%, short −15% |
| Enemies | **Midget**: fast melee runner that never shoots and comes in big swarms. **Bitcoin Obama**: keeps distance, strafes and fires 3-round bitcoin bursts (about 1 shot/s, 4.5° spread, 30 m/s, so you can dodge; your MG does 10 shots/s). **Flying Midget** (Midget stage 3 + propeller beanie, from wave 2): fast and erratic, circles you 3–6 m up and peppers you with tiny 2-damage pellets; 30 HP but hard to hit. **Big Bitcoin Obama**: heavy with a front shield, ground pound and a sloppy 6-round hose; hit the back battery. Models use Sproto Duel's stage 1/2/3 versions: elites and tier 4+ step up a stage. Elites wear a crown, have ×2.5 HP and drop double. Headshots = **BONK** |
| Bosses | Each phase swaps to the next Sproto Duel stage model. **Mega Tinubu** (Physical, 3 phases): bitcoin volleys, charge (stuns itself on the wall, exposing a belly weak spot), jump-over shockwaves, summons midget swarms. **Hex Sahil** (Magic, 3 phases): floating caster with bullet-hell orbs, homing tax bolts, teleports, an orbiting weak spot and a mana-draining aura |
| Skills | No skill points. Each skill levels from its own XP and perks unlock automatically. **Health**: kills, taking damage, healing pickups, Physical bosses. **Gunslinger**: gun kills, crits/weak spots, Physical bosses. **Magic**: casting spells, spell kills, Magic bosses. **Crafting**: crafting guns (T1 counts) and ammo |
| Spells | Goo Bolt (Lv1), Chain Zap (Lv3), Sproto Swarm (Lv6), Mana Shield (Lv8), Meteor Bonk (Lv10, full mana). Right-click / LT casts the selected spell, Q / LB picks the next unlocked one; Y Z X T and the D-pad are quick casts |
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

Keyboard, mouse and controller all work at once. The HUD prompts and the controls list on the title and pause screens follow the device you used last. The layout follows the shared Sproto convention, so the hub and every Sproto game feel the same.

### Keyboard and mouse

| Key | Action |
|---|---|
| WASD or arrow keys / Mouse | Move / aim (click the game to lock the mouse) |
| LMB / RMB | Fire / cast the selected spell |
| F or middle-click | Aim toggle: press to aim and stay aiming; with a sniper press again to zoom closer (3× stronger); press again to stop. Shift cancels it |
| Wheel while zoomed | Sniper: switch between zoom 1 and zoom 2 (instead of switching guns) |
| Shift · Space · C · Ctrl+Shift · B · V (or Alt) | Sprint (stamina) · jump/double jump · slide · crouch-slide · grapple · dash |
| R | Reload. Hold R: pick up gun / open Weapon Box (when one is in reach; E or G also work) |
| 1–4, L / wheel | Switch gun (L = legendary slot) |
| H | Use medkit |
| Q · Y Z X T | Next spell (the HUD highlights it) · quick cast Chain Zap, Sproto Swarm, Mana Shield, Meteor Bonk |
| Tab (hold) · B · I · 5 | Skills · shop (between waves) · your guns · stats & powers |
| Enter | Ready for next wave |
| Esc | Pause (the browser releases the mouse); closes a panel; back in menus |
| Menus | Arrows or W / S (A / D across a row) move, Enter or Space confirm, Esc back. Left / right change a slider or list |
| P · ` · F3 · M | God mode: you still get hit but health never drops below 99; also gives one of every gun (keeping yours, dropping extras), unlocks every spell, gives infinite mana and endless spare ammo for every gun (you still reload), and keeps you topped up at 99,999 tickets, 9,999 of each resource, full ammo and medkits · debug panel · frame-time stats · mute |

E is Interact, as in the hub and the other Sproto games, so Chain Zap moved from E to Y. Keyboard and controller share one idea: reload and pick up are the same button (tap / hold), one button casts the selected spell and one picks the next, and aim is a toggle. P stays God mode (Esc pauses).

### Controller

Any standard-mapping pad (Xbox, PlayStation, Switch Pro and most others) works with no setup. Plug it in or press a button; Xbox names below, other pads use the same positions.

| Button | Play | Menus |
|---|---|---|
| Left stick | Move | Move focus |
| Right stick | Look (with aim assist near enemies) | |
| RT / LT | Fire / cast the selected spell | |
| A | Jump / double jump | Confirm |
| B | Slide | Back / close / resume |
| X | Reload. Hold X longer: pick up gun / open Weapon Box (when one is in reach; the prompt fills while you hold) | |
| Y | Next gun | |
| LB / RB | Next spell / dash | Switch panel or Weapon Box tab |
| D-pad ↑ → ← ↓ | Chain Zap / Sproto Swarm / Mana Shield / medkit | Move focus |
| L3 / R3 (stick clicks) | Sprint (toggle) / aim toggle: click to aim and stay aiming; with a sniper click again to zoom closer; click again to stop | |
| View | Shop between waves, otherwise your guns (LB / RB reach Skills and Stats) | Close panel |
| Menu | Pause | Resume |

Why this layout: both thumbs stay on the sticks for what you do mid-fight. The triggers fire the gun (RT) and cast the selected spell (LT); LB picks the next spell (the HUD highlights it) and RB dashes. Aim is an R3 toggle, so you do not hold a trigger to stay zoomed. Jump, slide and reload / pick up sit on the face buttons. Three spells and the medkit also have quick casts on the D-pad, so the D-pad does not move you in play (the left stick does); it still moves the menu focus. Sprint is an L3 toggle that ends when you stop pushing forward or start aiming, and starting it drops aim.

Look speed has a response curve (fine aim near the centre) and ramps up a little when the stick is held at the edge. Aim assist is controller only: the stick slows down near an enemy, and while aiming (R3) the view drifts gently toward the head. Mouse and keyboard never get it. Its numbers are in `src/input/padConfig.js`; the pause screen has *Controller look speed* and *Controller aim assist* (0 turns it off).

A button held while the page loads (the hub's A press) is ignored until it is released. Unplugging the controller pauses the game. Return to Hub is on the title and pause screens (it asks again during a run). Browsers do not let a controller press capture the mouse or (in most browsers) start audio, so sound may wait for the first click or key press. Free 1v1 practice: Menu moves the focus to Ready / Leave, B goes back to playing.

## Code layout

```
src/
  core/      rng (seeded sfc32), math, eventBus
  data/      all balance: guns, enemies+bosses, drops, recipes, skills, waves, shop, tuning; stages.js maps stages and character models;
             levels/ holds the campaign levels; serverManifest.js is the campaign content fingerprint
  sim/       pure deterministic simulation (no three.js/DOM): simulate() runs every system at 60 Hz
    campaign/, level/   campaign director and compiled level runtime
    pvp/     Free 1v1 arena: sim, director, rules, practice bot, export (pinned; bundled as shooter-pvp-sim.js)
  server/    campaign run contract and verifier the hub runs (pinned; bundled as shooter-sim.js)
  net/       Free 1v1 client, input codec and wire protocol (inputCodec.js and protocol.js are pinned)
  hub/       hub link: ticket redeem, balance chip, Return to Hub, cloud save
  save/      campaign meta and local settings (game layer only)
  input/     keyboard/mouse + pointer lock and the gamepad (gamepad.js, padGameplay.js, padController.js, aimAssist.js) -> Command objects
  render/    Three.js views, viewmodel, VFX (reads state only); assets.js loads the Sproto Duel GLBs (meshopt) and stage textures;
             level/ draws campaign sections, pvp/ is the Free 1v1 lobby and arena view
  ui/        DOM HUD + menus (queues actions, never writes state)
  audio/     WebAudio synth SFX
  game/      Game: loop, hitstop, screens, lil-gui debug panel
tests/       Vitest: architecture rules, sim and determinism, campaign levels, boss and PvP goldens, goja and browser parity, hub link, assets, performance
```

`AGENTS.md` lists the pinned paths and what a change to them needs.

`PLAN.md` is the full architecture and milestone plan, with every balance number.
