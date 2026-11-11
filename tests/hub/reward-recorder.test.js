import { describe, expect, it, vi } from 'vitest';
import { canonicalCommand } from '../../src/server/canonicalCommand.js';
import { decodeFrames } from '../../src/server/protocol.js';
import { createRewardRecorder, RUN_LIMITS } from '../../src/hub/campaignRewards/recorder.js';
import { createMemoryBatchStorage } from '../../src/hub/campaignRewards/storage.js';

const owner = { accountId: 'account-a', runId: 'issued-run-a' };
const make = (extra = {}) => createRewardRecorder({ enabled: true, ...owner, ...extra });
const command = (tick, action = false) => ({ yaw: tick / 100, moveX: 0.5, held: { fire: tick % 2 === 0 },
  pressed: { jump: tick % 7 === 0 }, actions: action ? [{ type: 'transitionDone' }] : [] });
const frame = (tick, action = false) => canonicalCommand(command(tick, action)).frame;
const receipt = (batch) => ({ protocol: 2, runId: batch.runId, sequence: batch.sequence,
  tick0: batch.tick0, n: batch.n, status: 'received' });

it('requires explicit opt-in and finite bounded configuration', () => {
  expect(() => createRewardRecorder()).toThrow('recorder_disabled');
  for (const bad of [0, -1, NaN, Infinity, 1.2, 3601]) expect(() => make({ bufferLimits: { maxFrames: bad } })).toThrow('invalid_limit');
  expect(() => make({ runId: '' })).toThrow('invalid_identity');
  expect(RUN_LIMITS).toEqual({ maxFrames: 162000, maxInputBytes: 67108864, maxBatches: 4096, maxActions: 131072 });
});

it('rolls frame/action limits and independently decodes exact contiguous immutable batches', () => {
  const recorder = make({ bufferLimits: { batchFrames: 40 } });
  const original = [];
  for (let tick = 0; tick < 75; tick++) {
    const packed = canonicalCommand(command(tick, true)); original.push(packed.command);
    expect(recorder.record(packed.frame, tick)).toBe(true);
  }
  expect(recorder.status()).toMatchObject({ queuedBatches: 2, activeFrames: 11, totalBatches: 3 });
  const batches = [];
  let batch;
  while ((batch = recorder.finalizeNext({ tail: true }))) batches.push(batch);
  expect(batches.map((b) => [b.sequence, b.tick0, b.n, b.actions.length])).toEqual([[0, 0, 32, 32], [1, 32, 32, 32], [2, 64, 11, 11]]);
  const decoded = batches.flatMap((b) => decodeFrames(b.frames, b.n, b.actions).commands);
  expect(decoded).toEqual(original);
  expect(() => { batches[0].actions[0][0] = 99; }).toThrow();
  expect(() => { batches[0].frames = ''; }).toThrow();
  expect(recorder.pending(owner)).toEqual(batches);
});

it('retains references without serialization or storage until explicit background finalization', () => {
  const recorder = make({ bufferLimits: { batchFrames: 2 } });
  const spy = vi.spyOn(JSON, 'stringify').mockImplementation(() => { throw new Error('hot_path_serialization'); });
  try {
    recorder.record(frame(0), 0); recorder.record(frame(1), 1); recorder.record(frame(2), 2);
    expect(recorder.status()).toMatchObject({ queuedBatches: 1, activeFrames: 1, readyBatches: 0 });
    expect(recorder.pending(owner)).toEqual([]);
  } finally { spy.mockRestore(); }
  expect(recorder.finalizeNext().n).toBe(2);
});

describe('finite admission before input is consumed', () => {
  it.each([
    ['frames', { bufferLimits: { maxFrames: 2 } }],
    ['batch object count', { bufferLimits: { batchFrames: 1, maxBatches: 2 } }],
    ['actions', { bufferLimits: { maxActions: 2 } }],
    ['reservation bytes', { bufferLimits: { maxReservedBytes: 2304 } }],
  ])('%s pressure latches without losing the accepted prefix', (_, options) => {
    const recorder = make(options);
    recorder.record(frame(0, true), 0); recorder.record(frame(1, true), 1);
    const before = recorder.status();
    expect(() => recorder.record(frame(2, true), 2)).toThrow('buffer_pressure');
    expect(recorder.status()).toMatchObject({ totalFrames: 2, retainedFrames: 2, reservedBytes: before.reservedBytes });
    expect(() => recorder.record(frame(2), 2)).toThrow('buffer_pressure');
    const batches = [];
    let batch;
    while ((batch = recorder.finalizeNext({ tail: true }))) batches.push(batch);
    expect(batches.reduce((n, b) => n + b.n, 0)).toBe(2);
  });
  it.each([
    ['frames', { maxFrames: 2 }], ['input bytes', { maxInputBytes: 32 }],
    ['batch count', { maxBatches: 2 }], ['actions', { maxActions: 2 }],
  ])('cumulative %s remains charged after acknowledged cleanup', (_, runLimits) => {
    const recorder = make({ bufferLimits: { batchFrames: 1 }, runLimits, acceptReceipt: () => true });
    for (let tick = 0; tick < 2; tick++) {
      recorder.record(frame(tick, true), tick);
      const batch = recorder.finalizeNext({ tail: true });
      recorder.acknowledge(receipt(batch), owner);
    }
    expect(recorder.status().retainedFrames).toBe(0);
    expect(() => recorder.record(frame(2, true), 2)).toThrow('run_limit');
    expect(recorder.status().totalFrames).toBe(2);
  });
});

