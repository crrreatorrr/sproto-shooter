# Sproto Shooter

A first-person loot shooter in Three.js and plain JavaScript, built with Vite and tested with
Vitest. It has Wave Mode, a ten-level campaign, boss fights and a Free 1v1 arena. `README.md`
describes the modes, controls and code layout. `PLAN.md` is the architecture plan, `docs/codex/`
holds the campaign specs, and `docs/shooter-server-contract.md` and `docs/shooter-pvp-protocol.md`
are the hub contracts.

- `src/sim` and `src/data` stay pure: no `three`, no DOM, no `Math.random`, `Date.now` or
  `performance.now`. `tests/architecture.test.js` checks this.
- Pins and tripwires. Change these numbers only on purpose, and say so in the PR:
  - Campaign content fingerprint `3c657fb5` (`contentFingerprint(1)` in
    `src/data/serverManifest.js`; `tests/pvp-sim.test.js`, `tests/fixtures/boss-goldens.json`). It
    covers boss, encounter, gun, part, element, spell and tuning data.
  - PvP content fingerprint `f5949631` (`CONTENT_FINGERPRINT` in `src/sim/pvp/rules.js`).
  - PvP golden state hash `ce272de1` (`scriptedMatch(7, 180)`, `GOLDEN_HASH` in
    `tests/pvp-sim.test.js`).
  - Wave Mode and Sandbox hashes in `tests/fixtures/baseline-hashes.json`
    (`tests/levels/baseline.test.js`).
- Never edit `src/sim/pvp/`, `src/net/inputCodec.js`, `src/net/protocol.js` or `src/server/`
  without rebuilding and re-pinning. `npm run build:server-sim` writes `build/shooter-sim.js`
  (campaign verifier, global `SprotoShooterSim`) and `build/shooter-pvp-sim.js` (Free 1v1,
  global `SprotoShooterPvp`), each with a `.pin.json`. metaverse-hub vendors the campaign bundle
  into `server/modules/vendor/` and checks it with `scripts/check-shooter-sim-version.mjs`. Both
  bundles also pull in shared `src/sim`, `src/data` and `src/core` modules.
- The bundles bake in the commit (`git rev-parse HEAD`), so their sha256 changes with every
  commit. The hub's check requires its pinned commit to equal this repo's `main`, so every merge
  here needs a hub re-vendor before hub CI passes again.
- `vendor/hub-sdk` comes from `metaverse-hub` (`node scripts/vendor-sdk.mjs` in that repo). The game
  imports the ESM build. The classic IIFE (global `HubSDK`) and `SOURCE.pin.json` come from the same
  commit. Update `VENDOR.md` and `SOURCE.pin.json` together.

## Checks

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run assets:check
npm run budgets
npm run profile:check
```

`npm test` runs the goja goldens with `go run`, so it needs Go. `tests/fixtures/goja/go.mod`
asks for Go 1.26; an older Go downloads 1.26 by itself unless `GOTOOLCHAIN=local` is set.
`npm test` and `npm run profile:check` also need Playwright's Chromium (`npx playwright install
chromium`, which CI runs).

## Art generation

Follow `docs/higgsfield-workflow-guide.md`. This repo uses the **rigged 3D character** workflow. If the owner says to skip approvals, follow that section of the guide.

## Working with other agents

Claude Code, Codex, Cursor and Grok Bot all work on this repo.

- Start each task on its own branch from the latest `main`, named `<agent>/<slug>`. Never push to
  `main`; open a pull request.
- On the owner's machine, `agent-task new sproto-shooter <slug> --agent <name>` creates that branch
  in its own worktree.
- Don't edit files that another active task is changing.
- Run the checks before opening a pull request, and report any you could not run.
- A different agent reviews the work: `agent-task review <path>`, or `/codex:adversarial-review` in
  Claude Code.
