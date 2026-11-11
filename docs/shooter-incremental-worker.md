# Dormant incremental replay worker

This private pure API has no active RPC, new issuance endpoint, client SDK or
settlement integration. Legacy `verifyRun` and `verifyRunJSON` retain protocol 1
semantics, limits and goldens. Incremental append envelopes use protocol 2 and a
separate private checkpoint schema 2. Do not submit them to protocol 1 endpoints.

The worker must run an approved artifact selected by trusted service code. Its
context contains the original server-owned issuance and an immutable manifest
`{artifact:"shooter-sim",sourceCommit,sha256,protocol:1,contentFingerprint}`. The
SHA-256 identifies the exact artifact; a content fingerprint is insufficient.
The service authenticates and authorizes this context. Neither checksums nor the
pure API authenticate a caller or authorize payment.

## Two stages

`beginIncrementalReplay(ctx)` reconstructs the canonical issued start and returns
`{publicResult, privateCheckpoint}`. A service persists and fences this private
checkpoint; it must never accept one from a client.

`acceptReplayBatch(wireJSON, privateCheckpoint, ctx)` validates exactly
`{protocol:2,runId,sequence,tick0,n,frames,actions}`. The sequence identifies a
public batch; `tick0` is an input offset, independent of the simulation tick.
Before parsing, the complete UTF-8 wire body is bounded to 2162688 bytes. Only
canonical base64 and the codec's ordered transition actions are accepted.

For every batch, trusted `ctx.accepted` must contain
`{runId,sequence,tick0,n,sha256,binding,acceptedBeforeTerminal}`. Its SHA-256 is
computed over `stableStringify` of the validated complete batch, including
actions. `binding` equals the issuance's account/session/day/run binding. The
service must supply this record from immutable durable acceptance, after
authentication. This pure API checks content identity, not its provenance.
An accepted record marked `acceptedBeforeTerminal:true` allows draining history
already admitted before terminal commit. It does not authorize new public
admission after terminal. An ingestion service must refuse such new batches.

Acceptance counts the complete pending batch once. Only one batch is pending in
a worker checkpoint; a durable queue may already contain more accepted batches.
The checkpoint's accepted counters describe the accepted prefix loaded into this
worker chain. A gateway must also retain its own authoritative accepted tail and
global admission accounting; this helper is not a replacement for ingestion.
Identical public transport retries recover immutable service acknowledgments;
they must not call acceptance again. Repeated or conflicting worker sequences
are rejected without mutating the predecessor checkpoint.

`stepReplaySlice(privateCheckpoint, ctx)` consumes up to trusted
`ctx.maxWorkFrames` (1–28800) of the same pending batch. It returns a new private
checkpoint. Persist it atomically with the worker's monotonic/fenced progress.
`ctx.clock` is a private deterministic test hook; clients have no clock override.
The unchanged 15000 ms execution ceiling returns `pending_retryable` with
`execution_timeout` and complete tick-boundary progress. Retrying a work slice
does not increment accepted counters. Deterministic validation failures return
`invalid` and no checkpoint. Infrastructure crashes, artifact unavailability and
authorization failures require distinct service handling.

## Accounting and terminal state

Limits are unchanged from the dormant Hub v2 contract: 2097152 canonical frame
text bytes per batch, 67108864 per run, 1–28800 input frames per batch, 162000 per
run, 4096 batches, 32 actions per batch and 131072 per run. IDs are bounded to 80
ASCII characters and public input depth to 12. JSON/actions have independent
body bounds and do not consume the frame-text allowance. All run accounting
survives JSON checkpoint restores. The original issuance's frame ceiling also
applies. These finite bounds do not establish a measured public concurrency.

Accepted input, verified input and simulation tick are separate counters. A
first authoritative clear, assisted completion, death or flee latches its tick,
part history and eligibility after the tick's existing security checks. Later
accepted input is decoded, validated and counted but never simulated. It cannot
change RNG, inventory, terminal classification or leaderboard time. No Tickets
are minted by this artifact. A valid incomplete accepted tail remains incomplete;
no client-supplied finish flag can claim success.

Private schema 2 wraps exactly one complete schema-1 simulation checkpoint plus
the original issuance, cumulative accounting, pending validated batch/cursor and
terminal latch. Schema 1 helpers remain independently supported; neither schema
is silently interpreted as the other. Rewind checkpoints remain flat plain
states rather than nested envelopes. The outer corruption digest covers every
field, including pending input and terminal metadata. It is not authentication.

`publicReplayJSON(workerResult)` serializes an explicit whitelist. It exposes
progress and a bounded terminal summary, never snapshots, bindings, RNG,
inventory, private context, pending input or part accumulators. It is a serializer,
not a replay endpoint. Do not spread a worker result into an RPC response.

## Validation

GitHub Actions checks the exact PR head. The incremental suite preserves all 12
frozen traces, including the entire 24000-frame Obama seed 7 trace, through whole
and segmented public input, bounded work slices and JSON resumes. It exercises
the built artifact in a fresh Node process, Goja and Chromium without raising
the legacy CPU ceiling. Separate tests cover failure/assisted terminal ticks,
trailing-input accounting, timeout continuation, immutable predecessors,
cumulative caps, strict wire schemas and public redaction. The existing full
suite continues to check legacy outcomes. Both simulator artifacts are uploaded
for the separately reviewed mandatory Hub pin companion; do not merge the
Shooter change before that companion is prepared.
