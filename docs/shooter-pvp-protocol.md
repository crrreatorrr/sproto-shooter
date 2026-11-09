# Shooter free 1v1 protocol (S5, protocol 2 since SHOOTER-S2a)

This is the contract H3-S implements for a Nakama authoritative match. The arena is free. The bundle does not stake, settle, refund, or mint Tickets. A later escrow may move existing Tickets between the two accounts. It must not create any.

Campaign verification is a different artifact. It stays protocol **1**, content fingerprint **3c657fb5**, global `SprotoShooterSim`, entry `verifyRunJSON`. Do not point the campaign verifier at this bundle.

Protocol 2 (director v2) replaced protocol 1 in SHOOTER-S2a. It is a deliberate pin bump: a protocol 1 client gets `version` on HELLO and never matchmakes with a protocol 2 client. The sim did not change (golden `ce272de1`).

## Artifact

```bash
npm run build:server-sim
```

| File | Role |
|---|---|
| `build/shooter-sim.js` | Unchanged campaign verifier. Global `SprotoShooterSim`. |
| `build/shooter-sim.pin.json` | Campaign pin. `protocol` 1, `contentFingerprint` `3c657fb5`. |
| `build/shooter-pvp-sim.js` | Free arena. Global `SprotoShooterPvp`. |
| `build/shooter-pvp-sim.pin.json` | Arena pin. `protocol` 2, `sim` 1, `contentFingerprint` `0e584d36`, `directorState` 2, `replayVersion` 2. |

`sourceCommit` is `git rev-parse HEAD` baked in before the sha256. Rebuild on the merged shooter SHA and vendor `shooter-pvp-sim.js` plus its pin. Refuse the match if `bundleSha256`, `protocol`, `sim`, or `contentFingerprint` disagrees with the running copy.

Measured identity of this phase:

| Field | Value |
|---|---|
| `protocol` | 2 (was 1) |
| `sim` | 1 |
| `contentFingerprint` | `0e584d36` (protocol 1 was `f5949631`) |
| `loadoutHash` | `9eb7cd63` |
| Global | `SprotoShooterPvp` |
| JSON entry | `replayJSON` (v1 `{seed, inputs}` and v2 used-input logs) |
| Director | `createDirector`, `restoreDirector` |
| `mintsTickets` | false |
| `stakes` | false |

`replayJSON(text)` replays `{ seed, inputs }` (v1) or a director replay record (v2, below) and returns a receipt. `ticketsMinted` is always 0. There is no settle function and no `earnTickets` string in the bundle.

Two goldens, each checked in Node, Chromium and goja:

- The mirrored sim golden (`scriptedMatch(7, 180)` in `src/sim/pvp/sim.js`) ends `outcome: "draw"`, `reason: "double_ko"`, `winner: null`, `tick: 61`, `stateHash: "ce272de1"`.
- The director golden (`tests/fixtures/director-golden.js`: a scripted two-client session with a lead-in, jittered and stalled uplinks, a resent frame, a frame past the window, a disconnect and a rejoin on a new session id, pings, then a stall) ends `outcome: "forfeit"`, `winner: 0`, `reason: "stall"`, `tick: 892`, `stateHash: "e421cba8"`, 57 late frames, and its used-input log replays verified. It gives the same result when the director is frozen and thawed after every call.

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
| Lead-in | 9 ticks (300 ms) between the last READY and tick 0. `createDirector({ leadInTicks })`, 0..90 |
| Length | 90 s (`2700` ticks), then the higher `hp + shield` wins, or a draw |
| Server cap | 10 min. The sim already ended |
| Ready | 30 s |
| Input stall / reconnect grace | 10 s |
| Perks | none |
| Economy | none |

Matchmaker, through the hub SDK. The query requires the same protocol **and** content fingerprint, so mismatched builds never pair:

```text
query: +properties.game:sproto-shooter +properties.mode:free +properties.protocol:2 +properties.content:0e584d36
minCount: 2
maxCount: 2
stringProperties:
  game: sproto-shooter
  mode: free
  protocol: "2"
  sim: "1"
  content: 0e584d36
```

One account, one seat. A HELLO from the same account on a new session replaces that seat's session. The previous session is `wrong_sender`. A third account is `match_full`. Guests are not given a second seat. Do not reuse a Fighter match id or its wallet functions.

Label the match so listings can see it is free:

```json
{"kind":"sproto_shooter_free","game":"sproto-shooter","mode":"free","protocol":2,"content":"0e584d36","stake":0}
```

## Loadout

