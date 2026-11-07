# Cursor prompt: infrastructure and online co-op

Paste this into Cursor (Agent mode) with `~/games` open. Run one phase per session and stop after each PR.

```text
You own the infrastructure and online track of the Sproto Shooter co-op plan.

READ FIRST
- The plan: sproto-shooter/COOP_PLAN.md (after phase P1 it lives at sproto-duel/docs/shooter/COOP_PLAN.md).
  Sections 1, 5 and 6 are binding. Your items are P0–P6 in section 6.2, the file ownership table in 6.5
  and the order in 6.6.
- ~/games/AGENTS.md, sproto-duel/AGENTS.md, sproto-duel/README.md ("Local Versus", "Online Duel"),
  sproto-duel/handoff.md, sproto-duel/docs/SERVER-SIM.md, and sproto-shooter/PLAN.md §1 and §9.

RULES
- One phase per branch and pull request: `agent-task new sproto-duel <slug> --agent cursor`, branch
  cursor/<slug>. Never push to main. Server work goes in a separate metaverse-hub PR.
- Before opening a PR run, in sproto-duel: npm run typecheck, npm test, npm run build, npm run check:assets.
  Report any check you couldn't run.
- Keep src/shooter/sim/** and src/shooter/data/** pure: no three, no DOM, no Math.random, Date.now or
  performance.now. The sim-purity test must keep passing.
- Only edit files the ownership table gives Cursor. Claude Code owns combat, enemies, bosses, attacks,
  render, ui visuals and audio. If you need a change there, describe it in the PR and stop.
- Don't change weapon stats, enemy stats or the damage pipeline numbers.
- Don't read .local-admin-login.txt. Never put secrets in the client build.

PHASES (do the next one that isn't merged yet, then stop)
P0  The owner has decided which open sproto-shooter PRs to merge or close; apply those decisions only.
    Then add a note to the sproto-shooter README that development moved to sproto-duel/src/shooter.
P1  Lift and shift with history into sproto-duel/src/shooter (git filter-repo --to-subdirectory-filter on a
    copy, merge --allow-unrelated-histories). allowJs for src/shooter, merged Vitest config, Three 0.186,
    shared assets from public/assets (add only missing files), main menu entry loaded with dynamic
    import(), move COOP_PLAN.md to docs/shooter/. No behavior changes. Verify Duel's first-load size is
    unchanged and list it in the PR.
P2  Gamepad support and seats: reuse src/core/Gamepad.ts and src/input/assignDevices.ts, add ShooterSeat
    that builds the shooter Command per tick, full pad bindings, gamepad-only aim assist with strength in
    data. Unit tests for the binding and assist math.
P3  Two players in the sim: remove every state.localPlayerId use from src/shooter/sim (renderer, UI and
    audio get "the player being drawn"), sim/targeting.js with threat-based targeting, downed and revive,
    data/coop.js scaling, pickup.ownerId loot, per-player shop with ready check. Determinism test with two
    scripted players. Expose targeting through one function Claude's attack code can call.
P4  Local co-op split-screen: top/bottom by default, side-by-side setting, a camera, composer and HUD root per
    view, device assignment from Duel, shared shadow map, per-view half-res bloom. Claude does the HUD look;
    you deliver per-view HUD containers. Record fps in wave 3 with the perf overlay in the PR.
P5  Online co-op. metaverse-hub: sproto_coop match and RPCs modeled on sproto_arena and
    sproto_matchmaking (2 seats, accept window, room codes, 10 s reconnect, rematch, 0 Tickets, no
    referee), following the migration-order rules in handoff.md. sproto-duel: generalize src/net transport,
    HubLobby, OnlineSession, SnapshotBuffer and RemoteInputBuffer for both games; src/shooter/net/protocol.js
    with its own NET_VERSION; commands at 30 Hz; 20 Hz quantized delta snapshots with sim events (target
    3 KB or less with 60 enemies and 100 projectiles; add a test that measures it); guest prediction and
    reconciliation of its own movement and aim; enemies interpolated 100 ms back; 250 ms of hitbox history
    and lag-compensated hitscan on the host; hitstop and pause off online; ?netsim=80 with a scripted
    co-op guest over FakeArenaServer. Write the owner's two-machine test steps in the PR.
P6  Menus, guest sessions, online count, 0 Tickets result screen, CI for the shooter tests and an opcode
    match test between client and server.

EACH PR DESCRIPTION
- What changed, which plan items it closes, the checks you ran and their results, measurements (sizes,
  fps, snapshot bytes), what Claude needs to QA, and anything the owner must do.
- Ask for review by another agent (Codex or Claude) as AGENTS.md says.

Start by telling me which phase is next and your plan for it, then do it.
```
