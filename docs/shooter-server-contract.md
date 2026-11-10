# Shooter server contract (S3)

This is the contract H2-S (the hub Nakama verifier) implements against. The game ships a pure simulator and a run protocol. It does not credit Tickets.

## Artifact

Build from a shooter commit:

```bash
npm run build:server-sim
```

Outputs:

| File | Role |
|---|---|
| `build/shooter-sim.js` | One IIFE. Global `SprotoShooterSim`. No Node, DOM, or network APIs. |
| `build/shooter-sim.pin.json` | `sourceCommit`, `contentFingerprint`, `bundleSha256`, `bundleBytes`, `protocol`, `limits`. |

`sourceCommit` is `git rev-parse HEAD` baked into the bundle before the sha256. Rebuild on the merged shooter SHA and vendor both files. Refuse to boot if `bundleSha256` or `contentFingerprint` disagrees with the running copy. A stale pin is not accepted.

Measured on this phase's build host: the bundle is about 277 KB. Content fingerprint for protocol 1 is `9ec1c6ea`. The sha256 changes with the commit baked into the file, so read it from the pin of the build you vendor.

Entry points:

- `SprotoShooterSim.buildIssuance(input) -> { ok, issuance, ticketsMinted: 0 } | { ok: false, reason, ticketsMinted: 0 }`
- `SprotoShooterSim.verifyRun(log, ctx) -> receipt`
- `SprotoShooterSim.verifyRunJSON(text) -> JSON string` for goja and the browser. Same receipt, but `checkpoint.state` is omitted. `checkpoint.parts` stays.

`ctx` is server-owned. Never parse `issuance`, `resume`, or the caller identity from the client body.

## What this artifact never does

`ECONOMY` is frozen on the bundle:

- `mintsTickets: false`
- `ticketsMintedByArtifact: 0`
- `payoutAuthority: "server"`
- `wagerTransfersUncapped: true`
- `wagerMayCreateTickets: false`

Every receipt sets `ticketsMinted` to 0, including a clean boss clear. H2-S applies the 20-Ticket rule itself when `ok && eligible && outcome === "clear"`. There is no `earnTickets` path and no client-supplied amount.

Shooter wagers are not this phase. When a later escrow moves Tickets between players, those transfers stay uncapped: no pair limit, no same-IP block, no transfer cap. Escrow still has to make creation impossible. The sum of wallets plus escrow stays constant. This bundle has no settle function.

## Canonical bosses

Payable ids, one each. A flee is not a kill. `obamaDuo` and `midgetDuo` are parts of one canonical `obama`, not two payouts.

| Canonical id | Duel id | Level | Encounter | Parts | Not this |
|---|---|---|---|---|---|
| `sahil` | `sahil` | L02 | S4-E4 | sahil | |
| `obama` | `obama` | L04 | `SB-BOSS` (corridor still resolves `S3-E3`) | obamaDuo + midgetDuo, once each. Extra squads on that encounter are adds, not a second boss | issuing `obamaDuo` or `midgetDuo` returns `obama_is_one`. Still one payable boss |
| `broccoli` | `broccoli` | L06 | S4-E4 | broccoli | L03 S4-E4 flees at half health and is not issuable |
| `glowie` | none | L08 | S4-E4 | glowie | Duel's `agent`, and the enemy `glowieAgent`, return `glowie_not_agent` |
| `tinubu` | `tinubu` | L10 | S3-E3 | tinubu | L09 S3-E4 flees at 0.7 and is not issuable |

`canonicalCount` is 1 when every required part died, including obama. It is 0 when the run failed or never finished. `eligible` is true only for a gun or gun-splash kill by the bound player, with that player still alive and no flee. A spell, damage-over-time, or other killing blow is `outcome: "assisted"`: the replay is authentic, `eligible` is false, and it is unranked.

The issued start is the campaign section that contains that encounter. The player stands on the section's authored start with the starter MG (common, Ol' Reliable, no element, no wacky), level-1 Health and Gunslinger, Goo Bolt known, and zero Tickets. There is no Magic skill, no Crafting skill, and no resource inventory. `loadout` must be `canonical-start`. A profile, gun list, loot table, or checkpoint blob is `injected_inventory` or `bad_checkpoint`.

## Issuance

H2-S stores this. The client never supplies it.

```json
{
  "v": 1,
  "protocol": 1,
  "runId": "server-run-id",
  "accountId": "nakama-user-id",
  "sessionId": "session-id",
  "day": "2026-11-07",
  "seed": 7,
  "levelId": "L02",
  "sectionId": "S4",
  "encounterId": "S4-E4",
  "canonicalBoss": "sahil",
  "parts": ["sahil"],
  "countAs": 1,
  "loadout": "canonical-start",
  "contentFingerprint": "9ec1c6ea",
  "maxFrames": 162000,
  "duelId": "sahil",
  "distinctFrom": [],
  "initialStateHash": "8 hex chars"
}
```

