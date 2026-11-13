import { expect, it, vi } from 'vitest';
import { createCampaignController } from '../../src/hub/campaignRewards/controller.js';
import { createCampaignTransport } from '../../src/hub/campaignRewards/transport.js';
import { owner, session, frame, ack, snapshot, receivedSnapshot, jsonResponse, subtle } from './campaign-transport-fixtures.js';

function setup(fetchImpl, { controller = {}, transport: transportOptions = {} } = {}) {
  let clock = 1000, identity = session();
  const requests = [];
  const transport = createCampaignTransport({ enabled: true, ...owner, serverUrl: 'https://campaign.example',
    getSession: () => identity, subtle, fetchImpl: (url, init) => {
      requests.push({ url, body: init.body }); return fetchImpl(url, JSON.parse(init.body), init);
    }, ...transportOptions });
  const control = createCampaignController({ enabled: true, transport, uploadDeadlineMs: 100000,
    recorderOptions: { bufferLimits: { batchFrames: 1 } }, now: () => clock, random: () => 0, ...controller });
  return { control, requests, advance: (n) => { clock += n; }, setIdentity: (next) => { identity = next; } };
}
const prefix = (control, n = 2) => { for (let tick = 0; tick < n; tick++) control.record(frame(tick), tick); };

it('is explicitly inactive/default-off and separates pre-run issuance from background finish intent', () => {
  expect(() => createCampaignController()).toThrow('controller_disabled');
  const { control, requests } = setup(vi.fn());
  prefix(control);
  expect(requests).toEqual([]);
  expect(control.status().running).toBe(false);
  expect(() => control.issue()).toThrow('pre_run_issuer_required');
  expect(control.finish().finishRequested).toBe(true);
});

it('tracks durable accepted separately from unverified/unpaid progress and flushes the final tail in order', async () => {
  const { control, requests } = setup(async (_, body) => jsonResponse(ack(body)));
  prefix(control); await control.pump();
  expect(control.status()).toMatchObject({ accepted: { sequence: 0, tick: 1 }, progress: null,
    recorder: { totalFrames: 2, retainedFrames: 1 } });
  control.flushTail();
  expect(() => control.record(frame(2), 2)).toThrow('local_end');
  await control.pump();
  expect(requests.map((r) => JSON.parse(r.body).sequence)).toEqual([0, 1]);
  expect(control.status()).toMatchObject({ accepted: { sequence: 1, tick: 2 }, recorder: { retainedFrames: 0 } });
  expect(control.finish().finishRequested).toBe(true);
});

it('recovers commit-then-lost-response by strict owner status without double upload or dropped history', async () => {
  let committed;
  const { control, requests, advance } = setup(async (url, body) => {
    if (url.includes('run.append')) { committed = body; throw new Error('lost_after_commit'); }
    expect(body).toEqual({ runId: owner.runId, sequence: 0 });
    return jsonResponse(receivedSnapshot(committed));
  });
  prefix(control); await control.pump();
  expect(control.status()).toMatchObject({ problem: 'transport_unknown', currentSequence: 0, recorder: { retainedFrames: 2 } });
  advance(250); await control.pump();
  expect(requests).toHaveLength(2);
  expect(control.status()).toMatchObject({ accepted: { tick: 1 }, currentSequence: null,
    progress: { payment: { state: 'none' }, verified: { tick: 0 } }, recorder: { retainedFrames: 1 } });
});

it('retries identical wire after a missing status ack and keeps one unresolved prepared batch', async () => {
  let attempts = 0;
  const { control, requests, advance } = setup(async (url, body) => {
    if (url.includes('run.status')) return jsonResponse(snapshot());
    if (++attempts === 1) throw new Error('dropped_before_accept');
    return jsonResponse(ack(body));
  });
  prefix(control); await control.pump();
  advance(250); await control.pump();
  expect(control.status().recorder.retainedFrames).toBe(2);
  advance(250); await control.pump();
  const wires = requests.filter((r) => r.url.includes('run.append')).map((r) => r.body);
  expect(wires).toHaveLength(2); expect(wires[0]).toBe(wires[1]);
  expect(control.status().recorder.retainedFrames).toBe(1);
});

