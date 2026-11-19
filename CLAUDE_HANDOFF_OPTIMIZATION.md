# Claude Code Implementation Handoff — `sproto-shooter`

**Branch:** `claude/boot-load-optimization-handoff`  
**Scope:** Unblock 3D boot from `connectHub()` network waterfall, shrink the monolithic 1.11 MB `index-Game-*.js` chunk via code-splitting, remove the title-screen Duck Gun & WebSocket wager probe, eliminate duplicate WebGL contexts in PvP, fix the campaign kit prop memory leak & 280-request waterfall, decouple server-sim SHA pinning from `HEAD`, and archive 139 MB of `.blend`/screenshot Git bloat.

---

## 0. Hard Invariants & Pinning Rules (`AGENTS.md`)

- `src/sim/` and `src/data/` MUST remain strictly pure JS (zero Three.js, DOM, `Math.random`, `Date.now`, or `performance.now` — verified by `tests/architecture.test.js`).
- **Do NOT unintentionally change pinned hashes/fingerprints** unless explicitly intended and noted in the PR:
  - Campaign content fingerprint: `73c6eb0f` (`src/data/serverManifest.js`)
  - PvP content fingerprint: `e749d2fd` (`src/sim/pvp/rules.js`)
  - PvP golden state hash: `da423456` / director golden: `a5828d8c` (`tests/pvp-sim.test.js`)
  - Wave Mode & Sandbox hashes (`tests/fixtures/baseline-hashes.json`)
- **Important:** None of the client boot, code-splitting, renderer, or asset fixes in §1–§2 need to change simulation behavior! Keep `src/sim/**` and `src/data/serverManifest.js` behavior bit-identical.
- If `scripts/build-server-sim.mjs` or `src/server/` is edited (§3.1), run `npm run build:server-sim` and coordinate the re-vendor PR in `metaverse-hub` (`scripts/check-shooter-sim-version.mjs`).

---

## 1. P0 — Immediate Cold-Boot & Memory Leak Fixes

### 1.1 Unblock Game Boot from `connectHub()` Network Waterfall
- **Files:** `src/main.js:29-34`, `src/game/Game.js`
- **Current Problem:** `src/main.js:29-34` runs `await Promise.all([import('./hub/link.js'), import('./game/Game.js')])`, **then blocks `new Game(...)` on `const hub = await connectHub()`**. On every hub portal launch (`/#t=<ticket>`), `authenticateCustom`, `profile.get`, and IndexedDB outbox drain serialize *before* WebGL initializes or critical 3D assets even start downloading.
- **Exact Changes:**
  1. Instantiate `new Game(...)` and start critical 3D boot immediately after `Game.js` imports (passing a pending/offline-capable `hub` handle or `hubPromise`).
  2. Resolve `connectHub()` asynchronously in parallel; once settled, call `game.attachHub(hub)` to update the account chip, `campaignProgress.followHub(hub)`, feedback installer, and wager offer availability.
  3. Ensure `campaignProgress` holds device writes while `hubVisitStarting('sproto-shooter')` is true so device progress never leaks into a hub account during the async window.

### 1.2 Remove `toy_duckgun.glb` (690 KB) from the Title Sandbox
- **Files:** `src/game/Game.js:131-132`, `scripts/check-budgets.mjs:69-79`
- **Current Problem:** The live title-screen sandbox spawns a Duck Gun pickup (`toy_duckgun.glb`, **690 KB** = **~18%** of the 3.76 MB critical transfer budget) that is never needed until Sandbox/Test mode is entered.
- **Exact Changes:**
  1. Defer spawning the Duck Gun pickup in `src/game/Game.js:131-132` until the player enters Sandbox or Test Range mode.
  2. Update `scripts/check-budgets.mjs` critical-asset list & tighten the critical transfer budget ceiling accordingly.

