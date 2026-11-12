// Narrow public PR07 client schema. This validates representation, not authority.
import { buildIssuance } from '../../server/runContract.js';
import { stableStringify } from '../../sim/hash.js';
import { decodeFrames } from '../../server/protocol.js';
import { frozenData, recorderError } from './storage.js';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATES = ['open', 'sealed', 'terminal', 'expired', 'invalid', 'quarantined'];
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
function bad() { throw recorderError('client_contract_error'); }
function object(o) { if (!o || typeof o !== 'object' || Array.isArray(o)) bad(); return o; }
function keys(o, required, optional = []) {
  object(o);
  if (required.some((k) => !own(o, k)) || Object.keys(o).some((k) => !required.includes(k) && !optional.includes(k))) bad();
}
function integer(n, min, max) { if (!Number.isSafeInteger(n) || n < min || n > max) bad(); return n; }
function member(value, allowed) { if (!allowed.includes(value)) bad(); return value; }
function reason(value) { if (typeof value !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/.test(value)) bad(); return value; }

export function captureBatch(batch, runId) {
  const n = frozenData(batch, 'n'), frames = frozenData(batch, 'frames');
  const sequence = frozenData(batch, 'sequence'), tick0 = frozenData(batch, 'tick0');
  if (frozenData(batch, 'protocol') !== 2 || frozenData(batch, 'runId') !== runId || !UUID.test(runId)) bad();
  integer(n, 1, 28800); integer(sequence, 0, 4095); integer(tick0, 0, 161999);
  if (tick0 + n > 162000 || typeof frames !== 'string' || frames.length !== n * 16 || frames.length > 2097152) bad();
  const source = frozenData(batch, 'actions');
  if (!Array.isArray(source)) bad();
  const count = integer(frozenData(source, 'length'), 0, 32);
  const actions = [];
  for (let i = 0; i < count; i++) {
    const row = frozenData(source, String(i));
    if (!Array.isArray(row) || frozenData(row, 'length') !== 2) bad();
    actions.push(Object.freeze([frozenData(row, '0'), frozenData(row, '1')]));
  }
  if (decodeFrames(frames, n, actions).error) bad();
  // Exact alphabetical property order used by the Hub SHA256 contract.
  return Object.freeze({ actions: Object.freeze(actions), frames, n, protocol: 2, runId, sequence, tick0 });
}

export function parseReceived(value, runId) {
  keys(value, ['protocol', 'state', 'runId', 'sequence', 'tick0', 'n', 'acceptedSequence', 'acceptedTick', 'digest', 'receivedAt']);
  if (value.protocol !== 2 || value.state !== 'received' || value.runId !== runId) bad();
  const sequence = integer(value.sequence, 0, 4095), tick0 = integer(value.tick0, 0, 161999), n = integer(value.n, 1, 28800);
  if (tick0 + n > 162000 || value.acceptedSequence !== sequence || value.acceptedTick !== tick0 + n
    || typeof value.digest !== 'string' || !/^[0-9a-f]{64}$/.test(value.digest)
    || typeof value.receivedAt !== 'string' || value.receivedAt.length > 80 || !Number.isFinite(Date.parse(value.receivedAt))) bad();
  return Object.freeze({ protocol: 2, state: 'received', runId, sequence, tick0, n,
    acceptedSequence: sequence, acceptedTick: tick0 + n, digest: value.digest, receivedAt: value.receivedAt });
}

export function parseFailure(value) {
  keys(value, ['state', 'reason'], ['protocol', 'ticketsMinted', 'retryAfterMs']);
  if (value.protocol !== undefined && value.protocol !== 2) bad();
  if (value.ticketsMinted !== undefined && value.ticketsMinted !== 0) bad();
  member(value.state, ['pending_retryable', 'authorization_denied', 'invalid']);
  const result = { state: value.state, reason: reason(value.reason) };
  if (value.retryAfterMs !== undefined) result.retryAfterMs = integer(value.retryAfterMs, 0, 86400000);
  return Object.freeze(result);
}