Both seats get the same three existing guns. Common, Ol' Reliable, stock parts, level 1, no element, no wacky, no ±5% jitter, no perks.

| Slot | Gun | Damage | Mag | Spread | Crit mult | Reserve |
|---|---|---:|---:|---:|---:|---|
| 0 | Machine Gun | 9 | 36 | 0.84 | 2.3 | infinite, magazine still reloads |
| 1 | Shotgun | 8 | 6 | 4.2 | 2.3 | 24 shells, plus the mag |
| 2 | Sniper | 85 | 4 | 2.1 | 3.3 | 12 rounds, plus the mag |

Health is 100, shield is 50, in milli-units on the wire (`100000` and `50000`). Each seat has its own RNG started from the same match seed, so identical inputs take identical damage. The server seed is chosen by the match, never by the client. (The seed is still sent in WELCOME and PHASE; S2b splits it into a public spawn seed and a secret combat seed.)

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
| 10 | c→s | `PING` (new in 2) |
| 11 | s→c | `PONG` (new in 2) |

A client `RESULT` (op 8), or a hello/ready body containing `winner`, `result`, `settle`, `earn`, `earnTickets`, `stake`, `wager`, `tickets`, `god`, `godMode`, `debug`, or `refund`, is `client_result`. The match result does not change.

### Who receives what

Every director output is `{ op, body, to }`. `to` is `null` (broadcast to the match) or the presence `{ userId, sessionId }` it is for; pass it as the `presences` argument of `dispatcher.broadcastMessage`. Send exactly the returned `messages`, in order.

| Message | Recipient |
|---|---|
| `WELCOME` | one seat (each seat gets its own body) |
| `REJECT` | the sender only (protocol 1 broadcast it) |
| `PONG` | the sender only |
| `SNAPSHOT` | one seat (per-recipient body), connected seats only |
| `PHASE`, `RESULT` | the whole match. `RESULT` appears exactly once |

### HELLO, WELCOME, rejoin

`HELLO`:

```json
{"accountId":"nakama-user-id","protocol":2,"sim":1,"content":"0e584d36"}
```

`accountId` must equal the socket's user id. `protocol`, `sim`, and `content` must all match or the reason is `version`. The presence session id is the seat session. The body does not get to name a session. The seat's display name is the presence `username` (cut to 32 chars); the hub sanitizes names before they reach the director.

HELLO is the **only** way to rebind a seat to a new session (a reconnect on a new session id). A HELLO that takes a new seat is answered with a `WELCOME` to every connected seat (so the other seat learns its opponent). A HELLO that rebinds an existing seat is answered **only to the rebinding seat**: its `WELCOME` and, once live, a `SNAPSHOT`. After the match is `done`, a HELLO from a seated account rebinds it and gets its `WELCOME`, the final `SNAPSHOT` and a copy of `RESULT` (to that session only; the match-wide `RESULT` is still sent once). A HELLO from anyone else after `done` is `ended`.

