// Hostile logs. Shared by the Node matrix and the goja/browser bundle run.
import { LIMITS, logDigest } from '../src/server/protocol.js';
import { prefixLog } from './bossLog.js';

export function rejectionCases(recorded) {
  const issuance = recorded.issuance;
  const good = prefixLog(recorded, 30);
  const ctx = { issuance };
  const digest = logDigest(good);
  const gap = {
    v: 1,
    binding: good.binding,
    segments: [
      good.segments[0],
      { i: 1, from: 'aaaaaaaa', tick0: good.segments[0].n + 50, n: 1, frames: good.segments[0].frames.slice(0, 16), actions: [] },
    ],
  };
  return [
    { name: 'malformed', log: { v: 1 }, ctx, reason: 'malformed' },
    { name: 'unsupported_version', log: { ...good, v: 99 }, ctx, reason: 'unsupported_version' },
    {
      name: 'oversized',
      log: {
        ...good,
        segments: [{ ...good.segments[0], frames: 'A'.repeat(LIMITS.maxSegmentText + 4) }],
      },
      ctx,
      reason: 'oversized',
    },
    {
      name: 'nan',
      log: { ...good, segments: [{ ...good.segments[0], n: NaN }] },
      ctx,
      reason: 'nan',
    },
    {
      name: 'negative',
      log: { ...good, segments: [{ ...good.segments[0], tick0: -1 }] },
      ctx,
      reason: 'negative',
    },
    {
      name: 'teleport',
      log: { ...good, segments: [{ ...good.segments[0], frames: [{ pos: { x: 80, y: 0, z: 0 } }] }] },
      ctx,
      reason: 'teleport',
    },
    {
      name: 'debug',
      log: { ...good, segments: [{ ...good.segments[0], actions: [[0, 2]] }] },
      ctx,
      reason: 'debug',
    },
    {
      name: 'god_mode',
      log: { ...good, segments: [{ ...good.segments[0], actions: [[0, 3]] }] },
      ctx,
      reason: 'god_mode',
    },
    { name: 'injected_inventory', log: { ...good, inventory: [{ type: 'raygun', source: 'debug' }] }, ctx, reason: 'injected_inventory' },
    { name: 'bad_checkpoint', log: { ...good, state: { hp: 999 } }, ctx, reason: 'bad_checkpoint' },
    {
      name: 'client_checkpoint_hash',
      log: { ...good, segments: [{ ...good.segments[0], from: 'deadbeef' }] },
      ctx,
      reason: 'bad_checkpoint',
    },
    { name: 'reused_log', log: good, ctx: { issuance, seenDigests: [digest] }, reason: 'reused_log' },
    { name: 'reused_run', log: good, ctx: { issuance, seenRunIds: [issuance.runId] }, reason: 'reused_run' },
    {
      name: 'rebind_account',
      log: { ...good, binding: { ...good.binding, accountId: 'acct-other-1' } },
      ctx: { issuance, accountId: 'acct-other-1' },
      reason: 'rebind',
    },
    {
      name: 'rebind_session',
      log: { ...good, binding: { ...good.binding, sessionId: 'sess-other-1' } },
      ctx: { issuance, sessionId: 'sess-other-1' },
      reason: 'rebind',
    },
    {
      name: 'rebind_day',
      log: { ...good, binding: { ...good.binding, day: '2026-11-08' } },
      ctx: { issuance, day: '2026-11-08' },
      reason: 'rebind',
    },
    { name: 'accelerated', log: { ...good, dt: 1 }, ctx, reason: 'accelerated' },
    { name: 'accelerated_gap', log: gap, ctx, reason: 'accelerated' },
    {
      name: 'fingerprint_mismatch',
      log: good,
      ctx: { issuance: { ...issuance, contentFingerprint: 'ffffffff' } },
      reason: 'fingerprint_mismatch',
    },
    {
      name: 'bad_start',
      log: good,
      ctx: { issuance: { ...issuance, initialStateHash: 'ffffffff' } },
      reason: 'bad_start',
    },
  ];
}
