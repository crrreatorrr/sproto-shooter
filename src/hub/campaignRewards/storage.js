// Deliberately memory-only. No IndexedDB/localStorage, reload restoration or
// ownership authority. Future transport must authenticate receipts itself.
export const STORAGE_LIMITS = Object.freeze({ maxBatches: 64, maxFrames: 3600, maxInputBytes: 57600 });

export function recorderError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

// Read one immutable own data field without invoking a caller getter or
// walking/retaining extra payload graphs. Selected fields are captured once.
export function frozenData(object, key) {
  const descriptor = object != null && Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    || descriptor.writable || descriptor.configurable) throw recorderError('malformed_data');
  return descriptor.value;
}

export function identity(accountId, runId) {
  if (typeof accountId !== 'string' || !/^[\x21-\x7e]{1,80}$/.test(accountId)
    || typeof runId !== 'string' || !/^[\x21-\x7e]{1,80}$/.test(runId)) throw recorderError('invalid_identity');
  return Object.freeze({ accountId, runId });
}

export function finiteLimit(value, ceiling) {
  if (!Number.isSafeInteger(value) || value < 1 || value > ceiling) throw recorderError('invalid_limit');
  return value;
}

/** Bounded immutable ready batches. Every instance belongs to exactly one run.
 * acceptReceipt is an internal integration seam, NOT server authorization. It
 * must synchronously validate a previously authenticated stable receipt; absent
 * that adapter no history may be released. No expiry/logout cleanup exists.
 */
export function createMemoryBatchStorage({ accountId, runId, limits = {}, acceptReceipt = null }) {
  const owner = identity(accountId, runId);
  const cap = Object.freeze(Object.fromEntries(Object.entries(STORAGE_LIMITS)
    .map(([key, value]) => [key, finiteLimit(limits[key] ?? value, value)])));
  if (acceptReceipt !== null && typeof acceptReceipt !== 'function') throw recorderError('invalid_receipt_adapter');
  const batches = new Map();
  let frames = 0, inputBytes = 0;
  const checkOwner = (who) => {
    if (who?.accountId !== owner.accountId || who?.runId !== owner.runId) throw recorderError('identity_mismatch');
  };
  return Object.freeze({
    owner,
    // Recorder owns insertion. Reject mutable/malformed data even from an
    // adapter; never replace a pending sequence or trust persisted objects.
    put(batch, who) {
      checkOwner(who);
      // Capture only the bounded wire primitives; discard all caller extras.
      // No externally supplied object graph or getter is retained in storage.
      const protocol = frozenData(batch, 'protocol'), runId = frozenData(batch, 'runId');
      const sequence = frozenData(batch, 'sequence'), tick0 = frozenData(batch, 'tick0');
      const n = frozenData(batch, 'n'), text = frozenData(batch, 'frames');
      const sourceActions = frozenData(batch, 'actions');
      if (protocol !== 2 || runId !== owner.runId || !Number.isSafeInteger(sequence) || sequence < 0 || sequence >= 4096
        || !Number.isSafeInteger(tick0) || tick0 < 0 || !Number.isSafeInteger(n) || n < 1 || n > 28800
        || tick0 + n > 162000 || typeof text !== 'string' || text.length !== n * 16
        || !/^[A-Za-z0-9+/]+$/.test(text) || !Array.isArray(sourceActions)) throw recorderError('malformed_batch');
      const count = frozenData(sourceActions, 'length');
      if (count > 32) throw recorderError('malformed_batch');
      const actions = [];
      for (let i = 0; i < count; i++) {
        const row = frozenData(sourceActions, String(i));
        if (!Array.isArray(row) || frozenData(row, 'length') !== 2) throw recorderError('malformed_batch');
        const offset = frozenData(row, '0'), id = frozenData(row, '1');
        if (!Number.isSafeInteger(offset) || offset < 0 || offset >= n || id !== 1
          || (i > 0 && offset <= actions[i - 1][0])) throw recorderError('malformed_batch');
        actions.push(Object.freeze([offset, id]));
      }
      batch = Object.freeze({ protocol, runId, sequence, tick0, n, frames: text, actions: Object.freeze(actions) });
      if (batches.has(batch.sequence)) throw recorderError('sequence_conflict');
      if (batches.size + 1 > cap.maxBatches || frames + batch.n > cap.maxFrames
        || inputBytes + batch.frames.length > cap.maxInputBytes) throw recorderError('storage_quota');
      batches.set(batch.sequence, batch);
      frames += batch.n; inputBytes += batch.frames.length;
    },
    list(who) { checkOwner(who); return Object.freeze([...batches.values()]); },
    acknowledge(receipt, who) {
      checkOwner(who);
      const batch = batches.get(receipt?.sequence);
      if (!batch || receipt?.protocol !== 2 || receipt?.runId !== owner.runId
        || receipt?.tick0 !== batch.tick0 || receipt?.n !== batch.n
        || receipt?.state !== 'received' || !acceptReceipt || acceptReceipt(receipt, batch) !== true) {
        throw recorderError('unconfirmed_receipt');
      }
      batches.delete(batch.sequence); frames -= batch.n; inputBytes -= batch.frames.length;
      return batch;
    },
    status() { return Object.freeze({ batches: batches.size, frames, inputBytes, persistedBytes: 0, persistedBatches: 0 }); },
  });
}
