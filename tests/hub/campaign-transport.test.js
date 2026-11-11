import { describe, expect, it, vi } from 'vitest';
import { canonicalCommand } from '../../src/server/canonicalCommand.js';
import { boundedCampaignFetch, createCampaignTransport } from '../../src/hub/campaignRewards/transport.js';
import { mergeProgress, parseStatus } from '../../src/hub/campaignRewards/clientProtocol.js';
import { owner, session, batch, ack, snapshot, receivedSnapshot, jsonResponse, subtle } from './campaign-transport-fixtures.js';
const serverUrl = 'https://campaign.example';
const make = (fetchImpl, extra = {}) => createCampaignTransport({ enabled: true, ...owner, serverUrl,
  getSession: () => session(), subtle, fetchImpl, ...extra });

it('is unavailable by default and keeps issue/finish unavailable until server contracts exist', () => {
  expect(() => createCampaignTransport()).toThrow('transport_disabled');
  const transport = make(vi.fn());
  expect(() => transport.issue()).toThrow('issuance_unavailable');
  expect(() => transport.finish()).toThrow('finish_unavailable');
});

it('matches independent Hub sorted-JSON SHA256 and retries identical generic SDK wire bytes', async () => {
  const calls = [];
  const transport = make(async (url, init) => { calls.push({ url, ...init }); return jsonResponse(ack(JSON.parse(init.body))); });
  const fixed = Object.freeze({ ...batch(), frames: canonicalCommand({}).frame.frames });
  const prepared = await transport.prepare(fixed);
  expect(prepared.wire).toBe('{"actions":[],"frames":"AAAAAAAAAAAAAP8A","n":1,"protocol":2,"runId":"00000000-0000-4000-8000-000000000003","sequence":0,"tick0":0}');
  expect(prepared.digest).toBe('8ee26ac410e0b560bf2532893c077bca821d9780e84902c353809bfe7489f793');
  const receipt = await transport.append(prepared); await transport.append(prepared);
  expect(calls.map((c) => c.body)).toEqual([prepared.wire, prepared.wire]);
  expect(calls.every((c) => c.redirect === 'error' && c.signal instanceof AbortSignal)).toBe(true);
  expect(transport.acceptReceipt(receipt, fixed)).toBe(true);
  expect(transport.acceptReceipt({ ...receipt }, fixed)).toBe(false);
  expect(transport.acceptReceipt(receipt, { ...fixed, frames: batch().frames })).toBe(false);
  await expect(transport.append({ ...prepared })).rejects.toThrow('unprepared_batch');
});

it('recovers matching exact receipts from owner status, even after original authorization expires', async () => {
  const source = batch();
  const transport = make(async () => jsonResponse(receivedSnapshot(source, { authorization: 'session_expired', payment: { state: 'authorization_denied', reason: 'session_expired' } })));
  const prepared = await transport.prepare(source);
  const result = await transport.status(prepared);
  expect(result.authorization).toBe('session_expired');
  expect(result.payment.state).toBe('authorization_denied');
  expect(transport.acceptReceipt(result.receivedAck, source)).toBe(true);
});

it.each(['digest', 'tick0', 'runId'])('rejects mismatched %s before granting receipt proof', async (field) => {
  const wrong = ack(batch());
  wrong[field] = field === 'digest' ? 'f'.repeat(64) : field === 'runId' ? owner.accountId : 1;
  const transport = make(async () => jsonResponse(wrong));
  await expect(transport.append(await transport.prepare(batch()))).rejects.toThrow();
  expect(transport.acceptReceipt(wrong, batch())).toBe(false);
});

it('serializes RPCs and discards completion after logout or changed account/session', async () => {
  let resolve, activeSession = session();
  const transport = make(() => new Promise((done) => { resolve = done; }), { getSession: () => activeSession });
  const prepared = await transport.prepare(batch());
  const pending = transport.append(prepared);
  await expect(transport.status()).rejects.toThrow('transport_busy');
  activeSession = session({ playerId: owner.runId }); resolve(jsonResponse(ack(batch())));
  await expect(pending).rejects.toThrow('identity_changed');
  activeSession = session({ sid: owner.runId });
  await expect(transport.append(prepared)).rejects.toThrow('identity_changed');
  transport.suspend();
  await expect(transport.status()).rejects.toThrow('transport_suspended');
});

