# Dormant campaign API adapter and recovery (PR13 / PR15 follow-up)

The current generic `NakamaClient.rpc(id, body, {token})` and SDK
`getSession`/`refreshSession` are sufficient for a narrow campaign adapter.
`transport.js` uses the already vendored SDK; there is no SDK API expansion,
version/pin update or re-vendor companion. Existing wager allowlists, profile,
cloud-save retries and economic SDK methods remain separate. This document and
the narrow runtime schemas describe the supported consumer contract.

No Game, Hub link or UI imports/creates this capability. Factories reject absent
explicit `enabled:true`; scheduling starts only through explicit `start()` or
background `pump()`. There is no deployment or public activation. PR109 supplied the
staged append/status core. The follow-up below binds the reviewed0056 public
issuance/finish contract, pending strict client/server checks and final review.
It is not PR16 Game/UI activation and never fabricates a run or seal. Payment remains
server-owned; there is no public client settlement/credit operation.

## Existing generic SDK composition

A trusted integration injects account ID, original game-session ID, issued UUID
run ID, trusted Nakama origin and a current-session provider. The provider may
use the existing SDK session accessors; creating the adapter does not log in,
refresh/revive an expired session or mint issuance. Token claims are read only
as local binding hints: they do not authenticate this browser or confer reward
eligibility. Before and after requests, identity must still match the original
account and, for writes, game/session. Access-token replacement is supported for
the same underlying session. Explicit logout/account switch calls `stop()` to
invalidate the controller generation and abort its current request; late
responses cannot release another account's history. Owner status may be read
with same-account authentication after the original session expires, without
rebind or new write permission.

A dedicated generic SDK client receives a campaign-only `fetchImpl` wrapper. It
restricts URL origin/RPC path, uses `redirect:'error'`, holds one request slot,
sets an AbortController deadline and bounds response body bytes/read count. The
timer remains active through response-body consumption; overflow/timeout cancels
the reader. Defaults: 10-second request deadline (configurable downward/up to30s),
65536 response bytes (downward configurable), at most4096 stream reads. Captured
response memory uses one fixed buffer rather than an unbounded chunk-object
list. These are dormant safety bounds, not service performance recommendations.
A custom injected fetch must respect AbortSignal. If it ignores cancellation,
the occupied slot stays blocked; requests are not repeatedly raced/spawned.
Recording then reaches its finite offline/buffer bound and stops reward ticks.

No token/header is copied into request evidence, batch digests, pending storage
or status projections. HTTP401/403 is authorization denial. Other transport or
body timeouts/disconnects are unknown acceptance, never invalid gameplay. A
malformed/oversized response pauses with a client contract/support error.

## Public request, digest and response schema

The bound adapter exposes `shooter.run.append`, `shooter.run.status` and reviewed0056
`shooter.run.finish`; the separate pre-run issuer calls `shooter.run.issue`.
`prepare(batch)` runs outside the input loop, copies bounded immutable wire
primitives, validates the existing codec and computes lowercase SHA256 of UTF-8
JSON with this exact alphabetical insertion order:

```js
JSON.stringify({ actions, frames, n, protocol: 2, runId, sequence, tick0 })
```

This is the existing Hub PR07 digest contract. Do not use FNV/log/payment digests
or include a client digest property in the append request. Each prepared object
has an immutable body, exact wire string and digest; retries of that capability
use byte-identical generic SDK request JSON. Only the transport that prepared it
may use it. No checkpoints, state, seed, loadout, outcome or payment fields are
sent. Existing codec still permits only ordered transitionDone action rows.

Stable received acknowledgment has the existing Hub shape:

```js
{ protocol: 2, state: 'received', runId, sequence, tick0, n,
  acceptedSequence, acceptedTick, digest, receivedAt }
```

It is not a payment or proof of official-client execution. The adapter copies
validated fields and grants an internal receipt capability only after an
authenticated RPC response exactly matches the prepared run/sequence/tick range
and SHA256. PR14's `acceptReceipt` checks that private WeakMap capability and the
exact stored input/actions before local release. A cloned/UI-created object,
status cursor alone, mismatched digest/range or unknown response cannot release
pending inputs. The browser/client is untrusted; these checks preserve honest
local evidence, while backend authentication/replay remains authoritative.

