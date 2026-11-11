// Deliberately memory-only. No IndexedDB/localStorage, reload restoration or
// ownership authority. Future transport must authenticate receipts itself.
export const STORAGE_LIMITS = Object.freeze({ maxBatches: 64, maxFrames: 3600, maxInputBytes: 57600 });

export function recorderError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
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
      if (!Object.isFrozen(batch) || !Object.isFrozen(batch.actions)
        || batch.protocol !== 2 || batch.runId !== owner.runId
        || !Number.isSafeInteger(batch.sequence) || batch.sequence < 0
        || !Number.isSafeInteger(batch.tick0) || batch.tick0 < 0
        || !Number.isSafeInteger(batch.n) || batch.n < 1 || batch.n > 28800
        || typeof batch.frames !== 'string' || batch.frames.length !== batch.n * 16
        || !/^[A-Za-z0-9+/]+$/.test(batch.frames)
        || batch.actions.length > 32 || batch.actions.some((row, index) => !Object.isFrozen(row)
          || row.length !== 2 || !Number.isSafeInteger(row[0]) || row[0] < 0 || row[0] >= batch.n
          || row[1] !== 1 || (index > 0 && row[0] <= batch.actions[index - 1][0]))) throw recorderError('malformed_batch');
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
        || receipt?.status !== 'received' || !acceptReceipt || acceptReceipt(receipt, batch) !== true) {
        throw recorderError('unconfirmed_receipt');
      }
      batches.delete(batch.sequence); frames -= batch.n; inputBytes -= batch.frames.length;
      return batch;
    },
    status() { return Object.freeze({ batches: batches.size, frames, inputBytes, persistedBytes: 0, persistedBatches: 0 }); },
  });
}
