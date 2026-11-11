# Sproto Shooter: gameplay improvement plan

## 1. Status

Partly implemented on branch `claude/trusting-ramanujan-63h582`. Section 1.1 says what was done, what was found already fixed and what is left to campaign plan v2 (`docs/campaign/PLAN.md`). Sections 2 to 10 are the plan as written at `d8596be`; where 1.1 and a later section disagree, 1.1 is current.

- First audit: 2026-11-09, commit `06b5c16`.
- Re-validated: 2026-11-11, commit `d8596be` (114 commits later). Every finding and plan item was re-checked against that tree and every line number below is from it.
- Re-validated again and implemented: 2026-11-11, commit `b9b4591` (`main` after #115 to #117). Line numbers below were not refreshed.
- What moved between the two commits: campaign levels L01–L05 were rebuilt on a new level format with world collision, navigation, line of sight and scripted bosses; crafting and the Magic and Crafting skills were removed; slide, grapple and sprint stamina were added; Free 1v1 gained pillars and the new movement; a default-off rewarded campaign screen was added; graphics resolution presets were added. Section 4.1 lists what that resolved.

### 1.1 Re-validated at `b9b4591` and implemented

Rule used for scope: `docs/campaign/PLAN.md` (campaign plan v2) owns campaign levels, collision, boss scripting, spell and gun numbers and the campaign content fingerprint, and about forty campaign branches are open. So nothing here changes level data, `GUN_TYPES`, `SPELLS`, `TUNING` or a paid boss fight, and every balance change is limited to the arena modes.

**Fixed on `main` since `d8596be`**

| Item | What fixed it |
|---|---|
| F2 / A2, falling forever off the L01 spawn | `src/sim/campaign/abyss.js` (#117): a death floor under every campaign level kills the player and offers the checkpoint. Enemies that fall die and count. |
| A4, shop key suggestion "N" | N twice is now the feedback window (#115), so the shop moved to O instead. |

**Done on this branch**

| Item | State | What changed |
|---|---|---|
| A1 | Done | `src/game/campaignFlow.js` decides when to send `transitionDone`; `Game.step` queues it. Section cards stay 2.5 s or until fire. Rewarded runs are left alone. |
| A3, decision 5 | Done | `startMode` removes sandbox-placed and debug-spawned gun pickups when Wave Mode, Boss Fight or a campaign level starts. The client asks for the starting loadout back on leaving the Sandbox. |
| A4 | Done | Shop on O; B is only the grapple. Weapon Box panel, resources row and craft handlers removed from the HUD. Spell slots a mode cannot open are hidden; the lock toast names the mode. |
| A5 | Partly | `floorIsLava` is 4 health/s on the ground for 20 s (was 6/s for the rest of the level). `taxSeason`, `redTape`, `confetti` and `duckHunt` are left to v2's secrets (section 7.2 there). |
| A6 | Done | Title order Wave Mode, Boss Fight, Play free, Campaign; Practice row; controls fold away. `eventCoverage.js` matches the code and a test holds its audio column to `sfx.js`. The "Find free match" note in `docs/shooter-release.md` was not re-checked (needs a hub). |
| B1 | Partly | Arena bosses drop a boss gun some of the time (Jade Dragon 25%, others 50%) at the boss table's own quality, and the Jade Dragon leaves two ordinary guns. The stat cut (Ray Gun 24 to 19, Big Bullets 340 to 240) was not made: it moves `cea1f88b`, and v2 section 7.4 already plans the gun-definition change (finite reserve for boss guns) that addresses the same thing. |
| B2 | Done | `tierWave` in `src/data/waves.js`: more elites and a higher alive cap by tier; enemy health 1.18 per tier in Wave Mode and Boss Fight, damage still 1.15. Tier 1 is unchanged. Campaign and sandbox enemies keep 1.15. |
| B3 | Done, arena only | Second Wind is 10, 7, 4, 3 s within one wave or Boss Fight; summoned enemies do not revive. The campaign keeps the flat timer, because the change would alter paid boss fights. |
| B4 | Option 1, without the number changes | Each cleared wave teaches the next spell (two at tier 1, all four from tier 2). Mana regeneration and Goo Bolt damage are untouched: both are in the fingerprint and v2 section 6.2 reworks spell numbers. |
| B5 | Done, Wave Mode only | Skill levels cost 1.75× per level in Wave Mode (plan said 1.6; the bots still reached level 10 by tier 4). A global change moved the boss goldens, so other modes keep 1.45. |
| C1 | Done except the alarm marker | Banners, toasts and sounds for section cards, checkpoints, lockdowns, rewinds, alarms, secrets, world guns; time against par, kills and damage on the level end screen. No HUD marker toward an alarm (the event carries no position) and no looping klaxon. |
| C2 | Done | Skills, carried guns and best tier are kept under their own `localStorage` key and applied by a new `loadLoadout` action that only works in Wave Mode (`src/save/loadout.js`, `tests/save-loadout.test.js`). |
| C3 | Done | Damage direction arc; gun card docked to the right edge. |
| C5 | Done | One-line tips on a first Wave Mode run. |
| D1 | Done | From tier 4, Laser Bots and a Shooter Bot in waves 2 and 3 and a rotating wave-2 boss; from tier 7 the Sproto Beast joins the final pair. |
| D3 | Practice bot only | `practiceBotWish` strafes, jumps, dashes, slides, grapples, swaps guns and misses some shots. `practiceWish` is unchanged (the network tests measure against it). Best of three was not built: it changes `src/sim/pvp/sim.js`, the protocol and the PvP pins. |

**Left to campaign plan v2**: B6 (telegraphs for Broccoli Head, Glowie and Tinubu), D2 (real-health clear tests, L06 to L10 rebuilds), F3, F4, the rest of A5, B1's stat change, B4's spell numbers, and the campaign side of B3.

**Skipped**: C4 music (needs tracks the owner supplies or approves). H1 to H5 (hub side or owner decisions; rewards stay off).

**Pins**: only the Wave Mode baseline moved. `tests/fixtures/baseline-hashes.json` and `tests/performance-baseline.test.js`, ticks 3000 and 6000 of seeds 11, 12 and 13: `988ba524` to `7464bac2`, `9329eb5a` to `cbe61fc3`, `39d1b1ef` to `3965d05e`, `202a18f5` to `3af76c81`, `54d3c408` to `621c6d4a`, `680a0543` to `61b202e0`. Tick 600 and the Sandbox hashes are unchanged. Campaign fingerprint `cea1f88b`, the boss goldens, the replay corpus and all PvP pins are unchanged.

**Bot numbers** (rebuilt harness; it is a little weaker than the first audit's, so compare columns, not documents):

| Measure | `b9b4591` | This branch |
|---|---|---|
| Looting bot, single tier 1, 20 seeds: wins / mean win time | 19 of 20 / 285 s | 13 of 20 / 383 s (14 of 20 / 357 s if it also casts) |
| Same, tier 3 from a fresh start | 18 of 20 / 315 s | 15 of 20 / 491 s (10 of 20 casting; the two runs differ only by RNG, so read this as 10 to 15) |
| Single tier-1 runs where a boss gun is the top gun | 20 of 20 | 10 of 20 |
| Ladder, first-try wins at tiers 1 / 3 / 6 / 10 (3 seeds before, 5 after) | 2 of 3 / 3 of 3 / 3 of 3 / 3 of 3 | 4 of 5 / 4 of 5 / 4 of 5 / 1 of 5 (casting bot: 3, 5, 4, 1 of 5) |
| Ladder tier clears where a boss gun is the top gun | 30 of 30 | 44 of 46 |
| Mean time per cleared tier at tier 10 | 247 s | 262 to 297 s |
| Tier at which Health reaches level 10 | 2 to 3 | 5 to 7 |
| Goo Bolt on cooldown: wave 1 clear | 73.1 s without, 67.1 s with | Same (numbers untouched) |

What the numbers say: the ladder now climbs and has a wall around tier 7 to 10; a fresh tier 1 is harder for a bot that never dodges, because it used to lean on a boss gun from the first boss; inside a ladder a boss gun, once found, is still the best gun for the rest of the run. That last point needs the gun-definition change in v2.

## 2. How this was audited and how far to trust it

Three kinds of evidence are used. Each finding says which one it rests on and on which commit.

| Label | Meaning |
|---|---|
| Observed | Seen in the real client (`Game.step`, HUD, renderer) in headless Chromium. All browser observations are from `06b5c16`; the browser was not re-run on `d8596be`. |
| Measured | Numbers from bots driving the pure sim in Node. Re-run on `d8596be` unless marked otherwise. |
| Read | Taken from the code or docs without running it, on `d8596be`. |

Limits that apply to everything here:

- The browser ran on software rendering (SwiftShader) at about 0.5 frames per second. Frame rate, input latency, mouse feel, recoil feel, the feel of the new slide and grapple, and audio by ear are **unverified**.
- Bot numbers are not human play. The bots track targets perfectly, never use cover, never slide or grapple, and dodge only on fixed timers. They are useful for comparing before and after, not for saying how hard the game feels.
- The bots cannot navigate the rebuilt L01–L05 (see F3), so there are no clear times for those levels.
- No controller, no hub session, no online match and no human playtest were used. `npm test` was not run.

The scripts were throwaway and are not in the repo. Enough detail follows to rebuild them.

### 2.1 Browser harness (Observed, `06b5c16`)

- `npx vite --port 5301 --strictPort`, Playwright Chromium with the GL flags in `tests/fixtures/e2e-nakama.mjs`, viewport 1280×720, device scale factor 1.
- The game exposes itself as `window.__game`. The harness replaced `game.frame` with a no-op to stop the animation-frame loop, then called `game.step(t)` itself with `t` advancing 1000/60 ms per call, so each call runs one sim tick. `game.renderer.render` was stubbed while fast-forwarding and restored for the screenshotted frame.
- Input came through `game.onSimCommand(cmd, state)`, a hook that can rewrite the command just before `simulate`.
- What was watched: the title screen, the first 20 s of Wave Mode, and the old L01 from spawn to the first section exit plus 10 s.

### 2.2 Sim harnesses (Measured)

All import `createGameState`, `run` and `cmd` from `tests/helpers.js` and run under Node 22. None use god mode or changed enemy health.

| Harness | Setup | Bot | Runs on `d8596be` |
|---|---|---|---|
| Campaign | `startMode` campaign, each of L01–L10 | The `aim` function from `tests/levels/campaign.test.js` (it sends `transitionDone`), changed to hold 7–12 m from the nearest enemy, flip strafe every 1.5 s, and fire only the starter Machine Gun | Seed 1, 12-minute cap. Seeds 2–3 exist only for `06b5c16` |
| Verified boss | `buildIssuedState({ canonicalBoss, seed, sectionId })` from `src/server/runContract.js` | Same as above | 5 bosses × seeds 1–3 |
| Wave Mode | `startMode` waves at tier 1 and 3 | Aims at the body centre of the nearest live enemy, corrects for recoil, holds fire, backs off under 9 m, closes over 22 m, turns inward past 36 m from centre, flips strafe every 3 s, dashes when a boss is within 12 m, uses a medkit under 50% health, skips intermissions. Three variants: starter gun only; "looting" (picks up a gun when a slot is free or its `dpsOf` is 10% higher, always fires the highest-`dpsOf` gun that has ammo); looting after a sandbox start, so the Duck Gun is on the floor | 3 variants × 2 tiers × seeds 1–5 |
| Tier ladder | One state, tiers 1 to 10 in order, keeping guns and skills; a lost tier is retried | The looting bot. It never shops or casts | Seeds 1–3 |
| Boss Fight | `startMode` boss, each of the seven arena bosses at tier 1 and 5 | Machine Gun body shots only, backs off under 14 m, dashes under 9 m | Seed 3 |
| Fall probe | Campaign L01, L02, L04 | Sprint in a straight line in each of eight compass directions for 60–90 s | One each |
| Wall probe | Campaign L01–L06, L08 | Cast `firstSolid` in 16 directions from spawn, sprint at the nearest hit for 12 s | One each |
| Transition probe | Campaign L01 | Clear the first section, walk into the exit, never send `transitionDone`, 90 s | One |

## 3. What already works and should be kept

| Area | Evidence |
|---|---|
| Movement kit | Walk 6.5 m/s, sprint 9.5 on a stamina bar, double jump, dash with 0.12 s of invulnerability, 0.1 s coyote time and jump buffer, plus the new slide, slide-hop and 30 m grapple (`src/data/tuning.js`). Read; feel unverified. |
| Hit feedback in the arena | Hit markers, merged pellet numbers, "BONK!" weak-spot text, reload timer (Observed, `06b5c16`). Hitstop of 45–200 ms on big hits (`src/game/feel.js`). Read. |
| Arena bosses | Telegraphs of 0.5–0.9 s, a 2 s stun after a missed charge, three phases each. With Machine Gun body shots only, tier-1 fights lasted 47–90 s and six of seven were won. Measured. |
| Loot matters | At tier 1 the starter-only bot won 1 of 5 runs; the looting bot won 5 of 5 in a mean 288 s with no downs. Measured. |
| Campaign engine | Solids, terrain, navigation, line of sight, lockdown encounters, scripted boss parts and death rewind now exist (`src/sim/campaign/`), with a test file per system. Read. Walls stopped the bot in L03 and L05 (moved 2.5 m and 2.0 m in 12 s). Measured. |
| Checkpoints | L01 has them in every section but one (`src/data/levels/L01/index.js`). Read. |
| Downed state | The HUD shows "DOWNED! Get a kill for a Second Wind" with a countdown. Read. |
| Pins and docs agree | `AGENTS.md` now matches the tree (see section 5). Read. |

## 4. Findings

Severity: High = blocks or breaks a mode; Med = clearly hurts play; Low = polish.

### 4.1 Resolved since the first audit

| First-audit finding | What changed | Commit |
|---|---|---|
| Campaign has no world collision (L01–L05 part) | Solids, terrain and hitscan blocking exist for the new-format levels. L06–L10 are still without (F2). | `72c0abc` and later |
| Campaign content is a greybox (L01–L05 part) | Five levels rebuilt with multi-section layouts, lockdowns, alarms and par times of 18–20 minutes. | `ef14120`, `bca4117`, `82d5ab5`, `fc127ef`, `94216aa` |
| Sahil and the Obama duo have no telegraphed fight | Both run from part scripts (`src/sim/campaign/bossScript.js`, `duo.js`). | `ce6f5f2`, `aaa92ec` |
| Campaign enemy re-skins behave like Midgets | They have their own behaviour (`src/sim/campaign/archetypes.js`). | `74aac64` |
| Laser Bot and Shooter Bot are unused | They appear in the L01–L05 encounter data. Still not in Wave Mode (F14). | Level commits above |
| Perk banners show stale keys ("Goo Bolt [Q]") | Those perks were deleted with the Magic and Crafting skills. | `ae2efd6` |
| Free 1v1 has no cover | Four pillars (`src/sim/pvp/arena.js`). | `96c5764` |
| `AGENTS.md` lists stale PvP pins | Corrected, and corrected again after the PvP movement change. | `a688d8f`, `96c5764` |
| No client button for verified boss runs | A "Rewarded campaign" screen exists behind a build flag that is off by default (section 7). | `3e1d818` |

### 4.2 Open findings

**F1. Campaign cannot advance past the first section (High; Observed on `06b5c16`, Measured and Read on `d8596be`).**
Entering a cleared section's exit sets `lv.transition` (`src/sim/campaign/v2.js:558` for new-format levels, `src/sim/campaign/campaign.js:225` for the rest). Only the `transitionDone` action moves `lv.section` on (`campaign.js:71`). No file under `src/game`, `src/ui` or `src/hub` sends it; the only senders are tests and the server protocol decoder. On `d8596be` the probe cleared L01's first section and sat in the exit for 90 s with `section: S1`. A level is won only when every section's encounters are cleared, and later levels unlock only on a win (`src/game/Game.js:685`), so the five rebuilt levels cannot be played past their first section in the shipped client. Every test bot sends the action itself, so the suite does not catch it.

**F2. Walking off the L01 spawn drops the player forever (High; Measured).**
From the L01 start at (8, 0, 10), sprinting in seven of eight compass directions leaves solid ground within 2–5 s. The player then falls without limit (y below −35,000 after 60 s), is never killed, and the level is never lost. L01 declares no void volumes, and the void rescue added in `1eb8a99` only acts inside declared volumes. In L02 and L04 the same probe ended in death and a lost level, which is recoverable. L06–L10 are still on the old format with no collision at all: `useSolids` is false and the bot ran 330 m in a straight line.

**F3. Nothing shows the rebuilt levels can be beaten at real health (High; Read and Measured).**
The clear tests for L01, L02 and the all-level autopilot run in god mode with enemy health at 8% (`tests/levels/l01.test.js:113-114`, `tests/campaign-l02.test.js:124-125`, `tests/levels/campaign.test.js:107-108`). The audit bot, which does not path-find, cleared 2–5 encounters per level in 12 simulated minutes and finished none of L01–L05; in L04 it was killed in 44 s after taking 232 damage. That is a bot limit, not proof of a difficulty spike, but there is no other evidence either way. L06–L10 are unchanged corridors: the bot cleared them in 55–484 s against par times of 16–30 minutes (seed 1).

**F4. Three paid bosses still have no telegraphs (High for the Ticket loop; Read and Measured).**
Broccoli Head (L06), Glowie (L08) and Tinubu (L10) still run `tickDuelBoss` (`campaign.js:418`): walk at the player, pick a random attack every 1.6 s. "slam" hits instantly within 4.5 m (`campaign.js:480`); "flash" hits at any range and cannot be avoided (`campaign.js:484`). Boss-section runs with the starter gun:

| Boss | Level | Health | Fight (s) | Damage taken | Result |
|---|---|---|---|---|---|
| Sahil (scripted, five parts) | L02 | 900 | 150–214 | 122–198 | 3 of 3 cleared |
| Obama duo (scripted) | L04 | 578 + 684 | 62–82 | 136–148 | 0 of 3: two deaths, one run never engaged |
| Broccoli Head | L06 | 2,212 | 47–54 | 28–109 | 3 of 3 |
| Glowie | L08 | 2,766 | 49 | 115–149 | 3 of 3 |
| Tinubu | L10 | 5,629 | 137–158 | 207–278 | 3 of 3 |

The Obama duo result is a bot that cannot fight a flying pair; whether a human with the starter gun can win it is unverified and worth a playtest, because it is a paid fight.

**F5. The sandbox Duck Gun leaks into Wave Mode and campaign (Med; Observed on `06b5c16`, Read on `d8596be`).**
The Duck Gun is meant to sit in the sandbox (`src/data/guns.js:30`). The defect is the leak: the title screen starts a sandbox behind the menu (`Game.js:104`), `placeSandboxLegendary` drops the gun with an infinite lifetime (`src/sim/actions.js:115`), and `startMode` keeps every gun pickup when the mode changes (`actions.js:53`). In the browser the gun lay 3.8 m from the Wave Mode spawn with a card reading DPS 509 against the starter's 86. In bot runs it did not shorten a tier (338 s against 288 s at tier 1; the bot aims lobbed shots badly), so the effect on a human is unverified.

**F6. Boss guns end the loot game after the first boss (Med; Measured).**
Every boss kill drops a Ray Gun or Big Bullets (`src/sim/drops.js:21`), at Epic or Legendary, with endless spare ammo. Base `dpsOf`: Machine Gun 90, Shotgun 86, Sniper 68, Ray Gun 168, Big Bullets 506 including splash (`src/data/guns.js:12-28`). In all 30 tier clears of the ladder runs the highest-DPS gun carried was a boss gun.

**F7. The tier ladder does not get harder (Med; Measured).**
Enemy health and damage scale by 1.15 per tier (`src/data/waves.js:43`); gun damage by 1.13 per gun level (`src/sim/guns.js:10`). Wave composition is identical at every tier. The looting bot won 30 of 31 tier attempts across three ladders (one loss at tier 8, won on retry) with seven downs in total; tier times stayed between 240 and 327 s from tier 1 to tier 10.

**F8. Skills cap early and nothing persists (Med; Measured and Read).**
There are now two skills. Health reached level 10 by tier 3 and Gunslinger by tier 4 in every ladder. The save file keeps campaign unlocks, found modifiers and settings, now including the graphics preset (`src/save/profile.js`); guns, skills and Run Cash are gone on reload.

**F9. Spells are stranded in Wave Mode (Med; Read).**
With the Magic skill removed, spells are unlocked only by campaign pickups (`src/sim/spellbook.js`, `campaign.js:308`). Outside the campaign only Goo Bolt is ever available, so the HUD shows four spell slots that can never open, and pressing one shows "Locked: Magic Lv ?" (`src/ui/ui.js:173`). Goo Bolt still deals 25 for 15 mana at 5 mana/s, about 8 damage per second against the Machine Gun's 90.

**F10. Second Wind has no limit (Low; Measured).**
Any kill revives a downed player at 30% health with a full shield (`src/sim/combat.js:182`, `tuning.js:28`), including kills of fodder a boss summons. One tier-5 Boss Fight was won after 11 downs.

**F11. Campaign events have no feedback (Med; Read).**
`src/game/eventCoverage.js` lists audio and UI listeners for `levelCard`, `checkpoint`, `secret`, `modifier`, `worldGun`, `door`, `lockdown`, `lockdownReset`, `alarm` and `sectionExit`. `src/ui/ui.js` and `src/audio/sfx.js` handle none of them. A lockdown sealing the room, an alarm ringing and a death rewind are silent and unannounced apart from the objective line.

**F12. No music (Med; Read).**
All sound is synthesized tones. The pause menu has a Music slider (`Game.js:446`) that controls nothing.

**F13. Secrets that punish or do nothing (Med; Measured on `06b5c16`, Read on `d8596be`).**
`floorIsLava` still deals 6 health/s for the rest of the level (`campaign.js:384`); it is still the L03 secret. `taxSeason` and `redTape` still only slow the player (`campaign.js:354`). `confetti` and `duckHunt` are still read by no code.

**F14. Arena content is unused by Wave Mode (Med; Read).**
Wave Mode still uses four enemy types and four bosses (`src/data/waves.js`, unchanged). Laser Bot, Shooter Bot, Sproto Beast, Car Part Monster and Mole Monster never appear in it.

**F15. Free 1v1 is still one knockout against a walking target (Low; Read).**
A match is one knockout or a 90 s timer (`src/sim/pvp/rules.js:16`). The practice opponent is unchanged: it walks straight at the player, fires on a fixed rhythm and never strafes, jumps, dashes, slides or grapples (`src/sim/pvp/practice.js`), so it does not exercise the movement both seats now have.

**F16. The B key does two things (Med; Read; new).**
B is bound to grapple (`src/input/input.js:16`). The HUD also listens for B: it opens the shop between waves, and during a wave it shows the toast "Shop opens between waves" (`ui.js:256-258`). Every grapple in Wave Mode therefore raises an error toast, and a grapple during an intermission opens the shop.

**F17. Small clarity problems (Low; Observed on `06b5c16`, Read on `d8596be`).**
- The title screen gives Sandbox and Test Range the same weight as Wave Mode (`Game.js:271-272`); the controls list ran off the bottom at 720p.
- The gun comparison card overlapped the "WAVE 1" banner.
- Incoming damage flashes a vignette but shows no direction (`ui.js:185`).
- Crafting is gone from the sim, but the HUD still carries the Weapon Box panel, the resources row and the craft key handlers (`ui.js:21,30,223,255`).

## 5. The plan

Effort: S = under a day, M = a few days, L = a week or more. Proposed numbers are starting points to tune with the bots in section 9; none has been tested.

### Pinned content and the re-pin procedure

Values computed from the tree at `d8596be`. `AGENTS.md` and the tests agree with all of them; there is no mismatch.

| Pin | Value | What changes it |
|---|---|---|
| Campaign content fingerprint | `cea1f88b` (was `3c657fb5` at the first audit) | `contentBody` in `src/data/serverManifest.js`: the paid boss encounters, `GUN_TYPES`, quality, manufacturer and part modifiers, element procs, `SPELLS`, `TUNING`. Waves, drop tables, shop and skills are not in it. |
| Boss goldens and replay corpus | `tests/fixtures/boss-goldens.json`, `tests/fixtures/replay-corpus/` | Any change to how a paid boss fight simulates. |
| Wave and Sandbox baseline hashes | `tests/fixtures/baseline-hashes.json` | Any change to how the arena simulates at tier 1. |
| PvP content fingerprint | `b33eada6` (was `17d87c54`) | `contentBody` in `src/sim/pvp/rules.js`. |
| PvP golden state hash | `532a562e` (was `6545ca0a`); director golden `55419e4e` | Any change to `src/sim/pvp/` behavior. |

"Re-pin procedure" below means:

1. Run `npm test` and update only the pins that changed on purpose: the literals in `tests/pvp-sim.test.js:22-24,70,164`, `tests/pvp-director.test.js:68`, `tests/pvp-sim-split.test.js:68`, `tests/pvp-lagcomp.test.js:829`, `AGENTS.md` and the contract docs; the boss goldens and replay corpus; the baseline hashes and the table in `docs/shooter-baseline.md`.
2. Run `npm run build:server-sim` to confirm both bundles build.
3. Name every changed pin in the pull request.
4. After the merge, in metaverse-hub: rebuild on the merged commit, copy the bundle and pin into `server/modules/vendor/`, and run `node scripts/check-shooter-sim-version.mjs`.

Step 4 is needed after every merge to `main` here, pinned or not, because the bundles bake in the commit.

### Phase A: fix what is broken

**A1. Advance campaign sections in the client** (fixes F1)

- Goal: a player can finish a level.
- Change: nothing sends `transitionDone` → `Game.step` queues it.
- Steps: (1) Add a pure helper, `src/game/campaignFlow.js`, that takes `state.level` and the time since a flag was raised and says whether to send the action. (2) Call it after the tick loop in `Game.step` (near `Game.js:684`): send at once for `lv.transition`; for `lv.intro`, send 2.5 s after it is set or on the next fire press. (3) In rewarded runs the action must go through the canonical command recorder like any other input; the protocol already encodes it (`src/server/protocol.js:148`).
- Tests: unit test for the helper; a case in `tests/levels/l01.test.js` whose bot does not send the action and goes through the helper.
- Acceptance: in a browser, L01 ends on "AUDIT PASSED" and L02 is unlocked in the saved profile.
- Effort S. Risk: low. Pins: none.

**A2. Catch every fall** (fixes F2)

- Goal: no position in any level leaves the player falling forever.
- Change: void rescue only inside declared volumes → a level-wide floor. When the player's y drops below the level's `bounds.min[1]`, treat it as a void: return to the last safe ground with the same penalty a declared void applies.
- Steps: extend `tickVoid` in `src/sim/campaign/sectionMotion.js`; add outer walls or void volumes around the L01 spawn in `src/data/levels/L01/index.js`.
- Tests: `tests/void-rescue.test.js` gains the eight-direction sprint from the L01 spawn; expect the player above the floor or rescued after 10 s.
- Acceptance: the fall probe ends with the player on ground, dead, or rescued in every direction on L01–L05.
- Effort S–M. Pins: sim change. The L01 section start must not move (it is not a paid encounter, so the fingerprint is safe); re-record goldens only if a paid boss section is touched.

**A3. Stop the sandbox Duck Gun leaking** (fixes F5)

- Goal: the Duck Gun stays a sandbox toy.
- Change: sandbox-placed pickups survive a mode change → they are removed when any other mode starts.
- Steps: the game layer listens for `modeStart` on the bus and, when the mode is not sandbox, removes pickups whose `gun.source === 'sandbox'`. A filter inside `Game.start` is too early when the page opens with `?mode=waves`, because both mode changes are queued in one command.
- Alternative: filter in `startMode` (`actions.js:53`). That is a change under `src/sim`; it is cleaner and can ride with the next sim batch. A fix in `Game.js` is not a sim change.
- Tests: `tests/duckGun.test.js`: sandbox, then waves, expect no Duck Gun pickup.
- Acceptance: no gun on the floor at the start of Wave Mode, Boss Fight or campaign; the sandbox still has one. Rewarded runs are unaffected either way, because they build a fresh state.
- Effort S. Pins: none for the game-layer fix.

**A4. Fix the B key and the stranded spell slots** (fixes F16, part of F9 and F17)

- Change: move the shop to another key (suggested: N, which is unbound) or make B open the shop only while no grapple target is in range; drop the "Shop opens between waves" toast. Hide spell slots that the current mode can never unlock, and replace "Locked: Magic Lv ?" with a mode-appropriate line. Remove the Weapon Box panel, the resources row and the craft handlers from `ui.js`.
- Tests: `tests/keyboard.test.js`, `tests/presentation.test.js`.
- Effort S. Pins: none.

**A5. Fix punishing and dead secrets** (fixes F13)

- Change: `floorIsLava` 6 health/s forever → 4 health/s only while on the ground, ending 20 s after pickup. `taxSeason` and `redTape` gain an upside (suggested: double Run Cash drops). `confetti` and `duckHunt` get an effect or are replaced.
- Steps: edit `grantModifier` and `applyModifiers` (`campaign.js:356,381`).
- Tests: the secret case in `tests/levels/campaign.test.js`: stand still for 60 s after `floorIsLava` and survive.
- Effort S. Pins: sim change only; modifiers are not in the fingerprint.

**A6. Title menu and documentation**

- Order the title buttons Wave Mode, Boss Fight, Play free, Campaign, with Sandbox and Test Range in a smaller "Practice" row; put the controls list behind a toggle.
- Make `eventCoverage.js` match reality until C1 lands. Confirm whether the "Find free match does not join" gap in `docs/shooter-release.md:61` still holds (unverified); line 63 ("no campaign button") is out of date.
- Effort S. Pins: none.

### Phase B: rebalance

**B1. Make boss guns one option among several** (fixes F6)

- Change, drop rate: `bossGun` chance 1.0 for every boss → Jade Dragon 0.25, Blue Monster 0.5, Mega Tinubu and Hex Sahil 0.5 each (`src/data/drops.js`); quality shift +1 → 0 (`src/sim/drops.js:68`).
- Change, stats (`src/data/guns.js:24,28`): Ray Gun damage 24 → 19; Big Bullets damage 340 → 240 and splash 120 → 90.
- Tests: `tests/bossGuns.test.js`.
- Acceptance: in the ladder harness a boss gun is the top-DPS gun in at most half of tier clears (today 30 of 30).
- Effort M with tuning. Risk: Boss Fight mode gets slower; re-measure it. Pins: gun stats change the campaign fingerprint `cea1f88b`; drops change the baseline hashes. Re-pin procedure.

**B2. Make the tier ladder climb** (fixes F7)

- Change: every tier uses the same groups → composition scales. Suggested: elites per group + floor((tier − 1) / 2); `maxAlive` + 2 × floor((tier − 1) / 3); enemy health base 1.15 → 1.18 per tier while damage stays 1.15.
- Steps: add a `tierWave(cfg, tier)` helper in `src/data/waves.js`; use it in `initWave` and `waveDirector` (`src/sim/waves.js`) and in the HUD's "Enemies left" count.
- Tests: `tests/fullrun.test.js` at tiers 1, 5 and 10; `tests/local-gameplay.test.js`.
- Acceptance: looting-bot ladder wins at least 4 of 5 at tiers 1–3, 2–4 of 5 at tier 6, at most 1 of 5 at tier 10; mean tier time rises from about 265 s to 300–400 s by tier 10.
- Effort M. Dependencies: B1. Pins: waves are not in the fingerprint; tier 1 is unchanged by construction, so baseline hashes should hold. Verify.

**B3. Second Wind decays** (fixes F10)

- Change: 10 s every time, any kill → 10, 7, 4, then 3 s for later downs within one wave or boss fight; kills of summoned enemies do not revive; the count resets on wave clear, encounter clear and mode start.
- Steps: add `downCount` to the player in `createPlayer`; use it in `startDowned` (`combat.js:263`) and the revive loop (`combat.js:182`); add `secondWindStep: 3` and `secondWindMin: 3` to `TUNING`.
- Tests: `tests/units.test.js`.
- Acceptance: the tier-5 Blue Monster run that survived 11 downs now ends in defeat.
- Effort S. Pins: `TUNING` and player state change, so the campaign fingerprint, boss goldens, replay corpus and baseline hashes all move. Batch with B1.

**B4. Decide what spells are outside the campaign** (fixes F9)

- Option 1: Wave Mode unlocks one spell per cleared wave (Chain Zap after wave 1, Sproto Swarm after wave 2, the rest from tier 2 on), through `grantSpell`.
- Option 2: Wave Mode is guns only and the spell bar is hidden there.
- With either: mana regeneration 5 → 8 per second, Goo Bolt 25 → 45 (`src/data/skills.js`, `tuning.js`).
- Acceptance (option 1): a bot that casts Goo Bolt on cooldown while firing clears wave 1 at least 10% faster than the gun-only bot.
- Effort S–M. Pins: `SPELLS` and `TUNING` are in the campaign fingerprint, and the rebuilt levels are tuned around them; coordinate with the campaign work. Batch with B1 and B3.

**B5. Slow skill levelling once it persists** (fixes part of F8)

- Change: `xpGrowth` 1.45 → 1.6 for Health and Gunslinger (`src/data/skills.js:3-4`). Total XP to level 10 goes from 6,074 to 11,287 for Health and from 7,289 to 13,545 for Gunslinger.
- Acceptance: the looting bot reaches level 10 around tier 7–8 instead of tier 3–4.
- Effort S. Dependencies: only if C2 ships. Pins: baseline hashes change.

**B6. Telegraph the three unscripted paid bosses** (fixes F4)

- Preferred: move Broccoli Head, Glowie and Tinubu onto the part-script system Sahil and the duo already use, as their levels are rebuilt.
- Stopgap if L06, L08 and L10 are far off: give `tickDuelBoss` a wind-up state. Slam: 0.7 s wind-up with a ground ring. Flash: 0.8 s wind-up, damage only if the player is facing the boss. Fly: hover 4 s, then land. Attack interval 1.6 s → 1.6, 1.3, 1.0 by phase.
- Tests: `tests/run-validation.test.js`, `tests/goja-goldens.test.js`, `tests/server-sim.test.js`, the replay corpus.
- Acceptance: a bot that dashes on `bossTelegraph` takes at most half the damage of one that does not.
- Effort M (stopgap) or part of each level rebuild. Pins: boss goldens and replay corpus are re-recorded. Re-pin procedure.

### Phase C: feedback, persistence and reasons to replay

**C1. Campaign feedback layer** (fixes F11)

| Event | UI | Audio |
|---|---|---|
| `levelCard` | Full-width card with title and lines, 2.5 s | Low sting |
| `checkpoint` | Toast "Checkpoint" | Chime |
| `lockdown`, `lockdownReset` | Banner "LOCKDOWN" / "Rewound to checkpoint" | Door slam; rewind sweep |
| `alarm` | Banner "ALARM" and a HUD marker toward the source | Looping klaxon while it rings |
| `secret`, `modifier` | Banner with the modifier's name and effect | Rising tone |
| `worldGun` | Feed line "Picked up Shotgun" | Existing pickup tone |
| `door`, `switch`, `jumpPad`, `portal`, `barrel`, `sectionExit` | None | One short sound each |
| Level clear and loss | Time against par, kills, damage taken | Existing stings |

- Steps: handlers in `ui.js` beside the existing `bus.on` block using `banner`, `toast` and `feed`; entries in the `SFX` table in `sfx.js`.
- Tests: `tests/presentation.test.js`; the coverage test that reads `eventCoverage.js`.
- Effort M. Dependencies: A1. Pins: none.

**C2. Keep skills and a gun stash between sessions** (fixes part of F8)

- Change: nothing saved → skills, up to eight stashed guns and best tier are saved locally.
- Steps: (1) Store them under a new `localStorage` key, not in the campaign profile, because `saveProfile` whitelists fields and the hub save strips keys such as `guns` (`ECONOMIC_KEY` in `src/hub/link.js`). (2) Save a gun as the arguments `regenerate` needs. (3) Apply the save through a new sim action at start-up so the sim stays the only writer. (4) Leave `buildIssuedState` untouched: rewarded runs must keep the canonical starter loadout.
- Tests: new `tests/save-loadout.test.js`; `tests/run-validation.test.js` must still reject a non-canonical loadout.
- Effort M. Risk: needs B2, or carried loot makes the ladder trivial. Pins: the new action is a sim change; no fingerprint moves.

**C3. Damage direction and loot card placement** (fixes part of F17)

- Add an arc at the screen angle `ev.dir − yaw` in the `playerDamaged` handler (`ui.js:185`). Hide `#lootcard` while a wave banner shows, or dock it to the right edge (`src/styles/game.css:109`).
- Effort S. Pins: none.

**C4. Music** (fixes F12)

- Add `src/audio/music.js` with loops for title, combat, boss and campaign exploration on the existing music volume, cross-faded on `waveStart`, `bossSpawn`, `lockdown`, `waveCleared`, `victory` and `defeat`.
- Tests: `npm run assets:check` and `npm run budgets` must pass with the new files.
- Effort M. Dependencies: the owner supplies or approves the tracks. Pins: none.

**C5. First-run guidance in Wave Mode**

- L01 now teaches slide, grapple and stamina (`23aad23`), but a player who starts with Wave Mode gets none of it. On the first Wave Mode run, show one-line tips when they apply: movement and fire at "Get ready"; slide and grapple keys at the first sprint; weak spots on the first BONK; the shop at the first intermission.
- Effort S. Pins: none.

### Phase D: larger content

**D1. Use the finished enemies and bosses in Wave Mode** (fixes F14)

- Change: tiers 1–3 keep today's waves. From tier 4, Laser Bots replace half the Bitcoin Obamas in waves 2–3 and a Shooter Bot replaces one Big Bitcoin Obama. The wave-2 boss rotates by tier between Blue Monster, Car Part Monster and Mole Monster; Sproto Beast joins the final wave from tier 7.
- Steps: extend the B2 helper; confirm `levelAssets()` in `src/data/stages.js` loads the extra models.
- Tests: `tests/fullrun.test.js`, `tests/loading.test.js`, `tests/asset-manifest.test.js`.
- Effort M. Dependencies: B2. Pins: tier-1 baseline unchanged by construction.

**D2. Prove and finish the campaign** (fixes F3 and the rest of F2)

- A real-health clear test per rebuilt level: a path-following bot (the level tests already have one) with god mode off and enemy health at 100%, asserting a win and recording time, deaths and damage. Until one passes, treat each level's difficulty as unknown. M per level.
- Rebuild L06–L10 on the new format, following `docs/campaign/PLAN.md`. L each; this is the owner's existing plan, listed here only because F2, F3 and F4 depend on it.
- Pins: each rebuilt level with a paid boss changes the campaign fingerprint and the replay corpus. Re-pin procedure, once per level.

**D3. Free 1v1 depth** (fixes F15)

- Practice opponent that strafes, dashes, slides and swaps guns (`src/sim/pvp/practice.js`; it is not part of the PvP bundle, but the directory is pinned, so rebuild and confirm). S.
- Best of three rounds: changes `src/sim/pvp/sim.js` and the protocol. PvP fingerprint `b33eada6` and golden `532a562e` change; re-pin procedure plus the PvP bundle on the hub. L.

## 6. Suggested order and PR batching

Every merge to `main` needs a hub re-vendor, so batch by merge, not by item. The campaign work is already merging often; fold these into that cadence where they touch the same files.

| PR | Items | Pins that move |
|---|---|---|
| 1 | A1, A3 (game-layer fix), A4, A6, C3, C5 | None |
| 2 | A2, A5 | None expected; verify goldens |
| 3 | B1, B3, B4 | Campaign fingerprint, boss goldens, replay corpus, baseline hashes |
| 4 | B2, D1 | None expected; verify the baseline |
| 5 | C1, C4 | None |
| 6 | C2, B5 | Baseline hashes |
| With each level rebuild | B6, D2 | Campaign fingerprint, replay corpus |
| Later | D3 | PvP pins |

PR 3 is the only planned balance change to `cea1f88b`; keep all gun, spell and tuning edits inside it, and schedule it between level rebuilds so the replay corpus is re-recorded once.

## 7. Hub integration items

| Fact | State at `d8596be` |
|---|---|
| 20 Tickets per verified boss, once per boss per UTC day, five bosses; caps of 200 per session and 1,000 per game per day | Unchanged (`docs/shooter-server-contract.md`); the reward screen states these rules before a run starts (`docs/shooter-reward-ui.md`). |
| Client button for verified runs | Built, off by default. The title shows "Rewarded campaign" only when the build sets `VITE_SHOOTER_REWARDED=true` (`src/hub/campaignRewards/session.js`, `Game.js:278`). No deployment sets it. |
| Evidence the reward flow works end to end | Not yet. `docs/shooter-reward-ui.md` says the service responses in its tests are mocked and that a run through the real hub is still to come. |
| Reload during a rewarded run | Pending input is held in memory only; the doc lists this as a known limit. A reload can lose a reward in progress. |
| 1v1 wagers | Still flagged off (`docs/shooter-release.md`). |
| Dragon Scale Relic gives no benefit; leaderboard not shown in the plaza; 10 Tickets = 1 Verse; 50 Verse per game per day; Verse buys nothing | Hub side; not checkable here. |

Items:

- **H1. Turn the reward screen on.** Blocked by A1 only if a rewarded run can cross a section boundary; a run starts in the boss section, so it probably cannot, but confirm for the L04 boss section. Blocked in practice by the real-hub run the reward doc calls for. Before enabling, playtest all five fights with the starter gun: the Obama duo beat the audit bot every time (F4), and three fights have no telegraphs (B6).
- **H2. Survive a reload.** Persist the pending run key so the status screen can at least report the outcome after a reload. Hub contract question; out of scope for this repo alone.
- **H3. Leaderboard.** Show the player's verified boss times on the reward screen if the hub exposes them (unverified).
- **H4. Relic benefit.** Owner decision. A cosmetic or a perk limited to unrewarded modes is safe; nothing may alter rewarded runs or 1v1.
- **H5. Wagers.** Keep both flags off until D3 and until "Find free match" is confirmed to join a match.

## 8. Decisions for the owner

1. **Campaign order of work.** The decision to build the campaign has been made and five levels are in. The open choice is what comes first now.
   - Option A: make what exists playable before building more: A1, A2, C1 and a real-health clear test for L01 (D2). About one to two weeks.
   - Option B: continue to L06–L10 first.
   - Recommendation: A. Today no player can get past the first section of any level, and the first level drops them into an endless fall, so nothing built so far can be judged by playing it.
2. **Wave Mode investment.** B1–B3 and D1 are a few weeks of work on the mode that already plays well. Do them alongside the campaign or after. Recommendation: alongside; they touch different files except for the one pinned batch.
3. **Spells outside the campaign.** B4 option 1 or 2. Recommendation: option 1; five keys are already bound to spells.
4. **Persistence.** Local skills and stash (C2), or stay session-only. Recommendation: local, after B2.
5. **Sandbox loot.** A gun picked up in Sandbox is kept when Wave Mode starts. Reset the loadout on leaving Sandbox, as already happens for Test Range and Boss Fight, or accept it. Recommendation: reset.
6. **Music.** Recommendation: yes; it is the cheapest large gain in feel.
7. **Enabling rewards.** Only after the real-hub run and a human pass on all five fights (H1).

## 9. How to verify the changes improved play

Re-run the section 2 harnesses and compare.

| Measure | At `d8596be` | Target |
|---|---|---|
| L01 completes in the browser without URL tricks | No | Yes |
| Player state 60 s after sprinting off the L01 spawn | Falling, y below −35,000, alive | On ground, rescued or dead |
| Real-health clear test exists for L01–L05 | No | Yes, each passing |
| Standing on the L03 secret for 60 s | Dead at 35 s (`06b5c16`) | Alive |
| Duck Gun pickup present at Wave Mode start | Yes | No |
| Looting-bot wins, tiers 1–3 | 5 of 5 | At least 4 of 5 |
| Looting-bot wins, tier 10 in a ladder | 3 of 3 | At most 1 of 5 |
| Mean time per tier at tier 10 | About 260 s | 300–400 s |
| Tier clears where a boss gun is the top-DPS gun | 30 of 30 | At most half |
| Tier at which Health reaches level 10 | 3 | 7–8 (if C2 ships) |
| Downs survived in one tier-5 Blue Monster fight | 11 | Defeat by the fourth |
| Error toasts raised by pressing grapple in a wave | One per press | None |

Human playtest, 30 minutes, mouse and keyboard, then controller:

- Start Wave Mode cold. Do you know what to do within 20 seconds without reading the controls?
- Do slide, slide-hop and grapple feel good, and does the stamina bar ever stop you sprinting when you need to?
- After the first boss, do you still want the next ordinary gun?
- Does tier 3 feel harder than tier 1?
- Play L01 from the title to the end. Can you tell when a lockdown starts, when an alarm rings and when you were rewound?
- Fight each of the five paid bosses with the starter gun. Is every hit one you could have avoided?
- Frame rate on a mid-range laptop during wave 3 and in L03 at each graphics preset (press F3).

## 10. Not audited or out of scope

- Real frame rate, GPU load, the graphics presets and asset loading times.
- Anything in the browser at `d8596be`: the rebuilt levels' look, the new HUD bars, the reward screen, the character picker and the new weapon animations.
- Clear times, deaths and difficulty of L01–L05 at real health.
- Controller play, aim assist and the pad menus.
- Shop prices and the vending machine beyond reading the tables.
- Online Free 1v1, lag compensation, wagers and anything that needs a hub session.
- The reward transport, recorder and server replay code beyond its documents.
- Art quality and the art-generation workflow.
- The hub's own code, the plaza, Verse and the Ticket ledger.
