// Shooter wager screen. The hub escrow (H4-S) is the only thing that can hold, pay, or refund.
// This module reads shooter.version and refuses to show a stake unless that RPC says
// wagerEnabled. It never calls a settle, winner, refund, or earn RPC. There is no pair
// cap and no daily winnings cap (Ken, Nov 7 2026), so the screen does not invent one.
import { CONTENT, GAME_ID, PROTOCOL, SIM_VERSION } from '../net/protocol.js';
import { assertWagerRpc, WAGER_RPC } from './link.js';

export const STAKE = 10;
export const POT = 20;
export const WIN_NET = 10;
export const LOSE_NET = -10;
export const STALL_MS = 10_000;

export const RULE_TEXT = 'Each signed-in seat stakes 10 Tickets. The pot is 20 and there is no fee. '
  + 'A verified KO or time win pays the pot: the winner nets +10 and the loser nets −10. '
  + 'After both players are Ready, a seat that sends no input for 10 seconds forfeits and the other seat is paid. '
  + 'A disconnect before both are Ready does not pay anyone. '
  + 'A draw, both absent, a ready timeout, a shutdown, or a version mismatch refunds both stakes. '
  + 'This client cannot mint or refund Tickets.';

const PAY_OUTCOMES = new Set(['ko', 'time', 'forfeit']);
const RECEIPT_KEY = 'sproto-shooter:wager-receipt';

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

/** Flag, guest, and balance. A balance alone never turns the stake on. */
export function offerFromServer({ version, session, balance } = {}) {
  const mismatch = !!(version && (version.error === 'version_mismatch' || version.reason === 'version_mismatch'));
  const flag = !!(version && version.wagerEnabled === true && !version.error);
  const knownBalance = finite(balance);
  if (!flag) {
    return {
      shown: false,
      enabled: false,
      reason: mismatch ? 'This build is out of date. Refresh.' : '',
      balance: knownBalance,
      stake: STAKE,
      pot: POT,
      guest: false,
      mismatch,
    };
  }
  const status = session?.status || 'offline';
  const guest = status === 'guest' || session?.guest === true;
  const bankable = !!session?.bankable && status !== 'error' && status !== 'offline';
  let reason = '';
  let enabled = false;
  if (!bankable) {
    reason = status === 'error' ? 'Session ended. Refresh to sign in again.' : 'Sign in to wager.';
  } else if (guest) {
    reason = 'Sign in to wager. Guests cannot stake Tickets.';
  } else if (knownBalance == null) {
    reason = 'Checking your Ticket balance.';
  } else if (knownBalance < STAKE) {
    reason = `You need 10 Tickets. You have ${knownBalance}.`;
  } else {
    enabled = true;
  }
  return {
    shown: true,
    enabled,
    reason,
    balance: knownBalance,
    stake: STAKE,
    pot: POT,
    guest: !!guest,
    mismatch: false,
  };
}

/** Matchmaker ticket for the fixed 10-Ticket queue. The stake is not a chosen amount. */
export function wagerMatchmakerRequest(fingerprint = CONTENT) {
  return {
    query: `+properties.game:${GAME_ID} +properties.mode:wager +properties.protocol:${PROTOCOL} +properties.sim:${SIM_VERSION} +properties.content:${fingerprint} +properties.stake:${STAKE}`,
    minCount: 2,
    maxCount: 2,
    stringProperties: {
      game: GAME_ID,
      mode: 'wager',
      protocol: String(PROTOCOL),
      sim: String(SIM_VERSION),
      content: fingerprint,
      stake: String(STAKE),
    },
  };
}