it('never uses accepted cursor alone as proof and pauses on a conflicting receivedAck digest', async () => {
  const { control, advance } = setup(async (url, body) => {
    if (url.includes('run.append')) throw new Error('unknown_acceptance');
    const received = receivedSnapshot(batchBody);
    received.receivedAck.digest = 'f'.repeat(64);
    return jsonResponse(received);
  });
  const batchBody = { protocol: 2, runId: owner.runId, sequence: 0, tick0: 0, n: 1, frames: frame(0).frames, actions: [] };
  prefix(control); await control.pump(); advance(250); await control.pump();
  expect(control.status()).toMatchObject({ paused: true, problem: 'receipt_conflict', recorder: { retainedFrames: 2 } });
});

it('obeys server retry minimum, finite budgets and refuses an out-of-policy delay without early retry', async () => {
  const first = setup(async () => jsonResponse({ state: 'pending_retryable', reason: 'too_fast', retryAfterMs: 1000 }));
  prefix(first.control); await first.control.pump();
  first.advance(999); await first.control.pump(); expect(first.requests).toHaveLength(1);
  first.advance(1); await first.control.pump(); expect(first.requests).toHaveLength(2);
  expect(first.requests[0].body).toBe(first.requests[1].body);
  const long = setup(async () => jsonResponse({ state: 'pending_retryable', reason: 'too_fast', retryAfterMs: 60000 }));
  prefix(long.control); await long.control.pump();
  expect(long.control.status()).toMatchObject({ paused: true, problem: 'retry_delay_requires_attention', recorder: { retainedFrames: 2 } });
  const bounded = setup(async () => { throw new Error('offline'); }, { controller: { limits: { maxCalls: 2, maxBatchCalls: 2 } } });
  prefix(bounded.control); await bounded.control.pump();
  bounded.advance(250); await bounded.control.pump(); bounded.advance(250); await bounded.control.pump();
  await bounded.control.pump();
  expect(bounded.requests).toHaveLength(2);
  expect(bounded.control.status()).toMatchObject({ paused: true, problem: 'retry_budget_exhausted', calls: 2, recorder: { retainedFrames: 2 } });
});

it('continues recording while the single background request waits, then latches finite pressure before another tick', async () => {
  let resolve;
  const { control, requests } = setup((_, body) => new Promise((done) => { resolve = () => done(jsonResponse(ack(body))); }),
    { controller: { recorderOptions: { bufferLimits: { batchFrames: 1, maxFrames: 3 } } } });
  prefix(control); const pending = control.pump();
  // SHA preparation is asynchronous; await until the one actual request starts.
  await vi.waitFor(() => expect(requests).toHaveLength(1));
  expect((await control.pump()).busy).toBe(true);
  control.record(frame(2), 2);
  expect(() => control.record(frame(3), 3)).toThrow('buffer_pressure');
  expect(control.status().recorder.totalFrames).toBe(3);
  resolve(); await pending;
  expect(requests).toHaveLength(1);
  expect(control.status().accepted.tick).toBe(1);
});

it('halts offline recording at a finite deadline with no expiry grace, while owner status can recover history', async () => {
  let committed;
  const { control, advance } = setup(async (url, body) => {
    if (url.includes('run.append')) { committed = body; throw new Error('lost_after_commit'); }
    return jsonResponse(receivedSnapshot(committed, { authorization: 'session_expired',
      payment: { state: 'authorization_denied', reason: 'session_expired' } }));
  }, { controller: { uploadDeadlineMs: 1500, limits: { maxOfflineMs: 400 } } });
  prefix(control); await control.pump();
  advance(400);
  expect(() => control.record(frame(2), 2)).toThrow('offline_budget_exhausted');
  advance(100); await control.pump();
  expect(control.status()).toMatchObject({ accepted: { tick: 1 }, writesStopped: 'offline_budget_exhausted',
    progress: { authorization: 'session_expired', payment: { state: 'authorization_denied' } }, recorder: { retainedFrames: 1 } });
});

it('invalidates old account completions on logout and never mutates a new account controller', async () => {
  let resolve;
  const { control, requests } = setup((_, body) => new Promise((done) => { resolve = () => done(jsonResponse(ack(body))); }));
  prefix(control); const pending = control.pump();
  await vi.waitFor(() => expect(requests).toHaveLength(1));
  control.stop(); resolve(); await pending;
  expect(control.status()).toMatchObject({ paused: true, problem: 'logout', accepted: { tick: 0 }, recorder: { retainedFrames: 2 } });
  const fresh = setup(async () => jsonResponse(snapshot()));
  expect(fresh.control.status().recorder.totalFrames).toBe(0);
  expect(() => fresh.control.record(frame(2), 2)).toThrow('tick_discontinuity');
});

