import { describe, expect, it } from 'vitest';
import { createLoadControl } from '../src/render/loadControl.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('load control', () => {
  it('settles an empty model result as a retryable failure and continues the queue', async () => {
    const book = createLoadControl({ maxParallel: 1 });
    const pending = book.schedule('empty.glb', async () => null, 0);
    const next = book.schedule('next.glb', async () => ({ ok: true }), 0);
    await expect(pending).resolves.toBeNull();
    await expect(next).resolves.toEqual({ ok: true });
    expect(book.status('empty.glb')).toBe('error');
    expect(book.failures()).toEqual([{ path: 'empty.glb', message: 'load failed' }]);
    expect(book.retryPaths()).toEqual(['empty.glb']);
    await expect(book.schedule('empty.glb', async () => ({ recovered: true }), 0))
      .resolves.toEqual({ recovered: true });
  });

  it('keeps a failure out of the ready set until retry', async () => {
    const book = createLoadControl({ maxParallel: 4 });
    const job = deferred();
    const pending = book.schedule('models/missing.glb', () => job.promise, 0);
    job.reject(new Error('HTTP 404 models/missing.glb'));
    await expect(pending).resolves.toBeNull();
    expect(book.status('models/missing.glb')).toBe('error');
    expect(book.isReady('models/missing.glb')).toBe(false);
    expect(book.failures()).toEqual([{ path: 'models/missing.glb', message: 'HTTP 404 models/missing.glb' }]);
    expect(book.retryPaths()).toEqual(['models/missing.glb']);
    expect(book.status('models/missing.glb')).toBe('idle');
    const again = deferred();
    const next = book.schedule('models/missing.glb', () => again.promise, 0);
    again.resolve({ ok: true });
    await expect(next).resolves.toEqual({ ok: true });
    expect(book.isReady('models/missing.glb')).toBe(true);
  });

  it('does not let background work pass a now download', async () => {
    const book = createLoadControl({ maxParallel: 1 });
    const nowJob = deferred();
    const laterJob = deferred();
    let laterStarted = false;
    const now = book.schedule('now.glb', () => nowJob.promise, 0);
    const later = book.schedule('later.glb', () => { laterStarted = true; return laterJob.promise; }, 1);
    expect(laterStarted).toBe(false);
    expect(book.report().pending).toBe(2);
    nowJob.resolve({ id: 'now' });
    await now;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(laterStarted).toBe(true);
    laterJob.resolve({ id: 'later' });
    await later;
    expect(book.isReady('now.glb')).toBe(true);
    expect(book.isReady('later.glb')).toBe(true);
  });

  it('evicts stages that leave the demand set and keeps live users', async () => {
    const book = createLoadControl({ capBytes: 1000 });
    for (const id of ['a', 'b', 'c']) {
      await book.schedule(id, async () => ({ id }), 0);
      book.setDecoded(id, 16);
    }
    book.retain('a');
    expect(book.setDemand(['b'], ['c']).map((row) => row.path)).toEqual([]);
    expect(book.residentBytes()).toBe(48);
    book.release('a');
    expect(book.setDemand(['b'], ['c']).map((row) => row.path)).toEqual(['a']);
    expect(book.isReady('a')).toBe(false);
    expect(book.isReady('b')).toBe(true);
    expect(book.isReady('c')).toBe(true);
    expect(book.residentBytes()).toBe(32);
  });

  it('caps a long stage rotation at the demanded set', async () => {
    const book = createLoadControl({ capBytes: 10_000 });
    const stages = Array.from({ length: 12 }, (_, i) => `stage-${i}`);
    for (const id of stages) {
      await book.schedule(id, async () => ({ id }), 0);
      book.setDecoded(id, 1000);
    }
    let peak = 0;
    for (let i = 0; i < stages.length; i += 1) {
      const now = [stages[i]];
      const later = [stages[(i + 1) % stages.length]];
      book.setDemand(now, later);
      peak = Math.max(peak, book.residentBytes());
      expect(book.residentBytes()).toBeLessThanOrEqual(2000);
    }
    expect(peak).toBe(2000);
    expect(book.report().failed).toEqual([]);
  });
});