export function readMatchLabel(label) {
  if (!label) return null;
  if (typeof label === 'object') return label;
  try {
    const body = JSON.parse(label);
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export function labelIsWager(label) {
  const body = readMatchLabel(label);
  return !!body && body.mode === 'wager' && Number(body.stake) === STAKE;
}

export function refusalText(err) {
  const code = String(err?.code || err?.message || '');
  if (code.includes('stakes_disabled')) return 'Wagers are off.';
  if (code.includes('wager_guest')) return 'Sign in to wager. Guests cannot stake Tickets.';
  if (code.includes('version_mismatch') || code === 'version') return 'This build is out of date. Refresh.';
  if (code.includes('insufficient')) return 'You need 10 Tickets.';
  if (code.includes('already_in_match')) return 'You are already in a match.';
  if (code.includes('already_queued')) return 'You are already queued.';
  if (code.includes('active_wager')) return 'You already have a Shooter wager open.';
  if (code.includes('offline') || code.includes('no_session')) return 'Offline. No Tickets were taken.';
  return 'The server refused the wager. No Tickets were taken.';
}

function serverReceipt(fields) {
  return {
    status: 'pending',
    net: null,
    balance: null,
    stake: STAKE,
    pot: POT,
    playerId: '',
    seat: null,
    matchId: null,
    outcome: '',
    reason: 'pending',
    winner: null,
    ...fields,
    source: 'server',
    fee: 0,
    minted: 0,
  };
}

/**
 * A closed server metrics read. Pending stays pending: a local winner is not a receipt.
 * Net is +10, −10, or 0. The balance is whatever the caller read from the wallet, or null.
 */
export function receiptFromMetrics({ metrics, seat, playerId, balance } = {}) {
  const id = playerId || '';
  const matchId = metrics?.matchId || null;
  if (!metrics || metrics.error) {
    return serverReceipt({ playerId: id, seat: seat ?? null, matchId, reason: 'pending' });
  }
  const replay = metrics.replay || {};
  const outcome = String(metrics.outcome || '');
  const reason = String(metrics.endReason || metrics.reason || outcome || 'pending');
  if (metrics.wagerClosed !== true || replay.status === 'pending' || !replay.status) {
    return serverReceipt({ playerId: id, seat: seat ?? null, matchId, outcome, reason: 'pending' });
  }
  const held = metrics.stakes === true || Number(metrics.stake) === STAKE;
  const winner = metrics.winner;
  const seatKnown = seat === 0 || seat === 1;
  const payable = held && replay.verified === true && PAY_OUTCOMES.has(outcome) && (winner === 0 || winner === 1);
  if (payable && !seatKnown) {
    return serverReceipt({ playerId: id, seat: seat ?? null, matchId, outcome, reason: 'pending' });
  }
  if (payable) {
    return serverReceipt({
      status: 'settled',
      net: winner === seat ? WIN_NET : LOSE_NET,
      balance: finite(balance),
      playerId: id,
      seat,
      matchId,
      outcome,
      reason,
      winner,
    });
  }
  return serverReceipt({
    status: 'refunded',
    net: 0,
    balance: finite(balance),
    stake: held ? STAKE : 0,
    pot: held ? POT : 0,
    playerId: id,
    seat: seat ?? null,
    matchId,
    outcome,
    reason,
    winner: null,
  });
}

export function commitReceipt(store, playerId, receipt) {
  if (!store || !playerId || !receipt || receipt.source !== 'server' || receipt.playerId !== playerId) return null;
  if (receipt.status !== 'pending' && receipt.status !== 'settled' && receipt.status !== 'refunded') return null;
  if (receipt.minted !== 0 || receipt.fee !== 0) return null;
  if (receipt.status === 'settled' && receipt.net !== WIN_NET && receipt.net !== LOSE_NET) return null;
  if (receipt.status === 'refunded' && receipt.net !== 0) return null;
  if (receipt.status === 'pending' && receipt.net != null) return null;
  store.save(playerId, receipt);
  return receipt;
}

export function memoryReceiptStore() {
  let row = null;
  return {
    save(playerId, receipt) { row = { playerId, receipt }; },
    load(playerId) { return row && row.playerId === playerId ? row.receipt : null; },
    clear() { row = null; },
  };
}

export function browserReceiptStore(storage) {
  const box = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
  return {
    save(playerId, receipt) {
      if (!box) return;
      try { box.setItem(RECEIPT_KEY, JSON.stringify({ playerId, receipt })); } catch { /* private mode */ }
    },
    load(playerId) {
      if (!box) return null;
      try {
        const raw = box.getItem(RECEIPT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.playerId !== playerId || !parsed.receipt || parsed.receipt.source !== 'server') return null;
        if (parsed.receipt.playerId !== playerId) return null;
        return parsed.receipt;
      } catch {
        return null;
      }
    },
    clear() {
      if (!box) return;
      try { box.removeItem(RECEIPT_KEY); } catch { /* ignore */ }
    },
  };
}

function blankView(playerId = '') {
  return {
    phase: 'offer',
    offer: offerFromServer({}),
    receipt: null,
    ticket: null,
    matchId: null,
    seat: null,
    readied: false,
    busy: false,
    notice: '',
    playerId,
    rematchArmed: false,
    leaveArmed: false,
    liveBalance: null,
  };
}

function netAttr(receipt) {
  if (!receipt || receipt.status === 'pending' || receipt.net == null) return '';
  if (receipt.net > 0) return `+${receipt.net}`;
  return String(receipt.net);
}

function netText(receipt) {
  if (!receipt || receipt.status === 'pending' || receipt.net == null) return 'Net pending';
  if (receipt.net > 0) return `Net +${receipt.net}`;
  if (receipt.net < 0) return `Net −${Math.abs(receipt.net)}`;
  return 'Net 0';
}

function netClass(receipt) {
  if (!receipt || receipt.status === 'pending' || receipt.net == null) return 'pending';
  if (receipt.net > 0) return 'plus';
  if (receipt.net < 0) return 'minus';
  return 'zero';
}

export function renderWagerScreen(view) {
  const offer = view?.offer || offerFromServer({});
  const receipt = view?.receipt || null;
  const phase = view?.phase || 'offer';
  const balance = receipt && receipt.balance != null ? receipt.balance : offer.balance;
  const balanceText = balance == null ? '…' : String(balance);
  const flag = offer.shown ? 'on' : 'off';
  const stakeHidden = offer.shown ? '' : ' hidden';
  const stakeDisabled = offer.enabled ? '' : ' disabled';
  const reason = offer.reason ? `<p data-wager-reason>${escapeHtml(offer.reason)}</p>` : '';
  const notice = view?.notice ? `<p data-wager-notice>${escapeHtml(view.notice)}</p>` : '';
  const money = `<p class="wager-money" data-wager-money>10 each · pot 20 · winner nets +10 · loser nets −10 · no fee</p>`;
  const rule = `<p class="rule" data-wager-rule>${escapeHtml(RULE_TEXT)}</p>`;
  const bal = `<p class="wager-balance" data-wager-balance="${balance == null ? '' : String(balance)}">Tickets <b>${escapeHtml(balanceText)}</b></p>`;
  const net = receipt
    ? `<p class="wager-net ${netClass(receipt)}" data-wager-net="${netAttr(receipt)}">${netText(receipt)}</p>`
    : '';
  let actions = '';
  if (phase === 'confirm') {
    actions = `<button class="btn big" data-wager-action="queue">Stake 10 and queue</button>
      <button class="btn big alt" data-wager-action="free">Play free</button>
      <button class="btn alt" data-wager-action="back">← Back</button>`;
  } else if (phase === 'queued') {
    actions = `<p data-wager-waiting>Waiting for the other player to stake 10. One confirmation does not start a match.</p>
      <button class="btn alt" data-wager-action="cancel">Leave queue</button>`;
  } else if (phase === 'pending') {
    actions = `<p data-wager-pending>Pending server verification. This screen will not mark a payout until the server closes the wager.</p>
      <button class="btn alt" data-wager-action="back">← Back</button>`;
  } else if (phase === 'receipt') {
    actions = `<button class="btn big" data-wager-action="rematch"${stakeDisabled}${stakeHidden}>Play for 10 Tickets again</button>
      <button class="btn big alt" data-wager-action="free">Play free</button>
      <button class="btn alt" data-wager-action="back">← Back</button>`;
  } else if (phase === 'left') {
    actions = `<button class="btn big alt" data-wager-action="free">Play free</button>
      <button class="btn alt" data-wager-action="back">← Back</button>`;
  } else {
    actions = `<button class="btn big" data-wager-action="confirm" data-wager-play-stake${stakeDisabled}${stakeHidden}>Play for 10 Tickets</button>
      <button class="btn big alt" data-wager-action="free">Play free</button>
      <button class="btn alt" data-wager-action="back">← Back</button>`;
  }
  return `<section class="title wager-panel" data-wager-root data-wager-phase="${escapeHtml(phase)}" data-wager-flag="${flag}" data-wager-status="${escapeHtml(receipt?.status || '')}">
    <h1>1v1 <span>TICKETS</span></h1>
    ${money}${bal}${reason}${net}${notice}${rule}
    <div class="menu">${actions}</div>
  </section>`;
}

/** Title-menu stake button. Empty whenever the server flag is not on. */
export function wagerSlotHtml(view) {
  const offer = view?.offer;
  if (!offer?.shown) return '';
  const disabled = offer.enabled ? '' : ' disabled';
  const have = offer.balance == null ? '' : ` · you have ${offer.balance}`;
  const detail = offer.enabled ? `10 each · pot 20 · net +10 or −10${have}` : escapeHtml(offer.reason);
  let recall = '';
  const receipt = view.receipt;
  if (receipt?.status === 'pending') recall = '<small data-wager-recall>Receipt pending on the server</small>';
  else if (receipt && receipt.net != null) {
    const shown = receipt.net > 0 ? `+${receipt.net}` : String(receipt.net);
    recall = `<small data-wager-recall>Last receipt net ${escapeHtml(shown)}</small>`;
  }
  return `<button class="btn big" data-go="wager" data-wager-action="confirm" data-wager-play-stake${disabled}>Play for 10 Tickets <small>${detail}</small></button>${recall}`;
}

export function bindWagerScreen(root, flow, hooks = {}) {
  root.onclick = async (event) => {
    const button = event.target.closest('[data-wager-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.wagerAction;
    if (action === 'free') { await hooks.onFree?.(); return; }
    if (action === 'back') { await hooks.onBack?.(); return; }
    if (action === 'leave') { await hooks.onLeave?.(); return; }
    if (action === 'confirm') await flow.confirmStake();
    else if (action === 'queue') await flow.queueStake();
    else if (action === 'cancel') await flow.cancelQueue();
    else if (action === 'rematch') await flow.rematch();
    if (hooks.repaint) hooks.repaint();
    else root.innerHTML = renderWagerScreen(flow.view);
  };
}

/**
 * Queue, consent, and receipt. `rpc` is the only network write, and it is allowlisted.
 * `balance` must be the hub wallet read. A local number is not a payout.
 */
export function createWagerFlow(deps = {}) {
  const store = deps.store || memoryReceiptStore();
  let view = blankView();
  let matchedBound = false;
  const listeners = new Set();

  function touch() {
    for (const fn of listeners) fn(view);
  }

  function session() {
    return deps.session ? deps.session() : { status: 'offline', bankable: false, playerId: '', guest: false };
  }

  async function call(id, body) {
    assertWagerRpc(id);
    if (typeof deps.rpc !== 'function') {
      const err = new Error('offline');
      err.code = 'offline';
      throw err;
    }
    return deps.rpc(id, body ?? {});
  }

  function ensureMatched() {
    if (matchedBound || typeof deps.listenMatched !== 'function') return;
    matchedBound = true;
    deps.listenMatched((info) => { onMatched(info); });
  }

  async function refresh() {
    const who = session();
    if (view.playerId && who.playerId && view.playerId !== who.playerId) view = blankView(who.playerId);
    view.playerId = who.playerId || view.playerId || '';
    let version = null;
    if (who.bankable) {
      try {
        version = await call(WAGER_RPC.version, {});
      } catch (err) {
        const code = String(err?.code || err?.message || '');
        version = code.includes('version') ? { error: 'version_mismatch', wagerEnabled: false } : null;
      }
    }
    let bal = null;
    if (version && version.wagerEnabled === true && who.bankable && typeof deps.balance === 'function') {
      try { bal = await deps.balance(); } catch { bal = null; }
    }
    view.offer = offerFromServer({ version, session: who, balance: bal });
    if (!view.offer.shown && (view.phase === 'offer' || view.phase === 'confirm')) view.phase = 'offer';
    if (!who.bankable || who.status === 'error') {
      if (view.ticket && typeof deps.removeMatchmaker === 'function') {
        try { await deps.removeMatchmaker(view.ticket); } catch { /* drop the local ticket anyway */ }
      }
      view.ticket = null;
      if (view.phase === 'queued' || view.phase === 'confirm') {
        view.phase = 'offer';
        view.notice = view.offer.reason || 'Session ended. Refresh to sign in again.';
      }
    }
    touch();
    return view;
  }

  function recallReceipt() {
    const who = session();
    const playerId = who.playerId || '';
    if (view.playerId && playerId && view.playerId !== playerId) view = blankView(playerId);
    if (!playerId) return null;
    view.playerId = playerId;
    const saved = store.load(playerId);
    if (saved && saved.source === 'server' && saved.playerId === playerId) {
      view.receipt = saved;
      view.matchId = saved.matchId || view.matchId;
      view.seat = saved.seat ?? view.seat;
      view.phase = saved.status === 'pending' ? 'pending' : 'receipt';
    }
    touch();
    return view.receipt;
  }

  async function confirmStake() {
    if (view.busy) return view;
    if (view.receipt && view.receipt.status === 'pending') {
      view.phase = 'pending';
      view.notice = 'A result is still pending on the server. A new stake waits until that receipt closes.';
      touch();
      return view;
    }
    await refresh();
    if (!view.offer.enabled) {
      view.notice = view.offer.reason || 'Wagers are off.';
      view.phase = 'offer';
      touch();
      return view;
    }
    view.phase = 'confirm';
    view.rematchArmed = false;
    view.notice = 'Staking is separate from free play. The server holds 10 Tickets from each seat only after both click Ready.';
    touch();
    return view;
  }

  async function queueStake() {
    if (view.busy || view.ticket) return view;
    if (view.phase !== 'confirm') return view;
    view.busy = true;
    touch();
    try {
      await refresh();
      if (view.phase !== 'confirm' || !view.offer.enabled) {
        view.phase = 'offer';
        view.notice = view.offer.reason || 'Wagers are off.';
        return view;
      }
      ensureMatched();
      const added = await deps.addMatchmaker(wagerMatchmakerRequest());
      view.ticket = added && added.ticket ? added.ticket : 'queued';
      view.phase = 'queued';
      view.notice = 'Waiting for one opponent to stake 10. Nothing is held until both are Ready.';
    } catch (err) {
      view.notice = refusalText(err);
      view.phase = 'offer';
      view.ticket = null;
      if (String(err?.code || err?.message || '').includes('stakes_disabled')) {
        view.offer = { ...view.offer, shown: false, enabled: false, reason: view.notice };
      }
    } finally {
      view.busy = false;
      touch();
    }
    return view;
  }

  async function cancelQueue() {
    const ticket = view.ticket;
    view.ticket = null;
    if (ticket && typeof deps.removeMatchmaker === 'function') {
      try { await deps.removeMatchmaker(ticket); } catch { /* the local queue is already clear */ }
    }
    try { await call(WAGER_RPC.queueCancel, {}); } catch { /* cancelling does not refund */ }
    view.phase = 'offer';
    view.notice = 'Left the queue. No Tickets were taken.';
    touch();
    return view;
  }

  async function onMatched(info) {
    if (view.phase !== 'queued' || !view.ticket) return view;
    if (!info || (!info.matchId && !info.token)) return view;
    view.matchId = info.matchId || view.matchId;
    view.notice = 'Opponent found. Joining the server match.';
    touch();
    if (typeof deps.onMatched === 'function') await deps.onMatched(info);
    return view;
  }

  function noteNotEscrowed() {
    view.phase = 'offer';
    view.ticket = null;
    view.matchId = null;
    view.readied = false;
    view.notice = 'The server did not escrow this match. No Tickets were taken.';
    touch();
    return view;
  }

  function noteSeat(seat) {
    if (seat === 0 || seat === 1) view.seat = seat;
    touch();
    return view;
  }

  function noteReady() {
    view.readied = true;
    view.notice = 'Ready sent. The server holds 10 from each seat only after both are Ready.';
    touch();
    return view;
  }

  async function noteLive() {
    view.phase = 'live';
    view.readied = true;
    if (typeof deps.balance === 'function') {
      try {
        const bal = await deps.balance();
        view.liveBalance = finite(bal);
      } catch { view.liveBalance = null; }
    }
    view.notice = view.liveBalance == null
      ? 'Match is live. The pot is paid only after the server verifies the result.'
      : `Match is live. Tickets now ${view.liveBalance}. The pot is paid only after the server verifies the result.`;
    touch();
    return view;
  }

  function noteLocalResult(_result) {
    if (!view.matchId || !view.playerId) {
      view.notice = 'No server match. Nothing was paid.';
      touch();
      return view;
    }
    const receipt = serverReceipt({
      playerId: view.playerId,
      seat: view.seat,
      matchId: view.matchId,
      reason: 'pending',
    });
    view.receipt = commitReceipt(store, view.playerId, receipt) || receipt;
    view.phase = 'pending';
    view.notice = 'Match result is in. Ticket settlement is still pending on the server.';
    touch();
    return view;
  }

  async function ingestMetrics(metrics, seat) {
    if (seat === 0 || seat === 1) view.seat = seat;
    const who = session();
    const playerId = who.playerId || view.playerId;
    let draft = receiptFromMetrics({
      metrics: metrics ? { ...metrics, matchId: metrics.matchId || view.matchId } : metrics,
      seat: view.seat,
      playerId,
      balance: null,
    });
    if (draft.status !== 'pending' && typeof deps.balance === 'function') {
      try {
        const bal = await deps.balance();
        draft = serverReceipt({ ...draft, balance: finite(bal) });
      } catch { /* keep the receipt, leave the wallet blank */ }
    }
    const saved = commitReceipt(store, playerId, draft);
    view.playerId = playerId;
    view.receipt = saved || draft;
    view.phase = draft.status === 'pending' ? 'pending' : 'receipt';
    view.readied = false;
    view.leaveArmed = false;
    if (draft.status === 'pending') view.notice = 'Pending server verification. Nothing has been paid on this screen.';
    else if (draft.status === 'settled') view.notice = 'The server closed the wager. The balance is the wallet read after that close.';
    else view.notice = 'The server did not pay a winner. Net 0.';
    touch();
    return view;
  }

  async function resumeServer() {
    try {
      const resumed = await call(WAGER_RPC.resume, {});
      if (!resumed || !resumed.matchId) return view;
      view.matchId = resumed.matchId;
      const metrics = await call(WAGER_RPC.metrics, { matchId: resumed.matchId });
      const body = metrics && typeof metrics === 'object' ? { ...metrics, matchId: metrics.matchId || resumed.matchId } : metrics;
      await ingestMetrics(body, view.seat);
    } catch {
      view.notice = 'Still waiting on the server. The saved receipt was not changed.';
      touch();
    }
    return view;
  }

  async function rematch() {
    if (!view.receipt || view.receipt.status === 'pending') return view;
    if (view.busy) return view;
    await refresh();
    if (!view.offer.enabled) {
      view.notice = view.offer.reason || 'Wagers are off.';
      touch();
      return view;
    }
    view.phase = 'confirm';
    view.rematchArmed = true;
    view.ticket = null;
    view.notice = 'Both players have to stake 10 again. This confirmation only brings you back to the stake screen.';
    touch();
    return view;
  }

  function needsLeaveWarning() {
    return view.phase === 'live' || view.readied === true;
  }

  function armLeave() {
    if (!needsLeaveWarning() || view.leaveArmed) return false;
    view.leaveArmed = true;
    view.notice = 'Leaving a live wager can forfeit after 10 seconds with no input. This client will not refund.';
    touch();
    return true;
  }

  async function abandon() {
    const wasLive = view.phase === 'live' || view.readied === true || view.phase === 'pending';
    const ticket = view.ticket;
    view.ticket = null;
    view.readied = false;
    view.leaveArmed = false;
    if (ticket && typeof deps.removeMatchmaker === 'function') {
      try { await deps.removeMatchmaker(ticket); } catch { /* still leave the match */ }
    }
    try { await call(WAGER_RPC.queueCancel, {}); } catch { /* no refund */ }
    if (typeof deps.leaveMatch === 'function') {
      try { await deps.leaveMatch(); } catch { /* the socket may already be gone */ }
    }
    if (wasLive) {
      view.phase = 'left';
      view.notice = 'You left a live wager. If both players were Ready, the server may forfeit a seat that stays silent for 10 seconds. This client did not refund.';
    } else {
      view.phase = 'offer';
      view.notice = 'Left the queue. No Tickets were taken.';
    }
    touch();
    return view;
  }

  return {
    get view() { return view; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    refresh,
    recallReceipt,
    confirmStake,
    queueStake,
    cancelQueue,
    noteNotEscrowed,
    noteSeat,
    noteReady,
    noteLive,
    noteLocalResult,
    ingestMetrics,
    resumeServer,
    rematch,
    needsLeaveWarning,
    armLeave,
    abandon,
  };
}