Message data may arrive as a string, a `Uint8Array` or a raw `ArrayBuffer` (what goja's match handler hands over); the director decodes all three and treats undecodable JSON or a bad INPUT length as `malformed`, never `wrong_sender`.

```json
{
  "accountId": "nakama-user-id",
  "seat": 0,
  "matchId": "nakama-match-id",
  "protocol": 2,
  "sim": 1,
  "content": "0e584d36",
  "seed": 7,
  "loadoutHash": "9eb7cd63",
  "phase": "lobby",
  "tick": 0,
  "ready": false,
  "lastSeq": 0,
  "leadInTicks": 9,
  "opponent": "other-user-id",
  "names": ["Ada", "Bea"],
  "ticketsMinted": 0,
  "stakes": false
}
```

`lastSeq` is the highest input sequence the seat has accepted; a client resuming after a reload continues above it. `READY` is `{"accountId":"nakama-user-id"}`. `RESYNC` is the same shape, for the **bound** session only (a new session gets `wrong_sender` until it sends HELLO); the answer is a WELCOME and a snapshot. Neither resets health, seed, or the accepted sequence.

Per seat, HELLO and RESYNC together are limited to 2 per second, and READY to 2 per second (fixed one-second windows); more is `rate`. Each costs a WELCOME (and HELLO/RESYNC a full snapshot), so they cannot be spammed into a downlink flood.

### PING / PONG

`PING` is `{"t": clientTimeMs}`, at most 10 per second per seat (`rate`). `PONG` echoes it with the server clock:

```json
{"t": 1234.5, "serverMs": 98765, "tick": 41, "clockTick": 41.012, "phase": "live"}
```

The client pings on its WELCOME, **once more as soon as the first PONG arrives** (so a server that measures round trips from PING echoes gets its first sample one RTT later instead of 500 ms later), then every 500 ms. It keeps the median of its last 5 round trips and ignores a sample over 2 s. PINGs do not refresh the stall timer.

## Clock, ready, lead-in, stall

`phase` is `lobby`, then `live`, then `done`.

- The first hello starts a 30 s wait. If the second account never arrives, cancel.
- The second hello starts a fresh 30 s ready timer. If either seat has not sent `READY`, cancel.
- Cancel result: `outcome: "cancel"`, `winner: null`, `reason: "ready_timeout"`, `ticketsMinted: 0`.
- The match goes live when both seats are ready **and connected**. A seat that drops in the lobby loses its ready flag and sends READY again after its HELLO.
- Going live broadcasts `PHASE` and sends each seat the spawn snapshot. Tick 0 is `leadInTicks` (9) ticks after the last READY, so the first inputs reach the server before the clock starts and the first round trip of ticks carries real input. `PHASE` announces it:

```json
{"phase":"live","tick":0,"clockTick":-9,"startTick":0,"leadInTicks":9,"seed":7,"matchId":"m","ticketsMinted":0,"stakes":false}
```

- `clockTick` (in PHASE, SNAPSHOT and PONG) is the server clock in ticks when the message was sent: negative during the lead-in, fractional between ticks. `tick` is the cursor, the next frame the sim will step.
- While live, the server steps from its own clock, at most **4 ticks per advance** (a late callback catches up over the next ones).
- Tick 0 is each seat's first `lastInputAt`. If one seat has no **accepted** input (late frames count) for 10 s and the other has, the quiet seat forfeits: `outcome: "forfeit"`, `winner` is the other seat, `reason: "stall"`.
- If both are quiet for 10 s on the same advance: `outcome: "draw"`, `winner: null`, `reason: "both_stall"`.
- A sim KO or the 90 s clock is applied before the stall check on that advance. Terminal combat evidence wins over a disconnect that arrives in the same step.
- Disconnect clears `connected` and does not free the seat. The old session cannot send. A HELLO from a new session for the same account can, until the 10 s grace has already forfeited.
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

16 bytes, little-endian. Unchanged from protocol 1.

| Offset | Type | Meaning |
|---:|---|---|
| 0 | uint32 | sequence, starts at 1, must increase (gaps allowed in protocol 2) |
| 4 | int32 | frame, the server tick this wish is for |
| 8 | int16 | yaw, `-32767..32767` maps to `-pi..pi` |
| 10 | int16 | pitch, same range maps to `-1.5..1.5` |
| 12 | int8 | moveX, `-127..127` maps to `-1..1` |
| 13 | int8 | moveZ, same. Positive is forward |
| 14 | uint8 | buttons |
| 15 | int8 | slot `-1..2`. `-1` keeps the current gun |

Button bits, low to high: `fire`, `zoom`, `sprint`, `jump`, `dash`, `reload`, `slide`. Bit 7 must be 0. `slide` is accepted and does not move the arena body in sim 1. `jump`, `dash`, `reload` and a slot pick are edges. `fire`, `zoom` and `sprint` are held.

## Server jitter buffer (director v2)

| Rule | Value |
|---|---|
| Window | frames `cursor .. cursor + 8` are queued for their tick. A resent frame (higher seq) replaces the queued one |
| Late frame (`frame < cursor`) | **accepted and discarded**: it consumes its seq, refreshes the stall timer and the held aim, counts in the seat's `late`. No reject, so a TCP burst never becomes a reject storm |
| Sequence | must be greater than `lastSeq`; gaps are fine |
| Frame rate | a token bucket of 45 frames, refilled at 45/s, counts every frame (late too). A burst after a stall passes because the bucket refilled while the link was quiet |
| Per tick | at most 9 queued (not late) frames per server clock tick: `futureFrames + 1`, so a TCP burst that delivers the whole window at once (lead ≥ 7 after a stall) is not cut |
| Missing tick | repeat the last applied wish's move, aim and held buttons (`fire`, `zoom`, `sprint`) for up to 3 ticks, then neutral (no move, no buttons, aim held). Edge buttons and slot picks never repeat |
| Catch-up | at most 4 ticks per advance |

Rejects, checked in this order:

| Check | Reason |
|---|---|
| Wrong account, or a session that is not the seat's bound one | `wrong_sender` |
| Match not live | `not_live` |
| Packet length not 16, slot outside `-1..2`, button bit 7 | `malformed` |
| Not finite | `nan` |
| Sequence not above `lastSeq` (or below 1) | `sequence` |
| Frame &gt; cursor + 8, negative, or &gt; 1000000 | `frame` |
| Token bucket empty, or 9 queued frames this tick already | `rate` |
| Id not 1..80 chars of `[A-Za-z0-9_.:@|-]` | `malformed` |

`REJECT` goes to the sender only and carries `accountId`, `reason`, `lastSeq`, `tick` (the cursor), and for INPUT the rejected `seq` and `frame`, plus `ticketsMinted: 0`. A rejected input does not consume the sequence.

The reference client (`src/net/client.js`) runs a fixed 30 Hz input clock and sends exactly one input per input tick, stamped `frame` = estimated server tick + lead, never below 0 (so during the lead-in it starts sending `lead` ticks before tick 0). The estimate uses the least-delayed recent `clockTick`. The lead starts at the PING round trip in ticks plus one, rises by one (at most once per round trip, at most to that lead plus 2) when a snapshot's `you.late` grows by one or two, ignores larger jumps (a TCP stall: hold-last covers it), drops back into the window on a `frame` reject past `cursor + 8`, and is capped at 12. It also comes back down:

- **RTT cap:** whenever the median round trip falls, the lead is capped at `ceil(RTT / 33.3 ms) + 1 + 2`. After an RTT spike (harness: 300 ms for 3 s, then 80 ms) the server-side buffer is back to its calm depth within 2 s.
- **Buffer trim:** when `you.buffer` (frames queued at or after the cursor) stays above 2 for a whole second, the lead drops by the excess. The window restarts after any lead change, since the server sees a change only one uplink later.

It never rewinds its sequence. After a reconnect on a new session id it sends HELLO, not RESYNC.

**Hidden tab:** browsers stop animation frames in a background tab. The input clock and PINGs run from the render loop, so a hidden tab sends neither, and the director forfeits that seat after `STALL_MS` (10 s) with no input (`stall`). This is deliberate: a player who tabs away for 10 s has left the duel.

## Snapshots

One per tick (30 Hz) per connected seat, plus the spawn snapshot at go-live, one after a HELLO rebind or RESYNC, and the final one when the match ends. Each seat's body is its own: `you` carries that seat's ack and private state. Positions are snapped to 0.0001 m inside the sim so Node and goja agree. Still JSON in S2a; binary snapshots (~90 B) are a follow-up (S2c).

```json
{
  "tick": 12,
  "clockTick": 12,
  "phase": "live",
  "outcome": null,
  "winner": null,
  "reason": null,
  "players": [
    {"seat":0,"x":0,"y":0,"z":0,"yaw":0,"pitch":0,"vx":0,"vz":0,"hp":100000,"shield":50000,"alive":true,"slot":0}
  ],
  "you": {
    "seat": 0,
    "ackFrame": 11,
    "ackSeq": 15,
    "lastSeq": 17,
    "buffer": 2,
    "late": 0,
    "held": 1,
    "neutral": 0,
    "private": {"vy":0,"shieldDelay":0,"onGround":true,"invuln":0,"dashT":0,"dashCd":0,"dashX":0,"dashZ":0,"mag":[36,6,4],"shells":24,"sniper":12,"fireCd":0,"reloadT":0,"swapT":0}
  },
  "ticketsMinted": 0
}
```

- `ackFrame` / `ackSeq`: the newest tick that used this seat's own input, and that input's sequence. Ticks after it used held or neutral substitutes.
- `buffer`: frames queued at or after the cursor. `late`: late frames so far. `held` / `neutral`: substitute ticks so far.
- `private`: the rest of this seat's exact sim state; with `players[seat]` it is the whole player (S3 reconciles from it). The combat RNG is never sent.
- `hash` (FNV-1a over the sim state with floats quantized to micro-units, the same `verifyStateHash` the campaign bundle uses) is present once per second (`tick % 30 === 0`) and on the final snapshot. It is not a receipt the client can submit for Tickets.

Clients render the other seat at estimated server time minus 100 ms, interpolating position and yaw between the two snapshots around it, extrapolating by velocity for at most 100 ms when starved, then holding. The camera uses the client's own yaw and pitch, not the snapshot copy. Health and the result come from the newest snapshot and from `RESULT`; once a result exists the client's phase stays `done`. Interpolation is not restart state.

## Used-input log and replay v2

The director records the exact wish it applied for each seat on each tick, held and neutral substitutes included: 8 bytes per seat-tick as hex (`src/sim/pvp/used.js`), in chunks of 30 ticks. It steps the sim with the entry **decoded back from the log**, not the in-memory record, so a replay of the log is the same match by construction. A full 90 s match is about 86 KB. `director.replayRecord()` returns:

```json
{"v":2,"seed":7,"matchId":"m","protocol":2,"sim":1,"content":"0e584d36","used":["<hex>", "..."],"expect":{"tick":892,"stateHash":"e421cba8","outcome":null,"winner":null,"reason":null},"result":{"outcome":"forfeit","winner":0,"reason":"stall","tick":892,"stateHash":"e421cba8","ticketsMinted":0,"stakes":false},"ticketsMinted":0}
```

`replayJSON(record)` re-runs the log from the seed and returns the receipt plus `verified` and `mismatch` (any of `tick`, `stateHash`, `outcome`, `winner`, `reason`, `extraTicks`, `expect`). A malformed log is `{ ok: false, reason: "malformed" }`. `expect` holds the **sim's** outcome fields; a director outcome (forfeit, stall, cancel) is in `result` and leaves the sim's at `null`. A wager settles only on `verified: true`.

## Keeping the director, and freeze/thaw

**Keep the live director object for the whole match, in the match's own JS VM.** Nakama's JS runtime runs each authoritative match in its own goja VM and hands the same state object back to every callback, so the state can hold the director instance itself. Do **not** freeze and thaw on every callback: measured in goja during review, `exportState()` + `restoreDirector()` per callback costs 7.4 ms mean and 14 ms p95 late in a match (the used-input log grows to ~86 KB), which is over the per-tick budget of a 30 Hz loop that also has to step the sim.

All director state is still plain JSON. `director.exportState()` returns it and `restoreDirector(state)` (or `createDirector().importState(state)`) brings it back, with identical messages, log and hash afterwards (tested in Node, goja and Chromium, frozen and thawed after every call). Use it only:

- at phase changes (lobby → live, live → done), to keep a recovery copy; and
- for crash recovery: if the match VM is lost, thaw the last copy and continue. The sim is deterministic from the used-input log, so a copy taken at go-live plus the log replays to the same state.

## What H3-S must do

1. Load `shooter-pvp-sim.js` in goja. Per match you **must** use `createHostedDirector({ seed, matchId })`. It throws unless the seed is a server-chosen 32-bit integer and `matchId` is the Nakama match id, so a hosted match never runs on the defaults. Keep the director object in match state for the whole match. Export it only at phase changes and for crash recovery (see above).
2. `joinAttempt`: same account may rejoin; a third account is `match_full`; a finished match is `ended`.
3. On match data, `director.handle(presence, opCode, bytes, serverNowMs)` with the presence's `userId`, `sessionId` and `username`. Send its `messages` (each to `to`, or to everyone when `to` is null).
4. On a fixed 30 Hz server tick, `director.advance(serverNowMs)` and send its `messages` the same way. `RESULT` is among them exactly once.
5. On leave, `director.disconnect(userId, sessionId)`. Do not delete the seat during the 10 s grace.
6. Ignore client snapshots, scores, and winners. Do not call `tickets.earn`, `session.event`, or any settle RPC from this match.
7. A version mismatch cancels before the sim starts and moves no Tickets.
8. Keep the campaign verifier pinned separately. A free-arena hash is not a boss clear.
9. Before settling anything, run `replayJSON(director.replayRecord())` and require `verified: true`.

The in-repo stub is `registerFreeMatch` / `createMockArena` in `src/net/client.js`. It speaks this contract over `createMockRealtimeServer` until H3-S replaces it. Its `freeze: true` option thaws the director on every callback; that is a test of state completeness, not how a host should run it. Offline practice uses the same director locally and is not a match.

## Left for later tickets

- **S2b** (sim 2): history ring and `viewTick` rewind, split spawn/combat seed (stop sending the combat seed), crits off in PvP, new sim golden.
- **S2c**: binary INPUT batches and per-recipient binary snapshots (JSON is ~25–28 KB/s down per client on the wire at 30 Hz with 130 B Nakama envelopes, measured on the realistic harness; the target is ~6.6 KB/s). Check goja's `broadcastMessage` with binary first.
- **S3**: prediction and reconciliation from `you.ackFrame` / `you.private`, adaptive interpolation delay (client starvation at RTT 100±30 is 1.1–1.4% with the fixed 100 ms delay on the realistic harness, just over the gate), clock-rate adjustment from `you.buffer`.
