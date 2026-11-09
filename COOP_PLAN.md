# Sproto Shooter: Headshots, Co-op, Monster Attacks and the Move into Sproto Duel

Status: plan, 2026-11-07. Owner decides anything marked **Owner decision**.

This plan covers four goals:

1. **Weak zones.** Heads and weak points take much bigger hits.
2. **Move into Sproto Duel** and add co-op for two players, both **online** and **local** (split-screen).
3. **Different attacks for each monster**, plus **new monsters and new weapons**.
4. **Split the work** between Cursor (infrastructure and online), Claude Code (visuals, gameplay feel and QA) and ChatGPT (concept art for 3D assets that don't exist yet: new weapons, new monsters and new props).

Section 1 is what the code has today. Sections 2–4 are the first draft of each feature. Section 5 critiques that draft, and section 6 is the improved plan that the agents follow. Agent prompts are in [`docs/coop/prompts/`](docs/coop/prompts/).

---

## 1. What exists today (checked in the code)

### Sproto Shooter (`crrreatorrr/sproto-shooter`)

- Plain JavaScript, Three.js 0.170, Vite 5, Vitest 2. About 7,600 lines in `src/`.
- `src/sim/**` is a pure, seeded, fixed-60 Hz simulation. `src/data/**` holds every balance number. `tests/units.test.js` enforces that the sim never imports three or the DOM.
- **Weak spots already exist.** Each enemy in `src/data/enemies.js` has hitboxes with a `zone` of `body`, `weak` or `shield`. A `weak` hit does ×2 (`hit.critMult ?? 2` in `src/sim/combat.js`), or ×2.5 for the Big Bitcoin Obama's back battery. The UI calls it **BONK**. A random crit (×1.5, 5%) stacks on top. Bosses have a head sphere plus a belly spot that only counts while stunned (`onlyWhen: 'stunned'`). Hex Sahil's weak spot orbits him.
- Hitboxes are static shapes in the enemy's local space. They don't follow the animated skeleton.
- **Multiplayer hooks are half done.** `state.players` is a map, `simulate()` takes commands per player, and the player already has `downed`, `downedT` and `respawnT` fields. 21 places still assume one player through `state.localPlayerId` (Game, renderer, UI, waves, actions, combat, progression, world). Enemies target `nearestPlayer()`.
- **Gamepad support (single player, added 2026-11-09, plan item P2).** Before that it was keyboard and mouse with pointer lock only. Any standard-mapping pad plays every mode and drives every menu; aim assist is controller only. See the README's Controls section and `src/data/gamepad.js`. Split-screen seats are not built yet.
- Enemy attacks: Midget has one melee swipe. Flying Midget has one pellet burst. Bitcoin Obama has one 3-round burst. Big Obama has a ground pound and a bullet hose. The five bosses share a pattern system (`chase`, `volley`, `charge`, `slam`, `missiles`, `summon` for the "mega" bosses, a bespoke set for the Dragon and Hex Sahil).
- **Six open pull requests**: #1 (B-M0 baseline, draft), #3 (B-M1 lint and CI), #4 (B-M2 perf overlay), #5 (B-M3 renderer split), #6 (campaign plan), #7 (C-M0 level format). All are 31+ commits behind `main`.

### Sproto Duel (`crrreatorrr/sproto-duel`)

- TypeScript, Three.js 0.186, Vite 8, Vitest 3, Rapier (visual only), Howler.
- **Local Versus**: two-player side-by-side split-screen. Seats are `IntentSource`s (`src/input/IntentSource.ts`), devices are assigned in `src/input/assignDevices.ts`, gamepads in `src/core/Gamepad.ts`, and `MatchRules` (`src/core/rules.ts`) says what each mode allows.
- **Online Duel**: two seats through the hub's Nakama (`sproto_arena` match in `metaverse-hub/server/modules/src/games/`). Quick Match with a 10 s accept window, private room codes, rematch, ping chip, 10 s reconnect then forfeit. Stake 0 Tickets.
- Netcode is **host-authoritative**: a random client runs the deterministic `src/sim-core`, the guest sends intent frames at 30 Hz, the host streams ~1 KB snapshots at 30 Hz, and the guest interpolates 100 ms behind. **There is no guest prediction.** The host uploads an input log that the server can replay with `dist/duel-sim.server.js` (fixed-point, goja-safe).
- Reusable net pieces: `src/net/transport.ts` (`NetTransport`, `LoopbackTransport`, `HubRealtimeTransport`), `HubLobby.ts`, `OnlineSession.ts`, `SnapshotBuffer.ts`, `RemoteInputBuffer.ts`, `FakeArenaServer.ts` and `devNetsim.ts` (`/?netsim=80` plays against a scripted peer with fake latency).
- Rules for agents: `AGENTS.md`. Branches are `<agent>/<slug>`, every change goes through a pull request, and a different agent reviews it.

---

## 2. Draft A: weak zones

- Rename the zones to `head`, `weak` (special weak points such as the back battery), `body` and `shield`.
- Raise head damage to ×3 and keep weak points at ×2.5.
- Add a headshot sound, a bigger damage number and a kill effect.

## 3. Draft B: move into Duel and add co-op

- Copy the shooter into Sproto Duel as a new main-menu mode.
- Reuse Duel's split-screen for local co-op and Duel's online stack for online co-op.
- Make the sim support two players.

## 4. Draft C: monster attacks

- Give each enemy two or three new attacks and each boss one new attack.

---

## 5. Critique of the draft

| # | Problem in the draft | Why it matters | Fix (built into section 6) |
|---|---|---|---|
| 1 | "Add headshots" when they already exist | The work is a rebalance and a feedback upgrade, not a new system | Section 6.1 starts from the current `weak` zone and the BONK event |
| 2 | One flat ×3 head multiplier | The shotgun fires many pellets and the MG 10 shots a second, so a flat ×3 collapses time-to-kill for those guns while the sniper barely changes | Head multiplier per gun type, plus tests that lock time-to-kill ranges |
| 3 | Hitboxes don't follow the animation | A big head bonus makes a hitbox that misses the visible head feel broken, and players notice it first | Head position per enemy state in data, a hitbox debug overlay, and a QA check that compares the head bone with the head hitbox |
| 4 | Bosses would melt with ×3 heads | Boss HP was tuned for ×2 | Bosses keep their own lower head multiplier. Their weak points open on a schedule instead |
| 5 | Six open PRs in the shooter repo | A move into Duel strands them or causes a huge conflict | Step P0: the owner lands or closes each one, then the shooter repo is frozen |
| 6 | JavaScript vs TypeScript | Converting during the move mixes two risky changes | Move the JS as is (`allowJs`), convert files later one at a time |
| 7 | Copying Duel's netcode as is | Duel has no guest prediction. That works for slow spells, but in a first-person shooter 100 ms of input lag on your own movement and aim feels broken | Guest predicts its own movement and aim. Host rewinds enemies for the guest's hitscan shots (lag compensation), so guest headshots land where the guest aimed |
| 8 | Porting the shooter sim to Duel's fixed-point `sim-core` | Large effort, only needed when a server must verify results for real rewards | Not needed at 0 Tickets PvE. Keep the float sim. **Owner decision** if co-op will ever pay Tickets |
| 9 | Local co-op without gamepads | Only one mouse exists | Gamepad support with aim assist comes before split-screen (single-player pad support landed 2026-11-09) |
| 10 | Split-screen with 60-enemy swarms | Two first-person views double draw calls. Duel only draws two wizards | Frame budget, half-resolution post per view, shared shadow map, enemy count cap in split-screen |
| 11 | Duel's side-by-side split | Two tall, narrow first-person views are hard to aim in | Top/bottom split by default, side-by-side as an option |
| 12 | One player still assumed in 21 places | Each one is a co-op bug | Explicit task to remove every `localPlayerId` use from the sim |
| 13 | Revive, scaling, loot and shop not designed | Co-op without them is two people playing single-player in one room | Downed and revive, enemy scaling by player count, loot per player, a shop and ready check per player |
| 14 | New attacks as more ad-hoc code per enemy | The enemy code is already a set of per-type state machines. Adding 15 attacks that way is unmaintainable and hard to sync online | One data-driven attack runner. Attacks are data plus events, pure and serializable |
| 15 | Attacks designed for one player | Co-op needs attacks that use the second player | Every boss gets one attack that needs teamwork. Enemies spread targets by threat instead of always picking the nearest |
| 16 | Gameplay sim work not assigned | The brief assigns infra and online to Cursor and visuals and QA to Claude, but weak zones and attacks are gameplay logic | Claude owns them, because each attack is built around its telegraph and feedback. **Owner decision** if you want Cursor to own them |
| 17 | Cursor and Claude editing the same sim files | Merge conflicts and broken builds | File ownership table (6.5), and multiplayer plumbing lands before attack work touches the same files |
| 18 | ChatGPT images treated as game assets | ChatGPT makes 2D concept art. The games use rigged 3D models made with Higgsfield or Tripo | Concept art is only for 3D assets that don't exist yet, and it's the input to Duel's `docs/higgsfield-workflow-guide.md` (image to 3D, rig). Every image is a clean model sheet (T-pose for monsters, three-quarter side view for guns) so image-to-3D works |
| 19 | Concept art planned without new content to draw | The draft only had attacks for existing monsters, which need animation, not new models | New monsters (6.3a) and new weapons (6.3b) are designed first, with weak zones and attacks, and the art list follows from them |
| 19b | New gun types change the gun generator | `generateGun()` draws the type with a weighted pick over `GUN_TYPES`, so adding types changes every seeded roll and the determinism and full-run tests | New types get their own weights, the existing four keep their relative odds, and the seeded tests are updated on purpose in the same PR. Existing gun stats don't change |
| 20 | No player count stated | Duel's server match, protocol and split-screen are all built for 2 | v1 is 2 players. 3–4 players online is a stretch goal |
| 21 | No review step | The workspace rule is that a different agent reviews each PR | Codex (or the other agent) reviews every PR |

---

## 6. Improved plan

### 6.0 Decisions locked by this plan

- **Where:** Sproto Shooter becomes a mode inside the `sproto-duel` repo, at `src/shooter/`. The main menu gets **Sproto Shooter → Solo / Local Co-op / Online Co-op**. The shooter code loads with a dynamic `import()` so Duel's first load doesn't grow.
- **Players:** 2 in v1, online or local.
- **Netcode:** host-authoritative over the existing Nakama relay. The guest predicts its own movement and aim. The host does lag-compensated hitscan. Snapshots at 20 Hz with deltas. Pause and hitstop are off online.
- **Rewards:** stake and payout 0 Tickets online, like Online Duel. Local co-op reports nothing to the hub.
- **Determinism:** the float sim stays. No fixed-point port, no server replay in v1.
- **Server:** a new Nakama match `sproto_coop` in `metaverse-hub` (relay, quick match, rooms, reconnect). It doesn't referee.

### 6.1 Weak zones and headshots

**Zones** (`src/shooter/data/enemies.js`):

| Zone | Meaning | Example |
|---|---|---|
| `head` | The head. Replaces today's head-sphere `weak` zones | Midget, Obama, Flying Midget heads; boss heads |
| `weak` | A special weak point, often only open at certain times | Big Obama back battery, boss belly while stunned, Hex Sahil's orbiting spot |
| `body` | Torso and legs | Everything else |
| `limb` | Optional, arms on the big enemies | Big Obama, humanoid bosses |
| `shield` | Blocks damage | Big Obama front shield |

**Multipliers** (new `ZONES` table in `src/shooter/data/tuning.js`, starting values for the balance pass):

| | Head | Weak point | Body | Limb |
|---|---|---|---|---|
| Sniper | ×4.0 | ×3.0 | ×1 | ×0.75 |
| Machine gun | ×2.5 | ×2.5 | ×1 | ×0.75 |
| Shotgun (per pellet) | ×2.0 | ×2.0 | ×1 | ×0.75 |
| Bazooka direct hit | ×1.5 | ×2.0 | ×1 | ×1 (splash ignores zones) |
| Spells | ×1.5 | ×2.0 | ×1 | ×1 |
| **Boss cap** | max ×2.0 on head | weak point ×3.0 | ×1 | ×1 |

- The random crit (×1.5) still stacks. Legendary perks that change the weak zone (`bigHead`, `critSproto`) work on `head` and `weak`.
- **Head position follows the enemy's state**: each enemy gets an optional `headByState` (for example `{ windup: { y: 0.9, z: 0.25 } }` for a Midget crouching before a pounce). The sim stays pure; the renderer's animation matches the same data.
- **Armored heads** (later, as an elite affix): a helmet with its own HP that blocks head bonuses until it breaks.

**Feedback** (presentation only, driven by the existing damage event with `zone`):

- A sharp "BONK" hit sound, different from body hits. A different hit marker (skull or star) and a bigger, gold damage number.
- Headshot kill: a comic head-pop of confetti and stars, a short time-scale dip offline only, and a "BONK!" pop above the enemy.
- Weak points glow and pulse when they open (boss belly, battery).
- The HUD's run summary counts headshots and the best headshot. Headshots give extra Gunslinger XP.

**Tests:** ray-vs-zone priority (head beats body beats limb, shield blocks), multiplier per gun type, and a time-to-kill table per gun and enemy: body-shot time-to-kill unchanged, headshot time-to-kill within set limits (so the shotgun can't one-shot a Big Obama from the head).

### 6.2 Move into Duel and co-op

Phases in order. Each phase is one or more PRs into `sproto-duel`.

**P0. Prepare (owner, then Cursor).**
- Owner decides for each open shooter PR (#1, #3, #4, #5, #6, #7): merge or close. Recommendation: merge #4 (perf overlay, needed for split-screen budgets) and #5 (renderer split, makes per-view cameras easier) if they still pass after a rebase, close #1 and #3 (Duel already has CI and typecheck), and keep #6 and #7 as plans to port later.
- Then freeze the shooter repo: README points to `sproto-duel/src/shooter`.

**P1. Lift and shift, no behavior change (Cursor).**
- Bring the repo in with history: `git filter-repo --to-subdirectory-filter src/shooter` on a copy, then merge into a `sproto-duel` branch with `--allow-unrelated-histories`.
- Turn on `allowJs` for `src/shooter/**`, without type checking it yet. Merge the Vitest config so `npm test` runs both suites. Keep the shooter's sim-purity test, pointed at the new paths.
- Bump the shooter to Three 0.186 and fix any break.
- Remove duplicate assets: the shooter's character, stage and texture files are copies of Duel's. Point the shooter at Duel's `public/assets/` and only add the files Duel doesn't have (guns, dragon, monster, sprotoBeast, projectiles, the boss GLBs added since).
- Main menu entry **Sproto Shooter** that loads the mode with a dynamic `import()`, and back to the Duel menu on exit.
- Move this plan to `sproto-duel/docs/shooter/COOP_PLAN.md`.
- Done when: every shooter mode plays as before (Claude's QA parity pass), all tests pass, `npm run build` passes, and Duel's first-load size is unchanged.

**P2. Input: gamepads and seats (Cursor).**
- Reuse `src/core/Gamepad.ts` and `src/input/assignDevices.ts`. Add a `ShooterSeat` that turns a device into the shooter's per-tick `Command`.
- Gamepad bindings for every action (fire, aim, jump, slide, dash, reload, swap, spells, interact, medkit, menus).
- Aim assist for gamepads only: slowdown near targets and light pull toward the head while aiming. Strength in data, off for keyboard and mouse.
- **Status (2026-11-09): single-player part done in the shooter repo, before the move into Duel.** Bindings for every action and every menu, RT fire / LT aim, right-stick look with a response curve and edge turn boost, latch on connect, hot-plug, and controller-only aim assist (slowdown, plus a pull toward the head while aiming) with its strength in `src/data/gamepad.js` and a pause-menu setting. Duel's `Gamepad.ts` and `assignDevices.ts` were used as references, not imported, since the shooter is still its own JavaScript repo: `src/input/gamepad.js` (pure pad reading), `src/input/padGameplay.js` (layout) and `src/input/aimAssist.js` feed the existing `Command` through `src/input/input.js`. **Still open:** seats and device assignment (`ShooterSeat`, a second pad as player 2), which belong with P3/P4.

**P3. Two players in the sim (Cursor).**
- Remove every `state.localPlayerId` use from `src/shooter/sim/**`. Rendering, UI and audio receive "which player am I drawing for".
- Targeting moves to a new `sim/targeting.js`: threat-based (recent damage dealt, distance, who's downed) with a stickiness timer, so both players get attention.
- **Downed and revive:** at 0 HP a player is downed for 30 s, crawls slowly and can still fire their active gun at half fire rate. A teammate holds Interact for 3 s nearby to revive at 30% HP. Both downed means the wave fails. In solo, the current rules stay.
- **Scaling** (data, `src/shooter/data/coop.js`): with 2 players, enemy HP ×1.5, spawn count ×1.4, boss HP ×1.7.
- **Loot per player**: `pickup.ownerId`, so each player sees and picks up their own drops. Tickets and resources per player.
- Shop per player with a ready check: the wave starts when both are ready or the timer ends.
- Determinism test with two scripted players.

**P4. Local co-op split-screen (Cursor builds it, Claude polishes the look).**
- Top/bottom split by default, side-by-side as a setting. One camera, composer and HUD per view.
- P1 on keyboard and mouse or the first pad, P2 on a pad. Uses Duel's device assignment.
- Budget: 60 fps at 1080p on a mid laptop GPU in wave 3. Bloom at half strength and quarter resolution per view, one shared shadow map, lower LOD distance, enemy count cap in split-screen if the perf overlay shows misses.
- Pause from either player. No hub reporting.

**P5. Online co-op (Cursor).**
- **Server** (`metaverse-hub`): a new `sproto_coop` match and RPCs (`sproto_coop.room_create`, `room_join`, quick match), modeled on `sproto_arena` and `sproto_matchmaking`. 2 seats, 10 s accept window, room codes, 10 s reconnect, rematch. No referee, 0 Tickets. Follow the migration-ordering rules in `sproto-duel/handoff.md`.
- **Client:** generalize `src/net/transport.ts`, `HubLobby`, `OnlineSession`, `SnapshotBuffer` and `RemoteInputBuffer` so Duel and Shooter share them. Shooter protocol in `src/shooter/net/protocol.js` with its own `NET_VERSION`.
- Guest sends commands at 30 Hz with recent ones repeated. Host runs the sim at 60 Hz.
- Host sends snapshots at 20 Hz: quantized positions (cm), yaw (1/256 turn), HP, state, delta against the last acked snapshot, plus sim events. Target 3 KB per snapshot or less with 60 enemies and 100 projectiles.
- **Guest prediction:** the guest runs its own player's movement and aim locally and reconciles with the host's state (replay unacknowledged commands). Enemies and projectiles are interpolated 100 ms back.
- **Lag compensation:** the host keeps 250 ms of enemy hitbox history and rewinds to the guest's view time for the guest's hitscan shots, so guest headshots count where the guest aimed. Projectile weapons spawn from the host.
- **Honest limits:** the host can cheat. That's acceptable at 0 Tickets. If the host leaves, the match ends with a summary (no host migration in v1).
- Dev without a server: `/?netsim=80` with a scripted co-op guest over `FakeArenaServer`, like Duel.
- Done when: a two-machine test on different networks plays a full 3-wave run, ping under 80 ms feels like solo for both players, and a 5 s cable pull resumes.

**P6. Hub and menus (Cursor).**
- Menu entries, guest sessions (`sproto.standalone_session` already exists), online count, the 0 Tickets result screen.
- CI: shooter tests in Duel's workflow, a protocol test that the client and server opcodes match.

### 6.3 Monster attacks

**System first (Claude).** A data-driven attack runner, `src/shooter/sim/attacks.js`, replaces the ad-hoc per-type attack code. Each enemy lists attacks in data:

```js
attacks: [
  { id: 'swipe',  weight: 3, range: [0, 1.5], cd: 0.8, windup: 0.25, active: 0.15, recover: 0.45, damage: 9 },
  { id: 'pounce', weight: 2, range: [4, 8],   cd: 4.0, windup: 0.45, active: 0.35, recover: 0.8, damage: 14, minTier: 2 },
]
```

Rules every attack follows:

- A visible and audible telegraph of at least 0.35 s, with a longer recovery as the punish window (from `research_notes/Smooth boss animation techniques/melee_attack_animation.md`).
- Clear counterplay: dodge, dash, break line of sight, shoot a weak point, or a teammate helps.
- Pure sim: only `state.rng`, all state in plain JSON, sim events for every start, hit and end, so it works online with no extra code.
- New attacks unlock by tier, elite status or boss phase, so wave 1 stays readable.

**Enemies:**

| Enemy | Existing | New attack 1 | New attack 2 |
|---|---|---|---|
| Midget | Swipe | **Pounce**: crouches 0.45 s, leaps up to 8 m. Dash sideways to dodge | **Dogpile latch** (tier 3+): grabs on, slows you 50%, chews 3 dmg every 0.5 s. Slide or dash shakes it off, or a teammate shoots it off (head shots on a latched Midget do double) |
| Flying Midget | Pellet burst | **Dive bomb**: whistle and red trail for 0.6 s, then a straight dive; misses stun it on the floor for 1.5 s (free headshot) | **Beanie bomb**: drops its propeller beanie, which bounces twice and blows up after 1.5 s |
| Bitcoin Obama | 3-round burst | **Ricochet coin**: a slow coin that bounces once off pillars or the arena wall, so cover isn't always safe | **Coin mine**: places a spinning coin that pops when you come within 3 m, after a 0.5 s chime |
| Big Bitcoin Obama | Ground pound, bullet hose | **Shield bash charge**: plants, then charges 10 m behind the shield. Sidestep and the back battery is open for 2 s | **Battery overload** (below 30% HP): the battery glows for 2 s, then a 6 m pulse. Shooting the battery during the glow cancels it and staggers him |

**Bosses** (one signature attack each, plus a co-op twist):

| Boss | New attack | Solo | Co-op twist |
|---|---|---|---|
| Mega Tinubu | **Tax grab** | Grabs you and squeezes. Mash Interact to escape in 2 s | Your teammate shooting the head spot frees you at once and stuns him |
| Hex Sahil | **Audit link** | A beam tethers you to the arena center. Stay inside a ring or take damage | Tethers both players together: stay within 12 m of each other or the link burns both |
| Jade Dragon | **Wing gust + tail spin** | A gust pushes you back, then a 360° tail spin. Jump the tail | It splits the gust between both players and turns its back to one, opening the head to the other |
| Blue Monster | **Boulder throw** | Rips up a boulder (1 s), lobs it with a ground ring where it lands | Throws two at once, one per player; the boulder leaves cover for 10 s |
| Sproto Beast | **Roar** | 0.8 s inhale, then a roar that stuns you if you're facing him. Look away | Stuns whoever faces him. The other player gets a free window on the open weak spot |

**Visuals for every attack (Claude):** the telegraph pose, a ground decal or trail, a sound cue, the hit effect and the recovery pose. The boss's humanoid and dragon rigs (`render/humanoidRig.js`, `render/dragonRig.js`) get the new procedural poses.

### 6.3a New monsters (Claude builds them, ChatGPT draws them)

Each new monster fills a gap the current four don't cover, has a readable head plus one weak point, and has a co-op angle. They use the same attack runner as 6.3 and come in from the tier or wave listed.

| Id | Monster | Role | From | Weak zones | Attacks | Co-op angle |
|---|---|---|---|---|---|---|
| `bombTosser` | **Bomb Tosser** | Breaks camping behind cover | Wave 2 | Head; a bomb satchel on its back (shooting it blows the Tosser up and hurts nearby enemies) | **Lob**: arcs a bouncing bomb with a ground ring, 1.2 s fuse. **Cluster** (tier 4+): three smaller bombs in a spread | Whoever it isn't aiming at can hit the satchel |
| `hypeBot` | **Hype Bot** | Support: buffs other enemies | Wave 2 | A big speaker head (×3 like a head); a glowing antenna that, shot off, stops the buff | **Hype beam**: links to up to 3 enemies, +30% speed and a slow heal. **Feedback blast**: a short-range sound cone that knocks back | It hides behind the swarm, so one player flanks while the other holds |
| `moleMiner` | **Mole Miner** | Ambush from below | Wave 3 | Helmet lamp head, only while it's above ground | **Burrow**: a dirt mound travels toward you (the telegraph). **Drill pop-up**: bursts up under you after 0.6 s. **Rock fling** while surfaced | Players call out mounds; if it chases one player, the other gets the surfaced window |
| `gooGlob` | **Goo Glob** | Swarm that multiplies | Wave 2 | A floating core visible inside its see-through body (the only zone that takes bonus damage) | **Body slam** with a puddle that slows. **Split**: on death it splits into 2 medium, then 4 small globs | Splitting fills the arena; focus fire on cores stops the chain |
| `laserLookout` | **Laser Lookout** | Long-range threat, a headshot duel | Wave 3 | A giant scope eye (head, ×4 from the sniper); shooting the eye blinds it for 3 s | **Laser aim**: a red laser locks on for 1.2 s, then a heavy shot. **Relocate**: hops to another pillar | It can only aim at one player; the other rushes or counter-snipes |
| `tetherTwins` | **Tether Twins** | Co-op puzzle enemy | Wave 3, elites from tier 3 | Each twin's head; the energy cord between them is a weak point while it's stretched | **Cord whip**: the twins run apart and sweep the cord across the floor (jump it). **Re-link**: a twin that dies alone comes back in 4 s unless the other dies too | Built for two players: each takes a twin. Solo, the twins stay close so one burst can kill both |
| `scrapTitan` | **Scrap Titan** (new boss) | Boss for Boss Fight mode and a later wave | Boss Fight, then tier 5+ | Armor plates come off as you shoot them; the glowing core moves to whichever plate fell last | **Junk barrage**: throws scrap chunks. **Magnet pull**: drags players in, then a spin. **Rebuild**: picks scrap up to restore a plate (shoot the scrap to stop it) | One player keeps the scrap off it while the other hits the core |

### 6.3b New weapons (Claude builds them, ChatGPT draws them)

The four existing gun types keep their stats and models. New weapons are additions.

**New gun types** (starting stats for the balance pass; each gets a model, first-person grip placement in `render/firstPerson.js`, muzzle point, sound and range rules):

| Id | Weapon | Role | Starting stats | Drop weight |
|---|---|---|---|---|
| `pistol` | **Pocket Bonker** | Sidearm, the headshot gun | 28 dmg, 4 shots/s semi-auto, 12 mag, head ×3.5, infinite reserve | 14 |
| `lobber` | **Lob-o-Matic** | Grenade launcher, hits behind cover | 90 dmg + 3 m splash, bouncing grenade, 1.4 shots/s, 6 mag | 6 |
| `zapper` | **Zap Ray** | Beam, good against flyers and swarms | Continuous beam 120 dps, chains to 2 enemies, 18 m range, heat bar instead of a magazine | 6 |

**Legendary looks**: each Legendary wacky perk gets its own gun model, used whatever the gun type, so a Legendary is recognizable at a glance:

| Perk | Model idea |
|---|---|
| Rubber Duckie | A gun built around a giant rubber duck, the duck's beak is the muzzle |
| Yeet Reload | A gun wrapped in hazard tape with a lit fuse on the stock |
| Every Tenth | A gun with a big round counter drum and an oversized second barrel |
| Lil Buddy | A gun with a tiny Sproto riding on top in a little seat |
| Party Popper | A gun made from a party popper and streamers, confetti spilling from the mag |
| Big Head Mode | A gun with a huge cartoon magnifying glass as the scope |

**New props** that the new attacks need: Weapon Box (today it's a primitive with a label), beanie bomb, coin mine, boulder, Bomb Tosser bomb, revive beacon.

### 6.4 Concept art (ChatGPT)

- **Only for 3D assets that don't exist yet**: the new monsters (6.3a), new weapons (6.3b) and new props. Existing monsters and guns already have models; their new attacks are animation work, not new art.
- One image per asset, white background, no text, comic-3D-fun style. Enemies can be menacing.
- Every image is a **model sheet** so Higgsfield or Tripo image-to-3D works (Duel's `docs/higgsfield-workflow-guide.md`): monsters full body in a T-pose (arms straight out at shoulder height, legs slightly apart), front view; guns as the whole gun in a three-quarter side view with the grip and trigger visible; props whole and centered.
- Weak zones must be visible in the design (the satchel, the speaker head, the goo core, the scope eye, the cord anchors, the Titan's plates and core), because the game's headshots depend on them.
- Save each image as `art/concepts/<id>.png` (ids in the ChatGPT prompt). Claude reviews them before any 3D step: head and weak points readable at 30 m, silhouette distinct from every other enemy, the gun's grip fits the first-person hands, nothing that breaks image-to-3D (thin floating parts, text, cropped limbs).

### 6.5 Who does what

| Track | Owner | Items |
|---|---|---|
| Infrastructure and online | **Cursor** | P0 (after owner decisions), P1, P2, P3, P4 (build), P5, P6 |
| Gameplay sim built around feel | **Claude Code** | 6.1 weak zones (sim + data), 6.3 attack runner and all attacks, 6.3a new monsters, 6.3b new gun types |
| Visuals | **Claude Code** | Headshot and weak-point feedback, attack telegraphs and VFX, rig poses, split-screen HUD and look, co-op UI (downed, revive, teammate marker), turning approved concept art into rigged 3D models and integrating them |
| QA | **Claude Code** | A parity pass after P1, a QA gate at the end of every phase (checklists in the Claude prompt), perf numbers from the overlay, two-player tests with `?netsim` |
| Concept art | **ChatGPT** | Model sheets for the new monsters, weapons and props in 6.3a, 6.3b and 6.4 |
| Review | **Codex**, or the agent that didn't write the PR | Every PR |
| Decisions, playtests, deploy | **Owner** | P0 PR decisions, two-machine online test, Nakama deploy, final art picks |

**File ownership** (after P1, paths under `sproto-duel/src/shooter/`). Don't edit another track's files while its PR is open; ask through the PR instead.

| Cursor | Claude |
|---|---|
| `sim/state.js`, `sim/simulate.js`, `sim/player.js`, `sim/actions.js`, `sim/waves.js`, `sim/economy.js`, `sim/collision.js` (rewind only), new `sim/targeting.js` | `sim/combat.js`, `sim/enemies.js`, `sim/bosses.js`, new `sim/attacks.js`, `sim/collision.js` (zones, before P5), `data/enemies.js`, `data/tuning.js` `ZONES`, `data/guns.js` and `sim/guns.js` (new types only), `data/waves.js` (adding the new monsters) |
| `game/Game.js`, `input/**`, `net/**`, `data/coop.js`, `src/net/**` (shared), `src/App.ts` menu entry, `metaverse-hub` server | `render/**` (except per-view camera setup in P4), `ui/**` HUD visuals, `audio/**`, `public/assets/**` new models |

### 6.6 Order and dependencies

```
P0 owner decisions ─► P1 lift & shift (Cursor) ─► Claude QA parity
                                   │
          ┌────────────────────────┼─────────────────────────────┐
          ▼                        ▼                             ▼
   P2 gamepads (Cursor)   V1 weak zones (Claude)       ChatGPT batch 1: new monsters
          ▼                        ▼                             ▼
   P3 two-player sim      V2 attack runner + enemy attacks   ChatGPT batch 2: new weapons + props
          ▼                        ▼                             ▼
   P4 split-screen ◄──── V4 split-screen HUD + co-op UI     V5 Claude: concept review → 3D → rig
          ▼                        ▼                             ▼
   P5 online co-op         V3 boss attacks (needs P3)      V6 new monsters, V7 new weapons (need V2 + V5)
          ▼                        ▼                             ▼
   P6 hub + CI ───────────► Final QA gate (Claude) ─► owner two-machine playtest ─► deploy
```

- ChatGPT can start right away: the art doesn't depend on any code.

- Claude's V1 lands before Cursor's P5 rewinds hitboxes (both touch `collision.js`).
- Cursor's P3 lands before Claude's V3 co-op twists (they need threat targeting and two players).
- Each phase ends with: `npm run typecheck`, `npm test`, `npm run build`, `npm run check:assets` passing; Claude's QA gate; review by another agent.

### 6.7 Risks

| Risk | Mitigation |
|---|---|
| Split-screen misses 60 fps | Perf overlay from P1, enemy cap in split-screen, quality presets |
| Guest prediction jitters | Start with movement only, add aim smoothing, `?netsim` tests at 80/150 ms with packet loss |
| Snapshots too big with swarms | Delta compression, quantization, drop far-off cosmetic projectiles, 15 Hz fallback |
| Headshot rebalance breaks the economy | Time-to-kill tests, then one balance pass with the existing autopilot full-run test |
| ChatGPT refuses or drifts in style | Attach references, regenerate with the style block, keep one style-anchor image |
| History merge is messy | Do it on a copy, one PR, no other changes in it |

### 6.8 Definition of done

- Solo, local co-op and online co-op all play a full 3-wave run plus Boss Fight mode inside Sproto Duel.
- Headshots feel distinct and time-to-kill stays inside the tested limits.
- Every enemy has the attacks in 6.3, each with a telegraph, sound and counterplay.
- The six new monsters, the Scrap Titan, the three new gun types and the six Legendary looks are in the game as rigged 3D models made from approved concept art.
- 60 fps in solo and split-screen wave 3 on a mid laptop GPU. Online plays well at 80 ms.
- All checks pass. Each PR was reviewed by another agent.
