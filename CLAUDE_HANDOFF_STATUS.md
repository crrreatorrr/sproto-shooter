# Handoff status: `sproto-shooter` (branch `claude/happy-pasteur-0dhfzp`)

Implements `CLAUDE_HANDOFF_OPTIMIZATION.md` under `CLAUDE_SESSION_BRIEF.md`. Every item was checked
against the code before it was changed. Diff base: `70734d4` (main `0d604fe` plus the two handoff docs).

**Pins and tripwires: unchanged.** Campaign fingerprint `73c6eb0f`, PvP fingerprint `e749d2fd`, PvP
golden `da423456`, director golden `a5828d8c`, `tests/fixtures/baseline-hashes.json` (Wave Mode and
Sandbox) and `tests/fixtures/boss-goldens.json` are untouched, and no file under `src/sim`, `src/data`,
`src/net`, `src/server` or `src/core` is edited (`git diff 70734d4 --stat -- src/sim src/data src/net
src/server src/core` is empty). The tests that check them pass (see Checks).

## Items

### Phase 0 (§1)

- **§1.1 Boot without waiting for `connectHub()`**: done (`bdf371a`). `startHub()` returns the `HubLink`
  at once in a `connecting` state; `src/main.js` builds the `Game` immediately and calls
  `game.attachHub(hub)` when the link settles. Campaign progress stays held through the window (the
  existing `hubVisitStarting()` hold; `Game` only follows a settled link). A pending owner has no Wave
  Mode loadout key, so nothing is read or written to the device copy meanwhile. The chip shows `Hub …`.
- **§1.2 `toy_duckgun.glb` off the title**: done (`9834588`). The sim places the Duck Gun
  (`placeSandboxLegendary`); changing that would move the Sandbox hashes. The renderer instead skips
  pickup gun models while the title backdrop is up (`renderer.titleBackdrop`) and loads them when a
  mode starts. Removed from `CRITICAL_ASSETS`; `profile:check` fails if the title requests it.
  Screenshots before/after: the title backdrop looks the same. Gate: `GATE.criticalTransferBytes`
  stays the 6 MiB plan cap that `tests/performance-baseline.test.js` pins; `MEASURED` is updated
  (`3ed6074`). Tightening the gate itself is the owner's call.
- **§1.3 No Nakama WebSocket on the title**: partial (`819119e`, `04a3ce6`). `shooter.version` goes over
  REST (`sdk.restRpc`, token refreshed like the realtime client) while no socket is open. When the
  hub's `shooter.version` carries `isGuest` / `wagerEligible`, the matchmaker probe is skipped
  (`serverGuestAnswer`). Remaining: until metaverse-hub ships those fields, a named (non-guest) account
  on a wager-enabled hub still gets the probe, which opens the socket. Blocked on metaverse-hub.
- **§1.4 Kit prop loader and leak**: done (`c7d03bf`, `a76af59`). One module-scoped `GLTFLoader`. Level
  props are retained per level (`kitProp` / `kitPropScope`) and released when the level changes or the
  campaign is left; eviction now disposes a kit model's merged geometry (before, an evicted kit model
  would have leaked GPU buffers). `tests/kit-prop-refs.test.js` checks the counts return to 0.
  Not done: `MeshoptDecoder` on the kit loader; the kit files load without it, so it changes nothing.

### Phase 1 (§2)

- **§2.1 Code split**: done (`62cd225`, `a76af59`, `b1bfe18`, `04a3ce6`).
  - Campaign levels: the browser build resolves `src/data/levels/campaign.js` to menu stubs
    (`src/game/campaignLevelStubs.js`); `Game.start('campaign')` fetches the level's chunk, installs
    it, then starts. Vitest, Node and the esbuild server bundles keep the eager file, so data and
    hashes cannot change. `tests/campaign-lazy.test.js` checks the stubs match the levels.
  - Rewarded campaign (`VITE_SHOOTER_REWARDED`) and the server checks it imports: loaded only when
    enabled, after every level (`serverManifest.js` validates all levels at import). Checked in a
    `VITE_SHOOTER_REWARDED=true` build: the title shows the Rewarded campaign button, 3 of 3 loads.
  - `src/hub/wagers.js`: loaded when a bankable visit needs the offer or the desk.
  - Campaign level renderer (`levelView.js` and dressing tables, 94 KB): loaded on the first campaign
    frame, warmed when a campaign start is requested.
  - three.js: its own chunk (`manualChunks`), cached across game deploys.
  - Target <180 KB gzip for the Game chunk: reached 191 KB (from 492 KB). The rest is sim, UI and
    renderer code the title runs.