function cursor(value, verified) {
  keys(value, verified ? ['sequence', 'tick', 'simulationTick', 'bytes', 'batches'] : ['sequence', 'tick', 'bytes', 'actions', 'batches']);
  const result = { sequence: integer(value.sequence, -1, 4095), tick: integer(value.tick, 0, 162000),
    bytes: integer(value.bytes, 0, 67108864), batches: integer(value.batches, 0, 4096) };
  if (result.batches !== result.sequence + 1 || result.batches > result.tick || result.bytes !== result.tick * 16) bad();
  if (verified) result.simulationTick = integer(value.simulationTick, 0, result.tick);
  else {
    result.actions = integer(value.actions, 0, 131072);
    if ((result.sequence === -1) !== (result.tick === 0) || result.actions > result.tick
      || result.actions > 32 * result.batches || result.tick > 28800 * result.batches) bad();
  }
  return Object.freeze(result);
}

export function parseStatus(value, runId, accountId = null, knownIssued = null) {
  keys(value, ['protocol', 'runId', 'state', 'revision', 'operational', 'received', 'verified', 'terminal', 'payment', 'authorization', 'receivedAck'], ['issuanceAck', 'sealAck']);
  if (value.protocol !== 2 || value.runId !== runId) bad();
  const revision = integer(value.revision, 0, Number.MAX_SAFE_INTEGER);
  const received = cursor(value.received, false), verified = cursor(value.verified, true);
  if (verified.tick > received.tick || verified.sequence > received.sequence || verified.bytes > received.bytes) bad();
  let terminal = null, operational = null;
  if (value.terminal !== null) {
    keys(value.terminal, ['tick', 'outcome', 'canonicalBoss']);
    const tick = integer(value.terminal.tick, 0, verified.simulationTick);
    if (tick !== verified.simulationTick) bad();
    terminal = Object.freeze({ tick, outcome: member(value.terminal.outcome, ['clear', 'assisted', 'fail', 'fled', 'incomplete']),
      canonicalBoss: member(value.terminal.canonicalBoss, ['sahil', 'obama', 'broccoli', 'glowie', 'tinubu']) });
  }
  if (value.operational !== null) {
    keys(value.operational, ['state', 'reason', 'supportRequired']);
    if (value.operational.state !== 'pending_retryable' || value.operational.supportRequired !== true) bad();
    operational = Object.freeze({ state: 'pending_retryable', reason: reason(value.operational.reason), supportRequired: true });
  }
  const paymentState = member(value.payment?.state, ['none', 'pending', 'paid', 'ineligible', 'authorization_denied', 'pending_retryable']);
  keys(value.payment, ['state'], ['reason', 'tickets']);
  const payment = { state: paymentState };
  if (paymentState === 'paid') {
    if (value.payment.tickets !== 20 || terminal?.outcome !== 'clear' || verified.tick < 1 || revision < 1 || verified.tick !== received.tick
      || verified.sequence !== received.sequence) bad();
    payment.tickets = 20;
  }
  else if (value.payment.tickets !== undefined) bad();
  if (value.payment.reason !== undefined) payment.reason = value.payment.reason === null ? null : reason(value.payment.reason);
  if (revision === 0 && verified.tick !== 0) bad();
  const receivedAck = value.receivedAck === null ? null : parseReceived(value.receivedAck, runId);
  if (receivedAck && (receivedAck.acceptedTick > received.tick || receivedAck.acceptedSequence > received.sequence)) bad();
  const sealAck = value.sealAck == null ? null : parseSealed(value.sealAck, runId);
  if (sealAck && (sealAck.lastSequence !== received.sequence || sealAck.lastTick !== received.tick)) bad();
  let issuanceAck = null;
  if (value.issuanceAck != null) {
    if (knownIssued) {
      if (!sameOwnedShape(value.issuanceAck, knownIssued)) throw recorderError('receipt_conflict');
      issuanceAck = knownIssued;
    } else issuanceAck = parseIssued(value.issuanceAck, { runId, accountId });
  }
  return Object.freeze({ protocol: 2, runId, state: member(value.state, STATES), revision,
    received, verified, terminal, operational, payment: Object.freeze(payment),
    authorization: member(value.authorization, ['live', 'session_closed', 'session_expired', 'upload_expired', 'revoked']),
    receivedAck, issuanceAck,
    sealAck });
}

