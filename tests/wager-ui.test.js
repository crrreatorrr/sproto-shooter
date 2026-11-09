import { describe, expect, it } from 'vitest';
import { createPvpClient } from '../src/net/client.js';
import { OP } from '../src/net/protocol.js';
import { assertWagerRpc, WAGER_RPCS } from '../src/hub/link.js';
import { matchmakerProps } from '../src/net/protocol.js';
import {
  LOSE_NET, POT, RULE_TEXT, STAKE, WIN_NET,
  commitReceipt, createWagerFlow, labelIsWager, memoryReceiptStore, offerFromServer,
  receiptFromMetrics, reconnectNotice, renderWagerScreen, wagerGuestProbe, wagerMatchmakerRequest, wagerSlotHtml,
} from '../src/hub/wagers.js';

const PLAYER = 'player-a';

function session(over = {}) {
  return { playerId: PLAYER, bankable: true, guest: false, status: 'connected', ...over };
}

function version(over = {}) {
  return { wagerEnabled: true, wagerStake: 10, wagerPot: 20, protocol: 2, sim: 2, ...over };
}

function closed(over = {}) {
  return {
    wagerClosed: true,
    stakes: true,
    stake: 10,
    outcome: 'ko',
    winner: 0,
    endReason: 'ko',
    replay: { status: 'done', verified: true },
    ...over,
  };
}

function harness({ balance = 40, versionBody = version(), who = session(), rpc } = {}) {
  const calls = [];
  const added = [];
  const removed = [];
  let wallet = balance;
  const flow = createWagerFlow({
    store: memoryReceiptStore(),
    session: () => who,
    balance: async () => wallet,
    rpc: async (id, body) => {
      calls.push({ id, body });
      if (rpc) return rpc(id, body, calls);
      if (id === 'shooter.version') return versionBody;
      if (id === 'shooter.queue_cancel') return { ok: true, queued: false, ticketsMinted: 0, stakes: false };
      if (id === 'shooter.resume') return { error: 'match_missing' };
      return { ok: true };
    },
    addMatchmaker: async (req) => {
      added.push(req);
      return { ticket: `ticket-${added.length}` };
    },
    removeMatchmaker: async (ticket) => { removed.push(ticket); },
  });
  return {
    flow, calls, added, removed,
    setBalance(n) { wallet = n; },
    setSession(next) { Object.assign(who, next); },
  };
}

