# Shooter free 1v1 protocol (S5, protocol 2 since SHOOTER-S2a, sim 2 since SHOOTER-S2b)

This is the contract H3-S implements for a Nakama authoritative match. The arena is free. The bundle does not stake, settle, refund, or mint Tickets. A later escrow may move existing Tickets between the two accounts. It must not create any.

Campaign verification is a different artifact. It stays protocol **1**, content fingerprint **73c6eb0f**, global `SprotoShooterSim`, entry `verifyRunJSON`. Do not point the campaign verifier at this bundle.

Protocol 2 (director v2) replaced protocol 1 in SHOOTER-S2a. It is a deliberate pin bump: a protocol 1 client gets `version` on HELLO and never matchmakes with a protocol 2 client. The S2a sim did not change (golden `ce272de1`).

Sim 2 (SHOOTER-S2b) is a deliberate golden bump: lag compensation (a 12-tick history ring and a `viewTick` rewind of at most 10 ticks), a split spawn/combat seed with a sha256 commit, and no crits. Protocol 2 was not frozen yet (the hub hosts protocol 1 until the S-train merges), so S2b changes it in place: INPUT grows to 18 bytes, WELCOME/PHASE carry `spawnSeed` and `combatCommit` instead of `seed`, RESULT reveals `combatSeed`, and snapshots carry `hits`. `sim` 2 and the new content fingerprint keep an S2a build (`sim` 1, `0e584d36`) from pairing or saying HELLO.

## Artifact

```bash
npm run build:server-sim
```

| File | Role |
|---|---|
| `build/shooter-sim.js` | Unchanged campaign verifier. Global `SprotoShooterSim`. |
| `build/shooter-sim.pin.json` | Campaign pin. `protocol` 1, `contentFingerprint` `73c6eb0f`. |
| `build/shooter-pvp-sim.js` | Free arena. Global `SprotoShooterPvp`. |
| `build/shooter-pvp-sim.pin.json` | Arena pin. `protocol` 2, `sim` 2, `contentFingerprint` `dc00f234`, `directorState` 3, `replayVersion` 2, `rewind` (the REWIND table), `replayLimits`, `crits` false, `combatSeed` `"sha256-commit-reveal-128"`. |

`sourceCommit` is `git rev-parse HEAD` baked in before the sha256. Rebuild on the merged shooter SHA and vendor `shooter-pvp-sim.js` plus its pin. Refuse the match if `bundleSha256`, `protocol`, `sim`, or `contentFingerprint` disagrees with the running copy.

Measured identity of this phase:

| Field | Value |
|---|---|
| `protocol` | 2 (was 1) |
| `sim` | 2 (S2a was 1) |
| `contentFingerprint` | `dc00f234` (shorter grapple with pull and release speed caps; previous `b33eada6`, `17d87c54`, S2a `0e584d36`, protocol 1 `f5949631`) |
| `loadoutHash` | `4cdfab55` (S2a `9eb7cd63`; crit chance is now 0) |
| Global | `SprotoShooterPvp` |
| JSON entry | `replayJSON` (v1 `{seed, inputs}` and v2 used-input logs) |
| Director | `createHostedDirector` (hosts **must** use it), `createDirector` (practice, tests), `restoreDirector` |
| Helpers | `combatCommitOf`, `rewindCapFor`, `sha256Hex`, `REWIND`, `REPLAY_LIMITS` |
| `mintsTickets` | false |
| `stakes` | false |

`replayJSON(text)` replays `{ seed, inputs }` (v1) or a director replay record (v2, below) and returns a receipt. `ticketsMinted` is always 0. There is no settle function and no `earnTickets` string in the bundle.

Two goldens, each checked in Node, Chromium and goja:

- The mirrored sim golden (`scriptedMatch(7, 180)` in `src/sim/pvp/sim.js`) ends `outcome: "draw"`, `reason: "double_ko"`, `winner: null`, `tick: 65`, `stateHash: "532a562e"` (was `6545ca0a`; sim 1: tick 61, `ce272de1`).
- The director golden (`tests/fixtures/director-golden.js`: a scripted two-client session with a lead-in, jittered and stalled uplinks, a resent frame, a frame past the window, a disconnect and a rejoin on a new session id, pings and PING echoes, viewTick claims (some oversized, so clamped), then a stall) ends `outcome: "forfeit"`, `winner: 0`, `reason: "stall"`, `tick: 892`, `stateHash: "55419e4e"` (was `b661a684`; before the S2b review fixes `078282e5`; sim 1 `e421cba8`), 57 late frames, 7 server-confirmed hits (62876 milli-HP), combat commit `6d5a619f…1fc6` for seed `5eed00c0ffee5eed00c0ffee5eed0042`, and its used-input log replays verified. It gives the same result when the director is frozen and thawed after every call.

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
query: +properties.game:sproto-shooter +properties.mode:free +properties.protocol:2 +properties.content:dc00f234
minCount: 2
maxCount: 2
stringProperties:
  game: sproto-shooter
  mode: free
  protocol: "2"
  sim: "2"
  content: dc00f234
