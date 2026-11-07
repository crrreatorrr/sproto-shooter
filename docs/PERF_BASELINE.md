# B-M0 performance baseline

Source: `721d8ee` (main and codex/plan at implementation start). No game source,
asset, simulation or weapon changes belong to this milestone.

## Local verification (2026-11-07)

| Measurement | Result |
| --- | ---: |
| Existing Vitest tests | 35/35 passing |
| Vite production build | Pass (5.4.11) |
| Initial JS, uncompressed | 832,995 bytes |
| Initial JS, gzip (Vite rounded) | 230.87 KB |
| CSS, gzip (Vite rounded) | 4.73 KB |
| 60-midget draw calls | 146 |
| Triangles | 522,139 |
| Shader programs | 14 |
| Textures / geometries | 66 / 17 |
| Mean fps (SwiftShader) | 1.97 |
| Frame mean / p95 / max | 507.28 / 1,016.60 / 1,016.60 ms |
| Cold title asset transfer | 3,043,830 bytes |
| Cold wave-1 asset transfer | 3,637,024 bytes |
| Cold wave-1 total transfer | 3,922,771 bytes |
| Runtime exceptions / game HTTP errors | 0 / 0 |

The initial JS is a single chunk including three and lil-gui. B-M1 will split
three and load debug tooling lazily. This measurement precedes those changes.

## Browser capture procedure

`npm ci && npm test && npm run build && node scripts/capture-baseline.mjs`
requires Node 22 (native WebSocket) and Chrome (`CHROME_BIN` overrides the
`google-chrome` executable). The dedicated **Baseline capture** workflow runs
this on ubuntu-latest and uploads `sproto-b-m0-baseline`:

- `metrics.json`: exact source commit, runtime environment, gzip bundle sizes,
  cold title and wave-1 network transfers, and stress statistics.
- `title.png`, `wave1.png`, `stress-60-midgets.png`: before screenshots.

All captures use seed 123, an 800×450 viewport, DPR 1 and ANGLE SwiftShader.
Cold-load samples disable the HTTP cache. Stress starts a sandbox, clears the
five title dummies, and spawns exactly 60 tier-1 non-elite midgets through
existing debug commands. God mode and frozen AI keep the count and placement
stable; skeletal animations and the normal render loop continue. The view
faces yaw 0, pitch −0.05. After assets finish and a 2-second warm-up, collect
8 seconds of rAF intervals. Report mean fps, p95/max frame duration, draw calls,
triangles, programs, textures and geometries. Fail on browser exceptions,
failed game requests/HTTP errors or an incorrect live-enemy count. The existing\nmissing `/favicon.ico` is recorded separately and is not a game asset failure.

This is a reproducible rendering baseline, not evidence that 1080p gameplay
meets the final reference-GPU quality bar. The frozen-AI setup must be preserved
when comparing later milestones against B-M0.

## Environment limitation

The supplied cloud shell blocks Chromium's Unix socket creation (`socket()
failed: Operation not permitted`), and the managed browser could not connect
to its localhost preview. Runtime numbers and screenshots were captured in [CI run 42345689272](https://github.com/crrreatorrr/sproto-shooter/actions/runs/42345689272).
The [artifact](https://github.com/crrreatorrr/sproto-shooter/actions/runs/42345689272/artifacts/13562954417)
contains all three screenshots and the raw metrics. The stress screenshot was
inspected. Measured source: `e8a400fbe6e90a42c5e4dbf8eda60c846e97eb24` (PR merge
ref; game source remains identical to `721d8ee`). Environment: Ubuntu 26.04,
Intel Xeon 6973P-C, Chrome 156.0.8078.79, Node 22.23.4, SwiftShader. The slow
software run yielded 16 frame intervals in 8 seconds; hardware-GPU acceptance
remains unverified.
