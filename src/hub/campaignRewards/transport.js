import { createNakamaClient } from '@metaverse/hub-sdk';
import { captureBatch, parseFailure, parseReceived, parseStatus, parseIssued, parseSealed, legacySelected, supportsManifest, captureHighwater, UUID } from './clientProtocol.js';
import { finiteLimit, recorderError } from './storage.js';
const RPC = Object.freeze({ append: 'shooter.run.append', status: 'shooter.run.status',
  issue: 'shooter.run.issue', finish: 'shooter.run.finish' });

/** Dedicated generic SDK fetch seam: bounded body, deadline through body read,
 * no redirects or parallel requests. Injected fetch must respect AbortSignal;
 * if it does not, the occupied slot remains blocked, rather than spawning work.
 */
export function boundedCampaignFetch({ serverUrl, fetchImpl = fetch, deadlineMs = 10000, maxResponseBytes = 65536 }) {
  finiteLimit(deadlineMs, 30000); finiteLimit(maxResponseBytes, 65536);
  const base = new URL(serverUrl);
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/'
    || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw recorderError('invalid_origin');
  let active = null;
  return Object.freeze({
    cancel() { active?.abort(); },
    async fetch(input, init) {
      const url = new URL(input);
      if (url.origin !== base.origin || !Object.values(RPC).some((rpc) => url.pathname === `/v2/rpc/${rpc}`)
        || url.search !== '?unwrap=true' || init?.method !== 'POST' || active) throw recorderError('transport_refused');
      const abort = new AbortController(); active = abort;
      let reader = null, timedOut = false;
      const timer = setTimeout(() => { timedOut = true; abort.abort(); void reader?.cancel().catch(() => {}); }, deadlineMs);
      try {
        const response = await fetchImpl(input, { ...init, redirect: 'error', signal: abort.signal });
        if (abort.signal.aborted) throw recorderError('transport_cancelled');
        const declared = response.headers.get('content-length');
        if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxResponseBytes)) {
          void response.body?.cancel().catch(() => {}); throw recorderError('response_oversized');
        }
        const buffer = new Uint8Array(maxResponseBytes); let bytes = 0, reads = 0;
        if (response.body) {
          reader = response.body.getReader();
          while (true) {
            if (++reads > 4096) { void reader.cancel().catch(() => {}); throw recorderError('response_oversized'); }
            const item = await reader.read();
            if (abort.signal.aborted) throw recorderError('transport_cancelled');
            if (item.done) break;
            bytes += item.value.byteLength;
            if (bytes > maxResponseBytes) { void reader.cancel().catch(() => {}); abort.abort(); throw recorderError('response_oversized'); }
            buffer.set(item.value, bytes - item.value.byteLength);
          }
        }
        return new Response(bytes ? buffer.slice(0, bytes) : null, { status: response.status, statusText: response.statusText,
          headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        if (timedOut) throw recorderError('transport_timeout');
        throw error;
      } finally { clearTimeout(timer); reader?.releaseLock(); active = null; }
    },
  });
}