it('allows a replacement access token only for the same original account/session', async () => {
  let current = session();
  const transport = make(async () => jsonResponse(ack(batch())), { getSession: () => current });
  const prepared = await transport.prepare(batch());
  current = { ...session(), token: session().token + '-refreshed' };
  expect((await transport.append(prepared)).state).toBe('received');
});

it('classifies body failures and HTTP auth denial without inferring payment', async () => {
  const denied = make(async () => jsonResponse({ message: 'unauthorized' }, 401));
  expect(await denied.append(await denied.prepare(batch()))).toEqual({ state: 'authorization_denied', reason: 'unauthorized' });
  const pending = make(async () => jsonResponse({ protocol: 2, state: 'pending_retryable', reason: 'too_fast', retryAfterMs: 1000, ticketsMinted: 0 }));
  expect(await pending.append(await pending.prepare(batch()))).toMatchObject({ state: 'pending_retryable', retryAfterMs: 1000 });
  const malformed = make(async () => new Response('{broken'));
  await expect(malformed.status()).rejects.toThrow('client_contract_error');
});

describe('bounded body/deadline and origin composition with generic SDK', () => {
  it('rejects declared/streamed oversize and cancels the response reader', async () => {
    let cancelled = false;
    const transport = make(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(17)); }, cancel() { cancelled = true; },
    })), { maxResponseBytes: 16 });
    await expect(transport.status()).rejects.toThrow('response_oversized');
    expect(cancelled).toBe(true);
    const declared = make(async () => new Response('{}', { headers: { 'content-length': '17' } }), { maxResponseBytes: 16 });
    await expect(declared.status()).rejects.toThrow('response_oversized');
  });
  it('keeps deadline active through a stalled response body and cancels it', async () => {
    let cancelled = false;
    const transport = make(async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })), { deadlineMs: 10 });
    await expect(transport.status()).rejects.toThrow('transport_timeout');
    expect(cancelled).toBe(true);
  });
  it('keeps a noncooperating fetch slot occupied after abort instead of spawning requests', async () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const transport = make(fetchImpl, { deadlineMs: 10 });
    void transport.status();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(transport.status()).rejects.toThrow('transport_busy');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    transport.suspend();
  });
  it('refuses unsupported origins/routes before fetching', async () => {
    for (const serverUrl of ['http://public.example', 'https://user:password@campaign.example', 'https://campaign.example/path']) {
      expect(() => boundedCampaignFetch({ serverUrl })).toThrow('invalid_origin');
    }
    const fetchImpl = vi.fn();
    const wire = boundedCampaignFetch({ serverUrl, fetchImpl });
    await expect(wire.fetch('https://other.example/v2/rpc/shooter.run.append?unwrap=true', { method: 'POST' })).rejects.toThrow('transport_refused');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

it('validates partial verified ticks and merges independent accepted progress at equal revision', () => {
  const first = parseStatus(receivedSnapshot(batch(0, 0, 2), { revision: 1, verified: { sequence: -1, tick: 1, simulationTick: 1, bytes: 16, batches: 0 } }), owner.runId);
  const next = parseStatus(receivedSnapshot(batch(2, 1, 2), { revision: 1, verified: first.verified }), owner.runId);
  const merged = mergeProgress(first, next);
  expect(merged.revision).toBe(1);
  expect(merged.received).toMatchObject({ sequence: 1, tick: 4 });
  expect(merged.verified).toMatchObject({ sequence: -1, tick: 1 });
  expect(mergeProgress(merged, first).received.tick).toBe(4);
});

it('keeps terminal simulation frozen while pending tail resolves, and preserves fully verified paid facts against stale pending status', () => {
  const terminal = { tick: 1, outcome: 'clear', canonicalBoss: 'sahil' };
  const first = parseStatus(receivedSnapshot(batch(0, 0, 2), { state: 'terminal', revision: 1, terminal,
    verified: { sequence: -1, tick: 1, simulationTick: 1, bytes: 16, batches: 0 }, payment: { state: 'pending', reason: null } }), owner.runId);
  const resolved = parseStatus({ ...first, revision: 2,
    verified: { sequence: 0, tick: 2, simulationTick: 1, bytes: 32, batches: 1 } }, owner.runId);
  expect(mergeProgress(first, resolved)).toMatchObject({ terminal, verified: { tick: 2, simulationTick: 1 }, payment: { state: 'pending' } });
  const paid = parseStatus({ ...resolved, payment: { state: 'paid', tickets: 20 } }, owner.runId);
  const merged = mergeProgress(mergeProgress(first, resolved), paid);
  expect(mergeProgress(merged, first)).toMatchObject({ terminal, revision: 2,
    payment: { state: 'paid', tickets: 20 }, verified: { tick: 2, simulationTick: 1 } });
});

it('rejects malformed paid/byte/action projections against actual Hub policy and codec invariants', () => {
  const good = receivedSnapshot(batch(), { state: 'terminal', revision: 1,
    terminal: { tick: 1, outcome: 'clear', canonicalBoss: 'sahil' },
    verified: { sequence: 0, tick: 1, simulationTick: 1, bytes: 16, batches: 1 }, payment: { state: 'paid', tickets: 20 } });
  expect(parseStatus(good, owner.runId).payment).toEqual({ state: 'paid', tickets: 20 });
  const wrong = [
    ...[0, 19, 21, Number.MAX_SAFE_INTEGER].map((tickets) => ({ ...good, payment: { state: 'paid', tickets } })),
    { ...good, terminal: null }, { ...good, terminal: { ...good.terminal, outcome: 'assisted' } },
    { ...good, verified: { sequence: -1, tick: 0, simulationTick: 0, bytes: 0, batches: 0 }, terminal: { ...good.terminal, tick: 0 } },
    { ...good, received: { ...good.received, bytes: 15 } },
    { ...good, verified: { ...good.verified, bytes: 15 } },
    { ...good, received: { ...good.received, actions: 2 } },
    { ...good, received: { ...good.received, sequence: 1, batches: 2 } },
    { ...good, terminal: null, payment: { state: 'none' }, verified: { sequence: 0, tick: 0, simulationTick: 0, bytes: 0, batches: 1 } },
    snapshot({ state: 'terminal', terminal: { tick: 0, outcome: 'clear', canonicalBoss: 'sahil' }, payment: { state: 'paid', tickets: 20 } }),
    { ...receivedSnapshot(batch(0, 0, 100)), received: { sequence: 0, tick: 100, bytes: 1600, actions: 33, batches: 1 } },
  ];
  for (const malformed of wrong) expect(() => parseStatus(malformed, owner.runId)).toThrow('client_contract_error');
});

it('rejects verification changes at equal revision and regressions at higher revision, while ignoring older verification', () => {
  const first = parseStatus(receivedSnapshot(batch(0, 0, 2), { revision: 1,
    verified: { sequence: -1, tick: 1, simulationTick: 1, bytes: 16, batches: 0 } }), owner.runId);
  const advanced = parseStatus({ ...first, revision: 2,
    verified: { sequence: 0, tick: 2, simulationTick: 2, bytes: 32, batches: 1 } }, owner.runId);
  expect(() => mergeProgress(first, { ...advanced, revision: 1 })).toThrow('client_contract_error');
  expect(() => mergeProgress(advanced, { ...first, revision: 3 })).toThrow('client_contract_error');
  expect(mergeProgress(advanced, first).verified).toEqual(advanced.verified);
  expect(() => parseStatus({ ...first, revision: 0 }, owner.runId)).toThrow('client_contract_error');
});


it('keeps empty incomplete server closure valid at revision0 without inventing gameplay progress or payment', () => {
  const closed = snapshot({ state: 'expired', terminal: { tick: 0, outcome: 'incomplete', canonicalBoss: 'sahil' },
    payment: { state: 'ineligible', reason: 'ineligible' }, authorization: 'session_expired' });
  expect(parseStatus(closed, owner.runId)).toMatchObject({ revision: 0, terminal: { tick: 0, outcome: 'incomplete' },
    verified: { tick: 0, batches: 0 }, payment: { state: 'ineligible' } });
});