describe('wager offer', () => {
  it('stays hidden when the server flag is off, missing, or the build mismatches', () => {
    expect(offerFromServer({ version: { wagerEnabled: false }, session: session(), balance: 1000 }).shown).toBe(false);
    expect(offerFromServer({ version: { wagerEnabled: false }, session: session(), balance: 1000 }).enabled).toBe(false);
    expect(offerFromServer({ version: null, session: session(), balance: 1000 }).enabled).toBe(false);
    expect(offerFromServer({ session: session(), balance: 1000 }).enabled).toBe(false);
    const stale = offerFromServer({ version: { error: 'version_mismatch', wagerEnabled: true }, session: session(), balance: 80 });
    expect(stale.shown).toBe(false);
    expect(stale.enabled).toBe(false);
    expect(stale.reason).toMatch(/Refresh/);
    expect(wagerSlotHtml({ offer: stale })).toBe('');
  });

  it('shows the real balance and the guest or insufficient reason, and never enables from balance alone', () => {
    const guest = offerFromServer({ version: version(), session: session({ guest: true, status: 'guest' }), balance: 80 });
    expect(guest.shown).toBe(true);
    expect(guest.enabled).toBe(false);
    expect(guest.reason).toMatch(/Sign in/);
    expect(wagerSlotHtml({ offer: guest })).toMatch(/disabled/);
    expect(wagerSlotHtml({ offer: guest })).toMatch(/Sign in/);

    const short = offerFromServer({ version: version(), session: session(), balance: 9 });
    expect(short.enabled).toBe(false);
    expect(short.reason).toMatch(/You have 9/);
    expect(wagerSlotHtml({ offer: short })).toMatch(/You have 9/);

    const checking = offerFromServer({ version: version(), session: session(), balance: null });
    expect(checking.enabled).toBe(false);
    expect(checking.reason).toMatch(/Checking/);

    const device = offerFromServer({
      version: version(),
      session: session({ guest: false, status: 'connected' }),
      balance: 0,
      refusal: 'wager_guest',
    });
    expect(device.enabled).toBe(false);
    expect(device.guest).toBe(true);
    expect(device.reason).toMatch(/Sign in to wager/);
    expect(device.reason).not.toMatch(/You have 0/);
    expect(wagerSlotHtml({ offer: device })).toMatch(/Sign in to wager/);
    expect(wagerSlotHtml({ offer: device })).not.toMatch(/you have 0/i);

    const namedEmpty = offerFromServer({
      version: version(),
      session: session(),
      balance: 0,
      refusal: 'version_mismatch',
    });
    expect(namedEmpty.guest).toBe(false);
    expect(namedEmpty.reason).toMatch(/You have 0/);

    const ready = offerFromServer({ version: version(), session: session(), balance: 10 });
    expect(ready.enabled).toBe(true);
    expect(ready.stake).toBe(STAKE);
    expect(ready.pot).toBe(POT);
    const html = wagerSlotHtml({ offer: ready });
    expect(html).toMatch(/Play for 10 Tickets/);
    expect(html).toMatch(/you have 10/);
    expect(html).not.toMatch(/disabled/);
  });

  it('asks the server before showing an empty wallet to a named device account', async () => {
    const probed = [];
    const added = [];
    const flow = createWagerFlow({
      session: () => session({ guest: false, status: 'connected' }),
      balance: async () => 0,
      rpc: async (id) => (id === 'shooter.version' ? version() : {}),
      addMatchmaker: async () => { added.push(1); return { ticket: 'real' }; },
      readServerRefusal: async () => {
        probed.push(wagerGuestProbe());
        return 'Error: wager_guest at noteAdd';
      },
    });
    await flow.refresh();
    expect(probed).toHaveLength(1);
    expect(probed[0].stringProperties).toMatchObject({ mode: 'wager', stake: '10', content: 'probe' });
    expect(probed[0].stringProperties.content).not.toBe(version().content);
    expect(flow.view.offer.reason).toMatch(/Sign in to wager/);
    expect(wagerSlotHtml(flow.view)).not.toMatch(/you have 0/i);
    await flow.confirmStake();
    expect(flow.view.phase).toBe('offer');
    expect(added).toHaveLength(0);
  });

  it('does not build a pair cap or a daily winnings cap', async () => {
    const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('../src/hub/wagers.js', import.meta.url), 'utf8'));
    expect(src).not.toMatch(/pairLimit|dailyCap|winningsLeft|matchesLeft|capMeter/);
  });
});