```

One account, one seat. A HELLO from the same account on a new session replaces that seat's session. The previous session is `wrong_sender`. A third account is `match_full`. Guests are not given a second seat. Do not reuse a Fighter match id or its wallet functions.

Label the match so listings can see it is free:

```json
{"kind":"sproto_shooter_free","game":"sproto-shooter","mode":"free","protocol":2,"content":"dc00f234","stake":0}
```

## Loadout

Both seats get the same three existing guns. Common, Ol' Reliable, stock parts, level 1, no element, no wacky, no ±5% jitter, no perks, **no crits** (sim 2, owner decision: a crit made the Sniper a one-shot, and luck must not decide a wager; `critChance` is 0 in the loadout and the sim never rolls one; campaign guns keep theirs).

| Slot | Gun | Damage | Mag | Spread | Crits | Reserve |
|---|---|---:|---:|---:|---|---|
| 0 | Machine Gun | 9 | 36 | 0.84 | off | infinite, magazine still reloads |
| 1 | Shotgun | 8 | 6 | 4.2 | off | 24 shells, plus the mag |
| 2 | Sniper | 85 | 4 | 2.1 | off | 12 rounds, plus the mag |

Health is 100, shield is 50, in milli-units on the wire (`100000` and `50000`). Pellet spread is the only randomness left.

## Seeds: public spawn seed, secret combat seed (sim 2)

- `spawnSeed` (32-bit, public) places the spawns. It is in WELCOME, PHASE and RESULT.
- `combatSeed` (secret) seeds both seats' RNG (each seat its own RNG, started from the same seed, so identical inputs take identical damage). The host passes 32..128 lowercase hex chars (at least 128 bits) to `createHostedDirector({ spawnSeed, combatSeed, matchId })`; anything else throws. The RNG (sfc32, 128 bits of state) starts from the first 128 bits of `sha256("sproto-shooter:combat:" + seed)`, then 12 warm-up draws, so the RNG cannot be searched from a 32-bit space (the first draft used a 32-bit FNV-1a seed, which a client could brute-force from a snapshot hash). The raw seed is not kept in the sim state.
- At start only `combatCommit = sha256(combatSeed)` (sha256 of the hex text, 64 hex chars) is sent, in WELCOME and PHASE. RESULT reveals `combatSeed`; the reference client sets `result.combatVerified` from `sha256(combatSeed) === combatCommit`. `sha256Hex` is a small pure-JS SHA-256 in the bundle (`src/core/sha256.js`), so goja needs nothing.
- Without a `combatSeed` (practice, tests, the local mock) `createDirector` derives a predictable one and `director.combatSeedDerived` is true. **A host must use `createHostedDirector`**, which throws without a valid secret `combatSeed`, and a hosted director that somehow holds a derived seed (for example a tampered `importState`) cancels at go-live with `outcome: "cancel"`, `reason: "no_combat_seed"` instead of starting.
- Snapshots carry `hash` = `publicStateHash`: the state hash **without either player's RNG**, so clients never get a checksum of the secret RNG state. `RESULT`, the replay record and `replayJSON` use the full `hashState` (with the RNG) and `stateSha256`.
- Both seeds are chosen by the server, never by a client.

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
{"accountId":"nakama-user-id","protocol":2,"sim":2,"content":"dc00f234","interpMs":100}
```

`interpMs` (optional, sim 2) is the client's remote interpolation delay in ms; the director clamps it to 50..150 and uses it in the rewind cap (100 until announced). `accountId` must equal the socket's user id. `protocol`, `sim`, and `content` must all match or the reason is `version`. The presence session id is the seat session. The body does not get to name a session. The seat's display name is the presence `username` (cut to 32 chars); the hub sanitizes names before they reach the director.

HELLO is the **only** way to rebind a seat to a new session (a reconnect on a new session id). A HELLO that takes a new seat is answered with a `WELCOME` to every connected seat (so the other seat learns its opponent). A HELLO that rebinds an existing seat is answered **only to the rebinding seat**: its `WELCOME` and, once live, a `SNAPSHOT`. After the match is `done`, a HELLO from a seated account rebinds it and gets its `WELCOME`, the final `SNAPSHOT` and a copy of `RESULT` (to that session only; the match-wide `RESULT` is still sent once). A HELLO from anyone else after `done` is `ended`.