`day` is the UTC calendar day (`YYYY-MM-DD`) the server assigns at issue time. `seed` is an integer from 1 through 2^32-1. `initialStateHash` is `verifyStateHash` of the rebuilt start. `buildIssuance` fills the hash, the fingerprint, and the section id. Pass the stored object back into `verifyRun` unchanged.

## Log

Inputs only. Fixed 60 Hz. The client cannot send `dt`, `timeScale`, a state blob, or a checkpoint.

```json
{
  "v": 1,
  "binding": {
    "accountId": "nakama-user-id",
    "sessionId": "session-id",
    "day": "2026-11-07",
    "runId": "server-run-id"
  },
  "segments": [
    { "i": 0, "from": null, "tick0": 0, "n": 1289, "frames": "<base64>", "actions": [] }
  ]
}
```

Each frame is 12 bytes, little-endian:

| Offset | Type | Meaning |
|---|---|---|
| 0 | int16 | yaw, `-32767..32767` maps to `-pi..pi` |
| 2 | int16 | pitch, same range maps to `-1.5..1.5` radians |
| 4 | int8 | moveX, `-127..127` maps to `-1..1` |
| 5 | int8 | moveZ, same |
| 6 | uint16 | held bitset |
| 8 | uint16 | pressed bitset |
| 10 | int8 | slot `-1..4` |
| 11 | int8 | wheel `-4..4` |

Button bits, in order: `fire`, `zoom`, `sprint`, `jump`, `dash`, `slide`, `reload`, `interact`, `medkit`, `skip`, `gooBolt`, `chainZap`, `swarm`, `manaShield`, `meteor`.

`actions` is `[[frameIndex, actionId]]`. `1` is `transitionDone`. `2` is rejected as `debug`. `3` is rejected as `god_mode`. Anything else is `debug`. Bankable logs cannot carry `startMode`, craft, shop, or debug ops.

Segment 0 starts at tick 0 with `from: null`. Each later segment's `tick0` is the previous `tick0 + n`, and `from` is the server hash at that boundary. A gap is `accelerated`. A client `from` that the server did not produce is `bad_checkpoint`.

The optional browser hook is `game.onSimCommand(cmd, state)`, called with the raw command before `simulate`. It does not change gameplay when null. The client quantizes with this codec. The server still rebuilds state from the issuance and the log.

## Limits and unsupported versions

| Limit | Value | Failure |
|---|---|---|
| Protocol | `1` only | `unsupported_version` |
| Segment frames | 28800 (8 min) | `oversized` |
| Segments | 24 | `malformed` |
| Total frames | 162000 (45 min) | `oversized` |
| Segment text | 700000 chars | `oversized` |
| Total frame text | 2 MiB | `oversized` |
| Actions per segment | 32 | `malformed` |
| CPU per `verifyRun` | 15000 ms | `cpu_budget` |
| Position step | 15 m per tick | `teleport` |
| Id length | 80, `[A-Za-z0-9_.:@|-]` | `malformed` |

`v` other than 1, including a missing or future version, returns `ok: false`, `reason: "unsupported_version"`, `ticketsMinted: 0`. Do not replay and do not pay. NaN or Infinity in the JSON text is `nan`. A negative tick, count, or seed is `negative`. God Mode, `infiniteAmmo`, frozen enemies, and tuning multipliers other than 1 are `god_mode` or `debug`. Gun sources other than `start`, `world`, `boss`, and `drop` are `injected_inventory`.

Check order inside `verifyRun`, before the sim loop: shape, hostile keys, version, ids, size, binding (rebind), digest (`reused_log`), run id (`reused_run`), content fingerprint, then rebuild. Decode and the CPU clock run only after that. H2-S should still refuse unauthenticated or over-rate calls before it invokes the bundle.

## Receipt

```json
{
  "ok": true,
  "reason": "boss_clear",
  "outcome": "clear",
  "eligible": true,
  "ranked": true,
  "ticketsMinted": 0,
  "canonicalBoss": "obama",
  "canonicalCount": 1,
  "parts": [
    { "type": "obamaDuo", "spawned": true, "dead": true, "fled": false, "sourceKind": "gun", "sourceId": 3 },
    { "type": "midgetDuo", "spawned": true, "dead": true, "fled": false, "sourceKind": "gun", "sourceId": 3 }
  ],
  "duelId": "obama",
  "distinctFrom": [],
  "stateHash": "8 hex chars",
  "tick": 2491,
  "frames": 2491,
  "protocol": 1,
  "contentFingerprint": "9ec1c6ea",
  "sourceCommit": "40 hex chars or null in unpacked source",
  "logDigest": "8 hex chars",
  "bindingHash": "8 hex chars",
  "checkpoint": { "hash": "8 hex chars", "tick": 2491, "parts": {}, "state": {} },
  "cpuMs": 0
}
```