- **§2.2 Renderer**: partial (`64a3587`, `554a883`).
  - Done: no throwaway WebGL context on a hardware GPU; the renderer reads `UNMASKED_RENDERER_WEBGL`
    from its own context and only a software rasterizer creates a second, non-multisampled one.
  - Done: the Free 1v1 floor loads through `assets.js` (cached, held while the arena lives).
  - Skipped: rendering PvP through the main `WebGLRenderer`. The two-client mock draws two arena
    canvases side by side, and the feedback capture reads each canvas, so one renderer would need an
    offscreen render-and-copy redesign of `src/render/pvp`. Too large to do safely in this pass.
  - Skipped: `renderer.compileAsync`. Its benefit needs a GPU with `KHR_parallel_shader_compile`
    (SwiftShader compiles synchronously, so nothing here can measure it), and using it well means
    holding objects back until compiled, which changes presentation.
- **§2.3 Assets**: partial (`4c9fc89`, `57af558`).
  - Done: stage textures decode with `createImageBitmap` (flipped at decode, not premultiplied) where
    it honours `imageOrientation`; Safari and Firefox < 98 keep the `<img>` path (three's GLTFLoader
    rule). Campaign spot-check screenshots look the same.
  - Done: Bungee and Baloo 2 self-hosted (`src/assets/fonts`, OFL 1.1 licences alongside): the same
    latin and latin-ext WOFF2 subsets Google serves. Title screenshots identical.
  - Skipped: per-level kit packs. A level requests 14 to 27 kit files in its first section (L01 14,
    L03 27, L05 18; 280 files, 2.6 MB total). Packing them needs either duplicate bytes in `dist/`
    (which would pass the 29.4 MB static-ship gate) or deleting the 280 runtime files and reworking
    `scripts/asset-report.mjs`, the asset manifest and `kitPropPaths.js`. That is an asset-pipeline
    change for its own PR. Proposal: pack by theme prefix (grove 42, frost 34, void 33, landing 23,
    office 21, ...) into one gzipped container of raw GLBs plus an offset table, parse each prop by
    slice with the shared loader, and drop the per-prop files.
- **Budget accounting** (`54c1474`): `criticalTransferBytes` / `criticalRequests` counted every chunk in
  `dist/`; they now count what the title loads (`titleChunks()`), plus the title fonts, and
  `profile:check` fails on an unexpected or missing title chunk.

### Phase 2 (multiplayer and online)

The handoff has no separate multiplayer items for this repo. Its online pieces are §1.3 (partial,
above) and the PvP part of §2.2 (partial, above). Nothing else to do here.

### Phase 3 (§3)

- **§3.1 Bundle pin decoupled from `HEAD`**: done (`fcff929`, `fd88a1e`). `build-server-sim.mjs` bakes
  the last commit that changed a hub sim path (`src/sim`, `src/server`, `src/net`, `src/data`,
  `src/core`, the build script), so client-, asset- and doc-only commits rebuild identical bytes. It
  falls back to `HEAD` in a shallow clone that cannot see that commit (the hub's depth-1 re-vendor,
  so `scripts/revendor-shooter-pvp.mjs` keeps working), with uncommitted sim edits, or to
  `SHOOTER_SIM_COMMIT`. The build fails if a bundle input is outside those paths. Pins gain
  `sourceContentHash` (sha256 of the bundle inputs) for the hub to key on later. Proof: building with
  `SHOOTER_SIM_COMMIT=1fd01820…` reproduces the hub's vendored `shooter-sim.js` byte for byte
  (sha256 `7ba57e4214ce5b9b69dd00b78fd9cd36c6d08049bb0495cb9cf94faee0077f2e`). The hub's
  `scripts/shooter-main-pin.mjs` already accepts a shooter `main` ahead of its pin with no sim-path
  changes, so no hub change is required. AGENTS.md updated to match.
- **§3.2 Shared Sproto assets / repo bloat**: partial.
  - Blocked: the shared asset mount on metaverse-hub does not exist yet; nothing depends on it.
  - Done (verified, no change needed): `dist/` ships no `.blend`, `.mp4`, `art/` or screenshot files,
    and `npm run budgets` fails if one appears.
  - Repo hygiene: proposed below for the owner; nothing deleted.

### Review

A fresh subagent reviewed `git diff 70734d4..HEAD` without my notes. Fixed (`04a3ce6`): the rewarded
campaign imported its server checks in parallel with the level chunks and could fail to load in the
browser build; `wagerEligible:false` was ignored when `isGuest` was present; an HTTP version-mismatch
error lost its "out of date" notice. Not changed (low impact, noted): a level picked on a very slow
link starts after the click's user activation has expired, so pointer lock may need one more click;
the level renderer chunk can arrive a moment after the first campaign frame on a slow link.

## Checks

Chromium: Playwright 1.65 wants build 1254, which cannot be downloaded here (`cdn.playwright.dev` is
blocked by the network policy). The preinstalled 1243 works through `PLAYWRIGHT_BROWSERS_PATH=<dir>`
with `chromium-1254` and `chromium_headless_shell-1254` symlinked to `/opt/pw-browsers/*-1243`. Go
1.24 is installed; `go run` fetched 1.26 for the goja goldens.