describe('wager queue', () => {
  it('asks for a fresh confirm and queues the fixed 10-Ticket ticket once', async () => {
    const { flow, added, calls } = harness();
    await flow.confirmStake();
    expect(flow.view.phase).toBe('confirm');
    expect(added).toHaveLength(0);
    await flow.queueStake();
    await flow.queueStake();
    expect(added).toHaveLength(1);
    expect(added[0].stringProperties).toMatchObject({ mode: 'wager', stake: '10', game: 'sproto-shooter' });
    expect(added[0].query).toContain('+properties.mode:wager');
    expect(added[0].query).toContain('+properties.stake:10');
    expect(added[0].minCount).toBe(2);
    expect(matchmakerProps().stringProperties.mode).toBe('free');
    expect(calls.map((c) => c.id)).not.toContain('shooter.room_create');
    expect(calls.map((c) => c.id)).not.toContain('tickets.earn');
    const screen = renderWagerScreen(flow.view);
    expect(screen).toContain('Waiting for the other player');
    expect(screen).toContain('10 each');
    expect(screen).toContain('pot 20');
    expect(screen).toContain('data-wager-rule');
    expect(screen).toContain('10 seconds');
  });

  it('cancels without a refund and ignores a duplicate while the first request is in flight', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const added = [];
    const flow = createWagerFlow({
      session: () => session(),
      balance: async () => 40,
      rpc: async (id) => {
        assertWagerRpc(id);
        if (id === 'shooter.version') return version();
        if (id === 'shooter.queue_cancel') return { ok: true, stakes: false, ticketsMinted: 0 };
        return {};
      },
      addMatchmaker: () => gate.then(() => {
        added.push(1);
        return { ticket: 't-1' };
      }),
      removeMatchmaker: async () => {},
    });
    await flow.confirmStake();
    const first = flow.queueStake();
    const second = flow.queueStake();
    release();
    await first;
    await second;
    expect(added).toHaveLength(1);
    await flow.cancelQueue();
    expect(flow.view.phase).toBe('offer');
    expect(flow.view.notice).toMatch(/No Tickets were taken/);
  });

  it('refuses guests, insufficient funds, and a flag that turns off before the queue', async () => {
    const guest = harness({ who: session({ guest: true, status: 'guest' }) });
    await guest.flow.confirmStake();
    expect(guest.flow.view.phase).toBe('offer');
    expect(guest.added).toHaveLength(0);
    expect(guest.flow.view.notice).toMatch(/Sign in/);

    const poor = harness({ balance: 4 });
    await poor.flow.confirmStake();
    expect(poor.flow.view.offer.enabled).toBe(false);
    expect(poor.flow.view.notice).toMatch(/You have 4/);

    const { flow, added } = harness({
      rpc: async (id) => {
        if (id === 'shooter.version') {
          const err = new Error('stakes_disabled');
          err.code = 'stakes_disabled';
          throw err;
        }
        return {};
      },
    });
    await flow.confirmStake();
    expect(flow.view.offer.shown).toBe(false);
    expect(added).toHaveLength(0);
  });

  it('drops the queue when the session ends and does not keep a stale enable', async () => {
    const box = harness();
    await box.flow.confirmStake();
    await box.flow.queueStake();
    box.setSession({ bankable: false, status: 'error', playerId: PLAYER });
    await box.flow.refresh();
    expect(box.removed).toEqual(['ticket-1']);
    expect(box.flow.view.offer.enabled).toBe(false);
    expect(box.flow.view.phase).toBe('offer');
    expect(box.flow.view.notice).toMatch(/Refresh/);
  });
});

