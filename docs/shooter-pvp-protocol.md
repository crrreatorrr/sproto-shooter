# Shooter free 1v1 protocol (S5)

This is the contract H3-S implements for a Nakama authoritative match. The arena is free. The bundle does not stake, settle, refund, or mint Tickets. A later escrow may move existing Tickets between the two accounts. It must not create any.

Campaign verification is a different artifact. It stays protocol **1**, content fingerprint **3c657fb5**, global `SprotoShooterSim`, entry `verifyRunJSON`. Do not point the campaign verifier at this bundle.

## Artifact

```bash
npm run build:server-sim
```

| File | Role |
|---|---|
| `build/shooter-sim.js` | Unchanged campaign verifier. Global `SprotoShooterSim`. |
| `build/shooter-sim.pin.json` | Campaign pin. `protocol` 1, `contentFingerprint` `3c657fb5`. |
| `build/shooter-pvp-sim.js` | Free arena. Global `SprotoShooterPvp`. |
| `build/shooter-pvp-sim.pin.json` | Arena pin. `protocol` 1, `sim` 1, `contentFingerprint` `f5949631`. |

`sourceCommit` is `git rev-parse HEAD` baked in before the sha256. Rebuild on the merged shooter SHA and vendor `shooter-pvp-sim.js` plus its pin. Refuse the match if `bundleSha256`, `protocol`, `sim`, or `contentFingerprint` disagrees with the running copy.

Measured identity of this phase:

| Field | Value |
|---|---|
| `protocol` | 1 |
| `sim` | 1 |
| `contentFingerprint` | `f5949631` |
| `loadoutHash` | `9eb7cd63` |
| Global | `SprotoShooterPvp` |
| JSON entry | `replayJSON` |
| `mintsTickets` | false |
| `stakes` | false |

`replayJSON(text)` replays `{ seed, inputs }` and returns a receipt. `ticketsMinted` is always 0. There is no settle function and no `earnTickets` string in the bundle.

The mirrored golden (`scriptedMatch(7, 180)` in `src/sim/pvp/sim.js`) ends `outcome: "draw"`, `reason: "double_ko"`, `winner: null`, `tick: 61`, `stateHash: "ce272de1"`. Node, the browser, and goja must all report that hash.

## Match

| Rule | Value |
|---|---|
| Nakama handler name | `sproto_shooter_free` |
| Game id | `sproto-shooter` |
| Mode | `free` |
| Seats | 2 |
| Stage | existing legacy `arena`, radius 45, no boxes, no loot |
| Spawn | radius 16, opposite points, angle `(seed >>> 0) % 360` degrees |
| Clock | 30 Hz. `stepMs = 1000/30`. Server clock only |
| Length | 90 s (`2700` ticks), then the higher `hp + shield` wins, or a draw |
| Server cap | 10 min. The sim already ended |
| Ready | 30 s |
| Input stall / reconnect grace | 10 s |
| Perks | none |
| Economy | none |

Matchmaker, through the hub SDK:

```text
query: +properties.game:sproto-shooter +properties.mode:free +properties.protocol:1
minCount: 2
maxCount: 2
stringProperties:
  game: sproto-shooter
  mode: free
  protocol: "1"
  sim: "1"
  content: f5949631
```

One account, one seat. A second socket for the same account replaces that seat's session. The previous session is `wrong_sender`. A third account is `match_full`. Guests are not given a second seat. Do not reuse a Fighter match id or its wallet functions.

Label the match so listings can see it is free:

```json
{"kind":"sproto_shooter_free","game":"sproto-shooter","mode":"free","protocol":1,"stake":0}
```

## Loadout

Both seats get the same three existing guns. Common, Ol' Reliable, stock parts, level 1, no element, no wacky, no ±5% jitter, no perks.

| Slot | Gun | Damage | Mag | Spread | Crit mult | Reserve |
|---|---|---:|---:|---:|---:|---|
| 0 | Machine Gun | 9 | 36 | 0.84 | 2.3 | infinite, magazine still reloads |
| 1 | Shotgun | 8 | 6 | 4.2 | 2.3 | 24 shells, plus the mag |
| 2 | Sniper | 85 | 4 | 2.1 | 3.3 | 12 rounds, plus the mag |

Health is 100, shield is 50, in milli-units on the wire (`100000` and `50000`). Each seat has its own RNG started from the same match seed, so identical inputs take identical damage. The server seed is chosen by the match, never by the client.

## Opcodes

Integers. JSON bodies are UTF-8 objects. `INPUT` is raw little-endian bytes, not JSON.

