# Handoff status: `sproto-shooter` (branch `claude/happy-pasteur-0dhfzp`)

Implements `CLAUDE_HANDOFF_OPTIMIZATION.md` under `CLAUDE_SESSION_BRIEF.md`. Every item was checked
against the code before it was changed. No pinned hash or fingerprint moved (campaign `73c6eb0f`,
PvP `e749d2fd`, PvP golden `da423456`, director golden `a5828d8c`, `tests/fixtures/baseline-hashes.json`).
`src/sim`, `src/net`, `src/server` and `src/sim/pvp` are not edited.

## Items

### Phase 0 (§1)

- **§1.1 Boot without waiting for `connectHub()`**: done (`bdf371a`). `startHub()` returns the `HubLink`
  at once in a `connecting` state; `src/main.js` builds the `Game` immediately and calls
  `game.attachHub(hub)` when the link settles. Campaign progress is held through the window: the
  existing `hubVisitStarting()` hold in `src/save/progress.js`, and `Game` only calls `followHub` on a
  settled link. A pending owner gives no Wave Mode loadout key, so nothing is read or written to the
  device copy meanwhile. The account chip shows `Hub …` while connecting.
- **§1.2 Drop `toy_duckgun.glb` from the title**: done (`9834588`). The Duck Gun is placed by the sim
  (`placeSandboxLegendary`), so changing that would move the Sandbox hashes. Instead the renderer skips
  pickup gun models while the title backdrop is up (`renderer.titleBackdrop`); the pickup keeps its
  built-in mesh behind the menu and the model loads when any mode starts. Removed from
  `CRITICAL_ASSETS`; `profile:check` now fails if the title requests it. Screenshot spot-check: the
  title backdrop looks the same (the pickup sits at the screen edge under its legendary beam).
  The budget ceiling (`GATE.criticalTransferBytes`) is still the 6 MiB plan cap that
  `tests/performance-baseline.test.js` pins; `MEASURED` is updated with the Phase 1 profile.
- **§1.3 No Nakama WebSocket on the title**: partial (`819119e`). `shooter.version` now goes over the
  REST client (`sdk.restRpc`, token refreshed like the realtime client) while no socket is open. When the
  hub's `shooter.version` carries `isGuest` / `wagerEligible`, the matchmaker probe is skipped
  (`serverGuestAnswer`), so a signed-in title opens no socket. Remaining: until metaverse-hub ships
  those fields, a named (non-guest) account on a wager-enabled hub still gets the probe, which opens
  the socket. Guests (blank `usn`) were already skipped. Blocked on metaverse-hub (see follow-ups).
- **§1.4 Kit prop loader and leak**: done (`c7d03bf`). One module-scoped `GLTFLoader` for all kit files.
  Level props are retained per level (`kitProp` / `kitPropScope`) and released when the level changes or
  the campaign is left; eviction now disposes a kit model's merged geometry (it did not before, so an
  evicted kit model would have leaked GPU buffers). Pickups, bombs and effects stay pinned as before.
  `tests/kit-prop-refs.test.js` checks the counts go back to 0. Not done: `MeshoptDecoder` on the kit
  loader. The kit files load today without it, so adding it changes nothing.

## Checks

Commands from AGENTS.md. Chromium: the pinned Playwright 1.65 wants build 1254, which cannot be
downloaded here (`cdn.playwright.dev` is blocked by the network policy). The preinstalled 1243 works:
`PLAYWRIGHT_BROWSERS_PATH=<dir>` with `chromium-1254` and `chromium_headless_shell-1254` symlinked to
the `/opt/pw-browsers/*-1243` folders. Go 1.24 is installed; `go run` fetched 1.26 for the goja goldens.

| Check | Baseline (untouched `main` + handoff docs) | Phase 0 |
| --- | --- | --- |
| `npm ci` | ok | ok |
| `npm run lint` | ok | ok |
| `npm run typecheck` | ok | ok |
| `npm test` | 17 failed / 1028 passed: all Chromium launches (no download), plus `checkpoint-corpus` | 9 failed / 1065 passed, see below |
| `npm run build` | ok | ok |
| `npm run assets:check` | ok (395 files) | ok |
| `npm run budgets` | ok | ok |
| `npm run profile:check` | ok (with the Chromium symlink) | ok |

Phase 0 `npm test` failures were all CPU-time budgets in the Goja and browser replays
(`cpu_budget`, `execution_timeout`, a 90 s browser wait), from a run that shared the machine with
builds and browser screenshots. `checkpoint-corpus` also failed on the baseline. Re-run alone at
`c7d03bf` (`--no-file-parallelism`): `goja-goldens` and `checkpoint-corpus` pass. In
`reward-ui-browser` a different case failed that time (a 1 s `expect.poll` on a mocked append) after
passing in the full run, so it is timing-sensitive; the same file is being run on the untouched base
for comparison (result in the Phase 1 section).

## Measurements

Title boot, `npm run budgets` (gzip level 6, first-party):

| | Baseline | After Phase 0 |
| --- | --- | --- |
| criticalTransferBytes | 3,805,685 | 3,099,294 |
| criticalRequests | 20 | 19 |
| titleShellGzipBytes | 10,456 | 10,486 |

Baseline load profile (`node scripts/load-profile.mjs --runs 3`, 10 Mbps / 100 ms / 4x CPU, cold
median): 17 requests (14 first-party), 5,024,705 bytes transferred, title visible 1,240 ms,
`maxMs` frame 866.7 ms. The title requested `toy_duckgun.glb` (707,356 bytes) last.

## Cross-repo follow-ups

- **metaverse-hub**: add `isGuest` and `wagerEligible` booleans to the `shooter.version` RPC response
  (`server/modules/src/games/shooter_match.ts`, `rpcVersion`). The game uses them when present and falls
  back to the matchmaker probe when absent.
- **metaverse-hub**: the usual re-vendor of `build/shooter-sim.js` after this branch merges (the bundle
  bakes the commit).

## Proposed repo hygiene (owner decides)

To be filled in with Phase 3.
