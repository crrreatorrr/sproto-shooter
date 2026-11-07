# Shooter performance (S4)

Measured on the S1 baseline `8a5676ed24700dafd15a759c1e2fa71b470180b9` and tightened here. Sim hashes and the S3 content fingerprint (`3c657fb5`) are unchanged. The server bundle sha changes only when `build/shooter-sim.js` is rebuilt, because that file bakes `git rev-parse HEAD`. This phase does not edit `src/sim/**`, `src/server/**`, or `build/shooter-sim.js`.

Frame times below are SwiftShader (`--use-angle=swiftshader`). They are not a GPU benchmark and they are not a CI gate.

## What changed

- The entry chunk paints the title, then dynamically imports the hub SDK and the game. `lil-gui` is a `debug-gui` chunk loaded only when debug mode or the backtick panel opens. Three and the renderer stay in the game chunk, which the title does load, because the title is a live sandbox.
- Projectile GLBs wait until a projectile of that kind exists. They still use the 4-wide now/later queue. A sphere stands in until the mesh arrives. The sandbox Duck Gun pickup is still part of the title download.
- A failed model, decode, or HTTP response stays an error. `stageReady` is true only after a successful decode. The HUD shows the failure and a Retry button. Placeholders (capsules, spheres, flat stage color) stay up. Retry clears the error and runs the same starter again.
- Templates outside the current stage plus its prefetch are disposed when nothing on screen still references them. A byte cap drops unpinned prefetch if the resident RGBA8 estimate passes 96 MiB. Cloned character materials and stage-map clones are disposed with the view. A 12-stage rotation in `tests/loading.test.js` stays at the current stage plus the next one.
- `scripts/optimize-assets.mjs` resizes images that exceed an edge cap, using sharp `0.33.5` (mozjpeg 4.1.5, libwebp 1.4.0). Meshopt payloads, skins, clip names, and material names are copied through. A second run is a no-op. Guns stay at 1024. The player and dragon go from 2048 to 1024. Other character, prop, and projectile images go from 1024 to 512. Stage textures and skies over 1024 go to 1024. Boss portraits become paletted PNG. Source Blender files are untouched.

KTX2 was not adopted. The images are already JPEG or WebP inside the GLBs. A Basis transcoder would add a WASM request on the critical path, and the resize already cuts both transfer size and the RGBA8 estimate. SwiftShader cannot show a GPU-memory win for that extra cost.

## Budgets

Aspirations from the plan are the CI gates. Decoded bytes are pinned to this inventory.

| Metric | Before | After | Gate |
|---|---:|---:|---:|
| Critical first-party bytes | 7,170,841 | 3,761,311 | 6,291,456 (6 MiB) |
| Critical first-party requests | 16 | 13 | 20 |
| Title shell gzip | 323,111 | 6,669 | 153,600 (150 KiB) |
| Shipped `dist` | 34,432,594 | 23,217,417 | 26,214,400 (25 MiB) |
| Decoded texture and mesh bytes | 462,495,230 | 229,711,358 | 229,711,358 |
| Public assets | 33,289,145 | 22,065,058 | inside `dist` |

Title shell gzip is the HTML, CSS, and entry chunk only (zlib level 6). The game chunk is 300,100 bytes gzip and the hub chunk is 11,140. Both are in the critical transfer, not in the shell. The debug GUI is 8,800 bytes gzip and is not loaded for a normal title. Critical bytes are those three JS chunks, CSS, HTML, and the eight title assets (city floor, sky, stone, pillar, prop, MG, Duck Gun, player). Projectile models are no longer in that set because the title does not request them.

`npm run budgets` reads `dist`. `npm run assets:check` locks `tests/fixtures/asset-manifest.json`. `npm run assets:optimize -- --check` fails if a committed image is still over its cap.

## Load profile

`npm run profile` records three cold and three warm runs at 10 Mbps, 100 ms RTT, CPU 4×, Chromium headless on SwiftShader. The medians in `tests/fixtures/load-profile.json` are nearest-rank p50. Warm transfer is the cache. The profile server does not gzip, so the live waterfall is larger than the gzip-6 budget.

| | Cold p50 | Warm p50 |
|---|---:|---:|
| First-party requests | 12 | 12 |
| First-party transfer | 4,567,031 | 0 |
| TTFB | 101 ms | 0.8 ms |
| Title text | 540 ms | 5,013 ms |
| Frames in the 5 s window | 46 | 28 |
| Average frame | 93 ms | 114 ms |
| p95 frame | 367 ms | 733 ms |
| Sim average | 0.65 ms | 0.37 ms |

The warm title time includes the throttled second navigation. The p95 is a SwiftShader hitch, not a desktop GPU result. Sim time stays under a millisecond. CI does not fail on these numbers.

## Assets left in place

No runtime file was unreferenced, so nothing was deleted. Two rig groups share clip names (`idle`, `run`, `cast`, and the rest of the humanoid set) across midget, obama, sahil, and tinubu stage files. The meshes differ. They stay.

Embedded image hashes do not repeat across files. Gun textures stayed at 1024 so the viewmodel did not take a second resize. Authoring files `art/blender/boss_animations.blend` and `art/blender/new_enemies.blend` are not in `public/` or `dist`.

## Screenshots

`tests/fixtures/screenshots/` has the title cold/warm pair from the load profile, plus hands, reload, sniper, boss (Blue Monster), and campaign (Sproto Landing). They were shot on SwiftShader at 1280×720 with `seed=1`. A pixel diff against the pre-resize build was dominated by the title demo's clock (the yaw keeps moving), not by a missing mesh. Hands still hold the MG, the sniper model replaces it when zoomed, the boss and the landing level are the same scenes.

## Not done here

- A 20-minute browser heap soak. The eviction test is deterministic and covers twelve stage swaps. A wall-clock soak belongs with S7.
- KTX2, for the reason above.
- Splitting Three out of the game chunk. The title sandbox renders with it, so moving it would not shrink the critical transfer.
- Gun texture reductions below 1024.