| Op | Dir | Name |
|---:|---|---|
| 1 | c→s | `HELLO` |
| 2 | s→c | `WELCOME` |
| 3 | s→c | `REJECT` |
| 4 | c→s | `READY` |
| 5 | s→c | `PHASE` |
| 6 | c→s | `INPUT` |
| 7 | s→c | `SNAPSHOT` |
| 8 | s→c | `RESULT` |
| 9 | c→s | `RESYNC` |

A client `RESULT` (op 8), or a hello/ready body containing `winner`, `result`, `settle`, `earn`, `earnTickets`, `stake`, `wager`, `tickets`, `god`, `godMode`, `debug`, or `refund`, is `client_result`. The match result does not change.

`HELLO`:

```json
{"accountId":"nakama-user-id","protocol":1,"sim":1,"content":"f5949631"}
```

`accountId` must equal the socket's user id. `protocol`, `sim`, and `content` must all match or the reason is `version`. The presence session id is the seat session. The body does not get to name a session.

`WELCOME` is broadcast. Clients keep the row whose `accountId` is their own.

```json
{
  "accountId": "nakama-user-id",
  "seat": 0,
  "matchId": "nakama-match-id",
  "protocol": 1,
  "sim": 1,
  "content": "f5949631",
  "seed": 7,
  "loadoutHash": "9eb7cd63",
  "phase": "lobby",
  "tick": 0,
  "opponent": null,
  "ticketsMinted": 0,
  "stakes": false
}
```

`READY` is `{"accountId":"nakama-user-id"}`. `RESYNC` is the same shape, sent after the SDK reconnects. The server answers with a fresh welcome and a snapshot. It does not reset health, seed, or the accepted sequence except to continue from `lastSeq`.

## Clock, ready, stall

`phase` is `lobby`, then `live`, then `done`.

- The first hello starts a 30 s wait. If the second account never arrives, cancel.
- The second hello starts a fresh 30 s ready timer. If either seat has not sent `READY`, cancel.
- Cancel result: `outcome: "cancel"`, `winner: null`, `reason: "ready_timeout"`, `ticketsMinted: 0`.
- Both readies start the sim at the server's `now`. That `now` is each seat's first `lastInputAt`.
- While live, the server steps from its own clock. A missing input for a tick is neutral: no move, no fire, yaw held. It does not refresh the stall timer.
- If one seat has no **accepted** input for 10 s and the other has, the quiet seat forfeits: `outcome: "forfeit"`, `winner` is the other seat, `reason: "stall"`.
- If both are quiet for 10 s on the same advance: `outcome: "draw"`, `winner: null`, `reason: "both_stall"`.
- A sim KO or the 90 s clock is applied before the stall check on that advance. Terminal combat evidence wins over a disconnect that arrives in the same step.
- Disconnect clears `connected` and does not free the seat. The old session cannot send. A new session for the same account can, until the 10 s grace has already forfeited.
- Draw reasons from the sim are `double_ko` and `time` (equal `hp + shield`). A higher total at 90 s is `outcome: "time"` with that seat as `winner`.
- A sole death is `outcome: "ko"`.

`RESULT` is server-originated only:

```json
{
  "outcome": "ko",
  "winner": 0,
  "reason": "ko",
  "tick": 61,
  "stateHash": "8 hex chars",
  "ticketsMinted": 0,
  "stakes": false
}
```

`winner` is `0`, `1`, or `null`. Clients display this object. They do not derive a winner from hit points.

## Input codec

16 bytes, little-endian.

| Offset | Type | Meaning |
|---:|---|---|
| 0 | uint32 | sequence, starts at 1, increases by exactly 1 |
| 4 | int32 | frame, the server cursor this wish is for |
| 8 | int16 | yaw, `-32767..32767` maps to `-pi..pi` |
| 10 | int16 | pitch, same range maps to `-1.5..1.5` |
| 12 | int8 | moveX, `-127..127` maps to `-1..1` |
| 13 | int8 | moveZ, same. Positive is forward |
| 14 | uint8 | buttons |
| 15 | int8 | slot `-1..2`. `-1` keeps the current gun |

Button bits, low to high: `fire`, `zoom`, `sprint`, `jump`, `dash`, `reload`, `slide`. Bit 7 must be 0. `slide` is accepted and does not move the arena body in sim 1. `jump` and `dash` are edges. `fire` and `zoom` are held.

The reference client runs a fixed 30 Hz input clock and sends exactly one input per input tick, stamped `frame` = estimated server tick + lead. The estimate is the least-delayed recent snapshot's `tick` plus elapsed time at 30 Hz. The lead starts at 2 (or the round trip in ticks plus one), rises by `cursor - frame + 1` on a late `frame` reject, drops back into the window on a frame past `cursor + 4`, and is capped at 12. After a reject it resends from `lastSeq + 1` and ignores the `sequence` rejects of inputs that were already in flight. Inputs also serve as the heartbeat.