it('reacts to account changes before awaiting completion and does not treat malformed replies as invalid gameplay', async () => {
  let resolve;
  const fixture = setup((_, body) => new Promise((done) => { resolve = () => done(jsonResponse(ack(body))); }));
  prefix(fixture.control); const pending = fixture.control.pump();
  await vi.waitFor(() => expect(fixture.requests).toHaveLength(1));
  fixture.setIdentity(session({ playerId: owner.runId })); resolve(); await pending;
  expect(fixture.control.status()).toMatchObject({ paused: true, problem: 'identity_changed', recorder: { retainedFrames: 2 } });
  const malformed = setup(async () => jsonResponse({ state: 'paid', tickets: 20 }));
  prefix(malformed.control); await malformed.control.pump();
  expect(malformed.control.status()).toMatchObject({ paused: true, problem: 'client_contract_error', recorder: { retainedFrames: 2 } });
});

it('has one explicit timer and catches UI observer failure without creating another loop', async () => {
  const timers = new Map(); let id = 0;
  const setTimer = vi.fn((fn) => { timers.set(++id, fn); return id; });
  const clearTimer = vi.fn((key) => timers.delete(key));
  const { control } = setup(async () => jsonResponse(snapshot()), { controller: { setTimer, clearTimer,
    onState: () => { throw new Error('ui_observer'); } } });
  control.start(); control.start(); expect(timers.size).toBe(1);
  await control.pump(); expect(timers.size).toBe(1);
  expect(control.status().callbackFailed).toBe(true);
  control.stop(); expect(timers.size).toBe(0);
});


it('an identity change observed in the input callback invalidates even a later switch back before completion', async () => {
  let resolve;
  const fixture = setup((_, body) => new Promise((done) => { resolve = () => done(jsonResponse(ack(body))); }));
  prefix(fixture.control); const pending = fixture.control.pump();
  await vi.waitFor(() => expect(fixture.requests).toHaveLength(1));
  fixture.setIdentity(session({ playerId: owner.runId }));
  expect(() => fixture.control.record(frame(2), 2)).toThrow('identity_changed');
  fixture.setIdentity(session()); resolve(); await pending;
  expect(fixture.control.status()).toMatchObject({ paused: true, problem: 'identity_changed',
    accepted: { tick: 0 }, recorder: { retainedFrames: 2, totalFrames: 2 } });
});

it('uploads a sealed tail as soon as the idle status already in flight returns', async () => {
  const pending = [];
  const { control, requests } = setup((url, body) => new Promise((done) => {
    pending.push(() => done(jsonResponse(url.includes('run.append') ? ack(body) : snapshot())));
  }), { controller: { recorderOptions: { bufferLimits: { batchFrames: 120 } } } });
  for (let tick = 0; tick < 6; tick++) control.record(frame(tick), tick);
  const pumping = control.pump();
  await vi.waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].url).toContain('run.status');
  control.finish();
  pending.shift()();
  await vi.waitFor(() => expect(requests.some((row) => row.url.includes('run.append'))).toBe(true));
  pending.shift()();
  await pumping;
  const appended = JSON.parse(requests.find((row) => row.url.includes('run.append')).body);
  expect(appended).toMatchObject({ sequence: 0, n: 6, tick0: 0 });
  expect(control.status()).toMatchObject({ accepted: { sequence: 0, tick: 6 }, recorder: { retainedFrames: 0 } });
});

it('a background codec/storage error pauses as local failure without infinite pre-request retries', async () => {
  const { control, requests } = setup(vi.fn(), { controller: { recorderOptions: {
    bufferLimits: { batchFrames: 2 }, storageLimits: { maxFrames: 1 } } } });
  prefix(control, 3); await control.pump();
  expect(control.status()).toMatchObject({ paused: true, problem: 'storage_quota', calls: 0,
    recorder: { retainedFrames: 3, totalFrames: 3 } });
  await control.pump(); expect(requests).toHaveLength(0);
});
