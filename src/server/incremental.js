// Dormant private worker API. Gateway authentication, durable acceptance,
// fencing, immutable acknowledgments and settlement belong to the service.
// No client may supply ctx, issuance, manifest, accepted record or checkpoint.
import { simulate } from '../sim/simulate.js';
import { verifyStateHash, stableStringify, fnv1a } from '../sim/hash.js';
import { sha256Hex } from '../core/sha256.js';
import { bossById, contentFingerprint } from '../data/serverManifest.js';
import { buildIssuance, buildIssuedState, canonicalLoadoutOk } from './runContract.js';
import { validId, inspectValue, decodeFrames, movementDelta, LIMITS } from './protocol.js';
import { runtimeCheat, inventoryCheat, noteParts, classify, checkpointRestored } from './replayChecks.js';
import { createPrivateCheckpoint, restorePrivateCheckpoint, boundedCheckpointJSON, CHECKPOINT_LIMITS } from './checkpoint.js';

export const INCREMENTAL_VERSION = 2;
export const INCREMENTAL_LIMITS = Object.freeze({
  batchFramesTextBytes: 2097152, runFramesTextBytes: 67108864, bodyBytes: 2162688,
  batchFrames: 28800, runFrames: 162000, batches: 4096, batchActions: 32, runActions: 131072,
  depth: 12, idLength: 80,
});
const PRIVATE_LIMITS = { ...CHECKPOINT_LIMITS, string: INCREMENTAL_LIMITS.batchFramesTextBytes };
const WIRE_LIMITS = { ...CHECKPOINT_LIMITS, bytes: INCREMENTAL_LIMITS.bodyBytes, depth: INCREMENTAL_LIMITS.depth, string: INCREMENTAL_LIMITS.batchFramesTextBytes, array: 32, nodes: 1024 };
const int = (n) => Number.isSafeInteger(n) && n >= 0;
function bad(reason) { const error = new Error(reason); error.reason = reason; throw error; }
function exact(object, names) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) bad('malformed');
  const keys = Object.keys(object).sort(), expected = names.slice().sort();
  if (keys.length !== expected.length || keys.some((key, i) => key !== expected[i])) bad('malformed');
}
const equal = (a, b) => stableStringify(a) === stableStringify(b);
const bindingOf = (issuance) => ({ accountId: issuance.accountId, sessionId: issuance.sessionId, day: issuance.day, runId: issuance.runId });
function clone(value) { return boundedCheckpointJSON(value, false, PRIVATE_LIMITS); }
function resultError(reason) {
  return { publicResult: { version: 2, status: 'invalid', reason, retryable: false, eligible: false, ranked: false, ticketsMinted: 0 }, privateCheckpoint: null };
}
function guard(operation) {
  try { return operation(); } catch (error) {
    if (error.reason || error.message === 'bad_private_checkpoint') return resultError(error.reason || 'bad_private_checkpoint');
    // An unexpected engine/runtime failure is operational, not invalid play.
    return { publicResult: { version: 2, status: 'pending_retryable', reason: 'execution_failure', retryable: true,
      eligible: false, ranked: false, ticketsMinted: 0 }, privateCheckpoint: null };
  }
}
// Exposed only to make service/test canonical digest calculation unambiguous.
// SHA-256 is an identity check, not authentication of the accepted record.
export function replayBatchDigest(batch) { return sha256Hex(stableStringify(batch)); }
export function decodeReplayBatch(text) {
  if (typeof text !== 'string') bad('malformed');
  // Check UTF-8 wire size BEFORE JSON parse, including whitespace and actions.
  if (utf8Bytes(text) > INCREMENTAL_LIMITS.bodyBytes) bad('oversized');
  let parsed;
  try { parsed = JSON.parse(text); } catch { bad('malformed'); }
  let batch;
  try { batch = boundedCheckpointJSON(parsed, false, WIRE_LIMITS); } catch { bad('malformed'); }
  const hostile = inspectValue(batch); if (hostile) bad(hostile);
  exact(batch, ['protocol', 'runId', 'sequence', 'tick0', 'n', 'frames', 'actions']);
  if (batch.protocol !== 2) bad('unsupported_version');
  if (!validId(batch.runId) || !/^[\x21-\x7e]+$/.test(batch.runId) || batch.runId.length > 80) bad('malformed');
  if (!int(batch.sequence) || !int(batch.tick0) || !int(batch.n) || batch.n < 1) bad('malformed');
  if (batch.n > INCREMENTAL_LIMITS.batchFrames || typeof batch.frames !== 'string'
    || batch.frames.length > INCREMENTAL_LIMITS.batchFramesTextBytes) bad('oversized');
  // Twelve-byte frames are multiples of three: canonical encoding has exactly
  // sixteen ASCII characters per frame and never contains padding.
  if (batch.frames.length !== batch.n * 16 || !/^[A-Za-z0-9+/]+$/.test(batch.frames)) bad('malformed');
  if (!Array.isArray(batch.actions) || batch.actions.length > INCREMENTAL_LIMITS.batchActions) bad('oversized');
  let previous = -1;
  for (const action of batch.actions) {
    if (!Array.isArray(action) || action.length !== 2 || !int(action[0]) || action[0] <= previous || action[0] >= batch.n || action[1] !== 1) bad('malformed');
    previous = action[0];
  }
  // Legacy codec enforces exact canonical base64 and legal quantized values;
  // v2's 28800-frame bound fits its existing per-segment codec ceiling.
  const decoded = decodeFrames(batch.frames, batch.n, batch.actions);
  if (decoded.error) bad(decoded.error);
  return { batch, commands: decoded.commands };
}
export function utf8Bytes(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 128) n++;
    else if (c < 2048) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}