describe('wager receipt', () => {
  function pay(seat, metrics, balance = 50) {
    const box = harness({ balance });
    box.flow.noteSeat(seat);
    box.flow.view.playerId = PLAYER;
    box.flow.view.matchId = 'match-1';
    return box;
  }

  it('keeps a server result pending until metrics close, then shows the wallet the server returned', async () => {
    const box = pay(0, null, 47);
    box.flow.view.playerId = PLAYER;
    box.flow.noteLocalResult({ outcome: 'ko', winner: 0, ticketsMinted: 999, earn: 20, stakes: true });
    expect(box.flow.view.phase).toBe('pending');
    expect(box.flow.view.receipt.net).toBeNull();
    expect(box.flow.view.receipt.minted).toBe(0);
    expect(renderWagerScreen(box.flow.view)).toMatch(/Pending server verification/);
    expect(box.calls.map((c) => c.id)).not.toContain('tickets.earn');

    await box.flow.ingestMetrics({
      matchId: 'match-1', wagerClosed: false, stakes: true, stake: 10,
      outcome: 'ko', winner: 0, endReason: 'ko', replay: { status: 'pending', verified: false },
    }, 0);
    expect(box.flow.view.receipt.status).toBe('pending');
    expect(box.flow.view.receipt.net).toBeNull();

    await box.flow.ingestMetrics(closed({ matchId: 'match-1' }), 0);
    expect(box.flow.view.receipt).toMatchObject({ status: 'settled', net: WIN_NET, balance: 47, minted: 0, fee: 0 });
    expect(box.flow.view.receipt.balance).not.toBe(40 + 10);
    const html = renderWagerScreen(box.flow.view);
    expect(html).toContain('data-wager-net="+10"');
    expect(html).toContain('Net +10');
    expect(html).toContain('>47<');
  });

  it('shows net −10 for a loss and net 0 for every refund', async () => {
    const loss = pay(1);
    loss.flow.view.playerId = PLAYER;
    loss.flow.view.matchId = 'match-1';
    await loss.flow.ingestMetrics(closed({ matchId: 'match-1', winner: 0 }), 1);
    expect(loss.flow.view.receipt).toMatchObject({ status: 'settled', net: LOSE_NET, balance: 50 });
    expect(renderWagerScreen(loss.flow.view)).toContain('data-wager-net="-10"');
    expect(renderWagerScreen(loss.flow.view)).toContain('Net −10');

    const cases = [
      closed({ outcome: 'draw', winner: null, endReason: 'double_ko', replay: { status: 'done', verified: true } }),
      closed({ outcome: 'draw', winner: null, endReason: 'both_absent', replay: { status: 'done', verified: true } }),
      closed({ outcome: 'cancel', winner: null, endReason: 'ready_timeout', stakes: false, stake: 0, replay: { status: 'skipped', verified: false } }),
      closed({ outcome: 'cancel', winner: null, endReason: 'server_shutdown', stakes: false, stake: 0, replay: { status: 'skipped', verified: false } }),
      closed({ outcome: 'cancel', winner: null, endReason: 'version_mismatch', stakes: false, stake: 0, replay: { status: 'skipped', verified: false } }),
      closed({ outcome: 'forfeit', winner: 0, endReason: 'stall', replay: { status: 'done', verified: false } }),
      closed({ outcome: 'cancel', winner: null, endReason: 'insufficient_tickets', stakes: false, stake: 0, replay: { status: 'skipped', verified: false } }),
    ];
    for (const metrics of cases) {
      const got = receiptFromMetrics({ metrics: { ...metrics, matchId: 'm' }, seat: 0, playerId: PLAYER, balance: 40 });
      expect(got.status, metrics.endReason).toBe('refunded');
      expect(got.net, metrics.endReason).toBe(0);
      expect(got.minted).toBe(0);
    }
  });

  it('pays a verified forfeit and remembers the receipt for the same player after reconnect', async () => {
    const store = memoryReceiptStore();
    const flow = createWagerFlow({
      store,
      session: () => session(),
      balance: async () => 60,
      rpc: async (id) => {
        if (id === 'shooter.version') return version();
        if (id === 'shooter.resume') return { matchId: 'match-9', stake: 0, stakes: false };
        if (id === 'shooter.metrics') return closed({ matchId: 'match-9', outcome: 'forfeit', endReason: 'stall', winner: 0 });
        return {};
      },
    });
    flow.view.playerId = PLAYER;
    flow.view.matchId = 'match-9';
    await flow.ingestMetrics({
      matchId: 'match-9', wagerClosed: false, outcome: 'forfeit', winner: 0, endReason: 'stall',
      stakes: true, stake: 10, replay: { status: 'pending', verified: false },
    }, 0);
    expect(flow.view.receipt.status).toBe('pending');

    const again = createWagerFlow({
      store,
      session: () => session(),
      balance: async () => 60,
      rpc: async (id, body) => {
        if (id === 'shooter.resume') return { matchId: 'match-9', stake: 0 };
        if (id === 'shooter.metrics') {
          expect(body.matchId).toBe('match-9');
          return closed({ matchId: 'match-9', outcome: 'forfeit', endReason: 'stall', winner: 0 });
        }
        return version();
      },
    });
    expect(again.recallReceipt().status).toBe('pending');
    expect(again.view.receipt.net).toBeNull();
    await again.resumeServer();
    expect(again.view.receipt).toMatchObject({ status: 'settled', net: WIN_NET, balance: 60, matchId: 'match-9' });

    const other = createWagerFlow({ store, session: () => session({ playerId: 'player-b' }) });
    expect(other.recallReceipt()).toBeNull();
  });

  it('reads shooter.resume and shooter.metrics after reconnect and shows a settled forfeit', async () => {
    const calls = [];
    const flow = createWagerFlow({
      session: () => session(),
      balance: async () => 30,
      rpc: async (id, body) => {
        calls.push({ id, body });
        if (id === 'shooter.resume') {
          const err = new Error('match_missing');
          err.code = 'match_missing';
          throw err;
        }
        if (id === 'shooter.metrics') {
          return closed({ matchId: 'match-9', outcome: 'forfeit', endReason: 'stall', winner: 0 });
        }
        return {};
      },
    });
    flow.view.playerId = PLAYER;
    flow.view.matchId = 'match-9';
    flow.view.phase = 'live';
    flow.view.seat = 0;
    flow.view.notice = 'Match is live. Tickets now 10.';
    expect(await flow.syncAfterReconnect(0)).toBe(true);
    expect(calls.map((c) => c.id)).toEqual(['shooter.resume', 'shooter.metrics']);
    expect(calls[1].body).toMatchObject({ matchId: 'match-9' });
    expect(flow.view.phase).toBe('receipt');
    expect(flow.view.receipt).toMatchObject({ status: 'settled', net: WIN_NET, balance: 30, stake: STAKE });
    expect(renderWagerScreen(flow.view)).toContain('data-wager-phase="receipt"');
    expect(renderWagerScreen(flow.view)).not.toContain('Match is live');
    expect(reconnectNotice(10_000)).toMatch(/Reconnecting/);
    expect(reconnectNotice(10_000)).not.toMatch(/Match is live/);
  });

  it('does not treat resume stake 0 as the end of a match that is still live', async () => {
    const flow = createWagerFlow({
      session: () => session(),
      balance: async () => 10,
      rpc: async (id) => {
        if (id === 'shooter.resume') return { matchId: 'match-9', stake: 0, stakes: false };
        if (id === 'shooter.metrics') {
          return {
            matchId: 'match-9', phase: 'live', wagerClosed: false, outcome: '',
            stakes: true, stake: 10, replay: { status: 'pending' },
          };
        }
        return {};
      },
    });
    flow.view.playerId = PLAYER;
    flow.view.matchId = 'match-9';
    flow.view.phase = 'live';
    flow.view.notice = 'Match is live. Tickets now 10.';
    expect(await flow.syncAfterReconnect(1)).toBe(false);
    expect(flow.view.phase).toBe('live');
    expect(flow.view.receipt).toBeNull();
    expect(flow.view.notice).toMatch(/Match is live\. Tickets now 10/);
  });

  it('refuses a forged receipt and every client settle, winner, or refund call', () => {
    const store = memoryReceiptStore();
    expect(commitReceipt(store, PLAYER, {
      source: 'devtools', status: 'settled', net: 10, playerId: PLAYER, minted: 0, fee: 0,
    })).toBeNull();
    expect(store.load(PLAYER)).toBeNull();
    expect(commitReceipt(store, PLAYER, {
      source: 'server', status: 'settled', net: 50, playerId: PLAYER, minted: 0, fee: 0,
    })).toBeNull();
    for (const id of ['tickets.earn', 'shooter.wager.settle', 'shooter.wager.refund', 'session.event', 'score.submit']) {
      expect(() => assertWagerRpc(id)).toThrow(/rpc_refused/);
    }
    for (const id of WAGER_RPCS) expect(() => assertWagerRpc(id)).not.toThrow();
    expect(labelIsWager(JSON.stringify({ mode: 'wager', stake: 10 }))).toBe(true);
    expect(labelIsWager(JSON.stringify({ mode: 'free', stake: 0 }))).toBe(false);
  });

  it('makes both players confirm a rematch and explains a live leave', async () => {
    const { flow, added, calls } = harness({ balance: 30 });
    flow.view.playerId = PLAYER;
    flow.view.matchId = 'match-1';
    await flow.ingestMetrics(closed({ matchId: 'match-1' }), 0);
    await flow.rematch();
    expect(flow.view.phase).toBe('confirm');
    expect(flow.view.rematchArmed).toBe(true);
    expect(added).toHaveLength(0);
    expect(renderWagerScreen(flow.view)).toMatch(/Both players have to stake 10 again|Stake 10 and queue/);
    await flow.queueStake();
    expect(added).toHaveLength(1);

    flow.noteReady();
    expect(flow.needsLeaveWarning()).toBe(true);
    expect(flow.armLeave()).toBe(true);
    expect(flow.view.notice).toMatch(/10 seconds/);
    expect(flow.view.notice).toMatch(/will not refund/);
    const before = calls.length;
    await flow.abandon();
    expect(flow.view.phase).toBe('left');
    expect(flow.view.notice).toMatch(/did not refund/);
    expect(calls.slice(before).map((c) => c.id)).toEqual(['shooter.queue_cancel']);
    expect(RULE_TEXT).toMatch(/10 seconds/);
    expect(RULE_TEXT).toMatch(/cannot mint or refund/);
  });
});

