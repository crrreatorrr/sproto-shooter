import { expect, it } from 'vitest';
import { ELIGIBILITY_TEXT, rewardPresentation } from '../../src/hub/campaignRewards/presentation.js';

const pending = (extra = {}) => ({ accepted: { tick: 120 }, progress: {
  authorization: 'live', state: 'open', received: { tick: 120 }, verified: { tick: 60 },
  payment: { state: 'none', reason: null }, ...extra }, recordingStopped: null, writesStopped: null, problem: null });
const paid = () => pending({ payment: { state: 'paid', tickets: 20 }, terminal: { outcome: 'clear', tick: 120 } });

it('discloses the fixed reward, separate day clocks, shared caps and live-original-session condition before start', () => {
  expect(Object.isFrozen(ELIGIBILITY_TEXT)).toBe(true);
  expect(ELIGIBILITY_TEXT.every((line) => typeof line === 'string')).toBe(true);
  const text = ELIGIBILITY_TEXT.join(' ');
  expect(text).toContain('20 Tickets');
  expect(text).toContain('start UTC day');
  expect(text).toContain('200 Tickets per original session');
  expect(text).toContain('1,000 per payment UTC day');
  expect(text).toContain('must stay valid until verification and payment finish');
  expect(text).toContain('cannot be restored after a reload');
  expect(text).toContain('Human and bot play');
});

it('only an authoritative paid20 projection labels a payment, surviving expiry and local withheld-tail pressure', () => {
  const status = paid();
  status.progress.authorization = 'session_expired';
  status.problem = 'buffer_pressure'; status.withheldTail = true; status.recordingStopped = 'buffer_pressure';
  const result = rewardPresentation({ phase: 'paused', active: true, controllerStatus: status });
  expect(result).toMatchObject({ title: '20 Tickets paid', paid: true, kind: 'good', canContinueUnranked: true });
  expect(result.detail).toContain('server confirmed payment');
});

it.each([
  { phase: 'paid' }, { phase: 'ended' },
  { controllerStatus: { paid: true, accepted: { tick: 120 } } },
  { controllerStatus: pending({ terminal: { outcome: 'clear' } }) },
  { controllerStatus: { ...pending(), sealAck: { state: 'sealed' }, finishRequested: true } },
  { controllerStatus: pending({ verified: { tick: 120 } }) },
  { controllerStatus: pending({ payment: { state: 'pending', tickets: 20 } }) },
])('never promotes local clear, sealing, transport success or verification into payment: %j', (options) => {
  const result = rewardPresentation(options);
  expect(result.paid).toBe(false);
  expect(result.title).not.toBe('20 Tickets paid');
  expect(result.detail).not.toContain('confirmed payment for');
});

it.each([0, 19, 21, NaN, Infinity, '20'])('does not display malformed paid amount %s as a valid payment', (tickets) => {
  const result = rewardPresentation({ controllerStatus: pending({ payment: { state: 'paid', tickets } }) });
  expect(result).toMatchObject({ paid: false, kind: 'warning', title: 'Payment status needs checking' });
});

it('distinguishes input deadline closure from original-session expiry, and does not mask a real denial with upload closure', () => {
  const inputClosed = rewardPresentation({ controllerStatus: pending({ authorization: 'upload_expired' }) });
  expect(inputClosed).toMatchObject({ title: 'Input deadline reached', paid: false });
  expect(inputClosed.detail).toContain('may still be verified and paid');
  expect(inputClosed.detail).toContain('original session remains valid');
  const denied = rewardPresentation({ errorCode: 'upload_expired', controllerStatus: pending({
    authorization: 'session_expired', payment: { state: 'authorization_denied', reason: 'session_expired' },
  }) });
  expect(denied.title).toBe('Session expired');
  expect(denied.detail).toContain('cannot receive a new payment');
  const queued = rewardPresentation({ controllerStatus: pending({ authorization: 'upload_expired', payment: { state: 'pending' } }) });
  expect(queued.title).toBe('Reward pending');
  expect(queued.detail).toContain('Received work may still be paid');
});

