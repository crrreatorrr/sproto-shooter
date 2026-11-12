# Shooter release notes (S7)

Game acceptance against a local Nakama built from metaverse-hub `main` `d7065e1` (H4-S, hub #120). Public launch stays closed. `shooter_pvp` and `shooter_pvp_wager` stay `off` in every committed and deployed config. This run turned those two rows `on` in the local Postgres only, then put them back to `off`.

## What ran where

| Suite | Where | Result |
|---|---|---|
| `tests/e2e/shooter-hub.spec.js` | this machine, local Nakama | passed |
| `tests/e2e/shooter-online.spec.js` | this machine, local Nakama | passed |
| `tests/e2e/shooter-wagers.spec.js` | this machine, local Nakama | passed |
| `npm run profile` (3 cold / 3 warm) | this machine, SwiftShader | recorded |
| `node scripts/load-profile.mjs --netfail` | this machine | recorded |
| 20-minute heap soak | this machine, SwiftShader | recorded |
| `npm test`, lint, typecheck, build, assets, budgets, `profile:check` | GitHub Actions on the PR | the existing CI job |
| Nakama e2e | GitHub Actions | skipped unless the repository variable `SHOOTER_E2E_NAKAMA` is `true` |
| Hub duplication suite, 100 duplicate holds/settles/refunds and 20 races | not re-run here | `server/test/dup/shooter_wagers.ts` on metaverse-hub `d7065e1` |

The local stack used the hub `server/Dockerfile` (`heroiclabs/nakama:3.41.0` plus `npm run build` of `server/modules`) and `server/docker-compose.yml` for Postgres 16.8. The compose bridge could not dial Postgres (the connection timed out), so the built image was started with host networking against the published Postgres port. The Vite dev server proxied `/v2` and `/ws` to `127.0.0.1:7350`. Caddy was not in the path. `SHOOTER_PVP_REPLAY=1` came from the hub compose entrypoint, which is the local suite setting. `deploy/nakama/config.yml` still leaves that unset.

## Load

`tests/fixtures/load-profile.json`. Three runs, nearest-rank p50, 10 Mbps, 100 ms RTT, CPU 4×, Chromium 158 headless, SwiftShader (ANGLE, Vulkan 1.3.0 SwiftShader Device Subzero). Four cores, `deviceMemory` 16. Frame time is advisory and is not a CI gate. There is no named desktop GPU in this run.

| | Cold p50 | Warm p50 |
|---|---:|---:|
| First-party requests | 12 | 12 |
| First-party transfer | 4,641,031 | 0 |
| TTFB | 102 ms | 1.1 ms |
| Load event | 482 ms | 6,702 ms |
| Title text | 581 ms | 7,558 ms |
| Frames in the 5 s window | 37 | 28 |
| Average frame | 136 ms | 132 ms |
| p95 frame | 683 ms | 617 ms |
| Sim average | 0.73 ms | 0.56 ms |

Warm transfer is the cache. The profile server does not gzip, so the waterfall is larger than the gzip budget. The warm title time includes the throttled second navigation.

## Memory soak

`tests/fixtures/s7-runtime.json`. The live title ran for 20 minutes on SwiftShader. Forty samples, one every 30 seconds. CDP `JSHeapUsedSize` started at 8,556,268 bytes, ended at 9,905,624, and peaked at 11,409,012. Growth was 1,349,356 bytes. `performance.memory` stayed at 18,200,000 bytes. DOM nodes went from 698 to 643. Pending downloads ended at 0. The heap did not climb without a ceiling over this window.

## Network failure

Same fixture. A cold navigation with the network cut failed with `net::ERR_INTERNET_DISCONNECTED` and painted no title. After the network returned, the title loaded. Cutting the network again left the already-painted title in place. A reload while offline failed. The failure is closed: an offline load does not present a playable shell, and a later online load does.

## Acceptance on the local hub

Screenshots are in `tests/fixtures/screenshots/s7/` and were also saved as run artifacts.

- Hub round trip. An email account redeemed one `portal.enter` ticket. The chip showed the username and Tickets 0, read from `tickets.balance`. Return to Hub landed on the local stub at `#from=sproto-shooter` with the ticket removed from the URL.
- Expiry and replay. A second visit with the used ticket stayed disconnected. A ticket whose row was already expired showed `unauthenticated` and no Ticket balance.
- Verified PvE. The signed-in page called `shooter.run.issue` and `shooter.run.submit` for sahil. The server paid 20 Tickets. The chip showed 20. A second clear of the same boss on the same UTC day paid nothing. A forged log paid 0. `tickets.earn` with `srv_shooter_boss_clear` did not change the wallet. The clear was 1,318 frames, state hash `e869920d`. Run Cash on the HUD stayed 0.
- Outbox. An offline cloud save queued a non-economic body. The queued JSON had no Ticket field. After the network returned, reload flushed the outbox and the wallet stayed 20.
- Two tabs. A second tab with no ticket stayed Offline, because the hub session lives in `sessionStorage`. A second portal ticket for the same account showed the same username and the same backend balance.
- Free online. Both browsers clicked Find free match. The server accepted the queue. The shipped screen stays on the lobby. The same two accounts then created and joined a free room with `createPvpClient`. The match reached the live phase (stake 0, Tickets stayed 0).
- Dark wagers. Both accounts were funded by a verified sahil clear (20 each). Guest matchmaker add was refused (`wager_guest`) and moved no Tickets. An email account with 0 Tickets had the stake button disabled ("You have 0"). Queueing did not debit. A second tab of the queued account was told "You are already queued." Cancel left the wallet at 20. Both players readied. The wallet read was 10 and 10. One browser was taken offline and brought back; the server tick advanced again. Silencing one seat produced a server receipt: one wallet 30 (net +10) and the other 10 (net −10). The on-screen numbers were those wallet reads. One-sided rematch confirmation did not spend again. The client refused `shooter.settle`. The flag rows were `off` at the end.

## Known gaps

- Find free match does not join the matched socket. The note still says the authoritative match waits on H3-S. H3-S is merged. A free room, driven with the same client the wager screen uses, does join and play.
- `shooter_pvp` is not a gate on free queue or free rooms. Escrow runs only when both `shooter_pvp` and `shooter_pvp_wager` are on for both accounts. Turning `shooter_pvp` off does not by itself stop free matches.
- There is no campaign button that submits a verified run. The sahil clear above used `shooter.run.issue` / `shooter.run.submit` from the signed-in page.
- A device account receives a Nakama username, so the stake button shows the empty-wallet line rather than the guest sentence. The server still refuses that account with `wager_guest`.
- During a short offline blip the wager overlay stayed on "Match is live. Tickets now 10." The realtime client keeps retrying and does not emit match close, so the reconnect sentence does not appear. After the network returned, the server tick moved forward and the later forfeit still settled from the server.
- Frame times are SwiftShader. They are not a desktop GPU result.
- The return target in this run was a local stub, not the plaza. The Range portal is hub #79.
- This phase does not re-run the hub's 100-retry or 20-race duplication suite.

## Pin matrix

| Piece | Value |
|---|---|
| Shooter game at measurement | `54a7849` (S6, shooter #40). This PR adds tests and docs only. |
| Hub `main` | `d7065e1` (H4-S #120) |
| Hub Nakama image | `heroiclabs/nakama:3.41.0`, modules built from that commit |
| Campaign sim on the hub | commit `e6d1bb5`, protocol 1, fingerprint `3c657fb5`, sha256 `a8b964db897a57827b4d3b4cecf8bc25c4f91684ea4851aa93c7a9279b427161`, global `SprotoShooterSim` |
| Free / wager sim on the hub | commit `e6d1bb5`, protocol 2, sim 2, fingerprint `17d87c54`, loadout `4cdfab55`, sha256 `658d4c983f4e37aafbd6f65073bb6bf860aa6c6ac130477cefd7a1bbae1e4665`, global `SprotoShooterPvp` |
| hub-sdk in this repo | 0.6.4, vendored from hub `a1281c9`, IIFE sha256 `e7626595184dc132e72ffd707c87149b266c7b3933d40670e55eb2fb0a64eda6` |
| PvP content fingerprint in this tree | `e749d2fd` (golden `da423456`). The hub row above is still the last vendored pin `17d87c54`. Re-vendor the Shooter sim before any staging deploy. |
| Campaign fingerprint | `3c657fb5` |
| Replay env on the local stack | `SHOOTER_PVP_REPLAY=1` (compose). Production config leaves it unset. |
| Feature flags | `shooter_pvp=off`, `shooter_pvp_wager=off`, `shooter_pvp_ranked=off` |

`src/sim` has not changed since `e6d1bb5`, so the vendored bundles still agree with this tree's fingerprints. The bundle sha changes when the sim is rebuilt, because the build bakes `git rev-parse HEAD`. The hub check wants that baked commit to be shooter `main`. After this PR merges, hub CI needs a re-vendor before it is green again, even though the sim sources are unchanged.

## Rollback requirements for H5

H5 owns the hub release doc, deploy headers, and the staging drill. Shooter side, the compatible rollback is:

1. Set `shooter_pvp_wager` to `off` first. That stops new holds. It does not delete a hold and it does not claw back a balance.
2. Let live matches finish. `game.shooter_wager` rows in `held` still settle or refund once. The sweep refunds holds older than 20 minutes. A single-node restart refunds every held row because the match process is gone. A rolling restart refunds holds that are still live on the other node: both seats get 10 back, and the winner is not paid. No Tickets are created.
3. Free queue and free rooms keep running when only the wager flag is off. Closing free play needs a hub change: `shooter_pvp` does not gate them today.
4. Leave `game.shooter_wager`, `game.tickets_ledger`, and the boss receipts in place. No down migration. Positive balances stay.
5. Boss credits (20 Tickets, once per account, canonical boss, and UTC day, under the existing 200-session and 1,000-per-game caps) are separate from wager transfers. Rolling wagers back does not reverse a boss credit.
6. Serve a build whose protocol, sim, fingerprint, and bundle sha match the hub pin, or the client shows the refresh line (`version_mismatch`) and refuses the stake.
7. SDK sessions are the vendored 0.6.4 artifact. A newer SDK needs a shooter re-vendor and a hub pin update together.
8. Do not announce a public lobby, do not turn the flags on in deploy config, and do not treat this local run as production.

## Flags

| Flag | Committed state | This local run |
|---|---|---|
| `shooter_pvp` | `off` | `on` only while `shooter-wagers.spec.js` ran, then `off` |
| `shooter_pvp_wager` | `off` | same |
| `shooter_pvp_ranked` | `off` | left `off` |
| `SHOOTER_PVP_REPLAY` | unset in `deploy/nakama/config.yml` | `1` on the local process, from the hub compose file |
