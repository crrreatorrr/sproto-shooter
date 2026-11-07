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
| Runtime baseline | Pending CI capture |

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
failed requests/HTTP errors or an incorrect live-enemy count.

This is a reproducible rendering baseline, not evidence that 1080p gameplay
meets the final reference-GPU quality bar. The frozen-AI setup must be preserved
when comparing later milestones against B-M0.

## Environment limitation

The supplied cloud shell blocks Chromium's Unix socket creation (`socket()
failed: Operation not permitted`), and the managed browser could not connect
to its localhost preview. Runtime numbers and screenshots are therefore pending
CI rather than estimated. Do not mark B-M0 accepted until its CI artifact has
been inspected and its metrics recorded here.
