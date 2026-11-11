// Presentation only. Callers supply validated, owner-filtered controller status;
// this helper neither authenticates a response nor grants gameplay/payment rights.
// Results contain only bounded strings/booleans, never references to input graphs.
export const ELIGIBILITY_TEXT = Object.freeze([
  '20 Tickets per eligible boss clear, once per boss per start UTC day.',
  'Shared limits: 200 Tickets per original session and 1,000 per payment UTC day.',
  'Your original session must stay valid until verification and payment finish. Received or verified inputs do not reserve a payment.',
  'Keep this tab open. Unreceived inputs are held only in memory and cannot be restored after a reload.',
  'Human and bot play follow the same legal-input rules.',
]);

const SESSION_EXPIRED = ['session_expired'];
const SESSION_CLOSED = ['session_closed', 'revoked'];
const ACCOUNT_CHANGED = ['identity_changed', 'transport_suspended'];
const SIGN_IN = ['unauthorized', 'not_game_session'];
const UNSUPPORTED = ['unsupported_version', 'unsupported_protocol', 'unsupported_manifest', 'legacy_selected'];
const LIMITS = ['buffer_pressure', 'storage_quota', 'offline_budget_exhausted', 'run_limit',
  'retry_budget_exhausted', 'retry_delay_requires_attention'];
const CHECK_REQUIRED = ['client_contract_error', 'receipt_conflict', 'unconfirmed_receipt', 'response_oversized',
  'local_history_missing', 'tick_discontinuity', 'malformed_frame', 'malformed_data', 'recording_failed'];
const NETWORK = ['transport_unknown', 'transport_timeout', 'transport_cancelled'];
const SUPPORT = ['pending_support', 'attempts_exhausted', 'predecessor_mismatch'];
const WAIT = ['too_fast', 'rate_limited', 'capacity_unconfigured', 'active_run', 'issuance_day_changed'];
const safeTick = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 162000 ? value : null;

