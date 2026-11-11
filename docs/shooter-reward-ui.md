# Default-off rewarded Game/UI wiring (PR16 draft)

`VITE_SHOOTER_REWARDED` must be exactly `true` at build time to mount the entry.
It is absent/false by default. This change sets no deployment environment,
production flag, cohort, credentials or service config. Backend sticky cohort,
readiness, original-session authorization and replay remain authoritative.

The actual title offers a boss selector and shows the fixed20/200-session/1000-
payment-day rules, boss start-day uniqueness, original-session live-at-payment
risk, memory-only reload limitation and supported controls BEFORE Start. Human
and bot legal inputs follow the same rules; this browser is not attested.

Start synchronously creates one stable key before any await, refreshes the
existing SDK session in background, obtains server-owned issuance and fresh
empty/open/live same-original-session status, drains old UI/debug commands before
new state, builds the canonical issued world, resets accumulator/look/presentation
scales and stale hitstop, enables the synchronous recorder gate, then plays and
starts background upload. No seed, health, inventory or keyFactory production
hook exists. The existing debug Game reference grants no backend authority.

A read-only `game.rewardedCampaign.snapshot()` exposes current phase/active/
recording, own run ID and tick highwaters plus bounded slot/reminder counts. This
is a test/UI signal, not a state import or authority API. PR18 can install a legal
read-only input provider before Start, gated on recording, and consume pinned
commands by actual Game tick. A one-shot isolated CI crypto.randomUUID stub can
match a trusted server idempotency fixture without adding a public seed hook.

Local terminal detection reuses the existing read-only boss-part classification
only to stop at a candidate and request final-tail finish. It never claims paid
or changes eligibility. The backend verifies/settles independently. Pause and
hidden-tab time do not synthesize simulation inputs; visibility resets residual
accumulation. Hitstop stops ticks while its presentation clock runs; fixed DT
stays unchanged. Normal casual/PvP paths retain their earlier dispatch.

Crafting/shop/direct inventory/debug/startMode UI requests are blocked and
explained before queueing in reward context. Ordinary movement, slot/wheel,
spells and pressed.interact remain supported. A bypassed unsupported simulation
action is not stripped: the canonical codec latches before simulation. Rendering
continues, and only an explicit Continue unranked choice disables recording for
new local play. Previous pending inputs remain retained and independently
reported; raw unrecorded input cannot silently earn a reward.

Back during issuance invalidates play intent; a late acknowledgment cannot
install gameplay. Under the still-original live session it can seal an empty
cancelled run. Logout/account change stops old issuer/controller generations.
Historical key/status checks may identify a pending run under the same account
but never bind or reconstruct gameplay. The fixed input deadline is distinct
from session expiry: accepted work can still pay after input closure while the
original session remains live, but not after original-session expiry/closure.

One page holds at most2 live/pending slots, each constrained by PR14's finite
buffers. Unacknowledged or withheld input is not evicted to admit another start.
Only resolved slots with zero retained frames are released; at most8 small
owner-filtered status reminders remain, with no frame/state/checkpoint payload.
Manual historical status reads use one slot and finite per-item attempts. New
starts stop at the bound instead of growing account/run Maps.

Actions-only checks cover feature-on/off actual Game/DOM, ordering and frozen
canonical capture, unsupported controls, hitstop/visibility, explicit unranked
choice, stable repeated start/Back, login/account interruptions, accessibility,
finite account memory and the full frozen1001-tick failure at real rAF cadence.
The full trace uses a 320×240 SwiftShader viewport, with frame/GPU/CPU samples retained as advisory evidence; desktop rendering exceeded the same 90-second deadline. The shorter fault lane halts automatic RAF and manually schedules actual Game
steps; it is not evidence of ordinary RAF cadence or human control feel. Service
responses in this UI workflow are mocked and are not real Nakama/PostgreSQL or
retained05f execution proof. PR18 must run the actual public UI/random-seed prefix
and full Sahil7 9634 ticks through real Hub/retained05f/isolated worker at real
wall cadence. No local application tests/builds run; no capacity/control-feel or
production readiness claim is made. Independent review and checks remain gates.