Owner status requests are `{runId}` or `{runId,sequence}`. The current projection
is `{protocol,runId,state,revision,operational,received,verified,terminal,payment,
authorization,receivedAck}`. `state` is run lifecycle (open/sealed/terminal/
expired/invalid/quarantined). `received` counts durable input, `verified` counts
resolved input, and `verified.simulationTick` freezes at first terminal while
verified input may advance over accepted trailing bytes. `verified.sequence`
advances only after a complete batch; partial verified ticks are valid while
sequence is still -1. `revision` versions verification; received counters can
advance at the same revision. Independent cursor merge ignores stale dominated
received projections rather than rejecting legitimate same-revision acceptance.
The verified projection must be identical at equal verification revision; lower
verification revisions cannot overwrite newer progress. Fixed-codec byte counters
must equal16times their tick cursor, and action counts stay within tick/batch
ceilings. Terminal
facts and receipt-backed paid facts cannot be overwritten by older projections.

`payment.state` is separately none/pending/paid/ineligible/authorization_denied,
or a pending_retryable receipt-unavailable projection. Paid requires the current policy's fixed20-ticket receipt projection, a clear terminal and fully resolved
accepted input; a partially verified accepted tail cannot already be paid. A verified terminal, transport
success, local clear or received acknowledgment is never displayed as paid by
this core. Pending operational/support results remain distinct from invalid
input. Original-session expiry/closure is authorization denial, with no grace.
The final lifecycle/settlement companion schemas require review before wiring.

## Inactive controller lifecycle

`createCampaignController` privately owns its transport and PR14 recorder. Pass
its synchronous `record(frame,tick)` as PR05's callback only in future reviewed
activation work. It performs identity/deadline/budget checks and bounded recorder
admission; no hash/serialization/storage/network await occurs in that input path.
Failures stop reward recording before simulation via the existing Game latch;
rendering continues. No input is silently dropped and no raw rewarded fallback
or arbitrary completed-log settlement exists.

`pump()` is background work, serializing preparation/append/status. Explicit
`start()` creates one timer/task stream; repeated starts/pumps cannot parallelize
requests. Ready data references PR14 storage, not a second full-log outbox. A
lost reply retains the exact prepared batch and queries owner status with its
sequence. Only matching receivedAck permits cleanup; otherwise retry identical
bytes while still authorized. An authorization-denied snapshot may still carry
a valid historical receipt accepted earlier: it can release that exact durable
local history without authorizing new writes or settlement. Counters never reset
on retry, reconnect, duplicate response or local cleanup.

Status/progress tracks accepted, verified, terminal and payment independently.
A status ahead of local history halts recording as local_history_missing; it does
not reconstruct or import a checkpoint. Terminal/closed/support states stop new
distinct uploads while preserving uncertain local tails. There is no automatic
resume/rebind method. `flushTail()` suspends new local recording and seals the
remaining local tail for ordered append; it does not request server finish. `finish()` requests sealing only after
the exact fully acknowledged tail, as described in the follow-up below.

Finite default bounds (only lowered by controller configuration):

| Resource | Bound |
| --- | --- |
| Concurrent public RPC / background task / timer | 1 / 1 / 1 |
| Total controller RPC calls | 65536 |
| Calls per unresolved batch, including status recovery | 16 |
| Owner status polls/recovery calls | 540 |
| Retry base / exponential maximum | 250ms / 30000ms |
| Idle owner-status cadence | 5000ms |
| Unsuccessful-network recording allowance | 30000ms, also input-buffer bounded |
| Local pending input / reservations | PR14's3600frames/64batches/4MiB reservations |

Server retryAfterMs is a minimum. A delay beyond local policy pauses for
attention rather than retrying early. Jitter is injected/testable and cannot
reset cumulative budgets. Exhaustion pauses with retained evidence, not invalid
or paid. No indefinite automatic polling continues after budgets. A runtime
caller clock affects only local conservatism; the server enforces authorization
and upload time. Its issued upload deadline remains authoritative; there is no
offline or post-expiry authorization grace. UI callback failure cannot spawn
another loop or release input.

Persistence remains zero bytes/batches. Reload loses the local pending tail and
simulation; new recorder tick0 cannot continue an old run from guessed ticks or
private/server checkpoints. Status recovery can display durable historical
progress/payment only. Logout retains bounded live-instance pending evidence;
no cleanup occurs solely on session expiry, failure or account switch.

## Validation and remaining gates

GitHub Actions uses the exact source head for generic SDK composition, independent
known SHA256 vector, byte-identical retry, body/quota/deadline/cancel bounds,
receipt proof, partial/equal-revision cursor merge, stale paid/terminal facts,
retry/offline budgets, identity-generation changes and one-stream tests. Actual
Chromium uses real Game keyboard input/rendering and native fetch with mocked
Hub JSON: hold/drop a committed append reply, record to pressure while it waits,
recover exact acknowledgment, honor retry delay/identical bytes, replay captured
inputs independently to the same state hash, surface expiry and ignore a late
logout response. It uploads sanitized recordings/screenshots and tiny advisory
software-GL CPU fault-case samples. No local application tests/builds execute.