Message data may arrive as a string, a `Uint8Array` or a raw `ArrayBuffer` (what goja's match handler hands over); the director decodes all three and treats undecodable JSON or a bad INPUT length as `malformed`, never `wrong_sender`.

```json
{
  "accountId": "nakama-user-id",
  "seat": 0,
  "matchId": "nakama-match-id",
  "protocol": 2,
  "sim": 2,
  "content": "dc00f234",
  "spawnSeed": 7,
  "combatCommit": "64 hex chars: sha256(combatSeed)",
  "loadoutHash": "4cdfab55",
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

`PING` is `{"t": clientTimeMs}`, at most 10 per second per seat (`rate`). Since sim 2 it may also carry `echo` (the `serverMs` of the newest PONG the client got), `hold` (ms the client sat on that PONG) and `interpMs` (the client's current interpolation delay, as in HELLO). Since S3 the delay is adaptive: the client re-announces it in every PING, and pings early (at most every 100 ms) when it moved by 10 ms or more. `PONG` echoes `t` with the server clock:

```json
{"t": 1234.5, "serverMs": 98765, "tick": 41, "clockTick": 41.012, "phase": "live"}
```

The client pings on its WELCOME, **once more as soon as the first PONG arrives** (so a server that measures round trips from PING echoes gets its first sample one RTT later instead of 500 ms later), then every 500 ms. It keeps the median of its last 5 round trips and ignores a sample over 2 s. PINGs do not refresh the stall timer.

The director keeps its **own** round trip per seat for the rewind cap: `now - echo - hold`, counted only when `echo` is one of the last 4 `serverMs` values it sent that seat, `0 <= hold <= now - echo`, and the sample is at most 1000 ms (`REWIND.maxRttMs`). **Each PONG counts once**: its `serverMs` is consumed by the first PING that echoes it, so replaying an old echo cannot add a long sample. The median of the last 8 samples is `you.rttMs` in snapshots and `seatStats().rttMs`. A host may pass `rttCeilingMs` (for wagers: the lobby-measured baseline plus a margin); the rewind cap then uses `min(rttMs, rttCeilingMs)`.

## Clock, ready, lead-in, stall

`phase` is `lobby`, then `live`, then `done`.

- The first hello starts a 30 s wait. If the second account never arrives, cancel.
- The second hello starts a fresh 30 s ready timer. If either seat has not sent `READY`, cancel.
- Cancel result: `outcome: "cancel"`, `winner: null`, `reason: "ready_timeout"`, `ticketsMinted: 0`.
- The match goes live when both seats are ready **and connected**. A seat that drops in the lobby loses its ready flag and sends READY again after its HELLO.
- Going live broadcasts `PHASE` and sends each seat the spawn snapshot. Tick 0 is `leadInTicks` (9) ticks after the last READY, so the first inputs reach the server before the clock starts and the first round trip of ticks carries real input. `PHASE` announces it:

```json
{"phase":"live","tick":0,"clockTick":-9,"startTick":0,"leadInTicks":9,"spawnSeed":7,"combatCommit":"…","matchId":"m","ticketsMinted":0,"stakes":false}
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
  "tick": 65,
  "stateHash": "8 hex chars",
  "spawnSeed": 7,
  "combatSeed": "the secret seed, revealed",
  "combatCommit": "sha256(combatSeed)",
  "ticketsMinted": 0,
  "stakes": false
}
```

`winner` is `0`, `1`, or `null`. Clients display this object. They do not derive a winner from hit points.

## Input codec

18 bytes, little-endian (16 in S2a; sim 2 appended the view bytes). A 16-byte packet is `malformed`.

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
| 16 | uint8 | view back: `viewTick = frame - back` (0..255, never before tick 0). The interpolated server tick the shooter saw the opponent at |
| 17 | uint8 | `viewFrac`: the shooter saw `viewTick + viewFrac/256` |

Button bits, low to high: `fire`, `zoom`, `sprint`, `jump`, `dash`, `reload`, `slide`, `grapple`. `jump`, `dash`, `reload`, `slide` and a slot pick are edges. `fire`, `zoom`, `sprint` and `grapple` are held. Grapple reaches up to 16 units toward a pillar or the arena wall. An attached grapple caps pull speed and slows the player on release or arrival. A miss spends the cooldown and the claw retracts. Slide boosts along the current velocity. Sprint spends the shared stamina bar.

## Server jitter buffer (director v2)

| Rule | Value |
|---|---|
| Window | frames `cursor .. cursor + 8` are queued for their tick. A resent frame (higher seq) replaces the queued one |
| Late frame (`frame < cursor`) | **accepted and discarded**: it consumes its seq, refreshes the stall timer and the held aim, counts in the seat's `late`. No reject, so a TCP burst never becomes a reject storm |
| Sequence | must be greater than `lastSeq`; gaps are fine |
| Frame rate | a token bucket of 45 frames, refilled at 45/s, counts every frame (late too). A burst after a stall passes because the bucket refilled while the link was quiet |
| Per tick | at most 9 queued (not late) frames per server clock tick: `futureFrames + 1`, so a TCP burst that delivers the whole window at once (lead ≥ 7 after a stall) is not cut |
| Missing tick | repeat the last applied wish's move, aim and held buttons (`fire`, `zoom`, `sprint`, `grapple`) for up to 3 ticks, then neutral (no move, no buttons, aim held). Edge buttons and slot picks never repeat |
| Catch-up | at most 4 ticks per advance |

Rejects, checked in this order:

| Check | Reason |
|---|---|
| Wrong account, or a session that is not the seat's bound one | `wrong_sender` |
| Match not live | `not_live` |
| Packet length not 18, slot outside `-1..2`, button bit 7 | `malformed` |
| Not finite | `nan` |
| Sequence not above `lastSeq` (or below 1) | `sequence` |
| Frame &gt; cursor + 8, negative, or &gt; 1000000 | `frame` |
| Token bucket empty, or 9 queued frames this tick already | `rate` |
| Id not 1..80 chars of `[A-Za-z0-9_.:@|-]` | `malformed` |

`REJECT` goes to the sender only and carries `accountId`, `reason`, `lastSeq`, `tick` (the cursor), and for INPUT the rejected `seq` and `frame`, plus `ticketsMinted: 0`. A rejected input does not consume the sequence.

The reference client (`src/net/client.js`) runs a 30 Hz input clock and sends exactly one input per input tick. The first frame is estimated server tick + lead, never below 0 (so during the lead-in it starts sending `lead` ticks before tick 0); after that frames go up by exactly one per input tick (see the clock trim below). The estimate uses the least-delayed recent `clockTick`. It counts a PONG only as the answer to a PING still outstanding, once, so a repeated or stale PONG cannot read as a long round trip. It never rewinds its sequence. After a reconnect on a new session id it sends HELLO, not RESYNC.

**Hidden tab:** browsers stop animation frames in a background tab. The input clock and PINGs run from the render loop, so a hidden tab sends neither, and the director forfeits that seat after `STALL_MS` (10 s) with no input (`stall`). This is deliberate: a player who tabs away for 10 s has left the duel.

**Lead (one owner).** `lead` is a target in ticks ahead of the estimated server tick. Every rule moves only the target; the frames follow it with the clock trim below.

- It starts at the PING round trip in ticks plus one, and is capped at 12.
- **Late frames:** it rises by one (at most once per round trip, at most to the round-trip lead plus 2) when a snapshot's `you.late` grows by one or two, and ignores larger jumps (a TCP stall: hold-last covers it).
- **RTT lift and cap (S1/S2a review fixes, S3):** when the median round trip rises so far that the round-trip lead is more than one tick above the target, the target is lifted to it at once; whenever the median falls, the target is capped at `ceil(RTT / 33.3 ms) + 1 + 2`. After an RTT spike (harness: 300 ms for 3 s, then 80 ms) the server-side buffer is back to its calm depth about 1.5 s after the spike.
- **Buffer trim:** when `you.buffer` (frames queued at or after the cursor) stays above 2 for a whole second (a dip to 2 restarts the window), the target drops by the smallest excess seen less what the clock trim is still draining, never below the shortest recent round trip in ticks.
- **Clock-estimate steps (S3):** when the estimate moves a tick or more from where the target was anchored (the downlink got slower or faster, e.g. as an RTT spike starts or ends), the target moves with it, so the frames keep their timing at the server and the trim does not chase the estimate.
- A `frame` reject past `cursor + 8` lowers it back into the window, at most once per round trip (every frame in flight carries the same excess).

**Clock trim (S3, Overwatch-style).** The client does not skip or repeat frames to follow the target: it runs its input clock at `1 + clamp(0.05 × error, ±0.05)`, where `error` is `lead - 0.5 - (frame - estimated tick)` in ticks (dead band 0.1). Only big errors resync. More than 1.5 ticks over the target (a big drop: an RTT spike's raises capped, a deep buffer trimmed), the client repeats the previous frame each tick (`net.clockHolds`; the director replaces the queued frame) until the trim can take the rest. Under the target, the frame jumps forward to estimated tick + lead (`net.clockSnaps`) when late frames were reported in the last round trip and the error is past 1.5 ticks, or when the input clock dropped a render stall's backlog and the error is past 3 ticks; otherwise the trim takes it. A frame never moves back. Tuning is in `NET` and `TIMING` (`src/net/timing.js`); none of it is wire contract.

Each input also carries `viewTick`/`viewFrac` from the render time of the newest drawn frame (`estimated server tick - D/STEP_MS` at the last `sample()`), i.e. what the shooter saw. Since S3 the client keeps it continuous the way the director checks it: `viewTick` never moves back, `frame - viewTick` moves by at most 2 from the previous input's (`REWIND.maxBackStep`), and while that allows it the claim steps at most 2 ticks forward. Since frames never move back, an honest client is never clamped (`seatStats().viewClamped` is 0 on every harness profile). Spread is cosmetic on the client: damage, hitmarkers and kills come from the server's `hits` events and the snapshots.

## Lag compensation (sim 2)

| Rule | Value (`REWIND` in `src/sim/pvp/rules.js`) |
|---|---|
| History | the sim state keeps `hist`: per player a ring of 12 (`maxTicks + 2`) `{t, x, y, z, alive, invuln}` entries, written for each tick (and for tick F+1 right after movement, before the shots). It is part of the state hash, so replays reproduce it |
| Claim | `back = frame - viewTick` from the input (0..255) |
| Continuity (director) | per seat, in input order: `viewTick` never goes back, and `back` moves by at most 2 ticks (`REWIND.maxBackStep`) from the previous input; a claim outside that is clamped to it and counted (`seatStats().viewClamped`). An honest view moves one tick per tick, so a client cannot pick its rewind per shot (0 on one shot, the cap on the next). A HELLO rebind starts the check over |
| Cap (director) | per seat: `min(10, ceil((rttMs + interpMs + 2 × 33.3) / 33.3))` ticks. `rttMs` is the director's own PING-echo median, cut to the host's `rttCeilingMs` when one is set (0 until the first echo); `interpMs` is the client's announced interpolation delay, clamped to 50..150 ms (100 until announced). With no sample yet the cap is 5 ticks; at RTT 100 with 100 ms it is 8; at RTT 150 it is 10 |
| Clamp | `rewind = clamp(back, 0, cap)`. A claim past the cap is cut to the cap and its `viewFrac` dropped, so a lag-switch claim never reaches further than the seat's measured link. A claim in the future is rewind 0 |
| Sim | clamps again to 10 (ABS_MAX, 333 ms) and to tick 0, so a forged log cannot reach further |
| Target | interpolated between history ticks `F - rewind` and `F - rewind + 1` at `viewFrac/256` (rewind 0, frac 0 = the start of tick F). The shooter's eye stays at its current position |
| invuln | from the rewound tick (`F - rewind`). **Owner decision point:** this favours the shooter. A target that dashed (invulnerable now) can still be hit where the shooter saw it before the dash started; a target that was invulnerable back then but is not now cannot. The alternative (invuln from the current tick, or either tick) favours the target. Kept as is until the owner decides |
| alive | from the current tick: no hits on a corpse, a dead shooter cannot fire |
| Trades | both seats shoot on the same tick; two deaths are the existing `double_ko` |
| Held ticks | a repeated (hold-last) tick keeps the input's rewind and frac; neutral ticks claim none |

All three guns are hitscan and splash is zero, so there is no projectile rewind. The director counts cut claims per seat (`seatStats().clamped`). Snapshots tell each seat `you.rttMs`, `you.interpMs` and `you.rewindCap`.

Why `RTT + interp + 2 ticks`: an honest claim is the time from what the shooter saw to the tick its shot runs on. That is the uplink lead (the client stamps frames about one RTT ahead, because its clock estimate trails the server by the downlink) plus the downlink, plus the interpolation delay, plus the jitter buffer: about `RTT + interp` and a tick or two. The first S2b draft used `min(6, RTT/2 + interp + 1 tick)`, which cut 97% of honest claims at RTT 100 to 6 ticks and scored 69.5% agreement.

**Fairness trade-off.** A larger rewind favours the shooter: the target can be hit where the shooter saw it, up to `cap` ticks ago, even if on the target's own screen it had already stepped out of the line of fire ("shot behind the corner", though this arena has no walls, so it shows up as a hit that lands just after a sidestep). That is the cost of making hits match what the shooter saw. It is bounded three ways:
- ABS_MAX is 10 ticks (333 ms). No claim, measured RTT or announced delay gets past it, in the director or in the sim.
- The cap follows the seat's own link as the director measures it, plus at most 150 ms of interpolation. The client controls one part of that measurement, the moment it echoes a PONG: holding an echo back and reporting `hold: 0` reads as a longer round trip. That is bounded too: each echo counts once, a sample over 1000 ms is dropped, and for wagers the host passes `rttCeilingMs` (lobby baseline + margin), so a client cannot talk its cap above what its lobby link showed.
- The continuity rule stops a client from choosing a different rewind for each shot inside the cap.
- Wagered play requires lobby RTT ≤ 150 ms (plan §R.8), which keeps the cap at 10 ticks or less for wagers; in practice it sits at 8–9 at RTT 100–125.

**Measured on the realistic S0 harness** (`tests/net/baseline.test.js`, 15 s, firing bots; client clock offset and drift, a jittered Nakama loop with pauses). The check casts a ray from the shooter's **server** eye toward a seeded point near the target the client drew, against the drawn capsule and the server's rewound capsule. Both rays start at the same eye (there is no client prediction yet), so the check only compares the drawn target with the rewound one: it mostly measures whether the claim survived the clamp. S3 casts the client ray from the predicted eye. The ≥ 98% gate is on for RTT 100±30 and RTT 150:

| Profile | Claim p50 | Applied p50 | Cap | Clamped | Agreement | At the full claim |
|---|---:|---:|---:|---:|---:|---:|
| RTT 0 | 5 | 5 | 6 | 0% | 99.23% | 99.23% |
| RTT 100±30 | 8 | 8 | 9 | 0% | **99.75%** | 99.75% |
| RTT 150 | 9 | 9 | 10 | 0% | **99.74%** | 99.74% |
| Heavy tail | 8 | 8 | 9 | 0% | 99.49% | 99.49% |
| Stall bursts | 7 | 7 | 8 | 0% | 98.01% | 98.30% |
| RTT spike (300 ms for 3 s, then 80) | 7 | 7 | 8 | 16.6% | 93.78% | 99.22% |

The second PING right after the first PONG gives the director an RTT before the first shots, so honest claims are no longer clamped in the first second (the first draft clamped there). The remaining misses at the full claim are frames where the client drew an extrapolated target (a late snapshot). During an RTT spike the director's RTT median lags the spike, so the cap cuts honest claims for a while and the shooter pays for the spike. Honest views never trip the continuity rule on these profiles (0 clamps; 3 per seat in the spike, when the lead drops).

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
    {"seat":0,"x":0,"y":0,"z":0,"yaw":0,"pitch":0,"vx":0,"vz":0,"hp":100000,"shield":50000,"alive":true,"slot":0,"slideT":0,"grappleCd":0,"grapple":null}
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
    "rttMs": 104,
    "interpMs": 100,
    "rewindCap": 9,
    "private": {"vy":0,"shieldDelay":0,"onGround":true,"invuln":0,"dashT":0,"dashCd":0,"dashX":0,"dashZ":0,"mag":[36,6,4],"shells":24,"sniper":12,"fireCd":0,"reloadT":0,"swapT":0}
  },
  "hits": [{"tick": 11, "shooter": 1, "dmg": 9000, "hits": 1, "rewind": 6}],
  "ticketsMinted": 0
}
```