it('keeps ineligible, cap-pending, verification support and malformed input history distinct', () => {
  expect(rewardPresentation({ controllerStatus: pending({ payment: { state: 'ineligible', reason: 'already_paid' } }) }).title).toBe('No additional reward');
  expect(rewardPresentation({ controllerStatus: pending({ authorization: 'session_expired', payment: { state: 'ineligible', reason: 'ineligible' } }) }).title).toBe('Not eligible for a reward');
  expect(rewardPresentation({ controllerStatus: pending({ payment: { state: 'authorization_denied', reason: 'unknown_denial' } }) }).title).toBe('Payment not authorized');
  expect(rewardPresentation({ controllerStatus: pending({ payment: { state: 'pending', reason: 'cap_exhausted' } }) })).toMatchObject({ title: 'Reward pending', paid: false });
  expect(rewardPresentation({ controllerStatus: pending({ operational: { supportRequired: true } }) }).title).toBe('Verification needs attention');
  expect(rewardPresentation({ controllerStatus: pending({ state: 'invalid' }) }).title).toBe('Run could not be verified');
});

it('uses the strongest independently received cursor and only bounded coherent counters', () => {
  const status = pending(); status.accepted.tick = 180;
  expect(rewardPresentation({ controllerStatus: status }).detail).toContain('received 180 inputs; verified 60');
  const incoherent = pending({ received: { tick: -1 }, verified: { tick: Infinity } });
  incoherent.accepted.tick = Number.MAX_SAFE_INTEGER;
  const result = rewardPresentation({ phase: 'ended', controllerStatus: incoherent });
  expect(result.detail).not.toMatch(/Infinity|NaN|9007199254740991|-1/);
  expect(result.paid).toBe(false);
});

it.each(['buffer_pressure', 'offline_budget_exhausted', 'storage_quota', 'retry_budget_exhausted'])('offers deliberate unranked continuation only for an active stopped context (%s)', (code) => {
  const stopped = { ...pending(), recordingStopped: code, problem: code };
  expect(rewardPresentation({ phase: 'playing', active: true, controllerStatus: stopped })).toMatchObject({
    title: 'Rewarded play paused', canContinueUnranked: true, paid: false,
  });
  expect(rewardPresentation({ phase: 'paused', active: false, controllerStatus: stopped }).canContinueUnranked).toBe(false);
});

it('does not invite unranked continuation for normal final-tail stop or inactive start error', () => {
  expect(rewardPresentation({ phase: 'ended', active: true, controllerStatus: { ...pending(), recordingStopped: 'local_end' } }).canContinueUnranked).toBe(false);
  expect(rewardPresentation({ phase: 'error', active: false, errorCode: 'not_game_session' })).toMatchObject({ title: 'Sign-in required', canContinueUnranked: false });
  expect(rewardPresentation({ phase: 'paused', active: true, controllerStatus: pending() }).canContinueUnranked).toBe(true);
});

it.each([
  ['identity_changed', 'Original account required'], ['not_game_session', 'Sign-in required'],
  ['unsupported_version', 'Rewarded run unavailable'], ['start_not_authorized', 'Run cannot start'],
  ['user_cancelled', 'Rewarded play stopped'], ['transport_timeout', 'Connection interrupted'],
])('maps typed error %s to a fixed human label', (errorCode, title) => {
  expect(rewardPresentation({ phase: 'error', errorCode }).title).toBe(title);
});

it('returns frozen bounded primitives, never interpolating unknown code or retaining arbitrary input graphs', () => {
  const hostile = '<img src=x onerror=secret()>'.repeat(1000);
  const input = { phase: 'error', errorCode: hostile, active: true, controllerStatus: { payload: new Array(1000).fill({ secret: hostile }) } };
  const result = rewardPresentation(input);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.keys(result)).toEqual(['title', 'detail', 'kind', 'canContinueUnranked', 'paid']);
  expect(result.title.length).toBeLessThan(80); expect(result.detail.length).toBeLessThan(300);
  expect(Object.values(result).every((value) => typeof value === 'string' || typeof value === 'boolean')).toBe(true);
  expect(JSON.stringify(result)).not.toContain('secret');
  expect(rewardPresentation({ phase: 'unranked', controllerStatus: paid() })).toMatchObject({ paid: true });
  expect(rewardPresentation({ phase: 'unranked', controllerStatus: paid() }).detail).toContain('Current play is unranked');
});
