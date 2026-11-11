// Mocked current Hub PR07 JSON shapes. Not authenticated real-server receipts.
import { createHash, webcrypto } from 'node:crypto';
import { canonicalCommand } from '../../src/server/canonicalCommand.js';
export const owner = Object.freeze({ accountId: '00000000-0000-4000-8000-000000000001',
  sessionId: '00000000-0000-4000-8000-000000000002', runId: '00000000-0000-4000-8000-000000000003' });
export const subtle = webcrypto.subtle;
export const frame = (tick = 0) => canonicalCommand({ yaw: tick / 100, moveZ: -1, held: { fire: true } }).frame;
export function session(extra = {}) {
  const playerId = extra.playerId || owner.accountId, sid = extra.sid || owner.sessionId;
  const claims = { uid: playerId, vrs: { scope: 'game', game: 'sproto-shooter', sid } };
  return { token: `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`,
    playerId, game: 'sproto-shooter', ...extra };
}
export function batch(tick0 = 0, sequence = 0, n = 1) {
  return Object.freeze({ protocol: 2, runId: owner.runId, tick0, sequence, n,
    frames: Array.from({ length: n }, (_, i) => frame(tick0 + i).frames).join(''), actions: Object.freeze([]) });
}
export function digest(body) {
  return createHash('sha256').update(JSON.stringify({ actions: body.actions, frames: body.frames, n: body.n,
    protocol: 2, runId: body.runId, sequence: body.sequence, tick0: body.tick0 })).digest('hex');
}
export function ack(body) {
  return { protocol: 2, state: 'received', runId: body.runId, sequence: body.sequence,
    tick0: body.tick0, n: body.n, acceptedSequence: body.sequence, acceptedTick: body.tick0 + body.n,
    digest: digest(body), receivedAt: '2026-11-11T00:00:00Z' };
}
export function snapshot(extra = {}) {
  return { protocol: 2, runId: owner.runId, state: 'open', revision: 0, operational: null,
    received: { sequence: -1, tick: 0, bytes: 0, actions: 0, batches: 0 },
    verified: { sequence: -1, tick: 0, simulationTick: 0, bytes: 0, batches: 0 },
    terminal: null, payment: { state: 'none', reason: null }, authorization: 'live', receivedAck: null, ...extra };
}
export function receivedSnapshot(body, extra = {}) {
  return snapshot({ received: { sequence: body.sequence, tick: body.tick0 + body.n,
    bytes: (body.tick0 + body.n) * 16, actions: 0, batches: body.sequence + 1 }, receivedAck: ack(body), ...extra });
}
export const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
