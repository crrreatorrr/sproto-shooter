# Session brief: optimization handoff implementation

You are one of nine parallel Claude Code sessions implementing the load-time, security and multiplayer handoffs across the Sproto metaverse game repos. An orchestrating session coordinates the nine. It will read your pushed branch and your status file. Work only in this one repository.

## Setup
- You are on branch `claude/happy-pasteur-0dhfzp`, which is `main` plus the handoff doc `CLAUDE_HANDOFF_OPTIMIZATION.md` (from `claude/boot-load-optimization-handoff`) and this brief, `CLAUDE_SESSION_BRIEF.md`. Do all work on this branch. Push only to it with `git push -u origin claude/happy-pasteur-0dhfzp`, retrying network failures with backoff. Never push to `main` or any other branch, never force-push and never rewrite history. Do not open a pull request; the owner will ask for those separately. This overrides any "open a PR" or "push to main" line in AGENTS.md or in the handoff.
- Before you change anything, read `AGENTS.md` (and any file it imports) and `CLAUDE_HANDOFF_OPTIMIZATION.md` in full. Where they conflict, the AGENTS.md hard rules win.

## How to treat the handoff
- Another agent wrote it from a static read. Line numbers, sizes and some claims may be stale or wrong. Verify each item against the code before acting on it. If an item is wrong, already done, unsafe, or would change gameplay, skip it and record why.
- Gameplay, balance, roster, levels, determinism and pinned hashes must not change unless a handoff item explicitly calls for the change and AGENTS.md allows it. Existing golden and replay tests must keep passing.
- Generate no new art: no Higgsfield and no image generators. You may re-encode existing assets (WebP, meshopt/KTX2, texture downscaling, decimation, audio transcoding) only when the result looks or sounds the same at game resolution. Spot-check before and after, for example with screenshots from the preinstalled Playwright Chromium.
- Do not delete archived authoring, reference or QA material from the git tree. Exclude it from builds and `dist/` instead, and list proposed repo-hygiene deletions in the status file for the owner to decide. You may delete runtime files only after proving they are unreferenced (grep, then build and tests).
- Make no production deploys and no changes to live infrastructure, and commit no real keys or secrets.
- Do not edit other repositories. Where an item needs work in another repo, build your side so it works whether or not the other side has landed (feature-detect, with a fallback), and record the dependency. You may read the other repos through the GitHub MCP tools (owner `crrreatorrr`). The other sessions push to `claude/happy-pasteur-0dhfzp` in their repos.
- Do not re-vendor `hub-sdk` from metaverse-hub in this pass. The hub's SDK changes are unmerged. Make game-side fixes that do not depend on them.

## Order of work
Work in phases. Commit and push at the end of each phase, so earlier phases land even if you run out of time.
- Phase 0: the P0 security fixes, bug fixes and quick wins listed below for this repo.
- Phase 1: the asset and cold-boot items.
- Phase 2: the multiplayer and online items.
- Phase 3: the remaining P2/P3 items, as far as they can be taken safely.
Commit each logical change separately, with a clear message. After each phase, run the repo's checks (the "Checks" section of AGENTS.md) and fix whatever you broke. If a check cannot run here (missing service, network or toolchain), record exactly which check and why. Measure before and after for every load-time claim, such as `dist/` byte counts and the number of requests at boot through Playwright, and record the numbers.

## Status file
Keep `CLAUDE_HANDOFF_STATUS.md` at the repo root and commit it with each phase. Give every handoff item one line marked done (with the commit sha), partial (with what remains), skipped (with why) or blocked (with which repo or what it waits on). Also include the check results with their commands, the before/after measurements, and a "Cross-repo follow-ups" section listing things like a hub re-vendor or re-pin, or an SDK re-sync.

## Finish
When you are done, or can go no further, review your full diff against `main` (use /code-review if it is available) and fix the real findings. Then push, and end with a short summary: which phases are complete, which items are done, skipped or blocked, the check results, and the follow-ups.

# Repository: crrreatorrr/sproto-shooter (handoff branch claude/boot-load-optimization-handoff)

Respect every pin and tripwire in AGENTS.md: the campaign fingerprint `73c6eb0f`, the PvP fingerprint `e749d2fd`, the PvP golden `da423456`, and the Wave/Sandbox baseline hashes. None of the load-time work should move them. If an item would move one, skip it. `src/sim` and `src/data` stay pure.

## Phases for this repo
- Phase 0, §1: unblock boot from `connectHub()`, drop `toy_duckgun.glb` from the title sandbox, and fix the kit-prop leak and the per-prop `GLTFLoader` allocation.
  - For §1.3 (no Nakama WebSocket on the title screen): the metaverse-hub session is adding `isGuest` and `wagerEligible` booleans to the REST `shooter.version` response. Use them when present, and keep the current behaviour when they are absent.
- Phase 1, §2: code-split the campaign levels and mode subsystems, reuse the single WebGLRenderer in PvP and remove the throwaway context, off-thread texture decoding, self-hosted fonts, and bundled kit packs. Measure the boot JS, bytes and requests before and after.
- Phase 3, §3:
  - §3.1, decoupling the bundle pin from `git rev-parse HEAD`, also needs a matching change to the hub's `scripts/check-shooter-sim-version.mjs`. Build it so that the current hub check keeps working, or record clearly what the hub must change.
  - §3.2: the shared Sproto asset mount does not exist yet. Do not depend on it. Exclude raw art and screenshots from `dist/` and list the repo-hygiene proposal for the owner.
- Checks: the full list in AGENTS.md. `npm test` needs Go and Playwright Chromium; the Chromium preinstalled at `/opt/pw-browsers/chromium` can be used through `executablePath` if the pinned Playwright version differs.
