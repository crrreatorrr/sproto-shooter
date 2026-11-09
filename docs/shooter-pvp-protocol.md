# Shooter free 1v1 protocol (S5, protocol 2 since SHOOTER-S2a, sim 2 since SHOOTER-S2b)

This is the contract H3-S implements for a Nakama authoritative match. The arena is free. The bundle does not stake, settle, refund, or mint Tickets. A later escrow may move existing Tickets between the two accounts. It must not create any.

Campaign verification is a different artifact. It stays protocol **1**, content fingerprint **3c657fb5**, global `SprotoShooterSim`, entry `verifyRunJSON`. Do not point the campaign verifier at this bundle.

Protocol 2 (director v2) replaced protocol 1 in SHOOTER-S2a. It is a deliberate pin bump: a protocol 1 client gets `version` on HELLO and never matchmakes with a protocol 2 client. The S2a sim did not change (golden `ce272de1`).

Sim 2 (SHOOTER-S2b) is a deliberate golden bump: lag compensation (a 12-tick history ring and a `viewTick` rewind of at most 10 ticks), a split spawn/combat seed with a sha256 commit, and no crits. Protocol 2 was not frozen yet (the hub hosts protocol 1 until the S-train merges), so S2b changes it in place: INPUT grows to 18 bytes, WELCOME/PHASE carry `spawnSeed` and `combatCommit` instead of `seed`, RESULT reveals `combatSeed`, and snapshots carry `hits`. `sim` 2 and the new content fingerprint keep an S2a build (`sim` 1, `0e584d36`) from pairing or saying HELLO.

## Artifact

```bash
npm run build:server-sim
```

| File | Role |
|---|---|
| `build/shooter-sim.js` | Unchanged campaign verifier. Global `SprotoShooterSim`. |
| `build/shooter-sim.pin.json` | Campaign pin. `protocol` 1, `contentFingerprint` `3c657fb5`. |
| `build/shooter-pvp-sim.js` | Free arena. Global `SprotoShooterPvp`. |
| `build/shooter-pvp-sim.pin.json` | Arena pin. `protocol` 2, `sim` 2, `contentFingerprint` `ec36c8fa`, `directorState` 3, `replayVersion` 2, `rewind` (the REWIND table), `crits` false, `combatSeed` `"sha256-commit-reveal"`. |

`sourceCommit` is `git rev-parse HEAD` baked in before the sha256. Rebuild on the merged shooter SHA and vendor `shooter-pvp-sim.js` plus its pin. Refuse the match if `bundleSha256`, `protocol`, `sim`, or `contentFingerprint` disagrees with the running copy.

Measured identity of this phase:

| Field | Value |
|---|---|
| `protocol` | 2 (was 1) |
| `sim` | 2 (S2a was 1) |
| `contentFingerprint` | `ec36c8fa` (S2a `0e584d36`, protocol 1 `f5949631`) |
| `loadoutHash` | `4cdfab55` (S2a `9eb7cd63`; crit chance is now 0) |
| Global | `SprotoShooterPvp` |
| JSON entry | `replayJSON` (v1 `{seed, inputs}` and v2 used-input logs) |
| Director | `createDirector`, `restoreDirector` |
| Helpers | `combatCommitOf`, `rewindCapFor`, `sha256Hex`, `REWIND` |
| `mintsTickets` | false |
| `stakes` | false |

`replayJSON(text)` replays `{ seed, inputs }` (v1) or a director replay record (v2, below) and returns a receipt. `ticketsMinted` is always 0. There is no settle function and no `earnTickets` string in the bundle.

Two goldens, each checked in Node, Chromium and goja:

- The mirrored sim golden (`scriptedMatch(7, 180)` in `src/sim/pvp/sim.js`) ends `outcome: "draw"`, `reason: "double_ko"`, `winner: null`, `tick: 65`, `stateHash: "6545ca0a"` (sim 1: tick 61, `ce272de1`).
- The director golden (`tests/fixtures/director-golden.js`: a scripted two-client session with a lead-in, jittered and stalled uplinks, a resent frame, a frame past the window, a disconnect and a rejoin on a new session id, pings and PING echoes, viewTick claims (some oversized, so clamped), then a stall) ends `outcome: "forfeit"`, `winner: 0`, `reason: "stall"`, `tick: 892`, `stateHash: "078282e5"` (sim 1: `e421cba8`), 57 late frames, 6 server-confirmed hits (54000 milli-HP), combat commit `6d5a619f…1fc6` for seed `5eed00c0ffee5eed00c0ffee5eed0042`, and its used-input log replays verified. It gives the same result when the director is frozen and thawed after every call.

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
query: +properties.game:sproto-shooter +properties.mode:free +properties.protocol:2 +properties.content:ec36c8fa
minCount: 2
maxCount: 2
stringProperties:
  game: sproto-shooter
  mode: free
  protocol: "2"
  sim: "2"
  content: ec36c8fa