Round trip: protocol 1 has no PING, so the client measures HELLO/READY → its own WELCOME. While live it repeats READY every 500 ms as a probe; director v1 answers a READY from a seated, live session with WELCOME (and a PHASE) and changes nothing. The RTT is the median of the last 5 samples, and a probe unanswered for 2 s is dropped. Whenever that median falls, the lead is capped at the round-trip lead (`ceil(RTT / 33.3 ms) + 1`) plus 2 ticks of jitter margin. Late rejects during an RTT spike can raise the lead to 12, and without the cap only the 30 s probe would have brought it down, one tick at a time. With the cap it comes back within about 3 probes (~1.5–2 s) of the spike ending.

**Hidden tab:** browsers stop animation frames in a background tab. The client's input clock and probes run from the render loop, so a hidden tab sends no inputs and no probes. The director forfeits that seat after `STALL_MS` (10 s) with no input (`stall`). This is deliberate: a player who tabs away for 10 s has left the duel.

Caps, checked before the sequence advances:

| Check | Limit | Reason |
|---|---|---|
| Not finite | | `nan` |
| Sequence not `lastSeq + 1` | | `sequence` |
| Frame &lt; cursor, or &gt; cursor + 4, or negative, or &gt; 1000000 | late window is 15 frames and is **not** rewound | `frame` |
| Accepted inputs in the last 1000 ms | 60 | `rate` |
| Accepted inputs while the cursor is unchanged | 4 | `rate` |
| Match not live | | `not_live` |
| Packet length | not 16 | `malformed` |
| Slot outside `-1..2`, or button bit 7 | | `malformed` |
| Id | 1..80 chars, `[A-Za-z0-9_.:@|-]` | `malformed` |

`REJECT` carries `accountId`, `reason`, `lastSeq`, `tick`, `ticketsMinted: 0`. A rejected input does not consume the sequence. `tick` is the server cursor (the next frame index).

Frames inside `cursor .. cursor+4` are queued and applied when that tick is stepped. The cursor starts at 0. Snapshots publish the cursor in `tick`.

## Snapshots

Broadcast after the go-live tick, every 3 sim ticks (10 Hz), on resync, and when the match ends. Positions are snapped to 0.0001 m inside the sim so Node and goja agree.

```json
{
  "tick": 12,
  "hash": "8 hex chars",
  "phase": "live",
  "outcome": null,
  "winner": null,
  "reason": null,
  "players": [
    {"seat":0,"x":0,"y":0,"z":0,"yaw":0,"pitch":0,"vx":0,"vz":0,"hp":100000,"shield":50000,"alive":true,"slot":0}
  ],
  "matchId": "nakama-match-id",
  "protocol": 1,
  "sim": 1,
  "content": "f5949631",
  "graceMs": 10000,
  "ticketsMinted": 0,
  "stakes": false
}
```

`hash` is FNV-1a over the sim state with floats quantized to micro-units, the same `verifyStateHash` the campaign bundle uses. It is not a receipt the client can submit for Tickets.

Clients render the other seat at estimated server time minus 100 ms, interpolating position and yaw between the two snapshots around it, extrapolating by velocity for at most 100 ms when starved, then holding. The camera uses the client's own yaw and pitch, not the snapshot copy. Health and the result come from the newest snapshot and from `RESULT`; once a result exists the client's phase stays `done`. Interpolation is not restart state.

## What H3-S must do

1. Load `shooter-pvp-sim.js` in goja. Call `createDirector({ seed, matchId })` per match. Seed is server-chosen, 32-bit.
2. `joinAttempt`: same account may rejoin; a third account is `match_full`; a finished match is `ended`.
3. On match data, `director.handle(presence, opCode, bytes, serverNowMs)`.
4. On a fixed server tick, `director.advance(serverNowMs)` and broadcast `PHASE`, new `SNAPSHOT`s, and `RESULT` once.
5. On leave, `director.disconnect(userId, sessionId)`. Do not delete the seat during the 10 s grace.
6. Ignore client snapshots, scores, and winners. Do not call `tickets.earn`, `session.event`, or any settle RPC from this match.
7. A version mismatch cancels before the sim starts and moves no Tickets.
8. Keep the campaign verifier pinned separately. A free-arena hash is not a boss clear.

The in-repo stub is `registerFreeMatch` / `createMockArena` in `src/net/client.js`. It speaks this contract over `createMockRealtimeServer` until H3-S replaces it. Offline practice uses the same director locally and is not a match.
