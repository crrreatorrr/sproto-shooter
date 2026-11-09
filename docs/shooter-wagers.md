# Shooter wager UI (S6)

The wager screen talks to the hub escrow from H4-S. The client does not hold, pay, refund, or mint Tickets. `shooter_pvp` and `shooter_pvp_wager` stay off until an operator turns them on. This screen does not turn them on.

Ken's decision on Nov 7, 2026: there is no pair cap and no daily winnings cap. The screen does not show either.

## What the player sees

The title keeps **Play free** (the existing free 1v1, no stake). **Play for 10 Tickets** is added only after `shooter.version` returns `wagerEnabled: true` for this account. A missing flag, a failed read, or `wagerEnabled: false` leaves the button out. A large local balance cannot put it back.

When the flag is on:

| State | Button |
|---|---|
| Guest, or no signed-in session | Shown, disabled. "Sign in to wager." |
| Balance still loading | Shown, disabled. "Checking your Ticket balance." |
| Balance under 10 | Shown, disabled. The number is the wallet read. |
| Signed in with at least 10 | Enabled. The line shows 10 each, pot 20, and net +10 or −10. |

Choosing the stake opens a confirm step. Nothing is queued until **Stake 10 and queue**. A second click while that request is in flight does not send another ticket. **Leave queue** calls `shooter.queue_cancel` and does not refund.

The matchmaker ticket is mode `wager`, stake `"10"`, and the same protocol, sim, and content fingerprint as free play (protocol 2 / sim 2). The stake is not a chosen amount. Opcodes are unchanged.

A matched lobby whose label is not `{ mode: "wager", stake: 10 }` is left. The screen says no Tickets were taken.

**Ready** is still required. The server holds 10 from each seat only after both are Ready. The screen says so, and it says that 10 seconds without input after that forfeits. A disconnect before both are Ready does not pay the other seat. A draw, both absent, a ready timeout, a shutdown, or a version mismatch refunds. Leaving a live wager warns once, then leaves the match. The client never refunds.

## Receipt

A match RESULT is not a payout. The screen stays **pending** until `shooter.metrics` says `wagerClosed` and the replay is no longer `pending`. Then:

| Server result | Shown |
|---|---|
| Verified KO, time, or forfeit | Net +10 or −10, from the winner seat. |
| Anything else the server closed | Net 0. |

The Ticket number is a fresh `getTicketBalance` after that close. It is not the previous balance plus the net. If the wallet read fails, the net can show and the balance stays blank.

The receipt is stored in `sessionStorage` under `sproto-shooter:wager-receipt`, bound to the player id. A reconnect recalls it and calls `shooter.resume`, then `shooter.metrics`. `shooter.resume` always reports `stake: 0`; the screen does not treat that as "no wager." A pending receipt stays pending if the match is already gone. Another account does not see it.

A live match does the same pair of reads when its socket opens again after a drop. While the socket is down the overlay says Reconnecting, including when the match handle itself never emits close. A closed wager replaces the live line with the receipt. A match that is still live keeps the live line.

A device account can carry a Nakama username and an empty wallet. The stake line shows "Sign in to wager" whenever the server answers `wager_guest`. The empty-wallet line is only for an account the server did not refuse as a guest.

A rematch is a new confirm. One player confirming does not queue the other and does not spend Tickets. A pending receipt blocks a new stake.

A devtools edit of the local result is not written as a receipt and does not call a money RPC.

## RPCs this client may send

`shooter.version`, `shooter.room_create`, `shooter.room_join`, `shooter.queue_cancel`, `shooter.resume`, `shooter.metrics`.

There is no client settle, winner, or refund RPC. `assertWagerRpc` refuses anything else before the socket sees it. The queue path uses the matchmaker, not `room_create`.

## Tests

`tests/wager-ui.test.js` drives the screen with mocked `shooter.version`, metrics, and wallet reads. `tests/browser-wagers.mjs` loads the same renderer in Chromium and saves screenshots. Neither talks to staging. Staging was not available for this phase.

The public flags stay off. A build that cannot read `shooter.version` shows no stake button.
