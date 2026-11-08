# Shooter baseline

Measured on accepted main `8a5676ed24700dafd15a759c1e2fa71b470180b9` (S0: #15 frame stats and #16 hub link). S1 adds CI and this inventory. It does not change gameplay, sim hashes, or art.

Node on the measuring machine: 22.23.4. CI uses Node 22. Tool versions are the lockfile: Vite 5.4.11, Vitest 2.1.8, Three 0.170.0, Playwright Chromium 158.0.8127.18, TypeScript 7.0.2, ESLint 9.39.5.

## Reproduce

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run assets:check
npm run budgets
npm run profile          # rewrites tests/fixtures/load-profile.json and the two screenshots
npm run profile:check    # one live request-set smoke; does not overwrite the fixture
```

`npm run profile` is the three-run record. CI runs `profile:check` only. Frame times from either command are advisory.

## Sim hashes

`tests/levels/baseline.test.js` still locks the arena. `tests/fixtures/baseline-hashes.json` is unchanged from `8a5676e`:

| Run | 600 | 3000 | 6000 |
|---|---|---|---|
| waves seed 11 | `bb7e8582` | `e196fd2e` | `d2bd33ff` |
| waves seed 12 | `1011be61` | `4656e70a` | `116f663f` |
| waves seed 13 | `4b1e7234` | `fc8dc3c9` | `c96f29f7` |
| sandbox seed 21 | `dd22017d` | `57985399` | `d3ea5858` |

## Runtime assets

`tests/fixtures/asset-manifest.json` is the inventory. 58 files under `public/assets`, 33,289,145 bytes (31.75 MiB). Every file is referenced. Missing refs fail `npm run assets:check`. Unused files would be listed and left on disk; the current tree has none.

Dynamic refs are expanded, not guessed from string literals alone:

- `stageAssets(id)` for every stage id, including texture-folder reuse (`grove` → glacier, `desert`/`office` → city, `moonlit` → void).
- `CHARACTER_MODELS`, including `midget_stage1.glb` and the other stage-suffixed names that never appear as a full string.

Decoded size is hardware-independent. Standalone images and images inside GLBs use an RGBA8 upload estimate (`width * height * 4`). GLB geometry adds the meshopt-decoded buffer-view bytes. The total is 462,495,230 bytes (441.1 MiB). That number is not a frame time. The largest edge in the tree is 2048. Dragon is the largest GLB at 2,719,988 bytes, under the 3 MiB cap, and it is meshopt-compressed.

Authoring files that must not ship:

| File | Bytes |
|---|---:|
| `art/blender/boss_animations.blend` | 20,159,671 |
| `art/blender/new_enemies.blend` | 43,503,325 |

Neither is under `public/` or `dist/`. `npm run budgets` fails if a `.blend`, `.blend1`, or `.mp4` appears in `dist/`.

Meshopt, the now/later queue (`MAX_PARALLEL = 4`), and per-level `levelAssets()` loading are already on main. This phase does not change them.

## Build

`npm run build` on this pin produces one JS chunk and one CSS chunk. Gzip sizes use zlib level 6, which matches the size Vite prints.

| Output | Raw bytes | Gzip-6 bytes |
|---|---:|---:|
| `dist/assets/index-*.js` | 1,123,168 | 317,751 |
| `dist/assets/index-*.css` | 19,514 | 4,962 |
| `dist/index.html` | 767 | 398 |
| Title shell (those three) |  | 323,111 |
| Whole `dist/` | 34,432,594 |  |

`dist` is `public/assets` plus the shell. 34,432,594 − 33,289,145 = 1,143,449 shell raw bytes.

## Budgets

Aspirations are the plan's initial targets. Gates are what CI enforces. A missed aspiration is recorded and then held to 5% growth. It is not silently treated as already met, and mandatory title traffic is not moved into a "later" bucket to pass.

| Metric | Aspiration | Measured | CI gate |
|---|---:|---:|---:|
| Title shell gzip | 150 KiB (153,600) | 323,111 | 339,266 (measured + 5%) |
| Critical first-party transfer | 6 MiB (6,291,456) | 7,170,841 | 7,529,383 (measured + 5%) |
| Critical first-party requests | 20 | 16 | 20, and the smoke fails on any extra game asset |
| Shipped `dist` | 25 MiB (26,214,400) | 34,432,594 | 36,154,223 (measured + 5%) |
| One GLB | 3 MiB | dragon 2,719,988 | 3,145,728 |
| Texture edge | 2048 | 2048 | 2048 |

The title shell misses 150 KiB because the game is still one bundle: Three, the renderer, debug, and the hub SDK ship together. Splitting that is later work. Until then, gzip growth past 5% fails.

The critical transfer misses 6 MiB for a concrete reason. The title screen starts a city sandbox, so the first download is not just the stage and the starting MG:

- city floor, sky, stone, pillar, prop
- `sproto_player.glb` (first-person hands)
- `toy_mg.glb` (equipped gun)
- `toy_duckgun.glb` (the sandbox places a Duck Gun pickup in front of spawn)
- five projectile GLBs the renderer starts while it builds pools: rubber bullet, monster bullet, missile, tyre, drill

Those 13 files plus the gzip-6 shell are 7,170,841 bytes and 16 requests. Dropping the projectiles or the Duck Gun from the count would hide traffic the title actually fetches.

## Load profile

`tests/fixtures/load-profile.json` is three cold/warm runs. Screenshots: `tests/fixtures/screenshots/title-cold.png` and `title-warm.png`. Both show the title, the city sandbox, and the F3 overlay (`?stats=1`), which reads `window.__sproto.perf`.

| Field | Value |
|---|---|
| Browser | Chromium 158.0.8127.18, headless |
| GL | SwiftShader (`--use-angle=swiftshader`). Software. Not a GPU benchmark. |
| Device | Linux x64, 4 cores, 16 GB device memory, the user agent in the JSON |
| Source | baseline and generated-from commit `8a5676e` |
| Network | 10 Mbps down, 100 ms RTT, CPU 4× (`plan-10mbps-100ms-cpu4x`) |
| Cold | cache disabled |
| Warm | cache enabled, second navigation after the critical files have finished |

Cross-run numbers are the nearest-rank p50 from `src/render/debug/perfCounters.js` (`percentile`), the same helper the F3 overlay uses. Each run records `__sproto.perf(5)`.

Cold p50: TTFB 101 ms, load event 1,195 ms, title text 2,003 ms, 16 resource entries, transfer 7,995,856 bytes. Warm p50: TTFB 0.7 ms, transfer 0 bytes (all 18 resource entries cached on the median run).

The live transfer is larger than the 7,170,841 budget because this profile server does not gzip. The JS body goes out raw (1,123,168) plus HTTP headers and the Google fonts stylesheet. The budget counts gzip-6 for HTML/CSS/JS, which is what a static host sends. Warm transfer 0 is the cache, not a smaller game.

Frame sample, SwiftShader, advisory, `ciGate: false`:

| | Cold p50 | Warm p50 |
|---|---:|---:|
| Frames in the 5 s window | 15 | 26 |
| Average frame | 342 ms | 166 ms |
| p95 frame | 2,633 ms | 667 ms |
| Sim average | 0.66 ms | 0.37 ms |
| Render CPU average | 63 ms | 113 ms |
| GPU timer average | 240 ms | 307 ms |
| Draw calls | 56 | 61 |
| Triangles | 246,466 | 256,105 |

The p95 is a hitch inside the window (shader compile and first SwiftShader frames), not a claim about a desktop GPU. Sim time stays under a millisecond. CI does not fail on these numbers. A green budget check is not a GPU benchmark.

The third-party request observed on every cold run is `https://fonts.googleapis.com/css2`. It is not part of the first-party byte gate.

## CI

`.github/workflows/ci.yml` runs on pull requests and on `main`, from `npm ci` on Node 22:

1. `npm run lint` — ESLint on the new scripts and tests
2. `npm run typecheck` — non-strict `checkJs` on `src/render/debug/{perfCounters,FrameGraph,StatsOverlay}.js`
3. `npm test` — existing Vitest suite plus architecture, manifest, and baseline tests
4. `npm run build`
5. `npm run assets:check`
6. `npm run budgets`
7. Playwright Chromium, then `npm run profile:check`

`profile:check` fails if a critical asset 404s or if the title requests a game asset outside the list above. It writes a one-run smoke JSON and does not rewrite the three-run fixture. The upload keeps that smoke next to the committed profile and screenshots.

Typecheck stays on those three modules because they already opt in with `// @ts-check` and they pass with no suppressions. TypeScript 7's CLI turns `noImplicitAny` on unless told otherwise, so the command passes `--strict false --noImplicitAny false` (the existing non-strict JSDoc mode). Checking all of `src` reports 68 errors, mostly `TS2339` on inferred object shapes. Fixing that would be a source migration, which this phase does not do, and the errors are not hidden with `@ts-nocheck` or a blanket ignore.

## Left as they are

- PRs #5, #6, and #7 were not updated.
- The five existing `npm audit` advisories were not "fixed"; an audit fix would move Vite or Three and change this baseline.
- S0 follow-ups (cached hub session chip, pause-menu return confirm, SDK provenance, those advisories) belong to later phases. This PR does not edit hub or gameplay source.