```

One account, one seat. A HELLO from the same account on a new session replaces that seat's session. The previous session is `wrong_sender`. A third account is `match_full`. Guests are not given a second seat. Do not reuse a Fighter match id or its wallet functions.

Label the match so listings can see it is free:

```json
{"kind":"sproto_shooter_free","game":"sproto-shooter","mode":"free","protocol":2,"content":"ec36c8fa","stake":0}
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
- `combatSeed` (secret) seeds both seats' RNG (each seat its own RNG, started from the same seed, so identical inputs take identical damage). The host passes 32..128 lowercase hex chars (at least 128 bits) to `createDirector({ spawnSeed, combatSeed, matchId })`; anything else throws. The RNG start is FNV-1a of `sproto-shooter:combat:<seed>`. The raw seed is not kept in the sim state.
- At start only `combatCommit = sha256(combatSeed)` (sha256 of the hex text, 64 hex chars) is sent, in WELCOME and PHASE. RESULT reveals `combatSeed`; the reference client sets `result.combatVerified` from `sha256(combatSeed) === combatCommit`. `sha256Hex` is a small pure-JS SHA-256 in the bundle (`src/core/sha256.js`), so goja needs nothing.
- Without a `combatSeed` (practice, tests, the local mock) the director derives a predictable one and `director.combatSeedDerived` is true. **H3 must pass a fresh secret seed and may assert `combatSeedDerived === false`.**
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
{"accountId":"nakama-user-id","protocol":2,"sim":2,"content":"ec36c8fa","interpMs":100}
```

`interpMs` (optional, sim 2) is the client's remote interpolation delay in ms; the director clamps it to 50..150 and uses it in the rewind cap (100 until announced). `accountId` must equal the socket's user id. `protocol`, `sim`, and `content` must all match or the reason is `version`. The presence session id is the seat session. The body does not get to name a session. The seat's display name is the presence `username` (cut to 32 chars); the hub sanitizes names before they reach the director.

HELLO is the **only** way to rebind a seat to a new session (a reconnect on a new session id). The answer is a `WELCOME` to every connected seat and, once live, a `SNAPSHOT` to the sender:

```json
{
  "accountId": "nakama-user-id",
  "seat": 0,
  "matchId": "nakama-match-id",
  "protocol": 2,
  "sim": 2,
  "content": "ec36c8fa",
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

### PING / PONG

`PING` is `{"t": clientTimeMs}`, at most 10 per second per seat (`rate`). Since sim 2 it may also carry `echo` (the `serverMs` of the newest PONG the client got), `hold` (ms the client sat on that PONG) and `interpMs` (the client's current interpolation delay, as in HELLO; S3 will make it adaptive, so the client re-announces it in every PING). `PONG` echoes `t` with the server clock:

```json
{"t": 1234.5, "serverMs": 98765, "tick": 41, "clockTick": 41.012, "phase": "live"}
```

The client keeps the median of its last 8 round trips. PINGs do not refresh the stall timer.

The director keeps its **own** round trip per seat for the rewind cap: `now - echo - hold`, counted only when `echo` is one of the last 4 `serverMs` values it sent that seat and `0 <= hold <= now - echo`, median of the last 8 samples (`you.rttMs` in snapshots, `seatStats().rttMs`).

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

Button bits, low to high: `fire`, `zoom`, `sprint`, `jump`, `dash`, `reload`, `slide`. Bit 7 must be 0. `slide` is accepted and does not move the arena body in sim 1. `jump`, `dash`, `reload` and a slot pick are edges. `fire`, `zoom` and `sprint` are held.

## Server jitter buffer (director v2)

| Rule | Value |
|---|---|
| Window | frames `cursor .. cursor + 8` are queued for their tick. A resent frame (higher seq) replaces the queued one |
| Late frame (`frame < cursor`) | **accepted and discarded**: it consumes its seq, refreshes the stall timer and the held aim, counts in the seat's `late`. No reject, so a TCP burst never becomes a reject storm |
| Sequence | must be greater than `lastSeq`; gaps are fine |
| Frame rate | a token bucket of 45 frames, refilled at 45/s, counts every frame (late too). A burst after a stall passes because the bucket refilled while the link was quiet |
| Per tick | at most 6 queued (not late) frames per server clock tick |
| Missing tick | repeat the last applied wish's move, aim and held buttons (`fire`, `zoom`, `sprint`) for up to 3 ticks, then neutral (no move, no buttons, aim held). Edge buttons and slot picks never repeat |
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
| Token bucket empty, or 6 queued frames this tick already | `rate` |
| Id not 1..80 chars of `[A-Za-z0-9_.:@|-]` | `malformed` |

`REJECT` goes to the sender only and carries `accountId`, `reason`, `lastSeq`, `tick` (the cursor), and for INPUT the rejected `seq` and `frame`, plus `ticketsMinted: 0`. A rejected input does not consume the sequence.

The reference client (`src/net/client.js`) runs a fixed 30 Hz input clock and sends exactly one input per input tick, stamped `frame` = estimated server tick + lead, never below 0 (so during the lead-in it starts sending `lead` ticks before tick 0). The estimate uses the least-delayed recent `clockTick`. The lead starts at the PING round trip in ticks plus one, rises by one (at most once per round trip, at most to that lead plus 2) when a snapshot's `you.late` grows by one or two, ignores larger jumps (a TCP stall: hold-last covers it), drops back into the window on a `frame` reject past `cursor + 8`, and is capped at 12. It never rewinds its sequence. After a reconnect on a new session id it sends HELLO, not RESYNC.

Each input also carries `viewTick`/`viewFrac` from the render time of the newest drawn frame (`estimated server tick - interpDelayMs/STEP_MS` at the last `sample()`), i.e. what the shooter saw. Spread is cosmetic on the client: damage, hitmarkers and kills come from the server's `hits` events and the snapshots.

## Lag compensation (sim 2)

| Rule | Value (`REWIND` in `src/sim/pvp/rules.js`) |
|---|---|
| History | the sim state keeps `hist`: per player a ring of 12 (`maxTicks + 2`) `{t, x, y, z, alive, invuln}` entries, written for each tick (and for tick F+1 right after movement, before the shots). It is part of the state hash, so replays reproduce it |
| Claim | `back = frame - viewTick` from the input (0..255) |
| Cap (director) | per seat: `min(10, ceil((rttMs + interpMs + 2 × 33.3) / 33.3))` ticks. `rttMs` is the director's own PING-echo median (0 until the first echo); `interpMs` is the client's announced interpolation delay, clamped to 50..150 ms (100 until announced). With no sample yet the cap is 5 ticks; at RTT 100 with 100 ms it is 8; at RTT 150 it is 10 |
| Clamp | `rewind = clamp(back, 0, cap)`. A claim past the cap is cut to the cap and its `viewFrac` dropped, so a lag-switch claim never reaches further than the seat's measured link. A claim in the future is rewind 0 |
| Sim | clamps again to 10 (ABS_MAX, 333 ms) and to tick 0, so a forged log cannot reach further |
| Target | interpolated between history ticks `F - rewind` and `F - rewind + 1` at `viewFrac/256` (rewind 0, frac 0 = the start of tick F). The shooter's eye stays at its current position |
| invuln | from the rewound tick (`F - rewind`) |
| alive | from the current tick: no hits on a corpse, a dead shooter cannot fire |
| Trades | both seats shoot on the same tick; two deaths are the existing `double_ko` |
| Held ticks | a repeated (hold-last) tick keeps the input's rewind and frac; neutral ticks claim none |

All three guns are hitscan and splash is zero, so there is no projectile rewind. The director counts cut claims per seat (`seatStats().clamped`). Snapshots tell each seat `you.rttMs`, `you.interpMs` and `you.rewindCap`.

Why `RTT + interp + 2 ticks`: an honest claim is the time from what the shooter saw to the tick its shot runs on. That is the uplink lead (the client stamps frames about one RTT ahead, because its clock estimate trails the server by the downlink) plus the downlink, plus the interpolation delay, plus the jitter buffer: about `RTT + interp` and a tick or two. The first S2b draft used `min(6, RTT/2 + interp + 1 tick)`, which cut 97% of honest claims at RTT 100 to 6 ticks and scored 69.5% agreement.

**Fairness trade-off.** A larger rewind favours the shooter: the target can be hit where the shooter saw it, up to `cap` ticks ago, even if on the target's own screen it had already stepped out of the line of fire ("shot behind the corner", though this arena has no walls, so it shows up as a hit that lands just after a sidestep). That is the cost of making hits match what the shooter saw. It is bounded three ways:
- ABS_MAX is 10 ticks (333 ms). No claim, measured RTT or announced delay gets past it, in the director or in the sim.
- The cap follows the seat's own link as the director measures it, plus at most 150 ms of interpolation, so a low-latency client cannot claim a high-latency window by itself.
- Wagered play requires lobby RTT ≤ 150 ms (plan §R.8), which keeps the cap at 10 ticks or less for wagers; in practice it sits at 8–9 at RTT 100–125.
A client can still inflate its own RTT estimate by delaying its PING echoes; that buys at most ABS_MAX, which is the bound we accept.

**Measured on the S0 harness** (`tests/net/baseline.test.js`, 15 s, firing bots; a geometric check of the ray from the shooter's server eye toward a seeded point near the target the client drew, against the drawn capsule and the server's rewound capsule). The ≥ 98% gate is on for RTT 100±30 and RTT 150:

| Profile | Claim p50 | Applied p50 | Cap | Agreement | At the full claim |
|---|---:|---:|---:|---:|---:|
| RTT 0 | 5 | 5 | 6 | 100% | 100% |
| RTT 100±30 | 8 | 8 | 9 | **99.49%** | 100% |
| RTT 150 | 9 | 9 | 10 | **99.75%** | 100% |
| Stall bursts | 7 | 7 | 8 | 98.56% | 98.56% |

The remaining misses are the first second of each match, before the first PING echo (cap 5), and, under stall bursts, frames the client stamped while extrapolating.

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
- `private`: the rest of this seat's exact sim state; with `players[seat]` it is the whole player (S3 reconciles from it). The combat RNG is never sent.
- `hash` (FNV-1a over the sim state with floats quantized to micro-units, the same `verifyStateHash` the campaign bundle uses) is present once per second (`tick % 30 === 0`) and on the final snapshot. It is not a receipt the client can submit for Tickets.

Clients render the other seat at estimated server time minus 100 ms, interpolating position and yaw between the two snapshots around it, extrapolating by velocity for at most 100 ms when starved, then holding. The camera uses the client's own yaw and pitch, not the snapshot copy. Health and the result come from the newest snapshot and from `RESULT`; once a result exists the client's phase stays `done`. Interpolation is not restart state.

## Used-input log and replay v2

The director records the exact wish it applied for each seat on each tick, held and neutral substitutes included: 10 bytes per seat-tick as hex (`src/sim/pvp/used.js`; sim 2 added the clamped `rewind` and `viewFrac` bytes to S2a's 8), in chunks of 30 ticks. A full 90 s match is about 108 KB. `director.usedAt(tick)` decodes one tick. `director.replayRecord()` returns:

```json
{"v":2,"spawnSeed":4242,"combatSeed":"5eed00c0ffee5eed00c0ffee5eed0042","combatCommit":"6d5a619f…1fc6","matchId":"golden","protocol":2,"sim":2,"content":"ec36c8fa","used":["<hex>", "..."],"expect":{"tick":892,"stateHash":"078282e5","outcome":null,"winner":null,"reason":null},"result":{"outcome":"forfeit","winner":0,"reason":"stall","tick":892,"stateHash":"078282e5","spawnSeed":4242,"combatSeed":"…","combatCommit":"…","ticketsMinted":0,"stakes":false},"ticketsMinted":0}
```

`replayJSON(record)` re-runs the log from `spawnSeed` and the revealed `combatSeed`, applying each logged rewind, and returns the receipt plus `combatCommit`, `verified` and `mismatch` (any of `tick`, `stateHash`, `outcome`, `winner`, `reason`, `extraTicks`, `expect`, `combatCommit` when sha256(combatSeed) is not the commit). A malformed log or seed is `{ ok: false, reason: "malformed" }`; a record for another `sim` is `{ ok: false, reason: "version" }`. Replay v1 (`{ seed, inputs }` or `{ spawnSeed, combatSeed, inputs }`) still runs the sim directly. `expect` holds the **sim's** outcome fields; a director outcome (forfeit, stall, cancel) is in `result` and leaves the sim's at `null`. A wager settles only on `verified: true`.

## Freeze and thaw

All director state is plain JSON. `director.exportState()` returns it; `restoreDirector(state)` (or `createDirector().importState(state)`) brings it back. Nakama copies match state between callbacks, so H3 keeps only the exported object in match state and thaws a director at the start of each callback. Freezing and thawing after every call gives identical messages, log and hash (tested in Node, goja and Chromium). The state carries the whole used-input log; H3 may move completed log chunks out to `nk.localcache` if the per-callback copy shows up in loop timing.

## What H3-S must do

1. Load `shooter-pvp-sim.js` in goja. Per match, `createDirector({ spawnSeed, combatSeed, matchId })`: `spawnSeed` server-chosen 32-bit, `combatSeed` a fresh secret of 32..128 lowercase hex chars from a CSPRNG (assert `combatSeedDerived === false`). Then keep `director.exportState()` in match state and `restoreDirector(state)` per callback. The exported state holds the combat seed: never send it to clients.
2. `joinAttempt`: same account may rejoin; a third account is `match_full`; a finished match is `ended`.
3. On match data, `director.handle(presence, opCode, bytes, serverNowMs)` with the presence's `userId`, `sessionId` and `username`. Send its `messages` (each to `to`, or to everyone when `to` is null).
4. On a fixed 30 Hz server tick, `director.advance(serverNowMs)` and send its `messages` the same way. `RESULT` is among them exactly once.
5. On leave, `director.disconnect(userId, sessionId)`. Do not delete the seat during the 10 s grace.
6. Ignore client snapshots, scores, and winners. Do not call `tickets.earn`, `session.event`, or any settle RPC from this match.
7. A version mismatch cancels before the sim starts and moves no Tickets.
8. Keep the campaign verifier pinned separately. A free-arena hash is not a boss clear.
9. Before settling anything, run `replayJSON(director.replayRecord())` and require `verified: true`.

The in-repo stub is `registerFreeMatch` / `createMockArena` in `src/net/client.js`. It speaks this contract over `createMockRealtimeServer` until H3-S replaces it, and with `freeze: true` it thaws the director per callback exactly as above. Offline practice uses the same director locally and is not a match.

## Left for later tickets

- **S2b** (sim 2): done, including the ≥ 98% rewind-agreement gate (99.49% at RTT 100±30, 99.75% at RTT 150).
- **S2c**: binary INPUT batches and per-recipient binary snapshots (JSON is ~29 KB/s down per client on the wire at 30 Hz, measured on the harness; the target is ~6.6 KB/s). Check goja's `broadcastMessage` with binary first.
- **S3**: prediction and reconciliation from `you.ackFrame` / `you.private`, adaptive interpolation delay (client starvation at RTT 100±30 is ~1.0% with the fixed 100 ms delay, right on the gate), clock-rate adjustment from `you.buffer`, predicted muzzle/tracers with server hitmarkers from `hits`, aim from the camera ray. When the interpolation delay becomes adaptive, keep announcing it in every PING (`interpMs`); the director already clamps it to 50..150 ms for the rewind cap.