- `ackFrame` / `ackSeq`: the newest tick that used this seat's own input, and that input's sequence. Ticks after it used held or neutral substitutes.
- `you.rttMs` / `you.interpMs` / `you.rewindCap`: the director's own round trip for this seat, the seat's announced interpolation delay as clamped, and the rewind cap they give (sim 2).
- `hits` (sim 2): the server-confirmed hits stepped since the previous snapshot, `[{ tick, shooter, dmg, hits, rewind }]` (`dmg` in milli-HP after invuln; `hits` pellets that connected; `rewind` the applied ticks). Same list to both seats; `[]` on HELLO/RESYNC snapshots. Clients draw hitmarkers and damage numbers from these only.
- `buffer`: frames queued at or after the cursor. `late`: late frames so far. `held` / `neutral`: substitute ticks so far.
- `players[].slideT`: seconds remaining in the slide, or 0; used to show the slide pose for the other seat. Clients also accept older snapshots that omit it.
- `players[].grappleCd`: seconds remaining in the grapple cooldown. The optional `players[].grappleMiss` field is true when the last cast missed. A new cooldown with this flag starts the miss animation.
- `private`: the rest of this seat's exact sim state; with `players[seat]` it is the whole player (S3 reconciles from it). The combat RNG is never sent.
- `hash` (`publicStateHash`: FNV-1a over the sim state **without the players' RNG**, floats quantized to micro-units, the same `verifyStateHash` the campaign bundle uses) is present once per second (`tick % 30 === 0`) and on the final snapshot. It is not a receipt the client can submit for Tickets.

Clients render the other seat at estimated server time minus D, interpolating position and yaw between the two snapshots around it, extrapolating by velocity for at most 100 ms when starved, then holding. Since S3, D is adaptive: `D = clamp(max(snapshot interval + 2 × jitter p95, 33.3 ms + step lateness p95), 50, 150 ms)` over the last 90 snapshots (3 s). Jitter is how late each snapshot's `tick` arrives on the estimated server clock (network jitter plus the server loop running behind its ticks; `clockTick` is stamped at send time, so it cannot show the latter), the interval is the median arrival gap, and step lateness is the lateness of the first tick each snapshot makes drawable (a late loop callback steps two ticks and sends one snapshot). D starts at 100 ms (announced in HELLO) and slews toward its target at most 0.2 ms per ms upward and 0.05 ms per ms downward, so the remote clock runs between 0.8× and 1.05× and never jumps. The camera uses the client's own yaw and pitch, not the snapshot copy. Health and the result come from the newest snapshot and from `RESULT`; once a result exists the client's phase stays `done`. Interpolation is not restart state.

## Client prediction and reconciliation (S3)

Prediction steps the same `movePlayer` as the server, so slide, grapple and stamina stay authoritative. Protocol stays 2. After that movement the pins are fingerprint `dc00f234`, mirrored golden `532a562e` and director golden `55419e4e` (asserted in `tests/net/predict.test.js` and `tests/net/baseline.test.js`).

- **Prediction** (`src/net/predict.js`). Each input tick encodes the wish, decodes it back (so the client predicts with exactly what the director will use), keeps it in a ring of 64 by frame, and steps the local player with the sim's own `normalizeWish` + `movePlayer` + `weaponTick` and the sim's per-tick quantization. Body contact (`separate`), damage and shield regen are left to the server. The local player is drawn from the prediction, blended between the last two predicted ticks by the input clock's phase. A repeated frame (a hold) replays from the base.
- **Reconciliation.** Each snapshot (tick T, the state after ticks 0..T-1) rebuilds this seat from `players[seat]` + `you.private`, drops the inputs below T, and replays the rest. Frames the client never sent are filled the way the director fills them: the wish at `you.ackFrame` held for 3 ticks (move, aim, held buttons), then neutral (aim only), counting from the ack. The difference between the old and the new prediction for the same frame is one correction sample and is added to a visual offset that decays as `exp(-t/100 ms)`; a correction (or offset) above 2 m snaps.
- **Cosmetic fire.** When the prediction's `weaponTick` fires (on the first prediction of that frame, never on a replay), the client logs a shot: muzzle flash, tracer, camera recoil and sound play at once, and the ammo counter is the prediction's. Hitmarkers and damage numbers come only from the server's `hits`.
- **Aim convergence** (`src/render/pvp/aim.js`). The chase camera sits behind the player, so the crosshair ray starts at the camera. The client finds what that ray meets past the player (the drawn opponent's capsule, the floor, a pillar, the arena wall up to its grapple height, or 120 m) and sends the yaw/pitch from the eye to that point. The grapple itself still ignores the floor and the other player. The yaw stays the look yaw; only the pitch converges.
- **Net graph** (`src/render/pvp/netgraph.js`): dev builds or `?netgraph=1` (`?netgraph=0` hides it in dev). RTT (client and director), jitter p95, server buffer, late %, correction p50/p99 (last 300), D and its target, the input's rewind claim and the cap, starved % (last 300 frames), lead, stamped lead and clock rate.

**Measured on the realistic S0 harness** (client clock offset and drift, a jittered Nakama loop with pauses, 130 B envelopes; 15 s, 2 peers, seed 1, values per peer; firing runs pool seeds 1–4). Correction samples are one per snapshot the prediction had reached; "no contact" leaves out the snapshots where the server had the two bodies touching. Starvation counts render frames once the render clock reaches tick 0 (the exact spawn view before it is counted separately; "with start" is the S2b definition). "Client starved" is frames the client drew extrapolated or held.

| Profile | Correction p99 | p99 no contact | Contact samples | Starved (with start) | Client starved (S2b) | D | Director applied | Late |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| RTT 0 | 19.3 cm | 0 cm | 43% | 0% (0.67%) | 0.34–0.56% (0.78%) | 77 ms | 100% | 0% |
| RTT 100±30 | 23.8 cm | **0 cm** | 34% | **0%** (0.89%) | **0.11%** (1.1–1.4%) | 107–111 ms | 100% (S2b 99.78%) | 0% |
| RTT 150 | 33.4 cm | **0 cm** | 35% | **0%** (1.1–1.2%) | **0.11%** (1.2–1.3%) | 102 ms | 100% | 0% |
| Stall bursts | 35.8–38.6 cm | 33.8–35.1 cm | 21% | 3.9–8.7% | 5.7–10.0% (7.0–12.7%) | 134–150 ms | 92.4–92.7% (S2b 92.4–93.6%) | 6.7–6.9% |
| Heavy tail | 31.0–36.3 cm | 0–16.8 cm | 34% | 0% | 0.67–0.90% (1.3–2.0%) | 94–103 ms | 97.6–99.8% | 0.2–2.4% |
| RTT spike | 34.0–39.0 cm | 0–21.7 cm | 30% | 0% | 4.7–5.4% (8.7–8.8%) | 112–114 ms | 94.9–97.3% (S2b 97.3–97.8%) | 1.3–3.6% (S2b 1.8–2.2%) |

No profile has a reject (S2b: none either; the spike's 3 `viewClamped` per seat in S2b are 0 now) or a view clamp. Rewind agreement, pooled over four firing seeds: 99.3% at RTT 0, 99.6% at RTT 100±30, 100% at RTT 150 (no claim clamped), 96.6% under stall bursts; during the RTT spike the director's lagging RTT median clamps honest claims (the seed that reaches it: 33.7% clamped, 78.1%), exact at the full claim. Firing bots aim from their predicted position, so a firing match ends in 110–230 ticks instead of running the 15 s window.

**Gates.** On: correction p99 < 5 cm without body contact and starvation < 1% (both counts) at RTT 100±30 and 150. **Not met: correction p99 < 5 cm with body contact** (23.8 cm at RTT 100±30). The harness bots walk into each other, and the director separates the bodies with the opponent's input, which the client cannot know ahead. Predicting contact against the newest server copy of the opponent was tried and measured worse (p99 13–54 cm). Closing it needs an owner decision: accept the contact exclusion, or drop or soften player-player separation in PvP (a sim change and a golden bump, outside S3). The strict test stays `it.skip` in `tests/net/baseline.test.js`.

## Used-input log and replay v2

The director records the exact wish it applied for each seat on each tick, held and neutral substitutes included: 10 bytes per seat-tick as hex (`src/sim/pvp/used.js`; sim 2 added the clamped `rewind` and `viewFrac` bytes to S2a's 8), in chunks of 30 ticks. It steps the sim with the entry **decoded back from the log**, not the in-memory record, so a replay of the log is the same match by construction. A full 90 s match is about 108 KB. `director.usedAt(tick)` decodes one tick. `director.replayRecord()` returns:

```json
{"v":2,"spawnSeed":4242,"combatSeed":"5eed00c0ffee5eed00c0ffee5eed0042","combatCommit":"6d5a619f…1fc6","matchId":"golden","accounts":["ada","bea"],"bundleSha256":null,"sourceCommit":null,"protocol":2,"sim":2,"content":"dc00f234","used":["<hex>", "..."],"expect":{"tick":892,"stateHash":"55419e4e","stateSha256":"<64 hex>","outcome":null,"winner":null,"reason":null},"result":{"outcome":"forfeit","winner":0,"reason":"stall","tick":892,"stateHash":"55419e4e","stateSha256":"<64 hex>","spawnSeed":4242,"combatSeed":"…","combatCommit":"…","ticketsMinted":0,"stakes":false},"ticketsMinted":0}
```

- `accounts`: the account id in seat 0 and seat 1. A host that passes `accounts: [a, b]` to the director pins that order: those two accounts get those seats whoever says HELLO first, and anyone else gets `not_invited` (in `joinAttempt` and HELLO).
- `bundleSha256` / `sourceCommit`: the build that ran the match, when the host passes `build: { bundleSha256, sourceCommit }` (null otherwise). `replayJSON` refuses (`reason: "build"`) a record whose `sourceCommit` differs from its own pinned commit; it cannot check its own `bundleSha256`, so it echoes it in the verdict for the host to compare with its pin.
- `stateSha256`: SHA-256 of the same canonical, quantized state `stateHash` (32-bit FNV-1a) covers. Settle on this one; the FNV hash is for quick cross-runtime checks.

`replayJSON(record)` re-runs the log from `spawnSeed` and the revealed `combatSeed`, applying each logged rewind, and returns the receipt (with `stateSha256`) plus `combatCommit`, `verified`, `mismatch` and `verdict`:

- `mismatch` lists `tick`, `stateHash`, `stateSha256`, `outcome`, `winner`, `reason` (against `expect`), `extraTicks`, `expect`, `combatCommit` (sha256(combatSeed) is not the commit), and `result.<field>` for each field of the director's `result` that the replay contradicts: `result.tick`, `result.stateHash`, `result.stateSha256`, `result.spawnSeed`, `result.combatSeed`, `result.combatCommit`, and for a sim outcome `result.outcome` / `result.winner` / `result.reason`. `verified` is true only when `mismatch` is empty. A record without a `result` (a match still running) can verify, but its policy is `refuse`.
- `verdict` is `{ replay, result, outcome, winner, reason, provable, accounts, bundleSha256, evidence, policy }`.

Refusals: a malformed log or seed is `{ ok: false, reason: "malformed" }`; a record for another `sim` is `version`; a non-finite number anywhere in the record (checked by value: `NaN`, `Infinity`, or a literal like `1e999` that parses to Infinity) is `nan`; text over 512 KB, a used log longer than a match (2700 ticks), or a v1 `inputs` list longer than a match is `too_long` (`REPLAY_LIMITS`). The text `"Infinity"` inside a string (a match id, a name) is fine. Replay v1 (`{ seed, inputs }` or `{ spawnSeed, combatSeed, inputs }`) still runs the sim directly.

### Settling a wager

What the log can prove depends on who ended the match:

| Result | Decided by | Provable from the log | `verdict.policy` when verified |
|---|---|---|---|
| `ko` (one death), `time` (higher hp + shield at 90 s), `draw` by `double_ko` or `time` | the sim | **yes**: the replay reaches the same tick, hashes and outcome, or `verified` is false | `settle`: pay the winner; a draw returns each stake |
| `forfeit` / `stall` | the director (10 s with no accepted input) | **no**: input timing is not in the log. The log can only be consistent with it: the loser's last applied input must be at least ~288 ticks before the end (`evidence.trailingNonInput`, `evidence.stallTicks`) | `settle_director` when the evidence is consistent, else `review` |
| `draw` / `both_stall` | the director | no (evidence as above, for both seats) | `refund` |
| `cancel` / `ready_timeout`, `cancel` / `no_combat_seed` | the director, before go-live | nothing to replay | `refund` |
| any, with `verified: false` | | | `refuse`: do not settle; keep the record for review |

Recommended policy: settle automatically only on `settle`. Treat `settle_director` as the host's own word backed by its stored record and Nakama presence logs (the replay shows nothing contradicts it). Send `review` to a human. Refund on `refund`. Never settle on `refuse`.

## Keeping the director, and freeze/thaw

**Keep the live director object for the whole match, in the match's own JS VM.** Nakama's JS runtime runs each authoritative match in its own goja VM and hands the same state object back to every callback, so the state can hold the director instance itself. Do **not** freeze and thaw on every callback: measured in goja during review, `exportState()` + `restoreDirector()` per callback costs 7.4 ms mean and 14 ms p95 late in a match (the used-input log grows to ~86 KB), which is over the per-tick budget of a 30 Hz loop that also has to step the sim.

All director state is still plain JSON. `director.exportState()` returns it and `restoreDirector(state)` (or `createDirector().importState(state)`) brings it back, with identical messages, log and hash afterwards (tested in Node, goja and Chromium, frozen and thawed after every call). Use it only:

- at phase changes (lobby → live, live → done), to keep a recovery copy; and
- for crash recovery: if the match VM is lost, thaw the last copy and continue. The sim is deterministic from the used-input log, so a copy taken at go-live plus the log replays to the same state.

## What H3-S must do

1. Load `shooter-pvp-sim.js` in goja. Per match you **must** use `createHostedDirector({ spawnSeed, combatSeed, matchId })`: `spawnSeed` server-chosen 32-bit, `combatSeed` a fresh secret of 32..128 lowercase hex chars from a CSPRNG, `matchId` the Nakama match id. Keep the director object in match state for the whole match. Export it only at phase changes and for crash recovery (see above). The exported state holds the combat seed: never send it to clients.
   Also pass `accounts: [seat0, seat1]` (the matched accounts), `build: { bundleSha256, sourceCommit }` from the vendored pin, and for wagered matches `rttCeilingMs` (lobby-measured RTT baseline + margin).
2. `joinAttempt`: same account may rejoin; another account is `not_invited` when `accounts` is set (`match_full` otherwise); a finished match is `ended`.
3. On match data, `director.handle(presence, opCode, bytes, serverNowMs)` with the presence's `userId`, `sessionId` and `username`. Send its `messages` (each to `to`, or to everyone when `to` is null).
4. On a fixed 30 Hz server tick, `director.advance(serverNowMs)` and send its `messages` the same way. `RESULT` is among them exactly once.
5. On leave, `director.disconnect(userId, sessionId)`. Do not delete the seat during the 10 s grace.
6. Ignore client snapshots, scores, and winners. Do not call `tickets.earn`, `session.event`, or any settle RPC from this match.
7. A version mismatch cancels before the sim starts and moves no Tickets.
8. Keep the campaign verifier pinned separately. A free-arena hash is not a boss clear.
9. Before settling anything, run `replayJSON(director.replayRecord())`, require `verified: true`, and follow `verdict.policy` (see "Settling a wager").

The in-repo stub is `registerFreeMatch` / `createMockArena` in `src/net/client.js`. It speaks this contract over `createMockRealtimeServer` until H3-S replaces it. Its `freeze: true` option thaws the director on every callback; that is a test of state completeness, not how a host should run it. Offline practice uses the same director locally and is not a match.

## Left for later tickets

- **S2b** (sim 2): done, including the ≥ 98% rewind-agreement gate (realistic harness: 99.75% at RTT 100±30, 99.74% at RTT 150; with S3, pooled over four seeds, 99.6% and 100%).
- **S2c**: binary INPUT batches and per-recipient binary snapshots (JSON is ~25–28 KB/s down per client on the wire at 30 Hz with 130 B Nakama envelopes, measured on the realistic harness; the target is ~6.6 KB/s). Check goja's `broadcastMessage` with binary first.
- **S3**: done (client prediction and reconciliation, adaptive delay, clock trim with one owner of the lead, cosmetic fire, aim convergence, net graph), except the strict correction gate with body contact (above).
- **Remote muzzle flashes and tracers** need shot counters or firing flags in the snapshot (plan §R.8); the snapshot does not carry them yet. A protocol change, so it belongs with S2c.
- **S4**: lobby, free vs wagered queue, room codes, rematch, result screen, leaderboard view.
