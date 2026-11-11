import { decodeFrames } from '../../server/protocol.js';
import { createMemoryBatchStorage, finiteLimit, frozenData, identity, recorderError } from './storage.js';

export const RUN_LIMITS = Object.freeze({ maxInputBytes: 64 * 1024 * 1024, maxFrames: 162000,
  maxBatches: 4096, maxActions: 131072 });
export const BUFFER_LIMITS = Object.freeze({ batchFrames: 120, maxFrames: 3600, maxBatches: 64,
  maxActions: 3600, maxReservedBytes: 4 * 1024 * 1024 });
// Accounting reservations, not measured JS heap sizes or capacity promises.
// A retained frame reserves 512 bytes, an action 128, and each batch 1024.
// They cover references/array slots, frame strings, finalized string copies and
// bounded temporary encoding/decode work. Explicit object counts remain capped.
const FRAME_RESERVE = 512, ACTION_RESERVE = 128, BATCH_RESERVE = 1024;
const reservation = (n, actions, batches) => n * FRAME_RESERVE + actions * ACTION_RESERVE + batches * BATCH_RESERVE;

/** Opt-in capability only; no instance is created by Game/UI. No network,
 * persistence, issuance, scheduler or SDK calls. record is the synchronous Game
 * recorder adapter. Call finalizeNext from background work, outside Game.step.
 */
export function createRewardRecorder({ enabled = false, accountId, runId, bufferLimits = {},
  runLimits = {}, storageLimits = {}, acceptReceipt = null } = {}) {
  if (enabled !== true) throw recorderError('recorder_disabled');
  const owner = identity(accountId, runId);
  const cap = Object.freeze(Object.fromEntries(Object.entries(BUFFER_LIMITS)
    .map(([key, value]) => [key, finiteLimit(bufferLimits[key] ?? value, value)])));
  const runCap = Object.freeze(Object.fromEntries(Object.entries(RUN_LIMITS)
    .map(([key, value]) => [key, finiteLimit(runLimits[key] ?? value, value)])));
  const storage = createMemoryBatchStorage({ ...owner, limits: storageLimits, acceptReceipt });
  let failure = null, suspended = false, active = null, nextSequence = 0;
  const queued = [];
  let totalFrames = 0, totalActions = 0, totalInputBytes = 0;
  let retainedFrames = 0, retainedActions = 0, retainedBatches = 0;
  function fail(error) { failure ||= error; throw failure; }
  function available() { if (failure) throw failure; if (suspended) fail(recorderError('recorder_suspended')); }
  function seal() { if (active) { queued.push(active); active = null; } }
  return Object.freeze({
    owner,
    record(frame, tick) {
      available();
      try {
        // One fixed frame and at most one fixed action: no whole-batch walk,
        // serialization, storage write, promise, await or network in this path.
        const n = frozenData(frame, 'n'), text = frozenData(frame, 'frames');
        const rows = frozenData(frame, 'actions');
        if (n !== 1 || typeof text !== 'string' || !/^[A-Za-z0-9+/]{16}$/.test(text)
          || !Array.isArray(rows)) throw recorderError('malformed_frame');
        const actions = frozenData(rows, 'length');
        if (actions > 1) throw recorderError('malformed_frame');
        if (actions === 1) {
          const row = frozenData(rows, '0');
          if (!Array.isArray(row) || frozenData(row, 'length') !== 2
            || frozenData(row, '0') !== 0 || frozenData(row, '1') !== 1) throw recorderError('malformed_frame');
        }
        if (tick !== totalFrames) throw recorderError('tick_discontinuity');
        const needsBatch = !active || active.frames.length >= cap.batchFrames || active.actions + actions > 32;
        const nextBatches = retainedBatches + Number(needsBatch);
        if (totalFrames + 1 > runCap.maxFrames || totalInputBytes + 16 > runCap.maxInputBytes
          || totalActions + actions > runCap.maxActions || nextSequence + Number(needsBatch) > runCap.maxBatches) throw recorderError('run_limit');
        if (retainedFrames + 1 > cap.maxFrames || nextBatches > cap.maxBatches
          || retainedActions + actions > cap.maxActions
          || reservation(retainedFrames + 1, retainedActions + actions, nextBatches) > cap.maxReservedBytes) throw recorderError('buffer_pressure');
        if (needsBatch) {
          seal();
          active = { sequence: nextSequence++, tick0: tick, frames: [], actions: 0 };
          retainedBatches++;
        }
        active.frames.push(Object.freeze({ frames: text, action: actions === 1 })); active.actions += actions;
        totalFrames++; totalInputBytes += 16; totalActions += actions;
        retainedFrames++; retainedActions += actions;
        return true;
      } catch (error) { return fail(error); }
    },
    // One bounded batch per call. A tail is sealed only on explicit request.
    // Queued refs are retained on quota/encoding failure; no input disappears.
    finalizeNext({ tail = false } = {}) {
      // Recording stays latched, but evidence can still be finalized/drained
      // after pressure, logout or an acknowledged quota release.
      try {
        if (tail) seal();
        const pending = queued[0];
        if (!pending) return null;
        const actions = [], pieces = [];
        for (let i = 0; i < pending.frames.length; i++) {
          const frame = pending.frames[i];
          pieces.push(frame.frames);
          if (frame.action) actions.push(Object.freeze([i, 1]));
        }
        const frames = pieces.join('');
        const decoded = decodeFrames(frames, pending.frames.length, actions);
        if (decoded.error) throw recorderError('malformed_frame');
        const batch = Object.freeze({ protocol: 2, runId: owner.runId, sequence: pending.sequence,
          tick0: pending.tick0, n: pending.frames.length, frames, actions: Object.freeze(actions) });
        storage.put(batch, owner);
        queued.shift();
        return batch;
      } catch (error) { return fail(error); }
    },
    pending(who) { return storage.list(who); },
    acknowledge(receipt, who) {
      const batch = storage.acknowledge(receipt, who);
      retainedFrames -= batch.n; retainedActions -= batch.actions.length; retainedBatches--;
    },
    // Account switch/logout stops this recorder, retaining all pending evidence.
    // No resume/rebind method: a later controller must manage the original run.
    suspend() { suspended = true; },
    status() {
      return Object.freeze({ totalFrames, totalActions, totalInputBytes, totalBatches: nextSequence,
        retainedFrames, retainedActions, retainedBatches,
        reservedBytes: reservation(retainedFrames, retainedActions, retainedBatches),
        activeFrames: active?.frames.length || 0, queuedBatches: queued.length,
        readyBatches: storage.status().batches, persistedBytes: 0, persistedBatches: 0,
        suspended, failure });
    },
  });
}