function binding(session, accountId, originalSessionId, write, cache) {
  if (!session || session.playerId !== accountId || typeof session.token !== 'string' || session.token.length > 32768) throw recorderError('identity_changed');
  if (cache.token !== session.token) {
    let claims;
    try {
      const part = session.token.split('.')[1];
      claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { throw recorderError('identity_changed'); }
    // Keep only fixed binding booleans; no arbitrary claims graph. Token decode
    // runs once per token change, rather than JSON parsing in every input tick.
    cache.claims = { owner: claims.uid === accountId, originalGame: claims.vrs?.scope === 'game'
      && claims.vrs?.game === 'sproto-shooter', originalSession: claims.vrs?.sid === originalSessionId };
    cache.token = session.token;
  }
  if (!cache.claims.owner || (write && (session.game !== 'sproto-shooter' || !cache.claims.originalGame
    || !cache.claims.originalSession))) throw recorderError('identity_changed');
  return session.token;
}

// Private generic RPC channel, shared by pre-run issuance and bound uploads.
// Each capability has one slot; the issuer is closed before returning a bound
// start capability. No generic arbitrary-RPC method is exposed to consumers.
function createChannel({ accountId, sessionId, serverUrl, getSession, fetchImpl = fetch, deadlineMs, maxResponseBytes }) {
  if (![accountId, sessionId].every((id) => typeof id === 'string' && UUID.test(id)) || typeof getSession !== 'function') throw recorderError('invalid_transport');
  const wire = boundedCampaignFetch({ serverUrl, fetchImpl, deadlineMs, maxResponseBytes });
  const client = createNakamaClient({ serverUrl, fetchImpl: wire.fetch });
  const cache = { token: null, claims: null };
  let closed = false, busy = false, epoch = 0;
  function current(write) {
    if (closed) throw recorderError('transport_suspended');
    return binding(getSession(), accountId, sessionId, write, cache);
  }
  return Object.freeze({
    current,
    generation: () => epoch,
    suspend() { closed = true; epoch++; cache.token = null; cache.claims = null; wire.cancel(); },
    async rpc(id, body, write) {
      if (busy) throw recorderError('transport_busy');
      const token = current(write), generation = epoch; busy = true;
      try {
        let result;
        try { result = await client.rpc(id, body, { token }); }
        catch (error) {
          if (error instanceof SyntaxError) throw recorderError('client_contract_error');
          if (error?.status !== 401 && error?.status !== 403) throw error;
          result = { protocol: 2, state: 'authorization_denied', reason: 'unauthorized', ticketsMinted: 0 };
        }
        current(write);
        if (generation !== epoch) throw recorderError('identity_changed');
        return result;
      } finally { busy = false; }
    },
  });
}

export function createCampaignTransport(options = {}) {
  const { enabled = false, accountId, runId, subtle = globalThis.crypto?.subtle } = options;
  if (enabled !== true) throw recorderError('transport_disabled');
  if (typeof runId !== 'string' || !UUID.test(runId) || !subtle) throw recorderError('invalid_transport');
  const channel = createChannel(options), owner = Object.freeze({ accountId, runId });
  const prepared = new WeakSet(), proofs = new WeakMap(), finishRequests = new WeakSet();
  let knownIssue = null;
  function checkPrepared(batch) { if (!prepared.has(batch)) throw recorderError('unprepared_batch'); }
  function checkFinish(request) { if (!finishRequests.has(request)) throw recorderError('unprepared_finish'); }
  function confirm(receipt, batch) {
    if (receipt.sequence !== batch.body.sequence || receipt.tick0 !== batch.body.tick0 || receipt.n !== batch.body.n
      || receipt.digest !== batch.digest) throw recorderError('receipt_conflict');
    proofs.set(receipt, batch); return receipt;
  }
  function confirmSeal(ack, request) {
    if (ack.lastSequence !== request.body.lastSequence || ack.lastTick !== request.body.lastTick) throw recorderError('receipt_conflict');
    return ack;
  }
  return Object.freeze({
    owner,
    async prepare(batch) {
      channel.current(false); const generation = channel.generation();
      const body = captureBatch(batch, runId), text = JSON.stringify(body);
      const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(text));
      channel.current(false);
      if (generation !== channel.generation()) throw recorderError('identity_changed');
      const digest = Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('');
      const result = Object.freeze({ body, wire: text, digest }); prepared.add(result); return result;
    },
    async append(batch) {
      checkPrepared(batch);
      const result = await channel.rpc(RPC.append, batch.body, true);
      return result?.state === 'received' ? confirm(parseReceived(result, runId), batch) : parseFailure(result);
    },
    async status(batch = null, finishRequest = null) {
      if (batch) checkPrepared(batch);
      if (finishRequest) checkFinish(finishRequest);
      const result = await channel.rpc(RPC.status, batch ? { runId, sequence: batch.body.sequence } : { runId }, false);
      if (!result || typeof result !== 'object' || !('received' in result)) return parseFailure(result);
      const snapshot = parseStatus(result, runId, accountId, knownIssue);
      if (snapshot.issuanceAck) knownIssue = snapshot.issuanceAck;
      if (snapshot.receivedAck && batch) confirm(snapshot.receivedAck, batch);
      if (snapshot.sealAck && finishRequest) confirmSeal(snapshot.sealAck, finishRequest);
      return snapshot;
    },
    acceptReceipt(receipt, batch) {
      const proof = proofs.get(receipt);
      if (!proof || proof.body.runId !== batch.runId || proof.body.sequence !== batch.sequence
        || proof.body.tick0 !== batch.tick0 || proof.body.n !== batch.n || proof.body.frames !== batch.frames
        || proof.body.actions.length !== batch.actions.length) return false;
      return proof.body.actions.every((row, i) => row[0] === batch.actions[i][0] && row[1] === batch.actions[i][1]);
    },
    prepareFinish(lastSequence, lastTick) {
      // Representation only; backend owns accepted highwater/live authorization.
      captureHighwater(lastSequence, lastTick);
      const body = Object.freeze({ lastSequence, lastTick, protocol: 2, runId });
      const result = Object.freeze({ body, wire: JSON.stringify(body) }); finishRequests.add(result); return result;
    },
    async finish(request) {
      checkFinish(request);
      const result = await channel.rpc(RPC.finish, request.body, true);
      return result?.state === 'sealed' ? confirmSeal(parseSealed(result, runId), request) : parseFailure(result);
    },
    assertWriteBinding() { channel.current(true); },
    suspend: channel.suspend,
    issue() { throw recorderError('pre_run_issuer_required'); },
  });
}

