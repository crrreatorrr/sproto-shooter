import { createRewardRecorder } from './recorder.js';
import { mergeProgress } from './clientProtocol.js';
import { finiteLimit, recorderError } from './storage.js';

// Dormant safety bounds, not service cadence/capacity recommendations.
export const TRANSPORT_LIMITS = Object.freeze({ maxCalls: 65536, maxBatchCalls: 16, maxPolls: 540,
  baseDelayMs: 250, maxDelayMs: 30000, pollDelayMs: 5000, maxOfflineMs: 30000 });
const CONTRACT_ERRORS = ['client_contract_error', 'receipt_conflict', 'response_oversized', 'unprepared_batch', 'malformed_data',
  'malformed_frame', 'storage_quota', 'buffer_pressure', 'run_limit', 'tick_discontinuity'];
const IDENTITY_ERRORS = ['identity_changed', 'transport_suspended'];

/** Inactive controller core. Explicit start/pump only; no Game/UI wiring. One
 * bounded background request/task/timer, immutable retry, separate progress.
 * The provided transport capability is private to this controller instance.
 */
export function createCampaignController({ enabled = false, transport, uploadDeadlineMs,
  recorderOptions = {}, limits = {}, now = Date.now, random = Math.random,
  setTimer = setTimeout, clearTimer = clearTimeout, onState = null } = {}) {
  if (enabled !== true) throw recorderError('controller_disabled');
  if (!transport?.owner || !Number.isSafeInteger(uploadDeadlineMs) || typeof now !== 'function'
    || typeof random !== 'function' || (onState !== null && typeof onState !== 'function')) throw recorderError('invalid_controller');
  const owner = transport.owner;
  const cap = Object.freeze(Object.fromEntries(Object.entries(TRANSPORT_LIMITS)
    .map(([key, value]) => [key, finiteLimit(limits[key] ?? value, value)])));
  const recorder = createRewardRecorder({ ...recorderOptions, enabled: true, ...owner, acceptReceipt: transport.acceptReceipt });
  let accepted = Object.freeze({ sequence: -1, tick: 0 });
  let progress = null, current = null, busy = false, timer = null, running = false, paused = false, epoch = 0;
  let calls = 0, polls = 0, nextAt = 0, nextPollAt = 0, offlineSince = null;
  let recordingStopped = null, writesStopped = null, problem = null, callbackFailed = false, tail = false;
  function time() { const value = now(); if (!Number.isSafeInteger(value) || value < 0) throw recorderError('invalid_clock'); return value; }
  function haltWrites(reason) { writesStopped ||= reason; recordingStopped ||= reason; recorder.suspend(); }
  function pause(reason) { paused = true; problem = reason; haltWrites(reason); if (timer !== null) clearTimer(timer); timer = null; }
  function deadline() { if (time() >= uploadDeadlineMs) haltWrites('upload_expired'); }
  function state() {
    return Object.freeze({ owner, accepted, progress, busy, running, paused, calls, polls, nextAt, offlineSince,
      recordingStopped, writesStopped, problem, callbackFailed,
      currentSequence: current?.prepared.body.sequence ?? null, batchCalls: current?.calls ?? 0,
      recorder: recorder.status() });
  }
  function notify() { if (onState) { try { onState(state()); } catch { callbackFailed = true; } } }
  function budget(isPoll) {
    if (calls >= cap.maxCalls || (isPoll && polls >= cap.maxPolls) || (current && current.calls >= cap.maxBatchCalls)) {
      pause('retry_budget_exhausted'); return false;
    }
    calls++; if (isPoll) polls++; if (current) current.calls++;
    return true;
  }
  function delay(serverMinimum = 0) {
    const attempt = Math.min(current?.calls || 1, 16);
    const exponential = Math.min(cap.maxDelayMs, cap.baseDelayMs * 2 ** (attempt - 1));
    const jitter = random();
    if (!Number.isFinite(jitter) || jitter < 0 || jitter > 1) { pause('invalid_random'); return; }
    if (serverMinimum > cap.maxDelayMs) { pause('retry_delay_requires_attention'); return; }
    nextAt = time() + Math.max(serverMinimum, cap.baseDelayMs, Math.ceil(exponential * jitter));
  }
  function release(receipt) {
    recorder.acknowledge(receipt, owner);
    if (receipt.acceptedTick >= accepted.tick) accepted = Object.freeze({ sequence: receipt.acceptedSequence, tick: receipt.acceptedTick });
    current = null; offlineSince = null; nextAt = 0;
  }
  function snapshot(value) {
    progress = mergeProgress(progress, value);
    if (progress.received.tick >= accepted.tick) accepted = Object.freeze({ sequence: progress.received.sequence, tick: progress.received.tick });
    // A received cursor alone is not a receipt and cannot delete history.
    if (value.received.tick > recorder.status().totalFrames) haltWrites('local_history_missing');
    if (value.authorization !== 'live') haltWrites(value.authorization);
    if (value.state !== 'open') haltWrites(`server_${value.state}`);
    if (value.operational?.supportRequired) haltWrites('pending_support');
    if (value.terminal) haltWrites('terminal_verified');
    if (current && value.receivedAck) release(value.receivedAck);
  }
  function failure(value) {
    problem = value.reason;
    if (value.state === 'authorization_denied') { haltWrites(value.reason); if (current) current.needsStatus = true; delay(value.retryAfterMs); }
    else if (value.state === 'invalid') pause(`server_invalid_${value.reason}`);
    else delay(value.retryAfterMs);
  }
  function schedule() {
    if (!running || paused || busy || timer !== null) return;
    const wait = Math.max(cap.baseDelayMs, nextAt - time());
    timer = setTimer(() => { timer = null; void pump(); }, wait);
  }
  async function pump({ poll = false } = {}) {
    if (busy || paused) return state();
    busy = true; const generation = epoch;
    try {
      deadline();
      if (offlineSince !== null && time() - offlineSince >= cap.maxOfflineMs) haltWrites('offline_budget_exhausted');
      if (time() < nextAt) return state();
      if (!current && !writesStopped) {
        let batch = recorder.pending(owner)[0];
        if (!batch) batch = recorder.finalizeNext({ tail });
        if (batch) {
          const prepared = await transport.prepare(batch);
          if (generation !== epoch) return state();
          current = { prepared, calls: 0, needsStatus: false };
        }
      }
      if (current) {
        const recovering = current.needsStatus || !!writesStopped;
        if (!budget(recovering)) return state();
        const response = recovering ? await transport.status(current.prepared) : await transport.append(current.prepared);
        if (generation !== epoch) return state();
        offlineSince = null;
        if (response.state === 'received') release(response);
        else if ('received' in response) {
          snapshot(response);
          if (current) { current.needsStatus = false; delay(); }
        } else failure(response);
      } else if ((poll || time() >= nextPollAt) && budget(true)) {
        const response = await transport.status();
        if (generation !== epoch) return state();
        offlineSince = null; nextPollAt = time() + cap.pollDelayMs;
        if ('received' in response) snapshot(response); else failure(response);
      }
    } catch (error) {
      if (generation !== epoch) return state();
      if (CONTRACT_ERRORS.includes(error?.code)) pause(error.code);
      else if (IDENTITY_ERRORS.includes(error?.code)) pause('identity_changed');
      else {
        problem = 'transport_unknown'; offlineSince ??= time();
        if (current) current.needsStatus = true;
        delay();
      }
    } finally { busy = false; notify(); schedule(); }
    return state();
  }
  return Object.freeze({
    owner,
    // Same synchronous contract used by PR05. No upload/await/storage/hash here.
    record(frame, tick) {
      deadline();
      if (offlineSince !== null && time() - offlineSince >= cap.maxOfflineMs) haltWrites('offline_budget_exhausted');
      if (recordingStopped) throw recorderError(recordingStopped);
      try { transport.assertWriteBinding(); return recorder.record(frame, tick); }
      catch (error) {
        if (IDENTITY_ERRORS.includes(error?.code)) { epoch++; pause('identity_changed'); transport.suspend(); }
        else { recordingStopped = error?.code || 'recording_failed'; recorder.suspend(); }
        throw error;
      }
    },
    start() { if (!paused && !running) { running = true; schedule(); } },
    pump,
    flushTail() { tail = true; recordingStopped ||= 'local_end'; recorder.suspend(); },
    stop(reason = 'logout') { epoch++; running = false; pause(reason); transport.suspend(); },
    status: state,
    issue() { throw recorderError('issuance_unavailable'); },
    finish() { throw recorderError('finish_unavailable'); },
  });
}
