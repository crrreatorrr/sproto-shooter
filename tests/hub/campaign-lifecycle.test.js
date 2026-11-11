import { expect, it, vi } from 'vitest';
import { createCampaignIssuer, createCampaignTransport } from '../../src/hub/campaignRewards/transport.js';
import { createCampaignController } from '../../src/hub/campaignRewards/controller.js';
import { parseIssued, parseStatus, mergeProgress } from '../../src/hub/campaignRewards/clientProtocol.js';
import { owner, session, frame, batch, ack, snapshot, receivedSnapshot, jsonResponse, subtle, issued, sealed } from './campaign-transport-fixtures.js';
const serverUrl = 'https://campaign.example';
const issuer = (fetchImpl, extra = {}) => createCampaignIssuer({ enabled: true, ...owner, key: 'stable-issue-key',
  canonicalBoss: 'sahil', serverUrl, getSession: () => session(), subtle, fetchImpl, ...extra });
const transport = (fetchImpl) => createCampaignTransport({ enabled: true, ...owner, serverUrl,
  getSession: () => session(), subtle, fetchImpl });
function controller(fetchImpl, options = {}) {
  let clock = 1000; const requests = [];
  const control = createCampaignController({ enabled: true, transport: transport(async (url, init) => {
    const body = JSON.parse(init.body); requests.push({ url, wire: init.body }); return fetchImpl(url, body);
  }), uploadDeadlineMs: 100000, now: () => clock, random: () => 0,
  recorderOptions: { bufferLimits: { batchFrames: 1 } }, ...options });
  return { control, requests, advance: (amount) => { clock += amount; } };
}

it('pre-run issuance is disabled by default, bounded to one stable key and never chooses protocol/seed/run ID', async () => {
  expect(() => createCampaignIssuer()).toThrow('issuer_disabled');
  const requests = []; let first = true;
  const api = issuer(async (_, init) => {
    requests.push(init.body);
    if (first) { first = false; throw new Error('lost_issue_response'); }
    return jsonResponse(issued());
  }, { maxCalls: 2 });
  await expect(api.issue()).rejects.toThrow('lost_issue_response');
  const result = await api.issue();
  expect(result.state).toBe('issued');
  expect(requests).toEqual(['{"canonicalBoss":"sahil","key":"stable-issue-key"}', '{"canonicalBoss":"sahil","key":"stable-issue-key"}']);
  await expect(api.issue()).rejects.toThrow('retry_budget_exhausted');
});

it('binds only owned supported canonical issuance after fresh empty/open/live owner status, without trusting a lease snapshot', async () => {
  const dto = issued();
  const api = issuer(async (url) => jsonResponse(url.includes('run.issue') ? dto : snapshot({ issuanceAck: dto })));
  const result = await api.issue();
  await expect(api.bindIssued({ ...result })).rejects.toThrow('unconfirmed_issuance');
  const bound = await api.bindIssued(result);
  expect(bound.startStatus).toMatchObject({ authorization: 'live', received: { tick: 0 } });
  expect(bound.issuanceAck.sessionLeaseUntil).toBe(dto.sessionLeaseUntil);
  expect(bound.transport.owner.runId).toBe(dto.runId);
  await expect(api.issue()).rejects.toThrow('issuer_closed');
});

it('server legacy selection and unsupported manifest produce explicit unsupported results without fallback', async () => {
  const dto = issued();
  const future = issuer(async () => jsonResponse({ protocol: 3, state: 'issued' }));
  expect(await future.issue()).toEqual({ state: 'unsupported_version', reason: 'unsupported_protocol' });
  const old = issuer(async () => jsonResponse({ ok: true, replay: false, paid: false, tickets: 0, ticketsMinted: 0, issuance: dto.issuance }));
  expect(await old.issue()).toEqual({ state: 'unsupported_version', reason: 'legacy_selected', protocol: 1 });
  const wrong = issuer(async () => jsonResponse(issued({ manifest: { ...dto.manifest, sha256: 'f'.repeat(64) } })));
  const unsupported = await wrong.issue();
  expect(unsupported).toEqual({ state: 'unsupported_version', reason: 'unsupported_manifest' });
  await expect(wrong.bindIssued(unsupported)).rejects.toThrow('unconfirmed_issuance');
});

it.each(['canonical_start', 'account', 'limit', 'deadline', 'boss'])('rejects mismatched issued %s before it can start simulation', async (kind) => {
  const dto = issued();
  if (kind === 'canonical_start') dto.issuance.initialStateHash = '00000000';
  if (kind === 'account') dto.issuance.accountId = owner.runId;
  if (kind === 'limit') dto.limits.runFrames++;
  if (kind === 'deadline') dto.uploadDeadline = '2026-11-11T00:46:00Z';
  if (kind === 'boss') dto.issuance.canonicalBoss = 'obama';
  const api = issuer(async () => jsonResponse(dto));
  await expect(api.issue()).rejects.toThrow('client_contract_error');
});