| Command | Baseline (`70734d4`) | Final |
| --- | --- | --- |
| `npm ci` | ok | ok |
| `npm run lint` | ok | ok |
| `npm run typecheck` | ok | ok |
| `npm test` | 17 failed / 1028 passed (Chromium could not launch; `checkpoint-corpus` timing) | 123 files / 1,079 passed, 1 skipped, 0 failed (`npm test -- --no-file-parallelism`, as CI runs it, at `3ed6074`) |
| `npm run build` | ok | ok |
| `npm run assets:check` | ok (395 files) | ok (395 files, 0 missing, 0 unused) |
| `npm run budgets` | ok | ok |
| `npm run profile:check` | ok (with the Chromium symlink) | ok |

Timing-sensitive tests: under load (builds and browsers running beside the suite) the Goja replays fail
their CPU budgets (`cpu_budget`, `execution_timeout`) and some browser tests time out; run serially
(the final run above) everything passes. One case in `tests/hub/reward-ui-browser.test.js` ("actual UI
drains old actions…", a 1 s `expect.poll`) failed on the untouched baseline in a parallel run and
passed in the final serial run; it is timing-sensitive, and CI excludes that file.

## Measurements

| Title boot | Before | After |
| --- | --- | --- |
| Game chunk, raw / gzip | 1,623 KB / 492.3 KB | 547 KB / 191.0 KB (+ three.js 760 KB / 197.5 KB, cacheable) |
| JS the title loads, gzip | 521 KB (4 files) | 418 KB (5 files) |
| `criticalTransferBytes` (`npm run budgets`) | 3,805,685 | 2,998,636 |
| `criticalRequests` | 20 (+3 third-party font requests) | 17 (no third-party) |
| `titleShellGzipBytes` | 10,456 | 10,733 |
| `staticShipBytes` | 28,850,413 | 29,002,281 (gate 29,425,664) |
| Cold profile: requests (first-party) | 17 (14) | 16 (16) |
| Cold profile: bytes transferred | 5,024,705 | 4,003,054 |
| Cold profile: title visible | 1,240 ms | 673 ms |
| Cold profile: load event | 1,118 ms | 521 ms |
| Cold profile: worst frame (advisory) | 867 ms | 2,533 ms |

Profile: `npm run profile` (3 runs, 10 Mbps / 100 ms RTT / 4x CPU, SwiftShader, cold median). Frame
times are advisory, as the script says: about 8 frames in a 5 s SwiftShader sample. The worse worst
frame is the first-render shader compile, which now lands inside the sample window because the title
appears 570 ms sooner; nothing in the frame loop changed. Campaign level entry: L01 14, L03 27, L05 18
kit files in the first 15 s (unchanged).

Server-sim bundles (`npm run build:server-sim`; both bake `fcff929`, the last sim-path commit):

| Bundle | sha256 | fingerprint | sourceContentHash |
| --- | --- | --- | --- |
| `build/shooter-sim.js` | `a71250cde0f89aeb6d84e87d298fb4a6cffee4addb3f888051fdca86a94df209` | `73c6eb0f` | `38610326…eb82ae` |
| `build/shooter-pvp-sim.js` | `59aae3bbf39841cae33dbf5a123668e9cdf18f506ef7945222836b651cbef8af` | `e749d2fd` | `fbdb54a8…da2e2d` |

The hub currently vendors `shooter-sim.js` at `1fd0182` (sha256 `7ba57e42…`); the bytes differ only in
the baked commit, because this branch edits the build script.

## Cross-repo follow-ups

- **metaverse-hub**: add `isGuest` and `wagerEligible` booleans to `shooter.version`
  (`server/modules/src/games/shooter_match.ts`, `rpcVersion`). The game uses them when present and
  falls back to the matchmaker probe when absent.
- **metaverse-hub**: this branch edits `scripts/build-server-sim.mjs`, a hub sim path, so after it
  merges the hub needs one re-vendor at the merge commit, and `SUPPORTED_MANIFEST` in
  `src/hub/campaignRewards/clientProtocol.js` here must then name that commit and sha. After that,
  merges that touch no sim path keep the same bundle bytes and need no re-vendor.
- **metaverse-hub** (optional): key the vendored-bundle check on the pins' new `sourceContentHash`.
- **metaverse-hub**: the shared `/shared-assets/sproto/` origin (§3.2); this repo can then load shared
  rigs and stage textures from it.
- **hub-sdk**: not re-vendored, as the brief asked. No SDK change is needed for this branch.

## Proposed repo hygiene (owner decides; nothing deleted)

Tracked non-runtime files: `art/` 128 MB and `tests/fixtures/screenshots/` 16 MB (142.7 MB in total).
The largest: `art/blender/weapon_animations.blend` 46.6 MB, `new_enemies.blend` 41.5 MB,
`boss_animations.blend` 19.2 MB, `grappler.blend` 2.5 MB, `art/blender/previews/*.mp4` about 7 MB,
`art/reference/` 3.8 MB. Proposal: move `art/blender/*.blend` and `art/blender/previews/` to Git LFS
or an external archive; keep `art/blender/scripts/` (small, used to rebuild the kit); keep the
screenshot fixtures that tests read, and move the rest to CI artifacts. Moving files out of history
needs a history rewrite, which is not done here.