### 1.3 Stop Opening a Nakama WebSocket & Dummy Matchmaker Probe on the Title Screen
- **Files:** `src/game/Game.js:884-949, 1034-1052`, `src/hub/wagers.js`, `src/hub/link.js`
- **Current Problem:** On every authenticated hub visit to the title screen, `refreshWagerOffer()` calls `wagerFlow.refresh()`, which opens a full **Nakama WebSocket** (`wagerRealtime() -> rt.connect()`), calls `shooter.version`, then fetches `getTicketBalance()` AND sends a dummy matchmaker probe (`wagerGuestProbe()`) just to detect `wager_guest`.
- **Exact Changes:**
  1. Query `shooter.version` via **HTTP REST RPC** (`sdk.rpc` / `client.rpc`) instead of opening a WebSocket on the title screen.
  2. Read guest status directly from the JWT `usn` claim (already known locally by `HubLink`) and/or the `wagerEligible` flag returned by `shooter.version` (coordinated with `metaverse-hub`), eliminating `wagerGuestProbe()` and deferring `rt.connect()` until the player actually clicks "Find match" or "Wager".

### 1.4 Fix Campaign Kit Prop Memory Leak & Per-Prop `GLTFLoader` Allocation
- **File:** `src/render/level/kitModels.js:32-33, 81`
- **Current Problem:**
  1. `kitModels.js:32-33` allocates a fresh `new GLTFLoader()` on **every single prop** (up to 280 `.glb.gz` files across campaign levels).
  2. `kitModels.js:81` calls `retainAsset(path)` upon completion and **never** calls `releaseAsset(path)` on level unload—permanently pinning all loaded campaign kit meshes outside `loadControl`'s 96 MiB eviction cap!
- **Exact Changes:**
  1. Share a single module-scoped `GLTFLoader` instance (with `MeshoptDecoder` configured once).
  2. Track active level prop handles in a `Set` on the current level view and call `releaseAsset(path)` for every unreferenced prop during level teardown/transition.
  3. Add a Vitest test asserting ref counts drop back to 0 when unloading a campaign level.

---

## 2. P1 — Code-Splitting, Single WebGL Context & Asset Pipeline

### 2.1 Code-Split Campaign Levels (`436 KB` Raw JS) & Mode Subsystems Out of `index-Game-*.js`
- **Files:** `src/data/levels/campaign.js`, `src/game/Game.js`, `vite.config.js`
- **Current Problem:** `index-Game-*.js` is **1,114 KB raw (~312 KB gzip)** — taking **1,086 ms** download + ~300 ms parse on 10 Mbps / 4× CPU before the first 3D asset even begins fetching! It statically bundles all 10 campaign levels (`L01`–`L10`, **436 KB raw**, e.g. `L03` 108 KB, `L05` 100 KB, `L04` 88 KB), `wagers.js`, `campaignRewards/*`, and Three.js into one initial chunk.
- **Exact Changes:**
  1. Convert `src/data/levels/campaign.js` level registry to dynamic `import('./L01.js')`…`import('./L10.js')` loaders (keeping lightweight metadata `{ id, name, bossId, par }` eager for menu display; verify pure `src/server/verify.js` build still statically bundles levels via esbuild).
  2. Dynamically `import()` `src/hub/wagers.js` and `src/hub/campaignRewards/*` only when Wager or Rewarded Campaign mode is engaged.
  3. Split `three` into a dedicated immutable vendor chunk in `vite.config.js` (`manualChunks`) so game updates don't bust the Three.js browser cache.
  4. **Target:** Cut initial `index-Game-*.js` chunk from **~312 KB gzip → <180 KB gzip**.

### 2.2 Reuse the Single `WebGLRenderer` in PvP & Remove Throwaway `softwareWebGL()` Context
- **Files:** `src/render/core/RenderContext.js:5-15`, `src/render/pvp/view.js:48, 90-91`, `src/render/renderer.js`
- **Current Problem:**
  1. `softwareWebGL()` (`RenderContext.js:5-15`) synchronously creates and destroys a throwaway WebGL2 context at boot just to read `UNMASKED_RENDERER_WEBGL`.
  2. Entering PvP (`src/render/pvp/view.js:48`) spawns a **2nd `THREE.WebGLRenderer`** (`preserveDrawingBuffer: true`) while keeping the main game context alive (Two-Client Mock creates **3 simultaneous WebGL contexts**), and bypasses `assets.js` by calling `new THREE.TextureLoader()` directly for `city/floor.jpg` (`view.js:90-91`).
  3. Zero `renderer.compileAsync()` usage causes first-spawn shader hitches (cold `maxMs: 2,416 ms` in `load-profile.json`).