`verifyRunJSON` drops `checkpoint.state` so a goja stdout stays small. The in-process `verifyRun` keeps `checkpoint.state` for the server to store.

`outcome` is `clear`, `assisted`, `fail` (`player_down` or `boss_fled`), `incomplete` (`boss_alive`), or `rejected`. Pay only `clear`. Rank only `clear`. Assisted, failed, incomplete, and rejected pay 0 and do not write a board.

`stateHash` is `verifyStateHash`: FNV-1a over canonical JSON of the state with every finite number rounded to micro-units (`Math.round(n * 1e6)`). Goja and V8 differ by 1 ulp in `sin`/`cos`, which changes raw JSON digits but not hits. E16 re-pinned the Wave Mode and Sandbox hashes in `tests/fixtures/baseline-hashes.json` once, when crafting and the Magic skill left the arena. Later campaign work must not move them again.

## Checkpoints

Long runs are a chain of segments. The server verifies segment 0 from the issued start, stores `checkpoint.hash`, `checkpoint.tick`, `checkpoint.state`, and `checkpoint.parts`, and only then accepts a segment whose `from` equals that hash. `parts` remembers a boss that died and was removed from the live enemy list, which is required for obama's two parts. A JSON round trip of that checkpoint resumes to the same hash.

The client cannot submit the state. A log key `state`, `checkpoint`, `profile`, `loot`, `inventory`, or `guns` fails closed.

On `ok: true`, record `logDigest` and `runId`. A second submit with the same digest is `reused_log`. A different log for the same run is `reused_run`. Neither pays again. A rejected (malformed) submit does not consume the run. A real fail does: the player needs a new server issuance.

Rebind: `ctx.accountId`, `ctx.sessionId`, and `ctx.day` are the authenticated caller. They must equal the stored issuance and the log binding, including `runId`. Copying a winning log onto another account, session, or UTC day returns `rebind` and pays 0.

## H2-S call

```text
receipt = SprotoShooterSim.verifyRun(clientLog, {
  issuance,          // row stored at issue time
  accountId,         // authenticated Nakama user
  sessionId,         // authenticated session
  day,               // UTC day of the authenticated request, compared to issuance.day
  seenDigests,       // prior digests for this game
  seenRunIds,        // prior run ids
  resume,            // { hash, tick, state, parts } or omit to start at tick 0
  clock              // optional () => ms, default Date.now
})
```

Pay 20 Tickets once per account, game, `receipt.canonicalBoss`, and issuance UTC day only when `receipt.ok && receipt.eligible && receipt.outcome === "clear" && receipt.ticketsMinted === 0 && receipt.canonicalCount === 1`. Enforce the existing 200-per-session and 1000-per-account-per-game-per-day caps in SQL. Seal the ledger, the receipt, and the board write in one transaction. Do not add a client-callable positive `event_rule`, and do not let `tickets.earn` or a generic score RPC name this reason.

`distinctFrom` on glowie includes `agent`. Do not map Shooter glowie onto Duel's agent bucket.

## Fixtures locked in tests/fixtures/boss-goldens.json

| Run | Seed | Frames | Base64 chars | Outcome | Eligible | Hash |
|---|---:|---:|---:|---|---|---|
| sahil success | 7 | 1289 | 20624 | clear | yes | `9de9c265` |
| sahil fail | 7 | 1247 | 19952 | fail | no | `c6ac839f` |
| sahil assisted (Goo Bolt last hit) | 9 | 1124 | 17984 | assisted | no | `c2be0569` |
| obama success (both parts) | 11 | 2491 | 39856 | clear | yes | `ae7a4a5c` |

Those four, plus the rejection matrix, replay to the same receipt in Node, Chromium, and goja (`github.com/dop251/goja` v0.0.0-20261107161106-d6eaa50db8bc). On this host the whole golden file, including browser launch, finished in a few seconds. The contract ceiling remains 15000 ms so a 45-minute segmented log can be checked one segment at a time without a single call simulating the entire campaign.

## Remaining for H2-S

- Vendor `build/shooter-sim.js` and the pin from the merged shooter commit. This repo's CI does not upload the bundle.
- Auth, rate limits, the 20-Ticket amount, the 200/1000 caps, and the UTC-day bucket live in Nakama, not here.
- Persist checkpoints and consumed digests in SQL. This bundle does not.
- Wager escrow is a later phase. Transfers may be uncapped. Creation stays impossible.