it('storage quota retains queued evidence, stops recording and permits drain after a stable receipt', () => {
  const recorder = make({ bufferLimits: { batchFrames: 1 }, storageLimits: { maxBatches: 1 }, acceptReceipt: () => true });
  recorder.record(frame(0), 0); recorder.record(frame(1), 1);
  const first = recorder.finalizeNext();
  expect(() => recorder.finalizeNext({ tail: true })).toThrow('storage_quota');
  expect(recorder.status()).toMatchObject({ readyBatches: 1, queuedBatches: 1, retainedFrames: 2 });
  expect(() => recorder.record(frame(2), 2)).toThrow('storage_quota');
  recorder.acknowledge(receipt(first), owner);
  expect(recorder.finalizeNext().tick0).toBe(1);
  expect(recorder.status().totalFrames).toBe(2);
});

it('cannot release on an unconfirmed/mismatched/async receipt or access another identity', () => {
  const recorder = make({ acceptReceipt: () => Promise.resolve(true) });
  recorder.record(frame(0), 0);
  const batch = recorder.finalizeNext({ tail: true });
  expect(() => recorder.acknowledge(receipt(batch), owner)).toThrow('unconfirmed_receipt');
  for (const who of [{ ...owner, accountId: 'other' }, { ...owner, runId: 'other' }]) {
    expect(() => recorder.pending(who)).toThrow('identity_mismatch');
    expect(() => recorder.acknowledge(receipt(batch), who)).toThrow('identity_mismatch');
  }
  expect(recorder.status().retainedFrames).toBe(1);
  const noAdapter = make(); noAdapter.record(frame(0), 0);
  const pending = noAdapter.finalizeNext({ tail: true });
  expect(() => noAdapter.acknowledge(receipt(pending), owner)).toThrow('unconfirmed_receipt');
});

it('logout suspends recording, retains evidence and cannot rebind or restore guessed ticks', () => {
  const recorder = make(); recorder.record(frame(0), 0); recorder.suspend();
  expect(() => recorder.record(frame(1), 1)).toThrow('recorder_suspended');
  expect(recorder.finalizeNext({ tail: true }).n).toBe(1);
  expect(recorder.status()).toMatchObject({ retainedFrames: 1, persistedBytes: 0, persistedBatches: 0 });
  const reloaded = make();
  expect(reloaded.pending(owner)).toEqual([]);
  expect(() => reloaded.record(frame(1), 1)).toThrow('tick_discontinuity');
});

it('rejects mutable/malformed frame and storage data before mutation', () => {
  const recorder = make();
  expect(() => recorder.record({ ...frame(0) }, 0)).toThrow('malformed_frame');
  expect(recorder.status().totalFrames).toBe(0);
  const storage = createMemoryBatchStorage(owner);
  for (const bad of [null, {}, Object.freeze({ protocol: 2, n: 1, frames: 'bad' })]) {
    expect(() => storage.put(bad, owner)).toThrow();
    expect(storage.status().batches).toBe(0);
  }
});

it('retains exact default cumulative frame ceiling across a full 45-minute input history', () => {
  const recorder = make({ acceptReceipt: () => true });
  const sameFrame = frame(0);
  for (let tick = 0; tick < 162000; tick++) {
    recorder.record(sameFrame, tick);
    if ((tick + 1) % 120 === 0) {
      const batch = recorder.finalizeNext({ tail: true });
      recorder.acknowledge(receipt(batch), owner);
    }
  }
  expect(recorder.status()).toMatchObject({ totalFrames: 162000, totalInputBytes: 2592000,
    totalBatches: 1350, retainedFrames: 0, retainedBatches: 0, reservedBytes: 0 });
  expect(() => recorder.record(sameFrame, 162000)).toThrow('run_limit');
});

it('rejects default cumulative batch 4097 even when earlier evidence was released', () => {
  const recorder = make({ bufferLimits: { batchFrames: 1 }, acceptReceipt: () => true });
  const sameFrame = frame(0);
  for (let tick = 0; tick < 4096; tick++) {
    recorder.record(sameFrame, tick);
    const batch = recorder.finalizeNext({ tail: true });
    recorder.acknowledge(receipt(batch), owner);
  }
  expect(() => recorder.record(sameFrame, 4096)).toThrow('run_limit');
  expect(recorder.status()).toMatchObject({ totalBatches: 4096, totalFrames: 4096, retainedFrames: 0 });
});

it('a confirmed receipt must identify the exact stored range and cannot release another pending batch', () => {
  const recorder = make({ bufferLimits: { batchFrames: 1 }, acceptReceipt: () => true });
  recorder.record(frame(0), 0); recorder.record(frame(1), 1);
  const first = recorder.finalizeNext();
  const second = recorder.finalizeNext({ tail: true });
  for (const wrong of [{ ...receipt(first), n: 2 }, { ...receipt(first), tick0: 1 },
    { ...receipt(first), runId: 'other-run' }, { ...receipt(first), status: 'payment_pending' }]) {
    expect(() => recorder.acknowledge(wrong, owner)).toThrow('unconfirmed_receipt');
    expect(recorder.status().retainedFrames).toBe(2);
  }
  recorder.acknowledge(receipt(first), owner);
  expect(recorder.pending(owner)).toEqual([second]);
  expect(recorder.status()).toMatchObject({ totalFrames: 2, retainedFrames: 1 });
});