describe('client result', () => {
  it('drops economy fields from RESULT and still checks the combat seed', () => {
    const fns = [];
    const match = { send() {}, onMessage(fn) { fns.push(fn); return () => {}; } };
    const client = createPvpClient({ accountId: 'cy', match, clock: () => 0 });
    const deliver = (op, body) => { for (const fn of fns) fn({ opCode: op, json: () => body }); };
    deliver(OP.WELCOME, { accountId: 'cy', seat: 0, phase: 'lobby', combatCommit: 'abc' });
    deliver(OP.RESULT, {
      outcome: 'ko', winner: 0, reason: 'ko', tick: 5, combatSeed: 'ffeeddccbbaa99887766554433221100',
      ticketsMinted: 50, stakes: true, earn: 20, refund: true, balance: 9999,
    });
    expect(client.result).toMatchObject({ outcome: 'ko', winner: 0, reason: 'ko', ticketsMinted: 0, stakes: false });
    expect(client.result.earn).toBeUndefined();
    expect(client.result.refund).toBeUndefined();
    expect(client.result.balance).toBeUndefined();
    expect(client.viewState().ticketsMinted).toBe(0);
    expect(Object.keys(OP)).toEqual(['HELLO', 'WELCOME', 'REJECT', 'READY', 'PHASE', 'INPUT', 'SNAPSHOT', 'RESULT', 'RESYNC', 'PING', 'PONG']);
  });
});

describe('wager screen', () => {
  it('escapes a reason and hides the stake when the flag is off', () => {
    const off = renderWagerScreen({
      phase: 'offer',
      offer: offerFromServer({ version: { wagerEnabled: false }, balance: 80, session: session() }),
      receipt: null,
      notice: '',
    });
    expect(off).toContain('data-wager-flag="off"');
    expect(off).toContain('hidden');
    expect(off).toContain('Play free');
    const nasty = renderWagerScreen({
      phase: 'offer',
      offer: { shown: true, enabled: false, reason: '<script>', balance: 3, stake: 10, pot: 20 },
      receipt: null,
      notice: '',
    });
    expect(nasty).toContain('&lt;script&gt;');
    expect(nasty).not.toContain('<script>');
  });
});