/** One stable pre-run key/boss capability. No run ID/protocol/seed is chosen
 * here. Issue retries keep the same request; a historical ack cannot start play
 * without a fresh authenticated empty/open/live owner-status confirmation.
 */
export function createCampaignIssuer(options = {}) {
  const { enabled = false, accountId, sessionId, key, canonicalBoss, maxCalls = 16 } = options;
  if (enabled !== true) throw recorderError('issuer_disabled');
  if (typeof key !== 'string' || !/^[A-Za-z0-9_.:@|\-]{1,80}$/.test(key)
    || !['sahil', 'obama', 'broccoli', 'glowie', 'tinubu'].includes(canonicalBoss)) throw recorderError('invalid_issue_request');
  finiteLimit(maxCalls, 16);
  const channel = createChannel(options), issued = new WeakSet();
  const body = Object.freeze({ canonicalBoss, key });
  let calls = 0, bound = false, stopped = false, child = null, busy = false;
  return Object.freeze({
    async issue() {
      if (bound || stopped) throw recorderError('issuer_closed');
      if (busy) throw recorderError('transport_busy');
      if (calls >= maxCalls) throw recorderError('retry_budget_exhausted');
      calls++; busy = true;
      try {
        const result = await channel.rpc(RPC.issue, body, true);
        if (result?.ok === true) return legacySelected(result, accountId);
        if (result?.state !== 'issued') return parseFailure(result);
        if (Number.isSafeInteger(result.protocol) && result.protocol > 0 && result.protocol !== 2) {
          return Object.freeze({ state: 'unsupported_version', reason: 'unsupported_protocol' });
        }
        const ack = parseIssued(result, { accountId });
        if (ack.issuance.canonicalBoss !== canonicalBoss) throw recorderError('client_contract_error');
        if (!supportsManifest(ack.manifest)) return Object.freeze({ state: 'unsupported_version', reason: 'unsupported_manifest' });
        issued.add(ack); return ack;
      } finally { busy = false; }
    },
    async bindIssued(ack) {
      if (bound || stopped || !issued.has(ack)) throw recorderError('unconfirmed_issuance');
      if (busy) throw recorderError('transport_busy');
      if (calls >= maxCalls) throw recorderError('retry_budget_exhausted');
      calls++; busy = true;
      let transport;
      try {
        channel.current(true); const generation = channel.generation();
        if (ack.issuance.sessionId !== sessionId) throw recorderError('identity_changed');
        transport = createCampaignTransport({ ...options, runId: ack.runId }); child = transport;
        const snapshot = await transport.status();
        channel.current(true);
        if (generation !== channel.generation()) throw recorderError('identity_changed');
        if (!('received' in snapshot) || snapshot.authorization !== 'live' || snapshot.state !== 'open'
          || snapshot.received.tick !== 0 || snapshot.terminal || snapshot.sealAck) {
          transport.suspend(); throw recorderError('start_not_authorized');
        }
        if (snapshot.issuanceAck && stableAcknowledgment(snapshot.issuanceAck) !== stableAcknowledgment(ack)) {
          transport.suspend(); throw recorderError('receipt_conflict');
        }
        // No cached issue-time lease is treated as present authorization. Future16
        // must still use the fixed deadline and keep original identity binding.
        bound = true; channel.suspend();
        return Object.freeze({ issuanceAck: ack, transport, startStatus: snapshot });
      } catch (error) { transport?.suspend(); child = null; throw error; }
      finally { busy = false; }
    },
    stop() { stopped = true; channel.suspend(); child?.suspend(); },
    status: () => Object.freeze({ calls, bound, stopped }),
  });
}
function stableAcknowledgment(ack) {
  // All fields here are already owned bounded DTO primitives/arrays. Compare
  // insertion-order-independent JSON using the canonical projection helper.
  return JSON.stringify([ack.protocol, ack.state, ack.runId, ack.issuedAt, ack.uploadDeadline,
    ack.sessionLeaseUntil, Object.entries(ack.manifest).sort(), Object.entries(ack.limits).sort(),
    Object.entries(ack.issuance).sort()]);
}