function original(ctx) {
  if (!ctx || !ctx.issuance || !ctx.manifest) bad('malformed');
  // Server-owned original protocol-1 issuance is not reinterpreted or exposed
  // through a new issuance endpoint. Rebuild and require its exact authored shape.
  const issuance = clone(ctx.issuance), manifest = clone(ctx.manifest);
  const binding = bindingOf(issuance);
  const built = buildIssuance({ ...binding, canonicalBoss: issuance.canonicalBoss, seed: issuance.seed });
  if (!built.ok || !equal(built.issuance, issuance)) bad('bad_issuance');
  if (manifest.contentFingerprint !== issuance.contentFingerprint || manifest.contentFingerprint !== contentFingerprint(1)) bad('fingerprint_mismatch');
  return { issuance, manifest, binding };
}
function checkAccounting(a, snapshot, pending, terminal, issuance) {
  exact(a, ['acceptedFrames', 'verifiedFrames', 'simFrames', 'framesTextBytes', 'verifiedFramesTextBytes', 'actions', 'verifiedActions', 'batches', 'verifiedBatches']);
  if (Object.values(a).some((n) => !int(n))) bad('bad_private_checkpoint');
  if (a.acceptedFrames > Math.min(issuance.maxFrames, INCREMENTAL_LIMITS.runFrames)
    || a.framesTextBytes > INCREMENTAL_LIMITS.runFramesTextBytes || a.actions > INCREMENTAL_LIMITS.runActions || a.batches > INCREMENTAL_LIMITS.batches
    || a.verifiedFrames > a.acceptedFrames || a.verifiedFramesTextBytes > a.framesTextBytes || a.verifiedActions > a.actions
    || a.verifiedBatches > a.batches || a.simFrames !== snapshot.state.tick || a.simFrames > a.verifiedFrames
    || a.framesTextBytes !== a.acceptedFrames * 16 || a.verifiedFramesTextBytes !== a.verifiedFrames * 16
    || a.actions > a.acceptedFrames || a.verifiedActions > a.verifiedFrames
    || a.actions > a.batches * INCREMENTAL_LIMITS.batchActions
    || a.batches > a.acceptedFrames || a.verifiedBatches > a.verifiedFrames
    || a.acceptedFrames > a.batches * INCREMENTAL_LIMITS.batchFrames
    || snapshot.counters.frames !== a.verifiedFrames || snapshot.counters.segments !== a.verifiedBatches) bad('bad_private_checkpoint');
  if (!terminal && a.simFrames !== a.verifiedFrames) bad('bad_private_checkpoint');
  if (terminal) {
    exact(terminal, ['outcome', 'reason', 'eligible', 'ranked', 'canonicalCount', 'parts', 'stateHash', 'simTick', 'inputFrame']);
    if (!['clear', 'assisted', 'fail'].includes(terminal.outcome) || terminal.simTick !== a.simFrames
      || terminal.inputFrame !== terminal.simTick || terminal.stateHash !== verifyStateHash(snapshot.state)) bad('bad_private_checkpoint');
    const expected = classify(snapshot.parts, bossById(issuance.canonicalBoss), snapshot.state.players[snapshot.state.localPlayerId].dead, snapshot.state.localPlayerId);
    if (!equal(terminal.parts, expected.parts) || terminal.outcome !== expected.outcome || terminal.reason !== expected.reason
      || terminal.eligible !== expected.eligible || terminal.ranked !== (expected.outcome === 'clear')
      || terminal.canonicalCount !== (['clear', 'assisted'].includes(expected.outcome) ? 1 : 0)) bad('bad_private_checkpoint');
  }
  if (pending) {
    exact(pending, ['batch', 'cursor', 'sha256']);
    const { batch } = decodeReplayBatch(JSON.stringify(pending.batch));
    if (!int(pending.cursor) || pending.cursor >= batch.n || pending.sha256 !== replayBatchDigest(batch)
      || batch.runId !== issuance.runId || batch.sequence !== a.batches - 1
      || batch.tick0 + batch.n !== a.acceptedFrames || batch.tick0 + pending.cursor !== a.verifiedFrames
      || batch.tick0 > a.verifiedBatches * INCREMENTAL_LIMITS.batchFrames
      || a.verifiedBatches !== a.batches - 1) bad('bad_private_checkpoint');
    const unverifiedActions = batch.actions.filter((action) => action[0] >= pending.cursor).length;
    if (a.framesTextBytes - a.verifiedFramesTextBytes !== (batch.n - pending.cursor) * 16
      || a.actions - a.verifiedActions !== unverifiedActions) bad('bad_private_checkpoint');
  } else if (a.acceptedFrames !== a.verifiedFrames || a.framesTextBytes !== a.verifiedFramesTextBytes
    || a.actions !== a.verifiedActions || a.batches !== a.verifiedBatches) bad('bad_private_checkpoint');
}
function save(state, parts, metadata, origin) {
  const body = { v: 2, issuance: origin.issuance,
    snapshot: createPrivateCheckpoint(state, { manifest: origin.manifest, binding: origin.binding, parts,
      counters: { frames: metadata.accounting.verifiedFrames, segments: metadata.accounting.verifiedBatches } }),
    accounting: metadata.accounting, pending: metadata.pending, firstTerminal: metadata.firstTerminal };
  checkAccounting(body.accounting, { state, parts, counters: body.snapshot.counters }, body.pending, body.firstTerminal, origin.issuance);
  const copy = clone(body);
  return { ...copy, privateHash: fnv1a(stableStringify(copy)) };
}
function load(checkpoint, origin) {
  const copy = clone(checkpoint);
  exact(copy, ['v', 'issuance', 'snapshot', 'accounting', 'pending', 'firstTerminal', 'privateHash']);
  const { privateHash, ...body } = copy;
  if (body.v !== 2 || privateHash !== fnv1a(stableStringify(body)) || !equal(body.issuance, origin.issuance)) bad('bad_private_checkpoint');
  const restored = restorePrivateCheckpoint(body.snapshot, { manifest: origin.manifest, binding: origin.binding });
  const cheat = runtimeCheat(restored.state) || inventoryCheat(restored.state); if (cheat) bad(cheat);
  checkAccounting(body.accounting, restored, body.pending, body.firstTerminal, origin.issuance);
  return { ...body, state: restored.state, parts: restored.parts };
}
function response(checkpoint, status, reason, retryable = false) {
  const a = checkpoint.accounting, terminal = checkpoint.firstTerminal;
  return { privateCheckpoint: checkpoint, publicResult: {
    version: 2, status, reason, retryable, ticketsMinted: 0,
    eligible: !!terminal?.eligible, ranked: !!terminal?.ranked,
    acceptedInputTick: a.acceptedFrames, verifiedInputTick: a.verifiedFrames, simulationTick: a.simFrames,
    acceptedBatches: a.batches, verifiedBatches: a.verifiedBatches,
    framesTextBytes: a.framesTextBytes, verifiedFramesTextBytes: a.verifiedFramesTextBytes,
    actions: a.actions, verifiedActions: a.verifiedActions,
    terminal: terminal ? clone(terminal) : null,
  } };
}
export function beginIncrementalReplay(ctx) {
  return guard(() => {
    const origin = original(ctx), state = buildIssuedState(origin.issuance);
    if (!canonicalLoadoutOk(state) || verifyStateHash(state) !== origin.issuance.initialStateHash) bad('bad_start');
    const parts = {}; noteParts(parts, state, bossById(origin.issuance.canonicalBoss));
    const accounting = { acceptedFrames: 0, verifiedFrames: 0, simFrames: 0, framesTextBytes: 0, verifiedFramesTextBytes: 0, actions: 0, verifiedActions: 0, batches: 0, verifiedBatches: 0 };
    return response(save(state, parts, { accounting, pending: null, firstTerminal: null }, origin), 'verified', 'ready');
  });
}
export function acceptReplayBatch(text, checkpoint, ctx) {
  return guard(() => {
    const origin = original(ctx), current = load(checkpoint, origin);
    if (current.pending) bad('pending_batch');
    const { batch } = decodeReplayBatch(text), a = current.accounting;
    if (batch.runId !== origin.issuance.runId) bad('rebind');
    if (batch.sequence !== a.batches || batch.tick0 !== a.acceptedFrames) bad('history_conflict');
    // The service authenticates the origin of this immutable claimed record.
    // Pure code can verify its content identity, never its provenance.
    const accepted = clone(ctx.accepted);
    exact(accepted, ['runId', 'sequence', 'tick0', 'n', 'sha256', 'binding', 'acceptedBeforeTerminal']);
    if (accepted.runId !== batch.runId || accepted.sequence !== batch.sequence || accepted.tick0 !== batch.tick0 || accepted.n !== batch.n
      || accepted.sha256 !== replayBatchDigest(batch) || !equal(accepted.binding, origin.binding) || typeof accepted.acceptedBeforeTerminal !== 'boolean') bad('bad_accepted_record');
    if (current.firstTerminal && !accepted.acceptedBeforeTerminal) bad('terminal_closed');
    if (a.acceptedFrames + batch.n > Math.min(origin.issuance.maxFrames, INCREMENTAL_LIMITS.runFrames)
      || a.framesTextBytes + batch.frames.length > INCREMENTAL_LIMITS.runFramesTextBytes
      || a.actions + batch.actions.length > INCREMENTAL_LIMITS.runActions || a.batches + 1 > INCREMENTAL_LIMITS.batches) bad('oversized');
    a.acceptedFrames += batch.n; a.framesTextBytes += batch.frames.length; a.actions += batch.actions.length; a.batches++;
    const pending = { batch, cursor: 0, sha256: accepted.sha256 };
    return response(save(current.state, current.parts, { ...current, pending }, origin), 'received', 'accepted');
  });
}
export function stepReplaySlice(checkpoint, ctx) {
  return guard(() => {
    const clock = typeof ctx?.clock === 'function' ? ctx.clock : () => Date.now();
    const started = clock();
    const origin = original(ctx), current = load(checkpoint, origin);
    const work = ctx.maxWorkFrames;
    if (!int(work) || work < 1 || work > INCREMENTAL_LIMITS.batchFrames) bad('bad_work_limit');
    if (!current.pending) return response(checkpoint, current.firstTerminal ? 'terminal_verified' : 'verified', 'idle');
    const pending = current.pending;
    const { commands } = decodeReplayBatch(JSON.stringify(pending.batch));
    const boss = bossById(origin.issuance.canonicalBoss), playerId = current.state.localPlayerId;
    let timedOut = false, count = 0;
    while (pending.cursor < pending.batch.n && count < work) {
      // A timeout is operational pending, never a deterministic invalid receipt.
      // Budget is the unchanged legacy ceiling; service may impose less via work.
      if (clock() - started >= LIMITS.maxCpuMs) { timedOut = true; break; }
      const index = pending.cursor;
      if (!current.firstTerminal) {
        const before = { ...current.state.players[playerId].pos };
        simulate(current.state, { [playerId]: commands[index] });
        const moved = movementDelta(before, current.state.players[playerId].pos);
        if (moved && !checkpointRestored(current.state)) bad(moved);
        const cheat = runtimeCheat(current.state) || inventoryCheat(current.state); if (cheat) bad(cheat);
        noteParts(current.parts, current.state, boss);
        const end = classify(current.parts, boss, current.state.players[playerId].dead, playerId);
        current.accounting.simFrames = current.state.tick;
        if (end.outcome !== 'incomplete') current.firstTerminal = {
          ...end, ranked: end.outcome === 'clear', canonicalCount: ['clear', 'assisted'].includes(end.outcome) ? 1 : 0,
          stateHash: verifyStateHash(current.state), simTick: current.state.tick, inputFrame: current.accounting.verifiedFrames + 1,
        };
      }
      pending.cursor++; count++;
      current.accounting.verifiedFrames++;
      current.accounting.verifiedFramesTextBytes += 16;
      if (pending.batch.actions.some((action) => action[0] === index)) current.accounting.verifiedActions++;
    }
    if (pending.cursor === pending.batch.n) { current.pending = null; current.accounting.verifiedBatches++; }
    const next = save(current.state, current.parts, current, origin);
    return response(next, timedOut ? 'pending_retryable' : current.pending ? 'received' : current.firstTerminal ? 'terminal_verified' : 'verified',
      timedOut ? 'execution_timeout' : current.pending ? 'slice_complete' : current.firstTerminal?.reason || 'boss_alive', timedOut);
  });
}
// Whitelist only; never spread a worker return into a public response. Calling
// this serializer cannot execute replay or grant authority to client context.
export function publicReplayJSON(workerResult) {
  const p = workerResult.publicResult;
  const out = {};
  for (const key of ['version', 'status', 'reason', 'retryable', 'eligible', 'ranked', 'ticketsMinted',
    'acceptedInputTick', 'verifiedInputTick', 'simulationTick', 'acceptedBatches', 'verifiedBatches',
    'framesTextBytes', 'verifiedFramesTextBytes', 'actions', 'verifiedActions']) if (p[key] !== undefined) out[key] = p[key];
  if (p.terminal) {
    out.terminal = {};
    for (const key of ['outcome', 'reason', 'eligible', 'ranked', 'canonicalCount', 'stateHash', 'simTick', 'inputFrame']) out.terminal[key] = p.terminal[key];
  } else out.terminal = null;
  return JSON.stringify(out);
}
