// Narrow public PR07 client schema. This validates representation, not authority.
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
  if (result.batches !== result.sequence + 1 || result.bytes !== result.tick * 16) bad();
  if (verified) result.simulationTick = integer(value.simulationTick, 0, result.tick);
  else {
    result.actions = integer(value.actions, 0, 131072);
    if ((result.sequence === -1) !== (result.tick === 0) || result.actions > result.tick
      || result.actions > 32 * result.batches || result.tick > 28800 * result.batches) bad();
  }
  return Object.freeze(result);
}

export function parseStatus(value, runId) {
  keys(value, ['protocol', 'runId', 'state', 'revision', 'operational', 'received', 'verified', 'terminal', 'payment', 'authorization', 'receivedAck']);
  if (value.protocol !== 2 || value.runId !== runId) bad();
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
    if (value.payment.tickets !== 20 || terminal?.outcome !== 'clear' || verified.tick !== received.tick
      || verified.sequence !== received.sequence) bad();
    payment.tickets = 20;
  }
  else if (value.payment.tickets !== undefined) bad();
  if (value.payment.reason !== undefined) payment.reason = value.payment.reason === null ? null : reason(value.payment.reason);
  if (value.revision === 0 && verified.tick !== 0) bad();
  const receivedAck = value.receivedAck === null ? null : parseReceived(value.receivedAck, runId);
  if (receivedAck && (receivedAck.acceptedTick > received.tick || receivedAck.acceptedSequence > received.sequence)) bad();
  return Object.freeze({ protocol: 2, runId, state: member(value.state, STATES), revision: integer(value.revision, 0, Number.MAX_SAFE_INTEGER),
    received, verified, terminal, operational, payment: Object.freeze(payment),
    authorization: member(value.authorization, ['live', 'session_closed', 'session_expired', 'upload_expired', 'revoked']),
    receivedAck });
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
  if (old.terminal && next.terminal && JSON.stringify(old.terminal) !== JSON.stringify(next.terminal)) bad();
  const paymentRank = { none: 0, pending: 1, pending_retryable: 1, ineligible: 2, authorization_denied: 2, paid: 3 };
  if (old.payment.state === 'paid' && next.payment.state === 'paid' && old.payment.tickets !== next.payment.tickets) bad();
  return Object.freeze({ ...next, revision: Math.max(old.revision, next.revision), received, verified,
    terminal: old.terminal || next.terminal, payment: paymentRank[old.payment.state] > paymentRank[next.payment.state] || old.payment.state === 'paid' ? old.payment : next.payment });
}