- **Exact Changes:**
  1. Detect software WebGL by reading `WEBGL_debug_renderer_info` directly from the **primary** `WebGLRenderer`'s `gl` context once created (no throwaway context).
  2. Refactor `src/render/pvp/view.js` to render the PvP scene using the shared primary `WebGLRenderer` (pausing/swapping the active scene) and load `city/floor.jpg` through `src/render/assets.js`.
  3. Call `await renderer.compileAsync(scene, camera)` during stage/PvP transitions before dropping the loading overlay.

### 2.3 Off-Thread Texture Decoding, Self-Hosted Fonts & Bundled Campaign Kit Packs
- **Files:** `src/render/assets.js:100-104, 187-202`, `index.html:9`, `scripts/` (new kit packer), `public/assets/models/props/`
- **Exact Changes:**
  1. In `src/render/assets.js:loadTexture`, decode fetched image blobs via `createImageBitmap(blob)` (creating `new THREE.Texture(bitmap)`) instead of `ObjectURL` + main-thread `THREE.TextureLoader`.
  2. Self-host WOFF2 subsets of `Bungee` and `Baloo 2` under `public/assets/fonts/` (eliminating the render-blocking `fonts.googleapis.com` stylesheet in `index.html:9`, saving ~120 ms cold boot).
  3. Pack the **280 individual `.glb.gz` campaign kit props** (`public/assets/models/props/`) into **per-level merged `.glb.gz` packs** (or 1–2 themed packs loaded once and sliced by node name), cutting campaign level-entry HTTP waterfalls and `DecompressionStream` invocations dramatically.

---

## 3. P2 — Platform Coupling, Shared Assets & Git Repo Hygiene

### 3.1 Decouple Server-Sim Bundle Pinning from `git rev-parse HEAD`
- **File:** `scripts/build-server-sim.mjs`
- **Current Problem:** `build-server-sim.mjs` bakes `git rev-parse HEAD` into `shooter-sim.js` and `shooter-pvp-sim.js`, changing their SHA-256 on *every* commit (even pure UI/CSS/doc commits) and forcing a `metaverse-hub` re-vendor to keep hub CI green (`AGENTS.md:33-35`).
- **Exact Changes:** Coordinate with `metaverse-hub`'s `scripts/check-shooter-sim-version.mjs` to key bundle freshness on a deterministic hash of sim/server input files (`contentHash`, matching `peoples-bitcoin`'s `scripts/simHash.mjs` pattern) rather than `git rev-parse HEAD`.

### 3.2 Deduplicate Shared Sproto Assets With `sproto-duel` & Archive 139 MB of Raw Art/Screenshots
- **Files:** `public/assets/` (`midget/obama/sahil/tinubu_stage1..3.glb`, 7 stage packs), `art/` (127 MB), `tests/fixtures/screenshots/` (16 MB)
- **Exact Changes:**
  1. Once `metaverse-hub` enables `https://play.<domain>/shared-assets/sproto/`, configure `src/data/stages.js` & asset URL resolver to load shared Sproto character rigs and stage textures from the shared immutable origin (saving ~10+ MB of duplicate downloads when traveling between `sproto-duel` and `sproto-shooter`).
  2. Move `art/blender/` (**123 MB** of `.blend`/`.mp4` authoring files) and `tests/fixtures/screenshots/` (**16 MB** of Playwright PNGs) to Git LFS or external archive storage (cuts repo clone from **354 MB → ~35–40 MB**).

---

## 4. Verification Checklist

Run before opening PR (from `AGENTS.md`):
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
Verify explicitly:
- All pinned hashes (`73c6eb0f`, `e749d2fd`, `da423456`, `a5828d8c`, `tests/fixtures/baseline-hashes.json`) remain unchanged.
- `load-profile.json` cold-boot metrics improve (lower `criticalTransferBytes`, smaller `index-Game-*.js`, lower `maxMs` hitch, zero title-screen WebSocket connections).