function newerCursor(old, next) {
  const fields = Object.keys(old);
  const someNewer = fields.some((k) => next[k] > old[k]), someOlder = fields.some((k) => next[k] < old[k]);
  if (someNewer && someOlder) bad();
  return someOlder ? old : next;
}

/** Pure projection merge; callers must authenticate/validate snapshots first.
 * Accepted counters can advance WITHOUT verified revision advancing.
 */
export function mergeProgress(old, next) {
  if (!old) return next;
  const received = newerCursor(old.received, next.received);
  const changedVerified = Object.keys(old.verified).some((key) => old.verified[key] !== next.verified[key]);
  if (next.revision === old.revision && changedVerified) bad();
  if (next.revision > old.revision && Object.keys(old.verified).some((key) => next.verified[key] < old.verified[key])) bad();
  const verified = next.revision < old.revision ? old.verified : next.verified;
  for (const field of ['issuanceAck', 'sealAck']) {
    if (old[field] && next[field] && stableStringify(old[field]) !== stableStringify(next[field])) throw recorderError('receipt_conflict');
  }
  if (old.terminal && next.terminal && JSON.stringify(old.terminal) !== JSON.stringify(next.terminal)) bad();
  const paymentRank = { none: 0, pending: 1, pending_retryable: 1, ineligible: 2, authorization_denied: 2, paid: 3 };
  if (old.payment.state === 'paid' && next.payment.state === 'paid' && old.payment.tickets !== next.payment.tickets) bad();
  return Object.freeze({ ...next, revision: Math.max(old.revision, next.revision), received, verified,
    issuanceAck: old.issuanceAck || next.issuanceAck || null, sealAck: old.sealAck || next.sealAck || null,
    terminal: old.terminal || next.terminal, payment: paymentRank[old.payment.state] > paymentRank[next.payment.state] || old.payment.state === 'paid' ? old.payment : next.payment });
}


// Exact retained campaign verifier for this client’s simulation. The hub must
// register this bundle before issuing rewarded runs to this client.
export const SUPPORTED_MANIFEST = Object.freeze({ artifact: 'shooter-sim',
  sourceCommit: 'e063f8a5be736031aa4c4b803ab46bf66c814e65',
  sha256: '12332a4d2f34b8a282d0426d474698db978c1676bf86ba2c23ab6d826fb8ceed',
  protocol: 1, contentFingerprint: '73c6eb0f', uploadProtocol: 2, replayApiVersion: 2,
  checkpointSchema: 2, economyPolicy: 1 });
export const ISSUED_LIMITS = Object.freeze({ batchFramesTextBytes: 2097152, runFramesTextBytes: 67108864,
  bodyBytes: 2162688, batchFrames: 28800, runFrames: 162000, batches: 4096, batchActions: 32,
  runActions: 131072, depth: 12, idLength: 80 });