it.each(['expired', 'nonempty', 'different_original_session'])('historical issue acknowledgment grants no start authority for %s', async (kind) => {
  const dto = issued();
  const api = issuer(async (url) => {
    if (url.includes('run.issue')) return jsonResponse(dto);
    if (kind === 'expired') return jsonResponse(snapshot({ issuanceAck: dto, state: 'expired', authorization: 'session_expired' }));
    return jsonResponse(receivedSnapshot(batch(), { issuanceAck: dto }));
  }, kind === 'different_original_session' ? { sessionId: owner.runId, getSession: () => session({ sid: owner.runId }) } : {});
  const result = await api.issue();
  await expect(api.bindIssued(result)).rejects.toThrow(kind === 'different_original_session' ? 'identity_changed' : 'start_not_authorized');
});

it('cancels a pre-run status bind on logout and prevents parallel issue/bind slots', async () => {
  let resolve;
  const api = issuer(async (url) => url.includes('run.issue') ? jsonResponse(issued()) : new Promise((done) => { resolve = done; }));
  const result = await api.issue();
  const pending = api.bindIssued(result);
  await expect(api.issue()).rejects.toThrow('transport_busy');
  api.stop(); resolve(jsonResponse(snapshot({ issuanceAck: issued() })));
  await expect(pending).rejects.toThrow();
  expect(api.status().stopped).toBe(true);
});

it('accepts optional pre0056 status fields and exact immutable historic issue/seal DTOs after expiry', () => {
  expect(parseStatus(snapshot(), owner.runId)).toMatchObject({ issuanceAck: null, sealAck: null });
  const prior = parseStatus(snapshot({ issuanceAck: issued(), sealAck: sealed(), state: 'terminal',
    terminal: { tick: 0, outcome: 'incomplete', canonicalBoss: 'sahil' }, payment: { state: 'ineligible', reason: 'ineligible' },
    authorization: 'session_expired' }), owner.runId, owner.accountId);
  expect(prior).toMatchObject({ revision: 0, terminal: { tick: 0, outcome: 'incomplete' }, sealAck: { lastSequence: -1, lastTick: 0 } });
  expect(mergeProgress(prior, parseStatus(snapshot(), owner.runId)).sealAck).toEqual(prior.sealAck);
  expect(() => parseStatus({ ...snapshot(), issuanceAck: { ...issued(), runId: owner.accountId } }, owner.runId)).toThrow('client_contract_error');
  expect(() => parseStatus({ ...snapshot(), sealAck: sealed(0, 0) }, owner.runId)).toThrow('client_contract_error');
  expect(() => parseStatus({ ...snapshot(), sealAck: sealed(0, 1) }, owner.runId)).toThrow('client_contract_error');
  expect(parseIssued(issued({ sessionLeaseUntil: '2026-11-11T00:00:00.000001Z' })).state).toBe('issued');
  expect(() => parseIssued(issued({ protocol: 3 }))).toThrow('client_contract_error');
});

it('finishes only after every tail append receipt, and retries the identical immutable seal after unknown acceptance', async () => {
  let sealAttempts = 0;
  const fixture = controller(async (url, body) => {
    if (url.includes('run.append')) return jsonResponse(ack(body));
    if (url.includes('run.status')) return jsonResponse(receivedSnapshot(batch(1, 1), { receivedAck: null }));
    if (++sealAttempts === 1) throw new Error('lost_before_seal');
    return jsonResponse(sealed(body.lastSequence, body.lastTick));
  });
  fixture.control.record(frame(0), 0); fixture.control.record(frame(1), 1); fixture.control.finish();
  await fixture.control.pump(); expect(fixture.requests).toHaveLength(1);
  await fixture.control.pump(); expect(fixture.requests).toHaveLength(2);
  await fixture.control.pump(); expect(fixture.requests).toHaveLength(3);
  fixture.advance(250); await fixture.control.pump();
  fixture.advance(250); await fixture.control.pump();
  expect(fixture.control.status()).toMatchObject({ sealAck: { state: 'sealed', lastSequence: 1, lastTick: 2 }, recorder: { retainedFrames: 0 } });
  const requests = fixture.requests.map((r) => ({ operation: r.url.match(/run\.(\w+)/)[1], wire: r.wire }));
  expect(requests.map((r) => r.operation)).toEqual(['append', 'append', 'finish', 'status', 'finish']);
  expect(requests[2].wire).toBe(requests[4].wire);
  expect(JSON.parse(requests[2].wire)).toEqual({ protocol: 2, runId: owner.runId, lastSequence: 1, lastTick: 2 });
});