export function rewardPresentation({ phase = 'choose', controllerStatus = null, errorCode = null, active = false } = {}) {
  const c = controllerStatus;
  const progress = c?.progress;
  const payment = progress?.payment;
  const stopped = typeof c?.recordingStopped === 'string' && c.recordingStopped.length > 0 && c.recordingStopped !== 'local_end';
  const canContinueUnranked = active === true && (phase === 'paused' || phase === 'error' || stopped);
  const codes = [errorCode, c?.problem, c?.recordingStopped, c?.writesStopped,
    progress?.authorization, payment?.state === 'authorization_denied' ? payment.reason : null];
  const has = (known) => codes.some((code) => typeof code === 'string' && known.includes(code));
  const prefix = phase === 'unranked' ? 'Current play is unranked. ' : '';
  const view = (title, detail, kind = 'neutral', paid = false) => Object.freeze({
    title, detail: prefix + detail, kind, canContinueUnranked, paid,
  });
  const ackTick = safeTick(c?.accepted?.tick), receivedTick = safeTick(progress?.received?.tick);
  const received = ackTick === null ? receivedTick : receivedTick === null ? ackTick : Math.max(ackTick, receivedTick);
  const rawVerified = safeTick(progress?.verified?.tick);
  const verified = received !== null && rawVerified !== null && rawVerified <= received ? rawVerified : null;
  const countText = received !== null && received > 0
    ? verified !== null ? `Server received ${received} inputs; verified ${verified}.` : `Server received ${received} inputs.`
    : 'The server has not reported received input yet.';

  // A stable paid fact survives later expiry, connection loss or a withheld local
  // tail. Never derive paid from phase, local clear, received/verified or sealing.
  if (payment?.state === 'paid') {
    if (payment.tickets === 20) return view('20 Tickets paid', 'The server confirmed payment for the recorded run.', 'good', true);
    return view('Payment status needs checking', 'Payment details are unavailable here. Check this run’s server status.', 'warning');
  }
  if (payment?.state === 'ineligible') {
    if (payment.reason === 'already_paid') return view('No additional reward', 'This boss reward was already claimed for its start day. This run adds no payment.', 'neutral');
    return view('Not eligible for a reward', 'The server found that this run did not meet the reward rules. No Tickets were paid for it.', 'neutral');
  }
  if (has(SESSION_EXPIRED)) return view('Session expired', 'This run cannot receive a new payment. Earlier received inputs and any existing receipt can still be checked.', 'bad');
  if (has(SESSION_CLOSED)) return view('Session closed', 'This run cannot receive a new payment. Earlier received inputs and any existing receipt can still be checked.', 'bad');
  if (has(ACCOUNT_CHANGED)) return view('Original account required', 'This run stays with its original account and session. New play will not count toward it.', 'warning');
  if (has(SIGN_IN)) return view('Sign-in required', 'Check this run from its original account. No new payment has been confirmed here.', 'warning');
  if (payment?.state === 'authorization_denied') return view('Payment not authorized', 'The server has not authorized a new payment for this run. Check its status from the original account.', 'bad');
  if (progress?.state === 'invalid') return view('Run could not be verified', 'The server rejected this run’s input history. No payment is confirmed.', 'bad');
  if (progress?.operational?.supportRequired === true || has(SUPPORT)) {
    return view('Verification needs attention', 'Verification is pending. Keep this tab open to retain any unreceived inputs; no payment is confirmed.', 'warning');
  }
  if (has(UNSUPPORTED)) return view('Rewarded run unavailable', 'Rewarded mode is unavailable for this run. Casual play is still available.', 'warning');
  if (has(['start_not_authorized'])) return view('Run cannot start', 'The original session is not ready for a fresh rewarded run. Check its status or play casually.', 'warning');
  if (has(LIMITS)) return view(active ? 'Rewarded play paused' : 'Reward check pending', 'The recording or connection limit was reached. Pending input is retained; no payment is confirmed.', 'warning');
  if (has(CHECK_REQUIRED)) return view(active ? 'Rewarded play paused' : 'Reward check pending', 'This run cannot safely continue from this tab. Keep pending input and check the server status.', 'warning');
  if (payment?.state === 'pending' || payment?.state === 'pending_retryable') {
    if (payment.reason === 'cap_exhausted') return view('Reward pending', 'A reward limit currently blocks payment. Your original session must remain valid for any later payment.', 'warning');
    if (has(['upload_expired'])) return view('Reward pending', 'Input is closed. Received work may still be paid while the original session remains valid.', 'pending');
    return view('Reward pending', 'The server has not confirmed payment. Your original session must remain valid until payment finishes.', 'pending');
  }
  if (has(['upload_expired'])) return view('Input deadline reached', 'No more input can be sent. Received work may still be verified and paid while the original session remains valid.', 'warning');
  if (has(NETWORK) || c?.offlineSince !== null && c?.offlineSince !== undefined) {
    return view('Connection interrupted', 'Waiting to confirm what reached the server. Pending input is retained in this tab; no payment is confirmed.', 'warning');
  }
  if (has(WAIT)) return view('Waiting for the server', 'The server asked this run to wait. No payment is confirmed.', 'pending');
  if (phase === 'unranked') return view('Unranked play', 'Earlier received input can still be checked; new play will not count toward that reward.', 'neutral');
  if (phase === 'cancelled' || has(['user_cancelled'])) return view('Rewarded play stopped', 'Any received inputs can still be checked. Play will not resume as a rewarded run.', 'neutral');
  if (phase === 'starting') return view('Starting rewarded run', 'Waiting for server issuance and a live-session check. Rewarded gameplay has not started.', 'pending');
  if (phase === 'paused' || phase === 'error') return view('Rewarded play paused', 'Rewarded input has stopped. Check this run’s status before deciding whether to continue unranked.', 'warning');
  if (progress?.terminal || c?.sealAck || c?.finishRequested || phase === 'ended' || phase === 'pending') {
    if (received !== null && received > 0 && verified === received) return view('Inputs verified', `${countText} No payment is confirmed.`, 'pending');
    return view('Checking run', `${countText} Verification and reward outcome are still pending.`, 'pending');
  }
  if (received !== null && received > 0) {
    if (verified !== null && verified > 0) return view('Verifying run', `${countText} No payment is confirmed.`, 'pending');
    return view('Server received input', `${countText} Verification has not been reported yet.`, 'pending');
  }
  if (active === true || phase === 'playing') return view('Recording rewarded run', 'Inputs are being recorded. No payment is confirmed.', 'neutral');
  return view('Boss rewards', 'Choose a boss and review the reward rules before starting.', 'neutral');
}