export function supportsManifest(manifest) {
  return Object.entries(SUPPORTED_MANIFEST).every(([key, value]) => manifest[key] === value);
}
function timestamp(value) {
  if (typeof value !== 'string' || value.length > 80
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value)
    || !Number.isFinite(Date.parse(value))) bad();
  return value;
}
function manifest(value) {
  keys(value, Object.keys(SUPPORTED_MANIFEST));
  if (typeof value.artifact !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.artifact)
    || typeof value.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/.test(value.sourceCommit)
    || typeof value.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(value.sha256)
    || typeof value.contentFingerprint !== 'string' || !/^[0-9a-f]{8}$/.test(value.contentFingerprint)) bad();
  const copy = { artifact: value.artifact, sourceCommit: value.sourceCommit, sha256: value.sha256,
    contentFingerprint: value.contentFingerprint };
  for (const key of ['protocol', 'uploadProtocol', 'replayApiVersion', 'checkpointSchema', 'economyPolicy']) copy[key] = integer(value[key], 1, 1000);
  return Object.freeze(copy);
}
function canonicalIssuance(value, expected) {
  object(value);
  if (!UUID.test(value.runId) || !UUID.test(value.accountId) || !UUID.test(value.sessionId)
    || (expected.runId && expected.runId !== value.runId) || (expected.accountId && expected.accountId !== value.accountId)) bad();
  const built = buildIssuance({ accountId: value.accountId, sessionId: value.sessionId, runId: value.runId,
    day: value.day, canonicalBoss: value.canonicalBoss, seed: value.seed });
  if (!built.ok) bad();
  keys(value, Object.keys(built.issuance));
  if (!sameOwnedShape(value, built.issuance)) bad();
  return Object.freeze({ ...built.issuance, parts: Object.freeze([...built.issuance.parts]),
    distinctFrom: Object.freeze([...built.issuance.distinctFrom]) });
}
export function parseIssued(value, expected = {}) {
  keys(value, ['protocol', 'state', 'runId', 'issuance', 'manifest', 'issuedAt', 'uploadDeadline', 'sessionLeaseUntil', 'limits']);
  if (value.protocol !== 2 || value.state !== 'issued' || !UUID.test(value.runId)
    || (expected.runId && value.runId !== expected.runId)) bad();
  const issuance = canonicalIssuance(value.issuance, { ...expected, runId: value.runId });
  const issuedAt = timestamp(value.issuedAt), uploadDeadline = timestamp(value.uploadDeadline), sessionLeaseUntil = timestamp(value.sessionLeaseUntil);
  if (Date.parse(uploadDeadline) - Date.parse(issuedAt) !== 45 * 60 * 1000 || Date.parse(sessionLeaseUntil) < Date.parse(issuedAt)) bad();
  keys(value.limits, Object.keys(ISSUED_LIMITS));
  if (Object.keys(ISSUED_LIMITS).some((key) => value.limits[key] !== ISSUED_LIMITS[key])) bad();
  return Object.freeze({ protocol: 2, state: 'issued', runId: value.runId, issuance, manifest: manifest(value.manifest),
    issuedAt, uploadDeadline, sessionLeaseUntil, limits: ISSUED_LIMITS });
}
export function legacySelected(value, accountId) {
  keys(value, ['ok', 'replay', 'paid', 'tickets', 'ticketsMinted', 'issuance']);
  if (value.ok !== true || typeof value.replay !== 'boolean' || value.paid !== false || value.tickets !== 0 || value.ticketsMinted !== 0) bad();
  canonicalIssuance(value.issuance, { accountId });
  return Object.freeze({ state: 'unsupported_version', reason: 'legacy_selected', protocol: 1 });
}
export function parseSealed(value, runId) {
  keys(value, ['protocol', 'state', 'runId', 'lastSequence', 'lastTick', 'sealedAt']);
  if (value.protocol !== 2 || value.state !== 'sealed' || value.runId !== runId) bad();
  const { lastSequence, lastTick } = captureHighwater(value.lastSequence, value.lastTick);
  return Object.freeze({ protocol: 2, state: 'sealed', runId, lastSequence, lastTick, sealedAt: timestamp(value.sealedAt) });
}

export function captureHighwater(sequence, tick) {
  const lastSequence = integer(sequence, -1, 4095), lastTick = integer(tick, 0, 162000);
  if ((lastSequence === -1) !== (lastTick === 0) || lastSequence + 1 > lastTick || lastTick > 28800 * (lastSequence + 1)) bad();
  return Object.freeze({ lastSequence, lastTick });
}

// Walk only the small already-owned expected shape. Unexpected/deep response
// graphs are rejected without recursive serialization or arbitrary traversal.
function sameOwnedShape(value, expected) {
  if (expected === null || typeof expected !== 'object') return value === expected;
  if (!value || typeof value !== 'object' || Array.isArray(value) !== Array.isArray(expected)) return false;
  if (Array.isArray(expected) && value.length !== expected.length) return false;
  const fields = Object.keys(expected);
  if (Object.keys(value).length !== fields.length) return false;
  return fields.every((key) => own(value, key) && sameOwnedShape(value[key], expected[key]));
}