it('recovers a lost committed seal via owner status after expiry without issuing a new finish', async () => {
  const fixture = controller(async (url) => {
    if (url.includes('run.finish')) throw new Error('lost_committed_seal');
    return jsonResponse(snapshot({ state: 'terminal', sealAck: sealed(), authorization: 'session_expired',
      terminal: { tick: 0, outcome: 'incomplete', canonicalBoss: 'sahil' }, payment: { state: 'ineligible', reason: 'ineligible' } }));
  }, { uploadDeadlineMs: 1250 });
  fixture.control.finish(); await fixture.control.pump();
  fixture.advance(250); await fixture.control.pump();
  expect(fixture.control.status()).toMatchObject({ sealAck: { lastTick: 0, lastSequence: -1 },
    writesStopped: 'upload_expired', progress: { authorization: 'session_expired', payment: { state: 'ineligible' } } });
  expect(fixture.requests.filter((r) => r.url.includes('run.finish'))).toHaveLength(1);
});

it('run_closed recovers already accepted history before classification and never retransmits an unaccepted closed tail', async () => {
  let appendCalls = 0;
  const acceptedBody = { protocol: 2, runId: owner.runId, sequence: 0, tick0: 0, n: 1, frames: frame(0).frames, actions: [] };
  const fixture = controller(async (url, body) => {
    if (url.includes('run.append')) { appendCalls++; return jsonResponse({ state: 'invalid', reason: 'run_closed' }); }
    const state = receivedSnapshot(acceptedBody, { state: 'terminal', revision: 1,
      verified: { sequence: 0, tick: 1, simulationTick: 1, bytes: 16, batches: 1 },
      terminal: { tick: 1, outcome: 'clear', canonicalBoss: 'sahil' }, payment: { state: 'pending', reason: null },
      receivedAck: body.sequence === 0 ? ack(acceptedBody) : null });
    return jsonResponse(state);
  });
  fixture.control.record(frame(0), 0); fixture.control.record(frame(1), 1);
  await fixture.control.pump(); fixture.advance(250); await fixture.control.pump();
  expect(fixture.control.status()).toMatchObject({ paused: false, accepted: { tick: 1 },
    recorder: { retainedFrames: 1 }, progress: { terminal: { outcome: 'clear' }, payment: { state: 'pending' } } });
  expect(appendCalls).toBe(1);
  // The next local frame remains active, never sent after server terminal.
  fixture.advance(5000); await fixture.control.pump({ poll: true });
  expect(appendCalls).toBe(1); expect(fixture.control.status().recorder.retainedFrames).toBe(1);
});

it('withholds a rejected terminal tail and polls pending→paid without burning batch retry budget or dropping inputs', async () => {
  let statusCalls = 0;
  const acceptedBody = { protocol: 2, runId: owner.runId, sequence: 0, tick0: 0, n: 1, frames: frame(0).frames, actions: [] };
  const fixture = controller(async (url, body) => {
    if (url.includes('run.append')) return jsonResponse(body.sequence === 0 ? ack(body) : { state: 'invalid', reason: 'run_closed' });
    statusCalls++;
    return jsonResponse(receivedSnapshot(acceptedBody, { receivedAck: null, state: 'terminal', revision: 1,
      verified: { sequence: 0, tick: 1, simulationTick: 1, bytes: 16, batches: 1 },
      terminal: { tick: 1, outcome: 'clear', canonicalBoss: 'sahil' },
      payment: statusCalls < 3 ? { state: 'pending', reason: null } : { state: 'paid', tickets: 20 } }));
  });
  for (let i = 0; i < 3; i++) fixture.control.record(frame(i), i);
  await fixture.control.pump(); await fixture.control.pump(); fixture.advance(250); await fixture.control.pump();
  const held = fixture.control.status();
  expect(held).toMatchObject({ paused: false, withheldTail: true, batchCalls: 2, recorder: { totalFrames: 3, retainedFrames: 2 } });
  const before = fixture.requests.length; await fixture.control.pump(); expect(fixture.requests).toHaveLength(before);
  fixture.advance(5000); await fixture.control.pump(); fixture.advance(5000); await fixture.control.pump();
  expect(fixture.control.status()).toMatchObject({ paused: false, withheldTail: true, batchCalls: 2,
    progress: { payment: { state: 'paid', tickets: 20 } }, recorder: { retainedFrames: 2 } });
  expect(fixture.requests.filter((r) => r.url.includes('run.append'))).toHaveLength(2);
});

it('conflicting seal acknowledgments stop with retained evidence and never become payment', async () => {
  const fixture = controller(async () => jsonResponse(sealed(0, 1)));
  fixture.control.finish(); await fixture.control.pump();
  expect(fixture.control.status()).toMatchObject({ paused: true, problem: 'receipt_conflict', sealAck: null, progress: null });
  const raw = transport(async () => jsonResponse(sealed()));
  await expect(raw.finish({ body: { lastSequence: -1, lastTick: 0 } })).rejects.toThrow('unprepared_finish');
});


it('maps existing generic SDK body auth errors to explicit denial without treating them as transport success', async () => {
  const api = issuer(async () => jsonResponse({ error: 'session_closed', message: 'original session is closed' }));
  expect(await api.issue()).toEqual({ state: 'authorization_denied', reason: 'session_closed' });
});
