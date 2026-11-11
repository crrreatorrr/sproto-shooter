# Dormant bounded client recorder (PR14)

`src/hub/campaignRewards/recorder.js` provides an explicitly enabled recorder
capability. Nothing creates it from Game, Hub link, SDK or UI. PR16 must start
from an authenticated server-issued state; this module neither authenticates nor
issues a run. There are no uploads, background scheduler, SDK changes, payment
or eligibility decisions. Browser inputs and these buffers confer no official
client provenance or server authority.

The Game PR05 synchronous adapter is `(frame, tick) => recorder.record(frame,
tick)`. It accepts only frozen, fixed 16-character canonical frame strings and
at most one frozen transitionDone row, as produced by canonicalCommand. Ticks
start at zero and must be contiguous. The input path retains the immutable frame
text/action primitives into small owned frozen slots and updates counters; it performs no network, promise, storage write,
whole-batch serialization or decode. Only fixed own immutable data descriptors are
read; getters/inherited fields are rejected and unrelated payload graphs are
never retained. Ready storage similarly copies only bounded wire primitives. It never drops frames or falls back to raw
reward inputs. An admission failure throws before recording the new tick; PR05
latches that failure before simulation while continuing rendering. The recorder
also permanently latches failures so bypassing/replacing the Game callback cannot
resume the same recording silently.

A later background controller must call `finalizeNext()` outside Game.step to
assemble one queued batch, or `finalizeNext({tail:true})` to seal the current
tail. Assembly joins frame strings, translates action offsets and validates the
result with the existing strict decoder. Batches and action rows are frozen.
Frames are fixed 12 raw bytes, so each individual frame's 16-character base64
encoding has no padding and concatenates to exactly the batch encoding. No codec
actions are added. A Worker is not included without evidence it is warranted.

All limits are finite and may only be lowered:

| Resource | Ceiling |
| --- | --- |
| Active batch | 120 frames, 32 action rows |
| All unresolved active/queued/ready frames | 3600 |
| All unresolved batches including active | 64 |
| All unresolved action rows | 3600 |
| Accounting reservation | 4 MiB |
| Ready memory storage | 64 batches, 3600 frames, 57600 frame-text bytes |
| Persistent storage | 0 bytes / 0 batches (unsupported) |
| Cumulative run frames | 162000 |
| Cumulative run input text | 64 MiB |
| Cumulative run batches / actions | 4096 / 131072 |

These local limits are deliberately below the protocol's 2 MiB frame-text and
28800-frame per-batch ceilings; 120 frames require 1920 input-text bytes. They
are dormant safety choices, not measured operating cadence or device capacity.
The retained frame/action/batch counts bound reference objects and array slots:
at most 3600 owned fixed-size frame slots/strings, 3600 action flags/rows, 64 batch
containers and 64 ready envelopes, with at most one batch's temporary decoded
commands and copied action rows during finalization. No unbounded receipt cache
or global run registry exists. Each retained frame reserves 512 accounting bytes,
each action 128 and each batch 1024, charged across active, queued and ready
phases until release. These conservative reservations distinguish input text
from memory accounting; they are not an exact JavaScript heap bound or a
low-memory capacity guarantee. Engine overhead/GC and transient allocation must
be measured on intended devices before activation.

Storage quota or finalization failure retains queued references, latches reward
recording and surfaces the error. Finalization/drain is still available after a
recording latch or suspension; it cannot clear the latch. A controller must
schedule bounded work, surface pressure, and offer an honest explicitly unranked
continuation rather than replace missing reward inputs. Without acknowledgments,
recording intentionally stops at the finite local ceiling.

Every instance binds an account ID and issued run ID. Reads/releases require the
same pair; no account-switch or rebinding operation exists. `suspend()` stops
recording on logout/account change and retains evidence in that live instance.
The caller must retain that instance while reconciling the original run.
`acknowledge(receipt, owner)` releases only the exact ready sequence/tick range
when an injected synchronous `acceptReceipt` adapter returns true for a matching
stable `state: received` receipt, using the existing Hub PR07 acknowledgment shape. Without that adapter no deletion is possible. This
adapter is an internal seam for a future authenticated transport, not proof of
authorization, durability or payment. It must never accept an arbitrary UI
object as server evidence. Unconfirmed/async/mismatched receipts leave storage
unchanged. Cumulative run counters never decrease after cleanup.

There is deliberately no localStorage/IndexedDB persistence. Malformed external
objects are rejected, not loaded as history. Closing/reloading the page loses
all unacknowledged memory-only inputs; opening a new recorder cannot restore a
run from guessed ticks, client checkpoints or server private checkpoints. Future
status recovery can reconcile server-received history but cannot invent the
missing local tail or resume an equivalent simulation. The UI/controller work
must disclose this limitation, stop rewarded continuation after lost local
state, and handle the original session/run deadlines without expiry grace.

GitHub's exact-head `reward-recorder` workflow runs unit bounds/receipt/isolation
checks and an actual Chromium Game test with DOM keyboard input. The browser
rolls immutable batches, injects a tiny memory quota, verifies recording stops
before the next simulation tick while rendering continues, drains only a
confirmed batch and independently replays the four captured ticks to the same
hash. Reload is tested as loss of local history, not crash restoration. Uploaded
CPU samples are tiny, instrumented software-GL fault-case observations; they do
not establish isolated encoding cost, frame pacing, control feel, regression,
low-memory capacity or production throughput. No local application checks ran.
