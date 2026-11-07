# Claude Code prompt: visuals, gameplay feel and QA

Start a Claude Code session in `~/games/sproto-duel` (or `~/games/sproto-shooter` until Cursor's P1 has merged) and paste this. Run one item per session.

```text
You own the visuals, gameplay-feel and QA track of the Sproto Shooter co-op plan.

READ FIRST
- The plan: COOP_PLAN.md in sproto-shooter, or sproto-duel/docs/shooter/COOP_PLAN.md after Cursor's P1
  merged. Sections 1, 5 and 6 are binding. Your items are 6.1 (weak zones), 6.3 (attack runner and every
  attack), the visual and QA rows of 6.5, the ownership table and the order in 6.6.
- ~/games/AGENTS.md and the repo's AGENTS.md. sproto-shooter/PLAN.md §1, §4.5, §4.8–4.11.
  research_notes/Smooth boss animation techniques/ for telegraph and recovery timing.
- sproto-duel/docs/higgsfield-workflow-guide.md before any 3D asset step.

RULES
- One item per branch and PR, branch claude/<slug>; never push to main. Use agent-task if available.
- Keep src/shooter/sim and data pure and deterministic (state.rng only, plain JSON state, a sim event for
  every attack start, hit and end) so online co-op needs no extra code.
- Only edit files the ownership table gives Claude. Cursor owns state, simulate, player, actions, waves,
  economy, targeting, Game, input and net.
- Don't change gun stats or the generator. Zone multipliers and enemy attack data are yours.
- Run typecheck, test, build and check:assets before each PR. Add tests for every sim change. Look at the
  result in the running game (screenshots in the PR) before calling anything done.
- Paid Higgsfield or Tripo steps need the owner's approval unless they said "skip approvals".

ITEMS (do the next unmerged one whose dependencies in 6.6 are met, then stop)
QA0  Parity pass after Cursor's P1: play solo Wave Mode, Boss Fight for every boss, Sandbox and Test Range in
     sproto-duel and compare with sproto-shooter main. Report differences as a checklist in Cursor's PR.
     Don't fix Cursor's code.
V1   Weak zones (6.1): head/weak/body/limb/shield zones, ZONES multiplier table per gun type with the boss
     cap, headByState, headshot and weak-point feedback (sound, marker, gold number, BONK pop, head-pop
     kill, weak-point glow), headshot stats and XP. Tests: zone priority, multipliers, time-to-kill table.
     Add a debug overlay that draws hitboxes, and check head hitboxes against the head bone in every
     enemy state.
V2   Attack runner (sim/attacks.js) and the new Midget, Flying Midget, Bitcoin Obama and Big Obama attacks
     from 6.3, each with telegraph pose, ground decal or trail, sound cue, hit effect and recovery pose.
     Tier and elite gates. Re-run the autopilot full-run test and keep it passing.
V3   Boss signature attacks with solo and co-op versions (needs Cursor's P3 targeting). Procedural poses in
     humanoidRig.js and dragonRig.js.
V4   Split-screen look and co-op UI on Cursor's per-view HUD containers: readable HUD at half height,
     teammate marker and name, downed state and revive ring, revive progress, "both downed" fail screen,
     per-player loot glow colors.
V5   Concept art intake: review ChatGPT images in art/concepts/ against the checklist in 6.4 (head and weak
     points readable at 30 m, distinct silhouette, obvious telegraph). Write the verdict per image. For
     approved model sheets, run the rigged 3D workflow from the Higgsfield guide and integrate the models
     with level-scoped loading.
QA gates  At the end of each Cursor phase: play it, test two players with a second pad and with
     ?netsim=80 and ?netsim=150, record fps from the perf overlay in solo and split-screen wave 3, and post
     a pass/fail checklist on the PR. You report problems; Cursor fixes its own code.

EACH PR DESCRIPTION
- What changed, plan items closed, checks and results, screenshots or short clips, time-to-kill table
  before and after (V1, V2), and what the owner should playtest.
- Ask for review by Codex (/codex:adversarial-review) or Cursor.

Start by telling me which item is next and your plan for it, then do it.
```
