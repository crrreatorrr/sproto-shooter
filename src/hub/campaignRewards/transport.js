import { createNakamaClient } from '@metaverse/hub-sdk';
import { captureBatch, parseFailure, parseReceived, parseStatus, UUID } from './clientProtocol.js';
import { finiteLimit, recorderError } from './storage.js';
const RPC = Object.freeze({ append: 'shooter.run.append', status: 'shooter.run.status' });

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

export function createCampaignTransport({ enabled = false, accountId, sessionId, runId, serverUrl,
  getSession, fetchImpl = fetch, deadlineMs, maxResponseBytes, subtle = globalThis.crypto?.subtle } = {}) {
  if (enabled !== true) throw recorderError('transport_disabled');
  if (![accountId, sessionId, runId].every((id) => typeof id === 'string' && UUID.test(id)) || typeof getSession !== 'function' || !subtle) throw recorderError('invalid_transport');
  const owner = Object.freeze({ accountId, runId });
  const wire = boundedCampaignFetch({ serverUrl, fetchImpl, deadlineMs, maxResponseBytes });
  const client = createNakamaClient({ serverUrl, fetchImpl: wire.fetch });
  const prepared = new WeakSet(), proofs = new WeakMap(), bindingCache = { token: null, claims: null };
  let closed = false, busy = false, epoch = 0;
  function current(write) {
    if (closed) throw recorderError('transport_suspended');
    return binding(getSession(), accountId, sessionId, write, bindingCache);
  }
  function checkPrepared(batch) { if (!prepared.has(batch)) throw recorderError('unprepared_batch'); }
  function confirm(receipt, batch) {
    if (receipt.sequence !== batch.body.sequence || receipt.tick0 !== batch.body.tick0 || receipt.n !== batch.body.n
      || receipt.digest !== batch.digest) throw recorderError('receipt_conflict');
    proofs.set(receipt, batch);
    return receipt;
  }
  async function rpc(id, body, write) {
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
  }
  return Object.freeze({
    owner,
    async prepare(batch) {
      current(false); const generation = epoch;
      const body = captureBatch(batch, runId), text = JSON.stringify(body);
      const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(text));
      current(false);
      if (generation !== epoch) throw recorderError('identity_changed');
      const digest = Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('');
      const result = Object.freeze({ body, wire: text, digest }); prepared.add(result); return result;
    },
    async append(batch) {
      checkPrepared(batch);
      const result = await rpc(RPC.append, batch.body, true);
      return result?.state === 'received' ? confirm(parseReceived(result, runId), batch) : parseFailure(result);
    },
    async status(batch = null) {
      if (batch) checkPrepared(batch);
      const result = await rpc(RPC.status, batch ? { runId, sequence: batch.body.sequence } : { runId }, false);
      if (!result || typeof result !== 'object' || !('received' in result)) return parseFailure(result);
      const snapshot = parseStatus(result, runId);
      if (snapshot.receivedAck && batch) confirm(snapshot.receivedAck, batch);
      return snapshot;
    },
    acceptReceipt(receipt, batch) {
      const proof = proofs.get(receipt);
      if (!proof || proof.body.runId !== batch.runId || proof.body.sequence !== batch.sequence
        || proof.body.tick0 !== batch.tick0 || proof.body.n !== batch.n || proof.body.frames !== batch.frames
        || proof.body.actions.length !== batch.actions.length) return false;
      return proof.body.actions.every((row, i) => row[0] === batch.actions[i][0] && row[1] === batch.actions[i][1]);
    },
    assertWriteBinding() { current(true); },
    suspend() { closed = true; epoch++; bindingCache.token = null; bindingCache.claims = null; wire.cancel(); },
    issue() { throw recorderError('issuance_unavailable'); },
    finish() { throw recorderError('finish_unavailable'); },
  });
}