Mocked Hub responses are not real Nakama/PostgreSQL integration. PR18 must cover
that boundary. Software-GL fault timing proves neither human feel, frame pacing,
isolated encoding cost, regression, low-memory capacity nor production capacity.
Strict0056/PR12 dependency checks and final review, real integration
and PR16 honest UI activation remain explicit gates. No rollout is authorized.

## Reviewed0056 lifecycle binding follow-up (pending client/server checks)

`createCampaignIssuer` is a separate explicitly enabled pre-run capability, since
run ID is server-chosen. One instance captures one stable `{canonicalBoss,key}`
request and permits at most16 issue/bind calls total with one private request
slot. Retry that same instance/key after a lost response; never select protocol,
seed/loadout/run ID or regenerate a fallback key to enter legacy. Server legacy
selection is reported as unsupported for this v2 controller. Unknown protocol or
retained manifest support blocks start; it does not trigger a completed-log path.
The currently supported exact retained executable is source05f7a0a245af921fc65a99588564175c19658e38,
SHA256797029721efe6124b718d84349cd255cd52529d3105b2da1d33e97da8d734aa9,
shooter-sim/simulator1/upload2/API2/CP2/economy1/fingerprint73c6eb0f. It is a
compatibility identity, not proof the official browser ran.

An issued response must have the exact0056 shape and limits, canonical engine
issuance/start hash, owner/run binding, fixed45-minute upload deadline and an
issue-time lease snapshot. Only a transport-validated acknowledgment can be
bound. `bindIssued` then fetches current owner status and requires the same
original session, open/live authorization, empty accepted input and no terminal
or seal before returning the inactive bound transport. An old issue-key response
by itself grants no fresh play authority. Another original session, expired or
nonempty history cannot be rebound into a fresh recorder. The issuer is closed
before returning the bound capability. This does not implement Game/UI start.

Status accepts backward-compatible omitted fields for pre0056 rows and otherwise
strict nullable `issuanceAck`/`sealAck`. Historical acknowledgments remain read-only
facts after expiry. Canonical issuance validation constructs a state only once
per run; later immutable comparisons walk the small expected DTO shape rather
than repeatedly rebuilding levels or recursively serializing arbitrary response
graphs. Owned issue/seal/terminal/paid facts cannot regress on stale snapshots.

`controller.finish()` requests a local final-tail stop and background seal. The
same single stream first drains every local batch through a strict matching
received receipt, then captures one immutable
`{lastSequence,lastTick,protocol:2,runId}` finish request. There is no outcome or
payment field. The exact acknowledgment is
`{protocol:2,state:'sealed',runId,lastSequence,lastTick,sealedAt}`. Retry bytes and
persisted sealedAt are stable. A seal is neither verified nor paid. Empty -1/0
can close as server incomplete/ineligible at terminal0/revision0; only paid clear
requires positive verified progress under the policy contract.

A lost finish reply is reconciled with owner status and its exact sealAck,
including after original-session expiry. An acknowledgment of a prior seal does
not authorize new finish, append or settlement after expiry. A client clock is
only conservative scheduling; backend live-session and fixed-deadline checks
remain authoritative. The historical sessionLeaseUntil field is not assumed to
be the current lease, nor used to revive a session.

The server may finish verification before the next local append arrives. An
`invalid/run_closed` response therefore triggers exact-sequence owner-status
recovery before classification. A matching older receivedAck still releases
that already accepted history. If authoritative closed state instead confirms
that the current local tail was never accepted, it stays retained as withheld
input. The stream does not retransmit/drop it or exhaust its per-batch retry
budget merely while payment is pending. Ordinary owner status polling uses the
existing finite cadence/budget, and authoritative pending→paid remains distinct
from a rejected post-terminal local tail. There is no raw rewarded fallback.

The follow-up Actions adds issued/legacy/unsupported/version/canonical DTO tests,
historical-key no-start tests, lost stable seal recovery, finite issuer/session
cancellation, empty closure, terminal run_closed races and withheld-tail payment
polling. Native-browser capture now starts from a mocked server-issued canonical
response plus fresh owner status, asserts real W movement, and recovers a lost
committed seal before expiry/logout checks. The deliberately malformed late
logout response is adversarial noise ignored before parsing, not a valid Hub
fixture. Real Nakama/PostgreSQL coverage remains PR18. Client and0056 strict
server tests/review must both pass before treating PR15 as complete; no PR16 UI
activation or production deployment is included.
